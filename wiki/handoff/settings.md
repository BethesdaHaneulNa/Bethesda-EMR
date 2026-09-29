# 설정 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 출발 전 확인 목록 검토 (총괄 부탁, 보고만)

- **상태**: 확인 요청 (이 항목 외 변경 없음 — `wiki/02-before-departure.md`는 총괄 소유라 안 고침)
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `5c0bd43`을 ff로 당긴 뒤)
- **보고한 것** (총괄에게 메시지로 전체 전달):
  - ★ **데이터를 어떻게 가져가나**가 목록에 없음 — 오프라인 설치 묶음에는 DB·`.env`가 없어 새 PC는 빈 DB로 시작(`OFFLINE-INSTALL.md`). 이 PC를 가져갈지, 새 PC에 백업을 복원할지(그러면 시험 데이터·계정도 같이 옴 → 복원 뒤 정리), 새로 입력할지 먼저 정해야 함.
  - 계정: 시험 계정은 **지울 수 없고 비활성만**(되돌리기 없음, 아이디 재사용 불가), Front Desk → 프랑스어 화면 「Accueil」, 새 직원 `1234` 기본값·최소 길이 없음, 설치 관리자 아이디가 `admin`이어야 잠금 방지(S3) 또는 관리자 둘, 관리자 비밀번호 바꾸는 곳과 12시간(S1).
  - 설치: 백업 위치 확인 방법(Sauvegarde 탭 Chemin + 초록 띠, 백업 직후 `verify-backup -Strict`), 병원 밖 USB 사본 담당, `TZ`, 서버 상태 창을 시작 프로그램에 두고 PACS INACCESSIBLE 확인, `DEPLOYMENT.md` §9 영어 목록에 링크.
  - 병원 정보: 프랑스어 인쇄는 프랑스어 → 영어 → 기본 이름 순, 앱 제목도 확인.
- **확인한 방법**: `02-before-departure.md`, `DEPLOYMENT.md` §4·§5·§9, `OFFLINE-INSTALL.md`, `.env.example`(B9는 총괄이 이미 고침 확인), 실장님 PC `.env`의 `TZ`·`BACKUP_*` 키(값 중 비밀값은 안 봄). 실행 중 EMR은 들여다보지 않았습니다 — 그래서 **실제 설치 관리자 아이디가 `admin`인지는 모릅니다.**

## 2026-09-29 — 간호사 기본 권한 결정 반영 확인 (접수·약국·임상병리)

> **총괄 확인 (2026-09-29)**: `7ea53f5` 합침(위키·주석). 처음 열리는 화면과 「접수 권한은 보기 전용이 아님」은 결정 세션에 넘김.

- **상태**: 확인 요청 (위키·주석만, 코드 동작 변경 없음)
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `f4df9bc`을 ff로 당긴 뒤)
- **한 일**: 총괄이 결정대로 고친 `nurse` 기본값(접수·약국·임상병리)을 격리 스택에서 확인하고, 위키 2.4 표·3-1절·4절(마이그레이션 번호 020)을 맞췄습니다. `permissions.js`의 「확인 중」 주석을 결정 내용으로 바꿨습니다.
- **확인한 방법** (9187, 세션 DB는 옛 번호 701로 적용돼 있어 020이 한 번 더 적용됨 — 재실행 안전): 프랑스어 화면 **Rôle: Infirmier(ère)** → **Enregistrement·Pharmacie·Laboratoire** 자동 체크, Paiement 꺼짐 → 저장 → 그 계정으로 로그인 → **Enregistrement**가 처음 열림, 메뉴 3개, 💉 아이콘. `/payment`·`/settings`·`/consultation`은 접수로 돌아감. 서버: `/patients`·`/visits/today`·`/pharmacy/pending`·`/lab/pending` 200, `/billing/pending`·`/admin/staff` 403, `/billing/patient/:id/balance` 200(수납 또는 **접수** 권한이면 열리는 것 — 접수 화면이 미수금을 보여주므로 의도대로).
- **처음 열리는 화면**: `Login.jsx` `ROLE_ROUTES`에 `nurse`가 없어 `homePath()` — 메뉴 순서상 첫 권한인 **접수**. 동작은 정상. 간호사가 주로 약국에서 일한다면 `ROLE_ROUTES`에 `nurse: '/pharmacy'` 한 줄로 바꿀 수 있습니다 — **실장님 판단 필요**라 그대로 둠.
- **실장님께 알릴 것**: 접수 권한은 「차트 보기」만이 아니라 **환자 등록·수정, 내원 접수·취소까지 모두** 됩니다(권한이 화면 단위라 보기 전용이 없음). 차트만 보게 하려면 접수 화면에 읽기 전용 모드를 만들거나(접수 세션), 차트 보기 권한을 따로 두는 설계가 필요합니다.
- **바꾼 파일**: `wiki/modules/settings.md` · `wiki/handoff/settings.md`
- **공용 파일 변경**: `backend/src/middleware/permissions.js` — 주석만 (값은 총괄이 고친 그대로)
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **총괄 확인 요청**: 위 두 가지(첫 화면, 접수 권한의 범위)를 결정 세션에 전달 부탁드립니다.

## 2026-09-29 — 간호사(nurse) 역할 · 로그인 화면 버전

