# Scrap Frontier 현재 진행상황

기준일: 2026-03-21

## 1. 프로젝트 개요

- 프로젝트명: Scrap Frontier
- 장르: 모바일 2D 탑다운 자동 생산 + 약탈 + 기지 성장 전략 게임
- 기술 스택: Phaser 3 + TypeScript + Vite
- 현재 상태: 코어 플레이 루프가 동작하는 프로토타입
- 목표 상태: 1인 개발 가능한 모바일 MVP

## 2. 실제 구현 완료 범위

### 게임 루프

- `Base -> Scout -> Raid Prep -> Raid -> Result` 흐름이 실제 씬으로 연결되어 있다.
- 로컬 저장 데이터를 기준으로 기지 운영, 레이드 결과, 메타 진행이 이어진다.

### 기지 운영

- 자원 3종 생산: Scrap / Power / Core
- 건설: Scrap Yard / Generator / Barracks / Garage / Storage / Auto Turret
- HQ 레벨업
- 건물 업그레이드
- 유닛 훈련 큐
- 저장 용량 제한
- 오프라인 생산 반영과 요약 표시

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
- 유닛 연구 2트랙: `barracks`, `garage`
- 튜토리얼 오버레이 5단계
- 디버그 로그 저장
- 로컬 저장/불러오기

## 3. 씬별 상태

- `BootScene`: 자산 프리로드 후 기지 화면 진입
- `BaseScene`: 기지 운영, 오프라인 보상, 일일 임무, 반격 상태 표시, 최근 로그 표시
- `ScoutScene`: 정찰 카드 UI, 타깃 선택, 새로고침, 출격 준비 진입
- `RaidPrepScene`: 타깃 요약, 분대 구성, 라인 선택, 자동 추천 분대
- `RaidScene`: 전장 배경/소품/유닛/건물/FX 적용된 자동 전투
- `ResultScene`: 승패 배너, 결과 리포트, 다음 루프 진입
- `ShopScene`: 미사용 상점 자산이 연결된 더미 상점 허브
- `TutorialOverlay`: 주요 화면 안내

## 4. 아트 자산 반영 상태

- 생성 자산은 `public/assets/generated` 아래에 정리되어 있다.
- 현재 실제 연결된 자산:
  - 자원 아이콘
  - 건물 7종
  - 유닛 5종
  - 정찰 카드
  - 상점 카드 / 광고 버튼 / 스토어 캡슐 / 앱 아이콘
  - 승리/패배 배너
  - 전투 FX 일부
  - 전장 타일/소품 일부
  - 메타 로딩 아트 일부

### 저장만 되어 있고 아직 적극 활용되지 않은 자산

- 현재는 위 자산들이 `ShopScene`에 연결되었지만 실제 SDK 흐름은 더미 상태다

## 5. 코드 구조 상태

- `src/data`: JSON 밸런스, 튜토리얼, 자산 매니페스트
- `src/domain`: 경제 / AI / 레이드 / 메타 규칙
- `src/state`: 게임 상태, 세션, 저장
- `src/scenes`: Phaser 씬
- `tests`: 경제 / AI / 레이드 / 메타 테스트

현재 구조는 복잡한 ECS 없이 `데이터 + 순수 함수 + 씬` 중심으로 유지되고 있다.

## 6. 검증 상태

마지막 검증 기준: 2026-03-21

- `npm test` 통과
- `npm run build` 통과
- 테스트 파일 수: 4
- 테스트 케이스 수: 13
- 참고: 현재 로컬 Node는 `v20.16.0`이며 Vite 7은 `20.19+`를 권장하므로 버전 경고가 출력된다

## 7. 현재 저장소 상태

- 작업 트리는 현재 clean 상태다
- 마지막 확인 커밋:
  - `1c30489 Integrate generated art assets into scenes`

즉, 이전 문서에 적혀 있던 "아트 연결 작업 미커밋 상태"는 현재 저장소 기준으로는 더 이상 맞지 않는다.

## 8. 설계 문서 대비 확인된 갭

### 콘텐츠 범위

- 적 기지 템플릿은 현재 12개다
- `zone1`, `zone2`, `zone3` 데이터가 들어가 있어 문서상의 최소 콘텐츠 범위는 맞춰졌다
- 아직 실제 플레이 밸런스와 보상 테이블 튜닝은 더 필요하다

### 메타 성장

- HQ 레벨업과 해금은 있다
- 유닛 연구 시스템은 추가됐다
- 해금 정보와 성장 안내 UI는 아직 기본 수준이다

### UI/화면 구조

- 현재 화면은 가로형 개발 UI에 가깝다
- 문서상 목표인 모바일 세로 비율 HUD, 하단 탭 구조, 상점 화면은 아직 없다
- `ShopScene`은 추가됐지만 모바일 상용 UI 수준은 아니다

### 수익화/출시 준비

- 광고 버튼 실제 흐름이 없다
- 인앱결제 UI와 SDK 연결은 아직 없다
- 앱 아이콘/스토어용 메타 자산은 연결됐지만 출시 흐름은 아직 없다

### 전투 표현

- 전투는 동작하지만 설계보다 단순하다
- 현재는 최근접 타깃 직선 이동 + 기본 FX 중심이다
- 문서에서 기대한 수준의 투사체, 후퇴 채널링, 전장 오브젝트 상호작용은 아직 없다

### 디버그/운영

- 최근 로그 표시는 있다
- 별도 디버그 패널과 개발자 명령 UI는 아직 없다

## 9. 남은 핵심 작업

### 1순위: 모바일 UI 재구성

- 세로 비율 기준 레이아웃 확정
- Base / Scout / Result HUD 정보 밀도 조정
- 하단 탭 중심 조작 구조로 정리

### 2순위: 콘텐츠 범위 확장

- 지역 상승에 맞는 보상/난이도 스케일 튜닝
- 정찰 대상 구성 다양성 보강
- 해금 흐름이 실제 플레이 감각에 맞도록 조정

### 3순위: 메타 성장 보강

- 해금 정보 UI 강화
- 반격 흐름 고도화
- 연구 밸런스와 비용 테이블 튜닝

### 4순위: 수익화 뼈대 구현

- 상점 화면을 실제 상품 흐름으로 고도화
- 광고 보상 버튼과 실제 흐름 연결
- IAP 상품 카드와 구매 흐름 연결

### 5순위: 전투 연출 보강

- 투사체 연출
- 피격 타이밍 정교화
- 후퇴 채널링/표현 추가
- 전장 오브젝트 상호작용 연출

### 6순위: 출시 준비

- Capacitor/안드로이드 패키징
- 앱 아이콘/스토어 이미지 반영
- 내부 테스트용 체크리스트 정리

## 10. 추천 다음 작업 순서

1. 모바일 세로형 UI 뼈대를 먼저 만든다
2. `ShopScene`을 실제 상품/광고 흐름으로 확장한다
3. 지역별 보상/난이도 스케일을 실제 플레이 감각에 맞게 튜닝한다
4. 연구 UI와 비용/효율을 튜닝해 성장 동기를 강화한다
5. 전투 연출을 보강해 프로토타입 느낌을 줄인다
6. Android 패키징과 스토어 메타데이터 준비로 넘어간다

## 11. 바로 착수 권장 작업

현재 코드베이스 기준으로 가장 먼저 손대야 할 일은 아래 3개다.

