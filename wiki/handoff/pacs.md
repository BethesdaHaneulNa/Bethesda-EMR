# PACS 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — P-9 C 만듦: EMR이 영상을 중계 (총괄 조건 ①~⑧)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `9a57b6a`를 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `4e84b0b`
- **한 일**
  - 새 `backend/src/routes/pacs.viewer.js` — `/api/pacs/viewer/*` 중계. 서명 쿠키(`px_viewer`, 30분, 스터디 5개까지), 경로 정규화 + 허용 목록(Stone 파일·`/system`·스터디 UID로 거른 DICOMweb만), 요청마다 계정 활성·진료 권한 확인(30초 캐시), Orthanc에 `admin`으로 붙여 스트림 전달, Orthanc의 `Set-Cookie`·`WWW-Authenticate` 버림, 안내 쪽(짝 안 맞음 / 응답 없음 / 시간 끝) fr·ko·en, 중계 응답에만 Stone용 CSP. 자세히는 모듈 위키 4절.
  - `pacs.routes.js` — `viewer-url`이 상대 주소 `/api/pacs/viewer/stone-webviewer/index.html?study=<UID>`를 주고 쿠키를 붙임, **`?study=`로 여는 길 없앰**(오더로만), `has_viewer` 늘 참. `GET/PUT /config`는 `publicConfig`로 `orthanc_password`를 빼고 `orthanc_password_set`만. `orthanc_url` 저장.
  - `Settings.jsx`(오더 연동 탭, PACS 부분) — 「EMR이 영상 서버에 닿는 주소」 칸, 비밀번호 ✓/⚠ 상태 줄(입력 칸 없음), 「PACS 웹/뷰어 주소」는 흐리게 남기고 「이제 쓰지 않음」(조건 ⑥), 「🖼 뷰어 열기」 링크 삭제. `pacsServerHint`의 한국어 기본 문구도 새 번역과 같게.
  - **PACS 저장소**: `pair-with-emr.ps1/.sh`가 토큰 다음에 **`.env`의 Orthanc 비밀번호를 EMR `pacs_config.orthanc_password`에 넣음**(stdin, md5로 확인, 화면·명령줄에 안 나옴). 칸이 없는 옛 EMR이면 「EMR older than the built-in viewer」 안내만 하고 토큰 짝 맞춤은 그대로 성공. `docker-compose.yml` 웹 포트 **`127.0.0.1:9090:8042`**, Stone **시작 안내 상자 끔**(`ORTHANC__STONE_WEB_VIEWER__SHOW_INFO_PANEL_AT_STARTUP=Never` — 아래 「찾은 것」). `setup.ps1/.sh`·`start.bat`·`README.md` 문구(직원 PC엔 뷰어 주소 없음, 장비는 `<IP>:4242`, 9090은 서버 PC 안에서만).
- **바꾼 파일**: EMR `backend/src/routes/pacs.viewer.js`(새), `backend/src/routes/pacs.routes.js`, `backend/sql/803_pacs_viewer_proxy.sql`(새), `frontend/src/pages/Settings.jsx`(PACS 부분), `wiki/modules/pacs.md`(2.3·2.5·4·6·6.1·7 P-9·8), `wiki/handoff/pacs.md`. PACS `pair-with-emr.ps1`, `pair-with-emr.sh`, `docker-compose.yml`, `setup.ps1`, `setup.sh`, `start.bat`, `README.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에 키 4개 + **기존 키 `pacsServerHint` 문구 변경(세 언어)**: 「웹 주소(9090)는 진료실 뷰어가…」 → 「영상 창은 EMR이 대신 보여 주므로 진료실 PC가 9090에 닿을 필요는 없습니다」. nginx.conf·app.js는 안 바꿈(중계는 `pacs.routes.js` 안에 붙음).
- **DB 마이그레이션**: `803_pacs_viewer_proxy.sql` — `pacs_config`에 `orthanc_url VARCHAR(200) DEFAULT 'http://host.docker.internal:9090'`, `orthanc_password VARCHAR(200)` (`ADD COLUMN IF NOT EXISTS`만, 기존 줄 안 바꿈). 번호는 총괄이 다시 매김.
- **번역 키**
  - `px_orthancUrl` — ko 「EMR이 영상 서버에 닿는 주소 (보통 그대로)」 / en 「Address the EMR uses to reach the image server (usually leave as is)」 / fr 「Adresse du serveur d'images vue par l'EMR (en général, ne pas modifier)」
  - `px_orthancPasswordSet` — ko 「영상 서버 비밀번호 설정됨 — 영상 창이 로그인 없이 열립니다」 / fr 「Mot de passe du serveur d'images enregistré — la visionneuse s'ouvre sans connexion」
  - `px_orthancPasswordMissing` — ko 「영상 서버 비밀번호가 아직 없습니다. 서버 PC의 PACS 폴더에서 pair-with-emr.ps1을 실행하세요.」 / fr 「Pas encore de mot de passe du serveur d'images. Sur le PC serveur, lancez pair-with-emr.ps1 dans le dossier du PACS.」
  - `px_viewerUrlUnused` — ko 「이제 쓰지 않음(영상은 EMR이 보여 줌)」 / fr 「n'est plus utilisée (l'EMR affiche les images)」
- **총괄 조건별 결과**
  - ① 비밀번호가 응답·로그·변경 기록에 없음 — `SELECT *`로 읽는 곳: `pacs.routes.js` `ensureConfig`(응답은 모두 `publicConfig`를 거침, 나머지 호출은 토큰 검사에만 씀), `consult.routes.js`(진료 파일, `auto_create_worklist`만 씀 — 내보내지 않음). 격리에서 `GET /config`·`PUT /config` 답, EMR api·nginx 로그에서 비밀번호와 `admin:<비밀번호>` base64 모두 **0건**. 설정 저장 뒤에도 비밀번호 그대로(md5 확인). DB 백업(`pg_dump`)에는 들어감 — 브리지 토큰과 같음.
  - ② 쿠키 서명 열쇠 = `HMAC(JWT_SECRET, 'bethesda-pacs-viewer-cookie-v1')`. JWT_SECRET을 바꾸면 쿠키도 모두 무효.
  - ③ 경로: 한 번 풀고 `..`·`.`·`//`·`\`·남은 `%`(= `%252e` 같은 이중 인코딩)·NUL이면 400, 그 뒤 허용 목록. 시험: `../`, `%2e%2e`, `%2f`, `%252e`, `..%5c`, `//` 모두 400. `--path-as-is`로 보내 curl이 먼저 정리하지 않게 함.
  - ④ `Set-Cookie`·`WWW-Authenticate` 없음(중계 응답 헤더 확인), 영상은 `pipe`로 스트림.
  - ⑤ 비밀번호 없음 → 「Le serveur d'images n'est pas encore relié à ce dossier : l'administrateur doit lancer pair-with-emr.ps1…」 (페이지 200, 데이터 424). 비밀번호 틀림(Orthanc 401)도 같은 안내. Orthanc 꺼짐·주소 틀림 → 「Le serveur d'images ne répond pas…」.
  - ⑥ 「PACS 웹/뷰어 주소」 칸 남김(흐리게, 「이제 쓰지 않음」), 값은 안 씀.
  - ⑦ **큰 영상 수치** (격리, 이 PC — 512×512×100장 16비트 한 파일 **52,429,878바이트**, 브라우저 → 9188 nginx → EMR 중계 → `host.docker.internal:9198` → Orthanc):

    | 요청 | 결과 |
    |---|---|
    | 인스턴스 통째(multipart, 50MB) ×3 | 200, 첫 바이트 0.11초, 끝 **2.80~2.92초** |
    | 같은 것 Orthanc 직접(9198) | 0.31초 |
    | EMR 컨테이너 → Orthanc 직접(중계·nginx 없이) | 2.66~2.78초 |
    | EMR 컨테이너 → 자기 중계(nginx 없이) | 2.77~2.85초 |
    | 프레임 100장 한 요청 | 3.0초 |
    | 프레임 한 장(512KB) | 0.07초 |
    | 렌더 한 장(JPEG) | 0.09초 |
    | 느린 브라우저(`--limit-rate 2M`) 통째 | 25.1초, 끊김 없음 |

    ⇒ 늦어지는 곳은 **Docker Desktop의 `host.docker.internal` 구간**(약 18MB/s ≈ 150Mbps)이고, 중계·nginx가 더하는 시간은 거의 없음. nginx는 50MB를 임시 파일로 버퍼하며 경고 한 줄(`an upstream response is buffered to a temporary file`) — 기본 `proxy_max_temp_file_size` 1GB 안이라 문제없음. `proxy_read_timeout`(기본 60초)은 **바이트 사이 간격**이라 큰 영상이 오래 걸려도 끊지 않음(25초 시험). **⇒ nginx.conf는 바꿀 필요 없음.** 원하면 `/api/pacs/viewer/`에만 `proxy_buffering off`로 임시 파일 경고를 없앨 수 있음(선택).
    - 중계 허용 목록이 처음엔 `frames/<한 장>`만 받아 **프레임 여러 장 한 요청(`frames/1,2,3`)이 403**이었음 → 쉼표 목록 허용으로 고침(Stone은 한 장씩 부르지만 다른 DICOMweb 도구를 위해).
  - ⑧ 보안 시험 25개 **모두 통과** (develop 당긴 뒤 다시 돌려도 25/25): 자기 스터디 200 / 쿠키 없음 401(`index.html`은 「시간 끝」 안내) / 남의 스터디 UID 403 / 남의 스터디 QIDO 403 / 거르지 않은 `dicom-web/studies` 403 / Orthanc REST `/patients`·`/tools/find`·Explorer `/ui/app/` 403 / POST·DELETE 405 / 경로 우회 6가지 400 / 진짜 서명 + 바꾼 내용 401 / 엉터리 쿠키 401 / 서명은 맞고 만료된 쿠키 401 / 없는 직원 id 쿠키 401 / 수납 직원(진료 권한 없음) 쿠키 401 / 수납·간호사 `viewer-url` 403 / Basic 인증 헤더만 401. **직원 비활성화 → 17초 뒤 401**, 다시 활성 → 200. **진료 권한 회수 → 32초 뒤 401**(30초 캐시 + 2초 간격), 되돌리면 200. 비활성 직원의 유효한 JWT로 `viewer-url` → 401. **남의 쿠키 복사**: 로그인 없는 다른 클라이언트(curl)에서도 그 쿠키의 스터디는 200 — 만료(30분)·계정 비활성·권한 회수까지. HttpOnly라 화면 스크립트로는 못 꺼냄. 설계대로(설계 메모 참고).
