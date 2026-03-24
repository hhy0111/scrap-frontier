import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BannerPlacementId, RewardedPlacementId, ShopOfferId } from '../types/game';
import { COMMERCE_CAPACITOR_PLUGIN_NAME } from './commerceContract';

export type NativeBridgeResult = {
  ok?: boolean;
  message?: string;
  reference?: string;
};

export type CommerceCapabilitiesPayload = {
  purchases?: boolean;
  rewardedAds?: boolean;
  bannerAds?: boolean;
};

export type RestorePurchasesPayload = {
  ok?: boolean;
  message?: string;
  reference?: string;
  restoredOffers?: ShopOfferId[];
  adsDisabled?: boolean;
};

export type CommerceDiagnosticsPayload = Record<string, string | boolean | number | null>;

export type ScrapFrontierCommercePlugin = {
  capabilities?: CommerceCapabilitiesPayload;
  getCapabilities?: () =>
    | Promise<CommerceCapabilitiesPayload>
    | CommerceCapabilitiesPayload;
  purchaseOffer?: (
    payload: { offerId: ShopOfferId }
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  showRewardedPlacement?: (
    payload: { placementId: RewardedPlacementId }
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  showBannerPlacement?: (
    payload: { placementId: BannerPlacementId }
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  hideBannerPlacement?: () =>
    | Promise<NativeBridgeResult>
    | NativeBridgeResult;
  restorePurchases?: () =>
    | Promise<RestorePurchasesPayload>
    | RestorePurchasesPayload;
  getDiagnostics?: () =>
    | Promise<CommerceDiagnosticsPayload>
    | CommerceDiagnosticsPayload;
};

export const CapacitorScrapFrontierCommerce =
  registerPlugin<ScrapFrontierCommercePlugin>(COMMERCE_CAPACITOR_PLUGIN_NAME);

export const isCapacitorCommercePluginAvailable = (): boolean =>
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.isPluginAvailable(COMMERCE_CAPACITOR_PLUGIN_NAME);
