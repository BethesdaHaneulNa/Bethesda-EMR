# 설계안 — 영상 인쇄 · 영상 내려받기 · 영상 CD 반출 프로그램

> 2026-10-01 · PACS 세션 → 총괄 → 실장님. **아직 짓지 않았습니다.** 아래 9절의 결정이 나면 10절의 차례대로 짓습니다(차례가 바뀌었습니다 — 고침 참고).
> 실장님: 「마다 많은 병원이 그냥 프린터로 뽑아 주는 걸로 알지만 CD 반출이 필요할지도」 → 「영상 인쇄, 영상 내려받기 둘 다 필요할 것 같다. CD는 아직도 보안 때문에 CD로 하는 경우가 너무 많다, USB 안 받는다」.
> **보탬(같은 날)**: 실장님이 CD 반출의 모습을 정하심 — 「EMR이 CD 굽는 건 안 되는 거야? 그러면 CD 굽는 프로그램을 따로 만드는 건? 한국에서도 PACS 따로, 반출용 프로그램 따로 있다」 → 「굳이 CD 반출 요청 그런 기능 넣지 말고, 그냥 반출 프로그램이 환자 차트번호로 조회하고, 그 환자의 어떤 것을 반출할지 클릭하고, 영상 크기 알려 주고, CD 인식하면 『이 CD에 구울까요』 물어보고 — 그런 식」. 그래서 **세 갈래**(인쇄 · 내려받기 · 반출 프로그램)이고, EMR 안의 「반출 요청 대기함」은 만들지 않습니다. 반출 프로그램은 4-2절. 총괄 몫의 결정(ㄱ~ㄹ)은 추천대로 정해짐(9절).
> **고침(같은 날, 세 번째)**: ① 실장님 「jpg 는 넣지 마」 → 묶음에서 **JPG 사본 · `INDEX.HTM` · `IHE_PDI`를 뺐습니다**. 디스크는 `DICOMDIR` + `IMAGES` + `README.TXT` (+ 뷰어). EMR은 Orthanc의 묶음을 **손대지 않고 그대로** 넘기고, `README.TXT`는 반출 프로그램이 씁니다(4절). ② **뷰어(Weasis)를 일찍 해 봅니다** — 차례가 ① 인쇄 → ④ 반출 프로그램 → ③ 뷰어 → ② EMR 화면의 ZIP 내려받기(10절). Weasis를 설치 없이 폴더째 돌리는 길은 Weasis의 소스에서 확인했습니다(5-2절). ③ **이 PC에 굽는 장치가 연결됐습니다**(4-2절) — 진짜로 굽기 전에는 반드시 총괄에 먼저 알립니다.
> **시작(같은 날)**: 실장님 「일단 위아시스로 진행하는 걸로 해 보자」. 나머지 물음은 **총괄이 추천값으로 정함(실장님이 바꿀 수 있음)** — 9절. **① 영상 인쇄는 지었습니다**(`modules/pacs.md` 2.4.3절). 판독소견은 디스크에 넣지 않습니다(실장님: 「판독소견은 어차피 프린트해서 줄 거니까 같이 넣을 필요 없어. 영상을 넣고 보는 것에 충실하자」). 굽기 시험은 **먼저 USB의 폴더를 CD라고 생각하고**(`D:\CD-TEST\` 아래에만 — 실장님: 「일단 CD 로 바로 가지 말고, USB D 드라이브에 폴더 하나 만들어서 거기를 CD 라 생각하고」), 진짜 CD는 그 뒤에 총괄에 알리고.
> **결정(2026-10-02, 실장님): Weasis는 쓰지 않습니다**(「위아시스는 버려」) — 선택 사항으로도 두지 않음. 아래 5절 · 5-2절 · 9절 · 10절의 Weasis 이야기는 **해 본 기록**으로 남기고, 뷰어는 우리 것으로 갑니다.
> **이어지는 설계안(2026-10-02)**: 실장님 「뷰어가 너무 크네」 → CD에 넣는 **작은 「보기 전용」 뷰어** — [cd-mini-viewer-design.md](cd-mini-viewer-design.md). 뷰어를 넣은 두 번째 CD 굽기와 `cd-viewer`를 설치 묶음에 넣을지는 그 결정 뒤로 미룸.
> 「확인함」이라고 적은 것은 격리 스택(EMR 9188 · PACS 9198, 실행 중과 같은 Orthanc 이미지)에서 실제로 해 본 것이고, 라이선스는 각 프로젝트의 원문에서 읽은 것입니다. 「확인 필요」는 아직 해 보지 않은 것입니다.

## 1. 한눈에

| | 무엇 | 받는 쪽이 필요한 것 |
|---|---|---|
| 🖨 **영상 인쇄** | 검사의 영상을 A4 종이에(한 장에 1·2·4·6장). 병원 머리, 환자·검사 정보 | 없음 — 종이 |
| 💿 **영상 CD 반출 프로그램** | 따로 실행하는 Windows 프로그램(PACS 폴더): 차트번호로 조회 → 검사 체크 → 크기 → 빈 디스크를 넣으면 「이 CD에 구울까요?」 → 굽기 → 확인 → 꺼냄. 디스크에는 **표준 영상 CD**(맨 위에 `DICOMDIR`, 원본 영상은 `IMAGES`) + `README.TXT`. 「ISO 파일로 저장」도. **JPG 사본은 넣지 않습니다** | 영상(DICOM)을 읽는 프로그램 — 병원의 PACS·뷰어. 없는 곳은 디스크에 넣은 뷰어(아래) |
| 🧩 **뷰어 같이 넣기**(선택) | 디스크 안에 영상 뷰어(Weasis)도 — 「VOIR.BAT」 하나를 더블클릭. 자동 실행은 없음 | Windows 64비트 PC — 5절. **일찍 한 장 구워서 해 봄** |
| 💾 **영상 내려받기**(EMR 화면) | 검사를 **ZIP 하나**로(안은 `DICOMDIR` + `IMAGES`). USB로 주거나 반출 프로그램이 없는 PC에서 쓰는 길. **맨 나중 — 필요해질 때** | 위와 같음 |

Orthanc·Stone은 **고치지 않습니다**. 영상은 Orthanc의 공식 REST로만 가져옵니다(인쇄의 그림: `/instances/{id}/rendered`, CD 묶음: `/tools/create-media-extended` — 둘 다 격리에서 확인함).

## 2. 화면 — 단추가 어디에

**영상/판독 창의 검사 상세**(오른쪽), 「Images」 줄 아래에 단추를 더합니다 — **①에서는 「🖨 Imprimer les images」 하나**, 「💾 Télécharger les images」와 목록 위의 「💾 Télécharger (N)」은 ②(맨 나중)에서. 아래 그림은 둘 다 들어간 뒤의 모습입니다. 지금 있는 것은 그대로(「🖨 Imprimer」 = 판독 보고서, 「🖼 Voir image」, 주황색 「⇄ Corriger la demande…」).

```
┌ 🩻 Imagerie   26-00001 · RAKOTO Jean ───────────────────────────────── [Fermer ✕] ┐
│ [⇆ Comparer (0)] [🖨 Imprimer (0)] [💾 Télécharger (0)] [Tout décocher] │ Type ▾ … │
│ ☐ 2026-10-01  US  Upper Abdomen US   3 image(s)  ✓ RABE │  US  Upper Abdomen US     │
│ ☐ 2026-10-01  CR  Chest PA           2 image(s)  ✓ RABE │        [🖨 Imprimer] [🖼 Voir image]
│ ☐ 2026-09-30  US  Carotid US         en attente         │  Demandé le  2026-10-01    │
│ …                                                        │  Images      3 image(s) reçue(s) · 14:22
│                                                          │     [⇄ Corriger la demande…]
│                                                          │     [🖨 Imprimer les images] [💾 Télécharger les images]   ← 새로
│                                                          │  🩻 Compte-rendu …         │
└──────────────────────────────────────────────────────────┴───────────────────────────┘
```

- **한 검사**: 상세의 두 단추. **여러 검사**: 목록 위 줄(체크 칸 위)에 「💾 Télécharger (N)」 하나를 더함 — 체크한 검사들을 한 묶음으로(한 환자의 것만 — 목록이 환자별이라 저절로). 여러 검사를 한꺼번에 **인쇄**하는 것은 넣지 않습니다(검사마다 고를 것이 달라서).
- 영상이 없거나 취소된 검사에서는 두 단추가 흐립니다(이유는 마우스를 올리면).

**🖨 영상 인쇄 창**(판독 보고서 미리보기 창과 같은 모양):

```
┌ 🖨 Images de l'examen ── Langue: [FR] EN KO ── Par page: 1 [2] 4 6 ── Clarté: [Normale] + ++ ─ [Fermer ✕] ┐
│ ☑ ▣ S1·1   ☑ ▣ S1·2   ☑ ▣ S2·1   ☐ ▣ S2·2  …      (작은 그림 — 눌러 넣고 빼기)   3 / 12 choisies      │
│ ┌─────────────── A4 미리보기 ───────────────┐                                                        │
│ │ Clinique Bethesda          IMAGES          │                                                        │
│ │ NOM RAKOTO Jean   N° dossier 26-00001  M·41 │                                                        │
│ │ Examen: Upper Abdomen US     2026-10-01     │                                                        │
│ │ ┌──────────┐ ┌──────────┐                   │                                                        │
│ │ │  그림 1   │ │  그림 2   │                   │                                                        │
│ │ └ S1 · 1 ──┘ └ S1 · 2 ──┘                   │                                                        │
│ └───────────────────────────────── 1 / 2 ────┘                                                        │
│ L'impression est enregistrée dans le dossier.                         [🖨 Émettre et imprimer]          │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**💾 내려받기 창**(맨 나중에 짓는 것 — 10절. JPG 사본·뷰어 체크는 없음 — 뷰어는 반출 프로그램이 넣음):

```
┌ 💾 Télécharger les images (CD) ─────────────────────────────────────────────── [Fermer ✕] ┐
│ RAKOTO Jean · 26-00001                                                                     │
│ ☑ 2026-10-01  US  Upper Abdomen US   3 images   1,2 Mo                                     │
│ ☑ 2026-10-01  CR  Chest PA           2 images   14 Mo                                      │
│ Total : 5 images · 15 Mo — tient sur un CD (700 Mo)                                        │
│ Après le téléchargement : 1. ouvrez le fichier ZIP  2. copiez TOUT son contenu sur le CD … │
│                                                              [💾 Préparer le fichier]       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. 🖨 영상 인쇄 — 어떻게

- **종이의 틀**: 판독 보고서(`documents/imaging-report.jsx`)와 같은 틀·같은 글꼴. 머리에 병원 이름 · 환자 이름 · 차트번호 · 성별/나이 · 검사 이름 · 검사일. 긴 이름은 판독 보고서와 같은 규칙(줄이지 않고 글자를 줄이고 줄을 늘림). 영상마다 작은 꼬리말 「시리즈 번호 · 영상 번호」(시리즈 설명이 있으면 함께). 쪽마다 아래에 쪽 번호. **문서 번호는 종이에 없음**(판독 보고서와 같게), 발급 일시만 작게.
- **배치**: 한 장에 1 · 2 · 4 · 6장 가운데 고름(기본 2). 그림은 비율을 지켜 칸에 맞춤 — 잘리지 않음.
- **인쇄 언어**: 판독 보고서와 같은 규칙 — 프랑스어가 기본, 창에서 FR/EN/KO.
- **그림**: 새 서버 길 `GET /api/pacs/export/image?order_item_id=&instance=&w=`(로그인 필요)이 Orthanc의 `/instances/{id}/rendered`(JPEG)를 받아 넘깁니다. 그 영상이 그 오더의 검사에 속하는지 서버가 확인합니다. 격리에서 확인함: `rendered`는 PNG/JPEG로 나오고 너비를 줄 수 있음(`?width=1200`, 한 장 2ms).
- **흑백 레이저에서의 밝기**: 초음파·X-ray는 바탕이 검어 레이저 프린터에서 뭉개지고 토너를 많이 씁니다. 창에 **「Clarté: Normale / + / ++」**(밝기·대비를 올림)를 두고, 종이에 찍히는 그림에만 적용합니다(영상 자체는 안 바뀜). 진짜 프린터에서 어느 값이 맞는지는 **확인 필요**(현지 프린터로).
- **큰 검사**: 처음에는 **앞의 12장까지만** 골라져 있고 나머지는 눌러서 넣습니다. 한 번에 **48장(=6장 배치로 8쪽)까지**. 여러 프레임짜리(동영상처럼 넘어가는 초음파)는 **첫 프레임만** — 꼬리말에 「(1 / N프레임)」.
- **발급 기록**: 서류 엔진으로 발급(`POST /api/documents`, 새 서식 코드 `imaging-images`) — 📄 문서 창의 이력에 나오고 다시 인쇄할 수 있음. 기록에는 **어느 검사의 어느 영상(번호)·배치·언어**만 넣고 그림은 넣지 않습니다(다시 인쇄할 때 영상 서버에서 다시 가져옴). `registry.js`에 올리는 것은 판독 보고서 때처럼 진료 세션/총괄 몫.
- 종이 아래 작은 글 한 줄(정할 것 9-가): **「Images de référence — non destinées au diagnostic」**. 종이로 뽑은 그림은 진단용 화질이 아니어서 받는 병원이 오해하지 않게.

## 4. 💿 디스크에 들어가는 것 — 묶음의 모양

```
DICOMDIR                  ← 표준 목록 파일(맨 위). 병원의 PACS·뷰어가 이것을 읽음. Orthanc가 만듦
IMAGES/
   IM0, IM1, IM2 …        ← 원본 DICOM 파일(그대로). Orthanc가 붙인 이름 — 표준이 요구하는 짧은 대문자 이름
README.TXT                ← 읽을거리(프랑스어가 먼저, 그다음 영어). 반출 프로그램이 씀
(VIEWER/ …                ← 「뷰어 포함」을 체크했을 때 — Weasis 폴더째(5-2절)
 VOIR.BAT)                ← 뷰어를 켜는 파일 하나. 자동 실행 파일(AUTORUN.INF)은 넣지 않음
```

- **지은 뒤 달라진 것**: 길은 `GET /export/sizes`를 따로 두지 않고 **`GET /export/patient?chart_no=`** 하나가 환자 · 병원 정보 · 검사 목록 · 크기를 함께 줍니다(프로그램이 EMR의 다른 길을 여럿 부르지 않게). 이미지 파일의 기본 한계가 650MB라서 ISO 저장은 한계를 풀었습니다(687MB로 겪음). 자세한 것은 `modules/pacs.md` 2.4.4절 · 4절.
- **JPG 사본을 넣지 않습니다**(실장님 결정). 그래서 `INDEX.HTM`(브라우저 미리보기 쪽)과 `IHE_PDI/`(JPG 폴더)가 없습니다. **뒤따르는 것**: 받는 쪽에 영상(DICOM)을 읽는 프로그램이 없으면 이 디스크를 볼 길이 없습니다 — 병원은 자기 PACS·뷰어로 읽지만, 환자나 작은 의원은 못 봅니다. 그래서 「뷰어 포함」이 되는지를 **일찍** 확인합니다(5절 · 10절).
- **IHE 규격의 이름 확인 숙제는 없어졌습니다**: `INDEX.HTM` · `IHE_PDI`가 빠져서 그 규격을 따른 디스크라고 내세우지 않습니다. 이 디스크는 「`DICOMDIR`이 있는 표준 DICOM 디스크」입니다. `README.TXT`라는 이름은 그대로 둡니다(짧은 대문자 이름이라 어느 디스크 형식에서나 안전 — `LISEZ-MOI.TXT`는 붙임표 때문에 이 PC의 ISO 시험에서 이름이 바뀌었음).
- **EMR은 Orthanc의 묶음을 그대로 넘깁니다(더 단순한 쪽으로 정리)**: `POST /tools/create-media-extended {Resources: [검사들], Synchronous: true}`의 응답(ZIP)을 **뜯지도 덧붙이지도 않고** 그대로 흘려보냅니다. 격리에서 확인함: ZIP 맨 위에 `DICOMDIR`과 `IMAGES/IM0…`, 여러 검사가 한 `DICOMDIR`로, 검사 55건(83장)을 0.06초, 첫 바이트가 0.01초 만에 나옴. 이렇게 하면
  - 전에 「직접 짓기」로 정했던 **ZIP 쓰는 코드(결정 ㄹ)가 필요 없습니다** — EMR 쪽은 「권한 확인 → 기록 한 줄 → 그대로 넘김」뿐.
  - 우리 쪽의 4GB 한계(ZIP의 옛 형식)도 없습니다. 큰 묶음은 Orthanc가 큰 형식으로 만듭니다 — **큰 묶음(수백 MB~)은 확인 필요**. 실제 한계는 디스크 크기(CD 700MB / DVD 4.7GB).
  - 서버 메모리에 통째로 올리지 않고, 임시 파일도 만들지 않습니다.
- **`README.TXT`는 반출 프로그램이 씁니다**: 프로그램이 묶음을 받아 임시 폴더에 풀고, 그 옆에 `README.TXT`를 써서 굽습니다. 환자 · 검사 목록 · 만든 날은 프로그램이 이미 알고 있고, 병원 이름 · 연락처는 EMR에서 받습니다(어느 길로 받을지는 지을 때 확인). 글자가 깨지지 않게 저장하는 형식(메모장에서 프랑스어 악센트)은 **지을 때 확인**.

```
CLINIQUE BETHESDA — IMAGES MÉDICALES (DICOM)
Patient : RAKOTO Jean — N° dossier 26-00001
Examens : 2026-10-01  US  Upper Abdomen US (3 images)
          2026-10-01  CR  Chest PA (2 images)
Disque créé le 2026-10-01 — Clinique Bethesda, <adresse · téléphone>

Ce disque contient des images médicales au format DICOM (fichier DICOMDIR, dossier IMAGES).
Pour les voir : ouvrez ce disque avec votre logiciel d'imagerie (PACS / visionneuse DICOM).
(뷰어를 넣었을 때) Sans logiciel : double-cliquez sur VOIR.BAT (Windows 64 bits). Le démarrage
depuis le disque est lent ; la visionneuse (Weasis) n'est pas un dispositif médical certifié.
— English —  (같은 내용)
```

- **반출 프로그램이 받는 길**: `GET /api/pacs/export/bundle?order_item_ids=…&medium=disc|iso|folder` — 로그인 토큰을 실어 부릅니다. 프로그램은 브라우저가 아니어서 요청에 토큰을 실을 수 있으므로 **「한 번 쓰는 표」가 필요 없습니다**. (그 표는 브라우저가 파일을 바로 디스크에 저장하게 하려던 것 — EMR 화면의 내려받기(②)를 지을 때 만듭니다.)
- **서버가 확인하는 것**: 그 검사들이 **한 환자의 것**인지, 영상이 있는지, 취소된 오더가 아닌지, 「다른 오더로 옮기는 중」이 아닌지, (결정 9-마에 따라) 환자 번호 경고가 없는지. 하나라도 어긋나면 묶음을 만들지 않습니다.
- **크기**: `GET /studies/{id}/statistics`(`DicomDiskSizeMB`)로 검사마다 미리 보여 줍니다(격리에서 확인함). 새 길 `GET /api/pacs/export/sizes?order_item_ids=…`.
- **nginx**: 지금 설정(`frontend/nginx.conf`)에는 응답 크기 제한이 없고, 읽기 시간 제한은 「60초 동안 한 바이트도 안 올 때」라 흘러가는 동안은 끊기지 않습니다. nginx가 중간에 디스크로 받아 두지 않도록 응답에 `X-Accel-Buffering: no`를 붙입니다 — **nginx 설정 파일은 안 고쳐도 될 것으로 봄(확인 필요, 600MB 시험 묶음으로)**.
- **EMR 화면의 ZIP 내려받기(②)** — 맨 나중, 필요해질 때: 같은 묶음을 브라우저로 내려받는 창. ZIP 안은 `DICOMDIR` + `IMAGES`뿐(`README.TXT` 없음 — 넣어야 한다면 그때 ZIP에 덧붙이는 길을 다시 봄). 풀어서 USB에 복사하거나 탐색기로 굽습니다.

## 4-2. 💿 ④ 영상 CD 반출 프로그램 — 따로 실행하는 Windows 프로그램

**무엇**: PACS 폴더에 두는 `cd-export.bat` + `cd-export.ps1`(device-watch · image-backup과 같은 방식 — PowerShell, 더블클릭). 창이 있는 프로그램입니다(Windows에 들어 있는 WinForms를 PowerShell에서 씀). **아무것도 설치하지 않고, 레지스트리·예약 작업을 건드리지 않습니다.** 굽기는 Windows에 들어 있는 굽기 부품(IMAPI2)으로 — 남의 굽기 프로그램을 넣지 않습니다. 화면 글은 프랑스어 기본(`-Lang ko` / `en`).

```
┌ Bethesda — Copie des images sur CD ────────────────────────────────────────────── [—][✕] ┐
│ Connecté : RASOA Lalao (Paiement)                                          [Se déconnecter] │
│ N° dossier : [ 26-00001 ] [Chercher]      → RAKOTO Jean · né le 1985-04-12 · M             │
│ ┌──┬────────────┬──────┬──────────────────────────┬─────────┬─────────┐                    │
│ │☑ │ 2026-10-01 │ US   │ Upper Abdomen US         │ 3 images│  1,2 Mo │                    │
│ │☑ │ 2026-10-01 │ CR   │ Chest PA                 │ 2 images│   14 Mo │                    │
│ │☐ │ 2026-09-30 │ US   │ Carotid US               │ en attente        │   (못 고름)         │
│ └──┴────────────┴──────┴──────────────────────────┴─────────┴─────────┘                    │
│ Sélection : 2 examens · 5 images · 15 Mo        ☐ Ajouter la visionneuse (+ … Mo)          │
│ Graveur : E:  —  CD-R vierge, 700 Mo libres            ✔ tient sur ce disque               │
│ [ Graver ce CD… ]   [ Enregistrer en fichier ISO… ]   [ Enregistrer dans un dossier… ]     │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  Gravure en cours… 01:12                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**흐름**:
1. 실행 → **EMR 계정으로 로그인**(아이디·비밀번호 → EMR의 로그인 길 → 토큰은 프로그램이 켜져 있는 동안 메모리에만. 파일에 적지 않음).
2. **차트번호**를 치고 조회 → 환자 이름·생년월일·성별을 보여 줌(맞는 환자인지 눈으로 확인).
3. 그 환자의 **영상 검사 목록**(날짜 · 종류 · 검사 이름 · 장수 · 크기) — 체크. 영상이 없는 검사·취소된 검사·(결정 마에 따라) 환자 번호 경고가 있는 검사는 고를 수 없음.
4. 아래 줄에 **합계 크기**와, 디스크가 들어 있으면 **그 디스크에 들어가는지**. 프로그램이 2초마다 드라이브를 봐서 빈 디스크를 넣으면 「CD-R vierge, 700 Mo libres」로 바뀝니다.
5. **「Graver ce CD…」** → 「Graver 2 examens (15 Mo) de RAKOTO Jean sur le CD du lecteur E: ?」 → 예.
6. 받기(EMR에서 4절의 묶음을 — 이 PC의 임시 폴더로) → 풀기 → `README.TXT` 쓰기(→ 체크했으면 `VIEWER` · `VOIR.BAT` 넣기) → 굽기 → **확인**(구운 디스크의 파일을 다시 읽어 받은 것과 해시가 같은지) → 디스크 꺼냄 → 「Terminé. Écrivez le nom du patient et la date sur le disque.」 → 임시 폴더를 지움.

**디스크 · 드라이브의 경우**:

| 경우 | 프로그램이 하는 것 |
|---|---|
| 굽는 드라이브가 없는 PC | 「Aucun graveur sur ce PC」 — 「ISO 파일로 저장」과 「폴더로 저장」은 됨 |
| 디스크가 없음 | 「Insérez un disque vierge」, 넣으면 스스로 알아봄 |
| 빈 CD-R / DVD-R | 종류와 남은 크기를 보여 주고 굽기 |
| 이미 쓴 디스크(다시 못 쓰는 것) | 굽지 않음 — 「Ce disque n'est pas vierge」 |
| 다시 쓸 수 있는 디스크(CD-RW/DVD-RW)에 무언가 있음 | **굽지 않음**(남의 자료를 지우지 않음). 지우고 굽게 할지는 결정 9-아 |
| 용량 초과 | 굽지 않음 — 「15 Mo de trop : décochez un examen ou utilisez un DVD」. 여러 장에 나눠 굽기는 처음에는 안 함(검사를 나눠 두 번 구우면 됨) |
| 굽는 도중 실패(디스크 불량 등) | 「Ce disque est à jeter」, 다른 디스크로 다시. 받은 묶음은 다시 받지 않음 |
| 확인에서 어긋남 | 「La vérification a échoué — ne remettez pas ce disque」 |

**자료는 EMR을 거쳐서**(총괄 추천대로): 프로그램은 Orthanc에 직접 가지 않습니다. EMR의 길만 씁니다 — 로그인, 환자 찾기(지금 있는 길), 그 환자의 영상 검사 목록(지금 있는 `GET /api/pacs/readings/patient/:id`), 크기(새 길), 묶음 받기(4절의 `export/bundle` — 로그인 토큰으로. 「한 번 쓰는 표」는 쓰지 않음). 그래서 ① 영상 서버 비밀번호가 프로그램에 없고 ② 서버 PC가 아닌 PC에서도 되고(EMR에 닿으면 됨) ③ 권한·기록이 한 곳입니다. EMR 주소는 프로그램 옆의 작은 설정 파일(`cd-export.ini` — 처음 켤 때 물어 적어 둠; 비밀값은 적지 않음).

**권한**: EMR의 권한 그대로 — 진료 또는 수납(결정 9-라와 같이). 로그인한 계정에 그 권한이 없으면 목록부터 거절됩니다.

**기록**: 반출 한 번에 변경 기록 한 줄(`pacs.images.export`) — 누가 · 환자 · 어느 검사들 · 영상 몇 장 · 크기 · **매체**(`zip` = EMR 화면 / `disc` · `iso` · `folder` = 반출 프로그램). 줄은 **묶음을 받아 갈 때** 적습니다(그때 자료가 서버를 떠남 — 그 뒤 굽기가 실패해도 기록은 남음).

**이 PC에 남는 것**: 받은 묶음은 사용자 임시 폴더 아래(`%TEMP%` 안의 `BethesdaCD`)에 풀고, 끝나면(성공·실패·취소 모두) 지웁니다. 다음에 켤 때 남은 것이 있으면 지웁니다. 「ISO 파일로 저장」·「폴더로 저장」으로 만든 것은 직원이 고른 자리에 남습니다 — 환자 영상이라는 안내를 띄움.

**뷰어**: 프로그램 옆에 `cd-viewer` 폴더(그 안에 `Weasis.exe`)가 있으면 「☐ Ajouter la visionneuse (+ … Mo)」 체크 칸이 나옵니다. 체크하면 그 폴더를 디스크의 `VIEWER` 아래에 **그대로** 복사하고 `VOIR.BAT` 하나를 맨 위에 씁니다. **자동 실행 파일은 쓰지 않습니다.** 뷰어를 EMR의 묶음에 넣지 않으므로 EMR·compose를 안 건드립니다. 이 체크 칸은 ③에서 「한 장 구워 켜지는 것」을 본 뒤에 넣습니다(5-2절 · 10절).

**이 PC에서 확인한 것**(시스템을 바꾸지 않는 범위):
- Windows의 굽기 부품(IMAPI2) 있음 · WinForms 있음 · Windows PowerShell 5.1.
- 드라이브 없이 **ISO 파일을 만드는 것은 됨**(시험 폴더 → 79,872바이트의 `.iso`, CD 표준 표시 `CD001`, 맨 위에 `DICOMDIR` · `IMAGES` 등).
- **굽는 장치가 연결됨**(전에는 0대였음): `Slimtype DVD A DS8A3S`(USB, 펌웨어 HA28), 드라이브 글자 `G:`. 들어 있는 디스크: **CD-R, 빈 디스크, 359 844섹터 = 702.8MB**. 「읽기만 하는 조회」로 확인함 — 쓰지 않았고 트레이도 움직이지 않았습니다.

**굽기 시험의 약속**: 굽기 시험은 실장님의 디스크를 한 장씩 씁니다(CD-R은 한 번 쓰면 끝). **진짜로 굽기 전에는 반드시 총괄에 먼저 알리고**(총괄이 실장님께 여쭘), 그 전까지는 ISO 저장으로 확인합니다. 드라이브는 실장님 것이니 트레이를 열고 닫는 동작도 굽기 시험 때만 합니다.

**디스크를 아끼는 시험 차례**(두 장이면 됩니다):
- **굽지 않고 확인하는 것**: 로그인 · 조회 · 목록 · 크기 · 받기 · 풀기 · `README.TXT` · ISO 저장 · 폴더 저장 · 만든 ISO를 열어 내용 보기 · 구운 것과 같은 폴더를 다른 Orthanc(격리 9196)에 올려 `DICOMDIR`과 영상이 읽히는지 · 드라이브가 없을 때의 안내(장치를 뽑지 않고 프로그램 안에서 흉내) · **빈 디스크 알아보기**(지금 들어 있는 CD-R로 — 쓰지 않음) · **용량 초과**(큰 시험 묶음으로 — 굽기 전에 막히는지) · 기록 한 줄 · 임시 폴더 지우기.
- **1장째(④ — 뷰어 없이)**: 굽기 · 진행 표시 · 확인(구운 파일을 다시 읽어 해시 비교) · 꺼냄. 그 뒤 **같은 디스크를 다시 넣어** 「빈 디스크가 아님」으로 거절되는지(디스크를 더 쓰지 않음), 탐색기와 격리 Orthanc에서 읽히는지.
- **2장째(③ — 뷰어 포함)**: 굽기 → `VOIR.BAT`로 켜지는지 · 켜지는 시간 · 디스크에서 차지하는 크기.
- **이 PC에서 못 하는 것**: 다시 쓸 수 있는 디스크(CD-RW 등)의 경우 — 그런 디스크가 있어야 함 / 굽는 도중 실패(불량 디스크) — 일부러 만들 수 없음 / DVD.

**지으면서 풀 것**: 굽는 동안 막대가 차오르게 하려면 굽기 부품의 진행 신호를 받아야 하는데 PowerShell만으로는 까다롭습니다 — 작은 C# 조각을 그 자리에서 컴파일해 쓰거나(ISO 저장에서 이미 그렇게 함), 안 되면 「굽는 중… 경과 시간」만 보입니다.

## 5. 💿 CD에 뷰어를 같이 넣기 — 조사 결과

| 뷰어 | 라이선스(원문에서 확인) | CD에 넣어 나눠 줘도 되나 | 그 밖에 |
|---|---|---|---|
| **Weasis** (4.7.3, 2026-08) | 저장소의 `LICENSE`: **`EPL-2.0 OR Apache-2.0`**(둘 중 고름). README: "Weasis is dual-licensed under the EPL 2.0 and Apache 2.0" | **됨** — 두 라이선스 모두 다시 배포를 허락(라이선스 글과 고지를 함께 넣어야 함) | 설치 프로그램에 Java가 들어 있음(Windows MSI 54.6MB). Weasis 자신이 「CD에 뷰어 넣기」 기능을 갖고 있고 그 방법이 소스에 있음 — 5-2절. 「Windows x86-64만」, **「CD에서 바로 돌리면 느리다」**(Weasis 설명서). 「인증된 의료기기가 아님 — CE·FDA 없음」(처음 켤 때 동의 창) |
| **MicroDicom** | EULA: "free for non-commercial use, but for commercial use the end user have to purchase license key"; "may not permit other individuals or entities to use or have access to the SOFTWARE PRODUCT"; 백업 사본만 허락 | **안 됨(그대로는)** — 다른 사람에게 주는 것을 허락하지 않음. CD용 판은 따로 있으나 조건은 그 회사에 물어야 함 | 진단에 쓰지 말라고 적혀 있음 |
| **RadiAnt** | 제품 쪽: 「배포하려면 유료 라이선스가 필요, 시험판은 시험용」 | **돈을 내면 됨** | Windows만 |
| **DWV** | GPL-3.0 | 됨(소스 제공 의무) | 웹 뷰어 — CD에서 파일을 스스로 읽지 못함(브라우저가 막음), 받은 사람이 파일을 끌어다 놓아야 함. CD에는 맞지 않음 |
| **뷰어 없이** | — | — | 병원은 `DICOMDIR`로 자기 PACS·뷰어에 읽어 들임. **JPG 사본이 없으므로** 그런 프로그램이 없는 곳(환자 · 작은 의원)은 디스크를 볼 수 없음 |

**추천(고침)**: 뷰어는 **Weasis**, 「뷰어 포함」은 **켜고 끄는 체크**로. JPG 사본을 빼면서 뷰어가 「있으면 좋은 것」에서 「없으면 못 보는 곳이 생기는 것」이 됐으므로, **④(반출 프로그램) 바로 다음에 ③으로 한 장 구워서** 켜지는지 · 크기 · 켜지는 시간을 잽니다. 되면 체크 칸을 넣고, 안 되면(너무 느리거나 받는 PC가 막으면) `README.TXT`에 「Weasis를 내려받아 설치하고 이 디스크를 여세요」를 적는 것으로 물러납니다.

### 5-2. Weasis 4를 설치 없이 폴더째 돌리는 길 — 원문에서 확인한 것

Weasis의 소스(GitHub `nroduit/Weasis`, 2026-10-01의 master)와 문서에서 읽은 것만 적습니다. 직접 돌려 본 것은 아직 없습니다(③에서).

**확인한 것(원문)**

1. **Weasis 자신이 「CD에 뷰어 넣기」를 하는 방법** — `weasis-dicom/weasis-dicom-isowriter/…/IsoImageExport.java`: 「Add Weasis」를 체크하면 **지금 실행 중인 Weasis의 설치 폴더를 통째로** 디스크의 `viewer` 폴더로 복사하고(`Path in = appPath.getParent(); copyFolder(in, out, …)` — `appPath`는 설정값 `weasis.codebase.local`), 맨 위에 `AUTORUN.INF`와 `RUN.BAT`를 씁니다. 이 체크 칸은 Windows에서만 켜집니다(`checkBoxAddWeasisViewer.setEnabled(SystemInfo.isWindows)`). 따로 만든 「휴대용 판」을 쓰는 것이 아니라 **설치된 폴더의 복사본**입니다.
2. **만든 사람의 말**(dcm4che 모임, Nicolas Roduit, 2022-09-07): "To get a 'portable' version, just copy the installation directory. This is what the CD/DVD export plugin...does, where it is possible to add the viewer." / "When copying the installation directory it is necessary that the system and processor architecture of the destination system is the same." / "some features will not be available anymore like the association to the DICOM files or to work as a web application."
3. **켜는 파일** — `weasis-distributions/resources/isowriter/RUN.bat`(전문):
   ```
   REM Script to load the content of the CD/DVD in the viewer
   start "" "viewer\Weasis.exe" "weasis://%%24dicom%%3Aget%%20-p%%20%%24weasis%%3Aconfig%%20pro%%3D%%22weasis.portable.dir%%20.%%22"
   ```
   풀어 쓰면 `Weasis.exe`에 `$dicom:get -p $weasis:config pro="weasis.portable.dir ."`를 넘기는 것 — 「이 파일이 있는 자리(`.`)를 디스크의 뿌리로 보고 거기의 영상을 열라」.
4. **`-p`가 하는 일** — `weasis-dicom-explorer/…/DicomModel.java`: 도움말 "-p --portable  open DICOMs from configured directories at the same level of the executable". `weasis.portable.dir` 아래의 **`DICOMDIR` 파일을 읽고**, 없으면 폴더들을 뒤집니다. 뒤질 폴더의 기본값은 `dicom,DICOM,IMAGES,images`(`weasis-launcher/…/ConfigData.java`). → **Orthanc가 만드는 모양(`DICOMDIR` + `IMAGES/`)이 그대로 맞습니다.**
5. 같은 곳의 주석: "Copy images in cache if property weasis.portable.dicom.cache = true (default is true)" — 뷰어가 디스크의 영상을 **받는 PC의 임시 저장 자리로 복사해서** 엽니다(디스크가 느려서).
6. **자동 실행**: Weasis는 `AUTORUN.INF`도 쓰지만 **우리는 쓰지 않습니다**(총괄 결정 — 켜는 파일 하나만).
7. **파일 크기**(GitHub 릴리스 v4.7.3): `Weasis-4.7.3-x86-64.msi` 54 636 544바이트(설치 파일), `weasis-native.zip` 60 534 420바이트.

**우리 디스크에서는**: `cd-viewer` 폴더(= 설치된 Weasis 폴더의 복사본)를 `VIEWER`로 넣고, `VOIR.BAT`에 위 3번과 같은 한 줄(폴더 이름만 `VIEWER`)을 씁니다. Weasis는 **고치지 않습니다** — 켤 때 주는 말만 씁니다(Stone의 URL 매개변수와 같은 선).

**해 본 결과(2026-10-02)** — 자세한 숫자는 `modules/pacs.md` 2.4.4절
- 설치 없이 풀기(`msiexec /a`)로 얻은 `PFiles64\Weasis` 폴더(139MB, 430개)가 **그대로 켜집니다**. 이 PC에 등록되는 것은 없습니다.
- 우리 디스크 모양(`DICOMDIR` + `IMAGES` + `VIEWER` + `VOIR.BAT`)에서 `VOIR.BAT`으로 켜면 `DICOMDIR`을 읽어 환자와 검사를 스스로 엽니다 — USB 폴더(처음 4초 · 영상까지 7초)와 읽기 전용 가상 디스크(ISO) 모두.
- 처음 켤 때 동의 창(의료기기 아님 — 「I accept / No」, 영어). 받는 PC의 사용자 폴더에 약 95MB가 남고(환자 이름 없음), 영상의 임시 사본은 창을 닫으면 지워집니다.
- 풀린 폴더에 **Weasis 자신의 라이선스 글은 없습니다**(Java 것만 `runtime\legal`에) — 디스크에 넣으려면 따로 넣어야 합니다.
- 경로 깊이 7단 · 가장 긴 경로 79자라 디스크 이름 규칙에 걸리지 않습니다(그래도 뷰어를 넣을 때는 UDF를 함께 씀).

**아직 확인 못 한 것**

- **설치된 폴더를 어떻게 얻나**: (가) 어느 PC에 MSI를 설치하고 그 폴더를 복사, (나) MSI를 「설치하지 않고 풀기만」(Windows의 `msiexec /a`). (나)가 되는지, 그렇게 푼 폴더가 켜지는지는 **해 보지 않았습니다**. (가)는 그 PC에 프로그램을 설치하는 일이라 **이 PC에서 하려면 먼저 여쭙니다**. 어느 쪽이든 MSI(54.6MB)를 내려받아야 합니다 — **내려받기 전에 여쭙니다**.
- **Weasis 누리집의 「portable archive」**: FAQ에 "a portable archive is published next to the installer, so Weasis can be unpacked on a USB drive and run without installation or administrator rights"라고 적혀 있으나, 내려받기 쪽과 GitHub 릴리스에는 Windows용으로 **MSI 하나뿐**이고 그런 이름의 파일을 **찾지 못했습니다**. `weasis-native.zip`은 2022년에 한 사용자가 「그 안에 `weasis.exe`도 `.bat`도 없다」고 적은 것(같은 모임 글) — 켜는 파일이 없는 묶음으로 보이며, 직접 열어 보지는 않았습니다. 그래서 위의 「설치 폴더 복사」를 길로 잡습니다.
- 설치 폴더의 **크기**(MSI가 54.6MB이니 풀면 더 큼), 디스크에서 **켜지는 시간**, 영상이 뜰 때까지의 시간.
- 받는 PC에 **무엇이 남는지**: 설정 폴더, 5번의 임시 복사본(환자 영상) — 어디에 생기고 닫을 때 지워지는지.
- 처음 켤 때의 **동의 창**(의료기기 아님)과 화면 언어(받는 PC의 언어를 따르는지).
- 받는 병원 PC가 CD의 프로그램 실행을 **막지 않는지**(보안 때문에 CD만 받는 곳은 실행 파일을 막는 경우가 많음) — 이것은 현지에서만 알 수 있음.
- 설치 폴더에 **라이선스 글**(Weasis와 그 안의 Java 등)이 들어 있는지 — 없으면 `VIEWER` 옆에 넣어야 함.
- 32비트 Windows · Mac · Linux에서는 켜지지 않음(2번) — `README.TXT`에 적음.

## 6. 기록 · 권한

- **변경 기록 한 줄씩**(환자 자료가 병원 밖으로 나가는 일): 새 동작 `pacs.images.print` · `pacs.images.export` — 누가 · 환자 · 어느 검사(이름·accession) · 영상 몇 장 · (내려받기·반출) 검사 몇 건·크기·매체(`zip`/`disc`/`iso`/`folder`). `utils/audit.js`에 두 줄(공용 파일). 인쇄는 서류 발급 기록(`documents.issue`)도 함께 남음.
- **권한 — 제안**: **진료와 수납 둘 다.** 수납 화면의 영상/판독 창에도 같은 단추를 둡니다(①에서는 인쇄 단추) — CD 복사비(오더 코드 `CDR` 「CD Copy」 10 000 Ar)를 받는 곳이 수납이고, CD를 굽는 사람도 접수·수납 직원일 가능성이 높기 때문입니다. 지금 수납 화면은 **영상 창을 열 수 없게** 되어 있는데(목록과 판독만), 내려받기를 주면 수납 직원이 영상 파일을 갖게 됩니다 — 그래도 되는지가 결정 9-라.
- **환자 번호 경고가 있는 검사**(영상 속 번호가 차트와 다름): 인쇄·반출·내려받기를 **막는 것을 추천**(다른 사람의 영상이 이 환자 이름으로 나갈 수 있음) — 9-마.
- 청구(`CDR`)와 자동으로 잇지는 않습니다(수납이 지금처럼 따로 넣음). 원하시면 「반출 프로그램의 굽기 확인 창에 『CD 복사비를 넣으셨나요』 한 줄」 정도.

## 7. 라이선스 선

- Orthanc: `GET /instances/{id}/rendered`, `POST /tools/create-media-extended`, `GET /studies/{id}/statistics` — 모두 공식 REST. Orthanc 프로그램·설정은 안 건드립니다.
- Stone: 쓰지 않습니다(영상 창과 무관).
- Weasis를 넣게 되면: **고치지 않고 그대로**(설치 폴더의 복사본) — 켤 때 주는 말(`-p`, `weasis.portable.dir`)만 씀. 라이선스 글과 고지를 디스크에 넣음. Weasis 자체는 PACS 저장소에 넣지 않고(큰 파일), `cd-viewer` 폴더를 만드는 방법을 README에 적음. PACS 저장소 README의 License 절에 한 문단.

## 8. 걸리는 것 · 모르는 것

- 진짜 장비의 큰 영상(수십 MB짜리 X-ray, 수백 장짜리 검사)으로 걸리는 시간 — 격리에는 작은 시험 영상뿐.
- 흑백 레이저에서의 밝기(현지 프린터).
- 받는 병원의 PC가 무엇을 읽는지(대부분 `DICOMDIR`를 읽지만, 병원마다 다름).
- 압축된 영상(JPEG 2000 등)을 그대로 넣으면 옛 뷰어가 못 읽을 수 있음 — Orthanc가 묶을 때 풀어서 넣게 할 수 있음(`Transcode`), 크기가 커짐. 처음에는 **그대로**, 문제가 보고되면 켬.
- **JPG 사본이 없어서**, 영상 프로그램이 없는 받는 쪽은 뷰어가 든 디스크가 아니면 볼 수 없습니다(4절 · 5절).
- (② 때) 내려받은 ZIP은 그 PC의 「다운로드」 폴더에 남습니다 — 환자 영상입니다. 설명서에 「CD를 구운 뒤 지우세요」를 적습니다.

## 9. 정할 것

**실장님**

| # | 물음 | 추천 |
|---|---|---|
| 가 | 인쇄한 영상 종이 아래에 「Images de référence — non destinées au diagnostic(참고용 — 진단용 아님)」 한 줄을 넣을지 | **넣음** — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 나 | 현지 PC에 **CD/DVD 굽는 장치**가 있는지, 빈 CD를 병원이 갖고 있는지 | (여쭘) — 이 PC에는 시험용 장치가 연결됨(4-2절) |
| 다 | ~~ZIP으로 충분한지, `.iso`가 필요한지~~ | **정해짐**: 굽기와 `.iso` 저장은 반출 프로그램(4-2절)이, EMR 화면의 내려받기는 ZIP 그대로 |
| 라 | **수납 직원도** 영상 인쇄·반출을 할 수 있게 할지(영상 파일을 갖게 됨) | **둘 다 허용** — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 마 | 환자 번호 경고가 있는 검사는 인쇄·반출을 **막을지** | **막음** — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 바 | ~~CD에 뷰어(Weasis)를 넣을지~~ | **정해짐**: 뷰어는 Weasis(실장님: 「일단 위아시스로 진행하는 걸로 해 보자」). 일찍 해 보고, 되면 반출 프로그램에 「뷰어 포함」 체크 |
| 사 | 인쇄의 기본 배치(한 장에 몇 장)와 한 번에 뽑는 최대 장수 | **기본 2장 배치, 한 번에 48장, 처음 12장 선택** — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 아 | 반출 프로그램: **다시 쓸 수 있는 디스크**(CD-RW 등)에 무언가 있을 때 「지우고 굽기」를 허용할지 | **허용하지 않음 — 빈 디스크만** — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 자 | 반출 프로그램을 **어느 PC에서, 누가** 쓰나(굽는 드라이브가 있는 PC — 수납? 영상실?) | (여쭘 — 나와 같이) |
| 차 | 용량이 넘칠 때 **여러 장에 나눠 굽기**가 필요한지 | **안 함**(검사를 나눠 두 번 구움) — 총괄이 추천값으로 정함(실장님이 바꿀 수 있음) |
| 카 | ~~JPG 사본을 넣을지~~ | **정해짐**: 넣지 않음(「jpg 는 넣지 마」) |
| 타 | ~~판독소견을 CD에 같이 넣을지(PDF)~~ | **정해짐: 넣지 않음**(실장님: 「판독소견은 어차피 프린트해서 줄 거니까 같이 넣을 필요 없어. 영상을 넣고 보는 것에 충실하자」). 글 파일도 PDF도 없음, 나중에 더할 자리도 만들지 않음 |
| 파 | ③의 시험을 위해 Weasis 설치 파일을 내려받아도 되는지 | 총괄이 실장님께 여쭘 — **받기 전에 파일 이름 · 출처(공식 GitHub 릴리스 주소) · 크기를 총괄에 먼저 알림**. 이 PC에 **설치는 하지 않음**: ⓐ 설치 없이 풀기만(`msiexec /a`) → ⓑ `weasis-native.zip` 안에 그대로 돌릴 폴더가 있는지 → 둘 다 안 될 때만 「설치 후 복사 → 제거」를 다시 여쭘 |

**총괄**

| # | 물음 | 추천 |
|---|---|---|
| ㄱ | 서버 길을 새 파일(`pacs.export.js`)로, 서식 파일 `documents/imaging-images.jsx`(PACS 소유) | **정해짐** — 그렇게. `registry.js` 등록도 PACS가 직접(판독지 때처럼, 커밋에 적음) |
| ㄴ | 변경 기록 동작 이름 `pacs.images.print` · `pacs.images.export`(`audit.js` 두 줄) | **정해짐** |
| ㄷ | 번역 키 `px_im…`(인쇄) · `px_dl…`(내려받기) | **정해짐** |
| ㄹ | ~~ZIP을 쓰는 코드를 직접 짓기~~ | **필요 없어짐** — EMR은 Orthanc의 ZIP을 그대로 넘김(4절). 새 라이브러리도, 직접 짓는 ZIP 코드도 없음 |
| ㅁ | 뷰어 폴더를 어디에 둘지 | **정해짐** — 반출 프로그램 옆의 `cd-viewer` 폴더. EMR·compose는 안 건드림 |
| ㅂ | 반출 프로그램의 파일 이름(`cd-export.bat` · `cd-export.ps1` · `cd-export.ini`)과, 기록 줄을 「묶음을 받아 갈 때」 적는 것 | **정해짐** |
| ㅅ | `README.TXT`는 반출 프로그램이 쓰고 EMR은 묶음을 그대로 넘기는 것(4절) | **정해짐** — 그렇게 |
| ㅇ | 디스크에서 뷰어를 켜는 파일의 이름 | **정해짐** — `VOIR.BAT`(짧은 대문자 이름이라 어느 디스크 형식에서나 그대로 보임). `README.TXT`에 「VOIR.BAT를 더블클릭」이라고 적음 |
| ㅈ | Weasis 폴더(큰 파일)를 PACS 저장소에 넣지 않고, 「`cd-viewer` 폴더를 만드는 방법」만 README에 적는 것 | **정해짐** — 그렇게(USB 설치 묶음에 넣을지는 ③ 결과를 보고 총괄이 정함) |

## 10. 짓는 차례 (결정 뒤 — 고침)

1. **① 영상 인쇄 — 지었음(2026-10-01)**: 서버 길(그림 한 장) · 인쇄 창(고르기·배치·밝기·언어) · 서식 · 발급 기록·변경 기록 · 진료와(결정되면) 수납 화면 · 설명서 fr. 시험: 1·2·4·6 배치, 긴 이름, 여러 쪽, 그림 없는 자료(보고서 따위)는 건너뜀, 다른 환자의 영상 번호를 넣으면 거절.
2. **④ 영상 CD 반출 프로그램 — 지었음. 진짜 굽기 1장 확인(2026-10-02)**(PACS 저장소 + EMR의 길 둘): EMR 쪽 `pacs.export.js`에 「크기」와 「묶음(그대로 넘김)」 · 변경 기록. 프로그램: 로그인 · 조회 · 목록 · 크기 · 받기 · 풀기 · `README.TXT` · ISO/폴더 저장 → 디스크 알아보기 · 굽기 · 확인 · 꺼냄. README · 설명서 fr. **「폴더에 저장」부터 완성**합니다 — 시험 자리는 USB 메모리의 `D:\CD-TEST\` 아래(반출 한 번에 하위 폴더 하나, 예 `D:\CD-TEST\26-00001_20261001_1730\` — 그 폴더가 「디스크의 맨 위」). `D:`의 다른 것(실장님 파일)은 열지도 건드리지도 않습니다. 격리 스택의 가짜 환자로만. 그다음 ISO, 그 뒤에 **총괄에 알리고 1장** 굽습니다(4-2절의 차례).
3. **③ 뷰어 — 진짜 Weasis로 USB 폴더와 가상 디스크에서 켜지는 것까지 확인(2026-10-02 — 결과는 `modules/pacs.md` 2.4.4절). 뷰어를 넣은 진짜 CD는 아직**: Weasis 폴더를 얻고(결정 파 — 설치하지 않고 풀기만), 먼저 **`D:\CD-TEST`의 폴더에서**(USB — CD보다 빠르니 「CD에서는 더 느림」을 적어 둠) `VOIR.BAT`로 켜지는지 · 켜지는 시간 · 폴더 전체 크기 · 받는 PC에 남는 것을 재고, 그 뒤 **총괄에 알리고 1장** 구워 같은 것을 잽니다. 결과를 보고합니다.
4. **③이 되면**: 반출 프로그램에 「☐ Ajouter la visionneuse」 체크 칸 · `README.TXT`의 뷰어 문단 · PACS README의 License 문단과 「`cd-viewer` 만드는 방법」.
5. **② EMR 화면의 ZIP 내려받기**: 그 뒤, 또는 필요해질 때 — 「한 번 쓰는 표」 · 내려받기 창 · 설명서 fr. 묶음의 길은 ④에서 만든 것을 그대로 씁니다.

각 단계마다 격리에서 확인하고 보고합니다. 실행 중 EMR·PACS는 건드리지 않습니다.

## 11. 반출 프로그램을 「.exe」로 만드는 길 (조사만 — 짓지 않음)

실장님(2026-10-01): 「뱃으로 만들기보다는 좀 더 제대로 프로그램처럼 만들어 줬으면. 뱃으로 기능 다 만들고 나중에 그렇게 할 수 있으면 지금 당장은 상관없지만.」 → 지금은 PowerShell + `.bat`로 기능을 끝까지 만들고, 그 뒤에 진짜 실행 파일로 옮깁니다. 아래에서 **「확인함」은 원문을 읽었거나 이 PC에서 해 본 것, 「추측」은 그렇지 않은 것**입니다.

### 추천안 — Windows에 들어 있는 C# 컴파일러로 만든 WinForms 실행 파일 하나

`cd-export.exe` 하나(+ 지금처럼 옆에 `cd-export.ini`, 원하면 `cd-viewer` 폴더). 아이콘이 있고, 검은 창이 없고, 「프로그램 추가/제거」에 등록하지 않으며, 지우려면 파일을 지우면 됩니다. 받는 PC에도, 만드는 PC에도 **아무것도 설치하지 않습니다**.

| 물음 | 답 | 근거 |
|---|---|---|
| 받는 PC에 무엇이 있어야 하나 | 없음 — .NET Framework 4.8은 Windows 10(1903부터)과 Windows 11에 **들어 있음** | **확인함**(Microsoft Learn 「.NET Framework & Windows OS versions」의 표: 4.8 ✔ Windows 10 May 2019 Update(1903)~22H2, Windows 11 21H2 / 4.8.1 ✔ Windows 11 22H2~. 같은 글: ".NET Framework will continue to be included with Windows, with no plans to remove it."). 1809 이전의 Windows 10은 4.7.2가 들어 있음 → 4.7.2용으로 만들면 그것까지 됨 |
| 무엇으로 만드나 | Windows에 들어 있는 `csc.exe`(`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\`) | **확인함**(Microsoft Learn: "The csc.exe executable file is usually located in the Microsoft.NET\Framework\<Version> folder under the Windows directory". 이 PC에 있음 — "Visual C# Compiler version 4.8.9221.0 for C# 5") |
| 그 컴파일러의 한계 | **C# 5까지만** | **확인함**(컴파일러가 스스로 말함: "only supports language versions up to C# 5"). 지금 `cd-export-common.ps1` 안의 C# 조각도 바로 이 컴파일러로 실행 때마다 컴파일되고 있으므로 C# 5로 충분하다는 것은 이미 보인 셈 |
| 정말 되나 | 됨 | **확인함**(이 PC, scratch에서만): 창 하나 + 굽는 부품(IMAPI2)을 부르는 15줄짜리를 `csc -target:winexe`로 컴파일 — **0.25초, 5 632바이트**, 실행되어 「recorders: 1」을 읽음. 제품 크기는 **추측**으로 수백 KB(코드 2천 줄 + 아이콘) |
| IMAPI2를 C#에서 | 지금과 같은 방식 — 이름으로 불러 쓰기(`dynamic`), 형식 라이브러리나 Windows SDK 없이 | **확인함**(ISO 저장과 드라이브 알아보기는 이미 이 방식으로 돌고 있음). 굽기 자체는 진짜 굽기 시험 뒤에 확인됨 |
| 진행 막대가 쉬워지나 | **쉬워지지 않음, 어려워지지도 않음** — 지금 방식을 그대로 옮김 | IMAPI2에는 진행을 알려 주는 신호(`DDiscFormat2DataEvents::Update` — "Implement this method to receive progress notification of the current write operation", **확인함**, Microsoft Learn)가 있지만, 그것을 받으려면 COM 인터페이스 선언을 손으로 쓰거나 형식 라이브러리에서 뽑아야 함(**추측**: 뽑는 도구 `tlbimp`는 Windows SDK에 있고 Windows에는 없음). 지금은 굽는 부품이 디스크 이미지를 **읽어 가는 양을 세어서** 진행률을 내고 있어(`CountingStream`) 신호 없이 됩니다 |
| 화면 글자 · 설정 | 그대로 — 글자는 한 표(지금의 `$CdxText`), 설정은 `cd-export.ini` | 지금 구조가 이미 「화면」(`cd-export-ui.ps1`)과 「일」(`cd-export-common.ps1`)로 갈라져 있고, 사람에게 묻는 곳도 함수 네 개에 모여 있음 |

**옮기는 일의 크기(추측)**: `cd-export-common.ps1`의 함수들이 그대로 C# 클래스가 됩니다 — EMR과의 통신(`HttpWebRequest` — 지금도 .NET의 같은 부품) · 묶음 풀기(`ZipFile` — 같음) · README · 폴더 저장과 비교 · 디스크 이미지/굽기(`DiscJob` — **이미 C#**) · 드라이브 알아보기. `cd-export-ui.ps1`의 창은 WinForms 코드로 한 줄씩 대응됩니다. 새로 생각할 것이 없는 옮겨 적기이고, 시험(`cdx_test` · `cdx_ui_test`)의 항목을 그대로 다시 돌려 맞춥니다.

**빌드**: 저장소에 C# 소스(`cd-export/*.cs`)와 `build-cd-export.ps1`(csc 한 줄)을 둡니다. 실행 파일을 저장소에 넣을지, 설치 묶음(USB)을 만들 때 빌드할지는 총괄이 정할 것 — 소스에서 0.3초면 만들어지므로 **묶음을 만들 때 빌드**를 권합니다(저장소에 실행 파일을 넣지 않음).

### 다른 길들

| 길 | 판단 |
|---|---|
| **Docker의 .NET SDK로 빌드**(Windows에 SDK를 깔지 않고) | 최신 C#을 쓸 수 있다는 것 말고는 얻는 것이 없고, 리눅스 컨테이너에서 .NET Framework용 WinForms를 빌드하려면 참조 묶음을 따로 받아야 함(**추측** — 해 보지 않음). 인터넷이 필요. 추천하지 않음 |
| **새 .NET(8 이상)으로 단일 파일** | 받는 PC에 런타임이 없으므로 런타임을 함께 싸야 하고 **수십~백수십 MB**가 됨(**추측**). 추천하지 않음 |
| **PowerShell 스크립트를 exe로 싸는 도구**(PS2EXE 등) | **피합니다.** 그 도구의 저장소 이슈 목록에 백신 오탐 신고가 있음(**확인함**, 제목만: 「#153 EXE Trigger AV quarantine」, 「#103 Options DPIAware gives Script/Wacatac.b!ml virus warning」 등 16건 검색됨 — 얼마나 잦은지는 재지 않음). 또 그 도구의 설명서가 스스로 "One can simply decompile the script with the parameter -extract"라고 적음(**확인함**) — 싸는 것일 뿐 프로그램이 되는 것이 아님. 속은 여전히 PowerShell이라 시작도 느림(**추측**) |
| **지금 그대로(.bat + PowerShell)에 바로가기 아이콘만** | 가장 싸지만 실장님이 바라신 「제대로 된 프로그램」이 아님. 창이 뜨기 전에 검은 창이 잠깐 보임 |

### 서명 없는 실행 파일 — SmartScreen과 백신

- **확인함**(Microsoft Learn 「Microsoft Defender SmartScreen overview」): SmartScreen은 "downloaded app or app installer"를 "a list of files that are well known and downloaded frequently"와 맞춰 보고 "If the file isn't on that list, Microsoft Defender SmartScreen shows a warning". 평판은 "the digital signature used to sign a file"로도 봅니다. 그리고 "SmartScreen protects against malicious files from the internet. It doesn't protect against malicious files on internal locations or network shares".
- 그래서 **추측**: 우리 실행 파일은 인터넷에서 내려받는 것이 아니라 설치 USB로 들어가거나 그 자리에서 빌드되므로 「인터넷에서 온 파일」 표시가 붙지 않아 경고가 뜨지 않을 것입니다(이 PC에서 빌드한 시험 파일에는 그 표시가 없음 — **확인함**). **GitHub에서 zip으로 내려받아 푼 경우에는 표시가 따라올 수 있고**, 그때는 「Windows의 PC 보호」 창에서 「추가 정보 → 실행」을 눌러야 합니다. 지금의 `.bat` · `.ps1`도 같은 처지입니다.
- 코드 서명 인증서는 해마다 돈이 듭니다. 무료 프로젝트라 **서명하지 않는 것**을 전제로 합니다.
- 백신: 서명 없는 작은 .NET 프로그램을 백신이 어떻게 보는지는 **모릅니다**(현지 PC의 백신으로 확인). 스크립트를 싼 exe보다는 사정이 나을 것으로 **추측**.
- 현지 PC가 스크립트 실행을 막아 둔 경우(정책), `.exe`는 그 영향을 받지 않습니다(**추측** — `.bat`은 지금 `-ExecutionPolicy Bypass`로 넘김).

### 차례(제안)

1. 지금: PowerShell + `.bat`로 폴더 저장 → Weasis → 굽기까지 완성하고 시험 항목을 고정.
2. 그 뒤: 같은 시험 항목을 기준으로 C#으로 옮김 → `cd-export.exe`. `.bat` · `.ps1`은 그때 뺌.

### 11-1. 옮기기 전의 준비 (2026-10-02) — **옮겼습니다: 11-2절**

위 글을 쓴 뒤로 달라진 것: 굽기가 진짜로 확인됐고(2026-10-01), Weasis가 빠졌고, **작은 뷰어 `VOIR.EXE`가 생겨** 반출 프로그램이 디스크마다 그것을 만들어 넣습니다. 그래서 옮기기 전에 정리해 둔 것입니다. 제품 코드는 손대지 않았습니다.

**지금의 크기(확인함 — 줄 수)**

| 파일 | 줄 | 옮기면 |
|---|---|---|
| `cd-export.bat` · `cd-export.ps1` | 5 · 40 | 없어짐(`Program.cs`의 `Main` 몇 줄) |
| `cd-export-common.ps1` | 563 | 그중 **약 130줄은 이미 C#**(`DiscJob` · `CountingStream` — 그대로 옮김). 나머지 26개 함수가 C# 클래스 셋으로: EMR과의 통신 · 디스크 폴더 만들기(묶음 풀기 · README · 뷰어 · 저장 · 비교) · 드라이브와 굽기 |
| `cd-export-ui.ps1` | 552 | 글자 표 약 150줄(세 언어 — 그대로 표로) + 함수 19개(창 · 누름 처리)가 WinForms 코드로 |
| `viewer\*.cs` | 1,107 | **이미 C#** — 그대로. 반출 프로그램과는 별개의 실행 파일로 남음(디스크에 들어가는 것) |

→ 새로 옮겨 적을 것은 PowerShell 약 1,000줄이고, C#으로는 **1,200~1,500줄쯤**(추측), 실행 파일은 뷰어를 품고도 **150KB 안쪽**(추측 — 아래 시험의 빈 껍데기가 54KB).

**뷰어를 어떻게 품나 — 해 봄**(이 PC, scratch에서만. 끝나고 지움)

| 길 | 결과 |
|---|---|
| `csc`로 뷰어를 직접 빌드(PowerShell 없이) | 됨 — 0.16초, 49,664바이트. 지금 PowerShell의 `Add-Type`이 만드는 것과 **크기가 같음** |
| **가** `cd-export.exe`가 **만들어진 `VOIR.EXE`를 자원으로 품고** 디스크에 써 넣음 | 됨 — 품은 프로그램 54KB, 꺼낸 파일이 원래 것과 **바이트까지 같음**, 실행됨(0.13초에 창) |
| **나** `cd-export.exe`가 뷰어의 **소스를 품고** 그 자리에서 빌드(지금 방식 그대로) | 됨 — 소스 9개 0.1초, 49,664바이트, 임시 폴더에 남는 것 없음, 실행됨 |

- **가를 권합니다**: 빌드가 한 번이라 **모든 디스크의 `VOIR.EXE`가 같은 파일**이 됩니다(백신이 한 번 허용하면 끝, 문제가 생기면 어느 판인지 해시로 가릴 수 있음). 접수 PC에서 컴파일러가 돌 일도 없습니다. 지금 방식(나)은 PowerShell이라 그렇게 한 것이고, 실행 파일이 되면 이유가 없어집니다.

**시험은 어떻게 옮기나**: 지금의 시험(`cdx_test` · `cdx_ui_test` 22가지 · `cdx_big_test` · `cdx_unpack_test` · `burn_test`)은 PowerShell 함수를 직접 부릅니다. 실행 파일이 되면 뷰어의 시험(`viewer_test`)이 이미 하는 것처럼 **PowerShell이 그 실행 파일을 어셈블리로 읽어 들여 같은 항목을 부르면** 됩니다(확인함 — 뷰어에서 그렇게 하고 있음). 그러려면 「사람에게 묻는 곳」 넷(알림 · 예/아니오 · 폴더 고르기 · ISO 파일 고르기)을 지금처럼 갈아 끼울 수 있게 두어야 합니다 — 설계의 조건으로 적어 둡니다. 서버 쪽 시험(`export_api.py` 31 · `export_unpack.py` 10)은 그대로입니다.

**옮긴 뒤의 폴더(제안)**

```
cd-export\            ← 소스(C#): Program · MainForm · Texts · EmrClient · DiscFolder · Burner(DiscJob)
viewer\               ← 그대로
build-cd-export.ps1   ← csc 두 번: viewer → VOIR.EXE, cd-export(+ VOIR.EXE를 자원으로) → cd-export.exe
cd-export.exe         ← 저장소에 넣지 않음(.gitignore) — 설치 묶음을 만들 때 / 배포할 때 빌드
cd-export.ini         ← 지금과 같음(EMR 주소 · 마지막 폴더)
```

**정할 것**

| # | 물음 | 추천 |
|---|---|---|
| ㄱ | 언제 옮길지 | 뷰어를 넣은 진짜 CD 한 장(④)이 끝난 뒤 — 기능과 시험 항목이 굳은 다음 |
| ㄴ | 뷰어를 품는 길 | **가**(만들어진 `VOIR.EXE`를 자원으로) |
| ㄷ | 실행 파일을 어디서 만드나 | 총괄: 설치 묶음(`offline/pack.ps1`)을 만들 때와 실행 중 PACS 폴더에 배포할 때 `build-cd-export.ps1`을 돌림(0.5초). 저장소에는 소스만 |
| ㄹ | 이름 · 아이콘 | `cd-export.exe`, 창 제목은 지금처럼 「Copie d'images sur CD」. 아이콘은 Windows의 디스크 그림을 빌려 쓰지 않고 **단순한 것 하나를 직접 그림**(받아 오는 것 없음) — 실장님이 원하시는 그림이 있으면 그것으로 |
| ㅁ | `.bat` · `.ps1`을 언제 빼나 | 한 번의 배포 동안 둘 다 둠(실행 파일에 문제가 있으면 `.bat`로 되돌아갈 수 있게) → 그다음에 뺌 |
| ㅂ | 언어 | 지금은 `-Lang`(기본 프랑스어). 실행 파일에서는 `cd-export.ini`의 `lang=` 한 줄(없으면 프랑스어)로 — 바로가기에 인수를 달 필요가 없게 |

### 11-2. 옮김 — 「Bethesda CD」 1.0.0 (2026-10-02)

실장님 결정: 이름 **Bethesda CD**(「Bethesda CD 이걸로 가고」), 아이콘은 직접 그림, 나머지는 추천대로(뷰어는 만든 것을 품음 · 저장소에는 소스만 · 옛 `.bat`은 한 번의 배포 동안 함께 · 언어는 ini · 지금 시작) → 「완성되면 따로 깃헙에 1.0.0으로」(총괄: 공개 저장소, 분리는 총괄 몫 — 그래서 한 폴더로 서게).

**지은 것**(PACS 저장소 `bethesda-cd\`)
- `src\app\` 여섯 파일 약 1,100줄(세 언어의 글자 표 포함) — 옛 PowerShell의 함수와 한 줄씩 대응. 굽는 부분(`DiscJob`)은 옛 것 그대로.
- `src\viewer\` — 그대로 옮김. `src\shared\Version.cs` — 이름 · 판 번호 한 곳.
- `build.ps1` — `csc` 두 번, **0.7초**. `Bethesda-CD.exe` **181,760바이트**(안에 품은 `VOIR.EXE` 78,336바이트 — 아이콘 22KB 포함).
- 사람에게 묻는 넷(알림 · 예/아니오 · 폴더 · ISO 파일)은 `Ask`의 네 칸 — 시험이 갈아 끼움(11-1절의 조건).
- 설정: `Bethesda-CD.ini`(emr_url · last_folder · lang). 옛 `cd-export.ini`가 옆에 있으면 처음에 그 값을 읽음.
- 「내보내기 / 들여오기」 두 갈래는 들여오기를 지을 때 창에 넣습니다(지금은 내보내기만 — 없는 기능의 단추를 보이지 않음).

**확인한 것**(격리 EMR 9188 · PACS 9198, 가짜 환자)
- `tests\app_test.ps1` **23가지 통과** — 만든 실행 파일을 읽어 들여 창의 코드를 그대로 부름: 로그인(틀린/맞는 비밀번호, 주소 기억, 설정 파일에 비밀번호 없음) · 조회 · 못 주는 검사 · 체크 · 폴더 저장(DICOMDIR · IMAGES · README.TXT · VOIR.EXE) · **디스크의 VOIR.EXE가 빌드한 것과 바이트까지 같음** · 작업 폴더 비움 · ISO(63.5MB) · 같은 이름 거절 · 쓸 수 없는 자리 · 굽기 질문에 「아니오」 · 로그인 만료.
- 풀어서 내보내기(JPEG 2000이 든 검사): 끝 안내 세 언어, 사본의 영상을 디스크에 든 뷰어가 모두 엶 — 5가지 통과.
- `tests\viewer_test.ps1` **21가지 통과** — 스스로 그린 그림을 DICOM으로 써서(바깥 파일 없음): 압축 없음(8 · 12 · 16비트, 컬러, 면 순서) / RLE(8 · 16비트 · 컬러, 3프레임) / **무손실 JPEG 56개 — 예측 방식 1~7 × 다시 시작 표시 있음·없음 × 8 · 12 · 16비트 흑백과 컬러 — 모든 값이 원본과 같음**(전에는 방식 1만 확인했음) / 4프레임(오프셋 표 있음 · 없음) / 망가뜨린 60개는 모두 거절 / 목록과 악센트(Latin-1 · UTF-8) / 창(밝기 · 이동 · 처음으로 · 프레임).
- 진짜 실행 파일: 로컬 · USB(`D:\CD-TEST`) · 네트워크 경로(`\\localhost\C$\…`)에서 더블클릭하듯 실행 → **0.3초에 창, 메모리 39MB**, Windows의 물음 없음. 그냥 열고 닫으면 설정 파일을 만들지 않음. 서명 `NotSigned`, 「인터넷에서 받은 파일」 표시 없음. Windows Defender로 빌드 폴더를 검사 — 탐지 0건.
- 옛 `cd-export.bat`의 길도 그대로 돎(뷰어 소스의 새 자리에서 빌드) — 창 시험 22가지 통과.

**확인 못 한 것**
- ~~실행 파일로 진짜 굽기~~ → **구웠습니다(2026-10-02, 실장님이 빈 CD를 넣고 PACS 세션 창에서 직접 말씀)**: `Bethesda-CD.exe`의 창 코드로 가짜 환자의 검사 2건(영상 26개 63Mo — 지난번과 같은 내용) → 「CD-R vierge, 703 Mo libres ✔ tient sur ce disque」 → 묻고 → **171.6초**(준비 2.2 · 굽기 54(×10) · 검증 약 115) → 「Terminé : le disque est gravé et vérifié.」(프로그램이 다시 읽어 파일마다 비교함), 작업 폴더에 남은 것 없음, 변경 기록 한 줄. 옛 스크립트로 구웠을 때(171.9초)와 같습니다.
- 인터넷에서 받은 사본(GitHub의 zip)을 실행할 때의 SmartScreen 창 — 일부러 띄우지 않았습니다(Microsoft의 글대로면 「추가 정보 → 실행」을 한 번).
- 다른 PC(Windows 10 · 32비트 · 다른 백신).

**아이콘 후보**(직접 그림 — `icon\make-icon.ps1`): [bethesda-cd-icon-candidates.png](design/bethesda-cd-icon-candidates.png) — A 파란 바탕의 흰 디스크 / B 은색 디스크에 파란 라벨 / C 파란 디스크에 흰 십자. 지금 빌드는 A(`build.ps1 -Icon B`로 바꿈). 실장님이 고르시면 그것으로 고정.

### 11-3. 아이콘 파일을 받는 길 · 바탕화면 바로가기 (2026-10-02)

실장님: 아이콘은 「공통 아이콘부터 만들고 그걸 기반으로」(EMR · PACS · CD 세 프로그램 — 디자인 세션이 후보를 그림, 지금의 A는 임시) / 「설치하면 바탕화면에 자동으로 바로가기 만들어줬으면 … EMR PACS 그리고 CD 프로그램까지」.

- **주어진 `.ico`를 쓰는 길**: `bethesda-cd\build.ps1 -IconFile x.ico`, 또는 `bethesda-cd\icon\Bethesda-CD.ico`에 파일을 두면 그것을 씀(없으면 지금처럼 그 자리에서 그림). 고른 아이콘이 오면 그 파일 하나를 넣으면 됩니다.
- **서버 PC**(PACS 설치): `setup.ps1`이 끝에서 `desktop-shortcuts.ps1`을 부름 → 바탕화면에 **`Bethesda PACS (administration).url`**(영상 서버의 화면 `http://localhost:9090`)과 **`Bethesda CD.lnk`**(`bethesda-cd\build\Bethesda-CD.exe` — 없으면 `build.ps1`을 먼저). 다시 돌려도 됨.
- **다른 PC**(접수 등 — Docker 없음): `Bethesda-CD.exe` · `install.bat` · `install.ps1` 셋을 USB로 옮겨 **`install.bat` 더블클릭** → 프로그램을 그 사용자의 프로그램 폴더(`%LOCALAPPDATA%\Programs\Bethesda CD`)에 복사, EMR 주소를 한 번 묻고 `Bethesda-CD.ini`에 적음(이미 있으면 그대로), 바탕화면에 `Bethesda CD.lnk`.
- **방식(EMR 쪽도 같게 하려면)**: 웹 주소는 **`.url` 글자 파일**(`[InternetShortcut]` / `URL=…` / 아이콘이 있으면 `IconFile=` · `IconIndex=0`), 프로그램은 **`.lnk`**(Windows의 `WScript.Shell` — `TargetPath` · `WorkingDirectory` · `IconLocation`). 이름은 **「Bethesda EMR」 · 「Bethesda PACS」 · 「Bethesda CD」**. 자리는 지금 사용자의 바탕화면(`[Environment]::GetFolderPath('Desktop')`). **같은 이름의 파일이 있으면 그 파일을 고쳐 씀**(둘째 것을 만들지 않음). 아이콘은 `-IconFile`로 받거나 스크립트 옆의 `bethesda-<이름>.ico`가 있으면 그것. 레지스트리 · 예약 작업 · 시작 메뉴는 건드리지 않음.
- **확인**(scratch의 가짜 바탕화면 · 가짜 프로그램 폴더로 — 이 PC의 진짜 바탕화면은 건드리지 않음, `shortcut_test.ps1` 9가지 통과): 주어진 `.ico`로 빌드됨 / 복사 · 설정 · 바로가기 / 다시 돌리면 바로가기는 하나 그대로 「corrected」, 있던 설정은 그대로 / `http`가 아닌 주소는 거절 / 복사된 프로그램이 뜸 / 서버 PC의 두 바로가기 / 서버에서는 설정 파일을 만들지 않음 / 진짜 바탕화면에 더해지거나 없어진 것 없음.
- **생각할 점 하나 — 「Bethesda PACS」 바로가기**: 그 주소는 Orthanc의 관리 화면입니다. `admin` 비밀번호를 묻고, 들어가면 검사를 고치거나 지울 수 있습니다(P-31). 직원은 영상을 EMR 안에서 보므로 이 바로가기는 **서버 PC에서 관리자만** 쓰는 것이 맞습니다 — 그래서 서버의 설치에서만 만들고, 다른 PC에 놓는 길은 만들지 않았습니다. 이름을 「Bethesda PACS (administration)」으로 할지는 실장님 · 총괄 뜻대로.
- 확인 못 한 것: `setup.ps1` 전체를 돌려 보지는 않았습니다(개발 PC 규칙 — 끝의 바로가기 부분만 따로 돌림). 실제 설치 PC에서의 모습.

## 조사에 쓴 곳

- Weasis: <https://github.com/nroduit/Weasis>(README · `LICENSE`), <https://weasis.org/en/faq/>, <https://weasis.org/en/tutorials/dicom-export/>, <https://weasis.org/en/getting-started/download-dicom-viewer/>, <https://weasis.org/en/getting-started/windows/>, 릴리스 v4.7.3의 파일 크기(GitHub).
- Weasis 소스(2026-10-01의 master): `weasis-dicom/weasis-dicom-isowriter/src/main/java/org/weasis/dicom/isowriter/IsoImageExport.java`, `weasis-distributions/resources/isowriter/RUN.bat` · `Autorun.inf` · `README.htm`, `weasis-dicom/weasis-dicom-explorer/src/main/java/org/weasis/dicom/explorer/DicomModel.java`, `weasis-launcher/src/main/java/org/weasis/pref/ConfigData.java`.
- Weasis를 만든 사람의 글: <https://groups.google.com/g/dcm4che/c/VGk7ziWPvp8>(「Weasis portable version since 4.x」, 2022-09).
- MicroDicom: <https://www.microdicom.com/eula.html>.
- RadiAnt: <https://www.radiantviewer.com/products/radiant-dicom-viewer-cddvd/>, <https://www.radiantviewer.com/dicom-viewer-manual/cd_dvd_autorun_package.html>(검색 결과로 읽음 — 원문 쪽을 직접 열지는 못함).
- DWV: <https://github.com/ivmartel/dwv>.
- 「.exe로 만드는 길」: <https://learn.microsoft.com/en-us/dotnet/framework/install/versions-and-dependencies>, <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/>, <https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/>, <https://learn.microsoft.com/en-us/windows/win32/api/imapi2/nn-imapi2-ddiscformat2dataevents>, <https://github.com/MScholtes/PS2EXE>(README · 이슈 목록), 이 PC의 `csc.exe`가 내는 글.