- **찾은 것**
  - **Stone 시작 안내 상자 문제**: 「Intended use」 상자가 떠 있는 동안 Stone이 영상 칸 크기를 0으로 잡고, 상자를 닫아도 창 크기가 바뀌기 전까지 **가운데 영상 칸이 까맣게** 남음(EMR 창 안·새 탭 모두, 중계와 관계없음 — `canvas1` 크기 0 확인). 안내 상자를 끄니 50MB 영상이 바로 보임. 그래서 PACS compose에 `SHOW_INFO_PANEL_AT_STARTUP=Never`. 「For patients, researchers and quality assurance. Not for diagnostic usage.」는 왼쪽 위 빨간 글씨로 **계속 보임**. 실행 중 PACS에는 컨테이너를 다시 만들 때 적용됨(9090→127.0.0.1과 같이).
  - **같은 출처의 위험**: Stone이 EMR과 같은 주소(9080)에서 돌아 Stone 코드가 EMR 화면의 localStorage(로그인 토큰 `medconnect_token`)를 읽을 수 있음(확인함). Stone은 우리 Orthanc 이미지(26.6.1 고정)의 코드라 지금 당장의 위험은 낮지만, Stone에 XSS(예: DICOM 태그 글자를 그대로 그림)가 있으면 EMR 로그인까지 번짐. iframe `sandbox`는 `SameSite=Strict` 쿠키가 안 따라가서 못 씀(http라 `SameSite=None; Secure` 불가). 근본 해결은 **뷰어만 다른 포트(다른 출처)** — nginx `listen` 추가·compose 포트·Windows 포트(P-1) 확인이 필요해 **결정 필요**(총괄/실장님).
  - `viewer-url`은 이전처럼 **진료 권한이 있으면 어느 환자 오더든** 쿠키를 받음(오더 id만 알면) — 기존 권한 모델 그대로.
- **확인한 방법**: 격리 EMR 9188(develop `9a57b6a` 위에서 다시 빌드, 새 마이그레이션 032~034 적용 확인) + 격리 PACS 9198/11298. 의사 계정으로 진료 → 🩻 → T3 「Voir image」: EMR 창 안에서 로그인 없이 Stone, 시리즈 3개(작은 시험 영상 2 + 50MB 1) 목록·50MB 영상 표시(fr·ko 버튼 문구), 같은 주소 새 탭도 열림. 관리자로 설정 → 오더 연동: 새 칸·「✓ 영상 서버 비밀번호 설정됨」·「이제 쓰지 않음」 확인. 격리 EMR의 `orthanc_password`는 **시험용 env 사본에 `pair-with-emr.ps1`**을 돌려 넣음(md5 일치). 프론트 빌드 통과.
- **확인 못 한 것**: 실행 중 PACS·EMR(9080/9090) — 안 건드림. 다른 PC의 브라우저·실제 LAN 속도. 장비 C-STORE로 들어온 실제 영상(압축 전송 문법)의 Stone 렌더. `pair-with-emr.sh`는 문법·CR 처리만 보고 리눅스에서 실행해 보지 않음.
- **다른 세션에 부탁**
  - **총괄**: ① 합칠 때 실행 중 PACS를 새 compose로 다시 만들기(웹 포트 `127.0.0.1:9090`, Stone 안내 끔) → **그 뒤 `pair-with-emr.ps1`** 한 번(실행 중 EMR에 Orthanc 비밀번호 넣기; 803이 먼저 적용돼 있어야 함). 순서가 바뀌면 영상 창에 「짝이 맞지 않았습니다」 — 다시 돌리면 됨. ② nginx.conf 변경 **필요 없음**(⑦ 수치). ③ 결정: 뷰어를 다른 출처(포트)로 옮길지(위 「같은 출처의 위험」). ④ 마이그레이션 803 번호.
  - **진료**: 바꿀 것 없음 — 영상 창은 `viewer-url`의 `url`을 그대로 iframe·새 탭에 씀(확인함). 다만 `url`이 빈 값이고 `no_study`가 아닌 경우의 「PACS 뷰어 주소가 설정되지 않았습니다」(`noViewerUrl`)는 이제 나올 일이 없음(`has_viewer` 늘 참) — 정리할지 확인만.
  - **설정**: 상태 화면의 「EMR → 영상 서버」 확인이 있다면 이제 `pacs_viewer_url`이 아니라 `orthanc_url`(+ `orthanc_password_set`)을 봐야 함. `status.routes.js`가 `pacs_viewer_url`을 읽는 곳(옛 포트 경고)은 값이 남아 있으니 그대로 둬도 깨지지 않음 — 확인 부탁.

## 2026-09-29 — 설계 메모: P-9 C 「EMR이 영상을 대신 보여 줌」 (실험 결과 포함)

- **상태**: 끝 — 총괄 승인(조건 8개) 뒤 만듦. 바로 위 항목 「P-9 C 만듦」
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만). **PACS 저장소** — 없음

### 한 줄 요약
영상 창(iframe)이 영상 서버(9090)가 아니라 **EMR 주소 `/api/pacs/viewer/…`** 를 엽니다. **EMR 백엔드(PACS 파일)가 그 요청을 받아 확인한 뒤 영상 서버에 비밀번호를 붙여 전달**합니다. 허락의 근거는 EMR이 영상 창을 열 때 심어 주는 **짧게 사는 쿠키**입니다. **nginx·EMR compose는 바꾸지 않아도 됩니다** — 기존 `/api/` 전달을 그대로 탑니다.

### 격리 스택 실험 (2026-09-29, 이 PC 안에서만 — 실행 중 PACS는 안 건드림)
- **E1** EMR 백엔드 컨테이너 → `host.docker.internal:9198`(**호스트 127.0.0.1에만 열린 포트**) → **닿음**(401 응답). ⇒ Windows(Docker Desktop)에서는 9090을 병원 네트워크에 열지 않고 **127.0.0.1에만** 열어도 EMR은 쓸 수 있음. *(리눅스 Docker에서는 127.0.0.1 포트가 컨테이너에서 안 보임 — 새 PC가 Windows라 해당 없음, 기록만.)*
- **E2** 비밀번호를 붙여 주는 임시 nginx 중계(127.0.0.1:9199, `/api/pacs/viewer/` → Orthanc)로 Stone 뷰어를 엶 → **로그인 창 없이 열림**, `/api/pacs/viewer/` 같은 하위 경로에서도 됨(Stone이 상대 경로를 씀). 검사·시리즈 2개·환자 머리글 표시.
  - Stone이 부른 경로 — **모두 GET**:
    - `stone-webviewer/…` 정적 파일 27
    - `system` 2
    - `dicom-web/studies?0020000D=<UID>&includefield=…`
    - `dicom-web/series?0020000D=<UID>&…`
    - `dicom-web/instances?0020000D=<UID>&0020000E=<UID>&…`
    - `dicom-web/studies/<UID>/series/<UID>/metadata`
    - `dicom-web/studies/<UID>/series/<UID>/rendered`
    - `dicom-web/studies/<UID>/series/<UID>/instances/<UID>/metadata`
    - `…/instances/<UID>/frames/1/rendered`
  - ⇒ **정적 파일·`system`을 뺀 모든 데이터 요청에 StudyInstanceUID가 들어 있음**(경로의 `studies/<UID>` 또는 필터 `0020000D=`). Orthanc 고유 ID 경로(`/studies/<id>`, `/instances/<id>`)는 안 씀.
- **E3** EMR 웹 컨테이너의 nginx에 `auth_request` 모듈 있음 — 쓸 수는 있지만 아래 이유로 추천 안 함.
- **알아 둘 것**: Stone 뷰어가 처음에 「Intended use … patients, research, quality assurance」 창을 띄우고, 화면 왼쪽 위에 빨간 글씨 **「Not for diagnostic usage」** 가 늘 보입니다. **지금 뷰어도 똑같습니다**(이번 변경과 무관). 진단용 인증 뷰어가 아니라는 표시 — 실장님이 알고 계셔야 할 사항이라 적음.

### 설계
**① iframe은 EMR 토큰을 헤더로 못 보냄 → 짧게 사는 쿠키**
- 진료 화면이 이미 부르는 `GET /api/pacs/viewer-url?order_item_id=`(JWT + 진료 권한)가 응답과 함께 쿠키 `px_viewer`를 심음.
  - 쿠키 속성: `HttpOnly; SameSite=Strict; Path=/api/pacs/viewer/; Max-Age=1800`.
  - 내용: `{user id, 이 오더의 study UID(실제 UID 포함), 만료}`를 서버 비밀값(JWT_SECRET)으로 **HMAC 서명**. 최근 5개 study까지 담아 「새 탭에서 열기」도 됨.
- `viewer-url`이 돌려주는 `url`은 **상대 주소** `/api/pacs/viewer/stone-webviewer/index.html?study=<UID>`. 같은 출처라 iframe·새 탭 모두 쿠키가 따라감.
- **nginx `auth_request`를 쓰지 않는 이유**: 그러려면 영상 서버 비밀번호를 nginx 설정에 넣어야 함 → EMR `.env` + compose 환경 변수 + 설정 템플릿. 현장에서 「비밀값 하나 더, 파일 하나 더」가 늘어남. 백엔드 한 곳에서 하면 **짝 맞추기 한 번으로 끝남**.

**② 영상 서버 비밀번호는 서버 안에서만**
- `pair-with-emr.ps1`이 이미 하는 일(토큰을 EMR에 stdin으로)에 **Orthanc 비밀번호도 같은 방법으로** 넣음 → `pacs_config.orthanc_password`(마이그레이션 8xx, 칸 추가만).
- `GET /api/pacs/config`는 이 값을 **돌려주지 않음**(설정 화면에도 안 보임, 「설정됨/안 됨」만).
- 영상 서버 주소는 `pacs_config.orthanc_url`(기본 `http://host.docker.internal:9090`, EMR 컨테이너에서 본 주소).
- 알아 둘 것: 비밀번호가 EMR DB 백업에도 들어감. 백업에는 이미 모든 환자 기록이 있어 위험이 크게 늘지는 않음. 새 PC에서 복원한 뒤 `pair-with-emr`를 다시 돌리면 새 값으로 바뀜.

