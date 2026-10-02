# 외부 영상 들여오기 — 프로그램이 부르는 EMR API (약속)

> 2026-10-02 · PACS 세션. **Bethesda CD의 「들여오기」를 만드는 세션이 읽는 문서.**
> 서버 코드: `backend/src/routes/pacs.import.js` · 표: `backend/sql/051_pacs_import.sql`(임시 번호) ·
> 설계: [external-images-import-design.md](external-images-import-design.md).
> 격리 스택에서 시험 48개 통과(아래 「확인한 것」). 이 문서의 모양을 바꾸게 되면 총괄에 바로 알립니다.

## 0. 한눈에

```
로그인(지금 그대로)            POST /api/auth/login
⓪ 환자 조회 + 한도            GET  /api/pacs/import/patient?chart_no=26-00001
① 들여올 수 있나(검사마다)     POST /api/pacs/import/check
② 검사 하나 시작              POST /api/pacs/import/begin        → import_id
③ 한 장 올리기(파일 수만큼)    PUT  /api/pacs/import/{import_id}/instance   몸통 = DICOM 파일 그대로
④ 끝내기                      POST /api/pacs/import/{import_id}/finish
⑤ 그만두기                    POST /api/pacs/import/{import_id}/cancel
```

- **검사 하나에 ②→③…→④ 한 벌.** 디스크에 검사가 여럿이면 고른 검사마다 차례로 한 벌씩.
- 머리말: `Authorization: Bearer <로그인에서 받은 토큰>` — 반출과 같음(`EmrClient.Call`).
- 권한: **consultation · payment · registration 가운데 하나**(접수 계정도 됨 — 2026-10-02 결정; 반출은 consultation · payment 그대로). 없으면 403 `{error:"Access denied"}`, 토큰 없음/만료 401.
- 거절의 모양은 반출과 같음: `{ ok:false, code:"…", error:"영어 문장", …덧붙는 값 }`. 프로그램은 `code`로 자기 말(fr/ko/en)을 고름.
  HTTP 상태는 아래 표. 502/503/504는 EMR 앞의 nginx가 「서버가 응답하지 않음」으로 바꿔 보냄(반출과 같음).
- **④가 성공하기 전에는 EMR 어느 화면에도 안 보임.** 끊긴 들여오기는 서버가 치움(⑤를 못 불러도 — 30분 조용하면 저절로).
- 오더 · 진료 · 방문 · 수납 줄은 만들지 않음. 들여온 뒤에는 EMR 「영상/판독」 창의 「외부 영상」 묶음에 나옴.
- 들여온 것을 **빼는 일은 프로그램이 하지 않음**(EMR 「영상/판독」 창에서, 진료 또는 설정 권한 · 사유).

## ⓪ 환자 조회 + 한도 — `GET /api/pacs/import/patient?chart_no=`

반출의 `/api/pacs/export/patient`와 **따로**입니다(그쪽은 우리 검사 목록을 주고, 이쪽은 한도와 이미 들여온 것을 줌).
로그인 뒤 차트번호를 치면 프로그램은 두 길을 다 불러도 되고, 「들여오기」 갈래에 들어갈 때만 이 길을 불러도 됩니다.

받는 것(200):

```json
{ "ok": true,
  "patient": { "id": 1, "chart_no": "26-00001", "last_name": "RAKOTO", "first_name": "Jean", "gender": "M", "date_of_birth": "1985-04-12" },
  "server": "",                      // "" = 영상 서버가 답함 · "NOT_PAIRED" · "UNREACHABLE" → 이 둘이면 들여오기를 시작하지 않음
  "free_bytes": 1012453703680,       // 영상 서버 디스크의 남은 자리. null = 모름(그러면 자리로는 막지 않음)
  "spare_bytes": 5368709120,         // 남겨 둬야 하는 자리(5GB)
  "max_file_bytes": 1073741824,      // 파일 하나의 한도(설정값, 기본 1GB)
  "warn_bytes": 2147483648,          // 검사 하나가 이보다 크면 「오래 걸립니다」 경고(막지는 않음)
  "imported": [ { "id": 7, "study_date": "20040119", "modality": "CT", "description": "…", "institution": "…",
                  "image_count": 1, "bytes": 39206, "imported_at": "2026-10-02T06:16:43.586Z", "imported_by": "…",
                  "came_as": { "patient_id": "1CT1", "patient_name": "…", "birth_date": "…", "sex": "…" },
                  "birth_differed": true, "sex_differed": false, "undrawn": [] } ] }
```