1. `BaseScene`, `ScoutScene`, `ResultScene`를 모바일 세로 비율 레이아웃으로 재구성
2. `ShopScene`을 광고/IAP 실동작 화면으로 확장
3. 모바일 세로형 UI 재구성

위 3개가 끝나면 "코어 프로토타입"에서 "MVP 형태가 보이는 빌드"로 넘어간다.
## 12. 2026-03-21 Update

- The main meta scenes now use a centered portrait-shell layout while keeping the existing 1280x720 game config.
- `BaseScene` now uses a tabbed action panel plus quick `Scout` / `Shop` entry buttons to keep the mobile UI readable.
- `ScoutScene`, `RaidPrepScene`, `ResultScene`, and `ShopScene` were rebuilt around the same portrait shell for a more consistent mobile flow.
- Debug/test hooks were added for browser validation:
  - `window.render_game_to_text`
  - async `window.advanceTime(ms)` with a guaranteed RAF
  - `BootScene` query hook: `?scene=ShopScene` style direct launch
  - `preserveDrawingBuffer: true` in Phaser render config for screenshot capture
- Verification after this update:
  - `npm test` passed: 4 files / 13 tests
  - `npm run build` passed
  - Playwright visual capture successfully rendered `BaseScene` in `output/web-game/base-headed-2/shot-0.png`
  - Additional automated captures for other scenes were attempted, but the local server timing in this environment was inconsistent

## 13. Current Remaining Work

1. Replace placeholder monetization in `ShopScene` with real ad / IAP wiring.
2. Expand mobile polish into the combat scene if full portrait gameplay is still required.
3. Finish a stable visual regression loop for all key scenes, not only `BaseScene`.
4. Continue MVP completion work: richer zone progression, stronger unlock UI, and release packaging.

## 14. 2026-03-21 Update

- `ShopScene` is no longer placeholder-only.
  - Added persistent store state for one-time offers, monthly pass, rewarded placements, ad-free mode, and daily supply claims.
  - Rewarded actions now apply real in-game effects:
    - resource salvage drop
    - scout target reroll
    - offline reward boost
- `RaidScene` now uses the same centered portrait-shell layout as the other meta scenes.
  - The old wide combat coordinate space is scaled into the portrait combat panel.
  - Combat HUD, squad summary, and action buttons were re-packed for the mobile flow.
  - `BootScene` can now self-seed a debug raid for `?scene=RaidScene` if no raid is already active.
- Debug visibility improved:
  - `window.render_game_to_text` now includes store status and active raid summary.

## 15. Verification Snapshot

- `npx tsc --noEmit`: passed
- `npm test`: blocked in this sandbox by `spawn EPERM`
- `npm run build`: blocked in this sandbox by `spawn EPERM`
- `npx vitest run --configLoader runner`: still blocked by `spawn EPERM`
- `npx vite build --configLoader runner`: still blocked by `spawn EPERM`
- Existing browser artifact from the updated shop flow is still available:
  - `output/web-game/shop-direct-live-2/shot-0.png`

## 16. Updated Remaining Work

1. Re-run full validation outside the sandbox or with approval so the latest raid/mobile changes are confirmed.
2. Capture fresh Playwright screenshots for `RaidScene`, then finish the rest of the scene-by-scene visual regression loop.
3. Replace the current mock monetization layer with real platform ad / IAP hooks.
4. Continue MVP completion: unlock UX polish, richer zone progression, and Android packaging / store assets.

## 17. 2026-03-21 Follow-up

- Unlock UX is now partially surfaced in-game instead of living only in docs.
  - Added reusable unlock milestone/status helpers in `src/domain/meta/unlocks.ts`.
  - `BaseScene` now shows:
    - current lock hints tied to the active tab
    - next HQ unlock preview in the daily-ops column
  - `window.render_game_to_text` now includes unlock milestone and lock status data.
- `RaidScene` verification found and fixed two real issues:
  - dead/alive sprite resizing was resetting to raw texture size because `setScale()` was applied after `setDisplaySize()`
  - `render_game_to_text` was reporting stale raid state because the live raid was not being pushed back into session storage after updates
- Browser validation status is now stronger than before:
  - `npm test` passed: 4 files / 18 tests
  - `npm run build` passed
  - headed Playwright capture for the updated raid flow succeeded:
    - `output/web-game/raid-direct-headed-2/shot-0.png`
    - `output/web-game/raid-direct-headed-2/state-0.json`
  - the previous favicon 404 was removed by wiring `index.html` to the existing app icon

## 18. Revised Remaining Work

1. Extend the same visual regression loop to `BaseScene`, `ScoutScene`, `RaidPrepScene`, and `ShopScene` on the latest build.
2. Replace the current mock monetization flow with actual platform ad / IAP hooks.
3. Continue MVP scope fill: richer zone progression, stronger release polish, and Android packaging / store assets.

## 19. 2026-03-21 Consolidated Progress Update

- The mobile UI baseline is now a real portrait game viewport instead of a portrait shell inside a wide canvas.
  - `src/app/config.ts` now uses `432x768`.
  - `src/scenes/mobileFrame.ts` now computes its frame metrics from the live canvas size.
  - Footer/action placement in the portrait scenes was updated to use the shared frame geometry.
- The monetization layer now has a proper platform boundary instead of being scene-local mock logic only.
  - Added `src/platform/commerce.ts`.
  - It detects `window.ScrapFrontierNativeCommerce` when present.
  - It exposes capability checks plus async purchase/rewarded actions.
  - It falls back to a controlled web-mock path when no native bridge is present.
- `ShopScene` was updated to use that platform adapter.
  - The scene now shows provider status (`NATIVE BRIDGE` vs `WEB MOCK`).
  - Purchase/rewarded buttons run through async handlers with busy-state protection.
  - The UI also surfaces the latest platform action result text.
- Unlock pacing is no longer visible only in `BaseScene`.
  - `ScoutScene` now shows either the next HQ unlock preview or the missing facility hint.
  - `RaidPrepScene` now shows the same unlock guidance in the target summary block.
- Zone progression and scout generation were tuned to better match actual player strength.
  - Scout generation now estimates current raid power from the best available roster slice.
  - Target generation now uses three ascending power bands.
  - The weighted template picker now biases toward the highest unlocked zone tier while still allowing some lower-tier spillover.
  - Duplicate template presentation is avoided when the available pool is large enough.

## 20. Verification After Tasks 1-5

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 4 files / 19 tests
- `npm run build`: passed
- Verified/retained scene artifacts from the latest usable browser loop:
  - `output/web-game/base-portrait-4/shot-0.png`
  - `output/web-game/scout-portrait-1/shot-0.png`
  - `output/web-game/raidprep-portrait-2/shot-0.png`
  - `output/web-game/raid-direct-headed-2/shot-0.png`
- `ShopScene` visual validation remains partially verified:
  - the portrait screenshot path exists from the current workstream
  - however one follow-up recapture resolved against the wrong local app/server, so the shop capture loop still needs to be normalized before treating the newest `state-0.json` as authoritative
- Environment note:
  - Node is still `20.16.0`
  - Vite 7 continues to warn that `20.19+` is recommended

## 21. Updated Remaining Work

1. Normalize the Playwright visual regression loop so `ShopScene` and `BaseScene` always produce clean, scene-matching screenshot/state pairs.
2. Replace the web-mock fallback in `src/platform/commerce.ts` with actual native/Capacitor ad and IAP bridge implementations.
3. Run a deeper balance pass on zone2/zone3 target rewards and recommended power after longer progression simulations.
4. Continue release preparation: Android packaging, save validation, and store asset handoff.

