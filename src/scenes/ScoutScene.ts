import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
import { getUnlockMilestoneItems, getUpcomingUnlockMilestones, getUnlockStatus } from '../domain/meta/unlocks';
import { balance, gameStore } from '../state/gameState';
import { createTutorialOverlay } from './TutorialOverlay';
import { createMobileShell } from './mobileFrame';
import { createButton, createPanel } from './ui';

const summarizeUnlocks = (labels: string[], maxItems = 4): string =>
  labels.length <= maxItems ? labels.join(' / ') : `${labels.slice(0, maxItems).join(' / ')} +${labels.length - maxItems}`;

export class ScoutScene extends Phaser.Scene {
  private targetTexts: Phaser.GameObjects.Text[] = [];

  private targetObjects: Phaser.GameObjects.GameObject[] = [];

  private contentX = 0;

  private cardsTop = 0;

  private summaryText?: Phaser.GameObjects.Text;

  constructor() {
    super('ScoutScene');
  }

  create(): void {
    const shell = createMobileShell(this, {
      title: 'SCOUT TARGETS',
      subtitle: 'CHOOSE NEXT RAID',
      accent: 0x8ef2d3,
      iconKey: 'ui_icon_scout',
      artKey: 'meta_loading_art',
      artAngle: -8,
      backgroundColor: '#10171b'
    });

    this.contentX = shell.contentX;
    this.cardsTop = shell.bodyTop + 80;
    const footerButtonY = shell.footerY - 8;

    createPanel(this, shell.contentX, shell.bodyTop, shell.contentWidth, 72, 'INTEL FEED', 0x35574a);
    this.summaryText = this.add.text(shell.contentX + 16, shell.bodyTop + 38, '', {
      fontSize: '11px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });

    createButton(this, shell.contentX + 72, footerButtonY, 108, 28, 'Back', () => this.scene.start('BaseScene'));
    createButton(
      this,
      shell.contentX + 204,
      footerButtonY,
      144,
      28,
      'Refresh Targets',
      () => {
        gameStore.refreshScoutTargets();
        this.renderTargets();
      },
      0x27424b
    );

    this.renderTargets();
    createTutorialOverlay(this, 'ScoutScene');
  }

  private renderTargets(): void {
    this.targetTexts.forEach((text) => text.destroy());
    this.targetObjects.forEach((object) => object.destroy());
    this.targetTexts = [];
    this.targetObjects = [];

    const state = gameStore.getState();
    const selectedTarget =
      state.base.scoutTargets.find((target) => target.id === state.base.selectedScoutTargetId) ?? null;
    const unlockMilestone = getUpcomingUnlockMilestones(state, balance, 1)[0];
    const unlockStatus = getUnlockStatus(state, balance);
    const garageNeed = unlockStatus.facilityNeeds.find((entry) => entry.buildingLabel === 'GARAGE');

    this.summaryText?.setText(
      [
        `HQ ${state.base.hqLevel} | ZONE ${state.meta.zoneTier} | ACTIVE TARGETS ${state.base.scoutTargets.length}`,
        `SELECTED ${selectedTarget ? selectedTarget.name : 'NONE'}`,
        garageNeed
          ? `BUILD GARAGE FOR ${summarizeUnlocks(garageNeed.unitLabels, 3)}`
          : unlockMilestone
            ? `NEXT HQ${unlockMilestone.hqLevel} ${summarizeUnlocks(getUnlockMilestoneItems(unlockMilestone), 4)}`
            : 'ALL CORE UNLOCKS OPEN'
      ].join('\n')
    );

    state.base.scoutTargets.forEach((target, index) => {
      const y = this.cardsTop + index * 156;
      const isSelected = target.id === state.base.selectedScoutTargetId;

      this.targetObjects.push(
        createPanel(
          this,
          this.contentX,
          y,
          388,
          146,
          `TARGET ${index + 1}`,
          isSelected ? 0x8ef2d3 : 0x53727b
        )
      );

      const hitbox = this.add
        .rectangle(this.contentX + 194, y + 73, 388, 146, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hitbox.on('pointerdown', () => {
        gameStore.selectScoutTarget(target.id);
        this.renderTargets();
      });
      this.targetObjects.push(hitbox);

      this.targetObjects.push(
        addSizedAssetImage(this, 'ui_scout_card', this.contentX + 68, y + 84, 116, 88, 0.96)
      );
      this.targetObjects.push(
        addSizedAssetImage(this, 'building_command_center', this.contentX + 74, y + 84, 52, 52, 0.92)
      );
      this.targetObjects.push(addAssetImage(this, 'fx_target_marker', this.contentX + 44, y + 84, 42));

      this.targetTexts.push(
        this.add.text(
          this.contentX + 122,
          y + 38,
          [
            `${target.name}`,
            `DIFF ${target.difficulty.toUpperCase()} | ZONE ${target.zoneTier}`,
            `POWER ${target.recommendedPower} | DEF ${target.defenderCount} | T ${target.turrets}`,
            `LOOT ${target.storedRewards.scrap}S / ${target.storedRewards.power}P / ${target.storedRewards.core}C`
          ].join('\n'),
          {
            fontSize: '12px',
            color: isSelected ? '#d8fff5' : '#f3ead9',
            fontFamily: 'monospace',
            wordWrap: { width: 214 }
          }
        )
      );

      this.targetTexts.push(
        this.add.text(this.contentX + 316, y + 38, isSelected ? 'SELECTED' : 'SCAN READY', {
          fontSize: '10px',
          color: isSelected ? '#8ef2d3' : '#9fe7f2',
          fontFamily: 'monospace'
        })
      );

      this.targetObjects.push(
        createButton(
          this,
          this.contentX + 316,
          y + 112,
          120,
          26,
          'Raid Prep',
          () => {
            gameStore.selectScoutTarget(target.id);
            this.scene.start('RaidPrepScene');
          },
          0x35574a
        )
      );
    });
  }

  update(): void {
    gameStore.tick();
  }
}
