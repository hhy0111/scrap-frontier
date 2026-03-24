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
import { createMobileShell } from './mobileFrame';
import { createButton, createPanel } from './ui';
import { formatSeconds } from '../utils/time';
import type { RaidActor, RaidState } from '../types/raid';

const ORIGINAL_FIELD_RECT = {
  x: 372,
  y: 112,
  width: 870,
  height: 530
};
const SCREEN_OFFSET_X = 350;
const SCREEN_OFFSET_Y = -20;

const UNIT_LABELS: Record<string, string> = {
  scavenger: 'SCAV',
  rifleman: 'RIFLE',
  shieldbot: 'SHIELD',
  rocket_buggy: 'BUGGY',
  repair_drone: 'DRONE'
};

const ENTRY_NOTES: Record<RaidState['entryLane'], string> = {
  left: 'LEFT FLANK',
  mid: 'CENTER PUSH',
  right: 'RIGHT SWEEP'
};

type ActorSnapshot = {
  hp: number;
  alive: boolean;
  cooldownLeft: number;
};

type FieldPlacement = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha?: number;
  angle?: number;
  depth?: number;
};

const GROUND_PLACEMENTS: FieldPlacement[] = [
  { key: 'tile_wasteland_ground', x: 508, y: 252, width: 284, height: 220, alpha: 0.82, angle: -4, depth: 1 },
  { key: 'tile_wasteland_ground', x: 772, y: 252, width: 284, height: 220, alpha: 0.82, angle: 3, depth: 1 },
  { key: 'tile_wasteland_ground', x: 1036, y: 252, width: 284, height: 220, alpha: 0.82, angle: -2, depth: 1 },
  { key: 'tile_wasteland_ground', x: 640, y: 494, width: 320, height: 230, alpha: 0.82, angle: -5, depth: 1 },
  { key: 'tile_wasteland_ground', x: 964, y: 494, width: 320, height: 230, alpha: 0.82, angle: 4, depth: 1 },
  { key: 'tile_metal_floor', x: 1094, y: 258, width: 236, height: 188, alpha: 0.9, angle: 4, depth: 2 },
  { key: 'prop_wall_straight', x: 978, y: 152, width: 188, height: 54, alpha: 0.95, depth: 2 },
  { key: 'prop_wall_corner', x: 1106, y: 198, width: 178, height: 116, alpha: 0.96, depth: 2 },
  { key: 'prop_radar_antenna', x: 1160, y: 144, width: 72, height: 72, alpha: 0.96, depth: 2 },
  { key: 'prop_resource_crate', x: 1056, y: 504, width: 106, height: 74, alpha: 0.96, depth: 2 },
  { key: 'prop_fuel_barrels', x: 1130, y: 520, width: 104, height: 76, alpha: 0.96, depth: 2 },
  { key: 'prop_debris_cluster', x: 496, y: 522, width: 122, height: 86, alpha: 0.92, depth: 2 }
];

const toScreenPosition = (actor: RaidActor): { x: number; y: number } => ({
  x: actor.x + SCREEN_OFFSET_X,
  y: actor.y + SCREEN_OFFSET_Y
});

const getLaneBand = (
  lane: RaidState['entryLane']
): { y: number; height: number } => {
  const topMap = {
    left: ORIGINAL_FIELD_RECT.y + 28,
    mid: ORIGINAL_FIELD_RECT.y + 190,
    right: ORIGINAL_FIELD_RECT.y + 352
  };

  return { y: topMap[lane], height: 128 };
};

export class RaidScene extends Phaser.Scene {
  private raid: RaidState | null = null;

  private fieldRect = new Phaser.Geom.Rectangle();

  private fieldGraphics?: Phaser.GameObjects.Graphics;

  private overlayGraphics?: Phaser.GameObjects.Graphics;

  private headerText?: Phaser.GameObjects.Text;

  private squadText?: Phaser.GameObjects.Text;

  private legendText?: Phaser.GameObjects.Text;

  private laneMarker?: Phaser.GameObjects.Image;

  private speedMultiplier = 1;

  private finalized = false;

  private captureHold = false;