## 22. 2026-03-21 Capture/Commerce Hardening Update

- The scene capture loop is now deterministic enough to trust again.
  - Added `scripts/capture-scene.mjs`.
  - Added `npm run capture:scene`.
  - The script serves the local `dist` build on an isolated random port, invokes the bundled Playwright client, and rejects the run if:
    - `state-0.json` does not report `app.id === "scrap-frontier"`
    - `state-0.json` does not match the requested scene key
- Debug/runtime identity is now exposed directly in `window.render_game_to_text`.
  - Added an `app` payload with:
    - `id`
    - `title`
    - `viewport`
- `BootScene` now supports `?tutorial=off`.
  - This makes clean `BaseScene` visual captures possible without manual tutorial dismissal.
- The commerce adapter is stricter and closer to real platform behavior now.
  - It detects both:
    - `window.ScrapFrontierNativeCommerce`
    - `window.Capacitor.Plugins.ScrapFrontierCommerce`
  - A partially implemented native bridge no longer falls through to a fake web success path.
  - Instead, unsupported actions now return explicit native-unavailable failures.
  - Added URL-driven debug bridge modes:
    - `?commerce=native-mock`
    - `?commerce=native-no-purchases`
    - `?commerce=native-no-rewarded`
- `ShopScene` now reflects commerce capability state directly.
  - Provider/source labels are clearer.
  - IAP-unavailable and rewarded-unavailable states now disable the relevant actions instead of pretending the platform path is valid.

## 23. Verification After Capture/Commerce Hardening

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 22 tests
- `npm run build`: passed
- New scene-matching artifacts from the deterministic capture script:
  - `output/web-game/base-clean-2/shot-0.png`
  - `output/web-game/base-clean-2/state-0.json`
  - `output/web-game/shop-clean-1/shot-0.png`
  - `output/web-game/shop-clean-1/state-0.json`
  - `output/web-game/shop-native-mock-1/shot-0.png`
  - `output/web-game/shop-native-mock-1/state-0.json`
- The previous `ShopScene` capture mismatch risk is effectively closed:
  - `shop-clean-1/state-0.json` now reports:
    - `app.id = "scrap-frontier"`
    - `scene = "ShopScene"`
  - `shop-native-mock-1/state-0.json` also verifies the debug native bridge path:
    - `commerce.provider = "native-bridge"`
    - `commerce.source = "window-bridge"`

## 24. Updated Remaining Work

1. Replace the debug/native mock commerce bridge with real Capacitor/mobile bridge implementations and finalized method names.
2. Extend the deterministic `capture-scene` loop to `ScoutScene`, `RaidPrepScene`, and `RaidScene` so all key flows share the same validation path.
3. Run a deeper zone2/zone3 balance pass now that the capture loop and platform debug hooks are stable.
4. Continue release prep: Android packaging, save validation, and store asset handoff.

## 25. 2026-03-21 Batch Capture + Balance Regression Update

- The deterministic scene-capture flow now covers the core portrait scenes, not only isolated one-off runs.
  - Added `scripts/capture-core-scenes.mjs`.
  - Added `npm run capture:core-scenes`.
  - The batch runner supports:
    - `--from <SceneKey>`
    - `--only <SceneKey>`
  - This makes long capture batches resumable after a single scene failure.
- `RaidScene` needed its own short capture profile.
  - A long idle capture could legitimately finish the fight and land in `ResultScene`.
  - Added `playwright-actions/raid-preview.json`.
  - The batch runner now uses that shorter action profile for `RaidScene`.
- The "latest" artifact set is now consistent across the core scenes.
  - `output/web-game/base-clean-latest`
  - `output/web-game/scout-clean-latest`
  - `output/web-game/raidprep-clean-latest`
  - `output/web-game/raid-clean-latest`
  - `output/web-game/shop-clean-latest`
  - `output/web-game/shop-native-mock-latest`
- Scout balance validation is now slightly stronger than before.
  - Added a regression check that average recommended power and average rewards increase as progression moves from:
    - zone1 baseline
    - zone2 unlocked roster
    - zone3 unlocked roster with research

## 26. Verification After Batch Capture Extension

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 23 tests
- `npm run build`: passed
- Current deterministic scene-matching artifacts:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
  - `output/web-game/scout-clean-latest/shot-0.png`
  - `output/web-game/scout-clean-latest/state-0.json`
  - `output/web-game/raidprep-clean-latest/shot-0.png`
  - `output/web-game/raidprep-clean-latest/state-0.json`
  - `output/web-game/raid-clean-latest/shot-0.png`
  - `output/web-game/raid-clean-latest/state-0.json`
  - `output/web-game/shop-clean-latest/shot-0.png`
  - `output/web-game/shop-clean-latest/state-0.json`
  - `output/web-game/shop-native-mock-latest/shot-0.png`
  - `output/web-game/shop-native-mock-latest/state-0.json`
- Verified state expectations from the new batch:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
  - `scout-clean-latest/state-0.json` -> `scene = "ScoutScene"`
  - `raidprep-clean-latest/state-0.json` -> `scene = "RaidPrepScene"`
  - `raid-clean-latest/state-0.json` -> `scene = "RaidScene"`
  - `shop-clean-latest/state-0.json` -> `scene = "ShopScene"`
  - `shop-native-mock-latest/state-0.json` -> `scene = "ShopScene"` and `commerce.provider = "native-bridge"`

## 27. Updated Remaining Work

1. Replace the debug/native mock commerce bridge with real Capacitor/mobile bridge implementations and finalize the method names expected by the web shell.
2. Decide whether to add negative-case commerce capture artifacts (`native-no-purchases`, `native-no-rewarded`) for UI regression coverage.
3. Do a deeper zone2/zone3 balance tuning pass beyond the new monotonic regression test.
4. Continue release prep: Android packaging, save validation, and store asset handoff.

## 28. 2026-03-21 Commerce Contract + Negative Capture Update

- Commerce bridge naming is now centralized.
  - Added `src/platform/commerceContract.ts`.
  - The web shell now imports the bridge/plugin names and supported debug modes from that shared contract file.
- Negative commerce-capability capture states are now available for regression coverage.
  - `output/web-game/shop-native-no-purchases-latest`
  - `output/web-game/shop-native-no-rewarded-latest`
- These new negative-case artifacts verify the capability gating added earlier:
  - `shop-native-no-purchases-latest/state-0.json`
    - `scene = "ShopScene"`
    - `commerce.provider = "native-bridge"`
    - `commerce.purchases = false`
  - `shop-native-no-rewarded-latest/state-0.json`
    - `scene = "ShopScene"`
    - `commerce.provider = "native-bridge"`
    - `commerce.rewardedAds = false`

## 29. Verification After Commerce Contract Cleanup

- `npm test`: passed
  - 5 files / 23 tests
- `npm run build`: passed
- The current commerce-related artifact set now covers:
  - normal web mock: `output/web-game/shop-clean-latest`
  - native happy path: `output/web-game/shop-native-mock-latest`
  - native no-purchases: `output/web-game/shop-native-no-purchases-latest`
  - native no-rewarded: `output/web-game/shop-native-no-rewarded-latest`

## 30. Updated Remaining Work