> **총괄 확인 (2026-09-29)**: `47043f4` 합침 + 실행 중 EMR 반영. 마이그레이션은 `701` → **`020_settings_nurse_role.sql`** 로 번호를 바꿔 합침(내용 그대로). 실장님 결정으로 간호사 기본 권한을 **접수 · 약국 · 임상병리**로 바꿈(`modules.js`·`permissions.js` 한 줄씩, 총괄이 고침) — 실장님 말씀: 접수를 넣는 이유는 환자 차트를 보기 위해서. `TopBar.jsx`에 간호사 아이콘 추가. `settings.permissions.mjs` 통과.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop 병합 `20e68ce` 이후)
- **한 일**: 현장(약사 없음, 간호사가 간호·약국·임상병리)에 맞춰 역할 **`nurse`** — 화면 「간호사 / Nurse / Infirmier(ère)」, 기본 권한 **pharmacy + lab**. 기존 `pharmacy`·`lab` 역할은 그대로. 기본값이 결정으로 바뀌면 `permissions.js`와 `modules.js`의 `nurse` 한 줄씩만 바꾸면 되고, `settings.permissions.mjs`가 둘이 같은지 봅니다. 로그인 화면 아래 「Bethesda EMR v1.0」을 상단바와 같은 빌드 버전(`__APP_VERSION__`)으로.
- **바꾼 파일**: `backend/sql/701_settings_nurse_role.sql`(새) · `backend/src/routes/admin.routes.js`(`ROLES`) · `frontend/src/pages/Settings.jsx`(역할 선택·색 — `lab`에 없던 색도 넣음) · `frontend/src/pages/Login.jsx`(버전) · `backend/test/settings.permissions.mjs`(nurse 비교) · `wiki/modules/settings.md`
- **공용 파일 변경**:
  - **`frontend/src/modules.js`(총괄)** — `defaultPermsForRole`에 `case 'nurse': return ['pharmacy', 'lab'];` 한 줄 (총괄 허락).
  - `backend/src/middleware/permissions.js` — `ROLE_DEFAULT_PERMS.nurse` 한 줄.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_role_nurse` 1개.
- **DB 마이그레이션**: `backend/sql/701_settings_nurse_role.sql` — `staff_role_check`를 지우고 `nurse`를 더해 다시 만듦. **허용 값만 넓힘, 기존 행은 안 바뀜.** 여러 번 돌려도 됨. 총괄이 번호를 다시 매길 때 `013` 뒤면 됩니다(`013`이 같은 제약을 만듦).
- **번역 키**: `se_role_nurse` (ko 간호사 · en Nurse · fr Infirmier(ère))
- **확인한 방법**: `node --check`, `npm run build`, `settings.permissions.mjs`(nurse 포함) · `settings.messages.mjs` 통과. 격리 스택 9187: 마이그레이션 로그 「applying 701… applied 1」, 제약에 `nurse` 들어간 것 확인. 프랑스어 화면에서 관리자가 **+ Ajouter → Rôle: Infirmier(ère)** 고르자 **Pharmacie·Laboratoire가 자동 체크** → 저장 → 목록에 「Infirmier(ère)」 배지와 💊🧪 아이콘. 그 계정으로 로그인 → **Pharmacie**로 들어가고 메뉴는 Pharmacie·Laboratoire뿐. 주소창에 `/registration`·`/payment`·`/settings`를 치면 모두 `/pharmacy`로 돌아감. `/lab` 열림. 한국어 화면도 약국·임상병리만. 서버: 간호사 토큰으로 `/pharmacy/pending`·`/lab/pending` 200, `/billing/pending`·`/admin/staff`·`/stats/summary` 403. 로그인 화면 아래 「Bethesda EMR v1.4.0」.
- **확인 못 한 것**: 간호사로 실제 조제·검사 결과 입력(각 화면은 권한으로 열리는 것까지만). 영어 화면.
- **위키**: `modules/settings.md` 2.4 역할 표(간호사 줄), 3-1절, 4절 staff 테이블, 7절 U6, 8절
- **총괄 확인 요청**: `modules.js` 한 줄(위). 상단바 `TopBar.jsx`의 `ROLE_INFO`에 `nurse`가 없어 간호사 이름 옆 아이콘이 기본 👤입니다 — 원하시면 한 줄.
- **다른 세션에 부탁**: **약국·임상병리** — 위키 2절의 「누가 이 화면을 쓰나」에 간호사(역할 `nurse`, 기본으로 두 화면 모두)를 적어 두면 좋겠습니다.

## 2026-09-29 — 서버 안내를 화면 언어로 (U11) · 틀린 비밀번호 안내 (U12) · 비밀번호 칸 가리기

> **총괄 확인 (2026-09-29)**: `e2f794b` 합침 + 실행 중 EMR 반영. `settings.messages.mjs` 39개 통과. U12는 실행 중 EMR 로그인 화면에서 직접 확인(아래 총괄 답장). 뿌리 쪽도 고침: `api/client.js`가 **토큰을 보낸 요청의 401만** 로그인 화면으로 보냄 — 토큰 없는 401(틀린 비밀번호 등)은 안내 문구를 그대로 돌려줌. `Login.jsx`의 직접 호출은 그대로 둬도 됨.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `58e62f2`을 ff로 당긴 뒤)
- **한 일**:
  1. **U11** (총괄 결정: 화면에서 고정 문구 비교): 로그인·설정 API의 사람용 문구를 새 파일 `backend/src/routes/settings.messages.js`(`MSG`·`fieldMsg`)로 모으고 `auth.routes.js`·`admin.routes.js`가 가져다 씀(문구 자체는 그대로). 화면 쪽 비교 표는 새 파일 `frontend/src/pages/settingsMessages.js` `seMessage(t, text)` — `utils/dbError.js`(총괄)와 `api/client.js`의 문구도 포함. 두 파일에 「함께 고칠 것」 주석. `Settings.jsx`의 설정 몫 오류 표시(병원 정보·공통 저장/삭제·약속처방·백업)와 `Login.jsx`에 적용. **오더 연동·검사항목 탭 함수의 오류 표시는 각 세션 몫이라 안 건드림.**
  2. **U12 (새로 찾아 고침, 높음)**: 틀린 비밀번호나 비활성 계정으로 로그인하면 **아무 안내 없이 칸만 비었습니다.** `api/client.js`가 401을 받으면 로그인 화면을 다시 불러오는데, 로그인 화면의 401은 「비밀번호 틀림」이라 안내가 새로고침에 지워짐(격리 스택에서 재현). 공용 파일은 안 건드리고, `Login.jsx`가 로그인·첫 설정 요청만 직접 보내게 함(`authPost`). 로그인 안내는 원문을 저장하고 보여줄 때 번역 → 언어를 바꾸면 안내도 바뀜.
  3. **비밀번호 칸 가리기** (S4 중 결정 없이 되는 것): 직원 편집 창 `type=password` + **Afficher/Masquer** 버튼(직원에게 불러 줘야 하므로), `autoComplete="new-password"`(브라우저가 관리자 자신의 저장된 비밀번호를 직원 칸에 채우지 않게), 아이디 칸 `autoComplete="off"`. `1234` 기본값·최소 길이는 **결정 대기라 그대로**.
- **바꾼 파일**: `backend/src/routes/settings.messages.js`(새) · `auth.routes.js` · `admin.routes.js` · `frontend/src/pages/settingsMessages.js`(새) · `Settings.jsx` · `Login.jsx` · `backend/test/settings.messages.mjs`(새) · `wiki/modules/settings.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_` 블록에 22개. `api/client.js`·`utils/dbError.js`는 **안 건드림**(문구만 읽어 비교).
- **DB 마이그레이션**: 없음
- **번역 키**: `se_err*` 18개(`Inactive`·`Server`·`SetupDone`·`LoginExists`·`NotFound`·`LoginIdRequired`·`PasswordRequired`·`LastAdmin`·`SetupAdminKept`·`Duplicate`·`MissingRef`·`Required`·`NotAllowed`·`Format`·`Range`·`NotNumber`·`Negative`·`NotWhole`), `se_fStock`·`se_fMinStock`·`se_showPw`·`se_hidePw` — ko·en·fr
- **확인한 방법**: `node --check` 3개, `npm run build`, `node backend/test/settings.messages.mjs` → 39개 통과(서버의 모든 문구가 한국어·프랑스어로 바뀌고 키가 다 있는지, dbError 문구 포함). `settings.permissions.mjs`도 통과. 격리 스택 9187: **고치기 전** 틀린 비밀번호 → 안내 없이 빈 칸(재현) / **고친 뒤** 프랑스어 「Identifiant ou mot de passe incorrect」, 칸 유지 / 비활성 계정 → 「Ce compte est désactivé…」 / 정상 로그인 됨 / 직원 추가 창 비밀번호 ••••, Afficher → 1234 / 같은 아이디 저장 → 「Erreur: Un élément avec ce code ou cet identifiant existe déjà.」 / 설치 관리자 Supprimer → 「Erreur: Le compte administrateur créé à l'installation ne peut pas être désactivé.」(확인 창·알림은 기록용 가짜로 받아 문구 확인).
- **확인 못 한 것**: 영어 화면. 첫 관리자 만들기 화면의 오류(빈 DB가 필요 — 코드와 검사 스크립트로만).
- **위키**: `modules/settings.md` 2.4·2.12(표를 실제 프랑스어 문구로), 3-3절, 4절, 7절(S4 일부·U11·U12), 8절
- **총괄 확인 요청**: U12는 `api/client.js`의 401 처리 때문입니다. 로그인 화면은 우회했지만, 다른 화면에서도 **401을 「로그인 끝남」 말고 다른 뜻으로 쓰는 API**가 있다면 같은 일이 생깁니다(지금 설정 쪽에는 없음).
- **다른 세션에 부탁**: **PACS·임상병리** — 설정 화면 안의 각자 탭 함수(`savePacs`, `saveLabItems`·`createPanel`)의 `alert('…'+err.message)`는 영어 서버 문구가 그대로 나옵니다. 원하면 같은 `seMessage`를 쓰거나 각자 방식으로.

## 2026-09-29 — 위키 2절을 프랑스어 화면 기준으로 (총괄 지시)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`1d3e4fc` 위). **위키만** 바꿈.
- **한 일**: `modules/settings.md` 2절을 수납·통계 방식으로 다시 썼습니다. 버튼·칸 이름은 **프랑스어 화면 그대로**, 괄호에 한국어 화면 이름. 새로 넣은 것: 2.2 로그인·로그아웃(12시간), 2.3 탭 표(탭마다 담당 세션), 2.4 역할별 기본 권한 표를 프랑스어 역할명으로 + **직원 목록 칸의 뜻** 표(아이콘 줄 포함), 2.7 **백업 색 띠별 뜻·할 일** 표와 칸의 뜻 표, 2.8 병원 정보 칸의 뜻 표(프랑스어 인쇄는 프랑스어 → 영어 → 기본 이름 순 — `documents/shared.jsx`에서 확인), 2.9 오더 코드 칸의 뜻 표, 2.10 서버 상태 창의 띠·상태 글자(OK·ARRETE·DEMARRAGE·NE REPOND PAS·ABSENT·INACCESSIBLE), 2.12 **「이런 안내가 뜰 때」** 표(17줄).
- **문구 확인 방법**: 프랑스어 문구는 `fr.js`에서 키마다 뽑아 적었고(`node`로 확인), 서버 안내는 `auth.routes.js`·`admin.routes.js`·`utils/dbError.js`·`api/client.js`의 문자열 그대로. 서버 상태 창 문구는 `server-status.ps1`의 `fr` 표.
- **새로 적은 문제**: 7절 **U11** — 로그인·설정 서버 안내 여러 개가 프랑스어 화면에서도 **영어로** 뜸(2.12 표에 「(영어)」로 표시). 고치는 방법 두 가지를 적어 둠. 서버 문구를 번역하려면 `utils/dbError.js`(총괄)도 걸림.
- **바꾼 파일**: `wiki/modules/settings.md`(2절 전체, 7절 B3 참조 번호·U11, 8절), `wiki/handoff/settings.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 이 절의 화면 설명은 오늘 격리 스택에서 본 화면과 코드로 적었습니다. 영어 화면 문구는 표에 넣지 않았습니다.
- **총괄 확인 요청**: U11을 고칠지 — 서버 문구를 화면에서 비교해 바꾸는 방식이면 설정 세션 파일만으로 되고, 서버가 오류 코드를 같이 보내는 방식이면 `utils/dbError.js`·`api/client.js`(총괄)를 건드려야 합니다.

