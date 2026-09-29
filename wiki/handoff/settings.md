# 설정 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 7절 남은 항목: 결정 필요 / 결정 없이 가능 (총괄 요청)

- **상태**: 보고 (코드 변경 없음). 2026-09-29 지금 코드에서 하나씩 다시 확인함.
- **결정 필요** (추천 먼저):
  - **U3** 상태 조회(`/api/system/status`)를 화면 어디에서도 안 부름 — 상태 창은 서버 PC에서만 보임. 선택: (가) 상단바에 작은 점(초록/노랑/빨강), 설정 권한만 누르면 목록 **추천** (나) 모든 직원에게 점 (다) 설정에 「État」 탭만. 오늘 더한 영상 백업·옛 버전 백업·옛 주소 경고가 서버 PC 밖에서도 보이게 됨. 상단바(`TopBar.jsx`)는 공용 파일.
  - **S3** 「설치 때 만든 관리자」를 아이디 `admin`으로 알아봄 — 설치 화면은 아이디를 자유롭게 받음. 지금 PC·새 PC(복원)는 `admin`이라 실제 위험은 없음(`login_id` UNIQUE라 다른 `admin`도 못 만듦). 선택: (가) 설치 화면에서 아이디를 `admin`으로 고정 **추천**(작음) (나) 설치 관리자 id를 따로 저장(마이그레이션) (다) 그대로.
  - **S5** 로그인 실패 횟수 제한 없음 — 잠그면 직원이 잠길 수 있어 현장 부담(실장님 「복잡하지 않게」). 선택: (가) 그대로 — LAN 안 **추천** (나) 같은 아이디 10번 실패 → 5분 대기(잠금 없음).
- **결정 없이 가능** (작은 것부터):
  - **U8** 진료과 저장 뒤 관계없는 `setPacsConfig(...)` 한 줄(`Settings.jsx` 232행 근처) — 지움.
  - **S10** 권한 배열을 `ALL_PERMS`로 걸러 저장, PUT의 `login_id` 공백 제거·빈 값 400, 안 쓰는 `bcryptjs` import 삭제(패키지는 그대로).
  - **S7** 비활성 계정에 「Account is inactive」를 **비밀번호가 맞을 때만**(틀리면 보통 「틀림」) — 계정 존재·상태가 드러나지 않게. 로그인 화면 안내는 그대로.
  - **S9** 마지막 관리자 검사·첫 관리자 만들기를 advisory lock으로 한 번에 하나씩 — 동시 강등·동시 설치 방지.
  - **U5** 병원 정보의 앱 제목을 비우면 기본값 「Bethesda EMR」으로(지금은 이전 값 유지).
  - **U6** 로그인 화면 로고 글자 「M」(옛 이름 MedConnect) → 「B」.
  - **B7** 상태 창·상태 조회의 디스크 검사가 백업 드라이브만 봄 → Docker 데이터가 있는 드라이브(C:)도 함께(BACKUP_PATH가 D:일 때).
  - **B8** 백업 내려받기가 파일을 브라우저 메모리에 통째로 올림 — 지금 백업은 18KB라 급하지 않음. 몇 년 뒤 수백 MB가 되면 문제. 짧게 사는 내려받기 표(쿼리 토큰 대신 1회용)로 바꾸는 설계가 필요해 **맨 뒤**.
- **남은 것 없음(다른 세션 몫)**: U1의 나머지 — 약품 탭 안쪽(약국), 오더 연동 탭(PACS), 분류 값(DB 저장 값이라 번역 안 함).
- **제안 순서**: U8 → S10 → S7 → S9 → U5 → U6 → B7 (한두 커밋), 결정이 나면 U3·S3.

## 2026-09-29 — 정리 스크립트 표지 파일 설명 · 기록 탭 차트번호 안내 (총괄 ①②)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `a51c62e` 위)
- **① 표지 파일**: 총괄이 더한 `KEEP-TEST-DATA.txt` 가드(`6d93954`)를 위키 3-11 안전장치 0번, 2.13 6단계에 설명 — 준비한 PC에서는 멈춤, git·설치 묶음에 없음, **새 PC로 옮기지 말 것**.
- **② 차트번호 겹침**: 정리 뒤 새 환자가 26-00001을 다시 받으므로, 기록 탭에 남은 시험 줄의 차트번호가 새 환자와 같아 보일 수 있음. 위키 2.14(직원용 기록 탭)·3-11, `clean-test-data.ps1` 끝 「Next」 안내에 세 줄(ASCII). 화면 글자는 바꾸지 않음(정리한 날 이후로는 해당 없는 안내라서).
- **바꾼 파일**: `clean-test-data.ps1`(끝 안내만) · `wiki/modules/settings.md`(2.13, 2.14, 3-11, 8절)
- **확인한 방법**: PowerShell 파서 오류 0, ASCII 확인.
- **다음 할 일**: 7절 남은 항목을 「결정 필요 / 결정 없이 가능」으로 나눠 보고.

## 2026-09-29 — 영상 백업 상태 줄 · 기록 탭의 검사 판정·포장 단위 (총괄 「설정 세션에게 (저녁)」)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`4336d19` 위)
- **영상 백업 상태** (PACS `4d0b196`의 부탁):
  - `status.routes.js` `checkImageBackup` → `pacs_image_backup` 항목. 보고 없음 → off, `last_seen` 36시간 넘음 → `status.imageBackup.silent`, `disk_found` false → `noDisk`, `ok` false → `failed`(`values.error`), `last_success` 없음·36시간 넘음 → `stale`, 여유 10% 미만 → `nearlyFull`, 모두 warn. 판단 순서도 이대로.
  - `server-status.ps1` `Get-ImageBackupCheck`: `bethesda-pacs`의 compose 폴더 `logs\image-backup-status.json`. 파일이 없으면 줄 없음(영상 백업을 안 깐 PC). 같은 규칙(`at` 기준 36시간), 노란 A CORRIGER + 맨 아래 안내(fr·en·ko). 줄이 최대 9개가 되어 창 높이 560 → 640. BOM 유지.
- **기록 탭** (임상병리 `97af696`·진료 `33e70a5`): 검사 결과의 `flag` 값을 말로(fr bas/normal/élevé/anormal, ko 낮음/정상/높음/이상, en low/normal/high/abnormal, 빈칸 —). `total_qty`는 이미 칸 이름이 있었음(`se_fld_totalQty`). 처방 기록에 새로 생긴 `pack_label` 칸 이름·값(`ph_pack_*`). 「값을 지운 줄은 값만」(선택)은 이미 — 지운 줄은 비어 있던 칸을 빼고 보여 줌(139b9fc).
- **바꾼 파일**: `backend/src/routes/status.routes.js` · `server-status.ps1` · `frontend/src/pages/settingsAudit.js` · `wiki/modules/settings.md`(2.10, 3-6 표, 3-10, 8절)
- **공용 파일 변경**: i18n `se_fld_packLabel`, `se_flag_low/normal/high/abnormal`.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, PowerShell 파서 오류 0, `npm run build`. 격리 스택: `service_heartbeat`에 줄을 바꿔 넣어 상태 API 7가지(off / ok / silent / noDisk / failed·오류 글자 / stale / nearlyFull) 통과. 상태 창은 **실행 중 PACS 폴더를 건드리지 않게** 스크래치 사본에서 PACS 폴더 자리를 가짜 폴더로 바꿔 파일 없음·정상·디스크 없음(fr)·실패·거의 참(ko)·보고 없음(en), 창 캡처(9줄 모두 보임). 기록 탭: 격리에서 WBC 7 → 20으로 고친 실제 줄 — fr 「Indicateur: normal → élevé」, ko 「판정: 정상 → 높음」.
- **다음 할 일**: 총괄의 정리 스크립트 검토 반영.

## 2026-09-29 — 시험 데이터 정리 스크립트 (결정 C) · backup-cli 작업 폴더

- **상태**: **총괄 검토 요청** (데이터를 지우는 스크립트 — 규칙대로 검토 뒤에만 쓰임)
- **커밋**: session/settings — 이 항목과 같은 커밋 (`a69f713` 위; `a69f713` = backup-cli가 끝나면 자기 작업 폴더를 지움, 총괄 「작은 것」)
- **한 일**: 앱 폴더에 `clean-test-data.ps1`(새, ASCII, PS 5.1). 무엇을 지우고·끄고·남기는지, 안전장치 8개, 번호 표, 시험 결과는 `modules/settings.md` **3-11절**에 모두. 2.13의 6단계를 이 스크립트로 바꿈.
- **총괄 조건과 대응**:
  - 이 PC에서 돌리지 않음 → 스크립트가 알아보는 방법은 「DB가 방금 복원한 백업 파일과 id까지 똑같은가」. 이 PC의 실행 중 EMR도 가장 새 백업 뒤로 아무것도 입력되지 않았다면 통과할 수 있습니다 — 그래서 확인 글자 앞에 「NEW PC, right after restoring?」 경고와 목록을 보여 주고, 위키·스크립트 머리에 「NEVER RUN THIS ON THE OLD PC」. 컨테이너 이름으로는 막을 수 없음(새 PC도 `bethesda-emr-*`).
  - 지울 것의 수·환자 이름·차트번호 목록 → 확인 글자 `DELETE <환자 수>`. 컨테이너 이름 인자, 기본값 없음(Mandatory).
  - 실제 환자를 넣은 뒤 잘못 돌려도 안 지워짐 → 11개 표의 id가 백업 파일과 정확히 같을 때만(한 건만 더 있어도 멈춤 — 시험함).
  - 한 트랜잭션·실행 전 자동 백업 → 둘 다. 트랜잭션 안에서 표를 잠그고 다시 셈.
  - 남길 것 → 11개 표만 지움. 재고 기록의 조제 줄은 FK SET NULL로 남음(확인: 25줄 그대로), 안내에 「실사로 맞춤」.
  - 차트번호 029 → 확인만(26-00001). 영수·문서·오더 번호 표 → 3-11. 문서 번호 시퀀스만 처음으로 돌림(모든 문서가 지워지므로), accession은 영상 서버의 시험 검사와 겹치지 않게 그대로.
  - 기록 탭의 시험 줄은 남음 → 안내 한 줄. 끈 계정은 기록에 5줄(「clean-test-data.ps1」).
  - 격리 스택: 복원 → 스크립트 → 화면·통계·수납·약국 재고·월말 보고서 → verify-backup → 모두 함(3-11).