1. Replace the debug/native mock commerce bridge with real Capacitor/mobile plugin implementations and final bridge method names.
2. Decide whether the two negative-case shop captures should be folded into `capture-core-scenes` by default or remain targeted regression artifacts.
3. Do a deeper zone2/zone3 balance tuning pass beyond the new monotonic regression test.
4. Continue release prep: Android packaging, save validation, and store asset handoff.

## 31. 2026-03-21 Mobile Bridge + Restore Flow Update

- Shared app metadata now exists in code instead of being spread across ad-hoc constants.
  - Added `src/app/appMeta.ts`.
  - The render-text payload now includes:
    - `app.packageId`
    - `app.privacyPolicyPath`
- The repository now has a first real Capacitor/mobile packaging baseline.
  - Added `capacitor.config.ts`
  - Added `public/manifest.webmanifest`
  - Added `public/privacy-policy.html`
- The commerce bridge now has an explicit Capacitor adapter layer.
  - Added `src/platform/capacitorCommerceBridge.ts`
  - On startup, the app now installs a wrapper from:
    - `window.Capacitor.Plugins.ScrapFrontierCommerce`
    - into the existing window bridge `ScrapFrontierNativeCommerce`
  - This keeps the scene/game code stable while making the expected native contract concrete.
- Restore-purchases flow is now represented in the game itself.
  - Added `restorePurchasesThroughPlatform()` to the commerce layer.
  - Added `restoreStorePurchases()` to the store domain layer.
  - Added `gameStore.restoreStorePurchases()` to the state layer.
  - `ShopScene` now includes a `Restore` button.
- Native handoff documentation now exists.
  - Added `MOBILE_BRIDGE.md`
  - Documents:
    - plugin name
    - window bridge name
    - expected Capacitor method payloads
    - restore semantics

## 32. Verification After Mobile Bridge Scaffolding

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 24 tests
- `npm run build`: passed
- Fresh `ShopScene` artifacts after the restore/app-meta update:
  - `output/web-game/shop-restore-latest/shot-0.png`
  - `output/web-game/shop-restore-latest/state-0.json`
  - `output/web-game/shop-restore-native-no-purchases/shot-0.png`
  - `output/web-game/shop-restore-native-no-purchases/state-0.json`
- Verified payload expectations from the new shop artifacts:
  - `scene = "ShopScene"`
  - `app.packageId = "com.hhy0111.scrapfrontier"`
  - `app.privacyPolicyPath = "/privacy-policy.html"`
  - native no-purchases capture still reports `commerce.purchases = false`

## 33. Updated Remaining Work

1. Implement the real Capacitor/mobile plugin behind `ScrapFrontierCommerce` using the contract documented in `MOBILE_BRIDGE.md`.
2. Decide whether `restore` and the negative commerce-capability states should be folded into `capture-core-scenes` or remain targeted shop-only regression flows.
3. Do a deeper zone2/zone3 balance tuning pass beyond the current monotonic regression tests.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the new `capacitor.config.ts` baseline.

## 34. 2026-03-21 Capture Loop Hardening Update

- The deterministic browser capture path is now stronger and less timing-sensitive.
  - `scripts/capture-scene.mjs` now supports:
    - `--shop-action`
    - `--raid-debug`
    - `--expect-owned-offers`
    - `--expect-ads-disabled`
  - It now removes stale capture artifacts before each run.
  - It now fails fast when the Playwright client emits `errors-0.json`.
  - On Windows, it now force-closes the spawned browser process tree after artifact collection so capture commands return reliably.
- Restore-owned shop coverage is now part of the default batch capture flow.
  - `scripts/capture-core-scenes.mjs` now includes:
    - `output/web-game/shop-restore-owned-latest`
  - That scenario verifies:
    - `store.purchases.starter_pack = true`
    - `store.purchases.commander_pack = true`
    - `store.purchases.monthly_pass = true`
    - `store.adsDisabled = true`
- `RaidScene` capture is no longer balanced on a narrow timing window.
  - `RaidScene` now supports `?raidDebug=hold`.
  - The default batch capture uses that hold hook so the deterministic raid artifact stays on `RaidScene` instead of sometimes overrunning into `ResultScene`.
  - Updated raid capture timing:
    - `playwright-actions/raid-preview.json`
    - raid scenario pause in `scripts/capture-core-scenes.mjs`

## 35. Verification After Capture Hardening

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 24 tests
- `npm run build`: passed
- Fresh verified artifacts from the hardened flow:
  - `output/web-game/raid-clean-latest/shot-0.png`
  - `output/web-game/raid-clean-latest/state-0.json`
  - `output/web-game/shop-clean-latest/shot-0.png`
  - `output/web-game/shop-clean-latest/state-0.json`
  - `output/web-game/shop-native-mock-latest/shot-0.png`
  - `output/web-game/shop-native-mock-latest/state-0.json`
  - `output/web-game/shop-restore-owned-latest/shot-0.png`
  - `output/web-game/shop-restore-owned-latest/state-0.json`
- Verified state expectations:
  - `raid-clean-latest/state-0.json` -> `scene = "RaidScene"`
  - `shop-clean-latest/state-0.json` -> `scene = "ShopScene"`
  - `shop-native-mock-latest/state-0.json` -> `commerce.provider = "native-bridge"`
  - `shop-restore-owned-latest/state-0.json` -> restored purchases present and `adsDisabled = true`

## 36. Updated Remaining Work

1. Implement the real Capacitor/mobile plugin behind `ScrapFrontierCommerce` using the contract documented in `MOBILE_BRIDGE.md`.
2. Decide whether the negative commerce-capability captures (`native-no-purchases`, `native-no-rewarded`) should also be folded into the default batch, or remain targeted artifacts.
3. Do a deeper zone2/zone3 balance tuning pass beyond the current monotonic regression tests.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the new `capacitor.config.ts` baseline.

## 37. 2026-03-21 Android / Capacitor Scaffold Update

- The repository now includes a real Capacitor Android project.
  - Installed:
    - `@capacitor/core`
    - `@capacitor/cli`
    - `@capacitor/android`
  - Added Android workflow scripts in [package.json](/D:/dev/game304/package.json):
    - `cap:sync:android`
    - `android:assemble:debug`
  - Generated the Android platform under [android](/D:/dev/game304/android).
- A real native commerce plugin now exists on Android.
  - Added [ScrapFrontierCommercePlugin.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/ScrapFrontierCommercePlugin.java)
  - Updated [MainActivity.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/MainActivity.java) to register the plugin before bridge creation.
  - The plugin currently runs in `local-simulator` mode:
    - purchases are implemented as native Capacitor methods
    - rewarded placements are implemented as native Capacitor methods
    - entitlements are persisted in Android `SharedPreferences`
    - capability flags are driven by Android manifest metadata
  - Manifest metadata now lives in [AndroidManifest.xml](/D:/dev/game304/android/app/src/main/AndroidManifest.xml).
- The web/native contract is now shared in code as well as docs.
  - Added [capacitorCommercePlugin.ts](/D:/dev/game304/src/platform/capacitorCommercePlugin.ts)
  - [capacitorCommerceBridge.ts](/D:/dev/game304/src/platform/capacitorCommerceBridge.ts) now supports:
    - `window.Capacitor.Plugins.ScrapFrontierCommerce`
    - registered Capacitor plugin proxies
- Added local Android setup notes in [ANDROID_SETUP.md](/D:/dev/game304/ANDROID_SETUP.md).

