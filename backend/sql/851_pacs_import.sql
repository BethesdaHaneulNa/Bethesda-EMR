-- 851 (PACS; the coordinator gives it its number when merging): images brought in from
-- another establishment (a CD or a USB stick the patient carries).
--
-- Director, 2026-10-02: "들여오기 프로그램에서 차트번호 입력하면 그 환자 것으로 외부 영상이 들어감 →
-- 연동이나 판독소견은 안 적더라도 EMR 영상판독에서 26-00001로 조회하면 그 이름으로 들어와 있는 영상이
-- 다 뜨게 하면 되는 것 아니냐". So: no order, no consultation, no visit, no worklist line, no
-- charge. The program "Bethesda CD" (reception) reads the disc and sends the chosen study
-- through the EMR to the image server, under OUR patient number and name (the picture is not
-- touched; the number and name it came with are kept inside the images and here). The EMR
-- shows, in the patient's imaging window, the studies written in THIS table - not "whatever
-- the image server holds under that number": a study a device sent with a mistyped number
-- must not appear in a chart by itself. Design: wiki/reference/external-images-import-design.md.
--
-- One line per study brought in. It is
--   - what the imaging window lists as "outside images" (institution, the study's own date);
--   - where the study came from (the values the images carried before they were changed);
--   - what an interrupted import is undone from (state, the study numbers);
--   - how the image backup learns that a study made here was removed again.
CREATE TABLE IF NOT EXISTS pacs_import (
    id                  SERIAL PRIMARY KEY,
    state               VARCHAR(20)  NOT NULL DEFAULT 'started'
                        CHECK (state IN ('started', 'done', 'rolled-back', 'cleanup-pending', 'undone')),
    patient_id          INTEGER      NOT NULL REFERENCES patient(id),
    -- as the study stands on our image server
    study_uid           VARCHAR(64)  NOT NULL,
    accession_no        VARCHAR(16)  NOT NULL,            -- 'EXT-<id>': never the form of an order's accession
    image_count         INTEGER,                          -- counted on the image server when the import finished
    -- as it came (shown to the staff of this patient's chart only)
    source_study_uid    VARCHAR(64)  NOT NULL,
    source_patient_id   VARCHAR(64)  NOT NULL DEFAULT '',
    source_patient_name VARCHAR(200) NOT NULL DEFAULT '',
    source_birth_date   VARCHAR(10)  NOT NULL DEFAULT '',
    source_sex          VARCHAR(4)   NOT NULL DEFAULT '',
    source_accession    VARCHAR(64)  NOT NULL DEFAULT '',
    institution         VARCHAR(200) NOT NULL DEFAULT '',
    study_date          VARCHAR(10)  NOT NULL DEFAULT '',  -- YYYYMMDD, as in the images
    description         VARCHAR(200) NOT NULL DEFAULT '',
    modality            VARCHAR(16)  NOT NULL DEFAULT '',
    files_announced     INTEGER      NOT NULL DEFAULT 0,
    files_received      INTEGER      NOT NULL DEFAULT 0,
    bytes_received      BIGINT       NOT NULL DEFAULT 0,
    detail              JSONB        NOT NULL DEFAULT '{}',   -- what the person confirmed, series that cannot be drawn
    error               TEXT,
    staff_id            INTEGER      REFERENCES staff(id),
    staff_name          VARCHAR(100),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- the last image received: an import silent for long is undone
    finished_at         TIMESTAMPTZ,
    -- taken out again (an import made by mistake)
    undone_at           TIMESTAMPTZ,
    undone_by           INTEGER      REFERENCES staff(id),
    undone_by_name      VARCHAR(100),
    undo_reason         VARCHAR(300)
);
CREATE INDEX IF NOT EXISTS idx_pacs_import_patient ON pacs_import(patient_id);
CREATE INDEX IF NOT EXISTS idx_pacs_import_study ON pacs_import(study_uid);
CREATE INDEX IF NOT EXISTS idx_pacs_import_source ON pacs_import(source_study_uid);
CREATE INDEX IF NOT EXISTS idx_pacs_import_open ON pacs_import(state) WHERE state IN ('started', 'cleanup-pending');

-- The largest single file taken (MB). The image server handles a file as a whole when it
-- changes it, so a clip of several GB in one file could unsettle the server. There is no
-- limit on a study as a whole: the room left on the image server's disk is checked instead.
ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS import_max_file_mb INTEGER NOT NULL DEFAULT 1024;
