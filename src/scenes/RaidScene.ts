import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
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
import type { RaidActor, RaidState } from '../types/raid';

const FIELD_X = 372;
const FIELD_Y = 112;
const FIELD_WIDTH = 870;
const FIELD_HEIGHT = 530;
const SCREEN_OFFSET_X = 350;
const SCREEN_OFFSET_Y = -20;

const UNIT_LABELS: Record<string, string> = {
  scavenger: 'SCAV',
  rifleman: 'RIFLE',
  shieldbot: 'SHIELD',
  rocket_buggy: 'BUGGY',
  repair_drone: 'DRONE'
};

type ActorSnapshot = {
  hp: number;
  alive: boolean;
  cooldownLeft: number;
};

const toScreenPosition = (actor: RaidActor): { x: number; y: number } => ({
  x: actor.x + SCREEN_OFFSET_X,
  y: actor.y + SCREEN_OFFSET_Y
});

const getLaneBand = (
  lane: RaidState['entryLane']
): { y: number; height: number } => {
  const topMap = {
    left: FIELD_Y + 28,
    mid: FIELD_Y + 190,
    right: FIELD_Y + 352
  };

  return { y: topMap[lane], height: 128 };
};

export class RaidScene extends Phaser.Scene {
  private raid: RaidState | null = null;

  private fieldGraphics?: Phaser.GameObjects.Graphics;

  private overlayGraphics?: Phaser.GameObjects.Graphics;

  private headerText?: Phaser.GameObjects.Text;

  private squadText?: Phaser.GameObjects.Text;

  private legendText?: Phaser.GameObjects.Text;

  private laneMarker?: Phaser.GameObjects.Image;

  private speedMultiplier = 1;

  private finalized = false;

  private actorSprites = new Map<string, Phaser.GameObjects.Image>();

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
    addAssetImage(this, 'ui_icon_raid', 66, 42, 40);

