# 임상병리 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-10-01 — 설정 「검사항목」: 단위를 목록에서 고르기 · 「단위 목록」 창

- **상태**: 확인 요청
- **커밋**: session/laboratory `a7f5f87` (출발점 `develop` `083ab42`, fast-forward 뒤)
- **계기**: 실장님(2026-10-01, 총괄 전달) — 「단위를 일일이 쓰지 않고 누르면 리스트가 나와 정하게. 새 검사 패널 우측에 단위목록 버튼, 그 안에서 추가·지우기.」
- **만든 것**
  - 항목 줄의 **단위 칸 = 고르는 칸**(`select`): 「— 단위 없음 —」 + 목록.
  - 「+ 새 검사 패널」 오른쪽 **「단위 목록 / Liste des unités / Unit list」** 단추 → 창: 넣기(칸 + 「+ 추가」 또는 Enter) · 이름 고치기(줄에서 바로) · 순서(▲▼) · 빼기(✕) · 저장/취소. 줄 옆에 그 단위를 쓰는 항목 수.
  - 단위는 데이터: 표 `lab_unit`, `GET /api/lab/units`(lab·settings) · `POST /api/lab/units/save`(settings).
- **정한 것 (보고)**
  1. **쓰이고 있는 단위를 뺄 때 = 목록에서만 빠짐 + 쓰는 항목 수를 미리 알려 줌** (총괄 의견과 같음). 이유: 목록은 고르기 편하라고 있는 것이고, 항목은 단위를 글자로(`lab_test_item.unit`), 결과는 자기 사본으로(`lab_result.unit`) 갖고 있어 빼도 잘못되는 것이 없음. 막으면 「잘못 넣은 단위·안 쓰게 할 단위」를 정리하려고 항목을 먼저 고쳐야 하는데, 그건 결과가 있는 항목의 단위를 건드리게 만드는 쪽이라 더 위험함. 저장 전 창 아래 주황 글씨: 「« mg/dL » : utilisée par 9 item(s). Ces items gardent leur unité ; elle sort seulement de la liste.」 **이름 고치기도 같음** — 항목의 글자는 따라 바뀌지 않고(한 글자도 안 바꾼다는 원칙), 옛 이름이 목록에서 빠진 것으로 같은 알림.
  2. **처음 목록 (24개 + 쓰는 것 전부)**: `10^9/L · 10^12/L · g/dL · % · fL · pg · /µL · mm/h`(혈구) · `mg/dL · g/L · mg/L · mmol/L · µmol/L · mEq/L · U/L · IU/L · mIU/L · ng/mL · pg/mL · µg/dL · mL/min · mL/min/1.73m² · sec · /HPF`(화학·기타), 그 뒤에 검사항목이 쓰는 나머지 단위(이름순). 지금 기본 항목이 쓰는 7개(10^9/L, 10^12/L, g/dL, %, mg/dL, U/L, mL/min)는 모두 들어 있음. **병원 항목이 같은 단위를 다르게 적고 있으면 병원 글자로**(예: 항목 8개가 `mg/dl` → 목록도 `mg/dl`; 가장 많이 쓰는 표기 하나). 의학적 판단이 아니라 표기 목록이라 제가 정했습니다 — 빼거나 더할 것이 있으면 창에서 바로 고치면 됩니다.
  3. **같은 단위**: 대소문자·공백·두 가지 마이크로 글자(µ U+00B5 / μ U+03BC)만 다르면 같은 단위 — 화면·서버(`unitListError`)·DB 유일 색인 세 곳에서 막음. **길이 30자**(`lab_test_item.unit` 과 같음).
  4. **목록에 없는 단위를 가진 기존 항목**: 칸에 「mg/dL · hors liste / 목록에 없음」 으로 그 값이 남아 있고, 그대로 저장하면 글자가 그대로. 다른 단위를 골랐다가도 저장 전에는 원래 값으로 되돌릴 수 있음(불러올 때의 값도 선택지에 남김).
  5. 목록은 저장할 때 **통째로 바꿔 넣음**(아무것도 `lab_unit.id` 를 가리키지 않음 → 두 이름을 맞바꿔도 유일 색인에 안 걸림).
