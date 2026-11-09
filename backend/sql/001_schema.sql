-- Bethesda EMR Database Schema
-- PostgreSQL 16

-- ═══ 1. CLINIC ═══
CREATE TABLE clinic (
    id              SERIAL PRIMARY KEY,
    app_title       VARCHAR(100) DEFAULT 'Bethesda EMR',
    name            VARCHAR(200) NOT NULL DEFAULT 'Bethesda Clinic',
    name_en         VARCHAR(200),
    name_fr         VARCHAR(200),
    address         TEXT DEFAULT 'Antananarivo, Madagascar',
    phone           VARCHAR(50),
    email           VARCHAR(100),
    working_hours   VARCHAR(200) DEFAULT 'Mon-Fri 08:00-17:00',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 2. DEPARTMENT ═══
CREATE TABLE department (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(10) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    name_fr         VARCHAR(100),
    head_doctor_id  INTEGER,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 3. STAFF ═══
CREATE TABLE staff (
    id              SERIAL PRIMARY KEY,
    login_id        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('frontdesk','doctor','pharmacy','lab','admin')),
    permissions     TEXT[],
    department_id   INTEGER REFERENCES department(id),
    phone           VARCHAR(50),
    email           VARCHAR(100),
    status          VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for department head
ALTER TABLE department ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_doctor_id) REFERENCES staff(id);

-- ═══ 4. PATIENT ═══
CREATE TABLE patient (
    id              SERIAL PRIMARY KEY,
    chart_no        VARCHAR(20) UNIQUE NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    national_id     VARCHAR(50),
    date_of_birth   DATE,
    gender          VARCHAR(1) CHECK (gender IN ('M','F')),
    phone           VARCHAR(50),
    mobile          VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    region          VARCHAR(100),
    blood_type      VARCHAR(5),
    allergies       TEXT,
    reception_note  TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_patient_chart ON patient(chart_no);
CREATE INDEX idx_patient_name ON patient(last_name, first_name);

-- ═══ 5. VISIT ═══
CREATE TABLE visit (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_type      VARCHAR(20) NOT NULL DEFAULT 'newVisit',
    department_id   INTEGER REFERENCES department(id),
    doctor_id       INTEGER REFERENCES staff(id),
    reception_time  TIME,
    chief_complaint TEXT,
    reception_memo  TEXT,
    status          VARCHAR(20) DEFAULT 'registered'
                    CHECK (status IN ('registered','waiting','in_progress','completed','cancelled')),
    registered_by   INTEGER REFERENCES staff(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_visit_patient ON visit(patient_id);
CREATE INDEX idx_visit_date ON visit(visit_date);
CREATE INDEX idx_visit_status ON visit(status);

-- ═══ 6. CONSULTATION ═══
CREATE TABLE consultation (
    id              SERIAL PRIMARY KEY,
    visit_id        INTEGER NOT NULL REFERENCES visit(id),
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    doctor_id       INTEGER NOT NULL REFERENCES staff(id),
    department_id   INTEGER REFERENCES department(id),
    consult_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    subjective      TEXT,
    objective       TEXT,
    assessment      TEXT,
    plan            TEXT,
    note_text       TEXT,
    bp_systolic     INTEGER,
    bp_diastolic    INTEGER,
    temperature     DECIMAL(4,1),
    pulse           INTEGER,
    spo2            INTEGER,
    respiratory_rate INTEGER,
    weight          DECIMAL(5,1),
    height          DECIMAL(5,1),
    status          VARCHAR(20) DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','signed')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_consult_visit_unique ON consultation(visit_id);
CREATE INDEX idx_consult_patient ON consultation(patient_id);
CREATE INDEX idx_consult_date ON consultation(consult_date);

-- ═══ 7. DIAGNOSIS ═══
CREATE TABLE diagnosis (
    id              SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
    icd_code        VARCHAR(20),
    diagnosis_name  TEXT NOT NULL,
    diagnosis_type  VARCHAR(10) DEFAULT 'primary',
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 8. DRUG ═══
CREATE TABLE drug (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    name_en         VARCHAR(200),
    generic_name    VARCHAR(200),
    category        VARCHAR(50),
    default_dose    VARCHAR(20) DEFAULT '1.000',
    default_freq    INTEGER DEFAULT 1,
    default_days    INTEGER DEFAULT 1,
    default_route   VARCHAR(10) DEFAULT 'QD',
    unit_price      DECIMAL(12,2) DEFAULT 0,
    stock_qty       INTEGER DEFAULT 0,
    min_stock       INTEGER DEFAULT 10,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_drug_code ON drug(code);

-- ═══ 9. PRESCRIPTION ═══
CREATE TABLE prescription (
    id              SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
    drug_id         INTEGER REFERENCES drug(id),
    drug_code       VARCHAR(20),
    drug_name       VARCHAR(200) NOT NULL,
    dose            VARCHAR(20),
    frequency       INTEGER DEFAULT 1,
    days            INTEGER DEFAULT 1,
    route           VARCHAR(10),
    total_qty       DECIMAL(10,3),
    unit_price      DECIMAL(12,2),
    memo            TEXT,
    dispense_type   VARCHAR(10) DEFAULT 'internal',
    status          VARCHAR(20) DEFAULT 'ordered'
                    CHECK (status IN ('ordered','dispensed','cancelled')),
    dispensed_by    INTEGER REFERENCES staff(id),
    dispensed_at    TIMESTAMPTZ,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rx_consult ON prescription(consultation_id);

-- ═══ 10. ORDER CODE MASTER ═══
CREATE TABLE order_code (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    name_en         VARCHAR(200),
    code_type       VARCHAR(20) NOT NULL CHECK (code_type IN ('fee','lab','imaging','procedure')),
    group_name      VARCHAR(50),
    default_dose    VARCHAR(20) DEFAULT '1.000',
    default_freq    INTEGER DEFAULT 1,
    default_days    INTEGER DEFAULT 1,
    price           DECIMAL(12,2) DEFAULT 0,
    price_clinic    DECIMAL(12,2) DEFAULT 0,
    pacs_modality   VARCHAR(10),
    worklist_enabled BOOLEAN DEFAULT FALSE,
    station_ae      VARCHAR(50),
    body_part       VARCHAR(50),
    memo            TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_oc_code ON order_code(code);
CREATE INDEX idx_oc_type ON order_code(code_type);

-- ═══ 11. ORDER ITEM ═══
CREATE TABLE order_item (
    id              SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
    visit_id        INTEGER NOT NULL REFERENCES visit(id),
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    order_code_id   INTEGER REFERENCES order_code(id),
    order_code      VARCHAR(20),
    order_name      VARCHAR(200) NOT NULL,
    code_type       VARCHAR(20),
    dose            VARCHAR(20),
    frequency       INTEGER DEFAULT 1,
    days            INTEGER DEFAULT 1,
    quantity        DECIMAL(10,3) DEFAULT 1,
    unit_price      DECIMAL(12,2),
    pacs_modality   VARCHAR(10),
    station_ae      VARCHAR(50),
    body_part       VARCHAR(50),
    worklist_status VARCHAR(20) DEFAULT 'pending'
                    CHECK (worklist_status IN ('pending','sent','in_progress','completed','cancelled')),
    worklist_sent_at TIMESTAMPTZ,
    scheduled_date  DATE,
    scheduled_time  TIME,
    result_text     TEXT,
    result_by       INTEGER REFERENCES staff(id),
    result_at       TIMESTAMPTZ,
    ordered_by      INTEGER REFERENCES staff(id),
    status          VARCHAR(20) DEFAULT 'ordered'
                    CHECK (status IN ('ordered','scheduled','in_progress','completed','cancelled')),
    memo            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_oi_patient ON order_item(patient_id);
CREATE INDEX idx_oi_worklist ON order_item(worklist_status);
CREATE INDEX idx_oi_modality ON order_item(pacs_modality);

-- ═══ 12. BILLING ═══
CREATE TABLE billing (
    id              SERIAL PRIMARY KEY,
    visit_id        INTEGER NOT NULL REFERENCES visit(id),
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    receipt_no      VARCHAR(30) UNIQUE,
    billing_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    consult_fee     DECIMAL(12,2) DEFAULT 0,
    drug_total      DECIMAL(12,2) DEFAULT 0,
    procedure_total DECIMAL(12,2) DEFAULT 0,
    subtotal        DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type   VARCHAR(10) DEFAULT 'amount',
    discount_value  DECIMAL(12,2) DEFAULT 0,
    previous_balance DECIMAL(12,2) DEFAULT 0,
    total_due       DECIMAL(12,2) DEFAULT 0,
    amount_paid     DECIMAL(12,2) DEFAULT 0,
    change_amount   DECIMAL(12,2) DEFAULT 0,
    outstanding     DECIMAL(12,2) DEFAULT 0,
    payment_method  VARCHAR(20) DEFAULT 'cash',
    payment_status  VARCHAR(20) DEFAULT 'waiting'
                    CHECK (payment_status IN ('waiting','paid','partial','unpaid','waived','cancelled')),
    note            TEXT,
    cashier_id      INTEGER REFERENCES staff(id),
    cancelled_at    TIMESTAMPTZ,
    cancelled_by    INTEGER REFERENCES staff(id),
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bill_patient ON billing(patient_id);
CREATE INDEX idx_bill_date ON billing(billing_date);
CREATE INDEX idx_bill_status ON billing(payment_status);

-- ═══ 13. BILLING ITEM ═══
CREATE TABLE billing_item (
    id              SERIAL PRIMARY KEY,
    billing_id      INTEGER NOT NULL REFERENCES billing(id) ON DELETE CASCADE,
    item_type       VARCHAR(20) NOT NULL,
    item_name       VARCHAR(200) NOT NULL,
    item_code       VARCHAR(20),
    quantity        DECIMAL(10,3) DEFAULT 1,
    unit_price      DECIMAL(12,2) DEFAULT 0,
    total_price     DECIMAL(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 14. PHRASE DICTIONARY ═══
CREATE TABLE phrase_dictionary (
    id              SERIAL PRIMARY KEY,
    category        VARCHAR(30) NOT NULL,
    text            TEXT NOT NULL,
    text_en         TEXT,
    text_fr         TEXT,
    created_by      INTEGER REFERENCES staff(id),
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 15. WORKLIST LOG ═══
CREATE TABLE worklist_log (
    id              SERIAL PRIMARY KEY,
    order_item_id   INTEGER NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    modality        VARCHAR(10) NOT NULL,
    station_ae      VARCHAR(50),
    body_part       VARCHAR(50),
    accession_no    VARCHAR(50),
    study_instance_uid VARCHAR(128),
    scheduled_date  DATE,
    scheduled_time  TIME,
    status          VARCHAR(20) DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_wl_modality ON worklist_log(modality);
CREATE INDEX idx_wl_status ON worklist_log(status);

-- ═══ CHART NUMBER SEQUENCE ═══
CREATE SEQUENCE chart_no_seq START WITH 1;

-- Function to generate chart numbers like '26-00001'
CREATE OR REPLACE FUNCTION generate_chart_no() RETURNS VARCHAR AS $$
DECLARE
    yr TEXT;
    seq_val INTEGER;
BEGIN
    yr := TO_CHAR(NOW(), 'YY');
    seq_val := NEXTVAL('chart_no_seq');
    RETURN yr || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ═══ 16. PACS / DICOM INTEGRATION CONFIG ═══
CREATE TABLE IF NOT EXISTS pacs_config (
    id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    worklist_scp_host      VARCHAR(100) DEFAULT '',
    worklist_scp_port      INTEGER DEFAULT 4242,
    worklist_scp_ae        VARCHAR(50) DEFAULT 'MEDCONNECT',
    bridge_token           VARCHAR(100) DEFAULT 'change-me-bridge-token',
    emr_base_url          VARCHAR(200) DEFAULT '',
    pacs_viewer_url        VARCHAR(200) DEFAULT '',
    auto_create_worklist   BOOLEAN DEFAULT TRUE,
    facility_name          VARCHAR(100) DEFAULT 'Bethesda Clinic',
    notes                  TEXT,
    updated_by             INTEGER REFERENCES staff(id),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pacs_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ═══ 17. DOCUMENT LOG (발급대장) ═══
CREATE TABLE IF NOT EXISTS document_log (
    id              SERIAL PRIMARY KEY,
    doc_no          VARCHAR(30) UNIQUE,
    template_code   VARCHAR(40) NOT NULL,
    template_name   VARCHAR(200),
    patient_id      INTEGER NOT NULL REFERENCES patient(id),
    visit_id        INTEGER REFERENCES visit(id),
    consultation_id INTEGER REFERENCES consultation(id),
    lang            VARCHAR(5) DEFAULT 'fr',
    payload         JSONB NOT NULL DEFAULT '{}',
    issued_by       INTEGER REFERENCES staff(id),
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    voided          BOOLEAN DEFAULT FALSE,
    void_reason     TEXT,
    voided_at       TIMESTAMPTZ,
    voided_by       INTEGER REFERENCES staff(id)
);
CREATE INDEX idx_doclog_patient ON document_log(patient_id);
CREATE INDEX idx_doclog_template ON document_log(template_code);

CREATE SEQUENCE document_no_seq START WITH 1;
CREATE OR REPLACE FUNCTION generate_doc_no() RETURNS VARCHAR AS $$
DECLARE
    yr TEXT;
    seq_val INTEGER;
BEGIN
    yr := TO_CHAR(NOW(), 'YY');
    seq_val := NEXTVAL('document_no_seq');
    RETURN 'D' || yr || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ═══ 18. LAB (clinical pathology) ═══
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
CREATE INDEX idx_lti_code ON lab_test_item(order_code_id);

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
CREATE INDEX idx_labres_patient ON lab_result(patient_id);
CREATE INDEX idx_labres_order ON lab_result(order_item_id);