**③ 무엇을 통과시키나 — 읽기 경로만, 연 검사만** (`/api/pacs/viewer/*`, PACS 파일 새로 `pacs.viewer.js`)
- **GET만**. 그 밖(POST·PUT·DELETE)은 405.
- 쿠키가 없거나, 서명이 틀리거나, 만료 → 401.
- 요청마다 쿠키의 사용자가 **아직 활성이고 진료 권한이 있는지** DB로 확인(S1과 같게, 30초 캐시).
- 허용 경로(목록에 없으면 403):
  - `stone-webviewer/*`, `system`
  - `dicom-web/studies/<UID>/…` — `<UID>`가 쿠키에 있을 때만
  - `dicom-web/studies|series|instances?…` — **`0020000D`(또는 `StudyInstanceUID`) 필터가 있고 그 UID가 쿠키에 있을 때만**. 필터 없는 전체 목록 조회는 막힘 ⇒ **다른 환자의 study를 URL로 못 엶**.
- 막힌 요청은 경로 모양만 로그에 남김(UID는 가림) — Stone 판이 바뀌어 새 경로를 부르면 알 수 있게. Orthanc는 26.6.1로 고정이라 당분간 바뀌지 않음.
- 전달: Node `http.request`로 Orthanc에 흘려보냄(streaming), `Authorization: Basic …`은 서버에서만 붙임. 응답의 `WWW-Authenticate`는 지움(브라우저 로그인 창이 다시 뜨지 않게). 제한 시간은 연결 5초·응답 120초.

**④ 설정의 「뷰어 주소」 칸과 9090**
- 직원 브라우저는 9090을 쓰지 않음 → 설정의 **「PACS 웹/뷰어 주소」는 필요 없어짐**. 대신 「EMR이 영상 서버에 닿는 주소」(`orthanc_url`, 기본값 그대로면 손댈 일 없음)와 「영상 서버 비밀번호: 설정됨 ✓」 표시.
  - 옛 `pacs_viewer_url`은 남겨 두되 쓰지 않음(데이터를 바꾸지 않음). P-25 경고는 새 칸 기준으로(설정 세션).
- **9090은 병원 네트워크에 열 필요 없음**: PACS compose에서 `127.0.0.1:9090:8042`로(E1). Orthanc 관리 화면은 서버 PC에서만(`http://localhost:9090`). 방화벽 확인은 9080·4242만 남음. **4242(장비)는 그대로 병원 네트워크에.**

**⑤ 현장에서 달라지는 것 (「복잡하지 않을 것」)**
- **의사**: 영상 창이 로그인 없이 바로 열림. 새 탭도 됨. 30분 넘게 창을 열어 두었다가 새로 고치면 영상 창을 다시 열면 됨.
- **설치하는 사람**: 할 일이 **줄어듦** — 뷰어 주소 입력, 9090 방화벽이 없어지고 `pair-with-emr` 한 번이면 끝.
- 영상 서버 관리자 비밀번호는 직원에게 알려 줄 필요가 없어짐.

### 세션별 몫
| 누가 | 무엇 | 크기 |
|---|---|---|
| **PACS** | `pacs.viewer.js`(중계 + 경로 허용 목록 + 쿠키 확인), `viewer-url`이 쿠키를 심고 상대 주소를 돌려줌, 마이그레이션(`orthanc_url`, `orthanc_password`), `GET /config`에서 비밀번호 빼기, `pair-with-emr.ps1`이 Orthanc 비밀번호도 넣기, PACS compose 9090 → 127.0.0.1, setup·start.bat·README 안내, 설정 화면 오더 연동 탭의 칸 정리(PACS 몫), 위키 2.3·6.1 | 중간 |
| 진료 | **없을 것으로 봄**(영상 창은 `viewer-url`의 `url`을 그대로 씀). 「새 탭에서 열기」도 같은 `url`. 만든 뒤 확인만 | — |
| 설정 | 상태 화면: 「EMR → 영상 서버」 연결(백엔드가 `orthanc_url`에 비밀번호로 닿는지), P-25 경고를 새 칸 기준으로 | 작음 |
| 총괄 | nginx·EMR compose **변경 없음**(확인만). 출발 전 확인 목록에서 9090 방화벽 줄 빼기. 실행 중 PACS의 9090을 127.0.0.1로 바꾸는 재생성 | 작음 |

### 시험 계획 (격리 스택: EMR 9188 → PACS 9198)
1. **의사**: 진료 → 영상 창 → 로그인 창 없이 영상. 새 탭도. 한국어·프랑스어.
2. **막히는 것**
   - 쿠키 없이 → 401
   - 다른 환자 study UID를 주소에 넣음 → 403
   - 필터 없는 `dicom-web/studies` → 403
   - POST·DELETE → 405
   - 만료된 쿠키 → 401
   - 진료 권한을 뺀 계정(S1) → 다음 요청부터 401/403
   - 수납·간호사 계정은 `viewer-url`부터 403
3. **비밀번호**: `GET /config` 응답에 없음, EMR 로그에 없음. `pair-with-emr` 뒤에도 영상이 열림(비밀번호가 바뀌어도 같이 바뀜).
4. **9090**: PACS 격리 스택을 127.0.0.1로 두고도 EMR이 닿음(E1에서 확인됨).
5. **속도**: 영상 10장짜리 검사를 열 때 걸리는 시간, 직접 연결과 비교.
6. **Stone의 다른 버튼**(다운로드 등)이 막히는지 — 막히면 막힌 경로를 보고 허용 여부를 결정(기본은 막음).

- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음(설계상 1건) · **번역 키**: 없음

## 2026-09-29 — 영상 백업 만듦 (결정 41) · 위키 6.1 다시 · 2.6 한 줄 · 오프라인 키트 검토

- **상태**: 확인 요청
- **커밋**: **PACS 저장소** `session/pacs` **`8fcf65f`** (`main` `d3d001c` 위 한 개). **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋
- **한 일** (설계 메모 그대로, 총괄 조건 모두):
  - PACS 새 파일 5개: `image-backup-common.ps1`(공용), `prepare-backup-disk.ps1`, `image-backup.ps1`, `install-image-backup.ps1`, `restore-image-backup.ps1`. `.gitignore`에 `logs/`, README에 「Image backup」.
  - EMR `POST /api/pacs/image-backup-report`(브리지 토큰, **헤더**) → `service_heartbeat` `pacs_image_backup`, `last_success`는 실패한 날에도 이어 둠. 본문에 환자 정보 없음(개수·공간·오류 글자).
  - 조건: 임시 이름(`.part`) → 크기 확인 → 이름 바꿈 / seq는 한 묶음(200건) 다 받은 뒤에만 / 디스크 가득 → 멈춤·실패 보고, 끝에 10% 미만이면 경고 / 복원 끝에 「EMR 오더 중 영상 기록 있는데 Orthanc에 없는 수」.
  - 위키: **6.1을 새 도구 기준 설치 순서로 다시 씀**(키트 → 설치(포트 확인·자동 짝) → EMR 복원 → **다시 pair-with-emr** → 뷰어 주소 → **영상 복원** → 영상 백업 켜기 → 확인), **6.2 영상 백업** 새로, **2.6**에 「취소한 검사에 나중에 영상이 들어와도 도착 표시 없음 — 영상 창으로 확인」, **2.7** 영상 백업 경고가 떴을 때(직원용), 4절 API, 7절 P-24 🟡.