- **그대로 둔 것**: 결과가 있는 항목의 단위를 바꿀 때의 경고 창(`result_count`, `labRisks`) — 고르는 칸에서도 그대로 뜸(확인).
- **같이 고친 것**: ① 설정 항목 표의 열 너비(`1.6/.8/.7/.7/1` → `1.4/1.2/.6/.6/1`) — 단위 칸에 「mg/dL · hors liste」 가 다 보이게. ② **검사실 입력 표**(`Lab.jsx`): 30자 단위를 넣어 보니 그 줄만 열이 넓어져 입력 칸이 다른 줄과 어긋남(줄마다 따로 격자) → 열을 `minmax(0, fr)` 로, 긴 글자는 칸 안에서 줄바꿈. 전부터 있던 약점(긴 항목 이름도 같음).
- **바꾼 파일**: `backend/sql/502_lab_units.sql`(새) · `backend/src/routes/lab.routes.js` · `backend/src/utils/labFlag.js`(`unitName`·`unitKey`·`unitListError`) · `backend/test/lab.flag.mjs`(단위 규칙 대조 추가, 841건) · `frontend/src/pages/Settings.jsx`(검사항목 탭만) · `frontend/src/pages/Lab.jsx` · `frontend/src/i18n/{ko,en,fr}.js`(lab 블록) · `wiki/modules/laboratory.md`(2절 「단위 목록」, 3.1, 4절, 6절, 8절) · `wiki/reference/changelog-1.5.0/laboratory.md` · 이 노트
- **공용 파일 변경**: 없음(`Settings.jsx` 는 검사항목 탭과 그 상태·함수만. `settingsMessages.js` 는 안 건드림 — 서버 오류 코드 `lab_unit_*` 는 검사항목 탭 안에서 번역)
- **DB 마이그레이션**: `502_lab_units.sql` (세션 번호 — 다시 매겨 주세요). 표 하나 + 색인 하나를 **더하기만** 하고 기존 줄은 안 바꿈. 여러 번 돌려도 안전: `IF NOT EXISTS` + 채우기는 표가 비어 있을 때만(병원이 뺀 단위가 돌아오지 않음).
- **번역 키**(14개): `lb_unitList` `lb_unitListHint` `lb_unitListEmpty` `lb_unitNone` `lb_unitNotListed` `lb_unitNew` `lb_unitUsedBy` `lb_unitLeavesNote` `lb_unitUp` `lb_unitDown` `lb_unitRemove` `lb_errUnitDup` `lb_errUnitLong` `lb_errUnitEmpty`
- **다른 세션에 부탁 — 설정 세션(관리자 설명서 `manual-fr/settings.md` 「Régler les valeurs de référence des analyses」, 그대로 써도 됨)**:
  > 3. Sur chaque ligne : **Unité** se choisit dans la liste (**— sans unité —** si l'item n'a pas d'unité), puis **Min** et **Max**…
  > **Liste des unités.** À droite de **+ Nouveau panel**, **Liste des unités** ouvre la liste proposée dans la case **Unité**. Pour ajouter : écrivez l'unité dans **Nouvelle unité**, puis **+ Ajouter**. Pour changer l'ordre : **▲ ▼**. Pour retirer : **✕**. Cliquez sur **Sauver**. Retirer ou renommer une unité ne change pas les items ni les résultats qui l'utilisent : ils gardent leur unité, affichée **hors liste**. Deux unités qui ne diffèrent que par les majuscules ou les espaces sont la même unité.
- **본 것** (격리 스택 9185, develop `083ab42` + 이 변경, 1366×768):
  - 마이그레이션: 새 DB에서 적용(목록 24개, 쓰는 수 표시). 격리 DB에서 파일을 다시 돌림 → 24개 그대로. `sec` 를 뺀 뒤 다시 돌림 → 안 돌아옴. 「병원이 다르게 적은 DB」 흉내(항목 8개 `mg/dl`, `UI/L`, `cells/µL`, 앞뒤 공백 ` U/L `, 그리스 μ) → 목록에 `mg/dl`·`μmol/L` 이 병원 글자로, `cells/µL`·`UI/L` 이 뒤에 붙고, **항목 단위가 바뀐 줄 0** (모두 되돌림).
  - API: 대소문자·공백 중복 / 마이크로 글자 중복 / 31자 / 빈 이름 → 400, 거절 뒤 목록 그대로. 쓰이는 `mg/dL` 빼기 + `g/dL`→`g/dl` 고치기 + 순서 바꾸기 + 공백 섞인 새 단위 → 저장, **모든 항목의 (id·이름·단위) 그대로**. 두 이름 맞바꾸기 200. 간호사 계정(lab 권한): 읽기 200 · 저장 403. 토큰 없이 401.
  - 화면(프랑스어 어두운·밝은, 한국어 밝은): 단추·창이 창 높이 안(54–714, 목록만 스크롤, 저장 단추 보임). 중복·빈 이름·알림 문구. 저장 뒤 항목 칸이 「mg/dL · hors liste」 로 남음 → 그대로 **Sauver** → API로 단위 그대로 확인. 30자 단위를 골라도 칸 161px 그대로, 격자 넘침 없음. 결과가 있는 Creatinine 의 단위를 바꿔 저장 → 기존 경고 창 뜸 → 취소 → 원래 값 되돌리기 가능. 저장한 결과(`1,5 mg/dL ▲`)는 그대로.
  - `node backend/test/lab.flag.mjs` 841건 0 불일치 · `node --check` · 프런트 빌드.
- **안 본 것**: 영어 화면(문구만 넣음). 실제 병원 DB에서의 첫 채우기(위 흉내로만). 세로 스크롤 막대가 어두운 화면에서 밝게 보이는 것(다른 창과 같은 브라우저 기본 — 디자인 판단). 창에서 Esc 로 닫기는 없음(바깥을 누르거나 Annuler).

## 2026-10-01 — 긴 이름에서 검사실 목록·환자 머리·환자 찾기 창

- **상태**: 확인 요청
- **커밋**: session/laboratory `8765401` (출발점 `develop` `e8db948`, fast-forward 뒤)
- **본 자리** (격리 스택, 1366×768, 프랑스어·한국어, 이름 50자 `RAZAFINDRAKOTO Andriamihaja Jean Baptiste Emmanuel` · 86자 `ANDRIANAMPOINIMERINATOMPOKOINDRINDRA Hery Nomenjanahary Tsiorintsoa Fanomezantsoa Mamy`(36자 한 낱말 포함) · 짧은 이름):
  | 자리 | 고치기 전 | 고친 뒤 |
  |---|---|---|
  | 검사 대기·완료 목록의 줄 (`Lab.jsx`) | 50자: 날짜가 「2026- / 10-01」 두 줄. 86자: 줄이 목록보다 넓어져 **목록에 가로 스크롤**, 날짜가 밖으로 밀림 | 이름 3줄·5줄로 줄바꿈(자르지 않음), 날짜·「En consultation / 진료 중」 한 줄, 가로 스크롤 없음(299/299) |
  | 결과 입력 표 위의 환자 머리 (`Lab.jsx`) | 날짜가 「2026-10- / 01」로 끊김 | 「26-00002 · 2026-10-01」 묶음이 한 줄, 꼬리표 한 줄. 저장 단추는 그대로 창 안(718–758) |
  | 환자 찾기 창 첫 단계 (`PatientFinder.jsx`, 공용) | 긴 이름이 있으면 **모든 줄**에서 차트번호 「26- / 00003」, 생년월일 「1990-05- / 05」 | 차트번호·전화·생년월일 한 줄, 이름만 줄바꿈 |
  | 환자 찾기 창 둘째 단계 머리 (공용) | 제목 「Visites du / patient」, 닫기 「✕ / Fermer」 두 줄 | 제목·닫기 한 줄, 이름은 사이에서 줄바꿈 |
  | 「Dossier (vue)」 창 머리 (`DocumentModal`, 공용) | 이상 없음 — 86자가 한 줄에 들어감 | 안 고침 |
  | 진료 화면의 🧪 결과 창 머리 (`Consultation.jsx`) | 이상 없음 | 안 고침 |
  | 오른쪽 결과 표 (`LabResults.jsx`) | 환자 이름이 없음 | — |
  | 결과지 인쇄 | **검사실에는 결과지 인쇄가 없습니다** (`Lab.jsx`·`LabResults.jsx` 에 인쇄 코드 없음, `documents/` 에 검사 결과 서식 없음) | — |
- **고친 방법**: 진료 대기 목록(총괄 `e8db948`)과 같은 원칙 — 이름 `minWidth: 0; overflowWrap: 'anywhere'`(낱말 사이에서 줄바꿈, 한 낱말이 칸보다 길 때만 낱말 안에서), 날짜·꼬리표·차트번호·제목·단추 `whiteSpace: 'nowrap'`(+ flex 자리에서는 `flexShrink: 0`). 이름은 어디서도 자르지 않음(`…` 없음). 색은 안 건드림.
- **바꾼 파일**: `frontend/src/pages/Lab.jsx` · `frontend/src/components/PatientFinder.jsx` · `wiki/modules/laboratory.md`(3.1, 7절 27, 8절) · 이 노트
- **공용 파일 변경**: **`frontend/src/components/PatientFinder.jsx`** — 모양만(머리 줄 세 군데와 첫 단계 표의 칸 네 군데에 `nowrap`/`overflowWrap`, 주석 두 개). 접수·진료·수납·약국의 환자 찾기도 같이 바뀜. 다른 세션이 같은 자리를 고쳤다면 겹칠 수 있음 — 같은 내용이면 어느 쪽을 써도 됨.
- **DB 마이그레이션**: 없음 · **번역 키**: 없음 · **다른 세션에 부탁**: 없음
- **확인한 방법**: 빌드. 격리 스택 9185(develop `e8db948` + 이 변경). 화면 사진 + 화면에서 잰 값(줄 수·높이·가로 넘침). 목록은 대기·완료 두 탭, 환자 찾기는 `RA` 검색 → 86자 환자 → 내원 줄을 눌러 검사가 열리는 것까지. 프랑스어·한국어 모두. 실행 중 EMR(9080)은 건드리지 않음. 스택 내림.

## 2026-09-30 — 결과 표 「✕」 열 오른쪽 여백 · 어두운 화면 새 색 점검

- **상태**: 확인 요청
- **커밋**: session/laboratory `b099596` (출발점 `develop` `b8069d7`, fast-forward 뒤)
- **① 「✕」 열이 오른쪽 끝에 붙음 (다시 통합 시험 C)**: `LabResults.jsx` 마지막 날짜 열의 머리·칸에 `paddingRight: 20`(다른 열 8px). 여분 열을 두지 않고 마지막 열 안쪽 여백으로 해서, 표가 칸에 들어갈 때도 옆으로 끝까지 밀었을 때도 마지막 값 뒤에 20px이 남음. 날짜 열 6개(가로 스크롤 838/459px)에서 끝까지 밀어 값·「✕」 머리 모두 칸 끝에서 20px 확인, 프랑스어·한국어(툴팁 「취소됨」). 진료 화면 결과 창도 같은 부품이라 함께 바뀜.
- **② 어두운 화면 새 색으로 검사실 한 바퀴 (1366×768, FR)** — 화면에서 읽은 색으로 대비 계산:
  - 높음 `#f87171` 6.8:1 · 낮음 `#60a5fa` 7.4:1, 입력 칸 옆 ▲▼! 도 같은 색·같은 대비. 결과 표 ▲ 6.5 · ▼ 7.1.
  - 취소 값 줄긋기·입력 시각 `--text-3` `#8793a6` 5.81:1 — 전에 넘긴 3.97 문제 풀림. 빈 입력 칸 테두리 `--field-border` `#64718a` 3.84:1 — 전 1.45 문제 풀림.
  - 「지금 이 칸」: 공용 `input:focus-visible { outline: 2px solid var(--focus-ring) !important; outline-offset: 1px }` 가 `Lab.jsx` 의 `outline: 'none'` 을 이김 → 포커스가 보임(전에 넘긴 문제 (2) 풀림). **높음(빨강) 칸**에선 빨강 테두리 바깥에 파랑 고리 — 두 겹이지만 어색하지 않고 둘 다 읽힘. **낮음(파랑) 칸**에선 고리 `--focus-ring` `#60a5fa` 가 낮음 색 `--accent-text` `#60a5fa` 와 **똑같아**, 포커스가 「테두리가 두꺼워진 것」으로만 보임. 칸 옆 ▼ 가 있어 낮음은 알 수 있으니 급하지 않음. 원하면 디자인 세션이 고리 간격을 2px로 늘리거나 고리 색을 낮음과 다른 색(흰색 계열)으로 — 의견만.
  - 새 알림 색(`--toast-*`)·저장 단추 글자(`--on-cyan`)는 총괄이 넣은 그대로, 건드리지 않음.
- **③ 저장 단추 의견 (디자인 세션께)**: 다른 화면의 주 단추는 이제 **짙은 파랑 바탕 + 흰 글자**(예: 접수 「Enregistrer / Mettre en attente」 `#1d4ed8`)인데, 검사실 「✓ Enregistrer · Terminer」 는 **밝은 청록 그라데이션**(`#06b6d4 → #0891b2`) + **어두운 글자**(`--on-cyan` `#08161a`, 7.59:1). 읽기는 문제없지만 어두운 화면에서 가장 밝은 덩어리라 혼자 튀고, 글자 밝기가 다른 화면 주 단추와 거꾸로임. 간호사가 약국 ↔ 검사실을 오가므로 **「주 단추」 모양은 같게** — 청록 색조는 검사실 표시로 남기되 짙은 청록(밝은 화면에서 쓰는 `#0e7490` 쪽) + 흰 글자로 맞추기를 권함. 결정은 디자인 세션·실장님.
- **바꾼 파일**: `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(3.5, 8절) · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 빌드. 격리 스택 9185(develop `b8069d7` + 이 변경), 창 1366×768, 어두운 화면. RAKOTO Jean 에 같은 날 CBC 결과 5개 + 취소 1개(날짜 열 6개). 대비는 `getComputedStyle` 로, 포커스는 입력 칸에 포커스를 주고 계산된 outline 과 화면 사진으로. 다른 화면 단추 색은 같은 창에서 약국·수납·접수를 불러 계산된 색으로 비교. 스택 내림.

## 2026-09-30 — 입력 칸 옆 ▲ ▼ ! (색만으로 구분하지 않게)

- **상태**: 확인 요청
- **커밋**: session/laboratory `64214c4` (출발점 `develop` `5077d8e`, fast-forward 뒤)
- **한 일** (총괄 답 — 넘긴 목록 (3)):
  - `Lab.jsx` 결과 입력 칸 오른쪽에 결과 표와 같은 **▲**(높음) · **▼**(낮음) · **!**(글자 결과 이상). 치는 동안 바뀜. 색은 지금 이름표 그대로(`--danger-text` / `--accent-text`, 칸 글자색과 같음).
  - **자리를 미리 잡음**: 판정이 없어도 12px 칸을 비워 둠 → 치는 동안 칸 너비가 안 바뀜(1366×768에서 네 값 모두 91px 그대로 확인).
  - 처음엔 입력 칸을 `flex: 1` 만 주었더니 칸의 원래 너비(≈200px)가 줄마다 격자 열을 밀어 **머리와 줄이 어긋남** → `width: 0` 추가로 해결(모든 줄 열 너비 같음 확인).
  - ▲ 자리만큼 입력 칸이 91 → 75px로 줄어 `Positive`·`12 500` 이 빠듯해서, 값 열 `1fr → 1.15fr`, 비고 열 `1.4fr → 1.25fr` 로 옮김 → 입력 칸 91px 예전 그대로, 비고 칸은 16px 좁아짐. 배치만 바꾸고 색은 안 건드림.
  - **화면 읽기 도구**: 글자에 `role=img` + `aria-label`(fr élevé / bas / anormal · ko 높음 / 낮음 / 이상 · en high / low / abnormal — 기록 탭 `se_flag_*` 와 같은 말), 입력 칸의 `aria-describedby` 가 그 글자를 가리킴. 판정이 없으면 `aria-hidden`. 번역 키는 설정 세션 키를 빌리지 않고 `lb_flagHigh` · `lb_flagLow` · `lb_flagAbnormal` 3개를 새로 둠(같은 말).
  - `manual-fr/laboratory.md` 「Écrire les chiffres」에 한 줄, changelog-1.5.0 Less visible 한 줄, 위키 2절·3.1·3.3·8절.
- **바꾼 파일**: `frontend/src/pages/Lab.jsx` · `frontend/src/i18n/{ko,en,fr}.js`(lab 블록 안) · `wiki/modules/laboratory.md` · `wiki/manual-fr/laboratory.md` · `wiki/reference/changelog-1.5.0/laboratory.md` · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: `lb_flagHigh`, `lb_flagLow`, `lb_flagAbnormal`
- **확인한 방법**: 빌드. 격리 스택 9185, 창 1366×768. 대기 환자(CBC + Malaria RDT)에 키보드로 `12 500`(▲ élevé) · `4,8`(표시 없음, aria-hidden) · `9`(▼ bas) · `Positive`(! anormal) — 프랑스어 어두운 화면 사진, 밝은 화면·한국어는 화면 값으로(높음/낮음/이상, 빨강 `#b01c1c`·파랑 `#1451d6`). `aria-describedby` 가 가리키는 id가 그 글자인지 확인. 격자 열 너비가 모든 줄에서 같음, 값이 칸에 다 들어감(`scrollWidth ≤ clientWidth`). 스택 내림.
- **확인 못 한 것**: 실제 화면 읽기 프로그램(NVDA 등)으로 읽어 보지는 않음 — 속성만 확인.

## 2026-09-30 — 밝은 화면 점검(검사실·결과 표·설정 검사항목) · 설정 저장 버튼 · 「참고치 바꾸기」

- **상태**: 확인 요청
- **커밋**: session/laboratory `66ae1f9` (출발점 `develop` `a4029d6`)
- **① 밝은 화면 · 1366×768 · 프랑스어 — 검사실 화면 한 바퀴** (격리 스택, 대비는 화면에서 계산한 색으로 WCAG 비율)
  - 입력 중 색: 높음 빨강 `#b01c1c` 6.93:1, 낮음 파랑 `#1451d6` 6.61:1, 글자 결과(`Positive`) 빨강 — 흰 바탕에서 뚜렷함. 쉼표(`12,5`·`9,5`)도 제대로 색이 붙음.
  - 결과 표: ▲ 빨강 6.93 · ▼ 파랑 6.61 · `!` 빨강, **글자(▲▼!)로도 구분됨**. 취소 「날짜 ✕」 머리 5.67, 취소 값 회색 줄긋기 6.19, 툴팁 「Annulé — Mauvais patient」. 여섯 칸이 결과 칸 459px 안에 다 보임.
  - 저장 알림 「✓ Enregistré et terminé: CBC」: 글자 7.04:1, 창 안(아래 744px), 4초 뒤 사라짐.
  - 진료 화면 **🧪 Résultats labo** 창: 같은 표시, 이상 없음. **수납(Paiement) 화면에는 검사 결과 표가 없습니다**(`LabResults`는 검사실·진료 두 곳만) — 볼 것 없음.
- **디자인 세션에 넘길 목록** (`Lab.jsx`·`LabResults.jsx` 색은 건드리지 않음):
  1. **저장 알림이 바탕에 묻힘(밝은 화면)** — 알림 바탕 `--panel-2` `#f3f5f9` 가 가운데 바탕 `--bg` `#eff2f7` 과 거의 같고, 테두리 `--ok-a50` 은 1.77:1. 글자는 잘 읽히지만 「떠 있는 것」이 잘 안 보임. 흰 패널 + 그림자나 연녹 바탕 이름표가 있으면 좋겠음. (`Lab.jsx` toast, `role=status`)
  2. **입력 칸에 포커스 표시가 없음(두 테마 모두)** — 값·메모 칸이 `outline: 'none'` 이고 포커스 때 테두리도 안 바뀜. 지금 어느 칸에 쓰는지 안 보이고, 밝은 화면에선 「낮음」 파란 테두리가 포커스 링처럼 보임. 공용 포커스 이름표가 정해지면 따르겠음(또는 디자인 세션이 바꿔도 됨).
  3. **입력 중엔 높음/낮음이 색으로만 구분됨** — 결과 표는 ▲▼ 가 있지만 입력 칸엔 글자가 없음. 색각 이상 대비가 필요하면 입력 칸 옆 작은 ▲/▼ 를 제가 붙일 수 있음(기능 쪽 — 원하시면 말씀 주세요).
  4. **어두운 화면 `--text-3` `#64748b` 가 4.5 미만** — 결과 표의 취소 값(13px)·입력 시각(10px) 3.97:1, 설정 성별·나이별 작은 표의 설명문·머리(11–12px, 바탕 `#1a1f2e`) 3.45:1. 밝은 화면 `#566274` 는 5.5–6.2 로 괜찮음.
  5. **어두운 화면 입력 칸 테두리 `--field-border` `#2a3142` 1.45:1** — 설정의 빈 참고치 칸들이 바탕에 묻힘(밝은 화면은 3.82 로 괜찮음).
  6. (작음) 결과 표 입력 시각 10px — 두 테마 모두 대비는 되지만 작음. 진료 결과 창의 「날짜 ✕」 머리 ✕ 가 바로 위 「Fermer ✕」 와 같은 글자라 닫기 단추로 보일 수 있음 — 바꿀지는 디자인 판단.
- **② 설정 → Items de test (어두운·밝은 화면, 1366×768)**
  - **버그 고침(7절 문제 26)**: 이 탭만 자기 스크롤이 없고 설정 내용 칸이 `overflow: hidden` 이라, CBC 에서 성별·나이별 작은 표를 열어 줄을 몇 개 넣으면 **Sauver 가 창 아래(913px)로 내려가 보이지도 누를 수도 없었음**(휠도 안 먹음). 탭 틀에 `overflow: auto`(PACS 탭과 같은 방식) — 고친 뒤 휠로 내려 Sauver 712–745px, 그 자리를 누르면 Sauver 가 맞음. 프랑스어·한국어 둘 다 확인. 작은 표를 안 열면 원래도 보였음.
  - 표 읽기: 밝은 화면은 4.5 미만 글자 없음. 어두운 화면은 위 목록 4·5.
  - **설명서 대조** (`manual-fr/settings.md` 「Régler les valeurs de référence des analyses」, 설정 세션 문서라 고치지 않음): 화면 글자(**Panel**, **L01 · CBC**, **Min**, **Max**, **Réf. texte**, **▸ Par sexe et âge**, **+ Ajouter une ligne**, **Sauver**)는 모두 맞음. 빠진 두 가지 — 설정 세션께 제안(그대로 써도 됨):
    > 5. **Sauver**. Si plusieurs tableaux **Par sexe et âge** sont ouverts, faites défiler vers le bas pour voir **Sauver**.
    > Les résultats déjà enregistrés gardent leur couleur et leur référence. Seuls les résultats enregistrés ensuite — ou enregistrés à nouveau — suivent les nouvelles valeurs.
  - 참고: 문자 참고치 칸 자리표시 「Negative…」 는 영어지만 기본 데이터 값(`Negative`)과 같게 둔 것이라 그대로.
- **③ 위키 2절 「참고치 바꾸기」**: 있던 「참고치 고치기」를 바꿔 씀(같은 내용이 두 곳에 있지 않게) — 어느 화면(Paramètres → Items de test, settings 권한만, 검사실 화면에선 못 바꿈), 기본 참고치와 성별·나이별 표, 저장 버튼이 내려가면 스크롤, **저장해도 예전 결과는 다시 판정하지 않음**(결과마다 참고치·판정·쓰인 줄을 함께 저장), **다시 저장하면 그 순간 기준으로 다시 판정되고 판정이 달라지면 Journal 에 한 줄**, 예전 결과를 열기만 하면 입력 칸은 새 기준으로 보이지만 저장 안 하면 그대로, 지난 날짜는 🔍 Trouver patient.
- **바꾼 파일**: `frontend/src/pages/Settings.jsx`(검사항목 탭 틀 한 줄 + 주석) · `wiki/modules/laboratory.md`(2절, 7절 26, 8절) · `wiki/reference/changelog-1.5.0/laboratory.md`(Less visible 한 줄) · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 격리 스택 9185(develop `b4758e6` + 이 변경, 프런트 다시 빌드), 창 1366×768, 프랑스어 밝은·어두운 화면, 한국어는 설정 저장 버튼만. 가짜 환자 RAKOTO Jean(높음·낮음·글자 이상·재검·취소 결과) · RASOA Marie(대기). 색은 `getComputedStyle` 로 읽어 대비 계산, 화면 사진으로도 봄. 저장 버튼은 JS 스크롤이 아니라 휠로 내려 확인(JS 는 `overflow: hidden` 칸도 움직여서 처음 확인이 틀렸었음). 스택 내림.

## 2026-09-29 — 통합 시험 B: 1366×768에서 저장 버튼·결과 표가 잘리던 것 · 모두 저장 알림

- **상태**: 확인 요청
- **커밋**: session/laboratory `3d9091c` (출발점 `develop` `736c788`)
- **한 일** (보고서 `wiki/reference/integration-test-2026-09-29.md`의 임상병리 몫):
  - **B — 1366×768 잘림**: `Lab.jsx` 바깥 틀을 `minHeight: 100vh` → `height: 100vh` + 세로 flex, 본문 줄을 `calc(100vh - 86px)` → `flex: 1; minHeight: 0`, 입력 표·결과 표 칸에 `minHeight: 0`, 저장 줄 `flexShrink: 0`. 원인: 위 두 줄(TopBar + 도구 줄)이 86px보다 높아 페이지가 창보다 길었고, 저장 버튼과 결과 표 가로 스크롤 막대가 창 아래로 밀림 → 오른쪽 표의 「✕」 칸이 잘린 것처럼 보이고 옆으로 밀 수도 없었음.
  - **작은 것 — 모두 저장했을 때**: 환자가 바로 닫혀 초록 문구가 안 보이던 것 → 화면 아래 가운데 초록 알림 「✓ Enregistré et terminé: …」 4초(`toast`, `role=status`).
  - 색은 디자인 세션의 이름표 그대로(`var(--panel-2)`·`var(--ok-text-2)`·`var(--ok-a50)`) — 새 `#…` 없음.
- **바꾼 파일**: `frontend/src/pages/Lab.jsx` · `wiki/modules/laboratory.md`(2절, 3.1, 7절 24, 8절) · `wiki/manual-fr/laboratory.md`(Pas à pas 6) · `wiki/reference/changelog-1.5.0/laboratory.md`(Less visible 한 줄)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음(`lb_savedTests` 재사용)
- **확인한 방법**: 빌드. 격리 스택(develop `fd0cd02`), 창 1366×768(프랑스어): 문서 높이 768(페이지 스크롤 없음), 「✓ Enregistrer · Terminer (Tout)」 위 718·아래 758(창 안), 결과 표 영역 아래 768(창 안), 머리 「2026-09-29 (1) · (2) · ✕」 여섯 칸이 459px 안에 모두 보임(가로 스크롤 필요 없음), 화면 사진으로도 확인. 한 검사 환자에서 값 입력 → 저장 → 알림 「✓ Enregistré et terminé: CBC」 + 가운데 「Sélectionnez un patient à gauche」, 4초 뒤 사라짐. 스택 내림.
- **확인 못 한 것**: 밝은 화면(디자인 세션 전환 단추)에서의 알림 색 — 이름표만 써서 따라갈 것으로 봄. 폭 1024px 이하 입력 표 눌림(7절 24)은 그대로.
- **기록 탭 판정 값 번역**: 설정 세션 몫(총괄 전달됨) — 할 일 없음.

## 2026-09-29 — 현지 직원용 프랑스어 설명서 · v1.5.0 변경 내역 초안

- **상태**: 확인 요청 (문서만, 코드 변경 없음)
- **커밋**: session/laboratory `3c09045` (출발점 `develop` `0cdb794`)
- **① `wiki/manual-fr/laboratory.md`**(새, 간호사용, 프랑스어만): `manual-fr/README.md` 구성 그대로 — En bref(6단계) → Pas à pas(오늘 결과 넣기 · 숫자 쓰는 법(12,5 · 12 000 · <5) · 글자 결과(Négatif/Neg/- 정상, Positive/Trace/1+ 빨강) · 이미 넣은 결과 고치기(Journal에 남음) · 다른 날 검사 열기 · 결과 표 읽기(▲▼!, 재검 (1)(2)·시각, 취소분 회색 줄긋기 「날짜 ✕」, 참고치 툴팁·기준 이름)) → Si ce message apparaît(8가지 — 단위 경고는 「관리자만」으로) → À ne pas faire(5) → Qui appeler. 화면 글자는 `fr.js` 그대로 굵게, 가짜 환자 RAKOTO Jean · 26-00001. 오늘 격리 스택 프랑스어 화면에서 본 글자와 대조. 주석: `terme à vérifier sur place`(NFS·test rapide du paludisme), `à revoir`(Trace가 정상으로 바뀔 수 있음). 그림 없음. 인쇄 쪽수는 확인 못 함(A4 3쪽 안팎으로 추정).
- **② `wiki/reference/changelog-1.5.0/laboratory.md`**(새, 영어): v1.4.0과 같은 목소리로 여섯 덩어리 — 프랑스식 숫자 판정 · 설정 저장이 결과를 비우던 것(+단위 경고) · 오더 즉시 검사실에(오늘만·30초·완료=오늘 입력·「전체」 저장) · 글자 결과·재검·취소 표시·참고치 툴팁 · 성별·나이별 참고치(값 없음 — 제안표·질문지 안내) · Less visible(취소 오더 저장 거절, 서버가 DB 참고치 사용, 변경 기록, test-items 권한, labFlag.js+검사, 번역, 마이그레이션 024). **After updating**: 참고치는 입력 전까지 그대로, 업데이트 전 쉼표로 적은 결과는 다시 저장하면 판정이 다시 계산됨.
- **설정 세션께 (관리자 설명서용, 프랑스어 — 그대로 옮겨 써도 됨)**:
  > **Valeurs de référence (Paramètres → Items de test).** Choisissez l'analyse dans **Panel**. **Min** et **Max** sur la ligne de l'item sont la référence par défaut. Pour des valeurs selon le sexe ou l'âge, cliquez sur **▸ Par sexe et âge (0)**, puis **+ Ajouter une ligne** : **Sexe** (**Tous**, **Homme**, **Femme**), **Âge de** (inclus) **à** (exclu) en **jours**, **mois** ou **ans**, **Min**, **Max**, **Note (source)**. Cliquez sur **Sauver**. Pour un même sexe, les tranches d'âge ne doivent pas se chevaucher ; sinon l'enregistrement est refusé. N'entrez que des valeurs validées par le médecin. Ne changez pas l'**Unité** d'une ligne qui a déjà des résultats : ajoutez une nouvelle ligne avec un nom différent, puis supprimez l'ancienne avec **✕**.
- **바꾼 파일**: `wiki/manual-fr/laboratory.md`(새) · `wiki/reference/changelog-1.5.0/laboratory.md`(새) · 이 노트 · **공용 파일 변경**: 위 두 폴더에 새 파일 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **디자인 세션 관련**: `Lab.jsx`·`LabResults.jsx`는 건드리지 않음. 배치 문제로 남은 것 — 7절 24(브라우저 폭 ≈1024px 이하에서 가운데 입력 표가 눌려 머리 글자가 세로로 꺾임, 입력 칸 좁아짐).

## 2026-09-29 — 참고치 질문지 · 기록 탭 확인 · 2절 따라 하기

- **상태**: 확인 요청
- **커밋**: session/laboratory `97af696` (출발점 `develop` `8e52973`)
- **① 참고치 질문지** `wiki/reference/lab-reference-questions.md`(새): 의사 선생님이 ○ 표시만 하면 되는 한 장(한국어, A4 두 쪽 안쪽 — 인쇄해 보지는 않음). 1) 성인 참고치 14항목(지금 EMR 값 · 출처별 선택지 · 기타 칸) 2) 판정 기준선 7항목(공복혈당·HbA1c·지질 4·eGFR — 「어디서부터 빨강」) 3) 글자 결과·소아(Trace, 「Absence」 표기, 소아 참고치를 넣을지·어느 표로·어느 항목부터, 생년월일 모를 때 기본값). 값은 모두 제안표(`lab-reference-ranges-kr.md`)와 대조해 옮김.
- **② 설정 → 기록(Journal) 탭의 검사 결과 수정 줄**(격리 스택, develop `76457c9`): 값 바꿈(Hb `12.5 → 14,0`, 판정 low → normal) · 값 지움(Platelet) · 글자 결과(Malaria RDT `Negative → Positive`)를 만들어 한국어·프랑스어로 봄. 누가·언제·환자·차트번호·「검사 결과를 고침 / Résultat d'analyse corrigé」·전 값 → 새 값이 잘 읽힘. 고칠 것:
  - (임상병리, 이 커밋에서 고침) 한 항목짜리 검사는 요약이 「Malaria RDT · Malaria RDT」로 반복 → 검사 이름과 오더 이름이 같으면 한 번만. 새 줄부터 적용(기록은 고칠 수 없으므로 옛 줄은 그대로).
  - (**설정 세션께**) 판정 값이 코드 그대로 나옴 — 한국어 화면에서도 「판정: low → normal」, 프랑스어 「Indicateur : normal → abnormal」. `flag` 값을 화면 말로: ko 낮음/정상/높음/이상, fr bas/normal/élevé/anormal, en low/normal/high/abnormal, 빈칸은 「—」. (키는 `laboratory.result.edit`의 before/after `flag`.)
  - (설정 세션께, 선택) 값을 지운 줄에 「판정: normal (지움)」「단위: 10^9/L (지움)」까지 나와 조금 길다 — 지운 줄은 값만 보여도 충분해 보임.
