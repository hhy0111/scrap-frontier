import Phaser from 'phaser';

export const createButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  fillColor = 0x2e2a26
): Phaser.GameObjects.Container => {
  const box = scene.add
    .rectangle(0, 0, width, height, fillColor, 0.95)
    .setStrokeStyle(2, 0xc98c52);
  const text = scene.add
    .text(0, 0, label, {
      color: '#f3ead9',
      fontSize: '14px',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: width - 12 }
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [box, text]);
  box.setInteractive({ useHandCursor: true });
  box.on('pointerdown', onClick);
  box.on('pointerover', () => box.setFillStyle(0x455250, 1));
  box.on('pointerout', () => box.setFillStyle(fillColor, 0.95));
  return container;
};

export const createPanel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  title?: string,
  accent = 0xc98c52
): Phaser.GameObjects.Container => {
  const children: Phaser.GameObjects.GameObject[] = [];
  const bg = scene.add
    .rectangle(0, 0, width, height, 0x1a1714, 0.94)
    .setOrigin(0)
    .setStrokeStyle(2, accent);
  children.push(bg);

  if (title) {
    const titleBg = scene.add
      .rectangle(0, 0, width, 28, accent, 0.18)
      .setOrigin(0);
    const text = scene.add.text(12, 6, title, {
      fontSize: '14px',
      color: '#f3ead9',
      fontFamily: 'monospace'
    });
    children.push(titleBg, text);
  }

  return scene.add.container(x, y, children);
};
