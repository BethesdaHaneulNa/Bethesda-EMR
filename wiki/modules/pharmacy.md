# 약국 (Pharmacy)

> **담당**: 약국 세션 · 브랜치 `session/pharmacy` · **마지막 갱신**: 2026-09-29 · **상태**: 재고 기록 ①(서버) 끝 — ② 화면, ③ 월말 보고서 진행 예정

## 1. 이 모듈이 하는 일

- 진료가 **끝난** 환자의 처방 약을 조제하는 직원이 확인하고 내어준 뒤 **「조제 완료」** 로 기록합니다. 현장에는 약사가 따로 없고 **간호사가 약국 일도 합니다**(`00-overview.md` 2-1절). 그래서 화면·문서에는 「약사 / Pharmacien」 같은 직함을 쓰지 않습니다.
- 약마다 **원내**(병원 약국에서 내어줌)와 **원외**(환자가 바깥 약국에서 삼)를 정합니다.
  원외로 정한 약은 병원 재고에서 빠지지 않고, 수납 금액에서도 빠지며, **원외 처방전**으로 인쇄합니다.
- 원내 약을 조제 완료하면 **약품 재고가 줄어듭니다.** 재고는 설정 화면의 약품 탭에서 등록·수정합니다.
- 조제하면서 볼 수 있도록 **알레르기**, **같은 약을 아직 먹고 있을 때의 조기 재처방 경고**, **과거 내원 기록**을 함께 보여줍니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR** 로 바꿉니다.
>
> **간호사(Infirmier) 계정**은 기본으로 접수·약국·검사실 화면을 씁니다. 현장에는 약사가 따로 없고 간호사가 조제도 합니다.

### 2.1 화면 열기와 구성

맨 위 메뉴 줄에서 **Pharmacie (약국)** 를 누릅니다. 이 메뉴는 약국 권한이 있는 계정에만 보입니다.

| 자리 | 무엇이 있나 |
|---|---|
| 윗줄 왼쪽 | **En attente (조제 대기)** 탭 · **Délivré (조제 완료)** 탭 — 옆의 숫자는 환자 수 · **Rafraîchir (새로고침)** · **🔍 Trouver patient (환자 찾기)** · **💊 Ordonnance ext. (원외 처방전)** · **📋 Dossier (vue) (차트뷰어)** |
| 윗줄 오른쪽 | **✓ Terminer délivrance (조제 완료)** — 환자를 골랐을 때만 보입니다 |
| 왼쪽 | 환자 목록. 맨 위 검색 칸 **Patient / N° dossier / Médicament (환자명 / 차트번호 / 약명 검색)** 에 이름·차트번호·약 이름 일부를 치면 걸러집니다 |
| 가운데 | 고른 환자의 처방 약 표: **Médicament (약품명)** · **Dose/jour (1일 총량)** · **Dose/prise (1회량)** · **Fréq. (횟수)** · **Jours (일수)** · **Posologie (용법)** · **Qté (수량)** · **Note (메모)**. 오른쪽 위 **Médicaments (interne) (약제비 (원내))** 는 병원에서 받을 약값 |
| 오른쪽 | **Visites passées (과거 내원)** — 이 환자의 지난 진료 기록 |

- 왼쪽 목록에는 **오늘 진료가 끝난** 환자 중 아직 약을 받지 않은 사람만 나옵니다(**En Attente (대기)** 표시). 의사가 진료 화면에서 진료를 끝내야 나타납니다.
- **지난 며칠 사이 약을 안 받아 간 환자**는 **🔍 Trouver patient (환자 찾기)** 로 찾습니다. 이름이나 차트번호로 찾아 고르면:
  - 그 환자의 **최근 7일** 조제 대기 처방이 목록 맨 위 주황 칸 « PAST One — ordonnances en attente (7 derniers jours) » 에 나옵니다. 하나뿐이면 바로 열립니다.
  - 처방에는 « Prescrit il y a 3 j (2026-09-26) » (3일 전 처방) 표시가 붙습니다. 조제 방법은 오늘 처방과 똑같습니다.
  - 7일보다 오래된 처방은 « … de plus de 7 jours — impossible à délivrer ici » 로 개수만 나오고 **조제할 수 없습니다.** 환자를 진료실로 보내 다시 처방받게 하세요.
  - 기다리는 처방이 없으면 « Aucune ordonnance en attente » 가 나오고 오른쪽에 차트만 보입니다. 주황 칸은 **Fermer (닫기)** 로 닫습니다.
- 목록은 **30초마다 저절로** 새로 불러옵니다. 바로 보고 싶으면 **Rafraîchir** 를 누르세요. 원외 처방전·차트뷰어·환자 찾기 창이 열려 있는 동안과, 다른 창이나 탭을 보고 있는 동안은 멈춥니다. 검색 칸에 친 글자와 보고 있던 환자는 그대로 남습니다.

### 2.2 약 내어주기

1. 왼쪽에서 환자를 누릅니다.
2. 이름 아래 **빨간 상자 Allergies (알레르기)** 가 있으면 먼저 확인합니다.
   처방 줄 읽는 법: **Dose/jour** 는 **하루에 먹는 총량**, **Dose/prise** 는 **한 번에 먹는 양**(= 하루 총량 ÷ 횟수), **Qté** 는 내어줄 **총 개수**(= 하루 총량 × 일수)입니다.
   예) Dose/jour 3 · Dose/prise 1 · Fréq. 3 · Jours 7 · Qté 21 → 한 번에 1정씩 하루 3번, 7일, 모두 21정. **½** 은 반 알입니다.
   - **Dose/prise** 가 「—」이고 노란 **⚠ À vérifier avec le médecin (pas en demi-comprimés)** (의사 확인 — 반 알 단위로 안 나눠짐) 이 있으면, 하루 총량이 횟수로 반 알 단위로 나눠지지 않는 처방입니다(한 번에 먹을 양을 정할 수 없음)(예: 하루 2정을 3번). 의사에게 확인하세요.
   - **Qté** 아래 노란 **Ancien calcul (dose×fois×jours)** (예전 계산) 이 있으면 계산 방식을 바꾸기 전에 저장된 처방입니다. 그때 저장된 수(예: 45)가 청구·조제 기준입니다.
   - **Qté** 에 빨간 **⚠ Quantité totale absente** (총량 없음) 가 있으면 총 개수가 저장되지 않았거나 0인 처방입니다(보통 의사가 하루 총량을 비워 둔 경우). 이 약은 조제 완료해도 **재고에서 빠지지 않습니다.** 의사에게 확인하세요.
3. 약 이름 아래 **⚠ 빨간 경고**가 있으면 같은 약이 전에 처방되었고 아직 남아 있을 날짜라는 뜻입니다.
   예) « Même médicament prescrit il y a 3 j pour 7 j — encore 4 j de traitement » (같은 약이 3일 전에 7일분 처방되었습니다 — 아직 4일분 남음). 필요하면 의사에게 확인하세요.
4. 약마다 이름 아래 **Interne (원내)** / **Externe (원외)** 중 하나를 고릅니다. 처음에는 모두 **Interne** 입니다.
   - **Interne** — 병원 약국에서 내어주는 약. 조제 완료 때 병원 재고에서 빠지고, 수납에서 약값을 받습니다.
   - **Externe** — 환자가 바깥 약국에서 사는 약. 재고에서 빠지지 않고, **수납 금액에서도 빠집니다.** 원외 처방전에 찍힙니다.
   - 수납에서 이미 돈을 받은 뒤에 바꾸면, 수납 화면에 추가 수납이나 환불이 생깁니다.
