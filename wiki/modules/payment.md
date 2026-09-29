# 수납 (Payment)

> **담당**: 수납 세션 · 브랜치 `session/payment` · **마지막 갱신**: 2026-09-29 · **상태**: H1 · H2 · H3 · H4 · H6 · M1 · M4 · M5 · M7 고침, H5는 통계가 고침 — 다음: M2(결정: 미수 수납 때 새 영수 — 설계 먼저)

## 1. 이 모듈이 하는 일

진료가 끝난 내원(`visit.status='completed'`)의 돈을 받는 화면입니다.

- **청구** — 진료비(내원 종류별) + 원내 처방 약값 + 오더(검사·처치·영상) + 수납 창구에서 더하는 발급비(진단서·CD 등)를 합쳐 영수(`billing`)를 만듭니다.
- **영수증** — 영수번호 `R-YYYYMMDD-NNNN`을 매기고 영수증을 출력·재출력합니다.
- **미수금** — 덜 받은 돈을 영수에 남기고, 나중에 그 영수에서 받거나(미수 수납), 다음 내원 청구에 얹어 받습니다(이월).
- **취소·재수납·추가 청구·정정(환불)** — 영수를 취소하면 그 내원은 다시 수납 대기로 돌아옵니다. 수납 뒤에 의사가 처방·오더를 늘리면 차액만 추가 청구하고, 줄이면 정정(환불) 대상으로 뜹니다.
- 수납 창구에서 **문서 발급, 원외 처방전, 차트 보기, 영상 판독 소견 보기**도 합니다(다른 모듈의 부품을 불러 씀).

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR** 로 바꿉니다.

> **수납 창구 직원의 계정에는 「수납」 권한이 있어야 합니다.** 관리자가 **Paramètres (설정) → 👥 Staff** 에서 계정을 만들거나 고칠 때, 권한 칸의 **💳 Paiement (수납)** 을 체크하세요. 역할을 **Front Desk** 로 고르면 기본으로 체크됩니다. 이 권한이 없으면 메뉴에 **Paiement** 가 보이지 않고, 이미 열려 있던 화면에서도 목록과 수납이 거절됩니다. 접수 권한만 있는 계정은 접수 화면에서 환자의 미수 금액만 볼 수 있습니다.

### 2.1 화면 열기와 화면 구성

맨 위 메뉴 줄에서 **Paiement (수납)** 을 누릅니다. 화면은 세 칸입니다.

- **왼쪽** — 환자 목록. 위쪽의 **En attente (수납 대기)** 와 **Payé aujourd’hui (수납 완료)** 버튼으로 목록을 바꿉니다. 괄호 안 숫자는 목록의 건수입니다. **Rechercher (검색)** 칸에 이름·차트번호·영수번호를 넣으면 걸러집니다.
- **가운데** — 고른 환자의 청구 내용.
- **오른쪽** — **Visites passées (과거 내원)**: 지난 진료 기록(읽기만). **Reçus (영수내역)**: 이 환자의 모든 영수증.

위쪽 버튼 줄(환자를 고르면 켜짐):

| 버튼 | 하는 일 |
|---|---|
| **🔍 Trouver patient (환자 찾기)** | 오늘 목록에 없는 환자·다른 날 내원을 찾아서 수납 |
| **📄 Documents (문서/의뢰서)** | 진단서·의뢰서 같은 문서 발급. **발급비는 자동으로 붙지 않으므로** 가운데의 **Délivrance / Autres** 에서 따로 더합니다 |
| **💊 Ordonnance ext. (원외 처방전)** | 밖에서 사는 약의 처방전 출력 |
| **📋 Dossier (vue) (차트뷰어)** | 진료 기록 보기(고칠 수 없음) |
| **🩻 Compte-rendu (판독소견)** | 영상 판독 소견 보기 |
| **Impayé (미수 처리)** · **Confirmer (수납 확정)** | 수납 저장(2.2) |
| **↻** | 목록 새로 불러오기 |

### 2.2 보통 수납

1. **En attente (수납 대기)** 목록에서 환자를 누릅니다. 오늘 진료가 끝난 환자가 나옵니다.
2. 가운데 맨 위 **Consultation (진료비)** 옆에서 진료 종류가 맞는지 봅니다 — **Nouvelle (초진)** · **Suivi (재진)** · **Urgence (응급)** · **Référence (의뢰)** · **Sans consultation (0) (진료 없음)**. 바꾸면 금액이 바로 바뀌고, 수납할 때 내원 기록의 종류도 같이 바뀝니다.
3. 약·검사·처치는 진료실에서 넣은 그대로 나옵니다. 고칠 수 없습니다 — 틀렸으면 진료실에 말하세요.
4. 진단서·CD 같은 발급비가 있으면 **Délivrance / Autres (발급/기타)** 줄의 **+ Ajouter (항목 추가)** 에서 고릅니다. 잘못 넣었으면 그 줄의 **✕** 를 누릅니다.
5. 할인이 있으면 **Remise (할인)** 칸에 **금액**을 넣습니다.
6. **Montant Reçu (받은 금액)** 칸에 환자가 낸 돈을 넣습니다. 아래 버튼 **Exact (정확히)** 는 총액 그대로, **5,000 · 10,000 · 20,000 · 50,000** 은 그 금액을 넣습니다.
7. 위쪽 초록 버튼 **Confirmer (수납 확정)** 를 누릅니다.
   - 받은 돈이 총액 이상이면 「전액 수납」, 모자라면 「부분 수납」으로 저장되고 모자란 만큼 미수로 남습니다.
   - **Montant Reçu** 칸이 비어 있으면 「전액을 미수로 남길까요?」라고 묻습니다.
8. 한 푼도 못 받았으면 빨간 **Impayé (미수 처리)** 를 누릅니다. **총액 전부**가 미수로 남습니다. **Montant Reçu** 칸에 숫자가 있으면 「그 금액은 기록되지 않습니다」라고 한 번 묻습니다 — 실제로 돈을 받았으면 **취소**하고 **Confirmer** 를 누르세요.
9. 누르면 처리가 끝날 때까지 버튼이 흐려지고 「…」로 바뀝니다. 여러 번 눌러도 영수는 한 장만 생깁니다.
10. 영수증 창이 뜨면 **🖨 Imprimer Reçu (영수증 출력)** 를 누릅니다. 새 창이 열리며 A4 인쇄 창이 뜹니다(브라우저가 팝업을 막으면 이 사이트의 팝업을 허용하세요). **Fermer (닫기)** 로 닫습니다.
    - 영수증은 **화면 언어와 상관없이 항상 프랑스어**입니다. 병원명·주소·전화는 **Paramètres (설정)** 의 병원 정보에서 옵니다.
    - 영수증에는 항목(약·검사·발급비), 할인, 이전 미수, 총액, 받은 돈, 거스름돈, 실제 받은 돈, 남은 미수, 받은 직원이 나옵니다. 항목이 많아 두 장이 되면 합계는 둘째 장에 통째로 옮겨지고, 그 위에 영수번호·환자 이름이 작게 붙습니다.

### 2.3 가운데 칸의 뜻 (수납할 때)

| 칸 | 뜻 |
|---|---|
| **Consultation (진료비)** | 진료 종류에 따른 진료비. 금액은 설정의 오더 코드 C01~C04 |
| **💊 Ordonnances (처방)** | 병원 약국에서 내주는 약. 밖에서 사는 약(원외 처방)은 들어가지 않습니다 |
| **🧾 Examens / Actes (검사/처치료)** | 검사·영상·처치 오더 |
| **🧾 Délivrance / Autres (발급/기타)** | 수납 창구에서 더한 발급비(서류, CD 등) |
| **Sous-total (소계)** | 위 항목의 합. 추가 청구일 때는 **Charge suppl. (추가 청구액)** 로 바뀌고 새로 늘어난 것만 셉니다 |
| **Remise (할인)** | 깎아 준 금액 |
| **Solde antérieur dû (이전 미수)** | 이 환자가 전에 덜 낸 돈. 빨갛게 보이고 **Total** 에 자동으로 더해집니다. 이번에 받으면 옛 영수증의 미수는 이 영수증으로 넘어옵니다 |
| **Remboursement dû (환불 예정)** 파란 상자 | 이 환자에게 돌려줄 돈이 남아 있다는 안내. 총액에서 빼지는 않습니다 |
| **Total (총 수납액)** | 소계 − 할인 + 이전 미수. 이번에 받을 돈 |
| **Montant Reçu (받은 금액)** | 환자가 건넨 돈(1만 원짜리로 3천 원을 내면 10,000) |
| **Monnaie (거스름돈)** | 받은 금액 − 총액. 돌려줄 돈 |
| **Impayé (미수금)** | 총액 − 받은 금액. 미수로 남을 돈 |

