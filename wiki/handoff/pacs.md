# PACS 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 의견: 영상 오더에도 「결과 있는 오더 취소」(결정 3-B)를 켤지 · DB 시간대 확인

- **상태**: 보류 — 의견만(코드 변경 없음). 켤지는 총괄·실장님 결정, 켜면 아래 PACS 몫을 만들겠음
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5f4fded`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **바탕** (임상병리 설계 `943909c`): 진료 화면에서 결과 있는 오더를 지우려 하면 409 → 「취소로 표시」 → `POST /api/consultations/order/:id/cancel` → `order_item.status='cancelled'`(+ `cancelled_at/by/reason`). 결과는 남기고 목록·청구에서 뺌.

### 추천: **켠다** — 영상도 같은 방식으로. 단, 아래 규칙으로

영상 오더가 「결과 있음」이 되는 경우는 지금 코드상 둘입니다(`consult.routes.js` DELETE의 409 조건): **영상이 도착함**(`worklist_log.status`가 `completed` — `/study-arrived`가 바꿈, 또는 `in_progress`) · **판독이 있음**(`order_item.result_text`). 이런 오더는 지금 지울 수 없어서, 잘못 낸 경우 계속 청구·목록에 남습니다. 검사와 같은 문제이고 같은 해법이 맞습니다.

| 질문 | 추천 | 이유 |
|---|---|---|
| **① `worklist_log`·`worklist_status`와 맞추기** | 취소 API가 같은 트랜잭션에서 `UPDATE worklist_log SET status='cancelled' WHERE order_item_id=$1 AND status IN ('scheduled','in_progress')` 와 `order_item.worklist_status='cancelled'`(워크리스트 항목을 취소한 경우만). **이미 `completed`(영상 도착)인 워크리스트 줄은 그대로 `completed`** | `worklist_log.status`는 「장비 워크리스트 항목의 상태」라는 사실 기록입니다. 이미 찍힌 검사를 「취소」로 고쳐 쓰면 「찍었다」는 사실이 사라짐. 오더가 취소됐다는 것은 `order_item.status`가 말함 |
| **② 이미 들어온 영상·판독이 어떻게 보일지** | 지우지 않음. 「🩻 판독소견」 목록에 **회색 + 「Annulé (취소됨)」 + 이유**, 영상 도착 표시·환자번호 경고는 그대로, 「Voir image」로 계속 볼 수 있음. 영상 창 머리에도 「취소된 오더의 영상」 한 줄. Orthanc 영상은 손대지 않음 | 기록(의무기록)이므로 남김 — 검사 결과를 회색으로 남기는 것과 같음. 영상을 지우는 것은 되돌릴 수 없고 EMR 밖(Orthanc) 일이라 이 기능에 넣지 않음 |
| **③ 판독 저장** | 취소된 오더에는 **판독 저장 거절(409)**, 화면은 「이 영상 검사는 진료실에서 취소되었습니다」 | 임상병리가 취소된 검사에 결과 저장을 거절하는 것과 같게. 설명은 취소 이유 칸에 |
| **④ 브리지가 장비 워크리스트에서 빼는지** | **코드 변경 없이 빠짐** — 피드가 `wl.status='scheduled'`만 주므로(`pacs.routes.js` worklist-feed) ①로 `cancelled`가 되면 다음 바퀴(15초 안)에 `.wl` 삭제 | 확인함(코드). 오더 삭제 때와 같은 길 |
| **⑤ 취소된 항목에 영상이 도착하면** | 두 경우. (가) 취소 **전에** 영상이 이미 Stable → 이미 `completed`라 ①에서 안 바뀜. (나) 취소 **뒤** 도착(방사선사가 장비에서 이미 골라 두고 찍음) → 브리지는 피드에 있는 줄만 묻으므로 **보고하지 않음**. 영상은 Orthanc에 그 UID로 들어가 있어서 판독 목록의 「Voir image」로는 **보임**(뷰어는 UID만 씀), 「도착」 표시만 없음. `/study-arrived`의 `cancelled`는 덮지 않는 조건은 그대로 둠(방어용) | (나)는 드물고 해가 없음 — 영상은 남고 취소된 오더에 붙어 보임. 보고까지 하게 하려면 피드 범위를 넓혀야 해서(P-6과 같은 일) 지금은 안 함 |
| **⑥ 청구** | 수납이 `o.status <> 'cancelled'`를 넣으면 영상 오더도 같이 빠짐 — PACS 쪽 할 일 없음 | 같은 `order_item` |
| **⑦ 아직 안 찍은 오더** | **지금처럼 삭제** (`scheduled`이고 판독 없음 → 409 아님) | 가장 흔한 「잘못 냄」. 취소 줄이 목록에 남지 않게 |

**⑦의 남는 위험** — 「찍었지만 EMR이 아직 모름」: 영상은 Orthanc에 들어왔는데 Stable 전(약 60~75초)이거나 브리지가 도착 확인을 못 하는 동안에는 워크리스트가 `scheduled`라 **오더를 지울 수 있고**, 그 영상은 어느 오더에도 안 붙습니다(Orthanc에는 남음 — P-4의 「연결 안 된 영상」과 같은 처지). 특히 **PACS 브리지를 합치기 전(과도기)에는 도착 확인이 아예 없어** 영상이 있어도 늘 지워집니다. 그래서 **영상 오더에 이 기능을 켜는 것은 PACS 저장소를 합친 뒤(재부팅 절차서 ②)** 로 하기를 권합니다. 더 막고 싶으면 「워크리스트로 보낸 영상 오더는 삭제 대신 늘 취소」로 할 수 있지만, 잘못 낸 오더마다 회색 줄이 남아 목록이 지저분해져서 추천하지 않음.

**⑧ 환자번호가 틀린 영상(`patient_check` mismatch)을 바로잡는 절차와의 관계**

- **이 환자의 영상이 맞음**(번호만 오기) → 취소할 일 없음. 판독 쓰고 한 줄 남김(위키 2.6 ④).
- **다른 환자의 영상임** → 이 기능이 **첫 단계**가 됩니다: ① 이 환자(A)의 영상 오더를 **취소**(이유: 「영상이 다른 환자 26-xxxxx의 것」) → A의 청구에서 빠지고, 잘못 붙은 영상은 회색 줄에 경고와 함께 기록으로 남음 ② A에게 필요하면 **새 영상 오더** → 다시 촬영(의사 판단) ③ 그 영상을 실제 주인(B)의 오더에 옮겨 붙이는 것은 **이 기능 밖** — EMR에 영상 옮기기 기능이 없고, Orthanc에서 환자 정보를 고치면(`/modify`) 기본으로 UID가 새로 만들어져 링크가 끊김. P-4 2단계(「연결 안 된 영상」을 오더에 붙이기)와 함께 설계할 일.
- 위키 2.6 ⑤(「관리자에게 알림, 다시 촬영은 의사 판단」)는 이 기능이 들어가면 「오더를 취소로 표시(이유에 적기) → 필요하면 다시 오더」로 바꿀 수 있음.
- 주의: 취소된 A의 기록에 B의 영상이 계속 보입니다(회색·경고). 개인정보 면에서 거슬리면 「취소된 오더의 영상은 버튼을 숨김」도 가능 — 추천은 **보이게 둠**(무엇이 잘못 붙었는지가 기록의 요점이라서).

**작업 크기**

| 세션 | 할 일 | 크기 |
|---|---|---|
| **진료** | 취소 API가 `code_type='imaging'`이면 ①의 UPDATE 두 줄을 같은 트랜잭션에서(또는 PACS가 내보내는 함수 `cancelWorklistForOrder(client, orderItemId)`를 부름 — 원하면 PACS가 만듦). 영상 창 머리에 취소 표시(`viewer-url`이 줄 `order_status` 사용). 판독 저장 409 처리(안내 후 다시 불러오기) | 작음 |
| **PACS** | `readings/patient`·`viewer-url`에 `order_status`·`cancelled_at`·`cancel_reason` 추가, `PUT /reading` 취소된 오더 409, `RadiologyReadings` 회색·「Annulé」·이유(번역 키 1~2개, `cs_wsCancelled`/`cs_labCancelled` 재사용 가능), (선택) `cancelWorklistForOrder` 함수, 위키 2.4·2.6·3절. **브리지·마이그레이션 변경 없음** | 작음 (반나절, 격리 스택 + 가짜 Orthanc로 확인 가능 — PACS 격리 스택 불필요) |
| 순서 | 진료 마이그레이션·취소 API 뒤, **PACS 저장소 합친 뒤** 영상에 켬 | |

### DB 연결 시간대 (총괄 `23bde17`) — 코드로 확인

- 워크리스트 날짜: 오더 저장 때 `worklist_log.scheduled_date = CURRENT_DATE`(`consult.routes.js`), 피드 기본값 `todayLocal()`(Node, `TZ`), `/api/worklist`·`dicom-mwl`의 `CURRENT_DATE` — **이제 모두 현지(Indian/Antananarivo)** 로 같은 날을 가리킴 ✓.
- `scheduled_time = CURRENT_TIME`: 이제 현지 시각 ✓. **바뀐 점**: 전에는 연결이 UTC라 `.wl`의 예정 시각이 3시간 이르게 들어갔을 것(장비는 보통 날짜로 거르므로 영향 작음). 전에 만든 줄은 UTC 시각 그대로.
- AccessionNumber·UID의 날짜는 JS `todayLocal()` ✓. `dicomDate('YYYY-MM-DD')`(DATE는 이제 문자열)는 UTC 자정으로 읽고 현지(+3)로 적으므로 같은 날 ✓ — 시간대가 UTC보다 늦은 곳(음수)이면 하루 당겨지는 구조이므로 다른 병원에 쓸 때 주의.
- **새로 찾은 작은 문제 (P-22 [낮음])**: 판독 날짜 표시 — `result_at`(TIMESTAMPTZ)은 JSON에서 UTC 시각(`…Z`)으로 나가는데 `RadiologyReadings.jsx`의 `ymd()`와 진료 영상 창이 `T` 앞을 잘라 씀 → **현지 자정~03:00에 쓴 판독은 전날 날짜로 보임**. DB 연결 시간대와 무관(JSON 직렬화 문제). 고치는 법: 화면에서 `new Date(v).toLocaleDateString('en-CA')`. PACS 쪽 한 줄 + 진료 영상 창 한 줄 — 원하시면 바로 고치겠음.
- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 코드 읽기 — `laboratory.md` 설계(`943909c`), `consult.routes.js` DELETE 409 조건·오더 저장 INSERT, `pacs.routes.js` 피드 WHERE·`/study-arrived`의 `cancelled` 조건·`viewer-url`, `database.js` `options: -c TimeZone`, `RadiologyReadings.jsx` `ymd()`.
- **다른 세션에 부탁**: (켜기로 하면) 진료 — 위 표의 진료 몫.

## 2026-09-29 — 서버 권한 S2를 PACS 라우트에 적용 (P-21)

> **총괄 확인 (2026-09-29)**: S2 `17e3404` 합침(`b9d35a4`) + 실행 중 EMR 반영. 합친 뒤 실행 중 브리지 heartbeat·피드 200 계속. 역할별 확인 결과 표와 일치.

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `48059dd`을 ff로 당긴 뒤, S1 들어간 판 기준). **PACS 저장소** — 없음
- **한 일** (실장님 결정 S2, 설정 세션 「S2 초안」 표대로):
  - `GET /api/pacs/test` → `settings`
  - `GET /api/pacs/viewer-url` → `consultation` — 수납 화면의 판독 목록(`Payment.jsx`)은 `onOpen` 없이 띄워 영상 버튼이 없음을 확인하여 `payment`는 넣지 않음
  - `GET /api/pacs/readings/patient/:id` → `consultation`·`payment`
  - `PUT /api/pacs/reading/:id` → 이미 `consultation` (그대로)
  - `GET /api/worklist` → `consultation`
  - `PUT /api/worklist/:id/status` → 브리지 토큰 그대로, **로그인 경로는 `settings`만**
  - **표 밖 하나 더**: `GET /api/worklist/dicom-mwl`도 같은 모양(브리지 토큰 또는 로그인)이고 부르는 화면이 없는데 환자 이름·생년월일을 내주므로, 로그인 경로를 `settings`로 같이 좁힘. 원치 않으시면 한 줄로 되돌릴 수 있음.
  - `bridgeOrAuth`를 권한을 받는 함수로 바꿈(`bridgeOrAuth('settings')`). 토큰이 맞으면 그대로 통과, 아니면 `authMiddleware`(S1의 async 판) 뒤 `permMiddleware`.
  - 브리지 토큰 경로(`worklist-feed`·`bridge-heartbeat`·`study-arrived`)는 손대지 않음.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, `wiki/modules/pacs.md`(4절 표 권한 칸 + 권한 설명, 7절 P-21 새로 추가, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**:
  - `node --check` 두 파일
  - 격리 스택 9188, 계정 4개로 API 표: 관리자 / 의사(`consultation`) / 수납(`payment`) / 간호사(새 기본값 `pharmacy`·`lab`·`registration`)

    | API | 관리자 | 의사 | 수납 | 간호사 |
    |---|---|---|---|---|
    | GET /pacs/test | 200 | 403 | 403 | 403 |
    | GET /pacs/viewer-url | 200 | 200 | 403 | 403 |
    | GET /pacs/readings/patient/:id | 200 | 200 | 200 | 403 |
    | PUT /pacs/reading/:id | 200 | 200 | 403 | 403 |
    | GET /pacs/config | 200 | 403 | 403 | 403 |
    | GET /worklist | 200 | 200 | 403 | 403 |
    | PUT /worklist/:id/status (로그인) | 200 | 403 | 403 | 403 |
    | GET /worklist/dicom-mwl (로그인) | 200 | 403 | 403 | 403 |

    브리지 토큰으로는 피드·heartbeat·상태 변경·dicom-mwl 모두 200. 로그인 없이는 401.
  - 화면(프랑스어): **의사** — 진료 → Compte-rendu 목록 → Voir image → 영상 창이 열리고 빨간 환자번호 경고. **수납** — 수납 대기 환자 → Compte-rendu 목록(읽기만, 경고 보임). **간호사** — 메뉴가 Enregistrement·Pharmacie·Laboratoire만, 접수에서 환자 이력·약국·검사실을 열어 봄. 세 계정 모두 **네트워크에 403 없음**, 간호사 화면은 PACS API를 부르지 않음.
- **확인 못 한 것**: 실행 중 EMR에서의 확인(총괄 몫). 영상 창 안의 실제 영상(9090이 P-1로 막혀 있어 까만 화면 — 권한과 무관).
- **총괄 확인 요청**: 합친 뒤 실행 중 브리지 heartbeat가 계속 200인지(브리지 토큰 경로는 안 바꿨지만 같은 파일이라).
- **다른 세션에 부탁**: 없음

## 2026-09-29 — 낮은 항목 정리 (P-20·P-11·P-12·P-17·설정 부분 저장), 절차서에 확인 목록

> **총괄 확인 (2026-09-29)**: `890c64a` 합침 + 실행 중 EMR 반영. 코드 검토: 설정 부분 저장이 토큰을 지우지 않음(`COALESCE`), 워크리스트 상태 쓰기에 값 검사·트랜잭션, `arrivals_error` 300자. PACS 저장소 `6c135aa`는 재부팅 당일 절차서 ②에서 합침. P-13은 보류(오프라인 묶음 스크립트와 같이 고쳐야 함 — 총괄 할 일로 적어 둠).

- **상태**: 확인 요청
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `881328e`을 ff로 당긴 뒤)
  - **PACS 저장소** `session/pacs` `6c135aa` — 이제 합칠 것은 `6c135aa` ← `e109157` ← `43bd994` (절차서 ②가 가리키는 맨 위 커밋)
- **한 일**:
  - **P-20** (설정 세션 `9d7e380`과 짝): 브리지가 Orthanc에 못 물을 때 이유를 heartbeat `arrivals_error`로 보냄, `/bridge-heartbeat`가 detail에 저장(300자). 보내는 글자와 로그는 `scrub()`으로 주소 속 `user:pass@`·토큰·Orthanc 비밀번호를 `***`로.
  - **P-11**: `PUT /api/worklist/:id/status` — 허용 값만(400), 없는 항목 404, 한 트랜잭션, `scheduled`→order_item `sent`, completed_at은 completed일 때만. 권한(로그인만)은 그대로.
  - **`PUT /api/pacs/config`**: 보내지 않은 칸은 그대로(`COALESCE`). 전에는 NULL로 덮어써서 일부만 보내면 브리지 토큰이 지워질 수 있었음. 포트 기본값 10004(옛 데모)→4242.
  - **P-12** (PACS): `make_demo.py`·`make_chest5.py`의 옛 Orthanc 비밀번호와 실존 인물 같은 이름·생년월일 제거 → 환경 변수 + 가짜 환자. 옛 값은 git 기록에 남음.
  - **P-17**: 설정 화면 예시 `NAS_IP:8090`→`9090`, `pacsServerHint` 3개 언어의 `8090`→`9090`.
  - PACS `README.md`: 영상은 StudyInstanceUID로만 붙는다고 바로잡음(전에는 「Accession / Study UID」), 도착 확인 단계, 시험 도구 실행법.
  - **P-13은 하지 않고 제안으로 남김**: compose를 `${ORTHANC_PASSWORD:?…}`로 바꾸면 `.env` 없이 시작을 거부해 안전하지만, EMR `offline/pack.ps1`·`pack.sh`(총괄 파일)가 `.env` 없는 PACS 폴더에서 `docker compose build`·`config --images`를 돌려 **오프라인 키트 만들기가 깨짐**을 확인(`docker compose config`로 시험). 되돌림.
  - 절차서 ⑤ 뒤에 **「⑤+ 확인 목록」** — 재부팅 당일 R-1~R-5(뷰어 로그인 P-9, P-18, 서버 상태 창, 연결 시험 버튼, Orthanc 응답), 장비 설치 날 D-1~D-6(장비 설정값, P-8, P-4, 메뉴 이름, 추가 촬영, 경고 표시). ⑤-3 heartbeat 확인에 `arrivals_error` 추가, ②의 기대 커밋을 `6c135aa`로.
- **바꾼 파일**: EMR `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · PACS `bridge/bridge.py`, `bridge/make_demo.py`, `bridge/make_chest5.py`, `README.md`
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — **오더 연동 탭 안**만: 뷰어 주소 칸 예시 글자, `pacsServerHint`의 한국어 기본 문구(번역이 없을 때 쓰는 것) 안의 `8090`→`9090`.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — **기존 키 `pacsServerHint` 한 줄씩**, 숫자 `8090`→`9090`만 (규칙 6: 기존 키 문구 변경).
- **DB 마이그레이션**: 없음 · **번역 키**: 새 키 없음(기존 키 1개 문구만)
- **확인한 방법**:
  - `node --check` 두 라우트, `py_compile` 브리지·시험 스크립트, 프론트 `npm install --no-package-lock` + `npm run build` 통과
  - 격리 스택 9188: `PUT /config`에 뷰어 주소만 보냄 → 토큰 48자·포트·AE·자동생성 그대로. 작업목록 상태 — `bogus` 400, 없는 항목 404, in_progress/completed/scheduled 각각 두 테이블이 맞게(scheduled→sent, completed_at). 처음 짠 SQL이 `inconsistent types deduced for parameter $1`로 500 → 매개변수를 나눠 고친 뒤 통과.
  - 새 브리지를 격리 네트워크에서 실행: Orthanc 비밀번호 없음·Orthanc 없음 → `/api/system/status`의 bridge가 `warn`/`status.bridge.arrivals`, 가짜 Orthanc 정상 → `ok`로 돌아옴. 주소에 비밀번호를 넣은 경우 저장된 detail과 로그에 비밀번호가 안 나옴(가려서 셈).
  - 설정 화면 프랑스어: 예시 `http://NAS_IP:9090`, 안내 「URL web (9090)」.
