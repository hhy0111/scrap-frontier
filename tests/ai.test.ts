import { describe, expect, it } from 'vitest';
import { generateScoutTargets } from '../src/domain/ai/generateScoutTargets';
import { createTestBalance, createTestState } from './helpers';

describe('scout generation', () => {
  it('generates three raid targets', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const targets = generateScoutTargets(state, balance, 123456);

    expect(targets).toHaveLength(3);
    expect(targets.every((target) => target.recommendedPower > 0)).toBe(true);
    expect(new Set(targets.map((target) => target.id)).size).toBe(3);
  });
});
