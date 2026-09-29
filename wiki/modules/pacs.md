# PACS (의료 영상)

> **담당**: PACS 세션 · 브랜치 `session/pacs` (EMR 저장소와 PACS 저장소 둘 다) · **마지막 갱신**: 2026-09-29 · **상태**: 현황 파악 완료 — 코드는 아직 안 고침

## 1. 이 모듈이 하는 일

의사가 EMR에서 낸 **영상 오더**(X선·초음파 등)를 **촬영 장비의 워크리스트**로 넘기고, 장비가 찍은 영상을 **Orthanc**에 저장했다가, EMR 안에서 **영상을 보고 판독 소견을 쓰게** 합니다.

- 방사선사가 장비에 환자 이름·생년월일을 다시 치지 않아도 됩니다(오타로 영상이 엉뚱한 환자에 붙는 일을 줄이려는 목적).
- 영상은 **EMR DB에 들어가지 않습니다.** Orthanc(별도 컨테이너)에 저장되고, EMR은 오더마다 정해 둔 **StudyInstanceUID**로 Orthanc 뷰어를 불러올 뿐입니다.
- 판독 소견은 EMR의 `order_item.result_text`에 저장됩니다.
- PACS는 **선택 사항**입니다. PACS를 설치하지 않은 병원에서도 영상 오더·판독 입력은 됩니다(영상만 안 보임).

구성은 저장소 두 개에 나뉘어 있습니다.

| 부분 | 어디 | 무엇 |
|---|---|---|
| Orthanc 26.6.1 | PACS 저장소 `docker-compose.yml` (공식 이미지 `orthancteam/orthanc`, 우리가 수정하지 않음) | 영상 저장, DICOM 수신(C-STORE), 워크리스트 응답(MWL C-FIND), 웹 뷰어(Stone Web Viewer, Orthanc Explorer 2) |
| 워크리스트 브리지 | PACS 저장소 `bridge/bridge.py` (우리 코드, Python) | EMR의 오더 피드를 15초마다 읽어 `.wl` 파일로 씀 |
| EMR 쪽 | EMR 저장소 `pacs.routes.js` · `worklist.routes.js` · `RadiologyReadings.jsx` (+ 진료 화면의 뷰어 창) | 워크리스트 생성, 피드 제공, 뷰어 주소, 판독 저장, 브리지 생존 신호 |

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름은 한국어 화면 기준이며, 프랑스어 화면에서도 같은 자리에 있습니다.

### 의사 — 영상 오더 내기

1. **진료** 화면에서 환자를 고르고, 오더 목록에서 영상 검사(예: Chest PA, 복부 초음파)를 추가합니다.
2. 오더 줄 오른쪽에 **`sent`** 가 보이면 촬영실 장비로 넘어간 것입니다. (이 글자는 아직 번역되지 않고 영어로 나옵니다.)
3. 오더를 잘못 냈으면 그 줄을 지우면 됩니다. 15초 안에 장비 목록에서도 빠집니다.

> 오더는 **오늘 날짜로만** 장비에 보입니다. 오늘 낸 오더를 내일 촬영하면 장비 목록에 나오지 않습니다 — 이 경우 의사에게 오더를 다시 내 달라고 하세요. (7절 참고)

### 방사선사 — 촬영

1. 장비(또는 장비 PC)에서 **워크리스트(Worklist / MWL)** 를 불러옵니다. 오늘 오더가 난 환자가 뜹니다.
2. 목록에서 **촬영할 환자를 정확히 골라** 촬영합니다. 이름·차트번호(예: `26-00001`)·검사 이름을 꼭 확인하세요. 여기서 다른 환자를 고르면 영상이 그 환자에게 붙습니다.
3. 촬영이 끝나면 장비에서 PACS로 **전송(Send / Store)** 합니다.
4. 워크리스트에 환자가 없으면 **환자 정보를 손으로 치지 말고** 먼저 의사에게 오더가 났는지 확인하세요. 손으로 친 영상은 EMR 오더와 연결되지 않아 진료 화면에서 볼 수 없습니다.

> 장비별 메뉴 이름은 장비마다 다릅니다 — 확인 필요 (현장 장비 목록을 받으면 채웁니다).

