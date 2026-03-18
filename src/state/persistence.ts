import type { GameState } from '../types/game';

const STORAGE_KEY = 'scrap-frontier-save';

export const loadPersistedState = (): GameState | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
};

export const persistState = (state: GameState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures in development.
  }
};
