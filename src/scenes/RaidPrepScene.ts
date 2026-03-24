import Phaser from 'phaser';
import { addUnitImage } from '../app/assets';
import { getSquadPower } from '../domain/ai/generateScoutTargets';
import { getUnlockMilestoneItems, getUpcomingUnlockMilestones, getUnlockStatus } from '../domain/meta/unlocks';
import { buildRaidSquad, startRaid } from '../domain/raid/startRaid';
import { balance, gameStore } from '../state/gameState';
import { setCurrentRaid } from '../state/session';
import { createTutorialOverlay } from './TutorialOverlay';
import { createMobileShell } from './mobileFrame';
import { createButton, createPanel } from './ui';
import type { EntryLane } from '../types/raid';

const summarizeUnlocks = (labels: string[], maxItems = 4): string =>
  labels.length <= maxItems ? labels.join(' / ') : `${labels.slice(0, maxItems).join(' / ')} +${labels.length - maxItems}`;

export class RaidPrepScene extends Phaser.Scene {
  private squad: Record<string, number> = {};

  private entryLane: EntryLane = 'mid';

  private targetText?: Phaser.GameObjects.Text;

  private summaryText?: Phaser.GameObjects.Text;

  private unitTexts: Record<string, Phaser.GameObjects.Text> = {};

  private laneButtons: Partial<Record<EntryLane, Phaser.GameObjects.Container>> = {};

  private contentX = 0;

  constructor() {
    super('RaidPrepScene');
  }

