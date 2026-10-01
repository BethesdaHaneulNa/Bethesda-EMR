# 접수 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-10-01 — 긴 전화번호(두 번호, 37자)에서 환자 찾기 표와 접수 화면

- **상태**: 확인 요청
- **왜**: 실장님이 시험 차트에 «+261 34 99 888 77 / +261 33 45 678 90» 같은 전화번호를 넣으심(총괄 경유). 전화 칸은 50자까지
- **본 것** (격리 9181, 1366×768, fr): 접히거나 넘치는 칸은 없었음. 다만 —
  · 환자 찾기 표: 전화 칸이 367px로 이름 칸(300px)보다 넓어짐 → 번호마다 한 줄, 위아래로(전화 칸 178px, 이름 칸 490px)
  · 같은 이름 확인 창: 한 줄로 두면 이름 칸이 60px도 안 남을 자리 → 같은 방식(이름 칸 282px 유지)
  · 검색 결과 목록(왼쪽): 긴 전화 뒤에서 생년월일이 «1992-» / «11-02»로 끊김 → 차트번호·생년월일은 nowrap, 전화는 번호 사이 « / »에서만 줄바꿈
  · 구분자 없는 49자 값(잘못 넣은 값): 표에서 170px 폭 안에서 줄바꿈, 표를 밀지 않음
- **고치지 않은 것**: 왼쪽 양식의 전화 입력 칸은 190px라 37자 전화가 한 번에 다 보이지 않음(칸 안에서 좌우로 움직임, 값은 그대로). 혈액형과 반반 나눈 줄 — 넓히려면 전화를 한 줄 통째로 주어야 함(양식이 한 줄 길어짐). 결정 필요
- **알아 둘 것**: 표 두 곳은 `mobile || phone`, 검색 결과 목록은 `phone || mobile`을 보여 줌(전부터). 접수 양식은 `phone`만 고침 — `mobile`이 따로 든 환자(가져온 자료)는 자리마다 다른 번호가 보일 수 있음
- **공유 파일**: `PatientFinder.jsx` — `phoneLines()`·`phoneText()`를 내보냄(다른 화면도 쓸 수 있음), 환자 표의 전화 칸만 바꿈
- **확인**: 위 자리 모두 DOM으로 잼(접힌 짧은 글자 0, 가로 넘침 0), 빌드 통과, 스택 내림
- **기다리는 것**: 접수 상태 단추 ①②③·(C)는 진료 세션의 「아무것도 안 적었다」 판정 함수를 기다림(총괄 지시). (C)의 제안은 보고에 적음
- **바꾼 파일**: `frontend/src/components/PatientFinder.jsx`, `frontend/src/pages/Registration.jsx`, `wiki/modules/reception.md`, `wiki/manual-fr/reception.md`, 이 노트

## 2026-10-01 — 「진료 / 중」으로 접힌 꼬리표(실장님 사진) 확인, 그리고 접수의 「← 대기로」「완료로 →」와 진료의 새 흐름

- **상태**: 확인 요청 (코드 변경 없음 — 꼬리표는 `b3af7ff`에서 이미 고쳐졌고 develop `a1540dd`에 있음)
- **꼬리표**: 실장님 사진의 줄(대기 목록, `RAZAFINDRAKOTO Andriamihaja Jean Baptiste Emmanuel`, 꼬리표 「진료 / 중」)은 세 탭이 같은 줄 틀을 쓰므로 `b3af7ff`의 `nowrap`·`flexShrink:0`으로 같이 고쳐짐. 앞 확인은 대기 탭만 쟀으므로 격리(1366×768)에서 세 탭 × ko·fr·en을 다시 잼 — 50자·83자·띄어쓰기 없는 42자 이름 모두 꼬리표 높이 20px(한 줄): 대기/진료중/완료, En Attente/En cours/Terminé, Waiting/In progress/Completed. 접힌 짧은 글자 0, 가로 넘침 0. 줄 아래 단추(「← 대기로」「완료로 →」)도 한 줄
- **접수 단추와 진료의 새 흐름**(「환자를 열기만 해서는 진료 중이 되지 않게」) — 지금 코드의 사실. 접수 단추는 모두 `PUT /visits/:id/status`(`registration`)이고 **`visit.status`만 바꿈, `consultation`은 보지도 건드리지도 않음. 조건은 「취소는 대기일 때만」 하나뿐**:
  · 대기 탭 「완료로 →」: 확인 창 뒤 `completed`, 수납 전이면 `visit_type='none'`(진료 없이 끝냄)
  · 진료중 탭 「← 대기로」: 조건·확인 없이 `waiting`. 「완료로 →」: 조건·확인 없이 `completed`(내원구분 유지)
  · 완료 탭 「← 대기로」: 조건·확인 없이 `waiting`
- **어긋나는 곳 셋**(격리에서 재현, 진료 기록이 있는 내원으로):
  · (A) 진료중 → 접수 「← 대기로」 → 접수 「대기 취소」가 **됨**(200) — 취소된 내원 아래 진료 기록이 남음. 「취소는 대기일 때만」 규칙이 막으려던 바로 그 경우. 진료의 「↩ 대기로」는 「아무것도 안 적었으면」인데 접수 쪽은 조건이 없음
  · (B) 진료중 → 접수 「← 대기로」 → 접수 「완료로 →」: 서버가 「진료 없이 끝냄」으로 보고 `visit_type`을 `none`으로 바꿈(초진 → 진료비 없음) — 실제로는 진료가 있었음
  · (C) 진료중 → 접수 「완료로 →」: 내원은 `completed`, `consultation.status`는 `in_progress` 그대로(진료 쪽 「완료」를 거치지 않음)
  · 지금은 의사가 환자를 다시 열면 `POST /consultations`가 `in_progress`로 되돌려 (A)(B)가 드물지만, 새 흐름에서는 열어도 대기 그대로라 더 자주 남
- **제안**(결정은 총괄·실장님): 서버 한 곳(`PUT /:id/status`)에서 — 진료 기록(`consultation` 줄)이 있는 내원은 ① 취소 거절, ② 「대기 → 완료」에서 `visit_type`을 `none`으로 바꾸지 않음, ③ 「진료중 → 대기」는 진료의 「↩ 대기로」와 같은 조건(아무것도 안 적었을 때) 함수 하나로. 접수 화면은 거절 코드를 화면 언어로
- **바꾼 파일**: 이 노트뿐

## 2026-10-01 — 긴 이름(50~80자)에서 접수 화면의 목록·꼬리표·표

- **상태**: 확인 요청
- **왜**: 실장님이 실행 중 EMR의 진료 대기 목록에서 긴 이름 옆 「대기」가 「대 / 기」로 접힌 것을 보심(총괄이 진료 쪽은 `e8db948`로 고침). 접수 화면의 같은 종류 자리를 모두 봄
- **찾아서 고친 것** (모양만, 서버·문구 변경 없음):
  · 대기 목록 줄: «En Attente» 꼬리표가 두 줄로 접힘 → 한 줄(nowrap·flexShrink 0)
  · 대기 목록 줄: 띄어쓰기 없는 42자 이름이 목록 전체를 옆으로 밀어 가로 스크롤(425 < 613px) → 낱말 안에서도 줄바꿈
  · 대기 목록 줄: 150자 주호소가 세 줄 넘게 → 두 줄까지 + `title`
  · 환자 찾기 창(환자 표): 차트번호 «26- / 00005», 전화, 생년월일, 머리글 «N° dossier»가 두 줄로 접힘 → 한 줄
  · 환자 찾기 창(내원 목록): 긴 의사 이름이 nowrap이라 표를 밀 수 있었음 → 의사 이름 줄바꿈, 창 머리의 환자 이름 줄바꿈(제목·닫기 단추는 한 줄)
  · 같은 이름 확인 창: 이름 칸이 142px라 83자 이름이 8줄 → 창 폭 760 → 900px(4줄)
  · 환자 머리줄: 미수 상자가 옆에 있으면 긴 이름이 230px 칸에 쌓임(머리줄 212px) → 상자가 아래 줄로 내려감(170px), 첫 글자 네모는 크기 유지
  · 검색 결과 목록·이전 진료 줄: 한 낱말이 길면 넘칠 수 있던 것 → 줄바꿈
- **고칠 것이 없던 자리**: 대기 탭 단추(이미 한 줄 — nowrap만 덧붙임), 「과 / 담당 의사」 목록(브라우저가 스스로 자름), 이름·성 입력 칸(입력 칸 안에서 스크롤), 알림 창(브라우저 기본 줄바꿈)
- **원칙**: 이름은 자르지 않고 줄바꿈(83자 이름은 대기 줄에서 세 줄). 주호소만 두 줄까지 + `title`. 대기 줄 높이는 가장 긴 경우 195px
- **내 몫이 아니라 손대지 않은 것**: 위쪽 띠의 로그인한 직원 이름(공용 TopBar) — 37자 이름은 1366에서 한 줄에 들어감. 더 긴 이름은 보지 않음
- **공유 파일**: `frontend/src/components/PatientFinder.jsx`(접수 주관, 다섯 화면이 씀) — 표 칸의 nowrap/줄바꿈과 머리줄만, 동작·props 변경 없음
- **확인** (격리 9181, 1366×768, ko·fr, 스택 내림): 50자·83자·띄어쓰기 없는 42자 이름, 150자 주호소(띄어쓰기 없는 것 포함), 57자 의사 이름, 10자 과 코드, 미수 1 217 300 Ar. 자리마다 DOM으로 잼 — 22자 이하 글자가 두 줄로 접힌 곳 0, 가로로 넘치는 칸 0(내원 목록 주호소의 말줄임만), 페이지 가로 스크롤 없음. 본 자리: 대기 목록 줄·탭, 환자 머리줄(미수 상자 포함), 이전 진료 줄, 검색 결과 목록, 환자 찾기 창(환자 표), 내원 목록 창(진료 화면에서 엶), 같은 이름 확인 창. 빌드 통과
- **시험 이름이 84자가 아니라 83자**였음(만든 이름을 세어 보니 한 자 모자람) — 결과에 차이 없음
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `frontend/src/components/PatientFinder.jsx`, `wiki/modules/reception.md`(3절 「긴 이름」, 변경표), `wiki/manual-fr/reception.md`(8번에 한 줄), 이 노트

## 2026-09-30 — 수납된 내원은 접수 화면의 저장으로도 과·의사를 바꾸지 못함

- **상태**: 확인 요청
- **왜**: 실장님 결정 「수납이 끝나기 전까지」(총괄 경유). 전과 길(`PUT /:id/transfer`)만 막고 접수 저장(`PUT /:id`)은 막지 않아 같은 규칙이 두 길에 달랐음
- **서버** (`visit.routes.js`):
  · 새 함수 `activeReceipt(db, visitId)`(취소 안 된 영수 번호 또는 null)를 두 길이 같이 씀
  · `PUT /:id`: 영수가 있고 과 또는 의사가 **실제로** 바뀌면 409 `{error, code:'VISIT_BILLED', receipt_no}`, 아무것도 쓰지 않음
  · 같은 값(글자 "8"도 숫자 8과 같게)이나 주호소·메모만의 저장은 그대로 됨, 수납의 `visit_type`만 저장도 그대로
  · `PUT /:id`의 404에도 `code:'VISIT_NOT_FOUND'`
- **화면** (`Registration.jsx`):
  · `sel.has_active_bill`이면 「Service / Médecin」 목록이 잠긴 칸 + `rc_visitBilledNoMove`(ko·en·fr)
  · 편집 중에 수납되면 저장 → 409 → 같은 문장으로 알림, 그리고 `refreshQueue()`로 잠금이 바로 걸리고 목록이 저장된 의사로 돌아감(`billedLock` useEffect, 자동 새로고침도 수납된 내원의 과·의사를 받아 옴)
- **공유 파일**: i18n `ko/en/fr.js`(rc_ 블록 한 키), `wiki/03-change-log.md`(한 줄)
- **확인** (격리 9181, 스택 내림):
  · `reception.api.mjs` 188/188(새로: `PUT /:id` 404 code)
  · DB 스크립트(영수 줄을 직접 넣음) 거절 3건: 과 변경 409 + receipt_no, 의사 비움 409, 거절 뒤 내원 그대로
  · DB 스크립트 허용 4건: 같은 값(글자)+주호소 200, 주호소만 200, 거절·허용 모두 기록 0줄, 영수 취소 뒤 과 변경 200 + 기록 1줄
  · 화면 KO: 수납된 내원은 목록 잠김 + 이유, 주호소 저장은 됨(DB 확인, 기록 0줄)
  · 화면 FR: 의사를 «—»로 바꾼 뒤 뒤에서 수납 → 저장 → 프랑스어 알림, 목록이 잠기고 «RC doctor»로 돌아감, DB 그대로
  · 빌드 통과
