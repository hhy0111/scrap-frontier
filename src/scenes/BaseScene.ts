import Phaser from 'phaser';
import { addAssetImage, addBuildingImage } from '../app/assets';
import { getHqLevelCost } from '../domain/base/levelUpHq';
import { getStructureUpgradeCost } from '../domain/base/upgradeStructure';
import { balance, gameStore } from '../state/gameState';
import { createTutorialOverlay } from './TutorialOverlay';
import { createButton, createPanel } from './ui';
import type { ResourceAmount } from '../types/balance';
import type { DailyMission, GameState, StructureInstance } from '../types/game';

const STRUCTURE_LABELS: Record<string, string> = {
  command_center: 'HQ',
  scrap_yard: 'SCRAP',
  generator: 'POWER',
  barracks: 'BARRACKS',
  garage: 'GARAGE',
  storage: 'STORAGE',
  auto_turret: 'TURRET'
};

const UNIT_LABELS: Record<string, string> = {
  scavenger: 'SCAV',
  rifleman: 'RIFLE',
  shieldbot: 'SHIELD',
  rocket_buggy: 'BUGGY',
  repair_drone: 'DRONE'
};

const getScaledResources = (values: Partial<ResourceAmount>, scale: number): ResourceAmount => ({
  scrap: Math.floor((values.scrap ?? 0) * scale),
  power: Math.floor((values.power ?? 0) * scale),
  core: Math.floor((values.core ?? 0) * scale)
});

const formatResources = (values: Partial<ResourceAmount>, includeZero = false): string => {
  const parts: string[] = [];

  if (includeZero || (values.scrap ?? 0) > 0) {
    parts.push(`S ${values.scrap ?? 0}`);
  }

  if (includeZero || (values.power ?? 0) > 0) {
    parts.push(`P ${values.power ?? 0}`);
  }

  if (includeZero || (values.core ?? 0) > 0) {
    parts.push(`C ${values.core ?? 0}`);
  }

  return parts.join(' | ') || '0';
};

const getEtaSec = (targetAt: number | null, now: number): number =>
  targetAt ? Math.max(0, Math.ceil((targetAt - now) / 1000)) : 0;

const getQueueStatus = (
  entries: Array<{ completeAt: number }>,
  now: number
): string => {
  if (entries.length === 0) {
    return '0';
  }

  return `${entries.length} (${getEtaSec(entries[0].completeAt, now)}s)`;
};

const getProductionScale = (level: number): number => 1 + (level - 1) * 0.35;

const getStructureDetail = (structure: StructureInstance): string => {
  if (!structure.buildingId) {
    return 'EMPTY SLOT';
  }

  const definition = balance.buildingMap[structure.buildingId];
  const scale = getProductionScale(structure.level);

  if (definition.stats.productionPerMin) {
    return `PROD ${formatResources(
      getScaledResources(definition.stats.productionPerMin, scale)
    )} / min`;
  }

  if (definition.stats.storageBonus) {
    return `CAP ${formatResources(
      getScaledResources(definition.stats.storageBonus, scale)
    )}`;
  }

  if (definition.stats.queueCapacity) {
    return `TRAIN QUEUE +${definition.stats.queueCapacity} / building`;
  }

  if (structure.buildingId === 'auto_turret') {
    return `DEF POWER ${90 + (structure.level - 1) * 20}`;
  }

  return `HP ${definition.stats.hp}`;
};

const getSelectedSummary = (state: GameState, structure: StructureInstance | undefined): string => {
  if (!structure?.buildingId) {
    return [
      'NO STRUCTURE SELECTED',
      'Tap a built slot on the right.',
      'Upgrade cost and building output',
      'will appear here.'
    ].join('\n');
  }

  const definition = balance.buildingMap[structure.buildingId];
  const upgradeCost = getStructureUpgradeCost(definition.cost, structure.level);
  const upgradeSec = Math.ceil(
    definition.buildTimeSec * (1 + structure.level * 0.25)
  );
  const status = structure.completeAt
    ? `BUILDING ${getEtaSec(structure.completeAt, state.now)}s`
    : 'ACTIVE';

  return [
    `SLOT ${structure.slotId}`,
    `${STRUCTURE_LABELS[structure.buildingId]} Lv.${structure.level}`,
    `STATUS ${status}`,
    getStructureDetail(structure),
    `NEXT ${formatResources(upgradeCost, true)}`,
    `NEXT TIME ${upgradeSec}s`
  ].join('\n');
};

const getLossCount = (losses: Record<string, number>): number =>
  Object.values(losses).reduce((total, value) => total + value, 0);

