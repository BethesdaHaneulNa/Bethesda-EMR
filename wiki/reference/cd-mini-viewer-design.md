# 설계안 — CD에 넣는 「보기 전용」 작은 뷰어

> 2026-10-02 · PACS 세션 → 총괄 → 실장님. **아직 짓지 않았습니다.** 12절의 결정이 나면 11절의 차례대로 짓습니다.
> 실장님: 「뷰어가 너무 크네」(Weasis 139MB) → 우리가 작은 뷰어를 직접 만드는 것을 물으심 → 「초음파 동영상 이거 하나는 염두는 해야 돼, 그냥 뷰어 보는 기능에만 충실한다 해도」.
> **「확인함」** 은 원문을 읽었거나 이 PC·격리 스택에서 실제로 해 본 것, **「추측」** 은 그렇지 않은 것입니다. 앞선 설계안: [image-print-export-design.md](image-print-export-design.md)(반출 프로그램 · Weasis · 「.exe로 만드는 길」).

## 1. 한눈에

| | |
|---|---|
| 무엇 | 디스크(또는 폴더)의 영상을 **보기만** 하는 Windows 프로그램 하나 — `VOIR.EXE`. 받는 사람이 더블클릭하면 그 디스크의 환자 · 검사 · 영상이 열림 |
| 크기 | **수백 KB**(목표 1MB 안쪽 — 추측. 시험 삼아 만든 빈 창 프로그램은 4~6KB였음, 확인함). Weasis는 139MB |
| 받는 PC에 필요한 것 | 없음 — Windows 10(1903부터) · 11에 들어 있는 .NET Framework 4.8로 돎(설계안 11절과 같은 길, 확인함). 64비트 · 32비트 모두 |
| 받는 PC에 남기는 것 | **없음** — 설정 파일 · 임시 파일 · 레지스트리를 쓰지 않고, 디스크를 읽기만 함 |
| 하는 것 | 환자 · 검사 · 시리즈 목록 → 영상 보기 · 앞/뒤로 넘기기 · 밝기/대비 · 확대/이동 · 흑백 뒤집기 · **초음파 동영상 재생 / 멈춤 / 한 장씩** |
| 안 하는 것(이번) | 길이 · 각도 재기, 나란히 비교, 주석, 내보내기 · 인쇄, 3D |
| Weasis | 버리지 않음 — 「더 많은 기능이 필요할 때」 체크해서 함께 넣는 것으로 남김(3절) |

바깥 라이브러리는 쓰지 않습니다(5절). 영상의 압축을 푸는 일은 **Windows에 들어 있는 기능**과 **영상 서버(Orthanc)** 에 맡깁니다 — 이 설계의 핵심이고, 가장 큰 불확실성이었던 곳입니다(4절).

## 2. 화면

