# 설정 (Settings)

> **담당**: 설정 세션 · 브랜치 `session/settings` · **마지막 갱신**: 2026-09-29 · **상태**: 백업 안전장치(B1·B2·B3·B6) 고침 — 확인 요청. 나머지 7절 항목은 실장님 결정 대기

## 1. 이 모듈이 하는 일

병원이 EMR을 쓰기 위한 **바탕**을 관리합니다.

- **로그인과 첫 실행** — 처음 설치했을 때 관리자 계정을 만들고, 이후 직원이 로그인합니다.
- **직원과 권한** — 직원 계정을 만들고, 각자 어느 화면(접수·진료·수납·약국·임상병리·통계·설정)에 들어갈 수 있는지 정합니다.
- **기준 자료** — 진료과, 오더 코드(진찰료·검사·영상·처치), 오더 세트(약속처방), 상용구, 병원 정보(편지지 머리글·앱 제목). 약품 탭은 약국 세션, 검사항목 탭은 임상병리 세션, 오더 연동 탭은 PACS 세션이 안을 고칩니다.
- **백업** — 매일 자동으로 DB를 백업하고, 화면에서 「지금 백업」과 내려받기를 합니다. 복원은 화면에 없고 문서(`DEPLOYMENT.md` 5b) 절차로만 합니다.
- **운영 도구** — 서버 PC에 띄워 두는 서버 상태 창(`server-status.bat`), 백업이 실제로 복원되는지 검사하는 `verify-backup.ps1`, 버전 확인(`/api/version`).

## 2. 화면 사용법 (직원용)

> 병원 직원(관리자)이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다.
> 설정 화면은 맨 위 메뉴의 **Paramètres (설정)** 입니다. **Paramètres** 권한이 있는 계정만 보입니다.

### 2.1 처음 설치했을 때 — 관리자 계정 만들기

1. 브라우저로 EMR 주소(`http://<서버 주소>:9080`)에 들어가면 **Configuration initiale (초기 설정)** — 「Créez le compte administrateur」 화면이 나옵니다. 관리자가 하나도 없을 때만 나오는 화면입니다.
2. **Nom affiché (이름)**, **Identifiant (아이디)**, **Mot de passe (비밀번호, 6자 이상)**, **Confirmer le mot de passe (비밀번호 확인)** 을 넣고 **Créer le compte admin (관리자 계정 만들기)** 를 누릅니다.
   - **아이디는 `admin`으로 하기를 권합니다.** 아이디가 `admin`인 계정만 「설치 때 만든 관리자」로 보호됩니다 (2.6, 3-2절).
3. 바로 **Paramètres** 화면으로 들어갑니다.

### 2.2 로그인 · 로그아웃

- 로그인 화면: **Identifiant (아이디)** · **Mot de passe (비밀번호)** → **Connexion (로그인)**. 오른쪽 위 **EN · KO · FR** 로 언어를 바꿉니다.
- 로그아웃: 오른쪽 위 빨간 **Déconnexion (로그오프)**.
- 한 번 로그인하면 **12시간** 유지됩니다. 그 뒤에는 아무 버튼이나 누를 때 로그인 화면으로 돌아가니, 다시 로그인하면 됩니다.
- **관리자가 직원을 비활성으로 바꾸면 그 직원은 바로 막힙니다** — 다음에 무엇을 누르거나 화면을 다시 불러오는 순간 로그인 화면으로 가고, 로그인하면 「Ce compte est désactivé…」가 뜹니다.
- **권한을 바꾸면 서버는 바로 따르고, 그 직원의 메뉴도 곧 바뀝니다** — 화면을 새로 고치거나, 다른 창에 갔다가 돌아오거나, 5분마다 스스로 계정을 다시 읽습니다(2026-09-29, 총괄). 권한을 **더한** 화면은 새로 고치면 메뉴에 나타나고, **뺀** 화면은 메뉴에서 사라집니다. 뺀 화면을 **지금 보고 있던** 직원은 다른 화면으로 옮길 때까지 그 화면에 남고, 목록이 비거나 「Vous n'avez pas l'autorisation…」가 뜹니다.

### 2.3 설정 화면의 탭

| 탭 (프랑스어 화면) | 한국어 화면 | 하는 일 | 담당 |
|---|---|---|---|
| 👥 **Personnel** | 직원 | 직원 계정·권한 (2.4 ~ 2.6) | 설정 |
| 💊 **Médicaments** | 약품 | 약 목록·단가·재고 | 약국 (`pharmacy.md`) |
| 📋 **Codes d'actes** | 오더 코드 | 진료비·검사·영상·처치 코드와 가격 (2.9) | 설정 |
| 📝 **Phrases types** | 상용구 | 진료 기록 상용구 (2.9) | 설정 |
| 🏥 **Services** | 진료과 | 진료과 (2.9) | 설정 |
| 🧪 **Ordonnances types** | 약속처방 | 약·검사 묶음 (2.9) | 설정 |
| 🧫 **Items de test** | 검사항목 | 검사 결과 항목·기준치 | 임상병리 (`laboratory.md`) |
| 🔗 **Flux d'ordres** | 오더 연동 | 영상 장비 워크리스트 연결 | PACS (`pacs.md`) |
| 💾 **Sauvegarde** | 백업 | 백업 확인·지금 백업·내려받기 (2.7) | 설정 |
| 🏢 **Établissement** | 병원 정보 | 편지지 머리글·앱 제목 (2.8) | 설정 |

### 2.4 직원 추가하기

1. **Personnel (직원)** → 오른쪽 위 **+ Ajouter (+ 추가)**. **Nouvel élément (새로 추가)** 창이 뜹니다.
2. **Nom (이름)**, **Identifiant (아이디)**, **Mot de passe (비밀번호)** 를 넣습니다.
   - 비밀번호는 **•••• 로 가려져** 있습니다. 옆의 **Afficher (보기)** 를 누르면 보이고, **Masquer (숨기기)** 로 다시 가립니다. 직원에게 비밀번호를 불러 줄 때 쓰세요.
   - 새 직원 창에는 비밀번호 **`1234`가 미리 들어 있습니다.** **Afficher** 로 확인하고, 그대로 두지 말고 바꾸세요 (7절 S4 — 없앨지는 결정 대기).
3. **Rôle (étiquette) (역할 · 표시용)** 에서 역할을 고릅니다. 고르면 아래 권한 칸이 그 역할의 기본값으로 **자동 체크**됩니다.
4. **Permissions (écrans accessibles) (권한 · 접근 가능 화면)** 에서 이 직원이 들어갈 화면을 체크합니다. **실제로 무엇을 할 수 있는지는 역할이 아니라 이 체크가 정합니다.**

   | Rôle (역할) | 기본으로 체크되는 권한 |
   |---|---|
   | **Accueil** (접수) | Enregistrement (접수) · **Paiement (수납)** |
   | **Médecin** (의사) | Consultation (진료) |
   | **Pharmacie** (약국) | Pharmacie (약국) |
   | **Laboratoire** (검사실) | Laboratoire (임상병리) |
   | **Infirmier(ère)** (간호사) | **Enregistrement (접수) · Pharmacie (약국) · Laboratoire (임상병리)** — 현장에는 약사가 없고 간호사가 조제와 검사를 함께 합니다. 접수는 환자 차트를 보려고 넣었습니다(2026-09-29 실장님 결정). **주의**: 접수 권한은 차트 보기만이 아니라 **환자 등록·수정, 내원 접수·취소까지** 모두 할 수 있습니다(화면 단위 권한이라 「보기만」은 없음) |
   | **Administrateur** (관리자) | 7개 전부 — Enregistrement · Consultation · Paiement · Pharmacie · Laboratoire · Statistiques · Paramètres |

   - **수납 창구 계정**: **Accueil** 를 고르면 **Paiement** 가 이미 체크되어 있습니다. 수납만 하는 직원이면 **Enregistrement** 체크를 빼세요. 수납 화면·수납 서버 모두 **Paiement** 권한을 확인하므로, 이 체크가 없으면 수납이 거절됩니다.
   - **간호사**가 로그인하면 **Enregistrement (접수)** 화면이 먼저 열립니다(메뉴 순서상 첫 번째 권한). 약국·임상병리는 위쪽 메뉴에서 누르세요.
   - 이미 있는 직원의 역할을 바꾸면 체크가 **그 역할의 기본값으로 다시 채워집니다.** 따로 더했던 체크는 다시 확인하세요.
5. 의사라면 **Service (진료과)** 를 고릅니다. (내원마다 고르는 진료과와는 별개인, 의사 본인의 소속입니다.)
6. **Sauver (저장)**. 아래에 초록 「✓ Enregistré」가 잠깐 뜹니다.

**직원 목록의 칸**

| 칸 | 뜻 |
|---|---|
| **Nom** (이름) | 화면 오른쪽 위와 기록에 찍히는 이름 |
| **Identifiant** (아이디) | 로그인할 때 쓰는 아이디 |
| **Rôle** (역할) | 색 표시와 그 아래 **아이콘 줄** — 아이콘이 이 직원이 들어갈 수 있는 화면입니다 (🏥 접수 · 🩺 진료 · 💳 수납 · 💊 약국 · 🧪 임상병리 · 📊 통계 · ⚙️ 설정) |
| **Service** (진료과) | 의사의 소속 과 코드 |
| **Téléphone** (전화) | 연락처 |
| **Statut** (상태) | **actif** (활성, 초록) = 로그인 가능 · **inactif** (비활성, 빨강) = 로그인 막힘 |

### 2.5 직원 정보·권한 바꾸기 · 그만둔 직원

- **바꾸기**: 그 줄의 **Modifier (수정)** → 고치고 **Sauver**.
- **비밀번호 초기화**: **Modifier** 창의 **Mot de passe** 칸은 비어 있습니다. **비워 두면 그대로**, 새로 적으면 그 비밀번호로 바뀝니다. 새 비밀번호를 직원에게 알려 주세요.
- **권한을 바꾸면** 서버는 바로 따르고, 그 직원의 메뉴는 화면을 새로 고치면(늦어도 5분 안에) 바뀝니다 (2.2). 다시 로그인할 필요는 없습니다.
- **그만둔 직원**: 그 줄의 **Supprimer (삭제)** → 「Désactiver ce membre du personnel ? … (이 직원을 비활성으로 바꿀까요?)」 → 확인. 지워지지 않고 **inactif** 가 되어 로그인이 막힙니다. 진료·수납 기록은 그대로 남습니다.
  - **주의**: 비활성 직원을 다시 **actif** 로 되돌리는 버튼이 아직 없습니다 (7절 U2).
  - 비활성으로 바꾸면 **바로** 막힙니다 — 이미 로그인해 있던 화면도 다음 동작에서 로그인 화면으로 갑니다 (2026-09-29부터, S1).

### 2.6 관리자 계정 보호

- 설치 때 만든 `admin` 계정의 **Modifier** 창에서는 **Identifiant · Rôle · Permissions** 가 회색으로 잠겨 있고 「🔒 Compte administrateur créé lors de l'installation… (설정 때 만든 관리자 계정입니다…)」 안내가 나옵니다. **Nom · Mot de passe · Téléphone · Service** 는 바꿀 수 있습니다. **Supprimer** 도 거절됩니다.
- 다른 관리자도, **Paramètres 화면에 들어갈 수 있는 마지막 관리자**라면 역할을 바꾸거나 **Paramètres** 체크를 빼거나 **Supprimer** 할 수 없습니다. 먼저 다른 계정에 **Administrateur** 역할과 **Paramètres** 권한을 주세요.

