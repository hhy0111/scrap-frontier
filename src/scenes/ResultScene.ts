import Phaser from 'phaser';
import { addAssetImage } from '../app/assets';
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

    this.add.text(24, 20, 'RAID RESULT', {
      fontSize: '30px',
      color: '#f4ddb6',
      fontFamily: 'monospace'
    });

    if (resolution && battle) {
      addAssetImage(this, 'resource_scrap', 48, 236, 34);
      addAssetImage(this, 'resource_power', 48, 278, 34);
      addAssetImage(this, 'resource_core', 48, 320, 34);

      this.add.text(
        34,
        118,
        `RESULT ${resolution.result.toUpperCase()}\nDURATION ${battle.durationSec}s\nTARGET ${battle.targetId}\nVICTORY ${battle.victory ? 'YES' : 'NO'}`,
        {
          fontSize: '20px',
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
        118,
        `SURVIVORS\n${Object.entries(battle.survivors)
          .map(([unitId, count]) => `${unitId}: ${count}`)
          .join('\n')}\n\nLOSSES\n${Object.entries(battle.lost)
          .map(([unitId, count]) => `${unitId}: ${count}`)
          .join('\n')}\n\nNEXT LOOP\n1. Return to base and invest resources.\n2. Refill missing units.\n3. Scout a new target and repeat.`,
        {
          fontSize: '18px',
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
