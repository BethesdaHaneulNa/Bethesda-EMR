-- 060 (1.7.13): drug categories become data the clinic keeps itself.
--
-- The clinic's manager, 2026-11-09, from the site: a new class was needed (anaesthetics)
-- and the list was seventeen fixed English words written in the Settings screen
-- (DRUG_CATEGORIES), so nothing could be added without an update. From now on the
-- categories are rows: a key (what drug.category stores - the same English word as
-- before, so no drug changes), a name in French, Korean and English, an order, and
-- "hidden" for a class the clinic no longer offers in the form but that older drugs may
-- still carry. drug.category stays a plain text column, no foreign key: a value that is
-- not in the table is still shown (as its key) and nothing refuses to open.
--
-- Filled once: the seventeen keys the screens knew, in the order they were listed
-- ('Other' last), then 'Anesthetic' - the first class asked for on site - and finally
-- any other value a drug already carries, as its own row named by its key. Guarded by
-- the key, so running this again after the clinic renamed a class keeps the new name.
CREATE TABLE IF NOT EXISTS drug_category (
    key         VARCHAR(50) PRIMARY KEY,
    name_fr     VARCHAR(60) NOT NULL,
    name_ko     VARCHAR(60),
    name_en     VARCHAR(60),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO drug_category (key, name_fr, name_ko, name_en, sort_order) VALUES
  ('Analgesic',       'Antalgique',           '진통제',        'Analgesic',        10),
  ('Anesthetic',      'Anesthésie',           '마취제',        'Anesthetic',       15),
  ('Antibiotic',      'Antibiotique',         '항생제',        'Antibiotic',       20),
  ('Antihistamine',   'Antihistaminique',     '항히스타민',    'Antihistamine',    30),
  ('Antimalarial',    'Antipaludique',        '항말라리아제',  'Antimalarial',     40),
  ('Antiparasitic',   'Antiparasitaire',      '구충·항기생충', 'Antiparasitic',    50),
  ('Cardiovascular',  'Cardiovasculaire',     '심혈관',        'Cardiovascular',   60),
  ('Corticosteroid',  'Corticoïde',           '스테로이드',    'Corticosteroid',   70),
  ('Dermatology',     'Dermatologie',         '피부',          'Dermatology',      80),
  ('Endocrine',       'Endocrinologie',       '내분비',        'Endocrine',        90),
  ('GI',              'Gastro-intestinal',    '소화기',        'Gastro-intestinal', 100),
  ('Gynecology',      'Gynécologie',          '산부인과',      'Gynecology',       110),
  ('Musculoskeletal', 'Musculo-squelettique', '근골격',        'Musculoskeletal',  120),
  ('Ophthalmic',      'Ophtalmologie',        '안과',          'Ophthalmic',       130),
  ('Respiratory',     'Respiratoire',         '호흡기',        'Respiratory',      140),
  ('Urology',         'Urologie',             '비뇨기',        'Urology',          150),
  ('Vitamin',         'Vitamine',             '비타민',        'Vitamin',          160),
  ('Other',           'Autre',                '기타',          'Other',            999)
ON CONFLICT (key) DO NOTHING;

-- A class some drug already carries that the screens never listed: kept, named by its key,
-- before 'Other'.
INSERT INTO drug_category (key, name_fr, name_ko, name_en, sort_order)
SELECT DISTINCT d.category, d.category, d.category, d.category, 900
  FROM drug d
 WHERE d.category IS NOT NULL AND btrim(d.category) <> ''
ON CONFLICT (key) DO NOTHING;
