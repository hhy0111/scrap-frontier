# Android Setup

This repository now includes a real Capacitor Android project, a native commerce plugin, and release-oriented Android config scaffolding.

## Files

- Android app entry: [MainActivity.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/MainActivity.java)
- Native plugin: [ScrapFrontierCommercePlugin.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/ScrapFrontierCommercePlugin.java)
- Capacitor config: [capacitor.config.ts](/D:/dev/game304/capacitor.config.ts)

## Current Native Commerce Mode

The Android plugin now selects a native backend from manifest metadata.

- `local-simulator`
  - current default
  - purchases and rewarded placements are simulated natively
- `play-services`
  - real Google Play Billing + Rewarded + Banner Ads integration path
  - uses configured product IDs, rewarded ad unit IDs, and banner ad unit IDs
  - resolves purchase/reward results asynchronously through the Capacitor bridge
  - restore queries active Play purchases and maps them back into local entitlements
- any other mode
  - resolves to an explicit unavailable backend instead of silently behaving like the simulator
- Owned offers and rewarded diagnostics are persisted with `SharedPreferences` through a shared preferences helper.
- Capabilities and IDs are controlled by Android manifest placeholders:
  - `com.hhy0111.scrapfrontier.COMMERCE_MODE`
  - `com.hhy0111.scrapfrontier.COMMERCE_PURCHASES_ENABLED`
  - `com.hhy0111.scrapfrontier.COMMERCE_REWARDED_ENABLED`
  - `com.hhy0111.scrapfrontier.STARTER_PACK_PRODUCT_ID`
  - `com.hhy0111.scrapfrontier.COMMANDER_PACK_PRODUCT_ID`
  - `com.hhy0111.scrapfrontier.MONTHLY_PASS_PRODUCT_ID`
  - `com.hhy0111.scrapfrontier.SALVAGE_DROP_AD_UNIT_ID`
  - `com.hhy0111.scrapfrontier.SCOUT_PING_AD_UNIT_ID`
  - `com.hhy0111.scrapfrontier.OFFLINE_OVERDRIVE_AD_UNIT_ID`
  - `com.hhy0111.scrapfrontier.BASE_LOBBY_BANNER_AD_UNIT_ID`
  - `com.google.android.gms.ads.APPLICATION_ID`

These placeholders are wired in [AndroidManifest.xml](/D:/dev/game304/android/app/src/main/AndroidManifest.xml) and are normally filled from:

- [release.properties.example](/D:/dev/game304/android/release.properties.example)
- [keystore.properties.example](/D:/dev/game304/android/keystore.properties.example)

## Prerequisites

1. Install Android Studio with Android SDK Platform 35.
2. Set one of:
   - `ANDROID_HOME`
   - `ANDROID_SDK_ROOT`
3. Or create `android/local.properties` with your SDK path:

```properties
sdk.dir=C\\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

## Commands

```bash
npm install
npm run cap:sync:android
npm run android:prepare:sdk
npm run android:assemble:debug
npm run android:assemble:release
npm run android:bundle:release
```

## Notes

- `npm run cap:sync:android` rebuilds the web app and copies `dist` into the Android project.
- `npm run android:prepare:sdk` writes `android/local.properties` automatically when `ANDROID_HOME` or `ANDROID_SDK_ROOT` is set.
- `npm run android:assemble:debug` now runs the SDK-path preparation step first, then launches Gradle.
- `debug` can stay on `local-simulator`, while `release` is designed to move onto `play-services` through release properties.
- `android/release.properties` and `android/keystore.properties` are intentionally gitignored; copy from the example files and fill with real values.
- The remaining release blocker is no longer SDK wiring. It is now external configuration:
  - Play Console product IDs
  - AdMob app ID
  - rewarded ad unit IDs
  - banner ad unit IDs
  - signing keystore values
  - Android SDK path on the build machine
