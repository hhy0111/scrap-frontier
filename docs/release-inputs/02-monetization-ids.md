# Monetization And ID Inputs

이 문서는 결제 상품, 광고, 실서비스 ID처럼 코드에 주입해야 하는 값만 정리한다.

## 1. Google Play Billing 상품

현재 코드 상품 키:

- `starter_pack`
- `commander_pack`
- `monthly_pass`

각 항목에 대해 아래를 채운다.

### `starter_pack`

- Play Console product ID:
  - Answer:
- 상품 타입:
  - Recommended: `inapp`
  - Answer:
- 가격:
  - Answer:
- 설명:
  - Answer:

### `commander_pack`

- Play Console product ID:
  - Answer:
- 상품 타입:
  - Recommended: `inapp`
  - Answer:
- 가격:
  - Answer:
- 설명:
  - Answer:

### `monthly_pass`

- Play Console product ID:
  - Answer:
- 상품 타입:
  - Recommended: `subs`
  - Answer:
- 결제 주기:
  - Recommended: `monthly`
  - Answer:
- 무료 체험 여부:
  - Answer:
- 가격:
  - Answer:

## 2. Rewarded Ads

현재 코드 광고 배치 키:

- `salvage_drop`
- `scout_ping`
- `offline_overdrive`
- `base_lobby` 배너 광고는 아래 별도 섹션에서 관리

### AdMob 앱

- AdMob app ID:
  - Answer: `ca-app-pub-4402708884038037~5254024460`
- 테스트 기기 ID 목록:
  - Answer:

### Rewarded placement IDs

#### `salvage_drop`

- Rewarded ad unit ID:
  - Answer: `ca-app-pub-4402708884038037/3518404414`

#### `scout_ping`

- Rewarded ad unit ID:
  - Answer: `ca-app-pub-4402708884038037/5157821542`

#### `offline_overdrive`

- Rewarded ad unit ID:
  - Answer: `ca-app-pub-4402708884038037/1726543698`

## 3. Banner Ads

현재 코드 배너 광고 배치 키:

- `base_lobby`

### `base_lobby`

- Banner ad unit ID:
  - Answer: `ca-app-pub-4402708884038037/1071370327`
- 노출 위치:
  - Current code target: `BaseScene` lobby screen bottom
  - Answer: `BaseScene` lobby screen bottom

## 4. 운영 정책

- `commander_pack` 구매 시 광고 완전 제거 유지 여부:
  - Current code behavior: `예`
  - Answer:
- `monthly_pass` 복원 시 일일 보급만 복구하고 누락 보상은 재지급하지 않는 정책 유지 여부:
  - Current code behavior: `예`
  - Answer:
- 미성년자/특정 국가에서 광고 비활성화 필요 여부:
  - Answer:

## 5. 콘솔/계정 접근

- Play Console 접근 가능 계정:
  - Answer:
- AdMob 접근 가능 계정:
  - Answer:
- 테스트 구매 계정 이메일:
  - Answer:

## 6. 코드 반영 위치

이 문서가 채워지면 아래 위치에 값이 들어간다.

- Android manifest / build config
- Play Billing product mapping
- Rewarded ad unit mapping
- Banner ad unit mapping
- 테스트/운영 모드 분기
