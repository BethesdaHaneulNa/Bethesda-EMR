-- 046 (PACS; was session number 801): images moved to another order.
--
-- A technician picks the wrong line of the same patient on the device (Carotid US
-- instead of Upper Abdomen US): the images carry that order's study number, accession
-- and name, and nothing can notice it. The EMR corrects the image server's own data
-- (Orthanc's REST: a corrected study is made, checked, and only then the original is
-- deleted) and then its own records. Director, 2026-10-01: a button in the EMR, for
-- doctors and administrators; the reading goes with the images; a reason may be typed
-- and need not be (reason = '' then) - the change-log line is always written.
--
-- One line per correction. It is
--   1. what an interrupted correction is finished from (state, step);
--   2. how the image backup learns which image files were superseded (superseded);
--   3. the history shown on both orders.
-- The orders are kept by name as well: the order the images left can be deleted later.
CREATE TABLE IF NOT EXISTS pacs_study_move (
    id                  SERIAL PRIMARY KEY,
    kind                VARCHAR(10)  NOT NULL DEFAULT 'move' CHECK (kind IN ('move', 'swap')),
    state               VARCHAR(20)  NOT NULL DEFAULT 'started'
                        CHECK (state IN ('started', 'emr-done', 'cleanup-pending', 'undo-pending', 'done', 'rolled-back', 'failed')),
    step                INTEGER      NOT NULL DEFAULT 0,
    patient_id          INTEGER      NOT NULL REFERENCES patient(id),
    from_order_item_id  INTEGER      REFERENCES order_item(id) ON DELETE SET NULL,
    to_order_item_id    INTEGER      REFERENCES order_item(id) ON DELETE SET NULL,
    from_order_name     VARCHAR(200),
    to_order_name       VARCHAR(200),
    from_accession      VARCHAR(50),
    to_accession        VARCHAR(50),
    image_count         INTEGER,
    reading_moved       BOOLEAN      NOT NULL DEFAULT FALSE,
    reason              TEXT         NOT NULL,
    detail              JSONB        NOT NULL DEFAULT '{}',   -- study numbers, Orthanc ids, what was replaced
    superseded          JSONB        NOT NULL DEFAULT '[]',   -- [{study_uid, instances:[SOPInstanceUID]}] no longer on the image server
    error               TEXT,
    staff_id            INTEGER      REFERENCES staff(id),
    staff_name          VARCHAR(100),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pacs_study_move_patient ON pacs_study_move(patient_id);
CREATE INDEX IF NOT EXISTS idx_pacs_study_move_open ON pacs_study_move(state)
    WHERE state IN ('started', 'emr-done', 'cleanup-pending', 'undo-pending');