- **③ 2절을 프랑스어 화면으로 처음부터 따라 함**: 메뉴·목록·입력 표·저장·환자 찾기·차트뷰어·결과 표·설정 검사항목·성별·나이별 표 — 지금 화면과 다른 곳 세 군데 고침: 간호사 기본 권한에 **Enregistrement**(접수)도 있음(결정), 기록 탭 이름 **Paramètres → 📜 Journal**, 여러 검사를 연 **Tout** 보기의 저장 버튼 「✓ Enregistrer · Terminer (Tout)」. 나머지 버튼 이름·문구는 화면과 같음.
- **바꾼 파일**: `backend/src/routes/lab.routes.js`(요약 한 줄) · `wiki/reference/lab-reference-questions.md`(새) · `wiki/modules/laboratory.md`(2절 세 곳, 8절) · 이 노트
- **공용 파일 변경**: `wiki/reference/`에 새 파일 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `node --check`. 격리 스택에서 기록 탭(ko·fr) 확인, 고친 뒤 새 DB에서 요약 「CBC · Hb」「CBC · Platelet」「Malaria RDT」. 스택 내림.
- **다른 세션에 부탁**: 설정 — 위 ② 두 가지.

## 2026-09-29 — 문제 14: 판정·참고치 규칙을 `backend/src/utils/labFlag.js`로

- **상태**: 확인 요청
- **커밋**: session/laboratory `5d56c2b` (출발점 `develop` `66741f7`)
- **한 일**: 총괄이 정한 위치에 새 파일 `backend/src/utils/labFlag.js`(허락받음) — `lab.routes.js`에 있던 순수 함수 135줄을 **그대로 옮김**(`readNumber`·`normWord`·`sameText`·`num`·`flagFor`·`SAME_WORDS`·`AGE_DAYS`·`ageIn`·`nullInt`·`rangeApplies`·`rangeLabel`·`refFor`·`rangeError`). `lab.routes.js`는 `flagFor`·`refFor`·`rangeError`·`nullInt`만 가져다 씀. DB를 쓰는 `rangesFor`·`patientForOrder`는 라우트에 남김.
  - **화면은 이 파일을 가져올 수 없음**(프론트엔드 Docker 빌드가 `frontend/`만 봄) → `Lab.jsx` `flagFor` 등과 설정 탭 `rangeProblem`은 복사본으로 두고, **새 검사 스크립트 `backend/test/lab.flag.mjs`** 가 두 쪽을 535가지 경우에 돌려 다르면 exit 1(설치·서버·DB 필요 없음). 실행: `node backend/test/lab.flag.mjs`.
- **다른 세션 파일에서 같은 계산을 하는 곳**: **없음** — `backend/src`·`frontend/src` 전체에서 `ref_low`·`ref_high`·`flagFor`·`computeFlag`·`'abnormal'`·`lab_result` 검색: `consult.routes.js`는 결과가 있는지(`EXISTS lab_result`)만 봄, `utils/audit.js`는 주석, `Settings.jsx`는 임상병리 검사항목 탭(`rangeProblem`)뿐.
- **바꾼 파일**: `backend/src/utils/labFlag.js`(새) · `backend/src/routes/lab.routes.js` · `backend/test/lab.flag.mjs`(새) · `wiki/modules/laboratory.md`(3.3, 4절, 7절 14, 8절)
- **공용 파일 변경**: `backend/src/utils/`에 새 파일 하나(총괄 허락) · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: `node --check` 두 파일. `lab.flag.mjs` 535경우 0 불일치. **검사가 실제로 잡는지**: `Lab.jsx`의 `n < L`을 `n <= L`로 일부러 바꾸자 4건 불일치 보고 → 되돌림. 격리 스택(새 DB, 옮긴 코드로 빌드): 성별·나이 줄 저장 200·겹침 400, 여 성인 Hb `12,5` → 12–16 `F · ≥18y` 정상, 말라리아 `Positive` → abnormal, 크레아티닌 `1,5` → high. 스택 내림.
- **총괄 확인 요청**: `backend/test/`에 임상병리 검사 파일 하나 추가(규칙 8절 「만든다면 자기 모듈 것만」). 프론트 복사본을 없애려면 프론트엔드 빌드가 공용 폴더를 볼 수 있어야 함(Docker 빌드 문맥 변경 — 총괄 몫).
- **남은 일**: 24(좁은 화면 — 병원 PC 폭 대기). 결정 대기: 참고치 값·Trace·판정 기준선.

## 2026-09-29 — 영어 화면 확인 · 영상 오더 취소의 영향 확인 (코드 변경 없음)

- **상태**: 확인 요청 (확인만)
- **커밋**: session/laboratory — 이 항목과 같은 커밋(노트만)
- **영어 화면**(격리 스택 9185, develop `3aa3f87` + 23·25): 검사실 화면(Pending/Completed, In consultation, Find Patient, Chart Viewer, 입력 표 머리, Save · Complete, Lab Results 표 「2026-09-29 ✕」·기준 이름·툴팁)과 설정 → Lab Test Items(표 머리, 「▸ By sex & age (n)」, 펼침 표 All/Male/Female · days/months/years · + Add row, 겹침 거절 알림 「Hb: age bands overlap for the same sex. It cannot be saved, since nobody could tell which row applies.」). 화면 글자·툴팁·placeholder에 **한글 없음, 번역 키 이름(`lb_…`)이 그대로 나온 곳 없음**(자바스크립트로 전체 글자 검사).
- **영상 오더 취소의 영향**: 검사실 화면에는 영상 오더가 나오지 않음 — 목록 세 곳 모두 `o.code_type = 'lab'`(`lab.routes.js` `/pending`·`/completed`·`/visit/:id/orders`), 결과 저장은 `code_type`이 `lab`이 아니면 400, 결과 표는 `lab_result`만 읽음. 그래서 진료의 영상 오더 취소가 켜져도 검사실 쪽 변경은 필요 없음. (`GET /order/:id/items`는 `code_type`을 보지 않지만 화면에서 갈 길이 없고 읽기만 함.)
- **바꾼 파일**: 이 노트만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **남은 일**: 14 `backend/src/utils/labFlag.js`.

## 2026-09-29 — 문제 23 결과 표 참고치 툴팁 · 문제 25 환자 찾기 실패 알림 번역

- **상태**: 확인 요청
- **커밋**: session/laboratory `965bf56` (출발점 `develop` `3aa3f87`)
- **한 일**:
  - 23 (`LabResults.jsx`): 값마다 **그 결과에 저장된 참고치** 툴팁 — `Référence: 하한~상한 단위 · 기준 이름`(취소분은 기존 「Annulé — 이유」 그대로). 참고치 칸은 항목의 **가장 최근 유효한** 결과 것(예전엔 가장 최근 줄이 취소분이면 그 참고치가 칸에 나왔음).
  - 25 (`Lab.jsx` `pickVisit`): 실패 시 `Error: <영어 서버 문구>` → `lb_visitOpenFailed`(ko·en·fr), 상세는 브라우저 콘솔(`[lab] open visit`).
- **바꾼 파일**: `frontend/src/components/LabResults.jsx` · `frontend/src/pages/Lab.jsx` · `wiki/modules/laboratory.md`(2절, 3.5, 7절 23·25, 8절)
- **공용 파일 변경**: `i18n` 세 파일 임상병리 구역에 키 1개 추가 · **DB 마이그레이션**: 없음 · **번역 키**: `lb_visitOpenFailed`
- **확인한 방법**: 빌드. 격리 스택 9185 — 취소분+유효 재검이 있는 환자에서 유효 결과의 Hb 참고치를 DB로 13.0~16·`F · ≥18y`로 바꿔(옛 기준 흉내) → 참고치 칸 「13.0~16 F · ≥18y」(취소분 것 아님), 값 툴팁 「Référence: 13.0~16 g/dL · F · ≥18y」, 취소분 툴팁 「Annulé — Mauvais patient」. 25: 화면에서 `/lab/visit/` 요청을 500으로 바꿔 환자 찾기로 내원 선택 → 「Impossible d'ouvrir les examens de cette visite. Réessayez dans un instant.」(프랑스어).
- **다른 세션에 부탁**: 진료 — 🧪 결과 창의 값에 마우스를 올리면 참고치 툴팁(알림만).
- **남은 일**: 영어 화면 확인 → 14 `utils/labFlag.js`.

## 2026-09-29 — 문제 22: 취소된 결과는 재검 칸 번호를 받지 않음

- **상태**: 확인 요청
- **커밋**: session/laboratory `08f392c` (출발점 `develop` `85979ef`)
- **한 일**: 총괄 지시(재부팅 뒤 첫 작업). `LabResults.jsx` — 날짜·패널마다 **유효한 오더에 먼저** 칸 번호, 취소된 오더(`order_status = cancelled`)는 그 날짜의 유효 칸 수 **뒤** 칸에. 머리: 유효 칸 2개 이상 「날짜 (1)」「(2)」, 1개 「날짜」, 취소 칸 「날짜 ✕」(회색, 툴팁 「취소됨」). 서버 변경 없음.
- **바꾼 파일**: `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(2절 「취소된 검사의 결과」, 3.5, 7절 22, 8절) · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음(`lb_cancelled` 재사용)
- **확인한 방법**: 빌드. 격리 스택 9185(develop `2a76b5f` 기준, 새 DB), 진료 취소 API로 만든 세 경우 — ① 취소 1 + 유효 재검 1 → 「2026-09-29 | 2026-09-29 ✕」(유효가 앞) ② 유효 2 + 가운데 취소 1 → 「(1) ▼12.0 | (2) 13.0 | ✕ 12.5(줄긋기)」 ③ 취소분만 → 「2026-09-29 ✕」 한 칸(진료 화면 🧪 창에서). 프랑스어 화면.
- **다른 세션에 부탁**: 진료 — 🧪 결과 창의 머리에 「날짜 ✕」 칸이 생길 수 있음(알림만).
- **남은 일**: 23 결과 표 참고치 툴팁 → 25 → 영어 화면 → 14 `utils/labFlag.js`.

## 2026-09-29 — 취소 흐름 세 모듈 확인 · 참고치 입력 순서서 · 남은 항목 정리

- **상태**: 합쳐짐(위키만, 총괄 확인 완료)
- **커밋**: session/laboratory `f547b24` (출발점 `develop` `ce5d938`)
- **1) 검사 오더 취소 — 격리 스택(develop `a264315`)에서 세 모듈 이어서**: 한 환자·한 내원에 CBC ① 결과 입력 → CBC ② 재검 결과 입력 → CBC ③ 대기. 진료 API로:
  - 결과 있는 ① 삭제 → **409**, ① 취소(이유 「Mauvais patient」) → **200**, 결과 없는 ③ 취소 → **409**(삭제하라는 뜻, 설계대로).
  - 취소된 ①에 결과 저장 → **409**.
  - 검사실 대기 목록: ③만 · 완료 목록: ②만 · 환자 찾기로 연 내원: ②③(①없음) · 수납 청구 항목: ②③(①없음).
  - 결과 API: ① `order_status: cancelled`, 이유 전달.
  - 화면(프랑스어) — 검사실 결과 표와 진료 화면 「Résultats labo」 창이 같음: 「2026-09-29 (1)」에 ①이 **회색·줄긋기**(색 없음, 툴팁 「Annulé — Mauvais patient」), 「(2)」에 ② 정상 표시. 진료 오더 줄: 「Annulé」 / 「Résultat reçu」 / 「En attente」.
  - **값이 섞이지는 않음.** 다만 취소분도 재검 칸 번호를 받아 **날짜가 (1)(2)로 나뉘고 (1)이 취소분**이 됨 → 7절 문제 22로 적음(후보: 유효한 결과에 번호를 먼저). 바꿀지 총괄 판단 부탁.
- **2) 위키 2절 「의사 선생님이 확정한 참고치 표를 넣는 순서」**: 준비(단위 확인, 「부터 포함·까지 미포함」으로 바꿔 적기) → 검사 하나씩 넣기(기본 Min/Max의 뜻, 펼침 표, 상한 없는 값은 Max 비우기, Note에 출처·확정일) → 저장 거절 알림 네 가지(프랑스어 문구 그대로)와 고치는 법 → 저장하지 않고 환자 화면으로 확인 → 하지 않는 것(미확정 값, 판정 기준형 항목). 값은 적지 않음.
- **3) 7절 남은 항목 분류** — 아래.
- **바꾼 파일**: `wiki/modules/laboratory.md`(상단 상태, 2절 새 소절, 7절 5 결정 반영·22–25 추가, 8절) · 이 노트 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음

### 남은 항목

**결정 필요** (결정 세션 → 의사 선생님)

| 무엇 | 위키 | 비고 |
|---|---|---|
| 참고치 **값**(성별·나이별 포함) | 7절 4 · `reference/lab-reference-ranges-kr.md` | 구조는 준비됨. 확정되면 2절 순서대로 입력 |
| **Trace**를 이상으로 볼지(요단백 등) | 7절 12 | 지금은 이상(빨강). 정상으로 하면 `SAME_WORDS` 또는 예외 목록에 한 줄 |
| 판정 기준형 항목의 **빨강 기준선**(총콜레스테롤 200/240, 중성지방 150/200, LDL 130/160, 공복혈당 100/110, eGFR 60/90) | 제안표 「검토용 요약」 | 값 입력만(코드 없음) |

**결정 없이 가능** (작음 — 총괄이 하라면 바로)

| # | 무엇 | 크기 |
|---|---|---|
| 22 | 취소된 결과가 재검 칸 (1)을 차지 → 유효 결과에 번호 먼저 | 작음(`LabResults.jsx`, 진료 화면도 바뀜) |
| 23 | 결과 표 참고치 칸이 첫 줄 것만 — 칸 값에 마우스를 올리면 그 결과의 참고치·기준 이름 | 작음(`LabResults.jsx`) |
| 24 | 좁은 화면(≈1024px 이하)에서 입력 표가 눌림 — 병원 PC 폭을 알면 맞춤 | 작음(`Lab.jsx`), 현장 화면 폭 확인 필요 |
| 25 | 환자 찾기 실패 알림이 영어 서버 문구 | 아주 작음 |
| 14 | 판정 규칙(`flagFor`)이 화면·서버 두 곳 — 한 파일로 공유 | 중간(빌드 구조 — 프론트·백엔드 공용 모듈을 둘 곳이 총괄 결정) |
| 21 | 단위를 바꾸지 않기로 해서(결정 5) 코드 해결은 급하지 않음. 남은 후보: 결과 표를 이름+단위로 묶기 | 작음 |
| — | 영어 화면은 눌러 본 적 없음(현장은 프랑스어·한국어) | 확인만 |

- **확인 못 한 것**: 수납 화면에서 취소분이 「정정(환불)」로 뜨는 모양(수납 세션 몫, API의 청구 항목에서 빠진 것만 봄).
- **다른 세션에 부탁**: 없음.

## 2026-09-29 — 결정 10: 검사 결과 수정 기록(로그로만)

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `8661ec5` (출발점 `develop` `40a2a6e`)
- **한 일**: 실장님 결정 10 — 화면에 「수정됨」 없이 공통 로그로만. `POST /lab/order/:id/results`에서 지우기 전 옛 줄을 읽고, 새로 넣은 줄(`RETURNING`)과 짝지음(같은 항목 id, 없으면 같은 이름). 짝의 `value`·`flag`·`unit`이 다르면 `writeAudit(client, req, {action: ACTIONS.LAB_RESULT_EDIT, …})` 한 줄(바뀐 칸만 — 함수가 걸러 냄), 짝 없는 옛 줄(값을 지움)은 `after: null`. 처음 입력·같은 값·재검(다른 오더)은 안 남김. `summary` = 「오더 이름 · 검사 이름」, `entity` = `lab_result`, 환자·내원 id 포함. 같은 트랜잭션 `client` 사용.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `wiki/modules/laboratory.md`(2절 「이미 넣은 결과 고치기」, 3.4, 7절 10, 8절)
- **공용 파일 변경**: 없음(`utils/audit.js`는 쓰기만) · **DB 마이그레이션**: 없음(총괄의 `022_audit_log.sql`) · **번역 키**: 없음
- **확인한 방법**: `node --check`. 격리 스택 9185(새 DB) API: ① 처음 입력 → 0줄 ② 같은 값 다시 저장 → 0줄 ③ Hb 12.5→10.1 → 1줄 `CBC · Hb` `{"value":"12.5"}`→`{"value":"10.1"}`(판정은 둘 다 낮음이라 빠짐) ④ Platelet 지움 → 1줄 before `{value 250, flag normal, unit 10^9/L}` after 없음 ⑤ 빈 저장(400, 롤백) → 줄 없음. 줄에 직원 이름·모듈 `laboratory`·환자 이름·차트번호·내원 id 채워짐. 스택 내림.
- **확인 못 한 것**: 기록을 쓴 **뒤에** 저장이 실패해 롤백되는 경우는 만들지 못함(총괄이 함수 단위로 확인한 부분). 설정 → 기록 화면(설정 세션 작업 중)에서 보이는 모양.
- **다른 세션에 부탁**: 설정 — 기록 화면에서 `laboratory.result.edit`의 `summary`는 「CBC · Hb」 모양, before/after 키는 `value`·`flag`(`low`/`high`/`normal`/`abnormal`/빈칸)·`unit`.
- **남은 일**: 없음(결정 대기 항목은 결정 세션 몫 — 참고치 값·Trace·지질 기준선).

## 2026-09-29 — 결정 4-가 구현: 성별·나이별 참고치 구조

- **상태**: 확인 요청
- **커밋**: session/laboratory `9c9bbee` (출발점 `develop` `ff53907`)
- **한 일**: 승인된 설계대로, 총괄 조건(겹치면 저장 **거절**) 반영.
  - **마이그레이션 `backend/sql/501_lab_ref_ranges.sql`** (번호는 총괄이 다시 매김): `lab_ref_range` 테이블 + `lab_result.ref_label`. **추가만, 값 없음.**
  - **설계에서 바꾼 두 가지**(더 단순·정확해서):
    1. 겹침을 막으므로 고르는 규칙이 「성별 지정 줄 → 전체 줄 → 기본값」 뿐(「가장 좁은 구간」 규칙 필요 없어짐). 같은 성별(또는 전체끼리) 안에서만 겹침 금지 — 성별 줄과 전체 줄은 겹쳐도 됨(성별 줄 우선이 분명하므로).
    2. 나이를 일로 바꿔 저장하지 않고 **적은 그대로(`age_min`·`age_max`·`age_unit` d/m/y)** 저장하고 **달력으로** 셈 — 만 나이가 생일 당일에 바뀜(365.25일 근사보다 정확), 기준 이름도 적은 그대로(`F · ≥18y`). 단위가 다른 줄끼리 겹침 비교만 일로 환산.
  - 서버(`lab.routes.js`): `ageIn`·`rangeApplies`·`refFor`·`rangeLabel`·`rangeError`. `GET /order/:id/items`는 그 환자 기준 참고치와 `ref_label`을, `POST /order/:id/results`는 **서버가 다시 골라** 저장(`ref_low/high/text` + `ref_label`). 기준일은 내원일. 생년월일·성별 모르면 기본값. `GET /test-items`에 `ranges`, `POST /test-items/save`는 쓰기 전 전 항목 검사 → 틀리면 400.
  - 설정 검사항목 탭: 항목마다 「▸ 성별·나이별 (n)」 펼침 표(성별·나이 부터~까지·단위·하한·상한·문자·메모·✕, + 줄 추가), 저장 전 화면 검사(번역된 알림). 입력 화면·결과 표: 참고치 아래 작은 기준 이름.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `backend/sql/501_lab_ref_ranges.sql`(새) · `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(2절 새 소절 「성별·나이별 참고치 정하기」, 3.3, 4절 테이블·API, 6절, 7절 4, 8절)
