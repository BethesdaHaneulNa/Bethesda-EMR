# PACS (의료 영상)

> **담당**: PACS 세션 · 브랜치 `session/pacs` (EMR 저장소와 PACS 저장소 둘 다) · **마지막 갱신**: 2026-09-29 · **상태**: 토큰 보안(P-2·P-5) develop에 합침 · 영상 도착 확인(P-7)·환자번호 대조(P-3) 확인 요청 — 나머지는 7절

## 1. 이 모듈이 하는 일

의사가 EMR에서 낸 **영상 오더**(X선·초음파 등)를 **촬영 장비의 워크리스트**로 넘기고, 장비가 찍은 영상을 **Orthanc**에 저장했다가, EMR 안에서 **영상을 보고 판독 소견을 쓰게** 합니다.

- 방사선사가 장비에 환자 이름·생년월일을 다시 치지 않아도 됩니다(오타로 영상이 엉뚱한 환자에 붙는 일을 줄이려는 목적).
- 영상은 **EMR DB에 들어가지 않습니다.** Orthanc(별도 컨테이너)에 저장되고, EMR은 오더마다 정해 둔 **StudyInstanceUID**로 Orthanc 뷰어를 불러올 뿐입니다.
- 판독 소견은 EMR의 `order_item.result_text`에 저장됩니다.
- 영상이 PACS에 다 들어오면 브리지가 EMR에 알려 줍니다. 그러면 그 오더는 **장비 워크리스트에서 빠지고**, EMR에는 「영상 N장 도착」과 **영상 속 환자번호가 차트번호와 맞는지**가 기록됩니다.
- PACS는 **선택 사항**입니다. PACS를 설치하지 않은 병원에서도 영상 오더·판독 입력은 됩니다(영상만 안 보임).

구성은 저장소 두 개에 나뉘어 있습니다.

| 부분 | 어디 | 무엇 |
|---|---|---|
| Orthanc 26.6.1 | PACS 저장소 `docker-compose.yml` (공식 이미지 `orthancteam/orthanc`, 우리가 수정하지 않음) | 영상 저장, DICOM 수신(C-STORE), 워크리스트 응답(MWL C-FIND), 웹 뷰어(Stone Web Viewer, Orthanc Explorer 2) |
| 워크리스트 브리지 | PACS 저장소 `bridge/bridge.py` (우리 코드, Python) | EMR의 오더 피드를 15초마다 읽어 `.wl` 파일로 씀. 오더마다 Orthanc에 영상이 다 들어왔는지 보고 EMR에 알림 |
| EMR 쪽 | EMR 저장소 `pacs.routes.js` · `worklist.routes.js` · `RadiologyReadings.jsx` (+ 진료 화면의 뷰어 창) | 워크리스트 생성, 피드 제공, 뷰어 주소, 판독 저장, 브리지 생존 신호 |

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR** 로 바꿉니다.
>
> 촬영 장비의 메뉴 이름은 장비마다 다릅니다. 장비를 설치한 뒤 채웁니다 — 확인 필요.

### 2.1 의사 — 영상 검사 내기

1. 맨 위 메뉴에서 **Consultation (진료)** 를 누르고, **File d'Attente (진료대기 현황)** 또는 **🔍 Trouver patient (환자 찾기)** 로 환자를 엽니다.
2. **Prescriptions (처방)** 칸의 입력란 **Saisir médicament, code examen ou nom... (약/검사 코드 또는 이름 입력...)** 에 검사 이름을 쳐서 영상 검사(예: Chest PA, 초음파)를 추가합니다.
3. 오더 줄 오른쪽 끝(**WL** 칸)의 글자가 **Envoyé (전송됨)** 이면 촬영실 장비로 넘어간 것입니다. 영상이 다 들어오면 **Réalisé (촬영 완료)** 로 바뀝니다.
4. 잘못 낸 검사는 그 줄을 지우면 됩니다. 15초 안에 장비 목록에서도 빠집니다.
   - 줄 앞에 **🔒** 가 있으면 지울 수 없습니다. 마우스를 올리면 *Cette demande a déjà un résultat… (결과가 이미 있는 오더는 지울 수 없습니다)* 가 보입니다. 영상이 이미 들어왔거나 판독을 쓴 검사입니다.

> 검사는 **낸 날에만** 장비 목록에 나옵니다. 오늘 낸 검사를 내일 찍으려면 내일 다시 내야 합니다(7절 P-6).

### 2.2 방사선사 — 촬영

1. 장비(또는 장비 PC)에서 **워크리스트(Worklist / MWL)** 를 불러옵니다. 오늘 검사가 난 환자가 나옵니다.
   - **환자를 찍기 직전마다 목록을 새로 불러오세요.** 아까 불러온 목록을 그대로 쓰면, 그 사이 진료실에서 지우거나 취소한 검사가 장비 화면에는 아직 남아 있을 수 있습니다. 그런 검사로 찍으면 영상이 어느 오더에도 붙지 않거나 취소된 오더에 붙어, 의사가 진료 화면에서 제대로 볼 수 없습니다.
2. 목록에서 **찍을 환자를 정확히 고릅니다.** 이름 · 차트번호(예: `26-00001`) · 검사 이름을 환자와 맞춰 봅니다.
   - **여기서 다른 환자를 고르면 영상이 그 환자의 기록에 붙고, EMR은 그것을 알아챌 수 없습니다.** 이 단계가 가장 중요합니다.
3. 촬영이 끝나면 장비에서 PACS로 **전송(Send / Store)** 합니다.
4. 전송하고 **1~2분쯤 지나면 그 환자는 워크리스트에서 저절로 빠집니다.** 끝난 환자가 목록에 남아 있으면 다음 환자를 잘못 고르기 쉬워서입니다.
   - 같은 검사를 더 찍어야 하면 장비에 남아 있는 그 검사에 이어서 찍어 보냅니다. (장비마다 다름 — 확인 필요)

**워크리스트에 환자가 없을 때**

1. **환자 이름을 장비에 손으로 치지 마세요.** 손으로 친 영상은 EMR의 검사와 연결되지 않아 의사가 진료 화면에서 볼 수 없습니다.
2. 의사에게 그 환자의 영상 검사를 **오늘** 냈는지 물어봅니다. 어제 낸 검사는 오늘 목록에 없습니다.
3. 검사를 냈다면 15초쯤 기다렸다가 워크리스트를 다시 불러옵니다.
4. 그래도 없으면 **전체 목록이 비어 있는지** 봅니다. 모든 환자가 안 보이면 PACS 연결 문제입니다 — 관리자(실장님)에게 알립니다. (관리자는 서버 상태 창의 **Imagerie (PACS)** · **Liste de travail des appareils (장비 워크리스트)** 줄을 봅니다.)

### 2.3 의사 — 영상 보기와 판독

1. **Consultation (진료)** 화면의 오더 목록에서 영상 검사 줄의 **🖼** 버튼을 누릅니다.
2. **🖼 Visionneuse (영상 뷰어)** 창이 열립니다. 왼쪽이 영상, 오른쪽이 **🩻 Compte-rendu (판독소견)** 칸입니다. 창 맨 위에 EMR에서 고른 환자의 차트번호·이름이 보입니다.
3. 오른쪽 칸 **Saisir le compte-rendu radiologique... (판독 소견을 입력하세요...)** 에 판독을 쓰고 **💾 Enregistrer (판독 저장)** 을 누릅니다. 위에 **Lu par (판독)** : 쓴 사람 · 날짜가 나옵니다.
4. 영상을 크게 보려면 **Ouvrir dans un onglet ↗ (새 탭에서 열기)** 를 누릅니다.
5. 다 봤으면 **Fermer ✕ (닫기)** 를 누릅니다.

> ⚠ **판독을 쓰는 중에 창 바깥의 어두운 곳을 누르면 창이 닫히고, 저장하지 않은 판독은 사라집니다.** 먼저 **Enregistrer** 를 누르세요.
>
> 판독은 **진료 권한**이 있는 직원만 쓰고 고칠 수 있습니다. 판독을 고치면 이전 내용은 남지 않습니다.
>
> 처음 영상을 열 때 PACS 아이디·비밀번호를 물을 수 있습니다 — 확인 필요 (7절 P-9).

### 2.4 환자의 영상 검사 한눈에 보기

- **Consultation (진료)** 화면 위쪽의 **🩻 Compte-rendu (판독소견)** 버튼 → 이 환자의 모든 영상 검사가 최근 것부터 나옵니다. 줄마다 날짜 · 종류(US, CR …) · 검사 이름 · 판독 내용이 보이고, **🖼 Voir image (영상보기)** 를 누르면 2.3의 영상 창이 열립니다.
- 검사 이름 옆에 영상이 왔는지 나옵니다.
  - **N image(s) reçue(s) (영상 N장 도착)** — 초록. 영상이 모두 들어왔습니다.
  - **Images en attente (영상 대기 중)** — 회색. 아직 안 왔습니다(2.5 참고).
  - 아무것도 없으면 워크리스트로 보내지 않는 검사입니다.
- 영상 검사가 하나도 없으면 **Aucune imagerie (영상검사 내역이 없습니다)**, 판독이 없으면 **Aucun compte-rendu (판독 소견 없음)** 이 나옵니다.
- **Paiement (수납)** 화면에도 **🩻 Compte-rendu (판독소견)** 버튼이 있습니다. 여기서는 **읽기만** 할 수 있고 영상 창은 열리지 않습니다.
- 창을 닫았다가 다시 열면 새로 불러옵니다. 영상이 도착했는지 다시 보려면 닫고 다시 여세요.

