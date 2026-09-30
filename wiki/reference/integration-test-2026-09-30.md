# 다시 통합 시험 2026-09-30 — 고친 곳 확인 + 1차에서 하지 않은 것

> 배포 전 두 번째 점검. **코드는 고치지 않았습니다.** 시나리오: [integration-test-2-scenario.md](integration-test-2-scenario.md). 1차 결과: [integration-test-2026-09-29.md](integration-test-2026-09-29.md).
> 시험한 사람: 접수 세션 · 보고 받는 곳: 총괄

## 조건

| 항목 | 값 |
|---|---|
| 코드 | `develop` `764eca7` (coordinator.md 「✅ 고친 것 모두 합침」) |
| 스택 | 격리 스택 `bethesda-s-reception`, 포트 9181, **새 DB**(`down -v` → `up --build`). 마이그레이션 37개(마지막 `037_design_staff_theme.sql`), 약 126개(가져온 MED 101개 활성). 운영 9080은 건드리지 않음 |
| 배포본 | `curl /` → `assets/index-CBx4JT8l.js`, `Cache-Control: no-cache`. 브라우저가 연 스크립트도 같은 이름 |
| 계정 | 처음 설정으로 관리자 `admin` + 의사 `hrabe`(GEN, 진료+약국) + 간호사 `vrasoa`(접수+약국+검사실). 이번에는 계정을 API로 만듦(1차에서 설정 화면으로 확인한 부분이라). 비밀번호는 OS 임시 폴더에만 |
| 화면 | 1366×768. **1부는 어두운 화면**, 2부 E는 밝은 화면 + 어두운 화면 둘 다. 언어 프랑스어, 2부 D만 한국어 |
| 환자(가짜) | A = RAKOTO Jean 26-00001(1차와 같은 하루), B = RASOA Marie 26-00002(지난 날 방문), C = RANDRIA Paul 26-00003(한국어) |
| 대비 | `audit-in-browser.js`와 같은 계산 + **부모 투명도까지 곱함**, 꺼진 단추·장식 이모지 제외, 4.5(큰 글자 3) |

## 한 줄 결론

**1차에서 나온 것은 거의 다 고쳐졌고, 막힌 곳은 없습니다.** 돈은 하루 끝까지 1 Ar까지 맞습니다(아래 표).
새로 찾은 것 중 A(배포 전에 꼭)는 **없음**. B는 셋입니다.
- 접수의 성별 칸이 키보드로 안 됨
- 방문 고르기 창에서 같은 날 두 방문이 똑같이 보임 — 둘 다 접수 몫
- 수납의 «Remplacé» 영수 카드 글자가 기준보다 조금 흐림

## 돈 — 실제 = 수납 Caisse du jour = 통계 Caisse

| 시점 | 실제로 오간 돈 | 수납 «Caisse du jour» | 통계 «Caisse» |
|---|---|---|---|
| 부분 수납 30 000 뒤 | +30 000 | Encaissé +30 000 · Rendu −0 · Net 30 000 | — |
| 미수 수납 17 300 뒤 | +47 300 | +47 300 · −0 · 47 300 | — |
| 추가 3 000 뒤 | +50 300 | +50 300 · −0 · 50 300 | — |
| 정정 −3 000 뒤 | 47 300 | +50 300 · −3 000 · 47 300 | — |
| 검사 취소 정정 −8 000 뒤(**1부 끝**) | **39 300** | +50 300 · −11 000 · **39 300** | Entrées +50 300 · Sorties −11 000 · **39 300** ✅ |
| 지난 날 방문 11 200 뒤 | 50 500 | +61 500 · −11 000 · 50 500 | — |
| 서류비 5 000 뒤 | 55 500 | +66 500 · −11 000 · 55 500 | — |
| 한국어 환자 27 900 뒤(**하루 끝**) | **83 400** | 오늘 금고 들어옴 +94,400 · 나감 −11,000 · **83,400** | Caisse **83 400** · 과별·의사별(영수 기준) 83 400 ✅ |

- 어제(2026-09-29) 통계: 방문 2(Suivi 1 · Sans frais 1), Caisse 0 — 어제 방문의 돈은 오늘 받은 날로 잡힘(설명서대로).

## 1차 항목 — 고쳐짐 / 남음

