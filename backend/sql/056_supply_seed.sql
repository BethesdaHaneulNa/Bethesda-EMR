-- 056 (supplies, 1.7.0): kept as a numbered step so the migration sequence is the same on
-- every install. It held one clinic's supply list (codes, prices, counts); that is site
-- data and is not part of this repository. A new install starts with no supplies: add
-- them in Settings -> Order codes (type "Supply"), or load your own list with SQL.
SELECT 1;
