# 설정 (Settings)

> **담당**: 설정 세션 · 브랜치 `session/settings` · **마지막 갱신**: 2026-09-29 · **상태**: 현황 파악 완료 (코드 수정 전). 7절의 문제 목록은 실장님 결정 대기

## 1. 이 모듈이 하는 일

병원이 EMR을 쓰기 위한 **바탕**을 관리합니다.

- **로그인과 첫 실행** — 처음 설치했을 때 관리자 계정을 만들고, 이후 직원이 로그인합니다.
- **직원과 권한** — 직원 계정을 만들고, 각자 어느 화면(접수·진료·수납·약국·임상병리·통계·설정)에 들어갈 수 있는지 정합니다.
- **기준 자료** — 진료과, 오더 코드(진찰료·검사·영상·처치), 오더 세트(약속처방), 상용구, 병원 정보(편지지 머리글·앱 제목). 약품 탭은 약국 세션, 검사항목 탭은 임상병리 세션, 오더 연동 탭은 PACS 세션이 안을 고칩니다.
- **백업** — 매일 자동으로 DB를 백업하고, 화면에서 「지금 백업」과 내려받기를 합니다. 복원은 화면에 없고 문서(`DEPLOYMENT.md` 5b) 절차로만 합니다.
- **운영 도구** — 서버 PC에 띄워 두는 서버 상태 창(`server-status.bat`), 백업이 실제로 복원되는지 검사하는 `verify-backup.ps1`, 버전 확인(`/api/version`).

## 2. 화면 사용법 (직원용)

> 병원 직원(관리자)이 읽는 부분입니다. 설정 화면의 탭 이름 중 일부(Staff, Drugs, Order Codes, Phrases, Departments, Clinic)는 **언어를 바꿔도 영어로 나옵니다** (7절 참고).

### 2-1. 처음 설치했을 때 — 관리자 계정 만들기

1. 브라우저로 EMR 주소(`http://<서버 주소>:9080`)에 들어가면 「초기 설정 / Configuration initiale」 화면이 나옵니다.
2. 이름, 아이디, 비밀번호(6자 이상), 비밀번호 확인을 넣고 「관리자 계정 만들기 / Créer le compte admin」을 누릅니다.
   - **아이디는 `admin`으로 하기를 권합니다.** 아이디가 `admin`인 계정만 「설치 때 만든 관리자」로 보호됩니다 (3-2절).
3. 바로 설정 화면으로 들어갑니다. 이 화면은 관리자가 하나도 없을 때만 나옵니다.

### 2-2. 직원 추가하기

1. 설정 → **👥 Staff** → 오른쪽 위 **+ Add**
2. Name(이름), Login ID(아이디), Password(비밀번호)를 넣습니다.
   - 비밀번호 칸에 **`1234`가 미리 들어 있습니다.** 그대로 두지 말고 바꾸세요. 비밀번호는 화면에 그대로 보이니 주변을 확인하세요.
3. **Role (label)** 에서 역할을 고릅니다 (Front Desk · Doctor · Pharmacy · Lab · Admin). 고르면 그 역할의 기본 권한 칸이 자동으로 체크됩니다.
4. **권한 (접근 가능 화면)** 에서 이 직원이 들어갈 화면을 체크합니다. **실제로 무엇을 할 수 있는지는 역할이 아니라 이 체크가 정합니다.**
5. 의사라면 **진료과**를 고릅니다.
6. **저장**. 목록에 새 직원이 나오고, 역할 아래에 들어갈 수 있는 화면의 아이콘이 보입니다.

### 2-3. 직원 정보·권한 바꾸기, 비밀번호 초기화

1. 목록에서 그 직원 줄의 **수정** → 바꿀 것을 고치고 **저장**.
2. 비밀번호 칸은 비어 있습니다. **비워 두면 비밀번호는 그대로**, 새로 적으면 그 비밀번호로 바뀝니다.
3. **권한을 바꿔도 그 직원이 이미 로그인해 있으면 바로 적용되지 않습니다.** 로그아웃 후 다시 로그인해야 바뀝니다 (최대 12시간).

### 2-4. 직원 그만둘 때

1. 목록에서 **삭제** → 확인 창 「Delete?」 → 확인.
2. 실제로 지워지지 않고 **inactive(비활성)** 로 바뀌어 로그인이 막힙니다. 기록(진료·수납 등)은 그대로 남습니다.
3. **주의**: 지금은 비활성 직원을 다시 활성으로 되돌리는 버튼이 없습니다 (7절).
4. **주의**: 이미 로그인해 있던 화면은 최대 12시간 계속 쓸 수 있습니다 (7절).

### 2-5. 관리자 계정 보호