- `gender`는 `M` / `F` / 그 밖(빈 값). `date_of_birth`는 `YYYY-MM-DD` 또는 null.
- `imported`: 이 환자에게 이미 들여온 외부 검사(끝난 것만, 최근 검사 날짜 먼저) — 「이미 N건 들여옴」을 보여 주는 데.
- 거절: 400 `BAD_REQUEST`(차트번호 없음/40자 넘음) · 404 `NO_PATIENT`.

**한도는 여기서만 읽습니다.** 프로그램이 미리 하는 판단:
- 파일 하나가 `max_file_bytes`보다 크면 그 검사는 고를 수 없음(서버도 413으로 거절함).
- 고른 검사의 크기 `bytes`가 `warn_bytes`를 넘으면 경고 뒤 진행.
- `free_bytes`가 null이 아니고 `bytes × 2 + spare_bytes > free_bytes`이면 시작 전에 「영상 서버에 자리가 모자람」(서버의 `NO_ROOM`과 같은 식).

## ① 들여올 수 있나 — `POST /api/pacs/import/check`

보내는 것: `{ "patient_id": 1, "studies": ["<StudyInstanceUID>", …] }` — 디스크에서 읽은 검사 번호들(1~200개, 숫자와 점 · 64자까지).

받는 것(200): `{ "ok": true, "studies": [ { "study_uid": "…", "state": "" }, { "study_uid": "…", "state": "HERE", "imported_at": "2026-10-02" }, … ] }` — 보낸 순서대로.

| state | 뜻 | 프로그램 |
|---|---|---|
| `""` | 들여올 수 있음 | 고를 수 있음 |
| `OURS` | 우리 병원에서 찍은 검사(우리가 구운 CD) — 이미 차트에 있음 | 고를 수 없음 |
| `HERE` | 이 환자에게 이미 들여옴(`imported_at` 날짜) | 고를 수 없음 |
| `OTHER` | **다른 환자** 차트에 들여와 있음(누구인지는 알려 주지 않음) | 고를 수 없음 — 「다른 환자의 디스크가 아닌지 확인」 |
| `BUSY` | 지금 누군가 들여오는 중 | 잠시 뒤 다시 |
| `ON_SERVER` | 영상 서버에 그 번호의 검사가 이미 있음(EMR이 모르는 것) | 고를 수 없음 — 관리자에게 |
| `UNREACHABLE` | 영상 서버가 답하지 않음 | 들여오기 멈춤 |

거절: 400 `BAD_REQUEST` · 404 `NO_PATIENT` · 409 `NOT_PAIRED`.
(①을 건너뛰어도 ②가 같은 검사를 다시 합니다 — ①은 목록에 미리 표시하려는 것.)

## ② 검사 하나 시작 — `POST /api/pacs/import/begin`

보내는 것:

```json
{ "patient_id": 1,
  "files": 26,                 // 이 검사로 올릴 DICOM 파일 수(= 영상 서버에 생길 장수). DICOMDIR은 세지 않음
  "bytes": 34567890,           // 그 파일들의 크기 합
  "source": {                  // 디스크의 파일에 적힌 그대로
    "study_uid": "1.3.6.…",    // StudyInstanceUID (0020,000D) — 꼭
    "patient_id": "1CT1",      // PatientID (0010,0020) — 앞뒤 빈칸 뗀 값, 64자까지. 비어 있으면 ""
    "patient_name": "DOE^John",// PatientName (0010,0010) — ^ 그대로, 200자까지
    "birth_date": "19600101",  // PatientBirthDate — YYYYMMDD 그대로(10자까지), 없으면 ""
    "sex": "M",                // PatientSex(4자까지)
    "accession": "…",          // AccessionNumber(64자까지)
    "institution": "…",        // InstitutionName(200자까지)
    "study_date": "20040119",  // StudyDate — YYYYMMDD 그대로
    "description": "…",        // StudyDescription(200자까지)
    "modality": "CT"           // 종류(16자까지). 시리즈마다 다르면 "CT/SR"처럼 이어서
  },
  "confirm": { "birth_differs": false, "sex_differs": false }   // 사람이 「그래도 같은 환자」라고 누른 것. 로그 · 화면에 남음
}
```

