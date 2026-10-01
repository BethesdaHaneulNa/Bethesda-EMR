# PACS (의료 영상)

> **담당**: PACS 세션 · 브랜치 `session/pacs` (EMR 저장소와 PACS 저장소 둘 다) · **마지막 갱신**: 2026-09-29 · **상태**: 토큰 보안(P-2·P-5) develop에 합침 · 영상 도착 확인(P-7)·환자번호 대조(P-3) 확인 요청 — 나머지는 7절

## 1. 이 모듈이 하는 일

의사가 EMR에서 낸 **영상 오더**(X선·초음파 등)를 **촬영 장비의 워크리스트**로 넘기고, 장비가 찍은 영상을 **Orthanc**에 저장했다가, EMR 안에서 **영상을 보고 판독 소견을 쓰게** 합니다.

- 방사선사가 장비에 환자 이름·생년월일을 다시 치지 않아도 됩니다(오타로 영상이 엉뚱한 환자에 붙는 일을 줄이려는 목적).
- 영상은 **EMR DB에 들어가지 않습니다.** Orthanc(별도 컨테이너)에 저장되고, EMR은 오더마다 정해 둔 **StudyInstanceUID**로 Orthanc 뷰어를 불러올 뿐입니다.
- 판독 소견은 EMR의 `order_item.result_text`에 저장됩니다.
- 영상이 PACS에 다 들어오면 브리지가 EMR에 알려 줍니다. 그러면 그 오더는 **장비 워크리스트에서 빠지고**, EMR에는 「영상 N장 도착」과 **영상 속 환자번호가 차트번호와 맞는지**가 기록됩니다.
- PACS는 **선택 사항**입니다. PACS를 설치하지 않은 병원에서도 영상 오더·판독 입력은 됩니다(영상만 안 보임).

구성은 저장소 두 개에 나뉘어 있습니다.

| 부분 | 어디 | 무엇 |
|---|---|---|
| Orthanc 26.6.1 | PACS 저장소 `docker-compose.yml` (공식 이미지 `orthancteam/orthanc`, 우리가 수정하지 않음) | 영상 저장, DICOM 수신(C-STORE), 워크리스트 응답(MWL C-FIND), 웹 뷰어(Stone Web Viewer, Orthanc Explorer 2) |
| 워크리스트 브리지 | PACS 저장소 `bridge/bridge.py` (우리 코드, Python) | EMR의 오더 피드를 15초마다 읽어 `.wl` 파일로 씀. 오더마다 Orthanc에 영상이 다 들어왔는지 보고 EMR에 알림 |
| EMR 쪽 | EMR 저장소 `pacs.routes.js` · `worklist.routes.js` · `RadiologyReadings.jsx` (+ 진료 화면의 뷰어 창) | 워크리스트 생성, 피드 제공, 뷰어 주소, 판독 저장, 브리지 생존 신호 |

## 2. 화면 사용법 (직원용)

> 병원 직원이 읽는 부분입니다. 현장은 프랑스어 화면을 쓰므로 **버튼·칸 이름은 프랑스어 화면에 보이는 그대로** 쓰고, 괄호 안에 한국어 화면의 이름을 붙였습니다. 화면 언어는 오른쪽 위의 **EN · KO · FR** 로 바꿉니다.
>
> 촬영 장비의 메뉴 이름은 장비마다 다릅니다. 장비를 설치한 뒤 채웁니다 — 확인 필요.

### 2.1 의사 — 영상 검사 내기

1. 맨 위 메뉴에서 **Consultation (진료)** 를 누르고, **File d'Attente (진료대기 현황)** 또는 **🔍 Trouver patient (환자 찾기)** 로 환자를 엽니다.
2. **Prescriptions (처방)** 칸의 입력란 **Saisir médicament, code examen ou nom... (약/검사 코드 또는 이름 입력...)** 에 검사 이름을 쳐서 영상 검사(예: Chest PA, 초음파)를 추가합니다.
3. 오더 줄 오른쪽 끝(**WL** 칸)의 글자가 **Envoyé (전송됨)** 이면 촬영실 장비로 넘어간 것입니다. 영상이 다 들어오면 **Réalisé (촬영 완료)** 로 바뀝니다.
4. 잘못 낸 검사는 그 줄을 지우면 됩니다. 15초 안에 장비 목록에서도 빠집니다.
   - 영상이 이미 들어왔거나 판독을 쓴 검사는 **지울 수 없고 「취소됨」으로 표시**합니다(결정 38-③, 검사와 같은 방식):
     1. 그 줄의 빨간 **✕** 에 마우스를 올리면 *A un résultat - cliquer pour le marquer comme annulé (결과가 있는 검사 — 누르면 「취소됨」으로 표시할지 묻습니다)* 가 보입니다. 누릅니다.
     2. 묻는 창이 뜹니다 — *« 검사 이름 » a déjà un compte-rendu ou un examen réalisé et ne peut pas être retiré. Le marquer comme annulé ? … (「검사 이름」에는 이미 판독이나 촬영이 있어 지울 수 없습니다. 대신 「취소됨」으로 표시할까요? …)*. 맨 아래 **Motif (facultatif) (취소 이유, 선택)** 칸에 이유를 한 줄 적고(예: 「다른 환자로 잘못 냄」) **OK** 를 누릅니다. 이유는 비워도 되지만 적어 두면 나중에 보는 사람이 압니다. **Annuler** 를 누르면 아무것도 바뀌지 않습니다.
     3. 오더 줄이 **회색으로 줄이 그어집니다**(취소됨). 청구에서 빠지고, 찍힌 영상과 판독은 기록으로 남습니다. 아직 안 찍었다면 장비 목록에서도 15초 안에 빠집니다.
     4. 이미 수납한 검사면 **Paiement (수납)** 에서 환불(정정)을 해야 합니다.
     5. 되돌리는 기능은 없습니다. 잘못 취소했으면 검사를 다시 내세요.
   - 🔒 는 그 밖의 이유로 고칠 수 없는 줄입니다. 영상 검사에 *Une demande d’imagerie ne peut pas encore être marquée comme annulée… (영상 오더는 아직 「취소됨」으로 표시할 수 없습니다)* 가 뜨면, 진료 쪽 켜기가 아직 반영되지 않은 것 — 관리자에게 알립니다.

> 검사는 **낸 날에만** 장비 목록에 나옵니다. 오늘 낸 검사를 내일 찍으려면 내일 다시 내야 합니다(7절 P-6).

### 2.2 방사선사 — 촬영

1. 장비(또는 장비 PC)에서 **워크리스트(Worklist / MWL)** 를 불러옵니다. 오늘 검사가 난 환자가 나옵니다.
   - **환자를 찍기 직전마다 목록을 새로 불러오세요.** 아까 불러온 목록을 그대로 쓰면, 그 사이 진료실에서 지우거나 취소한 검사가 장비 화면에는 아직 남아 있을 수 있습니다. 그런 검사로 찍으면 영상이 어느 오더에도 붙지 않거나 취소된 오더에 붙어, 의사가 진료 화면에서 제대로 볼 수 없습니다.
2. 목록에서 **찍을 환자를 정확히 고릅니다.** 이름 · 차트번호(예: `26-00001`) · 검사 이름을 환자와 맞춰 봅니다.
   - **여기서 다른 환자를 고르면 영상이 그 환자의 기록에 붙고, EMR은 그것을 알아챌 수 없습니다.** 이 단계가 가장 중요합니다.
3. 촬영이 끝나면 장비에서 PACS로 **전송(Send / Store)** 합니다.
4. 전송하고 **1~2분쯤 지나면 그 환자는 워크리스트에서 저절로 빠집니다.** 끝난 환자가 목록에 남아 있으면 다음 환자를 잘못 고르기 쉬워서입니다.
   - 같은 검사를 더 찍어야 하면 장비에 남아 있는 그 검사에 이어서 찍어 보냅니다. (장비마다 다름 — 확인 필요)

**워크리스트에 환자가 없을 때**

1. **환자 이름을 장비에 손으로 치지 마세요.** 손으로 친 영상은 EMR의 검사와 연결되지 않아 의사가 진료 화면에서 볼 수 없습니다.
2. 의사에게 그 환자의 영상 검사를 **오늘** 냈는지 물어봅니다. 어제 낸 검사는 오늘 목록에 없습니다.
3. 검사를 냈다면 15초쯤 기다렸다가 워크리스트를 다시 불러옵니다.
4. 그래도 없으면 **전체 목록이 비어 있는지** 봅니다. 모든 환자가 안 보이면 PACS 연결 문제입니다 — 관리자(실장님)에게 알립니다. (관리자는 서버 상태 창의 **Imagerie (PACS)** · **Liste de travail des appareils (장비 워크리스트)** 줄을 봅니다.)

### 2.3 의사 — 영상 보기와 판독

1. **Consultation (진료)** 화면의 오더 목록에서 영상 검사 줄의 **🖼** 버튼을 누릅니다.
2. **🖼 Visionneuse (영상 뷰어)** 창이 열립니다. 왼쪽이 영상, 오른쪽이 **🩻 Compte-rendu (판독소견)** 칸입니다. 창 맨 위에 EMR에서 고른 환자의 차트번호·이름이 보입니다.
3. 오른쪽 칸 **Saisir le compte-rendu radiologique... (판독 소견을 입력하세요...)** 에 판독을 쓰고 **💾 Enregistrer (판독 저장)** 을 누릅니다. 위에 **Lu par (판독)** : 쓴 사람 · 날짜가 나옵니다.
4. 영상을 크게 보려면 **Ouvrir dans un onglet ↗ (새 탭에서 열기)** 를 누릅니다.
   - **다른 날짜 검사와 나란히 비교**하려면 아래 「2.3.1 이전 검사와 비교」.
5. 다 봤으면 **Fermer ✕ (닫기)** 를 누릅니다.

> ⚠ **판독을 쓰는 중에 창 바깥의 어두운 곳을 누르면 창이 닫히고, 저장하지 않은 판독은 사라집니다.** 먼저 **Enregistrer** 를 누르세요.
>
> 판독은 **진료 권한**이 있는 직원만 쓰고 고칠 수 있습니다. 판독을 고치면 이전 내용은 남지 않습니다.
>
> 영상 창은 **아이디·비밀번호를 묻지 않습니다**(P-9, EMR이 대신 영상 서버에 들어감). 창을 연 오더의 영상만 보이고, 30분이 지나면 창 안에 **La session d'affichage a expiré… (영상 보기 시간이 끝났습니다)** 가 나옵니다 — **Fermer ✕** 로 닫고 **🖼** 로 다시 여세요.
>
> 영상 칸 왼쪽 위의 빨간 글씨 *For patients, researchers and quality assurance. Not for diagnostic usage.* 는 영상 프로그램(Stone)이 늘 붙이는 문구입니다. 진단에 쓰는 전용 판독 프로그램이 아니라는 뜻입니다.

### 2.3.1 이전 검사와 비교 (2026-10-01, 실장님 요청)

같은 환자가 다른 날짜에 찍은 검사(예: 흉부 사진 두 장)를 영상 창에서 나란히 봅니다. 실장님이 서버 PC에서 영상 프로그램의 환자 보기(`?patient=`)로 직접 해 보시고 「이 기능이 가능하게끔」 하신 그 모양입니다 — 왼쪽 목록에 그 환자의 검사가 다 있고, 화면을 나눠 끌어다 놓기.

1. 최근 검사를 엽니다(**🖼** 또는 목록의 **Voir image**). 처음에는 전과 똑같이 그 검사 하나만 보입니다.
2. 이 환자에게 영상이 있는 다른 검사가 있으면 창 제목 아래에 한 줄이 생깁니다: 보라색 단추 **⇆ Comparer avec les examens précédents (N) (이전 검사와 비교 (N건))**. 같은 검사가 다른 날짜에 있으면 옆에 **Même examen : Chest PA · 2026-09-28 (같은 검사: …)**.
3. 단추를 누릅니다. **판독 칸이 접히고**(영상 자리를 넓히려고), 영상 프로그램의 왼쪽 목록에 **그 환자의 검사가 모두** 날짜와 함께 나옵니다. 지금 연 검사가 그대로 떠 있습니다.
4. **처음 한 번만**: 영상 위 도구 줄 맨 왼쪽의 **▦** 단추에서 **두 칸(좌우)** 을 고릅니다. 영상 프로그램이 이것을 기억해서 다음부터는 창이 처음부터 두 칸으로 열립니다.
5. 왼쪽 목록에서 검사를 칸으로 **끌어다 놓습니다**(빈 칸에는 **[ drop a series here ]**). 각 영상 오른쪽 위에 검사 이름과 날짜가 적혀 있습니다.
6. 창 제목 아래의 **🩻 Le compte-rendu est celui de : Chest PA · 2026-10-01 (판독 칸은 이 검사의 것: …)** — 비교 중에 어느 검사의 판독을 쓰는지 알려 줍니다. 늘 **처음에 연 검사**입니다.
7. **✕ Fin de la comparaison (비교 끝내기)** — 연 검사 하나로 돌아가고 판독 칸이 다시 나옵니다.
8. 더 크게 비교하려면 비교 중에 **Ouvrir dans un onglet ↗** — 새 탭에 같은 검사들이 열립니다.

**비교할 검사를 직접 골라 열기** (2026-10-01, 실장님: 「왼쪽에 체크 버튼 만들고 … 우측 위에 비교하기」) — **🩻 Imagerie (영상/판독)** 목록에서:

1. 비교할 검사마다 줄 왼쪽의 칸을 체크합니다(둘 이상, 최대 9건 — 열 번째를 누르면 「9 examens au plus pour une comparaison」 알림).
2. 목록 창 오른쪽 위의 **⇆ Comparer (N) (비교하기 (N))** 를 누릅니다(둘 이상 체크해야 켜짐). 영상 창이 **체크한 검사만** 가지고, 판독 칸이 접힌 채로 열립니다.
3. 창 제목과 판독 칸은 체크한 것 가운데 **가장 최근 검사**의 것이고, 그 검사가 첫 칸에 먼저 뜹니다. **🩻 Le compte-rendu est celui de : …** 줄이 알려 줍니다. (가장 최근 것으로 정한 까닭: 오늘 사진을 전 것과 견주는 것이 보통이고, 체크한 순서에 따라 판독 대상이 달라지면 헷갈림.)
4. 화면 나누기·끌어다 놓기는 위 4·5번과 같습니다.
5. **Fermer ✕** 로 영상 창을 닫으면 목록으로 돌아오고 **체크는 남아 있습니다** — 하나를 빼거나 더해서 다시 비교할 수 있습니다. 목록을 닫으면 체크가 사라집니다.

- **꺼진 칸**은 체크할 수 없습니다. 마우스를 올리면 이유가 나옵니다: 취소된 검사 / 도착한 영상이 없음 / 영상의 환자 번호 경고. (위의 「비교 목록에 넣지 않는 것」과 같은 규칙 — 서버도 같은 규칙으로 다시 확인해서, 하나라도 어긋나면 아무것도 열지 않습니다.)
- 수납 화면의 같은 목록에는 체크 칸이 없습니다(영상 창이 없음).

- **Masquer le compte-rendu ▸ / ◂ Afficher le compte-rendu (판독 칸 접기 / 펴기)** — 창 제목 줄의 단추. 비교가 아니어도 영상을 크게 보려고 접을 수 있습니다. 쓰던 판독은 지워지지 않습니다. 창을 새로 열면 늘 펴진 채로 열립니다.
- 줄이 안 생기면 이 환자에게 영상이 있는 다른 검사가 없는 것입니다.
- **처음부터 다 보여 주지 않는 까닭**: 판독 칸은 연 오더의 것인데, 목록에 다른 날짜 검사가 섞여 있으면 그림을 잘못 눌러 다른 날 영상을 보며 오늘 판독을 쓸 수 있습니다. 그래서 단추를 눌러야 함께 나오고, 비교 중에는 6번 줄이 보입니다.
- **비교 목록에 넣지 않는 것**: 취소된 검사, 영상이 아직 안 온 검사, 환자 번호 경고(빨강·노랑)가 붙은 검사. 이런 검사는 자기 줄에서만 열립니다 — 영상 프로그램 안에서는 경고를 보여 줄 수 없어서, 다른 환자 것일 수 있는 영상을 경고 없이 나란히 놓지 않으려는 것. (영상 프로그램의 `?patient=` 보기는 그 번호가 적힌 영상을 **가리지 않고 전부** 보여 주므로 EMR은 쓰지 않습니다.)
- 다른 검사는 한 번에 최대 9건(최근 것부터).
- **창이 두 칸으로 열리고 한쪽이 「[ drop a series here ]」로 비어 있는 것**: 영상 프로그램이 마지막으로 고른 화면 나누기를 기억하기 때문입니다(4번). 한 칸으로 되돌리려면 **▦** 단추에서 한 칸짜리를 고릅니다.
- 1366×768에서: 판독 칸이 펴져 있으면 영상 프로그램의 도구 줄이 좁아져 **▦ 단추가 Orthanc 글자 밑에 겹쳐** 잘 안 보입니다. 비교를 시작하면 판독 칸이 접히므로 보입니다. 접은 상태에서 두 칸으로 나누면 영상 하나가 약 469×550입니다.

### 2.4 환자의 영상 검사 한눈에 보기

> **단추 이름 (2026-10-01, 실장님 결정·총괄 `b828129`)**: 이 목록을 여는 단추와 창 제목은 **🩻 Imagerie (영상/판독)** 입니다(공용 키 `imagingList` — fr «Imagerie» · ko 「영상/판독」 · en "Imaging"). 병원의 PACS 단추처럼 「그 환자가 찍은 것들의 목록」으로 읽히게 하려는 것. 전에는 «Compte-rendu (판독소견)»였음. **영상 창 오른쪽의 판독 칸**은 그대로 **🩻 Compte-rendu (판독소견)**(키 `reading`) — 둘은 다른 것입니다. 이 위키의 아래 절들에서 「판독 목록」이라고 쓴 것은 이 **Imagerie** 목록을 뜻합니다. 영상 서버의 모든 영상을 보여 주는 목록은 EMR에 만들지 않음(Orthanc 관리 화면으로).

- **Consultation (진료)** 화면 위쪽의 **🩻 Imagerie (영상/판독)** 버튼 → 이 환자의 모든 영상 검사가 최근 것부터 나옵니다. 줄마다 날짜 · 종류(US, CR …) · 검사 이름 · 판독 내용이 보이고, **🖼 Voir image (영상보기)** 를 누르면 2.3의 영상 창이 **목록 위에** 열립니다.
- **영상 창을 닫으면 목록이 그대로 남아 있습니다**(2026-10-01, 실장님 — 전에는 진료 화면으로 돌아가서, 여러 영상을 이어 보려면 단추를 또 눌러야 했음). 보던 자리(스크롤)도 그대로라 바로 다음 검사의 **Voir image**를 누르면 됩니다. 영상 창에서 방금 저장한 판독도 목록의 그 줄에 바로 보입니다. 처방 표의 **🖼**로 연 영상 창은 전처럼 진료 화면으로 닫힙니다.
- 검사 이름 옆에 영상이 왔는지 나옵니다.
  - **N image(s) reçue(s) (영상 N장 도착)** — 초록. 영상이 모두 들어왔습니다.
  - **Images en attente (영상 대기 중)** — 회색. 아직 안 왔습니다(2.5 참고).
  - 아무것도 없으면 워크리스트로 보내지 않는 검사입니다.