### 의사 — 영상 보기와 판독

1. **진료** 화면 오더 목록에서 영상 오더 줄의 **🖼** 버튼을 누릅니다.
2. 큰 창이 열립니다. 왼쪽이 영상, 오른쪽이 **판독소견** 칸입니다.
3. 판독을 쓰고 **💾 판독 저장** 을 누릅니다. 저장한 사람과 날짜가 위에 표시됩니다.
4. 영상을 크게 보려면 **새 탭에서 열기 ↗** 를 누릅니다.
5. 다 봤으면 **닫기 ✕** 를 누릅니다.

> ⚠ **판독을 쓰는 중에 창 바깥 어두운 곳을 누르면 창이 닫히고, 저장하지 않은 판독은 사라집니다.** 먼저 「판독 저장」을 누르세요.
>
> 처음 영상을 열 때 PACS 아이디·비밀번호를 물을 수 있습니다 — 확인 필요 (지금 설정은 Orthanc 관리자 계정 하나뿐입니다. 7절 참고).
>
> 영상이 아직 도착하지 않았으면 창은 열리지만 영상 칸이 비어 있습니다.

### 지난 영상 검사 한눈에 보기

- **진료** 화면 위쪽 **🩻 판독소견** 버튼 → 이 환자의 모든 영상 검사가 날짜순으로 나오고, 각 판독 내용이 보입니다. **🖼 영상보기** 를 누르면 위의 영상 창이 열립니다.
- **수납** 화면에도 **🩻 판독소견** 버튼이 있습니다. 여기서는 판독을 **읽기만** 할 수 있고 영상 창은 열리지 않습니다.
- 판독은 **진료 권한**이 있는 직원만 쓰고 고칠 수 있습니다.

## 3. 기능 상세

### 3.1 전체 흐름

```
 ① 진료: 영상 오더 저장            POST /api/consultations/:id/orders  (consult.routes.js — 진료 세션 파일)
      │  order_code.worklist_enabled && pacs_modality 이면
      │  worklist_log 1줄 생성: accession_no, study_instance_uid, scheduled_date=CURRENT_DATE
      │  order_item.worklist_status = 'sent'
      ▼
 ② 브리지(15초마다)                 GET /api/pacs/worklist-feed?token=…&format=json
      │  오늘 + status='scheduled' 인 worklist_log 전부
      │  줄마다 /worklists/<accession>.wl 파일을 씀, 목록에 없는 .wl 은 지움
      ▼
 ③ Orthanc 워크리스트 플러그인       /var/lib/orthanc/worklists (브리지와 같은 폴더를 마운트)
      │  장비가 C-FIND(MWL) 로 조회하면 .wl 내용을 돌려줌
      ▼
 ④ 장비 촬영 → C-STORE → Orthanc   (포트 4242, AE Title MEDCONNECT)
      │  장비가 워크리스트의 StudyInstanceUID · AccessionNumber 를 영상에 그대로 넣는 것이 전제
      ▼
 ⑤ EMR에서 보기                     GET /api/pacs/viewer-url?order_item_id=…
      │  → <pacs_viewer_url>/stone-webviewer/index.html?study=<study_instance_uid>
      │  진료 화면이 이 주소를 iframe 으로 띄움 (브라우저가 Orthanc 에 직접 접속)
      ▼
 ⑥ 판독 저장                        PUT /api/pacs/reading/:orderItemId  → order_item.result_text
```

**영상과 오더를 잇는 것은 StudyInstanceUID 하나뿐입니다.** EMR은 Orthanc에 영상이 왔는지 묻지 않고, 환자 번호가 맞는지도 확인하지 않습니다(7절 P-3, P-4).

### 3.2 번호 만드는 법 (`consult.routes.js` POST `/:id/orders`)

