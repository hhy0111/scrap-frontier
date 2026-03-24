import { getResearchDefinition } from './research';
import type { BalanceData } from '../../types/balance';
import type { GameState, ResearchTrackId } from '../../types/game';

type LockedUnlock = {
  label: string;
  unlockHqLevel: number;
};

type FacilityNeed = {
  buildingLabel: string;
  unitLabels: string[];
};

export type UnlockMilestone = {
  hqLevel: number;
  zoneTier: number | null;
  buildings: string[];
  units: string[];
  researches: string[];
};

export type UnlockStatus = {
  buildingsLocked: LockedUnlock[];
  unitsLocked: LockedUnlock[];
  researchesLocked: LockedUnlock[];
  facilityNeeds: FacilityNeed[];
};

const BUILDING_LABELS: Record<string, string> = {
  scrap_yard: 'SCRAP',
  generator: 'POWER',
  barracks: 'BARRACKS',
  garage: 'GARAGE',
  storage: 'STORAGE',
  auto_turret: 'TURRET'
};

const UNIT_LABELS: Record<string, string> = {
  scavenger: 'SCAV',
  rifleman: 'RIFLE',
  shieldbot: 'SHIELD',
  rocket_buggy: 'BUGGY',
  repair_drone: 'DRONE'
};

const RESEARCH_LABELS: Record<ResearchTrackId, string> = {
  barracks: 'INF RES',
  garage: 'MECH RES'
};

const RESEARCH_TRACKS: ResearchTrackId[] = ['barracks', 'garage'];

const getBuildingLabel = (buildingId: string, balance: BalanceData): string =>
  BUILDING_LABELS[buildingId] ?? balance.buildingMap[buildingId]?.name.toUpperCase() ?? buildingId.toUpperCase();

const getUnitLabel = (unitId: string, balance: BalanceData): string =>
  UNIT_LABELS[unitId] ?? balance.unitMap[unitId]?.name.toUpperCase() ?? unitId.toUpperCase();

const getZoneTierForHqLevel = (hqLevel: number): number =>
  Math.max(1, Math.min(3, hqLevel - 1));

export const getUnlockMilestoneItems = (milestone: UnlockMilestone): string[] => {
  const items: string[] = [];

  if (milestone.zoneTier !== null) {
    items.push(`ZONE ${milestone.zoneTier}`);
  }

  items.push(...milestone.buildings, ...milestone.units, ...milestone.researches);
  return items;
};

export const getUpcomingUnlockMilestones = (
  state: GameState,
  balance: BalanceData,
  limit = 3
): UnlockMilestone[] => {
  const highestUnlockLevel = Math.max(
    5,
    ...balance.buildings.map((building) => building.unlockHqLevel),
    ...balance.units.map((unit) => unit.unlockHqLevel),
    ...RESEARCH_TRACKS.map((trackId) => getResearchDefinition(trackId).unlockHqLevel)
  );
  const milestones: UnlockMilestone[] = [];

  for (let hqLevel = state.base.hqLevel + 1; hqLevel <= highestUnlockLevel; hqLevel += 1) {
    const prevZoneTier = getZoneTierForHqLevel(hqLevel - 1);
    const nextZoneTier = getZoneTierForHqLevel(hqLevel);
    const milestone: UnlockMilestone = {
      hqLevel,
      zoneTier: nextZoneTier > prevZoneTier ? nextZoneTier : null,
      buildings: balance.buildings
        .filter(
          (building) => building.id !== 'command_center' && building.unlockHqLevel === hqLevel
        )
        .map((building) => getBuildingLabel(building.id, balance)),
      units: balance.units
        .filter((unit) => unit.unlockHqLevel === hqLevel)
        .map((unit) => getUnitLabel(unit.id, balance)),
      researches: RESEARCH_TRACKS.filter(
        (trackId) => getResearchDefinition(trackId).unlockHqLevel === hqLevel
      ).map((trackId) => RESEARCH_LABELS[trackId])
    };

    if (getUnlockMilestoneItems(milestone).length > 0) {
      milestones.push(milestone);
    }
  }

  return milestones.slice(0, limit);
};

export const getUnlockStatus = (
  state: GameState,
  balance: BalanceData
): UnlockStatus => {
  const builtCounts = state.base.structures.reduce<Record<string, number>>((counts, structure) => {
    if (structure.buildingId) {
      counts[structure.buildingId] = (counts[structure.buildingId] ?? 0) + 1;
    }

    return counts;
  }, {});

  const buildingsLocked = balance.buildings
    .filter(
      (building) =>
        building.id !== 'command_center' && building.unlockHqLevel > state.base.hqLevel
    )
    .map((building) => ({
      label: getBuildingLabel(building.id, balance),
      unlockHqLevel: building.unlockHqLevel
    }));

  const unitsLocked = balance.units
    .filter((unit) => unit.unlockHqLevel > state.base.hqLevel)
    .map((unit) => ({
      label: getUnitLabel(unit.id, balance),
      unlockHqLevel: unit.unlockHqLevel
    }));

  const researchesLocked = RESEARCH_TRACKS.filter(
    (trackId) => getResearchDefinition(trackId).unlockHqLevel > state.base.hqLevel
  ).map((trackId) => ({
    label: RESEARCH_LABELS[trackId],
    unlockHqLevel: getResearchDefinition(trackId).unlockHqLevel
  }));

  const facilityNeeds = (['barracks', 'garage'] as const)
    .map((buildingId) => {
      const unitLabels = balance.units
        .filter(
          (unit) =>
            unit.trainBuildingId === buildingId && unit.unlockHqLevel <= state.base.hqLevel
        )
        .map((unit) => getUnitLabel(unit.id, balance));

      if (unitLabels.length === 0 || (builtCounts[buildingId] ?? 0) > 0) {
        return null;
      }

      return {
        buildingLabel: getBuildingLabel(buildingId, balance),
        unitLabels
      };
    })
    .filter((entry): entry is FacilityNeed => entry !== null);

  return {
    buildingsLocked,
    unitsLocked,
    researchesLocked,
    facilityNeeds
  };
};
