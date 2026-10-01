# 영상이 있는 하루 — 통합 시험 2026-09-30

> 통합 시험(1·2·3차, [2026-09-29](integration-test-2026-09-29.md) · [2026-09-30](integration-test-2026-09-30.md))이 PACS가 없어 하지 못한 「영상 이미지가 실제로 있는 경우」. **보고 전에는 코드를 고치지 않았습니다**(PACS 몫은 이 보고 뒤에 고침 — 맨 아래 「보고 뒤에 고친 것」).
> 시험한 사람: PACS 세션 · 보고 받는 곳: 총괄
> **이름이 바뀐 것 (2026-10-01)**: 이 기록에서 «Compte-rendu» 목록·단추라고 쓴 것(②·⑨)은 지금 화면에서 **🩻 Imagerie (영상/판독)** 입니다. 영상 창 오른쪽의 판독 칸 «Compte-rendu»는 그대로. 기록은 시험한 날의 화면 그대로 둡니다.

## 조건

| 항목 | 값 |
|---|---|
| 코드 | EMR `develop` `33a81d2`(PACS 세션 `session/pacs`에 ff), PACS `main` `6f5c871` |
| 스택 | EMR 격리 `bethesda-s-pacs` 9188, **새 DB**(`down -v` → `up --build`, 마이그레이션 37개, 배포 스크립트 `index-D4Mxs4TN.js`). PACS 격리 `bethesda-s-pacs-pacs` 웹 9198 · DICOM 11298(둘 다 127.0.0.1), **빈 볼륨**(`down -v`). 실행 중 EMR(9080)·PACS(`bethesda-pacs`, `bethesda-worklist-bridge`)·4242·9090은 건드리지 않음 |
| 짝 맞춤 | 시험용 `.env` 사본에 `pair-with-emr.ps1 -DbContainer bethesda-s-pacs-db -NoRestart` → 격리 브리지만 다시 만듦. 설정 → Flux d'ordres: `orthanc_url` `http://host.docker.internal:9198`, Host `host.docker.internal`, Port 11298 |
| **장비 대신** | 임시 Orthanc 컨테이너 `bethesda-s-pacs-device`(AET `XRAY01`, 호스트 포트 없음)를 **장비**로 씀. 이 컨테이너가 격리 PACS의 DICOM 포트 11298에 **진짜 DICOM으로** 워크리스트 C-FIND, 영상 C-STORE. 영상 파일은 워크리스트 답의 환자·검사번호·Study UID로 만든 256×256 시험 그림(pydicom). 모든 장비 흉내 = `device_sim.py`(세션 임시 폴더) |
| 계정 | 처음 설정 `admin` + 의사 `imdoc`(RABE Hery, GEN, 진료) + 접수·수납 `impay`(RASOA Lalao). API로 만듦. 비밀번호는 세션 임시 파일에만 |
| 환자(가짜) | A = RAKOTO Jean 26-00001, B = RASOA Marie 26-00002. 방문은 API로 접수 |
| 화면 | 1366×768, 프랑스어. 대부분 **어두운 화면**, 판독 목록·영상 창·취소 카드는 **밝은 화면**도 |

## 한 줄 결론

**영상이 있는 하루가 처음부터 끝까지 막힘 없이 돕니다** — 오더 → 장비 목록(진짜 C-FIND) → 영상 전송(진짜 C-STORE) → 약 1분 뒤 「Réalisé」·「N image(s) reçue(s)」·장비 목록에서 빠짐 → 로그인 없는 영상 창 → 판독 → 세 가지 경고 → 취소·판독 거절·수납 정정 → 짝 풀림 안내·복구 → 영상 백업·검사·상태 화면.
A(배포 전에 꼭)는 **없음**. B는 둘: 진료 화면에서 영상 오더를 낸 직후 「Envoyé」가 안 보임(진료), 영상 창 주소에 다른 환자의 검사 번호를 넣으면 설명 없는 검은 화면(PACS — 보고 뒤 고침).

## 단계별

