# 외장 USB 백업 시험 순서서 (출발 전, 실장님용)

> 매일 밤 **영상과 EMR 백업을 외장 USB 디스크 하나에** 복사하는 기능을, 진짜 디스크로 한 번 끝까지 해 보는 순서입니다.
> 쓴 사람: PACS 세션 (2026-09-30). 기능 설명은 `wiki/modules/pacs.md` 6.2.
> **이번 고침(디스크가 도중에 빠졌을 때의 안내, 다른 서버로 옮긴 디스크 알아보기)을 총괄이 합친 뒤에** 하세요.

## 무엇을 확인하나

1. 디스크를 백업용으로 준비할 수 있는지
2. 한 번 돌리면 **영상**과 **EMR 백업 파일**이 디스크에 들어가는지
3. 디스크 검사(`-Verify`)가 「이상 없음(VERIFIED)」이라고 하는지
4. 디스크를 뽑아 두면 「디스크 없음」이라고 알려 주고, **EMR은 아무 영향 없이 그대로 도는지**
5. 다시 꽂으면 빠진 것을 이어서 복사하는지

## 준비물

- **외장 USB 디스크 1개** (1~2TB). 안에 지워지면 안 되는 것이 **없는** 디스크. 새 디스크면 가장 좋습니다.
- 서버 PC (이 PC 또는 현지 서버 PC). EMR과 PACS가 켜져 있어야 합니다.
- 이 종이, 펜 (나온 숫자를 적을 곳)

## 걸리는 시간

- 준비 5분, 첫 복사는 영상 양에 따라 몇 분~몇십 분(대략 영상 1GB에 1~2분), 나머지 단계 10~15분.
- 모두 합쳐 **30분~1시간**.

## 이 PC에서 해도 되는 것 / 현지 서버 PC에서만 할 것

| 일 | 이 PC | 현지 서버 PC |
|---|---|---|
| 디스크 준비, 손으로 한 번 복사, 디스크 검사, 뽑고 다시 꽂기 (아래 1~8) | ✅ 해도 됩니다 | ✅ |
| **매일 밤 자동으로 돌게 등록** (`install-image-backup.ps1`) | ❌ **하지 마세요** | ✅ 현지에서 한 번만 |
| 도중에 뽑아 보기 (아래 「해 보고 싶으면」) | 시험용 디스크로만 | 하지 마세요 |

> ⚠ 이 PC에서 해 보면 **이 PC의 진짜 영상과 EMR 기록(환자 정보 전체)이 디스크에 들어갑니다.** 끝나면 그 디스크는 **잠기는 곳**에 두세요. 디스크는 암호화되지 않습니다.

## 시작하기 전에 — 명령 창 여는 법

1. 파일 탐색기에서 PACS 폴더를 엽니다 (이 PC: `C:\Bethesda-PACS-main`, 현지: 설치한 곳, 보통 `C:\Bethesda-PACS`).
2. 위쪽 주소 줄을 한 번 누르고, `powershell` 이라고 쓰고 **Enter**.
3. 파란(또는 검은) 창이 열립니다. 아래 명령을 **한 줄씩 복사해 붙여 넣고 Enter** 를 누릅니다.
4. 명령이 끝나면 다시 `PS C:\...>` 가 보입니다. 그 **바로 위 몇 줄**이 결과입니다.

> 빨간 글씨가 나오거나, 아래 「정상」과 다르게 나오면 **거기서 멈추고** 창의 글자를 사진으로 찍어 총괄에게 보내 주세요.

## 순서

### 1. 디스크 꽂기

1. USB 디스크를 꽂습니다.
2. 파일 탐색기 왼쪽 **내 PC** 에서 디스크의 **드라이브 글자**를 봅니다 (예: `E:`). 종이에 적습니다.

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| 새 드라이브(예: `E:`)가 생김 | 아무것도 안 생김 → 다른 USB 구멍에 꽂아 보고, 그래도 안 되면 |

### 2. 백업 디스크로 준비 (디스크마다 한 번)

`E:` 는 1번에서 적은 글자로 바꿉니다.

```powershell
.\prepare-backup-disk.ps1 -Target E:\
```

