# 설정 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 백업 안전장치 (동시 실행 · 최소 보관 · 실패 표시 · 시각)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`08d0336` 위)
- **한 일**: 실장님이 백업 로직 수정을 허락하셔서 7절 B1·B2·B3·B6을 고쳤습니다.
  1. **동시 실행**: `runBackup()`이 진행 중인 백업이 있으면 그 Promise를 돌려줍니다. 전에는 같은 분에 두 백업이 같은 파일에 쓰고, 실패한 쪽이 성공한 쪽 파일을 지웠습니다.
  2. **작업 폴더**: 덤프를 `/backups/.inprogress/`에 쓰고 `gzip -t`까지 통과해야 `/backups/`로 `rename`합니다. 실패하면 자기 작업 파일만 지웁니다. 남은 조각은 서버 시작·백업 시작 때 지웁니다. `pipefail`·`gzip -t`·크기 0 거부(1.3.3)는 그대로입니다.
  3. **최소 보관**: `prune()`이 가장 최근 7개(`MIN_KEEP`)는 나이와 상관없이 남깁니다.
  4. **상태 표시**: `backup.health()`(ok·stale·none·failed)를 새로 만들어 백업 탭과 `/api/system/status`가 같이 씁니다. 백업 탭 맨 위에 색 띠 + 안내 + 실패 시 오류 문구(settings 권한만). 마지막 시도 결과는 메모리에만 둡니다(재시작하면 사라지지만 36시간 기준으로 다시 잡힘).
  5. **시각**: 백업 목록·「최근」을 브라우저 PC 현지 시각으로 표시(UTC 문자열을 잘라 쓰던 것).
  6. 백업 탭 안내문의 옛 한국어 대체 문구(「경로가 없으면 백업은 꺼집니다」)를 지웠습니다 — 번역 키가 세 언어 모두 있어 필요 없음.
- **바꾼 파일**: `backend/src/services/backup.js` · `backend/src/routes/backup.routes.js` · `backend/src/routes/status.routes.js` · `frontend/src/pages/Settings.jsx`(백업 탭과 위쪽 함수 두 개만)
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — **`se_` 표시 사이에만** 키 추가. 기존 키는 안 건드림.
- **DB 마이그레이션**: 없음
- **번역 키**: `se_bkOk` `se_bkStale` `se_bkNone` `se_bkFailed` `se_bkStaleHint` `se_bkNoneHint` `se_bkFailedHint` `se_bkHoursAgo` `se_bkRunning` `se_bkLastTry` `se_bkTriggerAuto` `se_bkTriggerManual` `se_bkMinKeep` — 13개, ko·en·fr 모두 (node로 세 파일 13개씩 확인)
- **확인한 방법**:
  - `node --check` 세 백엔드 파일 통과. 프론트 `npm run build` 통과. **`npm ci`는 저장소에 `package-lock.json`이 없어 실행 불가** → `npm install --no-package-lock`으로 설치(잠금 파일 안 생김).
  - 격리 스택 9187(`-p bethesda-s-settings`), `BACKUP_PATH`를 작업용 임시 폴더로 지정해 실장님 백업 폴더와 분리. 실행 중인 EMR(`bethesda-emr-*`)은 건드리지 않음.
  - ① 「지금 백업」 API 3개 동시 호출 → 세 요청 모두 같은 파일, 파일 1개. ② 정상 백업 직후 **같은 분에** 격리 DB를 멈추고 백업 → 실패로 기록, 같은 이름의 정상 파일이 남음, `.inprogress` 비어 있음. 화면(한국어) 빨간 띠·오류 문구 확인. 「지금 백업」 누르면 초록(프랑스어) 확인. ③ 40~51일 된 가짜 백업 12개 + 진짜 2개에서 백업 → 7개 남음(오래된 것부터 삭제). ④ `.inprogress`에 조각을 두고 API 재시작 → 지워짐. 오래된 백업만 남긴 상태 → 노랑 「La dernière sauvegarde est trop ancienne」(프랑스어), `/api/system/status`도 `status.backup.stale`. 재시작 2분 뒤 밀린 자동 백업이 스스로 돎. ⑤ **복원**: 악센트 든 진료과 → 백업 → 이름 바꾸고 직원 추가 → `DEPLOYMENT.md` 5b 명령 그대로(컨테이너 이름만 격리용) 복원 → 종료 코드 0, 원래대로 돌아옴, 악센트 유지.
