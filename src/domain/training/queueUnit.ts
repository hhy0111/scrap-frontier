import { appendLog } from '../../utils/logger';
import { canAfford, subtractResources } from '../../utils/resources';
import { nextId } from '../../utils/ids';
import type { BalanceData } from '../../types/balance';
import type { GameState } from '../../types/game';

const getQueueCapacity = (
  state: GameState,
  balance: BalanceData,
  buildingId: 'barracks' | 'garage'
): number =>
  state.base.structures.reduce((total, structure) => {
    if (structure.buildingId !== buildingId || structure.completeAt !== null) {
      return total;
    }

    return total + (balance.buildingMap[buildingId].stats.queueCapacity ?? 0);
  }, 0);

export const queueUnit = (
  state: GameState,
  balance: BalanceData,
  unitId: string,
  now: number
): GameState => {
  const definition = balance.unitMap[unitId];

  if (!definition || state.base.hqLevel < definition.unlockHqLevel) {
    return state;
  }

  const buildingId = definition.trainBuildingId;
  const queue = state.base.trainingQueues[buildingId];
  const capacity = getQueueCapacity(state, balance, buildingId);

  if (capacity <= 0 || queue.length >= capacity || !canAfford(state.resources, definition.cost)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  const nextQueue = next.base.trainingQueues[buildingId];
  const lastFinishAt = nextQueue.at(-1)?.completeAt ?? now;
  nextQueue.push({
    id: nextId('train'),
    unitId,
    buildingId,
    completeAt: lastFinishAt + definition.trainSec * 1000
  });
  next.resources = subtractResources(next.resources, definition.cost);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'base',
      event: 'train.queue',
      extra: { unitId, buildingId }
    },
    balance.config.maxLogs
  );
  return next;
};
