import { appendLog } from '../../utils/logger';
import { canAfford, subtractResources } from '../../utils/resources';
import type { BalanceData, ResourceAmount, UnitDefinition } from '../../types/balance';
import type { GameState, ResearchLevels, ResearchTrackId } from '../../types/game';

type ResearchDefinition = {
  id: ResearchTrackId;
  label: string;
  shortLabel: string;
  unlockHqLevel: number;
  maxLevel: number;
  units: string[];
  baseCost: {
    scrap: number;
    core: number;
  };
};

const RESEARCH_DEFINITIONS: Record<ResearchTrackId, ResearchDefinition> = {
  barracks: {
    id: 'barracks',
    label: 'Barracks Research',
    shortLabel: 'INF',
    unlockHqLevel: 1,
    maxLevel: 5,
    units: ['scavenger', 'rifleman'],
    baseCost: {
      scrap: 160,
      core: 14
    }
  },
  garage: {
    id: 'garage',
    label: 'Garage Research',
    shortLabel: 'MECH',
    unlockHqLevel: 3,
    maxLevel: 5,
    units: ['shieldbot', 'rocket_buggy', 'repair_drone'],
    baseCost: {
      scrap: 260,
      core: 16
    }
  }
};

export const createInitialResearchLevels = (): ResearchLevels => ({
  barracks: 0,
  garage: 0
});

export const getResearchDefinition = (
  trackId: ResearchTrackId
): ResearchDefinition => RESEARCH_DEFINITIONS[trackId];

export const getResearchCost = (
  trackId: ResearchTrackId,
  nextLevel: number
): ResourceAmount | null => {
  const definition = getResearchDefinition(trackId);
  if (nextLevel < 1 || nextLevel > definition.maxLevel) {
    return null;
  }

  return {
    scrap: Math.ceil(definition.baseCost.scrap * Math.pow(1.6, nextLevel - 1)),
    power: 0,
    core: Math.ceil(definition.baseCost.core * Math.pow(1.5, nextLevel - 1))
  };
};

export const getUnitResearchTrack = (
  unitId: string
): ResearchTrackId | null => {
  if (RESEARCH_DEFINITIONS.barracks.units.includes(unitId)) {
    return 'barracks';
  }

  if (RESEARCH_DEFINITIONS.garage.units.includes(unitId)) {
    return 'garage';
  }

  return null;
};

export const getUnitResearchLevel = (
  unitId: string,
  researches: ResearchLevels
): number => {
  const trackId = getUnitResearchTrack(unitId);
  return trackId ? researches[trackId] ?? 0 : 0;
};

export const getResearchMultiplier = (level: number): number => 1 + level * 0.08;

export const getEffectiveUnitStats = (
  unitId: string,
  balance: BalanceData,
  researches: ResearchLevels
): UnitDefinition['stats'] | null => {
  const unit = balance.unitMap[unitId];
  if (!unit) {
    return null;
  }

  const level = getUnitResearchLevel(unitId, researches);
  const multiplier = getResearchMultiplier(level);

  return {
    ...unit.stats,
    hp: Math.floor(unit.stats.hp * multiplier),
    atk: Math.floor(unit.stats.atk * multiplier),
    heal: unit.stats.heal ? Math.floor(unit.stats.heal * multiplier) : undefined
  };
};

export const upgradeResearch = (
  state: GameState,
  balance: BalanceData,
  trackId: ResearchTrackId,
  now: number
): GameState => {
  const definition = getResearchDefinition(trackId);
  const currentLevel = state.meta.researches[trackId] ?? 0;

  if (state.base.hqLevel < definition.unlockHqLevel || currentLevel >= definition.maxLevel) {
    return state;
  }

  const nextLevel = currentLevel + 1;
  const cost = getResearchCost(trackId, nextLevel);

  if (!cost || !canAfford(state.resources, cost)) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.meta.researches[trackId] = nextLevel;
  next.resources = subtractResources(next.resources, cost);
  next.logs = appendLog(
    next.logs,
    {
      timeMs: now,
      scene: 'base',
      event: 'research.upgrade',
      extra: {
        trackId,
        level: nextLevel
      }
    },
    balance.config.maxLogs
  );

  return next;
};
