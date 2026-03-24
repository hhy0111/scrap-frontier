# Launch Operations Inputs

이 문서는 출시 운영과 사후 대응에 필요한 사용자 결정 항목을 정리한다.

## 1. QA 범위

- 필수 테스트 기기 목록:
  - Answer:
- 최소 Android OS 범위:
  - Current build minSdk: `23`
  - Answer:
- 네트워크 없음 상태를 공식 지원할지:
  - Current game design: 상당수 로직은 로컬 가능, 광고/결제는 예외
  - Answer:

## 2. 운영 도구

- 크래시 수집 도구 사용 여부:
  - Recommended: `예`
  - Answer:
- 분석 도구 사용 여부:
  - Recommended: `예`
  - Answer:
- 고객 문의 접수 채널:
  - Answer:

## 3. 롤아웃 운영

- 소프트 런치 여부:
  - Answer:
- 내부 테스트 종료 조건:
  - Answer:
- 정식 출시 Go/No-Go 기준:
  - Answer:

## 4. 라이브 운영 정책

- 광고 비활성화/보상 보정 수동 대응 정책:
  - Answer:
- 결제 복원 문의 처리 정책:
  - Answer:
- 저장 데이터 초기화 요청 처리 정책:
  - Answer:

## 5. 출시 후 7일 운영 계획

- 핫픽스 허용 기준:
  - Answer:
- 첫 밸런스 패치 예정 여부:
  - Answer:
- 모니터링할 핵심 지표:
  - Answer:

## 6. 이 문서가 필요한 이유

여기 답이 없으면 코드가 완성돼도 실제 출시는 막힌다.

- QA 승인 기준 불명확
- 장애 대응 채널 없음
- 결제/광고 CS 프로세스 없음
- 출시 결정 기준 없음
