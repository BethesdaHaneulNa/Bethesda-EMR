# 임상병리 (Laboratory)

> **담당**: 임상병리 세션 · 브랜치 `session/laboratory` · **마지막 갱신**: 2026-09-29 · **상태**: 현황 파악 끝 — 코드는 아직 안 고침. 7절의 문제 목록을 실장님이 검토 중

## 1. 이 모듈이 하는 일

진료실에서 의사가 낸 **검사 오더**(CBC, 혈당, 말라리아 RDT …)의 결과를 검사실 직원이 입력하는 화면입니다.

- 검사 오더는 따로 만들지 않습니다. 진료 화면에서 의사가 `lab` 종류의 오더 코드를 넣으면 그 오더가 곧 검사 요청입니다.
- 검사 하나(= 오더 코드 하나, 예: `L01 CBC`)를 **검사 패널**이라 부르고, 패널마다 **검사항목**(WBC, RBC, Hb …)과 **참고치**를 설정 화면에서 정의해 둡니다.
- 검사실은 항목별로 결과값을 넣고 저장합니다. 숫자 값이 참고치 밖이면 자동으로 **낮음(▼, 파랑)** / **높음(▲, 빨강)** 표시가 붙습니다.
- 입력한 결과는 환자별 **날짜 × 항목 표**(`LabResults`)로 모여, 검사실 화면 오른쪽과 **진료 화면의 「🧪 검사결과」 창**에 똑같이 나옵니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름 그대로, 순서대로 씁니다. (괄호 안은 프랑스어 화면의 글자)

### 오늘 들어온 검사 결과 넣기

1. 위 메뉴에서 **🧪 임상병리 (Laboratoire)** 를 누릅니다.
2. 왼쪽 목록 위의 **결과 대기 (En attente)** 가 눌려 있는지 확인합니다. 숫자는 기다리는 환자 수입니다.
   - 여기에는 **오늘 내원한 환자** 중 **의사가 진료를 끝낸(완료한)** 환자만 나옵니다. 의사가 아직 진료를 끝내지 않았으면 보이지 않습니다.
   - 목록이 오래됐으면 **↻** 를 눌러 새로 불러옵니다. (자동으로 새로고침되지 않습니다)
3. 환자 이름을 누릅니다. 가운데에 그 환자의 검사가 버튼으로 나옵니다.
   - 검사가 두 개 이상이면 **전체 (Tout)** 버튼이 먼저 켜지고, 모든 검사의 입력 칸이 한 번에 보입니다.
   - 검사 하나만 보려면 그 검사 이름 버튼을 누릅니다. 이미 저장한 검사에는 **✓** 가 붙어 있습니다.
4. 각 항목의 **결과값 (Valeur)** 칸에 숫자를 넣습니다. 참고치를 벗어나면 글자가 파랑(낮음)이나 빨강(높음)으로 바뀝니다.
   - 필요하면 **비고 (Note)** 칸에 메모를 적습니다.
   - ⚠ 소수점은 **점(.)** 으로 넣으세요. 쉼표(,)로 넣으면 지금은 높음·낮음 판정이 틀립니다(7절 문제 2).
5. 아래 오른쪽의 **✓ 결과 저장 · 완료 (Enregistrer · Terminer)** 를 누릅니다.
   - 저장하면 그 검사는 **완료**로 바뀌어 결과 대기 목록에서 빠지고, **입력 완료 (Terminé)** 목록으로 갑니다.
   - 값을 하나도 안 넣은 검사는 저장되지 않습니다(오류가 뜹니다). **중간 저장은 없습니다** — 저장하면 곧 완료입니다.
   - **전체** 화면에서 저장하면 모든 검사를 한꺼번에 저장·완료합니다. 그중 값이 하나도 없는 검사가 있으면 오류가 나고, 그 앞의 검사까지만 저장됩니다(7절 문제 6).

### 이미 넣은 결과 고치기

1. **입력 완료 (Terminé)** 를 누릅니다. 오늘 결과를 넣은 환자가 나옵니다.
2. 환자를 누르고 값을 고친 뒤 **✓ 결과 저장 · 완료** 를 다시 누릅니다. 이전 값은 남지 않고 새 값으로 바뀝니다.

