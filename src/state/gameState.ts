import { loadBalance } from '../data/loadBalance';
import { buildStructure } from '../domain/base/buildStructure';
import { levelUpHq } from '../domain/base/levelUpHq';
import { tickProduction } from '../domain/base/tickProduction';
import { upgradeStructure } from '../domain/base/upgradeStructure';
import { generateScoutTargets } from '../domain/ai/generateScoutTargets';
import { applyCounterAttack, resolveCounterAttack } from '../domain/meta/counterAttack';
import {
  advanceMissionProgress,
  claimMissionReward,
  createDailyMissions,
  getDayIndex,
  syncDailyMissions
} from '../domain/meta/daily';
import { buildOfflineRewardSummary } from '../domain/meta/offline';
import { queueUnit } from '../domain/training/queueUnit';
import { appendLog } from '../utils/logger';
import { nextId } from '../utils/ids';
import { addResources } from '../utils/resources';
import { nowMs } from '../utils/time';
import { loadPersistedState, persistState } from './persistence';
import type { BalanceData } from '../types/balance';
import type { GameState, ScoutTarget, StateListener, StructureInstance } from '../types/game';
import type { RaidResolution, RaidState } from '../types/raid';

export const balance = loadBalance();

const createInitialStructures = (config: BalanceData['config']): StructureInstance[] =>
  config.slotIds.map((slotId) => {
    const defaults: Record<string, { buildingId: string | null; level: number }> = {
      hq: { buildingId: 'command_center', level: 1 },
      north_1: { buildingId: 'scrap_yard', level: 1 },
      east_1: { buildingId: 'generator', level: 1 },
      south_1: { buildingId: 'barracks', level: 1 }
    };
    const current = defaults[slotId] ?? { buildingId: null, level: 0 };

    return {
      id: nextId('slot'),
      slotId,
      buildingId: current.buildingId,
      level: current.level,
      completeAt: null
    };
  });

const createInitialState = (now: number, currentBalance: BalanceData): GameState => {
  const baseState: GameState = {
    version: currentBalance.config.saveVersion,
    now,
    resources: { ...currentBalance.config.startingResources },
    base: {
      hqLevel: 1,
      structures: createInitialStructures(currentBalance.config),
      trainingQueues: {
        barracks: [],
        garage: []
      },
      scoutTargets: [],
      selectedScoutTargetId: null,
      lastScoutAt: now
    },
    roster: { ...currentBalance.config.startingRoster },
    meta: {
      zoneTier: 1,
      counterThreat: 0,
      dayIndex: getDayIndex(now),
      dailyMissions: createDailyMissions(),
      tutorialStep: 0,
      tutorialDismissed: false
    },
    pendingOfflineReward: null,
    lastAppliedAt: now,
    lastBattle: null,
    lastCounterAttack: null,
    logs: []
  };

  const targets = generateScoutTargets(baseState, currentBalance, now);
  baseState.base.scoutTargets = targets;
  baseState.base.selectedScoutTargetId = targets[0]?.id ?? null;
  return baseState;
};

