import { createDailyMissions, getDayIndex } from '../src/domain/meta/daily';
import { loadBalance } from '../src/data/loadBalance';
import { createInitialStoreState } from '../src/domain/meta/store';
import type { BalanceData } from '../src/types/balance';
import type { GameState, StructureInstance } from '../src/types/game';

export const createTestBalance = (): BalanceData => loadBalance();

export const createTestStructures = (balance: BalanceData): StructureInstance[] =>
  balance.config.slotIds.map((slotId, index) => {
    const defaults: Record<string, { buildingId: string | null; level: number }> = {
      hq: { buildingId: 'command_center', level: 1 },
      north_1: { buildingId: 'scrap_yard', level: 1 },
      east_1: { buildingId: 'generator', level: 1 },
      south_1: { buildingId: 'barracks', level: 1 }
    };
    const current = defaults[slotId] ?? { buildingId: null, level: 0 };

    return {
      id: `slot_${index}`,
      slotId,
      buildingId: current.buildingId,
      level: current.level,
      completeAt: null
    };
  });

export const createTestState = (balance = createTestBalance()): GameState => ({
  version: balance.config.saveVersion,
  now: 0,
  resources: { ...balance.config.startingResources },
  pendingOfflineReward: null,
  base: {
    hqLevel: 1,
    structures: createTestStructures(balance),
    trainingQueues: {
      barracks: [],
      garage: []
    },
    scoutTargets: [],
    selectedScoutTargetId: null,
    lastScoutAt: 0
  },
  roster: { ...balance.config.startingRoster },
  meta: {
    zoneTier: 1,
    counterThreat: 0,
    dayIndex: getDayIndex(0),
    dailyMissions: createDailyMissions(),
    researches: {
      barracks: 0,
      garage: 0
    },
    store: createInitialStoreState(),
    tutorialStep: 0,
    tutorialDismissed: false
  },
  lastAppliedAt: 0,
  lastBattle: null,
  lastCounterAttack: null,
  logs: []
});