- 영상 검사가 하나도 없으면 **Aucune imagerie (영상검사 내역이 없습니다)**, 판독이 없으면 **Aucun compte-rendu (판독 소견 없음)** 이 나옵니다.
- **취소된 영상 검사**는 흐리게, 검사 이름에 줄이 그어지고 **Annulé (취소됨)** 이 붙습니다. 그 아래 *Annulé · 날짜 — Motif : 이유* 한 줄. 영상 도착 표시·환자 번호 경고·판독은 **그대로 보이고**, **🖼 Voir image (영상보기)** 로 영상도 볼 수 있습니다(기록이라서). 취소된 검사에는 판독을 새로 저장할 수 없습니다.
- **Paiement (수납)** 화면에도 **🩻 Imagerie (영상/판독)** 버튼이 있습니다. 여기서는 **읽기만** 할 수 있고 영상 창은 열리지 않습니다.
- 목록은 **영상 창을 닫을 때마다** 조용히 다시 읽습니다(「Loading…」 없이, 자리 그대로). 그 밖에는 저절로 바뀌지 않으니, 영상이 도착했는지 다시 보려면 목록을 닫고 다시 여세요.

### 2.5 영상이 안 보일 때 — 순서대로

1. **🩻 Imagerie (영상/판독)** 목록에서 그 검사 옆 글자를 봅니다.
2. **Images en attente (영상 대기 중)** 이면 영상이 아직 PACS에 안 왔습니다. 이때 **🖼 Voir image**를 누르면 빈 영상 창 대신 **Les images de cette demande ne sont pas encore arrivées… (이 검사의 영상이 아직 오지 않았습니다)** 안내가 나옵니다. 판독은 오른쪽 칸에 먼저 써도 됩니다.
   1. 방사선사가 전송한 지 **2분이 안 됐으면** 기다렸다가 목록을 닫고 다시 엽니다. 전송이 끝나고 1분쯤 새 영상이 없어야 「도착」으로 바뀝니다.
   2. 몇 분이 지나도 그대로면 방사선사에게 묻습니다 — 전송했는지, **워크리스트에서 이 환자를 골라** 찍었는지. 환자 이름을 장비에 손으로 쳐서 찍었으면 이 검사와 연결되지 않습니다. 관리자에게 알립니다(연결하는 기능은 아직 없음, 7절 P-4).
   3. 방사선사가 제대로 보냈다고 하면 관리자(실장님)에게 알립니다.
3. **N image(s) reçue(s) (영상 N장 도착)** 인데 영상 창에 영상이 안 나오면:
   1. 창 안에 **Le serveur d'images n'est pas encore relié à ce dossier… (영상 서버가 EMR과 아직 짝이 맞지 않았습니다)** 가 보이면 관리자에게 알립니다. 관리자는 PACS 폴더에서 `pair-with-emr.ps1` 을 실행합니다(6.1). EMR 백업을 되살린 뒤에도 이렇게 됩니다. 그동안에도 판독은 쓸 수 있습니다.
   2. **Le serveur d'images ne répond pas (영상 서버가 응답하지 않습니다)** 가 보이면 PACS 서버가 꺼졌거나 멈춘 것입니다. 관리자에게 알립니다(관리자는 서버 상태 창의 **Imagerie (PACS)** 줄을 봅니다).
   3. **La session d'affichage a expiré (영상 보기 시간이 끝났습니다)** 이면 창을 닫고 **🖼** 로 다시 엽니다.
   - **L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas (EMR에는 도착했다고 적혀 있는데 영상 서버에 없습니다)** 가 보이면 관리자에게 알립니다. 영상 서버를 새로 깔았거나 영상 백업을 아직 되살리지 않은 경우입니다(6.2의 영상 복원).
   4. 영상 목록(왼쪽 작은 그림)은 보이는데 가운데 칸만 까맣다면, 브라우저 창 크기를 한 번 바꾸거나 **Ouvrir dans un onglet ↗ (새 탭에서 열기)** 로 엽니다. 그래도 까맣다면 관리자에게 알립니다.
   5. 아이디·비밀번호를 묻는 창이 뜨면 정상이 아닙니다. 아무것도 넣지 말고 관리자에게 알립니다.
4. 목록에 도착 여부가 아예 나오지 않으면 워크리스트로 보내지 않는 검사입니다. 설정에서 그 검사 코드를 확인해야 합니다 — 관리자에게 알립니다.

### 2.6 환자 번호 경고가 떴을 때 — 순서대로

**🩻 Imagerie (영상/판독)** 목록과 **🖼 Visionneuse (영상 뷰어)** 창 위쪽에 이런 경고가 보일 수 있습니다.

- 🟥 빨강 — *Les images sont au nom de « 26-00012 RAKOTO Jean », qui ne correspond pas au numéro de dossier de ce patient… (영상에 적힌 환자는 「26-00012 RAKOTO Jean」으로, 이 환자의 차트번호와 다릅니다…)* — 영상 속 환자번호가 이 환자의 차트번호와 다릅니다.
- 🟧 노랑 — *Les images ne portent aucun numéro de patient… (영상에 환자번호가 없습니다…)* — 영상에 환자번호가 없습니다.

둘 다 **장비에서 환자 정보를 손으로 치거나 고친 영상**일 때 생깁니다. 다른 환자의 영상일 수 있습니다.

1. **아직 판독을 쓰지 마세요.**
2. **🖼 Voir image (영상보기)** 로 영상을 열고, 영상 위에 적힌 환자 이름·번호·촬영 날짜를 봅니다.
3. 방사선사에게 경고에 나온 번호·이름을 알려 주고, 누구를 찍은 영상인지 확인합니다.
4. **이 환자의 영상이 맞으면**(번호만 잘못 쳤으면) 판독을 써도 됩니다. 판독에 「영상의 환자번호 오기 확인함」처럼 한 줄 남겨 두면 나중에 보는 사람이 압니다. 경고는 계속 보입니다.
5. **다른 환자의 영상이면** 판독을 쓰지 말고:
   1. **Consultation (진료)** 오더 목록에서 이 검사를 **「취소됨」으로 표시**합니다(2.1 ④). **Motif (이유)** 에 「영상이 다른 환자(경고에 나온 번호)의 것」이라고 적습니다. 청구에서 빠지고, 잘못 붙은 영상은 경고와 함께 기록으로 남습니다.
   2. 이 환자에게 영상이 필요하면 **새로 검사를 냅니다** → 방사선사가 워크리스트에서 **이 환자를 골라** 다시 찍습니다. 다시 찍을지는 의사가 판단합니다.
   3. 관리자(실장님)에게 알립니다. 그 영상을 실제 주인의 기록으로 옮기는 기능은 아직 없습니다.

> **이 경고가 없다고 해서 반드시 맞는 환자의 영상은 아닙니다.** 방사선사가 워크리스트에서 **다른 환자를 골라** 찍었으면, 그 영상에는 고른 환자의 정보가 그대로 들어가 경고가 뜨지 않습니다. 영상 속 환자와 눈앞의 환자가 다르다고 느껴지면 2.6의 순서대로 확인하세요.
>
> **취소한 검사에 나중에 영상이 들어와도 판독 목록에는 「영상 도착」이 뜨지 않습니다.** 방사선사가 취소 전에 장비에서 이미 그 환자를 골라 두고 찍은 경우입니다. 영상은 영상 서버에 들어가 있어서 **🖼 Voir image (영상보기)** 로 열면 보입니다 — 취소한 검사라도 영상이 있는지 알고 싶으면 영상 창을 열어 보세요.

### 2.7 영상 백업 경고가 떴을 때

EMR 상태 화면(또는 서버 상태 창)에 영상 백업 경고가 보이면:

1. **서버 PC에 영상 백업용 외장 디스크가 꽂혀 있는지** 봅니다. 빠져 있으면 다시 꽂습니다. 다음 밤에 빠진 날 것까지 복사됩니다.
2. 「가득 참(full)」이면 관리자(실장님)에게 알립니다 — 디스크를 바꾸거나 새로 준비해야 합니다.
3. 그 밖의 경고(실패, 오래 안 됨)도 관리자에게 알립니다. 영상 서버와 진료는 그대로 쓸 수 있습니다 — 백업만 멈춘 것입니다.
4. 영상 백업 디스크에는 **환자 영상과 EMR 데이터베이스 백업(모든 환자 기록)이 암호화 없이 그대로 들어 있습니다.** 서버 옆 잠기는 곳에 두고, 빌려주거나 다른 일에 쓰지 마세요.

## 3. 기능 상세

### 3.1 전체 흐름

```
 ① 진료: 영상 오더 저장            POST /api/consultations/:id/orders  (consult.routes.js — 진료 세션 파일)
      │  order_code.worklist_enabled && pacs_modality 이면
      │  worklist_log 1줄 생성: accession_no, study_instance_uid, scheduled_date=CURRENT_DATE
      │  order_item.worklist_status = 'sent'
      ▼
 ② 브리지(15초마다)                 GET /api/pacs/worklist-feed?format=json   (헤더 X-Bridge-Token)
      │  오늘 + status='scheduled' 인 worklist_log 전부
      │  줄마다 /worklists/<accession>.wl 파일을 씀, 목록에 없는 .wl 은 지움
      ▼
 ③ Orthanc 워크리스트 플러그인       /var/lib/orthanc/worklists (브리지와 같은 폴더를 마운트)
      │  장비가 C-FIND(MWL) 로 조회하면 .wl 내용을 돌려줌
      ▼
 ④ 장비 촬영 → C-STORE → Orthanc   (포트 4242, AE Title MEDCONNECT)
      │  장비가 워크리스트의 StudyInstanceUID · AccessionNumber 를 영상에 그대로 넣는 것이 전제
      ▼
 ⑤ 브리지(같은 바퀴에서)             Orthanc POST /tools/find {StudyInstanceUID} → IsStable 이면
      │                                POST /api/pacs/study-arrived  (헤더 X-Bridge-Token)
      │  EMR: 영상 속 PatientID 와 chart_no 비교 → patient_check, worklist_log.status='completed',
      │       order_item.worklist_status='completed'  → 다음 바퀴 피드에서 빠짐 → .wl 삭제
      ▼
 ⑥ EMR에서 보기                     GET /api/pacs/viewer-url?order_item_id=…
      │  → <pacs_viewer_url>/stone-webviewer/index.html?study=<study_instance_uid>
      │  진료 화면이 이 주소를 iframe 으로 띄움 (브라우저가 Orthanc 에 직접 접속)
      ▼
 ⑦ 판독 저장                        PUT /api/pacs/reading/:orderItemId  → order_item.result_text
```

**영상과 오더를 잇는 것은 StudyInstanceUID 하나뿐입니다.** 영상이 왔는지·환자번호가 맞는지는 브리지가 Orthanc에 물어 EMR에 알려 줍니다(⑤, 2026-09-29부터). EMR 백엔드가 Orthanc에 직접 묻지는 않습니다. 장비가 UID를 새로 만들면 여전히 연결되지 않습니다(7절 P-4).

### 3.2 번호 만드는 법 (`consult.routes.js` POST `/:id/orders`)

- **AccessionNumber** = `YYMMDD-<order_item.id>` (예: `260627-35`). DICOM SH 16자 이내. order_item.id가 전역 유일이라 겹치지 않습니다.
- **StudyInstanceUID** = `1.2.826.0.1.3680043.<YYYYMMDD>.<order_item.id>.<0~9999 난수>`. 루트 `1.2.826.0.1.3680043`은 Medical Connections(pydicom 기본)의 루트를 빌려 쓴 것입니다(7절 P-14).
- **PatientID** = `patient.chart_no` (예: `26-00001`). **PatientName** = `성^이름` (`last_name^first_name`).
- `station_ae`는 일부러 비웁니다 — 같은 초음파 오더를 여러 방이 나눠 받기 때문(코드 주석). 그래서 `.wl`에는 `ScheduledStationAETitle = "ANY"`가 들어갑니다.
- 설정의 **자동 워크리스트 생성**(`pacs_config.auto_create_worklist`)을 끄면 worklist_log를 만들지 않습니다.

### 3.3 브리지가 하는 일 (`bridge/bridge.py`)

`main()`이 무한 반복합니다. 한 바퀴:

1. `sync()` — `EMR_FEED_URL`에 `GET ?format=json`, 토큰은 **`X-Bridge-Token` 헤더**로 (timeout 10초). URL에 넣으면 EMR 접속 기록(morgan)에 15초마다 토큰이 찍혔기 때문입니다. 실패(연결 불가, 401, 500)면 예외 → 이번 바퀴는 **파일을 건드리지 않고** 끝납니다. 401이면 로그에 「EMR refused the bridge token (…)」과 어느 쪽을 맞춰야 하는지 씁니다.
   - 시작할 때 `BRIDGE_TOKEN`이 비었거나 16자 미만이거나 옛 기본값이면 경고를 한 줄 찍고 그대로 돕니다(재시작 반복으로 경고가 묻히지 않게).
   - **EMR이 아닌 것이 답하면**(2026-09-30, 클린 설치 때 실제로 겪음 — PikPak `DownloadServer.exe`가 `127.0.0.1:9080`에서 「480 Wrong parameters for url」): EMR 피드가 내지 않는 상태 코드(200·401·403·500·502 밖), JSON이 아닌 답, `rows` 없는 JSON이면 로그에 「Something other than the EMR answered at … (unexpected status, HTTP 480, text/plain). Another program on the server PC may be using the EMR's port … run check-windows-ports.ps1 …」. 하트비트는 EMR에 닿지 못하므로 **로그와 healthcheck**로 알림.
2. 받은 줄마다 `accession_no`(없으면 `study_instance_uid`)를 파일 이름으로 `write_wl()` — `<이름>.wl.tmp`에 쓰고 `os.replace`로 바꿔 끼웁니다. Orthanc가 반쯤 쓴 파일을 읽지 않게 하려는 것.
   - 한 줄이 변환에 실패해도 그 줄만 건너뛰고(이전 좋은 `.wl`은 남김) 나머지는 계속합니다 (v1.0.0에서 고친 것).
3. 이번 목록에 없는 `.wl` 파일은 **지웁니다** — 촬영 완료·취소·오더 삭제·날짜 지남.
   - 이어서 `report_arrivals(rows)` — 받은 줄마다 Orthanc에 `POST /tools/find`(Level Study, StudyInstanceUID, Expand)로 묻고(**못 찾으면 그 줄의 AccessionNumber로 한 번 더** — 장비가 UID를 새로 만든 경우(P-4). 그 accession을 가진 스터디가 **정확히 하나**일 때만 씀, 둘 이상이면 연결하지 않고 로그 한 줄), 찾은 스터디가 **`IsStable`** 이면 `/studies/<id>/statistics`로 장수(`CountInstances`)를 얻어 EMR `POST /api/pacs/study-arrived`로 보냅니다(worklist_id, study_instance_uid, orthanc_study_id, 영상 속 PatientID·PatientName, instances).
   - **왜 Stable까지 기다리나**: 첫 장이 들어오자마자 알리면, 여러 장짜리 검사를 보내는 중에 워크리스트에서 빠집니다. Orthanc는 `StableAge`(기본 60초) 동안 새 영상이 없으면 Stable로 봅니다 → 보통 전송 후 **60~75초**에 완료 처리, 그다음 바퀴(15초)에 `.wl` 삭제.
   - **왜 브리지가 묻나**: 브리지는 Orthanc와 같은 compose 네트워크에 있고 EMR 토큰도 이미 가지고 있습니다. EMR이 직접 물으려면 EMR에 Orthanc 주소·비밀번호 설정이 새로 필요하고, `pacs_viewer_url`은 브라우저 기준 주소라 EMR 컨테이너에서 쓸 수 없습니다.
   - Orthanc에 못 닿으면(꺼짐·비밀번호 틀림) 그 바퀴는 한 줄만 로그를 남기고 넘어갑니다 — 워크리스트 동기화는 계속됩니다. Orthanc 이름을 못 찾으면 한 바퀴가 약 4초 늦어짐(격리 시험에서 잰 값) — heartbeat 한계 60초 안.
   - `ORTHANC_PASSWORD`가 없으면 이 단계는 꺼지고 시작 때 한 줄 경고.
   - 이 단계가 안 되면 그 이유를 전역 `arrivals_error`에 담아 **다음 heartbeat에 같이 보냅니다**(정상이면 빈 값). EMR 상태 화면이 이것을 노랑 「status.bridge.arrivals」로 보여줌(설정 세션 `status.routes.js`, 필드 이름은 두 세션이 맞춤).
   - EMR로 보내거나 로그에 쓰는 오류 글자는 모두 `scrub()`을 거칩니다 — 주소 속 `user:pass@`, 토큰, Orthanc 비밀번호를 `***`로. 그 글자가 상태 화면에 그대로 뜨기 때문.
   - EMR이 옛 버전이라 `/study-arrived`가 없으면(EMR 공통 404 `API route not found`) 재시작 전까지 묻지 않고 한 줄만 남깁니다.
4. `report()` — `/worklists/.heartbeat`에 현재 시각을 쓰고(컨테이너 healthcheck용; **피드가 제대로 답한 바퀴에는 `/worklists/.feed_ok`도** — 2026-09-30), `POST /api/pacs/bridge-heartbeat`로 결과(synced, failed, error, poll_seconds)를 보냅니다. 둘 다 실패해도 반복은 멈추지 않습니다.
5. `POLL_SECONDS`(기본 15초) 잠듭니다.

매 바퀴 **모든 `.wl`을 새로 씁니다**(내용이 같아도). `.wl`의 MediaStorageSOPInstanceUID는 바퀴마다 새로 만들어집니다.

### 3.4 끊겼을 때

| 상황 | 장비에 보이는 것 | 누가 알 수 있나 |
|---|---|---|
| EMR이 멈춤 / 브리지가 EMR에 못 닿음 | **마지막으로 쓴 `.wl`이 그대로 남음.** 새 오더는 안 들어오고, 끝난·취소된 오더도 안 빠짐. 자정이 지나도 어제 목록이 남음 | 브리지 로그 `bridge error:`, EMR 상태 화면 「보고 없음」(60초 이상) |
| 토큰 불일치·토큰 미설정 (401) | 위와 같음 | EMR 상태 화면 — 브리지가 heartbeat도 같은 토큰으로 보내므로 **EMR에는 신호가 아예 안 옴** → 「보고 없음」. 브리지 로그에 원인(「EMR에 토큰 미설정」 / 「토큰 불일치」)이 나옴 |
| 브리지 컨테이너가 멈춤·먹통 | 위와 같음 | 컨테이너 healthcheck(`.heartbeat` 60초), `server-status` 창, EMR 상태 화면 |
| Orthanc가 멈춤 | 워크리스트 조회·전송 모두 실패 (장비 쪽 오류) | Orthanc healthcheck(`/system` 200/401), EMR 상태 화면의 PACS TCP 검사 |
| 브리지가 Orthanc에 못 물음 (비밀번호 틀림 등) | 워크리스트는 정상, **끝난 환자가 빠지지 않음**(예전 동작) | 브리지 로그 `could not ask Orthanc about studies`, EMR 상태 화면 장비 워크리스트 줄 **노랑**(heartbeat `arrivals_error`, 2026-09-29부터) |
| **호스트 포트가 안 잡힘** (Windows 예약 포트) | 장비가 4242에 연결 못 함, 뷰어가 안 열림 | **컨테이너 healthcheck는 「healthy」로 나옴** — 컨테이너 안에서만 확인하기 때문. EMR 상태 화면의 PACS 검사(설정된 Host:4242로 TCP)만 잡아냄 (7절 P-1) |

EMR 상태 화면 판정(`status.routes.js` `checkBridge`, 설정 세션 파일): heartbeat가 한 번도 없으면 「꺼짐」, 60초 넘게 없으면 「보고 없음」, `ok=false`면 「실패 중」, `failed>0`이면 「일부 실패」.