- 설치 때 만든 `admin` 계정은 수정 창에서 아이디·역할·권한이 회색으로 잠겨 있고 「🔒 설정 때 만든 관리자 계정입니다…」 안내가 나옵니다. 이름·비밀번호·연락처·진료과는 바꿀 수 있습니다. 삭제(비활성)도 거절됩니다.
- 다른 관리자도, **설정 화면에 들어갈 수 있는 마지막 관리자**라면 역할을 바꾸거나 설정 권한을 빼거나 삭제할 수 없습니다. 먼저 다른 계정에 Admin 역할과 설정 권한을 주세요.

### 2-6. 백업 확인하기

1. 설정 → **💾 백업 / Sauvegarde**
2. 위 칸에 저장 위치, 자동 백업 시각(기본 매일 02:00), 보관 기간(기본 30일)이 나옵니다.
   - 「✓ 자동 백업 켜짐」은 **항상** 초록색입니다. 백업이 실제로 되고 있는지는 아래 목록의 **날짜**를 보세요. 가장 위 줄이 어젯밤 것이어야 합니다.
   - 목록의 시각은 지금 **세계 표준시(UTC)** 로 나옵니다 — 마다가스카르 시각보다 **3시간 이릅니다**. 파일 이름의 시각(`bethesda_2026-09-29_0221`)이 현지 시각입니다 (7절).
3. **💾 지금 백업** — 바로 한 벌 더 만듭니다. 끝나면 아래에 「백업 완료 · 파일이름」이 잠깐 뜹니다.
4. **⬇ 다운로드** — 그 백업 파일을 이 PC로 받습니다. USB에 옮겨 **병원 밖에 한 벌** 보관하세요. 같은 PC의 다른 드라이브는 도난·화재에 대비가 안 됩니다.
5. 복원은 화면에서 하지 않습니다. 관리 담당자가 `DEPLOYMENT.md` 「5b. Restoring a backup」 절차대로 합니다.

### 2-7. 병원 정보 (편지지)

1. 설정 → **🏢 Clinic**
2. 맨 위 미리보기가 인쇄 문서(의뢰서·진단서 등) 머리글 모양입니다.
3. **Application Title** — 화면 맨 위 제목. **Clinic Name** — 한국어(기본)·English·Français 세 가지. 인쇄 언어에 맞는 이름이 문서에 찍힙니다. 주소·전화·이메일은 공통.
4. **저장**.

### 2-8. 진료과 · 오더 코드 · 오더 세트 · 상용구

- **🏥 Departments** — + Add 로 진료과 추가(코드, 이름, English, **Français는 꼭 넣으세요**, 과장 의사). 수정만 있고 삭제는 없습니다.
- **📋 Order Codes** — 진찰료(fee)·검사(lab)·영상(imaging)·처치(procedure) 코드와 가격. 영상 코드는 Modality(US·CR…)를 넣고 워크리스트 생성을 켜야 영상 장비 목록에 올라갑니다. 삭제하면 목록에서 숨겨지고 기존 기록은 남습니다.
- **🧪 약속처방 / Ordonnances types** — + 새 약속처방 → 이름·그룹·진료과 → 오른쪽에서 약(Rx) 또는 검사(Exam)를 검색해 눌러 추가 → 저장. 진료 화면에서 한 번에 불러옵니다.
- **📝 Phrases** — 진료 기록에 쓰는 상용구.

### 2-9. 서버 상태 창 (서버 PC에서)

1. 서버 PC에서 **`server-status.bat`** 을 더블클릭합니다. 창이 뜨고 15초마다 스스로 다시 확인합니다. **닫지 말고 띄워 두세요.**
2. 맨 위 띠가 **초록 「TOUT FONCTIONNE」** 이면 정상, **노랑 「A SURVEILLER」** 는 확인 필요, **빨강 「PROBLEME」** 는 고장입니다.
3. 줄마다: 환자 기록(DB) · 앱 서버 · EMR 화면 · 디스크 공간 · 백업 · 영상(PACS) · 장비 워크리스트. 빨갛거나 노란 줄을 적어서 담당자에게 알리세요.
4. 아래 버튼으로 언어를 바꿉니다 (Français → English → 한국어).

## 3. 기능 상세

### 3-1. 권한 체계

