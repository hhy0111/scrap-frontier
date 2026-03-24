import type { BannerPlacementId, RewardedPlacementId, ShopOfferId } from '../types/game';
import {
  COMMERCE_DEBUG_MODES,
  COMMERCE_WINDOW_BRIDGE_NAME,
  type CommerceDebugMode
} from './commerceContract';

export type CommerceProvider = 'web-mock' | 'native-bridge';

export type CommerceSource = 'web-mock' | 'window-bridge' | 'capacitor-plugin';

export type CommerceCapabilities = {
  provider: CommerceProvider;
  source: CommerceSource;
  nativeBridge: boolean;
  purchases: boolean;
  rewardedAds: boolean;
  bannerAds: boolean;
};

export type CommerceDiagnosticsValue = string | boolean | number | null;

export type CommerceDiagnostics = Record<string, CommerceDiagnosticsValue>;

export type CommerceResult = {
  ok: boolean;
  provider: CommerceProvider;
  source: CommerceSource;
  message: string;
  reference: string;
};

export type RestorePurchasesResult = CommerceResult & {
  restoredOffers: ShopOfferId[];
  adsDisabled: boolean;
};

type NativeBridgeResult = {
  ok?: boolean;
  message?: string;
  reference?: string;
};

type NativeCommerceBridge = {
  bridgeSource?: Extract<CommerceSource, 'window-bridge' | 'capacitor-plugin'>;
  getCapabilities?: () => Partial<Pick<CommerceCapabilities, 'purchases' | 'rewardedAds' | 'bannerAds'>>;
  purchaseOffer?: (
    offerId: ShopOfferId
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  showRewardedPlacement?: (
    placementId: RewardedPlacementId
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  showBannerPlacement?: (
    placementId: BannerPlacementId
  ) => Promise<NativeBridgeResult> | NativeBridgeResult;
  hideBannerPlacement?: () => Promise<NativeBridgeResult> | NativeBridgeResult;
  restorePurchases?: () => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
    restoredOffers?: ShopOfferId[];
    adsDisabled?: boolean;
  }> | {
    ok?: boolean;
    message?: string;
    reference?: string;
    restoredOffers?: ShopOfferId[];
    adsDisabled?: boolean;
  };
  getDiagnostics?: () => Promise<Record<string, string | boolean | number | null>> | Record<string, string | boolean | number | null>;
};

type NativeBridgeAdapter = NativeCommerceBridge & {
  source: Extract<CommerceSource, 'window-bridge' | 'capacitor-plugin'>;
};

declare global {
  interface Window {
    ScrapFrontierNativeCommerce?: NativeCommerceBridge;
    __SCRAP_FRONTIER_MOCK_DELAY_MS?: number;
    __SCRAP_FRONTIER_COMMERCE_DEBUG__?: CommerceDebugMode;
  }
}

const DEFAULT_MOCK_DELAY_MS = 180;

let diagnosticsBridgeHandle: NativeCommerceBridge | null = null;
let diagnosticsCache: CommerceDiagnostics | null = null;
let diagnosticsPending: Promise<CommerceDiagnostics> | null = null;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createDebugBridge = (
  mode: CommerceDebugMode
): NativeCommerceBridge => {
  let activeBannerPlacement: BannerPlacementId | null = null;

  return {
    bridgeSource: 'window-bridge',
    getCapabilities: () => ({
      purchases: mode !== 'native-no-purchases',
      rewardedAds: mode !== 'native-no-rewarded',
      bannerAds: true
    }),
    purchaseOffer:
      mode === 'native-no-purchases'
        ? undefined
        : async (offerId) => ({
            ok: true,
            message: `NATIVE MOCK PURCHASE ${offerId.toUpperCase()}`,
            reference: `native_mock_purchase_${offerId}`
          }),
    showRewardedPlacement:
      mode === 'native-no-rewarded'
        ? undefined
        : async (placementId) => ({
            ok: true,
            message: `NATIVE MOCK REWARDED ${placementId.toUpperCase()}`,
            reference: `native_mock_rewarded_${placementId}`
          }),
    showBannerPlacement: async (placementId) => {
      activeBannerPlacement = placementId;
      return {
        ok: true,
        message: `NATIVE MOCK BANNER ${placementId.toUpperCase()}`,
        reference: `native_mock_banner_show_${placementId}`
      };
    },
    hideBannerPlacement: async () => {
      activeBannerPlacement = null;
      return {
        ok: true,
        message: 'NATIVE MOCK BANNER HIDDEN',
        reference: 'native_mock_banner_hide'
      };
    },
    restorePurchases: async () => ({
      ok: true,
      message: mode === 'native-restore-owned' ? 'NATIVE RESTORE OWNED' : 'NATIVE MOCK RESTORE',
      reference: 'native_mock_restore',
      restoredOffers:
        mode === 'native-restore-owned'
          ? ['starter_pack', 'commander_pack', 'monthly_pass']
          : [],
      adsDisabled: mode === 'native-restore-owned'
    }),
    getDiagnostics: () => ({
      provider: 'native-bridge',
      source: 'debug-window-bridge',
      backend: 'debug-window-bridge',
      mode,
      status: 'ready',
      bannerVisible: activeBannerPlacement !== null,
      activeBannerPlacement
    })
  };
};

export const installDebugCommerceBridgeFromUrl = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const mode = new URLSearchParams(window.location.search).get('commerce');

  if (!mode || !(COMMERCE_DEBUG_MODES as readonly string[]).includes(mode)) {
    return;
  }

  const debugMode = mode as CommerceDebugMode;
  window.__SCRAP_FRONTIER_COMMERCE_DEBUG__ = debugMode;

  if (!window[COMMERCE_WINDOW_BRIDGE_NAME]) {
    window[COMMERCE_WINDOW_BRIDGE_NAME] = createDebugBridge(debugMode);
  }
};