### 2.5 영상이 안 보일 때 — 순서대로

1. **🩻 Compte-rendu (판독소견)** 목록에서 그 검사 옆 글자를 봅니다.
2. **Images en attente (영상 대기 중)** 이면 영상이 아직 PACS에 안 왔습니다.
   1. 방사선사가 전송한 지 **2분이 안 됐으면** 기다렸다가 목록을 닫고 다시 엽니다. 전송이 끝나고 1분쯤 새 영상이 없어야 「도착」으로 바뀝니다.
   2. 몇 분이 지나도 그대로면 방사선사에게 묻습니다 — 전송했는지, **워크리스트에서 이 환자를 골라** 찍었는지. 환자 이름을 장비에 손으로 쳐서 찍었으면 이 검사와 연결되지 않습니다. 관리자에게 알립니다(연결하는 기능은 아직 없음, 7절 P-4).
   3. 방사선사가 제대로 보냈다고 하면 관리자(실장님)에게 알립니다.
3. **N image(s) reçue(s) (영상 N장 도착)** 인데 영상 창에 영상이 안 나오면:
   1. 창 가운데에 **URL de la visionneuse PACS non definie… (PACS 뷰어 주소가 설정되지 않았습니다)** 가 보이면 설정이 안 된 것입니다. 관리자에게 알립니다. 그동안에도 판독은 쓸 수 있습니다.
   2. 영상 칸이 까맣거나 「연결할 수 없음」이 나오면 이 컴퓨터가 PACS 서버에 닿지 않는 것입니다. **Ouvrir dans un onglet ↗ (새 탭에서 열기)** 로 한 번 더 열어 보고, 그래도 안 되면 관리자에게 알립니다.
   3. 아이디·비밀번호를 물으면 관리자에게 묻습니다. 모르는 값을 여러 번 넣지 마세요.
4. 목록에 도착 여부가 아예 나오지 않으면 워크리스트로 보내지 않는 검사입니다. 설정에서 그 검사 코드를 확인해야 합니다 — 관리자에게 알립니다.

### 2.6 환자 번호 경고가 떴을 때 — 순서대로

**🩻 Compte-rendu (판독소견)** 목록과 **🖼 Visionneuse (영상 뷰어)** 창 위쪽에 이런 경고가 보일 수 있습니다.

- 🟥 빨강 — *Les images sont au nom de « 26-00012 RAKOTO Jean », qui ne correspond pas au numéro de dossier de ce patient… (영상에 적힌 환자는 「26-00012 RAKOTO Jean」으로, 이 환자의 차트번호와 다릅니다…)* — 영상 속 환자번호가 이 환자의 차트번호와 다릅니다.
- 🟧 노랑 — *Les images ne portent aucun numéro de patient… (영상에 환자번호가 없습니다…)* — 영상에 환자번호가 없습니다.

둘 다 **장비에서 환자 정보를 손으로 치거나 고친 영상**일 때 생깁니다. 다른 환자의 영상일 수 있습니다.

1. **아직 판독을 쓰지 마세요.**
2. **🖼 Voir image (영상보기)** 로 영상을 열고, 영상 위에 적힌 환자 이름·번호·촬영 날짜를 봅니다.
3. 방사선사에게 경고에 나온 번호·이름을 알려 주고, 누구를 찍은 영상인지 확인합니다.
4. **이 환자의 영상이 맞으면**(번호만 잘못 쳤으면) 판독을 써도 됩니다. 판독에 「영상의 환자번호 오기 확인함」처럼 한 줄 남겨 두면 나중에 보는 사람이 압니다. 경고는 계속 보입니다.
5. **다른 환자의 영상이면** 판독을 쓰지 말고 관리자(실장님)에게 알립니다. EMR에서 영상을 다른 환자로 옮기는 기능은 아직 없습니다. 이 환자는 다시 찍어야 할 수 있습니다 — 의사가 판단합니다.

> **이 경고가 없다고 해서 반드시 맞는 환자의 영상은 아닙니다.** 방사선사가 워크리스트에서 **다른 환자를 골라** 찍었으면, 그 영상에는 고른 환자의 정보가 그대로 들어가 경고가 뜨지 않습니다. 영상 속 환자와 눈앞의 환자가 다르다고 느껴지면 2.6의 순서대로 확인하세요.

## 3. 기능 상세

### 3.1 전체 흐름

```
 ① 진료: 영상 오더 저장            POST /api/consultations/:id/orders  (consult.routes.js — 진료 세션 파일)
      │  order_code.worklist_enabled && pacs_modality 이면
      │  worklist_log 1줄 생성: accession_no, study_instance_uid, scheduled_date=CURRENT_DATE
      │  order_item.worklist_status = 'sent'
      ▼
 ② 브리지(15초마다)                 GET /api/pacs/worklist-feed?format=json   (헤더 X-Bridge-Token)
      │  오늘 + status='scheduled' 인 worklist_log 전부
      │  줄마다 /worklists/<accession>.wl 파일을 씀, 목록에 없는 .wl 은 지움
      ▼
 ③ Orthanc 워크리스트 플러그인       /var/lib/orthanc/worklists (브리지와 같은 폴더를 마운트)
      │  장비가 C-FIND(MWL) 로 조회하면 .wl 내용을 돌려줌
      ▼
 ④ 장비 촬영 → C-STORE → Orthanc   (포트 4242, AE Title MEDCONNECT)
      │  장비가 워크리스트의 StudyInstanceUID · AccessionNumber 를 영상에 그대로 넣는 것이 전제
      ▼
 ⑤ 브리지(같은 바퀴에서)             Orthanc POST /tools/find {StudyInstanceUID} → IsStable 이면
      │                                POST /api/pacs/study-arrived  (헤더 X-Bridge-Token)
      │  EMR: 영상 속 PatientID 와 chart_no 비교 → patient_check, worklist_log.status='completed',
      │       order_item.worklist_status='completed'  → 다음 바퀴 피드에서 빠짐 → .wl 삭제
      ▼
 ⑥ EMR에서 보기                     GET /api/pacs/viewer-url?order_item_id=…
      │  → <pacs_viewer_url>/stone-webviewer/index.html?study=<study_instance_uid>
      │  진료 화면이 이 주소를 iframe 으로 띄움 (브라우저가 Orthanc 에 직접 접속)
      ▼
 ⑦ 판독 저장                        PUT /api/pacs/reading/:orderItemId  → order_item.result_text
```

**영상과 오더를 잇는 것은 StudyInstanceUID 하나뿐입니다.** 영상이 왔는지·환자번호가 맞는지는 브리지가 Orthanc에 물어 EMR에 알려 줍니다(⑤, 2026-09-29부터). EMR 백엔드가 Orthanc에 직접 묻지는 않습니다. 장비가 UID를 새로 만들면 여전히 연결되지 않습니다(7절 P-4).

### 3.2 번호 만드는 법 (`consult.routes.js` POST `/:id/orders`)

- **AccessionNumber** = `YYMMDD-<order_item.id>` (예: `260627-35`). DICOM SH 16자 이내. order_item.id가 전역 유일이라 겹치지 않습니다.
- **StudyInstanceUID** = `1.2.826.0.1.3680043.<YYYYMMDD>.<order_item.id>.<0~9999 난수>`. 루트 `1.2.826.0.1.3680043`은 Medical Connections(pydicom 기본)의 루트를 빌려 쓴 것입니다(7절 P-14).
- **PatientID** = `patient.chart_no` (예: `26-00001`). **PatientName** = `성^이름` (`last_name^first_name`).
- `station_ae`는 일부러 비웁니다 — 같은 초음파 오더를 여러 방이 나눠 받기 때문(코드 주석). 그래서 `.wl`에는 `ScheduledStationAETitle = "ANY"`가 들어갑니다.
- 설정의 **자동 워크리스트 생성**(`pacs_config.auto_create_worklist`)을 끄면 worklist_log를 만들지 않습니다.

### 3.3 브리지가 하는 일 (`bridge/bridge.py`)

`main()`이 무한 반복합니다. 한 바퀴:

1. `sync()` — `EMR_FEED_URL`에 `GET ?format=json`, 토큰은 **`X-Bridge-Token` 헤더**로 (timeout 10초). URL에 넣으면 EMR 접속 기록(morgan)에 15초마다 토큰이 찍혔기 때문입니다. 실패(연결 불가, 401, 500)면 예외 → 이번 바퀴는 **파일을 건드리지 않고** 끝납니다. 401이면 로그에 「EMR refused the bridge token (…)」과 어느 쪽을 맞춰야 하는지 씁니다.
   - 시작할 때 `BRIDGE_TOKEN`이 비었거나 16자 미만이거나 옛 기본값이면 경고를 한 줄 찍고 그대로 돕니다(재시작 반복으로 경고가 묻히지 않게).
2. 받은 줄마다 `accession_no`(없으면 `study_instance_uid`)를 파일 이름으로 `write_wl()` — `<이름>.wl.tmp`에 쓰고 `os.replace`로 바꿔 끼웁니다. Orthanc가 반쯤 쓴 파일을 읽지 않게 하려는 것.
   - 한 줄이 변환에 실패해도 그 줄만 건너뛰고(이전 좋은 `.wl`은 남김) 나머지는 계속합니다 (v1.0.0에서 고친 것).
