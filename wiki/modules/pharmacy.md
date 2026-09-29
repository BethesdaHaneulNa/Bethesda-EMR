# 약국 (Pharmacy)

> **담당**: 약국 세션 · 브랜치 `session/pharmacy` · **마지막 갱신**: 2026-09-29 · **상태**: 약국 파일 안의 작은 버그 6건 수정 (7절 「해결됨」) — 높음 항목은 실장님 결정·다른 세션 작업 대기

## 1. 이 모듈이 하는 일

- 진료가 **끝난** 환자의 처방 약을 약사가 확인하고 내어준 뒤 **「조제 완료」** 로 기록합니다.
- 약마다 **원내**(병원 약국에서 내어줌)와 **원외**(환자가 바깥 약국에서 삼)를 정합니다.
  원외로 정한 약은 병원 재고에서 빠지지 않고, 수납 금액에서도 빠지며, **원외 처방전**으로 인쇄합니다.
- 원내 약을 조제 완료하면 **약품 재고가 줄어듭니다.** 재고는 설정 화면의 약품 탭에서 등록·수정합니다.
- 조제하면서 볼 수 있도록 **알레르기**, **같은 약을 아직 먹고 있을 때의 조기 재처방 경고**, **과거 내원 기록**을 함께 보여줍니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름은 한국어 (프랑스어) 순서로 적었습니다.

**화면 구성**

- 윗줄 버튼: **조제 대기** (En attente) · **조제 완료** (Délivré) · **새로고침** (Rafraîchir) · **🔍 환자 찾기** (Trouver patient) · **💊 원외 처방전** (Ordonnance ext.) · **📋 차트뷰어** (Dossier (vue)) · 오른쪽 끝 **✓ 조제 완료** (Terminer délivrance)
- 왼쪽: 환자 목록과 검색 칸 (환자 이름, 차트 번호, 약 이름으로 찾을 수 있습니다)
- 가운데: 고른 환자의 처방 약 목록
- 오른쪽: **과거 내원** (Visites passées) — 이 환자의 지난 진료 기록

**약 내어주기**

1. 메뉴에서 **약국** (Pharmacie)을 누릅니다. 왼쪽에 **오늘 진료가 끝난** 환자 중 아직 약을 받지 않은 사람이 나옵니다.
   목록은 저절로 바뀌지 않습니다. 새 환자를 보려면 **새로고침**을 누르세요.
2. 왼쪽에서 환자를 누릅니다.
3. 이름 아래 **빨간 상자**가 있으면 알레르기입니다. 먼저 확인하세요.
   오른쪽 위 **약제비 (원내)** (Médicaments (interne))는 병원에서 받을 약값입니다. 원외 약은 들어가지 않습니다 — 수납 화면과 같은 금액입니다.
4. 약 이름 아래 **⚠ 빨간 경고**가 있으면, 이 환자가 전에 같은 약을 받았고 그 약이 아직 남아 있을 날짜라는 뜻입니다.
   예: 「⚠ 5일 전 7일분 · 남은 날 2일」. 필요하면 의사에게 확인하세요.
5. 바깥 약국에서 살 약은 약 이름 아래 **원외** (Externe) 버튼을 누릅니다. 병원에서 줄 약은 **원내** (Interne) 그대로 둡니다.
   - 원외로 바꾸면 그 약은 **수납 금액에서 빠지고**, **병원 재고에서도 빠지지 않습니다.**
   - 수납에서 이미 돈을 받은 뒤에 바꾸면 수납 화면에 환불·추가 수납이 생깁니다.
6. 원외 약이 있으면 **💊 원외 처방전**을 눌러 인쇄해서 환자에게 줍니다. (원외로 정한 약만 인쇄됩니다.)
7. 원내 약을 준비해 환자에게 줍니다.
8. **✓ 조제 완료**를 누르고, 확인 창에서 **확인**을 누릅니다. 환자가 목록에서 사라지고 **조제 완료** 탭으로 옮겨갑니다.
9. 「재고가 조제량보다 적게 기록되어 있었습니다」 창이 뜨면, 컴퓨터의 재고 숫자가 실제보다 적었다는 뜻입니다.
   선반의 실제 개수를 세어서 설정 화면 약품 탭의 재고를 고쳐 주세요.

**이런 창이 뜨면**

