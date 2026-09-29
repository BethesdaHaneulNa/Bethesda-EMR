# 통합 시험 2026-09-29 — 프랑스어 화면에서 환자 한 명의 하루

> 배포 전 점검. **코드는 고치지 않았습니다.** 각 단계는 그 모듈의 프랑스어 설명서(`wiki/manual-fr/*.md`)를 보고 그대로 따라 했습니다.
> 시험한 사람: 접수 세션 · 보고 받는 곳: 총괄

## 조건

| 항목 | 값 |
|---|---|
| 코드 | `develop` `de7bc8c` (아홉 세션 병합 뒤 최신) |
| 스택 | 격리 스택 `bethesda-s-reception`, 포트 9181, **새 DB** (`down -v` 뒤 `up --build`) — 운영 EMR(9080)은 건드리지 않음 |
| DB | 마이그레이션 001–036 모두 적용. 약 126개(가져온 MED-xxxx 101개 활성, 옛 시드 약 25개 비활성) |
| 계정 | 처음 설정으로 관리자 `admin` → 설정 화면에서 의사 `hrabe`(RABE Hery, GEN, 진료+약국), 간호사 `vrasoa`(RASOA Voahangy, 접수+약국+검사실) 생성 |
| 화면 | 프랑스어(FR), 창 크기 **1366×768** (현장 노트북에 흔한 크기) |
| 환자 | 가짜 환자 RAKOTO Jean, 남, 1990-05-03 → 차트번호 26-00001 |

## 한 줄 결론

**하루 흐름은 처음부터 끝까지 막힘 없이 돕니다.** 설명서 문구와 화면 문구는 거의 모두 같았고, 돈은 정확히 맞았습니다(들어옴 50,300 − 나감 11,000 = 39,300 Ar = 통계 «Caisse»).
막힌 곳은 하나 — **⑥의 «진료에서 약 하나 지우기»: 약국에서 이미 조제한 약은 지울 수 없음**(설계대로). 그래서 설명서 §6·§7 흐름(약 추가 → 추가 수납 → 조제 전에 지우기 → 정정)으로 차액 환불을 시험했습니다. 고칠 것은 아래 「고칠 것」에 세션별로 적었습니다.

---

## ① 설정 (관리자) — 약 가격 3개, 약속처방 1개

설명서: `settings.md` «Mettre le prix d'un médicament», «Créer une ordonnance type»

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Paramètres → Médicaments → Rechercher «Amiceta» → Modifier → Prix unitaire 100 → Sauver | «Modifier le médicament» 창, 노란 상자 «À vérifier sur place (liste importée)», 저장 후 «✓ Enregistré». 목록 100.00 | 노란 상자는 설명서에 없음(설명서에 «à revoir» 주석으로 예고됨) | 없음 |
| «Amoxicillin» → 300 | **같은 이름 두 줄**: MED-0068(재고 2000)·MED-0069(2500), 둘 다 «Amoxicillin 500mg Gélule». 창에 «Même nom sous un autre code — MED-0069». 가져온 메모 «650캡슐 ≈ 650 ≠ 2000»에 **한국어**가 그대로 | 설명서에 같은 이름 두 줄 이야기 없음 | 1366×768에서 이 창은 길어서 **Sauver가 스크롤해야 보임** |
| «PROFEIN» → 3000 | 이미 «Délivré à l'unité de conditionnement»(Flacon) 체크된 채로 가져와짐. 3000 저장 | 없음 | 없음 |
| Ordonnances types → Nouvel ensemble → 이름 «Test intégration adulte», Médicament «Amiceta» 6·3·3 TID, «Amoxicillin»(MED-0068) 3·3·5 TID, Examen «CBC» 1·1·1 → Sauver | 빈 칸은 빨간 테두리 + «⚠ dose/j, jours». 저장 후 «Sans groupe» 폴더에 3 élém. | 저장 알림 문구가 **«✓ Sauver ✓»**(동사). 다른 곳은 «Enregistré» | 없음 |
| (관찰) 기존 약속처방 | «Malaria Workup»·«Diarrhea / GE»가 **비활성 약**(ACT01, PCM500, ORS, METRO)을 담고 있음. 설정 목록에는 아무 표시 없음(진료 화면에서는 줄긋기로 보임 — ③) | 없음 | 없음 |
| (관찰) 약 검색 결과 | 약속처방 오른쪽 검색 결과에 Amoxicillin 두 줄이 **코드만 다르고** 재고·가격이 안 보여 고르기 어려움 | — | — |