- **확인 못 한 것**: 진짜 Orthanc(절차서 ⑤-5에서), 시험 스크립트 `make_*`를 진짜 Orthanc에 실제로 돌려 보지는 않음(문법만).
- **총괄 확인 요청**:
  - PACS 쪽 합칠 대상이 `6c135aa`로 늘었습니다 — 절차서 ②에 반영.
  - P-13을 하려면 `offline/pack.ps1`·`pack.sh`에서 PACS `docker compose` 호출 앞에 임시 `ORTHANC_PASSWORD`를 넘기는 변경이 같이 필요합니다. 원하시면 PACS compose 쪽을 바로 만들겠습니다.
- **다른 세션에 부탁**: 없음 (설정 세션의 P-20 받는 쪽과 필드 이름·길이 맞음 — `arrivals_error`, 300자)
- **결정이 필요해 남긴 것**: P-4(격리 스택 허락), P-6(워크리스트를 「오늘」 말고 며칠까지 보일지 — 촬영 절차), P-9(뷰어 계정 분리 — R-1 결과 뒤), P-10(장비 등록 — D-1 뒤), P-13(위), P-14(자체 UID 루트, 선택), P-15(판독 이력·확정 — 화면·DB 구조), P-18(진료 화면 문구와 같이), 2.6의 「다른 환자 영상」 처리 절차(의학적 판단).