- **역할(role)** 은 표시용 이름표입니다: `frontdesk`·`doctor`·`pharmacy`·`lab`·`admin` (`staff.role` CHECK 제약, `admin.routes.js:8` `ROLES`).
- **권한(permissions)** 이 실제 접근을 정합니다: `staff.permissions TEXT[]`, 값은 `frontend/src/modules.js`의 `MODULES[].perm` 7개 — `registration` `consultation` `payment` `pharmacy` `lab` `stats` `settings`. 서버의 `ALL_PERMS`(`admin.routes.js:12`)와 `auth.routes.js:30`, `middleware/auth.js`의 `defaultPermsForRole`이 **같은 목록을 따로 들고 있어서** 모듈을 추가하면 네 곳을 같이 고쳐야 합니다.
- 역할을 바꾸면 화면이 그 역할의 기본 권한으로 체크를 **덮어씁니다** (`Settings.jsx:659`). 권한이 `NULL`인 옛 계정은 역할 기본값으로 대신합니다(`effectivePerms`). 013 마이그레이션이 옛 계정을 채웠습니다.
- **로그인 토큰(JWT)** 에 권한이 들어갑니다 (`middleware/auth.js` `generateToken`, 유효 12시간). 서버는 요청마다 DB를 다시 보지 않고 **토큰 안의 권한**으로 판단합니다. 그래서 권한 변경·비활성화는 다시 로그인할 때까지 적용되지 않습니다.
- **서버에서 권한을 검사하는 곳** (`permMiddleware`): 설정 API의 쓰기 전부, 백업 실행·다운로드, `pharmacy.routes`(전체), `stats.routes`(전체), `lab.routes`·`orderset.routes`·`pacs.routes` 일부.
  **검사하지 않는 곳**: `patient`·`visit`·`consult`·`billing`·`document` 라우트는 **로그인만** 확인합니다. 화면 메뉴는 권한대로 숨겨지지만, 로그인한 직원이면 누구든 API를 직접 불러 수납 취소 등을 할 수 있습니다 (7절 · 인계 노트 총괄 확인 요청).
- 화면 쪽 접근 제한은 `App.jsx`의 라우트 가드가 `userPerms(user)`로 합니다 (localStorage의 `medconnect_user`).

### 3-2. 관리자 잠금 방지 (1.4.0)

`admin.routes.js`의 `PUT /staff/:id`, `DELETE /staff/:id`:

1. **설치 때 만든 관리자** = `login_id === 'admin'`인 계정 (`BOOTSTRAP_ADMIN_LOGIN`, `admin.routes.js:20`). 저장할 때 아이디·역할(`admin`)·권한(7개 전부)·상태(`active`)를 서버가 **강제로 되돌립니다**. 요청에 뭐가 들어오든 무시합니다. 삭제(비활성화)는 400으로 거절.
   - 화면에서도 같은 조건(`Settings.jsx:224` `lockedAdmin`)으로 칸을 잠급니다. 화면 잠금은 편의일 뿐이고 보호는 서버가 합니다.
2. **다른 계정**: 역할을 admin이 아닌 것으로, 또는 `settings` 권한을 빼거나, 상태를 `inactive`로 저장하려 할 때 `otherSettingsAdminExists(id)` — 「이 계정 말고 `status='active' AND role='admin' AND 'settings' = ANY(permissions)`인 계정이 있는가」— 가 거짓이면 400으로 거절. 삭제도 같은 검사.
3. **왜 아이디로 판별하나**: 1.4.0이 그렇게 만들었습니다. 그런데 첫 실행 화면(`Login.jsx`)은 아이디를 **자유롭게** 정하게 합니다. 설치 때 `admin`이 아닌 아이디를 골랐다면 1번 보호는 적용되지 않고 2번(마지막 관리자 검사)만 적용됩니다. 반대로 나중에 누군가 `admin`이라는 아이디로 일반 직원을 만들면, 그 직원은 저장할 때마다 관리자·전체 권한으로 바뀝니다 (7절).
4. **첫 실행 화면이 다시 열리는 조건**: `auth.routes.js` `noAdminExists()` — `role='admin' AND status='active'`인 계정이 0개일 때. 이때는 **로그인 없이** 누구나 새 관리자를 만들 수 있습니다. 모든 관리자가 비활성이 되면 이것이 복구 경로이자 구멍입니다. 2번 검사가 API로는 그 상태를 막습니다.

### 3-3. 로그인 · 비밀번호