5. **Externe** 약이 있으면 원외 처방전을 인쇄합니다 → 2.3.
6. **Interne** 약을 준비해 환자에게 줍니다.
7. **✓ Terminer délivrance** 를 누르고, 「(환자 이름) Terminer délivrance?」 창에서 **OK** 를 누릅니다. 환자가 목록에서 사라지고 **Délivré** 탭으로 옮겨갑니다.
8. « Le stock enregistré était inférieur à la quantité délivrée — vérifiez le stock réel » (재고가 조제량보다 적게 기록되어 있었습니다 — 실제 재고를 확인하세요) 창이 뜨면, 컴퓨터의 재고 숫자가 실제보다 적었다는 뜻입니다. 약 이름과 「내준 수 / 기록돼 있던 수」가 함께 나옵니다. 선반을 세어 관리자에게 알려 주세요(2.6).

> 오른쪽 위 **Médicaments (interne)** 금액은 **Externe** 약을 빼고 계산합니다. 수납 화면에서 받는 약값과 같습니다.

### 2.3 원외 처방전 인쇄 — Ordonnance ext.

1. 환자를 고른 상태에서 **💊 Ordonnance ext. (원외 처방전)** 를 누릅니다. **Ordonnance externe** 창이 열립니다.
2. 가운데에 처방전 미리보기가 나옵니다. 표에는 **Externe 로 고른 약만** 나옵니다. 약 이름 아래에 먹는 법이 문장으로 찍힙니다. 예) « 1 cp × 3 fois/jour pendant 7 jours (total 21) ». 반 알 단위로 안 나눠지는 처방은 « 2 cp par jour en 3 prises, pendant 5 jours (total 10) » 처럼 하루 양으로 찍힙니다. 총 개수가 없는 약은 **Qté** 칸에 « à vérifier » 가 찍힙니다. 하나도 없으면 « Aucune ordonnance externe » 문구가 나오니, 창을 닫고 약을 **Externe** 로 바꾼 뒤 다시 여세요.
3. 왼쪽 **Saisie (내용 입력)** 에 필요하면 **Pharmacie (optionnel) (수신 약국, 선택)** 과 **Conseils / Remarques (복약지도 / 비고)** 를 적습니다.
4. 처방전 언어는 창 오른쪽 위 **FR · EN · KO** 로 바꿀 수 있습니다. 환자가 가져갈 것이므로 보통 **FR** 입니다.
5. **Émettre (발급)** 를 누르면 문서 번호가 붙어 기록에 남고, 오른쪽 **Historique (발급 이력)** 에 나타납니다. 이어서 **🖨 Réimprimer (재출력)** 를 눌러 인쇄합니다.
   - **🖨 Imprimer (출력)** 는 기록에 남기지 않고 인쇄만 합니다. 문서 번호 자리에 **(BROUILLON)(초안)** 이 찍힙니다. 환자에게 줄 처방전은 **Émettre** 로 발급하세요.
   - 잘못 발급했으면 **Historique** 에서 그 문서를 열고 **Annuler (발급 취소)** 를 누릅니다. 문서에 **ANNULÉ** 가 찍힌 채 기록은 남습니다.
6. **Fermer (닫기)** 로 창을 닫습니다.

### 2.4 이런 창·표시가 뜨면

| 표시 | 뜻과 할 일 |
|---|---|
| « Ce patient a déjà été servi par quelqu'un d'autre… » (다른 사람이 이 환자를 먼저 조제 완료했습니다) | 다른 직원이 같은 환자를 먼저 끝냈습니다. 재고는 한 번만 빠졌으니 **따로 할 일은 없습니다.** 목록이 새로 불러와집니다. 약을 두 번 내어주지 않았는지만 확인하세요. |
| « Ce médicament a déjà été délivré : interne/externe ne peut plus être changé… » (이미 조제 완료된 약은 원내/원외를 바꿀 수 없습니다) | 그 사이에 다른 사람이 조제 완료했습니다. 목록이 새로 불러와집니다. |
| 이름 아래 **노란 상자** « Ce patient n'est plus en attente… » (이 환자는 더 이상 조제 대기 목록에 없습니다) | 보고 있는 동안 다른 사람이 이 환자를 조제 완료했을 가능성이 큽니다. **약을 내어주기 전에 Rafraîchir** 를 누르세요. |
| **Terminer délivrance** 를 눌렀을 때 « Certains médicaments n'ont pas de quantité totale… » (총량이 비어 있는 약이 있습니다) | 적힌 약은 총 개수가 없어 재고에서 빠지지 않습니다. 의사에게 확인한 뒤 **OK** 또는 취소하세요. |
| 목록에 « Aucune ordonnance à afficher » (표시할 처방이 없습니다) | 기다리는 환자가 없거나, 검색 칸에 글자가 남아 있습니다. 검색 칸을 비워 보세요. |

### 2.5 Délivré (조제 완료) 탭

- **오늘 조제를 마친** 환자가 최근 것부터 50명까지 나옵니다(**Terminé (완료)** 표시). 며칠 전 처방이라도 오늘 조제했으면 여기 나옵니다.
- 환자를 누르면 내어준 약과 **Externe** 표시를 볼 수 있습니다. 원내/원외는 여기서 바꿀 수 없습니다.
- 원외 처방전을 다시 뽑아야 하면 여기서 환자를 고르고 **💊 Ordonnance ext.** 를 누릅니다.

### 2.6 약품 등록과 재고 — Paramètres (설정)

설정 권한이 있는 계정만 할 수 있습니다. 약국 권한만 있는 계정은 재고를 고칠 수 없으니 관리자에게 부탁하세요. (입고·실사 조정을 약국·진료 권한으로도 할 수 있게 바꾸는 작업을 준비 중입니다.)

1. 메뉴의 **Paramètres (설정)** → 왼쪽의 **💊 Médicaments (약품)** 을 누릅니다.
2. 목록: **Code (코드)** · **Médicament (약품명)** · **Catégorie (분류)** · **Dose** · **Fréq.** · **Jours** · **Voie** · **Prix unitaire (단가)** · **Stock (재고)**. 재고가 20 아래면 빨간색입니다.
3. 새 약은 **+ Ajouter (+ 추가)**, 고칠 때는 그 줄의 **Modifier (수정)**. 칸을 채우고 저장합니다. **Dose · Fréq. · Jours · Voie** 는 의사가 처방할 때 처음 들어가는 값입니다.
4. **Supprimer (삭제)** → « Supprimer ? » (삭제할까요?) 에서 **OK** 를 누르면 목록에서 감춰집니다. 되살리는 화면은 없으니 신중히 누르세요.

> **재고 칸 (Stock)**: **Stock** 칸을 고치지 않고 저장하면 재고는 그대로입니다(그 사이 조제로 줄어든 숫자가 유지됨). **Stock** 을 고쳐 저장했는데 그 사이 조제 등으로 재고가 바뀌었으면 « Le stock de ce médicament a changé pendant la modification… » (그 사이 이 약의 재고가 바뀌었습니다) 창이 뜨고 **저장되지 않습니다.** 이때 **Stock** 칸에는 지금 재고가 들어가 있고 다른 칸은 그대로입니다 → 선반 숫자와 맞춰 보고 필요하면 고쳐서 **다시 저장**하세요. 재고는 정수만 넣을 수 있습니다.

### 2.7 주의

- **조제 완료는 되돌릴 수 없습니다.** 잘못 눌렀으면 관리자에게 알려 재고를 고쳐야 합니다.
- **어제 이전**에 진료가 끝나고 약을 받지 않은 환자는 목록에 나오지 않습니다 — **🔍 Trouver patient** 로 찾으세요(최근 7일까지).
- **🔍 Trouver patient** 로 고른 환자는 오른쪽 **Visites passées** 에 차트가 보이고, 최근 7일 안의 조제 대기 처방이 있으면 조제할 수 있습니다.
- **📋 Dossier (vue)** 는 이 환자의 차트를 읽기만 하는 창입니다.

## 3. 기능 상세

### 3.1 무엇이 대기 목록에 오는가

`GET /api/pharmacy/pending` (`pharmacy.routes.js:16`) 이 기준입니다. 다음을 모두 만족하는 **진료(consultation) 단위**로 묶어 보여줍니다.