### 지난 날짜의 검사 찾기

1. 위의 **🔍 환자 찾기 (Trouver patient)** 를 누릅니다.
2. 환자를 찾아 내원 기록 하나를 고르면, 그 내원의 검사가 가운데에 열립니다. (결과 대기 목록은 오늘 것만 보여주므로, 어제 들어온 검사는 이렇게 찾아야 합니다)

### 그 밖의 버튼

- **📋 차트뷰어 (Dossier (vue))** — 환자를 고른 뒤 누르면 그 환자의 차트 문서를 읽기 전용으로 봅니다.
- 오른쪽 **🧪 검사결과** 칸 — 고른 환자의 지금까지 모든 검사 결과가 날짜별로 나옵니다.
- 가운데 환자 이름 아래에 빨간 **⚠** 줄이 있으면 그 환자의 알레르기입니다.

### 검사항목·참고치 정하기 (관리자)

1. **⚙ 설정** → 왼쪽 **🧫 검사항목 (Items de test)** 탭을 누릅니다.
2. **검사 패널** 에서 검사를 고릅니다. 새 검사가 필요하면 **+ 새 검사 패널** 을 눌러 코드·이름·가격을 넣고 **추가** 합니다. (새 패널은 진료실 오더 목록에도 바로 나타납니다)
3. 항목마다 이름, 단위, **하한**, **상한**, **문자 참고치**(예: `Negative`)를 넣습니다. **+ 항목 추가** 로 줄을 늘리고, **✕** 로 지웁니다.
4. **저장** 을 누릅니다.
   - ⚠ 지금은 여기서 저장하면, 이미 결과를 넣은 검사를 다시 열었을 때 예전 값이 빈칸으로 보입니다(7절 문제 1). 결과 표(🧪 검사결과)에는 그대로 남아 있습니다.

## 3. 기능 상세

### 3.1 화면 구성 — `frontend/src/pages/Lab.jsx`

세 칸입니다. 왼쪽 목록(300px) · 가운데 입력 · 오른쪽 결과 표(460px, `LabResults`).

- 목록 단위는 **진료(consultation) 하나**입니다. 한 진료에 걸린 검사 오더들이 `lab_orders` 배열로 묶여 옵니다.
- `pickConsult(g)` — 오더가 여러 개면 `loadView('all')`, 하나면 그 오더만 엽니다.
- `loadView(v)` — 보여줄 오더마다 `GET /api/lab/order/:id/items`를 병렬로 불러 `groups` 상태(`[{order_item_id, order_name, items}]`)에 넣습니다.
- `save()` — `groups`를 **순서대로 하나씩** `POST /api/lab/order/:id/results`로 보냅니다. 전부 성공하면 목록을 새로 불러오고 선택을 풉니다. 중간에 실패하면 alert만 띄우고 목록은 새로 부르지 않습니다(`Lab.jsx:71-82`).
- 목록은 화면을 열 때와 **↻** 를 누를 때만 불러옵니다. 주기적 새로고침은 없습니다.

### 3.2 참고치 표시

항목에 `ref_text`가 있으면 그것을, 없으면 숫자 하한·상한으로 만듭니다. `Lab.jsx:98`과 `LabResults.jsx:45-51`에 같은 규칙이 두 번 있습니다.

| ref_low | ref_high | ref_text | 표시 |
|---|---|---|---|
| 4.0 | 10.0 | — | `4.0~10.0` |
| 90 | — | — | `≥90` |
| — | 200 | — | `≤200` |
| (무엇이든) | | `Negative` | `Negative` (문자 우선) |

### 3.3 이상(high/low) 판정

같은 규칙이 **두 곳**에 있습니다 — 입력 중 글자색용 `Lab.jsx:11-17 flagOf()`, 저장할 때 DB에 남기는 `lab.routes.js:8-15 computeFlag()`.

1. 값을 `parseFloat`로 읽습니다. 숫자가 아니면(`Positive`, `++`, `<5` …) **판정 없음**(`''`).
2. 하한이 있고 값 < 하한 → `low`. 상한이 있고 값 > 상한 → `high`. (경계값과 같으면 정상)
3. 하한·상한이 둘 다 없으면 판정 없음(`''`), 아니면 `normal`.

