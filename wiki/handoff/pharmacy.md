# 약국 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 약국 파일 안의 작은 버그 6건 수정 (실장님 지시 「1번부터」)

> **총괄 확인 (2026-09-29)**: 합침(`93616cc`) + 실행 중 EMR 반영. 확인: 조제된 줄 원내/원외 전환 → 409 · `/completed` 진료당 한 줄에 성별·생년월일·알레르기 포함(오늘 조제 0건이라 형태만). 요청 1(이미지 이름표)은 총괄이 `657ba2c`로 `docker-compose.session.yml`에 `image: bethesda-s-${SESSION}-*:dev` 넣음 — 임시 `-f pharmacy-images.yml` 없이 규칙 7절 명령 그대로 쓰면 됨. 요청 2(생년월일)는 `7ad4387`로 전 모듈 해결. 요청 3(`npm ci`)은 규칙 8절을 `npm install --no-package-lock`으로 고침. `backend/test/pharmacy.api.mjs`는 그대로 둠(격리 스택 전용, 운영에선 돌리지 말 것).

- **상태**: 확인 요청
- **커밋**: session/pharmacy `3b91950` + 이 항목을 고친 뒤따르는 커밋 하나 (생년월일 임시 처리 되돌림)
- **한 일**: 의학적 판단이 필요 없는 버그만 고쳤습니다. 재고 차감 규칙·용량은 바꾸지 않았습니다.
  - M1 원내/원외 전환은 조제 대기 줄만 — 조제된 줄은 409. 이미 뺀 재고와 청구가 어긋나는 것을 막으려고.
  - M2 전환 후 왼쪽 목록도 같이 고침 — 다른 환자를 눌렀다 오면 예전 값이 보이던 것.
  - L1 조제할 때 약 행을 `drug.id` 순서로 먼저 잠금 — 교착(deadlock)으로 조제가 실패하던 것.
  - L2 같은 환자를 두 사람이 동시에 조제하면 두 번째 사람에게 번역된 안내 + 목록 새로고침(전에는 영어 오류).
  - L3 조제 완료 탭: 한 진료가 두 줄로 나오던 것, 원외 표시·약제비·알레르기 상자·원외 처방전의 성별/생년월일이 빠지던 것.
  - L4 약제비에서 원외 제외, 이름 「약제비 (원내)」 — 수납과 같은 금액.
- **바꾼 파일**: `backend/src/routes/pharmacy.routes.js`, `frontend/src/pages/Pharmacy.jsx`, `backend/test/pharmacy.api.mjs`(새 파일, 시험 스크립트), `wiki/modules/pharmacy.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `// ── begin pharmacy (ph_) ──` 블록 안에 키 3개 추가만. 다른 공용 파일은 없음.
- **DB 마이그레이션**: 없음
- **번역 키**: `ph_drugCostInternal`, `ph_alreadyDispensed`, `ph_typeLocked` (ko · en · fr 모두)
- **API 동작 변경** (다른 화면은 이 API를 안 부름 — `grep`으로 확인)
  - `PUT /api/pharmacy/prescription/:id/dispense-type`: 조제된 줄이면 409 (전에는 200으로 바뀜)
  - `GET /api/pharmacy/completed`: 진료당 한 줄, `dispensed_by_name`은 쉼표로 이은 이름, 칸 추가(`gender, date_of_birth, allergies`, 줄의 `drug_id, unit_price, dispense_type`)
  - 오류 문구 두 개가 서버(`pharmacy.routes.js:12-13`)와 화면(`Pharmacy.jsx:21-22`)에 똑같이 있어야 번역됩니다 — `api/client.js`가 상태 코드를 넘기지 않아서입니다.
- **확인한 방법**
  - `npm run build` 통과, `node --check backend/src/routes/pharmacy.routes.js` 통과
  - 격리 스택 9184에서 `node backend/test/pharmacy.api.mjs` — 15개 항목 통과, 세 번 반복. 동시 조제(같은 환자 2명 동시 → 한 번만 차감), 약 순서가 반대인 12쌍 동시 조제(**고치기 전 코드로 24건 중 3건 deadlock 실패를 재현**, 고친 뒤 0건, 재고 정확히 −24), 전환 409/404, 원외 재고 미차감, 완료 목록 한 줄.
  - 화면(9184): 한국어 — 약제비 (원내) 13,400 → Paracetamol 원외 → 12,200, 다른 환자 눌렀다 와도 원외 유지, 뒤에서 조제된 환자에서 원외 누르면 「이미 조제 완료된 약은…」 안내 후 목록 18→17. 프랑스어 — Médicaments (interne), 뒤에서 다른 약사가 조제한 환자에서 Terminer délivrance → « Ce patient a déjà été servi… » 후 목록 19→18, Délivré 탭에 Externe 표시·알레르기·약제비 표시, 재고는 Amoxicillin −21 / Paracetamol(원외) 0 / Salbutamol −1.
