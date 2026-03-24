package com.hhy0111.scrapfrontier;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

final class PlayServicesCommerceBackend implements CommerceBackend, PurchasesUpdatedListener {

    private interface BillingReadyAction {
        void run(BillingClient billingClient);
    }

    private interface PurchasesQuerySuccess {
        void run(List<Purchase> purchases);
    }

    private final ScrapFrontierCommercePlugin plugin;
    private final CommerceConfig config;
    private final CommercePreferences preferences;
    private final Set<String> validOffers;
    private final Set<String> validRewardedPlacements;
    private final Set<String> validBannerPlacements;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean mobileAdsInitStarted = new AtomicBoolean(false);

    private BillingClient billingClient;
    private boolean billingConnectionInProgress = false;
    private boolean mobileAdsInitialized = false;
    private PluginCall pendingPurchaseCall;
    private String pendingPurchaseOfferId;
    private PluginCall pendingRewardedCall;
    private String pendingRewardedPlacementId;
    private boolean pendingRewardEarned = false;
    private FrameLayout bannerContainer;
    private AdView bannerView;
    private String activeBannerPlacementId;

    PlayServicesCommerceBackend(
        ScrapFrontierCommercePlugin plugin,
        CommerceConfig config,
        CommercePreferences preferences,
        Set<String> validOffers,
        Set<String> validRewardedPlacements,
        Set<String> validBannerPlacements
    ) {
        this.plugin = plugin;
        this.config = config;
        this.preferences = preferences;
        this.validOffers = validOffers;
        this.validRewardedPlacements = validRewardedPlacements;
        this.validBannerPlacements = validBannerPlacements;
    }

    @Override
    public void getCapabilities(PluginCall call) {
        call.resolve(
            CommercePayloads.buildCapabilities(
                canServePurchases(),
                canServeRewardedAds(),
                canServeBannerAds()
            )
        );
    }

