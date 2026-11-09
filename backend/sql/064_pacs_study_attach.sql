-- 064 (1.7.18): images that arrived without an order, put under the order they were taken
-- for (routes/pacs.attach.js; the clinic's manager, 2026-11-09). One line per attach, kept
-- for the history and so that an interrupted one is finished or undone at the next start.
--   started    the corrected copy is being made and checked on the image server
--   emr-done   the order points at the copy; only the original is still to delete
--   done       the original is deleted
--   rolled-back / failed   nothing of the EMR changed (rolled-back: the copy was removed)
CREATE TABLE IF NOT EXISTS pacs_study_attach (
    id                  SERIAL PRIMARY KEY,
    state               VARCHAR(20)  NOT NULL DEFAULT 'started'
                        CHECK (state IN ('started', 'emr-done', 'done', 'rolled-back', 'failed')),
    order_item_id       INTEGER      REFERENCES order_item(id) ON DELETE SET NULL,
    worklist_id         INTEGER,
    patient_id          INTEGER      REFERENCES patient(id),
    order_name          VARCHAR(200),
    accession_no        VARCHAR(50),
    study_instance_uid  VARCHAR(128),           -- the order's number, which the copy carries
    source_study_uid    VARCHAR(128) NOT NULL,  -- the number the images arrived with
    source_orthanc_id   VARCHAR(64),
    new_orthanc_id      VARCHAR(64),
    source_patient_id   VARCHAR(64),            -- what the device wrote
    source_patient_name VARCHAR(200),
    source_birth_date   VARCHAR(10),
    image_count         INTEGER,
    detail              JSONB        NOT NULL DEFAULT '{}',
    error               TEXT,
    staff_id            INTEGER      REFERENCES staff(id),
    staff_name          VARCHAR(100),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pacs_study_attach_order ON pacs_study_attach(order_item_id);
CREATE INDEX IF NOT EXISTS idx_pacs_study_attach_open ON pacs_study_attach(state) WHERE state IN ('started', 'emr-done');