| 이렇게 나오면 정상 | 이렇게 나오면 |
|---|---|
| `Ready: E:\ is now the PACS image backup disk.` | — |
| `E:\ is already a PACS backup disk - nothing to do.` | 정상 (이미 준비된 디스크) |
| `E:\ is not empty (N items). If this really is the disk for PACS image backups, run again with -Force.` | 디스크에 다른 파일이 있다는 뜻. **그 파일들이 필요 없는 게 확실할 때만** 끝에 ` -Force` 를 붙여 다시. 모르겠으면 멈추고 총괄에게 |
| `... is the system disk. Use an external disk.` | 글자를 잘못 적었습니다 (C:). 1번으로 |

### 3. 한 번 손으로 복사

```powershell
.\image-backup.ps1
```

처음에는 영상 전부를 복사하므로 오래 걸릴 수 있습니다. 창을 닫지 말고 기다립니다.

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| 끝에서 두 번째 줄 `EMR backups: ok copied=N on disk=N newest=날짜 시각` | `EMR backups: not_found` → EMR 폴더를 못 찾음 |
| 마지막 줄 `finished: ok=True copied=N failed=0 ... emr_backup=ok` | `ok=False` 가 있는 줄 — 뒤의 `error=` 글자를 적어서 |
| N은 숫자 (처음이면 영상 수만큼) | `could not ask Orthanc` → PACS가 꺼져 있음 |

`copied=` 뒤의 숫자 두 개(영상 수, EMR 백업 수)를 종이에 적습니다.

### 4. 디스크 안을 눈으로 보기

파일 탐색기에서 디스크(예: `E:`)를 엽니다.

| 이렇게 있으면 정상 | 이상하면 멈추고 총괄에게 |
|---|---|
| 맨 위에 `BETHESDA-PACS-BACKUP.id` 파일 (**지우지 마세요** — 이것으로 디스크를 알아봅니다) | 없음 |
| `BethesdaPACS` 폴더 안에 `images`, `emr-backups` 폴더와 `state.json` | 폴더가 없음 |
| `images` 안에 숫자와 점으로 된 이름의 폴더들, 그 안에 `.dcm` 파일 (환자 이름은 안 보이는 게 맞습니다) | 비어 있음 (PACS에 영상이 있는데) |
| `emr-backups` 안에 `bethesda_날짜_시각.sql.gz` 파일들 | 비어 있음 |

EMR 백업 개수 맞춰 보기: EMR 폴더의 `backups` 폴더(이 PC: `C:\Bethesda-EMR-main\backups`)를 열어 `bethesda_…sql.gz` 개수를 셉니다. `emr-backups` 의 개수와 **같으면 정상**입니다. (EMR 쪽에 30일 넘은 것이 있으면 디스크에는 그만큼 적을 수 있습니다 — 오래된 것은 옮기지 않습니다.)

### 5. 디스크 검사

```powershell
.\restore-image-backup.ps1 -Verify
```

이름은 「restore」지만 `-Verify` 를 붙이면 **읽기만 합니다** (아무것도 바꾸지 않음).

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| `Checked N files at random: 0 bad.` | `N bad` 에서 N이 0이 아님 |
| `Orthanc holds N images; the disk holds M ...` (M이 N과 같거나 더 큼) | `WARNING: fewer on the disk than in Orthanc` |
| `EMR imaging orders with images recorded: N; of those, missing from Orthanc: 0` | `missing from Orthanc:` 뒤가 0이 아님 → 숫자를 적어서 |
| `EMR database backups on the disk: N; newest bethesda_…, … reads as a complete gzip.` | `DAMAGED` 또는 `none` |
| 마지막 줄 `VERIFIED` | `VERIFIED` 가 없음 |

### 6. EMR 화면에서 보기

1. EMR에 관리자로 로그인합니다.
2. 맨 위 막대의 **작은 동그라미(상태 점)** 를 누릅니다.
3. **영상 백업 (디스크)** 줄을 봅니다.

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| 초록, 「0시간 전 성공 · N GB 남음」 | 노랑·빨강, 또는 「사용 안 함」 |

<!-- 설정 세션이 「EMR 백업 복사」 줄을 넣으면 여기에 추가 -->

### 7. 디스크를 뽑고 돌려 보기 — 「디스크 없음」이 나오는지

1. 화면 오른쪽 아래 작업 표시줄의 USB 그림 → **하드웨어 안전하게 제거** → 그 디스크를 고르고, 「안전하게 제거할 수 있습니다」가 나오면 뽑습니다.
2. 명령 창에서:

```powershell
.\image-backup.ps1
```

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| `finished: ok=False ... error=backup disk not found (is it plugged in?) emr_backup=no_disk` | 다른 글자, 또는 창이 멈춤 |