- **남은 것**: 진료 화면의 전과 단추(진료 세션)도 `sel.has_active_bill`로 미리 잠그면 같은 모양. 기록 탭 이름표는 총괄이 설정 세션에 전함
- **바꾼 파일**: `backend/src/routes/visit.routes.js`, `backend/test/reception.api.mjs`, `frontend/src/pages/Registration.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/modules/reception.md`, `wiki/manual-fr/reception.md`, `wiki/03-change-log.md`, 이 노트

## 2026-09-30 — 전과 뒤: history의 과는 내원의 과 (총괄 `119642e`), `consultation.department_id`를 읽는 곳

- **상태**: 확인 요청
- **커밋**: session/reception `5b918e8`(+ 이 노트를 바로잡은 뒤 커밋) — develop `119642e`를 받은 위(merge `e8cea45`). 코드 변경 없음
- **한 일**: 모듈 문서 4절 API 표의 `GET /api/patients/:id/history` 설명에 총괄의 고침(과·의사 = COALESCE(내원, 진료가 베낀 값))과 전과의 관계를 한 줄
- **`consultation.department_id`를 읽는 곳**(develop 전체 grep):
  · 백엔드에서는 `patient.routes.js` history의 COALESCE 보조값 하나뿐(`LEFT JOIN department d ON c.department_id = d.id`)
  · 쓰는 곳은 `consult.routes.js`(진료를 열 때 INSERT)와 `visit.routes.js` `applyTransfer`(전과)
  · `consult.routes.js`의 진료 조회는 `c.*`로 그 칸을 내보내지만 화면(`Consultation.jsx`)은 읽지 않음 — POST 때 보낼 뿐
  · 통계(`stats.routes.js`)·수납(`billing.routes.js`)은 `visit.department_id`를 읽음
  · 서류(`document.routes.js`)는 과를 읽지 않음 — 화면이 고른 내원의 `dept_code`를 넘김
  · 전과 길의 `consultation.department_id` 맞추기는 약속대로 둠
- **바꾼 파일**: `wiki/modules/reception.md`, 이 노트

## 2026-09-30 — 전과: `PUT /api/visits/:id/transfer` (실장님 요청, 총괄 약속대로)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `2028e87` ff 뒤)
- **한 일**:
  - **새 길** `PUT /api/visits/:id/transfer` `{department_id, doctor_id, reason?}` — registration 또는 consultation. 한 트랜잭션(내원 줄 `FOR UPDATE`): `visit.department_id`·`doctor_id` + 그 내원의 `consultation.department_id`. 진료 기록·처방·오더·`consultation.doctor_id`는 그대로
  - **거절**(모두 `{error, code}`):
    · 404 `VISIT_NOT_FOUND`
    · 409 `VISIT_CANCELLED`
    · 409 `VISIT_BILLED`(+`receipt_no`, 취소 안 된 영수가 있을 때 — 영수를 취소하면 다시 됨)
    · 400 `BAD_DEPARTMENT`(없음·쉼·빠짐)
    · 400 `BAD_DOCTOR`(의사가 아님·쉼·숫자 아님)
    · 400 `NO_CHANGE`
  - `doctor_id: null`(의사 없이)은 받음 — 접수가 의사 없이 등록할 수 있어서
  - **답**: `/today`와 같은 내원 줄(`dept_code`·`doctor_name`·환자 칸·`has_active_bill`)
  - **기록**: `audit.js` ACTIONS에 `VISIT_TRANSFER: 'visit.transfer'`(총괄 파일, 한 줄). `summary` «GEN · RABE Hery → PED · RAKOTO Aina», `before`/`after` = `{department_id, doctor, reason}`(바뀐 칸만). `department_id`는 기록 탭이 이미 과 이름으로 보여 줌
  - **접수 화면의 저장**(`PUT /:id`): 한 트랜잭션으로 바꾸고, 과·의사가 실제로 바뀌면 같은 함수 `applyTransfer()` — 기록 한 줄 + `consultation.department_id`. 같은 값 저장은 0줄. 화면은 그대로(«Enregistrement modifié — …» 알림도 맞음)
- **확인**(격리 스택, 새 DB):
  - `reception.api.mjs` **187 통과 · 0 실패**(전과 19건 새로 — 역할 8개 권한, 답 모양, `NO_CHANGE`·`BAD_DEPARTMENT` 2·`BAD_DOCTOR` 2·404·`VISIT_CANCELLED`, 기록 줄 수·사유, `PUT /:id`의 기록 1줄·같은 값 0줄)
  - DB로 본 것(격리 DB에 진료·영수를 직접 넣어): 의사 계정 전과 200 → `consultation.department_id`만 새 과, `doctor_id`·기록 그대로 / 유효한 영수 → 409 `VISIT_BILLED`, 영수 취소 → 다시 200 / 쉬는 과 → 400
  - 화면: 접수에서 «GEN – RABE Hery»로 접수 → 줄을 골라 «PED – RAKOTO Aina»로 바꿔 저장 → 대기 줄 «PED · RAKOTO Aina», 기록 탭에 한 줄
- **다른 세션에 부탁**:
  - **설정**: 기록 탭 이름표 — 종류 `visit.transfer`(fr «Changement de service / médecin», ko «전과(과·의사 변경)», en «Visit transferred»), 칸 `doctor`(Médecin / 담당의 / Doctor), `reason`(Motif / 사유 / Reason). 지금은 «visit.transfer», «doctor», «reason»이 저장된 이름 그대로 보임
  - **진료**: 단추가 부를 길은 위 모양 그대로. 거절은 `code`로 화면 언어 문장을 고르면 됨
- **총괄에 물을 것**: 접수 화면의 저장(`PUT /:id`)은 **영수가 있어도** 과·의사를 바꿀 수 있음(전부터 그랬고, 약속에 막으라는 말이 없어 그대로 둠). 전과 길과 같게 막을지는 결정해 주세요
- **바꾼 파일**: `backend/src/routes/visit.routes.js`, `backend/src/utils/audit.js`(한 줄), `backend/test/reception.api.mjs`, `wiki/modules/reception.md`(4절 두 표·변경 기록), `wiki/03-change-log.md`(1절 표 한 줄 + 전과 단락), 이 노트
- **공용 파일 변경**: `audit.js` ACTIONS 한 줄

## 2026-09-30 — `GET /visits/patient/:id`에 성별·생년월일·알레르기 (진료 세션 부탁)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`920e300` 위)
- **한 일**:
  - 내원 목록의 줄마다 `p.gender`, `p.date_of_birth`, `p.allergies`를 더함. 진료가 환자 찾기로 연 내원의 머리줄·알레르기 경고를 채울 때 `GET /patients/:id`를 따로 부르지 않아도 됨
  - 권한은 그대로(`registration`·`consultation`·`lab`·`payment`). 이 역할들은 모두 `GET /patients/:id`(SEARCH_READERS)로 같은 값을 이미 읽으므로 보이는 것이 넓어지지 않음
  - 날짜는 문자열 `YYYY-MM-DD`(총괄의 DATE 파서)
- **확인**: `node --check`, 격리 스택 `reception.api.mjs` 168/0, `GET /visits/patient/1` → `gender "M"`, `date_of_birth "1990-05-03"`, `allergies "Pénicilline"`
- **바꾼 파일**: `backend/src/routes/visit.routes.js`, `wiki/modules/reception.md`(4절 API 표), 이 노트
- **다른 세션에 부탁**: 진료 — 원하면 `Consultation.jsx`에서 추가 조회를 빼도 됨(빼지 않아도 동작 그대로)

## 2026-09-30 — 3차 짧은 확인 `integration-test-2026-09-30.md` 「3차 — 짧은 확인」

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `05b05ce` ff 뒤). **코드 변경 없음**
- **한 일**: coordinator.md 표의 항목만, 격리 스택 새 DB, 1366×768, 어두운·밝은 화면
- **결과**:
  - ✅ 로그인 첫 화면부터 계정 색, `<html lang>`
  - ✅ 수납 취소·바뀐 카드(투명도 1, 대비 통과), Caisse du jour
  - ✅ 설정: 금액 표기, 잠긴 칸 세 곳(5.87 / 5.46)
  - ✅ 임상병리: 결과표 여백 20 px
  - ✅ 진료 ①~④·⑥: 저장 잃음 없음, 기록 1줄, 알레르기 ⚠, 서랍 `inert`, «flacons», 머리줄
  - ✅ 접수 셋
  - **남음**: 수납 대기 목록 «· ·»(수납 몫)
  - **알림**: 진료 ⑤ — F5·창 닫기 때 고치던 줄 전체(이번엔 2칸)를 잃음. 전에는 1칸. `pagehide`에서 보내기를 검토할 만함
- **정정**: 2차의 「검색 목록에 사전 문장」은 잘못 봄(오른쪽 Dictionnaire 목록을 같이 셈) — 보고서에 줄 그음
- **준비**(격리 DB만): 알레르기 있는 가짜 환자·방문·약 가격은 API 스크립트로, 생년월일 없는 머리줄 확인을 위해 26-00002의 생년월일을 SQL로 비움
- **바꾼 파일**: `wiki/reference/integration-test-2026-09-30.md`(3차 절, 2차 한 줄 정정), 이 노트
- **공용 파일 변경**: 없음
- **다음**: 진료 세션 부탁(`GET /visits/patient/:id`에 성별·생년월일·알레르기) — 이어서 따로 커밋

## 2026-09-30 — 다시 통합 시험의 접수 몫: 성별 키보드, 방문 고르기 창, 「Terminer →」 문구

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `b8069d7` ff 뒤)
- **한 일** (총괄 지시 1~3):
  1. **[B] 성별**: `div` 두 개 → `role="radiogroup"`(`aria-labelledby`·`aria-required`) 안의 `button type="button" role="radio" aria-checked`. Tab 정거장 하나(고른 쪽, 없으면 Masculin), ← → ↑ ↓로 고르고 포커스도 옮김(`moveGender`), 스페이스·엔터는 클릭. 색은 그대로(이름표만)
  2. **[B] 방문 고르기 창**(`PatientFinder.jsx`):
     · **Motif**(주호소, 말줄임 + `title`)·**État** 칸 추가 — 기다림 / 진료 중 / 끝남 / Sans frais, 취소는 날짜 칸 딱지
     · 진료비 없이 끝난 내원은 «Rien à payer»
     · 창 너비 760 → 900, 칸 `nowrap`
     · 취소 줄의 `opacity 0.55` → 흐린 글자색 이름표(`t3`)
     · 서버 `GET /visits/patient/:id`에 `chief_complaint` 한 칸
  3. **[C] 「Terminer →」 확인 창**:
     · 영수 없음: «… « Sans frais » : rien à payer, le patient n’a pas à passer à la caisse.»
     · 영수 있음: «Cette visite a déjà un reçu : son type ne change pas. Voyez la caisse pour la suite.»
     · 대기 줄의 `has_active_bill`로 나눔. ko·en·fr 같이
     · `manual-fr/reception.md` §10과, 낡은 «à revoir» 주석(지난 날 방문이 수납에 안 뜬다)을 📅 줄 설명으로 고침
