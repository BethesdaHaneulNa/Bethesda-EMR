# 약국 (Pharmacy)

> **담당**: 약국 세션 · 브랜치 `session/pharmacy` · **마지막 갱신**: 2026-09-29 · **상태**: 재고 기록 ①②③ 끝 · 포장 단위 약 끝에서 끝까지 확인 · 옛 재고 목록 가져오기(403) 만듦 — 실행 중 EMR에는 총괄이 올림(3.11)

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
| 윗줄 왼쪽 | **En attente (조제 대기)** 탭 · **Délivré (조제 완료)** 탭 — 옆의 숫자는 환자 수 · **📦 Stock (재고)** 탭(2.6) · **Rafraîchir (새로고침)** · **🔍 Trouver patient (환자 찾기)** · **💊 Ordonnance ext. (원외 처방전)** · **📋 Dossier (vue) (차트뷰어)** |
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
   - 시럽·흡입기·안약·연고처럼 **병·튜브로 주는 약**은 **Qté** 에 « 2 flacons », « 1 inhalateur » 처럼 병·개 수가 나오고 **Dose/prise** 는 「—」입니다. Dose/jour · Fréq. · Jours 는 먹는 법 안내일 뿐이고, 내어줄 것은 **Qté 의 병·개 수**입니다.
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
8. « Le stock enregistré était inférieur à la quantité délivrée — vérifiez le stock réel » (재고가 조제량보다 적게 기록되어 있었습니다 — 실제 재고를 확인하세요) 창이 뜨면, 컴퓨터의 재고 숫자가 실제보다 적었다는 뜻입니다. 약 이름과 「내준 수 / 기록돼 있던 수」가 함께 나옵니다. 선반을 세어 **📦 Stock** 탭의 **Inventaire (실사)** 로 맞춰 주세요(2.6).

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

### 2.6 재고 — 📦 Stock (재고) 탭

약이 들어오거나, 선반을 세거나, 약을 버릴 때 여기서 적습니다. **약국 권한이 있는 계정**(간호사·약국·관리자)이 씁니다. 조제로 나간 약은 **Terminer délivrance** 를 누를 때 저절로 적힙니다.

1. 윗줄의 **📦 Stock** 을 누릅니다. 왼쪽에 약 목록과 지금 재고가 나옵니다. 재고가 **최소 재고 이하**면 숫자가 빨간색입니다.
   - 위 칸 **Médicament / code / principe actif** 에 이름·코드·성분 일부를 치거나, **Toutes catégories** 에서 분류를 골라 거릅니다.
2. 약을 누르면 오른쪽에 **Stock actuel (지금 재고)** 과 버튼 세 개, 아래에 **Registre du stock (재고 기록)** 이 나옵니다.
3. 할 일에 맞는 버튼을 누르고, 수를 적고, **Sauver (저장)** 를 누릅니다. 잘못 열었으면 **Annuler (취소)**.

| 버튼 | 언제 | 적는 수 | 메모 |
|---|---|---|---|
| **Entrée (입고)** | 약이 들어왔을 때 | **Quantité reçue** — 들어온 개수 | 공급처·선교팀 등 (안 적어도 됨) |
| **Inventaire (실사)** | 선반을 실제로 세었을 때 | **Quantité comptée en rayon** — **센 개수 그대로**(더하거나 빼지 말고). 적으면 옆에 **Écart avec le registre (장부와 차이)** 가 보입니다 | **꼭 적기** (예: 월말 실사) |
| **Mise au rebut (폐기)** | 깨지거나·상하거나·기한이 지나 버릴 때 | **Quantité jetée** — 버린 개수 | **꼭 적기** — 사유 |

