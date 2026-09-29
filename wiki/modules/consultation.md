# 진료 (Consultation)

> **담당**: 진료 세션 · 브랜치 `session/consultation` · **마지막 갱신**: 2026-09-29 · **상태**: 약 기본 용량 안 씀(결정 B) — 검색한 약은 빈 칸으로 시작 확인 요청

## 1. 이 모듈이 하는 일

의사가 접수된 환자를 한 명씩 불러 **진료 기록(자유 서술 SOAP)과 바이탈**을 쓰고, **약 처방**과 **검사·영상·처치 오더**를 내고, **완료**를 눌러 환자를 약국·임상병리·수납으로 넘기는 화면입니다.
그 밖에 한 화면 안에서 다음을 합니다.

- **약속처방(오더 세트)** — 미리 묶어 둔 약·검사를 한 번에 추가
- **문장사전** — 자주 쓰는 소견 문장을 진료 기록에 끼워 넣기
- **과거 내원** 기록 보기 (읽기 전용)
- **문서/의뢰서**(진료의뢰서) · **차트기록**(수술기록지 12종 + 수술 동의서) 작성·발급·재출력
- 이 환자의 **검사결과** 보기(임상병리 세션 부품) · 영상 **판독소견** 보기/쓰기(PACS 세션 부품)

**진단(ICD) 입력은 없습니다.** DB 테이블과 API는 있지만 화면에서 쓰지 않습니다 — **만들지 않기로 결정**(7절 ⑩, 2026-09-29).

공용 **문서 엔진**(`DocumentModal` · `documents/shared.jsx` · `documents/registry.js`)도 이 모듈이 주관합니다. 진료·수납·약국·임상병리·접수 5개 화면이 같이 씁니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR**로 바꿉니다.
> 대기 목록의 상태, 문장사전 분류, 검색 목록의 종류 표시, 바이탈 이름까지 화면 언어를 따릅니다. 약·검사는 **한 표**입니다(결정 29 — 나누지 않음). 첫 숫자 칸의 머리는 **Dose/j (일총투여)** 하나입니다.

### 2.1 환자 부르기

1. 맨 위 메뉴 줄에서 **Consultation (진료)**을 누릅니다. 진료 권한이 있는 계정에만 보입니다.
2. 왼쪽 위 **☰ File d'Attente (진료대기 현황)**를 누르면 오늘 환자 목록이 왼쪽에서 나옵니다. 괄호 안 숫자는 기다리는 환자 수입니다.
   - **En Attente (대기)** 탭: 아직 진료가 끝나지 않은 환자
   - **Terminé (완료)** 탭: 진료를 마친 환자
   - 의사 계정이면 **자기 앞으로 접수된 환자와 담당의가 없는 환자**만 보입니다.
   - 목록은 15초마다 저절로 새로 고쳐집니다. 위의 **Rechercher (검색)** 칸에 이름이나 차트번호를 치면 좁혀집니다.
3. 환자 이름을 누르면 진료가 시작됩니다. 접수 화면에서 이 환자는 「진료 중」으로 바뀝니다.
4. 오늘 목록에 없는 환자는 **🔍 Trouver patient (환자 찾기)**로 찾아 내원을 고릅니다. 이 창의 사용법은 접수 위키 [reception.md 2.7](reception.md)에 있습니다(여러 화면이 같이 쓰는 창).

환자를 부르면 화면 위 파란 줄에 차트번호·이름·성별/생년월일·진료과가 나옵니다. **알레르기가 있으면 빨간 ⚠**, 접수 메모가 있으면 📝로 함께 보입니다.

### 2.2 바이탈과 진료 기록 (가운데)

1. 바이탈 칸에 적습니다. 프랑스어 화면에서는 **TA** (BP, 혈압, `120/80`처럼) · **T°** (BT, 체온) · **FC** (PR, 맥박) · **FR** (RR, 호흡수) · **SpO2**입니다.
2. **Note de Consultation (진료 기록)** 칸에 S·O·A·P를 적습니다. 칸은 하나입니다.
3. 아래 **Dictionnaire (문장사전)**에서 문장을 누르면 진료 기록 맨 아래 줄에 붙습니다. 분류 버튼 **Tout (전체) · Général (일반) · Médecine (내과) · Chirurgie (외과) · Pédiatrie (소아) · Gynéco-obst. (산부인과)**과 **Rechercher** 칸으로 좁힐 수 있습니다. 설정에서 새로 만든 분류는 그 뒤에 이름 그대로 붙습니다. 설정에 프랑스어 문장(text_fr)이 적혀 있으면 프랑스어 화면에서는 그 문장이 보이고 그대로 들어갑니다.
4. **Sauver (저장)**를 누르면 기록과 바이탈이 저장됩니다.
5. **끝난 진료도 고칠 수 있습니다**(실장님 결정 ⑫, 2026-09-29). 다만 **Terminé (완료)**를 누른 진료나 **오늘이 아닌 날의 내원**을 고치면 누가 무엇을 어떻게 바꿨는지(전 값 → 새 값)가 **변경 기록**에 남습니다. 화면에는 아무 표시도 없고, 관리자만 설정에서 봅니다. 진료 중에 여러 번 저장하는 것은 남지 않습니다. 처방·오더를 지우거나 검사를 취소한 것은 진료가 끝났든 아니든 늘 남습니다.

### 2.3 Prescriptions — 처방과 검사 (왼쪽)

**넣기**

1. 입력 칸 위의 **Tout (전체) · Médicament (약품) · Examen / Imagerie (검사/영상)** 중에서 찾을 종류를 고릅니다.
2. **Saisir médicament, code examen ou nom... (약/검사 코드 또는 이름 입력...)** 칸에 코드나 이름을 **두 글자 이상** 치면 목록이 뜹니다. ↑↓로 고르고 **Enter**를 누르거나 마우스로 누르면 추가됩니다. Enter만 누르면 목록 맨 위 항목이 들어갑니다.
   - 목록 왼쪽의 종류 표시: 초록 **MÉD** (약), 노란 **LABO** (검사) · **ACTE** (처치) · **IMG** (영상). 영상 장비가 정해진 오더는 장비 이름(`US`, `CR` 등)이 나옵니다. 오른쪽 **WL**은 영상 장비로 바로 넘어가는 오더이고, 약은 오른쪽에 기본 용법(`TID` 등)이 보입니다.
   - 가격이 없는 항목에는 목록에서부터 노란 **Sans prix (가격 없음)**가 붙습니다.
3. 약은 **+ Recherche médicament (약 검색)** 버튼으로 전체 목록에서 골라도 됩니다.
4. 추가된 줄의 칸을 고치고 **다른 곳을 누르면 바로 저장**됩니다. Sauver를 누를 필요가 없습니다.
5. **검색으로 넣은 약은 하루 총량·횟수·일수·용법이 빈 칸으로 들어갑니다**(결정 B, 2026-09-29 — 약에는 가격만 정해 두고 용량은 정하지 않음). 의사가 모두 적습니다. 약속처방으로 넣은 약은 세트에 적힌 값이 들어갑니다. 빈 칸은 저장해도 빈 칸 그대로입니다(1로 채워지지 않음).

**약 칸 — 한국식으로 적습니다** (2026-09-29부터)

| 칸 (프랑스어 / 한국어) | 적는 것 | 예 |
|---|---|---|
| **Dose/j** (일총투여, en Daily) | 약 줄: **하루 총량**. 검사·처치·영상 줄: **수량**. 칸 머리와 약 줄의 칸에 마우스를 올리면 도움말이 나옵니다 | `3` = 하루 3정 |
| **Fois** (횟수) | 하루 **몇 번에 나눠** 먹는지 | `3` |
| **Jours** (일수) | 일수 | `7` |
| **Posologie** (용법) | TID · BID · IV 같은 용법 | `TID` |
| **Unité** (단위) | 메모 | |

- **총량 = 하루 총량 × 일수**입니다. 위 예는 21정입니다. 횟수는 총량에 들어가지 않고, 1회량(하루 총량 ÷ 횟수)을 계산하는 데만 씁니다. 약국 조제·수납·통계는 모두 이 총량을 씁니다.
- 약 이름 아래 작은 글씨로 **풀이**가 나옵니다: **1 cp × 3 fois/jour pendant 7 jours (total 21)** (한국어: 1회 1정 × 하루 3회, 7일 (총 21)). 약국 화면·원외처방전·의뢰서와 같은 문장입니다. 약 이름에 Tab·Cap·Sachet가 있으면 cp·gél.·sachet(정·캡슐·포)이 붙고, 반 알은 ½로 씁니다. **풀이를 읽어 보고 뜻한 양이 맞는지 확인하세요.**
- 검사·처치·영상 줄: **Dose/j (수량)** · Fois · Jours · **Posologie** (이 줄에서는 용량) · **Unité (메모·부위)**. **청구 = 수량 × 일수**, 횟수는 곱하지 않습니다(⑭, 2026-09-29 — 약과 같은 한국식). 주사 하루 1번 5일 = 1 · 1 · 5 → **5회 청구**, 이름 아래에 « facturé 5 fois » (5회 청구)가 보입니다. **검사 줄의 일수를 2로 적으면 2회 청구됩니다.**
- 검사·영상 오더는 넣을 때 **늘 1 · 1 · 1**로 들어가고 Posologie는 비어 있습니다(실장님 지시). 처치는 오더 코드에 기본 횟수·일수가 있으면 그 값, 없으면 1 · 1 · 1. 약속처방으로 넣어도 같은 규칙입니다.

**줄에 붙는 표시**

| 표시 (프랑스어 / 한국어) | 뜻 | 할 일 |
|---|---|---|
| 빨간 **Indiquez dose/jour, fois et jours** (하루 총량·횟수·일수를 넣으세요) | 하루 총량·횟수·일수 가운데 빈 칸이 있음. 하루 총량이나 일수가 비면 **총량이 없음** — 약국은 「Quantité totale absente」로 멈추고 수납 대기 목록에도 표시됨(0개·0원이나 「1일치」로 나가지 않음). 횟수가 비면 약 봉투 문장을 못 만듦 | **Dose/j · Fois · Jours**를 모두 적습니다. 검색으로 넣은 약은 늘 빈 칸으로 시작합니다 |
| **Quantité [ ] flacons** (수량 [ ] 병) — 약 이름 아래 | **포장 단위 약**(시럽·크림·흡입기 등, 설정의 약품 탭에서 표시한 약 — H2-B, 2026-09-29) | 병·튜브·개 **수**를 적습니다(1 이상의 정수). 이 수가 조제·청구되는 총량입니다. Dose/j(하루 총량)·Fois·Jours는 **복용 안내**로만 찍히고 총량 계산에 쓰지 않습니다(비워도 됨). 풀이 줄은 「15 par jour en 3 prises, pendant 7 jours — 2 flacons」 (하루 15, 3회로 나눠 7일 — 2병)처럼 보입니다 |
| 빨간 **Indiquez la quantité** (수량을 넣으세요) · 칸 빨간 테두리 | 포장 단위 약인데 병·개 수가 비어 있음. 이대로면 약국에서 「총량 없음」으로 멈추고 청구되지 않음 | 수량 칸에 수를 적습니다. 제목 옆에 「⚠ n flacon(s)/tube(s) sans quantité」, 진료를 끝낼 때도 한 번 묻습니다 |
| 노란 **Sans prix** (가격 없음) | 단가가 0 — 수납에서 0원으로 청구 | 설정에서 가격을 넣은 뒤 **그 줄을 ✕로 지우고 다시 넣습니다.** 이미 넣은 줄의 가격은 저절로 바뀌지 않습니다 |
| 노란 **⚠ dose par prise non divisible** (1회량이 나눠지지 않음) | 1회량이 반 알 단위로 떨어지지 않음(예: 하루 1포를 3번) — 풀이가 하루 양으로 나옴 | 뜻한 것이 맞는지 봅니다. 막지는 않습니다 |
| 노란 **total enregistré selon l'ancien calcul (nouveau calcul : 21)** (예전 계산으로 저장된 총량) | 2026-09-29 전에 예전 방식(용량 × 횟수 × 일수)으로 저장된 줄 | 그대로 두면 예전 총량이 그대로 유지됩니다(이미 청구·조제됨). 하루 총량·횟수·일수를 **실제로 고치면** 새 방식으로 다시 계산됩니다. 칸을 눌렀다 나오기만 해서는 바뀌지 않습니다 |
| 검사·영상 줄의 **✕** (결과가 있는데도) | 결과가 들어온 **검사** 오더, 판독이나 촬영이 있는 **영상** 오더 — 지우는 대신 「취소됨」으로 표시할 수 있음 (결정 3-B, 2026-09-29 · 영상은 PACS 합친 뒤 같은 날 켬) | 누르면 « … a déjà un résultat et ne peut pas être retiré. Le marquer comme annulé ? … » (결과가 있어 지울 수 없습니다. 「취소됨」으로 표시할까요?)라고 묻고 **이유(선택)**를 받습니다. 영상이면 « … a déjà un compte-rendu ou un examen réalisé … » (이미 판독이나 촬영이 있어 …)로 묻습니다. 결과는 기록으로 남고, 검사 목록과 청구에서 빠집니다. 영상은 영상·판독이 남고, 아직 촬영 전이면 장비의 촬영 목록(워크리스트)에서도 빠집니다. 이미 수납했으면 수납에서 환불(정정)이 뜹니다. **되돌릴 수 없습니다** — 잘못 취소했으면 오더를 다시 냅니다 |
| 회색·줄 그음·**⊘** · 상태 **Annulé** (취소됨) | 취소된 검사·영상 오더 | 고치거나 지울 수 없습니다. ⊘에 마우스를 올리면 이유가 보입니다 |
| **🔒** (✕ 자리) | 고치거나 지울 수 없는 줄. 마우스를 올리면 이유가 나옴 | 약: 약국이 이미 내준 약입니다. 오른쪽 끝에 **Délivré (조제됨)**가 보이고 칸이 글자로 바뀝니다. 바꿔야 하면 약국에 알리고 새 줄로 처방합니다. 처치: 결과가 적혀 있습니다. 수량·메모는 고칠 수 있지만 줄은 못 지웁니다(검사·영상은 위의 ✕로 취소) |

제목 **Prescriptions** 옆에는 **⚠ N sans dose/jour, fois ou jours** (하루 총량·횟수·일수가 빈 약 N개), **⚠ N flacon(s)/tube(s) sans quantité** (수량 없는 포장 약 N개), **⚠ N sans prix** (가격 없는 항목 N개)가 개수로 나옵니다.

**줄 오른쪽 끝 상태 칸**

| 줄 | 보이는 글자 (한국어) |
|---|---|
| 약 | **Délivré** (조제됨) |
| 검사 | **En attente** (결과 대기) · **Résultat reçu** (결과 있음) · **Annulé** (취소됨) |
| 영상 | **Envoyé** (전송됨) · **En cours** (촬영 중) · **Réalisé** (촬영 완료) · **Annulé** (취소됨) |
| 처치 | 비어 있음 |

**검사·영상 결과는 저절로 반영됩니다.** 환자를 열어 둔 채로 있어도 검사실이 결과를 넣거나 촬영이 끝나면, 30초 안에 상태 칸이 바뀌고, 줄 맨 앞 ✕는 「지우기」 대신 「취소됨으로 표시」를 묻게 됩니다(위 표). 적고 있던 칸은 지워지지 않습니다.

**지우기와 영상 보기**

- 줄 맨 앞 빨간 **✕**를 누르면 **Retirer « … » ?** (「…」을(를) 지울까요?)라고 묻습니다. **OK**를 눌러야 지워지고, 지운 줄은 되살릴 수 없습니다.
- 영상 줄의 **🖼 (Voir image, 영상보기)**를 누르면 **Visionneuse (영상 뷰어)**와 판독 칸이 열립니다.
  - 영상 위에 **빨간 ⚠**가 뜨면 영상에 **다른 환자**의 번호·이름이 적혀 있다는 뜻이고, **노란 ⚠**는 영상에 환자번호가 **없다**는 뜻입니다. 어느 쪽이든 **영상 속 환자 정보를 먼저 확인한 뒤** 판독하세요.
  - 판독은 오른쪽 칸에 쓰고 **💾 Enregistrer (판독 저장)**을 누릅니다.
  - 위에 **⊘ Images d'une demande annulée …** (취소된 오더의 영상입니다 …)와 이유가 보이면 **취소된 영상 오더**입니다. 영상과 판독은 볼 수 있지만 판독 칸은 글자로만 보이고 저장 단추가 없습니다.
  - 영상 자리에 **Cette demande d'imagerie n'a pas été envoyée à la liste de travail …** (촬영 목록으로 보내지 않아 연결된 영상이 없습니다)가 보이면 이 오더에는 영상이 없습니다. 판독만 쓸 수 있습니다. **뷰어 주소가 설정되지 않았다**는 안내는 설정에 뷰어 주소가 비었을 때만 나옵니다.