- **확인 못 한 것**: 새벽 02:00 정시 자동 백업은 기다려 보지 않았습니다(재시작 뒤 밀린 백업으로 같은 경로 확인). 여러 사람이 **화면에서** 동시에 누르는 것은 API 동시 호출로 대신했습니다. 서버 상태 창(`server-status.ps1`)은 바꾸지 않았고, `.inprogress` 폴더를 무시하는 것은 코드로만 확인했습니다(`Get-ChildItem -File`은 하위 폴더를 보지 않음). 영어 화면은 보지 않았습니다.
- **위키**: `modules/settings.md` 2-6절(백업 탭 사용법), 3-4절(백업 흐름·동시 실행·정리·상태 판정·복원 확인), 3-6절 표, 4절 API, 6절 상수, 7절(B1·B2·B3·B6 고침, B9 수정, B10 추가, 줄 번호 기준 명시), 8절
- **총괄 확인 요청**:
  - 운영 중인 병원의 `backups/` 폴더에 **`.inprogress` 하위 폴더가 새로 생깁니다**. 백업을 USB로 통째로 복사하는 분이 보면 헷갈릴 수 있어 적어 둡니다. 보통 비어 있습니다.
  - B10: `DEPLOYMENT.md` 5b에 「PowerShell이나 cmd에서 실행 (Git Bash는 /tmp 경로를 바꿈)」 한 줄을 넣으면 좋겠습니다 (총괄 소유 파일).
  - 이전 항목의 총괄 확인 요청(S1·S2·U9·B9)은 그대로 유효합니다.
  - **격리 스택이 운영 이미지 이름을 덮어씁니다 (중요)**: `docker-compose.yml`이 `image: bethesda-emr-backend:latest`·`bethesda-emr-frontend:latest`를 고정하고 `docker-compose.session.yml`은 이를 바꾸지 않습니다. 그래서 어느 세션이든 `up --build`를 하면 **실장님 EMR이 쓰는 이미지 태그가 그 세션의 코드로 바뀝니다**. 이미 떠 있는 컨테이너는 이미지 ID를 들고 있어 바로 바뀌지는 않지만, 운영 스택을 `--build` 없이 다시 만들면(`docker compose up -d` 등) **합쳐지지 않은 세션 코드가 운영에 올라갈 수 있습니다**. 2026-09-29 16:5x KST 확인: 태그는 운영 컨테이너 이미지(`de3d810652fa`·`5aac267d8ed8`)를 가리키고, pacs·payment 세션 컨테이너는 각각 다른 이미지로 떠 있었습니다. 운영 번들에 이 세션의 새 문구는 없었습니다 — **지금 운영은 이 세션 코드가 아닙니다.** 제안: `docker-compose.session.yml`에 `image: bethesda-s-${SESSION}-backend` / `-frontend`를 추가 (총괄 소유 파일이라 고치지 않음).
  - 참고: 운영 EMR 컨테이너가 07:49:41Z(16:49 KST)에 `C:\Bethesda-EMR-main`(`develop` `7ad4387`)에서 다시 만들어졌습니다. 이 세션은 그 시각에 운영 쪽 compose를 실행하지 않았습니다 (이 세션의 compose 명령은 전부 `-p bethesda-s-settings`, 작업공간에서 실행). 총괄 배포라면 무시하셔도 됩니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: `verify-backup.ps1`의 B4(BACKUP_PATH를 안 봄)·B5(낮에 검사하면 멀쩡한 백업을 실패로 판정할 가능성)는 아직입니다. `verify-backup.ps1`은 컨테이너 이름이 `bethesda-emr-db`로 고정이라 격리 스택에서 돌리려면 매개변수를 추가해야 합니다 — 그대로 돌리면 실장님 운영 DB 컨테이너에 임시 DB를 만듭니다.

## 2026-09-29 — 현황 파악, 위키 첫 작성

