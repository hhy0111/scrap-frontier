export type AssetEntry = {
  key: string;
  src: string;
};

export const ASSET_MANIFEST: AssetEntry[] = [
  { key: 'resource_scrap', src: '/assets/generated/ui/ui_icon_scrap.png' },
  { key: 'resource_power', src: '/assets/generated/ui/ui_icon_power.png' },
  { key: 'resource_core', src: '/assets/generated/ui/ui_icon_core.png' },
  { key: 'ui_badge_daily_mission', src: '/assets/generated/ui/ui_badge_daily_mission.png' },
  { key: 'ui_icon_alert', src: '/assets/generated/ui/ui_icon_alert.png' },
  { key: 'ui_icon_raid', src: '/assets/generated/ui/ui_icon_raid.png' },
  { key: 'ui_icon_scout', src: '/assets/generated/ui/ui_icon_scout.png' },
  { key: 'ui_scout_card', src: '/assets/generated/ui/ui_scout_card.png' },
  { key: 'ui_shop_pack_card', src: '/assets/generated/ui/ui_shop_pack_card.png' },
  { key: 'ui_button_rewarded_ad', src: '/assets/generated/ui/ui_button_rewarded_ad.png' },
  { key: 'ui_banner_victory', src: '/assets/generated/ui/ui_banner_victory.png' },
  { key: 'ui_banner_defeat', src: '/assets/generated/ui/ui_banner_defeat.png' },
  { key: 'building_command_center', src: '/assets/generated/buildings/building_command_center.png' },
  { key: 'building_command_center_damaged', src: '/assets/generated/buildings/building_command_center_damaged.png' },
  { key: 'building_scrap_yard', src: '/assets/generated/buildings/building_scrap_yard.png' },
  { key: 'building_generator', src: '/assets/generated/buildings/building_generator.png' },
  { key: 'building_barracks', src: '/assets/generated/buildings/building_barracks.png' },
  { key: 'building_garage', src: '/assets/generated/buildings/building_garage.png' },
  { key: 'building_storage', src: '/assets/generated/buildings/building_storage.png' },
  { key: 'building_auto_turret', src: '/assets/generated/buildings/building_auto_turret.png' },
  { key: 'unit_scavenger', src: '/assets/generated/units/unit_scavenger.png' },
  { key: 'unit_rifleman', src: '/assets/generated/units/unit_rifleman.png' },
  { key: 'unit_shieldbot', src: '/assets/generated/units/unit_shieldbot.png' },
  { key: 'unit_rocket_buggy', src: '/assets/generated/units/unit_rocket_buggy.png' },
  { key: 'unit_repair_drone', src: '/assets/generated/units/unit_repair_drone.png' },
  { key: 'tile_wasteland_ground', src: '/assets/generated/tiles/tile_wasteland_ground.png' },
  { key: 'tile_metal_floor', src: '/assets/generated/tiles/tile_metal_floor.png' },
  { key: 'prop_wall_straight', src: '/assets/generated/props/prop_wall_straight.png' },
  { key: 'prop_wall_corner', src: '/assets/generated/props/prop_wall_corner.png' },
  { key: 'prop_debris_cluster', src: '/assets/generated/props/prop_debris_cluster.png' },
  { key: 'prop_fuel_barrels', src: '/assets/generated/props/prop_fuel_barrels.png' },
  { key: 'prop_resource_crate', src: '/assets/generated/props/prop_resource_crate.png' },
  { key: 'prop_radar_antenna', src: '/assets/generated/props/prop_radar_antenna.png' },
  { key: 'fx_muzzle_flash_small', src: '/assets/generated/fx/fx_muzzle_flash_small.png' },
  { key: 'fx_bullet_impact', src: '/assets/generated/fx/fx_bullet_impact.png' },
  { key: 'fx_explosion_medium', src: '/assets/generated/fx/fx_explosion_medium.png' },
  { key: 'fx_repair_pulse', src: '/assets/generated/fx/fx_repair_pulse.png' },
  { key: 'fx_rocket_launch', src: '/assets/generated/fx/fx_rocket_launch.png' },
  { key: 'fx_target_marker', src: '/assets/generated/fx/fx_target_marker.png' },
  { key: 'fx_destroyed_smoke', src: '/assets/generated/fx/fx_destroyed_smoke.png' },
  { key: 'meta_loading_art', src: '/assets/generated/meta/meta_loading_art.png' },
  { key: 'meta_store_capsule_bg', src: '/assets/generated/meta/meta_store_capsule_bg.png' },
  { key: 'meta_app_icon', src: '/assets/generated/meta/meta_app_icon.png' }
];

export const getBuildingAssetKey = (buildingId: string): string => `building_${buildingId}`;

export const getUnitAssetKey = (unitId: string): string => `unit_${unitId}`;