3. 이번 목록에 없는 `.wl` 파일은 **지웁니다** — 촬영 완료·취소·오더 삭제·날짜 지남.
   - 이어서 `report_arrivals(rows)` — 받은 줄마다 Orthanc에 `POST /tools/find`(Level Study, StudyInstanceUID, Expand)로 묻고, 찾은 스터디가 **`IsStable`** 이면 `/studies/<id>/statistics`로 장수(`CountInstances`)를 얻어 EMR `POST /api/pacs/study-arrived`로 보냅니다(worklist_id, study_instance_uid, orthanc_study_id, 영상 속 PatientID·PatientName, instances).
   - **왜 Stable까지 기다리나**: 첫 장이 들어오자마자 알리면, 여러 장짜리 검사를 보내는 중에 워크리스트에서 빠집니다. Orthanc는 `StableAge`(기본 60초) 동안 새 영상이 없으면 Stable로 봅니다 → 보통 전송 후 **60~75초**에 완료 처리, 그다음 바퀴(15초)에 `.wl` 삭제.
   - **왜 브리지가 묻나**: 브리지는 Orthanc와 같은 compose 네트워크에 있고 EMR 토큰도 이미 가지고 있습니다. EMR이 직접 물으려면 EMR에 Orthanc 주소·비밀번호 설정이 새로 필요하고, `pacs_viewer_url`은 브라우저 기준 주소라 EMR 컨테이너에서 쓸 수 없습니다.
   - Orthanc에 못 닿으면(꺼짐·비밀번호 틀림) 그 바퀴는 한 줄만 로그를 남기고 넘어갑니다 — 워크리스트 동기화는 계속됩니다. Orthanc 이름을 못 찾으면 한 바퀴가 약 4초 늦어짐(격리 시험에서 잰 값) — heartbeat 한계 60초 안.
   - `ORTHANC_PASSWORD`가 없으면 이 단계는 꺼지고 시작 때 한 줄 경고.
   - 이 단계가 안 되면 그 이유를 전역 `arrivals_error`에 담아 **다음 heartbeat에 같이 보냅니다**(정상이면 빈 값). EMR 상태 화면이 이것을 노랑 「status.bridge.arrivals」로 보여줌(설정 세션 `status.routes.js`, 필드 이름은 두 세션이 맞춤).
   - EMR로 보내거나 로그에 쓰는 오류 글자는 모두 `scrub()`을 거칩니다 — 주소 속 `user:pass@`, 토큰, Orthanc 비밀번호를 `***`로. 그 글자가 상태 화면에 그대로 뜨기 때문.
   - EMR이 옛 버전이라 `/study-arrived`가 없으면(EMR 공통 404 `API route not found`) 재시작 전까지 묻지 않고 한 줄만 남깁니다.
4. `report()` — `/worklists/.heartbeat`에 현재 시각을 쓰고(컨테이너 healthcheck용), `POST /api/pacs/bridge-heartbeat`로 결과(synced, failed, error, poll_seconds)를 보냅니다. 둘 다 실패해도 반복은 멈추지 않습니다.
5. `POLL_SECONDS`(기본 15초) 잠듭니다.

매 바퀴 **모든 `.wl`을 새로 씁니다**(내용이 같아도). `.wl`의 MediaStorageSOPInstanceUID는 바퀴마다 새로 만들어집니다.

### 3.4 끊겼을 때

| 상황 | 장비에 보이는 것 | 누가 알 수 있나 |
|---|---|---|
| EMR이 멈춤 / 브리지가 EMR에 못 닿음 | **마지막으로 쓴 `.wl`이 그대로 남음.** 새 오더는 안 들어오고, 끝난·취소된 오더도 안 빠짐. 자정이 지나도 어제 목록이 남음 | 브리지 로그 `bridge error:`, EMR 상태 화면 「보고 없음」(60초 이상) |
| 토큰 불일치·토큰 미설정 (401) | 위와 같음 | EMR 상태 화면 — 브리지가 heartbeat도 같은 토큰으로 보내므로 **EMR에는 신호가 아예 안 옴** → 「보고 없음」. 브리지 로그에 원인(「EMR에 토큰 미설정」 / 「토큰 불일치」)이 나옴 |
| 브리지 컨테이너가 멈춤·먹통 | 위와 같음 | 컨테이너 healthcheck(`.heartbeat` 60초), `server-status` 창, EMR 상태 화면 |
| Orthanc가 멈춤 | 워크리스트 조회·전송 모두 실패 (장비 쪽 오류) | Orthanc healthcheck(`/system` 200/401), EMR 상태 화면의 PACS TCP 검사 |
| 브리지가 Orthanc에 못 물음 (비밀번호 틀림 등) | 워크리스트는 정상, **끝난 환자가 빠지지 않음**(예전 동작) | 브리지 로그 `could not ask Orthanc about studies`, EMR 상태 화면 장비 워크리스트 줄 **노랑**(heartbeat `arrivals_error`, 2026-09-29부터) |
| **호스트 포트가 안 잡힘** (Windows 예약 포트) | 장비가 4242에 연결 못 함, 뷰어가 안 열림 | **컨테이너 healthcheck는 「healthy」로 나옴** — 컨테이너 안에서만 확인하기 때문. EMR 상태 화면의 PACS 검사(설정된 Host:4242로 TCP)만 잡아냄 (7절 P-1) |

EMR 상태 화면 판정(`status.routes.js` `checkBridge`, 설정 세션 파일): heartbeat가 한 번도 없으면 「꺼짐」, 60초 넘게 없으면 「보고 없음」, `ok=false`면 「실패 중」, `failed>0`이면 「일부 실패」.

## 4. 데이터 · API

### 화면

- `frontend/src/components/RadiologyReadings.jsx` — 환자의 영상 검사·판독 목록(읽기 전용). `props.patientId`, `props.onOpen(orderItemId)`가 있으면 「영상보기」 버튼 표시. 진료·수납 화면의 「🩻 판독소견」 창 안에 들어갑니다.
  - 같은 파일에서 **`PatientCheck({images, t, style})`** 와 **`imagesOfRow(row)`** 도 export합니다. `images`는 `viewer-url` 응답의 `images` 모양(`{patient_check, patient_id, patient_name}`, 도착 전에는 `null`)으로 통일했고, 판독 목록의 줄은 `imagesOfRow`로 그 모양으로 바꿔 넘깁니다. `style`은 바깥 상자(여백)만 덮어씀. 진료 화면의 뷰어 창이 이것을 가져다 쓰면 경고 모양·문구가 한 곳에서 관리됩니다.
- 영상 뷰어 창(iframe + 판독 입력)과 🖼 버튼은 **`frontend/src/pages/Consultation.jsx` 안**에 있습니다(`openViewer`, `saveReading`, 약 51~66줄, 692~716줄) — **진료 세션 파일**이라 PACS 세션이 직접 고치지 않습니다.
- 설정 → 오더 연동(Order Feed) 탭 — `Settings.jsx` 약 476~515줄, `savePacs`·`testPacs`.

### 서버 — `backend/src/routes/pacs.routes.js` (`/api/pacs`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /config` | `settings` 권한 | `pacs_config` 한 줄 전체 — bridge_token 포함이라 설정 권한만 (2026-09-29부터, P-5) |
| `PUT /config` | `settings` 권한 | 설정 저장. **보내지 않은 칸은 그대로 둠**(`COALESCE`, 2026-09-29부터 — 전에는 NULL이 되어 일부만 저장하면 브리지 토큰이 지워질 수 있었음). 포트가 숫자가 아니면 4242 |
| `GET /test` | `settings` 권한 | `worklist_scp_host:port`로 TCP 연결 시험 (`utils/tcpCheck.js`) |
| `GET /viewer-url?order_item_id=` 또는 `?study=` | `consultation` 권한 (수납 화면의 판독 목록에는 영상 버튼이 없음) | 뷰어 주소 + 오더 이름 + 판독 + **`images`**(아래). 보일 스터디(UID)가 없으면 **`url`은 빈 값, `no_study: true`** — `has_viewer`는 뷰어 주소가 설정됐는지만 말함(「설정 안 됨」과 「이 오더엔 영상 없음」 구분). 전에는 뷰어 첫 화면(모든 환자 목록)을 돌려줬음(P-18) |
| `PUT /reading/:orderItemId` | `consultation` 권한 | `order_item`(code_type='imaging')의 result_text·result_by·result_at 덮어쓰기. 이력 없음. **취소된 오더는 409** `Imaging order was cancelled`(`pacs.cancel.js`의 `ORDER_CANCELLED`) — 조건을 UPDATE 안에 넣어 동시에 들어온 취소를 덮지 않음 |
| `GET /readings/patient/:patientId` | `consultation` 또는 `payment` 권한 | 환자의 영상 오더 전부(취소된 것 포함) + 판독 + 최신 accession/UID + images_received_at·image_count·image_patient_id·image_patient_name·patient_check + `order_status`·`cancelled_at`·`cancel_reason` |
| `GET /worklist-feed?format=json\|csv&date=&modality=&station_ae=` | **브리지 토큰** (`X-Bridge-Token` 헤더, 옛 브리지용으로 `?token=`도 받음) | 브리지용 피드. 기본 날짜 `todayLocal()`, `status='scheduled'`만 |
| `POST /bridge-heartbeat` | 브리지 토큰 (헤더, 본문 `token`, 쿼리 순) | `service_heartbeat`의 `worklist_bridge` 줄을 덮어씀. detail = `{synced, failed, poll_seconds, error(500자), arrivals_error(300자)}` — 이 밖의 칸은 버림 |
| `POST /study-arrived` | 브리지 토큰 | 본문 `{worklist_id, study_instance_uid, orthanc_study_id, patient_id, patient_name, instances}`. 한 트랜잭션에서 worklist_log(`FOR UPDATE`)를 완료 처리하고 영상 정보·`patient_check`를 저장, order_item.worklist_status=`completed`. 400(칸 없음)·404(항목 없음)·409(UID가 그 항목 것이 아님). 다시 보내도 안전(도착 시각은 처음 값 유지). `cancelled`는 그대로 둠 |