| 단계 | 한 것 | 화면에 뜬 것 | 설명서(`manual-fr/pacs.md`)와 다른 곳 | 막힌 곳 |
|---|---|---|---|---|
| ① 영상 검사 내기 | 의사: A에게 X1 Chest PA · X2 Chest Lat(CR), S1 SONO(5) · S5 Liver US · S2 Carotid US(US) — 입력란에 `Chest`·`X2`·`SONO`·`Liver US`·`Carotid` + Entrée. B에게 X1 | 검색 목록 «CR X1 Chest PA WL», «CR X2 Chest Lat WL». 줄마다 **🖼 만 보이고 「Envoyé」 없음**. 40초 기다려도 그대로 → 환자를 다시 열면 «🖼 Envoyé». DB는 처음부터 `sent`·`scheduled` | §1-3 «La colonne de droite … montre **Envoyé**» — 다시 열기 전에는 안 보임 | 없음 |
| ① 장비 목록 | 장비(XRAY01)가 C-FIND | 6줄: `260930-1…6` · 26-00001/26-00002 · RAKOTO^Jean / RASOA^Marie · CR/US · 검사 이름. 브리지 «synced 6 worklist entries» | 없음 | 없음 |
| ② 영상 보내기 | 장비가 C-STORE: 260930-1(2장)·-3(3장)·-6(B, 1장) 정상 | 보낸 뒤 **약 63초**에 6건 모두 도착 기록(`completed`, `patient_check=match`). 진료 줄 «Réalisé», Compte-rendu 목록 «2 image(s) reçue(s)»·«3 image(s) reçue(s)». 마지막 도착 뒤 **15초 안에 장비 목록이 빔** | 없음 («Une à deux minutes») | 없음 |
| ③ 영상 창·판독 | Chest PA 🖼 | **로그인 묻지 않음**, 시작 안내 상자 없음, 검은 화면 없음(그림 570×603), 왼쪽 위 빨간 «For patients, researchers and quality assurance. Not for diagnostic usage.», 시리즈 «#1 - 1 · #2 - 1». 판독 입력 → **💾 Enregistrer** → 알림 창 «Compte-rendu enregistré ✓», 위에 «Lu par: RABE Hery · 2026-09-30» | 설명서에는 알림 창 얘기 없음(문제 아님) | 없음 |
| ④ 경고 셋 | 장비: 260930-2 → **다른 환자**(26-00002 RASOA^Marie), 260930-4 → **환자번호 없음**, 260930-5 → **장비가 제 Study UID** | 목록·영상 창 모두 🟥 «Les images sont au nom de « 26-00002 RASOA Marie », qui ne correspond pas …», 🟧 «Les images ne portent aucun numéro de patient. …». 제 UID: **accession으로 연결**(69초), 목록에 «L'appareil a donné son propre numéro d'étude à ces images ; elles ont été liées …», 영상 창은 장비의 UID로 열림(시리즈 2개). 영상 창 머리에는 이 줄이 **없음**(빨강·노랑은 있음) | 없음 | 없음. 참고: 장비가 한 검사를 **Study UID 둘**로 보내면(시험 도구 실수로 재현) 브리지가 «more than one study carries accession …; not linking it» — 설계대로 연결 안 함, 「Images en attente」로 남음 |
| ⑤ 취소 | 수납: 175 000 Ar 받음(R-…-0001) → 의사: SONO(5)(영상 3장) ✕ → 묻는 창 «« SONO(5) » a déjà un compte-rendu ou un examen réalisé …», 이유 «Demandé par erreur» → 수납 | 진료 줄 **⊘ 회색·줄긋기 «Annulé»**. 영상 창 «⊘ Images d'une demande annulée. … — Motif : Demandé par erreur», 영상은 보임(시리즈 3), **판독 칸 없음**, API로 판독 저장 → 409 «Imaging order was cancelled». 수납 «Correction · À rembourser 50 000 Ar», «Ce qui change: SONO(5) (annulé) 1 → 0 −50 000», «Rendez 50 000 Ar au patient.» → R-…-0001 `cancelled`, R-…-0002 `paid` 125 000 | 없음 | 없음 |
| ⑤′ 쓰는 도중 취소 | B의 Chest PA 영상 창에서 판독을 쓰는 동안 다른 곳에서 취소 → Enregistrer | 알림 창 «Cet examen d'imagerie a été annulé en consultation : le compte-rendu ne peut pas être enregistré.», **쓴 글자는 칸에 남음**, 머리가 «⊘ … annulée»로 바뀜 | 없음(메시지 표 그대로) | 없음 |
| ⑥ 시간 끝 | 서명은 맞고 만료된 쿠키를 만들어(격리 API 컨테이너의 서명 함수) 영상 창 주소로 | 페이지 401 «La session d'affichage a expiré : fermez cette fenêtre et rouvrez l'image.»(ko·en 함께), 데이터 401 | 없음 | 없음. 브라우저에서 30분을 실제로 기다리지는 않음 |
| ⑥ 남의 검사 | A의 영상만 연 의사가 주소창에 **B의 Study UID**로 `…/index.html?study=…` | 데이터는 **403**(새는 것 없음). 화면은 **검은 바탕에 작은 점 하나** — 아무 설명 없음 | 설명서에 없는 경우 | 없음(보고 뒤 고침 — 아래) |
| ⑦ 짝 풀림 | 격리 DB의 `orthanc_password` 비움 → Chest PA 🖼 | 영상 칸에 «Le serveur d'images n'est pas encore relié à ce dossier : l'administrateur doit lancer **pair-with-emr.ps1** dans le dossier du PACS.»(ko·en 아래), 판독 칸은 그대로 씀 | 없음 | 없음 |
| ⑦ 복구 | 시험용 `.env`로 `pair-with-emr.ps1 -NoRestart` → 격리 브리지만 다시 만듦 | «Paired … The EMR can now show images without a login.» → 같은 창 다시 열면 영상(시리즈 2) | 없음 | 없음 |
| ⑧ 영상 백업 | `image-backup.ps1`(시험 폴더를 디스크로, `-EmrPath` 격리 EMR 폴더, 격리 EMR에 보고) | «EMR backups: ok copied=2 …», «finished: ok=True copied=11 failed=0 emr_backup=ok» — ②·④의 영상 **11장 · 검사 6개** 모두. `-Verify`: 11장 0 bad, Orthanc 11 = 디스크 11, «EMR imaging orders with images recorded: 6; … missing from Orthanc: 0», EMR 백업 2개 완전, **VERIFIED**. 상태 점: «Sauvegarde des images — Réussie il y a 0 h · 97.5 Go libres», «Copie des sauvegardes de l'EMR (disque externe) — Copiée il y a 0 h · 2 sur le disque (dernière 2026-09-30 02:55)». 디스크 없이 → 두 줄 «Disque de sauvegarde absent» · «Disque externe absent» | 없음 | 없음 |
| ⑨ 목록 | 진료 «Compte-rendu», 수납 «Compte-rendu» | 진료: 5줄 최근 것부터, 도착·경고·accession 줄·판독·취소(«Annulé · 2026-09-30 — Motif : Demandé par erreur»). 수납: 같은 내용, **🖼 Voir image 없음**(읽기만) | 없음 | 없음 |
| 밝은 화면 | ☀ Clair: 판독 목록, Chest Lat 영상 창 | 경고 상자·글자 잘 보임. 영상 칸은 두 화면 모두 검정(Stone). **취소된 판독 카드**(투명도 0.6) 글자 대비: 밝은 **2.5–3.0**, 어두운 **2.9–4.4**(기준 4.5) | — | — |

