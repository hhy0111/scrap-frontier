# 1. 게임 한 줄 정의

스크랩 프론티어는 폐허 세계에서 자원을 자동 생산해 기지를 확장하고, 3분 내외의 짧은 자동 전투로 AI 기지를 약탈해 코어 데이터를 탈취하는 2D 탑다운 모바일 전략 게임이다.

# 2. 핵심 재미 구조

- 자동 생산으로 접속 보상을 꾸준히 쌓는다.
- 제한된 슬롯 안에서 어떤 건물을 먼저 올릴지 선택해 기지 효율을 만든다.
- 짧은 출격 전에 상대 기지 구조와 보상을 보고 부대 조합을 맞춘다.
- 전투는 자동 진행되지만 `집결`과 `후퇴` 타이밍으로 손맛을 만든다.
- 약탈로 얻는 `코어 데이터`가 강한 성장 재화라서 공격 동기가 분명하다.
- 강해질수록 더 높은 티어의 AI 기지와 반격 웨이브가 열려 리스크와 보상이 같이 커진다.

# 3. 게임 루프 (1분 / 10분 / 1시간)

## 1분 루프

- 접속 후 오프라인 생산분 수령
- 스크랩, 전력 상태 확인
- 건물 업그레이드 1개 시작
- 병영 또는 차고에서 유닛 훈련 예약
- 정찰 슬롯 3개 중 오늘 가장 효율 좋은 적 기지 확인

## 10분 루프

- 1~2회 약탈 출격
- 얻은 코어 데이터로 본부 또는 유닛 연구 업그레이드
- 창고가 가득 차기 전에 자원 재투자
- 반격 웨이브 1회 방어
- 광고 보상으로 오프라인 보상 2배 또는 정찰 즉시 갱신 사용

## 1시간 루프

- 본부 레벨 상승
- 새 건물 슬롯 해금 또는 상위 유닛 해금
- 지역 티어 상승으로 더 높은 보상 테이블 진입
- 일일 목표 3개 완료
- 다음 세션용 생산 구조를 세팅하고 종료

# 4. 시스템 설계

## 자원

자원은 3개로 고정한다. 각 자원은 역할이 명확해야 하고, 계산식은 모두 분리된 데이터로 처리한다.

| 자원 | 획득 방식 | 주요 사용처 | 기본 저장 한도 |
| --- | --- | --- | --- |
| 스크랩 | 스크랩 야드 생산, 약탈 보상 | 대부분의 건물, 보병 훈련 | 1,000 |
| 전력 | 발전기 생산, 약탈 보상 | 상위 건물, 기계 유닛, 터렛 | 600 |
| 코어 데이터 | 약탈 승리, 일일 목표 | 본부 레벨업, 연구 해금 | 200 |

추가 규칙:

- 오프라인 생산은 최대 4시간까지만 누적한다.
- 저장 한도 초과분은 버린다. 창고 업그레이드로만 상한을 올린다.
- 프리미엄 재화는 두지 않는다. 광고와 소액결제로 기존 자원을 판매한다.

## 건물

건물은 7개로 제한한다. 배치는 자유 배치가 아니라 `고정 슬롯 배치`다. 본부를 제외하고 각 기지는 12개의 슬롯만 가진다. 이 방식은 AI가 코드 수정하기 쉽고, 적 기지 생성도 단순하다.

| 건물 | 개수 제한 | 역할 | L1 기준 수치 | 기본 비용 |
| --- | --- | --- | --- | --- |
| 본부(Command Center) | 1 | 전체 해금, 출격 슬롯, 반격 난이도 기준 | HP 900, 출격 슬롯 4 | 시작 건물 |
| 스크랩 야드 | 6 | 스크랩 생산 | 분당 24 스크랩, HP 220 | 스크랩 120 |
| 발전기 | 6 | 전력 생산 | 분당 16 전력, HP 220 | 스크랩 100 |
| 병영 | 2 | 보병 훈련, 보병 연구 | 훈련 큐 2칸, HP 340 | 스크랩 160 / 전력 40 |
| 차고 | 2 | 차량·드론 훈련, 기계 연구 | 훈련 큐 2칸, HP 380 | 스크랩 240 / 전력 120 |
| 창고 | 3 | 자원 상한 증가, 오프라인 보관 효율 증가 | 각 자원 상한 +500, HP 300 | 스크랩 180 / 전력 60 |
| 자동 터렛 | 6 | 기지 방어 | HP 320, 공격력 20, 사거리 180 | 스크랩 140 / 전력 80 |

건물 업그레이드 공통 규칙:

- 비용: `ceil(baseCost * 1.45^(level-1))`
- HP: `baseHp * (1 + 0.30 * (level-1))`
- 생산량: `baseProduction * (1 + 0.35 * (level-1))`
- 업그레이드 시간: `baseTimeSec * (1 + 0.25 * (level-1))`
- 본부 레벨은 MVP에서 5까지로 제한한다.

## 유닛

유닛은 5개로 제한한다. 전투의 가독성과 디버깅을 위해 한 번의 출격은 최대 6기까지만 배치한다.

