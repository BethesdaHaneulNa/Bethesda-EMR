-- 402 (pharmacy): pack-unit drugs (H2, decided B on 2026-09-29).
--
-- A syrup, an inhaler, eye drops or a cream is handed out by the bottle or tube,
-- not counted in doses. Such a drug is marked here, and a prescription for it
-- stores the number of bottles/tubes the doctor writes as total_qty instead of
-- daily total x days. Billing, stock and statistics already read total_qty.
--
-- The flag and the unit word are copied onto each prescription line when it is
-- written (as unit_price is), so changing the drug later does not change what an
-- existing prescription means. Existing lines get FALSE and keep their totals.
-- Adds columns only; no drug is marked here (decision: the example drugs are not
-- marked; the real list is marked when it is imported).

ALTER TABLE drug ADD COLUMN IF NOT EXISTS pack_unit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drug ADD COLUMN IF NOT EXISTS pack_label VARCHAR(10);
ALTER TABLE prescription ADD COLUMN IF NOT EXISTS pack_unit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prescription ADD COLUMN IF NOT EXISTS pack_label VARCHAR(10);

-- bottle: flacon / 병   tube: tube / 튜브   inhaler: inhalateur / 흡입기   unit: unité / 개
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_pack_label_check') THEN
    ALTER TABLE drug ADD CONSTRAINT drug_pack_label_check
      CHECK (pack_label IS NULL OR pack_label IN ('bottle','tube','inhaler','unit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescription_pack_label_check') THEN
    ALTER TABLE prescription ADD CONSTRAINT prescription_pack_label_check
      CHECK (pack_label IS NULL OR pack_label IN ('bottle','tube','inhaler','unit'));
  END IF;
END $$;