### 2.7 백업 확인하기 — Sauvegarde (백업)

1. **Sauvegarde (백업)** 탭을 누릅니다.
2. **맨 위 색 띠**를 봅니다.

   | 색 띠 (프랑스어 화면) | 한국어 화면 | 뜻 | 할 일 |
   |---|---|---|---|
   | 초록 **✓ Sauvegardes en ordre** | 백업 정상 | 36시간 안에 백업이 있음. 옆에 **Dernière (최근)** 시각과 「il y a N h (N시간 전)」 | 없음. 가끔 **⬇ Télécharger** 로 USB에 한 벌 |
   | 노랑 **⚠ La dernière sauvegarde est trop ancienne** | 최근 백업이 오래됐습니다 | 36시간 넘게 새 백업이 없음 (어젯밤 백업이 안 됨) | **💾 Sauvegarder (지금 백업)** 을 누름. 빨강으로 바뀌면 아래 오류를 담당자에게 |
   | 노랑 **⚠ Aucune sauvegarde** | 백업이 하나도 없습니다 | 백업 파일이 하나도 없음 (설치 직후) | **💾 Sauvegarder** 로 첫 백업 |
   | 빨강 **⚠ La dernière sauvegarde a échoué** | 마지막 백업이 실패했습니다 | 가장 최근 시도가 실패했고 그 뒤로 성공한 적이 없음. 아래에 **Dernière tentative (마지막 시도)** 시각, automatique/manuelle, **오류 문구** | 오류 문구를 **그대로** 담당자에게 전함. 자동 백업은 30분마다 다시 시도함 |
   | **⏳ Sauvegarde en cours** 표시 | 백업 진행 중 | 지금 백업이 돌고 있음 | 잠시 뒤 **↻ Rafraîchir (새로고침)** |

3. 그 아래 칸의 뜻:

   | 칸 | 뜻 |
   |---|---|
   | **État** (상태) | 「Sauvegardes auto activées (자동 백업 켜짐)」 — 자동 백업은 끌 수 없습니다 |
   | **Chemin** (경로) | 백업이 저장되는 곳. 「Dossier de l'app (backups) (앱 폴더)」면 EMR과 같은 디스크 → 노란 경고 문구가 함께 나옴 |
   | **Auto** (자동) | 「chaque jour 02:00 (매일 02:00)」 — 자동 백업 시각. 그 시각에 서버가 꺼져 있었으면 켜진 뒤 한 번 합니다 |
   | **Garder** (보관) | 보관 일수(기본 30 j). **가장 최근 7개는 보관 기간이 지나도 지우지 않습니다** |
   | **Sauvegardes (N)** (백업 목록) | 파일 이름 · 크기 · 시각(**이 PC의 시각**) · **⬇ Télécharger (다운로드)** |

4. **💾 Sauvegarder (지금 백업)** — 바로 한 벌 더 만듭니다. 끝나면 「✓ Sauvegarde faite · 파일이름」이 잠깐 뜹니다. 누가 이미 백업을 돌리고 있으면 그게 끝날 때까지 기다렸다가 같은 결과를 보여줍니다 (두 번 돌지 않음).
5. **⬇ Télécharger (다운로드)** — 그 백업을 이 PC로 받습니다. USB에 옮겨 **병원 밖에 한 벌** 보관하세요. 같은 PC의 다른 드라이브는 도난·화재에 대비가 안 됩니다.
6. 복원은 화면에서 하지 않습니다. 담당자가 `DEPLOYMENT.md` 「5b. Restoring a backup」 절차대로 합니다.

### 2.8 병원 정보 — Établissement (병원 정보)

1. **Établissement** 탭. 맨 위 흰 상자가 인쇄 문서(의뢰서·진단서 등) 머리글 미리보기입니다.
2. 칸의 뜻:

   | 칸 | 뜻 |
   |---|---|
   | **Titre de l'application (en-tête)** (앱 제목) | 모든 화면 맨 위 왼쪽의 제목 |
   | **Nom de l'établissement (coréen / par défaut)** (병원 이름 · 기본) | 한국어로 인쇄할 때. 다른 언어 이름이 비었을 때도 쓰임 — 프랑스어 인쇄는 프랑스어 → 영어 → 기본 이름 순 |
   | **Nom de l'établissement (anglais / français)** (영어·프랑스어 이름) | 그 언어로 인쇄할 때. **프랑스어 이름을 꼭 넣으세요** |
   | **Adresse · Téléphone · E-mail · Heures d'ouverture** (주소·전화·이메일·진료 시간) | 모든 언어 공통 |

3. **Sauver (저장)**.

### 2.9 Codes d'actes · Services · Ordonnances types · Phrases types

- **📋 Codes d'actes (오더 코드)** — 위 단추 **Tous · Frais · Laboratoire · Imagerie · Acte** (전체·진료비·검사·영상·처치)로 거르고, **Rechercher (검색)** 로 찾습니다. **+ Ajouter** / **Modifier** 창:

  | 칸 | 뜻 |
  |---|---|
  | **Code · Nom · Nom en anglais** (코드·이름·영어 이름) | 코드는 다른 코드와 겹치면 안 됩니다 |
  | **Type** (종류) | Frais (진료비) · Laboratoire (검사) · Imagerie (영상) · Acte (처치) |
  | **Groupe** (분류) | Consultation, Laboratory… — 목록 묶음. 저장되는 값이라 영어 그대로 |
  | **Prix** (가격) | 청구 금액 |
  | **Modalité · Région** (장비·부위) | 영상 코드만. US·CR… / ABDOMEN… |
  | **Créer le Feed Worklist** — Activé/Désactivé | 켜야 이 영상 오더가 **영상 장비 목록(워크리스트)** 에 올라갑니다 |

  **Supprimer** 하면 목록에서 숨겨지고, 이미 들어간 오더·청구 기록은 남습니다.
- **🏥 Services (진료과)** — **+ Ajouter**: **Code**, **Nom (par défaut)** (이름 · 기본), **Nom en anglais**, **Nom en français** (**꼭 넣으세요** — 비면 프랑스어 화면에 기본 이름이 나옴), **Médecin-chef** (과장, 의사만 고를 수 있음). 수정만 있고 삭제는 없습니다.
- **🧪 Ordonnances types (약속처방)** — **+ Nouvel ensemble (새 약속처방)** → **Nom de l'ensemble (이름)**, **Groupe (dossier) (그룹·폴더)**, **Service**, **Description** → 오른쪽에서 **Médicament (약)** 또는 **Examen / Imagerie (검사/영상)** 를 고르고 **Rechercher** → 결과를 눌러 추가 → **Sauver**. 진료 화면에서 한 번에 불러옵니다.
- **📝 Phrases types (상용구)** — **Modifier** 창에 **Texte (par défaut / écran coréen) (문장 · 기본)**, **Texte en français (프랑스어 문장)**, **Texte en anglais (영어 문장)** 세 칸이 있습니다. 진료 화면은 프랑스어 화면이면 프랑스어 문장을 쓰고, 비어 있으면 기본 문장을 씁니다 — **현장에서 쓰는 상용구는 프랑스어 문장을 넣어 주세요.** 목록에서 프랑스어·영어 문장이 있는 줄에는 작은 **FR**·**EN** 표시가 붙습니다. **Catégorie** (General 등)는 저장되는 값이라 번역하지 않습니다.

### 2.10 서버 상태 창 (서버 PC에서)

1. 서버 PC에서 **`server-status.bat`** 을 더블클릭합니다. 15초마다 스스로 다시 확인합니다. **닫지 말고 띄워 두세요.**
2. 맨 위 띠와 할 일:

   | 띠 | 뜻 | 할 일 |
   |---|---|---|
   | 초록 **TOUT FONCTIONNE** (정상 작동 중) | 전부 정상 | 없음 |
   | 노랑 **A SURVEILLER** (확인 필요) | 돌고는 있지만 볼 것이 있음 (디스크가 참, 어젯밤 백업이 없음 등) | 아래 노란 줄과 맨 아래 안내를 담당자에게 |
   | 빨강 **PROBLEME** (문제 발생) | 무언가 멈춤 | 빨간 줄을 적어 담당자에게. 맨 아래 안내를 따름 |

3. 줄: **Dossiers patients (base de donnees)** (환자 기록 · DB) · **Serveur de l'application** (앱 서버) · **Ecran de l'EMR** (EMR 화면) · **Espace disque** (디스크) · **Sauvegarde** (백업) · **Imagerie (PACS)** (영상) · **Liste de travail des appareils** (장비 워크리스트). 영상이 없는 병원은 **non installe (미설치)** 로 회색입니다.
4. 줄의 상태 글자: **OK** 정상 · **ARRETE** 멈춤 · **DEMARRAGE** 시작 중 · **NE REPOND PAS** 응답 없음 · **ABSENT** 없음 · **INACCESSIBLE** 접속 안 됨.
   - **INACCESSIBLE** 옆에 「port 4242 bloque par Windows」 같은 글이 있으면 프로그램은 돌고 있는데 **Windows가 그 포트를 막아서** 다른 PC나 영상 장비가 들어올 수 없는 상태입니다. EMR을 다시 켜도 풀리지 않습니다. 담당자에게 알리세요 (담당자용: `DEPLOYMENT.md` Windows 절).
5. 아래 버튼으로 언어를 바꿉니다 (Français → English → 한국어).

### 2.11 백업 검사 (담당자용, 서버 PC에서)

1. 앱이 설치된 폴더에서 PowerShell을 열고 `.\verify-backup.ps1` (Linux·NAS는 `./verify-backup.sh`).
2. 가장 새 백업을 임시 DB에 복원해 보고 지웁니다. 운영 데이터는 건드리지 않습니다. 백업이 다른 드라이브(`BACKUP_PATH`)에 있어도 스스로 찾습니다.
3. 끝에 **「VERIFIED」** 면 그 백업은 복원됩니다. 중간의 노란 **「[info] the live database has changed since this backup…」** 는 백업 뒤에 직원들이 입력한 것이 있다는 뜻으로, 정상입니다.
4. 백업과 운영 DB가 **완전히 같은지**까지 보려면: **Sauvegarde** 탭에서 **💾 Sauvegarder** 를 누르고, 바로 `.\verify-backup.ps1 -Strict`.

### 2.12 이런 안내가 뜰 때