### 2.4 Ordonnances types — 약속처방 (오른쪽)

1. 오른쪽 위 **Ordonnances types (약속처방)** 탭을 누릅니다.
2. 📁 묶음 이름을 누르면 그 안의 세트가 펼쳐집니다.
3. 세트를 누르면 그 안의 약·검사가 **모두** 지금 진료에 들어갑니다. 필요 없는 줄은 ✕로 지웁니다.
   - 세트 카드의 코드 목록에서 **줄이 그어진 약**은 약 목록에서 감춘 약입니다. **실제 약 목록을 가져온 뒤에는 예시 약 25개가 모두 감춰지므로, 지금 있는 세트(Malaria Workup·Diarrhea / GE 등)의 약 줄은 전부 줄이 그어지고 검사 줄만 들어갑니다** — 세트의 약 줄은 설정에서 새 약으로 바꿔 주세요(2026-09-29 격리에서 확인). 세트를 눌러도 그 약은 들어가지 않고, 「Non ajouté(s) - retiré(s) de la liste des médicaments : … (목록에서 감춘 약이라 넣지 않았습니다: …)」라고 알려 줍니다. 필요하면 다른 약을 직접 찾아 넣으세요. 검사·처치 줄은 그대로 들어갑니다.
   - 세트를 만들거나 고치는 것은 **Paramètres (설정)**의 약속처방 탭에서 합니다(설정 권한 필요).
   - **포장 단위 약**(시럽 등)은 세트 줄의 수량(`quantity`, 없으면 1)이 병·개 수로 들어갑니다.

### 2.5 Visites passées — 과거 기록 (오른쪽)

1. **Visites passées (과거 내원)** 탭에 이 환자의 지난 진료가 날짜순으로 나옵니다.
2. 날짜를 누르면 가운데에 그날의 바이탈·진료 기록·처방이 **Dossier passé · lecture seule (과거 기록 · 읽기 전용)**으로 나옵니다.
3. **← Retour à l'actuel (← 현재 진료로)**를 누르면 오늘 진료로 돌아옵니다.

### 2.6 진료 끝내기

- 가운데 위의 초록 **Terminé (완료)**를 누르면 기록과 바이탈을 한 번 더 저장하고 진료를 끝냅니다. 환자는 대기 목록에서 빠집니다. (대기 목록 서랍에도 같은 이름의 **Terminé** 탭이 있으니 헷갈리지 마세요.)
- 하루 총량이 빈 약, 수량이 빈 포장 약이 있으면 누를 때 한 번씩 묻습니다(2.12).
- **약국과 수납**은 완료를 눌러야 이 환자를 봅니다. **검사실**은 검사를 넣는 순간부터 보고(완료 전에도), **영상**은 넣는 순간 촬영실로 넘어갑니다.
- 완료한 환자도 대기 목록의 **Terminé** 탭에서 다시 열어 고칠 수 있습니다. 약을 더 넣으면 약국에 다시 나타납니다.

### 2.7 파란 줄의 버튼

| 버튼 | 하는 일 |
|---|---|
| **📋 Sélection visite (외래 내역 선택)** | 이 환자의 다른 내원을 골라 엽니다. 지난 내원도 고칠 수 있는 상태로 열립니다(실장님 결정 ⑫ — 읽기 전용으로 바꾸지 않음). 끝난 진료나 지난 날의 기록을 고치면 변경 기록에 남습니다(2.2의 5번) |
| **📄 Documents (문서/의뢰서)** | 의뢰서(Lettre de référence) 작성·발급 — 2.10 |
| **🧪 Résultats labo (검사결과)** | 이 환자의 검사 결과 전체 |
| **🩻 Compte-rendu (판독소견)** | 이 환자의 영상 판독 목록. 누르면 영상 뷰어가 열립니다 |
| **📋 Dossier (차트기록)** | 수술기록지 12종과 수술 동의서 작성·발급 — 2.8 |

### 2.8 수술기록지 쓰는 순서

1. 환자를 부른 뒤 파란 줄의 **📋 Dossier (차트기록)**를 누릅니다. **Dossier clinique** 창이 열립니다.
2. 창 오른쪽 위 **Langue (언어)**에서 **FR**을 고릅니다. 기록지 글자, 체크 칸 이름, 그림 글자가 모두 프랑스어가 됩니다(예: `3 h`, `Oui`, `Marisque`, 시계의 `D`·`G`).
   - 저장되는 내용은 언어와 관계없이 같습니다. 나중에 다른 언어로 다시 인쇄해도 됩니다.
3. 왼쪽 **Formulaires (서식)**에서 수술에 맞는 양식을 고릅니다.
   - **Compte-rendu opératoire** (공통)
   - **Note op. - Masse des tissus mous** (연부조직) · **- Hernie** (탈장) · **- Appendicite** (충수) · **- Sein** (유방) · **- Hémorroïdes** (치질) · **- Fistule anale** (치루)
   - **Suture de plaie** (열상 봉합) · **Incision et drainage** (절개 배농) · **Césarienne** (제왕절개) · **Circoncision** (포경)
   - **Consentement chirurgical** (수술 동의서)
4. 가운데 **Saisie (내용 입력)**를 위에서부터 채웁니다. 오른쪽 미리보기가 바로 바뀝니다.
   - **Date opératoire (수술일)**는 비어 있으니 꼭 적습니다.
   - **Intervention (수술명)** · **Diagnostic pré-op / post-op (술전·술후 진단)** · **Anesthésie (마취)**에는 양식마다 흔한 값이 미리 들어 있습니다. 실제와 다르면 고칩니다.
   - **Chirurgien (집도의)**에는 담당 의사 이름이 미리 들어 있습니다.
   - **체크 칸**
     - 칸을 고르면 인쇄되는 그림에 바로 표시됩니다. 치질·치루는 시계, 유방은 사분면, 탈장·충수는 병원 그림에 표시됩니다.
     - **하나만 고르는 칸**(예/아니오, 부위, 충수 상태, 삼출액 양)은 다른 것을 고르면 앞의 체크가 저절로 풀립니다.
     - **Néant (없음)**을 고르면 같은 칸의 다른 체크가 풀리고, 다른 것을 고르면 Néant가 풀립니다(Drain JP, Lésion associée).
     - 치루의 **Type de trajet (치루 유형)**는 여러 개 고를 수 있고, 그림에 선 모양(실선·점선)을 달리해 모두 그려집니다.
   - **크기 칸** `×  ×  cm`는 숫자만 채워 넣습니다. 숫자를 안 적으면 그 줄은 인쇄되지 않습니다.
   - **Compte-rendu opératoire (수술 소견/술기)**에는 기본 문장이 들어 있습니다. **`[ ]` 대괄호 부분은 실제 내용으로 바꿔 쓰고 괄호도 지웁니다.** 예: `Under [anesthesia]` → `Under spinal anesthesia`. 괄호가 남아 있으면 칸 아래 노란 **⚠ À compléter (아직 고치지 않은 칸)**에 남은 괄호가 보입니다.
   - 아래 **Compte des compresses (거즈 카운트)** 등 안전 확인 칸과 **Complications (합병증)**, **Plan post-opératoire (술후 계획)**도 채웁니다.
5. 미리보기를 끝까지 내려 한 번 읽어 봅니다.
6. **Émettre (발급(저장))**를 누릅니다. 발급번호(`D26-00001` 형식)가 붙어 저장되고, 창은 발급된 문서 보기로 바뀝니다. 괄호가 남아 있으면 먼저 물어봅니다(2.9).
7. **🖨 Réimprimer (재출력)**로 인쇄하고 서명합니다.
   - 발급하지 않고 **🖨 Imprimer (출력)**만 누르면 번호 없이 **BROUILLON (미발급 초안)**으로 인쇄되고 기록이 남지 않습니다. 서명용으로 쓰지 마세요.

### 2.9 발급 전 [괄호] 경고가 뜨면

**Émettre**를 눌렀는데 **Il reste des champs [ ] à compléter : … Émettre quand même ?** (아직 고치지 않은 [ ] 칸이 있습니다 … 그래도 발급할까요?)라고 물으면, 소견 등에 `[anesthesia]` 같은 **고쳐 써야 할 자리가 아직 남아 있다**는 뜻입니다.

1. **Annuler (취소)**를 누릅니다(이 창의 단추는 브라우저가 만들어서, 브라우저 언어에 따라 **Cancel**로 보일 수 있습니다). 발급되지 않고 입력 화면으로 돌아옵니다.
2. 노란 **⚠ À compléter** 줄이 있는 칸을 찾습니다. 그 줄에 남은 괄호가 모두 적혀 있습니다.
3. 괄호 부분을 실제 내용으로 바꾸고 괄호를 지웁니다. 해당 없는 부분은 문장째 지웁니다. 예: 시톤을 넣지 않았으면 `[seton placed];`를 지웁니다.
4. 노란 줄이 사라지면 다시 **Émettre**를 누릅니다. 이번에는 묻지 않고 발급됩니다.

> 괄호 안이 정말 그대로 인쇄되어야 하는 내용이면 **OK**를 눌러 그대로 발급해도 됩니다. 이 경고는 막지 않고 묻기만 합니다. 원외처방전·의뢰서도 발급할 때 같은 방식으로 묻습니다.

### 2.10 Documents — 의뢰서

1. 파란 줄의 **📄 Documents (문서/의뢰서)**를 누르면 **Émettre un document (문서 발급)** 창이 열리고 **Lettre de référence (진료의뢰서)**가 선택되어 있습니다.
2. **Destinataire (수신 기관/의사)** · **Diagnostic (진단명)** · **Motif de la référence (의뢰 목적)**을 적습니다.
3. **État du patient et observations (환자 상태 및 진료 소견)**에는 진료 기록이, **Traitement / médication en cours (현재 치료/투약)**에는 오늘 처방이 미리 들어 있습니다. 필요하면 고칩니다.
4. **Émettre**로 발급하고 **🖨 Réimprimer**로 인쇄합니다(2.8의 6·7번과 같음).

### 2.11 발급 이력 · 다시 인쇄 · 발급 취소

