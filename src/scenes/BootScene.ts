import Phaser from 'phaser';
import { preloadGameAssets } from '../app/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.add.text(24, 24, 'Loading assets...', {
      fontSize: '20px',
      color: '#f3ead9',
      fontFamily: 'monospace'
    });
    preloadGameAssets(this);
  }

  create(): void {
    this.scene.start('BaseScene');
  }
}