- **`ref_text`(문자 참고치)는 판정에 쓰지 않습니다.** 말라리아 RDT에 `Positive`를 넣어도 이상 표시가 붙지 않습니다.
- **성별·나이를 보지 않습니다.** 참고치는 항목마다 한 벌뿐입니다(`lab_test_item`에 성별·나이 칸이 없음). 목록 API는 `gender`·`date_of_birth`를 내려주지만 판정에 쓰이지 않습니다.
- **단위를 보지 않습니다.** 단위는 표시용 글자일 뿐이고 변환이 없습니다.
- 저장된 `flag`는 **저장 당시의 참고치로 계산해 굳힌 값**입니다. 나중에 설정에서 참고치를 바꿔도 지난 결과의 표시는 바뀌지 않습니다. 이것은 의도에 맞습니다(그때의 기준으로 판정한 기록).
- 서버는 참고치를 `lab_test_item`에서 다시 읽지 않고 **화면이 보낸 값**(`req.body.results[].ref_low/ref_high`)으로 판정합니다(`lab.routes.js:155`).

### 3.4 결과 저장 — `POST /api/lab/order/:orderItemId/results`

한 트랜잭션에서(`lab.routes.js:125-177`):

1. 오더가 없으면 404, `code_type`이 `lab`이 아니면 400. (진료비·영상 오더를 여기서 완료로 바꾸지 못하게)
2. 값이나 비고가 하나라도 있는 줄만 남깁니다. 하나도 없으면 400 — 아무것도 안 넣은 검사가 「완료」로 보이지 않게.
3. 그 오더의 `lab_result`를 **전부 지우고**, 남긴 줄을 새로 넣습니다. 이전 값의 이력은 남지 않습니다.
4. `result_date`는 **내원일**(`visit.visit_date`)입니다. 실제 입력 시각은 `result_at`.
5. `order_item.status = 'completed'`, `result_at = NOW()`, `result_by = 입력자`.

### 3.5 결과 표 — `frontend/src/components/LabResults.jsx`

`GET /api/lab/patient/:patientId/results`를 받아 **패널 → 항목 → 날짜** 표로 그립니다.

- 열: 검사명 · 단위 · 참고치 · 날짜들(최근이 왼쪽).
- 패널은 `panel_name`(없으면 `panel_code`)으로, 항목은 **이름(`name`)** 으로 묶습니다. 단위·참고치는 그 항목의 **첫 행**(가장 최근 날짜)의 것을 씁니다(`LabResults.jsx:38-41`).
- 칸은 **날짜** 하나에 값 하나입니다(`byDate[날짜]`). 같은 날 같은 항목이 두 번 있으면 하나만 보입니다(7절 문제 8).
- `low` → 파랑 `▼값`, `high` → 빨강 `▲값`, 나머지 → 보통 글자.
- 읽기 전용입니다. 이 부품은 진료 화면(`Consultation.jsx:688`)에서도 그대로 쓰므로, 바꾸면 진료 화면도 바뀝니다.

### 3.6 검사항목이 정의되지 않은 패널

