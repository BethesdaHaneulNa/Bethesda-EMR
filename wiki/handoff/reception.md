# 접수 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 서버 권한 검사 (S2, 실장님 결정)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`48059dd` 위, `develop` ff 뒤)
- **한 일**: `patient.routes.js`·`visit.routes.js`의 모든 라우트에 `permMiddleware`. 표는 설정 세션 초안(`handoff/settings.md` 「S2 — 라우트별 허용 권한표 초안」) 그대로이며, 부르는 곳을 grep으로 다시 확인해 **빠진 화면 없음**을 확인함.
  - 확인한 것: 약국·접수는 PatientFinder를 `mode="patient"`로만 써서 `/visits/patient`를 안 부름. 임상병리는 PatientChart를 안 써서 `/patients/:id/history`를 안 부름(차트뷰어는 `/patients/:id`만).
  - `PUT /visits/:id`: registration 또는 payment. 단 **registration 없이 payment만** 있는 계정이 `visit_type` 말고 다른 칸(`VISIT_FIELDS`)을 보내면 403 `{error:'Access denied', detail:'payment may change visit_type only, not …'}` — 무시하지 않고 거절(총괄 지시)
  - 접수 화면: 403 `Access denied` → `rc_accessDenied` 안내(S1로 권한이 바로 빠질 수 있어서)
  - 각 라우트 위에 「왜 이 권한인가」 주석, 파일 머리에 규칙
- **바꾼 파일**: `backend/src/routes/patient.routes.js`, `backend/src/routes/visit.routes.js`, `frontend/src/pages/Registration.jsx`(errText 한 줄), **새** `backend/test/reception.api.mjs`
- **공용 파일 변경**: i18n 3개 `rc_` 블록에 `rc_accessDenied` 1개. 그 밖에 없음 — `middleware/auth.js`는 이미 있는 `permMiddleware`·`effectivePerms`를 가져다 쓰기만
- **DB 마이그레이션**: 없음
- **번역 키**: `rc_accessDenied` 1개 (ko · en · fr)
- **시험 스크립트**: `backend/test/reception.api.mjs` — **격리 스택 전용**(포트 9080·빈 포트는 거부).
  - 역할 7개 + 관리자 × 라우트 14줄 = 112건, 그리고 S1 확인 2건: 수납 전용 계정이 403 → 관리자가 접수 권한 체크 → **같은 토큰**으로 201.
  - 실행: `node backend/test/reception.api.mjs`(기본 `http://127.0.0.1:9181/api`). 새 스택이면 관리자를 만들고, 관리자가 이미 있는 스택이면 `RC_TEST_LOGIN=… RC_TEST_PASSWORD=…`. 시험 계정(`rct_*`)의 권한·비밀번호는 매번 초기화. 끝나면 만든 대기 내원을 취소함
  - 역할 기본 권한은 `middleware/permissions.js`를 그대로 옮겨 적음. `POST /admin/staff`는 권한을 안 보내면 `[]`로 저장하므로(역할 기본값 아님) 명시해서 보냄
- **확인한 방법**:
  - `node --check` 두 파일, `npm run build` 통과
  - 격리 스택 9181(develop `48059dd` 위 — 019·020 마이그레이션 적용됨)에서 시험 스크립트 3번 실행, 모두 114/114
  - 화면(역할별 계정으로 네트워크의 400번대 응답을 기록):
    · 간호사 → 접수: 검색·환자 선택·이력·미수·차트뷰어
    · 의사 → 진료: 대기열·환자 찾기(내원 모드)·내원 선택·진료 열기·이력
    · 수납 전용 → 수납: 목록·환자 선택·과거 내원·**진료비를 재진으로 바꿔 수납 확정** → `PUT /visits/20` 200, DB `followUp`, 영수증 생성
    · 약국 전용 → 약국: 환자 찾기(환자 모드)·환자 선택·이력
    · 검사 전용 → 임상병리: 환자 찾기(내원 모드)·내원 목록
    · 결과: **403·400번대 0건**
  - 간호사 계정으로 접수 화면을 연 채 관리자가 「접수」 권한을 뺌 → 저장 → 프랑스어 「Vous n'avez pas l'autorisation…」
- **확인 못 한 것**:
  - 통계·설정 화면은 이 두 파일을 안 불러서 따로 누르지 않음
  - 의사 계정의 문서 발급·차트뷰어(`/patients/:id`)는 시험 스크립트로만 확인 — 문서 라우트는 진료 몫
  - 프론트데스크 역할로 화면은 안 누름. 권한이 간호사+수납의 합이라 스크립트로만 확인
- **위키**: `modules/reception.md` 머리, 2절 권한 안내(간호사 역할, 바로 적용, 거절 안내), 2.8 표에 권한 거절 줄, 4절 서버 — **라우트별 권한 표**, 6절 권한, 7절 ⑧ 고침, 8절
- **총괄 확인 요청**: 표가 설정 초안과 같음. 운영 반영 후 쓰는 직원 계정 중에 역할과 **다르게 권한을 좁게 준** 계정이 있으면, 그 계정으로 쓰는 화면을 한 번 눌러 봐 주세요 — 스크립트는 역할 기본값과 수납 전용·통계 전용만 봄
- **다른 세션에 부탁**: 없음 (수납: `Payment.jsx`가 보내는 `{visit_type}`는 그대로 통과함을 화면으로 확인)

## 2026-09-29 — 작업 계획: ⑦ 내원구분 칸 · ④ 중복·동명이인 경고 (결정 대기, 코드 변경 없음)

> **총괄 확인 (2026-09-29)**: 합침(위키만). ⑦·④ 작업 계획 확인 — 결정이 오면 이 계획대로. ⑦을 하게 되면 수납 세션에 알림.