- `consultation.status = 'completed'` — 의사가 진료 화면에서 **완료**를 눌렀음 (`consult.routes.js:77` `PUT /api/consultations/:id/complete`)
- `visit.visit_date = CURRENT_DATE` — **오늘 내원만** (`pharmacy.routes.js:57`). DB 시간대 기준이며, 운영 `.env`의 `TZ=Indian/Antananarivo`가 DB 컨테이너(`TZ`, `PGTZ`)에도 들어갑니다.
- `prescription.status = 'ordered'` 인 처방 줄이 하나 이상 있음

정렬은 `consultation.updated_at` 오름차순입니다. 이 값은 진료 기록을 다시 저장할 때마다 바뀌므로(`consult.routes.js:59`) 목록 순서가 바뀔 수 있습니다. 화면의 시각도 이 값입니다(`Pharmacy.jsx:12`).

완료 후 의사가 처방을 **추가**하면 그 줄은 `ordered`라 다시 대기 목록에 나옵니다(진료 상태는 `completed` 그대로이기 때문).

**지난 미조제 처방 (M3, 2026-09-29 결정: 「목록은 오늘만 + 환자 찾기로 지난 처방도 조제, 7일」)**

- `GET /api/pharmacy/patient/:patientId/pending` (`pharmacy.routes.js:86`) — `/pending`과 **같은 SQL**(`pendingQuery`, `:25`)에 조건만 `c.patient_id = $1 AND v.visit_date >= CURRENT_DATE - 7`. 응답 `{ days, groups, older }` — `older`는 7일보다 오래된 미조제 진료 수(보여주기만).
- 기간은 상수 `PAST_RX_DAYS = 7` (`:21`) 하나입니다. 오래된 처방은 증상이 이미 바뀌었을 수 있어(항생제 등) 진료실에서 다시 처방하게 합니다. **조제 API도 같은 기간을 검사**해서 7일보다 오래된 진료는 409 `ERR_TOO_OLD`로 거절합니다(`:205-216`) — 화면만 막으면 API로는 할 수 있기 때문입니다.
- 조제 자체(`PUT /consultations/:id/dispense`)는 진료 번호 기준이라 그대로 씁니다. 잠금·재고 차감·동시 조제 처리도 같습니다.
- 두 목록 모두 `days_ago`(`CURRENT_DATE - visit_date`, 서버 계산)를 돌려줍니다. 화면은 0보다 크면 「N일 전 처방 (날짜)」(`ph_pastRx`)을 붙입니다.
- 화면(`Pharmacy.jsx`): 환자 찾기(`pickPatient`, `:92`)가 이 목록을 불러 `past` 상태에 둡니다. 1건이면 바로 열고, 여러 건이면 왼쪽 목록 위 주황 칸(`:294`). 수동·자동 새로고침 때 이 목록도 다시 받고, 열린 환자를 오늘 목록**과** 이 목록에서 찾습니다. 「목록에서 사라짐」 안내(`selGone`, `:224`)도 두 목록을 모두 봅니다 — 안 그러면 지난 처방을 열자마자 노란 안내가 떴습니다.
- 조제 완료 목록(`/completed`)은 **조제한 날짜 = 오늘**(`rx.dispensed_at >= CURRENT_DATE`, `:157`)로 바꿨습니다. 내원 날짜 기준이면 3일 전 처방을 오늘 조제해도 Délivré 탭에 안 나왔습니다.

### 3.2 원내 · 원외

- 처방 줄마다 `prescription.dispense_type` = `'internal'`(기본) 또는 `'external'` (`012_dispense_type.sql`).
- 진료 화면에서는 정하지 않습니다. **약국 화면에서만** 바꿉니다 — `PUT /api/pharmacy/prescription/:id/dispense-type` (`pharmacy.routes.js:234`). `'external'`이 아닌 값은 모두 `'internal'`로 저장합니다.
- **아직 조제 대기(`status='ordered'`)인 줄만** 바꿀 수 있습니다(`:238`). 조제가 끝난 줄은 409로 거절합니다.
  이미 원내로 재고를 뺀 줄을 원외로 바꾸면 재고는 빠진 채 청구만 사라지기 때문입니다. 화면은 조제 완료 탭에서 버튼을 숨기지만(`Pharmacy.jsx:288`), 화면만이 이 API를 부르는 길은 아니어서 서버에서 막습니다.
  조제와 전환이 동시에 일어나면 전환이 조제의 줄 잠금을 기다렸다가 조건을 다시 보고 거절됩니다.
- 조제 완료 탭에서는 원외 줄에 「원외」 표시가 붙습니다(`Pharmacy.jsx:294`).
- 전환하면 열려 있는 환자(`sel`)와 왼쪽 목록(`pending`)을 **둘 다** 고칩니다(`Pharmacy.jsx:54`). 목록을 안 고치면 다른 환자를 눌렀다 돌아왔을 때 예전 값이 보였습니다.
- 원외의 효과
  - **재고**: 조제 완료 때 차감하지 않음 (`pharmacy.routes.js:182`)
  - **수납**: 청구 대상에서 빠짐 (`billing.routes.js:31-33`, `:119`). 수납은 청구서를 만들 때가 아니라 매번 처방을 다시 계산하므로, 원내/원외를 바꾸면 수납 화면에 추가 수납·환불로 나타납니다.
  - **약국 화면의 약제비**: 원외 줄은 더하지 않음 (`Pharmacy.jsx:202`, 표시 이름 「약제비 (원내)」) — 수납과 같은 금액이 되도록
  - **원외 처방전**: 원외 줄만 인쇄 (`external-rx.jsx:33`)
  - **통계**: 약품 사용 통계에서 원내/원외로 나눠 볼 수 있음 (`stats.routes.js:215`)
- 원외 줄도 조제 완료를 누르면 `status='dispensed'`가 됩니다. 「환자에게 처방전을 줬다」는 의미로 쓰입니다.

### 3.3 조제 완료와 재고 차감

`PUT /api/pharmacy/consultations/:id/dispense` (`pharmacy.routes.js:264`). **진료 하나의 대기 줄 전부를 한 번에** 조제 완료합니다(한 줄씩, 일부만은 불가).

한 트랜잭션 안에서:

1. 그 진료의 `status='ordered'` 처방 줄을 `FOR UPDATE`로 잠급니다 (`:269-276`). 없으면 404 (`ERR_NOTHING_PENDING`). 내원이 7일보다 오래됐으면 409 (`ERR_TOO_OLD`, 3.1절).
2. 재고를 뺄 약(원내이고 `drug_id`가 있는 줄의 약)의 행을 **`drug.id` 오름차순으로 한꺼번에** 잠급니다 (`:300-313`).
   처방 순서대로 하나씩 잠그면, 같은 두 약을 반대 순서로 가진 두 환자가 동시에 조제될 때 서로 상대의 잠금을 기다리다 Postgres가 한쪽을 「deadlock detected」로 실패시킵니다. 모두가 같은 순서로 잠그면 이런 순환이 생기지 않습니다.
3. 줄마다 — `drug_id`가 있고 원내이면:
   - 차감량 = `Math.ceil(total_qty)` (`:318`). 재고 칸(`drug.stock_qty`)이 정수라서 올림합니다. 청구는 소수 그대로 합니다(예: 7.5 → 재고 8 차감, 청구 7.5개분).
   - `moveStock(kind: 'dispense')`(`:322`, 3.8절)가 재고를 빼고 **재고 기록 한 줄**(처방·진료 번호, 조제한 사람)을 같은 트랜잭션에 남깁니다. **0 아래로 내려가지 않습니다.**
   - 재고가 모자랐으면 기록 줄의 `shortfall`에 모자란 양이 남고, 응답 `shortages`에도 담습니다 (`:327`). 화면은 이를 경고 창으로 보여줍니다 (`Pharmacy.jsx:165`).
     0에서 멈추면 모자란 만큼이 흔적 없이 사라지기 때문에, 선반과 장부가 어긋났다는 사실을 알리려는 것입니다.
