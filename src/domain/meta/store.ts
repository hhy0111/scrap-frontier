import { generateScoutTargets } from '../ai/generateScoutTargets';
import { getStorageCaps } from '../base/tickProduction';
import { appendLog } from '../../utils/logger';
import { addResources, clampResources } from '../../utils/resources';
import type { BalanceData, ResourceAmount } from '../../types/balance';
import type {
  GameState,
  RewardedPlacementId,
  ShopOfferId,
  StoreState
} from '../../types/game';

export type StoreOfferDefinition = {
  id: ShopOfferId;
  title: string;
  subtitle: string;
  detailLines: string[];
  priceLabel: string;
  reward: ResourceAmount;
  unitGrant?: Record<string, number>;
  unlockAdFree?: boolean;
  unlockMonthlySupply?: boolean;
};

export type RewardedPlacementDefinition = {
  id: RewardedPlacementId;
  title: string;
  detailLines: string[];
};

export const MONTHLY_SUPPLY_REWARD: ResourceAmount = {
  scrap: 180,
  power: 90,
  core: 15
};

const STORE_OFFERS: Record<ShopOfferId, StoreOfferDefinition> = {
  starter_pack: {
    id: 'starter_pack',
    title: 'Starter Pack',
    subtitle: 'Fast build boost',
    detailLines: [
      'SCRAP +260',
      'POWER +120',
      'CORE +24',
      'SCAV +1 / RIFLE +1'
    ],
    priceLabel: '3,900 KRW',
    reward: {
      scrap: 260,
      power: 120,
      core: 24
    },
    unitGrant: {
      scavenger: 1,
      rifleman: 1
    }
  },
  commander_pack: {
    id: 'commander_pack',
    title: 'Commander Pack',
    subtitle: 'Ad-free command layer',
    detailLines: [
      'SCRAP +300',
      'POWER +180',
      'CORE +30',
      'AD-FREE CLAIM MODE'
    ],
    priceLabel: '25,000 KRW',
    reward: {
      scrap: 300,
      power: 180,
      core: 30
    },
    unlockAdFree: true
  },
  monthly_pass: {
    id: 'monthly_pass',
    title: 'Monthly Pass',
    subtitle: 'Daily supply line',
    detailLines: [
      'SCRAP +150',
      'POWER +60',
      'CORE +10',
      'DAILY SUPPLY UNLOCK'
    ],
    priceLabel: '9,900 KRW',
    reward: {
      scrap: 150,
      power: 60,
      core: 10
    },
    unlockMonthlySupply: true
  }
};

const REWARDED_PLACEMENTS: Record<RewardedPlacementId, RewardedPlacementDefinition> = {
  salvage_drop: {
    id: 'salvage_drop',
    title: 'Salvage Drop',
    detailLines: [
      'RESOURCE CACHE',
      'Scaled by current zone tier'
    ]
  },
  scout_ping: {
    id: 'scout_ping',
    title: 'Scout Ping',
    detailLines: [
      'Instant reroll of all scout targets',
      'Best used before raid prep'
    ]
  },
  offline_overdrive: {
    id: 'offline_overdrive',
    title: 'Offline Boost x2',
    detailLines: [
      'Duplicates the current offline report once',
      'Requires an active offline summary'
    ]
  }
};

const getScaledSalvageReward = (zoneTier: number): ResourceAmount => ({
  scrap: 120 + Math.max(0, zoneTier - 1) * 40,
  power: 60 + Math.max(0, zoneTier - 1) * 25,
  core: 10 + Math.max(0, zoneTier - 1) * 4
});

const applyResourceGrant = (
  state: GameState,
  balance: BalanceData,
  reward: ResourceAmount
): ResourceAmount =>
  clampResources(addResources(state.resources, reward), getStorageCaps(state, balance));

const applyUnitGrant = (
  roster: GameState['roster'],
  unitGrant: Record<string, number> | undefined
): GameState['roster'] => {
  if (!unitGrant) {
    return roster;
  }

  const nextRoster = { ...roster };
  Object.entries(unitGrant).forEach(([unitId, count]) => {
    nextRoster[unitId] = (nextRoster[unitId] ?? 0) + count;
  });
  return nextRoster;
};

export const createInitialStoreState = (): StoreState => ({
  purchases: {
    starter_pack: false,
    commander_pack: false,
    monthly_pass: false
  },
  adsDisabled: false,
  rewardedAdsWatched: 0,
  lastRewardedPlacement: null,
  monthlySupplyClaimDay: null
});

