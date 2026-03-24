import Phaser from 'phaser';
import { addSizedAssetImage } from '../app/assets';
import {
  canClaimMonthlySupply,
  getRewardedPlacementDefinitions,
  getRewardedPlacementRewardPreview,
  getStoreOfferDefinitions,
  MONTHLY_SUPPLY_REWARD
} from '../domain/meta/store';
import {
  getCachedCommerceDiagnostics,
  getCommerceCapabilities,
  purchaseOfferThroughPlatform,
  refreshCommerceDiagnostics,
  restorePurchasesThroughPlatform,
  showRewardedPlacementThroughPlatform
} from '../platform/commerce';
import { gameStore } from '../state/gameState';
import { createMobileShell } from './mobileFrame';
import { createButton, createPanel } from './ui';
import type { RewardedPlacementId, ShopOfferId } from '../types/game';

type DynamicButton = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
};

const formatResources = (values: { scrap: number; power: number; core: number }): string =>
  `S ${values.scrap} | P ${values.power} | C ${values.core}`;

const createDynamicButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  fillColor: number
): DynamicButton => {
  const container = createButton(scene, x, y, width, height, label, onClick, fillColor);
  return {
    container,
    label: container.list[1] as Phaser.GameObjects.Text
  };
};

export class ShopScene extends Phaser.Scene {
  private resourceText?: Phaser.GameObjects.Text;

  private statusText?: Phaser.GameObjects.Text;

  private actionText?: Phaser.GameObjects.Text;

  private rewardedTexts: Partial<Record<RewardedPlacementId, Phaser.GameObjects.Text>> = {};

  private rewardedButtons: Partial<Record<RewardedPlacementId, DynamicButton>> = {};

  private offerTexts: Partial<Record<ShopOfferId, Phaser.GameObjects.Text>> = {};

  private offerButtons: Partial<Record<ShopOfferId, DynamicButton>> = {};

  private pendingActionKey: string | null = null;

  private lastActionMessage = 'IDLE';

  constructor() {
    super('ShopScene');
  }

  create(): void {
    const debugQuery = new URLSearchParams(window.location.search);
    const shell = createMobileShell(this, {
      title: 'SUPPLY STORE',
      subtitle: 'IAP + REWARDED FLOW',
      accent: 0xd08c55,
      iconKey: 'meta_app_icon',
      backgroundColor: '#140f0d'
    });
    const capsuleY = shell.bodyTop;
    const rewardedY = capsuleY + 126;
    const offersY = rewardedY + 116;
    const footerButtonY = shell.footerY - 10;

    createPanel(this, shell.contentX, capsuleY, shell.contentWidth, 114, 'STORE STATUS', 0x8ef2d3);
    createPanel(this, shell.contentX, rewardedY, shell.contentWidth, 108, 'REWARDED OPS', 0x35574a);

    this.resourceText = this.add.text(shell.contentX + 16, capsuleY + 38, '', {
      fontSize: '12px',
      color: '#fff2de',
      fontFamily: 'monospace',
      wordWrap: { width: 156 }
    });
    this.statusText = this.add.text(shell.contentX + 188, capsuleY + 38, '', {
      fontSize: '10px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 184 }
    });
    this.actionText = this.add.text(shell.contentX + 16, capsuleY + 96, '', {
      fontSize: '10px',
      color: '#d8fff5',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });

    getRewardedPlacementDefinitions().forEach((placement, index) => {
      const y = rewardedY + 36 + index * 26;
      this.rewardedTexts[placement.id] = this.add.text(shell.contentX + 16, y, '', {
        fontSize: '10px',
        color: '#d8fff5',
        fontFamily: 'monospace',
        wordWrap: { width: 238 }
      });
      this.rewardedButtons[placement.id] = createDynamicButton(
        this,
        shell.contentX + 320,
        y + 8,
        104,
        20,
        'Claim',
        () => {
          void this.handleRewardedAction(placement.id);
        },
        0x35574a
      );
    });

    getStoreOfferDefinitions().forEach((offer, index) => {
      const y = offersY + index * 114;
      createPanel(this, shell.contentX, y, shell.contentWidth, 104, offer.title.toUpperCase(), 0x4d3323);
      addSizedAssetImage(this, 'ui_shop_pack_card', shell.contentX + 52, y + 62, 82, 76, 0.96);
      addSizedAssetImage(this, 'meta_app_icon', shell.contentX + 52, y + 62, 26, 26, 0.94);

      this.add.text(shell.contentX + 96, y + 38, `${offer.subtitle}\n${offer.priceLabel}`, {
        fontSize: '11px',
        color: '#ffd18a',
        fontFamily: 'monospace',
        wordWrap: { width: 108 }
      });
      this.offerTexts[offer.id] = this.add.text(shell.contentX + 214, y + 38, '', {
        fontSize: '10px',
        color: '#f3ead9',
        fontFamily: 'monospace',
        wordWrap: { width: 104 }
      });
      this.offerButtons[offer.id] = createDynamicButton(
        this,
        shell.contentX + 348,
        y + 74,
        132,
        24,
        'Purchase',
        () => {
          void this.handleOfferAction(offer.id);
        },
        0x2f4747
      );
    });

    createButton(this, shell.contentX + 92, footerButtonY, 124, 28, 'Restore', () => {
      void this.handleRestorePurchases();
    }, 0x35574a);
    createButton(
      this,
      shell.contentX + 278,
      footerButtonY,
      176,
      28,
      'Back To Base',
      () => this.scene.start('BaseScene'),
      0x27424b
    );

    void refreshCommerceDiagnostics();
    this.refresh();

    if (debugQuery.get('shopAction') === 'restore') {
      this.time.delayedCall(80, () => {
        void this.handleRestorePurchases();
      });
    }
  }

