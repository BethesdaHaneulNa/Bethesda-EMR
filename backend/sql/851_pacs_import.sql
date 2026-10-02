-- 851 (PACS; the coordinator gives it its number when merging): images brought in from
-- another establishment (a CD or a USB stick the patient carries).
--
-- Director, 2026-10-02: "다른 병원에서 가져온 cd나 usb ... 우리쪽으로 업로드도 가능해?" - yes: from
-- the consultation screen's imaging window, the doctor picks the disc's folder; the EMR
-- puts the images on the image server under OUR patient number and name (the picture is
-- not touched; the original number and name are kept inside the images and here) and
-- ties them to an order of this consultation. Design: wiki/reference/external-images-import-design.md.
--
-- 1. The order such images hang on: one order code, free of charge, never sent to a device
--    (worklist_enabled false: no worklist line is made when it is ordered). Its price can be
--    changed in Settings if the clinic decides to charge for the registration.
INSERT INTO order_code (code, name, name_en, code_type, group_name, price, price_clinic, pacs_modality, worklist_enabled, is_active)
SELECT 'IMG-EXT', 'Imagerie externe (CD / USB)', 'Outside images (CD / USB)', 'imaging', 'Imaging', 0, 0, 'OT', FALSE, TRUE
 WHERE NOT EXISTS (SELECT 1 FROM order_code WHERE code = 'IMG-EXT');

-- 2. One line per study brought in. It is
--    - what an interrupted import is undone from (state, the study numbers);
--    - where the study came from (the values the images carried before they were changed);
--    - what the screens show as "outside images" (institution, the study's own date);
--    - how the image backup learns that a study made here was removed again.
CREATE TABLE IF NOT EXISTS pacs_import (
    id                  SERIAL PRIMARY KEY,
    state               VARCHAR(20)  NOT NULL DEFAULT 'started'
                        CHECK (state IN ('started', 'done', 'rolled-back', 'cleanup-pending', 'undone')),
    patient_id          INTEGER      NOT NULL REFERENCES patient(id),
    order_item_id       INTEGER      REFERENCES order_item(id) ON DELETE SET NULL,
    order_name          VARCHAR(200),
    -- as the study stands on our image server
    study_uid           VARCHAR(64)  NOT NULL,
    accession_no        VARCHAR(16)  NOT NULL,
    -- as it came (never shown to anyone but the staff of this patient's chart)
    source_study_uid    VARCHAR(64)  NOT NULL,
    source_patient_id   VARCHAR(64)  NOT NULL DEFAULT '',
    source_patient_name VARCHAR(200) NOT NULL DEFAULT '',
    source_birth_date   VARCHAR(10)  NOT NULL DEFAULT '',
    source_sex          VARCHAR(4)   NOT NULL DEFAULT '',
    source_accession    VARCHAR(64)  NOT NULL DEFAULT '',
    institution         VARCHAR(200) NOT NULL DEFAULT '',
    study_date          VARCHAR(10)  NOT NULL DEFAULT '',
    description         VARCHAR(200) NOT NULL DEFAULT '',
    modality            VARCHAR(16)  NOT NULL DEFAULT '',
    files_announced     INTEGER      NOT NULL DEFAULT 0,
    files_received      INTEGER      NOT NULL DEFAULT 0,
    bytes_received      BIGINT       NOT NULL DEFAULT 0,
    detail              JSONB        NOT NULL DEFAULT '{}',   -- what the person confirmed, series that cannot be drawn, why it was undone
    error               TEXT,
    staff_id            INTEGER      REFERENCES staff(id),
    staff_name          VARCHAR(100),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- the last image received: an import silent for long is undone
    finished_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pacs_import_patient ON pacs_import(patient_id);
CREATE INDEX IF NOT EXISTS idx_pacs_import_order ON pacs_import(order_item_id);
CREATE INDEX IF NOT EXISTS idx_pacs_import_source ON pacs_import(source_study_uid);
CREATE INDEX IF NOT EXISTS idx_pacs_import_open ON pacs_import(state) WHERE state IN ('started', 'cleanup-pending');

-- 3. The largest single file taken (MB). The image server handles a file as a whole when it
--    changes it, so a clip of several GB in one file could unsettle the server.
ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS import_max_file_mb INTEGER NOT NULL DEFAULT 1024;