4. 대기 줄 전부를 `status='dispensed'`, `dispensed_by`, `dispensed_at=NOW()`로 바꿉니다 (`:336-341`).

**재고 차감은 이 순간 한 번뿐입니다.** 처방할 때, 수납할 때는 재고가 바뀌지 않습니다. 조제 취소(재고 되돌리기)는 없습니다.

**동시 조제** — 2026-09-29 격리 스택에서 실제로 동시에 요청을 보내 확인했습니다(시험 방법은 인계 노트).

- 두 사람이 **같은 환자**를 동시에 조제 완료: 두 번째 요청은 1단계 잠금에서 기다렸다가, 첫 번째가 끝난 뒤 조건(`status='ordered'`)을 다시 보고 0줄을 얻어 404가 됩니다. **재고는 한 번만 빠집니다.**
  화면은 이 404를 알아보고 「다른 사람이 먼저 조제 완료했습니다」를 번역해서 보여준 뒤 목록을 다시 불러옵니다(`Pharmacy.jsx:172`).
- **다른 환자**가 같은 약을 동시에: 약 행 잠금으로 차감이 차례로 일어나 재고가 맞습니다. 약 순서가 반대인 환자 12쌍(24건)을 동시에 조제해서, 고치기 전에는 24건 중 3건이 deadlock으로 실패했고 고친 뒤에는 세 번 돌려 모두 성공, 재고도 정확히 24씩 줄었습니다.
- **오류 문구 번역**: API 클라이언트(`api/client.js`, 총괄 파일)는 화면에 상태 코드 없이 오류 문구만 넘깁니다. 그래서 서버가 정해진 영어 문구(`ERR_*`, `pharmacy.routes.js:23-28`)를 보내고 화면이 **같은 문구**(`Pharmacy.jsx:26-28`)를 비교해 번역 키로 바꿉니다. **한쪽 문구를 바꾸면 다른 쪽도 같이 바꿔야 합니다.**
- **설정 화면에서 재고를 고치는 것**과 조제: 설정 세션이 고쳤습니다(`f44ab9e`, 7절 H4 해결됨). 설정의 약 저장(`PUT /api/admin/drugs/:id`)도 같은 약 행을 `FOR UPDATE`로 잠그고, 재고 칸을 고치지 않았으면 재고를 쓰지 않으며, 고쳤는데 그 사이 재고가 바뀌었으면(`stock_expected` 비교) 409로 거절합니다.
- **의사가 처방을 고치는 것**: 조제된 줄은 진료 쪽 API가 수정·삭제를 409로 거절합니다(`consult.routes.js:199`, `:212` — `status <> 'dispensed'` 조건). 조제와 동시에 고치면 수정이 조제의 줄 잠금을 기다렸다가 조건을 다시 보고 거절됩니다(코드로 확인, 동시 시험은 안 함).

### 3.4 용량 · 수량 — 한국식 「일총투여」 (2026-09-29 실장님 결정)

- 처방 줄의 뜻: `dose` = **하루 총량**(일총투여), `frequency` = 하루 횟수, `days` = 일수, `total_qty` = **하루 총량 × 일수**. 실장님 병원(한국) 처방 화면의 「일총투여 · 횟수 · 일수 · 용법」과 같은 방식이고, 시드 기본값(Paracetamol 3 / 3 / 5 · TID)도 이 방식으로 쓰여 있습니다. 결정 기록: `wiki/decisions.md`.
- **총량은 진료 화면이 계산해 `total_qty`로 저장**하고, 약국은 **그 값만 읽습니다**(`documents/rx-dosing.js` `storedTotal`). 약국 화면·원외 처방전에서 다시 계산하지 않습니다. 저장된 총량이 곧 청구 수량이고 재고 차감량이라, 화면마다 다시 계산하면 숫자가 서로 어긋나기 때문입니다.
- **총량이 비어 있거나 0이면** 그대로 넘기지 않고 드러냅니다(`hasTotal`). 0도 「없음」으로 봅니다 — 의사가 하루 총량을 비워 두고 처방하면 서버가 0 × 일수 = **0**으로 저장해서, 그냥 두면 0개가 조제·청구됩니다. 기본 용량이 없는 약(옛 재고 목록에서 가져올 약)에서 자주 생길 수 있습니다. 표시되는 곳: 약국 화면 「⚠ 총량 없음」, 약제비 아래 같은 표시, 조제 완료 확인 창에 해당 약 목록(`Pharmacy.jsx:151-158`), 원외 처방전 「확인 필요 / à vérifier」. 서버의 재고 차감(`pharmacy.routes.js:183`)은 빈 총량을 0으로 읽어 **아무것도 빼지 않습니다.**
- **1회량** = 하루 총량 ÷ 횟수(`perDose`). 반 알(0.5) 단위로 떨어지면 `½`·`1½`처럼 보이고, 안 떨어지면 **1회량을 쓰지 않고** 「—」와 「⚠ 의사 확인」을 보입니다(**막지는 않음**). 진료 세션 풀이 줄과 같은 규칙입니다(진료: « 1 par prise × 3/j × 7 j = total 21 », 안 떨어지면 「하루 X (N회로 나눔) × D일」 + ⚠).
- **원외 처방전 문장**(`doseSentence`): « 1 cp × 3 fois/jour pendant 7 jours (total 21) ». 1회량이 반 알 단위로 안 떨어지면 종이에 0.67정을 찍지 않고 « 2 cp par jour en 3 prises… » 처럼 하루 양으로 씁니다. 단위(cp·gél.·sachet / 정·캡슐·포)는 약 이름에 Tab·Cap·Sachet이 있을 때만 붙입니다 — 시럽을 정이라고 부르지 않으려고.
- **재고 차감은 올림, 청구는 소수 그대로**(예: 10.5정 → 재고 11 차감, 청구 10.5정분). 반 알 처방이 늘면 이 차이가 자주 생깁니다. **정·캡슐은 청구도 올림**으로 맞추자는 제안은 수납과 얽혀 있어 인계 노트에 제안으로만 남겼습니다.
- **다른 모듈의 계산식**(이 전환의 나머지): 저장하는 곳 `Consultation.jsx`(처방 추가·수정)·`consult.routes.js`(서버 예비)는 **진료 세션**, 예비 계산 `billing.routes.js`·`Payment.jsx`는 **수납 세션**이 같은 식(하루 총량 × 일수)으로 바꿉니다. 그 전까지 진료 화면은 옛 식(용량 × 횟수 × 일수)으로 저장합니다.
- 이미 저장된 처방은 **다시 계산하지 않습니다** — 청구·재고 차감·통계가 이미 그 값으로 끝났기 때문입니다. 대신 예전 식으로 저장된 줄(**저장된 총량 ≠ 하루 총량 × 일수**, 소수 셋째 자리까지 비교 — `isLegacyTotal`, 진료 화면과 같은 판정)은 약국 화면 수량 칸에 「예전 계산 (용량×횟수×일수)」, 원외 처방전 총량 칸에 「(ancien calcul)」을 붙입니다. 안 붙이면 「1정씩 하루 3번, 5일 (총 45)」처럼 앞뒤가 안 맞게 읽힙니다.

### 3.5 조기 재처방 경고

`GET /api/pharmacy/patient/:patientId/recent-rx` (`pharmacy.routes.js:125`) 로 최근 120일 처방을 받고, 화면(`Pharmacy.jsx:116` `refillWarn`)에서 판단합니다.

- 같은 `drug_code`, 지금 진료가 아닌 **오늘 이전** 진료의 처방
- `처방일 + 일수 > 오늘` 이면 경고 (가장 많이 남은 것 하나)
- 처방 상태(조제했는지, 원외인지)는 따지지 않습니다. 그래서 문구는 「받았다」가 아니라 「처방되었다」입니다.
- 문구는 `ph_refillWarn` 한 문장이고 `{ago}`·`{supply}`·`{left}` 자리에 숫자를 넣습니다(`fill`, `Pharmacy.jsx:19`). 언어마다 어순이 달라 조각을 이어 붙이지 않고 문장 하나로 번역합니다.

