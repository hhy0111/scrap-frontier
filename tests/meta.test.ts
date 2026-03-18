import { describe, expect, it } from 'vitest';
import { tickProduction } from '../src/domain/base/tickProduction';
import { applyCounterAttack, resolveCounterAttack } from '../src/domain/meta/counterAttack';
import {
  advanceMissionProgress,
  claimMissionReward,
  syncDailyMissions
} from '../src/domain/meta/daily';
import { buildOfflineRewardSummary } from '../src/domain/meta/offline';
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
});