받는 것(200): `{ "ok": true, "import_id": 12, "study_uid": "1.2.826.0.1.3680043.9.7308.12.…", "accession_no": "EXT-12" }`
(`study_uid` · `accession_no`는 우리 서버에서 그 검사가 갖게 되는 번호 — 프로그램은 `import_id`만 쓰면 됨.)

거절:

| HTTP | code | 뜻 |
|---|---|---|
| 400 | `BAD_REQUEST` | files가 1~100000이 아님, bytes가 수가 아님, study_uid가 번호 꼴이 아님 |
| 404 | `NO_PATIENT` | 그런 환자 없음 |
| 409 | `NOT_PAIRED` | 영상 서버가 EMR과 짝이 안 맞음 |
| 409 | `OURS` `HERE` `OTHER` `BUSY` `ON_SERVER` `UNREACHABLE` | ①의 state와 같음(답에 `state`, HERE면 `imported_at`도) |
| 409 | `NO_ROOM` | 자리 모자람 — 답에 `free_bytes`, `needed_bytes` |

**중요 — ③에서 서버가 장마다 다시 봄**: 올라온 파일의 StudyInstanceUID가 `source.study_uid`와, PatientID(빈칸 뗀 값)가
`source.patient_id`와 같아야 합니다. 그래서 한 검사 안에서 PatientID가 파일마다 다른 디스크는 그 파일이 `NOT_OF_STUDY`로
거절됩니다(그런 검사는 들여오지 않는 것이 맞음).

## ③ 한 장 올리기 — `PUT /api/pacs/import/{import_id}/instance`

- **몸통 = DICOM 파일 그대로**(디스크의 파일 바이트, Part 10 — 128바이트 + `DICM` 머리 포함). 묶거나 base64로 바꾸지 않음.
- 머리말: `Authorization: Bearer …`, `Content-Type: application/dicom`, `Content-Length`(권장 — 있으면 한도를 넘는 파일을 받기 전에 거절).
- **한 번에 한 장, 차례로.**(동시에 둘까지는 괜찮지만 이득이 작음.) 큰 파일은 오래 걸림 — 프로그램의 시간 제한은 넉넉히(서버 쪽 길은 15분).
- 시작한 계정만 올릴 수 있음.

받는 것(200): `{ "ok": true, "received": 7, "again": false }`
- `received`: 지금까지 이 들여오기로 서버에 선 장수. `again: true` = 같은 영상을 또 보냄(한 번만 셈) — **실패한 장을 다시 보내는 것은 안전**.

거절:

| HTTP | code | 뜻 | 프로그램 |
|---|---|---|---|
| 404 | `NOT_FOUND` | 그런 들여오기 없음 | 멈춤 |
| 409 | `CLOSED` | 이미 끝났거나 취소됨(답에 `state`) | 멈춤 |
| 403 | `NOT_YOURS` | 다른 계정이 시작한 것 | 멈춤 |
| 413 | `TOO_BIG_FILE` | 파일 하나 한도 넘음(답에 `max_file_bytes`) | ⑤ 부르고 알림 |
| 409 | `NOT_DICOM` | 영상 서버가 받지 않음(DICOM이 아님 · 깨짐) | ⑤ 부르고 알림(검사가 온전히 못 들어옴) |
| 409 | `NOT_OF_STUDY` | 알린 검사 · 환자의 파일이 아님 | ⑤ 부르고 알림 |
| 409 | `CHANGE_FAILED` | 영상 서버가 환자번호를 바꿔 넣지 못함 | ⑤ 부르고 알림 |
| 409 | `UNREACHABLE` `NOT_PAIRED` | 영상 서버가 답하지 않음 | 몇 번 다시 해 보고, 안 되면 ⑤(⑤는 서버가 돌아온 뒤 치움) |

(DICOM이 아닌 파일 — README, exe, JPG — 은 프로그램이 **보내지 않아야** 합니다: `files`에 세지도 않고. 뷰어의 `Disc`/`Dicom` 읽기로
`DICM` 머리와 StudyInstanceUID가 읽히는 파일만.)

## ④ 끝내기 — `POST /api/pacs/import/{import_id}/finish` (몸통 없음)

서버가 영상 서버의 장수를 세어 `files`와 맞는지 보고, 맞으면 한 번에: 들여오기 = 끝남 + 변경 이력 한 줄(`pacs.images.import`).

