# Scrap Frontier 현재 진행상황

기준일: 2026-03-20

## 1. 프로젝트 개요

- 프로젝트명: Scrap Frontier
- 장르: 모바일 2D 탑다운 자동 생산 + 약탈 + 기지 성장 전략 게임
- 기술 스택: Phaser 3 + TypeScript + Vite
- 목표 상태: 1인 개발 가능한 모바일 MVP

## 2. 현재 구현 완료 범위

### 게임 루프

- Base -> Scout -> Raid Prep -> Raid -> Result 흐름이 연결되어 있다.
- 저장 데이터 기준으로 기지 운영과 레이드 결과가 이어진다.

### 기지 운영

- 자원 3종 생산: Scrap / Power / Core
- 건설: Scrap Yard / Generator / Barracks / Garage / Storage / Auto Turret
- HQ 레벨업
- 건물 업그레이드
- 유닛 훈련 큐
- 저장 용량 제한
- 오프라인 생산 보상 요약

### 전투/약탈

- 정찰 타깃 3개 생성
- 추천 전투력 표시
- 레이드 준비 화면에서 분대 편성 가능
- 진입 라인 선택: left / mid / right
- 자동 전투
- Rally 버프
- Retreat 처리
- 결과 정산: 생존 / 손실 / 획득 자원

### 메타 시스템

- 일일 임무
- 반격 웨이브
- 튜토리얼 오버레이
- 디버그 로그 저장
- 로컬 저장/불러오기

## 3. 씬별 상태

- `BaseScene`: 기지 운영, 오프라인 보상, 일일 임무, 반격 상태 표시
- `ScoutScene`: 정찰 카드 UI, 타깃 선택, 출격 준비 진입
- `RaidPrepScene`: 타깃 요약, 분대 구성, 라인 선택
- `RaidScene`: 전장 배경/소품/유닛/건물/FX 적용된 자동 전투
- `ResultScene`: 승패 배너, 결과 리포트, 다음 루프 진입
- `TutorialOverlay`: 주요 화면 안내

## 4. 아트 자산 반영 상태

- 생성 이미지 50장을 `public/assets/generated` 아래로 정리 완료
- 현재 실제 연결된 자산:
  - 자원 아이콘
  - 건물 7종
  - 유닛 5종
  - 정찰 카드
  - 승리/패배 배너
  - 전투 FX 일부
  - 전장 타일/소품 일부
  - 메타 로딩 아트 일부
- 원본 이미지 파일명 상태로 있던 `image` 폴더는 정리 완료

### 아직 저장만 되어 있고 게임에 적극 활용되지 않은 자산

- `ui_shop_pack_card`
- `ui_button_rewarded_ad`
- `meta_store_capsule_bg`
- `meta_app_icon`

## 5. 코드 구조 상태

- `src/data`: JSON 밸런스, 튜토리얼, 자산 매니페스트
- `src/domain`: 경제 / AI / 레이드 / 메타 규칙
- `src/state`: 게임 상태, 세션, 저장
- `src/scenes`: Phaser 씬
- `tests`: 경제 / AI / 레이드 / 메타 테스트

현재 구조는 복잡한 ECS 없이 `데이터 + 순수 함수 + 씬` 중심으로 유지되고 있다.

## 6. 검증 상태

마지막 검증 기준: 2026-03-20

- `npm run build` 통과
- `npm test` 통과
- 테스트 파일 수: 4
- 테스트 케이스 수: 9

## 7. 현재 작업 트리 상태

아직 커밋되지 않은 변경이 있다.

- `src/app/assets.ts`
- `src/data/assetManifest.ts`
- `src/scenes/BaseScene.ts`
- `src/scenes/ScoutScene.ts`
- `src/scenes/RaidPrepScene.ts`
- `src/scenes/RaidScene.ts`
- `src/scenes/ResultScene.ts`
- `public/assets/generated/`

즉, 이번 아트 연결 작업은 아직 원격 저장소에 반영되지 않은 상태다.

## 8. 남은 핵심 작업

### UI/연출

- 기지 화면 버튼 아이콘화
- 모바일 세로 비율 기준 HUD 재정리
- 정찰/결과 화면 정보 밀도 세부 조정

### 전투 표현

- 투사체 연출
- 피격 타이밍 정교화
- 전장 오브젝트 상호작용 연출

### 게임 시스템

- 건물/유닛 해금 정보 강화
- 오프라인 보상/임무 보상 UX 다듬기
- 반격 흐름 고도화

### 수익화/출시 준비

- 광고 버튼 실제 흐름 연결
- 소액결제 UI 연결
- 앱 아이콘 / 스토어 이미지 반영

## 9. 추천 다음 작업 순서

1. 현재 미커밋 변경을 커밋하고 GitHub 반영
2. 기지 화면 버튼과 HUD에 아이콘/UI 자산 연결
3. 전투 씬에 투사체와 히트 연출 추가
4. 광고/IAP 더미 UI를 실제 흐름으로 연결
5. 모바일 해상도 기준 최종 UI 정리