| 유닛 | 훈련 건물 | 역할 | L1 기준 수치 | 기본 비용 |
| --- | --- | --- | --- | --- |
| 스캐빈저 | 병영 | 빠른 약탈, 근거리 돌입 | HP 90 / 공격 14 / 방어 2 / 사거리 70 / 공속 0.9초 / 이동 95 / 적재 20 | 스크랩 50 |
| 라이플맨 | 병영 | 표준 원거리 딜러 | HP 120 / 공격 18 / 방어 3 / 사거리 130 / 공속 1.1초 / 이동 75 / 적재 15 | 스크랩 70 / 전력 10 |
| 실드봇 | 차고 | 전방 탱커 | HP 260 / 공격 10 / 방어 8 / 사거리 80 / 공속 1.2초 / 이동 55 / 적재 10 | 스크랩 90 / 전력 30 |
| 로켓 버기 | 차고 | 건물 파괴 특화 | HP 180 / 공격 22 / 방어 4 / 사거리 160 / 공속 1.6초 / 이동 100 / 적재 12 / 건물 추가 피해 1.7배 | 스크랩 120 / 전력 60 |
| 리페어 드론 | 차고 | 자동 회복 지원 | HP 100 / 회복 18 / 방어 2 / 사거리 140 / 주기 1.2초 / 이동 85 | 스크랩 80 / 전력 50 |

훈련 공통 규칙:

- 훈련 시간은 `12초 ~ 24초` 구간으로 고정한다.
- 출격 조합은 `탱커 1~2 + 딜러 2~3 + 약탈 또는 지원 1~2`가 기본 답이 되게 맞춘다.
- 리페어 드론은 적재량이 0이므로 순수 안정성 선택지다.

## AI 적 생성

AI 적은 실시간 학습형 AI가 아니라 `템플릿 + 스케일링` 방식으로 만든다.

- 각 지역은 `쉬움`, `보통`, `위험`, `엘리트` 4단계 난이도를 가진 템플릿 풀을 가진다.
- 플레이어가 정찰을 누르면 후보 기지 3개를 생성한다.
- 후보 생성식은 `targetPower = playerRaidPower * random(0.85, 1.15) + zoneTier * 40`로 잡는다.
- 템플릿은 `건물 슬롯 배치`, `주둔 유닛 조합`, `보상 재고`만 가진다.
- 세부 수치는 스케일 함수로만 키운다.

스케일 공식:

- 적 건물 HP 배율: `1 + zoneTier * 0.12`
- 적 유닛 공격 배율: `1 + zoneTier * 0.08`
- 적 유닛 HP 배율: `1 + zoneTier * 0.10`
- 보상 배율: `1 + zoneTier * 0.18 + difficultyRankBonus`

반격 웨이브 규칙:

- 플레이어가 2회 연속 승리하거나 코어 데이터 40 이상을 하루 동안 획득하면 반격 게이지가 오른다.
- 게이지 100 도달 시 1회 반격 웨이브 발생
- 반격은 최대 5기만 생성
- 반격 보상은 없고, 방어 실패 시 생산 시설 1개가 10분 정지한다

## 전투 시스템

전투는 `자동 전투 + 2개의 반자동 개입` 구조로 정의한다.

자동 요소:

- 유닛 이동
- 목표 탐색
- 기본 공격
- 터렛 사격
- 드론 자동 회복
- 전투 종료 판정
- 약탈 적재 계산

반자동 요소:

- `집결`: 20초 쿨다운, 5초간 아군 공격 속도 25% 증가, 이동 속도 15% 증가
- `후퇴`: 즉시 이탈 명령, 2초 채널링 후 생존 유닛만 철수, 최종 약탈량 50%만 획득
- 출격 전 `진입 라인` 선택: 좌, 중, 우 세 곳 중 하나를 고른다

맵 구조 단순화:

- 탑다운 맵은 자유 지형이 아니라 `웨이포인트 노드 그래프`다.
- 각 출격 라인은 `진입 노드 -> 외곽 방어 노드 -> 생산 라인 노드 -> 본부 노드` 순서로 연결된다.
- 유닛은 가장 가까운 활성 목표 노드로만 이동한다.
- A* 경로 탐색은 사용하지 않는다.

피해 공식:

- `finalDamage = max(1, atk * typeBonus * buffMultiplier - targetDef * 0.6)`
- `dps = finalDamage / attackInterval`
- `healAmount = healPower * skillMultiplier`
- `lootCap = sum(survivorCarry)`
- `finalLoot = min(enemyStoredResource, lootCap) * raidResultMultiplier`

타입 보정:

- 기본 유닛 -> 유닛: 1.0
- 기본 유닛 -> 건물: 0.9
- 로켓 버기 -> 건물: 1.7
- 터렛 -> 차량: 1.1
- 터렛 -> 보병: 1.0

승패 조건:

- 플레이어 승리: 적 본부 파괴 또는 적 유닛/방어 건물 전멸 후 약탈 완료
- 플레이어 패배: 출격 유닛 전멸, 120초 타임아웃, 또는 후퇴

## 성장 시스템

성장은 세 줄만 둔다.

1. 본부 성장
- 본부 레벨이 건물 최대 레벨, 출격 최대 슬롯, 지역 해금을 담당한다.

2. 건물 성장
- 생산량, 체력, 저장량만 오른다.
- 특수 옵션 랜덤 부여는 넣지 않는다.