- 문서 창 오른쪽 **Historique (발급 이력)**에 이 환자에게 발급한 문서가 최근 것부터 나옵니다. 누르면 그 문서가 열리고 **🖨 Réimprimer**로 다시 인쇄할 수 있습니다.
- 잘못 발급한 문서는 열어서 **Annuler (발급 취소)**를 누르고 사유(**Motif d'annulation**)를 적습니다.
  - 문서는 지워지지 않습니다. **ANNULÉ (취소됨)** 도장이 찍힌 채 이력에 남습니다.
  - 고친 문서는 **+ Nouveau (새 문서)**로 다시 만듭니다.
- 이력의 문서를 다른 언어로 보려면 위 **Langue**의 FR · EN · KO를 누릅니다.

### 2.12 이런 안내가 뜰 때 · 막힐 때

확인 창의 단추(**OK / Annuler**)는 브라우저가 만들어서, 브라우저 언어에 따라 **OK / Cancel**로 보일 수 있습니다.

| 이런 안내 (프랑스어 / 한국어) | 언제 | 이렇게 |
|---|---|---|
| **Retirer « … » ?** (「…」을(를) 지울까요?) | 줄의 ✕를 눌렀을 때 | 지울 줄이 맞으면 OK. 되살릴 수 없습니다 |
| **La pharmacie a déjà délivré ce médicament…** (약국에서 이미 조제한 약은 고치거나 지울 수 없습니다…) | 화면을 열어 둔 사이에 약국이 조제한 약을 고치거나 지우려 할 때 | 표가 새로 고쳐지고 그 줄에 🔒가 붙습니다. 바꿔야 하면 약국에 알리고 새 줄로 처방합니다 |
| **« … » a déjà un résultat et ne peut pas être retiré. Le marquer comme annulé ? … Motif (facultatif) :** (결과가 있어 지울 수 없습니다. 「취소됨」으로 표시할까요? … 취소 이유 (선택):) | 결과가 들어온 **검사** 줄, 판독·촬영이 있는 **영상** 줄의 ✕를 눌렀을 때(화면을 여는 사이에 결과가 들어온 경우 「Retirer ?」 다음에). 영상이면 « … a déjà un compte-rendu ou un examen réalisé … Les images et le compte-rendu restent au dossier et restent consultables dans la visionneuse … »로 묻습니다 | 취소하려면 이유를 적거나 비운 채 **OK**. 그만두려면 **Annuler** |
| **Cette demande a déjà un résultat…** (결과가 이미 있는 오더는 지울 수 없습니다) | 결과가 적힌 처치 줄을 지우려 할 때 | 지울 수 없습니다 |
| **Cet examen d'imagerie a été annulé en consultation : le compte-rendu ne peut pas être enregistré.** (진료실에서 취소되어 판독을 저장할 수 없습니다) | 영상 창을 열어 둔 사이에 그 오더가 취소되었을 때 판독 저장 | 확인을 누르면 창이 취소된 모습으로 다시 열립니다 |
| **Une demande annulée ne peut pas être modifiée.** (취소된 오더는 고칠 수 없습니다.) | 다른 곳에서 취소된 오더를 고치려 했을 때 | 표가 새로 고쳐집니다 |
| **N médicament(s) avec dose/jour, fois ou jours vides : … Terminer quand même la consultation ?** (하루 총량·횟수·일수가 빈 약이 N개 있습니다 … 그래도 진료를 완료할까요?) | 빈 칸이 있는 약이 있는데 Terminé를 눌렀을 때 | 보통은 **Annuler**를 누르고 빈 칸을 채웁니다. 그대로 끝내면 총량이 없는 약은 약국에서 조제되지 않고 수납에서도 멈춥니다 |
| **N médicament(s) sans quantité (flacons/tubes/unités) : … Terminer quand même la consultation ?** (수량이 없는 포장 약이 N개 있습니다 … 그래도 진료를 완료할까요?) | 병·튜브 수가 빈 포장 약이 있는데 Terminé를 눌렀을 때 | **Annuler**를 누르고 약 이름 아래 Quantité 칸에 수를 적습니다. 그대로 끝내면 약국에서 「총량 없음」으로 멈춥니다 |
| **La quantité est un nombre entier d'au moins 1 (pas de demi-flacon).** (수량은 1 이상의 정수로 적습니다) | 포장 약의 수량에 0이나 1.5를 적었을 때 | 표가 새로 고쳐집니다. 1, 2, 3처럼 적습니다 |
| **Non ajouté(s) - retiré(s) de la liste des médicaments : …** (목록에서 감춘 약이라 넣지 않았습니다: …) | 약속처방을 눌렀는데 그 안에 목록에서 감춘 약이 있을 때 | 그 약은 들어가지 않았습니다. 필요하면 다른 약을 직접 찾아 넣습니다. 세트 카드에서 그 약은 줄이 그어져 있습니다 |
| **Il reste des champs [ ] à compléter : … Émettre quand même ?** (아직 고치지 않은 [ ] 칸이 있습니다…) | 문서를 발급할 때 `[anesthesia]` 같은 괄호가 남아 있으면 | 2.9를 봅니다 |
| **Le navigateur a bloqué la fenêtre d'impression…** (팝업이 차단되어 인쇄할 수 없습니다…) | 🖨를 눌렀는데 인쇄 창이 안 뜰 때 | 주소창 오른쪽의 팝업 차단 표시를 눌러 이 사이트를 허용하고 다시 누릅니다 |
| 영상 위 빨간 **⚠ Les images sont au nom de « … »** / 노란 **⚠ Les images ne portent aucun numéro de patient** | 영상이 다른 환자 이름으로 왔거나 환자번호가 없을 때 | 판독하기 전에 영상 속 환자 정보를 먼저 확인합니다 |
| **Cette visite a été annulée à l'accueil : la consultation ne peut pas être ouverte.** (접수에서 취소된 내원입니다. 진료를 열 수 없습니다.) | 「Sélection visite」나 「Trouver patient」로 취소된 내원을 골랐을 때 | 취소된 내원은 열리지 않습니다. 진료가 필요하면 접수에서 새로 접수합니다 |
| **Erreur : …** (오류: …) | 저장이 서버에서 거절되었을 때 | 적은 값(숫자 칸에 글자 등)을 확인하고 다시 합니다. 되풀이되면 실장님께 화면을 보여 주세요 |

| 이럴 때 | 이렇게 |
|---|---|
| 대기 목록에 환자가 없다 | 서랍의 **Terminé** 탭에 있는지 봅니다. 의사 계정은 다른 의사 앞으로 접수된 환자가 안 보입니다. 오늘 접수가 아니면 **Trouver patient**로 찾습니다 |
| 약국이 환자를 못 본다 | 진료를 초록 **Terminé**로 끝냈는지 확인합니다 |
| 설정에서 약 가격을 넣었는데 여전히 **Sans prix** | 이미 넣은 줄은 넣을 때의 가격을 씁니다. 그 줄을 지우고 다시 넣습니다 |
| 풀이가 뜻과 다르다 (예: 하루 12정이라고 나옴) | Dose/j는 **하루 총량**입니다. 1회량이 아니라 하루 전체 양을 적었는지 봅니다 |

## 3. 기능 상세

### 3.1 화면 구조 — `frontend/src/pages/Consultation.jsx` (732줄, 함수 컴포넌트 하나)

세 칸 + 환자 막대 + 모달들입니다.

| 부분 | 줄 | 내용 |
|---|---|---|
| 환자 막대 | 392-406 | 선택한 내원(`sel`) 정보, 모달 여는 버튼 5개 |
| 대기 서랍 | 410-436 | `filteredQueue` (356-363). 대기 탭 = status `waiting`·`registered`·`in_progress`. role이 `doctor`면 `doctor_id`가 없거나 자기인 것만 |
| 왼쪽 42% | 438-534 | 오더 입력(자동완성) + 처방·오더 표 |
| 가운데 | 536-591 | 바이탈 5칸, 저장/완료, 진료 기록 textarea, 문장사전 |
| 오른쪽 28% | 593-641 | 과거 내원 / 약속처방 탭 |
| 모달 | 644-729 | 약 검색, PatientFinder ×2, DocumentModal ×2(`document`, `chart`), 검사결과(`LabResults`), 영상 뷰어+판독, 판독 목록(`RadiologyReadings`) |

**상태 흐름**

- 첫 로드 `loadData()` (75-89): `/visits/today`, `/admin/drugs`, `/admin/order-codes`, `/admin/phrases`, `/order-sets`를 **순서대로** 받아 둡니다. 자동완성은 전부 브라우저 안에서 거릅니다(서버 검색 없음). 약속처방은 **진료과 필터 없이 전부** 받습니다(API는 `?department_id=`를 지원).
- `pickPatient(v)` (91-112): `POST /consultations`로 진료를 **열거나 새로 만들고**, 처방·오더·환자 이력을 받습니다. 바이탈은 저장된 것을 모두 채웁니다. 전에는 `bp_systolic`이 있을 때만 채워서, 혈압 없이 저장된 체온·맥박이 화면에 안 나오고 **다음 저장 때 지워졌습니다**(작은 흠으로 적어 두었던 것이 실제로는 기록 손실 — 변경 기록 시험에서 드러나 2026-09-29 고침).
- `saveNote()` (165-180) · `completeConsult()` (182-201): `note_text`와 바이탈만 보냅니다. 완료는 저장 → `PUT /:id/complete` → `loadData()` 순서입니다. *저장을 안 누르고 완료해도 기록이 날아가지 않게* 완료가 먼저 저장합니다.
- 처방·오더 줄은 **추가할 때 바로 서버에 INSERT**되고(`addDrugRx`, `addExamOrder`), 칸을 고치면 `onBlur`에서 PUT(`saveRx`, `saveOrder`), ✕는 `confirmRemove`(이름을 넣은 확인 창) 후 DELETE입니다. 「저장」 버튼과 무관합니다.
- **오더 줄의 상태 칸**(WL 칸, `orderStatus(o)`): 검사 오더(`code_type='lab'`)는 임상병리의 `o.status`를 「결과 대기 / 결과 있음 / 취소됨」(`cs_labPending`·`cs_labDone`·`cs_labCancelled`)으로, 워크리스트로 간 오더(`worklist_sent_at` 있음)는 `worklist_status`를 그대로, 그 밖의 오더는 비웁니다. 워크리스트 없는 오더는 만들 때 `worklist_status='completed'`로 저장되어, 전에는 검사 결과가 들어오기도 전에 「completed」로 보였습니다(임상병리 위키 7절 9, 2026-09-29). 워크리스트 상태도 번역 키로 보여 줍니다 — `pending`·`sent`·`in_progress`·`completed`·`cancelled` → `cs_wsPending`·`cs_wsSent`·`cs_wsInProgress`·`cs_wsCompleted`·`cs_wsCancelled`(PACS 부탁 P-19, 2026-09-29). 과거 보기(`renderPast`)도 같은 `orderStatus`를 씁니다.
- **오더 진행 상태 자동 반영**(2026-09-29): 검사실이 진료 중에도 오더를 보게 되어(임상병리 `1d4c239`) 환자를 열어 둔 사이에 결과가 들어올 수 있습니다. 진료가 열려 있고 결과 없는 검사 오더나 끝나지 않은 워크리스트 오더가 있으면, **30초마다** `GET /consultations/:id/orders`를 다시 읽어 **진행 칸만**(`status`·`result_at`·`result_by`·`result_text`·`worklist_status`·`worklist_sent_at`, `ORDER_PROGRESS_FIELDS`) 화면의 줄에 덮어씁니다. 의사가 적고 있는 수량·메모는 건드리지 않고, 줄을 더하거나 빼지 않습니다. 탭이 숨겨져 있으면(`document.hidden`) 읽지 않습니다. 상태 칸과 🔒(`orderLocked`)가 이 칸들로 정해지므로 같이 바뀝니다. 검사결과 창(`LabResults.jsx`, 임상병리 부품)은 열 때 읽으므로 이것과 별개입니다.
- **화면 크기**(2026-09-29, 위키 2절 따라 하기): 바이탈 칸은 가운데 칸이 좁으면(작은 화면) 한 줄에 하나씩(`auto-fill`, 칸마다 최소 118px) — 두 줄 고정일 때 800px 폭에서 입력 칸이 실처럼 좁아졌습니다. 처방 표의 횟수·일수 칸은 `inputMode="numeric"` 글자 칸(숫자 칸의 스핀 단추가 27px 칸의 숫자를 가렸음). 대기 목록 줄의 「차트번호 · 진료과 · 담당의」는 빈 값을 뺍니다(「26-00002 · ·」이던 것).
- **검사·영상 오더 취소**(결정 3-B, 영상은 38-③): 파일 위쪽 `cancellable(o)` = 검사·영상(`code_type` `lab`·`imaging`) · 취소 전 · `orderLocked`. 그런 줄의 ✕는 `cancelOrder(o)` — `window.prompt`(검사 `cs_cancelPrompt`, 영상 `cs_cancelPromptImg`, 이유 선택, Annuler면 아무것도 안 함) 뒤 `POST /order/:id/cancel`, 응답 줄로 바꿈. 화면이 그린 뒤 결과가 들어온 줄은 보통 ✕ → 「Retirer ?」 → `DELETE` 409 → `removeOrder`가 검사·영상 줄이면 `cancelOrder`로 넘깁니다. 상태 칸(`orderStatus`)은 종류와 관계없이 취소를 먼저 봅니다(취소된 영상의 워크리스트가 `completed`로 남아 있어도 「취소됨」). 30초 새로 고침은 취소된 오더를 기다리지 않습니다. 취소된 줄(`status='cancelled'`)은 흐리게·줄 긋고 입력 칸 대신 글자, ✕ 자리에 ⊘(도움말 `cancelTitle` = 「취소됨 — 이유」). `orderLocked`는 취소도 잠금으로 보고, 가격 없음 개수에서는 뺍니다. `PUT` 거절 문구 `Order is cancelled`는 `LOCK_MESSAGES`로 `cs_orderIsCancelled`.
- **잠긴 줄**(2026-09-29, 7절 ⑧⑨): 처방은 `rx.status === 'dispensed'`면 입력 칸 대신 글자로 그리고 ✕ 대신 🔒, WL 칸에 `cs_dispensed`. 오더는 파일 위쪽의 `orderLocked(o)`가 서버 규칙을 흉내 냅니다 — `o.status === 'completed'`(임상병리는 값이 하나라도 있어야 완료로 바꿈) 또는 `result_text`가 있음 또는 `worklist_sent_at`이 있고 `worklist_status`가 `in_progress`·`completed`. `worklist_sent_at`을 보는 이유: 워크리스트 없는 오더는 처음부터 `worklist_status='completed'`로 저장되기 때문. 오더는 줄 삭제만 막고 칸 수정은 그대로 둡니다(수량이 바뀌면 수납이 추가 청구/환불로 잡음).
- 서버가 거절하면(화면이 열린 사이 약국·검사가 진행한 경우) `lockAlert`가 서버의 영어 문구를 `LOCK_MESSAGES`로 번역 키에 맞춰 알리고 `reloadItems()`로 처방·오더를 다시 읽습니다. **이 문구는 `consult.routes.js`의 `RX_DISPENSED`·`ORDER_HAS_RESULT`와 글자까지 같아야 합니다** — `api/client.js`가 오류 본문 중 `error` 문자열만 넘겨주기 때문(공용 파일이라 고치지 않음).
- **약 총량**(2026-09-29 실장님 결정, 7절 ㉔): 입력은 한국식 — `dose` = 하루 총량, `frequency` = 하루 몇 번에 나누는지, `days` = 일수. **총량은 화면이 계산하지 않고 서버가 계산합니다**(`consult.routes.js` `rxTotal` = 하루 총량 × 일수). 화면은 `total_qty`를 보내지 않고 응답 줄을 그대로 씁니다. 풀이 줄은 **약국 세션의 공용 파일 `documents/rx-dosing.js`**를 씁니다(2026-09-29 정리). 컴포넌트 안 `rxLine(rx)`는 `doseSentence(rx, lang)`(저장된 총량으로 쓴 문장)을 보여 주고, `perDose(rx).clean`이 거짓이면 앞에 ⚠ `cs_rxUnevenFlag`, `isLegacyTotal(rx)`이면 뒤에 `cs_rxLegacy`(새 식 총량)를 붙입니다. 그래서 진료 화면·약국 화면·원외처방전·의뢰서·수납의 환자 차트(`PatientChart.jsx`)가 같은 문장을 씁니다. 0.5 규칙과 「예전 계산」 판정(저장된 총량 ≠ 하루 총량 × 일수, 소수 셋째 자리)도 그 파일 하나에 있습니다. 진료 쪽의 옛 키 `cs_rxBreakdown`·`cs_rxUneven`은 지웠고, **`cs_rxStoredTotal`은 수납의 `PatientChart.jsx`가 쓰므로 남겨 둡니다.** 하루 총량 칸의 `title`은 `cs_doseHint`, 머리 「Usage」는 `cs_colSig`(용법 / Sig. / Posologie). 과거 보기(`renderPast`)도 같은 풀이를 씁니다.
- **스치기만 한 저장은 보내지 않음**: `savedRx`(useRef)에 줄마다 서버가 마지막으로 돌려준 `dose·frequency·days·route·memo`를 기억하고(`rememberRx` — 불러올 때·추가·저장 응답), `saveRx`는 값이 그대로면 요청하지 않습니다. 이유: 칸이 포커스를 잃을 때마다 저장하므로, 예전 식으로 저장된 줄이 눌렀다 나오기만 해도 다시 계산되어 이미 수납한 내원에 환불이 뜨게 됩니다. 서버도 같은 이유로 바뀐 줄만 다시 계산합니다(3.2). 기본 용법이 없는 약에 `'TID'`를 넣던 코드는 없앴습니다(7절 ⑮).
- **가격 0 표시**(2026-09-29): 파일 위쪽 `noPrice(v)`(`parseFloat(v) > 0`이 아니면 참). 처방 줄은 `rx.unit_price`(단, 약국이 원외로 돌린 `dispense_type='external'` 줄은 청구되지 않으니 빼고), 오더 줄은 `o.unit_price`, 검색 목록은 넣을 때 쓸 가격(약 `unit_price`, 오더 `price_clinic || price` — `addExamOrder`와 같은 값)을 봅니다. 컴포넌트 안 `NoPriceBadge`(`cs_noPrice`, 도움말 `cs_noPriceHint`)와 제목 옆 개수 `noPriceCount`(`cs_noPriceCount`). 이유: 실제 약 목록 105줄을 가격 없이 가져오기로 해서, 가져온 직후엔 모든 약이 0원입니다. 막지 않는 이유: 무료 항목이 있을 수 있음.
- **하루 총량 없음 표시**(2026-09-29, 약국이 찾은 빈틈): 파일 위쪽 `noDose(rx)`(`dose`가 0보다 크지 않거나 `days`가 0보다 크지 않음). 줄 `NoDoseBadge`(`cs_noDose`, 도움말 `cs_noDoseHint`), 제목 옆 `noDoseRows.length`(`cs_noDoseCount`), `completeConsult` 첫머리의 `window.confirm`(`cs_noDoseConfirm`, 약 이름 나열 — 취소하면 완료하지 않음). 서버는 그대로(총량 0 저장). 이유: `rxTotal`이 하루 총량 없으면 0을 저장하고, 0은 조제·청구를 조용히 통과합니다. 약국은 총량 0을 「총량 없음」으로 표시합니다(약국 세션).
- `applySet(set)` (317-333): 세트 항목을 **하나씩 차례로** `addExamOrder`/`addDrugRx`에 넘깁니다. 한 항목이 실패하면 alert 후 다음 항목을 계속합니다. 단가는 세트 저장 값이 아니라 **지금의 약품·오더코드 단가**(`orderset.routes.js` `attachItems`)입니다. **감춘 약**(2026-09-29, 7.2 ㉕): `drug_active === false`(약 줄이 가리키는 `drug.is_active`가 거짓)인 약 줄은 넣지 않고 모아서 끝에 한 번 알립니다(`cs_setSkippedHidden`). 세트 카드의 코드 목록에서는 그 약을 흐리게 줄 긋고 도움말 `cs_setHiddenDrug`. 검사·처치 줄은 그대로.
- 과거 보기 `openPast`/`renderPast` (114-163): 처방·오더를 읽어 가운데에 보여 주고, 왼쪽 오더 칸은 가립니다. 읽기 전용은 **이 화면에서만**이고, 「외래 내역 선택」으로 과거 내원을 열면 편집 상태로 열립니다(7절 ⑫).
- 영상 판독: `openViewer` → `GET /pacs/viewer-url`, `saveReading` → `PUT /pacs/reading/:id`. 판독 칸은 `canRead`(권한 `consultation` 보유, 50줄)일 때만 쓸 수 있습니다. `viewer-url`의 `cancelled`면 머리에 `px_cancelledViewer`+이유 한 줄, 판독 칸은 읽기만(저장 단추 없음). `url`이 비고 `no_study`이며 `has_viewer`가 참이면 영상 자리에 `px_noStudy`(P-18), `has_viewer`가 거짓일 때만 「뷰어 주소가 설정되지 않음」. 판독 저장이 409 `Imaging order was cancelled`면 `px_readingOnCancelled`를 알리고 창과 오더 표를 다시 불러옵니다. 판독 날짜(「Lu par … · 날짜」)는 `result_at`(timestamptz)을 **브라우저 현지 날짜**로 보여 줍니다(파일 위쪽 `ymd`, `LabResults.jsx`와 같은 규칙). 전에는 ISO 문자열을 T 앞에서 잘라 UTC 날짜라, 현지 00~03시 판독이 전날로 보였습니다(PACS P-22, 2026-09-29).
- **영상 환자 확인**(PACS 부탁, 2026-09-29): `viewer-url` 응답의 `images`(`received_at`·`count`·`patient_id`·`patient_name`·`patient_check`, 영상이 도착하기 전에는 `null`)를 뷰어 상태에 넣고, PACS 세션의 `PatientCheck`(`RadiologyReadings.jsx`에서 export)를 뷰어 머리 아래에 `style={{margin:'8px 14px 0'}}`으로 씁니다 — `mismatch` 빨강, `missing` 노랑. 처음에는 export되지 않아 이 파일에 복제본(`ImagePatientCheck`)을 뒀다가, PACS가 export한 뒤 지웠습니다.

**화면 글자의 번역**(⑯, 2026-09-29) — 저장값은 그대로 두고 보여 줄 때만 `cs_` 키로 바꿉니다. 파일 위쪽의 `VISIT_STATUS_KEY`(대기 목록 상태), `PHRASE_CAT_KEY`(문장사전 분류, 버튼과 문장 옆 표시), `CODE_TYPE_KEY`(검색 목록의 `lab`·`procedure`·`imaging` 표시, 약은 `cs_badgeDrug`), 컴포넌트 안의 `label(map, v)`(키가 없으면 값 그대로). 문장은 `phraseText(p)` — fr이면 `text_fr`, en이면 `text_en`, 없거나 ko면 `text`. 검색과 끼워 넣기도 이 글자로 합니다. 분류 버튼은 `PHRASE_CATS` 다음에 문장들에 실제로 쓰인 다른 분류를 붙입니다(`phraseCats`) — 전에는 새 분류가 「All」에서만 보였습니다. 그 밖에 진료 기록 안내 글(`cs_notePlaceholder`, 전에는 JSX 속성이라 `\n`이 글자로 보였음), 오류 알림 머리(`cs_errorPrefix`), 환자를 고르기 전 안내(`cs_selectPatient`, 전에는 접수 화면 문구), 바이탈 이름(`cs_vBP` 등 — 프랑스어는 TA · T° · FC · FR). **약 처방 칸 이름(`qty`·`tms`·`day`·`usage`·`unit`)과 도움말은 일부러 손대지 않았습니다** — 용량 칸이 1회량인지 하루 총량인지 결정(약국 C)을 기다리는 중.

### 3.2 서버 — `backend/src/routes/consult.routes.js` (`/api/consultations`)

- **권한 (S2, 2026-09-29 실장님 결정 「서버도 화면 권한대로」)**: 쓰기(POST·PUT·DELETE)는 전부 `permMiddleware('consultation')`(`canConsult`). 읽기는 부르는 화면의 권한만 — 처방·오더 읽기(`GET /visit/:visitId/prescriptions`·`/:id/prescriptions`·`/:id/orders`)는 `canReadRx` = consultation·payment·pharmacy(진료 화면, 수납·약국의 `PatientChart`와 문서 창), 진단 읽기는 consultation. 임상병리·접수는 문서 창을 읽기 전용·내원 없이 열어서 이 라우트를 부르지 않습니다. 라우트별 표는 `wiki/handoff/settings.md` 「S2」. 서버는 요청마다 DB에서 계정 상태·권한을 읽으므로(S1) 권한을 바꾸면 바로 적용됩니다.
- `POST /` — 진료 열기. 같은 `visit_id`의 진료가 있으면 그것을 돌려주고(완료·서명 전이면 내원을 `in_progress`로), 없으면 새로 만들며 `doctor_id = 지금 로그인한 사람`, `department_id = 내원의 과 || 로그인한 사람의 과`, `consult_date = CURRENT_DATE`. `consultation.visit_id`에 UNIQUE 인덱스가 있어 한 내원에 진료는 하나입니다. **취소된 내원**(`visit.status='cancelled'`)은 409 `Visit was cancelled`로 거절하고(내원 행을 `FOR UPDATE`로 잠가 동시 취소도 봄), 없는 내원은 404. 새 진료의 `consult_date`는 **내원 날짜**(전에는 오늘 — 지난 내원을 늦게 적으면 오늘 진료로 잡혔음). 2026-09-29, 7절 ⑫.
- `PUT /:id` — **요청에 들어 있는 칸만** 바꿉니다(`subjective, objective, assessment, plan, note_text`, 바이탈 7개 중 몸체에 키가 있는 것). 키를 `null`로 보내면 그 칸을 비웁니다(지운 바이탈). 전에는 없는 키도 NULL로 덮어써서, 화면이 보내지 않는 S/O/A/P·체중·키가 저장할 때마다 지워졌습니다(7절 ⑬, 2026-09-29). 끝난 진료(아래 「변경 기록」)면 바뀐 칸의 전 값 → 새 값을 기록합니다. 전·후 값은 둘 다 표에서 읽은 값이라 `36.5`와 `"36.5"`가 바뀜으로 잡히지 않습니다.
- `PUT /:id/complete` — 진료 `completed` + 내원 `completed`, 한 트랜잭션. **`consultation.completed_at`**(결정 L9, 2026-09-29 — 약국 목록은 진료가 끝난 순서)을 `COALESCE(completed_at, NOW())`로 둡니다: **처음 Terminé를 누른 때**이고, 다시 열어 고친 뒤 또 눌러도 바뀌지 않습니다(약국에서 기다리는 환자가 목록 끝으로 밀리지 않게). 약국 세션이 이 칸으로 정렬합니다.
- 처방·오더 쓰기는 `badAmounts`(`utils/validate.js`)로 숫자 범위를 막습니다 — `dose` 0~1000 **숫자만**(그래서 `1/2` 같은 용량은 400), `frequency` 1~24 정수, `days` 1~365 정수, `quantity` 0~10000, `unit_price` 0~1억.
- **필수 칸과 오류 응답**(2026-09-29): `POST /:id/diagnoses`는 `diagnosis_name`, `POST /:id/prescriptions`는 `drug_name`, `POST /:id/orders`는 `order_name`이 비면 400(「… is required」). 처방의 `route`(용법, `VARCHAR(10)`)는 10자를 넘으면 POST·PUT 모두 400. 그 밖의 DB 제약 오류는 세 라우트 파일 모두 `utils/dbError.js`의 `sendDbError`로 4xx와 읽을 수 있는 문구로 바꿉니다(처방·진단·오더를 없는 진료 id에 쓰면 404 「Consultation not found」 — 2026-09-29 로그 작업 때 처방·진단도 오더처럼 먼저 진료를 읽게 됨). 전에는 not-null·길이 초과가 드라이버 문구를 단 500으로 나갔습니다(설정 세션의 권한 전체 시험에서 발견).
- **처방 총량 `rxTotal(dose, days)`** — `total_qty`를 계산하는 유일한 곳(하루 총량 × 일수, 소수 셋째 자리). `POST /:id/prescriptions`는 화면이 보낸 `total_qty`를 무시하고 이것으로 저장합니다. `PUT /prescription/:rxId`는 **`dose`(숫자로 비교 — `"3"`와 `"3.000"`은 같음)·`frequency`·`days` 중 하나라도 바뀐 경우에만** `total_qty`를 다시 계산하고, 아니면 저장된 값을 둡니다(`UPDATE … total_qty = CASE WHEN … IS DISTINCT FROM … THEN … ELSE total_qty END`, 비교 쪽 칸은 UPDATE 전 값). 이미 저장된 처방의 `total_qty`는 고치지 않았습니다(청구·조제가 이미 그 값으로 일어남). 약국 조제(재고 `Math.ceil(total_qty)`)·수납·통계는 저장된 `total_qty`를 그대로 읽습니다. **하루 총량이나 일수가 비면(또는 0 이하) 총량은 NULL**입니다(결정 B, 2026-09-29) — 0도 「1일」도 아님. 서버는 빈 `dose`·`frequency`·`days`를 NULL로 저장합니다(`blankNull`·`intOrNull`; 전에는 PUT이 `parseInt||1`로 채우고 화면도 `dose||'1'`을 보내서, 칸 하나만 건드려도 빈 일수가 조용히 1일이 됐음). 화면의 `addDrugRx`는 검색으로 넣을 때 `drug.default_*`를 읽지 않고 빈 칸으로, 약속처방(`fromSet`)만 세트 값으로 넣습니다. `noDose`는 하루 총량·횟수·일수 셋 중 하나라도 비면 참(포장 약 제외).
- **포장 단위 약**(H2-B, 실장님 결정 2026-09-29, 칸은 약국의 025) — `POST /:id/prescriptions`는 `drug_id`로 **약 표에서** `pack_unit`·`pack_label`을 읽어 줄에 복사합니다(화면이 보낸 값은 쓰지 않음, 단가를 복사하는 것과 같은 이유 — 나중에 약의 표시를 바꿔도 쓴 처방의 뜻은 그대로). 포장 단위 줄의 `total_qty` = 요청의 **`pack_qty`**(1 이상의 정수, 아니면 400 `pack_qty must be a whole number of at least 1` → 화면 `cs_packQtyWhole`), 없거나 비면 **NULL**(약국 「총량 없음」, 청구 없음 — 틀린 수가 나가지 않게). 하루 총량·횟수·일수는 안내로만 저장. `PUT /prescription/:rxId`: 포장 단위 줄(줄에 저장된 표시)은 **`pack_qty`가 왔을 때만** `total_qty`를 바꾸고(빈 값이면 NULL), 하루 총량·일수를 고쳐도 그대로. 보통 줄은 위 규칙에 더해 **`total_qty`가 NULL이면 다시 계산**합니다(수납 세션 부탁, 2026-09-29). 화면: `noPackQty`(수가 없는 포장 줄)는 `noDose`와 따로 — 포장 줄은 하루 총량이 없어도 `noDose`가 아님. 수량 칸 `packQtyBox(rx)`(함수로 부름 — 컴포넌트로 쓰면 글자마다 입력 칸이 다시 만들어져 포커스가 빠짐), 단위 말은 `rx-dosing.js`의 `packWord`, 저장은 다른 칸처럼 blur(`rxSnap`에 수량 포함). 약속처방 `applySet`은 약 줄의 `quantity`(없으면 1)를 `pack_qty`로 넘깁니다(보통 약에는 서버가 무시).
- `POST /:id/orders` — 오더코드의 `pacs_modality`·`body_part`·`worklist_enabled`를 복사하고, `pacs_config.auto_create_worklist`가 꺼져 있으면 워크리스트를 안 만듭니다. 워크리스트 대상이면 `worklist_log`를 만들고(accession `YYMMDD-<order_item.id>`, DICOM SH 16자 이내) `worklist_status='sent'`. 아니면 `worklist_status='completed'`로 저장합니다. station AE는 일부러 비웁니다(같은 모달리티 장비 여러 대가 한 풀을 나눠 씀). `pacs_config`는 001이 만든 한 줄을 읽기만 합니다(전에는 오더마다 `CREATE TABLE IF NOT EXISTS`를 돌렸음 — 7절 ⑲, 2026-09-29 삭제). 줄이 없으면 워크리스트 자동 생성이 켜진 것으로 봅니다. **총량**(⑭): 수량·횟수·일수가 비면 1로 저장(NULL 없음), `total_qty` = `orderTotal(quantity, days)` = 수량 × 일수(횟수는 곱하지 않음, 수량 0은 0 — 청구 없음). 계산하는 곳은 이 함수 하나이고 수납은 `total_qty`만 읽습니다.
- `PUT /prescription/:rxId` · `DELETE /prescription/:rxId` — **조제된 처방(`status='dispensed'`)은 409 `Prescription already dispensed`**, 없는 줄은 404. 한 트랜잭션 안에서 줄을 먼저 `FOR UPDATE`로 읽고(`lockRx`) 상태를 본 뒤 씁니다. 약국의 조제도 같은 줄을 UPDATE하므로 확인과 쓰기 사이에 끼어들 수 없습니다. `status`는 기본값만 있는 NULL 허용 칸이라, NULL은 「조제 안 됨」으로 봅니다(전에는 `status <> 'dispensed'`가 NULL 줄을 못 잡아 409로 거절 — 2026-09-29 고침). 이유: 조제하면 재고가 이미 빠져 있어, 그 뒤의 수정·삭제는 청구만 움직이고 재고는 그대로라 둘이 영영 어긋납니다. 삭제는 늘 기록(`PRESCRIPTION_DELETE`), 수정은 끝난 진료일 때 기록.
- `DELETE /order/:orderId` — **결과가 생긴 오더는 409 `Order already has a result`**: `lab_result`가 있거나, `order_item.result_text`(판독)가 있거나, `worklist_log.status`가 `in_progress`·`completed`(촬영 시작). 이유: `lab_result`와 `worklist_log`가 `ON DELETE CASCADE`라 지우면 검사값·accession·판독이 소리 없이 함께 사라졌습니다. 먼저 `order_item`을 `FOR UPDATE`로 잠그므로, 동시에 저장되는 검사 결과(외래키가 이 행에 키 잠금을 요구)는 확인 전에 끝나거나 삭제 뒤 실패합니다. 시작 전 워크리스트는 오더와 함께 지워집니다. 삭제는 늘 기록합니다(`ORDER_DELETE`, 지운 줄의 코드·이름·수량·가격 등).
- `PUT /order/:orderId` — 수량·메모 등을 고칩니다(수납이 차액으로 처리). 줄을 `FOR UPDATE`로 읽고 **취소된 오더(`status='cancelled'`)면 409 `Order is cancelled`**, 없으면 404. `status`가 NULL인 줄은 취소가 아니므로 고칠 수 있습니다(전에는 `WHERE … status <> 'cancelled'`가 NULL 줄을 못 잡아 「Order is cancelled」 409가 났음 — 2026-09-29 고침). 끝난 진료면 기록. 총량은 **수량이나 일수가 실제로 바뀌었거나 `total_qty`가 비었을 때만** 다시 계산합니다(처방 PUT과 같은 이유 — 칸을 지나가기만 해도 옛 줄의 청구가 바뀌면 안 됨). 횟수만 바꾸면 총량 그대로.
- `POST /order/:orderId/cancel` `{reason}` — **결과가 있는 오더를 「취소됨」으로 표시**(결정 3-B, 2026-09-29). `FOR UPDATE`로 잠그고(임상병리의 결과 저장과 같은 잠금 — 순서 보장), 이미 취소면 그대로 200, 결과가 **없으면 409 `Order has no result`**(지우라는 뜻 — 두 길이 섞이지 않게), 있으면 `status='cancelled'`·`cancelled_at`·`cancelled_by`·`cancel_reason`(앞뒤 공백 빼고 500자까지, 비면 NULL). 「결과 있음」 판정은 삭제와 같은 `orderProduced()`(검사값 · 판독문 · 워크리스트 진행/완료). **영상 오더도 같은 방식**(결정 38-③, PACS 저장소를 합친 뒤 2026-09-29 켬): 같은 트랜잭션에서 PACS의 `cancelWorklistForOrder(client, id)`(`backend/src/routes/pacs.cancel.js`)를 오더 UPDATE **앞에** 불러, 아직 기다리는(`scheduled`·`in_progress`) 워크리스트 줄을 `cancelled`로 바꾸고 `order_item.worklist_status`도 `cancelled`로 둡니다(돌려주는 줄에 반영). 브리지 피드는 `scheduled`만 내보내므로 한 주기 안에 장비에서 빠집니다. 이미 촬영된(`completed`) 줄은 기록으로 그대로. 검사 오더에는 워크리스트가 없어 아무 일도 안 합니다. 처치는 화면이 취소를 내놓지 않습니다. 취소는 기록합니다(`ORDER_CANCEL`, 상태·이유·워크리스트 상태). 되돌리기 없음. 취소된 오더는 임상병리 목록·결과 저장(409)·결과 표(회색), 수납 청구(`COALESCE(status,'') <> 'cancelled'`)가 각자 처리합니다.
- `GET /visit/:visitId/prescriptions` — 내원 단위 처방. 문서 엔진이 투약 목록을 채울 때 씁니다.
- 진단 `GET/POST /:id/diagnoses`, `DELETE /diagnosis/:dxId` — 화면에서 안 씀(진단 화면은 만들지 않기로 결정). API로 끝난 진료에 넣거나 지우면 기록합니다.
- **변경 기록**(실장님 결정 2026-09-29, 공통 규칙 [../03-change-log.md](../03-change-log.md), 함수 `utils/audit.js`의 `writeAudit`). 진료가 남기는 것:
  - `consultation.order.cancel` · `consultation.order.delete` · `consultation.prescription.delete` — **늘**(진료가 끝났든 아니든).
  - `consultation.record.edit` — **끝난 진료 기록**을 고쳤을 때만: 기록·바이탈(`PUT /:id`), 처방 추가·수정, 오더 추가·수정, 진단 추가·삭제. `entity`로 무엇인지(`consultation`·`prescription`·`order_item`·`diagnosis`), 추가는 `before` 없음, 삭제는 `after` 없음.
  - **「끝난」의 기준**(`consultOf()`, 바꾸는 트랜잭션 안에서 읽음): ① `consultation.status`가 `completed`(또는 `signed`) — Terminé를 누른 진료. 되돌리는 코드가 없으므로 다시 열어 고쳐도 끝난 진료입니다. **또는** ② 내원 날짜(`visit.visit_date`)가 오늘(병원 날짜 `todayLocal`)이 아님 — Terminé를 안 눌렀어도 지난 날의 기록을 나중에 고친 것. 오늘 열려 있는 진료의 저장은 평소 일이라 남기지 않습니다.
  - 바꾸는 라우트는 모두 한 트랜잭션(`inTx`)이고 기록도 같은 `client`로 씁니다. 응답은 COMMIT 뒤에 나가므로, COMMIT이 실패하면 바뀐 것도 기록도 없이 오류가 갑니다. 같은 값으로 저장하면 줄이 생기지 않습니다(`writeAudit`가 다른 칸만 남김, 빈 글자 `''`와 NULL은 같은 것으로 봄 — 화면이 메모를 `''`로 보내기 때문).

### 3.3 오더 세트 — `backend/src/routes/orderset.routes.js` (`/api/order-sets`)

- 읽기 `GET /` · `GET /:id` 는 consultation·settings(진료 화면과 설정의 약속처방 탭 — S2), 쓰기 `POST` · `PUT /:id` · `DELETE /:id` 는 `permMiddleware('settings')`.
- `PUT`은 세트 정보를 고치고 `items`가 오면 **항목을 통째로 지우고 다시 넣습니다.**
- **항목 수량 검사**(2026-09-29, `badItemQty`): 쓰기 전에 봅니다. **약 줄은 1 이상의 정수**(포장 단위 약의 병·튜브 수 — 진료 서버의 `pack_qty`도 정수만 받음; 설정 화면은 보통 약에 1을 보냄), **오더 줄은 0보다 큰 수**. 비면 전처럼 1. 어기면 400 `items[i].quantity must be …`, 아무것도 바뀌지 않습니다.
- `attachItems`는 항목의 단가를 `drug.unit_price` / `order_code.price_clinic`에서 지금 값으로 붙입니다(세트에 단가를 저장하지 않음). 약 줄에는 `drug_active`(= `drug.is_active`, 없는 약·오더 줄은 NULL)도 붙입니다 — 세트는 약 id·이름을 복사해 두므로 약을 목록에서 감춰도 세트는 모르고, 화면이 이 값으로 감춘 약을 뺍니다.
- 화면은 설정 → 약속처방 탭(`Settings.jsx` 157-192, 384-)이 씁니다. 그 탭의 담당은 「확인 필요」(규칙 4절상 모듈 탭은 해당 모듈 — 진료로 보임).

### 3.4 문서 — `backend/src/routes/document.routes.js` (`/api/documents`)

- `POST /` — `generate_doc_no()`로 `D<YY>-<5자리>` 번호를 붙여 `document_log`에 저장. `payload`(JSONB)에 **입력값·환자·병원·의사·투약·날짜·언어를 통째로** 넣습니다.
- `GET /patient/:id` 이력, `GET /:id` 단건, `POST /:id/void` 취소(사유·시각·사람 기록, 행은 남음).
- 권한 (S2): 읽기(`GET /patient/:id`·`GET /:id`)는 consultation·payment·pharmacy·lab·registration — 문서 창을 여는 다섯 화면. 발급·취소(`POST /`·`POST /:id/void`)는 consultation·payment·pharmacy — 문서 창을 편집으로 여는 세 화면(임상병리·접수는 읽기 전용이라 버튼이 없음). 문서 종류별로 더 좁히지는 않았습니다.

### 3.5 공용 문서 엔진 (진료 주관)

- `documents/registry.js` — `TEMPLATES = [referral, externalRx, ...CHART_TEMPLATES]`. `templatesByCategory('document'|'prescription'|'chart')`로 화면마다 보이는 양식을 거릅니다. `autofillValue(src, ctx, lang)`는 `doctor`·`note`·`meds` 세 가지. `meds`(의뢰서 「현재 투약」)는 줄마다 `· 약 이름 — ` + `rx-dosing.js`의 `doseSentence`이고, 예전 계산 줄에는 `(예전 계산 / old calculation / ancien calcul)`을 붙입니다.
- `components/DocumentModal.jsx` — 양식 목록 / 입력 칸 / 미리보기 / 발급 이력의 네 칸. 입력 종류는 `text`, `textarea`, `checks`(체크 여러 개를 `", "`로 이어 한 문자열로 저장). `checks`의 다음 값은 파일 위쪽 `nextChecks(f, cur, opt, on)`이 정합니다 — 필드에 `single: true`면 한 개만(새 체크가 앞의 것을 바꿈), `noneOption: 'None'`이면 None과 나머지가 서로 배타, 둘 다 없으면 아무 조합(옵션 순서로 정렬). 저장 형식은 그대로라 예전에 두 개 저장된 문서도 그대로 열리고 인쇄됩니다(데이터는 고치지 않음). `text`·`textarea` 칸에 `[...]`(60자 이내, 줄바꿈 없음 — `openBrackets`)가 남아 있으면 칸 아래 경고를 보이고, **발급할 때만** `window.confirm`으로 묻습니다(초안 출력은 「미발급(초안)」 표시가 있어 묻지 않음). 문구는 이 파일의 `UI` 사전(`bracketHint`·`bracketConfirm`) — 문서 언어를 따릅니다. `readOnly`면 입력 칸을 숨기고 가장 최근 발급 문서를 엽니다(수납·약국·임상병리·접수의 「차트뷰어」).
- **저장된 문서는 값만 가지고, 인쇄할 때 지금 코드의 `Layout`으로 다시 그립니다**(157-161). 그래서
  - 양식 코드를 고치면 **이미 발급한 문서의 재출력 모양도 바뀝니다.**
  - 체크 선택값은 영어 문자열(`Yes`, `3 o’clock`, `Skin tag`)이 그대로 저장값이자 키입니다. **옵션 문자열을 바꾸면 옛 문서의 그림·표시가 깨집니다.** 번역(7절 ⑥)은 저장값을 그대로 두고 인쇄할 때만 바꿔야 합니다.
- 발행일 `today`는 **브라우저의 현지 날짜**(연·월·일을 `getFullYear/getMonth/getDate`로). 전에는 `toISOString()`(UTC)이라 마다가스카르에서 0~3시에 발급하면 전날이 찍혔습니다(7절 ⑰, 2026-09-29). 병원 PC의 시계·시간대가 맞아야 합니다.
- **서명 칸의 의사 = 문서를 작성(발급)한 의사**(실장님 결정 2026-09-29, `DocumentModal.jsx`의 `signer`). 로그인한 계정의 역할이 `doctor`면 그 사람 이름. **의사가 아닌 계정**(관리자·수납·약국)은 자기 이름을 의사 칸에 넣지 않습니다: 전처럼 `context.doctor_name`(내원의 담당의), 그것도 없으면 **빈칸**(손으로 서명). 같은 이름이 `autofill: 'doctor'` 칸(수술기록지의 집도의)도 채웁니다. **이미 발급된 문서는 발급 때 저장된 이름 그대로** 다시 인쇄됩니다(`document_log`의 payload). 전에는 내원의 담당의 → 없으면 로그인한 사람이라, 다른 의사가 쓴 의뢰서에 동료 이름이 찍혔습니다.
- `documents/shared.jsx` — `A4`(여백 `pad`), `ClinicHeader`, `DocMetaRow`, `PatientBox`(`minimal`이면 주소·전화 뺌 — 수술기록지. 그 밖의 문서도 **값이 없는 주소·전화 줄은 줄째 뺌** — 2026-09-29 실장님 결정으로 접수가 주소를 받지 않아 주소 줄이 늘 비기 때문. 의뢰서·동의서·원외처방전(약국)에 해당), `DocSection`, `SignatureBlock`(`tight`), `printDocument(node, title, lang)`(새 창에 A4 노드 HTML을 복사, `@page{size:A4;margin:14mm}`, 350ms 뒤 인쇄. 팝업이 막혔을 때의 안내는 `lang`(문서 언어)으로 — 전에는 한국어만).

### 3.6 수술기록지 — `documents/surgical-records.jsx` · `op-figures.jsx` · `op-plates.js`

- 차트기록(`category: 'chart'`) 13종: 공통 · 연부조직 · 탈장 · 충수 · 유방 · 치질 · 치루 · 열상 봉합 · 절개 배농 · 제왕절개 · 포경 + 수술 동의서. `makeOp(code, name, title, defaults, spec)` 한 번이 양식 하나입니다.
- `spec.extras` = 수술별 상세 칸, `spec.figure` = 그림 종류(`hernia`·`appendix`·`breast`·`anal`·`fistula`), `spec.safety` = 안전 점검 칸 묶음(A: 검체·배액·거즈 일치·출혈 / B: 거즈·배액·출혈·생검), `spec.sutures` = 봉합사 체크.
- `OpNoteLayout`은 **채운 상세 칸만** 인쇄합니다. 기본값(입력 도우미)을 손대지 않은 칸도 빈 칸으로 봅니다 — 크기 칸의 `' ×  ×  cm'`이 「크기: × × cm」로 인쇄되던 것(7절 ④). 그림은 선택이 있을 때만 그립니다(`OpFigures`, 344-379) — 빈 그림은 「정상」으로 읽히기 때문.
- 그림: 항문 시계(`AnalClock`, 쇄석위, 12시=A, 환자 오른쪽=보는 사람 왼쪽), 치루 Goodsall 시계(`FistulaClock`, 내공 1개일 때만 선으로 이음), 치루 관상 단면(`FistulaSection`, Parks 5형 경로), 유방 사분면(`BreastMap`), 탈장 패널(`HerniaPlate`, 선택한 유형만), 충수 위치(`AppendixPlate`, 선택한 위치 굵게+테두리). 탈장·충수 그림은 **병원 자체 그림(PNG base64, `op-plates.js`)**이고 글자는 SVG로 다시 씁니다.
- 기본 문장(소견·술후 계획·동의서 위험)은 **영어만** 있습니다.
- 인쇄 폭: 본문 약 **688px**, 한 장 약 **1017px**. 충수절제술을 가득 채우면 여유 9px.

- **치루 단면도**(`FistulaSection`)는 고른 유형을 **한 그림에 모두** 그립니다. 첫째는 실선, 둘째부터 점선 무늬(`FIS_DASH`), 여럿이면 그림 아래에 범례 줄(`FIS_LEG` 12단위/줄)이 붙고 오른쪽 위 유형 이름 대신 범례가 씁니다. `int.`/`ext.` 글자는 첫 유형에만. 유형마다 그림을 따로 그리는 방식을 먼저 해 봤는데, 표 옆에 못 들어가 줄이 바뀌면서 소견이 보통 길이인 기록이 **30px 넘쳐 두 장**이 되어 버렸습니다. 무늬는 흑백 인쇄에서도 구별되게 색 대신 씁니다.

**체크 칸 규칙** (③, 2026-09-29 실장님 결정: 예/아니오·부위·양은 하나만, 여러 개 고르는 칸의 None은 배타)

| 양식 | 항목 (키) | 규칙 |
|---|---|---|
| 공통 A (공통·연부조직·탈장·충수·열상·절개배농·제왕·포경) | 검체 병리 의뢰 `tissuePath` · 거즈 카운트 일치 `spongeCount` | 하나만 (Yes/No) |
| 공통 B (유방·치질·치루) | 거즈 카운트 `gauzeCount` · 생검 `biopsy` | 하나만 (Yes/No) |
| 봉합사가 있는 양식 전부 | 사용 봉합사 `sutures` | 여러 개 |
| 연부조직 | 병변 위치 `layer` · 병변 종류 `massType` | 여러 개 (확인 후보 — 아래) |
| 연부조직 | 근육층 침범 `muscleLayer` | 하나만 (Yes/No) |
| 탈장 · 유방 | 부위 `side` (Right·Left·Bilateral) | 하나만 |
| 탈장 | 탈장 유형 `herniaType` | **여러 개** — 양측 탈장은 좌우 유형이 다를 수 있어서(예: Bilateral + Indirect-medium, Direct-small). **2026-09-29 실장님 결정: 여러 개 유지** |
| 충수 | 충수 상태 `appyType` · 삼출액 양 `fluidAmount` | 하나만 |
| 충수 | JP 배액관 `jp` | 여러 개, None 배타 |
| 충수 | 충수 위치 `appyPosition` · Port `port` · 혈관 처리 `vessel` · 기저부 `base` · 삼출액 성상 `fluidType` · 봉합 `closure` | 여러 개 |
| 유방 | 사분면 `quadrant` | 여러 개 |
| 치질 | 병변 위치 `position` · 술후/추가 위치 `position2` | 여러 개 (시계) |
| 치질 | 동반 병변 `skinTag` | 여러 개, None 배타 |
| 치루 | 외공 `extOpening` · 내공 `intOpening` · 치루 유형 `tractType` | 여러 개 |
| 치루 | Seton 유치 `seton` | 하나만 (Yes/No) |

「하나만」일 수도 있지만 **여러 개로 둔 것** — 충수 위치, 삼출액 성상, 연부조직 병변 위치·종류. **2026-09-29 실장님: 의사 확인 대기, 그때까지 여러 개 유지(바꾸지 말 것).**

**프랑스어 표시** (⑥, 2026-09-29) — `documents/op-terms.js`

- **저장값은 영어 그대로**(`Yes`, `3 o’clock`, `Transsphincteric`)이고 프랑스어는 **보여 줄 때만** 바꿉니다. 그림을 무엇으로 그릴지(`op-figures.jsx`)가 이 영어 문자열로 정해지고, 이미 발급한 문서도 같은 값을 갖고 있기 때문입니다. 그래서 예전에 발급한 문서도 FR로 재출력하면 프랑스어로 나옵니다.
- `tr(s, lang)` — 한 단어, `showSel(v, lang)` — 쉼표로 이은 체크 값. `fr`에서만 바꾸고 한국어·영어는 예전 그대로(한국 종이 양식도 영어 용어를 썼음). 사전에 없는 단어는 저장된 그대로.
- 입력 칸: `makeOp`가 모든 `checks` 필드에 `optionLabel: tr`을 달고, `DocumentModal`이 체크 옆 글자를 `f.optionLabel(opt, lang)`로 보여 줍니다(저장은 `opt`).
- 인쇄: `OpNoteLayout`의 `show(key)` — 체크 필드는 `showSel`, 손으로 적는 칸은 적은 그대로.
- 그림: 모든 그림 부품이 `lang`을 받습니다. 시계·유방의 R/L → D/G, 치루 단면의 IAS/EAS/levator ani/dentate → SAI/SAE/「releveur / de l'anus」(두 줄 — 한 줄이면 그림 오른쪽 끝을 넘음)/ligne pectinée, 탈장 패널 이름, 충수 위치 이름. 충수 그림은 프랑스어 단어가 길어 `appyFrame(lang)`이 **프랑스어일 때만** 틀을 넓힙니다(글자 폭은 `appyEm` — 넓은 글자 æ·m, 좁은 글자 i·l·-, 굵게 10%). 영어 그림은 틀·글자 모두 예전과 같습니다.
- 렌더 확인(2026-09-29): 한국어·영어 출력 HTML이 고치기 전과 **바이트까지 같음**. 프랑스어 12개 양식 + 빽빽한 경우 5종 + 긴 단어 경우 모두 A4 한 장(가장 빽빽한 충수 1008px). 그림 밖으로 나간 글자 없음, 고른 위치의 테두리가 글자를 모두 감쌈.

**프랑스어 용어** — 의학 용어라 **현지 프랑스어 의사의 확인 필요**. 바꿀 때는 `op-terms.js`의 번역만 바꾸고 왼쪽(저장 키)은 그대로 둡니다.

| 영어(저장값) | 프랑스어 표시 |
|---|---|
| Yes · No · None · Other | Oui · Non · Néant · Autre |
| Right · Left · Bilateral | Droit · Gauche · Bilatéral |
| 1 o’clock … 12 o’clock | 1 h … 12 h |
| Skin · Soft tissue (subcutaneous) | Peau · Tissus mous (sous-cutané) |
| Epidermal cyst · Granuloma · Lipoma · Hemangioma · Fibroma · Giant cell tumor · Myositis ossificans · Sarcoma | Kyste épidermoïde · Granulome · Lipome · Hémangiome · Fibrome · Tumeur à cellules géantes · Myosite ossifiante · Sarcome |
| Indirect/Direct - small/medium/large · Combined · Femoral | Indirecte/Directe - petite/moyenne/grande · Mixte · Crurale |
| Retrocecal · Preileal · Postileal · Subcecal · Pelvic | Rétrocæcale · Pré-iléale · Rétro-iléale · Sous-cæcale · Pelvienne |
| Free taenia · Ileum · Cecum (그림의 해부 이름) | Bandelette libre · Iléon · Cæcum |
| Perforation · Gangrenous · Suppurative · Congestive | Perforée · Gangréneuse · Suppurée · Congestive |
| Pus · Turbid · Serous | Pus · Trouble · Séreux |
| RLQ · LLQ · Umbilicus | FID · FIG · Ombilic |
| Fascia: Vicryl 2-0 · Skin: Nylon 3-0 / 4-0 | Fascia : Vicryl 2-0 · Peau : Nylon 3-0 / 4-0 |
| Upper outer · Upper inner · Lower outer · Lower inner · Central / subareolar · Axillary | Supéro-externe · Supéro-interne · Inféro-externe · Inféro-interne · Central / rétro-aréolaire · Axillaire |
| Skin tag · Anal fissure · Anal papilla | Marisque · Fissure anale · Papille anale |
| Submucosal · Intersphincteric · Transsphincteric · Suprasphincteric · Extrasphincteric | Sous-muqueuse · Intersphinctérienne · Transsphinctérienne · Suprasphinctérienne · Extrasphinctérienne |
| IAS · EAS · levator ani · dentate | SAI · SAE · releveur de l'anus · ligne pectinée |
| Pile position (lithotomy view) · pre-op · post-op / additional | Position des paquets (vue en position gynécologique) · pré-op · post-op / supplémentaire |
| Openings (lithotomy view) and tract · ● internal ○ external · tract type not selected | Orifices (position gynécologique) et trajet · ● interne ○ externe · type de trajet non précisé |
| R · L (그림의 좌우) | D · G |

그대로 두는 것: 봉합사 이름(Nylon 3-0 등), 기구 이름(Glove port, Ligasure, Endo-loop, Clip), 부피(`> 100 mL`), `int.`·`ext.`(프랑스어도 같은 약자), 시계의 A·P(antérieur·postérieur).

### 3.7 의뢰서 — `documents/referral.jsx`

수신처 · 진단명 · 소견(진료 기록 자동) · 현재 치료(오늘 처방 자동) · 의뢰 목적. 주소·전화 포함 환자 칸(연락이 목적인 문서라서).

### 3.8 렌더링 확인 도구

총괄이 쓰던 도구가 `C:\Users\Shintong\AppData\Local\Temp\claude\C--Users-Shintong-Desktop-----\ffc2b807-713f-4479-aed6-929e3d607377\scratchpad\emr-render\`에 있습니다. `rerender.sh`가 **본체(`C:\Bethesda-EMR-main`)**의 문서 파일 4개를 `src/`로 복사 → esbuild로 `src/render.jsx`를 묶음 → `renderToStaticMarkup`으로 `out/*.html` 5개(그림 모음, 전 양식 ko, 경계 사례, fr, 빽빽한 경우)를 씁니다. 본체 경로를 읽으므로, 진료 세션은 자기 scratchpad(`C:UsersShintongAppDataLocalTempclaudeC--Bethesda-EMR-main--claude-worktrees-charming-cori-c14020c7b99ba-ea46-4b43-bd57-e11d8aba0bd5scratchpademr-render`)에 복사해 **작업공간 파일을 읽도록** 바꿔 씁니다. 거기 `render.jsx`에 `6-consultation.html`(③④⑤⑦ 경계 사례, 치루 유형 1·2·3·5개, 예전 저장값)을 더했고, `serve.cjs`로 `http://127.0.0.1:9282/out/…`에 띄워 브라우저에서 `.sheet` 높이를 잽니다(1017px 이하면 한 장). `out-base/`는 develop 코드로 같은 경우를 찍은 비교용입니다. scratchpad라 사라질 수 있습니다 — 사라지면 이 설명대로 다시 만드세요.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Consultation.jsx`
- `frontend/src/documents/surgical-records.jsx · op-figures.jsx · op-plates.js` — 수술기록지
- `frontend/src/documents/referral.jsx` — 의뢰서

### 서버

| 메서드 · 경로 | 권한 | 하는 일 |
|---|---|---|
| `POST /api/consultations` | `consultation` | 내원의 진료 열기/만들기 `{visit_id, patient_id, department_id}` |
| `PUT /api/consultations/:id` | `consultation` | 기록·바이탈 저장 (보내지 않은 칸은 NULL) |
| `PUT /api/consultations/:id/complete` | `consultation` | 진료·내원 완료 |
| `GET /api/consultations/:id/diagnoses` | `consultation` | 진단 목록 (화면 미사용) |
| `POST /api/consultations/:id/diagnoses` · `DELETE /diagnosis/:dxId` | `consultation` | 진단 추가·삭제 (화면 미사용) |
| `GET /api/consultations/:id/prescriptions` | `consultation`·`payment`·`pharmacy` | 처방 목록 |
| `POST /api/consultations/:id/prescriptions` | `consultation` | 처방 추가. `total_qty`는 서버가 계산(하루 총량 × 일수), 보내도 무시 |
| `GET /api/consultations/visit/:visitId/prescriptions` | `consultation`·`payment`·`pharmacy` | 내원 단위 처방 (문서용) |
| `PUT` · `DELETE /api/consultations/prescription/:rxId` | `consultation` | 처방 고치기 · 지우기. 조제된 줄은 **409**. PUT은 용량·횟수·일수가 바뀐 경우에만 `total_qty`를 다시 계산 |
| `GET /api/consultations/:id/orders` | `consultation`·`payment`·`pharmacy` | 오더 목록 |
| `POST /api/consultations/:id/orders` | `consultation` | 오더 추가(+워크리스트) |
| `PUT /api/consultations/order/:orderId` | `consultation` | 오더 고치기. 취소된 오더는 **409** |
| `POST /api/consultations/order/:orderId/cancel` | `consultation` | 결과 있는 오더를 취소로 표시 `{reason}`. 결과가 없으면 **409**, 이미 취소면 그대로 |
| `DELETE /api/consultations/order/:orderId` | `consultation` | 오더 지우기(시작 전 워크리스트 포함). 결과가 생긴 오더는 **409** |

권한 칸의 `consultation`은 직원 권한(모듈) — 없으면 403. 409 본문은 `{ error: 'Prescription already dispensed' }` 또는 `{ error: 'Order already has a result' }`이며 화면이 이 문자열로 번역합니다.
| `GET /api/order-sets[?department_id=]` · `GET /:id` | `consultation`·`settings` | 세트 + 항목 |
| `POST` · `PUT /:id` · `DELETE /:id /api/order-sets` | `settings` | 세트 관리 |
| `GET /api/documents/patient/:id` · `GET /:id` | `consultation`·`payment`·`pharmacy`·`lab`·`registration` | 발급 이력 · 단건 |
| `POST /api/documents` · `POST /:id/void` | `consultation`·`payment`·`pharmacy` | 발급 · 취소 |

진료 화면이 **다른 모듈의 API**도 부릅니다: `GET /visits/today`(접수), `GET /patients/:id/history`(접수), `GET /admin/drugs` · `/admin/order-codes` · `/admin/phrases` · `/admin/clinic`(설정), `GET /pacs/viewer-url` · `PUT /pacs/reading/:id` · `GET /pacs/readings/patient/:id`(PACS, 마지막은 `RadiologyReadings` 안), `GET /lab/patient/:id/results`(임상병리, `LabResults` 안).

### 공용 부품

- `frontend/src/components/DocumentModal.jsx` · `documents/shared.jsx` · `documents/registry.js` — 공용 문서 엔진, 진료 주관. 쓰는 곳: `Consultation.jsx`(document·chart), `Payment.jsx`(document·prescription·chart 읽기), `Pharmacy.jsx`(prescription·chart 읽기), `Lab.jsx`(chart 읽기), `Registration.jsx`(chart 읽기)

### DB 테이블

마이그레이션 `001_schema.sql`(기본), `004_order_sets.sql`, `010_document_log.sql`, `012_dispense_type.sql`, `023_consultation_order_cancel.sql`, `030_consultation_order_total.sql`(⑭, 세션 번호 201), `032_consultation_completed_at.sql`(L9 — 진료 번호대, 합칠 때 총괄이 번호를 다시 매김).

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `consultation` | **`completed_at`**(032, L9 — 처음 완료한 때; 옛 완료 진료는 `updated_at`으로 채움), `visit_id`(UNIQUE), `patient_id`, `doctor_id`, `department_id`, `consult_date`, `subjective`·`objective`·`assessment`·`plan`(화면 미사용), `note_text`, `bp_systolic`·`bp_diastolic`·`temperature DECIMAL(4,1)`·`pulse`·`spo2`·`respiratory_rate`, `weight`·`height`(화면 미사용), `status` ∈ `in_progress`·`completed`·`signed` | `signed`는 쓰는 곳 없음 |
| `diagnosis` | `consultation_id`(CASCADE), `icd_code`, `diagnosis_name`, `diagnosis_type`(기본 `primary`), `sort_order` | 화면 미사용 |
| `prescription` | `consultation_id`(CASCADE), `drug_id`, `drug_code`, `drug_name`, `dose VARCHAR(20)`, `frequency`, `days`, **`route VARCHAR(10)`**, `total_qty`, `unit_price`, `memo`, `dispense_type`(`internal`·`external`, 012), **`pack_unit`·`pack_label`**(약국 025 — 처방할 때 약 표에서 복사), `status` ∈ `ordered`·`dispensed`·`cancelled`, `dispensed_by/at` | `status`·`dispense_type`은 약국이 바꿈 |
| `order_item` | `consultation_id`(CASCADE), `visit_id`, `patient_id`, `order_code_id`, `order_code`, `order_name`, `code_type` ∈ `lab`·`imaging`·`procedure`(·`fee`), `dose`, `frequency`, `days`, `quantity`, `unit_price`, `pacs_modality`, `station_ae`, `body_part`, `worklist_status`, `worklist_sent_at`, `scheduled_date`, `result_text`·`result_by`·`result_at`(영상 판독), `ordered_by`, `status`(검사 완료 등), `memo`, **`cancelled_at`·`cancelled_by`·`cancel_reason`**, **`total_qty`**(201, ⑭ — 수량 × 일수, 기존 줄은 `COALESCE(quantity,1)`로 채움)(201, 결정 3-B) | |
| `worklist_log` | `order_item_id`(CASCADE, 007), `modality`, `accession_no`, `study_instance_uid`, `scheduled_date/time`, `status` | 영상 장비 워크리스트 |
| `lab_result` | `order_item_id`(**CASCADE**, 014) … | 임상병리 소유. 오더를 지우면 같이 지워짐 |
| `order_set` | `name`, `group_name`, `department_id`, `description`, `is_active`, `sort_order` | 004 |
| `order_set_item` | `set_id`(CASCADE), `kind` ∈ `drug`·`order`, `drug_id`, `order_code_id`, `code`, `name`, `dose`, `frequency`, `days`, `route`, `quantity`, `sort_order` | 단가 없음 |
| `document_log` | `doc_no`(UNIQUE, `D26-00001`), `template_code`, `template_name`, `patient_id`, `visit_id`, `consultation_id`, `lang`, `payload JSONB`, `issued_by/at`, `voided`, `void_reason`, `voided_at/by` | 010 · `generate_doc_no()` · `document_no_seq` |
| `phrase_dictionary` | `category`, `text`, `text_en`, `text_fr`, `sort_order`, `is_active` | 설정 소유, 진료는 읽기만 |

## 5. 다른 모듈과의 연결

```
 접수 visit(status registered/waiting)
   │  진료가 환자를 열면 → visit.status = in_progress
   ▼
 진료 consultation ── prescription ──────────────┐
   │                └─ order_item ─┬─ code_type=lab ────────┐
   │                               ├─ worklist_enabled ─▶ worklist_log ─▶ PACS 워크리스트 (즉시)
   │                               └─ 그 밖(처치 등)          │
   │  「완료」 → consultation.status = completed,             │
   │            visit.status = completed                     │
   ▼                                                         ▼
 약국  /pharmacy/pending : 완료된 오늘 진료의 status='ordered' 처방     임상병리 /lab/pending : 완료된 오늘 진료의 lab 오더
 수납  /billing/pending : 완료된 내원. 진찰료(visit_type → C01~C04) + 처방(외부 조제 제외) + 오더(quantity × unit_price)
```

- **약국** — 진료가 **완료**되어야 보입니다(`pharmacy.routes.js` `/pending`: `c.status='completed' AND v.visit_date=CURRENT_DATE`). 조제하면 `prescription.status='dispensed'`와 재고 차감. 약국이 `dispense_type`을 `external`로 바꾸면 수납에서 빠지고 원외처방전(`external-rx.jsx`, 약국 담당)으로 나갑니다. 목록 순서는 **진료가 끝난 순서**(결정 L9) — `consultation.completed_at`(처음 완료한 때, 다시 완료해도 그대로)으로 약국 세션이 정렬합니다.
- **임상병리** — 진료 **완료** 후 `code_type='lab'`이고 완료·취소가 아닌 오더(`lab.routes.js` `/pending`). 결과는 `lab_result`, 오더는 `status='completed'`. 진료에서 **취소된** 검사 오더는 목록에서 빠지고, 결과 저장은 409, 결과 표에는 회색으로 남습니다(임상병리 세션).
- **PACS** — 워크리스트는 **오더를 넣는 순간** 만들어집니다(완료를 기다리지 않음). `worklist.routes.js`가 상태를 받아 `order_item.worklist_status`를 갱신. 판독은 `order_item.result_text`(PACS 세션의 `pacs.routes.js`).
- **수납** — `visit.status='completed'`가 기준. 청구 뒤에 처방·오더가 바뀌면 `live_total`과 청구액을 비교해 **추가 청구 / 환불**로 다시 목록에 올립니다(`billing.routes.js` `/pending`). 그래서 완료 뒤 수정은 수납에 반영됩니다. 약국이 조제한 처방은 고치거나 지울 수 없게 잠겨 있어(7절 ⑧), 재고와 청구가 어긋나지 않습니다. 취소된 오더는 청구에서 빠지고, 이미 수납한 내원이면 「정정(환불)」로 다시 뜹니다(수납 세션, 2026-09-29). 오더의 청구 수량은 `order_item.total_qty`(⑭, 진료가 계산해 저장)를 읽습니다 — `COALESCE(total_qty, quantity, 1)`, 서버 `billing.routes.js` 세 곳과 화면 `Payment.jsx` 세 곳은 수납 세션이 고칩니다.
- **통계** — 약 사용량은 `prescription`을 `consultation`과 조인. 의사별 매출은 **내원의 `doctor_id`** 기준(`consultation.doctor_id` 아님).
- **접수** — 과거 내원 목록 `GET /patients/:id/history`는 `consultation`을 날짜순으로 줍니다.

- **설정 · 변경 기록** — 진료가 쓴 기록 줄(위 3.2 「변경 기록」)은 설정의 「기록」 탭(설정 세션)에서 관리자만 읽습니다. 화면 어디에도 「수정됨」 표시는 없습니다.

## 6. 설정 항목

진료 화면에 영향을 주는 설정 (모두 **설정** 화면):

| 설정 | 어디에 쓰이나 |
|---|---|
| **약품** (`drug`) — 코드, 이름, 기본 용량·횟수·일수·용법, 단가, 단위 | 약 자동완성·약 검색, 처방 추가 시 기본값 |
| **오더 코드** (`order_code`) — 종류(`lab`·`imaging`·`procedure`·`fee`), 가격(`price_clinic`), 모달리티, 워크리스트 사용, 부위, 기본값 | 검사·영상 자동완성(`fee`는 제외), 오더 단가, 워크리스트 생성 |
| **문장사전** (`phrase_dictionary`) | 진료 기록 문장. 분류 버튼은 기본 분류(General · Internal · Surgery · Peds · OBGYN, 화면 언어로 표시) 다음에 설정에서 만든 다른 분류가 이름 그대로 붙습니다. 문장에 프랑스어(`text_fr`)·영어(`text_en`)가 적혀 있으면 그 화면에서 그것을 씁니다 |
| **약속처방** (`order_set`) | 오른쪽 약속처방 탭 |
| **오더연동 → PACS** (`pacs_config.auto_create_worklist`, `pacs_viewer_url`) | 워크리스트 자동 생성 여부, 영상 뷰어 주소 |
| **병원 정보** (`clinic` — 이름 ko/en/fr, 주소, 전화, 이메일) | 모든 인쇄 문서의 머리 |
| **직원 권한** — `consultation` | 진료 메뉴 접근, 영상 판독 쓰기 |

진료 모듈 자체의 설정 칸은 없습니다.

## 7. 알려진 문제 · 제약

### 7.1 수술기록지 — 2026-09-29 총괄 검토에서 확인된 것

(수술기록지를 실제 인쇄 폭으로 렌더링해서 찾았습니다. ①②는 `be642c9`에서 고쳐졌습니다 — 8절.)

| # | 심각도 | 문제 | 어디 | 확인 방법 |
|---|---|---|---|---|
| ③ ✅ 09-29 | 중간 | **예/아니오를 둘 다 체크할 수 있다.** `checks` 입력이 전부 복수 선택이라 `거즈 카운트: Yes, No`가 그대로 인쇄된다. 부위(Right·Left·Bilateral), JP 배액관(None + RLQ), 동반 병변(None + Skin tag), 삼출액 양처럼 서로 배타적인 그룹 전부 해당. → **고침**: 필드별 `single`·`noneOption` 규칙(3.6절 표) | `DocumentModal.jsx` 219-238 · `surgical-records.jsx` 옵션 정의 | 렌더링 · 코드 |
| ④ ✅ 09-29 | 중간 | **크기 칸을 안 적어도 인쇄된다.** 기본값 `' ×  ×  cm'`이 `trim()` 후에도 빈 문자열이 아니라 「채워진 칸」으로 잡힌다. 연부조직 `massSize` · 유방 `lesionSize` · 충수 `appySize`. → **고침**: 기본값 그대로인 칸은 빈 칸으로 봄 | `surgical-records.jsx` 52(필터), 197·230·257(기본값) · `DocumentModal.jsx` 61(기본값 채우기) | 렌더링 · 코드 |
| ⑤ ✅ 09-29 | 중간 | **치루 유형을 두 개 고르면 표와 그림이 다르다.** 표에는 두 개, 단면도는 `FIS_ORDER`상 첫 번째 하나만. → **고침**: 한 그림에 모든 유형을 무늬별로 + 범례 | `op-figures.jsx` 225-226 `FistulaSection` | 렌더링 · 코드 |
| ⑥ ✅ 09-29 | 중간 | **프랑스어 화면에서 그림과 선택값이 영어다.** 선택값(`Yes`·`No`·`3 o'clock`·`Skin tag`)과 그림 글자(`Pile position (lithotomy view)`·`pre-op`·`● internal ○ external`·`tract type not selected`·`IAS/EAS/levator ani/dentate`)가 영어. 시계의 `R`·`L`은 프랑스어 관례로 `D`·`G`. **저장값을 바꾸지 말고 인쇄할 때 번역해야 함**(3.5절)  → **고침**: 저장값은 영어 그대로, FR에서만 표시를 번역(`op-terms.js`, 3.6절). 용어는 현지 의사 확인 필요 | `op-figures.jsx` 77-81·114·239-254·348-359 · `surgical-records.jsx` 옵션 | 렌더링 · 코드 |
| ⑦ ✅ 09-29 | 중간 | **소견 기본 문장의 `[anesthesia]` `[lithotomy/jackknife]` 같은 괄호**를 안 고치면 서명 기록에 그대로 인쇄된다. 열상·제왕절개·포경의 `[N]`·`[7-10]`·`[male/female]`도 같음. → **고침**: 칸 아래 경고 + 발급 때 확인 창 (기본 문장 자체는 의학 문장이라 그대로) | `surgical-records.jsx` 174-175·206·221·250·265·280·295·306·314 | 코드 |

**인쇄 여유**: 모든 수술기록지가 A4 한 장에 들어가지만, 충수절제술은 상세 10줄 + 소견 4줄 + 술후 계획을 다 채우면 여유가 **9px**뿐이다. 그림을 더 줄이면 위치 이름 글자가 8px 밑으로 내려가서 여기서 멈췄다.

### 7.2 진료 세션이 코드를 읽고 찾은 것 (2026-09-29)

모두 코드를 읽어 찾았습니다. **고친 것은 # 칸에 ✅**와 날짜를 붙이고, 고치면서 격리 스택에서 재현·확인했습니다. 나머지는 아직 화면에서 재현하지 않았습니다.

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| ⑧ ✅ 09-29 | **높음** | **약국이 조제한 처방을 의사가 고치거나 지울 수 있다.** 서버가 `prescription.status`를 보지 않는다. 지우면 수납은 환불로 잡지만 **재고는 돌아오지 않고**, 고치면 청구 수량만 바뀐다 — 재고와 장부가 어긋난다. 화면 처방 표에도 조제 여부가 안 보인다. → **고침**: 서버가 409로 거절, 화면은 🔒·「조제됨」 표시 | `consult.routes.js` 165-190 · `pharmacy.routes.js` 126-185(조제·재고 차감) · `Consultation.jsx` 497-510 |
| ⑨ ✅ 09-29 | **높음** | **결과가 들어간 검사 오더를 지우면 결과도 같이 사라진다.** `lab_result.order_item_id`가 `ON DELETE CASCADE`. 영상 오더는 촬영·판독 뒤에도 지워지며 `worklist_log`(accession)와 판독문(`order_item.result_text`)이 함께 사라진다. 확인 창도 없다. → **고침**: 결과·판독·촬영 시작이 있으면 409, 화면은 🔒. 모든 ✕에 확인 창 | `consult.routes.js` 296-311 · `014_lab.sql` 20 · `007_worklist_cascade.sql` · `Consultation.jsx` 514 |
| ⑩ 결정됨 09-29 | 중간 | **진단 입력 화면이 없다.** `diagnosis` 테이블·API는 있지만 화면이 부르지 않는다(`dxList` 상태만 선언). 의뢰서 진단명은 손으로 쓰고, 통계는 진단을 셀 수 없다 → **실장님 결정: 만들지 않음** | `Consultation.jsx` 21 · `consult.routes.js` 97-123 |
| ⑪ ✅ 09-29 | 중간 | **진료 API에 모듈 권한 검사가 없다.** 로그인만 하면 약국·수납·검사 직원 계정으로도 진료를 열고 처방을 넣고 지울 수 있다(화면 메뉴로만 막힘). 임상병리는 `permMiddleware('lab')`로 막고 있다. → **고침**: 진료 쓰기 API에 `consultation` 권한. 읽기도 S2(2026-09-29)로 화면 권한대로 막음. 문서 발급·취소는 진료·수납·약국만 | `consult.routes.js` 9 · 비교 `lab.routes.js` 18 · `document.routes.js` 62 |
| ⑫ ✅ 결정됨 09-29 | 중간 | **「외래 내역 선택」으로 과거 내원을 열면 편집 상태로 열린다.** 그 내원에 진료가 없었으면(취소된 내원 포함) **오늘 날짜로 진료가 새로 생기고 내원이 `in_progress`로 바뀐다** — 취소된 내원이 되살아난다. 진료가 있었으면 지난 처방에 오더를 추가할 수 있고, 청구가 없던 지난 내원이면 수납 목록에도 안 올라간다 → **고친 것**: 취소된 내원은 409로 거절(되살아나지 않음), 지난 내원에 새로 만드는 진료는 내원 날짜로. **실장님 결정: 지난 기록도 지금처럼 고칠 수 있게 둠(읽기 전용으로 바꾸지 않음)** — 대신 끝난 진료·지난 날의 내원을 고치면 변경 기록에 남음(3.2 「변경 기록」) | `Consultation.jsx` 671-673 → 91-99 · `consult.routes.js` 33-47 · `billing.routes.js` 57-62 |
| ⑬ ✅ 09-29 | 중간 | **저장할 때마다 `subjective`·`objective`·`assessment`·`plan`·`weight`·`height`가 NULL이 된다.** 서버가 몸체에 없는 칸도 덮어쓰고, 화면은 `note_text`와 바이탈만 보낸다. 과거 화면은 `note_text || subjective`로 보여 주므로 예전 S/O/A/P 칸 데이터가 있었다면 한 번 저장에 지워진다. **확인 필요**: 실제 DB에 그 칸을 쓴 기록이 있는지 → **고침**: PUT은 보낸 칸만 바꿈 | `consult.routes.js` 59-67 · `Consultation.jsx` 142·169-177·610 |
| ⑭ ✅ 09-29 (진료 몫) | 중간 | **검사·처치 오더의 Tms·Day 칸은 청구에 안 들어간다.** 청구는 `quantity × unit_price`뿐인데 화면은 Tms·Day를 고칠 수 있게 보여 준다. 주사 3회 × 5일로 적어도 1회분만 청구될 수 있다 → **결정(총괄, 실장님 「의견 없음」): 약과 같은 계산 — 총량 = 수량 × 일수, 횟수는 곱하지 않음.** 진료가 `order_item.total_qty`에 계산해 저장(마이그레이션 201, 기존 줄은 옛 뜻). *남음*: 수납이 `total_qty`를 읽도록(수납 세션) | `Consultation.jsx` 517-519 · `billing.routes.js` 34 |
| ⑮ 일부 ✅ 09-29 | 낮음 | **용법(Usage) 칸이 10자를 넘으면 저장이 500 에러**(`prescription.route VARCHAR(10)`). 약에 기본 용법이 없으면 용법에 `'TID'`(횟수 표기)를 넣는다 → 기본 용법이 없는 약에 `TID`를 넣던 것은 없앰. 10자 제한은 그대로이지만 넘으면 500 대신 400 「route (sig) must be at most 10 characters」(2026-09-29) | `001_schema.sql` prescription · `Consultation.jsx` 246·506 |
| ⑯ ✅ 09-29 | 낮음 | **프랑스어 화면에 영어·한국어가 남는다** — 대기 상태값, 문장사전 분류 버튼, 문장 본문(`text_fr` 안 씀, 기본 문장도 영어뿐), 진료 기록 안내 글(게다가 `\n`이 줄바꿈이 안 되고 글자로 보임 — JSX 속성 문자열이라서), `DRUG`, `Error:`, 팝업 차단 안내(한국어만). 문서 기본 문장(소견·동의서 위험)도 영어뿐 — 의학 문장이라 실장님 확인 필요. → **고침**: 대기 상태·문장사전 분류/문장·종류 표시·안내 글·오류 머리·바이탈 이름·팝업 안내를 3개 국어로(3.1절). *남음*: 문서 기본 문장은 의학 문장이라 영어 그대로 | `Consultation.jsx` 428·474·566·573·584 · `shared.jsx` 179 · `003_seed_data.sql` 76- |
| ⑰ ✅ 09-29 | 낮음 | **문서 발행일이 UTC 기준**이라 마다가스카르(UTC+3)에서 0~3시에 발급하면 전날 날짜가 찍힌다 → **고침**: 브라우저 현지 날짜 | `DocumentModal.jsx` 55 |
| ⑱ 결정됨 09-29 | 낮음 | **진료의 담당 의사가 「처음 연 사람」으로 기록된다.** 관리자·간호사가 먼저 열면 그 사람이 과거 내원·약국·검사 목록에 의사로 나온다. 문서 서명은 반대로 **내원의 담당의** 이름 → **실장님 결정: 진료를 연 계정의 이름이 남는 지금 방식 그대로**(의사마다 자기 계정으로 들어감). 문서 서명은 따로 결정됨: 문서를 작성한 의사 이름 → 고침(3.5) | `consult.routes.js` 46 · `DocumentModal.jsx` 56 |
| ⑲ ✅ 09-29 | 낮음 | 오더를 넣을 때마다 `pacs_config`를 `CREATE TABLE IF NOT EXISTS` — 001이 이미 만든 테이블이라 효과 없는 옛 코드이며, 옛 병원 기본값(`Yonsei Shintong Clinic`, `192.168.0.222`)이 남아 있다 → **고침**: 삭제 | `consult.routes.js` 224-230 |
| ⑳ 결정됨 09-29 | 낮음 | 약속처방을 **진료과 구분 없이 전부** 보여 준다(API는 과 필터 지원). 환자가 없을 때 안내 문구가 접수 화면용(「신규 환자를 입력하세요」) → 안내 문구는 고침(⑯과 함께, `cs_selectPatient`). **실장님 결정: 지금처럼 전부 보임** | `Consultation.jsx` 86·533 |
| ㉑ ✅ 09-29 | **높음** · 총괄 | **날짜가 하루 앞당겨 보인다 (시스템 전체).** _총괄이 고침(`7ad4387`): `backend/src/config/database.js`에서 DATE(1082)를 받은 문자열 그대로 넘김. 실행 중인 EMR에서도 재현됐었음(DB `2023-05-05` → API `2023-05-04T21:00:00.000Z`), 고친 뒤 API·접수 화면 모두 `2023-05-05`._ DB의 `DATE`(생년월일·내원일·진료일)를 `pg`가 JS `Date`(현지 자정)로 바꾸고, JSON은 UTC로 내보내 `1990-01-01` → `1989-12-31T21:00:00.000Z`가 되고, 화면은 `split('T')[0]`로 자른다 — **생년월일·과거 진료일·인쇄 문서의 생년월일이 모두 하루 이르다.** 격리 스택(TZ=`Indian/Antananarivo`, 실행 중인 EMR과 같은 `.env`)에서 재현. 실행 중인 EMR은 건드리지 않아 직접 확인하지 못했지만 같은 설정이다. 고칠 곳은 `backend/src/config/`의 `pg` 타입 파서(1082 = DATE를 문자열로) — 총괄 파일 | API 응답 `GET /patients/1` · `docker-compose.yml` 49 · `Consultation.jsx` 401 · `shared.jsx` `fmtDate` |
| ㉒ ✅ 09-29 | 중간 · 임상병리 부탁 | **검사 오더가 결과 전부터 「completed」로 보였다.** 상태 칸이 영상용 `worklist_status`를 보여 주는데, 워크리스트 없는 오더는 처음부터 `completed`로 저장된다. → **고침**: 검사 오더는 `o.status`(결과 대기/결과 있음/취소됨), 워크리스트 오더는 그대로, 그 밖은 비움(3.1절) | `Consultation.jsx` `orderStatus` · `consult.routes.js` POST /:id/orders · 임상병리 위키 7절 9 |
| ㉓ ✅ 09-29 | 중간 · PACS 부탁 | **영상 뷰어가 다른 환자의 영상일 수 있다는 경고를 보여 주지 않았다**(판독 목록에만 있었음), **상태 칸의 워크리스트 상태가 영어**(P-19). → **고침**: 뷰어 위 빨강/노랑 경고, 상태 칸 3개 국어 | `Consultation.jsx` `ImagePatientCheck` · `orderStatus` · `pacs.routes.js` `/viewer-url` |
| ㉔ ✅ 09-29 | **높음** | **약 총량 계산식이 병원 처방 방식과 다르다.** 병원은 「하루 총량 · 횟수 · 일수 · 용법」(3.000/3/7/TID = 하루 3정을 3번에 7일)으로 처방하는데 EMR은 용량×횟수×일수로 계산해 3배가 된다(청구·재고·통계 모두). 식만 바꾸면 끝나지 않는다 — 시드가 섞여 있어(ACT01 4/2/3, ORS 1/3/3은 지금 식이 맞음) 기본값도 고쳐야 하고, 시럽·흡입기(병·개 단위)는 어느 식으로도 맞지 않는다. 조사 결과·바꿀 곳·확인 시나리오는 인계 노트 2026-09-29 「조사: 약 총량 계산식」 → **고침**(실장님 결정: 입력은 하루 총량, 총량 = 하루 총량 × 일수, 1회량도 같이 보임): 서버 `rxTotal` 한 곳, 바뀐 줄만 재계산, 풀이 줄·⚠·도움말. 약 기본값·약속처방(ACT01·ORS 등)과 병 단위 약은 의사 확인 대기로 그대로. 의사 확인용 표(시드 약 25개·약속처방을 두 식으로 계산)는 인계 노트 2026-09-29 「의사 확인용 자료」 | `Consultation.jsx` addDrugRx·saveRx · `consult.routes.js` PUT calcQty · `003_seed_data.sql` 3-27 |
| ㉕ ✅ 09-29 (가) | 중간 | **목록에서 감춘 약(`drug.is_active = false`)이 약속처방으로는 그대로 처방된다.** 약 검색(`/admin/drugs`)은 감춘 약을 빼지만, 약속처방은 세트 항목에 복사된 `drug_id`·이름으로 넣고(`applySet` → `addDrugRx`), 단가는 `drug`에서 `is_active`와 상관없이 붙으며(`orderset.routes.js` `attachItems`), 처방 API도 확인하지 않는다. 격리 스택에서 ACT01·PCM500을 감추고 「Malaria Workup」을 적용하자 두 약이 표시 없이 들어갔다(총 12·15, 예시 단가). 예시 약 25개를 감추기로 했고 시드 세트의 약 줄 4개가 예시 약을 가리킨다. 대안: (가) `attachItems`가 약의 `is_active`를 같이 돌려주고, 화면이 감춘 약 줄을 세트에서 빼고 넣으며 「목록에서 감춘 약이라 넣지 않음: …」 안내, (나) 설정에서 약을 감출 때 그 약을 쓰는 세트 수를 알려 줌(설정 세션), (다) 실제 약을 가져온 뒤 예시 세트를 새로 만듦 → **(가) 고침**(총괄: 결정 없이 진행): 감춘 약 줄은 넣지 않고 약 이름을 알림, 세트 카드에 줄 그음. (나) 설정의 「이 약을 쓰는 세트 N개」 알림은 설정 세션, (다) 실제 약으로 세트 다시 잇기는 실장님 검토 뒤 | `orderset.routes.js` `attachItems` · `Consultation.jsx` `applySet` · `admin.routes.js` `GET /drugs` |

### 7.3 제약 (버그는 아니지만 고칠 때 알아야 할 것)

- **발급한 문서는 지금 양식 코드로 다시 그려진다**(3.5절). 양식·옵션 문자열을 바꾸면 옛 문서 재출력이 바뀐다. 옵션 문자열은 저장 키이므로 바꾸지 않는다.
  - 2026-09-29 ③④⑤⑦ 이후 옛 문서 재출력이 이렇게 달라진다: 크기 칸을 손대지 않고 발급한 문서는 「크기: × × cm」 줄이 사라지고, 치루 유형을 두 개 고른 문서는 단면도에 두 유형이 모두 그려진다. 예/아니오를 둘 다 체크해 저장된 문서는 저장된 그대로(`Yes, No`) 인쇄된다.
- 문서 엔진 변경은 5개 화면에 영향 — 바꾸면 인계 노트 「공용 파일 변경」에 적는다.
- 처방 용량 `dose`는 숫자만 받는다(`badAmounts`). `1/2 tab` 같은 표기는 안 된다.
- **청구 가격은 줄에 복사된다.** 처방·오더를 넣는 순간의 약품·오더코드 가격이 줄(`prescription.unit_price`, `order_item.unit_price`)에 저장되고, 수납은 그 값을 씁니다(`billing.routes.js`). 설정에서 가격을 바꿔도 이미 넣은 줄은 그대로입니다 — 가격 0 표시(3.1)의 도움말이 「지우고 다시 넣기」를 안내하는 이유. 0원 줄의 가격을 마스터에서 다시 불러오는 기능은 없음(후보).

### 7.4 남은 일 — 결정이 필요한 것 / 결정 없이 할 수 있는 것 (2026-09-29, 위키 2절을 따라 하고 정리)

7.1·7.2의 번호 항목은 모두 고쳤거나(✅) 결정으로 닫혔습니다(결정됨). 남은 것은 아래뿐입니다.

**결정이 필요한 것** (의학 판단 — 실장님 · 현지 의사)

| # | 무엇 | 누가 | 근거 |
|---|---|---|---|
| R1 | 수술기록지에서 「하나만」일 수도 있는데 **여러 개 고를 수 있게 둔** 그룹: 충수 위치, 삼출액 성상, 연부조직 병변 위치·종류 | 의사 확인(실장님: 의사 확인 대기) | 3.6 |
| R2 | 수술기록지 **프랑스어 의학 용어**가 맞는지 | 현지 프랑스어 의사 | 3.6 「프랑스어 용어」 |
| R3 | 수술기록지 소견 **기본 문장**의 괄호 자리(`[anesthesia]` 등)를 병원 기본값으로 채울지 | 의사 | 7.1 ⑦ |
| R4 | **ACT01(말라리아 복합제)·ORS의 기본 하루 총량·횟수·일수** — 약 표의 기본값(검색·세트로 넣을 때 들어가는 값) | 실장님·의사(약 목록 105줄 가져오기 때) | ㉔ |
| R5 | 용법(Posologie) 칸 **10자 제한**(`prescription.route VARCHAR(10)`)을 늘릴지 — 지금은 넘으면 400으로 알림. 늘리면 약국 라벨·원외처방전 폭도 봐야 함 | 실장님(약국과 같이) | ⑮ |

**결정 없이 할 수 있는 것** (진료 세션이 할 수 있음 — 순서는 총괄이 정함)

| # | 무엇 | 크기 |
|---|---|---|
| F1 ✅ 09-29 | 과거 기록(Visites passées)을 오늘 바뀐 것(취소된 오더, 포장 줄, 「n회 청구」)과 함께 **화면에서** 다시 따라 해 보기 — 코드는 맞춰 두었지만(`renderPast`), 격리 DB에 지난 진료가 있는 환자를 만들어 확인해야 함 | 작음 |
| F2 ✅ 09-29 | 2.8 수술기록지·2.10 의뢰서·2.11 발급 이력을 새 문서 서명 규칙(작성한 의사)과 함께 **인쇄 폭으로** 다시 렌더링해 보기 | 작음 |
| F3 | 수술기록지 충수절제술의 인쇄 여유 9px(7.1) — 내용이 더 늘면 두 장이 됨. 지금은 지켜보기만 | 지켜보기 |

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | **약 기본 용량 안 씀(결정 B)** — 검색으로 넣는 약은 빈 칸, 빈 칸은 끝까지 NULL(화면 `||1`·서버 `parseInt||1` 없앰), 하루 총량·일수가 비면 총량 NULL(0 아님). 「하루 총량 없음」 표시·개수·완료 확인을 횟수까지 넓힘(문구 4개) | (이 커밋) |
| 2026-09-29 | **진료 완료 시각(L9)** — 마이그레이션 201(`consultation.completed_at`, 옛 완료 진료는 `updated_at`), 처음 완료한 때만 저장. **약속처방 항목 수량 서버 검사**(약 줄 정수 ≥ 1, 오더 줄 > 0). 감춘 예시 약과 약속처방 적용을 격리에서 확인. 7.4 F2(인쇄 폭 다시 렌더링 — 바뀐 곳 없음) | `afc29db` |
| 2026-09-29 | **7.4 F1 과거 기록 확인** — 포장 줄·취소된 오더·「n회 청구」가 과거 보기에 맞게 나옴. 과거 보기 머리의 빈 「· ·」 없앰 | `cbe9eb9` |
| 2026-09-29 | **위키 2절 따라 하기** — 2절의 옛 글(Qté, 취소는 검사만, 「🔒가 붙습니다」, 7절 ⑫ 주의, 포장 약 표시·확인 빠짐, 영상 상태 「Annulé」 빠짐, 약 목록 오른쪽 기본 용법)을 고침. 화면: 횟수·일수 칸 숫자가 보이게, 검사·영상 줄 Posologie 비움, 한국어 칸 머리 「횟수·일수」(`cs_colTimes`·`cs_colDays`), 좁은 화면의 바이탈 한 줄 배치, 대기 줄의 빈 「· ·」 없앰, 과거 보기의 취소된 오더 회색·「n회 청구」. 7.4 남은 일 분류 | `2f8a57d` |
| 2026-09-29 | **⑭ 오더 총량 = 수량 × 일수** — 마이그레이션 201(`order_item.total_qty`, 기존 줄은 수량으로 채움), `orderTotal()` 한 곳, POST는 빈 값을 1로·늘 계산, PUT은 수량·일수가 바뀌었거나 비었을 때만. 화면: 검사·영상 1·1·1, 처치는 오더 코드 기본값, 칸 머리 「일총투여」(Dose/j), 두 번 이상 청구되면 이름 아래 「n회 청구」. 번역 키 `cs_` 3개 | `33e70a5` |
| 2026-09-29 | **영상 취소 물음 문구**(PACS 지적) — `cs_cancelPromptImg`에 「영상과 판독은 기록으로 남아 영상 창에서 계속 볼 수 있습니다」를 더함(ko·en·fr) | `f15b167` |
| 2026-09-29 | **포장 단위 약(H2-B) 진료 몫** — 처방 POST가 약 표의 `pack_unit`·`pack_label`을 복사, 포장 줄 총량 = `pack_qty`(정수 ≥ 1, 없으면 NULL), PUT은 `pack_qty`가 올 때만. 보통 줄은 총량 NULL이면 다시 계산(수납 부탁). 화면: 약 이름 아래 수량 칸 + 단위 말, 수 없음 표시·제목 개수·완료 확인, 약속처방 수량 → `pack_qty`. 번역 키 `cs_` 6개 | `f79cc79` |
| 2026-09-29 | **영상 오더 취소 켜기**(38-③) — 취소 API가 영상이면 같은 트랜잭션에서 `cancelWorklistForOrder`, 화면에서 판독·촬영 있는 영상 줄도 ✕로 취소(`cs_cancelPromptImg`), 취소된 오더는 종류와 관계없이 「취소됨」. 영상 창: 취소 안내(`px_cancelledViewer`)·판독 읽기만, 판독 저장 409 → `px_readingOnCancelled` 후 다시 불러오기, 스터디 없음(`px_noStudy`, P-18). `cs_imagingNoCancel` 삭제 | `8e497c2` |
| 2026-09-29 | **문서 서명 = 작성한 의사**(결정) — 의사 계정이면 자기 이름, 아니면 내원의 담당의, 없으면 빈칸. 집도의 자동 채움도 같은 이름. 발급된 문서는 그대로 | `b829e00` |
| 2026-09-29 | **변경 기록(로그) 진료 몫** — 오더 취소·삭제, 처방 삭제는 늘, 끝난 진료(완료 또는 지난 날의 내원)의 기록·처방·오더·진단 수정은 `consultation.record.edit`. 바꾸는 라우트를 한 트랜잭션(`inTx`)으로. **NULL 상태**: 오더 PUT·처방 PUT/DELETE가 `status` NULL 줄을 거절하던 것 고침. **영상 오더 취소는 서버가 409**(PACS 뒤에 켬, `cs_imagingNoCancel`). **바이탈 불러오기**: 혈압 없이 저장된 체온·맥박을 화면이 안 불러와 다음 저장에 지워지던 것 고침(로그 시험에서 발견). 처방·진단을 없는 진료에 쓰면 404. 7절 ⑩⑫⑱⑳ 결정으로 닫음 | `c2d154b` |
| 2026-09-29 | **결과 있는 검사 오더 「취소」(결정 3-B)** — 마이그레이션 201(`cancelled_at`·`cancelled_by`·`cancel_reason`), `POST /order/:id/cancel`, 취소된 오더 PUT 409, 화면: 결과 있는 검사 줄의 ✕가 취소를 묻고(이유 선택·수납 환불 안내) 취소된 줄은 회색·⊘. 영상은 🔒 그대로. 번역 키 `cs_` 3개 | `a01c946` |
| 2026-09-29 | **영상 판독 날짜를 현지 날짜로**(PACS P-22) — `result_at`을 T 앞에서 자르던 것을 `ymd`로 | `24abb17` |
| 2026-09-29 | **열린 낮은 항목** — ⑫ 취소된 내원 거절·지난 내원 진료일은 내원 날짜, ⑬ 기록 저장은 보낸 칸만, ⑰ 문서 발행일 현지 날짜, ⑲ 오더마다 돌던 옛 DDL 삭제. 번역 키 `cs_visitCancelled` | `c11b34b` |
| 2026-09-29 | **빈 입력·긴 용법에 400** — 진단 이름·약 이름·오더 이름 필수 검사, 용법 10자 검사, 세 라우트 파일의 오류를 `sendDbError`로(원래 500) | `f52df58` |
| 2026-09-29 | **2절 정리**(총괄 지시, 코드 변경 없음) — 2.3을 넣기 · 한국식 약 칸 표 · 줄에 붙는 표시 표 · 상태 칸 · 결과 자동 반영으로 다시 씀, 2.6에 검사실은 완료 전에도 본다는 것, 2.12를 「이런 안내가 뜰 때」 표로, 환자 찾기 창은 접수 위키 2.7로 안내 | `b7571a7` |
| 2026-09-29 | **약속처방의 감춘 약 빼기(㉕ 가안)** — `attachItems`가 `drug_active`를 돌려주고, 적용할 때 감춘 약은 넣지 않고 이름을 알림, 세트 카드에 줄 그음. 번역 키 `cs_` 2개 | `32896df` |
| 2026-09-29 | **문서의 빈 주소·전화 줄 숨김**(공용 `PatientBox`) — 접수가 주소를 받지 않기로 해서(실장님 결정) 늘 빈칸이던 줄. 값이 있으면 예전처럼 인쇄. 렌더: 기존 12개 수술기록지·동의서 등 출력 HTML이 전과 바이트까지 같음 | `4e9a2d5` |
| 2026-09-29 | **하루 총량 없는 처방 표시** — 줄 표시·제목 옆 개수·완료할 때 한 번 확인(막지 않음). 감춘 예시 약이 약속처방으로 처방되는 것을 확인해 7.2 ㉕로 기록. 번역 키 `cs_` 4개 | `40ccd6c` |
| 2026-09-29 | **S2 — 서버 권한 = 화면 권한**(실장님 결정) — 처방·오더 읽기 consultation·payment·pharmacy, 진단 consultation, 문서 읽기 5개 권한·발급/취소 3개 권한, 약속처방 읽기 consultation·settings | `6b315c9` |
| 2026-09-29 | **약 표기를 공용 `rx-dosing.js`로** — 진료 화면 풀이 줄·의뢰서 투약 글이 약국과 같은 문장(단위 정/cp, ½). 진료 쪽 계산·키 정리(`cs_rxStoredTotal`은 수납이 써서 유지). **검사·영상 진행 상태 30초 자동 반영**(임상병리 부탁) — 적던 칸은 그대로. 번역 키 `cs_rxUnevenFlag`·`cs_rxLegacy` 추가, `cs_rxBreakdown`·`cs_rxUneven` 삭제 | `bdd14bf` |
| 2026-09-29 | **가격 0인 약·오더 표시** — 처방 줄·검색 목록에 「가격 없음 / Sans prix」, 제목 옆 개수, 도움말(설정에서 가격을 넣어도 기존 줄은 그대로 → 지우고 다시 넣기). 막지 않음. 번역 키 `cs_` 3개 | `f9924b7` |
| 2026-09-29 | **약 총량 = 하루 총량 × 일수(㉔, 실장님 결정)** — 서버 `rxTotal`에서만 계산, 용량·횟수·일수가 바뀐 줄만 재계산(옛 줄은 스쳐도 그대로), 풀이 줄 「1회 1 × 3회 × 7일 = 총 21」과 0.5 단위 ⚠, 하루 총량 도움말, 「용법」 머리, 의뢰서 투약 글, 기본 용법 `TID` 끼워 넣기 없앰. 번역 키 `cs_` 5개 | `7d16518` |
| 2026-09-29 | **진료 화면 3개 국어(⑯)** — 대기 상태, 문장사전 분류·문장(`text_fr`/`text_en`), 새 분류 버튼, 검색 종류 표시, 진료 기록 안내 글, 오류 머리, 빈 화면 안내, 바이탈 이름(fr: TA · T° · FC · FR), 인쇄 팝업 안내. 영상 경고를 PACS의 `PatientCheck`로 교체. 번역 키 `cs_` 23개 | `5f8f8f1` |
| 2026-09-29 | **2절(직원용 사용법)을 프랑스어 화면 기준으로 다시 씀** — 버튼·칸 이름은 프랑스어 화면 그대로 + 괄호에 한국어. 「수술기록지 쓰는 순서」(2.8), 「발급 전 [괄호] 경고가 뜨면」(2.9), 의뢰서·발급 이력·막힐 때 표 추가 (코드 변경 없음) | `ab402f3` |
| 2026-09-29 | **영상 환자 확인 경고 · 상태 칸 3개 국어(㉓, PACS 부탁)** — 뷰어 위에 `patient_check` 경고(mismatch 빨강 · missing 노랑), 워크리스트 상태 `cs_ws*` 5개 키 | `9dfcedc` |
| 2026-09-29 | **수술기록지 프랑스어 표시(⑥)** — 체크 칸·인쇄 선택값·그림 글자를 FR에서만 번역(`op-terms.js`, 저장값은 영어 그대로), 시계·유방 D/G, 충수 그림 틀을 프랑스어 단어에 맞게. **검사 오더 상태 칸(㉒)** — 결과 전 「completed」 대신 「결과 대기」. 번역 키 `cs_labPending`·`cs_labDone`·`cs_labCancelled` | `f48cec9` |
| 2026-09-29 | **수술기록지 ③④⑤⑦** — 체크 칸 하나만/None 배타 규칙(공용 `DocumentModal`의 `checks` 입력), 손대지 않은 크기 칸 인쇄 안 함, 치루 단면도에 고른 유형 전부(무늬+범례), 소견의 `[괄호]` 경고·발급 확인. 모든 수술기록지 한 장 유지(충수 빡빡한 경우 1008px 그대로, 치루 유형 5개 최악 991px) | `a6ee24e` |
| 2026-09-29 | **날짜 하루 앞당김(㉑) 고침** — 총괄. 생년월일·진료일이 API에서 UTC로 바뀌어 하루 이르게 보이고, 접수 화면에서 환자 정보를 저장하면 그 이른 날짜가 다시 저장되던 문제 | `7ad4387` |
| 2026-09-29 | **기록 보호(⑧⑨⑪)** — 조제된 처방 수정·삭제 거절, 결과·판독·촬영이 생긴 오더 삭제 거절(409), 진료 쓰기 API에 `consultation` 권한, ✕에 확인 창, 잠긴 줄에 🔒·「조제됨」. 번역 키 `cs_confirmRemove`·`cs_dispensed`·`cs_rxLocked`·`cs_orderLocked` | `d1f473e` |
| 2026-09-29 | 위키를 코드 기준으로 작성 — 화면 사용법, 기능 상세, API·테이블, 다른 모듈 연결, 새로 찾은 문제 ⑧~⑳ (코드 변경 없음) | `38116c7` |
| 2026-09-29 | 치루 단면도를 해부학적으로 다시 그림 — 유형마다 지나는 구조물(내·외괄약근, 거근)이 다르게. 그림 있는 수술기록지 5종이 A4 두 장으로 넘어가던 것을 한 장으로 — 상세표와 그림을 한 줄에, 치루 시계 2개를 Goodsall 방식 1개로 | `be642c9` |
| 2026-07-30 | 수술기록지 6종(연부조직·탈장·충수·유방·치질·치루) 양식과 그림. 체크박스 선택이 인쇄 그림을 움직임 | `be642c9` |