- **공용 파일 변경**: `frontend/src/pages/Settings.jsx` — **검사항목 탭 안만**: 함수 `toggleRanges`·`urng`·`addRng`·`delRng`·`rangeProblem` 추가, `saveLabItems` 앞머리에 검사 한 줄, 탭 JSX(항목 줄에 버튼 칸, 펼침 표, 탭 최대 폭 760→860). 새 state 없음(펼침은 항목 객체의 `_open`). · `i18n` 세 파일 임상병리 구역에 키 추가만.
- **DB 마이그레이션**: `501_lab_ref_ranges.sql` — 새 테이블 + 새 칸. 기존 데이터 변경 없음. 새 DB에서 적용 확인.
- **번역 키**: `lb_ranges` · `lb_rangesHint` · `lb_sex` · `lb_sexAll` · `lb_sexM` · `lb_sexF` · `lb_ageFrom` · `lb_ageTo` · `lb_unitD` · `lb_unitM` · `lb_unitY` · `lb_rangeNote` · `lb_addRange` · `lb_refByPatient` · `lb_errRangeOverlap` · `lb_errRangeAge` · `lb_errRangeLowHigh` · `lb_errRangeEmpty` — 18개, ko · en · fr
- **확인한 방법**: `node --check`, 빌드. node 단위 시험(생일 당일/전날, 정확히 6개월/하루 모자람, 생년월일 없음, 성별 없음·O, 겹침·접함·단위 섞인 겹침, 나이 순서, 하한>상한, 빈 줄). 격리 스택 9185(새 DB):
  - 설정(한국어): Hb에 여 ≥18세 12–16 · 남 ≥18세 13–17 · 전체 0–6개월 9.5–13.5 · 전체 5–24개월 → **겹침 알림, 저장 안 됨** → 6–24개월로 고쳐 저장(4줄). API로 겹치는 줄을 직접 보내도 **400**, 기존 4줄 그대로.
  - 환자 8명 CBC(Hb 입력, 화면이 보낸 참고치를 0–999로 조작): 여 성인 12.5 → 12–16 정상 `F · ≥18y` · 남 성인 12.5 → 13–17 **낮음** `M · ≥18y` · 3개월 10 → 9.5–13.5 정상 `0–6m` · **정확히 6개월** 10 → 10.5–13.5 **낮음** `6–24m` · 6개월 하루 전 10 → `0–6m` 정상 · 생년월일 없음 → 기본 13–17 · **오늘 18세** → `F · ≥18y` · 내일 18세 → 기본값. 조작한 참고치는 무시됨.
  - 여 성인 줄을 11–16으로 고친 뒤: 저장된 옛 결과는 12–16·`F · ≥18y` 그대로, 입력 화면은 11 표시. 범위 없는 WBC는 전과 같음(4.0–10.0, 이름 없음).
  - 프랑스어: 입력 화면·결과 표 「10.5~13.5 / 6–24m」, 설정 펼침 표(Femme/Homme/Tous, jours/mois/ans) — 폭이 좁아 잘리던 버튼(118→150px)·성별 칸(82→104px) 고침. 스택 내림.
- **확인 못 한 것**: 영어 화면. 개월(`m`)·일(`d`) 경계의 말일 처리(예: 1월 31일생의 1개월)는 「다음 달 같은 날짜가 없으면 그 달 말일 다음 날」 식으로 됨 — 임상적으로 하루 차이.
- **총괄 확인 요청**: 마이그레이션 번호 매기기. 설계에서 바꾼 두 가지(위)가 괜찮은지.
- **다른 세션에 부탁**: 접수 — 생년월일이 없으면 성별·나이별 참고치가 적용되지 않음(기본값으로 감). 진료 — 🧪 결과 표 참고치 아래에 기준 이름이 작게 나옴.
- **남은 일**: 결정 10 결과 수정 로그(다음), 참고치 **값**은 의사 확인 뒤 설정에서.

## 2026-09-29 — 결정 4-나: 한국 검사실 참고치 제안표

- **상태**: 합쳐짐(위키만, 총괄 확인 완료 — 결정 세션이 의사 질문으로 넘김)
- **커밋**: session/laboratory `3312109` (출발점 `develop` `f4da66a`)
- **한 일**: `wiki/reference/lab-reference-ranges-kr.md` 새로 씀. EMR의 24개 검사 항목마다 한국 자료(서울대병원·GC녹십자·이원·삼광·서울아산 건강정보, 한국인 참고구간 논문 3편, 당뇨병·지질·신장 학회, 공단 검진 판정은 2차 출처)의 성인 남/여·소아 나이대 값을 출처·조사일과 함께 표로. 맨 앞에 「검토용 요약」(지금 EMR 기본값 · 한국 자료 범위 · 세션 제안 · 성별/소아 구분 필요 여부) — **세션 제안은 여러 출처가 겹치는 값일 뿐 의학적 판단이 아니라고 명시.**
- **중요한 사실**: 한국산 분석기 전용 참고치는 **찾지 못함**(연구 3편은 Sysmex 장비). 지질·혈당·HbA1c·eGFR은 한국 검사실이 참고범위가 아니라 **판정 기준**으로 보고 — 어느 선을 빨강으로 할지 결정 필요(총콜레스테롤 200/240, 중성지방 150/200, LDL 130/160, eGFR 60/90). 요단백 Trace는 기관마다 정상 포함 여부가 다름(결정 12 Trace 질문과 같음). Sung 2021의 소아 BUN은 단위가 의심돼 「쓰지 말 것」으로 표시.
- **확인한 방법**: 웹 조사(에이전트가 페이지·PDF를 열어 수집, 검색 요약에서만 본 값은 제외) + 세션 재확인 3건(GC 크레아티닌 일치, Sung 2021 Hb·요산 원값→환산 일치). 삼광 페이지는 https로 안 열려 재확인 못 함.
- **바꾼 파일**: `wiki/reference/lab-reference-ranges-kr.md`(새 파일) · 이 노트 · **공용 파일 변경**: 없음(`wiki/reference/`에 새 파일) · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **총괄 확인 요청**: 결정 세션께 — 의사 선생님께 보여 드릴 때 「검토용 요약」 표 + 「출처끼리 차이가 큰 것」 절을 먼저. 판정 기준형 항목(지질·혈당·eGFR)은 「어느 선을 이상으로」를 따로 여쭤야 함.
- **남은 일**: 4-가 구조 구현(승인됨, 진행 중).

## 2026-09-29 — 결정 3-B 임상병리 몫: 취소된 오더 저장 거절 · 결과 표 회색 표시

> **총괄 확인 (2026-09-29)**: 취소 몫 `1ef0be2` 합침(`4e35046`) + 실행 중 EMR 반영 — 진료 취소 API 전에는 동작 변화 없음. 참고치 구조 설계 `1fcd84d` **승인**.

- **상태**: 합쳐짐(총괄 확인 완료, `4e35046`) — 진료 취소 API도 합쳐져 실행 중 EMR에서 켜짐(마이그레이션 023)
- **커밋**: session/laboratory `1ef0be2` (출발점 `develop` `6a96193`)
- **한 일**: 승인된 설계(아래 항목)의 ①③.
  - ① `POST /lab/order/:id/results`: `SELECT … FOR UPDATE`로 읽고 `status = 'cancelled'`면 **409 `Order is cancelled`**. 화면(`Lab.jsx`)은 오더 삭제(404)와 같은 방식 — `lb_orderCancelled` 안내 후 그 내원을 다시 불러옴.
  - ③ `GET /lab/patient/:id/results`: `oi.status AS order_status`, `to_jsonb(oi)->>'cancel_reason' AS cancel_reason` 추가 — **진료 마이그레이션 전에도 깨지지 않음**(칸이 없으면 NULL). `LabResults.jsx`: 취소분은 회색·줄긋기·▲▼! 없음, 툴팁 「취소됨 — 이유」(이유 없으면 「취소됨」). 줄·칸(재검 칸 포함)은 그대로 차지.
  - 목록(대기·완료·환자 찾기)은 원래 `cancelled` 제외 — 변경 없음.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(2절 새 소절 「취소된 검사의 결과」, 5절, 7절 3, 8절)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — 임상병리 구역에 키 추가만 · **DB 마이그레이션**: 없음 · **번역 키**: `lb_cancelled` · `lb_orderCancelled`
- **확인한 방법**: `node --check`, 빌드. 격리 스택 9185 — 진료 취소 API가 아직 없어 SQL로 `order_item.status = 'cancelled'`: 저장 시도 → 409 `Order is cancelled` · 결과 API `order_status: cancelled`, `cancel_reason: null`(칸 없을 때 깨지지 않음) · `ALTER TABLE … ADD cancel_reason` 후 이유 `Mauvais patient` 전달 · 완료 목록에서 빠짐 · 프랑스어 결과 표에서 취소 칸 회색·줄긋기(Hb 10.4가 ▼ 없이), 툴팁 「Annulé — Mauvais patient」. 스택 내림.
- **확인 못 한 것**: 진료 화면의 실제 취소 흐름(진료 세션 몫)과 이어서 본 것은 아님. 화면에서 취소된 오더에 저장하는 경우는 목록에 안 나와 재현이 어려워 API로만 확인(동시 작업 때만 생김).
- **다른 세션에 부탁**: 진료 — 취소 API는 설계대로 `FOR UPDATE`로 잠가 주세요(임상병리 저장과 순서가 정해지도록). 칸 이름 `cancel_reason`을 쓰면 결과 표 툴팁에 이유가 나옵니다. 진료 화면 🧪 창도 같은 표시가 됨.
- **남은 일**: 4(나) 참고치 표(조사 결과 대기) · 4(가) 구조 설계 승인 대기(아래 항목).

## 2026-09-29 — 설계: 성별·나이별 참고치 구조 (결정 4-가) — 코드 전, 승인 요청

- **상태**: 승인됨(총괄, 2026-09-29 — 조건: 겹치면 저장 거절) — 구현은 맨 위 항목
- **커밋**: session/laboratory `1fcd84d` (설계만)
- **결정**: 검사 항목마다 성별·나이대별 참고치를 둘 수 있고, 값이 없는 경우는 지금의 기본 참고치를 씀. **값은 넣지 않음**(한국 기준 표는 4-나 제안, 실장님·의사 확인 뒤 설정 화면으로 입력).

### 데이터 — 마이그레이션 `501_lab_ref_ranges.sql` (추가만, 기존 값·동작 그대로)

```sql
CREATE TABLE IF NOT EXISTS lab_ref_range (
  id               SERIAL PRIMARY KEY,
  lab_test_item_id INTEGER NOT NULL REFERENCES lab_test_item(id) ON DELETE CASCADE,
  sex              VARCHAR(1) CHECK (sex IN ('M','F')),   -- NULL = 남녀 모두
  age_min_days     INTEGER,        -- NULL = 하한 없음. 이 나이 이상(포함)
  age_max_days     INTEGER,        -- NULL = 상한 없음. 이 나이 미만(불포함)
  ref_low          NUMERIC,
  ref_high         NUMERIC,
  ref_text         VARCHAR(60),
  note             VARCHAR(200),   -- 출처 등 (예: 「대한진단검사의학회 2023, 확인 2026-10-xx」)
  sort_order       INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lrr_item ON lab_ref_range(lab_test_item_id);
ALTER TABLE lab_result ADD COLUMN IF NOT EXISTS ref_label VARCHAR(40);  -- 그때 쓴 기준 이름(예: 「여 · 18세~」), 기본값이면 NULL
```

- **단위는 항목 하나에 하나** — 범위 줄에 단위 칸을 두지 않음(단위가 섞이지 않게, 문제 21 안전장치 그대로).
- 나이는 **일(day)** 단위로 저장(신생아 0~7일·8~30일 같은 구간 때문). 설정 화면은 「일 / 개월 / 세」로 입력하고 저장 때 일로 바꿈(개월 = 30.4375일, 세 = 365.25일 — 생일 전후 하루 차이는 임상적으로 무시).
- 옛 결과는 건드리지 않음 — `lab_result`에는 이미 **그때 쓴 참고치**(`ref_low/high/text`)가 복사돼 있고, 새 `ref_label`은 앞으로 저장되는 것부터.

