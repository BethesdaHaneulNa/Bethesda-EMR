-- 014: Clinical pathology (lab) — test-item master + entered results.
-- Safe to run multiple times. Seeds reference items for existing lab panels
-- only when a panel has no items yet (won't clobber edits).

CREATE TABLE IF NOT EXISTS lab_test_item (
    id              SERIAL PRIMARY KEY,
    order_code_id   INTEGER NOT NULL REFERENCES order_code(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    unit            VARCHAR(30),
    ref_low         NUMERIC,
    ref_high        NUMERIC,
    ref_text        VARCHAR(60),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lti_code ON lab_test_item(order_code_id);

CREATE TABLE IF NOT EXISTS lab_result (
    id               SERIAL PRIMARY KEY,
    order_item_id    INTEGER NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,
    lab_test_item_id INTEGER REFERENCES lab_test_item(id) ON DELETE SET NULL,
    visit_id         INTEGER REFERENCES visit(id),
    patient_id       INTEGER NOT NULL REFERENCES patient(id),
    name             VARCHAR(120) NOT NULL,
    value            VARCHAR(60),
    unit             VARCHAR(30),
    ref_low          NUMERIC,
    ref_high         NUMERIC,
    ref_text         VARCHAR(60),
    flag             VARCHAR(10),
    comment          TEXT,
    result_date      DATE,
    result_by        INTEGER REFERENCES staff(id),
    result_at        TIMESTAMPTZ DEFAULT NOW(),
    sort_order       INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_labres_patient ON lab_result(patient_id);
CREATE INDEX IF NOT EXISTS idx_labres_order ON lab_result(order_item_id);

-- ── seed reference items per panel (idempotent: only if panel has none) ──
DO $$
DECLARE
  panels JSONB := '[
    {"code":"L01","items":[["WBC","10^9/L",4.0,10.0,null],["RBC","10^12/L",4.0,5.5,null],["Hb","g/dL",13.0,17.0,null],["Hct","%",40,50,null],["Platelet","10^9/L",150,400,null]]},
    {"code":"L02","items":[["Glucose (FBS)","mg/dL",70,100,null]]},
    {"code":"L03","items":[["Total Cholesterol","mg/dL",0,200,null],["Triglycerides","mg/dL",0,150,null],["HDL","mg/dL",40,60,null],["LDL","mg/dL",0,130,null]]},
    {"code":"L04","items":[["Malaria RDT","",null,null,"Negative"]]},
    {"code":"L05","items":[["HbA1c","%",4.0,5.6,null]]},
    {"code":"L06","items":[["pH","",5.0,8.0,null],["Protein","",null,null,"Negative"],["Glucose","",null,null,"Negative"],["Leukocytes","",null,null,"Negative"],["Blood","",null,null,"Negative"]]},
    {"code":"L07","items":[["AST (SGOT)","U/L",5,40,null],["ALT (SGPT)","U/L",5,40,null],["ALP","U/L",40,130,null],["Total Bilirubin","mg/dL",0.1,1.2,null],["Albumin","g/dL",3.5,5.0,null]]},
    {"code":"L08","items":[["Creatinine","mg/dL",0.6,1.2,null],["BUN","mg/dL",7,20,null],["Uric Acid","mg/dL",3.5,7.2,null],["eGFR","mL/min",90,null,null]]}
  ]'::jsonb;
  p JSONB; it JSONB; ocid INTEGER; i INTEGER;
BEGIN
  FOR p IN SELECT * FROM jsonb_array_elements(panels) LOOP
    SELECT id INTO ocid FROM order_code WHERE code = (p->>'code');
    IF ocid IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM lab_test_item WHERE order_code_id = ocid) THEN CONTINUE; END IF;
    i := 0;
    FOR it IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
      i := i + 1;
      INSERT INTO lab_test_item (order_code_id, name, unit, ref_low, ref_high, ref_text, sort_order)
      VALUES (
        ocid,
        it->>0,
        NULLIF(it->>1,''),
        CASE WHEN it->2 = 'null'::jsonb THEN NULL ELSE (it->>2)::numeric END,
        CASE WHEN it->3 = 'null'::jsonb THEN NULL ELSE (it->>3)::numeric END,
        CASE WHEN it->4 = 'null'::jsonb THEN NULL ELSE it->>4 END,
        i
      );
    END LOOP;
  END LOOP;
END $$;
