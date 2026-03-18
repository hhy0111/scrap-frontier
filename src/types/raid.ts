import type { ResourceAmount } from './balance';

export type ActorTeam = 'player' | 'enemy';

export type EntryLane = 'left' | 'mid' | 'right';

export type RaidActor = {
  id: string;
  sourceId: string;
  label: string;
  team: ActorTeam;
  kind: 'unit' | 'turret' | 'hq';
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  range: number;
  attackInterval: number;
  moveSpeed: number;
  carry: number;
  heal: number;
  buildingBonus: number;
  x: number;
  y: number;
  cooldownLeft: number;
  alive: boolean;
};

export type RaidState = {
  id: string;
  timeSec: number;
  result: 'running' | 'victory' | 'defeat' | 'retreat';
  targetId: string;
  entryLane: EntryLane;
  raidResultMultiplier: number;
  rallyCooldownSec: number;
  rallyActiveSec: number;
  rewards: ResourceAmount;
  playerActors: RaidActor[];
  enemyActors: RaidActor[];
  selectedSquad: Record<string, number>;
};

export type RaidResolution = {
  result: RaidState['result'];
  loot: ResourceAmount;
  survivors: Record<string, number>;
  lost: Record<string, number>;
  durationSec: number;
};