- **시험** (격리 스택 EMR 9188 + PACS 9198, 시험용 폴더를 디스크로 — 실행 중 PACS 9090엔 아무것도 안 함, **예약 작업 등록 안 함**: `-WhatIf`만, 등록 안 된 것 확인):
  - 디스크 준비: 비어 있지 않은 폴더 거절 → `-Force` 준비 → 다시 하면 「이미 준비됨」.
  - 백업: 첫 실행 9장 → 다시 0장 → 새 검사 2장만 → 받기 전에 지운 검사 건너뜀(실패 아님) → 남은 `.part` 지움 → 디스크 가득(여유를 일부러 크게) 멈춤·seq 그대로 → 디스크 없음 exit 2·`disk_found:false` → 디스크 둘 멈춤 → 정상. 각 결과가 EMR 줄에, `last_success`는 실패 뒤에도 유지. 파일 경로는 UID뿐.
  - 복원: 격리 Orthanc에서 검사 하나(3장) 지움 → `-Verify` VERIFIED(디스크 11 ≥ Orthanc 8) → 복원 3 새로·8 이미 → 다시 0 새로 → 「missing from Orthanc」 4→3(남은 3은 가짜 Orthanc 시절 시험 오더 — 정상).
  - **시험 중 찾아 고친 것 셋**: ① 디스크가 하나일 때 PowerShell이 목록을 풀어 `$disks[0]`가 「C」 한 글자가 됨 → 첫 시험 파일이 PACS 작업 폴더 안 `C\`에 써짐(시험 사본 9장 + state — 지움, 커밋 안 됨) ② `File.Replace`에 `$null`을 넘기면 PowerShell이 빈 글자로 바꿔 거절 → `[NullString]::Value` ③ 디스크 없음·둘일 때 목록이 한 겹 더 싸임 → 반환 방식 고침.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 실제 USB 디스크(드라이브 글자로 찾기 — 시험은 폴더를 `-SearchRoots`로), 작업 스케줄러 실제 실행, 대용량(수천 장) 속도. 리눅스·NAS `.sh`는 아직.
- **설정 세션에 부탁** (총괄 전달): `status.routes.js`에 `pacs_image_backup` 줄 — 보고 없음(꺼짐) / `disk_found=false` / `ok=false` / `last_success`가 36시간 넘음 / `free_gb/total_gb` 10% 미만 → 노랑·빨강, `error` 글자 보여 주기. `server-status.ps1`은 PACS 폴더 `logs\image-backup-status.json`(`at`, `ok`, `disk_found`, `error`, `free_gb`, `total_gb`)을 읽기 — EMR이 멈춰도 보이게.
- **오프라인 키트 검토 (총괄 `11fbf03`)**: F-1~F-5 모두 들어감(PACS `.env` 없을 때 자리값, MANIFEST에 두 저장소 커밋·고친 파일 경고, 이미지 이름표 되돌리기, `.env*`·`*.env`·`*.bak` 제외 + `.claude`까지 뺀 것 좋음, PACS 실패 경고, 설치 끝 안내에 짝 맞춤·뷰어 주소·포트·방화벽·고정 IP·「영상은 EMR 백업에 없음」). **빠진 것 둘**: ① 제외 목록에 **`logs`**(PACS 폴더의 `logs\image-backup.log`·`image-backup-status.json` — 환자 정보는 없지만 그 PC의 기록) — `pack.ps1`의 `$excludeDirs`와 `pack.sh` `--exclude=logs` ② 설치 끝 안내의 「Plan a copy of …\storage to a second disk」 → 「`prepare-backup-disk.ps1` + `install-image-backup.ps1` (EMR 위키 PACS 6.2)」로.

## 2026-09-29 — 영상 오더 취소를 실제 브리지로 끝까지 확인 · 위키 문구 맞춤 (총괄 표의 PACS 1·2·3)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만, develop `c7d8939`로 ff한 뒤). **PACS 저장소** — 없음
- **1) 실제 브리지에서 빠지는지** — 격리 스택(EMR 9188 develop 최신 + PACS 9198/11298, 브리지 `d3d001c`), 의사 계정·`POST /api/consultations/order/:id/cancel`:
  - 촬영 전 영상 오더에 판독 → 취소: 오더·`worklist_status`·워크리스트 모두 `cancelled`, **브리지 한 바퀴 뒤 `.wl` 삭제**(`260929-11.wl` 사라짐).
  - 촬영 끝난(completed) 오더 취소: 오더 `cancelled`, **워크리스트 줄 `completed` 그대로**, `worklist_status` `completed` 그대로.
  - 취소 뒤 영상이 늦게 도착: 브리지 로그에 그 accession이 **0줄**(피드에 없어 안 물음) → 「도착」 기록 없음, 워크리스트 `cancelled` 그대로. `viewer-url`은 `cancelled:true`·UID가 든 주소 → 영상은 볼 수 있음. 판독 저장은 409 `Imaging order was cancelled`.
- **2) 위키 문구**: 2.1 ④ ②의 물음을 영상 전용 키 `cs_cancelPromptImg`(fr·ko) 그대로, ③을 실제 화면(오더 줄이 회색·줄긋기)대로. 7절 P-23 ✅.
- **3) P-25 포트**: 앞 항목(영상 백업 메모) 끝에 답 — PACS 저장소는 README의 「예전에 8090」 설명만(의도), EMR 예시는 이미 9090·9080(`890c64a`).
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **격리 스택**: 시험 뒤 내림.

## 2026-09-29 — 설계 메모: 영상 백업 (결정 41 — 매일 밤 외장 USB 디스크, 새 영상만, 디스크 없으면 경고) · P-25 포트

- **상태**: 끝 — 만듦. 위 항목 「영상 백업 만듦 (결정 41)」
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만). **PACS 저장소** — 없음

### 한 줄 요약
**PACS 폴더의 PowerShell 스크립트를 Windows 작업 스케줄러가 매일 밤 02:30에 돌려**, Orthanc REST에서 **지난번 이후 새로 들어온 영상(DICOM 파일)**만 받아 외장 디스크에 쓰고, 결과를 EMR에 보고해 **상태 화면에 경고**가 뜨게 한다. 복원은 그 파일들을 Orthanc에 다시 올리는 스크립트 — **11월 새 PC로 영상을 옮길 때도 같은 방법**.

### ① 무엇이 돌리나 — 호스트의 예약 작업
- **Windows 작업 스케줄러**, 매일 **02:30**(EMR DB 백업 기본 02:00과 겹치지 않게), 「사용자가 로그온할 때만 실행」. Docker Desktop 자체가 로그온한 사용자 세션에서 돌아서 조건이 같음. 관리자 권한·비밀번호 저장이 필요 없음.
- 등록은 `install-image-backup.ps1`이 한 번. 실행은 `image-backup.ps1`. 둘 다 PACS 저장소. 리눅스·NAS는 cron + `.sh`(같은 설계, 나중에).
- 왜 컨테이너가 아닌가: USB 디스크는 드라이브 글자가 바뀌고 빠질 수 있음. 컨테이너의 마운트는 만들 때 고정되고, 디스크가 없으면 컨테이너가 안 뜨거나 빈 폴더에 씀. 왜 EMR 백업 서비스가 아닌가: 설정 세션 파일이고 EMR 컨테이너 안에서 돌아 호스트 USB를 못 봄.
- 놓친 밤(PC가 꺼져 있었음)은 작업 스케줄러의 「예약을 놓치면 가능한 빨리 실행」으로 따라잡음.

### ② 쓰는 중인 Orthanc를 어떻게 일관되게 — 파일 복사가 아니라 Orthanc에게 받기
- `storage` 폴더를 통째로 복사하지 않음. 색인(SQLite)은 쓰는 중에 복사하면 깨질 수 있고, 그러려면 Orthanc를 멈춰야 함. 또 그 폴더 형식은 Orthanc 판에 묶임.
- 대신 **Orthanc REST**:
  - `GET /changes?since=<seq>&limit=500`에서 `NewInstance`를 모아 `GET /instances/<id>/file`로 **원본 DICOM 파일 그대로** 받음.
  - 받는 것은 Orthanc가 다 저장한 것뿐이라 일관성 문제가 없음. 멈출 필요도 없음.
  - 표준 DICOM이라 **다른 Orthanc 판·다른 PACS로도 복원 가능**.
- 「새로 생긴 영상만」: 마지막 `seq`를 **디스크 자체에** 저장(`state.json`). 디스크를 새것으로 바꾸면 처음부터 전부 복사되어 저절로 맞음.
- 파일 자리: `<디스크>:\BethesdaPACS\images\<StudyInstanceUID>\<SOPInstanceUID>.dcm` — **경로에 환자 이름을 넣지 않음**. 이미 있으면 건너뜀(다시 돌려도 안전). 하나 받을 때마다 크기 확인.
- **지우지 않음**: Orthanc에서 지운 영상도 디스크에는 남음(실수로 지운 것 되살리기). 보관 기간 없음. 용량 경고로 관리.

### ③ 대상 디스크를 어떻게 알아보나 — 표시 파일
- 드라이브 글자는 바뀌므로, 디스크 맨 위의 **표시 파일 `BETHESDA-PACS-BACKUP.id`**(처음 준비할 때 `prepare-backup-disk.ps1`이 만듦: 디스크 ID·만든 날)로 찾음. 모든 드라이브를 훑어 이 파일이 있는 곳을 씀.
- 표시 파일이 **둘 이상이면 멈추고 경고**(어느 쪽인지 모름). **없으면 「디스크 없음」 경고**. 볼륨 이름(label)은 보조 확인만.
- 준비할 때 디스크가 **비어 있지 않으면 확인을 물음**(다른 디스크를 잘못 고르지 않게).

### ④ 경고를 어디에
- **EMR 상태 화면**: 스크립트가 끝나면 `POST /api/pacs/image-backup-report`(**PACS 라우트, 새로**, 브리지 토큰 — PACS `.env`에서 읽음)로 `{ok, disk_found, copied, total_on_disk, free_gb, error}`를 보냄 → `service_heartbeat`의 `pacs_image_backup` 줄.
  - 설정 세션 부탁: `status.routes.js`에 줄 하나 — 디스크 없음 / 실패 / **마지막 성공이 36시간 넘음**(작업이 안 돈 것) / 여유 공간 10% 미만 → 노랑·빨강.
  - 한 번도 보고가 없으면 「꺼짐」(영상 백업을 안 쓰는 병원).
- **서버 상태 창**(`server-status.ps1`, 설정 세션): 호스트에서 돌므로 디스크의 `state.json`(마지막 성공 시각)을 직접 읽을 수 있음. EMR이 멈춰도 보임 — 설정 세션 부탁.
- 스크립트 자신의 기록: PACS 폴더 `logs\image-backup.log`(환자 이름 없이 개수·오류만, 오래된 것 정리).

### ⑤ 복원과 연습
- **복원** `restore-image-backup.ps1`: 디스크의 `.dcm`를 Orthanc에 `POST /instances`로 다시 올림. 이미 있으면 Orthanc가 「이미 있음」으로 답해 **다시 돌려도 안전**. 끝나면 Orthanc 영상 수와 디스크 파일 수를 비교해 알려 줌.
  - 쓰는 때: 디스크 고장 뒤, 그리고 **11월 새 PC**(PACS 설치 → EMR 백업 복원 → `pair-with-emr` → 영상 복원).
  - 영상의 StudyInstanceUID가 그대로라 EMR 오더와의 연결(`study_instance_uid`·`image_study_uid`)도 그대로 살아남.
- **연습**: `restore-image-backup.ps1 -Verify`(읽기만)를 달마다 — 디스크에서 무작위 20개를 읽어 DICOM으로 열리는지, 파일 수 ≥ Orthanc 수인지.
  - 석 달에 한 번은 **PACS 격리 스택(9198)에 실제로 복원**해 영상이 열리는지 봄(실행 중 PACS는 안 건드림).
  - EMR의 `verify-backup.ps1`과 같은 자리에 기록.

### 용량·기타
- 대강 CR 한 장 10~30MB, 초음파 한 검사 수십 MB. 하루 20검사 × 30MB ≈ 0.6GB → **1TB로 수년**(실제 장비가 붙으면 첫 달 수치로 다시 계산).
- 디스크에는 환자 영상(개인정보)이 그대로 있음 → 서버 옆에 두되 잠금 장소. 암호화(BitLocker To Go)는 관리자 권한·복구 키 관리가 필요해 **실장님 결정**으로 남김.
- 디스크를 늘 꽂아 두면 랜섬웨어에 같이 당할 수 있음 — 결정 41이 디스크 1개라서 여기까지. 두 개를 번갈아 쓰는 것은 나중 선택.

### 만들 것과 세션별 몫
| 누가 | 무엇 | 크기 |
|---|---|---|
| PACS | `prepare-backup-disk.ps1`, `image-backup.ps1`, `install-image-backup.ps1`(예약 작업 등록/해제), `restore-image-backup.ps1`(+`-Verify`), `pacs.routes.js`의 `POST /image-backup-report`, 위키 | 중간 — 격리 스택(Orthanc 9198 + 시험 USB 대신 폴더)으로 시험 |
| 설정 | `status.routes.js` 줄 하나, `server-status.ps1` 줄 하나, 번역 | 작음 |
| 총괄 | 출발 전 확인 목록에 「백업 디스크 준비·예약 작업 등록·연습 한 번」, 오프라인 키트에 스크립트 포함(PACS 폴더에 있으므로 자동) | 작음 |

### P-25 포트 (총괄 질문)
- PACS 저장소: 옛 포트가 남은 곳은 README의 「예전에 8090을 썼다」는 설명 한 곳뿐(의도). `start.bat`·`setup`은 이미 9090과 LAN IP 안내(`d3d001c`).
- EMR 설정 화면 예시 `NAS_IP:8090`은 **`frontend/src/pages/Settings.jsx`의 오더 연동 탭**(PACS 몫)에 있었고, **P-17로 이미 `NAS_IP:9090`**, 피드 주소 예시도 `:9080`(`890c64a`, develop에 있음). 설정 세션에 전달할 것 없음.

## 2026-09-29 — G-1~G-4: 설치 때 토큰을 화면에 안 찍고 짝 맞추기 · 포트 경고 · LAN IP 안내

- **상태**: 확인 요청
- **커밋**: **PACS 저장소** `session/pacs` **`d3d001c`** (그 앞 `94935f0` — 둘 다 `main` `6c135aa` 위). **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만)
- **한 일** (PACS 저장소):
  - **G-1 새 `pair-with-emr.ps1` / `pair-with-emr.sh`** — 재부팅 날 검증한 `rotate-token.ps1`를 정식 도구로. 새 토큰(48자) → EMR `pacs_config`에 **stdin**으로(최대 1분 재시도 — EMR이 막 떠서 표가 아직 없을 때) → EMR이 성공한 뒤에만 `.env` 한 줄 교체 → 두 값을 md5로 비교 → 브리지 재생성(`-NoRestart`/`NO_RESTART=1`로 끌 수 있음). 값은 화면·명령줄·로그에 안 나옴. 옛 `.env` 사본은 **PACS 폴더 밖(TEMP)**에 두고 성공하면 지움(키트에 비밀값 사본이 섞이지 않게 — F-4와 같은 이유). **설치 뒤, 그리고 EMR 백업을 복원한 뒤** 쓰는 도구.
  - `setup.ps1`/`setup.sh`: 첫 설치(`.env`를 새로 만든 경우)에 EMR DB(`bethesda-emr-db`)가 돌고 있으면 위 도구로 자동 짝 맞춤 → 「paired — nothing to copy」. 아니면 예전처럼 토큰을 찍고 도구를 안내. 끝에 「백업 복원 뒤에는 pair-with-emr를 다시」 안내.
  - **G-3 새 `check-windows-ports.ps1`**(읽기만): 동적 포트 범위와 지금의 예약 구간을 읽어 9090·4242가 걸리면 경고 + 고치는 명령(관리자) 안내, exit 1. `setup.ps1`이 컨테이너를 띄우기 전에 부름(경고만, 멈추지 않음).
  - **G-4**: `setup`이 이 PC의 LAN IPv4(가상 어댑터 제외)로 「PACS 웹/뷰어 주소: http://<IP>:9090」을 찍음, `start.bat` 끝 안내도 localhost 대신 그 주소로·짝 맞춤 결과를 읽으라고.
  - `setup.ps1`: 컨테이너 단계부터 `$ErrorActionPreference='Continue'` + 종료 코드 확인 — PowerShell 5.1이 native 명령의 stderr를 멈춤 오류로 바꾸는 문제(시험에서 실제로 `NativeCommandError`로 멈춘 것을 보고 고침).
  - `README.md` 짝 맞추기 절을 새 방식으로.
- **G-2(P-13)** 는 총괄의 `offline/pack` F-1과 같이 — 이번에 안 함.
- **확인한 방법**:
  - `pair-with-emr.ps1`: 시험용 `.env` + 격리 EMR DB — 정상(OK, 48자, 다른 줄 그대로, TEMP 백업 남지 않음), 컨테이너 없음·DB 멈춤·`BRIDGE_TOKEN` 두 줄 → 친절한 한 줄 + exit 1(처음엔 컨테이너 없음에서 `NativeCommandError`로 멈춤 → 고친 뒤 다시).
  - `pair-with-emr.sh`: Git Bash에서 같은 시험 — 정상·컨테이너 없음·두 줄.
  - `check-windows-ports.ps1`: 9090·4242 → 조용히 exit 0, 5357(예약)·50000(동적 범위+예약) → 경고 3줄 + exit 1.
  - 세 `.ps1` PowerShell 파서 오류 0, `sh -n` 두 `.sh`.
  - 시험 뒤 격리 EMR의 토큰을 격리 브리지 값으로 되돌림.
- **확인 못 한 것**: **`setup.ps1`/`setup.sh` 전체는 돌려 보지 않음** — `docker compose up`이 실행 중 PACS와 같은 이름(`bethesda-pacs`)으로 뜨고, 짝 맞춤이 실행 중 EMR DB에 쓰게 되므로. 바뀐 부분은 위 두 도구 호출과 안내 글자뿐. 새 PC 설치 때(또는 총괄이 오프라인 키트 시험 때) 처음 실제로 돎.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **위키**: `modules/pacs.md` 6.1 ②-4·②-5·③·④ 표, 8절
- **총괄께**: F-6(`install-offline`의 「paste the bridge token printed above」)은 이제 「setup이 짝 맞춤을 알려 줌, 아니면 pair-with-emr」로 바꾸면 됨. 출발 전 확인 목록의 「복원 뒤 짝 맞추기」 줄은 `.\pair-with-emr.ps1` 한 줄로.

## 2026-09-29 — P-9 선택지: 영상 창이 영상 서버 로그인을 요구하는 문제 (결정 세션용)

- **상태**: 보류 — 선택지만(코드 변경 없음), 실장님 결정 필요
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음

**지금 어떤가 (확인한 것)**
- 영상 서버(Orthanc)는 로그인이 켜져 있고 계정은 **관리자 하나**뿐입니다. 이 계정으로는 영상 **삭제·수정**까지 됩니다.
- 브라우저에서 `http://서버:9090`을 바로 열면 **로그인 창**이 뜹니다(R-1, 총괄 확인).
- 그런데 **EMR 진료 화면의 영상 창 안에서는 로그인 창도 없이 까만 화면만** 나왔습니다(격리 스택, 앱 안 브라우저 — 서버 응답 401). 현장 Chrome/Edge에서도 같은지는 확인 필요. 의사는 왜 안 보이는지 알 수 없습니다.