## 4. 데이터 · API

### 화면

- `frontend/src/components/RadiologyReadings.jsx` — 환자의 영상 검사·판독 목록(읽기 전용). `props.patientId`, `props.onOpen(orderItemId)`가 있으면 「영상보기」 버튼 표시. **`props.reload`**(숫자, 2026-10-01 총괄 `71dedec`): 화면이 이 값을 올리면 목록을 다시 읽음 — 같은 환자면 「Loading…」을 띄우지 않고(자리·스크롤 유지), 읽기에 실패해도 있던 목록을 지우지 않음. 진료 화면은 목록의 `onOpen`에서 목록을 닫지 않고(영상 창 z 1001이 목록 z 1000 위), 영상 창이 닫힐 때(`viewer`가 비고 목록이 열려 있으면) `readingsReload`를 올림. 수납 화면은 `reload`를 주지 않음(영상 창이 없음). 진료·수납 화면의 「🩻 Imagerie (영상/판독)」 창(키 `imagingList`, 2026-10-01 전에는 「🩻 판독소견」) 안에 들어갑니다. **체크 칸**(2026-10-01): `props.picked`(오더 번호 배열)·`props.onPick(배열)`을 주면 줄마다 체크 칸 — 화면이 상태를 가짐(진료 화면은 목록을 닫을 때 비움). 체크할 수 있는지는 `compareBlock(r, t)`(취소 · 영상 없음 · `patient_check ≠ match`면 이유 글, 아니면 빈 글 — 서버와 같은 규칙), 최대 9건. 목록이 다시 읽힌 뒤 체크할 수 없게 된 줄은 체크에서 빠짐. 같은 파일의 `CompareChecked({ids, t, onGo, style})` = 목록 창 머리의 「⇆ Comparer (N)」 단추(둘 이상일 때 켜짐). 수납 화면은 이 prop을 주지 않음.
  - 같은 파일에서 **`PatientCheck({images, t, style})`** 와 **`imagesOfRow(row)`** 도 export합니다. `images`는 `viewer-url` 응답의 `images` 모양(`{patient_check, patient_id, patient_name}`, 도착 전에는 `null`)으로 통일했고, 판독 목록의 줄은 `imagesOfRow`로 그 모양으로 바꿔 넘깁니다. `style`은 바깥 상자(여백)만 덮어씀. 진료 화면의 뷰어 창이 이것을 가져다 쓰면 경고 모양·문구가 한 곳에서 관리됩니다.
- 영상 뷰어 창(iframe + 판독 입력)과 🖼 버튼은 **`frontend/src/pages/Consultation.jsx` 안**에 있습니다(`openViewer`, `saveReading`, 약 51~66줄, 692~716줄) — **진료 세션 파일**이라 PACS 세션이 직접 고치지 않습니다. iframe `src`와 「새 탭에서 열기」는 `viewer-url`의 `url`(EMR 자신의 상대 주소 `/api/pacs/viewer/…`)을 그대로 씀 — P-9 뒤에도 진료 파일은 바뀐 것 없음.
- 설정 → 오더 연동(Order Feed) 탭 — `Settings.jsx` 약 476~515줄, `savePacs`·`testPacs`.

