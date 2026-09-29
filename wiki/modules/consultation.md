# 진료 (Consultation)

> **담당**: 진료 세션 · 브랜치 `session/consultation` · **마지막 갱신**: 2026-09-29 · **상태**: ⑥ 수술기록지 프랑스어 표시 + 검사 오더 상태 칸 확인 요청 (③④⑤⑦·⑧⑨⑪은 develop에 합쳐짐)

## 1. 이 모듈이 하는 일

의사가 접수된 환자를 한 명씩 불러 **진료 기록(자유 서술 SOAP)과 바이탈**을 쓰고, **약 처방**과 **검사·영상·처치 오더**를 내고, **완료**를 눌러 환자를 약국·임상병리·수납으로 넘기는 화면입니다.
그 밖에 한 화면 안에서 다음을 합니다.

- **약속처방(오더 세트)** — 미리 묶어 둔 약·검사를 한 번에 추가
- **문장사전** — 자주 쓰는 소견 문장을 진료 기록에 끼워 넣기
- **과거 내원** 기록 보기 (읽기 전용)
- **문서/의뢰서**(진료의뢰서) · **차트기록**(수술기록지 12종 + 수술 동의서) 작성·발급·재출력
- 이 환자의 **검사결과** 보기(임상병리 세션 부품) · 영상 **판독소견** 보기/쓰기(PACS 세션 부품)

**진단(ICD) 입력은 없습니다.** DB 테이블과 API는 있지만 화면에서 쓰지 않습니다(7절 ⑩).

공용 **문서 엔진**(`DocumentModal` · `documents/shared.jsx` · `documents/registry.js`)도 이 모듈이 주관합니다. 진료·수납·약국·임상병리·접수 5개 화면이 같이 씁니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름은 한국어 화면 기준이고, 괄호 안은 프랑스어 화면의 이름입니다.

### 환자 부르기