  private getCommerceLabel(): string {
    const commerce = getCommerceCapabilities();

    if (commerce.source === 'capacitor-plugin') {
      return 'CAPACITOR';
    }

    if (commerce.source === 'window-bridge') {
      return 'WINDOW BRIDGE';
    }

    return 'WEB MOCK';
  }

  private getDiagnosticsLabel(): string {
    const diagnostics = getCachedCommerceDiagnostics();
    const backend =
      typeof diagnostics.backend === 'string'
        ? diagnostics.backend.toUpperCase()
        : typeof diagnostics.mode === 'string'
          ? diagnostics.mode.toUpperCase()
          : this.getCommerceLabel();
    const status =
      typeof diagnostics.status === 'string'
        ? diagnostics.status.toUpperCase()
        : diagnostics.provider === 'web-mock'
          ? 'READY'
          : 'UNKNOWN';
    const missingOfferMappings =
      typeof diagnostics.missingOfferMappings === 'string' &&
      diagnostics.missingOfferMappings.length > 0
        ? diagnostics.missingOfferMappings.toUpperCase()
        : null;
    const missingRewardedMappings =
      typeof diagnostics.missingRewardedMappings === 'string' &&
      diagnostics.missingRewardedMappings.length > 0
        ? diagnostics.missingRewardedMappings.toUpperCase()
        : null;

    if (missingOfferMappings || missingRewardedMappings) {
      return `DIAG ${backend} ${status}\nMAP ${missingOfferMappings ?? '-'} / ${missingRewardedMappings ?? '-'}`;
    }

    return `DIAG ${backend} ${status}`;
  }

  private async runPlatformAction(
    actionKey: string,
    action: () => Promise<{ ok: boolean; message: string }>
  ): Promise<void> {
    if (this.pendingActionKey) {
      return;
    }

    this.pendingActionKey = actionKey;
    this.lastActionMessage = `PENDING ${actionKey.toUpperCase()}`;
    this.refresh();

    try {
      const result = await action();
      this.lastActionMessage = result.message;
    } catch (error) {
      this.lastActionMessage =
        error instanceof Error ? `FAILED ${error.message}` : 'FAILED UNKNOWN ERROR';
    } finally {
      this.pendingActionKey = null;
      void refreshCommerceDiagnostics();
      this.refresh();
    }
  }

