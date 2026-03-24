import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { BaseScene } from '../scenes/BaseScene';
import { ScoutScene } from '../scenes/ScoutScene';
import { RaidPrepScene } from '../scenes/RaidPrepScene';
import { RaidScene } from '../scenes/RaidScene';
import { ResultScene } from '../scenes/ResultScene';
import { ShopScene } from '../scenes/ShopScene';

export const VIEWPORT = {
  width: 432,
  height: 768
} as const;

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  backgroundColor: '#14100d',
  render: {
    pixelArt: false,
    antialias: true,
    preserveDrawingBuffer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, BaseScene, ScoutScene, RaidPrepScene, RaidScene, ResultScene, ShopScene]
});