DB 확인: 가격 100 / 300 / 3000 저장, 약속처방 3줄(용량·횟수·일수 그대로).

## ② 접수 (간호사) — 새 환자, 성별 필수, 같은 이름 경고, 내원 접수

설명서: `reception.md` «En bref», §2, §5, §6

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Date de travail 2026-09-29 확인 → Rechercher patient «RAKOTO Jean» Entrée | **아무것도 안 뜸** (결과 없음 안내 없음) | 설명서 3단계 «Sinon, + Nouveau patient»대로 할 수는 있으나, 검색이 됐는지 알 수 없음 | 없음 |
| + Nouveau patient → Nom RAKOTO, Prénom Jean, 생년월일 1990 05 03(한 자씩) → 성별 없이 등록 | 칸이 저절로 넘어감. 알림 «Choisissez le sexe (Masculin / Féminin).» | 없음 | 없음 |
| Masculin → Service / Médecin «GEN – RABE Hery» → Nouvelle → Motif → Enregistrer / Mettre en attente | «Patient mis en attente — RAKOTO Jean (N° dossier 26-00001)», 오른쪽 En Attente (1) | **설명서 문구와 글자까지 같음** | 없음 |
| 새 환자 «jean» «Rakoto»(소문자·순서 바꿈) → 등록 | «Un patient portant ce nom existe déjà» 창: N° dossier·Nom·Naissance·Téléphone·Dernière visite + Choisir ce patient / Annuler / Nouveau dossier quand même | 없음 | 없음 |
| Choisir ce patient → 다시 등록 | «Dossier existant chargé…» → Suivi 미리 선택(«Déjà venu en GEN»). 다시 누르면 «RAKOTO Jean est déjà enregistré(e) aujourd'hui (En Attente, RABE Hery). Enregistrer une seconde visite ?» → Annuler → 아무것도 안 생김 | 없음 | 없음 |
| (관찰) 생년월일에 «19900503»을 **붙여넣기** | 연도 칸에 1990만 남고 월·일은 사라짐 | — | — |

## ③ 진료 (의사) — 바이탈·기록, 약속처방, 약 검색 추가, 시럽 2병, 검사 오더, 끝내기