- **확인**(격리 스택 새 DB, 1366×768):
  - 빌드 통과, `node --check`, `reception.api.mjs` 168/0
  - **성별**: JJ에서 Tab → Masculin(`aria-checked=false`, `tabIndex 0`, 테두리 2px, `:focus-visible`) → → Féminin 선택(`aria-checked=true`, 포커스 따라감) → ← Masculin → Tab → 전화 칸. 한국어 «남/여», 대비 통과
  - **확인 창**: 영수 없는 내원 → «rien à payer…». 격리 DB에서만 영수 한 장을 넣은 내원 → «déjà un reçu…», Annuler면 그대로 대기
  - **방문 고르기 창**: 같은 환자의 세 줄이 «Erreur de saisie · Visite annulée · Non facturé» / «Contrôle · En Attente · Payé» / «Toux · Sans frais · Rien à payer»로 구분됨
    · 진료·검사실·수납에서 어두운·밝은 화면 모두 가로 넘침 없음, 문서 768, 대비 통과
    · 한국어 머리 칸 «주호소 · 상태», «진료비 없음 · 받을 돈 없음»
    · 약국(환자 모드) 창도 넘침 없음
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `frontend/src/components/PatientFinder.jsx`(공용, 접수 주관), `backend/src/routes/visit.routes.js`, `frontend/src/i18n/{ko,en,fr}.js`(`rc_` 구역 — `rc_completeNoConsult` 고침 + `rc_completeNoConsultBilled`·`rc_colVisitState`·`rc_billNothing`), `wiki/modules/reception.md`(2·3절·변경 기록), `wiki/manual-fr/reception.md`, 이 노트
- **공용 파일 변경**: `PatientFinder.jsx`(진료·수납·검사실·약국이 씀 — 동작은 그대로, 칸만 더함), i18n `rc_` 구역
- **본 것(수납 몫, 참고)**: 수납 대기 목록에서 과·의사 없는 줄이 «26-00030 · ·»처럼 점만 남음(접수 대기 줄에서 고친 것과 같은 모양). 수납 세션에 전해 주세요
- **다른 세션에 부탁**: 위 한 줄(수납)

## 2026-09-30 — 다시 통합 시험 `wiki/reference/integration-test-2026-09-30.md`

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `764eca7` ff 뒤). **코드 변경 없음**
- **한 일**: 시작 신호(coordinator.md 「✅ 고친 것 모두 합침」) 뒤 격리 스택 새 DB(037까지)에서 시나리오 1부(1차 ①~⑨ + 고친 곳 표) + 2부(지난 날 방문 📅, 서류, 영상 한 건, 한국어, 밝은·어두운 화면, 서랍, 업데이트 흉내) + 총괄이 더한 것(Tab 테두리, 오더 코드 가격 기록, 인쇄물, ▲▼, 저장 알림)
- **결과**:
  - 1차 항목 대부분 ✅ 고쳐짐(남은 것은 C8 영어 시드뿐)
  - 막힌 곳 없음, A 없음
  - 돈: 1부 끝 39 300, 하루 끝 83 400 — 실제 = 수납 Caisse du jour = 통계 Caisse
- **새로 찾은 B**:
  - **접수**: 성별 칸이 키보드로 안 됨(`div`), 방문 고르기 창(`PatientFinder.jsx`)에서 같은 날 두 방문이 똑같이 보임 — 둘 다 **내 몫, 다음 일로**
  - **수납(+디자인)**: «Remplacé» 카드 대비 4.0~4.47
- **C**: 0 Ar 방문 문구(접수 확인 창 «part à la caisse» — 내 몫 + 수납 설명서), 진료 닫힌 서랍 Tab·«flaco/ns»·«M/»·Hernie 영어 빈칸, 설정 금액 표기·기록 4줄, 서류 발행·취소 기록 여부(결정), 결과표 ✕ 열 끝, `<html lang>`, 시드
- **준비 SQL**(격리 DB만): `UPDATE visit SET visit_date = CURRENT_DATE - 1 WHERE patient_id = <RASOA Marie>` — 지난 날 방문을 만들려고
- **바꾼 파일**: `wiki/reference/integration-test-2026-09-30.md`(새로), `wiki/reference/integration-test-2-scenario.md`(G절 — 총괄이 더한 것), 이 노트
- **공용 파일 변경**: 없음
- **다른 세션에 부탁**: 보고서 「고칠 것 — 세션별」대로(총괄이 나눠 주세요)

## 2026-09-30 — 「N° dossier」 칸을 잠긴 칸 이름표로, 시나리오 항목 더함

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `5077d8e` ff 뒤)
- **한 일** (총괄 답):
  1. 「N° dossier」 칸: `opacity`(빈 칸 0.7)를 빼고 바탕 `var(--field-locked)`, 글자 `var(--text-locked)` — 설정 화면 잠긴 칸(`LOCKED_IS`)과 같은 이름표. 안내 글자 색은 손대지 않음(디자인 `::placeholder` 몫). 새 색 없음
  2. 시나리오 `integration-test-2-scenario.md`에 더함: B7b 설정 Items de test 1366 저장 단추(`66ae1f9`), B7c 약국 환자 고른 상태의 «Terminer délivrance»·재고 탭(`8e45fb3`), C6 « gél. »(`49575a2`+`a60788f`), C9 « Stock n », D1 바뀐·넘어간 영수 표시, D2 «Ce qui change», D3 «Caisse du jour»(`e80ebd8`), D4 약 가격 변경 기록(설정 — 들어온 뒤), 2부 E5 밝은 화면 저장 알림, E6 이 칸 다시 재기
- **대비**(부모 투명도까지 곱함, 격리 스택 새 DB, 1366×768, 테마는 상단 단추로 실제 전환):

  | 화면 | 칸 바탕 | 번호 글자 | 안내 글자 «Généré automatiquement» | 칸 테두리 | 칸 바탕 vs 둘레 |
  |---|---|---|---|---|---|
  | ☀ 밝은 | #EEF1F5 | **5.46** ✅ | 4.07 ❌(4.5) | 3.82 ✅ | 1.13 |
  | 🌙 어두운 | #15181F | **5.87** ✅ | 3.85 ❌(4.5) | 1.39 ❌(3) | 1.02 |

  - 안내 글자: 투명도를 뺀 뒤에도 브라우저 기본색(#757575)이 잠긴 바탕 위라 4.5에 조금 모자람 → 디자인 `::placeholder` 규칙 뒤 다시 잼(시나리오 E6)
  - 어두운 테두리 1.39는 다른 입력칸과 같은 값(디자인의 어두운 화면 대비 표에 있는 것) — 이 칸만의 문제 아님
- **확인**: `npm run build`, 새 DB `reception.api.mjs` 168/0, 화면(FR·밝은/어두운) 빈 칸·번호 있는 칸
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `wiki/modules/reception.md`(3절·변경 기록), `wiki/reference/integration-test-2-scenario.md`, 이 노트
- **공용 파일 변경**: 없음
- **다른 세션에 부탁**: 디자인 — `::placeholder` 규칙이 들어오면 알려 주세요(이 칸 다시 잼)

## 2026-09-30 — 금액 표기, 밝은 화면·1366×768 점검, 다시 통합 시험 시나리오

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `15b1a61` ff 뒤)
- **한 일** (총괄 지시 1~3):
  1. **금액 표기**: 「Dû / Rembours.」 상자 → `fmtAr(n, lang)`. 프랑스어 «17 300 Ar»(줄 안 바뀌는 빈칸 U+00A0 — 약국 `fmt`과 같은 글자), 한국어·영어 «17,300 Ar». 금액 칸 `nowrap`(1366폭에서 «3 000» / «Ar»로 쪼개지던 것)
  2. **밝은 화면·1366×768 한 바퀴**(FR·KO): 기본, 새 환자, 결과 없음, 지난 날짜, 대기 줄 선택, 완료 탭, 같은 이름 창에서 `__audit()`
     - 고친 것(접수 파일): 같은 이름 창의 차트번호·날짜가 두 줄로 쪼개짐 → `nowrap`. 의사 없이 접수한 대기 줄 «26-00029 · ·», 전화 없는 검색 줄의 빈 점 → 빈 값 빼고 잇기
     - **디자인 세션에 넘길 목록**(색은 손대지 않음):
       · 「N° dossier」 빈 칸 안내 글자 «Généré automatiquement» — 밝은 화면 **2.67 : 1**(4.5 필요), 어두운 화면 2.61. 원인: 안내 글자 색이 이름표가 아니라 브라우저 기본(#757575)이고, 부탁받은 투명도 0.7이 그 위에 곱해짐. 투명도를 빼면 4.6(밝은). 제안: 이 칸은 `opacity`를 빼고 안내 글자에 이름표 색(`::placeholder`)을 주기 — 어느 쪽으로 할지 디자인이 정해 주면 접수가 바꿈
       · `audit-in-browser.js`가 **부모의 투명도**를 곱하지 않음 — 칸 자체의 `opacity`만 봄. 위 칸도 원래 판으로는 안 잡혔을 수 있음. 부모까지 곱한 판을 이번 점검에 씀(시나리오 0절)
       · 참고: 꺼진 ▶·저장 단추(기준상 예외), 장식 🔎(투명도 0.35)는 셈에서 뺌
  3. **다시 통합 시험 시나리오** `wiki/reference/integration-test-2-scenario.md`: 1부 = 1차 그대로 + 고친 곳 확인 표(A1~C8, 커밋별), 2부 = 지난 날 방문 📅(격리 DB에서 날짜 하루 당기기), 서류 한 장, 영상 검사(장비 목록은 `GET /api/worklist/dicom-mwl`로), 한국어 한 바퀴, 밝은 화면 한 바퀴, 진료 B2 재현 순서
- **진료 B2(서랍) 정정**: 격리 스택에서 DOM으로 재 보니 서랍은 **0.3초 안에 닫힘**(0초 −0.4px → 0.1초 −274px → 0.3초 −290px). 1차에서 본 것은 브라우저 창 캡처 지연으로 보임 — 1차 보고서 그 줄에 정정 표시. 시나리오 2부 F에서 사람 눈으로 한 번 더 보고 닫기
- **확인**: `npm run build`, 격리 스택 새 DB `reception.api.mjs` 168/0. 화면: FR «17 300 Ar»·«3 000 Ar»(U+00A0) 한 줄, 같은 이름 창 한 줄, 대기 줄 «26-00029». 밝은 화면이 새로 고침 뒤에도 기억됨
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `wiki/modules/reception.md`(3절·변경 기록), `wiki/reference/integration-test-2-scenario.md`(새로), `wiki/reference/integration-test-2026-09-29.md`(B2 줄 정정), 이 노트
- **공용 파일 변경**: 없음
- **다른 세션에 부탁**: 디자인 — 위 「N° dossier」 안내 글자, `__audit()` 부모 투명도. 진료 — B2는 할 일 없음(재현 안 됨)

## 2026-09-29 — 통합 시험 뒤 접수 몫: 검색 결과 없음 안내, 생년월일 붙여넣기, 시험 스크립트 로그인

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `fd0cd02` ff 뒤 — 디자인 세션 색 작업 `92510ac` 포함)
- **한 일** (총괄 지시 1·2):
  - **시험 스크립트** `backend/test/reception.api.mjs`: 새 스택에서 `/auth/setup`이 로그인 ID를 늘 `admin`으로 정하는데(S3) 스크립트는 `rctest`로 로그인하려다 실패. → 비밀번호·이름만 보내고 **돌려받은 `user.login_id`**를 저장. 설정 직후 바로 임시 폴더에 저장(뒤에서 멈춰도 다음 실행이 로그인)
  - **검색 결과 없음**: 0건이면 칸 아래 한 줄 `rc_noPatientFound` — FR «Aucun patient trouvé pour « … » — cliquez sur « + Nouveau patient ».», KO 「「…」 환자를 찾지 못했습니다 — 「+ 신규 환자 입력」을 누르세요.」. 검색어를 고치거나 신규 환자를 누르면 사라짐. 늦게 온 옛 검색 답은 버림(`searchSeq`)
  - **생년월일 붙여넣기**: 세 칸 어디에 붙여도 `19900503`·`1990-05-03`(`/` `.` 공백, 한 자리 월·일)·`03/05/1990`(일 먼저)을 연·월·일로 나눔, 커서는 일 칸. 다른 글은 보통 붙여넣기. `MM/DD/YYYY`(미국식)는 받지 않음 — 현지는 일 먼저
  - **디자인 세션 부탁**: 「N° dossier」 빈 칸 투명도 0.6 → 0.7. 새 색은 넣지 않음
- **확인**:
  - `npm install --no-package-lock` + `npm run build` 통과, `node --check` 통과
  - 날짜 해석 13가지 경우를 node로 따로 돌려 봄
  - 격리 스택 **새 DB**에서 `reception.api.mjs` 168 통과 · 0 실패, 두 번째 실행(저장된 로그인 재사용)도 168/0
  - 화면(FR): 없는 이름 → 안내 줄, 한 글자 더 치면 사라짐. 붙여넣기 세 형식 → 1990 | 05 | 03. 붙여넣은 날짜로 저장 → DB `1990-05-03`
  - 화면(KO): 안내 줄 한국어, 결과 있는 검색은 전처럼 목록
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `frontend/src/i18n/{ko,en,fr}.js`(`rc_` 구역에 `rc_noPatientFound` 하나), `backend/test/reception.api.mjs`, `wiki/modules/reception.md`(2·3절·변경 기록), `wiki/manual-fr/reception.md`(En bref 3, 생년월일, 메시지 표), `wiki/reference/changelog-1.5.0/reception.md`, 이 노트
- **공용 파일 변경**: i18n 세 파일의 `rc_` 구역만
- **다음**: 총괄이 coordinator.md에 「고친 것 모두 합침」을 적으면 통합 시험 다시(고친 곳 + 지난 날 방문 📅, 서류 한 장, 한국어 한 바퀴)
- **다른 세션에 부탁**: 없음