**실장님께 드릴 질문**: 「의사가 영상 창을 열 때 영상 서버 비밀번호를 쳐야 하는 방식을 어떻게 할까요?」

| | 방법 | 의사가 겪는 것 | 보안 | 작업 |
|---|---|---|---|---|
| **A** | 지금대로 + 안내: PC마다 처음 한 번 **「Ouvrir dans un onglet (새 탭에서 열기)」**로 로그인해 브라우저가 기억하게 | PC·브라우저마다 첫 로그인 한 번. 그 뒤 영상 창 안에서 보이는지는 **확인 필요**(브라우저마다 다를 수 있음). 기억을 지우면 다시 까만 화면 | 모든 의사가 **관리자 비밀번호**를 알게 됨 → 영상 삭제 가능 | 없음(안내만) |
| **B** | 영상 보기용 계정을 하나 더 만듦 | A와 같음 | 관리자 비밀번호와 **나뉘기만** 할 뿐, 영상 서버의 기본 로그인은 권한 구분이 없어 **여전히 삭제 가능** | 작음 |
| **C** (추천) | **EMR이 대신 보여 줌** — 영상 창이 영상 서버가 아니라 EMR을 거쳐 열림, EMR이 서버 안에서만 영상 서버 비밀번호를 씀 | **EMR 로그인만 하면 바로 보임**. 로그인 창·까만 화면 없음 | 영상 서버 비밀번호가 **직원에게 가지 않음**, 진료 권한 있는 직원만 볼 수 있음(S2와 같게). 진료실 PC는 9080만 열려 있으면 됨(9090을 병원 네트워크에 안 열어도 됨) | 중간 — EMR 서버 설정(공용 파일, 총괄과)·뷰어 경로 확인 필요, 격리 스택으로 시험 가능 |
| D | 영상 창을 없애고 늘 새 탭으로 | 새 탭에서 로그인(A와 같음), 판독 칸과 영상이 다른 창 | A와 같음 | 작음(진료 화면 변경) |

**추천**: **C**. 11월 새 PC 설치 전에 끝내는 것을 목표로. 그때까지 현장에 영상 장비가 붙지 않으면 A 안내도 필요 없음. 장비가 먼저 붙으면 그동안은 A로 안내.

- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 현장 브라우저(Chrome/Edge)에서 영상 창 안의 모습, A에서 한 번 로그인한 뒤 영상 창이 보이는지.

## 2026-09-29 — PACS 격리 스택으로 진짜 Orthanc 시험 · P-4 1·2단계 · P-8 확인

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋. **PACS 저장소** `session/pacs` **`94935f0`** (브리지 P-4 + `docker-compose.session.yml`) — `main`(`6c135aa`) 위 한 개
- **한 일**:
  - **PACS 격리 스택**(결정 24): `docker-compose.session.yml` — `-p bethesda-s-pacs-pacs`, 포트 **127.0.0.1:9198(웹)·11298(DICOM)**만, 영상·워크리스트는 이름 붙인 볼륨, 브리지 이미지 `bethesda-s-pacs-bridge:dev`, 브리지는 EMR 격리 스택 네트워크의 `backend`를 읽음, 시험용 값은 `--env-file`. `docker compose config`로 확인: 9090·4242·`./storage` 없음. 띄운 동안 실행 중 `bethesda-pacs`·`bethesda-worklist-bridge`는 그대로(같은 이미지·가동 시간).
  - **P-7·P-3 끝까지(진짜 Orthanc 26.6.1)**: 오더 → `.wl` → 영상 업로드(REST, 장비 대신) → T1 3장 `match`, T2 `mismatch`(다른 환자번호) → 둘 다 `completed`, 다음 바퀴 `.wl` 삭제. 전송 뒤 1~2분.
  - **P-4 1·2단계**: 브리지가 UID로 못 찾으면 AccessionNumber로(정확히 하나일 때만) → `found_by`·`accession_no`·`image_study_uid`를 보냄. EMR `/study-arrived`가 accession 일치를 다시 확인(아니면 409), **새 마이그레이션 `802_pacs_image_study_uid.sql`**(칸 추가만)의 `image_study_uid`에 저장, `viewer-url`은 그 UID로 엶(`images.linked_by`), 판독 목록에 노란 한 줄(`px_linkedByAccession`). 시험: UID를 새로 만든 T3 → accession으로 연결·`match`·뷰어 주소 실제 UID. 같은 accession 둘(T5) → 연결 안 함(로그 「more than one study carries accession」 — 바퀴마다 한 줄, 조금 시끄러움). 틀린 accession·실제 UID 없는 보고 → 409.
  - **P-8 확인**: Orthanc가 자기에게 MWL C-FIND(장비처럼) — 거름 없음·`ANY`·`*` → 전부, **`XRAY01`(장비 자기 AE) → 0건**. `.wl`의 칸을 비우거나 빼도 0건 → 브리지로 못 고침. 선택지는 위키 7절 P-8(추천: 장비에서 AE 필터 끄기, 안 되는 장비만 장비별 `.wl`). 장비 설치 날 결정.
  - **R-1 (영상 창 안)**: 진료 → 영상 창(iframe)이 Stone 뷰어를 부르면 **401**, 이 브라우저(앱 안 Chromium)에서는 **로그인 창도 없이 까만 화면**. 덩어리 4(P-9 선택지)에 반영.