const hydrateState = (currentBalance: BalanceData): GameState => {
  const now = nowMs();
  const persisted = loadPersistedState();
  const initial = createInitialState(now, currentBalance);

  if (!persisted || persisted.version !== currentBalance.config.saveVersion) {
    return initial;
  }

  const merged: GameState = {
    ...initial,
    ...persisted,
    now,
    version: currentBalance.config.saveVersion,
    resources: persisted.resources ?? initial.resources,
    pendingOfflineReward: null,
    base: {
      ...initial.base,
      ...persisted.base,
      trainingQueues: {
        ...initial.base.trainingQueues,
        ...persisted.base?.trainingQueues
      },
      scoutTargets: persisted.base?.scoutTargets ?? initial.base.scoutTargets,
      selectedScoutTargetId:
        persisted.base?.selectedScoutTargetId ?? initial.base.selectedScoutTargetId,
      lastScoutAt: persisted.base?.lastScoutAt ?? initial.base.lastScoutAt,
      structures: persisted.base?.structures ?? initial.base.structures
    },
    roster: {
      ...initial.roster,
      ...persisted.roster
    },
    meta: {
      ...initial.meta,
      ...persisted.meta,
      zoneTier: persisted.meta?.zoneTier ?? initial.meta.zoneTier,
      counterThreat: persisted.meta?.counterThreat ?? initial.meta.counterThreat,
      dayIndex: persisted.meta?.dayIndex ?? initial.meta.dayIndex,
      dailyMissions: persisted.meta?.dailyMissions ?? initial.meta.dailyMissions,
      tutorialStep: persisted.meta?.tutorialStep ?? initial.meta.tutorialStep,
      tutorialDismissed:
        persisted.meta?.tutorialDismissed ?? initial.meta.tutorialDismissed
    },
    lastAppliedAt: persisted.lastAppliedAt ?? initial.lastAppliedAt,
    lastBattle: persisted.lastBattle ?? null,
    lastCounterAttack: persisted.lastCounterAttack ?? null,
    logs: persisted.logs ?? []
  };

  const synced = syncDailyMissions(merged, now);
  const advanced = tickProduction(synced, currentBalance, now);
  advanced.pendingOfflineReward = buildOfflineRewardSummary(
    merged,
    advanced,
    currentBalance,
    now
  );
  return advanced;
};

class GameStore {
  private state: GameState;

  private listeners = new Set<StateListener>();

  private lastPersistAt = 0;

  constructor(private readonly currentBalance: BalanceData) {
    this.state = hydrateState(currentBalance);
    persistState(this.state);
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private publish(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private getLiveState(now = nowMs()): GameState {
    return syncDailyMissions(
      tickProduction(this.state, this.currentBalance, now),
      now
    );
  }

  private recordMission(
    state: GameState,
    type: 'raid_win' | 'train_unit' | 'build_any',
    amount = 1
  ): GameState {
    const next = structuredClone(state) as GameState;
    next.meta.dailyMissions = advanceMissionProgress(
      next.meta.dailyMissions,
      type,
      amount
    );
    return next;
  }

  private commit(next: GameState, persist = true): void {
    this.state = next;
    if (persist) {
      const now = nowMs();
      if (now - this.lastPersistAt > 250) {
        persistState(this.state);
        this.lastPersistAt = now;
      }
    }
    this.publish();
  }

  tick(now = nowMs()): void {
    const next = this.getLiveState(now);

    if (next === this.state) {
      return;
    }

    this.commit(next, false);
  }

  build(buildingId: string): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);
    let next = buildStructure(
      baseState,
      this.currentBalance,
      buildingId,
      now
    );
    if (next === baseState) {
      return;
    }

    next = this.recordMission(next, 'build_any');
    this.commit(next);
  }

