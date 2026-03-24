import './style.css';
import { APP_METADATA } from './app/appMeta';
import { VIEWPORT } from './app/config';
import { bootGame } from './app/boot';
import { getUpcomingUnlockMilestones, getUnlockMilestoneItems, getUnlockStatus } from './domain/meta/unlocks';
import { installCapacitorCommerceBridge } from './platform/capacitorCommerceBridge';
import {
  getCachedCommerceDiagnostics,
  getCommerceCapabilities,
  installDebugCommerceBridgeFromUrl,
  refreshCommerceDiagnostics
} from './platform/commerce';
import { balance, gameStore } from './state/gameState';
import { getCurrentRaid } from './state/session';
import { advanceDebugNowMs, resetDebugNowMs } from './utils/time';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<string>;
    resetDebugTime?: () => string;
  }
}

installCapacitorCommerceBridge();
installDebugCommerceBridgeFromUrl();
void refreshCommerceDiagnostics();

const game = bootGame('app');

const getActiveSceneKey = (): string | null => {
  const [activeScene] = game.scene.getScenes(true);
  return activeScene?.scene.key ?? null;
};

const renderGameToText = (): string => {
  const state = gameStore.getState();
  const activeRaid = getCurrentRaid();
  const unlockStatus = getUnlockStatus(state, balance);
  const unlockMilestones = getUpcomingUnlockMilestones(state, balance, 2);
  const commerce = getCommerceCapabilities();
  const selectedTarget =
    state.base.scoutTargets.find((target) => target.id === state.base.selectedScoutTargetId) ?? null;

  return JSON.stringify({
    app: {
      id: APP_METADATA.slug,
      title: document.title,
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      packageId: APP_METADATA.packageId,
      privacyPolicyPath: APP_METADATA.privacyPolicyPath
    },
    coordinateSystem: 'canvas origin top-left; x increases right, y increases down',
    scene: getActiveSceneKey(),
    resources: state.resources,
    base: {
      hqLevel: state.base.hqLevel,
      zoneTier: state.meta.zoneTier,
      counterThreat: state.meta.counterThreat,
      pendingOfflineMinutes: state.pendingOfflineReward?.minutes ?? 0
    },
    roster: state.roster,
    researches: state.meta.researches,
    unlocks: {
      nextMilestones: unlockMilestones.map((milestone) => ({
        hqLevel: milestone.hqLevel,
        items: getUnlockMilestoneItems(milestone)
      })),
      lockedBuildings: unlockStatus.buildingsLocked,
      lockedUnits: unlockStatus.unitsLocked,
      lockedResearches: unlockStatus.researchesLocked,
      facilityNeeds: unlockStatus.facilityNeeds
    },
    commerce,
    commerceDiagnostics: getCachedCommerceDiagnostics(),
    store: {
      adsDisabled: state.meta.store.adsDisabled,
      rewardedAdsWatched: state.meta.store.rewardedAdsWatched,
      lastRewardedPlacement: state.meta.store.lastRewardedPlacement,
      purchases: state.meta.store.purchases,
      monthlySupplyReady:
        state.meta.store.purchases.monthly_pass &&
        state.meta.store.monthlySupplyClaimDay !== state.meta.dayIndex,
      offlineBoostReady:
        Boolean(state.pendingOfflineReward) && state.pendingOfflineReward?.boosted === false
    },
    selectedTarget: selectedTarget
      ? {
          id: selectedTarget.id,
          name: selectedTarget.name,
          difficulty: selectedTarget.difficulty,
          recommendedPower: selectedTarget.recommendedPower,
          defenders: selectedTarget.defenderCount,
          turrets: selectedTarget.turrets
        }
      : null,
    lastBattle: state.lastBattle
      ? {
          targetId: state.lastBattle.targetId,
          victory: state.lastBattle.victory,
          durationSec: state.lastBattle.durationSec
        }
      : null,
    activeRaid: activeRaid
      ? {
          result: activeRaid.result,
          timeSec: activeRaid.timeSec,
          lane: activeRaid.entryLane,
          lootMultiplier: activeRaid.raidResultMultiplier,
          playerAlive: activeRaid.playerActors.filter((actor) => actor.alive).length,
          enemyAlive: activeRaid.enemyActors.filter(
            (actor) => actor.alive && actor.kind === 'unit'
          ).length,
          turretAlive: activeRaid.enemyActors.filter(
            (actor) => actor.alive && actor.kind === 'turret'
          ).length,
          loot: activeRaid.rewards
        }
      : null
  });
};

window.render_game_to_text = renderGameToText;
window.advanceTime = async (ms: number) => {
  advanceDebugNowMs(ms);
  gameStore.tick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  return renderGameToText();
};
window.resetDebugTime = () => {
  resetDebugNowMs();
  gameStore.tick();
  return renderGameToText();
};
