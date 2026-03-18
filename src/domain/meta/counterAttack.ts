import { clampResources, subtractResources } from '../../utils/resources';
import { getUnitPower } from '../ai/generateScoutTargets';
import { getStorageCaps } from '../base/tickProduction';
import type { BalanceData } from '../../types/balance';
import type { CounterAttackSummary, GameState } from '../../types/game';

const getDefensePower = (state: GameState, balance: BalanceData): number => {
  const turretPower = state.base.structures.reduce((total, structure) => {
    if (structure.buildingId === 'auto_turret' && structure.completeAt === null) {
      return total + 90 + (structure.level - 1) * 20;
    }
    return total;
  }, 0);

  const unitPower = Object.entries(state.roster).reduce(
    (total, [unitId, count]) => total + getUnitPower(unitId, balance) * count * 0.65,
    0
  );

  return Math.floor(unitPower + turretPower + state.base.hqLevel * 80);
};

const getEnemyPower = (state: GameState): number =>
  Math.floor(380 + state.meta.zoneTier * 110 + state.meta.counterThreat * 3.2);

export const resolveCounterAttack = (
  state: GameState,
  balance: BalanceData
): CounterAttackSummary => {
  const playerPower = getDefensePower(state, balance);
  const enemyPower = getEnemyPower(state);
  const victory = playerPower >= enemyPower * 0.92;
  const lossRatio = victory ? 0.08 + enemyPower / Math.max(playerPower, 1) * 0.04 : 0.16 + enemyPower / Math.max(playerPower, 1) * 0.08;
  const losses: Record<string, number> = {};

  for (const [unitId, count] of Object.entries(state.roster)) {
    if (count <= 0) {
      losses[unitId] = 0;
      continue;
    }

    const lost = Math.min(count, Math.floor(count * Math.min(0.45, lossRatio)));
    losses[unitId] = lost;
  }

  const resourceLoss = victory
    ? { scrap: 0, power: 0, core: 0 }
    : {
        scrap: Math.min(state.resources.scrap, 140 + state.meta.zoneTier * 80),
        power: Math.min(state.resources.power, 60 + state.meta.zoneTier * 40),
        core: 0
      };

  return {
    victory,
    enemyPower,
    playerPower,
    losses,
    resourceLoss
  };
};

export const applyCounterAttack = (
  state: GameState,
  balance: BalanceData,
  summary: CounterAttackSummary
): GameState => {
  const next = structuredClone(state) as GameState;

  for (const [unitId, lost] of Object.entries(summary.losses)) {
    next.roster[unitId] = Math.max(0, (next.roster[unitId] ?? 0) - lost);
  }

  next.resources = subtractResources(next.resources, summary.resourceLoss);
  next.resources = clampResources(next.resources, getStorageCaps(next, balance));
  next.meta.counterThreat = summary.victory ? 0 : 20;
  next.lastCounterAttack = summary;

  return next;
};
