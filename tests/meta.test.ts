import { describe, expect, it } from 'vitest';
import { tickProduction } from '../src/domain/base/tickProduction';
import { applyCounterAttack, resolveCounterAttack } from '../src/domain/meta/counterAttack';
import {
  advanceMissionProgress,
  claimMissionReward,
  syncDailyMissions
} from '../src/domain/meta/daily';
import { buildOfflineRewardSummary } from '../src/domain/meta/offline';
import { getEffectiveUnitStats, upgradeResearch } from '../src/domain/meta/research';
import {
  getUnlockMilestoneItems,
  getUpcomingUnlockMilestones,
  getUnlockStatus
} from '../src/domain/meta/unlocks';
import {
  canClaimMonthlySupply,
  claimMonthlySupply,
  claimRewardedPlacement,
  restoreStorePurchases,
  purchaseStoreOffer
} from '../src/domain/meta/store';
import { generateScoutTargets, getTemplatePower } from '../src/domain/ai/generateScoutTargets';
import { buildRaidSquad, startRaid } from '../src/domain/raid/startRaid';
import { createTestBalance, createTestState } from './helpers';

describe('meta systems', () => {
  it('tracks and claims daily mission rewards', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const progressedMissions = advanceMissionProgress(
      state.meta.dailyMissions,
      'train_unit',
      3
    );
    const progressedState = {
      ...state,
      meta: {
        ...state.meta,
        dailyMissions: progressedMissions
      }
    };

    const claimed = claimMissionReward(progressedState, 'daily_train_unit');
    const mission = claimed.meta.dailyMissions.find(
      (entry) => entry.id === 'daily_train_unit'
    );

    expect(mission?.claimed).toBe(true);
    expect(claimed.resources.scrap).toBeGreaterThan(state.resources.scrap);
    expect(claimed.resources.power).toBeGreaterThan(state.resources.power);
  });

  it('resets daily missions when the day rolls over', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const progressedState = {
      ...state,
      meta: {
        ...state.meta,
        dailyMissions: advanceMissionProgress(state.meta.dailyMissions, 'raid_win', 1)
      }
    };

    const nextDay = syncDailyMissions(progressedState, 86400000);

    expect(nextDay.meta.dayIndex).toBe(1);
    expect(
      nextDay.meta.dailyMissions.every(
        (mission) => mission.progress === 0 && mission.claimed === false
      )
    ).toBe(true);
  });

  it('builds an offline reward summary from accrued production', () => {
    const balance = createTestBalance();
    const before = createTestState(balance);
    const after = tickProduction(before, balance, 60000);
    const summary = buildOfflineRewardSummary(before, after, balance, 60000);

    expect(summary).not.toBeNull();
    expect(summary?.minutes).toBe(1);
    expect(summary?.reward.scrap).toBeGreaterThan(0);
    expect(summary?.reward.power).toBeGreaterThan(0);
    expect(summary?.boosted).toBe(false);
  });

  it('applies counter attack losses and threat reset', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const threatened = {
      ...state,
      meta: {
        ...state.meta,
        counterThreat: 100
      }
    };

    const summary = resolveCounterAttack(threatened, balance);
    const next = applyCounterAttack(threatened, balance, summary);

    expect(summary.victory).toBe(false);
    expect(next.meta.counterThreat).toBe(20);
    expect(next.lastCounterAttack).toEqual(summary);
    expect(next.resources.scrap).toBeLessThanOrEqual(threatened.resources.scrap);
  });

  it('upgrades barracks research and boosts researched unit stats', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.resources = {
      scrap: 2000,
      power: 180,
      core: 200
    };

    const next = upgradeResearch(state, balance, 'barracks', 1000);
    const stats = getEffectiveUnitStats('rifleman', balance, next.meta.researches);

    expect(next.meta.researches.barracks).toBe(1);
    expect(next.resources.scrap).toBeLessThan(state.resources.scrap);
    expect(next.resources.core).toBeLessThan(state.resources.core);
    expect(stats?.hp).toBeGreaterThan(balance.unitMap.rifleman.stats.hp);
    expect(stats?.atk).toBeGreaterThan(balance.unitMap.rifleman.stats.atk);
  });

  it('applies player research to raid actors without buffing enemy units', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.base.hqLevel = 3;
    state.meta.zoneTier = 1;
    state.meta.researches.garage = 2;
    state.roster.shieldbot = 1;

    const template = balance.enemies.find((entry) => entry.id === 'zone1_elite_a');

    expect(template).toBeDefined();
    if (!template) {
      return;
    }

    const target = {
      id: 'manual_zone1_elite',
      templateId: template.id,
      name: template.name,
      difficulty: template.difficulty,
      recommendedPower: getTemplatePower(template.id, balance),
      storedRewards: template.storedRewards,
      zoneTier: template.zoneTier,
      turrets: template.turrets,
      defenderCount: template.defenders.reduce((total, entry) => total + entry.count, 0)
    };

    const squad = buildRaidSquad(state, balance);
    const raid = startRaid(state, balance, target, squad, 'mid');

    expect(raid).not.toBeNull();
    if (!raid) {
      return;
    }

    const playerShield = raid.playerActors.find((actor) => actor.sourceId === 'shieldbot');
    const enemyShield = raid.enemyActors.find((actor) => actor.sourceId === 'shieldbot');

    expect(playerShield?.maxHp).toBeGreaterThan(balance.unitMap.shieldbot.stats.hp);
    expect(playerShield?.atk).toBeGreaterThan(balance.unitMap.shieldbot.stats.atk);
    expect(enemyShield?.maxHp).toBe(balance.unitMap.shieldbot.stats.hp);
    expect(enemyShield?.atk).toBe(balance.unitMap.shieldbot.stats.atk);
  });

  it('purchases store offers once and grants their rewards', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);

    const purchased = purchaseStoreOffer(state, balance, 'starter_pack', 1000);

    expect(purchased.meta.store.purchases.starter_pack).toBe(true);
    expect(purchased.resources.scrap).toBeGreaterThan(state.resources.scrap);
    expect(purchased.roster.scavenger).toBeGreaterThan(state.roster.scavenger);
    expect(purchaseStoreOffer(purchased, balance, 'starter_pack', 2000)).toBe(purchased);
  });

  it('unlocks and claims monthly supply once per day', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);

    const purchased = purchaseStoreOffer(state, balance, 'monthly_pass', 1000);

    expect(canClaimMonthlySupply(purchased)).toBe(true);

    const claimed = claimMonthlySupply(purchased, balance, 1200);

    expect(claimed.meta.store.monthlySupplyClaimDay).toBe(claimed.meta.dayIndex);
    expect(claimed.resources.scrap).toBeGreaterThan(purchased.resources.scrap);
    expect(claimMonthlySupply(claimed, balance, 1300)).toBe(claimed);
  });

  it('applies rewarded store actions and prevents duplicate offline boosts', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.pendingOfflineReward = {
      minutes: 15,
      reward: {
        scrap: 90,
        power: 40,
        core: 8
      },
      boosted: false
    };

    const salvage = claimRewardedPlacement(state, balance, 'salvage_drop', 1000);
    const boosted = claimRewardedPlacement(salvage, balance, 'offline_overdrive', 1100);
    const refreshed = claimRewardedPlacement(boosted, balance, 'scout_ping', 1200);

    expect(salvage.resources.scrap).toBeGreaterThan(state.resources.scrap);
    expect(boosted.pendingOfflineReward?.boosted).toBe(true);
    expect(claimRewardedPlacement(boosted, balance, 'offline_overdrive', 1300)).toBe(boosted);
    expect(refreshed.base.scoutTargets.length).toBeGreaterThan(0);
    expect(refreshed.meta.store.lastRewardedPlacement).toBe('scout_ping');
  });

  it('restores store entitlements without replaying purchase rewards', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);

    const restored = restoreStorePurchases(
      state,
      balance,
      ['commander_pack', 'monthly_pass'],
      true,
      1000
    );

    expect(restored.meta.store.purchases.commander_pack).toBe(true);
    expect(restored.meta.store.purchases.monthly_pass).toBe(true);
    expect(restored.meta.store.adsDisabled).toBe(true);
    expect(restored.resources).toEqual(state.resources);
    expect(restoreStorePurchases(restored, balance, ['commander_pack'], true, 1100)).toBe(restored);
  });

  it('surfaces upcoming HQ unlock milestones', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);

    const milestones = getUpcomingUnlockMilestones(state, balance, 2);

    expect(milestones[0]).toMatchObject({
      hqLevel: 2,
      buildings: ['STORAGE', 'TURRET']
    });
    expect(getUnlockMilestoneItems(milestones[1])).toContain('ZONE 2');
    expect(milestones[1]?.buildings).toContain('GARAGE');
    expect(milestones[1]?.units).toEqual(['SHIELD', 'BUGGY', 'DRONE']);
    expect(milestones[1]?.researches).toContain('MECH RES');
  });

  it('separates HQ locks from facility needs in unlock status', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.base.hqLevel = 3;
    state.meta.zoneTier = 2;

    const status = getUnlockStatus(state, balance);

    expect(status.unitsLocked).toHaveLength(0);
    expect(status.researchesLocked).toHaveLength(0);
    expect(status.facilityNeeds).toHaveLength(1);
    expect(status.facilityNeeds[0]?.buildingLabel).toBe('GARAGE');
    expect(status.facilityNeeds[0]?.unitLabels).toEqual(['SHIELD', 'BUGGY', 'DRONE']);
  });
});
