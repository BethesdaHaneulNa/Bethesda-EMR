# 자주 쓰는 진단 — 후보였던 것들 (들어간 것 175 · 남은 것 4)

> 진료 세션 · 2026-10-02 · 관련: [modules/consultation.md](../modules/consultation.md) 2.2.1 · 6절

진단 목록을 100 → 315개로 넓힐 때(052) 「약 300개」에 맞추느라 빼 두었던 후보 179개입니다. 실장님(2026-10-02): 「179개는 뺐다는데 뭐 이정도는 더 추가해도 되지않나?」 → **175개를 넣었습니다**(다음 마이그레이션 — `…_consultation_diagnosis_code_rest.sql`). 목록은 모두 약 490줄이 됩니다.

- 코드는 WHO ICD-10(3자리 · 4자리, 2010년 이후 판), 이름은 **우리가 짧게 쓴 이름**(공식 표제어가 아님).
- **의료진의 검토를 받지 않았습니다.** 고칠 것은 **설정 → 진단 목록**(Paramètres → Diagnostics)에서.

## 남은 것 — 넣지 않음 (4개)

코드가 판(edition)마다 다르거나, 일부러 넣지 않기로 한 계열입니다. 필요하면 현지가 쓰는 판을 확인한 뒤 설정에서 손으로 더합니다.

| 코드 | English | Français | 한국어 | 넣지 않은 이유 |
|---|---|---|---|---|
| `A90` | Dengue fever | Dengue | 뎅기열 | ICD-10 2016년판에서 뎅기열이 A97로 옮겨 가고 A90·A91이 없어짐 — 판에 따라 없는 코드 |
| `K85.9` | Acute pancreatitis | Pancréatite aiguë | 급성 췌장염 | 급성 췌장염: 2010년판부터 K85.x로 나뉨(그 전은 K85) — 「넣지 않는 것」 목록의 K85.x |
| `L89.9` | Pressure sore | Escarre | 욕창 | 욕창: 2010년판부터 단계별 L89.x(그 전은 L89) — 「넣지 않는 것」 목록의 L89.x |
| `O82.9` | Caesarean delivery | Accouchement par césarienne | 제왕절개 분만 | 제왕절개: 「넣지 않는 것」 목록의 O82.x |

같은 이유로 처음부터 후보에 넣지 않은 것: 설사(증상) `R19.7`(WHO판에 없음 — 미국판 코드) · 치질 등급별 `K64.0`~`K64.3` · 제왕절개 종류별 `O82.x` · 조기 진통 `O60.x` · 욕창 단계 `L89.x` · 급성 췌장염 원인별 `K85.x` · 외인 코드(W·X·Y — 진단이 아니라 원인) · 치과의 세부 코드.

## 들어간 것 (175개)