  create(): void {
    const target = gameStore.getSelectedScoutTarget();

    if (!target) {
      this.scene.start('ScoutScene');
      return;
    }

    this.squad = buildRaidSquad(gameStore.getState(), balance);

    const shell = createMobileShell(this, {
      title: 'RAID PREP',
      subtitle: 'SQUAD + ENTRY SETUP',
      accent: 0xd08c55,
      iconKey: 'ui_icon_raid',
      backgroundColor: '#17130f'
    });
    const targetY = shell.bodyTop;
    const laneY = targetY + 118;
    const squadY = laneY + 66;
    const summaryY = squadY + 258;
    const footerButtonY = shell.footerY - 10;

    this.contentX = shell.contentX;

    createPanel(this, shell.contentX, targetY, shell.contentWidth, 110, 'TARGET', 0x8ef2d3);
    createPanel(this, shell.contentX, laneY, shell.contentWidth, 58, 'ENTRY LANE', 0x35574a);
    createPanel(this, shell.contentX, squadY, shell.contentWidth, 250, 'SQUAD LOADOUT', 0xd08c55);
    createPanel(this, shell.contentX, summaryY, shell.contentWidth, 90, 'ENTRY SUMMARY', 0x4d3323);

    this.targetText = this.add.text(shell.contentX + 16, targetY + 38, '', {
      fontSize: '12px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });
    this.summaryText = this.add.text(shell.contentX + 16, summaryY + 36, '', {
      fontSize: '11px',
      color: '#d8fff5',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });

    this.createLaneSelectors(laneY);
    this.createUnitRows(squadY + 34);

    createButton(this, shell.contentX + 52, footerButtonY, 88, 28, 'Back', () => this.scene.start('ScoutScene'));
    createButton(
      this,
      shell.contentX + 182,
      footerButtonY,
      120,
      28,
      'Auto Squad',
      () => {
        this.squad = buildRaidSquad(gameStore.getState(), balance);
        this.refresh();
      },
      0x27424b
    );
    createButton(
      this,
      shell.contentX + 326,
      footerButtonY,
      140,
      28,
      'Start Raid',
      () => {
        const targetNow = gameStore.getSelectedScoutTarget();

        if (!targetNow) {
          return;
        }

        const raid = startRaid(
          gameStore.getState(),
          balance,
          targetNow,
          this.squad,
          this.entryLane
        );

        if (!raid) {
          return;
        }

        setCurrentRaid(raid);
        this.scene.start('RaidScene');
      },
      0x35574a
    );

    this.refresh();
    createTutorialOverlay(this, 'RaidPrepScene');
  }

  private createLaneSelectors(laneY: number): void {
    const lanes: EntryLane[] = ['left', 'mid', 'right'];

    lanes.forEach((lane, index) => {
      this.laneButtons[lane] = createButton(
        this,
        this.contentX + 74 + index * 124,
        laneY + 43,
        108,
        24,
        lane.toUpperCase(),
        () => {
          this.entryLane = lane;
          this.refresh();
        },
        0x243337
      );
    });
  }

  private createUnitRows(startY: number): void {
    balance.units.forEach((unit, index) => {
      const y = startY + index * 42;

      this.add
        .rectangle(this.contentX + 12, y, 364, 38, 0x1f2326, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x556066);
      addUnitImage(this, unit.id, this.contentX + 28, y + 19, 22);
      this.add.text(this.contentX + 46, y + 8, `${unit.name}\n${unit.role.toUpperCase()}`, {
        fontSize: '10px',
        color: '#f3ead9',
        fontFamily: 'monospace'
      });

      createButton(this, this.contentX + 320, y + 19, 28, 24, '-', () => {
        this.adjustUnit(unit.id, -1);
      }, 0x4c2a2a);
      createButton(this, this.contentX + 354, y + 19, 28, 24, '+', () => {
        this.adjustUnit(unit.id, 1);
      }, 0x244232);

      this.unitTexts[unit.id] = this.add.text(this.contentX + 242, y + 9, '', {
        fontSize: '10px',
        color: '#9fe7f2',
        fontFamily: 'monospace',
        wordWrap: { width: 56 }
      });
    });
  }

  private adjustUnit(unitId: string, delta: number): void {
    const state = gameStore.getState();
    const current = this.squad[unitId] ?? 0;
    const maxOwned = state.roster[unitId] ?? 0;
    const currentTotal = Object.values(this.squad).reduce((sum, count) => sum + count, 0);

    if (delta > 0) {
      if (current >= maxOwned || currentTotal >= balance.config.raidSquadSize) {
        return;
      }
      this.squad[unitId] = current + 1;
    } else {
      this.squad[unitId] = Math.max(0, current - 1);
    }

    this.refresh();
  }

  private refresh(): void {
    const target = gameStore.getSelectedScoutTarget();
    const state = gameStore.getState();

    if (!target) {
      return;
    }

    this.targetText?.setText(
      [
        `${target.name} | ${target.difficulty.toUpperCase()} | ZONE ${target.zoneTier}`,
        `RECOMMENDED ${target.recommendedPower} | DEF ${target.defenderCount} | T ${target.turrets}`,
        `REWARDS ${target.storedRewards.scrap}S / ${target.storedRewards.power}P / ${target.storedRewards.core}C`,
        'Tune squad size, then pick the safest entry lane.'
      ].join('\n')
    );

    const totalUnits = Object.values(this.squad).reduce((sum, count) => sum + count, 0);
    const squadPower = getSquadPower(this.squad, balance, state.meta.researches);
    const unlockMilestone = getUpcomingUnlockMilestones(state, balance, 1)[0];
    const unlockStatus = getUnlockStatus(state, balance);
    const garageNeed = unlockStatus.facilityNeeds.find((entry) => entry.buildingLabel === 'GARAGE');
    this.summaryText?.setText(
      [
        `SQUAD ${totalUnits}/${balance.config.raidSquadSize} | POWER ${squadPower} / ${target.recommendedPower}`,
        `LANE ${this.entryLane.toUpperCase()} | START RAID WHEN POWER FEELS SAFE`,
        garageNeed
          ? `BUILD GARAGE FOR ${summarizeUnlocks(garageNeed.unitLabels, 3)}`
          : unlockMilestone
            ? `NEXT HQ${unlockMilestone.hqLevel} ${summarizeUnlocks(getUnlockMilestoneItems(unlockMilestone), 4)}`
            : 'ALL CORE UNLOCKS OPEN'
      ].join('\n')
    );

    for (const unit of balance.units) {
      const owned = state.roster[unit.id] ?? 0;
      const selected = this.squad[unit.id] ?? 0;
      this.unitTexts[unit.id]?.setText(`OWN ${owned}\nSEL ${selected}`);
    }

    (['left', 'mid', 'right'] as const).forEach((lane) => {
      this.laneButtons[lane]?.setAlpha(this.entryLane === lane ? 1 : 0.55);
    });
  }

  update(): void {
    gameStore.tick();
    this.refresh();
  }
}