| # | 1차에서 본 것 | 이번에 본 것 | 결과 |
|---|---|---|---|
| A1 | 빈 원외 처방전에 번호 | 모두 Interne면 미리보기 «Aucune ordonnance externe…», **Émettre 꺼짐**. Externe 한 줄이면 D26-00001 정상 | ✅ 고쳐짐 |
| A2 | 1366 수납 화면 잘림 | 문서 1366×768 딱 맞음, 윗줄 한 줄, 합계·Exact~50 000 모두 보임 | ✅ |
| A3 | 받아 간 약 반품 길 없음 | 결정(반품 없음). 진료에서 🔒 Délivré, 수납·약국 설명서에 문구 있음 | ✅ 결정대로 |
| B1 | 미수 수납 뒤 옛 영수 «partiel · Impayé» | R-0001 «**Reporté** → solde réglé sur le reçu R-0002», Impayé 0 Ar | ✅ |
| B2 | 바뀐 영수가 «annulé», 숫자·목록 다름 | Payé aujourd'hui (1) + «▸ Annulés / remplacés (3)» → 셋 모두 «**Remplacé** → remplacé par R-0004» | ✅ |
| B3 | 정정 화면이 무엇이 빠졌는지 말 안 함 | «Ce qui change: PROFEIN 3 flacons → 2 flacons −3 000», «Fasting Glucose (annulé) 1 → 0 −8 000» | ✅ |
| B4 | Journal 정정 줄에 영어 | «Statut du paiement: partiel, payé, payé → payé», «— Remboursement». refund/paid 없음 | ✅ |
| B5 | 가져온 메모에 한국어 | «650 gél. ≈ 650 ; quantité importée : 2000», «79 fl. ≈ 79 ; …» | ✅ |
| B6 | 비활성 약만 담은 약속처방 표시 없음 | 목록에 «⚠ 2 médicament(s) absent(s) de la liste» | ✅ |
| B7 | 검사실 저장 단추 잘림 | 스크롤 없이 보임, 저장 뒤 «✓ Enregistré et terminé: CBC, Fasting Glucose»가 **남아 있음** | ✅ |
| B7b | (새) 설정 Items de test 저장 | CBC «▸ Par sexe et âge» 4개 연 뒤 칸 안 스크롤로 **Sauver**(y 931 → 728–761) 누를 수 있음, 문서 768 | ✅ |
| B7c | (새) 약국 환자 고른 상태 | «✓ Terminer délivrance» 위(80–116)·아래(716–758) 모두 화면 안, 재고 탭도 768 | ✅ |
| B8 | 처방 표 열이 움직여 입력이 딴 칸으로 | 캡처 한 장의 좌표로 Amlodipine 1·1·30·QD 네 칸 모두 제자리 | ✅ |
| B9 | 대기열 서랍이 남음 | 50 ms에 이미 −290 px(닫힘), 캡처로도 닫힘 | ✅ 재현 안 됨(1차는 캡처 지연) |
| C1 | «Sauver ✓» | 설정 «✓ Enregistré», 진료 «Enregistré ✓» / «Consultation terminée ✓» | ✅(진료는 여전히 확인 창 방식) |
| C2 | «RAKOTO Jean Terminer délivrance?» | «Terminer la délivrance pour RAKOTO Jean ?» | ✅ |
| C3 | 약국·수납 빈 패널에 접수 문구 | «Choisissez un patient dans la liste à gauche.» | ✅ |
| C4 | «1cas» | «1 cas» | ✅ |
| C5 | 프랑스어 금액 «12,300» | 약국 «12 300», 수납 «47 300 Ar», 통계 «39 300 Ar», 접수 «17 300 Ar». 한국어는 «27,900 Ar» | ✅ |
| C6 | 젤캡슐 단위 말 없음 | «1 gél. × 3 fois/jour pendant 5 jours (total 15)», 검사 수량 «1» | ✅ |
| C7 | 검색 결과 없음 안내·생년월일 붙여넣기 | «Aucun patient trouvé pour « RAKOTO Jean » — …», «03/05/1990» → 1990 | 05 | 03 | ✅ |
| C8 | 영어 시드 | 사전 문장, «CD Copy / Medical Certificate / Document Fee», 과 이름(한국어 화면 «General Practice») | 남음(시드) |
| C9 | 같은 이름 약 둘 구분 | 진료 «Gélule Stock 2000» / «Sans prix Gélule Stock 2500», 설정 «Stock 2000 · Prix 300» | ✅(말이 조금 다름 — 문제 아님) |
| D1–D3 | (새) 수납 영수 표시·Ce qui change·Caisse du jour | 위 B1·B2·B3, 돈 표 | ✅ |
| D4 | (새) 가격 기록 | 약 가격 3줄(0 → 100/300/3000), 진료비 C01 2줄(15000 → 16000 → 15000), **이름만 바꾼 C02는 0줄** | ✅ |