- **AccessionNumber** = `YYMMDD-<order_item.id>` (예: `260627-35`). DICOM SH 16자 이내. order_item.id가 전역 유일이라 겹치지 않습니다.
- **StudyInstanceUID** = `1.2.826.0.1.3680043.<YYYYMMDD>.<order_item.id>.<0~9999 난수>`. 루트 `1.2.826.0.1.3680043`은 Medical Connections(pydicom 기본)의 루트를 빌려 쓴 것입니다(7절 P-14).
- **PatientID** = `patient.chart_no` (예: `26-00001`). **PatientName** = `성^이름` (`last_name^first_name`).
- `station_ae`는 일부러 비웁니다 — 같은 초음파 오더를 여러 방이 나눠 받기 때문(코드 주석). 그래서 `.wl`에는 `ScheduledStationAETitle = "ANY"`가 들어갑니다.
- 설정의 **자동 워크리스트 생성**(`pacs_config.auto_create_worklist`)을 끄면 worklist_log를 만들지 않습니다.

### 3.3 브리지가 하는 일 (`bridge/bridge.py`)

`main()`이 무한 반복합니다. 한 바퀴:

1. `sync()` — `EMR_FEED_URL`에 `GET ?token=<BRIDGE_TOKEN>&format=json` (timeout 10초). 실패(연결 불가, 401, 500)면 예외 → 이번 바퀴는 **파일을 건드리지 않고** 끝납니다.
2. 받은 줄마다 `accession_no`(없으면 `study_instance_uid`)를 파일 이름으로 `write_wl()` — `<이름>.wl.tmp`에 쓰고 `os.replace`로 바꿔 끼웁니다. Orthanc가 반쯤 쓴 파일을 읽지 않게 하려는 것.
   - 한 줄이 변환에 실패해도 그 줄만 건너뛰고(이전 좋은 `.wl`은 남김) 나머지는 계속합니다 (v1.0.0에서 고친 것).
3. 이번 목록에 없는 `.wl` 파일은 **지웁니다** — 촬영 완료·취소·오더 삭제·날짜 지남.
4. `report()` — `/worklists/.heartbeat`에 현재 시각을 쓰고(컨테이너 healthcheck용), `POST /api/pacs/bridge-heartbeat`로 결과(synced, failed, error, poll_seconds)를 보냅니다. 둘 다 실패해도 반복은 멈추지 않습니다.
5. `POLL_SECONDS`(기본 15초) 잠듭니다.

매 바퀴 **모든 `.wl`을 새로 씁니다**(내용이 같아도). `.wl`의 MediaStorageSOPInstanceUID는 바퀴마다 새로 만들어집니다.

### 3.4 끊겼을 때

| 상황 | 장비에 보이는 것 | 누가 알 수 있나 |
|---|---|---|
| EMR이 멈춤 / 브리지가 EMR에 못 닿음 | **마지막으로 쓴 `.wl`이 그대로 남음.** 새 오더는 안 들어오고, 끝난·취소된 오더도 안 빠짐. 자정이 지나도 어제 목록이 남음 | 브리지 로그 `bridge error:`, EMR 상태 화면 「보고 없음」(60초 이상) |
| 토큰 불일치 (401) | 위와 같음 | EMR 상태 화면 — 브리지가 heartbeat도 같은 토큰으로 보내므로 **EMR에는 신호가 아예 안 옴** → 「보고 없음」 |
| 브리지 컨테이너가 멈춤·먹통 | 위와 같음 | 컨테이너 healthcheck(`.heartbeat` 60초), `server-status` 창, EMR 상태 화면 |
| Orthanc가 멈춤 | 워크리스트 조회·전송 모두 실패 (장비 쪽 오류) | Orthanc healthcheck(`/system` 200/401), EMR 상태 화면의 PACS TCP 검사 |
| **호스트 포트가 안 잡힘** (Windows 예약 포트) | 장비가 4242에 연결 못 함, 뷰어가 안 열림 | **컨테이너 healthcheck는 「healthy」로 나옴** — 컨테이너 안에서만 확인하기 때문. EMR 상태 화면의 PACS 검사(설정된 Host:4242로 TCP)만 잡아냄 (7절 P-1) |

EMR 상태 화면 판정(`status.routes.js` `checkBridge`, 설정 세션 파일): heartbeat가 한 번도 없으면 「꺼짐」, 60초 넘게 없으면 「보고 없음」, `ok=false`면 「실패 중」, `failed>0`이면 「일부 실패」.

## 4. 데이터 · API

### 화면

