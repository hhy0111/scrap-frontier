# Release Inputs Index

이 폴더는 출시 전까지 사용자가 직접 답해야 하는 항목만 분리한 문서 모음이다.

코드로 끝낼 수 있는 작업은 별도로 진행한다. 이 문서는 외부 계정, 법적 정보, 스토어 문구, 결제/광고 ID, 서명 키처럼 개발자가 추측하면 안 되는 값만 모아 둔다.

## 문서 목록

1. [01-brand-legal.md](/D:/dev/game304/docs/release-inputs/01-brand-legal.md)
   - 앱 이름, 운영 주체, 지원 연락처, 개인정보처리방침, 광고/데이터 공개
2. [02-monetization-ids.md](/D:/dev/game304/docs/release-inputs/02-monetization-ids.md)
   - Play Billing 상품 ID, 가격 정책, AdMob 앱 ID, 리워드 광고 유닛 ID, 배너 광고 유닛 ID
3. [03-android-release.md](/D:/dev/game304/docs/release-inputs/03-android-release.md)
   - 앱 서명, 버전 정책, 릴리스 트랙, 최종 패키지/빌드 결정
4. [04-store-listing.md](/D:/dev/game304/docs/release-inputs/04-store-listing.md)
   - Play 스토어 노출 문구, 카테고리, 국가, 스크린샷/그래픽
5. [05-launch-ops.md](/D:/dev/game304/docs/release-inputs/05-launch-ops.md)
   - 출시 운영, QA 범위, 분석/크래시 수집, 롤아웃 정책

## 작성 순서

1. `01-brand-legal.md`
2. `02-monetization-ids.md`
3. `03-android-release.md`
4. `04-store-listing.md`
5. `05-launch-ops.md`

## 현재 코드 기준으로 이미 정해진 값

- 앱 제목: `Scrap Frontier`
- 패키지 ID: `com.hhy0111.scrapfrontier`
- 웹 개인정보처리방침 경로: `/privacy-policy.html`
- Android 기본 결제 모드: `local-simulator`
- Play Services 실제 결제/광고 ID: 아직 미입력

## 이 문서를 다 채우면 바로 이어지는 작업

- Android `release` 빌드 설정에 실값 주입
- Play Billing / Rewarded Ads 실서버 연결 검증
- 스토어 등록 자산 반영
- 출시 빌드 생성 및 최종 QA

## 보조 명령

```bash
npm run release:init
npm run release:sync
npm run release:validate
```

- `release:init`
  - `android/release.properties`
  - `android/keystore.properties`
  파일이 없으면 예제 파일에서 복사해 만든다.
- `release:sync`
  - `01-brand-legal.md`의 답변에서
    - 앱 이름
    - 지원 이메일
  을 읽어 아래 파일로 반영한다.
    - `src/app/appMeta.ts`
    - `android/app/src/main/res/values/strings.xml`
    - `public/privacy-policy.html`
- `release:validate`
  - 문서 답변 누락
  - release 설정 누락
  - keystore 누락
  - 임시 지원 이메일 잔존 여부
  를 한 번에 검사한다.
