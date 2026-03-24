import { afterEach, describe, expect, it } from 'vitest';
import {
  COMMERCE_CAPACITOR_PLUGIN_NAME,
  COMMERCE_WINDOW_BRIDGE_NAME
} from '../src/platform/commerceContract';
import { installCapacitorCommerceBridge } from '../src/platform/capacitorCommerceBridge';
import {
  getCachedCommerceDiagnostics,
  getCommerceCapabilities,
  hideBannerPlacementThroughPlatform,
  installDebugCommerceBridgeFromUrl,
  purchaseOfferThroughPlatform,
  refreshCommerceDiagnostics,
  restorePurchasesThroughPlatform,
  showBannerPlacementThroughPlatform,
  showRewardedPlacementThroughPlatform
} from '../src/platform/commerce';

const setWindowMock = (value: Record<string, unknown>) => {
  Object.defineProperty(globalThis, 'window', {
    value,
    configurable: true,
    writable: true
  });
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('commerce platform adapter', () => {
  it('falls back to the web mock when no native bridge exists', async () => {
    setWindowMock({
      __SCRAP_FRONTIER_MOCK_DELAY_MS: 0
    });

    const capabilities = getCommerceCapabilities();
    const diagnostics = getCachedCommerceDiagnostics();
    const result = await purchaseOfferThroughPlatform('starter_pack');

    expect(capabilities).toMatchObject({
      provider: 'web-mock',
      source: 'web-mock',
      nativeBridge: false,
      purchases: true,
      rewardedAds: true,
      bannerAds: false
    });
    expect(result).toMatchObject({
      ok: true,
      provider: 'web-mock',
      source: 'web-mock'
    });
    expect(diagnostics).toMatchObject({
      provider: 'web-mock',
      source: 'web-mock',
      backend: 'web-mock',
      status: 'ready'
    });
  });

  it('ignores an unimplemented registered Capacitor proxy on web', async () => {
    setWindowMock({
      Capacitor: {
        Plugins: {
          [COMMERCE_CAPACITOR_PLUGIN_NAME]: {}
        }
      },
      __SCRAP_FRONTIER_MOCK_DELAY_MS: 0
    });

    installCapacitorCommerceBridge();
    const capabilities = getCommerceCapabilities();
    const result = await purchaseOfferThroughPlatform('starter_pack');

    expect(capabilities).toMatchObject({
      provider: 'web-mock',
      source: 'web-mock',
      nativeBridge: false
    });
    expect(result).toMatchObject({
      ok: true,
      provider: 'web-mock',
      source: 'web-mock'
    });
  });

  it('uses the Capacitor plugin when it is available', async () => {
    setWindowMock({
      Capacitor: {
        Plugins: {
          [COMMERCE_CAPACITOR_PLUGIN_NAME]: {
            getCapabilities: () => ({
              purchases: true,
              rewardedAds: false,
              bannerAds: true
            }),
            purchaseOffer: async ({ offerId }: { offerId: string }) => ({
              ok: true,
              message: `CAP PURCHASE ${offerId}`,
              reference: `cap_${offerId}`
            }),
            showBannerPlacement: async ({ placementId }: { placementId: string }) => ({
              ok: true,
              message: `CAP BANNER ${placementId}`,
              reference: `cap_banner_${placementId}`
            }),
            hideBannerPlacement: async () => ({
              ok: true,
              message: 'CAP BANNER HIDE',
              reference: 'cap_banner_hide'
            }),
            restorePurchases: async () => ({
              ok: true,
              message: 'CAP RESTORE',
              reference: 'cap_restore',
              restoredOffers: ['starter_pack', 'monthly_pass'],
              adsDisabled: true
            })
          }
        }
      }
    });

    installCapacitorCommerceBridge();
    const capabilities = getCommerceCapabilities();
    const purchase = await purchaseOfferThroughPlatform('starter_pack');
    const rewarded = await showRewardedPlacementThroughPlatform('salvage_drop');
    const banner = await showBannerPlacementThroughPlatform('base_lobby');
    const hideBanner = await hideBannerPlacementThroughPlatform();
    const restored = await restorePurchasesThroughPlatform();

    expect(capabilities).toMatchObject({
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      nativeBridge: true,
      purchases: true,
      rewardedAds: false,
      bannerAds: true
    });
    expect(purchase).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      reference: 'cap_starter_pack'
    });
    expect(restored).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      reference: 'cap_restore',
      restoredOffers: ['starter_pack', 'monthly_pass'],
      adsDisabled: true
    });
    expect(banner).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      reference: 'cap_banner_base_lobby'
    });
    expect(hideBanner).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      reference: 'cap_banner_hide'
    });
    expect(rewarded).toMatchObject({
      ok: false,
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      message: 'NATIVE REWARDED UNAVAILABLE'
    });
  });

  it('does not assume native capabilities before an async capability probe resolves', () => {
    setWindowMock({
      Capacitor: {
        Plugins: {
          [COMMERCE_CAPACITOR_PLUGIN_NAME]: {
            getCapabilities: async () => ({
              purchases: false,
              rewardedAds: false,
              bannerAds: false
            }),
            purchaseOffer: async ({ offerId }: { offerId: string }) => ({
              ok: true,
              message: `CAP PURCHASE ${offerId}`,
              reference: `cap_${offerId}`
            }),
            showRewardedPlacement: async ({ placementId }: { placementId: string }) => ({
              ok: true,
              message: `CAP REWARDED ${placementId}`,
              reference: `cap_rewarded_${placementId}`
            })
          }
        }
      }
    });

    installCapacitorCommerceBridge();
    const capabilities = getCommerceCapabilities();

    expect(capabilities).toMatchObject({
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      nativeBridge: true,
      purchases: false,
      rewardedAds: false,
      bannerAds: false
    });
  });

  it('loads and caches native diagnostics from the bridge', async () => {
    setWindowMock({
      Capacitor: {
        Plugins: {
          [COMMERCE_CAPACITOR_PLUGIN_NAME]: {
            getCapabilities: () => ({
              purchases: false,
              rewardedAds: false
            }),
            getDiagnostics: async () => ({
              backend: 'play-services',
              mode: 'play-services',
      status: 'ready',
      missingOfferMappings: 'starter_pack,monthly_pass',
      missingRewardedMappings: 'salvage_drop',
      activeBannerPlacement: 'base_lobby',
      bannerVisible: true
    })
          }
        }
      }
    });

    installCapacitorCommerceBridge();
    const initial = getCachedCommerceDiagnostics();
    const resolved = await refreshCommerceDiagnostics();
    const cached = getCachedCommerceDiagnostics();

    expect(initial).toMatchObject({
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      status: 'unfetched'
    });
    expect(resolved).toMatchObject({
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      backend: 'play-services',
      mode: 'play-services',
      status: 'ready',
      missingOfferMappings: 'starter_pack,monthly_pass',
      missingRewardedMappings: 'salvage_drop',
      activeBannerPlacement: 'base_lobby',
      bannerVisible: true
    });
    expect(cached).toMatchObject({
      provider: 'native-bridge',
      source: 'capacitor-plugin',
      backend: 'play-services',
      status: 'ready'
    });
  });

  it('installs the debug native bridge from the url query', async () => {
    setWindowMock({
      location: {
        search: '?commerce=native-restore-owned'
      },
      [COMMERCE_WINDOW_BRIDGE_NAME]: undefined
    });

    installDebugCommerceBridgeFromUrl();
    const capabilities = getCommerceCapabilities();
    const rewarded = await showRewardedPlacementThroughPlatform('scout_ping');
    const restored = await restorePurchasesThroughPlatform();

    expect(capabilities).toMatchObject({
      provider: 'native-bridge',
      source: 'window-bridge',
      nativeBridge: true,
      purchases: true,
      rewardedAds: true,
      bannerAds: true
    });
    expect(rewarded).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'window-bridge'
    });
    expect(await showBannerPlacementThroughPlatform('base_lobby')).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'window-bridge'
    });
    expect(await hideBannerPlacementThroughPlatform()).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'window-bridge'
    });
    expect(restored).toMatchObject({
      ok: true,
      provider: 'native-bridge',
      source: 'window-bridge',
      restoredOffers: ['starter_pack', 'commander_pack', 'monthly_pass'],
      adsDisabled: true
    });
  });
});