### 2.4 왼쪽 목록의 표시

| 표시 | 뜻 | 할 일 |
|---|---|---|
| **En Attente (대기)** | 아직 수납하지 않음 | 2.2 보통 수납 |
| **Supplément (추가 청구)** + `➕ Charge suppl.: N Ar` | 수납한 뒤에 진료실이 약·검사를 더함 | 2.5 |
| **Remboursement (정정(환불))** + `↩ Remboursement dû: N Ar` | 수납한 뒤에 약·검사가 줄었거나, 같은 내원에 영수증이 두 장 | 2.6 |
| **Re-facturer (정정 재수납)** + `📅 날짜 · à re-facturer` | 영수증을 취소했고 새 영수증이 아직 없음 | 2.7 |
| 빨간 `+ Outstanding: N Ar` | 이 환자에게 이전 미수가 있음 | 수납하면 자동으로 더해짐 |

> 미수·부분 수납으로 끝난 오늘 환자는 목록에 **En Attente** 로 남습니다. 누르면 **Déjà payé en totalité (이미 수납 완료)** 가 뜨는데, 새로 청구할 항목이 없다는 뜻입니다. 남은 미수는 오른쪽 **Reçus** 에서 받습니다(2.8). (7절 L7)

### 2.5 Supplément (추가 청구) — 수납 뒤에 항목이 늘었을 때

1. 목록에서 **Supplément** 환자를 누릅니다. 가운데 위에 파란 **➕ Supplément** 줄과 **Déjà facturé (이미 수납)** 금액이 보입니다.
2. 오른쪽 합계에는 **새로 늘어난 항목만** 나옵니다. 보통 수납처럼 **Montant Reçu** 를 넣고 **Confirmer** 를 누릅니다. 새 영수증이 한 장 더 생깁니다.

### 2.6 Remboursement (정정(환불)) — 수납 뒤에 항목이 줄었을 때

1. 목록에서 **Remboursement** 환자를 누릅니다.
2. 가운데 왼쪽에 **Articles actuels (현재 항목)**, 오른쪽에 아래 칸이 나옵니다. 전에 받은 발급비, 할인, 이월된 이전 미수는 그대로 유지됩니다.

   | 칸 | 뜻 |
   |---|---|
   | **Montant correct (정확한 금액)** | 지금 항목의 합 |
   | **Remise (할인)** | 전에 해 준 할인(그대로 유지) |
   | **Solde antérieur dû (이전 미수)** | 전 영수증이 함께 받았던 이전 미수(그대로 유지) |
   | **Total (총 수납액)** | 새 영수증의 총액 |
   | **Déjà encaissé (이미 받은 금액)** | 이 내원에서 병원이 실제로 가지고 있는 돈 |
   | 보라 상자 **Remboursement dû (환불 예정)** | 환자에게 **돌려줄 돈** |
   | 빨간 상자 **Impayé (미수금)** | 받은 돈이 새 총액보다 적었던 환자 — 돌려줄 돈은 없고 이 금액이 미수로 남습니다 |
   | **Aucune différence (차액 없음)** | 영수증만 새로 발행됩니다 |
3. **↩ Rembourser (정정(환불) 처리)** 를 누르고, 확인 창의 금액(「Rendez N Ar au patient」 또는 「N Ar resteront impayés」)을 다시 보고 **확인**합니다. 원래 영수증은 **ANNULÉ (취소됨)** 이 되고 새 영수증이 한 장 생깁니다.
4. 「…reporté sur le reçu R-…」 안내가 뜨면, 이 내원의 미수를 다른 날 영수증에 얹어 이미 받은 환자입니다. **Reçus** 에서 그 영수증을 먼저 취소한 뒤 정정합니다.

> 목록의 `Remboursement dû: N Ar` 는 **줄어든 항목의 금액**입니다. 실제로 돌려줄 돈은 2번 화면의 보라 상자가 맞습니다. 돈을 덜 받았던 환자는 돌려줄 돈 없이 미수만 줄어듭니다(7절 M8).

### 2.7 Re-facturer (정정 재수납) — 영수증을 취소한 내원

1. 목록에서 **Re-facturer** 환자를 누릅니다. 날짜와 상관없이 목록에 남아 있습니다.
2. 노란 **↺ Re-facturer** 줄에 **Paiement reporté (이월 수납액)** — 취소한 영수증에서 받았던 돈 — 이 보이고, 그 금액이 **Montant Reçu** 칸에 미리 들어가 있습니다. 같은 돈을 두 번 받지 않게 하기 위해서입니다.
3. 취소할 때 그 돈을 환자에게 **돌려줬다면** **Montant Reçu** 칸을 지우고 실제로 새로 받은 돈을 넣습니다. 그다음 **Confirmer**.

### 2.8 Reçus (영수내역) — 미수 받기

1. 환자를 고르고 오른쪽 위 **Reçus (영수내역)** 를 누릅니다. 영수증이 최근 것부터 나옵니다. 줄마다 날짜 · 진료과 · 영수번호, **Total (총 수납액)** · **Montant Reçu (받은 금액)**, 미수가 있으면 빨간 **Impayé: N Ar**, 상태 표시가 있습니다. 취소된 영수증은 줄이 그어지고 **ANNULÉ** 가 붙습니다.
2. 미수가 있는 영수증의 **💵 Encaisser impayé (미수 수납)** 을 누릅니다. 작은 창에 미수 금액이 나오고 **Montant reçu (받은 금액)** 칸에 전액이 미리 들어가 있습니다. 일부만 받으면 금액을 고칩니다(**Total (전액)** · **+5,000** · **+10,000** · **+50,000** 버튼). **Confirmer** 를 누릅니다. 미수보다 많이 넣으면 「Ne peut dépasser l'impayé」.
3. 미수 영수증이 여러 장이면 위쪽 빨간 줄의 **💵 Tout encaisser (전체 미수 수납)** 으로 한 번에 받습니다.
4. 「…déjà été reporté sur le reçu R-…」 안내가 뜨면, 그 미수는 이미 다른 영수증으로 넘어갔습니다. 안내에 나온 영수증에서 받습니다. 영수내역은 자동으로 새로 고쳐집니다.

> 나중에 받은 미수는 지금 **처음 진료한 날**의 매출로 잡힙니다. 그날 금고의 현금과 통계가 다를 수 있습니다(7절 M2, 결정 대기).

### 2.9 영수증 취소 · 재출력

- **Annuler (영수취소)** — **Motif d'annulation ? (취소 사유)** 를 적으면 영수증이 **ANNULÉ** 가 됩니다. 그 내원은 **En attente** 목록에 **Re-facturer** 로 돌아옵니다(2.7).
  - 「…reporté sur le reçu R-…, qui le facture maintenant. Annulez d’abord R-…」 안내가 뜨면, 이 영수증의 미수가 뒤의 영수증으로 넘어가 있는 것입니다. 안내에 나온 영수증을 **먼저** 취소한 뒤 이 영수증을 취소합니다.
- **🖨 Réimprimer (재출력)** — 저장된 영수증을 수납 직후와 **똑같은 모양**으로 다시 뽑습니다. 취소된 것은 빨간 **ANNULÉ** 상자(취소 일시·취소한 직원·사유)가, 정정 영수증에는 「Remplace le(s) reçu(s) R-…」와 **Remboursé au patient (환불)** 이, 미수를 다음 영수증으로 넘긴 영수증에는 「Solde reporté sur le reçu R-…」와 상태 **Reporté** 가 찍힙니다.

### 2.10 Payé aujourd’hui (수납 완료) — 오늘 수납한 것 보기

위쪽 **Payé aujourd’hui** 를 누르면 왼쪽이 **Paiements du jour (오늘 수납 완료)** 목록이 됩니다. 영수번호·금액과 상태가 보이고, 누르면 가운데에 **Détail paiement (수납 상세)** 가 나옵니다 — 항목표(**Code · Article · Qté · Prix · Total**), **Reçu (영수번호)** · **Caissier (수납자)** · Date · Status, **Sous-total · Remise · Total · Montant Reçu · Impayé**. 취소한 영수증도 이 목록에 들어 있고 건수에도 셉니다(7절 L6).

### 2.11 이런 안내가 뜰 때