- **상태**: 보류 — `wiki/decisions.md` 20번(실장님 결정) 대기. 이 항목은 결정이 어느 쪽으로 나도 바로 시작할 수 있게 적어 둔 계획
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`4cb5841` 위, `develop` ff 뒤). 코드 변경 없음
- **기준 코드**: `develop` `4cb5841`에서 다시 읽음

### ⑦ 내원구분 칸

**지금**: 접수 화면에 고르는 칸이 없어 새 접수는 모두 `newVisit`. 수납 화면이 청구 항목을 불러올 때 `visit_type`을 처음 값으로 쓰고(`Payment.jsx` 146행 `setVType(bi.visit_type || v.visit_type)`), 직원이 바꾸면 수납 확정 때 `PUT /visits/:id {visit_type}`로 내원에 다시 씀(232행). 진료비는 서버가 `visit_type` → `C01`~`C04`로 계산(`billing.routes.js` 78행 `/pending`, 444~470행 `buildCorrection`). 통계는 취소 아닌 내원을 `visit_type`으로 셈(`stats.routes.js` 53~55행).

**결정 갈래** (decisions 20번 세부): (A) 기본값 — 늘 초진 / 전에 온 적 있으면 재진 / 최근 N일 안에 왔으면 재진 / 같은 과에 N일 안에 왔으면 재진. (B) 접수에서 「Sans consultation (0)」(진료비 없음)을 고를 수 있게 할지.

**바꿀 파일**
| 파일 | 무엇 |
|---|---|
| `frontend/src/pages/Registration.jsx` | 「Service / Type de Visite」 아래에 단추 줄 **Nouvelle · Suivi · Urgence · Référence** (+ (B)가 「예」면 **Sans consultation (0)**). 상태는 이미 있는 `visitForm.visitType`. 이미 있는 **공용 번역 키** `newVisit`·`followUp`·`emergency`·`referral`·`noConsult`를 씀(수납 화면과 같은 글자 — 새 키 불필요) |
| 〃 `fillPatient` | (A)가 「재진 제안」이면: 환자를 고를 때 `GET /visits/patient/:id`(이미 있음, `status`·`visit_date`·`department_id` 반환)로 취소 아닌 이전 내원을 보고 기본값을 정함. 신규 환자는 늘 초진. 직원이 바꾼 값은 덮지 않음 |
| 〃 `createOrUpdateVisit` | 새 접수: 지금처럼 `visit_type` 보냄. **접수 수정**: 1차 ②에서 `visit_type`을 빼 둔 상태 → 직원이 **이 화면에서 바꿨을 때만**(dirty 표시) 보냄. 수납이 그 사이 바꾼 값을 옛 값으로 덮지 않기 위함 |
| `backend/src/routes/visit.routes.js` `/today` | 줄마다 `has_active_bill`(취소 안 된 청구가 있는지) 추가 — 청구가 있으면 접수 화면에서 단추를 잠그고 「수납에서 바꾸세요」 표시 |
| `frontend/src/i18n/*.js` (rc_ 블록) | `rc_visitTypeLocked`(청구 뒤 잠김 안내) 1개. (A)가 제안 방식이면 `rc_visitTypeSuggested`(「전에 온 적이 있어 Suivi를 골라 두었습니다」 같은 작은 글) 1개 |
| `wiki/modules/reception.md` | 2.4 칸 표에 **Type de Visite** 줄, 2.8에 잠김 안내, 3·4절 흐름·API, 7절 ⑦ 고침 |

**API 모양**: 새 엔드포인트 없음. `POST /visits`·`PUT /visits/:id`는 1차에서 이미 `visit_type`을 검사함. `/visits/today` 응답에 `has_active_bill: boolean`만 늘어남(읽는 곳: 접수, 진료 — 진료는 모르는 칸을 무시하므로 영향 없음).

**다른 모듈 영향**
- **수납**: 코드 변경 불필요. 접수가 고른 값이 수납 화면 진료비 칸의 처음 값으로 뜸 → 수납 직원이 매번 바꾸던 일이 사라짐. 수납에서 바꾸는 기능은 그대로.
- **청구 후 변경 위험**: 청구가 있는 내원의 `visit_type`을 접수가 바꾸면 `/pending`이 「추가 청구/환불」로 다시 올림(`needs_additional`/`needs_refund`). → 위처럼 **청구가 있으면 접수 단추를 잠금**. 서버에서 막지는 않음 — 수납 자신이 추가 청구 전에 `PUT /visits/:id {visit_type}`을 부르므로 서버에서 막으면 수납이 깨짐.
- **통계**: 수납 전에도 초진/재진 수가 맞음. 과거 데이터는 그대로(바꾸지 않음).
- **진료·약국·검사**: `visit_type`을 읽지 않음(grep 확인).

**격리 스택 확인 시나리오** (프랑스어·한국어)
1. 신규 환자 접수 — Nouvelle이 골라져 있음 → 등록 → DB `visit_type='newVisit'`
2. Suivi로 바꿔 등록 → DB `followUp` → 진료 완료 처리 → 수납 화면 진료비 칸이 **Suivi / C02 가격**으로 뜸
3. (제안 방식이면) 전에 온 환자를 고르면 Suivi가 골라져 있고 안내 글이 보임, 처음 온 환자는 Nouvelle, 취소된 내원만 있는 환자는 Nouvelle
4. 대기 중 내원을 고르고 Urgence로 바꿔 「Modifier l'enregistrement」 → `emergency`. 종류를 **안 건드리고** 메모만 고치면 → 그 사이 DB에서 바꿔 둔 값이 유지됨(덮지 않음)
5. 수납까지 끝난 내원을 고름 → 단추가 잠겨 있고 안내가 보임
6. 통계 운영 현황의 초진/재진 수가 접수 직후 바로 맞게 나옴
7. 「Sans consultation (0)」 — (B) 결정대로 보이거나 안 보임