| 안내 (화면에 보이는 그대로) | 어디서 | 뜻 | 할 일 |
|---|---|---|---|
| **Identifiant ou mot de passe incorrect** | 로그인 | 칸이 비었거나, 아이디·비밀번호가 틀림 | 다시 입력. 잊었으면 관리자에게 — 관리자가 **Personnel → Modifier → Mot de passe** 로 새로 정함 |
| **Ce compte est désactivé. Adressez-vous à un administrateur.** | 로그인 | 비활성(**inactif**)이 된 계정 | 관리자에게. 지금은 화면에서 되돌릴 수 없음 (7절 U2) |
| **Le serveur ne répond pas. Regardez la fenêtre d'état sur le PC serveur.** | 로그인·설정 | 서버나 DB가 멈춤 | 서버 PC의 상태 창(2.10)을 봄 |
| 로그인 화면으로 갑자기 돌아감 | 어디서나 | 로그인 12시간이 지남 | 다시 로그인 |
| **Vous n'avez pas l'autorisation pour cela…** (알림 창, 또는 Paramètres 맨 위 빨간 줄) | 어디서나 | 관리자가 이 화면의 권한을 뺐음 | 화면을 새로 고치면 메뉴에서 그 화면이 사라짐. 필요한 권한이면 관리자에게 |
| **Le mot de passe doit comporter au moins 6 caractères** · **Les mots de passe ne correspondent pas** | 초기 설정 | 비밀번호가 6자 미만 / 확인 칸과 다름 | 다시 입력 |
| **Cet identifiant existe déjà…** · **Un administrateur existe déjà. Connectez-vous.** | 초기 설정 | 그 아이디가 이미 있음 / 이미 관리자가 있음 | 로그인 화면에서 로그인 |
| **Erreur: C'est le dernier administrateur actif pouvant ouvrir les Paramètres…** | Personnel 저장·삭제 | 이 계정이 **Paramètres** 에 들어갈 수 있는 마지막 관리자 | 먼저 다른 계정에 **Administrateur** 역할과 **Paramètres** 권한을 줌 (2.6) |
| **Erreur: Le compte administrateur créé à l'installation ne peut pas être désactivé.** | Personnel 삭제 | 설치 때 만든 `admin` 계정 | 비활성화할 수 없음 — 그대로 둠 |
| **Erreur: Un élément avec ce code ou cet identifiant existe déjà.** | 저장할 때 | 같은 **Identifiant** 나 **Code** 가 이미 있음 | 다른 아이디·코드로 |
| **Erreur: Saisissez un identifiant.** · **Saisissez un mot de passe.** | Personnel 새로 추가 | 아이디·비밀번호 칸이 빔 | 채워서 저장 |
| **Erreur: Prix : saisissez un nombre.** · **… ne peut pas être négatif.** · **Stock : saisissez un nombre entier.** | 가격·재고 칸 | 숫자가 아니거나 음수, 재고에 소수 | 고쳐서 저장 |
| **Le stock de ce médicament a changé pendant la modification…** | Médicaments 저장 | 창을 열어 둔 사이 그 약의 재고가 바뀜(조제 등). **아무것도 저장 안 됨**. 재고 칸은 지금 값으로 바뀌어 있음 | 재고 칸의 새 숫자를 보고 다시 맞춰 **Sauver**. 다른 칸의 입력은 그대로 있음 |
| **Supprimer ?** | 목록의 Supprimer | 지울지 확인 (목록에서 숨겨지고 기록은 남음) | 맞으면 확인 |
| **N ordonnance(s) type(s) utilisent ce médicament : …** | Médicaments의 Supprimer | 이 약을 쓰는 약속처방이 있음. 약을 감춰도 약속처방에는 남아 **계속 처방됨** | 먼저 **Ordonnances types** 에서 그 줄을 빼거나 다른 약으로 바꾼 뒤 감춤. 그래도 감추려면 확인 |
| **Désactiver ce membre du personnel ? …** | Personnel의 Supprimer | 직원을 비활성으로 바꿀지 확인 | 맞으면 확인 (2.5) |
| **Échec sauvegarde: …** | Sauvegarde의 Sauvegarder | 백업 실패. 뒤에 오류 문구 | 탭 맨 위가 빨간 띠로 바뀜 — 오류 문구를 담당자에게 (2.7) |

### 2.13 새 PC로 옮기기 — 백업을 복원해서 (담당자용)

> 출발 전 확인 목록(`wiki/02-before-departure.md`) 0절의 「(b) 새 PC에 설치」로 정해졌을 때의 절차입니다. 2026-09-29 격리 스택에서 실제로 해 본 그대로이고, 걸린 시간은 그때 잰 것입니다(데이터가 적은 지금 기준).

**가져갈 것**: ① 이 PC에서 **가장 최근 백업** — **Sauvegarde → 💾 Sauvegarder** 를 누른 **직후** 그 줄의 **⬇ Télécharger** 로 USB에 받습니다(떠나기 직전에). ② **관리자(`admin`) 비밀번호를 알고 있어야 합니다.** 복원하면 이 PC의 계정과 비밀번호가 그대로 옮겨 가므로, 모르면 새 PC에서 아무도 설정에 들어갈 수 없습니다. ③ 오프라인 설치 묶음(`OFFLINE-INSTALL.md`).

1. **새 PC에 설치** — `OFFLINE-INSTALL.md` 대로. 브라우저에 **Configuration initiale (초기 설정)** 이 뜨면 **관리자를 만들지 말고** 다음으로 넘어갑니다(만들어도 복원 때 덮어써지지만 필요 없음). (격리 스택: 이미 빌드된 이미지로 9초. 새 PC에서 이미지를 불러오는 시간은 재지 않음)
2. **복원** — PowerShell(또는 cmd)에서 `DEPLOYMENT.md` 「5b. Restoring a backup」 명령을 **그대로**: 앱 멈추기 → `docker cp` → `gunzip -t`(종료 코드 0) → 복원(종료 코드 **0** 이어야 함) → 임시 파일 지우기 → 앱 켜기. **Git Bash에서 치지 마세요**(`/tmp` 경로가 바뀜 — B10). (5초)
   - 백업이 새 설치보다 **옛 버전**이어도 됩니다. 앱이 켜질 때 모자란 DB 변경(마이그레이션)을 스스로 채웁니다 — 연습 때 019·020이 이렇게 채워짐. (3초)
   - 설치 뒤 **2분 넘게** 두었다가 복원하면, 그 사이 자동 백업이 **빈 DB**를 한 벌 만들어 둡니다. 해는 없지만 헷갈리지 않게 복원 뒤 **Sauvegarde** 목록에서 크기가 작은 첫 파일은 무시하세요.
3. **로그인** — 이 PC에서 쓰던 `admin` 비밀번호로. (초기 설정 화면은 더 나오지 않음)
4. **확인** — 다음이 이 PC와 같은지 봅니다: **Personnel** 직원 목록, **Médicaments** 약 가격·재고, **Codes d'actes**, **Établissement** 병원 정보, **Phrases types**. 연습 때는 백업 파일의 23개 테이블 행 수가 모두 같았습니다(`schema_migrations`만 +2 — 채워진 마이그레이션).
5. **시험 계정 정리** — **Personnel** 에서 시험 계정(`zz…`)마다 **Supprimer** → 확인. 지워지지 않고 **inactif** 로 남습니다(되돌릴 수 없음 — 7절 U2). 관리자 역할 시험 계정은 `admin`이 있으므로 비활성할 수 있습니다. (5개에 약 6초)
6. **관리자 비밀번호 바꾸기** — **Personnel → admin 줄 Modifier → Mot de passe** 에 새 비밀번호 → **Sauver**. 칸의 흐린 글자 「Vide = inchangé」는 **비어 있다는 뜻**입니다(비워 두면 그대로). 바꾼 뒤 옛 비밀번호로는 로그인되지 않는 것을 확인. (1분 이내)
7. **첫 백업** — 복원 뒤 앱이 켜지고 2분이 지나면 자동 백업이 한 벌 만들어집니다. **Sauvegarde** 탭이 초록 **Sauvegardes en ordre** 인지, **Chemin** 이 다른 드라이브인지 봅니다(2.7). 원하면 바로 **Sauvegarder**.
8. **서버 상태 창** — 새 PC에서 `server-status.bat`, 모두 초록(특히 **Imagerie** 가 **INACCESSIBLE** 이 아닌지) (2.10).

- **손으로 하는 시간** (설치 제외): 약 5분.
- 로그인 토큰의 서명 키(`.env`의 `JWT_SECRET`)는 새 PC가 새로 만들므로, 모든 사람이 새로 로그인합니다. 정상입니다.

## 3. 기능 상세

### 3-1. 권한 체계

- **역할(role)** 은 표시용 이름표입니다: `frontdesk`·`doctor`·`nurse`·`pharmacy`·`lab`·`admin` (`staff.role` CHECK 제약, `admin.routes.js:8` `ROLES`). **`nurse`(간호사)는 2026-09-29 추가** — 마다가스카르 현장에는 약사가 없고 간호사가 간호·조제·검사를 모두 하는데, 역할이 없어 간호사 계정을 「pharmacy」로 만들고 검사실 권한을 손으로 체크해야 했습니다. 기본 권한 `registration`+`pharmacy`+`lab`(2026-09-29 실장님 결정 — 접수는 환자 차트를 보려고. `permissions.js`·`modules.js` 한 줄씩). 기존 `pharmacy`·`lab` 역할은 그대로 둡니다. 역할 이름으로 동작이 갈리는 곳은 `doctor`(진료 목록 필터, 과장 선택)와 `admin`(잠금 방지)뿐이라 간호사는 권한 체크만으로 움직입니다. 상단바 아이콘은 💉(`TopBar.jsx`, 총괄). 로그인 뒤 처음 화면: `Login.jsx` `ROLE_ROUTES`에 `nurse`가 없어 `homePath()` — 메뉴 순서상 첫 권한인 **접수**. 마이그레이션은 합칠 때 `701` → **`020_settings_nurse_role.sql`** 로 번호가 바뀜.
- **권한(permissions)** 이 실제 접근을 정합니다: `staff.permissions TEXT[]`, 값은 `frontend/src/modules.js`의 `MODULES[].perm` 7개 — `registration` `consultation` `payment` `pharmacy` `lab` `stats` `settings`. 서버에는 이 목록이 **한 곳**에만 있습니다: `backend/src/middleware/permissions.js`의 `ALL_PERMS`·`ROLE_DEFAULT_PERMS`·`defaultPermsForRole` (2026-09-29, U9). `middleware/auth.js`·`admin.routes.js`(설치 관리자 고정)·`auth.routes.js`(첫 관리자 만들기)가 여기서 가져갑니다. 백엔드 이미지는 `backend/`만으로 빌드되어 `modules.js`를 불러올 수 없으므로 한 벌은 따로 둘 수밖에 없고, 대신 **`node backend/test/settings.permissions.mjs`** 가 두 목록(순서 포함)과 역할별 기본값이 같은지 확인합니다 — 설치·서버·DB 없이 파일 두 개만 읽음, 다르면 exit 1. **모듈을 추가하면 `modules.js`와 `permissions.js`를 같이 고치고 이 검사를 돌리세요.** (마이그레이션 `013`에도 같은 목록이 있지만 이미 적용된 파일이라 고치지 않습니다 — 옛 계정을 한 번 채우는 데만 쓰였음.)
- 역할을 바꾸면 화면이 그 역할의 기본 권한으로 체크를 **덮어씁니다** (`Settings.jsx:659`). 권한이 `NULL`인 옛 계정은 역할 기본값으로 대신합니다(`effectivePerms`). 013 마이그레이션이 옛 계정을 채웠습니다.
- **로그인 토큰(JWT)** 은 「누구인지」만 증명합니다. **권한·역할·상태는 요청마다 DB에서 읽습니다** (2026-09-29, S1 — 총괄이 `middleware/auth.js`에 구현). 비활성 계정은 다음 요청에서 401 「Account is inactive」 → 화면은 로그인 화면으로(`api/client.js`: 토큰을 보낸 401). 권한을 뺀 화면은 403 「Access denied」. 토큰 유효 12시간은 그대로. **화면 쪽 권한 사본**: 메뉴·라우트 가드는 로그인 때 `localStorage`(`medconnect_user`)에 저장한 권한을 쓰는데, 2026-09-29부터 `TopBar.jsx`(총괄)가 화면이 열릴 때·창으로 돌아올 때·5분마다 `GET /api/auth/me`로 다시 읽어 바뀌었으면 저장본을 고치고 메뉴를 다시 그립니다(U13 해결 — `/me`가 로그인 답과 같은 모양이라 맞물림). 라우트 가드는 **이동할 때** 새 값을 읽으므로, 권한을 뺀 화면을 보고 있던 사람은 옮길 때까지 그 화면에 남습니다.
- **서버에서 권한을 검사하는 곳** (`permMiddleware`): 설정 API의 쓰기 전부, 백업 실행·다운로드, `pharmacy.routes`(전체), `stats.routes`(전체), `lab.routes`·`orderset.routes`·`pacs.routes` 일부.
  **검사하지 않는 곳**: `patient`·`visit`·`consult`·`billing`·`document` 라우트는 **로그인만** 확인합니다. 화면 메뉴는 권한대로 숨겨지지만, 로그인한 직원이면 누구든 API를 직접 불러 수납 취소 등을 할 수 있습니다 (7절 · 인계 노트 총괄 확인 요청).
