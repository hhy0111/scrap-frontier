import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
import { gameStore } from '../state/gameState';
import { getLastRaidResolution, setLastRaidResolution } from '../state/session';
import { createTutorialOverlay } from './TutorialOverlay';
import { createButton, createPanel } from './ui';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b1411');
    const resolution = getLastRaidResolution();
    const battle = gameStore.getState().lastBattle;

    createPanel(this, 18, 14, 1244, 56, undefined, 0x4d3323);
    createPanel(this, 18, 82, 400, 588, 'RESULT SUMMARY', 0x8ef2d3);
    createPanel(this, 432, 82, 830, 588, 'BATTLE REPORT', 0xd08c55);
    addSizedAssetImage(this, 'meta_loading_art', 1024, 404, 420, 280, 0.18).setAngle(5);
    addAssetImage(this, 'ui_icon_raid', 64, 42, 40);

    this.add.text(96, 20, 'RAID RESULT', {
      fontSize: '30px',
      color: '#f4ddb6',
      fontFamily: 'monospace'
    });

    if (resolution && battle) {
      const bannerKey = battle.victory ? 'ui_banner_victory' : 'ui_banner_defeat';
      addSizedAssetImage(this, bannerKey, 848, 178, 640, 170, 0.96).setDepth(1);
      addSizedAssetImage(
        this,
        battle.victory ? 'building_command_center' : 'building_command_center_damaged',
        1088,
        256,
        140,
        140,
        0.96
      ).setDepth(2);

      addAssetImage(this, 'resource_scrap', 48, 236, 34);
      addAssetImage(this, 'resource_power', 48, 278, 34);
      addAssetImage(this, 'resource_core', 48, 320, 34);

      this.add.text(
        34,
        118,
        `RESULT ${resolution.result.toUpperCase()}\nDURATION ${battle.durationSec}s\nTARGET ${battle.targetId}\nVICTORY ${battle.victory ? 'YES' : 'NO'}\n\nOUTCOME\n${battle.victory ? 'Base cracked. Loot secured.' : 'Raid stalled. Recover and re-arm.'}`,
        {
          fontSize: '18px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 360 }
        }
      );

      this.add.text(
        76,
        224,
        `${battle.loot.scrap}\n${battle.loot.power}\n${battle.loot.core}`,
        {
          fontSize: '18px',
          color: '#9fe7f2',
          fontFamily: 'monospace'
        }
      );

      this.add.text(
        450,
        274,
        `SURVIVORS\n${Object.entries(battle.survivors)
          .map(([unitId, count]) => `${unitId}: ${count}`)
          .join('\n')}\n\nLOSSES\n${Object.entries(battle.lost)
          .map(([unitId, count]) => `${unitId}: ${count}`)
          .join('\n')}\n\nNEXT LOOP\n1. Return to base and invest resources.\n2. Refill missing units.\n3. Scout a new target and repeat.`,
        {
          fontSize: '17px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 760 }
        }
      );
    } else {
      this.add.text(34, 118, 'No battle data available.', {
        fontSize: '18px',
        color: '#f3ead9',
        fontFamily: 'monospace'
      });
    }

    createButton(this, 24, 620, 170, 50, 'Back To Base', () => {
      setLastRaidResolution(null);
      this.scene.start('BaseScene');
    });
    createButton(this, 208, 620, 170, 50, 'Scout Again', () => {
      setLastRaidResolution(null);
      this.scene.start('ScoutScene');
    }, 0x27424b);

    createTutorialOverlay(this, 'ResultScene');
  }
}