**크기**: 작음 — 화면 한 곳 + 서버 쿼리 한 줄 + 키 1~2개. 마이그레이션 없음.

### ④ 중복·동명이인 경고

**지금**: 1차 ③으로 연타·재시도 중복은 막음. 막지 못하는 것 — (가) 다른 날 같은 사람을 새 환자로 또 등록(차트 두 개, 합치는 기능 없음 — 7절 ⑲) (나) 같은 날 같은 환자를 두 번 접수(진료·청구 두 건 — 7절 ④).

**결정 갈래**: (1) **경고만**(확인하면 진행) / **막기**. (2) 같은 사람으로 볼 기준 — 성·이름만 / 성·이름+생년월일(생년월일이 한쪽이라도 비면 이름만으로). (3) 같은 날 두 번 접수가 정상인 경우가 있는지(오전·오후 다른 과 등) — 있으면 (나)는 경고만이어야 함.

**(가) 동명이인 — 바꿀 파일·API**
| 파일 | 무엇 |
|---|---|
| `backend/src/routes/patient.routes.js` | **새** `GET /api/patients/similar?last_name=&first_name=&date_of_birth=` → `[{id, chart_no, last_name, first_name, date_of_birth, phone, last_visit_date}]`, 최대 10건. 비교는 `lower(trim())`, **성·이름이 뒤바뀐 경우도** 잡음(현장에서 순서가 섞임). 기준 (2)에 따라 생년월일 조건을 넣고 뺌. ⚠ `router.get('/:id')`보다 **먼저** 선언해야 함(아니면 `/:id`가 `similar`를 id로 받아 400) |
| 〃 (막기로 결정되면) | `POST /patients`에서도 같은 검사 → 409 `Similar patient exists` — 창구가 두 곳이면 화면 검사만으로는 틈이 있음. 경고만이면 서버 검사 없음 |
| `frontend/src/pages/Registration.jsx` | 새 환자를 만들기 직전(`createOrUpdateVisit`·`savePatientOnly`의 `POST /patients` 앞)에 `similar` 조회 → 있으면 **작은 창**: 후보 줄마다 차트번호·이름·생년월일·전화·마지막 내원과 **「Utiliser ce patient」**(이 환자로 접수 — `fillPatient` 후 계속), 아래에 **「Nouveau patient quand même」**(그래도 새로 등록, 막기면 없음)·**「Annuler」**. `window.confirm`으로는 「이 환자로」를 고를 수 없어 화면 안 창으로 만듦(Registration 안에서만, 공용 부품 아님) |
| i18n (rc_) | `rc_similarTitle` `rc_similarUse` `rc_similarCreateAnyway` `rc_similarBlocked` `rc_cancel` 정도 5개 + 표 머리는 기존 공용 키(`chartNo`·`dob`·`phone`) |

**(나) 같은 날 중복 접수 — 바꿀 파일·API**
| 파일 | 무엇 |
|---|---|
| `frontend/src/pages/Registration.jsx` | `POST /visits` 전에, 이미 들고 있는 오늘 목록(`visits`, 30초마다 갱신)에서 같은 `patient_id`의 취소 아닌 내원을 찾음 → 경고면 `confirm(rc_dupVisit: 「{name} est déjà enregistré aujourd'hui ({상태}, {의사}). Enregistrer une seconde visite ?」)`, 막기면 알림만 |
| `backend/src/routes/visit.routes.js` `POST /` | 서버 뒷받침: 오늘 같은 환자의 `registered`·`waiting`·`in_progress` 내원이 있으면 409 `Patient already registered today` — **경고만**이면 본문 `allow_duplicate: true`일 때 통과(화면이 확인 뒤 붙여 보냄), **막기**면 늘 409. `completed`는 (3) 결정에 따라 넣거나 뺌 |
| `Registration.jsx` `errText` | `Patient already registered today` → `rc_dupVisit`류 안내 (서버 문구와 짝 — 3절에 적어 둔 규칙) |
| i18n (rc_) | `rc_dupVisit` `rc_dupVisitBlocked` 2개 |

**API 모양 요약**: 새 `GET /patients/similar` 하나. `POST /visits`에 선택 필드 `allow_duplicate` 하나와 409 하나. (막기면) `POST /patients`에 409 하나. 응답 형식 변화 없음. `client.js`는 오류 본문의 다른 필드를 버리고 `error` 문구만 넘기므로(총괄 파일), 화면은 **문구로** 구분함.

**다른 모듈 영향**: 없음 — 환자·내원을 **만드는** 곳은 접수뿐(grep 확인). PatientFinder 안 건드림. 마이그레이션 없음(작은 병원이라 이름 비교에 색인 불필요. 환자 수만 명을 넘으면 `lower(last_name), lower(first_name)` 색인을 `101_reception_…`으로).

**격리 스택 확인 시나리오** (프랑스어·한국어)
1. `Rakoto Jean 1990-05-03`이 있을 때 새 환자 `Rakoto Jean` 입력 → 창에 후보 1건 → 「Utiliser ce patient」 → 새 차트 안 생기고 기존 차트로 접수됨
2. 같은 입력 → 「Nouveau patient quand même」(경고만일 때) → 새 차트 생김 / (막기일 때) 버튼 없음
3. 성·이름을 **뒤바꿔** `Jean Rakoto` 입력 → 후보로 잡힘
4. 생년월일이 다른 동명이인 → 기준 (2)대로 잡히거나 안 잡힘
5. 대소문자·앞뒤 공백만 다른 이름 → 잡힘
6. 오늘 대기 중인 환자를 다시 접수 → 확인 창 → 취소하면 아무것도 안 생김 / 확인하면(경고만) 두 번째 내원 생김
7. 창구 두 곳 흉내: 화면 목록이 오래된 상태에서 API로 같은 환자 내원을 먼저 만들어 두고 접수 → 서버 409 → 안내가 뜸
8. 오늘 **취소된** 내원만 있는 환자 → 경고 없이 접수됨
9. 1차 ③ 회귀: 버튼 연타·재시도에도 환자 1명