## 2026-09-29 — 통합 시험(배포 전 점검) `wiki/reference/integration-test-2026-09-29.md`

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`develop` `de7bc8c` 위). **코드 변경 없음**
- **한 일**: `develop` 최신으로 격리 스택을 새 DB(마이그레이션 001–036, 가져온 약 101개)로 띄워, 프랑스어·1366×768 화면에서 환자 RAKOTO Jean의 하루를 ①설정 → ②접수 → ③진료 → ④검사실 → ⑤약국 → ⑥수납 → ⑦검사 취소 → ⑧통계 → ⑨Journal 순서로 각 모듈 프랑스어 설명서대로 따라 함. 단계마다 「한 것 · 화면에 뜬 것 · 설명서와 다른 곳 · 막힌 곳」 표
- **결과**: 흐름은 끝까지 돎. 설명서 문구와 화면 문구 거의 같음. **현금 50,300 − 11,000 = 39,300 = 통계 Caisse**(1 Ar까지 맞음)
  - 막힌 곳 하나: 조제된 약은 진료에서 지울 수 없음(설계대로) → 설명서 §6·§7 흐름(추가 → 추가 수납 → 조제 전 지우기 → 정정)으로 차액 환불 확인. 「환자가 약을 돌려줄 때」는 결정 필요
  - 고칠 것 표: A 3개(빈 외부 처방전에 번호, 1366폭 수납 화면 잘림, 약 반환 길 없음), B 9개, C 9개 — 세션별
- **접수 몫**(`Registration.jsx`는 디자인 세션 작업 중이라 손대지 않음): 검색 결과 없을 때 안내 없음, 생년월일 붙여넣기 시 월·일 사라짐(C). `backend/test/reception.api.mjs`가 새 스택에서 로그인 실패(처음 설정 로그인 ID가 `admin`으로 고정) — 다음 작업에서 고침
- **바꾼 파일**: `wiki/reference/integration-test-2026-09-29.md`(새로), 이 노트
- **공용 파일 변경**: 없음
- **확인 못 한 것**: 영상 녹화(요청대로 안 함), 실제 인쇄, 영상·PACS, 서류, 지난 날 방문, 한국어 화면
- **다른 세션에 부탁**: 보고서 「고칠 것 — 세션별」 표대로(총괄이 나눠 주세요)

## 2026-09-29 — v1.5.0 변경 내역 초안 `wiki/reference/changelog-1.5.0/reception.md`

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`1d48ed1` 위). 코드 변경 없음
- **한 일**: 폴더 README 규칙대로 영어, v1.4.0과 같은 목소리(전에는 → 문제 → 이제)로 씀. 약 1,200단어
  - **보이는 변화 먼저**:
    · 대기 취소 오타와 진료 시작 뒤 취소 막기
    · 접수 수정이 진료를 되돌리던 것 + 자동 새로고침
    · 한 번만 등록 + 같은 이름·같은 날 경고
    · 내원구분 단추와 진료 없이 완료 = 진료비 없음
    · 작업일자
    · 차트번호 해마다 1번부터
    · 작은 것들(성별 필수, 화면 언어의 안내, 검색, 취소된 내원 표시)
  - **안 보이는 것**(Under the hood):
    · 생년월일 하루 밀림(원인은 접수에서 찾고 총괄이 전체를 고침 — 그렇게 적음)
    · 권한 검사, 변경 기록, 보낸 칸만 저장, 검사·400
    · 새 API 두 개
    · 마이그레이션 **029**, 시험 파일 두 개
  - **After updating**: 직원 안내 세 가지, 권한을 손으로 좁게 준 계정은 **Registration** 필요, 차트번호는 할 일 없음
  - 돈·환자 안전에 닿는 것 빠짐없이: 수납 목록에서 빠지던 것(②), 진료비(⑦·⑳), 성별, 생년월일, 중복 차트
- **대조**: 적은 영어 화면 글자를 `en.js`와 맞춤 — **Cancel Waiting / Remove**, **Complete →**, **New Visit / Follow-Up / No fee**, **Registration**, 역할 **Front desk / Nurse**. 사실은 위키 8절·인계 노트·커밋 기준
- **바꾼 파일**: `wiki/reference/changelog-1.5.0/reception.md`(새로), 이 노트
- **공용 파일 변경**: 없음
- **확인 못 한 것**: 수납의 「지난 날 완료 내원」 수정이 v1.5.0에 들어갈지 몰라 이 글에는 넣지 않음(수납 몫). 들어가면 총괄이 합칠 때 수납 글과 이어 주세요
- **다른 세션에 부탁**: 없음

## 2026-09-29 — 현지 직원용 프랑스어 설명서 `wiki/manual-fr/reception.md`

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`18c52cd` 위, `develop` ff 뒤). 코드 변경 없음
- **한 일**: `wiki/manual-fr/README.md` 규칙대로 새로 씀
  - 구성: 소개 → En bref(8단계) → Pas à pas(13소절) → Si ce message apparaît(17줄) → À ne pas faire(6) → Qui appeler
  - Pas à pas 13소절: 화면, 새 환자, 다시 온 환자, **Type de Visite**(Nouvelle·Suivi·Sans frais, Suivi 자동 선택과 「다른 병이면 Nouvelle」), **같은 이름 경고**, **오늘 이미 접수**, 환자 정보만 저장, 대기 상태, 수정·대기 취소, **Terminer →(Sans frais)**, **Date de travail**, Trouver patient 창(Visite annulée 표시), Dossier (vue)
  - **성별 필수**는 2·「Si ce message」·「À ne pas faire」에 넣음
  - 약 2,200단어 — A4 3~4쪽. 가짜 이름만(RAKOTO Jean, 26-00001)
  - **색 이름은 쓰지 않음** — 디자인 세션이 `Registration.jsx`의 색을 바꿀 예정이라 단추는 이름으로만 가리킴
- **대조**:
  - 설명서의 굵은 글자 59개를 `fr.js` 값과 자동 대조 → 3개만 파일에 그대로 없음(「+ Nouveau patient」「Service / Médecin」「Service / Type de Visite」 — 화면이 두 번역을 이어 붙여 보여 주는 글자라 맞음). 강조용 굵은 글자는 규칙(굵게 = 화면 글자)에 맞게 기울임으로 바꿈
  - 격리 스택(develop `18c52cd` 위)을 프랑스어로 띄워 확인:
    · 접수 화면 글자 전체
    · 설정의 「👥 Personnel」, 역할 「Accueil」「Infirmier(ère)」「Médecin」, 편집 창 권한 칸 「🏥 Enregistrement」
    · 같은 이름 창·확인 창·안내 문구는 앞선 작업에서 프랑스어 화면으로 본 문구 그대로
- **주석**: `<!-- à revoir -->` 1곳 — 11절, 수납 목록이 지난 날 완료 내원을 아직 못 보여 줌(수납 수정 중). 고쳐지면 그 문단을 바꿈
- **확인 못 한 것**:
  - 브라우저 확인 창의 단추 글자(OK/Annuler)는 브라우저 언어를 따름 — 설명서는 「OK」·「Annuler」로 씀. 현지 PC가 영어 브라우저면 「Cancel」로 보일 수 있음
  - 그림은 넣지 않음(글만으로 읽히게 먼저 — 필요하면 1366×768로 떠서 추가)
- **바꾼 파일**: `wiki/manual-fr/reception.md`(새로), 이 노트
- **공용 파일 변경**: 없음 · **번역 키**: 없음
- **다른 세션에 부탁**: 없음. 디자인 세션 참고 — 설명서는 색을 말하지 않으니 색이 바뀌어도 고칠 것 없음

## 2026-09-29 — 다음 일 ①②③: 2절 대조 · 지난 날 정리가 수납·통계에 보이는 모습 · 7절 남은 것 (+ ⑱ 시험 보강)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`76457c9` 위, `develop` ff 뒤). 코드 변경 없음(위키·시험만)
- **① 2절 대조**:
  - 2절의 프랑스어 이름 94개를 `fr.js` 값과 자동 대조하고, 화면 글자 전체(`get_page_text`)와도 비교
  - 다른 곳 세 개를 고침:
    · 설정 탭 「👥 Staff」 → **「👥 Personnel」**
    · 역할 「Front Desk」 → **「Accueil」**(설정 세션이 번역한 뒤로 바뀜, 6절 한 곳도)
    · 차트번호 칸 「N° Dossier」 → **「N° dossier」**
  - 나머지는 합쳐 쓴 이름(「Service / Médecin」 등)·값을 넣은 예시·키 이름(Enter)이라 맞음
  - 작업일자·성별 필수·완료 단추·같은 이름 경고는 각 작업 때 2절·2.8에 넣어 두었고, 화면과 같음을 확인
- **② 지난 날 정리 → 수납·통계** (격리 스택, 스크립트 `scratchpad/pastday_flow.mjs` — 어제 날짜 내원 3건을 만들고 접수 화면과 같은 호출로 정리):
  | 어제 남은 내원 | 정리 | 결과 |
  |---|---|---|
  | 대기 | 대기 취소 | `cancelled` |
  | 대기 | 「Terminer →」 | `completed` · `none` |
  | 진료중(의사가 진료를 엶) | 「Terminer →」 | `completed` · `newVisit`(그대로) |
  - **통계**(어제 하루): 진행중 3 → 0, 완료·취소 수가 맞게 바뀜. 진료비 없음 1건은 총 내원과 「기타」에 들어감
  - **수납 대기**: 세 건 모두 **안 뜸**. 진료비 없음·취소는 맞음. **진료한 내원도 안 뜸** — `billing.routes.js` 151행이 아직 `visit_date = CURRENT_DATE`(수납 세션 수정이 develop에 아직 없음). 수정이 들어오면 같은 스크립트로 다시 보겠음
- **③ 7절 남은 것**: 표의 ①~㉒는 모두 ✅ 또는 「하지 않음」. 「남은 것」 절을 지금 기준으로 다시 씀 — **접수 안에서 결정이 필요한 것 없음**
  - 다른 모듈에 걸린 것:
    · 수납 목록의 지난 날 완료 내원
    · 통계가 진료비 없음 내원을 「기타」 내원으로 세는 것(의도인지 통계 판단)
    · `i18n` 세 파일에 `chartNo` 키가 두 번(17·52행 근처, 처음 커밋부터 — 뒤의 값이 이김)
  - 결정 없이 가능:
    · 영어 화면 전체 확인
    · 동시 같은 날 접수의 잠금(필요할 때만)
- **⑱ 시험 보강**(총괄 승인 조건): `reception.chartno.sql`에 **「환자를 만들다 실패(롤백)한 뒤 다음 번호가 건너뛰지 않음」**, 다른 접두어(`ZZ-999999`)가 계산을 깨지 않음, DICOM 64자 확인을 더함 → 「chart number checks passed」
  - 숫자 비교(`::bigint` — `26-100000` > `26-99999`)와 파일 하나 = 트랜잭션 하나(`migrate.js`)는 원래 조건대로임
  - 격리 스택에 `029_…`가 적용됨을 로그로 확인
- **바꾼 파일**: `wiki/modules/reception.md`, `backend/test/reception.chartno.sql`, 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 영어 화면. 수납 목록의 수정은 아직 없어서 「고쳐진 뒤」는 못 봄
- **총괄 확인 요청 / 다른 세션에 부탁**:
  - **통계** — 진료 없이 완료한 내원(`visit_type='none'`)을 총 내원·「기타」로 세는 것이 맞는지
  - **총괄** — `i18n`의 `chartNo` 중복 키(세 언어). 지울 쪽을 정해 주시면 됨(뒤쪽 「N° dossier」가 지금 화면에 나오는 값)

## 2026-09-29 — ⑱ 차트번호 해마다 1번부터: 구현 (실장님 결정, 설계 메모 B안)

