# 수납 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — M5 수납 API 권한 · M1 이월된 영수에 수납 거절 · M4 이월된 옛 영수 취소 거절

> **총괄 확인 (2026-09-29)**: 합침(`ee27510`) + 실행 중 EMR 반영. 확인(역할별, 읽기만): 관리자 전부 200 · 의사 전부 403 · 접수 전용 계정은 잔액만 200, 나머지 403. 운영 DB 계정 8개 중 `payment` 권한은 관리자 2개뿐(접수 계정 `zzfront`는 `registration`만) — 지금은 시험 계정이라 문제없지만, **현장에서 수납 창구 계정을 만들 때 「수납」 권한을 꼭 체크**해야 함(CHANGELOG·설치 안내에 넣을 것). M1·M4는 운영 DB에 이월된 영수가 없어 코드 검토와 세션의 격리 스택 결과로 갈음.

- **상태**: 확인 요청
- **커밋**: session/payment (이 항목과 같은 커밋, develop `a708c9b` 위)
- **한 일**: 아래 분류 항목대로. 총괄이 M4도 이번 단위에 넣으라고 해서 포함.
  - **M5** — `billing.routes.js`의 모든 경로에 `permMiddleware('payment')`, 예외로 `GET /patient/:id/balance`만 `payment` 또는 `registration`.
  - **M1** — `POST /:id/pay`가 `carried_into_id` 있는 영수면 409 `BILL_CARRIED: <그 빚을 가진 영수번호>`. 계산식은 그대로.
  - **M4** — `PUT /:id/void`가 `carried_into_id` 있는 영수면 409 `BILL_CARRIED: <뒤 영수번호>`. 화면은 사유를 묻기 전에 먼저 안내(`receipts`에 `carried_into_id`가 있음).
  - 화면: 미수 수납·전체 미수 수납이 `BILL_CARRIED`를 받으면 `py_payCarried` 안내 후 영수내역·잔액을 새로 불러옴. 영수취소는 `py_voidCarried`.
- **바꾼 파일**: `backend/src/routes/billing.routes.js`, `frontend/src/pages/Payment.jsx`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 수납 구역에 `py_payCarried`, `py_voidCarried` 2개
- **DB 마이그레이션**: 없음
- **번역 키**: `py_payCarried`, `py_voidCarried` (ko · en · fr)
- **확인한 방법**: `node --check`, 프론트 빌드 통과. 격리 스택 9183(새 session compose, 이미지 `bethesda-s-payment-*:dev`):
  - 권한표(테스트 계정 3개, 비밀번호는 무작위·출력 안 함):

    | 요청 | 의사(consultation) | 접수만(registration) | 수납(payment) |
    |---|---|---|---|
    | `GET /billing/pending` | 403 | 403 | 200 |
    | `GET /billing/patient/:id/balance` | 403 | **200** | 200 |
    | `GET /billing/patient/:id/history` | 403 | 403 | 200 |
    | `PUT /billing/:id/void` | 403 | 403 | 404(없는 영수) |
    | `POST /billing/:id/pay` | 403 | 403 | 404(없는 영수) |
  - M1: 이월된 1차 영수에 15,000 수납 → 409 `BILL_CARRIED: R-…-0071`(예전: 200, 같은 빚 두 번). M4: 같은 영수 취소 → 409, 안내대로 2차 먼저 취소 → 200, 그다음 1차 취소 → 200. 수납 화면·통계 미수 모두 0으로 일치.
  - 앞 단위 시나리오(T1~T5, S2·S4~S11) 재실행 — 결과 동일(회귀 없음).
  - 화면(프랑스어): 이월된 영수의 「Annuler」 → 사유 창 없이 「… reporté sur le reçu R-20260929-0097 … Annulez d’abord R-20260929-0097, puis ce reçu.」
