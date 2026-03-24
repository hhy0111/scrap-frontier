package com.hhy0111.scrapfrontier;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;

final class CommerceConfig {

    private static final String META_COMMERCE_MODE = "com.hhy0111.scrapfrontier.COMMERCE_MODE";
    private static final String META_PURCHASES_ENABLED = "com.hhy0111.scrapfrontier.COMMERCE_PURCHASES_ENABLED";
    private static final String META_REWARDED_ENABLED = "com.hhy0111.scrapfrontier.COMMERCE_REWARDED_ENABLED";
    private static final String META_STARTER_PACK_PRODUCT_ID = "com.hhy0111.scrapfrontier.STARTER_PACK_PRODUCT_ID";
    private static final String META_COMMANDER_PACK_PRODUCT_ID = "com.hhy0111.scrapfrontier.COMMANDER_PACK_PRODUCT_ID";
    private static final String META_MONTHLY_PASS_PRODUCT_ID = "com.hhy0111.scrapfrontier.MONTHLY_PASS_PRODUCT_ID";
    private static final String META_SALVAGE_DROP_AD_UNIT_ID = "com.hhy0111.scrapfrontier.SALVAGE_DROP_AD_UNIT_ID";
    private static final String META_SCOUT_PING_AD_UNIT_ID = "com.hhy0111.scrapfrontier.SCOUT_PING_AD_UNIT_ID";
    private static final String META_OFFLINE_OVERDRIVE_AD_UNIT_ID = "com.hhy0111.scrapfrontier.OFFLINE_OVERDRIVE_AD_UNIT_ID";
    private static final String META_BASE_LOBBY_BANNER_AD_UNIT_ID = "com.hhy0111.scrapfrontier.BASE_LOBBY_BANNER_AD_UNIT_ID";
    private static final String META_ADMOB_APP_ID = "com.google.android.gms.ads.APPLICATION_ID";
    static final String MODE_LOCAL_SIMULATOR = "local-simulator";
    static final String MODE_PLAY_SERVICES = "play-services";
    static final String PRODUCT_TYPE_INAPP = "inapp";
    static final String PRODUCT_TYPE_SUBS = "subs";

    private final String mode;
    private final boolean purchasesEnabled;
    private final boolean rewardedAdsEnabled;
    private final String starterPackProductId;
    private final String commanderPackProductId;
    private final String monthlyPassProductId;
    private final String salvageDropAdUnitId;
    private final String scoutPingAdUnitId;
    private final String offlineOverdriveAdUnitId;
    private final String baseLobbyBannerAdUnitId;
    private final String adMobAppId;

    private CommerceConfig(
        String mode,
        boolean purchasesEnabled,
        boolean rewardedAdsEnabled,
        String starterPackProductId,
        String commanderPackProductId,
        String monthlyPassProductId,
        String salvageDropAdUnitId,
        String scoutPingAdUnitId,
        String offlineOverdriveAdUnitId,
        String baseLobbyBannerAdUnitId,
        String adMobAppId
    ) {
        this.mode = mode;
        this.purchasesEnabled = purchasesEnabled;
        this.rewardedAdsEnabled = rewardedAdsEnabled;
        this.starterPackProductId = starterPackProductId;
        this.commanderPackProductId = commanderPackProductId;
        this.monthlyPassProductId = monthlyPassProductId;
        this.salvageDropAdUnitId = salvageDropAdUnitId;
        this.scoutPingAdUnitId = scoutPingAdUnitId;
        this.offlineOverdriveAdUnitId = offlineOverdriveAdUnitId;
        this.baseLobbyBannerAdUnitId = baseLobbyBannerAdUnitId;
        this.adMobAppId = adMobAppId;
    }