## 38. Verification After Android Scaffold

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 24 tests
- `npm run build`: passed
- `npm run cap:sync:android`: passed
- `npm run android:assemble:debug`: reached Gradle and failed only on machine setup:
  - Android SDK location missing
  - Gradle requested:
    - `ANDROID_HOME` or `ANDROID_SDK_ROOT`
    - or `android/local.properties`

## 39. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the new native plugin is compile-verified.
3. Decide whether the negative commerce-capability captures (`native-no-purchases`, `native-no-rewarded`) should also be folded into the default batch, or remain targeted artifacts.
4. Do a deeper zone2/zone3 balance tuning pass beyond the current monotonic regression tests.
5. Continue release prep: Android packaging, save validation, and store asset handoff using the new Capacitor baseline.

## 40. 2026-03-21 Shop Capture + Balance Retune Update

- Negative shop capability captures are now part of the default batch flow.
  - `scripts/capture-scene.mjs` now validates:
    - `commerce.purchases`
    - `commerce.rewardedAds`
  - `scripts/capture-core-scenes.mjs` now includes:
    - `output/web-game/shop-native-no-purchases-latest`
    - `output/web-game/shop-native-no-rewarded-latest`
- The new Capacitor integration caused a web-only false-positive plugin detection, and that is now fixed.
  - The web build was treating the registered Capacitor proxy as if it were a real native implementation.
  - [capacitorCommerceBridge.ts](/D:/dev/game304/src/platform/capacitorCommerceBridge.ts) now only accepts that path when:
    - the runtime is actually native
    - or the plugin object exposes a concrete implementation surface
  - [commerce.test.ts](/D:/dev/game304/tests/commerce.test.ts) now includes a regression case for that browser-path failure.
- Zone2/zone3 encounter tuning has been tightened.
  - [startRaid.ts](/D:/dev/game304/src/domain/raid/startRaid.ts) now uses the template's `hqHp` directly for enemy HQ actors.
  - [generateScoutTargets.ts](/D:/dev/game304/src/domain/ai/generateScoutTargets.ts) now:
    - reduces top-zone overweighting
    - tightens selection around the current squad power
    - lowers recommended-power inflation
    - keeps a softer low/mid/high target ladder
  - [ai.test.ts](/D:/dev/game304/tests/ai.test.ts) now verifies:
    - the lowest unlocked target stays closer to current auto-raid power
    - the highest target still stays meaningfully above it

## 41. Verification After Shop Batch + Balance Retune

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 5 files / 26 tests
- `npm run build`: passed
- Refreshed default shop artifact set:
  - `output/web-game/shop-clean-latest/shot-0.png`
  - `output/web-game/shop-clean-latest/state-0.json`
  - `output/web-game/shop-native-mock-latest/shot-0.png`
  - `output/web-game/shop-native-mock-latest/state-0.json`
  - `output/web-game/shop-native-no-purchases-latest/shot-0.png`
  - `output/web-game/shop-native-no-purchases-latest/state-0.json`
  - `output/web-game/shop-native-no-rewarded-latest/shot-0.png`
  - `output/web-game/shop-native-no-rewarded-latest/state-0.json`
  - `output/web-game/shop-restore-owned-latest/shot-0.png`
  - `output/web-game/shop-restore-owned-latest/state-0.json`
- Verified state expectations:
  - `shop-native-no-purchases-latest/state-0.json` -> `commerce.purchases = false`
  - `shop-native-no-rewarded-latest/state-0.json` -> `commerce.rewardedAds = false`
  - `shop-restore-owned-latest/state-0.json` -> restored purchases present and `adsDisabled = true`
- Visual spot-checks confirmed:
  - `IAP Offline` CTA states render in the no-purchases case
  - rewarded buttons render as `Unavailable` in the no-rewarded case

## 42. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the new native plugin is compile-verified.
3. Do a deeper long-run economy pass beyond the current scout/raid difficulty regressions.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the new Capacitor baseline.

## 43. 2026-03-21 Progression Regression Update

- The repository now has deterministic longer-route progression coverage in [progression.test.ts](/D:/dev/game304/tests/progression.test.ts).
  - The simulation route now mirrors real daily mission progress for:
    - `build_any`
    - `train_unit`
    - `raid_win`
  - The route now verifies two concrete milestones:
    - an early route reaches HQ2 with expanded production and stronger infantry
    - a longer route reaches HQ3, completes a garage, and starts mech growth
- The route logic was tightened so it no longer double-builds `garage` while the first garage is still under construction.

## 44. Early Core Curve Adjustment

- The early HQ3 / first-mech transition has been softened to match the new progression regression.
  - [levelUpHq.ts](/D:/dev/game304/src/domain/base/levelUpHq.ts)
    - HQ3 core cost reduced from `48` to `40`
  - [research.ts](/D:/dev/game304/src/domain/meta/research.ts)
    - garage research base core cost reduced from `22` to `16`
- This keeps the early bottleneck centered on actual raid throughput instead of stalling almost entirely on core accumulation after HQ2.

## 45. Verification After Progression Update

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 28 tests
- `npm run build`: passed
- Refreshed browser sanity artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectations:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
  - `base-clean-latest/state-0.json` -> `app.id = "scrap-frontier"`

## 46. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend the new progression simulation beyond the first-hour route into a longer economy curve that reaches stable zone2 / zone3 play.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 47. 2026-03-21 Late-Zone2 Progression Regression Update

- The deterministic progression coverage now extends beyond the first-hour HQ3 route.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now includes a third milestone:
    - a three-hour route maintains a zone2-ready mech economy
  - The longer route verifies:
    - sustained raid wins
    - garage research online
    - 4+ mech units in the roster
    - at least 2 turrets
    - zone2 scout targets still present at route end
- Progression route parity with the runtime store was improved further.
  - HQ level-ups now refresh scout targets immediately in the simulated route.
  - Research upgrades now refresh scout targets immediately in the simulated route.

## 48. Capture Timing Fix

- [capture-scene.mjs](/D:/dev/game304/scripts/capture-scene.mjs) had an intermittent cold-start race where the state artifact could report `scene = null`.
- Default `pauseMs` was increased from `200` to `400`.
- The refreshed [state-0.json](/D:/dev/game304/output/web-game/base-clean-latest/state-0.json) again reports `scene = "BaseScene"` for the clean base capture.

## 49. Verification After Late-Zone2 Update

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 29 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 50. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend the progression simulation again from the late-zone2 baseline into a route that can deterministically reach HQ4 / zone3.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 51. 2026-03-21 HQ4 / Zone3 Progression Update

- The deterministic progression coverage now includes an HQ4 / zone3 milestone.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now verifies:
    - a three-hour route maintains a late-zone2 mech economy
    - a three-hour route reaches HQ4 and unlocks zone3 scouting
- The simulated long-run route is now more active after HQ3.
  - Late-game raid cadence tightens from every 4 minutes to every 3 minutes.
  - The late-game safe-target threshold is slightly more aggressive to reflect an active progression route instead of a conservative idle route.

## 52. HQ4 Core Curve Adjustment

- [levelUpHq.ts](/D:/dev/game304/src/domain/base/levelUpHq.ts)
  - HQ4 core cost reduced from `90` to `65`
- This brings the HQ4 unlock back into reach for the deterministic three-hour route without changing the earlier HQ2 / HQ3 milestones.

