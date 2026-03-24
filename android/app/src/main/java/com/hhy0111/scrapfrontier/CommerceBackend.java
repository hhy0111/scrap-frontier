package com.hhy0111.scrapfrontier;

import com.getcapacitor.PluginCall;

interface CommerceBackend {

    void getCapabilities(PluginCall call);

    void purchaseOffer(String offerId, PluginCall call);

    void showRewardedPlacement(String placementId, PluginCall call);

    void showBannerPlacement(String placementId, PluginCall call);

    void hideBannerPlacement(PluginCall call);

    void restorePurchases(PluginCall call);

    void getDiagnostics(PluginCall call);

    default void destroy() {}
}
