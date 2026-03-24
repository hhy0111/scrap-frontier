export const COMMERCE_WINDOW_BRIDGE_NAME = 'ScrapFrontierNativeCommerce';

export const COMMERCE_CAPACITOR_PLUGIN_NAME = 'ScrapFrontierCommerce';

export const COMMERCE_PLUGIN_METHODS = {
  getCapabilities: 'getCapabilities',
  purchaseOffer: 'purchaseOffer',
  showRewardedPlacement: 'showRewardedPlacement',
  showBannerPlacement: 'showBannerPlacement',
  hideBannerPlacement: 'hideBannerPlacement',
  restorePurchases: 'restorePurchases',
  getDiagnostics: 'getDiagnostics'
} as const;

export const COMMERCE_DEBUG_MODES = [
  'native-mock',
  'native-restore-owned',
  'native-no-purchases',
  'native-no-rewarded'
] as const;

export type CommerceDebugMode = (typeof COMMERCE_DEBUG_MODES)[number];