### 서버 — `backend/src/routes/pacs.routes.js` (`/api/pacs`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /config` | `settings` 권한 | `pacs_config` 한 줄 — bridge_token 포함이라 설정 권한만 (2026-09-29부터, P-5). **`orthanc_password`는 빼고** `orthanc_password_set`(참/거짓)만 (`publicConfig`, P-9) |
| `PUT /config` | `settings` 권한 | 설정 저장. **보내지 않은 칸은 그대로 둠**(`COALESCE`, 2026-09-29부터 — 전에는 NULL이 되어 일부만 저장하면 브리지 토큰이 지워질 수 있었음). 포트가 숫자가 아니면 4242. `orthanc_url`은 저장, **`orthanc_password`는 화면에서 받지 않음**(보내도 무시 — `pair-with-emr`만 씀). 답도 `publicConfig`. **먼저 검사(400)**: 글자 칸이 DB 칸 길이를 넘으면 `<칸> is too long (at most N characters)`, 포트가 1~65535 정수가 아니면 `DICOM port must be a whole number from 1 to 65535`. DB 오류는 로그에만 남기고 화면에는 `Could not save the order feed settings`(500) |
| `GET /test` | `settings` 권한 | `worklist_scp_host:port`로 TCP 연결 시험 (`utils/tcpCheck.js`). Host가 비었으면 시험하지 않고 `No PACS host set`(전에는 EMR 컨테이너 자신을 시험). **`?target=orthanc`**(2026-09-30): 영상 중계가 쓰는 길 — `orthanc_url`(없으면 기본) + 저장된 비밀번호로 Orthanc `GET /system`(`services/pacs-probe.js`) → `{url, state, version?, code?}` |
| (`PUT /config`의 답에) | | **`orthanc_check`** — 저장한 `orthanc_url`(없으면 기본)로 연 검사 결과 `{url, state, version?, code?}`. 저장은 결과와 관계없이 됨. 검사는 **설정 세션의 `services/pacs-probe.js` `probeOrthanc` 하나** — 상태 줄 `pacs_relay`(「Visionneuse → serveur d'images」)와 같은 함수·같은 답. `state`: `ok`(`version`) / `refused` / `unknownHost` / `timeout` / `unauthorized` / `notOrthanc`(`code`) / `badAddress`. 화면(`Settings.jsx` `pxRelayCheck`)은 상태 점의 문장 `se_sys_pacsRelay_<state>`를 그대로 써서 두 곳이 같은 말을 함(2026-09-30 합침 — 그 전에는 PACS 세션의 두 번째 검사가 `pacs.viewer.js`에 있었음). 기본 주소도 그 파일의 `DEFAULT_URL` 하나(중계도 씀) |

**오더 연동 탭의 오류 문구** (2026-09-29): 위 서버 문구(`pacs.routes.js` `CONFIG_MSG`·`configProblem`)와 `tcpCheck`의 문구(`TCP connection succeeded`, `Connection timed out`, Node의 `ECONNREFUSED`·`ENOTFOUND`·`EHOSTUNREACH`…)를 `Settings.jsx` `pxMessage`가 `px_err*`·`px_test*` 문구로 바꿈 — **서버 문구를 바꾸면 거기도**. 모르는 글자는 설정 세션의 `seMessage`로 넘기고, 그래도 모르면 그대로 보임. 연결 시험 줄에는 시험한 `호스트:포트`를 괄호로 붙임. 전에는 DB 원문(`value too long for type character varying(50)`)이나 `connect ECONNREFUSED …`가 그대로 보였고, 70000 같은 포트가 저장된 뒤 연결 시험이 500으로 깨졌음.
| `GET /viewer-url?order_item_id=` | `consultation` 권한 (수납 화면의 판독 목록에는 영상 버튼이 없음) | 뷰어 주소 + 오더 이름 + 판독 + **`images`**(아래). `url` = **`/api/pacs/viewer/stone-webviewer/index.html?study=<UID>`**(상대 주소, P-9) + 그 스터디를 여는 **뷰어 쿠키**(아래 중계). **2026-10-01 비교**: `url`은 전처럼 연 검사 하나(`?study=<연 검사>`). 그 환자의 다른 검사가 있으면 쿠키가 그것들도 열고, 응답에 `compare: {count, url, opened, prev, others}` — `url` = `…/index.html?study=<연 검사>,<다른 검사>,…`(Stone의 공식 파라미터 — 그 환자의 허락된 검사를 한 창에, 연 검사가 맨 앞), `opened` = `{order_name, visit_date}`(판독 칸의 주인), `prev`·`others[]` = `{order_name, modality, visit_date, same_exam}`(`prev`는 같은 검사의 바로 전 것 — 단추 옆에 이름만 보여 줌). 화면(`ViewerCompare`)은 영상 창 주소를 `url`과 연 검사 하나짜리 주소 사이에서 바꾸기만 함. 응답 맨 위에 `visit_date`(연 오더의 방문 날짜)도 있음. 고르는 규칙(`comparableStudies`·`previousAlike`): 같은 환자의 영상 오더 중 **취소 아님 · `images_received_at` 있음 · `patient_check = 'match'`** 인 것(검사 번호는 `image_study_uid` 우선), 방문 날짜·오더 번호 내림차순, 최대 9건. 권하는 검사 = 같은 오더 코드의 바로 전 것 → 없으면 같은 코드의 바로 뒤 것 → 같은 modality+부위의 전 것 → 뒤 것 → 없음. 목록을 읽지 못하면 연 검사 하나만(영상 창을 막지 않음). **`?order_item_ids=a,b,c`**(2026-10-01, 목록에서 체크한 검사를 함께 열기): 2~9개의 서로 다른 영상 오더, **한 환자의 것**이어야 하고 **하나하나가 비교에 허락되는 검사**(취소 아님 · 도착 · `match`)여야 함 — 아니면 409 `These exams cannot be compared together`, 쿠키도 주지 않음. 「연 검사」 = 그 가운데 가장 최근(방문 날짜, 오더 번호) — 응답의 `order_item_id`·`reading`·`order_name`이 그 검사의 것, `picked: true`, `compare.url` = 체크한 검사들만, 쿠키도 그 검사들만. 보일 스터디(UID)가 없으면 **`url`은 빈 값, `no_study: true`**, 쿠키 없음. `has_viewer`는 이제 늘 `true`. 전에는 뷰어 첫 화면(모든 환자 목록)을 돌려줬음(P-18). **`?study=<UID>`로 여는 길은 없앰** — 쿠키가 생긴 뒤로는 아무 스터디나 열 수 있게 되므로, 오더로만 |
| `PUT /reading/:orderItemId` | `consultation` 권한 | `order_item`(code_type='imaging')의 result_text·result_by·result_at 덮어쓰기. 이력 없음. **취소된 오더는 409** `Imaging order was cancelled`(`pacs.cancel.js`의 `ORDER_CANCELLED`) — 조건을 UPDATE 안에 넣어 동시에 들어온 취소를 덮지 않음 |
| `GET /readings/patient/:patientId` | `consultation` 또는 `payment` 권한 | 환자의 영상 오더 전부(취소된 것 포함) + 판독 + 최신 accession/UID + images_received_at·image_count·image_patient_id·image_patient_name·patient_check + `order_status`·`cancelled_at`·`cancel_reason` |
| `GET /worklist-feed?format=json\|csv&date=&modality=&station_ae=` | **브리지 토큰** (`X-Bridge-Token` 헤더, 옛 브리지용으로 `?token=`도 받음) | 브리지용 피드. 기본 날짜 `todayLocal()`, `status='scheduled'`만 |
| `POST /bridge-heartbeat` | 브리지 토큰 (헤더, 본문 `token`, 쿼리 순) | `service_heartbeat`의 `worklist_bridge` 줄을 덮어씀. detail = `{synced, failed, poll_seconds, error(500자), arrivals_error(300자)}` — 이 밖의 칸은 버림 |
| `POST /study-arrived` | 브리지 토큰 | 본문 `{worklist_id, study_instance_uid, orthanc_study_id, patient_id, patient_name, instances, found_by, accession_no, image_study_uid}`. `found_by='accession'`이면 `accession_no`가 그 항목 것과 같고 `image_study_uid`가 있어야 함(아니면 409), 실제 UID를 `image_study_uid`에 저장. 한 트랜잭션에서 worklist_log(`FOR UPDATE`)를 완료 처리하고 영상 정보·`patient_check`를 저장, order_item.worklist_status=`completed`. 400(칸 없음)·404(항목 없음)·409(UID가 그 항목 것이 아님). 다시 보내도 안전(도착 시각은 처음 값 유지). `cancelled`는 그대로 둠 |
| `POST /image-backup-report` | 브리지 토큰(헤더) | 영상 백업(6.2)이 실행마다 보고: `{ok, disk_found, copied, failed, total_files, free_gb, total_gb, error}` — 개수·공간뿐, 환자 정보 없음 → `service_heartbeat`의 `pacs_image_backup`(detail에 `last_success`를 실패한 날에도 이어 둠) |

**취소 정보** (`readings`·`viewer-url`) — `order_status`(`order_item.status`), `cancelled_at`, `cancel_reason`; `viewer-url`은 `cancelled`(참/거짓)도. `cancelled_at`·`cancel_reason`은 진료 세션 마이그레이션이 만드는 칸이라 **`to_jsonb(oi)->>'…'`로 읽음** — 그 칸이 없는 DB에서도 오류 없이 `null`(그래서 이 코드를 진료 마이그레이션보다 먼저 합쳐도 됨). 취소된 오더의 영상도 뷰어로 계속 열림(기록).

**`cancelWorklistForOrder(client, orderItemId)`** — `backend/src/routes/pacs.cancel.js`(PACS 소유). 진료 세션의 취소 API가 영상 오더일 때 **같은 트랜잭션 안에서** 부름. `worklist_log`가 `scheduled`·`in_progress`인 줄만 `cancelled`로, 그런 줄이 있었으면 `order_item.worklist_status='cancelled'`. **이미 `completed`(영상 도착)인 줄은 그대로**(「찍었다」는 사실 기록). 피드가 `scheduled`만 주므로 다음 브리지 바퀴(15초 안)에 `.wl` 삭제 — 브리지 변경 없음. 돌려주는 값 `{worklist_cancelled: n}`. **영상에 켜는 것은 PACS 저장소를 합친 뒤**(그 전에는 EMR이 영상 도착을 모름 — 인계 노트 2026-09-29 의견).

**`images`** (`viewer-url` 응답) — 브리지가 보고하기 전에는 `null`(「아직 안 옴」과 「왔고 맞음」을 구분하려고). 보고 뒤: `{received_at, count, patient_id, patient_name, patient_check}`.

**`patient_check`** — EMR이 정합니다(브리지가 보낸 판정을 믿지 않음). 영상 속 PatientID와 `patient.chart_no`를 앞뒤 공백 빼고 대소문자 무시로 비교: `match` / `mismatch` / `missing`(PatientID 없음). 잡는 것: 장비에서 손으로 치거나 고친 환자 정보. **못 잡는 것: 워크리스트에서 다른 환자를 고른 경우**(영상에 고른 환자의 정보가 그대로 들어감) — 그래서 끝난 환자를 목록에서 빼는 P-7이 짝입니다.

### 서버 — `backend/src/routes/pacs.viewer.js` (`/api/pacs/viewer`, 영상 중계 — P-9 C)

직원 브라우저는 Orthanc(9090)에 직접 가지 않고 **EMR에 영상을 달라고 하고, EMR이 Orthanc에 `admin`으로 들어가 받아 그대로 흘려 줍니다**. 직원은 Orthanc 비밀번호를 모르고, Orthanc 9090은 서버 PC 안(127.0.0.1)에만 엽니다.

- **뷰어 쿠키 `px_viewer`** — `viewer-url`이 줌. 내용 `{u: 직원 id, s: [스터디 UID 최대 12개 — 연 검사 + 같은 환자의 비교 검사], e: 만료}` + HMAC-SHA256 서명. 서명 열쇠는 `JWT_SECRET`에서 갈라 낸 값(`HMAC(JWT_SECRET, 'bethesda-pacs-viewer-cookie-v1')`) — 따로 비밀값을 두지 않음. `HttpOnly; SameSite=Strict; Path=/api/pacs/viewer/; Max-Age=1800`(30분). **오더를 열 때마다 쿠키를 새로 씀**(2026-10-01) — 전에 연 것(다른 환자, 다른 탭)은 더 불러오지 못함. 「이어 붙임(최근 5개)」이라고 적혀 있었으나 브라우저는 이 쿠키를 `/viewer-url`로 보내지 않아(Path) 실제로는 늘 새로 써졌고, 격리 브라우저에서 확인함(환자 1의 검사를 연 뒤 환자 2의 검사를 열면 환자 1 검사는 403). 쿠키 하나가 한 환자의 검사 묶음을 여는 지금은 「한 번에 한 환자」가 맞는 규칙이라 코드도 그렇게 고침.
- **요청마다 검사** (순서대로):
  1. GET·HEAD만(아니면 405).
  2. 경로를 **한 번 풀고**(`decodeURIComponent`) `\`·`%`(이중 인코딩)·NUL·`//`·`.`·`..` 조각이 있으면 400.
  3. 쿠키 서명·만료(아니면 401, `index.html`이면 「영상 보기 시간이 끝났습니다」 안내 쪽).
  3′. `index.html`인데 `?study=`(쉼표로 여럿 — 맨 앞이 연 검사)의 **하나라도** 쿠키의 검사가 아니거나, 맨 앞이 비었거나, 없으면 403 안내 쪽 「Cette image n'a pas été ouverte depuis une demande d'imagerie…」(2026-09-30, 통합 시험 — 전에는 데이터만 403이라 검은 화면에 점 하나).
  4. **허용 목록**: `/stone-webviewer/<파일>`, `/system`(Stone이 부름), `/dicom-web/studies/<UID>[/series/<UID>[/instances/<UID>]][/metadata|/rendered|/thumbnail|/frames/<n,…>[/rendered]]`, 그리고 `/dicom-web/studies|series|instances?0020000D=<UID>`(QIDO — **스터디 UID로 거른 것만**). UID는 쿠키에 있는 것만. 아니면 403(로그에는 UID를 가린 경로 모양만). Orthanc REST(`/patients`, `/tools/find` …)·Explorer 2·걸러지지 않은 목록은 모두 403.
  5. 계정: DB에서 `status='active'`이고 `consultation` 권한이 있어야(30초 캐시) — 아니면 401(페이지면 안내 쪽 「Ce compte ne peut plus ouvrir les images…」).
  6. `pacs_config.orthanc_password`가 없으면 「짝이 맞지 않았습니다」 안내(페이지는 200, 데이터 요청은 **424**).
  7. 영상 창 페이지(`index.html`)이면 그 검사에 **그림이 있는 객체가 하나라도 있는지** Orthanc에 물음(`studyPictures`: `/tools/find` → `/studies/<id>/instances` → 앞의 30개까지 `/instances/<id>/metadata?expand`의 `PixelDataOffset`). 하나도 없으면 Stone 대신 안내 쪽 「Cette demande n'a reçu que des données sans image ({n}) — par exemple un rapport ou des mesures envoyés par l'appareil …」(ko·en, 200). 그림이 섞여 있으면·물을 수 없으면(3초 제한) 보통처럼 Stone. 2026-09-30 — 모르는 영상 종류를 받게 한 뒤 그림 없는 자료만 온 검사가 「Réalisé · 1 image(s) reçue(s)」인데 빈 칸으로 보였기 때문. 격리: 그림 없음만 → 안내, 보통·그림 있는 전용 종류·섞인 검사 → Stone, 더해진 시간 약 20ms.
     - **그 검사가 영상 서버에 아예 없으면**(`/tools/find`가 답했고 0건, 2026-10-01): 빈 Stone 창 대신 안내 쪽. `worklist_log`에 그 번호(`study_instance_uid` 또는 `image_study_uid`)의 `images_received_at`이 **없으면** 「Les images de cette demande ne sont pas encore arrivées. Elles apparaîtront ici quand l'examen aura été fait et envoyé par l'appareil : fermez cette fenêtre et rouvrez-la plus tard. Le compte-rendu peut être saisi à droite.」(`NOT_ARRIVED`), **있으면** 「L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas. Prévenez l'administrateur : elles sont peut-être à restaurer depuis la sauvegarde des images.」(`NOT_THERE` — 목록은 「N image(s) reçue(s)」인데 「아직 안 왔다」고 하면 서로 어긋나므로). 둘 다 ko·en 함께, 200. **물을 수 없으면**(Orthanc가 느림·오류·꺼짐) 전처럼 Stone 쪽으로 가고, 꺼져 있으면 「Le serveur d'images ne répond pas」. 처방 표의 🖼로 열든 목록의 Voir image로 열든 같은 안내(같은 주소). 격리: 영상 없는 오더 → 안내(약 7ms), 장비가 보낸 직후(EMR이 도착을 적기 전)에도 다시 열면 그림, 판독 칸은 그대로 저장됨.
- **Orthanc로 보냄**: `orthanc_url` + 같은 경로·쿼리, `Authorization: Basic admin:<orthanc_password>`, `Accept`만 넘김. 답은 **스트림으로 그대로**(크기 제한 없음). Orthanc의 `Set-Cookie`·`WWW-Authenticate`·연결용 헤더는 버림, `Cache-Control: private, no-store`. Orthanc가 401이면 「짝이 맞지 않았습니다」(비밀번호가 다름 — 다른 PC 백업을 복원한 경우), 연결 안 됨·502~504는 「영상 서버가 응답하지 않습니다」/424. 연결 5초, 전체 120초. 브라우저가 끊으면 Orthanc 요청도 끊음.
- **왜 424·200인가**: nginx `/api/`가 502·503·504를 「API backend is not reachable」로 바꿔 버리므로(`proxy_intercept_errors`) 그 셋을 쓰지 않음.
- **CSP**: EMR 전체는 helmet의 `script-src 'self'`인데, Stone은 WebAssembly와 `new Function`·인라인 스크립트를 씀 → **중계 응답에만** `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'`, `frame-ancestors 'self'`. EMR 화면·다른 API는 그대로 엄격.
- 내보내는 것: `router`(`pacs.routes.js`가 `/viewer`에 붙임), `grantViewerCookie(req, res, uids)`, `_test`(`sign`·`verify`·`cleanPath`·`studyOf` — 시험용).

**브리지 토큰 검사** — `backend/src/routes/pacs.token.js` (PACS 소유, 2026-09-29 새로 만듦). 피드·heartbeat·`/api/worklist`의 `bridgeOrAuth`가 모두 여기를 씁니다.

- `usableBridgeToken(v)` — EMR에 저장된 토큰이 **16자 이상이고 옛 기본값 `change-me-bridge-token`이 아닐 때만** 「설정됨」. 아니면 어떤 토큰이 와도 거절합니다. 기본값이 저장소에 공개돼 있어서, PACS를 연결하지 않은 병원이 로그인 없이 환자 정보를 내주고 있었기 때문(P-2). PACS setup이 만드는 토큰은 48자.
- `presentedToken(req)` — 헤더 `X-Bridge-Token` → 본문 `token` → 쿼리 `token` 순.
- `bridgeTokenMatches(configured, presented)` — `crypto.timingSafeEqual`로 비교.
- 거절 메시지는 둘로 나뉩니다: `Bridge token is not set in the EMR (Settings -> Order Feed)`(EMR 쪽을 고칠 것) / `Invalid bridge token`(PACS `.env`를 고칠 것). 브리지 로그에 그대로 나옵니다.

`ensureConfig()`가 요청마다 `CREATE TABLE IF NOT EXISTS pacs_config` + `ALTER … ADD COLUMN IF NOT EXISTS`를 실행합니다(오래된 DB 호환용, 마이그레이션과 중복).

**권한** (실장님 결정 S2, 2026-09-29): 서버도 화면 권한대로 막습니다. 표의 권한은 **그 API를 부르는 화면**의 권한이고(관리자는 7개 다 있음), 로그인하지 않았으면 401, 권한이 없으면 403. 브리지 토큰으로 들어오는 세 경로(피드·heartbeat·study-arrived)는 로그인과 관계없음. 계정 상태·권한은 요청마다 DB에서 읽으므로(S1) 권한을 빼면 바로 적용됩니다. 간호사 기본 권한(약국·임상병리·접수)으로는 PACS API를 하나도 안 부릅니다.

- **이전 검사와 비교 — Stone을 고치지 않는 방식** (2026-10-01).
  - **지키는 선 (라이선스)**: Orthanc·Stone은 AGPLv3이고 병원은 **공식 배포판 그대로** 씁니다. 중계는 Stone이 내주는 페이지·파일을 **한 바이트도 바꾸지 않고**(격리에서 `index.html`·`app.js`를 Orthanc에서 직접 받은 것과 바이트 단위로 같음을 확인), Stone 안쪽 함수를 부르는 코드를 더하지도 않습니다. 쓰는 것은 **Stone의 공식 주소 파라미터**(`?study=A,B`)와 **Stone 자신의 단추**(화면 나누기 ▦, 끌어다 놓기)뿐. Stone 대신 우리 안내 쪽을 보내는 것(영상 없음 등)은 Stone을 고치는 것이 아님. 고쳐야 할 일이 생기면 먼저 총괄·실장님께 알림.
  - **조사**: Stone의 `app.js`를 읽음 — 주소 파라미터는 `study`(쉼표로 여럿)·`series`·`patient`·`selectedStudies`·`menu`·`token`뿐, `postMessage`는 OsiriX 주석용 하나뿐. 「화면을 나누고 저 검사를 오른쪽에」를 밖에서 시키는 공식 길은 없음 → 나누기와 놓기는 의사가 Stone의 단추로 함(나누기는 Stone이 `localStorage.layout`에 기억하므로 한 번).
  - **화면** (`frontend/src/components/RadiologyReadings.jsx`의 `ViewerCompare`, 진료 화면 `Consultation.jsx`가 영상 창 제목 아래에 놓음): `props.viewer = {order_item_id, base_url, compare}`, `props.onUrl(주소)`. 단추 「⇆ Comparer avec les examens précédents (N)」(=`compare.url`, 그 환자의 허락된 검사 전부 — 실장님이 Stone의 `?patient=` 보기로 해 보신 모양을 EMR이 고른 검사들로), 옆에 「Même examen : …」(`compare.prev`), 비교 중에는 「✕ Fin de la comparaison」(=`base_url`), 「🩻 Le compte-rendu est celui de : …」(`compare.opened` — 어느 검사의 판독인지), 한 줄 안내(`px_compareHint`, 단추의 title에도). 진료 화면은 `onUrl`에서 iframe 주소를 바꾸고 **판독 칸을 접음**(끝내면 폄). 「새 탭에서 열기」는 지금 주소를 쓰므로 비교 중이면 두 검사가 함께 열림.
  - **`?patient=`는 쓰지도, 내주지도 않음**: Stone의 환자 보기는 Orthanc에 「이 환자 번호가 적힌 검사 전부」를 묻는 것이라, EMR이 다른 환자 것으로 표시한 검사·취소한 검사·EMR이 모르는 검사까지 섞임. 페이지 주소에 `patient=`가 있으면 403 안내(그 질의 `studies?00100020=`도 전부터 403).
  - **연 검사가 먼저 뜨게** (`pacs.viewer.js` `openedFirst`): 여러 검사를 한 창에 열면 Stone은 **시리즈 정보(`…/metadata`)를 처음 받은 검사**를 첫 칸에 놓고, 그 정보를 **검사들의 시리즈 목록(`series?0020000D=`)이 돌아온 순서대로** 물음. 어느 검사를 먼저 띄울지 정하는 파라미터는 없음(재 보니 8번에 1번쯤 다른 검사가 먼저). 창 제목·판독 칸이 연 오더의 것이므로 중계가 **답을 내보내는 순서**를 정함: ① 연 검사의 시리즈 목록 → 다른 검사들의 시리즈 목록 ② 모든 목록이 나간 뒤에 연 검사의 `…/metadata`(Stone은 마지막 목록이 와야 검사 목록을 만들고, 그 전에 온 시리즈 정보는 아무것도 열지 못해 첫 칸이 빔) ③ 다른 검사들의 `…/metadata`. 기다림은 단계마다 최대 1.5초. 우리 답의 **시간만** 다룸 — 내용은 그대로. 고친 뒤 격리에서 두 검사 7번·세 검사 21번·여덟 검사 6번 모두 연 검사가 먼저, 세 검사 21번 모두 Stone이 연 검사의 정보를 먼저 물음(보장이 아니라 잰 결과). **2026-10-01 고침**: 처음에는 「다른 검사의 `…/metadata`만 붙잡기」였는데, 세 검사를 함께 열 때 Stone이 다른 검사를 먼저 물으면 1.5초 기다린 뒤 그 검사가 그대로 먼저 떴음(3번에 1번) — 시리즈 목록의 순서부터 잡아야 했음.

### 서버 — `backend/src/routes/worklist.routes.js` (`/api/worklist`)

| 메서드 · 경로 | 인증 | 하는 일 |
|---|---|---|
| `GET /?modality=&station_ae=&date=&status=` | `consultation` 권한 (부르는 화면 없음) | worklist_log + 환자 이름·생년월일. 날짜 기본 `CURRENT_DATE`(DB 시간대) |
| `PUT /:id/status` | 브리지 토큰 **또는** `settings` 권한 로그인 | `scheduled`/`in_progress`/`completed`/`cancelled`만(아니면 400, 없는 항목 404). 한 트랜잭션에서 worklist_log와 order_item을 같이 바꿈 — 이름이 다른 `scheduled`는 order_item에서 `sent`. completed_at은 `completed`일 때만. **지금 부르는 곳이 없음**(영상 도착은 `/api/pacs/study-arrived`) |
| `GET /dicom-mwl?modality=&station_ae=` | 브리지 토큰 또는 `settings` 권한 로그인 | DICOM 태그 이름 모양의 JSON. 옛 외부 브리지용. **지금 쓰는 곳 없음** |

### PACS 저장소 (`C:\Bethesda-PACS-main`)

- `docker-compose.yml` — 프로젝트 이름 `bethesda-pacs` 고정. 컨테이너 `bethesda-pacs`(Orthanc), `bethesda-worklist-bridge`. 볼륨은 **폴더 마운트** `./storage`(영상+색인), `./worklists`(`.wl`, `.heartbeat`).
- `bridge/bridge.py`, `bridge/Dockerfile`(python 3.12-slim, pydicom 2.4.4, requests 2.32.3)
- 시험 도구(장비 없이 확인용, compose 네트워크 안에서 실행): `make_demo.py`·`make_chest5.py`(가짜 영상 올리기, Orthanc REST), `storetest.py`(C-STORE), `q_test.py`(MWL C-FIND). **pynetdicom은 브리지 이미지에 없음** — 따로 설치 필요. `make_*`는 브리지 컨테이너 안에서 돌리며 `ORTHANC_PASSWORD`를 환경 변수에서 읽고, 시험 오더의 `STUDY_UID`·`ACCESSION`·`PATIENT_ID`도 환경 변수로 받음(가짜 환자 `TEST^Patient`).
- `setup.ps1`·`setup.sh`(`-Offline`/`--offline`), `start.bat`

### 브리지 환경 변수

| 이름 | 기본값 (compose) | 뜻 |
|---|---|---|
| `EMR_FEED_URL` | `http://host.docker.internal:9080/api/pacs/worklist-feed` | EMR 피드. heartbeat 주소는 여기서 `/worklist-feed`→`/bridge-heartbeat`로 바꿔 만듦 |
| `BRIDGE_TOKEN` | `.env`에서 (setup이 48자 무작위 생성). **기본값 없음** — 2026-09-29 전에는 `change-me-bridge-token` | EMR 설정의 Bridge Token과 같아야 함. 헤더로 보냄 |
| `ORTHANC_URL` | `http://orthanc:8042` | 영상 도착 확인용 (같은 compose 네트워크의 서비스 이름) |
| `ORTHANC_USER` · `ORTHANC_PASSWORD` | `admin` · `.env`의 `ORTHANC_PASSWORD` | 비밀번호가 없으면 도착 확인을 끔 |
| `WL_DIR` | `/worklists` | `.wl`을 쓰는 곳 |
| `POLL_SECONDS` | `15` | 주기 |

### Orthanc 설정 (compose 환경 변수)

`ORTHANC__DICOM_AET=MEDCONNECT`, `DICOM_CHECK_CALLED_AET=false`, `REMOTE_ACCESS_ALLOWED=true`, `DICOM_ALWAYS_ALLOW_FIND_WORKLIST / FIND / STORE / ECHO = true`(장비 등록 없이 받음), `AUTHENTICATION_ENABLED=true`, 사용자 `admin` 하나(비밀번호 `.env`의 `ORTHANC_PASSWORD`), 워크리스트 플러그인(`/var/lib/orthanc/worklists`), DICOMweb, Stone Web Viewer(**`STONE_WEB_VIEWER__SHOW_INFO_PANEL_AT_STARTUP=Never`** — 시작 안내 상자를 닫으면 영상 칸이 까맣게 남는 Stone 문제 때문, 「Not for diagnostic usage」는 왼쪽에 계속 보임), Orthanc Explorer 2. 포트 **`127.0.0.1:9090→8042`**(웹 — P-9 뒤로 서버 PC 안에서만; EMR은 `host.docker.internal:9090`으로 닿음), `4242→4242`(DICOM — 장비용이라 LAN에 열림).

EMR이 쓰는 Orthanc 쪽 주소: **중계(`pacs.viewer.js`)가 넘겨 주는 Stone 파일·DICOMweb**(허용 목록 그대로). 그 밖의 Orthanc REST는 EMR이 부르지 않습니다. 브리지가 부르는 Orthanc REST: `POST /tools/find`, `GET /studies/<id>/statistics`.

### 비밀값 (이름과 의미만)

- **`ORTHANC_PASSWORD`** — PACS `.env`. Orthanc `admin` 비밀번호. 브리지(영상 도착 확인)와 **EMR 중계**가 씁니다. EMR 쪽 사본은 `pacs_config.orthanc_password` — **`pair-with-emr`만 씀**(stdin으로 넘기고 해시로 확인, 화면·명령줄·로그에 안 나옴). 설정 화면·API 응답에는 「설정됨/안 됨」만. 직원은 이 값을 알 필요가 없음(P-9).
- **`BRIDGE_TOKEN`** — PACS `.env`와 EMR `pacs_config.bridge_token`이 **같아야** 합니다(페어링). 오더 피드와 heartbeat의 유일한 인증. 16자 이상, 옛 기본값 불가.

### 공용 부품

- `utils/localDate.js`(`todayLocal`, `dicomDate`)·`utils/tcpCheck.js` — 총괄 관리 공용 파일을 씀. 고치지 않음.
- 브리지 토큰 검사는 공용 `utils/`가 아니라 PACS 소유 `routes/pacs.token.js`에 둠(`worklist.routes.js`도 PACS 파일이라 둘만 씀).

### DB 테이블

| 테이블 | 주요 칸 | 비고 |
|---|---|---|
| `worklist_log` (001) | order_item_id(FK, CASCADE — 007), patient_id, modality, station_ae, body_part, accession_no, study_instance_uid, scheduled_date, scheduled_time, status(`scheduled`/`in_progress`/`completed`/`cancelled`), completed_at. **019(세션 번호 801):** images_received_at, orthanc_study_id, image_count, image_patient_id, image_patient_name, patient_check(`match`/`mismatch`/`missing`). **802:** image_study_uid(장비가 만든 실제 UID — accession으로 찾았을 때만, 아니면 NULL) | 오더 1개에 보통 1줄. `viewer-url`은 `image_study_uid`가 있으면 그것으로 엶. `completed`로 바꾸는 곳은 `POST /study-arrived` |
| `order_item` (001, 진료 소유) | pacs_modality, station_ae, body_part, worklist_status(`pending`/`sent`/…), worklist_sent_at, result_text, result_by, result_at | 판독은 여기 저장 |
| `order_code` (설정 소유) | pacs_modality(US/CR/CT/MR/ES/OT), worklist_enabled, station_ae, body_part | 어떤 오더가 워크리스트로 가는지 정함 |
| `pacs_config` (001, 015, **035**) | worklist_scp_host/port/ae, bridge_token, emr_base_url, pacs_viewer_url(**P-9 뒤 안 씀**), auto_create_worklist, facility_name, notes. **035:** `orthanc_url`(기본 `http://host.docker.internal:9090` — EMR 컨테이너에서 본 Orthanc 웹 주소), `orthanc_password`(비밀값, `pair-with-emr`만 씀, 응답에 안 나옴) | 한 줄(id=1). 015가 옛 한국 데모값(`BROKER`/`192.168.0.222`)을 Orthanc 기본값으로 바꿈. `consult.routes.js`가 `SELECT *`로 읽지만 `auto_create_worklist`만 쓰고 내보내지 않음(확인) |
| `service_heartbeat` (018, 설정과 공유) | name(`worklist_bridge`), last_seen, ok, detail(JSONB) | 현재 상태만, 이력 없음 |

마이그레이션 `007_worklist_cascade.sql`(오더 삭제 시 worklist_log 같이 삭제), `015_pacs_viewer.sql`(pacs_viewer_url 추가·데모값 정리), `018_service_heartbeat.sql`. 셋 다 이미 적용된 파일이라 **고치지 않습니다**. `019_pacs_image_arrival.sql` — PACS 번호대, 칸·CHECK 추가만(기존 줄은 안 바꿈). 합칠 때 총괄이 번호를 다시 매김. `035_pacs_viewer_proxy.sql` — `pacs_config`에 `orthanc_url`·`orthanc_password` 추가만(`ADD COLUMN IF NOT EXISTS`).

## 5. 다른 모듈과의 연결

- **진료** — 영상 오더를 만들고(`consult.routes.js`가 worklist_log 생성), 오더를 지우면 worklist_log도 지움. 영상이 도착해 `worklist_status='completed'`가 되면 진료 화면이 그 오더를 **잠급니다**(삭제 불가 — `Consultation.jsx` `orderLocked`, `consult.routes.js` DELETE의 409). 영상 뷰어 창·🖼 버튼·판독 입력 UI가 `Consultation.jsx` 안에 있음. `consult.routes.js`도 `pacs_config`를 `CREATE TABLE IF NOT EXISTS`로 만드는데, 그 기본값이 옛 데모값(`192.168.0.222`/`10004`/`BROKER`/`Yonsei Shintong Clinic`)입니다 — 테이블이 이미 있으면 영향 없음.
- **수납** — 「🩻 Imagerie (영상/판독)」에서 `RadiologyReadings`를 읽기 전용으로 띄움. 영상 오더 청구는 수납 모듈 몫.
- **설정** — 오더 코드의 Modality·워크리스트 사용 여부, 오더 연동 탭(`/api/pacs/config`). 서버 상태(`status.routes.js` `checkBridge`·`checkPacs`, `server-status.ps1`)가 브리지·PACS를 봄.
- **PatientChart**(수납 소유 공용) — 오더의 worklist_status를 글자로 보여줌.

## 6. 설정 항목

**EMR → 설정 → 오더 연동(Order Feed)** — `settings` 권한

| 화면 칸 | DB 칸 | 뜻 |
|---|---|---|
| Bridge Token | `bridge_token` | PACS `setup`이 출력한 값을 붙여넣음. **가려서 보이고** 「보기/숨기기」 버튼으로 확인. 16자 미만이거나 옛 기본값이면 입력 칸 아래 노란 경고(`px_tokenUnusable`) — 그 상태로는 오더가 장비로 가지 않음. 아래 피드 주소 예시의 토큰도 가려짐 |
| EMR 공개 주소 | `emr_base_url` | 화면에 피드 주소 예시를 보여줄 때만 씀 |
| 자동 워크리스트 생성 | `auto_create_worklist` | 끄면 영상 오더가 워크리스트로 안 감 |
| Host / IP | `worklist_scp_host` | Orthanc DICOM 주소. **EMR 컨테이너에서 본 주소**라 `localhost`는 안 됨 → `host.docker.internal` 또는 서버 LAN IP. 비우면 상태 화면이 PACS를 「꺼짐」으로 봄 |
| DICOM Port | `worklist_scp_port` | 4242 |
| AE Title | `worklist_scp_ae` | MEDCONNECT (화면 표시·피드 `config`에만 쓰임) |
| 영상 서버 주소 — 서버 PC 안 (`px_orthancUrl`: 「Adresse du serveur d'images vue de l'intérieur du PC serveur (ne pas modifier)」) | `orthanc_url` | **EMR 컨테이너에서 본** Orthanc 웹 주소. **다른 PC에서 쓰는 주소가 아님** — 9090은 서버 PC 안(127.0.0.1)에서만 열려 있어 이 PC의 LAN 주소를 넣으면 영상 창이 열리지 않음(2026-09-30 클린 설치 때 실제로 `http://192.168.10.229:9090`으로 바뀌었는데 상태 점은 모두 초록이었음). 보통 그대로 `http://host.docker.internal:9090`. 칸 옆 **「Par défaut」** 단추가 기본값을 넣음, 칸 아래 도움말 `px_orthancUrlHelp`, 저장 뒤 닿지 않으면 빨강 `px_orthancUnreachable` + 이유. **「Tester : visionneuse → serveur d'images」** 단추가 DICOM 시험 옆에(답은 상태 점과 같은 문장, 예: 「✓ Joignable (Orthanc 1.12.11)」). 옛 8090이면 설정 세션의 `se_oldViewerPort` 경고 |
| ✓ 영상 서버 비밀번호 설정됨 / ⚠ 없음 (`px_orthancPasswordSet`·`px_orthancPasswordMissing`) | `orthanc_password` | **입력 칸 없음** — 상태만. ⚠이면 PACS 폴더에서 `pair-with-emr.ps1` |
| PACS 웹/뷰어 주소 — 이제 쓰지 않음 (`px_viewerUrlUnused`) | `pacs_viewer_url` | 흐리게 남겨 둠(옛 백업을 복원해도 깨지지 않게, 총괄 조건 ⑥). 값은 어디에도 안 씀 |

**설정 → 오더 코드** — 영상 검사마다 `Modality`와 `worklist_enabled`를 켜야 워크리스트로 갑니다.

**PACS `.env`** — `ORTHANC_PASSWORD`(Orthanc와 브리지가 같이 씀), `BRIDGE_TOKEN`, (선택) `EMR_FEED_URL`. `setup`이 처음 한 번 만들고 다시 실행해도 덮어쓰지 않습니다.

**장비 쪽** — PACS Host = 서버 IP, 포트 4242, Called AE = `MEDCONNECT`, 워크리스트도 같은 주소. 장비 자기 AE는 아무거나.

### 6.1 새 PC에 설치할 때 (PACS)

> 실장님 결정 35 (2026-09-29): 11월에 **현지의 다른 PC에 새로 설치**하고, 자료는 EMR 백업으로, 영상은 영상 백업 디스크(6.2)로 옮깁니다. 오프라인 키트는 EMR `offline/`(총괄), PACS 쪽 도구는 PACS 저장소. 순서가 중요합니다.

**① 키트 만들기 (출발 전, 인터넷 되는 이 PC)** — `offline/pack.ps1`
- PACS는 **EMR 옆 폴더 `C:\Bethesda-PACS-main`의 지금 파일**을 복사·빌드합니다(git 브랜치를 보지 않음). 그 폴더가 **PACS `main`의 최신 커밋이고 `git status`가 비어 있는지** 먼저 확인. `MANIFEST.txt`에 두 저장소의 커밋이 찍히고, 고친 파일이 있으면 「PACKED WITH UNCOMMITTED CHANGES」라고 적힘(총괄 `11fbf03`).
- `.env`(비밀값)·`storage`(영상)·`worklists`는 키트에 안 들어감 → 이 PC의 Orthanc 비밀번호·토큰은 따라가지 않고, **영상은 백업 디스크로 따로**.

**② 현지 PC 설치 순서**
1. BIOS 가상화·WSL·Docker Desktop(키트 `installers\` 안내대로) → **한 번 재부팅**.
2. `install-offline.ps1` — 이미지 load → EMR `setup -Offline` → PACS `setup.ps1 -Offline`.
   - PACS `setup`은 시작 전에 **`check-windows-ports.ps1`** 로 9090·4242가 Windows 예약 구간에 걸리는지, 그리고 **9080·9090·4242를 Docker가 아닌 프로그램이 듣고 있는지**(127.0.0.1만 묶은 것 포함, 프로그램 이름·경로를 보여 줌 — 2026-09-30) 경고(읽기만).
   - 끝에서 브리지가 **EMR에 실제로 닿는지** 최대 약 1분 기다려 봄(`worklists\.feed_ok`가 시작 뒤에 새로 쓰였는지). 짝 맞춤은 `docker exec`로 DB에 쓰므로 다른 프로그램이 9080을 차지해도 통과했음 → 이제 「The worklist bridge reaches the EMR」 또는 노란 경고와 브리지의 마지막 오류.
   - 새 `.env`(`ORTHANC_PASSWORD`·`BRIDGE_TOKEN`)를 만들고, 같은 PC에 EMR이 떠 있으면 **`pair-with-emr.ps1`로 자동 짝 맞춤**(토큰은 화면에 안 나옴) → 「paired - nothing to copy」.
   - 끝에 이 PC의 LAN 주소를 찍어 줌 — **장비가 보낼 곳 `<IP>:4242`**. 직원 PC에는 설정할 뷰어 주소가 없음(P-9).
3. **EMR 백업 복원** — 옛 PC를 먼저 최신으로 업데이트한 뒤 만든 백업을, 같은 판의 새 EMR에(`DEPLOYMENT.md` 5b, 총괄 결정 1).
4. **다시 짝 맞추기** — 복원된 백업은 옛 PC의 토큰·Orthanc 비밀번호를 들고 옴. PACS 폴더에서 **`.\pair-with-emr.ps1`** — 브리지 토큰과 **Orthanc 비밀번호를 둘 다** EMR에 넣고 브리지 재생성. 끝에 「The EMR can now show images without a login.」
5. EMR **Paramètres → Flux d'ordres**: **Host / IP = `host.docker.internal`**, 「EMR이 영상 서버에 닿는 주소」가 `http://host.docker.internal:9090`, 「✓ 영상 서버 비밀번호 설정됨」인지 — 복원된 값이 옛 PC 기준이므로.
6. **영상 옮기기** — 옛 PC에서 마지막으로 `image-backup.ps1`을 돌린 백업 디스크를 새 PC에 꽂고 PACS 폴더에서 **`.\restore-image-backup.ps1`** (6.2). 끝에 「EMR imaging orders … missing from Orthanc: 0」인지.
7. **영상 백업 켜기** — 새 디스크면 `prepare-backup-disk.ps1`, 그리고 `install-image-backup.ps1`(작업 스케줄러 등록, 한 번).
8. 확인: 다른 PC에서 `Test-NetConnection <서버IP> -Port 9080` / `4242` 모두 True, **`9090`은 False가 정상**(서버 안에서만), 진료 PC에서 영상 창이 로그인 없이 열림(방화벽은 스크립트가 안 건드림 — 안 되면 Windows 방화벽에서 허용, 네트워크 종류 「개인」), 서버 **고정 IP**(공유기 DHCP 예약), EMR 상태 화면에서 장비 워크리스트·PACS·영상 백업이 초록, 복원한 날의 `scheduled` 시험 오더 0건.

**③ 현지 PC에서 따로 확인할 것**
- **Windows 동적 포트 범위**(P-1과 같은 원인): `setup`이 경고하지만 재부팅 뒤 한 번 더 `netsh int ipv4 show dynamicport tcp` → 시작 49152·개수 16384. 이 PC가 왜 1024부터였는지 모르므로 새 PC도 반드시.
- 장비 설정·워크리스트 AE 필터(P-8) — 장비 설치 날 확인 목록 D-1~D-7(인계 노트).

**④ EMR 백업을 복원하면 PACS와 어긋나는 것** (백업은 DB 전체)

| 복원된 것 | 새 PC에서 생기는 일 | 할 일 |
|---|---|---|
| `pacs_config.bridge_token` = 옛 PC의 토큰 | 새 PACS `.env`와 다름 → 브리지 401, 상태 화면 「보고 없음」 | ②-4 `.\pair-with-emr.ps1` |
| `pacs_config.orthanc_password` = 옛 PC의 Orthanc 비밀번호 | 영상 창에 「영상 서버가 EMR과 아직 짝이 맞지 않았습니다」 | ②-4 `.\pair-with-emr.ps1` |
| `worklist_scp_host`·`orthanc_url` = 옛 PC 기준 | 연결 시험 실패, 영상 창 「응답하지 않습니다」 | ②-5 |
| `service_heartbeat`(브리지·영상 백업의 마지막 보고) | 짝 맞추기·첫 백업 전까지 「보고 없음」 | 저절로 갱신 |
| `worklist_log`의 `scheduled` 줄 | 피드는 **오늘 날짜만** — 지난 날 줄은 장비에 안 감. 복원한 날 만든 시험 오더만 주의 | ②-8 |
| `worklist_log`의 **영상 도착 기록** | 영상을 옮기기 전에는 판독 목록 「N image(s) reçue(s)」인데 영상 창은 「L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas …」 안내(2026-10-01 전에는 빈 화면) | ②-6 영상 복원 → 「missing from Orthanc」가 0인지 |
| `order_item`·순번 | 이어서 늘어남 → 새 AccessionNumber·UID가 옛것과 안 겹침 | 없음 |

### 6.2 영상 백업 (결정 41 — 매일 밤 외장 USB 디스크) · EMR 백업도 같은 디스크로

> ⚠ **외장 디스크 하나에 환자 영상과 EMR 데이터베이스 전체(환자·진료·수납 기록)가 같이 들어 있고, 암호화하지 않습니다.** 서버 옆 **잠기는 곳**에 두고, 빌려주거나 다른 일에 쓰지 마세요. 잃어버리면 병원 기록 전체가 새어 나간 것과 같습니다 — 실장님께 바로 알립니다. (암호화 BitLocker To Go는 결정 세션 몫.)

**하는 일**: 매일 밤 **02:30**(EMR DB 백업 02:00 뒤) PACS 폴더의 **`image-backup.ps1`** 이 Orthanc에 **지난번 이후 새로 들어온 영상**만 물어 **원본 DICOM 파일 그대로** 외장 디스크에 쓰고, 결과를 EMR에 보고합니다. 영상은 **디스크에서 지우지 않습니다**(Orthanc에서 지운 것도 남음 — 실수로 지운 영상 되살리기).

**처음 한 번 (설치하는 사람, 서버 PC에서)**
1. 외장 디스크(1~2TB)를 꽂고 PACS 폴더에서 `.\prepare-backup-disk.ps1 -Target E:\` (드라이브 글자는 그때그때). 디스크 맨 위에 **표시 파일 `BETHESDA-PACS-BACKUP.id`** 가 생김 — 이것으로 디스크를 찾으므로 **지우지 말 것**. 비어 있지 않은 디스크는 `-Force` 없이는 거절(엉뚱한 디스크 방지), 시스템 디스크(C:)는 거절.
2. `.\install-image-backup.ps1` — Windows 작업 스케줄러에 「Bethesda PACS image backup」 등록(매일 02:30, **로그온한 사용자로** — Docker Desktop과 같은 조건, 관리자 권한·비밀번호 저장 없음, PC가 꺼져 있던 밤은 다음 시작 때 따라잡음). `-WhatIf`로 미리 보기, `-Remove`로 해제. **Windows 설정을 바꾸는 일이라 개발 세션은 돌리지 않음.**
3. `.\image-backup.ps1` 을 한 번 손으로 돌려 첫 복사(처음엔 전부) → EMR 상태 화면 확인.

**EMR 백업도 같은 디스크로** (실장님 결정 — 현지 서버는 PC 한 대, 외장하드 하나, 2026-09-29)
- 같은 실행에서 영상 다음에 **EMR의 밤 DB 백업**(`bethesda_YYYY-MM-DD_HHMM.sql.gz`, 02:00, 파일 하나 1MB 안팎)을 디스크의 **`BethesdaPACS\emr-backups\`** 로 복사. EMR 쪽(폴더·`BACKUP_PATH`·설정)은 **건드리지 않음** — 디스크가 빠져도 EMR 백업은 그대로 EMR 폴더에 쌓임.
- EMR 폴더: `-EmrPath`로 주거나, 없으면 **PACS 폴더 옆의 `Bethesda-EMR*`**(그 안에 `docker-compose.yml`이 있는 것; 여럿이면 가장 새 백업이 있는 것). 설치 키트는 `<드라이브>\Bethesda-EMR`·`\Bethesda-PACS`로 나란히 놓으므로 보통 저절로 찾음. 예약 작업에 넘기려면 `install-image-backup.ps1 -EmrPath <폴더>`. 백업 폴더는 EMR `.env`의 `BACKUP_PATH`(상대 경로면 EMR 폴더 기준), 없으면 `<EMR>\backups`.
- 복사하는 것: 그 폴더 **맨 위의** `bethesda_*.sql.gz`·`medconnect_*.sql.gz`(0바이트 제외). **`.inprogress`(쓰는 중인 덤프)는 안 봄.** 같은 이름·같은 크기가 디스크에 있으면 건너뜀.
- 확인: `.part`로 받고 → **SHA-256이 원본과 같은지** → **gzip이 끝까지 풀리고 풀린 길이가 gzip 꼬리(ISIZE)와 같은지** → 이름 바꿈. Windows PowerShell의 GZipStream은 잘린 파일을 오류 없이 끝까지 읽으므로 길이 비교가 필요했음(시험에서 잘린 파일이 처음엔 통과함). 실패하면 그 파일만 실패로 보고, 나머지는 계속 복사.
- 디스크에서 지우는 규칙: **EMR과 같게** — EMR `.env`의 `BACKUP_RETENTION_DAYS`(기본 30)일 넘은 것만, **가장 새 7개는 항상 남김**. 날짜는 파일 이름에서(복사본의 파일 시각은 믿지 않음). **복사 오류가 있던 밤에는 지우지 않음.** 지울 파일은 처음부터 복사하지 않음. **영상은 지금처럼 지우지 않음.**
- 영상 결과와 **따로** 보고: 영상이 실패해도(Orthanc 멈춤 등) EMR 백업은 복사하고, EMR 백업이 실패해도 영상 결과(`ok`·exit 코드)는 그대로.

**어떻게 동작하나** (`image-backup.ps1`, 함께 쓰는 `image-backup-common.ps1`)
- 디스크: 모든 드라이브에서 표시 파일을 찾음. **없으면** 「backup disk not found (is it plugged in?)」·exit 2, **둘 이상이면** 멈추고 경고.
- 무엇이 새것인가: Orthanc `GET /changes?since=<seq>&limit=200`의 `NewInstance`. 마지막 seq는 **디스크의** `BethesdaPACS\state.json` — 디스크를 새것으로 바꾸면 처음부터 다 복사됨.
- 한 장씩: `GET /instances/<id>`(크기·SOPInstanceUID), `/instances/<id>/study`(StudyInstanceUID) → `BethesdaPACS\images\<StudyUID>\<SOPUID>.dcm`. **경로에 환자 이름 없음**(UID는 숫자·점만 허용, 아니면 Orthanc ID로). **`.part` 이름으로 받고 크기가 맞으면 이름 바꿈** — 끊긴 파일은 다음 실행 시작 때 지움. 이미 같은 크기로 있으면 건너뜀. 받기 전에 Orthanc에서 지워진 영상(404)은 실패로 치지 않음.
- **seq는 한 묶음(200건)을 다 받은 뒤에만** 올림 — 하나라도 실패하면 거기서 멈추고 다음 밤에 같은 자리부터.
- **디스크의 seq가 이 Orthanc 것인지 확인** (2026-09-30): 변경 번호는 Orthanc DB 하나에만 통함 — 디스크를 **새 서버로 가져가거나**(결정 35) 영상 백업으로 Orthanc를 다시 채우면 번호가 1부터 다시 시작하고, 옛 seq가 더 크면 **새 서버의 처음 영상들이 영원히 빠질 뻔했음**. 이제 `state.json`에 `last_change`(그 번호의 `seq|종류|ID|시각`)를 같이 적고, 시작할 때 Orthanc `GET /changes?since=<seq-1>&limit=1`이 **같은 번호·같은 ID·같은 시각**을 돌려주는지 봄. 아니면 로그 「the disk's position (change N) is not this Orthanc's … Starting again from 0」 뒤 0부터 — 디스크에 이미 있는 영상은 크기로 건너뜀. **걸리는 시간**(2026-09-30, 격리 Orthanc 9198에 시험 영상을 넣어 잼, 디스크는 이 PC의 폴더): 다시 훑기 612장 2.7초·2,012장 12초 → **한 장 약 5ms**(PowerShell 시작·EMR 부분 약 2.5초 제외). 실제 서버의 USB 디스크·큰 Orthanc DB를 생각해 **넉넉히 한 장 20ms**로 잡으면 1만 장 약 3~4분, 5만 장 약 15~20분, 10만 장 약 35분 — 새 서버에서 한 번만. 참고로 작은 시험 영상 첫 복사는 한 장 약 13ms(1,400장 16초); 실제 영상은 크기(USB 속도)가 좌우. `last_change`가 없는 옛 디스크는 번호가 맞으면 그 자리에서 표시만 새로 붙임.
- **도중에 디스크가 빠지면** (2026-09-30): 영상마다 표시 파일이 아직 있는지 보고, 없으면 「backup disk was unplugged during the backup - plug it back in; the next run continues」·`disk_found=false`·exit 1(전에는 남은 공간을 0으로 읽어 「disk is full」이라고 했을 것). EMR 백업 복사 중에 빠지면 `emr_backup=no_disk`, 같은 문장. 반쯤 쓴 파일은 `.part`로 남았다가 다음 실행이 지움.
- **디스크 가득**: 받기 전마다 남은 공간이 (그 파일 + 1GB)보다 작으면 멈춤 → 「backup disk is full – N GB free. Replace or clear it.」(실패). 끝났을 때 남은 공간이 10% 미만이면 성공이지만 「almost full」 경고.
- 보고: `POST /api/pacs/image-backup-report`(브리지 토큰을 **헤더**로, 본문은 개수·공간·오류 글자뿐 — 환자 정보 없음) → `service_heartbeat`의 `pacs_image_backup` 줄. EMR은 `last_success`를 실패한 밤에도 이어 둠(「마지막으로 된 게 언제인가」). 같은 내용을 PACS 폴더 `logs\image-backup-status.json`에도 씀(EMR이 멈춰도 서버 상태 창이 읽을 수 있게), 실행 기록은 `logs\image-backup.log`(개수·오류만).
- 보고의 EMR 백업 칸(같은 `pacs_image_backup` 줄의 detail, `logs\image-backup-status.json`에도):
  | 칸 | 뜻 |
  |---|---|
  | `emr_backup` | `ok` / `not_found`(EMR 폴더 못 찾음) / `none`(EMR 폴더에 백업이 하나도 없음) / `failed`(복사·확인 실패, 디스크 가득) / `no_disk`(디스크 없음·둘 이상) |
  | `emr_backup_ok` | `emr_backup`이 `ok`일 때만 참 |
  | `emr_backup_copied` | 이번에 복사한 파일 수 |
  | `emr_backup_count` | 디스크에 있는 EMR 백업 수 |
  | `emr_backup_newest` | 디스크에서 가장 새 백업의 **파일 이름 날짜** `YYYY-MM-DD HH:MM` (없으면 null). **EMR 컨테이너 시간대의 시각**이라 나이 판정에는 쓰지 말 것 — 36시간 판정은 `emr_backup_last_ok`(서버 시각)로(총괄이 설정 세션에 전달) |
  | `emr_backup_error` | 짧은 영어 문장(300자까지) — 파일 이름만, 환자 정보·비밀값 없음 |
  | `emr_backup_last_ok` | EMR이 붙임: 마지막으로 `emr_backup_ok`가 참이었던 때(실패한 밤에도 이어 둠) |

  옛 스크립트가 보고하면 이 칸들이 **아예 없음**(= 「모름」). `ok`는 계속 영상 결과.
- EMR 상태 화면(위쪽 막대의 상태 점)과 서버 상태 창(`server-status.bat`)의 **「EMR 백업 복사 (외장 디스크)」** 줄 — 설정 세션 `99329ea`: 36시간 판정은 `emr_backup_last_ok`, `newest`는 보여 주기만. 문구 표는 `wiki/reference/usb-backup-rehearsal.md` 6번.
- EMR 상태 화면·서버 상태 창에 경고로 보이는 것은 **설정 세션 몫**(디스크 없음 / 실패 / 36시간 넘게 성공 없음 / 여유 10% 미만) — 총괄이 전달.

**복원·연습** (`restore-image-backup.ps1`)
- `.\restore-image-backup.ps1` — 디스크의 `.dcm`을 Orthanc에 다시 올림(`POST /instances`). 이미 있는 것은 「AlreadyStored」 — **다시 돌려도 안전**. 끝에 올린 수·Orthanc 영상 수 전후, 그리고 **「EMR imaging orders with images recorded: N; of those, missing from Orthanc: M」**(EMR DB 컨테이너가 같은 PC에 있을 때 — 개수만). StudyInstanceUID가 그대로라 EMR 오더와의 연결도 그대로.
- **달마다** `.\restore-image-backup.ps1 -Verify`(읽기만): 무작위 20개가 DICOM 파일인지(128바이트 뒤 `DICM`), 디스크 파일 수 ≥ Orthanc 영상 수인지, EMR 연결 확인 → `VERIFIED` / exit 1.
- `-Verify`는 **디스크의 EMR 백업 수·가장 새 파일 이름과 그 파일이 쓰인 시각(이 PC 시계)**도 말하고, 가장 새 것이 완전한 gzip인지 봄. 가장 새 것이 36시간보다 오래됐거나 망가졌으면 VERIFIED가 아님. **나이는 파일 수정 시각으로 잼** — 파일 이름의 시각은 EMR 컨테이너 시간대(`TZ`, 기본 Indian/Antananarivo)라 PC 시간대가 다르면 어긋남(이 PC는 한국 시간이라 6시간, 총괄 확인 2026-09-30). 복사본은 원본의 수정 시각을 그대로 받음. 하나도 없으면 노란 경고만(EMR이 다른 PC에 있는 병원).
- **EMR 복원은 이 스크립트가 하지 않음**: 디스크의 `BethesdaPACS\emr-backups\`에서 고른 파일을 EMR 폴더의 `backups\`로 복사한 뒤, EMR `DEPLOYMENT.md` **5b 절차 그대로**(앱 멈춤 → `docker cp` → `gunzip -t` → 복원). 복원 뒤에는 PACS 폴더에서 **`pair-with-emr.ps1`** 을 다시(백업이 옛 토큰·비밀번호를 들고 옴, 6.1).
- **석 달마다** 실제 복원 연습: PACS 격리 스택(7절 끝, 127.0.0.1:9198)에 `-OrthancUrl http://localhost:9198`로 복원해 영상이 열리는지. 실행 중 PACS는 안 건드림.

**시험 (2026-09-29, 격리 스택 + 시험용 폴더를 디스크 삼아)**: 첫 실행 9장 → 다시 돌리면 0장 → 새 영상 2장만 → 받기 전에 지운 영상은 건너뜀 → 남은 `.part` 지움 → 디스크 가득(여유를 일부러 크게) 멈춤·seq 그대로 → 디스크 없음 exit 2 → 디스크 둘 멈춤 → EMR 줄에 각 결과·`last_success` 유지. Orthanc에서 검사 하나(3장) 지운 뒤 `-Verify` VERIFIED → 복원 3장 새로·8장 이미 → 다시 복원 0장 새로 → 「missing from Orthanc」 4→3(남은 3건은 가짜 Orthanc 시절 시험 오더라 정상). `install-image-backup.ps1 -WhatIf` 만 — 등록 안 됨 확인.

**EMR 백업 복사 시험 (2026-09-29, 시험용 폴더 — 가짜 EMR 폴더에 가짜 덤프 13개(0~45일 전) + `.inprogress` + 다른 파일, 디스크도 폴더)**: 첫 실행(Orthanc 꺼짐) → 영상 `ok=false`·exit 1인데 EMR 백업은 `ok`, 30일 안쪽 9개만 복사(30일 넘은 4개는 복사 안 함), `.inprogress`·다른 파일 무시 · 다시 → 0개 · 디스크의 망가진 복사본 → 다시 복사 · **잘린 EMR 백업** → 그 파일만 `failed`(「not a complete gzip」), 새 정상 파일은 복사, 그 밤엔 지우지 않음 → 다음 밤 지움 · 디스크의 45·50·33일 된 복사본 → 지움, 새 7개 남김 · `-EmrPath` 틀림 → `not_found`, 영상 결과 그대로 · 디스크 없음 → `no_disk`·exit 2 · EMR `.env`의 `BACKUP_PATH=./otherbk`·`BACKUP_RETENTION_DAYS=5` → 그 폴더에서 복사, 5일 규칙으로 7개 남김 · **격리 스택**(Orthanc 9198 + EMR 9188): 영상 12장·EMR 백업 4개 → EMR `service_heartbeat` detail에 칸들 저장 확인, 잘린 파일 → `ok=t`(영상)·`emr_backup=failed`·`emr_backup_last_ok` 이어 둠, 옛 모양 보고 → EMR 칸 없음 · `-Verify` → 「EMR database backups on the disk: 11; newest … reads as a complete gzip」·VERIFIED. `install-image-backup.ps1 -WhatIf -EmrPath …`만(등록 안 됨 확인). 진짜 USB 디스크·진짜 EMR 백업으로는 안 해 봄.

**빠짐·옮김 시험 (2026-09-30, 시험용 폴더에 드라이브 글자(subst)를 씌우고 도중에 없앰 — 격리 Orthanc 9198, 영상 12장, 가짜 EMR 백업 150MB×3)**: 영상 3~5장 복사 뒤 뺌 → 「unplugged」·`disk_found=false`·exit 1, `state.json` 안 생김 → 다시 꽂음 → 나머지 7~9장만, 12장 · EMR 백업 복사 중 뺌 → 영상 `ok=true`, `emr_backup=no_disk`, `.part` 1개 남음 → 다음 실행이 지우고 3개 복사, `-Verify` VERIFIED · 디스크 seq를 5000으로(다른 서버 흉내)·영상 지움 → 「not this Orthanc's … from 0」, 12장 다시 복사(고치기 전이면 0장) · 같은 번호의 ID를 바꿈 → 0부터 · `last_change` 없는 옛 state → 표시만 붙이고 이어서. 진짜 USB를 쓰는 도중에 뽑는 것은 하지 않음(디스크가 상할 수 있음).

**실장님과 할 진짜 디스크 시험**: `wiki/reference/usb-backup-rehearsal.md`.

**남은 것**: 디스크 암호화(BitLocker To Go)는 결정 세션. 리눅스·NAS용 `.sh`는 만들지 않음(실장님 결정 2026-09-29 — 현지 서버는 PC).

### 6.3 현지에서 장비 붙이기 — `device-watch` (2026-09-30)

실장님이 모델을 모르는 옛 장비(후지 X-ray, GE 초음파, 내시경 게이트웨이)를 현지 서버 PC 앞에서 맞춰 보는 날을 위한 도구와 순서서. **순서서: `wiki/reference/device-connection-onsite.md`**(한국어, 개발 용어 없이).

- **PACS `device-watch.ps1` / `device-watch.bat`**(더블클릭 = `-Detail`): 장비가 무엇을 하는지 사람 말로 한 줄씩(ko 기본, `-Lang fr|en`).
  - 영상 받음: Orthanc `GET /changes`의 `NewInstance` → `/instances/<id>/simplified-tags`(PatientID, AccessionNumber, StudyInstanceUID)와 `/metadata?expand`(`RemoteAET`, `RemoteIP`, `CalledAET`, `TransferSyntax`) — **어느 로그 수준에서도**. 검사마다 5초 모아 한 줄, 그다음 EMR `worklist_log`와 맞춤(`docker exec bethesda-emr-db psql`, **읽기만**, 값은 `[0-9A-Za-z.-_]`만 넣음): 연결됨 / 환자번호 맞음·다름·없음 / 검사번호로 연결될 예정 / 오더 없음, 1~2분 뒤 「EMR에 기록됨」.
  - 연결·C-ECHO·워크리스트 조회: Orthanc 로그(`docker logs --timestamps`)의 「Incoming connection from AET … on IP …, calling AET …」, 「Incoming Echo/FindWorklist/Store request …」, 워크리스트 플러그인의 「Received worklist query …」(조건 JSON)·「Worklist C-Find: … found N match(es)」, 「Association Release …」. **0명이면 이유**: 서버의 `.wl`(브리지 컨테이너의 pydicom으로 읽음)과 조건을 맞춰 — 목록 없음 / Station AE 거르기 / Modality 거르기 / 날짜 / 그 밖.
  - 연결했는데 요청 없이 끊김 → 「아무것도 묻거나 보내지 않고 끊음」(서버가 영상 종류·전송 방식을 받지 않았을 때의 모습).
  - 서버 이름(Called AE)이 MEDCONNECT가 아니면 장비마다 한 번 알림. 브리지 오류는 쉬운 말로(EMR에 닿지 못함 / EMR이 아닌 것이 답함).
  - `-Ping <IP> [-DevicePort] [-DeviceAet]`: ping, 포트(104·4242·11112), Orthanc `POST /tools/dicom-echo`(장비를 **등록하지 않고** C-ECHO — 설정 안 바뀜).
  - **`-Detail`**: Orthanc 로그 수준을 REST `/tools/log-level-{generic,dicom,plugins}` = `verbose`로(`http`는 그대로 — 브리지·EMR 호출이 쏟아지지 않게), 화면에 말하고, **Ctrl+C에 원래 값으로**(자기가 올린 것만). 창을 X로 닫았으면 `-Reset`. Orthanc 재시작도 원래대로. 설정 파일은 안 건드림.
- **조사에서 알게 된 것**(격리 Orthanc 26.6.1 = Orthanc 1.12.11):
  - 기본 로그 수준에서는 C-ECHO·C-FIND·C-STORE가 **한 줄도 안 남음** → `-Detail`이 필요한 이유.
  - `DICOM_CHECK_CALLED_AET=false`라 장비가 서버 이름을 틀려도(예: `WRONGAET`) 연결·목록·전송 모두 됨.
  - JPEG baseline 압축 전송: **받음**. 제조사 전용 SOP Class(시험: `1.2.840.113619.4.30`): 기본 설정에서는 **조용히 거절** — 연결은 받고 그 종류의 전송 방식을 하나도 수락하지 않아, 장비 쪽에만 오류가 나고 PACS 로그에는 verbose에서도 거절 줄이 없음(연결 → 끊김만).
  - **→ 총괄 결정(2026-09-30): 받는다.** PACS compose `ORTHANC__UNKNOWN_SOP_CLASS_ACCEPTED: "true"`(Orthanc `UnknownSopClassAccepted`). 이유: 현지에 개발자가 없고 옛 장비가 무엇을 보낼지 모르며, 조용한 거절은 PACS에 흔적이 없음. **격리 시험**: 전용 종류(그림 있음 `1.2.840.113619.4.30` · 그림 없음 `1.2.840.113619.4.26`) 모두 **저장됨** → 브리지가 보통처럼 도착 보고, EMR `completed`·`image_count 1`·`match`(「Réalisé」, 「1 image(s) reçue(s)」). 영상 창: 그림 있는 전용 종류는 썸네일·그림이 나옴, 그림 없는 것은 **눈에 줄 그은 썸네일 + 빈 칸**(DICOMweb `rendered` 400). 보통 영상은 그대로. 영상 백업(`/instances/<id>/file`)·복원(`POST /instances`)은 종류와 관계없음. 디스크를 더 씀. 되돌리기: `"false"` → `docker compose up -d`(Orthanc 재시작).
  - device-watch는 영상의 `SopClassUid`가 `1.2.840.10008.`으로 시작하지 않으면 「제조사 전용 영상 종류(…) — 서버에 저장했지만 영상 창에서는 안 보일 수 있습니다」, 메타데이터에 `PixelDataOffset`이 없으면 「그림이 없는 자료 N개」, 그 검사의 「EMR에 기록됨」도 「영상 창에 그림이 안 나올 수 있음」으로.
  - device-watch의 「영상 서버 알림」은 **DICOM 스레드(`DICOM-SERVER`, `DICOM-n`)의 W/E 줄만**, `W001:` 같은 코드 달린 알림은 뺌(2026-09-30 — 조용한 모드에서 관리 화면을 열었을 때 「W001: Accessing DICOM tags from storage …」가 떴음). 남는 것은 쉬운 말 한 줄(연결 거절 / 도중에 끊김 / 저장 못 함 / 읽지 못함 / 그 밖) + 원문.
  - EMR은 오더에 Station AE를 넣지 않아 `.wl`은 늘 `ANY` → 장비가 「내 AE만」 거르면 0명(P-8). 도구가 그 이유를 말함.
  - Orthanc 워크리스트 플러그인도 스스로 `.wl`을 지움(「Deleting worklist … because its study is now stable」 — 이 버전의 housekeeper). 브리지의 삭제와 겹치지만 해가 없음(EMR이 완료를 기록할 때까지 브리지가 다시 써도 곧 같은 이유로 지워짐).
- **시험**(격리 9188/9198, 장비 흉내 = 임시 Orthanc `XRAY01`, 진짜 DICOM): 연결 시험 · 틀린 서버 이름 · 목록(6명 / Station AE 거르기 0 / MR만 0 / 날짜 0 / 서버에 목록 없음 0) · 영상(맞는 번호 / 다른 번호 / 번호 없음 / 제 UID / JPEG / 제조사 전용 종류 / 손으로 친 환자) · 1~2분 뒤 EMR 기록 · 브리지가 EMR에 닿지 못함 · `-Ping`(닿음·안 닿음) · `-Reset` · 조용한 모드(fr) · en. 각 경우의 줄이 순서서 표와 같음. 로그 수준은 끝날 때 `default`로 돌아옴을 확인.

## 7. 알려진 문제 · 제약

2026-09-29 코드 읽기로 찾은 것. **심각도**: 높음 / 보통 / 낮음. 고친 것은 ✅, 일부 고친 것은 🟡.

### 지금 돌아가는 PACS

- **P-1 [높음] ✅ 해결 (2026-09-29, 재부팅 뒤 총괄 조치)** — 동적 포트 범위 ipv4·ipv6 모두 49152·16384로 되돌림(실장님), 재부팅 뒤 제외 구간에 4242·9080·9090 없음, 세 포트 모두 호스트에서 연결됨. PACS `main` `c9dc0b4`→`6c135aa`, 토큰 재발급, 브리지·Orthanc 재생성(healthy). 결과 전체: 인계 노트 「총괄 확인: P-1 조치 끝」. 되돌리기용 브리지 이미지 이름표 `before-p1`은 남아 있음. **원래 문제**: 실행 중인 PACS에 호스트에서 연결이 안 됨 (2026-09-29 확인). `docker inspect bethesda-pacs`에서 PortBindings는 `9090`·`4242`인데 실제 `NetworkSettings.Ports`가 비어 있고, 호스트에서 `127.0.0.1:9090`·`:4242` TCP 연결이 모두 실패합니다. 컨테이너는 「healthy」 — healthcheck가 컨테이너 **안**에서만 묻기 때문. 이 PC의 Windows 예약 포트 대역에 **`4204–4303`이 있어 4242가 그 안에 들어갑니다**(`netsh interface ipv4 show excludedportrange protocol=tcp`). 9090은 예약 대역 밖인데도 안 잡혀 있음 — 원인 확인 필요. 결과: 장비가 워크리스트를 못 받고 영상을 못 보내며, EMR에서 영상이 안 열립니다. 브리지 자체는 정상(`synced 0 worklist entries` 반복). 근거: README의 8090→9090 이전과 같은 종류의 문제.
  - **근본 원인 (2026-09-29 확인)**: 이 PC의 Windows **동적 포트 범위가 `1024`부터 13977개(1024–15000)** 로 바뀌어 있습니다(`netsh int ipv4 show dynamicport tcp`, ipv6도 같음. Windows 기본은 49152–65535). 그래서 Hyper-V/WinNAT가 재부팅할 때마다 1024–15000 사이 아무 곳이나 예약할 수 있고, **4242·9090은 물론 EMR의 9080도 언젠가 걸릴 수 있습니다.** 포트 번호를 다른 값(예: 11112)으로 옮겨도 같은 범위 안이라 해결되지 않습니다.
  - 해결: 동적 포트 범위를 Windows 기본값으로 되돌리고(관리자 권한, 재부팅 필요 — 시스템 설정이라 실장님이 직접), PACS 컨테이너를 다시 만들기(총괄). 포트 번호는 4242·9090 그대로 둡니다.
  - 2026-09-29 현재 **현장 장비는 아직 하나도 설정하지 않았음**(실장님 확인) — 지금 멈춘 장비 연동은 없습니다. 장비를 설정하기 전에 해결해야 합니다.
  - **진단은 총괄이 확인함 (2026-09-29).** 조치 분담: ① 동적 포트 범위 복구(`netsh int ipv4|ipv6 set dynamicport tcp start=49152 num=16384`)와 재부팅은 **실장님이 직접**, ② 재부팅 후 PACS 컨테이너 재생성과 호스트에서 9080·9090·4242 확인은 **총괄**. PACS 세션은 실행 중인 `bethesda-pacs`를 건드리지 않음. 총괄 확인 결과를 받으면 여기에 적고 검증 항목(장비 설정 체크리스트 등)을 이어서 진행.
  - 재발 방지 후보: `server-status.ps1`에 호스트 쪽 TCP 검사 추가(설정 세션에 부탁), 설치 문서에 동적 포트 범위 확인 추가 — 확정 전
- `server-status.ps1`(설정 세션 파일)은 이후 설정 세션이 호스트 쪽 9090·4242 TCP 검사를 넣음. 그 창을 재부팅 뒤 눈으로 보지는 않았음(R-3) — 확인 필요.

### 환자 식별 (영상이 다른 환자·다른 오더에 붙는 경우)

- **P-3 [보통] 🟡 일부 고침 (2026-09-29)** — 브리지가 영상 도착을 알릴 때 EMR이 영상 속 PatientID를 chart_no와 비교해 `patient_check`로 저장하고, 「🩻 Imagerie (영상/판독)」 목록(그때 이름은 「판독소견」)에 빨강·노랑 경고를 띄움. `viewer-url`도 `images.patient_check`를 돌려줌. 영상 뷰어 창에도 같은 경고 — 진료 세션 `9dfcedc`(`Consultation.jsx`). 두 화면이 같은 부품 `PatientCheck`(`RadiologyReadings.jsx`에서 export, `viewer-url`의 `images` 모양을 받음)를 쓰도록 PACS가 내보냄. **남은 것**: 워크리스트에서 다른 환자를 고른 경우는 원리상 못 잡음(4절 `patient_check`). **원래 문제**: 영상이 맞는 환자의 것인지 EMR이 확인하지 않음. `pacs.routes.js:91` — StudyInstanceUID만으로 뷰어를 엽니다. 방사선사가 워크리스트에서 다른 환자를 골라 찍으면 그 영상은 고른 환자(틀린 환자)의 오더에 붙어 그대로 보입니다. 뷰어 창 머리의 환자 이름은 EMR 쪽 이름이고, 영상 속 DICOM 환자 이름은 Stone 뷰어 안에만 나옵니다. 개선안: 뷰어를 열 때 EMR 백엔드가 Orthanc REST로 그 Study의 PatientID를 조회해 chart_no와 다르면 경고.
- **P-4 [보통] 🟡 1·2단계 고침 (2026-09-29, 격리 스택에서 진짜 Orthanc로 확인)** — 브리지가 UID로 못 찾으면 AccessionNumber로 한 번 더(정확히 하나일 때만), EMR이 accession 일치를 다시 확인하고 실제 UID를 `image_study_uid`(마이그레이션 802)에 저장, 뷰어는 그 UID로 엶, 판독 목록에 노란 한 줄 「검사 번호로 연결됨 — 영상 속 환자 정보 확인」(`px_linkedByAccession`). 격리 시험: UID를 새로 만든 영상 2장 → accession으로 연결·`match`·뷰어 주소가 실제 UID. 같은 accession 영상 둘 → 연결 안 함. accession 틀린 보고·실제 UID 없는 보고 → 409. **남은 것(3단계, 결정 필요)**: accession도 없이 손으로 친 영상을 오더에 붙이는 화면. **원래 문제**: 장비가 StudyInstanceUID를 새로 만들면 영상이 오더에 안 붙음. 연결 고리가 UID 하나뿐입니다(`pacs.routes.js:81-91`). README는 「Accession Number / Study UID로 맞춘다」고 하지만 코드는 UID만 씁니다. 일부 CR·초음파 장비는 워크리스트의 UID를 쓰지 않고 자기 UID를 만듭니다(장비별 확인 필요). 개선안: UID로 못 찾으면 AccessionNumber로 Orthanc에서 찾기.
- **P-6 [보통] 워크리스트가 「오늘」만 나옴.** `pacs.routes.js:134`·`worklist.routes.js:75` — 어제 낸 오더를 오늘 찍으면 장비 목록에 없어서 손으로 입력 → P-4처럼 연결이 끊깁니다. `consult.routes.js`가 `scheduled_date=CURRENT_DATE`로 고정.
- **P-7 [보통] ✅ 고침 (2026-09-29)** — 브리지가 Orthanc에서 Stable 스터디를 찾으면 `POST /api/pacs/study-arrived` → 완료 처리 → 다음 바퀴에 `.wl` 삭제. 격리 시험(가짜 Orthanc)으로 확인. **진짜 Orthanc 26.6.1의 응답 형식은 재부팅 뒤 확인함**(R-5: `IsStable` 있음 — 올린 직후 False, 75초 뒤 True, `PatientMainDicomTags.PatientID`, `CountInstances`). **격리 스택에서 끝까지 확인(2026-09-29)**: 오더 → `.wl` → 영상 3장 업로드(Orthanc REST — 장비 대신) → 약 1~2분 뒤 `completed`·`match` → 다음 바퀴 `.wl` 삭제. 실제 장비의 C-STORE로는 장비 설치 날. 남은 한계: 피드가 「오늘」만 주므로 어제 오더의 영상이 오늘 도착하면, 또 자정을 넘겨 도착하면 완료 처리가 안 됨(P-6과 같이 풀 것). (과도기 — EMR만 합쳐지고 브리지는 옛것이던 때 「영상 대기 중」이 계속 보이던 것 — 는 2026-09-29 재부팅 뒤 PACS 합침으로 끝남.) **원래 문제**: 촬영이 끝나도 워크리스트에서 안 빠짐. worklist_log.status를 `completed`로 바꾸는 곳이 없습니다(`PUT /api/worklist/:id/status`를 부르는 코드 없음). 끝난 환자가 하루 종일 장비 목록에 남아, 다음 환자를 찍을 때 잘못 고를 여지가 커집니다. `order_item.worklist_status`도 영원히 `sent`. 개선안: 브리지가 Orthanc에 해당 UID/Accession 영상이 들어왔는지 보고 완료 처리.
- **P-8 [보통으로 올림] 장비가 「내 AE만」 걸러 조회하면 워크리스트가 0건 — 진짜 Orthanc로 확인 (2026-09-29, 격리 스택).** Orthanc 26.6.1 워크리스트에 DICOM C-FIND로 물어 봄: 거름 없음 → 전부, `ScheduledStationAETitle=XRAY01` → **0건**, `ANY` → 전부, `*` → 전부. `.wl`의 그 칸을 **비우거나 빼도** `XRAY01`로는 0건(빈 칸은 `*`에만 걸림) — **브리지만 바꿔서는 못 고침**. 선택지: ① 장비 설정에서 AE 필터를 끔(장비 설치 날 D-2 — 가장 간단) ② 장비별 AE를 오더에 넣기: 오더 코드의 `station_ae`(이미 칸 있음, `consult.routes.js`가 일부러 비움)를 쓰게 → 진료 파일 변경 + 같은 초음파 오더를 여러 방이 나눠 받는 흐름과 부딪힘 ③ 브리지가 알려진 장비 AE마다 `.wl`을 하나씩 더 씀(설정으로 장비 AE 목록) — 거르지 않는 장비에는 같은 환자가 여러 번 보임. 추천: ①, 안 되는 장비만 ③. 장비 설치 날 결정.

### 보안 (토큰 · 비밀번호)

- **P-2 [높음] ✅ 고침 (2026-09-29)** — 16자 미만·옛 기본값 토큰은 EMR이 「설정 안 됨」으로 보고 무조건 거절(`routes/pacs.token.js`). 브리지·compose에서도 기본값을 없앰. **원래 문제**: 기본 브리지 토큰이 저장소에 공개된 값이고, EMR은 그 값을 그대로 받아들임. `pacs_config.bridge_token` 기본값 `change-me-bridge-token`(`001_schema.sql`, `pacs.routes.js:15`), PACS compose 기본값도 같음. PACS를 페어링하지 않은 **모든 EMR 설치**에서 `GET /api/pacs/worklist-feed?token=change-me-bridge-token`으로 로그인 없이 오늘 영상 오더 환자의 이름·생년월일·성별·차트번호를 가져갈 수 있습니다(`pacs.routes.js:132`). 같은 토큰으로 `PUT /api/worklist/:id/status`도 됩니다(`worklist.routes.js:15`). 개선안: 기본값·빈 값·짧은 값을 「설정 안 됨」으로 보고 거절.
- **P-5 [보통] ✅ 고침 (2026-09-29)** — `GET /api/pacs/config`는 settings 권한만, 설정 화면은 토큰을 가림(보기 버튼), 브리지는 `X-Bridge-Token` 헤더로 보냄(EMR은 옛 브리지를 위해 쿼리도 계속 받음). **남은 것**: 고치기 전의 EMR 백엔드 로그(`docker logs bethesda-emr-api`)에는 토큰이 이미 찍혀 있음(2026-09-29 확인) — 필요하면 토큰을 새로 만들어 PACS `.env`와 EMR 설정을 함께 바꾸면 됨. **원래 문제**: 브리지 토큰이 모든 로그인 직원에게 보임. `GET /api/pacs/config`에 권한 검사가 없습니다(`pacs.routes.js:43`). 설정 화면도 피드 주소를 토큰째 보여줍니다(`Settings.jsx:495-496`). 브리지는 토큰을 URL 쿼리로 보내(`bridge.py:94`) 접속 기록에 남을 수 있습니다. 개선안: `/config`를 settings 권한으로, 화면에는 가려서, 브리지는 `X-Bridge-Token` 헤더로.
- **P-9 [보통] ✅ 고침 (2026-09-29, 선택지 C · 총괄이 합쳐 실행 중 EMR·PACS에 올림 — 마이그레이션 번호 035 — EMR이 영상을 중계, 총괄 승인 조건 8개)** — 4절 `pacs.viewer.js`. 직원은 로그인 창 없이 **그 오더의 스터디만** 봄, Orthanc 비밀번호는 EMR 서버와 PACS `.env`에만, Orthanc 9090은 `127.0.0.1`. **격리 스택 확인**: Stone이 EMR 영상 창·새 탭에서 열림(fr·ko), 보안 시험 25개 통과(쿠키 없음 401, 남의 스터디·거르지 않은 목록·Orthanc REST·Explorer 403, POST·DELETE 405, `..`·`%2e%2e`·`%2f`·`%252e`·`\`·`//` 400, 서명 위조·만료·없는 직원·진료 권한 없는 직원의 쿠키 401, 수납·간호사 `viewer-url` 403), 직원 비활성화 → 17초, 진료 권한 회수 → 32초 안에 401(캐시 30초 + 시험 간격), 비밀번호 없음·틀림·Orthanc 꺼짐 → 안내 쪽. `GET/PUT /config`·EMR·nginx 로그에 비밀번호 0건. **큰 영상(⑦)**: 50MB(512×512×100장, 16비트) — 9188 nginx 거쳐 한 번에 **2.8~2.9초**, 100장 한 번에 3.0초, 한 장 0.07초, 렌더 한 장 0.09초, 느린 브라우저(2MB/s 흉내) 25초에도 끊김 없음. Orthanc 직접(9198)은 0.31초 — 차이는 **Docker Desktop의 `host.docker.internal` 구간**(EMR 컨테이너에서 Orthanc로 직접 받아도 2.7초, 중계·nginx 추가분은 거의 0). 약 18MB/s라 100Mbps LAN보다 빠름. nginx는 50MB를 임시 파일에 버퍼(경고 한 줄, 기본 한도 1GB) — **nginx.conf 바꿀 필요 없음**. **남은 것·주의**: ① 쿠키를 복사하면 만료(30분)·계정 비활성까지 그 스터디는 볼 수 있음(HttpOnly라 화면 스크립트는 못 읽음). ② Stone이 EMR과 **같은 출처**에서 돌아 Stone 코드는 EMR 화면의 localStorage(로그인 토큰)에 닿을 수 있음 — Stone은 우리 Orthanc 이미지(버전 고정)의 코드지만, Stone에 XSS가 있으면 영향이 EMR까지 감. **총괄 결정(2026-09-29): 지금은 받아들임. 뷰어를 다른 포트(다른 출처)로 옮기는 것은 v1.5.0 뒤 숙제**(nginx `listen`·compose 포트·Windows 포트 범위 확인(P-1)이 필요). 그때까지 Orthanc 버전을 올릴 때는 Stone 변경 내역에서 보안 고침을 볼 것. ③ 중계 응답의 CSP는 Stone 때문에 `unsafe-eval`·`unsafe-inline`. ④ EMR 컨테이너 → Orthanc를 같은 Docker 네트워크로 붙이면 `host.docker.internal` 구간(위 속도)이 없어짐 — 두 compose를 잇는 일이라 나중에. **원래 문제**: 영상을 보는 모든 직원이 Orthanc 관리자 계정을 씀. 사용자가 `admin` 하나(`docker-compose.yml` `REGISTERED_USERS`). 뷰어(iframe)가 Orthanc에 직접 붙으므로 직원 브라우저가 이 계정으로 로그인해야 하고, 그 계정은 영상 삭제·수정까지 됩니다. **R-1 (2026-09-29)**: `http://localhost:9090/`과 `/stone-webviewer/index.html` 모두 401 → 브라우저가 로그인 창을 띄움. 즉 영상 창을 처음 열 때 Orthanc 관리자 아이디·비밀번호를 쳐야 함(브라우저가 기억하기 전까지). 영상 창(iframe) 안에서 어떻게 보이는지는 아직 화면으로 보지 않음. 해결 선택지: 인계 노트 「P-9 선택지」. 개선안: 읽기 전용 사용자 분리, 또는 EMR이 대신 가져다 주는 방식(프록시).
- **P-10 [보통] 같은 LAN의 누구나 DICOM으로 환자 목록을 조회할 수 있음.** `DICOM_ALWAYS_ALLOW_FIND=true`, `CHECK_CALLED_AET=false`(`docker-compose.yml`) — 등록 안 된 기기도 C-FIND로 저장된 환자·검사 정보를 묻고 C-STORE로 아무 영상이나 넣을 수 있습니다. 장비 등록 없이 쓰려는 의도된 선택(주석)이지만, 장비가 정해지면 `DicomModalities` 등록으로 좁히는 것을 권합니다.
- **P-12 [낮음] ✅ 고침 (2026-09-29, PACS `6c135aa`)** — 비밀번호는 환경 변수에서, 환자는 가짜(`TEST^Patient`, `PX-TEST-0001`, 1980-01-01)로. **남은 것**: 옛 값은 git 기록에 그대로 있음(기록을 고쳐 쓰는 것은 공개 저장소에 push된 뒤라 하지 않음). **원래 문제**: 시험 스크립트에 옛 Orthanc 비밀번호와 실제 인물로 보이는 이름·생년월일이 들어 있음. `bridge/make_demo.py:10,28-30`, `make_chest5.py:9,32-34`. 지금 PACS `.env`의 비밀번호와는 다름을 확인(값은 적지 않음). git 기록에 남아 있으므로, 그 비밀번호를 다른 곳에 썼다면 바꾸는 것을 권합니다.
- **P-13 [낮음] `.env`가 없을 때의 기본 비밀번호.** compose가 `change-me-orthanc`, `change-me-bridge-token`으로 떨어집니다. `setup`/`start.bat`로 설치하면 `.env`가 먼저 생기므로 실제로는 드묾. (브리지 토큰은 2026-09-29에 기본값을 없앰.) **Orthanc 비밀번호 쪽 제안**: compose에서 `${ORTHANC_PASSWORD:?…}`로 바꿔 `.env` 없이는 시작을 거부하게 — 시험해 보니 동작하지만, EMR `offline/pack.ps1`·`pack.sh`(총괄 파일)가 `.env` 없는 PACS 폴더에서 `docker compose build`·`config --images`를 돌려서 **오프라인 키트 만들기가 깨짐**. pack 쪽에서 임시 값(`ORTHANC_PASSWORD=pack`)을 넘기게 함께 바꿔야 하므로 보류.

### 동작 · 기타

- **P-28 [참고] 「이전 검사와 비교」는 Stone을 고치지 않고 짓는다 (2026-10-01, 라이선스).** 4절 「이전 검사와 비교」. 그래서 **화면 나누기와 끌어다 놓기는 의사가 Stone의 단추로** 합니다(나누기는 한 번 하면 기억됨). 한 번에 「누르면 나란히」가 되게 하려면 Stone 안쪽 함수를 불러야 하는데(처음에 그렇게 지었다가 걷어 냄 — 커밋 `2e7a738`), 그것은 직원에게 내주는 Stone을 배포판과 다르게 만드는 일이라 하지 않기로 함. Orthanc 이미지를 올린 뒤에는 `?study=A,B`가 여전히 두 검사를 여는지, 연 검사가 먼저 뜨는지 격리에서 다시 볼 것.
- **P-29 [참고] 영상 쿠키는 「한 번에 한 환자」(2026-10-01).** 새 탭으로 한 환자의 영상을 띄워 둔 채 EMR에서 다른 환자의 검사를 열면, 먼저 띄운 탭은 새 영상을 더 불러오지 못함(이미 받은 것은 보임). 전에도 그랬고, 이제 문서·코드가 그렇게 말함.

- **P-11 [낮음] ✅ 고침 (2026-09-29)** — 값 검사(400), 없는 항목 404, 한 트랜잭션, `scheduled`→order_item `sent`. 누가 부를 수 있는지(로그인만)는 그대로 — 지금 쓰는 곳이 없어 권한은 쓰임새가 생길 때 정함. **원래 문제**: `PUT /api/worklist/:id/status`에 값 검사·트랜잭션 없음. `worklist.routes.js:45-61` — 예: `scheduled`는 worklist_log엔 들어가지만 order_item의 CHECK에 걸려 둘이 어긋남. 로그인만 있으면 누구나 호출 가능. 지금 쓰는 곳 없음.
- **P-15 [낮음] 판독을 덮어쓰면 이전 판독이 사라짐(이력 없음).** `pacs.routes.js:100`. 서명·확정 개념도 없음.
- **P-16 [낮음] 뷰어 창 바깥을 누르면 저장 안 한 판독이 사라짐.** `Consultation.jsx:693`(진료 세션 파일).
- **P-17 [낮음] ✅ 고침 (2026-09-29)** — 피드 주소 예시 `:9080`, `bridge.py` 기본값 9080, 설정 화면 예시 `http://NAS_IP:9090`, 번역 `pacsServerHint`(ko·en·fr, 기존 키 한 줄씩)와 그 한국어 기본 문구도 9090.
- **P-18 [낮음] ✅ 고침 (2026-09-29)** — 워크리스트로 안 간 영상 오더(UID 없음)의 `viewer-url`이 뷰어 첫 화면(PACS의 모든 환자 목록)을 돌려줘서 한 환자 차트 안에서 다른 환자 목록이 열릴 수 있었음. 이제 `url` 빈 값 + `no_study: true`, 안내 문구 키 `px_noStudy`. 진료 영상 창이 `no_study`면 그 문구를 보이는 것은 진료 세션 몫(총괄 전달). 판독 목록의 「영상보기」는 원래 UID가 있을 때만 보임.
- **P-19 [낮음] ✅ 고침 (2026-09-29, 다른 세션)** — 진료 화면(진료 세션 `9dfcedc`)과 수납·약국 화면의 차트 `PatientChart.jsx`(수납 세션 `768eaa9`)가 같은 규칙·같은 `cs_ws*` 키로 보여 줌: Envoyé/전송됨, Réalisé/촬영 완료 …. 워크리스트로 가지 않는 오더에는 상태를 안 보임.
- **P-21 [보통] ✅ 고침 (2026-09-29, S2)** — 영상 판독·뷰어 주소·연결 시험·워크리스트 API가 로그인만 확인했음(어느 직원이든 모든 환자의 영상 판독을 읽음). 4절 표대로 화면 권한으로 좁힘. `bridgeOrAuth`는 권한을 받는 함수가 됨(`bridgeOrAuth('settings')`).
- **P-22 [낮음] ✅ 고침 (2026-09-29)** — 판독 날짜가 `result_at`(UTC ISO)을 `T` 앞에서 잘라 현지 00~03시에 쓴 판독이 전날로 보였음. `RadiologyReadings.jsx`의 `ymd()`를 임상병리 `LabResults.jsx`와 같은 규칙(날짜만 있는 값은 그대로, 시각이 있는 값은 **브라우저의 현지 날짜**)으로. 진료 영상 창의 같은 한 줄은 진료 세션 몫(총괄이 전달). 주의: 이 규칙은 **브라우저 PC의 시간대**를 따릅니다 — 마다가스카르 병원 PC에서는 맞고, 한국 시간으로 된 PC에서는 자정 근처 시각이 한국 날짜로 보임(격리 시험에서 18:40(+03) 취소가 한국 PC에서 다음 날로 보임).
- **P-23 [보통] ✅ 켜짐 (2026-09-29)** — 결과 있는 영상 오더 「취소」(결정 3-B·38-③). 진료 세션 `8e497c2`의 취소 API가 같은 트랜잭션에서 `cancelWorklistForOrder`를 부름. **격리 스택(실제 브리지·Orthanc)에서 확인**: ① 촬영 전(판독만 있음) 취소 → 워크리스트 `cancelled`, 한 바퀴 뒤 `.wl` 삭제 ② 영상 도착(completed) 뒤 취소 → 오더는 `cancelled`, 워크리스트 줄은 `completed` 그대로 ③ 취소 뒤 영상이 늦게 도착 → 브리지는 보고하지 않음(피드에 없음), 「도착」 기록 없음, 그래도 `viewer-url`은 그 UID로 열려 영상은 볼 수 있음, 판독 저장은 409. PACS 몫: 취소 정보 표시·판독 409·`cancelWorklistForOrder`(`pacs.cancel.js`).
- **P-20 [낮음] ✅ 고침 (2026-09-29)** — 브리지가 heartbeat에 `arrivals_error`를 싣고(PACS `6c135aa`), `/bridge-heartbeat`가 detail에 저장, 설정 세션의 `status.routes.js`(`9d7e380`)가 노랑 `status.bridge.arrivals`로 표시. 격리 스택에서 비밀번호 없음·Orthanc 없음 → 노랑, 정상 → 초록 확인. **원래 문제**: 브리지가 Orthanc에 못 물어도 EMR 상태 화면은 초록.
- **P-14 [낮음] UID 루트를 남의 것(`1.2.826.0.1.3680043`)을 씀.** 실무상 충돌 가능성은 매우 낮음. 자체 루트 발급은 선택 사항.
- **P-26 [보통] ✅ 알리게 고침 (2026-09-30, 실장님 클린 설치에서 실제로 겪음)** — 다른 프로그램(PikPak `DownloadServer.exe`)이 `127.0.0.1:9080`을 듣고 있었음. Docker는 `0.0.0.0:9080`에 따로 묶여 브라우저(localhost IPv6·LAN)로는 EMR이 열렸지만, `127.0.0.1`과 컨테이너의 `host.docker.internal`은 그 프로그램으로 가서 브리지가 「480 … Wrong parameters for url」만 받음 — 하트비트 없음, **컨테이너는 healthy**, 장비로 목록이 안 감. 이제: `check-windows-ports.ps1`이 프로그램 이름으로 경고, 브리지가 「Something other than the EMR answered …」를 로그에, 컨테이너 healthcheck가 **피드가 2분 넘게 답하지 않으면 unhealthy**(`.feed_ok`), `setup.ps1`이 끝에서 실제로 닿는지 확인. **격리 시험**: 127.0.0.1에 같은 답(480 text/plain)을 하는 흉내 프로그램 → 포트 검사가 `python … (listening on 127.0.0.1)`로 이름을 댐, 브리지 로그에 위 문장, 150초 뒤 unhealthy → 진짜 EMR로 되돌리면 6초 뒤 healthy. setup의 기다리기 부분은 떼어 내 시험(새 파일 → 닿음 / 옛 파일·없음 → 경고), setup 전체는 돌리지 않음(개발 PC 규칙).
- **P-27 [보통] ✅ 알리게 고침 (2026-09-30, 실제로 겪음)** — 설정의 「EMR이 영상 서버에 닿는 주소」를 이 PC의 LAN 주소(`http://192.168.10.229:9090`)로 바꿔도 아무도 말해 주지 않았음(상태 점 모두 초록, DICOM 시험 통과) — 9090은 127.0.0.1에만 열려 있어 영상 창이 열리지 않음. 원인 절반은 설치 끝 안내의 옛 줄(총괄 `4f9ba04`에서 고침). 이제 저장할 때마다 그 주소로 Orthanc `/system`을 불러 봄(`orthanc_check`), 칸 아래 경고·도움말, 「Par défaut」, 「Tester : visionneuse → serveur d'images」. 상태 줄 `pacs_relay`는 설정 세션 `e7ae327` — 검사 함수(`services/pacs-probe.js`)와 문장(`se_sys_pacsRelay_*`)을 설정 화면과 함께 씀. **격리 시험**: 이 PC의 LAN 주소 → «Pas de serveur d'images à cette adresse», EMR 자신(9188) → «ce n'est pas le serveur d'images qui répond», `ftp://` → «Adresse invalide», 틀린 비밀번호 → 401 «… lancez pair-with-emr.ps1», 맞는 주소 → «L'EMR atteint le serveur d'images.»
- **P-25 [낮음] 옛 포트가 저장된 설정이 남음.** 실행 중 EMR의 `pacs_config.pacs_viewer_url`이 `http://localhost:8090`, `emr_base_url`이 `http://localhost:8080`이었음(총괄, 2026-09-29) → 영상 창이 안 열리는 주소. **코드가 넣은 값이 아님**: 두 칸의 DB 기본값은 처음부터 빈 값(`001_schema.sql`, `pacs.routes.js` `ensureConfig`). 6~7월 설치 당시 안내가 8090·8080이었고(PACS `README.md`·`start.bat` — `4f5320e` 전, EMR `f2ab532` 전, 설정 화면 예시 `NAS_IP:8090` — P-17 전), 사람이 그대로 넣은 값이 2026-07-23 포트를 9090·9080으로 옮길 때 **바꿔 주는 장치 없이 남은 것**. 같은 때 설치한 다른 병원에도 같을 수 있음. 실장님이 설정 화면에서 고침. 막는 방법 후보: ① 상태 화면에서 뷰어 주소가 `:8090`이면 경고(읽기만, 설정 세션과) ② 값이 정확히 옛 기본 주소일 때만 9090으로 바꾸는 마이그레이션(데이터 변경 — 실장님 결정).
- **P-24 [보통] 🟡 만듦 (2026-09-29, 결정 41)** — 6.2 영상 백업(외장 USB, 매일 밤, 새 영상만, 경고·복원). **남은 것**: 현지에서 디스크 준비·예약 작업 등록(실장님), 상태 화면 표시(설정 세션). **원래 문제**: 영상 백업이 없음. EMR 자동 백업은 `pg_dump`(DB)만 — Orthanc 영상과 색인(`storage` 폴더, 바인드 마운트)은 어디에도 백업되지 않습니다. 디스크가 죽으면 영상은 사라지고 EMR에는 「영상 도착」 기록과 판독만 남음. 방법(두 번째 디스크로 `storage` 복사 — Orthanc를 잠깐 멈추거나 Orthanc 백업 기능, 보관 기간, 용량)은 실장님 결정. 6.1 참고.
- **PACS 격리 스택** (실장님 결정 24, 2026-09-29) — PACS 저장소 `docker-compose.session.yml`. PACS 저장소에서 그냥 `docker compose up`을 하면 실행 중인 PACS를 덮어쓰므로(프로젝트·컨테이너 이름·포트 9090·4242·`./storage` 고정) 꼭 이 파일로:
  ```
  docker compose -p bethesda-s-pacs-pacs --env-file <시험용 .env> -f docker-compose.yml -f docker-compose.session.yml up -d --build
  ```
  포트는 **127.0.0.1에만** 웹 9198·DICOM 11298(장비가 닿지 않게), 영상·워크리스트는 이름 붙인 볼륨, 브리지 이미지는 `bethesda-s-pacs-bridge:dev`(실행 중 이미지 이름표를 안 덮음), 브리지는 EMR 격리 스택(9188) 네트워크 `bethesda-s-pacs_default`의 `backend`를 읽음 — EMR 격리 스택을 먼저 띄울 것. `--env-file`에는 시험용 `ORTHANC_PASSWORD`·`BRIDGE_TOKEN`(EMR 격리 DB의 `pacs_config.bridge_token`과 같게). 다 쓰면 `… down`(영상까지 지우려면 `down -v`).
- 브리지는 장비별로 워크리스트를 나누지 않습니다(모든 장비가 모든 오더를 봄). Modality로만 장비가 거를 수 있음.

## 8. 변경 기록

| 날짜 | 내용 | 커밋 |
|---|---|---|
| 2026-09-29 | 위키 첫 작성 — 실제 코드 기준으로 1~7절 채움, 문제 목록 P-1~P-19 | EMR `7b21719`, `0e94457` |
| 2026-09-29 | 토큰 보안(P-2·P-5): 옛 기본값·짧은 토큰 거절, 설정 조회는 settings 권한, 화면에서 토큰 가림, 브리지는 헤더로 전송. P-1에 총괄 확인·조치 분담 기록 | EMR `6e5c63a`(develop `f3a5810`) · PACS `43bd994` |
| 2026-09-29 | 영상 도착 확인(P-7)·환자번호 대조(P-3): 브리지가 Orthanc Stable 스터디를 EMR에 알림, 워크리스트 자동 완료, 판독 목록에 도착·경고 표시, 마이그레이션 801(→ 합칠 때 019) | EMR `6456471`(develop `7cfd6cc`) · PACS `e109157` |
| 2026-09-29 | 2절 직원용 사용법을 프랑스어 화면 기준으로 다시 씀(프랑스어 이름 + 괄호 한국어), 「영상이 안 보일 때」·「환자 번호 경고가 떴을 때」 순서 추가 | EMR `2f9f1fe` |
| 2026-09-29 | `PatientCheck`·`imagesOfRow` export(진료 뷰어 창과 같이 쓰도록), 2절 상태 글자를 진료 세션 번역(Envoyé/Réalisé)에 맞춤, P-3·P-19 갱신. 인계 노트에 P-1 조치 절차서 | EMR `2c15a6b` |
| 2026-09-29 | 낮은 항목 정리: P-20(`arrivals_error`, 비밀값 가림), P-11(작업목록 상태 API), P-12(시험 스크립트), P-17(8090 표기), `PUT /config` 부분 저장. P-13은 오프라인 키트 때문에 제안으로. 절차서에 재부팅 당일·장비 설치 날 확인 목록 | EMR `session/pacs` · PACS `6c135aa` |
| 2026-09-29 | 서버 권한 S2 적용(P-21): viewer-url·readings·test·worklist를 화면 권한으로, worklist 쓰기·dicom-mwl 로그인 경로는 settings만 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | P-22 판독 날짜 현지로, P-23 영상 오더 취소 준비(`pacs.cancel.js`, 취소 정보·409·회색 표시) | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | P-18: UID 없는 오더에서 뷰어 첫 화면 대신 `no_study` + `px_noStudy` | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 2.2 방사선사: 찍기 직전마다 워크리스트를 새로 불러오기 (결정 38-③, 영상 오더 취소와 짝) | EMR `session/pacs` |
| 2026-09-29 | 6.1 「새 PC에 설치할 때(PACS)」(결정 35) — 키트·설치·짝 맞추기·백업 복원 뒤 어긋나는 것, 7절 P-24 영상 백업 없음 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 재부팅 뒤: P-1 해결 기록, 2.4 임시 안내 삭제, P-7에 진짜 Orthanc 응답 확인(R-5), P-9에 R-1(로그인 창), P-25(옛 8090 설정) 새로 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 직원용 2.1 ④(결과 있는 영상 검사 「취소됨」 표시 순서), 2.3 로그인 창 확인됨, 2.4 취소된 검사 모습, 2.6 ⑤(다른 환자 영상 → 취소 표시 → 다시 검사) — 결정 38-③ | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | PACS 격리 스택(9198·11298)으로 진짜 Orthanc 시험: P-7·P-3 끝까지 확인, P-4 1·2단계(accession으로 찾기, `image_study_uid` 802), P-8 확인(내 AE만 거르면 0건 — 브리지로 못 고침) | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-29 | G-1~G-4: `pair-with-emr.ps1/.sh`(토큰을 화면에 안 찍고 짝 맞춤, 복원 뒤에도), `check-windows-ports.ps1`(포트 경고), setup·start.bat의 LAN IP 안내 — 6.1 갱신 | EMR `session/pacs` · PACS `d3d001c` |
| 2026-09-29 | 영상 오더 취소 켜진 뒤 실제 브리지로 확인(P-23 ✅), 2.1 ④ 문구를 영상 전용 물음(`cs_cancelPromptImg`)과 실제 화면에 맞춤 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | **목록에서 체크해 비교**(2.3.1·4절): 영상/판독 목록의 줄마다 체크 칸 + 창 머리 「⇆ Comparer (N)」 → 체크한 검사만 함께 엶(`viewer-url?order_item_ids=`, 서버가 하나하나 다시 확인, 가장 최근 것이 판독 대상). `openedFirst`를 시리즈 목록 순서부터 잡도록 고침(세 검사에서 3번에 1번 어긋나던 것). 프랑스어 설명서 8절 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | 이전 검사와 비교: 단추를 누르면 **그 환자의 허락된 검사를 모두** Stone 목록에(`?study=연 검사,다른 검사,…` — 실장님이 Stone의 환자 보기로 해 보신 모양), 비교 중 「판독 칸은 이 검사의 것」 표시, 페이지의 `?patient=`는 403. 2.3.1·4절, 프랑스어 설명서 8절 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | **이전 검사와 비교를 Stone을 고치지 않는 방식으로 다시 지음**(라이선스 — Stone 페이지에 스크립트를 끼우던 `pacs.viewer.compare.js`를 걷어 냄): 비교 단추·목록은 EMR 영상 창 쪽(`ViewerCompare`), 주소 `?study=연 검사,비교 검사`, 나누기·놓기는 Stone의 단추, 판독 칸 접기, 연 검사가 먼저 뜨게(`openedFirst`). 2.3.1·4절·P-28, 프랑스어 설명서 8절 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | **이전 검사와 비교**(2.3.1, 4절 `viewer-url`·쿠키·`pacs.viewer.compare.js`, 7절 P-28·P-29): 영상 창이 같은 환자의 다른 검사(취소·경고·미도착 제외, 최대 9건)를 함께 열 수 있고, 영상 위 단추 하나로 좌우 나란히. 쿠키는 오더를 열 때마다 새로 씀. 프랑스어 설명서 8절 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | 4절 중계 7·2.5: 영상이 아직 안 온 검사를 열면 빈 영상 창 대신 「아직 오지 않았습니다」 안내, 도착 기록은 있는데 영상 서버에 없으면 「관리자에게」 안내(fr·ko·en). 프랑스어 설명서 메시지 표 두 줄, 6.2 표 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | 2.4·5절: 영상 창을 닫으면 **목록이 그대로 남음**(총괄 `71dedec` — `Consultation.jsx`, `RadiologyReadings.jsx`의 `reload`). PACS 세션은 격리에서 회귀를 보고 문서를 맞춤 | EMR `session/pacs` (인계 노트 참고) |
| 2026-10-01 | 단추 이름: 환자의 영상 검사 목록을 여는 단추·창 제목이 **🩻 Imagerie (영상/판독)**(공용 키 `imagingList`, 총괄 `b828129`). 2.4·2.5·2.6·4·5절과 프랑스어 설명서·순서서의 이름을 맞춤. 판독 칸 «Compte-rendu»는 그대로 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 4절 중계 7: 그림 없는 자료만 온 검사는 영상 창에 빈 칸 대신 한 줄 안내(fr·ko·en). 프랑스어 설명서 메시지 표·순서서 ④ | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 6.3: 모르는 영상 종류도 받음(`ORTHANC__UNKNOWN_SOP_CLASS_ACCEPTED`, 총괄 결정) — 격리 시험·영상 창에서 보이는 것·되돌리기. device-watch: 전용 종류·그림 없는 자료 알림, 「영상 서버 알림」을 DICOM 스레드로 좁힘(W001 뺌) | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 6.3 현지 장비 연결: PACS `device-watch.ps1/.bat`(장비가 하는 일을 사람 말로, `-Detail`·`-Ping`·`-Reset`), 순서서 `wiki/reference/device-connection-onsite.md`, 조사 결과(기본 로그엔 DICOM 없음, 틀린 서버 이름도 받음, 제조사 전용 영상 종류는 조용히 거절) | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 영상 서버 검사를 하나로: 설정 세션의 `services/pacs-probe.js`만 남기고(`pacs.viewer.js`의 두 번째 검사·기본 주소 뺌), 설정 화면이 상태 점의 문장(`se_sys_pacsRelay_*`)을 그대로 씀. 프랑스어 설명서의 「Envoyé」 à revoir 지움(진료 `2a9f5bd`) | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 클린 설치에서 나온 둘: **P-26** 다른 프로그램이 EMR 포트를 차지(포트 검사가 이름을 댐, 브리지 「EMR이 아닌 것이 답함」, healthcheck `.feed_ok`, setup 끝에서 닿는지 확인), **P-27** 영상 서버 주소를 잘못 넣음(저장 때 `/system` 시험 `orthanc_check`, `/test?target=orthanc`, 칸 경고·도움말·「Par défaut」·시험 단추). 3.3·4·6·6.1·7 | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-30 | **영상이 있는 하루 통합 시험**(`wiki/reference/integration-test-imaging-2026-09-30.md`, 가짜 장비 = Orthanc로 진짜 C-FIND·C-STORE). 뒤에 고침: 남의 검사·`?study=` 없는 영상 창 페이지와 비활성 계정에 안내 쪽, 안내 쪽 영어 줄 대비, 취소된 판독 카드의 투명도 → 회색 글자·꼬리표·점선 테두리 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 6.2에 0부터 다시 훑는 시간(한 장 약 5ms, 넉넉히 20ms), 상태 점·상태 창의 「EMR 백업 복사」 줄. 시험 순서서 6번에 실제 문구(한·프), 맨 위에 「이 PC에서는 예약 등록 안 함」 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-30 | 6.2: 디스크를 다른 서버에 가져가도 영상이 빠지지 않게(`last_change`로 Orthanc 확인), 도중에 빠진 디스크 안내, `-Verify` 나이는 파일 시각으로. 실장님용 USB 시험 순서서 `wiki/reference/usb-backup-rehearsal.md` | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 6.2: 밤 영상 백업이 **EMR DB 백업도 같은 외장 디스크로** 복사(`emr-backups`, 해시·gzip 확인, EMR과 같은 보존 규칙), 보고 칸 `emr_backup*`, `-Verify`에 EMR 백업, 디스크 보관 경고. PACS README의 깨진 두 줄(`.\restore…`) 고침 | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 현지 직원용 프랑스어 설명서 `wiki/manual-fr/pacs.md`, v1.5.0 변경 내역 초안 `wiki/reference/changelog-1.5.0/pacs.md`, 오더 연동 탭 오류 문구 번역(서버 검사 400 + `pxMessage`), 7절 P-9에 같은 출처 결정 | EMR `session/pacs` (인계 노트 참고) |
| 2026-09-29 | **P-9 C: EMR이 영상을 중계**(`pacs.viewer.js`, 마이그레이션 035(세션 번호 803) `orthanc_url`·`orthanc_password`, 서명 쿠키, 허용 목록, 뷰어용 CSP). `pair-with-emr`가 Orthanc 비밀번호도 넣음, Orthanc 9090은 127.0.0.1만, Stone 시작 안내 끔. 2.3·2.5(로그인 없음, 안내 문구), 4절 중계, 6절 설정 칸, 6.1 순서, 7절 P-9 ✅(보안 시험·50MB 수치) | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
| 2026-09-29 | 영상 백업 만듦(6.2, PACS `image-backup.ps1` 등 5개, EMR `POST /image-backup-report`), 6.1을 새 도구(check-windows-ports·pair-with-emr·영상 복원) 기준 설치 순서로 다시 씀, 2.6에 취소 뒤 늦은 영상 | EMR `session/pacs` · PACS `session/pacs` (인계 노트 참고) |
