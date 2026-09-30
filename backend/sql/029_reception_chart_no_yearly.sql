-- ============================================================
--  Chart numbers restart at 1 each year (decided 2026-09-29, reception ⑱):
--  the first new patient of 2027 is 27-00001.
--
--  Before: one sequence (chart_no_seq) ran across years with the year in front
--  (26-00350 -> 27-00351), and LPAD(…, 5) cut numbers past 99,999 down to five
--  digits, so the 100,000th patient of a year would have collided with an older one.
--
--  Now the next number is "the highest number already used this year + 1",
--  worked out from the patient table itself under an advisory lock that is held
--  until the calling transaction ends. So:
--    - two desks creating patients at once cannot get the same number
--      (POST /api/patients calls this and inserts in one transaction);
--    - after a backup is restored on another PC the next number is right by
--      construction - nothing depends on a sequence value or a counter row;
--    - numbers already issued are untouched, and this year carries on from the
--      highest one;
--    - past 99,999 a year simply gets a sixth digit (YY-100000) instead of wrapping.
--  "This year" is CURRENT_DATE, the database's today in the clinic's time zone -
--  the same today that visit_date defaults to. p_day exists for tests
--  (generate_chart_no('2027-01-01')).
--
--  chart_no_seq is left in place, unused, so this is easy to undo. Data is not
--  changed by this migration.
-- ============================================================

DROP FUNCTION IF EXISTS generate_chart_no();
DROP FUNCTION IF EXISTS generate_chart_no(date);

CREATE FUNCTION generate_chart_no(p_day date DEFAULT CURRENT_DATE) RETURNS varchar AS $$
DECLARE
    yy text := to_char(p_day, 'YY');
    n  bigint;
BEGIN
    -- One chart number at a time, until the caller's transaction commits.
    PERFORM pg_advisory_xact_lock(hashtext('bethesda.chart_no'));
    SELECT COALESCE(MAX(split_part(chart_no, '-', 2)::bigint), 0) + 1
      INTO n
      FROM patient
     WHERE chart_no ~ ('^' || yy || '-[0-9]+$');
    RETURN yy || '-' || CASE WHEN n < 100000 THEN lpad(n::text, 5, '0') ELSE n::text END;
END;
$$ LANGUAGE plpgsql;