| 안내 (프랑스어 화면) | 뜻 · 할 일 |
|---|---|
| 「Ce patient vient d’être encaissé ailleurs, ou le solde antérieur a déjà été réglé…」 | 다른 창구에서 같은 환자를 먼저 받았거나, 이전 미수가 이미 정산됐습니다. 목록이 새로 고쳐졌으니 다시 보고 필요하면 다시 수납합니다. 영수증은 두 장 생기지 않았습니다 |
| 「Traiter le remboursement ?」 + 금액 | 정정 확인. 금액을 다시 보고 확인 |
| 「Les N Ar saisis ne seront pas enregistrés…」 | **Impayé** 를 눌렀는데 받은 금액 칸에 숫자가 있음. 돈을 받았으면 취소 → **Confirmer** |
| 「Aucun montant reçu. Laisser les N Ar impayés ?」 | 받은 금액 칸이 빈 채 **Confirmer**. 정말 미수면 확인 |
| 「…reporté sur le reçu R-…」 | 그 미수는 안내에 나온 영수증으로 넘어갔습니다(2.6 · 2.8 · 2.9) |
| 「Quantité totale manquante pour : …」, 금액 칸의 「⚠ Quantité manquante」, 목록의 「⚠ Quantité de médicament manquante」 | 그 약의 총량이 처방에 없어 금액을 셀 수 없습니다. 수납이 막혀 있습니다. **진료실에 그 처방을 다시 저장해 달라고** 한 뒤 **↻** 를 누르고 수납합니다 |
| 「Le navigateur a bloqué la fenêtre d'impression…」 | 브라우저가 인쇄 창(팝업)을 막았습니다. 주소창 오른쪽의 팝업 차단 표시를 눌러 이 사이트의 팝업을 허용하고 다시 **Imprimer Reçu** |
| 화면 곳곳의 영어(`paid` · `partial` · `+ Outstanding` · `No items`) | 아직 번역되지 않은 글자(7절 L1). `paid` 전액 수납 · `partial` 부분 수납 · `unpaid` 미수 · `cancelled` 취소 |

## 3. 기능 상세

### 3.1 금액 용어와 공식 (현재 코드 기준)

모든 금액은 아리아리(Ar), DB는 `DECIMAL(12,2)`. 한 영수(`billing` 한 줄)에 대해:

| 이름 | 컬럼 | 공식 · 누가 계산 | 근거 |
|---|---|---|---|
| 진료비 | `consult_fee` | 내원 종류 → 오더 코드 `C01`(초진) `C02`(재진) `C03`(응급) `C04`(의뢰)의 `price_clinic`. `none`이면 0. 화면에서 계산 | `Payment.jsx` `consultFee()` |
| 약값 | `drug_total` | Σ `total_qty` × `unit_price`. **`total_qty`는 진료가 처방을 저장할 때 계산해 넣은 값 그대로** — 수납은 계산식을 갖지 않음(2026-09-29, 아래). **원외 처방(`dispense_type='external'`)은 제외** | `Payment.jsx` `rxQty()`·`drugTotal()`, `billing.routes.js` `/visit/:id/items` |
| 처치·검사 | `procedure_total` | Σ `order_item.quantity × unit_price` **+ 발급비(수납에서 추가한 fee 항목)** | `Payment.jsx` `procTotal()`·`extraTotal()`·`doConfirmNow()` |
| 소계 | `subtotal` | 이번에 **새로** 청구하는 항목의 합 (`chargeRows()`). 첫 수납이면 전부, 추가 청구면 차액만 | `Payment.jsx` `chargeRows()` |
| 할인 | `discount_amount` | 직원이 넣은 금액(화면은 금액 할인만 씀. `percent` 계산 코드는 있으나 쓰이지 않음) | `Payment.jsx` `discountAmt()` |
| 이전 미수 | `previous_balance` | 이 환자의 취소 안 된 영수의 `outstanding` 합 (서버 `/pending`이 계산해서 화면에 줌) | `billing.routes.js` `/pending` |
| 총 수납액 | `total_due` | `max(0, 소계 − 할인 + 이전 미수)` — 화면 계산, **서버는 그대로 저장** | `Payment.jsx` `totalDue()` |
| 받은 금액 | `amount_paid` | 환자가 **건넨** 돈 (1만 원짜리로 3천 원을 내면 10,000). 미수 처리면 0 | `Payment.jsx` `doConfirmNow()` |
| 거스름돈 | `change_amount` | `max(0, 받은 금액 − 총 수납액)`. 미수 처리면 0. 정정 영수에서는 **돌려준 환불액** | `Payment.jsx` `changeAmt()` |
| **순수납** | `net_paid` | **DB 생성 컬럼** `amount_paid − change_amount` = 병원이 실제로 가진 돈. 매출은 이것으로 셉니다 | `017_billing_net_paid.sql` |
| 미수 | `outstanding` | 확정 시 `max(0, 총 수납액 − 순수납)`. **미수 처리면 총 수납액 전부**. 이후 미수 수납·이월·취소가 바꿈 | `Payment.jsx` `doConfirmNow()` |
| 상태 | `payment_status` | `paid`(받은 금액 ≥ 총액) · `partial`(조금 받음) · `unpaid`(한 푼도 안 받음 — 미수 처리, 또는 받은 금액 칸이 빈 채 확정) · `cancelled`(취소). `waiting`·`waived`는 제약에는 있으나 화면이 만들지 않음 | 확정 버튼, `006_billing_void.sql` |

**약 수량은 진료 한 곳에서만 계산** (2026-09-29, 실장님 결정: 총량 = 하루 총량 × 일수, 계산은 진료 서버): 수납(`/pending`의 `live_total`, `buildCorrection()`, 화면 `rxQty()`)은 `total_qty`만 읽습니다. 예전에는 비어 있으면 `dose × frequency × days`로 대신 셌는데 — 약국·통계에는 없는 두 번째 계산식이었고, 비어 있는 처방을 수납은 청구하고 약국·통계는 0으로 세는 어긋남이 있었습니다. **`total_qty`가 비어 있는 처방은 0원으로 넘어가지 않습니다**: 대기 목록에 `missing_qty`(「⚠ Quantité de médicament manquante」), 수납 화면에 빨간 안내와 금액 칸 「⚠ Quantité manquante」, 「Confirmer」 거절, 서버도 `POST /api/billing`·정정을 409 `QTY_MISSING: <약 이름>`으로 거절 — 진료실이 그 처방을 다시 저장하면(수정 저장은 서버가 총량을 계산해 넣음) 풀립니다. 화면으로 만든 처방은 늘 `total_qty`가 들어가서(첫 커밋부터) API를 직접 부른 경우에만 생깁니다. `total_qty = 0`은 0으로 셉니다(화면과 서버가 같음).

**「그로스」(통계의 gross)** = `consult_fee + drug_total + procedure_total` — 할인·이전 미수 **전**의 이번 진료분.

### 3.2 추가 청구 (수납 뒤 처방·오더가 늘어난 경우)

- 서버 `/pending`이 내원마다 **지금 금액**(`live_total`: 진료비+원내약+오더)과 **이미 청구한 금액**(`billed_total`: 취소 안 된 영수의 `consult_fee+drug_total+procedure_total`)을 비교합니다(`billing.routes.js` `/pending`의 `live` CTE). **창구 발급비는 이 비교에서 뺍니다**(2026-09-29, H6 — 실장님 결정): 「이미 청구한 금액」에서 창구 발급비를 빼고 비교합니다. 창구 발급비 = `billing_item.item_type='fee'`이면서 **그 내원의 오더(`order_item`)에 없는 코드**(`counterFeeCond()`). 진료실이 오더 세트로 fee 코드를 오더한 경우는 오더이므로 양쪽에 다 있어 빼지 않습니다. 정정 계산(`buildCorrection()`)도 같은 함수로 「유지할 발급비」를 고릅니다 — 판정과 정정이 한 기준을 씁니다. 예전에는 발급비를 받은 내원이 발급비만큼 「정정(환불)」로 계속 떴고, 발급비 + 약이 **늘어난** 내원도 「정정」으로 떴습니다.
  - `live − billed > 0.01` → `needs_additional` (목록에 「추가 청구」, 차액 `extra_due`)
  - `billed − live > 0.01` → `needs_refund` (목록에 「정정(환불)」, `refund_due`)