## 2026-09-29 — P-1 조치 절차서 (재부팅 당일 총괄용) · `PatientCheck` export

> **총괄 확인 (2026-09-29)**: `2c15a6b` 합침 + 실행 중 EMR 반영. `PatientCheck` export 확인. P-1 절차서는 재부팅 당일 총괄이 이 순서대로 진행.

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `9c7aca9`을 ff로 당긴 뒤). **PACS 저장소** — 없음 (절차서가 합칠 대상은 `43bd994`·`e109157`)
- **한 일**:
  - 아래 **P-1 조치 절차서**. 코드 변경 없음. 절차서 안의 스크립트 두 개는 저장소에 넣지 않고 여기에만 둠.
  - 진료 세션 부탁: `RadiologyReadings.jsx`에서 **`PatientCheck`와 `imagesOfRow`를 export**. 모양은 **`viewer-url`의 `images`** (`{patient_check, patient_id, patient_name}`, 도착 전 `null`)로 맞춤 — 진료 뷰어 창의 `ImagePatientCheck`가 이미 이 모양이라 `<PatientCheck images={viewer.images} t={t} style={{margin:'8px 14px 0'}} />`로 그대로 바꿔 쓸 수 있음. 판독 목록은 `imagesOfRow(row)`로 바꿔 넘김. 목록의 모양·문구는 그대로.
- **바꾼 파일**: `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(2.1 상태 글자 Envoyé/Réalisé, 2.6에 뷰어 창 경고, 4절 export 설명, 7절 P-3·P-19, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**:
  - 프론트 빌드 통과. 격리 스택 9188에서 한국어 판독 목록을 다시 열어 봄 — 도착 표시·빨강/노랑 경고가 전과 같음.
  - 절차서의 토큰 스크립트(`rotate-token.ps1`)를 **가짜 `.env` + 격리 DB(`bethesda-s-pacs-db`)** 로 돌려 봄: 새 토큰 48자가 양쪽에 같게 들어감(md5로 비교, 값은 안 찍힘), 다른 줄(ORTHANC_PASSWORD·주석·빈 줄) 그대로, 백업에 옛 값. `BRIDGE_TOKEN=` 줄이 두 개면 아무것도 안 바꾸고 멈춤, DB 컨테이너가 없으면 `.env`를 안 바꾸고 멈춤.
  - Orthanc 확인 스크립트(`check_orthanc.py`)는 **문법 검사만** — 진짜 Orthanc로는 못 돌려 봄(격리 스택 없음). 그래서 절차서 ⑤-5가 곧 그 확인임.
- **확인 못 한 것**: 절차서 전체를 실제로 따라 해 보지는 못함(실행 중 시스템이라). ④의 빌드가 인터넷 없이 되는지(pip 층 캐시가 남아 있는지).
- **총괄 확인 요청**: 아래 절차서. 끝나면 PACS 세션에 알려 주세요 — 위키 2.4의 임시 안내 한 줄을 지우고 ⑤-5 결과를 7절에 적겠습니다.
- **다른 세션에 부탁**: **진료 세션** — `Consultation.jsx`의 `ImagePatientCheck`를 `import { PatientCheck } from '../components/RadiologyReadings.jsx'`로 바꿔 주세요(모양 그대로, 여백만 `style`로). **수납 세션** — `PatientChart.jsx:70`의 `worklist_status`가 아직 영어 그대로(`sent`/`completed`) — 진료 세션의 `cs_ws*` 번역과 맞추면 좋겠습니다(P-19 남은 부분).

### P-1 조치 절차서

> 실행 중인 시스템에 하는 일이므로 **총괄만** 합니다. 명령은 모두 **Windows PowerShell**(관리자 아님)에서. 비밀값(토큰·Orthanc 비밀번호)은 **어떤 단계에서도 화면에 찍지 않습니다** — 아래 명령은 전부 개수·길이·md5만 봅니다.
> 기준: PACS `main` = `c9dc0b4`, 합칠 것 = `session/pacs`의 **그날 맨 위 커밋**(2026-09-29 기준 `6c135aa` ← `e109157` ← `43bd994`, ff 가능 확인함 — 그 뒤 PACS 세션이 더 커밋하면 인계 노트 맨 위 항목에 적음). EMR은 이미 develop에 있음(`/study-arrived`, 토큰 규칙).

#### ⓪ 재부팅 전에 (지금 해 두어도 됨)

1. 되돌리기용으로 지금 브리지 이미지에 이름표를 하나 더 붙입니다.
   ```
   docker tag bethesda-pacs-worklist-bridge:latest bethesda-pacs-worklist-bridge:before-p1
   ```
2. 아래 두 스크립트를 저장소 **밖** 폴더에 저장합니다: `C:\Bethesda-p1\rotate-token.ps1`, `C:\Bethesda-p1\check_orthanc.py` (내용은 이 절 맨 아래). 저장소 안에 두면 git에 들어갈 수 있습니다.
3. 실장님이 관리자 PowerShell에서 동적 포트 범위를 되돌리고 재부팅:
   ```
   netsh int ipv4 set dynamicport tcp start=49152 num=16384
   netsh int ipv6 set dynamicport tcp start=49152 num=16384
   ```

#### ① 재부팅 뒤 확인 (Docker Desktop이 「Engine running」이 된 뒤)

| 명령 | 기대 결과 | 아니면 |
|---|---|---|
| `netsh int ipv4 show dynamicport tcp` | 시작 포트 **49152**, 포트 수 **16384** | 실장님 명령이 안 먹힘 → ⓪-3 다시, 재부팅. **여기서 멈춤** |
| `netsh int ipv6 show dynamicport tcp` | 같음 | 같음 |
| `netsh interface ipv4 show excludedportrange protocol=tcp` | **4242·9080·9090이 어느 구간에도 안 들어감** (예전 `4204–4303` 같은 구간이 없어야 함) | ⑥-A |
| `docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"` | `bethesda-pacs` 줄에 `0.0.0.0:9090->8042/tcp`, `0.0.0.0:4242->4242/tcp` · `bethesda-emr-web` 줄에 `9080->80` | Ports가 비어 있으면 ④에서 `orthanc`도 다시 만듦 |
| `foreach ($p in 9080,9090,4242) { "$p " + (Test-NetConnection 127.0.0.1 -Port $p -WarningAction SilentlyContinue).TcpTestSucceeded }` | 세 줄 모두 `True` | 9090·4242만 False면 ④에서 `orthanc` 다시 만든 뒤 재확인. 그래도 False면 ⑥-A |

