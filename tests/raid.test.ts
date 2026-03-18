import { describe, expect, it } from 'vitest';
import { generateScoutTargets } from '../src/domain/ai/generateScoutTargets';
import { resolveRaid, stepRaid, triggerRally } from '../src/domain/raid/stepRaid';
import { buildRaidSquad, startRaid } from '../src/domain/raid/startRaid';
import { createTestBalance, createTestState } from './helpers';

describe('raid simulation', () => {
  it('reaches a terminal state and resolves rewards', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const target = generateScoutTargets(state, balance, 1000)[0];
    const squad = buildRaidSquad(state, balance);
    let raid = startRaid(state, balance, target, squad, 'mid');

    expect(raid).not.toBeNull();
    if (!raid) {
      return;
    }

    for (let index = 0; index < 600 && raid.result === 'running'; index += 1) {
      raid = stepRaid(raid, 200);
    }

    expect(raid.result).not.toBe('running');
    const resolution = resolveRaid(raid);

    expect(resolution.durationSec).toBeGreaterThan(0);
    expect(Object.keys(resolution.lost).length).toBeGreaterThan(0);
    expect(resolution.loot.scrap).toBeGreaterThanOrEqual(0);
    expect(resolution.loot.power).toBeGreaterThanOrEqual(0);
    expect(resolution.loot.core).toBeGreaterThanOrEqual(0);
  });

  it('activates rally only when cooldown is ready', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const target = generateScoutTargets(state, balance, 1000)[0];
    const squad = buildRaidSquad(state, balance);
    const raid = startRaid(state, balance, target, squad, 'left');

    expect(raid).not.toBeNull();
    if (!raid) {
      return;
    }

    const rallied = triggerRally(raid);
    expect(rallied.rallyActiveSec).toBe(5);
    expect(rallied.rallyCooldownSec).toBe(20);

    const blocked = triggerRally(rallied);
    expect(blocked.rallyActiveSec).toBe(5);
    expect(blocked.rallyCooldownSec).toBe(20);
  });
});