- `frontend/src/components/RadiologyReadings.jsx` — 환자의 영상 검사·판독 목록(읽기 전용). `props.patientId`, `props.onOpen(orderItemId)`가 있으면 「영상보기」 버튼 표시. 진료·수납 화면의 「🩻 판독소견」 창 안에 들어갑니다.
- 영상 뷰어 창(iframe + 판독 입력)과 🖼 버튼은 **`frontend/src/pages/Consultation.jsx` 안**에 있습니다(`openViewer`, `saveReading`, 약 51~66줄, 692~716줄) — **진료 세션 파일**이라 PACS 세션이 직접 고치지 않습니다.
- 설정 → 오더 연동(Order Feed) 탭 — `Settings.jsx` 약 476~515줄, `savePacs`·`testPacs`.

### 서버 — `backend/src/routes/pacs.routes.js` (`/api/pacs`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /config` | 로그인만 (권한 없음) | `pacs_config` 한 줄 전체 — **bridge_token 포함** (7절 P-5) |
| `PUT /config` | `settings` 권한 | 설정 저장. 보내지 않은 칸은 NULL이 됨(화면은 전체를 보내므로 지금은 문제 없음) |
| `GET /test` | 로그인 | `worklist_scp_host:port`로 TCP 연결 시험 (`utils/tcpCheck.js`) |
| `GET /viewer-url?order_item_id=` 또는 `?study=` | 로그인 | 뷰어 주소 + 오더 이름 + 판독. UID가 없으면 뷰어 **첫 화면 주소**를 돌려줌 |
| `PUT /reading/:orderItemId` | `consultation` 권한 | `order_item`(code_type='imaging')의 result_text·result_by·result_at 덮어쓰기. 이력 없음 |
| `GET /readings/patient/:patientId` | 로그인 | 환자의 영상 오더 전부 + 판독 + 최신 accession/UID |
| `GET /worklist-feed?token=&format=json\|csv&date=&modality=&station_ae=` | **브리지 토큰** (쿼리 또는 `X-Bridge-Token`) | 브리지용 피드. 기본 날짜 `todayLocal()`, `status='scheduled'`만 |
| `POST /bridge-heartbeat` | 브리지 토큰 (본문 `token`) | `service_heartbeat`의 `worklist_bridge` 줄을 덮어씀 |

`ensureConfig()`가 요청마다 `CREATE TABLE IF NOT EXISTS pacs_config` + `ALTER … ADD COLUMN IF NOT EXISTS`를 실행합니다(오래된 DB 호환용, 마이그레이션과 중복).

### 서버 — `backend/src/routes/worklist.routes.js` (`/api/worklist`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /?modality=&station_ae=&date=&status=` | 로그인 | worklist_log + 환자 이름·생년월일. 날짜 기본 `CURRENT_DATE`(DB 시간대) |
| `PUT /:id/status` | 브리지 토큰 **또는** 로그인 | worklist_log.status와 order_item.worklist_status 변경. **지금 부르는 곳이 없음**. 값 검사·트랜잭션 없음 (7절 P-11) |
| `GET /dicom-mwl?modality=&station_ae=` | 브리지 토큰 또는 로그인 | DICOM 태그 이름 모양의 JSON. 옛 외부 브리지용. **지금 쓰는 곳 없음** |

### PACS 저장소 (`C:\Bethesda-PACS-main`)

- `docker-compose.yml` — 프로젝트 이름 `bethesda-pacs` 고정. 컨테이너 `bethesda-pacs`(Orthanc), `bethesda-worklist-bridge`. 볼륨은 **폴더 마운트** `./storage`(영상+색인), `./worklists`(`.wl`, `.heartbeat`).
- `bridge/bridge.py`, `bridge/Dockerfile`(python 3.12-slim, pydicom 2.4.4, requests 2.32.3)
- 시험 도구(장비 없이 확인용, compose 네트워크 안에서 실행): `make_demo.py`·`make_chest5.py`(가짜 영상 올리기, Orthanc REST), `storetest.py`(C-STORE), `q_test.py`(MWL C-FIND). **pynetdicom은 브리지 이미지에 없음** — 따로 설치 필요.
- `setup.ps1`·`setup.sh`(`-Offline`/`--offline`), `start.bat`

### 브리지 환경 변수

