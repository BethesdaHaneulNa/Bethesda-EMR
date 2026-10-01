-- 039 (settings; session number 701): phrase categories become data, and a
-- phrase is one sentence.
--
-- The director, 2026-10-01, looking at Settings > phrases and the consultation screen's
-- list: one name for the two, one sentence per phrase instead of one per language, and
-- categories the clinic can make itself. Until now the categories were five fixed codes
-- (General, Internal, Surgery, Peds, OBGYN) written in the screens, plus "Custom".
--
-- 1. phrase_category: name (one name, no per-language names), order, in use or not.
--    Filled once, when the table is empty: the five fixed categories in their order, then
--    any other category a phrase already carries (active or not), by name. Guarded by
--    "table is empty" and not by name, so running this again after the clinic renamed
--    "General" does not bring "General" back.
-- 2. phrase_dictionary.category_id points at it. The old text column `category` stays and
--    is kept equal to the category's name by the API (admin.routes.js), because the
--    consultation screen reads and filters on it.
-- 3. A phrase whose main text is empty but which has a French or English text gets that
--    text as its main text (French first: the clinic works in French). text_fr and
--    text_en keep their data and are no longer read or written.
--
-- Adds a table, a column and an index; step 3 is the only change to existing values and
-- touches only rows whose main text is empty. Safe to run more than once.

CREATE TABLE IF NOT EXISTS phrase_category (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(60) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One category of a name among those in use (a removed one may be made again).
CREATE UNIQUE INDEX IF NOT EXISTS phrase_category_name_active_key
    ON phrase_category (lower(name)) WHERE is_active;

INSERT INTO phrase_category (name, sort_order)
SELECT c.name, c.ord
  FROM (
        SELECT v.name, v.ord
          FROM (VALUES ('General', 1), ('Internal', 2), ('Surgery', 3), ('Peds', 4), ('OBGYN', 5)) AS v(name, ord)
        UNION ALL
        SELECT x.category, 5 + (ROW_NUMBER() OVER (ORDER BY lower(x.category)))::int
          FROM (SELECT DISTINCT ON (lower(btrim(category))) btrim(category) AS category
                  FROM phrase_dictionary
                 WHERE btrim(category) <> ''
                   AND lower(btrim(category)) NOT IN ('general', 'internal', 'surgery', 'peds', 'obgyn')
                 ORDER BY lower(btrim(category)), id) x
       ) c
 WHERE NOT EXISTS (SELECT 1 FROM phrase_category)
 ORDER BY c.ord;

ALTER TABLE phrase_dictionary ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES phrase_category(id);

UPDATE phrase_dictionary p
   SET category_id = pc.id
  FROM phrase_category pc
 WHERE p.category_id IS NULL
   AND lower(pc.name) = lower(btrim(p.category))
   AND pc.is_active;

CREATE INDEX IF NOT EXISTS idx_phrase_dictionary_category ON phrase_dictionary (category_id);

UPDATE phrase_dictionary
   SET text = COALESCE(NULLIF(btrim(text_fr), ''), NULLIF(btrim(text_en), ''))
 WHERE btrim(COALESCE(text, '')) = ''
   AND COALESCE(NULLIF(btrim(text_fr), ''), NULLIF(btrim(text_en), '')) IS NOT NULL;