- 「다른 사람이 이 환자를 먼저 조제 완료했습니다」 (« Ce patient a déjà été servi par quelqu'un d'autre ») —
  다른 약사가 같은 환자를 먼저 끝냈습니다. 재고는 한 번만 빠졌으니 **아무것도 하지 않아도 됩니다.** 목록이 저절로 새로 불러와집니다.
  약을 두 번 내어주지 않았는지만 확인하세요.
- 「이미 조제 완료된 약은 원내/원외를 바꿀 수 없습니다」 (« … interne/externe ne peut plus être changé ») —
  그 사이에 다른 사람이 조제 완료했습니다. 목록이 새로 불러와집니다.

**주의**

- **조제 완료는 되돌릴 수 없습니다.** 잘못 눌렀으면 관리자에게 알려 재고를 손으로 고쳐야 합니다.
- 어제 이전에 진료가 끝나고 조제하지 않은 약은 목록에 나오지 않습니다.
- **조제 완료** 탭에는 오늘 조제한 환자만 나옵니다.
- **🔍 환자 찾기**로 고른 환자는 오른쪽 과거 내원만 보여줍니다. 조제하거나 원외 처방전을 인쇄하려면 왼쪽 목록에서 환자를 골라야 합니다.

## 3. 기능 상세

### 3.1 무엇이 대기 목록에 오는가

`GET /api/pharmacy/pending` (`pharmacy.routes.js:16`) 이 기준입니다. 다음을 모두 만족하는 **진료(consultation) 단위**로 묶어 보여줍니다.

- `consultation.status = 'completed'` — 의사가 진료 화면에서 **완료**를 눌렀음 (`consult.routes.js:77` `PUT /api/consultations/:id/complete`)
- `visit.visit_date = CURRENT_DATE` — **오늘 내원만** (`pharmacy.routes.js:57`). DB 시간대 기준이며, 운영 `.env`의 `TZ=Indian/Antananarivo`가 DB 컨테이너(`TZ`, `PGTZ`)에도 들어갑니다.
- `prescription.status = 'ordered'` 인 처방 줄이 하나 이상 있음

정렬은 `consultation.updated_at` 오름차순입니다. 이 값은 진료 기록을 다시 저장할 때마다 바뀌므로(`consult.routes.js:59`) 목록 순서가 바뀔 수 있습니다. 화면의 시각도 이 값입니다(`Pharmacy.jsx:12`).

완료 후 의사가 처방을 **추가**하면 그 줄은 `ordered`라 다시 대기 목록에 나옵니다(진료 상태는 `completed` 그대로이기 때문).

### 3.2 원내 · 원외

- 처방 줄마다 `prescription.dispense_type` = `'internal'`(기본) 또는 `'external'` (`012_dispense_type.sql`).
- 진료 화면에서는 정하지 않습니다. **약국 화면에서만** 바꿉니다 — `PUT /api/pharmacy/prescription/:id/dispense-type` (`pharmacy.routes.js:234`). `'external'`이 아닌 값은 모두 `'internal'`로 저장합니다.
- **아직 조제 대기(`status='ordered'`)인 줄만** 바꿀 수 있습니다(`:238`). 조제가 끝난 줄은 409로 거절합니다.
  이미 원내로 재고를 뺀 줄을 원외로 바꾸면 재고는 빠진 채 청구만 사라지기 때문입니다. 화면은 조제 완료 탭에서 버튼을 숨기지만(`Pharmacy.jsx:228`), 화면만이 이 API를 부르는 길은 아니어서 서버에서 막습니다.
  조제와 전환이 동시에 일어나면 전환이 조제의 줄 잠금을 기다렸다가 조건을 다시 보고 거절됩니다.
- 조제 완료 탭에서는 원외 줄에 「원외」 표시가 붙습니다(`Pharmacy.jsx:234`).
- 전환하면 열려 있는 환자(`sel`)와 왼쪽 목록(`pending`)을 **둘 다** 고칩니다(`Pharmacy.jsx:44`). 목록을 안 고치면 다른 환자를 눌렀다 돌아왔을 때 예전 값이 보였습니다.
- 원외의 효과
  - **재고**: 조제 완료 때 차감하지 않음 (`pharmacy.routes.js:182`)
  - **수납**: 청구 대상에서 빠짐 (`billing.routes.js:31-33`, `:119`). 수납은 청구서를 만들 때가 아니라 매번 처방을 다시 계산하므로, 원내/원외를 바꾸면 수납 화면에 추가 수납·환불로 나타납니다.
  - **약국 화면의 약제비**: 원외 줄은 더하지 않음 (`Pharmacy.jsx:149`, 표시 이름 「약제비 (원내)」) — 수납과 같은 금액이 되도록
  - **원외 처방전**: 원외 줄만 인쇄 (`external-rx.jsx:32`)
  - **통계**: 약품 사용 통계에서 원내/원외로 나눠 볼 수 있음 (`stats.routes.js:215`)