## 2026-09-29 — 상용구에 프랑스어·영어 문장 칸 (진료 세션 부탁)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `0d66ad6`을 ff로 당긴 뒤)
- **한 일**: 진료 화면 문장사전이 `text_fr`/`text_en`을 쓰게 되었는데, 설정 → **Phrases types (상용구)** 편집 창에는 `text` 칸만 있었습니다(API·DB는 원래 셋 다 받음). 편집 창에 **Texte en français**·**Texte en anglais** 칸과 안내 한 줄을 더했고, 목록은 진료 화면과 같은 규칙(프랑스어 화면 → `text_fr`, 없으면 `text`)으로 보여주며 FR·EN 표시를 붙였습니다. 저장할 때마다 상용구가 묶음 안에서 자리를 옮기던 것도 고쳤습니다(`GET /api/admin/phrases` 정렬에 `id` — 시드의 `sort_order`가 전부 0).
- **바꾼 파일**: `frontend/src/pages/Settings.jsx`(상용구 탭 목록·편집 창) · `backend/src/routes/admin.routes.js`(정렬 한 줄) · `wiki/modules/settings.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_` 블록에 4개 (`se_fTextDefault`·`se_fTextFr`·`se_fTextEn`·`se_phraseLangHint`)
- **DB 마이그레이션**: 없음
- **확인한 방법**: `npm run build`, `node --check`. 격리 스택 9187 프랑스어 화면에서 상용구 1번에 「État stable. Contrôle conseillé dans 1 semaine.」 입력·저장 → DB `text_fr`에 악센트 그대로, 목록에 프랑스어 문장 + FR 표시. 정렬: General 묶음이 저장 뒤에도 id 순(1…6).
- **확인 못 한 것**: 진료 화면에서 그 문장이 실제로 프랑스어로 나오는 것(진료 세션 코드 — `phraseText` 규칙만 코드로 확인). 영어 화면.
- **위키**: `modules/settings.md` 2.9절 상용구, 3-9절(새), 8절
- **다른 세션에 부탁**: **진료** — 시드 상용구 24개에 프랑스어 문장이 없습니다. 현장용 번역을 넣으려면 새 마이그레이션(진료 번호대)이나 설정 화면에서 직접 입력. 의학 문장이라 번역 내용은 실장님·의료진 확인이 필요합니다.

