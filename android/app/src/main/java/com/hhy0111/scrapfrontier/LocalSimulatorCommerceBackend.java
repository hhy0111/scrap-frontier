package com.hhy0111.scrapfrontier;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.util.Set;
import org.json.JSONObject;

final class LocalSimulatorCommerceBackend implements CommerceBackend {

    private final CommerceConfig config;
    private final CommercePreferences preferences;
    private final Set<String> validOffers;
    private String activeBannerPlacementId;

    LocalSimulatorCommerceBackend(
        CommerceConfig config,
        CommercePreferences preferences,
        Set<String> validOffers
    ) {
        this.config = config;
        this.preferences = preferences;
        this.validOffers = validOffers;
    }

    @Override
    public void getCapabilities(PluginCall call) {
        call.resolve(
            CommercePayloads.buildCapabilities(
                config.isPurchasesEnabled(),
                config.isRewardedAdsEnabled(),
                true
            )
        );
    }

    @Override
    public void purchaseOffer(String offerId, PluginCall call) {
        if (!config.isPurchasesEnabled()) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PURCHASES DISABLED",
                    "android_purchases_disabled_" + offerId
                )
            );
            return;
        }

        if (preferences.isOfferOwned(offerId)) {
            call.resolve(
                CommercePayloads.buildResult(
                    true,
                    "ANDROID ALREADY OWNED " + offerId.toUpperCase(),
                    "android_owned_" + offerId
                )
            );
            return;
        }

        preferences.markOfferOwned(offerId);
        if ("commander_pack".equals(offerId)) {
            preferences.setAdsDisabled(true);
        }

        call.resolve(
            CommercePayloads.buildResult(
                true,
                "ANDROID PURCHASE " + offerId.toUpperCase(),
                preferences.nextReference("purchase", offerId)
            )
        );
    }

    @Override
    public void showRewardedPlacement(String placementId, PluginCall call) {
        if (!config.isRewardedAdsEnabled()) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID REWARDED ADS DISABLED",
                    "android_rewarded_disabled_" + placementId
                )
            );
            return;
        }

        preferences.recordRewardedPlacement(placementId);
        call.resolve(
            CommercePayloads.buildResult(
                true,
                "ANDROID REWARDED " + placementId.toUpperCase(),
                preferences.nextReference("rewarded", placementId)
            )
        );
    }

    @Override
    public void showBannerPlacement(String placementId, PluginCall call) {
        if (preferences.isAdsDisabled()) {
            activeBannerPlacementId = null;
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID BANNER ADS DISABLED",
                    "android_banner_disabled_" + placementId
                )
            );
            return;
        }

        activeBannerPlacementId = placementId;
        call.resolve(
            CommercePayloads.buildResult(
                true,
                "ANDROID BANNER " + placementId.toUpperCase(),
                preferences.nextReference("banner", placementId)
            )
        );
    }

    @Override
    public void hideBannerPlacement(PluginCall call) {
        activeBannerPlacementId = null;
        call.resolve(
            CommercePayloads.buildResult(
                true,
                "ANDROID BANNER HIDDEN",
                "android_banner_hide"
            )
        );
    }

    @Override
    public void restorePurchases(PluginCall call) {
        call.resolve(
            CommercePayloads.buildRestoreResult(
                true,
                "ANDROID RESTORE PURCHASES",
                "android_restore_purchases",
                preferences.getOwnedOffers(validOffers),
                preferences.isAdsDisabled()
            )
        );
    }

    @Override
    public void getDiagnostics(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("source", "android-native-backend");
        payload.put("backend", CommerceConfig.MODE_LOCAL_SIMULATOR);
        payload.put("mode", config.getMode());
        payload.put("purchases", config.isPurchasesEnabled());
        payload.put("rewardedAds", config.isRewardedAdsEnabled());
        payload.put("bannerAds", true);
        payload.put("adsDisabled", preferences.isAdsDisabled());
        payload.put("ownedOffers", preferences.getOwnedOffersCsv(validOffers));
        payload.put("rewardedAdsWatched", preferences.getRewardedCount());
        payload.put("bannerVisible", activeBannerPlacementId != null);

        String lastRewardedPlacement = preferences.getLastRewardedPlacement();
        payload.put(
            "lastRewardedPlacement",
            lastRewardedPlacement == null ? JSONObject.NULL : lastRewardedPlacement
        );
        payload.put(
            "activeBannerPlacement",
            activeBannerPlacementId == null ? JSONObject.NULL : activeBannerPlacementId
        );
        call.resolve(payload);
    }
}
