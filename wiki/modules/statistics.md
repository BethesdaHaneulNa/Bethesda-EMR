# 통계 (Statistics)

> **담당**: 통계 세션 · 브랜치 `session/statistics` · **마지막 갱신**: 2026-09-29 · **상태**: 문제 1·2·3·4·5·6·10·11·13·15 고침 · 남은 것은 7절 참고

## 1. 이 모듈이 하는 일

병원 관리자가 **기간을 정해** 병원이 얼마나 돌았는지 한 화면에서 봅니다.

- **운영 현황** — 그 기간의 내원 수(초진·재진·완료·진행 중·취소), 진료과별·의사별 내원 수
- **매출 · 정산** — 수납액·청구액·건수·평균, 진료과별·의사별 매출, 항목별 매출(진료비·약·검사/처치·서류)
- **미수 · 환불** — 지금 이 순간 병원이 받을 돈·돌려줄 돈의 합계와, 환자별 명단(이름·연락처·금액·발생일)
- **약품 사용통계** — 처방된 약을 일·월·연 단위로 약품별 수량 피벗표로 보고 CSV로 내려받기
- **월별 추이** — 최근 6개월 내원 수와 수납액 막대그래프

통계는 **다른 모듈의 데이터를 읽기만** 합니다. 자기 테이블이 없고, 어떤 데이터도 바꾸지 않습니다.
권한 `stats`가 있는 계정만 화면과 API를 쓸 수 있습니다(`stats.routes.js:12`). 미수 명단에 환자 이름과 전화번호가 나오므로 권한은 관리자급에게만 주는 것을 전제로 합니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름 그대로, 순서대로 씁니다. (괄호 안은 프랑스어 화면의 이름)

**기간 고르기**