**취소 정보** (`readings`·`viewer-url`) — `order_status`(`order_item.status`), `cancelled_at`, `cancel_reason`; `viewer-url`은 `cancelled`(참/거짓)도. `cancelled_at`·`cancel_reason`은 진료 세션 마이그레이션이 만드는 칸이라 **`to_jsonb(oi)->>'…'`로 읽음** — 그 칸이 없는 DB에서도 오류 없이 `null`(그래서 이 코드를 진료 마이그레이션보다 먼저 합쳐도 됨). 취소된 오더의 영상도 뷰어로 계속 열림(기록).

**`cancelWorklistForOrder(client, orderItemId)`** — `backend/src/routes/pacs.cancel.js`(PACS 소유). 진료 세션의 취소 API가 영상 오더일 때 **같은 트랜잭션 안에서** 부름. `worklist_log`가 `scheduled`·`in_progress`인 줄만 `cancelled`로, 그런 줄이 있었으면 `order_item.worklist_status='cancelled'`. **이미 `completed`(영상 도착)인 줄은 그대로**(「찍었다」는 사실 기록). 피드가 `scheduled`만 주므로 다음 브리지 바퀴(15초 안)에 `.wl` 삭제 — 브리지 변경 없음. 돌려주는 값 `{worklist_cancelled: n}`. **영상에 켜는 것은 PACS 저장소를 합친 뒤**(그 전에는 EMR이 영상 도착을 모름 — 인계 노트 2026-09-29 의견).

**`images`** (`viewer-url` 응답) — 브리지가 보고하기 전에는 `null`(「아직 안 옴」과 「왔고 맞음」을 구분하려고). 보고 뒤: `{received_at, count, patient_id, patient_name, patient_check}`.

**`patient_check`** — EMR이 정합니다(브리지가 보낸 판정을 믿지 않음). 영상 속 PatientID와 `patient.chart_no`를 앞뒤 공백 빼고 대소문자 무시로 비교: `match` / `mismatch` / `missing`(PatientID 없음). 잡는 것: 장비에서 손으로 치거나 고친 환자 정보. **못 잡는 것: 워크리스트에서 다른 환자를 고른 경우**(영상에 고른 환자의 정보가 그대로 들어감) — 그래서 끝난 환자를 목록에서 빼는 P-7이 짝입니다.

**브리지 토큰 검사** — `backend/src/routes/pacs.token.js` (PACS 소유, 2026-09-29 새로 만듦). 피드·heartbeat·`/api/worklist`의 `bridgeOrAuth`가 모두 여기를 씁니다.

- `usableBridgeToken(v)` — EMR에 저장된 토큰이 **16자 이상이고 옛 기본값 `change-me-bridge-token`이 아닐 때만** 「설정됨」. 아니면 어떤 토큰이 와도 거절합니다. 기본값이 저장소에 공개돼 있어서, PACS를 연결하지 않은 병원이 로그인 없이 환자 정보를 내주고 있었기 때문(P-2). PACS setup이 만드는 토큰은 48자.
- `presentedToken(req)` — 헤더 `X-Bridge-Token` → 본문 `token` → 쿼리 `token` 순.
- `bridgeTokenMatches(configured, presented)` — `crypto.timingSafeEqual`로 비교.
- 거절 메시지는 둘로 나뉩니다: `Bridge token is not set in the EMR (Settings -> Order Feed)`(EMR 쪽을 고칠 것) / `Invalid bridge token`(PACS `.env`를 고칠 것). 브리지 로그에 그대로 나옵니다.

`ensureConfig()`가 요청마다 `CREATE TABLE IF NOT EXISTS pacs_config` + `ALTER … ADD COLUMN IF NOT EXISTS`를 실행합니다(오래된 DB 호환용, 마이그레이션과 중복).

**권한** (실장님 결정 S2, 2026-09-29): 서버도 화면 권한대로 막습니다. 표의 권한은 **그 API를 부르는 화면**의 권한이고(관리자는 7개 다 있음), 로그인하지 않았으면 401, 권한이 없으면 403. 브리지 토큰으로 들어오는 세 경로(피드·heartbeat·study-arrived)는 로그인과 관계없음. 계정 상태·권한은 요청마다 DB에서 읽으므로(S1) 권한을 빼면 바로 적용됩니다. 간호사 기본 권한(약국·임상병리·접수)으로는 PACS API를 하나도 안 부릅니다.

### 서버 — `backend/src/routes/worklist.routes.js` (`/api/worklist`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /?modality=&station_ae=&date=&status=` | `consultation` 권한 (부르는 화면 없음) | worklist_log + 환자 이름·생년월일. 날짜 기본 `CURRENT_DATE`(DB 시간대) |
| `PUT /:id/status` | 브리지 토큰 **또는** `settings` 권한 로그인 | `scheduled`/`in_progress`/`completed`/`cancelled`만(아니면 400, 없는 항목 404). 한 트랜잭션에서 worklist_log와 order_item을 같이 바꿈 — 이름이 다른 `scheduled`는 order_item에서 `sent`. completed_at은 `completed`일 때만. **지금 부르는 곳이 없음**(영상 도착은 `/api/pacs/study-arrived`) |
| `GET /dicom-mwl?modality=&station_ae=` | 브리지 토큰 또는 `settings` 권한 로그인 | DICOM 태그 이름 모양의 JSON. 옛 외부 브리지용. **지금 쓰는 곳 없음** |

### PACS 저장소 (`C:\Bethesda-PACS-main`)

- `docker-compose.yml` — 프로젝트 이름 `bethesda-pacs` 고정. 컨테이너 `bethesda-pacs`(Orthanc), `bethesda-worklist-bridge`. 볼륨은 **폴더 마운트** `./storage`(영상+색인), `./worklists`(`.wl`, `.heartbeat`).
- `bridge/bridge.py`, `bridge/Dockerfile`(python 3.12-slim, pydicom 2.4.4, requests 2.32.3)
- 시험 도구(장비 없이 확인용, compose 네트워크 안에서 실행): `make_demo.py`·`make_chest5.py`(가짜 영상 올리기, Orthanc REST), `storetest.py`(C-STORE), `q_test.py`(MWL C-FIND). **pynetdicom은 브리지 이미지에 없음** — 따로 설치 필요. `make_*`는 브리지 컨테이너 안에서 돌리며 `ORTHANC_PASSWORD`를 환경 변수에서 읽고, 시험 오더의 `STUDY_UID`·`ACCESSION`·`PATIENT_ID`도 환경 변수로 받음(가짜 환자 `TEST^Patient`).
- `setup.ps1`·`setup.sh`(`-Offline`/`--offline`), `start.bat`

### 브리지 환경 변수

| 이름 | 기본값 (compose) | 뜻 |
|---|---|---|
| `EMR_FEED_URL` | `http://host.docker.internal:9080/api/pacs/worklist-feed` | EMR 피드. heartbeat 주소는 여기서 `/worklist-feed`→`/bridge-heartbeat`로 바꿔 만듦 |
| `BRIDGE_TOKEN` | `.env`에서 (setup이 48자 무작위 생성). **기본값 없음** — 2026-09-29 전에는 `change-me-bridge-token` | EMR 설정의 Bridge Token과 같아야 함. 헤더로 보냄 |
| `ORTHANC_URL` | `http://orthanc:8042` | 영상 도착 확인용 (같은 compose 네트워크의 서비스 이름) |
| `ORTHANC_USER` · `ORTHANC_PASSWORD` | `admin` · `.env`의 `ORTHANC_PASSWORD` | 비밀번호가 없으면 도착 확인을 끔 |
| `WL_DIR` | `/worklists` | `.wl`을 쓰는 곳 |
| `POLL_SECONDS` | `15` | 주기 |

### Orthanc 설정 (compose 환경 변수)

`ORTHANC__DICOM_AET=MEDCONNECT`, `DICOM_CHECK_CALLED_AET=false`, `REMOTE_ACCESS_ALLOWED=true`, `DICOM_ALWAYS_ALLOW_FIND_WORKLIST / FIND / STORE / ECHO = true`(장비 등록 없이 받음), `AUTHENTICATION_ENABLED=true`, 사용자 `admin` 하나(비밀번호 `.env`의 `ORTHANC_PASSWORD`), 워크리스트 플러그인(`/var/lib/orthanc/worklists`), DICOMweb, Stone Web Viewer, Orthanc Explorer 2. 포트 `9090→8042`(웹), `4242→4242`(DICOM).

EMR이 쓰는 Orthanc 쪽 주소는 **Stone 뷰어 `/stone-webviewer/index.html?study=`** 하나뿐입니다. EMR 백엔드는 Orthanc REST를 부르지 않습니다. 브리지가 부르는 Orthanc REST: `POST /tools/find`, `GET /studies/<id>/statistics`.

### 비밀값 (이름과 의미만)

- **`ORTHANC_PASSWORD`** — PACS `.env`. Orthanc `admin` 비밀번호. 뷰어로 영상을 보는 모든 사람이 이 계정을 씁니다. 브리지도 영상 도착 확인에 씁니다(Orthanc 기본 인증에는 권한 구분이 없어 관리자 계정 그대로).
- **`BRIDGE_TOKEN`** — PACS `.env`와 EMR `pacs_config.bridge_token`이 **같아야** 합니다(페어링). 오더 피드와 heartbeat의 유일한 인증. 16자 이상, 옛 기본값 불가.