- **Linux용 `.sh`는 만들지 않음** — 새 PC가 Windows. 필요하면 말씀해 주세요.
- **바꾼 파일**: `clean-test-data.ps1`(새) · `wiki/modules/settings.md`(2.13, 3-11 새, 8절)
- **DB 마이그레이션**: 없음.
- **다음 할 일**: 총괄 검토 반영. 그 뒤 「설정 세션에게 (2026-09-29 저녁)」 — 영상 백업 상태 줄, 기록 탭 검사 판정 값, `total_qty` 칸 이름.

## 2026-09-29 — 위키 2.13을 5b에 맞춤 · 권한 시험에 /visits/day (총괄 ④⑤)

- **상태**: 확인 요청
- **커밋**: session/settings — `4f5ba87` (`39440aa` 위). 이 항목은 명령줄 따옴표 문제로 글자가 빠져 다음 커밋에서 다시 씀.
- **④ 위키 2.13**: 「확인 대기」였던 옛 백업 절차를 **`DEPLOYMENT.md` 5b 「If the backup is older than the app」를 그대로 쓰라**로 바꿈(먼저 파일로 풀기 → DB 비우기와 복원을 한 트랜잭션). 기본은 같은 버전 백업 — 업데이트 스크립트가 끝에 새 버전 백업을 만들고, 백업 탭이 초록이면 같은 버전(2.7). 시험 데이터 표 제목은 「결정 세션에서 결정 대기 — 추천 C에 총괄 동의」. 모듈 문서 맨 위 상태 줄도.
- **⑤ `settings.access.mjs`**: `GET /visits/day` → registration만(라우트의 `permMiddleware('registration')`와 같음). **112 × 11 = 1232건 모두 표와 같음.**
- **바꾼 파일**: `wiki/modules/settings.md`(1행, 2.13, 8절) · `backend/test/settings.access.mjs`
- **DB 마이그레이션**: 없음.
- **다음 할 일**: 결정 세션의 시험 데이터 답(A~D) 대기 — C면 정리 스크립트를 써서 총괄 검토.

## 2026-09-29 — 가장 새 백업이 앱보다 옛 버전이면 경고 · verify-backup이 옛 버전을 알아봄 (총괄 ③)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`90daed6` 위)
- **판단 방법**: 백업 파일 안의 `schema_migrations` 줄(파일 이름) ↔ DB의 줄. DB에만 있는 것이 있으면 older, 백업에만 있으면 newer. 백업을 만들 때 버전을 따로 적어 두는 방식은 이미 있는 백업(오늘 것들)에 쓸 수 없어서 택하지 않음. 백업 파일은 바뀌지 않으므로 파일마다 한 번만 읽고 기억(API: 이름·크기·시각, 상태 창: 같은 키), 블록이 끝나면 읽기를 멈춤.
- **한 일**:
  - `backend/src/services/backup-version.js`(새) `newestBackupVersion()`.
  - `GET /api/backup/status`에 `version`, `GET /api/system/status`의 백업이 `status.backup.oldVersion`(warn, `missing` 목록).
  - 설정 → 백업 맨 위 띠: 다른 문제가 없고 older면 노란 「La sauvegarde la plus récente date d'une version plus ancienne de l'EMR」 + 「Sauvegarder를 누르세요」. 다른 노랑·빨강일 때는 그 아래 한 줄 더. `se_bkOldVersion`·`se_bkOldVersionHint`.
  - `server-status.ps1`: 백업 줄이 노란 **A CORRIGER** 「plus ancienne que l'application (N …)」 + 아래 안내. DB가 OK일 때만. BOM 유지.
  - `verify-backup.ps1`·`.sh`: 임시 DB에 복원한 뒤 `schema_migrations` 비교 — 옛 버전이면 [info]로 빠진 업데이트 이름과 「5b 'If the backup is older than the app'」, 끝의 VERIFIED 아래 노란 한 줄. `-Strict`/`--strict`는 실패(「press Back up now first」). 같은 버전이면 [ok] 「same version as the running app」.
- **바꾼 파일**: 위 파일들 + `frontend/src/pages/Settings.jsx`(백업 띠) · `wiki/modules/settings.md`(2.7 표, 2.10, 2.11, 3-5, 8절)
- **공용 파일 변경**: i18n `se_bkOldVersion`·`se_bkOldVersionHint`.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, PowerShell 파서 오류 0(`server-status.ps1`·`verify-backup.ps1`), `sh -n verify-backup.sh`, `npm run build`. 격리 스택에서 DB에 가짜 `schema_migrations` 줄을 넣어 「업데이트」를 흉내(시험 뒤 지움): API 8개(백업 직후 same·상태 ok → 줄 추가 후 older·이름·상태 warn → 새 백업 후 same → 줄 삭제 후 newer) 통과. verify-backup.ps1·.sh 보통 → VERIFIED + 옛 버전 안내, strict → VERIFY FAILED(종료 1). 상태 창 사본(컨테이너 이름만 격리로) 프랑스어·한국어 백업 줄과 안내. 화면: 프랑스어 노란 띠 → Sauvegarder → 초록, 한국어 노란 띠(버튼 이름 「지금 백업」으로 맞춤). `settings.access.mjs` 1221건, messages 통과.
- **총괄 참고**: `DEPLOYMENT.md`(총괄 파일) 「Updating」의 단계 목록이 4개로 남아 있습니다 — ② 커밋 `90daed6`로 **5. 업데이트된 DB를 한 번 더 백업**이 생겼습니다. 5b의 「After every update, take a backup」도 스크립트가 해 준다고 바꿀 수 있습니다(손으로 업데이트했을 때는 여전히 필요).
- **다음 할 일**: ④ 위키 2.13 ↔ 5b ⑤ `/visits/day`.

## 2026-09-29 — 업데이트 뒤 백업 한 번 더 (총괄 ②, 공용 파일 허락)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`c891715` 위)
- **한 일**: `update.ps1`·`update.sh`에 5단계 — 새 버전이 켜지고 `/api/health`가 통과한 **뒤에만** `docker exec bethesda-emr-api node src/services/backup-cli.js update`. 건강 확인이 실패하면 이제 종료 코드 1로 멈춤(전에는 노란 글만 내고 0). 백업이 실패하면 업데이트는 끝났다고 알리고 「Settings > Backup에서 Back up now」 안내.
- **왜 셸 한 줄이 아니라 `backup-cli.js`**: 처음에는 API 컨테이너에서 `pg_dump` 한 줄로 했는데, Alpine에 시간대 자료가 없어 `date`가 UTC(앱 이름은 병원 시각 — 3시간 차이), 호스트 시각을 넘기면 이 PC는 한국 시각이라 또 다름. 앱의 `dumpOnce`를 그대로 쓰면 이름·자리·`gzip -t`·원자적 옮기기·정리가 앱과 같음.
- **`backup.js` 변경(백업 로직 — 총괄 허락 범위)**: `dumpOnce(trigger, workDir)`와 `clearWorkDir(dir)`에 작업 폴더 인자, `dumpOnce` 내보내기. **서버 경로는 인자 없이 전과 같음.** 이유: CLI는 다른 프로세스라 서버의 `running` 잠금을 못 보고, 같은 작업 폴더를 쓰면 시작할 때의 `clearWorkDir()`가 서버가 쓰는 중인 파일을 지울 수 있음 → CLI는 `/backups/.inprogress-<trigger>`.
- **바꾼 파일**: `backend/src/services/backup.js` · `backend/src/services/backup-cli.js`(새) · **`update.ps1`·`update.sh`(공용, 허락)** — 단계 표시 /4 → /5, 4단계 실패 시 exit 1, 5단계. `update.ps1`는 CRLF 그대로. · `wiki/modules/settings.md`(3-4, 8절)
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, `sh -n update.sh`, `update.ps1` PowerShell 파서 오류 0. 격리 스택 API에서 CLI → 종료 0, `bethesda_2026-09-29_1353.sql.gz`(병원 시각, 앱이 같은 시각에 만든 이름과 같은 꼴), 두 번 동시에 → 둘 다 0·남은 임시 파일 없음·모든 파일 `gzip -t` 통과, 곧바로 `verify-backup.ps1 -Strict` **VERIFIED**(26 테이블). **업데이트 스크립트 전체는 돌리지 않음** — 실행 중 EMR(`bethesda-emr-*`)을 대상으로 하므로. 5단계 명령 자체만 격리 컨테이너 이름으로 확인.
- **다음 할 일**: ③ 옛 버전 백업 경고·verify-backup ④ 위키 2.13 ↔ 5b ⑤ `/visits/day`.