## 2026-09-29 — 약 저장 재고 안전장치 (약국 H4 제안 A, 총괄 지시)

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토: 약 행을 `FOR UPDATE`로 잠근 뒤 판단·저장, 재고를 안 고쳤으면 지금 값 유지, 그 사이 바뀌었으면 409. 실행 중 EMR에서 한 약으로 확인(읽기→단가만 같은 값으로 저장→재고 그대로, 틀린 `stock_expected`로 재고 변경→409, 저장 안 됨) — 값은 모두 원래대로. `backend/test/settings.drugs.mjs`는 격리 스택 전용이라 운영에서는 돌리지 않음.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `881328e`을 ff로 당긴 뒤)
- **한 일**: 약을 저장해도 **재고를 안 고쳤으면 재고를 건드리지 않고**, 고쳤는데 **창을 연 사이 재고가 바뀌었으면 409로 다시 묻도록** 했습니다. 규칙 표와 이유는 `modules/settings.md` 3-8절.
  - 서버 `PUT /api/admin/drugs/:id`: 트랜잭션 + 약 행 `FOR UPDATE`(조제와 같은 잠금) → 재고를 안 보냈거나 `stock_expected`와 같으면 지금 값 유지 / 고쳤고 지금 = 본 값이면 저장 / 고쳤고 지금 ≠ 본 값이면 409 `Stock changed while this drug was open` + `current`, 아무것도 저장 안 함 / `stock_expected` 없는 옛 요청은 전처럼. 재고·최소 재고 소수는 400(약국 L6 일부).
  - 화면: `saveEdit`의 약 부분만. 창을 연 목록 행의 재고를 `stock_expected`로 보내고, 재고 칸을 안 고쳤으면 재고를 빼고 보냄. 409면 창과 다른 입력은 두고 재고 칸을 지금 값으로 바꾼 뒤 안내. **약품 탭 화면 글자·칸은 안 건드림.**
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `frontend/src/pages/Settings.jsx`(`saveEdit` 약 부분) · `backend/test/settings.drugs.mjs`(새) · `wiki/modules/settings.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_` 블록에 `se_stockChanged` 1개
- **DB 마이그레이션**: 없음
- **번역 키**: `se_stockChanged` (ko·en·fr)
- **확인한 방법**: `node --check`, `npm run build`. 격리 스택 9187에서 `SE_ADMIN_PW=… node backend/test/settings.drugs.mjs` → 11개 모두 통과 (그 사이 70으로 바뀐 뒤 단가만 저장 → 70 유지 / 재고 고침 → 409, 단가도 저장 안 됨 / 70을 보고 다시 저장 → 성공 / 옛 요청 → 전처럼 / 소수 → 400 / 없는 약 → 404). 화면: 한국어 — 창을 연 뒤 DB에서 30 차감 → 단가만 저장 → 재고 170 유지(전에는 200). 프랑스어 — 창을 연 뒤 20 차감 → 재고 300으로 저장 → 프랑스어 안내(`alert`를 기록용으로 바꿔 문구 확인), 창 유지, 재고 칸 150 → 다시 300 저장 → 「Enregistré」, DB 300·850.
- **확인 못 한 것**: 약국 화면의 실제 「조제 완료」와 동시에 한 시험은 아닙니다(DB에서 직접 빼서 흉내). 둘이 같은 행 잠금을 쓰는 것은 코드로 확인. 영어 화면.
- **위키**: `modules/settings.md` 3-8절(새), 4절 API 표, 7절 U10, 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: **약국** — `pharmacy.md` 2절(직원용)에 「약품 탭에서 재고를 고쳐 저장했는데 『그 사이 재고가 바뀌었습니다』가 뜨면, 재고 칸의 새 숫자를 보고 다시 맞춰 저장」 한 줄, 7절 H4를 「안전장치 적용(설정 3-8절), B는 결정 대기」로. B(재고를 움직임으로만)가 정해지면 서버 PUT에서 재고를 빼는 것은 설정이 맞춰 하겠습니다.

## 2026-09-29 — S2 초안: 라우트별 허용 권한표 · PACS P-20 상태 표시

- **상태**: P-20 코드 = 확인 요청 / S2 표 = 보류(막을지는 결정 세션이 실장님께 여쭙는 중. 코드 변경 없음)
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop 병합 `3f2198e` 이후, `1874812` 위)

### PACS P-20 (코드)

- `status.routes.js` `checkBridge`가 heartbeat `detail.arrivals_error`(문자열, 괜찮으면 빈 값)를 읽어, 있으면 노랑 `status.bridge.arrivals`. **이 필드 이름을 약속으로 제안합니다.** 보내는 쪽(`bridge.py`)과 받는 쪽(`pacs.routes.js` `/bridge-heartbeat`가 `detail`에 넣는 칸 — 지금은 `synced·failed·poll_seconds·error`만 남김)은 PACS 몫이라, 그쪽이 넣기 전까지는 **아무것도 바뀌지 않습니다.**
- 확인: `node --check`, 격리 스택 9187에서 heartbeat 행을 직접 넣어 — 행 없음 → `off`, 옛 브리지(필드 없음) → `ok`, `arrivals_error: "401 Unauthorized from Orthanc"` → `warn status.bridge.arrivals`.
- 서버 상태 창(`server-status.ps1`)은 heartbeat **파일의 시각**만 보므로 이 경우는 모릅니다. 브리지가 파일 안에 상태를 쓰게 되면 그때 맞추겠습니다.
- **다른 세션에 부탁 — PACS**: 도착 확인이 실패하면 heartbeat 요청 본문에 `arrivals_error: "<짧은 이유>"`, 성공하면 `""`. `pacs.routes.js`의 `detail` 객체에 `arrivals_error: String(body.arrivals_error || '').slice(0, 500)` 한 줄.

