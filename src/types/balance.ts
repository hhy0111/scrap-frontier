export type ResourceKey = 'scrap' | 'power' | 'core';

export type ResourceAmount = Record<ResourceKey, number>;

export type ResourceAmountInput = Partial<ResourceAmount>;

export type BuildingDefinition = {
  id: string;
  name: string;
  role: 'hq' | 'production' | 'training' | 'storage' | 'defense';
  maxCount: number;
  unlockHqLevel: number;
  buildTimeSec: number;
  cost: ResourceAmount;
  stats: {
    hp: number;
    productionPerMin?: ResourceAmountInput;
    storageBonus?: ResourceAmountInput;
    queueCapacity?: number;
    attack?: number;
    defense?: number;
    range?: number;
    attackInterval?: number;
  };
};

export type UnitDefinition = {
  id: string;
  name: string;
  role: 'raider' | 'ranged' | 'tank' | 'siege' | 'support';
  unlockHqLevel: number;
  trainBuildingId: 'barracks' | 'garage';
  cost: ResourceAmount;
  trainSec: number;
  stats: {
    hp: number;
    atk: number;
    def: number;
    range: number;
    attackInterval: number;
    moveSpeed: number;
    carry: number;
    heal?: number;
    buildingBonus?: number;
  };
};

export type EnemyTemplate = {
  id: string;
  name: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'elite';
  zoneTier: number;
  turrets: number;
  hqHp: number;
  storedRewards: ResourceAmount;
  defenders: Array<{
    unitId: string;
    count: number;
  }>;
};

export type GameConfig = {
  baseCaps: ResourceAmount;
  startingResources: ResourceAmount;
  startingRoster: Record<string, number>;
  maxOfflineHours: number;
  raidSquadSize: number;
  maxLogs: number;
  saveVersion: number;
  slotIds: string[];
};

export type BalanceData = {
  config: GameConfig;
  buildings: BuildingDefinition[];
  units: UnitDefinition[];
  enemies: EnemyTemplate[];
  buildingMap: Record<string, BuildingDefinition>;
  unitMap: Record<string, UnitDefinition>;
};
