import Phaser from 'phaser';
import { getTutorialStep } from '../data/tutorial';
import { gameStore } from '../state/gameState';
import type { TutorialSceneId } from '../data/tutorial';

export const createTutorialOverlay = (
  scene: Phaser.Scene,
  sceneId: TutorialSceneId
): Phaser.GameObjects.Container | null => {
  const state = gameStore.getState();

  if (state.meta.tutorialDismissed) {
    return null;
  }

  const step = getTutorialStep(state.meta.tutorialStep);
  if (!step || step.scene !== sceneId) {
    return null;
  }

  const width = Math.min(392, scene.scale.width - 24);
  const height = 188;
  const x = Math.max(12, Math.round((scene.scale.width - width) / 2));
  const y = 18;

  const bg = scene.add
    .rectangle(0, 0, width, height, 0x132025, 0.96)
    .setOrigin(0)
    .setStrokeStyle(2, 0x8ef2d3);
  const title = scene.add.text(18, 16, `TUTORIAL ${step.index + 1}/5`, {
    fontSize: '14px',
    color: '#8ef2d3',
    fontFamily: 'monospace'
  });
  const heading = scene.add.text(18, 42, step.title, {
    fontSize: '20px',
    color: '#f4ddb6',
    fontFamily: 'monospace'
  });
  const body = scene.add.text(18, 78, step.body, {
    fontSize: '12px',
    color: '#f3ead9',
    fontFamily: 'monospace',
    wordWrap: { width: width - 36 }
  });
  const buttonWidth = 124;
  const buttonY = height - 34;
  const nextButton = scene.add
    .rectangle(width / 2 - 76, buttonY, buttonWidth, 28, 0x35574a, 1)
    .setStrokeStyle(1, 0x9fe7f2)
    .setInteractive({ useHandCursor: true });
  const nextText = scene.add.text(width / 2 - 76, buttonY, 'Continue', {
    fontSize: '14px',
    color: '#f3ead9',
    fontFamily: 'monospace'
  }).setOrigin(0.5);
  const skipButton = scene.add
    .rectangle(width / 2 + 76, buttonY, buttonWidth, 28, 0x5a2424, 1)
    .setStrokeStyle(1, 0xe39d86)
    .setInteractive({ useHandCursor: true });
  const skipText = scene.add.text(width / 2 + 76, buttonY, 'Skip', {
    fontSize: '14px',
    color: '#f3ead9',
    fontFamily: 'monospace'
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [
    bg,
    title,
    heading,
    body,
    nextButton,
    nextText,
    skipButton,
    skipText
  ]);
  container.setDepth(2000);

  nextButton.on('pointerdown', () => {
    gameStore.advanceTutorial();
    container.destroy();
  });

  skipButton.on('pointerdown', () => {
    gameStore.dismissTutorial();
    container.destroy();
  });

  return container;
};