3. 유닛 연구
- 병영 연구: 스캐빈저, 라이플맨 공격력/체력 +8%씩, 최대 5레벨
- 차고 연구: 실드봇, 로켓 버기, 리페어 드론 공격력 또는 회복량/체력 +8%씩, 최대 5레벨

성장 규칙:

- 본부 레벨업은 `스크랩 + 전력 + 코어 데이터`를 모두 요구한다.
- 연구는 `스크랩 + 코어 데이터`만 사용한다.
- 건물 업그레이드는 주로 `스크랩 + 전력`을 사용한다.
- RNG 장비, 영웅, 장비 등 복잡한 메타는 제외한다.

# 5. 전투 수치 (초기 밸런스)

## 시작 상태

- 시작 자원: 스크랩 400 / 전력 180 / 코어 데이터 20
- 시작 건물: 본부 1, 스크랩 야드 1, 발전기 1, 병영 1
- 시작 유닛: 스캐빈저 2, 라이플맨 2
- 출격 최대 슬롯: 4

## 건물 초기 수치

| 건물 | HP | 생산 또는 전투 성능 | 건설 시간 |
| --- | --- | --- | --- |
| 본부 L1 | 900 | 출격 슬롯 4 | 시작 상태 |
| 스크랩 야드 L1 | 220 | 분당 24 스크랩 | 20초 |
| 발전기 L1 | 220 | 분당 16 전력 | 20초 |
| 병영 L1 | 340 | 큐 2칸 | 30초 |
| 차고 L1 | 380 | 큐 2칸 | 45초 |
| 창고 L1 | 300 | 각 자원 상한 +500 | 25초 |
| 자동 터렛 L1 | 320 | 공격 20 / 공속 1.0초 / 사거리 180 | 20초 |

## 유닛 초기 수치

| 유닛 | HP | 공격 또는 회복 | 방어 | 사거리 | 공속/주기 | 이동 | 적재 | 훈련 시간 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 스캐빈저 | 90 | 14 | 2 | 70 | 0.9초 | 95 | 20 | 12초 |
| 라이플맨 | 120 | 18 | 3 | 130 | 1.1초 | 75 | 15 | 15초 |
| 실드봇 | 260 | 10 | 8 | 80 | 1.2초 | 55 | 10 | 20초 |
| 로켓 버기 | 180 | 22 | 4 | 160 | 1.6초 | 100 | 12 | 24초 |
| 리페어 드론 | 100 | 회복 18 | 2 | 140 | 1.2초 | 85 | 0 | 22초 |

## 본부 레벨업 비용

| 본부 레벨 | 필요 자원 | 해금 |
| --- | --- | --- |
| 2 | 스크랩 300 / 전력 120 / 코어 30 | 창고, 터렛, 출격 슬롯 5 |
| 3 | 스크랩 520 / 전력 220 / 코어 55 | 차고, 로켓 버기, 지역 2 |
| 4 | 스크랩 860 / 전력 360 / 코어 90 | 출격 슬롯 6, 실드봇 연구 2단계 |
| 5 | 스크랩 1,300 / 전력 540 / 코어 140 | 지역 3, 엘리트 적 등장 |

## 지역 1 적 기지 기준값

| 난이도 | 적 터렛 수 | 적 유닛 수 | 적 본부 HP | 보상 재고 |
| --- | --- | --- | --- | --- |
| 쉬움 | 1 | 3 | 700 | 스크랩 120 / 전력 40 / 코어 12 |
| 보통 | 2 | 4 | 820 | 스크랩 170 / 전력 65 / 코어 18 |
| 위험 | 2 | 5 | 920 | 스크랩 230 / 전력 90 / 코어 25 |
| 엘리트 | 3 | 6 | 1,050 | 스크랩 320 / 전력 120 / 코어 36 |

## 전투 시간과 경제 리듬

- 전투 제한 시간: 120초
- 약탈 후 결과 화면 체류 목표: 8초 이내
- 광고 없는 기본 세션 루프: 6~9분
- 오프라인 생산 상한: 4시간
- 생산 정체가 느껴지는 구간은 본부 3 직전 1회만 허용한다

# 6. UI 구조 (모바일 기준)

UI는 `한 손 조작 우선`, `하단 중심 조작`, `정보는 상단 고정` 원칙으로 만든다.

## 메인 베이스 화면

- 상단 바: 스크랩, 전력, 코어 데이터, 설정 버튼
- 중앙: 탑다운 기지 맵, 12개 슬롯, 건물 상태 아이콘
- 좌측 세로 버튼: 임무, 반격 경고, 광고 보상
- 우측 세로 버튼: 상점, 패스, 알림
- 하단 탭 바 4개: `기지`, `훈련`, `정찰`, `상점`
- 하단 확장 패널:
  - 기지 탭: 건설/업그레이드 버튼
  - 훈련 탭: 병영/차고 큐 확인
  - 정찰 탭: 적 기지 카드 3장
  - 상점 탭: 광고, 패키지, 무과금 보상

## 적 기지 정찰 화면

- 적 카드 3장 표시
- 각 카드 정보: 난이도, 예상 보상, 적 유닛 수, 적 터렛 수, 추천 전투력
- 카드 하단: `공격`, `새로고침`, `광고로 즉시 새로고침`
- 스와이프보다 탭 위주로 구성한다. 모바일 조작 실수를 줄이기 위해 카드 확대 모달을 둔다.