### S2 — 라우트별 허용 권한표 초안 (결정 전, 코드 변경 없음)

조사 기준: develop 병합 후 `3f2198e`. 모든 라우트와, 그 라우트를 부르는 화면(공용 부품은 그 부품을 쓰는 화면)을 코드에서 찾았습니다. **원칙**: 쓰기는 그 일을 하는 화면의 권한만, 읽기는 부르는 화면들의 권한을 모두 허용. 부르는 곳이 없는 라우트는 주인 모듈만. 「제안」 칸의 권한 중 **하나라도** 있으면 통과(`permMiddleware`는 OR).

공용 부품이 쓰이는 곳: PatientFinder — 진료·임상병리·수납(내원 모드), 약국·접수(환자 모드, 환자 검색만) / PatientChart — 수납·약국 / DocumentModal — 진료·수납·약국(편집), 임상병리·접수(읽기 전용, 발급·취소 버튼 숨김) / RadiologyReadings — 진료·수납.

**patient.routes.js** (`/api/patients`, 지금 전부 로그인만) — 접수 세션 파일

| 라우트 | 읽기/쓰기 | 부르는 화면 | 제안 |
|---|---|---|---|
| `GET /` (검색) | 읽기 | 접수, PatientFinder | registration, consultation, payment, pharmacy, lab |
| `GET /:id` | 읽기 | DocumentModal | registration, consultation, payment, pharmacy, lab |
| `GET /:id/history` | 읽기 | 접수, 진료, PatientChart | registration, consultation, payment, pharmacy |
| `POST /` · `PUT /:id` | 쓰기 | 접수 | **registration** |
| `GET /chart/:chartNo` | 읽기 | 없음 | registration |
| `GET /:id/billing-history` | 읽기 | 없음 | payment |

**visit.routes.js** (`/api/visits`, 지금 전부 로그인만) — 접수 세션 파일

| 라우트 | 읽기/쓰기 | 부르는 화면 | 제안 |
|---|---|---|---|
| `GET /today` | 읽기 | 접수, 진료 | registration, consultation |
| `GET /patient/:patientId` | 읽기 | PatientFinder(내원 모드) | consultation, lab, payment |
| `POST /` | 쓰기 | 접수 | **registration** |
| `PUT /:id/status` | 쓰기 | 접수(취소) | **registration** |
| `PUT /:id` | 쓰기 | 접수, **수납**(`Payment.jsx:232`, `visit_type`만 보냄, 오류 무시) | registration, payment — ⚠ 수납은 초진/재진만 바꾸므로, 수납 권한일 때는 `visit_type`만 받게 좁히는 것을 권함 |

**consult.routes.js** (`/api/consultations`) — 진료 세션 파일. 쓰기는 이미 전부 `consultation`.

| 라우트 | 읽기/쓰기 | 부르는 화면 | 제안 |
|---|---|---|---|
| `GET /visit/:visitId/prescriptions` | 읽기 | DocumentModal(진료·수납·약국) | consultation, payment, pharmacy |
| `GET /:id/prescriptions` · `GET /:id/orders` | 읽기 | 진료, PatientChart | consultation, payment, pharmacy |
| `GET /:id/diagnoses` | 읽기 | 없음 | consultation |

**document.routes.js** (`/api/documents`, 지금 전부 로그인만) — 진료 세션 파일

| 라우트 | 읽기/쓰기 | 부르는 화면 | 제안 |
|---|---|---|---|
| `GET /patient/:id` | 읽기 | DocumentModal | consultation, payment, pharmacy, lab, registration |
| `GET /:id` | 읽기 | 없음 | 위와 같음 |
| `POST /` (발급) · `POST /:id/void` (취소) | 쓰기 | DocumentModal 편집 사본(진료·수납·약국) | consultation, payment, pharmacy — 더 좁히려면 문서 **종류**별(예: 원외 처방전은 약국·진료)로. 실장님 판단 필요 |

**billing.routes.js** — 수납 세션이 이미 적용: 전부 `payment`, 미수금 조회(`GET /patient/:id/balance`)만 `payment` 또는 `registration`. 표와 맞음.

**그 밖에 로그인만 확인하는 것** (기준 자료·공통 — 대부분 그대로 두기를 권함)
- 그대로: `GET /api/admin/drugs`·`order-codes`·`departments`·`phrases`·`clinic`(여러 화면·상단바가 씀), `GET /api/version`·`/api/system/status`(누구나 — 의도), `GET /api/backup/status`(오류 문구는 이미 settings만).
- 좁힐 후보: `GET /api/admin/doctors`(접수만 부름, 전화·이메일 포함) → registration, consultation / `GET /api/order-sets` → consultation, settings / `GET /api/lab/test-items` → lab, settings / `GET /api/pacs/test` → settings / `GET /api/pacs/viewer-url` → consultation / `GET /api/pacs/readings/patient/:id` → consultation, payment / `GET /api/worklist` → consultation.
- **주의**: `PUT /api/worklist/:id/status`(쓰기)는 브리지 토큰 **또는 로그인만**이면 됩니다. 부르는 화면이 없으니 로그인 경로는 막거나 settings로 좁히기를 권함 (PACS 몫).
- 부르는 곳이 없는 라우트(정리 후보): `GET /api/patients/chart/:chartNo`, `GET /api/patients/:id/billing-history`, 진단 3개(`GET/POST /consultations/:id/diagnoses`, `DELETE /consultations/diagnosis/:dxId`), `GET /api/documents/:id`, `GET /api/order-sets/:id`, `GET /api/auth/me`, 워크리스트 3개.

**적용할 때 주의** (결정되면)
- 관리자(`admin`) 역할은 권한 7개를 다 가지므로 영향 없음. 영향은 **권한을 좁게 준 직원**에게만.
- **S1(토큰 12시간)과 묶어서 보세요**: 권한 검사를 넣어도 토큰 안의 권한을 믿으므로, 권한을 뺀 직원은 다시 로그인할 때까지 그대로입니다.
- 화면 쪽은 바뀌는 것이 없어야 합니다 — 위 표는 **지금 부르는 화면이 모두 통과하도록** 만든 것입니다. 적용 뒤 각 화면을 그 권한만 가진 계정으로 한 번씩 눌러 보면 확인됩니다 (403이 뜨면 표가 빠뜨린 것).
- 파일 주인: patient·visit = 접수, consult·document = 진료, worklist·pacs = PACS. 설정 세션은 표만 만들었습니다.