#### ② PACS 저장소 합치기

```
git -C C:\Bethesda-PACS-main status --short
git -C C:\Bethesda-PACS-main log --oneline -1
git -C C:\Bethesda-PACS-main merge --ff-only session/pacs
git -C C:\Bethesda-PACS-main log --oneline -3
```
- 기대: `status`가 **비어 있음**(`storage/`·`worklists/`·`.env`는 무시 파일이라 안 나옴), 합치기 전 `c9dc0b4`, 합친 뒤 맨 위가 `session/pacs`의 맨 위 커밋(2026-09-29 기준 `6c135aa` → `e109157` → `43bd994` → `c9dc0b4`).
- PACS 저장소에는 develop이 없고 `main`이 실행 중인 판입니다. `push`와 `CHANGELOG.md`는 총괄 판단(세션은 안 건드림).

#### ③ 새 토큰 만들어 양쪽에 넣기

```
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Bethesda-p1\rotate-token.ps1
```
- 기대: 한 줄 **`OK - EMR and PACS .env now hold the same new token (48 chars). Value not shown.`**
- 하는 일: `.env`를 `%USERPROFILE%\pacs-env-before-p1`로 백업 → 48자 무작위 토큰 → **EMR DB에 먼저**(`docker exec -i bethesda-emr-db psql`에 **stdin**으로 넘김 — 명령줄·히스토리·psql 출력에 안 남음) → 그다음 `.env`의 `BRIDGE_TOKEN=` 한 줄만 바꿈 → 양쪽 md5 비교.
- **설정 화면(Flux d'ordres)으로 넣지 않습니다** — 값을 복사·붙여넣기 하게 되어 클립보드·화면에 남습니다.
- 이 순간부터 ④까지 몇 초 동안 옛 브리지는 401을 받습니다(정상).
- 옛 토큰은 이제 무효입니다. 옛 토큰이 찍힌 EMR 백엔드 로그(`docker logs bethesda-emr-api`)는 EMR api 컨테이너를 다시 만들 때 함께 없어집니다 — 그대로 둬도 무효인 값이라 급하지 않음(총괄 판단).

#### ④ 컨테이너 다시 만들기

```
cd C:\Bethesda-PACS-main
docker compose up -d --build
```
- `--build`가 꼭 필요합니다(이미지가 이미 있으면 compose는 새로 짓지 않음). 바뀌는 것은 브리지뿐 — 새 `bridge.py` + 새 환경 변수(`ORTHANC_*`, 새 `BRIDGE_TOKEN`). `orthanc` 서비스 설정은 이번 합치기로 안 바뀌었으므로 보통 그대로 둡니다.
- ①에서 PACS 포트가 비어 있었거나 연결이 안 됐으면 추가로:
  ```
  docker compose up -d --force-recreate orthanc
  ```
  영상은 `.\storage` 폴더(바인드 마운트)에 있어서 다시 만들어도 지워지지 않습니다. **`down -v`나 `storage` 폴더 삭제는 절대 하지 않습니다.**
- 빌드가 pip 설치에서 실패하면(인터넷 없음 + 캐시 없음) ⑥-C.

#### ⑤ 확인 (④ 뒤 1~2분 기다린 다음)

1. `docker ps --format "{{.Names}}\t{{.Status}}"` → `bethesda-pacs`, `bethesda-worklist-bridge` 모두 **(healthy)**.
2. 브리지 로그 — `docker logs --since 3m bethesda-worklist-bridge`
   - 있어야 함: `synced N worklist entr…` 가 15초마다.
   - **없어야 함**: `could not ask Orthanc` · `EMR refused the bridge token` · `BRIDGE_TOKEN is missing` · `ORTHANC_PASSWORD not set` · `no /study-arrived`. 하나라도 있으면 ⑥-B(토큰) 또는 PACS 세션에 로그 줄을 전달.
3. heartbeat
   ```
   docker exec bethesda-emr-db psql -U medconnect -d medconnect -tAc "SELECT round(extract(epoch FROM now()-last_seen)), ok, detail->>'error', detail->>'arrivals_error' FROM service_heartbeat WHERE name='worklist_bridge'"
   ```
   → 첫 값 **20 미만**, `t`, 오류 칸 두 개 모두 비어 있음. EMR 상태 화면의 장비 워크리스트 줄도 초록(`arrivals_error`가 있으면 노랑 — 브리지가 Orthanc에 못 묻는 것, ⑤-2와 같이 봄).
4. EMR 로그에 토큰이 더는 안 찍힘 — **개수만** 봅니다(줄을 출력하면 토큰이 화면에 나옴):
   ```
   (docker logs --since 3m bethesda-emr-api 2>&1 | Select-String -SimpleMatch 'token=' | Measure-Object).Count
   (docker logs --since 3m bethesda-emr-api 2>&1 | Select-String -SimpleMatch 'worklist-feed?format=json' | Measure-Object).Count
   ```
   → 첫째 **0**, 둘째 **10 안팎**(15초마다 1줄).
5. **진짜 Orthanc 응답 형식** — 브리지가 기대는 값이 실제로 있는지:
   ```
   Get-Content C:\Bethesda-p1\check_orthanc.py | docker exec -i bethesda-worklist-bridge python -
   ```
   약 80초 걸립니다. 가짜 환자 `TEST^PACSCHECK`(`PX-TEST-0000`)의 8×8 시험 영상 1장을 Orthanc에 올렸다가 **마지막에 지웁니다.** 어느 워크리스트 UID와도 안 맞으므로 브리지·EMR은 건드리지 않습니다. 비밀번호는 컨테이너 환경 변수에서 읽어 화면에 안 나옵니다. 기대:
   ```
   1 upload: 200
   2 has IsStable: True | IsStable now: False
   3 PatientMainDicomTags.PatientID: PX-TEST-0000 (expect PX-TEST-0000)
   4 waiting 75 s ...
   5 IsStable after 75 s: True (expect True)
   6 CountInstances: 1 (expect 1)
   7 delete test study: 200 (expect 200)
   ```
   2·3·5·6 중 하나라도 다르면 결과를 PACS 세션에 그대로 전달 — 그 경우 브리지는 아무 검사도 완료 처리하지 못할 뿐 워크리스트는 정상입니다. 7이 200이 아니면 Orthanc 화면(9090)에서 `PX-TEST-0000`을 찾아 지웁니다.
6. 브라우저로 `http://localhost:9090`이 열리는지(Orthanc 로그인 창), EMR **Paramètres → Flux d'ordres (설정 → 오더 연동)** 의 **Tester PACS (DICOM)** 이 초록인지.
7. 백업 지우기: `Remove-Item $env:USERPROFILE\pacs-env-before-p1` (옛 토큰·Orthanc 비밀번호가 들어 있음).
8. PACS 세션에 알림 → 위키 2.4 임시 안내 삭제, ⑤-5 결과 기록.

#### ⑤+ 「확인 필요」로 남은 것 — 확인 목록

**재부팅 당일 (총괄, 장비 없이 할 수 있음)** — 결과를 PACS 세션에 알려 주면 위키에 적습니다.

| # | 무엇 | 어떻게 | 적을 것 |
|---|---|---|---|
| R-1 | **P-9 뷰어가 로그인을 묻는지** | EMR 설정 **Flux d'ordres → PACS 웹/뷰어 주소**가 `http://localhost:9090`(또는 서버 IP)인지 본 뒤, 진료 화면에서 아무 영상 오더의 **🖼** → 영상 창 왼쪽에 ① 브라우저 로그인 창이 뜨는지 ② 빈/오류 화면인지 ③ Stone 뷰어가 바로 뜨는지. 로그인 창이 뜨면 **값은 넣지 말고** 뜬다는 것만 기록. 같은 브라우저로 `http://localhost:9090` 을 따로 열었을 때도 같은지 | ①②③ 중 무엇, 브라우저 종류 |
| R-2 | P-18 UID 없는 영상 오더 | 워크리스트로 안 가는 영상 오더가 있으면(설정의 오더 코드에서 워크리스트 꺼진 것) 그 오더의 **🖼** — 뷰어 첫 화면(모든 환자 목록)이 뜨는지 | 뜸/안 뜸 |
| R-3 | 서버 상태 창의 PACS 줄 | `server-status.bat` 창(설정 세션이 호스트 쪽 9090·4242 검사를 넣음)에서 **Imagerie (PACS)**·**Liste de travail des appareils** 가 초록인지 | 초록/빨강 + 문구 |
| R-4 | 연결 시험 버튼 | EMR **Paramètres → Flux d'ordres → Tester PACS (DICOM)** — Host가 `host.docker.internal` 또는 서버 LAN IP일 때 초록인지(`localhost`면 빨강이 정상) | Host 값, 결과 |
| R-5 | 진짜 Orthanc 응답 형식 | ⑤-5 결과 그대로 | 7줄 출력 |

**장비 설치 날 (실장님, 현장 장비로만 확인 가능)**

| # | 무엇 | 어떻게 | 적을 것 |
|---|---|---|---|
| D-1 | 장비 설정값 | Called AE `MEDCONNECT`, 호스트 = 서버 LAN IP, 포트 `4242`, 워크리스트도 같은 주소 | 장비 이름·모델, 장비 자기 AE Title, 장비 IP (P-10 등록용) |
| D-2 | **P-8** 워크리스트가 보이는지 | 테스트 환자에게 영상 오더 → 장비에서 워크리스트 조회. **비어 있으면** 장비의 「내 AE만 / Station AE 필터」 옵션을 끄고 다시 조회 | 보임/안 보임, 필터 옵션 이름 |
| D-3 | **P-4** 장비가 UID를 그대로 쓰는지 | 워크리스트에서 그 환자를 골라 1장 찍어 전송 → 2분 뒤 EMR **🩻 Compte-rendu** 에 **N image(s) reçue(s)** 가 뜨는지. 안 뜨는데 `http://<서버>:9090`(Orthanc 화면)에는 영상이 있으면 장비가 UID를 새로 만든 것 | 뜸/안 뜸, Orthanc의 AccessionNumber 가 오더 번호(`YYMMDD-n`)와 같은지 |
| D-4 | 장비 메뉴 이름 | 워크리스트 불러오기·전송 버튼의 실제 이름(프랑스어/영어) | 위키 2.2에 넣을 이름 |
| D-5 | 추가 촬영 | 전송 뒤 워크리스트에서 빠진 다음, 같은 검사에 한 장 더 찍어 보낼 수 있는지 | 됨/안 됨, 방법 |
| D-6 | 경고 표시 | 장비에서 환자번호를 일부러 바꿔 찍은 시험 영상 → 판독 목록에 빨간 경고가 뜨는지 (시험 뒤 Orthanc 화면에서 그 영상 삭제) | 뜸/안 뜸 |

#### ⑥ 잘못됐을 때 되돌리기

- **⑥-A 포트가 여전히 막힘** — 동적 범위가 49152로 돌아왔는데도 `excludedportrange`에 4242·9080·9090이 걸리면, 실장님이 관리자 PowerShell에서:
  ```
  net stop winnat
  netsh int ipv4 add excludedportrange protocol=tcp startport=4242 numberofports=1
  netsh int ipv4 add excludedportrange protocol=tcp startport=9090 numberofports=1
  netsh int ipv4 add excludedportrange protocol=tcp startport=9080 numberofports=1
  net start winnat
  ```
  **Docker Desktop을 먼저 끄고** 합니다 — 쓰고 있는 포트는 제외 등록이 거절될 수 있습니다(확인 필요). 「관리 포트 제외」로 등록되면 Hyper-V가 그 포트를 가져가지 못합니다. 그다음 총괄이 `docker compose up -d --force-recreate orthanc` 와 EMR 쪽 재시작, ① 표 다시.
- **⑥-B 토큰이 안 맞음** (③이 `FAIL`, 또는 브리지 로그에 `EMR refused the bridge token`) — ③을 **한 번 더** 돌리고(새 토큰을 양쪽에 다시 넣음) `docker compose up -d --force-recreate worklist-bridge`. 브리지는 `.env`를 컨테이너를 만들 때만 읽으므로 다시 만들어야 합니다. `.env` 자체가 망가졌으면 `Copy-Item $env:USERPROFILE\pacs-env-before-p1 C:\Bethesda-PACS-main\.env -Force`로 되돌린 뒤 ③부터.
- **⑥-C 새 브리지가 이상하거나 빌드가 안 됨** — 옛 브리지로:
  ```
  git -C C:\Bethesda-PACS-main reset --hard c9dc0b4
  docker tag bethesda-pacs-worklist-bridge:before-p1 bethesda-pacs-worklist-bridge:latest
  cd C:\Bethesda-PACS-main
  docker compose up -d --no-build --force-recreate worklist-bridge
  ```
  `reset --hard`는 ②에서 `status`가 비어 있었으므로 잃는 것이 없고, 무시 파일(`storage/`·`worklists/`·`.env`)은 건드리지 않습니다. 옛 브리지는 새 토큰으로도 동작합니다(토큰을 URL로 보내고 EMR이 그것도 받음). 대신 EMR 로그에 토큰이 다시 찍히고, 영상 도착 확인은 꺼집니다 — PACS 세션에 알려 주세요.
- **⑥-D Orthanc가 안 뜸** — `docker logs --tail 50 bethesda-pacs`. 이번 합치기는 `orthanc` 설정을 바꾸지 않았으므로 원인은 거의 포트(⑥-A)입니다. 영상은 `storage` 폴더에 그대로 있습니다.

#### 스크립트 1 — `C:\Bethesda-p1\rotate-token.ps1`

```powershell
param(
  [string]$EnvFile = 'C:\Bethesda-PACS-main\.env',
  [string]$DbContainer = 'bethesda-emr-db',
  [string]$Backup = (Join-Path $env:USERPROFILE 'pacs-env-before-p1')
)
# Make a new bridge token and put the same value in the PACS .env and EMR pacs_config.
# The value never appears on screen, on a command line or in a log (EMR gets it on stdin).
$ErrorActionPreference = 'Stop'
Copy-Item $EnvFile $Backup -Force
$lines = @(Get-Content $EnvFile)
if (@($lines | Where-Object { $_ -match '^BRIDGE_TOKEN=' }).Count -ne 1) { throw 'BRIDGE_TOKEN= must appear exactly once in .env - stopped, nothing changed' }
$b = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
$tok = ([System.BitConverter]::ToString($b) -replace '-', '').ToLower()
"UPDATE pacs_config SET bridge_token = '$tok', updated_at = NOW() WHERE id = 1;" |
  docker exec -i $DbContainer psql -U medconnect -d medconnect -q -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'EMR DB update failed - .env not changed yet' }
$lines = $lines | ForEach-Object { if ($_ -match '^BRIDGE_TOKEN=') { "BRIDGE_TOKEN=$tok" } else { $_ } }
Set-Content -Path $EnvFile -Value $lines -Encoding ascii
$md5 = ([System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($tok))) -replace '-', '').ToLower()
Remove-Variable tok, b
$db = (docker exec $DbContainer psql -U medconnect -d medconnect -tAc "SELECT md5(bridge_token) FROM pacs_config WHERE id = 1").Trim()
$fileTok = ((Get-Content $EnvFile) | Where-Object { $_ -match '^BRIDGE_TOKEN=' }) -replace '^BRIDGE_TOKEN=', ''
$fileMd5 = ([System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($fileTok))) -replace '-', '').ToLower()
Remove-Variable fileTok
if ($db -eq $md5 -and $fileMd5 -eq $md5) { 'OK - EMR and PACS .env now hold the same new token (48 chars). Value not shown.' } else { 'FAIL - EMR and .env differ. See procedure step 6-B.' }
```

#### 스크립트 2 — `C:\Bethesda-p1\check_orthanc.py` (브리지 컨테이너 안에서 실행)

```python
# Run inside bethesda-worklist-bridge: checks the Orthanc answers bridge.py relies on,
# with one throwaway 8x8 test image that is deleted at the end. Touches no EMR data.
import io, os, time, requests
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, SecondaryCaptureImageStorage

O = os.environ.get("ORTHANC_URL", "http://orthanc:8042")
A = ("admin", os.environ["ORTHANC_PASSWORD"])
uid = generate_uid()

fm = Dataset()
fm.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
fm.MediaStorageSOPInstanceUID = generate_uid()
fm.TransferSyntaxUID = ExplicitVRLittleEndian
ds = FileDataset("t", {}, file_meta=fm, preamble=b"\0" * 128)
ds.PatientName = "TEST^PACSCHECK"; ds.PatientID = "PX-TEST-0000"; ds.Modality = "OT"
ds.StudyInstanceUID = uid; ds.SeriesInstanceUID = generate_uid()
ds.SOPClassUID = fm.MediaStorageSOPClassUID; ds.SOPInstanceUID = fm.MediaStorageSOPInstanceUID
ds.SamplesPerPixel = 1; ds.PhotometricInterpretation = "MONOCHROME2"; ds.Rows = 8; ds.Columns = 8
ds.BitsAllocated = 8; ds.BitsStored = 8; ds.HighBit = 7; ds.PixelRepresentation = 0; ds.PixelData = bytes(64)
ds.is_little_endian = True; ds.is_implicit_VR = False
buf = io.BytesIO(); ds.save_as(buf, write_like_original=False)

r = requests.post(O + "/instances", data=buf.getvalue(), auth=A, headers={"Content-Type": "application/dicom"}, timeout=15)
print("1 upload:", r.status_code)
find = lambda: requests.post(O + "/tools/find", auth=A, timeout=10,
                             json={"Level": "Study", "Query": {"StudyInstanceUID": uid}, "Expand": True}).json()
s = find()[0]
try:
    print("2 has IsStable:", "IsStable" in s, "| IsStable now:", s.get("IsStable"))
    print("3 PatientMainDicomTags.PatientID:", (s.get("PatientMainDicomTags") or {}).get("PatientID"), "(expect PX-TEST-0000)")
    print("4 waiting 75 s for Orthanc to call it stable ...", flush=True)
    time.sleep(75)
    s = find()[0]
    print("5 IsStable after 75 s:", s.get("IsStable"), "(expect True)")
    st = requests.get(O + "/studies/%s/statistics" % s["ID"], auth=A, timeout=10).json()
    print("6 CountInstances:", st.get("CountInstances"), "(expect 1)")
finally:
    print("7 delete test study:", requests.delete(O + "/studies/" + s["ID"], auth=A, timeout=10).status_code, "(expect 200)")
```

## 2026-09-29 — 위키 2절(직원용 사용법)을 프랑스어 화면 기준으로

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `9ded00f`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` 2절을 통계 세션 방식으로 다시 씀 — 버튼·칸 이름은 **프랑스어 화면 그대로 + 괄호에 한국어**. 2.1 의사 검사 내기, 2.2 방사선사 촬영(+ 워크리스트에 환자가 없을 때), 2.3 영상 보기·판독, 2.4 판독소견 목록, **2.5 영상이 안 보일 때**, **2.6 환자 번호 경고가 떴을 때**를 순서대로. 이름은 `fr.js`·`ko.js`의 실제 문자열과 `server-status.ps1`의 프랑스어 줄 이름에서 옮김.
- **바꾼 파일**: `wiki/modules/pacs.md`(2절, 4절 DB 표의 `801`→`019(세션 번호 801)`, 7절 P-7에 과도기 주의, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 프랑스어·한국어 문구를 `frontend/src/i18n/fr.js`·`ko.js`와 대조, 화면 구조는 지금 develop의 `Consultation.jsx`(🖼·🔒·뷰어 창)·`RadiologyReadings.jsx`·`Payment.jsx` 기준. 2.4·2.6의 경고·도착 표시는 앞 작업에서 격리 스택으로 한·불 화면을 본 것과 같음. 2.6 예시의 환자번호·이름(`26-00012 RAKOTO Jean`)은 설명용으로 지어낸 것.
- **확인 못 한 것**: 촬영 장비 쪽 메뉴 이름(장비 설치 후), 뷰어가 아이디·비밀번호를 묻는지(P-9). 둘 다 「확인 필요」로 남김.
- **총괄 확인 요청**:
  - **과도기 문제** — EMR은 합쳐졌는데 PACS 브리지(`e109157`)는 아직이라, 실행 중 시스템에서는 판독 목록이 영상이 와도 계속 **「Images en attente (영상 대기 중)」** 로 보입니다. 장비가 아직 없어서 지금 영향은 없지만, 장비를 붙이기 전에 브리지를 합쳐야 합니다(P-1 조치 때 같이 하시면 됨). 2.4에 임시 안내 한 줄, 7절 P-7에 기록. 브리지를 합치면 2.4의 그 한 줄을 지워 주세요(또는 PACS 세션에 알려 주시면 지움).
  - 2.6의 「다른 환자의 영상이면 … 다시 찍어야 할 수 있습니다 — 의사가 판단합니다」는 의학적 판단을 정하지 않으려고 이렇게 씀. 실장님이 병원 절차를 정하시면 바꿈.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 앞 항목과 같음(P-4 격리 스택 허락 대기, P-6, P-20, P-1).

## 2026-09-29 — 영상 도착 확인 (P-7) · 영상 속 환자번호 대조 (P-3), P-4 설계안

> **총괄 확인 (2026-09-29)**: EMR 쪽 `6456471` 합침 + 실행 중 EMR 반영. 마이그레이션은 규칙대로 **`801` → `019_pacs_image_arrival.sql`로 번호를 바꿔** 합침(내용 그대로, 위키 모듈 페이지의 파일 이름도 019로 고침 — 이 노트 아래 본문의 801은 세션 작업 당시 이름). PACS 저장소 `e109157`·`43bd994`는 아직 합치지 않음 — 실장님 재부팅 뒤 P-1 조치와 한 번에. 그때 브리지 로그의 「could not ask Orthanc」 확인함. 진짜 Orthanc 응답 형식은 그때 실제 영상으로 확인 예정. 진료·설정 세션 부탁은 전달함.

- **상태**: 확인 요청 (P-7·P-3) · P-4는 설계안만 — 실장님 결정 대기(PACS 격리 스택 허락)
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5e0e056`을 ff로 당긴 뒤 작업)
  - **PACS 저장소** `session/pacs` `e109157` — 브리지·compose (그 앞의 `43bd994`도 아직 안 합쳐짐)
  - **합치는 순서**: EMR을 먼저 합쳐도, PACS를 먼저 합쳐도 됩니다. 새 브리지 + 옛 EMR이면 브리지가 `/study-arrived` 404를 한 번 보고 묻기를 멈춤(격리 시험으로 확인). 새 EMR + 옛 브리지면 지금과 같음(아무도 완료 처리 안 함).
