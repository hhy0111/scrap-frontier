import { generateScoutTargets } from '../ai/generateScoutTargets';
import { tickProduction } from '../base/tickProduction';
import {
  advanceMissionProgress,
  claimMissionReward,
  syncDailyMissions
} from './daily';
import { applyCounterAttack, resolveCounterAttack } from './counterAttack';
import { buildRaidSquad, startRaid } from '../raid/startRaid';
import { resolveRaid, stepRaid } from '../raid/stepRaid';
import { addResources } from '../../utils/resources';
import { getSquadPower } from '../ai/generateScoutTargets';
import { getRaidThreatGain } from './raidThreat';
import type { BalanceData } from '../../types/balance';
import type { GameState, ScoutTarget } from '../../types/game';
import type { EntryLane, RaidResolution, RaidState } from '../../types/raid';

export const settleProgressionState = (
  state: GameState,
  balance: BalanceData,
  now: number
): GameState => claimCompletedDailyMissions(syncDailyMissions(tickProduction(state, balance, now), now));

export const claimCompletedDailyMissions = (state: GameState): GameState => {
  let next = state;

  for (const mission of next.meta.dailyMissions) {
    if (!mission.claimed && mission.progress >= mission.target) {
      next = claimMissionReward(next, mission.id);
    }
  }

  return next;
};

export const refreshScoutTargetsForProgression = (
  state: GameState,
  balance: BalanceData,
  now: number
): GameState => {
  const next = structuredClone(state) as GameState;
  next.base.scoutTargets = generateScoutTargets(next, balance, now);
  next.base.selectedScoutTargetId = next.base.scoutTargets[0]?.id ?? null;
  next.base.lastScoutAt = now;
  return next;
};

export const getRaidSquadPower = (
  state: GameState,
  balance: BalanceData
): number => getSquadPower(buildRaidSquad(state, balance), balance, state.meta.researches);

const getTargetRewardValue = (target: ScoutTarget): number =>
  target.storedRewards.scrap + target.storedRewards.power + target.storedRewards.core * 4;

export const pickBestSafeScoutTarget = (
  state: GameState,
  balance: BalanceData,
  safetyRatio = 1.12
): ScoutTarget | null => {
  const squadPower = getRaidSquadPower(state, balance);
  const sorted = [...state.base.scoutTargets].sort(
    (left, right) => left.recommendedPower - right.recommendedPower
  );

  if (sorted.length === 0) {
    return null;
  }

  const safeTargets = sorted.filter(
    (target) => target.recommendedPower <= squadPower * safetyRatio
  );

  if (safeTargets.length === 0) {
    return sorted[0] ?? null;
  }

  return safeTargets.sort((left, right) => {
    const rewardGap = getTargetRewardValue(right) - getTargetRewardValue(left);
    if (rewardGap !== 0) {
      return rewardGap;
    }

    return left.recommendedPower - right.recommendedPower;
  })[0] ?? null;
};

export const applyRaidResolutionToState = (
  state: GameState,
  raid: RaidState,
  resolution: RaidResolution
): GameState => {
  const next = structuredClone(state) as GameState;

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
    next.meta.counterThreat + getRaidThreatGain(resolution.result)
  );

  if (resolution.result === 'victory') {
    next.meta.dailyMissions = advanceMissionProgress(next.meta.dailyMissions, 'raid_win', 1);
  }

  return next;
};

export const resolvePendingCounterAttack = (
  state: GameState,
  balance: BalanceData
): GameState =>
  state.meta.counterThreat >= 100
    ? applyCounterAttack(state, balance, resolveCounterAttack(state, balance))
    : state;

export const simulateRaidBattle = (
  state: GameState,
  balance: BalanceData,
  target: ScoutTarget,
  entryLane: EntryLane = 'mid'
): { raid: RaidState; resolution: RaidResolution } | null => {
  const squad = buildRaidSquad(state, balance);
  const raid = startRaid(state, balance, target, squad, entryLane);

  if (!raid) {
    return null;
  }

  let current = raid;
  let guard = 0;
  const stepMs = 100;

  while (current.result === 'running' && guard < 2400) {
    current = stepRaid(current, stepMs);
    guard += 1;
  }

  return {
    raid: current,
    resolution: resolveRaid(current)
  };
};
