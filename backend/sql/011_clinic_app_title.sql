-- 011: configurable application title shown in the top header.
-- Safe to run multiple times.
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS app_title VARCHAR(100) DEFAULT 'Bethesda EMR';
UPDATE clinic SET app_title = 'Bethesda EMR' WHERE app_title IS NULL;