- 비밀번호는 DB의 pgcrypto로 해시합니다: 저장 `crypt($pw, gen_salt('bf'))`, 확인 `password_hash = crypt($pw, password_hash)` (`auth.routes.js:67`). bcrypt(`$2a$`), `gen_salt('bf')` 기본 반복 인자 6. `bcryptjs` 패키지는 import만 되고 쓰이지 않습니다.
- 첫 관리자는 6자 이상을 요구하지만(`auth.routes.js:29`), 설정 화면에서 만드는 직원 비밀번호는 **길이 제한이 없습니다**.
- 로그인 실패 횟수 제한은 없습니다.
- 로그인 순서: 아이디 조회 → 비활성이면 「Account is inactive」 → 비밀번호 확인. 비밀번호를 몰라도 그 아이디가 있고 비활성인지 알 수 있습니다.
- 토큰은 브라우저 `localStorage`(`medconnect_token`)에 저장. 서버가 401을 주면 `api/client.js`가 지우고 로그인 화면으로 보냅니다.
- `JWT_SECRET`이 없으면 백엔드가 시작을 거부합니다 (`middleware/auth.js`, `docker-compose.yml`의 `:?`). 공개된 기본값으로 토큰을 위조할 수 있기 때문입니다. `setup.ps1`/`setup.sh`가 무작위 값을 `.env`에 만듭니다.
- 로그인 후 이동: `Login.jsx`의 `ROLE_ROUTES`로 **역할** 기준 화면으로 보내고, 권한이 없으면 `App.jsx` 가드가 `homePath()`로 다시 보냅니다.

### 3-4. 백업 흐름 (`backend/src/services/backup.js`)

- **저장 위치**: 컨테이너 안 `/backups`. `docker-compose.yml`이 `${BACKUP_PATH:-./backups}`를 여기에 붙입니다. 그래서 백업은 **항상 켜져 있습니다** (`cfg().enabled = true`). `BACKUP_PATH`는 「다른 드라이브에 저장」일 때만 씁니다.
- **파일**: `bethesda_YYYY-MM-DD_HHMM.sql.gz` (백엔드 컨테이너 현지 시각, `TZ`). 옛 이름 `medconnect_*.sql.gz`도 목록에 포함.
- **만드는 명령**: `set -o pipefail; pg_dump … --no-owner --clean --if-exists | gzip > 파일 && gzip -t 파일`. 종료 코드 0이고 크기가 0보다 커야 성공. 실패하면 **파일을 지웁니다** — 반쪽 파일이 좋은 백업처럼 남지 않게 (1.3.3). `pg_dump`는 백엔드 이미지의 `postgresql16-client`.
- **언제**: `startScheduler()`가 부팅 2분 뒤 한 번, 이후 1분마다 `tick()`. 「가장 최근 파일이 가장 최근 예정 시각(`BACKUP_TIME`)보다 오래됐나」로 판단합니다. 그래서 02:00에 전원이 꺼져 있었어도 켜진 뒤 한 번 백업하고, 일주일 꺼져 있었어도 한 번만 합니다. 실패하면 30분 뒤 다시 시도(`RETRY_MINUTES`).
- **정리**: 성공한 뒤에만 `prune()` — 파일 수정 시각이 `BACKUP_RETENTION_DAYS`일보다 오래된 파일을 **개수와 상관없이** 지웁니다.
- **실패 알림**: 백엔드 로그(`[backup] FAILED …`)에만 남습니다. 화면의 백업 탭에는 실패가 나오지 않습니다. `/api/system/status`와 서버 상태 창이 36시간 넘은 백업을 「확인 필요」로 표시합니다.
- **내려받기**: `GET /api/backup/download/:name` — 이름을 `^[A-Za-z0-9_.-]+\.sql\.gz$`로 검사하고 `/backups` 밖을 막습니다 (`resolveBackup`). 화면은 `fetch`로 받아 blob으로 저장합니다 (파일 전체가 브라우저 메모리에 올라감).
- **복원**: API·화면 없음. `DEPLOYMENT.md` 5b의 명령 — `gunzip -t` 먼저, `set -o pipefail`, `psql -v ON_ERROR_STOP=1 --single-transaction`, 컨테이너 **안에서** 풀기 (PowerShell 파이프를 거치면 프랑스어·말라가시어 악센트가 깨짐). 1.3.2에서 「반쯤 복원되던 것」을 고친 결과입니다.
- **업데이트 전 백업**: `update.ps1`/`update.sh`가 `_pre-update-backups/preupdate_*.sql.gz`로 따로 받습니다 (같은 pipefail + `gzip -t` 방식). 이 파일은 백업 목록·보관 정리 대상이 아닙니다.

### 3-5. 백업 검증 (`verify-backup.ps1`, Linux는 `verify-backup.sh`)

1. 파일을 지정하지 않으면 **스크립트 옆 `backups\bethesda_*.sql.gz`** 중 이름순 마지막 것.
2. 임시 DB `bethesda_verify_tmp`를 만들고, 파일을 DB 컨테이너 안에 복사해 `gunzip -t` → 실제 복원과 **같은 명령**으로 복원.
3. 복원된 DB만으로: 테이블·행 수, 스키마 모양(인덱스·제약·함수 수), 「시퀀스가 자기 테이블의 최대 id보다 뒤처졌나」.
4. 가장 새 백업이면 운영 DB와 비교: 스키마, 테이블별 행 수, 시퀀스 값, 테이블별 내용 체크섬. 체크섬은 `service_heartbeat`·`document_log`·`worklist_log` 차이만 허용.
5. `finally`에서 임시 DB 삭제. 운영 DB에는 쓰지 않습니다.

