-- 012: in-house vs external dispensing on each prescription.
-- 'internal' = dispensed at the hospital pharmacy, 'external' = patient fills outside.
-- Safe to run multiple times.
ALTER TABLE prescription ADD COLUMN IF NOT EXISTS dispense_type VARCHAR(10) DEFAULT 'internal';
UPDATE prescription SET dispense_type = 'internal' WHERE dispense_type IS NULL;