## 2026-09-29 — 약속처방 편집 창에 포장 단위 약의 병·튜브 수 (총괄 ①, 진료 세션 부탁)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `76457c9` 위)
- **한 일** (`Settings.jsx` 약속처방 편집 창만): 약 줄의 약이 **지금** 포장 단위 약이면(`drugs` 목록의 `pack_unit` — 설정이 이미 불러 둔 목록) 용량×횟수×일수 대신 **수 칸 + 단위 말**(`ph_pack_*`). 불러올 때 `quantity`를 숫자로(DB는 DECIMAL이라 「3.000」으로 보였음). 저장 전 포장 줄은 1 이상의 정수인지 확인(아니면 `se_errNotWhole` 「Quantité : …」). 보통 약 줄은 전처럼 1.
- **라우트는 고치지 않음**: `orderset.routes.js`는 진료 세션 소유(위키 5절). 처음에는 항목에 약의 표시를 붙이고 서버에서 수를 검사하게 고쳤다가 되돌렸습니다 — 서버는 여전히 아무 숫자나 받습니다(`it.quantity || 1`). 서버에서도 막고 싶으면 진료 세션 몫.
- **숨긴 약**은 목록에 없어서 보통 줄로 보입니다(진료 화면은 그런 줄을 넣지 않음).
- **바꾼 파일**: `frontend/src/pages/Settings.jsx` · `backend/test/settings.ordersets.mjs`(새 — 수가 저장·읽힘, 빈 값·0은 1) · `wiki/modules/settings.md`(2.9, 8절)
- **공용 파일 변경**: i18n `se_setPackQtyHint`.
- **확인한 방법**: `npm run build`, 격리 스택 `settings.ordersets.mjs` 4개, 화면: 프랑스어 AMOX250(Flacon) 줄에 수 칸 — 2.5로 저장 → 「Erreur: Quantité : saisissez un nombre entier.」, 4로 저장 → 한국어로 다시 열면 「4 병」, 보통 약 줄은 「4.000×2×3」 그대로. 진료 화면에서 세트를 적용해 병 수가 들어가는지는 약국 세션의 끝에서 끝까지 확인에 포함됨(진료 `applySet`의 `pack_qty: it.quantity`).
- **다음 할 일**: ② 업데이트 뒤 백업 ③ 옛 버전 백업 경고·verify-backup ④ 위키 2.13 ↔ 5b ⑤ `/visits/day`.

## 2026-09-29 — 오더 연동 주소가 옛 포트면 경고 (총괄 요청)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `8ed5881` 위)
- **한 일** (값은 어디서도 자동으로 바꾸지 않음):
  - **설정 → 오더 연동**: EMR 주소 칸이 `:8080`이면, PACS 웹/뷰어 주소 칸이 `:8090`이면 칸 바로 아래 노란 줄(`se_oldEmrPort`·`se_oldViewerPort`, ko·en·fr). 칸을 고치는 순간 사라짐. `Settings.jsx`는 **오더 연동 탭(PACS 몫) 안의 두 칸 아래 한 줄씩 + 판정 함수 `oldPort` 하나** — 총괄 지시로 손댐, 다른 부분은 그대로.
  - **서버 상태 API** `GET /api/system/status`: 새 항목 `pacs_address` — 둘 다 비면 off, 옛 포트면 warn `status.pacsAddress.oldPort` `{old:[{field,url,port,use}]}`, 아니면 ok.
  - **서버 상태 창** `server-status.ps1`: DB가 OK일 때 `docker exec bethesda-emr-db psql`로 두 주소를 읽어, 옛 포트면 8번째 줄 「Adresses de l'imagerie (Parametres) · **A CORRIGER** · ancien port 8090 -> 9090」과 맨 아래 안내. 옛 포트가 없으면 줄이 없음(7줄 그대로). BOM 유지, 창 높이 안에 들어감.
  - 설정 화면 예시 문구: `NAS_IP:8090`은 이미 없음(`NAS_IP:9090`, `egUrl` `:9080`) — 고칠 것 없음.
- **판정**: `스킴://호스트:포트` 모양의 포트만 봄 — `http://host:80800`·`http://my8090host:9090`은 해당 없음, 끝의 `/`는 괜찮음.
- **바꾼 파일**: `frontend/src/pages/Settings.jsx` · `backend/src/routes/status.routes.js` · `server-status.ps1` · `wiki/modules/settings.md`(2.10, 2.13 4단계, 3-6 표, 8절)
- **공용 파일 변경**: i18n `se_oldEmrPort`·`se_oldViewerPort`.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, PowerShell 파서 오류 0, `npm run build`. 새 DB 격리 스택에서 `PUT /api/pacs/config`로 값을 바꿔 가며 상태 API 6가지(둘 다 빔 off / 8080·8090 warn 두 개 / 뷰어만 옛 포트·끝 `/` warn 한 개 / 새 포트 ok / 숫자·호스트 이름 속 8080 ok) 통과. 상태 창은 컨테이너 이름만 격리 스택으로 바꾼 **스크래치 사본**으로(실행 중 EMR DB에 묻지 않음) 콘솔 프랑스어·한국어, 창 캡처(프랑스어 「A CORRIGER」 줄과 안내). 화면: 프랑스어·한국어 오더 연동 탭에 두 경고, 뷰어 칸을 9090으로 치자 그 경고가 사라짐. `settings.access.mjs` 1221건 그대로.
- **다음 할 일**: 결정 두 가지(옛 백업 복원 절차, 시험 데이터 A~D) 대기.

## 2026-09-29 — 11월 새 PC 대비 복원 연습 2차 (재부팅 뒤 ⑤)

