import { appendLog } from '../../utils/logger';
import { addResources, clampResources, cloneResources, emptyResources } from '../../utils/resources';
import type { BalanceData, ResourceAmount } from '../../types/balance';
import type { GameState, TrainingEntry } from '../../types/game';

const getProductionScale = (level: number): number => 1 + (level - 1) * 0.35;

const getStorageScale = (level: number): number => 1 + (level - 1) * 0.35;

const finishReadyEntries = (
  entries: TrainingEntry[],
  now: number
): { remaining: TrainingEntry[]; completed: TrainingEntry[] } => {
  const remaining: TrainingEntry[] = [];
  const completed: TrainingEntry[] = [];

  for (const entry of entries) {
    if (entry.completeAt <= now) {
      completed.push(entry);
    } else {
      remaining.push(entry);
    }
  }

  return { remaining, completed };
};

export const getStorageCaps = (
  state: GameState,
  balance: BalanceData
): ResourceAmount => {
  const caps = cloneResources(balance.config.baseCaps);

  for (const structure of state.base.structures) {
    if (!structure.buildingId || structure.completeAt !== null) {
      continue;
    }

    const definition = balance.buildingMap[structure.buildingId];
    const storageBonus = definition.stats.storageBonus;

    if (!storageBonus) {
      continue;
    }

    const scale = getStorageScale(structure.level);
    caps.scrap += Math.floor((storageBonus.scrap ?? 0) * scale);
    caps.power += Math.floor((storageBonus.power ?? 0) * scale);
    caps.core += Math.floor((storageBonus.core ?? 0) * scale);
  }

  return caps;
};

export const tickProduction = (
  state: GameState,
  balance: BalanceData,
  targetNow: number
): GameState => {
  if (targetNow <= state.lastAppliedAt) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  const fromMs = next.lastAppliedAt;
  const toMs = targetNow;
  let produced = emptyResources();

  for (const structure of next.base.structures) {
    if (!structure.buildingId) {
      continue;
    }

    const definition = balance.buildingMap[structure.buildingId];
    const completionTime = structure.completeAt;
    const activeFrom =
      completionTime === null ? fromMs : Math.max(fromMs, completionTime);

    if (completionTime !== null && completionTime <= toMs) {
      structure.completeAt = null;
      next.logs = appendLog(
        next.logs,
        {
          timeMs: completionTime,
          scene: 'base',
          event: 'build.complete',
          actorId: structure.id,
          extra: { buildingId: definition.id, slotId: structure.slotId }
        },
        balance.config.maxLogs
      );
    }

    if (!definition.stats.productionPerMin || activeFrom >= toMs) {
      continue;
    }

    const durationMinutes = (toMs - activeFrom) / 60000;
    const scale = getProductionScale(structure.level);
    produced = addResources(produced, {
      scrap: Math.floor(
        (definition.stats.productionPerMin.scrap ?? 0) *
          durationMinutes *
          scale
      ),
      power: Math.floor(
        (definition.stats.productionPerMin.power ?? 0) *
          durationMinutes *
          scale
      ),
      core: Math.floor(
        (definition.stats.productionPerMin.core ?? 0) *
          durationMinutes *
          scale
      )
    });
  }

  next.resources = addResources(next.resources, produced);

  const barracksResult = finishReadyEntries(
    next.base.trainingQueues.barracks,
    toMs
  );
  const garageResult = finishReadyEntries(next.base.trainingQueues.garage, toMs);

  next.base.trainingQueues.barracks = barracksResult.remaining;
  next.base.trainingQueues.garage = garageResult.remaining;

  for (const entry of [...barracksResult.completed, ...garageResult.completed]) {
    next.roster[entry.unitId] = (next.roster[entry.unitId] ?? 0) + 1;
    next.logs = appendLog(
      next.logs,
      {
        timeMs: entry.completeAt,
        scene: 'base',
        event: 'train.complete',
        actorId: entry.id,
        extra: { unitId: entry.unitId, buildingId: entry.buildingId }
      },
      balance.config.maxLogs
    );
  }

  next.resources = clampResources(next.resources, getStorageCaps(next, balance));
  next.lastAppliedAt = toMs;
  next.now = toMs;

  return next;
};