- **상태**: 확인 요청 — 단 **설계 메모(아래 항목 `5d53bc0`)의 질문 3개에 총괄 답이 아직 없음**. 규칙(「답이 없어도 다음 일을 계속」)대로 B안으로 구현함. B안이 아니면 합치기 전에 알려 주세요 — 되돌리기 쉽게 만듦(옛 시퀀스 남김, 데이터 안 바꿈)
  · 질문: ① B안 ② 옛 시퀀스 남기기(그렇게 함) ③ 올해는 지금 번호에 이어 가기(그렇게 함)
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`d092373` 위, `develop` ff 뒤)
- **한 일**:
  - **새 마이그레이션 `backend/sql/101_reception_chart_no_yearly.sql`**(접수 번호대 — 합칠 때 총괄이 다시 매김)
    · 인자 없는 옛 `generate_chart_no()`를 `DROP`
    · `generate_chart_no(p_day date DEFAULT CURRENT_DATE)` 생성 — advisory xact lock + 「그 해 `YY-숫자` 번호의 최대 + 1」, 99,999 넘으면 6자리
    · **데이터는 바꾸지 않음**. `chart_no_seq`는 남김
  - `POST /api/patients`를 한 트랜잭션으로(`BEGIN → 번호 → INSERT → COMMIT`, 실패 시 ROLLBACK) — 잠금이 COMMIT까지 유지되어 동시 등록에도 번호가 겹치지 않음
- **바꾼 파일**: `backend/src/routes/patient.routes.js`, `backend/test/reception.api.mjs`(⑱ 5건), **새** `backend/test/reception.chartno.sql`
- **공용 파일 변경**: 없음 · **번역 키**: 없음
- **DB 마이그레이션**: `101_reception_chart_no_yearly.sql` — 함수만 바꿈(데이터 변경 없음). 이미 있는 001은 안 고침
- **다른 모듈 영향**: 번호 모양(`YY-00000`) 그대로 — 영상 장비(DICOM PatientID)·문서·영수증·검색 모두 영향 없음. `generate_chart_no`를 부르는 곳은 `POST /patients`뿐(grep, 오프라인 설치 포함)
- **확인한 방법**(격리 스택 9181 — 기존 번호 26-00001~00027이 있는 DB에 101 적용, API 로그 `applying 101_…`):
  - `reception.api.mjs` **168/168**. ⑱ 5건:
    · **동시에 20명 등록 → 모두 201, 20개 모두 다르고 35~54로 이어짐**
    · 접두어 `26-`, 다음 환자 = 55
  - `reception.chartno.sql` → 「chart number checks passed」(전부 ROLLBACK)
    · 다음 해 1월 1일 = `27-00001`, 12월 31일 = `26-…`
    · `26-99999` 뒤 `26-100000`, `26-100001`
    · 모양이 다른 번호(`26-X…`)는 안 셈
  - **백업 복원**: `pg_dump` → 새 DB `restoretest`에 복원 → 다음 번호가 원래 DB와 같음(`26-00057`). 복원본의 `chart_no_seq`를 1로 망가뜨려도 그대로 `26-00057`. 시험 DB는 지움
  - 옛 시퀀스 값은 27에서 멈춤(안 씀)
- **확인 못 한 것**:
  - 실제 새해 자정(날짜 인자로만 시험)
  - 운영 DB의 기존 번호에 이상한 모양이 섞여 있는지 — 운영 DB는 안 봄. 총괄이 반영 전에 `SELECT chart_no FROM patient WHERE chart_no !~ '^[0-9]{2}-[0-9]+$'`로 확인해 주세요(있어도 안 셀 뿐 오류는 아님)
- **위키**: `modules/reception.md` 머리, 1절, 2.4 N° Dossier 줄, 3절 **차트번호 채번**(다시 씀), 4절 `POST` 줄·`chart_no` 칸·색인, 7절 ⑱ 고침, 8절
- **총괄 확인 요청**: 위 설계 질문 3개, 운영 DB 번호 모양 확인, 마이그레이션 번호 다시 매기기
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ⑱ 차트번호 해마다 1번부터: 설계 메모 (코드 전, 총괄 확인 대기) · 5) 관리자 의사 확인

- **상태**: 보류 — 설계 확인 대기. 코드 변경 없음
- **5) 관리자 역할인 의사**: `GET /admin/doctors`는 `WHERE s.role = 'doctor' AND s.status = 'active'`(`admin.routes.js`) — 관리자 역할 계정은 **이미 목록에 없음**. 결정과 같아 고칠 것 없음

### ⑱ 지금

- `generate_chart_no()`(`001_schema.sql` 329행): `TO_CHAR(NOW(),'YY') || '-' || LPAD(nextval('chart_no_seq'), 5, '0')`. 시퀀스 하나가 해를 넘어 이어짐(26-00350 → 27-00351). `LPAD`는 긴 값을 **잘라서** 100000번째부터 `10000`과 겹침
- 부르는 곳: `POST /api/patients` 하나(grep — 오프라인 설치·스크립트에도 없음). **번호를 받는 문장과 INSERT가 다른 문장이고 트랜잭션이 아님**
- DB 시간대: 격리 스택 `SHOW timezone` = `Indian/Antananarivo`(DB 컨테이너 `TZ`). `CURRENT_DATE`가 병원의 오늘

### ⑱ 제안 (B안)

**번호를 「그 해에 이미 쓴 가장 큰 번호 + 1」로, 잠금 아래에서 계산**. 시퀀스·카운터 표를 쓰지 않음.

```sql
-- backend/sql/101_reception_chart_no_yearly.sql  (기존 001은 안 고침)
DROP FUNCTION IF EXISTS generate_chart_no();              -- 인자 없는 옛 함수 (같이 두면 호출이 모호해짐)
CREATE FUNCTION generate_chart_no(p_day date DEFAULT CURRENT_DATE) RETURNS varchar AS $$
DECLARE yy text := to_char(p_day, 'YY'); n bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bethesda.chart_no'));   -- 트랜잭션 끝까지 한 명씩
  SELECT COALESCE(MAX(split_part(chart_no, '-', 2)::bigint), 0) + 1 INTO n
    FROM patient WHERE chart_no ~ ('^' || yy || '-[0-9]+$');
  RETURN yy || '-' || CASE WHEN n < 100000 THEN lpad(n::text, 5, '0') ELSE n::text END;
END $$ LANGUAGE plpgsql;
```

그리고 `POST /api/patients`를 **트랜잭션 하나**로: `BEGIN → SELECT generate_chart_no() → INSERT → COMMIT`. 잠금이 COMMIT까지 유지되어, 두 창구가 동시에 새 환자를 만들면 두 번째는 첫 번째가 저장된 뒤에 번호를 계산함.

| 요구 | 어떻게 |
|---|---|
| 해가 바뀌면 1번부터 | 그 해 접두어(`27-`)의 번호가 없으면 `0+1` = `27-00001` |
| 이미 발급된 번호는 그대로 | 데이터는 건드리지 않음. 올해(26)는 지금까지의 가장 큰 번호 다음부터 이어짐(26-00027 → 26-00028) |
| 영상 장비·문서·영수증 | 번호 모양 `YY-00000` 그대로. 99,999 넘을 때만 `YY-100000`(6자리). `chart_no` VARCHAR(20), DICOM PatientID 64자까지라 문제없음 |
| 99,999 초과 | `LPAD`로 자르지 않고 그대로 늘림 — 지금의 「잘려서 겹침」 버그도 같이 없어짐 |
| 동시 등록 | `pg_advisory_xact_lock` + 같은 트랜잭션의 INSERT. 마지막 안전장치로 `chart_no UNIQUE`(이미 있음) |
| **백업 복원 뒤 첫 번호** | 시퀀스나 카운터에 기대지 않고 **환자 표에서 계산**하므로, 복원된 데이터만 있으면 맞음(시퀀스 값이 틀어져도 상관없음) |
| 해가 바뀌는 순간 | `CURRENT_DATE` = DB 시간대(`Indian/Antananarivo`) 기준 — `visit_date`의 「오늘」과 같은 기준 |
| 빈 번호 | 등록이 실패(롤백)하면 번호가 다음 사람에게 다시 쓰임 — 지금처럼 번호가 빠지지 않음 |

**A안(해마다 카운터 표)과 비교**: 카운터 표는 복원·손 수정 때 표와 실제 번호가 어긋날 수 있어, 결국 「최대값 확인」이 또 필요함. 환자 수가 수만 명이어도 한 해 접두어의 최대값 찾기는 순간(필요하면 나중에 `(split_part(chart_no,'-',1))` 색인).

**안 바뀌는 것**: 옛 `chart_no_seq` 시퀀스는 지우지 않고 둠(쓰는 곳만 없어짐 — 되돌리기 쉽게). `001_schema.sql` 안 고침.

**시험 계획**(격리 스택):
- HTTP: 새 환자 번호가 `26-` + 기존 최대 + 1. **동시에 20명 등록 → 번호 20개가 모두 다르고 이어짐**
- SQL(롤백 트랜잭션 안에서):
  · `generate_chart_no('2027-01-01')` → `27-00001`
  · `26-99999` 가짜 환자를 넣고 → `26-100000`
- **복원**: `pg_dump` → 새 DB에 복원 → 거기서 `generate_chart_no()` = 원래 DB와 같은 다음 번호
- 해 경계: `generate_chart_no('2026-12-31')` → `26-…`, `('2027-01-01')` → `27-00001`

**확인 받고 싶은 것**: ① B안으로 가도 될지 ② 옛 시퀀스를 남겨 둘지 지울지(남기기 추천) ③ 올해(26)는 지금 번호에 이어 가는 것이 맞는지(결정 문장 「해가 바뀌면 27-00001」대로라면 올해는 그대로)

## 2026-09-29 — ⑩ 작업일자 (실장님 결정)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나. 그 앞에 `develop`(`3aa3f87`)을 **병합** `1fd5c60`(ff 안 됨)
- **한 일**:
  - **서버** 새 `GET /api/visits/day?date=YYYY-MM-DD` (권한 registration)
    · 답: `{ date, today, visits }`. 행 모양은 `/today`와 같음 — 둘이 쓰는 SELECT를 `QUEUE_SELECT` 하나로
    · 날짜가 없으면 `CURRENT_DATE`(= `visit_date` 기본값의 오늘). 모양이 틀리면 400
    · `/visits/today`는 진료용으로 그대로
  - **화면** 왼쪽 맨 위 「Date de travail(작업일자)」: ◀ · 달력(`max`=오늘) · ▶(오늘이면 잠김) · 지난 날이면 「Aujourd’hui」
    · 오른쪽 목록 제목이 지난 날이면 「Attente / Terminé — 날짜」
  - **지난 날짜 = 보기와 정리만**(결정): 새 접수·접수 수정 잠김(단추 + `rc_pastDateNoNew`, 함수 첫 줄에서도 막음). 대기 취소·Terminer →는 됨. 환자 정보 저장(💾)은 날짜와 무관이라 됨
  - **자정** — 정한 것:
    · 오늘은 **서버 응답의 `today`로만** 앎(PC 시계 안 씀)
    · 「오늘을 따라가는」 화면(기본)은 자정 뒤 첫 새로고침(30초 안)에 저절로 새 날로
    · 직원이 고른 지난 날짜는 그대로 두고 노란 안내
    · 자정 전에 골라 둔 어제 내원은 `selIsPast`로 수정 잠김
  - 30초 새로고침은 mount 때 만든 함수라 작업일자를 ref(`workRef`)로 읽음
  - ⑲(중복 차트 정리)는 결정대로 위키 7절에서 「하지 않음」으로 닫음