export class BaseScene extends Phaser.Scene {
  private resourcesText?: Phaser.GameObjects.Text;

  private hqText?: Phaser.GameObjects.Text;

  private rosterText?: Phaser.GameObjects.Text;

  private selectedText?: Phaser.GameObjects.Text;

  private logsText?: Phaser.GameObjects.Text;

  private offlineText?: Phaser.GameObjects.Text;

  private counterText?: Phaser.GameObjects.Text;

  private dailyTexts: Phaser.GameObjects.Text[] = [];

  private missionButtons: Phaser.GameObjects.Container[] = [];

  private offlineButton?: Phaser.GameObjects.Container;

  private counterButton?: Phaser.GameObjects.Container;

  private slotObjects: Array<{
    structure: StructureInstance;
    buildingId: string | null;
    box: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image | null;
    label: Phaser.GameObjects.Text;
  }> = [];

  private selectedStructureId: string | null = null;

  constructor() {
    super('BaseScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1511');

    createPanel(this, 18, 14, 1244, 56, undefined, 0x4e3a2f);
    createPanel(this, 18, 82, 430, 96, 'RESOURCES', 0x9fe7f2);
    createPanel(this, 18, 188, 430, 122, 'ROSTER', 0x6ef0ca);
    createPanel(this, 18, 320, 430, 180, 'SELECTED', 0xf0c27b);
    createPanel(this, 18, 510, 430, 180, 'RECENT LOGS', 0xc98c52);
    createPanel(this, 462, 82, 214, 110, 'OFFLINE', 0x8dd8e7);
    createPanel(this, 686, 82, 352, 110, 'DAILY OPS', 0x94efb0);
    createPanel(this, 1048, 82, 214, 110, 'COUNTER', 0xf09b62);
    createPanel(this, 462, 202, 800, 362, 'BASE SLOTS', 0x8ef2d3);
    createPanel(this, 462, 574, 800, 116, 'ACTIONS', 0xd08c55);

    this.add
      .text(24, 20, 'SCRAP FRONTIER / BASE', {
        fontSize: '28px',
        color: '#f5ddb7',
        fontFamily: 'monospace'
      })
      .setDepth(1);

    createButton(
      this,
      1162,
      37,
      150,
      34,
      'Restart Tutorial',
      () => {
        gameStore.restartTutorial();
        this.scene.restart();
      },
      0x27424b
    );

    addAssetImage(this, 'resource_scrap', 46, 126, 36);
    addAssetImage(this, 'resource_power', 186, 126, 36);
    addAssetImage(this, 'resource_core', 326, 126, 36);

    this.resourcesText = this.add.text(70, 114, '', {
      fontSize: '20px',
      color: '#d9fff7',
      fontFamily: 'monospace'
    });
    this.hqText = this.add.text(30, 144, '', {
      fontSize: '15px',
      color: '#ffd18a',
      fontFamily: 'monospace',
      wordWrap: { width: 396 }
    });
    this.rosterText = this.add.text(30, 226, '', {
      fontSize: '15px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 396 }
    });
    this.selectedText = this.add.text(30, 356, '', {
      fontSize: '14px',
      color: '#96f2dd',
      fontFamily: 'monospace',
      wordWrap: { width: 390 }
    });
    this.logsText = this.add.text(30, 546, '', {
      fontSize: '12px',
      color: '#c7bbb0',
      fontFamily: 'monospace',
      wordWrap: { width: 390 }
    });
    this.offlineText = this.add.text(476, 118, '', {
      fontSize: '13px',
      color: '#e8fdfd',
      fontFamily: 'monospace',
      wordWrap: { width: 186 }
    });
    this.counterText = this.add.text(1062, 118, '', {
      fontSize: '13px',
      color: '#fff1de',
      fontFamily: 'monospace',
      wordWrap: { width: 186 }
    });

    for (let index = 0; index < 3; index += 1) {
      this.dailyTexts.push(
        this.add.text(698, 114 + index * 24, '', {
          fontSize: '12px',
          color: '#f3ead9',
          fontFamily: 'monospace',
          wordWrap: { width: 228 }
        })
      );
      this.missionButtons.push(
        createButton(
          this,
          994,
          124 + index * 24,
          64,
          20,
          'Claim',
          () => {
            const mission = gameStore.getState().meta.dailyMissions[index];
            if (mission) {
              gameStore.claimMission(mission.id);
            }
          },
          0x2e4032
        )
      );
    }

    this.offlineButton = createButton(
      this,
      616,
      162,
      86,
      24,
      'Clear',
      () => gameStore.clearOfflineReward(),
      0x28454d
    );
    this.counterButton = createButton(
      this,
      1156,
      162,
      156,
      24,
      'Resolve Wave',
      () => gameStore.resolveCounterAttack(),
      0x4d3323
    );

    this.createSlots();
    this.createControlButtons();
    this.refresh();
    createTutorialOverlay(this, 'BaseScene');
  }

