import Phaser from 'phaser';
import { addBuildingImage } from '../app/assets';
import { getHqLevelCost } from '../domain/base/levelUpHq';
import { getStructureUpgradeCost } from '../domain/base/upgradeStructure';
import { getResearchCost, getResearchDefinition } from '../domain/meta/research';
import {
  getUpcomingUnlockMilestones,
  getUnlockMilestoneItems,
  getUnlockStatus
} from '../domain/meta/unlocks';
import {
  getCommerceCapabilities,
  hideBannerPlacementThroughPlatform,
  showBannerPlacementThroughPlatform
} from '../platform/commerce';
import { balance, gameStore } from '../state/gameState';
import { createTutorialOverlay } from './TutorialOverlay';
import { createMobileShell } from './mobileFrame';
import { createButton } from './ui';
import { canAfford } from '../utils/resources';
import type { ResourceAmount } from '../types/balance';
import type { GameState, ResearchTrackId, StructureInstance } from '../types/game';
import type { UnlockMilestone, UnlockStatus } from '../domain/meta/unlocks';

type ActionMode = 'build' | 'train' | 'ops' | 'admin';

type ActionButtonDefinition = {
  label: string;
  onClick: () => void;
  fillColor?: number;
  isEnabled: (state: GameState) => boolean;
};

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
    return `QUEUE +${definition.stats.queueCapacity} / bldg`;
  }

  if (structure.buildingId === 'auto_turret') {
    return `DEF ${90 + (structure.level - 1) * 20}`;
  }

  return `HP ${definition.stats.hp}`;
};

const getCompactSelectedSummary = (
  state: GameState,
  structure: StructureInstance | undefined
): string => {
  if (!structure?.buildingId) {
    return [
      'NO STRUCTURE FOCUSED',
      'Tap a built slot in the grid.',
      'HQ Up and Upgrade use the current focus.'
    ].join('\n');
  }

  const definition = balance.buildingMap[structure.buildingId];
  const upgradeCost = getStructureUpgradeCost(definition.cost, structure.level);

  return [
    `${STRUCTURE_LABELS[structure.buildingId]} ${structure.slotId} L${structure.level}`,
    structure.completeAt ? `BUILD ETA ${getEtaSec(structure.completeAt, state.now)}s` : 'STATUS ACTIVE',
    getStructureDetail(structure),
    `NEXT ${formatResources(upgradeCost, true)}`
  ].join('\n');
};

const getResearchUnitsLabel = (trackId: ResearchTrackId): string =>
  trackId === 'barracks' ? 'SCAV / RIFLE' : 'SHIELD / BUGGY / DRONE';

const getMissionLine = (
  mission: GameState['meta']['dailyMissions'][number] | undefined,
  index: number
): string => {
  if (!mission) {
    return `${index + 1} EMPTY`;
  }

  const status = mission.claimed
    ? 'DONE'
    : mission.progress >= mission.target
      ? 'READY'
      : `${mission.progress}/${mission.target}`;
  const label = mission.label.toUpperCase().replace('MISSION', '').trim();
  return `${index + 1} ${status} ${label}`;
};

const canBuildStructure = (state: GameState, buildingId: string): boolean => {
  const definition = balance.buildingMap[buildingId];
  const currentCount = state.base.structures.filter(
    (structure) => structure.buildingId === buildingId
  ).length;

  return (
    state.base.hqLevel >= definition.unlockHqLevel &&
    currentCount < definition.maxCount &&
    state.base.structures.some((structure) => !structure.buildingId) &&
    canAfford(state.resources, definition.cost)
  );
};

const canTrainUnit = (state: GameState, unitId: string): boolean => {
  const unit = balance.unitMap[unitId];
  const buildingCount = state.base.structures.filter(
    (structure) => structure.buildingId === unit.trainBuildingId
  ).length;
  const queueCapacity =
    buildingCount * (balance.buildingMap[unit.trainBuildingId].stats.queueCapacity ?? 0);

  return (
    state.base.hqLevel >= unit.unlockHqLevel &&
    buildingCount > 0 &&
    state.base.trainingQueues[unit.trainBuildingId].length < queueCapacity &&
    canAfford(state.resources, unit.cost)
  );
};

const canUpgradeSelectedStructure = (
  state: GameState,
  selectedStructure: StructureInstance | undefined
): boolean => {
  if (!selectedStructure?.buildingId) {
    return false;
  }

  return canAfford(
    state.resources,
    getStructureUpgradeCost(balance.buildingMap[selectedStructure.buildingId].cost, selectedStructure.level)
  );
};

