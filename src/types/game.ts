import type { ResourceAmount } from './balance';

export type ResearchTrackId = 'barracks' | 'garage';

export type ResearchLevels = Record<ResearchTrackId, number>;

export type ShopOfferId = 'starter_pack' | 'commander_pack' | 'monthly_pass';

export type RewardedPlacementId =
  | 'salvage_drop'
  | 'scout_ping'
  | 'offline_overdrive';

export type BannerPlacementId = 'base_lobby';

export type StoreState = {
  purchases: Record<ShopOfferId, boolean>;
  adsDisabled: boolean;
  rewardedAdsWatched: number;
  lastRewardedPlacement: RewardedPlacementId | null;
  monthlySupplyClaimDay: number | null;
};

export type DailyMissionType = 'raid_win' | 'train_unit' | 'build_any';

export type DailyMission = {
  id: string;
  type: DailyMissionType;
  label: string;
  target: number;
  progress: number;
  reward: ResourceAmount;
  claimed: boolean;
};

export type OfflineRewardSummary = {
  minutes: number;
  reward: ResourceAmount;
  boosted: boolean;
};

export type CounterAttackSummary = {
  victory: boolean;
  enemyPower: number;
  playerPower: number;
  losses: Record<string, number>;
  resourceLoss: ResourceAmount;
};

export type StructureInstance = {
  id: string;
  slotId: string;
  buildingId: string | null;
  level: number;
  completeAt: number | null;
};

export type TrainingEntry = {
  id: string;
  unitId: string;
  buildingId: 'barracks' | 'garage';
  completeAt: number;
};

export type ScoutTarget = {
  id: string;
  templateId: string;
  name: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'elite';
  recommendedPower: number;
  storedRewards: ResourceAmount;
  zoneTier: number;
  turrets: number;
  defenderCount: number;
};

export type DebugLog = {
  timeMs: number;
  scene: string;
  event: string;
  actorId?: string;
  targetId?: string;
  value?: number;
  extra?: Record<string, string | number | boolean>;
};

export type BattleSummary = {
  targetId: string;
  victory: boolean;
  loot: ResourceAmount;
  survivors: Record<string, number>;
  lost: Record<string, number>;
  durationSec: number;
};

export type GameState = {
  version: number;
  now: number;
  resources: ResourceAmount;
  pendingOfflineReward: OfflineRewardSummary | null;
  base: {
    hqLevel: number;
    structures: StructureInstance[];
    trainingQueues: Record<'barracks' | 'garage', TrainingEntry[]>;
    scoutTargets: ScoutTarget[];
    selectedScoutTargetId: string | null;
    lastScoutAt: number;
  };
  roster: Record<string, number>;
  meta: {
    zoneTier: number;
    counterThreat: number;
    dayIndex: number;
    dailyMissions: DailyMission[];
    researches: ResearchLevels;
    store: StoreState;
    tutorialStep: number;
    tutorialDismissed: boolean;
  };
  lastAppliedAt: number;
  lastBattle: BattleSummary | null;
  lastCounterAttack: CounterAttackSummary | null;
  logs: DebugLog[];
};

export type StateListener = (state: GameState) => void;