- 화면 쪽 접근 제한은 `App.jsx`의 라우트 가드가 `userPerms(user)`로 합니다 (localStorage의 `medconnect_user`).

### 3-2. 관리자 잠금 방지 (1.4.0)

`admin.routes.js`의 `PUT /staff/:id`, `DELETE /staff/:id`:

1. **설치 때 만든 관리자** = `login_id === 'admin'`인 계정 (`BOOTSTRAP_ADMIN_LOGIN`, `admin.routes.js:20`). 저장할 때 아이디·역할(`admin`)·권한(7개 전부)·상태(`active`)를 서버가 **강제로 되돌립니다**. 요청에 뭐가 들어오든 무시합니다. 삭제(비활성화)는 400으로 거절.
   - 화면에서도 같은 조건(`Settings.jsx:224` `lockedAdmin`)으로 칸을 잠급니다. 화면 잠금은 편의일 뿐이고 보호는 서버가 합니다.
2. **다른 계정**: 역할을 admin이 아닌 것으로, 또는 `settings` 권한을 빼거나, 상태를 `inactive`로 저장하려 할 때 `otherSettingsAdminExists(id)` — 「이 계정 말고 `status='active' AND role='admin' AND 'settings' = ANY(permissions)`인 계정이 있는가」— 가 거짓이면 400으로 거절. 삭제도 같은 검사.
3. **왜 아이디로 판별하나**: 1.4.0이 그렇게 만들었습니다. 그런데 첫 실행 화면(`Login.jsx`)은 아이디를 **자유롭게** 정하게 합니다. 설치 때 `admin`이 아닌 아이디를 골랐다면 1번 보호는 적용되지 않고 2번(마지막 관리자 검사)만 적용됩니다. 반대로 나중에 누군가 `admin`이라는 아이디로 일반 직원을 만들면, 그 직원은 저장할 때마다 관리자·전체 권한으로 바뀝니다 (7절).
4. **첫 실행 화면이 다시 열리는 조건**: `auth.routes.js` `noAdminExists()` — `role='admin' AND status='active'`인 계정이 0개일 때. 이때는 **로그인 없이** 누구나 새 관리자를 만들 수 있습니다. 모든 관리자가 비활성이 되면 이것이 복구 경로이자 구멍입니다. 2번 검사가 API로는 그 상태를 막습니다.

### 3-3. 로그인 · 비밀번호

- 비밀번호는 DB의 pgcrypto로 해시합니다: 저장 `crypt($pw, gen_salt('bf'))`, 확인 `password_hash = crypt($pw, password_hash)` (`auth.routes.js:67`). bcrypt(`$2a$`), `gen_salt('bf')` 기본 반복 인자 6. `bcryptjs` 패키지는 import만 되고 쓰이지 않습니다.
- 첫 관리자는 6자 이상을 요구하지만(`auth.routes.js:29`), 설정 화면에서 만드는 직원 비밀번호는 **길이 제한이 없습니다**.
- 로그인 실패 횟수 제한은 없습니다.
- 로그인 순서: 아이디 조회 → 비활성이면 「Account is inactive」 → 비밀번호 확인. 비밀번호를 몰라도 그 아이디가 있고 비활성인지 알 수 있습니다.
- 토큰은 브라우저 `localStorage`(`medconnect_token`)에 저장. 서버가 401을 주면 `api/client.js`가 지우고 로그인 화면으로 보냅니다.
- **로그인·첫 관리자 만들기는 `api/client.js`를 거치지 않습니다** (2026-09-29, `Login.jsx` `authPost`). 그 클라이언트는 401이면 무조건 「로그인이 끝났다」로 보고 로그인 화면을 다시 불러오는데, 로그인 화면에서 401은 **틀린 비밀번호·비활성 계정**의 답이라 안내가 뜨자마자 새로고침에 지워졌습니다 — 틀린 비밀번호를 넣으면 **아무 말 없이 칸만 비었습니다**(격리 스택에서 재현). 이제 안내가 남고 칸도 그대로입니다.
- **서버 안내의 번역** (2026-09-29, U11): 로그인·설정 API가 사람에게 보여줄 문구는 영어 고정 문자열로 `backend/src/routes/settings.messages.js`(`MSG`, 필드 이름이 들어가는 것은 `fieldMsg`)에 모았고, 화면은 `frontend/src/pages/settingsMessages.js` `seMessage(t, text)`로 **문자열을 맞춰** `se_` 문구로 바꿉니다(`api/client.js`가 상태 코드를 넘기지 않으므로 — 다른 세션들과 같은 방식, 총괄 결정). `utils/dbError.js`(총괄)의 문구와 `api/client.js`의 「API response was not JSON…」도 같은 표에 있습니다. 모르는 문구는 영어 그대로 보입니다(숨기지 않음). 로그인 화면은 받은 원문을 저장하고 **보여줄 때** 번역하므로 언어를 바꾸면 안내도 바뀝니다. **한쪽 문구를 바꾸면 다른 쪽도** — `node backend/test/settings.messages.mjs`가 어긋나면 알려줍니다(39개 항목).
- `JWT_SECRET`이 없으면 백엔드가 시작을 거부합니다 (`middleware/auth.js`, `docker-compose.yml`의 `:?`). 공개된 기본값으로 토큰을 위조할 수 있기 때문입니다. `setup.ps1`/`setup.sh`가 무작위 값을 `.env`에 만듭니다.
- 로그인 후 이동: `Login.jsx`의 `ROLE_ROUTES`로 **역할** 기준 화면으로 보내고, 권한이 없으면 `App.jsx` 가드가 `homePath()`로 다시 보냅니다.

### 3-4. 백업 흐름 (`backend/src/services/backup.js`)

- **저장 위치**: 컨테이너 안 `/backups`. `docker-compose.yml`이 `${BACKUP_PATH:-./backups}`를 여기에 붙입니다. 그래서 백업은 **항상 켜져 있습니다** (`cfg().enabled = true`). `BACKUP_PATH`는 「다른 드라이브에 저장」일 때만 씁니다.
- **파일**: `bethesda_YYYY-MM-DD_HHMM.sql.gz` (백엔드 컨테이너 현지 시각, `TZ`). 옛 이름 `medconnect_*.sql.gz`도 목록에 포함. 크기 0인 파일은 백업으로 치지 않습니다(`listBackups()`).
- **만드는 곳과 옮기는 곳** (2026-09-29): 덤프는 먼저 **`/backups/.inprogress/`** 에 쓰고, 끝까지 검증된 뒤에만 `/backups/`로 `rename`합니다. 같은 파일 시스템이라 원자적입니다 — 파일은 완성된 채로 나타나거나 아예 안 나타납니다. 백업을 읽는 모든 곳(이 서비스, 서버 상태 창, `verify-backup`, 복원 안내)은 `/backups/` 바로 아래만 보므로, 쓰는 중이거나 중간에 끊긴 덤프가 백업으로 보일 수 없습니다. `.inprogress/`에 남은 것은 서버 시작 때와 매 백업 시작 때 지웁니다(`clearWorkDir()`) — 중간에 끊긴 조각일 뿐이라.
- **만드는 명령**: `set -o pipefail; pg_dump … --no-owner --clean --if-exists | gzip > 작업파일 && gzip -t 작업파일`. 종료 코드 0이고 크기가 0보다 커야 성공. 실패하면 **자기 작업 파일만** 지웁니다 (1.3.3의 「반쪽 파일을 정상으로 기록」 수정은 그대로). `pg_dump`는 백엔드 이미지의 `postgresql16-client`. 실패 오류 문구는 pg_dump stderr의 마지막 500자.
- **동시에 하나만** (2026-09-29): `runBackup()`은 진행 중인 백업이 있으면 **새로 시작하지 않고 그 약속(Promise)을 돌려줍니다**. 전에는 「지금 백업」을 두 PC에서 누르거나 새벽 자동 백업 중에 누르면 같은 분 단위 파일 이름에 두 `pg_dump`가 동시에 썼고, 실패한 쪽이 `unlinkSync(file)`로 **다른 쪽이 막 끝낸 좋은 파일을** 지웠습니다. 격리 스택에서 정상 백업 직후 **같은 분에** DB를 멈추고 백업해 실패시켰을 때, 정상 파일이 남는 것을 확인했습니다 (옛 코드라면 같은 이름이라 지워지는 경우).
- **언제**: `startScheduler()`가 부팅 2분 뒤 한 번, 이후 1분마다 `tick()`. 「가장 최근 파일이 가장 최근 예정 시각(`BACKUP_TIME`)보다 오래됐나」로 판단합니다. 그래서 02:00에 전원이 꺼져 있었어도 켜진 뒤 한 번 백업하고, 일주일 꺼져 있었어도 한 번만 합니다. 실패하면 30분 뒤 다시 시도(`RETRY_MINUTES`). 백업이 진행 중이면 건너뜁니다.
- **정리** (2026-09-29): 성공한 뒤에만 `prune()`. 오래된 것부터 보며, `BACKUP_RETENTION_DAYS`일보다 오래된 파일을 지우되 **가장 최근 7개(`MIN_KEEP`)는 나이와 상관없이 남깁니다**. 전에는 날짜만 봐서, 서버가 보관 기간보다 오래 꺼졌다 켜지거나 PC 시계가 크게 앞으로 튀면 새 백업 하나만 남기고 전부 지웠습니다. 7은 환경변수가 아니라 상수입니다 — 환경변수로 만들려면 총괄 소유인 `docker-compose.yml`에 넘겨주는 줄이 필요해서.
- **상태 판정 `health()`** (2026-09-29): 백업 탭과 `/api/system/status`가 **같은 함수**를 씁니다.
  - `failed` — 마지막 시도가 실패했고 그 뒤로 성공한 백업이 없음
  - `none` — 백업 파일이 없음
  - `stale` — 가장 새 백업이 `STALE_HOURS`(36시간)보다 오래됨
  - `ok` — 그 밖
  마지막 시도 결과(`lastAttempt`: 시각·자동/수동·성공 여부·파일·오류)는 **메모리에만** 있습니다. 백엔드가 다시 시작되면 사라지지만, 그때도 파일 나이로 `stale`은 잡힙니다.