### 공용 부품

- `utils/localDate.js`(`todayLocal`, `dicomDate`)·`utils/tcpCheck.js` — 총괄 관리 공용 파일을 씀. 고치지 않음.
- 브리지 토큰 검사는 공용 `utils/`가 아니라 PACS 소유 `routes/pacs.token.js`에 둠(`worklist.routes.js`도 PACS 파일이라 둘만 씀).

### DB 테이블

| 테이블 | 주요 칸 | 비고 |
|---|---|---|
| `worklist_log` (001) | order_item_id(FK, CASCADE — 007), patient_id, modality, station_ae, body_part, accession_no, study_instance_uid, scheduled_date, scheduled_time, status(`scheduled`/`in_progress`/`completed`/`cancelled`), completed_at. **019(세션 번호 801):** images_received_at, orthanc_study_id, image_count, image_patient_id, image_patient_name, patient_check(`match`/`mismatch`/`missing`) | 오더 1개에 보통 1줄. `completed`로 바꾸는 곳은 `POST /study-arrived` |
| `order_item` (001, 진료 소유) | pacs_modality, station_ae, body_part, worklist_status(`pending`/`sent`/…), worklist_sent_at, result_text, result_by, result_at | 판독은 여기 저장 |
| `order_code` (설정 소유) | pacs_modality(US/CR/CT/MR/ES/OT), worklist_enabled, station_ae, body_part | 어떤 오더가 워크리스트로 가는지 정함 |
| `pacs_config` (001, 015) | worklist_scp_host/port/ae, bridge_token, emr_base_url, pacs_viewer_url, auto_create_worklist, facility_name, notes | 한 줄(id=1). 015가 옛 한국 데모값(`BROKER`/`192.168.0.222`)을 Orthanc 기본값으로 바꿈 |
| `service_heartbeat` (018, 설정과 공유) | name(`worklist_bridge`), last_seen, ok, detail(JSONB) | 현재 상태만, 이력 없음 |

마이그레이션 `007_worklist_cascade.sql`(오더 삭제 시 worklist_log 같이 삭제), `015_pacs_viewer.sql`(pacs_viewer_url 추가·데모값 정리), `018_service_heartbeat.sql`. 셋 다 이미 적용된 파일이라 **고치지 않습니다**. `019_pacs_image_arrival.sql` — PACS 번호대, 칸·CHECK 추가만(기존 줄은 안 바꿈). 합칠 때 총괄이 번호를 다시 매김.

## 5. 다른 모듈과의 연결

- **진료** — 영상 오더를 만들고(`consult.routes.js`가 worklist_log 생성), 오더를 지우면 worklist_log도 지움. 영상이 도착해 `worklist_status='completed'`가 되면 진료 화면이 그 오더를 **잠급니다**(삭제 불가 — `Consultation.jsx` `orderLocked`, `consult.routes.js` DELETE의 409). 영상 뷰어 창·🖼 버튼·판독 입력 UI가 `Consultation.jsx` 안에 있음. `consult.routes.js`도 `pacs_config`를 `CREATE TABLE IF NOT EXISTS`로 만드는데, 그 기본값이 옛 데모값(`192.168.0.222`/`10004`/`BROKER`/`Yonsei Shintong Clinic`)입니다 — 테이블이 이미 있으면 영향 없음.
- **수납** — 「🩻 판독소견」에서 `RadiologyReadings`를 읽기 전용으로 띄움. 영상 오더 청구는 수납 모듈 몫.
- **설정** — 오더 코드의 Modality·워크리스트 사용 여부, 오더 연동 탭(`/api/pacs/config`). 서버 상태(`status.routes.js` `checkBridge`·`checkPacs`, `server-status.ps1`)가 브리지·PACS를 봄.
- **PatientChart**(수납 소유 공용) — 오더의 worklist_status를 글자로 보여줌.

## 6. 설정 항목

**EMR → 설정 → 오더 연동(Order Feed)** — `settings` 권한

| 화면 칸 | DB 칸 | 뜻 |
|---|---|---|
| Bridge Token | `bridge_token` | PACS `setup`이 출력한 값을 붙여넣음. **가려서 보이고** 「보기/숨기기」 버튼으로 확인. 16자 미만이거나 옛 기본값이면 입력 칸 아래 노란 경고(`px_tokenUnusable`) — 그 상태로는 오더가 장비로 가지 않음. 아래 피드 주소 예시의 토큰도 가려짐 |
| EMR 공개 주소 | `emr_base_url` | 화면에 피드 주소 예시를 보여줄 때만 씀 |
| 자동 워크리스트 생성 | `auto_create_worklist` | 끄면 영상 오더가 워크리스트로 안 감 |
| Host / IP | `worklist_scp_host` | Orthanc DICOM 주소. **EMR 컨테이너에서 본 주소**라 `localhost`는 안 됨 → `host.docker.internal` 또는 서버 LAN IP. 비우면 상태 화면이 PACS를 「꺼짐」으로 봄 |
| DICOM Port | `worklist_scp_port` | 4242 |
| AE Title | `worklist_scp_ae` | MEDCONNECT (화면 표시·피드 `config`에만 쓰임) |
| PACS 웹/뷰어 주소 | `pacs_viewer_url` | **직원 브라우저에서 본 주소** `http://<서버 IP>:9090`. 비우면 영상 없이 판독만 가능 |

**설정 → 오더 코드** — 영상 검사마다 `Modality`와 `worklist_enabled`를 켜야 워크리스트로 갑니다.

**PACS `.env`** — `ORTHANC_PASSWORD`(Orthanc와 브리지가 같이 씀), `BRIDGE_TOKEN`, (선택) `EMR_FEED_URL`. `setup`이 처음 한 번 만들고 다시 실행해도 덮어쓰지 않습니다.

**장비 쪽** — PACS Host = 서버 IP, 포트 4242, Called AE = `MEDCONNECT`, 워크리스트도 같은 주소. 장비 자기 AE는 아무거나.

### 6.1 새 PC에 설치할 때 (PACS)

> 실장님 결정 35 (2026-09-29): 11월에 **현지의 다른 PC에 새로 설치**하고, 자료는 EMR 백업 파일로 옮깁니다. 아래는 오프라인 키트(EMR `offline/`)와 PACS `setup` 스크립트를 **읽고** 정리한 것입니다 — 실제로 돌려 보지는 않았습니다(`pack`은 두 스택을 빌드해 이 PC의 이미지 이름표를 바꾸므로).

**① 키트 만들기 (출발 전, 인터넷 되는 이 PC)** — `offline/pack.ps1`

- PACS는 **EMR 옆 폴더 `C:\Bethesda-PACS-main`의 지금 파일 그대로**를 씁니다(`-PacsPath`로 바꿀 수 있음). git 브랜치를 보지 않고 **폴더에 있는 파일**을 복사·빌드하므로, `session/pacs`의 새 판(`6c135aa`까지 — 토큰 헤더, 영상 도착 확인, `arrivals_error`)을 넣으려면 **재부팅 절차서 ②(PACS `main`에 합치기)를 먼저** 하고 그 폴더가 `main`이며 고친 파일이 없는지(`git status`가 비어 있음) 확인한 뒤 pack.
- 빌드: `docker compose build`(브리지 이미지 `bethesda-pacs-worklist-bridge:latest`) → `docker compose config --images`로 Orthanc `orthancteam/orthanc:26.6.1` 이름을 얻어 없으면 받음 → `images\bethesda-pacs-images.tar`로 저장.
- 복사에서 빠지는 것: `.git`, `storage`(영상), `worklists`, `.env`, `*.log` 등. **`.env`가 키트에 안 들어가므로 이 PC의 Orthanc 비밀번호·토큰은 따라가지 않음** — 현지 PC에서 새로 만들어짐.
- `MANIFEST.txt`에는 **EMR 버전(`backend/package.json`)만** 찍히고 **PACS 버전·커밋은 안 찍힘** → 어떤 브리지가 들어갔는지 키트만 봐서는 모름(아래 고칠 것 F-2).

**② 현지 PC에 설치** — `install-offline.ps1` (키트 폴더에서)

1. 이미지 두 묶음 `docker load`.
2. `C:\Bethesda-PACS`로 복사(이미 `.env`가 있으면 건드리지 않음 — 다시 돌려도 비밀값 유지).
3. EMR `setup.ps1 -Offline` 뒤 **PACS `setup.ps1 -Offline`**:
   - `.env`가 없으면 새로 만듦: **`ORTHANC_PASSWORD`**(무작위 32자), **`BRIDGE_TOKEN`**(무작위 48자). **토큰은 이 순간 PACS PC에서 처음 생기고, 화면에 한 번 찍힙니다.**
   - `docker compose up -d --no-build` → Orthanc(9090·4242)와 브리지가 뜸. 브리지는 바로 EMR(`host.docker.internal:9080`)에 묻기 시작하지만, EMR에는 아직 토큰이 없어서 **401 「Bridge token is not set in the EMR」** — 짝을 맞출 때까지 정상.