- **확인 못 한 것**: 한국어 `py_voidCarried`·`py_payCarried` 화면 표시, 미수 수납 창에서의 `py_payCarried`(정상 화면에서는 이월된 영수에 미수 수납 버튼이 안 뜨므로 오래 연 화면에서만 나옴 — API로만 확인). 접수 화면을 접수 전용 계정으로 열어 보지는 않음(API 200으로 확인).
- **위키**: `modules/payment.md` 3.4, 3.5, 4절(권한), 7절 M1·M4·M5, 8절
- **총괄 확인 요청**: 수납 API가 이제 `payment` 권한을 요구합니다. 실행 중 EMR의 직원 중 수납 창구 계정에 `payment` 권한이 있는지 확인해 주세요(없으면 반영 직후 수납 화면이 403). 기본 `frontdesk`·`admin` 역할은 가짐.
- **다른 세션에 부탁**: 없음. (접수 세션 참고: `balance`는 `registration` 권한으로 계속 읽힘)
- **남은 일**: H3·H6·M2 — 결정용 자료를 다음 항목으로 씀.

## 2026-09-29 — 다음 작업 목록 (M1 · M2 · M5 분류)

- **상태**: 완료 — 진행분은 위 항목. M2는 결정 대기.
- **기준**: 총괄 지시 「M1·M2·M5 중 실장님 결정 없이 되는 것」. 실장님 규칙상 **금액 계산이 바뀌는 것은 진행하지 않음**.

| 항목 | 판단 | 이유 |
|---|---|---|
| **M5 수납 API 권한 검사** | **진행** | 금액과 무관한 접근 제한. 수납 권한(`payment`)이 없는 계정은 수납 API를 쓰지 못하게 함. 예외 하나: 접수 화면이 읽는 `GET /patient/:id/balance`는 `payment` 또는 `registration`. 수납 API를 부르는 곳은 수납 화면과 `Registration.jsx:73`뿐(grep). 관리자·기본 `frontdesk` 역할은 둘 다 가지고 있어 영향 없음. 진료 세션이 `d1f473e`에서 같은 방식(`permMiddleware`)을 씀 |
| **M1 이월된 영수에 미수 수납** | **진행 — 거절만 추가** | `/:id/pay`에서 `carried_into_id`가 있는 영수(그 빚이 이미 다른 영수로 넘어간 것)를 409로 **거절만** 함. 계산식은 그대로이고, 이월되지 않은 영수의 수납 결과는 한 푼도 달라지지 않음. 화면 버튼은 원래 이런 영수에 뜨지 않음(`outstanding`=0) — 오래 연 화면·API만 막힘 |
| **M2 미수 수납 돈이 원래 영수 날짜 매출로 잡힘** | **보류 — 실장님 결정 필요** | 받은 날 기준 매출로 바꾸려면 입금 기록 테이블(마이그레이션 3xx)을 새로 두고 통계 매출 계산도 바뀜 → 금액 규칙 변경이자 다른 모듈(통계) 변경. 선택지를 정리해 여쭐 예정 |

- **같은 모양의 다음 후보(이번에는 안 함)**: M4 — 이미 다른 영수로 이월된 옛 영수를 **취소**하면 새 영수에 그 빚이 남음. M1처럼 「거절만 추가」로 막을 수 있음. 총괄이 괜찮다고 하면 이어서 함.

## 2026-09-29 — develop(6개 세션 합친 판)과 합침, 수납 작업 전체 확인 요청

> **총괄 확인 (2026-09-29)**: 합침(`ee078d4`) + 실행 중 EMR 반영(반영 전 DB 백업). 확인(운영 DB에 아무것도 쓰지 않음, 영수 2건·수납액 474,500 전후 동일): `expected_active_bill_ids` 없는 수납 → 409 `BILL_CHANGED` · 옛 목록으로 수납 → 409 · 금액이 안 맞는 미수 → 400 · `/items`에 `active_bill_ids` · 정정 미리보기 200(받은 돈 474,500 = 총액, 환불 0) · `void-active` 404. **예전 방식 정정 영수: 실행 중 EMR에 0건**(적어 준 조회문 그대로 실행) — 고칠 데이터 없음. 배포 직후 열려 있던 수납 창이 한 번 409를 받는 것은 CHANGELOG에 적을 것. H3 범위·H6은 실장님께 여쭘.