- **실패 알림**: 백엔드 로그(`[backup] FAILED …`)와 **백업 탭의 빨간 띠**(오류 문구 포함). 오류 문구는 `settings` 권한이 있는 사람에게만 보냅니다(호스트·DB 이름이 들어 있어서). `/api/system/status`와 서버 상태 창은 `failed`·`stale`·`none`을 「확인 필요」로 표시합니다. 서버 상태 창은 파일만 보므로 `failed`는 모르고 36시간 기준으로만 잡습니다.
- **내려받기**: `GET /api/backup/download/:name` — 이름을 `^[A-Za-z0-9_.-]+\.sql\.gz$`로 검사하고 `/backups` 밖을 막습니다 (`resolveBackup`). 화면은 `fetch`로 받아 blob으로 저장합니다 (파일 전체가 브라우저 메모리에 올라감).
- **복원**: API·화면 없음. `DEPLOYMENT.md` 5b의 명령 — `gunzip -t` 먼저, `set -o pipefail`, `psql -v ON_ERROR_STOP=1 --single-transaction`, 컨테이너 **안에서** 풀기 (PowerShell 파이프를 거치면 프랑스어·말라가시어 악센트가 깨짐). 1.3.2에서 「반쯤 복원되던 것」을 고친 결과입니다. 2026-09-29 격리 스택(9187)에서 이 절차 그대로(컨테이너 이름만 바꿔) 새 방식으로 만든 백업을 복원해 봄: 종료 코드 0, 백업 뒤에 바꾼 진료과 이름이 되돌아오고 백업 뒤에 만든 직원은 사라짐, 프랑스어 악센트(`éèàç`)와 `—` 그대로. **새 PC로 옮기는 복원 연습** (2026-09-29): 실장님 PC의 실제 백업(02:21) **사본**을 빈 격리 스택(새 설치 상태)에 이 명령으로 복원 → 종료 코드 0, 23개 테이블 행 수가 백업 파일과 같음, 옛 백업이라 빠졌던 마이그레이션 019·020은 재시작 때 자동 적용, 직원·약·오더 코드·병원 정보 그대로, 설치 관리자 아이디는 `admin`(S3 걱정 없음). 절차와 시간은 2.13절.
- **업데이트 전 백업**: `update.ps1`/`update.sh`가 `_pre-update-backups/preupdate_*.sql.gz`로 따로 받습니다 (같은 pipefail + `gzip -t` 방식). 이 파일은 백업 목록·보관 정리 대상이 아닙니다.

### 3-5. 백업 검증 (`verify-backup.ps1`, Linux는 `verify-backup.sh`)

매개변수 (2026-09-29): `-File`, `-DbContainer`(기본 `bethesda-emr-db`), `-ApiContainer`(기본: DB 이름의 `-db`를 `-api`로), `-BackupDir`, `-Strict`. `.sh`는 `--strict`와 환경변수 `DB_CONTAINER`·`API_CONTAINER`·`BACKUP_DIR`. 격리 스택에서 시험할 때는 **반드시 `-DbContainer bethesda-s-<코드>-db`** — 기본값은 실장님 운영 DB 컨테이너입니다.

1. **백업 위치**: `-BackupDir`가 없으면 `docker inspect <앱 컨테이너>`의 `/backups` 마운트 원본(= `BACKUP_PATH`) → 없으면 스크립트 옆 `backups`. 전에는 스크립트 옆만 봐서 다른 드라이브에 저장하면 못 찾았습니다(B4). 템플릿 안에 따옴표를 쓰면 Windows PowerShell 5.1이 네이티브 인자에서 따옴표를 떼어 버려서, 마운트 전부를 `목적지=원본`으로 받아 스크립트에서 고릅니다(상태 창과 같은 방식).
2. 파일을 지정하지 않으면 그 폴더의 `bethesda_*.sql.gz` 중 **이름순** 마지막 것 (이름에 찍은 시각이 있고, 복사하면 파일 날짜는 바뀌어도 이름은 남으므로).
3. DB 컨테이너가 **실제로 돌고 있는지**는 `docker inspect`의 종료 코드가 아니라 출력(`true`)으로 봅니다 — 멈춘 컨테이너에도 inspect는 성공하기 때문.
4. 임시 DB `bethesda_verify_tmp`를 만들고, 파일을 DB 컨테이너 안에 복사해 `gunzip -t` → 실제 복원과 **같은 명령**으로 복원.
5. **백업 자체가 온전한지** (어느 백업이든): 단일 트랜잭션·`ON_ERROR_STOP` 복원 성공, 「시퀀스가 자기 테이블의 최대 id보다 뒤처졌나」.
6. **가장 새 백업이면 운영 DB와 비교** (2026-09-29 바꿈, B5):
   - **구조** — 운영 DB에 있는 테이블이 백업에 없거나 스키마 모양(인덱스·제약·함수 수)이 다르면 **실패**. 단, 운영의 `schema_migrations` 행이 더 많으면(백업 뒤에 업데이트함) 차이를 [info]로만 알림.
   - **데이터** — 테이블별 행 수·시퀀스 값·내용 체크섬이 다른 테이블을 모아 **[info]로 알림**. `-Strict`일 때만 실패. `service_heartbeat`·`document_log`·`worklist_log`(와 그 시퀀스)·`schema_migrations`는 시스템이 계속 쓰므로 `-Strict`에서도 봐줌.
   - **왜**: 새벽 02:00 백업을 낮에 검사하면 그 사이 입력이 있게 마련인데, 옛 판정은 그걸 「VERIFY FAILED - Do not rely on it」에 「복원하면 id가 충돌한다」고까지 했습니다. 격리 스택에서 재현함: 백업 뒤 상용구 1개 추가 → 옛 스크립트 실패. 멀쩡한 백업을 실패라고 하면 사람들이 판정을 무시하게 됩니다. 백업이 온전한지는 5번이 증명하고, 운영과의 **완전 일치**는 백업 직후에만 의미가 있으므로 `-Strict`로 분리했습니다.
7. `finally`에서 임시 DB 삭제 — **`Die`(exit)로 중간에 끝나도 실행됨** (2026-09-29 격리 스택에서 잘린 파일로 확인, 임시 DB 0개). 운영 DB에는 쓰지 않습니다.
8. 파일은 **ASCII만** 씁니다 — BOM 없는 파일을 Windows PowerShell 5.1이 시스템 코드 페이지로 읽기 때문.

2026-09-29 격리 스택 시험 (`.ps1` · `.sh` 둘 다): 백업 뒤 데이터 바뀜 → 기본 VERIFIED + [info], `-Strict` 실패(「live 26 rows, backup 25」) / 백업 직후 `-Strict` → 「identical」 VERIFIED / 절반 잘린 파일 → 「damaged」 exit 1 / 옛 백업 → 비교 생략 VERIFIED.

### 3-6. 서버 상태 — 두 가지

| | 서버 상태 창 `server-status.ps1` | API `GET /api/system/status` |
|---|---|---|
| 어디서 | 서버 PC의 Windows 창 (또는 `-Console` 한 번 출력, 종료 코드 0/1/2) | 백엔드. 로그인한 누구나 |
| 어떻게 | **EMR을 거치지 않고** Docker·디스크·파일을 직접 봄. EMR이 죽어도 답하게 하려고 | 백엔드 안에서 DB·파일 확인 |
| DB·서버·화면 | 컨테이너 `bethesda-emr-db/-api/-web`의 상태와 Docker healthcheck | DB에 `SELECT 1` |
| 디스크 | 백업 폴더가 있는 드라이브의 남은 공간 (20GB 미만 노랑, 5GB 미만 빨강) | `/backups`의 `statfs` (같은 기준) |
| 백업 | 백업 폴더(= `docker inspect`로 찾은 `/backups` 마운트 원본)의 가장 새 `*.sql.gz`가 36시간 넘으면 노랑 | `services/backup.js` `health()` — 36시간 넘음·없음·**마지막 시도 실패**(`status.backup.failed`)면 노랑 |
| PACS | 컨테이너 `bethesda-pacs` (없으면 「미설치」) + **호스트 포트** (아래) | `pacs_config.worklist_scp_host`로 TCP 연결 |
| 호스트 포트 (2026-09-29) | `bethesda-emr-web`·`bethesda-pacs`가 **게시하도록 설정된** 포트(`HostConfig.PortBindings` — 9080, 9090, 4242)마다 호스트에서 TCP 연결(1초). 안 되면 그 줄을 빨강 「접속 안 됨」으로 바꾸고, `netsh interface ipv4 show excludedportrange protocol=tcp`의 예약 구간 안이면 「Windows가 막음」, 아니면 「닫힘」 | — (컨테이너 안에서는 알 수 없음) |
| 워크리스트 | `bethesda-worklist-bridge` 컨테이너 + 그 폴더의 `worklists\.heartbeat` 파일이 60초 넘게 안 바뀌면 빨강 | `service_heartbeat` 테이블(018)의 `worklist_bridge` 행. 60초 넘게 조용 → 빨강, `ok=false` → 빨강, `failed>0` → 노랑, **`detail.arrivals_error`가 있으면 노랑 `status.bridge.arrivals`** (2026-09-29, PACS P-20 — 아래) |
| 화면 연결 | — | **아직 EMR 화면 어디에서도 부르지 않음**. 돌려주는 `status.*` 번역 키도 i18n에 없음 |

- 2026-09-29, 이 PC의 실행 중 EMR에 대해 `server-status.ps1 -Console -Lang ko`를 **읽기만** 해서 돌려 봄: 7줄 모두 정상, 종료 코드 0. `/backups` 마운트 원본이 Windows 경로(`C:\Bethesda-EMR-main\backups`)로 잡히는 것 확인.
- 디스크 검사는 **백업 드라이브**를 봅니다. `BACKUP_PATH`를 D:로 옮기면 DB가 있는 C:(Docker 디스크)는 보지 않습니다.
- 창은 15초마다 `docker` 명령 약 10개를 화면 스레드에서 차례로 돌립니다. 그동안 창이 잠깐 멈출 수 있습니다 (확인 필요). 포트 검사는 열린 포트면 즉시, 막힌 포트면 최대 1초씩 더합니다. `netsh`는 막힌 포트가 있을 때만 부릅니다.
- **왜 포트 검사인가** (PACS 세션 P-1, `DEPLOYMENT.md` Windows 절): Windows(Hyper-V/WSL)는 부팅할 때마다 TCP 포트 구간을 예약합니다. 게시할 포트가 그 안에 들면 Docker가 못 잡는데도 컨테이너는 Up이고, healthcheck는 컨테이너 **안**에서 돌므로 healthy입니다. 그래서 상태 창도 「정상」이라고 했습니다. 포트 번호는 스크립트에 적지 않고 Docker 설정에서 읽습니다 — `docker-compose.yml`에서 포트를 바꾸면 따라갑니다.
- **2026-09-29 이 PC에서 실제로 걸림**: `bethesda-pacs`는 Up (healthy)인데 호스트의 4242·9090이 닫혀 있었고(`docker ps`의 PORTS에 호스트 매핑이 없음), 동적 포트 범위가 1024부터(`netsh int ipv4 show dynamicport tcp`)라 **4242가 예약 구간 4204–4303 안**에 있었습니다. 고치기 전 상태 창은 PACS를 「정상」으로, 고친 뒤에는 「접속 안 됨 — 4242 포트를 Windows가 막음, 9090 포트 닫힘」으로 표시(한국어·프랑스어 화면 캡처로 확인).
- **브리지의 도착 확인 실패** (PACS P-20, 2026-09-29): 브리지는 Orthanc에 「어느 검사가 도착했나」를 물어 끝난 환자를 장비 워크리스트에서 뺍니다. 이 질문이 실패해도(Orthanc 비밀번호 틀림 등) 워크리스트 동기화는 되므로 전부 초록이었고, 브리지 로그만 알았습니다. 약속한 필드는 heartbeat `detail`의 **`arrivals_error`**(문자열, 괜찮으면 빈 값). 상태 API는 이미 읽습니다. **보내는 쪽(브리지 `bridge.py`)과 받는 쪽(`pacs.routes.js`의 `/bridge-heartbeat`가 `detail`에 넣는 칸)은 PACS 몫이라 아직 안 보냅니다** — 그때까지는 필드가 없어 아무것도 바뀌지 않습니다. 격리 스택에서 행을 직접 넣어 세 경우(행 없음 → off, 필드 없음 → ok, 필드 있음 → warn) 확인. 서버 상태 창(`.ps1`)은 heartbeat 파일의 **시각**만 보므로 이 경우는 모릅니다.
- **창 배치 버그 고침** (2026-09-29): 실제 화면을 캡처해 보니 맨 위 색 띠가 **첫 두 줄(환자 기록 DB, 앱 서버)을 덮고 있었습니다.** WinForms는 z-순서 뒤에서부터 도킹하는데, Fill 표가 띠보다 먼저 도킹되어 창 위쪽 전체를 차지하고 그 위에 띠가 그려졌기 때문입니다. `$rows.BringToFront()`로 표를 마지막에 도킹하게 하고, 남는 높이는 빈 마지막 줄(Percent 100)이 가져가게 해서 마지막 줄 위의 빈 틈도 없앴습니다. (`DrawToBitmap`으로 그린 그림은 겹침을 다르게 보여 줘서, 확인은 `CopyFromScreen`으로 했습니다.)

