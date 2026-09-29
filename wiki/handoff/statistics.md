# 통계 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 현황 파악: 위키 작성과 문제 목록

- **상태**: 보류 — 실장님이 7절 문제 중 무엇부터 고칠지 정하시기를 기다림
- **커밋**: session/statistics (이 항목과 같은 커밋, 위키만)
- **한 일**: `Stats.jsx`·`stats.routes.js` 와 통계가 읽는 테이블(visit·billing·billing_item·prescription), 수납 금액 규칙(`006`·`016`·`017`, `billing.routes.js`, `Payment.jsx`)을 읽고 `modules/statistics.md` 를 코드 기준으로 채움. 각 숫자의 계산식과, 수납 규칙별로 통계에 어떻게 잡히는지를 표로 정리. 격리 스택 9186 에 시험 데이터를 넣어 손 계산과 비교.
- **바꾼 파일**: `wiki/modules/statistics.md`, `wiki/handoff/statistics.md` (코드 변경 없음)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 격리 스택 9186(새 DB)에 API 로 환자 2명·접수 4건(1건 취소)·영수 3건(미수 1, 이월 포함 수납 1, 서류 포함 1)을 넣고 `/api/stats/*` 응답을 손 계산과 비교. 수납액·청구액·건수는 맞음. 미수 이중 집계, 발생일 하루 앞당김, 서류 중복 표시, 취소 접수 포함, 의사별 합계 누락을 재현. 백엔드 연결의 DB 시간대 출처가 `postgresql.conf` 임을 확인.
- **확인 못 한 것**: 화면(브라우저)으로는 아직 안 봄 — API 응답과 코드로만 확인. 실행 중인 EMR 의 DB 시간대(규칙상 안 건드림). 접수 취소 시 처방이 같이 취소되는지.
- **위키**: `modules/statistics.md` 1~8절 전부 새로 씀
- **총괄 확인 요청**:
  - **DB 시간대(문제 7)** — 실행 중인 EMR 의 DB 가 1.1.0 이전에 만들어졌다면 백엔드 연결 시간대가 아직 UTC 일 수 있습니다. 읽기만 하는 확인 명령:
    `docker exec bethesda-emr-db grep -E "^(log_)?timezone" /var/lib/postgresql/data/postgresql.conf`
    `UTC`/`Etc/UTC` 면 모든 모듈의 `CURRENT_DATE`(내원일·영수일)가 병원 자정이 아니라 UTC 자정(현지 03시)에 넘어갑니다. 고치는 방법(`ALTER DATABASE medconnect SET timezone = 'Indian/Antananarivo'` 마이그레이션, 또는 백엔드 풀 연결 시 `SET TIME ZONE`)은 공용 영역이라 총괄 판단이 필요합니다.
  - CHANGELOG 1.4.0 의 「진료과별·의사별 매출은 합계가 같다」는 사실과 다릅니다(문제 5). 담당의 없는 방문의 매출은 의사별에서 빠집니다.
- **다른 세션에 부탁** (지금 당장은 아니고, 실장님 결정 후):
  - **수납** — 수납 금액이 「금고 기준」이 되려면(문제 8) 나중 수납(`POST /billing/:id/pay`)과 정정 환불이 **언제 얼마가 들어오고 나갔는지** 남는 곳이 필요합니다(예: 수납 이벤트 테이블). 지금은 `amount_paid` 만 덮어써서 수납한 날짜가 없습니다. 실장님이 금고 기준을 원하시면 요청 예정.
- **남은 일 · 알려진 문제**: `modules/statistics.md` 7절 15건. 제안 순서는 1 → 2·3·4·5·6·11 → 7(총괄) → 8(실장님 결정 + 수납 세션).