## 고칠 것 — 세션별

순위: **A** 배포 전에 꼭 · **B** 헷갈림·실수 위험 · **C** 문구·모양

| 순위 | 세션 | 무엇 | 어디서 |
|---|---|---|---|
| — | — | **A 없음** | |
| B | 진료 | 영상 오더를 낸 직후 WL 칸에 🖼 만 있고 **「Envoyé」가 안 보임** — 40초 넘게 그대로, 환자를 다시 열어야 보임(`orderStatus`가 `worklist_sent_at`을 보는데 추가 직후 응답·목록 갱신에 그 값이 없는 듯). 의사가 「장비로 안 갔다」고 여길 수 있음. 설명서 §1-3과 다름 | ① |
| B | **PACS** | 영상 창 주소에 이 직원이 열지 않은 검사 번호 → **설명 없는 검은 화면**(데이터는 403으로 막힘) | ⑥ — **보고 뒤 고침** |
| C | **PACS**(+디자인) | 취소된 판독 카드를 투명도 0.6으로 흐리게 → 글자 대비 밝은 2.5–3.0, 어두운 2.9–4.4. 디자인 3.3.1 「취소됨을 투명도로 나타내지 않음」 | 밝은 화면 — **보고 뒤 고침**(총괄 할 일 2) |
| C | 진료 | 영상 창 머리에 「검사 번호로 연결됨」 줄이 없음(목록에는 있음). `viewer-url`의 `images.linked_by`가 `'accession'`이므로 같은 줄을 넣을 수 있음 | ④ |
| C | 진료 | 영상 오더 줄의 **Unité** 칸에 촬영 부위(CHEST·ABDOMEN·LIVER·CAROTID)가 잘려 «CHES»·«ABDO»로 보임 — 칸 이름(Unité)과 뜻이 다름 | ① |
| C | 진료 | 판독 저장이 **알림 창**(«Compte-rendu enregistré ✓», 눌러야 닫힘) — 다른 화면의 저장은 잠깐 뜨는 알림 | ③ |
| C | 설정 | 상태 점의 «97.5 Go libres» — 프랑스어 소수점은 쉼표(«97,5 Go») | ⑧ |
| 관찰 | PACS | 상태 점 «dernière 2026-09-30 02:55»는 **파일 이름의 시각**(EMR 컨테이너 시간대). 이 PC(한국 시간)에서는 파일이 실제로 쓰인 08:55와 6시간 다름 — 현지 PC는 같은 시간대라 같아짐(위키 6.2) | ⑧ |