- **한 일**:
  - **P-7**: 브리지가 바퀴마다 워크리스트의 각 StudyInstanceUID를 Orthanc(`/tools/find`)에 묻고, 스터디가 **Stable**(기본 60초 동안 새 영상 없음)이면 EMR `POST /api/pacs/study-arrived`로 알림. EMR은 worklist_log를 `completed`, order_item.worklist_status를 `completed`로 → 다음 피드에서 빠지고 `.wl` 삭제 → 장비 목록에서 사라짐. Stable을 기다리는 이유: 여러 장짜리 검사를 보내는 중에 목록에서 빠지지 않게.
  - **P-3**: 같은 보고에서 EMR이 영상 속 PatientID와 chart_no를 비교해 `patient_check`(match/mismatch/missing) 저장. 「🩻 판독소견」 목록(`RadiologyReadings.jsx`)에 「영상 N장 도착」/「영상 대기 중」과 빨강(불일치)·노랑(번호 없음) 경고. `viewer-url` 응답에 `images` 추가. **한계(위키에 적음)**: 워크리스트에서 다른 환자를 고른 경우는 영상에 그 환자의 정보가 그대로 들어가 못 잡음 — 그래서 P-7이 짝.
  - 진료 세션이 이미 `worklist_status='completed'`인 오더를 잠그게 해 두어서(`orderLocked`, DELETE 409), 영상이 온 오더는 이제 지울 수 없게 됨 — 의도와 맞음.