### 3.6 대기 목록 자동 새로고침

- 30초마다(`AUTO_REFRESH_MS`, `Pharmacy.jsx:22`) `refreshQuiet`(`:91`)가 `/pending`·`/completed`를 다시 받습니다. 브라우저 탭이 다시 보이게 되면 바로 한 번 받습니다.
- **조용히** 받습니다: 「불러오는 중」 글자를 띄우지 않고(띄우면 목록이 잠깐 비어 깜빡입니다), 오류 창도 띄우지 않습니다(다음 차례나 새로고침 버튼이 알려 줌). 검색어·열려 있는 환자는 그대로 둡니다.
- **건너뛰는 때**: 조제 완료 저장 중(`busy`), 원내/원외 전환 저장 중(`switching` 계수), 수동 새로고침 중, 원외 처방전·차트뷰어·환자 찾기 창이 열려 있을 때(창 안의 입력이 초기화될 수 있음), 브라우저 탭이 안 보일 때(`document.hidden`). 받는 동안 조제·전환이 시작됐으면 받은 결과를 버립니다.
- 타이머는 한 번만 만들어서 최신 상태를 `live` ref(`:46`)로 읽습니다. 그러지 않으면 첫 화면의 상태만 봅니다.
- 열려 있는 환자는 새 데이터로 바꿔 끼우지만, **목록에서 사라졌으면 화면에 그대로 두고** 노란 안내(`selGone`, `:186`)를 띄웁니다. 읽는 도중 환자가 사라지면 조제하는 직원이 무슨 일인지 모르기 때문입니다. 이 상태에서 조제 완료를 누르면 「다른 사람이 먼저 조제 완료」 안내가 뜹니다.
- 최근 처방 조회(`recent-rx`)는 선택 객체가 아니라 환자 번호가 바뀔 때만 합니다(`:79`). 30초마다 새 객체가 들어와도 다시 부르지 않습니다.
- 확인: 격리 스택에서 요청 시각이 29초·59초, 문서 창을 연 36초 동안 0회, 그동안 최근 처방 조회 0회. 탭이 가려졌을 때 멈추는 것은 코드로만 확인했습니다.

### 3.7 원외 처방전 (`frontend/src/documents/external-rx.jsx`)

- 문서 엔진(`DocumentModal.jsx`, 진료 세션 주관)에 `category: 'prescription'`, `code: 'external-rx'`, `needsMeds: true`로 등록됩니다(`documents/registry.js`).
- 약 목록은 엔진이 `GET /api/consultations/visit/:visitId/prescriptions`로 **내원 단위** 처방을 받아 넘깁니다(`DocumentModal.jsx:76`). 양식은 그중 `dispense_type === 'external'`만 표에 넣습니다.
- 입력 칸: **수신 약국(선택)**, **복약지도/비고**. 표 칸: No · 약품명(+코드, 아래에 복용 문장) · **1일량** (Dose/j) · 횟수 · 일수 · 총량 · 용법/비고 (Posologie / Note, `route`와 `memo`를 이어 붙임). 총량은 저장된 `total_qty`만, 없으면 「확인 필요 / à vérifier」.
- 표 칸 폭: 고정 칸 합 382px, 약품명 칸이 나머지(인쇄 본문 688px 기준 약 225~306px). 표는 페이지 중간에서 끊기지 않게 `breakInside: avoid`.
- 인쇄 폭 확인(2026-09-29): 688px 폭에서 약 2줄짜리 처방전 높이가 한국어 602px, 프랑스어 619px(한 장 1017px). 복용 문장 때문에 줄마다 높이가 약 38px이라 **약 10줄까지** 한 장에 들어갑니다.
- 약국 화면과 수납 화면에서 인쇄합니다. 약국에서는 **💊 원외 처방전** 버튼이 `DocumentModal`을 `category="prescription"`으로 엽니다(`Pharmacy.jsx:325`). 수납 화면도 같은 방식으로 엽니다(`Payment.jsx:454`, 수납 세션 파일).
- 환자 칸(이름·생년월일·성별·주소)은 엔진이 `GET /api/patients/:id`로 **다시 읽어** 채웁니다(`DocumentModal.jsx:75`). 생년월일이 하루 앞당겨 찍히던 문제(7절 H5)는 이 경로에서 생겼습니다.

### 3.8 재고 기록 (2026-09-29, 재고 2번 ① — 서버)

결정(`wiki/decisions.md`): EMR 안에서 **기록을 남기는 재고**, 유통기한 관리 안 함, 조제 취소 안 함, 월말 재고 보고서. 입고·실사·폐기는 약국·진료·간호·관리자 모두. 설계와 그 근거는 인계 노트 「재고 2번 설계」.

- **표** `stock_movement` (`401_pharmacy_stock_movement.sql`): 약마다 재고가 바뀐 **모든 일**을 한 줄씩. 종류 `opening`(기록 시작) · `receive`(입고) · `dispense`(조제) · `adjust`(실사 조정) · `discard`(폐기). 칸: `qty`(부호 있는 변화) · `stock_before` · `stock_after` · `shortfall` · 처방·진료·직원 · 메모 · 시각.
  - `CHECK (stock_after = stock_before + qty + shortfall)`, `stock_after >= 0` — 앞뒤가 안 맞는 줄은 저장 자체가 안 됩니다.
  - **부족분**: 조제 때 장부 재고가 모자라면 0에서 멈추고, 모자란 양을 `shortfall`로 남깁니다(예: 3개 있는데 8개 조제 → `qty -8, 3 → 0, shortfall 5`). 선반과 장부가 어긋난 사실이 기록에 남습니다.
  - 마이그레이션이 **그때 재고로 약마다 `opening` 한 줄**을 넣습니다. 기존 값(`drug.stock_qty`)은 바꾸지 않습니다.
- **`drug.stock_qty`는 지금 재고**로 그대로 쓰고(빨리 읽기용), 늘 **그 약의 마지막 기록의 `stock_after`**와 같습니다.
- **모든 변화는 `moveStock()` 하나**(`pharmacy.routes.js:61`): 약 행 `FOR UPDATE` → 재고 바꿈 → 기록 한 줄, 부른 쪽 트랜잭션 안에서. 조제(3.3), 입고·실사·폐기 API가 모두 이것을 씁니다.
  - 입고: 정수 > 0, 메모 선택. 실사: **센 숫자**(정수 ≥ 0)를 받아 차이를 계산, 차이 0도 「실사 확인」으로 남김, **메모 필수**. 폐기: 정수 > 0, **사유 필수**, 장부 재고보다 많으면 409 `ERR_DISCARD_MORE`(실사 먼저).