- 원외 줄도 조제 완료를 누르면 `status='dispensed'`가 됩니다. 「환자에게 처방전을 줬다」는 의미로 쓰입니다.

### 3.3 조제 완료와 재고 차감

`PUT /api/pharmacy/consultations/:id/dispense` (`pharmacy.routes.js:141`). **진료 하나의 대기 줄 전부를 한 번에** 조제 완료합니다(한 줄씩, 일부만은 불가).

한 트랜잭션 안에서:

1. 그 진료의 `status='ordered'` 처방 줄을 `FOR UPDATE`로 잠급니다 (`:146-152`). 없으면 404 (`ERR_NOTHING_PENDING`).
2. 재고를 뺄 약(원내이고 `drug_id`가 있는 줄의 약)의 행을 **`drug.id` 오름차순으로 한꺼번에** 잠급니다 (`:166-178`).
   처방 순서대로 하나씩 잠그면, 같은 두 약을 반대 순서로 가진 두 환자가 동시에 조제될 때 서로 상대의 잠금을 기다리다 Postgres가 한쪽을 「deadlock detected」로 실패시킵니다. 모두가 같은 순서로 잠그면 이런 순환이 생기지 않습니다.
3. 줄마다 — `drug_id`가 있고 원내이면:
   - 차감량 = `Math.ceil(total_qty)` (`:183`). 재고 칸(`drug.stock_qty`)이 정수라서 올림합니다. 청구는 소수 그대로 합니다(예: 7.5 → 재고 8 차감, 청구 7.5개분).
   - 현재 재고를 읽고(이미 잠근 행이라 기다리지 않음) `stock_qty = GREATEST(stock_qty - 차감량, 0)` (`:188-196`). **0 아래로 내려가지 않습니다.**
   - 재고가 모자랐으면 `shortages`에 모자란 양을 담습니다 (`:198`). 화면은 이를 경고 창으로 보여줍니다 (`Pharmacy.jsx:116`).
     0에서 멈추면 모자란 만큼이 흔적 없이 사라지기 때문에, 선반과 장부가 어긋났다는 사실을 알리려는 것입니다.
4. 대기 줄 전부를 `status='dispensed'`, `dispensed_by`, `dispensed_at=NOW()`로 바꿉니다 (`:207-212`).

**재고 차감은 이 순간 한 번뿐입니다.** 처방할 때, 수납할 때는 재고가 바뀌지 않습니다. 조제 취소(재고 되돌리기)는 없습니다.

**동시 조제** — 2026-09-29 격리 스택에서 실제로 동시에 요청을 보내 확인했습니다(시험 방법은 인계 노트).

- 두 사람이 **같은 환자**를 동시에 조제 완료: 두 번째 요청은 1단계 잠금에서 기다렸다가, 첫 번째가 끝난 뒤 조건(`status='ordered'`)을 다시 보고 0줄을 얻어 404가 됩니다. **재고는 한 번만 빠집니다.**
  화면은 이 404를 알아보고 「다른 사람이 먼저 조제 완료했습니다」를 번역해서 보여준 뒤 목록을 다시 불러옵니다(`Pharmacy.jsx:123`).
- **다른 환자**가 같은 약을 동시에: 약 행 잠금으로 차감이 차례로 일어나 재고가 맞습니다. 약 순서가 반대인 환자 12쌍(24건)을 동시에 조제해서, 고치기 전에는 24건 중 3건이 deadlock으로 실패했고 고친 뒤에는 세 번 돌려 모두 성공, 재고도 정확히 24씩 줄었습니다.
- **오류 문구 번역**: API 클라이언트(`api/client.js`, 총괄 파일)는 화면에 상태 코드 없이 오류 문구만 넘깁니다. 그래서 서버가 정해진 영어 문구(`ERR_NOTHING_PENDING`, `ERR_TYPE_LOCKED`, `pharmacy.routes.js:12-13`)를 보내고 화면이 **같은 문구**(`Pharmacy.jsx:21-22`)를 비교해 번역 키로 바꿉니다. **한쪽 문구를 바꾸면 다른 쪽도 같이 바꿔야 합니다.**
- **설정 화면에서 재고를 고치는 것**과 조제가 겹치면 조제한 차감이 사라질 수 있습니다(7절 H4).
- **의사가 처방을 고치는 것**: 조제된 줄은 진료 쪽 API가 수정·삭제를 409로 거절합니다(`consult.routes.js:199`, `:212` — `status <> 'dispensed'` 조건). 조제와 동시에 고치면 수정이 조제의 줄 잠금을 기다렸다가 조건을 다시 보고 거절됩니다(코드로 확인, 동시 시험은 안 함).