  private createSlots(): void {
    const state = gameStore.getState();
    const startX = 482;
    const startY = 238;
    const columns = 4;
    const slotWidth = 182;
    const slotHeight = 82;

    this.slotObjects = state.base.structures.map((structure, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (slotWidth + 12);
      const y = startY + row * (slotHeight + 12);

      const box = this.add
        .rectangle(x, y, slotWidth, slotHeight, 0x231d18, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0x6a4d35)
        .setInteractive({ useHandCursor: true });
      const icon = structure.buildingId
        ? addBuildingImage(this, structure.buildingId, x + 28, y + 41, 40)
        : null;
      const label = this.add.text(x + 54, y + 10, '', {
        fontSize: '13px',
        color: '#f3ead9',
        fontFamily: 'monospace',
        wordWrap: { width: slotWidth - 64 }
      });

      box.on('pointerdown', () => {
        this.selectedStructureId = structure.buildingId ? structure.id : null;
        this.refresh();
      });

      return {
        structure,
        buildingId: structure.buildingId,
        box,
        icon,
        label
      };
    });
  }

  private createControlButtons(): void {
    createButton(this, 547, 630, 122, 44, 'Build Scrap', () => gameStore.build('scrap_yard'));
    createButton(this, 679, 630, 122, 44, 'Build Power', () => gameStore.build('generator'));
    createButton(this, 811, 630, 122, 44, 'Build Barracks', () => gameStore.build('barracks'));
    createButton(this, 943, 630, 122, 44, 'Build Garage', () => gameStore.build('garage'));
    createButton(this, 1075, 630, 122, 44, 'Build Storage', () => gameStore.build('storage'));
    createButton(this, 1207, 630, 104, 44, 'Turret', () => gameStore.build('auto_turret'));

    createButton(this, 547, 676, 122, 28, 'Train Scav', () => gameStore.queueUnit('scavenger'), 0x20322d);
    createButton(this, 679, 676, 122, 28, 'Train Rifle', () => gameStore.queueUnit('rifleman'), 0x20322d);
    createButton(this, 811, 676, 122, 28, 'Train Shield', () => gameStore.queueUnit('shieldbot'), 0x20322d);
    createButton(this, 943, 676, 122, 28, 'Train Buggy', () => gameStore.queueUnit('rocket_buggy'), 0x20322d);
    createButton(this, 1075, 676, 122, 28, 'Train Drone', () => gameStore.queueUnit('repair_drone'), 0x20322d);
    createButton(this, 1207, 676, 104, 28, 'Scout', () => this.scene.start('ScoutScene'), 0x27424b);

    createButton(this, 364, 448, 112, 32, 'HQ Up', () => gameStore.levelUpHq(), 0x4d3323);
    createButton(
      this,
      364,
      484,
      112,
      32,
      'Upgrade',
      () => {
        if (this.selectedStructureId) {
          gameStore.upgrade(this.selectedStructureId);
        }
      },
      0x4d3323
    );
    createButton(this, 364, 520, 112, 32, 'Reset Save', () => gameStore.reset(), 0x5a2424);
  }

  private updateDailyMissionWidgets(missions: DailyMission[]): void {
    this.dailyTexts.forEach((text, index) => {
      const mission = missions[index];
      const button = this.missionButtons[index];

      if (!mission) {
        text.setVisible(false);
        button.setVisible(false);
        return;
      }

      text.setVisible(true);
      button.setVisible(true);

      const status = mission.claimed
        ? 'DONE'
        : mission.progress >= mission.target
          ? 'READY'
          : `${mission.progress}/${mission.target}`;
      text.setText(
        `${mission.label} ${status}`
      );
      button.setAlpha(mission.claimed || mission.progress < mission.target ? 0.35 : 1);
    });
  }

