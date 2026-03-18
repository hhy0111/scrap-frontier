import Phaser from 'phaser';
import { addUnitImage } from '../app/assets';
import { forceRetreat, resolveRaid, stepRaid, triggerRally } from '../domain/raid/stepRaid';
import { gameStore } from '../state/gameState';
import {
  getCurrentRaid,
  setCurrentRaid,
  setLastRaidResolution
} from '../state/session';
import { createTutorialOverlay } from './TutorialOverlay';
import { createButton, createPanel } from './ui';
import { formatSeconds } from '../utils/time';
import type { RaidState } from '../types/raid';

export class RaidScene extends Phaser.Scene {
  private raid: RaidState | null = null;

  private graphics?: Phaser.GameObjects.Graphics;

  private headerText?: Phaser.GameObjects.Text;

  private squadText?: Phaser.GameObjects.Text;

  private legendText?: Phaser.GameObjects.Text;

  private speedMultiplier = 1;

  private finalized = false;

  constructor() {
    super('RaidScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#11100f');
    this.raid = getCurrentRaid();

    if (!this.raid) {
      this.scene.start('BaseScene');
      return;
    }

    createPanel(this, 18, 14, 1244, 56, undefined, 0x4d3323);
    createPanel(this, 18, 82, 320, 588, 'COMBAT HUD', 0x8ef2d3);
    createPanel(this, 352, 82, 910, 588, 'BATTLEFIELD', 0xd08c55);

    this.add.text(24, 20, 'AUTO RAID', {
      fontSize: '28px',
      color: '#f0c27b',
      fontFamily: 'monospace'
    });

    this.headerText = this.add.text(34, 118, '', {
      fontSize: '18px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 280 }
    });
    this.squadText = this.add.text(34, 228, '', {
      fontSize: '16px',
      color: '#9fe7f2',
      fontFamily: 'monospace',
      wordWrap: { width: 280 }
    });
    this.legendText = this.add.text(34, 470, '', {
      fontSize: '14px',
      color: '#c7bbb0',
      fontFamily: 'monospace',
      wordWrap: { width: 280 }
    });

    this.graphics = this.add.graphics();

    const unitIds = Object.entries(this.raid.selectedSquad)
      .filter(([, count]) => count > 0)
      .map(([unitId]) => unitId);
    unitIds.forEach((unitId, index) => addUnitImage(this, unitId, 54 + index * 52, 188, 34));

    createButton(this, 24, 620, 150, 44, 'Retreat', () => {
      if (this.raid) {
        this.raid = forceRetreat(this.raid);
      }
    }, 0x5a2424);
    createButton(this, 186, 620, 150, 44, 'Rally', () => {
      if (this.raid) {
        this.raid = triggerRally(this.raid);
      }
    }, 0x35574a);
    createButton(this, 348, 620, 150, 44, 'Speed x1/x2', () => {
      this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    }, 0x27424b);

    createTutorialOverlay(this, 'RaidScene');
  }

  private drawActors(): void {
    if (!this.graphics || !this.raid) {
      return;
    }

    this.graphics.clear();
    this.graphics.fillStyle(0x1c2428, 1).fillRect(372, 112, 870, 530);
    this.graphics.lineStyle(2, 0x41535a, 1).strokeRect(372, 112, 870, 530);
    this.graphics.lineBetween(806, 126, 806, 626);

    if (this.raid.entryLane === 'left') {
      this.graphics.fillStyle(0x35574a, 0.2).fillRect(372, 126, 160, 500);
    } else if (this.raid.entryLane === 'mid') {
      this.graphics.fillStyle(0x35574a, 0.2).fillRect(564, 126, 160, 500);
    } else {
      this.graphics.fillStyle(0x35574a, 0.2).fillRect(756, 126, 160, 500);
    }

    const actors = [...this.raid.playerActors, ...this.raid.enemyActors];
    for (const actor of actors) {
      const color =
        actor.team === 'player'
          ? actor.kind === 'unit'
            ? 0x74f0c7
            : 0x5fb0ff
          : actor.kind === 'hq'
            ? 0xb3572b
            : actor.kind === 'turret'
              ? 0xd08c55
              : 0xf2d08d;

      this.graphics.fillStyle(color, actor.alive ? 1 : 0.25);
      if (actor.kind === 'unit') {
        this.graphics.fillCircle(actor.x + 350, actor.y - 20, 14);
      } else {
        this.graphics.fillRect(actor.x + 332, actor.y - 38, 36, 36);
      }

      const hpRatio = Math.max(0, actor.hp) / actor.maxHp;
      this.graphics.fillStyle(0x251d18, 1).fillRect(actor.x + 330, actor.y - 48, 40, 6);
      this.graphics.fillStyle(0x6ef0ca, 1).fillRect(actor.x + 330, actor.y - 48, 40 * hpRatio, 6);
    }
  }

  private finalizeRaid(): void {
    if (!this.raid || this.finalized) {
      return;
    }

    this.finalized = true;
    const resolution = resolveRaid(this.raid);
    gameStore.applyRaidResult(this.raid, resolution);
    setLastRaidResolution(resolution);
    setCurrentRaid(null);
    this.scene.start('ResultScene');
  }

  update(_time: number, delta: number): void {
    if (!this.raid) {
      return;
    }

    if (this.raid.result === 'running') {
      this.raid = stepRaid(this.raid, delta * this.speedMultiplier);
    } else {
      this.finalizeRaid();
    }

    this.drawActors();
    this.headerText?.setText(
      `TIME ${formatSeconds(this.raid.timeSec)}\nRESULT ${this.raid.result.toUpperCase()}\nLANE ${this.raid.entryLane.toUpperCase()}\nSPEED x${this.speedMultiplier}`
    );
    this.squadText?.setText(
      `SQUAD\n${Object.entries(this.raid.selectedSquad)
        .map(([unitId, count]) => `${unitId}:${count}`)
        .join('\n')}\n\nRALLY ${this.raid.rallyActiveSec > 0 ? `ACTIVE ${this.raid.rallyActiveSec.toFixed(1)}s` : `CD ${this.raid.rallyCooldownSec.toFixed(1)}s`}`
    );
    this.legendText?.setText(
      'LEGEND\nCyan circle: player unit\nAmber circle: enemy unit\nOrange square: turret or HQ\n\nRally gives temporary attack speed and movement speed.\nRetreat keeps only half of the current loot.'
    );
  }
}