- **바꾼 파일**: `backend/src/routes/visit.routes.js`, `frontend/src/pages/Registration.jsx`, `backend/test/reception.api.mjs`(표 1줄 + ⑩ 4건)
- **공용 파일 변경**: i18n `rc_` 블록에 7개(`rc_workDate` `rc_prevDay` `rc_nextDay` `rc_backToToday` `rc_queueOfDate` `rc_pastDateBanner` `rc_pastDateNoNew`)
- **DB 마이그레이션**: 없음
- **API 변화**: 새 라우트 `/visits/day`(registration). **설정 세션의 `settings.access.mjs` 표에 한 줄 추가 필요**
- **확인한 방법**:
  - `node --check`, `npm run build`. 격리 스택 9181, 시험 **163/163**
    · ⑩ 4건: 날짜 없음 = 오늘, 행에 `visit_date`·`has_active_bill`, `?date=어제` = 그 날만 + 오늘을 알려 줌, 모양 틀림 400
    · 권한표에 `/visits/day` 줄 — 접수만 통과
  - 화면(프랑스어). 어제 날짜로 「대기」 1건·「진료중」 1건을 DB에 만들어 둠:
    | 순서 | 결과 |
    |---|---|
    | 처음 | 오늘, ▶ 흐림, 어제 내원 안 보임 |
    | ◀ | 09-28 목록, 노란 안내, 헤더 「— 2026-09-28」, 접수 단추 잠김 |
    | 어제 대기 내원 고름 | 수정 잠김 + 안내, 대기 취소 가능 → 취소됨 |
    | 어제 진료중 → Terminer → | 완료, 내원구분 그대로(⑳ 규칙: 진료중 → 완료는 안 바꿈) |
    | 정리 뒤 | 09-28에 머묾 |
    | 「Aujourd’hui」 | 오늘, 안내 없음, 접수 가능 |
  - **자정 흉내**: 오늘 내원을 고른 채, 페이지 안에서 `/visits/day` 응답의 `today`·`date`를 09-30으로 바꿔 보이게 함 → 33초 뒤 작업일자 09-30, 헤더 「aujourd’hui」, 고른 09-29 내원은 수정 잠김 + 안내
  - 「Aujourd’hui」가 칸 폭에 잘려서 「Date de travail」 글자를 윗줄로 올림
- **확인 못 한 것**:
  - 실제 자정(서버 시계)은 기다리지 않음(흉내로만)
  - 한국어·영어 화면 안 누름(키는 넣음)
  - 달력 칸 직접 입력은 브라우저 기본 달력에 맡김
- **총괄 확인 요청 / 다른 세션에 부탁**:
  - **수납** — ⚠ 수납 대기(`/billing/pending`, `billing.routes.js` 151행)는 청구 전 내원을 `visit_date = CURRENT_DATE`인 것만 보여 줌. 그래서 작업일자로 **어제 「진료중」으로 남은 내원(의사가 진료하고 완료를 빠뜨린 경우)을 오늘 완료로 정리하면 수납 목록에 안 뜸** → 청구가 빠질 수 있음. 격리 스택에서 확인함(어제 완료된 32번이 pending에 없음). 수납에서 「지난 날 완료, 청구 없음」도 보이게 할지 판단 부탁. 위키 2.5a·5절에 직원 안내와 함께 적어 둠
  - **설정** — `settings.access.mjs`에 `['GET', '/visits/day', [REG]]`

## 2026-09-29 — ⑳ 진료 없이 「완료」 → 진료비 없음 (실장님 결정)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`c135972` 위)
- **한 일**:
  - 서버 `PUT /visits/:id/status`: `registered`·`waiting` → `completed`이면 **같은 UPDATE**에서 `visit_type='none'`. 단 취소 안 된 청구가 이미 있으면 그대로(수납 목록이 추가청구·환불로 흔들리지 않게). `in_progress → completed`와 다른 이동은 전과 같음
  - 화면: 대기 중 환자의 「Terminer →」에 확인 창 `rc_completeNoConsult`(수납 금액이 바뀌므로)
- **바꾼 파일**: `backend/src/routes/visit.routes.js`, `frontend/src/pages/Registration.jsx`, `backend/test/reception.api.mjs`(⑳ 3건)
- **공용 파일 변경**: i18n `rc_` 블록에 `rc_completeNoConsult` 1개
- **DB 마이그레이션**: 없음 · **번역 키**: `rc_completeNoConsult` (ko · en · fr)
- **다른 모듈 영향**:
  - 이 API를 부르는 곳은 접수뿐(grep). 진료의 「진료 완료」는 `consult.routes.js`에서 따로 바꾸므로 영향 없음
  - 수납: 이렇게 완료된 내원은 `none`(진료비 0)으로 수납 대기에 뜸 — 수납 코드는 `visit_type`을 읽기만
- **확인한 방법**:
  - `node --check`, `npm run build`. 격리 스택 9181, 시험 **151/151**
  - ⑳ 3건: 대기 → 완료 = `none`, 진료중 → 완료 = `followUp` 그대로, 완료 → 대기로 되돌려도 다시 안 바뀜
  - 화면(프랑스어): 「Terminer →」 → 「Terminer … sans consultation ? … « Sans frais »…」 → 아니오: 그대로 / 예: 완료, DB `none`
- **확인 못 한 것**:
  - 수납 화면에서 그 내원을 눌러 진료비 0을 본 것은 아님. 전에 API로 `none` → 진료비 0을 확인해 둠
  - 한국어·영어 확인 창은 눈으로 안 봄(키는 넣음)
- **위키**: `modules/reception.md` 머리, 2.1 버튼 표, 2.5, 2.8, 3절 상태 버튼, 4절 `/status` 줄, 5절 수납, 7절 ⑳ 고침, 8절
- **다른 세션에 부탁**: **수납** — 참고: 접수에서 「Terminer →」로 끝낸 내원은 이제 `visit_type='none'`으로 옵니다

## 2026-09-29 — ⑫ 성별: 안 눌린 상태로 시작, 안 고르면 저장 안 됨 (실장님 결정)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`2a76b5f` 위, 재부팅 뒤 `develop` ff)
- **한 일**:
  - `emptyForm.gender`를 `'M'` → `''`, `patientToForm`·`selectVisit`의 `|| 'M'` → `|| ''`
  - `formProblem()`에 성별 검사 → `rc_genderRequired`
  - DB에 성별이 비어 있던 기존 환자도 고르기 전에는 저장 안 됨(의도 — 결정의 뜻)
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`
- **공용 파일 변경**: i18n `rc_` 블록에 `rc_genderRequired` 1개
- **DB 마이그레이션**: 없음 · **번역 키**: `rc_genderRequired` (ko · en · fr)
- **확인한 방법**:
  - `npm run build`. 격리 스택 9181을 **새 DB로** 다시 띄움(재부팅 전 `down -v`). 시험 스크립트가 관리자·시험 계정을 새로 만들고 148/148
  - 화면(프랑스어): 새 환자 → 두 단추 모두 회색(안 눌림), 성·이름만 넣고 접수 → 「Choisissez le sexe (Masculin / Féminin).」 → Féminin → 접수됨, DB `F`
  - 화면(한국어): 「성별을 고르세요 (남 / 여).」
- **확인 못 한 것**: 영어 화면
- **위키**: `modules/reception.md` 머리, 2.4 Sexe 줄, 2.8 안내 줄, 3절 입력 검사, 7절 ⑫ 고침, 8절
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ⑭ 생년월일 칸 · 동명이인 악센트 무시 (재부팅 전 저장)

- **상태**: 확인 요청 (덩어리 끝까지 마침)
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`ec8559c` 위)
- **한 일**:
  - ⑭ `DobInput.emit`: 칸이 덜 찼을 때도 `연-월-일` 자리를 지키게(`-05-`). 예전엔 빈 칸을 빼고 이어 붙여 `05`가 되고, 그 값이 연도 칸으로 들어갔음. 세 칸 모두 비면 `''`. 반쪽 값은 `formProblem()`이 저장 전에 막음(1차)
  - 악센트: `GET /patients/similar`의 비교에 `FOLD()`(`translate(lower(…))`로 프랑스어·말라가시어 악센트 30자를 풀어 비교). **DB 값과 검색어 모두 같은 SQL**을 거쳐, 화면과 서버가 「같은 이름」을 다르게 볼 일이 없음. unaccent 확장은 마이그레이션이 필요해 쓰지 않음
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `backend/src/routes/patient.routes.js`, `backend/test/reception.api.mjs`(악센트 3건)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**:
  - `node --check`, `npm run build`. 격리 스택 9181, `reception.api.mjs` **148/148**
  - 악센트 3건: 악센트로 저장 → 없이 검색 / 없이 저장 → 있게·순서 바꿔 검색 / 다른 글자는 안 맞음
  - 대응표 30자 짝을 글자별로 출력해 확인(처음에 o를 하나 더 적어 31자였던 것을 잡음)
  - 화면(프랑스어): 월 `05` → 일 `03` → [ ][05][03], 그 상태로 저장 → 「Complétez la date de naissance…」, 연도 `1990` → [1990][05][03]
- **확인 못 한 것**: 목록 밖의 악센트(예: ő)는 다른 글자로 봄. 영어 화면 안 누름
- **위키**: `modules/reception.md` 머리, 2.2(악센트 한 마디), 4절 `similar` 줄, 7절 ⑭ 고침·남은 것에서 ⑭·악센트 뺌·제약 줄, 7절 「남은 것」 위에 **실장님 결정(⑫ ⑳ ⑲ ⑩) 도착 기록**, 8절
- **재부팅 준비**: 격리 스택을 **볼륨째** 내림(`down -v`) — 다음에 띄우면 DB가 새로 생김. 그때 시험 스크립트는 `RC_TEST_LOGIN` 없이 돌리면 관리자를 새로 만듦(OS 임시 폴더의 `bethesda-rc-test-9181.json`은 지우고 시작할 것 — 옛 DB의 계정이 들어 있음)
- **다음 작업(재부팅 뒤)**: 실장님 결정 — ⑫ 성별 미선택·안 고르면 저장 막기, ⑳ 「완료로 →」는 진료비 없음으로, ⑩ 오른쪽 목록 날짜 고르기(설계 먼저, 병원 화면 사진 대기). ⑲는 만들지 않음
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ⑬ 성별 M/F · 생년월일 엄격 검사 (총괄 파일, 허락받음)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나. 그 앞에 `develop`(`e29af7a`)을 **병합**함 — 제 커밋 `6c13b33`·`8dd267a`가 아직 develop에 없어 ff가 안 돼서(총괄 지시대로 merge)
- **한 일**:
  - `utils/validate.js`
    · `GENDERS`를 `['M','F']`로 — DB CHECK와 맞춤. `O`는 서버를 통과해 DB가 거절했었음
    · `badPatient`의 생년월일을 **`YYYY-MM-DD`이고 달력에 있는 날**만 받게. `new Date()`만으로는 `2020-02-30`이 3월 1일로 넘어가 통과했었음. 미래·1875년 이전 검사는 그대로
  - 접수 화면 `errText`: 총괄이 `dbError.js`에 넣은 22008 문구(`A date field has a date that does not exist`) → `rc_dobInvalid`
  - 시험 스크립트의 의사 계정 권한을 결정(의사 기본 권한에 약국 추가)에 맞춤 — 기대값은 권한에서 계산하므로 결과 같음
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`(한 줄), `backend/test/reception.api.mjs`
- **공용 파일 변경**: **`backend/src/utils/validate.js`**(총괄 파일, 이 두 가지만 허락받음) — `GENDERS`와 `badPatient`의 생년월일 부분. `badPatient`를 쓰는 곳은 `patient.routes.js`(POST·PUT)뿐, `GENDERS`는 `validate.js` 안에서만(grep 확인)
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **다른 영향**: 다른 세션 시험(`pharmacy.api.mjs`·`pharmacy.stock.mjs`)은 성별 `F`/`M`, 생년월일 `1990-01-01`만 보내서 영향 없음(grep). 화면은 원래 저장 전에 `YYYY-MM-DD`와 달력 검사를 하므로 직원이 보는 동작은 그대로
- **확인한 방법**:
  - `node --check`, `npm run build`. 격리 스택 9181(병합 뒤 `024_lab_ref_ranges` 적용). `reception.api.mjs` **145/145**
  - ⑬ 7건: 성별 `O` → 400 `gender must be one of M, F`(PUT·POST). `2020-02-30`·`1990-5-3`·`1990-13-01`·`yesterday` → 400 `date_of_birth is not a valid date`. `2024-02-29`(윤일) → 200