    static CommerceConfig from(Context context) {
        Bundle metadata = getApplicationMetadata(context);
        return new CommerceConfig(
            metadata != null ? metadata.getString(META_COMMERCE_MODE, MODE_LOCAL_SIMULATOR) : MODE_LOCAL_SIMULATOR,
            metadata != null ? metadata.getBoolean(META_PURCHASES_ENABLED, true) : true,
            metadata != null ? metadata.getBoolean(META_REWARDED_ENABLED, true) : true,
            metadata != null ? metadata.getString(META_STARTER_PACK_PRODUCT_ID, "") : "",
            metadata != null ? metadata.getString(META_COMMANDER_PACK_PRODUCT_ID, "") : "",
            metadata != null ? metadata.getString(META_MONTHLY_PASS_PRODUCT_ID, "") : "",
            metadata != null ? metadata.getString(META_SALVAGE_DROP_AD_UNIT_ID, "") : "",
            metadata != null ? metadata.getString(META_SCOUT_PING_AD_UNIT_ID, "") : "",
            metadata != null ? metadata.getString(META_OFFLINE_OVERDRIVE_AD_UNIT_ID, "") : "",
            metadata != null ? metadata.getString(META_BASE_LOBBY_BANNER_AD_UNIT_ID, "") : "",
            metadata != null ? metadata.getString(META_ADMOB_APP_ID, "") : ""
        );
    }

    String getMode() {
        return mode;
    }

    boolean isPurchasesEnabled() {
        return purchasesEnabled;
    }

    boolean isRewardedAdsEnabled() {
        return rewardedAdsEnabled;
    }

    boolean isLocalSimulatorMode() {
        return MODE_LOCAL_SIMULATOR.equals(mode);
    }

    boolean isPlayServicesMode() {
        return MODE_PLAY_SERVICES.equals(mode);
    }

    String getAdMobAppId() {
        return adMobAppId;
    }

    boolean hasAdMobAppId() {
        return adMobAppId != null && !adMobAppId.trim().isEmpty();
    }

    String getOfferProductId(String offerId) {
        if ("starter_pack".equals(offerId)) {
            return starterPackProductId;
        }

        if ("commander_pack".equals(offerId)) {
            return commanderPackProductId;
        }

        if ("monthly_pass".equals(offerId)) {
            return monthlyPassProductId;
        }

        return "";
    }

    String getRewardedPlacementAdUnitId(String placementId) {
        if ("salvage_drop".equals(placementId)) {
            return salvageDropAdUnitId;
        }

        if ("scout_ping".equals(placementId)) {
            return scoutPingAdUnitId;
        }

        if ("offline_overdrive".equals(placementId)) {
            return offlineOverdriveAdUnitId;
        }

        return "";
    }

    String getBannerPlacementAdUnitId(String placementId) {
        if ("base_lobby".equals(placementId)) {
            return baseLobbyBannerAdUnitId;
        }

        return "";
    }

    boolean hasOfferProductId(String offerId) {
        return !getOfferProductId(offerId).trim().isEmpty();
    }

    boolean hasRewardedPlacementAdUnitId(String placementId) {
        return !getRewardedPlacementAdUnitId(placementId).trim().isEmpty();
    }

    boolean hasBannerPlacementAdUnitId(String placementId) {
        return !getBannerPlacementAdUnitId(placementId).trim().isEmpty();
    }

    String getOfferProductType(String offerId) {
        return "monthly_pass".equals(offerId) ? PRODUCT_TYPE_SUBS : PRODUCT_TYPE_INAPP;
    }

    String getOfferIdForProductId(String productId) {
        if (starterPackProductId.equals(productId)) {
            return "starter_pack";
        }

        if (commanderPackProductId.equals(productId)) {
            return "commander_pack";
        }

        if (monthlyPassProductId.equals(productId)) {
            return "monthly_pass";
        }

        return null;
    }

    private static Bundle getApplicationMetadata(Context context) {
        try {
            PackageManager packageManager = context.getPackageManager();
            ApplicationInfo applicationInfo = packageManager.getApplicationInfo(
                context.getPackageName(),
                PackageManager.GET_META_DATA
            );
            return applicationInfo.metaData;
        } catch (PackageManager.NameNotFoundException ignored) {
            return null;
        }
    }
}
