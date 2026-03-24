import { describe, expect, it } from 'vitest';
import { generateScoutTargets, getAutoRaidPower } from '../src/domain/ai/generateScoutTargets';
import { createTestBalance, createTestState } from './helpers';

describe('scout generation', () => {
  const getAverageScoutSummary = (
    seedStart: number,
    state: ReturnType<typeof createTestState>,
    balance: ReturnType<typeof createTestBalance>
  ) => {
    const totals = {
      recommendedPower: 0,
      scrap: 0,
      power: 0,
      core: 0
    };

    for (let index = 0; index < 24; index += 1) {
      const targets = generateScoutTargets(state, balance, seedStart + index * 911);
      targets.forEach((target) => {
        totals.recommendedPower += target.recommendedPower;
        totals.scrap += target.storedRewards.scrap;
        totals.power += target.storedRewards.power;
        totals.core += target.storedRewards.core;
      });
    }

    const count = 24 * 3;

    return {
      recommendedPower: totals.recommendedPower / count,
      scrap: totals.scrap / count,
      power: totals.power / count,
      core: totals.core / count
    };
  };

  const getBandAverages = (
    seedStart: number,
    state: ReturnType<typeof createTestState>,
    balance: ReturnType<typeof createTestBalance>
  ) => {
    let low = 0;
    let mid = 0;
    let high = 0;

    for (let index = 0; index < 24; index += 1) {
      const targets = generateScoutTargets(state, balance, seedStart + index * 911).sort(
        (left, right) => left.recommendedPower - right.recommendedPower
      );
      low += targets[0]?.recommendedPower ?? 0;
      mid += targets[1]?.recommendedPower ?? 0;
      high += targets[2]?.recommendedPower ?? 0;
    }

    return {
      low: low / 24,
      mid: mid / 24,
      high: high / 24
    };
  };

  it('generates three raid targets', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const targets = generateScoutTargets(state, balance, 123456);

    expect(targets).toHaveLength(3);
    expect(targets.every((target) => target.recommendedPower > 0)).toBe(true);
    expect(targets.every((target) => target.defenderCount > 0)).toBe(true);
    expect(targets.every((target) => target.turrets >= 1)).toBe(true);
    expect(new Set(targets.map((target) => target.id)).size).toBe(3);
    expect(new Set(targets.map((target) => target.templateId)).size).toBe(3);
    expect(targets[0]!.recommendedPower).toBeLessThanOrEqual(targets[1]!.recommendedPower);
    expect(targets[1]!.recommendedPower).toBeLessThanOrEqual(targets[2]!.recommendedPower);
  });

  it('limits targets to the currently unlocked zone tier', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const targets = generateScoutTargets(state, balance, 777);

    expect(targets.every((target) => target.zoneTier <= 1)).toBe(true);
  });

  it('surfaces higher-tier targets after later zones are unlocked', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.base.hqLevel = 5;
    state.meta.zoneTier = 3;

    const seenTiers = new Set<number>();
    for (let index = 0; index < 40; index += 1) {
      const targets = generateScoutTargets(state, balance, index * 9973);
      targets.forEach((target) => seenTiers.add(target.zoneTier));
    }

    expect(balance.enemies).toHaveLength(12);
    expect(seenTiers.has(2)).toBe(true);
    expect(seenTiers.has(3)).toBe(true);
  });

  it('biases unlocked late-game scouting toward the highest zone tier', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    state.base.hqLevel = 5;
    state.meta.zoneTier = 3;
    state.roster.shieldbot = 2;
    state.roster.rocket_buggy = 2;
    state.roster.repair_drone = 1;

    let zone1Count = 0;
    let zone3Count = 0;

    for (let index = 0; index < 30; index += 1) {
      const targets = generateScoutTargets(state, balance, index * 811);
      targets.forEach((target) => {
        if (target.zoneTier === 1) {
          zone1Count += 1;
        }

        if (target.zoneTier === 3) {
          zone3Count += 1;
        }
      });
    }

    expect(zone3Count).toBeGreaterThan(zone1Count);
  });

  it('raises average recommended power and rewards across later zone progression', () => {
    const zone1Balance = createTestBalance();
    const zone1State = createTestState(zone1Balance);

    const zone2Balance = createTestBalance();
    const zone2State = createTestState(zone2Balance);
    zone2State.base.hqLevel = 3;
    zone2State.meta.zoneTier = 2;
    zone2State.roster.shieldbot = 2;
    zone2State.roster.rocket_buggy = 1;

    const zone3Balance = createTestBalance();
    const zone3State = createTestState(zone3Balance);
    zone3State.base.hqLevel = 5;
    zone3State.meta.zoneTier = 3;
    zone3State.meta.researches.barracks = 2;
    zone3State.meta.researches.garage = 2;
    zone3State.roster.shieldbot = 2;
    zone3State.roster.rocket_buggy = 2;
    zone3State.roster.repair_drone = 1;

    const zone1Average = getAverageScoutSummary(1000, zone1State, zone1Balance);
    const zone2Average = getAverageScoutSummary(2000, zone2State, zone2Balance);
    const zone3Average = getAverageScoutSummary(3000, zone3State, zone3Balance);

    expect(zone2Average.recommendedPower).toBeGreaterThan(zone1Average.recommendedPower * 1.18);
    expect(zone3Average.recommendedPower).toBeGreaterThan(zone2Average.recommendedPower * 1.12);
    expect(zone2Average.scrap).toBeGreaterThan(zone1Average.scrap * 1.25);
    expect(zone3Average.scrap).toBeGreaterThan(zone2Average.scrap * 1.15);
    expect(zone2Average.core).toBeGreaterThan(zone1Average.core * 1.25);
    expect(zone3Average.core).toBeGreaterThan(zone2Average.core * 1.15);
  });

  it('keeps the lowest unlocked target close to current auto-raid power while preserving a harder top target', () => {
    const zone2Balance = createTestBalance();
    const zone2State = createTestState(zone2Balance);
    zone2State.base.hqLevel = 3;
    zone2State.meta.zoneTier = 2;
    zone2State.roster.shieldbot = 2;
    zone2State.roster.rocket_buggy = 1;

    const zone3Balance = createTestBalance();
    const zone3State = createTestState(zone3Balance);
    zone3State.base.hqLevel = 5;
    zone3State.meta.zoneTier = 3;
    zone3State.meta.researches.barracks = 2;
    zone3State.meta.researches.garage = 2;
    zone3State.roster.shieldbot = 2;
    zone3State.roster.rocket_buggy = 2;
    zone3State.roster.repair_drone = 1;

    const zone2AutoRaidPower = getAutoRaidPower(zone2State, zone2Balance);
    const zone3AutoRaidPower = getAutoRaidPower(zone3State, zone3Balance);
    const zone2Bands = getBandAverages(4000, zone2State, zone2Balance);
    const zone3Bands = getBandAverages(5000, zone3State, zone3Balance);

    expect(zone2Bands.low).toBeLessThan(zone2AutoRaidPower * 1.35);
    expect(zone2Bands.high).toBeGreaterThan(zone2AutoRaidPower * 1.08);
    expect(zone3Bands.low).toBeLessThan(zone3AutoRaidPower * 1.38);
    expect(zone3Bands.high).toBeGreaterThan(zone3AutoRaidPower * 1.1);
  });
});
