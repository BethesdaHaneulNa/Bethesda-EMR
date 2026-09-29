# 시스템 개요

> 베데스다 EMR 전체가 어떻게 생겼는지 한 장으로 봅니다. 모듈별 상세는 `modules/` 아래 각 페이지에 있습니다.
> 이 페이지는 총괄 세션이 관리합니다.

## 1. 무엇인가

마다가스카르 **베데스다 병원**을 위해 만든 무료·비영리 전자의무기록(EMR)입니다.
'행복한 섬김의 열매' 교회가 후원했습니다. 종이 기록에서 막 전산으로 넘어가는 작은 병원이 쓰도록,
꼭 필요한 기능만 담았습니다. 한국어 · 영어 · 프랑스어를 어디서든 바꿔 쓸 수 있습니다.

## 2. 환자가 지나가는 길

```
   접수 ─────▶ 진료 ─────┬─▶ 약국 (조제)
  (환자 등록,   (SOAP, 진단,│
   내원 접수,   처방, 검사·  ├─▶ 임상병리 (검사 결과 입력)
   대기)       영상 오더,   │
              기록지)      ├─▶ PACS (영상 촬영 → 판독)
                          │
                          └─▶ 수납 (청구, 영수증, 미수금)
                                         │
                                         ▼
                                      통계 (내원·매출·약품 사용)

   설정 — 직원·권한, 약품, 오더 코드, 검사 패널, 진료과, 오더 세트, 병원 정보
```

## 3. 구성

| 부분 | 기술 | 위치 |
|---|---|---|
| 화면 | React (nginx가 서비스) | `frontend/` |
| 서버 | Node 20 + Express | `backend/` |
| DB | PostgreSQL 16 | 컨테이너 `bethesda-emr-db`, 볼륨 `pgdata` |
| 영상 (선택) | Orthanc 26.6.1 + 워크리스트 브리지 | **별도 저장소** `C:\Bethesda-PACS-main` |

- 열린 포트는 **9080** 하나입니다. 병원 PC는 브라우저로 `http://<서버 주소>:9080`에 접속합니다. 설치할 것이 없습니다.
- PACS는 웹 뷰어 **9090**, 영상 장비용 DICOM **4242**를 씁니다.
- DB 구조 변경은 `backend/sql/`의 마이그레이션 파일로 하며, 서버가 시작할 때 자동 적용됩니다.
- 날짜만 있는 값(생년월일·내원일·진료일 등 DB `DATE`)은 API에서 항상 `"YYYY-MM-DD"` 문자열로 나갑니다(`backend/src/config/database.js`). `Date`로 바꿔 UTC로 내보내면 마다가스카르 시간(UTC+3)에서 하루 앞당겨지므로, 화면·서버 모두 문자열 그대로 다룹니다.

## 4. 모듈과 권한

화면 7개가 곧 권한 7개입니다. `frontend/src/modules.js`가 기준이며, 여기 추가하면 메뉴·접근 제한·직원 권한 체크박스에 자동으로 나타납니다.

| 모듈 | 경로 | 위키 |
|---|---|---|
| 접수 | `/registration` | [reception](modules/reception.md) |
| 진료 | `/consultation` | [consultation](modules/consultation.md) |
| 수납 | `/payment` | [payment](modules/payment.md) |
| 약국 | `/pharmacy` | [pharmacy](modules/pharmacy.md) |
| 임상병리 | `/lab` | [laboratory](modules/laboratory.md) |
| 통계 | `/stats` | [statistics](modules/statistics.md) |
| 설정 | `/settings` | [settings](modules/settings.md) |
| PACS | (진료·수납 화면 안) | [pacs](modules/pacs.md) |

## 5. 폴더

```
Bethesda-EMR-main/
├─ frontend/src/
│  ├─ pages/          화면 7개 + 로그인
│  ├─ components/     여러 화면이 같이 쓰는 부품 (환자 찾기, 문서 창, 검사 결과, 판독 …)
│  ├─ documents/      인쇄 문서 양식 (수술기록지, 의뢰서, 원외처방전)
│  ├─ i18n/           번역 (ko · en · fr)
│  └─ modules.js      모듈·권한 정의
├─ backend/
│  ├─ src/routes/     API — 모듈마다 하나
│  ├─ src/config/     DB 연결, 마이그레이션 실행기
│  └─ sql/            마이그레이션 (001 ~ )
├─ wiki/              ← 이 위키
├─ server-status.*    서버 상태 창 (15초마다 점검)
├─ verify-backup.ps1  백업 검증
└─ offline/           인터넷 없는 곳에 설치하기
```

## 6. 운영

- **서버 상태 창** — `server-status.bat`을 서버 PC에 띄워 두면 DB·서버·화면·디스크·백업·영상·워크리스트를 15초마다 확인해 한 줄씩 보여줍니다. EMR이 멈춰도 계속 답하도록 EMR을 거치지 않고 직접 확인합니다.
- **백업** — 서버가 매일 정해진 시각(기본 02:00)에 자동 백업하고, 보관 기간(기본 30일)이 지나면 지웁니다.
- **업데이트** — `update.bat`(Windows) · `update.sh`(Linux/NAS): 백업 → 최신판 받기 → 재빌드 → 확인. 마이그레이션은 자동 적용.
- **오프라인 설치** — `OFFLINE-INSTALL.md` 참고. 병원에 인터넷이 없어도 설치할 수 있습니다.

## 7. 버전

- 배포된 최신: **1.4.0** (2026-07-30) — `CHANGELOG.md`
- 개발 중: `develop` 브랜치 — 수술기록지 그림 양식 (`be642c9`), 진료 기록 보호 (`d1f473e`), 날짜 하루 앞당김 수정 (`7ad4387`), 2026-09-29 1차 합침: 약국·설정(백업)·임상병리·접수·통계·PACS(브리지 토큰) 세션 (`f3a5810`). 실장님 PC의 EMR(9080)에 반영됨.
