import { appendLog } from '../../utils/logger';
import { canAfford, subtractResources } from '../../utils/resources';
import { nextId } from '../../utils/ids';
import type { BalanceData, ResourceAmount } from '../../types/balance';
import type { GameState } from '../../types/game';

export const getStructureUpgradeCost = (
  cost: ResourceAmount,
  level: number
): ResourceAmount => ({
  scrap: Math.ceil(cost.scrap * Math.pow(1.45, level)),
  power: Math.ceil(cost.power * Math.pow(1.45, level)),
  core: Math.ceil(cost.core * Math.pow(1.45, level))
});

export const upgradeStructure = (
  state: GameState,
  balance: BalanceData,
  structureId: string,
  now: number
): GameState => {
  const target = state.base.structures.find((structure) => structure.id === structureId);

  if (!target || !target.buildingId || target.completeAt !== null) {
    return state;
  }

  const definition = balance.buildingMap[target.buildingId];
  const upgradeCost = getStructureUpgradeCost(definition.cost, target.level);

  if (!canAfford(state.resources, upgradeCost)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  const structure = next.base.structures.find((entry) => entry.id === structureId);

  if (!structure) {
    return state;
  }

  structure.level += 1;
  structure.completeAt =
    now + Math.ceil(definition.buildTimeSec * (1 + (structure.level - 1) * 0.25)) * 1000;
  next.resources = subtractResources(next.resources, upgradeCost);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'base',
      event: 'build.start',
      actorId: nextId('upgrade'),
      extra: {
        buildingId: structure.buildingId ?? 'unknown',
        slotId: structure.slotId,
        level: structure.level
      }
    },
    balance.config.maxLogs
  );

  return next;
};