## 2026-09-29 — 제안: 약 저장이 재고를 덮어쓰는 문제 (약국 H4)

> **총괄 확인 (2026-09-29)**: `2a40e84`·`f5e7e55`·`56f2558`·`1874812` 합침(`72895a1`) + 실행 중 EMR 반영(반영 전 DB 백업). 확인: `node backend/test/settings.permissions.mjs` 전부 ok · 역할별 API(관리자 200, 의사·접수는 직원 관리 403) · 번역 키 세 언어 533개씩 같음. `DEPLOYMENT.md`에 `-Strict` 넣음. PACS 포트가 막힌 것은 실장님께 이미 보고됨(P-1, 재부팅 뒤 조치). `server-status.ps1`·`verify-backup`은 총괄이 직접 돌려 보지 않음 — 재부팅 뒤 P-1 확인 때 같이 돌려 봄. H4 제안은 약국 재고 결정(B)과 함께 결정 세션으로.

- **상태**: 보류 — 제안만 했습니다. 코드는 바꾸지 않았습니다. **실장님 결정 + 약국과 순서 맞추기**가 필요합니다.
- **문제** (약국 `pharmacy.md` 7절 H4): 설정 → 약품 탭에서 약 하나를 열면 편집 창이 그 순간의 행 전체를 들고 있다가, 저장할 때 `PUT /api/admin/drugs/:id`가 `stock_qty=$11`로 **받은 재고를 그대로 씁니다** (`admin.routes.js` DRUGS 절). 아침에 창을 연 목록(재고 100) → 낮에 30개 조제(70) → 오후에 그 목록에서 **단가만** 고쳐 저장 → 재고 100으로 돌아감. 경고 없음.
- **왜 「차이만 더하기」는 답이 아닌가**: 재고를 고치는 이유가 둘입니다. 「약이 20개 들어왔다」(더하기)와 「선반을 세어 보니 45개다」(맞추기). 사람이 본 값과의 차이를 더해 주면 앞의 경우는 맞지만(70+20=90), 뒤의 경우는 45가 아니라 15가 됩니다(70+(45−100)). 어느 쪽인지 서버는 알 수 없으므로, **조용히 계산해 주지 말고 다시 묻는 것**이 안전합니다.

### 제안 A — 지금 바로 할 수 있는 것 (설정 세션 파일만, 작음)

1. **편집 창을 열 때 본 재고를 같이 보냄**: `Settings.jsx`의 공용 `openEdit`(틀 코드, 설정 몫)에서 약이면 `stock_expected = stock_qty`를 복사본에 넣음. 약품 탭 안쪽(약국 몫)은 안 건드림.
2. **서버 규칙** (`PUT /api/admin/drugs/:id`, 트랜잭션 + `SELECT … FOR UPDATE`로 그 약 행 잠금 — 조제가 쓰는 것과 같은 잠금):
   - 보낸 재고 = 본 재고 → **재고는 건드리지 않음** (단가·이름만 고친 경우. 사이에 조제가 있어도 그대로 보존)
   - 보낸 재고 ≠ 본 재고, 그리고 지금 재고 = 본 재고 → 보낸 값으로 저장 (그 사이 아무도 안 바꿈)
   - 보낸 재고 ≠ 본 재고, 그리고 지금 재고 ≠ 본 재고 → **409** 「그 사이 재고가 바뀌었습니다 (지금 70). 다시 열어 확인하세요」 — 저장 안 함. 화면은 이 문구를 `se_` 키로 번역(약국처럼 고정 문구 비교, `api/client.js`가 상태 코드를 안 넘기므로)
   - `stock_expected`가 없는 요청(옛 화면을 새로고침하지 않은 브라우저) → 지금처럼 보낸 값을 씀. 배포 직후 잠깐만 해당.
3. **같은 API의 작은 버그 두 개도 같이** (약국 L6): 새 약의 `min_stock`이 비면 NULL로 저장됨 → 스키마 기본값 10을 쓰도록 `COALESCE`. 재고에 소수(7.5)를 넣으면 DB 오류 500 → 정수 검사로 400.
4. 확인: 격리 스택에서 창 열기 → API로 조제해 재고 줄이기 → 단가만 저장(재고 보존) / 재고 고쳐 저장(409) / 다시 열어 저장(성공). 약국의 `backend/test/pharmacy.api.mjs` 형식으로 `backend/test/settings.drugs.mjs`를 만들어 둠.

### 제안 B — 길게 보면 (약국 몫, 약국의 「2번 재고」 결정과 같이)

- 재고는 **움직임으로만** 바뀜: 입고(+N), 실사 조정(센 값으로 맞춤 + 이유), 조제(−N). 움직임마다 한 줄 기록하는 표(`drug_stock_log`, 약국 M5 — 약국 마이그레이션 번호대).
- 그러면 설정의 약 편집 창에서 재고 칸은 **읽기 전용**이 되고 「약국 화면에서 재고 조정」으로 안내. `PUT /api/admin/drugs/:id`는 재고를 **아예 안 받음**.
- A의 서버 규칙은 B가 들어올 때까지 유효하고, B가 들어오면 재고 부분만 지우면 됩니다. A와 B는 서로 막지 않습니다.

- **권하는 순서**: A를 먼저(작고, 지금 운영에서 재고가 조용히 틀어지는 것을 막음) → B는 약국 재고 결정 때.
- **실장님께 여쭐 것**: A를 진행해도 될지. 재고 숫자는 약국 업무에 직접 걸린 부분이라 결정을 받고 하겠습니다.
- **다른 세션에 부탁**: **약국** — A는 약품 탭 안을 안 건드리지만, 409 안내가 약품 탭 편집 창에서 뜹니다. B를 설계할 때 설정 쪽 재고 칸을 읽기 전용으로 바꾸는 것은 약국이 하셔도 되고(탭 안), 서버 PUT에서 재고를 빼는 것은 설정이 맞춰 하겠습니다.

