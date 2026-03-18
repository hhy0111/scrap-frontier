export type TutorialSceneId =
  | 'BaseScene'
  | 'ScoutScene'
  | 'RaidPrepScene'
  | 'RaidScene'
  | 'ResultScene';

export type TutorialStep = {
  index: number;
  scene: TutorialSceneId;
  title: string;
  body: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    index: 0,
    scene: 'BaseScene',
    title: 'Base Control',
    body:
      '좌측은 자원과 행동 버튼, 우측은 12슬롯 기지다. 먼저 생산 건물과 훈련 큐를 늘려 기지 템포를 만든다.'
  },
  {
    index: 1,
    scene: 'ScoutScene',
    title: 'Scout Targets',
    body:
      '정찰 카드 3장 중 추천 전투력과 보상을 비교해 대상을 고른다. 필요하면 새로고침으로 다른 조합을 찾는다.'
  },
  {
    index: 2,
    scene: 'RaidPrepScene',
    title: 'Raid Setup',
    body:
      '분대는 최대 4기까지 편성한다. 라인 선택은 시작 위치를 바꾸므로 상대 터렛 배치에 맞춰 진입 방향을 고른다.'
  },
  {
    index: 3,
    scene: 'RaidScene',
    title: 'Semi Auto Combat',
    body:
      '전투는 자동이지만 Rally를 쓰면 5초 동안 공격 속도와 이동 속도가 오른다. 위험하면 Retreat로 손실을 줄인다.'
  },
  {
    index: 4,
    scene: 'ResultScene',
    title: 'Post Battle Loop',
    body:
      '결과에서 손실과 약탈량을 확인하고 바로 재정찰하거나 기지로 돌아가 자원을 재투자한다.'
  }
];

export const getTutorialStep = (index: number): TutorialStep | null =>
  TUTORIAL_STEPS.find((step) => step.index === index) ?? null;
