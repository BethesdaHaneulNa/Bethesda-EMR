# 진료 (Consultation)

> **담당**: 진료 세션 · 브랜치 `session/consultation` · **마지막 갱신**: — · **상태**: 뼈대만 있음 — 세션이 코드를 읽고 채웁니다

## 1. 이 모듈이 하는 일

_(작성 필요)_

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 버튼 이름 그대로, 순서대로 씁니다.

_(작성 필요)_

## 3. 기능 상세

_(작성 필요)_

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Consultation.jsx`
- `frontend/src/documents/surgical-records.jsx · op-figures.jsx · op-plates.js` — 수술기록지
- `frontend/src/documents/referral.jsx` — 의뢰서

### 서버

- `backend/src/routes/consult.routes.js  (/api/consultations)`
- `backend/src/routes/orderset.routes.js  (/api/order-sets)`
- `backend/src/routes/document.routes.js  (/api/documents)`

### 공용 부품

- frontend/src/components/DocumentModal.jsx · documents/shared.jsx · documents/registry.js — 공용 문서 엔진, 진료 주관

### DB 테이블

_(작성 필요)_

## 5. 다른 모듈과의 연결

_(작성 필요)_

## 6. 설정 항목

_(작성 필요)_

## 7. 알려진 문제 · 제약

_(세션이 코드를 읽고 더 채웁니다. 아래는 2026-09-29 총괄 검토에서 **확인된** 것 — 수술기록지를 실제 인쇄 폭으로 렌더링해서 찾았습니다.)_

| # | 문제 | 어디 | 확인 방법 |
|---|---|---|---|
| ③ | **예/아니오를 둘 다 체크할 수 있다.** `checks` 입력이 전부 복수 선택이라 `거즈 카운트: Yes, No`가 그대로 인쇄된다. 부위(Right·Left·Bilateral), JP 배액관(None + RLQ), 동반 병변(None + Skin tag), 삼출액 양처럼 서로 배타적인 그룹 전부 해당 | `DocumentModal.jsx`의 `f.type === 'checks'` · `surgical-records.jsx`의 옵션 정의 | 렌더링 |
| ④ | **크기 칸을 안 적어도 인쇄된다.** 기본값 `' ×  ×  cm'`이 `trim()` 후에도 빈 문자열이 아니라 「채워진 칸」으로 잡힌다. 다른 칸은 비우면 숨겨지는데 이것만 예외. 연부조직 `massSize` · 유방 `lesionSize` · 충수 `appySize` | `OpNoteLayout`의 `detail` 필터 · `DocumentModal.jsx` 61행 기본값 채우기 | 렌더링 |
| ⑤ | **치루 유형을 두 개 고르면 표와 그림이 다르다.** 표에는 두 개가 나오고 단면도는 첫 번째 하나만 그린다 | `op-figures.jsx`의 `FistulaSection` | 렌더링 |
| ⑥ | **프랑스어 화면에서 그림과 선택값이 영어다.** 라벨은 번역되지만 선택값(`Yes`·`No`·`3 o'clock`·`Skin tag`)과 그림 글자(`Pile position (lithotomy view)`·`pre-op`)는 영어. 시계의 `R`·`L`은 프랑스어 관례로는 `D`(droite)·`G`(gauche) | `op-figures.jsx` · `surgical-records.jsx` 옵션 | 렌더링 |
| ⑦ | **소견 기본 문장의 `[anesthesia]` `[lithotomy/jackknife]` 같은 괄호**를 안 고치면 서명 기록에 그대로 인쇄된다 | `surgical-records.jsx`의 `findings` 기본값 | 코드 |

**인쇄 여유**: 모든 수술기록지가 A4 한 장에 들어가지만, 충수절제술은 상세 10줄 + 소견 4줄 + 술후 계획을 다 채우면 여유가 **9px**뿐이다. 소견을 1~2줄 더 쓰면 서명이 두 번째 장으로 넘어간다. 그림을 더 줄이면 위치 이름 글자가 8px 밑으로 내려가서 여기서 멈췄다.

**렌더링 확인 도구**: 문서 양식만 떼어 실제 인쇄 폭(688px)으로 찍어 보는 도구가 총괄 쪽에 있다 — `C:\Users\Shintong\AppData\Local\Temp\claude\C--Users-Shintong-Desktop-----\ffc2b807-713f-4479-aed6-929e3d607377\scratchpad\emr-render\` (`src/render.jsx`, `rerender.sh`). 참고해서 자기 작업공간에 맞게 써도 된다.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 치루 단면도를 해부학적으로 다시 그림 — 유형마다 지나는 구조물(내·외괄약근, 거근)이 다르게. 그림 있는 수술기록지 5종이 A4 두 장으로 넘어가던 것을 한 장으로 — 상세표와 그림을 한 줄에, 치루 시계 2개를 Goodsall 방식 1개로 | `be642c9` |
| 2026-07-30 | 수술기록지 6종(연부조직·탈장·충수·유방·치질·치루) 양식과 그림. 체크박스 선택이 인쇄 그림을 움직임 | `be642c9` |
