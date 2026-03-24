import Phaser from 'phaser';
import { addAssetImage, addSizedAssetImage } from '../app/assets';
import { createPanel } from './ui';

type MobileShellOptions = {
  title: string;
  subtitle?: string;
  accent?: number;
  iconKey?: string;
  artKey?: string;
  artAngle?: number;
  backgroundColor?: string;
  bottomInset?: number;
};

export type MobileShell = {
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  contentX: number;
  contentWidth: number;
  bodyTop: number;
  footerY: number;
  createSection: (
    y: number,
    height: number,
    title?: string,
    accent?: number
  ) => Phaser.GameObjects.Container;
};

const getFrameMetrics = (scene: Phaser.Scene) => {
  const viewportWidth = scene.scale.width;
  const viewportHeight = scene.scale.height;
  const frameWidth = Math.min(420, viewportWidth - 12);
  const frameHeight = Math.min(744, viewportHeight - 20);
  const frameX = Math.round((viewportWidth - frameWidth) / 2);
  const frameY = Math.round((viewportHeight - frameHeight) / 2);
  const contentX = frameX + 16;
  const contentWidth = frameWidth - 32;

  return {
    viewportWidth,
    viewportHeight,
    frameWidth,
    frameHeight,
    frameX,
    frameY,
    contentX,
    contentWidth
  };
};

export const createMobileShell = (
  scene: Phaser.Scene,
  options: MobileShellOptions
): MobileShell => {
  const accent = options.accent ?? 0x8ef2d3;
  const metrics = getFrameMetrics(scene);
  const bottomInset = options.bottomInset ?? 0;
  const titleNotchWidth = Math.min(128, metrics.frameWidth * 0.32);

  scene.cameras.main.setBackgroundColor(options.backgroundColor ?? '#14110f');
  scene.add.circle(
    metrics.frameX - 56,
    metrics.frameY + 110,
    Math.max(88, metrics.frameWidth * 0.24),
    accent,
    0.12
  );
  scene.add.circle(
    metrics.frameX + metrics.frameWidth + 136,
    metrics.frameY + metrics.frameHeight - 98,
    Math.max(138, metrics.frameWidth * 0.38),
    0x4d3323,
    0.18
  );

  if (options.artKey) {
    const artX =
      metrics.viewportWidth <= 480
        ? metrics.frameX + metrics.frameWidth / 2
        : metrics.frameX + metrics.frameWidth + 108;
    const artY =
      metrics.viewportWidth <= 480
        ? metrics.frameY + metrics.frameHeight / 2
        : metrics.frameY + metrics.frameHeight / 2;
    const artSize = metrics.viewportWidth <= 480 ? 264 : 340;
    addSizedAssetImage(scene, options.artKey, artX, artY, artSize, artSize, 0.08).setAngle(
      options.artAngle ?? 6
    );
  }

  scene.add
    .rectangle(
      metrics.frameX - 8,
      metrics.frameY - 8,
      metrics.frameWidth + 16,
      metrics.frameHeight + 16,
      0x050505,
      0.82
    )
    .setOrigin(0)
    .setStrokeStyle(3, 0x2a2520, 0.85);
  scene.add
    .rectangle(metrics.frameX, metrics.frameY, metrics.frameWidth, metrics.frameHeight, 0x0e0c0b, 1)
    .setOrigin(0)
    .setStrokeStyle(2, 0x3f342b, 1);
  scene.add
    .rectangle(
      metrics.frameX + 8,
      metrics.frameY + 8,
      metrics.frameWidth - 16,
      metrics.frameHeight - 16,
      0x1a1511,
      0.98
    )
    .setOrigin(0)
    .setStrokeStyle(2, accent, 0.78);
  scene.add
    .rectangle(
      metrics.frameX + (metrics.frameWidth - titleNotchWidth) / 2,
      metrics.frameY + 18,
      titleNotchWidth,
      10,
      0x0a0908,
      0.92
    )
    .setOrigin(0);

  createPanel(scene, metrics.contentX, metrics.frameY + 20, metrics.contentWidth, 56, undefined, accent);

  if (options.iconKey) {
    addAssetImage(scene, options.iconKey, metrics.contentX + 26, metrics.frameY + 48, 28).setDepth(2);
  }

  const titleX = metrics.contentX + (options.iconKey ? 48 : 16);
  scene.add
    .text(titleX, metrics.frameY + 28, options.title, {
      fontSize: '20px',
      color: '#f3ead9',
      fontFamily: 'monospace'
    })
    .setDepth(2);

  if (options.subtitle) {
    scene.add
      .text(titleX, metrics.frameY + 52, options.subtitle, {
        fontSize: '10px',
        color: '#9fe7f2',
        fontFamily: 'monospace'
      })
      .setDepth(2);
  }

  return {
    frameX: metrics.frameX,
    frameY: metrics.frameY,
    frameWidth: metrics.frameWidth,
    frameHeight: metrics.frameHeight,
    contentX: metrics.contentX,
    contentWidth: metrics.contentWidth,
    bodyTop: metrics.frameY + 78,
    footerY: metrics.frameY + metrics.frameHeight - 20 - bottomInset,
    createSection: (y, height, title, accentOverride) =>
      createPanel(scene, metrics.contentX, y, metrics.contentWidth, height, title, accentOverride ?? accent)
  };
};