설명서: `consultation.md` «En bref», §3–§7, §12

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| ☰ File d'Attente (1) → RAKOTO Jean | 차트가 열리지만 **대기열 서랍이 Prescriptions 위에 열린 채**로 남음(다른 곳을 눌러야 닫힘) | 설명서에 없음 | 없음 |
| TA 120/80, T° 38.5, FC 92, FR 18, SpO2 98, Note S/O/A/P → Sauver | 알림 창 «Sauver ✓» | 저장 알림이 동사 «Sauver»(①과 같음). 사전(Dictionnaire) 문장이 **영어**(«Stable condition…») | 없음 |
| Ordonnances types → 📁 Sans groupe → «Test intégration adulte» | 3줄이 용량 그대로 들어옴: «2 cp × 3 fois/jour pendant 3 jours (total 18)», Amoxicillin «1 × 3 fois/jour pendant 5 jours (total 15)», CBC 1·1·1. «Malaria Workup»은 ACT01·PCM500 **줄긋기** | §6과 같음. Amoxicillin(젤캡슐) 문장에 단위 말이 없음(«1 ×»). CBC 수량이 «1.000»으로 보이고 1366폭에서 «1.00(»로 잘림 | 없음 |
| 약 검색 «amlo» → Entrée | 목록 «MÉD MED-0001 Amlodipine 5mg [Sans prix] Comprimé» → **빈 줄** + 빨간 «Indiquez dose/jour, fois et jours» + «Sans prix», 위에 «⚠ 1 sans dose/jour, fois ou jours» «⚠ 1 sans prix» | §4와 같음 | 없음 |
| Dose/j 1, Fois 1, Jours 30 | «1 × 1 fois/jour pendant 30 jours (total 30)» | 없음 | 칸을 채우면 **표 열 너비가 바뀌어** 다음 칸 위치가 움직임 — Posologie에 친 «QD»가 한 번 사라짐 |
| (관찰) «cetirizine» 검색 | 목록 없음, 안내 없음 | — | — |
| «profein» → Entrée → Quantité 2 | 빨간 «Indiquez la quantité» → 2 입력 후 «2 flacons» | §5와 같음 | 없음 |
| «L0» → L02 Fasting Glucose | LABO 목록 L01–L08, 1·1·1, «En attente» | 없음 | 없음 |
| 초록 Terminé | 알림 «Terminé ✓», 대기열 (0). Sans prix 줄이 있어도 묻지 않음 | 설명서도 묻는다고 하지 않음(§12는 빈 칸만) | 없음 |
| (관찰) 1366×768 | 처방 표에 가로 스크롤이 생김 | — | — |

DB 확인: 처방 4줄 18@100, 15@300, 30@0, 2병@3000 / 검사 2줄.

## ④ 검사실 (간호사) — 결과 12,5, 결과 고치기

설명서: `laboratory.md` «En bref», «Écrire les chiffres», «Corriger un résultat»

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Laboratoire → En attente 1 → RAKOTO Jean | «CBC, Fasting Glucose», **Tout** 미리 선택, Référence·Unité 열 | 없음 | 없음 |
| WBC 11, Hb **12,5**, Glucose 95 | 치는 동안 11은 빨강, 12,5는 파랑 | §«Écrire les chiffres»와 같음 | 1366×768에서 **«✓ Enregistrer · Terminer (Tout)» 단추가 화면 아래로 반쯤 잘림** — 스크롤해야 누름 |
| ✓ Enregistrer · Terminer (Tout) | 곧바로 En attente 0 / Terminé 1, 가운데 «Sélectionnez un patient à gauche». 오른쪽 표 ▲11 ▼12,5 95 | §5의 초록 문구 «Enregistré et terminé: CBC»는 **보이지 않음**(모두 끝나면 화면이 바로 비워짐 — §6 설명과는 맞음) | 없음 |
| Terminé → 환자 → Hb 11,8 → 저장 | 저장됨. DB 값 «11,8», low | 없음 | 없음 |

## ⑤ 약국 (간호사) — 조제, 환자용 종이, 재고

설명서: `pharmacy.md` «En bref», «Remettre», «Imprimer l'ordonnance…», «Entrée… inventaire»

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Pharmacie → En attente 1 → RAKOTO Jean | 4줄, 열 Médicament · Dose/jour · Dose/prise · Fréq. · Jours · Posologie · Qté · Note, PROFEIN «2 flacons», Médicaments (interne) **12,300** | 없음. 금액에 영어식 쉼표(프랑스어면 «12 300») | 없음 |
| (관찰) 오른쪽 빈 패널 | «Recherchez un patient **ou saisissez un nouveau patient** à gauche.» — 접수 문구가 약국·수납에도 나옴 | — | — |
| ✓ Terminer délivrance → OK | 확인 창 «RAKOTO Jean Terminer délivrance?»(어색한 프랑스어) → Délivré 1 | 없음 | 없음 |
| 환자용 종이: 💊 Ordonnance ext. | 약국에서 인쇄되는 종이는 **외부 처방전뿐**(내부 약 복용법 종이는 없음). 모두 Interne라 미리보기 «Aucune ordonnance externe…» | — | **빈 처방전인데도 Émettre가 되어 번호 D26-00001이 붙음**(경고 없음). Historique → Annuler → «Motif d'annulation:» → ANNULÉ 도장 |
| 📦 Stock → Amiceta, PROFEIN | Amiceta 3982(4000−18), PROFEIN **74 flacons**. Registre «Délivrance −2 76 → 74 · RASOA Voahangy · RAKOTO Jean #26-00001», 첫 줄 «Ouverture +76 · Importé (liste du 15/05/2026)» | 설명서와 같음. 가져온 메모에 한국어 «79병» | 없음 |

DB 확인: Amoxicillin 1985, Amlodipine 770 — 네 약 모두 정확히 빠짐.

## ⑥ 수납 (관리자) — 일부만 받기 → 미수 수납 → 약 지우고 정정 → 영수증

설명서: `payment.md` §2–§4, §6, §7, §11

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Paiement → En attente (1) → RAKOTO Jean | «⚠ 1 article(s) sans prix — vérifiez les prix: Amlodipine 5mg», Consultation Nouvelle 15,000, 약 12,300, 검사 20,000, **Total 47,300**. Délivrance / Autres 항목 이름이 영어(CD Copy, Medical Certificate, Document Fee) | 없음 | **1366×768에서 화면이 좁음**: 윗줄 단추가 두 줄로 접히고, 합계 칸 오른쪽이 잘려 숫자가 «15,»«47,3»처럼 보이며 50,000 단추가 가려짐. 가운데가 옆으로 밀림 |
| Montant Reçu 30000 → Confirmer | 화면 «Impayé 17,300». 확인 창 «1 article(s) sans prix : Amlodipine 5mg. Fixer le prix plus tard ne modifie pas… Encaisser quand même ?» → 영수증 R-20260929-0001: Total 47 300, encaissé 30 000, **Reste à payer 17 300**, Paiement partiel | §3·§11과 같음 | 없음 |
| Payé aujourd'hui → Reçus → 💵 Encaisser impayé(17300 미리 적힘) → Confirmer | 새 영수증 R-…-0002 «Règlement du reçu R-20260929-0001 du 2026-09-29», Payé | §4와 같음 | 없음 |
| (관찰) 미수 수납 뒤 R-0001 상세 | 여전히 Statut «partiel», «Impayé 17,300 Ar»로 보임(DB 미수는 0) | 오해 소지 | — |
| 진료에서 약 하나 지우기 | 약 4줄이 모두 🔒 «Délivré», ✕ 없음 | consultation §8대로(조제된 약은 못 바꿈) | **막힘** — «환자가 약을 돌려주면»(재고 되돌림 + 환불) 설명서 어디에도 길이 없음 |
| 대신: Terminé 탭에서 다시 열어 PROFEIN 1병 추가(Terminé 누르지 않음) | 수납 «Supplément ➕ Charge suppl.: 3,000 Ar», «Déjà facturé: 47,300 Ar» → Exact → R-…-0003 3 000 Payé | §6과 같음. consultation §12.5(다시 열어 한 줄 추가하면 넘어감)도 맞음 | 없음 |
| 의사가 그 줄 ✕ | «Retirer « PROFEIN » ?» (이미 돈을 받은 줄이라는 말은 없음) | 없음 | 없음 |
| 수납 → Correction | «↩ À rembourser: 3,000 Ar», Articles actuels / Montant correct 47,300 / Déjà encaissé 50,300 / Remboursement dû 3,000 → ↩ Appliquer la correction → «…Rendez 3,000 Ar au patient.» → R-…-0004 «Remplace le(s) reçu(s) : R-0001, R-0002, R-0003», Remboursé au patient 3 000 | §7과 같음(설명서 예시와 금액까지 같음). 정정 화면은 «PROFEIN ×2», 영수증은 «2 flacons» | 없음 |

## ⑦ 결과 있는 검사 취소 → 검사실·수납에서

설명서: `consultation.md` §8, `laboratory.md` «Lire le tableau», `payment.md` §7

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| 진료: L02(결과 95) ✕ | 한 번의 창: «« Fasting Glucose » a déjà un résultat et ne peut pas être retiré. Le marquer comme annulé ? … Si elle a déjà été payée, la caisse devra la rembourser. Motif (facultatif) :» → 회색·줄긋기 ⊘ Annulé | 설명서는 «메시지 → 사유» 두 단계처럼 읽히지만 실제는 창 하나 — 뜻은 같음 | 없음 |
| 검사실: Terminé → 환자 | 검사 버튼은 CBC만. 오른쪽 표 끝에 «2026-09-29 ✕» 열, 95 회색 | 설명서와 같음. 1366폭에서 ✕ 열이 반쯤 잘림 | 없음 |
| 수납 | «Correction ↩ À rembourser: 8,000 Ar», Montant correct 39,300 / Déjà encaissé 47,300 → 적용 → R-…-0005 «Remplace R-0004», Remboursé 8 000 | 같음. 다만 정정 화면이 **무엇이 빠졌는지**(Fasting Glucose 취소) 말하지 않음 | 없음 |
| (관찰) Payé aujourd'hui | 숫자는 (1)인데 목록은 5줄 — R-0005 «payé» + R-0001~0004 **«annulé»**. 이 넷은 정정으로 «바뀐» 영수증이지 취소가 아님(통계 설명서도 둘을 구분함) | — | — |

## ⑧ 통계 (관리자) — 그날 현금 = 실제 주고받은 돈?

설명서: `statistics.md` «Lire « Recettes »», «Caisse par période»

실제로 오간 돈: 받음 30,000 + 17,300 + 3,000 = **50,300** / 돌려줌 3,000 + 8,000 = **11,000** / 남음 **39,300**

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Statistiques → Aujourd'hui | **Caisse 39,300 Ar · Entrées +50,300 · Sorties −11,000** ✅. Factures de soins 1, Facturé 39,300. Impayé 0, Remboursement dû 0, **Annulés 0**(정정은 취소로 안 셈 ✅) | 같음 | 없음 |
| Caisse par période (Jour) | 2026-09-29: Entrées +50,300, Sorties −11,000, Net +39,300, Paiements +33,000, Règlements de solde +17,300, Rendu (correction) −11,000 ✅ | 같음 | 없음 |
| Activité | Visites totales 1, Nouvelle 1, Terminé 1, Par service GEN 1, Par médecin RABE Hery 1 | 같음. 개수 단위가 «**1cas**»(프랑스어로 어색) | 없음 |
| Recettes par poste / Usage médicaments (Toutes Rx) | Consultation 15,000 · Médicaments 12,300 · Examens 12,000. 약 사용 Amlodipine 30, Amiceta 18, Amoxicillin 15, PROFEIN **Flacon** 2 | 같음 | 없음 |

**결론: 그날 현금은 실제로 주고받은 돈과 1 Ar까지 같습니다.**

## ⑨ 설정 → Journal

설명서: `settings.md` «Lire le Journal»

| 한 것 | 화면에 뜬 것 | 설명서와 다른 곳 | 막힌 곳 |
|---|---|---|---|
| Paramètres → Journal (Du 2026-09-23 Au 2026-09-29, 7일) | 9줄: 직원 계정 2개 생성 · Hb **12,5 → 11,8**(RASOA) · 진료 끝난 기록에 PROFEIN 추가 2줄 · Prescription supprimée PROFEIN · Reçu corrigé ×2(3,000 / 8,000) · Demande annulée L02 «Terminé → Annulé», Motif «Demande en double» | 같음(열 Quand·Qui·Quoi·Patient·Modification, 옛 값 줄긋기) | 없음 |
| (관찰) 영수증 정정 줄 | 요약에 영어가 섞임: «R-0004 → R-0005 · -L02 · **refund 8000** — Remboursement», 상태 «**paid / partial**» | — | — |
| (관찰) 남지 않은 것 | 약 가격 변경(0→100/300/3000), 약속처방 생성, 외부 처방전 D26-00001 발행·취소 | 설명서가 말하는 범위(결과·끝난 기록·처방·영수증·환자·직원)와는 맞음. 가격 변경은 누가 했는지 남지 않음 | — |
| (관찰) 처음 입력은 안 남음 | 첫 결과 입력(12,5)·접수·수납은 없음 | 설명서 «Une première saisie n'est pas notée»와 같음 | — |

---

## 고칠 것 — 세션별

순위: **A** 배포 전에 보면 좋음(돈·기록이 틀리거나 현장에서 막힘) · **B** 헷갈림 · **C** 문구·모양

| 순위 | 세션 | 무엇 | 어디서 봤나 |
|---|---|---|---|
| A | 약국 | 외부 약이 하나도 없는데 **빈 외부 처방전에 번호가 붙음**(D26-00001). 막거나 경고 | ⑤ |
| A | 수납 | **1366×768에서 수납 화면이 잘림**: 합계 숫자·50,000 단추가 가려지고 윗단추가 두 줄. 현장 노트북 크기 확인 필요 | ⑥ |
| A | 결정(총괄 → 결정 세션) | **환자가 조제된 약을 돌려줄 때**의 길이 없음(재고 되돌림 + 환불). 지금은 조제된 약은 진료에서 못 지우고, 수납 정정도 안 생김 | ⑥ |
| B | 수납 | 미수 수납 뒤에도 원래 영수증 상세가 «partiel · Impayé 17,300»으로 보임 | ⑥ |
| B | 수납 | 정정으로 바뀐 영수증이 목록에서 «annulé»로 보임(«remplacé»가 맞음), Payé aujourd'hui 숫자(1)와 목록(5줄)이 다름 | ⑦ |
| B | 수납 | 정정 화면이 무엇이 빠졌는지(취소된 검사·지운 약) 말하지 않음 | ⑦ |
| B | 수납 (+설정 Journal) | Journal의 영수증 정정 요약에 영어 «refund», «paid/partial» (`billing.routes.js` 요약 문자열) | ⑨ |
| B | 약국 / 설정 | 가져온 약 목록에 **같은 이름 두 줄**(Amoxicillin 500mg MED-0068/0069) — 의사·관리자 검색에서 코드로만 구분. 가져온 메모에 한국어(«650캡슐», «79병») | ①⑤ |
| B | 설정 | 기존 약속처방 «Malaria Workup», «Diarrhea / GE»가 비활성 약만 담음 — 설정 목록에 표시 없음(진료에서만 줄긋기) | ① |
| B | 검사실 | 1366×768에서 «✓ Enregistrer · Terminer» 단추가 화면 아래로 잘림, 결과 표 ✕ 열도 잘림 | ④⑦ |
| B | 진료 | 처방 표 열 너비가 입력할 때마다 바뀌어 칸 위치가 움직임(입력이 다른 칸으로 감), 1366폭에서 가로 스크롤 | ③ |
| B | 진료 | 대기열 서랍이 환자를 연 뒤에도 처방 위에 남음 — **2026-09-30 정정: 재현 안 됨.** DOM으로 보면 0.3초 안에 닫힘. 시험 도구(브라우저 창)의 캡처가 늦게 찍힌 것으로 보임([다시 통합 시험 시나리오](integration-test-2-scenario.md) 2부 F) | ③ |
| C | 설정 · 진료 | 저장 알림이 «✓ Sauver ✓» / «Sauver ✓» / «Terminé ✓»(동사) — «Enregistré»로 | ①③ |
| C | 약국 | 확인 창 «RAKOTO Jean Terminer délivrance?» 프랑스어 어순 | ⑤ |
| C | 총괄(공용 `PatientChart.jsx`) | 약국·수납 오른쪽 빈 패널에 접수 문구 «…ou saisissez un nouveau patient…»(`selectPatientLeft`) | ⑤⑥ |
| C | 통계 | 개수 단위 «1cas» | ⑧ |
| C | 여러 곳 | 프랑스어 화면의 금액이 «12,300»(영어식) — 영수증만 «12 300» | ⑤⑥⑧ |
| C | 시드 데이터(총괄) | 프랑스어 화면에 영어 시드: 진료 사전 문장, 수납 «Délivrance / Autres»(CD Copy…), 약속처방 이름 | ③⑥ |
| C | 진료 | 젤캡슐 줄 문장에 단위 말이 없음(«1 × 3 fois/jour»), 검사 수량 «1.000» | ③ |
| C | 접수 (`Registration.jsx` — 디자인 세션 작업 중이라 손대지 않음) | 검색 결과가 없을 때 안내 없음. 생년월일 붙여넣기 시 월·일 사라짐 | ② |
| C | 접수 (내 파일) | `backend/test/reception.api.mjs`가 새 스택에서 로그인 실패 — 처음 설정의 로그인 ID가 `admin`으로 고정됨. 받은 `login_id`를 쓰도록 고칠 것 | 준비 |

설명서 쪽 고칠 것(각 설명서 주인):

- `payment.md` — §4 뒤에 «원래 영수증은 partiel로 남아 보임» 또는 화면을 고친 뒤 그대로. 정정으로 바뀐 영수증이 목록에서 어떻게 보이는지 한 줄.
- `laboratory.md` §5 — 모든 검사를 한 번에 저장하면 초록 문구 없이 바로 비워진다는 한 줄(또는 화면을 고침).
- `pharmacy.md` — 약국에서 인쇄하는 종이는 외부 처방전뿐이고, 모두 Interne면 **Émettre하지 말 것**(화면을 고치기 전까지).
- `settings.md` — Médicaments 창의 «À vérifier sur place» 상자(이미 «à revoir» 주석 있음), 같은 이름 두 줄.
- `consultation.md` §8 — 조제된 약은 지울 수 없고, 환자가 약을 돌려줄 때는 …(결정 뒤).

## 하지 않은 것

- 영상 녹화(요청대로 안 함), 인쇄(인쇄 창만 확인, 실제 종이 없음), 영상·PACS, 서류(Documents), 지난 날 방문(📅), 한국어 화면.
- 운영 EMR(9080)은 건드리지 않았고, 격리 스택은 보고 뒤 내렸습니다(`down -v`).
