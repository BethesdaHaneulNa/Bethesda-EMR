# 진료 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-10-01 — 정리: 차트 머리줄은 날짜와 과·의사만 (「오늘 / 이 내원」에 딸린 것 지움)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `9a7eb55`를 merge한 뒤(`cb5315f` 전과 창은 이미 `13c63d5`로 합쳐져 있어 따로 올립니다)
- **한 일**: 실장님 결정(「그냥 날짜만」)으로 총괄이 머리줄의 글자를 뺀 뒤 남은 것을 지웠습니다.
  - 번역 키 `cs_noteToday`·`cs_noteThisVisit`(ko·en·fr) — 다른 곳에서 쓰지 않음(grep 0건).
  - `Consultation.jsx`의 `consult.client_day`와 그 주석.
  - `consult.routes.js` `POST /`의 `visit_is_today`와 `is_today` 계산·주석 — 다른 쓰임 없음. 내원 조회는 전의 `SELECT status, visit_date …`로 돌아감.
  - 문서: 모듈 2.2·2.5·3.1·8, 설명서 fr §3-4·§11-1·「Changer de médecin」 4번, changelog 초안의 「Aujourd'hui」를 「날짜와 과·의사」로.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `backend/src/routes/consult.routes.js` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js` · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md` · `wiki/reference/changelog-1.5.0/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 뺌 `cs_noteToday`·`cs_noteThisVisit`
- **확인한 방법**: `npm run build`, `node --check` 통과. 남은 쓰임 grep 0건. 격리 스택: 진료 열기(`POST /consultations` 새로 201·다시 200, `opener-e2e` 4항목) 통과, 화면(1366×768 KO) 머리줄 «2026-10-01 | GEN S2 doctor». 덤으로 전과 창의 ko 한 줄 «과도 바뀝니다: GEN → PED»를 화면에서 확인(앞 보고에서 빌드만 했던 것).
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-10-01 — 전과 창에서 「과」 칸을 뺌: 의사만 고르기

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `47ce599` 다음
- **한 일** (실장님: 「원장님이 과에 묶여 나오는데 닥터만 있으면 되는 것 아니냐」 — 과를 바꾸자 의사 칸이 비고 Change가 꺼진 상태가 헷갈렸음):
  - 창에는 **의사**(「과 – 이름」, 모든 활성 의사, 내원의 과 의사가 위)와 **사유**만. 과 칸·과 목록 읽기를 없앰.
  - 서버에는 전처럼 `department_id`·`doctor_id`를 같이 보냄: 과 = 고른 의사의 과, 과 없는 의사면 내원의 지금 과.
  - 고른 의사의 과가 지금과 다르면 한 줄: «Le service change aussi : GEN → PED.» / «과도 바뀝니다: GEN → PED» / «The department also changes: GEN → PED.»
  - 확인은 지금과 **다른 의사를 골랐을 때만** 켜짐. 의사 없는 내원은 「—」가 골라져 있고 의사를 골라야 함(과만 바꾸는 길 없음 — 접수 화면에서).
  - **생각해 둔 구석**: 의사에게도 내원에도 과가 없으면 보낼 과가 없습니다(서버는 과 없이 받지 않음). 그때는 확인을 끄고 «Ni ce médecin ni cette visite n'ont de service. Indiquez le service à l'accueil.» 한 줄.
  - 제목·알림을 의사 기준으로: «Changer de médecin» / «전과 — 의사 바꾸기», «Médecin changé ✓». 거절 문장의 「과·의사」도 「의사」로. 쉬는 과 거절(`BAD_DEPARTMENT`)은 「그 의사의 과를 쓸 수 없음 — 접수에서 확인」.
  - 지운 키: `cs_trDept`·`cs_trPickDoctor`. 더한 키: `cs_trDeptFollows`·`cs_trNoDept`.
  - 설명서 fr 절 이름 「Changer de médecin」(2번 고침), 모듈 문서 2.7·3.1·8, changelog 초안.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js` · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md` · `wiki/reference/changelog-1.5.0/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음
- **번역 키**: 더함 `cs_trDeptFollows`·`cs_trNoDept` · 뺌 `cs_trDept`·`cs_trPickDoctor` · 글 바꿈 `cs_trTitle`·`cs_trDone`·`cs_trCancelled`(ko)·`cs_trPaid`·`cs_trBadDept`
- **확인한 방법**: `npm run build` 통과. 격리 스택 1366×768.
  - 창: 칸은 의사 하나(`select` 1개), 라벨 «Médecin / Motif (facultatif)», 지금 의사가 골라져 있고 Changer 꺼짐.
  - GEN · S2 doctor → «PED – Dr PEDIA»: «Le service change aussi : GEN → PED.», Changer → «Médecin changé ✓», 파란 줄 «PED Dr PEDIA». DB PED · Dr PEDIA, 기록 한 줄.
  - GEN · S2 doctor → «Dr DEUX»(과 없음): 한 줄 없음, 파란 줄 «GEN Dr DEUX». DB 과 GEN 그대로.
  - GEN · 의사 없음: «—»에 Changer 꺼짐 → S2 doctor를 고르면 «—»가 목록에서 빠지고 켜짐 → «GEN S2 doctor». 기록 «GEN → GEN · S2 doctor».
  - 과도 의사도 없는 내원: Dr DEUX(과 없음) → 「과가 없습니다」 한 줄, 꺼짐. S2 doctor → «Le service change aussi : — → GEN.», 켜짐.
  - EN·KO 문장 확인(창 전체 글), KO 어두운 화면·FR 밝은 화면 그림 확인. ko 한 줄은 조사가 과 코드에 따라 어색해(「GEN로」) 「과도 바뀝니다: A → B」로 고침.
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-10-01 — 오른쪽 맨 위 묶음의 「오늘」: 오늘의 내원일 때만

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `5076ed5` 다음
- **한 일**:
  - 지난 날의 내원을 「Trouver patient → Sélection visite」로 열면 머리가 «2026-09-30 오늘»이던 것 → 오늘의 내원이 아니면 **「Cette visite / 이 내원 / This visit」**(`cs_noteThisVisit`). 날짜는 그대로 앞에 있습니다.
  - 판단은 **서버 날짜**: `POST /consultations` 응답에 `visit_is_today`(`visit_date = todayLocal()`, 새로 열 때와 다시 열 때 모두). PC 시계가 틀려도 맞습니다.
  - **자정을 넘긴 화면**: 열 때의 PC 날짜를 `consult.client_day`로 적어 두고, 그 뒤 PC 날짜가 바뀌면 「오늘」을 떼어 「Cette visite」로(15·30초 새로고침이 다시 그릴 때). 서버에 다시 묻지 않고, PC 시계의 **변화**만 봅니다.
  - 총괄이 바꾼 파란 줄 순서(단추 다섯 → ⇄ 전과 → 과·의사 → 차트번호 → 이름 → 성별/생년월일 → 알레르기 → 메모)를 모듈 문서 2.7·3.1과 설명서 fr(전과 단추 위치, §11 맨 위 묶음)에 반영.
- **바꾼 파일**: `backend/src/routes/consult.routes.js`(`POST /` 응답에 `visit_is_today`) · `frontend/src/pages/Consultation.jsx` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js`(`cs_noteThisVisit`) · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 더함 `cs_noteThisVisit`
- **확인한 방법**: `npm run build`, `node --check` 통과. 격리 스택(서버 날짜 2026-10-01).
  - API `today-e2e` 4항목: 어제 내원 다시 열기 false · 오늘 내원 처음 열기(201) true · 다시 열기(200) true · 어제 내원 처음 열기(201) false.
  - 화면(1366×768 FR): 대기 목록의 오늘 내원 «2026-10-01 | Aujourd'hui» → Sélection visite에서 09-30 내원 «2026-09-30 | Cette visite» → 오늘 내원을 다시 연 뒤 화면의 시계를 하루 앞으로(Date를 바꿔 흉내) 두고 17초 → «2026-10-01 | Cette visite».
- **확인 못 한 것**: 실제 자정(흉내로 대신).
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — 전과 손질: 의사를 먼저 고르기, 꺼진 단추의 색

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `0fdbb58` 다음
- **한 일**:
  - **꺼진 단추**(수납된 내원): `opacity:0.6`을 빼고 파란 띠의 흐린 글자·테두리색(`#6f8db3`·`#2b4568`)으로. 파란 띠는 고정 색 예외 구역이라 이름표가 아니라 띠 안의 다른 글자처럼 hex입니다.
  - **의사 고르기**(부탁하신 모양 + 한 가지 더):
    - 의사 목록에 모든 활성 의사를 「과 – 이름」으로. 순서는 **이 내원의 과** 의사 → 과 없는 의사 → 나머지(과 코드·이름).
    - 다른 과의 의사를 고르면 과가 그 의사의 과로 따라감. 과 없는 의사는 과 그대로.
    - 과를 바꾸면 목록은 좁히지 않고, 고른 의사가 그 과가 아니면 의사 칸만 「— Choisissez le médecin —」(`cs_trPickDoctor`, ko·en·fr)로 비움 → 확인 꺼짐.
    - **더 한 것 — 의사 칸을 과 칸 위로**: 가장 흔한 일이 「의사만 바꾸기」이고 과는 그 결과로 따라가므로, 고르는 순서대로 위에서 아래로(의사 → 과 → 사유). 과를 먼저 보게 두면 의사만 바꾸려는 사람도 과 칸을 먼저 읽게 됩니다.
    - **정렬 기준은 창에서 고른 과가 아니라 내원의 과**: 처음에 고른 과를 기준으로 했더니 의사를 고를 때마다(과가 따라가며) 목록 순서가 바뀌어, 방금 본 자리에 다른 이름이 오는 것을 격리에서 보고 고쳤습니다.
  - 설명서 fr 「Changer de médecin / de service」 2번: «Pour changer seulement de médecin, choisissez-le : le service suit tout seul.»
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js`(`cs_trPickDoctor`) · `wiki/modules/consultation.md`(2.7·3.1·8) · `wiki/manual-fr/consultation.md` · `wiki/reference/changelog-1.5.0/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 더함 `cs_trPickDoctor`
- **확인한 방법**: `npm run build` 통과. 격리 스택 1366×768.
  - 내원 GEN · S2 doctor(과가 다른 의사 셋: GEN S2 doctor, 과 없는 Dr DEUX, PED Dr PEDIA): 목록 «GEN – S2 doctor | Dr DEUX | PED – Dr PEDIA», 고르는 동안 순서 그대로.
  - Dr PEDIA를 고름 → 과 PED로 따라감, 확인 켜짐. 과 INT → 의사 칸 «— Choisissez le médecin —», 꺼짐. Dr DEUX(과 없음) → 과 INT 그대로, 켜짐. 과 SUR → Dr DEUX 유지. 다시 Dr PEDIA → PED.
  - 실제로 바꾸기(KO·어두운 화면): 의사 Dr PEDIA 하나만 고르고 «바꾸기» → «과·의사를 바꿨습니다 ✓», 파란 줄 «PED Dr PEDIA». DB 내원·진료 과 PED, 기록 «GEN · S2 doctor → PED · Dr PEDIA».
  - 수납된 내원: 단추 `disabled`, 계산된 `opacity 1`, 글자 rgb(111,141,179)·테두리 rgb(43,69,104), title «이미 수납한 내원이라 전과할 수 없습니다». 파란 띠는 밝은·어두운 화면에서 같은 색.
  - 창: FR 밝은 화면·KO 어두운 화면 그림 확인.
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — 전과: 접수의 서버 길과 이어 끝까지 시험

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `c4a63f5`을 merge(`c18fa1d`)한 뒤. `fe2c993`(화면 먼저)도 함께.
- **한 일**:
  - 거절 문장을 서버의 **code**로 고름(6개): `VISIT_NOT_FOUND`·`VISIT_CANCELLED`·`VISIT_BILLED`(영수증 번호를 문장에)·`BAD_DEPARTMENT`·`BAD_DOCTOR`·`NO_CHANGE`. 모르는 code는 서버 문장 그대로. `cs_trBad`를 `cs_trBadDept`·`cs_trBadDoctor`로 나눔.
  - `api/client.js`가 오류에 `status`·`code`·`data`를 붙임(기존 `message`는 그대로 — 다른 화면 영향 없음).
  - 결정대로 **수납이 끝난 내원은 단추를 끄고** 이유를 title로(`cs_trBilledTitle`). 대기 목록 줄은 `has_active_bill`, 「Trouver patient」·「Sélection visite」로 연 내원은 `billing_id`+`bill_status`로 봄.
  - **의사를 비우지 않음**: 의사가 있는 내원은 「—」가 없고 의사를 골라야 확인이 켜짐. 의사가 없는 내원만 「—」로 과만 바꿈. 과는 꼭 골라야 함.
  - 모듈 문서에 총괄이 넣은 것 셋(파란 줄 「과 + 의사」, 「Dose/j」 머리 11px·nowrap, history의 과 = 내원의 과) 반영. 설명서 fr 「Changer de médecin / de service」에 회색 단추·의사 규칙. changelog 초안에 절 하나.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `frontend/src/api/client.js` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js`(cs_trBad 빼고 cs_trBadDept·cs_trBadDoctor·cs_trBilledTitle 더함, cs_trPaid에 {receipt}) · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md` · `wiki/reference/changelog-1.5.0/consultation.md` · 이 노트
- **공용 파일 변경**: `frontend/src/api/client.js` — `request()`의 오류가 `err.status`·`err.code`·`err.data`를 가짐(5줄). 던지는 시점·`message`는 같음.
- **DB 마이그레이션**: 없음
- **번역 키**: 더함 `cs_trBadDept`·`cs_trBadDoctor`·`cs_trBilledTitle` · 뺌 `cs_trBad` · 바꿈 `cs_trPaid`({receipt})
- **확인한 방법**: `npm run build` 통과. 격리 스택.
  - 서버 거절 여섯을 실제로(`transfer-e2e`): 없는 내원 404 · 바뀐 것 없음 400 · 없는 과 400 · 간호사 계정 400 BAD_DOCTOR · 취소된 내원 409 · 수납된 내원 409 + `receipt_no` — 모두 code가 맞음.
  - 화면(1366×768 FR): GEN · S2 doctor 내원에 저장 안 한 글을 친 채 ⇄ → 의사 목록에 「—」 없음 → PED를 고르면 의사가 비고 Changer 꺼짐 → Dr DEUX → 사유 «Avis pediatrique» → Changer → 알림 «Service et médecin changés ✓», 파란 줄 «PED Dr DEUX», 오른쪽 오늘 머리 «PED Dr DEUX», **칸의 글 그대로**(«● Non enregistrée»도), 대기 목록에서 빠짐(이제 Dr DEUX의 환자). DB: 내원 과·의사와 진료의 과가 PED로, 기록 한 줄 `visit.transfer` «GEN · S2 doctor → PED · Dr DEUX»(사유 포함).
  - 거절 문장: 답을 흉내 내어 6개 code + 모르는 code를 FR·EN·KO에서 모두 띄움 — 21문장이 모두 제 언어, 영수증 번호가 들어감, 모르는 code는 «Erreur : Something new».
  - 수납된 내원(PAYE): 단추 꺼짐, title «Déjà encaissée : la visite ne peut plus être transférée».
  - 의사 없는 내원(SANSMEDTR): 「—」가 있고 PED만 골라 Changer → 파란 줄 «PED», DB 과만 바뀜, 기록 «GEN → PED».
  - 창의 밝은·어두운 화면은 `fe2c993` 때 봄(이번에 바뀐 것은 목록 항목과 단추 켜짐 조건뿐).
- **확인 못 한 것**: 접수 화면 쪽 전과(그쪽 몫). 실제 이틀 이상 지난 내원의 전과(서버 규칙은 날짜를 보지 않음).
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — 전과 단추 (화면 먼저, 접수의 서버 길 대기)

- **상태**: 진행 중 — 화면은 끝남, 서버(`PUT /api/visits/:id/transfer`, 접수)가 develop에 오면 끝까지 시험
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `2028e87` 다음
- **한 일**:
  - 파란 줄의 「GEN Dr …」 이름표 옆 **⇄ Transfert**(ko 전과 · en Transfer). 취소된 내원에는 없음.
  - 작은 창: **Service** → **Médecin**(그 과의 의사 + 과 없는 의사 + 지금 의사) → **Motif (facultatif)** → **Changer**. 지금 값이 골라져 있고, 바뀐 것이 없으면 Changer가 꺼짐. 목록은 접수 화면과 같은 `GET /admin/departments`·`GET /admin/doctors`.
  - 확인 뒤: 답(그 내원 줄)의 과·의사 칸만 `sel`(파란 줄·오른쪽 오늘 머리)·대기 목록·`consult.department_id`에 합침. 내 기록 칸·처방·오더는 건드리지 않음(`pickPatient`를 부르지 않음 — 저장 안 된 글도 그대로). 성공은 잠깐 뜨는 알림.
  - 거절 문장(ko·en·fr): 취소된 내원 · 수납이 끝난 내원 · 바뀐 것 없음 · 쓸 수 없는 과/의사 · 없는 내원. 약속이 문장을 정하지 않아 **낱말로 고름**(`transferError`) — 접수 커밋이 오면 실제 문장으로 다시 맞춤.
  - 설명서 fr에 「Changer de médecin / de service」 절(§11과 §12 사이).
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `frontend/src/i18n/ko.js`·`en.js`·`fr.js`(cs_ 13개) · `wiki/modules/consultation.md`(2.7·3.1·8) · `wiki/manual-fr/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음
- **번역 키**: `cs_transfer`·`cs_trTitle`·`cs_trDept`·`cs_trDoctor`·`cs_trReason`·`cs_trConfirm`·`cs_trKeep`·`cs_trDone`·`cs_trCancelled`·`cs_trPaid`·`cs_trNoChange`·`cs_trBad`·`cs_trNotFound`
- **확인한 방법**: `npm run build` 통과. 격리 스택 1366×768 FR, 밝은·어두운 화면: 과·의사가 없는 내원에서 창을 열면 두 칸 「—」, Changer 꺼짐 → Service «GEN – Médecine Générale» → 의사 목록이 «Dr DEUX»(과 없음)·«GEN – S2 doctor»로 좁혀짐, Changer 켜짐 → 의사 고름. 서버 길이 아직 없어 **Changer는 누르지 않았습니다**.
- **확인 못 한 것**: 서버와 이어진 전체(바뀐 뒤 화면 갱신, 거절 문장, 변경 기록 한 줄) — 접수 커밋 뒤.
- **다른 세션에 부탁**: 접수 — 거절 문장(영어 원문)을 인계 노트에 적어 주시면 화면 쪽 매칭을 그 문장으로 맞춥니다.
- **남은 일 · 알려진 문제**: 위 끝까지 시험.

## 2026-09-30 — 차트 머리줄(과 + 내원 의사)·탭 이름 문서 반영, 오늘 묶음의 의사 이름 대체

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `e4df1d8` 다음
- **한 일**:
  - 총괄이 넣은 두 가지(차트 머리줄 「과 + 접수 때 정한 의사」, 탭 `pastVisits` → `patientChart`)를 모듈 문서 2.2·2.5·3.1·8과 changelog 초안에 적었습니다.
  - **확인 요청받은 두 곳**:
    - 과거 보기(`renderPast` 머리, `c.dept_code`·`c.doctor_name`) — `c`가 history의 줄이라 이미 새 뜻(내원 의사, 없으면 연 계정). 어긋남 없음.
    - 서류(`DocumentModal` `signer`) — 의사 계정이면 그 사람, 아니면 `ctx.doctor_name` = `sel.doctor_name`(내원의 의사, `visit.routes.js` 19·82가 `v.doctor_id`로 이음). history의 새 뜻과 같음. 어긋남 없음.
  - **어긋난 곳 하나를 고쳤습니다**: 오른쪽 오늘 묶음은 `sel.doctor_name`만 써서, 내원에 의사가 없으면 오늘은 과만 보이다가 다음 날 지난 내원 목록(history)에서는 연 계정 이름이 붙었습니다(같은 내원의 머리가 바뀜). `POST /consultations`가 `opened_by_name`(진료를 처음 연 계정)을 돌려주고, 오늘 묶음은 `sel.doctor_name || consult.opened_by_name` — history와 같은 대체입니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js`(`POST /` 응답에 `opened_by_name`) · `frontend/src/pages/Consultation.jsx`(오늘 묶음 한 줄) · `wiki/modules/consultation.md` · `wiki/reference/changelog-1.5.0/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build`, `node --check` 통과. 격리 스택 `opener-e2e` 4항목 통과 — 내원 의사 없음: 오늘 머리 = history 머리 = «S2 doctor»(연 계정). 내원 의사 Dr DEUX: 둘 다 «Dr DEUX»(연 계정은 S2 doctor). 새로 연 진료(201)와 다시 연 진료(200) 모두 `opened_by_name`.
- **다른 세션에 부탁**: 없음.
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — 문서 한 줄: WL 칸 상태 글자 (총괄 `de7559e`), 마이그레이션 038

