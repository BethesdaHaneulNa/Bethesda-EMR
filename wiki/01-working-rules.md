# 세션 작업 규칙

> 여러 개발 세션이 동시에 이 저장소를 고칩니다. 이 문서는 세션끼리 서로 덮어쓰지 않고,
> 고친 내용이 빠짐없이 위키에 남도록 하기 위한 규칙입니다. **작업을 시작하기 전에 끝까지 읽으세요.**

## 1. 구조

```
                         ┌─ 접수 reception      ┐
                         ├─ 진료 consultation   │
                         ├─ 수납 payment        │   각 세션:
  총괄 세션 ──지시──▶     ├─ 약국 pharmacy       │   · 자기 모듈을 고치고 발전시킨다
      ▲                  ├─ 임상병리 laboratory  │   · 고친 내용을 자기 위키 페이지에 쓴다
      │                  ├─ 통계 statistics     │   · 작업마다 인계 노트를 남긴다
      │                  ├─ 설정 settings       │
      │                  └─ PACS pacs           ┘
      │                                │
      └──── 확인 · develop 에 합침 ◀────┘
```

- **실장님**(나하늘)이 각 세션과 직접 대화하며 방향을 정합니다. 결정은 실장님이 합니다.
- **총괄 세션**이 모든 세션의 결과를 확인하고 `develop`에 합칩니다. 실행 중인 EMR에 반영하는 것도 총괄만 합니다.
- **위키가 핵심 산출물입니다.** 코드만 고치고 위키를 안 쓰면 그 작업은 끝난 게 아닙니다.

## 2. 세션 목록

| 세션 | 코드 | 번역 키 접두어 | 격리 스택 포트 | 마이그레이션 번호 | 위키 페이지 |
|---|---|---|---|---|---|
| 접수 | `reception` | `rc_` | 9181 | 101 ~ 199 | `wiki/modules/reception.md` |
| 진료 | `consultation` | `cs_` | 9182 | 201 ~ 299 | `wiki/modules/consultation.md` |
| 수납 | `payment` | `py_` | 9183 | 301 ~ 399 | `wiki/modules/payment.md` |
| 약국 | `pharmacy` | `ph_` | 9184 | 401 ~ 499 | `wiki/modules/pharmacy.md` |
| 임상병리 | `laboratory` | `lb_` | 9185 | 501 ~ 599 | `wiki/modules/laboratory.md` |
| 통계 | `statistics` | `st_` | 9186 | 601 ~ 699 | `wiki/modules/statistics.md` |
| 설정 | `settings` | `se_` | 9187 | 701 ~ 799 | `wiki/modules/settings.md` |
| PACS | `pacs` | `px_` | 9188 | 801 ~ 899 | `wiki/modules/pacs.md` |

## 3. 브랜치

- 모든 세션은 **`develop`** 에서 출발합니다. (`main`은 배포용입니다. 건드리지 않습니다.)
- 자기 작업공간(worktree)에서 **`session/<코드>`** 브랜치를 씁니다. 예: `session/reception`
- 커밋은 자기 브랜치에만 합니다. **`develop`·`main`에 직접 커밋하지 않습니다. `push`하지 않습니다.**
- 합치는 것은 총괄이 합니다. 다른 세션 브랜치를 가져오지(merge) 않습니다.
- 커밋 메시지는 기존 기록과 같은 형식입니다 — 첫 줄은 영어로 무엇을 했는지, 본문은 **왜** 그렇게 했는지.
  마지막 줄에 `Co-Authored-By: Claude <noreply@anthropic.com>` 형식의 줄을 붙입니다.

## 4. 파일 담당

**자기 파일**은 자유롭게 고칩니다. **공용 파일**은 꼭 필요할 때만 최소한으로 고치고, 고쳤다면 인계 노트에 반드시 적습니다. **남의 파일**은 고치지 않습니다 — 필요하면 인계 노트의 「다른 세션에 부탁」 칸에 적으세요. 총괄이 전달합니다.

