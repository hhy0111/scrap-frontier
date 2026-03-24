import {
  COMMERCE_CAPACITOR_PLUGIN_NAME,
  COMMERCE_PLUGIN_METHODS,
  COMMERCE_WINDOW_BRIDGE_NAME
} from './commerceContract';
import {
  CapacitorScrapFrontierCommerce,
  isCapacitorCommercePluginAvailable,
  type CommerceCapabilitiesPayload,
  type CommerceDiagnosticsPayload,
  type NativeBridgeResult,
  type RestorePurchasesPayload,
  type ScrapFrontierCommercePlugin
} from './capacitorCommercePlugin';

type NativeCommerceBridge = {
  bridgeSource?: 'window-bridge' | 'capacitor-plugin';
  getCapabilities?: () => Promise<CommerceCapabilitiesPayload> | CommerceCapabilitiesPayload;
  purchaseOffer?: ScrapFrontierCommercePlugin['purchaseOffer'] extends (
    payload: infer Payload
  ) => infer Result
    ? (offerId: Payload extends { offerId: infer OfferId } ? OfferId : never) => Result
    : never;
  showRewardedPlacement?: ScrapFrontierCommercePlugin['showRewardedPlacement'] extends (
    payload: infer Payload
  ) => infer Result
    ? (
        placementId: Payload extends { placementId: infer PlacementId } ? PlacementId : never
      ) => Result
    : never;
  showBannerPlacement?: ScrapFrontierCommercePlugin['showBannerPlacement'] extends (
    payload: infer Payload
  ) => infer Result
    ? (
        placementId: Payload extends { placementId: infer PlacementId } ? PlacementId : never
      ) => Result
    : never;
  hideBannerPlacement?: ScrapFrontierCommercePlugin['hideBannerPlacement'] extends (
    ...args: never[]
  ) => infer Result
    ? () => Result
    : never;
  restorePurchases?: () => Promise<RestorePurchasesPayload> | RestorePurchasesPayload;
  getDiagnostics?: () => Promise<CommerceDiagnosticsPayload> | CommerceDiagnosticsPayload;
};

declare global {
  interface Window {
    androidBridge?: unknown;
    webkit?: {
      messageHandlers?: {
        bridge?: unknown;
      };
    };
    Capacitor?: {
      getPlatform?: () => string;
      Plugins?: {
        ScrapFrontierCommerce?: ScrapFrontierCommercePlugin;
      };
    };
  }
}

const hasConcretePluginSurface = (plugin: ScrapFrontierCommercePlugin): boolean =>
  'capabilities' in plugin ||
  COMMERCE_PLUGIN_METHODS.getCapabilities in plugin ||
  COMMERCE_PLUGIN_METHODS.purchaseOffer in plugin ||
  COMMERCE_PLUGIN_METHODS.showRewardedPlacement in plugin ||
  COMMERCE_PLUGIN_METHODS.showBannerPlacement in plugin ||
  COMMERCE_PLUGIN_METHODS.hideBannerPlacement in plugin ||
  COMMERCE_PLUGIN_METHODS.restorePurchases in plugin ||
  COMMERCE_PLUGIN_METHODS.getDiagnostics in plugin;

const isNativeCapacitorRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof window.androidBridge !== 'undefined') {
    return true;
  }

  if (typeof window.webkit !== 'undefined' && window.webkit?.messageHandlers?.bridge) {
    return true;
  }

  return typeof window.Capacitor?.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
};

const getCapacitorPlugin = (): ScrapFrontierCommercePlugin | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const windowPlugin = window.Capacitor?.Plugins?.[COMMERCE_CAPACITOR_PLUGIN_NAME] ?? null;

  if (windowPlugin && (isNativeCapacitorRuntime() || hasConcretePluginSurface(windowPlugin))) {
    return windowPlugin;
  }

  if (isCapacitorCommercePluginAvailable()) {
    return CapacitorScrapFrontierCommerce;
  }

  return null;
};