## 53. Verification After HQ4 / Zone3 Update

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 30 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 54. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Add a longer zone3 combat/economy regression so the path is not only unlocked at HQ4, but also stable after the unlock.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 55. 2026-03-22 Zone3 Post-Unlock Stability Update

- The deterministic progression coverage now extends beyond the HQ4 unlock itself.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now includes:
    - a five-hour route that stabilizes a researched zone3 raid economy
- The long-run simulated route now keeps late-game research spending more focused.
  - After HQ4, `garage` research level 2 is prioritized before `barracks` research level 1.
  - This keeps late-game core spending aligned with the mech-heavy raid squad that actually drives zone3 progression.
- The five-hour route uses an explicit per-test timeout because it is intentionally much heavier than the earlier 20 / 60 / 180 minute regressions.

## 56. Verification After Zone3 Stability Update

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 31 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 57. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Turn the new five-hour zone3 stability route into a richer late-game regression with explicit zone3 target quality / fight sustainability checks.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 58. 2026-03-22 Zone3 Target Quality Update

- The late-game regression now checks not only whether zone3 unlocks, but whether a viable zone3 fight can actually appear after the unlock.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now samples multiple late-game scout refreshes after the five-hour route.
  - At least one sampled zone3 target must be winnable in deterministic raid simulation.
- [generateScoutTargets.ts](/D:/dev/game304/src/domain/ai/generateScoutTargets.ts) now guarantees the highest unlocked zone appears in the offered target set by the last slot if it has not appeared earlier.

## 59. Zone3 Entry Tuning

- [enemyTemplates.json](/D:/dev/game304/src/data/balance/enemyTemplates.json)
  - softened `zone3_easy_a` as the intended first zone3 bridge target:
    - fewer turrets
    - lower HQ HP
    - lighter defender composition
- [levelUpHq.ts](/D:/dev/game304/src/domain/base/levelUpHq.ts)
  - HQ4 core cost reduced from `65` to `55`
- Together these changes keep the HQ4 -> zone3 step reachable while also making the first zone3 fight less of a hard wall.

## 60. Verification After Zone3 Quality Update

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 31 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 61. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend the new zone3 sustainability regression into more explicit late-game checks such as survivor counts, loot quality, or repeated zone3 wins in sequence.
4. Continue release prep: Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 62. 2026-03-22 Stronger Zone3 Fight-Quality Regression

- The zone3 late-game regression is now stronger than a single sampled win.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now verifies for the five-hour route:
    - multiple sampled zone3 refreshes
    - at least 2 sampled zone3 victories
    - at least one zone3 victory with 3+ survivors
    - at least one zone3 victory with meaningful loot value
    - the chosen late-game victory returns at least `2 core`
- The heavier progression regressions now use explicit per-test timeouts so they are stable under Vitest's default 5-second limit.

## 63. Zone3 Offer Quality Update

- [generateScoutTargets.ts](/D:/dev/game304/src/domain/ai/generateScoutTargets.ts)
  - the final offered slot now guarantees the highest unlocked zone appears if it has not appeared earlier
- This keeps late-game scout rolls from collapsing back to lower tiers when zone3 has already been unlocked.

## 64. Verification After Stronger Zone3 Regression

- `npx tsc --noEmit`: passed
- `npm test`: passed
  - 6 files / 31 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 65. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend the zone3 regression again into true repeated-win sequences that apply raid losses back into state between fights.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 66. 2026-03-22 Repeated Zone3 Wins Update

- Late-game deterministic coverage now goes beyond "one good zone3 fight" and checks recovery after losses.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts) now includes a sixth progression milestone:
    - after the five-hour route, the simulation continues into repeated zone3 follow-up raids
    - raid losses are applied back into the live roster state between attempts
    - the route is allowed to recover and retrain before taking another safe zone3 target
- The repeated late-game check now verifies:
  - at least 2 zone3 victories across the follow-up window
  - at least one later victory after earlier raid losses have already been applied
  - successful follow-up wins still meet meaningful survivor and loot thresholds
- A zone-tier-specific safe target picker was added to the test harness so the repeated late-game check can explicitly choose recoverable zone3 fights without destabilizing earlier progression tests.

## 67. Verification After Repeated Zone3 Wins Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 6 progression tests
- `npm test`: passed
  - 6 files / 32 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Capture note:
  - the browser capture command hit a shutdown timeout, but the new screenshot and state dump were written successfully before the timeout fired.

## 68. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend late-game regression beyond repeated zone3 wins into counter-attack pressure or longer post-raid economy recovery checks.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 69. 2026-03-22 Counter-Attack Recovery Update

- Late-game deterministic coverage now includes recovery after an actual counter-attack pressure event.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - extracted a reusable `continueProgressionRoute(...)` helper so long-run checks can resume the same build/train/raid loop from arbitrary late-game states
    - added a seventh progression milestone:
      - the five-hour route is pushed near the counter-attack threshold
      - a real zone3 win triggers the counter-attack
      - the state then runs a 45-minute recovery route
      - the recovered state must reopen safe zone3 wins
- The new regression verifies:
  - the counter-attack threshold is actually crossed and resolved
  - HQ4 / zone3 progression survives the pressure event
  - at least one post-pressure zone3 sample is still winnable with meaningful survivors and core loot

## 70. Verification After Counter-Attack Recovery Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 7 progression tests
- `npm test`: passed
  - 6 files / 33 tests
- `npm run build`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Verification note:
  - the first parallel verification batch hit Windows child-process shutdown timeouts, so `npm` validation was rerun sequentially via `cmd /c`.

## 71. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend late-game regression beyond single recovery events into longer post-pressure economy checks or repeated counter-attack cycles.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 72. 2026-03-22 Repeated Counter-Attack Cycle Update

- Late-game deterministic coverage now includes repeated counter-attack cycles, not just a single pressure-and-recovery event.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - added `resolvePendingCounterAttackObserved(...)` so the test harness can count real counter-attack resolutions during a long route
    - added `continueObservedProgressionRoute(...)` so long-run late-game checks can reuse the same build/train/raid loop while observing pressure events
    - added an eighth progression milestone:
      - after the five-hour route, the simulation runs a further two-hour extension under elevated threat pressure
      - the extension must survive repeated counter-attack cycles
      - zone3 must remain viable after those cycles
- The new long-run regression verifies:
  - at least 2 counter-attacks are resolved during the extension window
  - HQ4 / zone3 progression remains intact after the repeated pressure cycles
  - post-cycle zone3 samples still include at least one deterministic victory with meaningful survivors and core loot

