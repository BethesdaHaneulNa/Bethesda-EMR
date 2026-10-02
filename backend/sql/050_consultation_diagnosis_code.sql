-- 050 (consultation): the list of
-- frequent diagnoses, and two columns on the diagnosis lines.
--
-- Feedback from the clinic (2026-10-02): the consultation screen had nowhere to enter a
-- diagnosis. Decided with the director: the diagnosis NAME is what the clinic needs (the
-- medical certificate, the referral letter, the patient's earlier diagnoses, disease
-- statistics); the CODE is not required (no insurance). The doctor picks from a list of
-- frequent diagnoses that already carry their ICD-10 code, or types the diagnosis freely,
-- which is then saved without a code.
--
-- diagnosis_code - the list. One row per diagnosis, with its name in the three screen
--   languages. `code` is free text (ICD-10 / CIM-10 to begin with; not tied to a coding
--   system, not unique - the clinic may want two wordings under one code) and may be
--   empty. is_active false hides a row from the search and keeps it for the lines that
--   already point at it. The list is managed in Settings (settings session); the
--   consultation screen only reads it (GET /api/consultations/diagnosis-codes).
-- diagnosis.diagnosis_code_id - the list row a line was picked from, NULL for a diagnosis
--   typed freely. The line keeps its own copy of the code and the name (icd_code,
--   diagnosis_name), so changing or removing a list row never rewrites a patient's record.
-- diagnosis.created_by - who entered the line (as prescription.prescribed_by).
--
-- Creates a table and adds two nullable columns; no existing row changes. The seed is
-- inserted only into an empty list, so running this again never brings back a row
-- Settings removed.
CREATE TABLE IF NOT EXISTS diagnosis_code (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20),
  name_en    VARCHAR(200) NOT NULL,
  name_fr    VARCHAR(200),
  name_ko    VARCHAR(200),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE diagnosis ADD COLUMN IF NOT EXISTS diagnosis_code_id INTEGER REFERENCES diagnosis_code(id) ON DELETE SET NULL;
