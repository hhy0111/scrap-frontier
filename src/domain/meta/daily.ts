import { addResources } from '../../utils/resources';
import type { DailyMission, DailyMissionType, GameState } from '../../types/game';

const createMission = (
  id: string,
  type: DailyMissionType,
  label: string,
  target: number,
  reward: DailyMission['reward']
): DailyMission => ({
  id,
  type,
  label,
  target,
  progress: 0,
  reward,
  claimed: false
});

export const getDayIndex = (now: number): number => Math.floor(now / 86400000);

export const createDailyMissions = (): DailyMission[] => [
  createMission('daily_raid_win', 'raid_win', '승리 레이드 1회', 1, {
    scrap: 120,
    power: 60,
    core: 10
  }),
  createMission('daily_train_unit', 'train_unit', '유닛 훈련 3회', 3, {
    scrap: 160,
    power: 50,
    core: 8
  }),
  createMission('daily_build_any', 'build_any', '건설 또는 업그레이드 1회', 1, {
    scrap: 140,
    power: 70,
    core: 12
  })
];

export const syncDailyMissions = (state: GameState, now: number): GameState => {
  const dayIndex = getDayIndex(now);
  if (state.meta.dayIndex === dayIndex) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.meta.dayIndex = dayIndex;
  next.meta.dailyMissions = createDailyMissions();
  return next;
};

export const advanceMissionProgress = (
  missions: DailyMission[],
  type: DailyMissionType,
  amount: number
): DailyMission[] =>
  missions.map((mission) =>
    mission.type === type && !mission.claimed
      ? {
          ...mission,
          progress: Math.min(mission.target, mission.progress + amount)
        }
      : mission
  );

export const claimMissionReward = (
  state: GameState,
  missionId: string
): GameState => {
  const mission = state.meta.dailyMissions.find((entry) => entry.id === missionId);
  if (!mission || mission.claimed || mission.progress < mission.target) {
    return state;
  }

  const next = structuredClone(state) as GameState;
  next.meta.dailyMissions = next.meta.dailyMissions.map((entry) =>
    entry.id === missionId ? { ...entry, claimed: true } : entry
  );
  next.resources = addResources(next.resources, mission.reward);
  return next;
};
