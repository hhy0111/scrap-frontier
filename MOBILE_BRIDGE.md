# Scrap Frontier Mobile Bridge

This project now expects a Capacitor plugin named `ScrapFrontierCommerce`.

## Capacitor Config

- `appId`: `com.hhy0111.scrapfrontier`
- `appName`: `Scrap Frontier`
- `webDir`: `dist`

Config file: [capacitor.config.ts](/D:/dev/game304/capacitor.config.ts)

## Expected Plugin Name

- Capacitor plugin key: `ScrapFrontierCommerce`
- Window bridge alias used by the web shell: `ScrapFrontierNativeCommerce`

The web app installs a wrapper from the Capacitor plugin into the window bridge at startup.

## Current Android Implementation

The repository now includes a real Android-side Capacitor plugin:

- [MainActivity.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/MainActivity.java)
- [ScrapFrontierCommercePlugin.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/ScrapFrontierCommercePlugin.java)

Current default mode: `local-simulator`

- Plugin calls are implemented natively on Android.
- Offer ownership and ad-free state are persisted with `SharedPreferences`.
- Rewarded calls are tracked for diagnostics.
- Capability flags are controlled through Android manifest metadata.
- Backend selection now happens natively:
  - `local-simulator` uses the current simulator backend
- `play-services` now runs the real Play Billing / Rewarded + Banner Ads integration path using configured product IDs and ad unit IDs
  - any other mode resolves to an explicit unavailable backend instead of silently acting like the simulator

The bridge contract is now wired end-to-end for Android:

- `purchaseOffer`
  - queries Play product details
  - launches the billing flow
  - waits for purchase callback completion
  - acknowledges the purchase before resolving success
- `showRewardedPlacement`
  - loads a rewarded ad from the configured ad unit
  - waits until the reward is actually earned before resolving success
- `showBannerPlacement`
  - mounts a bottom banner container for the configured placement
  - currently supports `base_lobby`
- `hideBannerPlacement`
  - removes the currently mounted banner container
- `restorePurchases`
  - queries active `INAPP` and `SUBS` purchases from Play
  - maps them back to `starter_pack`, `commander_pack`, `monthly_pass`
  - rehydrates local entitlements without replaying one-time rewards

What still depends on user/platform input is not bridge design but final live values:

- Play Console product IDs
- AdMob app ID
- rewarded ad unit IDs
- banner ad unit IDs
- signing / release configuration

## Expected Plugin Surface

```ts
type ScrapFrontierCommercePlugin = {
  capabilities?: {
    purchases?: boolean;
    rewardedAds?: boolean;
    bannerAds?: boolean;
  };
  purchaseOffer?: (payload: { offerId: 'starter_pack' | 'commander_pack' | 'monthly_pass' }) => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
  }>;
  showRewardedPlacement?: (payload: { placementId: 'salvage_drop' | 'scout_ping' | 'offline_overdrive' }) => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
  }>;
  showBannerPlacement?: (payload: { placementId: 'base_lobby' }) => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
  }>;
  hideBannerPlacement?: () => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
  }>;
  restorePurchases?: () => Promise<{
    ok?: boolean;
    message?: string;
    reference?: string;
    restoredOffers?: Array<'starter_pack' | 'commander_pack' | 'monthly_pass'>;
    adsDisabled?: boolean;
  }>;
  getDiagnostics?: () => Promise<Record<string, string | number | boolean | null>>;
};
```

## Notes

- `purchaseOffer` should confirm the transaction and return a stable `reference`.
- `showRewardedPlacement` should resolve only after the reward is earned.
- `showBannerPlacement` should mount the banner without resizing the WebView; the game already reserves a bottom inset in `BaseScene`.
- `restorePurchases` should return entitlements only; the game does not replay purchase rewards during restore.
- `commander_pack` can map to `adsDisabled = true`.
- `monthly_pass` restore should return `restoredOffers: ['monthly_pass']`.

## Current Web Fallback

Until the native plugin is installed, the game falls back to:

- web mock purchase success
- web mock rewarded success
- web mock restore with no entitlements

Main implementation files:

- [commerce.ts](/D:/dev/game304/src/platform/commerce.ts)
- [capacitorCommerceBridge.ts](/D:/dev/game304/src/platform/capacitorCommerceBridge.ts)
- [capacitorCommercePlugin.ts](/D:/dev/game304/src/platform/capacitorCommercePlugin.ts)
- [commerceContract.ts](/D:/dev/game304/src/platform/commerceContract.ts)
- [ANDROID_SETUP.md](/D:/dev/game304/ANDROID_SETUP.md)