## 출격 준비 화면

- 상단: 적 기지 미리보기 맵
- 중앙: 6칸 분대 슬롯
- 하단 좌측: 보유 유닛 리스트
- 하단 중앙: 진입 라인 선택 버튼 `좌 / 중 / 우`
- 하단 우측: 예상 승률, 예상 약탈량, `출격`

## 전투 화면

- 상단 좌측: 남은 시간, 적 본부 HP 바
- 상단 우측: 생존 유닛 수, 누적 약탈량, 속도 `x1 / x2`
- 중앙: 탑다운 전장
- 하단 좌측: `집결`
- 하단 우측: `후퇴`
- 하단 중앙: 현재 목표 노드 또는 포커스 대상 표시
- 자동 카메라만 사용하고 핀치 줌은 넣지 않는다

## 결과 화면

- 승리/패배 헤더
- 획득 자원, 잃은 유닛, 남은 유닛, 반격 게이지 증가량
- 버튼 3개만 유지: `다시 정찰`, `기지로`, `광고로 보상 2배`

## 상점 화면

- 탭 3개: `추천`, `일반 상품`, `광고 보상`
- 구매 카드에는 숫자와 효익만 크게 표시
- 설명 텍스트는 2줄 제한

# 7. 수익화 설계

## 광고

리워드 광고 위치:

- 접속 직후 오프라인 보상 2배
- 정찰 리스트 즉시 새로고침
- 건설/업그레이드 잔여 시간 5분 이하 즉시 완료
- 전투 패배 후 손실 완화 보상: 잃은 유닛 1기 즉시 복구
- 일일 임무 1개 즉시 완료

전면 광고 타이밍:

- 첫 세션 10분 동안은 노출 금지
- 이후 `전투 결과 화면 종료 시`에만 노출 후보가 된다
- 조건: 최근 전면 광고 이후 8분 이상 경과, 그리고 최근 전투 3회 중 2회 이상 완료
- 하루 최대 6회

광고 원칙:

- 전투 중 광고 금지
- 패배 직후 강제 광고 금지
- 정찰 새로고침은 광고 없이도 10분마다 1회 무료 제공

## 결제

상품 종류와 가격대는 단순한 5종으로 제한한다.

| 상품 | 내용 | 가격 |
| --- | --- | --- |
| 스타터 팩 | 스크랩 1,500 / 전력 700 / 코어 120 / 로켓 버기 1기 | 3,900원 |
| 광고 제거 | 전면 광고 제거, 일일 무료 정찰 3회 추가 | 7,500원 |
| 전투 보급 팩 | 스크랩 4,000 / 전력 2,000 / 코어 300 | 12,000원 |
| 월간 보급 패스 | 30일 동안 매일 스크랩 400 / 전력 180 / 코어 25, 오프라인 상한 +2시간 | 9,900원 |
| 지휘관 팩 | 광고 제거 포함, 전 자원 대량 지급, 전용 기지 스킨 1개 | 25,000원 |

결제 설계 원칙:

- 승패를 뒤집는 강제 과금이 아니라 시간을 줄이는 상품 위주
- 프리미엄 가챠, 랜덤 박스, 다중 통화는 금지
- 첫 결제 유도는 `스타터 팩` 1개만 사용

# 8. MVP 범위 (강제 제한)

포함:

- 지역 3개
- 건물 7개
- 유닛 5개
- 적 기지 템플릿 12개
- 반격 웨이브 1종
- 일일 임무 3종
- 광고와 인앱결제
- 로컬 세이브
- 안드로이드 우선 출시

제외:

- PvP
- 길드, 채팅, 친구
- 영웅, 장비, 스킬 트리
- 랜덤 장비 드랍
- 장식 건물
- 자유 배치형 맵 편집
- 날씨, 속성 상성, 복잡한 버프 디버프
- 서버 권한형 백엔드
- 라이브 이벤트 캘린더

강제 제한 이유:

- 1인 개발 기준으로 8주 내 MVP 출시가 가능해야 한다.
- AI가 수정하기 쉬운 코드 규모를 유지해야 한다.
- 밸런스 폭발을 막아야 한다.

# 9. 개발 로드맵

## 1주차

- Phaser + TypeScript + Vite + Capacitor 부트스트랩
- 기본 해상도, 씬 전환, 저장 구조
- JSON 밸런스 파일 스키마 고정

## 2주차

- 기지 화면 구현
- 자원 생산, 오프라인 보상, 건설/업그레이드
- 슬롯 배치 UI 완성

## 3주차

- 병영, 차고, 훈련 큐
- 유닛 데이터 로딩
- 정찰 카드 생성과 난이도 산정

## 4주차

- 레이드 맵, 웨이포인트 노드 이동
- 자동 공격, 터렛, 승패 판정
- 결과 화면과 약탈 보상 계산

## 5주차

- 본부 성장, 연구, 지역 해금
- 반격 웨이브
- 일일 임무

## 6주차

- 광고, 결제 SDK 연동
- 사운드, 진동, 간단한 이펙트
- 개발용 디버그 패널

## 7주차

- 1차 밸런스 조정
- 튜토리얼 5단계
- 최소 아트 리소스 교체

## 8주차