### 3-7. 버전 확인 (`services/version.js`)

- 현재 버전은 `backend/package.json`, 최신은 GitHub `UPDATE_REPO`의 latest release. 6시간 캐시, 5초 타임아웃, 인터넷이 없으면 마지막 결과나 오류를 돌려줌. `?force=1`로 즉시 다시 확인.
- 로그인만 확인합니다. 업데이트 알림은 `TopBar.jsx`가 `settings` 권한이 있을 때만 보여줍니다. (CHANGELOG 1.3.3은 「settings 권한으로 막혀 있다」고 썼지만 코드는 로그인만 봅니다.)

### 3-8. 약 저장과 재고 (약국 H4 안전장치, 2026-09-29)

약품 **탭 화면**은 약국 세션 몫이고, 그 저장 함수(`Settings.jsx` `saveEdit`의 약 부분)와 API(`PUT /api/admin/drugs/:id`)는 설정 몫입니다.

- **문제였던 것**: 편집 창은 열 때의 행을 통째로 들고 있다가 저장할 때 재고까지 그대로 보냈고, 서버는 그 값으로 덮어썼습니다. 창을 연 사이에 조제된 차감이 사라졌습니다(아침 100 → 조제 30 → 오후에 단가만 고쳐 저장 → 100).
- **왜 차이만 더해 주지 않나**: 「20개 들어왔다」(더하기)와 「세어 보니 45개」(맞추기)는 계산 방향이 반대인데 서버는 어느 쪽인지 모릅니다. 그래서 조용히 계산하지 않고 **다시 묻습니다.**
- **화면**: 저장할 때 창을 연 순간의 재고(`stock_expected` — 창을 연 목록의 그 행 값, 창이 화면을 덮고 있는 동안 목록은 바뀌지 않음)를 같이 보냅니다. 재고 칸을 **안 고쳤으면 재고를 보내지 않습니다.**
- **서버** (트랜잭션, 그 약 행을 `SELECT … FOR UPDATE` — 조제와 같은 잠금):

  | 요청 | 결과 |
  |---|---|
  | 재고 없음, 또는 재고 = `stock_expected` | 재고는 **지금 값 그대로**, 나머지만 저장 |
  | 재고 고침, 지금 재고 = `stock_expected` | 고친 값으로 저장 |
  | 재고 고침, 지금 재고 ≠ `stock_expected` | **409** `Stock changed while this drug was open` + `current`, **아무것도 저장 안 함** |
  | `stock_expected` 자체가 없음 (이 변경 전 화면을 새로고침 안 한 브라우저) | 전처럼 보낸 값을 씀 |
  | 재고·최소 재고에 소수 | 400 (전에는 DB 오류) |

- **409일 때 화면**: 편집 창과 다른 칸의 입력은 그대로 두고, 목록을 다시 불러 **재고 칸을 지금 값으로** 바꾼 뒤 `se_stockChanged` 안내(「그 사이 재고가 바뀌었습니다… 지금 재고는 {n}…」). 다시 저장하면 지금 값을 기준으로 판단합니다. 오류 문구는 서버·화면에 **똑같이** 있어야 번역됩니다(`api/client.js`가 상태 코드를 안 넘김 — 약국과 같은 방식).
- **확인**: `backend/test/settings.drugs.mjs` (격리 스택 전용, 9080이면 거부, `SE_ADMIN_PW` 필요) 11개 항목 통과. 화면(9187): 한국어 — 창을 연 뒤 DB에서 30 차감 → 단가만 고쳐 저장 → 재고 170 유지(전에는 200으로 돌아감). 프랑스어 — 창을 연 뒤 20 차감 → 재고 300으로 고쳐 저장 → 프랑스어 안내, 창 유지, 재고 칸 150 → 다시 300 저장 → 성공.
- **길게는**: 재고를 움직임(입고·실사·조제)으로만 바꾸는 방안(약국 결정 「2번 재고」)이 정해지면, 이 PUT에서 재고를 아예 빼면 됩니다. 위 규칙은 그때까지의 안전장치입니다.

### 3-9. 상용구의 언어 (2026-09-29)

- `phrase_dictionary`에는 처음부터 `text`·`text_en`·`text_fr`가 있었고 API(`POST/PUT /api/admin/phrases`)도 셋 다 받았지만, 편집 창에 `text` 칸만 있었습니다. 시드 문장은 영어 `text`만 있습니다.
- 진료 화면(`Consultation.jsx` `phraseText`, 진료 세션)이 화면 언어에 맞는 문장을 쓰게 되어(`fr` → `text_fr`, `en` → `text_en`, 없으면 `text`), 편집 창에 두 칸을 더했습니다. 설정 목록도 **같은 규칙으로** 보여줘서, 관리자가 보는 문장이 의사가 보는 문장과 같습니다.
- `GET /api/admin/phrases`의 정렬에 `id`를 더했습니다(`ORDER BY category, sort_order, id`). 시드 문장의 `sort_order`가 모두 0이라, 저장할 때마다 그 줄이 묶음 안에서 자리를 옮겼습니다 — 설정 목록과 진료 화면 목록 모두.

## 4. 데이터 · API

### 화면

- `frontend/src/pages/Settings.jsx` — 틀과 탭: Staff · Drugs(약국) · Order Codes · Phrases · Departments · 약속처방 · 검사항목(임상병리) · 오더 연동(PACS) · 백업 · Clinic
- `frontend/src/pages/Login.jsx` — 로그인, 첫 실행 관리자 만들기

### 서버

| 경로 | 권한 | 하는 일 |
|---|---|---|
| `GET /api/auth/setup-status` | 없음 | `{needsSetup}` — 활성 관리자가 없으면 true |
| `POST /api/auth/setup` | 없음 (관리자 없을 때만) | 첫 관리자 생성, 토큰 반환 |
| `POST /api/auth/login` | 없음 | `{token, user}` |
| `GET /api/auth/me` | 로그인 (비활성이면 401) | 내 정보. `permissions`는 로그인 답과 같은 모양(없으면 역할 기본값) — 화면이 저장해 둔 권한을 새로 고칠 때 쓰라고 (2026-09-29) |
| `GET /api/admin/drugs` · `order-codes` · `departments` · `phrases` · `clinic` | 로그인 | 목록 (다른 화면도 씀) |
| `GET /api/admin/doctors` | **registration 또는 consultation** (2026-09-29, S2 — 전화·이메일 포함이라) | 활성 의사 목록 (접수용, 비밀번호 해시 없음) |
| `GET /api/admin/staff` | settings | 전체 직원 (`password_hash` 제거) |
| `POST/PUT /api/admin/staff[/:id]` · `DELETE /api/admin/staff/:id`(=비활성) | settings | 3-2절 보호 규칙 |
| `POST/PUT/DELETE /api/admin/drugs` · `order-codes` · `phrases`, `POST/PUT departments`, `PUT clinic` | settings | 삭제는 모두 `is_active=false`. **`PUT /drugs/:id`** 는 `stock_expected`를 받고 재고 규칙이 따로 있음(3-8절, 409 가능) |
| `GET /api/admin/drugs/:id/order-sets` | settings | 그 약을 쓰는 **활성** 약속처방 `[{id, name}]` — 약을 감추기 전 확인 창에 이름을 보여 주려고 (2026-09-29) |
| `GET /api/backup/status` | 로그인 | 설정·목록 (호스트 경로 포함), `state`(ok/stale/none/failed), `running`, `newestAgeHours`, `lastAttempt`{at, ok, trigger, file, error — error는 settings 권한일 때만}, `minKeep`, `staleHours` |
| `POST /api/backup/run` | settings | 지금 백업. 진행 중이면 그 결과를 기다려 돌려줌 |
| `GET /api/backup/download/:name` | settings | 파일 내려받기 |
| `GET /api/system/status` | 로그인 | 3-6절 |
| `GET /api/version[?force=1]` | 로그인 | 3-7절 |
| `GET /api/health` (`index.js`, 총괄) | 없음 | 버전·시각. Docker healthcheck가 씀 |

- 서비스: `backend/src/services/backup.js` · `version.js`
- 운영 스크립트: `server-status.ps1` · `server-status.bat` · `verify-backup.ps1` (· `verify-backup.sh`)
- 권한 목록: `backend/src/middleware/permissions.js` (공용 폴더, 설정 세션이 만듦 — 3-1절)
- 검사: `node backend/test/settings.permissions.mjs` — 서버 권한 목록 ↔ `modules.js` (설치·서버 불필요)
- 서버 안내 문구: `backend/src/routes/settings.messages.js`(새) ↔ `frontend/src/pages/settingsMessages.js`(새), 검사 `node backend/test/settings.messages.mjs`
- 약 재고 시험: `backend/test/settings.drugs.mjs` (격리 스택 전용)
- **권한 전체 시험**: `backend/test/settings.access.mjs` (격리 스택 전용, 9080 거부) — 역할별 계정 10개(관리자·의사·접수·간호사·약국만·검사만·수납만·통계만·설정만·권한 없음) × 라우트 99개 = 990건. 기대 값은 **S2 표**(인계 노트 2026-09-29 「S2 초안」, 결정대로)를 스크립트 안에 그대로 옮긴 것이고 라우트 파일에서 읽지 **않습니다** — 파일의 가드가 표에서 벗어나면 잡으라고. 칸마다 「막혀야 하는데 통과 / 통과해야 하는데 403」과 401·5xx를 알림. **라우트를 추가하거나 권한을 바꾸면 이 표에도 한 줄.** 쓰기 라우트는 없는 id(999999)로 부름

### 공용 부품

- 없음. (`modules.js`·`api/client.js`·`middleware/auth.js`·`TopBar.jsx`는 총괄 소유로, 이 모듈이 기대고 있음)