  private async handleOfferAction(offerId: ShopOfferId): Promise<void> {
    const state = gameStore.getState();
    const commerce = getCommerceCapabilities();

    if (!commerce.purchases && !state.meta.store.purchases[offerId]) {
      this.lastActionMessage = 'IAP UNAVAILABLE';
      this.refresh();
      return;
    }

    if (offerId === 'monthly_pass' && state.meta.store.purchases.monthly_pass) {
      gameStore.claimMonthlySupply();
      this.lastActionMessage = canClaimMonthlySupply(gameStore.getState())
        ? 'MONTHLY READY'
        : 'MONTHLY CLAIMED';
      this.refresh();
      return;
    }

    await this.runPlatformAction(`offer:${offerId}`, async () => {
      const result = await purchaseOfferThroughPlatform(offerId);

      if (result.ok) {
        gameStore.purchaseStoreOffer(offerId);
      }

      return {
        ok: result.ok,
        message: result.ok ? result.message : `PURCHASE FAILED ${offerId.toUpperCase()}`
      };
    });
  }

  private async handleRewardedAction(placementId: RewardedPlacementId): Promise<void> {
    const state = gameStore.getState();
    const commerce = getCommerceCapabilities();

    if (!state.meta.store.adsDisabled && !commerce.rewardedAds) {
      this.lastActionMessage = 'REWARDED UNAVAILABLE';
      this.refresh();
      return;
    }

    if (placementId === 'offline_overdrive') {
      if (!state.pendingOfflineReward || state.pendingOfflineReward.boosted) {
        this.lastActionMessage = 'NO OFFLINE BOOST AVAILABLE';
        this.refresh();
        return;
      }
    }

    if (state.meta.store.adsDisabled) {
      gameStore.claimRewardedPlacement(placementId);
      this.lastActionMessage = `AD-FREE ${placementId.toUpperCase()}`;
      this.refresh();
      return;
    }

    await this.runPlatformAction(`rewarded:${placementId}`, async () => {
      const result = await showRewardedPlacementThroughPlatform(placementId);

      if (result.ok) {
        gameStore.claimRewardedPlacement(placementId);
      }

      return {
        ok: result.ok,
        message: result.ok ? result.message : `REWARDED FAILED ${placementId.toUpperCase()}`
      };
    });
  }

  private async handleRestorePurchases(): Promise<void> {
    await this.runPlatformAction('restore', async () => {
      const result = await restorePurchasesThroughPlatform();

      if (result.ok && (result.restoredOffers.length > 0 || result.adsDisabled)) {
        gameStore.restoreStorePurchases(result.restoredOffers, result.adsDisabled);
      }

      return {
        ok: result.ok,
        message:
          result.ok && result.restoredOffers.length === 0 && !result.adsDisabled
            ? result.message
            : result.ok
              ? `RESTORED ${result.restoredOffers.join(',').toUpperCase() || 'NONE'}`
              : result.message
      };
    });
  }

  private refreshRewardedSection(): void {
    const state = gameStore.getState();
    const commerce = getCommerceCapabilities();
    const adVerb = state.meta.store.adsDisabled ? 'CLAIM' : 'WATCH AD';

    getRewardedPlacementDefinitions().forEach((placement) => {
      const preview = getRewardedPlacementRewardPreview(state, placement.id);
      const rewardText = this.rewardedTexts[placement.id];
      const button = this.rewardedButtons[placement.id];

      if (!rewardText || !button) {
        return;
      }

      let enabled = true;
      let detail = placement.detailLines[0];
      let buttonLabel = adVerb;

      if (!state.meta.store.adsDisabled && !commerce.rewardedAds) {
        detail = `${placement.title}\nNATIVE REWARDED OFFLINE`;
        buttonLabel = 'Unavailable';
        enabled = false;
      } else if (placement.id === 'salvage_drop' && preview) {
        detail = `${placement.title}\n${formatResources(preview)}`;
      } else if (placement.id === 'scout_ping') {
        detail = `${placement.title}\nREROLL ${state.base.scoutTargets.length} TARGETS`;
        buttonLabel = state.meta.store.adsDisabled ? 'REFRESH' : 'WATCH AD';
      } else if (!state.pendingOfflineReward) {
        detail = `${placement.title}\nNO OFFLINE REPORT`;
        buttonLabel = 'NO REPORT';
        enabled = false;
      } else if (state.pendingOfflineReward.boosted) {
        detail = `${placement.title}\nALREADY DOUBLED`;
        buttonLabel = 'USED';
        enabled = false;
      } else if (preview) {
        detail = `${placement.title}\n+${formatResources(preview)}`;
        buttonLabel = state.meta.store.adsDisabled ? 'BOOST' : 'WATCH AD';
      }

      rewardText.setText(detail);
      const isBusy = this.pendingActionKey === `rewarded:${placement.id}`;
      button.label.setText(isBusy ? 'Working' : buttonLabel);
      button.container.setAlpha(enabled ? (isBusy ? 0.55 : 1) : 0.35);
    });
  }