- **상태**: 확인 요청 (문서만)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `4d71a43` 다음
- **한 일**: 모듈 문서 3.1 「오더 줄의 상태 칸」에 총괄이 고친 것 한 줄(`orderStatus()` 워크리스트 상태 `inline-block`·`nowrap`·11px, 영상 단추 padding `1px 4px`·오른쪽 3px, ko `cs_wsCompleted` 「촬영완료」). 마이그레이션 표기를 038로(4절 목록·표, 8절). 3.1의 `saveNote()` 설명이 옛 방식(`note_text`를 `PUT /:id`로)으로 남아 있던 것을 고침. 인계 노트의 옛 항목(201이라 적은 것)은 그때 기록이라 두었습니다.
- **바꾼 파일**: `wiki/modules/consultation.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: develop `4d71a43`의 `de7559e` 변경(`Consultation.jsx` 7줄, `ko.js` 1줄)을 읽고 적음.
- **다른 세션에 부탁**: 없음. 탭 이름은 결정 전까지 바꾸지 않습니다.
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — 의사마다의 진료 기록 (결정 (나)·(가)·바이탈 한 벌)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `42d0afe` 다음
- **한 일** (설계 7.5 → 결정 반영, 자세히는 모듈 문서 2.2·3.1·3.2·4·7.3):
  - **표** `consultation_note` — UNIQUE(consultation_id, author_id), 빈 글 금지. 마이그레이션 **`201_consultation_note.sql`**(총괄이 038로)이 옛 `note_text`를 옮깁니다(비어 있지 않은 S/O/A/P는 「S: …」로 앞에 붙임, `doctor_id`의 기록, 두 번 돌려도 같음). 같은 파일에 `prescription.prescribed_by`, `consultation.vitals_by`·`vitals_at`. `note_text` 칸은 남기고 읽지 않음.
  - **서버**: `GET /:id/notes`, `PUT /:id/note`(내 것만 — 작성자는 토큰, 요청으로 남의 것을 가리킬 길 없음, `canEditNote` 한 함수, 빈 글 = 내 줄 지움, 끝난 진료면 기록 1줄). `PUT /:id`는 바이탈만, `note_text`가 오면 400. 바이탈이 바뀌면 `vitals_by`·`vitals_at`. 처방에 `prescribed_by`, 처방·오더 읽기에 작성자 이름.
  - **화면**: 칸 = 「Ma note de consultation」(저장해도 비우지 않음, 다시 열면 그대로, 저장 전 「● Non enregistrée」). 오른쪽 맨 위 「Aujourd'hui」 블록에 의사마다 이름·시각(·modifiée)과 글, 내 것은 파란 선. 30초마다 남의 기록을 다시 읽고 내 칸은 건드리지 않음. 다른 환자를 열 때 묻기(확인 = 저장하고 열기). Terminé가 내 기록도 먼저 저장. 저장 알림은 잠깐 뜨는 알림. 줄 작성자는 둘 이상일 때만 작은 글자. 바이탈 밑 「Dernière saisie : 이름 · 시각」.
  - **저장 안 된 글을 이 PC에**(총괄 조건 그대로): 키 `cs_noteDraft:<계정 id>:<진료 id>`, 저장하면 지움, 하루 지난 것은 열 때 지움, 로그아웃이 그 계정 것을 지움. 위키 7.3에 「공용 PC에 환자 글이 남음 — 떠날 때 로그아웃」.
  - **바이탈이 비어도**: 저장·완료가 막히는 곳 없음(시험). 바이탈 칸 값을 읽는 곳은 화면 표시뿐 — 진료 과거 보기, `PatientChart`(수납·약국) 둘 다 빈 칸은 「—」. 문서 엔진·통계는 바이탈 칸을 읽지 않음.
  - **탭 이름 제안**(바꾸지 않음): 오늘 것을 담으니 「Visites passées / 과거 내원 / Past visits」 → **「Dossier Patient」**(이미 있는 공용 키 `patientChart` — 수납·약국의 같은 탭이 쓰는 이름, ko·en에도 있음). 실장님 말씀의 「페이션트 차트」와 같습니다. 정해 주시면 진료 탭의 `t.pastVisits`를 `t.patientChart`로 바꾸는 한 줄입니다(새 키 없음).
- **바꾼 파일**: `backend/sql/201_consultation_note.sql`(새) · `backend/src/routes/consult.routes.js` · `backend/src/routes/patient.routes.js`(history 쿼리만) · `frontend/src/pages/Consultation.jsx` · `frontend/src/api/client.js`(logout 한 덩이) · `frontend/src/i18n/ko.js`·`en.js`·`fr.js`(cs_ 10개) · 위키(모듈 2.2·2.5·3.1·3.2·4·7.3·7.5·8, manual-fr §3·§11, changelog-1.5.0)
- **공용 파일 변경**:
  - `backend/src/routes/patient.routes.js`(**접수 파일, 총괄 허락**) — `GET /:id/history`에 `notes` 배열 + `note_text`를 「— 이름 HH:MM」 머리를 붙인 기록들로 채움, S/O/A/P는 null로. 다른 라우트는 그대로.
  - `frontend/src/api/client.js` — `logout()`이 `cs_noteDraft:<그 계정 id>:` 키를 지움(8줄).
- **DB 마이그레이션**: `201_consultation_note.sql` — **데이터를 옮김**(옛 기록 → 새 표, 옛 칸은 지우지 않음). 총괄이 038로 바꿔 주세요.
- **번역 키**: `cs_noteMineTitle`·`cs_noteUnsaved`·`cs_noteDraftBack`·`cs_noteUnsavedSwitch`·`cs_noteToday`·`cs_noteNone`·`cs_noteYou`·`cs_noteEdited`·`cs_noPastVisit`·`cs_vitalsBy` (ko·en·fr)
- **확인한 방법**: `npm run build`, `node --check` 통과. 격리 스택(마이그레이션 적용 로그 확인).
  - 옮기기: 글이 있던 진료 44건 → 기록 44건, 옛 S가 있던 것은 «S: toux sèche | P: Repos»처럼 붙음, `note_text`가 빠진 진료 0.
  - `notes-e2e` 22항목 모두 통과: 같은 의사 두 번 → 1개(글·updated_at 바뀜) / 두 의사 → 2개 / 요청 몸에 남의 `author_id`·`id`를 넣어도 내 것만 바뀜 / `PUT /notes/:id` 길 없음(404) / 관리자(모든 권한)도 자기 것만 / 빈 글 → 내 줄 지움 / 간호사 GET·PUT 403 / 진행 중 진료 기록 0줄 / `PUT /:id` note_text 400 / 바이탈 모두 빈 채 저장 200·완료 200 / 바이탈 바꾼 의사가 `vitals_by` / 끝난 진료의 내 기록 수정 → 기록 1줄(entity `consultation_note`), 같은 글 다시 → 0줄 / 환자 기록 API의 `note_text` «— S2 doctor 11:08 … — Dr DEUX 11:08 …» / `prescribed_by`와 이름.
  - 옛 `audit-e2e` 그대로 통과.
  - 화면(1366×768 FR, 의사 둘 — 두 번째 의사는 API로): 오른쪽 맨 위 «Aujourd'hui · Dr DEUX · 17:09 …», 지난 내원(3일 전) 밑에. 내 글 입력 → «● Non enregistrée», `localStorage`에 `cs_noteDraft:3:200` → F5 → 칸에 돌아오고 «… a été repris.» → Sauver → 알림 «Enregistré ✓», 칸 그대로, 오른쪽에 «S2 doctor (vous) · 17:10», 키 지워짐. 칸에 더 쓰는 동안 Dr DEUX가 글을 고침 → 30초 뒤 오른쪽 «Dr DEUX · 17:09 · modifiée 17:10», 내 칸은 그대로. 저장 안 한 채 다른 환자 → 물음(문장 확인), 확인 → 서버에 저장된 뒤 열림. 두 의사가 처방 한 줄씩 → 이름 옆 «Dr DEUX»·«S2 doctor». 로그아웃 → 내 키만 지워지고 다른 계정 키(가짜로 넣은 것)는 남음. 이틀 전 `at`의 키 → 열 때 버려지고 서버 글이 칸에. 어두운 화면·KO(«내 진료 기록», «오늘», «(나) · 수정 17:11») 확인.
- **확인 못 한 것**: 수납·약국 `PatientChart`와 접수 외래 내역 화면은 눈으로 보지 않았습니다 — API의 `note_text`(두 이름 머리)로 확인. 두 번째 의사를 실제 두 번째 브라우저로 쓰지는 않았습니다(API로 대신).
- **다른 세션에 부탁**:
  - 설정(급하지 않음) — `settingsAudit.js`의 `ENTITIES`에 `consultation_note` 이름표. 지금은 글자 그대로 보입니다. 필드 `note_text`의 이름표는 이미 있습니다.
  - 수납(급하지 않음) — `PatientChart`가 `notes`로 의사마다 나눠 그리려면 그쪽 몫입니다. 지금은 `note_text` 한 칸으로 이름 머리와 함께 보입니다.
  - 총괄 — 마이그레이션 번호 201 → 038. 탭 이름 제안(위)을 여쭤 주세요.
- **남은 일 · 알려진 문제**: 창만 닫고 로그아웃하지 않으면 저장 안 된 글이 그 PC에 하루 남습니다(7.3).

## 2026-09-30 — 설계 메모: 「쓴 사람이 있는」 진료 기록 (코드 전)

- **상태**: 확인 요청 (설계만 — 코드 없음)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `30aa85f` 다음
- **한 일**: 실장님이 두 의사 계정으로 써 보시고 주신 것(기록을 쓴 사람별 항목으로, 오른쪽 차트에 바로, 자기 것만 고침)의 설계를 `wiki/modules/consultation.md` **7.5**에 적었습니다.
  - 추천: **consultation은 내원에 한 줄 그대로, 기록만 새 표 `consultation_note`**. 두 방법의 비교와 스키마·옮기기 방법은 7.5에 있습니다.
  - API 셋(`GET`/`POST /:id/notes`, `PUT /notes/:id` — 남의 항목 403)과 `PUT /:id`는 바이탈만 받게(note_text가 오면 400) 하고, 화면 흐름 9가지를 적었습니다.
  - 기록을 읽는 곳 표 — **진료 파일 밖에서 꼭 바꿀 곳은 `GET /patients/:id/history`(접수 파일) 하나**입니다. 거기서 `note_text`를 항목들(이름·시각 머리)로 채워 주면, 수납·약국 PatientChart와 접수 외래 내역은 고치지 않아도 됩니다.
  - 총괄 메모와 다른 점: 통계의 의사별 건수·매출은 `consultation.doctor_id`가 아니라 **`visit.doctor_id`**를 씁니다 — 이 일로 바뀌지 않습니다.
  - 처방 줄에는 낸 사람 칸이 없어 `prescription.prescribed_by`를 더합니다(옛 줄 NULL). 바이탈은 `vitals_by`·`vitals_at`을 둡니다.
  - 올리지 않은 글은 서버 자동 저장 대신 이 PC의 브라우저에 두어 F5·정전 뒤 돌아오게 합니다(제안 — 빼기 쉬움).
- **바꾼 파일**: `wiki/modules/consultation.md`(7.5·8, 상태 줄) · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음(설계만, 번호는 총괄이 038로) · **번역 키**: 없음
- **확인한 방법**: 코드 읽기 — `note_text`·`FROM consultation`·`PatientChart`·`/history`를 모두 찾았고, `stats.routes.js` 188·208, `patient.routes.js` 228, `Registration.jsx` 761, `PatientChart.jsx` 75·111, `documents/registry.js` 37을 확인했습니다.
- **확인 못 한 것**: 실행 중 EMR에 옛 `subjective`·`objective`·`assessment`·`plan` 값이 있는지(세션 규칙상 보지 않음) — 옮기기에 합칠지는 총괄이 개수를 본 뒤 정해 주세요.
- **다른 세션에 부탁**: (코드 단계에서) 접수 — `GET /patients/:id/history`에 `notes`·`note_text` 채우기, 또는 총괄이 진료에 허락. 설정 — `settingsAudit.js` `ENTITIES`에 `consultation_note`.
- **남은 일 · 알려진 문제**: 결정 대기 ① 관리자가 남의 항목 수정 ② 바이탈 의사별 — 그리고 진료가 여쭐 것 하나(같은 날 두 번 쓰면 항목 둘 vs 이어 쓰기). 결정이 오면 코드로 갑니다.

## 2026-09-30 — 영상이 있는 하루 시험의 진료 몫 (B 1, C 3)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `a81006d` 다음
- **한 일** (보고서 `wiki/reference/integration-test-imaging-2026-09-30.md`):
  - **1) [B] 영상 오더 뒤 「Envoyé」가 안 보임 — 고침**
    - 원인: `POST /:id/orders`가 **INSERT 때의 행**을 돌려줬습니다. 워크리스트를 만든 뒤 `worklist_status='sent'`·`worklist_sent_at`을 UPDATE로 넣었지만 응답에는 없었습니다.
    - 화면의 `orderStatus`는 `worklist_sent_at`이 있어야 「Envoyé」를 그립니다. 30초 새로고침도 「기다리는 줄」을 `worklist_sent_at`이 있는 영상 줄로 골라서, 이 줄을 영영 다시 읽지 않았습니다. 그래서 환자를 다시 열어야 보였습니다.
    - 이제 UPDATE가 `RETURNING *`로 그 행을 돌려줍니다. 추가 직후 「Envoyé」가 보이고, 새로고침도 이 줄을 기다려 「En cours」·「Réalisé」를 잡습니다. 약속처방 세트로 넣은 영상 오더도 같은 길입니다.
  - **2) [C] 영상 창 머리의 accession 줄**: `viewer.images.linked_by === 'accession'`이면 빨강·노랑 경고 밑에 `px_linkedByAccession`(목록과 같은 키, 같은 `--warn-text` 색) 한 줄.
  - **3) [C] Unité 칸의 «CHES»**: 촬영 부위는 이름 옆 작은 글자(`t3`, 12px, 줄바꿈 없음)로 옮겼습니다. Unité 칸은 `memo`만 보여 주고, 칸의 title은 memo 전체입니다. 취소된 줄의 글자 칸도 memo만 보입니다.
    - 전에는 `memo || body_part`여서, 빈 메모 칸에 부위가 들어 있다가 의사가 고치면 부위 글자가 메모로 저장될 수도 있었습니다.
  - **4) [C] 판독 저장 알림**: `alert` 대신 아래에 3초 뜨는 알림(`showToast`, 문장은 `cs_readingSaved` 그대로, 임상병리 화면과 같은 `--toast-*` 색). 영상 창(zIndex 1001) 위에 보이도록 1100입니다. 실패는 전처럼 알림 창입니다(눌러서 읽어야 할 것).
  - **5)** `manual-fr/pacs.md` §1-3의 «montre **Envoyé**» à revoir 주석: **1)을 고쳤습니다** — PACS 세션이 지우면 됩니다(설명서 본문은 그대로 맞음).
- **바꾼 파일**: `backend/src/routes/consult.routes.js`(오더 추가 응답) · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`(2.3·3.1·3.2·8) · `wiki/manual-fr/consultation.md`(§ examens 5) · `wiki/reference/changelog-1.5.0/consultation.md`
- **공용 파일 변경**: 없음 (`px_linkedByAccession` 키는 PACS 것을 읽기만)
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build`, `node --check` 통과. 격리 스택 1366×768 FR.
  - **1**: API `POST` 응답이 `worklist_status sent`, `worklist_sent_at` 있음. 화면에서 `X2` + Entrée → 줄이 생기자마자 «🖼 Envoyé»(다시 열지 않음).
  - **2**: 영상 도착 + 장비 UID ≠ 워크리스트 UID로 DB를 맞춘 오더 → `viewer-url`의 `linked_by: accession`, 영상 창 머리에 «L'appareil a donné son propre numéro d'étude …». 밝은 화면과 어두운 화면에서 모두 읽힘.
  - **3**: X1·X2 줄 이름 옆 «CHEST», Unité 칸 빔.
  - **4**: «Poumons clairs.» 저장 → 아래 «Compte-rendu enregistré ✓», 3초 뒤 사라짐, 알림 창 없음. 어두운 화면에서도 DOM에 뜸.
- **확인 못 한 것**: 진짜 장비와 브리지는 쓰지 않았습니다(격리 스택에 PACS 없음) — 「Envoyé → Réalisé」가 새로고침으로 넘어가는 것은 코드상(기다리는 줄 조건이 이제 참)으로만 봤습니다. PACS 세션의 다음 시험에서 봐 주세요.
- **다른 세션에 부탁**: PACS — `manual-fr/pacs.md` §1-3의 à revoir 주석 지우기(위 5).
- **남은 일 · 알려진 문제**: 없음.

## 2026-09-30 — ① 줄 저장의 남은 틈(정전·F5) ② 서류 발행·취소를 변경 기록에

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `33a81d2` 다음
- **한 일**:
  - **① 줄 저장** (`Consultation.jsx`)
    - **진료 중**: 줄을 벗어날 때 + **마지막 입력 2초 뒤**에 그 줄을 저장(`armRowSave`, 줄마다 타이머; 처방 칸·포장 수량·오더 칸 모두 `updateRxLocal`/`updateOrderLocal`을 지남). 기록은 끝난 진료만 쓰므로 여러 번 저장해도 기록 줄이 늘지 않습니다.
    - **끝난 진료**(Terminé 또는 다른 날 내원 — 서버 `consultOf`와 같은 규칙, `finishedRef`): 전처럼 줄을 벗어날 때만.
    - **둘 다**: `pagehide`에서 저장 안 된 줄(`dirtyRows` — 마지막 저장 스냅숏과 다른 줄, 조제된 약·취소된 오더 줄 제외)을 `fetch keepalive`로 보냄(토큰은 `api/client.js`와 같이 `localStorage 'medconnect_token'`). `visibilitychange`(hidden)에서는 보통 저장.
    - **순서**: 한 줄의 저장은 차례로 갑니다(`inTurn` — 앞 저장의 응답이 온 뒤 다음을 보냄). 응답마다 번호(`rowSeq`)가 있어 최신이 아니면 화면에 넣지 않고, 보낸 뒤 더 친 것이 있으면 응답에서 서버가 계산한 칸(total_qty·status·dosage_form·포장 칸)만 받습니다. 같은 값을 두 번 보내면 서버가 바뀐 것이 없어 기록을 쓰지 않습니다(unload 때 보통 저장과 keepalive가 같은 값으로 겹칠 수 있음 — 확인함).
    - 저장 실패 표시(`lockAlert`/`cs_errorPrefix`)는 그대로입니다.
    - `saveOrder`도 같은 규칙입니다. 오더 줄은 처음 보일 때 저장된 것으로 기억합니다(`savedOrd`) — 전에는 안 바뀐 오더 줄도 벗어날 때마다 PUT이 갔습니다.
  - **② 서류 기록** (`document.routes.js`)
    - 발급(`POST /`) 뒤 `documents.issue`, 취소(`POST /:id/void`) 뒤 `documents.void`. `entity 'document'`, `entity_id` = `document_log.id`, `summary` = `D26-00134 Certificat médical`(번호 + 서류 이름, 이름이 없으면 template_code), 환자·내원 채움.
    - 발급 `after {doc_no, template_code, lang}` · 취소 `before {voided:false}` → `after {voided:true, void_reason}`. **payload는 넣지 않습니다.**
    - 번호 뽑기·문서 행·기록 줄을 한 트랜잭션(`inTx`, consult.routes.js와 같은 모양)으로 묶었습니다.
    - **다시 취소**: 전에는 두 번째 취소가 처음 사유·시각·사람을 덮어썼습니다. 이제 `WHERE voided IS NOT TRUE`로 바꾸지 않고 문서를 그대로 돌려줍니다(200, 화면 동작 같음) — 기록 0줄.
    - 줄이 없는 경우: 원외 처방 없음 400, 권한 없음 403, 없는 문서 404, 다시 취소. 초안 인쇄는 서버에 오지 않습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `backend/src/routes/document.routes.js` · `wiki/modules/consultation.md`(2.3·2.11·3.1·3.4·7.3·8) · `wiki/manual-fr/consultation.md`(§ ordonnance 4, documents 8) · `wiki/reference/changelog-1.5.0/consultation.md`
- **공용 파일 변경**: 없음 (`document.routes.js`는 진료 파일, `utils/audit.js`는 읽기만)
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build`, `node --check` 통과. 격리 스택 1366×768 FR(밝은 화면), KO 한 번.
  - **①-1** 진료 중 26-00168: Fois 2 → 같은 줄 Unité «apres» → 3초 → F5 — PUT 한 번에 두 칸 `{frequency 2, days 6, memo apres}`, 다시 열어도 둘 다 남음.
  - **①-2** 처방 줄 Jours 9 → 오더 줄 수량 3 → **바로** 이동(F5와 같음) — 둘 다 DB에 남음(처방은 줄 벗어남 저장 + keepalive 같은 값 겹침, 오더는 keepalive).
  - **①-3** 끝난 진료 26-00169: 하루 총량 6 → 3초 → 횟수 2 → 3초 → 일수 4 → 3초(그동안 PUT 0번) → 바깥 클릭 — PUT 1번, 기록 **1줄** `{days 5, dose 3, frequency 3, total_qty 15} → {4, 6, 2, 24}`. 오더 줄 두 칸 고치고 바로 F5 → keepalive로 저장, 기록 1줄.
  - **①-4 늦은 응답**: 첫 PUT(일수 3)의 응답을 6초 늦추고 그 사이 일수 5로 고쳐 벗어남 — 두 번째 PUT은 첫 응답 뒤에 나가고(send0 → reply0 → send1), 화면·DB 모두 5. (차례 저장을 넣기 전 판에서도 화면은 새 값을 지켰음.)
  - **①-5** KO: Unité에 « matin » 덧붙이고 3초 — PUT 1번.
  - **②** `doc-audit-e2e` 17항목 모두 통과: 발급 1줄(모양 확인), 취소 1줄, 다시 취소 0줄·처음 사유 유지, 권한 없음(임상병리 계정) 발급·취소 403·0줄, 원외 처방 없음 400·0줄, 없는 문서 404, payload에 넣은 글자가 audit_log 어디에도 없음, 이력은 두 문서 그대로.
- **확인 못 한 것**: 실제 정전(전원 끊김)은 재현하지 않았습니다 — F5·이동으로 봤습니다. 기록 탭 화면에서 두 action이 어떻게 보이는지는 보지 않았습니다(아래 부탁).
- **다른 세션에 부탁**: 설정(급하지 않음) — `settingsAudit.js`의 `AUDIT_ACTIONS`에 `documents.issue`·`documents.void`, `FIELDS`에 `doc_no`·`template_code`·`lang`·`voided`·`void_reason` 이름을 넣어 주세요(지금은 저장된 글자 그대로 보임). 03-change-log.md 1절의 「기록 탭의 종류 거르기에 두 action」도 그쪽 몫입니다.
- **남은 일 · 알려진 문제**: 끝난 진료는 줄을 벗어나기 전 정전이면 그 줄의 고친 칸을 잃습니다(기록 한 줄 규칙 때문, 모듈 문서 7.3). keepalive 저장이 서버에서 막히면 알림이 없습니다(값은 틀리게 남지 않음).

