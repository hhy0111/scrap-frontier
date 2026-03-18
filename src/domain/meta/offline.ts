import { emptyResources } from '../../utils/resources';
import type { BalanceData, ResourceAmount } from '../../types/balance';
import type { GameState, OfflineRewardSummary } from '../../types/game';

export const getOfflineWindowMs = (balance: BalanceData): number =>
  balance.config.maxOfflineHours * 60 * 60 * 1000;

const getResourceDelta = (
  before: ResourceAmount,
  after: ResourceAmount
): ResourceAmount => ({
  scrap: Math.max(0, after.scrap - before.scrap),
  power: Math.max(0, after.power - before.power),
  core: Math.max(0, after.core - before.core)
});

export const buildOfflineRewardSummary = (
  before: GameState,
  after: GameState,
  balance: BalanceData,
  now: number
): OfflineRewardSummary | null => {
  const cappedMs = Math.min(
    Math.max(0, now - before.lastAppliedAt),
    getOfflineWindowMs(balance)
  );
  const minutes = Math.floor(cappedMs / 60000);
  const reward = getResourceDelta(before.resources, after.resources);

  if (minutes <= 0) {
    return null;
  }

  const total = reward.scrap + reward.power + reward.core;
  if (total <= 0) {
    return {
      minutes,
      reward: emptyResources()
    };
  }

  return {
    minutes,
    reward
  };
};