4. **짝 맞추기 (지금은 사람이 함)**: 화면에 찍힌 토큰을 EMR **Paramètres → Flux d'ordres → Bridge Token**에 붙여넣고 저장. → EMR `pacs_config.bridge_token`과 PACS `.env`가 같아지는 **유일한 길**. 토큰이 화면·클립보드에 남는 방식이라, 재부팅 절차서의 `rotate-token.ps1`처럼 **두 쪽에 직접 넣는 방식**을 권함(고칠 것 G-1). 설치 뒤 한 번 `rotate-token.ps1`을 돌려도 같은 결과.
5. EMR 설정에서 **PACS 웹/뷰어 주소 = `http://<서버 LAN IP>:9090`**(`localhost` 아님 — 진료실 다른 PC의 브라우저가 여는 주소), **Host / IP = `host.docker.internal`** 또는 서버 LAN IP.

**③ 현지 PC에서 따로 확인할 것**

- **Windows 동적 포트 범위** (P-1과 같은 원인): `netsh int ipv4 show dynamicport tcp` → 시작 49152·개수 16384인지, `netsh interface ipv4 show excludedportrange protocol=tcp`에 **9080·9090·4242**가 걸리지 않는지. Docker·WSL을 다 설치하고 **한 번 재부팅한 뒤** 봅니다(예약 구간은 부팅 때 바뀜). 이 PC가 왜 1024부터였는지는 모르므로 새 PC도 반드시 확인.
- **방화벽**: 스크립트는 방화벽을 건드리지 않습니다. Docker Desktop이 처음 뜰 때 Windows가 허용을 물을 수 있음(확인 필요). 네트워크 종류는 **개인(Private)**. 확인은 **다른 PC에서**: `Test-NetConnection <서버IP> -Port 9080` / `9090` / `4242` 가 모두 `True`.
- **서버 IP 고정**: 장비와 진료실 PC가 IP로 찾아오므로 공유기에서 **고정 IP(DHCP 예약)**.
- **영상 백업이 없음**: EMR 자동 백업(`pg_dump`)은 **DB만** — Orthanc 영상(`C:\Bethesda-PACS\storage`)은 어디에도 백업되지 않습니다(7절 P-24).

**④ EMR 백업을 복원하면 PACS와 어긋나는 것** (백업은 DB 전체 — `pacs_config`·`worklist_log`·`service_heartbeat` 포함)

| 복원된 것 | 새 PC에서 생기는 일 | 할 일 |
|---|---|---|
| `pacs_config.bridge_token` = **이 PC의 토큰** | 새 PACS `.env`의 토큰과 다름 → 브리지 401, 상태 화면 「보고 없음」 | 복원 **뒤에** 짝 맞추기(②-4 또는 `rotate-token.ps1`) 후 `docker compose up -d --force-recreate worklist-bridge` |
| `pacs_viewer_url`, `worklist_scp_host` = 이 PC 기준 | 영상 창이 엉뚱한 주소를 엶, 연결 시험 실패 | ②-5대로 새 서버 LAN IP로 |
| `service_heartbeat` = 이 PC 브리지의 마지막 보고 | 짝을 맞추기 전까지 「보고 없음」 | 짝 맞추면 저절로 갱신 |
| `worklist_log`의 `scheduled` 줄(시험 오더) | 피드는 **오늘 날짜만** 주므로 지난 날 줄은 장비에 안 감. **복원한 날 만든 시험 오더**가 있으면 현지 장비 목록에 뜸 | 복원 뒤 `SELECT count(*) FROM worklist_log WHERE status='scheduled' AND scheduled_date=CURRENT_DATE` 가 0인지 |
| `worklist_log`의 **영상 도착 기록**(`images_received_at`) | 새 Orthanc에는 영상이 없는데 판독 목록은 「N image(s) reçue(s)」, 영상 창은 빈 화면 | 영상을 옮기려면 이 PC Orthanc를 멈추고 `storage` 폴더를 통째로 새 PC `C:\Bethesda-PACS\storage`로(첫 실행 전). 이 PC에는 장비가 붙은 적이 없어 **실제 영상은 없을 것** — 시험 기록 정리 여부는 실장님 결정(데이터 변경) |
| `order_item`·순번 | 이어서 늘어남 → 새 AccessionNumber·UID가 옛것과 안 겹침 | 없음 |

그 밖에: 키트의 EMR 판이 백업을 만든 EMR 판보다 **같거나 새것**이어야 합니다(마이그레이션 번호) — 총괄 몫.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것. **심각도**: 높음 / 보통 / 낮음. 고친 것은 ✅, 일부 고친 것은 🟡.

### 지금 돌아가는 PACS

- **P-1 [높음] ✅ 해결 (2026-09-29, 재부팅 뒤 총괄 조치)** — 동적 포트 범위 ipv4·ipv6 모두 49152·16384로 되돌림(실장님), 재부팅 뒤 제외 구간에 4242·9080·9090 없음, 세 포트 모두 호스트에서 연결됨. PACS `main` `c9dc0b4`→`6c135aa`, 토큰 재발급, 브리지·Orthanc 재생성(healthy). 결과 전체: 인계 노트 「총괄 확인: P-1 조치 끝」. 되돌리기용 브리지 이미지 이름표 `before-p1`은 남아 있음. **원래 문제**: 실행 중인 PACS에 호스트에서 연결이 안 됨 (2026-09-29 확인). `docker inspect bethesda-pacs`에서 PortBindings는 `9090`·`4242`인데 실제 `NetworkSettings.Ports`가 비어 있고, 호스트에서 `127.0.0.1:9090`·`:4242` TCP 연결이 모두 실패합니다. 컨테이너는 「healthy」 — healthcheck가 컨테이너 **안**에서만 묻기 때문. 이 PC의 Windows 예약 포트 대역에 **`4204–4303`이 있어 4242가 그 안에 들어갑니다**(`netsh interface ipv4 show excludedportrange protocol=tcp`). 9090은 예약 대역 밖인데도 안 잡혀 있음 — 원인 확인 필요. 결과: 장비가 워크리스트를 못 받고 영상을 못 보내며, EMR에서 영상이 안 열립니다. 브리지 자체는 정상(`synced 0 worklist entries` 반복). 근거: README의 8090→9090 이전과 같은 종류의 문제.
  - **근본 원인 (2026-09-29 확인)**: 이 PC의 Windows **동적 포트 범위가 `1024`부터 13977개(1024–15000)** 로 바뀌어 있습니다(`netsh int ipv4 show dynamicport tcp`, ipv6도 같음. Windows 기본은 49152–65535). 그래서 Hyper-V/WinNAT가 재부팅할 때마다 1024–15000 사이 아무 곳이나 예약할 수 있고, **4242·9090은 물론 EMR의 9080도 언젠가 걸릴 수 있습니다.** 포트 번호를 다른 값(예: 11112)으로 옮겨도 같은 범위 안이라 해결되지 않습니다.
  - 해결: 동적 포트 범위를 Windows 기본값으로 되돌리고(관리자 권한, 재부팅 필요 — 시스템 설정이라 실장님이 직접), PACS 컨테이너를 다시 만들기(총괄). 포트 번호는 4242·9090 그대로 둡니다.
  - 2026-09-29 현재 **현장 장비는 아직 하나도 설정하지 않았음**(실장님 확인) — 지금 멈춘 장비 연동은 없습니다. 장비를 설정하기 전에 해결해야 합니다.
  - **진단은 총괄이 확인함 (2026-09-29).** 조치 분담: ① 동적 포트 범위 복구(`netsh int ipv4|ipv6 set dynamicport tcp start=49152 num=16384`)와 재부팅은 **실장님이 직접**, ② 재부팅 후 PACS 컨테이너 재생성과 호스트에서 9080·9090·4242 확인은 **총괄**. PACS 세션은 실행 중인 `bethesda-pacs`를 건드리지 않음. 총괄 확인 결과를 받으면 여기에 적고 검증 항목(장비 설정 체크리스트 등)을 이어서 진행.
  - 재발 방지 후보: `server-status.ps1`에 호스트 쪽 TCP 검사 추가(설정 세션에 부탁), 설치 문서에 동적 포트 범위 확인 추가 — 확정 전
- `server-status.ps1`(설정 세션 파일)은 이후 설정 세션이 호스트 쪽 9090·4242 TCP 검사를 넣음. 그 창을 재부팅 뒤 눈으로 보지는 않았음(R-3) — 확인 필요.

### 환자 식별 (영상이 다른 환자·다른 오더에 붙는 경우)