- **바꾼 파일**: EMR `backend/src/routes/pacs.routes.js`, **새** `backend/sql/802_pacs_image_study_uid.sql`, `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(3.3, 4절 API·DB, 7절 P-4·P-7·P-8·격리 스택, 8절), `wiki/handoff/pacs.md` · PACS `bridge/bridge.py`, **새** `docker-compose.session.yml`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이 키 1개
- **DB 마이그레이션**: `802_pacs_image_study_uid.sql` — `worklist_log.image_study_uid VARCHAR(128)` 추가만(총괄이 다음 번호로 다시 매김)
- **번역 키**: `px_linkedByAccession` (ko·en·fr)
- **확인한 방법**: `node --check`, `py_compile`, 프론트 빌드, 격리 스택(EMR 9188 + PACS 9198/11298) — 위 시험, 판독 목록 프랑스어 화면(T3 노란 줄·T2 빨간 경고·T5 대기).
- **확인 못 한 것**: 실제 장비의 C-STORE·MWL(장비 설치 날 D-1~D-7).
- **총괄 확인 요청**: PACS `94935f0`은 브리지를 다시 빌드해야 반영됨(`docker compose up -d --build`, 실행 중 PACS에서 — 총괄). EMR 쪽이 먼저 합쳐져도 옛 브리지는 `found_by`를 안 보내므로 지금과 같음.
- **격리 스택**: 아직 띄워 둠(덩어리 5 G-1~G-4 시험에 씀) — 끝나면 내림.

## 2026-09-29 — 직원용 안내: 결과 있는 영상 검사 「취소됨」 (결정 38-③)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` 2절 — **2.1 ④** 결과 있는 영상 검사를 지우려 할 때의 순서(빨간 ✕ → 묻는 창 → Motif → OK → 회색 Annulé, 수납했으면 환불, 되돌리기 없음). 문구는 진료 세션의 실제 키(`cs_cancelHint`·`cs_cancelPrompt`·`cs_imagingNoCancel`, fr·ko)에서 옮김. **2.3** 로그인 창은 「물을 수 있음 — 확인 필요」에서 「묻습니다(확인됨)」로. **2.4** 취소된 영상 검사가 보이는 모습(흐림·줄긋기·Annulé·이유, 영상·경고·판독은 그대로, 판독 새로 저장 안 됨). **2.6 ⑤** 다른 환자의 영상이면 → 취소로 표시(이유에 적기) → 필요하면 새 검사로 다시 촬영(의사 판단) → 관리자에게.
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 진료 세션이 영상 취소를 켠 뒤의 실제 화면(켜는 중). 켜진 뒤 한 번 눌러 보고 다르면 고치겠음. `cs_cancelPrompt`는 지금 「검사 목록(la liste du laboratoire)」이라고 쓰여 있어 영상 오더에도 같은 문구가 뜨면 조금 어색함 — 진료 세션에 참고로.
- **다른 세션에 부탁**: 진료 — (참고) 영상 오더를 취소할 때 묻는 창 문구가 「검사 목록」 대신 영상에 맞게 나오면 좋겠음.

## 2026-09-29 — 재부팅 뒤 위키 정리 (P-1 끝) · 8090 설정의 출처

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `2a76b5f`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` — 2.4의 과도기 임시 안내 삭제, **P-1 ✅**(총괄 결과 요약), P-7에 진짜 Orthanc 응답 확인(R-5)과 과도기 끝, P-9에 R-1 결과(로그인 창), server-status 줄 갱신(R-3 안 봄), **P-25 새로**(옛 8090 설정). 인계 노트 절차서 머리에 「끝남」과 R-1~R-5 결과.
- **8090은 어디서 왔나** (총괄 질문): **코드·시드·마이그레이션이 넣은 값이 아님.** `pacs_config.pacs_viewer_url`·`emr_base_url`의 기본값은 처음부터 빈 값(`001_schema.sql`, `pacs.routes.js` `ensureConfig`, 첫 커밋 `e553fef`부터). 6~7월 설치 당시 **안내가 8090·8080**이었음 — PACS `README.md`(「Set PACS web / viewer URL to `http://<this-host-ip>:8090`」, 첫 커밋 `343e4e5`~`4f5320e` 전), `start.bat`(`18485a8`), EMR 설정 화면 예시 `NAS_IP:8090`(P-17로 고침), EMR 자체는 `f2ab532`(2026-07-23) 전까지 8080. 사람이 안내대로 넣은 값이 7월 23일 포트 이전 때 **바꿔 주는 장치 없이 그대로 남음**. 같은 시기에 설치한 곳은 모두 같을 수 있음. 막는 후보 두 가지를 P-25에 적음(상태 화면 경고 / 옛 값일 때만 바꾸는 마이그레이션 — 후자는 데이터 변경이라 결정 필요).
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음

## 2026-09-29 — 총괄 확인: P-1 조치 끝 (재부팅 뒤)

- **상태**: 끝. 실장님이 netsh 두 줄 실행 + 재부팅, 총괄이 절차서 ①~⑤를 그대로 진행.
- ① 동적 포트 범위 ipv4·ipv6 모두 시작 49152 · 16384. 제외 구간에 4242·9080·9090 없음(남은 구간: 5357, 7895, 7936, 39091, 39721, 50000–50059, 60039–60338). 세 포트 모두 연결됨.
- ② PACS 저장소 `main` `c9dc0b4` → **`6c135aa`**(ff). ③ 토큰 재발급 `OK`(값은 어디에도 찍지 않음). ④ `docker compose up -d --build` — 브리지·Orthanc 모두 다시 만들어짐, 둘 다 healthy.
- ⑤-2 브리지 로그: `synced` 15초마다, 나쁜 문구 5종 모두 0. ⑤-3 heartbeat 10초 전 · ok · 오류 칸 비어 있음(EMR 재배포 뒤에도 6초 전 · ok). ⑤-4 새 브리지로 바뀐 뒤 EMR 로그의 `token=` 0줄(바뀌기 전 3분 창에는 옛 브리지의 6줄이 있었음 — 옛 토큰, 이제 무효).
- **R-5**(⑤-5): `1 upload: 200` / `2 has IsStable: True | IsStable now: False` / `3 PatientID: PX-TEST-0000` / `5 IsStable after 75 s: True` / `6 CountInstances: 1` / `7 delete: 200` — 기대와 모두 같음.
- **R-4**: `GET /api/pacs/test` → ok, host `host.docker.internal`, port 4242, 「TCP connection succeeded」.
- **R-1 (일부)**: `http://localhost:9090/`와 `/stone-webviewer/index.html` 모두 **401** → 브라우저에서 로그인 창이 뜸(①). 영상 창 안에서 어떻게 보이는지는 화면으로 보지 않았음.
- **찾은 것**: 실행 중 EMR의 `pacs_config.pacs_viewer_url`이 **`http://localhost:8090`**, `emr_base_url`이 `http://localhost:8080` — 9090·9080이 아님. 영상 창이 열리지 않는 주소. 설정 → 오더 연동에서 고쳐야 함(실장님께 안내).
- **R-3**(server-status 창)은 보지 않았음.
- ⑤-7 `.env` 백업(`pacs-env-before-p1`) 삭제함. 되돌리기용 이미지 이름표 `before-p1`은 남겨 둠.
- 실장님 결정: 시험용 영상 서버(격리 스택) **허락**(웹 9198 · 영상 11298, 이 PC 안에서만, 실행 중 영상 서버와 storage는 건드리지 않음, 다 쓰면 내림).

## 2026-09-29 — P-13 조사: 새 PC 설치(결정 35)에서 PACS에 일어나는 일 · 고칠 것 목록

- **상태**: 보류 — 읽고 적기만 함(아무것도 실행하지 않음, 코드 변경 없음). 고칠 것은 총괄과 같이 정함
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `132daea`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **읽은 것**: EMR `offline/pack.ps1`·`pack.sh`·`install-offline.ps1`·`install-offline.sh`·`OFFLINE-INSTALL.md`·`DEPLOYMENT.md` 5b(복원)·`backend/src/services/backup.js`(pg_dump), PACS `setup.ps1`·`setup.sh`·`start.bat`·`docker-compose.yml`.
- **결과**: `modules/pacs.md` **6.1 「새 PC에 설치할 때 (PACS)」** — ① 키트 만들기 ② 설치·토큰이 생기는 때와 짝 맞추는 길 ③ 현지 PC 확인(동적 포트 범위·방화벽·고정 IP·영상 백업) ④ 백업 복원 뒤 어긋나는 것 표. 7절에 **P-24 [보통] 영상 백업 없음**.

### 질문별 답 (요약)

1. **토큰·비밀번호가 생기는 때** — 현지 PC에서 `install-offline.ps1`이 부르는 PACS `setup.ps1 -Offline`이 `.env`가 없을 때 `ORTHANC_PASSWORD`(32자)·`BRIDGE_TOKEN`(48자)을 새로 만들고 **토큰을 화면에 찍음**. EMR 쪽은 사람이 **설정 → Flux d'ordres**에 붙여넣는 것이 유일한 길. 키트에는 `.env`가 안 들어가므로 이 PC 값은 따라가지 않음. 포트 9090·4242는 compose 고정. **동적 포트 범위는 현지 PC에서도 반드시 확인**(이 PC가 왜 1024부터였는지 모름 — Docker·WSL 설치 + 재부팅 뒤 `netsh`). **방화벽은 스크립트가 안 건드림** — 다른 PC에서 `Test-NetConnection`으로 9080·9090·4242 확인.
2. **백업 복원 뒤** — `pacs_config`(이 PC 토큰·주소)가 덮여 **브리지 401** → 복원 **뒤에** 짝 맞추기(`rotate-token.ps1`가 그대로 쓰임) + 뷰어 주소·Host를 새 LAN IP로. `worklist_log`의 지난 날 `scheduled` 시험 오더는 피드가 오늘만 주므로 장비에 안 감(복원한 날 만든 것만 주의). 「영상 도착」 기록이 있는데 새 Orthanc에 영상이 없으면 목록은 「N장 도착」·영상 창은 빈 화면 → `storage` 폴더를 옮기거나(이 PC엔 실제 영상이 없을 것) 시험 기록 정리(실장님 결정).
3. **새 브리지가 키트에 들어가려면** — `pack`은 git이 아니라 **`C:\Bethesda-PACS-main` 폴더의 지금 파일**을 복사·빌드함 → **절차서 ②로 PACS `main`에 `6c135aa`를 합친 뒤**, 그 폴더가 `main`이고 `git status`가 빈 상태에서 pack. **MANIFEST에는 EMR 버전만 찍히고 PACS 버전은 안 찍힘.**

