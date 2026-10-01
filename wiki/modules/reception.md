# 접수 (Reception)

> **담당**: 접수 세션 · 브랜치 `session/reception` · **마지막 갱신**: 2026-09-29 · **상태**: 실장님 결정 목록 모두 반영(029까지 실행 중 EMR). 2절을 지금 화면 기준으로 다시 대조 — 확인 요청. 남은 것은 7절 끝(다른 모듈에 걸린 것뿐)

## 1. 이 모듈이 하는 일

병원에 온 환자가 가장 먼저 거치는 곳입니다.

- **환자 등록** — 처음 온 환자의 인적사항을 입력하면 **차트번호**(`26-00001` 형식 — 연도 두 자리 + 그 해의 번호, **해마다 1번부터**)가 자동으로 붙습니다. 이 번호는 진료·수납·약국·검사·영상(PACS)이 모두 환자를 가리킬 때 씁니다.
- **내원 접수** — 오늘 온 환자를 담당 의사에게 배정하고 주호소·접수 메모를 적어 **대기 목록**에 올립니다. 이렇게 만들어지는 **내원(visit)** 한 건이 그날의 진료·처방·검사·청구가 모두 매달리는 중심 기록입니다.
- **대기 관리** — 오늘 접수된 환자를 대기 / 진료중 / 완료로 나눠 보여주고, 상태를 손으로 옮기거나 대기를 취소합니다.
- 환자를 고르면 **이전 진료 기록**, **미수금·환불예정 금액**, **차트뷰어**(발행된 수술기록지 등)를 함께 보여줍니다.
- 다섯 화면(접수·진료·수납·약국·임상병리)이 같이 쓰는 **환자 찾기 창**(`PatientFinder`)을 주관합니다.

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR** 로 바꿉니다.

> **접수 창구 직원의 계정에는 「접수」 권한이 있어야 합니다.** 관리자가 **Paramètres (설정) → 👥 Personnel (직원)** 에서 계정을 만들거나 고칠 때, 권한 칸의 **🏥 Enregistrement (접수)** 를 체크하세요. 역할을 **Accueil (접수)** 로 고르면 기본으로 체크됩니다(수납 권한도 함께). **Infirmier(ère) (간호사)** 역할도 기본으로 체크됩니다(약국·검사와 함께). 이 권한이 없으면 메뉴에 **Enregistrement** 가 보이지 않고, 서버도 환자 등록·접수를 거절합니다. 관리자가 권한을 빼면 **다시 로그인하지 않아도 바로** 적용됩니다 — 열려 있던 화면에서 저장하면 「Vous n'avez pas l'autorisation…」 안내가 뜹니다(2.8).

### 2.1 화면 열기와 화면 구성

맨 위 메뉴 줄에서 **Enregistrement (접수)** 를 누릅니다. 화면은 세 칸입니다. 왼쪽 맨 위에는 **Date de travail (작업일자)** 가 있습니다(2.5a).

- **왼쪽 — Recherche / Enregistrement (환자 검색 / 접수)**: 환자 찾기, 환자 정보, 그 아래 **Service / Type de Visite (진료과 / 내원구분)** 에서 오늘 접수 내용.
- **가운데 — Consultations précédentes (이전 진료 기록)**: 고른 환자의 지난 진료 기록(읽기만). 맨 위에 이름·차트번호와, 돈 문제가 있으면 **Dû (미수)** · **Rembours. (환불예정)** 상자.
- **오른쪽 — Attente / Terminé aujourd'hui (오늘 대기 / 완료)**: 작업일자의 접수 목록(보통 오늘). **30초마다 저절로** 새로 고쳐집니다(2.5). 지난 날짜를 보고 있으면 제목이 「Attente / Terminé — 2026-09-28」처럼 그 날짜로 바뀝니다.

버튼:

| 버튼 | 하는 일 |
|---|---|
| **◀ · 날짜 · ▶ · Aujourd’hui (오늘로)** | 작업일자 — 하루 앞·뒤, 달력으로 고르기, 오늘로 돌아오기(2.5a) |
| **🔍 Trouver patient (환자 찾기)** | 환자 찾기 창을 엶. 이름·차트번호로 찾아서 고름(2.7) |
| **+ Nouveau patient (+ 신규 환자 입력)** | 왼쪽 칸을 모두 비우고 처음 온 환자를 입력 |
| **Enregistrer / Mettre en attente (접수 / 대기 등록)** | 환자 정보를 저장하고 **오늘 대기 목록에 올림**. 처음 온 환자면 차트번호가 이때 생김 |
| **Modifier l'enregistrement (접수 정보 수정)** | 오른쪽 목록에서 환자를 고르면 위 버튼이 이 이름으로 바뀜. 담당의사·내원구분·주호소·접수 메모를 고침 |
| **💾 Enregistrer le patient (환자 정보 저장)** | 환자 정보만 저장. **대기 목록에는 올라가지 않음** |
| **📋 Dossier (vue) (차트뷰어)** | 이 환자에게 발행된 차트 기록(수술기록지 등) 보기. 고칠 수 없음 |
| **Annuler l'attente / Retirer (대기 취소 / 목록에서 빼기)** | 아직 **En Attente (대기)** 인 환자를 목록에서 뺌 |
| **Terminer → (완료로 →)** · **← En attente (← 대기로)** | 오른쪽 목록 각 환자 아래. 상태를 손으로 옮김(2.5). **대기 중인 환자**의 Terminer → 는 진료 없이 끝내는 것이라 **진료비 없음**으로 수납에 넘어감 |
| **Nouvelle (초진)** · **Suivi (재진)** · **Sans frais (진료비 없음)** | 내원구분 — 진료비 종류. EMR이 먼저 골라 두고, 맞지 않으면 누름(2.4) |
| 창 안의 **Choisir ce patient (이 환자로)** · **Nouveau dossier quand même (그래도 새로 등록)** · **Annuler (취소)** | 같은 이름 환자가 있을 때 뜨는 창의 단추(2.2) |

> 환자 인적사항(이름·생년월일·성별·전화·알레르기·접수과 메모 등)을 **고치면** 누가 무엇을 무엇으로 바꿨는지 뒤에서 기록됩니다(관리자만 설정 → 기록에서 봄). 화면에는 아무 표시가 없고, 처음 등록할 때나 고친 것이 없을 때는 기록되지 않습니다.

### 2.2 처음 온 환자 접수하기

1. 먼저 이미 등록된 환자가 아닌지 확인합니다. 왼쪽 위 **Rechercher patient (기존 환자 검색)** 칸에 이름·차트번호·전화번호를 넣고 **Enter**. 이름은 「성 이름」이든 「이름 성」이든 찾습니다. 일부만 쳐도 됩니다.
2. 목록에 없으면 칸 아래에 「Aucun patient trouvé pour « … » — cliquez sur « + Nouveau patient »」(찾는 환자가 없습니다)가 나옵니다. **+ Nouveau patient** 를 누릅니다.
3. 2.4의 칸을 채웁니다. 꼭 필요한 것은 **Nom** 과 **Prénom** 둘뿐입니다.
4. **Service / Médecin** 에서 의사를 고르고, **Type de Visite** 가 맞는지 봅니다(2.4). **Motif** 와 **Mémo Réception** 을 적습니다.
5. 파란 **Enregistrer / Mettre en attente** 를 누릅니다.
   - 저장하는 동안 버튼이 흐려지고 **Enregistrement…** 로 바뀌며 더 눌리지 않습니다.
   - 「Patient mis en attente — *이름* (N° dossier *차트번호*)」 창이 뜨면 끝입니다. 환자가 오른쪽 **En Attente** 목록에 나타납니다.

> 오류 창이 뜨면 내용을 고치고 **같은 버튼을 다시 누르면 됩니다.** 환자가 이미 만들어진 뒤에 오류가 났다면 왼쪽 **N° dossier** 칸에 번호가 채워져 있고, 다시 눌러도 같은 환자로 접수됩니다(새 환자가 또 생기지 않습니다).

#### 같은 이름의 환자가 이미 있을 때

저장하기 전에 창이 뜹니다 — 「⚠ Un patient portant ce nom existe déjà (같은 이름의 환자가 이미 있습니다)」. 같은 이름 환자들의 **N° dossier · Naissance · Téléphone · Dernière visite** (차트번호·생년월일·전화·마지막 내원)가 보입니다. 성과 이름을 뒤바꿔 적었거나 대소문자·띄어쓰기·악센트(é/e)만 달라도 찾아 줍니다.
- 같은 사람이면 그 줄의 **Choisir ce patient (이 환자로)** 를 누릅니다. 새 차트는 만들어지지 않고 **그 환자의 기록이 왼쪽에 불려 옵니다** — 고른 의사·주호소·메모는 그대로 남습니다. 생년월일·전화를 확인하고 필요하면 고친 뒤 **버튼을 다시 누릅니다.** (바로 접수하지 않는 것은, 새 환자로 적던 알레르기 같은 내용이 모르는 사이에 사라지지 않게 하려는 것입니다.)
- 이름만 같은 다른 사람이면 **Nouveau dossier quand même (그래도 새로 등록)** 를 누릅니다.
- 아무것도 안 하려면 **Annuler (취소)**.

#### 오늘 이미 접수된 환자일 때

「*이름* est déjà enregistré(e) aujourd’hui (En Attente, Dr …). Enregistrer une seconde visite ? (오늘 이미 접수되어 있습니다… 한 번 더 접수할까요?)」가 뜹니다. 같은 날 다른 일로 다시 왔으면 **확인**, 실수로 두 번 누른 것이면 **취소**. 다른 창구에서 방금 접수한 것을 이 화면이 아직 모를 때는 「(peut-être à l’autre guichet)」가 붙어 뜹니다.

### 2.3 다시 온 환자 접수하기

1. **Rechercher patient** 칸에서 찾거나 **🔍 Trouver patient** 로 찾기 창을 엽니다(2.7).
2. 환자를 누르면 왼쪽에 환자 정보가, 가운데에 이전 진료 기록이 나옵니다. **Dû (미수)** 나 **Rembours. (환불예정)** 이 보이면 수납 창구로 안내하세요.
3. 바뀐 정보가 있으면 고칩니다.
4. 의사를 고릅니다. 이 환자가 **그 진료과에 온 적이 있으면 Type de Visite 가 Suivi (재진)** 로 골라지고 「Déjà venu en … : Suivi présélectionné…」가 보입니다. 같은 과라도 **다른 병으로 왔으면 Nouvelle (초진)** 을 누르세요.
5. 주호소·메모를 넣고 **Enregistrer / Mettre en attente** 를 누릅니다. 오늘 이미 접수된 환자면 한 번 더 묻습니다(2.2).

환자 정보만 고치고 접수는 안 할 때는 **💾 Enregistrer le patient** 를 누릅니다. 「Patient enregistré — N° dossier …」 창이 뜹니다.

### 2.4 왼쪽 칸의 뜻

**환자 정보** — 환자에게 계속 붙어 있는 정보입니다. 고치면 다음 내원에도 그대로 남습니다.

| 칸 | 뜻 |
|---|---|
| **📌 Note d'accueil (접수과 메모)** 노란 상자 | 늘 기억해야 할 사항(예: 보호자 동반 필요, 통역 필요). 오늘만이 아니라 **환자에게 계속** 붙어 다니며, 다음에 이 환자를 고르면 다시 보입니다 |
| **N° dossier (차트번호)** | `26-00001` 처럼 연도 두 자리 + 그 해의 번호. **해가 바뀌면 1번부터**(2027년 첫 환자는 `27-00001`). **처음 저장할 때 자동으로** 생기고 고칠 수 없습니다. 진료·수납·약국·검사·영상 장비가 모두 이 번호로 환자를 찾습니다 |
| **Nom (성)** · **Prénom (이름)** | 둘 다 있어야 저장됩니다 |
| **Date de Naissance (생년월일)** | **AAAA (연도 4자리) · MM (월 2자리) · JJ (일 2자리)**. 칸이 차면 다음 칸으로 넘어갑니다. 예: `1990` `05` `03`. 날짜 전체를 **붙여넣어도** 세 칸으로 나뉩니다 — `19900503`, `1990-05-03`, `03/05/1990`(일/월/연 — 현지 쓰는 순서). **모르면 세 칸 모두 비워 둡니다** — 일부만 쓰면 저장되지 않습니다 |
| **Sexe (성별)** | **Masculin (남)** / **Féminin (여)**. 처음에는 **아무것도 골라져 있지 않습니다** — 꼭 하나를 누르세요. 안 누르면 저장할 때 「Choisissez le sexe (Masculin / Féminin).」가 뜹니다. 성별은 문서와 영상 장비로 그대로 나갑니다. **키보드로**: Tab으로 들어가 ← → (↑ ↓)로 고르거나 스페이스 |
| **Téléphone (전화번호)** | 연락처. 미수 연락 등에 씁니다 |
| **Groupe Sanguin (혈액형)** | 모르면 **—** 그대로 |
| **Allergies (알레르기)** | 약 알레르기 등. **의사 화면에 빨간 경고로** 뜹니다. 없으면 비워 둡니다 |

**오늘 접수** (Service / Type de Visite 아래) — 이번 내원에만 해당합니다.