- **상태**: 확인 요청 — 이 브랜치의 수납 작업 전부(H1 `1053c97`, H2·H4 `8a7ca96`, 알림 `4824f24`)를 합쳐도 됨
- **커밋**: session/payment `bee9e17`(develop `181bb76` 합침) · 이 항목의 커밋
- **한 일**: 총괄 요청대로 develop을 받음. 수납 커밋이 develop에 없어 `--ff-only`는 불가 → 이미 보고한 커밋 해시가 바뀌지 않도록 rebase 대신 **develop을 merge**(충돌 없음, 겹친 파일은 i18n 세 개뿐이고 구역이 달라 자동 병합).
- **바꾼 파일**: 합침 외에는 `wiki/modules/payment.md`(3.3, 5절 통계 공식, 7절 H5, 8절)만
- **공용 파일 변경**: 없음(이번 항목)
- **DB 마이그레이션**: 없음
- **번역 키**: 없음(이번 항목)
- **확인한 방법**: 합친 트리로 `node --check`, 프론트 빌드 통과. 격리 스택 9183을 develop의 새 `docker-compose.session.yml`로만 다시 띄움 → 이미지 `bethesda-s-payment-*:dev` 확인, 실행 중 EMR 컨테이너는 그대로. 앞 항목의 시나리오 T1~T5·S2·S4~S11 전부 재실행 → 결과 동일, 그리고 **이제 모든 시나리오에서 수납 화면 미수 = 통계 미수**(통계 세션 `52c4505`로 H5 해결). 프랑스어 수납 화면이 열리고 오류 없는 것 확인.
  - 접수 세션의 `PUT /api/visits/:id` 변경(본문에 있는 칸만 쓰기, `visit_type` 검사): 수납은 `{ visit_type }` 하나만 보내고 값은 화면 선택지 `newVisit·followUp·emergency·referral·none` — 전부 `VISIT_TYPES` 안. 화면에서 수납 시 200 확인. 영향 없음.
  - DATE 컬럼이 `'YYYY-MM-DD'` 문자열로 오는 변경(`7ad4387`): 수납 화면의 `ymd()`는 `T` 앞을 자르므로 그대로 동작.
  - 진료의 조제·결과 잠금(`d1f473e`): 조제된 처방·결과 난 오더는 지울 수 없으므로 정정 대상이 줄 뿐, 수납 코드와 충돌 없음.
- **확인 못 한 것**: 앞 항목과 같음(한국어 정정 화면 등).
- **위키**: `modules/payment.md` 3.3, 5절, 7절 H5, 8절
- **총괄 확인 요청**: 앞 항목들의 요청(예전 정정 영수 읽기 전용 조회, `void-active` 삭제, `POST /api/billing`의 `expected_active_bill_ids` 필수) 그대로. 이미지 이름 문제는 `657ba2c`로 해결된 것 확인.
- **다른 세션에 부탁**: 없음 — 통계 H5 부탁은 해결됨(감사합니다).
- **남은 일 · 알려진 문제**: H3(수납 직후 영수증 빈칸) — 범위를 실장님께 여쭘. H6(발급비 받은 내원이 「정정(환불)」로 뜸) — 실장님 결정 대기. M1·M2·M5 등 7절.

## 2026-09-29 — 격리 스택 빌드가 실행 중인 EMR의 이미지 이름을 덮어씀 (알림)

