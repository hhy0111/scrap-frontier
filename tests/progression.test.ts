import { describe, expect, it } from 'vitest';
import { buildStructure } from '../src/domain/base/buildStructure';
import { levelUpHq } from '../src/domain/base/levelUpHq';
import { upgradeStructure } from '../src/domain/base/upgradeStructure';
import { upgradeResearch } from '../src/domain/meta/research';
import { advanceMissionProgress } from '../src/domain/meta/daily';
import {
  applyRaidResolutionToState,
  getRaidSquadPower,
  pickBestSafeScoutTarget,
  refreshScoutTargetsForProgression,
  resolvePendingCounterAttack,
  settleProgressionState,
  simulateRaidBattle
} from '../src/domain/meta/progression';
import { queueUnit } from '../src/domain/training/queueUnit';
import { createTestBalance, createTestState } from './helpers';
import type { BalanceData } from '../src/types/balance';
import type { GameState } from '../src/types/game';

const getStructureCount = (state: GameState, buildingId: string): number =>
  state.base.structures.filter((structure) => structure.buildingId === buildingId).length;

const hasCompletedStructure = (state: GameState, buildingId: string): boolean =>
  state.base.structures.some(
    (structure) => structure.buildingId === buildingId && structure.completeAt === null
  );

const countRosterUnits = (state: GameState, unitIds: string[]): number =>
  unitIds.reduce((total, unitId) => total + (state.roster[unitId] ?? 0), 0);

const sumCounts = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((total, count) => total + count, 0);

const getFirstUpgradeableStructureId = (
  state: GameState,
  buildingId: string,
  level: number
): string | null =>
  state.base.structures.find(
    (structure) =>
      structure.buildingId === buildingId &&
      structure.completeAt === null &&
      structure.level === level
  )?.id ?? null;

const attemptAction = (
  state: GameState,
  nextState: GameState
): { changed: boolean; state: GameState } => ({
  changed: nextState !== state,
  state: nextState
});

const recordMission = (
  state: GameState,
  type: 'raid_win' | 'train_unit' | 'build_any',
  amount = 1
): GameState => {
  const next = structuredClone(state) as GameState;
  next.meta.dailyMissions = advanceMissionProgress(next.meta.dailyMissions, type, amount);
  return next;
};

const getTargetRewardValue = (target: GameState['base']['scoutTargets'][number]): number =>
  target.storedRewards.scrap + target.storedRewards.power + target.storedRewards.core * 4;

const pickBestSafeZoneTarget = (
  state: GameState,
  balance: BalanceData,
  zoneTier: number,
  safetyRatio = 1.18,
  fallbackToUnsafe = true
): GameState['base']['scoutTargets'][number] | null => {
  const squadPower = getRaidSquadPower(state, balance);
  const sorted = [...state.base.scoutTargets]
    .filter((target) => target.zoneTier === zoneTier)
    .sort((left, right) => left.recommendedPower - right.recommendedPower);

  if (sorted.length === 0) {
    return null;
  }

  const safeTargets = sorted.filter((target) => target.recommendedPower <= squadPower * safetyRatio);
  if (safeTargets.length === 0 && !fallbackToUnsafe) {
    return null;
  }

  const candidatePool = safeTargets.length > 0 ? safeTargets : sorted;

  return candidatePool.sort((left, right) => {
    const rewardGap = getTargetRewardValue(right) - getTargetRewardValue(left);
    if (rewardGap !== 0) {
      return rewardGap;
    }

    return left.recommendedPower - right.recommendedPower;
  })[0] ?? null;
};