- 화면의 `chargeRows()`는 `/billing/visit/:id/items`가 준 `billed_items`(이미 청구된 코드별 수량·금액)를 **코드·수량 단위로 빼서** 새로 청구할 줄만 만듭니다. 진료비는 금액 차이만큼(진료 종류를 올렸을 때 차액).
- 새로 청구할 게 없으면(이미 다 받음) 확정 버튼 대신 「이미 수납 완료」가 뜹니다 — 0원 영수가 생기지 않게(v1.0.1 수정).
- 주의: `billed_total`은 **할인 전** 금액이라, 할인해 준 내원도 항목이 그대로면 아무 표시가 없습니다(의도된 동작).

### 3.3 이월 (이전 미수를 새 영수로 넘기기) — `016_billing_carryover.sql`

- 새 영수의 `total_due`에 `previous_balance`를 더해 받으면, 서버가 **오래된 영수부터** 그 금액 안에 **통째로 들어가는** 것만 골라 `outstanding=0`, `carried_into_id=<새 영수 id>`로 바꿉니다(`POST /`의 끝부분).
- 옛 영수의 `amount_paid`는 그대로 둡니다 — 그날의 현금 합계가 바뀌지 않게.
- 새 영수를 취소하면 `restoreCarried()`가 옛 영수들의 `outstanding`을 `total_due − amount_paid`로 되돌리고 `carried_into_id`를 지웁니다(`restoreCarried()`). 정정은 되돌리지 않고 새 영수로 **옮깁니다**(3.6).
- 그래서 **한 환자의 미수 = Σ `outstanding`** (취소 제외)이 정답입니다. `Σ(total_due − net_paid)`로 세면 이월분이 옛 영수와 새 영수 양쪽에 잡힙니다 — 서버 주석(`/patient/:id/balance`)에도 적혀 있습니다. 통계도 2026-09-29부터 `outstanding`으로 셉니다(7절 H5).

### 3.4 미수 수납 — `POST /api/billing/:id/pay`

- 그 영수의 `amount_paid += 받은 금액`, `outstanding = (total_due − net_paid) − 받은 금액`, 0.5 이하가 남으면 `paid` 아니면 `partial`.
- `FOR UPDATE` 행 잠금으로 두 창구가 동시에 받아도 한쪽이 사라지지 않게 했습니다.
- 받은 돈은 **원래 영수의 날짜(`billing_date`)** 에 붙습니다. 별도의 입금 기록 테이블은 없습니다(7절 M2).
- `cashier_id`는 이번에 받은 사람으로 **덮어씁니다** — 처음 수납한 사람 기록은 사라집니다.

- **이월된 영수에는 받지 않습니다**(2026-09-29, M1): `carried_into_id`가 있는 영수(그 빚이 이미 뒤의 영수로 넘어간 것)는 409 `BILL_CARRIED: <그 영수번호>`. 이런 영수는 `outstanding`이 0이지만 위 계산(`total_due − net_paid`)으로는 옛 금액이 남아 보여서, 예전에는 같은 빚을 두 번 받을 수 있었습니다. 계산식 자체는 그대로입니다. 화면은 `py_payCarried` 안내를 띄우고 영수내역을 새로 불러옵니다.

### 3.5 취소와 재수납

- `PUT /:id/void` — `payment_status='cancelled'`, `outstanding=0`, 취소 시각·사람·사유 기록, 이 영수가 흡수한 이월을 되돌림. 취소된 영수는 모든 합계에서 **없던 일**로 빠집니다.
- **이월된 옛 영수는 혼자 취소하지 못합니다**(2026-09-29, M4): `carried_into_id`가 있으면 409 `BILL_CARRIED: <뒤 영수번호>`. 뒤 영수의 `total_due`가 그 빚을 아직 청구하고 있어서, 옛 영수만 취소하면 빚이 출처 없이 남기 때문입니다. 뒤 영수를 먼저 취소하면(옛 영수의 미수가 되살아남) 그다음 옛 영수를 취소할 수 있습니다. 화면은 사유를 묻기 전에 `py_voidCarried`로 먼저 취소할 영수번호를 안내합니다. `carried_into_id`는 항상 살아 있는 영수를 가리킵니다 — 그 영수를 취소하면 지워지고, 정정하면 새 영수로 옮겨지기 때문입니다.
- 취소만 되고 살아 있는 영수가 없는 내원은 날짜와 상관없이 **수납 대기**에 「정정 재수납」(`needs_rebill`)으로 다시 뜹니다. `needs_rebill`은 「취소 영수가 있고 **살아 있는 영수가 없음**」입니다 — 정정한 내원도 취소 영수를 갖지만 새 영수가 살아 있으므로 해당하지 않습니다(2026-09-29 수정: 정정 뒤 미수가 남은 내원이 「정정 재수납」으로 잘못 뜨던 것).
- 재수납 화면은 마지막 취소 영수의 `net_paid`(`prior_paid`)를 **받은 금액 칸에 미리 넣어** 같은 돈을 두 번 받지 않게 합니다(`selectVisit()`). 취소할 때 돈을 실제로 돌려줬는지는 기록하지 않으므로, 직원이 판단해서 지워야 합니다.

### 3.6 정정(환불) — 서버 `buildCorrection()` (2026-09-29, H2)

내원의 살아 있는 영수들을 **지금 금액의 영수 한 장으로 바꿉니다.** 계산은 전부 서버가 DB에서 하고(`billing.routes.js` `buildCorrection()`), 화면은 그 결과를 보여주고 돌려보내기만 합니다.

**규칙 (2026-09-29 실장님 결정)** — 바꿀 영수들을 A₁…Aₙ이라 하면:

| 새 영수 | 값 |
|---|---|
| 항목 | 지금의 진료비(`/pending`과 같은 `price_clinic`) + 원내 처방 + 오더 + **A들에 있던 발급비(`item_type='fee'`) 그대로** |
| `subtotal` | 위 항목의 합 |
| `discount_amount` | Σ Aᵢ.`discount_amount` (새 소계보다 크면 소계까지) — **할인 유지** |
| `previous_balance` | Σ Aᵢ.`previous_balance` — **이월 유지** |
| `total_due` | `max(0, subtotal − discount + previous_balance)` |
| `amount_paid` | Σ Aᵢ.`net_paid` — 이 내원에서 **실제로 가진 돈** |
| 가진 돈 ≥ 총액 | `change_amount` = 가진 돈 − 총액 = **지금 돌려줄 환불액**, `outstanding` 0, `paid` → `net_paid = total_due` |
| 가진 돈 < 총액 | `change_amount` 0, `outstanding` = 총액 − 가진 돈, 가진 돈 > 0이면 `partial` 아니면 `unpaid` |

**처리 순서** (`POST /visit/:visitId/correct`, 한 트랜잭션, 환자 잠금 안):
1. 지금 DB로 다시 계산하고, 화면이 보여준 `expected_active_bill_ids` · `expected_refund` · `expected_outstanding`과 다르면 409 `BILL_CHANGED` — **직원이 본 환불액과 다른 금액이 기록되지 않게.**
2. A들을 `cancelled`로(사유 = 요청의 `reason`).
3. 새 영수 발행(비고 `correction of R-… · refund N`), 항목 저장.
4. A들이 흡수했던 옛 영수들의 `carried_into_id`를 **새 영수로 옮김** — 되돌리지 않음. 새 영수가 그 이전 미수를 그대로 청구하기 때문입니다. (예전에는 되돌려서 옛 빚이 다시 살아났고, 그 빚을 갚은 돈은 환불액으로 잡혔습니다.)

**거절되는 경우**: A 중 하나가 이미 다른 영수로 이월됐으면(`carried_into_id` 있음) 409 `BILL_CARRIED: <그 영수번호>`. 그 영수가 이미 이 내원의 미수를 청구하고 있으므로, 그것을 먼저 취소해야 합니다.

**매출 날짜**: A들은 취소되어 원래 날짜의 매출에서 빠지고, 새 영수가 **오늘** 날짜로 전액을 가집니다(예전 방식도 같았음 — M2와 같은 종류의 문제).

**왜 서버로 옮겼나**: 예전 화면은 「전부 취소」와 「새 영수」를 두 요청으로 보냈습니다. 둘째가 실패하면(환불액이 새 금액보다 크면 서버가 거절) 영수 없이 취소만 남았고, 화면이 스스로 계산한 금액이 할인·발급비·이월을 빠뜨렸습니다.

### 3.7 영수번호

`R-YYYYMMDD-NNNN`, 그날 안에서 순번. `pg_advisory_xact_lock`으로 번호 배정을 줄 세워 두 창구가 같은 번호를 받지 않습니다(`nextReceiptNo()` — 수납과 정정이 같이 씀). 예전의 무작위 4자리는 하루 110장쯤에서 충돌했습니다.