- 저장되면 위에 초록 줄로 « Zinc 20mg Tab: 477 → 577 » 처럼 바뀐 숫자가 나오고, 기록 맨 위에 한 줄이 생깁니다.
- 수는 **정수**만 됩니다. 실사는 0도 됩니다(선반에 하나도 없을 때). 세어 본 숫자가 장부와 같아도 저장하세요 — 「확인했다」는 기록이 남습니다.
- 장부 재고보다 많이 버리려 하면 « Impossible de jeter plus que le stock enregistré… » 가 뜹니다. 먼저 **Inventaire** 로 실제 숫자를 맞춘 뒤 버리세요.
- **재고 기록 읽기**: Date (날짜) · Type (종류: Entrée 입고 · Délivrance 조제 · Ajustement d'inventaire 실사 조정 · Rebut 폐기 · Ouverture 기록 시작) · Variation (변화) · Avant → après (앞 → 뒤) · Manque au registre (장부 부족) · Par (누가) · Patient (조제한 환자) · Note (메모).
  - **Manque au registre** 에 숫자가 있으면: 조제할 때 장부에 그만큼 모자랐다는 뜻입니다(예: 장부 3개인데 8개 조제 → 5). 선반을 세어 **Inventaire** 로 맞춰 주세요.
  - Note 에 « Modifié hors registre (paramètres) » (기록 밖에서 바뀜) 가 있으면: 설정 화면에서 재고 숫자를 직접 고친 흔적입니다.
- **처음 시작할 때**: 날을 정해 약마다 선반을 세고 **Inventaire** 로 한 줄씩 넣으세요(메모 「시작 실사」). 그 뒤의 숫자부터 믿을 수 있습니다.
- **월말 재고 보고서**: 목록 위 **📊 Rapport mensuel de stock (월말 재고 보고서)** 를 누르고 **Mois (달)** 를 고릅니다. 약마다 한 줄로 **Stock début (월초) · Entrées (입고) · Délivré (조제 출고) · Manque au registre (장부 부족) · Ajust. inventaire (실사 조정) · Rebut (폐기) · Stock fin (월말) · Contrôle (확인)** 이 나옵니다.
  - **⬇ CSV** 로 엑셀에서 여는 파일을 내려받습니다(화면 언어의 칸 이름, 한글·악센트 안 깨짐).
  - **Contrôle** 가 ✓ 가 아니면 합이 안 맞는 것입니다 — 총괄(관리자)에게 알려 주세요.
  - 「Registre commencé le …」(기록 시작) 표시가 있는 약은 그 달 중간부터 기록이 있는 약입니다. 기록을 시작하기 전 달은 비어 있습니다.
  - 약국 권한이 있는 계정이 이 화면을 씁니다. 통계 권한만 있는 계정도 서버에서는 볼 수 있게 해 두었습니다(통계 화면 연결은 나중).
- 의사 계정도 약국 권한이 있으면 이 탭을 쓸 수 있습니다.
- **옛 재고 프로그램에서 가져온 약**(코드 `MED-…`): 재고는 2026-05-15 목록의 수량으로 시작합니다(기록 표 첫 줄 **Ouverture · Importé (liste du 15/05/2026)**). 현지에서 세어 보고 **Inventaire** 로 고치세요.
  - 이름 앞에 **⚠** 가 붙은 약은 가져올 때 **확인할 점**이 남은 약입니다. 분류 고르기 맨 위의 **⚠ Médicaments à vérifier (확인 필요한 약)** 으로 그 약만 볼 수 있습니다.
  - 약을 누르면 머리 아래에 **À vérifier sur place (현지에서 확인할 점)** 목록이 나옵니다(예: « Quantité différente de la note d'origine — à compter — 60캡슐*66 ≈ 3960 ≠ 90 » = 옛 목록의 원래 표기로는 약 3960인데 수량 칸은 90).
  - 다 보았으면 **✓ Vérifié (확인했음)** → 확인 창 **OK**. ⚠ 가 사라지고 「Vérifié par (누가) · (언제)」가 남습니다. **재고 숫자는 이 버튼으로 바뀌지 않습니다** — 센 수는 **Inventaire** 로 넣습니다.

### 2.7 약품 등록 — Paramètres (설정)

설정 권한이 있는 계정만 할 수 있습니다. 재고를 넣고 빼는 것은 **📦 Stock** 탭(2.6)에서 합니다.

1. 메뉴의 **Paramètres (설정)** → 왼쪽의 **💊 Médicaments (약품)** 을 누릅니다.
2. 목록: **Code (코드)** · **Médicament (약품명)**(옆에 제형) · **Catégorie (분류)** · **Prix unitaire (단가)** · **Stock (재고)**. 재고가 그 약의 **Stock minimum (최소 재고)** 이하면 빨간색입니다(약국 📦 Stock 탭과 같은 규칙).
3. 새 약은 **+ Ajouter (+ 추가)**, 고칠 때는 그 줄의 **Modifier (수정)**. 칸을 채우고 저장합니다. 약에는 **용량·횟수·일수를 넣지 않습니다** — 그것은 의사가 **약속처방(Ordonnances types)** 에서 정합니다(2026-09-29 결정). 약에는 **한 알(한 병)의 값** 을 넣으세요.
   - **Forme (제형)**: Comprimé · Gélule · Sirop · Suppositoire · Poudre / sachet · Vaginal / gel · Usage externe · Collyre / pommade ophtalmique 중에서 고릅니다.
   - **Principe actif (성분)** · **Nom anglais (영어 이름)**: 약국 📦 Stock 탭 검색이 성분으로도 찾습니다. 비워도 됩니다.
   - **Stock minimum (최소 재고)**: 재고가 이 수 **이하**가 되면 목록과 📦 Stock 탭에서 빨간색으로 보입니다. **0** 이면 표시하지 않습니다. 새 약은 10으로 시작합니다.
4. 시럽·흡입기·안약·연고처럼 **병·튜브로 주는 약**이면 **Délivré à l'unité de conditionnement (flacon, tube…) (포장 단위 약)** 을 체크하고 단위(**Flacon 병 · Tube 튜브 · Inhalateur 흡입기 · Unité 개**)를 고릅니다. 그러면 의사가 처방할 때 병·개 수를 직접 적습니다. 이런 약의 **Prix unitaire** 는 **병·튜브 하나의 값**으로 넣으세요. 목록에는 이름 옆에 단위가 작게 붙습니다.
   - **이미 쓰던 약을 체크하거나 체크를 풀었으면 바로 📦 Stock → Inventaire 로 재고를 새 단위(병·튜브 수)로 세어 넣으세요.** 재고 숫자에는 단위가 없어서, 체크를 바꾼 순간부터 같은 숫자를 병으로 읽습니다. 메모에 「포장 단위로 바꿈」처럼 적어 두면 월말 보고서에서 알아볼 수 있습니다.
   - 체크를 바꿔도 **이미 쓴 처방은 그대로**입니다(처방할 때의 표시를 처방 줄이 따로 가짐).
5. **Supprimer (삭제)** → « Supprimer ? » (삭제할까요?) 에서 **OK** 를 누르면 목록에서 감춰집니다. 되살리는 화면은 없으니 신중히 누르세요.

> **재고 칸 (Stock)**: 여기서는 **보기만** 됩니다(흐린 칸). 재고는 **📦 Stock** 탭에서 **Entrée · Inventaire · Mise au rebut** 로 바꾸세요 — 바뀔 때마다 누가·왜가 기록에 남습니다. **새 약은 재고 0으로** 등록되고, 들어온 약은 Stock 탭의 **Entrée** 로 넣습니다.

### 2.8 주의

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
- **포장 단위 줄**(H2-B, `025_pharmacy_pack_unit.sql`, 처방 줄의 `pack_unit`): `total_qty`는 의사가 적은 **병·개 수**이고, 하루 총량·횟수·일수는 안내입니다. `rx-dosing.js`에서 `perDose` → `null`(1회량 없음, ⚠ 없음), `isLegacyTotal` → 거짓, `doseSentence` → 「하루 15, 3회로 나눠 7일 — 2병」 « 15 par jour en 3 prises, pendant 7 jours — 2 flacons »(안내가 없으면 병·개 수만, 수가 없으면 「병 수 확인 필요」), `packWord` → 「2병 · 흡입기 1개 · 1튜브」 « 2 flacons · 1 inhalateur ». 하루 총량의 단위(mL·번)는 약 표에 없어 숫자만 찍힙니다(7절 후보). 약국 화면·원외 처방전의 수량 칸도 `packWord`. 조제 재고 차감은 `Math.ceil(total_qty)` = 병·개 수. 약국 대기·완료 목록 API가 처방 줄마다 `pack_unit`·`pack_label`을 돌려줍니다.
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

- **표** `stock_movement` (`021_pharmacy_stock_movement.sql`): 약마다 재고가 바뀐 **모든 일**을 한 줄씩. 종류 `opening`(기록 시작) · `receive`(입고) · `dispense`(조제) · `adjust`(실사 조정) · `discard`(폐기). 칸: `qty`(부호 있는 변화) · `stock_before` · `stock_after` · `shortfall` · 처방·진료·직원 · 메모 · 시각.
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
  - 두 시험(`pharmacy.api.mjs`·`pharmacy.stock.mjs`)은 **자기 시험 약**을 씁니다(`pharmacy.testdrugs.mjs` `ensureTestDrugs`): 코드 `TST-<이름>`, 없으면 설정 API로 만들고, 돌 때마다 실사로 500에 맞춘 뒤 시작합니다. 시드 예시 약(ZINC·PCM500…)은 실제 약 목록을 들여오면 숨길 것이라 건드리지 않습니다 — 시험 뒤 시드 약의 기록은 `opening` 한 줄뿐입니다.

### 3.9 재고 화면 — 약국의 「Stock」 탭 (재고 2번 ②)

- `frontend/src/pages/PharmacyStock.jsx`(약국 소유, 새 파일). `Pharmacy.jsx`는 윗줄 탭 하나(`tab === 'stock'`)와 이 부품을 그리는 줄만 더했고, 재고 탭에서는 조제용 버튼(새로고침·환자 찾기·원외 처방전·차트뷰어·조제 완료)을 감춥니다.
- 왼쪽: `GET /stock` 목록, 검색(이름·코드·성분)과 분류 거르기(목록에 있는 분류만). **최소 재고 이하 빨간색**(`min_stock`이 0이나 비었으면 칠하지 않음). 따로 「부족 알림 화면」은 만들지 않았습니다(결정).
- 오른쪽: 지금 재고, 버튼 세 개 → 한 줄짜리 입력(수 + 메모). 화면에서 먼저 검사(정수, 실사·폐기 메모, 폐기 > 재고)하고, 서버의 같은 검사 문구(`ERR_*`)도 알아보고 번역해 보여줍니다. 저장 뒤 목록과 기록을 다시 불러옵니다.
- 기록 표: `GET /stock/:drugId/movements`(최근 500줄). 종류는 `ph_kind_*`로 번역, 서버가 쓰는 두 메모(기록 시작, 밖에서 바뀜)도 번역.
- 권한: 약국 화면에 들어올 수 있는 계정(pharmacy)만 이 탭을 봅니다. API는 진료·설정 권한도 허용하지만 화면은 약국 화면 안에만 있습니다(결정: 진료 화면에 재고 창 없음).
- 월말 보고서는 3.10.

### 3.10 월말 재고 보고서 (재고 2번 ③)

- `GET /api/pharmacy/stock/report?month=YYYY-MM` (`pharmacy.routes.js:469`, 권한 `canReport` = pharmacy · settings · stats). **기록 표 하나로만** 계산합니다.
  - 월초 = 그 달 1일 0시 **전** 마지막 기록(**id 순**)의 `stock_after`. 월말 = 다음 달 1일 0시 전 마지막 기록의 `stock_after`. 사이의 종류별 합: 입고 · 조제 출고(나간 양) · 장부 부족(`shortfall`) · 실사 조정(부호 있음) · 폐기.
  - `월초 + 입고 − 조제 출고 + 장부 부족 ± 조정 − 폐기 = 월말` — 기록 줄마다 `CHECK`로 보장되므로 늘 맞아야 하고, 확인용으로 `ok`를 돌려줍니다.
  - 그 달 안에 기록이 시작된 약은 `opening` 줄을 월초로 쓰고 `started_on`을 붙입니다. 그 달 말까지 기록이 없는 약은 빠지므로, **기록 시작 전 달은 비어 있습니다.**
  - **설정에서 숨긴 약**(`is_active = false`)은 **그 달에 기록이 있을 때만** 나옵니다(2026-09-29 결정). 숨기기 전 달의 입출고는 그 달 보고서에 남고, 숨긴 뒤 움직임 없는 달에는 빠집니다. 실제 약 목록을 들여오며 시드 예시 약을 숨겨도 보고서가 어지럽지 않게 하려는 것입니다.
  - 날짜 경계는 **병원 시간 자정**입니다. 서버 연결이 병원 시간대로 고정되어 있어야 합니다(`config/database.js` `options: -c TimeZone`, 총괄 `03f68c7` 무렵 — 전에는 운영 DB의 기본값이 UTC라 새벽 0~3시가 전날로 잡혔음). 기록 시각은 `clock_timestamp()`로 넣어 id 순서와 같게 둡니다(3.8절).
- 화면: 「Stock」 탭 목록 위 **📊 월말 재고 보고서** → 오른쪽에 달 고르기(이번 달까지), 표, **⬇ CSV**. CSV는 **화면에서** 만듭니다(칸 이름을 화면 언어로 쓰려고). UTF-8 BOM + CRLF라 엑셀에서 한글·악센트가 깨지지 않습니다.
- 통계 화면에 둘지는 나중(통계 세션이 같은 API를 부르면 됨).
- 확인(격리 스택): ZINC의 앞 기록 7줄을 8월로 옮겨(격리 DB만, 8/31 23:59:59 한 줄과 9/1 0:00 한 줄 포함) → 8월: 기록 시작 8/10 · 월초 315 · 입고 51 · 조정 −7 · 폐기 3 · 월말 356, 9월: 월초 356 · 입고 253 · 조제 2 · 조정 −28 · 폐기 11 · 월말 568 — 손 계산과 같음. 7월은 빈 보고서. 9월 월말 = 모든 약의 지금 재고. 권한: 통계 전용 200 · 창구 403 · 의사(진료만) 403 · 잘못된 달 400. CSV 첫 바이트 `EF BB BF`.

### 3.11 옛 재고 목록 가져오기 (마이그레이션 403, 2026-09-29 결정)

- **무엇**: 옛 재고 프로그램의 2026-05-15 목록(105줄, 같은 코드의 묶음을 합쳐 **101개 약**)을 약 표에 넣고, 시드의 **예시 약 25개를 숨김**(`is_active = false`, 지우지 않음). 결정: `wiki/handoff/coordinator.md` 「가져올 약 결정」.
- **만드는 법**: `node wiki/reference/drug-import-sql.js` → `backend/sql/034_pharmacy_import_mission_stock.sql`(값이 박힌 정적 SQL, 손으로 고치지 않음 — 표나 스크립트를 고치고 다시 만듦). 입력은 검토표 `wiki/reference/drug-import-review.csv`(`drug-import-review.js`가 옛 목록에서 만듦). 스크립트는 쓰기 전에 검사하고(코드 중복·예시 코드와 겹침·길이·17가지 분류·제형·용법 코드·수량 정수·포장 단위 값·「채울 칸」이 비었는지) 하나라도 걸리면 파일을 쓰지 않습니다.
- **넣는 값**: 코드(`MED-0001`…) · 이름 · 성분 · **제형**(새 칸 `dosage_form`, 검토표의 고친 값) · 분류 · 재고(목록의 수량 합계, 합 106,467) · 포장 단위(병 7 · 튜브 3 · 개 2). **비움**: 가격 0(현지에서 채움, 그때까지 「가격 없음」), 최소 재고 0.
  - **결정 B(같은 날 밤)**: 약에는 기본 용량·횟수·일수·용법을 두지 않습니다 — 약속처방이 정합니다. 칸은 지우지 않아서, 하루 총량·일수는 비어 있고 옛 용법에서 읽은 횟수·용법 코드(코드 하나를 분명히 적은 56개)는 **들어가지만 쓰지 않습니다**. 그래서 옛 용법 「1_2」의 뜻은 확인할 점에서 뺐습니다.
- **재고 기록**: 약마다 `opening` 한 줄, 메모 `Imported from the old stock program (count of 2026-05-15)`(화면 「가져오기(2026-05-15 자료)」) — 실사 조정과 섞이지 않습니다.
- **확인할 점**(`drug.import_check` JSONB, 63개 약): 검토표의 「확인할 점」을 종류와 자료로 바꿔 넣습니다 — `[{k, d}]`. 종류(번역 `ph_chk_*`): `qty` 수량이 원래 표기와 다름(47개 약 — 결정문의 37과 다름, 인계 노트) · `dup` 같은 이름 다른 코드(13) · `form` 제형 고침(10) · `review` 옛 메모(8) · `name` 이름(4) · `topical` 정인데 외용일 수 있음(4, 포장 단위 표시 없이) · `malaria` 말라리아약(2) · `packlabel` 포장 단위 말(2) · `zero` 수량 0(1). 멈추지 않고 표시만 합니다(결정).
  - 보이는 곳: 약국 Stock 탭(목록 ⚠, 「확인 필요한 약」 거르기, 머리 아래 목록과 **Vérifié** 단추), 설정 약품 탭(목록 ⚠ — 마우스를 올리면 목록, 편집 창에 목록). 표시 규칙은 `frontend/src/documents/drug-info.js`.
  - **Vérifié** = `POST /stock/:drugId/check-done`(권한 `canStock`): `import_check_done_at`·`_by`를 적습니다. 목록은 지우지 않고 남깁니다(누가·언제 확인했는지와 함께). 재고 숫자는 바꾸지 않습니다. 이미 확인한 약 → 409 `ERR_NOTHING_TO_CHECK`.
  - 변경 기록 탭(감사 로그)에는 남기지 않습니다 — 그 목록(`utils/audit.js` `ACTIONS`)은 설정 세션 파일이라, 대신 약 줄에 누가·언제를 둡니다.
- **다시 돌려도 안전**: 칸은 `IF NOT EXISTS`, 약은 `ON CONFLICT (code) DO NOTHING`, opening은 기록이 하나도 없는 약에만, 숨기기는 아직 보이는 약에만. 마이그레이션 실행기가 파일을 한 트랜잭션으로 감쌉니다.
- **약속처방은 건드리지 않습니다.** 예시 약을 가리키는 세트 줄(Malaria Workup: ACT01·PCM500, Diarrhea / GE: ORS·METRO)은 진료 화면이 건너뛰고 « Non ajouté(s) — retiré(s) de la liste des médicaments : … » 안내를 띄웁니다(진료 세션 `drug_active`, 확인함). 검사 줄은 그대로 들어갑니다.
- 숨긴 예시 약: 약국·수납·통계의 옛 처방은 그대로 보이고, 조제 대기 중인 옛 처방도 조제됩니다(조제는 `is_active`를 보지 않음). 진료 약 검색·Stock 탭·설정 목록에서는 사라집니다. 월말 보고서에는 기록이 있는 달에만(3.10).

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
| `GET /stock` · `GET /stock/:drugId/movements` · `POST /stock/:drugId/receive` · `POST /stock/:drugId/count` · `POST /stock/:drugId/discard` · `POST /stock/:drugId/check-done` | `pharmacy` · `consultation` · `settings` |
| `GET /stock/report` | `pharmacy` · `settings` · `stats` |

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
| `GET /stock/report?month=YYYY-MM` | 월말 재고 보고서 | `{ month, rows: [{ drug_id, code, name, category, is_active, started_on, start, received, dispensed, shortfall, adjusted, discarded, end, movements, ok }] }`. 달 형식이 틀리면 400 |
| `PUT /prescription/:id/dispense-type` | 원내/원외 지정. 본문 `{ dispense_type: 'internal' \| 'external' }` | 바뀐 처방 줄. 줄이 없으면 404, 이미 조제된 줄이면 **409** `ERR_TYPE_LOCKED` |

`prescriptions[]`의 줄: `id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo, dispense_type, status, created_at` (완료 목록은 `created_at` 대신 `dispensed_at`).
완료 목록도 대기 목록과 같은 칸(환자 성별·생년월일·알레르기, 줄의 `unit_price`·`dispense_type`)을 돌려줍니다. 화면이 두 탭을 같은 코드로 그리기 때문입니다 — 빠져 있을 때는 완료 탭에서 약제비가 0, 원외 표시·알레르기 상자가 안 나왔습니다.

약품 등록 API는 설정 세션 파일 `admin.routes.js`에 있습니다(6절).

### 공용 부품

- `components/DocumentModal.jsx` (진료 주관) — 원외 처방전, 차트뷰어
- `components/PatientChart.jsx` (수납 주관) — 오른쪽 과거 내원
- `components/PatientFinder.jsx` (접수 주관) — 환자 찾기

### DB 테이블

**`stock_movement`** (`021_pharmacy_stock_movement.sql`) — 재고 기록. 칸과 규칙은 3.8절.

**`drug`** (`001_schema.sql:138`)

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | serial | |
| `code` | varchar(20) UNIQUE NOT NULL | 약 코드. 처방·원외 처방전·재처방 경고가 이 코드로 같은 약을 찾습니다 |
| `name` / `name_en` / `generic_name` | varchar(200) | 화면에 보이는 이름은 `name`. `generic_name`은 약국 Stock 탭 검색·머리글에 씀. 셋 다 설정 약품 탭에서 입력 |
| `category` | varchar(50) | 설정 화면 선택지: Antibiotic, Analgesic, Antimalarial, Cardiovascular, GI, Vitamin, Other |
| `default_dose` | varchar(20) '1.000' | 처방할 때 들어가는 기본 1회량 (문자열). **결정 B(2026-09-29): 네 `default_*` 칸은 설정 화면에서 없앴고 쓰지 않음**(용량·횟수·일수는 약속처방에서). 칸은 남김 |
| `default_freq` / `default_days` | integer | 기본 횟수 / 일수 (결정 B: 쓰지 않음) |
| `default_route` | varchar(10) 'QD' | 기본 「경로」. 실제로는 `TID`·`BID`·`QD` 같은 복용 횟수 코드와 `IV`·`PO`·`INH`가 섞여 있습니다 |
| `unit_price` | decimal(12,2) | 단가. 처방할 때 처방 줄로 복사됩니다 |
| `stock_qty` | **integer** | 현재 재고. 조제 완료 때 줄고, 설정 화면에서 숫자를 직접 고칩니다 |
| `min_stock` | integer 10 | 이 수 **이하**면 약국 Stock 탭과 설정 약품 목록에서 빨간색. 0이나 비었으면 표시 안 함. 새 약은 서버가 비었을 때 10(`COALESCE`), 화면 기본값도 10 |
| `is_active` | boolean | 설정의 「삭제」는 `false`로 바꿀 뿐입니다 |
| `pack_unit` | boolean false | **포장 단위 약**(병·튜브로 줌) — `025_pharmacy_pack_unit.sql` |
| `pack_label` | varchar(10) | 그 단위: bottle · tube · inhaler · unit (`CHECK`) |
| `dosage_form` | varchar(30) | 제형 — 가져온 약만(403): Tablet · Capsule · Syrup · Suppository · Powder / Sachet · Vaginal / Gel · Topical · Ophthalmic. 화면 번역 `ph_form_*`. 설정 API는 아직 이 칸을 받지 않음(보기만) |
| `import_check` | jsonb | 가져올 때 남은 확인할 점 `[{k, d}]`(3.11). NULL = 없음 |
| `import_check_done_at` / `import_check_done_by` | timestamptz / staff id | 현지에서 「확인했음」을 누른 때·사람 |

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
| `pack_unit`, `pack_label` | 처방할 때 약에서 **복사**한 포장 단위 표시(402). 참이면 `total_qty`는 의사가 적은 병·개 수. 옛 줄은 `false` |

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

- **결정 B(2026-09-29 밤)**: 약에는 **기본 용량·횟수·일수·용법이 없습니다** — 목록 열과 편집 창의 네 칸을 없앴고, 저장 요청에도 싣지 않습니다(`saveEdit`이 뺌). 용량·횟수·일수는 약속처방에서. DB 칸(`default_*`)은 지우지 않고 쓰지 않음. 서버(`admin.routes.js` PUT)가 **안 온 칸을 그대로 두게** 하는 것은 설정 세션 몫 — 그 전의 서버는 안 온 칸을 NULL로 저장합니다(쓰지 않는 칸이라 영향 없음).
- 목록: 코드 · 약품명(옆에 제형) · 분류 · 단가 · 재고 (Code · Médicament · Catégorie · Prix unitaire · Stock). 재고가 **`min_stock` 이하**면 빨간색(`min_stock` 0이면 칠하지 않음 — 약국 Stock 탭 `belowMin`과 같은 규칙. 전에는 20 미만 고정). 검색 칸은 이름·코드.
- **+ 추가** (+ Ajouter) / **수정** (Modifier): 코드 · 이름 · 성분(`generic_name`) · 영어 이름(`name_en`) · 분류 · **제형(`dosage_form`, `DRUG_FORMS` 8가지, `drug-info.js`)** · 단가 · 재고(보기만) · 최소 재고(`min_stock`) · 포장 단위. 최소 재고는 0 이상 정수만(화면에서 내림), 서버도 정수 검사. 제형은 설정 API가 받게 되면 저장됩니다(설정 세션 몫, 그 전에는 보내도 무시됨).
  - 새 약 기본값: 분류 기타(Other), 제형 없음, 단가 0, 재고 0, 최소 재고 10
  - **분류는 영어 단어로 저장됩니다** — 17가지: Analgesic · Antibiotic · Antihistamine · Antimalarial · Antiparasitic · Cardiovascular · Corticosteroid · Dermatology · Endocrine · GI · Gynecology · Musculoskeletal · Ophthalmic · Respiratory · Urology · Vitamin · Other (`DRUG_CATEGORIES`, `Settings.jsx` 아래쪽). 2026-09-29에 7가지에서 늘렸습니다 — 병원의 실제 약 목록(옛 재고 프로그램 105줄)이 위장관·호흡기·피부 등으로 나뉘어 있어서입니다(대응표: `wiki/reference/drug-import-review.js` `CATEGORY`). 화면에만 번역(`ph_cat_*`)해서 보여줍니다. 시드 데이터와 통계의 분류별 묶음이 이 영어 값을 쓰기 때문입니다. 목록에 없는 값이 DB에 있으면 그대로 보입니다.
- **삭제** (Supprimer): 실제로는 비활성화. 목록에서 사라지고, 되살리는 화면은 없습니다.
- 탭 밖의 글자(왼쪽 탭 이름, 편집 창 제목, 삭제 확인)는 설정 세션이 번역했습니다(`se_tabDrugs`, `se_newTitle`, `se_confirmDelete`).
- 재고: 편집 창의 재고 칸은 **읽기 전용**, 새 약은 **0**으로 시작합니다(2026-09-29, 약국 화면 쪽). 재고는 약국 「Stock」 탭에서만 바뀌고 모두 기록에 남습니다(3.8절). 서버(`admin.routes.js` POST·PUT이 재고를 안 쓰게)는 설정 세션이 함께 바꿉니다. 그 전에도 편집 창이 재고를 보내지 않으므로(바뀌지 않은 재고는 `saveEdit`가 빼고 보냄) 설정 저장으로 재고가 바뀌지 않습니다. H4 안전장치(`stock_expected`)는 설정 세션 작업 뒤 필요 없어짐.
- **포장 단위 약**(H2-B, 2026-09-29): 편집 창 아래 체크 + 단위(`PACK_LABELS` bottle · tube · inhaler · unit, 번역 `ph_pack_*`). 켜면 단위 기본값 bottle, 끄면 단위 비움. 목록 이름 옆 표시. 저장은 `pack_unit`·`pack_label`을 보냄 — 서버(`admin.routes.js`)가 두 칸을 받는 것은 설정 세션 작업. 처방 줄이 이 값을 복사하고(진료), 총량 대신 의사가 적은 병·개 수를 저장합니다(설계: 인계 노트 「H2 포장 단위 약」).
- **가져온 약**(403, 3.11): 목록 이름 앞 ⚠(확인할 점이 남음, 마우스를 올리면 목록)와 이름 옆 제형. 편집 창에 확인할 점 목록(보기만 — 「확인했음」은 약국 Stock 탭에서).

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

- **H2. 시럽·흡입기·안약·연고처럼 「병·개」로 주는 약의 수량** — **세 몫 모두 들어옴, 끝에서 끝까지 확인함**(2026-09-29 결정 B; 약국 025·표시, 설정 `8594492`, 진료 `f79cc79`, 통계 `f08939d`). 확인 내용은 인계 노트 「포장 단위 약 끝에서 끝까지」. **남은 것**:
  - **단위가 바뀐 약의 재고·월말 보고서**: 재고 숫자와 기록 표에는 단위가 없습니다. 이미 쓰던 약을 포장 단위로 바꾸면 그 순간부터 같은 숫자를 병으로 읽고, 그 달 보고서의 「조제 출고」에 예전 단위와 병이 더해집니다(확인: 15 + 2병 = 17). 지금은 직원 안내(2.7: 바꾸면 바로 실사)로 막습니다. 화면·보고서 쪽 보완안은 인계 노트(결정 대기).
  - 약속처방 편집 창의 수량 칸(설정 세션), 수납 화면·영수증의 수량 옆 단위 말(수납 세션), 통계 합계 줄(19 (다)).
  - **후보(이번에 안 함)**: 약 표에 「복용 단위」(mL·번 뿌림·방울) 칸 — 지금은 포장 단위 약의 하루 총량이 숫자만 찍힘. 필요하면 의사가 메모에 단위를 적음.

### 보통

- **M6. 조제 취소가 없습니다** — **2026-09-29 결정: 만들지 않음**(재고 2번에서 조제 취소는 빼기로). 잘못 조제 완료했으면 약을 돌려받고 **📦 Stock → Inventaire** 로 재고를 맞춥니다(메모에 사유). 처방 줄은 「조제됨」으로 남습니다.

### 낮음

- **L6. 설정 약품 탭의 빈 곳** — **일부 해결**: 입력 칸 세 개(`min_stock`·`name_en`·`generic_name`)는 약국이 넣음(2026-09-29, 6절), 비었을 때 10은 설정 세션이 서버에서(`COALESCE`). **남은 것**: 삭제한 약은 되살릴 수 없고 같은 코드로 새로 등록도 안 됨(`code UNIQUE`) — 설정 세션 쪽.

### 해결됨

2026-09-29 수정. 무엇을 어떻게 고쳤는지는 3절, 확인 방법은 인계 노트에 있습니다.

- **L9. 목록 시각·순서가 진료 기록을 다시 저장하면 바뀌었습니다**(`consultation.updated_at`) → 진료 세션이 만든 `consultation.completed_at`(032, 처음 「완료」를 누른 때, 다시 저장해도 그대로)으로: 조제 대기 목록은 이 시각 오름차순, 환자 찾기의 지난 처방은 내림차순, 표시 시각도 이것. 032 전의 진료(값 없음)는 `updated_at`을 보이고 뒤로 갑니다(`pendingQuery`). 조제 완료 탭은 원래 **조제한 시각**으로 보이고 정렬하므로 그대로 둠.

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
- **M5. 재고 입출고 기록이 없었습니다** → 재고 기록(① 서버, ② 약국 「Stock」 탭, ③ 월말 보고서, 3.8~3.10절). 설정 약품 탭 재고 칸은 읽기 전용(약국 화면 끝, 설정 서버 작업 대기).
- **M4. 약국 화면에 재고가 보이지 않았습니다** → 「Stock」 탭에 약마다 지금 재고, 최소 재고 이하 빨간색. 조제 **전** 부족 경고는 지금대로 두기로 결정(조제 후 경고).
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
| 2026-09-29 | 재고 기록 ①: `stock_movement` 표(021), `moveStock`, 조제 자동 기록, 입고·실사·폐기 API, 라우트마다 권한 | `d806e14` (develop `a7c6c7b`) |
| 2026-09-29 | 재고 기록 ②: 약국 화면 「Stock」 탭(입고·실사·폐기·재고 기록), 직원용 2.6 | `529a8f1` (develop `b795852`) |
| 2026-09-29 | 재고 기록 ③: 월말 재고 보고서(화면 + CSV) | `d21e1d5` |
| 2026-09-29 | 시험 스크립트가 자기 시험 약(`TST-`)을 씀 | `481f242` |
| 2026-09-29 | 월말 보고서: 숨긴 약은 그 달 움직임이 있을 때만 | `8361494` |
| 2026-09-29 | L6: 약품 탭에 성분·영어 이름·최소 재고 입력, 목록 빨간색을 최소 재고 기준으로 | `d6820f8` |
| 2026-09-29 | 포장 단위 약 끝에서 끝까지 확인(H2), 단위를 바꾼 약은 바로 실사(2.7), 편집 창 분류 칸 폭 | `8638444` |
| 2026-09-29 | 옛 재고 목록 가져오기(403): 101개 약·예시 25개 숨김·opening 기록·확인할 점 표시와 「확인했음」, 제형 칸, 설정 편집 창의 빈 횟수·일수 | `6bc5c6d` |
| 2026-09-29 | 결정 B: 설정 약품 탭에서 기본 용량·횟수·일수·용법을 없앰(제형 고르기 추가), 가져오기에서 옛 용법 확인 뺌(63개). L9: 약국 목록을 진료 완료 시각(`completed_at`) 순으로 | 이 줄의 커밋 |
| 2026-09-29 | 설정 약품 탭: 재고 칸 읽기 전용·새 약 0, 「경로」 → 「용법」 | `14ff4be` |
| 2026-09-29 | H2-B ①: 포장 단위 약 칸(마이그레이션 025), 약품 탭 체크·단위 | `b335836` (develop `ce5d938`) |
| 2026-09-29 | H2-B ②: 포장 단위 줄 표시(rx-dosing · 약국 화면 · 원외 처방전), 대기·완료 목록에 pack 칸 | (이 커밋) |