const getNativeBridge = (): NativeBridgeAdapter | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window[COMMERCE_WINDOW_BRIDGE_NAME]) {
    return {
      source: window[COMMERCE_WINDOW_BRIDGE_NAME]?.bridgeSource ?? 'window-bridge',
      ...window[COMMERCE_WINDOW_BRIDGE_NAME]
    };
  }

  return null;
};

const getNativeBridgeHandle = (): NativeCommerceBridge | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window[COMMERCE_WINDOW_BRIDGE_NAME] ?? null;
};

const getMockDelayMs = (): number =>
  typeof window !== 'undefined' && typeof window.__SCRAP_FRONTIER_MOCK_DELAY_MS === 'number'
    ? window.__SCRAP_FRONTIER_MOCK_DELAY_MS
    : DEFAULT_MOCK_DELAY_MS;

const normalizeNativeResult = (
  result: NativeBridgeResult | null | undefined,
  provider: CommerceProvider,
  source: CommerceSource,
  fallbackReference: string,
  fallbackMessage: string
): CommerceResult => ({
  ok: result?.ok !== false,
  provider,
  source,
  message: result?.message ?? fallbackMessage,
  reference: result?.reference ?? fallbackReference
});

const buildUnsupportedResult = (
  source: Extract<CommerceSource, 'window-bridge' | 'capacitor-plugin'>,
  action: 'purchase' | 'rewarded' | 'banner',
  id: string
): CommerceResult => ({
  ok: false,
  provider: 'native-bridge',
  source,
  message: `NATIVE ${action.toUpperCase()} UNAVAILABLE`,
  reference: `native_unavailable_${action}_${id}`
});

const buildUnsupportedRestoreResult = (
  source: Extract<CommerceSource, 'window-bridge' | 'capacitor-plugin'>
): RestorePurchasesResult => ({
  ok: false,
  provider: 'native-bridge',
  source,
  message: 'NATIVE RESTORE UNAVAILABLE',
  reference: 'native_unavailable_restore',
  restoredOffers: [],
  adsDisabled: false
});

