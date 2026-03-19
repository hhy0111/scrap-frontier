import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage, addUnitImage } from '../app/assets';
import { getSquadPower } from '../domain/ai/generateScoutTargets';
import { buildRaidSquad, startRaid } from '../domain/raid/startRaid';
import { balance, gameStore } from '../state/gameState';
import { setCurrentRaid } from '../state/session';
import { createTutorialOverlay } from './TutorialOverlay';
import { createButton, createPanel } from './ui';
import type { EntryLane } from '../types/raid';

export class RaidPrepScene extends Phaser.Scene {
  private squad: Record<string, number> = {};

  private entryLane: EntryLane = 'mid';

  private summaryText?: Phaser.GameObjects.Text;

  private targetText?: Phaser.GameObjects.Text;

  private unitTexts: Record<string, Phaser.GameObjects.Text> = {};

  private laneTexts: Record<EntryLane, Phaser.GameObjects.Text | undefined> = {
    left: undefined,
    mid: undefined,
    right: undefined
  };

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
    this.cameras.main.setBackgroundColor('#17130f');
    createPanel(this, 18, 14, 1244, 56, undefined, 0x4d3323);
    createPanel(this, 18, 82, 450, 590, 'TARGET OVERVIEW', 0x8ef2d3);
    createPanel(this, 482, 82, 780, 590, 'SQUAD SETUP', 0xd08c55);
    addAssetImage(this, 'ui_icon_raid', 64, 42, 40);

    this.add.text(92, 20, 'RAID PREP', {
      fontSize: '28px',
      color: '#f2d2a4',
      fontFamily: 'monospace'
    });

    addSizedAssetImage(this, 'ui_scout_card', 243, 204, 390, 220, 0.94);
    addSizedAssetImage(this, 'building_command_center', 286, 208, 160, 160, 0.94);
    addAssetImage(this, 'fx_target_marker', 116, 206, 92).setAlpha(0.9);

    this.targetText = this.add.text(34, 118, '', {
      fontSize: '17px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 412 }
    });

    this.summaryText = this.add.text(34, 462, '', {
      fontSize: '18px',
      color: '#9fe7f2',
      fontFamily: 'monospace',
      wordWrap: { width: 390 }
    });

    this.createLaneSelectors();
    this.createUnitRows();

    createButton(this, 24, 620, 150, 48, 'Back', () => this.scene.start('ScoutScene'));
    createButton(this, 188, 620, 170, 48, 'Auto Squad', () => {
      this.squad = buildRaidSquad(gameStore.getState(), balance);
      this.refresh();
    }, 0x27424b);
    createButton(this, 372, 620, 220, 48, 'Start Raid', () => {
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
    }, 0x35574a);

    this.refresh();
    createTutorialOverlay(this, 'RaidPrepScene');
  }

  private createLaneSelectors(): void {
    this.add.text(502, 118, 'ENTRY LANE', {
      fontSize: '18px',
      color: '#f3ead9',
      fontFamily: 'monospace'
    });

    const lanes: EntryLane[] = ['left', 'mid', 'right'];
    lanes.forEach((lane, index) => {
      createButton(
        this,
        502 + index * 148,
        152,
        132,
        42,
        lane.toUpperCase(),
        () => {
          this.entryLane = lane;
          this.refresh();
        },
        0x243337
      );
      this.laneTexts[lane] = this.add.text(568 + index * 148, 202, '', {
        fontSize: '14px',
        color: '#9fe7f2',
        fontFamily: 'monospace'
      }).setOrigin(0.5, 0);
    });
  }

  private createUnitRows(): void {
    const units = balance.units;
    units.forEach((unit, index) => {
      const y = 232 + index * 72;
      this.add.rectangle(502, y, 728, 58, 0x1f2326, 1).setOrigin(0).setStrokeStyle(1, 0x556066);
      addUnitImage(this, unit.id, 536, y + 29, 40);
      this.add.text(564, y + 10, `${unit.name}\n${unit.role.toUpperCase()}`, {
        fontSize: '15px',
        color: '#f3ead9',
        fontFamily: 'monospace'
      });

      createButton(this, 924, y + 8, 42, 42, '-', () => {
        this.adjustUnit(unit.id, -1);
      }, 0x4c2a2a);
      createButton(this, 1172, y + 8, 42, 42, '+', () => {
        this.adjustUnit(unit.id, 1);
      }, 0x244232);

      this.unitTexts[unit.id] = this.add.text(984, y + 16, '', {
        fontSize: '16px',
        color: '#9fe7f2',
        fontFamily: 'monospace'
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
      `${target.name}\nDIFF ${target.difficulty.toUpperCase()} | ZONE ${target.zoneTier}\nRECOMMENDED POWER ${target.recommendedPower}\n\nREWARDS\nSCRAP ${target.storedRewards.scrap}\nPOWER ${target.storedRewards.power}\nCORE ${target.storedRewards.core}\n\nTIP\n기본은 MID 라인이다.\n좌우 라인은 적 터렛 사선을 비틀 때 쓴다.`
    );

    const totalUnits = Object.values(this.squad).reduce((sum, count) => sum + count, 0);
    const squadPower = getSquadPower(this.squad, balance);
    this.summaryText?.setText(
      `SQUAD ${totalUnits}/${balance.config.raidSquadSize}\nPOWER ${squadPower} / TARGET ${target.recommendedPower}\nLANE ${this.entryLane.toUpperCase()}\n\n추천보다 전투력이 낮아도 승리는 가능하지만 손실률이 커진다.`
    );

    for (const unit of balance.units) {
      const owned = state.roster[unit.id] ?? 0;
      const selected = this.squad[unit.id] ?? 0;
      this.unitTexts[unit.id]?.setText(`OWNED ${owned} / SELECTED ${selected}`);
    }

    (['left', 'mid', 'right'] as const).forEach((lane) => {
      this.laneTexts[lane]?.setText(this.entryLane === lane ? 'ACTIVE' : '');
    });
  }
}