| 칸 | 뜻 |
|---|---|
| **Service / Médecin (진료과 / 담당의사)** | 의사를 고르면 진료과는 그 의사의 소속과로 **자동으로** 정해집니다(목록에 `SUR – Dr …` 처럼 과 약자가 앞에 붙음). 모르면 **—** 로 두어도 접수됩니다 |
| **Type de Visite (내원구분)** | **Nouvelle (초진)** · **Suivi (재진)** · **Sans frais (진료비 없음)** 중 하나. 수납할 때 진료비가 이것으로 정해집니다(초진 C01, 재진 C02, 진료비 없음 0). **재진은 「같은 진료를 이어서 받는 것」** 입니다 — 두 번째 방문이라도 다른 병이면 초진입니다.<br>EMR이 먼저 골라 둡니다: 고른 의사의 진료과에 **전에 온 적이 있으면 Suivi**(아래에 「Déjà venu en GS : Suivi présélectionné…」 안내), 처음이거나 다른 과면 **Nouvelle**. 취소된 접수는 안 셉니다. **Sans frais** 는 저절로 골라지지 않습니다.<br>맞지 않으면 **단추를 눌러 바꾸세요.** 한 번 누른 값은 의사를 바꿔도 그대로 남습니다.<br>수납이 끝난 접수는 단추가 잠기고 「Déjà encaissé…」가 보입니다 — 수납 화면에서 바꿉니다 |
| **Motif (주호소)** | 환자가 온 이유. 의사 화면과 대기 목록에 보입니다 |
| **Mémo Réception (접수 메모)** | 오늘 접수에만 붙는 메모. 늘 필요한 내용은 위의 **Note d'accueil** 에 적습니다 |

> 응급·의뢰는 따로 고르지 않습니다(실장님 결정 2026-09-29). 예전 접수에 응급·의뢰가 들어 있으면 단추 아래에 「Valeur actuelle : Urgence…」처럼 지금 값이 보이고, 단추를 누르면 그 값으로 바뀝니다.

**가운데 위 상자**

| 표시 | 뜻 |
|---|---|
| **Dû (미수)** 빨간 상자 + 금액 | 이 환자가 전에 덜 낸 돈. 수납 창구에서 이번에 함께 받습니다 |
| **Rembours. (환불예정)** 파란 상자 + 금액 | 이 환자에게 돌려줄 돈. 수납 창구로 안내합니다 |

### 2.5 오른쪽 대기 목록

- 위의 **En Attente (대기)** · **En cours (진료중)** · **Terminé (완료)** 로 목록을 바꿉니다. 괄호 안 숫자는 사람 수입니다.
- **Rechercher dans la file (대기목록 검색)** 칸에 이름이나 차트번호 일부를 넣으면 걸러집니다.
- 각 환자 줄: 이름, 상태, `차트번호 · 과 약자 · 의사`, 주호소.

| 상태 | 뜻 | 누가 바꾸나 |
|---|---|---|
| **En Attente (대기)** | 접수했고 진료를 기다리는 중 | 접수가 올림 |
| **En cours (진료중)** | 의사가 진료를 열었음 | 의사가 환자를 열면 **저절로** |
| **Terminé (완료)** | 진료가 끝났음. **수납 화면의 수납 대기 목록에 나타남** | 의사가 진료를 마치면 **저절로** |

- 손으로 옮기는 버튼 **Terminer →** · **← En attente** 는 예외적인 경우에만 쓰세요.
  - **대기 중인 환자**를 **Terminer →** 로 옮기면 진료 없이 끝낸 것으로 보고, 확인 창(「Terminer … sans consultation ?」)을 거쳐 **내원구분이 Sans frais (진료비 없음)** 으로 바뀝니다(서류만 떼러 온 경우 등). **받을 돈이 없어 수납 목록에는 가지 않습니다**(확인 창도 그렇게 말함). 이미 영수가 있는 접수는 내원구분이 바뀌지 않고, 확인 창이 「이미 영수가 있다 — 수납에서 확인」으로 다르게 나옵니다.
  - **진료중** 환자의 Terminer → 는 진료를 받은 것이라 내원구분이 그대로입니다.
- 목록은 **30초마다 저절로** 새로 고쳐집니다. 왼쪽에 쓰던 내용은 그대로 남습니다. 다른 창을 보는 동안에는 쉬었다가, 돌아오면 30초 안에 맞춰집니다. 서버가 잠깐 멈춰도 목록은 지워지지 않습니다.

### 2.5a Date de travail (작업일자) — 다른 날의 접수 보기

왼쪽 맨 위의 **Date de travail (작업일자)** 는 오른쪽 목록이 **어느 날의 접수**를 보여 줄지 정합니다. 처음에는 **오늘**입니다.

- **◀** 하루 전 · **▶** 하루 뒤 · 날짜 칸을 누르면 달력. 오늘보다 뒤로는 갈 수 없습니다(예약은 없음).
- **지난 날짜**를 고르면 칸이 노랗게 바뀌고 「Vous consultez une date passée (…)」 안내가 뜹니다. 그 날짜에서는:
  - 할 수 있는 것 — 보기, 그리고 **정리**: 남은 「En Attente」는 **Annuler l'attente**(취소), 남은 「En Attente」·「En cours」는 **Terminer →**(완료).
  - 할 수 없는 것 — **새 접수·접수 수정**(파란 단추가 잠기고 「À une date passée…」가 보임). 환자 정보 저장(💾)은 됩니다.
- **Aujourd’hui (오늘로)** 를 누르면 오늘로 돌아옵니다.
- 화면을 켜 둔 채 **자정이 지나면**: 오늘을 보고 있던 화면은 30초 안에 저절로 새 날짜로 넘어갑니다. 지난 날짜를 일부러 골라 두었던 화면은 그 날짜에 머물고 노란 안내가 계속 보입니다. 자정 전에 골라 둔 어제 접수는 수정이 잠깁니다.

> 전날 「En Attente」·「En cours」로 남은 접수는 다음 날 아침에 작업일자를 하루 전으로 돌려 정리하세요. ⚠ 진료를 받았는데 의사가 「완료」를 빠뜨린 환자라면, 접수에서 완료로 옮겨도 **수납 목록에는 오늘 날짜 것만 떠서** 나타나지 않을 수 있습니다 — 수납 창구에 알려 주세요(수납 쪽에 확인 요청 중).

### 2.6 접수 내용 고치기 · 대기 취소

1. 오른쪽 목록에서 환자를 누르면 왼쪽에 그 접수 내용이 채워지고, 파란 버튼이 **Modifier l'enregistrement** 로 바뀝니다.
2. 담당의사·**내원구분**·주호소·접수 메모를 고친 뒤 그 버튼을 누릅니다. 「Enregistrement modifié — *이름*」 창이 뜹니다.
   - 의사를 **—** 로 바꾸면 담당의사가 비워집니다.
   - 진료 상태(En Attente · En cours · Terminé)는 이 버튼으로 바뀌지 않습니다.
   - 내원구분은 **단추를 눌렀거나 의사를 바꿨을 때만** 저장됩니다. 그냥 메모만 고치면 수납 창구가 그 사이 바꿔 둔 값이 그대로 남습니다.
3. 아직 **En Attente** 인 환자는 빨간 **Annuler l'attente / Retirer** 버튼이 보입니다. 누르면 「Annuler l'attente de *이름* et le retirer de la liste ?」라고 묻고, 확인하면 목록에서 빠집니다.
   - 의사가 진료를 시작하면 이 버튼은 30초 안에 저절로 사라집니다. 그 사이에 눌렀다면 취소되지 않고 안내 창이 뜹니다(2.8).

### 2.7 Trouver patient (환자 찾기) 창

진료·수납·약국·검사 화면에서도 같은 창을 씁니다.

1. 이름이나 차트번호를 넣고 **Rechercher** 또는 **Enter**. 아무것도 안 넣고 누르면 최근 등록한 환자 50명이 나옵니다.
2. 표의 칸: **N° dossier (차트번호)** · **Nom (이름)** · **Téléphone (전화)** · **Naissance (생년월일)** · **Sexe (성별)**. 환자를 누르면 고릅니다.
3. 접수 화면에서는 여기서 끝납니다. 다른 화면에서는 이어서 **Visites du patient (내원 목록)** 이 나와 그 환자의 내원을 고릅니다 — 칸은 **Date visite (날짜)** · **Heure (접수 시각)** · **Service (과)** · **Médecin (의사)** · **Motif (주호소)** · **État (상태: En Attente 대기 / En cours 진료 중 / Terminé 끝남 / Sans frais 진료비 없음)** · **Paiement (수납상태)**. 같은 날 두 번 온 환자는 주호소와 상태로 구분합니다(2026-09-30 전에는 두 줄이 똑같았음). 수납상태는 **Payé (완납)** · **Partiel (부분)** · **Impayé (미수)** · **Exonéré (면제)** · **ANNULÉ (취소)** · **Non facturé (미수납)**, 그리고 진료비 없이 끝난 내원은 **Rien à payer (받을 돈 없음)** 입니다(수납 목록에 오지 않음). 접수에서 **취소된 내원**은 글자가 회색이고 날짜에 줄이 그어지며 빨간 **Visite annulée (접수 취소)** 딱지가 붙습니다 — 수납상태 칸의 「ANNULÉ」(영수증 취소)와는 다른 것입니다. 취소된 내원은 보통 고르지 않습니다(진료 화면은 열지 않고 안내를 띄웁니다). **← Recherche (← 검색으로)** 로 돌아갑니다.
4. 창을 닫으려면 **✕ Fermer (닫기)** 또는 창 바깥을 누릅니다.

### 2.8 이런 안내가 뜰 때

| 안내 (프랑스어 화면) | 뜻 · 할 일 |
|---|---|
| 「Patient mis en attente — *이름* (N° dossier *번호*)」 | 접수 끝. 환자가 **En Attente** 에 올라갔습니다 |
| 「Enregistrement modifié — *이름*」 | 접수 정보 수정 끝 |
| 「Patient enregistré — N° dossier *번호*」 | 환자 정보만 저장 끝(대기 목록엔 안 올라감) |
| 「Annuler l'attente de *이름* et le retirer de la liste ?」 | 대기 취소 확인. 맞으면 확인 |
| 「Terminer *이름* sans consultation ? Le type de visite passe à « Sans frais »…」 | 대기 중인 환자를 진료 없이 끝냄 — 진료비 없음으로 수납에 넘어감. 진료를 받을 환자면 **취소** |
| 「Saisissez le nom et le prénom.」 | **Nom** 과 **Prénom** 을 둘 다 채웁니다 |
| 「Choisissez le sexe (Masculin / Féminin).」 | 성별 단추를 하나 누릅니다 |
| 「Complétez la date de naissance (année-mois-jour), ou laissez-la vide si elle est inconnue.」 | 생년월일을 일부만 썼습니다. 세 칸을 다 채우거나, 모르면 세 칸 모두 지웁니다 |
| 「La date de naissance n'est pas valide. Elle ne peut pas être dans le futur.」 | 없는 날짜(2월 30일, 13월 등)이거나 미래 날짜. 월·일을 확인합니다 |
| 「La consultation de ce patient a déjà commencé ou est terminée : impossible d'annuler l'attente. La liste a été actualisée.」 | 그 사이 의사가 진료를 시작했거나 끝냈습니다. 목록이 새로 고쳐졌습니다. 정말 취소해야 하면 담당 의사와 이야기합니다 |
| 「Impossible de joindre le serveur. Réessayez dans un instant ; si cela continue, prévenez l'administrateur.」 | 서버에 닿지 않습니다. 버튼이 몇 초 **Enregistrement…** 로 멈췄다가 뜰 수 있습니다. 잠시 뒤 다시 누르고, 계속되면 관리자에게 알립니다. 쓰던 내용은 지워지지 않았습니다 |
| 「Dossier patient introuvable. Recherchez à nouveau.」 | 그 환자 기록을 찾지 못했습니다. 다시 검색해서 고릅니다 |
| 「Cet enregistrement est introuvable. La liste a été actualisée.」 | 그 접수 기록을 찾지 못했습니다. 새로 고쳐진 목록에서 다시 고릅니다 |
| 「Une valeur saisie n'a pas le bon format. Vérifiez les dates et les nombres.」 | 날짜·숫자 칸의 형식이 틀렸습니다. 확인하고 다시 누릅니다 |
| 「Vous n'avez pas l'autorisation pour cette action. Demandez l'accès « Enregistrement » à l'administrateur.」 | 이 계정에 「접수」 권한이 없습니다(관리자가 방금 뺐을 수도 있음). 관리자에게 **Paramètres → 👥 Personnel** 에서 **🏥 Enregistrement** 를 체크해 달라고 합니다 |
| 내원구분 단추 아래 「Déjà venu en *과* : Suivi présélectionné. Si c’est un autre problème, choisissez Nouvelle.」 | 그 과에 전에 온 적이 있어 재진을 골라 두었습니다. 다른 병으로 왔으면 **Nouvelle** 을 누릅니다 |
| 내원구분 단추 아래 「Déjà encaissé : le type de visite se change à l'écran Paiement.」 (단추가 흐림) | 이미 수납한 접수입니다. 진료비 종류는 수납 창구에서 바꿉니다 |
| 내원구분 단추 아래 「Valeur actuelle : Urgence (fixée au Paiement)…」 | 예전 방식(응급·의뢰)으로 저장된 접수입니다. 그대로 두거나, 맞는 단추를 누릅니다 |
| 창 「⚠ Un patient portant ce nom existe déjà」 | 같은 이름 환자가 있습니다. 같은 사람이면 **Choisir ce patient**, 다른 사람이면 **Nouveau dossier quand même**, 그만두려면 **Annuler** (2.2) |
| 「Dossier existant chargé. Vérifiez les informations, puis appuyez de nouveau sur le bouton.」 | 고른 기존 환자를 불러왔습니다. 정보를 확인하고 버튼을 **다시** 누릅니다 — 아직 접수되지 않았습니다 |
| 「*이름* est déjà enregistré(e) aujourd’hui (…). Enregistrer une seconde visite ?」 | 오늘 이미 접수된 환자입니다. 같은 날 다른 일로 다시 왔으면 확인, 실수면 취소 |
| 「… (peut-être à l’autre guichet). Enregistrer une seconde visite ?」 | 다른 창구에서 방금 접수한 것 같습니다. 대기 목록을 보고, 이미 있으면 취소 |
| 노란 「Vous consultez une date passée (…) : consultation et mise en ordre… 」 | 작업일자가 지난 날입니다. 정리(취소·완료)만 됩니다. 접수하려면 **Aujourd’hui** |
| 「À une date passée, on ne peut ni créer ni modifier un enregistrement…」 | 지난 날짜(또는 자정 전에 골라 둔 어제 접수)에서는 접수·수정이 안 됩니다. **Aujourd’hui** 를 누르고 오늘 날짜에서 합니다 |
| 「Erreur : …」 | 위에 없는 오류입니다. 창의 글자를 그대로 적어 관리자에게 알립니다 |
| 서버는 되는데 오른쪽 목록이 비어 있음 | 화면을 처음 열 때 서버에 닿지 못했을 수 있습니다. 30초 안에 저절로 다시 불러옵니다. 계속 비어 있으면 화면을 새로 고치고(F5), 그래도 안 되면 관리자에게 알립니다. (오늘 접수가 정말 없으면 당연히 비어 있습니다) |