```
┌ Clinique Bethesda — RAKOTO Jean · 26-00001 ───────────────────────────────────── [—][□][✕] ┐
│ ┌ Examens ─────────────┐ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 2026-10-01  CR        │ │ RAKOTO Jean · 26-00001                    Chest PA · 2026-10-01│ │
│ │   Chest PA            │ │                                                                │ │
│ │   ▸ S1 Thorax PA  (2) │ │                                                                │ │
│ │     S2 Thorax (inv)(1)│ │                       (영상)                                   │ │
│ │ 2026-10-01  US        │ │                                                                │ │
│ │   SONO(5)             │ │                                                                │ │
│ │     S1 Foie      (10) │ │                                                                │ │
│ │     S2 Vésicule   (8) │ │ S1 · image 1 / 2          C 2048  L 4096        zoom 31 %      │ │
│ │     S3 Cine ▶ (12 fr) │ └──────────────────────────────────────────────────────────────┘ │
│ └───────────────────────┘ [◀ image] [image ▶]   [⏮][◀][▶ Lire][▶][⏭]  12 / 48 · 20 img/s    │
│ Visionneuse de consultation — non destinée au diagnostic          [Ajuster] [Inverser] [?]  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **왼쪽**: 디스크의 `DICOMDIR`에서 읽은 검사와 시리즈(영상 장수, 동영상은 ▶와 프레임 수). 눌러서 고름. 디스크에 환자가 한 명이므로 환자 이름은 창 제목에.
- **가운데**: 영상. 네 귀퉁이에 환자 · 검사 · 날짜 · 시리즈/영상 번호 · 밝기 값 · 확대율.
- **마우스**: 휠 = 앞/뒤 영상(동영상이면 앞/뒤 프레임) · 왼쪽 단추로 끌기 = 밝기/대비 · Ctrl+휠 = 확대/축소 · 오른쪽 단추로 끌기 = 이동 · 더블클릭 = 창에 맞춤.
- **키**: ← → 영상(프레임) · ↑ ↓ 시리즈 · Space 재생/멈춤 · R 처음 상태로 · I 흑백 뒤집기.
- **동영상**: 재생 / 멈춤 / 한 프레임씩 앞 · 뒤 / 처음 · 끝. 빠르기는 영상에 적힌 값(프레임 시간)을 따르고, 없으면 초당 15장.
- **맨 아래 한 줄은 늘 보임**: 「Visionneuse de consultation — non destinée au diagnostic」(8절).
- 글은 프랑스어 · 영어(Windows의 언어를 따름).

## 3. 디스크의 모양 — 뷰어를 둘로

```
DICOMDIR · IMAGES\ · README.TXT      ← 지금과 같음
VOIR.EXE                             ← 작은 뷰어. 늘 넣음(수백 KB)
(VIEWER\ … · WEASIS.BAT)             ← 「Weasis도 넣기」를 체크했을 때만(+138MB)
```

- **기본 뷰어 = 늘**: 크기가 무시할 만하고 받는 PC에 아무것도 남기지 않으므로 체크 없이 모든 디스크에 넣는 것을 추천. `README.TXT`: 「Sans logiciel d'imagerie : double-cliquez sur VOIR.EXE」.
- **Weasis = 필요할 때 체크**: 재기 · 비교 같은 기능이 필요한 곳에 줄 때. 켜는 파일 이름은 `VOIR.BAT` → **`WEASIS.BAT`** 로 바꿉니다(`VOIR`는 작은 뷰어의 이름이 되므로). 지금의 「☐ Ajouter la visionneuse d'images au disque」는 「☐ Ajouter aussi Weasis (+138 Mo)」로.
- **만드는 법**: 뷰어의 소스(C# 파일)를 PACS 폴더에 두고, **반출 프로그램이 그 자리에서 실행 파일로 만들어** 디스크에 넣습니다. 확인함(이 PC, scratch): PowerShell의 `Add-Type -OutputAssembly VOIR.EXE -OutputType WindowsApplication`이 0.14초 만에 실행 파일을 만들고, 그것이 실행됨. → 저장소에 실행 파일을 넣지 않아도 되고, 따로 빌드 도구도 필요 없습니다. (반출 프로그램을 나중에 `.exe`로 만들 때는 같은 소스를 `csc`로 함께 빌드 — 설계안 11절.)

## 4. 가장 큰 불확실성 — 영상의 압축(전송 구문)

DICOM 영상은 장비 설정에 따라 여러 방식으로 압축되어 옵니다. 뷰어가 모든 방식을 직접 풀려면 큰 라이브러리가 필요합니다. 그래서 **「뷰어가 직접 여는 것」을 Windows가 풀 수 있는 범위로 잡고, 나머지는 디스크를 만들 때 영상 서버가 풀어서 내보내게** 합니다.

### 4-1. 실제 장비는 무엇을 보내나

- **확인함**(Mindray DP-10/20/30 초음파의 DICOM 적합성 선언서 원문): 보내는 종류는 「US Image Storage」 · 「US Multiframe Image Storage」(동영상) · 「Secondary Capture」. 내놓는 전송 구문은 **Implicit/Explicit VR Little Endian(압축 없음) · Explicit VR Big Endian · JPEG Baseline(.4.50, 손실) · JPEG Lossless(.4.70) · RLE Lossless(.5) · JPEG 2000 무손실(.4.90) · JPEG 2000(.4.91)**. 색 표현은 "RGB, for color images; MONOCHROME2, if the image is grayscale; YBR_FULL_422, if the image is sent …"(JPEG로 보낼 때).
- 검색 결과로 읽음(원문 PDF를 직접 열지는 않음): GE LOGIQ · Voluson 계열도 압축 없음 · RLE · JPEG Baseline · JPEG Lossless(· 기종에 따라 JPEG 2000)를 내놓음.
- **확인함**(DICOM 표준 PS3.3 C.8.5.6, 초음파 영상): 색 표현은 "MONOCHROME2, PALETTE COLOR, RGB, YBR_FULL, YBR_FULL_422, YBR_RCT, YBR_ICT, YBR_PARTIAL_420" 가운데 하나이고, "YBR_FULL_422 for JPEG lossy compressed Transfer Syntaxes", "YBR_FULL or RGB for RLE Transfer Syntaxes".
- 그러니까 **장비 한 대가 여러 방식을 다 내놓고, 그중 무엇으로 오는지는 장비의 설정과 영상 서버가 받아 주는 목록으로 정해집니다.** 현지 장비가 실제로 무엇을 보내는지는 **붙여 봐야 압니다**(추측할 수 없음). `device-watch`가 「압축 전송(…)」으로 알려 줍니다.

### 4-2. Windows에 들어 있는 기능으로 풀리는 것 — 해 봄

격리 스택의 시험 영상(컬러 초음파 한 장 800×600 · 12프레임 동영상 640×480 · 12비트 흉부 필름 2500×3000)을 영상 서버로 여러 방식으로 압축해, 그 안의 프레임을 꺼내 Windows의 그림 기능(GDI+와 WIC — 둘 다 .NET Framework에서 바로 씀)으로 열어 봤습니다(이 PC, Windows 11).

| 프레임의 형식 | GDI+ | WIC | 비고 |
|---|---|---|---|
| JPEG Baseline, 8비트 흑백 | ✔ | ✔ | |
| JPEG Baseline, 8비트 컬러(YBR_FULL_422) | ✔ | ✔ | 색이 원본과 맞음(손실 압축만큼의 차이: R43→49 정도) |
| JPEG Extended(.4.51)인데 8비트 | ✔ | ✔ | |
| JPEG Lossless(.4.57 · .4.70), **8비트** 흑백 · 컬러 | ✔ | ✔ | 컬러의 픽셀 값이 원본과 **똑같음**(R43 G43 B153) |
| JPEG, **12비트 · 16비트**(손실 · 무손실) | ✘ | ✘ | "Unsupported JPEG data precision 12 / 16" |
| JPEG-LS | ✘ | ✘ | |
| JPEG 2000 | ✘ | ✘ | |

- **빠르기**(확인함): JPEG 프레임 한 장을 푸는 데 640×480 흑백 5.8ms, 800×600 컬러 3.5ms — 초당 30장 재생에 넉넉함.
- **확인 못 함**: Windows 10에서도 무손실 JPEG(8비트)가 열리는지(이 PC는 Windows 11). 안 열리면 그 형식은 「서버가 풀어서」 쪽으로 넘기면 됩니다.
- RLE는 Windows에 없지만 **풀기가 아주 단순한 방식**이라(수십 줄) 뷰어가 직접 풉니다(추측이 아니라 형식이 그렇음 — DICOM PS3.5 부록 G의 PackBits).

### 4-3. 영상 서버가 「풀어서」 내보내 주는가 — 해 봄

지금 쓰는 이미지(Orthanc **1.12.11**, GDCM 플러그인 포함 — 확인함)로, 임시 서버(127.0.0.1:9196)에서:

- **묶음을 만들 때 전송 구문을 바꿔 달라고 할 수 있음(확인함)**: `POST /tools/create-media-extended {Resources, Synchronous, "Transcode": "1.2.840.10008.1.2.1"}`. JPEG Baseline · Extended · Lossless · JPEG-LS · JPEG 2000이 섞인 검사(20건)를 넣었더니 **20건 모두 「Explicit VR Little Endian(압축 없음)」으로** 나왔습니다. `DICOMDIR`도 함께.
- RLE · JPEG 2000(YBR_RCT) · JPEG(YBR_FULL) · Big Endian 견본도 한 건씩 넣어 **모두 압축 없음으로 풀려 나옴**(확인함).
- 반대로 `"Transcode": JPEG Baseline`을 주면 8비트 영상은 모두 JPEG Baseline(손실)으로 **다시 압축**되고, 12비트 필름은 그대로 남습니다 — 원본을 손실 압축으로 바꾸는 일이라 **쓰지 않습니다**.
- 한 묶음에 **하나의 목표만** 줄 수 있습니다(영상마다 다르게는 안 됨).
- 영상 서버 자신은 RLE로 **압축해 주지는** 못합니다("Cannot transcode to transfer syntax: 1.2.840.10008.1.2.5") — 푸는 것은 됨.
- 크기(확인함): 위 20건이 압축된 채로 22MB, 풀면 **126MB**.

**지으면서가 아니라 조사하다 찾은 결함 하나 — 고쳤습니다**: 묶음을 만들 때 **같은 검사를 두 번** 적으면 영상 서버가 **끝내 응답하지 않습니다**(Orthanc 1.12.11, 15초 · 300초 기다려 봄). EMR의 `GET /export/bundle`은 두 오더가 같은 검사를 가리킬 때(accession으로 같은 영상에 이어진 경우) 그 검사를 두 번 적을 수 있었습니다 → 한 번만 적게 고침(`pacs.export.js`). 격리에서 확인: 두 오더 · 한 검사 → 0.7초 만에 영상 3장, 기록에도 3장.

### 4-4. 그래서 규칙

| 영상의 형식 | 디스크에 어떻게 | 뷰어가 어떻게 |
|---|---|---|
| 압축 없음(Implicit / Explicit VR LE) | 그대로 | 직접 읽음 |
| JPEG **8비트**(Baseline · Extended · Lossless) | **그대로** — 초음파 동영상이 여기 | Windows의 기능으로 프레임마다 풂 |
| RLE | 그대로 | 직접 풂 |
| **그 밖**(12·16비트 JPEG, JPEG-LS, JPEG 2000, Big Endian, MPEG 등) | 고른 검사에 하나라도 있으면 **그 묶음 전체를 「압축 없음」으로 풀어서**(영상 서버가) | 직접 읽음 |

- **왜 「늘 풀어서」가 아닌가**: 초음파 동영상 때문입니다. 800×600 컬러 100프레임이면 압축 없이 **144MB**, JPEG로는 그 10~20분의 1(추측 — 시험 그림에서는 컬러 한 장이 14분의 1, 흑백 동영상이 5분의 1이었음, 확인함). 다 풀면 CD 한 장에 동영상 네댓 개밖에 못 넣습니다. 장비가 JPEG로 보낸 동영상은 **그대로** 두는 것이 맞습니다.
- **「그 밖」이 섞였을 때의 대가**: 그 묶음은 전체가 풀리므로 같이 고른 JPEG 동영상도 커집니다. 반출 프로그램은 받은 뒤의 **실제 크기**로 디스크에 들어가는지를 다시 봅니다(지금도 굽기 전에 이미지 크기를 재서 넘치면 굽지 않음). 흔한 일은 아닐 것으로 봅니다(추측) — X-ray를 JPEG 2000으로 보내게 설정한 장비가 있을 때.
- **EMR이 할 일**(지을 때): 묶음을 만들기 전에 고른 검사들의 영상이 어떤 전송 구문인지 보고(영상 서버에 묻는 길은 **지을 때 확인** — 한 번에 묻는 길이 있는지), 「그 밖」이 있으면 `Transcode`를 붙입니다. 변경 기록 줄에 「풀어서 내보냄」을 적습니다.
- **기본 뷰어가 못 여는 영상이 그래도 남으면**(예: Windows 10에서 무손실 JPEG가 안 열리는 경우): 그 영상 자리에 「Cette image ne peut pas être affichée ici — ouvrez le disque avec un logiciel d'imagerie」. 다른 영상은 그대로 보임.
- **생각해 볼 다른 길 — 영상 서버가 받는 형식을 좁히기**: Orthanc의 설정으로 「받아 주는 전송 구문」을 좁히면(JPEG 2000 · JPEG-LS · MPEG를 받지 않음) 장비는 다른 방식으로 보내게 되어, 처음부터 「그 밖」이 생기지 않습니다. Orthanc를 고치는 것이 아니라 설정이지만, **장비가 붙는 방식을 바꾸는 일**이라 현지 장비가 정해진 뒤에 따로 결정할 일로 둡니다(12절 다).

## 5. 바깥 라이브러리를 쓸까 — 쓰지 않음

| | fo-dicom(.NET의 DICOM 라이브러리) | 직접 읽기 |
|---|---|---|
| 라이선스 | **MS-PL**(확인함 — 저장소 README, NuGet) — 써도 되는 라이선스 | 우리 것 |
| .NET Framework 4.8 | 5판은 .NET Standard 2.0용 — 4.8에서 돌지만 **딸린 패키지 14개**(Microsoft.Extensions.* · System.Text.Json 등)를 함께 실어야 함(확인함 — NuGet의 명세) | 해당 없음 |
| 크기 | 본체 패키지 0.9MB + 딸린 것들(추측: 합쳐 수 MB) + 압축 풀기 패키지 **4MB**(따로, 네이티브 — 확인함) | 수백 KB(추측) |
| 만들기 | NuGet에서 내려받아 묶어야 함 — 「Windows에 든 컴파일러만으로」가 안 됨 | 됨(3절) |
| 얻는 것 | 모든 압축 · 모든 형식 | 4-4절의 범위 |

→ 「설치 없이 · 1MB 안쪽 · Windows에 든 것만」과 맞지 않아 쓰지 않습니다. 직접 읽는 범위는 좁습니다: 파일 머리와 필요한 항목 수십 개, `DICOMDIR`의 목록, 픽셀 자료(압축 없음 · 프레임 조각 꺼내기 · RLE).

## 6. 표시의 정확성 — 지켜야 할 것

보기 전용이라도 **틀리게 보이면 안 되는 것**들입니다. 단계마다 견본 영상으로 영상 서버가 그린 그림(`/rendered`)과 견줘 확인합니다.

| 항목 | 어떻게 |
|---|---|
| 흑백의 방향(MONOCHROME1 / 2) | MONOCHROME1은 뒤집어서 — 안 그러면 X-ray가 음화로 보임 |
| 밝기 창(Window Center / Width) | 영상에 적힌 값으로 시작(여러 개면 첫째). 없으면 픽셀의 최소~최대. 사람이 끌어서 바꿈 |
| Rescale(Slope / Intercept) | 창을 적용하기 전에 적용 |
| 비트 수(8 / 10 / 12 / 16), 부호 | `BitsAllocated` · `BitsStored` · `HighBit` · `PixelRepresentation`대로 — 안 쓰는 윗비트를 가림 |
| 컬러 | RGB(점 순서 / 면 순서 `PlanarConfiguration`) · **YBR_FULL / YBR_FULL_422**(압축 없는 것은 식으로 바꿈, JPEG는 Windows가 바꿔 줌) · **PALETTE COLOR**(초음파에 흔함 — 색표를 읽어 적용) |
| 여러 프레임 | `NumberOfFrames`, 프레임 시간(`FrameTime` · `RecommendedDisplayFrameRate` · `CineRate`) |
| 화면의 가로세로 비 | `PixelAspectRatio`가 1:1이 아니면 그 비로 |
| 영상 방향 | 저장된 그대로 그림(돌리거나 뒤집지 않음). `PatientOrientation` · `Laterality`가 있으면 글자로 보여 줌 |
| 글자 | 환자 이름 · 설명의 문자 집합(`SpecificCharacterSet` — UTF-8, Latin-1) — 악센트가 깨지지 않게 |
| 못 여는 것 | 그림이 아닌 자료(장비 보고서 등)는 목록에 「—」, 못 여는 압축은 안내 한 줄(4-4절) |

**알려 둘 한계**: 12 · 16비트 영상을 8비트 화면에 창을 씌워 그리므로 **화면의 그림은 진단용 화질이 아닙니다**(어느 뷰어나 그렇지만, 우리는 모니터 보정 · 정밀한 보간을 하지 않음). 그래서 8절의 문구.

## 7. 시험 영상 — 어떻게 구하나

- 지금 있는 것: 가짜 장비로 그린 영상(컬러 초음파 · 12프레임 동영상 · 12비트 필름 · 뒤집힌 필름), 그리고 그것을 영상 서버로 여러 압축으로 바꾼 것(4-2절).
- **이미 이 PC에 있는 공개 견본**(내려받지 않음): 브리지 컨테이너의 pydicom 패키지에 딸린 작은 견본들 — RLE(흑백 16비트 · 컬러 · 2프레임), JPEG(YBR_FULL · YBR_FULL_422), 압축 없는 YBR_FULL_422, JPEG 2000, Big Endian. 4-3절의 실험에 이것을 썼습니다.
- **받고 싶은 공개 견본**(받기 전에 총괄에 알리고, 실장님의 직접 허락): 저장소 `pydicom/pydicom-data`(**MIT 라이선스** — 확인함, 저장소의 LICENSE). 진짜 장비에서 나온 모양의 영상이 있습니다:

| 파일 | 크기 | 무엇을 보려고 |
|---|---|---|
| `OBXXXX1A.dcm` · `_2frame` · `_rle` · `_rle_2frame` | 0.5 · 1.0 · 0.05 · 0.09MB | 초음파, **PALETTE COLOR**, 여러 프레임, RLE |
| `US1_UNCI.dcm` | 0.9MB | 초음파 컬러, 압축 없음 |
| `RG1_UNCR.dcm` · `RG3_UNCR.dcm` | 7.2 · 6.2MB | X-ray, **MONOCHROME1**, 10~15비트 |
| `MR2_UNCR.dcm` | 2.1MB | 16비트, Rescale |
| `JPGLosslessP14SV1_1s_1f_8b.dcm` · `JPEG-LL.dcm` | 0.2 · 0.1MB | 무손실 JPEG |
| `color3d_jpeg_baseline.dcm` · `gdcm-US-ALOKA-16.dcm` | 6.1 · 0.9MB | **초음파 여러 프레임 · JPEG Baseline · YBR_FULL_422** — 동영상 재생의 본보기 |

  합쳐 약 25MB. 시험에만 쓰고 저장소에는 넣지 않습니다. (다른 출처 — DICOM 위원회의 압축 견본 · 장비 회사의 견본 — 은 쓰는 조건을 원문에서 확인하지 못해 후보에서 뺐습니다.)
- **진짜 장비의 영상**은 현지에서 붙인 뒤에야 봅니다 — 그때 「안 열리는 영상」이 나오면 형식을 보고 4-4절의 표에 더합니다.

## 8. 책임 표시

- 창 맨 아래에 **늘**: 「Visionneuse de consultation — non destinée au diagnostic」 / "Viewer for reference — not for diagnosis".
- `README.TXT`에도 같은 말. Weasis가 처음 켤 때 동의 창을 띄우는 것과 같은 취지인데, 우리는 **창을 띄워 누르게 하지 않고** 늘 보이는 한 줄로(받는 사람이 영어 동의 창에서 막히지 않게).
- 「?」 단추: 무엇을 하는 프로그램인지, 누가 만들었는지(병원 이름은 디스크의 영상에서), 진단용이 아님, 마우스 · 키 쓰는 법.

## 9. Weasis 139MB는 무엇으로 이루어졌나

풀어 놓은 폴더를 재 봄(확인함):

| 부분 | 크기 | 무엇 |
|---|---|---|
| `runtime\` | **113MB**(그중 `lib\modules` 한 파일이 88MB) | Java 실행 환경 — Weasis가 자기 것으로 싸 온 것 |
| `app\bundle\` 등 | 26MB | Weasis의 부품들(가장 큰 것: 영상 처리 라이브러리 OpenCV 7.5MB, 3D용 4.3MB) |

- 81%가 Java 실행 환경입니다. 줄이려면 **Java 환경을 작게 다시 만들어야** 하고, 그것은 Weasis의 배포물을 **고쳐서 다시 묶는 일**이라 「그대로 씀」이라는 우리의 선을 넘습니다 → 줄이지 않습니다.
- 그래서 「작은 것이 필요하면 우리 뷰어, 기능이 필요하면 Weasis 그대로」.

## 10. 흔적 · 보안 · 받는 PC

- **쓰지 않음**: 설정 파일 없음(창 크기도 기억하지 않음), 임시 파일 없음(영상은 메모리에서만 — Weasis는 임시 폴더에 사본을 만듦), 레지스트리 없음, 네트워크 없음.
- **메모리**: 큰 필름 한 장(2500×3000, 16비트)이 15MB, 동영상은 푼 프레임을 정해진 양(예: 256MB)까지만 들고 있고 넘으면 다시 풂. Weasis의 0.7~1.5GB와 견주면 가벼움(추측 — 지은 뒤 잼).
- **CD의 프로그램 실행을 막는 병원**: Weasis와 같은 걸림돌입니다 — 그런 곳은 자기 PACS · 뷰어로 `DICOMDIR`을 읽으면 되고, 디스크는 그대로 표준 DICOM 디스크입니다.
- **서명 없는 실행 파일**: 설계안 11절과 같음 — 인터넷에서 받은 파일이 아니므로 SmartScreen 경고가 뜨지 않을 것으로 추측, 백신의 반응은 모름(현지에서 확인).
- **옛 Windows**: Windows 7에는 .NET Framework 4가 따로 깔려 있어야 합니다(없으면 Windows가 「.NET Framework가 필요합니다」라고 알림 — 추측). Windows 8 · 10 · 11은 들어 있음(확인함 — Microsoft의 표).

## 11. 짓는 차례 — 단계마다 무엇이 되나

| 단계 | 짓는 것 | 그때 되는 것 |
|---|---|---|
| **①** 압축 안 된 한 장 영상 | `DICOMDIR` 읽기 · 왼쪽 목록 · 압축 없는 흑백/RGB · 밝기 창 · MONOCHROME1 · 8~16비트 · Rescale · 확대/이동/뒤집기 · 아래 문구 · 반출 프로그램이 `VOIR.EXE`를 만들어 디스크에 넣음 | **X-ray(CR/DR)** 와 압축 없이 온 초음파 정지 영상이 보임. 디스크가 스스로 열리는 모습이 이때 완성 |
| **②** JPEG | 프레임 조각 꺼내기 · Windows의 기능으로 8비트 JPEG 풀기 · YBR · PALETTE COLOR | JPEG로 온 **초음파 정지 영상**(컬러 포함) |
| **③** 여러 프레임 재생 | 프레임 넘기기 · 재생/멈춤/한 장씩 · 빠르기 · 메모리 한도 | **초음파 동영상**(압축 없음 · JPEG) |
| **④** 그 밖의 압축 | 뷰어: RLE 직접 풀기. EMR: 「그 밖」이 섞이면 묶음을 풀어서 내보내기 + 기록. 못 여는 영상의 안내 | 장비가 무엇으로 보내든 디스크가 열림 |
| **⑤** 마무리 | 반출 프로그램: 체크 칸을 「Weasis도 넣기」로, `WEASIS.BAT`, `README.TXT`. 설명서 fr. 진짜 CD 한 장(작은 뷰어 포함) | — |

- 단계마다: 견본 영상으로 영상 서버가 그린 그림과 픽셀을 견줘 확인 → 커밋 → 보고.
- **소스의 크기(추측)**: C# 1,500~2,500줄, 실행 파일 100~300KB.
- 각 단계는 앞 단계 위에 얹습니다. ①만으로도 X-ray 병원에는 쓸모가 있고, ③까지가 실장님이 말씀하신 범위(「초음파 동영상」)입니다.

## 12. 정할 것

**실장님**

| # | 물음 | 추천 |
|---|---|---|
| 가 | 작은 뷰어를 만들지 | **만듦** — 디스크마다 늘 넣음 |
| 나 | Weasis는 「필요할 때 체크」로 남길지 | 남김(+138MB) |
| 다 | 영상 서버가 받는 형식을 좁힐지(4-4절 끝) | **지금은 안 함** — 현지 장비가 무엇을 보내는지 본 뒤에 |
| 라 | 공개 견본 영상(pydicom-data, MIT, 약 25MB)을 시험용으로 받아도 되는지 | 받음 — ①을 시작할 때 파일 이름 · 주소 · 크기를 다시 알리고, 실장님이 PACS 세션 창에 직접 허락 |

**총괄**

| # | 물음 | 추천 |
|---|---|---|
| ㄱ | 이름: 작은 뷰어 `VOIR.EXE`, Weasis를 켜는 파일은 `WEASIS.BAT`로 바꿈 | 그렇게 |
| ㄴ | 뷰어의 소스를 PACS 저장소에 두고(`cd-viewer-src\*.cs` 같은 자리) 반출 프로그램이 그 자리에서 실행 파일로 만드는 것 | 그렇게 — 저장소에 실행 파일을 넣지 않음 |
| ㄷ | 「그 밖의 압축」이 섞인 묶음을 EMR이 풀어서 내보내는 것(④) | 그렇게 |
| ㄹ | 뷰어의 글: 프랑스어 · 영어(Windows 언어를 따름) | 그렇게 |
| ㅁ | 뷰어를 넣은 두 번째 CD 굽기는 ⑤에서 — 작은 뷰어로(필요하면 Weasis도 한 장) | 그렇게 |

## 조사에 쓴 곳

- Orthanc: 임시 서버에서 직접 해 봄(이미지 `orthancteam/orthanc:26.6.1` = Orthanc 1.12.11, 플러그인 gdcm) — `/instances/{id}/modify`의 `Transcode`, `/tools/create-media-extended`의 `Transcode`, 같은 자원을 두 번 적었을 때.
- Windows의 JPEG 풀기: 이 PC(Windows 11)에서 `System.Drawing`(GDI+)과 `PresentationCore`(WIC)로 직접 해 봄.
- 장비: Mindray 「DICOM Conformance Statement for DP10/DP20/DP30 Series」(mindray.com의 PDF, 원문에서 읽음). GE LOGIQ · Voluson의 선언서(gehealthcare.com — 검색 결과로 읽음).
- DICOM 표준: PS3.3 C.8.5.6 US Image Module <https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.8.5.6.html>.
- fo-dicom: <https://github.com/fo-dicom/fo-dicom>(README — MS-PL), NuGet의 `fo-dicom 5.2.6` 명세(.NET Standard 2.0, 딸린 패키지), `fo-dicom.Codecs` 패키지 크기.
- 견본 영상: <https://github.com/pydicom/pydicom-data>(LICENSE — MIT, 파일 목록과 크기). 브리지 컨테이너의 pydicom 2.4.4 패키지에 딸린 견본.
- Weasis의 구성: 풀어 놓은 4.7.3 폴더를 재 봄.
- 실행 파일 만들기: 이 PC에서 PowerShell `Add-Type -OutputAssembly … -OutputType WindowsApplication`으로 해 봄. .NET Framework가 Windows에 들어 있는지는 설계안 11절의 출처.