### 3.8 서버의 입력 검사 (`POST /api/billing`)

음수 금액, 소계보다 큰 할인, 받은 돈보다 큰 거스름, 모르는 상태값을 400으로 거절합니다. `visit_id`가 `patient_id`의 내원이 아니면 400.

**금액끼리 맞아야 합니다** (2026-09-29, H4) — 0.5 Ar까지 허용:
- `change_amount = max(0, amount_paid − total_due)`
- `outstanding = max(0, total_due − (amount_paid − change_amount))`
- `unpaid`면 `amount_paid = 0`, `paid`면 `outstanding = 0`, `partial`이면 미수도 있고 받은 돈도 있어야 함

예전 화면의 「미수 처리」는 `amount_paid 0`에 `outstanding = 총액 − 칸의 숫자`를 보냈는데, 이제 이런 요청은 400입니다. **총액이 항목과 맞는지는 아직 검사하지 않습니다**(7절 M3).

### 3.9 중복 수납 막기 (2026-09-29, H1)

두 겹으로 막습니다.

- **화면** — 돈을 쓰는 버튼(수납 확정 · 미수 처리 · 정정 · 미수 수납 · 전체 미수 수납 · 영수취소)은 모두 `once()`를 거칩니다(`Payment.jsx`). 요청 하나가 끝날 때까지 다른 요청을 받지 않고 버튼을 흐리게 합니다. 막는 것은 `useRef` 값이고 state는 표시용입니다 — 다음 렌더 전에 처리되는 두 번째 클릭은 state를 아직 못 보기 때문입니다.
- **서버** — `GET /visit/:visitId/items`가 그 내원의 살아 있는 영수 id 목록 `active_bill_ids`를 주고, 화면은 수납할 때 그것을 `expected_active_bill_ids`로 돌려보냅니다. 서버는 **환자 단위 잠금**(`pg_advisory_xact_lock(hashtext('billing_patient'), patient_id)`) 안에서 지금 목록과 비교해 다르면 **409 `BILL_CHANGED: …`** 로 거절합니다. 두 번째 클릭, 다른 창구, 오래 열어 둔 화면이 모두 여기서 걸립니다. 필드가 없는 요청(옛 화면)도 409입니다.
- **이전 미수** — 같은 잠금 안에서 `previous_balance`가 지금 넘길 수 있는 미수(취소 안 됨 · 이월 안 됨 · `outstanding>0`의 합)보다 크면 409. 같은 환자의 두 내원이 같은 옛 빚을 동시에 넣던 문제(M3의 일부)를 막습니다.
- 영수취소(`/:id/void`), 정정(`/visit/:id/correct`), 미수 수납(`/:id/pay`)도 같은 환자 잠금을 겁니다. 이월 금액이 수납과 동시에 바뀌지 않게.
- 화면은 `BILL_CHANGED`로 시작하는 오류를 받으면 `py_billChanged` 안내를 띄우고 선택을 풀고 목록을 새로 불러옵니다.

### 3.10 영수증 (2026-09-29, H3 — 실장님 결정: 제대로 · 항상 프랑스어 · A4)