const applyProgressionActions = (
  currentState: GameState,
  balance: BalanceData,
  now: number
): GameState => {
  let state = currentState;

  for (let pass = 0; pass < 18; pass += 1) {
    let actionApplied = false;

    if (state.base.hqLevel < 2) {
      if (getStructureCount(state, 'scrap_yard') < 2) {
        const result = attemptAction(state, buildStructure(state, balance, 'scrap_yard', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && getStructureCount(state, 'generator') < 2) {
        const result = attemptAction(state, buildStructure(state, balance, 'generator', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && countRosterUnits(state, ['rifleman']) < 4) {
        const result = attemptAction(state, queueUnit(state, balance, 'rifleman', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied) {
        const result = attemptAction(state, levelUpHq(state, balance, now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }
    } else if (state.base.hqLevel < 3) {
      if (getStructureCount(state, 'auto_turret') < 1) {
        const result = attemptAction(state, buildStructure(state, balance, 'auto_turret', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && countRosterUnits(state, ['scavenger', 'rifleman']) < 6) {
        const unitId =
          (state.roster.rifleman ?? 0) <= (state.roster.scavenger ?? 0)
            ? 'rifleman'
            : 'scavenger';
        const result = attemptAction(state, queueUnit(state, balance, unitId, now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied) {
        const result = attemptAction(state, levelUpHq(state, balance, now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && getStructureCount(state, 'storage') < 1) {
        const result = attemptAction(state, buildStructure(state, balance, 'storage', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }
    } else if (state.base.hqLevel < 4) {
      const mechCount = countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone']);

      if (getStructureCount(state, 'garage') < 1) {
        const result = attemptAction(state, buildStructure(state, balance, 'garage', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && state.meta.researches.garage < 1) {
        const result = attemptAction(state, upgradeResearch(state, balance, 'garage', now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && (state.roster.shieldbot ?? 0) < 2) {
        const result = attemptAction(state, queueUnit(state, balance, 'shieldbot', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && (state.roster.rocket_buggy ?? 0) < 1) {
        const result = attemptAction(state, queueUnit(state, balance, 'rocket_buggy', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && mechCount >= 3) {
        const result = attemptAction(state, levelUpHq(state, balance, now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && getStructureCount(state, 'auto_turret') < 2) {
        const result = attemptAction(state, buildStructure(state, balance, 'auto_turret', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied) {
        const scrapYardId = getFirstUpgradeableStructureId(state, 'scrap_yard', 1);

        if (scrapYardId) {
          const result = attemptAction(state, upgradeStructure(state, balance, scrapYardId, now));
          state = result.changed ? recordMission(result.state, 'build_any') : result.state;
          actionApplied = result.changed;
        }
      }
    } else {
      if (hasCompletedStructure(state, 'garage') && state.meta.researches.garage < 2) {
        const result = attemptAction(state, upgradeResearch(state, balance, 'garage', now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }

      if (
        !actionApplied &&
        state.meta.researches.garage >= 2 &&
        state.meta.researches.barracks < 1
      ) {
        const result = attemptAction(state, upgradeResearch(state, balance, 'barracks', now));
        state = result.changed
          ? refreshScoutTargetsForProgression(result.state, balance, now)
          : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && (state.roster.shieldbot ?? 0) < 4) {
        const result = attemptAction(state, queueUnit(state, balance, 'shieldbot', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && (state.roster.rocket_buggy ?? 0) < 3) {
        const result = attemptAction(state, queueUnit(state, balance, 'rocket_buggy', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && hasCompletedStructure(state, 'garage') && (state.roster.repair_drone ?? 0) < 2) {
        const result = attemptAction(state, queueUnit(state, balance, 'repair_drone', now));
        state = result.changed ? recordMission(result.state, 'train_unit') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied && getStructureCount(state, 'auto_turret') < 3) {
        const result = attemptAction(state, buildStructure(state, balance, 'auto_turret', now));
        state = result.changed ? recordMission(result.state, 'build_any') : result.state;
        actionApplied = result.changed;
      }

      if (!actionApplied) {
        const scrapYardId = getFirstUpgradeableStructureId(state, 'scrap_yard', 2);
        if (scrapYardId) {
          const result = attemptAction(state, upgradeStructure(state, balance, scrapYardId, now));
          state = result.changed ? recordMission(result.state, 'build_any') : result.state;
          actionApplied = result.changed;
        }
      }

      if (!actionApplied) {
        const generatorId = getFirstUpgradeableStructureId(state, 'generator', 1);
        if (generatorId) {
          const result = attemptAction(state, upgradeStructure(state, balance, generatorId, now));
          state = result.changed ? recordMission(result.state, 'build_any') : result.state;
          actionApplied = result.changed;
        }
      }
    }

    if (!actionApplied) {
      break;
    }
  }

  return state;
};

const runProgressionRoute = (
  balance: BalanceData,
  totalMinutes: number
): { state: GameState; now: number; raidWins: number } => {
  let state = createTestState(balance);
  state = refreshScoutTargetsForProgression(state, balance, 0);
  return continueProgressionRoute(state, balance, 0, totalMinutes);
};

const continueProgressionRoute = (
  initialState: GameState,
  balance: BalanceData,
  initialNow: number,
  totalMinutes: number
): { state: GameState; now: number; raidWins: number } => {
  let now = initialNow;
  let raidWins = 0;
  let state = structuredClone(initialState) as GameState;

  for (let cycle = 0; cycle < totalMinutes; cycle += 1) {
    state = settleProgressionState(state, balance, now);
    state = resolvePendingCounterAttack(state, balance);
    state = applyProgressionActions(state, balance, now);

    const raidCadence = state.base.hqLevel >= 3 ? 3 : 4;
    const raidSafetyRatio = state.base.hqLevel >= 3 ? 1.24 : 1.2;

    if (cycle % raidCadence === 0) {
      state = refreshScoutTargetsForProgression(state, balance, now);
      const target = pickBestSafeScoutTarget(state, balance, raidSafetyRatio);
      const raidResult = target ? simulateRaidBattle(state, balance, target) : null;

      if (raidResult && raidResult.resolution.result === 'victory') {
        now += raidResult.resolution.durationSec * 1000;
        state = settleProgressionState(state, balance, now);
        state = applyRaidResolutionToState(state, raidResult.raid, raidResult.resolution);
        state = resolvePendingCounterAttack(state, balance);
        raidWins += 1;
      }
    }

    now += 60000;
  }

  state = settleProgressionState(state, balance, now);
  state = resolvePendingCounterAttack(state, balance);
  state = applyProgressionActions(state, balance, now);
  state = refreshScoutTargetsForProgression(state, balance, now);

  return { state, now, raidWins };
};

const resolvePendingCounterAttackObserved = (
  state: GameState,
  balance: BalanceData
): {
  state: GameState;
  counterAttacksResolved: number;
  counterAttackVictories: number;
  counterAttackDefeats: number;
} => {
  if (state.meta.counterThreat < 100) {
    return {
      state,
      counterAttacksResolved: 0,
      counterAttackVictories: 0,
      counterAttackDefeats: 0
    };
  }

  const next = resolvePendingCounterAttack(state, balance);
  const victory = next.lastCounterAttack?.victory === true;

  return {
    state: next,
    counterAttacksResolved: 1,
    counterAttackVictories: victory ? 1 : 0,
    counterAttackDefeats: victory ? 0 : 1
  };
};

const continueObservedProgressionRoute = (
  initialState: GameState,
  balance: BalanceData,
  initialNow: number,
  totalMinutes: number
): {
  state: GameState;
  now: number;
  raidWins: number;
  counterAttacksResolved: number;
  counterAttackVictories: number;
  counterAttackDefeats: number;
} => {
  let now = initialNow;
  let raidWins = 0;
  let counterAttacksResolved = 0;
  let counterAttackVictories = 0;
  let counterAttackDefeats = 0;
  let state = structuredClone(initialState) as GameState;

  for (let cycle = 0; cycle < totalMinutes; cycle += 1) {
    state = settleProgressionState(state, balance, now);
    const openingCounterAttack = resolvePendingCounterAttackObserved(state, balance);
    state = openingCounterAttack.state;
    counterAttacksResolved += openingCounterAttack.counterAttacksResolved;
    counterAttackVictories += openingCounterAttack.counterAttackVictories;
    counterAttackDefeats += openingCounterAttack.counterAttackDefeats;
    state = applyProgressionActions(state, balance, now);

    const raidCadence = state.base.hqLevel >= 3 ? 3 : 4;
    const raidSafetyRatio = state.base.hqLevel >= 3 ? 1.24 : 1.2;

    if (cycle % raidCadence === 0) {
      state = refreshScoutTargetsForProgression(state, balance, now);
      const target = pickBestSafeScoutTarget(state, balance, raidSafetyRatio);
      const raidResult = target ? simulateRaidBattle(state, balance, target) : null;

      if (raidResult && raidResult.resolution.result === 'victory') {
        now += raidResult.resolution.durationSec * 1000;
        state = settleProgressionState(state, balance, now);
        state = applyRaidResolutionToState(state, raidResult.raid, raidResult.resolution);
        const postRaidCounterAttack = resolvePendingCounterAttackObserved(state, balance);
        state = postRaidCounterAttack.state;
        counterAttacksResolved += postRaidCounterAttack.counterAttacksResolved;
        counterAttackVictories += postRaidCounterAttack.counterAttackVictories;
        counterAttackDefeats += postRaidCounterAttack.counterAttackDefeats;
        raidWins += 1;
      }
    }

    now += 60000;
  }

  state = settleProgressionState(state, balance, now);
  const closingCounterAttack = resolvePendingCounterAttackObserved(state, balance);
  state = closingCounterAttack.state;
  counterAttacksResolved += closingCounterAttack.counterAttacksResolved;
  counterAttackVictories += closingCounterAttack.counterAttackVictories;
  counterAttackDefeats += closingCounterAttack.counterAttackDefeats;
  state = applyProgressionActions(state, balance, now);
  state = refreshScoutTargetsForProgression(state, balance, now);

  return {
    state,
    now,
    raidWins,
    counterAttacksResolved,
    counterAttackVictories,
    counterAttackDefeats
  };
};

type ProgressionRouteResult = ReturnType<typeof runProgressionRoute>;
type ObservedProgressionRouteResult = ReturnType<typeof continueObservedProgressionRoute>;
type PostDefeatSequenceEntry = {
  result: string | null;
  survivors: number;
  losses: number;
  lootCore: number;
  lootTotal: number;
  recommendedPower: number | null;
};
type ExplicitDefeatRecoveryResult = {
  route: ProgressionRouteResult;
  defeatedState: GameState;
  defeatSummary: GameState['lastCounterAttack'];
  recovered: ObservedProgressionRouteResult;
  recoveredState: GameState;
  recoveredSquadPower: number;
};
type RepeatedPostDefeatResult = {
  route: ProgressionRouteResult;
  recovered: ObservedProgressionRouteResult;
  state: GameState;
  now: number;
  sequenceResults: PostDefeatSequenceEntry[];
  victories: PostDefeatSequenceEntry[];
  victoryAfterLoss: boolean;
};

const progressionRouteCache = new Map<number, ProgressionRouteResult>();
const explicitDefeatRecoveryCache = new Map<number, ExplicitDefeatRecoveryResult>();
const repeatedPostDefeatCache = new Map<number, RepeatedPostDefeatResult>();

const getCachedProgressionRoute = (
  balance: BalanceData,
  totalMinutes: number
): ProgressionRouteResult => {
  const cached = progressionRouteCache.get(totalMinutes);

  if (cached) {
    return structuredClone(cached) as ProgressionRouteResult;
  }

  const computed = runProgressionRoute(balance, totalMinutes);
  progressionRouteCache.set(totalMinutes, computed);
  return structuredClone(computed) as ProgressionRouteResult;
};

const createExplicitDefeatRecovery = (
  balance: BalanceData,
  recoveryMinutes = 300
): ExplicitDefeatRecoveryResult => {
  const cached = explicitDefeatRecoveryCache.get(recoveryMinutes);

  if (cached) {
    return structuredClone(cached) as ExplicitDefeatRecoveryResult;
  }

  const route = getCachedProgressionRoute(balance, 300);
  let state = structuredClone(route.state) as GameState;

  state.roster.scavenger = Math.min(state.roster.scavenger ?? 0, 2);
  state.roster.rifleman = Math.min(state.roster.rifleman ?? 0, 2);
  state.roster.shieldbot = Math.min(state.roster.shieldbot ?? 0, 1);
  state.roster.rocket_buggy = 0;
  state.roster.repair_drone = 0;
  state.base.structures = state.base.structures.map((structure) =>
    structure.buildingId === 'auto_turret'
      ? {
          ...structure,
          buildingId: null,
          level: 0
        }
      : structure
  );
  state.meta.counterThreat = 100;

  const defeatedState = resolvePendingCounterAttack(state, balance);
  const defeatSummary = defeatedState.lastCounterAttack;
  const recovered = continueObservedProgressionRoute(
    defeatedState,
    balance,
    route.now,
    recoveryMinutes
  );
  const recoveredState = recovered.state;
  const recoveredSquadPower = getRaidSquadPower(recoveredState, balance);

  const result: ExplicitDefeatRecoveryResult = {
    route,
    defeatedState,
    defeatSummary,
    recovered,
    recoveredState,
    recoveredSquadPower
  };

  explicitDefeatRecoveryCache.set(recoveryMinutes, result);
  return structuredClone(result) as ExplicitDefeatRecoveryResult;
};

const createRepeatedPostDefeatWins = (
  balance: BalanceData,
  recoveryMinutes = 300
): RepeatedPostDefeatResult => {
  const cached = repeatedPostDefeatCache.get(recoveryMinutes);

  if (cached) {
    return structuredClone(cached) as RepeatedPostDefeatResult;
  }

  const { route, recovered, recoveredState } = createExplicitDefeatRecovery(balance, recoveryMinutes);
  let state = structuredClone(recoveredState) as GameState;
  let now = recovered.now;
  const sequenceResults: PostDefeatSequenceEntry[] = [];

  for (let index = 0; index < 8; index += 1) {
    state = settleProgressionState(state, balance, now);
    state = resolvePendingCounterAttack(state, balance);
    state = applyProgressionActions(state, balance, now);
    state = refreshScoutTargetsForProgression(state, balance, now + (index + 1) * 641);

    const target = pickBestSafeZoneTarget(state, balance, 3, 1.24, true);
    const raidResult = target ? simulateRaidBattle(state, balance, target) : null;
    const losses = sumCounts(raidResult?.resolution.lost ?? {});
    const survivors = sumCounts(raidResult?.resolution.survivors ?? {});
    const lootCore = raidResult?.resolution.loot.core ?? 0;
    const lootTotal =
      (raidResult?.resolution.loot.scrap ?? 0) +
      (raidResult?.resolution.loot.power ?? 0) +
      lootCore * 4;

    sequenceResults.push({
      result: raidResult?.resolution.result ?? null,
      survivors,
      losses,
      lootCore,
      lootTotal,
      recommendedPower: target?.recommendedPower ?? null
    });

    if (raidResult) {
      now += raidResult.resolution.durationSec * 1000;
      state = settleProgressionState(state, balance, now);
      state = applyRaidResolutionToState(state, raidResult.raid, raidResult.resolution);
      state = resolvePendingCounterAttack(state, balance);
    }

    now += 8 * 60000;
  }

  state = settleProgressionState(state, balance, now);
  state = resolvePendingCounterAttack(state, balance);
  state = applyProgressionActions(state, balance, now);
  state = refreshScoutTargetsForProgression(state, balance, now);

  const victories = sequenceResults.filter((result) => result.result === 'victory');
  const victoryAfterLoss = sequenceResults.some(
    (result, index) =>
      result.result === 'victory' &&
      sequenceResults.slice(0, index).some((previous) => previous.losses >= 1)
  );

  const result: RepeatedPostDefeatResult = {
    route,
    recovered,
    state,
    now,
    sequenceResults,
    victories,
    victoryAfterLoss
  };

  repeatedPostDefeatCache.set(recoveryMinutes, result);
  return structuredClone(result) as RepeatedPostDefeatResult;
};

describe('progression simulation', () => {
  it('reaches HQ2 with expanded production and trained infantry in an early route', () => {
    const balance = createTestBalance();
    const { state, raidWins } = runProgressionRoute(balance, 20);
    const squadPower = getRaidSquadPower(state, balance);

    expect(raidWins).toBeGreaterThanOrEqual(2);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(2);
    expect(getStructureCount(state, 'scrap_yard')).toBeGreaterThanOrEqual(2);
    expect(getStructureCount(state, 'generator')).toBeGreaterThanOrEqual(2);
    expect(countRosterUnits(state, ['scavenger', 'rifleman'])).toBeGreaterThanOrEqual(5);
    expect(squadPower).toBeGreaterThan(460);
  });

  it('reaches HQ3, completes a garage, and starts mech growth within the first hour', () => {
    const balance = createTestBalance();
    const { state, raidWins } = runProgressionRoute(balance, 60);

    expect(raidWins).toBeGreaterThanOrEqual(4);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(3);
    expect(hasCompletedStructure(state, 'garage')).toBe(true);
    expect((state.roster.shieldbot ?? 0) + (state.roster.rocket_buggy ?? 0)).toBeGreaterThanOrEqual(1);
    expect(getStructureCount(state, 'auto_turret')).toBeGreaterThanOrEqual(1);
  });

  it('maintains a zone2-ready mech economy over a three-hour route', () => {
    const balance = createTestBalance();
    const { state, raidWins } = getCachedProgressionRoute(balance, 180);
    const squadPower = getRaidSquadPower(state, balance);

    expect(raidWins).toBeGreaterThanOrEqual(18);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(3);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(2);
    expect(state.meta.researches.garage).toBeGreaterThanOrEqual(1);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(squadPower).toBeGreaterThan(540);
    expect(getStructureCount(state, 'auto_turret')).toBeGreaterThanOrEqual(2);
    expect(getStructureCount(state, 'storage')).toBeGreaterThanOrEqual(1);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 2)).toBe(true);
  }, 15000);

  it('reaches HQ4 and unlocks zone3 scouting over a three-hour route', () => {
    const balance = createTestBalance();
    const { state, raidWins } = getCachedProgressionRoute(balance, 180);

    expect(raidWins).toBeGreaterThanOrEqual(24);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
  }, 15000);

  it('stabilizes a researched zone3 raid economy over five hours', () => {
    const balance = createTestBalance();
    const { state, raidWins, now } = getCachedProgressionRoute(balance, 300);
    const squadPower = getRaidSquadPower(state, balance);
    let winnableZone3Target: GameState['base']['scoutTargets'][number] | null = null;
    let lateRaidResult:
      | ReturnType<typeof simulateRaidBattle>
      | null = null;
    const sampledZone3Targets: Array<{
      zoneTier: number;
      recommendedPower: number;
      rewards: { scrap: number; power: number; core: number };
      result: string | null;
      survivors: number;
      lootCore: number;
      lootTotal: number;
    }> = [];

    for (let index = 0; index < 6; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        now + (index + 1) * 977
      );
      const easiestZone3Target =
        [...sampledState.base.scoutTargets]
          .filter((target) => target.zoneTier === 3)
          .sort((left, right) => left.recommendedPower - right.recommendedPower)[0] ?? null;
      const sampledRaidResult = easiestZone3Target
        ? simulateRaidBattle(state, balance, easiestZone3Target)
        : null;

      if (easiestZone3Target) {
        const survivorCount = sampledRaidResult
          ? Object.values(sampledRaidResult.resolution.survivors).reduce((sum, count) => sum + count, 0)
          : 0;
        const lootTotal =
          (sampledRaidResult?.resolution.loot.scrap ?? 0) +
          (sampledRaidResult?.resolution.loot.power ?? 0) +
          (sampledRaidResult?.resolution.loot.core ?? 0) * 4;
        sampledZone3Targets.push({
          zoneTier: easiestZone3Target.zoneTier,
          recommendedPower: easiestZone3Target.recommendedPower,
          rewards: easiestZone3Target.storedRewards,
          result: sampledRaidResult?.resolution.result ?? null,
          survivors: survivorCount,
          lootCore: sampledRaidResult?.resolution.loot.core ?? 0,
          lootTotal
        });
      }

      if (!winnableZone3Target && sampledRaidResult?.resolution.result === 'victory') {
        winnableZone3Target = easiestZone3Target;
        lateRaidResult = sampledRaidResult;
      }
    }
    const sampledVictories = sampledZone3Targets.filter((target) => target.result === 'victory');

    if (
      state.base.hqLevel < 4 ||
      state.meta.researches.garage < 2 ||
      countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone']) < 6 ||
      lateRaidResult?.resolution.result !== 'victory'
    ) {
      console.log(
        JSON.stringify(
          {
            raidWins,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            resources: state.resources,
            squadPower,
            researches: state.meta.researches,
            roster: state.roster,
            scoutTargets: state.base.scoutTargets.map((target) => ({
              zoneTier: target.zoneTier,
              recommendedPower: target.recommendedPower,
              rewards: target.storedRewards
            })),
            sampledZone3Targets,
            winnableZone3Target: winnableZone3Target
              ? {
                  zoneTier: winnableZone3Target.zoneTier,
                  recommendedPower: winnableZone3Target.recommendedPower,
                  rewards: winnableZone3Target.storedRewards
                }
              : null,
            lateRaidResult: lateRaidResult?.resolution.result ?? null
          },
          null,
          2
        )
      );
    }

    expect(raidWins).toBeGreaterThanOrEqual(36);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(state.meta.researches.garage).toBeGreaterThanOrEqual(2);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(6);
    expect(squadPower).toBeGreaterThan(600);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(sampledZone3Targets.length).toBeGreaterThanOrEqual(1);
    expect(sampledVictories.length).toBeGreaterThanOrEqual(2);
    expect(sampledVictories.some((target) => target.survivors >= 3)).toBe(true);
    expect(sampledVictories.some((target) => target.lootTotal >= 40)).toBe(true);
    expect(winnableZone3Target?.zoneTier).toBe(3);
    expect(lateRaidResult?.resolution.result).toBe('victory');
    expect(
      Object.values(lateRaidResult?.resolution.survivors ?? {}).reduce((sum, count) => sum + count, 0)
    ).toBeGreaterThanOrEqual(3);
    expect((lateRaidResult?.resolution.loot.core ?? 0)).toBeGreaterThanOrEqual(2);
  }, 15000);

  it('sustains repeated zone3 wins with losses applied back into state', () => {
    const balance = createTestBalance();
    const route = getCachedProgressionRoute(balance, 300);
    let state = route.state;
    let now = route.now;
    const sequenceResults: Array<{
      result: string | null;
      survivors: number;
      losses: number;
      lootCore: number;
      lootTotal: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 8; index += 1) {
      state = settleProgressionState(state, balance, now);
      state = resolvePendingCounterAttack(state, balance);
      state = applyProgressionActions(state, balance, now);
      state = refreshScoutTargetsForProgression(state, balance, now + (index + 1) * 997);

      const target = pickBestSafeZoneTarget(state, balance, 3, 1.22, false);
      const raidResult = target ? simulateRaidBattle(state, balance, target) : null;
      const losses = sumCounts(raidResult?.resolution.lost ?? {});
      const survivors = sumCounts(raidResult?.resolution.survivors ?? {});
      const lootCore = raidResult?.resolution.loot.core ?? 0;
      const lootTotal =
        (raidResult?.resolution.loot.scrap ?? 0) +
        (raidResult?.resolution.loot.power ?? 0) +
        lootCore * 4;

      sequenceResults.push({
        result: target ? raidResult?.resolution.result ?? null : 'skipped',
        survivors,
        losses,
        lootCore,
        lootTotal,
        recommendedPower: target?.recommendedPower ?? null
      });

      if (raidResult) {
        now += raidResult.resolution.durationSec * 1000;
        state = settleProgressionState(state, balance, now);
        state = applyRaidResolutionToState(state, raidResult.raid, raidResult.resolution);
        state = resolvePendingCounterAttack(state, balance);
      }

      now += 8 * 60000;
    }

    state = settleProgressionState(state, balance, now);
    state = resolvePendingCounterAttack(state, balance);
    state = applyProgressionActions(state, balance, now);
    state = refreshScoutTargetsForProgression(state, balance, now);

    const victories = sequenceResults.filter((result) => result.result === 'victory');
    const totalLosses = sequenceResults.reduce((total, result) => total + result.losses, 0);
    const victoryAfterLoss = sequenceResults.some(
      (result, index) =>
        result.result === 'victory' &&
        sequenceResults.slice(0, index).some((previous) => previous.losses >= 1)
    );

    if (victories.length < 2 || totalLosses < 1 || !victoryAfterLoss) {
      console.log(
        JSON.stringify(
          {
            raidWins: route.raidWins,
            now,
            resources: state.resources,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            researches: state.meta.researches,
            roster: state.roster,
            sequenceResults,
            scoutTargets: state.base.scoutTargets.map((target) => ({
              zoneTier: target.zoneTier,
              recommendedPower: target.recommendedPower,
              rewards: target.storedRewards
            }))
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(sequenceResults.filter((result) => result.recommendedPower !== null).length).toBeGreaterThanOrEqual(2);
    expect(totalLosses).toBeGreaterThanOrEqual(1);
    expect(victories.length).toBeGreaterThanOrEqual(2);
    expect(victoryAfterLoss).toBe(true);
    expect(victories.some((result) => result.survivors >= 3)).toBe(true);
    expect(victories.some((result) => result.lootCore >= 2)).toBe(true);
    expect(victories.some((result) => result.lootTotal >= 35)).toBe(true);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
  }, 20000);

  it('recovers from late-game counter-attack pressure and reopens zone3 wins', () => {
    const balance = createTestBalance();
    const route = getCachedProgressionRoute(balance, 300);
    let state = structuredClone(route.state) as GameState;
    let now = route.now;

    state.meta.counterThreat = Math.max(80, state.meta.counterThreat);
    state = settleProgressionState(state, balance, now);
    state = applyProgressionActions(state, balance, now);

    let triggerTarget: GameState['base']['scoutTargets'][number] | null = null;
    let triggerRaid: ReturnType<typeof simulateRaidBattle> | null = null;

    for (let index = 0; index < 6; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        now + 333 + (index + 1) * 577
      );
      const sampledTarget = pickBestSafeZoneTarget(sampledState, balance, 3, 1.22, false);
      const sampledRaid = sampledTarget ? simulateRaidBattle(sampledState, balance, sampledTarget) : null;

      if (sampledRaid?.resolution.result === 'victory') {
        state = sampledState;
        triggerTarget = sampledTarget;
        triggerRaid = sampledRaid;
        break;
      }
    }

    expect(triggerTarget?.zoneTier).toBe(3);
    expect(triggerRaid?.resolution.result).toBe('victory');

    if (!triggerRaid) {
      return;
    }

    now += triggerRaid.resolution.durationSec * 1000;
    state = settleProgressionState(state, balance, now);
    state = applyRaidResolutionToState(state, triggerRaid.raid, triggerRaid.resolution);
    const threatBeforeCounterAttack = state.meta.counterThreat;
    state = resolvePendingCounterAttack(state, balance);
    const counterAttack = state.lastCounterAttack;

    const recovered = continueProgressionRoute(state, balance, now, 45);
    state = recovered.state;
    now = recovered.now;

    const postPressureSamples: Array<{
      result: string | null;
      survivors: number;
      lootCore: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 4; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        now + (index + 1) * 577
      );
      const target = pickBestSafeZoneTarget(sampledState, balance, 3, 1.22, false);
      const raidResult = target ? simulateRaidBattle(sampledState, balance, target) : null;

      postPressureSamples.push({
        result: raidResult?.resolution.result ?? null,
        survivors: sumCounts(raidResult?.resolution.survivors ?? {}),
        lootCore: raidResult?.resolution.loot.core ?? 0,
        recommendedPower: target?.recommendedPower ?? null
      });
    }

    const postPressureVictories = postPressureSamples.filter((sample) => sample.result === 'victory');

    if (
      threatBeforeCounterAttack < 100 ||
      !counterAttack ||
      postPressureVictories.length < 1
    ) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            recoveryRaidWins: recovered.raidWins,
            now,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            counterThreat: state.meta.counterThreat,
            threatBeforeCounterAttack,
            counterAttack,
            researches: state.meta.researches,
            roster: state.roster,
            resources: state.resources,
            postPressureSamples
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(threatBeforeCounterAttack).toBeGreaterThanOrEqual(100);
    expect(counterAttack).not.toBeNull();
    expect(counterAttack?.enemyPower).toBeGreaterThan(900);
    expect(counterAttack?.playerPower).toBeGreaterThan(900);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(recovered.raidWins).toBeGreaterThanOrEqual(6);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(postPressureSamples.filter((sample) => sample.recommendedPower !== null).length).toBeGreaterThanOrEqual(1);
    expect(postPressureVictories.length).toBeGreaterThanOrEqual(1);
    expect(postPressureVictories.some((sample) => sample.survivors >= 3)).toBe(true);
    expect(postPressureVictories.some((sample) => sample.lootCore >= 2)).toBe(true);
  }, 25000);

  it('survives repeated late-game counter-attack cycles and keeps zone3 viable', () => {
    const balance = createTestBalance();
    const route = getCachedProgressionRoute(balance, 300);
    const pressuredState = structuredClone(route.state) as GameState;
    pressuredState.meta.counterThreat = Math.max(80, pressuredState.meta.counterThreat);

    const extended = continueObservedProgressionRoute(
      pressuredState,
      balance,
      route.now,
      120
    );
    const state = extended.state;
    const squadPower = getRaidSquadPower(state, balance);
    const postCycleSamples: Array<{
      result: string | null;
      survivors: number;
      lootCore: number;
      lootTotal: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 6; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        extended.now + (index + 1) * 733
      );
      const target = pickBestSafeZoneTarget(sampledState, balance, 3, 1.22, true);
      const raidResult = target ? simulateRaidBattle(sampledState, balance, target) : null;
      const lootCore = raidResult?.resolution.loot.core ?? 0;

      postCycleSamples.push({
        result: raidResult?.resolution.result ?? null,
        survivors: sumCounts(raidResult?.resolution.survivors ?? {}),
        lootCore,
        lootTotal:
          (raidResult?.resolution.loot.scrap ?? 0) +
          (raidResult?.resolution.loot.power ?? 0) +
          lootCore * 4,
        recommendedPower: target?.recommendedPower ?? null
      });
    }

    const postCycleVictories = postCycleSamples.filter((sample) => sample.result === 'victory');

    if (
      extended.counterAttacksResolved < 2 ||
      postCycleVictories.length < 1
    ) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            extensionRaidWins: extended.raidWins,
            counterAttacksResolved: extended.counterAttacksResolved,
            counterAttackVictories: extended.counterAttackVictories,
            counterAttackDefeats: extended.counterAttackDefeats,
            now: extended.now,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            counterThreat: state.meta.counterThreat,
            resources: state.resources,
            researches: state.meta.researches,
            roster: state.roster,
            squadPower,
            postCycleSamples
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(extended.raidWins).toBeGreaterThanOrEqual(12);
    expect(extended.counterAttacksResolved).toBeGreaterThanOrEqual(2);
    expect(extended.counterAttackVictories).toBeGreaterThanOrEqual(1);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(squadPower).toBeGreaterThan(580);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(postCycleSamples.filter((sample) => sample.recommendedPower !== null).length).toBeGreaterThanOrEqual(4);
    expect(postCycleVictories.length).toBeGreaterThanOrEqual(1);
    expect(postCycleVictories.some((sample) => sample.survivors >= 3)).toBe(true);
    expect(postCycleVictories.some((sample) => sample.lootCore >= 2)).toBe(true);
    expect(postCycleVictories.some((sample) => sample.lootTotal >= 35)).toBe(true);
  }, 30000);

  it('endures an eight-hour economy pressure route while keeping zone3 profitable', () => {
    const balance = createTestBalance();
    const route = getCachedProgressionRoute(balance, 300);
    const pressuredState = structuredClone(route.state) as GameState;
    pressuredState.meta.counterThreat = Math.max(80, pressuredState.meta.counterThreat);

    const extended = continueObservedProgressionRoute(
      pressuredState,
      balance,
      route.now,
      180
    );
    const state = extended.state;
    const squadPower = getRaidSquadPower(state, balance);
    const postLongSamples: Array<{
      result: string | null;
      survivors: number;
      lootCore: number;
      lootTotal: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 8; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        extended.now + (index + 1) * 887
      );
      const target = pickBestSafeZoneTarget(sampledState, balance, 3, 1.24, true);
      const raidResult = target ? simulateRaidBattle(sampledState, balance, target) : null;
      const lootCore = raidResult?.resolution.loot.core ?? 0;

      postLongSamples.push({
        result: raidResult?.resolution.result ?? null,
        survivors: sumCounts(raidResult?.resolution.survivors ?? {}),
        lootCore,
        lootTotal:
          (raidResult?.resolution.loot.scrap ?? 0) +
          (raidResult?.resolution.loot.power ?? 0) +
          lootCore * 4,
        recommendedPower: target?.recommendedPower ?? null
      });
    }

    const postLongVictories = postLongSamples.filter((sample) => sample.result === 'victory');

    if (
      extended.counterAttacksResolved < 4 ||
      postLongVictories.length < 2
    ) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            extensionRaidWins: extended.raidWins,
            counterAttacksResolved: extended.counterAttacksResolved,
            counterAttackVictories: extended.counterAttackVictories,
            counterAttackDefeats: extended.counterAttackDefeats,
            now: extended.now,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            counterThreat: state.meta.counterThreat,
            resources: state.resources,
            researches: state.meta.researches,
            roster: state.roster,
            squadPower,
            postLongSamples
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(extended.raidWins).toBeGreaterThanOrEqual(24);
    expect(extended.counterAttacksResolved).toBeGreaterThanOrEqual(4);
    expect(extended.counterAttackVictories).toBeGreaterThanOrEqual(2);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(squadPower).toBeGreaterThan(600);
    expect(state.resources.core).toBeGreaterThanOrEqual(40);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(postLongSamples.filter((sample) => sample.recommendedPower !== null).length).toBeGreaterThanOrEqual(6);
    expect(postLongVictories.length).toBeGreaterThanOrEqual(2);
    expect(postLongVictories.some((sample) => sample.survivors >= 3)).toBe(true);
    expect(postLongVictories.some((sample) => sample.lootCore >= 2)).toBe(true);
    expect(postLongVictories.some((sample) => sample.lootTotal >= 35)).toBe(true);
  }, 40000);

  it('recovers from an explicit counter-attack defeat back into deterministic zone3 wins', () => {
    const balance = createTestBalance();
    const { route, defeatSummary, recovered, recoveredState, recoveredSquadPower } =
      createExplicitDefeatRecovery(balance, 300);
    const postDefeatSamples: Array<{
      result: string | null;
      survivors: number;
      lootCore: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 6; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        recoveredState,
        balance,
        recovered.now + (index + 1) * 613
      );
      const target = pickBestSafeZoneTarget(sampledState, balance, 3, 1.22, true);
      const raidResult = target ? simulateRaidBattle(sampledState, balance, target) : null;

      postDefeatSamples.push({
        result: raidResult?.resolution.result ?? null,
        survivors: sumCounts(raidResult?.resolution.survivors ?? {}),
        lootCore: raidResult?.resolution.loot.core ?? 0,
        recommendedPower: target?.recommendedPower ?? null
      });
    }
    const postDefeatVictories = postDefeatSamples.filter((sample) => sample.result === 'victory');

    if (
      defeatSummary?.victory !== false ||
      postDefeatSamples.filter((sample) => sample.recommendedPower !== null).length < 4 ||
      !postDefeatSamples.some((sample) => sample.survivors >= 3) ||
      postDefeatVictories.length < 1
    ) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            defeatSummary,
            recoveryRaidWins: recovered.raidWins,
            counterAttacksResolved: recovered.counterAttacksResolved,
            counterAttackVictories: recovered.counterAttackVictories,
            counterAttackDefeats: recovered.counterAttackDefeats,
            hqLevel: recoveredState.base.hqLevel,
            zoneTier: recoveredState.meta.zoneTier,
            counterThreat: recoveredState.meta.counterThreat,
            resources: recoveredState.resources,
            researches: recoveredState.meta.researches,
            roster: recoveredState.roster,
            recoveredSquadPower,
            postDefeatSamples
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(defeatSummary?.victory).toBe(false);
    expect(defeatSummary?.enemyPower).toBeGreaterThan(defeatSummary?.playerPower ?? 0);
    expect((defeatSummary?.resourceLoss.scrap ?? 0) + (defeatSummary?.resourceLoss.power ?? 0)).toBeGreaterThan(0);
    expect(recovered.raidWins).toBeGreaterThanOrEqual(10);
    expect(recoveredState.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(recoveredState.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(countRosterUnits(recoveredState, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(recoveredSquadPower).toBeGreaterThan(620);
    expect(recoveredState.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(postDefeatSamples.filter((sample) => sample.recommendedPower !== null).length).toBeGreaterThanOrEqual(4);
    expect(postDefeatVictories.length).toBeGreaterThanOrEqual(1);
    expect(postDefeatSamples.some((sample) => sample.survivors >= 3)).toBe(true);
    expect(
      postDefeatSamples.some(
        (sample) => sample.recommendedPower !== null && sample.recommendedPower <= 850
      )
    ).toBe(true);
    expect(postDefeatVictories.some((sample) => sample.lootCore >= 2)).toBe(true);
  }, 35000);

  it('repeats deterministic zone3 wins after an explicit counter-attack defeat', () => {
    const balance = createTestBalance();
    const { route, recovered, state, now, sequenceResults, victories, victoryAfterLoss } =
      createRepeatedPostDefeatWins(balance, 300);

    if (victories.length < 2 || !victoryAfterLoss) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            recoveryRaidWins: recovered.raidWins,
            now,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            counterThreat: state.meta.counterThreat,
            resources: state.resources,
            researches: state.meta.researches,
            roster: state.roster,
            sequenceResults
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(recovered.raidWins).toBeGreaterThanOrEqual(10);
    expect(victories.length).toBeGreaterThanOrEqual(2);
    expect(victoryAfterLoss).toBe(true);
    expect(victories.some((result) => result.survivors >= 3)).toBe(true);
    expect(victories.some((result) => result.lootCore >= 2)).toBe(true);
    expect(victories.some((result) => result.lootTotal >= 35)).toBe(true);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
  }, 40000);

  it('holds up under post-defeat economy pressure with repeated counter-attacks after recovery', () => {
    const balance = createTestBalance();
    const { route, recovered, state: repeatedState, now: repeatedNow, victories, victoryAfterLoss } =
      createRepeatedPostDefeatWins(balance, 300);
    const extended = continueObservedProgressionRoute(repeatedState, balance, repeatedNow, 120);
    const state = extended.state;
    const squadPower = getRaidSquadPower(state, balance);
    const postPressureSamples: Array<{
      result: string | null;
      survivors: number;
      lootCore: number;
      lootTotal: number;
      recommendedPower: number | null;
    }> = [];

    for (let index = 0; index < 6; index += 1) {
      const sampledState = refreshScoutTargetsForProgression(
        state,
        balance,
        extended.now + (index + 1) * 719
      );
      const target = pickBestSafeZoneTarget(sampledState, balance, 3, 1.24, true);
      const raidResult = target ? simulateRaidBattle(sampledState, balance, target) : null;
      const lootCore = raidResult?.resolution.loot.core ?? 0;

      postPressureSamples.push({
        result: raidResult?.resolution.result ?? null,
        survivors: sumCounts(raidResult?.resolution.survivors ?? {}),
        lootCore,
        lootTotal:
          (raidResult?.resolution.loot.scrap ?? 0) +
          (raidResult?.resolution.loot.power ?? 0) +
          lootCore * 4,
        recommendedPower: target?.recommendedPower ?? null
      });
    }

    const postPressureVictories = postPressureSamples.filter((sample) => sample.result === 'victory');

    if (
      extended.counterAttacksResolved < 2 ||
      postPressureVictories.length < 2 ||
      !postPressureVictories.some((sample) => sample.survivors >= 3)
    ) {
      console.log(
        JSON.stringify(
          {
            routeRaidWins: route.raidWins,
            recoveryRaidWins: recovered.raidWins,
            repeatedVictories: victories.length,
            victoryAfterLoss,
            extensionRaidWins: extended.raidWins,
            counterAttacksResolved: extended.counterAttacksResolved,
            counterAttackVictories: extended.counterAttackVictories,
            counterAttackDefeats: extended.counterAttackDefeats,
            now: extended.now,
            hqLevel: state.base.hqLevel,
            zoneTier: state.meta.zoneTier,
            counterThreat: state.meta.counterThreat,
            resources: state.resources,
            researches: state.meta.researches,
            roster: state.roster,
            squadPower,
            postPressureSamples
          },
          null,
          2
        )
      );
    }

    expect(route.raidWins).toBeGreaterThanOrEqual(36);
    expect(recovered.raidWins).toBeGreaterThanOrEqual(10);
    expect(victories.length).toBeGreaterThanOrEqual(2);
    expect(victoryAfterLoss).toBe(true);
    expect(extended.raidWins).toBeGreaterThanOrEqual(10);
    expect(extended.counterAttacksResolved).toBeGreaterThanOrEqual(2);
    expect(extended.counterAttackVictories).toBeGreaterThanOrEqual(1);
    expect(state.base.hqLevel).toBeGreaterThanOrEqual(4);
    expect(state.meta.zoneTier).toBeGreaterThanOrEqual(3);
    expect(countRosterUnits(state, ['shieldbot', 'rocket_buggy', 'repair_drone'])).toBeGreaterThanOrEqual(4);
    expect(squadPower).toBeGreaterThan(620);
    expect(state.resources.core).toBeGreaterThanOrEqual(30);
    expect(state.base.scoutTargets.some((target) => target.zoneTier === 3)).toBe(true);
    expect(postPressureSamples.filter((sample) => sample.recommendedPower !== null).length).toBeGreaterThanOrEqual(5);
    expect(postPressureVictories.length).toBeGreaterThanOrEqual(2);
    expect(postPressureVictories.some((sample) => sample.survivors >= 3)).toBe(true);
    expect(postPressureVictories.some((sample) => sample.lootCore >= 2)).toBe(true);
    expect(postPressureVictories.some((sample) => sample.lootTotal >= 35)).toBe(true);
  }, 45000);
});