- **바꾼 파일**:
  - EMR: `backend/src/routes/pacs.routes.js`(`POST /study-arrived`, `viewer-url`·`readings`에 영상 정보), `frontend/src/components/RadiologyReadings.jsx`, **새 파일** `backend/sql/801_pacs_image_arrival.sql`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
  - PACS: `bridge/bridge.py`(`find_stable_study`, `report_arrivals`), `docker-compose.yml`(브리지에 `ORTHANC_URL`·`ORTHANC_USER`·`ORTHANC_PASSWORD`)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 4개
- **DB 마이그레이션**: `backend/sql/801_pacs_image_arrival.sql` — worklist_log에 칸 6개(images_received_at, orthanc_study_id, image_count, image_patient_id, image_patient_name, patient_check)와 patient_check CHECK 추가. **기존 줄은 바꾸지 않음**, 다시 실행해도 안전.
- **번역 키**: `px_imagesArrived`, `px_imagesWaiting`, `px_patientMismatch`, `px_patientMissing` (ko · en · fr 모두)
- **확인한 방법**:
  - `node --check pacs.routes.js`, `python -m py_compile bridge.py`, 프론트 `npm install --no-package-lock` 후 `npm run build` 통과
  - 격리 스택 9188 (`bethesda-s-pacs-*:dev` 이미지 — 새 규칙대로), 마이그레이션 801 적용 로그 확인
  - **가짜 Orthanc**(내가 만든 작은 Python 서버, `/tools/find`·`/statistics`만, 로그인 검사함, 포트 안 엶)를 격리 네트워크에 `orthanc`란 이름으로 붙이고, **수정한 브리지 코드**를 기존 브리지 이미지로 일회용 실행. 오더 5건: 일치 → `match`, 다른 번호 → `mismatch`, 번호 없음 → `missing`, 아직 안 끝남(IsStable=false) → 보고 안 함, Orthanc에 없음 → 보고 안 함. 세 건 `completed`, 다음 바퀴에 `.wl` 5 → 2개
  - 실패 경우: Orthanc 비밀번호 틀림(401) → 한 줄 로그, 워크리스트 계속 · 비밀번호 없음 → 시작 경고, 묻지 않음 · Orthanc 없음 → 한 줄 로그, 한 바퀴 약 4초 지연 · 옛 EMR(공통 404) → 한 번만 묻고 멈춤(requests를 바꿔 끼워 확인)
  - `/study-arrived` 직접: 틀린 토큰 401, 칸 없음 400, 다른 항목 UID 409, 없는 항목 404
  - 화면: 진료 → 🩻 판독소견을 **한국어·프랑스어**로 눌러 봄 — 도착/대기 표시, 빨강·노랑 경고 문구. 뒤쪽 오더 목록에서 영상 온 오더에 🔒 표시 확인
  - develop의 날짜 문자열 변경 뒤에도 피드 생년월일이 맞음(1985-01-20 → `19850120`)