설명서 쪽:
- `manual-fr/pacs.md` §1-3 «montre **Envoyé**» — 진료가 고치면 그대로, 아니면 «(rouvrez le patient pour voir Envoyé)» 한 줄.
- `manual-fr/pacs.md` 메시지 표 — 남의 검사 주소에 대한 새 안내(PACS 고침)를 한 줄 더함.

## 하지 않은 것 · 한계

- **진짜 장비**: 장비 흉내는 Orthanc를 장비 삼아 진짜 DICOM(C-FIND·C-STORE)으로 했지만, 실제 CR·초음파 장비의 메뉴·압축 전송(JPEG 등)은 장비 설치 날.
- 서버 상태 창(`server-status.bat`): 실행 중 컨테이너 이름을 직접 보므로 격리 스택에서는 돌리지 않음 — 문구는 [usb-backup-rehearsal.md](usb-backup-rehearsal.md) 6번.
- `px_noStudy`(워크리스트로 안 간 영상 오더): 이번에는 모든 영상 오더가 워크리스트로 감.
- 브라우저에서 30분을 실제로 기다리기 — 만료된 쿠키를 만들어 확인.
- 대비는 취소된 판독 카드만 쟀음(나머지 화면은 디자인 세션의 전체 점검 범위).
- 스택은 보고 뒤 내림(장비 컨테이너 지움).

## 보고 뒤에 고친 것 (PACS 몫, 같은 날)

| 무엇 | 고친 뒤 | 확인 |
|---|---|---|
| 남의 검사 주소 → 설명 없는 검은 화면 (B) | 영상 창 페이지(`index.html`)가 쿠키에 없는 검사로 열리면(또는 `?study=` 없이) 403 안내 쪽: «Cette image n'a pas été ouverte depuis une demande d'imagerie. Ouvrez-la avec le bouton 🖼 dans l'écran Consultation.»(ko·en 아래). 데이터는 전처럼 403 | 격리 9188: 남의 검사 페이지 403 안내 · `?study=` 없음 403 안내 · 자기 검사 페이지·데이터 200 · 남의 데이터 403 · 목록 403 · 정적 파일 200 · 쿠키 없음 401 · POST 405 · 경로 우회 400 · 수납 `viewer-url` 403 |
| (같이) 비활성·권한 없는 계정의 영상 창 → JSON 글자 | 페이지면 안내 쪽: «Ce compte ne peut plus ouvrir les images (compte désactivé ou sans accès à la consultation). Prévenez l'administrateur.» | 비활성 → 30초 뒤 안내 쪽, 되살리면 30초 뒤 다시 열림(계정 확인 캐시 30초 — 설계대로) |
| (같이) 안내 쪽의 영어 줄 `#64748b`(검정 위 4.4) | `#8290a3`(디자인 `--viewer-text`와 같은 값) | — |
| 취소된 판독 카드의 투명도 0.6 (C, 총괄 할 일 2) | 투명도 없음. 회색 글자(`--text-3`) · 줄 그은 이름 · 회색 종류 꼬리표 · 「Annulé」 꼬리표 · **점선 테두리** | 대비 밝은 4.7–8.3, 어두운 5.6–8.3(전: 2.5–3.0 / 2.9–4.4). 1366×768 두 화면에서 눈으로도 |

영상 창을 연 뒤 다섯 검사보다 많이 열면 쿠키에서 가장 옛 검사가 빠짐(설계, 최근 5개) — 그 검사의 **옛 탭**을 다시 불러오면 이제 위 안내가 뜸(전에는 검은 화면). 🖼 로 다시 열면 됨.
