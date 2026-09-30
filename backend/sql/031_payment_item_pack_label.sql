-- 031 (payment, session number 302) (payment): the unit word of a pack-unit drug line on the bill (2026-09-29).
--
-- A syrup, a cream or an inhaler is billed by the bottle or tube (pharmacy 025,
-- consultation copies the flag onto the prescription line). The receipt reads only
-- the stored bill, so the bill line keeps its own copy of the unit - "2 flacons", not
-- "2" - even if the prescription changes after billing. billing.routes.js
-- stampPackLabels() fills it when a bill is written.
--
-- Existing bill lines: copied from the visit's prescription where the drug is a pack
-- line. On the running EMR on 2026-09-29 no drug was marked, so this changes no row.
-- Safe to run more than once.
ALTER TABLE billing_item ADD COLUMN IF NOT EXISTS pack_label VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_item_pack_label_check') THEN
    ALTER TABLE billing_item ADD CONSTRAINT billing_item_pack_label_check
      CHECK (pack_label IS NULL OR pack_label IN ('bottle','tube','inhaler','unit'));
  END IF;
END $$;

UPDATE billing_item bi SET pack_label = (
    SELECT p.pack_label FROM prescription p
     WHERE p.consultation_id IN (SELECT c.id FROM consultation c JOIN billing b ON b.visit_id = c.visit_id WHERE b.id = bi.billing_id)
       AND p.pack_unit AND p.drug_code = bi.item_code
     ORDER BY p.id DESC LIMIT 1)
 WHERE bi.item_type = 'drug' AND bi.pack_label IS NULL;