  private actorSprites = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('RaidScene');
  }

  create(): void {
    this.raid = getCurrentRaid();
    const debugQuery = new URLSearchParams(window.location.search);
    this.captureHold = debugQuery.get('raidDebug') === 'hold';

    if (!this.raid) {
      this.scene.start('BaseScene');
      return;
    }

    const shell = createMobileShell(this, {
      title: 'AUTO RAID',
      subtitle: 'PORTRAIT COMBAT FEED',
      accent: 0xd08c55,
      iconKey: 'ui_icon_raid',
      backgroundColor: '#13100d'
    });
    const commandY = shell.bodyTop;
    const fieldY = commandY + 92;
    const squadY = fieldY + 298;
    const briefY = squadY + 100;
    const footerButtonY = shell.footerY - 10;

    createPanel(this, shell.contentX, commandY, shell.contentWidth, 84, 'COMBAT HUD', 0x8ef2d3);
    createPanel(this, shell.contentX, fieldY, shell.contentWidth, 290, 'BATTLEFIELD', 0xd08c55);
    createPanel(this, shell.contentX, squadY, shell.contentWidth, 92, 'SQUAD / LOOT', 0x35574a);
    createPanel(this, shell.contentX, briefY, shell.contentWidth, 58, 'COMBAT BRIEF', 0x4d3323);

    this.fieldRect.setTo(shell.contentX + 10, fieldY + 38, shell.contentWidth - 20, 236);

    this.headerText = this.add.text(shell.contentX + 16, commandY + 38, '', {
      fontSize: '11px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });
    this.squadText = this.add.text(shell.contentX + 16, squadY + 38, '', {
      fontSize: '11px',
      color: '#d8fff5',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });
    this.legendText = this.add.text(shell.contentX + 16, briefY + 34, '', {
      fontSize: '10px',
      color: '#d8c7bb',
      fontFamily: 'monospace',
      wordWrap: { width: 356 }
    });

    this.createBattlefieldDecor();
    this.createActorSprites();

    this.fieldGraphics = this.add.graphics().setDepth(4);
    this.overlayGraphics = this.add.graphics().setDepth(8);

    createButton(this, shell.contentX + 58, footerButtonY, 96, 28, 'Retreat', () => {
      if (this.raid) {
        this.raid = forceRetreat(this.raid);
        setCurrentRaid(this.raid);
      }
    }, 0x5a2424);
    createButton(this, shell.contentX + 194, footerButtonY, 112, 28, 'Rally', () => {
      if (this.raid) {
        this.raid = triggerRally(this.raid);
        setCurrentRaid(this.raid);
      }
    }, 0x35574a);
    createButton(this, shell.contentX + 328, footerButtonY, 120, 28, 'Speed x1/x2', () => {
      this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    }, 0x27424b);

    this.refreshHud();
    this.drawBattlefieldFrame();
    this.updateActorSprites();
    createTutorialOverlay(this, 'RaidScene');
  }

  private mapFieldPoint(x: number, y: number): { x: number; y: number } {
    return {
      x:
        this.fieldRect.x +
        ((x - ORIGINAL_FIELD_RECT.x) / ORIGINAL_FIELD_RECT.width) * this.fieldRect.width,
      y:
        this.fieldRect.y +
        ((y - ORIGINAL_FIELD_RECT.y) / ORIGINAL_FIELD_RECT.height) * this.fieldRect.height
    };
  }

  private scaleFieldWidth(width: number): number {
    return (width / ORIGINAL_FIELD_RECT.width) * this.fieldRect.width;
  }

  private scaleFieldHeight(height: number): number {
    return (height / ORIGINAL_FIELD_RECT.height) * this.fieldRect.height;
  }

  private createFieldImage(placement: FieldPlacement): Phaser.GameObjects.Image {
    const point = this.mapFieldPoint(placement.x, placement.y);
    return addSizedAssetImage(
      this,
      placement.key,
      point.x,
      point.y,
      this.scaleFieldWidth(placement.width),
      this.scaleFieldHeight(placement.height),
      placement.alpha ?? 1
    )
      .setAngle(placement.angle ?? 0)
      .setDepth(placement.depth ?? 1);
  }

  private createBattlefieldDecor(): void {
    if (!this.raid) {
      return;
    }

    GROUND_PLACEMENTS.forEach((placement) => {
      this.createFieldImage(placement);
    });

    const laneBand = getLaneBand(this.raid.entryLane);
    const laneMarkerPoint = this.mapFieldPoint(
      ORIGINAL_FIELD_RECT.x + 52,
      laneBand.y + laneBand.height / 2
    );
    this.laneMarker = addAssetImage(
      this,
      'fx_target_marker',
      laneMarkerPoint.x,
      laneMarkerPoint.y,
      Math.max(24, this.scaleFieldWidth(52))
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
    const position = toScreenPosition(actor);
    const textureKey =
      actor.kind === 'unit'
        ? `unit_${actor.sourceId}`
        : actor.kind === 'turret'
          ? 'building_auto_turret'
          : 'building_command_center';

    const sprite =
      actor.kind === 'hq'
        ? addSizedAssetImage(
            this,
            textureKey,
            this.mapFieldPoint(position.x + 44, position.y + 18).x,
            this.mapFieldPoint(position.x + 44, position.y + 18).y,
            this.scaleFieldWidth(174),
            this.scaleFieldHeight(174)
          )
        : actor.kind === 'turret'
          ? addSizedAssetImage(
              this,
              textureKey,
              this.mapFieldPoint(position.x + 6, position.y + 2).x,
              this.mapFieldPoint(position.x + 6, position.y + 2).y,
              this.scaleFieldWidth(84),
              this.scaleFieldHeight(84)
            )
          : addSizedAssetImage(
              this,
              textureKey,
              this.mapFieldPoint(position.x, position.y).x,
              this.mapFieldPoint(position.x, position.y).y,
              this.scaleFieldWidth(58),
              this.scaleFieldHeight(58)
            );

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
    const laneTop = this.mapFieldPoint(ORIGINAL_FIELD_RECT.x, laneBand.y).y;
    const laneHeight = this.scaleFieldHeight(laneBand.height);
    const dividerLeft = this.mapFieldPoint(ORIGINAL_FIELD_RECT.x + 232, ORIGINAL_FIELD_RECT.y).x;
    const dividerRight = this.mapFieldPoint(ORIGINAL_FIELD_RECT.x + 610, ORIGINAL_FIELD_RECT.y).x;
    const overlayGraphics = this.overlayGraphics;

    this.fieldGraphics.clear();
    this.fieldGraphics.fillStyle(0x170f0c, 0.28).fillRect(
      this.fieldRect.x,
      this.fieldRect.y,
      this.fieldRect.width,
      this.fieldRect.height
    );
    this.fieldGraphics.lineStyle(2, 0x41535a, 1).strokeRect(
      this.fieldRect.x,
      this.fieldRect.y,
      this.fieldRect.width,
      this.fieldRect.height
    );
    this.fieldGraphics.fillStyle(0x3fe0be, 0.09).fillRoundedRect(
      this.fieldRect.x + 6,
      laneTop,
      this.fieldRect.width - 12,
      laneHeight,
      16
    );
    this.fieldGraphics.lineStyle(2, 0x67f1d1, 0.55).strokeRoundedRect(
      this.fieldRect.x + 6,
      laneTop,
      this.fieldRect.width - 12,
      laneHeight,
      16
    );
    this.fieldGraphics.lineStyle(1, 0x7a604a, 0.65);
    this.fieldGraphics.lineBetween(
      dividerLeft,
      this.fieldRect.y + 12,
      dividerLeft,
      this.fieldRect.y + this.fieldRect.height - 12
    );
    this.fieldGraphics.lineBetween(
      dividerRight,
      this.fieldRect.y + 12,
      dividerRight,
      this.fieldRect.y + this.fieldRect.height - 12
    );

    const laneMarkerPoint = this.mapFieldPoint(
      ORIGINAL_FIELD_RECT.x + 52,
      laneBand.y + laneBand.height / 2
    );
    this.laneMarker?.setPosition(laneMarkerPoint.x, laneMarkerPoint.y);

    overlayGraphics.clear();

    const actors = [...this.raid.playerActors, ...this.raid.enemyActors];
    actors.forEach((actor) => {
      const position = toScreenPosition(actor);
      const hpRatio = Math.max(0, actor.hp) / actor.maxHp;
      const hpColor = actor.team === 'player' ? 0x6ef0ca : 0xffb560;
      const width = actor.kind === 'hq' ? this.scaleFieldWidth(84) : actor.kind === 'turret' ? this.scaleFieldWidth(50) : this.scaleFieldWidth(40);
      const barHeight = Math.max(4, this.scaleFieldHeight(6));
      const barPoint =
        actor.kind === 'hq'
          ? this.mapFieldPoint(position.x + 4, position.y - 74)
          : actor.kind === 'turret'
            ? this.mapFieldPoint(position.x - 18, position.y - 38)
            : this.mapFieldPoint(position.x - 20, position.y - 34);

      overlayGraphics.fillStyle(0x221713, 0.95).fillRect(barPoint.x, barPoint.y, width, barHeight);
      overlayGraphics.fillStyle(hpColor, actor.alive ? 1 : 0.25).fillRect(
        barPoint.x,
        barPoint.y,
        width * hpRatio,
        barHeight
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

      const position = toScreenPosition(actor);
      const isDestroyedHq = actor.kind === 'hq' && actor.hp / actor.maxHp < 0.45;
      const sizeMultiplier = actor.alive ? 1 : 0.92;

      if (actor.kind === 'hq') {
        const point = this.mapFieldPoint(position.x + 44, position.y + 18);
        sprite.setPosition(point.x, point.y);
        sprite.setDisplaySize(
          this.scaleFieldWidth(174) * sizeMultiplier,
          this.scaleFieldHeight(174) * sizeMultiplier
        );
        sprite.setTexture(isDestroyedHq ? 'building_command_center_damaged' : 'building_command_center');
      } else if (actor.kind === 'turret') {
        const point = this.mapFieldPoint(position.x + 6, position.y + 2);
        sprite.setPosition(point.x, point.y);
        sprite.setDisplaySize(
          this.scaleFieldWidth(84) * sizeMultiplier,
          this.scaleFieldHeight(84) * sizeMultiplier
        );
      } else {
        const point = this.mapFieldPoint(position.x, position.y);
        sprite.setPosition(point.x, point.y);
        sprite.setDisplaySize(
          this.scaleFieldWidth(58) * sizeMultiplier,
          this.scaleFieldHeight(58) * sizeMultiplier
        );
      }

      sprite.setAlpha(actor.alive ? 1 : 0.24);
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
    const point = this.mapFieldPoint(x, y);
    const fx = addSizedAssetImage(
      this,
      textureKey,
      point.x,
      point.y,
      this.scaleFieldWidth(width),
      this.scaleFieldHeight(height)
    ).setDepth(9);

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

      const position = toScreenPosition(actor);

      if (previous.cooldownLeft <= 0.05 && actor.cooldownLeft > 0.2 && actor.alive) {
        if (actor.heal > 0) {
          this.spawnFx('fx_repair_pulse', position.x, position.y, 84, 84, 360, 1.15);
        } else if (actor.sourceId === 'rocket_buggy') {
          this.spawnFx('fx_rocket_launch', position.x + 12, position.y - 10, 76, 76, 320, 1.12);
        } else {
          this.spawnFx('fx_muzzle_flash_small', position.x + 12, position.y - 10, 54, 54, 180, 1.08);
        }
      }

      if (actor.hp > previous.hp + 0.5) {
        this.spawnFx('fx_repair_pulse', position.x, position.y, 78, 78, 320, 1.14);
      } else if (actor.hp < previous.hp - 0.5) {
        this.spawnFx('fx_bullet_impact', position.x, position.y, 64, 64, 220, 1.18);
      }

      if (previous.alive && !actor.alive) {
        this.spawnFx(
          'fx_explosion_medium',
          position.x,
          position.y,
          actor.kind === 'hq' ? 180 : 118,
          actor.kind === 'hq' ? 180 : 118,
          420,
          1.26
        );
        this.spawnFx(
          'fx_destroyed_smoke',
          position.x,
          position.y - 6,
          actor.kind === 'hq' ? 168 : 106,
          actor.kind === 'hq' ? 168 : 106,
          860,
          1.06
        );
      }
    });

    if (previousRaid.rallyActiveSec <= 0 && currentRaid.rallyActiveSec > 0) {
      const laneBand = getLaneBand(currentRaid.entryLane);
      this.spawnFx(
        'fx_repair_pulse',
        ORIGINAL_FIELD_RECT.x + 110,
        laneBand.y + laneBand.height / 2,
        132,
        132,
        480,
        1.18
      );
      this.spawnFx(
        'fx_target_marker',
        ORIGINAL_FIELD_RECT.x + 170,
        laneBand.y + laneBand.height / 2,
        108,
        108,
        420,
        1.06
      );
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
    const enemyHq = this.raid.enemyActors.find((actor) => actor.kind === 'hq');
    const squadLine = Object.entries(this.raid.selectedSquad)
      .filter(([, count]) => count > 0)
      .map(([unitId, count]) => `${UNIT_LABELS[unitId] ?? unitId} ${count}`)
      .join(' | ');

    this.headerText?.setText(
      [
        `TIME ${formatSeconds(this.raid.timeSec)} | RESULT ${this.raid.result.toUpperCase()}`,
        `LANE ${this.raid.entryLane.toUpperCase()} | ${ENTRY_NOTES[this.raid.entryLane]}`,
        `SPEED x${this.speedMultiplier} | RALLY ${
          this.raid.rallyActiveSec > 0
            ? `ACTIVE ${this.raid.rallyActiveSec.toFixed(1)}s`
            : `CD ${this.raid.rallyCooldownSec.toFixed(1)}s`
        }`,
        `FRONT ${alivePlayerUnits} | ENEMY ${aliveEnemyUnits} | TURRETS ${aliveTurrets}`
      ].join('\n')
    );
    this.squadText?.setText(
      [
        `SQUAD ${squadLine || 'EMPTY'}`,
        `HQ ${Math.ceil(enemyHq?.hp ?? 0)}/${Math.ceil(enemyHq?.maxHp ?? 0)} | LOOT ${this.raid.rewards.scrap}S ${this.raid.rewards.power}P ${this.raid.rewards.core}C`,
        'RETREAT CASHES OUT HALF OF CURRENT LOOT.'
      ].join('\n')
    );
    this.legendText?.setText(
      'Tinted lane marks the chosen entry route. Rally spikes move + attack cadence for a short window.'
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

    if (this.captureHold) {
      return;
    }

    const previousRaid = structuredClone(this.raid) as RaidState;

    if (this.raid.result === 'running') {
      this.raid = stepRaid(this.raid, delta * this.speedMultiplier);
      setCurrentRaid(this.raid);
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
