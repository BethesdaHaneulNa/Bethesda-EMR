# 설정 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 현황 파악, 위키 첫 작성

- **상태**: 보류 — 무엇부터 고칠지 실장님 결정 대기 (이 커밋 자체는 위키뿐이라 합쳐도 무해)
- **커밋**: session/settings — 이 항목과 같은 커밋 (`a4a9ea6` 위)
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