받는 것(200): `{ "ok": true, "import_id": 12, "images": 26, "undrawn": [] }`
- `undrawn`: 영상 서버가 그림을 못 그리는 시리즈의 이름들(드문 압축). 들어오기는 했음 — 「뷰어에서 안 보일 수 있음」을 알림.

거절:

| HTTP | code | 뜻 |
|---|---|---|
| 409 | `INCOMPLETE` | 장수가 안 맞음 — 답에 `on_server`, `received`, `announced`. 빠진 장을 다시 보내고 ④를 다시, 또는 ⑤ |
| 409 | `UNREACHABLE` `NOT_PAIRED` | 영상 서버가 답하지 않음 — 잠시 뒤 ④를 다시 |
| 500 | `NOT_LOGGED` | 변경 이력을 못 씀 — 아무것도 차트에 안 들어감. ④를 다시 또는 ⑤ |
| 409 / 404 / 403 | `CLOSED` `NOT_FOUND` `NOT_YOURS` | ③과 같음 |

## ⑤ 그만두기 — `POST /api/pacs/import/{import_id}/cancel`

보내는 것: `{ "reason": "…" }`(없어도 됨, 200자까지 — 표에만 남음).
받는 것(200): `{ "ok": true, "state": "rolled-back" }` — 올린 것을 영상 서버에서 다 지웠음.
`"state": "cleanup-pending"` — 영상 서버가 답하지 않아 아직 못 지움(서버가 5분마다 다시 치움). 프로그램에는 둘 다 「취소됨」.
거절: `CLOSED`(이미 끝남 — 끝난 것은 EMR에서 「차트에서 빼기」) · `NOT_FOUND` · `NOT_YOURS`.

- 사람이 「취소」를 누르면: 올리던 장을 끊고 ⑤.
- 프로그램이 그냥 닫히거나 PC가 꺼지면: 30분 뒤 서버가 저절로 치움. 그 사이 같은 검사를 다시 들여오려 하면 `BUSY`.

## 프로그램이 지킬 순서(권장)

1. 로그인 → 차트번호 → ⓪. `server`가 비어 있지 않으면 들여오기 갈래는 「영상 서버가 응답하지 않음」.
2. 폴더(CD/USB) 고름 → 디스크 읽기(검사마다: 번호 · 날짜 · 종류 · 설명 · 장수 · 크기 · 환자 이름/생일/성별 · 병원).
3. ①로 검사마다 상태 → 목록에 표시.
4. 검사를 고름 → 「디스크의 이름 ○○○ / 우리 차트 △△△ — 맞습니까?」(생일 · 성별이 다르면 빨갛게, 「그래도 맞다」를 눌러야 → `confirm`).
5. 고른 검사마다 ② → ③ × 장수(진행 표시 = `received / files`) → ④. 한 검사가 실패하면 그 검사는 ⑤, 다음 검사로 갈지 사람에게 물음.
6. 끝: 「N건 들여옴 — EMR의 영상/판독에서 보입니다」.

## 서버가 영상에 하는 일(프로그램은 파일을 고치지 않음)

올라온 파일마다 Orthanc가: PatientID · PatientName · 생일 · 성별 = **우리 차트 것**, StudyInstanceUID = 새 번호,
AccessionNumber = `EXT-<n>`, 원래 번호 · 이름은 OtherPatientIDs / OtherPatientNames에. **그림 · 압축 · 시리즈/영상 번호 · 병원 · 날짜는 그대로.**

## 확인한 것(격리 스택, 2026-10-02 — 시험 48개 통과)

접수 계정(payment)으로 한 장 들여오기 → 영상 서버에 우리 번호 · 이름으로, 그림 바이트 같음 · ④ 전에는 목록에 없음 ·
오더/방문/진료/수납 줄 0 · 5장 7.2MB(1MB 넘는 파일, nginx 거쳐) 0.7초 · 같은 파일 두 번 = 한 번 ·
다른 검사 파일/DICOM 아닌 파일 거절 · 다른 계정 거절 · 장수 모자란 ④ 거절 · ⑤ 뒤 서버에 남는 것 없음 ·
45분 조용한 것 저절로 치움 · 영상 서버가 꺼졌을 때 `UNREACHABLE` → 돌아온 뒤 치움 · 파일 한도 · 자리 모자람 ·
같은 디스크 다시 = `HERE`, 다른 환자 = `OTHER`.
**확인 못 한 것**: 프로그램(C#)에서 부르는 것 자체, 진짜 다른 병원 디스크, 1GB에 가까운 파일 하나.