    this.add.text(98, 20, 'AUTO RAID', {
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
    this.squadText = this.add.text(34, 248, '', {
      fontSize: '16px',
      color: '#9fe7f2',
      fontFamily: 'monospace',
      wordWrap: { width: 280 }
    });
    this.legendText = this.add.text(34, 500, '', {
      fontSize: '14px',
      color: '#c7bbb0',
      fontFamily: 'monospace',
      wordWrap: { width: 280 }
    });

    this.createBattlefieldDecor();
    this.createActorSprites();

    this.fieldGraphics = this.add.graphics().setDepth(4);
    this.overlayGraphics = this.add.graphics().setDepth(8);

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

    this.refreshHud();
    this.drawBattlefieldFrame();
    this.updateActorSprites();
    createTutorialOverlay(this, 'RaidScene');
  }

  private createBattlefieldDecor(): void {
    if (!this.raid) {
      return;
    }

    const groundPlacements = [
      { x: 508, y: 252, width: 284, height: 220, angle: -4 },
      { x: 772, y: 252, width: 284, height: 220, angle: 3 },
      { x: 1036, y: 252, width: 284, height: 220, angle: -2 },
      { x: 640, y: 494, width: 320, height: 230, angle: -5 },
      { x: 964, y: 494, width: 320, height: 230, angle: 4 }
    ];

    groundPlacements.forEach((placement) => {
      addSizedAssetImage(
        this,
        'tile_wasteland_ground',
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        0.82
      )
        .setDepth(1)
        .setAngle(placement.angle);
    });

    addSizedAssetImage(this, 'tile_metal_floor', 1094, 258, 236, 188, 0.9)
      .setDepth(2)
      .setAngle(4);
    addSizedAssetImage(this, 'prop_wall_straight', 978, 152, 188, 54, 0.95).setDepth(2);
    addSizedAssetImage(this, 'prop_wall_corner', 1106, 198, 178, 116, 0.96).setDepth(2);
    addSizedAssetImage(this, 'prop_radar_antenna', 1160, 144, 72, 72, 0.96).setDepth(2);
    addSizedAssetImage(this, 'prop_resource_crate', 1056, 504, 106, 74, 0.96).setDepth(2);
    addSizedAssetImage(this, 'prop_fuel_barrels', 1130, 520, 104, 76, 0.96).setDepth(2);
    addSizedAssetImage(this, 'prop_debris_cluster', 496, 522, 122, 86, 0.92).setDepth(2);

    const laneBand = getLaneBand(this.raid.entryLane);
    this.laneMarker = addAssetImage(
      this,
      'fx_target_marker',
      FIELD_X + 52,
      laneBand.y + laneBand.height / 2,
      52
    )
      .setDepth(4)
      .setAlpha(0.72);
  }

  private createActorSprites(): void {
    if (!this.raid) {
      return;
    }

    const actors = [...this.raid.enemyActors, ...this.raid.playerActors];

    actors.forEach((actor) => {
      const sprite = this.createActorSprite(actor);
      this.actorSprites.set(actor.id, sprite);
    });
  }

  private createActorSprite(actor: RaidActor): Phaser.GameObjects.Image {
    const { x, y } = toScreenPosition(actor);
    const textureKey =
      actor.kind === 'unit'
        ? `unit_${actor.sourceId}`
        : actor.kind === 'turret'
          ? 'building_auto_turret'
          : 'building_command_center';
    const sprite =
      actor.kind === 'hq'
        ? addSizedAssetImage(this, textureKey, x + 44, y + 18, 174, 174)
        : actor.kind === 'turret'
          ? addSizedAssetImage(this, textureKey, x + 6, y + 2, 84, 84)
          : addSizedAssetImage(this, textureKey, x, y, 58, 58);

    sprite.setDepth(actor.kind === 'unit' ? 6 : 5);

    if (actor.team === 'enemy' && actor.kind === 'unit') {
      sprite.setTint(0xffd6a0);
    }

    if (actor.team === 'player' && actor.kind === 'unit') {
      sprite.setTint(actor.sourceId === 'repair_drone' ? 0xbfffee : 0xf5ffff);
    }

    return sprite;
  }

  private drawBattlefieldFrame(): void {
    if (!this.fieldGraphics || !this.overlayGraphics || !this.raid) {
      return;
    }

    const laneBand = getLaneBand(this.raid.entryLane);
    const overlayGraphics = this.overlayGraphics;

    this.fieldGraphics.clear();
    this.fieldGraphics.fillStyle(0x170f0c, 0.28).fillRect(FIELD_X, FIELD_Y, FIELD_WIDTH, FIELD_HEIGHT);
    this.fieldGraphics.lineStyle(2, 0x41535a, 1).strokeRect(FIELD_X, FIELD_Y, FIELD_WIDTH, FIELD_HEIGHT);
    this.fieldGraphics.fillStyle(0x3fe0be, 0.09).fillRoundedRect(FIELD_X + 10, laneBand.y, FIELD_WIDTH - 20, laneBand.height, 18);
    this.fieldGraphics.lineStyle(2, 0x67f1d1, 0.55).strokeRoundedRect(FIELD_X + 10, laneBand.y, FIELD_WIDTH - 20, laneBand.height, 18);
    this.fieldGraphics.lineStyle(1, 0x7a604a, 0.65);
    this.fieldGraphics.lineBetween(FIELD_X + 232, FIELD_Y + 20, FIELD_X + 232, FIELD_Y + FIELD_HEIGHT - 20);
    this.fieldGraphics.lineBetween(FIELD_X + 610, FIELD_Y + 20, FIELD_X + 610, FIELD_Y + FIELD_HEIGHT - 20);
    this.laneMarker?.setPosition(FIELD_X + 52, laneBand.y + laneBand.height / 2);

    overlayGraphics.clear();

    const actors = [...this.raid.playerActors, ...this.raid.enemyActors];
    actors.forEach((actor) => {
      const { x, y } = toScreenPosition(actor);
      const width = actor.kind === 'hq' ? 84 : actor.kind === 'turret' ? 50 : 40;
      const barX = actor.kind === 'hq' ? x + 4 : x - width / 2;
      const barY = actor.kind === 'hq' ? y - 74 : actor.kind === 'turret' ? y - 38 : y - 34;
      const hpRatio = Math.max(0, actor.hp) / actor.maxHp;
      const hpColor = actor.team === 'player' ? 0x6ef0ca : 0xffb560;

      overlayGraphics.fillStyle(0x221713, 0.95).fillRect(barX, barY, width, 6);
      overlayGraphics.fillStyle(hpColor, actor.alive ? 1 : 0.25).fillRect(
        barX,
        barY,
        width * hpRatio,
        6
      );
    });
  }

  private updateActorSprites(): void {
    if (!this.raid) {
      return;
    }

    const actors = [...this.raid.playerActors, ...this.raid.enemyActors];

    actors.forEach((actor) => {
      const sprite = this.actorSprites.get(actor.id);
      if (!sprite) {
        return;
      }

      const { x, y } = toScreenPosition(actor);
      const isDestroyedHq = actor.kind === 'hq' && actor.hp / actor.maxHp < 0.45;

      if (actor.kind === 'hq') {
        sprite.setPosition(x + 44, y + 18);
        sprite.setDisplaySize(174, 174);
        sprite.setTexture(isDestroyedHq ? 'building_command_center_damaged' : 'building_command_center');
      } else if (actor.kind === 'turret') {
        sprite.setPosition(x + 6, y + 2);
        sprite.setDisplaySize(84, 84);
      } else {
        sprite.setPosition(x, y);
        sprite.setDisplaySize(58, 58);
      }

      sprite.setAlpha(actor.alive ? 1 : 0.24);
      sprite.setScale(actor.alive ? 1 : 0.92);
    });
  }

  private spawnFx(
    textureKey: string,
    x: number,
    y: number,
    width: number,
    height: number,
    duration = 260,
    targetScale = 1.24
  ): void {
    const fx = addSizedAssetImage(this, textureKey, x, y, width, height).setDepth(9);

    this.tweens.add({
      targets: fx,
      alpha: 0,
      scaleX: targetScale,
      scaleY: targetScale,
      duration,
      ease: 'Quad.Out',
      onComplete: () => fx.destroy()
    });
  }

  private emitCombatFx(previousRaid: RaidState, currentRaid: RaidState): void {
    const previousActors = new Map<string, ActorSnapshot>();

    [...previousRaid.playerActors, ...previousRaid.enemyActors].forEach((actor) => {
      previousActors.set(actor.id, {
        hp: actor.hp,
        alive: actor.alive,
        cooldownLeft: actor.cooldownLeft
      });
    });

    [...currentRaid.playerActors, ...currentRaid.enemyActors].forEach((actor) => {
      const previous = previousActors.get(actor.id);
      if (!previous) {
        return;
      }

      const { x, y } = toScreenPosition(actor);

      if (previous.cooldownLeft <= 0.05 && actor.cooldownLeft > 0.2 && actor.alive) {
        if (actor.heal > 0) {
          this.spawnFx('fx_repair_pulse', x, y, 84, 84, 360, 1.15);
        } else if (actor.sourceId === 'rocket_buggy') {
          this.spawnFx('fx_rocket_launch', x + 12, y - 10, 76, 76, 320, 1.12);
        } else {
          this.spawnFx('fx_muzzle_flash_small', x + 12, y - 10, 54, 54, 180, 1.08);
        }
      }

      if (actor.hp > previous.hp + 0.5) {
        this.spawnFx('fx_repair_pulse', x, y, 78, 78, 320, 1.14);
      } else if (actor.hp < previous.hp - 0.5) {
        this.spawnFx('fx_bullet_impact', x, y, 64, 64, 220, 1.18);
      }

      if (previous.alive && !actor.alive) {
        this.spawnFx(
          'fx_explosion_medium',
          x,
          y,
          actor.kind === 'hq' ? 180 : 118,
          actor.kind === 'hq' ? 180 : 118,
          420,
          1.26
        );
        this.spawnFx(
          'fx_destroyed_smoke',
          x,
          y - 6,
          actor.kind === 'hq' ? 168 : 106,
          actor.kind === 'hq' ? 168 : 106,
          860,
          1.06
        );
      }
    });

    if (previousRaid.rallyActiveSec <= 0 && currentRaid.rallyActiveSec > 0) {
      const laneBand = getLaneBand(currentRaid.entryLane);
      this.spawnFx('fx_repair_pulse', FIELD_X + 110, laneBand.y + laneBand.height / 2, 132, 132, 480, 1.18);
      this.spawnFx('fx_target_marker', FIELD_X + 170, laneBand.y + laneBand.height / 2, 108, 108, 420, 1.06);
    }
  }

  private refreshHud(): void {
    if (!this.raid) {
      return;
    }

    const alivePlayerUnits = this.raid.playerActors.filter((actor) => actor.alive).length;
    const aliveEnemyUnits = this.raid.enemyActors.filter(
      (actor) => actor.alive && actor.kind === 'unit'
    ).length;
    const aliveTurrets = this.raid.enemyActors.filter(
      (actor) => actor.alive && actor.kind === 'turret'
    ).length;

    this.headerText?.setText(
      `TIME ${formatSeconds(this.raid.timeSec)}\nRESULT ${this.raid.result.toUpperCase()}\nLANE ${this.raid.entryLane.toUpperCase()}\nSPEED x${this.speedMultiplier}\n\nPLAYER ${alivePlayerUnits} alive\nENEMY ${aliveEnemyUnits} + TURRET ${aliveTurrets}`
    );
    this.squadText?.setText(
      `SQUAD\n${Object.entries(this.raid.selectedSquad)
        .map(([unitId, count]) => `${UNIT_LABELS[unitId] ?? unitId}: ${count}`)
        .join('\n')}\n\nRALLY ${this.raid.rallyActiveSec > 0 ? `ACTIVE ${this.raid.rallyActiveSec.toFixed(1)}s` : `CD ${this.raid.rallyCooldownSec.toFixed(1)}s`}`
    );
    this.legendText?.setText(
      'BATTLEFLOW\nGreen band is the chosen entry route.\nUnits auto-move and attack by range.\nHQ shifts to damaged art at low HP.\n\nRally boosts movement and attack cadence.\nRetreat keeps only half of current loot.'
    );
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

    const previousRaid = structuredClone(this.raid) as RaidState;

    if (this.raid.result === 'running') {
      this.raid = stepRaid(this.raid, delta * this.speedMultiplier);
      this.emitCombatFx(previousRaid, this.raid);
    } else {
      this.finalizeRaid();
      return;
    }

    this.drawBattlefieldFrame();
    this.updateActorSprites();
    this.refreshHud();

    if (this.raid.result !== 'running') {
      this.finalizeRaid();
    }
  }
}