- 안드로이드 내부 테스트
- 크래시 수정, 세이브 마이그레이션 확인
- 스토어 메타데이터, 스크린샷, 출시 빌드 생성

# 10. 기술 설계 (핵심)

전체 원칙:

- ECS 금지
- 복잡한 상태머신 금지
- `데이터 정의 -> 순수 함수 계산 -> Phaser 렌더링` 순서로 분리
- 화면은 `base`, `scout`, `raidPrep`, `raid`, `result`, `shop` 6개만 둔다
- 게임 로직은 Phaser 객체에 직접 박지 않고 별도 함수로 분리한다

## 추천 스택 선택

선택:

- `Phaser 3.90.x + TypeScript + Vite + Capacitor`

선택 이유:

- 이 게임은 탑다운 2D 실시간 전투가 핵심이라 Canvas/WebGL 기반 2D 프레임워크가 가장 자연스럽다.
- Phaser는 브라우저에서 바로 실행되므로 빌드, 핫 리로드, 디버깅 속도가 빠르다.
- 전투 로직을 순수 TypeScript 함수로 분리하기 쉽다.
- 모바일 패키징은 Capacitor로 감싸면 충분하다.
- React Native는 일반 앱 UI에는 좋지만, 지속적인 전투 루프와 충돌/렌더링을 다루기엔 관리 포인트가 늘어난다.
- Flutter는 성능은 충분하지만 게임 특화 코드를 짤수록 위젯 레이어와 렌더링 레이어를 함께 관리해야 해 1인 개발 생산성이 떨어질 가능성이 있다.

권장 부가 라이브러리:

- 저장: `@capacitor/preferences`
- 광고: Capacitor 기반 AdMob 플러그인
- 결제: RevenueCat 또는 플랫폼 기본 결제 래퍼
- 테스트: `Vitest`

## 프로젝트 구조

```text
/src
  /app
    boot.ts
    config.ts
    resize.ts
  /data
    /balance
      buildings.json
      units.json
      resources.json
      upgrades.json
      enemyTemplates.json
      maps.json
    loadBalance.ts
    validateBalance.ts
  /domain
    /base
      tickProduction.ts
      buildStructure.ts
      upgradeStructure.ts
      applyOfflineReward.ts
    /training
      queueUnit.ts
      finishTraining.ts
    /raid
      startRaid.ts
      stepRaid.ts
      selectTarget.ts
      resolveAttack.ts
      resolveHealing.ts
      computeLoot.ts
      finishRaid.ts
    /ai
      generateScoutTargets.ts
      generateCounterWave.ts
      scoreEnemyPower.ts
    /meta
      levelUpHQ.ts
      upgradeResearch.ts
  /scenes
    BootScene.ts
    BaseScene.ts
    ScoutScene.ts
    RaidPrepScene.ts
    RaidScene.ts
    ResultScene.ts
    ShopScene.ts
  /state
    gameState.ts
    actions.ts
    selectors.ts
    persistence.ts
  /ui
    hud.ts
    modal.ts
    buttons.ts
    panels.ts
  /utils
    clamp.ts
    rng.ts
    time.ts
    logger.ts
    ids.ts
  /types
    balance.ts
    game.ts
    raid.ts
/tests
  production.test.ts
  combat.test.ts
  loot.test.ts
  ai.test.ts
  save.test.ts
/public
  /assets
    /sprites
    /fx
    /ui
capacitor.config.ts
vite.config.ts
agent.md
```

구조 원칙:

- `domain`은 Phaser를 모른다. 순수 함수만 둔다.
- `scenes`는 입력과 렌더링만 담당한다.
- `data/balance`는 숫자 조정 전용 폴더다.
- 유닛과 건물 스펙 변경 시 TypeScript 로직 수정 없이 JSON만 바꾸는 것이 기본 흐름이다.

## 상태 관리 방식

선택:

- `단순 전역 상태 + 액션 함수 + 구독 방식`

선택 이유:

- Redux는 이 프로젝트 규모에 비해 과하다.
- Zustand도 충분히 좋지만, Phaser 단독 구조에서는 직접 만든 얇은 스토어가 더 읽기 쉽다.
- AI가 수정할 때 한 파일에서 상태 구조를 다 파악할 수 있어야 한다.

권장 형태:

```ts
export type GameState = {
  scene: 'base' | 'scout' | 'raidPrep' | 'raid' | 'result' | 'shop';
  now: number;
  resources: { scrap: number; power: number; core: number };
  base: {
    hqLevel: number;
    slots: StructureInstance[];
    trainingQueues: QueueState[];
    scoutRefreshAt: number;
    counterThreat: number;
  };
  roster: UnitRosterEntry[];
  raid: RaidState | null;
  meta: {
    zoneTier: number;
    researches: Record<string, number>;
    dayIndex: number;
  };
};
```

운영 규칙:

- 상태 변경은 반드시 `actions.ts`를 통해서만 일어난다.
- 씬은 직접 숫자를 수정하지 않는다.
- 저장 직전에는 `serializeGameState()`를 거친다.

## 데이터 구조

원칙:

- 모든 밸런스 수치는 JSON으로 분리
- JSON은 평평한 구조로 유지
- 상속, 믹스인, 스크립터블 오브젝트 같은 복잡한 정의 금지

건물 정의 예시:

```json
{
  "id": "scrap_yard",
  "name": "Scrap Yard",
  "maxCount": 6,
  "buildTimeSec": 20,
  "cost": { "scrap": 120, "power": 0, "core": 0 },
  "stats": {
    "hp": 220,
    "productionPerMin": { "scrap": 24 }
  },
  "upgradeMultipliers": {
    "cost": 1.45,
    "hp": 1.3,
    "production": 1.35
  }
}
```

유닛 정의 예시:

```json
{
  "id": "rocket_buggy",
  "role": "siege",
  "trainBuilding": "garage",
  "cost": { "scrap": 120, "power": 60, "core": 0 },
  "trainSec": 24,
  "stats": {
    "hp": 180,
    "atk": 22,
    "def": 4,
    "range": 160,
    "attackInterval": 1.6,
    "moveSpeed": 100,
    "carry": 12,
    "typeBonus": { "building": 1.7, "unit": 1.0 }
  }
}
```

적 기지 템플릿 예시:

```json
{
  "id": "zone1_normal_a",
  "zoneTier": 1,
  "difficulty": "normal",
  "entryLane": "mid",
  "structures": [
    { "slotId": "hq", "buildingId": "command_center", "level": 1 },
    { "slotId": "t1", "buildingId": "auto_turret", "level": 1 },
    { "slotId": "s1", "buildingId": "scrap_yard", "level": 1 }
  ],
  "garrison": ["rifleman", "rifleman", "scavenger", "scavenger"],
  "storedRewards": { "scrap": 170, "power": 65, "core": 18 }
}
```

## 전투 로직 구조

전투 로직은 한 프레임에 한 번 `stepRaid(state, dt)`만 호출한다.

핵심 함수 분해:

```ts
startRaid(input): RaidState
stepRaid(state, dt): RaidState
selectTarget(actor, enemies, map): TargetId | null
moveActor(actor, targetNode, dt): ActorState
resolveAttack(attacker, defender): DamageResult
resolveHealing(healer, allies): HealResult
removeDestroyedActors(state): RaidState
computeLoot(state): LootResult
finishRaid(state): RaidResult
```

실행 순서:

1. 입력 처리
- 집결, 후퇴, 배속 입력 반영

2. 목표 선택
- 살아 있는 적 중 우선순위와 거리 기준으로 결정

3. 이동 처리
- 웨이포인트 노드로 선형 이동

4. 공격/회복 처리
- 쿨다운이 끝난 액터만 계산

5. 사망/파괴 정리
- HP 0 이하 액터 제거

6. 종료 판정
- 본부 파괴, 전멸, 시간 종료, 후퇴 여부 확인

전투 로직 주의점:

- 애니메이션과 수치 계산을 분리한다.
- 충돌 판정은 원형 반경 단일 판정으로 끝낸다.
- 상태 이상은 MVP에서 넣지 않는다.

## AI 디버깅 친화 설계

로그 구조:

```ts
type DebugLog = {
  timeMs: number;
  scene: string;
  event: string;
  actorId?: string;
  targetId?: string;
  value?: number;
  extra?: Record<string, string | number | boolean>;
};
```

로그 규칙:

- `build.start`
- `build.complete`
- `train.queue`
- `train.complete`
- `raid.start`
- `combat.hit`
- `combat.kill`
- `combat.heal`
- `raid.retreat`
- `raid.end`

운영 방식:

- 개발 빌드에서는 최근 300개 로그를 메모리에 유지
- 우측 상단 버전 텍스트를 5번 탭하면 디버그 패널 오픈
- 패널에서 `현재 상태`, `최근 로그`, `적 생성 시드`, `전투 재생성` 버튼 제공

테스트 방식:

- `Vitest`로 순수 함수 단위 테스트 작성
- 생산/비용/약탈/AI 생성은 모두 snapshot이 아니라 수치 assertion 테스트
- 전투는 `seeded replay` 테스트를 둬서 같은 입력이면 같은 결과가 나오게 한다
- 저장 파일은 버전 업 시 `migrateSave()` 테스트 추가

핫 리로드 활용:

- Vite HMR로 JSON 밸런스 변경 즉시 반영
- 개발 모드에서 `R` 키로 현재 씬 리로드
- JSON 변경 시 현재 저장 데이터는 유지하고 숫자만 재적용

권장 디버그 명령:

- `+500 scrap`
- `unlock zone`
- `spawn raid win`
- `force counterattack`
- `reset save`

# 11. 아트 리소스 정의

아트는 `정교한 프레임 애니메이션`보다 `읽기 쉬운 실루엣`에 집중한다. AI 생성과 후반 수정이 쉬워야 하므로 수작업 보정량이 적은 방향으로 간다.

스타일 방향:

- 황무지 디젤펑크
- 러스트 오렌지, 스틸 그레이, 터쿼이즈 포인트 컬러
- 모바일에서 구분 쉬운 굵은 외곽
- 2D 탑다운, 단순 명암, 과한 텍스처 금지

필수 리소스 목록:

- 건물 스프라이트 7종
- 건물 업그레이드 오버레이 7종
- 파괴 상태 데칼 7종
- 유닛 스프라이트 5종
- 그림자 5종
- 발사체 3종
- 이펙트 8종
- 지형 타일 16종
- 장식 오브젝트 12종
- UI 아이콘 24종
- 버튼 8종
- 결과/상점 배경 5종

