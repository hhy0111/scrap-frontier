package com.hhy0111.scrapfrontier;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

@CapacitorPlugin(name = "ScrapFrontierCommerce")
public class ScrapFrontierCommercePlugin extends Plugin {

    private static final Set<String> VALID_OFFERS = new LinkedHashSet<>(
        Arrays.asList("starter_pack", "commander_pack", "monthly_pass")
    );
    private static final Set<String> VALID_REWARDED_PLACEMENTS = new LinkedHashSet<>(
        Arrays.asList("salvage_drop", "scout_ping", "offline_overdrive")
    );
    private static final Set<String> VALID_BANNER_PLACEMENTS = new LinkedHashSet<>(
        Arrays.asList("base_lobby")
    );

    private CommerceBackend backend;

    @Override
    public void load() {
        SharedPreferences sharedPreferences = getContext()
            .getSharedPreferences(CommercePreferences.PREFS_NAME, Context.MODE_PRIVATE);
        CommerceConfig config = CommerceConfig.from(getContext());
        CommercePreferences preferences = new CommercePreferences(sharedPreferences);
        backend = createBackend(config, preferences);
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        getBackend().getCapabilities(call);
    }

    @PluginMethod
    public void purchaseOffer(PluginCall call) {
        String offerId = call.getString("offerId");

        if (!VALID_OFFERS.contains(offerId)) {
            call.reject("Unknown offerId: " + offerId);
            return;
        }

        getBackend().purchaseOffer(offerId, call);
    }

    @PluginMethod
    public void showRewardedPlacement(PluginCall call) {
        String placementId = call.getString("placementId");

        if (!VALID_REWARDED_PLACEMENTS.contains(placementId)) {
            call.reject("Unknown placementId: " + placementId);
            return;
        }

        getBackend().showRewardedPlacement(placementId, call);
    }

    @PluginMethod
    public void showBannerPlacement(PluginCall call) {
        String placementId = call.getString("placementId");

        if (!VALID_BANNER_PLACEMENTS.contains(placementId)) {
            call.reject("Unknown placementId: " + placementId);
            return;
        }

        getBackend().showBannerPlacement(placementId, call);
    }

    @PluginMethod
    public void hideBannerPlacement(PluginCall call) {
        getBackend().hideBannerPlacement(call);
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        getBackend().restorePurchases(call);
    }

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        getBackend().getDiagnostics(call);
    }

    @Override
    protected void handleOnDestroy() {
        if (backend != null) {
            backend.destroy();
        }

        super.handleOnDestroy();
    }

    private CommerceBackend getBackend() {
        if (backend != null) {
            return backend;
        }

        SharedPreferences sharedPreferences = getContext()
            .getSharedPreferences(CommercePreferences.PREFS_NAME, Context.MODE_PRIVATE);
        CommerceConfig config = CommerceConfig.from(getContext());
        CommercePreferences preferences = new CommercePreferences(sharedPreferences);
        backend = createBackend(config, preferences);
        return backend;
    }

    private CommerceBackend createBackend(
        CommerceConfig config,
        CommercePreferences preferences
    ) {
        if (config.isLocalSimulatorMode()) {
            return new LocalSimulatorCommerceBackend(config, preferences, VALID_OFFERS);
        }

        if (config.isPlayServicesMode()) {
            return new PlayServicesCommerceBackend(
                this,
                config,
                preferences,
                VALID_OFFERS,
                VALID_REWARDED_PLACEMENTS,
                VALID_BANNER_PLACEMENTS
            );
        }

        return new UnavailableCommerceBackend(config, preferences, VALID_OFFERS);
    }
}