| 코드 | English | Français | 한국어 |
|---|---|---|---|
| `A02.0` | Salmonella enteritis | Entérite à salmonelles | 살모넬라 장염 |
| `A06.4` | Amoebic liver abscess | Abcès amibien du foie | 아메바 간농양 |
| `A16.5` | Tuberculous pleurisy | Pleurésie tuberculeuse | 결핵성 흉막염 |
| `A17.0` | Tuberculous meningitis | Méningite tuberculeuse | 결핵성 수막염 |
| `A18.0` | Tuberculosis of bone or joint (Pott disease) | Tuberculose osseuse ou articulaire (mal de Pott) | 뼈·관절 결핵 |
| `A27.9` | Leptospirosis | Leptospirose | 렙토스피라증 |
| `A56.0` | Chlamydial genital infection | Infection génitale à Chlamydia | 클라미디아 생식기 감염 |
| `A59.0` | Urogenital trichomoniasis | Trichomonase uro-génitale | 트리코모나스증 |
| `A60.0` | Genital herpes | Herpès génital | 생식기 헤르페스 |
| `A63.0` | Anogenital warts | Condylomes ano-génitaux | 항문생식기 사마귀(콘딜로마) |
| `A82.9` | Rabies | Rage | 광견병 |
| `A92.0` | Chikungunya | Chikungunya | 치쿤구니야열 |
| `B00.9` | Herpes simplex infection | Herpès (infection à herpès simplex) | 단순포진 |
| `B06.9` | Rubella | Rubéole | 풍진 |
| `B15.9` | Hepatitis A | Hépatite A | A형간염 |
| `B16.9` | Acute hepatitis B | Hépatite B aiguë | 급성 B형간염 |
| `B18.2` | Chronic hepatitis C | Hépatite C chronique | 만성 C형간염 |
| `B19.9` | Viral hepatitis, type not known | Hépatite virale, type non précisé | 바이러스 간염(형 미상) |
| `B51.9` | Vivax malaria | Paludisme à Plasmodium vivax | 삼일열 말라리아 |
| `B74.9` | Filariasis | Filariose | 사상충증 |
| `B78.9` | Strongyloidiasis | Anguillulose (strongyloïdose) | 분선충증 |
| `B79` | Whipworm infection | Trichocéphalose | 편충증 |
| `R03.0` | High blood pressure reading, no diagnosis of hypertension | Tension élevée, sans diagnostic d'HTA | 혈압 상승(고혈압 진단 없음) |
| `I25.9` | Chronic ischaemic heart disease | Cardiopathie ischémique chronique | 만성 허혈성 심장병 |
| `I09.9` | Rheumatic heart disease | Cardiopathie rhumatismale | 류마티스성 심장병 |
| `I42.0` | Dilated cardiomyopathy | Cardiomyopathie dilatée | 확장성 심근병증 |
| `I80.2` | Deep vein thrombosis of the leg | Thrombose veineuse profonde du membre inférieur | 하지 심부정맥 혈전증 |
| `I95.9` | Low blood pressure | Hypotension | 저혈압 |
| `J12.9` | Viral pneumonia | Pneumonie virale | 바이러스 폐렴 |
| `J15.9` | Bacterial pneumonia | Pneumonie bactérienne | 세균성 폐렴 |
| `J40` | Bronchitis | Bronchite | 기관지염 |
| `J42` | Chronic bronchitis | Bronchite chronique | 만성 기관지염 |
| `J47` | Bronchiectasis | Dilatation des bronches | 기관지확장증 |
| `J90` | Pleural effusion | Épanchement pleural | 흉막삼출 |
| `J93.9` | Pneumothorax | Pneumothorax | 기흉 |
| `E14.9` | Diabetes, type not known | Diabète, type non précisé | 당뇨병(형 미상) |
| `E16.2` | Hypoglycaemia | Hypoglycémie | 저혈당 |
| `R73.9` | High blood sugar | Hyperglycémie | 고혈당 |
| `D53.9` | Nutritional anaemia | Anémie nutritionnelle | 영양성 빈혈 |
| `D57.0` | Sickle-cell crisis | Crise drépanocytaire | 겸상적혈구 위기 |
| `K21.0` | Reflux with oesophagitis | Reflux gastro-œsophagien avec œsophagite (RGO) | 식도염을 동반한 위식도역류 |
| `K26.9` | Duodenal ulcer | Ulcère du duodénum | 십이지장궤양 |
| `K29.5` | Chronic gastritis | Gastrite chronique | 만성 위염 |
| `K52.9` | Non-infectious gastroenteritis or colitis | Gastro-entérite ou colite non infectieuse | 비감염성 위장염·대장염 |
| `K70.3` | Alcoholic cirrhosis | Cirrhose alcoolique | 알코올성 간경변 |
| `K76.0` | Fatty liver | Stéatose hépatique (foie gras) | 지방간 |
| `N00.9` | Acute nephritic syndrome | Syndrome néphritique aigu | 급성 신염 증후군 |
| `N17.9` | Acute kidney failure | Insuffisance rénale aiguë | 급성 신부전 |
| `G20` | Parkinson disease | Maladie de Parkinson | 파킨슨병 |
| `G44.2` | Tension headache | Céphalée de tension | 긴장성 두통 |
| `G62.9` | Polyneuropathy | Polyneuropathie | 다발신경병증 |
| `G81.9` | Hemiplegia | Hémiplégie | 편마비 |
| `H81.1` | Benign positional vertigo | Vertige positionnel bénin | 양성 돌발성 현기증 |
| `R00.2` | Palpitations | Palpitations | 두근거림 |
| `R04.2` | Coughing up blood | Hémoptysie | 객혈 |
| `R10.3` | Lower abdominal pain | Douleur du bas-ventre | 하복부 통증 |
| `R12` | Heartburn | Pyrosis (brûlures d'estomac) | 속쓰림 |
| `R13` | Difficulty swallowing | Dysphagie | 삼킴곤란 |
| `R18` | Ascites | Ascite | 복수 |
| `R52.9` | Pain | Douleur | 통증 |
| `R59.0` | Swollen lymph nodes, one area | Adénopathie localisée | 국소 림프절 종대 |
| `R60.0` | Local swelling (oedema) | Œdème localisé | 국소 부종 |
| `R63.0` | Loss of appetite | Anorexie (perte d'appétit) | 식욕부진 |
| `E50.9` | Vitamin A deficiency | Carence en vitamine A | 비타민 A 결핍 |
| `K00.7` | Teething | Poussée dentaire | 이가 나는 증상 |
| `P07.1` | Low birth weight | Faible poids de naissance | 저체중 출생아 |
| `P39.1` | Neonatal conjunctivitis | Conjonctivite du nouveau-né | 신생아 결막염 |
| `P92.9` | Feeding problem of the newborn | Difficulté d'alimentation du nouveau-né | 신생아 수유 문제 |
| `Q90.9` | Down syndrome | Trisomie 21 | 다운증후군 |
| `G80.9` | Cerebral palsy | Infirmité motrice cérébrale (IMC) | 뇌성마비 |
| `R62.0` | Delayed development | Retard du développement | 발달 지연 |
| `N61` | Breast infection (not after childbirth) | Mastite ou abcès du sein (hors allaitement) | 유방염(분만과 무관) |
| `N64.4` | Breast pain | Mastodynie (douleur du sein) | 유방통 |
| `N60.1` | Fibrocystic breast | Mastopathie fibrokystique | 섬유낭성 유방병 |
| `N72` | Cervicitis | Cervicite | 자궁경부염 |
| `N75.0` | Bartholin cyst | Kyste de la glande de Bartholin | 바르톨린샘 낭종 |
| `N80.9` | Endometriosis | Endométriose | 자궁내막증 |
| `N81.4` | Prolapse of the uterus | Prolapsus utéro-vaginal | 자궁질 탈출 |
| `N87.9` | Cervical dysplasia | Dysplasie du col de l'utérus | 자궁경부 이형성 |
| `N97.9` | Female infertility | Infertilité féminine | 여성 불임 |
| `O02.1` | Missed miscarriage | Grossesse arrêtée (rétention d'œuf mort) | 계류유산 |
| `O06.9` | Miscarriage or abortion, type not known | Avortement, type non précisé | 유산(형 미상) |
| `O15.0` | Eclampsia in pregnancy | Éclampsie pendant la grossesse | 임신 중 자간증 |
| `O42.9` | Premature rupture of membranes | Rupture prématurée des membranes | 조기양막파수 |
| `O44.1` | Placenta praevia with bleeding | Placenta prævia hémorragique | 출혈을 동반한 전치태반 |
| `O86.0` | Infected caesarean or perineal wound | Infection de la plaie obstétricale | 산과 수술 상처 감염 |
| `O91.1` | Breast abscess while breastfeeding | Abcès du sein de l'allaitement | 수유기 유방 농양 |
| `Z32.1` | Pregnancy confirmed | Grossesse confirmée | 임신 확인 |
| `Z35.9` | Antenatal care, high-risk pregnancy | Consultation prénatale, grossesse à risque | 고위험 임신 산전 관리 |
| `Z30.1` | Insertion of an intrauterine device | Pose d'un stérilet (DIU) | 자궁내장치 삽입 |
| `Z30.4` | Follow-up of contraceptive pills or injections | Suivi d'une contraception (pilule, injection) | 피임약 추적 관리 |
| `Z01.4` | Routine gynaecological check | Examen gynécologique de routine | 부인과 정기 검진 |
| `E04.1` | Thyroid nodule | Nodule thyroïdien | 갑상선 결절 |
| `K35.3` | Acute appendicitis with local peritonitis | Appendicite aiguë avec péritonite localisée | 국소 복막염을 동반한 급성 충수염 |
| `K41.9` | Femoral hernia | Hernie crurale (fémorale) | 대퇴 탈장 |
| `K44.9` | Hiatus hernia | Hernie hiatale | 열공 탈장 |
| `K62.3` | Rectal prolapse | Prolapsus rectal | 직장 탈출 |
| `K75.0` | Liver abscess | Abcès du foie | 간농양 |
| `K80.0` | Gallstones with acute cholecystitis | Lithiase vésiculaire avec cholécystite aiguë | 급성 담낭염을 동반한 담석 |
| `L05.0` | Pilonidal abscess | Kyste pilonidal abcédé | 모소낭 농양 |
| `L04.9` | Acute lymphadenitis | Adénite aiguë | 급성 림프절염 |
| `L97` | Leg ulcer | Ulcère de jambe | 하지 궤양 |
| `C16.9` | Stomach cancer | Cancer de l'estomac | 위암 |
| `C22.0` | Liver cancer (hepatocellular) | Cancer du foie (carcinome hépatocellulaire) | 간세포암 |
| `C61` | Prostate cancer | Cancer de la prostate | 전립선암 |
| `N35.9` | Urethral stricture | Rétrécissement de l'urètre | 요도 협착 |
| `N41.0` | Acute prostatitis | Prostatite aiguë | 급성 전립선염 |
| `N48.1` | Balanitis | Balanite | 귀두포피염 |
| `I86.1` | Varicocele | Varicocèle | 정계정맥류 |
| `N46` | Male infertility | Infertilité masculine | 남성 불임 |
| `M00.9` | Septic arthritis | Arthrite septique | 화농성 관절염 |
| `M16.9` | Osteoarthritis of the hip | Arthrose de la hanche (coxarthrose) | 고관절증 |
| `M47.9` | Spondylosis | Arthrose vertébrale (spondylarthrose) | 척추증 |
| `M54.4` | Low back pain with sciatica | Lombosciatique | 좌골신경통을 동반한 요통 |
| `M65.3` | Trigger finger | Doigt à ressaut | 방아쇠 손가락 |
| `M65.9` | Tendon sheath inflammation | Ténosynovite | 건초염 |
| `M67.4` | Ganglion cyst | Kyste synovial | 결절종 |
| `M72.2` | Plantar fasciitis | Fasciite plantaire | 족저근막염 |
| `M75.1` | Rotator cuff syndrome | Syndrome de la coiffe des rotateurs | 회전근개 증후군 |
| `M77.1` | Tennis elbow | Épicondylite latérale | 외측 상과염 |
| `M79.6` | Pain in a limb | Douleur d'un membre | 사지 통증 |
| `Q66.0` | Club foot | Pied bot varus équin | 내반첨족(만곡족) |
| `S02.2` | Broken nose | Fracture des os du nez | 코뼈 골절 |
| `S22.3` | Broken rib | Fracture de côte | 갈비뼈 골절 |
| `S42.2` | Fracture of the upper end of the humerus | Fracture de l'extrémité supérieure de l'humérus | 상완골 근위부 골절 |
| `S42.3` | Fracture of the shaft of the humerus | Fracture de la diaphyse de l'humérus | 상완골 몸통 골절 |
| `S62.3` | Fracture of a metacarpal | Fracture d'un métacarpien | 중수골 골절 |
| `S82.0` | Fracture of the patella | Fracture de la rotule | 무릎뼈 골절 |
| `S92.3` | Fracture of a metatarsal | Fracture d'un métatarsien | 중족골 골절 |
| `S13.4` | Neck sprain (whiplash) | Entorse cervicale | 경추 염좌 |
| `S53.1` | Dislocated elbow | Luxation du coude | 팔꿈치 탈구 |
| `S63.5` | Wrist sprain | Entorse du poignet | 손목 염좌 |
| `B08.1` | Molluscum contagiosum | Molluscum contagiosum | 전염성 물렁종 |
| `B35.4` | Ringworm of the body | Dermatophytie de la peau glabre (herpès circiné) | 체부 백선 |
| `L08.0` | Pyoderma | Pyodermite | 농피증 |
| `L21.9` | Seborrhoeic dermatitis | Dermite séborrhéique | 지루 피부염 |
| `L28.2` | Prurigo | Prurigo | 양진 |
| `L42` | Pityriasis rosea | Pityriasis rosé de Gibert | 장미색 비강진 |
| `L63.9` | Alopecia areata | Pelade | 원형 탈모증 |
| `L73.2` | Hidradenitis | Hidrosadénite | 화농성 한선염 |
| `L80` | Vitiligo | Vitiligo | 백반증 |
| `L81.1` | Melasma | Chloasma (mélasma) | 기미 |
| `L84` | Corns and calluses | Cors et durillons | 티눈·굳은살 |
| `D18.0` | Haemangioma | Hémangiome | 혈관종 |
| `S00.9` | Minor head injury (bruise, graze) | Contusion ou plaie superficielle de la tête | 머리 표재성 손상 |
| `S01.0` | Wound of the scalp | Plaie du cuir chevelu | 두피 열상 |
| `S20.2` | Bruised chest | Contusion du thorax | 흉부 타박상 |
| `S51.9` | Wound of the forearm | Plaie de l'avant-bras | 아래팔 열상 |
| `S80.0` | Bruised knee | Contusion du genou | 무릎 타박상 |
| `S91.3` | Wound of the foot | Plaie du pied | 발 열상 |
| `T17.1` | Foreign body in the nose | Corps étranger du nez | 코 이물 |
| `T18.9` | Swallowed foreign body | Corps étranger avalé (tube digestif) | 소화관 이물 |
| `T51.0` | Alcohol poisoning | Intoxication alcoolique aiguë | 에탄올 중독 |
| `T65.9` | Poisoning, substance not known | Intoxication, produit non précisé | 중독(물질 미상) |
| `T67.0` | Heatstroke | Coup de chaleur | 열사병 |
| `T78.3` | Angioedema | Œdème de Quincke | 혈관부종 |
| `R40.2` | Coma | Coma | 혼수 |
| `R57.9` | Shock | État de choc | 쇼크 |
| `H01.0` | Blepharitis | Blépharite | 눈꺼풀염 |
| `H16.9` | Keratitis | Kératite | 각막염 |
| `H26.9` | Cataract | Cataracte | 백내장 |
| `H52.1` | Short sight | Myopie | 근시 |
| `H52.4` | Presbyopia | Presbytie | 노안 |
| `H65.9` | Otitis media with effusion | Otite séreuse (otite moyenne non suppurée) | 삼출성 중이염 |
| `H72.9` | Perforated eardrum | Perforation du tympan | 고막 천공 |
| `H92.0` | Earache | Otalgie (douleur d'oreille) | 귀 통증 |
| `J34.2` | Deviated nasal septum | Déviation de la cloison nasale | 비중격 만곡 |
| `J35.3` | Enlarged tonsils and adenoids | Hypertrophie des amygdales et des végétations | 편도·아데노이드 비대 |
| `J36` | Peritonsillar abscess | Abcès périamygdalien (phlegmon) | 편도주위 농양 |
| `K01.1` | Impacted tooth | Dent incluse | 매복치 |
| `K05.3` | Chronic periodontitis | Parodontite chronique | 만성 치주염 |
| `F31.9` | Bipolar disorder | Trouble bipolaire | 양극성 장애 |
| `F43.1` | Post-traumatic stress disorder | État de stress post-traumatique | 외상후 스트레스 장애 |
| `Z02.0` | Check-up for school admission | Examen pour admission scolaire | 입학용 건강검진 |
| `Z02.4` | Check-up for a driving licence | Examen pour le permis de conduire | 운전면허용 건강검진 |
