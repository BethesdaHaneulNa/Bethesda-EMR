-- 015: order-feed / PACS config aligned to the Orthanc model.
-- Adds the PACS web/viewer URL.
-- Safe to run multiple times.
ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS pacs_viewer_url VARCHAR(200) DEFAULT '';

-- (An earlier version also reset two demo values left from the project's first test
-- install. They exist on no other install, so that statement was dropped.)