const getDefaultDiagnostics = (): CommerceDiagnostics => ({
  provider: 'web-mock',
  source: 'web-mock',
  backend: 'web-mock',
  status: 'ready',
  bannerVisible: false,
  activeBannerPlacement: null
});

export const getCachedCommerceDiagnostics = (): CommerceDiagnostics => {
  const bridge = getNativeBridge();
  const handle = getNativeBridgeHandle();

  if (!bridge || !handle) {
    return getDefaultDiagnostics();
  }

  if (diagnosticsBridgeHandle === handle && diagnosticsCache) {
    return diagnosticsCache;
  }

  return {
    provider: 'native-bridge',
    source: bridge.source,
    backend: bridge.source,
    status:
      diagnosticsBridgeHandle === handle && diagnosticsPending
        ? 'loading'
        : bridge.getDiagnostics
          ? 'unfetched'
          : 'unavailable'
  };
};

export const refreshCommerceDiagnostics = async (): Promise<CommerceDiagnostics> => {
  const bridge = getNativeBridge();
  const handle = getNativeBridgeHandle();

  if (!bridge || !handle) {
    diagnosticsBridgeHandle = null;
    diagnosticsCache = getDefaultDiagnostics();
    diagnosticsPending = null;
    return diagnosticsCache;
  }

  if (diagnosticsBridgeHandle === handle && diagnosticsCache) {
    return diagnosticsCache;
  }

  if (diagnosticsBridgeHandle === handle && diagnosticsPending) {
    return diagnosticsPending;
  }

  if (!bridge.getDiagnostics) {
    diagnosticsBridgeHandle = handle;
    diagnosticsCache = {
      provider: 'native-bridge',
      source: bridge.source,
      backend: bridge.source,
      status: 'unavailable'
    };
    diagnosticsPending = null;
    return diagnosticsCache;
  }

  diagnosticsBridgeHandle = handle;
  diagnosticsPending = Promise.resolve(bridge.getDiagnostics())
    .then((result) => {
      diagnosticsCache = {
        provider: 'native-bridge',
        source: bridge.source,
        status: 'ready',
        ...result
      };
      diagnosticsPending = null;
      return diagnosticsCache;
    })
    .catch((error: unknown) => {
      diagnosticsCache = {
        provider: 'native-bridge',
        source: bridge.source,
        backend: bridge.source,
        status: 'error',
        error: error instanceof Error ? error.message : 'unknown-error'
      };
      diagnosticsPending = null;
      return diagnosticsCache;
    });

  return diagnosticsPending;
};

export const getCommerceCapabilities = (): CommerceCapabilities => {
  const bridge = getNativeBridge();

  if (!bridge) {
    return {
      provider: 'web-mock',
      source: 'web-mock',
      nativeBridge: false,
      purchases: true,
      rewardedAds: true,
      bannerAds: false
    };
  }

  const bridgeCapabilities = bridge.getCapabilities?.() ?? {};
  const purchases =
    bridgeCapabilities.purchases ?? typeof bridge.purchaseOffer === 'function';
  const rewardedAds =
    bridgeCapabilities.rewardedAds ?? typeof bridge.showRewardedPlacement === 'function';
  const bannerAds =
    bridgeCapabilities.bannerAds ?? typeof bridge.showBannerPlacement === 'function';

  return {
    provider: 'native-bridge',
    source: bridge.source,
    nativeBridge: true,
    purchases,
    rewardedAds,
    bannerAds
  };
};