### DB 테이블

| 테이블 | 이 모듈이 쓰는 것 | 마이그레이션 |
|---|---|---|
| `staff` | 계정. `login_id` UNIQUE, `password_hash`, `role` CHECK, `permissions TEXT[]`, `department_id`, `status` CHECK(`active`/`inactive`), `last_login` | 001, 013, **020**(`nurse` 역할 허용, 세션에서는 701) |
| `department` | `code` UNIQUE, 이름 3개 국어, `head_doctor_id` → staff | 001, 002(기본 9개 과) |
| `clinic` | 한 줄(id=1). 이름 3개 국어, 주소·전화·이메일·진료시간, `app_title` | 001, 002, 011 |
| `order_code` | `code_type` CHECK(fee/lab/imaging/procedure), `price`/`price_clinic`, PACS 칸 | 001, 009 |
| `phrase_dictionary` | 상용구 3개 국어 | 001 |
| `service_heartbeat` | 브리지 생존 신호 (PACS 브리지가 씀, 상태 API가 읽음) | 018 |
| `schema_migrations` | 마이그레이션 적용 기록 (`config/migrate.js`, 총괄) | — |

## 5. 다른 모듈과의 연결

- **모두**: 로그인·토큰·권한(`modules.js`)이 모든 화면의 문입니다. 상단바(`TopBar.jsx`)가 `GET /admin/clinic`의 `app_title`을 제목으로, `/api/version`으로 업데이트 알림을 보여줍니다.
- **접수**: `GET /admin/departments`, `GET /admin/doctors` (`Registration.jsx`)
- **진료**: `GET /admin/drugs` · `order-codes` · `phrases` (`Consultation.jsx`), 약속처방(`/api/order-sets`, 진료 세션 소유 라우트)
- **수납**: `GET /admin/order-codes?code_type=fee` (`Payment.jsx`)
- **인쇄 문서**: `DocumentModal.jsx`가 `GET /admin/clinic`으로 편지지 머리글을 찍습니다.
- **약국**: 약품 마스터 API(`/admin/drugs`)는 이 모듈 라우트에 있지만 약품 탭 내용은 약국 세션이 고칩니다.
- **임상병리**: 검사항목 탭이 `/api/lab/test-items`를 쓰고, 새 검사 패널은 `POST /admin/order-codes`(code_type `lab`)로 만듭니다.
- **PACS**: 오더 연동 탭이 `/api/pacs/config`·`/pacs/test`를 씁니다. 상태 API가 `service_heartbeat`·`pacs_config`를 읽습니다.
- **통계**: 직원·진료과 이름을 조인해서 씀 (확인 필요 — 통계 라우트 안을 보지 않음).

## 6. 설정 항목

`.env` (git에 없음, `setup.ps1`/`setup.sh`가 만듦. 값은 여기 쓰지 않음)

| 이름 | 의미 |
|---|---|
| `DB_PASSWORD` | PostgreSQL 비밀번호. DB와 백엔드가 같이 씀. `docker-compose.yml`에 공개 기본값이 있어 `.env`가 없으면 그 값이 쓰임 |
| `JWT_SECRET` | 로그인 토큰 서명 키. **없으면 시작 거부**. 바꾸면 모든 사람이 다시 로그인해야 함 |
| `BACKUP_PATH` | 백업을 앱 폴더 대신 다른 드라이브/폴더에 저장. 비우면 `./backups` (**꺼지는 것이 아님** — `.env.example`의 설명은 옛날 것) |
| `BACKUP_RETENTION_DAYS` | 백업 보관 일수 (기본 30) |
| `BACKUP_TIME` | 매일 자동 백업 시각 `HH:MM` (기본 02:00, 컨테이너 현지 시각) |
| `TZ` | 시간대 (예: `Indian/Antananarivo`). DB·백엔드가 같이 씀. 백업 파일 이름 시각과 「오늘」의 기준 |
| `UPDATE_CHECK` | `false`면 GitHub 업데이트 확인 끔 (기본 켬) |
| `UPDATE_REPO` | 업데이트를 확인할 GitHub 저장소 (기본 `BethesdaHaneulNa/Bethesda-EMR`) |

`docker-compose.yml`이 고정하는 것: `DB_HOST`·`DB_PORT`·`DB_NAME`·`DB_USER`·`PORT`·`NODE_ENV`.

코드 상수: `services/backup.js` — `STALE_HOURS` 36, `MIN_KEEP` 7, `RETRY_MINUTES` 30. `status.routes.js`는 백업 기준을 `backup.js`에서 가져옵니다(디스크 20/5GB·브리지 60초는 자체 상수).
스크립트 쪽 상수: `server-status.ps1` — 새로고침 15초, 브리지 60초, 백업 36시간, 디스크 20/5GB, 기본 언어 `server-status.bat`의 `-Lang fr`. **PowerShell이라 서버 코드와 공유하지 못하고 숫자를 따로 들고 있습니다** — 바꿀 때 같이 바꾸세요.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것입니다. ~~취소선~~ 항목은 고쳤고, 무엇을 했는지는 해당 절에 있습니다. 심각도: 높음 · 보통 · 낮음. **근거의 줄 번호는 `08d0336`(첫 작성) 기준**입니다 — 이후 커밋에서 조금씩 밀렸습니다.

### 보안 · 권한

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| S1 | ~~높음~~ **고침 (총괄)** | ~~비활성·권한을 뺀 직원이 토큰으로 12시간 계속 씀~~ → 2026-09-29 실장님 결정, 총괄이 `middleware/auth.js`에서 요청마다 DB의 상태·권한을 읽게 함. 격리 스택에서 확인: 권한을 뺀 관리자가 저장 → 403 「Vous n'avez pas l'autorisation…」, 비활성으로 바꾸자 다음 화면 요청에서 로그인 화면 → 「Ce compte est désactivé」. 화면 메뉴가 늦게 바뀌는 것은 U13 | (옛 코드) `middleware/auth.js` |
| S2 | ~~높음~~ **고침 (각 세션)** | ~~접수·문서 API와 진료 조회 API가 로그인만 확인~~ → 2026-09-29 실장님 결정, 표대로 각 파일 주인이 적용(접수·진료·수납·약국·임상병리·통계·PACS·설정). **`settings.access.mjs`로 990칸 확인 — 모두 표와 같음**(2026-09-29). 권한과 별개로 발견: `POST /consultations/:id/diagnoses`·`/prescriptions`가 빈 입력에 400 대신 **500**(진료 세션에 전달) | 각 라우트 파일 |
| S3 | 보통 | 「설치 때 만든 관리자」를 **아이디 `admin`** 으로 판별하는데 첫 실행 화면은 아이디를 자유롭게 받음. 다른 아이디로 설치했으면 보호가 없고(마지막 관리자 검사만 남음), 나중에 `admin`이라는 아이디의 일반 직원을 만들면 저장할 때마다 관리자·전체 권한으로 바뀜 | `admin.routes.js:20,219`, `Login.jsx:59`, `auth.routes.js:25` |
| S4 | 보통 (**일부 고침**) | 새 직원 비밀번호 칸에 `1234`가 미리 들어감, 직원 비밀번호 길이 제한 없음 — **결정 대기**. ~~비밀번호 칸이 가려지지 않음~~ → 2026-09-29: `type=password` + **Afficher/Masquer** 버튼, `autoComplete="new-password"`(브라우저가 관리자 자신의 비밀번호를 직원 칸에 채워 넣지 않게) | `Settings.jsx` 직원 편집 창, `admin.routes.js` POST staff |
| S5 | 보통 | 로그인 실패 횟수 제한 없음 (LAN 안이라 위험은 제한적) | `auth.routes.js:49` |
| S6 | 보통 | API로 `status`를 빼고 직원을 저장하면 `status`가 `NULL`이 됨 (CHECK는 NULL을 통과). 그 계정은 로그인 불가, 관리자 수에서도 빠짐. 마지막 관리자면 첫 실행 화면이 다시 열려 **로그인 없이 새 관리자를 만들 수 있음**. 화면은 항상 status를 보내므로 API 직접 호출일 때만 | `admin.routes.js:218,226,241`, `auth.routes.js:9` |
| S7 | 낮음 | 비밀번호 확인 전에 「Account is inactive」를 알려줘 계정 존재·상태가 드러남 | `auth.routes.js:63` |
| S8 | 낮음 | `GET /api/pacs/config`가 로그인한 누구에게나 브리지 토큰을 줌 (토큰으로 워크리스트 피드의 환자 정보 조회 가능) | `pacs.routes.js:43` — PACS 세션 소유 |
| S9 | 낮음 | 마지막 관리자 검사가 트랜잭션 없이 이뤄져, 두 관리자를 **동시에** 강등하면 둘 다 통과할 수 있음. 첫 관리자 생성(`/setup`)도 동시 요청이면 둘 생길 수 있음 | `admin.routes.js:229`, `auth.routes.js:24` |
| S10 | 낮음 | 권한 배열을 허용 목록으로 검사하지 않음, `login_id` 공백 제거·빈 값 검사가 PUT에 없음, `bcryptjs` import만 있고 안 씀 | `admin.routes.js:192,209,213`, `auth.routes.js:2` |

### 백업 신뢰성

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| B1 | ~~보통~~ **고침** | ~~백업 **두 개가 같은 분에 돌면** 같은 파일 이름에 동시에 씀. 한쪽이 실패하면 다른 쪽의 좋은 파일까지 지움~~ → 2026-09-29: 한 번에 하나만 돌고, 작업 폴더에서 쓴 뒤 검증되면 옮김 (3-4절) | (옛 코드) `backup.js` `stamp()` 분 단위, 잠금 없음, 실패 시 `unlinkSync(file)` |
| B2 | ~~보통~~ **고침** | ~~보관 정리가 개수를 보지 않고 날짜만 봄~~ → 2026-09-29: 최근 7개는 나이와 상관없이 남김 (3-4절) | (옛 코드) `backup.js` `prune()` |
| B3 | ~~보통~~ **고침** | ~~백업 탭의 「✓ 자동 백업 켜짐」이 항상 초록~~ → 2026-09-29: 정상·오래됨·없음·실패를 색 띠로, 실패 오류 문구까지 표시 (2.7절, 3-4절) | (옛 코드) `Settings.jsx` 백업 탭 |
| B4 | ~~보통~~ **고침** | ~~`verify-backup`이 스크립트 옆 `backups`만 봄~~ → 2026-09-29: Docker의 `/backups` 마운트에서 찾음, 컨테이너 이름 매개변수 추가 (3-5절) | (옛 코드) `verify-backup.ps1:40,158` |
| B5 | ~~보통~~ **고침** | ~~새벽 백업을 낮에 검사하면 멀쩡한 백업이 「VERIFY FAILED」~~ → 격리 스택에서 **재현한 뒤** 고침: 데이터 차이는 [info], `-Strict`에서만 실패 (3-5절) | (옛 코드) `verify-backup.ps1:197-206` |
| B11 | ~~높음~~ **고침** | ~~서버 상태 창이 **호스트 포트가 막힌 것**을 모름 — 컨테이너가 healthy면 「정상」~~ → 2026-09-29: 게시 포트마다 호스트에서 연결 확인, Windows 예약이면 그렇게 표시 (3-6절). 이 PC에서 실제로 PACS 4242·9090이 막혀 있었음 | (옛 코드) `server-status.ps1` `Get-ContainerCheck` |
| B12 | ~~보통~~ **고침** | ~~서버 상태 창의 색 띠가 첫 두 줄(DB·앱 서버)을 가림~~ → 2026-09-29 (3-6절) | (옛 코드) `server-status.ps1` 컨트롤 추가 순서 |
| B6 | ~~낮음~~ **고침** | ~~백업 목록·「최근」의 시각이 UTC로 나옴~~ → 2026-09-29: 브라우저 PC의 현지 시각으로 표시(`fmtLocal`) | (옛 코드) `String(mtime).slice(0,16)` — ISO(UTC) 문자열 |
| B7 | 낮음 | 디스크 검사가 백업 드라이브만 봄. 백업을 D:로 옮기면 DB가 있는 드라이브가 차도 모름 | `status.routes.js:261`, `server-status.ps1:216` |
| B8 | 낮음 | 내려받기가 파일 전체를 브라우저 메모리에 올림 (DB가 커지면 느리거나 실패 가능) | `Settings.jsx:41` |
| B9 | 낮음 | `.env.example`이 「`BACKUP_PATH`를 비우면 백업이 꺼진다」고 설명 — 코드는 항상 켜짐. (백업 탭 안내문의 같은 옛 대체 문구는 2026-09-29에 지움 — 번역 키 `backupIntro`가 세 언어 모두 있어서 대체 문구가 필요 없음) | `.env.example` — 총괄 소유 |
| B10 | 낮음 | `DEPLOYMENT.md` 5b 복원 명령을 **Git Bash**에서 치면 `docker exec … gunzip -t /tmp/restore.sql.gz`의 `/tmp/…`가 Windows 경로로 바뀌어 검사가 실패함 (안전한 쪽으로 실패하지만 헷갈림). PowerShell·cmd·Linux에서는 문제없음 — 2026-09-29 격리 스택에서 확인 | `DEPLOYMENT.md` — 총괄 소유 |