- **확인 못 한 것**: **진짜 Orthanc 26.6.1의 응답**(`/tools/find` Expand 결과에 `IsStable`·`PatientMainDicomTags`가 있는지 — Orthanc 문서 기준으로 짰음), 진짜 장비. 둘 다 PACS 격리 스택이 있어야 함. 영어 화면은 눈으로 안 봄.
- **위키**: `modules/pacs.md` 1절, 2절(방사선사·의사·판독소견 목록), 3.1·3.3·3.4, 4절(API·`images`·`patient_check`·브리지 환경 변수·비밀값·DB), 5절 진료, 6절 `.env`, 7절 P-3·P-7·P-19·P-20(새), 8절
- **총괄 확인 요청**:
  - PACS 저장소를 합칠 때(P-1 조치와 같이) 실행 중 PACS `.env`에 `ORTHANC_PASSWORD`가 이미 있으므로 브리지 재생성만으로 도착 확인이 켜집니다. 합친 뒤 브리지 로그에 `could not ask Orthanc` 가 없는지 봐 주세요.
  - 격리 시험은 가짜 Orthanc로만 했습니다 — 진짜 Orthanc 확인은 PACS 격리 스택(아래 설계) 허락 후.
- **다른 세션에 부탁**:
  - **진료 세션** — 영상 뷰어 창(`Consultation.jsx` `openViewer`)에 `viewer-url` 응답의 `images.patient_check`가 `mismatch`/`missing`이면 경고를 보여 주세요. 문구는 이미 있는 `px_patientMismatch`(`{id}`·`{name}` 치환)·`px_patientMissing`을 그대로 쓰면 됩니다. `RadiologyReadings.jsx`의 `PatientCheck`가 같은 일을 합니다. 그리고 P-19(`worklist_status` 번역) — 이제 `completed`도 영어로 보입니다.
  - **설정 세션** — (선택) P-20: 브리지가 Orthanc에 못 묻는 상태를 상태 화면에 보이게 할지. 원하면 브리지 heartbeat detail에 칸을 추가하겠습니다.
- **P-4 설계안 (코드 없음, 실장님 결정 대기)** — 장비가 워크리스트의 StudyInstanceUID를 쓰지 않고 새로 만들면 영상이 오더에 안 붙는 문제
  1. **Accession으로 한 번 더 찾기**: 브리지가 UID로 못 찾으면 같은 줄의 AccessionNumber로 Orthanc `/tools/find`. 정확히 1개만 나오고 Stable이면 `found_by: "accession"`과 **실제 StudyInstanceUID**를 함께 보고.
  2. EMR: `/study-arrived`가 UID 대신 accession이 맞는 보고도 받게 하고, 실제 UID를 새 칸 `image_study_uid`(마이그레이션 802)에 저장. `viewer-url`은 `image_study_uid`가 있으면 그것으로 뷰어를 엶. accession으로만 맞은 것은 약한 연결이므로 `patient_check`가 `match`가 아니면 판독 목록에 경고(기존 것 재사용).
  3. (2단계, 선택) 워크리스트 없이 손으로 친 영상: accession도 없으면 자동 연결 불가 → Orthanc에서 PatientID = chart_no인데 어느 오더에도 안 붙은 스터디를 판독 목록에 「연결 안 된 영상」으로 보여 주고 의사가 오더에 붙이기. 이건 화면 구성이 바뀌므로 실장님 결정 필요.
  - **검증에 필요한 것 — PACS 격리 스택 제안**: PACS 저장소에 `docker-compose.session.yml`(override)을 만들어 `-p bethesda-s-pacs-pacs`로 띄움. 컨테이너 `bethesda-s-pacs-orthanc`·`bethesda-s-pacs-bridge`, **포트는 `127.0.0.1`에만** 웹 `9198`·DICOM `11298`(9090·4242는 절대 안 씀. 4298 같은 번호는 지금 Windows 예약 대역 4204–4303 안이라 피함 — 띄우기 전에 `netsh … excludedportrange`로 다시 확인), 영상은 이름 붙인 볼륨(`./storage` 안 씀), 워크리스트 폴더도 별도 볼륨, 브리지는 EMR 격리 스택(9188) 네트워크로 연결, Orthanc 이미지는 이미 받아 둔 26.6.1 그대로(다운로드 없음). 실행 중 `bethesda-pacs`·`bethesda-worklist-bridge`와 이름·포트·폴더가 겹치지 않음. **실장님 허락 후에만 파일을 만들고 띄웁니다.**
- **남은 일 · 알려진 문제**: P-4(위), P-6(오늘만 나오는 워크리스트 — P-7의 「어제 오더」 한계와 같이), P-20, P-1은 총괄·실장님 조치 대기.

## 2026-09-29 — 브리지 토큰 보안 (P-2·P-5), P-1 조치 분담 기록

> **총괄 확인 (2026-09-29)**: EMR 저장소 합침(`f3a5810`) + 실행 중 EMR 반영. 확인: 옛 기본값 토큰으로 피드 → 401 · `/pacs/config`는 임상병리 계정 403, 관리자 200(토큰 48자) · 브리지 heartbeat는 합친 뒤에도 계속 들어옴(아래 총괄 답장 참고). PACS 저장소 `session/pacs`(`43bd994`)는 **아직 합치지 않음** — 실행 중 브리지를 다시 만들어야 해서 P-1(포트) 조치와 함께 재부팅 뒤에 한 번에 함. 토큰 재발급은 실장님 결정 대기.

- **상태**: 확인 요청
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (코드 + 위키 + 번역)
  - **PACS 저장소** `session/pacs` `43bd994` — 브리지·compose
  - **두 저장소는 따로 합쳐도 됩니다.** 새 브리지는 헤더로 보내는데 EMR은 첫 버전부터 헤더를 받고, 새 EMR은 옛 브리지의 `?token=`도 계속 받습니다.
- **한 일**:
  - EMR이 16자 미만이거나 옛 기본값(`change-me-bridge-token`)인 토큰을 「설정 안 됨」으로 보고 **무조건 거절** — 피드·heartbeat·`/api/worklist` 모두. 기본값이 저장소에 공개돼 있어, PACS를 연결하지 않은 병원은 로그인 없이 오늘 영상 오더 환자의 이름·생년월일을 내주고 있었음(P-2). 비교는 `timingSafeEqual`.
  - `GET /api/pacs/config`를 settings 권한으로 제한(P-5). 설정 화면에서 토큰을 가리고 「보기/숨기기」 버튼, 쓸 수 없는 토큰이면 노란 경고. 피드 주소 예시도 토큰을 가리고 포트를 `:8080`→`:9080`으로.
  - 브리지는 토큰을 URL이 아니라 `X-Bridge-Token` 헤더로 보냄. **고치기 전에는 EMR 백엔드 로그에 15초마다 토큰이 찍혀 있었음**(2026-09-29 `docker logs bethesda-emr-api`로 확인, 값은 보지 않고 가림). 401이면 어느 쪽을 고칠지 로그에 씀. compose·`bridge.py`에서 기본 토큰을 없앰, `bridge.py` 기본 피드 주소 8080→9080.
  - P-1: 총괄 확인 내용과 조치 분담(실장님: 동적 포트 범위 복구·재부팅, 총괄: 재생성·포트 확인)을 위키 7절에 기록.
