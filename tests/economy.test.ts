import { describe, expect, it } from 'vitest';
import { buildStructure } from '../src/domain/base/buildStructure';
import { tickProduction } from '../src/domain/base/tickProduction';
import { createTestBalance, createTestState } from './helpers';

describe('economy domain', () => {
  it('produces scrap and power over time', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const next = tickProduction(state, balance, 60000);

    expect(next.resources.scrap).toBeGreaterThan(state.resources.scrap);
    expect(next.resources.power).toBeGreaterThan(state.resources.power);
  });

  it('builds a new structure into the next empty slot', () => {
    const balance = createTestBalance();
    const state = createTestState(balance);
    const next = buildStructure(state, balance, 'scrap_yard', 0);

    expect(next.base.structures.some((structure) => structure.buildingId === 'scrap_yard' && structure.slotId === 'north_2')).toBe(true);
    expect(next.resources.scrap).toBe(state.resources.scrap - balance.buildingMap.scrap_yard.cost.scrap);
  });
});