- **상태**: 확인 요청 (코드 변경 없음, 총괄 파일 관련)
- **한 일**: 없음 — 발견한 것을 알림.
- **내용**: `docker-compose.yml`은 이미지 이름을 `bethesda-emr-backend:latest` · `bethesda-emr-frontend:latest`로 고정하고, `docker-compose.session.yml`은 컨테이너 이름·포트만 바꾸고 **`image:`는 바꾸지 않습니다.** 그래서 규칙 7절대로 `up -d --build`를 하면 **실행 중인 EMR이 쓰는 이미지 태그가 세션 코드로 바뀝니다.** 실행 중인 컨테이너는 그대로지만, 그 뒤 누가 본체 폴더에서 `--build` 없이 `docker compose up -d`를 하면 세션 코드가 현장 EMR로 올라갑니다.
- **확인한 것**: 수납 세션은 07:44·07:54·07:57(UTC) 무렵 이 태그로 빌드했습니다. 16:57 KST에 본체 폴더(`C:\Bethesda-EMR-main`)의 compose가 실행 중인 EMR을 새로 만들었고(총괄 배포로 보임), 그 이미지 안에는 수납 세션 코드가 **없음**을 확인했습니다(`buildCorrection`·`expected_active_bill_ids`·`py_billChanged` 0건, 옛 `void-active` 있음). **현장에 영향 없음.**
- **수납 세션의 조치**: 이제부터 저장소 밖의 덮어쓰기 파일로 이미지 이름을 `bethesda-s-payment-backend:dev` / `-frontend:dev`로 바꿔 빌드합니다(`docker compose … config`로 확인). 다른 세션 일부(`bethesda-s-pharmacy-*:dev`, `bethesda-s-reception-*`)는 이미 따로 이름을 쓰고 있습니다.
- **총괄 확인 요청**: `docker-compose.session.yml`의 `backend`·`frontend`에 `image: bethesda-s-${SESSION}-backend:dev` 같은 줄을 넣어 주세요(규칙 7절도). 그리고 실행 중인 EMR을 올릴 때는 항상 `--build`로.

## 2026-09-29 — H2 정정(환불) 금액 바로잡기 · H4 미수 처리

- **상태**: 확인 요청
- **커밋**: session/payment (이 항목과 같은 커밋, H1 `1053c97` 다음)
- **한 일**: 실장님이 정한 규칙대로 고침.
  - **H2 정정**: 화면이 두 요청(전부 취소 → 화면이 계산한 새 영수)으로 하던 것을 서버의 한 트랜잭션 `POST /api/billing/visit/:visitId/correct`로 옮김. 새 영수는 **실제로 받은 돈**(바뀌는 영수들의 `net_paid` 합)을 `amount_paid`로, 할인·이월(이전 미수)·전에 받은 발급비를 유지. 가진 돈이 많으면 차액이 환불(`change_amount`), 적으면 미수(`partial`/`unpaid`). 이월된 옛 영수는 되돌리지 않고 새 영수로 옮김. 미리보기 `GET …/correction`의 금액을 화면이 돌려보내고, 그 사이 바뀌었으면 409.
  - **H4 미수 처리**: 항상 총액 전부를 미수로(`amount_paid 0`, `outstanding = total_due`). 받은 금액 칸에 숫자가 있으면 확인을 한 번 받음. 받은 금액 칸이 빈 채 「수납 확정」을 누르면 `partial`이 아니라 `unpaid`로(확인 창). 서버는 `change_amount`·`outstanding`·상태가 `total_due`·`amount_paid`와 맞지 않으면 400.
  - 곁가지: 정정 뒤 미수가 남은 내원이 「정정 재수납」으로 잘못 뜨던 것 → `needs_rebill`은 살아 있는 영수가 없을 때만. 영수번호 배정을 `nextReceiptNo()`로 분리(수납·정정 공용). **`PUT /api/billing/visit/:visitId/void-active` 삭제**(정정 화면만 쓰던 반쪽짜리 API, grep 확인).