`GET /order/:id/items`는 패널에 `lab_test_item`이 하나도 없으면, 예전에 저장한 결과가 있으면 그것을, 없으면 **빈 배열**을 줍니다(`lab.routes.js:114-119`. 주석에는 「빈 줄 하나」라고 되어 있지만 코드는 빈 배열). 화면에는 「항목이 설정되지 않았습니다」만 나오고 **값을 넣을 칸이 없어서** 그 검사는 결과를 넣을 수 없습니다.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Lab.jsx` — 경로 `/lab`, 권한 `lab` (`modules.js:10`, `App.jsx:46`)
- `frontend/src/components/LabResults.jsx` — 진료 화면에서도 씀 (`Consultation.jsx:7, 688`)

### 서버 — `backend/src/routes/lab.routes.js` (`/api/lab`, `index.js:39`)

모든 요청은 로그인 필요(`authMiddleware`).

| 메서드 · 경로 | 권한 | 하는 일 |
|---|---|---|
| `GET /pending` | lab | 오늘(`visit_date = CURRENT_DATE`) 내원 + 진료 `completed` + 완료·취소 안 된 검사 오더가 있는 진료 목록. 진료 완료 시각 순 |
| `GET /completed` | lab | 오늘 내원 중 `completed` 된 검사 오더가 있는 진료 목록. 최근 결과 순 |
| `GET /visit/:visitId/orders` | lab | 한 내원의 검사 오더(취소 제외, 완료 포함). 없으면 `null`. 환자 찾기에서 씀 |
| `GET /order/:orderItemId/items` | lab | 한 오더의 입력 줄 — 패널 항목 정의 + 이미 넣은 값. `{order, has_master, items}` |
| `POST /order/:orderItemId/results` | lab | 결과 저장 + 오더 완료 (3.4절). 본문 `{results:[{lab_test_item_id,name,value,unit,ref_low,ref_high,ref_text,comment}]}` |
| `GET /patient/:patientId/results` | consultation 또는 lab | 환자의 모든 결과 + `panel_code`·`panel_name` |
| `GET /test-items?order_code_id=` | (로그인만) | 패널의 항목 정의. 없으면 전체 |
| `POST /test-items/save` | settings | 패널의 항목을 **전부 지우고 다시 넣음**. 본문 `{order_code_id, items:[…]}` |

목록 API 세 개의 한 줄 모양: `consultation_id, visit_id, visit_date, patient_id, chart_no, last_name, first_name, gender, date_of_birth, (allergies), doctor_name, lab_orders:[{order_item_id, order_code, order_name, order_code_id, status, (result_at)}]`

### 공용 부품

- 설정 화면(`Settings.jsx`)의 **🧫 검사항목** 탭 (`activeTab === 'labitems'`, `Settings.jsx:533-569`, 상태·함수 `:29-30, 79-104`) — 이 탭 안은 임상병리 몫
- `PatientFinder`(`mode="visit"`) — 접수 세션 주관
- `DocumentModal`(`category="chart"`, 읽기 전용) — 진료 세션 주관

### DB 테이블

`backend/sql/014_lab.sql`에서 만들고 L01~L08 기본 항목을 넣습니다. **같은 두 테이블이 `001_schema.sql:391-425`에도 들어 있습니다**(새로 설치할 때는 001이 만들고 014의 `IF NOT EXISTS`는 건너뜀).

**`lab_test_item`** — 패널별 항목 정의(마스터)

| 컬럼 | 타입 | 뜻 |
|---|---|---|
| `id` | SERIAL | |
| `order_code_id` | INT NOT NULL → `order_code(id)` **ON DELETE CASCADE** | 어느 패널의 항목인지 |
| `name` | VARCHAR(120) | 항목 이름 |
| `unit` | VARCHAR(30) | 단위(표시용 글자) |
| `ref_low` / `ref_high` | NUMERIC | 숫자 참고치 하한·상한. 한쪽만 있어도 됨 |
| `ref_text` | VARCHAR(60) | 문자 참고치(예: `Negative`). 판정에는 안 씀 |
| `sort_order` | INT | 표시 순서 |

**`lab_result`** — 입력한 결과. 참고치·단위를 **입력 당시 값으로 복사**해 둡니다.

| 컬럼 | 타입 | 뜻 |
|---|---|---|
| `order_item_id` | INT NOT NULL → `order_item(id)` **ON DELETE CASCADE** | 어느 오더의 결과인지 |
| `lab_test_item_id` | INT → `lab_test_item(id)` **ON DELETE SET NULL** | 어느 항목 정의에서 왔는지 |
| `visit_id` · `patient_id` | INT | |
| `name` · `unit` · `ref_low` · `ref_high` · `ref_text` | | 입력 당시의 항목 정보 복사본 |
| `value` | VARCHAR(60) | 결과값 — **글자로 저장**(숫자 아님) |
| `flag` | VARCHAR(10) | `low` / `high` / `normal` / `''` |
| `comment` | TEXT | 비고 |
| `result_date` | DATE | **내원일** |
| `result_by` · `result_at` | | 입력자 · 입력 시각 |
| `sort_order` | INT | |

**함께 쓰는 남의 테이블**

- `order_code` — `code_type = 'lab'` 인 코드가 곧 검사 패널. 기본 L01 CBC · L02 Fasting Glucose · L03 Lipid Panel · L04 Malaria RDT · L05 HbA1c · L06 Urinalysis · L07 Liver Function · L08 Kidney Function (`003_seed_data.sql:37-44`)
- `order_item` — 검사 오더. 임상병리가 쓰는 칸: `status`(`ordered` → `completed`), `result_at`, `result_by`. `worklist_status`는 영상용이라 검사 오더에서는 뜻이 없습니다(5절).

### 기본 항목과 참고치 (`014_lab.sql:44-51`) — 성별·나이 구분 없음

| 패널 | 항목 (단위, 참고치) |
|---|---|
| L01 CBC | WBC (10^9/L, 4.0–10.0) · RBC (10^12/L, 4.0–5.5) · Hb (g/dL, 13.0–17.0) · Hct (%, 40–50) · Platelet (10^9/L, 150–400) |
| L02 Fasting Glucose | Glucose (FBS) (mg/dL, 70–100) |
| L03 Lipid Panel | Total Cholesterol (mg/dL, 0–200) · Triglycerides (mg/dL, 0–150) · HDL (mg/dL, 40–60) · LDL (mg/dL, 0–130) |
| L04 Malaria RDT | Malaria RDT (문자 `Negative`) |
| L05 HbA1c | HbA1c (%, 4.0–5.6) |
| L06 Urinalysis | pH (5.0–8.0) · Protein · Glucose · Leukocytes · Blood (모두 문자 `Negative`) |
| L07 Liver Function | AST · ALT (U/L, 5–40) · ALP (U/L, 40–130) · Total Bilirubin (mg/dL, 0.1–1.2) · Albumin (g/dL, 3.5–5.0) |
| L08 Kidney Function | Creatinine (mg/dL, 0.6–1.2) · BUN (mg/dL, 7–20) · Uric Acid (mg/dL, 3.5–7.2) · eGFR (mL/min, ≥90) |

이 값들은 설정 화면에서 바뀌었을 수 있습니다. 병원에서 실제로 쓰는 값은 **확인 필요**.

## 5. 다른 모듈과의 연결

```
진료 (Consultation.jsx)                   임상병리 (Lab.jsx)                      진료 · 검사실
───────────────────────                   ─────────────────                      ──────────────
lab 오더 코드 추가                          결과 대기 목록                           🧪 검사결과
POST /api/consultations/:id/orders ──▶   (오늘 · 진료 완료 · 미완료 오더) ──▶     LabResults
 → order_item(code_type='lab',            결과 입력 → 저장                         (날짜×항목 표)
    status='ordered')                     POST /api/lab/order/:id/results
