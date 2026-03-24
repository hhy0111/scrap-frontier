import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
import { gameStore } from '../state/gameState';
import { getLastRaidResolution, setLastRaidResolution } from '../state/session';
import { createTutorialOverlay } from './TutorialOverlay';
import { createMobileShell } from './mobileFrame';
import { createButton, createPanel } from './ui';

const formatBreakdown = (items: Record<string, number>): string => {
  const entries = Object.entries(items);

  if (entries.length === 0) {
    return 'none';
  }

  return entries.map(([unitId, count]) => `${unitId}: ${count}`).join('\n');
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(): void {
    const resolution = getLastRaidResolution();
    const battle = gameStore.getState().lastBattle;
    const victory = Boolean(resolution && battle?.victory);
    const shell = createMobileShell(this, {
      title: 'RAID RESULT',
      subtitle: victory ? 'LOOT SECURED' : 'RECOVERY LOOP',
      accent: victory ? 0x8ef2d3 : 0xe39d86,
      iconKey: 'ui_icon_raid',
      backgroundColor: '#1b1411'
    });
    const summaryY = shell.bodyTop;
    const reportY = summaryY + 164;
    const footerButtonY = shell.footerY - 10;

    if (resolution && battle) {
      createPanel(
        this,
        shell.contentX,
        summaryY,
        shell.contentWidth,
        156,
        'SUMMARY',
        victory ? 0x8ef2d3 : 0xe39d86
      );
      createPanel(this, shell.contentX, reportY, shell.contentWidth, 320, 'BATTLE REPORT', 0xd08c55);

      addSizedAssetImage(
        this,
        battle.victory ? 'ui_banner_victory' : 'ui_banner_defeat',
        shell.contentX + 272,
        summaryY + 76,
        150,
        92,
        0.96
      );
      addSizedAssetImage(
        this,
        battle.victory ? 'building_command_center' : 'building_command_center_damaged',
        shell.contentX + 332,
        summaryY + 110,
        58,
        58,
        0.96
      );

      addAssetImage(this, 'resource_scrap', shell.contentX + 30, summaryY + 102, 22);
      addAssetImage(this, 'resource_power', shell.contentX + 30, summaryY + 126, 22);
      addAssetImage(this, 'resource_core', shell.contentX + 30, summaryY + 150, 22);

      this.add.text(
        shell.contentX + 16,
        summaryY + 38,
        [
          `RESULT ${resolution.result.toUpperCase()} | ${battle.victory ? 'VICTORY' : 'DEFEAT'}`,
          `TARGET ${battle.targetId}`,
          `DURATION ${battle.durationSec}s`,
          `LOOT ${battle.loot.scrap}S / ${battle.loot.power}P / ${battle.loot.core}C`
        ].join('\n'),
        {
          fontSize: '12px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 198 }
        }
      );

      this.add.text(
        shell.contentX + 16,
        reportY + 38,
        [
          'SURVIVORS',
          formatBreakdown(battle.survivors),
          '',
          'LOSSES',
          formatBreakdown(battle.lost),
          '',
          'NEXT LOOP',
          '1. Invest loot into base growth.',
          '2. Refill missing units.',
          '3. Scout a fresh target.'
        ].join('\n'),
        {
          fontSize: '12px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 356 }
        }
      );
    } else {
      createPanel(this, shell.contentX, summaryY, shell.contentWidth, 420, 'SUMMARY', 0xe39d86);
      this.add.text(shell.contentX + 16, summaryY + 38, 'No raid data available.\nReturn to base and launch a raid first.', {
        fontSize: '14px',
        color: '#f3ead9',
        fontFamily: 'monospace',
        wordWrap: { width: 356 }
      });
    }

    createButton(this, shell.contentX + 104, footerButtonY, 160, 28, 'Back To Base', () => {
      setLastRaidResolution(null);
      this.scene.start('BaseScene');
    });
    createButton(
      this,
      shell.contentX + 284,
      footerButtonY,
      160,
      28,
      'Scout Again',
      () => {
        setLastRaidResolution(null);
        this.scene.start('ScoutScene');
      },
      0x27424b
    );

    createTutorialOverlay(this, 'ResultScene');
  }
}