- **상태**: 확인 요청 — **결정 두 가지 필요**(아래 「결정 필요」)
- **커밋**: session/settings — 이 항목과 같은 커밋 (`a6e0de8` 위). 코드 변경 없음, 위키만.
- **한 일**: 실행 중 EMR 백업 폴더에서 **최신 백업(`bethesda_2026-09-29_0221.sql.gz`) 사본만** 읽어(sha256 같음) 격리 스택(9187)에서. 실행 중 EMR은 건드리지 않음.
  1. **빈 새 설치(027) + 02:21 백업(018) — 문서 명령 그대로 → 실패(종료 코드 3)**: 「cannot drop constraint staff_pkey on table public.staff because other objects depend on it — stock_movement_staff_id_fkey, order_item_cancelled_by_fkey」. 백업은 `--clean --if-exists`라 **자기가 아는 개체만** 지우는데, 새 버전에만 있는 021·023의 외래 키가 `staff_pkey`를 붙잡음. `--single-transaction`이라 **DB는 그대로**(안전하게 멈춤). 1차 연습(오후, `c8437ad`) 때 통과한 것은 새 설치가 020이라 이런 표가 없었기 때문 — **wiki 2.13의 「옛 버전 백업도 됩니다」는 틀렸음, 고침**.
  2. **빈 스키마로 만든 뒤 같은 명령 → 성공**: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` → 복원 0 → 앱 시작 때 **019~027(9개) 자동 적용**. `pgcrypto`는 백업이 다시 만듦.
  3. **확인 표** (백업 파일의 COPY 줄 수 ↔ 복원 뒤 DB):

     | 항목 | 백업 | 복원 뒤 |
     |---|---|---|
     | `schema_migrations` | 18 (001~018) | **27** (019~027 자동) |
     | 환자 / 내원 / 진료 | 2 / 3 / 3 | 같음 |
     | 영수 / 영수 항목 | 2 / 3 | 같음 |
     | 처방 / 오더 / 진단 / 검사 결과 | 6 / 7 / 0 / 0 | 같음 |
     | 약 / 재고 합계 | 25 / — | 25 / 6452 (예시 약) |
     | `stock_movement` | (표 없음) | 25 — 021의 시작 재고 줄 |
     | 직원 / 권한 | 8 | 8, 권한 그대로(lee = 진료만 — 약국 체크는 실장님이 할 일) |
     | 병원 정보 / 진료과 / 오더 코드 / 검사 항목 | 1 / 9 / 40 / 26 | 같음 |
     | 상용구 / 약속처방(항목) | 24 / 3(10) | 같음 |
     | `lab_ref_range` | (표 없음) | 0 — 024가 표만 만듦 |
     | `audit_log` | (표 없음) | 0줄, 트리거 `audit_log_no_change`·`audit_log_no_truncate` |
     | `pacs_config` | 1 | 같음 — **`localhost:8080`·`localhost:8090`, 브리지 토큰(48자)도 그대로 넘어옴** |

  4. 그 DB에서 「Sauvegarder」(027) → **`verify-backup.ps1 -Strict` VERIFIED**(26 테이블, 228행, 모든 시퀀스·내용 같음).
  5. **빈 새 설치(027) + 같은 버전 백업 — 문서 명령 그대로 → 성공**: 종료 코드 0, 26개 테이블 **모두 같음**, 추가 마이그레이션 0, TRUNCATE 거절, 화면(프랑스어 직원 목록, 한국어 오더 연동 두 주소·기록 탭). 복원 약 5초, 켜기 약 1.3초.
  6. 시험 데이터 정리 **미리 해 보기**(한 트랜잭션, **ROLLBACK** — 남긴 것 없음, 스크립트도 커밋 안 함): 영수 항목 → 영수 → 검사 결과 → 작업목록 → 문서 → 오더 → 처방 → 진단 → 진료 → 내원 → 환자 순서로 막힘 없음. `stock_movement`의 처방·진료 연결은 `ON DELETE SET NULL`이라 재고 기록은 남음, `audit_log`는 환자 외래 키가 없어 영향 없음. 시험 계정 `zz%` 비활성 → 활성 직원 2(admin, lee). `chart_no_seq`를 처음으로 → 다음 차트번호 **26-00001**(안 하면 **26-00697**).
- **위키**: `modules/settings.md` 2.13(버전 맞추기, 옛 백업 실패 설명, 빈 DB 길은 「확인 대기」로, 영상 주소 다시 적기 단계, 번호 다시 매김, **시험 데이터 선택지 A~D 표**, 백업 파일에 해시·토큰), 3-4(2차 연습 기술 내용), 8절.
- **결정 필요**:
  1. **(실장님·총괄) 옛 버전 백업 복원**: 11월에는 「떠나기 전 옛 PC를 새 PC와 같은 버전으로 업데이트 → 그 뒤 Sauvegarder → 그 파일로 복원」이면 문서 명령 그대로 됩니다(추천, 연습 5). 그래도 옛 백업밖에 없을 때를 위해 「새 PC 빈 설치에서만 DB 비우고 복원」(연습 2)을 절차로 적을지 — 백업·복원 절차 변경이라 확인 뒤에만 적겠습니다. `DEPLOYMENT.md` 5b(총괄 파일)에도 한 줄 필요해 보입니다.
  2. **(실장님) 시험 데이터** — 2.13 표의 A~D. 추천 **C**(새 PC에서 복원한 뒤에만 지움, 번호 처음부터). 고르시면 설정 세션이 스크립트를 쓰고 총괄이 검토.
- **총괄 참고 — 지금 실행 중 EMR에도 해당**: 실행 중 EMR은 오늘 027로 올라갔는데 백업 폴더의 파일은 모두 **018 이하**입니다(최신 02:21). DB가 지금 망가지면 문서 명령으로는 어느 백업도 복원되지 않고(안전하게 멈춤) 빈 스키마 방법이 필요합니다. **오늘 밤 02:00 자동 백업이 첫 027 백업** — 그 전에 실행 중 EMR에서 「Sauvegarder」를 한 번 눌러 두시길 권합니다(실장님 또는 총괄 — 저는 9080을 건드리지 않음). 같은 이유로 업데이트 뒤에는 바로 백업 한 벌. `update.ps1`의 업데이트 전 안전 백업(`_pre-update-backups`)도 옛 버전이라, 업데이트를 되돌릴 때는 **옛 코드로 먼저 되돌린 뒤** 복원해야 합니다(새 코드 위에서는 같은 이유로 멈춤).
- **정리**: 격리 스택 `down -v`, 스크래치의 백업 사본·시험 비밀번호 파일 삭제.
- **다음 할 일**: 결정 두 가지를 기다림. 그 밖의 요청 대기.

## 2026-09-29 — 비활성 직원 다시 활성 (재부팅 뒤 ④, U2 결정)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`34e8bc2` 위)
- **한 일**:
  - `POST /api/admin/staff/:id/reactivate` — settings 권한 **그리고 admin 역할**. 상태만 active로, 아이디·비밀번호·역할·권한은 그대로. 기록 `settings.staff.edit`(status inactive → active)을 같은 트랜잭션에. 이미 활성이면 200 `unchanged`·기록 없음, 없는 id 404.
  - **PUT `/staff/:id`에도 같은 규칙**: 비활성 → 활성은 admin 역할만(403). 전에는 설정 권한만 있으면 API로 되살릴 수 있었습니다(화면에는 칸이 없었을 뿐). 비활성인 채로 다른 칸을 고치는 것은 그대로 됨.
  - 화면: 비활성 줄에 **Supprimer** 대신 초록 **Réactiver**(admin 역할에게만), 확인 창에 이름과 「같은 아이디·비밀번호·권한」.
- **「관리자」를 어떻게 읽었나 — 확인 부탁**: 결정은 「관리자만」. 설정 화면 전체가 이미 설정 권한을 요구하므로, 그것만으로는 「관리자만」이 더해 주는 것이 없어 **admin 역할 + 설정 권한**으로 했습니다. 역할은 요청마다 DB에서 읽음(S1). 지금 설정 권한이 있는 실제 계정은 admin 역할뿐이라 실제 차이는 없습니다. 설정 권한만으로 충분하다고 보시면 두 줄(라우트 첫 줄, PUT 조건)만 빼면 됩니다.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `backend/src/routes/settings.messages.js`(`REACTIVATE_ADMIN_ONLY`) · `frontend/src/pages/Settings.jsx`(직원 줄, `reactivateStaff`, `getUser` import) · `frontend/src/pages/settingsMessages.js` · `backend/test/settings.reactivate.mjs`(새) · `backend/test/settings.access.mjs`(라우트 1개) · `wiki/modules/settings.md`(2.5, 4절, 7절 U2, 8절)
- **공용 파일 변경**: i18n `se_reactivate`·`se_confirmReactivate`·`se_errReactivateAdmin`.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, `npm run build`. 격리 스택: `settings.reactivate.mjs` **12개 통과**(비활성 로그인 401 → 설정만 있는 접수 계정 403·PUT 우회도 403·비활성인 채 수정 200 → 관리자 200 → 옛 비밀번호로 로그인·역할·권한 그대로 → 기록 한 줄 status만 → 두 번째 누름 기록 없음 → 404 → 권한 없음 403). access **111 × 11 = 1221건 모두 표와 같음**, audit·password·messages·drugs 통과. 화면: 프랑스어 관리자 — 비활성 줄에 「Réactiver」, 확인 문구, 누르면 「actif」; 한국어 — 「다시 활성」·확인 문구, 취소하면 그대로 비활성; 설정 권한만 있는 접수 계정 — 비활성 7줄 모두 「Modifier」만.
- **다음 할 일**: ⑤ 11월 대비 복원 연습 처음부터 끝까지(pacs_config 주소 두 칸도 확인 표에).

## 2026-09-29 — 자기 비밀번호 바꾸기 (재부팅 뒤 ③, S4 결정)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`139b9fc` 위)
- **한 일**:
  - 서버 `POST /api/auth/password` `{current_password, new_password}` (`auth.routes.js`, 로그인만 필요 — 권한 없음도 됨).
  - 화면 `frontend/src/pages/settingsPassword.jsx`(새): 지금 비밀번호 1번, 새 비밀번호 2번(오타로 잠기지 않게), 「Afficher」, Enter로 바꾸기·Esc로 닫기. 안내는 `seMessage`로 번역.
  - 상단바 이름에 🔑, 누르면 창.
- **보안 관련 — 이유** (규칙: 비밀번호 변경은 이유를 자세히):
  - **지금 비밀번호를 묻습니다** — 로그인한 채 둔 화면(접수 PC 등)에서 다른 사람이 비밀번호를 바꿔 계정을 가져가지 못하게.
  - **확인과 변경을 UPDATE 한 문장으로**(`WHERE id = 나 AND status = 'active' AND password_hash = crypt(지금, password_hash)`) — 확인한 뒤 바꾸기 전에 다른 변경이 끼어들 수 없음. 해시는 기존과 같은 pgcrypto `crypt(…, gen_salt('bf'))`.
  - **틀린 지금 비밀번호는 400** (401 아님) — `api/client.js`가 토큰을 보낸 401을 「로그인 끝남」으로 보고 로그인 화면으로 보내 버리기 때문.
  - **최소 길이 없음**(한 글자 이상), **강제 변경 없음** — 결정대로. 첫 관리자 만들기의 6자 규칙은 그대로 둠(바꾸라는 결정이 없음).
  - **이미 받은 토큰은 끊지 않습니다.** 서버는 요청마다 상태·권한을 읽지만 비밀번호 변경 시각은 보지 않아, 다른 PC의 열린 화면은 12시간까지 그대로입니다. 끊으려면 토큰에 비밀번호 버전을 넣어야 하는데(인증 미들웨어·`staff` 열 — 총괄 파일·마이그레이션) 결정 밖이라 하지 않았습니다. 필요하면 관리자가 비활성 → 되살리기(U2)로 끊을 수 있음.
  - 지금 비밀번호 추측 횟수 제한 없음 — 로그인 화면과 같은 수준, 이미 로그인한 사람만 부를 수 있음.
  - 변경 기록: `settings.staff.password` 한 줄(쓴 사람 = 본인, `entity_id` = 본인, 값 없음), 변경과 같은 트랜잭션. 거절되면 줄 없음.
- **바꾼 파일**: `backend/src/routes/auth.routes.js` · `backend/src/routes/settings.messages.js`(`CURRENT_PASSWORD_WRONG`) · `frontend/src/pages/settingsPassword.jsx`(새) · `frontend/src/pages/settingsMessages.js` · `backend/test/settings.password.mjs`(새) · `backend/test/settings.access.mjs`(라우트 1개) · `wiki/modules/settings.md`(2.2, 3-3, 4절, 7절 S4, 8절)
- **공용 파일 변경**: **`frontend/src/components/TopBar.jsx`** (총괄 허락) — import 한 줄, 상태 한 줄, 이름 `<span>`에 `onClick`·`title`·`cursor`·🔑, 창 한 줄. 다른 부분은 그대로. i18n `se_pw*` 10개 + `se_errCurrentPw`.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `node --check`, `npm run build`. 격리 스택: `settings.password.mjs` **15개 통과**(틀린 지금 비밀번호 400·옛 비밀번호 그대로, 빈 값 400, 토큰 없음 401, 권한 없는 계정 200, 옛 비밀번호 401·새 것 200, 이전 토큰 유효, 한 글자 허용, 기록 두 줄·쓴 사람 본인·값/해시 없음, 비활성 401). `settings.access.mjs` **110 × 11 = 1210건 모두 표와 같음**, `settings.audit.mjs`·`settings.messages.mjs` 통과. 화면: 간호사 역할 시험 계정으로 프랑스어 — 틀린 지금 비밀번호 → 「Le mot de passe actuel n'est pas correct.」, 창 남음(로그아웃 안 됨); 한국어 — 두 칸 다름 → 「새 비밀번호 두 칸이 서로 다릅니다.」, 고쳐서 바꾸기 → 「비밀번호를 바꿨습니다…」, 새 비밀번호 로그인 200·옛 것 401, Journal에 「Rasoa Infirmière」가 쓴 한 줄.
- **다음 할 일**: ④ 비활성 직원 되살리기(U2) ⑤ 복원 연습 처음부터 끝까지.

## 2026-09-29 — 「Journal」 탭에 진료·접수 칸 (재부팅 뒤 ②)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`8594492` 위)
- **한 일** (`frontend/src/pages/settingsAudit.js`, 화면만 — 서버 변경 없음):
  - 진료(`d7cee75`)가 쓰는 칸 이름: 끝난 진료의 기록·활력징후 13칸(`NOTE_FIELDS`), 처방(`RX_LOG`), 오더(`ORDER_LOG`), 진단(`DX_LOG`).
  - 값: 상태(오더됨·처방됨·조제됨·취소됨·예약됨·진행 중·완료 — 처방의 `ordered`는 「처방됨」, 줄의 `entity`로 구분), 오더 종류(`se_type_*` 재사용), 주·부 진단, 성별 M/F(접수 `validate.js`).
  - `consultation.record.edit` 문장 뒤에 무엇을 고쳤는지(`entity`: 기록·활력징후 / 진단 / 처방 / 오더). 기록 줄의 요약 `note`는 숨김(entity가 이미 말함).
  - 접수: 환자 수정 줄의 요약(바뀐 칸 이름 「gender, mobile」)을 칸 이름으로(「Sexe, Mobile」). 칸 13개는 이미 들어 있었음.
  - 보기 좋게: 만들거나 지운 줄은 비어 있던 칸을 빼고, 칸 순서는 `FIELDS` 순서(이름 → 용량 → … → 상태·취소 사유).
  - 프랑스어 안내 `se_logIntro`의 「ni les consultations」 — 「본 것」의 뜻이었지만 병원에서는 「진료는 안 남는다」로 읽혀 이제 틀림 → 「ni les simples lectures」.
- **바꾼 파일**: `frontend/src/pages/settingsAudit.js` · `frontend/src/pages/Settings.jsx`(Journal 「무엇을」 칸 한 줄) · `wiki/modules/settings.md`(2.14 표, 3-10, 8절)
- **공용 파일 변경**: i18n `se_` 44개 새로(`se_fld_*` 29, `se_st_*` 7, `se_dx_*` 2, `se_gender_*` 2, `se_ent_*` 4) + 프랑스어 `se_logIntro` 문구 하나 고침.
- **DB 마이그레이션**: 없음.
- **확인한 방법**: `npm run build`. 격리 스택에서 실제 진료 흐름으로 줄을 만듦(스크래치 스크립트 — 환자 등록·수정, 진료 기록·처방 2·오더 2·진단 → 진료 완료 → 기록 수정, 처방 수정·삭제, 진단 추가, 검사 결과 입력 뒤 오더 취소, 다른 오더 삭제): 7종 모두 `audit_log`에 남고, Journal 탭 프랑스어·한국어에서 모든 칸·값이 말로 나옴(예: 「Dossier de consultation terminé modifié — prescription · Dose: 1 → 2」, 「오더를 취소함 · 상태: 완료 → 취소됨 · 취소 사유: — → mauvais examen」).
- **다음 할 일**: ③ 자기 비밀번호 바꾸기 ④ 비활성 직원 되살리기(U2) ⑤ 복원 연습 처음부터 끝까지.

## 2026-09-29 — 포장 단위 두 칸 저장 (재부팅 뒤 ①)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `4fde219` 위)
- **한 일**: `admin.routes.js` `POST·PUT /drugs`가 `pack_unit`·`pack_label`(025)을 저장. 새 함수 `packFields`: 거짓 → 단위 NULL, **참인데 단위가 비면 `bottle`**(편집 창이 「병」을 미리 골라 보여 주므로 400보다 이쪽), 목록 밖 단위·참/거짓 아님 → 400(`fieldMsg.notOneOf`, 화면은 「허용되지 않는 값」). **PUT에 `pack_unit`이 없으면 두 칸 모두 그대로**(옛 화면·스크립트가 지우지 않게). `GET /admin/drugs`는 `SELECT *`라 그대로 나옴 — 확인.
- **함께**: `utils/dbError.js`(`86fab5f`)의 새 문구 「A date field has a date that does not exist」를 `settingsMessages.js`와 `se_errBadDate`(ko·en·fr)에 — `settings.messages.mjs`가 찾아냄.
- **위키 고침(총괄 요청)**: `modules/settings.md`의 702 → **026**(3-10절, 4절 표, 8절). 8절 「변경 기록」 줄의 커밋을 `5e91dbf`로. 아래 옛 인계 항목의 702는 그때의 기록이라 그대로 둠. `03-change-log.md`에는 702가 없었음.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `backend/test/settings.drugs.mjs` · `frontend/src/pages/settingsMessages.js` · `wiki/modules/settings.md`(3-8, 3-10, 4절, 8절)
- **공용 파일 변경**: i18n `se_errBadDate` 한 줄씩(ko·en·fr, `se_` 구역 안).
- **DB 마이그레이션**: 없음(025는 약국).
- **확인한 방법**: `node --check`, `npm run build`, 새 DB 격리 스택에서 `settings.drugs.mjs` **20개 통과**(포장 단위 11개 새로), `settings.access.mjs` 1199건 모두 표와 같음, `settings.audit.mjs`·`settings.messages.mjs`·`settings.permissions.mjs` 통과. 화면: 프랑스어 AMOX250 「Délivré à l'unité de conditionnement」 체크(Flacon) → 저장 → 목록에 「Flacon」, 한국어로 단위 바꾸기 → 저장 → 체크 해제 → 단위 NULL, 재고 30 그대로.
- **총괄 질문에 대한 확인** (코드 변경 없음):
  - ③ `GET /admin/doctors`는 `role = 'doctor' AND status = 'active'`만 — **관리자 역할 계정은 권한에 진료가 있어도 목록에 안 나옵니다.** 결정(의사는 의사 계정 + 필요하면 설정 체크)과 같음.
  - ④ 8090·8080 기본값: **EMR 쪽 시드·초기 설정에는 없음.** `pacs_config`는 001·`pacs.routes.js` `ensureConfig` 모두 `emr_base_url`·`pacs_viewer_url` 기본 **빈 값**, 015도 두 칸을 건드리지 않음. 새 DB 격리 스택 확인: 4242 · 빈 값 · 빈 값. 화면 예시는 `NAS_IP:9090`·`egUrl` `:9080`(P-17 `890c64a`에서 고침), 설치 스크립트 안내도 9090. 실행 중 EMR의 8090·8080은 **누군가 옛 예시대로 적어 저장한 값**으로 보입니다(P-17 전 예시가 `NAS_IP:8090`, 피드 예시 `:8080`). **11월 복원에 중요**: 이 두 주소는 `pacs_config`에 저장되어 **백업과 함께 새 PC로 넘어갑니다** — 새 PC의 IP가 다르면 복원 뒤 설정 → 오더 연동에서 다시 적어야 함. 복원 연습(⑤) 확인 표와 2.13에 넣겠습니다.
- **다음 할 일**: ② Journal 탭에 진료 칸(`d7cee75`) + 접수 칸 이름 ③ 자기 비밀번호 바꾸기 ④ 비활성 직원 되살리기(U2) ⑤ 복원 연습 처음부터 끝까지.

## 2026-09-29 — 변경 기록(로그): 직원 계정 기록 · 읽기 API · 「Journal」 탭 · TRUNCATE 막기 (총괄 지시 3)

- **상태**: 확인 요청 (a~e 모두 끝남)
- **커밋**: session/settings — 이 항목과 같은 커밋 (`8ba7a93` 위)
- **한 일**:
  - (a) `admin.routes.js` POST·PUT·DELETE `/staff`를 트랜잭션으로 바꾸고 `writeAudit` — `settings.staff.create` · `.edit`(바뀐 칸만, 비활성화 포함) · `.permissions`(순서만 다른 것은 제외) · `.password`(값 없음). 거절·실패하면 줄 없음. 함께: **빠진 status는 지금 상태 유지(S6)**.
  - (b) `GET /api/admin/audit` (settings): 날짜·직원·환자·종류(전체 이름 또는 모듈)로 거르기, 최신순, 쪽(최대 200). 쓰기 라우트 없음.
  - (c) 설정 「📜 Journal / 기록」 탭 — 언제·누가·무엇을·환자·전→후. 문장·칸 이름은 새 파일 `frontend/src/pages/settingsAudit.js`(모르는 칸은 이름 그대로). 총괄이 알려 준 검사·환자·영수 칸 이름 넣음. **진료 쪽(`d7cee75`) 칸은 아직 안 넣음 — 재부팅 뒤.**
  - (d) **발견·고침**: 022 트리거가 행 단위라 **TRUNCATE로 기록 전체가 비워졌음**(복원 사본에서 15줄 → 0). 마이그레이션 **`702_settings_audit_no_truncate.sql`**(트리거 하나 추가, 데이터 변경 없음)로 막음. 백업에 `audit_log`·트리거 둘 다 들어 있고, 별도 DB에 복원 뒤 UPDATE·DELETE·TRUNCATE 모두 거절·15줄 그대로. `verify-backup.ps1 -Strict` → VERIFIED.
  - (e) `settings.access.mjs`에 `GET /admin/audit`[settings]·`POST /consultations/order/:id/cancel`[consultation] → 109 × 11 = **1199건 모두 표와 같음**.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `backend/sql/702_settings_audit_no_truncate.sql`(새) · `frontend/src/pages/Settings.jsx`(Journal 탭) · `frontend/src/pages/settingsAudit.js`(새) · `backend/test/settings.audit.mjs`(새) · `backend/test/settings.access.mjs` · `wiki/modules/settings.md`(2.14 새, 3-10 새, 4절, 7절 S6, 8절)
- **공용 파일 변경**: i18n `se_` 키 56개(탭·문장 `se_act_*`·칸 `se_fld_*`). `utils/audit.js`·022는 안 건드림.
- **DB 마이그레이션**: `702_settings_audit_no_truncate.sql` — `audit_log`에 `BEFORE TRUNCATE` 문장 트리거(022의 함수 재사용). 행을 바꾸지 않음, 재실행 안전.
- **확인한 방법**: `node --check`, `npm run build`, `settings.audit.mjs` 20개 통과, `settings.access.mjs` 1199건, 화면(프랑스어·한국어 Journal, 권한 줄 「접수, 수납 → 접수, 통계」), 위 (d).
- **총괄 확인 요청**: 702는 총괄 표(`audit_log`)에 트리거를 더합니다 — 설계에 맞는지 봐 주세요. DROP TABLE은 복원 때문에 막지 않음.
- **다음 할 일 (재부팅 뒤, 순서)**: ① 포장 단위 `pack_unit`·`pack_label`(admin POST·PUT, 025) ② Journal 탭에 진료 칸 이름(`d7cee75`) ③ 자기 비밀번호 바꾸기(`POST /api/auth/password` + 상단바, 로그 `.password`) ④ 비활성 직원 되살리기(U2) ⑤ 11월 설치 대비 처음부터 끝까지 복원 연습·2.13 갱신·시험 데이터 정리 선택지 표.

## 2026-09-29 — 의사 기본 권한에 약국 (총괄 지시 2, 실장님 결정)

- **상태**: 확인 요청 (기존 계정 처리는 **보류 — 총괄 확인 필요**)
- **커밋**: session/settings — 이 항목과 같은 커밋 (`73b0517` 위)
- **한 일**: 의사 역할 기본 권한 = 진료 + 약국. `backend/src/middleware/permissions.js`·`frontend/src/modules.js` 한 줄씩. 의사 첫 화면은 그대로 진료(`Login.jsx` `ROLE_ROUTES`). `settings.access.mjs` 계정을 11개로(의사 = 기본값 진료·약국, 진료만 계정 `se_cons` 새로).
- **이미 있는 의사 계정 — 확인한 것**: 역할 기본값이 쓰이는 곳은 ① 직원 창에서 역할을 고를 때 자동 체크 ② 저장된 권한이 NULL인 계정(`auth.js`·`effectivePerms`) 두 군데뿐입니다. 모든 계정은 권한 목록이 저장되어 있어서(`013`이 옛 계정을 채웠고, 만드는 경로는 모두 목록을 저장) **이미 있는 의사 계정은 진료만 그대로**입니다. 격리 스택에서 확인: 기존 `doc1` = `consultation`, 새 `se_doc` = `consultation,pharmacy`. 복원 연습 때 본 실행 중 EMR 사본(오늘 02:21)의 의사 계정은 **`lee`(Dr. Lee, 진료만)**, **`zzdoc`(시험 계정, 진료만)** 둘.
- **기존 계정 선택지** (총괄 확인 요청):
  - (a) **마이그레이션 없이** 관리자가 Dr. Lee 한 명만 **Personnel → Modifier → Pharmacie 체크**. 실제 의사가 한 명이라 가장 간단하고, 누가 무엇을 받았는지 화면에서 보입니다. **추천.**
  - (b) 마이그레이션(설정 번호대): `UPDATE staff SET permissions = array_append(permissions, 'pharmacy') WHERE role = 'doctor' AND NOT ('pharmacy' = ANY(permissions))` — 계정 권한을 **바꾸는** 마이그레이션이라 규칙상 총괄·실장님 확인 뒤에만. 쓰지 않았습니다.
- **바꾼 파일**: `backend/test/settings.access.mjs` · `wiki/modules/settings.md`(2.4 표, 3-1, 8절)
- **공용 파일 변경**: `backend/src/middleware/permissions.js`·`frontend/src/modules.js` 의사 줄 (총괄 지시)
- **DB 마이그레이션**: 없음
- **확인한 방법**: `settings.permissions.mjs` 통과, `npm run build`, 격리 스택 `settings.access.mjs` **107 × 11 = 1177건 모두 표와 같음**. 화면: 새로 추가 창에서 역할 Médecin → Consultation·Pharmacie 체크. 기존 의사 계정 권한 그대로(DB).

## 2026-09-29 — 약 저장이 재고를 쓰지 않음 (총괄 지시 1)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `a7b40e8`을 ff로 당긴 뒤)
- **한 일**: 약국의 재고 칸 읽기 전용(`14ff4be`)에 맞춰 서버 쪽 — `POST /api/admin/drugs`는 재고 **0**으로 시작(요청의 `stock_qty` 무시, 빈 최소 재고는 10), `PUT /api/admin/drugs/:id`는 `stock_qty`·`stock_expected`를 **조용히 무시**(총괄 추천대로 — 옛 화면이 열린 채 저장해도 막히지 않게). 오전의 H4 안전장치(`stock_expected` + 409, 행 잠금 트랜잭션)는 필요 없어져 지웠고, 화면의 409 처리·`STOCK_CHANGED` 상수·번역 키 `se_stockChanged`도 지움. `settings.drugs.mjs`를 새 동작에 맞게 다시 씀.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `backend/src/routes/settings.messages.js`(`STOCK_CHANGED` 삭제) · `frontend/src/pages/Settings.jsx`(`saveEdit` 약 부분만 — 약품 탭 화면은 안 건드림) · `backend/test/settings.drugs.mjs` · `backend/test/settings.messages.mjs` · `wiki/modules/settings.md`(2.12, 3-8 다시 씀, 4절, 7절 U10, 8절)
- **공용 파일 변경**: i18n — `se_stockChanged` 삭제(ko·en·fr, `se_` 블록 안)
- **DB 마이그레이션**: 없음
- **확인한 방법**: `node --check`, `npm run build`, `settings.messages.mjs` 통과. 격리 스택 `settings.drugs.mjs` 9개 통과(위키 3-8). 화면: 프랑스어 약품 편집에서 단가만 바꿔 저장 → 알림 없이 「Enregistré」, DB 단가 4600·재고 50 그대로.
- **다른 세션에 부탁**: **약국** — `backend/test/pharmacy.stock.mjs` 132행 「settings saves stock directly (until settings stops writing it)」와 그 뒤 「outside change bridged」 두 확인은 이제 실패합니다(설정이 재고를 안 쓰므로 PUT 뒤 재고가 그대로). 약국 시험을 「설정 저장이 재고를 바꾸지 않음」으로 바꿔 주세요. `moveStock`의 「outside」 연결 줄은 옛 DB·직접 SQL 대비로 남겨도 무방.

## 2026-09-29 — S2 표에 새 라우트 2개 · 날짜 SQL 확인

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `4caaedd`을 ff로 당긴 뒤)
- **한 일**: `GET /api/patients/similar` → registration, `GET /api/pharmacy/stock/report` → pharmacy·settings·stats 를 `settings.access.mjs`와 아래 S2 표에. `POST /api/consultations/order/:id/cancel`은 develop에 **아직 없어서** 들어오면 넣겠습니다.
- **확인한 방법**: 격리 스택(develop `4caaedd`) → **107 라우트 × 10 계정 = 1070건 모두 표와 같음.** 전에 남았던 진료 500 두 건도 이제 없음(진료 세션 수정 반영됨).
- **DB 시간대 변경(총괄 `config/database.js`) 영향 확인**: 설정 쪽 파일(`admin`·`auth`·`backup`·`status`·`version` 라우트, `services/`, 마이그레이션 020)에 `CURRENT_DATE`·`now()::date` **없음**. 백업 파일 이름·예정 시각·「오래됨」 판단은 Node의 `TZ`와 파일 시각으로 계산 — 영향 없음.
- **바꾼 파일**: `backend/test/settings.access.mjs` · `wiki/handoff/settings.md` · `wiki/modules/settings.md`(4절 숫자)

## 2026-09-29 — S2 표 갱신 (접수 이전 내원 조회 · 약국 재고 라우트)

> **총괄 확인 (2026-09-29)**: S2 표 갱신 `b5e7f4c` 합침(`e3292de`). 1050건 모두 표와 같음. 진료의 500 두 건은 `f52df58`로 고쳐져 develop에 있음.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `1ed8b1d`을 ff로 당긴 뒤)
- **한 일**: 총괄 승인 한 칸 — `GET /api/visits/patient/:id`에 **registration** 추가(접수가 이전 내원으로 초진/재진 제안). 약국 재고 ① 라우트 5개(`/pharmacy/stock…`, pharmacy·consultation·settings)를 `settings.access.mjs` 기대 표와 아래 「S2 초안」 표에 넣음(표의 해당 줄을 그 자리에서 고치고 날짜를 적음).
- **확인한 방법**: 격리 스택(develop `1ed8b1d`, 마이그레이션 021 적용) `settings.access.mjs` → **105 라우트 × 10 계정 = 1050건, 권한은 모두 표와 같음.** 남은 차이는 전과 같은 진료 500 두 건(`POST /consultations/:id/diagnoses`·`/prescriptions` 빈 입력) — develop에 아직 안 고쳐짐.
- **참고**: `pharmacy.routes.js`의 `canReport`(pharmacy·settings·stats)는 정의만 있고 쓰는 라우트가 아직 없음 — 약국 ②③에서 쓰이면 표에 넣겠습니다.
- **바꾼 파일**: `backend/test/settings.access.mjs` · `wiki/handoff/settings.md` · `wiki/modules/settings.md`(4절 숫자)

## 2026-09-29 — 위키 8절 변경 기록 정리 (총괄 부탁)

- **상태**: 확인 요청 (위키만)
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `279137e`을 ff로 당긴 뒤)
- **한 일**: `modules/settings.md` 8절을 수납 세션 형식으로 — 「처음 읽는 분을 위한 요약」(백업·서버 상태 창·현장 언어·로그인과 계정·권한·다른 모듈과 맞추기·남은 것) + 커밋별 표(현장 눈으로 / 코드 쪽 / 커밋, 위키 페이지를 안 건드린 커밋 `46dc52c`·`60977c0` 포함). 머리말 상태 줄 갱신. 7절에서 다른 곳에서 고쳐진 3건 표시: **S8**(PACS — `/pacs/config` settings만, access 시험으로 확인), **B9**(`.env.example`, 총괄), **B10**(`DEPLOYMENT.md` 5b, 총괄 — 코드·문서에서 확인).
- **바꾼 파일**: `wiki/modules/settings.md` · `wiki/handoff/settings.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음

