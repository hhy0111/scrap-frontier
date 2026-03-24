package com.hhy0111.scrapfrontier;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

final class CommercePayloads {

    private CommercePayloads() {}

    static JSObject buildCapabilities(boolean purchases, boolean rewardedAds, boolean bannerAds) {
        JSObject payload = new JSObject();
        payload.put("purchases", purchases);
        payload.put("rewardedAds", rewardedAds);
        payload.put("bannerAds", bannerAds);
        return payload;
    }

    static JSObject buildResult(boolean ok, String message, String reference) {
        JSObject payload = new JSObject();
        payload.put("ok", ok);
        payload.put("message", message);
        payload.put("reference", reference);
        return payload;
    }

    static JSObject buildRestoreResult(
        boolean ok,
        String message,
        String reference,
        JSArray restoredOffers,
        boolean adsDisabled
    ) {
        JSObject payload = buildResult(ok, message, reference);
        payload.put("restoredOffers", restoredOffers);
        payload.put("adsDisabled", adsDisabled);
        return payload;
    }
}
