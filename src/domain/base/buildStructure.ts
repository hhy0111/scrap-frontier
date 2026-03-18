import { appendLog } from '../../utils/logger';
import { canAfford, subtractResources } from '../../utils/resources';
import { nextId } from '../../utils/ids';
import type { BalanceData } from '../../types/balance';
import type { GameState } from '../../types/game';

const RESERVED_SLOT = 'hq';

export const buildStructure = (
  state: GameState,
  balance: BalanceData,
  buildingId: string,
  now: number
): GameState => {
  const definition = balance.buildingMap[buildingId];

  if (!definition || definition.role === 'hq') {
    return state;
  }

  if (state.base.hqLevel < definition.unlockHqLevel) {
    return state;
  }

  const currentCount = state.base.structures.filter(
    (structure) => structure.buildingId === buildingId
  ).length;

  if (currentCount >= definition.maxCount) {
    return state;
  }

  const emptySlot = state.base.structures.find(
    (structure) => structure.slotId !== RESERVED_SLOT && structure.buildingId === null
  );

  if (!emptySlot || !canAfford(state.resources, definition.cost)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  const slot = next.base.structures.find(
    (structure) => structure.id === emptySlot.id
  );

  if (!slot) {
    return state;
  }

  slot.buildingId = buildingId;
  slot.level = 1;
  slot.completeAt = now + definition.buildTimeSec * 1000;
  next.resources = subtractResources(next.resources, definition.cost);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'base',
      event: 'build.start',
      actorId: nextId('build'),
      extra: { buildingId, slotId: slot.slotId }
    },
    balance.config.maxLogs
  );

  return next;
};
