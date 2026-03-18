import { appendLog } from '../../utils/logger';
import { canAfford, subtractResources } from '../../utils/resources';
import type { BalanceData, ResourceAmount } from '../../types/balance';
import type { GameState } from '../../types/game';

const HQ_COSTS: Record<number, ResourceAmount> = {
  2: { scrap: 300, power: 120, core: 30 },
  3: { scrap: 520, power: 220, core: 55 },
  4: { scrap: 860, power: 360, core: 90 },
  5: { scrap: 1300, power: 540, core: 140 }
};

export const getHqLevelCost = (level: number): ResourceAmount | null =>
  HQ_COSTS[level] ?? null;

export const levelUpHq = (
  state: GameState,
  balance: BalanceData,
  now: number
): GameState => {
  const nextLevel = state.base.hqLevel + 1;
  const cost = getHqLevelCost(nextLevel);

  if (!cost || !canAfford(state.resources, cost)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.base.hqLevel = nextLevel;
  next.meta.zoneTier = Math.max(next.meta.zoneTier, Math.min(3, nextLevel - 1));
  next.resources = subtractResources(next.resources, cost);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'base',
      event: 'hq.level_up',
      value: nextLevel
    },
    balance.config.maxLogs
  );
  return next;
};