## 1부 — 단계별 (어두운 화면, 프랑스어)

| 단계 | 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|---|
| ① 설정 | 약 가격 3개, 약속처방(2약+CBC), Items de test | 위 표(B5·B6·B7b·C1·C9). 가격 창의 Sauver는 세 번 모두 화면 안 | 없음 | 없음 |
| ② 접수 | 검색 → 새 환자(성별 없이 → 있게) → 접수, 같은 이름, 같은 날 두 번, 날짜 붙여넣기, **Tab 이동** | 1차와 같은 문구 + C7. Tab 26곳 모두 테두리 2px(#60A5FA), 화면 안, 마우스 클릭 때는 테두리 없음 | 없음 | **성별 Masculin/Féminin은 Tab으로 가지 않음**(키보드로 필수 칸을 못 고름) |
| ③ 진료 | 바이탈·기록, 약속처방, «amlo» 추가, 시럽 2병, L02, Terminé | C6·B8·B9. «Consultation terminée ✓» | 없음 | 없음. 작은 것: 수량 옆 단위 «flacons»가 «flaco/ns»로 줄바꿈 |
| ④ 검사실 | 11 · 12,5 · 95 → 저장 → Hb 11,8로 고침 | 입력 칸 옆 **▲(빨강)·▼(파랑)**, 저장 알림이 남음 | 없음 | 없음 |
| ⑤ 약국 | 빈 원외 처방전(A1), Amlodipine(0 Ar)만 Externe → 원외 처방전 D26-00001, 조제, 재고 | A1·B7c·C2·C3·C5. 재고: Amiceta 3982, Amox 1985, PROFEIN 74 flacons, Amlodipine 800(원외라 안 빠짐) | 없음 | 없음 |
| ⑥ 수납 | 30 000 부분 → 미수 17 300 → (진료) PROFEIN 1병 추가 → 추가 3 000 → (진료) 지우기 → 정정 | A2·B1·B2·B3·D3. 진료에서 수납된 줄을 지울 때 «Cette ligne est déjà encaissée : … la caisse devra rembourser le patient.» | 없음 | 없음 |
| ⑦ 검사 취소 | L02(결과 95) ✕ → 검사실 → 수납 | 진료 ⊘ Annulé 줄, 검사실 «CBC ✓»만 + 결과표 «2026-09-30 ✕» 열, 수납 정정 8 000 | 없음 | 없음. 작은 것: 결과표 ✕ 열이 창 오른쪽 끝(1366)에 딱 붙음 |
| ⑧ 통계 | Aujourd'hui | 돈 표. «1 cas», Annulés 0(정정은 안 셈) | 없음 | 없음 |
| ⑨ 기록 + D4 | Journal, 진료비 가격 바꿨다 되돌림, 이름만 바꿈 | D4·B4. 14줄 | 없음 | 없음. 작은 것: 기록의 금액이 «47300 → 39300», «20000.00»(띄어 쓰지 않음), 설정 Codes d'actes 가격도 «15000.00» |

## 2부 — 1차에서 하지 않은 것

| 항목 | 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|---|
| A 지난 날 방문 📅 | 환자 B 두 번 접수 → **준비 SQL**(격리 DB만): `UPDATE visit SET visit_date = CURRENT_DATE - 1 WHERE patient_id = B` → 접수 ◀ 어제 → «Toux» 방문 **Terminer →** | 배너 «Vous consultez une date passée (2026-09-29)…», 확인 «… Le type de visite passe à « Sans frais » et **le patient part à la caisse**.» | **0 Ar(Sans frais) 방문은 수납 목록에 뜨지 않음**(수납 코드가 일부러 거름). 확인 창 «part à la caisse»와 수납 설명서 §5 «arrive en Sans frais»가 실제와 다름 | 없음 |
| | 의사 🔍 Trouver patient → Sélection visite → 어제 방문 → 기록 + Amiceta 4·2·3 → Terminé | 방문 고르기 창의 두 줄이 **똑같음**(2026-09-29 · 03:52 · GEN · RABE Hery · Non facturé) — 끝난 «Toux»와 기다리는 «Contrôle»을 가를 수 없음. 첫 줄을 골랐고 다행히 «Contrôle»에 붙음 | 진료 설명서 §2.4 «choisissez la visite» — 무엇을 보고 고르는지 없음 | 잘못 고를 위험 |
| | 수납 → 약국 | 수납 «📅 2026-09-29 · visite d’un jour passé · pas encore encaissée», Suivi 10 000 + 1 200 = 11 200 → R-0006 **날짜 오늘**, «Date de consultation 2026-09-29». 약국 En attente 0 → Trouver patient → «ordonnances en attente (7 derniers jours)», «Prescrit il y a 1 j» → 조제 | 없음(§10·약국 절 그대로) | 없음 |
| B 서류 | 의뢰서 D26-00002, 수술기록지(Note op. - Hernie 빈칸 경고 → 취소, Compte-rendu opératoire D26-00003 발행 → 취소), 수납 Document Fee 5 000 | Documents = «Lettre de référence» 하나. Hernie: «⚠ À compléter: [anesthesia] [Mesh placed and fixed / primary repair]» → «Émettre quand même ?» → Annuler는 BROUILLON 유지. 취소 → «Motif d'annulation:» → «D26-00003 ANNULÉ». 수납: 다 낸 방문을 🔍로 열면 추가 모드, «Délivrance / Autres»에서 고르면 바로 한 줄 → R-0007 | 없음 | 없음. 작은 것: Hernie 양식의 빈칸 글자가 **영어**, «Date opératoire»가 날짜 칸이 아닌 글자 칸. 서류비와 서류는 따로(서류를 취소해도 서류비는 그대로) |
| C 영상 한 건 | «Chest» → X1 Chest PA → 장비 목록 API → ✕ | 목록 «CR X1 Chest PA WL», «CR X2 Chest Lat WL»(+ 사전 문장 한 줄이 섞여 뜸). `GET /api/worklist/dicom-mwl`에 26-00001 · CR · Chest PA · 260930-3. ✕ → «Retirer « Chest PA » ?» → **바로**(0초, 15초 뒤에도) 목록에서 빠짐 | 없음 | 이미지가 있는 경우는 PACS가 없어 못 함 |
| D 한국어 한 바퀴 | 환자 C: 접수 → 진료 → 검사실 → 약국 → 수납 → 통계 → 기록 | 모두 한국어(«성별을 고르세요 (남 / 여).», «1회 1정 × 하루 3회, 3일 (총 9)», «진료를 마쳤습니다 ✓», «✓ 저장·완료: CBC», «RANDRIA Paul 환자의 조제를 완료할까요?», 금액 «27,900 Ar»). 영수증은 프랑스어(설계대로) | 없음 | 없음. 남은 영어: 사전 문장, 발급 항목, 과 이름 «General Practice». 작은 것: 생년월일이 없으면 진료 머리줄 «M/», 기록에서 약 한 줄 고침이 4줄로 남음 |
| E 밝은 화면 | 계정마다 ☀ Clair, 모든 화면 대비, 저장 알림, 종이 | 서버에 계정별로 기억(admin light / 의사 dark). 대비 **모두 통과, 수납 «Remplacé» 카드만 4.00–4.43**. 저장 알림: 검사실 초록 카드(#065F46 on #ECFDF5), 설정 «✓ Enregistré»(흰 글자 on #047857) 잘 보임. 종이(원외 처방전·의뢰서·수술기록지)는 두 화면에서 같은 흰 종이 | 없음 | 없음. 관찰: 로그인 없이 계정을 바꾸면 첫 화면은 이 PC의 마지막 색 → 1초 안에 그 계정 색 |
| E′ 어두운 화면 | 같은 화면 대비, 색의 뜻 | 대비 모두 통과, 수납 «Remplacé» 카드만 4.20–4.47. 빨강(Impayé·Annuler), 초록(받음), 보라(Correction·Remplacé), 노랑(Supplément·안내), 검사실 ▲빨강·▼파랑이 서로 구분됨. 「N° dossier」 빈 칸 안내 글자도 이제 통과 | 없음 | 없음 |
| F 진료 서랍 | 1차 조건 그대로 | 닫힘(위 B9) | — | 사람 눈으로는 못 봄 |
| G 업데이트 흉내 | 바로 전 커밋(`6f6f86a`) 화면을 이미지로 올려 창을 연 뒤(`index-BpZX2zQ6.js`), 창을 둔 채 지금 develop으로 다시 빌드(`index-CBx4JT8l.js`, 옛 스크립트는 404) | 열어 둔 옛 창: 앱 안 이동(약국 ↔ 접수) 정상, 빈 화면 없음. **새로고침 한 번** → 새 스크립트, 새 칸 모양, 빈 화면 없음 | 없음 | 없음(시험 도구의 F5 키는 새로고침이 아니어서 `location.reload()` = F5로) |

## 고칠 것 — 세션별

순위: **A** 배포 전에 꼭 · **B** 헷갈림·실수 위험 · **C** 문구·모양

| 순위 | 세션 | 무엇 | 어디서 |
|---|---|---|---|
| — | — | **A 없음** | |
| B | 접수 | 성별 Masculin/Féminin이 `div`라 **Tab·키보드로 고를 수 없음** — 필수 칸 | 1부 ② |
| B | 접수(공용 `PatientFinder.jsx`) | 방문 고르기 창에서 같은 날 두 방문이 똑같이 보임 — 주호소(Motif)·상태(끝남/기다림/Sans frais) 칸이 없어 잘못 고를 수 있음 | 2부 A |
| B | 수납(+디자인) | «Remplacé» 영수 카드의 투명도 0.85 때문에 날짜·번호·금액 글자가 밝은 4.00–4.43, 어두운 4.20–4.47(기준 4.5) | 2부 E·E′ |
| C | 접수 + 수납 설명서 | 0 Ar(Sans frais) 방문은 수납 목록에 뜨지 않는데, 접수 확인 창은 «le patient part à la caisse», 수납 설명서 §5는 «arrive en Sans frais» — 문구를 실제에 맞게 | 2부 A |
| C | 진료(+디자인) | 닫힌 대기열 서랍의 단추 3개(En Attente·Terminé·Rechercher)가 화면 밖에서 Tab으로 잡힘 → 「지금 이 칸」이 사라짐(`inert` 등) | 1부 ③ |
| C | 진료 | 수량 옆 «flacons»가 «flaco/ns»로 줄바꿈(1366), 생년월일 없을 때 머리줄 «M/», 약·검사 검색 목록에 사전 문장이 섞임, Hernie 양식 빈칸이 영어·«Date opératoire» 글자 칸 | 1부 ③, 2부 B·C·D |
| C | 설정 | Codes d'actes 가격 «15000.00», 기록의 금액 «47300 → 39300»·«20000.00» — 프랑스어 금액 표기(빈칸)와 다름. 기록에서 약 한 줄 고침이 칸마다 따로 4줄 | 1부 ⑨, 2부 D |
| C | 결정(총괄 → 결정 세션) | 서류(의뢰서·수술기록지) 발행·**취소**가 기록(Journal)에 남지 않음(`document_log`에는 상태가 있음) — 남길지 | 2부 B |
| C | 임상병리 | 결과표 «✕» 열이 창 오른쪽 끝에 딱 붙음(잘리지는 않음) | 1부 ⑦ |
| C | 총괄 | `<html lang>`이 화면 언어와 상관없이 늘 `en` | 2부 D |
| C | 시드(총괄) | 사전 문장·발급 항목·과 이름(한국어 «General Practice»)이 영어 | C8 |
| 관찰 | 디자인·설정 | 로그인 없이 계정을 바꾸면 첫 프레임은 PC의 마지막 색 → 곧 계정 색(로그인 화면을 거치면 해당 없음) | 2부 E |

설명서 쪽:
- `payment.md` §5 «Une visite terminée à l'accueil sans consultation arrive en **Sans frais**» → 0 Ar이면 목록에 오지 않는다는 한 줄(또는 화면을 바꾸면 그대로).
- `consultation.md` §2.4 — 방문 고르기 창에서 무엇을 보고 고르는지(창이 고쳐진 뒤).
- `reception.md` «Terminer →» — «part à la caisse» 문구를 고치면 같이.

## 하지 않은 것 · 한계

- 영상 이미지가 있는 경우(PACS 없음), 실제 인쇄(인쇄 창까지만), 영상 녹화.
- 「대기열 서랍」과 「계정 바꿀 때 번쩍임」을 **사람 눈으로** 보는 것 — 시험 도구의 캡처는 한 박자 늦을 수 있어 DOM 값으로 판단함.
- 계정 3개는 API로 만듦(설정 화면의 직원 만들기는 1차에서 확인).
- 스택은 보고 뒤 `down -v`로 내림.