| 이름 | 기본값 (compose) | 뜻 |
|---|---|---|
| `EMR_FEED_URL` | `http://host.docker.internal:9080/api/pacs/worklist-feed` | EMR 피드. heartbeat 주소는 여기서 `/worklist-feed`→`/bridge-heartbeat`로 바꿔 만듦. (`bridge.py` 안 기본값은 옛 포트 8080) |
| `BRIDGE_TOKEN` | `.env`에서 (setup이 무작위 생성) | EMR 설정의 Bridge Token과 같아야 함 |
| `WL_DIR` | `/worklists` | `.wl`을 쓰는 곳 |
| `POLL_SECONDS` | `15` | 주기 |

### Orthanc 설정 (compose 환경 변수)

`ORTHANC__DICOM_AET=MEDCONNECT`, `DICOM_CHECK_CALLED_AET=false`, `REMOTE_ACCESS_ALLOWED=true`, `DICOM_ALWAYS_ALLOW_FIND_WORKLIST / FIND / STORE / ECHO = true`(장비 등록 없이 받음), `AUTHENTICATION_ENABLED=true`, 사용자 `admin` 하나(비밀번호 `.env`의 `ORTHANC_PASSWORD`), 워크리스트 플러그인(`/var/lib/orthanc/worklists`), DICOMweb, Stone Web Viewer, Orthanc Explorer 2. 포트 `9090→8042`(웹), `4242→4242`(DICOM).

EMR이 쓰는 Orthanc 쪽 주소는 **Stone 뷰어 `/stone-webviewer/index.html?study=`** 하나뿐입니다. EMR 백엔드는 Orthanc REST를 부르지 않습니다.

### 비밀값 (이름과 의미만)

- **`ORTHANC_PASSWORD`** — PACS `.env`. Orthanc `admin` 비밀번호. 뷰어로 영상을 보는 모든 사람이 이 계정을 씁니다.
- **`BRIDGE_TOKEN`** — PACS `.env`와 EMR `pacs_config.bridge_token`이 **같아야** 합니다(페어링). 오더 피드와 heartbeat의 유일한 인증.

### 공용 부품

- `utils/localDate.js`(`todayLocal`, `dicomDate`)·`utils/tcpCheck.js` — 총괄 관리 공용 파일을 씀. 고치지 않음.

### DB 테이블

| 테이블 | 주요 칸 | 비고 |
|---|---|---|
| `worklist_log` (001) | order_item_id(FK, CASCADE — 007), patient_id, modality, station_ae, body_part, accession_no, study_instance_uid, scheduled_date, scheduled_time, status(`scheduled`/`in_progress`/`completed`/`cancelled`), completed_at | 오더 1개에 보통 1줄. **status를 `scheduled`에서 바꾸는 코드가 없음** |
| `order_item` (001, 진료 소유) | pacs_modality, station_ae, body_part, worklist_status(`pending`/`sent`/…), worklist_sent_at, result_text, result_by, result_at | 판독은 여기 저장 |
| `order_code` (설정 소유) | pacs_modality(US/CR/CT/MR/ES/OT), worklist_enabled, station_ae, body_part | 어떤 오더가 워크리스트로 가는지 정함 |
| `pacs_config` (001, 015) | worklist_scp_host/port/ae, bridge_token, emr_base_url, pacs_viewer_url, auto_create_worklist, facility_name, notes | 한 줄(id=1). 015가 옛 한국 데모값(`BROKER`/`192.168.0.222`)을 Orthanc 기본값으로 바꿈 |
| `service_heartbeat` (018, 설정과 공유) | name(`worklist_bridge`), last_seen, ok, detail(JSONB) | 현재 상태만, 이력 없음 |

마이그레이션 `007_worklist_cascade.sql`(오더 삭제 시 worklist_log 같이 삭제), `015_pacs_viewer.sql`(pacs_viewer_url 추가·데모값 정리), `018_service_heartbeat.sql`. 셋 다 이미 적용된 파일이라 **고치지 않습니다**.

## 5. 다른 모듈과의 연결