- **확인 못 한 것**: 영어 화면은 눌러 보지 않았습니다(키만 확인). 원외 처방전 양식(`external-rx.jsx`)은 안 바꿔서 인쇄 폭은 다시 보지 않았습니다.
- **위키**: `modules/pharmacy.md` 머리말, 2절(약제비, 새 안내 창), 3.2·3.3(잠금 순서·동시 조제 시험 결과·오류 문구 규칙)·3.6, 4절 API 표, 7절(H5 기록 후 해결됨으로, 해결됨 절 신설), 8절
- **총괄 확인 요청 — 급함**
  1. **세션 격리 스택이 운영 EMR과 같은 이미지 이름을 씁니다.** `docker-compose.yml`에 `image: bethesda-emr-backend:latest` / `bethesda-emr-frontend:latest`가 박혀 있고 `docker-compose.session.yml`은 이것을 바꾸지 않습니다. 그래서 어느 세션이든 `--build`하면 그 이름표가 그 세션 코드로 옮겨갑니다.
     - 실제로 제 스택이 다른 세션이 뒤이어 빌드한 백엔드로 떠서, 고치기 전 코드로 시험이 돌았습니다.
     - 운영 컨테이너는 제가 확인한 동안 세션 이미지로 바뀌지 않았습니다. 16:49에 총괄 배포(`7ad4387`)로 본체 폴더에서 다시 만들어졌고, 백엔드 이미지(`de3d8106…`)가 컨테이너 생성 3초 전에 빌드된 것으로 보아 `--build` 배포로 보입니다. 운영 컨테이너 안은 들여다보지 않았습니다.
     - 그러나 본체 폴더에서 `--build` 없이 `docker compose up -d`(또는 `setup.ps1 -Offline`의 `--no-build`)를 하면, 마지막으로 빌드한 **세션의 코드로 운영 EMR이 다시 만들어집니다.** `start.bat`·`update.bat`은 `--build`라 괜찮습니다.
     - 제안: `docker-compose.session.yml`의 backend·frontend에 `image: bethesda-s-${SESSION}-backend:dev` / `-frontend:dev` 추가. 저는 공용 파일을 안 고치고, 작업공간 밖 임시 파일 `-f pharmacy-images.yml`(같은 두 줄)로 우회했습니다.
  2. **H5 문서의 생년월일 하루 밀림** — 제가 찾은 직후 총괄이 `7ad4387`로 같은 방법(DATE 형 파서)으로 고친 것을 확인했습니다. 그래서 약국 쪽 임시 처리(`TO_CHAR`)는 되돌렸습니다. 이 브랜치에는 그 커밋이 없으니 **합친 뒤 원외 처방전의 생년월일을 한 번 봐 주세요.**
  3. **`npm ci`가 안 됩니다** — `frontend/package-lock.json`이 저장소에 없습니다. 규칙 8절은 `npm ci`인데, 저는 Dockerfile과 같은 `npm install --include=dev`로 빌드했습니다(생긴 lock 파일은 지웠습니다).
- **다른 세션에 부탁**
  - **진료**: 조제된 처방 줄의 수정·삭제 막기 (H3) — 앞 항목과 같음, 아직 제안
  - **설정**: 약 저장 시 재고 덮어쓰기 (H4) — 앞 항목과 같음, 아직 제안
- **남은 일 · 알려진 문제**: 높음 H1~H4, 보통 M3~M7, 낮음 L5~L9. 다음은 실장님이 정하실 「2번 재고」와 H1 용량 기준.

## 2026-09-29 — 현황 파악, 위키 첫 작성

- **상태**: 보류 — 무엇부터 고칠지 실장님 결정을 기다립니다. (이 커밋은 위키만 바꿨으므로 합쳐도 무방합니다.)
- **커밋**: session/pharmacy (이 항목이 들어간 커밋 하나)
- **한 일**: 약국 화면·서버·원외처방전·설정 약품 탭·관련 테이블, 그리고 진료→약국→수납 연결을 읽고 `modules/pharmacy.md` 1~7절을 코드 기준으로 채웠습니다. 코드는 고치지 않았습니다.
  - 작업공간이 `f1e9cc4`(main 쪽)에서 만들어져 있어서, 지시대로 `develop`의 `a4a9ea6`으로 fast-forward 하고 브랜치 이름을 `session/pharmacy`로 바꿨습니다.
- **바꾼 파일**: `wiki/modules/pharmacy.md`, `wiki/handoff/pharmacy.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음 (약국 화면이 쓰는 키는 ko·en·fr에 모두 있음을 확인)
- **확인한 방법**: 코드 읽기. 동시 조제 시 재고가 두 번 빠지지 않는지는 잠금 구조로 판단했고, 실제로 동시에 눌러 보지는 않았습니다.
- **확인 못 한 것**: 운영 DB의 약품 기본값·재고가 시드(`003_seed_data.sql`) 그대로인지 — 운영 EMR은 건드리지 않았습니다. 격리 스택은 아직 띄우지 않았습니다.
- **위키**: `modules/pharmacy.md` 1~8절 전부
- **총괄 확인 요청**: 7절 **H1·H2**(기본 용량 해석, 병·개 단위 약 수량)는 청구 금액과 원외 처방전 인쇄에 걸린 문제라 진료·수납·설정과 함께 봐야 합니다.
- **다른 세션에 부탁** (아직 실장님 결정 전이라 「제안」입니다. 결정되면 다시 적겠습니다)
  - **진료**: 조제 완료(`status='dispensed'`)된 처방 줄은 수정·삭제를 막아 주세요 — `consult.routes.js:165-190`, 7절 H3.
  - **진료**: 시럽·흡입기처럼 총량을 따로 적어야 하는 약을 위해 `total_qty`를 의사가 직접 고칠 수 있게 — `Consultation.jsx:278`, 7절 H2 (실장님 결정 후).
  - **설정**: `PUT /api/admin/drugs/:id`가 재고를 받은 값으로 통째로 덮어써서 조제 차감이 사라질 수 있습니다 — `admin.routes.js:89`, 7절 H4. 재고는 따로 바꾸는 길(약국 쪽 재고 조정 API 등)로 빼고 이 PUT에서는 재고를 건드리지 않는 방안을 제안합니다. 새 약 `min_stock` NULL 저장(`:75-77`), 재고 소수 입력 시 DB 오류(`:40`)도 같이.
- **남은 일 · 알려진 문제**: `modules/pharmacy.md` 7절 — 높음 4 · 보통 7 · 낮음 9
