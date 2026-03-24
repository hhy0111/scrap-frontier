import Phaser from 'phaser';
import { preloadGameAssets } from '../app/assets';
import { buildRaidSquad, startRaid } from '../domain/raid/startRaid';
import { balance, gameStore } from '../state/gameState';
import { getCurrentRaid, setCurrentRaid } from '../state/session';

const DEBUG_SCENES = new Set([
  'BaseScene',
  'ScoutScene',
  'RaidPrepScene',
  'RaidScene',
  'ResultScene',
  'ShopScene'
]);

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
    const query = new URLSearchParams(window.location.search);
    const requestedScene = query.get('scene');

    if (query.get('tutorial') === 'off') {
      gameStore.dismissTutorial();
    }

    if (requestedScene === 'RaidScene' && !getCurrentRaid()) {
      const state = gameStore.getState();
      const target = gameStore.getSelectedScoutTarget() ?? state.base.scoutTargets[0];

      if (target) {
        const raid = startRaid(
          state,
          balance,
          target,
          buildRaidSquad(state, balance),
          'mid'
        );

        if (raid) {
          setCurrentRaid(raid);
        }
      }
    }

    this.scene.start(
      requestedScene && DEBUG_SCENES.has(requestedScene) ? requestedScene : 'BaseScene'
    );
  }
}