const getFallbackCapabilities = (
  plugin: ScrapFrontierCommercePlugin
): CommerceCapabilitiesPayload => ({
  purchases: Boolean(plugin[COMMERCE_PLUGIN_METHODS.purchaseOffer]),
  rewardedAds: Boolean(plugin[COMMERCE_PLUGIN_METHODS.showRewardedPlacement]),
  bannerAds: Boolean(plugin[COMMERCE_PLUGIN_METHODS.showBannerPlacement])
});

const getInitialCapabilities = (
  plugin: ScrapFrontierCommercePlugin
): CommerceCapabilitiesPayload =>
  plugin[COMMERCE_PLUGIN_METHODS.getCapabilities]
    ? {
        purchases: plugin.capabilities?.purchases ?? false,
        rewardedAds: plugin.capabilities?.rewardedAds ?? false,
        bannerAds: plugin.capabilities?.bannerAds ?? false
      }
    : {
        ...getFallbackCapabilities(plugin),
        ...plugin.capabilities
      };

export const installCapacitorCommerceBridge = (): void => {
  if (typeof window === 'undefined' || window[COMMERCE_WINDOW_BRIDGE_NAME]) {
    return;
  }

  const plugin = getCapacitorPlugin();

  if (!plugin) {
    return;
  }

  let cachedCapabilities: CommerceCapabilitiesPayload = getInitialCapabilities(plugin);

  if (plugin[COMMERCE_PLUGIN_METHODS.getCapabilities]) {
    const capabilityResult = plugin[COMMERCE_PLUGIN_METHODS.getCapabilities]!();

    if (capabilityResult && typeof capabilityResult === 'object' && 'then' in capabilityResult) {
      void capabilityResult.then((capabilities: CommerceCapabilitiesPayload) => {
        cachedCapabilities = {
          ...cachedCapabilities,
          ...capabilities
        };
      });
    } else if (capabilityResult) {
      cachedCapabilities = {
        ...cachedCapabilities,
        ...capabilityResult
      };
    }
  }

  window[COMMERCE_WINDOW_BRIDGE_NAME] = {
    bridgeSource: 'capacitor-plugin',
    getCapabilities: () => cachedCapabilities,
    purchaseOffer: plugin[COMMERCE_PLUGIN_METHODS.purchaseOffer]
      ? (offerId) => plugin[COMMERCE_PLUGIN_METHODS.purchaseOffer]!({ offerId })
      : undefined,
    showRewardedPlacement: plugin[COMMERCE_PLUGIN_METHODS.showRewardedPlacement]
      ? (placementId) =>
          plugin[COMMERCE_PLUGIN_METHODS.showRewardedPlacement]!({ placementId })
      : undefined,
    showBannerPlacement: plugin[COMMERCE_PLUGIN_METHODS.showBannerPlacement]
      ? (placementId) =>
          plugin[COMMERCE_PLUGIN_METHODS.showBannerPlacement]!({ placementId })
      : undefined,
    hideBannerPlacement: plugin[COMMERCE_PLUGIN_METHODS.hideBannerPlacement]
      ? () => plugin[COMMERCE_PLUGIN_METHODS.hideBannerPlacement]!()
      : undefined,
    restorePurchases: plugin[COMMERCE_PLUGIN_METHODS.restorePurchases]
      ? () => plugin[COMMERCE_PLUGIN_METHODS.restorePurchases]!()
      : undefined,
    getDiagnostics: plugin[COMMERCE_PLUGIN_METHODS.getDiagnostics]
      ? () => plugin[COMMERCE_PLUGIN_METHODS.getDiagnostics]!()
      : () => ({
          bridgeName: COMMERCE_WINDOW_BRIDGE_NAME,
          pluginName: COMMERCE_CAPACITOR_PLUGIN_NAME,
          source: 'capacitor-plugin'
        })
  };
};
