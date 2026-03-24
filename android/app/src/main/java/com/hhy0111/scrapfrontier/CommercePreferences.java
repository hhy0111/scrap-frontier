package com.hhy0111.scrapfrontier;

import android.content.SharedPreferences;
import com.getcapacitor.JSArray;

final class CommercePreferences {

    static final String PREFS_NAME = "scrap_frontier_commerce";
    private static final String KEY_ADS_DISABLED = "ads_disabled";
    private static final String KEY_LAST_REWARDED_PLACEMENT = "last_rewarded_placement";
    private static final String KEY_REWARDED_COUNT = "rewarded_count";
    private static final String KEY_REFERENCE_COUNTER = "reference_counter";

    private final SharedPreferences preferences;

    CommercePreferences(SharedPreferences preferences) {
        this.preferences = preferences;
    }

    boolean isOfferOwned(String offerId) {
        return preferences.getBoolean(getOfferPreferenceKey(offerId), false);
    }

    void markOfferOwned(String offerId) {
        preferences.edit().putBoolean(getOfferPreferenceKey(offerId), true).apply();
    }

    boolean isAdsDisabled() {
        return preferences.getBoolean(KEY_ADS_DISABLED, false) || isOfferOwned("commander_pack");
    }

    void setAdsDisabled(boolean adsDisabled) {
        preferences.edit().putBoolean(KEY_ADS_DISABLED, adsDisabled).apply();
    }

    void recordRewardedPlacement(String placementId) {
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(KEY_LAST_REWARDED_PLACEMENT, placementId);
        editor.putInt(KEY_REWARDED_COUNT, preferences.getInt(KEY_REWARDED_COUNT, 0) + 1);
        editor.apply();
    }

    String getLastRewardedPlacement() {
        return preferences.getString(KEY_LAST_REWARDED_PLACEMENT, null);
    }

    int getRewardedCount() {
        return preferences.getInt(KEY_REWARDED_COUNT, 0);
    }

    String nextReference(String prefix, String targetId) {
        int nextCounter = preferences.getInt(KEY_REFERENCE_COUNTER, 0) + 1;
        preferences.edit().putInt(KEY_REFERENCE_COUNTER, nextCounter).apply();
        return "android_" + prefix + "_" + targetId + "_" + nextCounter;
    }

    JSArray getOwnedOffers(Iterable<String> validOffers) {
        JSArray payload = new JSArray();

        for (String offerId : validOffers) {
            if (isOfferOwned(offerId)) {
                payload.put(offerId);
            }
        }

        return payload;
    }

    String getOwnedOffersCsv(Iterable<String> validOffers) {
        StringBuilder builder = new StringBuilder();

        for (String offerId : validOffers) {
            if (!isOfferOwned(offerId)) {
                continue;
            }

            if (builder.length() > 0) {
                builder.append(',');
            }

            builder.append(offerId);
        }

        return builder.toString();
    }

    private String getOfferPreferenceKey(String offerId) {
        return "offer_owned_" + offerId;
    }
}