3. **EMR이 그대로 되는지** 봅니다: 환자 하나를 열어 보고, 아무 화면이나 저장해 봅니다. 평소처럼 되면 정상입니다. (EMR은 자기 백업을 자기 폴더에 계속 만듭니다 — 디스크와 관계없음.)
4. EMR 상태 점 → **영상 백업 (디스크)**: 「**백업 디스크가 꽂혀 있지 않음**」(노랑)이면 정상입니다.

### 8. 다시 꽂고 한 번 더

1. 디스크를 다시 꽂습니다 (드라이브 글자가 바뀌어도 괜찮습니다 — 디스크는 표시 파일로 찾습니다).
2. 명령 창에서:

```powershell
.\image-backup.ps1
```

| 이렇게 나오면 정상 | 이렇게 나오면 멈추고 총괄에게 |
|---|---|
| `finished: ok=True copied=0 failed=0 ... emr_backup=ok` (그 사이 새 영상이 왔으면 copied가 그 수만큼) | `ok=False` |
| EMR 상태 점의 영상 백업 줄이 다시 초록 | 노랑이 그대로 (몇 분 뒤에도) |

3. 5번 검사를 한 번 더 해서 `VERIFIED` 인지 봅니다.

**여기까지 되면 시험 끝입니다.** 종이에 적은 숫자와 함께 총괄에게 「끝」이라고 알려 주세요.

## 해 보고 싶으면 — 복사 도중에 뽑으면?

진짜 디스크로는 **권하지 않습니다** (쓰는 도중에 뽑으면 디스크 자체가 상할 수 있음). 개발 세션이 시험용 폴더로 흉내 낸 결과(2026-09-30, 드라이브 글자를 도중에 없애는 방법):

| 언제 뽑았나 | 그때 나온 것 | 다시 꽂고 돌리면 |
|---|---|---|
| 영상을 복사하는 도중 (12장 중 3~5장 복사됨) | `ok=False`, `backup disk was unplugged during the backup - plug it back in; the next run continues`. EMR 상태 화면은 「백업 디스크가 꽂혀 있지 않음」 | 이미 들어간 영상은 건너뛰고 **나머지만** 복사 → 12장 모두, `ok=True` |
| EMR 백업을 복사하는 도중 | 영상 결과는 `ok=True`(영상은 끝났으므로), EMR 쪽만 `emr_backup=no_disk`와 같은 안내. 디스크에 반쯤 쓴 `.part` 파일 하나가 남음 | `.part` 는 지워지고 EMR 백업을 **처음부터 다시 확인하며** 복사 → `emr_backup=ok`, `-Verify` 이상 없음 |

반쯤 쓴 파일은 끝까지 확인되기 전에는 진짜 이름(`.dcm`, `.sql.gz`)을 받지 않으므로, 망가진 파일이 백업으로 남는 일은 없습니다. 어디까지 복사했는지 기록(`state.json`)도 한 묶음이 다 들어간 뒤에만 앞으로 갑니다.

## 끝나고

- 디스크는 **잠기는 곳**에 둡니다. 이 PC에서 했다면 이 PC의 환자 기록이 들어 있습니다.
- 현지로 **같은 디스크**를 가져가도 됩니다. 새 서버 PC에서 처음 돌 때, 디스크의 기록이 다른 서버 것임을 알아보고 **처음부터 다시 훑습니다** (이미 있는 영상은 건너뜀). 로그에 `the disk's position (change N) is not this Orthanc's ... Starting again from 0` 한 줄이 나오면 그것입니다 — 정상.
  - 영상을 새 서버로 옮길 때도 이 디스크를 씁니다 (`restore-image-backup.ps1`, `wiki/modules/pacs.md` 6.1 순서).
- 현지 서버 PC에서 할 일(현지에서만): 2번(이미 준비된 디스크면 「already」), 그리고 **`.\install-image-backup.ps1`** 한 번 — 매일 밤 02:30 자동 실행 등록. 그다음 날 아침 EMR 상태 점에서 영상 백업이 초록인지 봅니다.
- **달마다** 5번 검사(`-Verify`)를 한 번 하면 좋습니다.

## 막혔을 때 볼 곳 (총괄·개발자용)

- 실행 기록: PACS 폴더의 `logs\image-backup.log`, 마지막 결과 `logs\image-backup-status.json` (개수·공간·오류 글자만, 환자 정보 없음).
- 기능 설명: `wiki/modules/pacs.md` 6.2, 인계 노트 `wiki/handoff/pacs.md`.