**크기**: 보통 — 서버 조회 1개 + 서버 검사 1~2개 + 화면 안 창 1개 + 키 6~7개. (가)와 (나)는 따로 나눠 합칠 수 있음.

- **바꾼 파일**: 이 노트만 · **공용 파일 변경**: 없음 · **번역 키**: 없음
- **확인한 방법**: 계획에 적은 줄 번호·동작은 `4cb5841` 코드를 다시 읽어 확인(`Payment.jsx` 146·232·578행, `billing.routes.js` 78·444~470행, `stats.routes.js` 53~55행, `visit.routes.js`·`patient.routes.js` 라우트 순서, 공용 키 `newVisit`·`followUp`·`emergency`·`referral`·`noConsult`의 ko·fr 값)
- **다른 세션에 부탁**: 없음 — ⑦을 하게 되면 **수납**에 「접수가 고른 진료비 종류가 처음 값으로 뜸」을 알려 달라고 총괄에 부탁할 예정

## 2026-09-29 — 위키 2절(직원용 사용법)을 수납·통계 페이지 형식으로

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`1b1a6fb` 위, `develop` ff 뒤)
- **한 일**: 총괄 요청대로 2절을 수납 페이지와 같은 구성으로 다시 씀. 프랑스어 화면 이름을 먼저, 괄호에 한국어.
  - 권한 안내(**🏥 Enregistrement** 체크, Front Desk 기본)
  - 2.1 화면 구성 + **버튼 표**(8개)
  - 2.2 처음 온 환자 · 2.3 다시 온 환자
  - 2.4 **왼쪽 칸별 뜻 표** — 환자 정보 8칸, 오늘 접수 3칸, 가운데 Dû·Rembours. 상자
  - 2.5 대기 목록 **상태 표**(뜻 · 누가 바꾸나)
  - 2.6 수정·취소
  - 2.7 환자 찾기 창 — 다섯 화면 공용이라 칸 이름과 수납상태 뱃지 뜻까지
  - 2.8 **이런 안내가 뜰 때 표** — 성공·확인 창 4개, 오류 창 9개, 목록이 빌 때
- **바꾼 파일**: `wiki/modules/reception.md`(머리, 2절 전체, 8절), 이 노트. **코드 변경 없음**
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 2절에 쓴 프랑스어 글자는 모두 `fr.js`의 실제 값과 대조함(메뉴 `Enregistrement`, 칸 이름, 탭, 찾기 창 칸·뱃지, `Fermer`, 권한 체크박스가 `아이콘 + t[m.key]`인 것까지). 안내 문구는 앞선 작업에서 격리 스택 화면으로 본 그대로. 「목록이 빌 때」 줄은 `loadData`가 실패해도 `Chargement`을 끝내는 것을 코드로 확인하고 씀
- **확인 못 한 것**: 이번엔 화면을 다시 띄우지 않음(코드 변경 없음)
- **위키**: `modules/reception.md` 2절 전체
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: 없음 — 참고로 2.7(환자 찾기 창)은 진료·수납·약국·임상병리 페이지에서 링크해 써도 됨

## 2026-09-29 — 대기 목록 자동 새로고침(⑰) + 2차 후보 결정 자료

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토: 30초마다 대기 목록만 다시 받고 입력 중인 값은 그대로, 고른 내원은 상태만 맞춤, 느린 옛 응답이 새 목록을 못 덮게 번호 매김. 실행 중 EMR에서는 빌드·화면 열림만 확인(동작은 세션의 격리 스택 확인). 2차 후보 표는 결정 세션에 넘김.

- **상태**: 확인 요청 (자동 새로고침) · 보류 (2차 후보 — 결정 세션을 통한 실장님 결정 대기, 아래 표)
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`b01c6a0` 위, `develop` ff 뒤)
- **한 일**: 총괄 지시대로 임상병리와 같은 규칙으로 접수 대기 목록 자동 새로고침.
  - 30초마다, `document.hidden`이 아닐 때만 `/visits/today`를 조용히 다시 받음 (`refreshQueue()`). 「Chargement」 표시 없음
  - 왼쪽 입력(`form`·`visitForm`·`memo`)은 건드리지 않음. 고른 내원(`sel`)은 **상태만** 새 값으로 맞춤 → 진료가 시작되면 「대기 취소」 버튼이 저절로 사라짐 (1차 ①의 409가 날 일이 줄어듦)
  - 실패하면 기존 목록 유지, 알림 없음
  - 요청 번호(`queueSeq` ref)로 느린 옛 응답이 새 목록을 덮지 못하게 함 (`loadData()`도 같이 씀)
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음 (새 글자 없음)
- **확인한 방법**:
  - `npm run build` 통과. 격리 스택 9181(한국어 화면)
  - 대기 환자를 고르고 접수 메모에 저장 안 한 글자를 넣은 채, 뒤에서 DB로 `in_progress`로 바꿈 → 33초 뒤 탭 숫자 「대기 2→1, 진료중 1→2」, 「대기 취소」 버튼 사라짐, 메모·주호소 그대로, 알림 0
  - API 컨테이너만 멈춤 → 새로고침 요청 502 두 번, 목록·입력 그대로, 알림 0
  - 탭이 가려진 경우: 이 브라우저 창은 뒤쪽 탭도 `document.hidden=false`라 탭 전환으로는 시험이 안 됨 → 페이지 안에서 `document.hidden`을 `true`로 흉내 내고 63초 동안 `/visits/today` 요청 **0건**, 되돌리니 다시 30초 간격 확인
