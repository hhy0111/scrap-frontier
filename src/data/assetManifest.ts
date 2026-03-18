export type AssetEntry = {
  key: string;
  src: string;
};

export const ASSET_MANIFEST: AssetEntry[] = [
  { key: 'resource_scrap', src: '/assets/placeholders/resource_scrap.svg' },
  { key: 'resource_power', src: '/assets/placeholders/resource_power.svg' },
  { key: 'resource_core', src: '/assets/placeholders/resource_core.svg' },
  { key: 'building_command_center', src: '/assets/placeholders/building_hq.svg' },
  { key: 'building_scrap_yard', src: '/assets/placeholders/building_generic.svg' },
  { key: 'building_generator', src: '/assets/placeholders/building_generator.svg' },
  { key: 'building_barracks', src: '/assets/placeholders/building_barracks.svg' },
  { key: 'building_garage', src: '/assets/placeholders/building_vehicle.svg' },
  { key: 'building_storage', src: '/assets/placeholders/building_storage.svg' },
  { key: 'building_auto_turret', src: '/assets/placeholders/building_turret.svg' },
  { key: 'unit_scavenger', src: '/assets/placeholders/unit_raider.svg' },
  { key: 'unit_rifleman', src: '/assets/placeholders/unit_ranged.svg' },
  { key: 'unit_shieldbot', src: '/assets/placeholders/unit_tank.svg' },
  { key: 'unit_rocket_buggy', src: '/assets/placeholders/unit_vehicle.svg' },
  { key: 'unit_repair_drone', src: '/assets/placeholders/unit_support.svg' }
];

export const getBuildingAssetKey = (buildingId: string): string => `building_${buildingId}`;

export const getUnitAssetKey = (unitId: string): string => `unit_${unitId}`;