- **바꾼 파일**: `backend/src/routes/billing.routes.js`, `frontend/src/pages/Payment.jsx`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 수납 표시 사이에 `py_` 키 8개 추가
- **DB 마이그레이션**: 없음. **기존 데이터는 바꾸지 않음**(아래 조회문 참고)
- **번역 키**: `py_paidSoFar` `py_noDifference` `py_correctionOwedHint` `py_correctionCarried` `py_unpaidIgnoresAmount` `py_unpaidConfirm` `py_refundHandBack` `py_remainsOwed` (ko · en · fr)
- **확인한 방법**: `node --check`, 프론트 빌드 통과. 격리 스택 9183, **현황 파악 때와 같은 시나리오로 전후 비교**:

  | 시나리오 | 고치기 전 | 고친 뒤 |
  |---|---|---|
  | S2 칸에 4,000 + 미수 처리 | 미수 11,000 (통계 15,000) | 미수 15,000 (통계 15,000). 옛 화면 본문은 400 |
  | S4 미수 영수 정정 | `paid`, 받지 않은 15,000이 매출 | `unpaid`, 미수 15,000 |
  | S5 20,000 받고 거스름 3,000 → 정정 | `net_paid` 13,000, 통계 미수 2,000 | `net_paid` 15,000, 환불 2,000, 미수 0 |
  | S6 이월 10,000 포함 영수 정정 | 환불 12,000, 옛 미수 10,000 부활, 통계 미수 22,000 | 환불 2,000, 옛 미수는 새 영수에 이월된 채, 수납 화면 미수 0 (통계 10,000은 H5) |
  | S7 할인 2,000 + 부분 10,000 → 정정 (새) | — | 할인 유지, 총액 13,000, 미수 3,000 `partial` |
  | S8 진단서 8,000 포함 → 약 삭제 정정 (새) | — | 발급비 유지, 환불 2,000 |
  | S9 이월된 영수 정정 (새) | — | 409 `BILL_CARRIED: R-…` |
  | S10 정정 동시 2건 (새) | — | 201 + 409, 새 영수 1장 |
  | S11 옛 중복 영수 2장 정정 (새) | — | 둘 다 취소, 환불 15,000, `net_paid` 15,000 |

  화면: 프랑스어 정정 화면(할인 1,000 · 부분 수납 → 「Impayé 4,000」, 확인 창 「4,000 Ar resteront impayés.」, 더블클릭에도 새 영수 1장). 한국어 미수 처리(칸에 4,000 → 확인 창 「받은 금액 칸의 4,000 Ar는 기록되지 않고, 전액 15,000 Ar가 미수로 남습니다」 → 저장값 미수 15,000).
- **확인 못 한 것**: 한국어 정정 화면, 프랑스어 미수 처리 확인 창(키는 넣음). `BILL_CARRIED` 안내 문구를 화면에서 띄워 보지 않음(API로만 확인). 수납 직후 영수증 창은 여전히 비어 있음(H3, 다음 작업).
- **위키**: `modules/payment.md` 2절(미수 처리, 정정(환불) 절 새로, 목록 표시), 3.1, 3.2, 3.3, 3.5, 3.6 새로 씀, 3.7, 3.8, 4절 API 표, 7절(H2·H4 고침, H6·M8 추가, 줄 번호 기준 명시), 8절
- **총괄 확인 요청**:
  - **기존 데이터는 그대로입니다.** 예전 방식으로 정정한 영수는 계속 틀린 값입니다(매출이 환불액만큼 적게, 또는 받지 않은 돈이 받은 것으로). 실행 중인 EMR에 몇 건 있는지 **읽기 전용**으로 세어 주시면, 고칠지(데이터 수정 마이그레이션) 실장님께 여쭙겠습니다. 예전 정정 영수는 비고가 `… refund <숫자>`로 끝납니다:
    ```sql
    SELECT b.id, b.receipt_no, b.billing_date, b.total_due, b.amount_paid, b.change_amount, b.net_paid,
           (SELECT COALESCE(SUM(x.net_paid),0) FROM billing x
             WHERE x.visit_id = b.visit_id AND x.payment_status = 'cancelled'
               AND x.cancelled_at BETWEEN b.created_at - interval '1 minute' AND b.created_at) AS replaced_net_paid
      FROM billing b
     WHERE b.note ~ ' refund [0-9.]+$' AND b.payment_status <> 'cancelled'
     ORDER BY b.billing_date;
    ```
    `change_amount > 0`인 줄은 매출이 그만큼 적게, `replaced_net_paid < total_due`인 줄은 받지 않은 돈이 매출로 잡힌 것입니다.
  - `void-active` API를 지웠습니다. 다른 화면에서 부르는 곳 없음.