### 고르는 규칙 (서버 한 곳, `lab.routes.js`)

환자의 **성별**과 **검사일(내원일) 기준 나이(일)** = `visit_date − date_of_birth`로:

1. 후보: 그 항목의 범위 줄 중 `sex`가 비었거나 환자와 같고, 나이가 `[age_min_days, age_max_days)` 안에 드는 것.
2. 여럿이면 **가장 구체적인 것**: 성별이 지정된 줄 우선 → 나이 구간이 좁은 줄 우선(한쪽이 비면 무한대로 봄) → `sort_order`.
3. 없으면 **지금의 기본 참고치**(`lab_test_item.ref_low/high/text`) — 기본값 줄의 `ref_label`은 NULL.
4. 생년월일이 없으면 나이 조건이 있는 줄은 후보에서 빠짐, 성별이 없거나 `O`면 성별 줄은 빠짐 → 결국 기본값으로 감(모르는 것을 추측하지 않음).

쓰는 곳: `GET /order/:id/items`(입력 화면에 그 환자의 참고치를 보여줌), `POST /order/:id/results`(저장 때 서버가 다시 골라 판정 — 문제 15처럼 화면 값을 믿지 않음). 판정 규칙(`flagFor`)은 그대로이고 **어떤 범위를 넣느냐만** 바뀜.

### 화면

- **입력 화면**: Référence 칸이 그 환자 기준으로 나오고, 기본값이 아니면 옆에 작게 기준 이름(예: `F · 18–`). 새 번역 키 몇 개(`lb_sexM`/`lb_sexF`/나이 단위).
- **결과 표**(`LabResults`): 참고치 칸은 지금처럼 저장된 값(환자별) — 나이대가 바뀐 소아는 최근 기준이 보임(기존과 같은 한계, 위키에 적음).
- **설정 → 검사항목 탭**: 항목 줄 끝에 **「성별·나이별 (n)」** 버튼 → 그 항목 아래에 작은 표가 펼쳐짐: 성별(전체/남/여) · 나이 부터(포함)~까지(미포함) + 단위(일/개월/세) · 하한 · 상한 · 문자 · 메모(출처) · ✕. 기존 **Sauver** 한 번에 항목과 함께 저장(`POST /test-items/save`의 항목에 `ranges` 배열 추가 — 항목 id가 유지되므로 범위는 항목별로 지우고 다시 넣어도 안전, 범위 id를 참조하는 곳 없음).
- 설정 화면 검사: 하한 > 상한이면 저장 거절, **같은 성별에서 나이 구간이 겹치면 경고**(막지는 않음 — 규칙 2로 결정적으로 골라지지만 의도와 다를 수 있으므로).

### 4-b HDL 상한

코드 없음 — 설정에서 HDL의 Max를 비우면 됨(2절 「참고치 고치기」). 4-나 표를 의사 선생님이 확인할 때 함께.

### 확인 계획 (격리 스택)

남·여·소아(생년월일로 나이 조절)·생년월일 없음·성별 없음 환자에 같은 검사 → 입력 화면 참고치·저장된 `ref_low/high/ref_label`·판정 확인. 범위 없는 항목은 지금과 똑같이 동작하는지(회귀). 설정 탭에서 범위 추가·수정·삭제·겹침 경고. 한국어·프랑스어.

### 여쭐 것

- 없음(구조는 결정 4의 추천안 C 그대로). 나이를 「검사일 기준」으로 계산하는 것만 확인 부탁 — 오늘 기준이 아니라 그날의 나이.

- **바꾼 파일**: 이 노트만 · **공용 파일 변경**: 없음(구현 때 설정 검사항목 탭 안 + i18n 임상병리 구역) · **DB 마이그레이션**: 없음(구현 때 `501_lab_ref_ranges.sql` 1건) · **번역 키**: 없음(구현 때 몇 개)

## 2026-09-29 — 설계: 결과가 있는 잘못 낸 오더를 「취소」로 표시 (결정 3-B) — 코드 전

- **상태**: 승인됨(총괄, 2026-09-29) — 임상병리 몫 ①③ 구현은 그 위 항목
- **커밋**: session/laboratory `ca83b32`
- **결정**: 결과는 기록으로 남기고 목록·청구에서 뺀다. 「검사 안 함」 버튼은 없음 — **진료실에서 결과 있는 오더를 지우려 할 때** 묻는다(지금은 409로 거절).

### 흐름

```
진료 화면 ✕ ─▶ DELETE /api/consultations/order/:id
                 ├ 결과 없음 → 지금처럼 삭제
                 └ 결과 있음 → 409 ORDER_HAS_RESULT (지금 그대로)
                        ▼ 화면이 409를 받으면
               「결과가 있습니다. 취소로 표시할까요? (이유: ____)」 [취소로 표시] [닫기]
                        ▼
               POST /api/consultations/order/:id/cancel  {reason}
                 → order_item.status = 'cancelled', cancelled_at/by/reason 기록
                 → lab_result·판독·영상은 그대로 남음
```

### 세션별 할 일

| 세션 | 파일 | 할 일 |
|---|---|---|
| **진료** | `consult.routes.js` · `Consultation.jsx` | ① 새 `POST /order/:orderId/cancel`(권한 consultation): `SELECT … FOR UPDATE` → 이미 `cancelled`면 그대로 200, 결과가 **없으면** 409(취소 말고 삭제하라는 뜻 — 두 길이 섞이지 않게), 있으면 `status='cancelled'` + 아래 칸. ② 삭제 409를 받으면 확인 창(이유 한 줄, 선택). ③ 취소된 줄은 회색·줄긋기 + 「취소됨 / Annulé」(키 `cs_labCancelled` 이미 있음), 수량 등 수정·✕ 막기(서버도 `PUT /order/:id`에서 `cancelled` 거절). ④ 되돌리기(취소 해제)는 **만들지 않음** — 필요하면 실장님께(아래 질문). |
| **진료 (마이그레이션)** | `backend/sql/2xx_…` | `order_item`에 `cancelled_at TIMESTAMPTZ`, `cancelled_by INTEGER REFERENCES staff(id)`, `cancel_reason TEXT` 추가(추가만, 기존 데이터 그대로). `status` CHECK에 `cancelled`는 이미 있음(`001_schema.sql`). |
| **임상병리** | `lab.routes.js` · `Lab.jsx` · `LabResults.jsx` | ① `POST /order/:id/results`: `FOR UPDATE`로 읽고 `status='cancelled'`면 **409 거절** — 지금은 취소된 오더에 저장하면 `completed`로 되살아남. 화면은 「이 검사는 진료실에서 취소되었습니다」 안내 후 다시 불러옴(오더 삭제 안내와 같은 방식). ② 대기·완료 목록·환자 찾기 입력 화면: 이미 `cancelled`를 빼고 있음(`/pending` `NOT IN ('completed','cancelled')`, `/completed` `= 'completed'`, `/visit/:id/orders` `<> 'cancelled'`) — 그대로. ③ 결과 표(`LabResults`, 진료 화면도): `/patient/:id/results`가 `oi.status AS order_status`를 함께 주고, 취소된 오더의 값은 **회색·줄긋기, 색(▲▼!) 없이**, 칸에 마우스를 올리면 「취소됨 — 이유」. 줄은 지우지 않음(기록). 재검 칸 나누기에는 그대로 한 칸 차지. ④ 위키 2·3·5절. 번역 키 `lb_orderCancelled` 등 2~3개. |
| **수납** | `billing.routes.js` · `Payment.jsx` | `order_item`을 상태 없이 합산하는 곳 3곳에 `AND o.status <> 'cancelled'`: 대기 목록의 현재 합계(`live_total`, `GET /pending`), 청구할 항목(`GET /visit/:visitId/items`), 정정 계산(`buildCorrection()`). 이미 수납한 내원이면 합계가 줄어 **「정정(환불)」**으로 뜨는 기존 흐름을 탐. ⚠ `counterFeeCond()`의 `order_item` 부분(창구 수수료 판별)은 **취소된 오더도 포함한 채로** 둘지 수납 세션이 판단 필요 — 빼면, 취소된 fee 오더의 청구 줄이 「창구 수수료」로 잘못 분류되어 환불에서 빠질 수 있음. |
| **통계** | `stats.routes.js` | 지금 검사 건수 통계는 없음(`order_item`을 읽지 않음, grep 확인). 매출은 수납 기록을 따르므로 수납이 고치면 따라옴. 나중에 검사·오더 건수를 세게 되면 `cancelled` 제외. |
| **PACS** | `pacs.routes.js` · `worklist.routes.js` | **의견 필요**: 영상 오더도 같은 방식(촬영·판독이 있으면 취소 표시)으로 할지. 영상은 `worklist_log`·`worklist_status`(`cancelled` 값 있음)·Orthanc 영상이 따로 있어서, 취소 때 워크리스트를 `cancelled`로 보낼지, 이미 찍은 영상·판독을 어떻게 보일지 정해야 함. 진료 쪽 취소 API는 `code_type`을 가리지 않게 만들되, 영상에 대해 켤지는 PACS 의견 뒤에. |

### 순서 (의존)

1. 진료 마이그레이션 + 취소 API (다른 세션이 기대는 것)
2. 임상병리 ① 저장 거절 — **1과 같은 배포에 들어가야 함**(아니면 취소된 검사가 저장으로 되살아남)
3. 수납 3곳, 진료 화면 확인 창, 임상병리 ③ 결과 표 — 순서 무관
4. PACS 의견 뒤 영상 적용 여부

### 실장님께 여쭐 것 (결정 세션께)

- 취소할 때 **이유 한 줄**을 필수로 할지(추천: 선택 — 의무기록상 있으면 좋지만 급할 때 막지 않게).
- **취소 되돌리기**가 필요한지(추천: 만들지 않음 — 잘못 취소했으면 오더를 다시 내면 됨. 결과는 옛 오더에 남아 있음).
- 결정 10(수정 이력 — 「로그로만」)이 공통 로그로 정해지면 취소도 그 로그에 남기기.

- **바꾼 파일**: 이 노트만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음(설계상 진료 세션 몫 1건) · **번역 키**: 없음
- **확인한 방법**: 코드 읽기 — `consult.routes.js` `DELETE /order/:orderId`(409 조건: `lab_result` 있음 · 워크리스트 진행/완료 · `result_text` 있음), `billing.routes.js` `order_item` 합산 3곳과 `counterFeeCond()`, `stats.routes.js`(order_item 없음), `lab.routes.js` 목록 조건, `Consultation.jsx`의 `cs_labCancelled` 표시.

## 2026-09-29 — 결정 8 반영: 결과 표에서 같은 날 재검 둘 다 보이기

> **총괄 확인 (2026-09-29)**: 결정 8 `26b861b` 합침(`2d7f6f0`) + 실행 중 EMR 반영. 「결과 있는 오더 취소」 설계 `943909c` 확인 — 승인, 세션별 몫을 총괄이 나눠 줌.

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `26b861b` (출발점 `develop` `23bde17`)
- **한 일**: 실장님 결정 8(B). `LabResults.jsx` — 날짜·패널마다 오더를 입력 시각 순으로 1번째·2번째 칸에 배치, 재검이 있는 날짜만 「날짜 (1)」「날짜 (2)」로 나누고 값 아래에 입력 시각(HH:MM). 다른 패널은 1번 칸을 같이 써서 보통 날은 그대로 한 칸. 예전엔 나중 결과가 앞 결과를 덮어 하나만 보였음. 서버 변경 없음(`/lab/patient/:id/results`가 이미 `order_item_id`·`result_at`을 줌).
  - 총괄 요청: 위키 3.3에 `<x`·`>x` 예시 표(9줄, 코드로 판정 확인).
- **바꾼 파일**: `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(2절, 3.3, 3.5, 7절 8, 8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 빌드 통과. 격리 스택 9185 — 한 환자에 같은 날 CBC 두 번(입력 시각 3시간 차이) + 같은 날 간기능 + 7일 전 CBC. 결과 표: `2026-09-29 (1)` WBC ▲15.2 15:16 / `(2)` ▲11.0 18:16, 간기능은 (1)에만, 7일 전 날짜는 한 칸·시각 없음(한국어 화면). 스택 내림.
- **확인 못 한 것**: 진료 화면 🧪 창(같은 부품), 프랑스어 화면(날짜·숫자만 바뀌어 새 글자 없음).
- **다른 세션에 부탁**: 진료 — `LabResults` 표에 재검 날짜가 (1)(2) 칸으로 나뉘어 보일 수 있음(알림만).
- **남은 일**: 4(나) 참고치 표(조사 진행 중) → 3 설계 → 4(가) 설계.

## 2026-09-29 — 결정 12 반영: 글자 결과가 참고 글자와 다르면 이상(abnormal)

- **상태**: 합쳐짐(총괄 확인 완료 — `<x`·`>x`는 보수적 규칙으로 유지, 예시 표는 다음 항목에서 위키 3.3에 넣음)
- **커밋**: session/laboratory `2a24cc3` (출발점 `develop` `279137e`)
- **한 일**: 실장님 결정 12(B). 판정 함수를 화면·서버 모두 `flagFor(value, lo, hi, refText)`로 바꿈(같은 코드).
  - 참고 글자(`ref_text`)가 있는 항목에서 결과 글자가 다르면 새 판정 **`abnormal`** — 입력 칸 빨강, 결과 표 빨강 `! 값`. 비교는 대소문자·악센트·띄어쓰기·마침표·괄호 무시. 같은 말 묶음 `SAME_WORDS` = `negative · neg · negatif · - · 음성`(표기만 다른 같은 말만). **Trace는 넣지 않음** → 지금은 `abnormal`, 의사 확인 뒤 묶음/예외에 추가할 수 있는 구조.
  - `1+`처럼 숫자로 읽히는 글자도 하한·상한이 없는 항목이면 글자 비교로 → `abnormal`.
  - `<x`·`>x`(추천안 B에 포함): 확실할 때만 판정(예: 상한 400에 `>500` → high, 상한만 40인 항목에 `<5` → normal), 나머지는 판정 없음.
  - 숫자 판정 규칙·기준값은 그대로. **이미 저장된 결과의 flag는 바뀌지 않음**(저장 때 굳힌 값) — 예전에 `Positive`로 저장된 말라리아는 다시 저장해야 빨강이 됨.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`(2절, 3.3, 7절 12·14, 8절)
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음(`lab_result.flag` VARCHAR(10)에 `abnormal` 8자) · **번역 키**: 없음
- **확인한 방법**: node로 22가지 경우(Positive/Négatif/neg./(-)/음성/양성/Trace/1+/`<5`/`>500`/`>=90`/쉼표 소수 등) — 테스트에서 **한글 `음성`이 NFD로 쪼개져 다르게 판정되는 버그**를 찾아 NFC로 고침. 격리 스택 9185: 말라리아 `Positive`, 요검사 `Trace`·`음성`·`Négatif`·`1+` 입력 → 입력 칸 빨강 3개, 저장된 flag `abnormal`/`normal` 확인, 결과 표 `! Positive` `! Trace` `! 1+`(프랑스어 화면). 스택 내림.
- **확인 못 한 것**: 진료 화면의 🧪 결과 창은 같은 부품이라 따로 열어 보지 않음. 영어 화면.
- **알게 된 것(작음, 안 고침)**: 브라우저 폭이 좁으면(약 1024px 이하) 가운데 입력 표가 눌려 글자가 세로로 꺾임. 병원 PC 화면 폭이 좁다면 고칠 후보.
- **다른 세션에 부탁**: 진료 — `LabResults`에 빨강 `!` 표시가 새로 생김(글자 결과 이상). 통계 — 검사 flag 값에 `abnormal`이 새로 생김(통계가 flag를 세면 알아 둘 것).
- **남은 일**: 8 → 4(나) 표 → 3 설계 → 4(가) 설계.

## 2026-09-29 — 위키 문장 고침: 화면 메뉴 권한 반영 시점

- **상태**: 합쳐짐(위키만)
- **커밋**: session/laboratory `92a9212` (출발점 `develop` `bb80dca`)
- **한 일**: 총괄 요청. 4절의 「화면 메뉴가 재로그인 없이 바뀌는지는 확인 필요」를 「메뉴는 화면을 열 때와 5분마다 계정을 다시 읽어 맞춰짐(`TopBar.jsx`, `c4d4d67`)」으로. `TopBar.jsx`에서 `/auth/me` 호출과 300000ms 간격을 읽어 확인. 지난 두 항목 상태를 「합쳐짐」으로.
- **바꾼 파일**: `wiki/modules/laboratory.md`(4절, 8절) · 이 노트 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 화면에서 권한을 바꿔 5분 기다려 보지는 않음(코드 읽기). · **다른 세션에 부탁**: 없음 · **남은 일**: 결정 3·4·5·12 대기.

## 2026-09-29 — 서버 권한(S2): 검사 API 권한 정리, 간호사 계정 확인

> **총괄 확인 (2026-09-29)**: S2 `20ace07` 합침(`f89b3d7`) + 실행 중 EMR 반영. 검사 전용 계정으로 확인. 메뉴가 재로그인 없이 바뀌지 않던 것은 총괄이 `TopBar.jsx`에서 고침(`c4d4d67`).