- **진료** — 영상 오더를 만들고(`consult.routes.js`가 worklist_log 생성), 오더를 지우면 worklist_log도 지움. 영상 뷰어 창·🖼 버튼·판독 입력 UI가 `Consultation.jsx` 안에 있음. `consult.routes.js`도 `pacs_config`를 `CREATE TABLE IF NOT EXISTS`로 만드는데, 그 기본값이 옛 데모값(`192.168.0.222`/`10004`/`BROKER`/`Yonsei Shintong Clinic`)입니다 — 테이블이 이미 있으면 영향 없음.
- **수납** — 「🩻 판독소견」에서 `RadiologyReadings`를 읽기 전용으로 띄움. 영상 오더 청구는 수납 모듈 몫.
- **설정** — 오더 코드의 Modality·워크리스트 사용 여부, 오더 연동 탭(`/api/pacs/config`). 서버 상태(`status.routes.js` `checkBridge`·`checkPacs`, `server-status.ps1`)가 브리지·PACS를 봄.
- **PatientChart**(수납 소유 공용) — 오더의 worklist_status를 글자로 보여줌.

## 6. 설정 항목

**EMR → 설정 → 오더 연동(Order Feed)** — `settings` 권한

| 화면 칸 | DB 칸 | 뜻 |
|---|---|---|
| Bridge Token | `bridge_token` | PACS `setup`이 출력한 값을 붙여넣음. 기본값 `change-me-bridge-token`(7절 P-2) |
| EMR 공개 주소 | `emr_base_url` | 화면에 피드 주소 예시를 보여줄 때만 씀 |
| 자동 워크리스트 생성 | `auto_create_worklist` | 끄면 영상 오더가 워크리스트로 안 감 |
| Host / IP | `worklist_scp_host` | Orthanc DICOM 주소. **EMR 컨테이너에서 본 주소**라 `localhost`는 안 됨 → `host.docker.internal` 또는 서버 LAN IP. 비우면 상태 화면이 PACS를 「꺼짐」으로 봄 |
| DICOM Port | `worklist_scp_port` | 4242 |
| AE Title | `worklist_scp_ae` | MEDCONNECT (화면 표시·피드 `config`에만 쓰임) |
| PACS 웹/뷰어 주소 | `pacs_viewer_url` | **직원 브라우저에서 본 주소** `http://<서버 IP>:9090`. 비우면 영상 없이 판독만 가능 |

**설정 → 오더 코드** — 영상 검사마다 `Modality`와 `worklist_enabled`를 켜야 워크리스트로 갑니다.

**PACS `.env`** — `ORTHANC_PASSWORD`, `BRIDGE_TOKEN`, (선택) `EMR_FEED_URL`. `setup`이 처음 한 번 만들고 다시 실행해도 덮어쓰지 않습니다.

**장비 쪽** — PACS Host = 서버 IP, 포트 4242, Called AE = `MEDCONNECT`, 워크리스트도 같은 주소. 장비 자기 AE는 아무거나.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것. **심각도**: 높음 / 보통 / 낮음. 아직 하나도 고치지 않았습니다.

### 지금 돌아가는 PACS

- **P-1 [높음] 실행 중인 PACS에 호스트에서 연결이 안 됨 (2026-09-29 확인).** `docker inspect bethesda-pacs`에서 PortBindings는 `9090`·`4242`인데 실제 `NetworkSettings.Ports`가 비어 있고, 호스트에서 `127.0.0.1:9090`·`:4242` TCP 연결이 모두 실패합니다. 컨테이너는 「healthy」 — healthcheck가 컨테이너 **안**에서만 묻기 때문. 이 PC의 Windows 예약 포트 대역에 **`4204–4303`이 있어 4242가 그 안에 들어갑니다**(`netsh interface ipv4 show excludedportrange protocol=tcp`). 9090은 예약 대역 밖인데도 안 잡혀 있음 — 원인 확인 필요. 결과: 지금 장비가 워크리스트를 못 받고 영상을 못 보내며, EMR에서 영상이 안 열립니다. 브리지 자체는 정상(`synced 0 worklist entries` 반복). 근거: README의 8090→9090 이전과 같은 종류의 문제. 해결은 실장님 결정 필요(인계 노트 참고).
- `server-status.ps1`(설정 세션 파일)은 PACS를 컨테이너 health로만 봐서 P-1 상태에서도 초록으로 보일 것으로 보입니다 — 확인 필요.

