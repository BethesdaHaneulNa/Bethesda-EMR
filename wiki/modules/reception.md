# 접수 (Reception)

> **담당**: 접수 세션 · 브랜치 `session/reception` · **마지막 갱신**: 2026-09-29 · **상태**: 현황 파악 완료 — 코드는 아직 안 고침. 7절 문제 목록을 두고 실장님 결정 대기

## 1. 이 모듈이 하는 일

병원에 온 환자가 가장 먼저 거치는 곳입니다.

- **환자 등록** — 처음 온 환자의 인적사항을 입력하면 **차트번호**(`26-00001` 형식)가 자동으로 붙습니다. 이 번호는 진료·수납·약국·검사·영상(PACS)이 모두 환자를 가리킬 때 씁니다.
- **내원 접수** — 오늘 온 환자를 담당 의사에게 배정하고 주호소·접수 메모를 적어 **대기 목록**에 올립니다. 이렇게 만들어지는 **내원(visit)** 한 건이 그날의 진료·처방·검사·청구가 모두 매달리는 중심 기록입니다.
- **대기 관리** — 오늘 접수된 환자를 대기 / 진료중 / 완료로 나눠 보여주고, 상태를 손으로 옮기거나 대기를 취소합니다.
- 환자를 고르면 **이전 진료 기록**, **미수금·환불예정 금액**, **차트뷰어**(발행된 수술기록지 등)를 함께 보여줍니다.
- 다섯 화면(접수·진료·수납·약국·임상병리)이 같이 쓰는 **환자 찾기 창**(`PatientFinder`)을 주관합니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 괄호 안은 프랑스어 화면의 이름입니다.
> 화면은 세 칸입니다 — **왼쪽** 환자 정보와 접수 입력, **가운데** 이전 진료 기록, **오른쪽** 오늘 대기 목록.

### 처음 온 환자 접수하기

