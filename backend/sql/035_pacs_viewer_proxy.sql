-- 035 (pacs, session number 803): the EMR shows the PACS viewer itself (P-9, option C, 2026-09-29).
--
-- Staff browsers no longer open the image server directly: the EMR relays the
-- viewer's requests and adds the image server's login on the server side.
--   orthanc_url       where the EMR container reaches Orthanc's web port
--   orthanc_password  that login's password - written only by the PACS
--                     pair-with-emr script (on stdin), never sent to a browser,
--                     never logged. NULL on an install not re-paired yet: the
--                     viewer then says so instead of showing a black pane.
-- pacs_viewer_url stays as it is (an old backup restores it), just unused.
--
-- Columns only; no existing row is changed. Safe to run more than once.

ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS orthanc_url VARCHAR(200) DEFAULT 'http://host.docker.internal:9090';
ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS orthanc_password VARCHAR(200);