export const purchaseOfferThroughPlatform = async (
  offerId: ShopOfferId
): Promise<CommerceResult> => {
  const bridge = getNativeBridge();

  if (bridge?.purchaseOffer) {
    const result = await bridge.purchaseOffer(offerId);
    return normalizeNativeResult(
      result,
      'native-bridge',
      bridge.source,
      `native_purchase_${offerId}`,
      `PURCHASE ${offerId.toUpperCase()}`
    );
  }

  if (bridge) {
    return buildUnsupportedResult(bridge.source, 'purchase', offerId);
  }

  await wait(getMockDelayMs());
  return {
    ok: true,
    provider: 'web-mock',
    source: 'web-mock',
    message: `WEB MOCK PURCHASE ${offerId.toUpperCase()}`,
    reference: `mock_purchase_${offerId}`
  };
};

export const showRewardedPlacementThroughPlatform = async (
  placementId: RewardedPlacementId
): Promise<CommerceResult> => {
  const bridge = getNativeBridge();

  if (bridge?.showRewardedPlacement) {
    const result = await bridge.showRewardedPlacement(placementId);
    return normalizeNativeResult(
      result,
      'native-bridge',
      bridge.source,
      `native_rewarded_${placementId}`,
      `REWARDED ${placementId.toUpperCase()}`
    );
  }

  if (bridge) {
    return buildUnsupportedResult(bridge.source, 'rewarded', placementId);
  }

  await wait(getMockDelayMs());
  return {
    ok: true,
    provider: 'web-mock',
    source: 'web-mock',
    message: `WEB MOCK REWARDED ${placementId.toUpperCase()}`,
    reference: `mock_rewarded_${placementId}`
  };
};

export const restorePurchasesThroughPlatform = async (): Promise<RestorePurchasesResult> => {
  const bridge = getNativeBridge();

  if (bridge?.restorePurchases) {
    const result = await bridge.restorePurchases();
    return {
      ok: result?.ok !== false,
      provider: 'native-bridge',
      source: bridge.source,
      message: result?.message ?? 'RESTORE PURCHASES',
      reference: result?.reference ?? 'native_restore_purchases',
      restoredOffers: result?.restoredOffers ?? [],
      adsDisabled: result?.adsDisabled ?? false
    };
  }

  if (bridge) {
    return buildUnsupportedRestoreResult(bridge.source);
  }

  await wait(getMockDelayMs());
  return {
    ok: true,
    provider: 'web-mock',
    source: 'web-mock',
    message: 'WEB MOCK RESTORE NONE',
    reference: 'mock_restore_purchases',
    restoredOffers: [],
    adsDisabled: false
  };
};

export const showBannerPlacementThroughPlatform = async (
  placementId: BannerPlacementId
): Promise<CommerceResult> => {
  const bridge = getNativeBridge();

  if (bridge?.showBannerPlacement) {
    const result = await bridge.showBannerPlacement(placementId);
    return normalizeNativeResult(
      result,
      'native-bridge',
      bridge.source,
      `native_banner_show_${placementId}`,
      `BANNER ${placementId.toUpperCase()}`
    );
  }

  if (bridge) {
    return buildUnsupportedResult(bridge.source, 'banner', placementId);
  }

  return {
    ok: true,
    provider: 'web-mock',
    source: 'web-mock',
    message: `WEB MOCK BANNER ${placementId.toUpperCase()} SKIPPED`,
    reference: `mock_banner_show_${placementId}`
  };
};

export const hideBannerPlacementThroughPlatform = async (): Promise<CommerceResult> => {
  const bridge = getNativeBridge();

  if (bridge?.hideBannerPlacement) {
    const result = await bridge.hideBannerPlacement();
    return normalizeNativeResult(
      result,
      'native-bridge',
      bridge.source,
      'native_banner_hide',
      'BANNER HIDDEN'
    );
  }

  if (bridge) {
    return buildUnsupportedResult(bridge.source, 'banner', 'hide');
  }

  return {
    ok: true,
    provider: 'web-mock',
    source: 'web-mock',
    message: 'WEB MOCK BANNER HIDDEN',
    reference: 'mock_banner_hide'
  };
};