### 고칠 것 목록 (고치지 않음 — `offline/`은 총괄 파일, PACS 파일은 합의 뒤)

| # | 파일 (주인) | 무엇 | 왜 |
|---|---|---|---|
| F-1 | `offline/pack.ps1`·`pack.sh` (총괄) | PACS 폴더에 `.env`가 없으면 `ORTHANC_PASSWORD`에 임시 값(JWT_SECRET처럼) | **P-13**(`${ORTHANC_PASSWORD:?}`)을 켜면 pack의 `docker compose build`·`config`가 실패함 — F-1과 G-2는 같이 |
| F-2 | `offline/pack.*` (총괄) | MANIFEST에 **PACS 커밋·브랜치**(`git -C <PACS> describe --always --dirty`, `rev-parse --abbrev-ref HEAD`)와 EMR 커밋. `--dirty`면 경고 또는 중단 | 지금은 어떤 브리지가 들어갔는지 키트만 봐서 모름. 합치지 않은 파일이 섞여도 모름 |
| F-3 | `offline/pack.*` (총괄) | 「Nothing here touches the running stack」는 틀림 — `docker compose build`가 **이 PC의 실행용 이미지 이름표**(`bethesda-emr-*:latest`, `bethesda-pacs-worklist-bridge:latest`)를 덮어씀. 다음에 이 PC에서 `up`하면 pack한 코드가 돎 | 격리 스택 이름표 문제(`657ba2c`)와 같은 종류. 적어도 주석·설명서에 「합친 뒤에만」, 가능하면 키트용 이름표로 빌드 후 `docker tag` |
| F-4 | `offline/pack.*` (총괄) | 제외를 `.env`에서 **`.env*`**(그리고 `*.env`)로 | 지금은 이름이 정확히 `.env`인 것만 빠짐 — `.env.bak`, `test.env` 같은 비밀값 사본이 키트에 들어갈 수 있음 |
| F-5 | `offline/install-offline.ps1:117`·`.sh:83` (총괄) | PACS `setup` 실패를 확인하지 않음 → 실패해도 「Installed」 | EMR은 확인하는데 PACS는 안 함 |
| F-6 | `offline/install-offline.*` 마지막 안내, `OFFLINE-INSTALL.md` (총괄) | 「paste the bridge token printed above」 대신 G-1의 자동 짝 맞추기, 뷰어 주소 = **서버 LAN IP**, 동적 포트 확인, 방화벽 확인, 고정 IP, **영상은 EMR 백업에 없음** | 6.1 ②③ |
| G-1 | PACS `setup.ps1`·`setup.sh` (PACS) | EMR DB 컨테이너(`bethesda-emr-db`)가 같은 PC에 있으면 새 토큰을 **stdin으로 `pacs_config`에 직접** 넣고 「짝 맞춤 완료」만 찍기(`rotate-token.ps1`와 같은 방식). EMR이 없을 때만 지금처럼 찍기 | 토큰이 화면·클립보드·설치 창 기록에 남지 않게, 붙여넣기 실수 없음 |
| G-2 | PACS `docker-compose.yml` (PACS) | **P-13**: `${ORTHANC_PASSWORD:?…}` | F-1 뒤 |
| G-3 | PACS `setup.ps1` (PACS) | 시작 전 동적 포트 범위·예약 구간을 읽기만 해서 9090·4242가 걸리면 경고 | P-1이 새 PC에서 되풀이되지 않게 — 고치는 명령(관리자)은 안내만 |
| G-4 | PACS `start.bat` (PACS) | 끝 안내 「viewer URL http://localhost:9090」 → 「이 PC의 LAN IP:9090」 | 다른 PC 브라우저 기준 |
| G-5 | (결정) | **P-24 영상 백업** — `storage`를 두 번째 디스크로 복사하는 방식·주기 | 디스크 고장 시 영상 전부 잃음 |

### 출발 전 확인 목록에 넣을 줄 (제안)

- [ ] PACS `main`에 `session/pacs`(`6c135aa` 이상) 합쳤고 `C:\Bethesda-PACS-main`이 `main`·`git status` 빈 상태에서 pack 함 — MANIFEST의 PACS 커밋 확인(F-2 뒤)
- [ ] 키트 `Bethesda-PACS\`에 `.env`·`*.env*`·`storage\`가 없음
- [ ] (영상을 옮긴다면) 이 PC Orthanc를 멈추고 `storage` 폴더를 따로 복사 — 장비가 붙은 적이 없으면 필요 없음
- [ ] 현지: Docker·WSL 설치 + 재부팅 뒤 `netsh int ipv4 show dynamicport tcp`가 49152/16384, `excludedportrange`에 9080·9090·4242 없음
- [ ] 현지: 설치 → **EMR 백업 복원 → 그 다음에** 브리지 짝 맞추기(`rotate-token.ps1` 또는 설정 화면), 뷰어 주소·Host를 서버 LAN IP로, `docker compose up -d --force-recreate worklist-bridge`
- [ ] 현지: 다른 PC에서 `Test-NetConnection <서버IP> -Port 9080/9090/4242` 모두 True, 서버 IP 고정(DHCP 예약)
- [ ] 현지: 상태 화면 브리지 초록, 복원한 날의 `scheduled` 시험 오더 0건
- [ ] 영상 백업 방법 정함(P-24)

- **바꾼 파일**: `wiki/modules/pacs.md`(6.1 새로, 7절 P-24, 8절), `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 아무것도 실행하지 않음(지시대로). Docker Desktop이 방화벽 허용을 묻는지, 새 PC 동적 포트 범위 — 현지 확인.

## 2026-09-29 — 위키 2.2: 찍기 직전마다 워크리스트 새로 불러오기 (결정 38-③)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `a264315`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: 실장님 결정 38-③(영상 오더 취소는 검사와 같은 방식, 재부팅 뒤 켬)에 맞춰 `modules/pacs.md` 2.2 ①에 방사선사 안내 추가 — 「환자를 찍기 직전마다 목록을 새로 불러오세요」와 이유(진료실에서 지우거나 취소한 검사가 장비 화면에 남아 있을 수 있고, 그걸로 찍으면 영상이 오더에 안 붙거나 취소된 오더에 붙음). 8절 기록.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **남은 일**: 재부팅 뒤 영상 취소를 켤 때 2.4(취소된 영상 검사가 보이는 모습)·2.6 ⑤(다른 환자 영상 → 취소로 표시 → 필요하면 다시 오더)를 고침. 장비가 받아 둔 목록을 얼마나 보여 주는지는 D-7.

## 2026-09-29 — P-18: UID 없는 영상 오더에서 다른 환자 목록이 열리지 않게

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `ff53907`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `GET /api/pacs/viewer-url` — 보일 스터디가 없으면(워크리스트로 안 간 영상 오더, 또는 아무것도 안 줌) `url`을 **빈 값**으로, **`no_study: true`** 추가. 전에는 뷰어 주소(`base`)를 그대로 돌려줘서 영상 창에 PACS 첫 화면(모든 환자 목록)이 열렸음. `has_viewer`는 그대로 「뷰어 주소가 설정됐는지」만 뜻함. 안내 문구 키 **`px_noStudy`**.
  - 판독 목록(`RadiologyReadings`)의 「영상보기」는 원래 `study_instance_uid`가 있을 때만 보임 — 확인함, 바꾸지 않음.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `wiki/modules/pacs.md`(4절 viewer-url, 7절 P-18, 8절), `wiki/handoff/pacs.md`(이 항목, 절차서 R-2 정리)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에 키 1개
- **DB 마이그레이션**: 없음
- **번역 키**: **`px_noStudy`** — ko 「이 영상 검사는 촬영 목록(워크리스트)으로 보내지 않아 연결된 영상이 없습니다. 판독만 쓸 수 있습니다.」 / en 「This imaging order was not sent to the device worklist, so no images are linked to it. You can still write the reading.」 / fr 「Cette demande d'imagerie n'a pas été envoyée à la liste de travail des appareils : aucune image n'y est liée. Le compte-rendu peut quand même être saisi.」
- **확인한 방법**: `node --check`, 프론트 빌드 통과. 격리 스택 9188(의사 계정): 워크리스트 없는 영상 오더 → `{has_viewer:true, no_study:true, url:""}` · UID 있는 오더 → `no_study:false`, Stone 뷰어 주소 · 아무것도 안 줌 → `no_study:true, url:""` · 뷰어 주소를 비운 설정 → `has_viewer:false, url:""`. 판독 목록(프랑스어)에서 그 오더에는 「Voir image」 없음.
- **확인 못 한 것**: 진료 영상 창의 새 안내(진료 몫). 그 전까지 진료 영상 창은 `url`이 비면 「뷰어 주소가 설정되지 않았습니다」를 보임 — 문구는 틀리지만 다른 환자 목록은 더 이상 안 열림.
- **다른 세션에 부탁**: **진료** — 영상 창에서 `r.no_study`(그리고 `has_viewer`가 참)면 `t.px_noStudy`를 보이기 (총괄 전달함)

## 2026-09-29 — 결정 세션용 의견: 38-③ 「영상 오더도 같은 방식으로 취소」

- **상태**: 보류 — 의견만(코드 변경 없음), 결정 세션이 실장님께 여쭐 것
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `a7b40e8`을 ff로 당긴 뒤). **PACS 저장소** — 없음

**실장님께 드릴 설명 (짧게)**