## 3. 기능 상세

### 화면 상태 (`Registration.jsx`)

| 상태 | 뜻 |
|---|---|
| `selectedPatient` | 왼쪽에 올라온 환자. `id`가 있으면 기존 환자, 없으면 신규 입력 중 |
| `sel` | 오른쪽 대기 목록에서 고른 **내원**. 있으면 파란 버튼이 「접수 정보 수정」이 됨 |
| `form` | 환자 인적사항 입력값 (camelCase). **화면에 있는 칸만** 담음 — `chartNo` `lastName` `firstName` `dob` `gender` `phone` `bloodType` `allergies` `receptionNote` |
| `visitForm` | 내원 입력값 — `department` `doctor` `visitType` `chiefComplaint`. 접수 메모는 별도 `memo` 상태 |
| `visits` | `/visits/today` 결과 전체. 탭·검색은 화면에서 거름 (`filteredVisits`) |
| `patBal` | `/billing/patient/:id/balance` 결과 `{owed, refund}` |
| `busy` · `busyRef` | 저장 중. `busy`는 버튼을 막고(`disabled`, 「저장 중…」), `busyRef`는 화면이 다시 그려지기 전의 두 번째 클릭까지 막음 (`withBusy()`) |

### 흐름

- **작업일자** (2026-09-29 실장님 결정 ⑩) — `workDate`(보는 날)·`serverToday`(서버의 오늘)·`workRef`(`{date, follow}` — 30초 새로고침이 처음 만든 함수라 state 대신 ref로 읽음). 목록은 `GET /visits/day`로 받음: `follow`(오늘을 따라감 — 기본, 오늘로 돌아오면 다시 켜짐)면 날짜 없이 불러 서버가 오늘을 정하고, 아니면 `?date=`. 응답의 `today`로만 오늘을 앎 — **PC 시계는 쓰지 않음**(수납·통계의 `todayLocal`과 같은 원칙: 오늘은 서버가 정함). 그래서 자정 뒤 첫 새로고침에서 `follow` 화면은 저절로 새 날짜로 넘어감.
  - `viewingPast` = 작업일자 < 오늘, `selIsPast` = 고른 내원의 `visit_date` < 오늘(자정을 넘겨 어제 내원을 고른 채인 경우). 둘 중 하나면 `createOrUpdateVisit`를 막음(단추 `disabled` + `rc_pastDateNoNew`). 상태 이동·대기 취소는 그대로(정리).
  - 날짜를 바꾸면 고른 내원을 비움(`startNewPatient`) — 다른 날 내원을 열어 둔 채 두지 않으려고. ▶·달력은 오늘까지(`max`).
  - 같은 날 중복 확인(`todayVisitOf`)은 화면 목록을 쓰는데, 새 접수는 오늘 목록일 때만 되므로 맞음.
- **대기 목록 자동 새로고침** — 화면이 열려 있는 동안 30초마다, `document.hidden`이 아닐 때만 `refreshQueue()`가 작업일자의 목록(`/visits/day`)을 다시 받음 (임상병리 화면과 같은 규칙). 바꾸는 것은 `visits`와, 고른 내원(`sel`)의 **`status`·`has_active_bill`·`visit_type`** 뿐(수납된 내원이면 저장된 `department_id`·`doctor_id`·`dept_code`·`doctor_name`도 — 2026-09-30) — 그래야 진료가 시작된 내원에서 「대기 취소」 버튼이 사라지고, 그 사이 수납된 내원의 내원구분 단추와 과·의사 고르기가 잠김. `form`·`visitForm`·`memo`·`selectedPatient`는 건드리지 않아 쓰던 내용이 남음. 실패하면 조용히 기존 목록 유지(알림 없음). `queueSeq`(ref)가 요청마다 번호를 매겨, 느리게 온 옛 응답이 새 목록을 덮지 못하게 함 — `loadData()`도 같은 번호를 씀. 진료과·의사 목록은 자동으로 다시 받지 않음(바뀔 일이 드묾).
- **환자 고르기** — 검색 결과나 환자 찾기 창에서 고르면 `fillPatient(p)`: 환자 행으로 `form`을 채우고 `sel`을 비우고 `/patients/:id/history`로 이전 진료를 불러옴.
- **대기 목록에서 고르기** — `selectVisit(v)`: `/visits/today` 행으로 `form`·`visitForm`을 채움.
- **보내는 환자 필드** — `patientBody()`가 화면에 있는 칸만 보냄: `last_name` `first_name`(앞뒤 공백 제거) `date_of_birth` `gender` `phone` `blood_type` `allergies` `reception_note`. `national_id` `mobile` `address` `city` `region`은 **보내지 않으므로 서버가 그대로 둠** (2026-09-29 전에는 대기 목록에서 고른 환자를 저장하면 이 칸들을 빈 값으로 덮었음 — 7절 ⑤). 나중에 이 칸들의 입력을 추가하면 `form`·`fillPatient`·`selectVisit`·`patientBody`에 같이 넣되, `selectVisit`은 `/visits/today` 행에 이 값이 없으니 `/patients/:id`로 받아 채워야 함.
- **입력 검사** — `formProblem()`: 성·이름 둘 다(공백만은 안 됨), 성별 `M`·`F` 중 하나(2026-09-29 실장님 결정 ⑫ — `emptyForm`·`patientToForm`·`selectVisit` 모두 성별을 비워 시작하고 기본값 `M`을 없앰. DB에 성별이 없는 기존 환자도 고르기 전엔 저장 안 됨), 생년월일은 비었거나 `YYYY-MM-DD`로 완전하고 실제 있는 날짜이고 미래가 아니고 1875년 이후. 서버(`badPatient`)도 같은 검사를 하지만 영어라서, 화면 언어로 먼저 알려주려고 둠.
- **오류 문구** — `errText(err)`: API는 영어로 답하므로, 직원이 할 일이 있는 메시지는 여기서 맞춰 보고 `rc_` 번역으로 바꿈. 맞추는 문구: `Patient name is required` → `rc_nameRequired`, `date_of_birth…`로 시작 → `rc_dobInvalid`, `A date field has a date that does not exist`(`dbError.js` 22008) → `rc_dobInvalid`, `Only a waiting visit can be cancelled` → `rc_cancelNotWaiting`, `Patient not found` → `rc_patientNotFound`, `Visit not found` → `rc_visitNotFound`, `A field has the wrong format`·`A date field has the wrong format`(`sendDbError`) → `rc_badFormat`, 서버 연결 실패(`Failed to fetch`·`NetworkError…`·`Load failed` — 브라우저별 fetch 실패 문구, `API backend is not reachable…` — `frontend/nginx.conf`의 백엔드 중지 응답, `API response was not JSON…` — `api/client.js`) → `rc_serverDown`. 나머지는 `rc_errorWith`(「Erreur : {msg}」)로 원문을 붙임. **서버·nginx·client.js의 문구가 바뀌면 여기 대응도 같이 바꿔야 함.** 저장·상태 변경이 실패하면 대기 목록을 다시 불러옴(오래된 줄을 치우려고).
- **안내 문구 조립** — `fill(s, {name, chart, msg})`로 번역 문자열의 `{name}` 같은 자리에 값을 넣음. 언어마다 값 위치와 문장부호가 달라서(프랑스어는 `?`·`:` 앞에 띄어쓰기) 버튼 이름에 `' ✓'`를 이어 붙이던 방식을 버림. 성공 창: `rc_registered`·`rc_visitUpdated`·`rc_patientSaved`, 취소 확인: `rc_cancelConfirm`.
- **생년월일 칸 안내 글자** — `DobInput`의 `rc_phYear`·`rc_phMonth`·`rc_phDay`(프랑스어 `AAAA`·`MM`·`JJ`).
- **생년월일 붙여넣기** — 세 칸 모두 `onPaste`: `parsePastedDob(text)`가 `YYYYMMDD`, `YYYY-MM-DD`(구분자 `-` `/` `.` 공백, 월·일 한 자리도), `DD/MM/YYYY`(일 먼저 — 마다가스카르·프랑스 순서; 월/일 순 `MM/DD`는 받지 않음)를 `[연, 월, 일]`로 나눠 `emit`, 일 칸으로 커서. 그 밖의 글은 보통 붙여넣기. 달력 검사는 여기서 안 함 — 저장 때 `formProblem()`. 이전에는 연도 칸(maxLength 4)이 `19900503`의 `1990`만 남기고 나머지를 버렸음(2026-09-29 통합 시험).
- **「N° dossier」 칸** — 읽기 전용이라 설정 화면의 잠긴 칸과 같은 이름표: 바탕 `var(--field-locked)`, 글자 `var(--text-locked)`(총괄 결정 2026-09-30). 전에는 빈 칸만 `opacity` 0.6 → 0.7로 흐리게 했는데, 안내 글자까지 흐려져 밝은 화면 2.67 : 1이었음. 번호 글자 대비: 밝은 5.46 · 어두운 5.87. 안내 글자(placeholder) 색은 디자인 세션의 `::placeholder` 규칙 몫 — 접수는 손대지 않음.
- **미수·환불 금액** — 가운데 위 「Dû / Rembours.」 상자의 금액은 `fmtAr(n, lang)`: 프랑스어는 천 단위 **줄 안 바뀌는 빈칸**(«17 300 Ar»), 한국어·영어는 쉼표(«17,300 Ar») — 총괄 결정(2026-09-29), 약국 `fmt(n, lang)`과 같음. 이전 `toLocaleString()`은 화면 언어가 아니라 PC 설정을 따랐음. 금액 칸은 `whiteSpace: nowrap`(1366폭에서 «Ar»가 다음 줄로 떨어지던 것).
- **짧은 정보 줄** — 검색 결과 줄(차트번호 · 전화 · 생년월일)과 대기 줄(차트번호 · 과 · 의사)은 **빈 값을 빼고** ` · `로 이음. 의사 없이 접수하면 «26-00029 · ·»처럼 점만 남던 것.
- **같은 이름 경고 창** — 차트번호·생년월일·전화·마지막 내원 칸은 `nowrap`(1366폭에서 «26-» / «00029»로 쪼개지던 것).
- **검색 결과 없음** — `searchPatients()`가 0건이면 `notFoundFor`에 검색어를 두고 칸 아래 한 줄 `rc_noPatientFound`(`{q}` 검색어, `{btn}` = `newPatientInput`)를 보임. 검색어를 고치거나 **+ 신규 환자**를 누르면 사라짐. `searchSeq`(ref)로 늦게 온 옛 검색 답은 버림. 이전에는 결과가 없으면 아무 일도 안 일어난 것처럼 보였음(통합 시험).
- **💾 환자 정보 저장** — `savePatientOnly()`: `selectedPatient.id`가 있으면 `PUT /patients/:id`, 없으면 `confirmNewPatient()` 뒤 `POST /patients`.
- **동명이인 경고** (2026-09-29 실장님 결정 ④ — **경고만**, 같은 사람 판단은 **이름만**) — `confirmNewPatient()`: 새 차트를 만들기 직전(`savePatientOnly`·`createOrUpdateVisit` 둘 다) `GET /patients/similar`로 같은 이름 환자를 받음. 있으면 `askSimilar(list)`가 화면 안 창(`similarAsk` 상태, Promise로 답을 기다림)을 띄움. 답: `use` → `/patients/:id`로 전체 행을 받아 `patientToForm`으로 채우고(**`visitForm`·`memo`는 그대로**) 멈춤 — 직원이 확인 뒤 다시 누름. 바로 접수하지 않는 이유: 새 환자로 적던 알레르기·전화 등이 표시 없이 버려지기 때문. `new` → 계속 만듦. `cancel` → 멈춤. 조회가 실패하면 경고 없이 진행(경고는 도움일 뿐 등록을 막지 않음).
- **같은 날 중복 접수 경고** — `postVisit(body, name)`: 화면의 오늘 목록(`visits`, 30초마다 갱신)에서 같은 `patient_id`의 취소 아닌 내원을 찾아 `confirm(rc_dupVisit)`; 확인하면 `allow_duplicate: true`를 붙여 보냄. 목록이 오래돼 서버가 409 `Patient already registered today`를 주면 `confirm(rc_dupVisitOther)` 뒤 `allow_duplicate`로 다시 보냄. 취소하면 아무것도 안 만듦.
- **접수 / 대기 등록 · 접수 정보 수정** — `createOrUpdateVisit()`:
  1. 신규면 `confirmNewPatient()`(동명이인 경고) → `POST /patients` (차트번호 생성) 후 **바로 `selectedPatient`에 기억**. 뒤의 내원 생성이 실패해 다시 눌러도 새 환자를 또 만들지 않음 (7절 ③). 기존이면 `PUT /patients/:id` — **실패하면 여기서 멈추고 오류를 보여줌** (예전에는 `catch (e) {}`로 삼키고 접수를 진행해 수정 내용이 조용히 사라졌음).
  2. `sel`이 있으면 `PUT /visits/:id`로 `department_id` `doctor_id` `chief_complaint` `reception_memo`**만** 보냄. `status`는 안 보냄 — 목록이 몇 분 전 것일 수 있어, 예전처럼 보내면 의사가 완료한 내원이 대기로 돌아가 수납 목록에서 빠졌음 (7절 ②). `visit_type`은 `visitTypeSource`가 `'loaded'`가 아닐 때(단추를 눌렀거나 의사를 바꿔 제안이 다시 계산됐을 때)만, 그리고 `has_active_bill`이 아닐 때만 보냄 — 수납이 그 사이 바꾼 값을 덮지 않으려고. `sel`이 없으면 `POST /visits`(늘 `visit_type` 포함). 과·의사는 수납된 내원에도 늘 보냄 — 그대로인 값은 서버가 받고, 수납 전에 바꿔 둔 것을 그 사이 수납된 뒤 저장하면 409 `VISIT_BILLED`가 `rc_visitBilledNoMove`로 보임(말없이 빠지지 않게). 저장이 실패하면 `loadData()`와 함께 `refreshQueue()`를 불러 고른 내원의 잠금이 바로 걸림.
  3. 목록 다시 불러오고 입력칸을 비움 (`startNewPatient()`).