- **확인 못 한 것**: 실제 브라우저에서 다른 탭으로 옮겼을 때(진짜 `hidden`)는 확인 못 함 — 위처럼 흉내로만. 프랑스어 화면은 새 글자가 없어 따로 누르지 않음
- **위키**: `modules/reception.md` 머리, 2절(대기 목록 — 30초 자동), 3절(자동 새로고침 흐름), 7절(⑰ 고침, ㉒ 총괄 `b01c6a0` 고침 표시, 2절 안내 표의 「1분」→「몇 초」), 8절
- **총괄 확인 요청**: 없음 (특이 사항 없음)
- **다른 세션에 부탁**: 없음

### 2차 후보 — 실장님 결정 자료 (결정 세션용)

| 후보 | 화면이 어떻게 달라지는지 (프랑스어 화면 기준) | 작업 크기 | 다른 모듈 영향 | 실장님께 여쭐 것 |
|---|---|---|---|---|
| **⑦ 내원구분 칸** | 왼쪽 「Service / Médecin」 아래에 단추 줄이 생김: **Nouveau · Suivi · Urgence · Référé · Sans frais**(신환·재진·응급·의뢰·진료비 없음). 기본은 Nouveau. 접수 수정 때도 바꿀 수 있음 | 작음 — 접수 화면만. API는 이미 받음(`visit_type`) | **수납**: 진료비가 처음부터 맞게 들어옴(지금은 수납 직원이 매번 바꿈). 수납 코드는 안 바꿔도 됨. **통계**: 신환/재진 수가 수납 전에도 맞음 | ① 기본값을 Nouveau로 둘지, **이전 내원이 있으면 Suivi를 먼저 골라 둘지**(진료비 정책) ② 접수에서 「Sans frais」(진료비 없음)를 고를 수 있게 할지, 수납에서만 할지 |
| **④ 중복·동명이인 경고** | (가) 신규 환자 등록 때 성·이름(·생년월일)이 같은 환자가 있으면 확인 창: 「같은 이름의 환자가 있습니다: 26-00012 Rakoto Jean 1990-05-03. 그래도 새로 등록할까요?」 (나) 오늘 이미 대기·진료중인 환자를 또 접수하면 확인 창: 「이 환자는 오늘 이미 접수되어 있습니다」 | 보통 — 서버에 확인용 조회 1~2개 + 화면 확인 창 | 없음 (접수 안에서 끝남) | ① **경고만** 할지(확인 누르면 진행) **막을지** ② 같은 환자로 볼 기준 — 이름만 / 이름+생년월일 ③ 같은 날 두 번 접수가 정상인 경우가 있는지(오전·오후 다른 과 등) |
| **⑥ 진료과 칸** | 「Service / Médecin」 한 칸이 **두 칸**으로: Service(진료과) + Médecin(의사). 의사를 고르면 그 의사의 과가 먼저 채워지지만 바꿀 수 있음 | 작음 — 접수 화면만. API는 이미 받음(`department_id`) | **통계**: 진료과별 내원·매출이 실제 진료한 과 기준이 됨. 지금은 의사의 소속과 | ① 한 의사가 여러 과 진료를 실제로 보는지 — 아니면 지금 방식(자동)으로 충분 ② 과를 고르면 의사 목록을 그 과로 좁힐지 |
| **주소·휴대폰 칸** | 왼쪽 환자 정보에 칸 추가: **Mobile · Adresse · Ville · Région · N° CIN**(휴대폰·주소·도시·지역·신분증 번호). 왼쪽 칸이 길어져 아래로 조금 더 내려야 함 | 작음~보통 — 화면 + 대기 목록에서 고를 때 환자 전체 정보를 받아오도록 (1차 ⑤ 수정으로 덮어쓰기 위험은 없어짐) | **인쇄 문서**: 문서 머리에 주소·전화가 이미 찍히게 되어 있어(지금은 늘 빈칸) 바로 채워짐. **통계**: 미수 명단의 연락처가 휴대폰을 먼저 씀 | ① 어떤 칸이 필요한지 — 특히 **신분증 번호(CIN)** 는 개인정보라 받을지 ② 필수로 할지 |

**접수 세션 추천 순서**: **⑦ → ④ → ⑥ → 주소·휴대폰**
- ⑦이 먼저: 매일 모든 환자에게 수납 직원이 손으로 고치는 일을 없애고, 통계의 신환/재진 오류를 바로 없앰. 작고 다른 모듈 코드를 안 바꿈
- ④ 다음: 중복 차트는 한 번 생기면 합치는 기능이 없어 되돌리기 어려움 (7절 ⑲). 1차에서 연타는 막았지만 「다른 날 같은 사람을 또 등록」은 못 막음
- ⑥은 한 의사가 여러 과를 보는 일이 실제로 있어야 의미가 있음 — 없으면 미뤄도 됨
- 주소·휴대폰은 필요한 칸과 개인정보 방침이 정해져야 함