ALTER TABLE diagnosis ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES staff(id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_consultation ON diagnosis (consultation_id);

-- 100 frequent outpatient diagnoses (ICD-10, WHO edition 2010 and later).
INSERT INTO diagnosis_code (code, name_en, name_fr, name_ko, sort_order)
SELECT v.code, v.name_en, v.name_fr, v.name_ko, v.sort_order
  FROM (VALUES
  ('B54', 'Malaria, unspecified', 'Paludisme, sans précision', '말라리아', 10),
  ('B50.9', 'Plasmodium falciparum malaria', 'Paludisme à Plasmodium falciparum', '열대열 말라리아', 20),
  ('A09', 'Gastroenteritis and colitis, infectious or unspecified', 'Gastro-entérite et colite, infectieuse ou sans précision', '위장염·대장염(감염성 또는 상세불명)', 30),
  ('A01.0', 'Typhoid fever', 'Fièvre typhoïde', '장티푸스', 40),
  ('A06.9', 'Amoebiasis, unspecified', 'Amibiase, sans précision', '아메바증', 50),
  ('B82.9', 'Intestinal parasitism, unspecified', 'Parasitose intestinale, sans précision', '장 기생충증', 60),
  ('B77.9', 'Ascariasis, unspecified', 'Ascaridiose, sans précision', '회충증', 70),
  ('B68.9', 'Taeniasis, unspecified', 'Téniase, sans précision', '조충증', 80),
  ('B69.9', 'Cysticercosis, unspecified', 'Cysticercose, sans précision', '낭미충증', 90),
  ('B65.9', 'Schistosomiasis, unspecified', 'Schistosomiase (bilharziose), sans précision', '주혈흡충증', 100),
  ('A16.2', 'Tuberculosis of lung, without bacteriological or histological confirmation', 'Tuberculose pulmonaire, sans confirmation bactériologique ou histologique', '폐결핵(세균학적·조직학적 확인 없음)', 110),
  ('B24', 'HIV disease, unspecified', 'Maladie due au VIH, sans précision', 'HIV 감염', 120),
  ('B18.1', 'Chronic viral hepatitis B without delta-agent', 'Hépatite virale chronique B sans agent delta', '만성 B형간염', 130),
  ('A53.9', 'Syphilis, unspecified', 'Syphilis, sans précision', '매독', 140),
  ('A54.9', 'Gonococcal infection, unspecified', 'Infection gonococcique, sans précision', '임균 감염', 150),
  ('A64', 'Sexually transmitted disease, unspecified', 'Maladie sexuellement transmissible, sans précision', '성매개감염', 160),
  ('A20.9', 'Plague, unspecified', 'Peste, sans précision', '페스트', 170),
  ('B01.9', 'Varicella without complication', 'Varicelle sans complication', '수두', 180),
  ('B05.9', 'Measles without complication', 'Rougeole sans complication', '홍역', 190),
  ('B86', 'Scabies', 'Gale', '옴', 200),
  ('B35.9', 'Dermatophytosis (ringworm), unspecified', 'Dermatophytose (teigne), sans précision', '피부사상균증(백선)', 210),
  ('B37.3', 'Candidiasis of vulva and vagina', 'Candidose de la vulve et du vagin', '외음·질 칸디다증', 220),
  ('J00', 'Acute nasopharyngitis (common cold)', 'Rhinopharyngite aiguë (rhume)', '급성 비인두염(감기)', 230),
  ('J02.9', 'Acute pharyngitis, unspecified', 'Pharyngite aiguë, sans précision', '급성 인두염', 240),
  ('J03.9', 'Acute tonsillitis, unspecified', 'Amygdalite aiguë, sans précision', '급성 편도염', 250),
  ('J06.9', 'Acute upper respiratory infection, unspecified', 'Infection aiguë des voies respiratoires supérieures, sans précision', '급성 상기도감염', 260),
  ('J01.9', 'Acute sinusitis, unspecified', 'Sinusite aiguë, sans précision', '급성 부비동염', 270),
  ('J11.1', 'Influenza, virus not identified', 'Grippe, virus non identifié', '인플루엔자', 280),
  ('J20.9', 'Acute bronchitis, unspecified', 'Bronchite aiguë, sans précision', '급성 기관지염', 290),
  ('J21.9', 'Acute bronchiolitis, unspecified', 'Bronchiolite aiguë, sans précision', '급성 세기관지염', 300),
  ('J18.9', 'Pneumonia, unspecified', 'Pneumonie, sans précision', '폐렴', 310),
  ('J45.9', 'Asthma, unspecified', 'Asthme, sans précision', '천식', 320),
  ('J44.9', 'Chronic obstructive pulmonary disease, unspecified', 'Bronchopneumopathie chronique obstructive (BPCO), sans précision', '만성폐쇄성폐질환', 330),
  ('J30.4', 'Allergic rhinitis, unspecified', 'Rhinite allergique, sans précision', '알레르기 비염', 340),
  ('H66.9', 'Otitis media, unspecified', 'Otite moyenne, sans précision', '중이염', 350),
  ('H60.9', 'Otitis externa, unspecified', 'Otite externe, sans précision', '외이도염', 360),
  ('H10.9', 'Conjunctivitis, unspecified', 'Conjonctivite, sans précision', '결막염', 370),
  ('I10', 'Essential (primary) hypertension', 'Hypertension artérielle essentielle', '고혈압', 380),
  ('E11.9', 'Type 2 diabetes mellitus without complications', 'Diabète de type 2 sans complication', '제2형 당뇨병', 390),
  ('E10.9', 'Type 1 diabetes mellitus without complications', 'Diabète de type 1 sans complication', '제1형 당뇨병', 400),
  ('I50.9', 'Heart failure, unspecified', 'Insuffisance cardiaque, sans précision', '심부전', 410),
  ('I64', 'Stroke, not specified as haemorrhage or infarction', 'Accident vasculaire cérébral, non précisé hémorragique ou ischémique', '뇌졸중', 420),
  ('E78.5', 'Hyperlipidaemia, unspecified', 'Hyperlipidémie, sans précision', '고지혈증', 430),
  ('E46', 'Protein-energy malnutrition, unspecified', 'Malnutrition protéino-énergétique, sans précision', '단백질-에너지 영양실조', 440),
  ('D50.9', 'Iron deficiency anaemia, unspecified', 'Anémie par carence en fer, sans précision', '철결핍성 빈혈', 450),
  ('D64.9', 'Anaemia, unspecified', 'Anémie, sans précision', '빈혈', 460),
  ('K29.7', 'Gastritis, unspecified', 'Gastrite, sans précision', '위염', 470),
  ('K21.9', 'Gastro-oesophageal reflux disease without oesophagitis', 'Reflux gastro-œsophagien sans œsophagite', '위식도역류병', 480),
  ('K27.9', 'Peptic ulcer, without haemorrhage or perforation', 'Ulcère gastro-duodénal, sans hémorragie ni perforation', '소화성 궤양', 490),
  ('K30', 'Dyspepsia', 'Dyspepsie', '소화불량', 500),
  ('K59.0', 'Constipation', 'Constipation', '변비', 510),
  ('K37', 'Appendicitis, unspecified', 'Appendicite, sans précision', '충수염', 520),
  ('K40.9', 'Inguinal hernia, without obstruction or gangrene', 'Hernie inguinale, sans occlusion ni gangrène', '서혜부 탈장', 530),
  ('K42.9', 'Umbilical hernia, without obstruction or gangrene', 'Hernie ombilicale, sans occlusion ni gangrène', '배꼽 탈장', 540),
  ('K80.2', 'Calculus of gallbladder without cholecystitis', 'Calcul de la vésicule biliaire sans cholécystite', '담낭 결석', 550),
  ('K64.9', 'Haemorrhoids, unspecified', 'Hémorroïdes, sans précision', '치핵', 560),
  ('K60.3', 'Anal fistula', 'Fistule anale', '치루', 570),
  ('K02.9', 'Dental caries, unspecified', 'Carie dentaire, sans précision', '치아우식증', 580),
  ('N39.0', 'Urinary tract infection, site not specified', 'Infection des voies urinaires, siège non précisé', '요로감염', 590),
  ('N30.0', 'Acute cystitis', 'Cystite aiguë', '급성 방광염', 600),
  ('N10', 'Acute pyelonephritis (acute tubulo-interstitial nephritis)', 'Pyélonéphrite aiguë (néphrite tubulo-interstitielle aiguë)', '급성 신우신염', 610),
  ('N20.0', 'Calculus of kidney', 'Calcul du rein', '신장 결석', 620),
  ('N40', 'Hyperplasia of prostate', 'Hyperplasie de la prostate', '전립선 비대', 630),
  ('N43.3', 'Hydrocele, unspecified', 'Hydrocèle, sans précision', '음낭수종', 640),
  ('N76.0', 'Acute vaginitis', 'Vaginite aiguë', '급성 질염', 650),
  ('N73.9', 'Female pelvic inflammatory disease, unspecified', 'Maladie inflammatoire pelvienne de la femme, sans précision', '골반염', 660),
  ('N92.6', 'Irregular menstruation, unspecified', 'Menstruation irrégulière, sans précision', '월경불순', 670),
  ('N94.6', 'Dysmenorrhoea, unspecified', 'Dysménorrhée, sans précision', '월경통', 680),
  ('D25.9', 'Leiomyoma of uterus, unspecified', 'Léiomyome de l''utérus (fibrome), sans précision', '자궁근종', 690),
  ('N63', 'Lump in breast, unspecified', 'Masse du sein, sans précision', '유방 종괴', 700),
  ('Z34.9', 'Supervision of normal pregnancy', 'Surveillance d''une grossesse normale', '정상 임신 관리', 710),
  ('O21.9', 'Vomiting of pregnancy, unspecified', 'Vomissements de la grossesse, sans précision', '임신 구토', 720),
  ('O03.9', 'Spontaneous abortion, complete or unspecified, without complication', 'Avortement spontané, complet ou sans précision, sans complication', '자연유산', 730),
  ('O14.9', 'Pre-eclampsia, unspecified', 'Pré-éclampsie, sans précision', '전자간증', 740),
  ('Z30.9', 'Contraceptive management, unspecified', 'Prise en charge d''une contraception, sans précision', '피임 관리', 750),
  ('P59.9', 'Neonatal jaundice, unspecified', 'Ictère néonatal, sans précision', '신생아 황달', 760),
  ('L02.9', 'Cutaneous abscess, furuncle and carbuncle, unspecified', 'Abcès cutané, furoncle et anthrax, sans précision', '피부 농양·종기', 770),
  ('L03.9', 'Cellulitis, unspecified', 'Phlegmon (cellulite), sans précision', '봉와직염', 780),
  ('L01.0', 'Impetigo', 'Impétigo', '농가진', 790),
  ('L30.9', 'Dermatitis, unspecified', 'Dermite (eczéma), sans précision', '피부염', 800),
  ('L50.9', 'Urticaria, unspecified', 'Urticaire, sans précision', '두드러기', 810),
  ('L72.0', 'Epidermal cyst', 'Kyste épidermique', '표피낭', 820),
  ('D17.9', 'Lipoma (benign lipomatous neoplasm), unspecified', 'Lipome (tumeur lipomateuse bénigne), sans précision', '지방종', 830),
  ('M54.5', 'Low back pain', 'Lombalgie basse', '요통', 840),
  ('M25.5', 'Pain in joint', 'Douleur articulaire', '관절통', 850),
  ('M19.9', 'Arthrosis, unspecified', 'Arthrose, sans précision', '관절증', 860),
  ('G43.9', 'Migraine, unspecified', 'Migraine, sans précision', '편두통', 870),
  ('G40.9', 'Epilepsy, unspecified', 'Épilepsie, sans précision', '뇌전증', 880),
  ('F32.9', 'Depressive episode, unspecified', 'Épisode dépressif, sans précision', '우울 에피소드', 890),
  ('F41.9', 'Anxiety disorder, unspecified', 'Trouble anxieux, sans précision', '불안장애', 900),
  ('T14.1', 'Open wound, body region unspecified', 'Plaie ouverte, région du corps non précisée', '열린 상처', 910),
  ('T14.0', 'Superficial injury (contusion), body region unspecified', 'Lésion traumatique superficielle (contusion), région du corps non précisée', '표재성 손상(타박상)', 920),
  ('T14.2', 'Fracture, body region unspecified', 'Fracture, région du corps non précisée', '골절', 930),
  ('T14.3', 'Dislocation, sprain and strain, body region unspecified', 'Luxation, entorse et foulure, région du corps non précisée', '탈구·염좌', 940),
  ('T30.0', 'Burn, body region and degree unspecified', 'Brûlure, partie du corps et degré non précisés', '화상', 950),
  ('R50.9', 'Fever, unspecified', 'Fièvre, sans précision', '발열', 960),
  ('R51', 'Headache', 'Céphalée', '두통', 970),
  ('R05', 'Cough', 'Toux', '기침', 980),
  ('R10.4', 'Abdominal pain, other and unspecified', 'Douleurs abdominales, autres et non précisées', '복통', 990),
  ('R11', 'Nausea and vomiting', 'Nausées et vomissements', '구역·구토', 1000)
  ) AS v(code, name_en, name_fr, name_ko, sort_order)
 WHERE NOT EXISTS (SELECT 1 FROM diagnosis_code);
