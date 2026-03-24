# Release Status

기준일: 2026-03-24

## 현재 상태

- 게임 로직과 웹 플레이 흐름은 출시 직전 수준까지 구현 완료
- Android 결제/광고 브리지는 Play Billing, 리워드 광고, 로비 배너 광고까지 코드 경로 구현 완료
- 남은 실제 블로커는 외부 입력값, 실기기 검증, 릴리스 서명과 패키징

## 코드로 완료된 범위

- 세로형 메타 루프와 주요 씬 흐름
- 저장, 진행, 상점, 진단 UI
- web mock / Capacitor / native bridge 경로
- Android `local-simulator` backend
- Android `play-services` backend
  - Play Billing 상품 조회와 구매 런치
  - 구매 완료 콜백 처리와 acknowledge
  - rewarded ad load/show/reward
  - `base_lobby` banner show/hide
  - purchase restore query
- release 설정 표면
  - [release.properties.example](/D:/dev/game304/android/release.properties.example)
  - [keystore.properties.example](/D:/dev/game304/android/keystore.properties.example)
  - release/debug manifest placeholder 분리
  - `android:assemble:release`
  - `android:bundle:release`

## 사용자 입력 문서

- [docs/release-inputs/README.md](/D:/dev/game304/docs/release-inputs/README.md)
- [docs/release-inputs/01-brand-legal.md](/D:/dev/game304/docs/release-inputs/01-brand-legal.md)
- [docs/release-inputs/02-monetization-ids.md](/D:/dev/game304/docs/release-inputs/02-monetization-ids.md)
- [docs/release-inputs/03-android-release.md](/D:/dev/game304/docs/release-inputs/03-android-release.md)
- [docs/release-inputs/04-store-listing.md](/D:/dev/game304/docs/release-inputs/04-store-listing.md)
- [docs/release-inputs/05-launch-ops.md](/D:/dev/game304/docs/release-inputs/05-launch-ops.md)

## 출시 전 실제 블로커

1. Play Console 상품 ID 미입력
2. AdMob App ID 미입력
3. rewarded ad unit ID 3개 미입력
4. `base_lobby` banner ad unit ID 미입력
5. release signing keystore 값과 실제 keystore 파일 미입력
6. 실기기에서 `assembleRelease` / `bundleRelease` / 구매 / 광고 / 복원 검증 미실행
7. 현재 샌드박스는 Android/Maven 네트워크 접근이 막혀 있어 최종 Gradle 검증 불가

## 검증 상태

- `npx tsc --noEmit`: 이 세션에서 통과
- `npx vitest run tests/commerce.test.ts --reporter=verbose`: Windows `spawn EPERM` 제한으로 실패
- `npm run build`: 아직 미재검증, 현재 환경은 Node `20.16.0`와 Windows 프로세스 제약 가능성 존재
- Android SDK 경로: [android/local.properties](/D:/dev/game304/android/local.properties) 설정 완료
- Android Gradle 검증: SDK/wrapper 단계는 넘겼지만 Maven 의존성 해석에서 네트워크 제한으로 중단

## 다음 순서

1. `docs/release-inputs` 입력 문서 작성
2. `android/release.properties` 실제 값 반영
3. `android/keystore.properties` 실제 값 반영
4. `npm run release:sync`
5. `npm run release:validate`
6. 네트워크 가능한 환경에서 `npm run android:bundle:release`
7. 실기기에서 구매 / 리워드 / 배너 / 복원 검증

## 자동화 명령

```bash
npm run release:init
npm run release:sync
npm run release:validate
```