## 73. Verification After Repeated Counter-Attack Cycle Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 8 progression tests
- `npm test`: passed
  - 6 files / 34 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`

## 74. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend late-game regression into even longer 8h+ economy pressure checks or explicit counter-attack defeat/recovery cases.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 75. 2026-03-22 Eight-Hour Economy Pressure Update

- Late-game deterministic coverage now extends beyond the seven-hour repeated-pressure route into an eight-hour economy pressure path.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - added a ninth progression milestone:
      - after the five-hour route, the simulation runs a further three-hour extension under elevated threat pressure
      - repeated counter-attack cycles must resolve without collapsing zone3 viability
      - late-game zone3 samples must still produce profitable deterministic wins
    - added progression-route caching for the 180-minute and 300-minute fixtures
      - this avoids recomputing the same heavy deterministic routes across the long-run tests
      - the worker timeout seen during the first eight-hour test pass is no longer reproduced
- The new long-run regression verifies:
  - at least 4 counter-attacks are resolved during the extension window
  - HQ4 / zone3 progression remains intact after the eight-hour pressure path
  - the final late-game state still retains meaningful mech power and core-positive zone3 wins

## 76. Verification After Eight-Hour Economy Pressure Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 9 progression tests
- `npm test`: passed
  - 6 files / 35 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Verification note:
  - the first capture attempt failed because it was launched in parallel before `dist/index.html` existed; rerunning after the build completed resolved it.

## 77. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Add explicit counter-attack defeat/recovery regression coverage now that the 8h+ victory-side pressure path is stable.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 78. 2026-03-22 Explicit Defeat-Recovery Update

- Late-game deterministic coverage now includes an explicit counter-attack defeat path.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - added a tenth progression milestone:
      - start from the five-hour late-game state
      - intentionally weaken the defending roster and remove turrets to force a real counter-attack defeat
      - run a long recovery route afterward
    - the defeat-side regression verifies:
      - the counter-attack actually resolves as a defeat with real scrap/power loss
      - HQ4 / zone3 progression survives the setback
      - the recovered state returns to meaningful `zone3` scouting pressure
      - sampled post-recovery zone3 targets again show partial survivability and reachable recommendation bands
- Important current boundary:
  - the present game logic does not yet guarantee a post-defeat return to deterministic zone3 wins
  - this regression intentionally freezes the current reachable boundary at `zone3 scouting pressure`, not full post-defeat zone3 victory

## 79. Verification After Explicit Defeat-Recovery Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 10 progression tests
- `npm test`: passed
  - 6 files / 36 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`: completed and refreshed the artifact
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Verification note:
  - parallel verification still times out on Windows child-process shutdown, so final verification was rerun sequentially for reliable exit codes.

## 80. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend defeat-side recovery from a single recovered win into repeated post-defeat zone3 win sequences.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 81. 2026-03-22 Defeat-Side Zone3 Win Update

- The defeat-side recovery path now reaches actual deterministic zone3 wins, not only scouting pressure.
  - [enemyTemplates.json](/D:/dev/game304/src/data/balance/enemyTemplates.json)
    - tuned `zone3_easy_a` as the explicit re-entry bridge after late setbacks:
      - turrets reduced `3 -> 2`
      - HQ HP reduced `1220 -> 1100`
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - the tenth progression milestone now verifies a stronger outcome:
      - after an explicit counter-attack defeat and long recovery route, the recovered state can return to actual deterministic zone3 wins
      - those recovered post-defeat wins must still return meaningful `core`
    - the test name was updated to match the stronger outcome

## 82. Verification After Defeat-Side Zone3 Win Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 10 progression tests
- `npm test`: passed
  - 6 files / 36 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`: passed
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Verification note:
  - final verification remained sequential because Windows child-process shutdown still makes parallel `npm` validation unreliable.

## 83. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend defeat-side recovery from a single recovered win into repeated post-defeat zone3 win sequences.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 84. 2026-03-22 Repeated Post-Defeat Zone3 Wins Update

- The defeat-side recovery route now proves repeated zone3 wins, not only a single recovered victory.
  - [progression.test.ts](/D:/dev/game304/tests/progression.test.ts)
    - added an eleventh progression milestone:
      - after the explicit counter-attack defeat and long recovery route, the recovered state must sustain repeated zone3 wins
      - raid losses are applied back into state between those post-defeat wins
    - added caching for the explicit defeat-recovery fixture so the tenth and eleventh scenarios do not recompute the same long recovery route
- The new regression verifies:
  - at least 2 deterministic zone3 victories after the explicit defeat path
  - at least one later victory after earlier post-defeat raid losses
  - recovered post-defeat wins still meet survivor, loot, and core-return thresholds

## 85. Verification After Repeated Post-Defeat Wins Update

- `npx vitest run tests/progression.test.ts --reporter=verbose`: passed
  - 11 progression tests
- `npm test`: passed
  - 6 files / 37 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`
  - the clean rerun hit a shutdown timeout, but refreshed `shot-0.png` and `state-0.json` were written successfully
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - `base-clean-latest/state-0.json` -> `scene = "BaseScene"`
- Verification note:
  - final verification remained sequential because Windows child-process shutdown still makes parallel `npm` validation unreliable.

## 86. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend defeat-side recovery beyond repeated recovered wins into longer post-defeat economy pressure or repeated counter-attack loops after recovery.
4. Continue Android packaging, save validation, and store asset handoff using the Capacitor baseline.

## 87. 2026-03-23 Save Validation Update

- Added direct save-persistence regression coverage for the web runtime.
  - [persistence.ts](/D:/dev/game304/src/state/persistence.ts)
    - exported `STORAGE_KEY` so tests exercise the real save slot key instead of a duplicated literal
  - [persistence.test.ts](/D:/dev/game304/tests/persistence.test.ts)
    - verifies compatible saves hydrate correctly and surface an offline reward summary
    - verifies stale save versions fall back to a fresh state and immediately persist the reset payload
    - verifies restored store purchases are written back to `localStorage`

## 88. Verification After Save Validation Update

- `npx vitest run tests/persistence.test.ts --reporter=verbose`: passed
  - 1 file / 3 tests