  private refreshOfferSection(): void {
    const state = gameStore.getState();
    const commerce = getCommerceCapabilities();

    getStoreOfferDefinitions().forEach((offer) => {
      const purchased = state.meta.store.purchases[offer.id];
      const offerText = this.offerTexts[offer.id];
      const button = this.offerButtons[offer.id];

      if (!offerText || !button) {
        return;
      }

      if (offer.id === 'monthly_pass') {
        const ready = canClaimMonthlySupply(state);
        offerText.setText(
          [
            offer.detailLines[0],
            offer.detailLines[1],
            purchased
              ? `DAILY ${formatResources(MONTHLY_SUPPLY_REWARD)}`
              : offer.detailLines[3]
          ].join('\n')
        );
        const isBusy = this.pendingActionKey === `offer:${offer.id}`;
        button.label.setText(
          isBusy
            ? 'Working'
            : purchased
              ? ready
                ? 'Claim Daily'
                : 'Claimed Today'
              : commerce.purchases
                ? 'Buy Pass'
                : 'IAP Offline'
        );
        button.container.setAlpha(
          !purchased
            ? commerce.purchases
              ? isBusy
                ? 0.55
                : 1
              : 0.35
            : ready
              ? isBusy
                ? 0.55
                : 1
              : 0.45
        );
        return;
      }

      offerText.setText(
        [
          offer.detailLines[0],
          offer.detailLines[1],
          purchased ? 'STATUS OWNED' : offer.detailLines[3]
        ].join('\n')
      );
      const isBusy = this.pendingActionKey === `offer:${offer.id}`;
      button.label.setText(
        isBusy ? 'Working' : purchased ? 'Owned' : commerce.purchases ? 'Purchase' : 'IAP Offline'
      );
      button.container.setAlpha(purchased ? 0.35 : commerce.purchases ? (isBusy ? 0.55 : 1) : 0.35);
    });
  }

  private refresh(): void {
    const state = gameStore.getState();
    const store = state.meta.store;
    const commerce = getCommerceCapabilities();

    this.resourceText?.setText(
      `LIVE RESOURCES\nSCRAP ${state.resources.scrap}\nPOWER ${state.resources.power}\nCORE ${state.resources.core}`
    );
    this.statusText?.setText(
      [
        `MODE ${store.adsDisabled ? 'AD-FREE CLAIM' : 'REWARDED REQUIRED'}`,
        `PLATFORM ${this.getCommerceLabel()}`,
        `IAP ${commerce.purchases ? 'READY' : 'OFFLINE'}`,
        `ADS ${store.adsDisabled ? 'SKIPPED' : commerce.rewardedAds ? 'READY' : 'OFFLINE'}`,
        `REWARDED ${store.rewardedAdsWatched}`,
        `LAST ${store.lastRewardedPlacement ?? 'none'}`,
        `MONTHLY ${store.purchases.monthly_pass ? (canClaimMonthlySupply(state) ? 'READY' : 'CLAIMED') : 'LOCKED'}`
      ].join('\n')
    );
    this.actionText?.setText(`ACTION ${this.lastActionMessage}\n${this.getDiagnosticsLabel()}`);

    this.refreshRewardedSection();
    this.refreshOfferSection();
  }

  update(): void {
    gameStore.tick();
    this.refresh();
  }
}