### 3-6. 서버 상태 — 두 가지

| | 서버 상태 창 `server-status.ps1` | API `GET /api/system/status` |
|---|---|---|
| 어디서 | 서버 PC의 Windows 창 (또는 `-Console` 한 번 출력, 종료 코드 0/1/2) | 백엔드. 로그인한 누구나 |
| 어떻게 | **EMR을 거치지 않고** Docker·디스크·파일을 직접 봄. EMR이 죽어도 답하게 하려고 | 백엔드 안에서 DB·파일 확인 |
| DB·서버·화면 | 컨테이너 `bethesda-emr-db/-api/-web`의 상태와 Docker healthcheck | DB에 `SELECT 1` |
| 디스크 | 백업 폴더가 있는 드라이브의 남은 공간 (20GB 미만 노랑, 5GB 미만 빨강) | `/backups`의 `statfs` (같은 기준) |
| 백업 | 백업 폴더(= `docker inspect`로 찾은 `/backups` 마운트 원본)의 가장 새 `*.sql.gz`가 36시간 넘으면 노랑 | 같은 기준 |
| PACS | 컨테이너 `bethesda-pacs` (없으면 「미설치」) | `pacs_config.worklist_scp_host`로 TCP 연결 |
| 워크리스트 | `bethesda-worklist-bridge` 컨테이너 + 그 폴더의 `worklists\.heartbeat` 파일이 60초 넘게 안 바뀌면 빨강 | `service_heartbeat` 테이블(018)의 `worklist_bridge` 행 |
| 화면 연결 | — | **아직 EMR 화면 어디에서도 부르지 않음**. 돌려주는 `status.*` 번역 키도 i18n에 없음 |

- 2026-09-29, 이 PC의 실행 중 EMR에 대해 `server-status.ps1 -Console -Lang ko`를 **읽기만** 해서 돌려 봄: 7줄 모두 정상, 종료 코드 0. `/backups` 마운트 원본이 Windows 경로(`C:\Bethesda-EMR-main\backups`)로 잡히는 것 확인.
- 디스크 검사는 **백업 드라이브**를 봅니다. `BACKUP_PATH`를 D:로 옮기면 DB가 있는 C:(Docker 디스크)는 보지 않습니다.
- 창은 15초마다 `docker` 명령 약 10개를 화면 스레드에서 차례로 돌립니다. 그동안 창이 잠깐 멈출 수 있습니다 (확인 필요).

### 3-7. 버전 확인 (`services/version.js`)

