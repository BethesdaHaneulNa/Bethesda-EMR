# PACS 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-10-02 — Bethesda CD: 디스크의 한글 이름이 깨져 보이던 것 (설정 세션)

- **상태**: 확인 요청(작은 것). 실장님이 본인의 한국 병원 초음파 CD를 들여와 보다 찾으심: 「이름쪽이 깨지는데 상관은 없나?」(총괄을 거쳐 옴).
- **커밋**: **PACS 저장소** `session/cd` — `50433bd`(main `20b11db` 위). push 하지 않음. 위키는 EMR `session/settings`의 이 커밋.
- **무엇이 틀렸나**: 디스크의 환자 이름(한글, EUC-KR 바이트)을 서유럽 글자(Latin-1)로 읽어 목록 · 「디스크의 환자」 줄 · 환자 확인 창에 뜻 없는 글자로 보였고, EMR에도 그 깨진 글이 「디스크에 적힌 이름」으로 넘어갔음. 들여오기 자체(영상)는 지장 없음.
- **고친 것**(`src\viewer\Dicom.cs`의 새 `DicomText` — 뷰어 `VIEWER.EXE`와 프로그램이 함께 씀)
  1. **파일이 적은 문자 집합(0008,0005)을 따름** — 전부터 표는 있었으나(한글 949 · 일본어 932 · 중국어 GB18030/GBK · UTF-8 · 라틴 여럿), **값 안의 전환 표시(ISO 2022의 ESC 시퀀스)** 를 따르지 않아 글 사이에 찌꺼기 글자가 남았음 → 이제 구간마다 그 집합으로 읽음: 한글(`ESC $ ) C`) · 중국어(`ESC $ ) A`) · 일본어(`ESC $ B` · `ESC $ ( D` · 반각 가나) · ASCII로 되돌리기 · 라틴 · 키릴 · 그리스 · 아랍 · 히브리 · 태국.
  2. **문자 집합이 안 적혀 있거나 「서유럽(ISO_IR 100)」이라 적혀 있는데 바이트가 그렇지 않을 때의 추측**: ① 올바른 UTF-8이면 UTF-8, ② 0x80 이상의 바이트가 **모두 「한글 음절」 짝**(앞 B0~C8, 뒤 A1~FE)이고 남는 바이트가 없으면 EUC-KR, ③ 아니면 적힌 대로. **일부러 좁게**: 프랑스어의 악센트 글자 뒤에는 보통 글자가 오므로 그런 짝이 되지 않음(«Hélène» · «CRÉÉE» · «créée» · «ça» 모두 그대로 — 시험에 있음). 한자만 · 기호만인 값, 일본어 · 중국어는 **추측하지 않음**(파일이 적었을 때만).
  3. **이름이 여러 표기로 올 때**(`Hong^Gildong=洪^吉洞=홍^길동` — 알파벳=한자=한글): 화면에는 **「Hong Gildong (홍 길동)」** — 첫 묶음, 그리고 그 옆에 한글 묶음(없으면 한자 묶음). 한 표기뿐이면 전과 같음(「RAKOTO Jean」, 「홍 길동」). 전에는 첫 묶음만 보였음.
  4. EMR에 알리는 `source.patient_name`은 풀어 낸 글 그대로(유니코드, JSON은 UTF-8). DICOMDIR의 이름도 같은 길.
- **스스로 고른 것**: 여러 표기일 때 「알파벳 (한글)」 둘 다 보이게(확인 창에서 우리 차트의 알파벳 이름과 맞대기 쉽고, 한글을 읽는 사람에게도 보임). 추측은 한글 음절만(한자 · 일본어 · 중국어는 헷갈릴 수 있어 넣지 않음).
- **남는 위험(알고 고른 것)**: 문자 집합을 안 적은 **서유럽** 파일에서, 값 안의 악센트가 「À~È 또는 ° ± ² ³ µ · º » ¼ ½ ¾ ¿ 바로 뒤에 또 악센트 글자」 **뿐**일 때(예: 「ÀÉ」만) 한글로 잘못 읽힘. 프랑스어 · 말라가시어 이름에서는 사실상 없는 꼴.
- **확인한 것**: `build.ps1` 통과(`Bethesda-CD.exe` 249,856바이트 · `VIEWER.EXE` 81,920바이트). `viewer_test.ps1` **29가지**(새 8: 프랑스어 Latin-1 · UTF-8 / 나란한 악센트는 한글로 읽지 않음 / 한글 — 집합이 적힘 · 안 적힘 · 서유럽이라 적힘 · UTF-8 / 세 표기 + 전환 표시 / 표기 둘의 보이는 모습 / 일본어 전환 · 중국어). `import_test.ps1` **50가지**(fr · ko · en), `-Sample`로 52가지 — 새 「13b. 한국 디스크」: 지어낸 사람 「홍길동」을 네 가지로 적은 디스크(집합 없음 · ISO_IR 100 · `\ISO 2022 IR 149` + 전환 · UTF-8) → 목록 · 확인 창 · EMR에 보낸 이름이 모두 바른 한글. `disc_test` 12. 시험 창은 화면 밖.
- **확인 못 한 것**: **실장님의 진짜 CD로는 보지 않았음**(열지 않음 — 같은 꼴을 지어내서 시험). 그 CD가 문자 집합을 어떻게 적었는지 모르므로, 위 네 가지 밖의 꼴이면 여전히 깨질 수 있음 → 실장님이 다시 해 보시고 알려 주시면 됨. 진짜 EMR에 한글 이름이 저장 · 표시되는 모습(가짜 EMR까지만). 뷰어 창에서 한글 이름이 그려지는 모습(글자 풀기만 시험).
- **`build.ps1`과 `Bethesda-CD.ini`**(총괄의 덧): `build.ps1`은 `build\` 폴더를 지우지 않고 `Bethesda-CD.exe` · `VIEWER.EXE` · `Bethesda-CD.ico`만 덮어씀 — 표식 파일을 두고 다시 빌드해 남아 있는 것을 확인. 고칠 것 없음.
- **이미 들여온 검사**: 깨진 이름으로 EMR에 적힌 것(실장님의 시험)은 그대로 남음 — 다시 들여오려면 EMR에서 「차트에서 빼기」 뒤에.
- **바꾼 파일**(PACS 저장소): `bethesda-cd\src\viewer\Dicom.cs` · `src\app\ImportDisc.cs`(이름 보이기를 같은 함수로) · `tests\viewer_test.ps1` · `tests\import_test.ps1` · `tests\fake_dicom.ps1` · `CHANGELOG.md`.
- **실장님이 이 세션에 직접 하신 말씀**: 없음.

## 2026-10-02 — 영상 저장 자리를 다른 드라이브로 · 프로그램이 들여온 외부 검사를 화면으로 봄

- **상태**: 확인 요청. **실행 중 PACS(`C:\Bethesda-PACS`)의 저장 자리는 바꾸지 않았음** — 올릴 때 주의 한 가지는 아래 「올릴 때」.
- **커밋**: **PACS 저장소** `session/pacs` `3da73f5`(main `20b11db`를 ff로 받은 뒤). **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(화면 한 줄 + 위키; develop을 받은 뒤).
- **배경**(실장님 2026-10-02): 현지 PC = C: SSD(Windows · EMR) + **D: 내장 HDD 4TB(영상)** + 외장하드(밤 백업, 둘을 번갈아).
- **한 일 — PACS 저장소**
  1. `docker-compose.yml`: 저장 자리 = `${ORTHANC_STORAGE_PATH:-./storage}`(`.env`의 한 줄; 없으면 지금처럼). 브리지가 그 자리를 **읽기 전용**으로 붙여 **그 디스크의** 남은 자리를 잼(`STORAGE_DIR`).
  2. **빈 폴더로 새로 시작하지 않게**: 저장 자리에 표식 파일 `BETHESDA-PACS-STORAGE.id`. Orthanc가 시작하기 전에 컨테이너가 「표식도 영상 색인도 없으면 시작 안 함」(계속 Restarting, `docker logs bethesda-pacs`에 이유). Orthanc 자체는 그대로(자기 시작 스크립트를 부름). `start.bat`(setup)도 켜기 전에 같은 것을 보고 빨간 글로 알리고 아무것도 안 켬.
  3. `image-storage-common.ps1`(새) · `setup.ps1`: 처음 설치 때 저장 자리를 물음(드라이브별 남은 자리, Windows 디스크 · USB · NTFS 아님 표시; `-StoragePath`로 물음 없이). `setup.sh`도 표식을 만듦.
  4. `move-image-storage.ps1`(새): 멈춤 → 복사 · 비교 → `.env` 고침 → 켬 → 검사 수 · 영상 수 · 바이트가 전과 같은지 → 옛 폴더는 이름만 바꿔 남김. 도중에 실패하면 원래대로.
  5. `prepare-backup-disk.ps1`: 영상 저장 디스크와 **같은 물리 디스크**면 거절. `image-backup.ps1`: 그런 경우 보고에 경고.
  6. `docker-compose.session.yml`: 격리 스택은 이름 붙인 볼륨 그대로, Orthanc의 원래 시작 스크립트 그대로(표식 확인은 진짜 디스크용).
  7. README(「Where the images are kept」 · 문제 해결 한 덩어리) · CHANGELOG.
- **이 PC에서 알아낸 것**(Docker Desktop): 없는 **드라이브**를 붙이려 하면 컨테이너가 안 켜짐(`mkdir Q:\…: The system cannot find the path specified`). 드라이브는 있는데 **폴더가 없으면** 긴 문법(`--mount`)으로 써도 **빈 폴더를 만들어 붙임** → 그래서 표식 확인이 꼭 필요. 컨테이너 안에서 잰 남은 자리: NTFS인 C:는 Windows의 숫자와 같음, **FAT32 USB는 15.8GB를 56MB로** 읽음 → 저장 디스크는 NTFS.
- **확인한 방법**: `store_test.ps1` **23가지 통과** — scratch 폴더 둘이 「PACS 폴더의 디스크」와 「D:」 노릇, 임시 영상 서버 `bethesda-s-pacs-reader`(127.0.0.1:9196)와 임시 브리지, 가짜 영상 9개. 내용은 `modules/pacs.md` 6.4. 끝난 뒤 임시 컨테이너 · 이미지 · scratch 폴더를 지움. 이 PC의 D:(실장님 USB)는 「USB · FAT32」로 알아보는지 **보기만** 함(아무것도 안 씀).
- **확인 못 한 것**: 진짜 다른 드라이브로의 설치 · 옮기기 · 수백 GB에 걸리는 시간 · `setup.ps1`을 처음부터 끝까지(짝 맞추기와 바탕화면 바로가기 때문에 저장 자리 부분의 함수만 따로) · Windows 시작 때 저장 디스크가 Docker보다 늦게 붙는 경우 · 오프라인 설치 스크립트를 거친 설치 · 실행 중 PACS에 올린 뒤의 모습.
- **올릴 때**(총괄): ① 이 판을 올리면 `docker compose up -d`가 **영상 서버 컨테이너를 한 번 다시 만듦**(시작 전 확인과 브리지의 붙임이 바뀌어서) — 진료가 없을 때. 저장 자리는 그대로 `.\storage`(색인이 있으므로 그대로 켜짐; `start.bat`을 돌리면 표식이 채워짐). ② 오프라인 설치(`install-offline.ps1`)가 PACS `setup.ps1 -Offline`을 부를 때 저장 자리를 묻게 됨 — 물음 없이 하려면 `-StoragePath D:\Bethesda-PACS-images`를 넘기도록(총괄 파일). ③ `02-before-departure.md`에 「디스크 구성」 덩어리를 넣었음(4절 끝).
- **프로그램이 들여온 외부 검사를 화면으로**(총괄 부탁): 격리 EMR에서 가짜 환자 26-00001의 「영상/판독」 → 「💿 6」 → 여섯 줄(검사 날짜 · 종류 `US/CR`/`OT` · 이름 · 장수)이 묶음에 나옴. 40번(JPEG 무손실 컬러 5장)을 「Voir image」 → Stone이 우리 환자 이름 · 번호로 그림(세 시리즈, 「JPEG Lossless SV1」 표시). 오른쪽 칸에 병원(TEST-BCD) · 올린 사람(RAZAFY Voahirana (essai accueil)) · 디스크의 이름 · 「생일이 달랐음」 줄. 한 줄(38번)을 「Retirer du dossier…」 → 사유 → 사라짐. 남은 31 · 32 · 35 · 37 · 40도 치움 — 영상 서버에 `EXT-` 검사 0, 검사 61 · 영상 219(시험 전과 같음).
  - **본 흠 하나를 고침**: 검사 이름이 길면 «Externe» 표시가 칸 밖으로 밀려 안 보였음 → 표시를 이름 **앞**에 둠(`RadiologyReadings.jsx` 한 줄). 긴 이름의 가짜 검사로 다시 봄.
- **바꾼 파일**: PACS — `docker-compose.yml` · `docker-compose.session.yml` · `bridge/bridge.py` · `setup.ps1` · `setup.sh` · `image-storage-common.ps1`(새) · `move-image-storage.ps1`(새) · `image-backup.ps1` · `prepare-backup-disk.ps1` · `README.md` · `CHANGELOG.md`. EMR — `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(6.1 · 6.4 · 4절 · P-35 · 변경 기록), `wiki/02-before-departure.md`, `wiki/handoff/pacs.md`.
- **공용 파일 변경**: `wiki/02-before-departure.md`(총괄이 말씀하신 「디스크 구성」). **DB 마이그레이션 · 번역 키**: 없음.
- **다른 세션에 부탁**: 총괄 — 위 「올릴 때」 ①②. 설명서(`manual-fr`)에는 설치 절이 없어 넣지 않았음(직원용) — 설치 문서(`DEPLOYMENT.md` · `OFFLINE-INSTALL.md`)에 한 줄이 필요하면 총괄이.

## 2026-10-02 — Bethesda CD: 들여오기 (다른 병원의 CD · USB → 환자의 차트) — 프로그램 쪽 (설정 세션이 맡음)

- **상태**: 확인 요청 — 일 4. **진짜 EMR + 영상 서버(PACS 세션의 격리 스택)에 실제로 올려 봄 — 통과**(아래 「진짜 스택에서」). 시험용 EMR에 지어낸 검사 여섯이 남아 있음(PACS 세션이 치움).
- **커밋**: **PACS 저장소** `session/cd`(워크트리 `C:\Bethesda-worktrees\pacs-cd`) — `c4a6117`(들여오기) · `d56e4ac`(할 수 없을 때는 환자 질문 없이 까닭만) · `e2de1ba`(확인 창의 「N image(s)」) · `2e47fa8`(시험이 찍는 그림) · `d949d7e`(진짜 시험용 EMR에 붙여 돌릴 시험 `import_real_test.ps1`) · `aab539b`(main `f6b2e10`을 받음) · `f20a93d`(기다리는 동안 창이 살아 있게 + 시험 창을 화면 밖에) · `0121336`(진짜 스택에 돌려 보고 고친 것) · 그 뒤의 README 한 건. 일 1~3의 `3f1cb91` · `0f970ea` 위. push 하지 않음. 위키는 EMR `session/settings`의 이 커밋.
- **만든 것**(쓰는 법은 [modules/pacs.md 2.4.5절](../modules/pacs.md), 현장 설명서는 [manual-fr/pacs.md 13절](../manual-fr/pacs.md))
  - 창 위에 두 갈래 단추 — **Copier vers un CD** · **Importer un CD / une clé USB**. 접수 권한만 있는 계정은 들여오기만 보이고 `export/patient`를 부르지 않음(PACS 세션의 부탁대로). 진료 · 수납 권한이 있으면 둘 다, 내보내기가 먼저.
  - 차트번호 → **Choisir le disque ou le dossier…** → 검사 목록(날짜 · 종류 · 검사 · 장수 · 크기 · 병원 · 디스크의 환자 · 상태). EMR이 「못 받는다」고 한 검사(이미 들여옴 · 우리 검사 · 다른 환자의 것 · 들여오는 중 · 파일이 한도를 넘음)는 회색, 체크할 수 없고 까닭이 적힘.
  - **Importer…** → **환자 확인 창**: 디스크의 이름 · 번호 · 생일 · 성별과 우리 차트의 것을 나란히. 생일 · 성별이 다르면 빨갛게, 체크할 글이 「그래도 맞다」로 바뀜. 체크해야 단추가 켜짐. 이름은 보여 주기만(판정하지 않음).
  - 올리기: 검사마다 begin → 파일을 한 장씩 **그대로**(`application/dicom`, 읽는 대로 흘려보냄 — 메모리에 통째로 올리지 않음) → finish. 진행 줄 · 막대 · **Annuler**. 실패하거나 그만두면 cancel(까닭과 함께)로 EMR이 받은 것을 치움.
  - API는 약속([reference/external-images-import-api.md](../reference/external-images-import-api.md))의 ⓪~⑤ 그대로 — 약속에 없는 것은 부르지 않음.
- **바꾼 파일**(PACS 저장소, `bethesda-cd\`만): `src\app\ImportDisc.cs`(새) · `ImportConfirm.cs`(새) · `MainForm.cs` · `Emr.cs` · `Texts.cs`(글 75개쯤, fr · ko · en) · `src\viewer\Disc.cs`(`ListOnly` 하나) · `build.ps1`(프로그램에 뷰어의 `Dicom.cs` · `Disc.cs`를 함께 컴파일) · `tests\import_test.ps1`(새) · README(둘) · CHANGELOG. 판 번호 1.0.0 그대로. `Bethesda-CD.exe` 244,736바이트(전 184,320), 그 안의 `VIEWER.EXE` 79,360바이트.
- **스스로 고른 것**(물을 만한 것 — 안전한 쪽을 골라 계속했음. 바꾸려면 말씀만)
  1. **DICOMDIR이 있으면 목록은 그것으로**(시리즈마다 한 장의 머리만 읽음 — CD가 느려도 빨리 뜸). 그 대신 **올리기 직전에 그 검사의 모든 파일 머리를 읽어**(`Verify`) 그 검사 · 그 환자의 것이 아닌 파일을 빼고, 장수 · 크기를 다시 셈. DICOMDIR이 틀린 디스크에서도 EMR에 알리는 수와 보내는 수가 맞음.
  2. **DICOMDIR이 없으면 폴더를 훑되**, 이름으로 보아 프로그램 · 라이브러리 · 문서 · 그림인 파일은 **열지도 않음**(`.exe` · `.dll` · `.inf` · `.jpg` · `.pdf` … — `ImportDisc.NotOpened`). 나머지는 머리 132바이트의 「DICM」을 봄.
  3. **디스크에 환자가 둘이면 한 번에 한 환자의 검사만**(둘을 함께 체크하면 확인 창 전에 거절) — 확인 창이 한 사람과 한 차트를 맞대는 창이라서.
  4. **끊기면 같은 파일을 세 번까지**(연결이 끊긴 것만 — EMR이 거절한 것 · 디스크를 못 읽은 것은 다시 하지 않고 그 검사를 그만둠). finish도 끊기면 다시 물음.
  5. **이 PC에 아무것도 남기지 않음**: 마지막에 고른 폴더도 기억하지 않음, 디스크의 것을 PC로 옮겨 놓지 않음(디스크에서 바로 읽어 보냄).
  6. **영상 서버가 없거나 짝이 안 맞거나 자리가 모자라면** 단추가 꺼지고, 그래도 불리면 환자 질문 없이 까닭만 말함(`d56e4ac`).
  7. **글을 바꾼 것**: 창 제목 「Bethesda CD — Copie et importation d'images」, 로그인 안내와 「권한 없음」 문장에 접수 권한을 넣음, 닫을 때 「일하는 중」 문장이 두 갈래 모두에 맞게.
  8. **뷰어 코드를 프로그램도 씀**: DICOM 머리 · DICOMDIR 읽기를 두 번 짓지 않으려고. 뷰어에는 `Disc.ListOnly`(영상을 읽지 않고 목록만) 하나가 늘었고 동작은 그대로(`viewer_test.ps1` 21가지 통과).
- **확인한 것**(이 PC, Windows 11, PowerShell 5.1)
  - `build.ps1` 통과. `viewer_test.ps1` 21 · `disc_test.ps1` 12(`-Mount -Sample`로 16) 그대로 통과.
  - **`tests\import_test.ps1` 46가지 — 프랑스어 · 한국어 · 영어 모두 통과**, `-Sample D:\CD-TEST\JPEG-TEST`(DICOMDIR이 있는 가짜 환자 디스크 5장 — 읽기만)로 48가지. EMR 없이: 스스로 만든 가짜 DICOM 디스크(뷰어 · DLL · AUTORUN.INF · 그림 · 엉뚱한 파일이 섞임)와 이 PC의 가짜 EMR(127.0.0.1의 HttpListener)로 —
    - 권한: 진료 · 수납 · 접수가 없는 계정은 못 들어옴 / 접수 계정은 들여오기만 / 진료 계정은 둘 다.
    - 디스크 읽기: 검사 둘 · 영상 다섯, 최근 것이 위 / 뷰어 · DLL · AUTORUN.INF · 메모 · 그림은 **열지 않음**(머리를 열어 본 것 가운데 영상이 아닌 것은 엉뚱한 파일 하나뿐) / 악센트가 든 이름 그대로 / 크기 = 파일 크기의 합.
    - EMR에 묻는 것: check 한 번에 두 검사 / 이미 들여온 검사는 회색 + 날짜 / 억지로 체크해도 세지 않음.
    - 환자 확인: 질문에 「아니오」면 아무것도 안 보냄 / 생일이 같으면 표시 없음, 다르면 빨간 줄과 「그래도」 문장 + EMR에 `confirm.birth_differs: true` / 체크 전에는 단추가 꺼져 있음.
    - 올리기: begin(장수 · 크기 · 원래 값) → 세 파일을 **바이트까지 그대로**, `application/dicom`, 길이와 함께 → finish, cancel 없음 / 진행 줄 / 끝난 뒤 그 검사는 「이미 있음」.
    - 실패: EMR이 파일을 거절 → 그 검사를 그만두고 cancel(까닭) / 연결이 끊김 → 같은 파일을 다시 보내 끝냄 / **Annuler** → 멈추고 cancel / finish가 거절 → cancel.
    - 한도: 파일 하나가 한도를 넘는 검사는 회색 / 자리가 모자라면 단추 꺼짐 + 불려도 안 보냄 / 큰 검사는 먼저 물음.
    - 그 밖: 영상 서버가 답하지 않음 / 환자 둘인 디스크 / DICOM이 없는 폴더 / 옛 EMR(404) / 끝난 토큰 → 로그인 칸으로.
    - 뒤처리: 디스크는 그대로(파일이 늘지도 바뀌지도 않음) / 이 PC에 환자의 것이 남지 않음 / 설정 파일에 비밀번호 없음 / 시험이 남긴 것 없음.
  - **진짜 EMR(이 세션의 격리 스택 9187 — develop의 서버, 영상 서버 없음)에 붙여서**: 검사실 권한만 있는 계정 → 거절 / 접수만 → 들여오기만 / 진료 → 둘 다. ⓪ `import/patient`의 답이 약속한 열쇠 그대로(`patient` · `server` · `free_bytes` · `spare_bytes` · `max_file_bytes` · `warn_bytes` · `imported`), `server = NOT_PAIRED` → 창이 「영상 서버가 EMR과 이어져 있지 않음」을 말하고 단추가 꺼짐. 스택은 `down -v`, 시험 계정의 비밀값 파일은 지움.
  - 공개될 폴더: 바뀐 줄 전체에 이 PC의 경로 · 주소 · 계정 · 비밀값이 없음(찾아봄). 시험의 사람은 모두 지어낸 이름.
- **진짜 스택에서**(2026-10-02, 총괄: 「(가)로 하세요 — 지금」. PACS 세션의 격리 스택 EMR `127.0.0.1:9188` — 실행 중 EMR이 아님. 설정 · 컨테이너는 건드리지 않고 쓰기만. 시험 계정의 비밀값은 PACS 세션의 파일에서 읽어 환경변수로만 넘김 — 화면 · 로그 · 저장소에 없음)
  - **`import_real_test.ps1` — 접수만 있는 계정 `bcdreg`, 차트 26-00001: 24가지 통과.** 로그인(내보내기 없음 · 들여오기 있음) → 환자 · 영상 서버가 답함 · 남은 자리 → 지어낸 디스크의 두 검사 모두 고를 수 있음 → **검사 하나(3장)를 실제로 들여옴** → EMR의 목록에 3장 · 파일 크기의 합 · 병원 · 원래 번호 · `birth_differed: true`(확인 창에서 생일이 다르다고 나온 그대로) → 같은 검사는 회색 「déjà importé le 2026-10-02」, 창 없이 begin을 보내면 **409 `HERE`** → 둘째 검사(1MB × 8장)를 첫 장이 간 뒤 **Annuler** → 「Importation annulée…」, EMR의 목록은 그대로 · 그 검사는 다시 고를 수 있음(EMR이 치움).
  - **한도를 넘는 파일**(`-OverLimit` — 창은 그런 검사를 회색으로 막으므로 창을 거치지 않고 보냄; 스택의 한도 1GB 그대로, 1GB + 1MB의 빈 파일): **413 `TOO_BIG_FILE`** 가 4초 만에 옴(프록시가 파일을 다 받은 뒤) → 프로그램이 「파일 하나가 허용 크기를 넘습니다」로 읽음, 다시 보내지 않음 → cancel 200, 그 검사는 다시 고를 수 있음.
  - **진짜 디스크 폴더**(`-RealDisc D:\CD-TEST\JPEG-TEST` — DICOMDIR이 있고 JPEG로 눌린 초음파 5장, 가짜 환자 「TS TEST」, 생일 · 성별 없음 — 읽기만): DICOMDIR로 읽힘 → 확인 창(생일 · 성별이 디스크에 없어 「다름」 표시 없음) → **5장 들여옴, EMR이 모든 장을 그릴 수 있음**(`undrawn` 없음) → 목록에 보임 → 다시 읽으면 「이미 있음」.
  - **`app_test.ps1`(내보내기) — 수납만 있는 계정 `bcdpay`, 검사 57 · 60(5장): 23가지 통과** — 다시 쓴 `MainForm`으로 로그인 · 목록(35건, 못 나가는 검사 11건은 까닭과 함께) · 폴더 저장(`AUTORUN.INF` · `DICOMDIR` · `IMAGES` · `README.TXT` · `VIEWER.EXE`, 뷰어는 바이트까지 같음) · ISO · 같은 이름 거절 · 못 쓰는 자리 · 굽기는 「아니오」(G:의 디스크가 비어 있지 않아 단추도 꺼져 있음) · 끝난 토큰.
  - **시험용 EMR에 남긴 것**(차트 26-00001, 모두 지어낸 것 — **PACS 세션이 치움**): import id **31 · 32 · 35 · 38**(「ESSAI BETHESDA CD …」 3장씩) · **37**(「… (2)」 8장 — 매개변수 이름이 겹친 시험 잘못으로 한 번 더 들어감) · **40**(JPEG-TEST의 「SONO(5)」 5장). 그만둔 들여오기(33 · 34 · 36 · 39 등)는 EMR이 치운 것으로 목록에 없음.
  - **돌려 보고 고친 것**: ① 시험이 「그만」을 너무 일찍 눌렀음(파일 확인 중 — 보내기 전) → 확인 창에 답한 뒤 첫 장이 간 다음에 누름. ② 시험의 `-Disc`가 변수 `$disc`와 같은 이름(PowerShell은 대소문자를 가리지 않음) → `-RealDisc`. ③ 프로그램: EMR이 파일을 다 받기 전에 거절하고 줄을 끊으면 「연결이 끊김」으로 읽어 세 번 다시 보내던 것 → 그 답을 읽음(`PutFile`), 코드 없는 413도 「파일이 한도를 넘음」으로. **약속과 서버가 어긋난 곳은 없었음.**
- **확인 못 한 것**
  - EMR이 파일을 **다 받기 전에** 줄을 끊으며 거절하는 경우 — 프로그램은 이제 그 답을 읽도록 고쳤지만(`PutFile`), 이 스택에서는 프록시가 파일을 다 받은 뒤 413이 왔으므로 그 길은 실제로 밟지 못했음.
  - 진짜 CD 드라이브의 느린 · 긁힌 디스크, 다른 병원의 **진짜** 디스크(실장님의 병원 초음파 CD가 다음 차례), 수 GB짜리 검사에 걸리는 시간과 그동안의 창, 여러 PC에서 동시에.
  - 들여온 검사가 EMR **화면**(「영상/판독」의 외부 영상 묶음)에 어떻게 보이는지 — API의 목록(`imported`)으로만 확인. 화면은 PACS 세션의 것.
  - 한국어 · 영어로는 가짜 EMR 시험만(진짜 스택은 프랑스어로만).
  - 굽기는 이번에도 하지 않음.
- **알릴 것**
  - **실장님 화면에 시험 창이 떴던 일**(총괄을 거쳐 온 실장님 말씀: 「켜져서 뭐 하더니 이러고 있는디」): `import_test`가 창을 화면 한가운데에 띄웠고, 스크립트가 창의 스레드를 잡고 있는 동안 「응답 없음」으로 보였음. 죽은 것이 아니라 도는 중이었고 스스로 끝남(남은 프로세스 · 임시 폴더 없음을 확인). **고친 것 둘**: ⓐ 시험 창은 이제 **화면 밖(-20000) · 작업 표시줄에 없음 · 포커스를 빼앗지 않음**(`tests\quiet_window.ps1` — 창 시험 넷 모두). ⓑ 같은 원인이 진짜 프로그램에도 있었음 — 들여오기의 begin · 파일 · finish · cancel을 창의 스레드에서 기다려, EMR이 큰 검사를 끝내는 몇 분 동안 직원에게 「응답 없음」으로 보이고 **Annuler** 도 눌리지 않았을 것 → 그 기다림을 다른 스레드로 옮기고 창은 계속 답함(`MainForm.Wait`; 로그인 · 환자 조회 · 내보내기는 그대로).
  - **G: 드라이브**: 프로그램은 내보내기 갈래에서 2초마다 버너의 상태를 읽음(전부터 그러함). 시험 중 창이 내보내기 갈래에 있던 동안 실장님의 G:(빈 디스크가 아닌 디스크)의 **상태만** 읽혔음 — 파일은 열지 않았고 아무것도 쓰지 않았음. 들여오기 갈래에서는 이 물음을 멈춤.
  - **시험이 한 번 멈춰 있었음**: 프로그램이 보내던 것을 끊으면 가짜 EMR이 죽어 시험이 5분 넘게 기다림 → 그 PowerShell 하나(창 제목으로 가려냄)만 끝내고 그 임시 폴더를 지움, 가짜 EMR을 요청마다 따로 잡게 고침. 다른 프로세스는 건드리지 않음.
  - **문서의 그림**: [들여오기 창](../reference/design/bethesda-cd-import-sample-fr.png)의 「Source」 줄은 시험 폴더의 경로 대신 「G:\」로 **다시 그려 넣음**(이 PC의 경로가 보이지 않게 — 나머지는 찍힌 그대로). [환자 확인 창](../reference/design/bethesda-cd-import-confirm-fr.png)은 지어낸 사람.
  - 이 문서의 41번째 줄에 남아 있던 `/^>>>>>>> session/pacs$/d` 한 줄(합칠 때 흘러든 명령)을 지움.
- **다른 세션에 부탁**: **PACS 세션** — 격리 스택의 차트 26-00001에 남은 지어낸 외부 검사 여섯(import id 31 · 32 · 35 · 37 · 38 · 40)을 치워 주세요. 그리고 들여온 것이 「영상/판독」 화면에서 보이는 모습 확인(프로그램 쪽에서는 API의 목록까지만 봄).
- **실장님이 이 세션에 직접 하신 말씀**: 일 4 동안에는 없음(시험 창에 대한 말씀은 총괄을 거쳐 옴 — 위 「알릴 것」).

## 2026-10-02 — 큰 검사를 옮길 때 화면이 「서버가 응답하지 않음」을 보던 것

- **상태**: 확인 요청(작은 것). 총괄: 「둘 다 하세요 — nginx 블록(이번에는 세션이 넣어도 됨) + 화면이 상태를 다시 물음」.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(develop을 받은 뒤). **PACS 저장소** — 없음.
- **한 일**: ① `frontend/nginx.conf` — `location = /api/pacs/move`(그 길 하나만, 기다림 600초; 나머지는 `/api/`와 같음). ② `MoveStudy.jsx` — 요청이 코드 없이 실패하면(끊김 · 502 · 시간 초과) 그 바로잡기의 줄을 4초마다(10분까지) 다시 물어 끝난 모습대로 알림; 기다리는 동안의 문장 `px_mvStillWorking`. `RadiologyReadings.jsx`가 `patientId`를 넘김(한 줄).
- **공용 파일 변경**: **`frontend/nginx.conf`** — 새 블록 하나:
  `location = /api/pacs/move { proxy_pass http://backend:3000; proxy_http_version 1.1; Host · X-Real-IP · X-Forwarded-For; proxy_read_timeout 600s; proxy_send_timeout 600s; proxy_connect_timeout 5s; proxy_intercept_errors on; error_page 502 503 504 = /api_backend_down.json; }`
- **DB 마이그레이션**: 없음. **번역 키**: `px_mvStillWorking`(fr · en · ko).
- **확인한 방법**(격리, 가짜 환자 26-00005의 48장짜리 검사): ① nginx를 거쳐 옮기기 — 전에는 60초에 502, 이제 **66초 뒤 200 `done`**. ② 화면에서 — 브라우저의 요청을 일부러 끊어(서버에는 보냄) 「Déplacer les images」: 10초 뒤 «Le serveur d'images travaille encore (examen volumineux)… ne fermez pas cette fenêtre.», 약 70초 뒤 **«✓ C'est fait : les images sont sous la bonne demande.»**. 검사는 원래 오더(65)로 돌아가 있음.
- **확인 못 한 것**: 10분을 넘는 옮기기(그만큼 큰 검사가 없음) · `rolled-back` · `cleanup-pending`으로 끝나는 끊긴 요청의 화면 문장(코드로만) · 한국어/영어 화면.
- **바꾼 파일**: `frontend/nginx.conf`, `frontend/src/components/MoveStudy.jsx`, `RadiologyReadings.jsx`, `frontend/src/i18n/{fr,en,ko}.js`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`.
- **다른 세션에 부탁**: 없음.

## 2026-10-02 — Bethesda CD: 뷰어 이름 VIEWER.EXE · AUTORUN.INF · 16px 아이콘 확인 (설정 세션이 맡음)

- **상태**: 확인 요청 — 일 1~3. 일 4(들여오기 갈래)는 이어서, 따로 보고.
- **누가**: **설정 세션**(총괄의 일 나누기 — 실장님: 「팍스 세션한테 일이 너무 많으면 분배좀 해줘라」). PACS 세션은 `bethesda-cd\`를 건드리지 않음.
- **커밋**: **PACS 저장소** 워크트리 `C:\Bethesda-worktrees\pacs-cd`, 브랜치 `session/cd`(main `80417f7`에서) — `3f1cb91`(이름) · `0f970ea`(AUTORUN.INF). push 하지 않음. 위키는 EMR 저장소 `session/settings`의 이 커밋.
- **일 1 — `VOIR.EXE` → `VIEWER.EXE`**(실장님 결정): 디스크 위의 파일 이름, 프로그램 안의 자원 이름, `README.TXT`의 안내 문단(fr · en — 이름이 두 글자 길어져 줄을 다시 나눔, 가장 긴 줄은 전과 같이 78자), 「뷰어를 넣지 못했습니다」 안내(fr · ko · en), 시험, `bethesda-cd`의 README · CHANGELOG · LICENSE, 저장소 맨 위 README, 옛 `cd-export*.ps1`(같은 뷰어를 그 자리에서 지음). 창 안의 글과 소스 폴더 이름(`src\viewer`)은 그대로. 파일 22개, 줄 58개가 바뀜(BOM · 줄 끝 그대로).
- **일 2 — `AUTORUN.INF`**: 뷰어가 들어간 디스크에만 네 줄(`[autorun]` · `open=VIEWER.EXE` · `icon=VIEWER.EXE,0` · `action=Voir les images / View the images`), ASCII · CRLF. `DiscFolder.WriteAutorun`이 작업 폴더에 쓰고, 그 폴더가 폴더 저장 · ISO · 굽기에 그대로 가므로 세 길 모두에 들어감. 뷰어가 없으면 쓰지 않고, 남아 있던 것이 있으면 지움. 옛 `cd-export*.ps1`에는 넣지 않음(Bethesda CD가 대신함).
- **일 3 — 16px 아이콘**: [bethesda-cd-icon-16px-windows.png](../reference/design/bethesda-cd-icon-16px-windows.png) — Windows가 꺼낸 그대로(`SHGetFileInfo`), 있는 그대로와 10배 확대, 밝은 · 어두운 · 고른 바탕. `Bethesda-CD.exe` · 설치 스크립트가 만든 바로가기(화살표 포함) · `VIEWER.EXE` 모두 16px에서 **디자인이 다시 그린 16px 그림 그대로**(청록 네모 · 흰 원 · 십자가가 또렷함). 32px는 원 안의 고리와 십자가. 바로가기는 Windows의 화살표가 왼쪽 아래 1/4을 가림(모든 바로가기가 그러함). 설치는 진짜 설치 스크립트를 **scratch의 가짜 바탕화면 · 가짜 프로그램 폴더로**(`-Desktop` · `-To`) 돌림 — 진짜 바탕화면은 건드리지 않음.
- **확인한 것** (이 PC, Windows 11, PowerShell 5.1)
  - `build.ps1` → `Bethesda-CD.exe` 184,320바이트 · 그 안의 `VIEWER.EXE` 79,360바이트. `viewer_test.ps1` 21가지 통과.
  - 새 `tests\disc_test.ps1`(EMR 없이): 12가지, `-Mount -Sample D:\CD-TEST\JPEG-TEST`(가짜 환자 5장 — 읽기만)로 16가지 통과 — 뷰어가 프로그램에 든 것과 바이트까지 같음 · AUTORUN.INF의 내용 · 뷰어 없는 폴더에는 안 씀 · README가 VIEWER.EXE를 두 번 말함 · 폴더 저장 뒤 다시 읽어 비교 · ISO · **ISO를 가상 드라이브로 물려** CD로 보임 · 파일 목록 · 파일마다 비교 · 내림 · 남는 것 없음.
  - 물린 ISO에서(scratch의 스크립트): 탐색기의 드라이브 이름 「DVD 드라이브 (H:) IMG_00_00000」, **아이콘이 뷰어의 것**, 메뉴가 「Voir les images / View the images · 자동 실행 열기… · … · 열기 · …」 순, Windows가 읽어 둔 값 `shell\AutoRun\command = "H:\VIEWER.EXE"`, **물렸을 때 실행된 프로그램 0**, 기본 동작(더블클릭과 같음)을 부르니 `H:\VIEWER.EXE`가 열리고 창 제목에 그 디스크의 환자(가짜), 닫고 내림. 이 사용자의 자동 실행 설정은 「켜짐, 프로그램이 든 디스크는 물어봄」.
  - **Microsoft Defender**(`MpCmdRun -Scan -ScanType 3 -DisableRemediation`): 물린 디스크 · ISO 파일 모두 「found no threats」.
  - 옛 스크립트: `cd-export-common.ps1`를 불러 `Write-DiscReadme` · `Add-DiscViewer`를 scratch 폴더에 돌림 → `README.TXT` · `VIEWER.EXE`. 바뀐 `.ps1` 여섯은 PowerShell 5.1 파서 통과.
- **확인 못 한 것**
  - `app_test.ps1`(시험용 EMR이 있어야 함 — PACS 세션의 격리 스택): 기대하는 폴더 내용만 새 파일에 맞게 고치고 **돌리지 않음**. 옛 `cd-export.bat`의 전체 흐름도 같은 까닭으로 돌리지 않음.
  - 굽기: 돌리지 않음(실장님 승인이 있어야 함). 굽기 코드는 같은 작업 폴더를 받으므로 AUTORUN.INF가 들어간다는 것은 코드로만.
  - 진짜 드라이브의 구운 CD에서의 모습, 디스크를 넣을 때 뜨는 **알림 자체**(화면을 보지 않음), 다른 백신, 자동 실행을 막아 둔 PC, Windows 10.
- **알릴 것**
  - **아이콘 파일의 모양(디자인 세션께)**: `Bethesda-CD.ico`의 네 장(16 · 32 · 48 · 256)이 **모두 PNG로** 들어 있음. Windows의 탐색기 · 실행 파일 자원은 잘 읽음(위 그림). 다만 .NET의 `Icon` 클래스는 작은 PNG 장을 못 읽어 깨진 그림을 줌(시험 그림을 만들다 봄) — 프로그램은 창 아이콘을 탐색기 방식(`ExtractAssociatedIcon`)으로 꺼내므로 지금 영향 없음. 작은 장(16 · 32 · 48)을 BMP로 넣는 것이 관례이니, 다음에 아이콘을 다시 만들 때 참고.
  - **이 PC에 남은 것**: ISO를 물릴 때마다 탐색기가 그 가상 디스크의 정보를 사용자 레지스트리(`HKCU\…\Explorer\MountPoints2\{볼륨 번호}`)에 적어 둠 — Windows가 스스로 하는 일이고 지우지 않았음(해가 없는 기록, 서너 줄). scratch의 ISO · 가짜 바탕화면 · 가짜 프로그램 폴더는 세션 scratch에 있음.
  - 뷰어 창이 **몇 초 동안 실장님 화면에 떴을 수 있음**(기본 동작을 불러 본 한 번, 가짜 환자 — 바로 닫음).
- **실장님이 이 세션에 직접 하신 말씀**: 「총괄한테 물어봐」(이 일을 맡아도 되는지 창에 띄운 질문의 답) → 총괄에 물어 「맞다」를 받고 시작. 앞으로 묻는 것은 총괄에게(작업 규칙 11절).
## 2026-10-02 — 외부 영상: 접수 전용 계정으로 시험 · 프로그램 시험용 계정 · 남은 주석 둘 · 낡은 옮기기 시험

- **상태**: 확인 요청(작은 것). 프로그램 쪽(설정 세션)이 물어 오는 것에 답하고, 끝나면 함께 맞춰 봄.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(주석 두 줄 + 위키). develop(051로 번호가 바뀐 것까지)을 받음. **PACS 저장소** — 없음(main과 같음).
- **접수 권한만 있는 계정**(격리, `import_reg.py` 10가지 통과): 환자 조회 · check · begin · 한 장 · finish · 목록은 됨. 영상 열기(`viewer-url`) · 차트에서 빼기 · 반출의 `export/patient`와 `export/bundle` · 우리 검사 목록(`readings/patient`)은 403. → **프로그램은 접수 전용 계정이면 `export/patient`를 부르지 말고 `import/patient`만**(「내보내기」 갈래를 숨김). 수납 전용 계정은 둘 다 200.
- **프로그램 시험용 계정**(격리 스택에만 — 실행 중 EMR에는 없음): `bcdreg`(접수만) · `bcdpay`(수납만), 역할 frontdesk, 가짜 이름. 비밀번호는 스크립트가 만들어 **PACS 세션 scratchpad의 `bcd-test-accounts.txt`** 에만 적음(화면 · 메시지 · 저장소에 없음). 다시 만들려면 scratchpad의 `bcd_accounts.py`(비밀번호가 새로 바뀜).
- **남은 주석 둘**: `ImagesPrint.jsx`의 `issued`(「the document number, once issued」 → 로그에 적힌 뒤 참), `RadiologyReadings.jsx`의 `reportValues` 위(「kept in the issued record only」 → 종이에 없는 값이라는 뜻으로). 동작 변화 없음.
- **`move_blocks.py`는 기다림의 문제가 아니었음 — 낡은 시험**: 맞바꾸기와 「사유는 선택」이 생기기 **전에** 쓴 스크립트라, 지금 코드에 돌리면 「거절되어야 한다」던 것들이 **실제로 옮겨짐**. 오늘 두 번 돌려 격리의 가짜 검사에 바로잡기 넷(63↔68 · 65→45 · 63↔62 · 67↔69)이 생겼고, **거꾸로 넷을 다시 해 원래대로 돌려 놓음**(`move_restore.py`; 줄 48~51). `STILL_ARRIVING`은 방금 바뀐 검사를 1분 안에 다시 옮기려 한 것 — 코드가 맞게 거절한 것(P-33 ②). 스크립트는 `move_blocks_OUTDATED_do_not_run.py`로 이름을 바꾸고 첫 줄에서 멈추게 함. 지금의 옮기기 시험은 `swap_failures.py` · `reason_test.py` · `reapply_test2.py`. 앞 보고의 「시험 스크립트의 기다림 문제」는 반만 맞은 말이었음.
- **그러다 본 것**(P-33 ③에 숫자를 보탬): 48장짜리 검사 옮기기가 68초 — nginx가 60초에 끊어 요청은 502를 받았지만 옮기기는 끝나 있었음.
- **격리 스택**: 그대로 떠 있음. 코드 = develop + 이 커밋, DB의 마이그레이션 이름도 051로 맞춤(내용의 머리말이 바뀌어 시작할 때 「checksum mismatch」 경고 한 줄이 나옴 — 격리에서만, 동작과 무관). 외부 검사 0건.
- **바꾼 파일**: `frontend/src/components/ImagesPrint.jsx` · `RadiologyReadings.jsx`(주석만), `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음.
- **다른 세션에 부탁**: 프로그램을 짓는 세션 — 위의 「접수 전용 계정이면 `import/patient`만」.

## 2026-10-02 — 외부 영상 들여오기: EMR 쪽(서버 · 「영상/판독」의 외부 영상 묶음) — 오더 없이 환자에게

- **상태**: 확인 요청. 프로그램(Bethesda CD의 「들여오기」) 쪽은 **설정 세션이 맡음**(총괄의 일 나누기) — PACS 세션은 PACS 저장소의 `bethesda-cd\` · `cd-export*.ps1`을 더 건드리지 않음.
- **커밋**: **EMR 저장소** `session/pacs` — `ade2deb`(서버 · 화면 · API 약속) + 이 항목이 든 커밋(접수 권한 · 화면 다듬기 · 위키). 그 앞의 `e2b4816` · `bc82262`는 폐기된 안(오더에 붙임)의 중간 커밋 — 그 위에 고쳐 썼으므로 따로 볼 것 없음. develop을 `git merge`로 합침. **PACS 저장소** `session/pacs` — `1c593bd`(main `80417f7`을 ff로 받은 뒤 `bridge/bridge.py` 한 건).
- **방식**(실장님 2026-10-02: 「차트번호 입력하면 그 환자 것으로 외부 영상이 들어감 … EMR 영상판독에서 조회하면 다 뜨게」): 외부 영상은 **환자에게** 붙음 — 오더 · 진료 · 방문 · worklist_log · 수납 줄 없음, 판독 칸 없음. EMR은 **표 `pacs_import`에 `done`으로 적힌 것만** 보여 줌. 앞의 두 안(오더에 붙임 / EMR 화면에서 브라우저로 올림)은 폐기 — 그때 넣었던 배선(`pacs.move`의 EXTERNAL, `export`의 external, `readings`의 external, 오더 코드 `IMG-EXT`)은 모두 되돌림(`pacs.move.js`는 develop과 같음).
- **한 일**
  - `backend/sql/051_pacs_import.sql`(임시 번호): 표 `pacs_import`(검사 하나 = 한 줄) + `pacs_config.import_max_file_mb`(기본 1024). 오더 코드는 만들지 않음.
  - `backend/src/routes/pacs.import.js`: 프로그램이 부르는 `patient` · `check` · `begin` · `instance`(몸통 = DICOM 파일 그대로, EMR에 머물지 않고 흘러감) · `finish` · `cancel`, EMR 화면이 부르는 `list` · `:id/viewer-url` · `:id/undo`, 뒷정리 `resume`(서버도 5분마다 스스로). 검사 번호는 새 가지 `…3680043.9.7308.<id>.<시각>`, accession은 `EXT-<id>`.
  - `pacs.routes.js`: 심박의 `storage_free_bytes`/`storage_total_bytes` 받기 · `superseded-images`에 치운/뺀 검사 · `/study-arrived`가 들여오는 중인 검사를 거절(409) · `PUT /pacs/config`가 `import_max_file_mb`(1~4096)를 받음. `pacs.viewer.js`: 외부 검사용 안내 둘(영상 서버에 없음 / 그림 없는 자료뿐). `utils/audit.js`: `pacs.images.import`.
  - 화면: `frontend/src/components/OutsideStudies.jsx`(새) + `RadiologyReadings.jsx` — 목록 맨 아래 「💿 Imagerie externe (CD / USB)」 묶음, 목록 위 「💿 N」 단추, 오른쪽 칸(병원 · 장수/크기 · 누가 언제 · 디스크의 이름/번호 · 생일/성별이 달랐다는 표시), 「Voir image」(판독 칸 없는 영상 창), 「Retirer du dossier…」(사유 필수). `Consultation.jsx` · `Payment.jsx`는 고치지 않음.
  - PACS 저장소 `bridge/bridge.py`: 심박에 영상 서버 디스크의 남은 자리.
  - 문서: `wiki/reference/external-images-import-api.md`(새 — 프로그램이 부르는 길의 약속), `external-images-import-design.md`(맨 위에 「확정된 방식」, 폐기된 절에 표시), `modules/pacs.md`(2.8 · 4절 서버/화면/표 · P-34 · 변경 기록), `manual-fr/pacs.md`(13절 · 안내문 두 줄 · 관리자 바로가기 이름), `changelog-1.5.0/pacs.md`, `image-print-export-design.md`(바로가기 이름).
- **공용 파일 변경**: `frontend/nginx.conf` — 새 블록 `location /api/pacs/import/`(몸통 크기 제한 없음 · `proxy_request_buffering off` · 시간 제한 900초 · 502~504는 다른 길과 같이 `/api_backend_down.json`). 다른 길의 1MB 한도는 그대로. `backend/src/utils/audit.js`(동작 이름 한 줄). `frontend/src/i18n/{fr,en,ko}.js` — `px_` 구간 안에 `px_x…` 22개씩.
- **DB 마이그레이션**: `051_pacs_import.sql`(총괄이 매긴 번호). 격리 DB에는 적용돼 있음(옛 모양의 851을 지우고 다시 적용).
- **번역 키**: `px_xGroup` `px_xChip` `px_xStudyDate` `px_xFrom` `px_xFromUnknown` `px_xImported` `px_xCameAs` `px_xBirthDiffered` `px_xSexDiffered` `px_xUndrawn` `px_xNoReading` `px_xUndo` `px_xUndoAsk` `px_xUndoReason` `px_xUndoGo` `px_xUndoFail` `px_xOpenFail` `px_xErr_UNREACHABLE` `px_xErr_NOT_PAIRED` `px_xErr_NOT_DONE` `px_xErr_NOT_FOUND` `px_xErr_NO_REASON` — fr · en · ko.
- **확인한 방법**(격리 스택 EMR 9188 · PACS 9198, 공개 견본 CT와 이 세션이 그린 가짜 환자 영상): `import_api.py` **48가지 통과**(내용은 `modules/pacs.md` 4절) — 그 가운데: 들여온 뒤 오더 · worklist_log · 방문 · 진료 · 수납 줄 수가 처음과 같음, 그림 바이트 · 압축 그대로, 끊긴 것은 남지 않음, 영상 서버를 끈 채 취소 → 켠 뒤 치움. 반출 `export_api.py` 31가지 그대로 통과. 화면(진료 화면, 불어): 묶음 · 「💿 N」 · 오른쪽 칸 · Stone으로 열림(우리 환자 이름 · 번호) · 사유 넣고 빼기 → 줄이 사라짐.
- **영상 인쇄 창 점검**(총괄 부탁 — 진료 세션 `fe0e23d` 뒤): 격리에서 2장짜리 검사를 인쇄 → `document_log` 47 → 47(그대로), `pacs.images.print` 20 → 21(한 줄), 인쇄 창은 한 번 열림. 화면의 안내도 「journal des modifications (pas de numéro de document…)」.
- **확인 못 한 것**: 프로그램(C#)에서 부르는 것 자체 · 접수 권한만 있는 계정(시험 계정 없음) · 진짜 다른 병원 디스크 · 1GB에 가까운 파일 하나 · 수납 화면에서의 모습(같은 부품이나 눈으로 안 봄) · 한국어/영어 화면의 글 배치. `move_blocks.py`의 두 가지가 `STILL_ARRIVING`으로 떨어짐 — 옮긴 직후 다시 옮기는 시험이 Orthanc의 「아직 안정되지 않음」에 걸린 것으로, `pacs.move.js`는 develop과 같음(이번 변경과 무관, 시험 스크립트의 기다림 문제).
- **격리 스택**: 총괄 말씀대로 **내리지 않고 둠**(설정 세션이 프로그램을 맞춰 볼 때 씀). 외부 검사는 모두 빼 둔 상태(`pacs_import`에 `done` 없음), 파일 한도 1024MB.
- **다른 세션에 부탁**: ① 총괄 — 마이그레이션 번호(051) · nginx 블록 확인. ② 설정 세션 — 「오더 연동」 탭에 「들여오기: 파일 하나의 한도(MB)」 칸(`GET/PUT /api/pacs/config`의 `import_max_file_mb`, 1~4096)을 넣을지. ③ 프로그램을 짓는 세션 — `external-images-import-api.md`대로; 모양을 바꿔야 하면 PACS 세션에.

## 2026-10-01 — 설계안 보탬: 영상 CD 반출 프로그램(④) · 총괄 몫의 결정 반영 (문서만)

- **상태**: 확인 요청 — **결정 대기**(실장님 몫: 가 · 나 · 라 · 마 · 바 · 사 · 아 · 자 · 차). 짓지 않음.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop을 `git merge`로 합친 뒤 — ff가 안 됨). 문서만. **PACS 저장소** — 없음
- **한 일**: `wiki/reference/image-print-export-design.md`에 실장님이 정하신 **따로 실행하는 「영상 CD 반출 프로그램」**(4-2절)을 넣음 — 화면 그림, 흐름(로그인 → 차트번호 조회 → 검사 체크 → 크기 → 빈 디스크 인식 → 「이 CD에 구울까요?」 → 굽기 → 확인 → 꺼냄), 디스크·드라이브의 경우 여덟, EMR을 거치는 자료 길, 권한, 기록(매체 칸), 이 PC에 남는 것, 뷰어를 넣는 길(프로그램 옆 `cd-viewer` 폴더), 드라이브 없이 확인할 수 있는 것과 없는 것. 「EMR 안의 반출 요청 대기함」은 만들지 않음. 총괄 몫 ㄱ~ㄹ은 「정해짐」으로, 「다(ZIP이냐 .iso냐)」는 「반출 프로그램이 답함」으로. 읽을거리 파일 이름을 `README.TXT`로(붙임표가 든 이름은 CD의 옛 이름 형식에서 바뀜 — 이 PC의 시험에서 봄).
- **이 PC에서 확인한 것**(시스템을 바꾸지 않는 범위 — 읽기와 scratchpad에 파일 만들기뿐): Windows의 굽기 부품(IMAPI2) 있음 · **굽는 드라이브 0대** · 드라이브 없이 ISO 파일 만들기 됨(시험 폴더 → 79,872바이트, `CD001` 표시, 맨 위에 `DICOMDIR` · `INDEX.HTM` · `IMAGES` · `IHE_PDI`) · WinForms 있음 · Windows PowerShell 5.1.
- **바꾼 파일**: `wiki/reference/image-print-export-design.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인 못 한 것**: 굽기 · 디스크 알아보기 · 진행 표시 · 확인 · 꺼냄 — 이 PC에 드라이브가 없어 **지을 때도 확인할 수 없음**(지어 두고 실장님이 드라이브 있는 PC에서 한 번).
- **다른 세션에 부탁**: 없음

## 2026-10-02 — 실행 파일로 진짜 CD 한 장 · 아이콘 파일을 받는 길 · 바탕화면 바로가기

- **상태**: 확인 요청.
- **커밋**: **PACS 저장소** `session/pacs` `2d2d5b1`. **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(문서만).
- **실행 파일로 굽기**(실장님이 빈 CD를 넣고 PACS 세션 창에서 직접 말씀, 굽기 전에 총괄에 알림): `Bethesda-CD.exe`의 창 코드로 격리 스택의 가짜 환자 검사 2건(영상 26개 63Mo — 지난번과 같은 내용). 「CD-R vierge, 703 Mo libres ✔」 → **171.6초**(준비 2.2 · 굽기 54 · 검증 약 115) → 「Terminé : le disque est gravé et vérifié.」 — 프로그램이 다시 읽어 파일마다 비교한 결과. 작업 폴더 비움, 변경 기록 한 줄. **굽고 나서 트레이가 열려 있어**, 다시 넣은 뒤의 확인(「빈 디스크가 아님」 · 디스크의 VOIR.EXE가 빌드한 것과 같은지 · CD에서 새 뷰어의 시간)은 실장님이 트레이를 넣으신 뒤에 합니다 — 서버 쪽 파일의 해시는 받아 두었고 격리 스택은 내렸습니다.
- **아이콘**: `build.ps1 -IconFile x.ico` 또는 `bethesda-cd\icon\Bethesda-CD.ico`에 파일을 두면 그것으로 빌드(없으면 그 자리에서 그림 — 지금의 A는 임시).
- **바로가기**: 서버 PC — `setup.ps1` 끝 → `desktop-shortcuts.ps1` → 바탕화면에 `Bethesda PACS.url`(영상 서버의 화면) · `Bethesda CD.lnk`. 다른 PC — `bethesda-cd\install.bat`(프로그램 한 파일을 `%LOCALAPPDATA%\Programs\Bethesda CD`에 복사, EMR 주소를 물어 ini에, 바탕화면에 `Bethesda CD.lnk`). 있으면 고쳐 씀. 레지스트리 · 예약 작업 없음. **방식과 이름 규칙**은 설계안 11-3절(EMR 쪽이 같게 하도록): 웹 주소는 `.url`, 프로그램은 `.lnk`, 이름 「Bethesda EMR / PACS / CD」.
- **생각할 점**: 「Bethesda PACS」 바로가기가 여는 것은 Orthanc의 관리 화면(admin 비밀번호 · 고치기/지우기 가능 — P-31) → 서버 PC의 관리자용으로만 만듦. 이름에 「(administration)」을 붙일지는 정해 주세요.
- **확인한 방법**: `shortcut_test.ps1` 9가지 통과 — scratch의 가짜 바탕화면 · 가짜 프로그램 폴더로(이 PC의 진짜 바탕화면에 더해지거나 없어진 것 없음을 확인). `setup.ps1` 전체는 돌리지 않음(개발 PC 규칙).
- **바꾼 파일**: PACS — `bethesda-cd\build.ps1` · `bethesda-cd\install.ps1`(새) · `install.bat`(새) · `bethesda-cd\README.md` · `desktop-shortcuts.ps1`(새) · `setup.ps1`(끝에 한 덩어리) · `README.md`. EMR — 위키 `reference/image-print-export-design.md`(11-2 고침 · 11-3 새) · `modules/pacs.md` · 이 노트. 공용 파일 · DB · 번역 키: 없음.
- **들여오기를 EMR 화면 안에서 하는 안**: 의견을 총괄에 메시지로 보냄(문서는 결정 뒤에 고침).

## 2026-10-02 — 「Bethesda CD」 1.0.0: 반출 프로그램을 진짜 실행 파일로 · 한 폴더로 서게 · 아이콘 후보

- **상태**: 확인 요청. 실장님이 고르실 것 — **아이콘 후보 셋**: `wiki/reference/design/bethesda-cd-icon-candidates.png`.
- **커밋**: **PACS 저장소** `session/pacs` `0213d99`. **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(문서 · 아이콘 후보 그림).
- **한 일**(PACS 저장소 `bethesda-cd\` — 그 폴더 하나로 섬):
  - `src\app\` — 반출 프로그램을 C#으로(옛 PowerShell과 한 줄씩 대응): `Program` · `MainForm`(+ `Ask`) · `Texts` · `Emr` · `DiscFolder` · `Burner`.
  - `src\viewer\` — 뷰어를 `viewer\`에서 옮김(git mv). `src\shared\Version.cs` — 이름 「Bethesda CD」와 판 **1.0.0**을 정하는 한 곳(창 · 파일 속성 · 뷰어의 「?」).
  - `build.ps1` — Windows의 `csc`(C# 5)만. `VOIR.EXE`를 먼저 만들어 `Bethesda-CD.exe` 안에 자원으로 품음 → 모든 디스크에 같은 파일. 0.7초, 182KB.
  - `icon\make-icon.ps1` — 아이콘을 직접 그림(후보 A · B · C, 16 · 32 · 48 · 256).
  - `tests\viewer_test.ps1`(21 — 바깥 파일 없이 스스로 그림을 그려 확인; 무손실 JPEG 예측 방식 1~7 포함) · `tests\app_test.ps1`(23 — 시험용 EMR 필요, 비밀번호는 환경 변수).
  - `README.md`(필요한 EMR 판 1.5.0과 HTTP 길 셋) · `CHANGELOG.md` · `LICENSE`(PACS와 같은 글, 첫 줄 「Bethesda CD — License」) · `Bethesda-CD.example.ini` · `.gitignore` · `.gitattributes`.
  - 옛 `cd-export*.ps1` · `.bat`: 그대로 둠(한 번의 배포 동안). 뷰어 소스의 새 자리(`bethesda-cd\src`)에서 빌드하게만 고침. PACS `README.md`의 그 절을 줄이고 `bethesda-cd\README.md`를 가리킴.
- **공개 저장소가 될 폴더에 없는 것 — 확인함**: 비밀값 · 이 PC의 주소나 경로 · 실제 환자/실장님 자료 · 견본 DICOM(시험이 그림을 스스로 그림) — 스테이징에서 검사. 시험 스크립트의 예시 주소는 `127.0.0.1` · 예시 차트번호뿐.
- **확인한 방법**(격리 EMR 9188 · PACS 9198): `app_test.ps1` 23가지 통과(디스크의 VOIR.EXE가 빌드한 것과 바이트까지 같음 포함) · 풀어서 내보내기 5가지 · `viewer_test.ps1` 21가지 · 옛 길의 창 시험 22가지 · 진짜 실행 파일을 로컬 / USB / 네트워크 경로에서 실행(0.3초에 창, 39MB, Windows의 물음 없음, Defender 검사 0건).
- **SmartScreen/Defender**(총괄의 물음): 로컬 · USB · `\\localhost\C$\…`에서 물음 없이 뜸. 서명 없음, 「인터넷에서 받은 파일」 표시 없음(빌드한 파일 · USB로 옮긴 파일에는 붙지 않음). Defender 사용자 검사 0건. GitHub에서 zip으로 받은 사본은 그 표시가 붙어 SmartScreen이 한 번 물을 것 — 일부러 띄워 보지는 않음.
- **확인 못 한 것**: **실행 파일로 진짜 굽기**(굽는 코드는 그대로, 드라이브 알아보기는 옮겨 적음 — 드라이브와 「빈 디스크가 아님」은 읽힘. 빈 CD-R과 실장님의 직접 승인이 있으면 한 장 구워 확인) · 다른 PC.
- **배포할 때**(총괄): 실행 중 PACS 폴더에 `bethesda-cd\` 폴더를 통째로 → `bethesda-cd\build.ps1` → `bethesda-cd\build\Bethesda-CD.exe`(바로가기는 이것으로). 옛 `cd-export.bat`을 계속 쓰려면 `cd-export-common.ps1` · `cd-export.ps1`도 다시 복사(뷰어 소스의 자리가 바뀜 — 옛 `viewer\` 폴더는 지워도 됨). 설정은 `build\Bethesda-CD.ini`에 새로 적힘(옛 `cd-export.ini`를 그 옆에 두면 주소를 읽어 옴).
- **바꾼 파일**: PACS — `bethesda-cd\`(새 폴더; `viewer\*.cs` 아홉 파일이 `src\viewer\`로) · `cd-export-common.ps1` · `cd-export.ps1` · `README.md` · `.gitignore`. EMR — 위키 `reference/image-print-export-design.md`(11-2절) · `modules/pacs.md` · `manual-fr/pacs.md`(§12의 프로그램 이름) · `reference/design/bethesda-cd-icon-candidates.png` · 이 노트. 공용 파일 · DB · 번역 키: 없음.
- **다음**: 실장님의 결정(들여오기 가~아, 아이콘)을 기다림 → 들여오기 코드(EMR + 「Bethesda CD」 안에 C#으로).

## 2026-10-02 — 설계안: 다른 병원의 영상(CD · USB) 들여오기 (문서만)

- **상태**: 확인 요청 — 설계 문서. 코드 없음. 결정(문서 17절)이 나면 짓습니다(프로그램 쪽은 `.exe`로 옮긴 뒤 C#으로).
- **커밋**: EMR 저장소 `session/pacs` — 이 항목이 든 커밋.
- **문서**: [`reference/external-images-import-design.md`](../reference/external-images-import-design.md) — 0절이 실장님이 읽으실 한 장, 17절이 정할 것(실장님 여덟 · 총괄 아홉)과 추천.
- **설계의 뼈대**:
  - 「Bethesda CD」에 「들여오기」 갈래. 프로그램은 EMR만 부름. 디스크에서는 DICOM 파일만 읽음(다른 회사 프로그램은 실행 · 복사 안 함).
  - 영상 안에서 **환자 번호 · 이름 · 생일 · 성별, 검사 번호, accession만** 우리 것으로 — 그림 · 압축 · 시리즈/영상 번호 · 원래 병원 · 날짜는 그대로, 원래 환자 번호 · 이름은 `OtherPatientIDs` · `OtherPatientNames`에.
  - **영상 서버에 넣는 길 — 추천 「한 장씩」**: 올림 → Orthanc의 `POST /instances/{id}/modify`가 고친 파일을 돌려줌(저장하지 않음) → 고친 것을 올림 → 원본 삭제. 원래 번호로 있는 것은 한 번에 한 장, 수십 분의 일 초. (프로그램이 파일을 고쳐 쓰는 길은 영상을 다칠 수 있는 코드를 새로 쓰는 일이라 피함 / 통째로 올린 뒤 고치는 길은 원래 번호의 검사가 몇 분 머묾 / 따로 둔 서버는 가장 깨끗하나 돌볼 것이 늘어남 — 같은 코드로 나중에 옮길 수 있게.)
  - **오더**: 오더 코드 `IMG-EXT` «Imagerie externe»(0 Ar, 워크리스트 사용 안 함 → 장비 목록에 안 나감). 추천 — 의사가 한 번 내고, 검사가 여러 건이면 EMR이 같은 진료 안에 더 만듦(진료 세션의 함수 하나 필요). 끝나는 순간 `worklist_log` 줄을 처음부터 `completed`로 → 그 뒤로는 우리 영상과 같은 코드(목록 · Stone · 비교 · 인쇄 · 판독 · 반출).
  - 환자 확인 창(디스크의 이름 · 생일 ↔ 차트) · 중복(영상 번호로 미리 물음) · 끊김(표 `pacs_import` + 뒷정리, 끝나기 전에는 화면에 아무것도 안 보임) · 크기 한도와 서버의 남은 자리(브리지가 보고) · 「외부」 표시 · 변경 기록 `pacs.images.import`.
- **해 본 것**(임시 Orthanc 9196 · 격리 EMR 9188, 공개 견본 — 끝나고 지움): 한 장씩 고치기 2~27ms, 그림의 바이트 · 전송 구문(.4.70 · .4.50 · .4.91) · 사설 태그 그대로 / 고친 파일은 원본이 있는 채로 올려도 따로 저장됨 / **원본을 다시 올리면 「이미 있음」이 아니라 새로 저장됨**(Orthanc는 환자 번호 + 검사 + 시리즈 + 영상 번호로 가림) → 중복은 EMR이 막아야 함 / `DICOMDIR` · 글자 파일은 거절 / **EMR의 nginx는 1MB 넘는 몸통을 413으로 거절** → 들여오기 길에 설정 필요(공용 파일).
- **코드에서 읽은 것**: 오더는 진료 기록이 있어야 만들어짐(`consultation_id` · `visit_id` 필수) → 「접수에서 미리 올려 두기」는 어느 길로도 안 됨.
- **바꾼 파일**: 위키 `reference/external-images-import-design.md`(새) · `modules/pacs.md`(이력 한 줄) · 이 노트. 코드 · 공용 파일 · DB · 번역 키: 없음.
- **다른 세션에 부탁**(결정 뒤): 총괄 — nginx 설정 · 마이그레이션 번호 · 진료 세션과의 조율(오더 하나 더 만드는 함수, 영상 창 위의 한 줄).
- **다음**: 반출 프로그램을 `.exe`로(「Bethesda CD」, `bethesda-cd\` 한 폴더, 1.0.0, 아이콘 후보).

## 2026-10-02 — 뷰어의 밝기 · 대비: 컬러(초음파)에도, 끊기지 않게, 눈에 보이는 막대

- **상태**: 확인 요청. 실장님이 견본으로 다시 해 보실 수 있음(`D:\CD-TEST`의 세 폴더 모두 새 `VOIR.EXE`).
- **커밋**: **PACS 저장소** `session/pacs` `7103d60`. **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(문서만).
- **실장님 말씀**: 「밝기 조절은 안돼??」 → 「(왼쪽 끌기) 그냥 이대로 하자 근데 좀 렉먹는다? … 드드드득」. 버튼은 바꾸지 않음(왼쪽 끌기 = 밝기 · 대비, 오른쪽 끌기 = 이동).
- **찾은 것**: ① 컬러 영상(병원의 초음파)에는 밝기 조절이 **아예 안 먹었음**. ② 끊김: 끌 때 「나중에 그려 달라」고만 해서 Windows가 다음 마우스 이동을 먼저 건네는 바람에 **움직이는 동안은 안 바뀌고 멈출 때 바뀜**. ③ 한 번 그리기가 큼(창을 최대로 하면 38ms — 큰 그림을 매번 부드럽게 줄여 그림).
- **고친 것**(`viewer\Picture.cs` · `ImagePanel.cs` · `MainForm.cs` · `Texts.cs`): 컬러에도 밝기 · 대비(세 색에 같은 변환, 귀퉁이에 「Luminosité +33  Contraste +13」) / 끄는 동안은 화면 크기의 그림을 바로 만들어 그대로 붙이고, 놓으면 전체 화질로 / 끌 때마다 바로 그림(Update) / 밝기표를 다시 씀 / 아래 줄에 작은 막대 ☀ ◐(끄는 것과 같은 값, 「Réinitialiser」가 처음으로) / 「?」의 글.
- **숫자**(끄는 동안 한 걸음, 고치기 전 → 뒤): 초음파 1552×873 컬러, 창 최대 38ms(밝기 안 바뀜) → **5.6ms** / 필름 2500×3000, 창 최대 38ms → **3.2ms** / 보통 창에서는 14 · 25ms → 3.0 · 1.7ms. 끄는 동안 메모리 전체 청소 0번.
- **Stone**: 배포된 Stone의 코드에서 확인 — 왼쪽 = 밝기 창, 가운데 = 이동, 오른쪽 = 확대(총괄의 기억대로). **방향은 확인 못 함**(이 세션의 브라우저에서 Stone의 그림이 안 그려짐 · 소스 사이트는 열 수 없었음). 우리 것: 위 = 밝게, 왼쪽 = 대비 세게(전과 같음).
- **확인한 방법**: `viewer_test.ps1` 32가지 통과(새 7항목 — 마우스 버튼을 흉내 내 창의 코드를 그대로 부름) · `voir_perf.ps1`(위 숫자) · 화면 그림으로 막대 자리 확인.
- **확인 못 한 것**: 진짜 손으로 끄는 느낌(실장님께) · 다른 PC의 그래픽 성능 · Stone의 방향.
- **바꾼 파일**: PACS — `viewer\Picture.cs` · `ImagePanel.cs` · `MainForm.cs` · `Texts.cs`. EMR — 위키 `reference/cd-mini-viewer-design.md`(17절) · `modules/pacs.md` · `manual-fr/pacs.md` · 이 노트. 공용 파일 · DB · 번역 키: 없음.
- **`D:\CD-TEST`**: 세 폴더(`26-00001_20261001_1825_2` · `26-00001_20261002_0952` · `JPEG-TEST`) 모두에 새 `VOIR.EXE`. 첫 폴더는 뷰어 없는 옛 견본이었는데 이번에 넣음.
- **다음**: 「외부 영상 들여오기」 설계 문서(임시 서버에서 해 본 것까지 모아 둠) → `.exe`(이름 **Bethesda CD**, 따로 떼어낼 수 있게 한 폴더 아래, 1.0.0) → 들여오기 코드.

## 2026-10-02 — 뷰어를 넣은 진짜 CD 한 장(④) — 구워서 다시 읽고, CD에서 뷰어의 시간을 잼

- **상태**: 확인 요청. 작은 뷰어의 단계 ①~④가 끝났습니다.
- **승인**: 실장님이 PACS 세션 창에서 직접(「CD 넣었어, 구워」). 굽기 전에 총괄에 알림.
- **커밋**: **PACS 저장소** `session/pacs` `1eafabc`. **EMR 저장소** `session/pacs` — 이 항목이 든 커밋(문서만).
- **구운 것**: 격리 스택의 가짜 환자 26-00001 — 필름 검사 3 + 초음파 검사 23(원래 20 + 끼운 무손실 JPEG 컬러 · 무손실 JPEG 12프레임 · Baseline JPEG 컬러) = **영상 26개 62.9MB** + DICOMDIR + README.TXT + VOIR.EXE. 풀지 않고 그대로. 총괄이 말한 `JPEG-TEST`의 영상은 다른 가짜 환자(TS TEST)의 것이라 한 디스크에 못 넣어, 같은 종류를 26-00001의 검사 안에 만들어 넣음.
- **결과**:
  - 굽기 **171.9초**(준비 2.7 · 굽기 54(×10, 가장 느리게) · 검증 약 115). 「Terminé : le disque est gravé et vérifié.」 작업 폴더에 남은 것 없음. 변경 기록 한 줄.
  - 다시 넣어서: 프로그램이 「ce disque n'est pas vierge」 — 굽기 단추 꺼짐. 디스크의 영상 26개 = 영상 서버의 파일, **바이트까지 같음**(SHA-256, 양쪽).
  - **CD에서 `VOIR.EXE` 더블클릭 → 1.5초에 창**(목록 + 악센트 바로잡는 읽기 포함). 영상 한 장: 14MB 필름 8.3초 · 3.6MB 필름 2.3초 · 압축 없는 컬러 1.4MB 0.76~0.99초 · 무손실 JPEG 0.7MB 0.52초 · Baseline 0.1MB 0.17초 · 12프레임 첫 장 0.2~0.56초. CD 읽기 약 1.7MB/초. 26장을 모두 여는 데 27.9초.
  - 악센트 읽기의 느려짐(총괄이 물은 것): 따로 재지지 않을 만큼 — 창이 뜨는 1.5초 안에 시리즈 6개의 머리 읽기가 들어 있음.
- **고친 것**(PACS `viewer\MainForm.cs` · `Texts.cs`): 큰 영상을 CD에서 읽는 동안 창이 말이 없던 것 → 「Lecture de l'image…」(아래 줄, 처음에는 그림 자리에도). `viewer_test.ps1` 창 항목 통과, 고친 뷰어를 CD의 내용으로 켜서 확인. **구워진 디스크의 VOIR.EXE는 고치기 전 것**입니다(동작은 같고 그 문구만 없음).
- **알게 된 것**: CD에서는 작은 파일이 빨리 뜸 → 병원의 무손실 JPEG를 풀지 않고 넣는 것이 속도에도 이로움. `VOIR.EXE`는 만들 때마다 바이트가 조금 다름(컴파일러가 때를 적음) → 「모든 디스크에 같은 파일」은 .exe로 옮길 때 한 번 만들어 품는 길로(설계안 11-1절).
- **바꾼 파일**: PACS — `viewer\MainForm.cs` · `viewer\Texts.cs`. EMR — 위키 `reference/cd-mini-viewer-design.md`(머리 · 11 · 새 16절) · `modules/pacs.md` · `manual-fr/pacs.md` · 이 노트. 공용 파일 · DB · 번역 키: 없음.
- **확인 못 한 것**: 이 디스크를 **다른 PC**(Windows 10 · 다른 백신 · CD의 프로그램 실행을 막아 둔 곳)에서 열어 보는 것 → 실장님께 부탁드림(디스크는 가짜 환자라 어디에 넣어 봐도 됨).
- **뒷정리**: 격리 PACS에 끼운 영상 셋을 뺌(초음파 검사 20개로 돌아감), 격리 스택 내림. 디스크는 드라이브에 있음(가짜 환자 — 「견본」이라고 적어 두시길). `D:\CD-TEST`는 그대로 세 폴더.
- **다음**: 총괄이 준 새 일 「외부 영상 들여오기」 설계 문서.

## 2026-10-02 — 반출 프로그램을 「.exe」로: 옮기기 전의 준비(문서만)

- **상태**: 확인 요청(문서만 — 코드 없음). 진짜 CD(④)는 실장님이 PACS 세션 창에서 직접 승인하실 때까지 **굽지 않고 기다리는 중**.
- **커밋**: EMR 저장소 `session/pacs` — 이 항목이 든 커밋.
- **한 일**: 설계안 `reference/image-print-export-design.md`에 **11-1절**을 더함 — 지금의 크기(PowerShell 약 1,000줄을 옮기면 C# 1,200~1,500줄쯤, 그중 굽는 부분과 뷰어는 이미 C#), **뷰어를 실행 파일이 어떻게 품나를 scratch에서 해 봄**(csc로 뷰어 직접 빌드 0.16초 · 만들어진 `VOIR.EXE`를 자원으로 품기 · 소스를 품고 그 자리에서 빌드 — 셋 다 됨, 꺼낸 파일이 바이트까지 같음), 시험을 옮기는 길, 옮긴 뒤의 폴더, 정할 것 여섯(ㄱ~ㅂ).
- **권하는 것**: 진짜 CD(④) 뒤에 옮김 / 뷰어는 만들어진 `VOIR.EXE`를 자원으로 품음(모든 디스크에 같은 파일) / 실행 파일은 저장소에 넣지 않고 묶음 · 배포 때 빌드.
- **바꾼 파일**: 위키 `reference/image-print-export-design.md` · 이 노트. 제품 코드 · 공용 파일 · DB · 번역 키: 없음.
- **확인 못 한 것**: 옮긴 뒤의 줄 수 · 크기는 추측.
- **진짜 CD를 위해 준비해 둔 것**(scratch, 굽지 않음): 견본 검사(가짜 환자 26-00001의 필름 · 초음파)에 무손실 JPEG 컬러 · 무손실 12프레임 · Baseline JPEG를 끼워 한 디스크로 굽는 차례와, 진짜 CD에서 뷰어의 시간(창 · 목록 · 첫 영상 · 영상 넘기기)을 재는 스크립트.

## 2026-10-02 — 작은 뷰어 단계 ③: RLE · 「뷰어가 못 여는 압축은 반출할 때 풀어서」

- **상태**: 확인 요청. 남은 것은 ④ 마무리(진짜 CD — 실장님이 PACS 세션 창에서 직접 승인하실 때).
- **커밋**: **EMR 저장소** `session/pacs` `9e21f5c`(코드) + 이 항목이 든 문서 커밋. **PACS 저장소** `session/pacs` `5beb7e7`.
- **한 일**
  - **뷰어**(PACS `viewer\Rle.cs` 새 파일 · `Picture.cs`): RLE를 직접 풂 — 8비트 흑백 · 컬러, 16비트 흑백, 여러 프레임. 아홉 파일 1,107줄, `VOIR.EXE` 49,664바이트.
  - **EMR**(`backend/src/routes/pacs.export.js`): `GET /export/bundle`이 묶음을 만들기 전에 고른 검사들의 전송 구문을 영상 서버에 묻고(검사마다 한 번), 뷰어가 못 여는 것이 하나라도 있으면 `Transcode: 1.2.840.10008.1.2.1`을 붙여 **묶음 전체를 압축 없음으로** 받음. 뷰어가 여는 것(`VIEWER_OPENS`): 압축 없음 2종 · `.4.50` · `.4.57` · `.4.70` · `.5`. 머리말 `X-Export-Unpacked: 1|0`, 기록 줄에 「, unpacked」와 `unpacked_from`. 영상 서버가 전송 구문을 말해 주지 않으면 풀지 않고 그대로.
  - **반출 프로그램**(PACS `cd-export-common.ps1` · `cd-export-ui.ps1`): 풀어서 받았으면 끝 안내에 한 줄(fr · ko · en).
- **병원의 초음파(.4.70)와 X-ray는 풀리지 않습니다** — 그것만 고르면 원본 그대로. 「그 밖」의 검사와 함께 고를 때만 같이 풀립니다(한 묶음에는 한 가지 형식만 줄 수 있음 — Orthanc).
- **크기가 얼마나 느나**: 병원의 초음파는 풀면 약 **3배**(한 장 1.3~1.5MB → 4.06MB; 55장 74.9MB → 약 223MB). 격리 시험의 초음파 검사(23개 가운데 JPEG 3개)는 29.3MB → 32.4MB. X-ray는 대개 압축 없이 와서 그대로.
- **확인한 방법**(격리 스택 EMR 9188 · PACS 9198 + 임시 Orthanc 9196, 가짜 환자):
  - `export_unpack.py` **10가지 통과**: 그대로일 때 0 / 무손실 JPEG · Baseline JPEG를 끼워도 풀지 않음 / JPEG 2000 한 장이면 그 검사는 모두 압축 없음 · 머리말 1 · 기록에 원인 / 다른 검사만 고르면 영향 없음 / 함께 고르면 모두 풀림 / JPEG-LS · JPEG Extended · Big Endian도 / 끼운 영상을 지우면 처음과 같음.
  - `export_api.py` 31가지 · 창 시험 `cdx_ui_test.ps1` 22가지: 그대로 통과.
  - `cdx_unpack_test.ps1` 5가지: JPEG 2000이 든 검사를 창의 코드로 「폴더에 저장」 → 끝 안내(세 언어) → 사본의 영상을 뷰어의 코드가 모두 엶.
  - RLE: `rle_test.ps1`(견본 셋, 영상 서버의 그림과 1/255 이내, 망가뜨린 300개에 죽지 않음) · `viewer_test.ps1` 25가지.
- **알게 된 것**: 영상 서버(Orthanc 1.12.11 + GDCM)는 2프레임 RLE 견본의 둘째 프레임을 풀지 못함(404 · 풀어도 한 프레임) — 뷰어는 읽음. RLE는 손상을 알아볼 여분이 없어 망가진 파일의 일부는 틀린 그림이 말없이 나옴.
- **바꾼 파일**: EMR — `backend/src/routes/pacs.export.js` · 위키 `reference/cd-mini-viewer-design.md`(머리 · 4-5 · 11 · 새 15절) · `modules/pacs.md`(2.4.4 · 길 표 · 파일 목록 · 이력) · `manual-fr/pacs.md`(§12 한 줄) · `reference/changelog-1.5.0/pacs.md` · 이 노트. PACS — `viewer\Rle.cs`(새) · `viewer\Picture.cs` · `cd-export-common.ps1` · `cd-export-ui.ps1` · `README.md`.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음. 새 길 없음(`/export/bundle`의 동작만) — 권한 표는 그대로.
- **배포할 때**: EMR 백엔드(`pacs.export.js`) + 실행 중 PACS 폴더에 `cd-export-common.ps1` · `cd-export-ui.ps1` · `viewer\` 아홉 파일(`Rle.cs`가 새로 생김). EMR만 새것이고 프로그램이 옛것이어도 됨(안내 한 줄만 없음), 반대도 됨(풀리지 않을 뿐).
- **확인 못 한 것**: 진짜 장비가 보낸 RLE · JPEG 2000 / 영상 서버가 못 푸는 형식(MPEG 동영상 등)은 풀리지 않은 채 나감(견본 없음) / 아주 큰 검사를 풀 때의 시간 / 실행 중 EMR에서의 동작(총괄 몫).
- **뒷정리**: 격리 스택 둘 · 임시 Orthanc 내림. 격리 PACS에 끼웠던 시험 영상은 지워 처음과 같음(23개). `D:\CD-TEST`는 앞 항목과 같은 세 폴더(시험 폴더는 만들고 지움), `26-00001_20261002_0952` · `JPEG-TEST`의 `VOIR.EXE`는 ③의 것으로 다시 만듦.
- **다른 세션에 부탁**: 없음.

## 2026-10-02 — 작은 뷰어 단계 ②: JPEG — 실장님의 진짜 초음파(GE LOGIQ P10)가 그대로 보임

- **상태**: 확인 요청.
- **커밋**: **PACS 저장소** `session/pacs` `7316a59`. **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(문서만).
- **실장님의 진짜 초음파에서 읽은 사실**(기술 정보만 — 설계안 4-1절): GE LOGIQ P10 · Ultrasound Image Storage · **JPEG Lossless SV1(`.4.70`)** · RGB 8비트 · 1552×873 · 한 프레임 · 파일 1.3~1.5MB(원래의 32~37%) · 밝기 창 없음 · JPEG 조각 머리에 JFIF 표시.
- **가장 중요한 발견**: Windows의 GDI+는 이 55개를 **하나도 열지 못했습니다**(「Unsupported color conversion request」). WIC는 열었지만(차이 0), 어느 Windows가 무손실 JPEG를 여는지는 문서에 없고 시험할 PC가 한 대뿐 → **무손실 JPEG는 뷰어가 직접 풀게** 했습니다(`viewer\Jpeg.cs`, 표준 T.81 부록 H 그대로). 받는 PC의 Windows와 상관없이 같은 결과.
- **한 일**(PACS 저장소 `viewer\`): `Jpeg.cs`(새 — 무손실 JPEG 직접 풀기 / 손실 8비트는 GDI+로, 색의 뜻을 알려 줌) · `Picture.cs`(JPEG 조각 · 프레임 가르기 · YBR_FULL · 압축 없는 YBR_FULL_422 · PALETTE COLOR · 잘린 파일은 「읽을 수 없음」) · `Disc.cs`(시리즈마다 첫 파일에서 글을 바로잡음 — 총괄의 주문) · `MainForm.cs`(여러 프레임 파일을 휠로 한 장씩) · `Texts.cs` · `Dicom.cs`(색 표가 들어갈 만큼 값을 들고 있음). 여덟 파일 1,060줄, `VOIR.EXE` 49,152바이트. 반출 프로그램(`cd-export*.ps1`)은 바뀌지 않음 — `viewer\*.cs`를 그대로 빌드. `README.md`.
- **동영상**: 재생은 만들지 않음(실장님 2026-10-02). 여러 프레임 파일은 휠로 한 장씩 넘김, 끝 프레임 다음은 다음 영상. ◀ ▶ 단추와 ← → 키는 파일 단위.
- **확인한 방법**(임시 Orthanc 127.0.0.1:9196 — 끝나고 볼륨째 지움):
  - 실장님 영상 55개: 뷰어의 코드로 그린 것 = 영상 서버가 그린 것, **모든 픽셀 차이 0**. 한 장 16~44ms(평균 21~22). 그 CD의 DICOMDIR(다른 회사 PACS가 만든 것)도 읽힘.
  - 우리 묶음에 넣었을 때: `create-media-extended`로 55개가 **바이트까지 그대로**(SHA-256), 전송 구문 그대로, 1.6초. → 풀지 않고 디스크에 들어감.
  - `viewer_test.ps1` **25가지 통과**: 가짜 영상의 JPEG 판 20개(보이는 것은 서버와 1/255 이내, JPEG-LS · JPEG 2000 · 12비트 손실은 안내), pydicom 견본의 손실 JPEG 12개(차이 0), 깨진 파일 75개, 12프레임 무손실 파일을 창에서 넘기기, JPEG 2000 안내.
  - `voir_fuzz.ps1`: 망가뜨린 JPEG 600개에 죽거나 멈추지 않음. 무손실 한 장짜리는 150 가운데 149를 「읽을 수 없음」으로 알아봄.
  - 진짜 `VOIR.EXE`: 0.2~0.25초에 창, 흔적 없음, Defender 0건.
- **악센트(총괄의 주문)**: 목록을 만들 때 시리즈마다 첫 파일의 머리를 읽어 시리즈 설명 · 검사 설명 · 환자 이름을 바로잡음. 느려짐 — USB의 견본(시리즈 6개)에서 2~11ms(전 4~10ms)로 잴 수 없을 만큼. 진짜 CD에서는 시리즈당 0.1~0.3초쯤으로 추측(굽는 단계에서 잼).
- **지으면서 고친 것**: 손실 JPEG의 색(DICOM이 「RGB 그대로」라고 적은 것을 Windows가 「밝기 · 색차」로 풀어 색이 완전히 틀리던 것 — 견본 둘, 차이 137 · 255 → 0) · 잘린 압축 없는 영상이 아래가 검게 나오던 것.
- **바꾼 파일**: PACS — `viewer\Jpeg.cs`(새) · `Picture.cs` · `Disc.cs` · `MainForm.cs` · `Texts.cs` · `Dicom.cs` · `README.md`. EMR — 위키 `reference/cd-mini-viewer-design.md`(머리 · 1 · 2 · 4-1 · 4-2 · 4-5 · 11 · 12 · 새 14절) · `modules/pacs.md` · `manual-fr/pacs.md` · 이 노트.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음(EMR의 코드는 안 바뀜).
- **확인 못 한 것**: 다른 PC(Windows 10 · 32비트 · 프랑스어) · 다른 백신 · 무손실 JPEG의 예측 방식 2~7(견본 없음 — .4.70은 1만 씀) · PALETTE COLOR(견본 없음) · 망가진 **손실** JPEG는 Windows가 말없이 일부만 그림(알아볼 길 없음) · 진짜 CD에서의 속도.
- **실장님의 파일**: scratch의 `us-real`은 읽기만 했고 복사하지 않았습니다. 임시 서버에 올린 것은 컨테이너와 볼륨째 지웠고, 시험 중 scratch에 푼 묶음도 지웠습니다. 저장소 · 위키 · 견본 그림 · 보고에 이름이나 영상은 없습니다. → **총괄: `us-real` 폴더를 지우셔도 됩니다.**
- **`D:\CD-TEST`**: `26-00001_20261001_1825_2`(뷰어 없는 옛 견본) · `26-00001_20261002_0952`(압축 없는 견본 — `VOIR.EXE`를 ②의 것으로 다시 만듦) · **`JPEG-TEST`**(새 — 가짜 환자 「TS TEST」의 JPEG 영상 5개: 무손실 컬러 · 손실 컬러 · 무손실 12프레임 · 손실 12프레임 · 무손실 12비트 필름 + `VOIR.EXE`. 더블클릭해 보실 수 있음).
- **다음**: ③ RLE(뷰어가 직접) + EMR 「그 밖의 압축이 섞이면 풀어서 내보내기」 — 시작 신호를 주세요. 진짜 CD(뷰어 포함) 굽기는 실장님이 PACS 세션 창에서 직접 승인하실 때.

## 2026-10-02 — 작은 뷰어 `VOIR.EXE` 단계 ①: 압축 없는 영상 보기 · 디스크마다 들어감

- **상태**: 확인 요청. ② · ③(JPEG · 동영상)은 **실장님의 진짜 초음파 DICOM을 본 뒤**.
- **커밋**: **PACS 저장소** `session/pacs` `daddf0e`. **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(문서와 견본 그림 둘).
- **한 일**(PACS 저장소):
  - 새 폴더 `viewer\` — C# 일곱 파일 723줄(`Dicom.cs` · `Disc.cs` · `Picture.cs` · `ImagePanel.cs` · `MainForm.cs` · `Texts.cs` · `Program.cs`). C# 5로만(Windows에 든 컴파일러).
  - 반출 프로그램: 디스크를 만들 때마다 그 소스를 **`VOIR.EXE`(41KB)로 만들어 맨 위에** 넣음(`Get-ViewerSource` · `Add-DiscViewer`). README.TXT에 「double-cliquez sur VOIR.EXE」 문단(두 언어). Weasis 때의 `cd-viewer` 폴더 · 체크 칸 얼개는 없앰. 못 만들면 디스크는 뷰어 없이 만들어지고 끝 안내가 말함.
- **뷰어가 하는 것**: `DICOMDIR`에서 환자 · 검사 · 시리즈 목록 / 압축 없는 흑백(8~16비트, 부호, MONOCHROME1/2, 영상의 밝기 창, Rescale) · RGB / 밝기 · 확대 · 이동 · 맞춤 · 뒤집기 · 처음으로 / 앞뒤 영상 · 시리즈 / 네 귀퉁이 글 / 맨 아래 「Visionneuse de consultation — non destinée au diagnostic」 / 프랑스어 · 영어.
- **아직 안 하는 것**(말로 알려 줌): 압축된 영상(JPEG 등) · 여러 프레임 재생(첫 프레임만) · PALETTE COLOR · 압축 없는 YBR.
- **확인한 방법**(격리 스택 + 임시 Orthanc 9196, 가짜 환자):
  - `viewer_test.ps1` 22가지: 디스크의 목록(10ms) · 22장을 영상 서버가 그린 것과 견줌(1/255 이내, 컬러는 똑같음) · 이상하고 깨진 파일 75개(pydicom 패키지에 딸린 견본)에 죽지 않고 이유를 말함 · 남이 만든 DICOMDIR · 창(제목, 첫 시리즈, 밝기 창 2048/4096, 앞뒤 영상, 밝기 바꾸기, 뒤집기, 확대, 처음으로, 다음 시리즈, 12프레임 파일, 장비 보고서, JPEG 영상, 빈 폴더, 영어).
  - 진짜 실행 파일: USB의 디스크 폴더와 **읽기 전용 가상 디스크(CDFS)** 에서 실행 — 0.2초에 창, 닫은 뒤 폴더 변화 없음 · 임시 폴더 · 사용자 폴더에 새로 생긴 것 없음 · 메모리 124MB(큰 필름).
  - **서명 없는 실행 파일**(총괄의 물음): 이 PC에서 경고 없이 뜸, Windows Defender 탐지 0건. USB(FAT32) · 디스크(CDFS)는 「인터넷에서 받은 파일」 표시를 담을 수 없음을 확인. 다른 백신 · 실행 차단 정책은 **확인 못 함**.
  - 반출 프로그램: 창 시험 22가지(디스크 폴더에 `VOIR.EXE` 40 960바이트, README에 두 번) · 프로그램의 일 다시 통과.
- **지으면서 고친 것**: 헤더 길이가 틀리게 적힌 파일을 헤더의 태그로 읽게 · 길이 없는 사설 시퀀스에서 읽기가 멈추던 것 · 굵은 글씨의 목록 줄이 잘려 보이던 것.
- **바꾼 파일**: PACS — `viewer\*.cs`(새) · `cd-export-common.ps1` · `cd-export-ui.ps1` · `cd-export.ps1` · `README.md`. EMR — 위키 `reference/cd-mini-viewer-design.md`(13절) · `modules/pacs.md` · `manual-fr/pacs.md` · 견본 그림 `reference/design/cd-viewer-sample-film-fr.png` · `cd-viewer-sample-us-fr.png`(가짜 환자) · 이 노트.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음(EMR의 코드는 안 바뀜).
- **확인 못 한 것**: 진짜 장비의 영상 · Windows 10 · 32비트 PC · 프랑스어 Windows에서의 실행(이 PC는 한국어라 실행 파일은 영어로 뜸 — 프랑스어 글은 시험에서 바꿔서 봄) · 진짜 CD에서의 속도 · 수백 장짜리 시리즈 · 다른 백신.
- **알려 둘 것**: 영상 서버가 만든 `DICOMDIR`은 시리즈 설명의 악센트를 잃습니다(「Vésicule」 → 「Vsicule」). 뷰어는 그 시리즈를 처음 열 때 영상 파일의 글로 바로잡습니다 — 열기 전에는 목록에 악센트 없이 보입니다.
- **`D:\CD-TEST`**: `26-00001_20261001_1825_2`(뷰어 없는 옛 견본)와 **`26-00001_20261002_0952`(`VOIR.EXE`가 든 새 견본 — 더블클릭해 보실 수 있음)**. 그 밖의 시험 폴더는 지웠습니다.
- **다른 세션에 부탁**: 총괄 — 실장님의 초음파 DICOM이 오면 자리를 알려 주세요.

## 2026-10-02 — Weasis를 뺌 · 작은 뷰어의 「읽고 그리는 시험」

- **상태**: 확인 요청. 다음 일은 **실장님의 진짜 초음파 DICOM이 올 때까지 기다림**(총괄이 알려 주기로).
- **커밋**: **PACS 저장소** `session/pacs` — 「cd-export: Weasis is not used…」 커밋. **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(문서만).
- **① Weasis를 뺌**(실장님: 「위아시스는 버려」)
  - 반출 프로그램: README의 뷰어 문단과 `VOIR.BAT`(weasis:// 한 줄)을 뺌. 「뷰어 넣기」의 자리(`cd-viewer` → `VIEWER\`)는 남기되 `$VIEWER_START`가 비어 있는 동안 **아무것도 제안하지 않음**(체크 칸이 안 나옴). PACS `README.md`의 뷰어 문단을 「지금은 뷰어 없음 — Weasis는 해 보고 버림, 작은 뷰어 설계 중」으로.
  - 위키: `modules/pacs.md` 2.4.4절의 뷰어 부분을 「쓰지 않기로 함」으로, `manual-fr/pacs.md` §12에서 뷰어 체크 칸 줄을 뺌, 두 설계안에 결정을 적음.
  - **지운 것**: scratch의 `weasis\`(파일 433개, 193MB — 내려받은 MSI와 풀린 폴더) · `D:\CD-TEST\26-00001_20261002_0853`(198MB, 뷰어를 넣은 견본) · scratch의 Weasis 창 그림 11장 · 가짜 뷰어 폴더. **그대로 둔 것**: `D:\CD-TEST\26-00001_20261001_1825_2`. 사용자 폴더의 `.weasis`와 임시 폴더의 Weasis 흔적은 어제 지웠고 지금도 없음을 다시 확인.
  - 뷰어를 넣은 두 번째 CD · `cd-viewer`를 설치 묶음에 넣기 · Weasis의 LICENSE를 넣는 일 — 없던 일로.
- **② 작은 뷰어 — 읽고 그리는 작은 시험**(설계안 `cd-mini-viewer-design.md` 4-4절. 제품 아님, scratch의 `miniprobe\`)
  - C# **179줄**, Windows에 든 컴파일러로 0.13초, 실행 파일로 만들면 **11KB**.
  - 견본 디스크 폴더의 `DICOMDIR`을 4~8ms에 읽어 환자 1 · 검사 2 · 시리즈 6 · 영상 23.
  - 그 영상들을 그려 **임시 Orthanc가 그린 그림과 픽셀을 견줌**: 12비트 필름(밝기 창 적용) · MONOCHROME1 필름 — 차이 1/255 이내 / 컬러 초음파(RGB) — 똑같음 / 12프레임 동영상 — 1/255 이내 / JPEG Baseline 컬러(YBR_FULL_422)를 Windows로 푼 것 — **똑같음** / JPEG 동영상 프레임 1.7ms · 무손실 JPEG도 열림.
  - 배운 것: 밝기 창이 없는 8비트 영상은 「있는 그대로」 그려야 함.
- **③ 실장님의 DICOM을 기다리는 동안 적어 둔 규칙**(설계안 4-1절): 저장소 · 위키 · 견본 그림에 넣지 않음 / scratch에서만 읽음 / 보고에는 기술 정보만(전송 구문 · SOP Class · 프레임 수 · 크기 · 비트 · 색 표현 · 압축 여부 · 파일 크기 · 제조사/모델) / 실행 중 Orthanc에 올리지 않음 / 격리 Orthanc에 올려 시험한 뒤 그 볼륨째 지움.
- **바꾼 파일**: PACS — `cd-export-common.ps1` · `cd-export.ps1` · `README.md`. EMR — 위키 `reference/cd-mini-viewer-design.md` · `reference/image-print-export-design.md` · `modules/pacs.md` · `manual-fr/pacs.md` · 이 노트.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음.
- **확인한 방법**: 반출 프로그램 — 창 21가지 · 프로그램의 일 다시 통과, `cd-viewer` 폴더를 옆에 둬도 체크 칸이 안 나옴, 저장한 폴더에 `DICOMDIR · IMAGES · README.TXT`뿐이고 README에 Weasis · VOIR 글이 없음. 작은 시험 — 위.
- **확인 못 한 것**: 진짜 장비의 영상 전부(실장님의 파일을 기다림) · PALETTE COLOR · RLE · 압축 없는 YBR · 16비트 부호 있는 영상 · Windows 10의 무손실 JPEG.
- **다른 세션에 부탁**: 총괄 — 실장님의 파일이 오면 자리(경로)를 알려 주세요.

## 2026-10-02 — 설계안: CD에 넣는 작은 「보기 전용」 뷰어 (짓지 않음) · 묶음의 결함 하나 고침

- **상태**: 확인 요청 — **결정 대기**(설계안 12절: 실장님 넷, 총괄 다섯).
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(develop을 ff로 받은 위). **PACS 저장소** — 없음.
- **한 일**: `wiki/reference/cd-mini-viewer-design.md` — 화면, 디스크의 모양(작은 뷰어 `VOIR.EXE`는 늘 / Weasis는 체크), 전송 구문 조사와 실험, 규칙, 라이브러리, 표시의 정확성, 시험 영상, 책임 표시, Weasis의 구성, 단계 ①~⑤, 정할 것.
- **실험으로 확인한 것**(임시 Orthanc 127.0.0.1:9196 — 실행 중과 같은 이미지, Orthanc 1.12.11 + gdcm):
  - 묶음을 만들 때 `"Transcode": "1.2.840.10008.1.2.1"`을 주면 JPEG Baseline · Extended · Lossless · JPEG-LS · JPEG 2000 · RLE · Big Endian이 **모두 「압축 없음」으로** 나옴. 한 묶음에 목표는 하나. 20건이 22MB → 126MB.
  - **Windows에 든 기능**(GDI+ · WIC)은 **8비트 JPEG를 모두** 엶 — Baseline · Extended · **무손실까지**(픽셀 값이 원본과 같음). 12 · 16비트 JPEG, JPEG-LS, JPEG 2000은 못 엶. 프레임 한 장 3.5~5.8ms.
  - PowerShell이 C# 소스에서 **실행 파일을 그 자리에서** 만들 수 있음(`Add-Type -OutputAssembly … -OutputType WindowsApplication`, 0.14초, 4KB짜리가 실행됨) → 뷰어의 실행 파일을 저장소에 넣을 필요가 없음.
  - Weasis 139MB = Java 실행 환경 113MB + 부품 26MB.
- **원문에서 확인한 것**: Mindray DP-10/20/30 초음파의 적합성 선언서(내놓는 전송 구문 일곱 가지 · 색 표현), DICOM PS3.3의 초음파 색 표현 규정, fo-dicom의 라이선스(MS-PL)와 딸린 패키지, pydicom-data의 라이선스(MIT)와 견본 목록, .NET Framework가 Windows에 들어 있는 판.
- **조사하다 찾아 고친 결함**(EMR `pacs.export.js`): 묶음의 `Resources`에 **같은 검사가 두 번** 들어가면 Orthanc 1.12.11이 **끝내 응답하지 않음**(15초 · 300초 기다려 봄). 두 오더가 같은 검사를 가리킬 때 그렇게 될 수 있었음 → 한 번만 넣고, 장수 · 크기도 한 번만 셈. 격리에서: 오더 둘(같은 검사) → 0.7초, 영상 3장, 기록 「2 exam(s), 3 image(s)」. EMR의 길 시험 31가지 다시 통과.
- **바꾼 파일**: `backend/src/routes/pacs.export.js`(위의 고침) · 위키 `reference/cd-mini-viewer-design.md`(새) · `reference/image-print-export-design.md`(가리키는 한 줄) · `modules/pacs.md` · 이 노트.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음.
- **확인 못 한 것**: Windows 10에서 무손실 JPEG가 열리는지 · 진짜 초음파 동영상(공개 견본을 아직 받지 않음) · 뷰어의 크기와 메모리(지은 뒤) · 현지 장비가 실제로 보내는 형식 · GE의 선언서는 검색 결과로만 읽음.
- **내려받은 것 없음.** 공개 견본(pydicom-data, 약 25MB)은 ①을 시작할 때 파일 이름 · 주소 · 크기를 알리고 실장님의 직접 허락을 받은 뒤에.
- **남아 있는 것**: scratch의 `weasis\`(MSI와 풀린 폴더), `ts\`(시험 영상을 여러 압축으로 바꾼 것 — 가짜 영상). `D:\CD-TEST`는 그대로 둘(뷰어 없는 것 · Weasis 넣은 것).
- **다른 세션에 부탁**: 총괄 — 12절의 결정.

## 2026-10-02 — 진짜 굽기 1장 성공 · Weasis를 설치 없이 풀어 켜 봄

- **상태**: 확인 요청. 실장님이 PACS 세션 창에 직접 「CD 구워, Weasis 받아」.
- **커밋**: **PACS 저장소** `session/pacs` — 「cd-export: burnt for real…」 커밋. **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(문서만).
- **① 진짜 굽기 — 성공**(G: Slimtype DVD A DS8A3S, CD-R 1장, 가짜 환자 RAKOTO Jean 26-00001의 검사 2건 60MB, 뷰어 없이)
  - 프로그램의 말: 「Terminé : le disque est gravé et vérifié」. 드라이브의 자체 전체 확인을 켠 채로 통과했고, 그 뒤 프로그램이 디스크를 다시 읽어 **25개 파일을 모두 원본과 비교해 같음**.
  - **시간**: 전체 165.9초 — 받기 1.3초 · 이미지 준비 0.8초 · 굽기 52초(0%에 11초 머문 뒤 1%→99%가 40초, x10) · 「Vérification du disque…」 112초 · 트레이 열림.
  - **진행 표시**: 1%씩 고르게 올라가고 100%에서 「Vérification du disque… mm:ss」로 바뀜(이 표시는 굽기 전에 넣은 것).
  - **드라이브가 사라진 흔적 없음**, 오류 없음, 임시 폴더 비워짐. 변경 기록 한 줄: 「2 exam(s), 23 image(s), 60.4 MB given out (disc): Chest PA (261001-55); SONO(5) (261001-56)」.
  - 디스크를 다시 넣은 뒤: 프로그램이 「ce disque n'est pas vierge : il ne sera pas utilisé」, 굽기 단추 꺼짐 / 볼륨 이름 `IMG_26_00001`, 맨 위 `DICOMDIR · IMAGES · README.TXT` / `IMAGES`의 23개가 영상 서버의 파일과 **바이트까지 같음** / `DICOMDIR`을 DICOM 라이브러리로 읽어 환자 1 · 검사 2 · 시리즈 6 · 영상 23, 가리키는 파일 모두 있음 / **다른 영상 서버(임시 Orthanc, 127.0.0.1:9196)에 올려 23개 모두 받아들여짐** — 환자 1 · 검사 2 · 시리즈 6. 그 임시 서버는 지웠습니다.
  - 굽기 전에 쓰지 않고 확인한 것: 빈 디스크 · 자체 확인을 켤 수 있음 · 속도 x24/x20/x16/x10 · 이미지가 들어감.
- **굽기 시험으로 고친 것**(PACS 커밋에 들어감):
  - 굽는 속도를 드라이브가 대는 것 중 **가장 느린 것**으로(x10) — 제가 정한 것. 바꾸길 원하시면 알려 주세요.
  - 100%에 닿은 뒤 「Vérification du disque… mm:ss」.
  - 트레이가 열려 있을 때 「이 디스크는 구울 수 없음」이라고 하던 것 → 「디스크를 넣으세요」. 닫힌 CD-R(드라이브가 CD-ROM이라고 부름)은 「빈 디스크가 아님」.
- **② Weasis**
  - 받은 것: `Weasis-4.7.3-x86-64.msi`, `https://github.com/nroduit/Weasis/releases/download/v4.7.3/Weasis-4.7.3-x86-64.msi`, 54 636 544바이트, SHA-256 `c15358f95b79d936dd908ebd9afeebbce90bd463a9ba97aeda5edcfb78712f1c` — 릴리스 값과 **일치**. 서명 유효(「Open Source Developer, Nicolas Roduit」). 자리: scratch의 `weasis\`.
  - **설치하지 않음**: `msiexec /a … /qn TARGETDIR=scratch\weasis\x` → `x\PFiles64\Weasis`(139MB, 430개). 프로그램 목록 · `C:\Program Files\Weasis` · 시작 메뉴 · `weasis://` 연결 모두 **없음**을 확인. (Windows 이벤트 기록에는 MSI가 「설치했습니다」 한 줄을 남김 — 풀기 작업의 기록.)
  - 그 폴더를 뷰어로 넣어 `D:\CD-TEST\26-00001_20261002_0853`(198MB)와 ISO(201MB)를 만듦. 뷰어 넣기 시험 11가지 통과(진짜 폴더로).
  - **켜짐**: USB 폴더에서 `VOIR.BAT` → 처음 창까지 약 4초, 영상까지 약 7초(Weasis의 기록으로 잼), 두 번째는 1.5초. 환자 · 검사 2건 · 시리즈가 스스로 열림(창을 찍어 확인). 읽기 전용 **가상 디스크(ISO를 물림, UDF)** 에서도 켜지고 영상이 뜸(창 4.2초). 물린 ISO는 뗐습니다.
  - 처음 켤 때 **동의 창**: 「The open-source distribution of Weasis is not a certified medical device (CE or FDA)… — I accept / No」.
  - **받는 PC에 남는 것**: `%USERPROFILE%\.weasis` 약 95MB(켠 자리마다 하나 — 부품 사본 · 설정 · 시작 기록. 환자 이름 없음, 켠 자리의 경로는 적힘) / 켜져 있는 동안 `%TEMP%\weasis-<사용자>.<번호>`에 영상 사본 61MB → **창을 닫으면 0개**. 메모리 0.7~1.5GB.
  - **지운 것**: `C:\Users\Shintong\.weasis`(188MB — 시험 전에는 없던 폴더) · `%TEMP%\weasis-Shintong.07F51C12` · `%TEMP%\weasis-Shintong.E2A53071` · `%TEMP%\weasis-out.txt` · scratch의 `cdx-v-085401.iso`. **남긴 것**: scratch의 `weasis\`(MSI와 풀린 폴더 — 뷰어를 넣은 CD를 구울 때 씀. 끝나면 지움).
  - 시험 중 한 번 「안 켜짐」으로 보였던 것은 이 도구의 셸 환경(현재 폴더의 파일을 이름만으로 못 찾게 한 설정) 탓 — `VOIR.BAT`을 전체 경로로(더블클릭처럼) 부르니 켜짐. 제품 문제가 아님.
- **바꾼 파일**: PACS — `cd-export-common.ps1` · `cd-export-ui.ps1` · `README.md`. EMR — 위키 `modules/pacs.md`(2.4.4절) · `manual-fr/pacs.md`(§12) · `reference/image-print-export-design.md` · 이 노트.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음.
- **확인 못 한 것**: 뷰어를 넣은 **진짜 CD**(CD에서 켜지는 시간) · 받는 병원 PC가 CD의 프로그램 실행을 막는지 · 다시 쓰는 디스크 · DVD · 불량 디스크 · 굽는 도중 드라이브가 떨어졌을 때(일부러 만들 수 없음) · CD 한 장 가득(약 700MB) 굽는 시간.
- **`D:\CD-TEST`**: 지금 둘 — `26-00001_20261001_1825_2`(뷰어 없음, 60MB)와 **`26-00001_20261002_0853`(뷰어 포함, 198MB — `VOIR.BAT`을 더블클릭해 보실 수 있음)**. 회귀 시험이 만든 `26-00001_20261002_0901` · `_0901_2`는 지웠습니다.
- **다른 세션에 부탁 · 정할 것(총괄)**:
  - 뷰어를 넣은 **두 번째 장**을 구울지(실장님) — 디스크 198MB, CD에서 켜지는 시간을 잼.
  - `cd-viewer`를 설치 USB 묶음에 넣을지, 병원이 직접 만들게 할지.
  - Weasis 자신의 라이선스 글(`LICENSE`)을 `cd-viewer`에 넣는 것 — 풀린 폴더에는 Java 것만 있음.
  - 굽는 속도 「가장 느리게」 그대로 둘지.

## 2026-10-02 — 단추 간격 · 뷰어 넣기 준비(가짜 폴더로) · 설계안 「.exe로 만드는 길」

- **상태**: 확인 요청. **Weasis 받기와 진짜 굽기는 하지 않았음** — 아래 「기다리는 것」.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(develop `5c369e0`을 ff로 받은 위). **PACS 저장소** `session/pacs` — 「cd-export: the viewer folder can go on the disc…」 커밋(main `2c6027b` 위).
- **한 일**:
  1. **단추 간격**(총괄 요청): 영상/판독 창의 상세에서 「⇄ 다른 오더로 옮기기…」(주황색 그대로)와 「🖨 영상 인쇄」를 「Images」 줄 아래 **한 줄에 나란히**, 아래 여백 7px. `RadiologyReadings.jsx`.
  2. **뷰어 넣기 준비**(PACS 저장소): 프로그램 옆에 `cd-viewer\Weasis.exe`가 있을 때만 「☐ Ajouter la visionneuse d'images au disque (+ … Mo)」. 체크하면 `VIEWER\`로 그대로 복사 + `VOIR.BAT`(Weasis의 `RUN.BAT`과 같은 한 줄, 폴더 이름만 다름, 앞에 `cd /d "%~dp0"`) + README의 뷰어 문단 + 용량 계산에 뷰어 크기 + 디스크 이미지에 UDF 추가. 폴더가 없으면 체크 칸이 안 나오고 전과 같음.
  3. **설계안 11절 「.exe로 만드는 길」**(조사만): 추천 = Windows에 들어 있는 C# 컴파일러(`csc.exe`, C# 5)로 만든 .NET Framework 4.8 WinForms 실행 파일 하나. 확인한 것과 추측을 갈라 적음.
- **바꾼 파일**: EMR — `frontend/src/components/RadiologyReadings.jsx`, 위키 `modules/pacs.md` · `reference/image-print-export-design.md` · 이 노트. PACS — `cd-export-common.ps1` · `cd-export-ui.ps1` · `cd-export.ps1` · `README.md`.
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음.
- **확인한 방법**:
  - 단추: 격리 화면(1366×768, 한국어)에서 두 단추의 자리를 재어 봄 — 같은 줄, 사이 6px, 다음 줄(검사 번호)까지 7px, 주황색 그대로.
  - 뷰어 넣기(`cdx_viewer_test.ps1`, **가짜 폴더** — 파일 123개 · 80자 넘는 이름 · 12단 깊이 · 악센트 든 이름) 11가지: 폴더가 없으면 칸이 없음 / 있으면 칸이 나오고 꺼져 있음 / 켜면 필요한 용량이 늘어남 / 저장한 폴더의 맨 위가 `DICOMDIR · IMAGES · README.TXT · VIEWER · VOIR.BAT` / 뷰어 폴더가 통째로 / `VOIR.BAT`이 순수 ASCII이고 그 한 줄 / README에 두 언어로 / `AUTORUN.INF` 없음 / ISO(9660 + Joliet + UDF)가 만들어짐 / 임시 폴더 비움 / 다시 끄면 뷰어가 안 들어감.
  - 창 21가지 · 프로그램의 일 28가지 다시 통과.
  - 「.exe」: scratch에서 15줄짜리 창 프로그램을 Windows의 `csc.exe`로 컴파일 — 0.25초, 5 632바이트, 실행되어 굽는 부품에서 드라이브 1대를 읽음. 그 시험 파일은 지웠음(제품 코드에는 없음).
- **확인 못 한 것**: **진짜 Weasis로는 아무것도**(받지 않았음) — 켜지는지, 폴더 크기, 켜지는 시간, 받는 PC에 남는 것, 라이선스 글, UDF를 넣은 디스크를 받는 쪽 장비가 읽는지. **진짜 굽기**도 그대로 아직.
- **`D:\CD-TEST`**: 뷰어 시험이 만든 폴더(`26-00001_20261001_1835` 등)는 시험이 끝나며 스스로 지웠고, 그 뒤 `26-00001_20261002_0709` · `26-00001_20261002_0709_2` 둘을 지웠습니다. 견본 `26-00001_20261001_1825_2` 하나만 그대로.
- **기다리는 것 — 실장님께 직접**: 이 세션의 규칙상 **파일 내려받기와 디스크 굽기는 실장님이 이 대화창에서 직접 「해도 된다」고 하셔야** 합니다(다른 세션이 전해 준 승인으로는 못 함). 여쭈는 창을 띄웠으나 닫으셨고, 그 뒤로 답이 없어 **둘 다 하지 않았습니다**. 대화창에 한마디(「Weasis 받아」 / 「CD 구워」) 주시면 바로 이어 갑니다.
- **다른 세션에 부탁**: 총괄 — 위 사정을 실장님께 전해 주시거나, 실장님이 이 세션 창에 직접 한 줄 적어 주시게.

## 2026-10-01 — ④ 영상 CD 반출 프로그램 `cd-export`: 폴더 · ISO까지 (진짜 굽기는 아직)

- **상태**: 확인 요청 — **굽기 시험은 총괄의 허락을 기다림**(실장님의 디스크 한 장). 폴더 저장 · ISO 저장 · 디스크 알아보기까지는 확인.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋. **PACS 저장소** `session/pacs` — 「cd-export: copy a patient's exams to a CD…」 커밋.
- **한 일**:
  - **PACS 저장소**(새 파일 넷): `cd-export.bat`(더블클릭) · `cd-export.ps1` · `cd-export-ui.ps1`(창) · `cd-export-common.ps1`(하는 일 전부). README에 한 절, `.gitignore`에 `cd-export.ini` · `cd-viewer/`.
  - **EMR**(`backend/src/routes/pacs.export.js`에 길 둘): `GET /api/pacs/export/patient?chart_no=`(환자 · 병원 정보 · 검사 목록과 크기 · 못 주는 사유) · `GET /api/pacs/export/bundle?order_item_ids=&medium=`(Orthanc의 ZIP을 그대로 넘김, 변경 기록 `pacs.images.export`).
  - 흐름: EMR 계정 로그인 → 차트번호 → 검사 체크 → 크기 · 디스크에 들어가는지 → 「Graver ce CD…」/「Enregistrer en fichier ISO…」/「Enregistrer dans un dossier…」. 디스크 = `DICOMDIR` + `IMAGES\` + `README.TXT`. JPG 없음, 판독소견 없음.
- **바꾼 파일**: 위의 것 + 위키 `modules/pacs.md`(2.4.4절, 4절 서버 · PACS 저장소, 8절) · `manual-fr/pacs.md`(§12) · `reference/changelog-1.5.0/pacs.md` · `reference/image-print-export-design.md` · 견본 그림 `reference/design/cd-export-sample-fr.png`(가짜 환자).
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음(동작 이름 `pacs.images.export`는 ① 커밋에서 `audit.js`에 이미 넣음). 프로그램의 글은 `cd-export-ui.ps1` 안에 있음(fr · ko · en) — EMR의 번역 파일과 무관.
- **확인한 방법**(격리 EMR 9188 + PACS 9198, 가짜 환자):
  - **EMR의 길**(`export_api.py`) 33가지 통과 — `modules/pacs.md` 4절에 적음. 묶음의 파일이 영상 서버의 파일과 바이트까지 같음, 거절은 줄을 남기지 않음, 기록을 못 적으면 한 바이트도 안 나감.
  - **프로그램의 일**(`cdx_test.ps1`, 창 없이) 28가지: 설정 파일(비밀값 없음) · 로그인의 다섯 경우(주소 틀림 / 무응답 / EMR이 아닌 주소 / 비밀번호 틀림 / 맞음) · 조회 · 묶음 받아 풀기 · README(UTF-8 머리표, CRLF, 프랑스어 → 영어) · `D:\CD-TEST`에 저장하고 다시 읽어 비교 · 같은 이름이면 `_2` · 사본의 한 바이트를 바꾸면 그 파일을 짚어냄 · ISO(온전한 크기, `CD001`, 있는 파일을 덮어쓰지 않음) · 드라이브 알아보기 · 임시 폴더 지움 · 로그아웃.
  - **창**(`cdx_ui_test.ps1` — 창을 띄우고 사람 대신 단추가 부르는 것을 부름) 21가지: 로그인 화면 → 틀린 비밀번호(칸이 비워짐) → 맞는 비밀번호 → 없는 차트번호 → 조회(35건) → 취소 · 경고 검사는 체크 불가이고 이유가 보임 → 체크 2건 「2 examen(s) · 23 image(s) · 60 Mo」 → 폴더 저장(안내에 자리, 이 PC에 남는 것 없음) → 폴더 고르기 취소 → 없는 폴더 → ISO 저장 → 같은 이름 거절 → 쓸 수 없는 자리의 ISO(반쪽 파일 없음) → 굽기 물음에 「아니오」(아무것도 안 씀) → 토큰이 만료되면 로그인 화면으로. 프랑스어 · 한국어 · 영어 창.
  - **실제 실행**: `cd-export.ps1`과 `cd-export.bat`으로 창이 뜨고 X로 닫힘. 프로그램 폴더에 생기는 파일 없음(로그인 전에는 `cd-export.ini`도 안 생김).
  - **저장한 폴더가 진짜 DICOM 디스크인지**: `DICOMDIR`을 DICOM 라이브러리로 읽음 — 환자 1 · 검사 2 · 시리즈 6 · 영상 23, 가리키는 파일 23개가 모두 있음. ISO는 그 안의 표를 직접 읽어 맨 위에 `DICOMDIR` · `IMAGES` · `README.TXT`, 파일이 폴더의 것과 같음을 확인.
  - **큰 검사**(큰 필름 48장 = 687MB): nginx를 지나 온전히 받음 → USB 폴더(`D:\CD-TEST`, FAT32)에 저장하고 다시 읽어 비교까지 **약 3분** / ISO는 351 636섹터(지금 들어 있는 CD-R 359 844섹터에 들어감). 29MB를 더 고르면 「✘ 15 Mo de trop」이고 굽기 단추가 꺼짐. 받는 도중 EMR을 다시 시작해 끊으면 「La connexion a été coupée… Rien n'a été copié」, 아무것도 안 남음.
  - **드라이브 줄**: 진짜 드라이브(G:, 빈 CD-R 703MB)를 읽기만 해서 알아봄. 드라이브 없음 / 디스크 없음 / 쓴 디스크 / 못 쓰는 디스크 / 빈 DVD는 값을 넣어서 글과 굽기 단추를 확인.
- **지으면서 고친 것**: ① 디스크 이미지를 만든 부품이 환자 영상 파일을 잡고 있어 임시 폴더가 안 지워짐(프로그램을 끌 때까지 남음) → 일이 끝나면 바로 놓아 주게 하고, 지우기를 몇 번 다시 해 봄. ② 이미지 파일의 기본 한계가 650MB → ISO 저장은 한계 없음. ③ 창의 아래쪽이 잘려 보임(패널 크기) → 고침.
- **확인 못 한 것**:
  - **진짜 굽기 전부** — 굽기 · 진행 표시 · 드라이브의 자체 확인(`IBurnVerification` — 이 드라이브에서 켜지는지) · 구운 뒤 다시 읽어 비교 · 꺼냄 · 구운 디스크를 다시 넣었을 때 「빈 디스크가 아님」. 코드는 들어 있고 한 번도 돌리지 않았습니다.
  - 다시 쓸 수 있는 디스크 · DVD · 불량 디스크(이 PC에 없음). 자리가 모자랄 때(`NO_ROOM`)는 실제로 가득 찬 곳이 없어 못 해 봄.
  - 다른 PC(서버가 아닌 PC)에서 EMR 주소를 넣어 붙는 것 — 격리의 127.0.0.1로만 봄. 실행 중 EMR에 붙여 보는 것은 총괄 몫.
  - 진짜 장비의 영상, 압축된 영상.
- **`D:\CD-TEST`에서 지운 것**: 시험 폴더 8개(`26-00001_20261001_1804` · `_1805` · `_1810` · `_1823` · `_1824` · `_1825`, `26-00005_20261001_1813` · `_1818` — 뒤의 둘은 687MB씩). **남긴 것**: `D:\CD-TEST\26-00001_20261001_1825_2`(가짜 환자 RAKOTO Jean, 검사 2건, 60MB — 「CD라고 생각한 폴더」의 견본). `D:`의 다른 것은 열지도 건드리지도 않음.
- **다른 세션에 부탁**:
  - **총괄**: ⓐ 굽기 시험 허락(빈 CD-R 1장 — 가짜 환자의 검사 2건 60MB를 굽고, 확인하고, 같은 디스크를 다시 넣어 「빈 디스크가 아님」까지). ⓑ Weasis 받기 허락 — 아래. ⓒ 변경 기록 탭의 이름표에 `pacs.images.export`(값: `medium` · `exam_count` · `image_count` · `size_mb` · `exams`)도 함께. ⓓ PACS 저장소의 `CHANGELOG.md`는 안 건드렸습니다(릴리스 때 총괄이).
  - **Weasis — 받기 전에 알립니다**(받지 않았습니다): 파일 `Weasis-4.7.3-x86-64.msi`, 출처 `https://github.com/nroduit/Weasis/releases/download/v4.7.3/Weasis-4.7.3-x86-64.msi`(공식 GitHub 릴리스 v4.7.3), 크기 54 636 544바이트, 릴리스에 적힌 SHA-256 `c15358f9…78712f1c`. 차선: `weasis-native.zip`(같은 릴리스, 60 534 420바이트). 받는 자리는 이 세션의 scratch 폴더, 설치(MSI 실행)는 하지 않고 `msiexec /a`로 풀기만 해 봅니다.
- **다음**: 허락이 오면 굽기 1장 → ③ Weasis(풀기 → `D:\CD-TEST` 폴더에서 `VOIR.BAT` → 크기 · 시간 → 「뷰어 포함」 체크).

## 2026-10-01 — ① 영상 인쇄: 검사의 영상을 A4에 1·2·4·6장씩

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(develop `da9bd2d`가 들어 있음 — 그 뒤 develop에 새 것 없음). **PACS 저장소** — 없음
- **한 일**: 🩻 영상/판독 창의 검사 상세에 **「🖨 Imprimer les images」**(진료·수납 공통). 창에서 영상을 고르고(처음 12장, 한 번에 48장), 한 장에 1·2·4·6장, 밝기(Normale · + · ++ — 종이에만), 언어(FR 먼저). 종이: 병원 · 환자 · 검사 · 그림(시리즈·영상 번호) · 「Images de référence — non destinées au diagnostic」 · 발행 일시 · 쪽 번호. 인쇄 = 변경 기록 한 줄(`pacs.images.print`) → 서류 발행(`imaging-images`) → 인쇄 창. 앞의 둘 가운데 하나라도 안 되면 인쇄하지 않음.
- **바꾼 파일**:
  - 새로: `backend/src/routes/pacs.export.js`, `frontend/src/components/ImagesPrint.jsx`, `frontend/src/documents/imaging-images.jsx`, 견본 그림 둘(`wiki/reference/design/imaging-images-sample-*.png` — 가짜 환자)
  - 고침: `backend/src/routes/pacs.routes.js`(라우터 걸기 3줄), `frontend/src/components/RadiologyReadings.jsx`(단추와 창 열기 — 주황색 「⇄」 단추는 그대로), `frontend/src/documents/imaging-report.jsx`(`fitSize` · `linesAt`에 `export`만)
  - 위키: `modules/pacs.md`(2.4.3절, 4절 화면·서버, 8절), `manual-fr/pacs.md`(§11), `reference/changelog-1.5.0/pacs.md`, `reference/image-print-export-design.md`(시작 · 총괄이 정한 값 · 판독소견은 넣지 않음 · `D:\CD-TEST` · 차례)
- **공용 파일 변경**:
  - `backend/src/utils/audit.js` — 동작 둘: `PACS_IMAGES_PRINT: 'pacs.images.print'`, `PACS_IMAGES_EXPORT: 'pacs.images.export'`(뒤의 것은 ④에서 씀 — 총괄 결정 ㄴ)
  - `frontend/src/documents/registry.js` — `imagingImages`를 `TEMPLATES` · `HISTORY_ALSO.document` · `NO_NUMBER_ON_PAPER`에(총괄 결정 ㄱ: PACS가 직접)
  - `frontend/src/i18n/{ko,en,fr}.js` — pacs 구간 안에만
- **DB 마이그레이션**: 없음
- **번역 키**: `px_im…` 29개(ko/en/fr) — 단추 · 창 · 안내 16개, 거절 사유 `px_imErr_<CODE>` 13개. 판독 보고서의 `px_printLang` · `px_printGo` · `px_printAgain` · `px_printIssued` · `px_printFail` · `px_untickAll`을 같이 씀.
- **확인한 방법**(격리 EMR 9188 + PACS 9198, 가짜 환자 · 가짜 장비로 보낸 검사):
  - 서버(`imprint_api.py`) **35가지 통과**: 그림 목록의 순서 · 장비 보고서가 빠짐 · 큰 필름(2500×3000, 12비트)이 1600×1920으로 줄어 옴 · 작은 그림은 키우지 않음 · 12프레임 영상의 첫 프레임 · 흑백이 뒤집힌 필름 · 다른 검사/다른 환자의 영상 번호 → 403 · 취소/환자 번호 경고(다름·없음)/영상 없음/영상 오더 아님 거절 · 로그인 없이 401 · 수납 계정 통과 · 49장 거절 · 겹친 번호/빈 목록 400 · 기록을 못 적게 하면(시험용 트리거) 500이고 줄이 안 생김.
  - 화면(브라우저, 인쇄 창의 HTML을 받아 Chrome으로 PDF를 만들어 봄): 2장 배치 12장 → 6쪽 / 4장 → 3쪽 / 6장 19장 → 4쪽 / 1장 → 1쪽 / 48장 6장 배치 → 8쪽. 긴 이름(84자) 세 줄로 잘리지 않음. FR · EN · KO. 밝기 + · ++가 종이에 반영됨. 60장짜리: 처음 12장, 「Cocher les 48 premières」, 49번째를 누르면 안내. 발행 기록(`document_log`)의 배치·장수가 종이와 같음. 「Imprimer de nouveau」는 다시 발행하지 않음(같은 번호). 팝업이 막히면 안내.
  - 📄 문서 창의 이력에서 다시 열기: 그림을 영상 서버에서 다시 가져와 같은 배치·밝기로 나옴, 다시 인쇄됨.
  - 수납 계정: 수납 화면의 🩻 창에 단추가 나오고 인쇄됨. 취소/경고 검사는 단추가 꺼지고 이유가 나옴. 옮기기·영상 보기 단추는 전처럼 수납에는 없음.
  - 영상 서버를 끈 채: 창을 열면 「Le serveur d'images ne répond pas」 / 열어 둔 창에서 더 고르면 「7 image(s) n'ont pas pu être chargée(s)」, 인쇄 단추 꺼짐.
  - 밝은 화면 · 영어 화면 · 한국어 화면(창의 글이 그 언어로, 종이는 프랑스어로 시작). 기존 회귀: 영상 중계 15 · 비교 32 · 체크 비교 23 통과.
- **지으면서 고친 것**: 영상 서버 무응답을 502로 답했더니 EMR 앞의 nginx가 자기 글로 바꿔 버려 사유(`code`)가 사라짐 → 409로 답함(설명은 `modules/pacs.md` 4절).
- **확인 못 한 것**: **진짜 프린터**(특히 흑백 레이저에서 밝기 값 — 화면과 PDF로만 봄) · 진짜 장비의 영상(가짜 장비가 만든 그림으로 봄 — 압축된 영상(JPEG 2000 등)과 아주 큰 영상은 안 해 봄) · 수백 장짜리 검사에서 작은 그림이 다 뜨는 시간(60장은 바로) · 문서 이력에서 다시 인쇄할 때는 공용 `printDocument`(0.35초 뒤 인쇄)를 씀 — 3장으로는 됐고, 48장은 안 해 봄(그림이 빠지면 영상 창에서 다시 뽑으면 됨).
- **총괄이 추천값으로 정한 것**(실장님이 바꿀 수 있음 — 설계안 9절에 적음): 「참고용 — 진단용 아님」 넣음 · 수납도 인쇄 · 환자 번호 경고 검사는 막음 · 기본 2장/48장/처음 12장.
- **다른 세션에 부탁**:
  - **총괄/설정**: 변경 기록 탭이 새 동작을 화면 언어로 부르게 — `frontend/src/pages/settingsAudit.js`의 동작 이름표에 `'pacs.images.print'`(와 ④ 때 `'pacs.images.export'`), `se_act_…` 번역, `wiki/03-change-log.md`의 동작 표에 한 줄. 줄의 값은 이미 있는 이름표(`order_name` · `accession_no` · `image_count` · `lang`)를 쓰고, 새 것은 `per_page` 하나.
  - 없으면 변경 기록 탭에 동작이 `pacs.images.print` 글자 그대로 나옵니다(기록 자체는 남음).
- **다음**: ④ 영상 CD 반출 프로그램 — 「폴더에 저장」(`D:\CD-TEST`)부터.

## 2026-10-01 — 설계안 고침: JPG 사본 없음 · 뷰어(Weasis)를 일찍 · 굽는 장치 연결됨 (문서만)

- **상태**: 확인 요청 — **짓지 않음**(총괄: 「아직 짓지 말고 설계안만」). 실장님 답(가·라·마·사·아·차)과 시작 신호를 기다림.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋. develop(`da9bd2d`)은 **ff가 안 돼서 `git merge develop`으로 합침**(전에 올린 설계 커밋 둘이 아직 develop에 없어서 — 충돌 없음). 문서만. **PACS 저장소** — 없음
- **한 일**: `wiki/reference/image-print-export-design.md`를 고침.
  - **묶음**: `DICOMDIR` + `IMAGES` + `README.TXT` (+ `VIEWER` · `VOIR.BAT`). JPG 사본 · `INDEX.HTM` · `IHE_PDI`를 뺌. IHE 규격 이름 확인 숙제는 없어짐(그 규격을 내세우지 않음).
  - **더 단순한 쪽**: EMR은 Orthanc의 ZIP을 **뜯지도 덧붙이지도 않고 그대로 넘김** — 직접 짓기로 했던 ZIP 쓰는 코드(ㄹ)가 필요 없어짐, 우리 쪽 4GB 한계도 없어짐. `README.TXT`는 반출 프로그램이 디스크에 씀. 반출 프로그램은 로그인 토큰으로 묶음을 받으므로 「한 번 쓰는 표」는 ②(브라우저 내려받기) 때.
  - **차례**: ① 인쇄 → ④ 반출 프로그램(뷰어 없이 굽기까지) → ③ 뷰어를 넣어 한 장 → 되면 「뷰어 포함」 체크 → ② EMR 화면의 ZIP 내려받기(그 뒤 또는 필요해질 때).
  - **정할 것에 더함**: 타(판독소견을 CD에 — PDF), 파(③ 때 Weasis 설치 파일을 내려받고 이 PC에 설치·풀어 봐도 되는지), 총괄 ㅅ·ㅇ·ㅈ(README를 프로그램이 씀 / 켜는 파일 이름 `VOIR.BAT` / Weasis 폴더는 저장소에 넣지 않음).
- **Weasis를 설치 없이 폴더째 돌리는 길 — 원문에서 확인한 것**(설계안 5-2절. 소스는 GitHub `nroduit/Weasis` master):
  - `IsoImageExport.java`: 「Add Weasis」는 **설치 폴더를 통째로** 디스크의 `viewer`로 복사하고 `AUTORUN.INF` · `RUN.BAT`를 씀. Windows에서만.
  - `RUN.bat`: `start "" "viewer\Weasis.exe" "weasis://…"` — 풀면 `$dicom:get -p $weasis:config pro="weasis.portable.dir ."`.
  - `DicomModel.java`: `-p`는 그 자리의 **`DICOMDIR`을 읽고**, 없으면 폴더 `dicom,DICOM,IMAGES,images`를 뒤짐(`ConfigData.java`의 기본값) → Orthanc의 모양(`DICOMDIR` + `IMAGES/`)이 그대로 맞음. 영상을 받는 PC의 임시 자리로 복사해 여는 것이 기본.
  - 만든 사람(Nicolas Roduit, 2022-09-07): "To get a 'portable' version, just copy the installation directory." — 같은 OS·같은 CPU 종류여야 하고 파일 연결·웹 실행은 안 됨.
  - 크기: MSI 54 636 544바이트, `weasis-native.zip` 60 534 420바이트(릴리스 v4.7.3).
- **이 PC의 굽는 장치 — 읽기만 하는 조회로 확인함**(쓰지 않음, 트레이 안 움직임): `Slimtype DVD A DS8A3S`(USB, 펌웨어 HA28), `G:`, CD-R 빈 디스크, 359 844섹터 = 702.8MB.
- **그 밖에 확인함**: EMR의 `backend/package.json` · `frontend/package.json`에 PDF·ZIP 라이브러리 없음(판독지는 브라우저 인쇄) → 「판독소견 PDF를 CD에」는 새 부품이 필요.
- **바꾼 파일**: `wiki/reference/image-print-export-design.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인 못 한 것**: Weasis를 실제로 돌려 본 것은 없음 — 설치 폴더를 얻는 길(`msiexec /a`로 풀기만 해도 켜지는지), 폴더 크기, 디스크에서 켜지는 시간, 받는 PC에 남는 것(설정·임시 복사본), 설치 폴더에 라이선스 글이 있는지. Weasis 누리집 FAQ가 말하는 「portable archive」는 내려받기 쪽·릴리스에서 **찾지 못함**. 큰 묶음(수백 MB)이 nginx를 지나는지. `README.TXT`의 글자 형식.
- **지킬 것**: 진짜로 굽기 전에는 **반드시 총괄에 먼저 알림**(디스크는 실장님 것 — 한 장씩). 그 전까지 ISO 저장으로. 트레이 동작도 굽기 시험 때만. 시험 차례는 설계안 4-2절(두 장이면 됨).
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 설계안: 영상 인쇄와 영상 내려받기(CD 반출) — 짓기 전 (문서만)

- **상태**: 확인 요청 — **결정 대기**(설계안 9절: 실장님 몫 일곱, 총괄 몫 다섯). 짓지 않음.
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `c9e4d88`을 ff로 당긴 뒤). 문서만. **PACS 저장소** — 없음
- **한 일**: `wiki/reference/image-print-export-design.md` — 화면 그림(단추 자리·인쇄 창·내려받기 창), 인쇄 방식, 묶음의 폴더 구조, CD에 넣을 뷰어 조사(라이선스 원문), 기록·권한, 걸리는 것, 정할 것, 짓는 차례.
- **격리에서 확인한 것**(Orthanc 26.6.1 — 실행 중과 같은 이미지):
  - `GET /studies/{id}/media`와 `POST /tools/create-media-extended {Resources, Synchronous: true}`: ZIP 맨 위에 `DICOMDIR`, 그 옆 `IMAGES/IM0…`. 여러 검사를 한 `DICOMDIR`로. 검사 55건(83장)을 0.06초, 첫 바이트 0.01초. ZIP의 각 파일 크기가 머리에 적혀 있음(뒤에 붙는 형식이 아님) → EMR이 흘려보내며 자기 파일을 덧붙일 수 있음.
  - `GET /instances/{id}/rendered`(Accept: image/jpeg, `?width=`): JPEG로 나옴, 한 장 2ms(작은 시험 그림). `/preview`도 PNG/JPEG.
  - `GET /studies/{id}/statistics`: `DicomDiskSizeMB` 등 — 내려받기 전에 크기를 보여 줄 수 있음.
  - EMR의 nginx(`frontend/nginx.conf`): `/api/`에 응답 크기 제한 없음, 읽기 시간 제한은 기본(바이트 사이 60초).
- **뷰어 조사(원문)**: Weasis — `LICENSE`가 `EPL-2.0 OR Apache-2.0`, 다시 배포 가능. 4판부터 옛 portable zip은 없어지고 설치 파일에 Java 포함(MSI 52MB), CD에 넣어 실행은 Windows x86-64만·느림, 인증된 의료기기 아님. MicroDicom — EULA가 비상업용 무료·다른 사람에게 주는 것 불허. RadiAnt — 배포는 유료(검색 결과로 읽음). DWV — GPL-3.0, CD에는 맞지 않음. **추천: 뷰어 없이 `INDEX.HTM` + JPG로 먼저, Weasis는 ③에서 손으로 해 본 뒤.**
- **바꾼 파일**: `wiki/reference/image-print-export-design.md`(새), `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인 못 한 것**: 큰 영상·큰 묶음의 시간, nginx를 지나는 수백 MB, 흑백 레이저의 밝기, Weasis의 풀어서 쓰는 묶음이 실제로 어느 파일인지와 CD에서 켜지는지, IHE 「휴대용 영상 자료」 규격의 파일 이름(기억으로 적음 — 짓기 전에 원문 확인), RadiAnt 조건의 원문 쪽.
- **다른 세션에 부탁**: 없음(결정 뒤 — `registry.js` 등록은 진료/총괄, `audit.js` 두 줄은 총괄에 알림).

## 2026-10-01 — 영상 옮기기: 복원 뒤 다시 적용((나)) · 단추 여백

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `7bc8ef3`를 ff로 당긴 뒤 — 046 `pacs_study_move`가 develop에 들어와 있음). **PACS 저장소** `session/pacs` — 이 일의 커밋 하나(`main` `fd095b2` 위): 복원 스크립트의 안내 글과 README 한 문단
- **결정(총괄)**: ★는 (나) — 「그림을 잃지 않되 사람 손이 가지 않게, 현지에는 돕는 사람이 없다」.
- **한 일**:
  1. **`pacs.move.js` `reapplyAfterRestore(req, 오더)`** — `GET /viewer-url`이 답하기 전(되찾기보다 먼저)에 부름. 그 환자에게 끝난 바로잡기가 없으면 영상 서버에 묻지도 않음. 조건(모듈 위키 4절 「복원 뒤 다시 적용」): 줄이 `done`이고 두 오더 모두에게 가장 최근 줄 / EMR이 그 바로잡기가 남긴 대로 / 영상 서버가 정확히 바로잡기 전 모습(옛 번호에 적어 둔 영상 번호 그대로·안정됨, 고친 번호 없음). 맞으면 처음과 같은 함수로 만들기 → 확인 → 옛 것 삭제. 맞바꾸기는 임시 번호를 거치는 여섯 단계를 그대로 다시.
  2. 다시 적용은 **자기 줄**로 돎(`detail.server_only: true`, `reapply_of: <원래 줄>`, 사유 칸 「Re-applied after a restore」) — 끊기면 다른 줄처럼 되돌리거나 이어 감, 그동안 그 오더들은 피드·도착 보고·영상 창에서 빠짐. **변경 기록 한 줄**: 동작은 같은 `pacs.study.move`, 요약이 「Re-applied after a restore: 3 image(s): … -> …」, `kind: reapply`. 못 쓰면 하지 않음. `GET /moves/patient`(두 오더의 옮긴 기록)에는 안 나옴.
  3. EMR의 오더 기록은 이미 맞으므로 안 바꿈. 단 브리지가 돌아온 옛 검사를 원래 오더의 「도착」으로 다시 적어 놓았으면 그 기록만 다시 비우고 장비 목록으로.
  4. **화면**: 상세의 「⇄ 다른 오더로 옮기기…」 단추에 위아래 여백(1366×768 ko: 단추 아래 끝과 「검사 번호(Accession)」 줄 사이 0 → 5px).
  5. **PACS 저장소**: `restore-image-backup.ps1`의 경고 글(「call for help」 → 「Nothing to do by hand: the EMR puts them under the right order again the next time that patient's images are opened」)과 머리 주석, `README.md` 영상 백업 절의 그 문단.
- **바꾼 파일**: EMR `backend/src/routes/pacs.move.js`, `backend/src/routes/pacs.routes.js`(한 줄), `frontend/src/components/RadiologyReadings.jsx`(단추 스타일), `wiki/modules/pacs.md`(4절·6.2·P-33·8절), `wiki/reference/study-reassign-design.md`, `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`. PACS `restore-image-backup.ps1`, `README.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음(표를 안 바꿈 — `detail`에 두 칸을 더 적을 뿐).
- **확인한 방법** (격리 EMR 9188 + PACS 9198. 복원 흉내: 바로잡기 전에 검사의 파일을 받아 두었다가, 바로잡은 뒤 고친 검사를 영상 서버에서 지우고 그 파일을 다시 올림 — 옛 디스크의 복원이 하는 일과 같음):
  - **옮기기**: 올린 직후에 열면(아직 안정 전) 아무것도 안 하고 「…ne les a pas」 안내 → 1분 뒤 열면 Stone(0.2초) · 고친 번호 아래 그림 3장 같음·accession·이름 맞음 · 옛 번호 없음 · 받은 오더의 EMR 기록 그대로 · 원래 오더는 대기 그대로 · 다시 적용 줄 하나(`done`) · 변경 기록 한 줄 · 옮긴 기록 목록에는 안 나옴 · 다시 열어도 그대로(60ms).
  - **브리지가 먼저 다시 붙인 경우**(원래 오더가 그날 장비 목록에 있어, 돌아온 옛 검사를 「도착」으로 적음): 열면 고친 번호로, 원래 오더는 다시 비워지고 `scheduled`.
  - **맞바꾸기**: 두 옛 검사를 다 되돌려 올림 → 1분 뒤 열면 두 번호가 다시 서로의 그림, 임시 검사 0, 두 오더의 EMR 기록 그대로, 줄 하나·변경 기록 한 줄, 다시 열어도 그대로.
  - **옮겼다가 되옮긴 기록**: 옮기고 1분 뒤 되옮긴 다음 그 환자의 일곱 검사를 모두 엶 → 새 줄 0, 변경 기록 0, 일곱 검사의 그림이 모두 제자리.
  - **조건이 어긋남**: 돌아온 검사가 한 장 모자람 → 아무것도 안 하고 안내 그대로, 모자란 검사는 그대로 → 나머지 한 장을 올리고 1분 뒤 열면 적용.
  - **다시 적용 도중 실패**(시험용 중계로 만들기 500): 그 줄 `rolled-back`, 변경 기록 0, 돌아온 옛 검사 그대로, 고친 번호 없음 → 중계를 치우고 열면 적용.
  - 끝난 뒤: 열린 줄 0, `failed` 0, 임시 검사 0, 일곱 오더 모두 EMR의 장수 = 영상 서버의 장수. **회귀**: 중계 15/15, 비교 32/32, 체크 비교 23/23.
- **확인 못 한 것**: 진짜 `restore-image-backup.ps1`을 옛 디스크로 돌린 뒤의 다시 적용(복원을 손으로 흉내 냄 — 스크립트가 옛 번호로 올리는 것 자체는 ③에서 확인). 한 영상이 그 사이 두 번 이상 이어서 옮겨진 경우(A→B→C — 짓지 않음: 다시 적용하지 않고 안내 그대로). 큰 검사.
- **알아 둘 것**: 다시 적용은 **의사가 그 환자의 영상을 열 때** 일어납니다(영상보기 · 비교). 아무도 열지 않으면 그대로 있고, 그동안 그 그림은 옛 번호로 영상 서버에 있습니다. 밤 백업은 그 뒤에 평소대로 따라갑니다(옛 번호의 파일을 `replaced`로).
- **다른 세션에 부탁**: 설정 — 변경 기록 화면에서 `kind` 값 `reapply`(그리고 `move` · `swap`)를 말로.

## 2026-10-01 — 영상 옮기기: 사유는 선택 · 변경 기록은 필수 · develop 합침 · en/밝은 화면/긴 이름

- **상태**: 확인 요청 (①②③과 함께 읽어 주세요)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋. 그 앞에 **develop `d18d590`을 합친 커밋 `1bf7b69`**(ff가 안 되어 `git merge develop` — 충돌 없음). **PACS 저장소** — 없음(`fd095b2` 그대로)
- **실장님 결정**: 「누가에서 사유를 반드시 적을 필요는 없어. 다만 로그는 무조건 남아야겠지」.
- **한 일**:
  1. 서버(`pacs.move.js`): 사유 없이도 통과(`reason`은 빈 글로 저장 — 표의 NOT NULL 그대로), 답 `REASON` 없앰. **변경 기록 줄을 못 쓰면 옮기지 않음**: 공용 `writeAudit`는 실패해도 던지지 않고 거짓을 돌려주므로, 그 답을 보고 트랜잭션을 되돌림. 줄의 내용: 누가 · 환자 · 요약(영상 장수와 두 오더의 이름·accession) · `kind`(move/swap) · `image_count` · `reading_moved`/`readings_exchanged` · 사유가 있으면 `reason`(없으면 그 칸 자체가 없음).
  2. 화면(`MoveStudy.jsx`): 사유 칸 «Motif (facultatif)» / 「사유 (선택)」 / "Reason (optional)", 오더만 고르면 단추가 켜짐. 옮긴 기록 줄은 사유가 있을 때만 「— motif : …」.
  3. develop을 합친 뒤 `Consultation.jsx`의 두 줄(`correcting:…`, `px_mvViewerBusy`)이 그대로 있는지 확인 — 있음(315줄 · 1901줄), 빌드됨.
- **바꾼 파일**: `backend/src/routes/pacs.move.js`, `backend/sql/801_pacs_study_move.sql`(주석만), `frontend/src/components/MoveStudy.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(10절), `wiki/modules/pacs.md`(2.4.2·4절·8절), `wiki/reference/study-reassign-design.md`, `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션**: 없음(801은 주석만 — 아직 develop에 없는 파일).
- **번역 키** (px_ 구역; 모두 ②에서 넣은 것 — 아직 합쳐지지 않음): 글 바꿈 `px_mvReason` · `px_mvNeed` · `px_mvLogMove` · `px_mvLogSwap`(사유 부분을 뺌) / 새 키 `px_mvLogWhy` / 뺀 키 `px_mvErr_REASON`.
- **변경 기록의 칸 이름(설정 세션에 한 번에)**: `order_name` · `accession_no`(이미 있음) · **`kind`** · **`image_count`** · **`reading_moved`** · **`readings_exchanged`** · `reason`(이미 있음). 동작 `pacs.study.move`, module `pacs`.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 가짜 환자):
  - **기록을 못 쓰게 하고**(변경 기록 표에 그 동작의 INSERT를 거절하는 트리거를 잠깐): 옮기기 → 409 `NOT_CORRECTED`, 줄 `rolled-back`, 영상은 제자리·그림 같음, 다른 번호 아래 검사 없음, EMR 그대로, 변경 기록 0줄. 맞바꾸기 → 영상 서버 쪽은 끝났지만 EMR 기록은 안 바뀌고 `cleanup-pending`(6단계), 트리거를 없애고 resume → `done`, 그때 한 줄.
  - **사유 없이 옮기기**: 200 `done`. 변경 기록 줄 — 사람 · 환자 · 「3 image(s): Urinary US (Renal+Bladder) (261001-68) -> Carotid US (261001-63)」 · `kind: move` · `image_count: 3` · `reading_moved: false`, **`reason` 칸 없음**. 옮긴 기록의 `reason`은 빈 글.
  - **사유를 적고**: 변경 기록 줄의 `reason`에 그대로.
  - **화면 — en · 밝은 테마 · 1366×768 · 긴 이름**(환자 이름 네 낱말 80자쯤, 검사 이름 131자): 「⇄ Correct the order…」 → 창 "The images are under the wrong order", 목록의 긴 검사 이름은 한 줄에서 「…」로 줄고(마우스를 올리면 전부), 「Reason (optional)」, 오더만 고르자 단추가 켜짐, 확인 글에는 긴 이름이 **전부** 두 줄로, 「✓ Done: the images are under the right order.」, 뒤 목록 바뀜, 받은 오더의 상세에 「⇄ 2026-10-01 — RABE Hery moved 2 image(s) from "SONO(5)" to "Échographie rénale, … (bilatérale)"」(사유 부분 없음). 받은 오더에 있던 자기 판독은 그대로(옮길 판독이 없었으므로).
  - **요청이 끊겼을 때 화면**: 코드 — 실패든 성공이든 답이 오면(또는 요청이 오류로 끝나면) 목록과 옮긴 기록을 다시 읽고, 서버의 `code`가 없는 오류(네트워크·nginx)면 「Regardez la liste : la ligne d'historique de l'examen dit si la correction a eu lieu」를 덧붙임. 실제로 nginx에서 끊기게 해 보지는 못함(작은 검사는 0.2~0.4초).
  - **회귀**(develop을 합친 코드에서): 중계 15/15, 비교 32/32, 체크 비교 23/23. 열린 바로잡기 줄 0, `failed` 0.
- **확인 못 한 것**: nginx 시간 초과를 실제로 일으키는 것. ko·fr 밝은 화면(en만). 「종이(paper)」 테마.
- **다른 세션에 부탁**: 설정 — 위 칸 이름. 진료 — `Consultation.jsx` 두 줄(②에 적은 것 그대로).

## 2026-10-01 — 영상을 다른 오더로 옮기기 ③ 영상 백업·복원 · device-watch · README

- **상태**: 확인 요청 (①②③ 모두 끝 — 올릴 때 **EMR과 PACS 폴더를 함께**)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (② `c8206ac` 위). **PACS 저장소** `session/pacs` **`fd095b2`** (`main` `b4ba4a3` 위 한 개)
- **한 일**:
  1. **EMR** `GET /api/pacs/superseded-images`(브리지 토큰): 영상을 옮겨서 영상 서버에서 없어진 영상의 (검사 번호, 영상 번호) 목록. `pacs.move.js` `supersededNow()`가 옮긴 기록을 차례로 다시 따라가 계산(옮겼다가 되옮긴 것은 빠짐). 옮긴 기록의 `superseded`에 `replaced_by`(영상이 간 검사 번호)를 함께 적음.
  2. **PACS `image-backup.ps1`**: 새 영상을 복사한 뒤 그 목록의 파일을 `BethesdaPACS/replaced/<날짜>/<검사 번호>/`로 **옮김**(지우지 않음). 조건 둘 — Orthanc에 그 번호 아래 그 영상이 없음 · 고친 영상이 디스크에 있음. EMR에 물을 수 없으면 그날은 건너뜀(백업은 성공). `state.json`의 파일 수도 맞춤.
  3. **PACS `restore-image-backup.ps1`**: `replaced`는 안 올림. 옛 디스크면 EMR에 물어 짝이 있는 옛 파일을 올리기 전에 치움. **옛 번호로만 있는 그림은 그대로 올리고 경고**. 다시 돌릴 때 짝이 Orthanc에 있는 옛 영상은 Orthanc에서 지움. `-Verify`는 아직 안 치워진 파일 수를 알림. 새 인자 `-EmrSupersededUrl`(기본 `http://localhost:9080/api/pacs/superseded-images`).
  4. **PACS `device-watch.ps1`**: 장비가 보낸 것이 아니라 EMR이 옮겨 만든 영상은 「영상 N장 — EMR에서 다른 오더로 옮긴 영상(장비가 보낸 것이 아님)」(ko/fr/en). 맞바꾸기의 임시 검사는 말하지 않음.
  5. **PACS `README.md`**: 영상 백업 절 한 문단, License에 한 문장(영상 서버의 자료를 Orthanc의 공식 REST로 고치는 것은 Orthanc를 쓰는 것), device-watch 설명 한 문장. `CHANGELOG.md`는 안 건드림(v1.1.0 뒤의 것들처럼 다음 판을 낼 때).
- **바꾼 파일**: EMR `backend/src/routes/pacs.move.js`, `pacs.routes.js`, `wiki/modules/pacs.md`(4절 길 표 · 6.2 · P-33 · 8절), `wiki/reference/study-reassign-design.md`, `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`. PACS `image-backup-common.ps1`, `image-backup.ps1`, `restore-image-backup.ps1`, `device-watch.ps1`, `README.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 시험 폴더를 디스크로(`-SearchRoots`), 빈 Orthanc를 127.0.0.1:9196에 잠깐. 예약 작업·실제 디스크는 안 씀):
  - 백업(처음): 81개, 디스크의 (검사 번호, 영상 번호) 쌍 = 서버의 쌍.
  - 옮기기 1건(3장) + 맞바꾸기 1건(3장 ↔ 2장) → 백업 전 디스크와 서버가 정확히 8쌍 어긋남 → **백업**: 「set aside 8 image file(s)…」·「copied=8」, `images` 81 · `replaced` 8(세 옛 번호 폴더에 3·2·3), `state.json` 81, **디스크 = 서버**.
  - **빈 Orthanc에 복원**: 「81 image files (+ 8 set aside in replaced)」·「Uploaded: 81 new」 → 복원된 서버 = 디스크 = 원래 서버. **옛 번호의 검사가 되살아나지 않음.**
  - **옛 디스크**(바로잡기 전의 사본)를 빈 Orthanc에 복원(EMR에 물을 수 있음): 경고 「8 image(s) … only under their OLD study number … uploaded as they are」, 81장 올림, 디스크에서 치운 것 0 → 이어서 새 디스크를 같은 Orthanc에 복원: 새 8장 올림 → 「Removed from Orthanc 8 image(s)…」 → 89 → 81, 서버와 같음.
  - 되옮긴 뒤(옮기기·맞바꾸기를 한 번씩 더) 백업: 다시 「copied=8」·「set aside 8」, `replaced` 16, 디스크 = 서버. `-Verify`: VERIFIED.
  - EMR 주소를 닿지 않는 곳으로: 「could not ask the EMR which images were put under another order; nothing set aside this run」, 「finished: ok=True」, exit 0.
  - `superseded-images`: 토큰 없이 401. 목록의 쌍이 서버에 하나도 없고(백업의 물음), 서버의 쌍이 목록에 하나도 없음(디스크 = 서버로 확인).
  - device-watch(ko): 옮기기 → 「영상 3장 — EMR에서 다른 오더로 옮긴 영상(장비가 보낸 것이 아님) · 환자번호 … · 검사번호 261001-68 / ↳ EMR 오더와 연결됨 … / ↳ 환자번호 맞음 / ↳ EMR에 기록됨」, 맞바꾸기 → 두 줄(임시 검사는 안 나옴).
  - 네 스크립트 모두 PowerShell 파서 오류 0.
- **찾아서 고친 것**: 복원의 「Orthanc에서 지우기」가 처음에 아무것도 못 지움 — Windows PowerShell이 JSON 배열을 한 덩어리로 넘겨 `@(Invoke-RestMethod …)`가 「목록 하나짜리 목록」이 됨. 변수에 먼저 받게 고침(주석을 남김).
- **확인 못 한 것**: 진짜 USB 디스크·예약 작업(이 PC에는 등록하지 않음). `.sh` 쪽(영상 백업은 Windows 스크립트뿐). 큰 디스크에서 짝 찾기의 시간(목록이 비면 아무 일도 안 함 — 목록이 있을 때만 검사 폴더들을 훑음). fr·en의 device-watch 줄(ko만 봄). 손으로 넣은 줄(`all`)의 실제 동작(코드: 밤 백업은 Orthanc에 물어 처리, 복원은 건드리지 않고 한 줄 알림).
- **총괄이 손으로 옮긴 건(실행 중 EMR의 오더 15 → 18)**: 옮긴 기록 표에 없어서 백업이 모릅니다. 그때 영상 번호(SOP)를 새로 만들었으므로 「같은 영상 번호의 짝」으로는 못 찾습니다. 넣는다면 한 줄(값은 실행 중 DB에서):
  `INSERT INTO pacs_study_move (kind, state, step, patient_id, from_order_item_id, to_order_item_id, from_order_name, to_order_name, from_accession, to_accession, image_count, reading_moved, reason, detail, superseded, staff_name, finished_at) VALUES ('move', 'done', 5, <환자>, 15, 18, '<오더 15 이름>', '<오더 18 이름>', '<accession 15>', '<accession 18>', 2, true, 'moved by hand before the feature existed', '{"old_study_uid":"<오더 15의 검사 번호>","new_study_uid":"<오더 18의 검사 번호>","source_sops":[]}', '[{"study_uid":"<오더 15의 검사 번호>","instances":[],"replaced_by":"<오더 18의 검사 번호>"}]', '<이름>', NOW());`
  영상 번호가 비어 있으면 「그 번호 아래 전부」(`all`)로 읽혀, 밤 백업이 Orthanc에 없는 파일만 치웁니다(오더 15를 나중에 다시 찍어 같은 번호로 새 영상이 와도 그것은 Orthanc에 있으므로 남음). 그 영상이 아직 한 번도 백업되지 않았다면 넣을 필요가 없습니다. 화면의 옮긴 기록에도 한 줄 보이게 됩니다.
- **올릴 때**: EMR(마이그레이션 801 포함)과 PACS 폴더(스크립트 넷 + README)를 함께. PACS 컨테이너는 다시 만들 필요 없음(브리지·compose 안 바뀜). 예약 작업은 같은 `image-backup.ps1`을 부르므로 다시 등록할 필요 없음. USB 묶음에는 PACS 폴더가 들어가므로 판이 올라갑니다.
- **다른 세션에 부탁**: 없음(①②에 적은 설정·진료 몫 그대로).

## 2026-10-01 — 영상을 다른 오더로 옮기기 ② 맞바꾸기 · 화면

- **상태**: 확인 요청 (**다음**: ③ PACS 저장소 — 영상 백업·복원의 `replaced`, device-watch, README)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (① `b9027e4` 위). **PACS 저장소** — 없음(③에서)
- **한 일**:
  1. **맞바꾸기**(`pacs.move.js`): 받을 오더에도 영상이 있으면 `POST /pacs/move`가 스스로 맞바꿈(`kind: swap`). 임시 번호를 거치는 일곱 단계(모듈 위키 4절) — A를 지우기 전에 실패하면 되돌리고, 그 뒤에는 앞으로만. 판독도 맞바뀜. 그동안 두 오더는 영상 창·비교·되찾기·브리지에서 빠짐.
  2. **화면**(새 파일 `frontend/src/components/MoveStudy.jsx`): 영상/판독 창 상세의 **Images 줄**에 「⇄ Corriger la demande… / 다른 오더로 옮기기…」(영상이 있고 취소가 아닌 검사, 진료 화면에서만). 창: 지금 오더 + 「🖼 Voir image」 → 같은 환자의 영상 오더 목록(→ 옮기기 / ⇄ 맞바꾸기 / 못 고르는 이유) → 사유(필수) → 일어날 일 한 문단 → 단추. 끝나면 목록을 다시 읽음. 발행된 판독 보고서가 있으면 번호·날짜와 경고.
  3. `RadiologyReadings.jsx`: 단추, 두 오더의 상세에 **옮긴 기록 줄**(최근 둘), 목록 다시 읽기.
  4. `pacs.routes.js`: 맞바꾸는 중인 두 오더는 영상이 있어도 영상 창을 열지 않음 / 비교 허락 목록에서 빠짐. `pacs.relink.js`: 바로잡는 중인 오더는 되찾기가 보지 않음. `pacs.exam.js`에 그 SQL 조각(`OPEN_ON`).
  5. **`Consultation.jsx` 두 군데**(아래 공용 파일).
- **바꾼 파일**: `backend/src/routes/pacs.move.js`, `pacs.routes.js`, `pacs.relink.js`, `pacs.exam.js`, `frontend/src/components/MoveStudy.jsx`(새), `frontend/src/components/RadiologyReadings.jsx`, `frontend/src/pages/Consultation.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/modules/pacs.md`(2.4.2 새 절·4절·P-33·8절), `wiki/manual-fr/pacs.md`(10절 새로·메시지 표 한 줄·«À ne pas faire»), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/reference/study-reassign-design.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 (진료 세션에 알려 주세요)**: `frontend/src/pages/Consultation.jsx` — 두 군데, 한 줄씩: ① `setViewer({… no_study:!!r.no_study,` 뒤에 `correcting:!!r.correction_in_progress,` ② 영상 창의 「보여 줄 것이 없음」 글이 `viewer.correcting`이면 `t.px_mvViewerBusy`. 다른 것은 안 건드림.
- **DB 마이그레이션**: 없음(①의 801 그대로 — 표를 안 바꿈).
- **번역 키** (px_ 구역, 새 키 46개 × ko/en/fr): `px_mvButton` · `px_mvTitle` · `px_mvIntro` · `px_mvFrom` · `px_mvLook` · `px_mvPick` · `px_mvNone` · `px_mvKindMove` · `px_mvKindSwap` · `px_mvReason` · `px_mvReasonPh` · `px_mvConfirmMove` · `px_mvConfirmSwap` · `px_mvReadingGoes` · `px_mvReadingsSwap` · `px_mvBackToList` · `px_mvLogged` · `px_mvGoMove` · `px_mvGoSwap` · `px_mvNeed` · `px_mvBusyNow` · `px_mvDone` · `px_mvDoneLater` · `px_mvCheckList` · `px_mvIssued` · `px_mvLogMove` · `px_mvLogSwap` · `px_mvLogPending` · `px_mvViewerBusy` · `px_mvErr_<CODE>` 17개(서버의 `code`마다). 글을 바꾼 기존 키 없음.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 가짜 환자 5):
  - **맞바꾸기 정상**: Upper Abdomen US(3장·판독) ↔ Prostate US(2장·판독): 200 `done`, **0.39초**. 두 번호 아래의 그림이 서로 바뀜(해시), 영상 번호 그대로, accession·이름·요청 태그가 각 오더의 것, 임시 검사 0건, EMR의 장수·도착 시각·판독이 서로 바뀜, 변경 기록 한 줄, 두 오더 모두 Stone으로 열림.
  - **맞바꾸기 실패 다섯** (시험용 중계로 고장): 첫 사본 500 → `rolled-back` / 둘째 사본 500(A는 이미 지워짐) → 답 200 `cleanup-pending` · EMR 그대로 · 두 오더 영상 창 닫힘 · 그동안 다른 바로잡기는 `BUSY` → resume → `done` / 가운데 삭제 500 → 대기 → resume → `done` / 둘째 사본 뒤 영상 서버 무응답 + **EMR 서버 다시 시작** → 스스로 `done` / EMR 기록 실패(DB 오류 주입) → 대기(step 6) → resume → `done`(변경 기록의 사람은 처음 누른 사람). **매 단계 두 검사의 그림이 온전한 검사 안에 있음**(해시).
  - **화면**(1366×768, fr): 옮기기 — 검사 68을 고르고 단추 → 창(목록 9줄: 「⇄ échanger avec celle-ci」·「→ déplacer ici」·「autre type d'appareil」) → Carotid US 선택 → 사유 → 확인 글 「Les 3 image(s) passent de « … » à « Carotid US ». « … » redevient en attente et réapparaît sur la liste de l'appareil. La correction est notée dans le journal des modifications.」 → 「✓ C'est fait : les images sont sous la bonne demande.」, 뒤 목록이 바뀜(68 en attente / 63 3 image(s)), 두 오더 상세에 기록 줄. **ko**: 맞바꾸기 — 「⇄ 다른 오더로 옮기기…」 → 「⇄ 이 오더와 맞바꾸기」 → 「「Upper Abdomen US」(영상 2장)와 「Prostate US」(영상 3장)의 영상이 서로 바뀝니다. 판독도 영상과 함께 서로 바뀝니다. …」 → 「✓ 끝났습니다…」, 기록 줄 「… 영상을 맞바꿈 — 사유: …」.
  - **바로잡는 중**(원본 삭제를 실패시켜 대기 상태로 둠): 원래 오더의 기록 줄 끝에 「— correction en cours, elle se termine toute seule」, 그 오더에는 단추 없음(영상 없음), 영상 창에 「Les images de cette demande sont en cours de correction…」. resume 뒤 `done`.
  - **끝난 뒤 일관성**: 바로잡기 21건(옮기기 12 · 맞바꾸기 9, 그중 되돌린 것 6) 뒤 — 열린 줄 0, `failed` 0, 임시·잘못된 검사 0, 일곱 오더 모두 「EMR의 장수 = 영상 서버의 그 번호 아래 장수, accession·이름 일치」.
  - **회귀**: 중계 15/15, 비교 32/32, 체크 비교 23/23. ①의 「미리 막는 것」 가운데 `SWAP_LATER`는 없어짐(이제 맞바꿈).
- **확인 못 한 것**: en 화면. 밝은 테마. 수납 화면에 단추가 없는 것(코드: `props.onOpen`이 없으면 안 그림 — 수납은 그 prop을 안 줌). 「La correction est enregistrée…」(대기 답)을 **창에서** 보는 것(답의 상태는 API로). 받을 오더의 영상에 환자 번호 경고가 있을 때의 `IDENTITY`(코드만). 큰 검사. 진짜 장비.
- **알아 둘 것**: 영상 백업 디스크의 옛 파일 — ③ 전까지 그대로(①에 적은 것과 같음). 맞바꾸기의 `superseded`에는 임시 번호도 들어 있음(백업이 그 사이에 돌았을 경우를 위해).
- **다른 세션에 부탁**: 진료 — 위 `Consultation.jsx` 두 줄. 설정 — 변경 기록의 `pacs.study.move` 칸 이름에 `readings_exchanged` 추가(①에서 부탁한 것에 더해).

## 2026-10-01 — 영상을 다른 오더로 옮기기 ① 서버(옮기기) + 실패 시험

- **상태**: 확인 요청 (① 서버 — 영상 없는 오더로 옮기기. **다음**: ② 맞바꾸기 · 화면 ③ PACS 저장소)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `716121a`를 ff로 당긴 뒤). **PACS 저장소** — 없음(③에서)
- **결정 받아 적음**(설계 메모 맨 위): 실장님 — EMR 단추로 짓기, **의사와 관리자**(사유 필수), **판독은 영상과 함께**. 총괄 — Q3~Q8은 메모의 추천안, 시리즈·영상 번호 그대로, `pacs.move.js`, `pacs.study.move`, 세션 번호 마이그레이션.
- **한 일**:
  1. **`backend/src/routes/pacs.move.js`**(새) — 길 넷: `GET /api/pacs/move-targets?order_item_id=` · `POST /api/pacs/move` · `GET /api/pacs/moves/patient/:id` · `POST /api/pacs/move/resume`. 권한 `consultation` 또는 `settings`. 순서·되돌림·이어 가기·고치는 태그·미리 막는 것은 모듈 위키 4절 「영상을 다른 오더로 옮기기 — 서버」.
  2. **마이그레이션 `801_pacs_study_move.sql`**(세션 번호 — 다시 매겨 주세요): 표 `pacs_study_move` 하나(+색인 둘). `IF NOT EXISTS`, 다른 표는 안 건드림.
  3. **`pacs.routes.js`**: ① 피드가 끝나지 않은 바로잡기의 오더를 뺌 ② `/study-arrived`가 그런 오더의 보고를 409로 ③ `viewer-url`이 그런 오더(EMR에 영상 없음)의 주소를 안 줌 + `correction_in_progress` ④ `isExam`을 새 파일 **`pacs.exam.js`**로(같은 뜻, 두 파일이 가져다 씀) ⑤ `pacs.move.js`의 길을 붙임.
  4. **`utils/audit.js`**: `PACS_STUDY_MOVE: 'pacs.study.move'` 한 줄(+주석).
- **Keep 확인(총괄의 물음)**: 검사 번호를 **새 값으로 넣으면서** `Keep: [SeriesInstanceUID, SOPInstanceUID]` + `KeepSource: true` + `Force` — **400이 나지 않습니다**(`OverwriteInstances` false 그대로). 400은 Study까지 셋을 모두 지킬 때만. 원본과 새 검사가 같은 영상 번호로 나란히 있고(Orthanc 안의 id는 다름), 새 영상에 `ModifiedFrom`이 붙음. 그래서 **메모의 추천대로 Keep**.
- **총괄의 한 번 쓰는 스크립트와 다르게 한 것**: ① 시리즈·영상 번호 유지 ② `StudyDescription`을 늘 오더 이름으로 바꾸지 않고, **영상이 잘못 고른 오더의 이름을 달고 있을 때만**(장비가 자기 말로 적은 이름은 둠) — 요청 태그(`RequestedProcedure…`, `RequestAttributesSequence`)도 같은 규칙으로 함께 고침 ③ **받을 오더에 판독이 있고 옮길 판독도 있으면 막음**(`TARGET_HAS_READING`) — 스크립트는 덮어썼음. 옮길 판독이 없으면 받을 오더의 판독은 그대로 ④ 원본 삭제 전에 새 검사가 여전히 온전한지 다시 봄.
- **제가 정한 것(다르게 하시려면 말씀해 주세요)**: 위 ②의 규칙을 「모든 영상이 그 값일 때만」에서 **「그 값을 가진 영상이 하나라도 있고 다른 값을 가진 영상이 없을 때」**로 — Orthanc는 고친 태그를 검사의 모든 영상에 쓰므로, 일부 영상에만 요청 태그가 있는 검사에서 잘못된 번호가 남는 것보다 없던 영상에 맞는 값이 들어가는 편이 낫다고 봄(실장님 원칙 「자료가 맞아야」). / 위 ③.
- **바꾼 파일**: `backend/src/routes/pacs.move.js`(새), `backend/src/routes/pacs.exam.js`(새), `backend/sql/801_pacs_study_move.sql`(새), `backend/src/routes/pacs.routes.js`, `backend/src/utils/audit.js`, `wiki/modules/pacs.md`(4절·DB 표·P-33·8절), `wiki/reference/study-reassign-design.md`(맨 위), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `backend/src/utils/audit.js` — `ACTIONS`에 한 줄.
- **DB 마이그레이션**: `801_pacs_study_move.sql` (새 표 하나).
- **번역 키**: 없음(화면은 ②에서).
- **확인한 방법** (격리 EMR 9188 + PACS 9198 + 장비 흉내; 가짜 환자 5, 초음파 오더 여럿. 장비 흉내가 워크리스트의 요청 태그를 영상에 베끼게 함):
  - **정상**: Carotid US(영상 3장·2시리즈·판독 있음) → Upper Abdomen US: 200 `done`, **0.19초**. 영상 서버 — 원본 없음, 새 검사 accession·이름·요청 태그가 Upper Abdomen의 것, **영상 번호·시리즈 번호 그대로, 그림 3장 해시 같음**, `SeriesDescription`·`BodyPartExamined`·환자·날짜 그대로. EMR — 받은 오더 `completed`·3장·`match`·**도착 시각 원래대로**·판독 옮겨짐 / 원래 오더 `scheduled`·영상 없음·판독 없음·**피드와 장비 목록에 다시 나옴**. 옮긴 기록 줄 `done`, `superseded`에 옛 검사 번호와 영상 번호 3개. 변경 기록 한 줄(누가·환자·「3 image(s): Carotid US (…-63) -> Upper Abdomen US (…-62)」·사유). 영상 창: 받은 오더 Stone, 원래 오더 「아직 오지 않았습니다」.
  - **다시 찍기**: 장비 흉내가 원래 오더(같은 번호)로 다시 보냄 → 브리지 「study arrived … found by uid」 → 보통처럼 완료.
  - **미리 막는 것 17가지**(수납 계정 403 둘 포함) 모두 기대한 `code` — 그 뒤 옮긴 기록 줄 수와 영상 서버의 검사 수가 그대로.
  - **일부 영상에만 요청 태그가 있는 검사**: 세 장 모두 이름·요청 번호가 받을 오더의 것으로, 시퀀스가 없던 두 장은 없는 채로, 그림 같음.
  - **되옮기기**: 바로 하면 `STILL_ARRIVING`, 1분 뒤 200 — 원래 자리로, 그림·영상 번호 처음과 같음.
  - **같은 요청 둘을 동시에**: 하나 `done`, 하나 `BUSY`. 검사 하나, 3장.
  - **실패 여섯 가지 + 다시 시작 둘**: 모듈 위키 4절의 마지막 줄 그대로 — 모든 경우 원본 3장의 해시가 처음과 같음. `cleanup-pending` 동안 80초 기다려도 브리지가 원본을 다시 붙이지 않음. 서버 다시 시작 20초 뒤 로그 「[pacs move] line 7 done」.
  - **되찾기와**: 옮긴 뒤 그 환자의 여섯 오더를 열어도 `pacs.study.relink` 0줄. **회귀**: 중계 15/15, 비교 32/32, 체크 비교 23/23.
- **확인 못 한 것**:
  - 진짜 장비가 영상에 무엇을 베끼는지(설치 날 device-watch로).
  - 큰 검사(수백 장)의 시간. 화면의 요청이 nginx에서 먼저 끊기는 경우(서버는 끝까지 함 — 화면은 ②에서 옮긴 기록을 다시 읽게).
  - 그림 없는 자료(SR)가 섞인 검사(코드는 「그림을 같은 방식으로 못 읽으면 같은 것으로」).
  - `failed` 상태(일으키지 못함).
  - 설정 권한만 있고 진료 권한이 없는 계정(시험 계정에 없음 — 관리자 계정은 둘 다 가짐).
  - 다섯 분 타이머 자체(시작 때 한 번과 `resume` 길로 같은 함수를 확인).
- **알아 둘 것**:
  - **영상 백업 디스크에는 옛 번호의 파일이 남습니다** — ③(PACS 저장소의 `replaced` 처리) 전에 실행 중 EMR에서 옮기면, 그 뒤 디스크로 복원할 때 옛 검사가 되살아납니다(총괄이 손으로 옮긴 오더 15 → 18도 같은 처지 — ③에서 그 건도 목록에 넣을 길을 생각하겠습니다).
  - 변경 기록의 전 값에 `reason: null` 같은 빈 칸이 같이 적힘(공용 `writeAudit`가 뒤에만 있는 칸을 그렇게 적음) — 화면에서는 「— → 값」.
- **다른 세션에 부탁**: **설정** — 변경 기록 화면에 `pacs.study.move`의 글과 칸 이름(`order_name`·`accession_no`는 이미 있음, `image_count`·`reading_moved`·`reason`(있음)), `wiki/03-change-log.md` 한 줄.

## 2026-10-01 — 판독 보고서: 검사 칸에 검사 이름만 — 서식 파일 정리 · 견본 그림 · 문서

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `b8f3f30`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: 총괄이 `imaging-report.jsx`에서 검사 칸의 둘째 줄(«Demandé par : … — N image(s)»)을 뺀 뒤(실장님, `b8f3f30`)의 정리.
  1. `frontend/src/documents/imaging-report.jsx` — 안 쓰게 된 이름표 `T.orderedBy`·`T.images`, 변수 `who`·`colon`·`small`을 지움. 머리 주석: 종이에 찍히는 값은 `exam_name`·`exam_date`·`reading`·`read_by`·`read_at`; `modality`·`image_count`·`dept`·`ordered_by`는 목록이 여전히 넘기고 **발행 기록(document_log의 payload)에만 남음**. 모양은 안 바뀜(총괄이 뺀 그대로).
  2. `RadiologyReadings.jsx` — `reportValues` 주석 한 줄(같은 뜻). 값은 그대로 넘김: 발행 기록에 「어느 과·누가 낸 검사, 영상 몇 장」이 남는 편이 나음 — 빼기를 원하시면 네 칸만 지우면 됨.
  3. **견본 그림 둘**을 다시 뽑음(가짜 환자 그대로, 같은 방법): 검사 칸에 「Chest PA」만.
  4. 프랑스어 설명서 9절 2번(«le nom de l'examen»), 모듈 위키 2.4.1(2번·실장님 결정 줄 — 무엇을 차례로 뺐는지)·8절.
- **바꾼 파일**: `frontend/src/documents/imaging-report.jsx`, `frontend/src/components/RadiologyReadings.jsx`(주석만), `wiki/reference/design/imaging-report-sample-fr.png`, `wiki/reference/design/imaging-report-sample-long-name-fr.png`, `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인한 방법** (격리 EMR 9188): 빌드 뒤 두 검사를 「Émettre et imprimer」 → 인쇄 창의 내용에 `Demandé par`·`image(s)`·`(CR)`·`D26-`·`N° document` 0건, 미리보기 「Examen / Chest PA / Compte-rendu」. PDF 한 쪽씩. 두 그림을 눈으로: 검사 칸에 이름만, 나머지는 전과 같음(긴 이름·긴 병원 이름·긴 의사 이름 잘림 없음).
- **확인 못 한 것**: en·ko 종이. 긴 판독(여러 쪽) — 둘째 줄이 빠져 첫 쪽이 한 줄만큼 더 들어감, 다시 재지 않음. 진짜 프린터.
- **알아 둘 것**: 검사 칸의 높이(최소 40pt)는 그대로라 이름 한 줄 아래에 빈 자리가 조금 있음(견본 그림 참고) — 줄이려면 한 값.
- **다른 세션에 부탁**: 없음

## 2026-10-01 — 판독 보고서: 견본 그림 둘을 지금 서식으로 다시 뽑음 · 설명서를 맞춤 (문서만) · 검사 날짜에 대한 답

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `2e17872`를 ff로 당긴 뒤 — 마이그레이션 041 포함). 문서·그림만. **PACS 저장소** — 없음
- **한 일**:
  1. **견본 그림 둘**을 지금 서식으로 다시 뽑음 — `wiki/reference/design/imaging-report-sample-fr.png`(가짜 환자 RAKOTO Jean, Chest PA, 영상 2장), `…-sample-long-name-fr.png`(가짜 환자의 긴 이름 · 긴 병원 이름 · 긴 의사 이름). 둘 다 **검사 이름 옆 종류 코드 없음**(총괄 `2e17872`), **서류 번호 없음**(맨 아래 «Émis le 2026-10-01 13:53»만). 격리 EMR에서 「🖨 Émettre et imprimer」가 인쇄 창에 쓰는 HTML을 그대로 받아 → Chrome으로 PDF → 그림(909×1287, 전과 같은 크기). 받은 HTML에 `D26-`·`N° document`·`(CR)` 0건. 긴 이름 견본을 위해 격리 DB의 병원·의사 이름을 잠깐 길게 바꿨다가 되돌림.
  2. **글**: 프랑스어 설명서 9절 2번(«le nom de l'examen (sans le code du type d'appareil ; en petit, qui l'a demandé et le nombre d'images)»), 모듈 위키 2.4.1 2번(검사 이름만 — 종류 코드 없음, 실장님 말씀; 맨 아래는 발행 일시만), 4절·P-32에서 「(AS)」를 말하던 두 곳, 8절. (설명서 9절과 2.4.1에는 「(CR)」이라는 글자가 원래 없었음 — 종이를 설명하는 문장만 맞춤.)
- **바꾼 파일**: `wiki/reference/design/imaging-report-sample-fr.png`, `wiki/reference/design/imaging-report-sample-long-name-fr.png`, `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음. (`RadiologyReadings.jsx`의 `reportValues`는 `modality`를 아직 넘기지만 서식이 안 씀 — 그대로 둠.)
- **확인한 방법**: 위 두 그림을 눈으로(제목·날짜·환자 칸·Examen 「Chest PA」·둘째 줄·Compte-rendu·맨 아래 병원·판독의·서명 줄·«Émis le …»·쪽 번호 1 / 1). 긴 이름: 이름 네 줄·병원 이름 두 줄·의사 이름 두 줄, 잘림 없음(전과 같은 모습).
- **확인 못 한 것**: en·ko 견본(그림은 fr만 둠 — 전과 같음). 진짜 프린터.
- **보고서 머리의 날짜에 대한 답 (짓지 않음 — 일의 양만)**:
  - 지금: `reportValues`가 **영상이 EMR에 도착했다고 적힌 날**(`worklist_log.images_received_at`)을 쓰고, 영상 없이 판독만 있으면 내원일. 그래서 09-28에 낸 오더의 영상이 10-01에 들어오면 10-01. 실제 진료에서는 찍은 날 = 도착한 날이라 맞지만, 장비가 며칠 뒤에 몰아서 보내거나 영상 복원 뒤에는 어긋날 수 있음.
  - **값싸게 됩니다 — 작은 일.** 브리지가 도착을 알릴 때 이미 Orthanc에서 받은 답(`/tools/find` Expand)에 `MainDicomTags.StudyDate`가 들어 있어 **Orthanc에 더 물을 것이 없음**.
    1. PACS 저장소 `bridge.py`: `/study-arrived`에 `study_date` 한 줄(브리지 이미지 다시 빌드 — 올릴 때 브리지 컨테이너가 다시 뜸. USB 묶음 판).
    2. EMR: 마이그레이션 8xx 하나(`worklist_log.image_study_date DATE`), `/study-arrived`가 `YYYYMMDD`일 때만 저장(3줄), `readings/patient`가 내주고(1줄), `reportValues`가 「영상의 날짜 → 도착한 날 → 내원일」 순으로(1줄), 되찾기(`pacs.relink.js`)도 같이 채움(2줄).
    3. 섞여도 됨: 옛 브리지 + 새 EMR → 칸이 비어 지금처럼 도착한 날 / 새 브리지 + 옛 EMR → 모르는 칸은 무시.
    4. 이미 도착한 검사는 칸이 비어 있음 → 지금처럼 도착한 날(원하면 영상 창을 열 때 되찾기의 한 번의 물음이 가져오는 답으로 채울 수 있음 — 몇 줄).
    5. 시험: 장비 흉내가 이미 `STUDY_DATE`로 날짜를 정할 수 있어 격리에서 바로(다른 날짜·빈 날짜·형식이 틀린 날짜).
  - **조심할 것**: 장비의 시계가 틀리면 그 날짜가 종이에 찍힘(지금은 EMR 서버의 날짜라 그럴 일이 없음). 영상에 StudyDate가 비어 있는 장비는 도착한 날로 떨어짐. 목록의 Date 칸(내원일)은 그대로 둘지 같이 정해야 함.
- **다른 세션에 부탁**: 없음

## 2026-10-01 — 순서서: Modality를 직접 입력하는 곳 · 판독 보고서의 「(AS)」「(ES)」 확인 (문서만)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `24e5003`을 ff로 당긴 뒤). 문서만. **PACS 저장소** — 없음
- **한 일**:
  1. `wiki/reference/device-connection-onsite.md` — 「→ 0명 — 장비가 CR 검사만 물음」 줄과 「EMR 쪽 설정」 줄이 **Paramètres → Codes d'actes → Modalité → « Autre — saisir la valeur… »**(설정 → 오더 코드 → 장비 (Modality) → 기타 — 직접 입력…)를 가리키게. 화면의 글자는 `fr.js`·`ko.js`의 `se_tabOrderCodes`·`se_fModality`·`se_modOther` 그대로. 시술 종류 오더 코드도 된다는 한 문장.
  2. 판독 보고서 확인(격리, 미리보기): 시술 종류 **AS** — 「Rectoscopie (acte) (AS) / Demandé par : GEN · RABE Hery — 2 image(s)」(앞 항목), 시술 종류 **ES** — 「Gastroscopy (GFS) (ES) / … — 2 image(s)」(이번, 수납 계정의 목록에서). 둘 다 컬러(RGB, VL Endoscopic) 영상 2장 — 장수가 맞음.
- **바꾼 파일**: `wiki/reference/device-connection-onsite.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인 못 한 것**: 설정 화면에서 「Autre — saisir la valeur…」를 직접 눌러 보는 것(설정 세션의 것 — 글자만 번역 파일에서 확인). ko·en 판독 보고서의 AS·ES(같은 칸).
- **알림**: `isExam`의 뜻은 `bfd8804`(총괄이 `24e5003`으로 합침)에서 「imaging 또는 영상 종류가 있는 오더」 — 진료 화면의 🖼 조건과 같음.
- **다른 세션에 부탁**: 없음

## 2026-10-01 — 「영상 검사」의 뜻을 한 곳에서: 종류가 imaging 또는 영상 종류가 있는 오더 (시술 + AS·ES)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `e9a75df`를 ff로 당긴 뒤 — 마이그레이션 040 포함). **PACS 저장소** — 없음
- **앞 커밋과의 관계**: 총괄이 실행 중 EMR에서 AS 오더로 찾은 빈틈(시술 + Modality 오더가 목록에 없고 판독 저장이 안 됨)은 앞 커밋 `0ff275e`에서 이미 고친 것과 같은 것(서로 엇갈림). 그때는 뜻을 「imaging **또는 워크리스트로 간 오더**」로 했는데, 총괄의 말대로 **「imaging 또는 영상 종류(`pacs_modality`)가 있는 오더」**로 바꿈 — 진료 화면이 🖼 단추를 주는 조건과 글자 그대로 같은 뜻. 다른 점은 하나: 영상 종류는 있는데 워크리스트를 끈 오더 코드의 오더도 이제 목록에 나오고 판독을 쓸 수 있음(🖼 단추가 있으므로).
- **한 일**: `pacs.routes.js`의 `isExam` 한 줄(과 주석). 쓰는 곳 — 목록(`GET /readings/patient`: 진료·수납 화면 공통), 판독 저장(`PUT /reading` 두 물음), 체크 비교(`pickedOrders`). 「비교에 허락할 다른 검사」·「accession으로 되찾기」는 영상이 도착한 `worklist_log` 줄을 보므로 종류를 묻지 않음. 판독 보고서 인쇄·영상 창의 판독 칸은 목록의 줄·`viewer-url`에서 오므로 따로 고칠 것 없음. **`Consultation.jsx`·`Payment.jsx`는 안 고침**(이미 맞음: 🖼 조건 `code_type==='imaging'||pacs_modality`, 영상 창의 판독 칸은 연 오더가 무엇이든 나옴, 수납은 같은 부품).
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `wiki/modules/pacs.md`(4절 「무엇이 영상 검사인가」·DB 표·P-32·8절), `wiki/manual-fr/pacs.md`(6절 한 문장), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인한 방법** (격리 EMR 9188 + PACS 9198 + 장비 흉내, 가짜 환자만. 마이그레이션 040이 격리 DB에 적용됨 — 세 칸 16자):
  - 오더 코드 둘을 설정 API로: `RT1` Rectoscopie (acte) — **procedure · AS · 워크리스트 켬**, `RT2` Anuscopie — procedure · AS · **워크리스트 끔**. 환자 1에 오더(60, 61).
  - 장비 흉내: **Modality=AS로 물으면 60 한 줄만**, ES로 물으면 0. 컬러 2장(VL Endoscopic Image, RGB, Modality AS) C-STORE → 브리지 도착 보고 → EMR `completed`·2장·`match`.
  - **목록**(`readings/patient/1`, 의사·수납 계정 모두 35줄): `AS | Anuscopie (acte, sans worklist) | —`, `AS | Rectoscopie (acte) | 2 image(s)`, `AS | Rectoscopie | 3 image(s)`, `ES | Gastroscopy (GFS) | 2 image(s)`.
  - **판독 저장**: 60 → 200, 61(워크리스트 없음) → 200, 검사실 오더 → 404(전과 같음). 화면에서도: 영상 창의 판독 칸에 한 문장 더 쓰고 Enregistrer → 「Compte-rendu enregistré ✓」.
  - **비교**: 57(AS, imaging)을 열면 비교 목록 맨 앞에 `Rectoscopie (acte)`·`Gastroscopy (GFS)`. 체크 비교 60+57+54 → 200, 가장 최근(60)이 열림. 60+61(영상 없음) → 409(전과 같은 규칙).
  - **영상 창**: 60을 열면 Stone에 **컬러 그림**(2장 한 묶음), 오른쪽 판독 칸·저장 단추.
  - **판독 보고서**: 60의 미리보기 — 「Examen / **Rectoscopie (acte) (AS)** / Demandé par : GEN · RABE Hery — 2 image(s)」, 발행 → 「Émis : D26-00033」(인쇄 창은 시험에서 가로챔). ES는 같은 자리(`pacs_modality` 그대로 — 보지는 않음).
  - **수납 화면**(시험용 수납 계정으로 로그인): 🩻 Imagerie → 같은 35줄, 종류 고르기 「Type : tous · AS · US · CR · ES」, 체크 칸 0개, 단추는 「🖨 Imprimer」뿐(Voir image·Comparer 없음) — 지난번에 「코드로만 봄」이라고 적었던 수납 화면의 윗줄도 이번에 눈으로 봄.
  - **회귀**: 중계 15/15, 비교 32/32, 체크 비교 23/23.
- **확인 못 한 것**: ES 오더의 판독 보고서 종이(AS만 봄). 설정 화면에서 Modality를 손으로 입력하는 것(API로 넣음). 진짜 장비. ko·en 화면.
- **다른 세션에 부탁**: (앞 항목과 같음) 진료 — 영상이 온 시술 종류 오더는 `cancellable(o)`이 `lab`·`imaging`만이라 지울 수도 취소할 수도 없음. 설정 — 변경 기록의 `pacs.study.relink` 글.

## 2026-10-01 — 끝난 오더의 영상을 accession으로 되찾기 · Modality 「AS」 확인 · 시술 종류 오더(내시경)가 걸리던 세 곳

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `935e99c`를 ff로 당긴 뒤). **PACS 저장소** — 없음(`main` `b4ba4a3` 그대로)
- **결정 받아 적음**: 영상 바로잡기(잘못 고른 오더로 찍힌 영상) — **2026-10-01 실장님 「일단 패스」**. (가)·(나) 짓지 않음. 설계 메모 맨 위에 한 줄. `OverwriteInstances`는 켜지 않음.
- **한 일**:
  1. **영상을 accession으로 되찾기** (새 파일 `backend/src/routes/pacs.relink.js`, `GET /viewer-url`이 답을 만들기 전에 부름):
     - 그 환자의 끝난 영상 오더들(연 오더 먼저, 최근 60건까지)의 번호를 **한 번의 물음**(`/tools/find`, `StudyInstanceUID` 목록)으로 영상 서버에 묻고, **없는 것만** accession으로 다시 찾음.
     - 조건은 브리지와 같음: 그 accession의 검사가 **정확히 하나**이고 Orthanc가 **안정됨**이라고 할 때만(고친 뒤 1분쯤). 둘 이상이면 잇지 않음.
     - **환자 번호 대조를 다시**(`patientCheck` — `/study-arrived`와 같은 함수로 묶음). 다르면 `mismatch` → 경고, 비교 목록에서 빠짐.
     - 고치는 것은 `worklist_log`의 `image_study_uid`·`orthanc_study_id`·`image_count`·`image_patient_id`·`image_patient_name`·`patient_check`뿐(워크리스트가 준 `study_instance_uid`는 남음). **영상 서버에는 아무것도 쓰지 않음.**
     - 흔적: **변경 기록** 한 줄(동작 `pacs.study.relink`, 그 환자, 요약 「accession - 검사 이름」, 전→후 `study_uid`·`image_count`·`image_patient_id`·`patient_check` 중 달라진 것) + 서버 로그 한 줄. 사람 칸은 그 영상 창을 연 사람.
     - 영상 서버에 물을 수 없거나 오류가 나면 아무것도 하지 않고 창은 전처럼 열림(물음마다 2초까지).
     - 그 뒤 영상 창 위에 「접수번호로 연결됨」 한 줄(`px_linkedByAccession`)이 붙음 — 글을 두 경우(장비가 번호를 새로 만듦 / 영상 서버에서 바뀜)에 다 맞게 고침.
  2. **Modality 「AS」**(실장님: 현지 직장경) — 격리에서 오더부터 화면까지 한 번: 아래 「확인한 방법」. EMR·브리지·Orthanc 어디에도 Modality 값의 목록·검사가 없음(칸 10자). **걸리는 곳 없음** — 단 3번.
  3. **찾아서 고친 것 — 종류가 `procedure`(시술)인 오더**: 기본 오더 코드의 내시경(`E1` Gastroscopy·`E2` Colonoscopy, Modality `ES`)은 종류가 `imaging`이 아니라 `procedure`. 워크리스트·영상 도착·🖼 단추까지는 됐는데 **판독 저장이 404 「Imaging order not found」**, **「영상/판독」 목록에 안 나옴**, **비교·체크 비교에서 빠짐**. 직장경 오더 코드도 시술로 만들면 같은 일. → `pacs.routes.js`에 `isExam`(종류가 imaging **또는 워크리스트로 간 오더**)을 두고 그 세 곳에 씀. 워크리스트로 가지 않은 다른 종류(검사실·진찰료)는 전과 같음(404·목록에 없음).
- **바꾼 파일**: `backend/src/routes/pacs.relink.js`(새), `backend/src/routes/pacs.routes.js`, `backend/src/routes/pacs.viewer.js`(`orthancJson`을 내보냄 — 한 줄), `backend/src/utils/audit.js`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/modules/pacs.md`(2.5·4절·7절 P-31·P-32·8절), `wiki/manual-fr/pacs.md`(6절·메시지 표·«À ne pas faire»), `wiki/reference/study-reassign-design.md`, `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/reference/device-connection-onsite.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: **`backend/src/utils/audit.js`** — `ACTIONS`에 `PACS_STUDY_RELINK: 'pacs.study.relink'` 한 줄(+주석 3줄). 다른 줄은 안 건드림.
- **DB 마이그레이션**: 없음
- **번역 키** (px_ 구역): **글을 바꾼 키** `px_linkedByAccession` — fr «Ces images ne portent pas le numéro d'étude donné par cette demande (l'appareil a mis le sien, ou il a été changé sur le serveur d'images) ; elles ont été liées à cette demande par le numéro d'accession. Vérifiez l'identité dans les images.» / ko 「영상의 번호가 이 오더가 준 번호와 다릅니다(장비가 새로 만들었거나, 영상 서버에서 바뀜). 검사 번호(Accession)로 이 오더에 연결했습니다. …」 / en 같은 뜻. 새 키 없음.
- **확인한 방법** (격리 EMR 9188 + PACS 9198 + 장비 흉내, 가짜 환자만):
  - **되찾기** (환자 3, 오더 53 Chest PA 2장): Orthanc에서 관리 화면의 기본 선택과 같은 요청(`Keep: []`, `KeepSource: false`)으로 고침 → 원본 없어짐·새 번호.
    - 바로 열면(아직 안정되지 않음): 옛 번호 그대로, 창에 「…le serveur d'images ne les a pas」, 기록 변화 없음.
    - 63초 뒤 다시 열면: **새 번호로 열림**, Stone에 그림(고친 이름 「Thorax face 2」), 창 위에 접수번호 안내 한 줄, `worklist_log.image_study_uid` = 새 번호, 변경 기록 한 줄. 또 열어도 기록은 한 줄(다시 하지 않음).
    - 같은 환자의 다른 오더(51)에서 열면 비교 주소에 53의 **새 번호**가 들어 있고 옛 번호는 없음. 체크 비교 51+53 → 200. 새 번호의 영상 자료 200, 옛 번호 403.
    - 이미 「접수번호로 연결」된 검사를 한 번 더 고쳐도 다시 되찾음(기록 둘째 줄).
  - **accession이 둘 → 안 이음** (오더 51): 새 번호로 고친 뒤 그 검사의 「사본」을 만듦 → 같은 accession 둘, 원본 없음 → 열어도 옛 번호 그대로·안내 그대로·기록 변화 없음.
  - **환자 번호가 다른 검사** (오더 42: 고치면서 환자 번호를 다른 값으로): 되찾되 `patient_check` match → **mismatch**, 목록에 「⚠ identité à vérifier」, 영상 창 `images.patient_check: mismatch`, 53의 비교 목록·쿠키에서 빠짐, 체크 비교 42+53 → 409. 변경 기록에 전→후 환자 번호·판정.
  - **영상 서버 꺼짐**: `viewer-url` 10~15ms로 답하고 창에 「Le serveur d'images ne répond pas」.
  - **빠르기**: 영상이 다 있을 때 `viewer-url` 10~15ms(전과 같은 수준 — 환자 1, 영상 30건).
  - **변경 기록 화면의 자료**: `GET /admin/audit?action=pacs.study.relink` → 3줄(module `pacs`, 사람·환자·요약·전후). 걸러 보지 않은 목록에도 나옴.
  - **AS**: 오더 코드 `RS1` Rectoscopie(종류 imaging, Modality AS, 워크리스트 켬)를 설정 API로 만들어 오더 → 피드에 `('261001-57', 'AS', 'Rectoscopie')` → 장비 흉내가 **Modality=AS로 물음 → 1명** / MR로 물음 → 0명 → 컬러 영상 3장(VL Endoscopic 2 + Secondary Capture 1, RGB) C-STORE 200 → 브리지 「study arrived … 3 instances, patient match, found by uid」 → EMR `completed`·3장·match → 화면: 「영상/판독」 목록 첫 줄 `AS | Rectoscopie | 3 image(s)`, 종류 고르기 「Type : tous · AS · US · CR · ES」, 영상 창(Stone)에 컬러 그림 두 묶음.
  - **device-watch**(-Detail, ko, 격리 컨테이너): 「장비가 목록을 물어봄 — AE: XRAY01 · 조건: Modality=AS → 1명 보냄」, 「조건: Modality=MR → 0명 — 장비가 MR 검사만 물음. 지금 목록: US 6, CR 5, AS 1, ES 1」, 영상 뒤 「영상 받음 — 3장 … ↳ EMR 오더와 연결됨: Rectoscopie … ↳ 환자번호 맞음 … ↳ EMR에 기록됨」, 끝난 뒤 다시 물으면 「→ 0명 — 장비가 AS 검사만 물음. 지금 목록: US 6, CR 5, ES 1」 — **장비가 물은 값을 보여 줌**. 끝난 뒤 Orthanc 로그 수준 `default`로 돌아옴. `device-watch.ps1`은 고치지 않음.
  - **시술 종류(오더 54 Gastroscopy, ES, procedure)**: 고치기 전 — 판독 저장 404, 목록에 없음. 고친 뒤 — 영상 2장(VL Endoscopic) 도착, 판독 저장 200, 목록에 `ES | Gastroscopy (GFS) | 2 image(s) | ✓`, 57(AS)의 비교 목록에 들어감, 체크 비교 54+57 → 200. 검사실 오더(L01)는 판독 저장 404·목록에 없음(전과 같음).
  - **회귀**: 중계 15/15, 비교 32/32, 체크 비교 23/23. (옛 중계 검사 둘은 「같은 환자의 다른 검사」를 남의 검사로 쓰고 있어 비교 기능 뒤로는 맞지 않았음 — 다른 환자의 검사로 바꿈. 「검사가 하나뿐인 환자」도 환자 4로 바꿈. 제품은 안 바뀜.)
- **확인 못 한 것**:
  - 관리 화면의 Modify 창을 **화면에서 눌러** 고친 뒤의 되찾기(같은 요청을 REST로 보냄).
  - 진짜 AS 장비·진짜 직장경 영상(형식·압축이 다를 수 있음 — device-watch가 보여 줌).
  - 설정 화면에서 Modality를 직접 입력하는 것(설정 세션이 고치는 중 — 여기서는 API로 `AS`를 넣음).
  - 변경 기록 화면(설정 → Journal)을 눈으로(자료는 API로 봄). `pacs.study.relink`의 글·칸 이름은 번역이 없어 **저장된 그대로** 나옴(설정 세션의 `settingsAudit.js`가 그렇게 하게 되어 있음).
  - 수납 화면의 목록(같은 길 `readings/patient` — 내시경 줄이 거기에도 나옴).
  - en·ko 화면의 접수번호 안내 글(fr만 눈으로).
- **알아 둘 것**:
  - 되찾은 검사는 그 뒤로 「접수번호로 연결됨」 안내가 계속 붙습니다(워크리스트가 준 번호와 영상의 번호가 다르므로 — 사실 그대로).
  - 되찾지 못한 검사(accession 둘·없음)는 같은 환자의 비교 목록(허락 목록)에 옛 번호로 남습니다 — 전과 같음. 그때 Stone 목록이 어떻게 보이는지는 보지 않았습니다.
  - 영상 서버가 **꺼진 PC**에 있어 연결 자체가 안 되면 `viewer-url`이 2초까지 늦어질 수 있습니다(같은 PC에서 컨테이너만 꺼진 경우는 즉시).
- **다른 세션에 부탁**:
  - **설정**: 변경 기록 화면에 `pacs.study.relink`의 글(`se_act_…`)과 칸 이름(`study_uid`·`image_count`·`image_patient_id`·`patient_check`) 번역, `wiki/03-change-log.md`의 동작 목록에 한 줄. module 값은 `pacs`(화면의 모듈 거르기에 PACS가 있는지). 오더 코드의 Modality를 직접 입력하게 할 때 — **종류가 시술(procedure)이어도 워크리스트로 가면 PACS 쪽은 이제 영상 검사로 다룹니다**.
  - **진료**: `Consultation.jsx`의 `cancellable(o)`이 `lab`·`imaging`만이라, 영상이 온 **시술 종류** 오더(내시경)는 지울 수도(결과 있음) 「취소」할 수도 없습니다. 영상 창의 판독 저장은 이제 됩니다.

## 2026-10-01 — Orthanc 관리 화면의 Modify를 눌러 확인 · 설계 메모를 좁힘 · 설명서 주의 (문서만)

- **상태**: 확인 요청 (영상 바로잡기는 **결정 대기** — 짓지 않음)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `9050e50`을 ff로 당긴 뒤). 문서만. **PACS 저장소** — 없음
- **★ 총괄의 답 ③을 고쳐야 합니다**: Modify 창의 **「keeping the original DICOM UIDs」는 우리 PACS에서 실패합니다** — Orthanc가 400(*"…you must have the 'OverwriteInstances' Orthanc configuration set to true"*), 창에는 「Unexpected error during modification」, 아무것도 안 바뀜. 우리 compose는 `OverwriteInstances`를 정하지 않아 기본값 false입니다. 그래서 설명서의 주의를 「keeping만 쓰라」가 아니라 **「Modify를 쓰지 말라」**로 썼습니다.
- **눌러 확인한 것** (로그인 없는 버리는 Orthanc 26.6.1을 127.0.0.1:9196에 잠깐 띄워 관리 화면의 창을 직접 누르고 보내는 요청을 받아 적음 → 같은 요청을 EMR 오더에 이어진 격리 검사(9198)에 보내 EMR을 봄):
  - 창: 고칠 수 있는 칸은 PatientID · PatientName · AccessionNumber · StudyDate · StudyDescription · StudyTime, **StudyInstanceUID는 「Auto-generated」로 잠김**(답 ④ 맞음). 고르는 것 셋 중 **기본은 「generating new DICOM UIDs」**.
  - 「keeping」(직접 누름): 요청 `Keep: [Study·Series·SOP UID], KeepSource: true` → 400, 변화 없음.
  - 「Create a modified copy」(직접 누름): `Keep: [], KeepSource: true` → 원본 그대로 + 새 번호의 사본(같은 accession의 검사가 둘). EMR 연결 그대로.
  - 「generating new UIDs」(기본): 화면이 가려져 **누르지는 못함** — 위 둘의 요청 모양에서 `KeepSource: false`로 보내 확인: 원본 없어짐, 새 번호. EMR 목록은 「2 image(s)」 그대로인데 영상보기는 「L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas」, 80초 뒤에도 그대로(브리지는 끝난 오더를 다시 찾지 않음) — 답 ② 맞음.
  - 세 경우 모두 EMR의 검사 이름은 「Chest PA」 그대로 — 답 ① 맞음.
- **설계 메모를 고침** (`wiki/reference/study-reassign-design.md`): 맨 위에 범위(같은 종류의 오더끼리만 · 급하지 않음 — 실장님 말씀), 새 0-1절 「세 안」 — (가) 전체(EMR 단추) / (나) 관리자용 스크립트(`move-study.ps1`, 화면 없음) / (다) 주의와 「accession으로 되찾기」만 — 각각의 일의 양과 위험, 새 1-1절(위 확인), Q5는 「정해짐」.
  - PACS 세션의 생각: 드문 일이므로 **(다)를 지금, (나)를 그다음**. (나)면 영상 서버의 자료가 실제로 고쳐져 실장님 원칙을 지키면서 큰 장치가 필요 없음.
- **프랑스어 설명서에 주의 한 단락** (`wiki/manual-fr/pacs.md` «À ne pas faire»): 관리자는 Orthanc의 Modify로 검사를 고치지 말 것 — 기본 선택은 EMR에서 영상을 못 찾게 하고, keeping은 이 서버에서 오류, copy는 군더더기. 검사 이름은 오더의 것. 다른 줄을 골라 찍은 영상은 손으로 고치지 말고 판독에 적고 지원에 알릴 것.
- **모듈 위키**: 7절 P-31, 8절.
- **바꾼 파일**: `wiki/reference/study-reassign-design.md`, `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인 못 한 것**: Modify 창의 기본 선택을 **화면에서 누르는 것**(브라우저 창이 가려져 창이 안 열림 — 요청을 흉내 내 확인). `OverwriteInstances`를 켰을 때 keeping이 실제로 되는지(켜지 않음).
- **뒷정리**: 버리는 Orthanc 컨테이너 삭제, 격리 검사는 원래 번호로 되돌림, 격리 스택 내림.
- **다른 세션에 부탁**: 총괄 — 세 안과 8절을 실장님께. (다)의 「끝난 오더의 영상을 accession으로 한 번 더 찾기」는 작아서 시키시면 바로 짓겠습니다.

## 2026-10-01 — 설계 메모: 잘못 고른 오더로 찍힌 영상을 맞는 오더로 바로잡기 (짓기 전)

- **상태**: 확인 요청 (**결정 대기** — 아직 짓지 않음)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `cc78a49`를 ff로 당긴 뒤). 문서만. **PACS 저장소** — 없음
- **한 일**: 설계 메모 [`wiki/reference/study-reassign-design.md`](../reference/study-reassign-design.md). 격리(Orthanc 1.12.11)에서 **실험 다섯 가지**를 먼저 하고 씀:
  - `POST /studies/{id}/modify`(`Force`·`KeepSource`)는 **새 검사를 만들고 원본을 남김**, 그림은 한 바이트도 안 바뀜, 바뀌는 태그는 넣은 것 + 시리즈·영상 번호(기본) — `Keep`으로 그 번호를 그대로 둘 수도 있음.
  - ⚠ **이미 있는 검사 번호로 modify하면 그 검사에 섞여 들어감** → 맞바꾸기는 임시 번호를 거쳐야 함.
  - ⚠ **Orthanc의 변경 기록에 삭제는 남지 않음**, 그리고 영상 백업은 디스크의 옛 파일을 지우지 않음 → 지금대로면 **복원할 때 잘못 붙은 검사가 되살아남** → 백업·복원 스크립트를 함께 고쳐야 함(`replaced/` 폴더).
  - 새 검사는 브리지가 스스로 찾아 EMR에 도착을 알림. 바로잡은 영상에는 보낸 장비 이름이 없음(device-watch 한 줄).
- **메모의 뼈대**: 무엇을 고치나(2절) · 옮기기/맞바꾸기의 단계와 「원본은 새 검사를 확인한 뒤에만 지움」(3절) · 브리지·백업·복원(4절) · EMR 쪽(연결·판독·수납·변경 기록·새 표, 5절) · 실패마다 어떻게 되는지(6절) · 화면(7절) · **실장님께 여쭐 것 여덟(8절, 추천 포함)** · 짓는 차례(9절).
- **바꾼 파일**: `wiki/reference/study-reassign-design.md`(새), `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음(짓게 되면: 마이그레이션 8xx 표 하나, `utils/audit.js`에 종류 하나, px_ 키들, PACS 저장소의 백업·복원·device-watch·README)
- **확인한 방법**: 격리 EMR 9188 + PACS 9198, 장비 흉내의 진짜 C-STORE로 「Carotid 줄을 고른 채 찍은 영상 3장」을 만들고 Orthanc REST로 실험(메모 1절의 표). 실험으로 만든 것은 격리 볼륨 안에만 있음.
- **확인 못 한 것**: 진짜 장비가 워크리스트에서 무엇을 영상에 베끼는지(메모 2절은 그래서 「있을 때만 고친다」). 시리즈·영상 번호를 새로 만들 때 Orthanc가 검사 안의 참조(SR 등)를 함께 고쳐 주는지. 큰 검사(수백 장)의 modify 시간.
- **다른 세션에 부탁**: 총괄 — 메모 8절의 Q1~Q8을 결정 세션으로, 기술 판단 넷(시리즈·영상 번호 유지, 서버 길의 파일, 변경 기록 종류 이름, 마이그레이션 번호).

## 2026-10-01 — 한 묶음: 종이에서 서류 번호 빼기 · 비교/인쇄 단추를 체크 칸 위로 · 종류 고르기를 목록형으로

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `07fa4fc`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**:
  1. **판독 보고서 종이에서 서류 번호를 뺌** (`documents/imaging-report.jsx`): 맨 아래 줄이 «Émis le 2026-10-01 11:15»(발행 일시)만. 서식은 `docNo`를 더 찍지 않으므로 **문서 창의 이력에서 다시 그릴 때(저장된 payload)도 번호가 안 나옴**. 둘째 장 머리줄에는 원래 번호가 없음.
     - **인쇄 창의 제목**도 번호에서 서류 이름(«Compte-rendu d'imagerie»)으로 — 브라우저가 「머리글」을 찍을 때 제목이 종이에 찍히기 때문(`RadiologyReadings.jsx` `ReportPrint`).
     - 안쪽 기록은 그대로: 서류 엔진으로 발행(번호·이력·다시 인쇄·발급 취소·변경 기록). 발행 뒤 미리보기 창 아래 «Émis : D26-…»은 화면에만.
     - 미리보기 창의 안내 글: fr «L'impression est enregistrée dans le dossier comme un document émis. Les images ne sont pas sur la feuille.» / ko 「인쇄하면 발행 기록이 남습니다. 영상은 이 종이에 들어가지 않습니다.」
  2. **「⇆ Comparer (N)」·「🖨 Imprimer (N)」를 체크 칸 바로 위로** (`RadiologyReadings.jsx`): 목록 위 줄의 맨 왼쪽 — 체크 칸 열 위. 그 옆에 「Tout décocher (모두 해제)」. 체크가 0이면 셋 다 흐리게(자리는 그대로 — 목록이 안 움직임), 비교는 둘 이상·인쇄는 판독 있는 것이 하나 이상일 때 켜짐. 창 머리의 단추는 뺌.
     - 체크 상태를 **부품 안으로** 넣음: prop이 `picked`·`onPick` → **`onCompare(오더 번호 배열)`** 하나로. 영상 창이 위에 떠 있는 동안 체크는 남고(목록이 그대로 있으므로), 목록을 닫으면 사라짐 — 전과 같음.
  3. **종류 좁혀 보기를 고르기(`<select>`)로**: 닫힌 모습 «Type : tous» / 「종류: 전체」 / "Type: all", 목록에 전체 + 그 환자 목록의 종류들. 진료 화면 상용구 분류 고르기와 같은 크기·글자(12px, 테두리 3px 둥글기, 고르면 굵게·색). 종류가 하나뿐이면 숨김(전과 같음). 수납 화면의 같은 창도 같은 고르기.
- **바꾼 파일**: `frontend/src/documents/imaging-report.jsx`, `frontend/src/components/RadiologyReadings.jsx`, `frontend/src/pages/Consultation.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(6·8·9절), `wiki/modules/pacs.md`(2.3.1·2.4·2.4.1·4절·8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 (진료 세션에 알려 주세요)**: `frontend/src/pages/Consultation.jsx` — **줄이는 쪽으로** 4군데: ① import에서 `CompareChecked` 뺌 ② 상태 `readingsPicked`와 그 `useEffect` 뺌 ③ 목록 창 머리의 `<CompareChecked … />` 뺌(닫기 단추에 `marginLeft:'auto'` 되돌림) ④ `<RadiologyReadings … picked onPick />` → `<RadiologyReadings … onCompare={function(ids){ openViewer(null, ids); }} />`. `openViewer(orderItemId, pickedIds)`는 그대로. `documents/imaging-report.jsx`는 PACS 서식 파일.
- **DB 마이그레이션**: 없음
- **번역 키** (px_ 구역): **글을 바꾼 키** `px_filterAll`(«Tous» → «Type : tous» / 「전체」 → 「종류: 전체」 / "All" → "Type: all" — 고르기의 닫힌 모습이라), `px_printNote`(위 1번). **새 키** `px_untickAll`(«Tout décocher» / 「모두 해제」 / "Untick all"), `px_printNeedTick`(인쇄 단추가 꺼져 있을 때의 title). 이제 안 쓰는 것: 없음.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 1366×768):
  - **한 줄에 들어가는지**(영상 검사 29줄 환자): fr 「⇆ Comparer (0) · 🖨 Imprimer (0) · Tout décocher | Type : tous ▾ · Chercher : nom ou date… · 29」, ko 「⇆ 비교하기 (0) · 🖨 인쇄 (0) · 모두 해제 | 종류: 전체 ▾ · 찾기: 검사 이름·날짜… · 29」 — 둘 다 한 줄, 넘침 없음, 목록은 여전히 19줄. 창 머리는 「🩻 Imagerie | 26-00001 · RAKOTO Jean | Fermer ✕」.
  - **거리**: 첫 체크 칸에서 「⇆ Comparer」 단추까지 약 74px(전에는 1,000px 넘음).
  - **켜짐**: 0개 → 셋 다 꺼짐 / 1개 → 비교 꺼짐·해제 켜짐 / 2개 → 비교 켜짐, 인쇄는 판독 있는 수만큼(「🖨 Imprimer (1)」, title 「1 examen(s) coché(s) sans compte-rendu : non imprimé(s).」). 체크해도 목록 위치가 안 움직임(같은 139px).
  - **비교**: 둘 체크 → 「⇆ Comparer (2)」 → 영상 창 주소에 검사 2개, 판독 칸 접힘(「◂ 판독 칸 펴기」), 「Le compte-rendu est celui de …」. 닫으면 체크 2개 남음. 「Tout décocher」 → 0.
  - **종류 고르기**: 목록 「Type : tous, CR, US」, US를 고르면 16줄(「16 / 29」)·체크는 그대로, 전체로 되돌리면 29줄.
  - **종이의 번호**: 둘을 체크해 「🖨 인쇄 (2)」 → 발행(D26-00031, D26-00032 — 화면 아래에만) → 인쇄 창에 쓰인 HTML에 `D26-`·「N° document」·「발행번호」가 **없음**, 창 제목 「Compte-rendu d'imagerie」, 종이마다 «Émis le 2026-10-01 11:41».
  - **문서 창에서 다시 인쇄**(진료 세션의 이력): 📄 Documents → 이력의 「D26-00032 Compte-rendu d'imagerie」 → Réimprimer → 종이(본문)에 번호 없음.
- **확인 못 한 것**: 수납 화면은 이번에 화면으로 보지 않음(코드: `onCompare`가 없으면 세 단추·체크 칸을 그리지 않고, 종류 고르기·찾기·건수만). en 화면. 진짜 프린터.
- **알아 둘 것 (진료 세션 몫 — 제가 안 고침)**:
  - **문서 창의 「Réimprimer」는 인쇄 창 제목이 서류 번호**(`DocumentModal.jsx`의 `printDocument(…, viewed.doc_no, …)`) — 브라우저 인쇄에서 「머리글과 바닥글」을 켜 두면 그 번호가 종이 위쪽에 찍힙니다(모든 서류가 그럼). 판독 보고서에서 번호를 완전히 빼려면 거기도 서류 이름으로.
  - `wiki/manual-fr/consultation.md` 111줄 «…puis **⇆ Comparer (N)** en haut à droite» → 지금은 체크 칸 바로 위(«juste au-dessus des cases»).
- **다른 세션에 부탁**: 진료 — 위 두 가지와 `Consultation.jsx` 변경(4군데, 줄이는 쪽).

## 2026-10-01 — 판독 보고서: 긴 이름이 잘리지 않게 (실장님 물음)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5ae8d8a`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일** (`frontend/src/documents/imaging-report.jsx`만):
  - **이름 칸**: 글자 크기를 길이에 따라 12 → 10.5 → 9.5 → 9pt(그보다 작게는 안 함 — 남이 읽는 이름). 끊는 자리는 낱말 사이, 낱말 하나가 칸보다 길 때만 그 낱말 가운데서(먼저 「낱말을 끊지 않아도 되는 크기」를 찾고, 없을 때만 끊음). **자르지 않음**(… 없음). 네 줄의 높이는 늘 같음 — 35pt 안에 들어가면 머리 상자 140pt 그대로, 9pt로도 넘치면 **네 줄이 함께** 높아짐.
  - **둘째 장 머리줄**: `nowrap + ellipsis`를 없앰 — 잘리지 않고 필요하면 두 줄(이름 · 차트번호 · 검사 · 날짜 전부).
  - **검사 이름**: 그 칸에서 줄이 바뀜. **병원 이름**: 16 → 14 → 12.5 → 11 → 10pt, 두 줄까지. **판독의 이름**: 줄이 바뀜. 종이 아래에 비워 두는 자리는 그 내용만큼 커짐(판독 글과 겹치지 않게).
  - 방법: 서식이 자기 크기를 잴 수 없어 **글자 폭을 어림**해서 줄 수를 셈(실제 글꼴 Segoe UI·Arial에서 잰 폭 중 넓은 쪽). 어림이 넉넉한 쪽이라 드물게 칸이 필요보다 조금 높아질 수 있음 — 넘치지는 않음.
- **실장님 결정 셋을 위키 2.4.1에 적음**: 작게 넣은 항목 그대로 / 환자 번호 경고 검사 인쇄 허용(종이에 경고 없음) / 한국어 서류 이름표는 영어.
- **바꾼 파일**: `frontend/src/documents/imaging-report.jsx`, `wiki/manual-fr/pacs.md`(9절 한 줄), `wiki/modules/pacs.md`(2.4.1, 4절, 8절), `wiki/reference/design/imaging-report-sample-long-name-fr.png`(새 견본 — 가짜 환자·가짜 병원 이름), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/documents/imaging-report.jsx`(서류 폴더의 PACS 서식 파일 — develop `5ae8d8a`의 것 위에서 고침). **DB 마이그레이션**: 없음. **번역 키**: 없음
- **확인한 방법** (격리 EMR 9188, 가짜 환자 넷 — 미리보기 창에서 잰 값과, 인쇄 창의 HTML을 Chrome 헤드리스로 A4 PDF로 만든 것 둘 다):
  | 이름 | 글자 수 | 크기 | 줄 | 네 줄 높이 | 머리 상자 |
  |---|---|---|---|---|---|
  | `RAKOTONDRAZAFY Andrianantenaina` | 31 | 12pt | 2 (성 / 이름) | 35pt씩 | 140pt |
  | `RAZAFINDRAKOTO Andriamihaja Jean Baptiste Emmanuel` | 50 | 9pt | 2 | 35pt씩 | 140pt |
  | `ANDRIANTSIMBAZAFINDRAKOTOARISOA Hery` (낱말 하나 31자) | 36 | 10.5pt | 2 (`…FINDRAK / OTOARISOA Hery` — 그 낱말만 가운데서) | 35pt씩 | 140pt |
  | `RANDRIANAMBININTSOA RAKOTOMALALA Andrianjafimanantsoa Marie Clémentine Hanitriniaina` | 84 | 9pt | 4 | 46pt씩(같이 늘어남) | 185pt |
  - 넷 모두 이름 글자가 칸 안에 있고(넘침 없음) 종이 가로 넘침 없음. fr·en·ko 서류.
  - **여러 장**(45줄 판독, 3쪽): 2·3쪽 머리줄에 이름 전체 — 84자 이름 + 131자 검사 이름은 두 줄(「RANDRIANAMBININTSOA … Hanitriniaina · 26-00007 · Échographie rénale, vésicale et prostatique avec mesure du résidu … · 2026-10-01」), 50자·31자 이름은 한 줄.
  - **긴 검사 이름**(131자): 검사 칸에서 줄이 바뀜. **긴 병원 이름**(99자, 가짜): 10pt 두 줄, 종이 안. **긴 판독의 이름**(56자, 가짜): 두 줄. 판독 글·서명 줄과 겹치지 않음.
  - 시험에 쓰려고 격리 DB의 병원 이름·의사 이름·오더 이름을 잠깐 바꿨다가 되돌림.
- **확인 못 한 것**: 진짜 프린터. Segoe UI가 없는 PC(어림은 Arial 폭까지 넉넉히 잡음). 100자를 넘는 이름(같은 규칙으로 줄이 더 늘어남 — 시험은 84자까지). 중계·목록 코드는 안 바꿔 그 회귀(체크 23·보안 32)는 이번에 돌리지 않음.
- **알아 둘 것**: 50자 이름이 9pt 두 줄로 나옴 — 어림은 세 줄로 셌고(9pt 세 줄이 35pt에 들어감) 실제는 두 줄. 넉넉히 잡은 결과이고 넘치지 않음.
- **위키를 사실에 맞춤**: 진료 세션 `d853f7a`로 발행된 판독 보고서가 📄 문서 창의 발급 이력에 나오고 거기서 다시 인쇄·발급 취소가 됨 → 위키 2.4.1·4절·7절 P-30의 「아직 안 보인다」를 「풀림」으로 고침. 문서 창은 저장된 payload를 이 서식 파일로 다시 그리므로, **이번 긴 이름 고침은 이미 발행된 보고서의 재출력에도 그대로 적용됨**(payload의 값 이름은 안 바꿈).
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 판독 보고서 인쇄: 다른 병원으로 보낼 때 (실장님 병원 서식)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `c53e612`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **먼저 읽은 것**: 서류 엔진(`DocumentModal.jsx`, `documents/shared.jsx`·`registry.js`, `document.routes.js`), 영수증(`Receipt.jsx`), 변경 기록 결정(`wiki/03-change-log.md` 「서류」). 총괄이 준 서식 그림(실제 사람의 자료가 있어 **읽기만 하고 어디에도 복사하지 않음**).
- **서류 엔진에서 바꾼 것: 없음.** 있는 것을 그대로 씀 — `POST /api/documents`(발행·번호·변경 기록), `printDocument()`(A4·여백 14mm), `shared.jsx`의 글자 고르기·나이 계산·병원 이름. 새 파일 하나만 그 폴더에 더함: `frontend/src/documents/imaging-report.jsx`(서식 — 엔진의 템플릿 모양).
- **한 일**:
  1. **「🖨 Imprimer」** — 영상/판독 창 오른쪽 상세에(「Voir image」 왼쪽). 판독이 없으면 꺼짐(«Pas de compte-rendu : rien à imprimer.»), 취소된 검사도 꺼짐(«Examen annulé : son compte-rendu ne s'imprime pas.»). 환자 번호 경고가 있는 검사는 인쇄됨.
  2. **서식** (A4 세로, 검은 가는 선의 표 — 그림 그대로): ① 머리 상자 140pt — 왼쪽 55% 큰 파란 굵은 제목 + 검사 날짜(굵게 14pt), 오른쪽 네 줄(이름표 굵게 · 값 가운데, 성별·나이 칸은 둘로) ② 가운데 굵은 띠 + 검사 이름(왼쪽) ③ 가운데 굵은 띠 + 판독 글(9.5pt, 줄바꿈 그대로, 상자는 글 길이만큼) ④ 종이 맨 아래 병원 이름(굵게 16pt) + 오른쪽에 판독의.
     - 이름표: fr «COMPTE-RENDU · NOM · N° dossier · Sexe, Âge · Né(e) le · Examen · Compte-rendu», en "REPORT · NAME · ID · Sex,Age · Birthday · Exam · Reading", ko는 영어 이름표 그대로(성별 남/여, 「판독의:」만 한글).
     - 그림에 없는데 넣은 것(작게): 병원 이름 아래 주소·전화·메일 한 줄 / 「Médecin lecteur : 이름」 아래 판독 일시와 서명 줄 / 맨 아래 「N° document : D26-… · Émis le …」 / 검사 이름 옆 「(CR)」과 둘째 줄 「Demandé par : GEN · 의사 — N image(s)」 / 둘째 장부터 머리줄(환자 · 차트번호 · 검사 · 날짜) / 쪽 번호(「2 / 3」).
     - 「Saved Report」 띠는 권하신 대로 «Examen» / "Exam".
  3. **서류 언어**: 미리보기 창 위의 FR · EN · KO, **처음은 늘 FR**(화면 언어와 따로). 판독 글은 그대로.
  4. **발행 기록**: 「🖨 Émettre et imprimer」 = 서류 엔진으로 발행(`template_code: 'imaging-report'`) → 번호(D26-…)가 종이에 찍히고 변경 기록에 `documents.issue` 한 줄(「D26-00009 Compte-rendu d'imagerie」). payload(판독 글 포함)는 `document_log`에만, 변경 기록에는 안 들어감(결정 그대로). 같은 창의 「Imprimer de nouveau」는 같은 번호로 다시 인쇄, 언어를 바꾸거나 창을 다시 열면 새 번호.
  5. **여러 검사 한꺼번에**: 진료 화면에서 체크 → 목록 위 「🖨 Imprimer (N)」 → 검사마다 한 장·번호 하나, 한 번의 인쇄. 체크한 것 중 판독 없는 검사는 빠지고 단추 title에 「1 examen(s) coché(s) sans compte-rendu : non imprimé(s).」
  6. **수납 화면**: 같은 부품이라 같은 단추(한 건씩 — 수납 화면에는 체크 칸이 없음). 권한: 수납 계정으로 `POST /api/documents` 201 확인(서류 발행 권한 = 진료·수납·약국).
- **바꾼 파일**: `frontend/src/documents/imaging-report.jsx`(새), `frontend/src/components/RadiologyReadings.jsx`(`ReportPrint`·`printBlock`, 단추 둘), `backend/src/routes/pacs.routes.js`(목록 응답에 `visit_id`), `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(새 9절), `wiki/modules/pacs.md`(새 2.4.1, 4절, P-30, 8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/reference/design/imaging-report-sample-fr.png`(가짜 환자 견본), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/documents/imaging-report.jsx` — **서류 엔진 폴더에 새 파일 하나**(있던 파일은 안 바꿈). `Consultation.jsx`·`Payment.jsx`·`DocumentModal.jsx`·`registry.js`·`document.routes.js`는 안 바꿈.
- **DB 마이그레이션**: 없음(`document_log`·`generate_doc_no()` 그대로 씀)
- **번역 키** (px_ 구역, 새 키 12개 ko·en·fr): `px_print`, `px_printN`, `px_printNoReading`, `px_printCancelled`, `px_printSkipped`, `px_printTitle`, `px_printLang`, `px_printGo`(«Émettre et imprimer» / 「발행하고 인쇄」), `px_printAgain`, `px_printNote`, `px_printIssued`, `px_printFail`. 서식 안의 이름표는 서식 파일에(서류 언어를 따르므로 화면 번역 파일이 아님 — 다른 서류 템플릿과 같은 방식).
- **확인한 방법** (격리 EMR 9188. 인쇄 창에 쓰이는 HTML을 그대로 받아 **Chrome 헤드리스로 A4 PDF**를 만들어 쪽마다 그림으로 봄 — 총괄의 서식 그림과 나란히):
  - **짧은 판독(fr·en)**: 한 장. 머리 상자·환자 칸·두 띠·판독 상자·맨 아래 병원/판독의가 그림과 같은 자리. 쪽 번호 「1 / 1」.
  - **긴 판독(44줄, fr·ko)**: 3쪽 — 1쪽은 머리부터, 2쪽 맨 위에 「RAKOTO Jean · 26-00001 · Chest Lat · 2026-09-30」과 이어지는 글, 쪽 번호 「2 / 3」. 글이 2쪽 끝 가까이에서 끝나서 **3쪽에는 병원 이름·판독의·발행번호 줄만** 들어감.
  - **ko**: 이름표 영어, 성별 「남」, 「판독의: …」, 「발행번호: … · 발행 …」, 병원 이름은 설정의 한국어 이름.
  - **여러 건**: 세 줄 체크(둘은 판독 있음, 하나 없음) → 「🖨 Imprimer (2)」 → 4쪽(1쪽 + 3쪽), 번호 둘(D26-00005, D26-00006), 검사마다 새 쪽에서 시작.
  - **병원 정보가 비었을 때**(격리 DB의 병원 줄을 잠깐 비우고 되돌림): 병원 이름·주소 없이 판독의·번호만 찍힘, 오류 없음.
  - **발행 기록**: `document_log`에 `imaging-report` 줄(언어, 내원, payload 있음), 변경 기록에 `documents.issue | D26-00009 Compte-rendu d'imagerie`. 「다시 인쇄」는 번호를 새로 만들지 않음(같은 번호로 한 번 더 인쇄됨).
  - 꺼진 단추: 판독 없는 줄·취소된 줄의 title 확인.
  - 회귀: 체크 23가지 · 보안 32가지 통과.
- **확인 못 한 것**: **진짜 프린터**(헤드리스 PDF로만 봄 — 여백·글꼴은 프린터와 PC에 깔린 글꼴에 따라 조금 다를 수 있음). 수납 화면에서 단추를 **화면으로** 누르지는 않음(같은 부품 + 수납 계정의 발행 권한만 확인). 밝은 화면의 미리보기 창(종이는 늘 흰색). 옛 브라우저에서의 쪽 번호(시험한 Chrome에서는 찍힘 — 지원하지 않는 브라우저에서는 쪽 번호만 빠짐).
- **실장님 결정이 필요할 수 있는 것 (지어 놓았고, 바꾸기 쉬움)**:
  1. **인쇄 = 발행**(번호 하나, 변경 기록 한 줄). 시험 삼아 뽑아도 번호가 하나 씁니다. 「발행하지 않고 미리 뽑기」 단추를 따로 둘지.
  2. **서류 창(📄 Documents)의 발행 이력에 안 보임 · 발행 취소 화면 없음**(위키 7절 P-30) — 보이게 하려면 `documents/registry.js`에 2줄(서류 엔진 파일)과 「어느 목록에 보일지」 결정.
  3. **검사 날짜** = 영상이 도착한 날(없으면 처방일). 장비의 촬영 날짜는 EMR에 없음.
  4. **그림에 없는데 넣은 것들**(위 2번의 「작게」 목록) — 빼거나 더 키울 것.
  5. **환자 번호 경고가 있는 검사**: 인쇄는 되고 **종이에는 경고가 없음**. 종이에도 한 줄 넣을지, 아예 막을지.
  6. **여러 건 인쇄의 쪽 번호**는 인쇄 작업 전체로 매겨짐(「3 / 4」) — 서류마다 따로가 아님.
  7. **한국어 서류**의 이름표는 영어(실장님 병원 서식대로). 한글 이름표로 바꿀지.
  8. 판독의 **면허번호** 칸은 없음(직원 자료에 면허번호가 없음 — 그림의 원본도 판독 글 끝에 손으로 적은 것).
- **다른 세션에 부탁**: (결정 2가 「보이게」면) 서류 엔진 맡은 세션 — `registry.js`에 `imaging-report` 등록과 서류 창의 종류 처리.

## 2026-10-01 — 「영상/판독」 창을 두 칸으로: 왼쪽 목록(한 줄씩), 오른쪽 고른 검사의 판독

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `8f37398`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일** (`frontend/src/components/RadiologyReadings.jsx`의 `RadiologyReadings`를 다시 짬 — prop은 그대로):
  - **왼쪽 목록**: 한 줄에 한 검사, 최근 것부터 — [체크 칸] · Date · Type · Examen · Images · Compte-rendu. 줄 높이 28px, 머리줄 고정. **1366×768에서 19줄**(진료·수납 모두), 1920×1080에서 29줄이 스크롤 없이.
    - Images: «N image(s)»(초록) / «en attente» / «—». Compte-rendu: «✓ 판독의» / «pas encore». 취소: 이름에 줄 + «Annulé». 환자 번호 경고: «⚠ identité à vérifier»(다름 = 빨강, 없음 = 노랑).
  - **고르기**: 줄을 누르거나 **↑ ↓**(창이 열리면 바로 됨, 끝에서 멈춤, 화면 밖이면 따라 스크롤). 처음엔 맨 위. **체크 칸을 누르면 체크만**(고른 줄은 그대로).
  - **오른쪽 상세**: 종류 · 검사 이름 · (Annulé) · **🖼 Voir image** / Demandé le · Demandé par(진료과 · 의사) · Images(장수 + 도착 일시, 또는 대기) · N° d'accession / 취소 사유 · 환자 번호 경고(전체 문장) · accession 연결 안내 / **🩻 Compte-rendu** — «Lu par: 이름 · 날짜 시각» + **판독 글 전체**(줄바꿈 그대로, 길면 그 칸 안에서 스크롤).
  - **좁혀 보기**(값싸게 되어 넣음): 위에 «Tous / CR / US …»(종류가 둘 이상일 때만)와 «Chercher : nom ou date…» 한 칸, 오른쪽에 「16 / 29」.
  - 영상 창을 닫으면 이 창으로 — **고른 줄·스크롤·체크·걸러 보기 그대로**, 방금 저장한 판독이 왼쪽 ✓와 오른쪽 글에 보임.
  - 체크해서 비교(«⇆ Comparer (N)»)는 그대로 — 왼쪽 줄의 체크 칸.
  - 수납 화면: 같은 두 칸, 체크 칸·«Voir image» 없음(prop을 안 주므로).
  - 판독은 이 창에서 고치지 않음.
- **서버**: `GET /api/pacs/readings/patient/:id` 응답에 `ordered_by_name`(오더한 직원 `order_item.ordered_by`, 없으면 그 내원의 의사) · `dept_code` · `dept_name`(내원의 진료과)을 더함. 있던 값은 그대로.
- **바꾼 파일**: `frontend/src/components/RadiologyReadings.jsx`, `backend/src/routes/pacs.routes.js`(목록 질의에 세 값), `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(6절 다시 씀), `wiki/modules/pacs.md`(2.4 다시 씀, 4절, 8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: **없음** — `Consultation.jsx`·`Payment.jsx`는 안 바꿨습니다(창 크기 88vw×86vh · 80vw×84vh 그대로로 두 칸이 들어감).
- **DB 마이그레이션**: 없음
- **번역 키** (px_ 구역, 새 키 16개 ko·en·fr): `px_colDate`·`px_colType`·`px_colExam`·`px_colImages`·`px_colReading`(머리줄), `px_imgShort`(«{n} image(s)» / 「{n}장」), `px_imgWaitShort`(«en attente» / 「대기」), `px_readNone`(«pas encore» / 「없음」), `px_filterAll`, `px_filterSearch`, `px_noMatch`, `px_dOrdered`(«Demandé le» / 「처방일」), `px_dOrderedBy`(«Demandé par» / 「처방」), `px_dAccession`, `px_identityShort`(«identité à vérifier» / 「환자 확인 필요」), `px_pickHint`. 있던 키의 글은 안 바꿈. 이제 이 부품이 쓰지 않는 키: 없음(`px_imagesArrived`·`px_imagesWaiting`은 상세 칸이 씀).
- **확인한 방법** (격리 EMR 9188 + PACS 9198. 시험 환자 26-00001 — 영상 검사 **29줄**: 판독 있는 것·없는 것, 취소 2, 환자 번호 경고 여럿, 대기 1, 줄 44개짜리 긴 판독 하나):
  - **1366×768 · fr · 어두운 화면(진료)**: 29줄 중 19줄이 보임, 잘린 칸 없음, 맨 위가 골라져 있고 목록에 포커스. 긴 판독을 고름 → 글 칸 438px 안에서 스크롤(글 높이 1901px), 창은 안 늘어남, 줄바꿈 44줄 그대로, «Lu par: RABE Hery · 2026-10-01 10:58».
  - **↑↓**: 아래 둘 → 위 하나 → 아래 24번(27번째 줄, 화면 안으로 따라 스크롤) → 끝에서 멈춤.
  - **체크**: 체크 칸을 눌러도 고른 줄 그대로, «⇆ Comparer (1)».
  - **좁혀 보기**: `US` → 16줄(「16 / 29」, 맨 위 US가 골라짐), `lat` → Chest Lat 4줄, `zzz` → «Aucun examen ne correspond.» + 오른쪽 «Cliquez sur un examen dans la liste.», 지우면 29줄.
  - **영상보기 → 판독 저장 → 닫기**: 다섯째 줄에서 «🖼 Voir image» → 영상 창에서 두 줄짜리 판독 저장 → 닫음 → 같은 줄이 골라진 채, 왼쪽 «pas encore» → «✓ RABE Hery», 오른쪽에 그 글, 스크롤 그대로.
  - 취소된 줄(사유 «Motif : Demandé par erreur»)·환자 번호 없는 줄(노란 상자 전체 문장)의 상세.
  - **ko · 밝은 화면**: 머리줄 「날짜 | 종류 | 검사 | 영상 | 판독」, 「1장」「없음」「✓ RABE Hery」, 상세 「처방일 · 처방 · 영상 1장 도착 · 검사 번호(Accession)」, 「찾기: 검사 이름·날짜…」.
  - **글자 대비**(밝은·어두운, 고른 줄·보통 줄·취소 줄·경고 칩·머리줄·상세 이름표·빈 판독): 최저 **4.8**(밝은 화면의 초록 날짜), 나머지 5.2 이상 — 처음에 4.4였던 「없음」 글자를 한 단계 진하게 고침.
  - **1920×1080**: 29줄 모두 보임, 목록 978px · 상세 709px, 가로 넘침 없음.
  - **수납 화면**(시험 수납 계정, 1366×768 · fr): 같은 두 칸, 19줄, 체크 칸 0개, «Voir image» 없음, 머리 「🩻 Imagerie | 26-00001 · RAKOTO Jean | Fermer ✕」, 줄을 누르면 상세가 바뀜.
  - 회귀: 체크 23가지 · 보안 32가지 통과. 목록 API — 진료·수납 계정 200(29줄), 로그인 없음 401.
- **확인 못 한 것**: 검사 이름이 아주 긴 경우(칸에서 …로 잘리고 title에 전체가 나오게는 했음 — 긴 이름 자료로 보지는 않음). 검사가 100건 넘는 환자(줄을 모두 그림 — 수백 건까지는 문제없을 것으로 봄). en 화면(키만 넣음).
- **알아 둘 것**: 「오더한 과·의사」는 **그 내원의 진료과**와 **오더를 낸 직원**(없으면 내원의 의사)입니다. 전과(Transfert)로 내원의 과가 바뀌면 옛 오더도 지금 과로 보입니다.
- **다른 세션에 부탁**: 없음(진료·수납 파일을 안 바꿈 — 두 세션에는 「창 안의 모양이 바뀌었다」만 알리면 됨. 프랑스어 설명서 `consultation.md`·`payment.md`를 봄: 이 창은 단추 이름으로만 나오고 모양을 설명한 곳이 없어 고칠 것 없음).

## 2026-10-01 — Stone 왼쪽 목록을 날짜 내림차순으로 할 수 있는가: 안 됨 (문서만)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `978f5a8`을 ff로 당긴 뒤). 문서만.
- **답**: **안 됩니다** — Stone을 고치지 않고는.
  - Stone은 왼쪽 목록의 검사를 **검사 번호(StudyInstanceUID)의 글자 순서**로 늘어놓습니다(안쪽에서 번호를 열쇠로 정렬해 둔 것을 그대로 꺼냄 — `app.js`는 그 순서를 받아 쓰기만 함).
  - 근거(앞의 격리 시험 기록): 주소에는 `연 검사(10-01), 그다음 날짜 내림차순`으로 넣었고 `openedFirst`가 연 검사의 답을 먼저 보내는데도, 목록은 번호순 — 8건일 때 `…20260930.10…`(SONO) → `…20260930.9…`(Chest PA) → `…20261001.33` → 34 → 35 → 36 → 37 → `…20261001.40`(연 검사가 맨 끝), 3건일 때 34 → 36 → 40. 주소의 순서도, 답의 순서도 목록 순서를 바꾸지 못했습니다.
  - EMR이 만든 번호는 `…<오더 낸 날>.<오더 번호>.<난수>` 꼴이라 「오더 낸 날 → 오더 번호의 글자순」(10이 9보다 앞)으로 놓입니다. 총괄이 보신 0930·0908·0928·0612도 같은 날 낸 오더들의 번호 글자순으로 보입니다(촬영 날짜와 무관). 장비가 자기 번호를 쓰면 순서는 더 제멋대로.
  - 순서를 바꾸려면 Stone 안의 목록을 고치거나(선 밖) 검사 번호를 바꿔 내줘야(자료를 바꿈) 해서 하지 않습니다.
- **대신 한 것**: 프랑스어 설명서 8절과 위키 2.3.1에 「왼쪽 목록은 날짜순이 아니다 — 검사 이름 밑의 날짜와 영상 오른쪽 위의 날짜를 보라」 한 줄.
- **바꾼 파일**: `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 · DB 마이그레이션 · 번역 키**: 없음
- **확인한 방법**: 새로 돌린 것 없음 — 2026-10-01의 격리 기록(Stone 목록 순서와 주소·답의 순서)을 맞춰 봄. **확인 못 한 것**: Stone의 C++ 소스를 읽지는 않음(「번호를 열쇠로 정렬」은 본 순서로부터의 추정 — 본 세 경우 모두 번호 글자순과 맞고 주소·답 순서와는 안 맞음).
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 영상/판독 목록에서 검사를 체크해 한꺼번에 비교로 열기 + `openedFirst` 고침

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `e7fd445`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**:
  1. **체크 칸** (`RadiologyReadings`): `onPick`을 받으면 줄 왼쪽에 체크 칸. 체크할 수 있는 것은 **영상 도착 · 취소 아님 · 환자 일치(`match`)** 인 줄만 — 나머지는 꺼져 있고 title에 이유(«Examen annulé : il ne peut pas être comparé.» / «Pas d'images arrivées : …» / «Avertissement d'identité sur les images : cet examen s'ouvre seulement avec « Voir image ».»). 최대 9건, 열 번째는 막고 알림 «9 examens au plus pour une comparaison.».
  2. **「⇆ Comparer (N)」** (`CompareChecked`, 목록 창 머리의 닫기 왼쪽): 늘 보이고 **둘 이상 체크했을 때 켜짐**(꺼져 있을 때 title «Cochez au moins deux examens (la case à gauche de chaque ligne), puis cliquez ici.»).
  3. **서버가 주소를 만듦** — `GET /api/pacs/viewer-url?order_item_ids=a,b,c`: 2~9개, 서로 다른 영상 오더, **한 환자**, **하나하나가 비교에 허락되는 검사**여야 하고, 아니면 **409 + 쿠키 없음**(체크로는 「비교 단추가 넣지 않는 검사」를 넣을 길이 없음). 응답은 보통의 `viewer-url`과 같은 모양 + `order_item_id`(연 검사) · `picked: true`, `compare.url` = 체크한 검사들만, **쿠키도 체크한 검사들만**.
  4. **「연 검사」 = 체크한 것 가운데 가장 최근**(방문 날짜, 오더 번호). 이유: 오늘 사진을 전 것과 견주는 것이 보통이고, 「맨 먼저 체크한 것」으로 하면 누른 순서에 따라 판독 대상이 바뀌어 헷갈림(순서를 기억해야 함). 창 제목·판독 칸·첫 칸이 그 검사의 것이고, 비교 줄에 «🩻 Le compte-rendu est celui de : Chest PA · 2026-10-01». 판독 칸은 접힌 채로 열림.
  5. 영상 창을 닫으면 목록으로 돌아오고 **체크는 남음**. 목록을 닫으면 사라짐. 목록이 다시 읽힌 뒤(영상 창을 닫을 때) 그새 취소된 줄은 체크에서 빠짐.
  6. 한 줄의 「영상보기」와 그 안의 「⇆ Comparer avec les examens précédents」는 그대로. `ViewerCompare`는 「비교 중」을 자기 상태가 아니라 **지금 주소**로 판단하게 바꿈(체크로 바로 비교에 들어간 창도 같은 줄이 나오게).
  7. 수납 화면 목록에는 체크 칸 없음(`Payment.jsx`는 prop을 주지 않음 — 안 바꿈).
- **★ `openedFirst`를 고쳤습니다 — 앞 보고의 「20번 중 20번」은 충분하지 않았습니다.** 세 검사를 체크해 열자 3번에 1번 다른 검사(Hand X-Ray)가 첫 칸에 떴습니다. 원인: Stone은 시리즈 정보를 **검사들의 시리즈 목록이 돌아온 순서대로** 묻는데, 다른 검사의 목록이 먼저 돌아오면 그 검사를 먼저 묻고 — 우리가 그 답을 붙잡아도 1.5초 뒤 그대로 먼저 받았습니다. 이제 중계가 답의 순서를 **① 연 검사의 시리즈 목록 → 다른 검사들의 목록 ② (모든 목록이 나간 뒤) 연 검사의 시리즈 정보 ③ 다른 검사들의 시리즈 정보**로 잡습니다. 여전히 우리 답의 시간만 다룸(Stone 그대로). 고친 뒤: 두 검사 7번 · 세 검사 21번 · 여덟 검사 6번 모두 연 검사가 먼저, 세 검사 21번 모두 Stone이 연 검사의 정보를 먼저 물음. **보장이 아니라 잰 결과**입니다 — 느린 영상 서버에서 1.5초 한도에 걸리면 어긋날 수 있고, 그래서 비교 줄의 「판독 칸은 이 검사의 것」과 영상마다의 날짜가 함께 있습니다.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/pacs.viewer.js`, `frontend/src/components/RadiologyReadings.jsx`, `frontend/src/pages/Consultation.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(8절 한 단락), `wiki/modules/pacs.md`(2.3.1, 4절, 8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경 (진료 세션에 알려 주세요)**: `frontend/src/pages/Consultation.jsx` — ① import에 `CompareChecked` ② 상태 `readingsPicked` + 목록이 닫히면 비우는 `useEffect` 한 줄 ③ `openViewer(orderItemId, pickedIds)` — `pickedIds`가 있으면 `?order_item_ids=`로 묻고, 응답의 `order_item_id`를 연 검사로, 주소를 `compare.url`로, 판독 칸을 접은 채로; 409면 `px_cmpRefused` 알림 ④ 목록 창 머리에 `<CompareChecked … />`(닫기 단추의 `marginLeft:'auto'`를 이 단추로 옮김) ⑤ `<RadiologyReadings … picked onPick />`.
- **DB 마이그레이션**: 없음
- **번역 키** (px_ 구역, 새 키 8개 ko·en·fr): `px_cmpGo`(«Comparer ({n})» / 「비교하기 ({n})」), `px_cmpNeedTwo`, `px_cmpPick`, `px_cmpNoImages`, `px_cmpCancelled`, `px_cmpIdentity`, `px_cmpMax`, `px_cmpRefused`. 있던 키의 글은 안 바꿈.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 1366×768, 시험 환자 26-00002(검사 12줄) · 26-00001(29줄)):
  - **둘 체크해 열기**(fr, 마우스로 단추): 10-01·09-28 Chest PA → «⇆ Comparer (2)» → 영상 창 주소에 검사 2개, Stone 목록에 두 검사, 첫 칸 10-01, 판독 칸 접힘, «Le compte-rendu est celui de : Chest PA · 2026-10-01».
  - **셋**: Hand X-Ray 09-29를 더 체크 → 3개, 연 검사는 여전히 10-01.
  - **체크 유지**: 영상 창을 닫음 → 목록 그대로·체크 2개 남음. 하나 빼면 단추가 (2). 목록을 닫았다 열면 체크 0.
  - **꺼진 줄**: 취소 2줄·불일치 1줄·미도착 1줄의 칸이 꺼져 있고 이유 title(fr·ko 확인). 꺼진 칸을 눌러도 변화 없음.
  - **9건 한도**: 검사가 많은 환자에서 열 개를 차례로 누름 → 9개만 체크, 알림 한 번, «⇆ Comparer (9)» → 열림(연 검사 = 가장 최근, 첫 칸).
  - **ko**: 「🩻 영상/판독 | … | ⇆ 비교하기 (0) | 닫기 ✕」 한 줄, title 「비교할 검사를 둘 이상 체크한 뒤(각 줄 왼쪽의 칸) 누르세요.」, 꺼진 칸의 이유 셋.
  - **서버 회귀 — 체크(23가지 통과)**: 둘·셋 체크(연 검사 = 가장 최근, 주소·쿠키는 체크한 것만, **체크하지 않은 같은 환자 검사 403**, 다른 환자 검사 403), 체크 순서 무관, **409 + 쿠키 없음**: 미도착·취소·불일치·다른 환자 검사가 섞임 / 하나뿐 / 같은 것 둘 / 없는 오더 / 숫자 아님 / 빈 값 / 10개. 9개는 열림. 수납 계정 403, 로그인 없음 401.
  - **보안·회귀 32가지 통과**(앞의 것 그대로: Stone 페이지·`app.js` 바이트 동일 포함).
- **확인 못 한 것**: 수납 화면은 코드로만(`Payment.jsx`가 prop을 안 줌). 밝은 화면. 진짜 장비의 큰 영상으로 9건.
- **알아 둘 것**: 시험 자료에서 9건을 열었을 때 Stone 목록에는 8건 — 한 건은 격리 영상 서버에서 제가 지운(「도착 기록은 있는데 없음」 시험) 검사로 보이며 목록에 안 나옴. EMR은 도착했다고 알고 있어 체크할 수 있었음. 실제로는 영상 서버에서 영상이 사라진 경우에만.
- **다른 세션에 부탁**: 진료 — 위 `Consultation.jsx` 변경(5군데).

## 2026-10-01 — 이전 검사와 비교: 누르면 그 환자의 검사를 모두 함께 (실장님 확정 방향)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `45f4127`을 ff로 당긴 뒤 — 앞의 `0530f5f`가 합쳐진 것 위). **PACS 저장소** — 없음(`b4ba4a3` README 줄은 앞 보고에 있음)
- **한 일** (선은 그대로 — Stone 파일을 바꾸지 않고, 안쪽 함수를 부르지 않음):
  1. **「비교」를 누르면 그 환자의 허락된 검사(같은 환자 · 취소 아님 · 도착 · `match` · 최대 9건)를 모두 `?study=연 검사,다른 검사,…`로 함께 엶.** Stone의 왼쪽 목록에 날짜와 함께 다 나오고, 의사가 ▦로 나눠 끌어다 놓음 — 실장님이 서버에서 `?patient=`로 해 보신 그 모양. `viewer-url` 응답: `compare: {count, url, opened, prev, others}`(앞의 `prev.url`·`others[].url`은 없앰 — 주소는 `compare.url` 하나).
  2. **기본은 연 검사만**, 창 제목 아래 «⇆ Comparer avec les examens précédents (7)» + (같은 검사가 다른 날짜에 있으면) «Même examen : Chest PA · 2026-09-30». 목록 고르기(select)는 뺌 — 검사 고르기는 Stone의 목록에서.
  3. **비교 중임과 판독 대상이 보이게**: «✕ Fin de la comparaison» + 노란 칸 «🩻 Le compte-rendu est celui de : Chest PA · 2026-10-01» + 안내 한 줄.
  4. **안내 한 줄** (비교 중 줄에, 그리고 비교 단추의 title에): fr «Bouton ▦ en haut des images : coupez l'écran en cases, puis faites glisser un examen de la liste de gauche dans une case.» / ko 「영상 위의 ▦ 단추에서 화면을 나누고, 왼쪽 목록의 그림을 칸에 끌어다 놓으세요.」 / en "Split the screen with the ▦ button above the images, then drag an exam from the list on the left into a pane."
  5. **`?patient=`는 통과시키지 않음**: 페이지 주소에 `patient=`가 있으면 403 안내 쪽(전에는 페이지는 뜨고 그 질의만 403이었음). 검사 번호는 전처럼 하나하나 쿠키와 대조.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/pacs.viewer.js`, `frontend/src/components/RadiologyReadings.jsx`(`ViewerCompare`), `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(8절), `wiki/modules/pacs.md`(2.3.1, 4절, 8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음(`Consultation.jsx`는 이번에 안 바꿈 — `ViewerCompare`의 props는 그대로 `viewer`·`onUrl`·`t`·`style`).
- **DB 마이그레이션**: 없음
- **번역 키** (px_ 구역): **글을 바꾼 키** `px_compareWith`(«Comparer avec {x}» → «Comparer avec les examens précédents ({n})» / 「이전 검사와 비교 ({n}건)」 — 자리표시가 `{x}`에서 `{n}`으로), `px_compareHint`(위 4번의 글로). **새 키** `px_comparePrev`(«Même examen : {x}» / 「같은 검사: {x}」), `px_compareReading`(«Le compte-rendu est celui de : {x}» / 「판독 칸은 이 검사의 것: {x}」). **뺀 키** `px_compareOther`(목록 고르기를 없애서). `px_compareEnd`·`px_readingHide`·`px_readingShow`는 그대로.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 1366×768 · fr · 어두운 화면, 시험 환자 26-00002):
  - 10-01 Chest PA를 엶 → 검사 하나, 줄에 «⇆ Comparer avec les examens précédents (7)» · «Même examen : Chest PA · 2026-09-30». 단추를 **마우스로** 누름 → Stone 목록에 8건(날짜순), 첫 칸에 10-01, 판독 칸 접힘, 줄에 «🩻 Le compte-rendu est celui de : Chest PA · 2026-10-01». Stone의 ▦ → 두 칸 → 09-28 Chest PA 그림을 오른쪽 칸에 끌어다 놓음 → **왼쪽 10-01 · 오른쪽 09-28**.
  - 비교 끝내기 → 검사 하나·판독 칸 돌아옴. 비교 중 새 탭 주소에 8건.
  - **연 검사가 먼저**: 8건을 함께 여는 것을 10번 — 10번 모두 첫 칸에 연 검사. 8건의 요청 59개가 약 0.9초(격리, 작은 시험 영상).
  - 한국어 화면: 「⇆ 이전 검사와 비교 (7건)」 「같은 검사: Chest PA · 2026-09-30」 「✕ 비교 끝내기」 「🩻 판독 칸은 이 검사의 것: Chest PA · 2026-10-01」.
  - 검사 하나뿐인 환자: 줄 없음.
  - **보안·회귀 32가지 통과**: 앞의 30가지(Stone 페이지·`app.js` 바이트 동일, 불일치·취소·다른 환자 403, 목록·REST 403, 쿠키 없음 401, 경로 우회 400 …) + `?patient=`가 붙은 페이지 403 둘.
- **확인 못 한 것**: 진짜 장비의 큰 영상으로 9건을 함께 열 때의 속도(목록의 검사는 작은 그림과 목록 정보만 먼저 받고, 본 영상은 칸에 놓을 때 받음). 밝은 화면.
- **알아 둘 것**:
  - 시험 자료에서 본 것: 영상 서버에 **같은 검사 번호가 두 환자 이름으로 두 번** 들어 있으면(옛 시험에서 다른 환자 번호로 다시 보낸 것) 그 검사는 Stone 목록에는 나오지만 검사 정보 요청(`/studies/<번호>/metadata`)이 404가 됨(Orthanc의 답 — 번호 하나에 검사가 둘이라). 실제로는 장비가 같은 검사 번호를 다른 환자 번호로 또 보낸 경우에만 생김 — 드묾, 이번에 안 건드림.
  - `openedFirst`(연 검사가 먼저 뜨게 — 다른 검사의 `…/metadata` 답을 잠깐 붙잡음)는 앞 보고대로 들어 있고, 검사가 여럿이어도 같은 방식. 빼라고 하시면 세 줄.
  - 실행 중 자료(26-00001: Chest PA 09-28·09-30, Hand 09-30)에서는 09-30 Chest PA를 열면 «⇆ Comparer avec les examens précédents (2)» · «Même examen : Chest PA · 2026-09-28»이 나와야 함(둘 다 `match`·취소 아님일 때).
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 이전 검사와 비교를 「Stone을 고치지 않는」 방식으로 다시 지음 (라이선스)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (합치지 않은 `2e7a738` 위에 develop `e4dbdd1`을 합친 `bd3d46b`, 그 위의 새 커밋. ff가 안 돼 `git merge develop`으로 받았습니다). **PACS 저장소** `session/pacs` `b4ba4a3`(README License 한 줄)
- **지킨 선**: Stone이 내주는 페이지·파일을 **한 바이트도 바꾸지 않음**, Stone 안쪽 함수를 부르는 코드 없음. 쓰는 것은 Stone의 공식 주소 파라미터(`?study=A,B`)와 Stone 자신의 단추뿐.
  - 확인: 중계로 받은 `index.html`(검사 하나·둘 모두)과 `app.js`가 **Orthanc에서 직접 받은 것과 바이트 단위로 같음**(회귀 스크립트 항목). 영상 창 안의 스크립트는 Stone의 것 9개뿐. 끼우던 주소 `/px/compare.js`는 403.
- **걷어 낸 것** (`2e7a738`에서): `backend/src/routes/pacs.viewer.compare.js`(지움), 중계가 Stone 페이지에 스크립트를 붙이던 부분, 주소의 `selectedStudies`·`px_prev`.
- **살린 것**: `viewer-url`의 허락 범위(같은 환자 · 취소 아님 · 도착 · `match` · 최대 9건), 쿠키 대조(`?study=`의 하나하나), 권하는 검사 고르기, 「한 번에 한 환자」 쿠키(P-29), 보안 회귀.
- **다시 지은 모양**:
  1. **`viewer-url` 응답**: `url`은 전처럼 연 검사 하나. `compare: {count, prev, others: [...]}` — 각 항목 `{order_name, modality, visit_date, same_exam, url}`, `url` = `/api/pacs/viewer/stone-webviewer/index.html?study=<연 검사>,<그 검사>`. `prev` = 권하는 하나(없으면 null), `others` = 전부(최근 것부터).
  2. **화면 부품** `ViewerCompare` (`frontend/src/components/RadiologyReadings.jsx`에서 export): `props.viewer = {order_item_id, base_url, compare}`, `props.onUrl(주소)`, `props.t`, `props.style`. 다른 검사가 없으면 아무것도 안 그림.
     - 비교 전: 보라색 단추 «⇆ Comparer avec Chest PA 2026-09-28»(권할 것이 있을 때) + 목록 «Autre examen… (7)»(「2026-09-28 · CR · Chest PA」 꼴).
     - 비교 중: «✕ Fin de la comparaison» + 목록(지금 고른 검사) + 안내 한 줄 «Les deux examens sont dans la liste de gauche. Pour les voir côte à côte : bouton ▦ en haut des images → deux cases, puis faites glisser l'autre examen dans la case vide.»
  3. **진료 화면 `Consultation.jsx` (진료 세션 파일 — 작은 변경, 아래 「공용 파일 변경」)**: 영상 창 제목 아래에 `<ViewerCompare … />`, `onUrl`에서 iframe 주소를 바꾸고 **판독 칸을 접음**(비교를 끝내면 폄). 제목 줄에 **판독 칸 접기/펴기 단추**(«Masquer le compte-rendu ▸» / «◂ Afficher le compte-rendu») — 비교가 아니어도 쓸 수 있음, 쓰던 글은 그대로, 창을 새로 열면 늘 펴진 채. 「새 탭에서 열기」는 지금 주소를 쓰므로 비교 중이면 두 검사가 함께 열림.
  4. **나누기·놓기는 Stone의 단추로**: ▦(Change layout) → 두 칸, 다른 검사를 빈 칸으로 끌어다 놓기. Stone이 나누기를 기억하므로 ▦는 한 번만(설명서에 그대로 적음).
  5. **연 검사가 먼저 뜨게** (`pacs.viewer.js` `openedFirst`): 두 검사를 열면 Stone은 시리즈 정보가 먼저 도착한 검사를 첫 칸에 놓음 — 정하는 파라미터가 없고, 재 보니 **8번에 1번은 비교 검사가 먼저** 떴음(창 제목·판독 칸은 연 오더의 것이라 위험). 그래서 중계가 **비교 검사의 `…/metadata` 답을, 연 검사의 것이 하나 나간 뒤까지 잠깐 붙잡음**(최대 1.5초, 잰 값 약 0.07초). **우리 답의 시간만** 다루고 내용은 그대로 — 선 안이라고 보았으나, **이것도 빼라고 하시면 `openedFirst` 세 줄**이고 그러면 8번에 1번쯤 왼쪽 칸에 전 검사가 먼저 뜹니다(영상마다 날짜는 적혀 있음).
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/pacs.viewer.js`, `backend/src/routes/pacs.viewer.compare.js`(지움), `frontend/src/components/RadiologyReadings.jsx`, `frontend/src/pages/Consultation.jsx`, `frontend/src/i18n/{ko,en,fr}.js`, `wiki/manual-fr/pacs.md`(8절 다시 씀), `wiki/modules/pacs.md`(2.3.1, 4절, P-28, 8절), `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md` / PACS `README.md`
- **공용 파일 변경 (진료 세션에 알려 주세요)**: `frontend/src/pages/Consultation.jsx` — ① import에 `ViewerCompare` ② 상태 `readFolded` ③ `openViewer`가 `base_url`·`compare`를 `viewer`에 넣고 `setReadFolded(false)` ④ 영상 창 제목 줄에 접기 단추(그 자리에 있던 빈 `<div style={{marginLeft:'auto'}}>`는 단추가 `marginLeft:'auto'`를 가져가서 뺌) ⑤ 제목 아래에 `<ViewerCompare … />` ⑥ 판독 칸 `display: readFolded ? 'none' : 'flex'`. 모두 영상 창 안.
- **DB 마이그레이션**: 없음(읽기만)
- **번역 키** (px_ 구역, ko·en·fr 새 키 6개): `px_compareWith`(«Comparer avec {x}» / 「이전 검사와 비교: {x}」), `px_compareOther`(«Autre examen… ({n})»), `px_compareEnd`(«Fin de la comparaison»), `px_compareHint`, `px_readingHide`(«Masquer le compte-rendu»), `px_readingShow`(«Afficher le compte-rendu»). 있던 키의 글은 안 바꿈.
- **확인한 방법** (격리 EMR 9188 + PACS 9198, 1366×768 · fr · 어두운 화면, 시험 환자 26-00002: Chest PA 09-15·09-28·09-30·10-01, Chest Lat, Hand X-Ray, Liver US, 불일치 Chest PA, 취소한 Chest PA, 미도착 하나 / 다른 환자 / 검사 하나뿐인 환자):
  - **나란히 놓임 (진짜 마우스로)**: 10-01 Chest PA를 엶 → 제목 아래 «⇆ Comparer avec Chest PA 2026-09-30» + «Autre examen… (7)». 단추를 누름 → 판독 칸 접힘, Stone 목록에 두 검사, 첫 칸에 10-01. Stone의 ▦ → 두 칸 → 다른 검사를 끌어다 놓음 → 왼쪽 10-01 · 오른쪽 전 검사, 영상 하나 **469×550**. 그 뒤로는 창이 두 칸으로 열림(Stone이 기억).
  - 목록에서 09-15를 고름 → Stone 목록이 「09-15 + 10-01」. «✕ Fin de la comparaison» → 검사 하나, 판독 칸 다시 나옴, **쓰던 판독 글 그대로**. 비교 중 새 탭 주소에 검사 둘, 끝내면 하나.
  - **연 검사가 먼저**: 20번 다시 열어 20번 모두 첫 칸에 연 검사(붙잡기 전에는 8번에 1번 어긋남).
  - 권하는 검사: 10-01 → 09-30, 09-28 → 09-15, 09-15(전 것 없음) → 09-28, Chest Lat → 같은 날 Chest PA(같은 장비·부위), Hand X-Ray·Liver US → 없음(목록만).
  - 검사 하나뿐인 환자: 줄 없음, 주소 전과 같음. 접기 단추만 있음(접으면 영상 칸 902 → 1282px).
  - 불일치 표시 오더: 자기 줄에서 열리고 빨간 경고 그대로, 비교 줄도 나옴. 한국어 화면: 「⇆ 이전 검사와 비교: Chest PA 2026-09-30」 「다른 검사… (7)」 「판독 칸 접기 ▸」 「✕ 비교 끝내기」.
  - 영상 창 제목 줄은 한 줄(1366×768, fr).
  - **보안·회귀 30가지 통과**: Stone 페이지·`app.js`가 Orthanc 것과 바이트 단위로 같음 3 / 끼우던 주소 403 / 연 검사·비교 검사 200 / 목록의 모든 비교 주소 열림 / 같은 환자라도 불일치·취소 검사 403(데이터, 주소에 끼운 페이지) / 다른 환자 검사 403(데이터, 주소에 끼운 페이지, 그것만 적은 페이지) / 맨 앞이 빈 주소·검사 없는 주소 403 / 한 질의에 번호 여럿·걸러지지 않은 목록·환자 번호로 묻기·Orthanc REST·tools/find 403 / 쿠키 없음 401 / 경로 우회 400 / 불일치·취소 오더는 자기 줄에서 열림 / 미도착 안내 / 검사 하나뿐인 환자 / 수납 계정 403.
- **알아 둘 것**:
  - **1366×768에서 판독 칸이 펴져 있으면 Stone의 도구 줄이 좁아져 ▦ 단추가 Orthanc 글자 밑에 겹칩니다**(Stone 배포판 그대로의 모양 — 전부터 그랬음). 비교를 시작하면 판독 칸이 접혀 보입니다. 비교가 아닐 때 화면을 나누고 싶으면 먼저 «Masquer le compte-rendu».
  - Stone이 나누기를 기억하므로, 한 번 두 칸으로 한 뒤에는 **검사 하나만 열어도** 창이 두 칸(오른쪽 「[ drop a series here ]」)으로 열립니다. 되돌리려면 ▦ → 한 칸. 설명서 8절에 적음.
  - 격리에서 본 것 하나: 브라우저 창이 **가려져 있는 동안**(다른 창 뒤, 최소화) 연 영상 창은 Stone이 그림을 올리지 않아 칸이 빈 채로 있고, 창을 앞으로 가져와 다시 열면 정상. Stone의 성질로 보이며 이번 변경과 무관(시험 도구의 가려진 창에서 봄).
- **확인 못 한 것**: 진짜 장비 영상에서의 속도(비교는 이제 검사 둘만 열므로 전 방식보다 가벼움). 밝은 화면. 느린 영상 서버에서 `openedFirst`의 1.5초 한도에 걸리는 경우(그러면 그 한 번은 순서가 보장되지 않음).
- **다른 세션에 부탁**: 진료 — 위 `Consultation.jsx` 변경을 알려 주세요(영상 창 안 6군데).

## 2026-10-01 — 이전 검사와 비교: 영상 창에서 같은 환자의 다른 날짜 검사를 나란히
> **이 항목의 「비교 단추」 부분은 합치지 않았습니다(라이선스 — Stone 페이지에 스크립트를 끼움).** 바로 위 항목으로 다시 지었습니다. 허락 범위·쿠키·권하는 검사·P-29는 그대로 살아 있습니다.


- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `b53a9c8`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **조사 (Stone이 무엇을 할 수 있나 — Orthanc 26.6.1에 든 Stone의 `app.js`를 읽음)**:
  - 주소 파라미터: `study`(**쉼표로 여럿 됨**) · `series` · `patient` · `selectedStudies` · `menu` · `token`. **화면 나누기(layout)·「이 검사를 오른쪽에」를 시키는 파라미터는 없음.**
  - `postMessage`: OsiriX 주석 싣기 하나뿐. 화면 나누기·검사 놓기는 없음.
  - 그래서 **바라신 3)의 「누르면 1×2로 나누고 바로 전 검사를 오른쪽에」** 는 공식 길로는 안 되고, Stone 페이지 안의 객체(`app.SetViewportLayout`, `app.SetViewportSeries` …)를 불러야 됨. 영상 창이 EMR과 같은 출처라 가능 — **그렇게 지었음**(아래). Stone이 바뀌면 단추만 안 먹고 영상 창은 그대로 동작하게 함.
- **한 일**:
  1. **허락 범위** (`pacs.routes.js` `viewer-url`, `comparableStudies`·`previousAlike`): 영상 창을 열 때 **같은 환자의 다른 영상 검사**도 함께 허락. 넣는 것 = EMR이 그 환자의 오더에 이은 검사 중 **취소 아님 · 영상 도착함 · 환자 번호가 맞음(`patient_check = 'match'`)**, 최근 것부터 최대 9건. **뺀 것과 이유**: 환자 번호 경고(빨강 mismatch·노랑 missing) — Stone 안에서는 경고를 보여 줄 수 없어 「다른 환자 것일 수 있는 영상」이 경고 없이 나란히 놓이게 됨 / 취소된 검사 — 취소 이유가 「잘못 냄·다른 환자」일 수 있음 / 미도착 — 볼 것이 없음. 이런 검사도 **자기 줄에서는 전처럼 열림**(경고와 함께).
  2. **권하는 검사**(`px_prev`): 같은 오더 코드의 바로 전 것 → 없으면 같은 코드의 바로 뒤 것 → 같은 modality+부위(Chest PA ↔ Chest Lat)의 전 것·뒤 것 → 없으면 없음. 순서는 방문 날짜·오더 번호.
  3. **중계** (`pacs.viewer.js`): 페이지의 `?study=A,B,…` 를 **하나하나** 쿠키와 대조(하나라도 아니면 403 안내). 쿠키는 최대 12개, **오더를 열 때마다 새로 씀**(아래 「알아 둘 것」). 검사가 여럿일 때만 Stone 페이지 끝에 우리 스크립트 한 줄을 끼움. 미도착·그림 없음 안내는 **연 검사(맨 앞)** 기준으로 전과 같음.
  4. **비교 단추** (새 파일 `backend/src/routes/pacs.viewer.compare.js` — 브라우저 코드, 중계가 `/api/pacs/viewer/px/compare.js`로 내줌): 영상 바로 위 30px 줄에 보라색 단추.
     - fr «⇆ Comparer avec Chest PA du 2026-09-28» + «7 autre(s) examen(s) de ce patient» / 권할 것이 없으면 «⇆ Comparer avec un autre examen»
     - ko 「⇆ 이전 검사와 비교: Chest PA 2026-09-28」 + 「이 환자의 다른 검사 7건」 / 「⇆ 다른 검사와 비교」
     - 누르면: 좌우 둘로 나눔, **왼쪽 = 연 검사, 오른쪽 = 권하는 검사**, 왼쪽 목록에 그 환자의 다른 검사 전부(연 검사 맨 위, 날짜 내림차순), 목록을 좁게. 목록에서 검사를 **누르기만 하면** 오른쪽이 바뀜(끌 필요 없음). 단추는 «✕ Fin de la comparaison (비교 끝내기)»로 바뀌고 옆에 «Pour changer l'image de droite, cliquez sur un examen dans la liste de gauche.»
     - 새 탭(«Ouvrir dans un onglet ↗»)에서도 같은 줄·단추.
- **바라신 모양과 다르게 한 것 (이유)**:
  - **1) 「다른 검사도 왼쪽 목록에 함께」 → 처음에는 연 검사만, 단추를 누르면 함께.** 이유: 오른쪽 판독 칸은 연 오더의 것인데, 목록에 다른 날짜 검사가 처음부터 섞여 있으면 썸네일을 잘못 눌러 **다른 날 영상을 보며 오늘 판독을 쓰는** 일이 생길 수 있음. 비교를 원할 때만 펼침. (다른 검사는 Stone의 검사 드롭다운에도 있어 손으로 고를 수도 있음.) 처음부터 다 보이게 바꾸는 것은 `viewer-url`의 `selectedStudies` 한 군데.
  - **3) 단추를 영상 창 머리(진료 파일 `Consultation.jsx`)가 아니라 영상 프로그램 쪽 맨 위 줄에.** 이유: 새 탭에서도 같은 단추가 있어야 하고(머리가 없음), 진료 파일을 건드리지 않음. `viewer-url` 응답에 `compare: {count, prev}`를 넣어 두었으니 머리에 글을 더 넣고 싶으면 쓸 수 있음.
  - **화면 나누기는 좌우(Stone 이름 `2x1`)** — 실장님 사진의 모양. Stone의 `1x2`는 위아래.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/pacs.viewer.js`, `backend/src/routes/pacs.viewer.compare.js`(새), `wiki/manual-fr/pacs.md`(4절 두 줄, 새 8절 «Comparer avec un examen précédent»), `wiki/modules/pacs.md`(2.3·새 2.3.1, 4절 viewer-url·쿠키·비교 단추, 7절 P-28·P-29, 8절), `wiki/reference/changelog-1.5.0/pacs.md`(새 절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음(읽기만). **번역 키**: 없음(단추 글은 영상 프로그램 쪽 스크립트 안의 fr·ko·en — EMR이 고른 언어 `localStorage.medconnect_lang`을 따름)
- **확인한 방법** (격리 EMR 9188 + PACS 9198 + 장비 흉내의 진짜 C-STORE, 1366×768 · fr · 어두운 화면. 시험 환자 26-00002에 Chest PA 09-15·09-28·10-01, Chest Lat 09-28, Hand X-Ray·Liver US 09-29, 환자 번호 불일치 Chest PA 하나, 취소한 Chest PA 하나, 미도착 하나 / 다른 환자 26-00001 / 검사 하나뿐인 26-00003):
  - **목록·나란히**: 10-01 Chest PA를 엶(처방 표 🖼, 목록 Voir image 둘 다) → 처음엔 그 검사만, 위에 «⇆ Comparer avec Chest PA du 2026-09-28 · 7 autre(s) examen(s) de ce patient». 단추를 **마우스로** 누름 → 왼쪽 10-01, 오른쪽 09-28, 목록에 8건. 목록에서 09-15를 누름 → 오른쪽이 09-15. «✕ Fin de la comparaison» → 한 칸, 목록도 연 검사만.
  - **권하는 검사**: 10-01 → 09-28(취소된 것·불일치인 것을 건너뜀), 09-28 → 09-15. (순서는 EMR의 방문 날짜·오더 번호로 정하고, 단추에 적히는 날짜는 영상 속 StudyDate.) Hand X-Ray → 권할 것 없음 «⇆ Comparer avec un autre examen» → 누르면 오른쪽이 비고 «Cliquez sur un examen dans la liste de gauche : il s'affiche à droite.» → 누르면 놓임.
  - **검사 하나뿐인 환자**: 주소·화면 모두 전과 같음(줄 없음, 스크립트 안 끼움).
  - **한국어**: 「⇆ 이전 검사와 비교: Chest PA 2026-09-28 · 이 환자의 다른 검사 7건」 / 「✕ 비교 끝내기」.
  - **판독 칸**: 비교 중에도 창 제목·판독 칸은 연 오더(Chest PA) 그대로, 입력 가능.
  - **안내와 충돌 없음**: 미도착 오더(다른 검사 8건 있음) → 「pas encore arrivées」 안내, 스크립트 없음. 그림 없는 자료만 온 검사 → 「données sans image」 안내(전과 같음). 영상 서버 꺼짐 안내는 이번에 다시 돌리지 않음(그 길은 안 바뀜).
  - **화면 나누기 기억**: 비교 중에 창을 닫아도 다음 창은 한 칸으로 열림(`localStorage.layout`이 `1x1` 그대로).
  - **보안·회귀 28가지 통과**: 연 검사·같은 환자 비교 검사 200 / **같은 환자라도 불일치 표시·취소된 검사 403** / **다른 환자 검사 403**(데이터, 그리고 주소에 끼워 넣은 페이지) / 맨 앞이 빈 주소·검사 없는 주소 403 / 한 질의에 번호 여럿 403 / 걸러지지 않은 목록·환자 번호로 묻기·Orthanc REST·tools/find 403 / 쿠키 없음 401(페이지·데이터·스크립트) / `/px/` 아래 다른 파일 403 / 경로 우회 400 / 불일치·취소 오더는 자기 줄에서 열림 / 수납 계정 viewer-url 403. 쿠키 크기 505바이트(8건).
  - **열리는 시간**: 8건을 함께 열 때 첫 영상과 단추가 나오기까지 약 0.8초, 요청 46개(격리, 작은 시험 영상).
- **1366×768에서 쓸 만한가 (의견)**:
  - 창 안에서 나누면 영상 하나가 **약 379×573** — 흉부 두 장을 견줘 보기에는 되지만 작음. **새 탭에서는 약 611×684씩** 이라 넉넉함 → 설명서에 「크게 비교하려면 Ouvrir dans un onglet ↗」을 적음.
  - **판독 칸을 접는 단추가 있으면 좋겠음**(창 안에서 약 560px씩). 진료 파일(`Consultation.jsx`) 몫이라 제안만 — 접었다 펴도 쓰던 판독이 지워지지 않게만 하면 됨.
- **확인 못 한 것**: 진짜 장비 영상(큰 CR·여러 시리즈의 초음파)에서의 속도 — 비교 목록의 검사는 열 때 **작은 그림과 목록 정보만** 받고 본 영상은 놓을 때 받지만, 검사가 9건이고 시리즈가 많으면 처음이 느려질 수 있음. 밝은 화면(줄은 영상 프로그램처럼 늘 어두움). 인쇄(줄은 인쇄에서 빼도록 했으나 찍어 보지 않음). Orthanc 이미지를 올린 뒤의 Stone.
- **알아 둘 것**:
  - **쿠키는 「한 번에 한 환자」**: 오더를 열 때마다 새로 씀. 새 탭으로 한 환자의 영상을 띄워 둔 채 다른 환자의 검사를 열면 먼저 띄운 탭은 새 영상을 더 못 받음. **전에도 그랬음** — 위키에는 「최근 5개를 이어 붙임」이라고 적혀 있었으나 브라우저가 쿠키를 `/viewer-url`로 보내지 않아(Path) 실제로는 늘 새로 써지고 있었고, 격리 브라우저에서 확인함. 코드·위키를 사실대로 고침(7절 P-29).
  - **실장님 사진의 「[ drop a series here ]」**: Stone이 손으로 고른 마지막 화면 나누기를 기억해서 다음 창도 나뉜 채 열린 것. 도구 줄 맨 왼쪽 격자 단추에서 한 칸짜리를 고르면 풀림(설명서 8절·위키 2.3.1에 적음). 비교 단추로 나눈 것은 기억에 남기지 않음.
  - 실행 중 자료의 Chest PA 두 건(09-28 · 09-30)과 Hand X-Ray: 둘 다 `match`이고 취소가 아니면 09-30을 열 때 «⇆ Comparer avec Chest PA du 2026-09-28»이 나와야 함(날짜는 영상 속 StudyDate).
- **다른 세션에 부탁**: (제안, 급하지 않음) 진료 — 영상 창의 판독 칸 접기 단추. 배포는 EMR backend만 다시 지으면 됨.

## 2026-10-01 — 영상이 아직 안 온 검사를 열면 빈 영상 창 대신 한 줄 안내

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `8615838`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: 영상 중계(`backend/src/routes/pacs.viewer.js`)가 영상 창 페이지를 열 때 하던 물음(`studyPictures`)에서, **Orthanc가 답했고 그 검사가 0건**이면 Stone 대신 안내 쪽(200)을 보냄. 그림 없는 자료 안내와 같은 방식(서버가 보내는 세 언어 쪽).
  - 보통(EMR에 도착 기록 없음) — `NOT_ARRIVED`:
    - fr 「Les images de cette demande ne sont pas encore arrivées. Elles apparaîtront ici quand l'examen aura été fait et envoyé par l'appareil : fermez cette fenêtre et rouvrez-la plus tard. Le compte-rendu peut être saisi à droite.」
    - ko 「이 검사의 영상이 아직 오지 않았습니다. 장비에서 촬영해 보내면 여기에 나옵니다 — 이 창을 닫았다가 나중에 다시 여세요. 판독은 오른쪽에 쓸 수 있습니다.」
    - en 「The images for this order have not arrived yet. …」
  - **시키신 것에 더한 것 하나** — EMR에는 도착이 적혀 있는데(`worklist_log.images_received_at`) 영상 서버에 없을 때 — `NOT_THERE`: fr 「L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas. Prévenez l'administrateur : elles sont peut-être à restaurer depuis la sauvegarde des images.」(ko·en 함께). 이유: 이 경우(PACS를 새로 깔았거나 영상 백업을 아직 안 되살림 — 위키 6.2 표에 있던 「목록은 N image(s) reçue(s)인데 영상 창은 빈 화면」)에 「아직 오지 않았습니다」라고 하면 목록과 어긋나고, 기다려도 오지 않음. 빼라고 하시면 한 줄(`arrivalNoted`)만 지우면 됨.
  - **물을 수 없을 때**(Orthanc가 느림·오류)는 전처럼 Stone을 엶 — 막지 않음. 꺼져 있으면 전처럼 「Le serveur d'images ne répond pas」.
  - 처방 표의 🖼든 목록의 Voir image든 같은 주소라 같은 안내. 목록의 Voir image 단추는 흐리게 하지 않음(총괄 결정).
- **바꾼 파일**: `backend/src/routes/pacs.viewer.js`, `wiki/manual-fr/pacs.md`(메시지 표 두 줄), `wiki/modules/pacs.md`(2.5, 4절 중계 7, 6.2 표, 8절), `wiki/reference/changelog-1.5.0/pacs.md`(Smaller changes 한 줄), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음(읽기만: `worklist_log`). **번역 키**: 없음(서버가 보내는 쪽 — 다른 영상 창 안내와 같은 자리)
- **확인한 방법** (격리 EMR 9188 + 격리 PACS 9198 + 장비 흉내 컨테이너의 진짜 C-STORE, 1366×768 · fr · 어두운 화면):
  - **(a) 영상 없는 오더 → 안내**: 오늘 낸 Chest PA(목록 «Images en attente»). 처방 표의 🖼로 열어도, 목록의 Voir image로 열어도 영상 칸에 안내 세 줄. 응답 약 7ms.
  - **(c) 판독 칸**: 안내가 떠 있는 채로 판독을 쓰고 💾 Enregistrer → «Compte-rendu enregistré ✓», 닫으면 목록의 그 줄에 글과 «Lu par».
  - **(b) 영상이 온 뒤**: 장비 흉내가 2장 보냄 → **보낸 직후**(EMR이 도착을 적기 전) 다시 열어도 Stone(그림), 75초 뒤 목록이 «2 image(s) reçue(s)», 화면에서 다시 열면 그림(570×603), 먼저 쓴 판독 그대로.
  - **도착 기록은 있는데 영상 서버에 없음**: 격리 Orthanc에서 시험 검사 하나를 지움 → 「L'EMR a noté l'arrivée …」 안내(약 6ms).
  - **물을 수 없음**: 격리 Orthanc를 멈춤 → 「Le serveur d'images ne répond pas」(전과 같음). 다시 켬.
  - 그림 있는 검사 → Stone, 그림 없는 자료만 온 검사 → 「données sans image」 안내 — 전과 같음.
  - **(d) 중계 회귀** 15가지 통과: 자기 검사 페이지·데이터·시리즈 질의 200 / 남의 검사 데이터·페이지 403 / 쿠키에 없는 번호·번호 없는 페이지 403 / 쿠키 없음(페이지·데이터) 401 / 걸러지지 않은 목록·Orthanc REST·`tools/find` 403 / `../`·`%2e%2e` 400 / 수납 계정의 `viewer-url` 403.
- **확인 못 한 것**: Orthanc가 **3초 넘게 느린** 경우(코드로는 물음을 포기하고 Stone을 엶 — 멈춘 경우만 시험). 밝은 화면(안내 쪽은 늘 검정 바탕). 진짜 장비.
- **알아 둘 것**: 장비가 **자기 검사 번호**로 보낸 영상(accession으로 잇는 경우)은 브리지가 이어 줄 때까지(1~2분) EMR이 아는 번호로는 영상 서버에 없으므로, 그 사이에 열면 「아직 오지 않았습니다」가 나옴 — 전에는 빈 영상 창이었고, 이어진 뒤 다시 열면 그림.
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 영상 창을 닫아도 목록이 남는 변경(총괄 `71dedec`): 격리 회귀 + 문서

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `71dedec`를 ff로 당긴 뒤). 문서만 — 코드는 고치지 않음(고칠 것이 보이지 않았음). **PACS 저장소** — 없음
- **한 일**: 총괄이 고친 것(`Consultation.jsx` — 목록의 `onOpen`이 목록을 닫지 않음, 영상 창이 닫히면 `readingsReload`↑ / `RadiologyReadings.jsx` — 새 prop `reload`, 같은 환자면 조용히 다시 읽음)을 격리에서 확인하고 문서를 맞춤.
  - `wiki/manual-fr/pacs.md` 6절 4·5번: 「**Voir image** ouvre la **Visionneuse** par-dessus la liste. Quand vous fermez l'image, la liste reste ouverte, au même endroit : vous pouvez ouvrir l'examen suivant tout de suite. Le compte-rendu que vous venez d'enregistrer y apparaît.」 / 「La liste se relit chaque fois que vous fermez une image. Sinon elle ne se met pas à jour toute seule …」
  - `wiki/modules/pacs.md` 2.4(목록이 남음·자리 유지·방금 저장한 판독이 보임·처방 표의 🖼는 전처럼), 5절(`props.reload`의 뜻과 진료 화면이 쓰는 방법), 8절.
- **바꾼 파일**: `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음
- **확인한 방법** (격리 EMR 9188 + 격리 PACS 9198, develop `71dedec`로 다시 지음, 1366×768 · fr · 어두운 화면, 시험 의사 계정, 영상 검사 28줄인 시험 환자):
  - **(a) 판독 저장 → 닫기 → 목록에 그 글**: 목록 15번째 줄(Chest Lat)의 Voir image → 영상 창(그림 570×603, 환자 불일치 빨간 경고 그대로)에서 판독을 쓰고 💾 Enregistrer → «Compte-rendu enregistré ✓» → Fermer ✕ → 목록이 열린 채, 그 줄에 방금 쓴 글과 «Lu par: RABE Hery · 2026-10-01».
  - **(b) 긴 목록의 자리**: 스크롤 1500px(전체 3210px)에서 열고 닫음 → 닫은 뒤 100ms·1.5초 모두 **1500px 그대로**, 스크롤 칸이 다시 만들어지지 않음, 「Loading…」 한 번도 안 뜸. 영상 창 바깥 어두운 곳을 눌러 닫아도 같음(목록까지 닫히지 않음).
  - **이어 보기**: 목록에서 7건을 잇달아 열고 닫음 — 모두 열리고(그림 있는 5건은 그림, 그림 없는 자료만 온 SONO 2건은 「Cette demande n'a reçu que des données sans image (1) …」 안내), 닫을 때마다 목록이 남음. 중계 요청 60여 개 중 403 없음(섞인 검사의 그림 없는 시리즈 작은 그림 400 한 번 — 전부터 있던 것, Orthanc의 답).
  - **(c) 처방 표의 🖼**: 목록을 닫고 처방 줄의 🖼 → 영상 창 → Fermer ✕ → **진료 화면**(목록은 열리지 않음).
  - **(d) 중계 회귀** 11가지 통과: 자기 검사 페이지·데이터·시리즈 질의 200 / 남의 검사 데이터·페이지 403 / 쿠키 없음 401 / 걸러지지 않은 목록 403 / Orthanc REST 403 / `../`·`%2e%2e` 400 / 수납 계정의 `viewer-url` 403.
- **확인 못 한 것**: 다시 읽기가 실패하는 경우(서버가 잠깐 끊김)에 목록이 남는지는 코드로만 봄(`catch`에서 조용한 읽기면 지우지 않음). 밝은 화면. 한국어·영어 화면(글자만 다름).
- **알아 둘 것 (전부터 그런 것, 이번에 안 바꿈)**: «Images en attente»(아직 영상이 안 온) 줄에도 **Voir image**가 있고, 누르면 빈 영상 창(Stone)이 열림 — 워크리스트로 보낸 검사는 번호가 이미 있어서. 닫으면 목록으로 돌아옴. 「아직 영상이 오지 않았습니다」 한 줄 안내로 바꿀지는 총괄·실장님 결정(중계가 Orthanc에 그 검사가 없을 때 안내를 내면 됨 — PACS 몫 `pacs.viewer.js`만으로 가능).
- **다른 세션에 부탁**: 없음.

## 2026-10-01 — 단추 이름 «Imagerie (영상/판독)»에 문서를 맞춤 (코드 변경 없음)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `b828129`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: 총괄이 바꾼 단추 이름(공용 키 `imagingList` = fr «Imagerie» · ko 「영상/판독」 · en "Imaging", 진료·수납의 단추와 목록 창 제목)에 PACS 몫 문서를 맞춤. **목록을 여는 단추**를 가리키는 곳만 «Imagerie»로, **영상 창 오른쪽 판독 칸**을 가리키는 «Compte-rendu»(키 `reading`)는 그대로.
  - `wiki/manual-fr/pacs.md` 6절: 「cliquez sur **🩻 Imagerie**」 + 한 줄 「Ne pas confondre : **Imagerie** ouvre la liste des examens du patient ; **Compte-rendu** est la case où le médecin écrit, à droite des images.」 / 수납 문장 「La caisse (**Paiement**) a le même bouton **🩻 Imagerie** …」. 4절(영상 창의 «Compte-rendu» 칸)은 그대로.
  - `wiki/modules/pacs.md`: 2.4에 이름이 바뀐 까닭과 두 이름의 구분을 적은 상자, 2.4·2.5·2.6·4·5절의 단추 이름, 8절 기록.
  - `wiki/reference/device-connection-onsite.md`(순서서): 「판독 목록」 → 「진료 화면의 **🩻 Imagerie (영상/판독)** 목록」. 「🖼 → Compte-rendu 칸에 소견을 적고」는 판독 칸이라 그대로.
  - `wiki/reference/integration-test-imaging-2026-09-30.md`: 맨 위에 「이 기록의 «Compte-rendu» 목록은 지금 «Imagerie»」 한 줄(기록 본문은 그날 화면 그대로 둠).
- **다른 모듈 장에 단추 이름으로 남은 「Compte-rendu / 판독소견」 (제가 고치지 않음 — 목록)**:
  | 파일 | 줄 | 지금 글 | 맡은 곳 |
  |---|---|---|---|
  | `wiki/manual-fr/consultation.md` | 22 | 파란 줄의 단추 목록 «…**Résultats labo**, **Compte-rendu**, **Dossier**» → **Imagerie** (이 줄에는 **⇄ Transfert**도 빠져 있음) | 진료 |
  | `wiki/manual-fr/consultation.md` | 106 | «Tous les comptes-rendus du patient : bouton **Compte-rendu** dans la barre bleue» → bouton **Imagerie** | 진료 |
  | `wiki/modules/consultation.md` | 144 | 단추 표 「**🩻 Compte-rendu (판독소견)** — 이 환자의 영상 판독 목록」 | 진료 |
  | `wiki/modules/consultation.md` | 110 | 「Compte-rendu 목록에도 같은 줄이 있습니다」 | 진료 |
  | `wiki/modules/payment.md` | 37 | 단추 표 「**🩻 Compte-rendu (판독소견)** — 영상 판독 소견 보기」 | 수납 |
  - 그대로 두어도 되는 것(판독 칸·수술 기록을 가리킴): `manual-fr/consultation.md` 102(«avec le **Compte-rendu** à droite»)·109–120(Compte-rendu opératoire), `modules/consultation.md` 14·109·154·168. `wiki/manual-fr/payment.md`에는 이 단추 얘기가 없음(넣을지는 수납 몫).
- **바꾼 파일**: `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/reference/device-connection-onsite.md`, `wiki/reference/integration-test-imaging-2026-09-30.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음(총괄의 `imagingList`를 읽기만 함)
- **확인한 방법** (격리 EMR 9188만, develop `b828129`로 다시 지은 것, 1366×768 · 프랑스어 · 어두운 화면, 시험 의사 계정): 진료 화면에서 환자를 부른 뒤 파란 환자 줄을 잼 —
  - 줄 높이 **40px, 한 줄**(넘침 없음: `scrollWidth` = `clientWidth` = 1366). 단추 6개(Sélection visite · Documents · Résultats labo · **🩻 Imagerie** · Dossier · ⇄ Transfert)와 의사·차트번호·이름·성별/생일이 모두 같은 줄, 잘린 글자 없음. 맨 오른쪽 끝 1193px — **173px 남음**.
  - «🩻 Imagerie» 단추 너비 101px(전의 «🩻 Compte-rendu»는 재지 않았으나 글자 수가 더 많았음).
  - 단추를 누르면 창 제목 **「🩻 Imagerie · 26-00001 · RAKOTO Jean」**, 목록 내용·«Voir image»·«Aucun compte-rendu»는 그대로.
  - 수납 화면은 코드로만 봄: `Payment.jsx` 448·609가 같은 키(`t.imagingList||t.reading`).
- **확인 못 한 것**: 수납 화면을 눈으로 보지는 않음. 알레르기 ⚠가 붙은 환자·이름이 아주 긴 환자의 줄(남는 폭 173px 안이면 한 줄). 한국어·영어 화면의 줄(「영상/판독」·"Imaging" 모두 «Imagerie»보다 짧거나 같음).
- **다른 세션에 부탁**: 위 표 — 진료 세션 4곳, 수납 세션 1곳.

## 2026-09-30 — 그림 없는 자료만 온 검사: 영상 창에 빈 칸 대신 한 줄 안내

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `f776201`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: EMR 영상 중계(`pacs.viewer.js`)가 영상 창 페이지를 열 때 그 검사에 **그림이 있는 객체가 하나라도 있는지** Orthanc에 물음(`studyPictures` — `/tools/find` → `/studies/<id>/instances` → 앞의 30개까지 `metadata?expand`의 `PixelDataOffset`, 저장된 로그인, 3초 제한). 하나도 없으면 Stone 대신 한 줄 안내 쪽:
  - fr 「Cette demande n'a reçu que des données sans image ({n}) — par exemple un rapport ou des mesures envoyés par l'appareil. Il n'y a rien à afficher ; le compte-rendu peut être saisi à droite.」
  - ko 「이 검사에는 그림이 없는 자료만 왔습니다({n}개) — 장비가 보낸 보고서·측정값 같은 것. 보여 줄 영상이 없습니다. 판독은 오른쪽에 쓸 수 있습니다.」
  - en 「Only data without a picture arrived for this order ({n}) — …」
  - 그림이 섞인 검사, 물을 수 없을 때(Orthanc가 느림·찾지 못함)는 보통처럼 Stone — 확인이 영상 창을 막지 않음.
- **px_ 키가 아닌 이유**: 이 안내는 **Stone이 들어갈 자리(iframe)에 서버가 보내는 쪽**이라, 다른 영상 창 안내(짝 안 맞음·응답 없음·시간 끝·권한 없음)와 같이 `pacs.viewer.js` 안의 세 언어 문장으로 둠. 화면(React) 번역 파일을 거치지 않음. 영상 창 머리(진료 파일 `Consultation.jsx`)는 바꾸지 않음.
- **바꾼 파일**: `backend/src/routes/pacs.viewer.js`, `wiki/manual-fr/pacs.md`(메시지 표 한 줄), `wiki/reference/device-connection-onsite.md`(④ 한 줄), `wiki/modules/pacs.md`(4절 중계 7, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음(위 이유)
- **확인한 방법** (격리 9188 + 9198, 모르는 종류 받기 켠 Orthanc, 장비 흉내로 진짜 C-STORE): 그림 없는 전용 자료만 → 안내 쪽(200) / 보통 영상 → Stone / 그림 있는 전용 종류 → Stone / 그림 없는 것 + 보통 섞인 검사 → Stone. 더해진 시간 약 20ms(`index.html` 한 번). 진료 화면 → Compte-rendu → Voir image(1366×768, fr, 어두운 화면)에서 안내가 영상 칸에, 판독 칸은 오른쪽 그대로. 중계 회귀 6가지(자기 검사 페이지·데이터 200, 남의 검사 403, 쿠키 없음 401, 목록 403, 경로 우회 400) 통과.
- **확인 못 한 것**: 옛 Orthanc(1.9.1 이전)가 저장한 색인을 `storage` 폴더째 옮긴 경우(`PixelDataOffset`이 없을 수 있어 그림이 있는데도 안내가 뜰 수 있음 — 이번 설치는 새것이고, 영상 백업 복원은 영상을 다시 받아 들이므로 해당 없음), 수백 장 검사의 첫 30개가 모두 그림 없는 경우(드묾 — 그러면 안내가 뜸).
- **다른 세션에 부탁**: 없음.

## 2026-09-30 — 모르는 영상 종류도 받음 (총괄 결정) · device-watch 경고 거르기

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `4247b66`을 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `71f1e87`
- **한 일**
  1. **잡음 거르기** — device-watch의 「영상 서버 알림」을 Orthanc **DICOM 스레드(`DICOM-SERVER`, `DICOM-n`)의 W/E 줄**로 좁힘. HTTP 스레드(관리 화면·EMR 영상 창·브리지), `WL HOUSEKEEPER`, `W001:`처럼 코드 달린 알림은 뺌. 남는 것은 쉬운 말 한 줄(연결 거절 / 도중에 끊김 / 저장 못 함 / 읽지 못함 / 그 밖) + 괄호에 원문(160자까지). 두 단어 스레드 이름(`WL HOUSEKEEPER`)도 맞게 읽음. README에 남기는 것·버리는 것 한 줄.
  2. **`ORTHANC__UNKNOWN_SOP_CLASS_ACCEPTED: "true"`** — PACS `docker-compose.yml`(주석: 이유·디스크·되돌리는 법). 격리에서:
     - (a) 제조사 전용 종류 저장: 그림 있음(`1.2.840.113619.4.30`)·그림 없음(`1.2.840.113619.4.26`, PixelData 뺌) **둘 다 저장됨**(장비 쪽 C-STORE 200). 설정 전에는 그림 있는 것도 거절됐음.
     - (b) EMR 기록: 브리지가 보통처럼 보고 → `worklist_log` `completed`·`image_count 1`·`patient_check match` → 진료 화면 「Réalisé」, 판독 목록 「1 image(s) reçue(s)」(보통 영상과 구별 안 됨). 영상 창: 그림 있는 전용 종류는 썸네일·그림이 나옴(DICOMweb `rendered` 200), **그림 없는 것은 눈에 줄 그은 썸네일 + 빈 칸**(`rendered` 400, 오류 창은 없음).
     - (c) device-watch: 「↳ 제조사 전용 영상 종류(1.2.840.113619.4.30) — 서버에 저장했지만 영상 창에서는 안 보일 수 있습니다.」, 그림 없는 것은 「↳ 그림이 없는 자료 1개(보고서·측정값·원자료 등) …」도. 그 검사의 1~2분 뒤 줄은 「EMR에 기록됨 — …: 「Réalisé」. 영상 창에 그림이 안 나올 수 있음(눈에 줄 그은 작은 그림) — 위 줄 참고」(전에는 「영상 창에서 볼 수 있음」). fr·ko로 확인.
     - (d) 보통 영상: 그대로(저장·연결·「볼 수 있음」).
     - 영상 백업·복원은 종류와 관계없이 파일 그대로(REST).
  3. README(모르는 종류를 받는다는 것·디스크·되돌리기, 경고 거르기), 순서서 ④ 표(전용 종류·그림 없는 자료 줄, 「끊음」은 이제 전송 방식 쪽), 순서서 끝(되돌리는 법), 위키 6.3·8절.
- **바꾼 파일**: PACS `docker-compose.yml`, `device-watch.ps1`, `README.md`. EMR `wiki/reference/device-connection-onsite.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음
- **확인한 방법**: 격리 9188 + 9198(새 설정으로 Orthanc 다시 만듦, `env`에 값 확인), 장비 흉내 = 임시 Orthanc `XRAY01`(진짜 C-STORE). 경고 거르기는 표본 줄 5개(HTTP의 W001 / `WL HOUSEKEEPER` / `DICOM-SERVER` 거절 / `DICOM-3`의 `W002:` / `DICOM-2` 저장 실패)로 — 뒤의 둘 중 `W002:`는 빠지고 거절·저장 실패만 남음. 진짜 Orthanc가 DICOM 스레드에 W/E를 쓰는 경우는 이번 시험에서 만들지 못함(거절 사례가 없어짐).
- **실행 중 PACS에 올릴 때 주의 (총괄)**
  - `docker-compose.yml`의 Orthanc 환경 변수가 바뀌므로 `docker compose up -d`가 **Orthanc 컨테이너를 다시 만듦** — 몇 초~수십 초 동안 영상 창·장비 연결이 끊김. 장비가 영상을 보내는 중이 아닐 때(환자 없을 때).
  - 영상·색인은 `./storage`(볼륨)에 있어 그대로. 워크리스트 `.wl`도 `./worklists`에 그대로, 브리지는 다시 만들 필요 없음(`up -d`가 바뀐 서비스만).
  - 올린 뒤 확인: `docker exec bethesda-pacs sh -c 'env | grep UNKNOWN'` → `true`, 영상 창이 열리는지, EMR 상태 점 초록, `device-watch.bat` 「기다리는 중」.
  - Orthanc가 다시 시작되면 로그 수준도 설정값으로 돌아감(누가 -Detail을 켜 두었어도).
  - device-watch 파일은 이번에 `device-watch.ps1`만 바뀜(.bat 그대로) — 복사.
- **확인 못 한 것**: 진짜 옛 후지·GE 장비가 실제로 무엇을 보내는지, 전용 종류의 큰 원자료(수십 MB)가 디스크를 얼마나 쓰는지.
- **다른 세션에 부탁**: 없음.

## 2026-09-30 — 현지 장비 연결: `device-watch` 도구와 순서서

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `2162379`를 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `cec7aee`
- **한 일**
  1. **PACS `device-watch.ps1` + `device-watch.bat`**(더블클릭 = `-Detail`) — 장비가 하는 일을 사람 말로 한 줄씩. 한국어 기본, `-Lang fr|en`. 위키 6.3에 읽는 곳·줄 모양. 요약:
     - 영상 받음(어느 로그 수준에서도 — Orthanc `/changes` + 인스턴스 태그·메타데이터) → EMR 오더와 맞춤(EMR DB **읽기만**) → 1~2분 뒤 「EMR에 기록됨」.
     - 연결·연결 시험·목록 조회·「0명」의 이유(목록 없음 / Station AE 거르기 / Modality 거르기 / 날짜 / 그 밖) — Orthanc 로그, **verbose일 때만** 나옴.
     - 연결했다가 아무것도 안 하고 끊음(= 서버가 영상 종류·전송 방식을 안 받은 모습), 틀린 서버 이름(Called AE), 브리지 오류(쉬운 말로).
     - `-Ping <IP> [-DevicePort] [-DeviceAet]` — ping·포트·C-ECHO(`/tools/dicom-echo`, 장비 등록 없음).
     - **`-Detail`은 Orthanc 로그 수준을 REST로 올림**(`generic`·`dicom`·`plugins`, `http`는 그대로) — 화면에 그렇게 말하고, Ctrl+C에 **자기가 올린 것만** 되돌림. 창을 X로 닫았으면 `-Reset`. 설정 파일은 안 건드림, Orthanc 재시작으로도 원래대로.
     - PACS `README.md`에 절 하나(+ 「내 AE만」 거르기를 끄라는 줄, 제 UID를 쓰는 장비는 accession으로 이어짐).
  2. **순서서 `wiki/reference/device-connection-onsite.md`**(한국어, 실장님용) — 한눈에, 시작 전에(고정 IP, 장비에 넣을 값 셋, device-watch 켜기, 시험 검사), 장비에서 찾을 것(일반론), 장비 종류별 메모(**모르는 것은 「확인 필요」** — 후지 CR/DR 콘솔, GE 초음파의 DICOM 옵션 키, 내시경 캡처 프로그램), 단계와 판정 ①~⑤(device-watch의 글자 그대로), 워크리스트가 안 되는 장비, 전송도 안 되는 장비, EMR 쪽 설정(Modality 맞추기, Station AE는 지금 안 씀), 찍어 둘 사진, 그날 채울 칸.
  3. 위키 6.3(도구·조사 결과·시험), 8절.
- **조사에서 알게 된 것** (격리 Orthanc 26.6.1)
  - 기본 로그 수준에서는 장비의 연결·C-ECHO·C-FIND·C-STORE가 **아무것도 안 남음**.
  - Called AE를 틀려도 받음(`DICOM_CHECK_CALLED_AET=false`).
  - JPEG 압축은 받음. **제조사 전용 SOP Class는 조용히 거절** — PACS 로그에는 verbose에서도 「연결 → 끊김」뿐, 장비 쪽에만 오류. 받게 하려면 `ORTHANC__UNKNOWN_SOP_CLASS_ACCEPTED=true`(설정 변경 — **결정 필요, 하지 않음**). 옛 GE 초음파가 표준 US 종류로 보내는지는 확인 필요.
  - Orthanc 워크리스트 플러그인도 study가 stable해지면 `.wl`을 지움(브리지 삭제와 겹치나 해 없음).
- **바꾼 파일**: PACS `device-watch.ps1`(새, UTF-8 BOM — PowerShell 5.1이 한국어·프랑스어를 읽게), `device-watch.bat`(새, CRLF), `README.md`. EMR `wiki/reference/device-connection-onsite.md`(새), `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음(도구 안의 세 언어 문장)
- **확인한 방법** (격리 EMR 9188 + PACS 9198/11298, 장비 흉내 = 임시 Orthanc 컨테이너 `XRAY01`이 진짜 DICOM으로 C-ECHO·C-FIND·C-STORE, 호스트 포트 없음)
  - 연결 시험(맞는/틀린 서버 이름), 목록(6명 · Station AE 거르기 0 · MR만 0 · 날짜 0 · 서버에 목록 없음 0), 영상(맞는 번호 · 다른 번호 · 번호 없음 · 제 UID · JPEG · 제조사 전용 종류 · 손으로 친 환자), 1~2분 뒤 EMR 기록, 격리 EMR API를 40초 멈춤(브리지 오류 줄), `-Ping`(Docker 안 장비 이름 → C-ECHO 응답 / 없는 주소 → 모두 실패), `-Reset`, 조용한 모드(fr), en. 도구가 낸 줄이 순서서의 표와 같음.
  - 처음 돌렸을 때 찾아 고친 것: 요청 줄의 IP가 쉼표까지 잡혀 모든 연결을 「아무것도 안 하고 끊음」으로 봄 → 고침. Docker 시각 길이가 달라 글자로 비교하면 순서가 틀림 → 시각으로 비교. `-Detail`이 이미 verbose였던 것까지 「되돌렸다」고 말함 → 자기가 올린 것만.
  - 끝날 때 격리 Orthanc 로그 수준 `default` 확인. 실행 중 EMR·PACS(`C:\Bethesda-EMR`·`C:\Bethesda-PACS`) 안 건드림.
- **확인 못 한 것**: 진짜 장비(메뉴·옵션·압축·동영상), 서버 PC의 진짜 콘솔 창에서 Ctrl+C로 끝내기(PowerShell `finally`가 Ctrl+C에 도는 것에 기댐 — 시험은 `-Seconds`로 끝냄), 장비 IP가 다른 대역일 때, 한국어 글자가 장비에서 깨지는지.
- **다른 세션에 부탁**
  - **총괄**: ① 제조사 전용 영상 종류를 받을지(`UnknownSopClassAccepted`) — 현지에서 「연결했다가 끊음」이 뜨면 그때 정해도 됨. ② 실행 중 PC에 올릴 때 PACS 폴더에 `device-watch.ps1`·`.bat`만 복사(다시 빌드 필요 없음). ③ 장비 설치 날 사진을 받으면 순서서의 「확인 필요」를 채우고 프랑스어 설명서의 장비 메뉴 자리(`manual-fr/pacs.md` à revoir)도.

## 2026-09-30 — 영상 서버 검사를 하나로 · 설정 화면과 상태 점이 같은 말 · 설명서 정리

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `73b0000`을 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `e016052`(README 한 줄)
- **한 일**
  1. **검사 하나로** — 설정 세션의 `backend/src/services/pacs-probe.js`(`probeOrthanc`, `DEFAULT_URL`)만 남김. `pacs.viewer.js`의 두 번째 검사(`probeOrthanc`·`PROBE_MSG`·`DEFAULT_ORTHANC_URL`)를 지우고, 중계의 기본 주소도 그 파일의 `DEFAULT_URL`을 씀. `pacs.routes.js`의 저장 때 검사(`orthanc_check`)와 `GET /test?target=orthanc`가 그 함수를 부르고 답은 그 모양 그대로 `{url, state, version?, code?}`.
  2. **같은 말** — 설정 화면(`Settings.jsx` `pxRelayCheck`)이 `state`를 **상태 점의 문장 `se_sys_pacsRelay_<state>`**(설정 세션 키, `{url}`·`{code}`·`{version}` 채움)로 보여 줌 → 칸 아래 경고의 이유와 시험 줄이 상태 점 「Visionneuse → serveur d'images」 줄과 글자까지 같음. 내 문구 키 5개(`px_orthancOk`·`px_orthancBadUrl`·`px_orthancRefused`·`px_orthancLogin`·`px_orthancNotOrthanc`)는 지움. 남은 PACS 키도 상태 줄 이름에 맞춤: `px_testOrthancBtn` 「Tester : visionneuse → serveur d'images」 / 「시험: 영상 창 → 영상 서버」 / 「Test: viewer → image server」, `px_orthancUnreachable` 「Avec cette adresse, la visionneuse n'atteint pas le serveur d'images — les images ne s'ouvriront pas.」 / 「이 주소로는 영상 창이 영상 서버에 닿지 못합니다 — 영상이 열리지 않습니다.」 / 「At this address the viewer cannot reach the image server - images will not open.」(뒤에 붙는 이유 문장이 기본 주소를 이미 말하므로 겹치던 「en général …」 뺌).
  3. `manual-fr/pacs.md` — 「Envoyé」 `<!-- à revoir -->` 지움(진료 `2a9f5bd`), 관리자 단락을 새 단추 이름과 답(「Joignable (Orthanc …)」, 상태 점과 같은 문장)으로.
  4. PACS `README.md` — 새 두 검사(다른 프로그램이 포트를 들음, 브리지가 EMR에 닿는지)는 `setup.ps1`에만 있고 `setup.sh`에는 없다는 한 줄(현지 서버는 Windows PC — 그대로 둠).
  5. 위키 4절(`orthanc_check` 모양·한 함수), 6절 칸 설명, 7절 P-27, 8절.
- **바꾼 파일**: `backend/src/routes/pacs.viewer.js`, `backend/src/routes/pacs.routes.js`, `frontend/src/pages/Settings.jsx`(PACS 탭), `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`. PACS `README.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 사이에서 키 5개 지움, 이번 세션이 만든 키 2개(`px_testOrthancBtn`·`px_orthancUnreachable`) 문구 바꿈. 설정 세션 키(`se_sys_pacsRelay_*`)는 읽기만. `services/pacs-probe.js`(설정 세션 파일)는 고치지 않음.
- **DB 마이그레이션**: 없음
- **확인한 방법** (격리 9188 + 9198): API — 이 PC의 LAN 주소 → `refused`, EMR 자신(9188) → `notOrthanc` `code 200`, `no-such-host.invalid` → `unknownHost`, `not a url` → `badAddress`, 맞는 주소 → `ok` `version 1.12.11`. 저장 답·시험 답·상태 줄 `pacs_relay`(`status.pacsRelay.ok`, 같은 version)이 모두 같음. 화면(fr): LAN 주소 저장 → 「⚠ Avec cette adresse, la visionneuse n'atteint pas le serveur d'images … (Rien ne répond à http://192.168.10.229:9198 — le serveur d'images est arrêté, ou l'adresse ou le port est faux (en général http://host.docker.internal:9090))」, 맞는 주소 → 경고 없음, 시험 단추 → 「✓ Joignable (Orthanc 1.12.11)」. 프런트 빌드 통과. 중계는 기본 주소 상수만 바뀜.
- **확인 못 한 것**: `timeout`·`unauthorized` 상태를 화면에서(같은 함수라 설정 세션 시험에 기댐 — 지난번 내 검사로는 401을 화면까지 봤음).
- **다른 세션에 부탁**: 없음. (설정 세션: `se_sys_pacsRelay_*` 문장을 바꾸면 설정 화면의 오더 연동 탭 문구도 같이 바뀝니다 — 일부러 그렇게 묶었습니다.)

## 2026-09-30 — 클린 설치에서 나온 둘: 다른 프로그램이 EMR 포트를 차지 (P-26) · 영상 서버 주소를 잘못 넣음 (P-27)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `97a8841`을 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `59b67a1` (먼저 `main` `65203e0 v1.1.0`으로 ff)
- **한 일 — ① 다른 프로그램이 포트를 들음 (PACS 저장소)**
  - `check-windows-ports.ps1`: 9080·9090·4242(`-ListenPorts`)를 **Docker가 아닌 프로세스**가 듣고 있으면(127.0.0.1만 묶은 것 포함) 「WARNING: port 9080 is already used by another program: <이름> (listening on 127.0.0.1)」 + 실행 파일 경로 + 「Close that program … or change the port」. Docker 쪽으로 보는 이름: `com.docker.backend`, `com.docker.proxy`, `wslrelay`, `vpnkit`, `docker-proxy`(이 PC에서 확인한 것은 앞의 둘). 예약 구간 경고와 따로 나옴.
  - `bridge/bridge.py`: 피드 답이 EMR이 내지 않는 상태 코드(200·401·403·500·502 밖)이거나 JSON이 아니거나 `rows` 없는 JSON이면 오류 「Something other than the EMR answered at <주소> (<이유>, HTTP <코드>, <형식>). Another program on the server PC may be using the EMR's port (in 2026-09: a download manager on 127.0.0.1:9080). Close it, or run check-windows-ports.ps1 …」. 피드가 제대로 답한 바퀴마다 `/worklists/.feed_ok`.
  - `docker-compose.yml` 브리지 healthcheck: `.heartbeat` 60초 **그리고** `.feed_ok` 120초 안 — 피드가 2분 넘게 답하지 않으면 unhealthy(전: 프로세스만 살아 있으면 healthy).
  - `setup.ps1`: EMR DB 컨테이너가 이 PC에 있으면 끝에서 최대 75초 `worklists\.feed_ok`가 시작 뒤에 새로 쓰이는지 봄 → 「The worklist bridge reaches the EMR - orders will go to the devices.」 또는 노란 「WARNING - the worklist bridge does NOT reach the EMR yet.」 + 브리지의 마지막 `bridge error` + 할 일. `setup.sh`는 고치지 않음(실장님 결정 — .sh 더 만들지 않음).
  - `README.md`: 문제 해결에 두 항목.
- **한 일 — ② 영상 서버 주소 (EMR 저장소)**
  - `pacs.viewer.js`: `probeOrthanc(url, password)` — `<url>/system`에 `admin:<저장된 비밀번호>`, 4초. 답은 고정 영어 `PROBE_MSG`(아래). `DEFAULT_ORTHANC_URL`을 내보냄(중계도 같은 값을 씀).
  - `pacs.routes.js`: `PUT /config`의 답에 **`orthanc_check`**(저장은 결과와 관계없이 됨), `GET /test?target=orthanc` → `{url, ok, status, message}`.
  - `Settings.jsx`(PACS 탭): 칸 이름을 더 세게, 칸 옆 **「Par défaut」**, 칸 아래 도움말, 저장 뒤 닿지 않으면 빨강 경고 + 이유, DICOM 시험 옆에 **「Tester le serveur d'images (EMR → 9090)」**. `pxMessage`가 `PROBE_MSG`를 옮김.
  - 위키 3.3·4·6·6.1·7(P-26·P-27)·8, `manual-fr/pacs.md` 끝에 관리자용 한 단락.
- **바꾼 파일**: PACS `check-windows-ports.ps1`, `bridge/bridge.py`, `docker-compose.yml`, `setup.ps1`, `README.md`. EMR `backend/src/routes/pacs.viewer.js`, `backend/src/routes/pacs.routes.js`, `frontend/src/pages/Settings.jsx`(PACS 탭 부분), `wiki/modules/pacs.md`, `wiki/manual-fr/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 사이에 키 9개 + **기존 키 `px_orthancUrl` 문구 변경**(세 언어): fr 「Adresse du serveur d'images vue de l'intérieur du PC serveur (ne pas modifier)」 / ko 「서버 PC 안에서 EMR이 영상 서버를 부르는 주소 (그대로 두세요)」 / en 「Address the EMR uses inside the server PC to call the image server (leave as is)」.
- **DB 마이그레이션**: 없음
- **번역 키 (새, fr / ko)**
  - `px_orthancUrlHelp` — 「Ce n'est pas une adresse pour les autres postes. Le serveur d'images n'écoute que sur le PC serveur : avec l'adresse réseau de ce PC (192.168…), la visionneuse reste vide. En général : http://host.docker.internal:9090, sans rien changer.」 / 「다른 PC에서 쓰는 주소가 아닙니다. 영상 서버는 서버 PC 안에서만 열려 있어, 이 PC의 LAN 주소(192.168…)를 넣으면 영상 창이 열리지 않습니다. 보통 http://host.docker.internal:9090 그대로입니다.」
  - `px_orthancUrlDefault` — 「Par défaut」 / 「기본값으로」
  - `px_orthancUnreachable` — 「Avec cette adresse, l'EMR n'atteint pas le serveur d'images — la visionneuse ne s'ouvrira pas. En général, on laisse http://host.docker.internal:9090.」 / 「이 주소로는 EMR이 영상 서버에 닿지 못합니다 — 영상 창이 열리지 않습니다. …」
  - `px_testOrthancBtn` — 「Tester le serveur d'images (EMR → 9090)」 / 「영상 서버 연결 시험 (EMR → 9090)」
  - `px_orthancOk` · `px_orthancBadUrl` · `px_orthancRefused` · `px_orthancLogin` · `px_orthancNotOrthanc` — 「L'EMR atteint le serveur d'images.」 · 「Adresse invalide (elle doit commencer par http://).」 · 「Pas de serveur d'images à cette adresse.」 · 「Le serveur d'images refuse le mot de passe enregistré — lancez pair-with-emr.ps1 dans le dossier du PACS.」 · 「À cette adresse, ce n'est pas le serveur d'images qui répond.」
- **확인한 방법** (격리 9188 + 9198/11298, 실행 중 EMR·PACS 안 건드림)
  - ①: 127.0.0.1:9197에 PikPak과 같은 답(HTTP 480 text/plain)을 하는 흉내 → `check-windows-ports.ps1 -ListenPorts 9197`이 `python … (listening on 127.0.0.1)`·경로로 경고, exit 1. 격리 브리지를 그쪽으로(`SESSION_EMR_FEED_URL`) → 로그에 위 문장, **150초 뒤 unhealthy** → 진짜 EMR로 되돌리니 6초 뒤 healthy. 이 PC의 실제 포트로는 경고 없음(exit 0). `setup.ps1`: 문법 검사 + 기다리기 부분을 떼어 내 시험(시작 뒤 새 `.feed_ok` → 닿음, 옛 파일·없음 → 경고). **setup 전체는 돌리지 않음**(개발 PC 규칙).
  - ②: API — 이 PC의 LAN 주소(192.168.10.229:9198) → `not reachable`, EMR 자신(9188) → `Something other…`(200인데 Orthanc 아님), `ftp://` → `not a valid`, 맞는 주소 → `answers`, DB 비밀번호를 틀리게 → 401 `refused the stored password`(뒤에 `pair-with-emr`로 되돌림). 화면(fr, 1366×768): LAN 주소 저장 → 칸 아래 빨강 경고와 이유, 「Par défaut」 → `http://host.docker.internal:9090`, 맞는 주소 저장 → 경고 사라짐, 두 시험 단추 → 「✓ Le port DICOM du PACS répond. (…:11298)」·「✓ L'EMR atteint le serveur d'images. (http://host.docker.internal:9198)」. 영상 중계 회귀(페이지·데이터 200).
- **확인 못 한 것**: 실제 PikPak, 실제 LAN에서 다른 PC, `setup.ps1 -Offline` 전체 실행, 설정 세션의 상태 줄(아래).
- **다른 세션에 부탁**
  - **설정** — 상태 화면(`status.routes.js`)에 **「영상 창 (EMR → 영상 서버)」 한 줄**, `checkPacs`(4242)와 별개. 모양 제안:
    ```js
    // PACS 세션 pacs.viewer.js가 내보냄: probeOrthanc(url, password) -> {ok, status?, message}, DEFAULT_ORTHANC_URL
    const { probeOrthanc, DEFAULT_ORTHANC_URL } = require('./pacs.viewer');
    async function checkViewerRelay() {
      const c = (await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1')).rows[0] || {};
      const url = c.orthanc_url || DEFAULT_ORTHANC_URL;
      if (!c.orthanc_password) return { key: 'pacs_viewer', state: 'warn', message: 'status.pacsViewer.notPaired', values: { url } };
      const r = await probeOrthanc(url, c.orthanc_password);        // 4초 제한
      if (r.ok) return { key: 'pacs_viewer', state: 'ok', message: 'status.pacsViewer.ok', values: { url } };
      const m = { 401: 'status.pacsViewer.login' }[r.status] || (/not a valid/.test(r.message) ? 'status.pacsViewer.badUrl'
              : /Something other/.test(r.message) ? 'status.pacsViewer.notOrthanc' : 'status.pacsViewer.unreachable');
      return { key: 'pacs_viewer', state: 'warn', message: m, values: { url } };
    }
    ```
    문구 제안(fr): ok 「La visionneuse atteint le serveur d'images」, unreachable 「La visionneuse n'atteint pas le serveur d'images ({url}) — Paramètres → Flux d'ordres → Par défaut」, login 「Mot de passe du serveur d'images refusé — lancer pair-with-emr.ps1」, notPaired 「Serveur d'images pas encore relié — lancer pair-with-emr.ps1」, notOrthanc 「À {url}, ce n'est pas le serveur d'images」, badUrl 「Adresse du serveur d'images invalide」. 비밀번호는 `values`에 넣지 말 것. 서버 상태 창(`server-status.ps1`)은 EMR API에 로그인하지 않으므로, 넣는다면 `docker exec bethesda-emr-api node -e …`로 같은 함수를 부르는 방법(선택).
  - **총괄** — 실행 중 PC에 올릴 때: PACS는 브리지 이미지 다시 빌드(`bridge.py`) + compose 재생성(healthcheck). 이 PC의 PikPak이 다시 켜지면 이제 브리지가 unhealthy가 되고 로그에 이유가 남음. 실행 중 EMR의 `orthanc_url`이 아직 `http://192.168.10.229:9090`이면 설정 화면에 빨강 경고가 뜰 것 — 「Par défaut」로 되돌리기(실장님).

## 2026-09-30 — 영상이 있는 하루 통합 시험 · 영상 창 안내 쪽 · 취소된 판독 카드

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 보고서 `e3711ec`(고치기 전), 고침·위키는 이 항목이 들어간 커밋 (develop `33a81d2`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**
  1. **시험**(총괄 할 일 1, ①~⑨): 보고서 `wiki/reference/integration-test-imaging-2026-09-30.md` — 단계별 표(한 것 · 뜬 것 · 설명서와 다른 곳 · 막힌 곳)와 세션별 고칠 것(A/B/C). 새 DB 격리 EMR 9188 + 빈 격리 PACS 9198/11298, **장비 대신 임시 Orthanc 컨테이너**(`bethesda-s-pacs-device`, AET XRAY01, 호스트 포트 없음)가 진짜 DICOM으로 워크리스트 C-FIND·영상 C-STORE. 1366×768, 프랑스어, 어두운·밝은 화면. **A 없음.**
  2. **보고 뒤 고침(PACS 몫)**
     - `pacs.viewer.js`: 영상 창 페이지(`index.html`)의 `?study=`가 쿠키의 검사가 아니거나 없으면 **403 안내 쪽** 「Cette image n'a pas été ouverte depuis une demande d'imagerie. Ouvrez-la avec le bouton 🖼 dans l'écran Consultation.」(전: 검은 화면에 점 하나). 비활성·진료 권한 없는 계정의 페이지도 안내 쪽 「Ce compte ne peut plus ouvrir les images …」(전: JSON 글자). 안내 쪽 영어 줄 색 `#64748b` → `#8290a3`(검정 위 4.4 → 기준 통과, 디자인 `--viewer-text` 값). 데이터 요청의 답은 그대로.
     - `RadiologyReadings.jsx`(총괄 할 일 2): 취소된 카드의 `opacity: 0.6` 뺌 → 날짜·이름 `--text-3`, 이름 줄긋기, 종류 꼬리표 회색(`--btn-neutral-2`/`--text-soft-2`, 「Annulé」 꼬리표와 같은 색), 도착 글자 회색, **점선 테두리**. 경고 상자(빨강·노랑)는 그대로 — 취소돼도 알아야 하므로.
  3. `manual-fr/pacs.md` 메시지 표에 새 두 줄, §1-3 「Envoyé」에 `<!-- à revoir -->`. 위키 4절(중계 3′·5), 8절.
- **바꾼 파일**: `backend/src/routes/pacs.viewer.js`, `frontend/src/components/RadiologyReadings.jsx`, `wiki/reference/integration-test-imaging-2026-09-30.md`(새), `wiki/manual-fr/pacs.md`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음(번역 키 없음 — 안내 쪽 문장은 `pacs.viewer.js` 안의 세 언어 그대로). **DB 마이그레이션**: 없음
- **확인한 방법**: 보고서의 단계 전부 + 고친 뒤 격리 9188에서 중계 12가지(자기 검사 페이지·데이터 200, 남의 검사 페이지 403 안내, `?study=` 없음 403 안내, 남의 데이터·목록 403, 정적 파일 200, 쿠키 없음 401, POST 405, 경로 우회 400, 수납 `viewer-url` 403, 비활성 계정 페이지 401 안내) 모두 통과, 진료 화면에서 영상 창 다시 열림. 취소 카드 대비 밝은 4.7–8.3 · 어두운 5.6–8.3(전 2.5–3.0 · 2.9–4.4), 두 화면 눈으로.
- **확인 못 한 것**: 진짜 장비(메뉴·압축 전송), 서버 상태 창(`server-status.bat` — 실행 중 컨테이너만 봄), `px_noStudy`, 브라우저에서 실제 30분.
- **다른 세션에 부탁** (보고서 「고칠 것」 표 그대로)
  - **진료**: (B) 영상 오더를 낸 직후 「Envoyé」가 안 보임 — 환자를 다시 열어야 보임. (C) 영상 창 머리에 「검사 번호로 연결됨」 줄(`viewer-url`의 `images.linked_by === 'accession'`), 영상 오더 줄 Unité 칸의 촬영 부위(«CHES»), 판독 저장 알림 창 → 잠깐 뜨는 알림.
  - **설정**: (C) 상태 점 «97.5 Go libres» 소수점.
  - **디자인**: 취소 카드 모양 확인(점선 테두리 + 회색 꼬리표) — 3.3.1 규칙대로 했는지.

## 2026-09-30 — 시험 순서서에 상태 화면 문구 · 예약 등록 금지 안내 · 0부터 다시 훑는 시간

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5077d8e`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**
  1. `wiki/reference/usb-backup-rehearsal.md` 6번: 빈 자리에 설정 세션 `99329ea`의 실제 문구 — 상태 점의 **「EMR 백업 복사 (외장 디스크)」** 줄 ok / failed / noDisk / notFound / none / never / stale의 **한국어·프랑스어**(`se_sys_emrBackupCopy_*`), 서버 상태 창(`server-status.bat`, 기본 프랑스어, `-Lang ko`)의 같은 줄 문구(`emrCopy*`), 어디서 보는지(위쪽 막대 상태 점 / EMR 폴더의 `server-status.bat` — 로그인 없이). 7번(뽑은 뒤)·8번(다시 꽂은 뒤)의 기대 결과에도 EMR 백업 복사 줄 추가.
  2. 순서서 맨 위(머리 인용 안)에 **「⚠ 이 PC에서는 매일 밤 자동 실행 등록(`install-image-backup.ps1`)을 하지 않습니다 — 현지 서버 PC에서만」** 굵게. (표에도 원래 있었음.) 「합친 뒤에」 줄에 합쳐진 커밋 `6f5c871`.
  3. **0부터 다시 훑는 시간** — 격리 Orthanc 9198에 시험 영상(16×16, 가짜 환자 `TEST^Bulk`)을 넣고 시험용 폴더를 디스크로, `-NoReport`:

     | 실행 | 시간 |
     |---|---|
     | 612장 첫 복사 | 7.8초 |
     | 새것 없음 (기본 비용: PowerShell 시작·EMR 부분) | 2.5~2.6초 |
     | 612장 0부터 다시 훑기 (디스크 기록을 다른 서버 것으로 흉내) ×2 | 5.2초 · 5.4초 |
     | 1,400장 더 첫 복사 | 18.8초 |
     | 2,012장 0부터 다시 훑기 ×2 | 14.7초 · 15.1초 |

     ⇒ 다시 훑기 **한 장 약 5ms**(2,012장 기준 6ms). 이 PC는 로컬 SSD 폴더·작은 Orthanc DB라, 순서서와 위키 6.2에는 **넉넉히 한 장 20ms** — 1만 장 약 3~4분, 5만 장 약 15~20분, 10만 장 약 35분(새 서버에서 한 번만, 밤 02:30). 시험 영상은 다 지웠고(격리 Orthanc 12장으로 되돌림) 격리 스택 내림.
- **바꾼 파일**: `wiki/reference/usb-backup-rehearsal.md`, `wiki/modules/pacs.md`(6.2, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음
- **확인 못 한 것**: 실제 USB 디스크(느린 HDD)와 영상 수만 장인 실제 Orthanc에서의 다시 훑기 시간 — 위 20ms는 어림. 순서서의 상태 점 문구는 번역 파일에서 옮김(화면을 띄워 보지는 않음).
- **다른 세션에 부탁**: 없음.

## 2026-09-30 — USB 시험 순서서 · 디스크를 다른 서버에 가져가도 영상이 빠지지 않게 · 도중에 빠진 디스크 · `-Verify` 시각

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `70877e2`를 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `6f5c871`
- **한 일**
  1. **`wiki/reference/usb-backup-rehearsal.md`** (새, 한국어, 실장님용): 무엇을 확인하나, 준비물, 걸리는 시간(30분~1시간), 이 PC에서 해도 되는 것 / 현지에서만(예약 등록), 명령 창 여는 법, 1~8단계(꽂기 → `prepare-backup-disk` → `image-backup` 한 번 → 디스크 안 보기·EMR 백업 개수 맞춰 보기 → `-Verify` → EMR 상태 점 → 안전하게 제거 후 `image-backup`(「disk not found」, EMR은 그대로) → 다시 꽂고 한 번 더), 단계마다 「정상 / 멈추고 총괄에게」 표(스크립트가 실제로 찍는 영어 줄 그대로), 도중에 뽑기(흉내 결과 표 — 진짜 디스크로는 권하지 않음), 끝난 뒤(디스크 보관, 같은 디스크를 현지로, 현지에서 `install-image-backup`), 막혔을 때 볼 곳.
  2. **`-Verify` 36시간 판정** (총괄 지적): 파일 이름 시각이 아니라 **복사본의 수정 시각**으로(복사할 때 원본 시각을 그대로 줌). 출력도 「written <시각> on this PC's clock」. 이름 시각은 EMR 컨테이너 `TZ`(기본 Indian/Antananarivo)라 PC 시간대가 다르면 어긋남 — 현지 PC는 같은 시간대라 문제없지만 이 PC(한국)는 6시간. `image-backup.ps1`의 가지치기는 30일 단위라 몇 시간 차이는 상관없어 이름 날짜 그대로. `emr_backup_newest`도 이름 시각 그대로(위키 표에 「나이 판정에 쓰지 말 것」).
  3. **찾아서 고친 것 — 디스크를 새 서버로 가져가면 새 영상이 빠질 뻔함**: 디스크의 `state.json` `last_seq`는 **Orthanc DB 하나의 변경 번호**. 결정 35대로 새 PC에서 같은 디스크를 쓰면(또는 영상 백업으로 Orthanc를 다시 채우면) 새 Orthanc는 1부터 — 옛 번호가 더 크면 그 사이 새 영상을 **영원히 건너뜀**(시험: 고치기 전 방식이면 12장 중 0장). 이제 `last_change`(그 번호의 `seq|종류|ID|시각`)를 같이 적고, 시작할 때 Orthanc에 그 번호가 같은 ID·시각으로 있는지 봄 → 아니면 0부터(이미 있는 영상은 크기로 건너뜀). 옛 디스크(`last_change` 없음)는 번호가 맞으면 표시만 붙임.
  4. **도중에 빠진 디스크**: 영상마다·EMR 백업 복사 실패 때 표시 파일이 있는지 보고, 없으면 「backup disk was unplugged during the backup - plug it back in; the next run continues」, `disk_found=false`, exit 1, EMR 쪽 `emr_backup=no_disk`. 전에는 남은 공간 0으로 읽혀 「disk is full」이라고 했을 것.
  5. 위키 6.2(위 3·4·2, 시험 기록, `.sh`는 만들지 않음 — 실장님 결정), 8절.
- **도중에 뽑기 흉내 결과** (시험용 폴더에 `subst Q:`를 씌우고 도중에 `subst Q: /d` — 스크립트에는 디스크가 사라진 것과 같음. 격리 Orthanc 9198 영상 12장, 가짜 EMR 백업 150MB×3, `-NoReport`):

  | 언제 | 결과 | 다시 꽂고 돌리면 |
  |---|---|---|
  | 영상 복사 중(3~5장 뒤) | `ok=false`·`disk_found=false`·「unplugged」, `state.json` 안 생김(첫 묶음 미완) | 나머지만 복사 → 12장, `ok=true` |
  | EMR 백업 복사 중 | 영상 `ok=true`, `emr_backup=no_disk`·「unplugged」, `.part` 1개 남음 | `.part` 지우고 3개 복사, `-Verify` VERIFIED |

  한계: `subst`를 없애도 이미 열린 파일에는 계속 써지므로(진짜 USB는 쓰기 자체가 실패), 「쓰는 중인 파일이 끊기는」 모습은 흉내가 덜 됨 — 그 경우에도 `.part` 이름이라 다음 실행이 지움. 진짜 디스크를 쓰는 도중에 뽑는 것은 디스크가 상할 수 있어 순서서에서도 권하지 않음.
- **바꾼 파일**: PACS `image-backup.ps1`, `restore-image-backup.ps1`. EMR `wiki/reference/usb-backup-rehearsal.md`(새), `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음. **번역 키**: 없음
- **확인한 방법**: 위 흉내 시험 A~E, 위치 확인 시험(옛 state → 표시만 / 다시 → 그대로 / 같은 번호 ID 바꿈 → 0부터 / 번호 5000 → 0부터 / 번호 5000 + 디스크 영상 지움 → 12장 다시). 모두 격리 Orthanc 9198과 시험용 폴더, 예약 작업 없음, 실행 중 EMR·PACS 안 건드림, 격리 스택 내림, `subst` 남은 것 없음, 시험 폴더 지움.
- **확인 못 한 것**: 진짜 USB(순서서로 실장님과), 진짜 새 서버로 옮긴 경우(위치 확인은 흉내로만), 영상이 수천 장일 때 0부터 다시 훑는 시간.
- **다른 세션에 부탁**
  - **총괄**: 순서서는 이 고침을 합친 뒤에 하도록 적어 둠. 실행 중 PC의 PACS 폴더는 옛 `state.json`(표시 없음)을 가진 디스크가 있으면 첫 실행에서 표시만 붙음 — 할 일 없음.
  - **설정**: `emr_backup_newest`는 EMR 컨테이너 시간대라 나이 판정은 `emr_backup_last_ok`로(총괄이 이미 전함 — 확인만). 순서서 6번에 「EMR 백업 복사」 줄 자리를 비워 둠(`<!-- -->`) — 줄을 넣으면 문구를 알려 주세요.

## 2026-09-29 — 밤 영상 백업이 EMR DB 백업도 외장 디스크로 복사 (실장님 결정 — 외장하드 하나에 둘 다)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `fd0cd02`를 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `cfc434c`
- **한 일** (총괄 지시 1~7)
  1. `image-backup.ps1`: 영상 복사가 끝나면(**성공이든 실패든** — `Finish`에서) EMR 폴더의 백업 폴더에서 `bethesda_*.sql.gz`·`medconnect_*.sql.gz`(맨 위만, `.inprogress` 안 봄, 0바이트 제외)를 디스크 `BethesdaPACS\emr-backups\`로. 같은 이름·같은 크기는 건너뜀.
  2. EMR 폴더: `-EmrPath`, 없으면 PACS 폴더 옆 `Bethesda-EMR*`(안에 `docker-compose.yml`; 여럿이면 가장 새 백업이 있는 것). 백업 폴더는 EMR `.env`의 `BACKUP_PATH`(상대면 EMR 폴더 기준), 없으면 `<EMR>\backups`. 못 찾으면 `emr_backup: not_found`, 영상 결과는 그대로. `install-image-backup.ps1 -EmrPath <폴더>`로 예약 작업에 넘길 수 있음.
  3. 디스크에서 지우기: EMR과 같게 — `BACKUP_RETENTION_DAYS`(EMR `.env`, 기본 30)일 넘은 것만, 가장 새 7개는 늘 남김. 날짜는 파일 이름에서. 복사 오류가 있던 밤엔 안 지움. 지울 파일은 처음부터 복사 안 함. 영상은 지우지 않음(그대로).
  4. 확인: `.part`로 복사 → SHA-256이 원본과 같은지 → gzip이 끝까지 풀리고 **풀린 길이 = gzip 꼬리 ISIZE**인지 → 이름 바꿈. (Windows PowerShell 5.1의 GZipStream은 잘린 파일을 오류 없이 읽고 끝나서, 처음 시험에서 잘린 파일이 통과함 → 길이 비교를 넣음. 한 바이트 바꾼 파일·gzip 아닌 파일도 걸림.) EMR 쪽 실패는 영상 `ok`·exit 코드에 영향 없음.
  5. 보고(`image-backup-report`, `logs\image-backup-status.json`)에 칸 추가 — 아래 표. EMR `pacs.routes.js`가 이 칸들을 `service_heartbeat`(`pacs_image_backup`) detail에 저장하도록 고침(전에는 정해진 칸만 골라 저장해서 새 칸이 버려졌을 것).
  6. `restore-image-backup.ps1 -Verify`: 「EMR database backups on the disk: N; newest <이름> (<날짜>), reads as a complete gzip.」 — 가장 새 것이 망가졌거나 36시간 넘게 오래되면 VERIFIED 아님, 하나도 없으면 노란 경고만. EMR 복원 자체는 안 함 → 위키 6.2에 「디스크에서 EMR `backups\`로 복사 → DEPLOYMENT.md 5b → `pair-with-emr`」. 덤으로 영상이 0장인 디스크에서 `Get-Random -Count 0` 오류가 나던 것 고침.
  7. 위키 6.2(EMR 백업 복사·보고 칸·복원 안내·시험), 2.7 ④와 6.2 머리에 **「외장 디스크에 영상과 EMR DB 전체가 암호화 없이 → 잠기는 곳에」**, 프랑스어 설명서 À ne pas faire, v1.5.0 변경 내역 초안(백업 절·After updating 5).
  - 덤: PACS `README.md`의 영상 백업 명령 두 줄이 `.\restore…`의 `\r`이 줄바꿈으로 바뀌어 깨져 있었음(8fcf65f 때 Python heredoc) → 고침, EMR 백업·보관 경고 추가. 다른 파일에 같은 깨짐 없음(`git grep`).
- **보고 칸** (설정 세션에 전할 것 — `service_heartbeat` `name='pacs_image_backup'`의 `detail`):

  | 칸 | 값 |
  |---|---|
  | `emr_backup` | `ok` / `not_found` / `none`(EMR 폴더에 백업 없음) / `failed` / `no_disk` |
  | `emr_backup_ok` | 참/거짓 (`emr_backup === 'ok'`) |
  | `emr_backup_copied` | 이번 실행에 복사한 수 |
  | `emr_backup_count` | 디스크에 있는 EMR 백업 수 |
  | `emr_backup_newest` | 디스크에서 가장 새 백업의 이름 날짜 `YYYY-MM-DD HH:MM`, 없으면 null |
  | `emr_backup_error` | 짧은 영어 문장(300자), 파일 이름까지만 |
  | `emr_backup_last_ok` | EMR이 붙임 — 마지막으로 `emr_backup_ok`가 참이던 때(ISO), 실패한 밤에도 이어 둠 |

  옛 스크립트의 보고에는 이 칸들이 **없음**(키 자체가 없음 = 모름 — 경고하지 말 것). `ok`·`last_success`는 계속 **영상** 결과. 경고 제안: `emr_backup`이 `failed`·`not_found`·`no_disk`이거나, `emr_backup_newest`가 36시간보다 오래됨(EMR 백업이 멈췄거나 복사가 멈춤).
- **바꾼 파일**: PACS `image-backup.ps1`, `image-backup-common.ps1`, `restore-image-backup.ps1`, `install-image-backup.ps1`, `README.md`. EMR `backend/src/routes/pacs.routes.js`(`/image-backup-report`), `wiki/modules/pacs.md`(2.7·6.2·8), `wiki/manual-fr/pacs.md`, `wiki/reference/changelog-1.5.0/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음. **DB 마이그레이션**: 없음(JSONB detail에 칸만). **번역 키**: 없음
- **확인한 방법** (시험용 폴더 `-SearchRoots` + 가짜 EMR 폴더 — 가짜 덤프 13개 0~45일 전, `.inprogress`, 다른 파일):
  - Orthanc 꺼진 채 첫 실행 → 영상 exit 1, EMR 백업 `ok` 9개(30일 넘은 4개는 복사 안 함) · 다시 → 0개 · 디스크의 망가진 복사본 → 다시 복사 · 잘린 EMR 백업 → 그 파일만 `failed`, 새 정상 파일 복사, 그 밤엔 안 지움 → 다음 밤 지움 · 디스크의 33·45·50일 복사본 → 지움 · `-EmrPath` 틀림 → `not_found` · 디스크 없음 → `no_disk`·exit 2 · `BACKUP_PATH=./otherbk`·`BACKUP_RETENTION_DAYS=5` → 그 폴더·5일 규칙.
  - 격리 스택(Orthanc 9198 + EMR 9188): 영상 12장 + EMR 백업 → exit 0, EMR DB의 detail에 칸 저장, 잘린 파일 → `ok=t`·`emr_backup=failed`·`emr_backup_last_ok` 유지, 옛 모양 보고 → 칸 없음. `-Verify` → EMR 백업 11개·가장 새 것 확인·VERIFIED.
  - `install-image-backup.ps1 -WhatIf -EmrPath …`만. **이 PC에 예약 작업 없음**(0개 확인). 실행 중 EMR·PACS 안 건드림.
- **확인 못 한 것**: 진짜 USB 디스크, 진짜 EMR 백업 파일(실제 환자 자료라 시험에 쓰지 않음), 예약 작업으로 밤에 도는 것, 디스크를 백업 도중 뽑는 경우. 실행 중 PC(`C:\Bethesda-PACS-main` 옆 `C:\Bethesda-EMR-main`)에서는 자동으로 찾을 것으로 보이지만 돌려 보지 않음.
- **다른 세션에 부탁**
  - **설정**: 상태 화면(`status.routes.js` `checkImageBackup` 또는 새 줄)에 EMR 백업 복사 상태 — 위 표·경고 제안. 칸이 없으면(옛 스크립트) 표시하지 않기.
  - **총괄**: 합칠 때 실행 중 PC는 PACS 폴더만 바꾸면 되고(예약 작업 인수 그대로 — EMR 폴더를 옆에서 찾음), EMR은 `pacs.routes.js`만(마이그레이션 없음). 실장님께: 외장 디스크 보관 장소(잠금).

## 2026-09-29 — 프랑스어 직원 설명서 · v1.5.0 변경 내역 초안 · 오더 연동 탭 오류 문구 번역

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `de7bc8c`를 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**
  1. **`wiki/manual-fr/pacs.md`** (새, 약 1,900단어 ≈ A4 3~4쪽) — 방사선사·의사용. En bref(방사선사 4단계 / 의사 4단계), Pas à pas 7개(검사 내기, 촬영 — 찍기 직전마다 목록 새로 불러오기·목록에서 환자 고르기, 목록에 환자가 없을 때, 영상 보기와 판독, 「Not for diagnostic usage」의 뜻, 환자의 모든 영상 검사, 취소된 영상 검사), 메시지 표 12줄, À ne pas faire 6줄, Qui appeler. 화면 글자는 `fr.js` 그대로(`viewImage`·`imageViewer`·`openNewTab`·`readingPlaceholder`·`lastReadBy`·`cs_ws*`·`cs_cancelHint`·`px_*`), 뷰어 안 문구는 `pacs.viewer.js`의 fr 문장 그대로. 진료 설명서(`consultation.md` 7~9절)와 말을 맞춤(**Voir image**, **Visionneuse**, **Compte-rendu**, **Annulé**).
     - `<!-- à revoir -->`: 장비 메뉴 이름(Worklist·MWL·Send…) — 장비 설치 날. `<!-- terme à vérifier sur place -->`: « station de diagnostic », « manipulateur radio ».
  2. **`wiki/reference/changelog-1.5.0/pacs.md`** (새, 영어) — 보이는 변화 먼저: 로그인 없는 영상 창(P-9), 영상 도착·환자번호 대조·accession 연결(P-7·P-3·P-4), 영상 오더 취소·P-18·P-22, 영상 백업(P-24), 토큰 보안(P-2·P-5·P-21), 설치·짝 맞춤 도구. 작은 것들과 마이그레이션 **019·028·035**. 저장소 둘(EMR / PACS 폴더)을 맨 위에서 나눠 말함. 끝에 **After updating** 6가지: 포트 범위, PACS 다시 만들기, `pair-with-emr`(복원 뒤에도), 9090은 서버 PC 안에서만(방화벽 규칙 지워도 됨), 영상 백업 준비, 장비 AE 필터.
  3. **오더 연동 탭 오류 번역** (설정 세션 지적)
     - 서버 `pacs.routes.js`: `PUT /config`가 저장 전에 검사 — 글자 칸 길이(DB 칸 길이: host 100, AE 50, token 100, 주소 200, 시설 100) 넘으면 400 `<칸> is too long (at most N characters)`, 포트가 1~65535 정수가 아니면 400 `DICOM port must be a whole number from 1 to 65535`(전에는 70000이 저장되고 연결 시험이 500). DB 오류는 로그에만, 화면에는 `Could not save the order feed settings`. `GET /config` 실패는 `Server error`. `GET /test`는 Host가 비었으면 `No PACS host set`(전에는 EMR 컨테이너 자신을 시험했음).
     - 화면 `Settings.jsx`(PACS 탭): `pxMessage` — 위 문구와 `tcpCheck` 문구(`TCP connection succeeded`, `Connection timed out`, Node의 `ECONNREFUSED`·`ENOTFOUND`/`EAI_AGAIN`·`ETIMEDOUT`/`EHOSTUNREACH`/`ENETUNREACH`)를 `px_` 문구로, 모르는 것은 `seMessage`로. 연결 시험 줄 끝에 `(호스트:포트)`. 「Checking...」·「Save」 글자도 번역(`px_testing`, 기존 `save`).
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `frontend/src/pages/Settings.jsx`(PACS 탭 부분과 그 위 `savePacs`·`testPacs`·새 `pxMessage`), `wiki/manual-fr/pacs.md`(새), `wiki/reference/changelog-1.5.0/pacs.md`(새), `wiki/modules/pacs.md`(4절 표·오류 문구, 7절 P-9 같은 출처 결정·035, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에 키 9개. 기존 키 문구 변경 없음. `settingsMessages.js`(설정 세션)는 안 고침 — 거기로 넘기기만 함.
- **DB 마이그레이션**: 없음
- **번역 키** (fr / ko)
  - `px_errTooLong` — 「{f} : trop long ({n} caractères au plus).」 / 「{f}: 너무 깁니다({n}자까지).」
  - `px_errPort` — 「Le port DICOM doit être un nombre entier de 1 à 65535.」 / 「DICOM 포트는 1~65535 사이의 정수여야 합니다.」
  - `px_errSave` — 「Les réglages du flux d'ordres n'ont pas été enregistrés. Réessayez ; si cela continue, regardez la fenêtre d'état du serveur.」 / 「오더 연동 설정을 저장하지 못했습니다. 다시 시도하고, 계속되면 서버 상태 창을 보세요.」
  - `px_testing` — 「Vérification...」 / 「확인 중...」
  - `px_testOk` — 「Le port DICOM du PACS répond.」 / 「PACS의 DICOM 포트에 연결됩니다.」
  - `px_testTimeout` — 「Pas de réponse : le serveur PACS est éteint ou l'adresse est fausse.」 / 「응답이 없습니다: PACS 서버가 꺼졌거나 주소가 틀렸습니다.」
  - `px_testRefused` — 「Rien n'écoute à cette adresse : vérifiez le numéro de port et que le PACS est démarré.」 / 「그 주소에서 PACS가 받지 않습니다: 포트 번호가 맞는지, PACS가 켜져 있는지 보세요.」
  - `px_testUnknownHost` — 「Adresse introuvable : vérifiez l'orthographe dans Host / IP.」 / 「그런 주소를 찾을 수 없습니다: Host / IP 칸의 철자를 보세요.」
  - `px_testNoHost` — 「Host / IP est vide. Sur le même PC, saisissez host.docker.internal.」 / 「Host / IP 칸이 비어 있습니다. 같은 PC면 host.docker.internal을 적으세요.」
- **확인한 방법**: 격리 EMR 9188(develop `de7bc8c` 위에서 빌드, 새 마이그레이션 적용). API — AE 60자 400·포트 70000·4242.5 400·주소 210자 400(각 문구 확인), `orthanc_password`를 보내도 무시(DB 그대로), 연결 시험: Host 빈칸 → `No PACS host set`, 127.0.0.1 → ECONNREFUSED, `no-such-host.invalid` → ENOTFOUND, 10.255.255.1 → timed out. 화면(fr, 관리자): 저장 오류 알림 「Erreur: AE Title : trop long (50 caractères au plus).」·「Erreur: Le port DICOM doit être un nombre entier de 1 à 65535.」, 저장 단추 「Sauver」, 연결 시험 줄 「✗ Pas de réponse : … (orthanc:4242)」. 시험 뒤 설정값 되돌림. 설명서는 화면 그림 없이 글만(규칙 5 — 선택).
- **확인 못 한 것**: 설명서를 현지 직원이 읽어 본 것. 장비 쪽 메뉴 이름. `px_testRefused`·`px_testUnknownHost` 문구는 API 응답으로만 확인(화면 표시는 같은 함수).
- **다른 세션에 부탁**
  - **설정**: 오더 연동 탭 오류는 `pxMessage`가 먼저 보고 모르는 것만 `seMessage`로 넘김 — `settingsMessages.js`에 PACS 문구를 넣을 필요 없음. 서버 상태 창(`status.routes.js` `checkPacs`)은 `tcpCheck` 문구를 따로 쓰므로 영향 없음.
  - **진료**: `manual-fr/pacs.md` 1·4·7절이 진료 화면을 설명함 — `consultation.md` 7~9절과 말이 어긋나면 알려 주세요.
  - **총괄**: 설명서·변경 내역 초안 묶을 때 참고. 변경 내역의 「After updating」 1·2는 실행 중 PC에서 이미 한 것(재부팅·PACS 재생성)이라, 다른 병원용 안내로 남김.

## 2026-09-29 — P-9 C 만듦: EMR이 영상을 중계 (총괄 조건 ①~⑧)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `9a57b6a`를 ff로 당긴 뒤). **PACS 저장소** `session/pacs` `4e84b0b`
- **한 일**
  - 새 `backend/src/routes/pacs.viewer.js` — `/api/pacs/viewer/*` 중계. 서명 쿠키(`px_viewer`, 30분, 스터디 5개까지), 경로 정규화 + 허용 목록(Stone 파일·`/system`·스터디 UID로 거른 DICOMweb만), 요청마다 계정 활성·진료 권한 확인(30초 캐시), Orthanc에 `admin`으로 붙여 스트림 전달, Orthanc의 `Set-Cookie`·`WWW-Authenticate` 버림, 안내 쪽(짝 안 맞음 / 응답 없음 / 시간 끝) fr·ko·en, 중계 응답에만 Stone용 CSP. 자세히는 모듈 위키 4절.
  - `pacs.routes.js` — `viewer-url`이 상대 주소 `/api/pacs/viewer/stone-webviewer/index.html?study=<UID>`를 주고 쿠키를 붙임, **`?study=`로 여는 길 없앰**(오더로만), `has_viewer` 늘 참. `GET/PUT /config`는 `publicConfig`로 `orthanc_password`를 빼고 `orthanc_password_set`만. `orthanc_url` 저장.
  - `Settings.jsx`(오더 연동 탭, PACS 부분) — 「EMR이 영상 서버에 닿는 주소」 칸, 비밀번호 ✓/⚠ 상태 줄(입력 칸 없음), 「PACS 웹/뷰어 주소」는 흐리게 남기고 「이제 쓰지 않음」(조건 ⑥), 「🖼 뷰어 열기」 링크 삭제. `pacsServerHint`의 한국어 기본 문구도 새 번역과 같게.
  - **PACS 저장소**: `pair-with-emr.ps1/.sh`가 토큰 다음에 **`.env`의 Orthanc 비밀번호를 EMR `pacs_config.orthanc_password`에 넣음**(stdin, md5로 확인, 화면·명령줄에 안 나옴). 칸이 없는 옛 EMR이면 「EMR older than the built-in viewer」 안내만 하고 토큰 짝 맞춤은 그대로 성공. `docker-compose.yml` 웹 포트 **`127.0.0.1:9090:8042`**, Stone **시작 안내 상자 끔**(`ORTHANC__STONE_WEB_VIEWER__SHOW_INFO_PANEL_AT_STARTUP=Never` — 아래 「찾은 것」). `setup.ps1/.sh`·`start.bat`·`README.md` 문구(직원 PC엔 뷰어 주소 없음, 장비는 `<IP>:4242`, 9090은 서버 PC 안에서만).
- **바꾼 파일**: EMR `backend/src/routes/pacs.viewer.js`(새), `backend/src/routes/pacs.routes.js`, `backend/sql/803_pacs_viewer_proxy.sql`(새), `frontend/src/pages/Settings.jsx`(PACS 부분), `wiki/modules/pacs.md`(2.3·2.5·4·6·6.1·7 P-9·8), `wiki/handoff/pacs.md`. PACS `pair-with-emr.ps1`, `pair-with-emr.sh`, `docker-compose.yml`, `setup.ps1`, `setup.sh`, `start.bat`, `README.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에 키 4개 + **기존 키 `pacsServerHint` 문구 변경(세 언어)**: 「웹 주소(9090)는 진료실 뷰어가…」 → 「영상 창은 EMR이 대신 보여 주므로 진료실 PC가 9090에 닿을 필요는 없습니다」. nginx.conf·app.js는 안 바꿈(중계는 `pacs.routes.js` 안에 붙음).
- **DB 마이그레이션**: `803_pacs_viewer_proxy.sql` — `pacs_config`에 `orthanc_url VARCHAR(200) DEFAULT 'http://host.docker.internal:9090'`, `orthanc_password VARCHAR(200)` (`ADD COLUMN IF NOT EXISTS`만, 기존 줄 안 바꿈). 번호는 총괄이 다시 매김.
- **번역 키**
  - `px_orthancUrl` — ko 「EMR이 영상 서버에 닿는 주소 (보통 그대로)」 / en 「Address the EMR uses to reach the image server (usually leave as is)」 / fr 「Adresse du serveur d'images vue par l'EMR (en général, ne pas modifier)」
  - `px_orthancPasswordSet` — ko 「영상 서버 비밀번호 설정됨 — 영상 창이 로그인 없이 열립니다」 / fr 「Mot de passe du serveur d'images enregistré — la visionneuse s'ouvre sans connexion」
  - `px_orthancPasswordMissing` — ko 「영상 서버 비밀번호가 아직 없습니다. 서버 PC의 PACS 폴더에서 pair-with-emr.ps1을 실행하세요.」 / fr 「Pas encore de mot de passe du serveur d'images. Sur le PC serveur, lancez pair-with-emr.ps1 dans le dossier du PACS.」
  - `px_viewerUrlUnused` — ko 「이제 쓰지 않음(영상은 EMR이 보여 줌)」 / fr 「n'est plus utilisée (l'EMR affiche les images)」
- **총괄 조건별 결과**
  - ① 비밀번호가 응답·로그·변경 기록에 없음 — `SELECT *`로 읽는 곳: `pacs.routes.js` `ensureConfig`(응답은 모두 `publicConfig`를 거침, 나머지 호출은 토큰 검사에만 씀), `consult.routes.js`(진료 파일, `auto_create_worklist`만 씀 — 내보내지 않음). 격리에서 `GET /config`·`PUT /config` 답, EMR api·nginx 로그에서 비밀번호와 `admin:<비밀번호>` base64 모두 **0건**. 설정 저장 뒤에도 비밀번호 그대로(md5 확인). DB 백업(`pg_dump`)에는 들어감 — 브리지 토큰과 같음.
  - ② 쿠키 서명 열쇠 = `HMAC(JWT_SECRET, 'bethesda-pacs-viewer-cookie-v1')`. JWT_SECRET을 바꾸면 쿠키도 모두 무효.
  - ③ 경로: 한 번 풀고 `..`·`.`·`//`·`\`·남은 `%`(= `%252e` 같은 이중 인코딩)·NUL이면 400, 그 뒤 허용 목록. 시험: `../`, `%2e%2e`, `%2f`, `%252e`, `..%5c`, `//` 모두 400. `--path-as-is`로 보내 curl이 먼저 정리하지 않게 함.
  - ④ `Set-Cookie`·`WWW-Authenticate` 없음(중계 응답 헤더 확인), 영상은 `pipe`로 스트림.
  - ⑤ 비밀번호 없음 → 「Le serveur d'images n'est pas encore relié à ce dossier : l'administrateur doit lancer pair-with-emr.ps1…」 (페이지 200, 데이터 424). 비밀번호 틀림(Orthanc 401)도 같은 안내. Orthanc 꺼짐·주소 틀림 → 「Le serveur d'images ne répond pas…」.
  - ⑥ 「PACS 웹/뷰어 주소」 칸 남김(흐리게, 「이제 쓰지 않음」), 값은 안 씀.
  - ⑦ **큰 영상 수치** (격리, 이 PC — 512×512×100장 16비트 한 파일 **52,429,878바이트**, 브라우저 → 9188 nginx → EMR 중계 → `host.docker.internal:9198` → Orthanc):

    | 요청 | 결과 |
    |---|---|
    | 인스턴스 통째(multipart, 50MB) ×3 | 200, 첫 바이트 0.11초, 끝 **2.80~2.92초** |
    | 같은 것 Orthanc 직접(9198) | 0.31초 |
    | EMR 컨테이너 → Orthanc 직접(중계·nginx 없이) | 2.66~2.78초 |
    | EMR 컨테이너 → 자기 중계(nginx 없이) | 2.77~2.85초 |
    | 프레임 100장 한 요청 | 3.0초 |
    | 프레임 한 장(512KB) | 0.07초 |
    | 렌더 한 장(JPEG) | 0.09초 |
    | 느린 브라우저(`--limit-rate 2M`) 통째 | 25.1초, 끊김 없음 |

    ⇒ 늦어지는 곳은 **Docker Desktop의 `host.docker.internal` 구간**(약 18MB/s ≈ 150Mbps)이고, 중계·nginx가 더하는 시간은 거의 없음. nginx는 50MB를 임시 파일로 버퍼하며 경고 한 줄(`an upstream response is buffered to a temporary file`) — 기본 `proxy_max_temp_file_size` 1GB 안이라 문제없음. `proxy_read_timeout`(기본 60초)은 **바이트 사이 간격**이라 큰 영상이 오래 걸려도 끊지 않음(25초 시험). **⇒ nginx.conf는 바꿀 필요 없음.** 원하면 `/api/pacs/viewer/`에만 `proxy_buffering off`로 임시 파일 경고를 없앨 수 있음(선택).
    - 중계 허용 목록이 처음엔 `frames/<한 장>`만 받아 **프레임 여러 장 한 요청(`frames/1,2,3`)이 403**이었음 → 쉼표 목록 허용으로 고침(Stone은 한 장씩 부르지만 다른 DICOMweb 도구를 위해).
  - ⑧ 보안 시험 25개 **모두 통과** (develop 당긴 뒤 다시 돌려도 25/25): 자기 스터디 200 / 쿠키 없음 401(`index.html`은 「시간 끝」 안내) / 남의 스터디 UID 403 / 남의 스터디 QIDO 403 / 거르지 않은 `dicom-web/studies` 403 / Orthanc REST `/patients`·`/tools/find`·Explorer `/ui/app/` 403 / POST·DELETE 405 / 경로 우회 6가지 400 / 진짜 서명 + 바꾼 내용 401 / 엉터리 쿠키 401 / 서명은 맞고 만료된 쿠키 401 / 없는 직원 id 쿠키 401 / 수납 직원(진료 권한 없음) 쿠키 401 / 수납·간호사 `viewer-url` 403 / Basic 인증 헤더만 401. **직원 비활성화 → 17초 뒤 401**, 다시 활성 → 200. **진료 권한 회수 → 32초 뒤 401**(30초 캐시 + 2초 간격), 되돌리면 200. 비활성 직원의 유효한 JWT로 `viewer-url` → 401. **남의 쿠키 복사**: 로그인 없는 다른 클라이언트(curl)에서도 그 쿠키의 스터디는 200 — 만료(30분)·계정 비활성·권한 회수까지. HttpOnly라 화면 스크립트로는 못 꺼냄. 설계대로(설계 메모 참고).
- **찾은 것**
  - **Stone 시작 안내 상자 문제**: 「Intended use」 상자가 떠 있는 동안 Stone이 영상 칸 크기를 0으로 잡고, 상자를 닫아도 창 크기가 바뀌기 전까지 **가운데 영상 칸이 까맣게** 남음(EMR 창 안·새 탭 모두, 중계와 관계없음 — `canvas1` 크기 0 확인). 안내 상자를 끄니 50MB 영상이 바로 보임. 그래서 PACS compose에 `SHOW_INFO_PANEL_AT_STARTUP=Never`. 「For patients, researchers and quality assurance. Not for diagnostic usage.」는 왼쪽 위 빨간 글씨로 **계속 보임**. 실행 중 PACS에는 컨테이너를 다시 만들 때 적용됨(9090→127.0.0.1과 같이).
  - **같은 출처의 위험**: Stone이 EMR과 같은 주소(9080)에서 돌아 Stone 코드가 EMR 화면의 localStorage(로그인 토큰 `medconnect_token`)를 읽을 수 있음(확인함). Stone은 우리 Orthanc 이미지(26.6.1 고정)의 코드라 지금 당장의 위험은 낮지만, Stone에 XSS(예: DICOM 태그 글자를 그대로 그림)가 있으면 EMR 로그인까지 번짐. iframe `sandbox`는 `SameSite=Strict` 쿠키가 안 따라가서 못 씀(http라 `SameSite=None; Secure` 불가). 근본 해결은 **뷰어만 다른 포트(다른 출처)** — nginx `listen` 추가·compose 포트·Windows 포트(P-1) 확인이 필요해 **결정 필요**(총괄/실장님).
  - `viewer-url`은 이전처럼 **진료 권한이 있으면 어느 환자 오더든** 쿠키를 받음(오더 id만 알면) — 기존 권한 모델 그대로.
- **확인한 방법**: 격리 EMR 9188(develop `9a57b6a` 위에서 다시 빌드, 새 마이그레이션 032~034 적용 확인) + 격리 PACS 9198/11298. 의사 계정으로 진료 → 🩻 → T3 「Voir image」: EMR 창 안에서 로그인 없이 Stone, 시리즈 3개(작은 시험 영상 2 + 50MB 1) 목록·50MB 영상 표시(fr·ko 버튼 문구), 같은 주소 새 탭도 열림. 관리자로 설정 → 오더 연동: 새 칸·「✓ 영상 서버 비밀번호 설정됨」·「이제 쓰지 않음」 확인. 격리 EMR의 `orthanc_password`는 **시험용 env 사본에 `pair-with-emr.ps1`**을 돌려 넣음(md5 일치). 프론트 빌드 통과.
- **확인 못 한 것**: 실행 중 PACS·EMR(9080/9090) — 안 건드림. 다른 PC의 브라우저·실제 LAN 속도. 장비 C-STORE로 들어온 실제 영상(압축 전송 문법)의 Stone 렌더. `pair-with-emr.sh`는 문법·CR 처리만 보고 리눅스에서 실행해 보지 않음.
- **다른 세션에 부탁**
  - **총괄**: ① 합칠 때 실행 중 PACS를 새 compose로 다시 만들기(웹 포트 `127.0.0.1:9090`, Stone 안내 끔) → **그 뒤 `pair-with-emr.ps1`** 한 번(실행 중 EMR에 Orthanc 비밀번호 넣기; 803이 먼저 적용돼 있어야 함). 순서가 바뀌면 영상 창에 「짝이 맞지 않았습니다」 — 다시 돌리면 됨. ② nginx.conf 변경 **필요 없음**(⑦ 수치). ③ 결정: 뷰어를 다른 출처(포트)로 옮길지(위 「같은 출처의 위험」). ④ 마이그레이션 803 번호.
  - **진료**: 바꿀 것 없음 — 영상 창은 `viewer-url`의 `url`을 그대로 iframe·새 탭에 씀(확인함). 다만 `url`이 빈 값이고 `no_study`가 아닌 경우의 「PACS 뷰어 주소가 설정되지 않았습니다」(`noViewerUrl`)는 이제 나올 일이 없음(`has_viewer` 늘 참) — 정리할지 확인만.
  - **설정**: 상태 화면의 「EMR → 영상 서버」 확인이 있다면 이제 `pacs_viewer_url`이 아니라 `orthanc_url`(+ `orthanc_password_set`)을 봐야 함. `status.routes.js`가 `pacs_viewer_url`을 읽는 곳(옛 포트 경고)은 값이 남아 있으니 그대로 둬도 깨지지 않음 — 확인 부탁.

## 2026-09-29 — 설계 메모: P-9 C 「EMR이 영상을 대신 보여 줌」 (실험 결과 포함)

- **상태**: 끝 — 총괄 승인(조건 8개) 뒤 만듦. 바로 위 항목 「P-9 C 만듦」
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만). **PACS 저장소** — 없음

### 한 줄 요약
영상 창(iframe)이 영상 서버(9090)가 아니라 **EMR 주소 `/api/pacs/viewer/…`** 를 엽니다. **EMR 백엔드(PACS 파일)가 그 요청을 받아 확인한 뒤 영상 서버에 비밀번호를 붙여 전달**합니다. 허락의 근거는 EMR이 영상 창을 열 때 심어 주는 **짧게 사는 쿠키**입니다. **nginx·EMR compose는 바꾸지 않아도 됩니다** — 기존 `/api/` 전달을 그대로 탑니다.

### 격리 스택 실험 (2026-09-29, 이 PC 안에서만 — 실행 중 PACS는 안 건드림)
- **E1** EMR 백엔드 컨테이너 → `host.docker.internal:9198`(**호스트 127.0.0.1에만 열린 포트**) → **닿음**(401 응답). ⇒ Windows(Docker Desktop)에서는 9090을 병원 네트워크에 열지 않고 **127.0.0.1에만** 열어도 EMR은 쓸 수 있음. *(리눅스 Docker에서는 127.0.0.1 포트가 컨테이너에서 안 보임 — 새 PC가 Windows라 해당 없음, 기록만.)*
- **E2** 비밀번호를 붙여 주는 임시 nginx 중계(127.0.0.1:9199, `/api/pacs/viewer/` → Orthanc)로 Stone 뷰어를 엶 → **로그인 창 없이 열림**, `/api/pacs/viewer/` 같은 하위 경로에서도 됨(Stone이 상대 경로를 씀). 검사·시리즈 2개·환자 머리글 표시.
  - Stone이 부른 경로 — **모두 GET**:
    - `stone-webviewer/…` 정적 파일 27
    - `system` 2
    - `dicom-web/studies?0020000D=<UID>&includefield=…`
    - `dicom-web/series?0020000D=<UID>&…`
    - `dicom-web/instances?0020000D=<UID>&0020000E=<UID>&…`
    - `dicom-web/studies/<UID>/series/<UID>/metadata`
    - `dicom-web/studies/<UID>/series/<UID>/rendered`
    - `dicom-web/studies/<UID>/series/<UID>/instances/<UID>/metadata`
    - `…/instances/<UID>/frames/1/rendered`
  - ⇒ **정적 파일·`system`을 뺀 모든 데이터 요청에 StudyInstanceUID가 들어 있음**(경로의 `studies/<UID>` 또는 필터 `0020000D=`). Orthanc 고유 ID 경로(`/studies/<id>`, `/instances/<id>`)는 안 씀.
- **E3** EMR 웹 컨테이너의 nginx에 `auth_request` 모듈 있음 — 쓸 수는 있지만 아래 이유로 추천 안 함.
- **알아 둘 것**: Stone 뷰어가 처음에 「Intended use … patients, research, quality assurance」 창을 띄우고, 화면 왼쪽 위에 빨간 글씨 **「Not for diagnostic usage」** 가 늘 보입니다. **지금 뷰어도 똑같습니다**(이번 변경과 무관). 진단용 인증 뷰어가 아니라는 표시 — 실장님이 알고 계셔야 할 사항이라 적음.

### 설계
**① iframe은 EMR 토큰을 헤더로 못 보냄 → 짧게 사는 쿠키**
- 진료 화면이 이미 부르는 `GET /api/pacs/viewer-url?order_item_id=`(JWT + 진료 권한)가 응답과 함께 쿠키 `px_viewer`를 심음.
  - 쿠키 속성: `HttpOnly; SameSite=Strict; Path=/api/pacs/viewer/; Max-Age=1800`.
  - 내용: `{user id, 이 오더의 study UID(실제 UID 포함), 만료}`를 서버 비밀값(JWT_SECRET)으로 **HMAC 서명**. 최근 5개 study까지 담아 「새 탭에서 열기」도 됨.
- `viewer-url`이 돌려주는 `url`은 **상대 주소** `/api/pacs/viewer/stone-webviewer/index.html?study=<UID>`. 같은 출처라 iframe·새 탭 모두 쿠키가 따라감.
- **nginx `auth_request`를 쓰지 않는 이유**: 그러려면 영상 서버 비밀번호를 nginx 설정에 넣어야 함 → EMR `.env` + compose 환경 변수 + 설정 템플릿. 현장에서 「비밀값 하나 더, 파일 하나 더」가 늘어남. 백엔드 한 곳에서 하면 **짝 맞추기 한 번으로 끝남**.

**② 영상 서버 비밀번호는 서버 안에서만**
- `pair-with-emr.ps1`이 이미 하는 일(토큰을 EMR에 stdin으로)에 **Orthanc 비밀번호도 같은 방법으로** 넣음 → `pacs_config.orthanc_password`(마이그레이션 8xx, 칸 추가만).
- `GET /api/pacs/config`는 이 값을 **돌려주지 않음**(설정 화면에도 안 보임, 「설정됨/안 됨」만).
- 영상 서버 주소는 `pacs_config.orthanc_url`(기본 `http://host.docker.internal:9090`, EMR 컨테이너에서 본 주소).
- 알아 둘 것: 비밀번호가 EMR DB 백업에도 들어감. 백업에는 이미 모든 환자 기록이 있어 위험이 크게 늘지는 않음. 새 PC에서 복원한 뒤 `pair-with-emr`를 다시 돌리면 새 값으로 바뀜.

**③ 무엇을 통과시키나 — 읽기 경로만, 연 검사만** (`/api/pacs/viewer/*`, PACS 파일 새로 `pacs.viewer.js`)
- **GET만**. 그 밖(POST·PUT·DELETE)은 405.
- 쿠키가 없거나, 서명이 틀리거나, 만료 → 401.
- 요청마다 쿠키의 사용자가 **아직 활성이고 진료 권한이 있는지** DB로 확인(S1과 같게, 30초 캐시).
- 허용 경로(목록에 없으면 403):
  - `stone-webviewer/*`, `system`
  - `dicom-web/studies/<UID>/…` — `<UID>`가 쿠키에 있을 때만
  - `dicom-web/studies|series|instances?…` — **`0020000D`(또는 `StudyInstanceUID`) 필터가 있고 그 UID가 쿠키에 있을 때만**. 필터 없는 전체 목록 조회는 막힘 ⇒ **다른 환자의 study를 URL로 못 엶**.
- 막힌 요청은 경로 모양만 로그에 남김(UID는 가림) — Stone 판이 바뀌어 새 경로를 부르면 알 수 있게. Orthanc는 26.6.1로 고정이라 당분간 바뀌지 않음.
- 전달: Node `http.request`로 Orthanc에 흘려보냄(streaming), `Authorization: Basic …`은 서버에서만 붙임. 응답의 `WWW-Authenticate`는 지움(브라우저 로그인 창이 다시 뜨지 않게). 제한 시간은 연결 5초·응답 120초.

**④ 설정의 「뷰어 주소」 칸과 9090**
- 직원 브라우저는 9090을 쓰지 않음 → 설정의 **「PACS 웹/뷰어 주소」는 필요 없어짐**. 대신 「EMR이 영상 서버에 닿는 주소」(`orthanc_url`, 기본값 그대로면 손댈 일 없음)와 「영상 서버 비밀번호: 설정됨 ✓」 표시.
  - 옛 `pacs_viewer_url`은 남겨 두되 쓰지 않음(데이터를 바꾸지 않음). P-25 경고는 새 칸 기준으로(설정 세션).
- **9090은 병원 네트워크에 열 필요 없음**: PACS compose에서 `127.0.0.1:9090:8042`로(E1). Orthanc 관리 화면은 서버 PC에서만(`http://localhost:9090`). 방화벽 확인은 9080·4242만 남음. **4242(장비)는 그대로 병원 네트워크에.**

**⑤ 현장에서 달라지는 것 (「복잡하지 않을 것」)**
- **의사**: 영상 창이 로그인 없이 바로 열림. 새 탭도 됨. 30분 넘게 창을 열어 두었다가 새로 고치면 영상 창을 다시 열면 됨.
- **설치하는 사람**: 할 일이 **줄어듦** — 뷰어 주소 입력, 9090 방화벽이 없어지고 `pair-with-emr` 한 번이면 끝.
- 영상 서버 관리자 비밀번호는 직원에게 알려 줄 필요가 없어짐.

### 세션별 몫
| 누가 | 무엇 | 크기 |
|---|---|---|
| **PACS** | `pacs.viewer.js`(중계 + 경로 허용 목록 + 쿠키 확인), `viewer-url`이 쿠키를 심고 상대 주소를 돌려줌, 마이그레이션(`orthanc_url`, `orthanc_password`), `GET /config`에서 비밀번호 빼기, `pair-with-emr.ps1`이 Orthanc 비밀번호도 넣기, PACS compose 9090 → 127.0.0.1, setup·start.bat·README 안내, 설정 화면 오더 연동 탭의 칸 정리(PACS 몫), 위키 2.3·6.1 | 중간 |
| 진료 | **없을 것으로 봄**(영상 창은 `viewer-url`의 `url`을 그대로 씀). 「새 탭에서 열기」도 같은 `url`. 만든 뒤 확인만 | — |
| 설정 | 상태 화면: 「EMR → 영상 서버」 연결(백엔드가 `orthanc_url`에 비밀번호로 닿는지), P-25 경고를 새 칸 기준으로 | 작음 |
| 총괄 | nginx·EMR compose **변경 없음**(확인만). 출발 전 확인 목록에서 9090 방화벽 줄 빼기. 실행 중 PACS의 9090을 127.0.0.1로 바꾸는 재생성 | 작음 |

### 시험 계획 (격리 스택: EMR 9188 → PACS 9198)
1. **의사**: 진료 → 영상 창 → 로그인 창 없이 영상. 새 탭도. 한국어·프랑스어.
2. **막히는 것**
   - 쿠키 없이 → 401
   - 다른 환자 study UID를 주소에 넣음 → 403
   - 필터 없는 `dicom-web/studies` → 403
   - POST·DELETE → 405
   - 만료된 쿠키 → 401
   - 진료 권한을 뺀 계정(S1) → 다음 요청부터 401/403
   - 수납·간호사 계정은 `viewer-url`부터 403
3. **비밀번호**: `GET /config` 응답에 없음, EMR 로그에 없음. `pair-with-emr` 뒤에도 영상이 열림(비밀번호가 바뀌어도 같이 바뀜).
4. **9090**: PACS 격리 스택을 127.0.0.1로 두고도 EMR이 닿음(E1에서 확인됨).
5. **속도**: 영상 10장짜리 검사를 열 때 걸리는 시간, 직접 연결과 비교.
6. **Stone의 다른 버튼**(다운로드 등)이 막히는지 — 막히면 막힌 경로를 보고 허용 여부를 결정(기본은 막음).

- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음(설계상 1건) · **번역 키**: 없음

## 2026-09-29 — 영상 백업 만듦 (결정 41) · 위키 6.1 다시 · 2.6 한 줄 · 오프라인 키트 검토

- **상태**: 확인 요청
- **커밋**: **PACS 저장소** `session/pacs` **`8fcf65f`** (`main` `d3d001c` 위 한 개). **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋
- **한 일** (설계 메모 그대로, 총괄 조건 모두):
  - PACS 새 파일 5개: `image-backup-common.ps1`(공용), `prepare-backup-disk.ps1`, `image-backup.ps1`, `install-image-backup.ps1`, `restore-image-backup.ps1`. `.gitignore`에 `logs/`, README에 「Image backup」.
  - EMR `POST /api/pacs/image-backup-report`(브리지 토큰, **헤더**) → `service_heartbeat` `pacs_image_backup`, `last_success`는 실패한 날에도 이어 둠. 본문에 환자 정보 없음(개수·공간·오류 글자).
  - 조건: 임시 이름(`.part`) → 크기 확인 → 이름 바꿈 / seq는 한 묶음(200건) 다 받은 뒤에만 / 디스크 가득 → 멈춤·실패 보고, 끝에 10% 미만이면 경고 / 복원 끝에 「EMR 오더 중 영상 기록 있는데 Orthanc에 없는 수」.
  - 위키: **6.1을 새 도구 기준 설치 순서로 다시 씀**(키트 → 설치(포트 확인·자동 짝) → EMR 복원 → **다시 pair-with-emr** → 뷰어 주소 → **영상 복원** → 영상 백업 켜기 → 확인), **6.2 영상 백업** 새로, **2.6**에 「취소한 검사에 나중에 영상이 들어와도 도착 표시 없음 — 영상 창으로 확인」, **2.7** 영상 백업 경고가 떴을 때(직원용), 4절 API, 7절 P-24 🟡.
- **시험** (격리 스택 EMR 9188 + PACS 9198, 시험용 폴더를 디스크로 — 실행 중 PACS 9090엔 아무것도 안 함, **예약 작업 등록 안 함**: `-WhatIf`만, 등록 안 된 것 확인):
  - 디스크 준비: 비어 있지 않은 폴더 거절 → `-Force` 준비 → 다시 하면 「이미 준비됨」.
  - 백업: 첫 실행 9장 → 다시 0장 → 새 검사 2장만 → 받기 전에 지운 검사 건너뜀(실패 아님) → 남은 `.part` 지움 → 디스크 가득(여유를 일부러 크게) 멈춤·seq 그대로 → 디스크 없음 exit 2·`disk_found:false` → 디스크 둘 멈춤 → 정상. 각 결과가 EMR 줄에, `last_success`는 실패 뒤에도 유지. 파일 경로는 UID뿐.
  - 복원: 격리 Orthanc에서 검사 하나(3장) 지움 → `-Verify` VERIFIED(디스크 11 ≥ Orthanc 8) → 복원 3 새로·8 이미 → 다시 0 새로 → 「missing from Orthanc」 4→3(남은 3은 가짜 Orthanc 시절 시험 오더 — 정상).
  - **시험 중 찾아 고친 것 셋**: ① 디스크가 하나일 때 PowerShell이 목록을 풀어 `$disks[0]`가 「C」 한 글자가 됨 → 첫 시험 파일이 PACS 작업 폴더 안 `C\`에 써짐(시험 사본 9장 + state — 지움, 커밋 안 됨) ② `File.Replace`에 `$null`을 넘기면 PowerShell이 빈 글자로 바꿔 거절 → `[NullString]::Value` ③ 디스크 없음·둘일 때 목록이 한 겹 더 싸임 → 반환 방식 고침.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 실제 USB 디스크(드라이브 글자로 찾기 — 시험은 폴더를 `-SearchRoots`로), 작업 스케줄러 실제 실행, 대용량(수천 장) 속도. 리눅스·NAS `.sh`는 아직.
- **설정 세션에 부탁** (총괄 전달): `status.routes.js`에 `pacs_image_backup` 줄 — 보고 없음(꺼짐) / `disk_found=false` / `ok=false` / `last_success`가 36시간 넘음 / `free_gb/total_gb` 10% 미만 → 노랑·빨강, `error` 글자 보여 주기. `server-status.ps1`은 PACS 폴더 `logs\image-backup-status.json`(`at`, `ok`, `disk_found`, `error`, `free_gb`, `total_gb`)을 읽기 — EMR이 멈춰도 보이게.
- **오프라인 키트 검토 (총괄 `11fbf03`)**: F-1~F-5 모두 들어감(PACS `.env` 없을 때 자리값, MANIFEST에 두 저장소 커밋·고친 파일 경고, 이미지 이름표 되돌리기, `.env*`·`*.env`·`*.bak` 제외 + `.claude`까지 뺀 것 좋음, PACS 실패 경고, 설치 끝 안내에 짝 맞춤·뷰어 주소·포트·방화벽·고정 IP·「영상은 EMR 백업에 없음」). **빠진 것 둘**: ① 제외 목록에 **`logs`**(PACS 폴더의 `logs\image-backup.log`·`image-backup-status.json` — 환자 정보는 없지만 그 PC의 기록) — `pack.ps1`의 `$excludeDirs`와 `pack.sh` `--exclude=logs` ② 설치 끝 안내의 「Plan a copy of …\storage to a second disk」 → 「`prepare-backup-disk.ps1` + `install-image-backup.ps1` (EMR 위키 PACS 6.2)」로.

## 2026-09-29 — 영상 오더 취소를 실제 브리지로 끝까지 확인 · 위키 문구 맞춤 (총괄 표의 PACS 1·2·3)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만, develop `c7d8939`로 ff한 뒤). **PACS 저장소** — 없음
- **1) 실제 브리지에서 빠지는지** — 격리 스택(EMR 9188 develop 최신 + PACS 9198/11298, 브리지 `d3d001c`), 의사 계정·`POST /api/consultations/order/:id/cancel`:
  - 촬영 전 영상 오더에 판독 → 취소: 오더·`worklist_status`·워크리스트 모두 `cancelled`, **브리지 한 바퀴 뒤 `.wl` 삭제**(`260929-11.wl` 사라짐).
  - 촬영 끝난(completed) 오더 취소: 오더 `cancelled`, **워크리스트 줄 `completed` 그대로**, `worklist_status` `completed` 그대로.
  - 취소 뒤 영상이 늦게 도착: 브리지 로그에 그 accession이 **0줄**(피드에 없어 안 물음) → 「도착」 기록 없음, 워크리스트 `cancelled` 그대로. `viewer-url`은 `cancelled:true`·UID가 든 주소 → 영상은 볼 수 있음. 판독 저장은 409 `Imaging order was cancelled`.
- **2) 위키 문구**: 2.1 ④ ②의 물음을 영상 전용 키 `cs_cancelPromptImg`(fr·ko) 그대로, ③을 실제 화면(오더 줄이 회색·줄긋기)대로. 7절 P-23 ✅.
- **3) P-25 포트**: 앞 항목(영상 백업 메모) 끝에 답 — PACS 저장소는 README의 「예전에 8090」 설명만(의도), EMR 예시는 이미 9090·9080(`890c64a`).
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **격리 스택**: 시험 뒤 내림.

## 2026-09-29 — 설계 메모: 영상 백업 (결정 41 — 매일 밤 외장 USB 디스크, 새 영상만, 디스크 없으면 경고) · P-25 포트

- **상태**: 끝 — 만듦. 위 항목 「영상 백업 만듦 (결정 41)」
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만). **PACS 저장소** — 없음

### 한 줄 요약
**PACS 폴더의 PowerShell 스크립트를 Windows 작업 스케줄러가 매일 밤 02:30에 돌려**, Orthanc REST에서 **지난번 이후 새로 들어온 영상(DICOM 파일)**만 받아 외장 디스크에 쓰고, 결과를 EMR에 보고해 **상태 화면에 경고**가 뜨게 한다. 복원은 그 파일들을 Orthanc에 다시 올리는 스크립트 — **11월 새 PC로 영상을 옮길 때도 같은 방법**.

### ① 무엇이 돌리나 — 호스트의 예약 작업
- **Windows 작업 스케줄러**, 매일 **02:30**(EMR DB 백업 기본 02:00과 겹치지 않게), 「사용자가 로그온할 때만 실행」. Docker Desktop 자체가 로그온한 사용자 세션에서 돌아서 조건이 같음. 관리자 권한·비밀번호 저장이 필요 없음.
- 등록은 `install-image-backup.ps1`이 한 번. 실행은 `image-backup.ps1`. 둘 다 PACS 저장소. 리눅스·NAS는 cron + `.sh`(같은 설계, 나중에).
- 왜 컨테이너가 아닌가: USB 디스크는 드라이브 글자가 바뀌고 빠질 수 있음. 컨테이너의 마운트는 만들 때 고정되고, 디스크가 없으면 컨테이너가 안 뜨거나 빈 폴더에 씀. 왜 EMR 백업 서비스가 아닌가: 설정 세션 파일이고 EMR 컨테이너 안에서 돌아 호스트 USB를 못 봄.
- 놓친 밤(PC가 꺼져 있었음)은 작업 스케줄러의 「예약을 놓치면 가능한 빨리 실행」으로 따라잡음.

### ② 쓰는 중인 Orthanc를 어떻게 일관되게 — 파일 복사가 아니라 Orthanc에게 받기
- `storage` 폴더를 통째로 복사하지 않음. 색인(SQLite)은 쓰는 중에 복사하면 깨질 수 있고, 그러려면 Orthanc를 멈춰야 함. 또 그 폴더 형식은 Orthanc 판에 묶임.
- 대신 **Orthanc REST**:
  - `GET /changes?since=<seq>&limit=500`에서 `NewInstance`를 모아 `GET /instances/<id>/file`로 **원본 DICOM 파일 그대로** 받음.
  - 받는 것은 Orthanc가 다 저장한 것뿐이라 일관성 문제가 없음. 멈출 필요도 없음.
  - 표준 DICOM이라 **다른 Orthanc 판·다른 PACS로도 복원 가능**.
- 「새로 생긴 영상만」: 마지막 `seq`를 **디스크 자체에** 저장(`state.json`). 디스크를 새것으로 바꾸면 처음부터 전부 복사되어 저절로 맞음.
- 파일 자리: `<디스크>:\BethesdaPACS\images\<StudyInstanceUID>\<SOPInstanceUID>.dcm` — **경로에 환자 이름을 넣지 않음**. 이미 있으면 건너뜀(다시 돌려도 안전). 하나 받을 때마다 크기 확인.
- **지우지 않음**: Orthanc에서 지운 영상도 디스크에는 남음(실수로 지운 것 되살리기). 보관 기간 없음. 용량 경고로 관리.

### ③ 대상 디스크를 어떻게 알아보나 — 표시 파일
- 드라이브 글자는 바뀌므로, 디스크 맨 위의 **표시 파일 `BETHESDA-PACS-BACKUP.id`**(처음 준비할 때 `prepare-backup-disk.ps1`이 만듦: 디스크 ID·만든 날)로 찾음. 모든 드라이브를 훑어 이 파일이 있는 곳을 씀.
- 표시 파일이 **둘 이상이면 멈추고 경고**(어느 쪽인지 모름). **없으면 「디스크 없음」 경고**. 볼륨 이름(label)은 보조 확인만.
- 준비할 때 디스크가 **비어 있지 않으면 확인을 물음**(다른 디스크를 잘못 고르지 않게).

### ④ 경고를 어디에
- **EMR 상태 화면**: 스크립트가 끝나면 `POST /api/pacs/image-backup-report`(**PACS 라우트, 새로**, 브리지 토큰 — PACS `.env`에서 읽음)로 `{ok, disk_found, copied, total_on_disk, free_gb, error}`를 보냄 → `service_heartbeat`의 `pacs_image_backup` 줄.
  - 설정 세션 부탁: `status.routes.js`에 줄 하나 — 디스크 없음 / 실패 / **마지막 성공이 36시간 넘음**(작업이 안 돈 것) / 여유 공간 10% 미만 → 노랑·빨강.
  - 한 번도 보고가 없으면 「꺼짐」(영상 백업을 안 쓰는 병원).
- **서버 상태 창**(`server-status.ps1`, 설정 세션): 호스트에서 돌므로 디스크의 `state.json`(마지막 성공 시각)을 직접 읽을 수 있음. EMR이 멈춰도 보임 — 설정 세션 부탁.
- 스크립트 자신의 기록: PACS 폴더 `logs\image-backup.log`(환자 이름 없이 개수·오류만, 오래된 것 정리).

### ⑤ 복원과 연습
- **복원** `restore-image-backup.ps1`: 디스크의 `.dcm`를 Orthanc에 `POST /instances`로 다시 올림. 이미 있으면 Orthanc가 「이미 있음」으로 답해 **다시 돌려도 안전**. 끝나면 Orthanc 영상 수와 디스크 파일 수를 비교해 알려 줌.
  - 쓰는 때: 디스크 고장 뒤, 그리고 **11월 새 PC**(PACS 설치 → EMR 백업 복원 → `pair-with-emr` → 영상 복원).
  - 영상의 StudyInstanceUID가 그대로라 EMR 오더와의 연결(`study_instance_uid`·`image_study_uid`)도 그대로 살아남.
- **연습**: `restore-image-backup.ps1 -Verify`(읽기만)를 달마다 — 디스크에서 무작위 20개를 읽어 DICOM으로 열리는지, 파일 수 ≥ Orthanc 수인지.
  - 석 달에 한 번은 **PACS 격리 스택(9198)에 실제로 복원**해 영상이 열리는지 봄(실행 중 PACS는 안 건드림).
  - EMR의 `verify-backup.ps1`과 같은 자리에 기록.

### 용량·기타
- 대강 CR 한 장 10~30MB, 초음파 한 검사 수십 MB. 하루 20검사 × 30MB ≈ 0.6GB → **1TB로 수년**(실제 장비가 붙으면 첫 달 수치로 다시 계산).
- 디스크에는 환자 영상(개인정보)이 그대로 있음 → 서버 옆에 두되 잠금 장소. 암호화(BitLocker To Go)는 관리자 권한·복구 키 관리가 필요해 **실장님 결정**으로 남김.
- 디스크를 늘 꽂아 두면 랜섬웨어에 같이 당할 수 있음 — 결정 41이 디스크 1개라서 여기까지. 두 개를 번갈아 쓰는 것은 나중 선택.

### 만들 것과 세션별 몫
| 누가 | 무엇 | 크기 |
|---|---|---|
| PACS | `prepare-backup-disk.ps1`, `image-backup.ps1`, `install-image-backup.ps1`(예약 작업 등록/해제), `restore-image-backup.ps1`(+`-Verify`), `pacs.routes.js`의 `POST /image-backup-report`, 위키 | 중간 — 격리 스택(Orthanc 9198 + 시험 USB 대신 폴더)으로 시험 |
| 설정 | `status.routes.js` 줄 하나, `server-status.ps1` 줄 하나, 번역 | 작음 |
| 총괄 | 출발 전 확인 목록에 「백업 디스크 준비·예약 작업 등록·연습 한 번」, 오프라인 키트에 스크립트 포함(PACS 폴더에 있으므로 자동) | 작음 |

### P-25 포트 (총괄 질문)
- PACS 저장소: 옛 포트가 남은 곳은 README의 「예전에 8090을 썼다」는 설명 한 곳뿐(의도). `start.bat`·`setup`은 이미 9090과 LAN IP 안내(`d3d001c`).
- EMR 설정 화면 예시 `NAS_IP:8090`은 **`frontend/src/pages/Settings.jsx`의 오더 연동 탭**(PACS 몫)에 있었고, **P-17로 이미 `NAS_IP:9090`**, 피드 주소 예시도 `:9080`(`890c64a`, develop에 있음). 설정 세션에 전달할 것 없음.

## 2026-09-29 — G-1~G-4: 설치 때 토큰을 화면에 안 찍고 짝 맞추기 · 포트 경고 · LAN IP 안내

- **상태**: 확인 요청
- **커밋**: **PACS 저장소** `session/pacs` **`d3d001c`** (그 앞 `94935f0` — 둘 다 `main` `6c135aa` 위). **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋(위키만)
- **한 일** (PACS 저장소):
  - **G-1 새 `pair-with-emr.ps1` / `pair-with-emr.sh`** — 재부팅 날 검증한 `rotate-token.ps1`를 정식 도구로. 새 토큰(48자) → EMR `pacs_config`에 **stdin**으로(최대 1분 재시도 — EMR이 막 떠서 표가 아직 없을 때) → EMR이 성공한 뒤에만 `.env` 한 줄 교체 → 두 값을 md5로 비교 → 브리지 재생성(`-NoRestart`/`NO_RESTART=1`로 끌 수 있음). 값은 화면·명령줄·로그에 안 나옴. 옛 `.env` 사본은 **PACS 폴더 밖(TEMP)**에 두고 성공하면 지움(키트에 비밀값 사본이 섞이지 않게 — F-4와 같은 이유). **설치 뒤, 그리고 EMR 백업을 복원한 뒤** 쓰는 도구.
  - `setup.ps1`/`setup.sh`: 첫 설치(`.env`를 새로 만든 경우)에 EMR DB(`bethesda-emr-db`)가 돌고 있으면 위 도구로 자동 짝 맞춤 → 「paired — nothing to copy」. 아니면 예전처럼 토큰을 찍고 도구를 안내. 끝에 「백업 복원 뒤에는 pair-with-emr를 다시」 안내.
  - **G-3 새 `check-windows-ports.ps1`**(읽기만): 동적 포트 범위와 지금의 예약 구간을 읽어 9090·4242가 걸리면 경고 + 고치는 명령(관리자) 안내, exit 1. `setup.ps1`이 컨테이너를 띄우기 전에 부름(경고만, 멈추지 않음).
  - **G-4**: `setup`이 이 PC의 LAN IPv4(가상 어댑터 제외)로 「PACS 웹/뷰어 주소: http://<IP>:9090」을 찍음, `start.bat` 끝 안내도 localhost 대신 그 주소로·짝 맞춤 결과를 읽으라고.
  - `setup.ps1`: 컨테이너 단계부터 `$ErrorActionPreference='Continue'` + 종료 코드 확인 — PowerShell 5.1이 native 명령의 stderr를 멈춤 오류로 바꾸는 문제(시험에서 실제로 `NativeCommandError`로 멈춘 것을 보고 고침).
  - `README.md` 짝 맞추기 절을 새 방식으로.
- **G-2(P-13)** 는 총괄의 `offline/pack` F-1과 같이 — 이번에 안 함.
- **확인한 방법**:
  - `pair-with-emr.ps1`: 시험용 `.env` + 격리 EMR DB — 정상(OK, 48자, 다른 줄 그대로, TEMP 백업 남지 않음), 컨테이너 없음·DB 멈춤·`BRIDGE_TOKEN` 두 줄 → 친절한 한 줄 + exit 1(처음엔 컨테이너 없음에서 `NativeCommandError`로 멈춤 → 고친 뒤 다시).
  - `pair-with-emr.sh`: Git Bash에서 같은 시험 — 정상·컨테이너 없음·두 줄.
  - `check-windows-ports.ps1`: 9090·4242 → 조용히 exit 0, 5357(예약)·50000(동적 범위+예약) → 경고 3줄 + exit 1.
  - 세 `.ps1` PowerShell 파서 오류 0, `sh -n` 두 `.sh`.
  - 시험 뒤 격리 EMR의 토큰을 격리 브리지 값으로 되돌림.
- **확인 못 한 것**: **`setup.ps1`/`setup.sh` 전체는 돌려 보지 않음** — `docker compose up`이 실행 중 PACS와 같은 이름(`bethesda-pacs`)으로 뜨고, 짝 맞춤이 실행 중 EMR DB에 쓰게 되므로. 바뀐 부분은 위 두 도구 호출과 안내 글자뿐. 새 PC 설치 때(또는 총괄이 오프라인 키트 시험 때) 처음 실제로 돎.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **위키**: `modules/pacs.md` 6.1 ②-4·②-5·③·④ 표, 8절
- **총괄께**: F-6(`install-offline`의 「paste the bridge token printed above」)은 이제 「setup이 짝 맞춤을 알려 줌, 아니면 pair-with-emr」로 바꾸면 됨. 출발 전 확인 목록의 「복원 뒤 짝 맞추기」 줄은 `.\pair-with-emr.ps1` 한 줄로.

## 2026-09-29 — P-9 선택지: 영상 창이 영상 서버 로그인을 요구하는 문제 (결정 세션용)

- **상태**: 보류 — 선택지만(코드 변경 없음), 실장님 결정 필요
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음

**지금 어떤가 (확인한 것)**
- 영상 서버(Orthanc)는 로그인이 켜져 있고 계정은 **관리자 하나**뿐입니다. 이 계정으로는 영상 **삭제·수정**까지 됩니다.
- 브라우저에서 `http://서버:9090`을 바로 열면 **로그인 창**이 뜹니다(R-1, 총괄 확인).
- 그런데 **EMR 진료 화면의 영상 창 안에서는 로그인 창도 없이 까만 화면만** 나왔습니다(격리 스택, 앱 안 브라우저 — 서버 응답 401). 현장 Chrome/Edge에서도 같은지는 확인 필요. 의사는 왜 안 보이는지 알 수 없습니다.

**실장님께 드릴 질문**: 「의사가 영상 창을 열 때 영상 서버 비밀번호를 쳐야 하는 방식을 어떻게 할까요?」

| | 방법 | 의사가 겪는 것 | 보안 | 작업 |
|---|---|---|---|---|
| **A** | 지금대로 + 안내: PC마다 처음 한 번 **「Ouvrir dans un onglet (새 탭에서 열기)」**로 로그인해 브라우저가 기억하게 | PC·브라우저마다 첫 로그인 한 번. 그 뒤 영상 창 안에서 보이는지는 **확인 필요**(브라우저마다 다를 수 있음). 기억을 지우면 다시 까만 화면 | 모든 의사가 **관리자 비밀번호**를 알게 됨 → 영상 삭제 가능 | 없음(안내만) |
| **B** | 영상 보기용 계정을 하나 더 만듦 | A와 같음 | 관리자 비밀번호와 **나뉘기만** 할 뿐, 영상 서버의 기본 로그인은 권한 구분이 없어 **여전히 삭제 가능** | 작음 |
| **C** (추천) | **EMR이 대신 보여 줌** — 영상 창이 영상 서버가 아니라 EMR을 거쳐 열림, EMR이 서버 안에서만 영상 서버 비밀번호를 씀 | **EMR 로그인만 하면 바로 보임**. 로그인 창·까만 화면 없음 | 영상 서버 비밀번호가 **직원에게 가지 않음**, 진료 권한 있는 직원만 볼 수 있음(S2와 같게). 진료실 PC는 9080만 열려 있으면 됨(9090을 병원 네트워크에 안 열어도 됨) | 중간 — EMR 서버 설정(공용 파일, 총괄과)·뷰어 경로 확인 필요, 격리 스택으로 시험 가능 |
| D | 영상 창을 없애고 늘 새 탭으로 | 새 탭에서 로그인(A와 같음), 판독 칸과 영상이 다른 창 | A와 같음 | 작음(진료 화면 변경) |

**추천**: **C**. 11월 새 PC 설치 전에 끝내는 것을 목표로. 그때까지 현장에 영상 장비가 붙지 않으면 A 안내도 필요 없음. 장비가 먼저 붙으면 그동안은 A로 안내.

- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 현장 브라우저(Chrome/Edge)에서 영상 창 안의 모습, A에서 한 번 로그인한 뒤 영상 창이 보이는지.

## 2026-09-29 — PACS 격리 스택으로 진짜 Orthanc 시험 · P-4 1·2단계 · P-8 확인

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋. **PACS 저장소** `session/pacs` **`94935f0`** (브리지 P-4 + `docker-compose.session.yml`) — `main`(`6c135aa`) 위 한 개
- **한 일**:
  - **PACS 격리 스택**(결정 24): `docker-compose.session.yml` — `-p bethesda-s-pacs-pacs`, 포트 **127.0.0.1:9198(웹)·11298(DICOM)**만, 영상·워크리스트는 이름 붙인 볼륨, 브리지 이미지 `bethesda-s-pacs-bridge:dev`, 브리지는 EMR 격리 스택 네트워크의 `backend`를 읽음, 시험용 값은 `--env-file`. `docker compose config`로 확인: 9090·4242·`./storage` 없음. 띄운 동안 실행 중 `bethesda-pacs`·`bethesda-worklist-bridge`는 그대로(같은 이미지·가동 시간).
  - **P-7·P-3 끝까지(진짜 Orthanc 26.6.1)**: 오더 → `.wl` → 영상 업로드(REST, 장비 대신) → T1 3장 `match`, T2 `mismatch`(다른 환자번호) → 둘 다 `completed`, 다음 바퀴 `.wl` 삭제. 전송 뒤 1~2분.
  - **P-4 1·2단계**: 브리지가 UID로 못 찾으면 AccessionNumber로(정확히 하나일 때만) → `found_by`·`accession_no`·`image_study_uid`를 보냄. EMR `/study-arrived`가 accession 일치를 다시 확인(아니면 409), **새 마이그레이션 `802_pacs_image_study_uid.sql`**(칸 추가만)의 `image_study_uid`에 저장, `viewer-url`은 그 UID로 엶(`images.linked_by`), 판독 목록에 노란 한 줄(`px_linkedByAccession`). 시험: UID를 새로 만든 T3 → accession으로 연결·`match`·뷰어 주소 실제 UID. 같은 accession 둘(T5) → 연결 안 함(로그 「more than one study carries accession」 — 바퀴마다 한 줄, 조금 시끄러움). 틀린 accession·실제 UID 없는 보고 → 409.
  - **P-8 확인**: Orthanc가 자기에게 MWL C-FIND(장비처럼) — 거름 없음·`ANY`·`*` → 전부, **`XRAY01`(장비 자기 AE) → 0건**. `.wl`의 칸을 비우거나 빼도 0건 → 브리지로 못 고침. 선택지는 위키 7절 P-8(추천: 장비에서 AE 필터 끄기, 안 되는 장비만 장비별 `.wl`). 장비 설치 날 결정.
  - **R-1 (영상 창 안)**: 진료 → 영상 창(iframe)이 Stone 뷰어를 부르면 **401**, 이 브라우저(앱 안 Chromium)에서는 **로그인 창도 없이 까만 화면**. 덩어리 4(P-9 선택지)에 반영.
- **바꾼 파일**: EMR `backend/src/routes/pacs.routes.js`, **새** `backend/sql/802_pacs_image_study_uid.sql`, `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(3.3, 4절 API·DB, 7절 P-4·P-7·P-8·격리 스택, 8절), `wiki/handoff/pacs.md` · PACS `bridge/bridge.py`, **새** `docker-compose.session.yml`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이 키 1개
- **DB 마이그레이션**: `802_pacs_image_study_uid.sql` — `worklist_log.image_study_uid VARCHAR(128)` 추가만(총괄이 다음 번호로 다시 매김)
- **번역 키**: `px_linkedByAccession` (ko·en·fr)
- **확인한 방법**: `node --check`, `py_compile`, 프론트 빌드, 격리 스택(EMR 9188 + PACS 9198/11298) — 위 시험, 판독 목록 프랑스어 화면(T3 노란 줄·T2 빨간 경고·T5 대기).
- **확인 못 한 것**: 실제 장비의 C-STORE·MWL(장비 설치 날 D-1~D-7).
- **총괄 확인 요청**: PACS `94935f0`은 브리지를 다시 빌드해야 반영됨(`docker compose up -d --build`, 실행 중 PACS에서 — 총괄). EMR 쪽이 먼저 합쳐져도 옛 브리지는 `found_by`를 안 보내므로 지금과 같음.
- **격리 스택**: 아직 띄워 둠(덩어리 5 G-1~G-4 시험에 씀) — 끝나면 내림.

## 2026-09-29 — 직원용 안내: 결과 있는 영상 검사 「취소됨」 (결정 38-③)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` 2절 — **2.1 ④** 결과 있는 영상 검사를 지우려 할 때의 순서(빨간 ✕ → 묻는 창 → Motif → OK → 회색 Annulé, 수납했으면 환불, 되돌리기 없음). 문구는 진료 세션의 실제 키(`cs_cancelHint`·`cs_cancelPrompt`·`cs_imagingNoCancel`, fr·ko)에서 옮김. **2.3** 로그인 창은 「물을 수 있음 — 확인 필요」에서 「묻습니다(확인됨)」로. **2.4** 취소된 영상 검사가 보이는 모습(흐림·줄긋기·Annulé·이유, 영상·경고·판독은 그대로, 판독 새로 저장 안 됨). **2.6 ⑤** 다른 환자의 영상이면 → 취소로 표시(이유에 적기) → 필요하면 새 검사로 다시 촬영(의사 판단) → 관리자에게.
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 진료 세션이 영상 취소를 켠 뒤의 실제 화면(켜는 중). 켜진 뒤 한 번 눌러 보고 다르면 고치겠음. `cs_cancelPrompt`는 지금 「검사 목록(la liste du laboratoire)」이라고 쓰여 있어 영상 오더에도 같은 문구가 뜨면 조금 어색함 — 진료 세션에 참고로.
- **다른 세션에 부탁**: 진료 — (참고) 영상 오더를 취소할 때 묻는 창 문구가 「검사 목록」 대신 영상에 맞게 나오면 좋겠음.

## 2026-09-29 — 재부팅 뒤 위키 정리 (P-1 끝) · 8090 설정의 출처

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `2a76b5f`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` — 2.4의 과도기 임시 안내 삭제, **P-1 ✅**(총괄 결과 요약), P-7에 진짜 Orthanc 응답 확인(R-5)과 과도기 끝, P-9에 R-1 결과(로그인 창), server-status 줄 갱신(R-3 안 봄), **P-25 새로**(옛 8090 설정). 인계 노트 절차서 머리에 「끝남」과 R-1~R-5 결과.
- **8090은 어디서 왔나** (총괄 질문): **코드·시드·마이그레이션이 넣은 값이 아님.** `pacs_config.pacs_viewer_url`·`emr_base_url`의 기본값은 처음부터 빈 값(`001_schema.sql`, `pacs.routes.js` `ensureConfig`, 첫 커밋 `e553fef`부터). 6~7월 설치 당시 **안내가 8090·8080**이었음 — PACS `README.md`(「Set PACS web / viewer URL to `http://<this-host-ip>:8090`」, 첫 커밋 `343e4e5`~`4f5320e` 전), `start.bat`(`18485a8`), EMR 설정 화면 예시 `NAS_IP:8090`(P-17로 고침), EMR 자체는 `f2ab532`(2026-07-23) 전까지 8080. 사람이 안내대로 넣은 값이 7월 23일 포트 이전 때 **바꿔 주는 장치 없이 그대로 남음**. 같은 시기에 설치한 곳은 모두 같을 수 있음. 막는 후보 두 가지를 P-25에 적음(상태 화면 경고 / 옛 값일 때만 바꾸는 마이그레이션 — 후자는 데이터 변경이라 결정 필요).
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음

## 2026-09-29 — 총괄 확인: P-1 조치 끝 (재부팅 뒤)

- **상태**: 끝. 실장님이 netsh 두 줄 실행 + 재부팅, 총괄이 절차서 ①~⑤를 그대로 진행.
- ① 동적 포트 범위 ipv4·ipv6 모두 시작 49152 · 16384. 제외 구간에 4242·9080·9090 없음(남은 구간: 5357, 7895, 7936, 39091, 39721, 50000–50059, 60039–60338). 세 포트 모두 연결됨.
- ② PACS 저장소 `main` `c9dc0b4` → **`6c135aa`**(ff). ③ 토큰 재발급 `OK`(값은 어디에도 찍지 않음). ④ `docker compose up -d --build` — 브리지·Orthanc 모두 다시 만들어짐, 둘 다 healthy.
- ⑤-2 브리지 로그: `synced` 15초마다, 나쁜 문구 5종 모두 0. ⑤-3 heartbeat 10초 전 · ok · 오류 칸 비어 있음(EMR 재배포 뒤에도 6초 전 · ok). ⑤-4 새 브리지로 바뀐 뒤 EMR 로그의 `token=` 0줄(바뀌기 전 3분 창에는 옛 브리지의 6줄이 있었음 — 옛 토큰, 이제 무효).
- **R-5**(⑤-5): `1 upload: 200` / `2 has IsStable: True | IsStable now: False` / `3 PatientID: PX-TEST-0000` / `5 IsStable after 75 s: True` / `6 CountInstances: 1` / `7 delete: 200` — 기대와 모두 같음.
- **R-4**: `GET /api/pacs/test` → ok, host `host.docker.internal`, port 4242, 「TCP connection succeeded」.
- **R-1 (일부)**: `http://localhost:9090/`와 `/stone-webviewer/index.html` 모두 **401** → 브라우저에서 로그인 창이 뜸(①). 영상 창 안에서 어떻게 보이는지는 화면으로 보지 않았음.
- **찾은 것**: 실행 중 EMR의 `pacs_config.pacs_viewer_url`이 **`http://localhost:8090`**, `emr_base_url`이 `http://localhost:8080` — 9090·9080이 아님. 영상 창이 열리지 않는 주소. 설정 → 오더 연동에서 고쳐야 함(실장님께 안내).
- **R-3**(server-status 창)은 보지 않았음.
- ⑤-7 `.env` 백업(`pacs-env-before-p1`) 삭제함. 되돌리기용 이미지 이름표 `before-p1`은 남겨 둠.
- 실장님 결정: 시험용 영상 서버(격리 스택) **허락**(웹 9198 · 영상 11298, 이 PC 안에서만, 실행 중 영상 서버와 storage는 건드리지 않음, 다 쓰면 내림).

## 2026-09-29 — P-13 조사: 새 PC 설치(결정 35)에서 PACS에 일어나는 일 · 고칠 것 목록

- **상태**: 보류 — 읽고 적기만 함(아무것도 실행하지 않음, 코드 변경 없음). 고칠 것은 총괄과 같이 정함
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `132daea`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **읽은 것**: EMR `offline/pack.ps1`·`pack.sh`·`install-offline.ps1`·`install-offline.sh`·`OFFLINE-INSTALL.md`·`DEPLOYMENT.md` 5b(복원)·`backend/src/services/backup.js`(pg_dump), PACS `setup.ps1`·`setup.sh`·`start.bat`·`docker-compose.yml`.
- **결과**: `modules/pacs.md` **6.1 「새 PC에 설치할 때 (PACS)」** — ① 키트 만들기 ② 설치·토큰이 생기는 때와 짝 맞추는 길 ③ 현지 PC 확인(동적 포트 범위·방화벽·고정 IP·영상 백업) ④ 백업 복원 뒤 어긋나는 것 표. 7절에 **P-24 [보통] 영상 백업 없음**.

### 질문별 답 (요약)

1. **토큰·비밀번호가 생기는 때** — 현지 PC에서 `install-offline.ps1`이 부르는 PACS `setup.ps1 -Offline`이 `.env`가 없을 때 `ORTHANC_PASSWORD`(32자)·`BRIDGE_TOKEN`(48자)을 새로 만들고 **토큰을 화면에 찍음**. EMR 쪽은 사람이 **설정 → Flux d'ordres**에 붙여넣는 것이 유일한 길. 키트에는 `.env`가 안 들어가므로 이 PC 값은 따라가지 않음. 포트 9090·4242는 compose 고정. **동적 포트 범위는 현지 PC에서도 반드시 확인**(이 PC가 왜 1024부터였는지 모름 — Docker·WSL 설치 + 재부팅 뒤 `netsh`). **방화벽은 스크립트가 안 건드림** — 다른 PC에서 `Test-NetConnection`으로 9080·9090·4242 확인.
2. **백업 복원 뒤** — `pacs_config`(이 PC 토큰·주소)가 덮여 **브리지 401** → 복원 **뒤에** 짝 맞추기(`rotate-token.ps1`가 그대로 쓰임) + 뷰어 주소·Host를 새 LAN IP로. `worklist_log`의 지난 날 `scheduled` 시험 오더는 피드가 오늘만 주므로 장비에 안 감(복원한 날 만든 것만 주의). 「영상 도착」 기록이 있는데 새 Orthanc에 영상이 없으면 목록은 「N장 도착」·영상 창은 빈 화면 → `storage` 폴더를 옮기거나(이 PC엔 실제 영상이 없을 것) 시험 기록 정리(실장님 결정).
3. **새 브리지가 키트에 들어가려면** — `pack`은 git이 아니라 **`C:\Bethesda-PACS-main` 폴더의 지금 파일**을 복사·빌드함 → **절차서 ②로 PACS `main`에 `6c135aa`를 합친 뒤**, 그 폴더가 `main`이고 `git status`가 빈 상태에서 pack. **MANIFEST에는 EMR 버전만 찍히고 PACS 버전은 안 찍힘.**

### 고칠 것 목록 (고치지 않음 — `offline/`은 총괄 파일, PACS 파일은 합의 뒤)

| # | 파일 (주인) | 무엇 | 왜 |
|---|---|---|---|
| F-1 | `offline/pack.ps1`·`pack.sh` (총괄) | PACS 폴더에 `.env`가 없으면 `ORTHANC_PASSWORD`에 임시 값(JWT_SECRET처럼) | **P-13**(`${ORTHANC_PASSWORD:?}`)을 켜면 pack의 `docker compose build`·`config`가 실패함 — F-1과 G-2는 같이 |
| F-2 | `offline/pack.*` (총괄) | MANIFEST에 **PACS 커밋·브랜치**(`git -C <PACS> describe --always --dirty`, `rev-parse --abbrev-ref HEAD`)와 EMR 커밋. `--dirty`면 경고 또는 중단 | 지금은 어떤 브리지가 들어갔는지 키트만 봐서 모름. 합치지 않은 파일이 섞여도 모름 |
| F-3 | `offline/pack.*` (총괄) | 「Nothing here touches the running stack」는 틀림 — `docker compose build`가 **이 PC의 실행용 이미지 이름표**(`bethesda-emr-*:latest`, `bethesda-pacs-worklist-bridge:latest`)를 덮어씀. 다음에 이 PC에서 `up`하면 pack한 코드가 돎 | 격리 스택 이름표 문제(`657ba2c`)와 같은 종류. 적어도 주석·설명서에 「합친 뒤에만」, 가능하면 키트용 이름표로 빌드 후 `docker tag` |
| F-4 | `offline/pack.*` (총괄) | 제외를 `.env`에서 **`.env*`**(그리고 `*.env`)로 | 지금은 이름이 정확히 `.env`인 것만 빠짐 — `.env.bak`, `test.env` 같은 비밀값 사본이 키트에 들어갈 수 있음 |
| F-5 | `offline/install-offline.ps1:117`·`.sh:83` (총괄) | PACS `setup` 실패를 확인하지 않음 → 실패해도 「Installed」 | EMR은 확인하는데 PACS는 안 함 |
| F-6 | `offline/install-offline.*` 마지막 안내, `OFFLINE-INSTALL.md` (총괄) | 「paste the bridge token printed above」 대신 G-1의 자동 짝 맞추기, 뷰어 주소 = **서버 LAN IP**, 동적 포트 확인, 방화벽 확인, 고정 IP, **영상은 EMR 백업에 없음** | 6.1 ②③ |
| G-1 | PACS `setup.ps1`·`setup.sh` (PACS) | EMR DB 컨테이너(`bethesda-emr-db`)가 같은 PC에 있으면 새 토큰을 **stdin으로 `pacs_config`에 직접** 넣고 「짝 맞춤 완료」만 찍기(`rotate-token.ps1`와 같은 방식). EMR이 없을 때만 지금처럼 찍기 | 토큰이 화면·클립보드·설치 창 기록에 남지 않게, 붙여넣기 실수 없음 |
| G-2 | PACS `docker-compose.yml` (PACS) | **P-13**: `${ORTHANC_PASSWORD:?…}` | F-1 뒤 |
| G-3 | PACS `setup.ps1` (PACS) | 시작 전 동적 포트 범위·예약 구간을 읽기만 해서 9090·4242가 걸리면 경고 | P-1이 새 PC에서 되풀이되지 않게 — 고치는 명령(관리자)은 안내만 |
| G-4 | PACS `start.bat` (PACS) | 끝 안내 「viewer URL http://localhost:9090」 → 「이 PC의 LAN IP:9090」 | 다른 PC 브라우저 기준 |
| G-5 | (결정) | **P-24 영상 백업** — `storage`를 두 번째 디스크로 복사하는 방식·주기 | 디스크 고장 시 영상 전부 잃음 |

### 출발 전 확인 목록에 넣을 줄 (제안)

- [ ] PACS `main`에 `session/pacs`(`6c135aa` 이상) 합쳤고 `C:\Bethesda-PACS-main`이 `main`·`git status` 빈 상태에서 pack 함 — MANIFEST의 PACS 커밋 확인(F-2 뒤)
- [ ] 키트 `Bethesda-PACS\`에 `.env`·`*.env*`·`storage\`가 없음
- [ ] (영상을 옮긴다면) 이 PC Orthanc를 멈추고 `storage` 폴더를 따로 복사 — 장비가 붙은 적이 없으면 필요 없음
- [ ] 현지: Docker·WSL 설치 + 재부팅 뒤 `netsh int ipv4 show dynamicport tcp`가 49152/16384, `excludedportrange`에 9080·9090·4242 없음
- [ ] 현지: 설치 → **EMR 백업 복원 → 그 다음에** 브리지 짝 맞추기(`rotate-token.ps1` 또는 설정 화면), 뷰어 주소·Host를 서버 LAN IP로, `docker compose up -d --force-recreate worklist-bridge`
- [ ] 현지: 다른 PC에서 `Test-NetConnection <서버IP> -Port 9080/9090/4242` 모두 True, 서버 IP 고정(DHCP 예약)
- [ ] 현지: 상태 화면 브리지 초록, 복원한 날의 `scheduled` 시험 오더 0건
- [ ] 영상 백업 방법 정함(P-24)

- **바꾼 파일**: `wiki/modules/pacs.md`(6.1 새로, 7절 P-24, 8절), `wiki/handoff/pacs.md` · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 아무것도 실행하지 않음(지시대로). Docker Desktop이 방화벽 허용을 묻는지, 새 PC 동적 포트 범위 — 현지 확인.

## 2026-09-29 — 위키 2.2: 찍기 직전마다 워크리스트 새로 불러오기 (결정 38-③)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `a264315`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: 실장님 결정 38-③(영상 오더 취소는 검사와 같은 방식, 재부팅 뒤 켬)에 맞춰 `modules/pacs.md` 2.2 ①에 방사선사 안내 추가 — 「환자를 찍기 직전마다 목록을 새로 불러오세요」와 이유(진료실에서 지우거나 취소한 검사가 장비 화면에 남아 있을 수 있고, 그걸로 찍으면 영상이 오더에 안 붙거나 취소된 오더에 붙음). 8절 기록.
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **남은 일**: 재부팅 뒤 영상 취소를 켤 때 2.4(취소된 영상 검사가 보이는 모습)·2.6 ⑤(다른 환자 영상 → 취소로 표시 → 필요하면 다시 오더)를 고침. 장비가 받아 둔 목록을 얼마나 보여 주는지는 D-7.

## 2026-09-29 — P-18: UID 없는 영상 오더에서 다른 환자 목록이 열리지 않게

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `ff53907`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `GET /api/pacs/viewer-url` — 보일 스터디가 없으면(워크리스트로 안 간 영상 오더, 또는 아무것도 안 줌) `url`을 **빈 값**으로, **`no_study: true`** 추가. 전에는 뷰어 주소(`base`)를 그대로 돌려줘서 영상 창에 PACS 첫 화면(모든 환자 목록)이 열렸음. `has_viewer`는 그대로 「뷰어 주소가 설정됐는지」만 뜻함. 안내 문구 키 **`px_noStudy`**.
  - 판독 목록(`RadiologyReadings`)의 「영상보기」는 원래 `study_instance_uid`가 있을 때만 보임 — 확인함, 바꾸지 않음.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `wiki/modules/pacs.md`(4절 viewer-url, 7절 P-18, 8절), `wiki/handoff/pacs.md`(이 항목, 절차서 R-2 정리)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에 키 1개
- **DB 마이그레이션**: 없음
- **번역 키**: **`px_noStudy`** — ko 「이 영상 검사는 촬영 목록(워크리스트)으로 보내지 않아 연결된 영상이 없습니다. 판독만 쓸 수 있습니다.」 / en 「This imaging order was not sent to the device worklist, so no images are linked to it. You can still write the reading.」 / fr 「Cette demande d'imagerie n'a pas été envoyée à la liste de travail des appareils : aucune image n'y est liée. Le compte-rendu peut quand même être saisi.」
- **확인한 방법**: `node --check`, 프론트 빌드 통과. 격리 스택 9188(의사 계정): 워크리스트 없는 영상 오더 → `{has_viewer:true, no_study:true, url:""}` · UID 있는 오더 → `no_study:false`, Stone 뷰어 주소 · 아무것도 안 줌 → `no_study:true, url:""` · 뷰어 주소를 비운 설정 → `has_viewer:false, url:""`. 판독 목록(프랑스어)에서 그 오더에는 「Voir image」 없음.
- **확인 못 한 것**: 진료 영상 창의 새 안내(진료 몫). 그 전까지 진료 영상 창은 `url`이 비면 「뷰어 주소가 설정되지 않았습니다」를 보임 — 문구는 틀리지만 다른 환자 목록은 더 이상 안 열림.
- **다른 세션에 부탁**: **진료** — 영상 창에서 `r.no_study`(그리고 `has_viewer`가 참)면 `t.px_noStudy`를 보이기 (총괄 전달함)

## 2026-09-29 — 결정 세션용 의견: 38-③ 「영상 오더도 같은 방식으로 취소」

- **상태**: 보류 — 의견만(코드 변경 없음), 결정 세션이 실장님께 여쭐 것
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `a7b40e8`을 ff로 당긴 뒤). **PACS 저장소** — 없음

**실장님께 드릴 설명 (짧게)**

> 영상 오더를 잘못 냈을 때, 단계별로 이렇게 됩니다.
> - **촬영 전** — 지금처럼 **지웁니다.** 아무것도 남지 않고, 촬영실 장비 목록에서도 15초 안에 빠집니다.
> - **촬영 중** (방사선사가 장비에서 이미 골라 찍고 있지만 영상이 아직 다 안 들어옴) — EMR은 아직 「촬영 전」으로 알아서 **지워질 수 있습니다.** 그러면 찍힌 영상은 PACS에만 남고 어느 오더에도 안 붙습니다. 이 틈(영상 전송 뒤 약 1분)을 줄이려고 영상 취소는 PACS 새 버전을 합친 뒤에 켭니다.
> - **촬영 뒤 / 판독 뒤** — 지울 수 없고 **「취소」로 표시**됩니다. 오더는 회색 「취소됨」과 이유로 남고 **청구에서 빠집니다.** 찍힌 영상과 판독 글은 **그대로 남아 계속 볼 수 있고**, 판독은 더 고칠 수 없습니다. 「촬영했다」는 기록도 남습니다.
> - **장비에 이미 내려간 목록** — EMR에서 지우거나 취소하면 PACS의 목록에서는 15초 안에 빠지지만, 장비가 **이미 받아 둔 목록 화면**에는 방사선사가 목록을 다시 불러올 때까지 남아 있을 수 있습니다(장비마다 다름 — 장비 설치 날 D-7로 확인). 그 상태로 찍으면 영상은 들어오지만 오더에 안 붙거나(지운 경우) 취소된 오더에 붙어 보입니다(취소한 경우).
>
> **추천**: 영상도 검사와 같은 방식으로 취소 표시 — **PACS 새 버전을 합친 뒤부터** 켜기. 방사선사에게는 「촬영 전에 목록을 한 번 새로 불러오기」를 안내.

- **바꾼 파일**: `wiki/handoff/pacs.md`만 (위 설명 + 장비 설치 날 확인 목록에 **D-7** 추가) · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **근거**: 앞 항목(2026-09-29 의견 `d1979d7`)과 코드 — 삭제 409 조건(`consult.routes.js`), 피드는 `scheduled`만(`pacs.routes.js`), 도착 보고는 Stable 뒤(`bridge.py`), `cancelWorklistForOrder`는 `completed`를 안 바꿈(`pacs.cancel.js`).
- **확인 못 한 것**: 장비가 받아 둔 목록을 얼마나 오래 보여 주는지(D-7, 실제 장비 필요).

## 2026-09-29 — P-22 판독 날짜 현지로 · 영상 오더 취소 준비(P-23, 켜지 않음)

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `6a96193`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**:
  - **P-22**: `RadiologyReadings.jsx`의 `ymd()`를 `LabResults.jsx`와 같은 규칙으로 — 날짜만 있는 값(`visit_date`)은 그대로, 시각이 있는 값(`result_at`, `cancelled_at`)은 브라우저 현지 날짜. 전에는 UTC 문자열을 `T` 앞에서 잘라 현지 00~03시 판독이 전날로 보였음.
  - **P-23 취소 준비** (총괄 결정: 코드는 지금, 영상에 켜는 것은 PACS 저장소 합친 뒤):
    - 새 파일 **`backend/src/routes/pacs.cancel.js`** (PACS 소유): `cancelWorklistForOrder(client, orderItemId)` — 진료 취소 API가 **같은 트랜잭션에서** 부를 함수. `scheduled`·`in_progress` 워크리스트 줄만 `cancelled` + `order_item.worklist_status='cancelled'`, `completed` 줄은 그대로. `ORDER_CANCELLED` 문구 상수도 여기.
    - `GET /pacs/readings/patient/:id`·`GET /pacs/viewer-url`: `order_status`·`cancelled_at`·`cancel_reason`(+ viewer-url은 `cancelled`). 진료 마이그레이션 칸은 **`to_jsonb(oi)->>'cancelled_at'`로 읽어 칸이 없어도 오류 없음** → 진료 마이그레이션보다 먼저 합쳐도 안전.
    - `PUT /pacs/reading/:id`: 취소된 오더면 **409 `Imaging order was cancelled`**. 조건을 UPDATE 안에 넣어 같은 순간의 취소를 덮지 않음.
    - `RadiologyReadings`: 취소된 오더는 흐리게·검사 이름 줄긋기·「취소됨 / Annulé」 배지(이유는 마우스 올리면), 그 아래 「취소됨 · 날짜 — 이유 : …」 한 줄. 「영상 대기 중」은 숨김(아무도 안 찍음). 영상 도착 표시·환자번호 경고·판독·「영상보기」는 그대로(기록).
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, **새** `backend/src/routes/pacs.cancel.js`, `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(4절 API·취소 정보·`cancelWorklistForOrder`, 7절 P-22·P-23, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 4개
- **DB 마이그레이션**: 없음 (취소 칸은 진료 세션 몫)
- **번역 키**: `px_orderCancelled`(취소됨/Cancelled/Annulé), `px_cancelReason`(이유/Reason/Motif), `px_cancelledViewer`(영상 창 머리 안내 — 진료 세션이 쓸 것), `px_readingOnCancelled`(판독 저장 409 안내 — 진료 세션이 쓸 것)
- **확인한 방법**:
  - `node --check` 두 파일, 프론트 빌드 통과
  - 격리 스택 9188: `cancelWorklistForOrder`를 API 컨테이너 안에서 트랜잭션으로 호출 — `scheduled` 오더 → `{worklist_cancelled:1}`, 워크리스트·오더 둘 다 `cancelled`. `completed` 오더 → `{worklist_cancelled:0}`, 그대로. 이어서 새 브리지 한 바퀴 → 취소된 줄의 `.wl` 삭제(2개 → 1개).
  - `order_item.status='cancelled'`로 흉내(진료 API 대신 SQL): **취소 칸이 없는 지금 develop 구조**에서 readings가 `order_status` 주고 `cancelled_at`·`cancel_reason`은 `null`(오류 없음). 격리 DB에만 칸을 임시로 추가해 이유·날짜가 나오는 것 확인 후 칸 삭제.
  - `PUT /reading`: 취소된 오더 409, 살아 있는 오더 200, 취소된 오더의 판독은 그대로.
  - P-22: 판독 시각을 현지 01:30(`2026-09-28T22:30Z`)으로 → 목록에 `2026-09-29`(옛 코드는 28일).
  - 화면: 의사 계정으로 진료 → 판독소견, **한국어·프랑스어** — 취소된 Hand·Chest PA 흐림·줄긋기·배지, Chest PA에 「Annulé · 날짜 — Motif : …」와 빨간 경고·판독 유지, Hand의 「영상 대기 중」 숨김.
- **확인 못 한 것**: 진료 세션의 실제 취소 API와 함께(아직 없음). 영상 창 머리 안내(진료 몫).
- **총괄 확인 요청**:
  - 날짜 규칙이 **브라우저 PC 시간대**를 따릅니다(LabResults와 같음). 격리 시험에서 마다가스카르 18:40 취소가 한국 시간 PC에서는 다음 날로 보였습니다 — 현장 PC(마다가스카르 시간)에서는 맞지만, 실장님 PC(한국 시간)로 볼 때는 자정 근처 날짜가 한국 날짜입니다. 모든 모듈 공통 규칙이라 알려 드림.
  - 진료 몫 전달 부탁: ① 취소 API가 `code_type='imaging'`이면 `require('./pacs.cancel').cancelWorklistForOrder(client, id)`를 같은 트랜잭션에서 — **PACS 저장소 합친 뒤에 켬** ② 영상 창에 `viewer.cancelled`면 `px_cancelledViewer` 한 줄 ③ 판독 저장이 409면 `px_readingOnCancelled` 안내 후 다시 불러오기 ④ 영상 창 판독 날짜(`result_at`)도 P-22와 같은 규칙.
  - 켤 때 PACS가 할 일: 위키 2.4·2.6(직원용) — 「취소된 영상 검사」 보이는 모습과 다른 환자 영상일 때 절차를 「취소로 표시 → 필요하면 다시 오더」로.
- **다른 세션에 부탁**: 진료 — 위 ①~④ (총괄 전달)

## 2026-09-29 — 의견: 영상 오더에도 「결과 있는 오더 취소」(결정 3-B)를 켤지 · DB 시간대 확인

- **상태**: 보류 — 의견만(코드 변경 없음). 켤지는 총괄·실장님 결정, 켜면 아래 PACS 몫을 만들겠음
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5f4fded`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **바탕** (임상병리 설계 `943909c`): 진료 화면에서 결과 있는 오더를 지우려 하면 409 → 「취소로 표시」 → `POST /api/consultations/order/:id/cancel` → `order_item.status='cancelled'`(+ `cancelled_at/by/reason`). 결과는 남기고 목록·청구에서 뺌.

### 추천: **켠다** — 영상도 같은 방식으로. 단, 아래 규칙으로

영상 오더가 「결과 있음」이 되는 경우는 지금 코드상 둘입니다(`consult.routes.js` DELETE의 409 조건): **영상이 도착함**(`worklist_log.status`가 `completed` — `/study-arrived`가 바꿈, 또는 `in_progress`) · **판독이 있음**(`order_item.result_text`). 이런 오더는 지금 지울 수 없어서, 잘못 낸 경우 계속 청구·목록에 남습니다. 검사와 같은 문제이고 같은 해법이 맞습니다.

| 질문 | 추천 | 이유 |
|---|---|---|
| **① `worklist_log`·`worklist_status`와 맞추기** | 취소 API가 같은 트랜잭션에서 `UPDATE worklist_log SET status='cancelled' WHERE order_item_id=$1 AND status IN ('scheduled','in_progress')` 와 `order_item.worklist_status='cancelled'`(워크리스트 항목을 취소한 경우만). **이미 `completed`(영상 도착)인 워크리스트 줄은 그대로 `completed`** | `worklist_log.status`는 「장비 워크리스트 항목의 상태」라는 사실 기록입니다. 이미 찍힌 검사를 「취소」로 고쳐 쓰면 「찍었다」는 사실이 사라짐. 오더가 취소됐다는 것은 `order_item.status`가 말함 |
| **② 이미 들어온 영상·판독이 어떻게 보일지** | 지우지 않음. 「🩻 판독소견」 목록에 **회색 + 「Annulé (취소됨)」 + 이유**, 영상 도착 표시·환자번호 경고는 그대로, 「Voir image」로 계속 볼 수 있음. 영상 창 머리에도 「취소된 오더의 영상」 한 줄. Orthanc 영상은 손대지 않음 | 기록(의무기록)이므로 남김 — 검사 결과를 회색으로 남기는 것과 같음. 영상을 지우는 것은 되돌릴 수 없고 EMR 밖(Orthanc) 일이라 이 기능에 넣지 않음 |
| **③ 판독 저장** | 취소된 오더에는 **판독 저장 거절(409)**, 화면은 「이 영상 검사는 진료실에서 취소되었습니다」 | 임상병리가 취소된 검사에 결과 저장을 거절하는 것과 같게. 설명은 취소 이유 칸에 |
| **④ 브리지가 장비 워크리스트에서 빼는지** | **코드 변경 없이 빠짐** — 피드가 `wl.status='scheduled'`만 주므로(`pacs.routes.js` worklist-feed) ①로 `cancelled`가 되면 다음 바퀴(15초 안)에 `.wl` 삭제 | 확인함(코드). 오더 삭제 때와 같은 길 |
| **⑤ 취소된 항목에 영상이 도착하면** | 두 경우. (가) 취소 **전에** 영상이 이미 Stable → 이미 `completed`라 ①에서 안 바뀜. (나) 취소 **뒤** 도착(방사선사가 장비에서 이미 골라 두고 찍음) → 브리지는 피드에 있는 줄만 묻으므로 **보고하지 않음**. 영상은 Orthanc에 그 UID로 들어가 있어서 판독 목록의 「Voir image」로는 **보임**(뷰어는 UID만 씀), 「도착」 표시만 없음. `/study-arrived`의 `cancelled`는 덮지 않는 조건은 그대로 둠(방어용) | (나)는 드물고 해가 없음 — 영상은 남고 취소된 오더에 붙어 보임. 보고까지 하게 하려면 피드 범위를 넓혀야 해서(P-6과 같은 일) 지금은 안 함 |
| **⑥ 청구** | 수납이 `o.status <> 'cancelled'`를 넣으면 영상 오더도 같이 빠짐 — PACS 쪽 할 일 없음 | 같은 `order_item` |
| **⑦ 아직 안 찍은 오더** | **지금처럼 삭제** (`scheduled`이고 판독 없음 → 409 아님) | 가장 흔한 「잘못 냄」. 취소 줄이 목록에 남지 않게 |

**⑦의 남는 위험** — 「찍었지만 EMR이 아직 모름」: 영상은 Orthanc에 들어왔는데 Stable 전(약 60~75초)이거나 브리지가 도착 확인을 못 하는 동안에는 워크리스트가 `scheduled`라 **오더를 지울 수 있고**, 그 영상은 어느 오더에도 안 붙습니다(Orthanc에는 남음 — P-4의 「연결 안 된 영상」과 같은 처지). 특히 **PACS 브리지를 합치기 전(과도기)에는 도착 확인이 아예 없어** 영상이 있어도 늘 지워집니다. 그래서 **영상 오더에 이 기능을 켜는 것은 PACS 저장소를 합친 뒤(재부팅 절차서 ②)** 로 하기를 권합니다. 더 막고 싶으면 「워크리스트로 보낸 영상 오더는 삭제 대신 늘 취소」로 할 수 있지만, 잘못 낸 오더마다 회색 줄이 남아 목록이 지저분해져서 추천하지 않음.

**⑧ 환자번호가 틀린 영상(`patient_check` mismatch)을 바로잡는 절차와의 관계**

- **이 환자의 영상이 맞음**(번호만 오기) → 취소할 일 없음. 판독 쓰고 한 줄 남김(위키 2.6 ④).
- **다른 환자의 영상임** → 이 기능이 **첫 단계**가 됩니다: ① 이 환자(A)의 영상 오더를 **취소**(이유: 「영상이 다른 환자 26-xxxxx의 것」) → A의 청구에서 빠지고, 잘못 붙은 영상은 회색 줄에 경고와 함께 기록으로 남음 ② A에게 필요하면 **새 영상 오더** → 다시 촬영(의사 판단) ③ 그 영상을 실제 주인(B)의 오더에 옮겨 붙이는 것은 **이 기능 밖** — EMR에 영상 옮기기 기능이 없고, Orthanc에서 환자 정보를 고치면(`/modify`) 기본으로 UID가 새로 만들어져 링크가 끊김. P-4 2단계(「연결 안 된 영상」을 오더에 붙이기)와 함께 설계할 일.
- 위키 2.6 ⑤(「관리자에게 알림, 다시 촬영은 의사 판단」)는 이 기능이 들어가면 「오더를 취소로 표시(이유에 적기) → 필요하면 다시 오더」로 바꿀 수 있음.
- 주의: 취소된 A의 기록에 B의 영상이 계속 보입니다(회색·경고). 개인정보 면에서 거슬리면 「취소된 오더의 영상은 버튼을 숨김」도 가능 — 추천은 **보이게 둠**(무엇이 잘못 붙었는지가 기록의 요점이라서).

**작업 크기**

| 세션 | 할 일 | 크기 |
|---|---|---|
| **진료** | 취소 API가 `code_type='imaging'`이면 ①의 UPDATE 두 줄을 같은 트랜잭션에서(또는 PACS가 내보내는 함수 `cancelWorklistForOrder(client, orderItemId)`를 부름 — 원하면 PACS가 만듦). 영상 창 머리에 취소 표시(`viewer-url`이 줄 `order_status` 사용). 판독 저장 409 처리(안내 후 다시 불러오기) | 작음 |
| **PACS** | `readings/patient`·`viewer-url`에 `order_status`·`cancelled_at`·`cancel_reason` 추가, `PUT /reading` 취소된 오더 409, `RadiologyReadings` 회색·「Annulé」·이유(번역 키 1~2개, `cs_wsCancelled`/`cs_labCancelled` 재사용 가능), (선택) `cancelWorklistForOrder` 함수, 위키 2.4·2.6·3절. **브리지·마이그레이션 변경 없음** | 작음 (반나절, 격리 스택 + 가짜 Orthanc로 확인 가능 — PACS 격리 스택 불필요) |
| 순서 | 진료 마이그레이션·취소 API 뒤, **PACS 저장소 합친 뒤** 영상에 켬 | |

### DB 연결 시간대 (총괄 `23bde17`) — 코드로 확인

- 워크리스트 날짜: 오더 저장 때 `worklist_log.scheduled_date = CURRENT_DATE`(`consult.routes.js`), 피드 기본값 `todayLocal()`(Node, `TZ`), `/api/worklist`·`dicom-mwl`의 `CURRENT_DATE` — **이제 모두 현지(Indian/Antananarivo)** 로 같은 날을 가리킴 ✓.
- `scheduled_time = CURRENT_TIME`: 이제 현지 시각 ✓. **바뀐 점**: 전에는 연결이 UTC라 `.wl`의 예정 시각이 3시간 이르게 들어갔을 것(장비는 보통 날짜로 거르므로 영향 작음). 전에 만든 줄은 UTC 시각 그대로.
- AccessionNumber·UID의 날짜는 JS `todayLocal()` ✓. `dicomDate('YYYY-MM-DD')`(DATE는 이제 문자열)는 UTC 자정으로 읽고 현지(+3)로 적으므로 같은 날 ✓ — 시간대가 UTC보다 늦은 곳(음수)이면 하루 당겨지는 구조이므로 다른 병원에 쓸 때 주의.
- **새로 찾은 작은 문제 (P-22 [낮음])**: 판독 날짜 표시 — `result_at`(TIMESTAMPTZ)은 JSON에서 UTC 시각(`…Z`)으로 나가는데 `RadiologyReadings.jsx`의 `ymd()`와 진료 영상 창이 `T` 앞을 잘라 씀 → **현지 자정~03:00에 쓴 판독은 전날 날짜로 보임**. DB 연결 시간대와 무관(JSON 직렬화 문제). 고치는 법: 화면에서 `new Date(v).toLocaleDateString('en-CA')`. PACS 쪽 한 줄 + 진료 영상 창 한 줄 — 원하시면 바로 고치겠음.
- **바꾼 파일**: `wiki/handoff/pacs.md`만 · **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 코드 읽기 — `laboratory.md` 설계(`943909c`), `consult.routes.js` DELETE 409 조건·오더 저장 INSERT, `pacs.routes.js` 피드 WHERE·`/study-arrived`의 `cancelled` 조건·`viewer-url`, `database.js` `options: -c TimeZone`, `RadiologyReadings.jsx` `ymd()`.
- **다른 세션에 부탁**: (켜기로 하면) 진료 — 위 표의 진료 몫.

## 2026-09-29 — 서버 권한 S2를 PACS 라우트에 적용 (P-21)

> **총괄 확인 (2026-09-29)**: S2 `17e3404` 합침(`b9d35a4`) + 실행 중 EMR 반영. 합친 뒤 실행 중 브리지 heartbeat·피드 200 계속. 역할별 확인 결과 표와 일치.

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `48059dd`을 ff로 당긴 뒤, S1 들어간 판 기준). **PACS 저장소** — 없음
- **한 일** (실장님 결정 S2, 설정 세션 「S2 초안」 표대로):
  - `GET /api/pacs/test` → `settings`
  - `GET /api/pacs/viewer-url` → `consultation` — 수납 화면의 판독 목록(`Payment.jsx`)은 `onOpen` 없이 띄워 영상 버튼이 없음을 확인하여 `payment`는 넣지 않음
  - `GET /api/pacs/readings/patient/:id` → `consultation`·`payment`
  - `PUT /api/pacs/reading/:id` → 이미 `consultation` (그대로)
  - `GET /api/worklist` → `consultation`
  - `PUT /api/worklist/:id/status` → 브리지 토큰 그대로, **로그인 경로는 `settings`만**
  - **표 밖 하나 더**: `GET /api/worklist/dicom-mwl`도 같은 모양(브리지 토큰 또는 로그인)이고 부르는 화면이 없는데 환자 이름·생년월일을 내주므로, 로그인 경로를 `settings`로 같이 좁힘. 원치 않으시면 한 줄로 되돌릴 수 있음.
  - `bridgeOrAuth`를 권한을 받는 함수로 바꿈(`bridgeOrAuth('settings')`). 토큰이 맞으면 그대로 통과, 아니면 `authMiddleware`(S1의 async 판) 뒤 `permMiddleware`.
  - 브리지 토큰 경로(`worklist-feed`·`bridge-heartbeat`·`study-arrived`)는 손대지 않음.
- **바꾼 파일**: `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, `wiki/modules/pacs.md`(4절 표 권한 칸 + 권한 설명, 7절 P-21 새로 추가, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**:
  - `node --check` 두 파일
  - 격리 스택 9188, 계정 4개로 API 표: 관리자 / 의사(`consultation`) / 수납(`payment`) / 간호사(새 기본값 `pharmacy`·`lab`·`registration`)

    | API | 관리자 | 의사 | 수납 | 간호사 |
    |---|---|---|---|---|
    | GET /pacs/test | 200 | 403 | 403 | 403 |
    | GET /pacs/viewer-url | 200 | 200 | 403 | 403 |
    | GET /pacs/readings/patient/:id | 200 | 200 | 200 | 403 |
    | PUT /pacs/reading/:id | 200 | 200 | 403 | 403 |
    | GET /pacs/config | 200 | 403 | 403 | 403 |
    | GET /worklist | 200 | 200 | 403 | 403 |
    | PUT /worklist/:id/status (로그인) | 200 | 403 | 403 | 403 |
    | GET /worklist/dicom-mwl (로그인) | 200 | 403 | 403 | 403 |

    브리지 토큰으로는 피드·heartbeat·상태 변경·dicom-mwl 모두 200. 로그인 없이는 401.
  - 화면(프랑스어): **의사** — 진료 → Compte-rendu 목록 → Voir image → 영상 창이 열리고 빨간 환자번호 경고. **수납** — 수납 대기 환자 → Compte-rendu 목록(읽기만, 경고 보임). **간호사** — 메뉴가 Enregistrement·Pharmacie·Laboratoire만, 접수에서 환자 이력·약국·검사실을 열어 봄. 세 계정 모두 **네트워크에 403 없음**, 간호사 화면은 PACS API를 부르지 않음.
- **확인 못 한 것**: 실행 중 EMR에서의 확인(총괄 몫). 영상 창 안의 실제 영상(9090이 P-1로 막혀 있어 까만 화면 — 권한과 무관).
- **총괄 확인 요청**: 합친 뒤 실행 중 브리지 heartbeat가 계속 200인지(브리지 토큰 경로는 안 바꿨지만 같은 파일이라).
- **다른 세션에 부탁**: 없음

## 2026-09-29 — 낮은 항목 정리 (P-20·P-11·P-12·P-17·설정 부분 저장), 절차서에 확인 목록

> **총괄 확인 (2026-09-29)**: `890c64a` 합침 + 실행 중 EMR 반영. 코드 검토: 설정 부분 저장이 토큰을 지우지 않음(`COALESCE`), 워크리스트 상태 쓰기에 값 검사·트랜잭션, `arrivals_error` 300자. PACS 저장소 `6c135aa`는 재부팅 당일 절차서 ②에서 합침. P-13은 보류(오프라인 묶음 스크립트와 같이 고쳐야 함 — 총괄 할 일로 적어 둠).

- **상태**: 확인 요청
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `881328e`을 ff로 당긴 뒤)
  - **PACS 저장소** `session/pacs` `6c135aa` — 이제 합칠 것은 `6c135aa` ← `e109157` ← `43bd994` (절차서 ②가 가리키는 맨 위 커밋)
- **한 일**:
  - **P-20** (설정 세션 `9d7e380`과 짝): 브리지가 Orthanc에 못 물을 때 이유를 heartbeat `arrivals_error`로 보냄, `/bridge-heartbeat`가 detail에 저장(300자). 보내는 글자와 로그는 `scrub()`으로 주소 속 `user:pass@`·토큰·Orthanc 비밀번호를 `***`로.
  - **P-11**: `PUT /api/worklist/:id/status` — 허용 값만(400), 없는 항목 404, 한 트랜잭션, `scheduled`→order_item `sent`, completed_at은 completed일 때만. 권한(로그인만)은 그대로.
  - **`PUT /api/pacs/config`**: 보내지 않은 칸은 그대로(`COALESCE`). 전에는 NULL로 덮어써서 일부만 보내면 브리지 토큰이 지워질 수 있었음. 포트 기본값 10004(옛 데모)→4242.
  - **P-12** (PACS): `make_demo.py`·`make_chest5.py`의 옛 Orthanc 비밀번호와 실존 인물 같은 이름·생년월일 제거 → 환경 변수 + 가짜 환자. 옛 값은 git 기록에 남음.
  - **P-17**: 설정 화면 예시 `NAS_IP:8090`→`9090`, `pacsServerHint` 3개 언어의 `8090`→`9090`.
  - PACS `README.md`: 영상은 StudyInstanceUID로만 붙는다고 바로잡음(전에는 「Accession / Study UID」), 도착 확인 단계, 시험 도구 실행법.
  - **P-13은 하지 않고 제안으로 남김**: compose를 `${ORTHANC_PASSWORD:?…}`로 바꾸면 `.env` 없이 시작을 거부해 안전하지만, EMR `offline/pack.ps1`·`pack.sh`(총괄 파일)가 `.env` 없는 PACS 폴더에서 `docker compose build`·`config --images`를 돌려 **오프라인 키트 만들기가 깨짐**을 확인(`docker compose config`로 시험). 되돌림.
  - 절차서 ⑤ 뒤에 **「⑤+ 확인 목록」** — 재부팅 당일 R-1~R-5(뷰어 로그인 P-9, P-18, 서버 상태 창, 연결 시험 버튼, Orthanc 응답), 장비 설치 날 D-1~D-6(장비 설정값, P-8, P-4, 메뉴 이름, 추가 촬영, 경고 표시). ⑤-3 heartbeat 확인에 `arrivals_error` 추가, ②의 기대 커밋을 `6c135aa`로.
- **바꾼 파일**: EMR `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md` · PACS `bridge/bridge.py`, `bridge/make_demo.py`, `bridge/make_chest5.py`, `README.md`
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — **오더 연동 탭 안**만: 뷰어 주소 칸 예시 글자, `pacsServerHint`의 한국어 기본 문구(번역이 없을 때 쓰는 것) 안의 `8090`→`9090`.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — **기존 키 `pacsServerHint` 한 줄씩**, 숫자 `8090`→`9090`만 (규칙 6: 기존 키 문구 변경).
- **DB 마이그레이션**: 없음 · **번역 키**: 새 키 없음(기존 키 1개 문구만)
- **확인한 방법**:
  - `node --check` 두 라우트, `py_compile` 브리지·시험 스크립트, 프론트 `npm install --no-package-lock` + `npm run build` 통과
  - 격리 스택 9188: `PUT /config`에 뷰어 주소만 보냄 → 토큰 48자·포트·AE·자동생성 그대로. 작업목록 상태 — `bogus` 400, 없는 항목 404, in_progress/completed/scheduled 각각 두 테이블이 맞게(scheduled→sent, completed_at). 처음 짠 SQL이 `inconsistent types deduced for parameter $1`로 500 → 매개변수를 나눠 고친 뒤 통과.
  - 새 브리지를 격리 네트워크에서 실행: Orthanc 비밀번호 없음·Orthanc 없음 → `/api/system/status`의 bridge가 `warn`/`status.bridge.arrivals`, 가짜 Orthanc 정상 → `ok`로 돌아옴. 주소에 비밀번호를 넣은 경우 저장된 detail과 로그에 비밀번호가 안 나옴(가려서 셈).
  - 설정 화면 프랑스어: 예시 `http://NAS_IP:9090`, 안내 「URL web (9090)」.
- **확인 못 한 것**: 진짜 Orthanc(절차서 ⑤-5에서), 시험 스크립트 `make_*`를 진짜 Orthanc에 실제로 돌려 보지는 않음(문법만).
- **총괄 확인 요청**:
  - PACS 쪽 합칠 대상이 `6c135aa`로 늘었습니다 — 절차서 ②에 반영.
  - P-13을 하려면 `offline/pack.ps1`·`pack.sh`에서 PACS `docker compose` 호출 앞에 임시 `ORTHANC_PASSWORD`를 넘기는 변경이 같이 필요합니다. 원하시면 PACS compose 쪽을 바로 만들겠습니다.
- **다른 세션에 부탁**: 없음 (설정 세션의 P-20 받는 쪽과 필드 이름·길이 맞음 — `arrivals_error`, 300자)
- **결정이 필요해 남긴 것**: P-4(격리 스택 허락), P-6(워크리스트를 「오늘」 말고 며칠까지 보일지 — 촬영 절차), P-9(뷰어 계정 분리 — R-1 결과 뒤), P-10(장비 등록 — D-1 뒤), P-13(위), P-14(자체 UID 루트, 선택), P-15(판독 이력·확정 — 화면·DB 구조), P-18(진료 화면 문구와 같이), 2.6의 「다른 환자 영상」 처리 절차(의학적 판단).

## 2026-09-29 — P-1 조치 절차서 (재부팅 당일 총괄용) · `PatientCheck` export

> **총괄 확인 (2026-09-29)**: `2c15a6b` 합침 + 실행 중 EMR 반영. `PatientCheck` export 확인. P-1 절차서는 재부팅 당일 총괄이 이 순서대로 진행.

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `9c7aca9`을 ff로 당긴 뒤). **PACS 저장소** — 없음 (절차서가 합칠 대상은 `43bd994`·`e109157`)
- **한 일**:
  - 아래 **P-1 조치 절차서**. 코드 변경 없음. 절차서 안의 스크립트 두 개는 저장소에 넣지 않고 여기에만 둠.
  - 진료 세션 부탁: `RadiologyReadings.jsx`에서 **`PatientCheck`와 `imagesOfRow`를 export**. 모양은 **`viewer-url`의 `images`** (`{patient_check, patient_id, patient_name}`, 도착 전 `null`)로 맞춤 — 진료 뷰어 창의 `ImagePatientCheck`가 이미 이 모양이라 `<PatientCheck images={viewer.images} t={t} style={{margin:'8px 14px 0'}} />`로 그대로 바꿔 쓸 수 있음. 판독 목록은 `imagesOfRow(row)`로 바꿔 넘김. 목록의 모양·문구는 그대로.
- **바꾼 파일**: `frontend/src/components/RadiologyReadings.jsx`, `wiki/modules/pacs.md`(2.1 상태 글자 Envoyé/Réalisé, 2.6에 뷰어 창 경고, 4절 export 설명, 7절 P-3·P-19, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**:
  - 프론트 빌드 통과. 격리 스택 9188에서 한국어 판독 목록을 다시 열어 봄 — 도착 표시·빨강/노랑 경고가 전과 같음.
  - 절차서의 토큰 스크립트(`rotate-token.ps1`)를 **가짜 `.env` + 격리 DB(`bethesda-s-pacs-db`)** 로 돌려 봄: 새 토큰 48자가 양쪽에 같게 들어감(md5로 비교, 값은 안 찍힘), 다른 줄(ORTHANC_PASSWORD·주석·빈 줄) 그대로, 백업에 옛 값. `BRIDGE_TOKEN=` 줄이 두 개면 아무것도 안 바꾸고 멈춤, DB 컨테이너가 없으면 `.env`를 안 바꾸고 멈춤.
  - Orthanc 확인 스크립트(`check_orthanc.py`)는 **문법 검사만** — 진짜 Orthanc로는 못 돌려 봄(격리 스택 없음). 그래서 절차서 ⑤-5가 곧 그 확인임.
- **확인 못 한 것**: 절차서 전체를 실제로 따라 해 보지는 못함(실행 중 시스템이라). ④의 빌드가 인터넷 없이 되는지(pip 층 캐시가 남아 있는지).
- **총괄 확인 요청**: 아래 절차서. 끝나면 PACS 세션에 알려 주세요 — 위키 2.4의 임시 안내 한 줄을 지우고 ⑤-5 결과를 7절에 적겠습니다.
- **다른 세션에 부탁**: **진료 세션** — `Consultation.jsx`의 `ImagePatientCheck`를 `import { PatientCheck } from '../components/RadiologyReadings.jsx'`로 바꿔 주세요(모양 그대로, 여백만 `style`로). **수납 세션** — `PatientChart.jsx:70`의 `worklist_status`가 아직 영어 그대로(`sent`/`completed`) — 진료 세션의 `cs_ws*` 번역과 맞추면 좋겠습니다(P-19 남은 부분).

### P-1 조치 절차서

> ✅ **2026-09-29 재부팅 뒤 총괄이 이 순서대로 마침** — 결과는 맨 위 「총괄 확인: P-1 조치 끝」. 확인 목록 결과: R-1 일부(9090·Stone 뷰어 401 → 로그인 창, 영상 창 안은 안 봄), R-2 고침(P-18), R-3 안 봄, R-4 ok, R-5 일곱 줄 모두 기대와 같음. D-1~D-7은 장비 설치 날.

> 실행 중인 시스템에 하는 일이므로 **총괄만** 합니다. 명령은 모두 **Windows PowerShell**(관리자 아님)에서. 비밀값(토큰·Orthanc 비밀번호)은 **어떤 단계에서도 화면에 찍지 않습니다** — 아래 명령은 전부 개수·길이·md5만 봅니다.
> 기준: PACS `main` = `c9dc0b4`, 합칠 것 = `session/pacs`의 **그날 맨 위 커밋**(2026-09-29 기준 `6c135aa` ← `e109157` ← `43bd994`, ff 가능 확인함 — 그 뒤 PACS 세션이 더 커밋하면 인계 노트 맨 위 항목에 적음). EMR은 이미 develop에 있음(`/study-arrived`, 토큰 규칙).

#### ⓪ 재부팅 전에 (지금 해 두어도 됨)

1. 되돌리기용으로 지금 브리지 이미지에 이름표를 하나 더 붙입니다.
   ```
   docker tag bethesda-pacs-worklist-bridge:latest bethesda-pacs-worklist-bridge:before-p1
   ```
2. 아래 두 스크립트를 저장소 **밖** 폴더에 저장합니다: `C:\Bethesda-p1\rotate-token.ps1`, `C:\Bethesda-p1\check_orthanc.py` (내용은 이 절 맨 아래). 저장소 안에 두면 git에 들어갈 수 있습니다.
3. 실장님이 관리자 PowerShell에서 동적 포트 범위를 되돌리고 재부팅:
   ```
   netsh int ipv4 set dynamicport tcp start=49152 num=16384
   netsh int ipv6 set dynamicport tcp start=49152 num=16384
   ```

#### ① 재부팅 뒤 확인 (Docker Desktop이 「Engine running」이 된 뒤)

| 명령 | 기대 결과 | 아니면 |
|---|---|---|
| `netsh int ipv4 show dynamicport tcp` | 시작 포트 **49152**, 포트 수 **16384** | 실장님 명령이 안 먹힘 → ⓪-3 다시, 재부팅. **여기서 멈춤** |
| `netsh int ipv6 show dynamicport tcp` | 같음 | 같음 |
| `netsh interface ipv4 show excludedportrange protocol=tcp` | **4242·9080·9090이 어느 구간에도 안 들어감** (예전 `4204–4303` 같은 구간이 없어야 함) | ⑥-A |
| `docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"` | `bethesda-pacs` 줄에 `0.0.0.0:9090->8042/tcp`, `0.0.0.0:4242->4242/tcp` · `bethesda-emr-web` 줄에 `9080->80` | Ports가 비어 있으면 ④에서 `orthanc`도 다시 만듦 |
| `foreach ($p in 9080,9090,4242) { "$p " + (Test-NetConnection 127.0.0.1 -Port $p -WarningAction SilentlyContinue).TcpTestSucceeded }` | 세 줄 모두 `True` | 9090·4242만 False면 ④에서 `orthanc` 다시 만든 뒤 재확인. 그래도 False면 ⑥-A |

#### ② PACS 저장소 합치기

```
git -C C:\Bethesda-PACS-main status --short
git -C C:\Bethesda-PACS-main log --oneline -1
git -C C:\Bethesda-PACS-main merge --ff-only session/pacs
git -C C:\Bethesda-PACS-main log --oneline -3
```
- 기대: `status`가 **비어 있음**(`storage/`·`worklists/`·`.env`는 무시 파일이라 안 나옴), 합치기 전 `c9dc0b4`, 합친 뒤 맨 위가 `session/pacs`의 맨 위 커밋(2026-09-29 기준 `6c135aa` → `e109157` → `43bd994` → `c9dc0b4`).
- PACS 저장소에는 develop이 없고 `main`이 실행 중인 판입니다. `push`와 `CHANGELOG.md`는 총괄 판단(세션은 안 건드림).

#### ③ 새 토큰 만들어 양쪽에 넣기

```
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Bethesda-p1\rotate-token.ps1
```
- 기대: 한 줄 **`OK - EMR and PACS .env now hold the same new token (48 chars). Value not shown.`**
- 하는 일: `.env`를 `%USERPROFILE%\pacs-env-before-p1`로 백업 → 48자 무작위 토큰 → **EMR DB에 먼저**(`docker exec -i bethesda-emr-db psql`에 **stdin**으로 넘김 — 명령줄·히스토리·psql 출력에 안 남음) → 그다음 `.env`의 `BRIDGE_TOKEN=` 한 줄만 바꿈 → 양쪽 md5 비교.
- **설정 화면(Flux d'ordres)으로 넣지 않습니다** — 값을 복사·붙여넣기 하게 되어 클립보드·화면에 남습니다.
- 이 순간부터 ④까지 몇 초 동안 옛 브리지는 401을 받습니다(정상).
- 옛 토큰은 이제 무효입니다. 옛 토큰이 찍힌 EMR 백엔드 로그(`docker logs bethesda-emr-api`)는 EMR api 컨테이너를 다시 만들 때 함께 없어집니다 — 그대로 둬도 무효인 값이라 급하지 않음(총괄 판단).

#### ④ 컨테이너 다시 만들기

```
cd C:\Bethesda-PACS-main
docker compose up -d --build
```
- `--build`가 꼭 필요합니다(이미지가 이미 있으면 compose는 새로 짓지 않음). 바뀌는 것은 브리지뿐 — 새 `bridge.py` + 새 환경 변수(`ORTHANC_*`, 새 `BRIDGE_TOKEN`). `orthanc` 서비스 설정은 이번 합치기로 안 바뀌었으므로 보통 그대로 둡니다.
- ①에서 PACS 포트가 비어 있었거나 연결이 안 됐으면 추가로:
  ```
  docker compose up -d --force-recreate orthanc
  ```
  영상은 `.\storage` 폴더(바인드 마운트)에 있어서 다시 만들어도 지워지지 않습니다. **`down -v`나 `storage` 폴더 삭제는 절대 하지 않습니다.**
- 빌드가 pip 설치에서 실패하면(인터넷 없음 + 캐시 없음) ⑥-C.

#### ⑤ 확인 (④ 뒤 1~2분 기다린 다음)

1. `docker ps --format "{{.Names}}\t{{.Status}}"` → `bethesda-pacs`, `bethesda-worklist-bridge` 모두 **(healthy)**.
2. 브리지 로그 — `docker logs --since 3m bethesda-worklist-bridge`
   - 있어야 함: `synced N worklist entr…` 가 15초마다.
   - **없어야 함**: `could not ask Orthanc` · `EMR refused the bridge token` · `BRIDGE_TOKEN is missing` · `ORTHANC_PASSWORD not set` · `no /study-arrived`. 하나라도 있으면 ⑥-B(토큰) 또는 PACS 세션에 로그 줄을 전달.
3. heartbeat
   ```
   docker exec bethesda-emr-db psql -U medconnect -d medconnect -tAc "SELECT round(extract(epoch FROM now()-last_seen)), ok, detail->>'error', detail->>'arrivals_error' FROM service_heartbeat WHERE name='worklist_bridge'"
   ```
   → 첫 값 **20 미만**, `t`, 오류 칸 두 개 모두 비어 있음. EMR 상태 화면의 장비 워크리스트 줄도 초록(`arrivals_error`가 있으면 노랑 — 브리지가 Orthanc에 못 묻는 것, ⑤-2와 같이 봄).
4. EMR 로그에 토큰이 더는 안 찍힘 — **개수만** 봅니다(줄을 출력하면 토큰이 화면에 나옴):
   ```
   (docker logs --since 3m bethesda-emr-api 2>&1 | Select-String -SimpleMatch 'token=' | Measure-Object).Count
   (docker logs --since 3m bethesda-emr-api 2>&1 | Select-String -SimpleMatch 'worklist-feed?format=json' | Measure-Object).Count
   ```
   → 첫째 **0**, 둘째 **10 안팎**(15초마다 1줄).
5. **진짜 Orthanc 응답 형식** — 브리지가 기대는 값이 실제로 있는지:
   ```
   Get-Content C:\Bethesda-p1\check_orthanc.py | docker exec -i bethesda-worklist-bridge python -
   ```
   약 80초 걸립니다. 가짜 환자 `TEST^PACSCHECK`(`PX-TEST-0000`)의 8×8 시험 영상 1장을 Orthanc에 올렸다가 **마지막에 지웁니다.** 어느 워크리스트 UID와도 안 맞으므로 브리지·EMR은 건드리지 않습니다. 비밀번호는 컨테이너 환경 변수에서 읽어 화면에 안 나옵니다. 기대:
   ```
   1 upload: 200
   2 has IsStable: True | IsStable now: False
   3 PatientMainDicomTags.PatientID: PX-TEST-0000 (expect PX-TEST-0000)
   4 waiting 75 s ...
   5 IsStable after 75 s: True (expect True)
   6 CountInstances: 1 (expect 1)
   7 delete test study: 200 (expect 200)
   ```
   2·3·5·6 중 하나라도 다르면 결과를 PACS 세션에 그대로 전달 — 그 경우 브리지는 아무 검사도 완료 처리하지 못할 뿐 워크리스트는 정상입니다. 7이 200이 아니면 Orthanc 화면(9090)에서 `PX-TEST-0000`을 찾아 지웁니다.
6. 브라우저로 `http://localhost:9090`이 열리는지(Orthanc 로그인 창), EMR **Paramètres → Flux d'ordres (설정 → 오더 연동)** 의 **Tester PACS (DICOM)** 이 초록인지.
7. 백업 지우기: `Remove-Item $env:USERPROFILE\pacs-env-before-p1` (옛 토큰·Orthanc 비밀번호가 들어 있음).
8. PACS 세션에 알림 → 위키 2.4 임시 안내 삭제, ⑤-5·R-1~R-5 결과 기록.
9. **이제 켜도 되는 것** (PACS 저장소가 합쳐져 EMR이 영상 도착을 알게 됐으므로): 영상 오더 취소(결정 38-③) — 진료 세션이 서버의 영상 취소 거절을 풀고 `cancelWorklistForOrder` 호출·영상 창 안내 3가지를 켬, PACS 세션은 위키 2.4·2.6을 고침. ⑤-2·⑤-5가 정상일 때만.
10. 결정 35 참고: 이 PC의 토큰 재발급(③)은 **시험용**입니다 — 현지 PC에서는 설치 때 새로 만들어지고, EMR 백업을 복원한 **뒤에** 다시 짝 맞춤(`modules/pacs.md` 6.1).

#### ⑤+ 「확인 필요」로 남은 것 — 확인 목록

**재부팅 당일 (총괄, 장비 없이 할 수 있음)** — 결과를 PACS 세션에 알려 주면 위키에 적습니다.

| # | 무엇 | 어떻게 | 적을 것 |
|---|---|---|---|
| R-1 | **P-9 뷰어가 로그인을 묻는지** | EMR 설정 **Flux d'ordres → PACS 웹/뷰어 주소**가 `http://localhost:9090`(또는 서버 IP)인지 본 뒤, 진료 화면에서 아무 영상 오더의 **🖼** → 영상 창 왼쪽에 ① 브라우저 로그인 창이 뜨는지 ② 빈/오류 화면인지 ③ Stone 뷰어가 바로 뜨는지. 로그인 창이 뜨면 **값은 넣지 말고** 뜬다는 것만 기록. 같은 브라우저로 `http://localhost:9090` 을 따로 열었을 때도 같은지 | ①②③ 중 무엇, 브라우저 종류 |
| R-2 | ~~P-18 UID 없는 영상 오더~~ | **2026-09-29에 고침 — 확인 불필요** (진료 영상 창이 `no_study` 안내를 보이는지만 한 번 보면 됨) | — |
| R-3 | 서버 상태 창의 PACS 줄 | `server-status.bat` 창(설정 세션이 호스트 쪽 9090·4242 검사를 넣음)에서 **Imagerie (PACS)**·**Liste de travail des appareils** 가 초록인지 | 초록/빨강 + 문구 |
| R-4 | 연결 시험 버튼 | EMR **Paramètres → Flux d'ordres → Tester PACS (DICOM)** — Host가 `host.docker.internal` 또는 서버 LAN IP일 때 초록인지(`localhost`면 빨강이 정상) | Host 값, 결과 |
| R-5 | 진짜 Orthanc 응답 형식 | ⑤-5 결과 그대로 | 7줄 출력 |

**장비 설치 날 (실장님, 현장 장비로만 확인 가능)**

| # | 무엇 | 어떻게 | 적을 것 |
|---|---|---|---|
| D-1 | 장비 설정값 | Called AE `MEDCONNECT`, 호스트 = 서버 LAN IP, 포트 `4242`, 워크리스트도 같은 주소 | 장비 이름·모델, 장비 자기 AE Title, 장비 IP (P-10 등록용) |
| D-2 | **P-8** 워크리스트가 보이는지 | 테스트 환자에게 영상 오더 → 장비에서 워크리스트 조회. **비어 있으면** 장비의 「내 AE만 / Station AE 필터」 옵션을 끄고 다시 조회 | 보임/안 보임, 필터 옵션 이름 |
| D-3 | **P-4** 장비가 UID를 그대로 쓰는지 | 워크리스트에서 그 환자를 골라 1장 찍어 전송 → 2분 뒤 EMR **🩻 Compte-rendu** 에 **N image(s) reçue(s)** 가 뜨는지. 안 뜨는데 `http://<서버>:9090`(Orthanc 화면)에는 영상이 있으면 장비가 UID를 새로 만든 것 | 뜸/안 뜸, Orthanc의 AccessionNumber 가 오더 번호(`YYMMDD-n`)와 같은지 |
| D-4 | 장비 메뉴 이름 | 워크리스트 불러오기·전송 버튼의 실제 이름(프랑스어/영어) | 위키 2.2에 넣을 이름 |
| D-5 | 추가 촬영 | 전송 뒤 워크리스트에서 빠진 다음, 같은 검사에 한 장 더 찍어 보낼 수 있는지 | 됨/안 됨, 방법 |
| D-6 | 경고 표시 | 장비에서 환자번호를 일부러 바꿔 찍은 시험 영상 → 판독 목록에 빨간 경고가 뜨는지 (시험 뒤 Orthanc 화면에서 그 영상 삭제) | 뜸/안 뜸 |
| D-7 | 지운·취소한 오더가 장비에서 언제 사라지나 | 시험 오더를 내고 장비에서 워크리스트를 한 번 불러온 뒤, 진료실에서 그 오더를 지움 → 장비 화면에 그 환자가 **남아 있는지**, 다시 불러오기를 눌러야 사라지는지, 저절로 사라지는지 | 남음/다시 불러오면 사라짐/저절로 사라짐 (38-③ 의견과 관련) |

#### ⑥ 잘못됐을 때 되돌리기

- **⑥-A 포트가 여전히 막힘** — 동적 범위가 49152로 돌아왔는데도 `excludedportrange`에 4242·9080·9090이 걸리면, 실장님이 관리자 PowerShell에서:
  ```
  net stop winnat
  netsh int ipv4 add excludedportrange protocol=tcp startport=4242 numberofports=1
  netsh int ipv4 add excludedportrange protocol=tcp startport=9090 numberofports=1
  netsh int ipv4 add excludedportrange protocol=tcp startport=9080 numberofports=1
  net start winnat
  ```
  **Docker Desktop을 먼저 끄고** 합니다 — 쓰고 있는 포트는 제외 등록이 거절될 수 있습니다(확인 필요). 「관리 포트 제외」로 등록되면 Hyper-V가 그 포트를 가져가지 못합니다. 그다음 총괄이 `docker compose up -d --force-recreate orthanc` 와 EMR 쪽 재시작, ① 표 다시.
- **⑥-B 토큰이 안 맞음** (③이 `FAIL`, 또는 브리지 로그에 `EMR refused the bridge token`) — ③을 **한 번 더** 돌리고(새 토큰을 양쪽에 다시 넣음) `docker compose up -d --force-recreate worklist-bridge`. 브리지는 `.env`를 컨테이너를 만들 때만 읽으므로 다시 만들어야 합니다. `.env` 자체가 망가졌으면 `Copy-Item $env:USERPROFILE\pacs-env-before-p1 C:\Bethesda-PACS-main\.env -Force`로 되돌린 뒤 ③부터.
- **⑥-C 새 브리지가 이상하거나 빌드가 안 됨** — 옛 브리지로:
  ```
  git -C C:\Bethesda-PACS-main reset --hard c9dc0b4
  docker tag bethesda-pacs-worklist-bridge:before-p1 bethesda-pacs-worklist-bridge:latest
  cd C:\Bethesda-PACS-main
  docker compose up -d --no-build --force-recreate worklist-bridge
  ```
  `reset --hard`는 ②에서 `status`가 비어 있었으므로 잃는 것이 없고, 무시 파일(`storage/`·`worklists/`·`.env`)은 건드리지 않습니다. 옛 브리지는 새 토큰으로도 동작합니다(토큰을 URL로 보내고 EMR이 그것도 받음). 대신 EMR 로그에 토큰이 다시 찍히고, 영상 도착 확인은 꺼집니다 — PACS 세션에 알려 주세요.
- **⑥-D Orthanc가 안 뜸** — `docker logs --tail 50 bethesda-pacs`. 이번 합치기는 `orthanc` 설정을 바꾸지 않았으므로 원인은 거의 포트(⑥-A)입니다. 영상은 `storage` 폴더에 그대로 있습니다.

#### 스크립트 1 — `C:\Bethesda-p1\rotate-token.ps1`

```powershell
param(
  [string]$EnvFile = 'C:\Bethesda-PACS-main\.env',
  [string]$DbContainer = 'bethesda-emr-db',
  [string]$Backup = (Join-Path $env:USERPROFILE 'pacs-env-before-p1')
)
# Make a new bridge token and put the same value in the PACS .env and EMR pacs_config.
# The value never appears on screen, on a command line or in a log (EMR gets it on stdin).
$ErrorActionPreference = 'Stop'
Copy-Item $EnvFile $Backup -Force
$lines = @(Get-Content $EnvFile)
if (@($lines | Where-Object { $_ -match '^BRIDGE_TOKEN=' }).Count -ne 1) { throw 'BRIDGE_TOKEN= must appear exactly once in .env - stopped, nothing changed' }
$b = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
$tok = ([System.BitConverter]::ToString($b) -replace '-', '').ToLower()
"UPDATE pacs_config SET bridge_token = '$tok', updated_at = NOW() WHERE id = 1;" |
  docker exec -i $DbContainer psql -U medconnect -d medconnect -q -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'EMR DB update failed - .env not changed yet' }
$lines = $lines | ForEach-Object { if ($_ -match '^BRIDGE_TOKEN=') { "BRIDGE_TOKEN=$tok" } else { $_ } }
Set-Content -Path $EnvFile -Value $lines -Encoding ascii
$md5 = ([System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($tok))) -replace '-', '').ToLower()
Remove-Variable tok, b
$db = (docker exec $DbContainer psql -U medconnect -d medconnect -tAc "SELECT md5(bridge_token) FROM pacs_config WHERE id = 1").Trim()
$fileTok = ((Get-Content $EnvFile) | Where-Object { $_ -match '^BRIDGE_TOKEN=' }) -replace '^BRIDGE_TOKEN=', ''
$fileMd5 = ([System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($fileTok))) -replace '-', '').ToLower()
Remove-Variable fileTok
if ($db -eq $md5 -and $fileMd5 -eq $md5) { 'OK - EMR and PACS .env now hold the same new token (48 chars). Value not shown.' } else { 'FAIL - EMR and .env differ. See procedure step 6-B.' }
```

#### 스크립트 2 — `C:\Bethesda-p1\check_orthanc.py` (브리지 컨테이너 안에서 실행)

```python
# Run inside bethesda-worklist-bridge: checks the Orthanc answers bridge.py relies on,
# with one throwaway 8x8 test image that is deleted at the end. Touches no EMR data.
import io, os, time, requests
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, SecondaryCaptureImageStorage

O = os.environ.get("ORTHANC_URL", "http://orthanc:8042")
A = ("admin", os.environ["ORTHANC_PASSWORD"])
uid = generate_uid()

fm = Dataset()
fm.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
fm.MediaStorageSOPInstanceUID = generate_uid()
fm.TransferSyntaxUID = ExplicitVRLittleEndian
ds = FileDataset("t", {}, file_meta=fm, preamble=b"\0" * 128)
ds.PatientName = "TEST^PACSCHECK"; ds.PatientID = "PX-TEST-0000"; ds.Modality = "OT"
ds.StudyInstanceUID = uid; ds.SeriesInstanceUID = generate_uid()
ds.SOPClassUID = fm.MediaStorageSOPClassUID; ds.SOPInstanceUID = fm.MediaStorageSOPInstanceUID
ds.SamplesPerPixel = 1; ds.PhotometricInterpretation = "MONOCHROME2"; ds.Rows = 8; ds.Columns = 8
ds.BitsAllocated = 8; ds.BitsStored = 8; ds.HighBit = 7; ds.PixelRepresentation = 0; ds.PixelData = bytes(64)
ds.is_little_endian = True; ds.is_implicit_VR = False
buf = io.BytesIO(); ds.save_as(buf, write_like_original=False)

r = requests.post(O + "/instances", data=buf.getvalue(), auth=A, headers={"Content-Type": "application/dicom"}, timeout=15)
print("1 upload:", r.status_code)
find = lambda: requests.post(O + "/tools/find", auth=A, timeout=10,
                             json={"Level": "Study", "Query": {"StudyInstanceUID": uid}, "Expand": True}).json()
s = find()[0]
try:
    print("2 has IsStable:", "IsStable" in s, "| IsStable now:", s.get("IsStable"))
    print("3 PatientMainDicomTags.PatientID:", (s.get("PatientMainDicomTags") or {}).get("PatientID"), "(expect PX-TEST-0000)")
    print("4 waiting 75 s for Orthanc to call it stable ...", flush=True)
    time.sleep(75)
    s = find()[0]
    print("5 IsStable after 75 s:", s.get("IsStable"), "(expect True)")
    st = requests.get(O + "/studies/%s/statistics" % s["ID"], auth=A, timeout=10).json()
    print("6 CountInstances:", st.get("CountInstances"), "(expect 1)")
finally:
    print("7 delete test study:", requests.delete(O + "/studies/" + s["ID"], auth=A, timeout=10).status_code, "(expect 200)")
```

## 2026-09-29 — 위키 2절(직원용 사용법)을 프랑스어 화면 기준으로

- **상태**: 확인 요청
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만, develop `9ded00f`을 ff로 당긴 뒤). **PACS 저장소** — 없음
- **한 일**: `modules/pacs.md` 2절을 통계 세션 방식으로 다시 씀 — 버튼·칸 이름은 **프랑스어 화면 그대로 + 괄호에 한국어**. 2.1 의사 검사 내기, 2.2 방사선사 촬영(+ 워크리스트에 환자가 없을 때), 2.3 영상 보기·판독, 2.4 판독소견 목록, **2.5 영상이 안 보일 때**, **2.6 환자 번호 경고가 떴을 때**를 순서대로. 이름은 `fr.js`·`ko.js`의 실제 문자열과 `server-status.ps1`의 프랑스어 줄 이름에서 옮김.
- **바꾼 파일**: `wiki/modules/pacs.md`(2절, 4절 DB 표의 `801`→`019(세션 번호 801)`, 7절 P-7에 과도기 주의, 8절), `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인한 방법**: 프랑스어·한국어 문구를 `frontend/src/i18n/fr.js`·`ko.js`와 대조, 화면 구조는 지금 develop의 `Consultation.jsx`(🖼·🔒·뷰어 창)·`RadiologyReadings.jsx`·`Payment.jsx` 기준. 2.4·2.6의 경고·도착 표시는 앞 작업에서 격리 스택으로 한·불 화면을 본 것과 같음. 2.6 예시의 환자번호·이름(`26-00012 RAKOTO Jean`)은 설명용으로 지어낸 것.
- **확인 못 한 것**: 촬영 장비 쪽 메뉴 이름(장비 설치 후), 뷰어가 아이디·비밀번호를 묻는지(P-9). 둘 다 「확인 필요」로 남김.
- **총괄 확인 요청**:
  - **과도기 문제** — EMR은 합쳐졌는데 PACS 브리지(`e109157`)는 아직이라, 실행 중 시스템에서는 판독 목록이 영상이 와도 계속 **「Images en attente (영상 대기 중)」** 로 보입니다. 장비가 아직 없어서 지금 영향은 없지만, 장비를 붙이기 전에 브리지를 합쳐야 합니다(P-1 조치 때 같이 하시면 됨). 2.4에 임시 안내 한 줄, 7절 P-7에 기록. 브리지를 합치면 2.4의 그 한 줄을 지워 주세요(또는 PACS 세션에 알려 주시면 지움).
  - 2.6의 「다른 환자의 영상이면 … 다시 찍어야 할 수 있습니다 — 의사가 판단합니다」는 의학적 판단을 정하지 않으려고 이렇게 씀. 실장님이 병원 절차를 정하시면 바꿈.
- **다른 세션에 부탁**: 없음
- **남은 일 · 알려진 문제**: 앞 항목과 같음(P-4 격리 스택 허락 대기, P-6, P-20, P-1).

## 2026-09-29 — 영상 도착 확인 (P-7) · 영상 속 환자번호 대조 (P-3), P-4 설계안

> **총괄 확인 (2026-09-29)**: EMR 쪽 `6456471` 합침 + 실행 중 EMR 반영. 마이그레이션은 규칙대로 **`801` → `019_pacs_image_arrival.sql`로 번호를 바꿔** 합침(내용 그대로, 위키 모듈 페이지의 파일 이름도 019로 고침 — 이 노트 아래 본문의 801은 세션 작업 당시 이름). PACS 저장소 `e109157`·`43bd994`는 아직 합치지 않음 — 실장님 재부팅 뒤 P-1 조치와 한 번에. 그때 브리지 로그의 「could not ask Orthanc」 확인함. 진짜 Orthanc 응답 형식은 그때 실제 영상으로 확인 예정. 진료·설정 세션 부탁은 전달함.

- **상태**: 확인 요청 (P-7·P-3) · P-4는 설계안만 — 실장님 결정 대기(PACS 격리 스택 허락)
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (develop `5e0e056`을 ff로 당긴 뒤 작업)
  - **PACS 저장소** `session/pacs` `e109157` — 브리지·compose (그 앞의 `43bd994`도 아직 안 합쳐짐)
  - **합치는 순서**: EMR을 먼저 합쳐도, PACS를 먼저 합쳐도 됩니다. 새 브리지 + 옛 EMR이면 브리지가 `/study-arrived` 404를 한 번 보고 묻기를 멈춤(격리 시험으로 확인). 새 EMR + 옛 브리지면 지금과 같음(아무도 완료 처리 안 함).
- **한 일**:
  - **P-7**: 브리지가 바퀴마다 워크리스트의 각 StudyInstanceUID를 Orthanc(`/tools/find`)에 묻고, 스터디가 **Stable**(기본 60초 동안 새 영상 없음)이면 EMR `POST /api/pacs/study-arrived`로 알림. EMR은 worklist_log를 `completed`, order_item.worklist_status를 `completed`로 → 다음 피드에서 빠지고 `.wl` 삭제 → 장비 목록에서 사라짐. Stable을 기다리는 이유: 여러 장짜리 검사를 보내는 중에 목록에서 빠지지 않게.
  - **P-3**: 같은 보고에서 EMR이 영상 속 PatientID와 chart_no를 비교해 `patient_check`(match/mismatch/missing) 저장. 「🩻 판독소견」 목록(`RadiologyReadings.jsx`)에 「영상 N장 도착」/「영상 대기 중」과 빨강(불일치)·노랑(번호 없음) 경고. `viewer-url` 응답에 `images` 추가. **한계(위키에 적음)**: 워크리스트에서 다른 환자를 고른 경우는 영상에 그 환자의 정보가 그대로 들어가 못 잡음 — 그래서 P-7이 짝.
  - 진료 세션이 이미 `worklist_status='completed'`인 오더를 잠그게 해 두어서(`orderLocked`, DELETE 409), 영상이 온 오더는 이제 지울 수 없게 됨 — 의도와 맞음.
- **바꾼 파일**:
  - EMR: `backend/src/routes/pacs.routes.js`(`POST /study-arrived`, `viewer-url`·`readings`에 영상 정보), `frontend/src/components/RadiologyReadings.jsx`, **새 파일** `backend/sql/801_pacs_image_arrival.sql`, `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
  - PACS: `bridge/bridge.py`(`find_stable_study`, `report_arrivals`), `docker-compose.yml`(브리지에 `ORTHANC_URL`·`ORTHANC_USER`·`ORTHANC_PASSWORD`)
- **공용 파일 변경**: `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 4개
- **DB 마이그레이션**: `backend/sql/801_pacs_image_arrival.sql` — worklist_log에 칸 6개(images_received_at, orthanc_study_id, image_count, image_patient_id, image_patient_name, patient_check)와 patient_check CHECK 추가. **기존 줄은 바꾸지 않음**, 다시 실행해도 안전.
- **번역 키**: `px_imagesArrived`, `px_imagesWaiting`, `px_patientMismatch`, `px_patientMissing` (ko · en · fr 모두)
- **확인한 방법**:
  - `node --check pacs.routes.js`, `python -m py_compile bridge.py`, 프론트 `npm install --no-package-lock` 후 `npm run build` 통과
  - 격리 스택 9188 (`bethesda-s-pacs-*:dev` 이미지 — 새 규칙대로), 마이그레이션 801 적용 로그 확인
  - **가짜 Orthanc**(내가 만든 작은 Python 서버, `/tools/find`·`/statistics`만, 로그인 검사함, 포트 안 엶)를 격리 네트워크에 `orthanc`란 이름으로 붙이고, **수정한 브리지 코드**를 기존 브리지 이미지로 일회용 실행. 오더 5건: 일치 → `match`, 다른 번호 → `mismatch`, 번호 없음 → `missing`, 아직 안 끝남(IsStable=false) → 보고 안 함, Orthanc에 없음 → 보고 안 함. 세 건 `completed`, 다음 바퀴에 `.wl` 5 → 2개
  - 실패 경우: Orthanc 비밀번호 틀림(401) → 한 줄 로그, 워크리스트 계속 · 비밀번호 없음 → 시작 경고, 묻지 않음 · Orthanc 없음 → 한 줄 로그, 한 바퀴 약 4초 지연 · 옛 EMR(공통 404) → 한 번만 묻고 멈춤(requests를 바꿔 끼워 확인)
  - `/study-arrived` 직접: 틀린 토큰 401, 칸 없음 400, 다른 항목 UID 409, 없는 항목 404
  - 화면: 진료 → 🩻 판독소견을 **한국어·프랑스어**로 눌러 봄 — 도착/대기 표시, 빨강·노랑 경고 문구. 뒤쪽 오더 목록에서 영상 온 오더에 🔒 표시 확인
  - develop의 날짜 문자열 변경 뒤에도 피드 생년월일이 맞음(1985-01-20 → `19850120`)
- **확인 못 한 것**: **진짜 Orthanc 26.6.1의 응답**(`/tools/find` Expand 결과에 `IsStable`·`PatientMainDicomTags`가 있는지 — Orthanc 문서 기준으로 짰음), 진짜 장비. 둘 다 PACS 격리 스택이 있어야 함. 영어 화면은 눈으로 안 봄.
- **위키**: `modules/pacs.md` 1절, 2절(방사선사·의사·판독소견 목록), 3.1·3.3·3.4, 4절(API·`images`·`patient_check`·브리지 환경 변수·비밀값·DB), 5절 진료, 6절 `.env`, 7절 P-3·P-7·P-19·P-20(새), 8절
- **총괄 확인 요청**:
  - PACS 저장소를 합칠 때(P-1 조치와 같이) 실행 중 PACS `.env`에 `ORTHANC_PASSWORD`가 이미 있으므로 브리지 재생성만으로 도착 확인이 켜집니다. 합친 뒤 브리지 로그에 `could not ask Orthanc` 가 없는지 봐 주세요.
  - 격리 시험은 가짜 Orthanc로만 했습니다 — 진짜 Orthanc 확인은 PACS 격리 스택(아래 설계) 허락 후.
- **다른 세션에 부탁**:
  - **진료 세션** — 영상 뷰어 창(`Consultation.jsx` `openViewer`)에 `viewer-url` 응답의 `images.patient_check`가 `mismatch`/`missing`이면 경고를 보여 주세요. 문구는 이미 있는 `px_patientMismatch`(`{id}`·`{name}` 치환)·`px_patientMissing`을 그대로 쓰면 됩니다. `RadiologyReadings.jsx`의 `PatientCheck`가 같은 일을 합니다. 그리고 P-19(`worklist_status` 번역) — 이제 `completed`도 영어로 보입니다.
  - **설정 세션** — (선택) P-20: 브리지가 Orthanc에 못 묻는 상태를 상태 화면에 보이게 할지. 원하면 브리지 heartbeat detail에 칸을 추가하겠습니다.
- **P-4 설계안 (코드 없음, 실장님 결정 대기)** — 장비가 워크리스트의 StudyInstanceUID를 쓰지 않고 새로 만들면 영상이 오더에 안 붙는 문제
  1. **Accession으로 한 번 더 찾기**: 브리지가 UID로 못 찾으면 같은 줄의 AccessionNumber로 Orthanc `/tools/find`. 정확히 1개만 나오고 Stable이면 `found_by: "accession"`과 **실제 StudyInstanceUID**를 함께 보고.
  2. EMR: `/study-arrived`가 UID 대신 accession이 맞는 보고도 받게 하고, 실제 UID를 새 칸 `image_study_uid`(마이그레이션 802)에 저장. `viewer-url`은 `image_study_uid`가 있으면 그것으로 뷰어를 엶. accession으로만 맞은 것은 약한 연결이므로 `patient_check`가 `match`가 아니면 판독 목록에 경고(기존 것 재사용).
  3. (2단계, 선택) 워크리스트 없이 손으로 친 영상: accession도 없으면 자동 연결 불가 → Orthanc에서 PatientID = chart_no인데 어느 오더에도 안 붙은 스터디를 판독 목록에 「연결 안 된 영상」으로 보여 주고 의사가 오더에 붙이기. 이건 화면 구성이 바뀌므로 실장님 결정 필요.
  - **검증에 필요한 것 — PACS 격리 스택 제안**: PACS 저장소에 `docker-compose.session.yml`(override)을 만들어 `-p bethesda-s-pacs-pacs`로 띄움. 컨테이너 `bethesda-s-pacs-orthanc`·`bethesda-s-pacs-bridge`, **포트는 `127.0.0.1`에만** 웹 `9198`·DICOM `11298`(9090·4242는 절대 안 씀. 4298 같은 번호는 지금 Windows 예약 대역 4204–4303 안이라 피함 — 띄우기 전에 `netsh … excludedportrange`로 다시 확인), 영상은 이름 붙인 볼륨(`./storage` 안 씀), 워크리스트 폴더도 별도 볼륨, 브리지는 EMR 격리 스택(9188) 네트워크로 연결, Orthanc 이미지는 이미 받아 둔 26.6.1 그대로(다운로드 없음). 실행 중 `bethesda-pacs`·`bethesda-worklist-bridge`와 이름·포트·폴더가 겹치지 않음. **실장님 허락 후에만 파일을 만들고 띄웁니다.**
- **남은 일 · 알려진 문제**: P-4(위), P-6(오늘만 나오는 워크리스트 — P-7의 「어제 오더」 한계와 같이), P-20, P-1은 총괄·실장님 조치 대기.

## 2026-09-29 — 브리지 토큰 보안 (P-2·P-5), P-1 조치 분담 기록

> **총괄 확인 (2026-09-29)**: EMR 저장소 합침(`f3a5810`) + 실행 중 EMR 반영. 확인: 옛 기본값 토큰으로 피드 → 401 · `/pacs/config`는 임상병리 계정 403, 관리자 200(토큰 48자) · 브리지 heartbeat는 합친 뒤에도 계속 들어옴(아래 총괄 답장 참고). PACS 저장소 `session/pacs`(`43bd994`)는 **아직 합치지 않음** — 실행 중 브리지를 다시 만들어야 해서 P-1(포트) 조치와 함께 재부팅 뒤에 한 번에 함. 토큰 재발급은 실장님 결정 대기.

- **상태**: 확인 요청
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (코드 + 위키 + 번역)
  - **PACS 저장소** `session/pacs` `43bd994` — 브리지·compose
  - **두 저장소는 따로 합쳐도 됩니다.** 새 브리지는 헤더로 보내는데 EMR은 첫 버전부터 헤더를 받고, 새 EMR은 옛 브리지의 `?token=`도 계속 받습니다.
- **한 일**:
  - EMR이 16자 미만이거나 옛 기본값(`change-me-bridge-token`)인 토큰을 「설정 안 됨」으로 보고 **무조건 거절** — 피드·heartbeat·`/api/worklist` 모두. 기본값이 저장소에 공개돼 있어, PACS를 연결하지 않은 병원은 로그인 없이 오늘 영상 오더 환자의 이름·생년월일을 내주고 있었음(P-2). 비교는 `timingSafeEqual`.
  - `GET /api/pacs/config`를 settings 권한으로 제한(P-5). 설정 화면에서 토큰을 가리고 「보기/숨기기」 버튼, 쓸 수 없는 토큰이면 노란 경고. 피드 주소 예시도 토큰을 가리고 포트를 `:8080`→`:9080`으로.
  - 브리지는 토큰을 URL이 아니라 `X-Bridge-Token` 헤더로 보냄. **고치기 전에는 EMR 백엔드 로그에 15초마다 토큰이 찍혀 있었음**(2026-09-29 `docker logs bethesda-emr-api`로 확인, 값은 보지 않고 가림). 401이면 어느 쪽을 고칠지 로그에 씀. compose·`bridge.py`에서 기본 토큰을 없앰, `bridge.py` 기본 피드 주소 8080→9080.
  - P-1: 총괄 확인 내용과 조치 분담(실장님: 동적 포트 범위 복구·재부팅, 총괄: 재생성·포트 확인)을 위키 7절에 기록.
- **바꾼 파일**:
  - EMR: `backend/src/routes/pacs.routes.js`, `backend/src/routes/worklist.routes.js`, **새 파일** `backend/src/routes/pacs.token.js`(PACS 소유 — 토큰 규칙을 두 라우트가 같이 씀), `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
  - PACS: `bridge/bridge.py`, `docker-compose.yml`
- **공용 파일 변경**:
  - `frontend/src/pages/Settings.jsx` — **오더 연동 탭 안(PACS 부분)만**: Bridge Token 입력 칸(가림·보기 버튼·경고), 피드 주소 예시 2줄. 탭 밖으로는 맨 위 상태 선언에 `showBridgeToken` 한 줄, `up()` 옆에 도우미 함수 2개(`pacsTokenUsable`, `pacsTokenShown`)를 넣음 — 모두 PACS 탭에서만 씀.
  - `frontend/src/i18n/ko.js`·`en.js`·`fr.js` — `px_` 표시 사이에만 키 3개 추가.
- **DB 마이그레이션**: 없음. (DB의 기본값 `change-me-bridge-token`은 그대로 두고 코드에서 거절 — 데이터 변경 마이그레이션을 피함)
- **번역 키**: `px_show`, `px_hide`, `px_tokenUnusable` (ko · en · fr 모두 넣음)
- **확인한 방법**:
  - `node --check` 3개 파일, `python -m py_compile bridge.py`
  - 프론트 빌드 통과 — **`npm ci`는 EMR 저장소에 `package-lock.json`이 없어서 실행 불가**, Dockerfile과 같은 `npm install`(lockfile 만들지 않음) 후 `npm run build`
  - 토큰 규칙 단위 확인(node): 옛 기본값·빈 값·짧은 값·길이 다름·배열·멀티바이트, 헤더→본문→쿼리 순서
  - 격리 스택 9188(`bethesda-s-pacs`): 옛 기본값으로 피드·heartbeat 401(이전 코드는 200을 줬을 것 — 코드로 판단, 실행으로는 확인 안 함), `/worklist/dicom-mwl` 401, 의사 권한 계정으로 `/pacs/config` 403, 관리자 200. 진짜 토큰으로 헤더 200, 쿼리 200(옛 브리지 호환), 틀린 토큰 401
  - **수정한 브리지 코드를 실제로 돌려 봄**: 기존 브리지 이미지로 일회용 컨테이너(`px-bridge-test`, 포트 없음, `.wl`은 임시 폴더로)를 격리 스택 네트워크에 붙여 실행 → 테스트 영상 오더 1건이 `260929-1.wl`로 써짐, heartbeat 기록됨, EMR 로그 줄에 토큰 없음(`GET /api/pacs/worklist-feed?format=json`). 옛 기본값·빈 토큰이면 시작 경고 + 401 원인 메시지, `.wl`은 지우지 않음
  - 설정 → 오더 연동 화면을 한국어·프랑스어로 눌러 봄: 토큰 가림, 보기/숨기기, 옛 기본값 입력 시 경고, 피드 주소 가림·9080
- **확인 못 한 것**: 실행 중인 PACS·EMR에 붙여 보지 않음(규칙상). 영어 화면은 눈으로 안 봄(키만 넣음).
- **위키**: `modules/pacs.md` 3.1·3.3·3.4, 4절(API 표, 토큰 검사, 브리지 환경 변수, 비밀값, 공용 부품), 6절 Bridge Token, 7절 P-1·P-2·P-5·P-17, 8절
- **총괄 확인 요청**:
  - 합친 뒤 실행 중인 EMR에서 **브리지 heartbeat가 계속 들어오는지** 확인해 주세요. 지금 쓰는 토큰은 48자라 새 규칙을 통과합니다(길이만 확인, 값은 안 봄).
  - 토큰을 아직 옛 기본값으로 둔 설치는 합친 뒤 브리지가 멈춘 것처럼 보입니다(상태 화면 「보고 없음」, 설정 화면 노란 경고). 의도된 동작이지만 배포 때 CHANGELOG에 한 줄 필요.
  - 고치기 전 로그에 토큰이 남아 있으니, 원하시면 토큰을 새로 만들어 PACS `.env`와 EMR 설정을 함께 바꾸는 것을 권합니다(실장님 결정).
  - PACS 저장소 `CHANGELOG.md`는 건드리지 않았습니다 — 배포할 때 써 주세요.
- **다른 세션에 부탁**: 없음 (지난 항목의 설정 세션 참고 사항은 그대로)
- **남은 일 · 알려진 문제**: P-1은 총괄 결과 대기. 다음 후보 P-7 → P-3 → P-4(환자 식별, PACS 격리 스택 필요 — 실장님 허락 후).

## 2026-09-29 — P-1 원인 추가 확인, 장비 미설정 확인

- **상태**: 보류 — 실장님 결정 대기 (P-1 해결 방식)
- **커밋**: **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 (위키만). **PACS 저장소** — 없음
- **한 일**: P-1의 근본 원인 확인 — 이 PC의 Windows 동적 포트 범위가 1024–15000으로 바뀌어 있어, 재부팅마다 4242·9090·9080이 예약될 수 있음(읽기 전용 `netsh … show dynamicport` 조회). 포트 번호를 옮기는 것으로는 해결되지 않으므로 아래 항목의 ② 안은 뺌. 실장님께서 **현장 장비는 아직 하나도 설정하지 않았다**고 확인해 주셔서 위키 7절에 반영.
- **바꾼 파일**: `wiki/modules/pacs.md` 7절 P-1, 이 노트
- **공용 파일 변경**: 없음 · **DB 마이그레이션**: 없음 · **번역 키**: 없음
- **확인 못 한 것**: 동적 포트 범위를 누가/언제 바꿨는지
- **총괄 확인 요청**: P-1 해결은 ① 실장님이 관리자 권한으로 동적 포트 범위를 Windows 기본값(49152부터 16384개, ipv4·ipv6)으로 되돌리고 재부팅 → ② 총괄이 PACS 컨테이너를 다시 만들고 호스트에서 9090·4242가 열리는지 확인. EMR 9080도 같은 위험이므로 참고.
- **다른 세션에 부탁**: 없음 (아래 항목의 설정 세션 참고 사항은 그대로 유효)

## 2026-09-29 — 현황 파악, 위키 첫 작성 (코드 변경 없음)

- **상태**: 보류 — 실장님이 고칠 순서를 정하시길 기다림
- **커밋**:
  - **EMR 저장소** `session/pacs` — 이 항목이 들어간 커밋 하나 (위키만: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`)
  - **PACS 저장소** `session/pacs` — 커밋 없음 (브랜치 이름만 `session/pacs`로 바꿈, `main`의 `c9dc0b4`에서 출발)
- **한 일**: 두 저장소의 PACS 관련 파일을 모두 읽고(브리지, compose, setup, 시험 스크립트, `pacs.routes.js`, `worklist.routes.js`, `RadiologyReadings.jsx`, 마이그레이션 007·015·018, 그리고 연결된 `consult.routes.js`·`Consultation.jsx`·`Settings.jsx`·`status.routes.js`의 해당 부분) 위키 1~7절을 실제 코드 기준으로 채웠습니다. 문제 19건을 심각도와 근거(파일:줄)와 함께 7절에 정리했습니다.
- **바꾼 파일**: `wiki/modules/pacs.md`, `wiki/handoff/pacs.md`
- **공용 파일 변경**: 없음
- **DB 마이그레이션**: 없음
- **번역 키**: 없음
- **확인한 방법**: 코드 읽기. 실행 중인 PACS는 **읽기만** 했습니다 — `docker ps`, `docker inspect`(포트 설정), 브리지 로그 마지막 5줄, 호스트에서 9090·4242 TCP 연결 시도, `netsh … excludedportrange` 조회. PACS `.env`는 비밀값을 출력하지 않고 「옛 데모 비밀번호와 같은지」, 「change-me 기본값인지」만 확인(둘 다 아님).
- **확인 못 한 것**: 실제 장비 동작(워크리스트의 `ANY` AE 매칭, 장비가 워크리스트 UID를 쓰는지), 현장 직원이 Orthanc 뷰어에 어떻게 로그인하는지, 9090이 예약 대역 밖인데도 안 잡힌 이유, `server-status.ps1`이 P-1 상태를 초록으로 보이는지. EMR DB(`pacs_config`)는 조회하지 않았습니다.
- **위키**: `modules/pacs.md` 1~8절 전부
- **총괄 확인 요청**:
  - **P-1 — 실행 중인 PACS가 지금 호스트에서 연결되지 않습니다.** `bethesda-pacs` 컨테이너는 healthy지만 `NetworkSettings.Ports`가 비어 있고 `127.0.0.1:9090`·`:4242` 모두 연결 실패. 이 PC의 Windows 예약 포트 대역 `4204–4303`에 4242가 들어 있습니다. 장비 워크리스트·영상 전송·EMR 영상 보기가 모두 안 되는 상태로 보입니다. 실행 중인 시스템 반영은 총괄 몫이라 손대지 않았습니다. 실장님 결정 후 둘 중 하나: ① 관리자 권한으로 4242를 예약 대역에서 빼 두기(`net stop winnat` → `netsh int ipv4 add excludedportrange protocol=tcp startport=4242 numberofports=1` → `net start winnat`) 후 PACS 컨테이너 재생성 — 장비 설정 변경 없음, ② DICOM 포트를 예약 대역 밖으로 옮기기 — 장비 쪽 포트도 바꿔야 함.
- **다른 세션에 부탁**:
  - **설정 세션** — `server-status.ps1`이 PACS를 컨테이너 health로만 보는 것으로 읽힙니다. 컨테이너 안 healthcheck는 호스트 포트가 안 잡혀도 healthy라, 호스트에서 `9090`·`4242`로 TCP 연결을 시도하는 검사가 있으면 P-1 같은 상태를 잡을 수 있습니다. (PACS 세션이 먼저 실장님 결정을 받은 뒤 정식 요청 예정 — 지금은 참고)
  - **진료 세션** — (실장님 결정 후 요청 예정) 영상 뷰어 창의 바깥 클릭 시 저장 안 한 판독 유실(P-16), `worklist_status` 번역(P-19), 뷰어 창에 「영상 환자 ≠ EMR 환자」 경고 자리(P-3).
- **남은 일 · 알려진 문제**: `wiki/modules/pacs.md` 7절 P-1~P-19. 제안 순서는 실장님께 보고한 내용 참고 — P-1(운영) → P-2·P-5(토큰) → P-7·P-3·P-4(환자 식별) → PACS 격리 스택.
