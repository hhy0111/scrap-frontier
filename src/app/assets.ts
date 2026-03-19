import Phaser from 'phaser';
import {
  ASSET_MANIFEST,
  getBuildingAssetKey,
  getUnitAssetKey
} from '../data/assetManifest';

export const preloadGameAssets = (scene: Phaser.Scene): void => {
  for (const entry of ASSET_MANIFEST) {
    scene.load.image(entry.key, entry.src);
  }
};

export const addAssetImage = (
  scene: Phaser.Scene,
  textureKey: string,
  x: number,
  y: number,
  size: number
): Phaser.GameObjects.Image =>
  scene.add.image(x, y, textureKey).setDisplaySize(size, size);

export const addSizedAssetImage = (
  scene: Phaser.Scene,
  textureKey: string,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
): Phaser.GameObjects.Image =>
  scene.add.image(x, y, textureKey).setDisplaySize(width, height).setAlpha(alpha);

export const addBuildingImage = (
  scene: Phaser.Scene,
  buildingId: string,
  x: number,
  y: number,
  size: number
): Phaser.GameObjects.Image =>
  addAssetImage(scene, getBuildingAssetKey(buildingId), x, y, size);

export const addUnitImage = (
  scene: Phaser.Scene,
  unitId: string,
  x: number,
  y: number,
  size: number
): Phaser.GameObjects.Image => addAssetImage(scene, getUnitAssetKey(unitId), x, y, size);
