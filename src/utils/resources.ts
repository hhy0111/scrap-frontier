import { clamp } from './clamp';
import type { ResourceAmount, ResourceAmountInput, ResourceKey } from '../types/balance';

export const emptyResources = (): ResourceAmount => ({
  scrap: 0,
  power: 0,
  core: 0
});

export const cloneResources = (input: ResourceAmount): ResourceAmount => ({
  scrap: input.scrap,
  power: input.power,
  core: input.core
});

export const addResources = (
  base: ResourceAmount,
  delta: ResourceAmountInput
): ResourceAmount => ({
  scrap: base.scrap + (delta.scrap ?? 0),
  power: base.power + (delta.power ?? 0),
  core: base.core + (delta.core ?? 0)
});

export const scaleResources = (
  values: ResourceAmountInput,
  scale: number
): ResourceAmount => ({
  scrap: Math.floor((values.scrap ?? 0) * scale),
  power: Math.floor((values.power ?? 0) * scale),
  core: Math.floor((values.core ?? 0) * scale)
});

export const canAfford = (
  wallet: ResourceAmount,
  cost: ResourceAmountInput
): boolean =>
  wallet.scrap >= (cost.scrap ?? 0) &&
  wallet.power >= (cost.power ?? 0) &&
  wallet.core >= (cost.core ?? 0);

export const subtractResources = (
  wallet: ResourceAmount,
  cost: ResourceAmountInput
): ResourceAmount => ({
  scrap: wallet.scrap - (cost.scrap ?? 0),
  power: wallet.power - (cost.power ?? 0),
  core: wallet.core - (cost.core ?? 0)
});

export const clampResources = (
  wallet: ResourceAmount,
  caps: ResourceAmount
): ResourceAmount => ({
  scrap: clamp(wallet.scrap, 0, caps.scrap),
  power: clamp(wallet.power, 0, caps.power),
  core: clamp(wallet.core, 0, caps.core)
});

export const sumResources = (wallet: ResourceAmount): number =>
  wallet.scrap + wallet.power + wallet.core;

export const forEachResource = (
  callback: (key: ResourceKey) => void
): void => {
  (['scrap', 'power', 'core'] as const).forEach(callback);
};
