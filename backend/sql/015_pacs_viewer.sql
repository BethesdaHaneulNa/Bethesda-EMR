-- 015: order-feed / PACS config aligned to the Orthanc model.
-- Adds the PACS web/viewer URL and repoints stale demo defaults.
-- Safe to run multiple times.
ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS pacs_viewer_url VARCHAR(200) DEFAULT '';

-- repoint the old Korean-clinic demo worklist server to the Orthanc PACS defaults,
-- but only if the values are still the untouched demo ones (don't clobber real config).
UPDATE pacs_config
   SET worklist_scp_port = 4242,
       worklist_scp_ae   = 'MEDCONNECT',
       worklist_scp_host = ''
 WHERE worklist_scp_ae = 'BROKER' AND worklist_scp_host = '192.168.0.222';

UPDATE pacs_config SET facility_name = 'Bethesda Clinic'
 WHERE facility_name = 'Yonsei Shintong Clinic';