### 3.4 수량 계산

처방 줄의 `total_qty`는 **진료 화면이** 계산해서 보냅니다: `dose × frequency × days` (`Consultation.jsx:248`, `:278`). 서버도 비어 있으면 같은 식으로 채웁니다(`consult.routes.js:170`).
약국 화면(`Pharmacy.jsx:16`)과 원외 처방전(`external-rx.jsx:24`)은 `total_qty`가 없을 때만 같은 식으로 계산합니다. 즉 **`dose`는 「1회 복용량」으로 취급됩니다.** 그런데 기본 용량 시드는 「1일 총량」처럼 보입니다 — 7절 H1.

진료 화면은 저장할 때마다 `total_qty`를 다시 계산하므로 **의사가 총량을 따로 적을 방법이 없습니다**(7절 H2).

### 3.5 조기 재처방 경고

`GET /api/pharmacy/patient/:patientId/recent-rx` (`pharmacy.routes.js:125`) 로 최근 120일 처방을 받고, 화면(`Pharmacy.jsx:72` `refillWarn`)에서 판단합니다.

- 같은 `drug_code`, 지금 진료가 아닌 **오늘 이전** 진료의 처방
- `처방일 + 일수 > 오늘` 이면 경고 (가장 많이 남은 것 하나)
- 처방 상태(조제했는지, 원외인지)는 따지지 않습니다.

### 3.6 원외 처방전 (`frontend/src/documents/external-rx.jsx`)