export const getStoreOfferDefinition = (
  offerId: ShopOfferId
): StoreOfferDefinition => STORE_OFFERS[offerId];

export const getStoreOfferDefinitions = (): StoreOfferDefinition[] =>
  Object.values(STORE_OFFERS);

export const getRewardedPlacementDefinition = (
  placementId: RewardedPlacementId
): RewardedPlacementDefinition => REWARDED_PLACEMENTS[placementId];

export const getRewardedPlacementDefinitions = (): RewardedPlacementDefinition[] =>
  Object.values(REWARDED_PLACEMENTS);

export const canClaimMonthlySupply = (state: GameState): boolean =>
  state.meta.store.purchases.monthly_pass &&
  state.meta.store.monthlySupplyClaimDay !== state.meta.dayIndex;

export const getRewardedPlacementRewardPreview = (
  state: GameState,
  placementId: RewardedPlacementId
): ResourceAmount | null => {
  if (placementId === 'salvage_drop') {
    return getScaledSalvageReward(state.meta.zoneTier);
  }

  if (placementId === 'offline_overdrive') {
    return state.pendingOfflineReward?.boosted ? null : state.pendingOfflineReward?.reward ?? null;
  }

  return null;
};

export const purchaseStoreOffer = (
  state: GameState,
  balance: BalanceData,
  offerId: ShopOfferId,
  now: number
): GameState => {
  const definition = getStoreOfferDefinition(offerId);

  if (state.meta.store.purchases[offerId]) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.meta.store.purchases[offerId] = true;
  next.meta.store.adsDisabled =
    next.meta.store.adsDisabled || Boolean(definition.unlockAdFree);
  next.resources = applyResourceGrant(next, balance, definition.reward);
  next.roster = applyUnitGrant(next.roster, definition.unitGrant);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'shop',
      event: 'shop.purchase',
      actorId: offerId
    },
    balance.config.maxLogs
  );
  return next;
};

export const restoreStorePurchases = (
  state: GameState,
  balance: BalanceData,
  restoredOffers: ShopOfferId[],
  adsDisabled: boolean,
  now: number
): GameState => {
  const next = structuredClone(state) as GameState;
  let changed = false;

  restoredOffers.forEach((offerId) => {
    if (!next.meta.store.purchases[offerId]) {
      next.meta.store.purchases[offerId] = true;
      changed = true;
    }
  });

  if (adsDisabled && !next.meta.store.adsDisabled) {
    next.meta.store.adsDisabled = true;
    changed = true;
  }

  if (!changed) {
    return state;
  }

  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'shop',
      event: 'shop.restore',
      extra: {
        restoredOffers: restoredOffers.join(',') || 'none',
        adsDisabled
      }
    },
    balance.config.maxLogs
  );
  return next;
};

export const claimMonthlySupply = (
  state: GameState,
  balance: BalanceData,
  now: number
): GameState => {
  if (!canClaimMonthlySupply(state)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.meta.store.monthlySupplyClaimDay = state.meta.dayIndex;
  next.resources = applyResourceGrant(next, balance, MONTHLY_SUPPLY_REWARD);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'shop',
      event: 'shop.monthly_supply'
    },
    balance.config.maxLogs
  );
  return next;
};

export const claimRewardedPlacement = (
  state: GameState,
  balance: BalanceData,
  placementId: RewardedPlacementId,
  now: number
): GameState => {
  if (placementId === 'offline_overdrive') {
    if (!state.pendingOfflineReward || state.pendingOfflineReward.boosted) {
      return state;
    }
  }

  const next = structuredClone(state) as GameState;
  next.meta.store.rewardedAdsWatched += 1;
  next.meta.store.lastRewardedPlacement = placementId;

  if (placementId === 'salvage_drop') {
    next.resources = applyResourceGrant(
      next,
      balance,
      getScaledSalvageReward(state.meta.zoneTier)
    );
  } else if (placementId === 'scout_ping') {
    next.base.scoutTargets = generateScoutTargets(next, balance, now);
    next.base.selectedScoutTargetId = next.base.scoutTargets[0]?.id ?? null;
    next.base.lastScoutAt = now;
  } else if (next.pendingOfflineReward) {
    next.resources = applyResourceGrant(next, balance, next.pendingOfflineReward.reward);
    next.pendingOfflineReward.boosted = true;
  }

  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'shop',
      event: 'shop.rewarded',
      actorId: placementId
    },
    balance.config.maxLogs
  );
  return next;
};
