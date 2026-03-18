import buildings from './balance/buildings.json';
import resources from './balance/resources.json';
import units from './balance/units.json';
import enemies from './balance/enemyTemplates.json';
import type {
  BalanceData,
  BuildingDefinition,
  EnemyTemplate,
  GameConfig,
  UnitDefinition
} from '../types/balance';

const byId = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

export const loadBalance = (): BalanceData => {
  const config = resources as GameConfig;
  const buildingList = buildings as BuildingDefinition[];
  const unitList = units as UnitDefinition[];
  const enemyList = enemies as EnemyTemplate[];

  return {
    config,
    buildings: buildingList,
    units: unitList,
    enemies: enemyList,
    buildingMap: byId(buildingList),
    unitMap: byId(unitList)
  };
};
