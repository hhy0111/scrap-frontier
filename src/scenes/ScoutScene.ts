import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
import { gameStore } from '../state/gameState';
import { createTutorialOverlay } from './TutorialOverlay';
import { createButton, createPanel } from './ui';

export class ScoutScene extends Phaser.Scene {
  private targetTexts: Phaser.GameObjects.Text[] = [];

  private targetObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('ScoutScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#10171b');
    createPanel(this, 18, 14, 1244, 56, undefined, 0x35574a);
    createPanel(this, 18, 82, 1244, 588, 'SCOUT TARGETS', 0x8ef2d3);
    addSizedAssetImage(this, 'meta_loading_art', 1004, 376, 480, 270, 0.24).setAngle(-6);
    addAssetImage(this, 'ui_icon_scout', 66, 42, 42);

    this.add.text(98, 20, 'SCOUT TARGETS', {
      fontSize: '28px',
      color: '#9fe7f2',
      fontFamily: 'monospace'
    });

    createButton(this, 24, 620, 140, 48, 'Back', () => this.scene.start('BaseScene'));
    createButton(this, 176, 620, 180, 48, 'Refresh Targets', () => {
      gameStore.refreshScoutTargets();
      this.renderTargets();
    }, 0x27424b);

    this.renderTargets();
    createTutorialOverlay(this, 'ScoutScene');
  }

  private renderTargets(): void {
    this.targetTexts.forEach((text) => text.destroy());
    this.targetObjects.forEach((object) => object.destroy());
    this.targetTexts = [];
    this.targetObjects = [];

    const state = gameStore.getState();

    state.base.scoutTargets.forEach((target, index) => {
      const x = 36 + index * 406;
      const y = 116;
      const isSelected = target.id === state.base.selectedScoutTargetId;

      const panel = this.add
        .rectangle(x, y, 384, 470, isSelected ? 0x17343b : 0x1a2023, 1)
        .setOrigin(0)
        .setStrokeStyle(2, isSelected ? 0x8ef2d3 : 0x53727b);
      this.targetObjects.push(panel);
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerdown', () => {
        gameStore.selectScoutTarget(target.id);
        this.renderTargets();
      });

      this.add.rectangle(x, y, 384, 56, 0x284148, 0.45).setOrigin(0);
      const cardArt = addSizedAssetImage(this, 'ui_scout_card', x + 192, y + 154, 344, 210, 0.96);
      this.targetObjects.push(cardArt);
      const targetPreview = addSizedAssetImage(
        this,
        'building_command_center',
        x + 278,
        y + 168,
        136,
        136,
        0.92
      );
      this.targetObjects.push(targetPreview);
      const marker = addAssetImage(this, 'fx_target_marker', x + 96, y + 164, 96).setAlpha(
        isSelected ? 0.95 : 0.35
      );
      marker.setAngle(isSelected ? 10 : -8);
      this.targetObjects.push(marker);
      const difficultyColor =
        target.difficulty === 'elite'
          ? '#ffb38a'
          : target.difficulty === 'hard'
            ? '#ffd18a'
            : target.difficulty === 'normal'
              ? '#9fe7f2'
              : '#8ef2d3';

      const text = this.add.text(
        x + 18,
        y + 18,
        `${target.name}\nDIFF ${target.difficulty.toUpperCase()} | RECOMMENDED ${target.recommendedPower}`,
        {
          fontSize: '18px',
          color: difficultyColor,
          fontFamily: 'monospace',
          wordWrap: { width: 340 }
        }
      );
      this.targetTexts.push(text);

      addAssetImage(this, 'resource_scrap', x + 34, y + 120, 30);
      addAssetImage(this, 'resource_power', x + 34, y + 166, 30);
      addAssetImage(this, 'resource_core', x + 34, y + 212, 30);

      const detail = this.add.text(
        x + 60,
        y + 258,
        `SCRAP ${target.storedRewards.scrap}\nPOWER ${target.storedRewards.power}\nCORE ${target.storedRewards.core}\n\nZONE ${target.zoneTier}\nSTATUS ${isSelected ? 'LOCKED TARGET' : 'SCAN READY'}\n\nPrepare Raid로 분대 편성과 진입 라인을 정한다.`,
        {
          fontSize: '16px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 292 }
        }
      );
      this.targetTexts.push(detail);

      const attackButton = createButton(
        this,
        x + 18,
        y + 398,
        348,
        52,
        'Prepare Raid',
        () => {
          gameStore.selectScoutTarget(target.id);
          this.scene.start('RaidPrepScene');
        },
        0x35574a
      );
      this.targetObjects.push(attackButton);
      const attackIcon = addAssetImage(this, 'ui_icon_raid', x + 56, y + 424, 28);
      this.targetObjects.push(attackIcon);
    });
  }
}
