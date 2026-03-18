import { createRng, hashSeed } from '../../utils/rng';
import type { BalanceData } from '../../types/balance';
import type { GameState, ScoutTarget } from '../../types/game';

export const getUnitPower = (unitId: string, balance: BalanceData): number => {
  const unit = balance.unitMap[unitId];
  if (!unit) {
    return 0;
  }

  return unit.stats.hp * 0.2 + unit.stats.atk * 4 + unit.stats.def * 3 + unit.stats.carry;
};

export const getPlayerPower = (
  state: GameState,
  balance: BalanceData
): number =>
  Object.entries(state.roster).reduce(
    (total, [unitId, count]) => total + getUnitPower(unitId, balance) * count,
    0
  );

export const getSquadPower = (
  squad: Record<string, number>,
  balance: BalanceData
): number =>
  Object.entries(squad).reduce(
    (total, [unitId, count]) => total + getUnitPower(unitId, balance) * count,
    0
  );

export const getTemplatePower = (
  templateId: string,
  balance: BalanceData
): number => {
  const template = balance.enemies.find((enemy) => enemy.id === templateId);
  if (!template) {
    return 0;
  }

  const defenders = template.defenders.reduce(
    (total, entry) => total + getUnitPower(entry.unitId, balance) * entry.count,
    0
  );

  return defenders + template.hqHp * 0.05 + template.turrets * 70;
};

export const generateScoutTargets = (
  state: GameState,
  balance: BalanceData,
  now: number
): ScoutTarget[] => {
  const playerPower = Math.max(1, getPlayerPower(state, balance));
  const pool = balance.enemies.filter(
    (enemy) => enemy.zoneTier <= state.meta.zoneTier
  );
  const rng = createRng(hashSeed(`${now}_${playerPower}_${state.base.hqLevel}`));
  const targets: ScoutTarget[] = [];

  for (let index = 0; index < 3; index += 1) {
    const template = pool[Math.floor(rng() * pool.length)] ?? pool[0];
    const modifier = 0.9 + rng() * 0.2;
    const recommendedPower = Math.floor(getTemplatePower(template.id, balance) * modifier);

    targets.push({
      id: `${template.id}_${index}_${Math.floor(rng() * 9999)}`,
      templateId: template.id,
      name: template.name,
      difficulty: template.difficulty,
      recommendedPower,
      storedRewards: {
        scrap: Math.floor(template.storedRewards.scrap * modifier),
        power: Math.floor(template.storedRewards.power * modifier),
        core: Math.max(1, Math.floor(template.storedRewards.core * modifier))
      },
      zoneTier: template.zoneTier
    });
  }

  return targets;
};
