-- ============================================================
--  약속처방 (Order Sets) — 묶음 처방/오더 세트
--  set 하나에 약(drug) + 검사/영상/처치(order) 항목을 담아두고,
--  진료 화면에서 한 번에 처방으로 불러온다.
--  CREATE TABLE IF NOT EXISTS 라서 기존 DB에 그대로 실행해도 안전.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_set (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    group_name    VARCHAR(100),
    department_id INTEGER REFERENCES department(id),
    description   TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_set_item (
    id            SERIAL PRIMARY KEY,
    set_id        INTEGER NOT NULL REFERENCES order_set(id) ON DELETE CASCADE,
    kind          VARCHAR(10) NOT NULL CHECK (kind IN ('drug','order')),
    drug_id       INTEGER REFERENCES drug(id),
    order_code_id INTEGER REFERENCES order_code(id),
    code          VARCHAR(20),
    name          VARCHAR(200),
    dose          VARCHAR(20),
    frequency     INTEGER DEFAULT 1,
    days          INTEGER DEFAULT 1,
    route         VARCHAR(10),
    quantity      DECIMAL(10,3) DEFAULT 1,
    sort_order    INTEGER DEFAULT 0
);

-- 기존 DB(이미 004를 group_name 없이 돌린 경우)에도 컬럼 보강
ALTER TABLE order_set ADD COLUMN IF NOT EXISTS group_name VARCHAR(100);

-- 예시 세트는 order_set 이 비어있을 때만 한 번 넣는다 (재실행 안전)
DO $$
DECLARE sid INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM order_set) THEN
    -- 1) Malaria Workup  (폴더: Infection)
    INSERT INTO order_set (name, group_name, department_id, description)
      VALUES ('Malaria Workup', 'Infection', (SELECT id FROM department WHERE code='INT'), 'RDT + CBC + ACT + antipyretic') RETURNING id INTO sid;
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,1 FROM order_code WHERE code='L04';
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,2 FROM order_code WHERE code='L01';
    INSERT INTO order_set_item (set_id,kind,drug_id,code,name,dose,frequency,days,route,sort_order) SELECT sid,'drug',id,code,name,default_dose,default_freq,default_days,default_route,3 FROM drug WHERE code='ACT01';
    INSERT INTO order_set_item (set_id,kind,drug_id,code,name,dose,frequency,days,route,sort_order) SELECT sid,'drug',id,code,name,default_dose,default_freq,default_days,default_route,4 FROM drug WHERE code='PCM500';

    -- 2) Basic Labs  (폴더: Blood Tests)
    INSERT INTO order_set (name, group_name, description) VALUES ('Basic Labs', 'Blood Tests', 'CBC + Fasting Glucose + Urinalysis') RETURNING id INTO sid;
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,1 FROM order_code WHERE code='L01';
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,2 FROM order_code WHERE code='L02';
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,3 FROM order_code WHERE code='L06';

    -- 3) Diarrhea / GE  (폴더: GI)
    INSERT INTO order_set (name, group_name, department_id, description) VALUES ('Diarrhea / GE', 'GI', (SELECT id FROM department WHERE code='FM'), 'ORS + Metronidazole + Urinalysis') RETURNING id INTO sid;
    INSERT INTO order_set_item (set_id,kind,drug_id,code,name,dose,frequency,days,route,sort_order) SELECT sid,'drug',id,code,name,default_dose,default_freq,default_days,default_route,1 FROM drug WHERE code='ORS';
    INSERT INTO order_set_item (set_id,kind,drug_id,code,name,dose,frequency,days,route,sort_order) SELECT sid,'drug',id,code,name,default_dose,default_freq,default_days,default_route,2 FROM drug WHERE code='METRO';
    INSERT INTO order_set_item (set_id,kind,order_code_id,code,name,quantity,sort_order) SELECT sid,'order',id,code,name,1,3 FROM order_code WHERE code='L06';
  END IF;
END $$;
