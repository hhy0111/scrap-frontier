import type { RaidResolution, RaidState } from '../types/raid';

let currentRaid: RaidState | null = null;
let lastRaidResolution: RaidResolution | null = null;

export const setCurrentRaid = (raid: RaidState | null): void => {
  currentRaid = raid;
};

export const getCurrentRaid = (): RaidState | null => currentRaid;

export const setLastRaidResolution = (resolution: RaidResolution | null): void => {
  lastRaidResolution = resolution;
};

export const getLastRaidResolution = (): RaidResolution | null => lastRaidResolution;