- **P-3 [보통] 🟡 일부 고침 (2026-09-29)** — 브리지가 영상 도착을 알릴 때 EMR이 영상 속 PatientID를 chart_no와 비교해 `patient_check`로 저장하고, 「🩻 판독소견」 목록에 빨강·노랑 경고를 띄움. `viewer-url`도 `images.patient_check`를 돌려줌. 영상 뷰어 창에도 같은 경고 — 진료 세션 `9dfcedc`(`Consultation.jsx`). 두 화면이 같은 부품 `PatientCheck`(`RadiologyReadings.jsx`에서 export, `viewer-url`의 `images` 모양을 받음)를 쓰도록 PACS가 내보냄. **남은 것**: 워크리스트에서 다른 환자를 고른 경우는 원리상 못 잡음(4절 `patient_check`). **원래 문제**: 영상이 맞는 환자의 것인지 EMR이 확인하지 않음. `pacs.routes.js:91` — StudyInstanceUID만으로 뷰어를 엽니다. 방사선사가 워크리스트에서 다른 환자를 골라 찍으면 그 영상은 고른 환자(틀린 환자)의 오더에 붙어 그대로 보입니다. 뷰어 창 머리의 환자 이름은 EMR 쪽 이름이고, 영상 속 DICOM 환자 이름은 Stone 뷰어 안에만 나옵니다. 개선안: 뷰어를 열 때 EMR 백엔드가 Orthanc REST로 그 Study의 PatientID를 조회해 chart_no와 다르면 경고.
- **P-4 [보통] 장비가 StudyInstanceUID를 새로 만들면 영상이 오더에 안 붙음.** 연결 고리가 UID 하나뿐입니다(`pacs.routes.js:81-91`). README는 「Accession Number / Study UID로 맞춘다」고 하지만 코드는 UID만 씁니다. 일부 CR·초음파 장비는 워크리스트의 UID를 쓰지 않고 자기 UID를 만듭니다(장비별 확인 필요). 개선안: UID로 못 찾으면 AccessionNumber로 Orthanc에서 찾기.
- **P-6 [보통] 워크리스트가 「오늘」만 나옴.** `pacs.routes.js:134`·`worklist.routes.js:75` — 어제 낸 오더를 오늘 찍으면 장비 목록에 없어서 손으로 입력 → P-4처럼 연결이 끊깁니다. `consult.routes.js`가 `scheduled_date=CURRENT_DATE`로 고정.
- **P-7 [보통] ✅ 고침 (2026-09-29)** — 브리지가 Orthanc에서 Stable 스터디를 찾으면 `POST /api/pacs/study-arrived` → 완료 처리 → 다음 바퀴에 `.wl` 삭제. 격리 시험(가짜 Orthanc)으로 확인. **진짜 Orthanc 26.6.1의 응답 형식은 재부팅 뒤 확인함**(R-5: `IsStable` 있음 — 올린 직후 False, 75초 뒤 True, `PatientMainDicomTags.PatientID`, `CountInstances`). 실제 오더 → 촬영 → 완료까지 한 번에는 아직(장비 또는 PACS 격리 스택). 남은 한계: 피드가 「오늘」만 주므로 어제 오더의 영상이 오늘 도착하면, 또 자정을 넘겨 도착하면 완료 처리가 안 됨(P-6과 같이 풀 것). (과도기 — EMR만 합쳐지고 브리지는 옛것이던 때 「영상 대기 중」이 계속 보이던 것 — 는 2026-09-29 재부팅 뒤 PACS 합침으로 끝남.) **원래 문제**: 촬영이 끝나도 워크리스트에서 안 빠짐. worklist_log.status를 `completed`로 바꾸는 곳이 없습니다(`PUT /api/worklist/:id/status`를 부르는 코드 없음). 끝난 환자가 하루 종일 장비 목록에 남아, 다음 환자를 찍을 때 잘못 고를 여지가 커집니다. `order_item.worklist_status`도 영원히 `sent`. 개선안: 브리지가 Orthanc에 해당 UID/Accession 영상이 들어왔는지 보고 완료 처리.
- **P-8 [낮음] 워크리스트의 `ScheduledStationAETitle = "ANY"`.** `bridge.py:76` — 장비가 조회할 때 자기 AE로 거르면(장비 설정에 흔함) "ANY"와 안 맞아 목록이 비어 보일 수 있습니다. 확인 필요(실제 장비로).

### 보안 (토큰 · 비밀번호)

- **P-2 [높음] ✅ 고침 (2026-09-29)** — 16자 미만·옛 기본값 토큰은 EMR이 「설정 안 됨」으로 보고 무조건 거절(`routes/pacs.token.js`). 브리지·compose에서도 기본값을 없앰. **원래 문제**: 기본 브리지 토큰이 저장소에 공개된 값이고, EMR은 그 값을 그대로 받아들임. `pacs_config.bridge_token` 기본값 `change-me-bridge-token`(`001_schema.sql`, `pacs.routes.js:15`), PACS compose 기본값도 같음. PACS를 페어링하지 않은 **모든 EMR 설치**에서 `GET /api/pacs/worklist-feed?token=change-me-bridge-token`으로 로그인 없이 오늘 영상 오더 환자의 이름·생년월일·성별·차트번호를 가져갈 수 있습니다(`pacs.routes.js:132`). 같은 토큰으로 `PUT /api/worklist/:id/status`도 됩니다(`worklist.routes.js:15`). 개선안: 기본값·빈 값·짧은 값을 「설정 안 됨」으로 보고 거절.
- **P-5 [보통] ✅ 고침 (2026-09-29)** — `GET /api/pacs/config`는 settings 권한만, 설정 화면은 토큰을 가림(보기 버튼), 브리지는 `X-Bridge-Token` 헤더로 보냄(EMR은 옛 브리지를 위해 쿼리도 계속 받음). **남은 것**: 고치기 전의 EMR 백엔드 로그(`docker logs bethesda-emr-api`)에는 토큰이 이미 찍혀 있음(2026-09-29 확인) — 필요하면 토큰을 새로 만들어 PACS `.env`와 EMR 설정을 함께 바꾸면 됨. **원래 문제**: 브리지 토큰이 모든 로그인 직원에게 보임. `GET /api/pacs/config`에 권한 검사가 없습니다(`pacs.routes.js:43`). 설정 화면도 피드 주소를 토큰째 보여줍니다(`Settings.jsx:495-496`). 브리지는 토큰을 URL 쿼리로 보내(`bridge.py:94`) 접속 기록에 남을 수 있습니다. 개선안: `/config`를 settings 권한으로, 화면에는 가려서, 브리지는 `X-Bridge-Token` 헤더로.
- **P-9 [보통] 영상을 보는 모든 직원이 Orthanc 관리자 계정을 씀.** 사용자가 `admin` 하나(`docker-compose.yml` `REGISTERED_USERS`). 뷰어(iframe)가 Orthanc에 직접 붙으므로 직원 브라우저가 이 계정으로 로그인해야 하고, 그 계정은 영상 삭제·수정까지 됩니다. **R-1 (2026-09-29)**: `http://localhost:9090/`과 `/stone-webviewer/index.html` 모두 401 → 브라우저가 로그인 창을 띄움. 즉 영상 창을 처음 열 때 Orthanc 관리자 아이디·비밀번호를 쳐야 함(브라우저가 기억하기 전까지). 영상 창(iframe) 안에서 어떻게 보이는지는 아직 화면으로 보지 않음. 해결 선택지: 인계 노트 「P-9 선택지」. 개선안: 읽기 전용 사용자 분리, 또는 EMR이 대신 가져다 주는 방식(프록시).
- **P-10 [보통] 같은 LAN의 누구나 DICOM으로 환자 목록을 조회할 수 있음.** `DICOM_ALWAYS_ALLOW_FIND=true`, `CHECK_CALLED_AET=false`(`docker-compose.yml`) — 등록 안 된 기기도 C-FIND로 저장된 환자·검사 정보를 묻고 C-STORE로 아무 영상이나 넣을 수 있습니다. 장비 등록 없이 쓰려는 의도된 선택(주석)이지만, 장비가 정해지면 `DicomModalities` 등록으로 좁히는 것을 권합니다.
- **P-12 [낮음] ✅ 고침 (2026-09-29, PACS `6c135aa`)** — 비밀번호는 환경 변수에서, 환자는 가짜(`TEST^Patient`, `PX-TEST-0001`, 1980-01-01)로. **남은 것**: 옛 값은 git 기록에 그대로 있음(기록을 고쳐 쓰는 것은 공개 저장소에 push된 뒤라 하지 않음). **원래 문제**: 시험 스크립트에 옛 Orthanc 비밀번호와 실제 인물로 보이는 이름·생년월일이 들어 있음. `bridge/make_demo.py:10,28-30`, `make_chest5.py:9,32-34`. 지금 PACS `.env`의 비밀번호와는 다름을 확인(값은 적지 않음). git 기록에 남아 있으므로, 그 비밀번호를 다른 곳에 썼다면 바꾸는 것을 권합니다.
- **P-13 [낮음] `.env`가 없을 때의 기본 비밀번호.** compose가 `change-me-orthanc`, `change-me-bridge-token`으로 떨어집니다. `setup`/`start.bat`로 설치하면 `.env`가 먼저 생기므로 실제로는 드묾. (브리지 토큰은 2026-09-29에 기본값을 없앰.) **Orthanc 비밀번호 쪽 제안**: compose에서 `${ORTHANC_PASSWORD:?…}`로 바꿔 `.env` 없이는 시작을 거부하게 — 시험해 보니 동작하지만, EMR `offline/pack.ps1`·`pack.sh`(총괄 파일)가 `.env` 없는 PACS 폴더에서 `docker compose build`·`config --images`를 돌려서 **오프라인 키트 만들기가 깨짐**. pack 쪽에서 임시 값(`ORTHANC_PASSWORD=pack`)을 넘기게 함께 바꿔야 하므로 보류.

### 동작 · 기타