## 2026-09-29 — ⑪ 마무리(남은 영어 문구)와 위키 2절 프랑스어 기준 정리

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토: 읽기 경로 오류도 `sendDbError`, 알림·확인 창·날짜 칸 안내가 세 언어. 부탁 1(㉒)은 총괄이 `frontend/nginx.conf`의 `/api/`에 `proxy_connect_timeout 5s` 넣음. 참고 2(진료 스택 옛 이미지)는 진료 세션에 알림 — 운영 이미지 이름표는 총괄 배포로 다시 맞춰져 있음(실행 중 컨테이너와 태그 일치 확인). 2차 순서는 결정 세션에서 실장님께 여쭘.

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`ee078d4` 위, `develop`을 ff로 당긴 뒤)
- **한 일**: 총괄 요청대로 ⑪ 나머지와 2절 정리.
  - 완료·확인 창을 버튼 이름에 `' ✓'`를 붙이던 방식에서 언어별 문장으로 — 「Patient mis en attente — 이름 (N° dossier 26-00006)」, 「Enregistrement modifié — 이름」, 「Patient enregistré — N° dossier …」, 「Annuler l'attente de 이름 et le retirer de la liste ?」. `fill()`로 `{name}` 자리 채움
  - 생년월일 칸 안내 글자 `YYYY/MM/DD` → 화면 언어 (프랑스어 `AAAA/MM/JJ`)
  - 서버 연결 실패(브라우저 fetch 실패, nginx 「API backend is not reachable…」, `client.js` 「API response was not JSON…」), `Patient not found`, `Visit not found`, `sendDbError`의 형식 오류를 화면 언어 안내로. 그 밖은 「Erreur : 원문」. 저장·상태 변경 실패 뒤 대기 목록 다시 불러옴
  - `patient.routes.js`·`visit.routes.js`의 **읽기** 경로 오류도 `sendDbError`로 (예: `/patients/abc` 500 → 400)
  - 위키 2절을 프랑스어 화면 이름 먼저(괄호에 한국어)로 다시 쓰고, 「안내 창이 뜨면」 표(프랑스어·한국어·할 일) 추가
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `backend/src/routes/patient.routes.js`, `backend/src/routes/visit.routes.js`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `rc_` 블록 안에서만. 그 밖에 없음 (PatientFinder 안 건드림)
- **DB 마이그레이션**: 없음
- **번역 키**: 추가 12개 — `rc_errorWith` `rc_phYear` `rc_phMonth` `rc_phDay` `rc_patientSaved` `rc_registered` `rc_visitUpdated` `rc_cancelConfirm` `rc_patientNotFound` `rc_visitNotFound` `rc_serverDown` `rc_badFormat` (ko · en · fr 모두). **삭제 1개** — `rc_error`(1차에서 넣은 것, 접수만 썼고 `rc_errorWith`로 바뀜. grep으로 다른 사용처 없음 확인)
- **확인한 방법**:
  - `npm run build` 통과 · `node --check` 두 파일 통과 (최신 `develop` `ee078d4` 위에서 다시 확인)
  - 격리 스택 9181 (규칙 7절 명령 그대로, 이미지 `bethesda-s-reception-*:dev` 확인), 프랑스어: 생년월일 칸 `AAAA / MM / JJ`, 신규 등록 → 「Patient mis en attente — Rakotobe Lina (N° dossier 26-00006)」, 접수 수정 → 「Enregistrement modifié — Rakotobe Lina」, 취소 확인 문구, **API 컨테이너만 멈추고** 저장 → 「Impossible de joindre le serveur…」
  - 한국어: 「환자 정보를 저장했습니다 — 차트번호 26-00007」, 생년월일 칸 `YYYY/MM/DD`
  - API: `/patients/abc`·`/patients?limit=x`·`/visits/patient/abc` → 400. `date_of_birth`가 `"1990-05-03"`으로 나옴(총괄 `7ad4387` 확인)
- **확인 못 한 것**: `Visit not found`·`Patient not found` 안내는 화면에서 재현 안 함(기록을 지우는 기능이 없어 만들기 어려움 — 문구 맞춤만 코드로 확인). 영어 화면은 안 눌러 봄
- **위키**: `modules/reception.md` 머리, 2절 전체 다시 씀, 3절(오류 문구·`fill`·생년월일 안내 글자), 4절(읽기 경로 오류, 날짜 형식), 7절(⑪ 고침, ㉑ 총괄 해결 표시, ㉒ 추가), 8절
- **총괄 확인 요청**:
  1. **㉒ (낮음)**: 백엔드가 멈췄는데 nginx가 예전 주소를 기억하면, 저장 버튼이 **약 60초** 「Enregistrement…」로 멈춰 있다가 안내가 뜸(nginx 기본 `proxy_connect_timeout`). 데이터 문제는 없음. `frontend/nginx.conf`의 `location /api/`에 `proxy_connect_timeout 5s;` 정도를 제안 — 총괄 소관이라 손대지 않음
  2. 참고: 17:0x 무렵 `bethesda-s-consultation-*` 스택이 아직 **옛 명령**으로 떠 있어 `bethesda-emr-*:latest` 이름표를 다시 쓰고 있었음 (`docker ps`에 image `bethesda-emr-backend:latest`로 보임). 진료 세션이 `657ba2c`를 당기지 않은 듯
- **다른 세션에 부탁**: 없음 (위 2는 총괄이 진료 세션에 전달 부탁)
- **남은 일 · 알려진 문제**: 2차 후보(⑥ 진료과 칸, ⑦ 내원구분 칸, ④ 중복 접수·동명이인 경고, 주소·휴대폰 입력 칸, 대기 목록 자동 새로고침) 순서를 실장님께 여쭙는 중. 7절 나머지

## 2026-09-29 — 1차 수정: 대기 취소·상태 되돌림·중복 등록·인적사항 덮어쓰기·오류 창 번역