- **상태**: 합쳐짐(총괄 확인 완료, `f89b3d7`). 「화면 메뉴가 재로그인 없이 바뀌는지」는 총괄이 `c4d4d67`로 해결(맨 위 항목)
- **커밋**: session/laboratory `20ace07` (출발점 `develop` `e54a1b2`)
- **한 일**: 실장님 결정 S2(서버도 화면 권한대로 막기). `GET /lab/test-items`가 로그인만 확인하던 것을 `permMiddleware('lab', 'settings')`로. **진료 화면은 이 API를 읽지 않음**(프론트 전체 grep: `/lab/test-items`는 `Settings.jsx`만) → consultation은 넣지 않음. 나머지 lab 라우트는 이미 권한이 붙어 있었음. 위키 4절 API 표 권한 칸 정리 + S1(매 요청 DB에서 권한 읽음) 설명. 총괄 요청으로 5절에 진료 화면의 결과 도착 표시(`bdd14bf`) 한 줄.
- **권한 확인 표**(격리 스택 9185, 역할별 계정으로 실제 요청. 400은 권한 통과 후 빈 본문이라 거절된 것):

  | 경로 | 권한 | 관리자 | 간호사 | lab만 | 약국만 | 의사 |
  |---|---|---|---|---|---|---|
  | GET `/lab/pending` | lab | 200 | 200 | 200 | 403 | 403 |
  | GET `/lab/completed` | lab | 200 | 200 | 200 | 403 | 403 |
  | GET `/lab/visit/:id/orders` | lab | 200 | 200 | 200 | 403 | 403 |
  | GET `/lab/order/:id/items` | lab | 200 | 200 | 200 | 403 | 403 |
  | POST `/lab/order/:id/results` | lab | 400 | 400 | 400 | 403 | 403 |
  | GET `/lab/patient/:id/results` | consultation · lab | 200 | 200 | 200 | 403 | 200 |
  | GET `/lab/test-items` | **lab · settings (새로)** | 200 | 200 | 200 | 403 | 403 |
  | POST `/lab/test-items/save` | settings | 400 | 403 | 403 | 403 | 403 |

  검사 화면이 함께 쓰는 남의 API(환자 찾기 `/patients`·`/visits/patient/:id`, 차트뷰어 `/admin/clinic`·`/patients/:id`·`/documents/patient/:id`)도 간호사·lab만 계정으로 200.
- **간호사 계정 화면 확인**(프랑스어): 메뉴 Enregistrement·Pharmacie·Laboratoire, 대기 목록(「En consultation」), 환자 선택, 📋 Dossier (vue) 열림(콘솔 오류 없음), 값 입력·저장 → 결과 표 ▼10,8, Terminé 1, 🔍 Trouver patient 검색 — 모두 정상.
- **바꾼 파일**: `backend/src/routes/lab.routes.js`(한 줄 + 주석) · `wiki/modules/laboratory.md`(4절, 5절, 8절) · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 설정에서 권한을 바꾼 뒤 **화면 메뉴**가 다시 로그인 없이 바뀌는지(서버는 바로 적용됨 — 코드로 확인). 진료 화면의 결과 도착 표시는 진료 세션 확인분이라 직접 보지 않음.
- **다른 세션에 부탁**: 없음 · **남은 일**: 결정 3·4·5·12 대기.

## 2026-09-29 — 위키 정리: 문제 9(진료 화면 lab 오더 상태 칸) 해결됨으로

- **상태**: 합쳐짐(위키만)
- **커밋**: session/laboratory `28ea7f8` (출발점 `develop` `5c0bd43`)
- **한 일**: 진료 세션 `f48cec9`로 진료 화면이 lab 오더에 `o.status`(완료/취소)를 보여주게 된 것을 확인(`Consultation.jsx`의 `code_type==='lab'` 분기) — `modules/laboratory.md` 5절 설명과 7절 문제 9를 해결됨으로.
- **바꾼 파일**: `wiki/modules/laboratory.md` · 이 노트 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 코드 읽기. **확인 못 한 것**: 진료 화면을 직접 눌러 보지는 않음(진료 세션이 확인 중).
- **다른 세션에 부탁**: 없음 · **남은 일**: 결정 3·4·5·12 대기.

## 2026-09-29 — 결정 7번 반영: 검사 오더 즉시 대기 목록에(「진료 중」), 목록은 오늘만

> **총괄 확인 (2026-09-29)**: `1d4c239` 합침(`5bb7514`) + 실행 중 EMR 반영. `/completed`를 「오늘 결과 입력」 기준으로 한 판단에 동의 — 「오늘만」 결정은 대기 목록에 대한 것이고, 오늘 한 일이 오늘 완료 목록에 나오는 것이 맞음. 실행 중 EMR에서 `/lab/pending`·`/lab/completed` 200 확인.

- **상태**: 합쳐짐(총괄 확인 완료, `5bb7514`)
- **커밋**: session/laboratory `1d4c239` (출발점 `develop` `f4df9bc`)
- **한 일**: 실장님 결정(`decisions.md`) — ① 오더를 내는 즉시 검사 목록에 · ② 목록은 **오늘만**(세션 추천 7일과 다름) · 「검사 안 함」 버튼 없음. 계획 노트의 ①만 구현, ②는 하지 않음.
  - `GET /pending`: `c.status = 'completed'` 조건 제거, `consultation_status` 추가, 접수 취소 내원(`v.status <> 'cancelled'`) 제외, 순서는 첫 검사 오더 시각(`MIN(o.created_at)`) — 진료 중 진료의 `updated_at`은 기록을 고칠 때마다 바뀌어 목록이 뒤섞이므로.
  - `GET /completed`: 「오늘 내원」→「오늘 결과 입력」(`result_at` 오늘 범위), 접수 취소 제외. **이유**: 오늘만 보인다는 결정은 대기 목록 이야기이고, 어제 검체를 환자 찾기로 열어 오늘 끝낸 것은 오늘 한 일이므로 오늘 완료 목록에 있어야 고치러 다시 찾기 쉬움. 오늘 내원 건은 전과 똑같이 보임(결과를 넣은 날 = 오늘). 지난 날 검사가 대기 목록에 다시 나타나지는 않으므로 결정과 충돌하지 않음.
  - `GET /visit/:visitId/orders`(환자 찾기): 날짜 제한 없음 — 그대로. `consultation_status`만 추가. **어제 내원의 미완료 검사를 환자 찾기로 열어 입력·저장 가능함을 확인**(코드 변경 필요 없었음).
  - 화면: 목록·머리줄에 노란 「진료 중 / En consultation」. 입력 중 진료실에서 오더가 지워지면(저장 404 `Order not found`) 「이 검사는 진료실에서 오더가 지워졌습니다…」 안내 후 그 내원을 다시 불러오고, 보던 검사가 없어졌으면 남은 검사로(전부 없으면 선택 해제).
  - 설정 세션 부탁: 검사항목 탭 `saveLabItems`·`createPanel`의 오류 알림에 `seMessage(t, …)` 적용.
  - 총괄 요청: 위키 2절 첫머리에 「간호사 계정(Infirmier(ère))은 기본으로 검사 화면과 약국 화면을 모두 씀」.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `frontend/src/pages/Lab.jsx` · `wiki/modules/laboratory.md`(상단, 2절, 4절 API 표, 5절, 7절 문제 7, 8절)
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — 검사항목 함수 `saveLabItems`·`createPanel`의 `alert` 두 줄만(`err.message` → `seMessage(t, err.message)`, import는 이미 있음).
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — 임상병리 구역에 키 추가만.
- **DB 마이그레이션**: 없음
- **번역 키**: `lb_inConsultation` · `lb_orderRemoved` — ko · en · fr
- **확인한 방법**: `node --check`, 빌드 통과. 격리 스택 9185 — 진료 중 내원(CBC+말라리아), 진료 완료 내원, 접수 취소 내원, 어제 내원을 만듦.
  - API: 대기 목록 = 진료 중(`in_progress`) + 진료 완료만, 취소·어제 제외, 오더 낸 순.
  - 한국어: 「진료 중」 표시(목록·머리줄). 말라리아 오더를 진료 API로 지운 뒤 CBC·말라리아를 적고 「전체」 저장 → 「저장·완료: CBC / Malaria RDT — 이 검사는 진료실에서 오더가 지워졌습니다…」, 화면은 CBC만 남고, 환자는 대기 목록에서 빠짐.
  - 프랑스어: 🔍 Trouver patient → 어제(2026-09-28) 내원 → 혈당 입력·저장 → 오늘 **Terminé**에 어제 날짜로 나옴, 「En consultation」 표시. 설정 → Items de test → 이미 있는 코드 L01로 새 패널 → 「Erreur: Un élément avec ce code ou cet identifiant existe déjà.」
  - 확인 후 스택 내림.
- **확인 못 한 것**: 영어 화면은 문구만. 진료 화면 쪽(진료 중인 의사 화면)에는 아무 변화가 없어 따로 보지 않음.
- **총괄 확인 요청**: `/completed` 기준을 「오늘 결과 입력」으로 바꾼 판단(위 이유)이 결정과 맞는지 봐 주세요.
- **다른 세션에 부탁**: 진료 — 이제 검사 오더가 진료 중에도 검사 화면에 뜹니다(진료 쪽 변경 없음). 진료 화면의 lab 오더 상태 칸(`o.worklist_status` → `o.status`) 부탁은 여전히 유효 — 결과가 들어왔는지를 의사가 진료 중에 알아야 하는 흐름이라 더 중요해짐.
- **남은 일 · 알려진 문제**: 결정 3·4·5·12 대기.

## 2026-09-29 — 현장 사정 반영: 검사실 직원 없음, 간호사가 약국·검사를 함께

> **총괄 확인 (2026-09-29)**: 합침(위키만). 코드에 직함 글자가 없다는 것 확인. 「저장 안 한 값이 있을 때 다른 메뉴로 가면 확인 창」은 여러 화면에 공통이라 총괄이 검토 항목으로 적어 둠.

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `bed6c43` (코드 변경 없음, 출발점 `develop` `02225be`)
- **한 일**: 총괄 전달(`00-overview.md` 2-1절). 코드·번역 파일에서 입력자를 직함으로 부르는 글자를 찾았으나 **없음**(`Lab.jsx`, `LabResults.jsx`, `i18n` 세 파일의 `lab`·`lb_` 키, 설정 검사항목 탭 — 「technicien」「laborantin」「검사실 직원」「lab staff」 없음. 결과 화면에 입력자 표시 칸 자체가 없음). 그래서 위키만 고침.
  - 1절: 현장에는 검사실 직원이 없고 간호사가 함께 한다는 것, 이 문서는 「입력한 사람」으로 부른다는 것.
  - 2절 첫머리: **간호사 한 사람이 Pharmacie·Laboratoire 화면을 오가며** 쓴다는 한 줄 + 「다른 화면으로 가면 저장하지 않은 결과값은 사라지니 옮기기 전에 저장」(코드로 확인: 입력값은 화면 안에만 있어 메뉴를 옮기면 없어짐, 대기 목록은 서버에 있어 그대로).
  - 「검사실 직원이/검사실이 (입력)」을 직함 없는 말로, `입력자` → `입력한 사람`(1·3·4·5·7절). 「검사실 화면」처럼 **화면 이름**으로 쓴 곳은 그대로.
  - 지난 7번 계획 항목의 「검사실이 입력하는 사이에」 한 줄도 같이 고침.
- **바꾼 파일**: `wiki/modules/laboratory.md` · 이 노트 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 위 파일들에서 직함 글자 검색. 위키 문구 검토.
- **확인 못 한 것**: 없음(코드 변경 없음).
- **총괄 확인 요청**: 없음.
- **다른 세션에 부탁**: 없음. (설정 세션의 간호사 역할 추가는 임상병리 쪽 변경이 필요 없음 — 검사 화면은 `lab` 권한만 봄)
- **남은 일 · 알려진 문제** — 한 사람이 화면을 오간다는 전제에서 떠오른 후보(결정 필요, 아직 안 함):
  - 저장하지 않은 결과값이 있는데 다른 메뉴로 가려 하면 **「저장하지 않은 값이 있습니다」 확인**을 띄우기. 메뉴(`TopBar.jsx`)는 총괄 파일이라, 하려면 화면 안에서 브라우저 이동을 막는 방식이나 총괄과 협의가 필요.
  - 나중에 결정 10번(수정 이력)으로 입력한 사람을 화면에 보이게 되면 이름표는 「입력한 사람 / Saisi par」로.

## 2026-09-29 — 작업 계획: 7번(검사실 대기 목록)이 「오더 즉시 + 최근 7일」로 결정될 때

- **상태**: 결정됨 — ①만 구현(맨 위 항목). ②(7일)는 「오늘만」으로 결정되어 하지 않음, 「검사 안 함」 버튼도 만들지 않음
- **커밋**: session/laboratory `4aad583` (출발점 `develop` `ff37c0d`)
- **한 일**: 총괄 요청. 결정 7번의 두 질문(① 진료 완료 전에도 뜰지 ② 며칠 전까지 뜰지)이 추천대로 「① 오더 즉시 · ② 최근 7일」로 나올 때의 작업을 미리 정리. 약국 M3(지난 날 대기 처방, 추천 7일)과 **같은 기간 정의·같은 표시**를 쓰도록 맞춤. ①·②는 따로 정할 수 있게 나눠 적음.
- **바꾼 파일**: `wiki/handoff/laboratory.md` 만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음

### 지금 (`lab.routes.js` `GET /pending`, `GET /completed`)

| | 대기 (`/pending`) | 입력 완료 (`/completed`) |
|---|---|---|
| 조건 | `c.status = 'completed'` **그리고** `v.visit_date = CURRENT_DATE` · 오더 `status NOT IN ('completed','cancelled')` | `v.visit_date = CURRENT_DATE` · 오더 `status = 'completed'` |
| 순서 | `c.updated_at` 오래된 것부터 | 최근 결과(`MAX(o.result_at)`)부터 |
| 접수 취소 내원 | 따로 거르지 않음 | 따로 거르지 않음 |

### 바꿀 쿼리

**`GET /pending`**
- ② 기간: `v.visit_date = CURRENT_DATE` → `v.visit_date >= CURRENT_DATE - 7`. 「오늘 + 지난 7일」(달력으로 8일). **약국 M3와 같은 식으로** 맞춥니다 — 약국이 다르게 정하면 그쪽에 맞춤.
- ① 진료 완료 조건: `c.status = 'completed'` 줄을 뺌. 대신 `c.status AS consultation_status`를 내려 화면에서 「진료 중」 표시(아래).
- 접수 취소 제외: `AND v.status <> 'cancelled'`. 지금 접수는 대기 중인 내원만 취소할 수 있게 막혀 있지만(`visit.routes.js` PUT `/:id/status`), 상태를 `waiting`으로 되돌린 뒤 취소하는 길은 막혀 있지 않고, 막기 전의 옛 데이터도 있을 수 있어 목록에서 한 번 더 거릅니다.
- 새 칸: `(CURRENT_DATE - v.visit_date) AS days_ago` — 「어제」「3일 전」을 **서버 날짜로** 계산(브라우저 시계에 기대지 않음).
- 순서: **오늘 것 먼저**(진료 시각 오래된 것부터 — 지금과 같음), 그 다음 **지난 날짜 최근 것부터**. `ORDER BY (v.visit_date = CURRENT_DATE) DESC, CASE WHEN v.visit_date = CURRENT_DATE THEN c.updated_at END ASC, v.visit_date DESC, c.updated_at ASC`

**`GET /completed`**
- 「오늘 **내원**한」 → 「오늘 **결과를 넣은**」으로: `o.status = 'completed' AND o.result_at >= CURRENT_DATE AND o.result_at < CURRENT_DATE + 1` (DB 시간대 기준 오늘. `result_at::date`는 인덱스를 못 타서 범위로). 어제 받은 검체를 오늘 끝내면 오늘 「입력 완료」에 나와야 하기 때문.
- 접수 취소 제외 `AND v.status <> 'cancelled'`, `days_ago`도 같이.

**`GET /visit/:visitId/orders`**(환자 찾기) — 날짜 제한 없음, 그대로 둠. 7일이 지난 검사는 이 길로 찾습니다.

인덱스: `order_item`에 `(code_type, status)` 인덱스는 없지만 병원 규모(하루 수십 건)에서는 7일 범위라도 부담 없다고 봄. 느려지면 `CREATE INDEX … ON order_item (visit_id) WHERE code_type = 'lab' AND status = 'ordered'`를 501번 마이그레이션으로.

### 화면 (`Lab.jsx`)

- 왼쪽 목록 날짜 자리: `days_ago` 0 → 지금처럼 날짜, 1 → **「어제 / Hier」**, 2 이상 → **「N일 전 / Il y a N jours」**. 오늘 것이 아니면 글자색을 달리 해(주황) 눈에 띄게.
- 오늘과 지난 날 사이에 얇은 구분 줄 「지난 날 미완료 / Non terminées des jours précédents」.
- ①을 적용하면: 진료가 아직 안 끝난 줄에 작은 표시 **「진료 중 / En consultation」**. 결과 입력은 막지 않음.
- ①을 적용하면 생기는 경우 하나: 결과를 입력하는 사이에 의사가 그 오더를 지울 수 있음(결과 없는 오더는 삭제 가능). 그러면 저장이 404 「Order not found」가 됨 → 알림을 **「이 검사는 진료실에서 취소되었습니다 / Cet examen a été annulé en consultation」**으로 번역하고 목록을 다시 불러옴. (30초 자동 새로고침이 있어 대부분 그 전에 목록에서 사라짐)
- 새 번역 키(예정): `lb_yesterday` · `lb_daysAgo`(`{n}` 자리) · `lb_previousDays` · `lb_inConsultation` · `lb_orderRemoved` — ko · en · fr.

### 위키