- **상태**: 확인 요청 (위키뿐이라 합쳐도 무해. 순서는 실장님이 백업부터로 정하심 — 위 항목)
- **커밋**: session/settings `08d0336`
- **한 일**: 설정 모듈의 자기 파일 전부(Settings.jsx, Login.jsx, admin/auth/backup/status/version 라우트, services, 운영 스크립트, 011·013·018 마이그레이션, DEPLOYMENT.md 백업·보안 절)를 읽고 `wiki/modules/settings.md` 1~8절을 코드 기준으로 채웠습니다. 찾은 문제 28건을 7절에 심각도·근거와 함께 정리했습니다. **코드는 고치지 않았습니다.**
- **작업공간 정리**: worktree가 `f1e9cc4`(1.4.0)에 있어서 `git branch -m session/settings` 후 `git merge --ff-only a4a9ea6`로 지시된 출발점에 맞췄습니다 (앞으로 감기만, 다른 세션 브랜치 가져오기 아님).
- **바꾼 파일**: `wiki/modules/settings.md`, `wiki/handoff/settings.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기. 실행 중 EMR에 대해 `server-status.ps1 -Console -Lang ko`를 **읽기 전용으로** 한 번 돌림(`docker inspect`/`docker info`만 부름) — 7줄 모두 정상, 종료 코드 0, `/backups` 마운트 원본이 Windows 경로로 잡히는 것 확인. i18n 키 존재 여부는 node로 ko/en/fr 객체를 불러 확인.
- **확인 못 한 것**: 격리 스택(9187)은 아직 띄우지 않았습니다. 7절 B5(verify-backup이 낮에 멀쩡한 백업을 실패로 판정)는 코드상 추론이고 실제 실행은 안 해 봤습니다. 통계 라우트가 staff/department를 어떻게 쓰는지 보지 않았습니다. 상태 창의 화면 멈춤(3-6절)은 추정입니다.
- **위키**: `modules/settings.md` 1~8절 전부 새로 씀
- **총괄 확인 요청**:
  1. **S2 — 서버 권한 검사 누락 (높음)**: `patient`·`visit`·`consult`·`billing`·`document` 라우트가 `authMiddleware`만 있고 `permMiddleware`가 없습니다. 로그인한 직원이면 누구든 API로 수납 취소(`PUT /api/billing/:id/void`) 등을 할 수 있습니다. 각 라우트는 접수·진료·수납·진료 세션 소유라 제가 고치지 않았습니다. 세션들에 전달하거나 총괄이 일괄로 정할지 판단해 주세요. 다른 화면이 서로의 API를 부르는 경우(예: 수납이 진료 API 조회)가 있어 라우트별로 허용 권한을 정해야 합니다.
  2. **S1 — 토큰 12시간 유효 (높음)**: 비활성·권한 변경이 다시 로그인할 때까지 적용되지 않습니다. 고치려면 `backend/src/middleware/auth.js`(총괄 소유)의 `authMiddleware`가 요청마다 `staff.status`·`permissions`를 DB에서 확인해야 합니다. 실장님이 이걸 먼저 고치기로 하시면 제가 최소 변경안을 만들어 인계 노트에 적겠습니다 — 허락해 주시겠습니까?
  3. **U9**: 권한 목록이 `modules.js`(총괄)·`admin.routes.js`·`auth.routes.js`·`middleware/auth.js`에 따로 있습니다. 모듈을 추가할 때 네 곳을 같이 고쳐야 합니다.
  4. **B9**: `.env.example`의 BACKUP_PATH 설명(「비우면 꺼짐」)이 1.x 이후 코드와 반대입니다. 루트 설정 파일이라 제가 고치지 않았습니다.
- **다른 세션에 부탁**:
  - **PACS**: `GET /api/pacs/config`가 로그인한 누구에게나 `bridge_token`을 돌려줍니다(S8). 설정 권한이 없으면 토큰을 빼 주면 좋겠습니다. 또 오더 연동 탭의 피드 주소 예시 기본값이 `:8080`인데 EMR은 1.x부터 `:9080`입니다 (`Settings.jsx:495-496`, 탭 안이라 PACS 담당).
  - **약국**: 약품 탭의 재고 빨간색 기준이 `min_stock`이 아니라 `20`으로 고정입니다 (`Settings.jsx:298`). 약품 수정 창에 `name_en`·`generic_name`·`min_stock` 칸이 없습니다. 참고만.
- **남은 일 · 알려진 문제**: `modules/settings.md` 7절 전체. 실장님께 제안한 순서는 아래 보고와 같습니다.