> 영상 오더를 잘못 냈을 때, 단계별로 이렇게 됩니다.
> - **촬영 전** — 지금처럼 **지웁니다.** 아무것도 남지 않고, 촬영실 장비 목록에서도 15초 안에 빠집니다.
> - **촬영 중** (방사선사가 장비에서 이미 골라 찍고 있지만 영상이 아직 다 안 들어옴) — EMR은 아직 「촬영 전」으로 알아서 **지워질 수 있습니다.** 그러면 찍힌 영상은 PACS에만 남고 어느 오더에도 안 붙습니다. 이 틈(영상 전송 뒤 약 1분)을 줄이려고 영상 취소는 PACS 새 버전을 합친 뒤에 켭니다.
> - **촬영 뒤 / 판독 뒤** — 지울 수 없고 **「취소」로 표시**됩니다. 오더는 회색 「취소됨」과 이유로 남고 **청구에서 빠집니다.** 찍힌 영상과 판독 글은 **그대로 남아 계속 볼 수 있고**, 판독은 더 고칠 수 없습니다. 「촬영했다」는 기록도 남습니다.
> - **장비에 이미 내려간 목록** — EMR에서 지우거나 취소하면 PACS의 목록에서는 15초 안에 빠지지만, 장비가 **이미 받아 둔 목록 화면**에는 방사선사가 목록을 다시 불러올 때까지 남아 있을 수 있습니다(장비마다 다름 — 장비 설치 날 D-7로 확인). 그 상태로 찍으면 영상은 들어오지만 오더에 안 붙거나(지운 경우) 취소된 오더에 붙어 보입니다(취소한 경우).
>
> **추천**: 영상도 검사와 같은 방식으로 취소 표시 — **PACS 새 버전을 합친 뒤부터** 켜기. 방사선사에게는 「촬영 전에 목록을 한 번 새로 불러오기」를 안내.

- **바꾼 파일**: `wiki/handoff/pacs.md`만 (위 설명 + 장비 설치 날 확인 목록에 **D-7** 추가) · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **근거**: 앞 항목(2026-09-29 의견 `d1979d7`)과 코드 — 삭제 409 조건(`consult.routes.js`), 피드는 `scheduled`만(`pacs.routes.js`), 도착 보고는 Stable 뒤(`bridge.py`), `cancelWorklistForOrder`는 `completed`를 안 바꿈(`pacs.cancel.js`).
- **확인 못 한 것**: 장비가 받아 둔 목록을 얼마나 오래 보여 주는지(D-7, 실제 장비 필요).

## 2026-09-29 — P-22 판독 날짜 현지로 · 영상 오더 취소 준비(P-23, 켜지 않음)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `6a96193`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**:
  - **P-22**: `RadiologyReadings.jsx`의 `ymd()`를 `LabResults.jsx`와 같은 규칙으로 — 날짜만 있는 값(`visit_date`)은 그대로, 시각이 있는 값(`result_at`, `cancelled_at`)은 브라우저 현지 날짜. 전에는 UTC 문자열을 `T` 앞에서 잘라 현지 00~03시 판독이 전날로 보였음.
  - **P-23 취소 준비** (총괄 결정: 코드는 지금, 영상에 켜는 것은 PACS 저장소 합친 뒤):
    - 새 파일 **`backend/src/routes/pacs.cancel.js`** (PACS 소유): `cancelWorklistForOrder(client, orderItemId)` — 진료 취소 API가 **같은 트랜잭션에서** 부를 함수. `scheduled`·`in_progress` 워크리스트 줄만 `cancelled` + `order_item.worklist_status='cancelled'`, `completed` 줄은 그대로. `ORDER_CANCELLED` 문구 상수도 여기.
    - `GET /pacs/readings/patient/:id`·`GET /pacs/viewer-url`: `order_status`·`cancelled_at`·`cancel_reason`(+ viewer-url은 `cancelled`). 진료 마이그레이션 칸은 **`to_jsonb(oi)->>'cancelled_at'`로 읽어 칸이 없어도 오류 없음** → 진료 마이그레이션보다 먼저 합쳐도 안전.
    - `PUT /pacs/reading/:id`: 취소된 오더면 **409 `Imaging order was cancelled`**. 조건을 UPDATE 안에 넣어 같은 순간의 취소를 덮지 않음.
    - `RadiologyReadings`: 취소된 오더는 흐리게·검사 이름 줄긋기·「취소됨 / Annulé」 배지(이유는 마우스 올리면), 그 아래 「취소됨 · 날짜 — 이유 : …」 한 줄. 「영상 대기 중」은 숨김(아무도 안 찍음). 영상 도착 표시·환자번호 경고·판독·「영상보기」는 그대로(기록).
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, **새** `backend/src/routes/pacs.cancel.js`, `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(4절 API·취소 정보·`cancelWorklistForOrder`, 7절 P-22·P-23, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 4개
- **DB 마이그레이션**: 없음 (취소 칸은 진료 세션 몫)
- **번역 키**: `px_orderCancelled`(취소됨/Cancelled/Annulé), `px_cancelReason`(이유/Reason/Motif), `px_cancelledViewer`(영상 창 머리 안내 — 진료 세션이 쓸 것), `px_readingOnCancelled`(판독 저장 409 안내 — 진료 세션이 쓸 것)
- **확인한 방법**:
  - `node --check` 두 파일, 프론트 빌드 통과
  - 격리 스택 9188: `cancelWorklistForOrder`를 API 컨테이너 안에서 트랜잭션으로 호출 — `scheduled` 오더 → `{worklist_cancelled:1}`, 워크리스트·오더 둘 다 `cancelled`. `completed` 오더 → `{worklist_cancelled:0}`, 그대로. 이어서 새 브리지 한 바퀴 → 취소된 줄의 `.wl` 삭제(2개 → 1개).
  - `order_item.status='cancelled'`로 흉내(진료 API 대신 SQL): **취소 칸이 없는 지금 develop 구조**에서 readings가 `order_status` 주고 `cancelled_at`·`cancel_reason`은 `null`(오류 없음). 격리 DB에만 칸을 임시로 추가해 이유·날짜가 나오는 것 확인 후 칸 삭제.
  - `PUT /reading`: 취소된 오더 409, 살아 있는 오더 200, 취소된 오더의 판독은 그대로.
  - P-22: 판독 시각을 현지 01:30(`2026-09-28T22:30Z`)으로 → 목록에 `2026-09-29`(옛 코드는 28일).
  - 화면: 의사 계정으로 진료 → 판독소견, **한국어·프랑스어** — 취소된 Hand·Chest PA 흐림·줄긋기·배지, Chest PA에 「Annulé · 날짜 — Motif : …」와 빨간 경고·판독 유지, Hand의 「영상 대기 중」 숨김.
- **확인 못 한 것**: 진료 세션의 실제 취소 API와 함께(아직 없음). 영상 창 머리 안내(진료 몫).
- **총괄 확인 요청**:
  - 날짜 규칙이 **브라우저 PC 시간대**를 따릅니다(LabResults와 같음). 격리 시험에서 마다가스카르 18:40 취소가 한국 시간 PC에서는 다음 날로 보였습니다 — 현장 PC(마다가스카르 시간)에서는 맞지만, 실장님 PC(한국 시간)로 볼 때는 자정 근처 날짜가 한국 날짜입니다. 모든 모듈 공통 규칙이라 알려 드림.
  - 진료 몫 전달 부탁: ① 취소 API가 `code_type='imaging'`이면 `require('./pacs.cancel').cancelWorklistForOrder(client, id)`를 같은 트랜잭션에서 — **PACS 저장소 합친 뒤에 켬** ② 영상 창에 `viewer.cancelled`면 `px_cancelledViewer` 한 줄 ③ 판독 저장이 409면 `px_readingOnCancelled` 안내 후 다시 불러오기 ④ 영상 창 판독 날짜(`result_at`)도 P-22와 같은 규칙.
  - 켤 때 PACS가 할 일: 위키 2.4·2.6(직원용) — 「취소된 영상 검사」 보이는 모습과 다른 환자 영상일 때 절차를 「취소로 표시 → 필요하면 다시 오더」로.
- **다른 세션에 부탁**: 진료 — 위 ①~④ (총괄 전달)

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

> ✅ **2026-09-29 재부팅 뒤 총괄이 이 순서대로 마침** — 결과는 맨 위 「총괄 확인: P-1 조치 끝」. 확인 목록 결과: R-1 일부(9090·Stone 뷰어 401 → 로그인 창, 영상 창 안은 안 봄), R-2 고침(P-18), R-3 안 봄, R-4 ok, R-5 일곱 줄 모두 기대와 같음. D-1~D-7은 장비 설치 날.

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
8. PACS 세션에 알림 → 위키 2.4 임시 안내 삭제, ⑤-5·R-1~R-5 결과 기록.
9. **이제 켜도 되는 것** (PACS 저장소가 합쳐져 EMR이 영상 도착을 알게 됐으므로): 영상 오더 취소(결정 38-③) — 진료 세션이 서버의 영상 취소 거절을 풀고 `cancelWorklistForOrder` 호출·영상 창 안내 3가지를 켬, PACS 세션은 위키 2.4·2.6을 고침. ⑤-2·⑤-5가 정상일 때만.
10. 결정 35 참고: 이 PC의 토큰 재발급(③)은 **시험용**입니다 — 현지 PC에서는 설치 때 새로 만들어지고, EMR 백업을 복원한 **뒤에** 다시 짝 맞춤(`modules/pacs.md` 6.1).

#### ⑤+ 「확인 필요」로 남은 것 — 확인 목록

**재부팅 당일 (총괄, 장비 없이 할 수 있음)** — 결과를 PACS 세션에 알려 주면 위키에 적습니다.

| # | 무엇 | 어떻게 | 적을 것 |
|---|---|---|---|
| R-1 | **P-9 뷰어가 로그인을 묻는지** | EMR 설정 **Flux d'ordres → PACS 웹/뷰어 주소**가 `http://localhost:9090`(또는 서버 IP)인지 본 뒤, 진료 화면에서 아무 영상 오더의 **🖼** → 영상 창 왼쪽에 ① 브라우저 로그인 창이 뜨는지 ② 빈/오류 화면인지 ③ Stone 뷰어가 바로 뜨는지. 로그인 창이 뜨면 **값은 넣지 말고** 뜬다는 것만 기록. 같은 브라우저로 `http://localhost:9090` 을 따로 열었을 때도 같은지 | ①②③ 중 무엇, 브라우저 종류 |
| R-2 | ~~P-18 UID 없는 영상 오더~~ | **2026-09-29에 고침 — 확인 불필요** (진료 영상 창이 `no_study` 안내를 보이는지만 한 번 보면 됨) | — |
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
| D-7 | 지운·취소한 오더가 장비에서 언제 사라지나 | 시험 오더를 내고 장비에서 워크리스트를 한 번 불러온 뒤, 진료실에서 그 오더를 지움 → 장비 화면에 그 환자가 **남아 있는지**, 다시 불러오기를 눌러야 사라지는지, 저절로 사라지는지 | 남음/다시 불러오면 사라짐/저절로 사라짐 (38-③ 의견과 관련) |

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
