-- 067: the clinic's money.
--
-- The clinic's manager, 2026-11-12: "this could not be used in another country" - the
-- ariary ("Ar") was written into every screen and every receipt. Settings -> Clinic ->
-- Money now says the symbol (Ar, FCFA, EUR, $ ...), whether it goes after or before the
-- amount, whether amounts have decimals (none, or two), and which amounts make the quick
-- buttons under "Amount received" at the till.
--
-- Only adds columns with defaults: it cannot fail on the clinic's data, and an installed
-- clinic keeps the ariary, written as before. The amounts themselves never change.
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS currency_symbol   VARCHAR(8)  NOT NULL DEFAULT 'Ar';
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS currency_position VARCHAR(6)  NOT NULL DEFAULT 'after';
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS currency_decimals SMALLINT    NOT NULL DEFAULT 0;
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS cash_quick        VARCHAR(80) NOT NULL DEFAULT '5000,10000,20000,50000';