- **다른 세션에 부탁**:
  - **통계** — 앞 항목의 H5 부탁(미수 = `outstanding` 기준) 그대로 유효합니다. 이번 수정으로 정정 영수는 `total_due − net_paid`가 `outstanding`과 같아져 정정 쪽 차이는 사라졌고, 남은 차이는 **이월**뿐입니다(S6·S9: 수납 화면 0, 통계 10,000·17,000).
- **남은 일 · 알려진 문제**: H3(영수증 빈칸) 다음 작업. H6(발급비를 받은 내원이 「정정(환불)」로 뜸)은 실장님 결정 대기. M8(목록의 환불 예정 금액 ≠ 실제 환불).

## 2026-09-29 — H1 중복 수납 막기

- **상태**: 확인 요청 (H2·H4는 이어서 작업 중 — 이 항목만으로도 합칠 수 있음)
- **커밋**: session/payment (이 항목과 같은 커밋)
- **한 일**: 확정 버튼을 두 번 누르면 영수가 두 장 생기던 문제(H1)를 화면과 서버 양쪽에서 막음. 화면은 돈을 쓰는 버튼 6개를 처리 중 잠금. 서버는 화면이 본 「살아 있는 영수 id 목록」을 환자 단위 잠금 안에서 지금 DB와 비교해 다르면 409 `BILL_CHANGED`로 거절하고, 이미 다른 영수로 넘어간 이전 미수를 또 넣는 요청도 거절. 영수취소·미수 수납도 같은 잠금을 씀. 금액 계산 공식은 바꾸지 않음.
- **바꾼 파일**: `backend/src/routes/billing.routes.js`, `frontend/src/pages/Payment.jsx`
- **공용 파일 변경**: `frontend/src/i18n/ko.js` · `en.js` · `fr.js` — 수납 표시 사이에 `py_billChanged` 1개 추가(규칙 6대로)
- **DB 마이그레이션**: 없음
- **번역 키**: `py_billChanged` (ko · en · fr)
- **확인한 방법**: `node --check` 통과, 프론트 `npm run build` 통과(※ 저장소에 `package-lock.json`이 없어 `npm ci`가 안 됨 → `npm install --no-package-lock`으로 설치). 격리 스택 9183:
  - API: 같은 요청 2건 동시 → 201 1건 + 409 1건(영수 1장). `expected_active_bill_ids` 없는 요청 → 409. 같은 환자 두 내원이 같은 이전 미수 15,000을 동시에 넣음 → 1건만 201, 다른 쪽 409. 정상적인 추가 청구(맞는 id 목록) → 201. 다른 환자의 내원 번호 → 400.
  - 화면(프랑스어): 확정 버튼을 세 번 연달아 클릭 → 영수 1장(R-20260929-0019).
  - 화면(한국어): 환자를 띄워 둔 채 다른 창구가 먼저 수납 → 확정 시 `py_billChanged` 한국어 안내, 목록 새로 고침, 영수 1장 유지.
- **확인 못 한 것**: 프랑스어 `py_billChanged` 문구가 실제로 뜨는 것은 보지 않음(키는 넣음). 미수 수납 창의 연타는 화면 잠금만 있고 서버는 막지 않음(부분 금액 두 번은 정상 사용과 구별이 안 됨).
- **위키**: `modules/payment.md` 2절(보통 수납 9번), 3.8, 3.9 새로 씀, 4절 API 표, 7절 H1·M3, 8절
- **총괄 확인 요청**: **`POST /api/billing`이 `expected_active_bill_ids`를 필수로 받습니다.** 수납 화면 말고 이 API를 부르는 곳은 없음(grep 확인). 배포 직후 옛 화면을 열어 둔 창구는 한 번 409 안내를 받고 새로 고치면 됩니다.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: H2·H4 작업 중. H3(영수증 빈칸)은 그대로.