- **부품**: `frontend/src/components/Receipt.jsx` — `ReceiptDoc`(인쇄되는 A4 한 장), `ReceiptModal`(미리보기 + 인쇄 단추). 수납 직후(`doConfirmNow`·`confirmCorrectionNow`가 새 영수의 `id`를 넘김)와 재출력(`reprint(b)`)이 **같은 `ReceiptModal`** 을 씁니다.
- **금액은 저장된 영수에서만** 읽습니다: `GET /api/billing/:id/detail`(영수 · 항목 · 이월 출처). 화면이 계산한 값은 쓰지 않습니다 — 예전 수납 직후 영수증이 빈칸·0 Ar였던 원인(탭이 바뀌며 화면 선택이 지워짐)이 구조적으로 없어졌습니다.
- **병원 정보**: `GET /api/admin/clinic`(로그인만 확인). 머리말은 문서 엔진의 `ClinicHeader`(`documents/shared.jsx`, 진료 주관 — **고치지 않고 가져다 씀**): 프랑스어 이름(`name_fr` → `name_en` → `name`), 주소 · 전화 · 이메일(빈 값은 안 나옴).
- **언어**: `RECEIPT_LANG = 'fr'`. 글자는 문서 엔진처럼 `{ ko, en, fr }` 표(`RL` · `STATUS` · `VISIT_TYPE`)에 두고 프랑스어로만 그립니다 — 번역 파일(`i18n`)이 아니라 부품 안에 둔 이유: 화면 언어를 따르지 않는 인쇄물이고, 문서 엔진의 다른 양식도 같은 방식이기 때문입니다. 미리보기 창의 단추(닫기·출력)만 화면 언어입니다.
- **용지**: `RECEIPT_PAGE = { size: 'A4', widthPx: 688 }` 한 곳에서 정합니다. 인쇄는 `printDocument()`(새 창, `@page{size:A4;margin:14mm}`). 80mm로 바꾸려면 이 상수와 전용 인쇄 창이 필요합니다(`printDocument`는 A4 고정) — 만들지 않음(결정).
- **쪽 나눔**: 항목표 머리줄은 쪽마다 반복(`thead`), 줄은 쪼개지지 않음. 합계 덩어리는 `break-inside: avoid`라 **통째로** 다음 쪽으로 넘어가고, 맨 위에 「영수번호 · 환자」가 작게 붙습니다(떨어진 쪽이 어느 영수증인지 알게).
- **영수증에 나오는 것**: 제목 REÇU · N° de reçu · 일시(`billing_date` + `created_at` 시각) · Caissier · (취소) ANNULÉ 상자: 취소 일시 · 취소한 직원 · 사유 · (정정) Remplace le(s) reçu(s): 비고의 `correction of R-…`에서 · Patient · N° dossier · 진료일 · 진료 종류 · Service(과 프랑스어 이름 + 의사, 없으면 칸째 숨김) · 항목표(Désignation · Code · Qté · Prix unitaire · Montant; 항목이 없고 이전 미수가 있으면 「Règlement du solde antérieur」 — M2 미수 수납 영수를 위해) · Sous-total · Remise(>0) · Solde antérieur(>0, 이월 출처 영수번호·날짜) · **Total à payer** · Montant remis(받은 돈 ≠ 실제 받은 돈일 때; 정정 영수는 **Déjà encaissé**) · Monnaie rendue(정정 영수는 **Remboursé au patient**) · Montant encaissé(`net_paid`) · **Reste à payer**(>0) · Statut(Payé · Paiement partiel · Impayé · Annulé; 미수가 다음 영수로 넘어갔으면 **Reporté**) · 「Solde reporté sur le reçu R-… du …」 · Merci de votre confiance.
- **아직 없는 것**(현지 확인 필요, 인계 노트 참고): NIF/STAT 번호, 로고, 금액 글자 표기, 서명란. 숫자는 **프랑스어 표기 `15 000 Ar`**(줄바꿈 없는 공백, 영수증 안에서만 — 화면은 `15,000`), 날짜는 다른 문서와 같은 `YYYY-MM-DD`. 인쇄 창을 브라우저가 막으면 `printDocument(…, 'fr')`로 **프랑스어** 안내가 뜹니다(진료 세션이 `printDocument`에 언어 인자를 추가, 2026-09-29).

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Payment.jsx` — 수납 화면 전체.
- `frontend/src/components/Receipt.jsx` — 영수증(수납 전용, 2026-09-29 새로 만듦). 3.10.

### 서버 — `backend/src/routes/billing.routes.js` (`/api/billing`)

**권한**(2026-09-29, M5): 모든 경로에 수납 권한(`payment`)이 필요합니다(`canPay`). 예외는 `GET /patient/:patientId/balance` 하나로, `payment` 또는 `registration`이면 됩니다(`canSeeBalance`) — 접수 화면(`Registration.jsx`)이 환자의 미수를 보여주기 때문입니다. 권한이 없으면 403. 메뉴가 막혀 있어도 API는 열려 있었기 때문에(의사·검사실 계정도 영수 취소 가능) 넣었습니다. 기본 역할 중 `frontdesk`와 `admin`은 `payment`를 가집니다.


| 메서드 · 경로 | 하는 일 |
|---|---|
| `GET /pending` | 수납 대기 목록. 오늘 진료 끝났고 `paid`/`waived` 영수가 없는 내원 + 취소만 남은 내원(날짜 무관) + 금액이 달라진 내원(날짜 무관). 줄마다 `previous_balance`, `needs_rebill`, `prior_paid`, `needs_additional`, `needs_refund`, `extra_due`, `refund_due`, `active_bill_id`, `active_paid` |
| `GET /completed?date=` | 그날(`billing_date`, 기본 오늘) 영수 전부 — **취소된 것도 포함** |
| `GET /:billingId/detail` | 영수 1장 + `billing_item` + `carried_from`(이 영수가 미수를 넘겨받은 옛 영수: `receipt_no` · `billing_date` · `amount`). 영수에는 `dept_name_fr` · `cancelled_by_name` · `carried_into_receipt_no` · `carried_into_date`도 붙음(영수증용, 2026-09-29) |
| `GET /visit/:visitId/items` | 청구할 원내 처방·오더, `visit_type`, 이미 청구된 코드별 합계 `billed_items`, `billed_consult`, 살아 있는 영수 id `active_bill_ids` |
| `POST /` | 영수 만들기 + 항목 + 이월 흡수 (트랜잭션). **`expected_active_bill_ids` 필수** — 다르면 409 `BILL_CHANGED` (3.9) |
| `GET /patient/:patientId/history?from&to` | 환자의 모든 영수(취소 포함) |
| `PUT /:billingId/void` | 영수 취소 `{reason}` |
| `GET /visit/:visitId/correction` | 정정하면 기록될 새 영수 미리보기 (DB는 안 바꿈). `items`, `subtotal`, `discount_amount`, `previous_balance`, `total_due`, `paid_so_far`, `refund`, `outstanding`, `payment_status`, `active_bill_ids`, `replaces`. 이월된 영수면 409 `BILL_CARRIED` |
| `POST /visit/:visitId/correct` | 정정 실행 `{expected_active_bill_ids, expected_refund, expected_outstanding, reason}` (3.6). 201 + 새 영수(`refund` 포함) |
| `GET /patient/:patientId/balance` | `{owed: Σ outstanding, refund: Σ max(net_paid − total_due, 0)}` (취소 제외) |
| `POST /:id/pay` | 미수 수납 `{amount}` |

그 밖에 수납 화면이 부르는 것: `GET /api/admin/order-codes?code_type=fee`(진료비 C01~C04 가격과 발급비 목록), `PUT /api/visits/:id`(진료 종류 저장).

### 공용 부품

- `frontend/src/components/PatientChart.jsx` — **수납 주관**, 수납·약국이 씀. 읽기 전용 과거 진료 패널: `GET /api/patients/:id/history`(진료 목록) → 누르면 `GET /api/consultations/:id/prescriptions`, `/orders`로 그날 노트·바이탈·처방·오더를 보여줌. 돈과는 관계없음. 오더 줄의 상태는 진료 화면(`Consultation.jsx` `orderStatus`)과 **같은 규칙·같은 글자**(`cs_lab*`·`cs_ws*` 키): 검사(lab)는 결과 대기/결과 있음/취소, 영상 워크리스트로 보낸 오더는 전송 전/전송됨/촬영 중/촬영 완료/취소, 그 밖의 오더는 표시 없음 — 워크리스트가 없는 오더는 처음부터 `worklist_status='completed'`로 저장되어, 예전처럼 그대로 보이면 결과 없는 검사에 영어 「completed」가 붙었음(2026-09-29, PACS 세션 부탁).
- `DocumentModal.jsx`(진료 주관) — 수납 화면에서 `category="document"` · `"prescription"` · `"chart"(readOnly)`로 3번 씀.
- `PatientFinder.jsx`(접수 주관) — `mode="visit"`로 다른 날 내원을 찾아 수납.
- `RadiologyReadings.jsx`(PACS 주관) — 판독 소견 창.

### DB 테이블

**`billing`** (`001_schema.sql:245-276` + `006` · `016` · `017`)

| 컬럼 | 뜻 |
|---|---|
| `id`, `visit_id`(NOT NULL), `patient_id` | |
| `receipt_no` UNIQUE | `R-YYYYMMDD-NNNN` |
| `billing_date` DATE 기본 `CURRENT_DATE` | 통계의 날짜 기준. DB 시간대는 `.env`의 `TZ` |
| `consult_fee`, `drug_total`, `procedure_total`, `subtotal`, `discount_amount`, `discount_type`, `discount_value`, `previous_balance`, `total_due`, `amount_paid`, `change_amount`, `outstanding` | 3.1절 |
| `net_paid` | 생성 컬럼 `amount_paid − change_amount` (017) |
| `payment_method` | 기본 `cash`. 화면이 쓰지 않음 |
| `payment_status` | `waiting·paid·partial·unpaid·waived·cancelled` (006의 CHECK, `utils/validate.js`의 `PAYMENT_STATUSES`와 같아야 함) |
| `note`, `cashier_id` | |
| `cancelled_at`, `cancelled_by`, `cancel_reason` | 006 |
| `carried_into_id` → `billing(id)` | 이 영수의 미수를 흡수한 새 영수 (016) |
| 인덱스 | `patient_id`, `billing_date`, `payment_status`, `carried_into_id`. **`visit_id` 인덱스 없음** |

**`billing_item`** — `billing_id`(CASCADE), `item_type`(`consultation`·`drug`·오더의 `code_type`·`fee`), `item_name`, `item_code`, `quantity`, `unit_price`, `total_price`.

**읽기만 하는 테이블** — `visit`, `consultation`, `prescription`(`dispense_type`), `order_item`, `order_code`(`code_type='fee'`: C01~C04 진료비와 DOC·CDR·CERT 발급비, `005_cashier_fees.sql`), `patient`, `department`, `staff`.

### 금액 규칙의 역사 (마이그레이션)

| 파일 | 무엇 · 왜 |
|---|---|
| `005_cashier_fees.sql` | 발급비 코드 DOC 5,000 · CDR 10,000 · CERT 8,000 추가 |
| `006_billing_void.sql` | `cancelled` 상태와 취소 기록 컬럼 — 영수를 지우지 않고 취소 |
| `009_unify_price.sql` | `price`와 `price_clinic`을 같은 값으로 맞춤(단일 가격). 코드는 여전히 `price_clinic` 우선 |
| `016_billing_carryover.sql` | 이월된 미수가 두 번 청구되던 문제 → `carried_into_id` |
| `017_billing_net_paid.sql` | 건넨 돈(`amount_paid`)을 매출로 세던 문제 → `net_paid` |

## 5. 다른 모듈과의 연결

- **진료 → 수납**: 진료 완료(`PUT /api/consultations/:id/complete`)가 `visit.status='completed'`로 바꾸면 수납 대기에 뜹니다. 수납 뒤 진료실이 처방·오더를 고치면 추가 청구/정정 표시로 나타납니다(진료실의 처방·오더 삭제는 행을 지웁니다 — `consult.routes.js:187,302`).
- **약국**: 원외 처방(`dispense_type='external'`)은 수납에서 청구하지 않습니다. 약국 서버(`pharmacy.routes.js`)는 `billing`을 읽지 않으므로 수납 전에도 조제할 수 있습니다 — 그래야 하는지는 확인 필요.
- **접수**: `Registration.jsx:66`이 `GET /api/billing/patient/:id/balance`로 환자의 미수/환불 예정을 보여줍니다. `visit.routes.js`의 `GET /api/visits/patient/:id`가 내원마다 최신 영수 상태·번호·총액을 붙여 줍니다. `patient.routes.js`의 `GET /api/patients/:id/billing-history`도 있으나 화면에서 쓰는 곳은 없습니다.
- **통계** (`stats.routes.js`, 모두 `payment_status <> 'cancelled'`):
  - 매출 합계·진료과별·의사별·월별 = `SUM(net_paid)`, 날짜는 `billing_date` (`stats.routes.js:57-93,148-152`). 과는 `visit.department_id`, 의사는 `visit.doctor_id`.
  - 그로스 = `SUM(consult_fee+drug_total+procedure_total)`; 발급비 매출 = `billing_item.item_type='fee'`의 합.
  - 취소 건수 = `cancelled_at` 날짜 기준.
  - 미수·환불 요약과 명단 = 영수마다 미수 `GREATEST(outstanding,0)`, 환불 `GREATEST(net_paid − total_due,0)` — **수납 화면의 `/patient/:id/balance`와 같은 공식**(통계 세션 `52c4505`, develop에 합쳐짐). 예전에는 `total_due − net_paid`라 이월된 빚이 두 번 잡혔습니다(7절 H5).
  - 그래서: 이월된 돈은 새 영수 날짜의 매출로, 미수 수납은 **원래 영수 날짜**의 매출로 잡힙니다.
- **설정**: 진료비(C01~C04)와 발급비는 설정 > 오더 코드에서 `code_type='fee'`로 관리합니다.

## 6. 설정 항목

- **직원 권한** — 수납 화면과 수납 API(`/api/billing`)는 **`payment` 권한**(설정 → 👥 Staff → 권한의 「💳 수납」)이 있어야 씁니다. 환자 잔액(`GET /patient/:id/balance`)만 `registration`으로도 읽힙니다(4절). 기본 역할 중 `frontdesk`·`admin`이 이 권한을 가지므로, 역할을 바꾸거나 권한을 직접 고른 계정은 확인이 필요합니다. 2026-09-29 기준 운영 DB에는 `payment` 권한 계정이 관리자 2개뿐이었습니다(총괄 확인, 시험 계정) — **현장 수납 계정을 만들 때 꼭 체크.**
- **진료비** — 오더 코드 `C01` 초진 · `C02` 재진 · `C03` 응급 · `C04` 의뢰의 가격(`price_clinic`). 코드를 못 읽으면 화면은 하드코딩 값(15,000 · 10,000 · 25,000 · 12,000, `Payment.jsx:10`)을 쓰고, 서버 `/pending`은 0으로 봅니다(7절 L3).
- **발급/기타 항목** — `code_type='fee'`이고 C01~C04가 아닌 활성 코드가 **+ 항목 추가** 목록에 나옵니다.
- **약값** — 처방 시점에 `prescription.unit_price`로 복사된 값. **오더 가격** — `order_item.unit_price`.
- **영수증 머리말** — 설정 → 병원 정보(Clinic)의 프랑스어 이름(없으면 영어·기본 이름)·주소·전화·이메일(3.10). 빈 칸은 영수증에 안 나옵니다. NIF/STAT 같은 칸은 아직 없습니다.
- 시간대 — `.env`의 `TZ`(기본 `Indian/Antananarivo`)가 `billing_date`·영수번호 날짜를 정합니다.

## 7. 알려진 문제 · 제약

2026-09-29 현황 파악. 이 절의 `파일:줄`은 현황 파악 커밋 `d5e7163` 기준입니다(그 뒤 코드가 바뀜). **「재현」** 은 격리 스택(9183)에서 화면과 같은 요청을 보내 숫자를 확인한 것, **「코드」** 는 코드를 읽고 판단한 것(아직 재현 안 함)입니다. 재현 스크립트: 인계 노트 참고.

### 높음

- ~~**H1 중복 수납이 막혀 있지 않음**~~ — **고침(2026-09-29, 3.9)**. 원래 문제: `Payment.jsx:178-199` `doConfirm()`에 처리 중 잠금이 없고, 서버 `POST /`(`billing.routes.js:147`)도 같은 내원의 중복을 확인하지 않습니다. 1.4.0의 버튼 눌림 효과는 모양만 바꿉니다. **재현**: 15,000 내원에 확정 요청 2건 → 영수 2장(R-…-0001, -0002), 매출 30,000. 그 뒤 목록에 「정정(환불) 15,000」으로 뜨지만, 그 정정 처리가 다시 H2로 틀립니다. 같은 문제: 미수 수납 `settleConfirm`·`settleAll`(`Payment.jsx:252-280`)도 잠금 없음 — 부분 금액이면 두 번 기록됨(코드).
- ~~**H2 정정(환불) 처리가 금액을 잘못 기록**~~ — **고침(2026-09-29, 3.6)**. 같은 시나리오 재실행 결과: 가 → `net_paid` 15,000·통계 미수 0 / 나 → `unpaid` 미수 15,000 / 다 → 환불 2,000, 옛 미수는 새 영수에 이월된 채 유지 / 라 → 할인 유지 / 마 → 한 트랜잭션이라 해당 없음. 원래 문제: `Payment.jsx:211-233`. 모두 **재현**:
  - (가) 받은 금액을 `amount_paid = 지금 금액`, `change_amount = 환불액`으로 저장 → `net_paid = 지금 금액 − 환불액`. 17,000 받은 내원에서 약 2,000 삭제 → 새 영수 `net_paid` 13,000(맞는 값 15,000), 통계 미수 2,000.
  - (나) 한 푼도 안 받은(미수) 영수도 정정하면 **전액 받은 것(`paid`)** 으로 기록 → 미수 17,000이 사라지고 받지 않은 15,000이 매출로 잡힘.
  - (다) 이월을 흡수한 영수를 정정하면 옛 미수 10,000이 **다시 살아나는데**, 그 10,000을 받은 돈은 **환불액에도 들어감** → 화면 환불 12,000(맞는 값 2,000), 수납 화면 미수 10,000, 통계 미수 22,000.
  - (라) 할인이 사라짐 — 새 영수는 할인 없이 발행되고 환불액은 할인 전 금액과 비교(코드).
  - (마) 환불액이 새 금액보다 크면 서버가 400으로 거절하는데, 이때 **기존 영수는 이미 취소된 뒤**라 내원이 영수 없이 남음(코드).
- ~~**H3 수납 직후 영수증이 비어서 나옴**~~ — **고침(2026-09-29, 3.10, 실장님 결정)**: 저장된 영수에서 읽는 영수증 부품 하나로 바꿈. 화면에서 20,000 받고 16,800 수납 → 환자·총액 16,800·거스름 3,200이 나옴. 원래 문제: 확정 후 `setTab('completed')`(`Payment.jsx:197`)가 탭 변경 효과(`:68`)로 선택 환자를 지우는데, 영수증 창(`:388-390`)은 그 선택 환자와 화면 계산값을 읽습니다. **재현(화면, 프랑스어)**: 16,800 Ar 수납에 20,000 받음 → 영수증 Patient·Chart 빈칸, Total **0 Ar**, Paid 20,000, 거스름 없음. DB 기록은 맞습니다(16,800).
- ~~**H4 「미수 처리」 때 받은 금액 칸의 숫자가 미수에서 빠짐**~~ — **고침(2026-09-29, 3.8)**: 같은 시나리오에서 미수 15,000, 옛 화면 본문은 400. 원래 문제: `Payment.jsx:193-194`: `amount_paid`는 0으로 보내면서 `outstanding`은 `총액 − 칸의 숫자`. **재현**: 15,000 내원, 칸에 4,000 → 미수 처리 → `outstanding` 11,000(맞는 값 15,000). 수납 화면은 11,000, 통계는 15,000으로 서로 다름. 재수납 화면은 칸이 미리 채워지므로(3.5) 특히 잘 생깁니다.
- ~~**H5 통계의 미수가 이월된 빚을 두 번 셈**~~ — **통계 세션이 고침(`52c4505`, develop)**. develop을 합친 뒤 같은 시나리오(S3·S6·S9)에서 수납 화면과 통계가 모두 0으로 일치함을 확인. 원래 문제: `stats.routes.js:108-111,164-176`이 `total_due − net_paid`로 셉니다. **재현**: 1차 미수 15,000을 2차 내원에서 이월 포함 전액 수납 → 수납 화면 미수 0, 통계 미수 15,000(명단에도 올라감). **통계 세션 파일**이라 고치지 않고 부탁으로 남깁니다.

- ~~**H6 발급비를 받은 내원이 모두 「정정(환불)」로 뜸**~~ — **고침(2026-09-29, 3.2, 실장님 결정 (가))**. 같은 내원 전후: 발급비만 → 목록에서 빠짐 / 발급비 + 약 2,000 삭제 → 「정정 10,000」이 「정정 2,000」 / 발급비 + 약 3,000 추가 → 「정정 5,000」이 「추가 청구 3,000」 / 진료실이 fee 코드 오더 → 전후 모두 표시 없음(정정 미리보기에서도 한 번만 셈). 원래 문제: **재현(2026-09-29)**: 진료비 15,000 + 진단서 8,000 수납 → 대기 목록에 「환불 예정 8,000」으로 다시 뜸, 날짜와 상관없이 계속. `/pending`의 `billed_total`은 `procedure_total`(발급비 포함)을 쓰는데 `live_total`에는 발급비가 없기 때문입니다. 3.6의 새 정정은 발급비를 유지하므로 **돈이 잘못 나가지는 않습니다**(환불 0 · 「차액 없음」). 그러나 목록이 거짓 표시로 쌓입니다. 고치려면 `billed_total`에서 발급비 항목을 빼야 함 — **실장님 결정 대기**. 실행 중 EMR에는 해당 내원 0건(2026-09-29 총괄 조회). 선택지는 인계 노트 「결정용 자료」.

### 보통

- ~~**M1 이미 이월된 영수에 미수 수납이 됨**~~ — **고침(2026-09-29, 3.4)**: 409 `BILL_CARRIED`. 원래 문제: `/pay`(`billing.routes.js:360-376`)가 `outstanding` 컬럼이 아니라 `total_due − net_paid`로 남은 돈을 계산하고 `carried_into_id`를 보지 않습니다. **재현**: 이월된 영수에 15,000 수납 → 200 OK, 같은 빚을 두 번 받음. 화면 버튼은 `outstanding`을 보므로 보통은 안 뜨고, 오래 열어 둔 화면·API로만 가능.
- **M2 미수 수납한 돈이 받은 날이 아니라 원래 영수 날짜의 매출로 잡힘** — 입금 기록 테이블 없이 원래 영수의 `amount_paid`를 올립니다(`billing.routes.js:380-384`). 오늘 받은 돈이 오늘 매출에 없고 지난 날 매출이 나중에 바뀌어, **하루 현금 마감과 맞지 않습니다**. 이월로 받은 돈은 반대로 새 영수 날짜에 잡혀 두 경로가 다릅니다. 받은 사람(`cashier_id`)도 덮어씀. 설계 결정 필요(코드).
- **M3 서버가 금액을 다시 계산하지 않음** — `total_due`·`outstanding`을 화면 값 그대로 저장(코드). 이 중 「이전 미수가 두 영수에 다 들어가는」 경우는 H1 수정에서 막음(3.9).
- ~~**M4 이월된 옛 영수를 취소해도 새 영수에 그 빚이 남음**~~ — **고침(2026-09-29, 3.5)**: 409 `BILL_CARRIED`, 뒤 영수번호 안내. 원래 문제: 취소(`billing.routes.js:283-306`)가 `carried_into_id`가 있는 영수를 막지 않습니다(코드).
- ~~**M5 수납 API에 권한 검사 없음**~~ — **고침(2026-09-29, 4절)**: 의사 계정 403, 접수 전용 계정은 잔액만 200, 수납 계정 200 확인. 원래 문제: `billing.routes.js:8`은 로그인만 확인. 메뉴는 막혀 있지만 의사·검사실 계정도 API로 영수 취소·수납이 가능합니다. 접수 화면이 `balance`를 읽으므로 그 한 곳은 접수 권한도 허용해야 합니다(코드).
- **M8 목록의 「환불 예정」 금액이 실제 환불과 다를 수 있음** — 목록의 `refund_due`는 「줄어든 항목 금액(할인 전)」이고, 실제 환불은 정정 화면의 금액(3.6)입니다. 덜 받았던 환자는 환불이 아니라 미수가 줄어듭니다(화면 확인: 목록 「환불 예정 2,000」, 정정 화면 「미수 4,000」). 2절에 직원용 안내를 적어 둠.
- **M6 재수납 금액의 근거가 약함** — `prior_paid`는 마지막 취소 영수 1장만 봅니다(`billing.routes.js:44`). 추가 청구 영수까지 여러 장 취소했으면 일부만 채워짐. 취소 때 돈을 돌려줬는지 기록하지 않음(코드).
- ~~**M7 영수증이 현장에 맞지 않음**~~ — **고침(H3와 함께)**: 병원 정보는 설정에서, 프랑스어, 항목·할인·거스름·미수, 재출력도 같은 모양. 원래 문제: 병원명·주소 하드코딩(`Payment.jsx:388`, 설정의 병원 정보를 안 씀), 글자가 영어 고정(Receipt·Date·Patient·Total·Paid·Thank you), 첫 영수증에 항목이 없음, 재출력(`:437-438`)에 할인·거스름·미수가 없음.

### 낮음

- **L1 번역 안 된 글자** — `'Amount insufficient'`(`:179`), `'+ Outstanding:'`(`:332`), `'No items'`(`:601`), `Code`·`Date`·`Status`(`:582,586`), 상태 배지가 `paid`·`partial` 영어 그대로(`:282-285`, `cancelled`는 주황으로 나옴). 화면 전용 글자 몇 개는 번역 파일이 아니라 `L` 객체 안의 삼항식(`:48-65`). 프랑스어에서 「미수 처리」 버튼과 「미수금」 표시가 둘 다 `Impayé`.
- **L2 진료비 기본값이 화면과 서버에서 다름** — C01~C04를 못 읽으면 화면은 15,000 등(`Payment.jsx:10,127`), 서버 `/pending`은 0(`billing.routes.js:28-30`) → 거짓 정정 표시(코드상, 코드를 비활성화했을 때만).
- ~~**L3 `total_qty = 0`인 처방**~~ — **고침(2026-09-29)**: 수납이 `total_qty`만 읽음(3.1). 원래 문제: 화면은 `dose×frequency×days`로 대신 계산(`:129`), 서버는 0(`billing.routes.js:31`)(코드).
- **L4 진료 종류 저장이 수납보다 먼저** — `:187`. 수납이 실패해도 내원 종류는 이미 바뀜.
- **L5 `billing(visit_id)` 인덱스 없음** — `/pending`이 내원마다 `visit_id`로 여러 번 찾습니다. 데이터가 쌓이면 느려짐(코드).
- **L6 「수납 완료」 개수에 취소 영수 포함** — `/completed`가 상태를 거르지 않음.
- **L7 미수·부분 수납한 오늘 내원이 수납 대기 목록에 계속 남음** — 누르면 「이미 수납 완료」로 뜸(`billing.routes.js:58-59`, `Payment.jsx:301-302`)(코드). 정정 결과가 미수·부분 수납이면 그 내원도 같은 식으로 남습니다(화면 확인, 배지는 「대기」).
- **L8 쓰이지 않는 코드** — `refundDue()`(`:166`), `Section`(`:600`), 할인 `percent` 경로.
- **L9 좁은 화면** — 1400px 폭에서 가운데 합계 상자 오른쪽이 잘림(화면 확인).
- **L10 `restoreCarried`가 `amount_paid` 기준** — 나머지는 `net_paid` 기준. 거스름이 있는 영수는 미수가 없어 이월되지 않으므로 지금은 결과가 같음.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 현황 파악: 1~7절 작성, 문제 목록(재현 포함). 코드 변경 없음 | `d5e7163` |
| 2026-09-29 | H1 중복 수납 막기: 화면 버튼 잠금, 서버 `expected_active_bill_ids` 비교·환자 잠금·이전 미수 확인 (3.9) | `1053c97` |
| 2026-09-29 | H2 정정을 서버 한 트랜잭션으로(받은 돈·할인·이월·발급비 유지), H4 미수 처리는 총액 전부 미수 + 서버의 금액 일관성 검사, `needs_rebill`은 살아 있는 영수가 없을 때만, `void-active` API 삭제 | `8a7ca96` |
| 2026-09-29 | develop(`181bb76`, 6개 세션 합친 판)을 합침 — 충돌 없음. 통계 H5 해결 확인, 5절 통계 공식 갱신 | `bee9e17` · `4f4c29d` |
| 2026-09-29 | M5 수납 API 권한 검사, M1 이월된 영수에 수납 거절, M4 이월된 옛 영수 취소 거절 | `55ef4ef` |
| 2026-09-29 | 2절을 프랑스어 화면 기준으로 다시 씀(버튼·칸 이름 프랑스어 + 한국어, 칸별 뜻 표, 안내 문구 표), 2절·6절에 「수납 창구 계정에는 수납 권한」(총괄 요청). develop `9ded00f` 합침 | `3342e97` · `c5ff3a9` |
| 2026-09-29 | H6 창구 발급비를 「정정(환불)·추가 청구」 판정에서 뺌, 정정의 발급비 유지도 같은 기준(`counterFeeCond()`) | `bf54e5b` |
| 2026-09-29 | H3 영수증 다시 만듦(`components/Receipt.jsx`: 저장된 영수에서, 항상 프랑스어, A4, 수납 직후·재출력 같은 모양), detail API에 영수증용 칸 추가 | `dee58dc` |
| 2026-09-29 | PatientChart 오더 상태를 진료 화면과 같은 규칙으로 번역해 표시(PACS 부탁) | `768eaa9` |
| 2026-09-29 | 약 수량은 `total_qty`만 읽음(대체 계산 다섯 곳 삭제), 비어 있으면 경고·수납 거절(`QTY_MISSING`). 영수증 금액 `15 000 Ar`, 인쇄 팝업 차단 안내 프랑스어 | (이 커밋) |