제작 방식:

- 유닛은 8방향 스프라이트를 만들지 않는다.
- 상체 회전이 필요 없는 탑다운 기계 유닛 위주로 구성한다.
- 건물은 정면 애니메이션 대신 `정상`, `피격`, `파괴` 3상태만 둔다.

# 12. 이미지 생성 규칙

- 모든 스프라이트는 `탑다운 70~80도 시점`으로 통일한다.
- 기본 캔버스는 1024x1024로 생성하고, 실제 게임에서는 축소 사용한다.
- 오브젝트는 화면 중앙에 한 개만 둔다.
- 배경은 투명 또는 단색 중립 배경만 허용한다.
- 텍스트, 숫자, 워터마크, 로고 금지
- 외곽선은 굵고 실루엣이 한눈에 보여야 한다.
- 조명 방향은 좌상단 고정
- 색상은 `녹슨 주황`, `금속 회색`, `청록 포인트`, `모래색` 4축으로 유지
- 지나친 미세 디테일, 사실적인 사람 얼굴, 복잡한 배경 금지
- UI 아이콘은 동일한 두께의 라인과 동일한 채도 범위를 유지한다.
- 한 번 승인된 스타일은 이후 프롬프트에서 반드시 재사용한다.
- 공통 네거티브 키워드:
  `side view, isometric, photorealistic, cinematic perspective, text, watermark, crowd, realistic human face, tiny details, noisy background`

# 13. 이미지 생성 프롬프트 (25개 이상)

1. 본부 스프라이트: `2D top-down mobile game building sprite, scrapyard command center with armored roof, dieselpunk antennas, rusty orange and steel gray palette, clean thick outline, readable silhouette, subtle teal light accents, centered object, transparent background, no text, no watermark`
2. 스크랩 야드 스프라이트: `2D top-down mobile game building sprite, compact scrap processing yard with conveyor belts, metal crusher, stacked junk piles, rusty orange and sand beige palette, bold silhouette, centered, transparent background, no text`
3. 발전기 스프라이트: `2D top-down mobile game building sprite, wasteland power generator with twin turbines, battery tanks, teal energy glow, steel gray casing, clean hard-surface shape, centered, transparent background`
4. 병영 스프라이트: `2D top-down mobile game building sprite, desert barracks made from welded containers, training yard markings, reinforced gate, rusty orange and gray, thick outline, centered, transparent background`
5. 차고 스프라이트: `2D top-down mobile game building sprite, armored vehicle garage with repair crane, fuel drums, heavy doors, dieselpunk style, steel gray with orange hazard paint, centered, transparent background`
6. 창고 스프라이트: `2D top-down mobile game building sprite, modular storage warehouse with stacked crates and sealed resource tanks, top-down, mobile readable silhouette, rusty industrial style, transparent background`
7. 자동 터렛 스프라이트: `2D top-down mobile game defense turret, rotating autocannon base, compact armored platform, teal sensor light, steel gray and orange details, clean silhouette, transparent background`
8. 본부 파괴 상태: `2D top-down destroyed command center sprite, broken armored roof, smoke vents, exposed core chamber, scorched metal, readable game asset, transparent background`
9. 황무지 바닥 타일: `2D top-down terrain tile for mobile strategy game, cracked desert ground with metal scraps and tire marks, seamless tile, muted sand and rust colors, clean stylized texture`
10. 금속 바닥 타일: `2D top-down terrain tile, worn industrial metal floor panels with bolts, scratches, orange hazard paint, seamless, stylized mobile game asset`
11. 벽 조각 세트: `2D top-down wall segment set, wasteland concrete and scrap metal barriers, modular corners and straight pieces, thick outline, stylized, transparent background`
12. 잔해 오브젝트: `2D top-down prop sprite, abandoned fuel barrels and broken machine parts, scrapyard debris cluster, readable silhouette, transparent background`
13. 스캐빈저 유닛: `2D top-down mobile unit sprite, fast scavenger raider with scrap armor, compact shotgun, backpack for loot, rugged dieselpunk style, orange and gray palette, transparent background`
14. 라이플맨 유닛: `2D top-down mobile unit sprite, wasteland rifleman with simple armor plates, long rifle, blue teal visor accent, readable silhouette, transparent background`
15. 실드봇 유닛: `2D top-down mobile unit sprite, heavy shield robot with wide armored body, front energy plate, slow tank silhouette, steel gray with teal glow, transparent background`
16. 로켓 버기 유닛: `2D top-down mobile unit sprite, fast rocket buggy vehicle with exposed launcher tubes, large rear wheels, rusty orange chassis, strong silhouette, transparent background`
17. 리페어 드론 유닛: `2D top-down mobile unit sprite, hovering repair drone with two tool arms and teal repair light, compact mechanical shape, transparent background`
18. 기본 총알 이펙트: `2D top-down VFX sprite sheet style, small muzzle flash and bullet impact sparks for mobile strategy game, orange yellow burst, clean stylized shapes, transparent background`
19. 로켓 폭발 이펙트: `2D top-down VFX sprite, medium explosion with smoke ring and orange blast core, stylized mobile game effect, transparent background`
20. 회복 펄스 이펙트: `2D top-down VFX sprite, circular teal repair pulse with soft energy rings, clean sci-fi support effect, transparent background`
21. 약탈 빔 이펙트: `2D top-down VFX sprite, narrow teal-orange data extraction beam connecting crate and unit, readable mobile effect, transparent background`
22. 스크랩 아이콘: `flat mobile game UI icon, scrap metal stack symbol, rust orange and gray, thick outline, clean vector-like style, transparent background`
23. 전력 아이콘: `flat mobile game UI icon, battery cell with teal lightning core, bold shape, clean outline, transparent background`
24. 코어 데이터 아이콘: `flat mobile game UI icon, glowing data cube with teal center and orange shell, readable small-size icon, transparent background`
25. 업그레이드 버튼 아이콘: `flat mobile game UI icon, upward metal arrow with teal glow, bold silhouette, transparent background`
26. 건설 버튼 아이콘: `flat mobile game UI icon, wrench and plate symbol, rusty orange and steel gray, thick outline, transparent background`
27. 정찰 카드 배경: `mobile strategy game UI card background, enemy base scan panel with rugged metal frame, subtle teal scanner lines, clean readable layout, no text`
28. 전투 결과 승리 배너: `mobile game victory banner background, wasteland metal plate with orange glow and teal data lines, dramatic but clean, no text`
29. 전투 결과 패배 배너: `mobile game defeat banner background, damaged metal plate, dim red-orange warning lights, gritty but readable, no text`
30. 상점 추천 패키지 카드: `mobile game shop pack card background, premium supply crate frame, orange industrial highlight, teal accent lights, clean composition, no text`
31. 일일 임무 배지: `mobile game UI badge, compact mission emblem with target mark and wrench, rust orange and teal, thick outline, transparent background`
32. 로딩 일러스트: `stylized 2D key art for mobile game, top-down scrapyard outpost under attack by small raider squad, dramatic dust trails, dieselpunk wasteland palette, no text`
33. 앱 아이콘: `mobile game app icon, armored command center core with teal glow and rust orange frame, bold readable shape, minimal background, polished stylized look`
34. 광고 보상 버튼 배경: `mobile game rewarded ad button background, metallic frame with play triangle and teal energy core, clean readable UI asset, no text`
35. 반격 경고 아이콘: `mobile game alert icon, red-orange siren mounted on scrap metal shield, bold outline, transparent background`

