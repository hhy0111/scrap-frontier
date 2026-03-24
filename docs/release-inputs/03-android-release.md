# Android Release Inputs

이 문서는 Android 출시 빌드 생성에 필요한 서명, 버전, 배포 트랙 입력값을 모은다.

## 1. 패키지/버전 정책

- 최종 패키지 ID 유지 여부:
  - Current code default: `com.hhy0111.scrapfrontier`
  - Answer:
- 첫 출시 `versionCode`:
  - Current default: `1`
  - Answer: `1`
- 첫 출시 `versionName`:
  - Current default: `1.0`
  - Answer: `1.0.0`

## 2. 앱 서명

- 업로드 키스토어 파일 경로:
  - Answer:
- 키스토어 alias:
  - Answer:
- 키스토어 비밀번호 전달 방식:
  - Recommended: `gradle.properties or local properties, never committed`
  - Answer:
- 키 alias 비밀번호 전달 방식:
  - Recommended: `gradle.properties or local properties, never committed`
  - Answer:

## 3. 출시 트랙

- 배포 대상:
  - Recommended: `internal -> closed testing -> production`
  - Answer:
- 첫 공개 국가:
  - Answer:
- staged rollout 퍼센트:
  - Recommended: `10% or less`
  - Answer:

## 4. Android SDK / 빌드 환경

- 로컬 Android SDK 경로:
  - Answer: `C:\Users\hhy01\AppData\Local\Android\Sdk`
- CI 빌드 환경 사용 여부:
  - Answer:
- 릴리스 빌드를 로컬에서만 생성할지, CI에서도 생성할지:
  - Answer:

## 5. 출시 차단 조건

- ANR/크래시 허용 기준:
  - Answer:
- 최소 QA 기기 수:
  - Answer:
- 오프라인 저장 데이터 호환성 차단 기준:
  - Answer:

## 6. 완료되면 바로 반영할 항목

- release signing config
- `versionCode` / `versionName`
- Play-services 운영 빌드 활성화
- 내부 테스트용 AAB/APK 생성
