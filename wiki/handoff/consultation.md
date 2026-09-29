# 진료 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

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
