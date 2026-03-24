import { createRng, hashSeed } from '../../utils/rng';
import type { BalanceData, EnemyTemplate } from '../../types/balance';
import {
  createInitialResearchLevels,
  getEffectiveUnitStats
} from '../meta/research';
import type { GameState, ResearchLevels, ScoutTarget } from '../../types/game';

const TARGET_COUNT = 3;

const TARGET_POWER_BANDS = [0.9, 1.02, 1.14];

const DIFFICULTY_POWER_BIAS: Record<EnemyTemplate['difficulty'], number> = {
  easy: -40,
  normal: 10,
  hard: 70,
  elite: 140
};

const DIFFICULTY_REWARD_BONUS: Record<EnemyTemplate['difficulty'], number> = {
  easy: 0,
  normal: 0.08,
  hard: 0.18,
  elite: 0.32
};

export const getUnitPower = (
  unitId: string,
  balance: BalanceData,
  researches: ResearchLevels = createInitialResearchLevels()
): number => {
  const stats = getEffectiveUnitStats(unitId, balance, researches);
  if (!stats) {
    return 0;
  }

  const offense = Math.max(stats.atk, stats.heal ?? 0);
  return stats.hp * 0.2 + offense * 4 + stats.def * 3 + stats.carry;
};

export const getPlayerPower = (
  state: GameState,
  balance: BalanceData
): number =>
  Object.entries(state.roster).reduce(
    (total, [unitId, count]) =>
      total + getUnitPower(unitId, balance, state.meta.researches) * count,
    0
  );

export const getSquadPower = (
  squad: Record<string, number>,
  balance: BalanceData,
  researches: ResearchLevels
): number =>
  Object.entries(squad).reduce(
    (total, [unitId, count]) =>
      total + getUnitPower(unitId, balance, researches) * count,
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

  return defenders + template.hqHp * 0.032 + template.turrets * 62;
};

export const getAutoRaidPower = (
  state: GameState,
  balance: BalanceData
): number => {
  const rankedUnits = Object.entries(state.roster)
    .filter(([, count]) => count > 0)
    .map(([unitId, count]) => ({
      unitId,
      count,
      power: getUnitPower(unitId, balance, state.meta.researches)
    }))
    .sort((left, right) => right.power - left.power);

  let total = 0;
  let remaining = balance.config.raidSquadSize;

  rankedUnits.forEach((entry) => {
    if (remaining <= 0) {
      return;
    }

    const take = Math.min(entry.count, remaining);
    total += entry.power * take;
    remaining -= take;
  });

  return Math.max(1, total);
};

const getZoneSelectionWeight = (templateZoneTier: number, currentZoneTier: number): number => {
  if (templateZoneTier === currentZoneTier) {
    return 1.45;
  }

  if (templateZoneTier === currentZoneTier - 1) {
    return 0.98;
  }

  return 0.32;
};

const getTemplateSelectionWeight = (
  template: EnemyTemplate,
  balance: BalanceData,
  targetPower: number,
  currentZoneTier: number
): number => {
  const templatePower =
    getTemplatePower(template.id, balance) + DIFFICULTY_POWER_BIAS[template.difficulty];
  const powerGap = Math.abs(templatePower - targetPower);
  return getZoneSelectionWeight(template.zoneTier, currentZoneTier) * (1 / (1 + powerGap / 150));
};

const pickWeightedTemplate = (
  templates: EnemyTemplate[],
  balance: BalanceData,
  targetPower: number,
  currentZoneTier: number,
  rng: () => number
): EnemyTemplate => {
  const weighted = templates.map((template) => ({
    template,
    weight: getTemplateSelectionWeight(template, balance, targetPower, currentZoneTier)
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return templates[Math.floor(rng() * templates.length)] ?? templates[0];
  }

  let roll = rng() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.template;
    }
  }

  return weighted.at(-1)?.template ?? templates[0];
};

export const generateScoutTargets = (
  state: GameState,
  balance: BalanceData,
  now: number
): ScoutTarget[] => {
  const pool = balance.enemies.filter(
    (enemy) => enemy.zoneTier <= state.meta.zoneTier
  );

  if (pool.length === 0) {
    return [];
  }

  const raidPower = getAutoRaidPower(state, balance);
  const rng = createRng(hashSeed(`${now}_${raidPower}_${state.base.hqLevel}_${state.meta.zoneTier}`));
  const targets: ScoutTarget[] = [];
  let availableTemplates = [...pool];

  for (let index = 0; index < TARGET_COUNT; index += 1) {
    const bandMultiplier = TARGET_POWER_BANDS[index] ?? (1 + index * 0.12);
    const desiredPower =
      raidPower * (bandMultiplier + rng() * 0.05) + state.meta.zoneTier * 18;
    const hasCurrentZoneTarget = targets.some(
      (target) => target.zoneTier === state.meta.zoneTier
    );
    const remainingSlots = TARGET_COUNT - index;
    const forcedCurrentZonePool =
      !hasCurrentZoneTarget && remainingSlots === 1
        ? availableTemplates.filter((template) => template.zoneTier === state.meta.zoneTier)
        : [];
    const templatePool =
      forcedCurrentZonePool.length > 0 ? forcedCurrentZonePool : availableTemplates;
    const template = pickWeightedTemplate(
      templatePool,
      balance,
      desiredPower,
      state.meta.zoneTier,
      rng
    );
    const templatePower = getTemplatePower(template.id, balance);
    const recommendationFactor = 0.94 + rng() * 0.14;
    const baselineRecommendation = templatePower * 0.68 + desiredPower * 0.32;
    const recommendedPower = Math.max(
      1,
      Math.floor(
        baselineRecommendation * recommendationFactor +
          template.zoneTier * 16 +
          DIFFICULTY_POWER_BIAS[template.difficulty] * 0.14
      )
    );
    const rewardModifier =
      1 +
      (template.zoneTier - 1) * 0.18 +
      DIFFICULTY_REWARD_BONUS[template.difficulty] +
      Math.max(0, recommendationFactor - 1) * 0.8;

    targets.push({
      id: `${template.id}_${index}_${Math.floor(rng() * 9999)}`,
      templateId: template.id,
      name: template.name,
      difficulty: template.difficulty,
      recommendedPower,
      storedRewards: {
        scrap: Math.floor(template.storedRewards.scrap * rewardModifier),
        power: Math.floor(template.storedRewards.power * rewardModifier),
        core: Math.max(1, Math.floor(template.storedRewards.core * rewardModifier))
      },
      zoneTier: template.zoneTier,
      turrets: template.turrets,
      defenderCount: template.defenders.reduce((total, entry) => total + entry.count, 0)
    });

    if (availableTemplates.length > TARGET_COUNT - index - 1) {
      availableTemplates = availableTemplates.filter((entry) => entry.id !== template.id);
    }
  }

  return targets.sort((left, right) => left.recommendedPower - right.recommendedPower);
};