### 환자 식별 (영상이 다른 환자·다른 오더에 붙는 경우)

- **P-3 [보통] 영상이 맞는 환자의 것인지 EMR이 확인하지 않음.** `pacs.routes.js:91` — StudyInstanceUID만으로 뷰어를 엽니다. 방사선사가 워크리스트에서 다른 환자를 골라 찍으면 그 영상은 고른 환자(틀린 환자)의 오더에 붙어 그대로 보입니다. 뷰어 창 머리의 환자 이름은 EMR 쪽 이름이고, 영상 속 DICOM 환자 이름은 Stone 뷰어 안에만 나옵니다. 개선안: 뷰어를 열 때 EMR 백엔드가 Orthanc REST로 그 Study의 PatientID를 조회해 chart_no와 다르면 경고.
- **P-4 [보통] 장비가 StudyInstanceUID를 새로 만들면 영상이 오더에 안 붙음.** 연결 고리가 UID 하나뿐입니다(`pacs.routes.js:81-91`). README는 「Accession Number / Study UID로 맞춘다」고 하지만 코드는 UID만 씁니다. 일부 CR·초음파 장비는 워크리스트의 UID를 쓰지 않고 자기 UID를 만듭니다(장비별 확인 필요). 개선안: UID로 못 찾으면 AccessionNumber로 Orthanc에서 찾기.
- **P-6 [보통] 워크리스트가 「오늘」만 나옴.** `pacs.routes.js:134`·`worklist.routes.js:75` — 어제 낸 오더를 오늘 찍으면 장비 목록에 없어서 손으로 입력 → P-4처럼 연결이 끊깁니다. `consult.routes.js`가 `scheduled_date=CURRENT_DATE`로 고정.
- **P-7 [보통] 촬영이 끝나도 워크리스트에서 안 빠짐.** worklist_log.status를 `completed`로 바꾸는 곳이 없습니다(`PUT /api/worklist/:id/status`를 부르는 코드 없음). 끝난 환자가 하루 종일 장비 목록에 남아, 다음 환자를 찍을 때 잘못 고를 여지가 커집니다. `order_item.worklist_status`도 영원히 `sent`. 개선안: 브리지가 Orthanc에 해당 UID/Accession 영상이 들어왔는지 보고 완료 처리.
- **P-8 [낮음] 워크리스트의 `ScheduledStationAETitle = "ANY"`.** `bridge.py:76` — 장비가 조회할 때 자기 AE로 거르면(장비 설정에 흔함) "ANY"와 안 맞아 목록이 비어 보일 수 있습니다. 확인 필요(실제 장비로).

### 보안 (토큰 · 비밀번호)