# 14. 리스크 및 대응

| 리스크 | 설명 | 대응 |
| --- | --- | --- |
| 전투 경로가 복잡해짐 | 자유 이동을 넣으면 버그가 급증한다 | 웨이포인트 노드와 3개 진입 라인으로 고정 |
| 밸런스 테이블이 빠르게 부풀어 오름 | 건물, 유닛, 적 수가 늘수록 조정 비용 증가 | 건물 7개, 유닛 5개, 지역 3개로 고정 |
| AI 생성 아트의 일관성 부족 | 자산마다 시점과 색이 달라질 수 있다 | 공통 스타일 규칙과 고정 프롬프트 세트 사용 |
| 광고 피로로 이탈 | 전면 광고 과다 노출 시 리텐션 저하 | 첫 10분 금지, 8분 쿨다운, 하루 6회 제한 |
| 세이브 데이터 깨짐 | 구조 변경 시 유저 진입 불가 가능성 | 세이브 버전 필드와 마이그레이션 함수 유지 |
| 1인 개발 일정 초과 | 콘텐츠 욕심이 붙으면 일정이 무너진다 | MVP 제외 항목을 문서에 고정하고 추가 금지 |
| 수익화 약함 | 프리미엄 통화가 없으면 ARPPU가 낮을 수 있다 | 광고 제거, 월간 패스, 스타터 팩 효율을 높여 보완 |

# 15. 출시 전략

1. 안드로이드 우선 출시
- 내부 테스트와 오픈 테스트가 빠르고 빌드 검증 비용이 낮다.

2. 소프트 런치 순서
- 한국 안드로이드 내부 테스트 1주
- 한국 오픈 테스트 2주
- 수치 수정 후 글로벌 안드로이드 출시
- iOS는 수익성과 잔존율이 기준치를 넘을 때만 추가

3. 출시 전 KPI 목표
- 튜토리얼 완료율 70% 이상
- D1 잔존율 35% 이상
- 세션당 평균 전투 수 4회 이상
- 리워드 광고 참여율 25% 이상
- 첫 결제 전환율 1.5% 이상

4. 라이브 운영 방식
- 첫 4주는 콘텐츠 추가보다 밸런스와 광고 빈도 조정에 집중
- 패치 단위는 주 1회
- 신규 콘텐츠는 `지역 1개 + 유닛 1개` 단위로만 확장한다

5. 확장 순서
- 1차: 지역 4, 신규 적 템플릿
- 2차: 신규 유닛 1개
- 3차: 스킨형 수익 상품
- 4차: 클라우드 세이브

최종 결론:

- 이 프로젝트는 `Phaser + TypeScript + Vite + Capacitor`가 가장 맞다.
- 기지 슬롯형 구조, JSON 밸런스 분리, 순수 함수 전투 처리만 지키면 AI가 코드 생성과 디버깅을 가장 쉽게 수행할 수 있다.
- MVP는 반드시 작게 시작하고, 라이브에서 수치와 콘텐츠를 얹는 방식으로 운영해야 한다.