| 세션 | 자기 파일 |
|---|---|
| 접수 | `frontend/src/pages/Registration.jsx` · `backend/src/routes/patient.routes.js` · `visit.routes.js` |
| 진료 | `frontend/src/pages/Consultation.jsx` · `frontend/src/documents/surgical-records.jsx` · `op-figures.jsx` · `op-plates.js` · `referral.jsx` · `backend/src/routes/consult.routes.js` · `orderset.routes.js` · `document.routes.js` |
| 수납 | `frontend/src/pages/Payment.jsx` · `backend/src/routes/billing.routes.js` |
| 약국 | `frontend/src/pages/Pharmacy.jsx` · `frontend/src/documents/external-rx.jsx` · `backend/src/routes/pharmacy.routes.js` |
| 임상병리 | `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `backend/src/routes/lab.routes.js` |
| 통계 | `frontend/src/pages/Stats.jsx` · `backend/src/routes/stats.routes.js` |
| 설정 | `frontend/src/pages/Settings.jsx`(아래 예외) · `Login.jsx` · `backend/src/routes/admin.routes.js` · `auth.routes.js` · `backup.routes.js` · `status.routes.js` · `version.routes.js` · `backend/src/services/` · `server-status.ps1` · `verify-backup.ps1` |
| PACS | `C:\Bethesda-PACS-main` 저장소 전체 · EMR의 `backend/src/routes/pacs.routes.js` · `worklist.routes.js` · `frontend/src/components/RadiologyReadings.jsx` |

**공용 파일** — 여러 화면이 같이 씁니다.

| 파일 | 주관 | 쓰는 곳 |
|---|---|---|
| `frontend/src/components/DocumentModal.jsx` · `documents/shared.jsx` · `documents/registry.js` | 진료 | 진료·수납·약국·임상병리·접수 |
| `frontend/src/components/PatientFinder.jsx` | 접수 | 접수·진료·수납·약국·임상병리 |
| `frontend/src/components/PatientChart.jsx` | 수납 | 수납·약국 |
| `frontend/src/pages/Settings.jsx`의 **각 모듈 탭** | 해당 모듈 | 예: 약품 탭은 약국, 검사 패널 탭은 임상병리가 고쳐도 됩니다. 탭 밖(틀·공통 부분)은 설정 세션 |
| `frontend/src/i18n/ko.js` · `en.js` · `fr.js` | 총괄 | 전부 — 아래 6번 규칙대로만 |
| `frontend/src/App.jsx` · `main.jsx` · `modules.js` · `api/client.js` · `components/TopBar.jsx` | 총괄 | 전부 |
| `backend/src/index.js` · `middleware/` · `config/` · `utils/` | 총괄 | 전부 |
| `docker-compose*.yml` · `Dockerfile` · `setup` · `start` · `update` 스크립트 · `README.md` · `CHANGELOG.md` | 총괄 | — |

## 5. DB 마이그레이션

- 마이그레이션은 `backend/sql/`의 `.sql` 파일이 **파일 이름 순서대로** 백엔드 시작 때 자동 적용됩니다. (`backend/src/config/migrate.js`)
- 지금 `001` ~ `018`까지 있습니다. 두 세션이 둘 다 `019`를 만들면 충돌하므로, **자기 번호대만 씁니다.**
  예: 접수의 첫 마이그레이션은 `101_reception_<설명>.sql`
- 합칠 때 총괄이 `019`부터 순서대로 다시 번호를 매깁니다. 세션은 신경 쓰지 않아도 됩니다.
- **이미 있는 마이그레이션 파일(001~018)은 절대 고치지 않습니다.** 적용 기록에 체크섬이 남아서, 고치면 기존 DB가 시작을 거부합니다.
- 데이터를 지우거나 바꾸는 마이그레이션은 실장님께 먼저 확인받습니다.

## 6. 번역 (한국어 · 영어 · 프랑스어)

- 이 앱은 3개 국어입니다. 화면에 보이는 새 글자는 **`ko.js` · `en.js` · `fr.js` 세 파일 모두**에 넣습니다.
  마다가스카르 현장은 **프랑스어**를 씁니다. 프랑스어를 빼먹으면 현장 화면에 키 이름이 그대로 뜹니다.
- 새 키는 **자기 접두어**를 붙이고(예: `rc_waitingList`), 각 파일 맨 아래의 **자기 표시 사이에만** 넣습니다.

  ```js
    // ── begin reception (rc_) ──
    rc_waitingList: "대기 목록",
    // ── end reception ──
  ```
- 이미 있는 키의 문구를 바꿔야 하면 그 한 줄만 고치고 인계 노트에 적습니다.

## 7. 실행 중인 EMR은 건드리지 않습니다

- `http://localhost:9080`(컨테이너 `bethesda-emr-*`)은 실장님이 쓰고 있는 인스턴스입니다.
- **작업공간에서 `docker compose up`을 그냥 실행하면 안 됩니다.** `docker-compose.yml`의 프로젝트 이름이 고정이라,
  실행 중인 EMR 컨테이너를 **작업공간의 코드로 갈아엎습니다.**