## 2026-09-29 — 약을 감출 때 그 약을 쓰는 약속처방 알림 (진료 세션 발견)

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (`f3b8f01` 위)
- **한 일**: 약속처방은 약 id를 복사해 두어서, 약을 감춰도(`is_active=false`) 그 세트가 계속 처방합니다. 설정 쪽 몫으로 — 새 API `GET /api/admin/drugs/:id/order-sets`(settings, 그 약을 쓰는 **활성** 세트의 id·이름), 공용 삭제 함수 `deleteItem`이 약이면 먼저 물어 보고 세트가 있으면 확인 창에 「이 약을 쓰는 약속처방 N개: 이름… 약을 감춰도 약속처방에는 남아 계속 처방됩니다… 그래도 감출까요?」. **막지는 않습니다.** 약품 탭 화면 글자는 안 건드림.
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `frontend/src/pages/Settings.jsx`(`deleteItem`) · `backend/test/settings.access.mjs`(새 라우트 한 줄) · `wiki/modules/settings.md`(2.12 표, 4절 API, 8절)
- **공용 파일 변경**: i18n `se_drugInSets` 1개 (ko·en·fr)
- **DB 마이그레이션**: 없음
- **확인한 방법**: `node --check`, `npm run build`. 격리 스택 프랑스어 화면에서 확인 창을 「취소」로 답하는 가짜로 바꿔 문구만 봄 — ACT01 → 「1 ordonnance(s) type(s)… : Malaria Workup…」, ORS → 「… : Diarrhea / GE…」, AMLO5(세트 없음) → 「Supprimer ?」, 세 약 모두 그대로 남음. `settings.access.mjs` 1000건 — 새 라우트 표대로(settings만), 차이는 전과 같은 진료 500 두 건뿐.
- **다른 세션에 부탁**: **약국** — `pharmacy.md` 2절(약 감추기)에 이 확인 창 한 줄. **진료** — 세트를 적용할 때 감춘 약 줄 빼기(진료 쪽 계획대로).