- 문서 엔진(`DocumentModal.jsx`, 진료 세션 주관)에 `category: 'prescription'`, `code: 'external-rx'`, `needsMeds: true`로 등록됩니다(`documents/registry.js`).
- 약 목록은 엔진이 `GET /api/consultations/visit/:visitId/prescriptions`로 **내원 단위** 처방을 받아 넘깁니다(`DocumentModal.jsx:76`). 양식은 그중 `dispense_type === 'external'`만 표에 넣습니다.
- 입력 칸: **수신 약국(선택)**, **복약지도/비고**. 표 칸: No · 약품명(+코드) · 1회량 · 횟수 · 일수 · 총량 · 용법/비고(`route`와 `memo`를 이어 붙임).
- 표 칸 폭: 고정 칸 합 382px, 약품명 칸이 나머지(인쇄 본문 688px 기준 약 306px). 표는 페이지 중간에서 끊기지 않게 `breakInside: avoid`.
- 약국 화면과 수납 화면에서 인쇄합니다. 약국에서는 **💊 원외 처방전** 버튼이 `DocumentModal`을 `category="prescription"`으로 엽니다(`Pharmacy.jsx:261`). 수납 화면도 같은 방식으로 엽니다(`Payment.jsx:454`, 수납 세션 파일).
- 환자 칸(이름·생년월일·성별·주소)은 엔진이 `GET /api/patients/:id`로 **다시 읽어** 채웁니다(`DocumentModal.jsx:75`). 생년월일이 하루 앞당겨 찍히던 문제(7절 H5)는 이 경로에서 생겼습니다.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Pharmacy.jsx` — 약국 화면 (경로 `/pharmacy`, 권한 `pharmacy`)
- `frontend/src/documents/external-rx.jsx` — 원외처방전 양식
- `frontend/src/pages/Settings.jsx`의 **약품 탭** (`{/* DRUGS */}` 부분과 편집 창의 `editType==='drug'` 부분)

### 서버

`backend/src/routes/pharmacy.routes.js` — `/api/pharmacy`. 모든 요청에 로그인 + `pharmacy` 권한이 필요합니다(`:6-7`). 기본 권한으로는 `pharmacy`, `admin` 역할이 가집니다(`middleware/auth.js:41-44`).

| 메서드 · 경로 | 하는 일 | 응답 |
|---|---|---|
| `GET /pending` | 오늘 진료 완료 + 대기 처방이 있는 진료 목록 | 진료마다 `consultation_id, consultation_time(=c.updated_at), visit_id, visit_date, patient_id, chart_no, last_name, first_name, gender, date_of_birth, allergies, doctor_name, rx_count, drug_total(원외 포함 — 화면은 안 씀), prescriptions[]` |
| `GET /completed` | 오늘 내원 중 조제 완료된 처방, 최근 조제 순 50개 | 진료마다 한 줄 `consultation_id, dispensed_at(가장 늦은 것), visit_id, visit_date, patient_id, chart_no, last_name, first_name, gender, date_of_birth, allergies, doctor_name, dispensed_by_name(여러 명이면 쉼표로), rx_count, prescriptions[]` |
| `GET /patient/:patientId/recent-rx` | 최근 120일 처방 (조기 재처방 경고용) | `drug_code, drug_name, days, status, consult_date, consultation_id` |
| `PUT /consultations/:id/dispense` | 대기 줄 전부 조제 완료 + 원내 재고 차감 | `success, dispensed_count, prescriptions[], shortages[]` (`shortages`: `prescription_id, drug_id, drug_name, requested, available, missing`). 대기 줄이 없으면(다른 사람이 먼저 조제 포함) **404** `ERR_NOTHING_PENDING` |
| `PUT /prescription/:id/dispense-type` | 원내/원외 지정. 본문 `{ dispense_type: 'internal' \| 'external' }` | 바뀐 처방 줄. 줄이 없으면 404, 이미 조제된 줄이면 **409** `ERR_TYPE_LOCKED` |

`prescriptions[]`의 줄: `id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo, dispense_type, status, created_at` (완료 목록은 `created_at` 대신 `dispensed_at`).
완료 목록도 대기 목록과 같은 칸(환자 성별·생년월일·알레르기, 줄의 `unit_price`·`dispense_type`)을 돌려줍니다. 화면이 두 탭을 같은 코드로 그리기 때문입니다 — 빠져 있을 때는 완료 탭에서 약제비가 0, 원외 표시·알레르기 상자가 안 나왔습니다.

약품 등록 API는 설정 세션 파일 `admin.routes.js`에 있습니다(6절).

### 공용 부품

- `components/DocumentModal.jsx` (진료 주관) — 원외 처방전, 차트뷰어
- `components/PatientChart.jsx` (수납 주관) — 오른쪽 과거 내원
- `components/PatientFinder.jsx` (접수 주관) — 환자 찾기

### DB 테이블

**`drug`** (`001_schema.sql:138`)

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | serial | |
| `code` | varchar(20) UNIQUE NOT NULL | 약 코드. 처방·원외 처방전·재처방 경고가 이 코드로 같은 약을 찾습니다 |
| `name` / `name_en` / `generic_name` | varchar(200) | 화면은 `name`만 씁니다. `name_en`, `generic_name`은 설정 화면에 입력 칸이 없음 |
| `category` | varchar(50) | 설정 화면 선택지: Antibiotic, Analgesic, Antimalarial, Cardiovascular, GI, Vitamin, Other |
| `default_dose` | varchar(20) '1.000' | 처방할 때 들어가는 기본 1회량 (문자열) |
| `default_freq` / `default_days` | integer | 기본 횟수 / 일수 |
| `default_route` | varchar(10) 'QD' | 기본 「경로」. 실제로는 `TID`·`BID`·`QD` 같은 복용 횟수 코드와 `IV`·`PO`·`INH`가 섞여 있습니다 |
| `unit_price` | decimal(12,2) | 단가. 처방할 때 처방 줄로 복사됩니다 |
| `stock_qty` | **integer** | 현재 재고. 조제 완료 때 줄고, 설정 화면에서 숫자를 직접 고칩니다 |
| `min_stock` | integer 10 | **어디서도 쓰지 않습니다** (설정 화면은 `< 20`을 빨간색으로 고정 표시) |
| `is_active` | boolean | 설정의 「삭제」는 `false`로 바꿀 뿐입니다 |

**`prescription`** (`001_schema.sql:159`, `012_dispense_type.sql`)

| 칸 | 뜻 |
|---|---|
| `consultation_id` | 진료. 진료가 지워지면 같이 지워짐(CASCADE) |
| `drug_id` | `drug.id`. 비어 있으면 재고 차감을 건너뜁니다 |
| `drug_code`, `drug_name` | 처방 당시 복사본 |
| `dose` (varchar), `frequency`, `days`, `route` | 1회량 · 횟수 · 일수 · 경로(용법) |
| `total_qty` decimal(10,3) | 총량 = 청구 수량 = 재고 차감량(올림) |
| `unit_price` | 처방 당시 단가 |
| `memo` | 비고 |
| `dispense_type` | `'internal'` / `'external'` |
| `status` | `'ordered'` → `'dispensed'`. `'cancelled'`도 허용되지만 지금 이 값을 쓰는 코드는 없습니다 |
| `dispensed_by`, `dispensed_at` | 조제한 직원과 시각 |
| `sort_order` | 표시 순서 |

약품·조제 관련 마이그레이션: `001_schema.sql`(테이블), `003_seed_data.sql:1-27`(기본 약 25개, 재고 포함), `004_order_sets.sql`(오더 세트에 약 포함), `012_dispense_type.sql`(원내/원외). 약국 세션의 새 마이그레이션은 **401 ~ 499**.

## 5. 다른 모듈과의 연결

```
 진료 ──처방 입력──▶ prescription (status=ordered, dispense_type=internal)
  │                        │
  └─ [완료] ─▶ consultation.status=completed, visit.status=completed
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
 약국 (오늘 + 완료 + ordered)          수납 (visit.status=completed)
  · 원내/원외 지정 ───────────────▶  원외 줄은 청구에서 빠짐 (매번 다시 계산)
  · 조제 완료: dispensed + 재고 차감
  · 원외 처방전 인쇄
          │
          ▼
 통계 — 약품 사용량 (total_qty, 원내/원외, 조제 여부로 나눠 봄)
