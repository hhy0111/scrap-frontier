import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { BaseScene } from '../scenes/BaseScene';
import { ScoutScene } from '../scenes/ScoutScene';
import { RaidPrepScene } from '../scenes/RaidPrepScene';
import { RaidScene } from '../scenes/RaidScene';
import { ResultScene } from '../scenes/ResultScene';

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 1280,
  height: 720,
  backgroundColor: '#14100d',
  render: {
    pixelArt: false,
    antialias: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, BaseScene, ScoutScene, RaidPrepScene, RaidScene, ResultScene]
});