## 2026-09-29 — 현황 파악, 위키 작성, 문제 목록

- **상태**: 보류 — 무엇부터 고칠지 실장님 결정 대기 (코드 변경 없음, 위키만)
- **커밋**: session/payment (이 항목과 같은 커밋)
- **한 일**: 수납 화면·서버·관련 마이그레이션·통계의 수납 집계를 읽고 `modules/payment.md` 1~8절을 실제 코드 기준으로 채움. 의심되는 금액 문제를 격리 스택에서 화면과 같은 요청으로 재현함.
  - 참고: 작업공간이 `develop`(`a4a9ea6`)이 아니라 `f1e9cc4`(main)에서 만들어져 있어, 제 커밋이 없는 상태에서 `a4a9ea6`으로 fast-forward 하고 브랜치를 `session/payment`로 바꿈. 다른 브랜치를 merge 한 것은 아님.
- **바꾼 파일**: `wiki/modules/payment.md`, `wiki/handoff/payment.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 격리 스택 9183(`bethesda-s-payment`)에 테스트 관리자로 로그인, API로 환자·내원·처방을 만들고 `Payment.jsx`가 보내는 것과 같은 본문으로 수납·정정을 보낸 뒤 `/billing/patient/:id/balance`와 `/stats/outstanding`을 비교. 결제 직후 영수증은 화면(프랑스어)에서 직접 눌러 확인.
  재현 시나리오(같은 데이터로 고치기 전·후 비교에 다시 씀):
  - S1 확정 요청 2건 동시 → 영수 2장
  - S2 받은 금액 4,000 입력 후 「미수 처리」 → outstanding 11,000 / 통계 15,000
  - S3 미수 15,000 이월 후 전액 수납 → 수납 화면 0 / 통계 15,000, 이월된 옛 영수에 `/pay` 200 OK
  - S4 미수 영수 정정 → 받지 않은 15,000이 paid로 기록
  - S5 20,000 받고 거스름 3,000, 약 2,000 삭제 후 정정 → net_paid 13,000, 통계 미수 2,000
  - S6 이월 10,000 포함 영수 정정 → 환불 12,000 표시, 옛 미수 10,000 부활, 통계 미수 22,000
- **확인 못 한 것**: 한국어 화면은 이번에 보지 않음(프랑스어만). 7절의 「코드」 표시 항목(H2 라·마, M3, M4, M5, M6, L2~L7)은 코드만 읽었고 재현하지 않음. 실행 중인 EMR의 실제 데이터에 이 문제들이 얼마나 쌓였는지는 **보지 않음**(9080은 건드리지 않음).
- **위키**: `modules/payment.md` 1~8절 전부 새로 씀
- **총괄 확인 요청**: 없음(코드 변경 없음). 다만 H1~H5는 현장 매출·미수 숫자에 이미 영향을 주고 있을 수 있음.
- **다른 세션에 부탁**:
  - **통계** — `stats.routes.js:108-111`(미수/환불 요약)과 `:164-176`(미수 명단)이 영수마다 `total_due − net_paid`로 셉니다. 이월된 옛 영수(`carried_into_id` 있음, `outstanding=0`)가 계속 미수로 잡혀 **같은 빚이 두 번** 나옵니다(재현 S3). 수납 화면과 같은 기준 — 미수 = `outstanding`, 환불 예정 = `max(net_paid − total_due, 0)`, 둘 다 `payment_status <> 'cancelled'` — 으로 맞춰 주세요. 수납 쪽 정정(H2) 수정과 함께 가야 숫자가 맞으므로, 수납이 H2를 고칠 때 다시 알려드리겠습니다.
- **남은 일 · 알려진 문제**: `modules/payment.md` 7절 전체. 제안 순서는 실장님께 보고한 대로(H1 → H3 → H2·H4 → M1 → M2 설계 결정).