1. 왼쪽 메뉴에서 **통계 (Statistiques)** 를 누릅니다. 처음에는 **이번 달 (Ce mois)** 1일부터 오늘까지가 보입니다.
2. 맨 위의 **오늘 (Aujourd'hui)** · **이번 주 (Cette semaine)** · **이번 달 (Ce mois)** 중 하나를 누르거나, 옆의 날짜 칸 두 개에 시작일과 끝일을 직접 넣습니다. 이번 주는 월요일부터입니다.
3. 날짜를 바꾸면 바로 다시 계산됩니다. 계산 중에는 날짜 옆에 `···` 가 보입니다.

**운영 현황 (Activité)**

- **총 내원** 아래 작은 글씨의 **고유 환자** 는 같은 사람이 여러 번 온 것을 한 번으로 센 수입니다.
- **취소된 접수는 총 내원·초진·재진·고유 환자·과별·의사별·월별 추이에 들어가지 않습니다.** 몇 건이 취소됐는지는 **취소 (Annulé)** 칸에만 나옵니다.
- 접수 때 진료과나 담당 의사를 고르지 않은 내원은 **미지정 (Non attribué)** 줄로 따로 나옵니다.

**매출 · 정산 (Recettes)**

- **수납액 (Encaissé)** — 그 기간에 발행된 영수증에서 병원이 실제로 받은 돈(받은 돈 − 거스름돈)의 합입니다. 아래 작은 글씨의 **청구액** 은 할인 전 금액입니다.
- **미수 (Impayé)** · **환불 예정 (Remboursement dû)** 칸은 **기간과 관계없이 지금 현재** 금액입니다. 칸을 누르면 아래에 환자별 명단이 펼쳐지고, 한 번 더 누르면 닫힙니다.
- 미수·환불 금액은 **수납 화면에서 그 환자를 열었을 때 보이는 미수·환불과 같은 금액**입니다. 한 환자에게 받을 돈과 돌려줄 돈이 둘 다 있으면 두 명단에 모두 나옵니다.
- **진료과별 매출** 은 접수 때 고른 과, **의사별 매출** 은 담당 의사 기준입니다. 그래서 두 그래프의 줄 나눔은 다를 수 있지만, **각 그래프의 줄을 모두 더하면 수납액과 같습니다.** 과나 담당 의사가 없는 방문의 매출은 **미지정** 줄에 있습니다.
- **항목별 매출** 의 진료비·약·검사/처치료·서류를 모두 더하면 **청구액** 과 같습니다.

**약품 사용통계 (Usage médicaments)**

1. **일별 · 월별 · 연별** 중 하나를 누릅니다. 일별은 최근 30일, 월별은 최근 12개월, 연별은 최근 5년이 나옵니다. (맨 위의 기간 선택과는 따로 움직입니다.)
2. **전체 · 원내 · 원외** 로 병원 약국에서 내준 약만, 또는 밖에서 사도록 처방한 약만 볼 수 있습니다.
3. **처방전체 · 조제완료** 로 처방만 된 것까지 셀지, 약국에서 조제를 마친 것만 셀지 고릅니다.
4. **⬇ CSV** 를 누르면 표를 엑셀에서 열 수 있는 파일로 내려받습니다.

**월별 추이** — 맨 아래에 최근 6개월 내원 수와 수납액이 막대로 나옵니다. 위의 기간 선택과는 관계없습니다.

## 3. 기능 상세

### 3.1 화면 구조 (`frontend/src/pages/Stats.jsx`)

- 기간 상태 `range {from,to}` 가 바뀌면 `load()` 가 `/summary` 만 부릅니다(`Stats.jsx:64`). 기간과 무관한 `/monthly` 는 화면을 열 때 한 번(`Stats.jsx:35`), `/outstanding` 은 미수·환불 칸을 눌러 명단을 **열 때마다** 부릅니다(`toggleList`, `Stats.jsx:74`) — 명단이 방금 본 카드 금액과 같은 시점의 자료가 되도록. 명단을 처음 불러오는 동안은 「불러오는 중」이 보입니다.
- 약품 표는 `drugGran/drugType/drugStat` 이 바뀔 때만 `/drug-usage` 를 부르고, **`from/to` 를 보내지 않습니다**(`Stats.jsx:34`). 그래서 위쪽 기간 선택이 약품 표에 적용되지 않고 서버 기본 기간을 씁니다.
- 기간 버튼의 날짜는 **브라우저의 시계**로 계산합니다(`rangeFor`, `Stats.jsx:8`). 병원 PC 시계가 병원 시간대이면 맞습니다.
- 막대그래프 `Bars`/`VBars` 는 가장 큰 값을 100%로 놓고 비율로 그립니다. 금액은 `fmtAr` 로 천 단위 쉼표, 반올림한 Ariary 정수입니다.

### 3.2 `GET /api/stats/summary?from&to` — 숫자별 계산식

기간 미지정 시 DB의 `CURRENT_DATE` 기준 이번 달 1일 ~ 오늘(`stats.routes.js:40`). 응답의 날짜는 모두 `ymd()`(`stats.routes.js:27`)로 `'YYYY-MM-DD'` 문자열로 만들어 보냅니다 — DATE 를 그대로 보내면 node-pg 가 현지 자정 Date 로 바꾸고 JSON 이 UTC 로 써서 하루 앞당겨 보이기 때문입니다. 날짜 형식은 `utils/validate.js` 의 `badDateRange` 가 검사합니다. 모든 기간 조건은 `BETWEEN from AND to`, 양 끝 날짜 포함입니다.

| 화면의 숫자 | 계산 (`stats.routes.js` 줄) | 비고 |
|---|---|---|
| 총 내원 | `visit` 중 `visit_date` 가 기간 안이고 `status <> 'cancelled'` 인 행 수 (50) | 취소된 접수는 내원이 아니므로 뺌(2026-09-29 실장님 결정) |
| 고유 환자 | 같은 조건의 `COUNT(DISTINCT patient_id)` | 취소 제외 |
| 초진 / 재진 | 같은 조건에서 `visit_type` = `newVisit` / `followUp` | 취소 제외. `emergency·referral·none` 은 `other_visits` 로 오지만 화면에 안 나옴 |
| 완료 / 진행 중 / 취소 | `status` = `completed` / (`registered·waiting·in_progress`) / `cancelled` | 취소 칸만 취소를 셈 |
| 진료과별 (내원) | `visit LEFT JOIN department`, 취소 제외, `d.id` 로 묶음 (64) | 과 없는 접수는 `code=null` 한 줄 → 화면이 「미지정」으로 표시 |
| 의사별 (내원) | `visit LEFT JOIN staff ON doctor_id`, 취소 제외, `s.id` 로 묶음 (73) | 담당의 없는 접수는 `name=null` 한 줄 → 「미지정」. 동명이인은 따로 |
| 수납액 | `billing` 중 `billing_date` 기간 안, `payment_status <> 'cancelled'` 인 행의 `SUM(net_paid)` (93) | `net_paid = amount_paid − change_amount` (마이그레이션 017). 이월 수납·나중 수납 규칙은 3.4 |
| 청구액 | 같은 행의 `SUM(consult_fee + drug_total + procedure_total)` | **할인 전**, 이월 잔액 제외 |
| 수납 건수 | 같은 행 수 | 미수(`unpaid`) 영수도 1건으로 셈 |
| 평균 단가 | 수납액 ÷ 수납 건수 (160) | 미수 영수가 분모에 들어가 평균이 낮아짐 |
| 진료과별 매출 | 위 billing 행을 `visit.department_id` 로 묶은 `SUM(net_paid)` (82) | 접수 때 고른 과 기준. 이월로 받은 옛 미수도 **새 방문의 과**로 들어감 |
| 의사별 매출 | 위 billing 행을 `visit.doctor_id LEFT JOIN staff` 로, `s.id` 로 묶음 (97) | 담당의 없는 방문의 영수는 「미지정」 줄. 줄 합계 = 수납액 |
| 항목별: 진료비·약 | `SUM(consult_fee)`, `SUM(drug_total)` (109) | 할인 전 |
| 항목별: 서류 | `billing_item.item_type='fee'` 의 `SUM(total_price)` (129) | 수납 화면에서 더한 발급비(DOC·CDR·CERT 등)와, 의사가 오더한 `code_type='fee'` 항목 |
| 항목별: 검사/처치료 | `SUM(procedure_total)` − 서류 (158) | 수납 화면은 진료비·약이 아닌 것을 모두 `procedure_total` 에 넣으므로(`Payment.jsx:185`) 서류를 빼야 두 번 세지 않음. 네 막대 합 = 청구액 |
| 취소 영수 | `payment_status='cancelled'` 이고 `COALESCE(cancelled_at::date, billing_date)` 가 기간 안 (121) | **취소한 날** 기준. `cancelled_at::date` 는 DB 세션 시간대로 날짜가 잘림 |
| 미수 (카드) | 취소 아닌 **모든** billing 의 `SUM(GREATEST(outstanding,0))` (`OWED_SQL`) | 기간 무관. 수납 화면 환자 잔액과 같은 식. 이월된 옛 영수는 `outstanding=0` 이라 안 셈 |
| 환불 예정 (카드) | 같은 행의 `SUM(GREATEST(net_paid − total_due,0))` (`REFUND_SQL`) | 기간 무관. 수납 화면과 같은 식 |

취소 영수 건수는 `voidedCount` 하나뿐입니다(예전의 항상 0 이던 `revenue.cancelled_count` 는 지움).

날짜 문자열: 총괄이 `backend/src/config/database.js` 에서 DATE 컬럼을 앱 전체에서 문자열로 받게 바꿨으므로(`7ad4387`) `ymd()` 가 없어도 이제 안전합니다. `ymd()` 는 이 파일만 읽어도 날짜 형태가 보이도록 그대로 둡니다.

### 3.3 `GET /api/stats/outstanding` — 미수·환불 명단

- 영수별로 미수 `GREATEST(outstanding,0)` 와 환불 `GREATEST(net_paid − total_due,0)` 을 구해 **환자별로 따로 더합니다**(상계하지 않음). 미수 합이 0.5 Ar 넘으면 미수 명단, 환불 합이 0.5 Ar 넘으면 환불 명단 — 둘 다면 두 명단에 모두 나옵니다.
- 두 식은 파일 맨 위의 `OWED_SQL`·`REFUND_SQL` 이고, 수납 화면의 환자 잔액(`billing.routes.js` `/patient/:id/balance`)과 **같은 식**입니다. 그래서 명단의 금액 = 수납 화면에서 그 환자를 열었을 때의 금액, 명단 합계 = 요약 카드 금액입니다(0.5 Ar 미만 자투리만 차이).
- **왜 `outstanding` 인가**: 옛 미수를 새 영수로 이월하면(마이그레이션 016) 옛 영수의 `outstanding` 은 0이 되지만 `total_due − net_paid` 는 그대로입니다. 예전에는 후자를 써서, 이월해 이미 받은 빚을 계속 미수로 보여줬습니다(2026-09-29 고침).
- 발생일 `since` = `outstanding > 0` 인 영수 중 가장 이른 `billing_date`, `last_date` = 가장 최근 영수일 — 둘 다 `'YYYY-MM-DD'` 문자열. 건수 `open_bills` = 미수 명단은 미수가 남은 영수 수, 환불 명단은 과납 영수 수.

### 3.4 수납 금액 규칙과의 관계 (교차 확인 결과)

수납 화면(`Payment.jsx`, `billing.routes.js`)에는 **기간 합계 숫자가 없습니다.** 「수납 완료」 목록이 `GET /billing/completed?date=` 로 그 날(`billing_date`)의 영수를 보여줄 뿐입니다. 그래서 교차 확인은 「그 날 목록에서 취소 아닌 영수의 받은 돈 − 거스름돈 합」과 통계 수납액을 비교하는 것으로 했습니다.

| 수납 규칙 | 데이터에 남는 모양 | 통계에 미치는 영향 |
|---|---|---|
| 취소(void) — `006` | `payment_status='cancelled'`, `outstanding=0`, `cancelled_at` | 매출·미수에서 빠짐 ✅. 영수 날짜의 매출이 **나중에 줄어듦**(과거 기간 숫자가 바뀜) |
| 정정(환불) — `Payment.jsx:212` | 그 방문의 활성 영수를 모두 취소하고, **오늘 날짜**로 `amount_paid=올바른 금액, change_amount=환불액` 인 새 영수 발행 | 원래 날짜의 매출은 사라지고 **오늘**에 올바른 금액 전체가 잡힘. 환불로 나간 돈은 어느 날에도 음수로 안 잡힘 |
| 이월 — `016` | 새 영수 `previous_balance` 에 옛 미수를 더하고, 옛 영수는 `outstanding=0, carried_into_id=새 영수` | 받은 돈은 새 영수 날짜의 수납액에 들어감 ✅(이중 집계 없음). 미수는 `outstanding` 으로 세어 옛 영수를 다시 세지 않음 ✅(2026-09-29 고침) |
| 순수납 — `017` | `net_paid = amount_paid − change_amount` | 통계는 전부 `net_paid` 사용 ✅ |
| 나중 수납 — `POST /billing/:id/pay` | 옛 영수의 `amount_paid`·`outstanding` 을 고침. 수납한 날짜는 어디에도 안 남음(`updated_at` 뿐) | 받은 돈이 **원래 영수 날짜**의 수납액에 들어감. 오늘 금고에 들어온 돈과 통계의 오늘 수납액이 다름 |

즉 **통계 수납액 = 「그 날짜에 발행된 영수에서 지금까지 받은 돈」** 이지, 「그 날 금고에 들어온 돈」이 아닙니다. 수납 화면의 날짜별 목록도 같은 기준이라 둘은 서로 맞지만, 둘 다 금고와는 다를 수 있습니다.

격리 스택(9186)에서 2026-09-29 에 넣은 시험 데이터로 손 계산과 비교했습니다.

**1차 (현황 파악)** — 환자 A 1차: 진료비 5 000 미수 / 2차: 진료비 3 000 + 이월 5 000 = 8 000, 10 000 내고 2 000 거스름 / 환자 B: 진료비 2 000 + 서류 1 000, 3 000 현금, 담당의 없음 / 환자 B 두 번째 접수는 취소.
수납액 11 000 = (10 000 − 2 000) + 3 000 ✅ · 청구액 11 000 ✅ · 수납 건수 3 ✅. 이때 틀렸던 것: 미수 카드 5 000(실제 0), 발생일 09-28(실제 09-29), 총 내원 4(취소 포함), 의사별 매출 합 8 000(B 의 3 000 빠짐), 항목별 검사/처치 1 000 + 서류 1 000(같은 돈).

**2차 (문제 1 고친 뒤)** — 부분 이월(5 000 미수를 새 영수 8 000 에 이월, 3 000 만 냄 → 5 000), 나중 수납(4 000 미수에 1 500 수납 → 2 500), 이월 영수 취소(2 000 이월 후 새 영수 취소 → 2 000 복원), 미수·과납 동시(1 000 미수 + 500 과납). 손 계산 미수 10 500 · 환불 500 과 요약 카드·명단 합계·환자별 수납 화면 잔액이 모두 일치 ✅. 예전 식이었다면 부분 이월 환자가 10 000.

**3차 (문제 2·3·4·5·6·11 고친 뒤)** — 과·담당의 없는 방문에 진료비 1 000 + 검사 2 000 + 서류 500 = 3 500 현금 추가. 접수 12건 중 취소 1 → 총 내원 11 ✅, 초진 10 · 재진 1 · 고유 환자 7 ✅, 과별 8 + 1 + 1 + 미지정 1 = 11 ✅, 의사별 9 + 미지정 2 = 11 ✅. 수납액 21 500 = 의사별 15 000 + 미지정 6 500 = 과별 8 000 + 7 000 + 3 500 + 3 000 ✅. 항목별 진료비 28 000 + 약 0 + 검사/처치료 2 000 + 서류 1 500 = 청구액 31 500 ✅. 발생일 2026-09-29 ✅, 약품 표 기간 `2025-10-01 ~ 2026-09-29` ✅. 한국어·프랑스어 화면에서 「취소 / Annulé」, 「미지정 / Non attribué」, 프랑스어 진료과 이름을 눈으로 확인.

### 3.5 `GET /api/stats/monthly?months=6`

- `generate_series` 로 이번 달을 포함한 최근 `months` 개월을 모두 만들고, 달마다 취소 아닌 내원 수와 취소 아닌 billing `SUM(net_paid)` 를 붙입니다(`stats.routes.js:169`). months 는 1~24로 제한.
- **자료가 없는 달도 0 으로 한 줄씩 나옵니다.** 예전에는 자료가 있는 달만 돌려줘서 조용한 달이 그래프에서 사라지고, 양옆 막대가 이어진 달처럼 보였습니다(문제 13, 2026-09-29 고침).
- 이번 달 이후 날짜(미래 날짜로 잘못 들어간 내원·영수)는 창 밖이라 세지 않습니다.
- 격리 스택에서 내원 1건을 6월로 옮겨 확인: 04·05월 0, 06월 1, 07·08월 0, 09월 11 ✅(한국어·프랑스어 화면에 여섯 막대).

### 3.6 `GET /api/stats/drug-usage?granularity&from&to&status&dispense_type`

- `prescription JOIN consultation JOIN visit` 에서 **`visit.visit_date`** 로 기간을 자르고 묶습니다(조제일 `dispensed_at` 이 아님)(`stats.routes.js:237`).
- `status=dispensed` 면 조제 완료만, 아니면 `rx.status <> 'cancelled'` 전체. `dispense_type` 으로 원내·원외 필터.
- 수량은 `SUM(COALESCE(total_qty,0))`. `total_qty` 가 비어 있는 처방은 0으로 셉니다. 약국 재고 차감은 `Math.ceil(total_qty)`(`pharmacy.routes.js:151`)라 소수 수량이면 통계와 재고 차감량이 조금 다를 수 있습니다.
- **취소된 접수의 처방도 들어갑니다**(visit.status 를 안 봄 — 문제 12, 아직 그대로). 확인 필요: 접수를 취소할 때 처방이 같이 취소되는지.
- 기본 기간: 일별 최근 30일, 월별 이번 달 포함 12개월, 연별 올해 포함 5년. 기본 기간도 `ymd()` 로 `'YYYY-MM-DD'` 문자열을 돌려줍니다(예전에는 Date 로 나가 `2025-09-30T21:00:00.000Z` 처럼 보였음, 문제 6 고침).
- 결과를 약품(`drug_code|drug_name`)별 → 기간별 피벗으로 만들고 총량 내림차순 정렬. CSV 는 브라우저에서 만듭니다(BOM 포함 UTF-8).

### 3.7 날짜 경계 · 시간대

- `visit_date`·`billing_date` 는 DB 기본값 `CURRENT_DATE` 로 들어가고, 통계의 기본 기간·월별·약품 기본 기간도 DB 의 `CURRENT_DATE` 를 씁니다. 그래서 **DB 세션 시간대가 병원 시간대여야** 날짜가 맞습니다.
- `docker-compose.yml` 은 DB 컨테이너에 `TZ`·`PGTZ` 를 줍니다. 격리 스택에서 확인한 결과, 백엔드(node-pg) 연결의 시간대는 **`postgresql.conf` 의 `timezone` 값**(출처 `configuration file`)이고, 이 값은 **DB 가 처음 만들어질 때(initdb)** 의 `TZ` 로 한 번 쓰입니다. `PGTZ` 는 psql 같은 libpq 클라이언트에만 적용되고 node-pg 는 읽지 않습니다.
- 새로 설치한 DB 는 `Indian/Antananarivo` 로 확인했습니다. **1.1.0 이전에 만들어진 DB 는 `UTC` 로 남아 있을 수 있습니다** — 확인 필요(7절 문제 7).
- 화면의 기간 버튼은 브라우저 시계, 서버의 `todayLocal()` 은 백엔드 `TZ`, DB 기본값은 DB 시간대 — 세 시계가 같을 때만 「오늘」이 한 가지 뜻입니다.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Stats.jsx`

### 서버

- `backend/src/routes/stats.routes.js  (/api/stats)` — 모든 경로가 `authMiddleware` + `permMiddleware('stats')`

| 경로 | 인자 | 돌려주는 것 |
|---|---|---|
| `GET /summary` | `from`, `to` (YYYY-MM-DD, 생략 시 이번 달) | `range, visits, byDept[{code,name,name_en,name_fr,cnt}], byDoctor[{doctor_id,name,cnt}], revenueByDept[{code,name,name_en,name_fr,paid,gross,billCount}], revenueByDoctor[{doctor_id,name,paid,gross,billCount}], revenue{gross,paid,consult,drug,procedure(서류 제외),issuance,issuanceCount,billCount,avg}, voidedCount, outstanding{owed,refund}`. 과·의사 없음은 `code`/`name` 이 `null` |
| `GET /monthly` | `months` (1~24, 기본 6) | `[{ym, visits, revenue}]` |
| `GET /outstanding` | 없음 | `{owed:[…], refund:[…], owedTotal, refundTotal}` — 각 행 `patient_id, chart_no, name, contact, amount, since(미수만), last_date, open_bills` |
| `GET /drug-usage` | `granularity`(day·month·year), `from`, `to`, `status`(dispensed), `dispense_type`(internal·external) | `{granularity, from, to, periods, drugs[{drug_code,drug_name,category,total_qty,total_count,by_period}], periodTotals, grandTotal}` |

### 공용 부품

- 없음 (공용 유틸 `backend/src/utils/validate.js` 의 `badDateRange` 만 씀)

### DB 테이블 (모두 읽기만)

| 테이블 | 쓰는 컬럼 | 주인 모듈 |
|---|---|---|
| `visit` | `visit_date, visit_type, status, patient_id, department_id, doctor_id` | 접수 |
| `department` | `id, code, name, name_en, name_fr` (화면이 언어에 맞는 이름을 고름) | 설정 |
| `staff` | `id, name` | 설정 |
| `billing` | `billing_date, payment_status, consult_fee, drug_total, procedure_total, total_due, net_paid, outstanding, cancelled_at, visit_id, patient_id` (`carried_into_id` 는 직접 안 씀 — 수납이 `outstanding` 에 반영) | 수납 |
| `billing_item` | `item_type, total_price` | 수납 |
| `patient` | `chart_no, last_name, first_name, mobile, phone` | 접수 |
| `prescription` | `drug_code, drug_name, drug_id, total_qty, status, dispense_type, consultation_id` | 진료·약국 |
| `consultation` | `visit_id` | 진료 |
| `drug` | `category` | 설정·약국 |

마이그레이션: 없음 (601~699 사용 가능)

## 5. 다른 모듈과의 연결

- **접수** — 내원 수·진료과·담당의·초진/재진은 전부 `visit` 에서 옵니다. 접수에서 과나 담당의를 비워 두면 과별·의사별 모두 「미지정」 줄로 갑니다. 접수를 취소(`status='cancelled'`)하면 내원 수에서 빠집니다.
- **수납** — 매출·미수·환불은 전부 `billing` 에서 옵니다. 금액 규칙은 3.4. 미수·환불 식(`OWED_SQL`·`REFUND_SQL`)은 수납의 `/patient/:id/balance` 와 **일부러 같게** 맞춰 두었습니다 — 수납이 그 식을 바꾸면 통계도 같이 바꿔야 합니다.
- **진료·약국** — 약품 사용통계는 `prescription` 의 처방·조제 상태를 셉니다.
- **설정** — 진료과 이름(한·영·불), 직원 이름, 약품 분류. 모듈 권한 `stats` 는 `frontend/src/modules.js` 에 정의.

## 6. 설정 항목

- 권한: 직원 설정에서 **통계** 권한(`stats`)을 켠 계정만 메뉴와 API 를 씁니다.
- `.env` 의 `TZ` — DB·백엔드 시간대. 날짜 경계에 영향(3.7).
- 그 밖에 통계 전용 설정은 없음.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기 + 격리 스택 시험으로 찾은 것. 「확인됨」은 격리 스택에서 재현한 것입니다. **고침** 표시가 없는 것은 아직 그대로입니다.

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| 1 | ~~높음~~ **고침** | **이월된 미수를 다시 셈.** (2026-09-29 `outstanding` 기준으로 바꿈, 3.3) 미수 카드와 미수 명단이 `total_due − net_paid` 로 계산해, 새 영수로 이월되어 이미 받은 옛 영수를 여전히 미수로 보여줬음. 확인됨 | `stats.routes.js:135-138`, `:206-223` ↔ `billing.routes.js:334-339` |
| 2 | ~~보통~~ **고침** | **미수 명단의 발생일이 하루 앞당겨 보임.** DATE 가 node-pg 에서 현지 자정 Date 로 오고 JSON 에서 UTC 로 바뀌었음. 이제 서버가 `ymd()` 로 문자열을 보냄(앱 전체로는 총괄 `7ad4387`) (2026-09-29) | `stats.routes.js:27`, `:215` |
| 3 | ~~보통~~ **고침** | **서류 금액이 항목별 매출에 두 번 보임.** `procedure_total` 에 이미 들어 있는 `fee` 항목을 「서류」로 또 그렸음. 이제 검사/처치료 = `procedure_total` − 서류 (2026-09-29) | `Payment.jsx:185`, `stats.routes.js:129`, `:158` |
| 4 | ~~보통~~ **고침** | **총 내원·과별·의사별·월별 내원·고유 환자에 취소된 접수가 포함.** 실장님 결정으로 취소는 「취소」 칸에만 셈 (2026-09-29) | `stats.routes.js:50-62`, `:64-78`, `:175` |
| 5 | ~~보통~~ **고침** | **의사별 매출 합계 ≠ 수납액.** 담당의 없는 방문의 영수가 `JOIN staff` 에서 빠졌음. 실장님 결정으로 「미지정」 줄로 보이게 `LEFT JOIN`, 내원 수도 같게. 동명이인이 합쳐지던 것도 `s.id` 로 묶어 해결. 이제 CHANGELOG 1.4.0 의 「합계는 같다」가 맞음 (2026-09-29) | `stats.routes.js:73-78`, `:97-107` |
| 6 | ~~낮음~~ **고침** | **약품 표 기간 표시가 UTC 문자열.** 서버 기본 기간이 Date 로 응답되어 `2025-09-30T21:00:00.000Z ~ …` 로 보였음. `/summary` 의 기본 `range` 도 같은 문제였음 (2026-09-29) | `stats.routes.js:40-44`, `:253-259` |
| 7 | 보통 (확인 필요 · 총괄) | **오래된 설치의 DB 시간대가 UTC 일 수 있음.** 백엔드 연결 시간대는 initdb 때 쓰인 `postgresql.conf` 값. 1.1.0 이전에 만든 DB 면 자정~03시 내원·수납이 전날로 들어가고, 통계 기본 기간·`cancelled_at::date` 도 UTC 로 잘림. 실행 중인 EMR 은 규칙상 확인하지 않음 | 3.7, `docker-compose.yml:17-18` |
| 8 | 보통 (결정 필요) | **수납액이 「금고 기준」이 아님.** 나중 수납(`/pay`)은 원래 영수 날짜로, 정정은 원래 날짜에서 빠지고 오늘에 전액으로 잡힘. 과거 기간의 숫자가 나중에 바뀜. 수납한 날짜를 남기는 곳이 없어서 통계만으로는 못 고침 | 3.4, `billing.routes.js:350-385`, `Payment.jsx:212-232` |
| 9 | 낮음 (결정 필요) | 진료과별·의사별 매출에 **이월로 받은 옛 미수가 새 방문의 과·의사로** 들어감(환자 A: 내과 8 000, 가정의학과 0). 청구액(할인 전)과 수납액(이월 포함)을 나란히 놓아 비교가 어긋남. 어느 쪽으로 볼지는 성과 산정 기준의 문제라 실장님께 여쭘 | `stats.routes.js:82-91`, `:97-107` |
| 10 | ~~낮음~~ **고침** | 미수 카드(영수별 양수 합)와 미수 명단(환자별 상계)의 기준이 달라 합계가 다를 수 있었음. (2026-09-29 문제 1과 함께 — 명단도 영수별 합으로, 상계 안 함) | `stats.routes.js:135-138` ↔ `:206-223` |
| 11 | ~~낮음~~ **고침** | **프랑스어 화면에 한국어가 보임.** 취소 카드 라벨이 없는 키 `t.cancelled` 라 「취소」가 떴음 → `st_cancelled`. SQL 의 `'(미지정)'` → 화면이 `st_unassigned` 로 표시. 진료과 이름을 화면 언어에 맞게(`name_fr`/`name_en`/`name`) (2026-09-29) | `Stats.jsx:117-125`, `:149` |
| 12 | 낮음 (결정 필요) | 약품 사용통계가 위쪽 기간 선택을 따르지 않고 기간을 고를 수 없음. **취소된 접수의 처방도 셈**(4번과 같은 원칙으로 뺄지 실장님께 여쭘). `total_qty` 없는 처방은 0 | `Stats.jsx:36-44`, `stats.routes.js:261-268` |
| 13 | ~~낮음~~ **고침** | 월별 추이에서 자료 없는 달이 빠졌음(0 막대가 아니라 칸이 없어짐). `generate_series` 로 모든 달을 만듦 (2026-09-29) | `stats.routes.js:169-197` |
| 14 | 낮음 (결정 필요) | 평균 단가의 분모에 미수(0원) 영수가 들어감. 「수납 건수」라는 이름과 달리 미수 영수도 셈. 분모를 바꾸면 화면 숫자의 뜻이 바뀌므로 실장님께 여쭘 | `stats.routes.js:116`, `:160` |
| 15 | ~~낮음~~ **고침** | 기간을 바꿀 때마다 기간과 무관한 `/outstanding`·`/monthly` 를 다시 불렀음 → 월별은 화면 열 때 한 번, 명단은 열 때마다. 항상 0 이던 `revenue.cancelled_count` 삭제 (2026-09-29) | `Stats.jsx:35`, `:74-78`, `stats.routes.js:116` |

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 현황 파악: 코드 기준으로 위키 작성, 문제 15건 정리(코드 변경 없음) | `598b053` |
| 2026-09-29 | 미수·환불을 수납 화면과 같은 식(`outstanding` 기준)으로 — 이월해 받은 빚이 미수로 남던 문제(1), 카드·명단 합계 불일치(10) | `52c4505` |
| 2026-09-29 | 취소 접수를 내원 수에서 뺌(4), 과·담당의 없음을 「미지정」 줄로(5), 서류 이중 표시(3), 날짜 하루 앞당김(2·6), 프랑스어 화면의 한국어(11) | `f9fce3e` |
| 2026-09-29 | 월별 추이에 빈 달도 0 으로(13), 기간과 무관한 명단·월별을 기간 바꿀 때마다 다시 부르지 않음, 죽은 `cancelled_count` 삭제(15) | (이 커밋) |