- **상태 버튼** — `changeStatus()` → `PUT /visits/:id/status`. 화면에서 허용하는 이동: 대기→완료, 진료중→대기, 진료중→완료, 완료→대기. 대기→완료는 `completeWithoutConsult()`가 확인 창 뒤 부름 — 서버가 그 내원을 `visit_type='none'`으로 바꾸기 때문(2026-09-29 실장님 결정 ⑳). 확인 창 문구는 대기 줄의 `has_active_bill`로 나눔: 영수 없음 → `rc_completeNoConsult`(「rien à payer, le patient n'a pas à passer à la caisse」 — 0 Ar 내원은 수납 `HAS_CHARGES_SQL`이 목록에서 뺌), 영수 있음 → `rc_completeNoConsultBilled`(서버가 내원구분을 두므로 「수납에서 확인」). 2026-09-30 전에는 모든 경우에 「part à la caisse」라 실제와 달랐음(다시 통합 시험 C).
- **성별 단추** — `role="radiogroup"` 안의 `button type="button" role="radio" aria-checked`. Tab 정거장은 하나(고른 쪽, 아직 없으면 Masculin — roving `tabIndex`), `moveGender()`가 ← → ↑ ↓로 고르고 포커스도 옮김, 스페이스·엔터는 단추의 클릭. 전에는 `div`라 키보드로 필수 칸을 고를 수 없었음(다시 통합 시험 B).
- **대기 취소** — `cancelVisit()` → `PUT /visits/:id/status` `{status:'cancelled'}`. 서버가 409로 거절하면(이미 진료 시작) 안내하고 목록을 새로 불러옴. (2026-09-29 전에는 `'canceled'` 오타로 늘 실패 — 7절 ①)
- **진료과** — 의사를 고르면 `doctors` 목록에서 그 의사의 `department_id`를 찾아 `visitForm.department`에 넣음. 진료과만 따로 고르는 칸은 없음. `depts`(`/admin/departments`)는 불러오지만 쓰지 않음.
- **내원구분** — 단추 세 개 `newVisit`(초진) · `followUp`(재진) · `none`(진료비 없음). 2026-09-29 실장님 결정: 응급·의뢰 단추는 없음(서버 `VISIT_TYPES`·오더 코드 C03·C04·옛 기록은 그대로 — 예전 값이면 단추 아래 `rc_visitTypeOther`로 보여 줌). 글자는 공용 키 `newVisit`·`followUp`과 `rc_visitNoFee`.
  - **값의 출처** `visitTypeSource`: `'auto'`(제안 — 의사·이전 내원이 바뀌면 다시 계산), `'manual'`(직원이 누름 — 덮지 않음), `'loaded'`(대기 목록에서 고른 내원의 저장된 값 — 그대로 보여 주고 보내지 않음). 새 환자·환자 고르기 → `'auto'`, 대기 목록에서 고르기 → `'loaded'`, 그 상태에서 의사를 바꾸면(청구 없을 때) → `'auto'`.
  - **제안 규칙** `suggestedVisitType(deptId, doctorId, past, excludeVisitId)` — 실장님 결정: 이번 접수의 진료과(없으면 담당의의 소속과, 그것도 없으면 초진)에 **취소 아닌 이전 내원**이 있으면 재진, 아니면 초진. 기간 제한 없음. 이전 내원의 과도 `department_id`가 없으면 그 내원 담당의의 **지금** 소속과로 봄(비활성 의사는 목록에 없어 과를 모름 → 그 내원은 안 셈). 수정 중인 내원 자신은 뺌. `none`은 제안하지 않음. **규칙을 바꿀 때는 이 함수만.**
  - 이전 내원은 `loadPastVisits()`가 `GET /visits/patient/:id`로 받음(실패하면 빈 목록 → 초진 제안). 이 때문에 그 라우트 권한에 `registration`을 더함(4절).
  - **과·의사 잠금**(2026-09-30, 실장님 결정 「수납이 끝나기 전까지」): `sel.has_active_bill`이면 「과 / 담당 의사」 목록 `disabled`(잠긴 칸 모양 `--field-locked`·`--text-locked`) + `rc_visitBilledNoMove`. 잠기면 `visitForm`의 과·의사를 저장된 값으로 되돌림(`billedLock` useEffect) — 거절된 편집이 잠긴 칸에 남아 보이지 않게. 서버도 막음(`PUT /visits/:id` 409 `VISIT_BILLED`).
  - **잠금**: `sel.has_active_bill`이면 단추 `disabled` + `rc_visitTypeLocked`. 청구 뒤에 바꾸면 `/billing/pending`이 추가청구·환불로 다시 올리기 때문. 서버는 막지 않음 — 수납 자신이 추가 청구 전에 `PUT /visits/:id {visit_type}`을 부름.

### 대기 탭과 내원 상태

| 탭 | 들어가는 `visit.status` |
|---|---|
| 대기 | `waiting`, `registered` |
| 진료중 | `in_progress` |
| 완료 | `completed` |
| (안 보임) | `cancelled` |

### 차트번호 채번

2026-09-29 실장님 결정 ⑱: **해마다 1번부터** — 2027년 첫 새 환자는 `27-00001`. 마이그레이션 `029_reception_chart_no_yearly.sql`.

- DB 함수 `generate_chart_no(p_day date DEFAULT CURRENT_DATE)`: `pg_advisory_xact_lock(hashtext('bethesda.chart_no'))`을 잡고, **그 해 접두어(`YY-`)로 이미 쓴 가장 큰 번호 + 1**을 환자 표에서 셈(`chart_no ~ '^YY-[0-9]+$'`만 셈). 99,999 아래는 5자리, 넘으면 그대로 6자리(`26-100000`).
- `POST /patients`는 **한 트랜잭션**: `BEGIN → generate_chart_no() → INSERT → COMMIT`. 잠금이 COMMIT까지 유지되어 두 창구가 동시에 새 환자를 만들어도 번호가 겹치지 않음(두 번째는 첫 번째 저장을 기다린 뒤 셈). 마지막 안전장치는 `chart_no UNIQUE`.
- **왜 시퀀스가 아니라 「표에서 최대값 + 1」인가**: 백업을 새 PC에 복원한 뒤에도 다음 번호가 저절로 맞음 — 시퀀스 값이나 카운터 표가 틀어져도 상관없음(격리 스택에서 복원 DB의 옛 시퀀스를 1로 망가뜨려도 다음 번호 그대로). 등록이 실패(롤백)하면 그 번호는 다음 사람이 씀 — 번호가 비지 않음.
- **해가 바뀌는 순간** = `CURRENT_DATE` = DB 시간대(`Indian/Antananarivo`, DB 컨테이너 `TZ`) — `visit_date`의 「오늘」과 같은 기준. `.env`에 `TZ`가 없으면 DB가 UTC가 되어 새해가 3시간 늦게 옴(6절).
- 옛 방식(2026-09-29 전): 시퀀스 `chart_no_seq` 하나가 해를 넘어 이어졌고(26-00350 → 27-00351), `LPAD(…, 5)`가 10만 번째부터 번호를 잘라 겹쳤음. **이미 발급된 번호는 그대로**이고 올해는 그 다음 번호부터 이어짐. `chart_no_seq`는 지우지 않고 남겨 둠(쓰는 곳 없음 — 되돌리기 쉽게).
- 번호는 화면에서 고칠 수 없음 (읽기 전용 칸). `PUT /patients/:id`도 `chart_no`를 바꾸지 않음. 번호 모양(`YY-00000`)은 영상 장비(DICOM PatientID)·문서·영수증에 그대로 나감.
- 시험: `backend/test/reception.api.mjs`(동시 20명 — 모두 다르고 이어짐, 다음 번호. 새 스택이면 `/auth/setup`으로 관리자를 만들고 **서버가 돌려준 `login_id`**(늘 `admin`, S3)를 OS 임시 폴더에 바로 저장), `backend/test/reception.chartno.sql`(다음 해 `-00001`, 12월 31일은 올해, 99,999 → 100000 → 100001, 모양이 다른 번호는 안 셈 — 모두 ROLLBACK).

### 긴 이름 (2026-10-01)

마다가스카르 이름은 50~80자가 흔함(`RAZAFINDRAKOTO Andriamihaja Jean Baptiste Emmanuel` 50자). 계기: 실행 중 EMR의 진료 대기 목록에서 긴 이름 옆 꼬리표 「대기」가 「대 / 기」로 접힘(실장님 2026-10-01) — 접수 화면도 같은 자리에서 «En Attente»가 두 줄로 접혔고, 띄어쓰기 없는 42자 이름은 목록 전체를 옆으로 밀어 가로 스크롤이 생겼음.

규칙 — **이름은 자르지 않고 줄바꿈**, 짧은 칸은 접히지 않게:

| 자리 | 지금 |
|---|---|
| 대기 목록 줄 (`Registration.jsx` RIGHT) | 이름 `minWidth:0` + `overflowWrap:'anywhere'`(낱말 사이로, 한 낱말이 칸보다 길면 낱말 안에서), 상태 꼬리표 `whiteSpace:'nowrap'` + `flexShrink:0`. 차트번호 · 과 · 의사 줄도 줄바꿈. **주호소는 두 줄까지**(`WebkitLineClamp:2`) + 전체는 `title` — 이름과 달리 누구인지 가리는 글이 아니라서. 탭 단추 `nowrap` |
| 환자 머리줄 (CENTER) | 첫 글자 네모 `flexShrink:0`, 이름 · 과 · 의사 줄바꿈. 미수/환불 상자는 크기를 지키고, 이름 옆에 자리가 없으면 **아래 줄로 내려감**(`flexWrap`) — 전에는 이름이 230px 칸에 8줄로 쌓였음 |
| 검색 결과 목록 (LEFT) · 이전 진료 줄 | 줄바꿈(이전 진료 줄은 날짜 `nowrap`, 과 · 의사가 넘치면 다음 줄) |
| 같은 이름 확인 창 | 폭 760 → **900px**(이름 칸이 142px라 83자 이름이 8줄이었음 → 282px, 4줄), 머리글 `nowrap`, 이름 줄바꿈 |
| 환자 찾기 창 — 환자 표 | 차트번호 · 전화 · 생년월일 · 머리글 `nowrap`(전에는 이름 칸에 밀려 «26- / 00005», 전화 · 날짜도 두 줄), 이름 줄바꿈 |
| 환자 찾기 창 — 내원 목록 | 창 머리의 환자 이름 줄바꿈(제목 · 닫기 단추는 `nowrap`), 시각 · 과 `nowrap`, **의사 이름은 줄바꿈**(전에는 `nowrap`이라 긴 의사 이름이 표를 밀었음), 주호소는 그대로 말줄임 + `title` |
| 전화번호 (환자 찾기 표 · 같은 이름 확인 창 · 검색 결과 목록) | 전화 칸에는 두 번호가 같이 들어감(«+261 34 99 888 77 / +261 33 45 678 90», 집/휴대 — 칸은 50자까지). 표에서는 `phoneLines()`가 `/` `;` `,`로 나눠 **번호마다 한 줄, 위아래로** — 한 줄로 두면 37자 전화가 367px를 차지해 이름 칸(300px)보다 넓었고, 같은 이름 확인 창에서는 이름 칸이 60px도 안 남음. 검색 결과 목록은 `phoneText()` — 번호 안의 띄어쓰기는 안 끊기고 번호 사이 « / »에서만 줄이 바뀜, 차트번호 · 생년월일은 `nowrap`(전에는 «1992-» / «11-02»로 끊김). 22자가 넘는 조각(구분자 없는 긴 값)은 번호로 보지 않고 아무 데서나 줄바꿈(폭 170px까지). 두 함수는 `PatientFinder.jsx`가 내보냄. **어느 번호를 보이나**: 세 자리 모두 같은 순서 — 접수 양식이 고치는 `phone` 먼저, 없으면 `mobile`(총괄 결정 2026-10-01; 전에는 표 두 곳이 `mobile` 먼저라 양식에서 고친 번호가 표에 안 보일 수 있었음). 양식의 전화 입력 칸(190px)은 그대로 — 번호 둘을 한 칸에 넣는 것은 드문 경우(실장님), 줄바꿈은 안전장치 |

확인하는 법(격리 스택, 1366×768, ko · fr): 50자 · 83자 · 띄어쓰기 없는 42자 이름, 150자 주호소, 57자 의사 이름, 10자 과 코드로 — 22자 이하 글자가 두 줄로 접힌 곳 0, 가로로 넘치는 칸 0(내원 목록의 주호소 말줄임만 예외), 페이지 가로 스크롤 없음.

### 환자 찾기 창 (`PatientFinder.jsx`, 공용)

- `mode='patient'`: 환자를 누르면 `onPickPatient(p)` 호출하고 닫힘. 접수·약국이 씀.
- `mode='visit'`(기본): 환자를 누르면 `/visits/patient/:id`로 그 환자의 모든 내원을 날짜 역순으로 보여주고, 내원을 누르면 `onPickVisit(v)`. 진료(2곳)·수납·임상병리가 씀.
- `initialPatient`를 주면 검색을 건너뛰고 바로 그 환자의 내원 목록을 엶 (진료 화면의 이력 보기).
- 내원 목록의 수납 상태 표시: `paid` `partial` `unpaid` `waived` `cancelled`, 청구가 없으면 「미수납」. 한 내원에 청구가 여러 개면 취소 안 된 최신 것 하나(`visit.routes.js` `/patient/:patientId`의 LATERAL). 진료비 없이 끝난 내원(`completed` + `visit_type='none'` + 청구 없음)은 「미수납」 대신 `rc_billNothing`(「Rien à payer」) — 수납의 `HAS_CHARGES_SQL`이 이런 내원을 목록에서 빼기 때문.
- **주호소·상태 칸**(2026-09-30, 다시 통합 시험 B): `chief_complaint`(말줄임, 전체는 `title`), `visitState(v)` — `waiting`/`registered` → `t.waiting`, `in_progress` → `t.in_progress`, `completed` → `t.completed` 또는 `none`이면 `t.rc_visitNoFee`, `cancelled`는 비움(날짜 칸 딱지). 같은 날 두 내원이 똑같이 보여 의사가 잘못 열 수 있었음. 창 너비 760 → 900(94vw 안), 날짜·의사·상태·수납 칸 `nowrap`.
- 검색어 없이 **검색**을 누르면 최근 등록 환자 50명이 나옴.
- **취소된 내원**(`status='cancelled'`)은 글자를 흐린 글자색(`t3`)으로(투명도는 쓰지 않음 — 2026-09-30 전에는 `opacity 0.55`), 날짜에 취소선, `rc_visitCancelled` 딱지. 숨기거나 막지는 않음 — 환자 이력의 일부이고, 취소된 내원으로 무엇을 할지는 각 화면이 정함(진료는 서버가 409로 거절하고 안내 — 진료 세션 작업). 2026-09-29 전에는 구분 없이 나왔음(7절 ⑮).

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Registration.jsx` — 접수 화면 전체 (`DobInput` 생년월일 입력 부품 포함)

### 서버

- `backend/src/routes/patient.routes.js` (`/api/patients`)
- `backend/src/routes/visit.routes.js` (`/api/visits`)
- 로그인(`authMiddleware` — 2026-09-29 S1부터 매 요청 DB에서 계정 상태·권한을 읽음) **과 모듈 권한**(`permMiddleware`, 하나라도 있으면 통과)을 검사함 — 2026-09-29 실장님 결정 S2 「서버도 화면 권한대로 막기」. 원칙: 읽기는 **그 라우트를 부르는 화면 전부**(공용 부품을 통한 호출 포함), 쓰기는 그 일을 하는 화면만. 권한이 없으면 403 `Access denied`.

| 라우트 | 통과하는 권한 | 부르는 화면 (2026-09-29 grep) |
|---|---|---|
| `GET /patients` | registration · consultation · payment · pharmacy · lab | 접수, PatientFinder(다섯 화면) |
| `GET /patients/:id` | 위와 같음 | DocumentModal(다섯 화면 — 임상병리·접수는 차트뷰어) |
| `GET /patients/:id/history` | registration · consultation · payment · pharmacy | 접수, 진료, PatientChart(수납·약국). 임상병리는 안 부름 |
| `POST /patients` · `PUT /patients/:id` | registration | 접수 |
| `GET /patients/similar` | registration | 접수(동명이인 경고) |
| `GET /patients/chart/:chartNo` | registration | 없음 |
| `GET /patients/:id/billing-history` | payment | 없음 |
| `GET /visits/today` | registration · consultation | 진료 (접수는 2026-09-29부터 `/visits/day`) |
| `GET /visits/day` | registration | 접수(작업일자) |
| `GET /visits/patient/:patientId` | registration · consultation · lab · payment | PatientFinder 내원 모드(진료·임상병리·수납), **접수의 초진/재진 제안**(`loadPastVisits`). 약국은 환자 모드라 안 부름 |
| `POST /visits` · `PUT /visits/:id/status` | registration | 접수 |
| `PUT /visits/:id` | registration · payment — 단 **registration 없이 payment만** 있으면 `visit_type` 말고 다른 칸을 보내는 순간 403 (조용히 빼지 않음 — 잘못된 호출이 드러나게) | 접수, 수납(`visit_type`만) |
| `PUT /visits/:id/transfer` | registration · consultation (전과 — 2026-09-30) | 진료(전과 단추), 접수(필요하면) |

새 화면이 이 API를 부르게 되면 표와 `patient.routes.js`의 `SEARCH_READERS`·`HISTORY_READERS`, `visit.routes.js`의 각 `permMiddleware`를 같이 고치고, `backend/test/reception.api.mjs`의 `ROUTES`도 고칠 것.
- 입력 검사: `backend/src/utils/validate.js`의 `badPatient`, `VISIT_TYPES`, `VISIT_STATUSES` (공용 파일, 총괄 소관)

| 메서드 · 경로 | 하는 일 | 부르는 곳 |
|---|---|---|
| `GET /api/patients?q=&limit=&offset=` | 검색. `chart_no` `last_name` `first_name` `national_id` `phone` `mobile`, 그리고 **성 이름 · 이름 성** 두 순서의 전체 이름에 `ILIKE %q% ESCAPE '!'` — 검색어의 `%` `_`는 글자 그대로(이스케이프 문자를 `!`로 한 것은 JS 템플릿 안에서 역슬래시가 사라지는 문제를 피하려고). 검색어의 앞뒤·겹친 공백 정리. `is_active=true`만. 최근 등록순. `limit` 1~200(기본 50)·`offset`은 숫자로 읽고, 숫자가 아니면 기본값 | 접수, PatientFinder |
| `GET /api/patients/:id` | 환자 한 명 | DocumentModal |
| `GET /api/patients/chart/:chartNo` | 차트번호로 찾기 | 프론트에서 부르는 곳 없음 (확인함) |
| `GET /api/patients/similar?last_name=&first_name=` | 성·이름이 같은 환자(최대 10명, 최근 등록순): `id` `chart_no` `last_name` `first_name` `date_of_birth` `gender` `phone` `mobile` `last_visit_date`(취소 아닌 마지막 내원일). 대소문자·앞뒤·겹친 공백 무시, **성·이름 뒤바뀜도 같은 것으로**, **악센트 무시**(Hélène = Helene — `FOLD()`의 `translate()` 목록, 양쪽 모두 같은 SQL을 거침). 둘 중 하나가 비면 `[]`. `/:id`보다 **먼저** 선언(아니면 `similar`를 id로 받음). SQL 정규식은 `[[:space:]]+` — JS 템플릿 안의 `\s`는 역슬래시가 빠져 Postgres가 글자 s를 바꾸므로 | 접수 |
| `POST /api/patients` | 등록. 차트번호 자동 — 번호 받기와 INSERT가 **한 트랜잭션**(3절 채번). `badPatient` 검사 — 성·이름 **둘 중 하나**만 있으면 통과, 생년월일은 `YYYY-MM-DD`이고 달력에 있는 날·미래 아님·1875년 이후, 성별은 `M`·`F`·빈 값 | 접수 |
| `PUT /api/patients/:id` | 수정. **본문에 있는 칸만** 씀, 없는 칸은 그대로 (`PATIENT_FIELDS`). `''`·`null`을 보내면 지움 — `date_of_birth`·`gender`의 `''`는 `null`로 바꿔 저장. `chart_no`는 못 바꿈. `badPatient` 때문에 성·이름 중 하나는 꼭 보내야 함. **트랜잭션**: 행을 `FOR UPDATE`로 읽고 → 고치고 → **변경 기록** `reception.patient.edit`을 같은 트랜잭션에(아래) | 접수 |
| `GET /api/patients/:id/history` | 그 환자의 `consultation` 목록 + 과·의사 이름. **과·의사는 내원의 것**(총괄 `119642e`, 2026-09-30): `dept_code`·`dept_name` = COALESCE(내원의 과, 진료가 열 때 베낀 `consultation.department_id`), `doctor_name` = COALESCE(내원의 의사, 진료를 처음 연 계정) — 전과 뒤 차트 머리는 내원만 바뀌어도 새 과·의사. 전과 길은 `consultation.department_id`도 같이 맞춤(약속 — 이 칸을 읽는 곳은 지금 이 COALESCE의 보조값뿐, 통계·수납은 `visit.department_id`를 읽음) | 접수, 진료, PatientChart |
| `GET /api/patients/:id/billing-history` | 그 환자의 `billing` 목록 | 프론트에서 부르는 곳 없음 (확인함) |
| `GET /api/visits/day?date=YYYY-MM-DD` | 그 날의 내원(행 모양은 `/today`와 같음 — `QUEUE_SELECT`) + `{date, today}`. 날짜가 없으면 `CURRENT_DATE`. 모양이 틀리면 400, 달력에 없는 날은 DB가 400(22008) | 접수(30초마다) |
| `GET /api/visits/today?status=&doctor_id=&department_id=` | 오늘(`visit_date = CURRENT_DATE`) 내원 + 환자·과·의사 + `has_active_bill`(취소 안 된 청구가 있는지). 접수시각순 | 진료(15초마다) |
| `GET /api/visits/patient/:patientId` | 그 환자의 모든 내원 + 대표 청구 1건. 줄마다 `chief_complaint`, 그리고 환자의 `gender`·`date_of_birth`·`allergies`(2026-09-30, 진료 세션 부탁 — 환자 찾기로 연 내원의 머리줄·알레르기 경고에 따로 조회가 필요 없게. 이 라우트를 부르는 역할은 모두 `GET /patients/:id`로 이미 읽음) | 접수(초진/재진 제안), PatientFinder, 진료 |
| `POST /api/visits` | 접수. `visit_type` 검사함. `status='waiting'`, `reception_time`은 서버 시각 `HH:MM`, `registered_by`는 로그인 직원. **오늘 같은 환자의 취소 아닌 내원이 있으면 409 `Patient already registered today`** — 본문에 `allow_duplicate: true`가 있으면 통과(직원이 확인한 뒤 화면이 붙임). 두 요청이 동시에 오면 둘 다 통과할 수 있음(잠금 없음 — 경고일 뿐이라) | 접수 |
| `PUT /api/visits/:id/status` | 상태만 변경. `VISIT_STATUSES` 검사. **`cancelled`로는 `registered`·`waiting`인 내원만** 바꿀 수 있고, 아니면 409 `{error:'Only a waiting visit can be cancelled', status:<지금 상태>}` — 진료·처방·청구가 붙은 내원을 취소하면 다른 화면이 모두 무시하는 내원에 그것들이 매달려 버리기 때문 **`registered`·`waiting` → `completed`이면 같은 UPDATE에서 `visit_type='none'`**(진료 없이 끝낸 것 — 실장님 결정 ⑳). 취소 안 된 청구가 이미 있으면 바꾸지 않음. `in_progress → completed`는 그대로 | 접수 |
| `PUT /api/visits/:id` | 수정. **본문에 있는 칸만** 씀 (`VISIT_FIELDS`: `visit_type` `department_id` `doctor_id` `chief_complaint` `reception_memo` `status`). `department_id`·`doctor_id`는 `null`/`''`로 **비울 수 있음**. `visit_type`·`status`는 `null`이면 무시, 값이 있으면 POST와 같은 목록으로 검사(400). 빈 본문은 400. 한 트랜잭션(내원 줄 잠금): 과·의사가 **실제로** 바뀌면 전과와 같은 `applyTransfer` — 기록 한 줄(`visit.transfer`, 사유 없음), 그 내원의 `consultation.department_id`를 새 과로(2026-09-30). **수납 뒤 과·의사 변경은 거절**(2026-09-30 실장님 결정 — 전과 길과 같은 규칙, 같은 함수 `activeReceipt()`): 취소 안 된 영수가 있고 과 또는 의사가 **실제로** 바뀌는 요청이면 409 `{error, code:'VISIT_BILLED', receipt_no}`, 아무것도 쓰지 않음. 같은 값(글자 `"8"`도 숫자 8과 같게 봄)을 다시 보내거나 주호소·메모만 고치는 저장은 됨. 없는 내원은 404 `{error:'Visit not found', code:'VISIT_NOT_FOUND'}` | 접수, 수납(`visit_type`만) |
| `PUT /api/visits/:id/transfer` | **전과**(2026-09-30, 실장님 요청 — 「접수 취소하고 다시 접수는 번거롭다」). 본문 `{department_id, doctor_id, reason?}`: `department_id`는 쉬지 않는 과(필수), `doctor_id`는 `role='doctor'`·`status='active'`인 계정 또는 `null`(의사 없이), `reason`은 글자(300자까지, 없어도 됨). 한 트랜잭션(`FOR UPDATE`): `visit.department_id`·`doctor_id`, 그 내원의 `consultation.department_id`(있으면), 기록 한 줄 `visit.transfer`. **진료 기록·처방·오더·글쓴이(`consultation.doctor_id` 포함)는 그대로.** 거절 — 모두 `{error, code}`: 404 `VISIT_NOT_FOUND` · 409 `VISIT_CANCELLED`(취소된 내원) · 409 `VISIT_BILLED` + `receipt_no`(취소 안 된 영수가 있음 — 영수를 취소하면 다시 됨) · 400 `BAD_DEPARTMENT`(없음·쉼·빠짐) · 400 `BAD_DOCTOR`(의사가 아니거나 쉬는 계정, 숫자 아님) · 400 `NO_CHANGE`(과·의사가 그대로). 답: `/today`와 같은 모양의 내원 줄(`dept_code`·`dept_name`·`doctor_name`·환자 칸·`has_active_bill`) | 진료(단추), 접수 |

두 라우트 파일의 모든 경로(읽기 포함)는 DB 오류를 공용 `utils/dbError.js`의 `sendDbError`로 4xx(형식 오류 400 — 예: `/patients/abc`, `limit=x` — 없는 참조 400, 중복 409 등)로 돌려줌. 예전에는 전부 500에 DB 원문이었음.

**변경 기록** (2026-09-29 실장님 결정, `wiki/03-change-log.md`) — `PUT /patients/:id`만 남김. 새 환자 등록(`POST`)은 남기지 않음.
- `writeAudit(client, req, { action: ACTIONS.PATIENT_EDIT, patient_id, entity: 'patient', entity_id, summary, before, after })` — 같은 트랜잭션의 `client`라 저장이 롤백되면 기록도 없음. 기록이 실패해도 저장은 됨(함수 규칙).
- `before`·`after`는 `auditView()`: `PATIENT_FIELDS` 13칸(성·이름·신분증 번호·생년월일·성별·전화·휴대폰·주소·도시·지역·혈액형·알레르기·접수과 메모). 함수가 **다른 칸만** 남김. `summary`는 바뀐 칸 이름들(예: `phone, allergies`).
- **빈 칸은 `null`과 `''`를 같은 것으로 봄**(`date_of_birth`만 `null`). 접수는 기존 환자로 접수할 때마다 인적사항을 같이 저장하고, 빈 칸을 `''`로 보냄 — 이 처리가 없으면 아무것도 안 고친 접수마다 「전화 null → ''」 같은 줄이 쌓임.
- 환자 이름·차트번호는 함수가 `patient_id`로 채우는데, 같은 트랜잭션 안에서 읽으므로 **고친 뒤의 이름**이 들어감(이름을 고친 줄이면 새 이름. 옛 이름은 `before_value`에 있음).
- 환자 비활성(숨기기)은 아직 없음(7절 ⑲ — 결정 대기). 생기면 `is_active`를 `auditView`에 더할 것.

**날짜 형식**: `date_of_birth`·`visit_date` 같은 DATE 칸은 `'YYYY-MM-DD'` 문자열로 나감 — 총괄 `7ad4387`이 `config/database.js`에서 node-postgres의 DATE 파서를 바꿈. 그 전에는 UTC 타임스탬프로 나가 하루 이르게 보였음 (7절 ㉑).

### 공용 부품

- `frontend/src/components/PatientFinder.jsx` — 공용, **접수 주관**. 쓰는 곳: `Registration.jsx` 418행, `Pharmacy.jsx` 231행 (`mode="patient"`), `Consultation.jsx` 669·671행, `Payment.jsx` 449행, `Lab.jsx` 183행 (`mode="visit"`).
- 접수가 쓰는 남의 공용 부품: `DocumentModal.jsx`(진료 주관) — `category="chart" readOnly`로 차트뷰어. `TopBar.jsx`(총괄).

### DB 테이블

**`patient`** (`001_schema.sql` 52~73행, `reception_note`는 `008_patient_note.sql`에서도 `IF NOT EXISTS`로 추가)

| 컬럼 | 형 | 비고 |
|---|---|---|
| `id` | SERIAL PK | |
| `chart_no` | VARCHAR(20) UNIQUE NOT NULL | `generate_chart_no()` — 해마다 1번부터(마이그레이션 101). DICOM 워크리스트의 PatientID로 나감 |
| `last_name` / `first_name` | VARCHAR(100) NOT NULL | 빈 문자열은 들어갈 수 있음 |
| `national_id` | VARCHAR(50) | 화면 입력 칸 없음 |
| `date_of_birth` | DATE | 미래·1875년 이전은 서버가 거절 |
| `gender` | VARCHAR(1) CHECK `M`,`F` | `validate.js`의 `GENDERS`도 `M`·`F`(2026-09-29 맞춤 — 예전엔 `O`도 받아 DB가 거절) |
| `phone` / `mobile` | VARCHAR(50) | 화면은 `phone`만 입력 |
| `address` / `city` / `region` | TEXT / VARCHAR(100) | 화면 입력 칸 없음. 문서 양식은 `address`를 인쇄함 |
| `blood_type` | VARCHAR(5) | 화면: A± B± AB± O± |
| `allergies` | TEXT | 진료 화면에 빨간 경고로 뜸 |
| `reception_note` | TEXT | 접수과 메모 (환자에 영구히 붙음) |
| `is_active` | BOOLEAN DEFAULT TRUE | 검색에서만 걸러냄. **끄는 곳이 없음** |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

색인: `idx_patient_chart(chart_no)`, `idx_patient_name(last_name, first_name)`. 시퀀스 `chart_no_seq`는 2026-09-29부터 쓰지 않음(남겨 둠).

**`visit`** (`001_schema.sql` 76~94행)

| 컬럼 | 형 | 비고 |
|---|---|---|
| `id` | SERIAL PK | `consultation` `order_item` `billing` `document_log` `lab_result`가 참조 |
| `patient_id` | FK → patient NOT NULL | |
| `visit_date` | DATE DEFAULT CURRENT_DATE | DB 시간대(`PGTZ`, `.env`의 `TZ`) 기준 날짜 |
| `visit_type` | VARCHAR(20) DEFAULT `newVisit` | `newVisit` `followUp` `emergency` `referral` `none` — 수납 진료비 `C01`~`C04`, `none`은 진료비 없음. 모르는 값은 `C01`로 계산됨 |
| `department_id` | FK → department | 통계의 진료과별 내원·매출 기준 |
| `doctor_id` | FK → staff | |
| `reception_time` | TIME | 백엔드 컨테이너 시각(`TZ`) `HH:MM` |
| `chief_complaint` / `reception_memo` | TEXT | |
| `status` | CHECK `registered` `waiting` `in_progress` `completed` `cancelled` | 기본값 `registered`지만 API는 `waiting`으로 만듦 |
| `registered_by` | FK → staff | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**내원 상태를 바꾸는 곳**

| 누가 | 무엇으로 | 어디 |
|---|---|---|
| 접수 | → `waiting` (생성), 손으로 옮기기, 취소 | `visit.routes.js` |
| 진료 | 진료 시작 → `in_progress`, 진료 완료 → `completed` | `consult.routes.js` 35·42·84행 |
| 수납 | 상태는 안 바꿈. `completed`인 내원만 수납 대기에 올림 | `billing.routes.js` 38·56행 |

## 5. 다른 모듈과의 연결

- **진료** — `/visits/today`를 15초마다 읽어 대기 환자를 보여줌. 환자를 열면 내원이 `in_progress`, 완료하면 `completed`. 진료 화면의 알레르기 경고는 접수에서 넣은 `patient.allergies`. `consultation.visit_id`로 내원에 매달림 (내원 하나에 진료 하나 — `idx_consult_visit_unique`).
- **수납** — `status='completed'`인 내원이 수납 대기에 뜸. 진료비는 `visit.visit_type`으로 정해짐(`newVisit` C01, `followUp` C02, `none` 0). **접수가 고른 값이 수납 화면 진료비 칸의 처음 값**(`Payment.jsx`가 `bi.visit_type`을 읽음 — 수납 코드 변경 없이). 수납 화면에서 바꾸면 `PUT /visits/:id`로 내원에 다시 씀. 청구가 생기면 접수 쪽 단추는 잠김. 접수가 대기 중 환자를 「Terminer →」로 보내면 `none`(진료비 0)으로 수납 대기에 뜸. ⚠ 수납 대기(`/billing/pending`)는 청구 전 내원을 **`visit_date = CURRENT_DATE`인 것만** 보여 줌 — 작업일자로 지난 날의 「진료중」 내원을 완료로 정리해도 수납 목록에 뜨지 않음(수납 세션에 확인 요청, 2026-09-29). 접수 화면의 미수·환불예정 배지는 `/billing/patient/:id/balance`.
- **약국 · 임상병리** — 환자 찾기 창(`PatientFinder`)과 `chart_no`로 환자를 찾음. 검사 결과는 `lab_result.visit_id`로 내원에 붙음.
- **PACS** — 워크리스트가 `patient.chart_no`를 DICOM **PatientID**로, `date_of_birth`·`gender`를 그대로 장비에 보냄 (`worklist.routes.js` 70·85행, `pacs.routes.js` 159행). 차트번호가 바뀌면 영상과 환자의 연결이 끊어집니다.
- **통계** — `visit`를 날짜 범위로 세서 총 내원, 초진(`newVisit`)/재진(`followUp`)/기타, 상태별, 진료과별, 의사별, 월별 추이를 냄 (`stats.routes.js` 28~55·146행). 2026-09-29부터 접수에서 초진/재진을 고르므로 수납 전에도 맞게 잡힘(그 전 기록은 수납 전까지 모두 `newVisit`이었음).
- **문서** — `DocumentModal`이 `/patients/:id`로 환자 정보를 받아 인쇄 양식 머리에 넣음 (주소·전화 포함).
- **설정** — 담당의사 목록은 `/admin/doctors`(`role='doctor'`이고 `active`인 직원), 진료과는 직원의 소속과(`staff.department_id`). 설정 화면 직원 탭에서 정합니다. 환자 인적사항 수정 기록은 설정 → 「기록」 탭(설정 권한, 설정 세션이 만드는 중)에서 읽음 — 표 `audit_log`, action `reception.patient.edit`.

## 6. 설정 항목

접수 전용 설정은 **없음**. 접수 화면이 기대는 다른 설정:

- **설정 → 직원 → 권한**: 🏥 Enregistrement(`registration`)가 있어야 접수 화면과 환자 등록·접수 API를 씀. 접수(Accueil)·간호사(Infirmier(ère)) 역할은 기본으로 있음. 다른 화면이 환자를 찾고 보는 데 필요한 권한은 4절 표.

- **설정 → 직원**: 역할이 `doctor`이고 활성인 직원만 담당의사 목록에 나옴. 직원의 소속 진료과가 접수 때 진료과로 들어감 — 소속과가 없으면 진료과 없이 접수됨.
- **설정 → 오더 코드**: 진료비 `C01`(초진) `C02`(재진) 가격 — 수납이 `visit_type`으로 고름. `C03`(응급)·`C04`(의뢰)는 옛 기록용으로 남아 있고 접수에서는 고르지 않음. 「진료비 없음」은 코드 없이 0.
- **설정 → 직원 → 소속 진료과**: 초진/재진 제안이 의사의 소속과로 「같은 과」를 판단함. 소속과가 없는 의사를 고르면 늘 초진 제안.
- **`.env`의 `TZ`**: 「오늘」의 기준. DB(`PGTZ`)와 백엔드가 같은 값을 써야 `visit_date`와 `reception_time`이 맞음. `docker-compose.yml`은 `.env`에 `TZ`가 없으면 DB는 `UTC`, 백엔드는 `Indian/Antananarivo`로 **서로 다르게** 기본값을 잡음 — 설치 스크립트가 `.env`에 `TZ`를 넣으므로 보통은 문제없음.

## 7. 알려진 문제 · 제약

2026-09-29 접수 세션이 코드를 읽고 찾은 것과 그날 고친 것. 「재현」 칸이 「코드」인 것은 코드를 읽어서 확인했고 화면으로는 안 눌러 봤습니다. 「화면」은 격리 스택에서 눌러 본 것입니다.

- **고친 것**(✅): ① ② ③ ④ ⑤ ⑦ ⑧ ⑨ ⑪ ⑰, 총괄이 고친 ㉑ ㉒. 고친 줄의 「근거」 칸 줄 번호는 **고치기 전** 코드 기준입니다.
- **하지 않기로 한 것**: ⑥(실장님 결정).
- **남은 것**: 표 아래 「남은 것」에 결정 필요 / 결정 없이 가능으로 나눠 두었습니다.

| # | 심각도 | 문제 | 근거 | 재현 |
|---|---|---|---|---|
| ① | ✅ 고침 (높음) | **대기 취소 버튼이 항상 실패한다.** 화면이 `'canceled'`(l 하나)를 보내는데 서버·DB는 `'cancelled'`만 받음 → 400 오류 창. 대기 취소를 화면에서 할 방법이 없음 | `Registration.jsx:233` · `validate.js` `VISIT_STATUSES` · `001_schema.sql:87` | 코드 |
| ② | ✅ 고침 (높음) | **「접수 정보 수정」이 옛 상태값으로 덮어쓴다.** 대기 목록에서 고른 순간의 `sel.status`를 같이 보냄. 그 사이 의사가 진료를 끝냈으면(`completed`) 다시 `waiting`으로 돌아가 **수납 대기 목록에서 빠지고** 진료 대기에 다시 뜸. 접수 화면은 자동 새로고침이 없어 이런 틈이 김 | `Registration.jsx:208` · `visit.routes.js:109` · `billing.routes.js:56` | 코드 |
| ③ | ✅ 고침 (보통) | 같은 신규 환자가 두 번 등록될 수 있었다 — 버튼 연타·재시도(1차에서 고침), 그리고 다른 날 같은 사람을 새 차트로 또 등록(2026-09-29 ④로 동명이인 경고) | `Registration.jsx` `withBusy` · `confirmNewPatient` | 화면 |
| ④ | ✅ 고침 (보통) | 같은 환자를 같은 날 두 번 접수해도 경고가 없었다. → 화면 목록으로 먼저 묻고, 다른 창구 몫은 서버 409로 한 번 더 물음. 실장님 결정대로 **경고만**(막지 않음) | `Registration.jsx` `postVisit` · `visit.routes.js` `POST /` | 화면 + 시험 스크립트 |
| ⑤ | ✅ 고침 (보통, 잠재) | **대기 목록에서 고른 환자를 저장하면 `national_id` `mobile` `address` `city` `region`이 빈 값으로 덮인다.** `/visits/today`가 이 칸들을 안 주는데 화면은 빈 문자열로 채워 `PUT /patients`로 보냄. 지금은 이 칸들을 입력하는 화면이 없어 잃을 값이 없지만, **주소·연락처 입력 칸을 추가하는 순간 실제 데이터 손실이 됨** | `Registration.jsx:127-132,145-157,190-197` · `visit.routes.js:13` · `patient.routes.js:81` | 코드 |
| ⑥ | 하지 않음 (실장님 결정) | 진료과를 의사와 따로 고르는 칸 — 2026-09-29 실장님 결정으로 **만들지 않음**. 「진료과 + 원장님 이름」이 한 줄(`GS – 이름`)로 붙어 나오는 지금 방식이 병원의 방식. 소속과가 없는 의사로 접수하면 진료과가 비는 점은 그대로(설정에서 소속과를 넣어 해결) | `Registration.jsx` 담당의 선택 | — |
| ⑦ | ✅ 고침 (보통) | 내원구분을 고르는 칸이 없어 모든 접수가 `newVisit`였다. → 단추 **초진 · 재진 · 진료비 없음**(실장님 결정 — 응급·의뢰 없음), 같은 과에 온 적 있으면 재진 제안, 청구 뒤 잠금, 수정 때는 바꿨을 때만 저장 | `Registration.jsx` `suggestedVisitType` · `visit.routes.js` `/today` | 화면 9가지(3절 흐름대로) |
| ⑧ | ✅ 고침 — S2 (보통) | 환자·내원 API에 모듈 권한 검사가 없었다(로그인만 하면 약국·검사 계정도 인적사항 수정·내원 상태 변경 가능). → 2026-09-29 실장님 결정 S2로 라우트별 권한(4절 표). 수납 권한만 있는 계정은 `PUT /visits/:id`에서 `visit_type`만 | `patient.routes.js` · `visit.routes.js` | 시험 스크립트 114건 + 역할별 화면 |
| ⑨ | ✅ 고침 (보통) | `PUT /visits/:id`는 `visit_type`·`status` 검사를 안 한다 (`POST`는 함). 잘못된 `visit_type`은 수납에서 `C01` 진료비로 조용히 계산됨. 또 `COALESCE` 때문에 담당의·진료과를 **비울 수 없음** | `visit.routes.js:103-118` vs `:68` · `billing.routes.js:28-30` | 코드 |
| ⑩ | ✅ 고침 — 실장님 결정 | 지난 날의 대기가 사라졌다(`/visits/today`는 오늘 것만) → 접수 화면 맨 위 왼쪽에 **작업일자**(◀ 날짜 ▶, 오늘로). 지난 날은 보기와 정리만. 자정을 넘기면 오늘을 보던 화면은 저절로 새 날로 | `Registration.jsx` 작업일자 · `visit.routes.js` `GET /day` | 시험 4건 + 화면(어제 목록·정리·오늘로·자정 흉내) |
| ⑪ | ✅ 고침 (낮음) | 알림 문구 일부가 영어로 고정 — `' required'`, `'Error: '`, 서버 오류 원문. 1차에서 이름·생년월일·취소 불가·오류 접두어를, 이어서 ⑪ 마무리에서 완료·확인 창 문장, 생년월일 칸 `YYYY/MM/DD`(→ `AAAA/MM/JJ`), 서버 연결 실패·기록 없음·형식 오류를 번역. 남은 것: 표에 없는 드문 서버 오류는 「Erreur : 원문」 | `Registration.jsx` `errText`·`fill` | 화면 |
| ⑫ | ✅ 고침 — 실장님 결정 (낮음) | 성별 기본값이 「남」이라 안 누르고 넘어가면 여자 환자가 남자로 저장됐다 → 안 눌린 상태로 시작, 안 고르면 저장 안 됨(`rc_genderRequired`) | `Registration.jsx` `emptyForm`·`patientToForm`·`formProblem` | 화면 — 한국어·프랑스어 |
| ⑬ | ✅ 고침 (낮음) | 서버 검사는 성별 `O`를 허용하는데 DB는 `M`/`F`만이라 DB 오류가 났다. 같이: API로 `2020-02-30` 같은 없는 날짜를 보내면 `new Date()`가 3월 1일로 넘겨 통과시켜 500. → `GENDERS = ['M','F']`, 생년월일은 `YYYY-MM-DD`이고 달력에 있는 날이어야 함(총괄 허락, 총괄 파일 `utils/validate.js`). 총괄이 `dbError.js`에 22008도 넣음 | `validate.js` `badPatient` | 시험 스크립트 7건 |
| ⑭ | ✅ 고침 (낮음) | 생년월일을 덜 쓰고 저장하면 반쪽 값이 서버로 갔고(1차에서 저장 전에 막음), 연도 칸이 빈 채 월부터 치면 값이 연도 칸으로 옮겨갔다 → 빈 칸도 제자리를 지키게(`-05-`) | `Registration.jsx` `DobInput` `emit` | 화면 — 월·일 먼저 → [ ][05][03], 저장 안내, 연도 채우면 1990-05-03 |
| ⑮ | ✅ 고침 (낮음) | 환자 찾기 창의 외래 내역에 취소된 내원이 구분 없이 나왔다 → 흐리게 + 취소선 + 「접수 취소」 딱지(동작은 그대로) | `PatientFinder.jsx` 내원 표 | 화면 — 진료·수납·임상병리에서 |
| ⑯ | ✅ 고침 (낮음) | 검색이 「성 이름」 순서로만 찾았고, 검색어의 `%` `_`가 와일드카드로 먹혔고, `limit`에 숫자가 아니면 500이었다 → 두 순서 모두, `%` `_`는 글자 그대로(ESCAPE `!`), `limit` 1~200·`offset`은 숫자로 읽고 아니면 기본값, 검색어의 겹친 공백 정리 | `patient.routes.js` `GET /` | 시험 스크립트 7건 + API |
| ⑰ | ✅ 고침 (낮음) | 접수 대기 목록에 자동 새로고침이 없었다 (진료 화면은 15초마다). ②의 원인이기도 했음. → 30초마다, 탭이 보일 때만, 입력값 유지, 실패해도 목록 유지 | `Registration.jsx` `refreshQueue` | 화면 — 뒤에서 `in_progress`로 바꾸고 30초 뒤 탭 이동·취소 버튼 사라짐·쓰던 메모 유지, API 멈춤 중 502에도 목록 유지·알림 없음, 가려진 63초 동안 요청 0건 |
| ⑱ | ✅ 고침 — 실장님 결정 | 차트번호가 해를 넘어 이어졌고(결정: 해마다 1번부터), 99,999를 넘으면 `LPAD`가 잘라 번호가 겹쳤다. 번호 받기와 저장이 한 트랜잭션이 아니었다 → 「그 해 최대 + 1」을 잠금 아래에서, 등록과 한 트랜잭션으로. 넘으면 6자리. 복원 뒤에도 맞음 | 마이그레이션 `029_reception_chart_no_yearly.sql` · `patient.routes.js` `POST /` | 시험(HTTP 동시 20명 + SQL) + 복원 |
| ⑲ | 하지 않음 (실장님 결정) | 환자 비활성화·중복 환자 합치기 기능 — 2026-09-29 실장님 결정으로 **만들지 않음**. 중복 차트는 ③·④의 동명이인 경고로 생기지 않게 막는 쪽으로. 그래도 생기면 DB 직접 수정(총괄) | `patient.is_active` 쓰는 곳 없음 | — |
| ⑳ | ✅ 고침 — 실장님 결정 | 대기 중 환자의 「완료로 →」가 진료 없이 내원을 완료시켜 초진 진료비(C01)로 수납에 보냈다 → 단추는 남기되, 이 경로로 완료되면 내원구분을 **진료비 없음**으로(서버, 청구 전만). 누를 때 확인 창 | `visit.routes.js` `PUT /:id/status` · `Registration.jsx` `completeWithoutConsult` | 시험 스크립트 3건 + 화면 |
| ㉑ | ✅ 고침 — 총괄 `7ad4387` (높음) | **날짜가 하루 이르게 나오고, 접수에서 저장하면 생년월일이 실제로 하루 당겨진다.** node-postgres가 DATE를 서버 시간대(`Indian/Antananarivo`, UTC+3) 자정의 `Date`로 읽고, JSON으로 내보낼 때 UTC로 바뀌어 `1990-05-03` → `"1990-05-02T21:00:00.000Z"`가 됨. 화면들은 `split('T')[0]`으로 앞부분만 써서 **5월 2일**로 표시. 접수 화면은 이 값을 그대로 입력칸에 넣으므로 환자를 불러 저장할 때마다 DB의 생년월일이 하루씩 앞으로 감. 같은 이유로 환자 찾기 창의 내원 날짜, 진료 화면 머리의 생년월일, **인쇄 문서의 생년월일·나이**(`shared.jsx` `fmtDate`·`calcAge`)도 하루 이름. 워크리스트는 `dicomDate`로 이미 고쳐져 있음(CHANGELOG 276행) | `config/database.js`(DATE 파서 없음) · `Registration.jsx` `fillPatient`·`selectVisit`의 `split('T')` · `PatientFinder.jsx:69` · `shared.jsx:12-21` | **화면** — DB `1990-05-03` → 화면 `1990-05-02` → 「환자 정보 저장」 → DB `1990-05-02`. 시간대가 UTC보다 동쪽인 모든 설치에서 일어남 |
| ㉒ | ✅ 고침 — 총괄 `b01c6a0`, `proxy_connect_timeout 5s` (낮음) | 서버(백엔드)가 멈춘 채 nginx가 예전 주소를 기억하고 있으면, 저장 버튼이 **1분 가까이** 「Enregistrement…」로 멈춰 있다가 「Impossible de joindre le serveur」가 뜸 (nginx 기본 연결 대기 60초). nginx를 백엔드가 멈춘 뒤 새로 띄운 경우엔 바로 뜸. 버튼 잠금이 풀리니 데이터 문제는 없음. 줄이려면 `frontend/nginx.conf`에 `proxy_connect_timeout`(총괄 소관) | `frontend/nginx.conf` `location /api/` | 화면 — 격리 스택에서 API 컨테이너만 멈추고 저장 |

**제약**

- 신분증 번호·휴대폰·주소·도시·지역은 DB에 칸이 있지만 입력하는 화면이 없음 — 2026-09-29 실장님 결정으로 **더 넣지 않음**(전화번호 칸은 있음). 문서 양식은 주소를 인쇄하므로 늘 빈칸으로 나감. 나중에 넣게 되면 3절 「보내는 환자 필드」의 주의대로(1차 ⑤ 수정 덕에 덮어쓰기 위험은 없음).
- 동명이인 판단은 이름만. 프랑스어·말라가시어 악센트(à â ä á ã å æ ç é è ê ë í ì î ï ñ ó ò ô ö õ ø œ ú ù û ü ý ÿ)는 무시 — 이 목록 밖의 악센트 글자는 다른 글자로 봄. 두 창구가 **정확히 같은 순간** 같은 환자를 접수하면 둘 다 통과할 수 있음(서버 확인에 잠금 없음 — 경고일 뿐이라).
- 담당의사 목록은 역할이 `doctor`인 직원만. 역할이 `admin`인 의사는 목록에 안 나옴 (`admin.routes.js`의 `/doctors`).

### 남은 것 (2026-09-29 저녁 기준)

위 표의 ①~㉒는 모두 고쳤거나(✅) 실장님 결정으로 하지 않기로 했습니다(⑥ ⑲). 실장님 결정이 필요했던 것(⑫ ⑳ ⑩ ⑱, 관리자 의사)도 모두 정해져 구현·확인했습니다(`decisions.md`, 8절). 접수 안에서 **결정이 필요한 것은 없습니다.**

**다른 모듈에 걸린 것** (접수가 고칠 곳이 아님)

| 무엇 | 어디 | 상태 |
|---|---|---|
| 작업일자로 **지난 날 「진료중」 내원을 완료로 정리해도 수납 목록에 안 뜸** — 수납 대기는 청구 전 내원을 오늘 날짜 것만 보여 줌. 의사가 진료하고 완료를 빠뜨린 경우 청구가 빠질 수 있음. 진료 없이 완료(진료비 없음)한 내원은 안 뜨는 것이 맞음 | `billing.routes.js` `/pending` (수납) | 수납 세션이 고치는 중(총괄 전달). 2026-09-29 격리 스택에서 다시 확인: 아직 안 뜸 |
| 진료 없이 「완료」로 보낸 내원(`visit_type='none'`)이 통계의 총 내원·「기타」에 들어감 — 서류만 떼러 온 사람도 내원 1건으로 셈 | `stats.routes.js` `/summary` (통계) | 의도인지 통계 쪽 판단 필요(격리 스택에서 확인: 어제 정리한 3건 중 진료비 없음 1건이 `other_visits`에) |
| 번역 파일 세 개에 `chartNo` 키가 두 번 들어 있음(처음 커밋부터) — 뒤의 값이 이김(프랑스어 화면은 「N° dossier」) | `i18n/*.js` 17·52행 근처 (공용, 총괄) | 보고만. 화면 동작에는 문제없음 |

**결정 없이 할 수 있는 것** (작음)

| 무엇 | 크기 |
|---|---|
| 영어 화면을 처음부터 끝까지 눌러 보기 — 여러 작업에서 영어는 키만 넣고 눈으로는 안 봄 | 확인만 |
| 같은 날 두 번 접수를 두 창구가 **정확히 같은 순간** 누르면 둘 다 통과할 수 있음(경고일 뿐이라 둠). 막고 싶다면 환자별 잠금 | 작음 — 필요하다고 할 때만 |

## 8. 변경 기록

### 2026-09-29 한 일 — 처음 읽는 분을 위한 요약

이날 접수 모듈을 처음부터 다시 읽고(현황 파악, 문제 22개), 현장에서 바로 사고가 나던 곳부터 고쳤습니다. 결정이 필요한 것은 실장님께 여쭤 정한 대로 했습니다(`wiki/decisions.md`). 모두 격리 스택(9181)에서 한국어·프랑스어 화면으로 눌러 봤고, 역할별 권한과 중복 경고는 시험 스크립트 `backend/test/reception.api.mjs`(131건)로 다시 확인할 수 있습니다.

- **접수가 진료·수납을 망가뜨리던 것**: 「접수 정보 수정」이 의사가 끝낸 진료를 대기로 되돌려 수납 목록에서 빼던 것(②) · 대기 취소 단추가 오타로 늘 실패하던 것(①) — 고치면서, 진료가 이미 시작된 환자는 취소되지 않게.
- **환자 기록이 틀어지던 것**: 버튼을 두 번 누르거나 오류 뒤 다시 누르면 같은 환자가 둘 생기던 것(③) · 대기 목록에서 고른 환자를 저장하면 보이지 않는 칸(주소 등)을 비우던 것(⑤) · 저장할 때마다 생년월일이 하루씩 당겨지던 것(㉑ — 원인을 찾아 총괄이 서버에서 고침).
- **현장 말(프랑스어)로**: 오류·확인·완료 창, 생년월일 칸(AAAA/MM/JJ), 서버가 멈췄을 때 안내(⑪). 직원용 사용법(2절)을 프랑스어 화면 기준으로.
- **대기 목록이 스스로 최신으로**: 30초마다, 쓰던 내용은 그대로(⑰).
- **권한**: 서버도 화면 권한대로 — 약국·검사 계정은 환자 등록·수정 불가, 수납 계정은 진료비 종류만(⑧, 실장님 결정 S2).
- **내원구분**: 초진 · 재진 · 진료비 없음 단추, 같은 과에 온 적 있으면 재진을 골라 둠, 수납 뒤에는 잠김(⑦, 실장님 결정). 진료과를 따로 고르는 칸은 만들지 않음(⑥, 실장님 결정).
- **중복 경고**: 같은 이름 환자가 있으면 새 차트 전에, 오늘 이미 접수된 환자면 두 번째 접수 전에 묻기 — 막지는 않음(③·④, 실장님 결정).
- **남은 것**: 7절 끝 「남은 것」 — 결정 필요 6개, 결정 없이 가능 5개.

### 커밋별

| 날짜 | 무엇이 바뀌었나 (현장 눈으로) | 코드 쪽 | 커밋 |
|---|---|---|---|
| 2026-09-29 | 현황 파악 — 위키 1~7절, 문제 목록 20개 | 코드 변경 없음 | `1ee97ce` |
| 2026-09-29 | 대기 취소가 됨(진료 시작된 환자는 안 됨) · 접수 수정이 진료 상태를 되돌리지 않음 · 두 번 눌러도 환자 한 명 · 보이지 않는 칸을 비우지 않음 · 오류 창 번역 시작 (① ② ③ ⑤ ⑨ ⑪) | `'cancelled'` 철자, 취소는 대기 중만(409), `PUT`은 보낸 칸만(`PATIENT_FIELDS`·`VISIT_FIELDS`), `withBusy`, `formProblem`, `sendDbError` (3절) | `bb4a1e6` |
| 2026-09-29 | (총괄) 생년월일·날짜가 하루 이르게 나오고 저장 때 당겨지던 것 (㉑) | `config/database.js` DATE를 문자열로 | 총괄 `7ad4387` |
| 2026-09-29 | 완료·확인 창이 말이 되는 문장으로, 생년월일 칸 AAAA/MM/JJ, 서버 멈춤·기록 없음 안내 (⑪) | `fill()`, `errText()` 대응 표, 읽기 경로도 `sendDbError` (3절) | `e6ef6e8` |
| 2026-09-29 | (총괄) 서버가 멈췄을 때 저장 버튼이 1분 멈춰 있던 것이 몇 초로 (㉒) | `nginx.conf` `proxy_connect_timeout 5s` | 총괄 `b01c6a0` |
| 2026-09-29 | 대기 목록이 30초마다 저절로, 쓰던 내용 유지, 진료가 시작되면 취소 단추가 사라짐 (⑰) | `refreshQueue()`, `queueSeq`, `document.hidden` (3절) | `eb2d19c` |
| 2026-09-29 | 직원용 사용법(2절)을 프랑스어 화면 기준으로 — 칸별 뜻 표, 안내 창 표 | 위키만 | `e467849` |
| 2026-09-29 | 2차 작업 계획(내원구분·중복 경고) — 결정 대기 자료 | 인계 노트만 | `a90fe6e` |
| 2026-09-29 | 접수 권한이 없는 계정은 환자 등록·접수 불가, 수납 계정은 진료비 종류만, 권한이 빠지면 안내 (⑧ · S2) | 라우트별 `permMiddleware`, 시험 `backend/test/reception.api.mjs` (4절 권한 표) | `3e03fa4` |
| 2026-09-29 | 내원구분 단추 초진·재진·진료비 없음, 같은 과면 재진을 골라 둠, 수납 뒤 잠김, 수정 때 수납이 바꾼 값을 덮지 않음 (⑦) | `suggestedVisitType()`, `visitTypeSource`, `/visits/today`의 `has_active_bill`, `/visits/patient`에 접수 권한 (3절) | `520706d` |
| 2026-09-29 | 같은 이름 환자가 있으면 새 차트 전에 묻기(이 환자로 / 그래도 새로 / 취소), 오늘 이미 접수된 환자면 두 번째 접수 전에 묻기 (③ ④) | `GET /patients/similar`, `confirmNewPatient()`, `postVisit()`, `POST /visits` 409·`allow_duplicate` (3·4절) | `25a7fac` |
| 2026-09-29 | 2절을 지금 화면으로 다시 대조(설정 탭 「Personnel」·역할 「Accueil」, 칸 「N° dossier」), 7절 「남은 것」을 지금 기준으로, 차트번호 SQL 시험에 롤백·다른 접두어 경우 | 위키·시험만 | (이 커밋) |
| 2026-09-29 | 차트번호가 해마다 1번부터(2027년 첫 환자 27-00001), 동시에 등록해도 겹치지 않음, 10만 번을 넘으면 6자리, 백업을 복원해도 다음 번호가 맞음 (⑱, 실장님 결정) | 마이그레이션 101(→ 029) `generate_chart_no(p_day)`, `POST /patients` 트랜잭션 (3절 채번) | `3bffe2d` |
| 2026-09-29 | 접수 화면 맨 위 왼쪽에 작업일자 — 지난 날의 접수를 보고 정리(취소·완료), 새 접수는 오늘만, 자정이 지나면 저절로 새 날 (⑩, 실장님 결정) | `GET /visits/day`, `workRef`·`viewingPast`·`selIsPast` (3·4절) | `3bd346a` |
| 2026-09-29 | 대기 중 환자를 「Terminer →」로 보내면 확인 뒤 진료비 없음으로 수납에 (⑳, 실장님 결정) | `PUT /visits/:id/status`의 `CASE`, `completeWithoutConsult()` (4절) | `079b0fb` |
| 2026-09-29 | 성별이 안 눌린 상태로 시작, 안 고르면 저장 안 됨 (⑫, 실장님 결정) | `emptyForm.gender = ''`, `formProblem()`, `rc_genderRequired` | `c135972` |
| 2026-09-29 | 생년월일을 월부터 쳐도 칸이 섞이지 않음 (⑭), 같은 이름 경고가 악센트만 다른 이름(Hélène/Helene)도 찾음 | `DobInput` `emit`, `/patients/similar`의 `FOLD()` | `19ae811` |
| 2026-09-29 | API가 성별 `O`·없는 날짜(2월 30일)·`1990-5-3` 같은 모양을 분명한 400으로 거절. 화면 동작은 그대로(원래 저장 전에 막음) (⑬) | 총괄 파일 `utils/validate.js` `GENDERS`·`badPatient`(허락), 화면 `errText`에 22008 문구 | `ec8559c` |
| 2026-09-29 | 환자 검색이 「이름 성」 순서로도 찾음, `%` `_`를 쳐도 아무 환자나 나오지 않음 (⑯) | `GET /patients` ESCAPE `!`, `intParam()` (4절) | `8dd267a` |
| 2026-09-29 | 환자 찾기 창에서 취소된 내원이 흐리게, 「Visite annulée」 딱지와 함께 (진료·수납·임상병리 모두) (⑮) | 공용 `PatientFinder.jsx` — 표시만, 동작 그대로 | `6c13b33` |
| 2026-09-29 | 환자 인적사항을 고치면 뒤에서 기록(누가·무엇을·전→후). 화면은 그대로, 안 고친 접수는 기록 없음 | `PUT /patients/:id` 트랜잭션 + `writeAudit(PATIENT_EDIT)`, `auditView()` (4절 변경 기록) | `f0b3e3b` |
| 2026-09-29 | 2절에 내원구분·중복 경고 사용법 정리, 7절 남은 것을 결정 필요 / 결정 없이 가능으로, 이 변경 기록 정리 | 위키만 | `ac5209e` |
| 2026-09-29 | (통합 시험 뒤) 환자 검색에 결과가 없으면 칸 아래 안내 한 줄, 생년월일에 날짜 전체를 붙여넣으면 세 칸으로 나뉨, 「N° dossier」 빈 칸이 밝은 화면에서 덜 흐림(투명도 0.6 → 0.7, 디자인 세션 부탁), 시험 스크립트가 새 스택에서도 로그인 | `notFoundFor`·`rc_noPatientFound`, `parsePastedDob()`, `reception.api.mjs` 설정 로그인 (3절) | `cb0e564` |
| 2026-09-30 | 미수·환불 금액이 프랑스어는 «17 300 Ar», 한국어·영어는 «17,300 Ar»(총괄 결정), 금액이 줄에서 쪼개지지 않음. 의사 없이 접수한 대기 줄에 점만 남던 것, 같은 이름 창의 번호·날짜가 두 줄로 쪼개지던 것. 밝은 화면·1366×768 점검(읽기 어려운 곳은 차트번호 빈 칸 하나 — 디자인 세션에) | `fmtAr(n, lang)`, 빈 값 빼고 잇기, `nowrap` (3절) | `6f6f86a` |
| 2026-09-30 | 「N° dossier」 칸이 흐린 칸 대신 설정 화면과 같은 「잠긴 칸」 모양(회색 바탕) — 빈 칸 안내 글자가 흐려져 읽기 어렵던 것 | `var(--field-locked)`·`var(--text-locked)`, `opacity` 뺌 (3절) | `f63b645` |
| 2026-09-30 | (다시 통합 시험 뒤) 성별을 키보드로 고름(Tab + 화살표), 환자 찾기 창의 내원 목록에 주호소·상태 칸 — 같은 날 두 내원이 구분됨, 진료비 없이 끝난 내원은 「Rien à payer」, 「Terminer →」 확인 창이 수납에 가는지 사실대로 | 성별 `role=radio`·`moveGender()`, `PatientFinder` `visitState()`·`rc_billNothing`, `GET /visits/patient/:id`에 `chief_complaint`, `rc_completeNoConsultBilled` (3절) | `a0b96e4` |
| 2026-09-30 | **전과**: 이미 접수된 내원의 과·의사를 의사도 바꿀 수 있는 서버 길(수납 전까지), 바꾸면 기록 한 줄과 진료 기록의 과도 따라감. 접수 화면의 저장도 같은 기록을 남김 (실장님 요청) | `PUT /visits/:id/transfer`, `applyTransfer()`, `ACTIONS.VISIT_TRANSFER`, 시험 19건 (4절) | `5069ca7` |
| 2026-09-30 | 수납된 내원은 접수 화면의 저장으로도 과·의사를 바꿀 수 없음(전과와 같은 규칙) — 목록이 잠기고 이유 한 줄, 그 사이 수납된 뒤 저장하면 화면 언어로 안내. 4절 history 설명에 「과·의사는 내원의 것」(총괄 `119642e`) (실장님 결정) | `activeReceipt()`, `PUT /visits/:id` 409 `VISIT_BILLED`, `rc_visitBilledNoMove`, `billedLock` | `7463e3d` |
| 2026-10-01 | 긴 이름(50~80자)에서 대기 목록의 상태 꼬리표가 접히지 않고, 긴 한 낱말 이름이 목록을 옆으로 밀지 않음. 환자 찾기 창의 차트번호·전화·생년월일이 한 줄, 같은 이름 확인 창을 넓힘, 미수 상자가 긴 이름 아래로 내려감. 이름은 자르지 않고 줄바꿈, 주호소만 두 줄까지 (실장님이 진료 화면에서 본 것과 같은 종류) | `Registration.jsx`·`PatientFinder.jsx` 모양만(3절 「긴 이름」) | `b3af7ff` |
| 2026-10-01 | 전화 칸에 두 번호가 들어 있어도(37자) 환자 찾기 표와 같은 이름 확인 창에서 번호가 위아래 두 줄로 — 이름 칸이 좁아지지 않음. 검색 결과 목록에서 생년월일이 중간에서 끊기지 않음 (실장님이 시험 차트에 긴 전화번호를 넣으심) | `phoneLines()` · `phoneText()`(`PatientFinder.jsx`), `Registration.jsx` 두 곳 (3절 「긴 이름」) | `2da0abd` |
| 2026-10-01 | 환자 찾기 표와 같은 이름 확인 창이 보이는 전화번호를 접수 양식이 고치는 번호와 같게(`phone` 먼저, 없으면 `mobile`) — 양식에서 고친 번호가 표에 안 보이는 일이 없게 (총괄 결정) | `PatientFinder.jsx` · `Registration.jsx` 각 한 줄 | (이 커밋) |
