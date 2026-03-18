import { nextId } from '../../utils/ids';
import type { BalanceData } from '../../types/balance';
import type { GameState, ScoutTarget } from '../../types/game';
import type { EntryLane, RaidActor, RaidState } from '../../types/raid';

const createPlayerActor = (
  unitId: string,
  index: number,
  entryLane: EntryLane,
  balance: BalanceData
): RaidActor => {
  const unit = balance.unitMap[unitId];
  const laneYBase: Record<EntryLane, number> = {
    left: 150,
    mid: 250,
    right: 350
  };
  const row = index % 2;
  const col = Math.floor(index / 2);
  return {
    id: nextId('actor'),
    sourceId: unitId,
    label: unit.name,
    team: 'player',
    kind: 'unit',
    hp: unit.stats.hp,
    maxHp: unit.stats.hp,
    atk: unit.stats.atk,
    def: unit.stats.def,
    range: unit.stats.range,
    attackInterval: unit.stats.attackInterval,
    moveSpeed: unit.stats.moveSpeed,
    carry: unit.stats.carry,
    heal: unit.stats.heal ?? 0,
    buildingBonus: unit.stats.buildingBonus ?? 1,
    x: 130 + col * 35,
    y: laneYBase[entryLane] + row * 44,
    cooldownLeft: 0,
    alive: true
  };
};

const createEnemyUnit = (
  unitId: string,
  index: number,
  balance: BalanceData
): RaidActor => {
  const unit = balance.unitMap[unitId];
  return {
    id: nextId('actor'),
    sourceId: unitId,
    label: unit.name,
    team: 'enemy',
    kind: 'unit',
    hp: unit.stats.hp,
    maxHp: unit.stats.hp,
    atk: unit.stats.atk,
    def: unit.stats.def,
    range: unit.stats.range,
    attackInterval: unit.stats.attackInterval,
    moveSpeed: unit.stats.moveSpeed,
    carry: 0,
    heal: unit.stats.heal ?? 0,
    buildingBonus: unit.stats.buildingBonus ?? 1,
    x: 600 + index * 20,
    y: 170 + (index % 4) * 60,
    cooldownLeft: 0,
    alive: true
  };
};

const createEnemyTurret = (index: number, balance: BalanceData): RaidActor => {
  const turret = balance.buildingMap.auto_turret;
  return {
    id: nextId('actor'),
    sourceId: turret.id,
    label: turret.name,
    team: 'enemy',
    kind: 'turret',
    hp: turret.stats.hp,
    maxHp: turret.stats.hp,
    atk: turret.stats.attack ?? 0,
    def: turret.stats.defense ?? 0,
    range: turret.stats.range ?? 0,
    attackInterval: turret.stats.attackInterval ?? 1,
    moveSpeed: 0,
    carry: 0,
    heal: 0,
    buildingBonus: 1,
    x: 500 + index * 80,
    y: 120 + (index % 2) * 200,
    cooldownLeft: 0,
    alive: true
  };
};

const createEnemyHq = (target: ScoutTarget): RaidActor => ({
  id: nextId('actor'),
  sourceId: 'command_center',
  label: 'Enemy HQ',
  team: 'enemy',
  kind: 'hq',
  hp: target.recommendedPower * 3.4,
  maxHp: target.recommendedPower * 3.4,
  atk: 0,
  def: 6,
  range: 0,
  attackInterval: 99,
  moveSpeed: 0,
  carry: 0,
  heal: 0,
  buildingBonus: 1,
  x: 760,
  y: 240,
  cooldownLeft: 0,
  alive: true
});

const getSquadOrder = (balance: BalanceData): string[] =>
  [...balance.units]
    .sort((left, right) => {
      const leftScore = left.stats.hp * 0.2 + left.stats.atk * 4 + left.stats.def * 3;
      const rightScore = right.stats.hp * 0.2 + right.stats.atk * 4 + right.stats.def * 3;
      return rightScore - leftScore;
    })
    .map((unit) => unit.id);

export const buildRaidSquad = (
  state: GameState,
  balance: BalanceData
): Record<string, number> => {
  const squad: Record<string, number> = {};
  let remaining = balance.config.raidSquadSize;

  for (const unitId of getSquadOrder(balance)) {
    const count = state.roster[unitId] ?? 0;
    if (count <= 0) {
      continue;
    }

    const take = Math.min(count, remaining);
    squad[unitId] = take;
    remaining -= take;

    if (remaining <= 0) {
      break;
    }
  }

  return squad;
};

export const startRaid = (
  state: GameState,
  balance: BalanceData,
  target: ScoutTarget,
  selectedSquad: Record<string, number>,
  entryLane: EntryLane
): RaidState | null => {
  const selectedEntries = Object.entries(selectedSquad).filter(([, count]) => count > 0);

  if (selectedEntries.length === 0) {
    return null;
  }

  const playerActors: RaidActor[] = [];
  const enemyActors: RaidActor[] = [];
  let actorIndex = 0;

  for (const [unitId, count] of selectedEntries) {
    for (let amount = 0; amount < count; amount += 1) {
      playerActors.push(createPlayerActor(unitId, actorIndex, entryLane, balance));
      actorIndex += 1;
    }
  }

  const template = balance.enemies.find((enemy) => enemy.id === target.templateId);
  if (!template) {
    return null;
  }

  let defenderIndex = 0;
  for (const defender of template.defenders) {
    for (let amount = 0; amount < defender.count; amount += 1) {
      enemyActors.push(createEnemyUnit(defender.unitId, defenderIndex, balance));
      defenderIndex += 1;
    }
  }

  for (let turretIndex = 0; turretIndex < template.turrets; turretIndex += 1) {
    enemyActors.push(createEnemyTurret(turretIndex, balance));
  }

  enemyActors.push(createEnemyHq(target));

  return {
    id: nextId('raid'),
    timeSec: 120,
    result: 'running',
    targetId: target.id,
    entryLane,
    raidResultMultiplier: 1,
    rallyCooldownSec: 0,
    rallyActiveSec: 0,
    rewards: target.storedRewards,
    playerActors,
    enemyActors,
    selectedSquad
  };
};
