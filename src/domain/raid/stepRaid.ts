import { addResources, emptyResources, sumResources } from '../../utils/resources';
import type { RaidActor, RaidResolution, RaidState } from '../../types/raid';

const isAlive = (actor: RaidActor): boolean => actor.alive && actor.hp > 0;

const getDistance = (left: RaidActor, right: RaidActor): number =>
  Math.hypot(left.x - right.x, left.y - right.y);

const chooseTarget = (actor: RaidActor, enemies: RaidActor[]): RaidActor | null => {
  const aliveEnemies = enemies.filter(isAlive);
  if (aliveEnemies.length === 0) {
    return null;
  }

  const units = aliveEnemies.filter((entry) => entry.kind === 'unit');
  const pool = units.length > 0 ? units : aliveEnemies;

  return pool.reduce((best, candidate) => {
    if (!best) {
      return candidate;
    }
    return getDistance(actor, candidate) < getDistance(actor, best) ? candidate : best;
  }, null as RaidActor | null);
};

const chooseHealTarget = (actor: RaidActor, allies: RaidActor[]): RaidActor | null => {
  const candidates = allies.filter(
    (ally) => isAlive(ally) && ally.hp < ally.maxHp && ally.id !== actor.id
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) => {
    if (!best) {
      return candidate;
    }
    return candidate.hp / candidate.maxHp < best.hp / best.maxHp ? candidate : best;
  }, null as RaidActor | null);
};

const applyDamage = (attacker: RaidActor, defender: RaidActor): void => {
  const typeBonus = defender.kind === 'unit' ? 1 : attacker.buildingBonus;
  const damage = Math.max(1, attacker.atk * typeBonus - defender.def * 0.6);
  defender.hp -= damage;
  defender.alive = defender.hp > 0;
};

const moveToward = (actor: RaidActor, target: RaidActor, dt: number): void => {
  if (actor.moveSpeed <= 0) {
    return;
  }

  const distance = getDistance(actor, target);
  if (distance <= actor.range || distance === 0) {
    return;
  }

  const step = Math.min(distance - actor.range, actor.moveSpeed * dt);
  const dx = (target.x - actor.x) / distance;
  const dy = (target.y - actor.y) / distance;
  actor.x += dx * step;
  actor.y += dy * step;
};

const stepSide = (
  attackers: RaidActor[],
  defenders: RaidActor[],
  dt: number,
  rallyActive: boolean
): void => {
  for (const actor of attackers) {
    if (!isAlive(actor)) {
      continue;
    }

    actor.cooldownLeft = Math.max(0, actor.cooldownLeft - dt);

    if (actor.heal > 0) {
      const healTarget = chooseHealTarget(actor, attackers);
      if (healTarget && getDistance(actor, healTarget) <= actor.range) {
        if (actor.cooldownLeft <= 0) {
          healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + actor.heal);
          actor.cooldownLeft = actor.attackInterval;
        } else {
          moveToward(actor, healTarget, dt);
        }
        continue;
      }
    }

    const target = chooseTarget(actor, defenders);
    if (!target) {
      continue;
    }

    if (getDistance(actor, target) <= actor.range) {
      if (actor.cooldownLeft <= 0) {
        applyDamage(actor, target);
        actor.cooldownLeft = rallyActive ? actor.attackInterval / 1.25 : actor.attackInterval;
      }
    } else {
      moveToward(actor, target, rallyActive ? dt * 1.15 : dt);
    }
  }
};

const getSurvivorMap = (actors: RaidActor[]): Record<string, number> => {
  const result: Record<string, number> = {};

  for (const actor of actors) {
    if (actor.kind !== 'unit' || !isAlive(actor)) {
      continue;
    }
    result[actor.sourceId] = (result[actor.sourceId] ?? 0) + 1;
  }

  return result;
};

export const stepRaid = (state: RaidState, dt: number): RaidState => {
  if (state.result !== 'running') {
    return state;
  }

  const next = structuredClone(state) as RaidState;
  const seconds = dt / 1000;
  next.rallyCooldownSec = Math.max(0, next.rallyCooldownSec - seconds);
  next.rallyActiveSec = Math.max(0, next.rallyActiveSec - seconds);

  stepSide(next.playerActors, next.enemyActors, seconds, next.rallyActiveSec > 0);
  stepSide(next.enemyActors, next.playerActors, seconds, false);

  next.timeSec = Math.max(0, next.timeSec - seconds);

  const playerAlive = next.playerActors.some(isAlive);
  const enemyHqAlive = next.enemyActors.some(
    (actor) => actor.kind === 'hq' && isAlive(actor)
  );

  if (!playerAlive) {
    next.result = 'defeat';
  } else if (!enemyHqAlive) {
    next.result = 'victory';
  } else if (next.timeSec <= 0) {
    next.result = 'defeat';
  }

  return next;
};

export const triggerRally = (state: RaidState): RaidState => {
  if (state.result !== 'running' || state.rallyCooldownSec > 0) {
    return state;
  }

  return {
    ...state,
    rallyCooldownSec: 20,
    rallyActiveSec: 5
  };
};

export const forceRetreat = (state: RaidState): RaidState => ({
  ...state,
  result: state.result === 'running' ? 'retreat' : state.result,
  raidResultMultiplier: 0.5
});

export const resolveRaid = (state: RaidState): RaidResolution => {
  const survivors = getSurvivorMap(state.playerActors);
  const lost: Record<string, number> = {};

  for (const [unitId, count] of Object.entries(state.selectedSquad)) {
    lost[unitId] = count - (survivors[unitId] ?? 0);
  }

  let loot = emptyResources();

  if (state.result === 'victory' || state.result === 'retreat') {
    const carryCap = state.playerActors
      .filter((actor) => actor.kind === 'unit' && isAlive(actor))
      .reduce((total, actor) => total + actor.carry, 0);
    const rewardTotal = Math.max(1, sumResources(state.rewards));
    const ratio = Math.min(1, carryCap / rewardTotal) * state.raidResultMultiplier;

    loot = addResources(loot, {
      scrap: Math.floor(state.rewards.scrap * ratio),
      power: Math.floor(state.rewards.power * ratio),
      core: Math.floor(state.rewards.core * ratio)
    });
  }

  return {
    result: state.result,
    loot,
    survivors,
    lost,
    durationSec: Math.floor(120 - state.timeSec)
  };
};