- **P-11 [낮음] ✅ 고침 (2026-09-29)** — 값 검사(400), 없는 항목 404, 한 트랜잭션, `scheduled`→order_item `sent`. 누가 부를 수 있는지(로그인만)는 그대로 — 지금 쓰는 곳이 없어 권한은 쓰임새가 생길 때 정함. **원래 문제**: `PUT /api/worklist/:id/status`에 값 검사·트랜잭션 없음. `worklist.routes.js:45-61` — 예: `scheduled`는 worklist_log엔 들어가지만 order_item의 CHECK에 걸려 둘이 어긋남. 로그인만 있으면 누구나 호출 가능. 지금 쓰는 곳 없음.
- **P-15 [낮음] 판독을 덮어쓰면 이전 판독이 사라짐(이력 없음).** `pacs.routes.js:100`. 서명·확정 개념도 없음.
- **P-16 [낮음] 뷰어 창 바깥을 누르면 저장 안 한 판독이 사라짐.** `Consultation.jsx:693`(진료 세션 파일).
- **P-17 [낮음] ✅ 고침 (2026-09-29)** — 피드 주소 예시 `:9080`, `bridge.py` 기본값 9080, 설정 화면 예시 `http://NAS_IP:9090`, 번역 `pacsServerHint`(ko·en·fr, 기존 키 한 줄씩)와 그 한국어 기본 문구도 9090.
- **P-18 [낮음] ✅ 고침 (2026-09-29)** — 워크리스트로 안 간 영상 오더(UID 없음)의 `viewer-url`이 뷰어 첫 화면(PACS의 모든 환자 목록)을 돌려줘서 한 환자 차트 안에서 다른 환자 목록이 열릴 수 있었음. 이제 `url` 빈 값 + `no_study: true`, 안내 문구 키 `px_noStudy`. 진료 영상 창이 `no_study`면 그 문구를 보이는 것은 진료 세션 몫(총괄 전달). 판독 목록의 「영상보기」는 원래 UID가 있을 때만 보임.
- **P-19 [낮음] ✅ 고침 (2026-09-29, 다른 세션)** — 진료 화면(진료 세션 `9dfcedc`)과 수납·약국 화면의 차트 `PatientChart.jsx`(수납 세션 `768eaa9`)가 같은 규칙·같은 `cs_ws*` 키로 보여 줌: Envoyé/전송됨, Réalisé/촬영 완료 …. 워크리스트로 가지 않는 오더에는 상태를 안 보임.
- **P-21 [보통] ✅ 고침 (2026-09-29, S2)** — 영상 판독·뷰어 주소·연결 시험·워크리스트 API가 로그인만 확인했음(어느 직원이든 모든 환자의 영상 판독을 읽음). 4절 표대로 화면 권한으로 좁힘. `bridgeOrAuth`는 권한을 받는 함수가 됨(`bridgeOrAuth('settings')`).
- **P-22 [낮음] ✅ 고침 (2026-09-29)** — 판독 날짜가 `result_at`(UTC ISO)을 `T` 앞에서 잘라 현지 00~03시에 쓴 판독이 전날로 보였음. `RadiologyReadings.jsx`의 `ymd()`를 임상병리 `LabResults.jsx`와 같은 규칙(날짜만 있는 값은 그대로, 시각이 있는 값은 **브라우저의 현지 날짜**)으로. 진료 영상 창의 같은 한 줄은 진료 세션 몫(총괄이 전달). 주의: 이 규칙은 **브라우저 PC의 시간대**를 따릅니다 — 마다가스카르 병원 PC에서는 맞고, 한국 시간으로 된 PC에서는 자정 근처 시각이 한국 날짜로 보임(격리 시험에서 18:40(+03) 취소가 한국 PC에서 다음 날로 보임).
- **P-23 [보통] 🟡 준비만 (2026-09-29)** — 결과 있는 영상 오더 「취소」(결정 3-B)의 PACS 몫: `readings`·`viewer-url`에 취소 정보, 취소된 오더 판독 저장 409, 판독 목록에 회색·줄긋기·「Annulé (취소됨)」·이유·날짜(「영상 대기 중」은 숨김), `cancelWorklistForOrder`. 취소된 영상 오더가 생기기 전에는 아무것도 달라지지 않음. **켜는 것**: 진료 세션 취소 API·마이그레이션 + PACS 저장소 합친 뒤(총괄 결정).
- **P-20 [낮음] ✅ 고침 (2026-09-29)** — 브리지가 heartbeat에 `arrivals_error`를 싣고(PACS `6c135aa`), `/bridge-heartbeat`가 detail에 저장, 설정 세션의 `status.routes.js`(`9d7e380`)가 노랑 `status.bridge.arrivals`로 표시. 격리 스택에서 비밀번호 없음·Orthanc 없음 → 노랑, 정상 → 초록 확인. **원래 문제**: 브리지가 Orthanc에 못 물어도 EMR 상태 화면은 초록.
- **P-14 [낮음] UID 루트를 남의 것(`1.2.826.0.1.3680043`)을 씀.** 실무상 충돌 가능성은 매우 낮음. 자체 루트 발급은 선택 사항.
- **P-25 [낮음] 옛 포트가 저장된 설정이 남음.** 실행 중 EMR의 `pacs_config.pacs_viewer_url`이 `http://localhost:8090`, `emr_base_url`이 `http://localhost:8080`이었음(총괄, 2026-09-29) → 영상 창이 안 열리는 주소. **코드가 넣은 값이 아님**: 두 칸의 DB 기본값은 처음부터 빈 값(`001_schema.sql`, `pacs.routes.js` `ensureConfig`). 6~7월 설치 당시 안내가 8090·8080이었고(PACS `README.md`·`start.bat` — `4f5320e` 전, EMR `f2ab532` 전, 설정 화면 예시 `NAS_IP:8090` — P-17 전), 사람이 그대로 넣은 값이 2026-07-23 포트를 9090·9080으로 옮길 때 **바꿔 주는 장치 없이 남은 것**. 같은 때 설치한 다른 병원에도 같을 수 있음. 실장님이 설정 화면에서 고침. 막는 방법 후보: ① 상태 화면에서 뷰어 주소가 `:8090`이면 경고(읽기만, 설정 세션과) ② 값이 정확히 옛 기본 주소일 때만 9090으로 바꾸는 마이그레이션(데이터 변경 — 실장님 결정).
- **P-24 [보통] 영상 백업이 없음.** EMR 자동 백업은 `pg_dump`(DB)만 — Orthanc 영상과 색인(`storage` 폴더, 바인드 마운트)은 어디에도 백업되지 않습니다. 디스크가 죽으면 영상은 사라지고 EMR에는 「영상 도착」 기록과 판독만 남음. 방법(두 번째 디스크로 `storage` 복사 — Orthanc를 잠깐 멈추거나 Orthanc 백업 기능, 보관 기간, 용량)은 실장님 결정. 6.1 참고.
- **격리 스택 없음** — PACS 저장소에서 `docker compose up`을 하면 실행 중인 PACS를 덮어씁니다(프로젝트 이름·컨테이너 이름·포트·`./storage` 폴더 고정). 격리 스택은 실장님 허락 후 만듭니다.
- 브리지는 장비별로 워크리스트를 나누지 않습니다(모든 장비가 모든 오더를 봄). Modality로만 장비가 거를 수 있음.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 위키 첫 작성 — 실제 코드 기준으로 1~7절 채움, 문제 목록 P-1~P-19 | EMR `7b21719`, `0e94457` |
| 2026-09-29 | 토큰 보안(P-2·P-5): 옛 기본값·짧은 토큰 거절, 설정 조회는 settings 권한, 화면에서 토큰 가림, 브리지는 헤더로 전송. P-1에 총괄 확인·조치 분담 기록 | EMR `6e5c63a`(develop `f3a5810`) · PACS `43bd994` |
| 2026-09-29 | 영상 도착 확인(P-7)·환자번호 대조(P-3): 브리지가 Orthanc Stable 스터디를 EMR에 알림, 워크리스트 자동 완료, 판독 목록에 도착·경고 표시, 마이그레이션 801(→ 합칠 때 019) | EMR `6456471`(develop `7cfd6cc`) · PACS `e109157` |
| 2026-09-29 | 2절 직원용 사용법을 프랑스어 화면 기준으로 다시 씀(프랑스어 이름 + 괄호 한국어), 「영상이 안 보일 때」·「환자 번호 경고가 떴을 때」 순서 추가 | EMR `2f9f1fe` |
| 2026-09-29 | `PatientCheck`·`imagesOfRow` export(진료 뷰어 창과 같이 쓰도록), 2절 상태 글자를 진료 세션 번역(Envoyé/Réalisé)에 맞춤, P-3·P-19 갱신. 인계 노트에 P-1 조치 절차서 | EMR `2c15a6b` |
| 2026-09-29 | 낮은 항목 정리: P-20(`arrivals_error`, 비밀값 가림), P-11(작업목록 상태 API), P-12(시험 스크립트), P-17(8090 표기), `PUT /config` 부분 저장. P-13은 오프라인 키트 때문에 제안으로. 절차서에 재부팅 당일·장비 설치 날 확인 목록 | EMR `session/pacs` · PACS `6c135aa` |
| 2026-09-29 | 서버 권한 S2 적용(P-21): viewer-url·readings·test·worklist를 화면 권한으로, worklist 쓰기·dicom-mwl 로그인 경로는 settings만 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | P-22 판독 날짜 현지로, P-23 영상 오더 취소 준비(`pacs.cancel.js`, 취소 정보·409·회색 표시) | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | P-18: UID 없는 오더에서 뷰어 첫 화면 대신 `no_study` + `px_noStudy` | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 2.2 방사선사: 찍기 직전마다 워크리스트를 새로 불러오기 (결정 38-③, 영상 오더 취소와 짝) | EMR `session/pacs` |
| 2026-09-29 | 6.1 「새 PC에 설치할 때(PACS)」(결정 35) — 키트·설치·짝 맞추기·백업 복원 뒤 어긋나는 것, 7절 P-24 영상 백업 없음 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 재부팅 뒤: P-1 해결 기록, 2.4 임시 안내 삭제, P-7에 진짜 Orthanc 응답 확인(R-5), P-9에 R-1(로그인 창), P-25(옛 8090 설정) 새로 | EMR `session/pacs` (인계 노트 참고) |