## 2026-09-29 — 서버 권한 목록을 한 곳으로 (U9)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`f5e7e55` 위)
- **한 일**: 서버에 네 번 적혀 있던 권한 목록(`admin.routes.js`의 `ALL_PERMS`, `auth.routes.js`의 `allPerms`, `middleware/auth.js`의 `defaultPermsForRole`)을 새 파일 **`backend/src/middleware/permissions.js`** 하나로 모았습니다(`ALL_PERMS`·`ROLE_DEFAULT_PERMS`·`defaultPermsForRole`). 기준은 총괄 지시대로 `frontend/src/modules.js`이고, 백엔드 이미지는 `backend/`만으로 빌드되어 그 파일을 불러올 수 없으므로, 두 목록이 같은지 보는 검사 **`backend/test/settings.permissions.mjs`** 를 넣었습니다. 설치·서버·DB 없이 파일 두 개만 읽습니다. `permissions.js`를 의존성 없는 별도 파일로 뺀 것은 이 검사가 `npm install` 없이 돌게 하려는 것입니다.
- **동작 변화**: 없음. `defaultPermsForRole`은 전처럼 매번 새 배열을 돌려줍니다(얼린 목록을 복사). pg 드라이버에는 일반 배열을 넘깁니다.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `backend/src/routes/auth.routes.js` · `backend/test/settings.permissions.mjs`(새) · `wiki/modules/settings.md`
- **공용 파일 변경**: **`backend/src/middleware/auth.js`** — 권한 목록·역할 기본값을 지우고 `./permissions`에서 가져옴, `module.exports`에 `ALL_PERMS`·`ROLE_DEFAULT_PERMS` 추가(기존 이름은 그대로 내보냄). **`backend/src/middleware/permissions.js`(새 파일)** — 공용 폴더라 적습니다. 모듈을 추가할 때 `modules.js`와 이 파일을 같이 고쳐야 합니다.
- **DB 마이그레이션**: 없음 (`013`에도 같은 목록이 있지만 적용된 파일이라 안 건드림) · **번역 키**: 없음
- **확인한 방법**: `node --check` 4개 파일. `node backend/test/settings.permissions.mjs` → 8개 모두 ok, exit 0. 스크래치 복사본에서 `modules.js`에 모듈 하나를 더하면 → FAIL, exit 1. 격리 스택 9187을 **빈 DB로 다시 만들어**(`down -v`, 격리 스택 DB만) — 첫 실행 관리자 만들기 → 권한 7개 / 설치 관리자를 아이디·역할·권한·상태 바꿔 저장 → `admin`·admin·7개·active로 고정됨 / 접수 직원 로그인 → `["registration","payment"]`, `/admin/staff` 403.
- **확인 못 한 것**: 권한 배열이 없는 옛 토큰(`defaultPermsForRole` 경로)은 서버로는 안 해 봤습니다 — 검사 스크립트가 역할별 값을 확인합니다.
- **위키**: `modules/settings.md` 3-1절, 4절, 7절(U9 고침), 8절
- **총괄 확인 요청**: 위 공용 파일 두 개. 다른 세션 라우트는 `middleware/auth.js`에서 가져오는 이름이 그대로라 영향 없습니다.
- **다른 세션에 부탁**: 없음

## 2026-09-29 — 설정 화면 영어 고정 글자를 세 언어로 (U1, 약국 부탁 포함)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`2a40e84` 위)
- **한 일**: 약국 세션이 부탁한 세 곳(공용 삭제 확인 「Delete?」, 탭 이름 「💊 Drugs」, 편집 창 제목 「+ Add」)과, 같은 종류의 영어 고정 글자를 설정 세션 몫 전체에서 `se_` 키로 옮겼습니다 — 탭 이름 6개, 직원·오더 코드·상용구·진료과·병원 정보 탭의 머리글·표 제목·「+ Add」 버튼·편집 창 입력 칸, 오류(`Error:`)·저장 알림, 오더 코드 종류 필터. 역할(`admin`→관리자/Administrateur)·오더 종류(`fee`→진료비/Frais)·상태(`active`→활성/actif)는 **표시만** 번역하고 저장 값은 그대로입니다. 직원 「삭제」는 실제로 비활성화라서 확인 창을 「이 직원을 비활성으로 바꿀까요? 로그인할 수 없게 됩니다. 기록은 남습니다.」로 바꿨습니다. 위키 2절에 **역할별 기본 권한 표**(총괄 부탁 — 수납 창구 계정용)를 넣었습니다.
- **일부러 안 한 것**: 약품 탭 **안쪽**(표 머리글·편집 창 칸 — 약국 몫, 약국이 부탁한 탭 이름만 옮김), 오더 연동 탭(PACS 몫), 분류 드롭다운 값(Consultation·Laboratory…, General·Internal… — DB에 저장되는 값이라 번역하면 데이터가 바뀜).
- **바꾼 파일**: `frontend/src/pages/Settings.jsx` · `wiki/modules/settings.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_` 표시 사이에 키 66개 추가 (지금 `se_` 79개씩). 기존 키는 안 건드림. `Settings.jsx`의 **약품 탭**(약국 몫)은 탭 이름 한 줄과 공용 삭제 확인·편집 창 제목만 바뀜.
- **DB 마이그레이션**: 없음
- **번역 키**: `se_tab*` 6 · `se_col*` 14 · `se_f*` 22 · `se_role_*` 5 · `se_type_*` 4 · `se_status*` 2 · `se_addBtn` `se_newTitle` `se_confirmDelete` `se_confirmDeactivate` `se_error` `se_saved` `se_all` `se_none` `se_on` `se_off` `se_clinicTitle` `se_clinicIntro` `se_clinicNote` — ko·en·fr 모두 (node로 세 파일 79개씩 확인)
- **확인한 방법**: `npm run build` 통과. 격리 스택 9187에서 프랑스어: 탭 목록·직원 표·「+ Ajouter」 편집 창(Nouvel élément, Identifiant, Mot de passe, Rôle (étiquette), Accueil…)·오더 코드(Tous/Frais/Laboratoire/Imagerie/Acte, 종류 배지)·병원 정보 탭. 한국어: 직원 탭(관리자·활성·+ 추가). 삭제 확인 문구는 `window.confirm`을 「취소」로 답하는 가짜로 바꿔 문구만 확인(실제 비활성화 안 함).
- **확인 못 한 것**: 영어 화면, 상용구·진료과 편집 창 화면(코드로만), 삭제 확인 창의 실제 모양.
- **위키**: `modules/settings.md` 2절(버튼 이름 한국어/Français로, 역할별 기본 권한 표), 7절(U1 대부분·U7 고침), 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: **약국** — 약품 탭 안쪽(표 머리글 Code·Name·Cat·Dose·Freq·Days·Route·Price·Stock, 편집 창 칸, 탭 머리의 「💊 Drugs」·「+ Add」)은 그대로입니다. 같은 방식으로 옮기려면 공용 키 `se_addBtn`·`se_colCode`·`se_colName`·`se_colPrice`·`se_fCode`·`se_fName`을 써도 됩니다. **PACS** — 오더 연동 탭의 「Save」「Loading...」「Bridge Token」「Host / IP」「AE Title」.
- **남은 일**: H4 제안, U9, S2 권한표 초안.

