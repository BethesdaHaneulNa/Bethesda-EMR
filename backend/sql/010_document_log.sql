-- 010: Document issuance log (발급대장) — referral letters, certificates, etc.
-- Safe to run multiple times.

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
CREATE INDEX IF NOT EXISTS idx_doclog_patient ON document_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_doclog_template ON document_log(template_code);

-- Running document number: D + YY + 5 digits  (e.g. D26-00001)
CREATE SEQUENCE IF NOT EXISTS document_no_seq START WITH 1;

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