- `npm test`: passed
  - 7 files / 41 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene BaseScene --tutorial off --output-dir output/web-game/base-clean-latest`
  - the command hit a Windows child-process shutdown timeout, but refreshed artifacts were written successfully
  - no `errors-0.json` was emitted
- Refreshed deterministic artifact:
  - `output/web-game/base-clean-latest/shot-0.png`
  - `output/web-game/base-clean-latest/state-0.json`
- Verified state expectation:
  - [state-0.json](/D:/dev/game304/output/web-game/base-clean-latest/state-0.json) -> `app.id = "scrap-frontier"`
  - [state-0.json](/D:/dev/game304/output/web-game/base-clean-latest/state-0.json) -> `scene = "BaseScene"`

## 89. Updated Remaining Work

1. Replace the current Android `local-simulator` commerce implementation with real Play Billing / rewarded-ad SDK wiring.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend save validation from web `localStorage` hydration into native Android install/restore scenarios once the real commerce layer exists.
4. Continue Android packaging and store asset handoff using the Capacitor baseline.

## 90. 2026-03-23 Android Commerce Backend Split

- The Android native commerce layer is no longer a single inline simulator implementation.
  - Added backend-ready native helpers:
    - [CommerceConfig.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/CommerceConfig.java)
    - [CommercePreferences.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/CommercePreferences.java)
    - [CommerceBackend.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/CommerceBackend.java)
    - [LocalSimulatorCommerceBackend.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/LocalSimulatorCommerceBackend.java)
    - [UnavailableCommerceBackend.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/UnavailableCommerceBackend.java)
  - [ScrapFrontierCommercePlugin.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/ScrapFrontierCommercePlugin.java)
    - now selects a backend from manifest mode instead of embedding all simulator behavior inline
    - keeps `local-simulator` as the default current path
    - makes any non-`local-simulator` mode fail explicitly instead of silently behaving like the simulator
- This does not yet implement Play Billing or rewarded ads, but it creates the native insertion point for a future real `play-services` backend without changing the JS contract.

## 91. 2026-03-23 Capacitor Bridge Capability Fix

- The web bridge no longer leaks optimistic native capabilities before an async native capability probe resolves.
  - [capacitorCommerceBridge.ts](/D:/dev/game304/src/platform/capacitorCommerceBridge.ts)
    - native proxies with async `getCapabilities()` now start from conservative `false` capability defaults unless explicit capability data is already present
  - [commerce.test.ts](/D:/dev/game304/tests/commerce.test.ts)
    - added a regression so the bridge does not assume purchases/rewarded ads are available just because methods exist on the Capacitor proxy

## 92. Verification After Android Commerce Backend Split

- `npm test`: passed
  - 7 files / 42 tests
- `npm run build`: passed
- `npm run cap:sync:android`: passed
- `npm run capture:scene -- --scene ShopScene --tutorial off --output-dir output/web-game/shop-clean-latest`
  - hit a Windows child-process shutdown timeout, but refreshed artifacts were written successfully
  - no `errors-0.json` was emitted
  - verified state expectations:
    - [state-0.json](/D:/dev/game304/output/web-game/shop-clean-latest/state-0.json) -> `app.id = "scrap-frontier"`
    - [state-0.json](/D:/dev/game304/output/web-game/shop-clean-latest/state-0.json) -> `scene = "ShopScene"`
- `npm run android:assemble:debug`: failed on the same machine-level blocker
  - Android SDK location not found
  - expected local fix:
    - `ANDROID_HOME`
    - `ANDROID_SDK_ROOT`
    - or `android/local.properties` with `sdk.dir=...`

## 93. Updated Remaining Work

1. Implement the real Android `play-services` commerce backend behind the new backend-selection path.
2. Configure Android SDK locally and rerun `npm run android:assemble:debug` so the native plugin is compile-verified on this machine.
3. Extend save validation from web `localStorage` hydration into native Android install/restore scenarios once the real commerce layer exists.
4. Continue Android packaging and store asset handoff using the Capacitor baseline.

## 94. 2026-03-23 Android SDK Preparation Automation

- Added an SDK-path preparation step so Android builds fail earlier and more clearly.
  - [ensure-android-local-properties.mjs](/D:/dev/game304/scripts/ensure-android-local-properties.mjs)
    - reads `ANDROID_SDK_ROOT` / `ANDROID_HOME`
    - writes `android/local.properties` automatically when the SDK path is available
    - emits a direct setup error when the SDK path is still missing
  - [package.json](/D:/dev/game304/package.json)
    - added `android:prepare:sdk`
    - `android:assemble:debug` now runs the SDK preparation step before Gradle
  - [.gitignore](/D:/dev/game304/.gitignore)
    - now ignores `android/local.properties`

## 95. Verification After Android SDK Preparation Automation

- `npm run android:prepare:sdk`
  - failed fast with the expected direct setup message because the SDK path is not configured on this machine
- `npm run android:assemble:debug`
  - now fails immediately through the same preparation check instead of descending into Gradle first

## 96. Updated Remaining Work

1. Set `ANDROID_SDK_ROOT` or `ANDROID_HOME`, or create `android/local.properties`, then rerun `npm run android:assemble:debug`.
2. Implement the real Android `play-services` commerce backend behind the new backend-selection path.
3. Extend save validation from web `localStorage` hydration into native Android install/restore scenarios once the real commerce layer exists.
4. Continue Android packaging and store asset handoff using the Capacitor baseline.

## 97. 2026-03-23 Dedicated Play-Services Backend Path

- The Android commerce layer now has a concrete `play-services` backend class instead of treating all non-simulator modes generically.
  - [PlayServicesCommerceBackend.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/PlayServicesCommerceBackend.java)
    - reads product IDs and rewarded ad unit IDs from manifest metadata
    - reports conservative capability flags
    - returns explicit `NOT CONFIGURED` / `NOT IMPLEMENTED` results instead of silently acting like the simulator
    - exposes missing offer/ad-unit mappings in diagnostics
  - [CommerceConfig.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/CommerceConfig.java)
    - now reads per-offer product IDs and per-placement ad unit IDs from manifest metadata
  - [ScrapFrontierCommercePlugin.java](/D:/dev/game304/android/app/src/main/java/com/hhy0111/scrapfrontier/ScrapFrontierCommercePlugin.java)
    - now selects `PlayServicesCommerceBackend` when `COMMERCE_MODE = "play-services"`
  - [AndroidManifest.xml](/D:/dev/game304/android/app/src/main/AndroidManifest.xml)
    - now declares explicit placeholder metadata keys for:
      - starter pack product id
      - commander pack product id
      - monthly pass product id
      - salvage drop ad unit id
      - scout ping ad unit id
      - offline overdrive ad unit id

## 98. Verification After Dedicated Play-Services Backend Path

- `npm test`: passed
  - 7 files / 42 tests
- `npm run build`: passed
- `npm run cap:sync:android`: passed
- `npm run android:assemble:debug`
  - still blocked before Gradle by the missing Android SDK path on this machine

## 99. Updated Remaining Work

1. Set `ANDROID_SDK_ROOT` or `ANDROID_HOME`, or create `android/local.properties`, then rerun `npm run android:assemble:debug`.
2. Replace the `PlayServicesCommerceBackend` placeholder responses with real Play Billing purchase / restore flows and rewarded-ad SDK callbacks.
3. Extend save validation from web `localStorage` hydration into native Android install/restore scenarios once the real commerce layer exists.
4. Continue Android packaging and store asset handoff using the Capacitor baseline.

## 100. 2026-03-23 Commerce Diagnostics Surfaced In Runtime

- Native commerce diagnostics are now visible in the web runtime instead of living only behind the Android plugin.
  - [commerce.ts](/D:/dev/game304/src/platform/commerce.ts)
    - added cached diagnostics helpers:
      - `getCachedCommerceDiagnostics()`
      - `refreshCommerceDiagnostics()`
  - [ShopScene.ts](/D:/dev/game304/src/scenes/ShopScene.ts)
    - the shop status panel now shows backend/status diagnostics
    - missing offer/ad-unit mappings from the Android `play-services` backend can now surface in the live shop UI
  - [main.ts](/D:/dev/game304/src/main.ts)
    - `window.render_game_to_text` now includes `commerceDiagnostics`
  - [commerce.test.ts](/D:/dev/game304/tests/commerce.test.ts)
    - added a regression for diagnostics fetch + cache behavior

## 101. Verification After Runtime Commerce Diagnostics Update

- `npm test`: passed
  - 7 files / 43 tests
- `npm run build`: passed
- `npm run capture:scene -- --scene ShopScene --tutorial off --output-dir output/web-game/shop-clean-latest`
  - the run was interrupted before clean command completion
  - refreshed artifacts were still written during the run
- Verified state expectation:
  - [state-0.json](/D:/dev/game304/output/web-game/shop-clean-latest/state-0.json) -> `app.id = "scrap-frontier"`
  - [state-0.json](/D:/dev/game304/output/web-game/shop-clean-latest/state-0.json) -> `scene = "ShopScene"`

## 102. Updated Remaining Work

1. Set `ANDROID_SDK_ROOT` or `ANDROID_HOME`, or create `android/local.properties`, then rerun `npm run android:assemble:debug`.
2. Replace the `PlayServicesCommerceBackend` placeholder responses with real Play Billing purchase / restore flows and rewarded-ad SDK callbacks.
3. Extend save validation from web `localStorage` hydration into native Android install/restore scenarios once the real commerce layer exists.
4. Continue Android packaging and store asset handoff using the Capacitor baseline.