- 화면으로 확인하려면 **자기 전용 격리 스택**을 띄웁니다. DB도 따로 생기니 마음대로 테스트해도 됩니다.

  ```bash
  cp C:/Bethesda-EMR-main/.env .env      # 처음 한 번 (비밀값 파일, git 에는 없음)
  SESSION=reception SESSION_PORT=9181 \
    docker compose -p bethesda-s-reception \
      -f docker-compose.yml -f docker-compose.session.yml up -d --build
  # → http://localhost:9181   처음 접속하면 관리자 계정을 새로 만듭니다
  ```
- 격리 스택은 `bethesda-s-<코드>-backend:dev` · `-frontend:dev` 이름으로 이미지를 빌드합니다(2026-09-29 `657ba2c`부터). 그 전에는 실행 중인 EMR의 이미지 이름표(`bethesda-emr-*:latest`)를 세션 코드로 덮어썼습니다 — 옛 명령으로 띄운 스택이 있으면 `down` 하고 다시 띄우세요.
- 다 쓰면 **내립니다.** 8개 세션이 다 띄워 두면 PC가 무거워집니다.

  ```bash
  docker compose -p bethesda-s-reception -f docker-compose.yml -f docker-compose.session.yml down
  ```
  DB까지 지우려면 `down -v`.
- PACS(Orthanc, 워크리스트 브리지)는 격리 스택이 없습니다. PACS 세션은 아래 PACS 절을 따릅니다.

## 8. 확인 — 「됐다」고 말하기 전에

- **프론트엔드 빌드가 통과해야 합니다.** `frontend`에서 `npm install --no-package-lock` 후 `npm run build` (저장소에 `package-lock.json`이 없어 `npm ci`는 안 됩니다. Dockerfile과 같은 방식입니다. 잠금 파일이 생겼으면 커밋하지 마세요)
- 고친 백엔드 파일은 `node --check <파일>`
- 화면이 바뀌었으면 격리 스택에서 **직접 눌러 봅니다.** 한국어·프랑스어 둘 다 확인합니다.
- 인쇄 문서를 고쳤으면 **실제 인쇄 폭**으로 확인합니다. 인쇄 여백이 14mm라 본문 폭은 약 **688px**, 한 장 높이는 약 **1017px**입니다.
- 테스트 코드는 아직 없습니다. 만든다면 자기 모듈 것만 만들고, 인계 노트에 실행 방법을 적습니다.
- 확인하지 못한 것은 **확인하지 못했다고** 씁니다. 추측을 사실처럼 쓰지 않습니다.

## 9. 위키 쓰는 법

- 자기 페이지는 `wiki/modules/<코드>.md` **하나**입니다. 다른 세션 페이지는 고치지 않습니다.
  목차(`wiki/README.md`)·개요(`00-overview.md`)·이 문서는 총괄이 관리합니다.
- 페이지 구조는 뼈대에 있는 순서를 지킵니다. 칸을 지우지 말고, 쓸 게 없으면 「없음」이라고 씁니다.
- **코드를 고친 커밋과 같은 커밋에서** 위키도 고칩니다. 나중에 몰아서 쓰지 않습니다.
- 두 부류의 독자가 있습니다.
  - **2절 「화면 사용법」** 은 병원 직원이 읽습니다. 버튼 이름 그대로, 순서대로, 전문 용어 없이 씁니다.
  - **3절 이후** 는 다음에 이 코드를 고칠 사람이 읽습니다. 파일·함수·API·테이블 이름을 정확히 씁니다.
- **왜 그렇게 되어 있는지**를 씁니다. 「무엇」은 코드를 보면 알지만 「왜」는 위키에만 남습니다.
- 확인한 사실만 씁니다. 모르는 것은 「확인 필요」로 표시합니다.

## 10. 인계 노트

- 작업 단위가 끝날 때마다 `wiki/handoff/<코드>.md`에 **위에 새 항목을 추가**합니다. 형식은 `wiki/handoff/README.md`에 있습니다.
- 총괄은 이 노트를 보고 확인하고 합칩니다. **공용 파일 변경**과 **다른 세션에 부탁**은 빠뜨리면 안 됩니다.

## 11. 실장님께 먼저 여쭤볼 것

- 화면 구성이 크게 바뀌는 것, 기존 기능을 없애는 것
- 데이터를 지우거나 바꾸는 마이그레이션
- 다른 모듈의 동작이 바뀌는 것
- 의학적 판단이 들어가는 것 (검사 기준치, 약 용량, 수술 기록 양식 등)

## 12. 합치는 절차 (총괄)

1. 인계 노트와 브랜치 차이를 확인한다
2. `develop`에 합치고, 마이그레이션 번호를 `019`부터 다시 매긴다
3. 빌드하고, 실행 중인 EMR에 반영해서 화면으로 확인한다
4. 위키 목차·개요를 갱신하고, 배포할 때 `CHANGELOG.md`를 쓴다