  upgrade(structureId: string): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);
    let next = upgradeStructure(
      baseState,
      this.currentBalance,
      structureId,
      now
    );
    if (next === baseState) {
      return;
    }

    next = this.recordMission(next, 'build_any');
    this.commit(next);
  }

  levelUpHq(): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);
    let next = levelUpHq(
      baseState,
      this.currentBalance,
      now
    );
    if (next === baseState) {
      return;
    }
    next.base.scoutTargets = generateScoutTargets(next, this.currentBalance, now);
    next.base.selectedScoutTargetId = next.base.scoutTargets[0]?.id ?? null;
    this.commit(next);
  }

  queueUnit(unitId: string): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);
    let next = queueUnit(
      baseState,
      this.currentBalance,
      unitId,
      now
    );
    if (next === baseState) {
      return;
    }

    next = this.recordMission(next, 'train_unit');
    this.commit(next);
  }

  refreshScoutTargets(): void {
    const now = nowMs();
    const next = structuredClone(this.getLiveState(now)) as GameState;
    next.base.scoutTargets = generateScoutTargets(next, this.currentBalance, now);
    next.base.selectedScoutTargetId = next.base.scoutTargets[0]?.id ?? null;
    next.base.lastScoutAt = now;
    next.logs = appendLog(
      next.logs,
      {
        timeMs: now,
        scene: 'scout',
        event: 'scout.refresh'
      },
      this.currentBalance.config.maxLogs
    );
    this.commit(next);
  }

  selectScoutTarget(targetId: string): void {
    const next = structuredClone(this.state) as GameState;
    next.base.selectedScoutTargetId = targetId;
    this.commit(next, false);
  }

  getSelectedScoutTarget(): ScoutTarget | null {
    return (
      this.state.base.scoutTargets.find(
        (target) => target.id === this.state.base.selectedScoutTargetId
      ) ?? null
    );
  }

  applyRaidResult(raid: RaidState, resolution: RaidResolution): void {
    const now = nowMs();
    let next = structuredClone(this.getLiveState(now)) as GameState;

    for (const [unitId, lostCount] of Object.entries(resolution.lost)) {
      next.roster[unitId] = Math.max(0, (next.roster[unitId] ?? 0) - lostCount);
    }

    next.resources = addResources(next.resources, resolution.loot);
    next.lastBattle = {
      targetId: raid.targetId,
      victory: resolution.result === 'victory',
      loot: resolution.loot,
      survivors: resolution.survivors,
      lost: resolution.lost,
      durationSec: resolution.durationSec
    };
    next.meta.counterThreat = Math.min(
      100,
      next.meta.counterThreat +
        (resolution.result === 'victory' ? 25 : resolution.result === 'retreat' ? 10 : 5)
    );
    next.logs = appendLog(
      next.logs,
      {
        timeMs: now,
        scene: 'result',
        event: 'raid.end',
        actorId: raid.id,
        extra: { result: resolution.result, loot: resolution.loot.scrap + resolution.loot.power + resolution.loot.core }
      },
      this.currentBalance.config.maxLogs
    );
    if (resolution.result === 'victory') {
      next = this.recordMission(next, 'raid_win');
    }
    this.commit(next);
  }

  claimMission(missionId: string): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);
    const next = claimMissionReward(baseState, missionId);

    if (next === baseState) {
      return;
    }

    next.logs = appendLog(
      next.logs,
      {
        timeMs: now,
        scene: 'base',
        event: 'mission.claim',
        actorId: missionId
      },
      this.currentBalance.config.maxLogs
    );
    this.commit(next);
  }

  clearOfflineReward(): void {
    if (!this.state.pendingOfflineReward) {
      return;
    }

    const next = structuredClone(this.state) as GameState;
    next.pendingOfflineReward = null;
    next.logs = appendLog(
      next.logs,
      {
        timeMs: nowMs(),
        scene: 'base',
        event: 'offline.clear'
      },
      this.currentBalance.config.maxLogs
    );
    this.commit(next);
  }

  resolveCounterAttack(): void {
    const now = nowMs();
    const baseState = this.getLiveState(now);

    if (baseState.meta.counterThreat < 100) {
      return;
    }

    const summary = resolveCounterAttack(baseState, this.currentBalance);
    const next = applyCounterAttack(baseState, this.currentBalance, summary);
    next.logs = appendLog(
      next.logs,
      {
        timeMs: now,
        scene: 'base',
        event: 'counterattack.resolve',
        extra: {
          victory: summary.victory,
          enemyPower: summary.enemyPower,
          playerPower: summary.playerPower
        }
      },
      this.currentBalance.config.maxLogs
    );
    this.commit(next);
  }

  advanceTutorial(): void {
    const next = structuredClone(this.state) as GameState;
    next.meta.tutorialStep += 1;
    this.commit(next);
  }

  dismissTutorial(): void {
    const next = structuredClone(this.state) as GameState;
    next.meta.tutorialDismissed = true;
    this.commit(next);
  }

  restartTutorial(): void {
    const next = structuredClone(this.state) as GameState;
    next.meta.tutorialStep = 0;
    next.meta.tutorialDismissed = false;
    this.commit(next);
  }

  reset(): void {
    this.commit(createInitialState(nowMs(), this.currentBalance));
  }
}

export const gameStore = new GameStore(balance);