```

- **진료 → 약국**: 진료 화면이 `POST /api/consultations/:id/prescriptions`로 처방 줄을 만들고(`consult.routes.js:149`), 약의 기본값·단가를 복사하며 `total_qty`를 계산해 보냅니다(`Consultation.jsx:240`). 의사가 **완료**를 눌러야 약국에 나타납니다.
- **약국 ↔ 수납**: 순서가 정해져 있지 않습니다. 둘 다 「진료 완료」 뒤에 따로 봅니다. 약국이 원내/원외를 바꾸면 수납의 청구 금액이 바뀝니다. 조제 여부는 청구와 관계없습니다.
- **약국 → 통계**: `stats.routes.js:193` `/api/stats/drug-usage`가 `prescription`을 직접 집계합니다.
- **설정 → 약국**: 약품 등록·재고는 설정 화면 약품 탭 (6절).
- **진료는 조제된 처방을 고칠 수 없습니다** — 진료 세션이 `d1f473e`로 막았습니다(7절 H3 해결됨).

## 6. 설정 항목

**설정 → 💊 Drugs 탭** (`Settings.jsx`, 약국 세션이 고칠 수 있음)

- 목록: Code · Name · Cat · Dose · Freq · Days · Route · Price · Stock. 재고가 20 미만이면 빨간색. 검색 칸은 이름·코드.
- **+ Add** / **Edit**: 코드, 이름, 1회량(Dose), 횟수(Freq), 일수(Days), 경로(Route), 분류(Category), 단가(Price), 재고(Stock)
  - 새 약 기본값: 분류 Other, 1회량 1.000, 1회, 7일, QD, 단가 0, 재고 0
- **Delete**: 실제로는 비활성화. 목록에서 사라지고, 되살리는 화면은 없습니다.
- 재고는 **숫자를 통째로 덮어씁니다**. 입고·조정 기록은 남지 않습니다.

API — 설정 세션 파일 `admin.routes.js`:

| 메서드 · 경로 | 권한 |
|---|---|
| `GET /api/admin/drugs?q=&category=` — 활성 약 목록 (진료 화면 약 검색도 이것을 씀) | 로그인만 |
| `POST /api/admin/drugs` · `PUT /api/admin/drugs/:id` — 모든 칸을 받아서 그대로 저장 | `settings` |
| `DELETE /api/admin/drugs/:id` — `is_active=false` | `settings` |

즉 **약사 계정(기본 권한 `pharmacy`만)은 재고를 고칠 수 없습니다.** 재고 조정은 설정 권한이 있는 사람이 합니다.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기와 격리 스택 시험으로 찾은 것입니다. 고친 것은 맨 아래 「해결됨」으로 옮겼습니다(번호는 그대로 둡니다). 심각도: **높음** = 환자 안전·돈·재고가 틀어짐, **보통** = 일하다 헷갈리거나 기록이 어긋남, **낮음** = 불편·드묾.

### 높음

- **H1. 기본 용량 시드가 「1일 총량」처럼 적혀 있는데 계산은 「1회량」으로 합니다** — 의학적 판단 필요, 실장님 확인
  - 근거: `003_seed_data.sql:3-27`, 계산 `Consultation.jsx:248`, `:278`, 인쇄 `external-rx.jsx:12`(「1회량」), `:27`
  - 예: Paracetamol 500mg `3.000 / 3회 / 5일` → 1회 3정(1.5g) × 하루 3번 = **하루 4.5g**(성인 최대 4g 초과), 총 45정 청구·차감.
    Chlorpheniramine 4mg `3 / 3회` → 하루 36mg, Metronidazole 400mg `3 / 3회` → 하루 3.6g. 반면 Artemether-Lumefantrine `4 / 2회 / 3일` = 24정은 1회량으로 맞습니다.
  - 영향: 원외 처방전에 「1회량 3 · 횟수 3」으로 찍혀 바깥 약국이 3정씩 하루 3번으로 읽을 수 있습니다. 원내는 청구·재고 차감이 3배.
  - **확인 필요**: 운영 DB의 약품 기본값이 시드 그대로인지, 병원에서 이미 고쳤는지 (운영 DB는 건드리지 않아 확인하지 않았습니다).
- **H2. 시럽·흡입기처럼 「병·개」로 주는 약의 수량이 1회량×횟수×일수로 계산됩니다**
  - 근거: 약에 포장 단위 개념이 없음(`001_schema.sql:138`), 진료 화면이 저장마다 총량을 다시 계산(`Consultation.jsx:278`)해서 의사가 총량을 직접 적을 수 없음
  - 예: Salbutamol 흡입기 `2 / 3회 / 30일` → **180개 × 8,000 = 1,440,000** 청구, 재고 180 차감(시드 재고 20). Paracetamol 시럽 `3 / 3회 / 5일` → 45병.
  - 고치려면 진료 화면(진료 세션)과 약품 정보(포장 단위) 둘 다 바뀌어야 합니다.
- **H4. 설정 화면에서 약 정보를 저장하면 그 창을 연 시점의 재고로 덮어씁니다**
  - 근거: 편집 창이 약 행 전체를 들고 있다가(`Settings.jsx:133`) 그대로 보냄 → `admin.routes.js:89` `stock_qty=$11`
  - 예: 아침에 설정 화면을 열어 둠(재고 100) → 낮에 30개 조제(재고 70) → 오후에 그 목록에서 단가만 고쳐 저장 → **재고 100으로 돌아감**. 경고 없음.
  - 약품 탭은 약국 몫이지만 API는 설정 세션 파일입니다. 서버 쪽 수정이 필요합니다.

### 보통

- **M3. 오늘 내원만 대기 목록에 나옵니다** — `pharmacy.routes.js:57`. 어제 진료가 끝나고 조제하지 않은 처방은 약국 화면에서 영영 볼 수 없고 `ordered`로 남습니다. 자정 넘어 끝난 진료도 마찬가지(내원 날짜 기준).
- **M4. 약국 화면에 재고가 보이지 않습니다** — 조제 전에는 재고가 모자란지 알 수 없고, 조제 완료 뒤에야 경고가 뜹니다. `drug.min_stock`은 아무 데서도 쓰지 않습니다.
- **M5. 재고 입출고 기록이 없습니다** — 재고는 숫자 하나뿐이고, 설정에서 덮어쓰면 누가 언제 왜 바꿨는지 남지 않습니다. 입고(약이 들어옴) 기능도 없습니다. H4와 함께 풀면 좋습니다.
- **M6. 조제 취소가 없습니다** — 잘못 누르면 되돌릴 수 없고, 재고를 손으로 고쳐야 합니다.
- **M7. 「경로」 칸에 TID·BID 같은 복용 횟수 코드가 들어 있습니다** — 시드 `default_route`(`003_seed_data.sql`). 화면은 「경로 / Voie」, 원외 처방전은 「용법 / Voie」로 찍혀, 횟수 칸(3)과 경로 칸(TID)이 겹쳐 보입니다. H1과 같이 정리할 문제입니다.

### 낮음

- **L5. 설정 약품 탭이 영어 고정입니다** — `Settings.jsx:289-295`, `:722-737` (Drugs, Code, Dose, Stock, + Add …), 삭제 확인 「Delete?」(`:155`). 프랑스어 화면에서도 영어로 보입니다.
- **L6. 설정 약품 탭의 빈 곳** — `min_stock`·`name_en`·`generic_name` 입력 칸 없음. 새 약은 `min_stock`이 비어(NULL) 저장됨(`admin.routes.js:75-77`, 기본값 10이 안 들어감). 재고에 소수를 넣으면 DB 오류(`stock_qty`는 정수인데 검사는 음수만 봄, `admin.routes.js:40-49`). 삭제한 약은 되살릴 수 없고 같은 코드로 새로 등록도 안 됨(`code UNIQUE`).
- **L7. 조기 재처방 경고 문구가 짧아 뜻을 알기 어렵습니다** — 프랑스어로 「⚠ 5j 7j · reste 2j」(`Pharmacy.jsx:235`). 조제하지 않은 처방도 경고 대상에 들어갑니다(`pharmacy.routes.js:128-133`).
- **L8. 대기 목록이 저절로 새로고침되지 않습니다** — 새 환자를 보려면 새로고침을 눌러야 합니다.
- **L9. 목록 시각·순서가 진료 기록을 다시 저장하면 바뀝니다** — `consultation.updated_at` 사용(`pharmacy.routes.js:21`, `:59`).

### 해결됨

2026-09-29 수정. 무엇을 어떻게 고쳤는지는 3절, 확인 방법은 인계 노트에 있습니다.

- **M1. 원내/원외 전환 API가 조제 상태를 보지 않았습니다** → 조제 대기 줄만 바꾸고, 조제된 줄은 409 (`pharmacy.routes.js:234-249`). 3.2절.
- **M2. 원내/원외를 바꾼 뒤 다른 환자를 눌렀다 돌아오면 예전 값이 보였습니다** → 목록도 같이 고침 (`Pharmacy.jsx:44-62`). 3.2절.
- **L1. 교착(deadlock)** → 약 행을 `drug.id` 순서로 먼저 잠금 (`pharmacy.routes.js:166-178`). 고치기 전 24건 중 3건 실패 → 고친 뒤 0건. 3.3절.
- **L2. 같은 환자를 동시에 조제하면 두 번째 사람에게 영어 오류** → 번역된 안내(「다른 사람이 먼저 조제 완료했습니다」) 후 목록 새로고침 (`Pharmacy.jsx:123-127`). 3.3절.
- **L3. 조제 완료 탭** — 같은 진료가 두 줄로 나오던 것(`STRING_AGG`로 조제자를 합침, `pharmacy.routes.js:87`), 원외 표시·약제비·알레르기 상자가 안 나오던 것(빠진 칸 추가). 4절.
- **H5. 인쇄 문서의 생년월일이 하루 앞당겨 찍혔습니다** (모든 모듈의 문서) → 총괄이 `develop`에서 고침(`7ad4387`, `config/database.js`가 DATE를 'YYYY-MM-DD' 문자열 그대로 넘김). 원인: node-postgres가 DATE를 서버 시간대(UTC+3) 자정으로 만들고 JSON이 UTC로 써서, 1990-01-01생이 `1989-12-31T21:00:00.000Z`로 나가고 화면·문서가 `T` 앞만 씀. 이 약국 브랜치에는 그 커밋이 없으므로 합친 뒤에 원외 처방전의 생년월일을 한 번 확인해야 합니다.
- **H3. 조제 완료된 처방을 진료 화면에서 고치거나 지울 수 있었습니다** → 진료 세션이 고침(`d1f473e`): 조제된 줄의 수정·삭제는 409 (`consult.routes.js:180`, `:199`, `:212`).
- **L4. 약제비가 원외 약까지 더했습니다** → 원외 제외, 이름을 「약제비 (원내)」로 (`Pharmacy.jsx:149-151`, `:211`). 3.2절.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 코드 기준으로 위키 첫 작성 (코드 변경 없음) | `b283335` |
| 2026-09-29 | 원내/원외 전환 잠금(조제 후 409), 전환 후 목록 갱신, 약 행 잠금 순서(교착 방지), 동시 조제 안내 번역, 조제 완료 탭 한 줄·빠진 칸, 약제비 원외 제외 | `3b91950` |
| 2026-09-29 | 생년월일 임시 처리(TO_CHAR) 되돌림 — 총괄 `7ad4387`이 전체를 고쳐서. H5를 해결됨으로 | `d232b88` |
| 2026-09-29 | develop(`5e0e056`)을 당긴 뒤 정리: H3 해결됨(진료 `d1f473e`), 설정 화면 줄 번호 갱신, 시험 스크립트 머리에 격리 스택 전용 경고 | (이 커밋) |
