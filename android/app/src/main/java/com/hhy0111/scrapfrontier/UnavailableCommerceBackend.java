package com.hhy0111.scrapfrontier;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.util.Locale;
import java.util.Set;
import org.json.JSONObject;

final class UnavailableCommerceBackend implements CommerceBackend {

    private final CommerceConfig config;
    private final CommercePreferences preferences;
    private final Set<String> validOffers;

    UnavailableCommerceBackend(
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
        call.resolve(CommercePayloads.buildCapabilities(false, false, false));
    }

    @Override
    public void purchaseOffer(String offerId, PluginCall call) {
        call.resolve(
            CommercePayloads.buildResult(
                false,
                buildUnavailableMessage("PURCHASE"),
                "android_backend_unavailable_purchase_" + offerId
            )
        );
    }

    @Override
    public void showRewardedPlacement(String placementId, PluginCall call) {
        call.resolve(
            CommercePayloads.buildResult(
                false,
                buildUnavailableMessage("REWARDED"),
                "android_backend_unavailable_rewarded_" + placementId
            )
        );
    }

    @Override
    public void showBannerPlacement(String placementId, PluginCall call) {
        call.resolve(
            CommercePayloads.buildResult(
                false,
                buildUnavailableMessage("BANNER"),
                "android_backend_unavailable_banner_" + placementId
            )
        );
    }

    @Override
    public void hideBannerPlacement(PluginCall call) {
        call.resolve(
            CommercePayloads.buildResult(
                false,
                buildUnavailableMessage("BANNER"),
                "android_backend_unavailable_banner_hide"
            )
        );
    }

    @Override
    public void restorePurchases(PluginCall call) {
        call.resolve(
            CommercePayloads.buildRestoreResult(
                false,
                buildUnavailableMessage("RESTORE"),
                "android_backend_unavailable_restore",
                preferences.getOwnedOffers(validOffers),
                preferences.isAdsDisabled()
            )
        );
    }

    @Override
    public void getDiagnostics(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("source", "android-native-backend");
        payload.put("backend", "unavailable");
        payload.put("mode", config.getMode());
        payload.put("configuredPurchasesEnabled", config.isPurchasesEnabled());
        payload.put("configuredRewardedAdsEnabled", config.isRewardedAdsEnabled());
        payload.put("resolvedPurchases", false);
        payload.put("resolvedRewardedAds", false);
        payload.put("resolvedBannerAds", false);
        payload.put("adsDisabled", preferences.isAdsDisabled());
        payload.put("ownedOffers", preferences.getOwnedOffersCsv(validOffers));
        payload.put("rewardedAdsWatched", preferences.getRewardedCount());
        payload.put("targetBackend", CommerceConfig.MODE_PLAY_SERVICES);
        payload.put("bannerVisible", false);

        String lastRewardedPlacement = preferences.getLastRewardedPlacement();
        payload.put(
            "lastRewardedPlacement",
            lastRewardedPlacement == null ? JSONObject.NULL : lastRewardedPlacement
        );
        payload.put("activeBannerPlacement", JSONObject.NULL);
        call.resolve(payload);
    }

    private String buildUnavailableMessage(String action) {
        return "ANDROID " + normalizeMode(config.getMode()) + " " + action + " NOT WIRED";
    }

    private String normalizeMode(String mode) {
        return mode.replace('-', ' ').toUpperCase(Locale.ROOT);
    }

}