진료 완료                                  → lab_result 행
PUT /api/consultations/:id/complete        → order_item.status='completed'
 → consultation.status='completed'
```

- **오더가 검사실에 보이는 조건**: `consultation.status = 'completed'` **이고** `visit.visit_date = 오늘`. 의사가 진료를 완료하기 전에는 검사실 대기 목록에 뜨지 않습니다. 약국 대기 목록(`pharmacy.routes.js:51`)과 같은 규칙입니다.
- **「오늘」** 은 DB의 `CURRENT_DATE`이고, DB 컨테이너는 `TZ`(기본 `Indian/Antananarivo`)로 돕니다(`docker-compose.yml:17-18`). 다른 모듈과 같은 방식.
- **진료 화면에서 결과 보기**: 진료 화면 위쪽의 **🧪 검사결과** 버튼(`Consultation.jsx:396`)이 `LabResults`를 큰 창으로 엽니다. 결과가 나왔다는 알림이나 표시는 없습니다.
- **진료 화면의 오더 줄 상태 칸**은 `order_item.worklist_status`를 보여주는데(`Consultation.jsx:524`), 검사 오더는 만들 때 이 값이 `completed`로 들어갑니다(`consult.routes.js:245` — 영상 워크리스트를 쓰지 않는 오더는 `completed`). 그래서 **검사실이 결과를 넣기 전부터 「completed」로 보입니다**(7절 문제 9).
- **진료에서 오더를 지우면**(`DELETE /api/consultations/order/:id`, `consult.routes.js:295-302`) `lab_result`가 CASCADE로 **함께 지워집니다.** 결과가 이미 있어도 막지 않습니다(7절 문제 3).
- **수납**: 청구 항목은 수납이 그 내원의 `order_item`을 상태와 관계없이 전부 읽어 만듭니다(`billing.routes.js:122-124`). 검사 결과를 넣었는지와는 관계가 없습니다. 진료에서 오더를 지우면 청구에서도 빠집니다.
- **통계**: 검사 관련 통계는 없습니다.

## 6. 설정 항목

설정 → **🧫 검사항목** 탭 (`Settings.jsx:533-569`). 권한 `settings`.

- **검사 패널 고르기** — `code_type = 'lab'`이고 사용 중(`is_active`)인 오더 코드 목록. 오더 코드 탭에서 지운 코드는 비활성화만 되므로(`admin.routes.js:158`) 목록에서 사라지고 항목·결과는 남습니다.
- **+ 새 검사 패널** — `POST /api/admin/order-codes`로 `code_type:'lab'`, `group_name:'Lab'`, `price = price_clinic = 입력값`인 오더 코드를 만들고 바로 그 패널을 엽니다. 진료실 오더 목록에도 바로 나타납니다.
- **항목 표** — 이름 · 단위 · 하한 · 상한 · 문자 참고치. **저장** 은 `POST /api/lab/test-items/save` — 그 패널의 항목을 **모두 지우고 화면의 순서대로 새로 넣습니다.** 이름이 빈 줄은 버립니다. 항목 `id`가 매번 새로 바뀝니다(7절 문제 1).
- 성별·나이별 참고치, 단위 선택, 결과 형식(숫자/양음성/선택지) 같은 설정은 **없습니다.**

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것입니다. **아직 하나도 고치지 않았습니다.** 실행해서 재현한 것은 아니고, 코드와 `parseFloat` 동작(node로 확인)만으로 판단했습니다.

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| 1 | **높음** | **설정에서 검사항목을 저장하면 이미 넣은 결과가 입력 화면에서 사라짐 → 다시 저장하면 영구 삭제.** 항목 저장이 전부 지우고 새로 넣어서 `id`가 바뀌고, `lab_result.lab_test_item_id`는 NULL이 됨. 입력 화면은 이 `id`로 이전 값을 찾으므로 빈칸으로 보이고, 그 상태로 한 칸만 고쳐 저장하면 나머지 값은 지워짐. 오타 하나 고친 것으로도 생김 | `lab.routes.js:215`, `:102`, `:106-112`, `:152` · `014_lab.sql:21` |
| 2 | **높음** | **쉼표 소수점(프랑스식) 판정 오류.** `parseFloat("1,5") = 1`. 크레아티닌 `1,5`는 정상, 빌리루빈 `1,8`도 정상으로 판정됨(실제는 높음). `12 000`은 12로 읽힘. 현장 직원이 프랑스어 사용자라 쉼표를 쓸 가능성이 큼 | `lab.routes.js:9` · `Lab.jsx:12` |
| 3 | **높음** | **진료 화면에서 검사 오더 ✕ 를 누르면 결과까지 지워짐**(경고 없음, CASCADE). 결과가 나온 오더를 막지 않음. 진료 세션 파일 | `consult.routes.js:295-302` · `Consultation.jsx:514` · `014_lab.sql:20` |
| 4 | **높음 (의학 판단)** | **참고치가 성별·나이를 구분하지 않음.** 기본값 Hb 13–17, Hct 40–50, Uric Acid 3.5–7.2, Creatinine 0.6–1.2 는 성인 남성 기준 → 정상 여성·소아 다수가 ▼/▲. 소아 ALP·WBC 등도 성인 기준. HDL 60 초과가 빨간 ▲(높은 HDL은 좋은 것). 구조상 한 항목에 참고치가 한 벌뿐 | `014_lab.sql:44-51` · `lab_test_item` 정의 |
| 5 | **보통 (확인 필요)** | **단위.** 기본 단위가 mg/dL(혈당·크레아티닌·콜레스테롤)인데, 프랑스어권 검사실은 g/L·mmol/L·µmol/L를 많이 씀. 장비가 다른 단위로 찍으면 값이 전부 낮음으로 나옴. 설정에서 단위를 바꾸면 결과 표는 **이름으로만** 묶어서 옛 값(옛 단위)과 새 값이 한 줄에 섞이고 단위 칸은 최근 것만 보임 | `014_lab.sql:45-51` · `LabResults.jsx:38-41` |
| 6 | 보통 | **전체 저장이 중간에 멈추면 반쯤 저장됨.** 검사를 순서대로 저장하다 값 없는 검사에서 400이 나면 앞 검사는 이미 완료, 뒤는 미저장, 화면은 새로고침 안 됨. 오류 문구는 서버 영어 그대로. 중간 저장(완료 안 하고 일부만 저장)도 없음 | `Lab.jsx:71-82` · `lab.routes.js:147-150` |
| 7 | 보통 | **대기 목록 조건이 좁음.** ① 의사가 진료를 「완료」해야 보임 — 검사 먼저 하고 결과 보고 진료를 끝내는 흐름이면 검사실에 안 뜸. ② 오늘 내원만 보임 — 어제 받은 검체는 목록에서 사라지고 환자 찾기로만 찾을 수 있음 | `lab.routes.js:35`, `:58` |
| 8 | 보통 | **결과 표가 같은 날 두 번 한 검사를 하나만 보여줌.** 칸이 날짜 하나에 값 하나라 나중 것이 앞 것을 덮음(재검 등) | `LabResults.jsx:42` |
| 9 | 보통 | **진료 화면이 결과 전부터 검사 오더를 「completed」로 보여줌.** 영상 워크리스트 상태 칸을 보여주는데 검사 오더는 처음부터 `completed`. 진료 세션 파일 | `consult.routes.js:245` · `Consultation.jsx:524` |
| 10 | 보통 | **결과 수정 이력이 없음.** 다시 저장하면 이전 값을 지우고 새로 넣고, 입력자도 덮어씀. 누가 언제 무엇을 바꿨는지 남지 않음 | `lab.routes.js:152` |
| 11 | 보통 | **프랑스어 화면에 한국어가 나옴.** 번역 키가 없어 코드 안의 한국어 기본 문구가 그대로 뜸: `labSelectHint`, `labNoPending`, `labNoCompleted`, `labNoMaster`(Lab.jsx), `labItemsHint`, `labPickPanel`(설정 탭). 번역은 영어로 대체되지 않음(`i18n/index.jsx`) | `Lab.jsx:91, 132, 148, 167` · `Settings.jsx:535, 568` |
| 12 | 보통 (의학 판단) | **문자 결과는 판정하지 않음.** 말라리아 RDT·요검사에 `Positive`를 넣어도 이상 표시 없음. `<5`, `>500` 같은 값도 판정 없음 | `lab.routes.js:9-10` |
| 13 | 낮음 | 항목이 정의되지 않은 패널은 결과를 넣을 칸이 없음(3.6절). 새 패널을 만들고 항목 정의 전에 오더가 나가면 검사실이 완료 처리 불가 | `lab.routes.js:114-119` |
| 14 | 낮음 | 판정 규칙이 화면(`flagOf`)·서버(`computeFlag`) 두 곳에, 참고치 표시가 두 곳에 따로 있음. 한쪽만 고치면 화면 색과 저장된 표시가 달라짐 | `Lab.jsx:11-17, 98` · `lab.routes.js:8-15` · `LabResults.jsx:45-51` |
| 15 | 낮음 | 서버가 판정할 때 참고치를 DB에서 읽지 않고 화면이 보낸 값을 믿음 | `lab.routes.js:155` |
| 16 | 낮음 | 검사 탭을 빠르게 바꾸면 늦게 온 응답이 화면을 덮을 수 있음(요청 순서 보장 없음) | `Lab.jsx:54-64` |
| 17 | 낮음 | 결과 표 첫 열에 `left:0`만 있고 `position: sticky`가 없어 가로 스크롤 때 검사명이 고정되지 않음 | `LabResults.jsx:67, 79` |
| 18 | 낮음 | 목록 자동 새로고침 없음 — 진료가 끝나도 ↻ 를 눌러야 보임 | `Lab.jsx:32` |

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 위키 첫 작성 — 실제 코드 기준 현황·문제 목록 (코드 변경 없음) | `1724740` |