    @Override
    public void purchaseOffer(String offerId, PluginCall call) {
        if (!config.isPurchasesEnabled()) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASES DISABLED",
                    "android_play_services_purchases_disabled_" + offerId
                )
            );
            return;
        }

        if (!config.hasOfferProductId(offerId)) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PRODUCT ID NOT CONFIGURED",
                    "android_play_services_product_missing_" + offerId
                )
            );
            return;
        }

        if (pendingPurchaseCall != null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE BUSY",
                    "android_play_services_purchase_busy_" + offerId
                )
            );
            return;
        }

        final Activity activity = plugin.getActivity();
        if (activity == null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES ACTIVITY NOT READY",
                    "android_play_services_activity_missing_" + offerId
                )
            );
            return;
        }

        withBillingClient(
            call,
            "purchase",
            offerId,
            billing -> queryProductDetailsAndLaunchPurchase(billing, activity, offerId, call)
        );
    }

    @Override
    public void showRewardedPlacement(String placementId, PluginCall call) {
        if (!config.isRewardedAdsEnabled()) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES REWARDED ADS DISABLED",
                    "android_play_services_rewarded_disabled_" + placementId
                )
            );
            return;
        }

        if (!config.hasRewardedPlacementAdUnitId(placementId)) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES AD UNIT ID NOT CONFIGURED",
                    "android_play_services_ad_unit_missing_" + placementId
                )
            );
            return;
        }

        if (pendingRewardedCall != null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES REWARDED BUSY",
                    "android_play_services_rewarded_busy_" + placementId
                )
            );
            return;
        }

        final Activity activity = plugin.getActivity();
        if (activity == null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES ACTIVITY NOT READY",
                    "android_play_services_activity_missing_" + placementId
                )
            );
            return;
        }

        ensureMobileAdsInitialized(activity.getApplicationContext());

        pendingRewardedCall = call;
        pendingRewardedPlacementId = placementId;
        pendingRewardEarned = false;

        RewardedAd.load(
            activity,
            config.getRewardedPlacementAdUnitId(placementId),
            new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override
                public void onAdFailedToLoad(LoadAdError loadAdError) {
                    resolvePendingRewarded(
                        CommercePayloads.buildResult(
                            false,
                            "ANDROID PLAY SERVICES REWARDED LOAD FAILED",
                            "android_play_services_rewarded_load_failed_" + placementId
                        )
                    );
                }

                @Override
                public void onAdLoaded(RewardedAd rewardedAd) {
                    rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError adError) {
                            resolvePendingRewarded(
                                CommercePayloads.buildResult(
                                    false,
                                    "ANDROID PLAY SERVICES REWARDED SHOW FAILED",
                                    "android_play_services_rewarded_show_failed_" + placementId
                                )
                            );
                        }

                        @Override
                        public void onAdDismissedFullScreenContent() {
                            if (pendingRewardEarned) {
                                resolvePendingRewarded(
                                    CommercePayloads.buildResult(
                                        true,
                                        "ANDROID PLAY SERVICES REWARDED " + placementId.toUpperCase(Locale.ROOT),
                                        preferences.nextReference("rewarded", placementId)
                                    )
                                );
                                return;
                            }

                            resolvePendingRewarded(
                                CommercePayloads.buildResult(
                                    false,
                                    "ANDROID PLAY SERVICES REWARDED CLOSED",
                                    "android_play_services_rewarded_closed_" + placementId
                                )
                            );
                        }
                    });

                    runOnMainThread(() -> rewardedAd.show(activity, rewardItem -> {
                        pendingRewardEarned = true;
                        preferences.recordRewardedPlacement(placementId);
                    }));
                }
            }
        );
    }

    @Override
    public void showBannerPlacement(String placementId, PluginCall call) {
        if (preferences.isAdsDisabled()) {
            runOnMainThread(this::removeBannerView);
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES ADS DISABLED",
                    "android_play_services_banner_disabled_" + placementId
                )
            );
            return;
        }

        if (!config.hasAdMobAppId()) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES ADMOB APP ID NOT CONFIGURED",
                    "android_play_services_admob_app_missing_banner_" + placementId
                )
            );
            return;
        }

        if (!config.hasBannerPlacementAdUnitId(placementId)) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES BANNER AD UNIT ID NOT CONFIGURED",
                    "android_play_services_banner_ad_unit_missing_" + placementId
                )
            );
            return;
        }

        final Activity activity = plugin.getActivity();
        if (activity == null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES ACTIVITY NOT READY",
                    "android_play_services_activity_missing_banner_" + placementId
                )
            );
            return;
        }

        ensureMobileAdsInitialized(activity.getApplicationContext());
        runOnMainThread(() -> attachBannerView(activity, placementId, call));
    }

    @Override
    public void hideBannerPlacement(PluginCall call) {
        runOnMainThread(() -> {
            removeBannerView();
            call.resolve(
                CommercePayloads.buildResult(
                    true,
                    "ANDROID PLAY SERVICES BANNER HIDDEN",
                    "android_play_services_banner_hide"
                )
            );
        });
    }

    @Override
    public void restorePurchases(PluginCall call) {
        if (!config.isPurchasesEnabled()) {
            call.resolve(
                CommercePayloads.buildRestoreResult(
                    false,
                    "ANDROID PLAY SERVICES RESTORE NOT READY",
                    "android_play_services_restore_disabled",
                    preferences.getOwnedOffers(validOffers),
                    preferences.isAdsDisabled()
                )
            );
            return;
        }

        if (!canServePurchases()) {
            call.resolve(
                CommercePayloads.buildRestoreResult(
                    false,
                    "ANDROID PLAY SERVICES RESTORE NOT READY",
                    "android_play_services_restore_not_ready",
                    preferences.getOwnedOffers(validOffers),
                    preferences.isAdsDisabled()
                )
            );
            return;
        }

        withBillingClient(call, "restore", "purchases", billing ->
            queryOwnedPurchases(
                billing,
                BillingClient.ProductType.INAPP,
                inAppPurchases ->
                    queryOwnedPurchases(
                        billing,
                        BillingClient.ProductType.SUBS,
                        subscriptionPurchases -> {
                            applyOwnedPurchases(inAppPurchases);
                            applyOwnedPurchases(subscriptionPurchases);
                            call.resolve(
                                CommercePayloads.buildRestoreResult(
                                    true,
                                    buildRestoreMessage(),
                                    preferences.nextReference("restore", "purchases"),
                                    preferences.getOwnedOffers(validOffers),
                                    preferences.isAdsDisabled()
                                )
                            );
                        },
                        () ->
                            call.resolve(
                                CommercePayloads.buildRestoreResult(
                                    false,
                                    "ANDROID PLAY SERVICES RESTORE FAILED",
                                    "android_play_services_restore_query_failed_subs",
                                    preferences.getOwnedOffers(validOffers),
                                    preferences.isAdsDisabled()
                                )
                            )
                    ),
                () ->
                    call.resolve(
                        CommercePayloads.buildRestoreResult(
                            false,
                            "ANDROID PLAY SERVICES RESTORE FAILED",
                            "android_play_services_restore_query_failed_inapp",
                            preferences.getOwnedOffers(validOffers),
                            preferences.isAdsDisabled()
                        )
                    )
            )
        );
    }

    @Override
    public void getDiagnostics(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("source", "android-native-backend");
        payload.put("backend", CommerceConfig.MODE_PLAY_SERVICES);
        payload.put("mode", config.getMode());
        payload.put("configuredPurchasesEnabled", config.isPurchasesEnabled());
        payload.put("configuredRewardedAdsEnabled", config.isRewardedAdsEnabled());
        payload.put("resolvedPurchases", canServePurchases());
        payload.put("resolvedRewardedAds", canServeRewardedAds());
        payload.put("resolvedBannerAds", canServeBannerAds());
        payload.put("adMobAppIdConfigured", config.hasAdMobAppId());
        payload.put("billingClientReady", billingClient != null && billingClient.isReady());
        payload.put("billingConnectionInProgress", billingConnectionInProgress);
        payload.put("mobileAdsInitialized", mobileAdsInitialized);
        payload.put("adsDisabled", preferences.isAdsDisabled());
        payload.put("ownedOffers", preferences.getOwnedOffersCsv(validOffers));
        payload.put("rewardedAdsWatched", preferences.getRewardedCount());
        payload.put("missingOfferMappings", buildMissingOfferMappingsCsv());
        payload.put("missingRewardedMappings", buildMissingRewardedMappingsCsv());
        payload.put("missingBannerMappings", buildMissingBannerMappingsCsv());
        payload.put("adMobAppId", safeValue(config.getAdMobAppId()));
        payload.put("bannerVisible", isBannerVisible());

        for (String offerId : validOffers) {
            payload.put("productId." + offerId, safeValue(config.getOfferProductId(offerId)));
        }

        for (String placementId : validRewardedPlacements) {
            payload.put("adUnitId." + placementId, safeValue(config.getRewardedPlacementAdUnitId(placementId)));
        }

        for (String placementId : validBannerPlacements) {
            payload.put("adUnitId." + placementId, safeValue(config.getBannerPlacementAdUnitId(placementId)));
        }

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

    @Override
    public void destroy() {
        runOnMainThread(this::removeBannerView);
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }

        billingConnectionInProgress = false;
        pendingPurchaseCall = null;
        pendingPurchaseOfferId = null;
        pendingRewardedCall = null;
        pendingRewardedPlacementId = null;
        pendingRewardEarned = false;
        activeBannerPlacementId = null;
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            if (pendingPurchaseCall == null) {
                applyOwnedPurchases(purchases);
                return;
            }

            Purchase matchedPurchase = findPurchaseForOffer(purchases, pendingPurchaseOfferId);
            if (matchedPurchase == null) {
                matchedPurchase = purchases.get(0);
            }

            handlePurchaseResult(matchedPurchase);
            return;
        }

        if (pendingPurchaseCall == null) {
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            applyOfferEntitlement(pendingPurchaseOfferId);
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    true,
                    "ANDROID PLAY SERVICES ALREADY OWNED " + pendingPurchaseOfferId.toUpperCase(Locale.ROOT),
                    preferences.nextReference("purchase_owned", pendingPurchaseOfferId)
                )
            );
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE CANCELED",
                    "android_play_services_purchase_canceled_" + pendingPurchaseOfferId
                )
            );
            return;
        }

        resolvePendingPurchase(
            CommercePayloads.buildResult(
                false,
                "ANDROID PLAY SERVICES PURCHASE FAILED",
                "android_play_services_purchase_failed_" + pendingPurchaseOfferId
            )
        );
    }

    private boolean canServePurchases() {
        if (!config.isPurchasesEnabled()) {
            return false;
        }

        for (String offerId : validOffers) {
            if (!config.hasOfferProductId(offerId)) {
                return false;
            }
        }

        return true;
    }

    private boolean canServeRewardedAds() {
        if (!config.isRewardedAdsEnabled()) {
            return false;
        }

        if (!config.hasAdMobAppId()) {
            return false;
        }

        for (String placementId : validRewardedPlacements) {
            if (!config.hasRewardedPlacementAdUnitId(placementId)) {
                return false;
            }
        }

        return true;
    }

    private boolean canServeBannerAds() {
        if (!config.hasAdMobAppId()) {
            return false;
        }

        for (String placementId : validBannerPlacements) {
            if (!config.hasBannerPlacementAdUnitId(placementId)) {
                return false;
            }
        }

        return true;
    }

    private void ensureMobileAdsInitialized(Context context) {
        if (mobileAdsInitStarted.compareAndSet(false, true)) {
            new Thread(() ->
                MobileAds.initialize(context, initializationStatus -> mobileAdsInitialized = true)
            ).start();
        }
    }

    private void queryProductDetailsAndLaunchPurchase(
        BillingClient billing,
        Activity activity,
        String offerId,
        PluginCall call
    ) {
        String productId = config.getOfferProductId(offerId);
        String productType = toBillingProductType(config.getOfferProductType(offerId));
        QueryProductDetailsParams.Product product =
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(productType)
                .build();
        QueryProductDetailsParams params =
            QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();

        billing.queryProductDetailsAsync(params, (billingResult, queryResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.resolve(
                    CommercePayloads.buildResult(
                        false,
                        "ANDROID PLAY SERVICES PRODUCT QUERY FAILED",
                        "android_play_services_product_query_failed_" + offerId
                    )
                );
                return;
            }

            List<ProductDetails> productDetailsList = queryResult.getProductDetailsList();
            if (productDetailsList == null || productDetailsList.isEmpty()) {
                call.resolve(
                    CommercePayloads.buildResult(
                        false,
                        "ANDROID PLAY SERVICES PRODUCT NOT FOUND",
                        "android_play_services_product_not_found_" + offerId
                    )
                );
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            BillingFlowParams.ProductDetailsParams.Builder productParamsBuilder =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails);
            String offerToken = resolveOfferToken(productDetails, productType);
            if (!offerToken.isEmpty()) {
                productParamsBuilder.setOfferToken(offerToken);
            }

            BillingFlowParams flowParams =
                BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        Collections.singletonList(productParamsBuilder.build())
                    )
                    .build();

            pendingPurchaseCall = call;
            pendingPurchaseOfferId = offerId;

            runOnMainThread(() -> {
                BillingResult launchResult = billing.launchBillingFlow(activity, flowParams);
                if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    resolvePendingPurchase(
                        CommercePayloads.buildResult(
                            false,
                            "ANDROID PLAY SERVICES PURCHASE LAUNCH FAILED",
                            "android_play_services_purchase_launch_failed_" + offerId
                        )
                    );
                }
            });
        });
    }

    private void handlePurchaseResult(Purchase purchase) {
        String resolvedOfferId = resolveOfferIdFromPurchase(purchase, pendingPurchaseOfferId);
        if (resolvedOfferId == null) {
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE MAPPING FAILED",
                    "android_play_services_purchase_mapping_failed"
                )
            );
            return;
        }

        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE PENDING",
                    "android_play_services_purchase_pending_" + resolvedOfferId
                )
            );
            return;
        }

        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE FAILED",
                    "android_play_services_purchase_state_invalid_" + resolvedOfferId
                )
            );
            return;
        }

        if (purchase.isAcknowledged()) {
            applyOfferEntitlement(resolvedOfferId);
            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    true,
                    "ANDROID PLAY SERVICES PURCHASE " + resolvedOfferId.toUpperCase(Locale.ROOT),
                    preferences.nextReference("purchase", resolvedOfferId)
                )
            );
            return;
        }

        AcknowledgePurchaseParams acknowledgeParams =
            AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

        billingClient.acknowledgePurchase(acknowledgeParams, acknowledgeResult -> {
            if (acknowledgeResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                applyOfferEntitlement(resolvedOfferId);
                resolvePendingPurchase(
                    CommercePayloads.buildResult(
                        true,
                        "ANDROID PLAY SERVICES PURCHASE " + resolvedOfferId.toUpperCase(Locale.ROOT),
                        preferences.nextReference("purchase", resolvedOfferId)
                    )
                );
                return;
            }

            resolvePendingPurchase(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES PURCHASE ACK FAILED",
                    "android_play_services_purchase_ack_failed_" + resolvedOfferId
                )
            );
        });
    }

    private void applyOfferEntitlement(String offerId) {
        preferences.markOfferOwned(offerId);
        if ("commander_pack".equals(offerId)) {
            preferences.setAdsDisabled(true);
        }
    }

    private void applyOwnedPurchases(List<Purchase> purchases) {
        if (purchases == null) {
            return;
        }

        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
                continue;
            }

            List<String> productIds = purchase.getProducts();
            if (productIds == null) {
                continue;
            }

            for (String productId : productIds) {
                String offerId = config.getOfferIdForProductId(productId);
                if (offerId != null) {
                    applyOfferEntitlement(offerId);
                }
            }
        }
    }

    private void queryOwnedPurchases(
        BillingClient billing,
        String productType,
        PurchasesQuerySuccess onSuccess,
        Runnable onFailure
    ) {
        QueryPurchasesParams queryParams =
            QueryPurchasesParams.newBuilder()
                .setProductType(productType)
                .build();
        billing.queryPurchasesAsync(queryParams, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                onSuccess.run(purchases);
                return;
            }

            onFailure.run();
        });
    }

    private String buildRestoreMessage() {
        String ownedOffers = preferences.getOwnedOffersCsv(validOffers);
        return ownedOffers.isEmpty()
            ? "ANDROID PLAY SERVICES RESTORE NONE"
            : "ANDROID PLAY SERVICES RESTORE " + ownedOffers.toUpperCase(Locale.ROOT);
    }

    private String buildMissingOfferMappingsCsv() {
        StringBuilder builder = new StringBuilder();

        for (String offerId : validOffers) {
            if (config.hasOfferProductId(offerId)) {
                continue;
            }

            if (builder.length() > 0) {
                builder.append(',');
            }
            builder.append(offerId);
        }

        return builder.toString();
    }

    private String buildMissingRewardedMappingsCsv() {
        StringBuilder builder = new StringBuilder();

        for (String placementId : validRewardedPlacements) {
            if (config.hasRewardedPlacementAdUnitId(placementId)) {
                continue;
            }

            if (builder.length() > 0) {
                builder.append(',');
            }
            builder.append(placementId);
        }

        return builder.toString();
    }

    private String buildMissingBannerMappingsCsv() {
        StringBuilder builder = new StringBuilder();

        for (String placementId : validBannerPlacements) {
            if (config.hasBannerPlacementAdUnitId(placementId)) {
                continue;
            }

            if (builder.length() > 0) {
                builder.append(',');
            }
            builder.append(placementId);
        }

        return builder.toString();
    }

    private void attachBannerView(Activity activity, String placementId, PluginCall call) {
        if (placementId.equals(activeBannerPlacementId) && isBannerVisible()) {
            call.resolve(
                CommercePayloads.buildResult(
                    true,
                    "ANDROID PLAY SERVICES BANNER " + placementId.toUpperCase(Locale.ROOT),
                    preferences.nextReference("banner_show", placementId)
                )
            );
            return;
        }

        FrameLayout rootLayout = activity.findViewById(android.R.id.content);
        if (rootLayout == null) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES BANNER ROOT NOT READY",
                    "android_play_services_banner_root_missing_" + placementId
                )
            );
            return;
        }

        removeBannerView();

        FrameLayout nextBannerContainer = new FrameLayout(activity);
        FrameLayout.LayoutParams containerLayoutParams =
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
            );

        AdView nextBannerView = new AdView(activity);
        nextBannerView.setAdUnitId(config.getBannerPlacementAdUnitId(placementId));
        nextBannerView.setAdSize(AdSize.BANNER);
        nextBannerView.setAdListener(new AdListener() {
            @Override
            public void onAdFailedToLoad(LoadAdError loadAdError) {
                if (bannerView == nextBannerView) {
                    removeBannerView();
                }
            }
        });

        nextBannerContainer.addView(
            nextBannerView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_HORIZONTAL
            )
        );
        rootLayout.addView(nextBannerContainer, containerLayoutParams);

        bannerContainer = nextBannerContainer;
        bannerView = nextBannerView;
        activeBannerPlacementId = placementId;
        nextBannerView.loadAd(new AdRequest.Builder().build());

        call.resolve(
            CommercePayloads.buildResult(
                true,
                "ANDROID PLAY SERVICES BANNER " + placementId.toUpperCase(Locale.ROOT),
                preferences.nextReference("banner_show", placementId)
            )
        );
    }

    private boolean isBannerVisible() {
        return bannerContainer != null && bannerContainer.getParent() != null && bannerView != null;
    }

    private void removeBannerView() {
        if (bannerView != null) {
            bannerView.setAdListener(null);
            bannerView.destroy();
            bannerView = null;
        }

        if (bannerContainer != null) {
            if (bannerContainer.getParent() instanceof ViewGroup) {
                ((ViewGroup) bannerContainer.getParent()).removeView(bannerContainer);
            }
            bannerContainer.removeAllViews();
            bannerContainer = null;
        }

        activeBannerPlacementId = null;
    }

    private void withBillingClient(
        PluginCall call,
        String action,
        String targetId,
        BillingReadyAction onReady
    ) {
        ensureBillingClient();

        if (billingClient != null && billingClient.isReady()) {
            onReady.run(billingClient);
            return;
        }

        if (billingConnectionInProgress) {
            call.resolve(
                CommercePayloads.buildResult(
                    false,
                    "ANDROID PLAY SERVICES BILLING CONNECTING",
                    "android_play_services_billing_connecting_" + action + "_" + targetId
                )
            );
            return;
        }

        billingConnectionInProgress = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                billingConnectionInProgress = false;

                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    onReady.run(billingClient);
                    return;
                }

                call.resolve(
                    CommercePayloads.buildResult(
                        false,
                        "ANDROID PLAY SERVICES BILLING NOT READY",
                        "android_play_services_billing_not_ready_" + action + "_" + targetId
                    )
                );
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingConnectionInProgress = false;
            }
        });
    }

    private void ensureBillingClient() {
        if (billingClient != null) {
            return;
        }

        billingClient =
            BillingClient.newBuilder(plugin.getContext())
                .setListener(this)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder()
                        .enableOneTimeProducts()
                        .build()
                )
                .build();
    }

    private String resolveOfferToken(ProductDetails productDetails, String productType) {
        if (BillingClient.ProductType.SUBS.equals(productType)) {
            return extractOfferToken(productDetails.getSubscriptionOfferDetails());
        }

        try {
            Method method = productDetails.getClass().getMethod("getOneTimePurchaseOfferDetailsList");
            Object offerList = method.invoke(productDetails);
            return offerList instanceof List<?> ? extractOfferToken((List<?>) offerList) : "";
        } catch (ReflectiveOperationException ignored) {
            return "";
        }
    }

    private String extractOfferToken(List<?> offerDetailsList) {
        if (offerDetailsList == null || offerDetailsList.isEmpty()) {
            return "";
        }

        Object firstOffer = offerDetailsList.get(0);
        try {
            Method getOfferToken = firstOffer.getClass().getMethod("getOfferToken");
            Object offerToken = getOfferToken.invoke(firstOffer);
            return offerToken instanceof String ? (String) offerToken : "";
        } catch (ReflectiveOperationException ignored) {
            return "";
        }
    }

    private Purchase findPurchaseForOffer(List<Purchase> purchases, String offerId) {
        if (purchases == null) {
            return null;
        }

        String productId = config.getOfferProductId(offerId);
        for (Purchase purchase : purchases) {
            List<String> products = purchase.getProducts();
            if (products != null && products.contains(productId)) {
                return purchase;
            }
        }

        return null;
    }

    private String resolveOfferIdFromPurchase(Purchase purchase, String fallbackOfferId) {
        List<String> products = purchase.getProducts();
        if (products == null || products.isEmpty()) {
            return fallbackOfferId;
        }

        for (String productId : products) {
            String offerId = config.getOfferIdForProductId(productId);
            if (offerId != null) {
                return offerId;
            }
        }

        return fallbackOfferId;
    }

    private String toBillingProductType(String productType) {
        return CommerceConfig.PRODUCT_TYPE_SUBS.equals(productType)
            ? BillingClient.ProductType.SUBS
            : BillingClient.ProductType.INAPP;
    }

    private void resolvePendingPurchase(JSObject payload) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        pendingPurchaseOfferId = null;

        if (call != null) {
            call.resolve(payload);
        }
    }

    private void resolvePendingRewarded(JSObject payload) {
        PluginCall call = pendingRewardedCall;
        pendingRewardedCall = null;
        pendingRewardedPlacementId = null;
        pendingRewardEarned = false;

        if (call != null) {
            call.resolve(payload);
        }
    }

    private void runOnMainThread(Runnable runnable) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            runnable.run();
            return;
        }

        mainHandler.post(runnable);
    }

    private Object safeValue(String value) {
        return value == null || value.trim().isEmpty() ? JSONObject.NULL : value;
    }
}