## 2026-09-29 — 역할 × 라우트 권한 시험 (S2 마지막 그물) · U13 남은 점 확인

> **총괄 확인 (2026-09-29)**: 역할 × 라우트 시험 `f3b8f01` 합침(`f9e4873`). 990칸 모두 표와 같다는 결과 확인. 진료 쪽 500 두 건은 진료 세션에 전달. U13 남은 점의 화면 확인도 받음.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `4a77f97`까지 반영)
- **한 일**: `backend/test/settings.access.mjs`(새) — 역할별 계정 10개 × API 라우트 99개 = **990건**. 계정: 설치 관리자, 의사, 접수(접수·수납), 간호사(접수·약국·임상병리), 약국만, 검사만, 수납만, 통계만, 설정만, 권한 없음. 라우트: 모든 GET과 대표 쓰기(없는 id 999999로 — 가드는 통과하고 대상은 없음). 기대 값은 **S2 표를 스크립트 안에 옮긴 것**이고 라우트 파일에서 읽지 않음(표에서 벗어난 가드를 잡으려고). 「wiki에서 표를 읽기」는 하지 않았습니다 — 인계 노트의 표는 설명·예외가 섞인 글이라 기계로 읽으면 깨지기 쉬워서, 스크립트가 표의 실행판이 되고 위키가 스크립트를 가리키게 했습니다.
- **결과 (격리 스택 9187, develop `4a77f97`)**: **권한은 990칸 모두 표와 같음.** 권한과 별개로 2건 — `POST /api/consultations/:id/diagnoses`, `POST /api/consultations/:id/prescriptions`가 필수 칸(`diagnosis_name`, `drug_name`)이 빈 요청에 **400이 아니라 500**(DB not-null 오류가 그대로). 화면은 항상 채워서 보내므로 현장 영향은 작지만, 서버 오류로 기록됨.
- **U13 남은 점 (총괄 `7662160`) 확인**: 통계 화면을 연 채 통계 권한을 빼고 창으로 돌아옴 → **`/registration`으로 이동**, 저장 권한 갱신. 접수 화면에서 입력 중(「Rakoto en cours」)에 **수납** 권한만 빼고 돌아옴 → **접수에 그대로, 입력 유지**, 메뉴에서 Paiement만 사라짐. (브라우저 창이 가려진 상태로 판단돼 `visibilitychange`가 동기화를 건너뛰어서, 시험 때만 `document.hidden`을 false로 두고 이벤트를 보냄 — 실제 사용에서는 사람이 창을 보고 있으면 그대로 동작)
- **바꾼 파일**: `backend/test/settings.access.mjs`(새) · `wiki/modules/settings.md`(4절 시험 목록, 7절 S2 고침·U13) · `wiki/handoff/settings.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **실행 방법**: 격리 스택을 띄우고 `node backend/test/settings.access.mjs` (빈 DB면 관리자를 스스로 만듦, 아니면 `SE_ADMIN_PW=…`). 계정 비밀번호는 OS 임시 폴더 `bethesda-se-access-<포트>.json`에 두고 다시 씀. 표와 다르면 exit 1.
- **확인 못 한 것**: 브리지 토큰으로만 부르는 라우트(`/pacs/worklist-feed`·`bridge-heartbeat`·`study-arrived`, 워크리스트의 토큰 경로) — 로그인 권한 표의 대상이 아님.
- **다른 세션에 부탁**: **진료** — 위 500 두 건: 빈 `diagnosis_name`/`drug_name`(그리고 없는 진료 id)에 400/404로. **모든 세션** — 라우트를 추가하거나 권한을 바꾸면 `settings.access.mjs`의 `ROUTES` 표에 한 줄(주인이 직접 넣어도 됨).

## 2026-09-29 — U13 해결 확인 (총괄 구현)

- **상태**: 확인 요청 (위키만)
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `33b5e81`을 ff로 당긴 뒤)
- **확인한 방법**: 격리 스택 9187. 접수 직원 `fdx`(접수·수납)로 로그인 → 밖에서 통계 권한 추가 → 새로 고침 → 저장본 `["registration","payment","stats"]`, 메뉴에 **Statistiques**, `/stats` 열림. 다시 통계 권한 제거 → `/stats`를 새로 고침 → 저장본·메뉴에서 사라짐.
- **남은 작은 점 (총괄 확인 요청)**: 권한을 뺀 화면을 **보고 있던** 사람은 그 화면에 남습니다(라우트 가드는 이동할 때만 봄). 통계 화면은 「Aucune donnée」로 **조용히 빈 채** — 이유가 안 보임. `TopBar.jsx`의 동기화에서 지금 경로의 권한이 없어졌으면 `homePath()`로 보내면 풀립니다.
- **위키**: `modules/settings.md` 2.2·2.5·2.12(「다시 로그인」 → 「새로 고치면 반영」), 3-1, 7절 U13 ✅, 8절

## 2026-09-29 — S1 후속 (화면 확인·위키) · `/admin/doctors` 권한 (S2)

> **총괄 확인 (2026-09-29)**: S1 후속·`/admin/doctors` 권한 `d277d53` 합침 + 실행 중 EMR 반영. U13(권한을 더한 계정의 메뉴)은 총괄이 `TopBar.jsx`에서 해결(`c4d4d67`·`a527c3d`). 실행 중 EMR에서 `/admin/doctors`: 의사·접수 200, 약국·검사 403 확인.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop 병합 `2c2ca89` 이후)
- **한 일**:
  1. **S1이 화면에서 어떻게 보이는지 확인** (격리 스택 9187, 빈 DB에서 계정 5개 만들어): ① 설정 권한을 뺀 관리자가 Établissement에서 저장 → 403 → 알림 「Erreur: Vous n'avez pas l'autorisation pour cela…」(새 키 `se_errAccessDenied` — 전에는 영어 「Access denied」) ② 그 관리자가 새로고침 → **메뉴에 Paramètres가 그대로 있고, 직원 목록이 빈 채로 조용히** 나옴(「직원이 없다」로 읽힘) → 고침: `loadAll`을 목록별로 따로 불러오고 실패하면 맨 위 빨간 줄로 이유 표시(U4도 같이 해결) ③ 비활성으로 바꾸자 다음 화면 요청에서 로그인 화면 → 로그인하면 「Ce compte est désactivé」 ④ 접수 직원에게 통계 권한을 **더하자** 서버는 200인데 **메뉴에 안 나오고 `/stats`를 쳐도 접수로 되돌아감** — 다시 로그인해야 함.
  2. ④·②의 뿌리는 화면이 로그인 때 저장한 권한(`localStorage`)을 쓰는 것 — **U13**로 적고, 고칠 수 있게 **`GET /api/auth/me`가 현재 권한을 로그인 답과 같은 모양(null 없음)으로** 돌려주게 함(부르는 화면은 아직 없음).
  3. `settingsMessages.js`에 `middleware/auth.js`(총괄)의 문구 5개(`Access denied` · `Could not verify the account` · `No token provided` · `Invalid token` · `Account is inactive`) — `settings.messages.mjs`가 이제 `middleware/auth.js`의 `error: '…'`도 읽어서 비교(45개 통과).
  4. **S2 설정 몫**: `GET /api/admin/doctors` → `permMiddleware('registration','consultation')`. 다른 기준 자료 GET은 표대로 그대로.
  5. 위키: 2.2·2.5(비활성은 바로 막힘, 권한 변경은 서버 즉시·메뉴는 다시 로그인), 2.12 표에 권한 없음 안내, 3-1(토큰은 누구인지만, 권한은 요청마다 DB), 4절 API 표, 7절(S1 고침(총괄)·U4 고침·U13 추가).
- **바꾼 파일**: `backend/src/routes/admin.routes.js` · `auth.routes.js`(`/me`) · `frontend/src/pages/Settings.jsx`(`loadAll`, 빨간 줄) · `frontend/src/pages/settingsMessages.js` · `backend/test/settings.messages.mjs` · `wiki/modules/settings.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_errAccessDenied`·`se_errSessionEnded` 2개
- **DB 마이그레이션**: 없음
- **확인한 방법**: `node --check`, `npm run build`, `settings.messages.mjs` 45개·`settings.permissions.mjs` 통과. 위 ①~④ 화면·API. `/admin/doctors`: 의사·간호사(접수 권한)·접수 200, 약국 역할 403. `/auth/me` → `{"permissions":["registration","payment","stats"], …}`.
- **확인 못 한 것**: 다른 화면(접수·수납 등)이 403을 받을 때 어떻게 보이는지 — 각 화면 몫(아래 부탁).
- **총괄 확인 요청**:
  - **U13 (보통)**: 메뉴·라우트 가드가 옛 권한. 권한을 **더한** 직원은 다시 로그인할 때까지 그 화면을 못 엶(서버는 허락). 제안: `App.jsx`가 시작할 때(그리고 창에 돌아올 때) `GET /api/auth/me`로 `medconnect_user`의 `permissions`·`role`을 새로 고침 — `/me`는 준비됨. 그 전까지 위키 2.2·2.5에 「권한을 바꾸면 그 직원은 다시 로그인」으로 적어 둠. `02-before-departure.md`의 「12시간 유지」 문장은 총괄이 고친다고 하셨음.
- **다른 세션에 부탁**: **모든 화면 세션** — S1·S2 뒤로 권한을 뺀 직원이 그 화면에 남아 있으면 요청마다 403 「Access denied」(영어)를 받습니다. 각 화면의 오류 표시에서 `seMessage`(`frontend/src/pages/settingsMessages.js`)를 쓰면 프랑스어 「Vous n'avez pas l'autorisation…」로 나옵니다.
- **남은 일**: 다른 세션의 S2 적용이 끝나면 **역할 × 라우트 시험 스크립트**.

## 2026-09-29 — 새 PC로 옮기는 복원 연습 (총괄 부탁)

> **총괄 확인 (2026-09-29)**: `c8437ad` 합침 + 실행 중 EMR 반영. 복원 연습 결과를 출발 전 목록 0절 (b)에 연결하고 「관리자 비밀번호를 알고 가기」를 넣음. 옛 백업을 복원해도 재시작 때 마이그레이션 019·020이 자동 적용된다는 확인이 특히 중요.

- **상태**: 확인 요청
- **커밋**: session/settings — 이 항목과 같은 커밋 (develop `c04adbd`을 ff로 당긴 뒤)
- **한 일**: 실행 중 EMR의 가장 최근 백업(`backups/bethesda_2026-09-29_0221.sql.gz`)을 **복사만** 해서(원본과 해시 같음 확인), 빈 격리 스택(새 설치 상태)에 `DEPLOYMENT.md` 5b 명령 그대로(컨테이너 이름만 격리용) PowerShell에서 복원 → 로그인 → 확인 → 시험 계정 비활성 → 관리자 비밀번호 변경 → 첫 백업까지 해 보고 `modules/settings.md` **2.13절**에 절차로 적었습니다.
- **결과**:
  - 새 설치 기동 9초(이미지 있음) · 복원 5초(종료 코드 0, `gunzip -t` 0) · 재시작 3초 · 시험 계정 5개 비활성 약 6초 · 비밀번호 변경 1분 이내. 손으로 하는 시간 약 5분(설치 제외).
  - 백업 파일의 **23개 테이블 행 수가 복원 결과와 모두 같음**(`schema_migrations`만 18 → 20).
  - 백업이 새 코드보다 **옛 버전**(02:21, 019·020 전)이었는데, 앱 재시작 때 **019·020이 자동 적용**되어 문제없음.
  - 직원 8명(설치 관리자 아이디 **`admin`** — S3 걱정 없음, 시험 계정 `zz…` 6개, Dr. Lee), 약 25, 오더 코드 40, 진료과 9, 상용구 24, 환자 2·내원 3·수납 2, 병원 정보(아직 설치 예시 값) 그대로.
  - 시험 계정 비활성 뒤 그 계정 로그인 → 「Account is inactive」. 관리자 비밀번호 변경 뒤 옛 비밀번호 거절, 새 비밀번호 로그인.
- **막힌 곳·주의점** (2.13절에 반영):
  1. **관리자 비밀번호를 알아야 함** — 복원하면 이 PC의 계정·비밀번호가 옮겨 감. 모르면 새 PC에서 설정에 못 들어감. (연습에서는 실제 비밀번호를 모르므로 **격리 사본 DB에서만** 관리자 비밀번호를 임시 값으로 바꿔 로그인했습니다.)
  2. 초기 설정 화면에서 관리자를 만들 필요 없음(만들어도 복원이 덮어씀).
  3. 설치 뒤 2분 넘게 두면 **빈 DB 백업**이 하나 생김 — 해는 없지만 헷갈림.
  4. **찾아서 고침**: 기존 직원 편집 창의 비밀번호 칸 힌트가 「••••」라 **비밀번호가 채워진 것처럼 보였음** → 기존 직원이면 「Vide = inchangé / 비우면 그대로 / Empty = unchanged」(`se_pwKeep`). 새 직원 창은 힌트 없음.
  5. Git Bash에서 5b 명령을 치면 안 됨(B10, 이미 DEPLOYMENT에 있음).
- **바꾼 파일**: `frontend/src/pages/Settings.jsx`(비밀번호 칸 힌트) · `wiki/modules/settings.md`(2.13 새 절, 3-4 복원 연습, 8절)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `se_pwKeep` 1개
- **DB 마이그레이션**: 없음
- **확인한 방법**: 위 연습. `npm run build`. 비밀번호 칸 힌트는 프랑스어 화면에서 봄.
- **확인 못 한 것**: 실제 새 PC에서 오프라인 묶음으로 이미지 불러오기(시간 포함). 데이터가 많아졌을 때의 복원 시간.
- **정리**: 격리 스택을 `down -v`로 내려 **복원한 실제 데이터 사본을 지웠고**, 스크래치의 백업 사본·연습 백업도 지웠습니다. 실행 중 EMR·그 DB·원본 백업 파일은 건드리지 않았습니다.
- **총괄 확인 요청**: `02-before-departure.md` 0절 (b)에 「관리자 비밀번호를 알고 가기」와 「2.13절 절차」 링크를 넣으면 좋겠습니다.

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
| `GET /similar` | 읽기 | 접수(등록 때 같은 환자 확인) | **registration** — 2026-09-29 추가 |
| `GET /:id/billing-history` | 읽기 | 없음 | payment |

**visit.routes.js** (`/api/visits`, 지금 전부 로그인만) — 접수 세션 파일

| 라우트 | 읽기/쓰기 | 부르는 화면 | 제안 |
|---|---|---|---|
| `GET /today` | 읽기 | 접수, 진료 | registration, consultation |
| `GET /patient/:patientId` | 읽기 | PatientFinder(내원 모드), **접수**(초진/재진 제안) | **registration**, consultation, lab, payment — registration은 2026-09-29 총괄 승인으로 추가 |
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

**pharmacy.routes.js 재고** (약국 재고 ①, 2026-09-29 추가) — `GET /stock`, `GET /stock/:drugId/movements`, `POST /stock/:drugId/receive|count|discard` → **pharmacy, consultation, settings** (조제 라우트는 pharmacy만 그대로). `GET /stock/report` → **pharmacy, settings, stats** (`canReport`, 2026-09-29 추가)

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