- **바꾼 파일**:
  - EMR: `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, **새 파일** `backend/src/routes/pacs.token.js`(PACS 소유 — 토큰 규칙을 두 라우트가 같이 씀), `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
  - PACS: `bridge/bridge.py`, `docker-compose.yml`
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — **오더 연동 탭 안(PACS 부분)만**: Bridge Token 입력 칸(가림·보기 버튼·경고), 피드 주소 예시 2줄. 탭 밖으로는 맨 위 상태 선언에 `showBridgeToken` 한 줄, `up()` 옆에 도우미 함수 2개(`pacsTokenUsable`, `pacsTokenShown`)를 넣음 — 모두 PACS 탭에서만 씀.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 3개 추가.
- **DB 마이그레이션**: 없음. (DB의 기본값 `change-me-bridge-token`은 그대로 두고 코드에서 거절 — 데이터 변경 마이그레이션을 피함)
- **번역 키**: `px_show`, `px_hide`, `px_tokenUnusable` (ko · en · fr 모두 넣음)
- **확인한 방법**:
  - `node --check` 3개 파일, `python -m py_compile bridge.py`
  - 프론트 빌드 통과 — **`npm ci`는 EMR 저장소에 `package-lock.json`이 없어서 실행 불가**, Dockerfile과 같은 `npm install`(lockfile 만들지 않음) 후 `npm run build`
  - 토큰 규칙 단위 확인(node): 옛 기본값·빈 값·짧은 값·길이 다름·배열·멀티바이트, 헤더→본문→쿼리 순서
  - 격리 스택 9188(`bethesda-s-pacs`): 옛 기본값으로 피드·heartbeat 401(이전 코드는 200을 줬을 것 — 코드로 판단, 실행으로는 확인 안 함), `/worklist/dicom-mwl` 401, 의사 권한 계정으로 `/pacs/config` 403, 관리자 200. 진짜 토큰으로 헤더 200, 쿼리 200(옛 브리지 호환), 틀린 토큰 401
  - **수정한 브리지 코드를 실제로 돌려 봄**: 기존 브리지 이미지로 일회용 컨테이너(`px-bridge-test`, 포트 없음, `.wl`은 임시 폴더로)를 격리 스택 네트워크에 붙여 실행 → 테스트 영상 오더 1건이 `260929-1.wl`로 써짐, heartbeat 기록됨, EMR 로그 줄에 토큰 없음(`GET /api/pacs/worklist-feed?format=json`). 옛 기본값·빈 토큰이면 시작 경고 + 401 원인 메시지, `.wl`은 지우지 않음
  - 설정 → 오더 연동 화면을 한국어·프랑스어로 눌러 봄: 토큰 가림, 보기/숨기기, 옛 기본값 입력 시 경고, 피드 주소 가림·9080
- **확인 못 한 것**: 실행 중인 PACS·EMR에 붙여 보지 않음(규칙상). 영어 화면은 눈으로 안 봄(키만 넣음).
- **위키**: `modules/pacs.md` 3.1·3.3·3.4, 4절(API 표, 토큰 검사, 브리지 환경 변수, 비밀값, 공용 부품), 6절 Bridge Token, 7절 P-1·P-2·P-5·P-17, 8절
- **총괄 확인 요청**:
  - 합친 뒤 실행 중인 EMR에서 **브리지 heartbeat가 계속 들어오는지** 확인해 주세요. 지금 쓰는 토큰은 48자라 새 규칙을 통과합니다(길이만 확인, 값은 안 봄).
  - 토큰을 아직 옛 기본값으로 둔 설치는 합친 뒤 브리지가 멈춘 것처럼 보입니다(상태 화면 「보고 없음」, 설정 화면 노란 경고). 의도된 동작이지만 배포 때 CHANGELOG에 한 줄 필요.
  - 고치기 전 로그에 토큰이 남아 있으니, 원하시면 토큰을 새로 만들어 PACS `.env`와 EMR 설정을 함께 바꾸는 것을 권합니다(실장님 결정).
  - PACS 저장소 `CHANGELOG.md`는 건드리지 않았습니다 — 배포할 때 써 주세요.
- **다른 세션에 부탁**: 없음 (지난 항목의 설정 세션 참고 사항은 그대로)
- **남은 일 · 알려진 문제**: P-1은 총괄 결과 대기. 다음 후보 P-7 → P-3 → P-4(환자 식별, PACS 격리 스택 필요 — 실장님 허락 후).

## 2026-09-29 — P-1 원인 추가 확인, 장비 미설정 확인

- **상태**: 보류 — 실장님 결정 대기 (P-1 해결 방식)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음
- **한 일**: P-1의 근본 원인 확인 — 이 PC의 Windows 동적 포트 범위가 1024–15000으로 바뀌어 있어, 재부팅마다 4242·9090·9080이 예약될 수 있음(읽기 전용 `netsh … show dynamicport` 조회). 포트 번호를 옮기는 것으로는 해결되지 않으므로 아래 항목의 ② 안은 뺌. 실장님께서 **현장 장비는 아직 하나도 설정하지 않았다**고 확인해 주셔서 위키 7절에 반영.
- **바꾼 파일**: `wiki/modules/pacs.md` 7절 P-1, 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 동적 포트 범위를 누가/언제 바꿨는지
- **총괄 확인 요청**: P-1 해결은 ① 실장님이 관리자 권한으로 동적 포트 범위를 Windows 기본값(49152부터 16384개, ipv4·ipv6)으로 되돌리고 재부팅 → ② 총괄이 PACS 컨테이너를 다시 만들고 호스트에서 9090·4242가 열리는지 확인. EMR 9080도 같은 위험이므로 참고.
- **다른 세션에 부탁**: 없음 (아래 항목의 설정 세션 참고 사항은 그대로 유효)

## 2026-09-29 — 현황 파악, 위키 첫 작성 (코드 변경 없음)

- **상태**: 보류 — 실장님이 고칠 순서를 정하시길 기다림
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 하나 (위키만: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`)
  - **PACS 저장소** `session/pacs` — 커밋 없음 (브랜치 이름만 `session/pacs`로 바꿈, `main`의 `c9dc0b4`에서 출발)
- **한 일**: 두 저장소의 PACS 관련 파일을 모두 읽고(브리지, compose, setup, 시험 스크립트, `pacs.routes.js`, `worklist.routes.js`, `RadiologyReadings.jsx`, 마이그레이션 007·015·018, 그리고 연결된 `consult.routes.js`·`Consultation.jsx`·`Settings.jsx`·`status.routes.js`의 해당 부분) 위키 1~7절을 실제 코드 기준으로 채웠습니다. 문제 19건을 심각도와 근거(파일:줄)와 함께 7절에 정리했습니다.
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기. 실행 중인 PACS는 **읽기만** 했습니다 — `docker ps`, `docker inspect`(포트 설정), 브리지 로그 마지막 5줄, 호스트에서 9090·4242 TCP 연결 시도, `netsh … excludedportrange` 조회. PACS `.env`는 비밀값을 출력하지 않고 「옛 데모 비밀번호와 같은지」, 「change-me 기본값인지」만 확인(둘 다 아님).
- **확인 못 한 것**: 실제 장비 동작(워크리스트의 `ANY` AE 매칭, 장비가 워크리스트 UID를 쓰는지), 현장 직원이 Orthanc 뷰어에 어떻게 로그인하는지, 9090이 예약 대역 밖인데도 안 잡힌 이유, `server-status.ps1`이 P-1 상태를 초록으로 보이는지. EMR DB(`pacs_config`)는 조회하지 않았습니다.
- **위키**: `modules/pacs.md` 1~8절 전부
- **총괄 확인 요청**:
  - **P-1 — 실행 중인 PACS가 지금 호스트에서 연결되지 않습니다.** `bethesda-pacs` 컨테이너는 healthy지만 `NetworkSettings.Ports`가 비어 있고 `127.0.0.1:9090`·`:4242` 모두 연결 실패. 이 PC의 Windows 예약 포트 대역 `4204–4303`에 4242가 들어 있습니다. 장비 워크리스트·영상 전송·EMR 영상 보기가 모두 안 되는 상태로 보입니다. 실행 중인 시스템 반영은 총괄 몫이라 손대지 않았습니다. 실장님 결정 후 둘 중 하나: ① 관리자 권한으로 4242를 예약 대역에서 빼 두기(`net stop winnat` → `netsh int ipv4 add excludedportrange protocol=tcp startport=4242 numberofports=1` → `net start winnat`) 후 PACS 컨테이너 재생성 — 장비 설정 변경 없음, ② DICOM 포트를 예약 대역 밖으로 옮기기 — 장비 쪽 포트도 바꿔야 함.
- **다른 세션에 부탁**:
  - **설정 세션** — `server-status.ps1`이 PACS를 컨테이너 health로만 보는 것으로 읽힙니다. 컨테이너 안 healthcheck는 호스트 포트가 안 잡혀도 healthy라, 호스트에서 `9090`·`4242`로 TCP 연결을 시도하는 검사가 있으면 P-1 같은 상태를 잡을 수 있습니다. (PACS 세션이 먼저 실장님 결정을 받은 뒤 정식 요청 예정 — 지금은 참고)
  - **진료 세션** — (실장님 결정 후 요청 예정) 영상 뷰어 창의 바깥 클릭 시 저장 안 한 판독 유실(P-16), `worklist_status` 번역(P-19), 뷰어 창에 「영상 환자 ≠ EMR 환자」 경고 자리(P-3).
- **남은 일 · 알려진 문제**: `wiki/modules/pacs.md` 7절 P-1~P-19. 제안 순서는 실장님께 보고한 내용 참고 — P-1(운영) → P-2·P-5(토큰) → P-7·P-3·P-4(환자 식별) → PACS 격리 스택.
