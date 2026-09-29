-- ⚠ 격리 스택 전용 — 운영 DB에 돌리지 마세요 (모두 ROLLBACK 되지만 그래도).
--   ISOLATED SESSION STACK ONLY.
--
-- Chart numbers restart each year (migration 101, reception ⑱). Checks the parts the
-- HTTP test cannot reach: a new year, the last day of the year, and a year that
-- passes 99,999. Everything runs inside one transaction that is rolled back.
--
--   docker exec -i bethesda-s-reception-db psql -U medconnect -d medconnect -v ON_ERROR_STOP=1 < backend/test/reception.chartno.sql
--
-- Prints "chart number checks passed" or stops at the first failure.

BEGIN;
DO $$
DECLARE
    yy        text := to_char(CURRENT_DATE, 'YY');
    next_year date := (date_trunc('year', CURRENT_DATE) + interval '1 year')::date;
    year_end  date := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
    c         text;
BEGIN
    -- the first number of next year is 00001, whatever this year reached
    c := generate_chart_no(next_year);
    IF c <> to_char(next_year, 'YY') || '-00001' THEN RAISE EXCEPTION 'next year gave %', c; END IF;

    -- the last day of this year still belongs to this year
    c := generate_chart_no(year_end);
    IF left(c, 3) <> yy || '-' THEN RAISE EXCEPTION 'last day of the year gave %', c; END IF;

    -- past 99,999 a sixth digit is added instead of cutting the number short
    INSERT INTO patient (chart_no, last_name, first_name) VALUES (yy || '-99999', 'ZZTEST', 'Big');
    c := generate_chart_no();
    IF c <> yy || '-100000' THEN RAISE EXCEPTION 'after 99999 gave %', c; END IF;
    INSERT INTO patient (chart_no, last_name, first_name) VALUES (c, 'ZZTEST', 'Bigger');
    c := generate_chart_no();
    IF c <> yy || '-100001' THEN RAISE EXCEPTION 'after 100000 gave %', c; END IF;

    -- something that is not YY-digits is not counted
    INSERT INTO patient (chart_no, last_name, first_name) VALUES (yy || '-X9999999', 'ZZTEST', 'Odd');
    c := generate_chart_no();
    IF c <> yy || '-100001' THEN RAISE EXCEPTION 'an odd chart number was counted: %', c; END IF;

    RAISE NOTICE 'chart number checks passed';
END $$;
ROLLBACK;