## 2026-09-29 — 서버 상태 창 포트 검사 · 백업 검사 스크립트 (총괄 부탁)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`develop` `5e0e056`을 ff로 당긴 뒤)
- **한 일**:
  1. **`server-status.ps1` 호스트 포트 검사 (B11)**: `bethesda-emr-web`·`bethesda-pacs`가 게시하도록 설정된 포트(Docker `HostConfig.PortBindings`에서 읽음 — 9080·9090·4242)마다 호스트에서 TCP 연결(1초). 안 되면 그 줄을 빨강 「접속 안 됨 / INACCESSIBLE」로, 옆 칸에 「4242 포트를 Windows가 막음」(예약 구간 안) 또는 「9090 포트 닫힘」, 아래 안내는 「Windows가 포트를 막고 있습니다… DEPLOYMENT.md의 Windows 절」. `netsh … excludedportrange`는 막힌 포트가 있을 때만 부르고, 숫자 쌍만 읽어 언어와 무관.
  2. **상태 창 배치 버그 (B12, 원래부터 있던 것)**: 실제 화면을 캡처해 보니 맨 위 색 띠가 **첫 두 줄(환자 기록 DB·앱 서버)을 덮고 있었습니다** — DB가 멈춰도 「PROBLEME」만 보이고 어느 줄인지 안 보이는 상태. 도킹 순서(`$rows.BringToFront()`)와 남는 높이(빈 마지막 줄)로 고침.
  3. **`verify-backup.ps1`·`.sh` (B4·B5)**: 백업 위치를 Docker의 `/backups` 마운트에서 찾음. `-DbContainer`/`-ApiContainer`/`-BackupDir`(`.sh`는 환경변수) 추가. **B5를 격리 스택에서 먼저 재현**(백업 뒤 상용구 1개 추가 → 옛 스크립트 「VERIFY FAILED - Do not rely on it」 + 「id가 충돌한다」)한 뒤, 판정을 둘로 나눔: 구조(테이블 누락·스키마) 차이는 실패(업데이트로 마이그레이션이 늘었으면 [info]), 데이터 차이는 [info] — `-Strict`/`--strict`에서만 실패. 멈춘 DB 컨테이너를 「돌고 있음」으로 보던 것도 고침.
- **바꾼 파일**: `server-status.ps1` · `verify-backup.ps1` · `verify-backup.sh` · `wiki/modules/settings.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음 · **번역 키**: 없음 (스크립트 안의 fr·en·ko 문자열만)
- **확인한 방법**:
  - `server-status.ps1`: 파서 오류 0, BOM 유지. 이 PC의 **실행 중 EMR을 읽기만** 해서 `-Console -Lang fr/ko` → PACS 줄 down 「port 4242 bloque par Windows, port 9090 ferme」, 종료 코드 2. **이 PC에서 실제로 PACS 4242·9090이 막혀 있습니다** (`bethesda-pacs` Up healthy, 동적 포트 범위가 1024부터, 4242가 예약 구간 4204–4303 안). 창 모드는 스크래치 복사본으로 띄워 `CopyFromScreen` 캡처 → 고치기 전 띠가 두 줄을 가림, 고친 뒤 7줄 모두 보임 (fr·ko).
  - `verify-backup.ps1`: ASCII만, 파서 오류 0. 격리 스택 9187(`-DbContainer bethesda-s-settings-db`)에서 — 백업 뒤 변경 → VERIFIED + [info] / `-Strict` → 실패 「phrase_dictionary: live 26 rows, backup 25」 / 새 백업 직후 `-Strict` → 「identical」 / 절반 잘린 파일 → 「damaged」 exit 1, 임시 DB 0개(`exit`해도 `finally` 실행) / 옛 백업 → 비교 생략. `BACKUP_PATH`(임시 폴더)를 스스로 찾음.
  - `verify-backup.sh`: `sh -n` 통과, Git Bash로 같은 격리 스택에서 기본·`--strict` 확인.
- **확인 못 한 것**: 실제 Linux·NAS(busybox)에서 `.sh`는 돌려 보지 않았습니다(Git Bash만). 업데이트 뒤(마이그레이션 수 차이) 경로는 만들어 보지 않았습니다. 상태 창을 15초 주기로 오래 띄워 두는 것은 보지 않았습니다.
- **위키**: `modules/settings.md` 2-9·2-10(새)·3-5·3-6·7절(B4·B5 고침, B11·B12 추가)·8절
- **총괄 확인 요청**:
  - **이 PC의 PACS가 지금 밖에서 접속되지 않습니다** (4242·9090). PACS 세션 P-1과 같은 원인으로 보입니다. `DEPLOYMENT.md`의 `netsh int ipv4 set dynamicport …`은 관리자 권한·재부팅이 필요한 시스템 설정이라 이 세션은 건드리지 않았습니다 — 실장님께 전달 부탁드립니다.
  - `verify-backup`의 판정 기준이 바뀌었습니다 (데이터 차이는 기본적으로 실패가 아님). `DEPLOYMENT.md` 「Check a backup before you need it」 절에 `-Strict` 한 줄을 넣으면 좋겠습니다 (총괄 소유).
- **다른 세션에 부탁**: **PACS** — 상태 창이 이제 호스트 포트를 봅니다. `pacs.md`의 P-1 표(「EMR 상태 화면의 PACS 검사만 잡아냄」)에 서버 상태 창도 추가해 주세요.
- **남은 일**: U1(설정 화면 영어 고정 글자), H4 제안, U9, S2 권한표 초안 — 이어서 합니다.

## 2026-09-29 — 백업 안전장치 (동시 실행 · 최소 보관 · 실패 표시 · 시각)

> **총괄 확인 (2026-09-29)**: 합침(`1ca4b79`) + 실행 중 EMR 반영. 확인: `/backup/status`에 `state: ok` · `minKeep 7` · 백업 16개 · 최근 9시간 전, 서버 로그 「keep 30d (never fewer than 7)」, 백업 탭 초록 띠(화면). 요청: `.inprogress` 폴더는 위키·이 노트에 기록됨 · B10 `DEPLOYMENT.md` 5b에 PowerShell/cmd 한 줄 넣음 · 이미지 이름표는 `657ba2c`로 해결 · 16:49 재생성은 총괄 배포(`7ad4387`)가 맞음. S1·S2·U9·B9는 다음 차례.

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