> **총괄 확인 (2026-09-29)**: 합침(`edd4174`) + 실행 중 EMR 반영. 확인: 완료 내원 취소 → 409 「Only a waiting visit can be cancelled」 · 빈 본문 `PUT /visits/:id` → 400 · `PUT /patients/:id`에 이름·전화만 보내도 주소 유지(운영 DB에서 값 되돌려 놓고 확인). 요청 1(㉑ 날짜)은 총괄이 `7ad4387`로 해결 · 요청 2(이미지 이름표)는 `657ba2c` · 요청 3(`npm ci`)은 규칙 8절 고침. 16:49 재생성은 총괄 배포가 맞고 web 이미지도 본체 코드였음(그 뒤 다시 빌드해 지금은 합친 코드).

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`1ee97ce` 위)
- **한 일**: 실장님이 고른 1차 묶음(위키 7절 ①②③⑤⑨⑪).
  - ① 대기 취소가 `'canceled'` 오타로 늘 실패하던 것 → `'cancelled'`. 그리고 서버가 **대기 중인 내원만** 취소하게 함(아니면 409) — 접수 목록은 자동 새로고침이 없어서, 고쳐 놓으면 의사가 이미 연 내원을 취소할 수 있게 되기 때문
  - ② 「접수 정보 수정」이 목록을 누른 시점의 `status`(와 `visit_type`)를 다시 보내, 진료 완료된 내원을 대기로 되돌려 수납 목록에서 빼던 것 → 화면이 고치는 칸만 보냄
  - ③ 등록 버튼 연타·재시도로 같은 환자가 두 번 생기던 것 → 저장 중 버튼 잠금(ref + disabled), 만든 환자는 바로 기억
  - ⑤ 대기 목록에서 고른 환자를 저장하면 주소·휴대폰·신분증 번호 등을 빈 값으로 덮던 것 → 화면은 보이는 칸만 보내고, 서버 `PUT /patients/:id`는 **본문에 있는 칸만** 씀
  - ⑨ `PUT /visits/:id`에 `visit_type`·`status` 검사, 칸별 저장(담당의·진료과를 비울 수 있게)
  - ⑪ 오류·안내 창을 화면 언어로 (이름 누락, 생년월일 불완전/잘못됨, 취소 불가, 「오류」 접두어)
  - 덤: 기존 환자 인적사항 저장 실패를 삼키고 접수를 진행하던 `catch (e) {}` 제거 — 이제 멈추고 알림. 환자·내원 쓰기 경로의 DB 오류를 `sendDbError`로 4xx 처리
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `backend/src/routes/patient.routes.js`, `backend/src/routes/visit.routes.js`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `rc_` 블록 안에만 키 추가 (규칙 6절대로). 그 밖에 없음. `utils/dbError.js`는 **가져다 쓰기만** 함
- **DB 마이그레이션**: 없음
- **번역 키**: `rc_nameRequired` `rc_dobIncomplete` `rc_dobInvalid` `rc_cancelNotWaiting` `rc_error` `rc_saving` — 6개 (ko · en · fr 모두 넣음)
- **API 동작 변경 (다른 모듈 영향 확인용)**:
  - `PUT /api/patients/:id` — 예전: 모든 칸을 본문 값으로 덮어씀. 지금: 본문에 있는 칸만. 부르는 곳은 접수뿐 (grep 확인)
  - `PUT /api/visits/:id` — 예전: 모든 칸 `COALESCE`(null이면 유지). 지금: 본문에 있는 칸만, `department_id`/`doctor_id`는 null로 비울 수 있음, `visit_type`/`status`는 검사. **수납**이 `{visit_type}`만 보내는 호출은 전과 똑같이 `visit_type`만 바뀜 (격리 스택에서 확인)
  - `PUT /api/visits/:id/status` — `cancelled`는 `registered`/`waiting`에서만. 다른 상태 이동은 전과 같음. 부르는 곳은 접수뿐
  - 쓰기 오류가 500+DB 원문 → 400/404/409 + `sendDbError` 문구
- **확인한 방법**:
  - `npm run build` 통과 · `node --check` 두 파일 통과
  - 격리 스택 9181, API로: 인적사항 칸별 저장(주소 유지), `date_of_birth: ''`→null, 이름 없으면 400, 대기 취소 200, 오타 `canceled` 400, 완료 내원에 접수식 수정 → `completed` 유지, 완료/진료중 내원 취소 → 409, `visit_type: bogus` 400, 수납식 `{visit_type}`만 → 다른 칸 유지, 담당의·진료과 비우기, 빈 본문 400, 없는 내원 404
  - 화면(프랑스어): 이름 없이 등록 → 「Saisissez le nom et le prénom.」, 연도만 → 「Complétez la date…」, 1985-02-30 → 「La date de naissance n'est pas valide…」, 버튼 더블클릭 → 저장 중 「Enregistrement…」로 잠기고 환자 1명·내원 1건, 스크립트로 같은 순간 3번 클릭 → 환자 1명·내원 1건, 대기 취소 → 취소됨
  - 화면(한국어): 대기 목록에서 고른 뒤 뒤에서 DB로 `completed` 만들고 「접수 정보 수정」 → `completed` 유지, 뒤에서 `in_progress` 만들고 「대기 취소」 → 안내 문구 뜨고 취소 안 됨·목록 갱신, 이름 누락 문구
  - 알림 창은 브라우저 창에서 확인하려고 `window.alert`를 가로채 문구를 읽었음 (실제 창 모양은 안 봄)