- 2절: 「오늘 온 환자 중 진료를 마친 환자만」 → 새 조건, 「어제」「N일 전」 표시, 「7일이 지나면 목록에서 빠지고 🔍 Trouver patient로 찾음」.
- 3.1·4절 쿼리 설명, 5절 「오더가 검사실에 보이는 조건」, 7절 문제 7 ✅.

### 확인 계획 (격리 스택 9185)

SQL로 `visit_date`를 오늘·어제·3일 전·8일 전으로 바꾼 내원 4개, 접수 취소(`status='cancelled'`)된 내원에 오더 1개, 진료 중(`c.status='in_progress'`) 오더 1개를 만들고 — 대기 목록에 오늘·어제·3일 전·진료 중만 뜨는지, 순서, 「어제/3일 전/진료 중」 한국어·프랑스어, 8일 전·취소 내원이 안 뜨는지, 어제 오더를 오늘 저장하면 「입력 완료」에 뜨는지, 입력 중 오더 삭제 → 번역된 알림.

### 결정 때 같이 여쭐 것 (결정 세션께)

- **7일이 지난 미완료 검사는 목록에서 조용히 사라집니다.** 끝내 안 한 검사(환자가 안 옴 등)를 치우는 「검사 안 함(취소)」 버튼이 필요할 수 있습니다 — 결정 3번(취소 표시)과 같은 이야기이고, 약국 M3의 「조제 안 함」 버튼과도 같습니다. 세 곳이 같은 방식이면 좋겠습니다.
- ①만 바꾸고 ②는 그대로(오늘만)도 가능합니다. 반대도 가능합니다.

- **총괄 확인 요청**: 기간 정의(`CURRENT_DATE - 7`, 오늘 + 지난 7일)를 약국 M3와 맞춰야 합니다. 약국 세션 계획과 다르면 알려 주세요.
- **다른 세션에 부탁**: 약국 — M3 기간·「어제/N일 전」 표시 방식을 임상병리와 같게(위). 진료 — ①을 적용하면 진료 중 오더가 검사실에 바로 보인다는 것만 알고 있으면 됨(진료 쪽 변경 없음).
- **남은 일 · 알려진 문제**: 결정 대기.

## 2026-09-29 — 설정 검사항목: 결과 있는 항목의 단위 변경 전 경고 창

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토: 경고는 묻기만 하고 막지 않음, 판정 규칙·기준값·저장 방식 변경 없음, `Settings.jsx`는 검사항목 탭 범위 안(상태 2줄 + 탭 함수·JSX) 확인. 실행 중 EMR에서 `GET /lab/test-items`에 `result_count`가 실려 오는 것 확인. 경고 창 화면은 세션의 격리 스택 확인(한국어·프랑스어)을 믿음.

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `d7f8dd3` (출발점 `develop` `02a947c`)
- **한 일**: 총괄 요청(7절 문제 21 안전장치). 설정 → 검사항목에서 저장 전에 확인 창을 띄움 — 막지 않고 묻기만(「그래도 저장 / 취소」). 판정 규칙·기준값·저장 방식은 그대로.
  - ① **결과가 있는 항목의 단위(Unité)를 바꾼 경우** — 항목 이름, 옛 단위 → 새 단위, 결과 건수, 안전한 방법(이름이 다른 새 줄 추가 → 옛 줄 ✕).
  - ② (같은 위험이라 함께) **결과가 있던 항목을 지우고 같은 이름의 줄이 남은 경우** — 이름 짝짓기 때문에 예전 결과가 그 줄에 붙음.
  - 결과 건수는 서버가 `GET /lab/test-items`(와 저장 응답)에 항목별 `result_count`로 실어 줌 — id로 연결된 결과 + 같은 패널에서 연결이 끊긴 같은 이름의 결과(입력 화면이 이름으로 붙이는 것).
- **바꾼 파일**: `backend/src/routes/lab.routes.js`(`listTestItems()` 추가, GET·저장 응답이 이것을 씀) · `frontend/src/pages/Settings.jsx` · `wiki/modules/laboratory.md`(2절 단위 바꾸기에 경고 창 안내, 4절 API, 6절, 7절 문제 21, 8절)
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — **검사항목 탭 관련 부분만**: 검사항목 상태 옆에 `useState` 두 줄(`labOrig`, `labWarn`), 검사항목 함수(`loadLabItems`, `saveLabItems`, 새 `labRisks`), 탭 JSX 안의 저장 버튼과 그 아래 확인 창. 탭 밖 틀은 안 건드림.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — 임상병리 구역에 키 추가만.
- **DB 마이그레이션**: 없음
- **번역 키**: `lb_unitWarnTitle` · `lb_unitWarnBody` · `lb_sameNameWarnBody` · `lb_unitWarnSafe` · `lb_resultCount` · `lb_saveAnyway` — 6개, ko · en · fr
- **확인한 방법**: `node --check` 통과, 프론트 빌드 통과. 격리 스택 9185(HDL 결과 2건 심음):
  - 한국어: HDL 단위 mg/dL→mmol/L 저장 → 경고 창(「HDL: mg/dL → mmol/L (결과 2건)」) → **취소** → DB 그대로 확인. HDL 되돌리고 **결과 없는 LDL** 단위만 바꿔 저장 → 창 없이 저장.
  - 프랑스어: HDL 단위 변경 → 「Ces items ont déjà des résultats」 창 → **Enregistrer quand même** → 저장됨(HDL mmol/L). HDL ✕ + 새 줄 이름 「HDL」 → 같은 이름 경고 창. 취소 후 새 줄 이름을 「HDL g/L」로 → 창 없이 저장, 새 항목 `result_count` 0. 확인 후 스택 내림.
- **확인 못 한 것**: 영어 화면은 빌드된 문구만 확인. 결과가 많은 운영 DB에서 `result_count` 계산 속도는 재지 않음(패널 하나, 항목 수 개라 부담 없을 것으로 봄 — `lab_result`의 `lab_test_item_id`에는 인덱스가 없음, `order_item_id` 인덱스는 있음).
- **총괄 확인 요청**: Settings.jsx 변경이 검사항목 탭 범위 안인지 확인 부탁드립니다(위 목록).
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 결과 표를 이름+단위로 묶기, 이름 짝짓기에 단위 조건 — 문제 5 결정 때.

## 2026-09-29 — 위키 2절에 「참고치 고치기」·「단위 바꾸기」 직원용 순서

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `e80cf28` (코드 변경 없음, 출발점 `develop` `9ded00f`)
- **한 일**: 총괄 요청대로, 결정 없이 설정 화면에서 할 수 있는 4b(HDL 상한 없애기)·5-A(항목당 단위 하나로 맞추기)의 **현장 작업 순서**를 프랑스어 화면 이름 기준으로 2절에 적음. 값은 적지 않고 「의사 선생님 기준표대로」로 둠.
  - 적다가 확인한 위험: **기존 항목의 단위 칸만 고치면**, 옛 결과(옛 단위 숫자)가 새 단위·새 참고치와 함께 보이고, 다시 저장하면 새 기준으로 잘못 판정됨. 같은 이름으로 새 항목을 만들어도 이름 짝짓기 때문에 똑같음. 그래서 절차를 「**이름이 다른 새 줄** 추가 → 옛 줄 ✕ → 저장」으로 씀. 7절에 문제 21로 기록(보통, 절차로 피함, 코드 해결은 문제 5 결정과 함께).
- **바꾼 파일**: `wiki/modules/laboratory.md`(상단 상태, 2절 새 소절 두 개, 6절 한 줄, 7절 문제 21, 8절) · 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 격리 스택 9185, API로 — (a) L02 혈당 95 저장 뒤 같은 항목 단위를 g/L·0.7~1.0으로 바꾸면 입력 화면에 「95 [g/L] 0.7~1」로 보임(위험 재현). (b) L03에서 HDL 55 저장 뒤 `HDL mmol/L` 새 줄(하한 1.0, 상한 빈칸) 추가 + 옛 HDL 삭제 → 옛 결과는 `HDL=55 [mg/dL]` 덧붙은 줄로 따로, 새 결과 `HDL mmol/L=1,8 [mmol/L]` 따로 저장·표시. (c) 빈 상한은 `null`로 저장(위로 이상 표시 없음). 확인 후 스택 내림.
- **확인 못 한 것**: 설정 화면에서 직접 눌러 보지는 않음(같은 API를 부름). Min·Max 숫자 칸에 쉼표가 들어가는지는 브라우저 언어 설정에 따라 다를 수 있어 「점으로 적으라」고만 씀.
- **총괄 확인 요청**: 결정 세션이 4b·5를 여쭐 때, 단위를 바꾸기로 하면 **반드시 2절 「단위 바꾸기」 순서**를 따라야 한다는 점을 같이 전해 주세요. 기존 줄 단위만 고치는 것이 가장 쉬워 보여서 그렇게 하기 쉽습니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 문제 21 코드 해결(결과 표를 이름+단위로 묶기, 이름 짝짓기에 단위 조건, 설정에서 기존 항목 단위 변경 경고)은 문제 5 결정 때 함께.

## 2026-09-29 — 실장님·의사 선생님 결정 질문지 (문제 3·4·5·7·12, 선택 8·10)

> **총괄 확인 (2026-09-29)**: 합침(`440bd22`, 위키만). 질문지는 결정 세션에 넘김 — 의사 선생님 답이 필요한 4·5·12는 현장용 프랑스어 질문과 함께.

- **상태**: 보류 — 결정 세션이 실장님·의사 선생님께 여쭤볼 것. 답이 오면 그대로 구현합니다.
- **커밋**: session/laboratory `cbbda6b` (코드 변경 없음)
- **한 일**: 총괄 요청대로, 결정이 필요한 항목마다 「지금 동작 · 선택지 · 세션 추천 · 의사 선생님께 물을 질문」을 정리. 번호는 `modules/laboratory.md` 7절 번호.
- **바꾼 파일**: `wiki/handoff/laboratory.md` 만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 지금 동작은 코드(`lab.routes.js`, `Lab.jsx`, `LabResults.jsx`, `014_lab.sql`)와 격리 스택 9185에서 확인한 것만 적음.
- **확인 못 한 것**: 병원 운영 DB의 **실제 참고치·단위**(설정 화면에서 바뀌었을 수 있음). 질문 전에 설정 → 🧫 Items de test 에서 패널별로 현재 값을 보여 드리는 게 좋습니다.

### 결정 표

| # | 무엇 | 지금 어떻게 동작하나 | 선택지 | 세션 추천 | 의사 선생님께 물을 질문 (한 줄) |
|---|---|---|---|---|---|
| **4** | **성별·나이별 참고치** (의학 판단) | 검사 항목마다 참고치가 **한 벌**뿐. 성별·나이를 보지 않음. 기본값 중 Hb 13–17 g/dL, Hct 40–50 %, 요산 3.5–7.2, 크레아티닌 0.6–1.2 mg/dL 는 **성인 남성 기준** → 정상 여성·소아가 ▼/▲로 표시될 수 있음. 소아 WBC·ALP 도 성인 기준. | **A** 지금처럼 한 벌 — 값만 병원 기준으로 고침(코드 변경 없음) · **B** 남/여 두 벌 · **C** 남/여 × 나이대(예: 신생아·소아·성인) — 해당 칸이 없으면 기본값 사용 | **C 구조**를 만들되, 값은 **의사 선생님이 주신 항목만** 채우고 나머지는 지금처럼 한 벌. (새 테이블 + 마이그레이션 501, 판정은 검사 당일 나이 기준) | 「성별이나 나이에 따라 참고치를 다르게 봐야 하는 항목과 그 값을 병원 기준표로 주실 수 있습니까? (특히 Hb·Hct·RBC·크레아티닌·요산·ALP·WBC, 소아 나이 구분)」 |
| **4b** | HDL 상한 (의학 판단) | HDL 40–60 mg/dL 로 되어 있어 **60 초과가 빨간 ▲(높음)**. 높은 HDL 은 보통 좋은 것. | **A** 그대로 · **B** 하한(≥40)만 두고 상한 없앰(설정에서 바로 가능, 코드 변경 없음) | **B** | 「HDL 이 60 을 넘으면 이상으로 표시하지 않아도 됩니까?」 |
| **5** | **단위** | 단위는 **표시용 글자**일 뿐, 변환 없음. 기본 단위: 혈당·콜레스테롤·크레아티닌·빌리루빈 **mg/dL**. 장비가 g/L·mmol/L·µmol/L 로 내면 값이 전부 ▼로 나옴. 설정에서 단위를 바꾸면 결과 표 한 줄에 옛 단위·새 단위 값이 섞임(단위 칸은 최근 것만). | **A** 항목마다 단위 하나 — 장비 단위로 설정에서 바꾸고 참고치도 같이 바꿈(코드 변경 없음) · **B** 입력 때 단위 선택 + 자동 변환(복잡, 변환 계수 실수 위험) | **A**. 추가로 결과 표가 **단위가 다르면 다른 줄**로 보이게 고치겠음(코드, 작음) | 「검사실 장비와 결과지는 혈당·크레아티닌·콜레스테롤·빌리루빈·요소를 어떤 단위(mg/dL, g/L, mmol/L, µmol/L)로 냅니까?」 |
| **7** | **검사실 대기 목록 조건** (진료 흐름 — 실장님·의사) | ① 의사가 **진료를 완료**해야 검사실 목록에 뜸. ② **오늘 온 환자**만 뜸 — 어제 받은 검체는 목록에서 사라지고 🔍 환자 찾기로만 찾음. (약국 목록과 같은 규칙) | ①: **A** 지금처럼 진료 완료 후 · **B** 오더를 넣는 즉시(진료 중이어도) 뜸. ②: **A** 오늘만 · **B** 최근 N일(예: 7일)의 미완료도 날짜와 함께 뜸 | ① **B**, ② **B (7일)**. 검사는 보통 진료 도중에 하고 결과를 들고 다시 진료실로 가므로. | 「환자는 진료 도중에 검사실에 가서 결과를 가지고 다시 진료실로 옵니까, 아니면 진료를 모두 마친 뒤 검사합니까? 결과가 다음 날 이후에 나오는 검사가 있습니까?」 |
| **12** | **문자 결과 판정** (의학 판단) | 숫자가 아니면 **판정 없음** — 말라리아 RDT·요검사에 `Positive` 를 넣어도 색·표시 없음. `<5`, `>500` 같은 값도 판정 없음. | **A** 그대로 · **B** 참고치 글자(`Negative`)와 **다르면 이상(빨강 !)** — 같은 뜻 글자(Négatif, Neg, -, 음성)는 정상으로 봄 · **C** 항목마다 선택지(Négatif / Positif / + / ++ / +++ / Trace)를 두고 이상인 선택지를 설정에서 지정 | 먼저 **B**, 나중에 필요하면 **C**. `<5`·`>500` 은 숫자 부분으로 판정(`>500` 은 상한 초과로). | 「음성이 정상인 검사에서 음성이 아닌 결과(양성, +, Trace 등)는 모두 빨간색 이상으로 표시해도 됩니까? Trace(미량)도 이상으로 봅니까?」 |
| **3** | 결과가 있는 오더 삭제 (운영 — 실장님) | **해결됨**: 진료 세션이 막음(409, `d1f473e`). 남은 질문은 **잘못 낸 오더에 결과까지 들어간 경우** 어떻게 취소하나 — 지금은 방법이 없음(결과도 청구도 남음). | **A** 지금처럼 막기만 · **B** 「취소」 상태를 두어 결과는 기록으로 남기고 목록·청구에서 빼기(진료·수납 세션과 함께) | **B** (지우지 않고 취소 표시) | (실장님께) 「결과가 들어간 검사를 잘못 낸 오더였다면, 결과는 남기고 취소로 표시하는 방식이면 됩니까?」 |
| 8 (선택) | 같은 날 같은 검사 두 번 | 결과 표 칸이 날짜 하나에 값 하나라, 같은 날 재검하면 **나중 것만** 보임. | **A** 그대로 · **B** 같은 날이면 칸을 둘로(시각 표시) | **B** | 「같은 날 다시 한 검사(재검)의 결과를 둘 다 보고 싶으십니까?」 |
| 10 (선택) | 결과 수정 이력 (의무기록) | 결과를 고쳐 저장하면 **이전 값은 지워지고**, 입력자도 새 사람으로 덮임. | **A** 그대로 · **B** 이전 값·고친 사람·시각을 이력으로 남기고 결과 표에 「수정됨」 표시(마이그레이션 필요) | **B** | 「검사 결과를 고친 경우 이전 값과 고친 사람을 기록으로 남겨야 합니까?」 |

### 의사 선생님께 드릴 질문 — 프랑스어판 (현장용)

1. (4) Pour quels examens faut-il des valeurs de référence différentes selon le sexe ou l'âge, et pouvez-vous nous donner le tableau de référence du laboratoire (surtout Hb, Hct, GR, créatinine, acide urique, PAL, GB, et les tranches d'âge pédiatriques) ?
2. (4b) Un HDL au-dessus de 60 mg/dL peut-il ne plus être signalé comme anormal ?
3. (5) Dans quelles unités l'automate et les résultats du laboratoire donnent-ils la glycémie, la créatinine, le cholestérol, la bilirubine et l'urée (mg/dL, g/L, mmol/L, µmol/L) ?
4. (7) Le patient va-t-il au laboratoire pendant la consultation et revient-il avec les résultats, ou fait-il les analyses après la fin de la consultation ? Y a-t-il des analyses dont le résultat arrive le lendemain ou plus tard ?
5. (12) Pour les examens dont la valeur normale est « Négatif », peut-on signaler en rouge tout résultat non négatif (Positif, +, Traces…) ? Les « Traces » sont-elles anormales ?
6. (8) Voulez-vous voir les deux résultats quand un examen est refait le même jour ?
7. (10) Quand un résultat est corrigé, faut-il garder l'ancienne valeur et le nom de la personne qui l'a corrigé ?