- **P-2 [높음] 기본 브리지 토큰이 저장소에 공개된 값이고, EMR은 그 값을 그대로 받아들임.** `pacs_config.bridge_token` 기본값 `change-me-bridge-token`(`001_schema.sql`, `pacs.routes.js:15`), PACS compose 기본값도 같음. PACS를 페어링하지 않은 **모든 EMR 설치**에서 `GET /api/pacs/worklist-feed?token=change-me-bridge-token`으로 로그인 없이 오늘 영상 오더 환자의 이름·생년월일·성별·차트번호를 가져갈 수 있습니다(`pacs.routes.js:132`). 같은 토큰으로 `PUT /api/worklist/:id/status`도 됩니다(`worklist.routes.js:15`). 개선안: 기본값·빈 값·짧은 값을 「설정 안 됨」으로 보고 거절.
- **P-5 [보통] 브리지 토큰이 모든 로그인 직원에게 보임.** `GET /api/pacs/config`에 권한 검사가 없습니다(`pacs.routes.js:43`). 설정 화면도 피드 주소를 토큰째 보여줍니다(`Settings.jsx:495-496`). 브리지는 토큰을 URL 쿼리로 보내(`bridge.py:94`) 접속 기록에 남을 수 있습니다. 개선안: `/config`를 settings 권한으로, 화면에는 가려서, 브리지는 `X-Bridge-Token` 헤더로.
- **P-9 [보통] 영상을 보는 모든 직원이 Orthanc 관리자 계정을 씀.** 사용자가 `admin` 하나(`docker-compose.yml` `REGISTERED_USERS`). 뷰어(iframe)가 Orthanc에 직접 붙으므로 직원 브라우저가 이 계정으로 로그인해야 하고, 그 계정은 영상 삭제·수정까지 됩니다. 실제 현장에서 어떻게 로그인하고 있는지 확인 필요. 개선안: 읽기 전용 사용자 분리, 또는 EMR이 대신 가져다 주는 방식(프록시).
- **P-10 [보통] 같은 LAN의 누구나 DICOM으로 환자 목록을 조회할 수 있음.** `DICOM_ALWAYS_ALLOW_FIND=true`, `CHECK_CALLED_AET=false`(`docker-compose.yml`) — 등록 안 된 기기도 C-FIND로 저장된 환자·검사 정보를 묻고 C-STORE로 아무 영상이나 넣을 수 있습니다. 장비 등록 없이 쓰려는 의도된 선택(주석)이지만, 장비가 정해지면 `DicomModalities` 등록으로 좁히는 것을 권합니다.
- **P-12 [낮음] 시험 스크립트에 옛 Orthanc 비밀번호와 실제 인물로 보이는 이름·생년월일이 들어 있음.** `bridge/make_demo.py:10,28-30`, `make_chest5.py:9,32-34`. 지금 PACS `.env`의 비밀번호와는 다름을 확인(값은 적지 않음). git 기록에 남아 있으므로, 그 비밀번호를 다른 곳에 썼다면 바꾸는 것을 권합니다.
- **P-13 [낮음] `.env`가 없을 때의 기본 비밀번호.** compose가 `change-me-orthanc`, `change-me-bridge-token`으로 떨어집니다. `setup`/`start.bat`로 설치하면 `.env`가 먼저 생기므로 실제로는 드묾.

### 동작 · 기타

- **P-11 [낮음] `PUT /api/worklist/:id/status`에 값 검사·트랜잭션 없음.** `worklist.routes.js:45-61` — 예: `scheduled`는 worklist_log엔 들어가지만 order_item의 CHECK에 걸려 둘이 어긋남. 로그인만 있으면 누구나 호출 가능. 지금 쓰는 곳 없음.
- **P-15 [낮음] 판독을 덮어쓰면 이전 판독이 사라짐(이력 없음).** `pacs.routes.js:100`. 서명·확정 개념도 없음.
- **P-16 [낮음] 뷰어 창 바깥을 누르면 저장 안 한 판독이 사라짐.** `Consultation.jsx:693`(진료 세션 파일).
- **P-17 [낮음] 옛 포트 표기.** 설정 화면 예시 `http://NAS_IP:8090`, 피드 주소 예시 `:8080`(`Settings.jsx:495,508`), 번역 `pacsServerHint`(ko·en·fr 모두 「8090」), `bridge.py:15` 기본값 8080. 지금은 9090(PACS)·9080(EMR).
- **P-18 [낮음] UID가 없는 오더로 `viewer-url`을 부르면 뷰어 첫 화면(모든 환자 목록)을 돌려줌.** `pacs.routes.js:91`. 지금 화면은 🖼 버튼을 영상 오더에만 보이므로 실제로는 worklist_enabled가 꺼진 영상 오더에서 생깁니다. 확인 필요.
- **P-19 [낮음] `worklist_status`가 번역 없이 영어(`sent`)로 보임.** `Consultation.jsx:524`, `PatientChart.jsx:70`.
- **P-14 [낮음] UID 루트를 남의 것(`1.2.826.0.1.3680043`)을 씀.** 실무상 충돌 가능성은 매우 낮음. 자체 루트 발급은 선택 사항.
- **격리 스택 없음** — PACS 저장소에서 `docker compose up`을 하면 실행 중인 PACS를 덮어씁니다(프로젝트 이름·컨테이너 이름·포트·`./storage` 폴더 고정). 격리 스택은 실장님 허락 후 만듭니다.
- 브리지는 장비별로 워크리스트를 나누지 않습니다(모든 장비가 모든 오더를 봄). Modality로만 장비가 거를 수 있음.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 위키 첫 작성 — 실제 코드 기준으로 1~7절 채움, 문제 목록 P-1~P-19 | EMR `session/pacs` (이 커밋) |
