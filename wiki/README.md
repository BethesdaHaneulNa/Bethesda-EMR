# 베데스다 EMR 위키

> 마다가스카르 베데스다 병원 전자의무기록의 설명서입니다.
> 이 위키는 코드와 함께 저장소에 들어 있어, 코드가 바뀌면 같은 커밋에서 위키도 바뀝니다.

## 처음이라면

1. [시스템 개요](00-overview.md) — 전체가 어떻게 생겼고 환자가 어떤 순서로 지나가는지
2. 맡은 모듈의 페이지 — 아래 목록
3. 코드를 고칠 사람이라면 [세션 작업 규칙](01-working-rules.md)

## 모듈

| 모듈 | 하는 일 | 페이지 | 인계 노트 |
|---|---|---|---|
| 접수 | 환자 등록, 내원 접수, 대기 관리 | [reception](modules/reception.md) | [기록](handoff/reception.md) |
| 진료 | SOAP, 진단, 처방, 검사·영상 오더, 수술기록지·의뢰서 | [consultation](modules/consultation.md) | [기록](handoff/consultation.md) |
| 수납 | 청구, 영수증, 취소·환불·정정, 미수금 | [payment](modules/payment.md) | [기록](handoff/payment.md) |
| 약국 | 원내·원외 조제, 원외처방전 | [pharmacy](modules/pharmacy.md) | [기록](handoff/pharmacy.md) |
| 임상병리 | 검사 결과 입력, 참고치, 이상 표시 | [laboratory](modules/laboratory.md) | [기록](handoff/laboratory.md) |
| 통계 | 내원·매출·미수·약품 사용 (일·월·연) | [statistics](modules/statistics.md) | [기록](handoff/statistics.md) |
| 설정 | 직원·권한, 약품, 오더 코드, 검사 패널, 진료과, 병원 정보, 백업 | [settings](modules/settings.md) | [기록](handoff/settings.md) |
| PACS | 영상 촬영 워크리스트, 영상 보기, 판독 | [pacs](modules/pacs.md) | [기록](handoff/pacs.md) |

## 실장님 결정 기록

- [decisions.md](decisions.md) — 실장님이 정하신 것과 아직 기다리는 것. 결정 세션이 씁니다.

## 운영 문서 (저장소 최상위)

- `README.md` — 설치 시작
- `DEPLOYMENT.md` — 백업, 업데이트, 네트워크 보안, PACS
- `OFFLINE-INSTALL.md` — 인터넷 없는 병원에 설치
- `CHANGELOG.md` — 버전별 변경 내역

## 이 위키를 쓰는 방법

- 모듈 페이지는 각 개발 세션이 씁니다. 목차·개요·작업 규칙은 총괄 세션이 씁니다.
- 각 모듈 페이지의 **2절 「화면 사용법」** 은 병원 직원용 설명서입니다. 나머지는 개발·유지보수용입니다.
- 현지 직원용 프랑스어 사용 설명서는 위키가 채워진 뒤 따로 만듭니다.