- **위키**: 변경 없음(7절 표가 근거)
- **총괄 확인 요청**: 결정 세션에 이 표를 넘겨 주세요. 4·5·12는 **의학 판단**이라 의사 선생님 답이 필요합니다. 4b·5-A는 코드 없이 설정 화면에서 바로 바꿀 수 있습니다.
- **다른 세션에 부탁**: 3-B를 고르면 진료·수납 세션과 함께 해야 합니다. 7-①B를 고르면 진료 흐름이 바뀌므로 진료 세션도 알아야 합니다.
- **남은 일 · 알려진 문제**: 답이 오면 구현. 4-C는 마이그레이션(501번대)과 설정 탭 변경이 들어갑니다.

## 2026-09-29 — 낮은 항목 정리(자동 새로고침·항목 없는 검사·참고치 서버 재확인·결과 표 열 고정), 2절 프랑스어 기준

> **총괄 확인 (2026-09-29)**: 합침 + 실행 중 EMR 반영. 코드 검토: 30초 자동 새로고침은 왼쪽 목록만(입력 중인 값 유지), 항목 없는 패널에 자유 입력 한 줄, 저장 때 참고치를 DB에서 다시 읽음, 결과 표 검사명 열 고정. 판정 규칙 변경 없음 확인. 진료 세션 부탁(lab 오더 상태 칸 `o.status`)은 진료 세션에 전달.

- **상태**: 합쳐짐(총괄 확인 완료)
- **커밋**: session/laboratory `b29d2c2` (출발점 `develop` `a708c9b`, ff로 당김)
- **한 일**: 총괄 지시대로 실장님 결정이 필요 없는 낮은 항목(위키 7절 13·15·16·17·18)을 고치고, 위키 2절(직원용)을 프랑스어 화면 기준으로 다시 씀.
  - 13: 설정에 항목이 없는 검사도 **검사 이름으로 된 한 줄**에 결과를 적을 수 있음(노란 안내). 예전엔 적을 칸이 없어 완료 불가.
  - 15: 결과 저장 때 서버가 패널 항목 정의를 **DB에서 다시 읽어** 이름·단위·참고치를 채우고 판정. 화면이 보낸 참고치는 안 믿음. (판정 규칙·기준값은 그대로)
  - 16: 검사 버튼을 빨리 바꿀 때 늦게 온 옛 응답이 새 화면을 덮던 것 — 마지막 요청만 반영.
  - 17: 결과 표(`LabResults`)를 옆으로 밀어도 검사명 열과 패널 이름이 고정.
  - 18: 대기·완료 목록 **30초 자동 새로고침**(탭이 보일 때만). 입력 중인 값·선택은 안 건드리고, 실패하면 목록을 비우지 않음.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `wiki/modules/laboratory.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — 임상병리 구역 안의 내 키 `lb_noItemsDefined` 문구 한 줄씩만 바꿈(한 줄 입력 안내로).
- **DB 마이그레이션**: 없음
- **번역 키**: 새 키 없음. `lb_noItemsDefined` 문구 변경(ko · en · fr).
- **확인한 방법**:
  - `node --check` 통과, develop(`a708c9b`) 위에서 프론트 빌드 통과(`npm install --no-package-lock` → `npm run build`).
  - 격리 스택 9185(새 이미지 이름 `bethesda-s-laboratory-*:dev` — 병원 이미지 `bethesda-emr-*:latest`는 그대로인 것 확인). 이 스택은 develop을 당기기 전 코드로 띄웠고, 당긴 뒤 바뀐 내 파일은 없음.
  - API: 항목 없는 새 패널(L99 Widal) → 한 줄(`has_master:false`) → 저장·다시 열기 정상. 이름을 `HACKED`, Platelet 상한을 1000으로 바꿔 보내도 DB 값(Platelet, 상한 400)으로 저장되고 450은 high. 날짜는 `"2026-09-29"` 글자로 옴.
  - 화면(프랑스어): 노란 한 줄 안내 문구, 새 환자를 API로 넣고 ↻ 없이 목록에 뜸(30초 간격 요청 확인), 입력 중 값(`7,4`, `Negatif`)이 새로고침 뒤에도 그대로, 「Tout」 저장 정상, 결과 표 가로 스크롤 때 검사명·패널 이름 고정.
- **확인 못 한 것**: 16(늦은 응답)은 화면에서 재현하지 못함 — 코드로만 확인. 한국어 화면은 이번엔 빌드된 문구만 확인. 격리 스택의 브라우저 창 크기 흉내에서 좌표 클릭이 어긋나 요소 참조로 눌렀음(앱 문제 아님).
- **위키**: `modules/laboratory.md` — 상단 상태, **2절 전체 다시 씀(프랑스어 버튼 이름 먼저, 한국어는 괄호)**, 3.1·3.3·3.4·3.5·3.6, 5절(진료 삭제 409), 7절(3·13·15·16·17·18·19 ✅), 8절
- **총괄 확인 요청**:
  - **LabResults.jsx 변경**(진료 화면도 씀): 검사명 칸 `position: sticky`, 패널 이름 글자 `<span sticky>`. 날짜 열이 많아 가로 스크롤이 생길 때만 달라 보임.
  - 30초 자동 새로고침은 검사실 화면이 열려 있는 PC마다 30초에 두 번(`/lab/pending`, `/lab/completed`) 요청합니다. 검사실 PC 한두 대면 부담 없다고 판단.
- **다른 세션에 부탁**:
  - **진료** — ① `LabResults` 모양 변경 알림(위). ② (지난번 부탁, 아직 유효) 오더 줄 상태 칸(`Consultation.jsx`의 `o.worklist_status` 표시)이 lab 오더는 생성 때부터 `completed`라 결과 전부터 완료로 보임 → lab 오더는 `o.status`를 보여주면 좋겠음(위키 7절 문제 9).
- **남은 일 · 알려진 문제**: 실장님 결정 대기 — 4(성별·나이 참고치), 5(단위), 7(대기 목록 조건), 12(문자 결과 판정). 결정 있으면 좋은 것 — 8(같은 날 같은 검사 두 번이면 결과 표에 하나만), 10(결과 수정 이력: 마이그레이션 필요).

## 2026-09-29 — 설정 저장 시 결과 끊김, 쉼표 소수점, 전체 저장, 번역, 날짜 하루 당겨짐

> **총괄 확인 (2026-09-29)**: 합침(`a06c863`) + 실행 중 EMR 반영. 확인: 빌드 통과, `LabResults.jsx` 변경은 진료 화면에서도 모양 그대로(날짜 `YYYY-MM-DD` 문자열이라 새 `ymd`가 그대로 돌려줌). 날짜 문제는 총괄이 `7ad4387`로 서버에서 한 번에 고침(요청대로) · 이미지 이름표는 `657ba2c` · 결과 있는 오더 삭제 막기는 진료 세션이 `d1f473e`로 해결(409). 운영 DB에 끊긴 결과가 있는지는 확인하지 않음 — 화면에서 이름 짝짓기가 잡아 줌.

- **상태**: 합쳐짐(`a06c863`)
- **커밋**: session/laboratory `7b5423d`
- **한 일**: 실장님이 승인한 1~3번(위키 7절 문제 1·2·6·11)을 고침. 확인하다 찾은 명백한 버그 두 개(문제 19·20)도 임상병리 파일 안에서만 고침.
  - 문제 1: 설정 검사항목 저장이 전부 지우고 다시 넣던 것을 **id 유지 upsert**로 바꿈 → 결과와의 연결이 안 끊김. 이미 끊긴 결과(병원 DB에 있을 수 있음)는 입력 화면에서 **이름으로 다시 짝지음**. 어느 항목과도 안 맞는 결과는 표 아래에 덧붙여, 다시 저장해도 지워지지 않게 함.
  - 문제 2: `1,5` → 1.5, `12 000` → 12000 으로 읽어 판정(화면·서버 같은 규칙). 저장 값은 적은 그대로. **판정 기준 자체는 안 바꿈.**
  - 문제 6: 「전체」 저장은 값을 넣은 검사만 저장·완료하고 빈 검사는 대기로 남김. 결과를 저장 버튼 옆에 표시. 공백뿐인 값은 서버도 빈칸으로 봄.
  - 문제 11: 프랑스어 화면에 나오던 한국어 기본 문구를 `lb_` 키로 바꿈(검사실 화면 + 설정 검사항목 탭).
  - 문제 19: 날짜가 하루 앞당겨 보이던 것(`ymd`) — `Lab.jsx`·`LabResults.jsx`만.
  - 문제 20: 환자 고르기 전 결과 칸 「불러오는 중」 멈춤.
- **바꾼 파일**: `backend/src/routes/lab.routes.js` · `frontend/src/pages/Lab.jsx` · `frontend/src/components/LabResults.jsx` · `frontend/src/pages/Settings.jsx`(검사항목 탭과 그 함수 `saveLabItems`·`createPanel` 안만) · `wiki/modules/laboratory.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `// ── begin laboratory (lb_) ──` 표시 사이에 키 추가만. 기존 키는 안 건드림.
- **DB 마이그레이션**: 없음
- **번역 키**: `lb_selectHint` · `lb_noPending` · `lb_noCompleted` · `lb_noItemsDefined` · `lb_noItems` · `lb_nothingToSave` · `lb_savedTests` · `lb_notSavedEmpty` · `lb_saveFailed` · `lb_itemsHint` · `lb_selectPanel` · `lb_pickPanel` · `lb_code` · `lb_codeNameRequired` · `lb_saved` — 15개, ko · en · fr 모두
- **확인한 방법**:
  - 프론트 빌드 통과. `npm ci`는 저장소에 package-lock.json이 없어 쓸 수 없어서, Dockerfile처럼 `npm install`(`--no-package-lock`) 후 `npm run build`. `node --check backend/src/routes/lab.routes.js` 통과.
  - 격리 스택 9185, API: 신장 검사 `1,5`/`12 000`/`85,5` 저장 → high/high/low. CBC 결과 저장 뒤 설정에서 항목 이름 변경·삭제·추가 → id 유지(1,2,3,5 + 새 27), 값 그대로, 지운 Hct 결과는 덧붙은 줄로 남음. DB에서 `lab_test_item_id`를 NULL로 만든 결과 → 이름으로 다시 짝지어짐. 공백만 보내면 400.
  - 격리 스택 화면(한국어): 오더 3개 환자에서 CBC만 넣고 「전체」 저장 → CBC ✓, 나머지 대기, 안내 문구 나옴, 결과 표 바로 갱신(▼11,5 ▲450), 날짜 09-29로 표시.
  - 화면(프랑스어): 모든 문구 프랑스어, 빈 저장 안내, 나머지 두 검사 저장 → 대기 목록 비고 「Aucune analyse en attente de résultat」. 설정 「Items de test」 탭 문구·저장 알림 프랑스어. 설정에서 Creatinine → Créatinine 저장 후에도 결과 유지.
  - 진료 화면 🧪 검사결과 창: 모양 그대로, 날짜 09-29로 바르게 나옴.
- **확인 못 한 것**: 실제 병원 DB에서 이미 끊긴 결과가 얼마나 있는지(이름 짝짓기는 격리 스택에서 흉내만 냄). 병원 PC 브라우저 시간대가 서버와 같은지(날짜 표시가 이 전제에 기댐). 영어 화면은 빌드된 키만 확인하고 눌러 보지는 않음.
- **위키**: `modules/laboratory.md` 상단 상태, 2절(입력·저장·설정 사용법), 3.1·3.3·3.4·3.5·3.6, 4절 API 표, 6절, 7절(✅ 표시, 19·20 추가), 8절
- **총괄 확인 요청**:
  - ⚠ **격리 스택이 실행 중인 EMR과 같은 이미지 이름으로 빌드됩니다.** `docker-compose.yml`이 `image: bethesda-emr-backend:latest` · `bethesda-emr-frontend:latest`를 박아 두었고 `docker-compose.session.yml`은 이것을 바꾸지 않습니다(`docker compose … config`로 확인). 그래서 규칙 7절대로 `up -d --build`를 하면 **병원 EMR이 쓰는 이미지 이름이 세션 코드로 바뀝니다.** 이 상태에서 병원 EMR을 `--build` 없이 다시 띄우면 합치지 않은 세션 코드가 올라갑니다. 이번에는 16:49에 총괄 쪽에서 다시 빌드해서, 지금 병원 EMR(web·api)에는 임상병리 코드가 없음을 확인했습니다(`lb_selectHint`·`readNumber` 없음). 약국·접수 세션은 이미 `bethesda-s-<세션>-*` 이름으로 빌드하고 있습니다. `docker-compose.session.yml`의 backend·frontend에 `image: bethesda-s-${SESSION}-backend:dev` 같은 줄을 넣는 것을 제안합니다(총괄 파일이라 손대지 않음).
  - **LabResults.jsx를 바꿨음**(진료 화면도 씀) — 날짜 읽기(`ymd`)와 환자 없을 때 로딩 멈춤만. 모양은 그대로.
  - 날짜 하루 당겨짐은 **프로젝트 전체 문제**입니다. `PatientFinder.jsx:69`(생년월일·내원일이 하루 빠르게 보이는 것 격리 스택에서 확인), `Payment.jsx:12`, `RadiologyReadings.jsx:5`, `documents/shared.jsx`의 `fmtDate`, 인쇄 문서까지 같은 방식입니다. 근본 해결은 `backend/src/config/database.js`에서 `pg.types.setTypeParser(1082, v => v)`로 DATE를 글자 그대로 받는 것으로 보입니다(총괄 파일이라 손대지 않음). 그렇게 바뀌어도 임상병리의 새 `ymd`는 `YYYY-MM-DD`를 그대로 쓰므로 문제없습니다.
- **다른 세션에 부탁**:
  - **진료** — `LabResults` 변경 알림(위). 그리고 지난 항목의 부탁 두 개(결과 있는 lab 오더 삭제 막기, lab 오더 상태 칸에 `o.status` 보여주기)는 아직 유효.
  - **접수 · 수납 · PACS · 진료(문서)** — 위 날짜 문제. 총괄이 서버에서 한 번에 고치는 게 나아 보임.
- **남은 일 · 알려진 문제**: 7절의 나머지 — 특히 문제 3(진료에서 오더 삭제 시 결과 삭제), 4(성별·나이 참고치), 5(단위), 7(대기 목록 조건), 12(문자 결과 판정)은 실장님 결정 대기.

## 2026-09-29 — 현황 파악, 위키 첫 작성 (코드 변경 없음)

- **상태**: 끝 — 실장님이 1~3번부터 하라고 결정(위 항목)
- **커밋**: session/laboratory `1724740` (출발점 `develop` `a4a9ea6`)
- **한 일**: 임상병리 파일 전부(Lab.jsx · LabResults.jsx · lab.routes.js · 설정 검사항목 탭 · 014_lab.sql)와 진료에서 오더가 넘어오는 경로(consult.routes.js 오더 추가·삭제·완료, Consultation.jsx)를 읽고, `modules/laboratory.md`를 실제 코드 기준으로 채움. 문제 18개를 심각도·근거와 함께 7절에 정리.
- **바꾼 파일**: `wiki/modules/laboratory.md`, `wiki/handoff/laboratory.md` (코드 변경 없음)
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기. `parseFloat("1,5") === 1` 등 판정 동작은 node로 확인. 격리 스택은 띄우지 않음.
- **확인 못 한 것**: 실행해서 재현하지는 않음. 병원 실제 DB의 참고치·단위(설정에서 바뀌었을 수 있음), 검사실 장비가 쓰는 단위.
- **위키**: `modules/laboratory.md` 1~8절 전부 새로 씀
- **총괄 확인 요청**: 참고 — 작업공간이 처음에 `main`(`f1e9cc4`)에서 만들어져 있어서, 브랜치 이름을 `session/laboratory`로 바꾸고 `a4a9ea6`으로 fast-forward 함(merge 커밋 없음).
- **다른 세션에 부탁**:
  - **진료** — ① 검사 결과가 있는 오더(`order_item.status = 'completed'` 인 lab 오더)는 ✕ 삭제를 막거나 경고해 주세요. 지금은 `DELETE /api/consultations/order/:id`(`consult.routes.js:295-302`)가 `lab_result`를 CASCADE로 함께 지웁니다. ② 오더 줄 상태 칸(`Consultation.jsx:524`)이 lab 오더에도 `worklist_status`를 보여주는데, lab 오더는 생성 때부터 `completed`(`consult.routes.js:245`)라 결과 전부터 완료로 보입니다. lab 오더는 `o.status`를 보여주는 게 맞아 보입니다. (둘 다 실장님 결정 후 확정)
  - **총괄** — 문제 7(대기 목록에 「진료 완료」 조건)을 바꾸게 되면 진료 흐름에 영향이 있어 실장님 결정 필요.
- **남은 일 · 알려진 문제**: `modules/laboratory.md` 7절 표 참고. 높음 4개 — ① 설정 저장 시 기존 결과 연결 끊김·재저장 시 삭제 ② 쉼표 소수점 판정 오류 ③ 진료에서 오더 삭제 시 결과 삭제(진료 파일) ④ 성별·나이 구분 없는 참고치(의학 판단).