- **확인 못 한 것**: 22008 문구를 화면에서 띄워 보지는 않음 — 이제 `badPatient`가 먼저 400을 주므로 접수 경로에서는 22008까지 가지 않음(방어용 매핑)
- **위키**: `modules/reception.md` 머리, 3절 오류 문구 표, 4절 `POST /api/patients` 줄·`gender` 칸, 7절 ⑬ 고침(「날짜 검사」 줄 합침)·남은 것에서 뺌, 8절
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ⑯ 환자 검색: 이름 순서, % _ 글자 그대로, limit 검사

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`6c13b33` 위)
- **한 일**: `GET /api/patients`
  - 전체 이름을 **「성 이름」과 「이름 성」 둘 다**로 비교
  - 검색어의 `%` `_`를 글자 그대로 찾음(`ESCAPE '!'`). 역슬래시 대신 `!`를 쓴 것은 ④ 때 JS 템플릿 안에서 `\` 가 사라졌던 문제를 피하려는 것
  - 검색어의 앞뒤·겹친 공백 정리
  - `limit` 1~200(기본 50)·`offset` ≥0은 숫자로 읽고, 아니면 기본값(예전엔 500)
- **바꾼 파일**: `backend/src/routes/patient.routes.js`, `backend/test/reception.api.mjs`(⑯ 7건)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **다른 모듈 영향**: 환자 검색을 쓰는 다섯 화면(접수·PatientFinder) 모두 「이름 성」 순서로도 찾게 됨 — 결과가 조금 넓어질 뿐 줄어드는 경우는 없음(`%` `_`를 일부러 와일드카드로 쓰던 경우만 빼고)
- **확인한 방법**:
  - 격리 스택 9181, `reception.api.mjs` **138/138**. ⑯ 7건: 이름 성 순서, 대소문자·겹친 공백, `_`·`%` 한 글자만 쳐도 모든 환자가 걸리지 않음, `limit=abc&offset=-5` → 200, `limit=1` → 1명 이하, `limit=100000` → 200명 이하
  - API로 `Rakoto!`·`!`·`O'Brien` → 200(오류 없음), `Jean Rakoto` → 26-00001·26-00034
- **확인 못 한 것**: 화면에서 다시 누르지는 않음(화면 코드 변경 없음, 같은 API)
- **위키**: `modules/reception.md` 머리, 2.2(검색 순서 안내 한 줄), 4절 `GET /api/patients` 줄, 7절 ⑯ 고침·남은 것에서 뺌, 8절
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ⑮ 환자 찾기 창: 취소된 내원 표시

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`f0b3e3b` 위)
- **한 일**: 공용 `PatientFinder.jsx`의 외래 내역 표에서 `status='cancelled'`인 내원을 흐리게(`opacity 0.55`), 날짜에 취소선, 빨간 딱지 `rc_visitCancelled`(「접수 취소 / Visite annulée / Visit cancelled」). **숨기거나 막지는 않음** — 환자 이력의 일부이고, 취소된 내원으로 무엇을 할지는 각 화면이 정할 일(진료는 이미 서버가 409로 거절하고 안내함).
- **바꾼 파일**: 없음(자기 파일은 안 바꿈)
- **공용 파일 변경**:
  - `frontend/src/components/PatientFinder.jsx`(접수 주관, 총괄 허락) — 내원 모드 표의 줄 모양만. `onPickVisit`·검색·props는 그대로
  - i18n `rc_` 블록 `rc_visitCancelled` 1개
  - **보이는 곳**: 진료(환자 찾기·과거 내원), 수납(환자 찾기), 임상병리(환자 찾기). 약국·접수는 환자 모드라 내원 표가 없음
- **DB 마이그레이션**: 없음
- **확인한 방법**: `npm run build`. 격리 스택 9181에서 취소된 내원 1건 + 정상 4건이 있는 환자(Rakoto Jean)로 확인.
  | 화면 | 결과 |
  |---|---|
  | 진료(프랑스어) | 취소 줄만 흐리게 + 「Visite annulée」. 그 줄을 누르면 진료 쪽 기존 안내 「Cette visite a été annulée à l'accueil…」 그대로 |
  | 수납(프랑스어) | 같은 표시 |
  | 임상병리(한국어) | 「접수 취소」 딱지, 정상 줄 4개는 그대로 |
- **확인 못 한 것**: 수납·임상병리에서 **취소된 줄을 눌렀을 때** 각 화면이 어떻게 하는지는 보지 않음(이번 변경은 표시만이라 동작은 전과 같음)
- **위키**: `modules/reception.md` 2.7(직원용 — 수납상태의 ANNULÉ와 다른 것이라는 설명), 3절 환자 찾기 창, 7절 ⑮ 고침·남은 것 표에서 뺌, 8절
- **다른 세션에 부탁**: **수납·임상병리** — 참고: 환자 찾기 창에서 취소된 내원이 이제 표시됩니다. 취소된 내원을 골랐을 때 막거나 안내할지는 각 화면이 판단해 주세요(진료는 이미 막음)

## 2026-09-29 — 환자 인적사항 수정 기록 (변경 로그, 실장님 결정)

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`a7b40e8` 위, `develop` ff 뒤)
- **한 일**: `wiki/03-change-log.md` 규칙대로 `PUT /api/patients/:id`에 `writeAudit(ACTIONS.PATIENT_EDIT)`.
  - 라우트를 트랜잭션으로: `SELECT … FOR UPDATE`(전 값) → `UPDATE … RETURNING *`(새 값) → 같은 `client`로 기록 → `COMMIT`
  - `before`/`after`는 화면·API로 고칠 수 있는 `PATIENT_FIELDS` 13칸. 함수가 바뀐 칸만 남기고, `summary`는 바뀐 칸 이름들
  - **빈 칸의 `null`과 `''`를 같은 것으로 봄**(생년월일만 `null`). 접수는 기존 환자로 접수할 때마다 인적사항을 같이 저장하므로, 이게 없으면 안 고친 접수마다 줄이 쌓임
  - 새 환자 등록(`POST`)은 기록하지 않음. 환자 비활성 기능은 아직 없음(⑲ 결정 대기)
- **바꾼 파일**: `backend/src/routes/patient.routes.js`
- **공용 파일 변경**: 없음 — `utils/audit.js`는 가져다 쓰기만(`writeAudit`·`ACTIONS`·`changedOnly`)
- **DB 마이그레이션**: 없음 (022 `audit_log`는 총괄 것)
- **번역 키**: 없음 (화면 변화 없음)
- **확인한 방법**: 격리 스택 9181(develop `a7b40e8` 위, 022·023 적용 확인), DB를 직접 조회.
  - API로 확인한 경우:
    | 경우 | 결과 |
    |---|---|
    | 전화·알레르기 고침 | **1줄** — `summary` `phone, allergies`, 전→후 두 칸만, 직원 이름·역할·환자 이름·차트번호 채워짐 |
    | 같은 값으로 다시 | 0줄 |
    | 성별 `X`(DB 거절 400) · 없는 날짜(500, 아래) | 0줄(롤백) |
    | 새 환자 POST | 0줄 |
    | 이름·생년월일 고침 | 1줄(`first_name, date_of_birth`) |
    | 없는 환자 | 404, 0줄 |
    | 빈 칸이 모두 `NULL`인 환자에 화면처럼 `''`로 저장 | 전화 등은 기록 안 됨. 성별 `null → M`만 1줄 — 실제로 채운 것이라 맞음 |
  - 화면(한국어):
    · 기존 환자를 아무것도 안 고치고 접수 → 0줄
    · 알레르기만 고쳐 「환자 정보 저장」 → 1줄 `allergies: '' → 'Pénicilline'`
  - `reception.api.mjs` 131/131(회귀 없음)
- **확인 못 한 것**:
  - 설정의 「기록」 탭에서 읽어 보기 — 아직 없음(설정 세션 작업 중)
  - 기록 쓰기가 실패하는 경우(함수가 savepoint로 처리 — 총괄이 함수 단위로 확인함)
- **위키**: `modules/reception.md` 머리, 2절(직원용 한 줄 — 화면 변화 없음), 4절(API 표 + **변경 기록** 소절), 5절(설정 연결), 7절(남은 것에 「날짜 검사」 추가), 8절
- **총괄 확인 요청**: 시험 중 찾은 **원래 있던 틈** — API로 `date_of_birth: "2020-02-30"`을 보내면 500.
  · `badPatient`의 `new Date()`가 3월 1일로 넘겨 통과시키고, DB 오류 22008이 `sendDbError` 표에 없어서입니다.
  · 화면은 저장 전에 막아 직원에게는 안 보입니다.
  · 두 파일 모두 총괄 것이라 손대지 않았습니다. ⑬(validate.js 성별)을 할 때 `YYYY-MM-DD` 엄격 검사를 같이 넣어도 될지 알려 주세요
- **다른 세션에 부탁**: **설정** — 「기록」 탭에 `reception.patient.edit`이 들어옵니다. `summary`는 바뀐 칸 이름(영어 칸 이름, 예: `phone, allergies`)이라, 화면에서 칸 이름을 번역해 보여 주면 좋겠습니다

## 2026-09-29 — 위키 정리: 2절(⑦·④ 사용법), 7절 남은 것 분류, 8절 변경 기록

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`4caaedd` 위, `develop` ff 뒤). **코드 변경 없음**
- **한 일**:
  - **2절**
    · 2.1 버튼 표에 내원구분 단추와 동명이인 창 단추 추가
    · 2.2의 두 경고를 소제목으로 나눔(같은 이름 / 오늘 이미 접수)
    · 2.3 「다시 온 환자」에 재진 제안과 「다른 병이면 초진」
    · 2.4·2.6·2.8은 ⑦·④ 때 이미 반영된 것을 다시 확인
  - **7절**
    · 머리말을 「고친 것 / 하지 않기로 한 것 / 남은 것」으로
    · ⑫·⑳ 근거를 지금 코드 기준으로
    · 제약에 「주소 등 더 넣지 않음(실장님 결정)」「악센트·동시 접수」
    · 표 아래에 **「남은 것」** 두 표
  - **8절**: 수납 페이지 형식으로 — 처음 읽는 분을 위한 요약 + 커밋별 표(현장 눈으로 / 코드 쪽 / 커밋). 총괄 커밋 ㉑ `7ad4387`·㉒ `b01c6a0`도 넣음
- **남은 것 — 결정 필요 (6)**:
  | # | 무엇 | 추천 |
  |---|---|---|
  | ⑫ | 성별을 처음부터 「남」으로 골라 둘지 | 안 골라 두고 안 누르면 저장 막기 |
  | ⑳ | 대기 중 환자를 진료 없이 「완료」로 보내는 단추 | 먼저 현장에서 무엇에 쓰는지 여쭙기 |
  | ⑩ | 전날 대기·진료중으로 남은 접수 | 접수 화면에 「어제 남은 접수」를 보여 직원이 정리 |
  | ⑱·채번 | 해마다 1부터 다시 셀지, 99,999 넘으면 자릿수 | 모양 그대로, 넘을 때만 6자리 |
  | ⑲ | 둘로 나뉜 차트 합치기·숨기기 | 먼저 숨기기(비활성)만 |
  | 제약 | 관리자 역할 의사를 담당의 목록에 넣을지 | 그런 계정이 있는지부터 |
- **남은 것 — 결정 없이 가능 (5)**:
  | # | 무엇 | 비고 |
  |---|---|---|
  | ⑮ | 환자 찾기 창에서 취소된 내원에 「ANNULÉ」 표시 | 공용 PatientFinder |
  | ⑯ | 검색이 「이름 성」 순서로도 찾게, `%` `_`를 글자로, `limit` 검사 | |
  | ⑭ 나머지 | 생년월일 칸에서 월부터 치면 값이 연도 칸으로 옮겨감 | |
  | ⑬ | 성별 `O` 검사를 DB처럼 `M`/`F`로 | 총괄 파일 `validate.js` |
  | 동명이인 | 악센트만 다른 이름도 같은 이름으로 | |
- **바꾼 파일**: `wiki/modules/reception.md`, 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 위키 글자와 코드 대조 — 성별 기본값은 `emptyForm`·`patientToForm`, 단추·창 이름은 `fr.js` 값. 커밋 해시는 `git log`로 확인
- **확인 못 한 것**: 이번에는 화면을 띄우지 않음(코드 변경 없음)
- **총괄 확인 요청**: 「결정 필요」 6개를 결정 세션에 넘길지. 「결정 없이 가능」은 순서를 정해 주시면 진행(추천 ⑮ → ⑯ → ⑭ → 동명이인 악센트. ⑬은 총괄 파일)
- **다른 세션에 부탁**: 없음

## 2026-09-29 — ④ 중복·동명이인 경고 (실장님 결정)

