# PACS 인계 노트

> 형식: [handoff/README.md](README.md) · 새 항목은 **맨 위에** 추가합니다.

## 2026-09-29 — 브리지 토큰 보안 (P-2·P-5), P-1 조치 분담 기록

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