## 2026-09-30 — 통합 시험 2차 진료 몫 (6·1·2·3·4·5) + 찾기로 연 환자의 알레르기

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `b8069d7` 다음
- **한 일**:
  - **6) 기록이 칸마다 따로 남던 것**
    - 원인은 서버가 아니라 화면이었습니다. 칸마다 `onBlur`로 저장해서 하루 총량 → 횟수 → 일수 → 용법을 치면 PUT이 4번 갔고, 끝난 진료라 기록도 4줄이었습니다.
    - 이제 **줄을 벗어날 때만** 저장합니다(`leftRow(e)`: `relatedTarget`이 같은 `<tr>` 안이면 건너뜀). 처방·오더 줄의 입력 칸 11곳과 포장 수량 칸이 해당합니다.
    - 서버의 `recordEdit`는 원래 PUT 한 번에 한 줄(바뀐 칸 모두)입니다. 기록 탭은 그대로 읽습니다.
  - **1) 닫힌 대기열 서랍**: 닫혀 있을 때 `inert` + `aria-hidden="true"`(Chrome 102+). 열면 둘 다 빠집니다.
  - **2) «flacons» 줄바꿈**: 단위 말은 한 줄에 넘치면 「…」, title은 전체입니다. 1366의 이름 칸(157px)에 «Quantité [2] flacons»가 다 들어가도록 수량 칸 54 → 40px, 간격 6 → 4로 줄였습니다.
  - **3) 머리줄 «M/»**: 성별·생년월일 가운데 빈 것은 빼고 「/」로 잇습니다.
    - **덧붙여 찾은 것(안전)**: 「Trouver patient」·「Sélection visite」로 연 내원은 방문 이력 목록(`GET /visits/patient/:id`, 접수 파일)에서 오는데, 거기에 성별·생년월일·**알레르기**가 없어 머리줄에 **알레르기 ⚠가 안 보였습니다**(대기열로 연 환자만 보였음).
    - `pickPatient`가 그런 내원이면 `GET /patients/:id`(진료 권한 있음)로 세 칸을 채웁니다.
  - **4) 검색 목록에 사전 문장**: EMR의 검색 목록(`buildOrderSuggestions`)은 약·오더 코드만 넣습니다 — **뜻한 것이 아닙니다.** 보인 문장은 브라우저(Chrome)가 입력 칸 밑에 띄우는 **자체 입력 기록 목록**으로 봅니다. 검색 칸에 `autocomplete`가 없었습니다. 진료 화면의 검색 칸 4개(오더 검색·사전 검색·대기열 검색·약 찾기)에 `autoComplete="off"`를 넣었습니다. 재현 순서를 모르므로 다시 통합 시험에서 봐 주세요.
  - **5) Hernie 양식**
    - **칸 종류**: 「Date opératoire」를 날짜 칸으로 바꿨습니다(`type: 'date'`; `DocumentModal`이 `type="date"` 입력을 그림). 모든 수술기록지가 같은 `makeOp`를 써서 12종 모두 바뀝니다.
    - 인쇄는 `2026-09-30` 그대로이고, 옛 문서의 글자 값도 그대로 인쇄됩니다. 수술일 말고 날짜 칸은 없습니다(훑음).
    - **언어는 두었습니다**: 「빈칸 글자」 `[anesthesia] [Mesh placed and fixed / primary repair]`는 소견 기본 문장(영어 의학 문장) 안의 괄호입니다. 바꾸려면 기본 문장을 프랑스어·한국어로 새로 써야 합니다 — 의학 문장이라 의사 질문지 ①·R3 몫으로 남깁니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `frontend/src/components/DocumentModal.jsx`(공용, 입력 종류 한 줄) · `frontend/src/documents/surgical-records.jsx`(수술일 칸 종류) · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md`(§4 저장 시점)
- **공용 파일 변경**: `DocumentModal.jsx` — `type: 'date'` 칸을 날짜 입력으로 그림(다른 양식에는 date 칸이 없어 영향 없음)
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 격리 스택, 1366×768 FR(밝은 화면)에서 확인했습니다. 끝난 진료 26-00167(생년월일 없음, Amoxicillin + PROFEIN 2병)입니다.
  - **6**: Amoxicillin 줄에서 Dose/j 4 → Tab → 2 → Tab → 6 → Tab → 바깥 클릭을 하니 기록이 **1줄** `{days 5, dose 3, frequency 3, total_qty 15} → {6, 4, 2, 24}`였습니다(전 0줄). 문장은 « 2 gél. × 2 fois/jour pendant 6 jours (total 24) »입니다.
  - **1**: 닫힌 서랍은 `inert`·`aria-hidden=true`입니다. 「Dossier」 단추에서 Tab을 누르면 서랍을 건너 «☰ File d'Attente»로 갑니다. 서랍을 열면 두 속성이 빠지고 탭이 초점을 받으며, 닫으면 다시 붙습니다.
  - **2**: «Quantité [2] flacons»가 한 줄에 다 보입니다.
  - **3**: 머리줄은 «26-00167 SANSDATE Journal F»입니다(«/» 없음, 성별은 찾기로 열었는데도 채워짐).
  - **4**: 검색 칸 3개가 `autocomplete="off"`입니다(약 찾기 창은 열 때 생김).
  - **5**: Compte-rendu opératoire와 Note op. - Hernie 모두 날짜 칸이고, 2026-09-30을 고르면 미리보기에 «Date opératoire 2026-09-30»가 나옵니다. 문서 렌더링 8쪽은 기준과 바이트가 같습니다.
- **확인 못 한 것**: 4의 원인을 재현으로 확인하지 못했습니다(추정). 알레르기가 있는 환자로 찾기 → 머리줄 ⚠는 코드상 같은 길이라 따로 보지 않았습니다.
- **다른 세션에 부탁**: 접수(급하지 않음) — `GET /visits/patient/:id`에 `p.gender, p.date_of_birth, p.allergies`를 더하면 진료의 추가 조회가 필요 없어집니다(진료 쪽은 칸이 이미 있으면 조회하지 않음).
- **남은 일 · 알려진 문제**: 수술기록지 기본 문장의 언어(질문지 ①·R3).

## 2026-09-30 — 글자로만 보이는 칸(넘침·「1.000」) · 취소된 줄의 흐림(대비)

- **상태**: 확인 요청 — 총괄 지시(두 가지 모두 진료 세션이 고침)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `5077d8e` 다음
- **한 일** (`Consultation.jsx`, 색은 이름표만):
  - **`roCell(value, color)`**: 조제된 약 줄과 취소된 오더 줄의 글자 칸(전 `cellRO`)입니다. `overflow:hidden`·`text-overflow:ellipsis`·`white-space:nowrap`, 값은 `showNum()`, 전체 값은 `title`에 둡니다.
  - **취소된 오더 줄**: 줄 전체의 `opacity:0.55`를 뺐습니다. 이제 흐린 글자색 `var(--text-3)`와 줄 긋기(코드·이름)로 보이고, 「⊘ Annulé」는 그대로입니다.
- **확인** (격리 스택, 1366×768, FR, 캐시를 비운 새 번들 `index-DZoyvPSX.js` — 처음엔 브라우저가 옛 index를 들고 있어 한 번 다시 불러옴):
  - **취소된 영상 줄**(26-00016):
    - 줄 opacity 1입니다. 「ABDOMEN」은 칸 안에서 「ABD…」로 잘리고 title은 「ABDOMEN」입니다. 부위 칸의 오른쪽 끝이 상태 칸 앞에서 끝나서 **「🖼 Annulé」가 다 보입니다**.
    - 수량 「1」(전에는 「1.000」)입니다.
    - 글자 대비는 **밝은 화면 5.9**(통과), **어두운 화면 3.9**입니다. 어두운 화면은 `--text-3` 이름표 값 자체이고 실장님 결정 대기(design 7.1 ①)입니다 — 전에는 opacity 때문에 2.0이었습니다.
  - **조제된 약 줄 🔒**(26-00136, 격리 DB에서 조제로 표시하고 하루 총량 「2.000」·긴 메모를 넣음):
    - 「2」가 보이고, 메모는 「Apre…」(title 전체)이며 「Délivré」가 다 보입니다.
    - 대비는 밝은 화면 6.3~7.1, 어두운 화면 7.2입니다.
    - (그 줄의 「ancien calcul」 표시는 시험용으로 하루 총량을 바꾸고 옛 총량을 둔 탓 — 코드 문제 아님)
  - `npm run build` 통과. 서버 코드 변경은 없습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`(3.1·8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **다른 세션에 부탁**: 없음(영상 창 px_noStudy 대비는 총괄이 디자인에 넘김)
- **남은 일 · 알려진 문제**: 없음 — 다시 통합 시험을 시작해도 됩니다.

## 2026-09-30 — 처방 줄의 제형(단위 말) · 밝은 화면 1366×768 점검

- **상태**: 확인 요청 — **Consultation.jsx 한 줄 고침 제안이 있습니다(아래, 총괄 판단 — 파일은 디자인 세션 몫이라 손대지 않음)**
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `15b1a61` 다음
- **한 일**:
  - **① 단위 말**: `consult.routes.js`의 `GET /visit/:visitId/prescriptions`·`GET /:id/prescriptions`에 `(SELECT d.dosage_form FROM drug d WHERE d.id = rx.drug_id) AS dosage_form`을 넣었습니다(총괄이 준 모양 그대로).
    - 처방 **POST·PUT 응답**에도 같은 칸을 붙였습니다(`withForm`). 그러지 않으면 방금 넣거나 고친 줄이 새로 불러올 때까지 단위 없이 보입니다.
    - 격리에서 확인한 것:
      - API 네 곳 모두 « Capsule »이 옵니다.
      - 진료 화면 Amoxicillin(MED-0068)은 « 1 gél. × 3 fois/jour pendant 7 jours (total 21) »입니다.
      - 약속처방 「Gelules test」로 넣은 줄은 바로 « 1 gél. × 3 fois/jour pendant 5 jours (total 15) »입니다.
      - 원외 처방전(수납 화면 « Ordonnance ext. », 그 줄을 격리 DB에서만 Externe로 표시)도 « 1 gél. × 3 fois/jour pendant 7 jours (total 21) »입니다.
  - **② 밝은 화면(☀ Clair) 1366×768**: 디자인 세션의 대비 도구(`wiki/reference/design/audit-in-browser.js`)로 쟀습니다.
    - **통과(목록 비어 있음)**: 진료 첫 화면(처방 표·바이탈·기록·사전), 오더 검색 목록, 「결과 없음」, 약 찾기 창, 약속처방(줄 그은 약 포함), Dossier(수술기록지) 창, Documents(의뢰서) 창, 빈 칸 경고가 있는 처방 줄(26-00120).
    - **디자인 세션에 넘길 목록**:
      1. **취소된 오더 줄**(⊘ · 줄 그음)은 줄 전체에 `opacity:0.55`를 걸어 글자 대비가 **밝은 화면 2.34 · 어두운 화면 2.02**, ⊘·「Annulé」는 3.56 / 5.21입니다. 도구는 부모의 opacity를 보지 않아 목록에 안 나와서 따로 쟀습니다. 결정 3-B 때 제가 넣은 것이고, 두 화면 모두 기준(4.5) 미달입니다. 제안: opacity를 빼고 흐린 글자 색(`--text-3`) + 줄 긋기로만 「기록」임을 보이기.
      2. **영상 창 「스터디 없음」 안내**(`px_noStudy`, 뷰어 자리의 검은 판 위 `#64748b`)가 4.41입니다. 영상 판은 두 화면 모두 검은 색이니 글자만 한 단계 밝게.
    - 환자 띠(진한 파랑)는 일부러 고정 — 보지 않았습니다.
  - **③ 금액 표기**: 진료 화면·의뢰서·수술기록지에는 금액이 나오는 곳이 없습니다(가격은 「Sans prix」 표시와 개수만). 바꿀 것 없음.
- **Consultation.jsx 한 줄 고침 제안 (총괄 판단 부탁 — 제 `20fdc88`의 부작용)**: 처방 표를 고정 폭으로 바꾼 뒤, **취소된 줄·조제된 줄(글자로만 보이는 칸, `cellRO`)**의 긴 글자가 옆 칸으로 넘칩니다 — 영상 줄의 부위 «ABDOMEN»이 상태 칸 «🖼 Annulé» 위에 겹쳐 «Annulé»가 잘림(1366, 두 화면 모두). 같은 칸들은 «1.000»을 그대로 보입니다(입력 칸만 `showNum`을 씀). 고침: `cellRO`에 `overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'`을 더하고 그 칸의 값에 `showNum(...)`. 디자인 세션이 하든 제가 하든 한 줄입니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `wiki/modules/consultation.md`(3.2·8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `node --check` 통과. 격리 스택(develop `15b1a61` 기준). 서버 시험 12개가 모두 통과했습니다(os, blank, lock, 포장, total, 로그, 취소, L9, ⑭, s2, t400, tlow — 예시 약이 필요한 것은 격리 DB에서 잠깐 다시 보이게 한 뒤). 화면은 위와 같습니다.
- **다른 세션에 부탁**: 디자인 — 위 1·2. (취소된 줄 넘침은 총괄 판단 뒤.)
- **남은 일 · 알려진 문제**: 위 한 줄 고침(허락 뒤).

## 2026-09-29 — 통합 시험 진료 몫: 처방 표 고정 폭 · 저장 알림 · 수량 표시 · 결과 없음 · 수납된 줄 안내 · 재고

- **상태**: 확인 요청 (B2는 재현 안 됨 — 아래)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `fd0cd02` 다음(디자인의 색 이름표 뒤, 새 색은 `var(--…)`로만 씀)
- **한 일**:
  - **B1 처방 표**: `tableLayout:'fixed'`, 열 너비 ✕ 22 · 코드 70 · 이름 나머지 · Dose/j 50 · Fois 40 · Jours 44 · Posologie 58 · Unité 54 · 상태 78.
    - 코드는 한 줄(넘치면 …, title에 전체)이고, 이름은 긴 낱말도 줄바꿈합니다. 입력 칸 안쪽 여백은 4 → 2px입니다.
    - 상태 칸(«Résultat reçu»)은 줄바꿈을 허용합니다.
  - **B2 대기열 서랍**: `pickPatient`는 이미 첫 줄에서 서랍을 닫습니다. 격리에서 1366×768 FR로 실제 클릭(☰ → 환자)을 하니 닫혔습니다(`translateX(-290px)`, 위치 −290). **재현 안 됨** — 재현 순서(어느 계정, 어느 화면에서 여는지, 진료 중 다른 환자인지)를 알려 주시면 다시 보겠습니다. 첫 측정 때 250ms 애니메이션 중간이라 열린 것처럼 읽힌 적이 있어, 시험 도구가 같은 착시를 겪었을 수도 있습니다.
  - **C 저장 알림**: «Sauver ✓» → «Enregistré ✓»(`cs_noteSaved`), «Terminé ✓» → «Consultation terminée ✓»(`cs_consultDone`), 판독 «Sauver ✓» → «Compte-rendu enregistré ✓»(`cs_readingSaved`). 공용 `save`는 그대로입니다.
  - **C 수량 «1.000»**: DB 값(소수 셋째 자리까지 정확히 있는 값)만 뒤 0을 빼서 보입니다(`showNum`: 1.000 → 1, 1.500 → 1.5). 검사·처치 수량과 약 하루 총량 칸에 씁니다. 치는 중인 값은 건드리지 않습니다.
  - **C 결과 없음**: 두 글자 이상 쳤는데 맞는 것이 없으면 « Aucun résultat. Les noms des médicaments sont en anglais (par ex. syrup). »(`cs_noResults`)를 보입니다. 약 찾기 창도 같습니다.
  - **C 수납된 줄**: 새 `GET /api/consultations/:id/billed-codes`(권한 consultation)는 이 내원의 취소 안 된 청구에 든 약·오더 코드를 돌려줍니다. ✕를 누르면 물어보고, 들어 있으면 확인 창에 « Cette ligne est déjà encaissée : si vous la retirez, la caisse devra rembourser le patient. »(`cs_removePaidNote`)를 더합니다.
  - **약국 부탁 — 재고**: 약 검색 목록과 약 찾기 창 오른쪽에 « Stock n »(`cs_stock`, 0이면 빨강)을 보입니다. 이전에는 목록에 없었습니다(자료 `drug.stock_qty`는 이미 옴).
  - **진료 사전 영어 문장**: 지시대로 두었습니다(의사 질문지 ④ 뒤).
  - **PACS 설명서 대조**: `manual-fr/pacs.md` 1·4·7절과 `consultation.md` 7~9절 사이에 어긋나는 말은 없습니다(PACS 쪽이 더 자세함 — 시리즈·새 탭·세션 만료). 내 9절에 「guide PACS, section 4」 한 줄로 가리켰습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `backend/src/routes/consult.routes.js`(읽기 라우트 하나) · `wiki/modules/consultation.md` · `wiki/manual-fr/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 6개(`cs_noteSaved`, `cs_consultDone`, `cs_readingSaved`, `cs_noResults`, `cs_removePaidNote`, `cs_stock`)
- **DB 마이그레이션**: 없음
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택(034~036 적용), 1366×768, FR에서 확인했습니다.
  - **B1**: 처방 표 573px = 상자 573px(가로 스크롤 없음)입니다. Posologie에 실제로 «QD»를 치고 Tab → «cp»를 치는 동안 열 너비 `22,70,157,50,40,44,58,54,78`이 그대로였고, «QD»는 Posologie, «cp»는 Unité에 들어갔습니다.
  - **수량**: P01 «1»(전에는 «1.000»)입니다.
  - **수납된 줄**: 내원 26-00136(진료비 + MED-0001 + P01 수납)에서 P01 ✕를 누르니 « Retirer « Wound Dressing » ? ⏎ Cette ligne est déjà encaissée … »가 나왔습니다. `billed-codes`는 `["MED-0001","P01"]`이고, 약국 계정은 403, 수납 안 된 내원은 `[]`입니다.
  - **알림**: Sauver → « Enregistré ✓ »
  - **검색**: «cetirizine» → « Aucun résultat … », «amox» → « Amoxicillin 500mg · Gélule · Stock 2000 / Stock 2500 »
  - 서버 시험: l9, ⑭, 취소, 로그, s2, t400, tlow 통과. os·blank·lock은 격리 DB에서 예시 약(PCM500)을 잠깐 다시 보이게 한 뒤 통과(가져오기가 예시 약을 감춰서 시험 자료가 없었음 — 코드 문제 아님). pack-e2e는 흡입기 SALB까지 필요해 이번에는 돌리지 않았습니다(포장 코드는 바뀌지 않음).
- **확인 못 한 것**: B2 재현. KO·1280에서 표는 다시 재지 않았습니다(열 너비가 고정이라 언어와 무관, 1280은 왼쪽 칸 538px로 이름 칸이 약 120px).
- **다른 세션에 부탁**: 없음(약국 부탁은 여기서 끝냄)
- **남은 일 · 알려진 문제**: 「환자가 약을 돌려줄 때」는 결정 뒤 설명서 §8에 넣겠습니다.

## 2026-09-29 — 문서: 현지 직원용 프랑스어 설명서 · v1.5.0 변경 내역 초안

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `e853799` 다음. 문서만이고, Consultation.jsx는 건드리지 않았습니다(디자인 세션에 넘어감).
- **한 일**:
  - **`wiki/manual-fr/consultation.md`** (의사용, README 규칙대로 En bref · Pas à pas 12절 · Si ce message apparaît · À ne pas faire · Qui appeler, 168줄 ≈ A4 3~4쪽)
    - 다룬 것: 환자 부르기, 바이탈·기록·문장사전, 약 넣기(빈 칸에서 Dose/j · Fois · Jours, **총량 = Dose/j × Jours**), 포장 약(Quantité), 약속처방, 검사·영상·처치(1·1·1, 수량 × 일수, 「facturé n fois」), 지우기·취소(⊘ Annulé), 영상 보기·판독(⚠ 환자 확인), 수술기록지·의뢰서(Émettre → Réimprimer, [ ] 괄호, 발급 취소), 과거 기록, 끝내기.
    - 화면 글자는 `fr.js`와 문서 창의 `UI` 사전에서 그대로 옮겼습니다(목록을 뽑아 대조). 인용한 메시지 15개도 코드와 맞췄습니다.
    - 수술기록지 용어는 `<!-- terme à vérifier sur place -->`로 표시했습니다. 그림은 넣지 않았습니다(글만으로 읽히게 — 필요하면 1366×768로 뜨겠습니다).
  - **`wiki/reference/changelog-1.5.0/consultation.md`** (영어, v1.4.0 목소리, 130줄)
    - 앞부분: 처방 총량(하루 총량 × 일수), 빈 칸이 조용히 1이 되던 것과 결정 B·약속처방 값, **바이탈이 지워지던 것**, 수술기록지 11종 + 동의서, 결과 있는 오더는 지우지 않고 취소, 조제된 처방 잠금, 오더 수량 × 일수, 포장 단위 약, 프랑스어 화면·1366 배치.
    - 이어서 작은 것들, 화면에 안 보이는 것(권한·취소된 내원·보낸 칸만 저장·400·변경 기록·완료 시각)을 적었습니다.
    - 마이그레이션 023·030·032를 적었습니다.
    - `### After updating`: 첫 환자 전에 약 가격, 약속처방 약 줄 다시 만들기.
    - v1.4.0에 없는 `be642c9`(수술기록지)도 새 기능으로 넣었습니다(main에 없음을 확인).
  - 위키 2.8의 집도의 자동 채움 글을 서명 규칙에 맞게 고쳤습니다.
- **바꾼 파일**: `wiki/manual-fr/consultation.md`(새 파일) · `wiki/reference/changelog-1.5.0/consultation.md`(새 파일) · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 설명서의 굵은 글자와 인용 메시지를 `fr.js`·`DocumentModal.jsx`에서 뽑은 목록과 하나씩 대조했습니다. 화면 흐름은 오늘 격리 스택에서 프랑스어로 직접 따라 한 것(가져온 약 처음부터 끝까지, 취소, 영상 창, 약속처방, 1366 배치)을 바탕으로 썼습니다. 변경 내역의 사실은 위키 8절과 커밋으로 확인했습니다.
- **확인 못 한 것**: 설명서를 인쇄해 쪽수를 본 것은 아닙니다(총괄이 묶을 때).
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 디자인 세션이 Consultation.jsx 색을 바꾸면 설명서의 색 이름(빨간 ✕, 초록 Terminé, 노란 Sans prix)을 다시 봐야 합니다(`à revoir`로 남길지 총괄 판단). noViewerUrl 정리는 디자인 뒤.

## 2026-09-29 — 진료 화면 가운데 칸이 옆으로 밀리던 것 (1366) · 약속처방 처치 줄 수량

- **상태**: 확인 요청 — **Consultation.jsx는 이 커밋 뒤로 디자인 세션이 시작해도 됩니다**
- **커밋**: session/consultation (이 항목과 같은 커밋) — `aa2cb40` 다음(그 커밋이 아직 develop에 없어 rebase하지 않음)
- **한 일**:
  - **원인**: 문장사전 머리(제목 + 분류 단추 6개 + `marginLeft:auto` 검색 칸 120px)가 줄바꿈 없는 한 줄이라 프랑스어에서 약 546px였습니다. 가운데 칸(`overflow:hidden`, 1366 폭에서 409px)보다 넓어서, 그 검색 칸에 초점이 가면 브라우저가 칸 전체를 옆으로 135px 굴려 바이탈·진료 기록 왼쪽이 잘렸습니다(디자인 세션이 찾은 그대로).
  - **고침**:
    - 문장사전 머리를 `flexWrap:'wrap'`으로 바꿨습니다. 글자와 단추는 `nowrap`, 검색 칸은 `flex:1 1 100px`(90~160px)입니다.
    - 가운데 칸 자체에 `minWidth:0`을 줬습니다(flex 항목이 내용만큼 커지지 않게).
    - 바이탈 격자의 최소 칸을 118 → 110px, 안쪽 여백을 7 → 4px로 줄였습니다. 1280 폭(가운데 383px)에서도 두 줄이고 「120/80」이 들어갑니다(칸 69px).
  - **약속처방 처치 줄**(설정 세션 발견): `applySet`이 처치 줄의 수량을 늘 1로 보냈습니다 → 세트 수량(`default_qty`)을 그대로 보냅니다. 검사·영상은 세트 값과 상관없이 1·1·1 그대로입니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`(2.3·3.1·8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 격리 스택에서 환자 26-00134(처방 두 줄)를 열어 확인했습니다. 진료 기록 → 문장사전 검색 칸 순서로 초점을 옮기고, 검색 칸에 실제로 「rest」를 친 뒤 잰 값입니다:

    | 화면 | 언어 | 가운데 칸 폭 / 내용 폭 / scrollLeft | 바이탈 | 문장사전 머리 |
    |---|---|---|---|---|
    | 1366×768 | FR | 409 / 409 / **0** | 2줄, 칸 81px | 두 줄(49px) |
    | 1366×768 | KO | 409 / 409 / **0** | 2줄 | 한 줄(29px) |
    | 1280×720 | FR | 383 / 383 / **0** | 2줄, 칸 69px, 「120/80」 들어감 | 두 줄 |
    | 1280×720 | KO | 383 / 383 / **0** | 2줄 | 두 줄 |
    | 1920×1080 | FR | 575 / 575 / **0** | 3줄 | 한 줄 |
    | 1920×1080 | KO | 575 / 575 / **0** | 3줄 | 한 줄 |

  - 화면 사진으로 1366 FR·1280 KO에서 바이탈 왼쪽과 진료 기록이 잘리지 않는 것을 봤습니다.
  - 약속처방: 세트 「Soins x2」(P01 2·1·3, L01 3·2·2)를 적용하니 P01은 2·1·3 「6회 청구」, L01은 1·1·1(용량 빈 칸)이었습니다.
- **확인 못 한 것**: 실제 현장 모니터(배율 125% 등)에서는 보지 못했습니다. 에뮬레이터 폭 기준입니다.
- **다른 세션에 부탁**: 디자인 — Consultation.jsx 시작해도 됩니다. 이 커밋의 줄(문장사전 머리·가운데 칸·바이탈 격자)은 배치만 바꿨고 색은 건드리지 않았습니다.
- **남은 일 · 알려진 문제**: F3, R1~R5

## 2026-09-29 — 가져온 약 기준: 검색의 제형 · 설정용 400 문구 목록 · 처음부터 끝까지 확인

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `b148c65` 다음
- **한 일**:
  - **① 약 검색에 제형**: 검색 목록과 「+ Recherche médicament」 창의 약 줄 오른쪽에 `formLabel(t, d.dosage_form)`(약국의 `drug-info.js`, 번역 `ph_form_*`)을 보입니다 — 「Comprimé」 「Sirop」 등. 그 자리에 있던 기본 용법(`default_route`)은 결정 B로 쓰지 않으므로 뺐습니다. 새 약 코드(`MED-0001`, 8자)가 두 줄로 꺾이던 것도 고쳤습니다(nowrap, 칸 76px).
  - **② 설정 세션용 — 약속처방 서버 400 문구** (`orderset.routes.js` `badItems`; 모양은 `items[<번호>].<칸> <뜻>`, 번호는 0부터):

    | 서버 문구 (`error`) | ko | fr | en |
    |---|---|---|---|
    | `name required` | 세트 이름을 적으세요 | Indiquez le nom de l'ordonnance type | Enter the set name |
    | `items[i].dose must be a number greater than 0` | {n}번째 줄: 하루 총량은 0보다 큰 수 | Ligne {n} : la dose par jour doit être supérieure à 0 | Line {n}: the daily dose must be greater than 0 |
    | `items[i].frequency must be a whole number from 1 to 24` | {n}번째 줄: 횟수는 1~24의 정수 | Ligne {n} : les fois par jour sont un nombre entier de 1 à 24 | Line {n}: times a day must be a whole number from 1 to 24 |
    | `items[i].days must be a whole number from 1 to 365` | {n}번째 줄: 일수는 1~365의 정수 | Ligne {n} : les jours sont un nombre entier de 1 à 365 | Line {n}: days must be a whole number from 1 to 365 |
    | `items[i].route (sig) must be at most 10 characters` | {n}번째 줄: 용법은 10자까지 | Ligne {n} : la posologie fait au plus 10 caractères | Line {n}: the sig is at most 10 characters |
    | `items[i].quantity must be a whole number of at least 1` | {n}번째 줄: 병·튜브 수는 1 이상의 정수 | Ligne {n} : le nombre de flacons/tubes est un entier d'au moins 1 | Line {n}: the bottle/tube count is a whole number of at least 1 |
    | `items[i].quantity must be a positive number` | {n}번째 줄: 수량은 0보다 큰 수 | Ligne {n} : la quantité doit être supérieure à 0 | Line {n}: the quantity must be greater than 0 |

    읽는 법: `/^items\[(\d+)\]\.(\w+) /`로 번호와 칸을 떼어 내고, {n} = 번호 + 1(화면의 줄 순서)로 둡니다. 나머지 글은 위 표의 뜻으로 옮기면 됩니다.
  - **③ 가져온 약으로 처음부터 끝까지** (격리 스택, 034 적용: 활성 101 · 감춤 25 · 가격 모두 0 · 포장 12):
    - **진료**:
      - `amlo`를 치니 « MÉD MED-0001 Amlodipine 5mg · Sans prix · Comprimé »가 나왔습니다.
      - 넣으니 빈 칸이고 « Indiquez dose/jour, fois et jours »가 붙었습니다. IBUPROFENE SYRUP(포장)은 « Indiquez la quantité »와 « nombre de flacons à vérifier »였습니다.
      - 1·1·30을 적으니 « 1 × 1 fois/jour pendant 30 jours (total 30) »가 됐습니다. 시럽 1병은 « 1 flacon »입니다.
      - 제목에는 « ⚠ 2 sans prix »만 남았고, Terminé는 확인 창 없이 끝났습니다.
    - **약국**(관리자 계정):
      - 목록 맨 아래(끝난 순서)에 « IMPORT Parcours — Amlodipine 5mg, IBUPROFENE SYRUP »가 있습니다.
      - 상세는 Amlodipine 1 · 1 · 1 · 30 · 수량 30, 시럽 « 1 flacon »이고, « Médicaments (interne) 0 »입니다. 가격 경고는 약국 화면에 없습니다.
    - **수납**:
      - 위에 « ⚠ 2 article(s) sans prix — vérifiez les prix : IBUPROFENE SYRUP, Amlodipine 5mg »가 뜹니다.
      - 약 줄은 « Sans prix · 0 »이고, 진료비 15,000 Ar만 합계입니다.
      - **가격 0인 약만 있는 내원**: 진료비를 « Sans frais »로 하면 합계 0 Ar입니다. Confirmer를 누르면 « 2 article(s) sans prix … Fixer le prix plus tard ne modifie pas les lignes déjà prescrites (le médecin doit les supprimer et les ajouter à nouveau). Encaisser quand même ? »라고 묻습니다(시험에서는 아니오 — 수납하지 않음).
  - **④ 위키 2절**: 약 목록 오른쪽 제형, 영어 이름으로 찾기, 단위 없는 문장, 가져온 약의 가격 0을 적었습니다(결정 B 몫은 `6e11f56`·`7e17a6d` 때 이미 고침).
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음(약국의 `drug-info.js`·`ph_form_*`를 읽기만 함) · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182, 화면은 FR 1366px와 800px로 확인했습니다. 기존 시험은 결정 B·약속처방 때와 같은 서버 코드라 다시 돌리지 않았습니다(화면만 바뀜).
- **총괄 판단이 필요한 것**:
  - **가격 0으로 처방된 줄은 나중에 가격을 넣어도 0 그대로**입니다(줄에 가격을 복사하는 규칙, 7.3). 가져온 약은 모두 0이라 **가격을 넣기 전의 모든 처방이 0원으로 남습니다.** 수납에서 묻기는 하지만, 고치려면 의사가 줄을 지우고 다시 넣어야 합니다.
    - 선택지: (가) 지금처럼(현지에서 가격을 먼저 넣고 쓰기 시작 — 운영 순서로 막음), (나) 「줄 가격이 0이고, 아직 청구 안 됐고, 약에 가격이 생겼으면」 진료 서버가 저장할 때 새 가격을 가져오기.
    - 추천은 (가)입니다. 쓰기 시작 전에 가격을 넣는 것이 가장 단순하고, (나)는 가격 복사 규칙에 예외를 만듭니다. 결정 세션에 넘길지 판단 부탁드립니다.
- **다른 세션에 부탁**:
  - 약국: `rx-dosing.js`의 단위(cp·gél.·sachet)를 이름 대신 `drug.dosage_form`으로도 정해 주세요. 가져온 약은 이름에 Tab·Cap이 없어 « 1 × 1 fois/jour »로 단위 없이 나옵니다. 처방 줄에는 `dosage_form`이 없으니 약 표에서 읽거나 처방할 때 복사하는 방법은 세션 판단입니다.
  - 설정: 위 ② 표.
- **남은 일 · 알려진 문제**: F3, R1~R5

## 2026-09-29 — 약속처방 줄의 용량·횟수·일수 (서버 몫, 설정 화면과 같이 합침)

- **상태**: 확인 요청 — 설정 세션의 편집 창 커밋과 같이 합칩니다
- **커밋**: session/consultation (이 항목과 같은 커밋) — `6e11f56`(결정 B) 다음. 그 커밋을 검토 중일 수 있어 develop으로 rebase하지 않았습니다.
- **한 일** (`backend/src/routes/orderset.routes.js`):
  - `badItems`: POST·PUT이 쓰기 전에 항목마다 검사합니다. 어기면 400 `items[i].… must be …`이고 아무것도 바뀌지 않습니다.
    - 약 줄: `dose` 0보다 큰 수(≤ 1000), `frequency` 1~24 정수, `days` 1~365 정수, `route` 10자 이하(처방 `route VARCHAR(10)`), `quantity`(포장 병·튜브 수) 1 이상 정수.
    - 오더 줄: `quantity` 0보다 큰 수, `frequency`·`days` 정수.
    - 전의 `badItemQty`는 이것으로 바뀌었습니다.
  - `insertItems`: 약 줄의 빈 `dose`·`frequency`·`days`·`route`는 **NULL**로 저장합니다.
    - 전에는 횟수·일수를 1로 채워서, 세트를 적용하면 아무도 적지 않은 「1일」이 처방됐습니다.
    - 오더 줄의 빈 횟수·일수는 1(검사·영상 1·1·1), 빈 수량은 1입니다.
  - 옛 세트는 그대로 읽힙니다(읽는 쪽은 바꾸지 않음).
- **적용 확인**: 진료 화면 `applySet`은 이미 세트 값을 `fromSet`으로 그대로 넣고(결정 B 커밋), 총량은 서버 `rxTotal`이 계산합니다. 화면 코드 변경은 없습니다.
- **바꾼 파일**: `backend/src/routes/orderset.routes.js` · `wiki/modules/consultation.md`(2.4·3.3·8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음(설정 화면이 400 문구를 보여 줄 때는 설정 세션 몫)
- **확인한 방법**: `node --check` 통과. 격리 스택 9182에서 확인했습니다.
  - **약속처방 시험 19개 전부 통과**:
    - 채운 세트는 약 3|3|7|PO|1, 오더 1·1·5로 저장됩니다.
    - 빈 세트는 약 NULL|NULL|NULL|NULL|1(1로 채우지 않음), 오더 1·1·1입니다.
    - 거절 9가지(하루 총량 0·「abc」, 횟수 0·1.5, 일수 400, 용법 11자, 병 수 1.5, 오더 수량 0, 두 번째 줄 일수 0)가 모두 400이고, 거절된 세트는 아무것도 쓰지 않습니다.
    - PUT 일수 0은 400이고 항목이 그대로입니다. 바른 값은 저장됩니다.
    - 옛 시드 세트(Malaria Workup ACT01 4·2·3)는 그대로 읽힙니다.
  - **화면 FR — 적용**:
    - 「Set rempli」(PCM500 2·2·5 BID)를 누르니 « 1 cp × 2 fois/jour pendant 5 jours (total 10) »가 나오고, DB `total_qty` 10.000입니다.
    - 「Set vide」(빈 PCM500 + P01)를 누르니 PCM500이 빈 칸이고 « Indiquez dose/jour, fois et jours »가 붙었습니다. 제목은 « 1 sans dose/jour, fois ou jours », DB는 dose·횟수·일수·총량이 NULL입니다. P01은 1·1·1입니다.
  - 기존 시험도 모두 통과했습니다(결정 B 10, L9, 포장, 취소, 로그, lock, total, s2, t400, tlow).
- **확인 못 한 것**: 설정 세션의 편집 창(아직 develop에 없음)에서 저장해 보는 것 — 그 커밋과 같이 합칠 때 총괄이 봐 주세요.
- **다른 세션에 부탁**: 설정 — 편집 창의 칸 제한을 위와 같게 해 주세요(하루 총량 > 0, 횟수 1~24, 일수 1~365, 용법 10자, 포장 병 수 정수). 서버 400 문구는 영어이니 화면에서 번역해 주세요. 빈 칸은 허용합니다(처방에서 의사가 채움).
- **남은 일 · 알려진 문제**: 제형 표시(가져오기 뒤), F3, R1~R5

## 2026-09-29 — 약 기본 용량 안 씀 (결정 B) 진료 몫: 빈 칸으로 시작, 빈 칸은 조용히 1이 되지 않음

- **상태**: 확인 요청 (제형 표시는 약국 가져오기가 develop에 들어온 뒤 — 아직 `drug-info.js` 없음)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop 최신 다음
- **한 일** (총괄에 보낸 제안 그대로):
  - **검색으로 넣는 약은 하루 총량·횟수·일수·용법이 빈 칸**입니다.
    - `addDrugRx`가 `drug.default_*`를 읽지 않습니다. 약속처방 줄(`fromSet`)만 세트 값을 씁니다.
    - 메모 칸의 단위(`drug.unit`)는 그대로입니다.
  - **빈 칸은 끝까지 NULL**입니다. 전에는 칸 하나만 건드려도 빈 일수가 조용히 1일, 빈 하루 총량이 1이 됐습니다.
    - 화면 `saveRx`의 `dose||'1'`·`||1`을 없앴고, 입력 칸도 NULL을 「1」이 아니라 빈 칸으로 보입니다.
    - 서버 POST·PUT은 빈 `dose`·`frequency`·`days`를 NULL로 저장합니다(`blankNull`·`intOrNull`).
  - **`rxTotal`: 하루 총량이나 일수가 비면 총량 NULL**입니다(0도, 「1일」도 아님).
    - 약국은 이미 「총량 없음」으로 멈추고, 수납 대기 목록은 `missing_qty`로 표시합니다.
    - 옛 줄은 값을 바꾸지 않는 한 총량이 그대로입니다.
  - **경고**: `noDose`를 「하루 총량·횟수·일수 가운데 하나라도 빔」으로 넓혔습니다(포장 약 제외). 문구 `cs_noDose`·`cs_noDoseCount`·`cs_noDoseHint`·`cs_noDoseConfirm`을 ko·en·fr로 바꿨습니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_noDose*` 4개의 문구만
- **DB 마이그레이션**: 없음 · **번역 키**: 새 키 없음
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182에서 확인했습니다.
  - **시험 10개 전부 통과**:
    - 검색처럼 빈 값으로 넣으면 넷 다 NULL입니다.
    - 하루 총량 3만 적으면 일수 NULL, 총량 NULL입니다(1일치가 아님).
    - 일수 5를 적으면 15이고 횟수는 여전히 NULL입니다. 횟수 3을 적어도 15 그대로입니다.
    - 일수를 지우면 NULL/NULL, 하루 총량을 지우면 NULL입니다.
    - 약속처방 3·3·5는 15입니다. 옛 총량 45는 아무것도 안 바꾸면 그대로입니다.
    - 완료하면 수납 대기 목록 `missing_qty`가 true이고, 약국 대기 목록에 총량 없는 줄로 옵니다.
  - 기존 시험도 모두 통과했습니다(L9, ⑭, 포장, 영상 취소, 취소, 로그, lock, total, s2, t400, tlow).
  - **화면 FR**:
    - PCM500을 검색해 넣으니 칸 넷이 비어 있고, « Indiquez dose/jour, fois et jours »와 제목 « 1 sans dose/jour, fois ou jours »가 나왔습니다.
    - Dose/j에 3만 넣고 칸을 벗어나니 Fois·Jours가 빈 칸 그대로였습니다(전에는 1).
    - Terminé를 누르니 « 1 médicament(s) avec dose/jour, fois ou jours vides … »라고 묻고, 아니오면 진료가 열린 채로 남았습니다.
    - Fois 3, Jours 5를 넣으니 « 1 cp × 3 fois/jour pendant 5 jours (total 15) »가 나오고 표시가 사라졌습니다.
- **확인 못 한 것**: 제형(`dosage_form`) 표시 — 약국 가져오기 커밋이 develop에 들어온 뒤 하겠습니다. 실행 중 EMR은 건드리지 않았습니다.
- **위키**: `modules/consultation.md` 머리 · 2.3(넣기 5번·표시 줄·제목 개수) · 2.12 · 3.2(rxTotal) · 4(마이그레이션 이름 032) · 8절
- **총괄 확인 요청**: 이 동작(빈 칸 → 총량 NULL → 약국·수납에서 멈춤)
- **다른 세션에 부탁**: 약국 — 설정 약품 탭에서 기본 용량 칸을 없앨 때, 진료는 이제 그 칸을 읽지 않습니다(값이 남아 있어도 영향 없음).
- **남은 일 · 알려진 문제**: 제형 표시(가져오기 뒤), F3, R1~R5

## 2026-09-29 — 진료 완료 시각(L9) · 약속처방 수량 서버 검사 · 감춘 예시 약과 약속처방 · F2

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `a51c62e` 다음
- **한 일** (총괄 목록 ①~④):
  - **① L9 — 칸 이름 `consultation.completed_at`** (TIMESTAMPTZ, 색인 `idx_consult_completed_at`)
    - 마이그레이션 `201_consultation_completed_at.sql`: 칸을 더하고, 이미 완료된 진료는 `COALESCE(updated_at, created_at)`로 채웁니다. 기록에 남은 가장 가까운 값이고, 대부분은 Terminé가 기록을 저장한 때입니다. 열린 진료는 비워 둡니다. 다시 돌려도 바뀌지 않습니다.
    - `PUT /:id/complete`: `completed_at = COALESCE(completed_at, NOW())` — **처음 끝낸 때**만 저장하고, 다시 열어 고친 뒤 또 끝내도 그대로입니다.
    - **약국 세션이 이 칸으로 목록을 정렬**하면 됩니다(진료가 끝난 순서).
  - **② 감춘 예시 약 + 약속처방** — 격리에서 예시 약 25개를 모두 감추고(가져오기 뒤와 같은 상태) 확인했습니다:
    - 세트 카드의 약 코드에 줄이 그어집니다(Malaria Workup 「L04, L01, ~~ACT01, PCM500~~」, Diarrhea / GE 「~~ORS, METRO~~, L06」).
    - 세트를 누르면 **검사 줄만 들어갑니다**(L04·L01 / L06). 알림 « Non ajouté(s) - retiré(s) de la liste des médicaments : Artemether-Lumefantrine Tab, Paracetamol 500mg Tab … Cherchez un autre médicament si nécessaire. »가 한 번 나옵니다.
    - 약 검색에서 「pa」를 치면 감춘 Paracetamol은 나오지 않고 L03·X1만 나옵니다.
    - → 가져오기 뒤에는 지금 있는 세트의 **약 줄이 모두 빠지므로**, 세트를 현지 약으로 다시 만들어야 합니다(결정: 약속처방은 현지에서). 위키 2.4에 적었습니다.
  - **③ 약속처방 항목 수량 서버 검사** (`orderset.routes.js` `badItemQty`, POST·PUT, 쓰기 전)
    - 약 줄은 1 이상의 정수, 오더 줄은 0보다 큰 수, 비면 1입니다.
    - 어기면 400 `items[i].quantity must be …`이고 아무것도 바뀌지 않습니다(PUT도 항목 그대로).
    - 설정 화면(`c891715`)은 포장 약 줄만 보지만, 서버는 모든 약 줄을 봅니다. 설정은 보통 약에 1을 보내므로 영향이 없습니다.
  - **④ F2**: 문서 렌더링 도구로 수술기록지 12종·의뢰서를 인쇄 폭(688px)으로 다시 그려 옛 기준과 바이트 비교했습니다.
    - 8쪽 중 7쪽이 같습니다. 다른 1쪽(주소 없는 환자)은 `4e9a2d5`에서 빈 주소·전화 줄을 뺀 차이뿐입니다.
    - 오늘 작업(서명 규칙 등)으로 문서 모양이 바뀐 곳은 없습니다. 서명 이름은 문서 창이 넣는 값이라 모양과 무관합니다.
    - 기준 파일을 새로 저장했습니다.
- **바꾼 파일**: `backend/sql/201_consultation_completed_at.sql`(새 파일) · `backend/src/routes/consult.routes.js` · `backend/src/routes/orderset.routes.js` · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음 · **번역 키**: 없음
- **DB 마이그레이션**: `201_consultation_completed_at.sql` — **총괄이 번호를 다시 매겨 주세요.** 칸 추가와, 완료된 진료만 빈 칸 채움입니다(새 칸이라 기존 값은 바뀌지 않음).
- **확인한 방법**: `node --check` 통과, 격리 스택 9182(시작 때 201 적용).
  - **시험 15개 전부 통과**:
    - 칸이 있고, 완료 진료는 모두 값이 있으며, 열린 진료는 비어 있습니다.
    - 끝낸 순서대로 첫 번째가 두 번째보다 앞입니다.
    - 다시 열어 고치고 또 끝내도 처음 시각이 그대로이고, 여전히 앞입니다.
    - 세트 수량: 약 2는 201, 빈 값은 201, 1.5·0은 400, 오더 0.5는 201, -1은 400, PUT 2.5는 400이고 항목이 그대로입니다.
  - 마이그레이션을 다시 돌려도 값이 같습니다(md5).
  - 기존 시험도 모두 통과했습니다: ⑭ 16, 포장 16, 영상 취소 19, 취소 25, 로그 34, lock, total, s2, t400, tlow.
  - ②는 위와 같이 화면(FR)에서 확인했고, 확인 뒤 격리 DB의 약을 다시 켰습니다.
- **위키**: `modules/consultation.md` 머리 · 2.4(가져오기 뒤 세트) · 3.2(complete) · 3.3(수량 검사) · 4(마이그레이션·`consultation` 표) · 5(약국) · 7.4 F2 ✅ · 8절
- **총괄 확인 요청**: 마이그레이션 201 번호. 약국 세션에 칸 이름 `consultation.completed_at` 전달을 부탁드립니다.
- **다른 세션에 부탁**:
  - 약국: 목록 정렬을 `c.completed_at`으로 해 주세요. NULL(옛 줄이 남으면)은 끝으로 보내면 됩니다.
  - 설정·결정: 가져오기 뒤 약속처방의 약 줄을 현지 약으로 다시 만들어야 한다는 것을 현지 할 일 목록에 넣어 주세요.
- **남은 일 · 알려진 문제**: 7.4 F3(충수 인쇄 여유 지켜보기)와 R1~R5(결정 세션)가 남았습니다.

## 2026-09-29 — 7.4 F1: 과거 기록 화면 확인 + 머리의 빈 「· ·」

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — `2f8a57d` 다음
- **한 일**:
  - 7.4 F1을 격리 스택에서 확인했습니다. 환자 26-00085: 어제(09-28) 완료한 진료(Codaep 포장 2병, 결과 뒤 취소한 CBC, 상처 드레싱 5일)와 오늘 내원이 있습니다.
  - 「Visites passées」에서 09-28을 누르니 다음이 나왔습니다:
    - 「Dossier passé · lecture seule」와 「← Retour à l'actuel」
    - T° 38.1, 기록 「Toux depuis 3 jours」
    - Codaep 「15 par jour en 3 prises, pendant 7 jours — 2 flacons」
    - CBC 회색·줄 긋기 「Annulé」
    - Wound Dressing 「facturé 5 fois」
  - 과거 보기의 머리가 진료과가 없으면 「2026-09-28 · · S2 doctor」로 나오던 것을, 빈 값을 빼 「2026-09-28 · S2 doctor」로 고쳤습니다(대기 줄과 같게).
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`(7.4 F1 ✅, 8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 화면 FR로 위 내용을 확인했고, 머리 고친 것은 빌드 뒤 다시 확인했습니다.
- **다른 세션에 부탁**: 수납 — `PatientChart.jsx` 70행의 같은 머리(「날짜 · 진료과 · 의사」)도 진료과가 비면 「· ·」가 됩니다(수납 파일이라 손대지 않음, 급하지 않음).
- **남은 일 · 알려진 문제**: 7.4 F2(문서 인쇄 폭 다시 렌더링)는 총괄 순서를 기다립니다.

## 2026-09-29 — 위키 2절 따라 하기 · 작은 화면 고침 · 7절 남은 일 분류

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `3fce7b9` 다음(`33e70a5`·마이그레이션 030 포함, rebase 뒤 시험 다시 돌림)
- **한 일**:
  - **위키 2절**을 격리 스택의 프랑스어 화면으로 따라 하며 옛 글을 고쳤습니다.
    - 「Qté」를 「Dose/j」로 바꿨습니다(3곳).
    - 취소된 줄이 「검사」만이던 것을 검사·영상으로 고쳤습니다.
    - 「결과가 들어오면 🔒가 붙습니다」는 「✕가 취소 물음으로 바뀝니다」로 고쳤습니다.
    - 영상 상태에 「Annulé」를 더했습니다. 약 목록 오른쪽에 기본 용법이 보인다는 것도 적었습니다.
    - 제목 옆 개수, 완료 확인, 2.12에 포장 약 줄을 더했습니다(수량 없음, 정수만).
    - 2.12의 취소 물음은 영상 문구까지 적었습니다.
    - 2.7 「Sélection visite」의 「주의(⑫)」는 결정 내용(지난 기록도 고칠 수 있음, 변경 기록)으로 바꿨습니다.
  - **화면에서 찾아 고친 것** (`Consultation.jsx`):
    - 처방 표의 **횟수·일수 칸 숫자가 안 보이던 것**: 숫자 칸의 스핀 단추가 27px 칸을 가렸습니다 → `inputMode="numeric"` 글자 칸으로 바꿨습니다.
    - **검사·영상 줄 Posologie의 「1.000」**: 오더 코드 기본 용량(칼럼 기본값)이 찍히던 것을 새로 넣는 검사·영상 줄에서는 비웁니다. 이미 넣은 줄은 그대로입니다.
    - **한국어 칸 머리 「Tms·Day」**: 공용 키가 영어라 `cs_colTimes`·`cs_colDays`(횟수·일수 / Fois·Jours / Times·Days)를 새로 만들었습니다.
    - **좁은 화면의 바이탈 칸**: 800px 폭에서 입력 칸이 실처럼 좁았습니다 → 좁으면 한 줄에 하나(`auto-fill`, 최소 118px). 1366px에서는 두 줄 그대로임을 확인했습니다.
    - **대기 목록 줄의 「26-00002 · ·」** → 빈 진료과·담당의를 뺐습니다.
    - **과거 보기**: 취소된 오더를 회색·줄 긋기로, 두 번 이상 청구되면 「n회 청구」를 보입니다.
  - **7절 분류**: 7.1·7.2의 번호 항목은 모두 ✅ 또는 결정됨입니다. 남은 것은 새 7.4에 정리했습니다.
    - 결정이 필요한 것(의학 판단) 5개:
      - R1: 수술기록지 여러 개 고르기 그룹
      - R2: 프랑스어 의학 용어
      - R3: 소견 기본 문장의 괄호 자리
      - R4: ACT01·ORS 기본 용량
      - R5: 용법 칸 10자
    - 결정 없이 할 수 있는 것 3개:
      - F1: 과거 기록을 화면에서 다시 따라 하기
      - F2: 문서 인쇄 폭 다시 렌더링
      - F3: 충수 인쇄 여유 9px 지켜보기
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_colTimes`·`cs_colDays`(진료 구역 안)
- **DB 마이그레이션**: 없음 · **번역 키**: `cs_colTimes` · `cs_colDays`
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182에서 확인했습니다.
  - 화면 FR: 대기 서랍(En Attente / Terminé / Rechercher), 환자 줄, 바이탈 이름, 문장사전 분류, 검색 목록 표시(MÉD·LABO·CR·WL, 약 오른쪽 TID), Sans prix 개수, 상태 칸 글자를 확인했습니다.
  - 고친 뒤: 횟수 칸에 「1」이 보이고, 새 L02의 Posologie는 비었습니다. KO 머리는 「일총투여 | 횟수 | 일수 | 용법 | 단위」이고, 바이탈은 800px에서 한 줄씩, 1366px에서 두 줄입니다. 대기 줄은 「26-00002」입니다.
  - 시험 모두 통과했습니다: ⑭ 16(첫 줄 검사를 「201이 적용되기 전에 만든 줄」로 바꿈 — 다시 돌리면 뒤에 만든 줄이 잡혔음), 포장 16, 영상 취소 19, 취소 25, 로그 34, lock, total, s2, t400, tlow.
- **확인 못 한 것**:
  - 과거 보기 화면(F1): 격리 DB에 지난 진료가 있는 환자가 없어 코드만 봤습니다.
  - 2.8~2.11 문서는 오늘 서명 확인 때 창을 연 것 말고는 다시 렌더링하지 않았습니다(F2).
- **위키**: `modules/consultation.md` 머리 · 2절 여러 곳 · 3.1(화면 크기) · 7.4(새로) · 8절
- **총괄 확인 요청**: 7.4의 결정 5개를 결정 세션에 넘길지 판단해 주세요.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 7.4의 F1·F2는 총괄이 정하는 순서대로 하겠습니다.

## 2026-09-29 — ⑭ 오더 총량 = 수량 × 일수 (진료 몫) · 검사 1·1·1 자동 · 칸 머리 「일총투여」

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `76457c9` 다음
- **한 일** (총괄 승인 설계 그대로, `wiki/handoff/coordinator.md` 「진료 세션에게 — ⑭ 설계 승인」):
  - **마이그레이션 201** `201_consultation_order_total.sql`:
    - `order_item.total_qty DECIMAL(10,3)`을 추가합니다.
    - `total_qty`가 빈 줄만 `COALESCE(quantity,1)`로 채웁니다. 기존 줄의 뜻은 그대로이고, 다시 돌려도 바뀌지 않습니다.
  - **서버** `consult.routes.js`:
    - 계산은 `orderTotal(quantity, days)` 하나입니다: 수량 × 일수(횟수는 곱하지 않음). 빈 수량은 1, 수량 0은 0입니다.
    - POST는 수량·횟수·일수가 비면 1로 저장하고(NULL 없음), 늘 계산합니다.
    - PUT은 수량이나 일수가 실제로 바뀌었거나 `total_qty`가 비었을 때만 다시 계산합니다. 횟수만 바뀌면 그대로입니다.
    - 변경 기록 `ORDER_LOG`에 `total_qty`를 더했습니다.
  - **화면** `Consultation.jsx`:
    - 검사·영상 오더는 늘 1·1·1로 넣습니다. 처치는 오더 코드의 기본 횟수·일수(없으면 1)를 씁니다. 약속처방도 같은 함수를 지납니다.
    - 첫 숫자 칸의 머리는 「일총투여」(fr « Dose/j », en « Daily ») 하나이고, 도움말 `cs_colDailyHint`가 붙습니다.
    - 두 번 이상 청구되는 줄은 이름 아래에 「n회 청구 / facturé n fois」(`cs_orderTotal`)가 보입니다.
- **바꾼 파일**: `backend/sql/201_consultation_order_total.sql`(새 파일) · `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_colDaily`, `cs_colDailyHint`, `cs_orderTotal`(진료 구역 안). 공용 키 `qty`는 건드리지 않았습니다.
- **DB 마이그레이션**: `201_consultation_order_total.sql` — **총괄이 번호를 다시 매겨 주세요.** 칸 추가 + 빈 줄 채움입니다(총괄 승인: 값의 뜻이 바뀌지 않음).
- **번역 키**: `cs_colDaily` · `cs_colDailyHint` · `cs_orderTotal` (ko · en · fr)
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182에서 확인했습니다(시작 때 201이 적용됨: 「applying 201_consultation_order_total.sql」).
  - **⑭ 시험 16개 전부 통과**:
    - 칸이 생기고, 빈 줄이 없으며, 옛 줄은 모두 총량 = 수량입니다.
    - 아무것도 안 보낸 검사는 1·1·1이고 총량 1입니다. 주사 1·1·5는 총량 5입니다.
    - 일수 5→3이면 3, 횟수만 바꾸면 그대로 3, 수량 2이면 6, 그대로 저장하면 6입니다. 수량 0은 0, 1.5×2는 3입니다.
    - 옛 줄(수량 2·일수 3·총량 2)은 메모만 고치면 2 그대로이고, 일수를 고치면 8입니다. 총량이 빈 줄은 저장하면 계산됩니다.
    - 끝난 진료의 로그 줄에 일수 3→1과 총량 6→2가 남습니다.
    - **마이그레이션을 한 번 더 돌려도 값이 같습니다**(md5 비교).
  - 기존 시험도 모두 통과했습니다: 포장 16, 영상 취소 19, 취소 25, 로그 34, lock, total, s2, t400, tlow. 로그 시험의 오더 수량 줄은 `total_qty`가 같이 남는 것으로 기대값을 바꿨습니다.
  - **화면**:
    - FR: 칸 머리 「Dose/j」(도움말 « … 2 jours sur un examen le facture deux fois »). 검색으로 넣은 CBC와 Wound Dressing은 1·1·1이었습니다. Wound Dressing의 일수를 5로 바꾸니 « facturé 5 fois »가 나왔습니다.
    - KO: 머리 「일총투여」와 「5회 청구」를 확인했습니다.
- **확인 못 한 것**: 수납이 `total_qty`를 읽는 쪽(수납 세션 몫 — 이 커밋이 develop에 들어온 뒤). 그 전까지 수납은 여전히 `quantity`로 청구하므로, 일수가 2 이상인 새 줄은 1일치로 청구됩니다(실행 중 EMR에는 그런 줄이 0건).
- **덧붙여 본 것(다음 일 — 위키 2절 따라 하기에서 다룰 것)**:
  - 오더 줄의 「Fois」 입력 칸이 27px라 숫자가 스핀 단추에 가려 보이지 않습니다.
  - 오더 줄의 Posologie 칸에 오더 코드의 기본 용량 「1.000」이 찍힙니다.
  - 한국어 머리의 `tms`·`day`가 「Tms·Day」 영어 그대로입니다(공용 키).
- **위키**: `modules/consultation.md` 머리 · 1(머리 문단) · 2.3(칸 표·검사 줄 설명) · 3.2(POST·PUT 오더) · 4(마이그레이션·`order_item`) · 5(수납) · 7.2 ⑭ · 8절
- **총괄 확인 요청**: 마이그레이션 201 번호. 합치면 수납 세션에 「`total_qty` 읽기」 시작 알림을 부탁드립니다.
- **다른 세션에 부탁**: 수납 — `COALESCE(o.total_qty, o.quantity, 1)`로 서버 3곳(121, 600/622)과 화면 3곳(Payment.jsx 184, 206-208, 596). 수량 0은 0입니다.
- **남은 일 · 알려진 문제**: 다음은 위키 2절을 처음부터 따라 하며 고치고, 7절을 「결정 필요 / 결정 없이 가능」으로 나눠 보고하는 일입니다.

## 2026-09-29 — 영상 취소 물음 문구 (PACS 지적)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — `f79cc79` 다음
- **한 일**: 영상 줄의 취소 물음은 `8e497c2`부터 검사용 `cs_cancelPrompt`(「검사 목록」)가 아닌 영상용 `cs_cancelPromptImg`를 씁니다. 여기에 「영상은 계속 볼 수 있다」는 말을 더했습니다. 새 문구(PACS 위키 2.1 ④·2.4·2.6 ⑤를 맞출 때 쓰기):
  - ko 「「{name}」에는 이미 판독이나 촬영이 있어 지울 수 없습니다. 대신 「취소됨」으로 표시할까요? 영상과 판독은 기록으로 남아 영상 창에서 계속 볼 수 있습니다. 아직 촬영 전이면 장비의 촬영 목록(워크리스트)에서 빠지고, 청구에서도 빠집니다. 이미 수납된 검사면 수납에서 환불(정정) 처리가 필요합니다. 취소 이유 (선택):」
  - fr « « {name} » a déjà un compte-rendu ou un examen réalisé et ne peut pas être retiré. Le marquer comme annulé ? Les images et le compte-rendu restent au dossier et restent consultables dans la visionneuse. Si l'examen n'a pas encore été fait, il sort de la liste de travail des appareils ; la demande sort aussi de la facture. Si elle a déjà été payée, la caisse devra la rembourser. Motif (facultatif) : »
  - en « "{name}" already has a reading or a study taken and cannot be removed. Mark it as cancelled instead? The images and the reading stay on record and can still be viewed in the image window. If the study was not taken yet, it leaves the device worklist; the order also leaves the bill. If it was already paid, the cashier will need to refund it. Reason (optional): »
- **바꾼 파일**: `wiki/modules/consultation.md`(8절)
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_cancelPromptImg` 문구만
- **DB 마이그레이션**: 없음 · **번역 키**: 새 키 없음(문구만)
- **확인한 방법**: `npm run build` 통과. fr.js를 불러 문자열이 줄바꿈·따옴표까지 그대로인지 확인했습니다. 화면에서 이 키를 쓰는 곳은 `8e497c2` 때 프랑스어로 확인한 그 물음 하나입니다.
- **확인 못 한 것**: 새 문구를 화면에서 다시 띄워 보지는 않았습니다(문구만 바뀜).
- **다른 세션에 부탁**: PACS — 위 새 문구로 직원 안내를 맞춰 주세요.
- **남은 일 · 알려진 문제**: ⑭ 설계 메모는 총괄 확인을 기다립니다.

## 2026-09-29 — 포장 단위 약 (H2-B) 진료 몫 + 수납 부탁(총량 NULL 다시 계산) · 29 표 순서 확인

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `227d19c` 다음(설정·임상병리·접수 합친 뒤로 rebase, 시험 다시 돌림)
- **한 일** (약국 설계 메모 「3. 누가 무엇을」의 진료 줄 그대로):
  - **서버** `POST /:id/prescriptions`
    - `drug_id`로 약 표에서 `pack_unit`·`pack_label`을 읽어 줄에 복사합니다. 화면이 보낸 값은 쓰지 않고, 단위가 비었으면 `unit`입니다.
    - 포장 줄의 `total_qty`는 요청의 `pack_qty`입니다. 1 이상의 정수가 아니면 400, 없거나 비면 NULL입니다.
  - **서버** `PUT /prescription/:rxId`
    - 포장 줄(줄에 저장된 표시)은 `pack_qty`가 왔을 때만 총량을 바꿉니다. 하루 총량·일수를 고쳐도 그대로입니다.
    - 보통 줄은 **`total_qty IS NULL`이면 다시 계산**합니다(수납 부탁).
    - 변경 기록의 처방 칸에 `pack_label`을 더했습니다.
  - **화면** `Consultation.jsx`
    - 포장 줄의 약 이름 아래에 「Quantité [ ] flacons / 수량 [ ] 병」 칸이 있습니다. 비면 빨간 테두리와 「Indiquez la quantité」 표시가 붙습니다.
    - 제목 옆에 「⚠ n flacon(s)/tube(s) sans quantité」가 나오고, 진료를 끝낼 때 한 번 묻습니다(`cs_noPackConfirm`).
    - 포장 줄은 하루 총량이 비어도 「하루 총량 없음」 표시가 붙지 않습니다.
    - 단위 말은 약국의 `packWord`이고, 수에 맞춰 단·복수로 씁니다.
    - 약속처방 `applySet`은 약 줄의 `quantity`(없으면 1)를 `pack_qty`로 넘깁니다.
  - **29 표 순서**: 한 표 안에서 처방(약) 줄이 먼저, 오더(검사·처치·영상) 줄이 아래에 그려집니다(`rxList` 다음 `orderItems`). 코드 변경 없이 화면에서 확인했습니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 6개(`cs_packQty`, `cs_packQtyHint`, `cs_noPackQty`, `cs_noPackQtyCount`, `cs_noPackConfirm`, `cs_packQtyWhole`)를 진료 구역 안에 넣었습니다. `rx-dosing.js`(약국)는 쓰기만 했습니다.
- **DB 마이그레이션**: 없음(칸은 약국의 025)
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182에서 확인했습니다. 약 표시는 **격리 DB에서만** SQL로 했습니다: CODAEP은 병, SALB는 흡입기.
  - **포장 시험 16개 전부 통과**:
    - 수가 없으면 표시·단위가 복사되고 총량은 NULL입니다. `pack_qty` 2이면 총량 2입니다(15×7이 아님).
    - `pack_qty`가 1.5나 0이면 400입니다. 흡입기 줄은 inhaler 1입니다.
    - PUT에서 용량·일수만 바꾸면 총량 그대로, `pack_qty` 3이면 3, 빈 값이면 NULL, 2.5이면 400입니다. 빈 줄에 수를 넣으면 채워집니다.
    - 보통 약에 화면이 포장이라고 보내도 무시되고 3×5=15입니다.
    - 보통 줄의 총량을 NULL로 두고 같은 값으로 저장하면 15로 다시 계산되고, 그 뒤 저장해서는 그대로입니다.
    - 약의 표시를 나중에 꺼도 이미 쓴 줄은 포장 줄 그대로입니다.
    - 수납 항목은 병 수(2, 2)를 읽습니다.
  - 약국 대기 목록(`/pharmacy/pending`)이 진료가 쓴 줄을 `[CODAEP, true, bottle, 2]`처럼 받습니다.
  - 기존 시험도 모두 통과했습니다: 영상 취소 19, 취소 25, 로그 34, lock, total, s2, t400, tlow.
  - **화면**:
    - KO: 검색으로 Codaep을 넣으니 「수량을 넣으세요」, 제목 「수량 없는 포장 약 1개」, 풀이 「… — 병 수 확인 필요」, 빈 「수량 [ ] 병」 칸이 나왔습니다. 2를 넣고 칸을 벗어나니 「하루 3, 3회로 나눠 7일 — 2병」이 되고 표시가 사라졌습니다.
    - FR: 시험 세트(Codaep ×2, 파라세타몰, CBC)를 넣으니 「15 par jour en 3 prises, pendant 7 jours — 2 flacons」, 「Quantité [2] flacons」가 나오고 CBC는 약 아래였습니다.
    - FR: 수를 지우니 「Indiquez la quantité」, 「nombre de flacons à vérifier」가 나왔습니다. Terminé를 누르니 « 1 médicament(s) sans quantité … Terminer quand même ? »라고 묻고, 아니오면 진료가 열린 채로 남았습니다.
- **확인 못 한 것**:
  - 설정 **화면**에서 표시를 켜는 것은 눌러 보지 않았습니다. 대신 rebase 뒤 합쳐진 설정 **API**로 PCM250에 bottle을 켜고 처방하니 `true bottle 1`로 복사됐고, 끈 뒤에는 `false null`이었습니다.
  - 설정의 약속처방 편집에서 약 줄의 수량 칸(설계 메모의 「+ 설정의 약속처방 탭 편집 칸」 — 설정 세션 몫).
  - 실행 중 EMR은 건드리지 않았습니다.
- **위키**: `modules/consultation.md` 머리 · 2.3(수량 칸·수 없음 줄) · 2.4(세트 수량) · 3.2(포장 규칙) · 4(prescription 칸) · 8절
- **총괄 확인 요청**: 포장 단위 진료 몫. 약국 표시(`3f9a2de`)가 develop에 있으므로 이 커밋을 합치면 진료 → 약국 → 수납이 이어집니다.
- **다른 세션에 부탁**: 설정 — 약속처방 편집 창의 약 줄 수량 칸(포장 단위 약일 때 병·개 수). 이미 있으면 필요 없습니다.
- **남은 일 · 알려진 문제**: 다음은 4) ⑭ 설계 메모(오더 총량 칸, 기존 줄은 옛 뜻, 검사 1·1·1 자동)입니다. 보고한 뒤 구현하겠습니다.

## 2026-09-29 — 영상 오더 취소 켜기 (결정 38-③) · 영상 창 안내 · 서명 남은 확인

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `2a76b5f` 다음
- **한 일**:
  - **서버**: 취소 API에서 영상 오더를 막던 409를 없앴습니다.
    - 같은 트랜잭션 안에서 오더 UPDATE **앞에** PACS의 `cancelWorklistForOrder(client, id)`를 부릅니다. 그래서 돌려주는 줄에 `worklist_status='cancelled'`가 반영됩니다.
    - 기다리던(`scheduled`·`in_progress`) 워크리스트 줄은 취소되어 브리지 피드에서 빠집니다. 이미 촬영된 `completed` 줄은 기록으로 남습니다.
    - 검사 오더에는 워크리스트 줄이 없어 아무 일도 하지 않습니다.
    - 로그(`ORDER_CANCEL`)에 워크리스트 상태의 전 → 후를 더했습니다.
    - `IMAGING_NO_CANCEL`은 삭제했습니다.
  - **화면**:
    - 판독이나 촬영이 있는 **영상** 줄도 빨간 ✕로 취소를 묻습니다. 영상용 문구는 `cs_cancelPromptImg`로, 영상·판독은 남고 촬영 전이면 워크리스트에서 빠진다는 내용과 환불 안내를 담았습니다.
    - 삭제가 409로 거절되는 경쟁 상황도 영상까지 취소 물음으로 넘어갑니다.
    - 상태 칸은 종류와 관계없이 취소를 먼저 봅니다. 30초 새로 고침은 취소된 오더를 기다리지 않습니다.
    - 처치는 전처럼 🔒입니다.
  - **영상 창** (PACS 부탁 ②③, P-18):
    - `cancelled`면 머리에 ⊘ `px_cancelledViewer`와 이유가 나오고, 판독은 읽기만 합니다(저장 단추 없음).
    - 판독 저장이 409 `Imaging order was cancelled`면 `px_readingOnCancelled`를 알리고 창과 오더 표를 다시 불러옵니다.
    - `no_study`이고 `has_viewer`가 참이면 `px_noStudy`를 보입니다. 「뷰어 주소 없음」은 `has_viewer`가 거짓일 때만 나옵니다.
    - ④ 판독 날짜 규칙은 `24abb17`에서 이미 했습니다.
  - `cs_imagingNoCancel`(ko·en·fr)을 삭제했습니다.
- **문서 서명 남은 확인 2개 — 통과** (`b829e00`, 코드 변경 없음):
  - ① 담당의 없는 내원을 관리자로 열면 「Médecin (Signature)」, 이름이 빈칸입니다.
  - ② 의사 계정으로 발급한 D26-00013을 관리자로 이력에서 다시 열면 「S2 doctor」가 그대로입니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 구역에 `cs_cancelPromptImg`를 더하고 `cs_imagingNoCancel`을 뺐습니다. `px_` 키는 PACS가 넣은 것을 쓰기만 했습니다. `pacs.cancel.js`는 부르기만 했습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_cancelPromptImg` 추가, `cs_imagingNoCancel` 삭제
- **확인한 방법**: `node --check`와 `npm run build` 통과. 재시작 뒤 새 격리 스택 9182(develop `2a76b5f` 기준)에서 확인했습니다.
  - **영상 취소 시험 19개 전부 통과**:
    - 결과가 없으면 409입니다.
    - 판독을 쓰고 취소하면 200이고, 오더·워크리스트 상태가 모두 cancelled이며 판독은 남습니다. 로그에는 워크리스트 sent → cancelled가 남습니다.
    - 취소된 오더의 판독 저장은 409이고, viewer-url이 cancelled와 이유를 돌려줍니다. 다시 취소해도 그대로입니다.
    - 촬영 끝난 오더는 DELETE 409, 취소 200이며 워크리스트는 completed로 남습니다.
    - 촬영 중이면 워크리스트가 cancelled가 됩니다.
    - 워크리스트 없는 영상은 viewer-url이 no_study에 url 빈 값이고, 취소는 200입니다.
    - 청구 항목에서 빠집니다.
  - 기존 시험도 통과했습니다: 취소 E2E 25, 로그 34(② 기대값을 「영상 취소 200」으로 바꿈), lock, s2, total, t400, tlow.
  - **화면 FR** (환자 26-00016; 뷰어 주소는 격리 DB에만 가짜로 넣음):
    - 판독 있는 S1의 ✕ 도움말은 「A un résultat - cliquer pour le marquer comme annulé」입니다. 누르면 영상 문구로 묻고, Annuler면 그대로입니다.
    - 취소된 S1은 ⊘ 「Annulé — Mauvais côté」로 보입니다. 영상 창에는 「⊘ Images d'une demande annulée … — Motif : Mauvais côté」가 나오고, 판독은 글자로만 보이며 저장 단추가 없습니다.
    - 워크리스트 없는 XR-MAN은 영상 자리에 px_noStudy 문구가 나오고 iframe이 없습니다.
    - 경쟁 상황: S1 창을 연 채로 밖에서 취소하고 판독을 저장하니 「Cet examen d'imagerie a été annulé en consultation …」 알림이 나왔습니다. 창은 취소 모습(이유 Doublon)으로 다시 열렸고 저장 단추가 없어졌습니다.
  - **화면 KO**: 「⊘ 취소됨 — Doublon」, px_noStudy와 px_cancelledViewer가 한국어로 나옵니다.
- **확인 못 한 것**: 실제 장비·브리지에서 워크리스트가 빠지는 것은 보지 못했습니다(격리에는 브리지가 없음). DB의 `worklist_log.status='cancelled'`와 피드 조건(`status='scheduled'`)으로 확인했습니다. 실행 중 EMR은 건드리지 않았습니다.
- **위키**: `modules/consultation.md` 머리 · 2.3(✕·🔒 줄) · 영상 뷰어 사용법 · 2.12 · 3.1(취소·영상 판독) · 3.2(취소 API) · 8절
- **총괄 확인 요청**: 영상 취소 켜기. 이 커밋을 합치면 실행 중 EMR에서 영상 취소가 켜집니다.
- **다른 세션에 부탁**: PACS — 브리지 한 주기 뒤 장비에서 빠지는지, 실제 환경에서 한 번 봐 주시면 좋겠습니다(총괄 판단).
- **남은 일 · 알려진 문제**: 다음은 3) 포장 단위 약(H2-B), 수납 부탁(`total_qty IS NULL` 다시 계산)입니다.

## 2026-09-29 — 문서 서명 = 문서를 작성한 의사 (결정)

- **상태**: 확인 요청 (PC 재시작 전에 저장 — 아래 「확인 못 한 것」 두 가지는 재시작 뒤에 확인)
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `aa6d12f` 다음
- **한 일**: `DocumentModal.jsx`에서 서명 칸의 이름(`signer`)을 이렇게 정합니다.
  - 로그인한 계정의 역할이 `doctor`면 **그 사람 이름**입니다.
  - **의사가 아닌 계정**(관리자·수납·약국)은 자기 이름을 의사 칸에 넣지 않습니다. 전처럼 내원의 담당의 이름을 쓰고, 그것도 없으면 **빈칸**(손으로 서명)입니다. 전에는 마지막에 로그인한 사람 이름으로 채웠습니다.
  - 같은 이름이 `autofill: 'doctor'` 칸(수술기록지 집도의)도 채웁니다.
  - 이미 발급된 문서는 발급 때 저장된 payload의 이름 그대로입니다. 보기 화면 코드(`P.doctor || doctor`)는 바꾸지 않았습니다.
  - **정한 것 (총괄 요청 — 비의사 계정)**: 위와 같습니다. 관리자 계정이 실제로 의사가 쓰는 계정이라면, 설정에서 역할을 `doctor`로 두면 자기 이름이 찍힙니다.
- **바꾼 파일**: `frontend/src/components/DocumentModal.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/components/DocumentModal.jsx` — 진료·수납·약국의 문서 창이 모두 씁니다. 수납·약국 화면에서는 계정이 의사가 아니므로 결과가 전과 같습니다(내원의 담당의). 담당의가 없을 때만 빈칸이 됩니다.
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182에서 26-00022(내원 담당의 「Dr RAKOTO (visite)」, 격리 DB에만 넣은 이름뿐인 계정)의 의뢰서 미리보기를 확인했습니다.
  - 관리자 계정: 「Médecin Dr RAKOTO (visite) (Signature)」
  - 의사 계정(S2 doctor): 「Médecin S2 doctor (Signature)」
- **확인 못 한 것**: ① 담당의 없는 내원을 관리자로 열 때 빈칸인지 ② 의사로 발급한 문서를 관리자로 다시 열 때 발급 때 이름 그대로인지(코드는 바꾸지 않은 경로). 격리 볼륨을 지웠으므로 재시작 뒤 시험 계정부터 다시 만들어 확인하겠습니다.
- **위키**: `modules/consultation.md` 3.5(서명 칸) · 7.2 ⑱ · 8절
- **총괄 확인 요청**: 비의사 계정의 규칙(위)
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 재시작 뒤 순서는 위 확인 ①② → P-18 `px_noStudy` → 포장 단위(H2-B 진료 몫, 약국 025 들어옴) → ⑭ 설계 메모(오더 기본 1·1·1 지시 포함) → 29 표 순서 확인입니다.

## 2026-09-29 — 후속 ①②③: NULL 상태 · 영상 취소 거절 · 변경 기록(로그) 진료 몫

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `132daea` 다음(PACS·임상병리 로그 합친 뒤로 rebase, 시험 다시 돌림)
- **한 일**:
  - **① NULL 상태.** `order_item.status`와 `prescription.status`는 기본값만 있고 NULL을 허용하는 칸입니다. 그래서 `status <> …` 조건이 NULL 줄을 못 잡아 409로 거절했습니다.
    - 이제 오더 PUT과 처방 PUT/DELETE는 줄을 `FOR UPDATE`로 먼저 읽고 **실제 status**를 보고 판정합니다: 없음 404, 취소·조제 409, NULL은 통과.
    - 처방도 같은 문제라 함께 고쳤습니다. 옛 `rxRefusal`은 없앴습니다.
  - **② 영상 오더 취소를 서버가 거절합니다**: 409 `Imaging order cannot be cancelled yet`, 화면 문구 `cs_imagingNoCancel`.
    - 영상 취소도 검사와 같은 방식으로 하기로 결정됐으므로, 켤 때는 이 거절 한 줄을 `cancelWorklistForOrder` 호출로 바꿉니다(주석과 위키에 적어 둠).
    - PACS가 부탁한 영상 창 몫은 그때 함께 하겠습니다.
  - **③ 변경 기록.** 기록은 `writeAudit`로 쓰고, 트랜잭션의 client를 넘깁니다.
    - **늘 남기는 것**: `ORDER_CANCEL`(상태·이유), `ORDER_DELETE`(지운 줄의 코드·이름·수량·가격·상태), `PRESCRIPTION_DELETE`(약·용량·횟수·일수·총량·가격).
    - **끝난 진료만 남기는 것 — `CONSULT_RECORD_EDIT`**: 기록·바이탈 수정, 처방 추가·수정, 오더 추가·수정, 진단 추가·삭제(API만 있음). `entity`로 무엇인지 가립니다.
    - **「끝난」의 기준**(`consultOf()`, 같은 트랜잭션 안에서 읽음) — 총괄 추천대로 둘 중 하나입니다.
      - `consultation.status`가 `completed` 또는 `signed`입니다. 되돌리는 코드가 없으므로 다시 열어 고쳐도 해당합니다.
      - 내원 날짜가 오늘(`todayLocal`)이 아닙니다.
      - 오늘 열려 있는 진료의 여러 번 저장은 남기지 않습니다.
    - 바꾸는 라우트를 모두 한 트랜잭션으로 묶었습니다(`inTx`: 응답은 COMMIT 뒤에 나감). 기록·바이탈 PUT, 진단 POST/DELETE, 처방 POST/PUT/DELETE, 오더 PUT이 해당합니다. 오더 POST·취소·삭제는 원래 트랜잭션입니다.
    - 전·후 값은 둘 다 표에서 읽은 값입니다. 빈 글자와 NULL은 같은 것으로 봅니다(화면이 메모를 `''`로 보냄).
  - **덤으로 고친 것 — 바이탈이 지워지던 문제.** 로그 시험에서 드러났습니다.
    - 화면이 바이탈을 `bp_systolic`이 있을 때만 불러왔습니다. 그래서 혈압 없이 체온만 저장된 진료를 다시 열면 칸이 비고, 다음 Sauver에서 체온이 NULL로 지워졌습니다.
    - 이제 저장된 바이탈을 모두 불러옵니다(`Consultation.jsx` 한 줄).
    - 위키에는 「작은 흠」으로 적혀 있었지만 실제로는 기록이 사라지는 문제였습니다.
  - 처방·진단을 없는 진료에 쓰면 이제 404 `Consultation not found`입니다. 오더는 원래 그랬습니다. 전에는 FK 오류가 400으로 나갔습니다.
  - 위키 7절 ⑩·⑫·⑱·⑳을 실장님 결정으로 닫았습니다. 처방 표 한 표(29)와 ⑭는 다음 작업에서 다룹니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_imagingNoCancel` 1개(진료 구역 안). `utils/audit.js`와 `03-change-log.md`는 건드리지 않았습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_imagingNoCancel` (ko · en · fr)
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182(develop `132daea` 기준으로 rebase 뒤 다시 빌드)에서 확인했습니다.
  - **새 시험 34개 전부 통과**:
    - ① NULL 상태인 오더 PUT, 처방 PUT·DELETE가 200입니다. 조제된 처방은 여전히 409, 없는 줄은 404입니다.
    - ② 판독이 있는 영상 취소는 409이고, 오더는 취소되지 않습니다.
    - ③ 오늘 열린 진료의 저장·추가·수정·진단은 0줄입니다.
    - ③ 처방 삭제, 오더 삭제, 오더 취소는 각각 1줄이고, 직원·역할·환자 이름·차트번호·내원이 채워집니다. 두 번째 취소(바뀐 것 없음)는 0줄입니다.
    - ③ 완료 뒤 같은 값 저장은 0줄, SOAP 수정은 바뀐 칸만 1줄입니다. 처방 같은 값은 0줄, 일수 5→7은 1줄입니다.
    - ③ 완료 뒤 처방 추가(`before` 없음), 오더 추가, 오더 수량 1→3, 진단 추가, 진단 삭제(`after` 없음)가 각각 1줄입니다. 완료를 다시 눌러도 0줄입니다.
    - ③ 어제 내원(완료 안 함)을 고치면 1줄입니다.
    - **롤백**: 격리 DB에만 COMMIT 때 실패하는 시험용 트리거를 걸고 저장하니 500이 나고, 줄이 없고, 값도 바뀌지 않았습니다. 트리거를 지운 뒤에는 저장되고 기록도 남았습니다.
  - 기존 시험도 모두 통과했습니다: 취소 E2E 25, lock-test, total-test, s2-test, t400, tlow. t400의 두 항목은 400 → 404로 기대값을 바꿨습니다. total-test는 접수의 같은 날 중복 경고 때문에 `allow_duplicate`를 붙였습니다.
  - **화면(FR)**: 끝난 진료 26-00022에서 처방 일수 7→8을 바꾸고 기록을 저장하니 `prescription` 줄(`days`·`total_qty`)과 `consultation` 줄(`note_text`)이 남았습니다. 여기서 바이탈 문제가 드러났고, 고친 뒤 체온 37.5·맥박 88이 칸에 나오며 저장 뒤에도 그대로였습니다. 기록 줄에는 `note_text`만 남았습니다.
- **확인 못 한 것**: 실행 중 EMR(9080)은 건드리지 않았습니다. 설정의 「기록」 탭에서 어떻게 보이는지는 설정 세션 몫입니다.
- **위키**: `modules/consultation.md` 머리 · 1 · 2.2(5번) · 3.1(pickPatient) · 3.2(PUT·처방·오더·취소·진단·「변경 기록」) · 5 · 7.2 ⑩⑫⑱⑳ · 8절
- **총괄 확인 요청**: 「끝난」의 기준(위). ⑫ 결정대로 지난 기록을 고칠 수 있게 두었고, 추적은 로그가 맡습니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 다음은 문서 서명(작성한 의사) → P-18 `px_noStudy` → ⑭ 설계 메모 → 29 표 순서 확인 → 포장 단위(약국 커밋 뒤) 순서입니다.

## 2026-09-29 — 총괄 확인: 결과 있는 검사 오더 「취소」 (a01c946)

- **상태**: develop에 합침 + 실행 중 EMR(9080) 반영. 마이그레이션은 **201 → `023_consultation_order_cancel.sql`**.
- 임상병리(1ef0be2)·수납(2fa4d16)·PACS(9327ae8, 준비만) 몫이 먼저 들어가 있었으므로 이 커밋으로 기능이 켜짐.
- DB 백업 후 배포. 실행 중 EMR에서 확인한 것(**쓰지 않는 경로만**): `order_item`에 칸 3개 생김 · 없는 오더 404 · 결과 없는 검사 오더 409 `Order has no result` · 약국·검사실 계정 403 · 오더 7건 모두 `ordered` 그대로 · 수납 합계 그대로.
- 실제로 취소하는 흐름(결과 입력 → 취소 → 검사실 회색 → 청구에서 빠짐/환불)은 운영 DB에 쓰지 않으려고 누르지 않음. 진료 세션이 격리 스택에서 세 모듈을 이어 25/25 확인한 것을 근거로 함.
- **진료 세션에 남긴 후속**: ① `PUT /order/:id`의 `status <> 'cancelled'`는 status가 NULL인 줄을 「취소됨」으로 거절함(칸이 NULL 허용) → `IS DISTINCT FROM` ② 취소 API가 code_type을 보지 않음 → PACS 저장소를 합치기 전에는 영상 오더를 서버에서도 거절 ③ 취소·삭제에 변경 기록(`wiki/03-change-log.md`) 붙이기.

## 2026-09-29 — 결과 있는 검사 오더 「취소」 (결정 3-B, 진료 몫)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — develop `4caaedd` 다음
- **한 일**:
  - **마이그레이션 201** `201_consultation_order_cancel.sql`: `order_item`에 `cancelled_at`·`cancelled_by`(staff FK)·`cancel_reason` 칸을 추가했습니다. 칸만 더하고 기존 줄은 바꾸지 않으며, 여러 번 돌려도 안전합니다. `status='cancelled'`는 001부터 허용돼 있었습니다.
  - **`POST /api/consultations/order/:id/cancel`** `{reason}` (권한 `consultation`)
    - 오더를 `FOR UPDATE`로 잠급니다.
    - 없으면 404를 돌려줍니다. 이미 취소면 그대로 200을 돌려줍니다(두 번 눌러도 이유가 바뀌지 않음).
    - 결과가 **없으면 409 `Order has no result`** — 그런 오더는 지우면 됩니다.
    - 결과가 있으면 `status='cancelled'`, 시각, 취소한 사람, 이유를 저장합니다. 이유는 앞뒤 공백을 빼고 500자까지 받고, 비면 NULL입니다.
    - 「결과 있음」 판정은 삭제와 같은 `orderProduced()` 하나로 모았습니다: 검사값 · 판독문 · 워크리스트 진행/완료.
    - API는 `code_type`을 보지 않습니다(결정대로).
  - **`PUT /order/:id`**는 취소된 오더를 **409 `Order is cancelled`**로 거절합니다. 없는 오더는 전처럼 404입니다.
  - **화면** (`Consultation.jsx`)
    - 결과가 있는 **검사** 줄은 🔒 대신 빨간 ✕가 보입니다(도움말 「결과가 있는 검사 — 누르면 취소로 표시할지 묻습니다」).
    - 이 ✕를 누르면 「결과가 있어 지울 수 없습니다. 「취소됨」으로 표시할까요? … 이미 수납된 검사면 수납에서 환불(정정) 처리가 필요합니다. 취소 이유 (선택):」라고 묻습니다. Annuler면 아무것도 하지 않습니다.
    - 화면을 연 사이에 결과가 들어온 줄은 ✕ → 「Retirer ?」 → 삭제 409 뒤 같은 물음으로 넘어갑니다.
    - 취소된 줄은 흐리게·줄 그어 보이고, 입력 칸 없이 ⊘ 표시와 상태 「Annulé / 취소됨」이 나옵니다. 마우스를 올리면 이유가 보입니다.
    - 취소된 줄은 가격 없음 개수에서 뺐습니다.
    - 따로 늘 보이는 취소 버튼은 없습니다.
    - **영상은 🔒 그대로**입니다(PACS 저장소를 합친 뒤 워크리스트 취소와 함께 할 일).
- **바꾼 파일**: `backend/sql/201_consultation_order_cancel.sql`(새 파일) · `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 키 3개를 진료 구역 안에만 추가했습니다.
- **DB 마이그레이션**: `201_consultation_order_cancel.sql` — 진료 번호대라서 **합칠 때 총괄이 번호를 다시 매겨 주십시오**. 칸 추가만 합니다.
- **번역 키**: `cs_cancelPrompt` · `cs_cancelHint` · `cs_orderIsCancelled` (ko · en · fr)
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182(develop `4caaedd` 기준 — 임상병리·수납의 취소 처리 포함)에서 세 모듈을 함께 확인했습니다.
  - **E2E 25개 전부 통과**:
    - 마이그레이션 칸 3개가 있습니다.
    - 결과가 없으면 409입니다.
    - 결과가 있으면 200이고 `status`·이유·`cancelled_by`(의사 계정)·`cancelled_at`이 저장됩니다. 두 번째 취소는 이유를 바꾸지 않습니다.
    - `lab_result`는 남습니다.
    - 취소된 오더에 대해 임상병리 결과 저장 409, PUT 409(문구 `Order is cancelled`), DELETE 409입니다.
    - 임상병리 결과 API가 취소와 이유를 보여 줍니다.
    - 약국 계정은 403, 없는 오더는 404입니다.
    - 청구 항목에서 취소된 오더가 빠집니다.
    - 수납한 뒤 취소하면 수납 목록에 「환불」로 다시 뜹니다(`needs_refund`, 환불액 = 검사 가격). 빈 이유는 NULL로 저장됩니다.
    - 결과 없는 영상은 409입니다.
  - **화면 FR**
    - L02 ✕를 누르니 프랑스어 물음(환불 안내 줄 포함)이 나왔습니다.
    - 「Erreur de patient」를 입력하자 ⊘와 「Annulé — Erreur de patient」가 나오고, 회색·줄 긋기에 입력 칸이 없어졌습니다.
    - 경쟁 상황: 화면을 연 뒤 L01에 결과를 넣고 ✕를 누르니 「Retirer « CBC » ?」 다음 취소 물음이 나왔습니다. Annuler면 그대로였고, 빈 이유로 OK하니 「Annulé」가 됐습니다.
  - **화면 KO**: 「취소됨 — Erreur de patient」가 나왔습니다. 판독이 있는 영상 S1은 🔒 그대로였습니다.
- **확인 못 한 것**: 실행 중 EMR(9080)은 건드리지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태 · 2.3(✕/⊘ 줄) · 2.12(메시지 2개) · 3.1 · 3.2 · 4(API·표·마이그레이션) · 5(임상병리·수납 연결) · 8절
- **총괄 확인 요청**: 마이그레이션 201의 번호를 다시 매겨 주십시오. 임상병리·수납 몫이 develop에 이미 있으므로 **이 커밋을 합치면 기능이 켜집니다**.
- **다른 세션에 부탁**: 없음. PACS를 합친 뒤에는 영상 오더 취소(`cancelWorklistForOrder`)를 진료 쪽에서 이어서 하겠습니다(지시가 있을 때).
- **남은 일 · 알려진 문제**: 되돌리기가 없습니다(결정대로). 잘못 취소했으면 오더를 다시 내면 됩니다.

## 2026-09-29 — 영상 판독 날짜를 현지 날짜로 (PACS P-22)

> **총괄 확인 (2026-09-29)**: `c11b34b`·`24abb17` 합침 + 실행 중 EMR 반영. 코드 검토: 취소된 내원은 409, 기록 저장은 보낸 칸만, 오더마다 돌던 `pacs_config` 생성 코드 삭제(실행 중 DB에 표와 한 줄이 있는 것 확인). 실행 중 EMR에서는 읽기 경로와 없는 내원 404만 확인 — 나머지는 세션의 격리 스택 확인.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — `c11b34b` 다음
- **한 일**: 진료 화면 영상 뷰어의 「Lu par … · 날짜」가 `result_at`(timestamptz)을 T 앞에서 잘라 UTC 날짜를 보여 주고 있었습니다. 그래서 현지 00~03시에 쓴 판독이 전날로 보였습니다. `LabResults.jsx`의 `ymd`와 같은 규칙(브라우저 현지 날짜, 날짜만 있는 값은 그대로)을 `Consultation.jsx` 위쪽에 두고 그것으로 보입니다. 같은 화면의 다른 날짜(생년월일·진료일)는 날짜만 있는 값(DATE)이라 원래 맞습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182에서 판독의 `result_at`을 2026-09-29 22:30 UTC(마다가스카르 30일 01:30)로 넣고 뷰어를 여니 「Lu par … · 2026-09-30」이 나왔습니다(이 PC는 서울 시간). 같은 함수를 `TZ=Indian/Antananarivo`로 돌려 보니, 옛 방식은 09-29, 새 방식은 09-30, 날짜만 있는 값은 그대로였습니다.
- **확인 못 한 것**: 없음
- **위키**: `modules/consultation.md` 3.1(영상 판독), 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 다음은 결과 있는 검사 오더 「취소」입니다.

## 2026-09-29 — 열린 낮은 항목: ⑫(일부) · ⑬ · ⑰ · ⑲

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `5f4fded`(DB 연결 시간대 수정 포함)
- **한 일** (총괄 승인 목록 그대로):
  - ⑫(a) **취소된 내원은 열지 않음**: `POST /consultations`가 내원을 `FOR UPDATE`로 읽고, `cancelled`면 409 `Visit was cancelled`, 없으면 404를 돌려줍니다. 전에는 진료가 생기고 내원이 `in_progress`로 되살아났습니다. 화면은 이 거절을 「접수에서 취소된 내원입니다…」로 알리고 환자 막대를 비웁니다. 전에는 콘솔에만 오류가 남고 빈 화면이었습니다.
  - ⑫(b) 오늘이 아닌 내원에 진료를 새로 만들면 `consult_date`가 **내원 날짜**가 됩니다. 전에는 오늘이었습니다.
  - ⑬ `PUT /consultations/:id`는 **요청에 들어 있는 칸만** 바꿉니다. `null`을 보낸 칸은 비웁니다.
  - ⑰ 문서 발행일을 **브라우저 현지 날짜**로 바꿨습니다(전에는 `toISOString()` UTC). 총괄 말씀대로 먼저 확인해 보니, 이 값은 SQL이 아니라 화면(브라우저)에서 만듭니다. 그래서 DB 시간대 수정으로는 고쳐지지 않고, 서버 도구 `todayLocal`도 쓸 수 없어 브라우저 날짜로 계산했습니다.
  - ⑲ 오더를 넣을 때마다 돌던 `CREATE TABLE IF NOT EXISTS pacs_config …`(옛 병원 기본값 포함)와 `INSERT … ON CONFLICT`를 지웠습니다. 001이 만든 줄을 읽기만 하고, 줄이 없으면 자동 생성을 켠 것으로 봅니다(전과 같은 결과).
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**:
  - `frontend/src/components/DocumentModal.jsx` — 발행일 계산 한 곳(⑰). 다섯 화면의 문서 발행일에 모두 적용됩니다.
  - `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_visitCancelled` 1개 추가
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_visitCancelled` (ko · en · fr)
- **확인한 방법**: `node --check`와 `npm run build` 통과. 격리 스택 9182(develop `5f4fded` 기준으로 다시 빌드)에서 확인했습니다.
  - API 시험 15개 전부 통과:
    - 취소된 내원 → 409, 내원은 여전히 cancelled, 진료가 생기지 않음. 없는 내원 → 404.
    - 3일 전 내원 → `consult_date` = 내원 날짜. 오늘 내원 → 오늘, `in_progress`.
    - S·체중을 넣은 뒤 화면처럼 기록·바이탈만 저장해도 S·체중이 남음. `bp_systolic: null`이면 비워짐. 빈 몸체 PUT이면 그대로.
    - 영상 오더 201, 워크리스트 생성.
  - 잠금·총량 시험도 다시 돌려 통과했습니다.
  - 화면(프랑스어): 「Trouver patient」에서 26-00010의 내원 3개를 차례로 골랐습니다. 취소된 내원은 409와 함께 « Cette visite a été annulée à l'accueil… » 알림이 뜨고 환자 막대가 비었습니다. 나머지 둘은 정상으로 열렸습니다.
  - ⑰: `TZ=Indian/Antananarivo`에서 현지 00:30으로 계산해 보니, 옛 식은 전날(09-29), 새 식은 당일(09-30)이 나왔습니다.
- **확인 못 한 것**: ⑰은 실제로 새벽에 발급해 보지 않았습니다(시간대를 맞춘 계산으로 확인). 병원 PC 시계가 틀리면 날짜도 틀립니다.
- **위키**: `modules/consultation.md` 머리 상태, 2.12(취소된 내원 안내), 3.2(`POST /`, `PUT /:id`, `POST /:id/orders`), 3.5(발행일), 7.2 ⑫ 일부 ✅ · ⑬ ⑰ ⑲ ✅, 8절
- **총괄 확인 요청**: 없음. 결정이 필요한 ⑩ · ⑫ 나머지 · ⑭ · ⑱ · ⑳은 결정 세션으로 넘어갔습니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 다음은 결과 있는 검사 오더 「취소」(임상병리·수납과 같은 배포)입니다.

## 2026-09-29 — 빈 입력에 500 대신 400 (진료 API)

> **총괄 확인 (2026-09-29)**: 빈 입력 400 `f52df58` 합침(`47b9574`) + 실행 중 EMR 반영. 실행 중 EMR: 빈 처방·진단·오더 POST 모두 400과 읽을 수 있는 문구, 처방 6·진단 0·오더 7건 전후 같음.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `c898cd1`
- **한 일** (설정 세션의 권한 전체 시험에서 나온 두 건 + 같은 종류 두 건):
  - `POST /consultations/:id/diagnoses`는 `diagnosis_name`, `POST /:id/prescriptions`는 `drug_name`이 비면 **400** 「… is required」를 돌려줍니다. 같은 문제가 있던 `POST /:id/orders`의 `order_name`도 같이 막았습니다.
  - 처방 용법(`route`, `VARCHAR(10)`)이 10자를 넘으면 POST·PUT 모두 400 「route (sig) must be at most 10 characters」를 돌려줍니다. 전에는 500 「value too long」이었습니다(7절 ⑮).
  - `consult.routes.js`·`document.routes.js`·`orderset.routes.js`의 오류 응답 24곳을 전부 `utils/dbError.js`의 `sendDbError`로 바꿨습니다. 제약 오류는 4xx와 읽을 수 있는 문구로 나가고, 그 밖의 오류만 예전처럼 500입니다. 예: 없는 진료 id → 400 「Referenced record does not exist」.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `document.routes.js` · `orderset.routes.js` · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음(`utils/dbError.js`는 가져다 쓰기만 함)
- **DB 마이그레이션**: 없음
- **번역 키**: 없음. 화면은 서버 문구를 「Erreur : …」 뒤에 그대로 보여 줍니다.
- **확인한 방법**: `node --check` 3개 파일 통과. 격리 스택 9182에서 다음을 확인했습니다.
  - 새 시험 13개 전부 통과:
    - 빈 진단·빈 처방·빈 오더 → 400, 11자 용법 POST·PUT → 400
    - 없는 진료에 처방·진단 → 400
    - 문서·약속처방 빈 입력은 원래대로 400
    - 정상 진단·처방 201, 용법 딱 10자 201
  - 기존 시험도 다시 돌려 모두 통과했습니다: 잠금 27개, 총량 13개, S2 권한 10개 경로 × 8계정.
- **확인 못 한 것**: 화면에서 이 오류를 일부러 내 보지는 않았습니다(화면은 정상 입력만 보냄).
- **위키**: `modules/consultation.md` 머리 상태, 3.2(필수 칸과 오류 응답), 7.2 ⑮, 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 임상병리 설계(결과 있는 검사 오더를 지우면 취소로 표시할지 묻기)가 오면 진료 몫을 하겠습니다.

## 2026-09-29 — 위키 2절(직원용 사용법)에 오늘 바뀐 것 정리 (코드 변경 없음)

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — `32896df` 다음
- **한 일**: `modules/consultation.md` 2절을 프랑스어 화면 이름 기준(괄호에 한국어)으로 정리했습니다.
  - **2.3 처방과 검사**: 오늘 조각조각 덧붙이면서 섞였던 부분(가격 없음·하루 총량 없음 항목이 한 번호 밑에 뒤섞여 있었음)을 다시 썼습니다.
    - 넣기
    - 한국식 약 칸 표(Qté = 하루 총량 · Fois · Jours · Posologie · Unité, 예 3/3/7/TID = 21)
    - 풀이 줄(« 1 cp × 3 fois/jour pendant 7 jours (total 21) »)
    - **줄에 붙는 표시 표**(하루 총량 없음 · 가격 없음 · 1회량 안 나눠짐 · 예전 계산 · 🔒)
    - 상태 칸 표
    - 결과 자동 반영
    - 지우기와 영상 보기
  - **2.6 진료 끝내기**: 사실과 달라진 것을 고쳤습니다. 검사실은 **완료 전에도** 오더를 봅니다(임상병리 `1d4c239`). 완료를 기다리는 것은 약국과 수납입니다. 완료 버튼과 대기 서랍의 「Terminé」 탭이 같은 이름이라 헷갈리지 말라는 말과, 하루 총량이 빈 약이 있으면 묻는다는 것도 넣었습니다.
  - **2.12 「이런 안내가 뜰 때 · 막힐 때」**: 화면에 뜨는 안내 9가지를 표로 정리했습니다(프랑스어 문구 / 한국어 / 언제 / 이렇게). 지우기 확인, 조제된 약, 결과 있는 오더, 하루 총량 없음 완료 확인, 감춘 약, [괄호] 발급 확인, 팝업 차단, 영상 환자 경고, 오류가 들어 있습니다. 막힐 때 표도 4줄로 늘렸습니다(가격을 넣었는데 여전히 Sans prix, 풀이가 뜻과 다를 때 등).
  - **2.1**: 환자 찾기 창 사용법은 공용이라 접수 위키 `reception.md` 2.7로 안내했습니다(총괄 의견).
- **바꾼 파일**: `wiki/modules/consultation.md` · `wiki/handoff/consultation.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 프랑스어 문구는 `fr.js`의 `cs_` 키와 오늘 격리 스택 화면에서 본 문구에서 그대로 옮겼습니다. 검사실이 완료 전에도 보는 것은 develop의 `lab.routes.js` pending 쿼리(진료 상태 조건 없음)로, 약국이 완료를 기다리는 것은 `pharmacy.routes.js`(`c.status = 'completed'`)로 확인했습니다. 표가 깨진 줄이 없는지 검사했습니다.
- **확인 못 한 것**: 현장 직원이 읽어 보지는 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2절(2.1 · 2.3 · 2.6 · 2.12), 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 처방 표 나누기(결정 대기) — 결정되면 2.3의 약 칸 표를 고칩니다.

## 2026-09-29 — 약속처방이 목록에서 감춘 약을 넣지 않게 (7.2 ㉕ 가안)

> **총괄 확인 (2026-09-29)**: 약속처방에서 감춘 약 빼기 `32896df` 합침(`d1abee8`) + 실행 중 EMR 반영. 실행 중 EMR: `/order-sets`의 약 줄 4개에 `drug_active`가 실려 옴(지금은 모두 true — 예시 약을 아직 감추지 않음).

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — `4e9a2d5`(develop `c5f725d`에 합쳐짐) 다음
- **한 일** (총괄 지시 (가), 결정 없이):
  - `orderset.routes.js` `attachItems`가 약 줄마다 `drug_active`(= `drug.is_active`)를 같이 돌려줍니다.
  - 진료 화면 `applySet`은 `drug_active === false`인 약 줄을 넣지 않고, 끝에 한 번 「목록에서 감춘 약이라 넣지 않았습니다: 약 이름…」을 알립니다. 검사·처치 줄은 그대로 넣습니다.
  - 약속처방 탭의 세트 카드에서 감춘 약 코드를 흐리게 줄 긋고, 마우스를 올리면 「목록에서 감춘 약 — 이 세트를 적용해도 넣지 않습니다」가 나옵니다.
- **바꾼 파일**: `backend/src/routes/orderset.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 키 2개만 추가
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_setSkippedHidden` · `cs_setHiddenDrug` (ko · en · fr)
- **확인한 방법**: `node --check` 통과, `npm run build` 통과. 격리 스택 9182, 시험 DB에서 ACT01·PCM500을 감추고 새 내원(26-00007)에서 확인했습니다.
  - 한국어: 「Malaria Workup」 카드에 ACT01·PCM500 줄 그음과 도움말이 보였습니다. 적용하자 L04·L01만 들어갔고, 알림은 「…넣지 않았습니다: Artemether-Lumefantrine Tab, Paracetamol 500mg Tab」이었습니다.
  - 프랑스어: 알림 « Non ajouté(s) - retiré(s) de la liste des médicaments : … »와 도움말을 확인했습니다.
  - 되돌림 확인: PCM500을 다시 보이게 하니 카드에서 줄 그음이 ACT01만 남았고, 적용하면 PCM500은 들어가고 ACT01만 빠졌습니다.
- **확인 못 한 것**: 영어 화면은 보지 않았습니다. 이미 없어진 약(drug 행 없음)은 `drug_active`가 NULL이라 빼지 않고 예전처럼 넣으려 합니다(외래키 때문에 오류). 이런 경우는 지금 없습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2.4(감춘 약), 3.1(`applySet`), 3.3(`attachItems`), 7.2 ㉕ ✅(가), 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: (나) 설정에서 약을 감출 때 「이 약을 쓰는 약속처방 N개」 알림은 설정 세션 몫입니다(총괄이 전달).
- **남은 일 · 알려진 문제**: (다) 실제 약을 가져온 뒤 세트를 다시 잇는 것은 실장님 검토 뒤에 합니다. 다음은 위키 2절에 오늘 바뀐 것을 반영하는 일입니다(총괄 지시).

## 2026-09-29 — 인쇄 문서의 빈 주소·전화 줄 숨김

> **총괄 확인 (2026-09-29)**: 빈 주소·전화 줄 숨김 `4e9a2d5` 합침(`c5f725d`) + 실행 중 EMR 반영. 공용 `shared.jsx` 변경 확인 — 값이 있으면 예전과 같음. 총괄 렌더 도구로 다시 찍음: 수술기록지 12종·프랑스어·빽빽한 경우 높이가 합치기 전과 같음(프랑스어 최대 990, 한국어 충수 1008).

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `b16e372`
- **한 일**: 실장님 결정으로 접수가 주소를 받지 않으므로, 문서의 환자 칸 「주소」 줄이 늘 비어 있었습니다. 공용 `PatientBox`가 **값이 없는 주소·전화 줄을 줄째 빼도록** 바꿨습니다(총괄 의견대로). 값이 있으면 예전처럼 인쇄합니다. 수술기록지는 원래 `minimal`이라 주소·전화가 없고, 바뀌는 것이 없습니다.
- **바꾼 파일**: `wiki/modules/consultation.md`
- **공용 파일 변경**: **`frontend/src/documents/shared.jsx`의 `PatientBox`** — 주소는 `address`, 전화는 `mobile || phone`, 앞뒤 공백을 뺀 값이 비면 그 줄을 뺍니다. 영향받는 문서는 **의뢰서(진료), 수술 동의서(진료), 원외처방전(약국 `external-rx.jsx`)**입니다. 이미 발급한 문서도 다시 인쇄하면 같은 규칙을 따릅니다(문서는 저장값으로 다시 그림).
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: `npm run build` 통과. 인쇄 폭(688px) 렌더를 이 변경 전(HEAD)과 비교했습니다.
  - **기존 렌더 페이지 7개가 출력 HTML까지 바이트 동일합니다.** 12개 수술기록지와 동의서 ko·fr, 빽빽한 경우, 경계 사례, 치루 유형 여러 개가 모두 포함되며, 시험 환자는 주소·전화가 있는 환자입니다.
  - 새로 넣은 「주소 없는 환자」 페이지(프랑스어):
    - 동의서: 주소·전화 있음 696px(그대로) → 주소 없음 669px(주소 줄 빠짐) → 둘 다 없음 643px
    - 의뢰서: 719px → 주소 없음 693px
    - 치루 수술기록지: 869px로 변화 없음
  - 원외처방전 렌더는 하지 않았습니다(약국 파일). 같은 부품이라 같은 결과로 봅니다.
- **확인 못 한 것**: 원외처방전을 실제로 인쇄해 보지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 3.5(`PatientBox`), 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: **약국** — 원외처방전의 환자 칸이 주소가 없으면 한 줄 짧아집니다. 알고만 계시면 됩니다.
- **남은 일 · 알려진 문제**: 다음은 약속처방의 감춘 약(7.2 ㉕ 가안, 총괄 지시)입니다.

## 2026-09-29 — 하루 총량이 빈 처방 표시 + 감춘 예시 약과 약속처방 확인

- **상태**: 확인 요청(표시) · **보류**(감춘 약 + 약속처방 — 대안 중 선택 필요)
- **커밋**: session/consultation (이 항목과 같은 커밋) — `6b315c9`(develop에 합쳐짐) 다음
- **한 일**:
  - 하루 총량(또는 일수)이 비었거나 0인 처방 줄에 빨간 「하루 총량을 넣으세요 / Indiquez la dose par jour / Enter the daily dose」(도움말: 총량 0 → 0개 조제·0원 청구)를 붙였습니다. 「처방」 제목 옆에는 「⚠ 하루 총량 없는 약 N개」가 나옵니다.
  - **진료 완료를 누를 때** 그런 줄이 있으면 약 이름을 나열해 한 번 묻습니다. 막지는 않고, 취소하면 완료하지 않습니다. 서버는 그대로입니다.
  - 확인만 한 것 ① **감춘 예시 약 + 약속처방**: 약 검색은 감춘 약을 보여 주지 않습니다. 그런데 약속처방은 세트에 복사된 약 id로 **그대로 처방합니다**. 단가는 약품 표의 예시 단가가 붙고, 표시도 없습니다. 격리 스택에서 ACT01·PCM500을 감추고 「Malaria Workup」을 적용해 보니 두 약이 총 12·15로 들어갔습니다. 대안은 아래 「총괄 확인 요청」에 적었습니다.
  - 확인만 한 것 ② **내원구분 축소(초진·재진·진료비 없음)**: 진료 화면·진료 서버·문서 양식 어디에도 내원구분(`visit_type`)을 보여 주거나 쓰는 곳이 없습니다(grep). 영향 없습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 키 4개만 추가
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_noDose` · `cs_noDoseCount` · `cs_noDoseHint` · `cs_noDoseConfirm` (ko · en · fr)
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182에서 시험 DB의 ZINC 기본 용량을 비우고(가져올 실제 약처럼), 새 내원(26-00006)에서 확인했습니다.
  - 한국어: 검색으로 넣은 ZINC에 「하루 총량을 넣으세요」, 제목 옆 「⚠ 하루 총량 없는 약 1개」
  - 프랑스어: 「Indiquez la dose par jour」. 초록 **Terminé 버튼을 실제로 클릭**하니 « 1 médicament(s) sans dose par jour : Zinc 20mg Tab … Terminer quand même ? »가 떴고, 취소하니 진료가 그대로 열려 있었습니다.
  - 하루 총량 칸을 실제로 클릭해 「1」을 치고 나오니 바로 저장되었습니다(총 10). 표시와 개수가 사라졌고, 다시 Terminé를 누르니 묻지 않고 완료되었습니다.
  - 처음에는 스크립트로 `.blur()`를 불러 저장을 흉내 냈는데, 숨긴 브라우저 창에서는 React의 저장이 일어나지 않았습니다(서버에 PUT 없음). 앱 문제가 아니라 시험 방식 문제여서 실제 클릭·입력으로 다시 확인했습니다.
- **확인 못 한 것**: 영어 화면은 보지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2.3(하루 총량 표시·완료 확인), 3.1(`noDose`), 7.2 ㉕(감춘 약 + 약속처방), 8절
- **총괄 확인 요청 — 감춘 약 + 약속처방(7.2 ㉕), 대안 중 선택**:
  - (가) **진료 쪽 작은 수정(추천)**: `attachItems`가 약의 `is_active`를 같이 돌려주게 합니다. 약속처방을 적용할 때 감춘 약 줄은 넣지 않고 「목록에서 감춘 약이라 넣지 않음: …」이라고 알립니다. 약속처방 탭에서도 그 줄을 흐리게 보입니다.
  - (나) 설정에서 약을 감출 때 「이 약을 쓰는 약속처방 N개」를 알립니다(설정 세션).
  - (다) 실제 약을 가져온 뒤 예시 세트(Malaria Workup, Diarrhea / GE)를 새 약으로 다시 만듭니다(설정 화면에서 사람이 함).
  - 추천은 (가) + (다)입니다. 결정 없이 해도 된다면 (가)는 바로 하겠습니다.
- **다른 세션에 부탁**: (나)로 가면 설정 세션.
- **남은 일 · 알려진 문제**: 위 선택.

## 2026-09-29 — S2: 서버 권한을 화면 권한대로 (진료 세션 파일)

> **총괄 확인 (2026-09-29)**: S2 `6b315c9` 합침(`59e78ed`) + 실행 중 EMR 반영. 실행 중 EMR에서 역할별(관리자·의사·접수·약국·검사) × 22개 라우트를 읽기만으로 확인 — 진료 파일 쪽은 표와 일치.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `1062730`
- **한 일** (실장님 결정 S2, 권한표 `wiki/handoff/settings.md` 「S2」 그대로):
  - `consult.routes.js`: 처방·오더 읽기(`GET /visit/:visitId/prescriptions`, `GET /:id/prescriptions`, `GET /:id/orders`)는 `canReadRx` = consultation·payment·pharmacy, `GET /:id/diagnoses`는 consultation. 쓰기는 이미 consultation.
  - `document.routes.js`: 읽기(`GET /patient/:id`, `GET /:id`)는 consultation·payment·pharmacy·lab·registration, 발급·취소(`POST /`, `POST /:id/void`)는 consultation·payment·pharmacy.
  - `orderset.routes.js`: 읽기(`GET /`, `GET /:id`)는 consultation·settings. 쓰기는 이미 settings.
  - **grep 재확인**: 임상병리(`Lab.jsx:261`)·접수(`Registration.jsx:509`)는 문서 창을 `readOnly`·`context={{}}`로 열어서, `/consultations/visit/…/prescriptions`를 부르지 않고 `/documents/patient/…`만 부릅니다. 그래서 표에 빠진 권한은 없었습니다.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `document.routes.js` · `orderset.routes.js` · `wiki/modules/consultation.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: `node --check` 3개 파일 통과. 격리 스택 9182에서 확인했습니다.
  - 권한별 시험 계정 8개(의사=consultation, 수납=payment, 접수=registration, 약국=pharmacy, 검사=lab, **간호사 role nurse = registration·pharmacy·lab**, 통계만, 설정만)로 10개 라우트를 모두 불러 봤고, 표와 전부 일치했습니다(통과해야 할 계정은 200·404, 나머지는 403). 시험 스크립트는 진료 scratchpad의 `s2-test.mjs`입니다.
  - **간호사 계정으로 화면을 직접 눌러 봄**: 약국 화면에서 환자 선택, 원외처방전 창(방문 처방·문서 이력 읽기), 차트뷰어가 열리고 네트워크에 403이 없었습니다. 임상병리 화면에서 환자 선택 후 「Dossier (vue)」가 열리고 `/documents/patient/5`가 200이었습니다.
- **확인 못 한 것**: 수납·약국 화면의 `PatientChart` 과거 내원 펼치기(`/consultations/:id/prescriptions`)는 화면으로 누르지 않았습니다. API로는 수납·약국·간호사 계정 모두 200인 것을 확인했습니다.
- **위키**: `modules/consultation.md` 머리 상태, 3.2·3.3·3.4(권한), 4절 API 표 권한 칸, 7.2 ⑪, 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 다음은 총괄 부탁 「하루 총량이 빈 처방 표시」와 「감춘 예시 약이 약속처방으로 처방될 때」 확인입니다.

## 2026-09-29 — 약 표기를 공용 rx-dosing.js로 + 검사·영상 진행 상태 자동 반영

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `2bc7c74`
- **한 일**:
  - ① 진료 화면 풀이 줄(`rxLine`)과 의뢰서 「현재 투약」 글(`registry.js` `meds`)이 약국 세션의 `documents/rx-dosing.js`(`doseSentence`·`perDose`·`fmtAmount`·`isLegacyTotal`)를 씁니다. 이제 진료 화면·약국·원외처방전·의뢰서·환자 차트가 같은 문장입니다. 예: 「1회 1정 × 하루 3회, 7일 (총 21)」, « 1 cp × 3 fois/jour pendant 7 jours (total 21) ».
    - 진료 쪽 자체 계산(`rxBreakdown`·`fmtNum`·`MED_FMT`)과 키 `cs_rxBreakdown`·`cs_rxUneven`은 지웠습니다.
    - **`cs_rxStoredTotal`은 수납 `PatientChart.jsx`가 쓰므로 남겼습니다**(총괄 알림대로). 한때 작업본에서 지웠다가, 알림을 받고 되살린 뒤 커밋했습니다.
  - ② 임상병리 부탁: 진료가 열려 있고 결과 없는 검사나 끝나지 않은 워크리스트 오더가 있으면 **30초마다** 오더를 다시 읽습니다. 진행 칸(`status`·`result_*`·`worklist_status`·`worklist_sent_at`)만 화면 줄에 덮어써서, 상태 칸과 🔒가 새로고침 없이 바뀝니다. 적고 있던 수량·메모는 건드리지 않고, 탭이 숨겨져 있으면 읽지 않습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**:
  - `frontend/src/documents/registry.js` — `meds`를 `doseSentence`로 바꾸고, 예전 계산 줄에 `(예전 계산 / old calculation / ancien calcul)`을 붙임
  - `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 표시 안에서 `cs_rxUnevenFlag`·`cs_rxLegacy`를 추가하고 `cs_rxBreakdown`·`cs_rxUneven`을 삭제. 다른 파일에서 이 두 키를 쓰는 곳이 없는 것을 grep으로 확인했습니다.
  - `rx-dosing.js`(약국 파일)는 고치지 않았습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: 추가 `cs_rxUnevenFlag` · `cs_rxLegacy`, 삭제 `cs_rxBreakdown` · `cs_rxUneven` (ko · en · fr)
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182(develop `2bc7c74` + 이 변경)에 시험 환자 26-00005를 만들어 확인했습니다.
  - 처방 줄(ko): PCM500 3/3/7 「1회 1정 × 하루 3회, 7일 (총 21)」, ORS 1/3/3 「⚠ 1회량이 나눠지지 않음 — 하루 1포, 3회로 나눠 3일 (총 3)」, AMOX500 1.5/3/5 「1회 ½캡슐 × 하루 3회, 5일 (총 7½)」, 옛 식 BRUFEN(총 63, DB에 직접 넣음) 「… (총 63) · 예전 계산으로 저장된 총량 (새 식이면 21)」
  - 처방 줄(fr): 같은 줄이 « 1 cp × 3 fois/jour… », « ⚠ dose par prise non divisible — 1 sachet par jour en 3 prises… », « ½ gél. … », « total enregistré selon l'ancien calcul (nouveau calcul : 21) »
  - 의뢰서(fr): 같은 문장이고, BRUFEN 끝에 « (ancien calcul) »
  - 자동 반영:
    - 결과 없는 검사 L01이 있는 상태에서 처치 줄 메모에 글자를 적어 둔 채(포커스 유지) API로 L01 결과를 넣었습니다. 28초 만에 L01이 「Résultat reçu」 + 🔒로 바뀌었고, 메모 글자와 포커스는 그대로였습니다.
    - 처음 시험에서는 브라우저 창이 숨김 상태(`document.hidden`)라 설계대로 읽지 않았습니다. 두 번째 시험은 `document.hidden`을 시험용으로 false로 바꿔 끼워서 했습니다.
- **확인 못 한 것**: 영상 워크리스트 상태가 바뀌는 경우는 같은 코드 경로라 따로 시험하지 않았습니다. 영어 화면도 보지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2.3(풀이 문장, ⚠, 예전 계산, 결과 자동 반영), 3.1(`rx-dosing.js`, 자동 반영), 3.5(`registry.js`), 8절
- **총괄 확인 요청**: 30초마다 읽는 것은 진료가 열려 있고 기다리는 오더가 있을 때만입니다(한 환자 화면에 1회/30초). 서버 부담은 작다고 봅니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 처방 표 나누기는 결정 대기입니다.

## 2026-09-29 — 가격이 0인 약·오더를 처방할 때 표시

> **총괄 확인 (2026-09-29)**: 계산식 `7d16518`·표 `0192506`·가격 없음 표시 `f9924b7` 합침(`9f744dd`) + 실행 중 EMR 반영(실장님 결정 「지금 올리기」, 반영 전 DB 백업). 실행 중 EMR에서 확인: 옛 처방(BRUFEN 3/3/7, 총 63)을 같은 값으로 PUT → 총량 63 그대로, 수납 대기 0 그대로(환불 안 뜸) · 새 처방 3/3/7(화면이 999를 보내도) → 21 · 1.5/3/7 → 10.5 · 시험 줄을 지운 뒤 처방 6건의 지문이 반영 전과 같음. 화면은 세션의 격리 스택 확인. 말라리아약·ORS 기본값은 `wiki/02-before-departure.md`에 출발 전 확인 항목으로.

- **상태**: 확인 요청. 이 브랜치에는 합치기 대기 중인 `7d16518`(약 총량 계산식)이 먼저 들어 있습니다. **이 커밋만 따로 cherry-pick하면 충돌합니다.** `git merge-tree`로 develop 위에 흉내 내 보니 i18n 3개, `Consultation.jsx`, 위키 2개에서 충돌했습니다. `7d16518`이 바꾼 줄 바로 옆을 고쳤기 때문입니다. 그래서 **`7d16518`과 함께 합쳐야** 합니다. 가격 표시만 먼저 올려야 하면 말씀해 주세요. develop 기준으로 따로 만들어 드리겠습니다.
- **커밋**: session/consultation (이 항목과 같은 커밋) — `0192506` 다음
- **한 일**: 실장님이 실제 약 105줄을 가격 없이 가져오기로 하셔서, 가져온 직후에는 모든 약이 0원입니다. 진료 화면에 다음 표시를 넣었습니다(막지 않음, 3개 국어).
  - 가격 0인 처방·오더 줄의 이름 옆에 노란 「가격 없음 / Sans prix / No price」
  - 「처방」 제목 옆에 「⚠ 가격 없는 항목 N개」
  - 약·검사 검색 목록에도 같은 표시
  - 도움말: **수납은 줄에 저장된 가격을 쓰므로, 설정에서 가격을 넣어도 이미 넣은 줄은 0원 그대로**입니다. 가격을 넣은 뒤 그 줄을 지우고 다시 넣으라고 안내합니다.
  - 약국이 원외로 돌린 줄(청구 안 됨)은 표시하지 않습니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 키 3개만 추가
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_noPrice` · `cs_noPriceCount` · `cs_noPriceHint` (ko · en · fr)
- **확인한 방법**: `npm run build` 통과. 격리 스택 9182에서 시험 DB의 ZINC 약값과 P01(처치) 가격을 0으로 바꾸고 확인했습니다.
  - 한국어: 검색 목록 「Zinc 20mg Tab 가격 없음」. ZINC·P01·PCM500을 넣으니 ZINC·P01 줄에만 표시가 붙고, 제목 옆 「⚠ 가격 없는 항목 2개」.
  - 도움말 확인: ZINC 가격을 100으로 넣은 뒤 다시 열어도 그 줄은 여전히 「Sans prix」였고(청구 가격이 줄에 복사돼 있어서), 지우고 다시 넣자 표시가 사라지고 「⚠ 1 sans prix」.
  - 프랑스어 도움말 문구 확인.
- **확인 못 한 것**: 영어 화면. 원외(`external`) 줄 제외는 코드만 확인.
- **위키**: `modules/consultation.md` 머리 상태, 2.3(가격 없음 표시), 3.1(`noPrice`·`NoPriceBadge`), 7.3(청구 가격은 줄에 복사된다), 8절
- **총괄 확인 요청**: 가격을 넣은 뒤 **이미 처방한 0원 줄**은 지우고 다시 넣어야 합니다. 가져오기 직후 며칠 동안 이런 줄이 많이 생긴다면, 「0원 줄의 가격을 지금 가격으로 다시 불러오기」 같은 기능이 필요할 수 있습니다. 진료 쪽 작업이며, 요청하시면 하겠습니다. 수납 화면에도 비슷한 표시가 있으면 좋겠습니다.
- **다른 세션에 부탁**: **수납** — 청구 목록에서 0원 약·오더 줄을 눈에 띄게 하면, 진료에서 놓친 것을 마지막에 잡을 수 있습니다.
- **남은 일 · 알려진 문제**: 위 「다시 불러오기」는 요청이 있을 때 합니다.

## 2026-09-29 — 의사 확인용 자료: 시드 약 25개와 약속처방을 새 식으로 계산한 표 (코드 변경 없음)

- **상태**: 확인 요청 (자료) — 결정 세션이 원장님 질문지에 붙일 표입니다
- **커밋**: session/consultation (이 항목과 같은 커밋). `7d16518`(합치기 대기) 위에 develop을 merge(`c6cba1b`)한 다음입니다. `7d16518`의 해시를 바꾸지 않으려고 rebase 대신 merge를 썼습니다.
- **어디서 온 숫자인가**:
  - 약 기본값은 시드 `backend/sql/003_seed_data.sql` 3~27행, 약속처방은 `004_order_sets.sql` 44~63행입니다. 계산은 스크립트로 했습니다.
  - **실행 중인 EMR에서 설정 화면으로 기본값을 고쳤다면 숫자가 다를 수 있습니다.** 총괄이 읽기 전용 조회 한 줄로 대조해 주세요(`SELECT code, default_dose, default_freq, default_days, unit_price FROM drug ORDER BY code`, 약속처방은 `order_set_item`).
- **읽는 법**:
  - 칸은 `하루 총량 / 횟수 / 일수`입니다.
  - 1회량 = 하루 총량 ÷ 횟수
  - 지금 식 = 하루 총량 × 횟수 × 일수 (실행 중인 EMR)
  - 새 식 = 하루 총량 × 일수 (`7d16518`, 합치기 대기)
  - 금액 = 단가 × 총량이고, 단가는 약품 표의 값입니다(화폐 단위는 확인 필요).
- **「확인 필요」는 의학적 판단이 아니라, 새 식으로 바꿀 때 값이 달라지거나 뜻이 애매해지는 줄을 표시한 것입니다.** 흔한 성인 용법을 적은 곳은 참고일 뿐이고, 판단은 원장님이 하십니다.

### 가. 1회량이 1이 아니거나 나눠떨어지지 않는 약 — **원장님 확인 필요**

| 약 | 기본값 | 1회량 | 지금 식 총량 | 새 식 총량 | 확인할 것 |
|---|---|---|---|---|---|
| **ACT01** Artemether-Lumefantrine Tab | 4 / 2 / 3 · BID | **2정** | 24 | **12** | 「하루 4정을 2번에 나눠(1회 2정) 3일 = 12정」이 의도인가? 아니면 「1회 4정 × 하루 2번 × 3일 = 24정」인가? 흔히 쓰는 성인 용량은 1회 4정 × 하루 2번 × 3일(24정)입니다(참고). 후자면 기본값을 **8 / 2 / 3**으로 고쳐야 합니다. **새 식을 이대로 올리면 절반만 나갑니다.** |
| **ORS** ORS Sachet | 1 / 3 / 3 · PO | **0.33포** ⚠ | 9 | **3** | 「1포를 하루 3번에 나눠」는 어색합니다. 「1회 1포 × 하루 3번」이 의도라면 **3 / 3 / 3**(총 9포)이어야 합니다. |
| **PRED5** Prednisolone 5mg Tab | 3 / 1 / 5 · QD | **3정** | 15 | 15 | 하루 1번이라 두 식이 같습니다(1회 3정 = 15mg). 1회 3정이 의도인지만 확인하면 됩니다. |
| **SALB** Salbutamol Inhaler 100mcg | 2 / 3 / 30 · INH | 0.67 ⚠ | **180개** | **60개** | 흡입기는 「개」로 팝니다. 두 식 모두 흡입기 수가 아니라 흡입 횟수를 셉니다(아래 다). 「1회 2번 흡입 × 하루 3번」으로 쓴 것으로 보입니다. |

### 나. 병·개 단위로 파는 약 — 어느 식으로도 맞지 않음 (**원장님·약국 결정 필요**)

| 약 | 기본값 | 단가 | 지금 식 총량(금액) | 새 식 총량(금액) | 문제 |
|---|---|---|---|---|---|
| PCM250 Paracetamol 250mg **Syrup** | 3 / 3 / 5 | 3,500 | 45병 (157,500) | 15병 (52,500) | 용량이 mL·스푼이면 병 수로 바꿀 수 없습니다. 보통 1~2병 |
| AMOX250 Amoxicillin 250mg **Syrup** | 3 / 3 / 7 | 6,500 | 63병 (409,500) | 21병 (136,500) | 같음 |
| CODAEP **Syrup** 20mL | 3 / 3 / 7 | 4,500 | 63병 (283,500) | 21병 (94,500) | 같음 |
| SALB **Inhaler** | 2 / 3 / 30 | 8,000 | 180개 (1,440,000) | 60개 (480,000) | 보통 1개 |

→ 약국 인계 노트의 제안(약마다 「낱개 / 포장 단위」, 포장 단위는 의사가 병·개 수를 직접 적음)과 같은 문제입니다. 결정 전까지 이 약들은 **총량 칸을 사람이 확인**해야 합니다.

### 다. 1회 1정(캡슐)으로 읽히는 약 — 새 식이면 총량이 1/횟수로 줄어듦 (**「1회 1정」이 맞는지 한 번에 확인**)

| 약 | 기본값 | 1회량 | 지금 식 | 새 식 | 금액 지금 → 새 식 |
|---|---|---|---|---|---|
| PCM500 Paracetamol 500mg | 3 / 3 / 5 · TID | 1 | 45 | 15 | 3,600 → 1,200 |
| BRUFEN Ibuprofen 200mg | 3 / 3 / 7 · TID | 1 | 63 | 21 | 9,450 → 3,150 |
| BRUFEN4 Ibuprofen 400mg | 3 / 3 / 5 · TID | 1 | 45 | 15 | 11,250 → 3,750 |
| DICLO Diclofenac 50mg | 2 / 2 / 5 · BID | 1 | 20 | 10 | 3,600 → 1,800 |
| AMOX500 Amoxicillin 500mg | 3 / 3 / 7 · TID | 1 | 63 | 21 | 12,600 → 4,200 |
| METRO Metronidazole 400mg | 3 / 3 / 5 · TID | 1 | 45 | 15 | 8,100 → 2,700 |
| METF500 Metformin 500mg | 2 / 2 / 30 · BID | 1 | 120 | 60 | 10,800 → 5,400 |
| METF850 Metformin 850mg | 2 / 2 / 30 · BID | 1 | 120 | 60 | 15,600 → 7,800 |
| RECOMID Ranitidine 150mg | 3 / 3 / 7 · TID | 1 | 63 | 21 | 12,600 → 4,200 |
| CHLOR Chlorpheniramine 4mg | 3 / 3 / 5 · TID | 1 | 45 | 15 | 2,700 → 900 |

→ 이 10개는 한국식으로 읽으면 기본값 그대로 「1회 1정」이고, 새 식의 총량이 맞습니다. 원장님께는 **「이 10개가 1회 1정이 맞는가」** 한 질문이면 됩니다. 지금 실행 중인 EMR은 이 약들을 3배(TID)·2배(BID)로 청구·차감하고 있습니다.

### 라. 두 식이 같은 약 (횟수 1) — 확인 불필요

CEFT Ceftriaxone 1g Inj (1/1/1), AMLO5 (1/1/30), AMLO10 (1/1/30), OMEP20 (1/1/14), LORAT (1/1/7), ZINC (1/1/10), IRON (1/1/30), FOLIC (1/1/30). PRED5도 여기에 속하지만 1회 3정이라 가에 넣었습니다. CEFT의 「1일」은 식과 관계없는 별개 문제라 여기서는 다루지 않습니다.

### 마. 약속처방(오더 세트) 시드

| 세트 | 약 줄 (하루 총량 / 횟수 / 일수) | 지금 식 | 새 식 | 확인할 것 |
|---|---|---|---|---|
| **Malaria Workup** (Infection) | **ACT01 4 / 2 / 3** · PCM500 3 / 3 / 5 (+ 검사 L04 RDT, L01 CBC) | ACT01 24 · PCM500 45 | **ACT01 12** · PCM500 15 | 가의 ACT01과 같음 |
| **Diarrhea / GE** (GI) | **ORS 1 / 3 / 3** · METRO 3 / 3 / 5 (+ L06 Urinalysis) | ORS 9 · METRO 45 | **ORS 3** · METRO 15 | 가의 ORS와 같음 |
| Basic Labs (Blood Tests) | 약 없음 | — | — | — |

**중요 — 약속처방은 약 기본값의 「복사본」입니다.** 세트를 만들 때 기본값을 `order_set_item`에 복사해 두기 때문에(`004_order_sets.sql` 49·50·60·61행, 설정 화면도 같음 — `Settings.jsx` 203행), **약품 기본값을 고쳐도 세트 안의 값은 그대로**입니다. ACT01·ORS를 고치기로 하면 **약품 기본값과 세트(Malaria Workup, Diarrhea / GE)를 둘 다** 고쳐야 합니다. 설정 화면 또는 마이그레이션(2xx)으로 할 수 있습니다.

### 결정 세션 질문지에 넣을 질문 (추천 문구)

1. **ACT01(말라리아약)** — 기본값 「4 / 2 / 3」은 「1회 2정 × 하루 2번 × 3일 = 12정」입니까, 「1회 4정 × 하루 2번 × 3일 = 24정」입니까? 후자면 기본값과 「Malaria Workup」 세트를 「8 / 2 / 3」으로 고칩니다.
2. **ORS** — 「1 / 3 / 3」은 하루 1포입니까, 1회 1포씩 하루 3번(하루 3포)입니까? 후자면 「3 / 3 / 3」으로 고치고 「Diarrhea / GE」 세트도 같이 고칩니다.
3. **PRED5** — 1회 3정(15mg) 하루 1번이 맞습니까?
4. **다 표의 10개** — 모두 「1회 1정」이 맞습니까?
5. **시럽 3종·흡입기** — 총량(병·개 수)을 의사가 직접 적게 할까요?(약국 제안과 같은 질문)

- **바꾼 파일**: `wiki/handoff/consultation.md` · `wiki/modules/consultation.md`(7.2 ㉔ 줄에 이 표로 가는 안내 한 마디)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 시드 SQL을 스크립트로 읽어 계산했습니다(1회량, 두 식 총량, 금액, 0.5 단위 여부, 병·개 단위 이름).
- **확인 못 한 것**: 실행 중 DB의 실제 기본값(설정에서 고쳤을 수 있음). 흔한 성인 용법은 참고로만 적었습니다.
- **다른 세션에 부탁**: 없음 — 결정 세션은 총괄 경유
- **남은 일 · 알려진 문제**: `7d16518`은 ACT01 답과 약국 순서를 기다리며 합치기 대기 중입니다.

## 2026-09-29 — ㉔ 약 총량 = 하루 총량 × 일수 (실장님 결정 구현)

- **상태**: 확인 요청 — 합치는 순서는 총괄 지시대로 **수납·약국의 「total_qty만 읽기」 다음, 이것이 마지막**
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `58e62f2`
- **한 일** (총괄 전달 1~7 그대로):
  1. `consult.routes.js`에 `rxTotal(dose, days)` 한 곳을 두었습니다(하루 총량 × 일수, 소수 셋째 자리). `POST`·`PUT` 모두 서버가 계산하고, 화면이 보낸 `total_qty`는 무시합니다.
  2. `PUT`은 `dose`·`frequency`·`days`가 바뀐 경우에만 `total_qty`를 다시 계산합니다. `dose`는 숫자로 비교해서 `"3"`과 `"3.000"`을 같게 봅니다. 화면도 값이 그대로면 저장 요청을 보내지 않습니다(`savedRx`). 그래서 옛 진료를 열어 칸을 스치기만 해서는 총량이 바뀌지 않습니다.
  3. 횟수는 그대로 저장하고, 1회량 풀이에만 씁니다.
  4. 약 이름 아래에 풀이 줄을 보입니다: 「1회 1 × 3회 × 7일 = 총 21」 / « 1 par prise × 3/j × 7 j = total 21 ». 1회량이 0.5 단위로 떨어지지 않으면 노란 ⚠를 보이고 막지는 않습니다(약국과 같은 규칙). 옛 식으로 저장된 줄에는 「저장된 총량 45 (예전 계산)」을 붙입니다.
  5. 표 모양은 그대로 두었습니다. 하루 총량 칸에 도움말(`title`)을 달고, 「Usage」 머리는 「용법 / Sig. / Posologie」로 바꿨습니다.
  6. 조제된 처방 잠금은 그대로입니다. 이미 저장된 `total_qty`도 고치지 않았습니다.
  - 덧붙여 조사 때 적은 두 가지도 했습니다.
    - 의뢰서 「현재 투약」 자동 글: `3.000 x3 x7d`를 새 뜻으로 바꿨습니다. 예: 「하루 3 (1회 1 × 3회) × 7일」 / « 3/j (1 × 3) × 7 j ». 과거 보기의 `dose×freq×days d` 표기도 풀이로 바꿨습니다.
    - 기본 용법이 없는 약에 `'TID'`를 넣던 것을 없앴습니다(7절 ⑮).
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**:
  - `frontend/src/documents/registry.js` — `autofillValue(src, ctx, lang)`에 세 번째 인자를 추가하고, `'meds'` 글을 하루 총량 기준·언어별로 씁니다. 인자가 없으면 영어 형식입니다.
  - `frontend/src/components/DocumentModal.jsx` — `buildValues`가 문서 언어를 넘깁니다. 처음 열 때는 화면 언어를 씁니다.
  - `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — `cs_` 키 5개만 추가했습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_colSig` · `cs_doseHint` · `cs_rxBreakdown` · `cs_rxUneven` · `cs_rxStoredTotal` (ko · en · fr)
- **확인한 방법**:
  - `npm run build` 통과, `node --check consult.routes.js` 통과.
  - 격리 스택 9182 API 시험 13개 항목 전부 통과:
    - POST 3/3/5에 `total_qty: 999`를 보냄 → 15
    - 일수 7 → 21, 횟수 3→2 → 21 그대로, 하루 1.5 × 7 → 10.5
    - **옛 식 줄(3/3/5, 총량 45를 시험 DB에 직접 넣음)을 값 그대로 PUT → 45 유지**, `"3"`과 메모만 바꿔도 45 유지, 일수 5→6 → 18
    - 완료 후 약국 대기 목록 10.5·18, 수납 항목 10.5·18
    - 조제 후 재고 −29(10.5 올림 11 + 18)
    - 조제된 줄 PUT 409
  - 화면(한국어):
    - 옛 줄: 「1회 1 × 3회 × 5일 = 총 15 · 저장된 총량 45 (예전 계산)」
    - 옛 줄의 칸 5개를 실제로 클릭해 드나듦 → 네트워크에 PUT 없음, DB 45 그대로
    - 하루 총량 3→2 → 「⚠ 1회량이 나눠지지 않음 … 총 10」, 예전 계산 표시 사라짐
    - 머리 「용법」, 도움말 확인
  - 약속처방 Diarrhea / GE 적용 → METRO 「1 × 3 × 5 = 15」, ORS 1/3/3 → ⚠ 총 3(기본값은 의사 확인 대기라 그대로)
  - 프랑스어: 머리 「Posologie」, « 1 par prise × 3/j × 5 j = total 15 », « ⚠ Dose par prise non divisible … »
  - 의뢰서 투약 글(fr·ko) 확인
- **확인 못 한 것**: 실제로 수납이 끝난 내원을 연 경우(수납 목록에 환불이 안 뜨는지)는 화면으로는 못 봤습니다. 대신 `total_qty`가 바뀌지 않는 것을 API·DB로 확인했고, 수납은 이 값만 읽습니다. 영어 화면은 따로 누르지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2.3(한국식 입력·풀이·⚠·옛 줄), 3.1·3.2(`rxTotal`, 바뀐 줄만, `savedRx`), 4절 API 표, 7.2 ㉔ ✅·⑮ 일부 ✅, 8절
- **총괄 확인 요청**:
  - 합치는 순서: 수납·약국의 대신 계산(`dose × freq × days` fallback) 정리가 먼저 들어가야 합니다. 진료는 항상 `total_qty`를 채우므로, 순서가 바뀌어도 실제로 값이 비는 일은 없습니다.
  - ACT01·ORS 기본값, 병 단위 약(시럽·흡입기)은 의사 확인 대기로 손대지 않았습니다. 지금 ORS는 기본값대로 넣으면 ⚠와 함께 총 3이 됩니다.
- **다른 세션에 부탁**:
  - **약국** — 원외처방전의 1회량 표기도 같은 규칙(하루 총량 ÷ 횟수, 0.5 단위, 안 되면 ⚠)이면 진료 화면과 맞습니다.
  - **수납** — `PatientChart.jsx`의 `dose×frequency×days d` 표시가 이제 뜻이 틀립니다.
- **남은 일 · 알려진 문제**: 약/검사 표 나누기((a)안) 실장님 확인 대기, 약품 단위 칸 없음(풀이에 「정」 등 단위를 못 씀).

## 2026-09-29 — 조사: 약 총량 계산식을 「하루 총량 × 일수」로 바꾼다면 (코드 변경 없음)

- **상태**: 보류 — 실장님·의사 결정(약국 C) 대기. 이 커밋은 인계 노트와 위키 7.2 ㉔ 한 줄만 바꿉니다.
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `648fba3`

### 1. 총량(`prescription.total_qty`)을 계산하는 곳

| 곳 | 지금 식 | 비고 |
|---|---|---|
| `Consultation.jsx` `addDrugRx` (약 추가, 검색·약 검색 창·약속처방 모두 여기로) | `(parseFloat(default_dose)‖1) × (default_freq‖1) × (default_days‖1)` | 화면이 계산해서 보냄 |
| `Consultation.jsx` `saveRx` (칸을 고치고 다른 곳을 누를 때) | `(parseFloat(dose)‖0) × freq × days` | 화면이 계산해서 보냄. **칸에 들어갔다 나오기만 해도 저장·재계산**(`onBlur`, 5칸) |
| `Consultation.jsx` `applySet` (약속처방) | 따로 없음 — `addDrugRx`에 세트 값을 넘김 | 세트(`order_set_item`)에는 총량이 저장되지 않음 |
| `consult.routes.js` `POST /:id/prescriptions` | **계산 안 함** — 화면이 보낸 `total_qty`를 그대로 저장 | |
| `consult.routes.js` `PUT /prescription/:rxId` `calcQty` | 화면이 보낸 `total_qty`, 없으면 `dose × freq × days` | |

`total_qty`를 **쓰는** 곳은 진료 API 두 곳뿐이지만, **값이 비었을 때 대신 계산하는 곳**이 다른 모듈에 5곳 있습니다. 모두 `dose × frequency × days`입니다.
- `billing.routes.js:95`(수납 대기 목록의 `live_total`), `:489`
- `Payment.jsx:165`·`:183`·`:587`
- `Pharmacy.jsx:16` `rxQty`
- `external-rx.jsx:27`

진료 화면은 항상 `total_qty`를 채워 보내므로 평소에는 이 대신 계산이 쓰이지 않습니다. 식을 바꿀 때는 같이 맞춰야 합니다(각 세션 파일).

`total_qty`를 **읽는** 곳:
- 약국 조제 재고 차감: `pharmacy.routes.js:183` `Math.ceil(total_qty)`
- 약국 대기 목록 약값: `:33`
- 수납 청구: `billing.routes.js`, `Payment.jsx`
- 통계 약품 사용량: `stats.routes.js:275`

### 2. 서버가 한 곳에서만 계산하는 방법 (추천)

- `consult.routes.js`에 `rxTotal(dose, frequency, days)` 하나를 두고, `POST`·`PUT` 둘 다 **서버가 계산**합니다. 화면이 보낸 `total_qty`는 무시하거나 400으로 거절합니다. 식이 바뀌면 이 함수 한 줄만 바꾸면 됩니다.
- 화면(`addDrugRx`·`saveRx`)은 `total_qty`를 보내지 않고, 서버 응답 줄을 그대로 씁니다(이미 응답으로 줄을 바꿔 끼우는 구조라 추가 작업이 거의 없음).
- **바뀌지 않은 줄은 다시 계산하지 않기**: `PUT`은 `dose`·`frequency`·`days` 중 하나라도 바뀌었을 때만 `total_qty`를 새로 계산합니다(`UPDATE … SET total_qty = CASE WHEN … IS DISTINCT FROM … THEN … ELSE total_qty END`). 이유: 지금은 칸에 들어갔다 나오기만 해도 저장되므로, 배포 뒤 의사가 **예전 진료를 열고 칸을 스치기만 해도** 그 줄이 새 식으로 1/3로 바뀌고, 이미 수납한 내원이 수납 화면에 「환불」로 뜹니다. 화면 쪽 `saveRx`도 값이 그대로면 보내지 않게 합니다.
- 다른 모듈의 대신 계산 5곳은 「`total_qty`가 없으면 0 또는 서버 규칙」으로 맞추거나 없앱니다. 진료 쪽이 항상 채우면 없애도 됩니다. **확인 필요**: 실행 중 DB에 `total_qty IS NULL`인 처방이 있는지(읽기 전용 조회 한 줄, 총괄이 하실 일).

### 3. 칸 이름

지금 진료 화면 처방 표의 머리는 **약 줄과 오더 줄이 같이 씁니다**. 공용 키 `t.qty`·`t.tms`·`t.day`·`t.usage`·`t.unit`을 쓰는데, 그 뜻은 이렇습니다.

| 머리 (fr / ko) | 약 줄에서 | 오더 줄에서 |
|---|---|---|
| Qté / Qty | `dose` | `quantity` |
| Fois / Tms | `frequency` | `frequency` |
| Jours / Day | `days` | `days` |
| Usage / Usage | `route` | `dose` |
| Unité / 단위 | `memo` | `memo`(부위) |

그래서 첫 칸을 「하루 총량」으로 바꾸면 오더 줄의 수량이 잘못 불립니다. 또 `t.unit`은 임상병리 `LabResults.jsx`도 씁니다. 방법은 두 가지입니다.
- (a) 약 표와 오더 표를 나누고 각자 머리를 단다. 머리는 새 `cs_` 키로: 약 = **하루 총량 / Dose par jour / Daily dose** · 횟수 · 일수 · **용법 / Posologie / Sig.** · 메모, 오더 = 수량 · 메모. 화면 모양이 바뀌므로 규칙 11절에 따라 실장님 확인이 필요합니다. **추천.**
- (b) 한 표를 유지하고 머리를 「Dose/j · Qté」처럼 두 뜻으로 적는다. 작지만 헷갈립니다.

「경로」 칸 문제(약국 M7): 진료 화면에서 이 칸의 머리는 이미 **Usage**이고, 값은 `drug.default_route`에서 옵니다. 그런데 이 값이 경로(`IV`·`PO`·`INH`)와 복용 횟수(`TID`·`BID`·`QD`)가 섞여 있습니다(시드 `003_seed_data.sql` 3-27). 그래서 이름은 경로가 아니라 **용법**이 맞습니다.
- 저장 칸(`route`, `VARCHAR(10)`)은 그대로 두고 이름만 바꾸면 됩니다.
- 기본 용법이 없는 약에 `'TID'`를 넣는 코드(`addDrugRx`, 7절 ⑮)는 같이 없앱니다.
- 약국 화면의 「Voie (경로)」, 원외처방전, 설정 약품 화면의 이름은 각 세션 몫입니다.

### 4. 「1회 1정 × 3회」 풀이

- 약 이름 아래에 작은 회색 줄을 하나 둘 수 있습니다: `1회 1 × 하루 3회 × 7일 = 21` / `1 × 3/j × 7 j = 21`. 1회량은 `하루 총량 ÷ 횟수`입니다. 계산은 화면에서 하고, 저장은 하지 않습니다.
- 줄 높이가 조금 늘어납니다(글자 11px 한 줄).
- **단위(정·캡슐·mL)를 쓸 수 없습니다**: `drug` 테이블에 단위 칸이 없습니다(`001_schema.sql` drug). `addDrugRx`가 `memo: drug.unit`을 넣지만 늘 비어 있습니다. 단위를 보이려면 `drug.unit` 칸을 더하는 마이그레이션(2xx)과 설정 약품 화면(설정 세션)이 필요합니다.
- 나누어떨어지지 않으면(하루 2 ÷ 3회 = 0.67) 소수 둘째 자리까지 보이고 노란색으로 표시합니다.

### 5. 결정 전에 꼭 보셔야 할 것 — 시드가 한 가지 방식이 아닙니다

`003_seed_data.sql`의 약 기본값을 두 식으로 계산해 보았습니다(시드 `default_dose / default_freq / default_days`).

| 약 | 기본값 | 지금 식(용량×횟수×일수) | 새 식(하루 총량×일수) | 흔한 처방으로 보면 |
|---|---|---|---|---|
| PCM500 Paracetamol 500mg Tab | 3 / 3 / 5 | 45 | **15** | 1정 하루 3번 5일 = 15 → 새 식이 맞음 |
| DICLO Diclofenac 50mg | 2 / 2 / 5 | 20 | **10** | 1정 하루 2번 = 10 → 새 식 |
| METF500 Metformin | 2 / 2 / 30 | 120 | **60** | 새 식 |
| **ACT01 Artemether-Lumefantrine** | **4 / 2 / 3** | **24** | 12 | 성인 표준은 **4정 하루 2번 3일 = 24정**으로, 지금 식이 맞음. **새 식이면 절반만 나갑니다(말라리아 약)** |
| **ORS Sachet** | **1 / 3 / 3** | **9** | 3 | 「1포 하루 3번」으로 읽으면 지금 식이 맞음 |
| PCM250 · AMOX250 · CODAEP (시럽, 병 단위 가격) | 3 / 3 / 5~7 | 45~63병 | 15~21병 | **둘 다 틀림** — 보통 1~2병. 용량이 mL·스푼이면 병 수로 바꿀 수 없음 |
| SALB Salbutamol 흡입기 | 2 / 3 / 30 | 180개 | 60개 | **둘 다 틀림** — 1개 |
| CEFT Ceftriaxone 주사 | 1 / 1 / 1 | 1 | 1 | 같음 |

- 식만 바꾸면 ACT01·ORS의 기본값도 같이 고쳐야 합니다(예: ACT01 `8 / 2 / 3`). **의학적 판단**입니다.
- 시럽·흡입기·크림처럼 **판매 단위가 1회 투여 단위와 다른 약**은 어느 식으로도 맞지 않습니다. 이런 약은 총량을 의사(또는 약국)가 직접 적게 하는 방법(`total_qty` 직접 입력 허용)이나, 약마다 「판매 단위당 양」을 두는 방법이 필요합니다. 별도 결정입니다.
- 이미 저장된 처방은 옛 식으로 계산되어 있고, 이미 청구·조제되었습니다. **옛 데이터는 고치지 않는 것을 추천**합니다(청구·재고는 이미 일어난 사실). 다만 실행 중인 EMR로 조제한 적이 있다면, 재고가 약 3배로 빠져 있을 수 있습니다(약국·실장님 확인).

### 6. 바꿀 파일 · 작업 크기 (결정이 「하루 총량 × 일수」로 나면)

| 파일 | 할 일 | 크기 | 담당 |
|---|---|---|---|
| `consult.routes.js` | `rxTotal`, POST·PUT 서버 계산, 바뀐 줄만 재계산 | 30줄 안팎 | 진료 |
| `Consultation.jsx` | 화면 계산 두 곳 삭제, 값이 그대로면 저장 안 함, `'TID'` 기본값 삭제, 머리 `cs_` 키, 1회량 풀이 줄, (a)안이면 표 나누기 | 60~120줄 | 진료 |
| `i18n` ko·en·fr | `cs_` 키 6~10개 | 작음 | 진료 |
| `documents/registry.js` `autofillValue('meds')` | 의뢰서 「현재 투약」 글 `3.000 x3 x7d` → 새 표기 | 몇 줄 | 진료(공용 엔진) |
| `003` 시드 | 이미 적용된 마이그레이션이라 **못 고침** — 기본값 수정은 새 마이그레이션(2xx) 또는 설정 화면에서 | — | 진료(마이그레이션), 결정 필요 |
| `billing.routes.js`·`Payment.jsx` | 대신 계산 5곳 | 작음 | 수납 |
| `Pharmacy.jsx`·`external-rx.jsx` | `rxQty` 대신 계산, 「Dose / Voie」 머리 | 작음 | 약국 |
| `PatientChart.jsx` | `dose×freq×days d` 표시 | 한 줄 | 수납 |
| `Settings.jsx` 약품 탭 | `colDose` 이름, (단위 칸을 더하면) 입력 | 작음 | 설정 |

진료 쪽은 반나절 안팎입니다. 표를 나누는 (a)안이면 그보다 조금 더 걸립니다.

### 7. 격리 스택 확인 시나리오

1. 새 내원에 PCM500(3/3/5)을 넣습니다. 진료 화면 총량 15, 풀이 「1 × 3/j × 5 j = 15」를 확인합니다. 약국 대기 목록 15, 수납 약값 15×80=1200, 조제 뒤 재고 −15를 확인합니다.
2. 일수 5→7로 바꾸면 21, 횟수 3→2로 바꾸면 총량은 21 그대로이고 1회량만 1.5(노랑)로 바뀝니다.
3. API로 `total_qty: 999`를 보내도 서버가 계산한 값이 저장되는지 확인합니다.
4. **옛 줄**: 배포 전 식으로 만든 줄이 있는 완료 내원을 엽니다. 칸에 들어갔다 나와도 `total_qty`가 그대로이고, 수납 목록에 환불이 뜨지 않는지 확인합니다. 일수를 실제로 바꾸면 새 식으로 바뀌어 수납에 차액이 뜨는 것도 확인합니다.
5. 약속처방(Diarrhea / GE)을 적용해 ORS·METRO 총량이 새 식을 따르는지 봅니다.
6. 조제된 줄 PUT은 여전히 409인지 봅니다.
7. 한국어·프랑스어 머리와 풀이 줄을 봅니다. 의뢰서 「현재 투약」 글도 봅니다.

- **바꾼 파일**: `wiki/handoff/consultation.md` · `wiki/modules/consultation.md`(7.2 ㉔ 한 줄)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드와 시드를 읽고 계산했습니다(grep 위치는 위 표). 실행은 하지 않았습니다.
- **확인 못 한 것**: 실행 중 DB의 `total_qty IS NULL` 건수, 실행 중 EMR로 실제 조제한 이력(재고가 3배로 빠졌는지).
- **총괄 확인 요청 · 결정 세션에 넘길 것**:
  1. 식을 「하루 총량 × 일수」로 바꿀 때 **ACT01·ORS 기본값을 어떻게 할지**(의학적 판단).
  2. **시럽·흡입기처럼 병·개 단위 약의 총량을 누가 어떻게 정할지.** 추천: 약마다 「총량 직접 입력」을 허용하고, 기본값은 1.
  3. 표를 약/오더로 나눌지((a)안, 추천) 한 표에 두 뜻의 머리((b)안)로 둘지.
  4. 옛 처방 데이터는 그대로 둘지(추천: 그대로).
- **다른 세션에 부탁**: 결정이 나면 수납(대신 계산 5곳 중 4곳, `PatientChart.jsx`), 약국(`rxQty`, 원외처방전, 「Voie」), 설정(약품 「용량」 이름, 단위 칸)도 같이 움직여야 합니다.
- **남은 일 · 알려진 문제**: 위 결정 대기.

## 2026-09-29 — ⑯ 진료 화면 3개 국어 + 영상 경고를 PACS 부품으로 + 체크 칸 결정 기록

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 공용 변경 확인: `printDocument(node, title, lang)`은 `lang`이 없으면 예전처럼 한국어라 다른 호출에 영향 없음(부르는 곳은 `DocumentModal` 하나). 번역 키가 세 언어에 같은 개수로 있는 것 확인. 화면은 세션의 격리 스택 확인(한국어·프랑스어). 바이탈 약어 확인은 결정 세션의 의사 확인 목록에 추가, 문장사전 `text_fr`/`text_en` 입력은 설정 세션에 전달.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `881328e`
- **한 일**:
  - ⑯ 진료 화면에서 영어·한국어로 고정돼 있던 글자를 화면 언어로 바꿨습니다. 저장값은 그대로 두고 보여 줄 때만 `cs_` 키로 바꿉니다.
    - 대기 목록 상태(`waiting` → En attente 등), 문장사전 분류 버튼과 문장 옆 표시, 검색 목록의 종류 표시(DRUG → MÉD, lab → LABO, procedure → ACTE)
    - 진료 기록 안내 글: 전에는 `\n`이 글자로 보였습니다. 이제 실제 줄바꿈이고 3개 국어입니다.
    - 오류 알림 머리(`Error:`), 환자를 고르기 전 안내(접수 화면 문구였음)
    - 바이탈 이름: 프랑스어는 TA · T° · FC · FR · SpO2, 한국어·영어는 BP · BT · PR · RR 그대로
  - 문장사전: 설정에 `text_fr`/`text_en`이 있으면 그 화면에서 그 문장을 보여 주고 그대로 끼워 넣습니다(검색도 같은 글자). 설정에서 새로 만든 분류도 버튼이 생깁니다(전에는 All에서만 보였음).
  - 공용 인쇄 도우미의 팝업 차단 안내를 문서 언어로 보여 줍니다(전에는 한국어만).
  - 총괄 전달(PACS): 영상 뷰어의 환자 확인 경고를 제 복제본 `ImagePatientCheck`에서 PACS가 export한 `PatientCheck`로 바꾸고, 복제본은 지웠습니다.
  - 총괄 전달(실장님 결정): 위키 3.6절 표에 적었습니다.
    - 탈장 유형은 「여러 개 유지」
    - 충수 위치·삼출액 성상·연부조직 병변 위치/종류는 「의사 확인 대기, 여러 개 유지」
  - **약 처방 칸 이름(Qté · Fois · Jours · Usage · Unité)과 도움말은 지시대로 손대지 않았습니다.**
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**:
  - `frontend/src/documents/shared.jsx` — `printDocument(node, title, lang)`에 세 번째 인자 추가, 팝업 차단 안내를 ko·en·fr로. `lang`이 없으면 예전처럼 한국어.
  - `frontend/src/components/DocumentModal.jsx` — `printDocument`에 문서 언어를 넘김(한 줄).
  - `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 표시 사이에 `cs_` 키 23개 추가. **기존 키 한 줄 수정**: `fr.js`의 `noViewerUrl`이 악센트와 따옴표가 빠진 채(`non definie (Parametres -> Flux d ordres)`)였던 것을 `non définie (Paramètres → Flux d'ordres)`로 고쳤습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_vsRegistered`·`cs_vsWaiting`·`cs_vsInProgress`·`cs_vsCompleted`·`cs_vsCancelled`, `cs_pcAll`·`cs_pcGeneral`·`cs_pcInternal`·`cs_pcSurgery`·`cs_pcPeds`·`cs_pcObgyn`, `cs_badgeDrug`·`cs_badgeLab`·`cs_badgeProc`·`cs_badgeImg`, `cs_notePlaceholder`, `cs_errorPrefix`, `cs_selectPatient`, `cs_vBP`·`cs_vBT`·`cs_vPR`·`cs_vRR`·`cs_vSpO2` (ko · en · fr 모두)
- **확인한 방법**:
  - `npm run build` 통과.
  - 격리 스택 9182(`:dev`, develop `881328e` 코드)에서 확인. 시험 DB에 분류 「Dental」과 `text_fr`이 있는 문장을 API로 하나 넣었습니다.
    - 프랑스어: 대기 목록 「En attente」, 빈 화면 안내 「Choisissez un patient dans « ☰ File d'Attente »…」, 바이탈 「TA | T° | FC | FR | SpO2」
    - 프랑스어: 분류 「Tout | Général | Médecine | Chirurgie | Pédiatrie | Gynéco-obst. | Dental」. Dental을 누르면 그 문장만 남고, 누르면 진료 기록에 「Phrase dentaire de test」가 들어감
    - 프랑스어: 안내 글이 네 줄 「S : Motif de consultation…」, 검색 표시 「LABO」·「MÉD」
    - 한국어: 「진료 중, 대기」, 「BP | BT | PR | RR | SpO2」, 「전체 | 일반 | 내과 | 외과 | 소아 | 산부인과 | Dental」, 「S: 주호소...」, 「처치」
    - 영상 뷰어: PACS의 `PatientCheck`로 프랑스어 빨간 경고, 여백 `8px 14px 0` 그대로.
- **확인 못 한 것**: 팝업 차단 안내는 팝업을 실제로 막아 보지 않았습니다(코드만). 영어 화면은 따로 눌러 보지 않았습니다(키는 넣음).
- **위키**: `modules/consultation.md` 머리 상태, 2절(2.2 바이탈·문장사전, 2.3 종류 표시, 머리말), 3.1(화면 글자 번역, 영상 환자 확인), 3.5(`printDocument`), 3.6(결정 상태), 6절(문장사전), 7.2(⑯ ✅, ⑳ 일부), 8절. 7.2 ⑯ 줄이 이전 커밋에서 줄바꿈 하나로 두 줄로 갈라져 있던 것도 바로잡았습니다.
- **총괄 확인 요청**: 바이탈의 프랑스어 이름(TA · T° · FC · FR)은 프랑스어 진료 기록의 흔한 약어로 골랐습니다. 현지 의사 용어 확인 목록에 같이 넣어 주시면 좋겠습니다.
- **다른 세션에 부탁**:
  - **설정** — 문장사전 탭에서 `text_fr`·`text_en`을 입력할 수 있는지 확인 부탁드립니다. 진료 화면은 이제 그 칸을 씁니다. 시드 문장은 `text`(영어)만 있어서, 프랑스어 문장을 채워야 현장에서 효과가 납니다.
- **남은 일 · 알려진 문제**: ⑳ 약속처방 진료과 구분, 약 처방 칸 이름·도움말(약국 C 결정 대기).

## 2026-09-29 — 위키 2절(직원용 사용법)을 프랑스어 화면 기준으로

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `9c7aca9`
- **한 일**: `modules/consultation.md` 2절을 새로 썼습니다. 버튼·칸 이름은 프랑스어 화면에 보이는 그대로 쓰고 괄호에 한국어 이름을 붙였습니다(`statistics.md` 2절 방식).
  - 2.1~2.7: 환자 부르기, 바이탈·진료 기록, 처방·검사(🔒, 상태 칸 표, 영상 환자 확인 ⚠ 포함), 약속처방, 과거 기록, 진료 끝내기, 파란 줄 버튼
  - **2.8 수술기록지 쓰는 순서**: 언어 FR 고르기 → 양식 고르기(12종 프랑스어 이름) → 칸 채우기(체크 규칙, 크기 칸, `[ ]` 고치기) → Émettre → Réimprimer
  - **2.9 발급 전 [괄호] 경고가 뜨면**: 경고 문구, 취소하고 고치는 순서, 그대로 발급해도 되는 경우
  - 2.10 의뢰서, 2.11 발급 이력·다시 인쇄·발급 취소, 2.12 막힐 때(표)
- **바꾼 파일**: `wiki/modules/consultation.md` (머리 상태, 2절, 8절)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 2절의 프랑스어 이름은 `fr.js`, `DocumentModal.jsx`의 `UI` 사전, 양식 정의(`surgical-records.jsx`·`referral.jsx`)에서 그대로 옮겼습니다. 오늘 격리 스택 9182에서 프랑스어 화면으로 눌러 본 것(파란 줄 버튼, + Recherche médicament, Délivré, Résultat reçu / En attente, En cours, À compléter 경고와 확인 창 문구, Dossier clinique 창)과 대조했습니다.
- **확인 못 한 것**: 확인 창(`window.confirm`)의 단추 글자는 브라우저 언어를 따라서, 현장 PC에서 「Annuler」로 나오는지 「Cancel」로 나오는지 모릅니다(2.9에 둘 다 적음). 현장 직원이 읽어 보지는 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2절 전체, 8절
- **총괄 확인 요청**: 현지 프랑스어 사용 설명서를 만들 때 2절을 바탕으로 쓸 수 있습니다. 2절에 나오는 프랑스어 의학 용어(Néant 등)는 3.6절 표와 같고, 결정 세션의 용어 확인 결과가 오면 2절도 같이 고칩니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: ⑯(프랑스어 화면에 남은 영어 — 대기 상태값, 문장사전 분류, DRUG, 진료 기록 안내 글)은 아직입니다. 2절에는 「보이는 그대로」 적어 두었습니다.

## 2026-09-29 — ㉓ 영상 뷰어 환자 확인 경고 + 상태 칸 3개 국어 (PACS 부탁)

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토 문제없음(`orderStatus`는 두 곳 모두 `ConsultationPage` 안에서 부름). 경고 표시는 실제 브리지 값으로는 아직 못 봄 — PACS 저장소를 합친 뒤(재부팅 후) 실제 영상으로 확인 예정. `PatientCheck` export는 PACS 세션에 전달.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `076bd3e`. `f48cec9` 뒤에 develop이 앞서 나가 fast-forward가 안 돼서, 처음엔 develop을 한 번 merge(`0bfa6ab`)했습니다. 총괄이 `f48cec9`를 합친 뒤 그 merge 커밋은 버리고 develop 위로 다시 올렸으므로, 이 브랜치는 다시 develop + 커밋 1개입니다.
- **한 일**:
  - 진료 화면 영상 뷰어 창의 머리 아래에 `GET /pacs/viewer-url` 응답 `images.patient_check` 경고를 보입니다. 다른 환자면(`mismatch`) 빨강, 환자번호가 없으면(`missing`) 노랑입니다. 문구는 `px_patientMismatch`·`px_patientMissing`을 그대로 쓰고, 모양은 `RadiologyReadings.jsx`의 `PatientCheck`와 같습니다. 그 부품이 export되어 있지 않고 PACS 소유 파일이라, `Consultation.jsx` 안에 같은 모양의 `ImagePatientCheck`를 뒀습니다.
  - P-19: 상태 칸의 워크리스트 상태(`pending`·`sent`·`in_progress`·`completed`·`cancelled`)를 3개 국어로 보입니다. 과거 기록 보기도 같은 함수를 씁니다.
- **바꾼 파일**: `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 표시 사이에 키 5개만 추가(`px_` 키는 읽기만 함)
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_wsPending` · `cs_wsSent` · `cs_wsInProgress` · `cs_wsCompleted` · `cs_wsCancelled` (ko · en · fr)
- **확인한 방법**:
  - `npm run build` 통과.
  - 격리 스택 9182(`:dev` 이미지, develop `076bd3e` 코드, 마이그레이션 019 적용)에서 시험 DB의 `worklist_log` 한 줄을 바꿔 가며 확인:
    - `mismatch`(26-00999 RAZAFY^Paul): 한국어 빨간 경고 「영상에 적힌 환자는 「26-00999 RAZAFY Paul」으로…」
    - `missing`: 프랑스어 노란 경고 「Les images ne portent aucun numéro de patient…」
    - `match`: 경고 없음
  - 상태 칸: 한국어 「촬영 중 / 결과 있음 / 결과 대기」, 프랑스어 「En cours / Résultat reçu / En attente」, 처치는 빈칸.
- **확인 못 한 것**: 실제 워크리스트 브리지(`POST /pacs/study-arrived`)로 들어온 값으로는 보지 않았습니다(DB를 직접 바꿔서 시험). 과거 기록 보기의 상태 칸은 같은 함수라 따로 누르지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2절(처방·오더 7·8번), 3.1(상태 칸, 영상 환자 확인), 7.2 ㉓, 8절
- **총괄 확인 요청**: 없음
- **다른 세션에 부탁**:
  - **PACS** — `RadiologyReadings.jsx`의 `PatientCheck`를 export해 주시면 진료 쪽의 복제본(`ImagePatientCheck`)을 지우고 그것을 쓰겠습니다. 급하지 않습니다.
- **남은 일 · 알려진 문제**: 다음은 위키 2절(직원용 사용법)을 프랑스어 화면 기준으로 다시 쓰기(총괄 지시).

## 2026-09-29 — ⑥ 수술기록지 프랑스어 표시 + ㉒ 검사 오더 상태 칸 (임상병리 부탁)

> **총괄 확인 (2026-09-29)**: 합침(`4b5d01c`) + 실행 중 EMR 반영. 총괄 렌더 도구에 프랑스어 전 양식·빽빽한 경우를 추가해 688px로 찍음: 12개 양식 630~899px, 빽빽한 경우 탈장 952 · 충수 990 · 유방 929 · 치질 917 · 치루(유형 3개) 973 — 모두 한 장, 그림 밖으로 나간 글자 0. 시계 D/G, 선택값·그림 글자 프랑스어 확인. 프랑스어 의학 용어 확인은 결정 세션 목록에 넣음(현지 의사 확인, 그때까지 지금 번역 유지).

- **상태**: 확인 요청 (프랑스어 의학 용어는 현지 의사 확인이 필요합니다 — 아래 「총괄 확인 요청」)
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `b01c6a0`
- **한 일**:
  - ⑥ 수술기록지를 FR로 고르면 체크 칸 글자, 인쇄되는 선택값, 그림 글자가 프랑스어로 나옵니다. 시계와 유방 그림의 R/L은 D/G로 바뀝니다. **저장값은 영어 그대로**이고 보여 줄 때만 바꿉니다. 그림을 무엇으로 그릴지가 이 영어 문자열로 정해지고, 옛 문서도 같은 값을 갖고 있기 때문입니다. 그래서 옛 문서도 FR로 재출력하면 프랑스어로 나옵니다. 사전은 새 파일 `documents/op-terms.js` 하나에 모았고 표는 위키 3.6절에 있습니다. 한국어·영어 표시는 바꾸지 않았습니다.
  - 충수 그림은 프랑스어 단어가 길어 그림 끝에서 잘렸습니다(Rétro-iléale, Rétrocæcale, Pelvienne). 그래서 프랑스어일 때만 틀을 넓혔습니다. 치루 단면의 「releveur de l'anus」는 두 줄로 나눴습니다.
  - ㉒ 임상병리 부탁: 진료 화면에서 검사 오더의 상태 칸이 결과 전부터 「completed」로 보이던 것을 고쳤습니다. 이제 검사 오더는 `o.status`를 「결과 대기 / 결과 있음 / 취소됨」으로 보여 줍니다. 워크리스트로 간 오더는 예전 그대로이고, 그 밖의 오더(처치 등, 역시 처음부터 `completed`로 저장됨)는 칸을 비웁니다.
- **바꾼 파일**: `frontend/src/documents/op-terms.js`(새 파일) · `surgical-records.jsx` · `op-figures.jsx` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**:
  - `frontend/src/components/DocumentModal.jsx` — 체크 옆 글자를 `f.optionLabel(opt, lang)`로 보여 줍니다. 필드에 `optionLabel`이 없으면 예전처럼 `opt`를 그대로 보여 줍니다. `optionLabel`은 수술기록지만 답니다.
  - `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 표시 사이에 키 3개만 추가했습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_labPending` · `cs_labDone` · `cs_labCancelled` (ko · en · fr 모두)
- **확인한 방법**:
  - `npm run build` 통과.
  - 인쇄 폭 렌더링(688px): **한국어·영어 출력 HTML이 이 작업 전(HEAD)과 바이트까지 같습니다**(`cmp` 비교: 그림 모음, 전 양식 ko, 경계 사례, 빽빽한 경우). 프랑스어로는 12개 양식, 빽빽한 경우 5종(탈장 952, 충수 990, 유방 929, 치질 917, 치루 964), 긴 단어 경우(연부조직 877, 충수 1008)가 모두 1017px 이하 한 장입니다. 그림 밖으로 나간 글자 없음, 고른 위치의 테두리가 글자를 모두 감싸는 것을 `getBBox`로 확인했습니다.
  - 격리 스택 9182(이미지 `bethesda-s-consultation-*:dev`인 것을 `config | grep image`로 확인 후 띄움):
    - 한국어: 결과 있는 검사 「결과 있음」, 새 검사 L02 「결과 대기」, 처치 P01 빈칸.
    - 프랑스어: 같은 줄이 「Résultat reçu / En attente」.
    - 치질 기록(프랑스어): 체크 칸 `1 h … 12 h`, `Marisque, Fissure anale, Papille anale, Néant`, `Oui, Non`. 미리보기는 「Position (cadran horaire) 3 h, 7 h」, 「Lésion associée Marisque」, 「Position des paquets (vue en position gynécologique)」.
    - 발급(`D26-00002`) 후 API로 본 저장값은 `3 o’clock, 7 o’clock` / `Skin tag` / `Yes`로 영어 그대로였고, 같은 문서를 EN으로 바꾸면 영어로 보입니다.
- **확인 못 한 것**: 실제 프린터 인쇄 창은 띄우지 않았습니다. 프랑스어 용어가 의학적으로 맞는지는 제가 판단할 수 없습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2절(문서 발급), 3.1(상태 칸), 3.6(프랑스어 표시·용어 표), 7.1 ⑥ ✅, 7.2 ㉒ 추가, 8절
- **총괄 확인 요청**:
  - **프랑스어 용어 확인은 결정 세션 경유로 부탁드립니다.** 위키 3.6절 표를 현지 프랑스어 의사가 한 번 봐 주셔야 합니다. 특히 확신이 낮은 것은 다음입니다:
    - `None` → `Néant`(Aucun/Aucune 대신)
    - `Femoral` → `Crurale`(또는 Fémorale)
    - `Postileal` → `Rétro-iléale`(또는 Post-iléale)
    - `Anal papilla` → `Papille anale`(또는 Papille hypertrophique)
    - `Pile position (lithotomy view)` → `Position des paquets (vue en position gynécologique)`
    - `IAS/EAS` → `SAI/SAE`
    - 충수 상태 `Suppurée`(또는 Phlegmoneuse)
    - 추천: 지금 번역으로 두고 현지 의견이 오면 `op-terms.js`의 오른쪽 값만 바꿉니다(저장값·그림 동작은 영향 없음).
  - ㉒로 처치 오더(워크리스트 없는 것)의 상태 칸이 「completed」에서 빈칸으로 바뀝니다.
- **다른 세션에 부탁**:
  - **임상병리** — 부탁하신 7절 9를 처리했습니다(검사 오더는 `o.status` 표시). 위키 쪽 표시를 갱신해 주세요.
- **남은 일 · 알려진 문제**: ⑯(진료 화면 자체에 남은 영어 — 대기 상태값, 문장사전 분류 등)은 이번 범위 밖입니다.

## 2026-09-29 — 수술기록지 ③④⑤⑦: 체크 규칙, 빈 크기 칸, 치루 유형 여러 개, [괄호] 경고

> **총괄 확인 (2026-09-29)**: 합침(`8240038`) + 실행 중 EMR(9080) 반영(새 번들에 경고 문구 들어간 것 확인). 총괄 렌더 도구로 합친 코드를 688px 폭에서 다시 찍음: 12개 양식 630~917px, 빽빽한 경우 탈장 952 · 충수 1008 · 유방 929 · 치질 917 · 치루 942 — 모두 1017px 이하 한 장. 손대지 않은 크기 칸은 인쇄 안 됨, 치루 유형 2개는 실선·점선 + 범례로 한 그림에, 예전 값 `Yes, No`는 저장된 대로 인쇄. 공용 `DocumentModal.jsx` 변경 확인 — `checks`는 수술기록지만 쓰고, 발급 확인 창은 막지 않고 묻기만 함. 실행 중 EMR 화면에서 직접 눌러 보지는 않음(세션의 격리 스택 확인을 믿음). 탈장 유형 「여러 개」와 나머지 확인 후보는 실장님께 여쭘.

- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발 develop `501acca`(`git merge --ff-only develop` 후)
- **한 일**:
  - ③ 체크 칸마다 규칙: `single: true`(하나만 — 새 체크가 앞의 것을 바꿈), `noneOption: 'None'`(None과 나머지 배타), 없으면 아무 조합. 어느 칸이 어느 규칙인지 12개 양식을 전부 훑어 정했고 표는 `modules/consultation.md` 3.6절.
  - ④ 기본값(입력 도우미 `' ×  ×  cm'`)을 손대지 않은 상세 칸은 빈 칸으로 보고 인쇄하지 않음.
  - ⑤ 치루 단면도에 고른 유형을 **한 그림에 모두** — 첫째 실선, 나머지 점선 무늬, 여럿이면 아래 범례. 유형마다 그림을 따로 그리는 방식을 먼저 했으나, 표 옆에 못 들어가 줄이 바뀌면서 소견이 보통 길이인 기록이 두 장(1047px)이 되어 버려서 바꿨습니다.
  - ⑦ `text`·`textarea` 칸에 `[...]`가 남아 있으면 칸 아래 「⚠ 아직 고치지 않은 칸」, 「발급 (저장)」 때 확인 창. 초안 출력에는 묻지 않음. 기본 소견 문장 자체는 의학 문장이라 손대지 않았습니다.
- **바꾼 파일**: `frontend/src/documents/surgical-records.jsx` · `op-figures.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: **`frontend/src/components/DocumentModal.jsx`** (문서 엔진, 진료 주관 — 수납·약국·임상병리·접수도 씀)
  - `checks` 입력의 다음 값 계산을 `nextChecks()`로 빼고 필드의 `single`·`noneOption`을 따르게 함. **`checks`를 쓰는 양식은 수술기록지뿐**이라(grep 확인) 원외처방전·의뢰서의 동작은 그대로입니다. 규칙 표시가 없는 `checks` 필드는 예전과 똑같이 동작합니다.
  - `openBrackets()` + 입력 칸 아래 경고 + 발급 때 `window.confirm`. **모든 양식의 발급에 적용**됩니다 — 원외처방전(약국)·의뢰서에서도 `[...]`가 남아 있으면 한 번 묻습니다. 막지는 않고 묻기만 합니다.
  - 문구는 `DocumentModal`의 `UI` 사전(`bracketHint`·`bracketConfirm`, ko·en·fr)에 넣었습니다(이 파일이 원래 쓰는 방식, i18n 파일 아님).
  - 저장 형식(쉼표로 이은 문자열)은 그대로 — 예전에 두 개 저장된 문서도 그대로 열리고 인쇄됩니다. DB 데이터는 고치지 않았습니다.
- **DB 마이그레이션**: 없음
- **번역 키**: 없음 (i18n 파일 변경 없음)
- **확인한 방법**:
  - `npm run build` 통과(프론트만 바뀜, 백엔드 변경 없음).
  - 인쇄 폭 렌더링(688px, 진료 scratchpad의 렌더 도구, develop 코드로 찍은 것과 비교): **12개 양식 기본·빽빽한 경우 높이가 develop과 1px도 다르지 않음**(충수 빽빽한 경우 1008px, 여유 9px 그대로). 치루 유형 2개 891px(보통)/964px(빽빽), 3개 973px, 5개 전부 991px — 모두 1017px 이하 한 장. 손대지 않은 크기 칸: 연부조직·유방·충수 모두 크기 줄 없음, 적은 경우 인쇄됨. 예전 값 `Yes, No`는 그대로 인쇄.
  - 격리 스택 9182, **프랑스어**: 치루 기록 — 거즈 Yes→No 체크하면 No만, 다시 누르면 없음 · 치루 유형 2개 유지 · Seton Yes→No · 미리보기 단면도 두 유형+범례 · 소견 아래 「⚠ À compléter: [anesthesia] [lithotomy/jackknife] [laid open / excised] [seton placed]」 · 「Émettre」 → 확인 창(프랑스어) 취소하면 초안 유지 · 괄호를 고친 뒤 발급 → 확인 창 없이 `D26-00001` 발급, 저장본에 두 유형 그대로.
  - 격리 스택 9182, **한국어**: 치질 기록 — 동반 병변 Skin tag+Anal fissure → None 고르면 None만 → Anal papilla 고르면 None 풀림 · 거즈 Yes→No · 「⚠ 아직 고치지 않은 칸: [anesthesia] [lithotomy/jackknife]」 · 미리보기 반영.
  - 체크는 브라우저 자동화로 입력 요소를 눌렀고, 확인 창은 `window.confirm`을 시험용으로 바꿔 끼워 문구를 받았습니다.
- **확인 못 한 것**: 실제 프린터 인쇄 창(`printDocument`의 새 창)은 띄우지 않았습니다 — 인쇄는 미리보기 노드를 그대로 복사하므로 렌더 도구의 688px 측정으로 갈음했습니다. 충수(JP None)·유방(부위)은 같은 코드 경로라 화면에서 따로 누르지 않았습니다.
- **위키**: `modules/consultation.md` 머리 상태, 2절 문서 발급, 3.5·3.6(체크 규칙 표, 치루 단면도)·3.8(렌더 도구), 7.1(③④⑤⑦ ✅), 7.3(옛 문서 재출력 차이), 8절
- **총괄 확인 요청**:
  - **탈장 유형은 「여러 개」로 뒀습니다** — 처음 제안에는 「하나만」이었지만, 양측 탈장은 좌우 유형이 다를 수 있어서(Bilateral + Indirect-medium, Direct-small) 하나만 고르게 하면 기록할 수 없습니다. 실장님 확인 부탁드립니다.
  - 결정 범위 밖이라 「여러 개」로 둔 것: 충수 위치, 삼출액 성상, 연부조직 병변 위치·종류 — 하나만으로 바꿀지 실장님 확인 후보.
  - 옛 문서 재출력이 달라지는 점(손대지 않은 크기 줄 사라짐, 치루 유형 둘 다 그려짐) — 위키 7.3.
- **다른 세션에 부탁**:
  - **약국** — 원외처방전 발급 때도 `[...]`가 남아 있으면 확인 창이 한 번 뜹니다(공용 엔진). 원외처방전 기본 문장에는 대괄호가 없어 평소에는 안 뜹니다.
- **남은 일 · 알려진 문제**: ⑥ 프랑스어 선택값·그림 글자(따로 진행 예정). 위 확인 후보.

## 2026-09-29 — 기록 보호: 조제된 처방 · 결과 있는 오더 잠금, 진료 API 권한 (⑧⑨⑪)

> **총괄 확인 (2026-09-29)**: 합침 — `develop`에 `38116c7`·`d1f473e` 그대로(fast-forward). 실행 중인 EMR(9080)에 반영. 확인: 조제된 처방 PUT·DELETE → 409, 값 그대로 · 진료 권한 없는 임상병리 계정 쓰기 403 · 읽기 200. 요청하신 ㉑은 총괄이 `7ad4387`로 고쳐서 같이 반영(API·접수 화면 생년월일 DB와 일치 확인). 결과 있는 오더 삭제 409는 실행 중 DB에 해당 오더가 없어 격리 스택 결과를 그대로 믿음. 약속처방 탭(`Settings.jsx`)은 화면은 설정 세션, API는 진료 세션 — 화면을 바꿔야 하면 설정 세션과 맞출 것.


- **상태**: 확인 요청
- **커밋**: session/consultation (이 항목과 같은 커밋, `38116c7` 다음)
- **한 일**:
  - 서버: 조제된 처방(`status='dispensed'`)의 수정·삭제를 409로 거절 — 조제하면 재고가 이미 빠져서, 그 뒤의 수정은 청구만 움직이고 재고와 영영 어긋났기 때문. 결과가 생긴 오더(`lab_result` 있음 · 판독 `result_text` 있음 · `worklist_log.status` in_progress/completed)의 삭제를 409로 거절 — `ON DELETE CASCADE`로 검사값·accession·판독이 소리 없이 사라졌기 때문. 진료 쓰기 API 전부에 `permMiddleware('consultation')`(읽기는 그대로 로그인만 — 수납·약국·임상병리·접수가 읽음).
  - 화면: ✕에 확인 창(항목 이름 포함). 조제된 약은 입력 칸 대신 글자 + 🔒 + 「조제됨」, 잠긴 오더는 🔒. 화면이 열린 사이에 약국·검사가 진행해 서버가 거절하면 번역된 안내 후 표를 다시 읽음.
- **바꾼 파일**: `backend/src/routes/consult.routes.js` · `frontend/src/pages/Consultation.jsx` · `wiki/modules/consultation.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 진료 표시(`begin consultation`) 사이에 키 4개만 추가. 그 밖에 없음.
- **DB 마이그레이션**: 없음
- **번역 키**: `cs_confirmRemove` · `cs_dispensed` · `cs_rxLocked` · `cs_orderLocked` (ko · en · fr 모두 넣음)
- **확인한 방법**:
  - 프론트 `npm run build` 통과. `frontend/`에 `package-lock.json`이 없어 `npm ci`는 쓸 수 없어서 `npm install --no-package-lock`(Dockerfile과 같은 방식, 잠금 파일 안 만듦)로 설치. `node --check consult.routes.js` 통과.
  - 격리 스택 9182에서 API 스크립트 27개 항목 전부 통과: 약국 계정의 처방 추가·진료 열기 403, 약국 계정의 처방 읽기 200 · 조제된 처방 PUT/DELETE 409(값 그대로) · 조제 전 처방 PUT/DELETE 200 · 없는 처방 404 · 결과 있는 검사 오더 DELETE 409(결과 그대로) · 촬영 시작한 영상 오더 409 · 판독 쓴 영상 오더 409 · 시작 전 영상 오더 200 · 처치 오더 200 · 없는 오더 404.
  - 화면(한국어): 조제된 약 🔒「조제됨」 글자 표시, 결과 있는 검사·촬영 중 오더 🔒, 새 약 ✕ → 확인 창 「「Brufen 200mg Tab (Ibuprofen)」을(를) 지울까요?」, 취소하면 남고 확인하면 지워짐.
  - 화면(프랑스어): 「Délivré」 표시, 새 약을 넣은 뒤 API로 약국 조제 → 화면에서 ✕ → 「Retirer « … » ?」 → 서버 거절 → 프랑스어 안내 → 표가 다시 읽혀 🔒「Délivré」로 바뀜.
  - 확인 창·알림은 브라우저 자동화가 멈추지 않게 `window.confirm`/`alert`를 시험용으로 바꿔 끼워 문구를 받아 확인했습니다(코드는 그대로).
- **확인 못 한 것**: 의사 역할(`doctor`) 계정으로는 눌러 보지 않았습니다(관리자·약국 계정만). 🔒 위 마우스 설명(title)은 코드로만 확인.
- **위키**: `modules/consultation.md` 머리 상태, 2절(처방·오더, 진료 끝내기), 3.1 · 3.2절, 4절 API 표(권한 칸), 5절 수납, 7.2절(⑧⑨⑪ ✅, ⑯ 보강, ㉑ 추가), 8절
- **총괄 확인 요청**:
  - **㉑ 날짜가 하루 앞당겨 보임 — 시스템 전체, 높음.** `pg`가 `DATE`를 현지 자정 `Date`로 바꾸고 JSON이 UTC로 내보내서 생년월일 `1990-01-01`이 API에서 `1989-12-31T21:00:00.000Z`, 화면에는 `1989-12-31`로 나옵니다(격리 스택, TZ=`Indian/Antananarivo`에서 재현). 생년월일·과거 진료일·인쇄 문서 생년월일이 모두 해당됩니다. 실행 중인 EMR은 건드리지 않아 직접 보지 못했지만 같은 `.env` 설정입니다. 고칠 곳은 `backend/src/config/`(총괄 파일)의 `pg` 타입 파서 — 예: `types.setTypeParser(1082, v => v)`. 진료 세션은 고치지 않았습니다.
  - 409 문구는 `consult.routes.js`의 `RX_DISPENSED`·`ORDER_HAS_RESULT`와 `Consultation.jsx`의 `LOCK_MESSAGES`가 글자까지 같아야 합니다(`api/client.js`가 `error` 문자열만 넘겨줌).
- **다른 세션에 부탁**:
  - **약국** — 조제된 처방을 되돌릴 방법(반품·조제 취소)이 지금 없습니다. 의사는 이제 조제된 줄을 못 지우므로, 잘못 조제된 약을 바로잡으려면 약국 쪽 기능이 필요합니다.
  - **임상병리** — 결과가 들어간 검사 오더는 이제 진료에서 지울 수 없습니다(409). 잘못 낸 검사를 취소 상태로 남기는 방법이 필요하면 임상병리 쪽 의견 부탁드립니다.
  - **PACS** — 촬영이 시작됐거나 판독이 쓰인 영상 오더도 지울 수 없습니다. 판독 API(`PUT /pacs/reading`)는 `code_type='imaging'`만 받는데, 워크리스트를 쓰는 처치 코드(예: 시드의 `E1` 위내시경, `code_type='procedure'`, 모달리티 있음)는 진료 화면에 🖼 버튼이 나오지만 판독을 저장하면 404입니다(격리 스택에서 확인) — 의도인지 확인 부탁드립니다.
- **남은 일 · 알려진 문제**: 문서 발급 취소 권한(⑪ 남은 부분). 다음 작업은 수술기록지 ④⑤⑦(③은 실장님이 배타 그룹을 정해 주셔야 함).

## 2026-09-29 — 현황 파악, 위키 작성 (코드 변경 없음)

- **상태**: 보류 — 무엇부터 고칠지 실장님 결정을 기다립니다. 이 커밋은 위키만 바꿔서 합쳐도 해가 없습니다.
- **커밋**: session/consultation (이 항목과 같은 커밋) — 출발점 develop `a4a9ea6`
- **한 일**: 진료 화면·서버 라우트 3개·문서 양식·문서 엔진·관련 테이블을 전부 읽고 `modules/consultation.md` 1~8절을 코드 기준으로 채웠습니다. 새로 찾은 문제 ⑧~⑳을 7.2절에 심각도·근거(파일:줄)와 함께 적었습니다.
- **바꾼 파일**: `wiki/modules/consultation.md` · `wiki/handoff/consultation.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기만. 격리 스택은 띄우지 않았습니다.
- **확인 못 한 것**: 7.2절의 문제는 코드를 읽어 찾은 것이고 화면에서 재현하지 않았습니다. ⑬(옛 S/O/A/P 칸에 실제 데이터가 있는지)과 ⑭(수납 화면이 오더 수량을 어떻게 쓰는지)는 「확인 필요」로 남겼습니다.
- **위키**: `modules/consultation.md` 1~8절 전부
- **총괄 확인 요청**:
  - 브랜치 작업공간이 처음에 `main`(`f1e9cc4`) 이름 `claude/charming-cori-c14020`로 보였으나, 실제 HEAD는 `a4a9ea6`였고 브랜치 이름만 `session/consultation`으로 바꿨습니다.
  - 설정 화면의 **약속처방 탭**(`Settings.jsx` 157-192, 384-) 담당이 진료인지 확인 부탁드립니다. API(`orderset.routes.js`)는 진료 소유입니다.
  - 렌더링 도구(`emr-render/rerender.sh`)는 본체 `C:\Bethesda-EMR-main`의 파일을 복사합니다. 세션 작업공간 코드를 찍으려면 경로를 바꿔 써야 합니다 — 진료 세션이 자기 scratchpad에 복사해서 쓸 예정입니다.
- **다른 세션에 부탁**:
  - **임상병리** — `lab_result.order_item_id`가 `ON DELETE CASCADE`(`014_lab.sql` 20)라 진료에서 검사 오더를 지우면 결과가 사라집니다(⑨). 진료 쪽에서 「결과 있는 오더는 삭제 거부」로 막을 계획인데, 임상병리 쪽 의견(취소 상태로 남기기 등)이 있으면 알려 주세요.
  - **약국** — 조제 끝난 처방(`status='dispensed'`)을 진료가 고치거나 지우지 못하게 막을 계획입니다(⑧). 약국이 조제를 되돌리는 기능이 필요하면 약국 쪽 일입니다.
  - **수납** — 검사·처치 오더의 `frequency`·`days`가 청구에 안 들어가는 것이 의도인지(⑭) 확인 부탁드립니다.
- **남은 일 · 알려진 문제**: `modules/consultation.md` 7절 ③~⑳. 고칠 순서는 실장님께 제안드렸습니다.