- 현재 버전은 `backend/package.json`, 최신은 GitHub `UPDATE_REPO`의 latest release. 6시간 캐시, 5초 타임아웃, 인터넷이 없으면 마지막 결과나 오류를 돌려줌. `?force=1`로 즉시 다시 확인.
- 로그인만 확인합니다. 업데이트 알림은 `TopBar.jsx`가 `settings` 권한이 있을 때만 보여줍니다. (CHANGELOG 1.3.3은 「settings 권한으로 막혀 있다」고 썼지만 코드는 로그인만 봅니다.)

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Settings.jsx` — 틀과 탭: Staff · Drugs(약국) · Order Codes · Phrases · Departments · 약속처방 · 검사항목(임상병리) · 오더 연동(PACS) · 백업 · Clinic
- `frontend/src/pages/Login.jsx` — 로그인, 첫 실행 관리자 만들기

### 서버

| 경로 | 권한 | 하는 일 |
|---|---|---|
| `GET /api/auth/setup-status` | 없음 | `{needsSetup}` — 활성 관리자가 없으면 true |
| `POST /api/auth/setup` | 없음 (관리자 없을 때만) | 첫 관리자 생성, 토큰 반환 |
| `POST /api/auth/login` | 없음 | `{token, user}` |
| `GET /api/auth/me` | 로그인 | 내 정보 (상태는 확인 안 함) |
| `GET /api/admin/drugs` · `order-codes` · `departments` · `phrases` · `clinic` | 로그인 | 목록 (다른 화면도 씀) |
| `GET /api/admin/doctors` | 로그인 | 활성 의사 목록 (접수용, 비밀번호 해시 없음) |
| `GET /api/admin/staff` | settings | 전체 직원 (`password_hash` 제거) |
| `POST/PUT /api/admin/staff[/:id]` · `DELETE /api/admin/staff/:id`(=비활성) | settings | 3-2절 보호 규칙 |
| `POST/PUT/DELETE /api/admin/drugs` · `order-codes` · `phrases`, `POST/PUT departments`, `PUT clinic` | settings | 삭제는 모두 `is_active=false` |
| `GET /api/backup/status` | 로그인 | 설정·목록 (호스트 경로 포함) |
| `POST /api/backup/run` | settings | 지금 백업 |
| `GET /api/backup/download/:name` | settings | 파일 내려받기 |
| `GET /api/system/status` | 로그인 | 3-6절 |
| `GET /api/version[?force=1]` | 로그인 | 3-7절 |
| `GET /api/health` (`index.js`, 총괄) | 없음 | 버전·시각. Docker healthcheck가 씀 |

- 서비스: `backend/src/services/backup.js` · `version.js`
- 운영 스크립트: `server-status.ps1` · `server-status.bat` · `verify-backup.ps1` (· `verify-backup.sh`)

### 공용 부품

- 없음. (`modules.js`·`api/client.js`·`middleware/auth.js`·`TopBar.jsx`는 총괄 소유로, 이 모듈이 기대고 있음)

### DB 테이블

| 테이블 | 이 모듈이 쓰는 것 | 마이그레이션 |
|---|---|---|
| `staff` | 계정. `login_id` UNIQUE, `password_hash`, `role` CHECK, `permissions TEXT[]`, `department_id`, `status` CHECK(`active`/`inactive`), `last_login` | 001, 013 |
| `department` | `code` UNIQUE, 이름 3개 국어, `head_doctor_id` → staff | 001, 002(기본 9개 과) |
| `clinic` | 한 줄(id=1). 이름 3개 국어, 주소·전화·이메일·진료시간, `app_title` | 001, 002, 011 |
| `order_code` | `code_type` CHECK(fee/lab/imaging/procedure), `price`/`price_clinic`, PACS 칸 | 001, 009 |
| `phrase_dictionary` | 상용구 3개 국어 | 001 |
| `service_heartbeat` | 브리지 생존 신호 (PACS 브리지가 씀, 상태 API가 읽음) | 018 |
| `schema_migrations` | 마이그레이션 적용 기록 (`config/migrate.js`, 총괄) | — |

## 5. 다른 모듈과의 연결

- **모두**: 로그인·토큰·권한(`modules.js`)이 모든 화면의 문입니다. 상단바(`TopBar.jsx`)가 `GET /admin/clinic`의 `app_title`을 제목으로, `/api/version`으로 업데이트 알림을 보여줍니다.
- **접수**: `GET /admin/departments`, `GET /admin/doctors` (`Registration.jsx`)
- **진료**: `GET /admin/drugs` · `order-codes` · `phrases` (`Consultation.jsx`), 약속처방(`/api/order-sets`, 진료 세션 소유 라우트)
- **수납**: `GET /admin/order-codes?code_type=fee` (`Payment.jsx`)
- **인쇄 문서**: `DocumentModal.jsx`가 `GET /admin/clinic`으로 편지지 머리글을 찍습니다.
- **약국**: 약품 마스터 API(`/admin/drugs`)는 이 모듈 라우트에 있지만 약품 탭 내용은 약국 세션이 고칩니다.
- **임상병리**: 검사항목 탭이 `/api/lab/test-items`를 쓰고, 새 검사 패널은 `POST /admin/order-codes`(code_type `lab`)로 만듭니다.
- **PACS**: 오더 연동 탭이 `/api/pacs/config`·`/pacs/test`를 씁니다. 상태 API가 `service_heartbeat`·`pacs_config`를 읽습니다.
- **통계**: 직원·진료과 이름을 조인해서 씀 (확인 필요 — 통계 라우트 안을 보지 않음).

## 6. 설정 항목

`.env` (git에 없음, `setup.ps1`/`setup.sh`가 만듦. 값은 여기 쓰지 않음)

| 이름 | 의미 |
|---|---|
| `DB_PASSWORD` | PostgreSQL 비밀번호. DB와 백엔드가 같이 씀. `docker-compose.yml`에 공개 기본값이 있어 `.env`가 없으면 그 값이 쓰임 |
| `JWT_SECRET` | 로그인 토큰 서명 키. **없으면 시작 거부**. 바꾸면 모든 사람이 다시 로그인해야 함 |
| `BACKUP_PATH` | 백업을 앱 폴더 대신 다른 드라이브/폴더에 저장. 비우면 `./backups` (**꺼지는 것이 아님** — `.env.example`의 설명은 옛날 것) |
| `BACKUP_RETENTION_DAYS` | 백업 보관 일수 (기본 30) |
| `BACKUP_TIME` | 매일 자동 백업 시각 `HH:MM` (기본 02:00, 컨테이너 현지 시각) |
| `TZ` | 시간대 (예: `Indian/Antananarivo`). DB·백엔드가 같이 씀. 백업 파일 이름 시각과 「오늘」의 기준 |
| `UPDATE_CHECK` | `false`면 GitHub 업데이트 확인 끔 (기본 켬) |
| `UPDATE_REPO` | 업데이트를 확인할 GitHub 저장소 (기본 `BethesdaHaneulNa/Bethesda-EMR`) |

`docker-compose.yml`이 고정하는 것: `DB_HOST`·`DB_PORT`·`DB_NAME`·`DB_USER`·`PORT`·`NODE_ENV`.

스크립트 쪽 상수: `server-status.ps1` — 새로고침 15초, 브리지 60초, 백업 36시간, 디스크 20/5GB, 기본 언어 `server-status.bat`의 `-Lang fr`. `status.routes.js`에 같은 숫자가 따로 있습니다.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것입니다. **아직 하나도 고치지 않았습니다.** 심각도: 높음 · 보통 · 낮음.

### 보안 · 권한

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| S1 | 높음 | 비활성화하거나 권한을 뺀 직원이 **이미 받은 토큰으로 최대 12시간** 계속 씀. 서버가 요청마다 DB의 상태·권한을 보지 않고 토큰 안의 권한을 믿음 | `middleware/auth.js` `authMiddleware`·`permMiddleware`, `generateToken` `expiresIn:'12h'` |
| S2 | 높음 | 접수·진료·수납·문서 API는 **로그인만** 확인. 약국 직원도 API로 수납 취소·진료 기록 수정 가능. 권한은 화면 메뉴에서만 지켜짐 | `patient/visit/consult/billing/document.routes.js`에 `permMiddleware` 없음. 각 세션 소유 → 총괄 확인 요청 |
| S3 | 보통 | 「설치 때 만든 관리자」를 **아이디 `admin`** 으로 판별하는데 첫 실행 화면은 아이디를 자유롭게 받음. 다른 아이디로 설치했으면 보호가 없고(마지막 관리자 검사만 남음), 나중에 `admin`이라는 아이디의 일반 직원을 만들면 저장할 때마다 관리자·전체 권한으로 바뀜 | `admin.routes.js:20,219`, `Login.jsx:59`, `auth.routes.js:25` |
| S4 | 보통 | 새 직원 비밀번호 칸에 `1234`가 미리 들어가고, 비밀번호 칸이 가려지지 않음(`type="password"` 아님). 직원 비밀번호 길이 제한 없음 | `Settings.jsx:252,653`, `admin.routes.js:194` |
| S5 | 보통 | 로그인 실패 횟수 제한 없음 (LAN 안이라 위험은 제한적) | `auth.routes.js:49` |
| S6 | 보통 | API로 `status`를 빼고 직원을 저장하면 `status`가 `NULL`이 됨 (CHECK는 NULL을 통과). 그 계정은 로그인 불가, 관리자 수에서도 빠짐. 마지막 관리자면 첫 실행 화면이 다시 열려 **로그인 없이 새 관리자를 만들 수 있음**. 화면은 항상 status를 보내므로 API 직접 호출일 때만 | `admin.routes.js:218,226,241`, `auth.routes.js:9` |
| S7 | 낮음 | 비밀번호 확인 전에 「Account is inactive」를 알려줘 계정 존재·상태가 드러남 | `auth.routes.js:63` |
| S8 | 낮음 | `GET /api/pacs/config`가 로그인한 누구에게나 브리지 토큰을 줌 (토큰으로 워크리스트 피드의 환자 정보 조회 가능) | `pacs.routes.js:43` — PACS 세션 소유 |
| S9 | 낮음 | 마지막 관리자 검사가 트랜잭션 없이 이뤄져, 두 관리자를 **동시에** 강등하면 둘 다 통과할 수 있음. 첫 관리자 생성(`/setup`)도 동시 요청이면 둘 생길 수 있음 | `admin.routes.js:229`, `auth.routes.js:24` |
| S10 | 낮음 | 권한 배열을 허용 목록으로 검사하지 않음, `login_id` 공백 제거·빈 값 검사가 PUT에 없음, `bcryptjs` import만 있고 안 씀 | `admin.routes.js:192,209,213`, `auth.routes.js:2` |

### 백업 신뢰성

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| B1 | 보통 | 백업 **두 개가 같은 분에 돌면** 같은 파일 이름에 동시에 씀 (「지금 백업」을 두 PC에서, 또는 자동 백업 중에). 한쪽이 실패하면 다른 쪽의 좋은 파일까지 지움. 동시 실행을 막는 장치 없음 | `backup.js:42-45` `stamp()` 분 단위, `runBackup()`에 잠금 없음, 실패 시 `unlinkSync(file)` |
| B2 | 보통 | 보관 정리가 **개수를 보지 않고 날짜만** 봄. 서버가 30일 넘게 꺼졌다 켜지거나 PC 시계가 크게 틀어지면 새 백업 1개만 남기고 전부 지움 | `backup.js:48-53` `prune()` |
| B3 | 보통 | 백업 탭의 「✓ 자동 백업 켜짐」은 **항상 초록**. 백업이 며칠째 실패해도 이 탭에는 아무 표시가 없음 (실패 원인은 백엔드 로그에만) | `Settings.jsx:577`, `backup.js:124` |
| B4 | 보통 | `verify-backup.ps1`에 파일을 안 주면 **스크립트 옆 `backups\`만** 봄. `BACKUP_PATH`로 다른 드라이브에 저장하면 「백업 없음」 또는 옛 파일을 검사 | `verify-backup.ps1:40,158` (상태 창은 `docker inspect`로 실제 위치를 찾음) |
| B5 | 보통 | `verify-backup.ps1`이 가장 새 백업을 운영 DB와 비교할 때 **행 수가 하나라도 다르면 실패**로 판정. 새벽 백업을 낮에 검사하면 그 사이 등록된 환자 때문에 멀쩡한 백업이 「VERIFY FAILED」로 나올 것으로 보임 (격리 스택에서 확인 필요) | `verify-backup.ps1:197-206` — 체크섬만 예외 테이블이 있고 행 수·시퀀스는 없음 |
| B6 | 낮음 | 백업 목록·「최근」의 시각이 **UTC**로 나옴 (마다가스카르보다 3시간 이름). 파일 이름은 현지 시각이라 서로 안 맞음 | `Settings.jsx:587,598` — `String(mtime)`은 ISO(UTC) 문자열 |
| B7 | 낮음 | 디스크 검사가 백업 드라이브만 봄. 백업을 D:로 옮기면 DB가 있는 드라이브가 차도 모름 | `status.routes.js:261`, `server-status.ps1:216` |
| B8 | 낮음 | 내려받기가 파일 전체를 브라우저 메모리에 올림 (DB가 커지면 느리거나 실패 가능) | `Settings.jsx:41` |
| B9 | 낮음 | `.env.example`이 「`BACKUP_PATH`를 비우면 백업이 꺼진다」고 설명 — 코드는 항상 켜짐. 백업 탭 안내문 기본값(한국어 대체 문구)도 같은 옛 설명 | `.env.example`, `Settings.jsx:573` (번역 키 `backupIntro`는 맞게 되어 있음) |

### 화면 · 기타

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| U1 | 보통 | 설정 화면 글자 상당수가 **영어로 고정** — 탭 이름(Staff, Drugs, Order Codes, Phrases, Departments, Clinic), 표 머리글, 입력 칸 이름, 「+ Add」, 「Delete?」, Clinic 탭 설명. 현장(프랑스어) 직원에게 영어로 보임 | `Settings.jsx:229-230,251-256,610-637,650-758` |
| U2 | 보통 | 비활성으로 만든 직원을 **다시 활성으로 되돌릴 방법이 화면에 없음** (상태 칸 없음) | `Settings.jsx:649-684` |
| U3 | 보통 | `/api/system/status`를 화면 어디에서도 부르지 않음. 상태 창은 서버 PC에서만 보임 | `status.routes.js`, 프론트엔드에 호출 없음 |
| U4 | 낮음 | 첫 화면 목록 불러오기가 하나라도 실패하면 뒤의 것(병원 정보·약속처방)이 안 불러와져 Clinic 탭이 「Loading…」에 멈춤 | `Settings.jsx:43-54` |
| U5 | 낮음 | 앱 제목을 비워서 저장할 수 없음 (빈 값이면 이전 값 유지) | `admin.routes.js:344` `COALESCE` |
| U6 | 낮음 | 로그인 화면 아래 버전이 `v1.0`으로 고정, 로고 글자가 옛 이름의 「M」 | `Login.jsx:87,140` |
| U7 | 낮음 | 저장 알림 `t.saved` 키가 i18n에 없어 영어 「Saved ✓」로 나옴 | `Settings.jsx:75,92` |
| U8 | 낮음 | 진료과 저장 코드에 관계없는 `setPacsConfig(...)` 한 줄이 들어가 있음 (동작엔 지장 없음) | `Settings.jsx:139` |
| U9 | 낮음 | 권한 목록이 네 곳에 따로 있음 (`modules.js`, `admin.routes.js:12`, `auth.routes.js:30`, `middleware/auth.js`) | 3-1절 |

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 코드 기준으로 위키 첫 작성, 알려진 문제 목록 정리 (코드 변경 없음) | (이 커밋) |
