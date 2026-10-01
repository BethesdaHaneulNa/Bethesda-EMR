-- 701 (settings; the coordinator renumbers it): an order code's default directions are
-- words or nothing - not "1.000".
--
-- The director, 2026-10-01, after making an order code for the rectoscope and ordering it:
-- the directions column of the consultation screen filled itself with "1.000". Every
-- order code carried that value: order_code.default_dose is a text column whose DEFAULT
-- was '1.000' (001_schema.sql), so the seed's codes received it without ever naming the
-- column, and the Settings "add" form sent it as well. For an order code the column is
-- the default *directions* (QD, PRN...) that the consultation screen copies onto a
-- procedure order - a bare number there means nothing.
--
-- 1. The column no longer has a default. (001 is an applied migration and is not edited;
--    on a new install the seed still receives '1.000' from 001 and step 2 clears it.)
-- 2. Existing values that are only a number ("1", "1.000", "1,0") or only blanks become
--    NULL. A value with letters in it (QD, PRN, "1 fois") is left exactly as it is.
--
-- The drug table has a column of the same name with another meaning (a dose); it is not
-- touched. default_freq and default_days keep their 1. Safe to run more than once.
ALTER TABLE order_code ALTER COLUMN default_dose DROP DEFAULT;

UPDATE order_code
   SET default_dose = NULL
 WHERE default_dose IS NOT NULL
   AND (btrim(default_dose) = '' OR btrim(default_dose) ~ '^[0-9]+([.,][0-9]*)?$');
