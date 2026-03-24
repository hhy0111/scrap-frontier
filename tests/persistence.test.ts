import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../src/state/persistence';
import { createTestBalance, createTestState } from './helpers';
import type { GameState } from '../src/types/game';

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
};

const createMemoryLocalStorage = (): MemoryStorage => {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    }
  };
};

const installWindow = (localStorage: MemoryStorage): void => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage
    },
    configurable: true
  });
};

const writePersistedState = (localStorage: MemoryStorage, state: GameState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const importFreshGameStore = async () => {
  vi.resetModules();
  return import('../src/state/gameState');
};

describe('state persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it('hydrates a compatible save and builds an offline reward summary', async () => {
    const balance = createTestBalance();
    const localStorage = createMemoryLocalStorage();
    const persisted = createTestState(balance);
    const now = new Date('2026-03-23T00:30:00.000Z');

    persisted.lastAppliedAt = 0;
    persisted.resources.scrap = 540;
    persisted.resources.power = 210;
    persisted.meta.zoneTier = 2;
    persisted.meta.researches.garage = 1;
    persisted.meta.store.purchases.monthly_pass = true;
    persisted.meta.store.adsDisabled = true;
    persisted.meta.tutorialDismissed = true;
    persisted.logs = [
      {
        timeMs: 1000,
        scene: 'base',
        event: 'test.save'
      }
    ];

    installWindow(localStorage);
    writePersistedState(localStorage, persisted);
    vi.setSystemTime(now);

    const { gameStore } = await importFreshGameStore();
    const hydrated = gameStore.getState();

    expect(hydrated.version).toBe(balance.config.saveVersion);
    expect(hydrated.resources.scrap).toBeGreaterThanOrEqual(persisted.resources.scrap);
    expect(hydrated.resources.power).toBeGreaterThanOrEqual(persisted.resources.power);
    expect(hydrated.meta.zoneTier).toBe(2);
    expect(hydrated.meta.researches.garage).toBe(1);
    expect(hydrated.meta.store.purchases.monthly_pass).toBe(true);
    expect(hydrated.meta.store.adsDisabled).toBe(true);
    expect(hydrated.meta.tutorialDismissed).toBe(true);
    expect(hydrated.logs).toHaveLength(1);
    expect(hydrated.pendingOfflineReward).not.toBeNull();
    expect(hydrated.pendingOfflineReward?.minutes).toBeGreaterThan(0);
    expect(
      (hydrated.pendingOfflineReward?.reward.scrap ?? 0) +
        (hydrated.pendingOfflineReward?.reward.power ?? 0)
    ).toBeGreaterThan(0);
  });

  it('falls back to a fresh state when the persisted save version is stale', async () => {
    const balance = createTestBalance();
    const localStorage = createMemoryLocalStorage();
    const persisted = createTestState(balance);

    persisted.version = balance.config.saveVersion - 1;
    persisted.meta.store.purchases.commander_pack = true;
    persisted.meta.store.adsDisabled = true;
    persisted.meta.tutorialDismissed = true;
    persisted.resources.core = 999;

    installWindow(localStorage);
    writePersistedState(localStorage, persisted);
    vi.setSystemTime(new Date('2026-03-23T01:00:00.000Z'));

    const { gameStore } = await importFreshGameStore();
    const hydrated = gameStore.getState();
    const reparsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as GameState | null;

    expect(hydrated.version).toBe(balance.config.saveVersion);
    expect(hydrated.meta.store.purchases.commander_pack).toBe(false);
    expect(hydrated.meta.store.adsDisabled).toBe(false);
    expect(hydrated.meta.tutorialDismissed).toBe(false);
    expect(hydrated.resources.core).toBe(balance.config.startingResources.core);
    expect(reparsed?.version).toBe(balance.config.saveVersion);
    expect(reparsed?.meta.store.purchases.commander_pack).toBe(false);
  });

  it('persists restored store purchases back to localStorage', async () => {
    const localStorage = createMemoryLocalStorage();

    installWindow(localStorage);
    vi.setSystemTime(new Date('2026-03-23T02:00:00.000Z'));

    const { gameStore } = await importFreshGameStore();
    gameStore.restoreStorePurchases(['commander_pack', 'monthly_pass'], true);

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as GameState | null;

    expect(persisted).not.toBeNull();
    expect(persisted?.meta.store.purchases.commander_pack).toBe(true);
    expect(persisted?.meta.store.purchases.monthly_pass).toBe(true);
    expect(persisted?.meta.store.adsDisabled).toBe(true);
  });
});