  private updateSlotLabels(state: GameState): void {
    for (const slotObject of this.slotObjects) {
      const liveStructure =
        state.base.structures.find((entry) => entry.id === slotObject.structure.id) ??
        slotObject.structure;
      slotObject.structure = liveStructure;

      const label = liveStructure.buildingId
        ? STRUCTURE_LABELS[liveStructure.buildingId]
        : 'EMPTY';
      const busy = liveStructure.completeAt
        ? `\nETA ${getEtaSec(liveStructure.completeAt, state.now)}s`
        : '';

      slotObject.label.setText(
        `${liveStructure.slotId}\n${label}${liveStructure.level > 0 ? ` L${liveStructure.level}` : ''}${busy}`
      );

      if (slotObject.buildingId !== liveStructure.buildingId) {
        slotObject.icon?.destroy();
        slotObject.icon = liveStructure.buildingId
          ? addBuildingImage(
              this,
              liveStructure.buildingId,
              slotObject.box.x + 28,
              slotObject.box.y + 41,
              40
            )
          : null;
        slotObject.buildingId = liveStructure.buildingId;
      }

      const isSelected = this.selectedStructureId === liveStructure.id;
      slotObject.box.setStrokeStyle(2, isSelected ? 0x6ef0ca : 0x6a4d35);
      slotObject.box.setFillStyle(
        liveStructure.buildingId ? (liveStructure.completeAt ? 0x403124 : 0x2a241f) : 0x191513,
        1
      );
    }
  }

  private refresh(): void {
    const state = gameStore.getState();
    const nextHqCost = getHqLevelCost(state.base.hqLevel + 1);
    const barracksQueue = getQueueStatus(state.base.trainingQueues.barracks, state.now);
    const garageQueue = getQueueStatus(state.base.trainingQueues.garage, state.now);
    const selected = state.base.structures.find((entry) => entry.id === this.selectedStructureId);
    const offline = state.pendingOfflineReward;
    const counterReady = state.meta.counterThreat >= 100;
    const lastCounter = state.lastCounterAttack;

    this.resourcesText?.setText(
      `SCRAP ${state.resources.scrap}     POWER ${state.resources.power}     CORE ${state.resources.core}`
    );
    this.hqText?.setText(
      nextHqCost
        ? `HQ Lv.${state.base.hqLevel} | Zone ${state.meta.zoneTier} | Threat ${state.meta.counterThreat}\nNEXT HQ ${formatResources(nextHqCost, true)}`
        : `HQ Lv.${state.base.hqLevel} | Zone ${state.meta.zoneTier} | Threat ${state.meta.counterThreat}\nHQ MAXED FOR MVP`
    );
    this.rosterText?.setText(
      `ACTIVE UNITS\n${UNIT_LABELS.scavenger} ${state.roster.scavenger ?? 0} | ${UNIT_LABELS.rifleman} ${state.roster.rifleman ?? 0}\n${UNIT_LABELS.shieldbot} ${state.roster.shieldbot ?? 0} | ${UNIT_LABELS.rocket_buggy} ${state.roster.rocket_buggy ?? 0} | ${UNIT_LABELS.repair_drone} ${state.roster.repair_drone ?? 0}\n\nTRAINING\nBARRACKS ${barracksQueue}\nGARAGE ${garageQueue}`
    );
    this.selectedText?.setText(getSelectedSummary(state, selected));
    this.logsText?.setText(
      state.logs
        .slice(-8)
        .map((log) => `${log.event} ${log.extra ? JSON.stringify(log.extra) : ''}`)
        .join('\n')
    );
    this.offlineText?.setText(
      offline
        ? `AUTO COLLECTED\n${offline.minutes} min\nGAIN ${formatResources(offline.reward, true)}`
        : 'NO OFFLINE REPORT\nCurrent session synced.'
    );
    this.offlineButton?.setVisible(Boolean(offline));

    this.updateDailyMissionWidgets(state.meta.dailyMissions);

    this.counterText?.setText(
      lastCounter
        ? [
            `THREAT ${state.meta.counterThreat}/100`,
            counterReady ? 'STATUS READY' : 'STATUS BUILDING',
            `LAST ${lastCounter.victory ? 'HELD' : 'BREACH'}`,
            `P ${lastCounter.playerPower} / E ${lastCounter.enemyPower}`,
            `LOSS U ${getLossCount(lastCounter.losses)} | ${formatResources(lastCounter.resourceLoss, true)}`
          ].join('\n')
        : [
            `THREAT ${state.meta.counterThreat}/100`,
            counterReady ? 'STATUS READY' : 'STATUS BUILDING',
            'Resolve wave at 100 threat.',
            'Turrets and roster lower losses.'
          ].join('\n')
    );
    this.counterButton?.setAlpha(counterReady ? 1 : 0.35);

    this.updateSlotLabels(state);
  }

  update(): void {
    gameStore.tick();
    this.refresh();
  }
}