- **기록 밖에서 바뀐 재고**: 설정 화면의 약 저장은 아직 재고를 직접 씁니다(설정 세션이 재고 코드 합친 뒤 읽기 전용으로 바꿀 예정). 그래서 `moveStock`은 지금 재고가 마지막 기록과 다르면 먼저 `adjust` 한 줄(직원 없음, 메모 `MEMO_OUTSIDE` 「Changed outside the stock record (settings screen)」)로 그 차이를 메웁니다 — 기록의 앞뒤가 끊기지 않고, 밖에서 바뀐 사실이 남습니다.
- **순서는 `id`로** 봅니다. 기록은 약 행 잠금을 쥔 채 넣으므로 `id`가 실제 순서입니다. `NOW()`는 트랜잭션이 시작된 시각이라, 잠금을 기다린 조제가 먼저 끝난 것보다 이른 시각을 갖습니다. 처음에 시각으로 「마지막 기록」을 찾았더니, 동시 조제+입고 시험에서 **있지도 않은 「기록 밖 변경」 줄이 생겼습니다**(재고 숫자는 맞았음). 그래서 순서는 `id`로 보고, `created_at`은 넣는 순간의 `clock_timestamp()`로 기록합니다. 월말 보고서(③)의 날짜 경계도 이 순서를 따릅니다.
- **권한**: 파일 전체에 걸던 `permMiddleware('pharmacy')`를 **줄마다**로 바꿨습니다(`:16-18` `canDispense` · `canStock` · `canReport`). 표는 4절. 새 라우트를 더할 때는 반드시 권한을 붙이세요 — 붙이지 않으면 로그인한 누구나 부를 수 있습니다.
- **의사**는 API로는 재고를 만질 수 있지만 약국 화면(`/pharmacy`)에 들어가려면 계정에 **약국 권한도** 있어야 합니다(결정: 진료 화면에 재고 창을 만들지 않음). 의사 계정 기본 권한에 약국을 넣을지는 결정 대기.
- 화면(② 입고·실사·폐기, ③ 월말 보고서)은 다음 단계입니다.
- **시험**: `node backend/test/pharmacy.stock.mjs`(격리 스택 전용). 권한(간호사·의사 가능, 창구·통계 전용 불가, 의사는 조제 목록 403) · 입고/실사(0 포함)/폐기(많으면 409, 사유 없으면 400) · 부족분 · **조제 10건 + 입고 10건 동시**(재고 220 정확, 가짜 「밖 변경」 줄 0) · 설정 화면 변경 뒤 이어 쓰기 · **모든 약의 기록 사슬이 끊김 없이 `stock_qty`로 끝남**.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Pharmacy.jsx` — 약국 화면 (경로 `/pharmacy`, 권한 `pharmacy`)
- `frontend/src/documents/external-rx.jsx` — 원외처방전 양식
- `frontend/src/documents/rx-dosing.js` — 처방 줄 읽는 규칙(저장된 총량, 1회량, 복용 문장). 약국 소유, 진료 화면도 같은 규칙을 쓸 수 있음
- `frontend/src/pages/Settings.jsx`의 **약품 탭** (`{/* DRUGS */}` 부분과 편집 창의 `editType==='drug'` 부분)

### 서버

`backend/src/routes/pharmacy.routes.js` — `/api/pharmacy`. 모든 요청에 로그인이 필요하고, 권한은 **라우트마다** 붙입니다(3.8절).

| 라우트 | 권한 (하나라도) |
|---|---|
| `GET /pending` · `GET /patient/:patientId/pending` · `GET /completed` · `GET /patient/:patientId/recent-rx` | `pharmacy` |
| `PUT /consultations/:id/dispense` · `PUT /prescription/:id/dispense-type` | `pharmacy` |
| `GET /stock` · `GET /stock/:drugId/movements` · `POST /stock/:drugId/receive` · `POST /stock/:drugId/count` · `POST /stock/:drugId/discard` | `pharmacy` · `consultation` · `settings` |
| (③ 예정) `GET /stock/report` | `pharmacy` · `settings` · `stats` |

기본 권한으로 `pharmacy`를 가진 역할: 약국, 간호사, 관리자(`middleware/permissions.js`).

| 메서드 · 경로 | 하는 일 | 응답 |
|---|---|---|
| `GET /pending` | 오늘 진료 완료 + 대기 처방이 있는 진료 목록 | 진료마다 `consultation_id, consultation_time(=c.updated_at), visit_id, visit_date, days_ago, patient_id, chart_no, last_name, first_name, gender, date_of_birth, allergies, doctor_name, rx_count, drug_total(원외 포함 — 화면은 안 씀), prescriptions[]` |
| `GET /patient/:patientId/pending` | 이 환자의 최근 7일 조제 대기 처방(환자 찾기용) | `{ days: 7, groups: [/pending과 같은 줄], older: 7일보다 오래된 미조제 진료 수 }`. 번호가 아니면 400 |
| `GET /completed` | **오늘 조제한** 처방(내원 날짜와 무관), 최근 조제 순 50개 | 진료마다 한 줄 `consultation_id, dispensed_at(가장 늦은 것), visit_id, visit_date, patient_id, chart_no, last_name, first_name, gender, date_of_birth, allergies, doctor_name, dispensed_by_name(여러 명이면 쉼표로), rx_count, prescriptions[]` |
| `GET /patient/:patientId/recent-rx` | 최근 120일 처방 (조기 재처방 경고용) | `drug_code, drug_name, days, status, consult_date, consultation_id` |
| `PUT /consultations/:id/dispense` | 대기 줄 전부 조제 완료 + 원내 재고 차감 | `success, dispensed_count, prescriptions[], shortages[]` (`shortages`: `prescription_id, drug_id, drug_name, requested, available, missing`). 대기 줄이 없으면(다른 사람이 먼저 조제 포함) **404** `ERR_NOTHING_PENDING`. 내원이 7일보다 오래됐으면 **409** `ERR_TOO_OLD` |
| `GET /stock?q=&category=` | 활성 약의 지금 재고 | 약마다 `id, code, name, generic_name, category, stock_qty, min_stock, last_moved_at` |
| `GET /stock/:drugId/movements?from=&to=` | 그 약의 재고 기록, 최근 것부터 500줄 | `id, kind, qty, stock_before, stock_after, shortfall, memo, created_at, prescription_id, consultation_id, staff_name, chart_no, patient_name` |
| `POST /stock/:drugId/receive` `{ qty, memo }` · `/count` `{ counted, memo }` · `/discard` `{ qty, memo }` | 입고 · 실사 · 폐기 | `{ success, stock_before, stock_after, movement }`. 정수 아님 400 `ERR_WHOLE_NUMBER`, 메모 필요 400 `ERR_MEMO_REQUIRED`, 폐기가 장부보다 많음 409 `ERR_DISCARD_MORE`, 약 없음 404 |
| `PUT /prescription/:id/dispense-type` | 원내/원외 지정. 본문 `{ dispense_type: 'internal' \| 'external' }` | 바뀐 처방 줄. 줄이 없으면 404, 이미 조제된 줄이면 **409** `ERR_TYPE_LOCKED` |

`prescriptions[]`의 줄: `id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo, dispense_type, status, created_at` (완료 목록은 `created_at` 대신 `dispensed_at`).
완료 목록도 대기 목록과 같은 칸(환자 성별·생년월일·알레르기, 줄의 `unit_price`·`dispense_type`)을 돌려줍니다. 화면이 두 탭을 같은 코드로 그리기 때문입니다 — 빠져 있을 때는 완료 탭에서 약제비가 0, 원외 표시·알레르기 상자가 안 나왔습니다.

약품 등록 API는 설정 세션 파일 `admin.routes.js`에 있습니다(6절).

### 공용 부품

- `components/DocumentModal.jsx` (진료 주관) — 원외 처방전, 차트뷰어
- `components/PatientChart.jsx` (수납 주관) — 오른쪽 과거 내원
- `components/PatientFinder.jsx` (접수 주관) — 환자 찾기

### DB 테이블

**`stock_movement`** (`401_pharmacy_stock_movement.sql`) — 재고 기록. 칸과 규칙은 3.8절.

**`drug`** (`001_schema.sql:138`)

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | serial | |
| `code` | varchar(20) UNIQUE NOT NULL | 약 코드. 처방·원외 처방전·재처방 경고가 이 코드로 같은 약을 찾습니다 |
| `name` / `name_en` / `generic_name` | varchar(200) | 화면은 `name`만 씁니다. `name_en`, `generic_name`은 설정 화면에 입력 칸이 없음 |
| `category` | varchar(50) | 설정 화면 선택지: Antibiotic, Analgesic, Antimalarial, Cardiovascular, GI, Vitamin, Other |
| `default_dose` | varchar(20) '1.000' | 처방할 때 들어가는 기본 1회량 (문자열) |
| `default_freq` / `default_days` | integer | 기본 횟수 / 일수 |
| `default_route` | varchar(10) 'QD' | 기본 「경로」. 실제로는 `TID`·`BID`·`QD` 같은 복용 횟수 코드와 `IV`·`PO`·`INH`가 섞여 있습니다 |
| `unit_price` | decimal(12,2) | 단가. 처방할 때 처방 줄로 복사됩니다 |
| `stock_qty` | **integer** | 현재 재고. 조제 완료 때 줄고, 설정 화면에서 숫자를 직접 고칩니다 |
| `min_stock` | integer 10 | **어디서도 쓰지 않습니다** (설정 화면은 `< 20`을 빨간색으로 고정 표시) |
| `is_active` | boolean | 설정의 「삭제」는 `false`로 바꿀 뿐입니다 |

**`prescription`** (`001_schema.sql:159`, `012_dispense_type.sql`)

| 칸 | 뜻 |
|---|---|
| `consultation_id` | 진료. 진료가 지워지면 같이 지워짐(CASCADE) |
| `drug_id` | `drug.id`. 비어 있으면 재고 차감을 건너뜁니다 |
| `drug_code`, `drug_name` | 처방 당시 복사본 |
| `dose` (varchar), `frequency`, `days`, `route` | 1회량 · 횟수 · 일수 · 경로(용법) |
| `total_qty` decimal(10,3) | 총량 = 청구 수량 = 재고 차감량(올림) |
| `unit_price` | 처방 당시 단가 |
| `memo` | 비고 |
| `dispense_type` | `'internal'` / `'external'` |
| `status` | `'ordered'` → `'dispensed'`. `'cancelled'`도 허용되지만 지금 이 값을 쓰는 코드는 없습니다 |
| `dispensed_by`, `dispensed_at` | 조제한 직원과 시각 |
| `sort_order` | 표시 순서 |

약품·조제 관련 마이그레이션: `001_schema.sql`(테이블), `003_seed_data.sql:1-27`(기본 약 25개, 재고 포함), `004_order_sets.sql`(오더 세트에 약 포함), `012_dispense_type.sql`(원내/원외). 약국 세션의 새 마이그레이션은 **401 ~ 499**.

## 5. 다른 모듈과의 연결

```
 진료 ──처방 입력──▶ prescription (status=ordered, dispense_type=internal)
  │                        │
  └─ [완료] ─▶ consultation.status=completed, visit.status=completed
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
 약국 (오늘 + 완료 + ordered)          수납 (visit.status=completed)
  · 원내/원외 지정 ───────────────▶  원외 줄은 청구에서 빠짐 (매번 다시 계산)
  · 조제 완료: dispensed + 재고 차감
  · 원외 처방전 인쇄
          │
          ▼
 통계 — 약품 사용량 (total_qty, 원내/원외, 조제 여부로 나눠 봄)