> **총괄 확인 (2026-09-29)**: ④ 중복·동명이인 경고 `25a7fac` 합침 + 실행 중 EMR 반영. 실행 중 EMR(읽기만): 대문자·앞 공백이 있어도 같은 이름 1명, 성·이름을 바꿔도 1명, 없는 이름 0명, 의사 계정 403. 같은 날 두 번 접수의 409는 운영 DB에 쓰지 않으려고 누르지 않음 — 세션의 131건 시험.

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`31c584a` 위, `develop` ff 뒤)
- **한 일**: `decisions.md` 결정 그대로 — **경고만**(확인하면 진행), 같은 사람 판단은 **이름만**, 같은 날 두 번 접수도 경고만.
  - **동명이인**: 새 차트를 만들기 직전(접수 버튼·환자 정보 저장 버튼 둘 다) 새 API `GET /patients/similar`로 같은 이름을 찾음.
    · 대소문자·공백 무시, 성·이름 순서가 뒤바뀌어도 찾음.
    · 있으면 화면 안 창에 차트번호·생년월일·전화·마지막 내원(+성별)을 보여 주고 **이 환자로 / 그래도 새로 등록 / 취소**.
  - **「이 환자로」는 기존 환자를 불러오기만 함**(계획 노트의 「불러오고 바로 접수」에서 바꿈). 새 환자로 적던 알레르기·전화가 표시 없이 버려지지 않게 하려는 것. 의사·주호소·메모는 남기고, 직원이 확인 뒤 다시 누름.
  - **같은 날 두 번**: 화면의 오늘 목록으로 먼저 확인 창을 띄움(상태·의사 표시). 다른 창구가 먼저 접수해 목록에 없으면 서버 `POST /visits`가 409 `Patient already registered today`를 주고, 화면이 「다른 창구에서 방금…」으로 한 번 더 물은 뒤 `allow_duplicate: true`로 다시 보냄.
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `backend/src/routes/patient.routes.js`(새 `GET /similar` — `/:id`보다 앞), `backend/src/routes/visit.routes.js`(`POST /` 같은 날 확인), `backend/test/reception.api.mjs`
- **API 변화**:
  - 새 `GET /api/patients/similar?last_name=&first_name=` — 권한 registration
  - `POST /api/visits`: 오늘 취소 아닌 내원이 있으면 409. 본문 `allow_duplicate: true`면 통과. **다른 곳에서 `POST /visits`를 부르는 화면은 없음**(grep 확인)
- **공용 파일 변경**: i18n `rc_` 블록에 키 9개. 표 머리는 공용 키 `chartNo`·`name`·`dob`·`phone`을 읽기만
- **DB 마이그레이션**: 없음 (색인 불필요 — 작은 병원)
- **번역 키**: `rc_similarTitle` `rc_similarHint` `rc_similarUse` `rc_similarCreate` `rc_cancel` `rc_lastVisit` `rc_similarLoaded` `rc_dupVisit` `rc_dupVisitOther` (ko · en · fr)
- **시험 스크립트**: `reception.api.mjs`에 ④ 9건 추가.
  - 같은 이름 조회(대소문자·공백, 순서 뒤바뀜, 다른 이름 제외, 한쪽 빈 값 → 빈 목록, 돌려주는 칸)
  - 같은 날(첫 접수 201, 확인 없이 두 번째 409, `allow_duplicate` 201, 취소된 내원만 있으면 경고 없음)
  - 권한표에 `/patients/similar` 줄. 표의 `POST /visits`는 같은 환자를 거듭 접수하므로 `allow_duplicate` 붙임 → 총 **131/131**
- **버그 하나 잡고 감**: 처음 쓴 SQL `regexp_replace(…, '\s+', …)`가 JS 템플릿 문자열 안에서 역슬래시를 잃어 **글자 s를 공백으로** 바꿨음(「Rasoa」·「Permission」이 안 찾아짐 — 시험 스크립트가 잡음). `[[:space:]]+`로 바꾸고 주석을 남김
- **확인한 방법**:
  - `node --check`, `npm run build`. 격리 스택 9181(develop `31c584a` 위), 시험 스크립트 131/131
  - 화면(프랑스어):
    · 새 환자 「Rakoto」「Jean」 + 의사·메모 → 접수 → 창에 26-00001(생년월일·전화·마지막 내원) → 「Choisir ce patient」 → 26-00001이 불려 오고 의사·메모 그대로, 안내 문구, **새 차트 0**
    · 다시 누름 → 「…déjà enregistré(e) aujourd’hui (Terminé)…」 → 아니오: 내원 그대로 4건 / 예: 5건(재진 제안까지 정상)
  - 화면(한국어):
    · 「 jean 」「RAKOTO」 + 환자 정보 저장 → 창 뜸 → 취소: 아무것도 안 생기고 버튼 잠금 풀림
    · 다시 → 「그래도 새로 등록」 → 26-00034 생김
    · 다른 창구 흉내 — 환자를 고른 뒤 API로 먼저 접수, 곧바로 화면에서 접수 → 「다른 창구에서 방금…」 → 확인 → 두 번째 내원 생김
- **확인 못 한 것**:
  - 두 창구가 **정확히 동시에** 누르는 경우 — 서버 확인에 잠금이 없어 둘 다 통과할 수 있음(경고일 뿐이라 둠)
  - 악센트만 다른 이름(é/e)은 다른 이름으로 봄
  - 영어 화면은 안 누름
- **위키**: `modules/reception.md` 머리, 2.2(동명이인 창·같은 날 확인 사용법), 2.8(안내 4줄), 3절(`confirmNewPatient`·`postVisit`), 4절(권한표·API 표 — `similar`, `POST /visits` 409), 7절(③·④ 고침), 8절
- **총괄 확인 요청**: 실장님이 고르신 2차 작업(⑦ ④)이 이것으로 끝. 주소·신분증 칸은 「넣지 않음」 결정이라 손대지 않았음
- **다른 세션에 부탁**:
  - **설정** — `backend/test/settings.access.mjs` 표에 두 가지 반영 부탁:
    · `['GET', '/patients/similar?last_name=a&first_name=b', [REG]]` 추가
    · `/visits/patient` 줄에 REG 추가(⑦ 때 총괄 승인)
    · 그 시험의 `POST /visits`는 빈 본문이라 400이 나서 새 409와는 부딪히지 않음

## 2026-09-29 — ⑦ 내원구분: 초진 · 재진 · 진료비 없음 (실장님 결정)

> **총괄 확인 (2026-09-29)**: ⑦ `520706d` 합침 + 실행 중 EMR 반영. S2 표 변경(`GET /visits/patient/:patientId`에 registration 추가) 승인 — 접수가 이전 내원을 읽어 초진/재진을 제안하기 때문. 설정 세션의 전체 시험 표도 맞추게 함. 「진료비 없음」 표기: 실장님 말씀대로 수납의 공용 키 `noConsult`도 접수와 같은 글자로 맞춤(총괄이 고침). 실행 중 EMR에서 접수 계정의 `/visits/patient/1` 200, `/visits/today`에 `has_active_bill` 칸 확인.

- **상태**: 확인 요청
- **커밋**: session/reception — 이 항목을 추가한 커밋 하나 (`a42550a` 위, `develop` ff 뒤)
- **한 일**: `decisions.md` 2026-09-29 결정 그대로.
  - 단추는 **Nouvelle(초진) · Suivi(재진) · Sans frais(진료비 없음)** 세 개. 응급·의뢰 단추는 없음. 서버 `VISIT_TYPES`는 그대로 — 옛 값이면 단추 아래에 지금 값을 보여 줌
  - **제안 규칙**(`suggestedVisitType`): 이번 접수의 진료과(없으면 담당의 소속과, 그것도 없으면 초진)에 **취소 아닌 이전 내원**이 있으면 재진, 아니면 초진. 기간 제한 없음. 진료비 없음은 제안하지 않음. 재진을 골라 두면 「Déjà venu en SUR : Suivi présélectionné…」 안내
  - 담당의를 바꾸면 다시 계산. **직원이 누른 값은 덮지 않음**(`visitTypeSource` = auto / manual / loaded)
  - 계획 노트의 두 주의 그대로:
    · 청구가 있는 내원은 단추 잠금 — `/visits/today`에 `has_active_bill`
    · 접수 수정 때는 단추를 눌렀거나 의사를 바꿨을 때만 `visit_type`을 보냄
  - 30초 새로고침이 고른 내원의 `has_active_bill`·`visit_type`도 맞춤
- **바꾼 파일**: `frontend/src/pages/Registration.jsx`, `backend/src/routes/visit.routes.js`(`/today` 칸 1개, `/patient/:patientId` 권한에 `registration`), `backend/test/reception.api.mjs`(표 1줄)
- **⚠ S2 표 변경**: `GET /visits/patient/:patientId`에 **registration 추가**. 접수가 이제 이전 내원을 읽어 제안하기 때문(S2 때는 접수가 부르지 않았음). 시험 스크립트도 고침 → 다시 114/114
- **공용 파일 변경**: i18n `rc_` 블록에 키 4개. 공용 키 `newVisit`·`followUp`은 읽기만(값 그대로)
- **DB 마이그레이션**: 없음
- **번역 키**: `rc_visitNoFee` `rc_visitTypeLocked` `rc_visitTypeOther` `rc_visitTypeSuggested` (ko · en · fr)
- **확인한 방법**:
  - `node --check`, `npm run build` 통과. 격리 스택 9181(develop `a42550a` 위). 다른 과 비교용으로 FM 의사를 1명 더 만듦
  - 화면(프랑스어) 1~5:
    1. 빈 화면 → Nouvelle
    2. SUR에 완료된 내원이 있는 환자 + SUR 의사 → Suivi와 안내
    3. 같은 환자 + FM 의사 → Nouvelle
    4. Nouvelle을 손으로 누른 뒤 FM→SUR로 바꿔도 Nouvelle 유지
    5. Sans frais로 등록 → DB `none`
  - 화면 6~9:
    6. 대기 내원을 고르고 메모만 고치는 사이 DB에서 `followUp`으로 바꿔 둠 → 저장 뒤에도 `followUp`(덮지 않음). 한국어로 바꿔 「초진」을 누르고 저장 → `newVisit`
    7. SUR에 **취소된** 내원만 있는 환자 + SUR → Nouvelle
    8. 수납 끝난 내원 → 단추 3개 잠김, 한국어·프랑스어 안내
    9. 옛 `emergency` 내원 → 「지금 값: 응급 (수납에서 정함)…」
  - API: `visit_type='none'` 내원 → `/billing/visit/:id/items`가 `none`, `/billing/pending`에 추가 청구 0
  - 권한 시험 114/114
- **확인 못 한 것**:
  - 수납 화면 자체에서 `none` 내원을 눌러 보지 않음(API로만). 수납 세션이 응급·의뢰를 빼는 작업과 겹치지 않는지는 합칠 때 확인 필요
  - 영어 화면은 안 누름
- **위키**: `modules/reception.md` 머리, 2.1(내원구분 이름)·2.2·2.4(**Type de Visite** 줄)·2.6·2.8(단추 아래 안내 3줄), 3절(내원구분 흐름·제안 규칙·잠금), 4절(권한표·`/today`·`/patient`), 5절(수납·통계), 6절(오더 코드·소속과), 7절(⑥ 하지 않음, ⑦ 고침), 8절
- **총괄 확인 요청**:
  - S2 표에서 `/visits/patient`에 registration이 늘어난 것 — 설정 세션 표·decisions 기록과 맞춰 주세요
  - 수납 화면의 선택 칸에서 응급·의뢰를 빼면, 수납의 `noConsult`(「진료 없음 (0원)」)와 접수의 `rc_visitNoFee`(「진료비 없음」)가 같은 값인데 글자가 다름. 실장님 말씀은 「진료비 없음」 — 공용 키 `noConsult`를 맞출지 판단 부탁(총괄 소관)
- **다른 세션에 부탁**: **수납** — 이제 접수가 고른 초진/재진/진료비 없음이 진료비 칸의 처음 값으로 뜹니다(수납 코드 변경 불필요). 수납이 청구하면 접수 쪽 단추는 잠깁니다

## 2026-09-29 — 서버 권한 검사 (S2, 실장님 결정)

> **총괄 확인 (2026-09-29)**: S2 `3e03fa4` 합침(`33b5e81`) + 실행 중 EMR 반영. 실행 중 EMR에서 역할별(관리자·의사·접수·약국·검사) × 13개 라우트를 읽기만으로 확인 — 표와 일치. 의사·약국·검사 계정의 환자 등록(POST)은 403, 환자 수 2명 그대로. `backend/test/reception.api.mjs`는 격리 스택 전용이라 운영에서는 돌리지 않음.

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
