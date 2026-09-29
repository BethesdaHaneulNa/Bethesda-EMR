-- 037 (design; session number 901): which screen a member of staff chose - dark, as the EMR
-- has always been, or light.
--
-- Decided by the director on 2026-09-29: the choice is remembered per account (not per
-- PC), and the screen a new account starts with is the dark one. Every account that
-- exists today therefore gets 'dark', which is what it already sees.
--
-- Read and written only by /api/theme (theme.routes.js), for the signed-in account.
-- Adds a column and its check; no existing value changes. Safe to run more than once.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'dark';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_theme_check') THEN
    ALTER TABLE staff ADD CONSTRAINT staff_theme_check CHECK (theme IN ('dark', 'light'));
  END IF;
END $$;