const summarizeUnlockLabels = (labels: string[], maxItems = 4): string => {
  if (labels.length === 0) {
    return 'NONE';
  }

  if (labels.length <= maxItems) {
    return labels.join(' / ');
  }

  return `${labels.slice(0, maxItems).join(' / ')} +${labels.length - maxItems}`;
};

const formatLockedGroup = (
  locks: Array<{ label: string; unlockHqLevel: number }>
): string => {
  if (locks.length === 0) {
    return 'NONE';
  }

  const grouped = new Map<number, string[]>();

  locks.forEach((entry) => {
    const current = grouped.get(entry.unlockHqLevel) ?? [];
    current.push(entry.label);
    grouped.set(entry.unlockHqLevel, current);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(
      ([unlockHqLevel, labels]) =>
        `HQ${unlockHqLevel} ${summarizeUnlockLabels(labels, 3)}`
    )
    .join(' | ');
};

const getMilestonePreview = (milestone: UnlockMilestone | undefined): string[] => {
  if (!milestone) {
    return ['MAX HQ', 'ALL CORE UNLOCKS OPEN'];
  }

  return [
    `NEXT HQ${milestone.hqLevel}`,
    summarizeUnlockLabels(getUnlockMilestoneItems(milestone), 4)
  ];
};

const getActionModeHint = (
  actionMode: ActionMode,
  unlockStatus: UnlockStatus,
  unlockMilestones: UnlockMilestone[]
): string => {
  if (actionMode === 'build') {
    return `BUILD LOCK ${formatLockedGroup(unlockStatus.buildingsLocked)}`;
  }

  if (actionMode === 'train') {
    const garageNeed = unlockStatus.facilityNeeds.find(
      (entry) => entry.buildingLabel === 'GARAGE'
    );

    if (garageNeed) {
      return `BUILD GARAGE FOR ${summarizeUnlockLabels(garageNeed.unitLabels, 3)}`;
    }

    return `TRAIN LOCK ${formatLockedGroup(unlockStatus.unitsLocked)}`;
  }

  if (actionMode === 'ops') {
    const nextMilestone = unlockMilestones[0];
    return nextMilestone
      ? `NEXT HQ${nextMilestone.hqLevel} ${summarizeUnlockLabels(getUnlockMilestoneItems(nextMilestone), 4)}`
      : 'OPS READY MAX HQ REACHED';
  }

  if (unlockStatus.researchesLocked.length > 0) {
    return `RES LOCK ${formatLockedGroup(unlockStatus.researchesLocked)}`;
  }

  return 'ADMIN CLAIM READY MISSIONS / RESET / REFRESH';
};

export class BaseScene extends Phaser.Scene {
  private static readonly LOBBY_BANNER_INSET = 58;

  private commandText?: Phaser.GameObjects.Text;

  private missionText?: Phaser.GameObjects.Text;

  private rosterText?: Phaser.GameObjects.Text;

  private researchText?: Phaser.GameObjects.Text;

  private selectedText?: Phaser.GameObjects.Text;

  private researchButtons: Partial<Record<ResearchTrackId, Phaser.GameObjects.Container>> = {};

  private hqButton?: Phaser.GameObjects.Container;

  private upgradeButton?: Phaser.GameObjects.Container;

  private slotObjects: Array<{
    structure: StructureInstance;
    buildingId: string | null;
    box: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image | null;
    label: Phaser.GameObjects.Text;
  }> = [];

  private selectedStructureId: string | null = null;

  private actionMode: ActionMode = 'build';

  private actionTabButtons: Partial<Record<ActionMode, Phaser.GameObjects.Container>> = {};

  private actionButtons: Array<{
    button: Phaser.GameObjects.Container;
    isEnabled: (state: GameState) => boolean;
  }> = [];

  private actionOriginX = 0;

  private actionOriginY = 0;

  constructor() {
    super('BaseScene');
  }

  create(): void {
    const state = gameStore.getState();
    const commerceCapabilities = getCommerceCapabilities();
    const reserveBannerInset =
      !state.meta.store.adsDisabled && commerceCapabilities.bannerAds;
    const shell = createMobileShell(this, {
      title: 'BASE COMMAND',
      subtitle: 'PORTRAIT OPS HUB',
      accent: 0x8ef2d3,
      iconKey: 'resource_scrap',
      artKey: 'meta_loading_art',
      artAngle: 8,
      backgroundColor: '#17120f',
      bottomInset: reserveBannerInset ? BaseScene.LOBBY_BANNER_INSET : 0
    });
    const commandY = shell.bodyTop;
    const rosterY = commandY + 134;
    const slotsY = rosterY + 88;
    const focusY = slotsY + 194;
    const opsY = focusY + 86;

    shell.createSection(commandY, 126, 'COMMAND', 0x9fe7f2);
    shell.createSection(rosterY, 80, 'ROSTER / RESEARCH', 0x6ef0ca);
    shell.createSection(slotsY, 186, 'BASE GRID', 0xf0c27b);
    shell.createSection(focusY, 78, 'FOCUS', 0xc98c52);
    shell.createSection(opsY, 92, undefined, 0xd08c55);

    this.add.text(shell.contentX + 16, opsY + 10, 'OPERATIONS', {
      fontSize: '12px',
      color: '#f3ead9',
      fontFamily: 'monospace'
    });

    this.commandText = this.add.text(shell.contentX + 16, commandY + 38, '', {
      fontSize: '13px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 214 }
    });
    this.missionText = this.add.text(shell.contentX + 244, commandY + 38, '', {
      fontSize: '10px',
      color: '#d8fff5',
      fontFamily: 'monospace',
      wordWrap: { width: 128 }
    });
    createButton(
      this,
      shell.contentX + 222,
      commandY + 102,
      68,
      20,
      'Scout',
      () => this.scene.start('ScoutScene'),
      0x27424b
    );
    createButton(
      this,
      shell.contentX + 302,
      commandY + 102,
      68,
      20,
      'Shop',
      () => this.scene.start('ShopScene'),
      0x35574a
    );
    this.rosterText = this.add.text(shell.contentX + 16, rosterY + 36, '', {
      fontSize: '11px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 206 }
    });
    this.researchText = this.add.text(shell.contentX + 224, rosterY + 36, '', {
      fontSize: '10px',
      color: '#d9fff7',
      fontFamily: 'monospace',
      wordWrap: { width: 148 }
    });
    this.selectedText = this.add.text(shell.contentX + 16, focusY + 36, '', {
      fontSize: '10px',
      color: '#f3ead9',
      fontFamily: 'monospace',
      wordWrap: { width: 244 }
    });

    this.researchButtons.barracks = createButton(
      this,
      shell.contentX + 252,
      rosterY + 66,
      68,
      22,
      'Inf +',
      () => gameStore.upgradeResearch('barracks'),
      0x304032
    );
    this.researchButtons.garage = createButton(
      this,
      shell.contentX + 336,
      rosterY + 66,
      68,
      22,
      'Mech +',
      () => gameStore.upgradeResearch('garage'),
      0x2d3947
    );

    this.hqButton = createButton(
      this,
      shell.contentX + 294,
      focusY + 38,
      74,
      22,
      'HQ Up',
      () => gameStore.levelUpHq(),
      0x4d3323
    );
    this.upgradeButton = createButton(
      this,
      shell.contentX + 294,
      focusY + 64,
      74,
      22,
      'Upgrade',
      () => {
        if (this.selectedStructureId) {
          gameStore.upgrade(this.selectedStructureId);
        }
      },
      0x4d3323
    );

    this.actionOriginX = shell.contentX;
    this.actionOriginY = opsY;
    this.createSlots(shell.contentX + 10, slotsY + 38);
    this.createActionTabs();
    this.renderActionButtons();

    this.selectedStructureId =
      gameStore.getState().base.structures.find((structure) => structure.buildingId)?.id ?? null;

    this.refresh();
    createTutorialOverlay(this, 'BaseScene');
    void this.syncLobbyBanner();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      void hideBannerPlacementThroughPlatform();
    });
  }

  private async syncLobbyBanner(): Promise<void> {
    const state = gameStore.getState();
    const commerceCapabilities = getCommerceCapabilities();

    if (state.meta.store.adsDisabled || !commerceCapabilities.bannerAds) {
      await hideBannerPlacementThroughPlatform();
      return;
    }

    await showBannerPlacementThroughPlatform('base_lobby');
  }

  private createSlots(startX: number, startY: number): void {
    const state = gameStore.getState();
    const columns = 2;
    const slotWidth = 180;
    const slotHeight = 34;

    this.slotObjects = state.base.structures.map((structure, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * 188;
      const y = startY + row * 42;

      const box = this.add
        .rectangle(x, y, slotWidth, slotHeight, 0x231d18, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0x6a4d35)
        .setInteractive({ useHandCursor: true });
      const icon = structure.buildingId
        ? addBuildingImage(this, structure.buildingId, x + 18, y + 17, 22)
        : null;
      const label = this.add.text(x + 34, y + 5, '', {
        fontSize: '10px',
        color: '#f3ead9',
        fontFamily: 'monospace',
        wordWrap: { width: slotWidth - 44 }
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

  private createActionTabs(): void {
    const tabs: Array<{ mode: ActionMode; label: string; color: number }> = [
      { mode: 'build', label: 'BUILD', color: 0x35574a },
      { mode: 'train', label: 'TRAIN', color: 0x304032 },
      { mode: 'ops', label: 'OPS', color: 0x4d3323 },
      { mode: 'admin', label: 'ADMIN', color: 0x2d3947 }
    ];

    tabs.forEach((tab, index) => {
      this.actionTabButtons[tab.mode] = createButton(
        this,
        this.actionOriginX + 44 + index * 96,
        this.actionOriginY + 28,
        88,
        20,
        tab.label,
        () => {
          this.actionMode = tab.mode;
          this.renderActionButtons();
          this.refresh();
        },
        tab.color
      );
    });
  }

  private getActionDefinitions(): ActionButtonDefinition[] {
    if (this.actionMode === 'build') {
      return [
        {
          label: 'Build Scrap',
          onClick: () => gameStore.build('scrap_yard'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'scrap_yard')
        },
        {
          label: 'Build Power',
          onClick: () => gameStore.build('generator'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'generator')
        },
        {
          label: 'Barracks',
          onClick: () => gameStore.build('barracks'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'barracks')
        },
        {
          label: 'Garage',
          onClick: () => gameStore.build('garage'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'garage')
        },
        {
          label: 'Storage',
          onClick: () => gameStore.build('storage'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'storage')
        },
        {
          label: 'Turret',
          onClick: () => gameStore.build('auto_turret'),
          fillColor: 0x35574a,
          isEnabled: (state) => canBuildStructure(state, 'auto_turret')
        }
      ];
    }

    if (this.actionMode === 'train') {
      return [
        {
          label: 'Train Scav',
          onClick: () => gameStore.queueUnit('scavenger'),
          fillColor: 0x304032,
          isEnabled: (state) => canTrainUnit(state, 'scavenger')
        },
        {
          label: 'Train Rifle',
          onClick: () => gameStore.queueUnit('rifleman'),
          fillColor: 0x304032,
          isEnabled: (state) => canTrainUnit(state, 'rifleman')
        },
        {
          label: 'Train Shield',
          onClick: () => gameStore.queueUnit('shieldbot'),
          fillColor: 0x304032,
          isEnabled: (state) => canTrainUnit(state, 'shieldbot')
        },
        {
          label: 'Train Buggy',
          onClick: () => gameStore.queueUnit('rocket_buggy'),
          fillColor: 0x304032,
          isEnabled: (state) => canTrainUnit(state, 'rocket_buggy')
        },
        {
          label: 'Train Drone',
          onClick: () => gameStore.queueUnit('repair_drone'),
          fillColor: 0x304032,
          isEnabled: (state) => canTrainUnit(state, 'repair_drone')
        },
        {
          label: 'Scout Map',
          onClick: () => this.scene.start('ScoutScene'),
          fillColor: 0x27424b,
          isEnabled: () => true
        }
      ];
    }

    if (this.actionMode === 'ops') {
      return [
        {
          label: 'HQ Up',
          onClick: () => gameStore.levelUpHq(),
          fillColor: 0x4d3323,
          isEnabled: (state) => {
            const nextCost = getHqLevelCost(state.base.hqLevel + 1);
            return nextCost !== null && canAfford(state.resources, nextCost);
          }
        },
        {
          label: 'Upgrade',
          onClick: () => {
            if (this.selectedStructureId) {
              gameStore.upgrade(this.selectedStructureId);
            }
          },
          fillColor: 0x4d3323,
          isEnabled: (state) =>
            canUpgradeSelectedStructure(
              state,
              state.base.structures.find((structure) => structure.id === this.selectedStructureId)
            )
        },
        {
          label: 'Scout',
          onClick: () => this.scene.start('ScoutScene'),
          fillColor: 0x27424b,
          isEnabled: () => true
        },
        {
          label: 'Shop',
          onClick: () => this.scene.start('ShopScene'),
          fillColor: 0x35574a,
          isEnabled: () => true
        },
        {
          label: 'Offline',
          onClick: () => gameStore.clearOfflineReward(),
          fillColor: 0x28454d,
          isEnabled: (state) => state.pendingOfflineReward !== null
        },
        {
          label: 'Counter',
          onClick: () => gameStore.resolveCounterAttack(),
          fillColor: 0x4d3323,
          isEnabled: (state) => state.meta.counterThreat >= 100
        }
      ];
    }

    return [
      {
        label: 'Claim M1',
        onClick: () => {
          const mission = gameStore.getState().meta.dailyMissions[0];
          if (mission) {
            gameStore.claimMission(mission.id);
          }
        },
        fillColor: 0x35574a,
        isEnabled: (state) => {
          const mission = state.meta.dailyMissions[0];
          return Boolean(mission && !mission.claimed && mission.progress >= mission.target);
        }
      },
      {
        label: 'Claim M2',
        onClick: () => {
          const mission = gameStore.getState().meta.dailyMissions[1];
          if (mission) {
            gameStore.claimMission(mission.id);
          }
        },
        fillColor: 0x35574a,
        isEnabled: (state) => {
          const mission = state.meta.dailyMissions[1];
          return Boolean(mission && !mission.claimed && mission.progress >= mission.target);
        }
      },
      {
        label: 'Claim M3',
        onClick: () => {
          const mission = gameStore.getState().meta.dailyMissions[2];
          if (mission) {
            gameStore.claimMission(mission.id);
          }
        },
        fillColor: 0x35574a,
        isEnabled: (state) => {
          const mission = state.meta.dailyMissions[2];
          return Boolean(mission && !mission.claimed && mission.progress >= mission.target);
        }
      },
      {
        label: 'Reset Save',
        onClick: () => {
          gameStore.reset();
          this.scene.restart();
        },
        fillColor: 0x5a2424,
        isEnabled: () => true
      },
      {
        label: 'Tutorial',
        onClick: () => {
          gameStore.restartTutorial();
          this.scene.restart();
        },
        fillColor: 0x27424b,
        isEnabled: () => true
      },
      {
        label: 'Refresh',
        onClick: () => gameStore.refreshScoutTargets(),
        fillColor: 0x2d3947,
        isEnabled: () => true
      }
    ];
  }

  private renderActionButtons(): void {
    this.actionButtons.forEach(({ button }) => button.destroy());
    this.actionButtons = [];

    const definitions = this.getActionDefinitions();
    definitions.forEach((definition, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const button = createButton(
        this,
        this.actionOriginX + 59 + column * 135,
        this.actionOriginY + 52 + row * 28,
        118,
        24,
        definition.label,
        definition.onClick,
        definition.fillColor
      );

      this.actionButtons.push({
        button,
        isEnabled: definition.isEnabled
      });
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
        ? ` ETA ${getEtaSec(liveStructure.completeAt, state.now)}s`
        : '';

      slotObject.label.setText(
        `${liveStructure.slotId.toUpperCase()}\n${label}${liveStructure.level > 0 ? ` L${liveStructure.level}` : ''}${busy}`
      );

      if (slotObject.buildingId !== liveStructure.buildingId) {
        slotObject.icon?.destroy();
        slotObject.icon = liveStructure.buildingId
          ? addBuildingImage(
              this,
              liveStructure.buildingId,
              slotObject.box.x + 18,
              slotObject.box.y + 17,
              22
            )
          : null;
        slotObject.buildingId = liveStructure.buildingId;
      }

      const isSelected = this.selectedStructureId === liveStructure.id;
      slotObject.box.setStrokeStyle(2, isSelected ? 0x8ef2d3 : 0x6a4d35);
      slotObject.box.setFillStyle(
        liveStructure.buildingId ? (liveStructure.completeAt ? 0x403124 : 0x2a241f) : 0x191513,
        1
      );
    }
  }

  private refresh(): void {
    const state = gameStore.getState();

    if (!this.selectedStructureId) {
      this.selectedStructureId =
        state.base.structures.find((structure) => structure.buildingId)?.id ?? null;
    }

    const selected = state.base.structures.find(
      (structure) => structure.id === this.selectedStructureId
    );
    const nextHqCost = getHqLevelCost(state.base.hqLevel + 1);
    const barracksQueue = getQueueStatus(state.base.trainingQueues.barracks, state.now);
    const garageQueue = getQueueStatus(state.base.trainingQueues.garage, state.now);
    const offline = state.pendingOfflineReward;
    const unlockStatus = getUnlockStatus(state, balance);
    const unlockMilestones = getUpcomingUnlockMilestones(state, balance, 2);
    const nextMilestonePreview = getMilestonePreview(unlockMilestones[0]);
    const actionHint = getActionModeHint(this.actionMode, unlockStatus, unlockMilestones);

    this.commandText?.setText(
      [
        `SCRAP ${state.resources.scrap} | POWER ${state.resources.power} | CORE ${state.resources.core}`,
        `HQ ${state.base.hqLevel} | ZONE ${state.meta.zoneTier} | THREAT ${state.meta.counterThreat}/100`,
        `OFFLINE ${offline ? `${offline.minutes}m` : 'SYNCED'} | TARGETS ${state.base.scoutTargets.length} | COUNTER ${
          state.meta.counterThreat >= 100 ? 'READY' : 'BUILDING'
        }`,
        actionHint
      ].join('\n')
    );

    this.missionText?.setText(
      [
        'DAILY OPS',
        ...state.meta.dailyMissions.slice(0, 3).map(getMissionLine),
        ...nextMilestonePreview
      ].join('\n')
    );

    this.rosterText?.setText(
      [
        'UNITS',
        `${UNIT_LABELS.scavenger} ${state.roster.scavenger ?? 0} | ${UNIT_LABELS.rifleman} ${state.roster.rifleman ?? 0}`,
        `${UNIT_LABELS.shieldbot} ${state.roster.shieldbot ?? 0} | ${UNIT_LABELS.rocket_buggy} ${state.roster.rocket_buggy ?? 0}`,
        `${UNIT_LABELS.repair_drone} ${state.roster.repair_drone ?? 0}`,
        `QUEUE B ${barracksQueue} | G ${garageQueue}`
      ].join('\n')
    );

    this.researchText?.setText(
      (['barracks', 'garage'] as const)
        .map((trackId) => {
          const definition = getResearchDefinition(trackId);
          const level = state.meta.researches[trackId];
          const unlocked = state.base.hqLevel >= definition.unlockHqLevel;
          const nextCost = getResearchCost(trackId, level + 1);

          if (!unlocked) {
            return `${definition.shortLabel} LOCK HQ${definition.unlockHqLevel}\n${getResearchUnitsLabel(trackId)}`;
          }

          return `${definition.shortLabel} L${level}/${definition.maxLevel}\n${nextCost ? `NEXT ${formatResources(nextCost, true)}` : 'MAXED'}\n${getResearchUnitsLabel(trackId)}`;
        })
        .join('\n\n')
    );

    this.selectedText?.setText(
      [getCompactSelectedSummary(state, selected)].filter(Boolean).join('\n')
    );

    (['barracks', 'garage'] as const).forEach((trackId) => {
      const definition = getResearchDefinition(trackId);
      const level = state.meta.researches[trackId];
      const nextCost = getResearchCost(trackId, level + 1);
      const unlocked = state.base.hqLevel >= definition.unlockHqLevel;
      const available = unlocked && nextCost !== null && canAfford(state.resources, nextCost);
      this.researchButtons[trackId]?.setAlpha(
        !unlocked || nextCost === null ? 0.35 : available ? 1 : 0.55
      );
    });

    this.hqButton?.setAlpha(
      nextHqCost === null ? 0.35 : canAfford(state.resources, nextHqCost) ? 1 : 0.55
    );
    this.upgradeButton?.setAlpha(canUpgradeSelectedStructure(state, selected) ? 1 : 0.45);

    this.updateSlotLabels(state);

    Object.entries(this.actionTabButtons).forEach(([mode, button]) => {
      button?.setAlpha(mode === this.actionMode ? 1 : 0.6);
    });
    this.actionButtons.forEach(({ button, isEnabled }) => {
      button.setAlpha(isEnabled(state) ? 1 : 0.35);
    });
  }

  update(): void {
    gameStore.tick();
    this.refresh();
  }
}