```

- **진료 → 약국**: 진료 화면이 `POST /api/consultations/:id/prescriptions`로 처방 줄을 만들고(`consult.routes.js:149`), 약의 기본값·단가를 복사하며 `total_qty`를 계산해 보냅니다(`Consultation.jsx:240`). 의사가 **완료**를 눌러야 약국에 나타납니다.
- **약국 ↔ 수납**: 순서가 정해져 있지 않습니다. 둘 다 「진료 완료」 뒤에 따로 봅니다. 약국이 원내/원외를 바꾸면 수납의 청구 금액이 바뀝니다. 조제 여부는 청구와 관계없습니다.
- **약국 → 통계**: `stats.routes.js:193` `/api/stats/drug-usage`가 `prescription`을 직접 집계합니다.
- **설정 → 약국**: 약품 등록·재고는 설정 화면 약품 탭 (6절).
- **진료는 조제된 처방을 고칠 수 없습니다** — 진료 세션이 `d1f473e`로 막았습니다(7절 H3 해결됨).

## 6. 설정 항목

**설정 → 💊 약품 탭** (`Settings.jsx` `{/* DRUGS */}` 부분과 편집 창의 `editType==='drug'` 부분, 약국 세션이 고칠 수 있음). 화면 글자는 3개 국어입니다(한국어 / 프랑스어).

- 목록: 코드 · 약품명 · 분류 · 용량 · 횟수 · 일수 · 경로 · 단가 · 재고 (Code · Médicament · Catégorie · Dose · Fréq. · Jours · Voie · Prix unitaire · Stock). 재고가 20 미만이면 빨간색. 검색 칸은 이름·코드.
- **+ 추가** (+ Ajouter) / **수정** (Modifier): 위와 같은 칸.
  - 새 약 기본값: 분류 기타(Other), 용량 1.000, 1회, 7일, QD, 단가 0, 재고 0
  - **분류는 영어 단어로 저장됩니다** — 17가지: Analgesic · Antibiotic · Antihistamine · Antimalarial · Antiparasitic · Cardiovascular · Corticosteroid · Dermatology · Endocrine · GI · Gynecology · Musculoskeletal · Ophthalmic · Respiratory · Urology · Vitamin · Other (`DRUG_CATEGORIES`, `Settings.jsx` 아래쪽). 2026-09-29에 7가지에서 늘렸습니다 — 병원의 실제 약 목록(옛 재고 프로그램 105줄)이 위장관·호흡기·피부 등으로 나뉘어 있어서입니다(대응표: `wiki/reference/drug-import-review.js` `CATEGORY`). 화면에만 번역(`ph_cat_*`)해서 보여줍니다. 시드 데이터와 통계의 분류별 묶음이 이 영어 값을 쓰기 때문입니다. 목록에 없는 값이 DB에 있으면 그대로 보입니다.
- **삭제** (Supprimer): 실제로는 비활성화. 목록에서 사라지고, 되살리는 화면은 없습니다.
- 탭 밖의 글자(왼쪽 탭 이름, 편집 창 제목, 삭제 확인)는 설정 세션이 번역했습니다(`se_tabDrugs`, `se_newTitle`, `se_confirmDelete`).
- 재고: 재고 칸을 **고쳤을 때만** 저장되고, 그 사이 재고가 바뀌었으면 다시 묻습니다(설정 세션 `f44ab9e`, `admin.routes.js` `PUT /drugs/:id`). 정수만 받습니다. 입고·조정 **기록**은 여전히 남지 않습니다(M5).

API — 설정 세션 파일 `admin.routes.js`:

| 메서드 · 경로 | 권한 |
|---|---|
| `GET /api/admin/drugs?q=&category=` — 활성 약 목록 (진료 화면 약 검색도 이것을 씀) | 로그인만 |
| `POST /api/admin/drugs` · `PUT /api/admin/drugs/:id` — 모든 칸을 받아서 그대로 저장 | `settings` |
| `DELETE /api/admin/drugs/:id` — `is_active=false` | `settings` |

즉 **약국 권한(`pharmacy`)만 있는 계정은 재고를 고칠 수 없습니다.** 재고 조정은 설정 권한이 있는 사람이 합니다.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기와 격리 스택 시험으로 찾은 것입니다. 고친 것은 맨 아래 「해결됨」으로 옮겼습니다(번호는 그대로 둡니다). 심각도: **높음** = 환자 안전·돈·재고가 틀어짐, **보통** = 일하다 헷갈리거나 기록이 어긋남, **낮음** = 불편·드묾.

### 높음

- **H2. 시럽·흡입기·안약·연고처럼 「병·개」로 주는 약의 수량** — 한국식에서도 「하루 총량 × 일수」로는 병·개 수가 나오지 않습니다(시럽 1일 15 mL × 7일 = 105 → 105병으로 청구·차감). 선택지는 재고 설계와 함께 인계 노트에 다시 정리합니다.

### 보통

- **M4. 약국 화면에 재고가 보이지 않습니다** — 조제 전에는 재고가 모자란지 알 수 없고, 조제 완료 뒤에야 경고가 뜹니다. `drug.min_stock`은 아무 데서도 쓰지 않습니다.
- **M5. 재고 입출고 기록이 없습니다** — **진행 중**: 서버(기록 표·조제 자동 기록·입고/실사/폐기 API)는 끝남(3.8절). 약국 화면의 「Stock」 탭과 월말 보고서가 다음 단계.
- **M6. 조제 취소가 없습니다** — 잘못 누르면 되돌릴 수 없고, 재고를 손으로 고쳐야 합니다.

### 낮음

- **L6. 설정 약품 탭의 빈 곳** — `min_stock`·`name_en`·`generic_name` 입력 칸 없음. 새 약은 `min_stock`이 비어(NULL) 저장됨(`admin.routes.js:75-77`, 기본값 10이 안 들어감). 삭제한 약은 되살릴 수 없고 같은 코드로 새로 등록도 안 됨(`code UNIQUE`).
- **L9. 목록 시각·순서가 진료 기록을 다시 저장하면 바뀝니다** — `consultation.updated_at` 사용(`pharmacy.routes.js:21`, `:59`).

### 해결됨

2026-09-29 수정. 무엇을 어떻게 고쳤는지는 3절, 확인 방법은 인계 노트에 있습니다.

- **M1. 원내/원외 전환 API가 조제 상태를 보지 않았습니다** → 조제 대기 줄만 바꾸고, 조제된 줄은 409 (`pharmacy.routes.js:234-249`). 3.2절.
- **M2. 원내/원외를 바꾼 뒤 다른 환자를 눌렀다 돌아오면 예전 값이 보였습니다** → 목록도 같이 고침 (`Pharmacy.jsx:54-74`). 3.2절.
- **L1. 교착(deadlock)** → 약 행을 `drug.id` 순서로 먼저 잠금 (`pharmacy.routes.js:166-178`). 고치기 전 24건 중 3건 실패 → 고친 뒤 0건. 3.3절.
- **L2. 같은 환자를 동시에 조제하면 두 번째 사람에게 영어 오류** → 번역된 안내(「다른 사람이 먼저 조제 완료했습니다」) 후 목록 새로고침 (`Pharmacy.jsx:172-176`). 3.3절.
- **L3. 조제 완료 탭** — 같은 진료가 두 줄로 나오던 것(`STRING_AGG`로 조제자를 합침, `pharmacy.routes.js:87`), 원외 표시·약제비·알레르기 상자가 안 나오던 것(빠진 칸 추가). 4절.
- **H5. 인쇄 문서의 생년월일이 하루 앞당겨 찍혔습니다** (모든 모듈의 문서) → 총괄이 `develop`에서 고침(`7ad4387`, `config/database.js`가 DATE를 'YYYY-MM-DD' 문자열 그대로 넘김). 원인: node-postgres가 DATE를 서버 시간대(UTC+3) 자정으로 만들고 JSON이 UTC로 써서, 1990-01-01생이 `1989-12-31T21:00:00.000Z`로 나가고 화면·문서가 `T` 앞만 씀. 이 약국 브랜치에는 그 커밋이 없으므로 합친 뒤에 원외 처방전의 생년월일을 한 번 확인해야 합니다.
- **H3. 조제 완료된 처방을 진료 화면에서 고치거나 지울 수 있었습니다** → 진료 세션이 고침(`d1f473e`): 조제된 줄의 수정·삭제는 409 (`consult.routes.js:180`, `:199`, `:212`).
- **H4. 설정 화면에서 약 정보를 저장하면 창을 연 때의 재고로 덮어썼습니다** → 설정 세션이 고침(`f44ab9e`): 재고 칸을 고쳤을 때만, 그 사이 안 바뀌었을 때만 저장. 바뀌었으면 409와 안내(`se_stockChanged`). 재고·최소 재고의 정수 검사도 같이(L6 일부).
- **H1. 「용량」 칸의 뜻** → 한국식 하루 총량으로 결정(2026-09-29). 약국은 저장된 총량만 읽고 1회량을 같이 보여줌(3.4절). 진료·수납 쪽 계산식은 각 세션 작업. 시드 기본값은 이 방식으로 맞음 — 단 **ACT01 4/2/3(총 12정, 표준 24정)·ORS는 의사 확인 목록(급함)**.
- **M7. 「경로」 칸에 TID·BID** → 칸 이름을 「용법 / Posologie / Directions」로(약국 화면 `ph_colDirections`, 원외 처방전). 용법과 횟수가 다를 때 경고는 제안으로만 남김.
- **M3. 오늘 내원만 대기 목록에 나와 지난 처방을 조제할 길이 없었습니다** → 목록은 오늘만 두고, 환자 찾기로 최근 7일 미조제 처방을 조제(3.1절). 조제 완료 목록은 조제 날짜 기준. 「조제 안 함」 버튼은 만들지 않기로 결정(안 줄 약은 진료실에서 처방을 지움).
- **L4. 약제비가 원외 약까지 더했습니다** → 원외 제외, 이름을 「약제비 (원내)」로 (`Pharmacy.jsx:202-205`, `:268`). 3.2절.
- **L7. 조기 재처방 경고가 「⚠ 5j 7j · reste 2j」처럼 숫자만이었습니다** → 문장 하나로(`ph_refillWarn`, `Pharmacy.jsx:295`). 기준은 그대로. 3.5절.
- **L8. 대기 목록이 저절로 새로고침되지 않았습니다** → 30초마다 조용히, 방해될 때는 건너뜀. 목록에서 사라진 환자는 안내와 함께 남김. 3.6절.
- **L5. 설정 약품 탭의 영어 고정 글자** → 탭 안(표 머리·제목·+ 추가·편집 칸·분류 이름)은 약국이 `b1c5f92`로, 탭 밖(탭 이름·편집 창 제목·삭제 확인)은 설정 세션이 고침. 6절.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 코드 기준으로 위키 첫 작성 (코드 변경 없음) | `b283335` |
| 2026-09-29 | 원내/원외 전환 잠금(조제 후 409), 전환 후 목록 갱신, 약 행 잠금 순서(교착 방지), 동시 조제 안내 번역, 조제 완료 탭 한 줄·빠진 칸, 약제비 원외 제외 | `3b91950` |
| 2026-09-29 | 생년월일 임시 처리(TO_CHAR) 되돌림 — 총괄 `7ad4387`이 전체를 고쳐서. H5를 해결됨으로 | `d232b88` |
| 2026-09-29 | develop(`5e0e056`)을 당긴 뒤 정리: H3 해결됨(진료 `d1f473e`), 설정 화면 줄 번호 갱신, 시험 스크립트 머리에 격리 스택 전용 경고 | `5292f43` |
| 2026-09-29 | 조기 재처방 경고 문장화(L7), 설정 약품 탭 3개 국어(L5 탭 안), 대기 목록 30초 자동 새로고침과 「목록에서 사라진 환자」 안내(L8) | `b1c5f92` |
| 2026-09-29 | 2절 직원용 사용법을 프랑스어 화면 기준으로 다시 씀(원외 처방전 발급·재출력·발급 취소, 조제 완료 탭, 약품 등록 포함) | `7c243e5` |
| 2026-09-29 | H4 해결됨 반영(설정 세션 `f44ab9e`) — 2.6 「재고가 바뀌었습니다」 안내 때 할 일, 3.3·6·7절 | `e9c134f` |
| 2026-09-29 | 한국식 일총투여: 저장된 총량만 읽기, 1회량·복용 문장 표시, 용법 칸 이름, 「약사」 직함 빼기 | `f464095` |
| 2026-09-29 | 예전 식으로 저장된 줄에 「예전 계산」 표시(약국 화면·원외 처방전) | `f9489cf` |
| 2026-09-29 | M3: 환자 찾기로 최근 7일 미조제 처방 조제, 조제 완료 목록은 조제 날짜 기준, 간호사 계정 안내 | `442b75f` |
| 2026-09-29 | 약품 분류 7가지 → 17가지(실제 약 목록에 맞춤) | `3e07b11` |
| 2026-09-29 | 원내 줄 총량 0도 「총량 없음」으로 표시·조제 확인 창에 넣기 | `2bb89c3` |
| 2026-09-29 | 재고 기록 ①: `stock_movement` 표(401), `moveStock`, 조제 자동 기록, 입고·실사·폐기 API, 라우트마다 권한 | (이 커밋) |