- **확인 못 한 것**: 진료 화면에서 실제로 진료를 열어 `in_progress`를 만든 것은 아님 (DB로 상태만 바꿈). 수납 화면을 직접 눌러 보지는 않음 (API로 같은 호출만 확인)
- **위키**: `modules/reception.md` 머리·2절(등록·수정·취소 사용법)·3절(흐름·상태 전부)·4절(API 표 3줄 + 오류 처리)·7절(①②③⑤⑨⑪ 고침 표시, ⑭ 갱신, ㉑ 추가)·8절
- **총괄 확인 요청**:
  1. **㉑ 새로 찾은 높음 — 날짜가 하루 이르게 나옴.** DB는 `1990-05-03`인데 API가 `"1990-05-02T21:00:00.000Z"`를 돌려주고, 화면들이 `split('T')[0]`으로 **5월 2일**을 보여줌. 접수에서 환자를 불러 저장하면 **DB의 생년월일이 하루 당겨짐** (격리 스택에서 재현). 인쇄 문서의 생년월일·나이, 환자 찾기 창 내원 날짜, 진료 화면 생년월일도 같은 원인. **이 커밋에서는 안 고쳤고 운영 중인 EMR에도 있는 문제**. 근본 해결은 `backend/src/config/database.js`(총괄 소관)에 DATE(OID 1082)를 문자열 그대로 받는 파서 — 영향 범위가 전 모듈이라 총괄 판단 필요. 실장님께 보고함
  2. **격리 스택이 실장님 EMR의 이미지 이름표를 덮어씀.** `docker-compose.yml`이 `image: bethesda-emr-backend:latest`·`bethesda-emr-frontend:latest`를 고정하고 `docker-compose.session.yml`은 이걸 안 바꿔서, 규칙 7절 명령으로 빌드하면 **실행 중인 EMR이 쓰는 이름표가 세션 코드로 바뀜**. 2026-09-29 확인 때 `bethesda-emr-api` 컨테이너는 `504cf…`로 도는데 `bethesda-emr-backend:latest` 이름표는 다른 세션이 막 빌드한 `b55272…`를 가리켰음. 실행 중인 컨테이너는 괜찮지만, 본체에서 **빌드 없이** `docker compose up`을 하면 세션 코드로 바뀔 수 있음. 제안: `docker-compose.session.yml`에 `backend: image: bethesda-s-${SESSION}-backend:latest`, `frontend: image: bethesda-s-${SESSION}-frontend:latest` 추가. 접수 세션은 scratchpad의 덮어쓰기 파일(`-f …/reception-images.yml`)로 그 두 줄을 넣어 띄웠음 — 접수는 이름표를 건드리지 않음.
     **관찰 (2026-09-29 16:49 무렵)**: 접수가 격리 스택을 내리기 2초 전, `C:\Bethesda-EMR-main`에서 `bethesda-emr` 프로젝트 컨테이너 3개가 다시 만들어짐(docker events). 새 `bethesda-emr-api`는 그때 막 빌드된 `de3d81…`, `bethesda-emr-web`은 **8분 전**에 만들어진 `5aac26…`. 총괄이 의도한 반영이었다면 문제없음. 아니라면 web 이미지가 본체 코드인지(다른 세션 빌드가 이름표에 얹힌 것이 아닌지) 확인 부탁. 접수 세션은 9080을 조회조차 하지 않았음
  3. **규칙 8절 `npm ci`가 안 됨** — 저장소에 `package-lock.json`이 없음. 접수는 `npm install --package-lock=false` 후 `npm run build`로 확인
- **다른 세션에 부탁**:
  - **총괄** — 위 1·2·3
  - **수납** — 참고: `PUT /visits/:id`에서 `visit_type`이 잘못되면 이제 400을 받음. 수납은 `try { … } catch(e){}`로 이 호출 오류를 삼키고 있어서(`Payment.jsx` 187·220행), 만약 잘못된 값을 보내면 청구는 진행되고 `visit_type`만 안 바뀜. 지금 수납이 보내는 값은 모두 허용 목록 안이라 실제 영향은 없음
- **남은 일 · 알려진 문제**: ㉑ 결정 대기. 2차 후보(⑥ 진료과 칸, ⑦ 내원구분 칸, ④ 중복 접수·동명이인 경고, 주소·휴대폰 입력 칸, 대기 목록 자동 새로고침)와 나머지 7절 항목

## 2026-09-29 — 현황 파악과 위키 작성 (코드 변경 없음)

- **상태**: 보류 — 무엇부터 고칠지 실장님 결정 대기. 이 커밋 자체는 위키뿐이라 합쳐도 무해함
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`a4a9ea6` 위)
- **한 일**: 접수 화면·환자/내원 API·관련 테이블·`PatientFinder`를 전부 읽고 `wiki/modules/reception.md` 1~8절을 실제 코드 기준으로 채움. 버그·위험 20건을 7절에 심각도·근거와 함께 정리. 브랜치 이름을 `session/reception`으로 바꿈
- **바꾼 파일**: `wiki/modules/reception.md`, `wiki/handoff/reception.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기만. 격리 스택은 아직 안 띄움
- **확인 못 한 것**: 7절의 모든 항목은 코드로만 확인 — 화면에서 재현은 아직 안 함. ⑭(생년월일 반쪽 값에 대한 서버 반응), ⑩·⑳(의도인지)는 「확인 필요」
- **위키**: `modules/reception.md` 1~8절 전체
- **총괄 확인 요청**: 7절 ①(대기 취소가 항상 실패), ②(접수 수정이 진료 완료된 내원을 대기로 되돌려 수납 목록에서 빠짐)는 현장에서 바로 영향이 있는 것 — 우선순위 참고
- **다른 세션에 부탁**:
  - **총괄** — `backend/src/utils/validate.js`의 `GENDERS`에 `'O'`가 있는데 DB `patient.gender` CHECK는 `M`,`F`뿐 (7절 ⑬). 어느 쪽에 맞출지 결정 필요. 지금 화면엔 영향 없음
  - **수납** — 참고: 접수 화면에 내원구분 칸이 없어 모든 접수가 `newVisit`로 들어오고, 수납 화면이 `PUT /visits/:id`로 고치고 있음 (7절 ⑦). 접수에 내원구분 칸을 넣게 되면 수납 쪽 기본값 동작을 같이 봐야 함
  - **진료·수납·약국·임상병리** — 참고: `PatientFinder` 외래 내역에 취소된 내원도 섞여 나옴 (7절 ⑮). 고칠 때는 접수가 하고 인계 노트에 적겠음
- **남은 일 · 알려진 문제**: `wiki/modules/reception.md` 7절 ①~⑳