### 화면 · 기타

| # | 심각도 | 문제 | 근거 |
|---|---|---|---|
| U1 | ~~보통~~ **대부분 고침** | ~~설정 화면 글자 상당수가 영어로 고정~~ → 2026-09-29: 틀(탭 이름·공용 삭제 확인·편집 창 제목·오류·저장 알림)과 직원·오더 코드·상용구·진료과·병원 정보 탭, 그 편집 창을 `se_` 키로. 역할·오더 종류·상태도 번역해서 표시(저장 값은 그대로). **남은 것**: 약품 탭 안쪽(약국 몫 — 탭 이름만 옮김), 오더 연동 탭(PACS 몫), 분류 드롭다운 값(Consultation·General 등 — DB에 저장되는 값이라 번역하지 않음) | (옛 코드) `Settings.jsx` |
| U2 | 보통 | 비활성으로 만든 직원을 **다시 활성으로 되돌릴 방법이 화면에 없음** (상태 칸 없음) | `Settings.jsx:649-684` |
| U3 | 보통 | `/api/system/status`를 화면 어디에서도 부르지 않음. 상태 창은 서버 PC에서만 보임 | `status.routes.js`, 프론트엔드에 호출 없음 |
| U4 | ~~낮음~~ **고침** | ~~첫 화면 목록 하나가 실패하면 뒤의 것이 안 불러와지고 조용함~~ → 2026-09-29: 목록을 따로따로 불러오고, 실패하면 Paramètres 맨 위에 빨간 줄로 이유(권한 없음 등)를 보여줌. 권한을 뺀 관리자에게 직원 목록이 **빈 채로** 보여 「직원이 없다」로 읽히던 것 | (옛 코드) `Settings.jsx` `loadAll` |
| U13 | ~~보통~~ **고침 (총괄)** | ~~권한을 바꾼 직원의 메뉴는 다시 로그인해야 바뀜~~ → 2026-09-29 `TopBar.jsx`가 `/auth/me`로 주기적으로 다시 읽음. 격리 스택에서 확인: 통계 권한을 더하고 새로 고치자 메뉴에 Statistiques, `/stats` 열림 / 빼고 새로 고치자 메뉴에서 사라짐. 남은 점(권한을 뺀 화면을 보고 있던 사람이 그 화면에 남음)도 총괄이 고침(`7662160`) — 격리 스택에서 확인: 통계 화면을 연 채 통계 권한을 빼고 창으로 돌아오자 **접수로 이동**, 접수 화면에서 입력 중에 **다른** 권한(수납)을 빼자 **그대로 남고 입력도 유지**, 메뉴에서 Paiement만 사라짐 | `TopBar.jsx`(총괄) |
| U5 | 낮음 | 앱 제목을 비워서 저장할 수 없음 (빈 값이면 이전 값 유지) | `admin.routes.js:344` `COALESCE` |
| U6 | 낮음 (**일부 고침**) | ~~로그인 화면 아래 버전이 `v1.0`으로 고정~~ → 2026-09-29: 상단바와 같은 빌드 버전(`__APP_VERSION__`). 로고 글자가 옛 이름의 「M」인 것은 그대로 | `Login.jsx` |
| U7 | ~~낮음~~ **고침** | ~~저장 알림이 영어 「Saved ✓」~~ → `se_saved` (2026-09-29) | (옛 코드) `Settings.jsx:75,92` |
| U8 | 낮음 | 진료과 저장 코드에 관계없는 `setPacsConfig(...)` 한 줄이 들어가 있음 (동작엔 지장 없음) | `Settings.jsx:139` |
| U9 | ~~낮음~~ **고침** | ~~권한 목록이 네 곳에 따로 있음~~ → 2026-09-29: 서버는 `middleware/permissions.js` 한 곳, `modules.js`와 같은지 `backend/test/settings.permissions.mjs`로 확인 (3-1절) | (옛 코드) `admin.routes.js:12`, `auth.routes.js:30`, `middleware/auth.js` |
| U10 | ~~높음~~ **고침(안전장치)** | ~~약 저장이 재고를 덮어씀 (약국 H4)~~ → 2026-09-29 제안 A 적용: 재고를 안 고쳤으면 안 건드림, 고쳤는데 그 사이 바뀌었으면 409로 다시 물음 (3-8절). 재고를 움직임으로만 바꾸는 것(B)은 약국 결정 대기 | (옛 코드) `admin.routes.js` DRUGS `stock_qty=$11` |
| U11 | ~~보통~~ **고침** | ~~로그인·설정 서버 안내가 영어로 뜸~~ → 2026-09-29: 서버 문구를 `settings.messages.js` 상수로, 화면이 `settingsMessages.js`로 맞춰 번역 (3-3절). 오더 연동·검사항목 탭 함수의 오류 표시는 각 세션 몫이라 그대로 | (옛 코드) `auth.routes.js`, `admin.routes.js` |
| U12 | ~~높음~~ **고침** | ~~틀린 비밀번호·비활성 계정으로 로그인하면 **아무 안내 없이 칸만 비움**~~ — `api/client.js`의 401 새로고침이 안내를 지움. → 2026-09-29: 로그인·첫 설정은 `Login.jsx`가 직접 보냄 (3-3절) | (옛 코드) `Login.jsx`가 `api.post` 사용 |

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 코드 기준으로 위키 첫 작성, 알려진 문제 목록 정리 (코드 변경 없음) | `08d0336` |
| 2026-09-29 | 백업: 동시 실행 하나로 묶기, 작업 폴더에서 쓰고 검증 뒤 옮기기, 최근 7개는 안 지우기, 백업 탭에 상태(정상·오래됨·없음·실패)와 실패 오류 표시, 시각을 PC 현지 시각으로 (B1·B2·B3·B6) | `e2a29bd` |
| 2026-09-29 | 서버 상태 창: 호스트 포트 검사(Windows 예약 포트), 색 띠가 첫 두 줄을 가리던 배치 고침 (B11·B12). 백업 검사: 백업 위치를 Docker에서 찾기, 컨테이너 매개변수, 데이터 차이는 [info]·`-Strict`에서만 실패 (B4·B5), `.sh`도 같이 | `2a40e84` |
| 2026-09-29 | 설정 화면 영어 고정 글자를 세 언어로 (U1 대부분·U7), 직원 비활성 확인 문구, 2절에 역할별 기본 권한 표 | `f5e7e55` |
| 2026-09-29 | 서버의 권한 목록을 `middleware/permissions.js` 한 곳으로, `modules.js`와 비교하는 검사 추가 (U9). 동작 변화 없음 | `56f2558` |
| 2026-09-29 | 약 저장이 재고를 덮어쓰는 문제 제안(U10, 약국 H4) | `1874812` |
| 2026-09-29 | 상태 API가 브리지 heartbeat의 `arrivals_error`를 「확인 필요」로 (PACS P-20, 보내는 쪽은 PACS). 서버 권한 검사(S2) 라우트별 허용 권한표 초안 — 인계 노트 | `9d7e380` |
| 2026-09-29 | 약 저장 재고 안전장치 (약국 H4 제안 A, U10) | `f44ab9e` |
| 2026-09-29 | 상용구 편집 창에 프랑스어·영어 문장 칸, 목록을 화면 언어로, 상용구 정렬 고정 | `1d3e4fc` |
| 2026-09-29 | 2절을 프랑스어 화면 기준으로 다시 씀 (탭 표, 직원 목록 칸, 백업 색 띠별 할 일, 병원 정보 칸, 오더 코드 칸, 서버 상태 창 띠·상태 글자, 「이런 안내가 뜰 때」 표). 7절 U11 추가 | `3b5ce27` |
| 2026-09-29 | 서버 안내를 화면 언어로 (U11: `settings.messages.js` ↔ `settingsMessages.js`, 검사 스크립트), 틀린 비밀번호에 안내가 안 뜨던 것 (U12), 직원 비밀번호 칸 가리기 (S4 일부) | `e2f794b` |
| 2026-09-29 | 간호사(`nurse`) 역할 — 마이그레이션 701(→020), 기본 권한 약국+임상병리. 로그인 화면 버전을 상단바와 같게 | `47043f4` |
| 2026-09-29 | 간호사 기본 권한을 결정대로 접수·약국·임상병리로 (코드는 총괄 `f4df9bc`), 위키 표·주의점, 첫 화면 확인 | (이 커밋) |
| 2026-09-29 | 새 PC로 옮기는 복원 연습과 절차(2.13절). 연습 중 찾은 것: 기존 직원의 비밀번호 칸 힌트 「••••」가 비밀번호가 채워진 것처럼 보임 → 「Vide = inchangé」 | `c8437ad` |
| 2026-09-29 | S1 후속: 위키 2·3·7절(바로 막힘, 메뉴는 다시 로그인해야 — U13), 「Access denied」 등 인증 문구 번역, Paramètres 목록을 따로 불러오고 실패 이유 표시(U4), `/auth/me`가 현재 권한을 로그인과 같은 모양으로. S2: `/admin/doctors`에 registration·consultation | `d277d53` |
| 2026-09-29 | U13 해결(총괄) 확인, 2.2·2.5를 「새로 고치면 반영」으로 | `8ea4d78` |
| 2026-09-29 | 역할 × 라우트 권한 시험 `settings.access.mjs`(990건, 모두 S2 표와 같음), U13 남은 점 해결(총괄) 확인 | `f3b8f01` |
| 2026-09-29 | 약을 감출 때 그 약을 쓰는 약속처방 이름을 확인 창에 (막지 않음) — 약속처방은 약 id를 복사해 두어 감춘 약을 계속 처방함(진료 세션 발견) | (이 커밋) |