1. 먼저 이미 등록된 환자가 아닌지 확인합니다. 왼쪽 위 **기존 환자 검색**(Rechercher patient) 칸에 이름이나 전화번호를 넣고 **Enter**.
2. 목록에 없으면 **+ 신규 환자 입력**(+ Nouveau patient)을 누릅니다.
3. **성**(Nom), **이름**(Prénom)을 넣습니다. 둘 다 있어야 저장됩니다.
4. **생년월일**(Date de Naissance) — 연도 4자리, 월 2자리, 일 2자리 순으로 칩니다. 칸을 다 채우면 다음 칸으로 저절로 넘어갑니다. (예: `1990` `05` `03`)
5. **성별**(Sexe) — **남**(Masculin) / **여**(Féminin) 중 하나를 누릅니다. ⚠ 처음에는 「남」이 골라져 있으니 여자 환자는 꼭 「여」를 누르세요.
6. **전화번호**(Téléphone), **혈액형**(Groupe Sanguin), **알레르기**(Allergies)는 아는 만큼 넣습니다.
7. 늘 기억해야 할 사항(예: 「보호자 동반 필요」)은 노란 칸 **📌 접수과 메모**(Note d'accueil)에 적습니다. 이 메모는 환자에게 계속 붙어 다닙니다.
8. 아래 **진료과 / 담당의사**(Service / Médecin)에서 의사를 고릅니다. 진료과는 그 의사의 소속과로 자동으로 정해집니다.
9. **주호소**(Motif)와, 오늘 접수에만 해당하는 **접수 메모**(Mémo Réception)를 적습니다.
10. 파란 **접수 / 대기 등록**(Enregistrer / Mettre en attente) 버튼을 **한 번만** 누릅니다. 차트번호가 표시된 확인 창이 뜨면 끝입니다. 환자가 오른쪽 **대기** 목록에 나타납니다.

> ⚠ 버튼을 누르고 확인 창이 바로 안 떠도 **다시 누르지 마세요.** 지금은 두 번 누르면 같은 환자가 두 번 등록될 수 있습니다. (7절 ③)

### 다시 온 환자 접수하기

1. **기존 환자 검색** 칸에서 찾거나, 옆의 **🔍 환자 찾기**(Trouver patient) 버튼으로 찾기 창을 엽니다.
2. 목록에서 환자를 누르면 왼쪽에 인적사항이, 가운데에 이전 진료 기록이 나옵니다. 미수금이 있으면 가운데 위에 빨간 **미수**(Dû), 돌려줄 돈이 있으면 파란 **환불예정**(Rembours.)이 보입니다.
3. 바뀐 인적사항이 있으면 고칩니다.
4. 의사·주호소·메모를 넣고 **접수 / 대기 등록**을 누릅니다.

### 인적사항만 고치기 (접수 없이)

환자를 고른 뒤 고치고 **💾 환자 정보 저장**(Enregistrer le patient)을 누릅니다. 대기 목록에는 올라가지 않습니다.

### 대기 목록 보기와 상태 옮기기

- 오른쪽 위 **대기**(En Attente) / **진료중**(En cours) / **완료**(Terminé) 탭으로 나눠 봅니다. 괄호 안 숫자가 사람 수입니다.
- **대기목록 검색**(Rechercher dans la file) 칸에 이름이나 차트번호 일부를 치면 걸러집니다.
- 각 환자 아래 작은 버튼으로 상태를 옮깁니다: **완료로 →**(Terminer →), **← 대기로**(← En attente).
  - 의사가 진료를 시작하면 「진료중」으로, 진료를 마치면 「완료」로 **저절로** 바뀝니다. 손으로 옮기는 것은 예외적인 경우에만 쓰세요.
  - 「완료」가 된 환자는 수납 화면의 수납 대기 목록에 나타납니다.
- 이 목록은 저절로 새로고침되지 않습니다. 다른 버튼을 누르거나 화면을 새로 열어야 최신 상태가 됩니다.

### 접수 내용 고치기 / 대기 취소

1. 오른쪽 목록에서 환자를 누르면 왼쪽에 그 접수 내용이 채워지고, 파란 버튼이 **접수 정보 수정**(Modifier l'enregistrement)으로 바뀝니다.
2. 고친 뒤 그 버튼을 누릅니다.
3. 대기 중인 환자는 빨간 **대기 취소 / 목록에서 빼기**(Annuler l'attente / Retirer) 버튼이 보입니다. ⚠ 지금은 이 버튼이 오류를 내고 취소되지 않습니다. (7절 ①)

### 차트뷰어

환자를 고르면 **📋 차트뷰어**(Dossier (vue)) 버튼이 나옵니다. 그 환자에게 발행된 차트 기록(수술기록지 등)을 읽기 전용으로 봅니다.

## 3. 기능 상세

### 화면 상태 (`Registration.jsx`)

| 상태 | 뜻 |
|---|---|
| `selectedPatient` | 왼쪽에 올라온 환자. `id`가 있으면 기존 환자, 없으면 신규 입력 중 |
| `sel` | 오른쪽 대기 목록에서 고른 **내원**. 있으면 파란 버튼이 「접수 정보 수정」이 됨 |
| `form` | 환자 인적사항 입력값 (camelCase). `nationalId` `mobile` `address` `city` `region`은 **화면에 입력 칸이 없지만** 상태에는 있음 |
| `visitForm` | 내원 입력값 — `department` `doctor` `visitType` `chiefComplaint`. 접수 메모는 별도 `memo` 상태 |
| `visits` | `/visits/today` 결과 전체. 탭·검색은 화면에서 거름 (`filteredVisits`) |
| `patBal` | `/billing/patient/:id/balance` 결과 `{owed, refund}` |

### 흐름

- **환자 고르기** — 검색 결과나 환자 찾기 창에서 고르면 `fillPatient(p)`: 환자 행 전체로 `form`을 채우고 `sel`을 비우고 `/patients/:id/history`로 이전 진료를 불러옴.
- **대기 목록에서 고르기** — `selectVisit(v)`: `/visits/today` 행으로 `form`·`visitForm`을 채움. 이 행에는 `national_id` `mobile` `address` `city` `region`이 없어서 **빈 문자열로 채워짐** (7절 ⑤).
- **💾 환자 정보 저장** — `savePatientOnly()`: `selectedPatient.id`가 있으면 `PUT /patients/:id`, 없으면 `POST /patients`. 화면에서는 성·이름 둘 다 요구.
- **접수 / 대기 등록 · 접수 정보 수정** — `createOrUpdateVisit()`:
  1. 신규면 `POST /patients` (차트번호 생성). 기존이면 `PUT /patients/:id`로 인적사항도 저장하는데 **실패해도 조용히 넘어감** (`catch (e) {}`).
  2. `sel`이 있으면 `PUT /visits/:id` (이때 `status: sel.status`도 같이 보냄 — 7절 ②), 없으면 `POST /visits`.
  3. 목록 다시 불러오고 입력칸을 비움 (`startNewPatient()`).
- **상태 버튼** — `changeStatus()` → `PUT /visits/:id/status`. 화면에서 허용하는 이동: 대기→완료, 진료중→대기, 진료중→완료, 완료→대기.
- **대기 취소** — `cancelVisit()` → `PUT /visits/:id/status` `{status:'canceled'}` — 철자가 틀려 서버가 400으로 거절 (7절 ①).
- **진료과** — 의사를 고르면 `doctors` 목록에서 그 의사의 `department_id`를 찾아 `visitForm.department`에 넣음. 진료과만 따로 고르는 칸은 없음. `depts`(`/admin/departments`)는 불러오지만 쓰지 않음.
- **내원구분** — 제목에는 「진료과 / 내원구분」이라고 되어 있지만 **고르는 칸이 없음**. 새 접수는 항상 `newVisit`. 첫 커밋(`e553fef`)부터 이랬음. 진료비 종류는 수납 화면에서 바꾸고 그 값이 `PUT /visits/:id`로 내원에 다시 저장됨 (`Payment.jsx` 187·220행).

### 대기 탭과 내원 상태

| 탭 | 들어가는 `visit.status` |
|---|---|
| 대기 | `waiting`, `registered` |
| 진료중 | `in_progress` |
| 완료 | `completed` |
| (안 보임) | `cancelled` |

### 차트번호 채번

- DB 함수 `generate_chart_no()` (`001_schema.sql` 329~338행): `TO_CHAR(NOW(),'YY') || '-' || LPAD(nextval('chart_no_seq'), 5, '0')`.
- **연도 앞자리만 바뀌고 번호는 해마다 이어집니다** (시퀀스를 매년 1로 돌리지 않음). 2026년 마지막이 `26-00350`이면 2027년 첫 환자는 `27-00351`. 의도한 것인지는 **확인 필요**.
- `POST /patients`에서 함수로 번호를 먼저 받고 INSERT함. 실패하면 번호가 하나 비지만 중복은 안 생김.
- 번호는 화면에서 고칠 수 없음 (읽기 전용 칸). `PUT /patients/:id`도 `chart_no`를 바꾸지 않음.

### 환자 찾기 창 (`PatientFinder.jsx`, 공용)

- `mode='patient'`: 환자를 누르면 `onPickPatient(p)` 호출하고 닫힘. 접수·약국이 씀.
- `mode='visit'`(기본): 환자를 누르면 `/visits/patient/:id`로 그 환자의 모든 내원을 날짜 역순으로 보여주고, 내원을 누르면 `onPickVisit(v)`. 진료(2곳)·수납·임상병리가 씀.
- `initialPatient`를 주면 검색을 건너뛰고 바로 그 환자의 내원 목록을 엶 (진료 화면의 이력 보기).
- 내원 목록의 수납 상태 표시: `paid` `partial` `unpaid` `waived` `cancelled`, 청구가 없으면 「미수납」. 한 내원에 청구가 여러 개면 취소 안 된 최신 것 하나(`visit.routes.js` 46~50행).
- 검색어 없이 **검색**을 누르면 최근 등록 환자 50명이 나옴.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Registration.jsx` — 접수 화면 전체 (`DobInput` 생년월일 입력 부품 포함)

### 서버

- `backend/src/routes/patient.routes.js` (`/api/patients`)
- `backend/src/routes/visit.routes.js` (`/api/visits`)
- 둘 다 `authMiddleware`만 씀 — 로그인만 되어 있으면 모듈 권한과 상관없이 호출 가능.
- 입력 검사: `backend/src/utils/validate.js`의 `badPatient`, `VISIT_TYPES`, `VISIT_STATUSES` (공용 파일, 총괄 소관)

| 메서드 · 경로 | 하는 일 | 부르는 곳 |
|---|---|---|
| `GET /api/patients?q=&limit=&offset=` | 검색. `chart_no` `last_name` `first_name` `national_id` `phone` `mobile` `CONCAT(last_name,' ',first_name)`에 `ILIKE %q%`. `is_active=true`만. 최근 등록순. 기본 50건 | 접수, PatientFinder |
| `GET /api/patients/:id` | 환자 한 명 | DocumentModal |
| `GET /api/patients/chart/:chartNo` | 차트번호로 찾기 | 프론트에서 부르는 곳 없음 (확인함) |
| `POST /api/patients` | 등록. 차트번호 자동. `badPatient` 검사 (성·이름 **둘 중 하나**만 있으면 통과) | 접수 |
| `PUT /api/patients/:id` | 수정. `reception_note` 외 모든 칸을 **보낸 값으로 덮어씀**. `reception_note`만 `undefined`면 유지 | 접수 |
| `GET /api/patients/:id/history` | 그 환자의 `consultation` 목록 + 과·의사 이름 | 접수, 진료, PatientChart |
| `GET /api/patients/:id/billing-history` | 그 환자의 `billing` 목록 | 프론트에서 부르는 곳 없음 (확인함) |
| `GET /api/visits/today?status=&doctor_id=&department_id=` | 오늘(`visit_date = CURRENT_DATE`) 내원 + 환자·과·의사. 접수시각순 | 접수, 진료(15초마다) |
| `GET /api/visits/patient/:patientId` | 그 환자의 모든 내원 + 대표 청구 1건 | PatientFinder |
| `POST /api/visits` | 접수. `visit_type` 검사함. `status='waiting'`, `reception_time`은 서버 시각 `HH:MM`, `registered_by`는 로그인 직원 | 접수 |
| `PUT /api/visits/:id/status` | 상태만 변경. `VISIT_STATUSES` 검사 | 접수 |
| `PUT /api/visits/:id` | 수정. 모든 칸 `COALESCE` — **보낸 값이 null이면 기존 값 유지**. `visit_type`·`status` 검사 **없음** | 접수, 수납(`visit_type`만) |

### 공용 부품

- `frontend/src/components/PatientFinder.jsx` — 공용, **접수 주관**. 쓰는 곳: `Registration.jsx` 418행, `Pharmacy.jsx` 231행 (`mode="patient"`), `Consultation.jsx` 669·671행, `Payment.jsx` 449행, `Lab.jsx` 183행 (`mode="visit"`).
- 접수가 쓰는 남의 공용 부품: `DocumentModal.jsx`(진료 주관) — `category="chart" readOnly`로 차트뷰어. `TopBar.jsx`(총괄).

### DB 테이블

**`patient`** (`001_schema.sql` 52~73행, `reception_note`는 `008_patient_note.sql`에서도 `IF NOT EXISTS`로 추가)

| 컬럼 | 형 | 비고 |
|---|---|---|
| `id` | SERIAL PK | |
| `chart_no` | VARCHAR(20) UNIQUE NOT NULL | `generate_chart_no()`. DICOM 워크리스트의 PatientID로 나감 |
| `last_name` / `first_name` | VARCHAR(100) NOT NULL | 빈 문자열은 들어갈 수 있음 |
| `national_id` | VARCHAR(50) | 화면 입력 칸 없음 |
| `date_of_birth` | DATE | 미래·1875년 이전은 서버가 거절 |
| `gender` | VARCHAR(1) CHECK `M`,`F` | `validate.js`는 `O`도 허용 → DB가 거절 (7절 ⑬) |
| `phone` / `mobile` | VARCHAR(50) | 화면은 `phone`만 입력 |
| `address` / `city` / `region` | TEXT / VARCHAR(100) | 화면 입력 칸 없음. 문서 양식은 `address`를 인쇄함 |
| `blood_type` | VARCHAR(5) | 화면: A± B± AB± O± |
| `allergies` | TEXT | 진료 화면에 빨간 경고로 뜸 |
| `reception_note` | TEXT | 접수과 메모 (환자에 영구히 붙음) |
| `is_active` | BOOLEAN DEFAULT TRUE | 검색에서만 걸러냄. **끄는 곳이 없음** |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

색인: `idx_patient_chart(chart_no)`, `idx_patient_name(last_name, first_name)`. 시퀀스 `chart_no_seq`.

**`visit`** (`001_schema.sql` 76~94행)

| 컬럼 | 형 | 비고 |
|---|---|---|
| `id` | SERIAL PK | `consultation` `order_item` `billing` `document_log` `lab_result`가 참조 |
| `patient_id` | FK → patient NOT NULL | |
| `visit_date` | DATE DEFAULT CURRENT_DATE | DB 시간대(`PGTZ`, `.env`의 `TZ`) 기준 날짜 |
| `visit_type` | VARCHAR(20) DEFAULT `newVisit` | `newVisit` `followUp` `emergency` `referral` `none` — 수납 진료비 `C01`~`C04`, `none`은 진료비 없음. 모르는 값은 `C01`로 계산됨 |
| `department_id` | FK → department | 통계의 진료과별 내원·매출 기준 |
| `doctor_id` | FK → staff | |
| `reception_time` | TIME | 백엔드 컨테이너 시각(`TZ`) `HH:MM` |
| `chief_complaint` / `reception_memo` | TEXT | |
| `status` | CHECK `registered` `waiting` `in_progress` `completed` `cancelled` | 기본값 `registered`지만 API는 `waiting`으로 만듦 |
| `registered_by` | FK → staff | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**내원 상태를 바꾸는 곳**

| 누가 | 무엇으로 | 어디 |
|---|---|---|
| 접수 | → `waiting` (생성), 손으로 옮기기, 취소 | `visit.routes.js` |
| 진료 | 진료 시작 → `in_progress`, 진료 완료 → `completed` | `consult.routes.js` 35·42·84행 |
| 수납 | 상태는 안 바꿈. `completed`인 내원만 수납 대기에 올림 | `billing.routes.js` 38·56행 |

## 5. 다른 모듈과의 연결

- **진료** — `/visits/today`를 15초마다 읽어 대기 환자를 보여줌. 환자를 열면 내원이 `in_progress`, 완료하면 `completed`. 진료 화면의 알레르기 경고는 접수에서 넣은 `patient.allergies`. `consultation.visit_id`로 내원에 매달림 (내원 하나에 진료 하나 — `idx_consult_visit_unique`).
- **수납** — `status='completed'`인 내원이 수납 대기에 뜸. 진료비는 `visit.visit_type`으로 정해지고, 수납 화면에서 바꾸면 `PUT /visits/:id`로 내원에 다시 씀. 접수 화면의 미수·환불예정 배지는 `/billing/patient/:id/balance`.
- **약국 · 임상병리** — 환자 찾기 창(`PatientFinder`)과 `chart_no`로 환자를 찾음. 검사 결과는 `lab_result.visit_id`로 내원에 붙음.
- **PACS** — 워크리스트가 `patient.chart_no`를 DICOM **PatientID**로, `date_of_birth`·`gender`를 그대로 장비에 보냄 (`worklist.routes.js` 70·85행, `pacs.routes.js` 159행). 차트번호가 바뀌면 영상과 환자의 연결이 끊어집니다.
- **통계** — `visit`를 날짜 범위로 세서 총 내원, 신환(`newVisit`)/재진(`followUp`)/기타, 상태별, 진료과별, 의사별, 월별 추이를 냄 (`stats.routes.js` 28~55·146행). 접수에서 내원구분을 못 고르므로 **수납 전까지는 전부 신환으로 잡힘** (7절 ⑦).
- **문서** — `DocumentModal`이 `/patients/:id`로 환자 정보를 받아 인쇄 양식 머리에 넣음 (주소·전화 포함).
- **설정** — 담당의사 목록은 `/admin/doctors`(`role='doctor'`이고 `active`인 직원), 진료과는 직원의 소속과(`staff.department_id`). 설정 화면 직원 탭에서 정합니다.

## 6. 설정 항목

접수 전용 설정은 **없음**. 접수 화면이 기대는 다른 설정:

- **설정 → 직원**: 역할이 `doctor`이고 활성인 직원만 담당의사 목록에 나옴. 직원의 소속 진료과가 접수 때 진료과로 들어감 — 소속과가 없으면 진료과 없이 접수됨.
- **설정 → 오더 코드**: 진료비 `C01`(신환) `C02`(재진) `C03`(응급) `C04`(의뢰) 가격 — 수납이 `visit_type`으로 고름.
- **`.env`의 `TZ`**: 「오늘」의 기준. DB(`PGTZ`)와 백엔드가 같은 값을 써야 `visit_date`와 `reception_time`이 맞음. `docker-compose.yml`은 `.env`에 `TZ`가 없으면 DB는 `UTC`, 백엔드는 `Indian/Antananarivo`로 **서로 다르게** 기본값을 잡음 — 설치 스크립트가 `.env`에 `TZ`를 넣으므로 보통은 문제없음.

## 7. 알려진 문제 · 제약

2026-09-29 접수 세션이 코드를 읽고 찾은 것. **아직 하나도 고치지 않았습니다.** 「재현」 칸이 「코드」인 것은 코드를 읽어서 확인했고 화면으로는 아직 안 눌러 봤습니다.

| # | 심각도 | 문제 | 근거 | 재현 |
|---|---|---|---|---|
| ① | **높음** | **대기 취소 버튼이 항상 실패한다.** 화면이 `'canceled'`(l 하나)를 보내는데 서버·DB는 `'cancelled'`만 받음 → 400 오류 창. 대기 취소를 화면에서 할 방법이 없음 | `Registration.jsx:233` · `validate.js` `VISIT_STATUSES` · `001_schema.sql:87` | 코드 |
| ② | **높음** | **「접수 정보 수정」이 옛 상태값으로 덮어쓴다.** 대기 목록에서 고른 순간의 `sel.status`를 같이 보냄. 그 사이 의사가 진료를 끝냈으면(`completed`) 다시 `waiting`으로 돌아가 **수납 대기 목록에서 빠지고** 진료 대기에 다시 뜸. 접수 화면은 자동 새로고침이 없어 이런 틈이 김 | `Registration.jsx:208` · `visit.routes.js:109` · `billing.routes.js:56` | 코드 |
| ③ | 보통 | **같은 신규 환자가 두 번 등록될 수 있다.** 버튼 연타를 막지 않음. 또 환자 생성은 됐는데 내원 생성이 실패하면, 만든 환자를 기억하지 않아 다시 누를 때 새 환자를 또 만듦. 서버에도 같은 이름·생년월일 확인이 없음 | `Registration.jsx:179-187,331` · `patient.routes.js:55-72` | 코드 |
| ④ | 보통 | 같은 환자를 같은 날 두 번 접수해도 경고가 없다 (진료·청구도 두 건이 됨) | `visit.routes.js:62-82` | 코드 |
| ⑤ | 보통 (잠재) | **대기 목록에서 고른 환자를 저장하면 `national_id` `mobile` `address` `city` `region`이 빈 값으로 덮인다.** `/visits/today`가 이 칸들을 안 주는데 화면은 빈 문자열로 채워 `PUT /patients`로 보냄. 지금은 이 칸들을 입력하는 화면이 없어 잃을 값이 없지만, **주소·연락처 입력 칸을 추가하는 순간 실제 데이터 손실이 됨** | `Registration.jsx:127-132,145-157,190-197` · `visit.routes.js:13` · `patient.routes.js:81` | 코드 |
| ⑥ | 보통 | **진료과를 따로 고를 수 없다.** 의사의 소속과가 자동으로 들어감. 소속과가 없는 의사면 진료과가 비어 통계에서 「(미지정)」. `35ddb4b` 커밋은 「한 의사가 여러 과 진료를 볼 수 있으니 내원의 과는 의사 소속과와 별개」라고 설계를 밝혔는데 화면이 그걸 못 함. `/admin/departments`는 불러놓고 안 씀 | `Registration.jsx:74-75,318-327` | 코드 |
| ⑦ | 보통 | **내원구분(신환·재진·응급·의뢰)을 고르는 칸이 없다.** 제목에만 있고 항상 `newVisit`. 수납에서 고치기 전까지 통계의 신환/재진 구분이 틀리고, 수납 직원이 매번 손으로 바꿔야 함 | `Registration.jsx:55,316` · `Payment.jsx:187` · `stats.routes.js:32-34` | 코드 |
| ⑧ | 보통 | 환자·내원 API에 모듈 권한 검사가 없다. 약국·검사 계정으로도 API를 직접 부르면 환자 인적사항 수정, 내원 상태 변경이 됨. 단 진료·수납·약국·검사가 이 API를 읽으므로 권한을 붙이려면 범위를 나눠야 함 | `patient.routes.js:7` · `visit.routes.js:7` | 코드 |
| ⑨ | 보통 | `PUT /visits/:id`는 `visit_type`·`status` 검사를 안 한다 (`POST`는 함). 잘못된 `visit_type`은 수납에서 `C01` 진료비로 조용히 계산됨. 또 `COALESCE` 때문에 담당의·진료과를 **비울 수 없음** | `visit.routes.js:103-118` vs `:68` · `billing.routes.js:28-30` | 코드 |
| ⑩ | 보통 | 지난 날의 대기가 사라진다. `/visits/today`는 오늘 것만 보여줘서, 어제 `waiting`·`in_progress`로 남은 내원은 접수·진료 화면 어디에도 안 나오고 통계에는 「진행중」으로 계속 남음. 의도인지 **확인 필요** | `visit.routes.js:19` · `stats.routes.js:37` | 코드 |
| ⑪ | 낮음 | 알림 문구 일부가 영어로 고정 — `' required'`, `'Error: '`, 서버 오류 원문(`Patient name is required` 등). 프랑스어 화면에 영어가 섞임 | `Registration.jsx:144,163,180,225,236` | 코드 |
| ⑫ | 낮음 | 성별 기본값이 「남」. 안 누르고 넘어가면 여자 환자가 남자로 저장됨. 성별은 문서와 영상 장비(DICOM)로 나감 | `Registration.jsx:52` | 코드 |
| ⑬ | 낮음 | 서버 검사는 성별 `O`를 허용하는데 DB는 `M`/`F`만 → `O`를 보내면 500. 화면엔 M/F만 있어서 지금 영향은 없음 | `validate.js:6` · `001_schema.sql:59` | 코드 |
| ⑭ | 낮음 | 생년월일을 덜 쓰고 저장하면(예: 연도만) 반쪽 값이 서버로 가고 오류 원문이 뜸. 연도 칸이 비었는데 월부터 치면 값이 연도 칸으로 옮겨감 | `Registration.jsx:17-20` (`DobInput`) | 코드 — 서버 쪽 반응은 **확인 필요** |
| ⑮ | 낮음 | 환자 찾기 창의 외래 내역에 **취소된 내원도 구분 없이** 나옴 → 진료·수납·검사에서 취소된 내원을 고를 수 있음 (`status`는 받아오지만 표시 안 함) | `PatientFinder.jsx:131-139` | 코드 |
| ⑯ | 낮음 | 검색은 「성 이름」 순서로만 이어서 찾음 — 「이름 성」으로 치면 안 나옴. 검색어의 `%` `_`가 와일드카드로 먹힘. `limit`에 숫자가 아니면 500 | `patient.routes.js:15-20` | 코드 |
| ⑰ | 낮음 | 접수 대기 목록은 자동 새로고침이 없다 (진료 화면은 15초마다). ②의 원인이기도 함 | `Registration.jsx:61` · `Consultation.jsx:71` | 코드 |
| ⑱ | 낮음 | 차트번호 99,999번을 넘으면 등록이 대부분 실패한다. PostgreSQL `LPAD`는 긴 문자열을 **잘라서** `100000`→`10000`이 되어 같은 해 번호와 겹침. 작은 병원에서는 먼 이야기 | `001_schema.sql:336` | 코드 |
| ⑲ | 낮음 | 환자 비활성화·중복 환자 합치기 기능이 없다. ③으로 생긴 중복 차트를 정리할 방법이 DB 직접 수정뿐 | `patient.is_active` 쓰는 곳 없음 | 코드 |
| ⑳ | 확인 필요 | 대기 중 환자의 「완료로 →」는 진료 없이 내원을 완료시켜 수납 대기로 보냄(진료비 `C01`). 서류만 떼러 온 경우 등을 위한 것으로 보이나 의도 확인 필요. 「완료 → 대기로」는 이미 수납한 내원에도 가능 | `Registration.jsx:404-407` | 코드 |

**제약**

- 주민번호·휴대폰·주소·도시·지역은 DB에 칸이 있지만 입력하는 화면이 없음. 문서 양식은 주소를 인쇄하므로 늘 빈칸으로 나감.
- 담당의사 목록은 역할이 `doctor`인 직원만. 역할이 `admin`인 의사는 목록에 안 나옴 (`admin.routes.js:174`).

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 접수 세션 첫 현황 파악 — 위키 1~7절을 실제 코드 기준으로 채움. 코드 변경 없음 | (이 커밋) |