1. 위쪽 **「☰ 진료대기 현황 (숫자)」**(File d'Attente)을 누르면 왼쪽에서 오늘 환자 목록이 나옵니다. 숫자는 기다리는 환자 수입니다.
   - **대기**(En Attente) 탭: 아직 진료가 끝나지 않은 환자 · **완료**(Terminé) 탭: 진료가 끝난 환자
   - 의사로 로그인하면 **자기 앞으로 접수된 환자와 담당의가 정해지지 않은 환자**만 보입니다.
   - 목록은 15초마다 저절로 새로 고쳐집니다.
2. 환자 이름을 누르면 진료가 시작됩니다. 접수 화면에서 이 환자가 「진료 중」으로 바뀝니다.
3. 오늘 목록에 없는 환자는 **「🔍 환자 찾기」**(Trouver patient)로 찾아서 내원을 고릅니다.

환자를 부르면 화면 맨 위 파란 줄에 차트번호·이름·성별/생년월일·진료과, **알레르기(빨간 ⚠)**, 접수 메모(📝)가 나옵니다.

### 진료 기록과 바이탈 (가운데)

1. **BP**(혈압, `120/80`처럼), **BT**(체온), **PR**(맥박), **RR**(호흡수), **SpO2**를 칸에 적습니다.
2. **「진료 기록」**(Note de Consultation) 칸에 S·O·A·P를 적습니다. 칸은 하나입니다.
3. 아래 **「문장사전」**(Dictionnaire)에서 문장을 누르면 진료 기록 맨 아래 줄에 붙습니다. 분류 버튼(All · General · Internal …)과 검색으로 좁힐 수 있습니다.
4. **「저장」**(Sauver)을 누르면 기록과 바이탈이 저장됩니다.

### 처방·오더 (왼쪽)

1. 입력 칸 위의 **전체 / 약 / 검사/영상** 버튼으로 찾을 종류를 고릅니다.
2. 입력 칸에 **코드나 이름을 두 글자 이상** 치면 목록이 뜹니다. 화살표 ↑↓로 고르고 **Enter**, 또는 마우스로 누르면 추가됩니다. (Enter만 누르면 목록 맨 위 항목이 들어갑니다.)
   - 초록 **DRUG** 표시는 약, 노란 글자는 검사·영상입니다(검사 종류 `lab`·`procedure`, 또는 영상 장비 `US`·`CR` 등). 오른쪽 **WL**은 영상 장비로 바로 넘어가는 오더입니다.
3. 약은 **「+ 약 검색」**(Recherche médicament) 버튼으로 전체 목록에서 골라도 됩니다.
4. 추가된 줄에서 칸을 고치고 **다른 곳을 누르면 바로 저장**됩니다.
   - 약: **Qty**(1회 용량) · **Tms**(하루 횟수) · **Day**(일수) · **Usage**(용법) · **Unit**(단위)
   - 검사·처치: **Qty**(수량) · Tms · Day · **Usage** · **Unit**(메모/부위). *청구 금액은 수량만 씁니다(7절 ⑭).*
5. 줄 맨 앞 빨간 **✕**를 누르면 「지울까요?」 확인 창이 뜹니다. **확인**을 눌러야 지워집니다. 지운 줄은 되살릴 수 없습니다.
6. 줄 맨 앞에 **🔒**가 있으면 고치거나 지울 수 없는 줄입니다. 🔒에 마우스를 올리면 이유가 나옵니다.
   - **약**: 약국에서 이미 조제한 약입니다. 오른쪽 끝에 **「조제됨」**(Délivré)이 표시되고, 칸이 입력 칸이 아니라 글자로 바뀝니다. 바꿔야 하면 **약국에 알리고 새 줄로 처방**하세요.
   - **검사·영상**: 검사 결과가 들어왔거나, 판독이 쓰였거나, 촬영이 시작된 오더입니다. 수량·메모 칸은 고칠 수 있지만 줄을 지울 수는 없습니다.
   - 화면을 열어 둔 사이에 약국이 조제하면, ✕를 눌렀을 때 「이미 조제한 약」이라는 안내가 나오고 표가 새로 고쳐집니다.
7. 영상 오더 줄의 **🖼** 버튼은 영상 뷰어와 판독 칸을 엽니다.

### 약속처방 (오른쪽)

1. 오른쪽 위 **「약속처방」**(Ordonnances types) 탭을 누릅니다.
2. 📁 묶음 이름을 누르면 안의 세트가 펼쳐집니다.
3. 세트를 누르면 그 안의 약·검사가 **모두** 지금 진료에 추가됩니다. 필요 없는 줄은 ✕로 지웁니다.
   - 세트 만들기·고치기는 **설정 → 약속처방** 탭에서 합니다(설정 권한 필요).

### 과거 기록 보기 (오른쪽)

1. **「과거 내원」**(Visites passées) 탭에 이 환자의 지난 진료가 날짜순으로 나옵니다.
2. 날짜를 누르면 가운데에 그날의 바이탈·진료 기록·처방이 **읽기 전용**으로 나옵니다.
3. **「← 현재 진료로」**를 누르면 오늘 진료로 돌아옵니다.

### 진료 끝내기

- **「완료」**(Terminé)를 누르면 기록과 바이탈을 한 번 더 저장하고 진료를 끝냅니다. 환자는 대기 목록에서 빠지고 **약국 · 임상병리 · 수납** 화면에 나타납니다.
- 완료한 환자도 「완료」 탭에서 다시 열어 고칠 수 있습니다. 약을 더 넣으면 약국에 다시 나타납니다. 이미 조제한 약은 🔒로 잠겨 있습니다.

### 위쪽 파란 줄의 버튼

| 버튼 | 하는 일 |
|---|---|
| **📋 외래 내역 선택** (Sélection visite) | 이 환자의 다른 내원을 골라 엽니다. *지난 날짜의 내원을 열면 그날 진료를 고칠 수 있는 상태로 열립니다 — 주의(7절 ⑫)* |
| **📄 문서/의뢰서** (Documents) | 진료의뢰서 작성·발급 |
| **🧪 검사결과** (Résultats labo) | 이 환자의 검사 결과 전체 |
| **🩻 판독소견** (Compte-rendu) | 이 환자의 영상 판독 목록. 누르면 영상 뷰어가 열립니다 |
| **📋 차트기록** (Dossier) | 수술기록지·동의서 작성·발급 |

### 문서 발급 (의뢰서 · 수술기록지 · 동의서)

1. 왼쪽 **서식** 목록에서 양식을 고릅니다.
2. 가운데 **내용 입력** 칸을 채우면 오른쪽 미리보기가 바로 바뀝니다.
   - 의뢰서의 「환자 상태 및 진료 소견」은 진료 기록이, 「현재 치료 / 투약」은 오늘 처방이 미리 채워집니다.
   - 수술기록지의 「집도의」는 담당 의사 이름이 미리 채워집니다. 체크 칸을 고르면 인쇄되는 그림에 표시됩니다.
   - **하나만 고르는 칸**(예/아니오, 부위, 충수 상태, 삼출액 양)은 다른 것을 고르면 앞의 체크가 저절로 풀립니다. **「None」(없음)**을 고르면 같은 칸의 다른 체크가 풀리고, 다른 것을 고르면 None이 풀립니다(JP 배액관, 동반 병변).
   - 크기 칸(`×  ×  cm`)은 숫자를 안 적으면 인쇄되지 않습니다.
   - 언어를 **FR**로 고르면 체크 칸 이름·인쇄되는 선택값·그림 글자가 프랑스어로 나옵니다(예: `3 h`, `Oui`, `Marisque`, 시계의 `D`/`G`). 손으로 적은 글자는 적은 그대로 인쇄됩니다.
   - 소견의 **`[anesthesia]` 같은 대괄호**는 고쳐 써야 할 자리입니다. 남아 있으면 칸 아래에 노란 **「⚠ 아직 고치지 않은 칸」**이 뜨고, 「발급 (저장)」을 누르면 한 번 더 물어봅니다. 그대로 발급하면 괄호째 인쇄됩니다.
3. 위쪽 **FR / EN / KO**로 인쇄 언어를 고릅니다.
4. **「발급 (저장)」**을 누르면 발급번호(`D26-00001` 형식)가 붙어 저장됩니다. 그 다음 **「🖨 재출력」**으로 인쇄합니다.
   - 발급하지 않고 **「🖨 출력」**만 누르면 번호 없이 「미발급(초안)」으로 인쇄되고 기록이 남지 않습니다.
5. 오른쪽 **발급 이력**에서 지난 문서를 눌러 다시 인쇄할 수 있습니다. 잘못 발급한 문서는 **「발급 취소」**로 무효 표시(사유 입력)합니다. 지워지지 않고 「취소됨」 도장이 찍힌 채 남습니다.
- 인쇄 창이 안 뜨면 브라우저의 **팝업 차단**을 풀어야 합니다.

## 3. 기능 상세

### 3.1 화면 구조 — `frontend/src/pages/Consultation.jsx` (732줄, 함수 컴포넌트 하나)

세 칸 + 환자 막대 + 모달들입니다.

| 부분 | 줄 | 내용 |
|---|---|---|
| 환자 막대 | 392-406 | 선택한 내원(`sel`) 정보, 모달 여는 버튼 5개 |
| 대기 서랍 | 410-436 | `filteredQueue` (356-363). 대기 탭 = status `waiting`·`registered`·`in_progress`. role이 `doctor`면 `doctor_id`가 없거나 자기인 것만 |
| 왼쪽 42% | 438-534 | 오더 입력(자동완성) + 처방·오더 표 |
| 가운데 | 536-591 | 바이탈 5칸, 저장/완료, 진료 기록 textarea, 문장사전 |
| 오른쪽 28% | 593-641 | 과거 내원 / 약속처방 탭 |
| 모달 | 644-729 | 약 검색, PatientFinder ×2, DocumentModal ×2(`document`, `chart`), 검사결과(`LabResults`), 영상 뷰어+판독, 판독 목록(`RadiologyReadings`) |

**상태 흐름**

- 첫 로드 `loadData()` (75-89): `/visits/today`, `/admin/drugs`, `/admin/order-codes`, `/admin/phrases`, `/order-sets`를 **순서대로** 받아 둡니다. 자동완성은 전부 브라우저 안에서 거릅니다(서버 검색 없음). 약속처방은 **진료과 필터 없이 전부** 받습니다(API는 `?department_id=`를 지원).
- `pickPatient(v)` (91-112): `POST /consultations`로 진료를 **열거나 새로 만들고**, 처방·오더·환자 이력을 받습니다. 바이탈은 `bp_systolic`이 있을 때만 채웁니다(수축기 혈압이 비었으면 체온 등도 화면에 안 나옴 — 작은 흠).
- `saveNote()` (165-180) · `completeConsult()` (182-201): `note_text`와 바이탈만 보냅니다. 완료는 저장 → `PUT /:id/complete` → `loadData()` 순서입니다. *저장을 안 누르고 완료해도 기록이 날아가지 않게* 완료가 먼저 저장합니다.
- 처방·오더 줄은 **추가할 때 바로 서버에 INSERT**되고(`addDrugRx`, `addExamOrder`), 칸을 고치면 `onBlur`에서 PUT(`saveRx`, `saveOrder`), ✕는 `confirmRemove`(이름을 넣은 확인 창) 후 DELETE입니다. 「저장」 버튼과 무관합니다.
- **오더 줄의 상태 칸**(WL 칸, `orderStatus(o)`): 검사 오더(`code_type='lab'`)는 임상병리의 `o.status`를 「결과 대기 / 결과 있음 / 취소됨」(`cs_labPending`·`cs_labDone`·`cs_labCancelled`)으로, 워크리스트로 간 오더(`worklist_sent_at` 있음)는 `worklist_status`를 그대로, 그 밖의 오더는 비웁니다. 워크리스트 없는 오더는 만들 때 `worklist_status='completed'`로 저장되어, 전에는 검사 결과가 들어오기도 전에 「completed」로 보였습니다(임상병리 위키 7절 9, 2026-09-29).
- **잠긴 줄**(2026-09-29, 7절 ⑧⑨): 처방은 `rx.status === 'dispensed'`면 입력 칸 대신 글자로 그리고 ✕ 대신 🔒, WL 칸에 `cs_dispensed`. 오더는 파일 위쪽의 `orderLocked(o)`가 서버 규칙을 흉내 냅니다 — `o.status === 'completed'`(임상병리는 값이 하나라도 있어야 완료로 바꿈) 또는 `result_text`가 있음 또는 `worklist_sent_at`이 있고 `worklist_status`가 `in_progress`·`completed`. `worklist_sent_at`을 보는 이유: 워크리스트 없는 오더는 처음부터 `worklist_status='completed'`로 저장되기 때문. 오더는 줄 삭제만 막고 칸 수정은 그대로 둡니다(수량이 바뀌면 수납이 추가 청구/환불로 잡음).
- 서버가 거절하면(화면이 열린 사이 약국·검사가 진행한 경우) `lockAlert`가 서버의 영어 문구를 `LOCK_MESSAGES`로 번역 키에 맞춰 알리고 `reloadItems()`로 처방·오더를 다시 읽습니다. **이 문구는 `consult.routes.js`의 `RX_DISPENSED`·`ORDER_HAS_RESULT`와 글자까지 같아야 합니다** — `api/client.js`가 오류 본문 중 `error` 문자열만 넘겨주기 때문(공용 파일이라 고치지 않음).
- 약 추가 시 `total_qty = 용량 × 횟수 × 일수`를 화면이 계산해 보냅니다(248, 278). 약에 기본 용법이 없으면 **`route`에 `'TID'`**를 넣습니다(246, 7절 ⑮).
- `applySet(set)` (317-333): 세트 항목을 **하나씩 차례로** `addExamOrder`/`addDrugRx`에 넘깁니다. 한 항목이 실패하면 alert 후 다음 항목을 계속합니다. 단가는 세트 저장 값이 아니라 **지금의 약품·오더코드 단가**(`orderset.routes.js` `attachItems`)입니다.
- 과거 보기 `openPast`/`renderPast` (114-163): 처방·오더를 읽어 가운데에 보여 주고, 왼쪽 오더 칸은 가립니다. 읽기 전용은 **이 화면에서만**이고, 「외래 내역 선택」으로 과거 내원을 열면 편집 상태로 열립니다(7절 ⑫).
- 영상 판독: `openViewer` → `GET /pacs/viewer-url`, `saveReading` → `PUT /pacs/reading/:id`. 판독 칸은 `canRead`(권한 `consultation` 보유, 50줄)일 때만 쓸 수 있습니다.

**화면에 그대로 나오는 번역 안 된 글자** — 대기 상태값(`waiting` 등, 428), 문장사전 분류 버튼(573), 문장 본문(`p.text`만, 584 — DB의 `text_fr`/`text_en`은 안 씀), 진료 기록 placeholder(566), `DRUG` 배지(474), `Error:` 알림. 7절 ⑯.

### 3.2 서버 — `backend/src/routes/consult.routes.js` (`/api/consultations`)

- **쓰기(POST·PUT·DELETE)는 전부 `permMiddleware('consultation')`**(`canConsult`), **읽기(GET)는 로그인만**. 읽기를 열어 둔 이유: 수납·약국·임상병리·접수 화면이 `PatientChart`·`DocumentModal`로 처방·오더를 읽습니다. 쓰기를 막은 이유: 메뉴가 화면을 숨겨도 API는 열려 있어 약국·수납 계정으로 처방을 넣고 지울 수 있었습니다(7절 ⑪, 2026-09-29).
- `POST /` — 진료 열기. 같은 `visit_id`의 진료가 있으면 그것을 돌려주고(완료·서명 전이면 내원을 `in_progress`로), 없으면 새로 만들며 `doctor_id = 지금 로그인한 사람`, `department_id = 내원의 과 || 로그인한 사람의 과`, `consult_date = CURRENT_DATE`. `consultation.visit_id`에 UNIQUE 인덱스가 있어 한 내원에 진료는 하나입니다.
- `PUT /:id` — `subjective, objective, assessment, plan, note_text`, 바이탈 7개를 **몸체에 있는 그대로** UPDATE. 화면은 S/O/A/P·체중·키를 안 보내므로 **매번 NULL로 덮어씁니다**(7절 ⑬).
- `PUT /:id/complete` — 진료 `completed` + 내원 `completed`, 한 트랜잭션.
- 처방·오더 쓰기는 `badAmounts`(`utils/validate.js`)로 숫자 범위를 막습니다 — `dose` 0~1000 **숫자만**(그래서 `1/2` 같은 용량은 400), `frequency` 1~24 정수, `days` 1~365 정수, `quantity` 0~10000, `unit_price` 0~1억.
- `POST /:id/orders` — 오더코드의 `pacs_modality`·`body_part`·`worklist_enabled`를 복사하고, `pacs_config.auto_create_worklist`가 꺼져 있으면 워크리스트를 안 만듭니다. 워크리스트 대상이면 `worklist_log`를 만들고(accession `YYMMDD-<order_item.id>`, DICOM SH 16자 이내) `worklist_status='sent'`. 아니면 `worklist_status='completed'`로 저장합니다. station AE는 일부러 비웁니다(같은 모달리티 장비 여러 대가 한 풀을 나눠 씀). 이 경로 안에 `pacs_config`를 `CREATE TABLE IF NOT EXISTS`하는 옛 코드가 남아 있습니다(7절 ⑲).
- `PUT /prescription/:rxId` · `DELETE /prescription/:rxId` — **조제된 처방(`status='dispensed'`)은 409 `Prescription already dispensed`**. 조건을 UPDATE/DELETE의 `WHERE ... AND status <> 'dispensed'`에 넣어, 확인과 쓰기 사이에 조제가 끼어들 수 없게 했습니다. 0행이면 `rxRefusal`이 없는 줄(404)인지 조제된 줄(409)인지 가립니다. 이유: 조제하면 재고가 이미 빠져 있어, 그 뒤의 수정·삭제는 청구만 움직이고 재고는 그대로라 둘이 영영 어긋납니다.
- `DELETE /order/:orderId` — **결과가 생긴 오더는 409 `Order already has a result`**: `lab_result`가 있거나, `order_item.result_text`(판독)가 있거나, `worklist_log.status`가 `in_progress`·`completed`(촬영 시작). 이유: `lab_result`와 `worklist_log`가 `ON DELETE CASCADE`라 지우면 검사값·accession·판독이 소리 없이 함께 사라졌습니다. 먼저 `order_item`을 `FOR UPDATE`로 잠그므로, 동시에 저장되는 검사 결과(외래키가 이 행에 키 잠금을 요구)는 확인 전에 끝나거나 삭제 뒤 실패합니다. 시작 전 워크리스트는 오더와 함께 지워집니다.
- `PUT /order/:orderId` — 상태 확인 없이 고칩니다(의도: 수량·메모 수정은 수납이 차액으로 처리).
- `GET /visit/:visitId/prescriptions` — 내원 단위 처방. 문서 엔진이 투약 목록을 채울 때 씁니다.
- 진단 `GET/POST /:id/diagnoses`, `DELETE /diagnosis/:dxId` — 화면에서 안 씀.

### 3.3 오더 세트 — `backend/src/routes/orderset.routes.js` (`/api/order-sets`)

- 읽기 `GET /` · `GET /:id` 는 로그인만, 쓰기 `POST` · `PUT /:id` · `DELETE /:id` 는 `permMiddleware('settings')`.
- `PUT`은 세트 정보를 고치고 `items`가 오면 **항목을 통째로 지우고 다시 넣습니다.**
- `attachItems`는 항목의 단가를 `drug.unit_price` / `order_code.price_clinic`에서 지금 값으로 붙입니다(세트에 단가를 저장하지 않음).
- 화면은 설정 → 약속처방 탭(`Settings.jsx` 157-192, 384-)이 씁니다. 그 탭의 담당은 「확인 필요」(규칙 4절상 모듈 탭은 해당 모듈 — 진료로 보임).

### 3.4 문서 — `backend/src/routes/document.routes.js` (`/api/documents`)

- `POST /` — `generate_doc_no()`로 `D<YY>-<5자리>` 번호를 붙여 `document_log`에 저장. `payload`(JSONB)에 **입력값·환자·병원·의사·투약·날짜·언어를 통째로** 넣습니다.
- `GET /patient/:id` 이력, `GET /:id` 단건, `POST /:id/void` 취소(사유·시각·사람 기록, 행은 남음).
- 권한 검사는 로그인만. 5개 화면이 같이 쓰므로 모듈 권한으로 막기 어렵습니다. 발급 취소도 누구나 할 수 있습니다.

### 3.5 공용 문서 엔진 (진료 주관)

- `documents/registry.js` — `TEMPLATES = [referral, externalRx, ...CHART_TEMPLATES]`. `templatesByCategory('document'|'prescription'|'chart')`로 화면마다 보이는 양식을 거릅니다. `autofillValue`는 `doctor`·`note`·`meds` 세 가지.
- `components/DocumentModal.jsx` — 양식 목록 / 입력 칸 / 미리보기 / 발급 이력의 네 칸. 입력 종류는 `text`, `textarea`, `checks`(체크 여러 개를 `", "`로 이어 한 문자열로 저장). `checks`의 다음 값은 파일 위쪽 `nextChecks(f, cur, opt, on)`이 정합니다 — 필드에 `single: true`면 한 개만(새 체크가 앞의 것을 바꿈), `noneOption: 'None'`이면 None과 나머지가 서로 배타, 둘 다 없으면 아무 조합(옵션 순서로 정렬). 저장 형식은 그대로라 예전에 두 개 저장된 문서도 그대로 열리고 인쇄됩니다(데이터는 고치지 않음). `text`·`textarea` 칸에 `[...]`(60자 이내, 줄바꿈 없음 — `openBrackets`)가 남아 있으면 칸 아래 경고를 보이고, **발급할 때만** `window.confirm`으로 묻습니다(초안 출력은 「미발급(초안)」 표시가 있어 묻지 않음). 문구는 이 파일의 `UI` 사전(`bracketHint`·`bracketConfirm`) — 문서 언어를 따릅니다. `readOnly`면 입력 칸을 숨기고 가장 최근 발급 문서를 엽니다(수납·약국·임상병리·접수의 「차트뷰어」).
- **저장된 문서는 값만 가지고, 인쇄할 때 지금 코드의 `Layout`으로 다시 그립니다**(157-161). 그래서
  - 양식 코드를 고치면 **이미 발급한 문서의 재출력 모양도 바뀝니다.**
  - 체크 선택값은 영어 문자열(`Yes`, `3 o’clock`, `Skin tag`)이 그대로 저장값이자 키입니다. **옵션 문자열을 바꾸면 옛 문서의 그림·표시가 깨집니다.** 번역(7절 ⑥)은 저장값을 그대로 두고 인쇄할 때만 바꿔야 합니다.
- 발행일 `today`는 `new Date().toISOString()` — UTC 날짜입니다(7절 ⑰).
- 서명 칸의 의사는 `context.doctor_name`(= **내원의 담당의**) → 없으면 로그인한 사람.
- `documents/shared.jsx` — `A4`(여백 `pad`), `ClinicHeader`, `DocMetaRow`, `PatientBox`(`minimal`이면 주소·전화 뺌 — 수술기록지), `DocSection`, `SignatureBlock`(`tight`), `printDocument`(새 창에 A4 노드 HTML을 복사, `@page{size:A4;margin:14mm}`, 350ms 뒤 인쇄).

### 3.6 수술기록지 — `documents/surgical-records.jsx` · `op-figures.jsx` · `op-plates.js`

- 차트기록(`category: 'chart'`) 13종: 공통 · 연부조직 · 탈장 · 충수 · 유방 · 치질 · 치루 · 열상 봉합 · 절개 배농 · 제왕절개 · 포경 + 수술 동의서. `makeOp(code, name, title, defaults, spec)` 한 번이 양식 하나입니다.
- `spec.extras` = 수술별 상세 칸, `spec.figure` = 그림 종류(`hernia`·`appendix`·`breast`·`anal`·`fistula`), `spec.safety` = 안전 점검 칸 묶음(A: 검체·배액·거즈 일치·출혈 / B: 거즈·배액·출혈·생검), `spec.sutures` = 봉합사 체크.
- `OpNoteLayout`은 **채운 상세 칸만** 인쇄합니다. 기본값(입력 도우미)을 손대지 않은 칸도 빈 칸으로 봅니다 — 크기 칸의 `' ×  ×  cm'`이 「크기: × × cm」로 인쇄되던 것(7절 ④). 그림은 선택이 있을 때만 그립니다(`OpFigures`, 344-379) — 빈 그림은 「정상」으로 읽히기 때문.
- 그림: 항문 시계(`AnalClock`, 쇄석위, 12시=A, 환자 오른쪽=보는 사람 왼쪽), 치루 Goodsall 시계(`FistulaClock`, 내공 1개일 때만 선으로 이음), 치루 관상 단면(`FistulaSection`, Parks 5형 경로), 유방 사분면(`BreastMap`), 탈장 패널(`HerniaPlate`, 선택한 유형만), 충수 위치(`AppendixPlate`, 선택한 위치 굵게+테두리). 탈장·충수 그림은 **병원 자체 그림(PNG base64, `op-plates.js`)**이고 글자는 SVG로 다시 씁니다.
- 기본 문장(소견·술후 계획·동의서 위험)은 **영어만** 있습니다.
- 인쇄 폭: 본문 약 **688px**, 한 장 약 **1017px**. 충수절제술을 가득 채우면 여유 9px.

- **치루 단면도**(`FistulaSection`)는 고른 유형을 **한 그림에 모두** 그립니다. 첫째는 실선, 둘째부터 점선 무늬(`FIS_DASH`), 여럿이면 그림 아래에 범례 줄(`FIS_LEG` 12단위/줄)이 붙고 오른쪽 위 유형 이름 대신 범례가 씁니다. `int.`/`ext.` 글자는 첫 유형에만. 유형마다 그림을 따로 그리는 방식을 먼저 해 봤는데, 표 옆에 못 들어가 줄이 바뀌면서 소견이 보통 길이인 기록이 **30px 넘쳐 두 장**이 되어 버렸습니다. 무늬는 흑백 인쇄에서도 구별되게 색 대신 씁니다.

**체크 칸 규칙** (③, 2026-09-29 실장님 결정: 예/아니오·부위·양은 하나만, 여러 개 고르는 칸의 None은 배타)

| 양식 | 항목 (키) | 규칙 |
|---|---|---|
| 공통 A (공통·연부조직·탈장·충수·열상·절개배농·제왕·포경) | 검체 병리 의뢰 `tissuePath` · 거즈 카운트 일치 `spongeCount` | 하나만 (Yes/No) |
| 공통 B (유방·치질·치루) | 거즈 카운트 `gauzeCount` · 생검 `biopsy` | 하나만 (Yes/No) |
| 봉합사가 있는 양식 전부 | 사용 봉합사 `sutures` | 여러 개 |
| 연부조직 | 병변 위치 `layer` · 병변 종류 `massType` | 여러 개 (확인 후보 — 아래) |
| 연부조직 | 근육층 침범 `muscleLayer` | 하나만 (Yes/No) |
| 탈장 · 유방 | 부위 `side` (Right·Left·Bilateral) | 하나만 |
| 탈장 | 탈장 유형 `herniaType` | **여러 개** — 양측 탈장은 좌우 유형이 다를 수 있어서(예: Bilateral + Indirect-medium, Direct-small). 처음 제안에서는 「하나만」이었으나 이 이유로 바꿈 — 실장님 확인 필요 |
| 충수 | 충수 상태 `appyType` · 삼출액 양 `fluidAmount` | 하나만 |
| 충수 | JP 배액관 `jp` | 여러 개, None 배타 |
| 충수 | 충수 위치 `appyPosition` · Port `port` · 혈관 처리 `vessel` · 기저부 `base` · 삼출액 성상 `fluidType` · 봉합 `closure` | 여러 개 |
| 유방 | 사분면 `quadrant` | 여러 개 |
| 치질 | 병변 위치 `position` · 술후/추가 위치 `position2` | 여러 개 (시계) |
| 치질 | 동반 병변 `skinTag` | 여러 개, None 배타 |
| 치루 | 외공 `extOpening` · 내공 `intOpening` · 치루 유형 `tractType` | 여러 개 |
| 치루 | Seton 유치 `seton` | 하나만 (Yes/No) |

「하나만」일 수도 있지만 결정 범위 밖이라 **여러 개로 둔 것**(실장님 확인 후보): 충수 위치, 삼출액 성상, 연부조직 병변 위치·종류.

**프랑스어 표시** (⑥, 2026-09-29) — `documents/op-terms.js`

- **저장값은 영어 그대로**(`Yes`, `3 o’clock`, `Transsphincteric`)이고 프랑스어는 **보여 줄 때만** 바꿉니다. 그림을 무엇으로 그릴지(`op-figures.jsx`)가 이 영어 문자열로 정해지고, 이미 발급한 문서도 같은 값을 갖고 있기 때문입니다. 그래서 예전에 발급한 문서도 FR로 재출력하면 프랑스어로 나옵니다.
- `tr(s, lang)` — 한 단어, `showSel(v, lang)` — 쉼표로 이은 체크 값. `fr`에서만 바꾸고 한국어·영어는 예전 그대로(한국 종이 양식도 영어 용어를 썼음). 사전에 없는 단어는 저장된 그대로.
- 입력 칸: `makeOp`가 모든 `checks` 필드에 `optionLabel: tr`을 달고, `DocumentModal`이 체크 옆 글자를 `f.optionLabel(opt, lang)`로 보여 줍니다(저장은 `opt`).
- 인쇄: `OpNoteLayout`의 `show(key)` — 체크 필드는 `showSel`, 손으로 적는 칸은 적은 그대로.
- 그림: 모든 그림 부품이 `lang`을 받습니다. 시계·유방의 R/L → D/G, 치루 단면의 IAS/EAS/levator ani/dentate → SAI/SAE/「releveur / de l'anus」(두 줄 — 한 줄이면 그림 오른쪽 끝을 넘음)/ligne pectinée, 탈장 패널 이름, 충수 위치 이름. 충수 그림은 프랑스어 단어가 길어 `appyFrame(lang)`이 **프랑스어일 때만** 틀을 넓힙니다(글자 폭은 `appyEm` — 넓은 글자 æ·m, 좁은 글자 i·l·-, 굵게 10%). 영어 그림은 틀·글자 모두 예전과 같습니다.
- 렌더 확인(2026-09-29): 한국어·영어 출력 HTML이 고치기 전과 **바이트까지 같음**. 프랑스어 12개 양식 + 빽빽한 경우 5종 + 긴 단어 경우 모두 A4 한 장(가장 빽빽한 충수 1008px). 그림 밖으로 나간 글자 없음, 고른 위치의 테두리가 글자를 모두 감쌈.

**프랑스어 용어** — 의학 용어라 **현지 프랑스어 의사의 확인 필요**. 바꿀 때는 `op-terms.js`의 번역만 바꾸고 왼쪽(저장 키)은 그대로 둡니다.

| 영어(저장값) | 프랑스어 표시 |
|---|---|
| Yes · No · None · Other | Oui · Non · Néant · Autre |
| Right · Left · Bilateral | Droit · Gauche · Bilatéral |
| 1 o’clock … 12 o’clock | 1 h … 12 h |
| Skin · Soft tissue (subcutaneous) | Peau · Tissus mous (sous-cutané) |
| Epidermal cyst · Granuloma · Lipoma · Hemangioma · Fibroma · Giant cell tumor · Myositis ossificans · Sarcoma | Kyste épidermoïde · Granulome · Lipome · Hémangiome · Fibrome · Tumeur à cellules géantes · Myosite ossifiante · Sarcome |
| Indirect/Direct - small/medium/large · Combined · Femoral | Indirecte/Directe - petite/moyenne/grande · Mixte · Crurale |
| Retrocecal · Preileal · Postileal · Subcecal · Pelvic | Rétrocæcale · Pré-iléale · Rétro-iléale · Sous-cæcale · Pelvienne |
| Free taenia · Ileum · Cecum (그림의 해부 이름) | Bandelette libre · Iléon · Cæcum |
| Perforation · Gangrenous · Suppurative · Congestive | Perforée · Gangréneuse · Suppurée · Congestive |
| Pus · Turbid · Serous | Pus · Trouble · Séreux |
| RLQ · LLQ · Umbilicus | FID · FIG · Ombilic |
| Fascia: Vicryl 2-0 · Skin: Nylon 3-0 / 4-0 | Fascia : Vicryl 2-0 · Peau : Nylon 3-0 / 4-0 |
| Upper outer · Upper inner · Lower outer · Lower inner · Central / subareolar · Axillary | Supéro-externe · Supéro-interne · Inféro-externe · Inféro-interne · Central / rétro-aréolaire · Axillaire |
| Skin tag · Anal fissure · Anal papilla | Marisque · Fissure anale · Papille anale |
| Submucosal · Intersphincteric · Transsphincteric · Suprasphincteric · Extrasphincteric | Sous-muqueuse · Intersphinctérienne · Transsphinctérienne · Suprasphinctérienne · Extrasphinctérienne |
| IAS · EAS · levator ani · dentate | SAI · SAE · releveur de l'anus · ligne pectinée |
| Pile position (lithotomy view) · pre-op · post-op / additional | Position des paquets (vue en position gynécologique) · pré-op · post-op / supplémentaire |
| Openings (lithotomy view) and tract · ● internal ○ external · tract type not selected | Orifices (position gynécologique) et trajet · ● interne ○ externe · type de trajet non précisé |
| R · L (그림의 좌우) | D · G |

그대로 두는 것: 봉합사 이름(Nylon 3-0 등), 기구 이름(Glove port, Ligasure, Endo-loop, Clip), 부피(`> 100 mL`), `int.`·`ext.`(프랑스어도 같은 약자), 시계의 A·P(antérieur·postérieur).

### 3.7 의뢰서 — `documents/referral.jsx`

수신처 · 진단명 · 소견(진료 기록 자동) · 현재 치료(오늘 처방 자동) · 의뢰 목적. 주소·전화 포함 환자 칸(연락이 목적인 문서라서).

### 3.8 렌더링 확인 도구

총괄이 쓰던 도구가 `C:\Users\Shintong\AppData\Local\Temp\claude\C--Users-Shintong-Desktop-----\ffc2b807-713f-4479-aed6-929e3d607377\scratchpad\emr-render\`에 있습니다. `rerender.sh`가 **본체(`C:\Bethesda-EMR-main`)**의 문서 파일 4개를 `src/`로 복사 → esbuild로 `src/render.jsx`를 묶음 → `renderToStaticMarkup`으로 `out/*.html` 5개(그림 모음, 전 양식 ko, 경계 사례, fr, 빽빽한 경우)를 씁니다. 본체 경로를 읽으므로, 진료 세션은 자기 scratchpad(`C:UsersShintongAppDataLocalTempclaudeC--Bethesda-EMR-main--claude-worktrees-charming-cori-c14020c7b99ba-ea46-4b43-bd57-e11d8aba0bd5scratchpademr-render`)에 복사해 **작업공간 파일을 읽도록** 바꿔 씁니다. 거기 `render.jsx`에 `6-consultation.html`(③④⑤⑦ 경계 사례, 치루 유형 1·2·3·5개, 예전 저장값)을 더했고, `serve.cjs`로 `http://127.0.0.1:9282/out/…`에 띄워 브라우저에서 `.sheet` 높이를 잽니다(1017px 이하면 한 장). `out-base/`는 develop 코드로 같은 경우를 찍은 비교용입니다. scratchpad라 사라질 수 있습니다 — 사라지면 이 설명대로 다시 만드세요.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Consultation.jsx`
- `frontend/src/documents/surgical-records.jsx · op-figures.jsx · op-plates.js` — 수술기록지
- `frontend/src/documents/referral.jsx` — 의뢰서

### 서버

| 메서드 · 경로 | 권한 | 하는 일 |
|---|---|---|
| `POST /api/consultations` | `consultation` | 내원의 진료 열기/만들기 `{visit_id, patient_id, department_id}` |
| `PUT /api/consultations/:id` | `consultation` | 기록·바이탈 저장 (보내지 않은 칸은 NULL) |
| `PUT /api/consultations/:id/complete` | `consultation` | 진료·내원 완료 |
| `GET /api/consultations/:id/diagnoses` | 로그인 | 진단 목록 (화면 미사용) |
| `POST /api/consultations/:id/diagnoses` · `DELETE /diagnosis/:dxId` | `consultation` | 진단 추가·삭제 (화면 미사용) |
| `GET /api/consultations/:id/prescriptions` | 로그인 | 처방 목록 |
| `POST /api/consultations/:id/prescriptions` | `consultation` | 처방 추가 |
| `GET /api/consultations/visit/:visitId/prescriptions` | 로그인 | 내원 단위 처방 (문서용) |
| `PUT` · `DELETE /api/consultations/prescription/:rxId` | `consultation` | 처방 고치기 · 지우기. 조제된 줄은 **409** |
| `GET /api/consultations/:id/orders` | 로그인 | 오더 목록 |
| `POST /api/consultations/:id/orders` | `consultation` | 오더 추가(+워크리스트) |
| `PUT /api/consultations/order/:orderId` | `consultation` | 오더 고치기 |
| `DELETE /api/consultations/order/:orderId` | `consultation` | 오더 지우기(시작 전 워크리스트 포함). 결과가 생긴 오더는 **409** |

권한 칸의 `consultation`은 직원 권한(모듈) — 없으면 403. 409 본문은 `{ error: 'Prescription already dispensed' }` 또는 `{ error: 'Order already has a result' }`이며 화면이 이 문자열로 번역합니다.
| `GET /api/order-sets[?department_id=]` · `GET /:id` | 로그인 | 세트 + 항목 |
| `POST` · `PUT /:id` · `DELETE /:id /api/order-sets` | `settings` | 세트 관리 |
| `GET /api/documents/patient/:id` · `GET /:id` | 로그인 | 발급 이력 · 단건 |
| `POST /api/documents` · `POST /:id/void` | 로그인 | 발급 · 취소 |

진료 화면이 **다른 모듈의 API**도 부릅니다: `GET /visits/today`(접수), `GET /patients/:id/history`(접수), `GET /admin/drugs` · `/admin/order-codes` · `/admin/phrases` · `/admin/clinic`(설정), `GET /pacs/viewer-url` · `PUT /pacs/reading/:id` · `GET /pacs/readings/patient/:id`(PACS, 마지막은 `RadiologyReadings` 안), `GET /lab/patient/:id/results`(임상병리, `LabResults` 안).

### 공용 부품

- `frontend/src/components/DocumentModal.jsx` · `documents/shared.jsx` · `documents/registry.js` — 공용 문서 엔진, 진료 주관. 쓰는 곳: `Consultation.jsx`(document·chart), `Payment.jsx`(document·prescription·chart 읽기), `Pharmacy.jsx`(prescription·chart 읽기), `Lab.jsx`(chart 읽기), `Registration.jsx`(chart 읽기)

### DB 테이블

마이그레이션 `001_schema.sql`(기본), `004_order_sets.sql`, `010_document_log.sql`, `012_dispense_type.sql`.

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `consultation` | `visit_id`(UNIQUE), `patient_id`, `doctor_id`, `department_id`, `consult_date`, `subjective`·`objective`·`assessment`·`plan`(화면 미사용), `note_text`, `bp_systolic`·`bp_diastolic`·`temperature DECIMAL(4,1)`·`pulse`·`spo2`·`respiratory_rate`, `weight`·`height`(화면 미사용), `status` ∈ `in_progress`·`completed`·`signed` | `signed`는 쓰는 곳 없음 |
| `diagnosis` | `consultation_id`(CASCADE), `icd_code`, `diagnosis_name`, `diagnosis_type`(기본 `primary`), `sort_order` | 화면 미사용 |
| `prescription` | `consultation_id`(CASCADE), `drug_id`, `drug_code`, `drug_name`, `dose VARCHAR(20)`, `frequency`, `days`, **`route VARCHAR(10)`**, `total_qty`, `unit_price`, `memo`, `dispense_type`(`internal`·`external`, 012), `status` ∈ `ordered`·`dispensed`·`cancelled`, `dispensed_by/at` | `status`·`dispense_type`은 약국이 바꿈 |
| `order_item` | `consultation_id`(CASCADE), `visit_id`, `patient_id`, `order_code_id`, `order_code`, `order_name`, `code_type` ∈ `lab`·`imaging`·`procedure`(·`fee`), `dose`, `frequency`, `days`, `quantity`, `unit_price`, `pacs_modality`, `station_ae`, `body_part`, `worklist_status`, `worklist_sent_at`, `scheduled_date`, `result_text`·`result_by`·`result_at`(영상 판독), `ordered_by`, `status`(검사 완료 등), `memo` | |
| `worklist_log` | `order_item_id`(CASCADE, 007), `modality`, `accession_no`, `study_instance_uid`, `scheduled_date/time`, `status` | 영상 장비 워크리스트 |
| `lab_result` | `order_item_id`(**CASCADE**, 014) … | 임상병리 소유. 오더를 지우면 같이 지워짐 |
| `order_set` | `name`, `group_name`, `department_id`, `description`, `is_active`, `sort_order` | 004 |
| `order_set_item` | `set_id`(CASCADE), `kind` ∈ `drug`·`order`, `drug_id`, `order_code_id`, `code`, `name`, `dose`, `frequency`, `days`, `route`, `quantity`, `sort_order` | 단가 없음 |
| `document_log` | `doc_no`(UNIQUE, `D26-00001`), `template_code`, `template_name`, `patient_id`, `visit_id`, `consultation_id`, `lang`, `payload JSONB`, `issued_by/at`, `voided`, `void_reason`, `voided_at/by` | 010 · `generate_doc_no()` · `document_no_seq` |
| `phrase_dictionary` | `category`, `text`, `text_en`, `text_fr`, `sort_order`, `is_active` | 설정 소유, 진료는 읽기만 |

## 5. 다른 모듈과의 연결

```
 접수 visit(status registered/waiting)
   │  진료가 환자를 열면 → visit.status = in_progress
   ▼
 진료 consultation ── prescription ──────────────┐
   │                └─ order_item ─┬─ code_type=lab ────────┐
   │                               ├─ worklist_enabled ─▶ worklist_log ─▶ PACS 워크리스트 (즉시)
   │                               └─ 그 밖(처치 등)          │
   │  「완료」 → consultation.status = completed,             │
   │            visit.status = completed                     │
   ▼                                                         ▼
 약국  /pharmacy/pending : 완료된 오늘 진료의 status='ordered' 처방     임상병리 /lab/pending : 완료된 오늘 진료의 lab 오더
 수납  /billing/pending : 완료된 내원. 진찰료(visit_type → C01~C04) + 처방(외부 조제 제외) + 오더(quantity × unit_price)
```

- **약국** — 진료가 **완료**되어야 보입니다(`pharmacy.routes.js` `/pending`: `c.status='completed' AND v.visit_date=CURRENT_DATE`). 조제하면 `prescription.status='dispensed'`와 재고 차감. 약국이 `dispense_type`을 `external`로 바꾸면 수납에서 빠지고 원외처방전(`external-rx.jsx`, 약국 담당)으로 나갑니다.
- **임상병리** — 진료 **완료** 후 `code_type='lab'`이고 완료·취소가 아닌 오더(`lab.routes.js` `/pending`). 결과는 `lab_result`, 오더는 `status='completed'`.
- **PACS** — 워크리스트는 **오더를 넣는 순간** 만들어집니다(완료를 기다리지 않음). `worklist.routes.js`가 상태를 받아 `order_item.worklist_status`를 갱신. 판독은 `order_item.result_text`(PACS 세션의 `pacs.routes.js`).
- **수납** — `visit.status='completed'`가 기준. 청구 뒤에 처방·오더가 바뀌면 `live_total`과 청구액을 비교해 **추가 청구 / 환불**로 다시 목록에 올립니다(`billing.routes.js` `/pending`). 그래서 완료 뒤 수정은 수납에 반영됩니다. 약국이 조제한 처방은 고치거나 지울 수 없게 잠겨 있어(7절 ⑧), 재고와 청구가 어긋나지 않습니다.
- **통계** — 약 사용량은 `prescription`을 `consultation`과 조인. 의사별 매출은 **내원의 `doctor_id`** 기준(`consultation.doctor_id` 아님).
- **접수** — 과거 내원 목록 `GET /patients/:id/history`는 `consultation`을 날짜순으로 줍니다.

## 6. 설정 항목

진료 화면에 영향을 주는 설정 (모두 **설정** 화면):

| 설정 | 어디에 쓰이나 |
|---|---|
| **약품** (`drug`) — 코드, 이름, 기본 용량·횟수·일수·용법, 단가, 단위 | 약 자동완성·약 검색, 처방 추가 시 기본값 |
| **오더 코드** (`order_code`) — 종류(`lab`·`imaging`·`procedure`·`fee`), 가격(`price_clinic`), 모달리티, 워크리스트 사용, 부위, 기본값 | 검사·영상 자동완성(`fee`는 제외), 오더 단가, 워크리스트 생성 |
| **문장사전** (`phrase_dictionary`) | 진료 기록 문장. 화면의 분류 버튼은 **코드에 고정**(All · General · Internal · Surgery · Peds · OBGYN)이라 다른 분류는 「All」에서만 보임 |
| **약속처방** (`order_set`) | 오른쪽 약속처방 탭 |
| **오더연동 → PACS** (`pacs_config.auto_create_worklist`, `pacs_viewer_url`) | 워크리스트 자동 생성 여부, 영상 뷰어 주소 |
| **병원 정보** (`clinic` — 이름 ko/en/fr, 주소, 전화, 이메일) | 모든 인쇄 문서의 머리 |
| **직원 권한** — `consultation` | 진료 메뉴 접근, 영상 판독 쓰기 |

진료 모듈 자체의 설정 칸은 없습니다.

## 7. 알려진 문제 · 제약

### 7.1 수술기록지 — 2026-09-29 총괄 검토에서 확인된 것

(수술기록지를 실제 인쇄 폭으로 렌더링해서 찾았습니다. ①②는 `be642c9`에서 고쳐졌습니다 — 8절.)

| # | 심각도 | 문제 | 어디 | 확인 방법 |
|---|---|---|---|---|
| ③ ✅ 09-29 | 중간 | **예/아니오를 둘 다 체크할 수 있다.** `checks` 입력이 전부 복수 선택이라 `거즈 카운트: Yes, No`가 그대로 인쇄된다. 부위(Right·Left·Bilateral), JP 배액관(None + RLQ), 동반 병변(None + Skin tag), 삼출액 양처럼 서로 배타적인 그룹 전부 해당. → **고침**: 필드별 `single`·`noneOption` 규칙(3.6절 표) | `DocumentModal.jsx` 219-238 · `surgical-records.jsx` 옵션 정의 | 렌더링 · 코드 |
| ④ ✅ 09-29 | 중간 | **크기 칸을 안 적어도 인쇄된다.** 기본값 `' ×  ×  cm'`이 `trim()` 후에도 빈 문자열이 아니라 「채워진 칸」으로 잡힌다. 연부조직 `massSize` · 유방 `lesionSize` · 충수 `appySize`. → **고침**: 기본값 그대로인 칸은 빈 칸으로 봄 | `surgical-records.jsx` 52(필터), 197·230·257(기본값) · `DocumentModal.jsx` 61(기본값 채우기) | 렌더링 · 코드 |
| ⑤ ✅ 09-29 | 중간 | **치루 유형을 두 개 고르면 표와 그림이 다르다.** 표에는 두 개, 단면도는 `FIS_ORDER`상 첫 번째 하나만. → **고침**: 한 그림에 모든 유형을 무늬별로 + 범례 | `op-figures.jsx` 225-226 `FistulaSection` | 렌더링 · 코드 |
| ⑥ ✅ 09-29 | 중간 | **프랑스어 화면에서 그림과 선택값이 영어다.** 선택값(`Yes`·`No`·`3 o'clock`·`Skin tag`)과 그림 글자(`Pile position (lithotomy view)`·`pre-op`·`● internal ○ external`·`tract type not selected`·`IAS/EAS/levator ani/dentate`)가 영어. 시계의 `R`·`L`은 프랑스어 관례로 `D`·`G`. **저장값을 바꾸지 말고 인쇄할 때 번역해야 함**(3.5절)  → **고침**: 저장값은 영어 그대로, FR에서만 표시를 번역(`op-terms.js`, 3.6절). 용어는 현지 의사 확인 필요 | `op-figures.jsx` 77-81·114·239-254·348-359 · `surgical-records.jsx` 옵션 | 렌더링 · 코드 |
| ⑦ ✅ 09-29 | 중간 | **소견 기본 문장의 `[anesthesia]` `[lithotomy/jackknife]` 같은 괄호**를 안 고치면 서명 기록에 그대로 인쇄된다. 열상·제왕절개·포경의 `[N]`·`[7-10]`·`[male/female]`도 같음. → **고침**: 칸 아래 경고 + 발급 때 확인 창 (기본 문장 자체는 의학 문장이라 그대로) | `surgical-records.jsx` 174-175·206·221·250·265·280·295·306·314 | 코드 |

**인쇄 여유**: 모든 수술기록지가 A4 한 장에 들어가지만, 충수절제술은 상세 10줄 + 소견 4줄 + 술후 계획을 다 채우면 여유가 **9px**뿐이다. 그림을 더 줄이면 위치 이름 글자가 8px 밑으로 내려가서 여기서 멈췄다.

### 7.2 진료 세션이 코드를 읽고 찾은 것 (2026-09-29)

모두 코드를 읽어 찾았습니다. **고친 것은 # 칸에 ✅**와 날짜를 붙이고, 고치면서 격리 스택에서 재현·확인했습니다. 나머지는 아직 화면에서 재현하지 않았습니다.

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| ⑧ ✅ 09-29 | **높음** | **약국이 조제한 처방을 의사가 고치거나 지울 수 있다.** 서버가 `prescription.status`를 보지 않는다. 지우면 수납은 환불로 잡지만 **재고는 돌아오지 않고**, 고치면 청구 수량만 바뀐다 — 재고와 장부가 어긋난다. 화면 처방 표에도 조제 여부가 안 보인다. → **고침**: 서버가 409로 거절, 화면은 🔒·「조제됨」 표시 | `consult.routes.js` 165-190 · `pharmacy.routes.js` 126-185(조제·재고 차감) · `Consultation.jsx` 497-510 |
| ⑨ ✅ 09-29 | **높음** | **결과가 들어간 검사 오더를 지우면 결과도 같이 사라진다.** `lab_result.order_item_id`가 `ON DELETE CASCADE`. 영상 오더는 촬영·판독 뒤에도 지워지며 `worklist_log`(accession)와 판독문(`order_item.result_text`)이 함께 사라진다. 확인 창도 없다. → **고침**: 결과·판독·촬영 시작이 있으면 409, 화면은 🔒. 모든 ✕에 확인 창 | `consult.routes.js` 296-311 · `014_lab.sql` 20 · `007_worklist_cascade.sql` · `Consultation.jsx` 514 |
| ⑩ | 중간 | **진단 입력 화면이 없다.** `diagnosis` 테이블·API는 있지만 화면이 부르지 않는다(`dxList` 상태만 선언). 의뢰서 진단명은 손으로 쓰고, 통계는 진단을 셀 수 없다 | `Consultation.jsx` 21 · `consult.routes.js` 97-123 |
| ⑪ ✅ 09-29 | 중간 | **진료 API에 모듈 권한 검사가 없다.** 로그인만 하면 약국·수납·검사 직원 계정으로도 진료를 열고 처방을 넣고 지울 수 있다(화면 메뉴로만 막힘). 임상병리는 `permMiddleware('lab')`로 막고 있다. → **고침**: 진료 쓰기 API에 `consultation` 권한. *남음*: 문서 발급 취소는 여전히 누구나 가능(5개 화면 공용이라 따로 정해야 함) | `consult.routes.js` 9 · 비교 `lab.routes.js` 18 · `document.routes.js` 62 |
| ⑫ | 중간 | **「외래 내역 선택」으로 과거 내원을 열면 편집 상태로 열린다.** 그 내원에 진료가 없었으면(취소된 내원 포함) **오늘 날짜로 진료가 새로 생기고 내원이 `in_progress`로 바뀐다** — 취소된 내원이 되살아난다. 진료가 있었으면 지난 처방에 오더를 추가할 수 있고, 청구가 없던 지난 내원이면 수납 목록에도 안 올라간다 | `Consultation.jsx` 671-673 → 91-99 · `consult.routes.js` 33-47 · `billing.routes.js` 57-62 |
| ⑬ | 중간 | **저장할 때마다 `subjective`·`objective`·`assessment`·`plan`·`weight`·`height`가 NULL이 된다.** 서버가 몸체에 없는 칸도 덮어쓰고, 화면은 `note_text`와 바이탈만 보낸다. 과거 화면은 `note_text || subjective`로 보여 주므로 예전 S/O/A/P 칸 데이터가 있었다면 한 번 저장에 지워진다. **확인 필요**: 실제 DB에 그 칸을 쓴 기록이 있는지 | `consult.routes.js` 59-67 · `Consultation.jsx` 142·169-177·610 |
| ⑭ | 중간 | **검사·처치 오더의 Tms·Day 칸은 청구에 안 들어간다.** 청구는 `quantity × unit_price`뿐인데 화면은 Tms·Day를 고칠 수 있게 보여 준다. 주사 3회 × 5일로 적어도 1회분만 청구될 수 있다. **확인 필요**: 수납 화면이 항목을 만드는 방식(수납 세션) | `Consultation.jsx` 517-519 · `billing.routes.js` 34 |
| ⑮ | 낮음 | **용법(Usage) 칸이 10자를 넘으면 저장이 500 에러**(`prescription.route VARCHAR(10)`). 약에 기본 용법이 없으면 용법에 `'TID'`(횟수 표기)를 넣는다 | `001_schema.sql` prescription · `Consultation.jsx` 246·506 |
| ⑯ | 낮음 | **프랑스어 화면에 영어·한국어가 남는다** — 대기 상태값, 문장사전 분류 버튼, 문장 본문(`text_fr` 안 씀, 기본 문장도 영어뿐), 진료 기록 안내 글(게다가 `
`이 줄바꿈이 안 되고 글자로 보임 — JSX 속성 문자열이라서), `DRUG`, `Error:`, 팝업 차단 안내(한국어만). 문서 기본 문장(소견·동의서 위험)도 영어뿐 — 의학 문장이라 실장님 확인 필요 | `Consultation.jsx` 428·474·566·573·584 · `shared.jsx` 179 · `003_seed_data.sql` 76- |
| ⑰ | 낮음 | **문서 발행일이 UTC 기준**이라 마다가스카르(UTC+3)에서 0~3시에 발급하면 전날 날짜가 찍힌다 | `DocumentModal.jsx` 55 |
| ⑱ | 낮음 | **진료의 담당 의사가 「처음 연 사람」으로 기록된다.** 관리자·간호사가 먼저 열면 그 사람이 과거 내원·약국·검사 목록에 의사로 나온다. 문서 서명은 반대로 **내원의 담당의** 이름 | `consult.routes.js` 46 · `DocumentModal.jsx` 56 |
| ⑲ | 낮음 | 오더를 넣을 때마다 `pacs_config`를 `CREATE TABLE IF NOT EXISTS` — 001이 이미 만든 테이블이라 효과 없는 옛 코드이며, 옛 병원 기본값(`Yonsei Shintong Clinic`, `192.168.0.222`)이 남아 있다 | `consult.routes.js` 224-230 |
| ⑳ | 낮음 | 약속처방을 **진료과 구분 없이 전부** 보여 준다(API는 과 필터 지원). 환자가 없을 때 안내 문구가 접수 화면용(「신규 환자를 입력하세요」) | `Consultation.jsx` 86·533 |
| ㉑ ✅ 09-29 | **높음** · 총괄 | **날짜가 하루 앞당겨 보인다 (시스템 전체).** _총괄이 고침(`7ad4387`): `backend/src/config/database.js`에서 DATE(1082)를 받은 문자열 그대로 넘김. 실행 중인 EMR에서도 재현됐었음(DB `2023-05-05` → API `2023-05-04T21:00:00.000Z`), 고친 뒤 API·접수 화면 모두 `2023-05-05`._ DB의 `DATE`(생년월일·내원일·진료일)를 `pg`가 JS `Date`(현지 자정)로 바꾸고, JSON은 UTC로 내보내 `1990-01-01` → `1989-12-31T21:00:00.000Z`가 되고, 화면은 `split('T')[0]`로 자른다 — **생년월일·과거 진료일·인쇄 문서의 생년월일이 모두 하루 이르다.** 격리 스택(TZ=`Indian/Antananarivo`, 실행 중인 EMR과 같은 `.env`)에서 재현. 실행 중인 EMR은 건드리지 않아 직접 확인하지 못했지만 같은 설정이다. 고칠 곳은 `backend/src/config/`의 `pg` 타입 파서(1082 = DATE를 문자열로) — 총괄 파일 | API 응답 `GET /patients/1` · `docker-compose.yml` 49 · `Consultation.jsx` 401 · `shared.jsx` `fmtDate` |
| ㉒ ✅ 09-29 | 중간 · 임상병리 부탁 | **검사 오더가 결과 전부터 「completed」로 보였다.** 상태 칸이 영상용 `worklist_status`를 보여 주는데, 워크리스트 없는 오더는 처음부터 `completed`로 저장된다. → **고침**: 검사 오더는 `o.status`(결과 대기/결과 있음/취소됨), 워크리스트 오더는 그대로, 그 밖은 비움(3.1절) | `Consultation.jsx` `orderStatus` · `consult.routes.js` POST /:id/orders · 임상병리 위키 7절 9 |

### 7.3 제약 (버그는 아니지만 고칠 때 알아야 할 것)

- **발급한 문서는 지금 양식 코드로 다시 그려진다**(3.5절). 양식·옵션 문자열을 바꾸면 옛 문서 재출력이 바뀐다. 옵션 문자열은 저장 키이므로 바꾸지 않는다.
  - 2026-09-29 ③④⑤⑦ 이후 옛 문서 재출력이 이렇게 달라진다: 크기 칸을 손대지 않고 발급한 문서는 「크기: × × cm」 줄이 사라지고, 치루 유형을 두 개 고른 문서는 단면도에 두 유형이 모두 그려진다. 예/아니오를 둘 다 체크해 저장된 문서는 저장된 그대로(`Yes, No`) 인쇄된다.
- 문서 엔진 변경은 5개 화면에 영향 — 바꾸면 인계 노트 「공용 파일 변경」에 적는다.
- 처방 용량 `dose`는 숫자만 받는다(`badAmounts`). `1/2 tab` 같은 표기는 안 된다.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | **수술기록지 프랑스어 표시(⑥)** — 체크 칸·인쇄 선택값·그림 글자를 FR에서만 번역(`op-terms.js`, 저장값은 영어 그대로), 시계·유방 D/G, 충수 그림 틀을 프랑스어 단어에 맞게. **검사 오더 상태 칸(㉒)** — 결과 전 「completed」 대신 「결과 대기」. 번역 키 `cs_labPending`·`cs_labDone`·`cs_labCancelled` | (이 커밋) |
| 2026-09-29 | **수술기록지 ③④⑤⑦** — 체크 칸 하나만/None 배타 규칙(공용 `DocumentModal`의 `checks` 입력), 손대지 않은 크기 칸 인쇄 안 함, 치루 단면도에 고른 유형 전부(무늬+범례), 소견의 `[괄호]` 경고·발급 확인. 모든 수술기록지 한 장 유지(충수 빡빡한 경우 1008px 그대로, 치루 유형 5개 최악 991px) | `a6ee24e` |
| 2026-09-29 | **날짜 하루 앞당김(㉑) 고침** — 총괄. 생년월일·진료일이 API에서 UTC로 바뀌어 하루 이르게 보이고, 접수 화면에서 환자 정보를 저장하면 그 이른 날짜가 다시 저장되던 문제 | `7ad4387` |
| 2026-09-29 | **기록 보호(⑧⑨⑪)** — 조제된 처방 수정·삭제 거절, 결과·판독·촬영이 생긴 오더 삭제 거절(409), 진료 쓰기 API에 `consultation` 권한, ✕에 확인 창, 잠긴 줄에 🔒·「조제됨」. 번역 키 `cs_confirmRemove`·`cs_dispensed`·`cs_rxLocked`·`cs_orderLocked` | `d1f473e` |
| 2026-09-29 | 위키를 코드 기준으로 작성 — 화면 사용법, 기능 상세, API·테이블, 다른 모듈 연결, 새로 찾은 문제 ⑧~⑳ (코드 변경 없음) | `38116c7` |
| 2026-09-29 | 치루 단면도를 해부학적으로 다시 그림 — 유형마다 지나는 구조물(내·외괄약근, 거근)이 다르게. 그림 있는 수술기록지 5종이 A4 두 장으로 넘어가던 것을 한 장으로 — 상세표와 그림을 한 줄에, 치루 시계 2개를 Goodsall 방식 1개로 | `be642c9` |
| 2026-07-30 | 수술기록지 6종(연부조직·탈장·충수·유방·치질·치루) 양식과 그림. 체크박스 선택이 인쇄 그림을 움직임 | `be642c9` |
