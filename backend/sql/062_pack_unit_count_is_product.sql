-- 062 (1.7.16): a pack-unit drug (syrup, cream, inhaler...) is counted like any other
-- drug - total = daily total x days - instead of a separate bottle count.
--
-- The clinic's manager, 2026-11-09, from the site: « the daily-total column is the count
-- too: 2 · 1 · 1 means two go out » (the Korean way). The separate « Quantité » box of
-- 1.7.x goes; the intake instructions (15 mL three times a day...) are written in the
-- line's sig/memo, not in the number fields. The pack_unit flag and the unit word stay:
-- they still name the count (« 2 flacons ») on the screens and papers.
--
-- Lines written under the old rule say e.g. 3 · 3 · 6 with a total of 1 bottle; read with
-- the new rule they would mean 18 bottles. So:
-- 1. order_set_item: a pack-unit drug line becomes quantity · 1 · 1 (the count it used to
--    prescribe), and its old three numbers go into the sig (route, 10 characters) when
--    that is empty, e.g. « 3×3×6j ». On the clinic's own database no such line remains
--    (the « Fever » set was removed by hand the same day); this is the safety net.
-- 2. prescription: a pack-unit line of a consultation still in progress, not yet
--    dispensed, becomes count · 1 · 1 the same way, its old numbers written into the
--    memo (« 15/j × 3, 7 j »). Lines of completed consultations are history (billed and
--    dispensed on their count) and are left as they are; the screens show them read-only.
UPDATE order_set_item i
   SET route = CASE WHEN i.route IS NULL OR btrim(i.route) = ''
                    THEN left(concat_ws('×', nullif(btrim(i.dose), ''), i.frequency::text, i.days::text) || 'j', 10)
                    ELSE i.route END,
       dose = CASE WHEN i.quantity IS NOT NULL AND i.quantity > 0 THEN trim(trailing '.' from trim(trailing '0' from i.quantity::text)) ELSE NULL END,
       frequency = 1,
       days = 1
  FROM drug d
 WHERE d.id = i.drug_id AND i.kind = 'drug' AND d.pack_unit
   AND NOT (i.frequency = 1 AND i.days = 1 AND nullif(btrim(i.dose), '') = trim(trailing '.' from trim(trailing '0' from i.quantity::text)));

UPDATE prescription p
   SET memo = nullif(btrim(concat_ws(' · ',
                nullif(concat_ws(', ', nullif(nullif(btrim(p.dose), '') || '/j' || CASE WHEN p.frequency IS NOT NULL THEN ' × ' || p.frequency ELSE '' END, '/j'),
                                       CASE WHEN p.days IS NOT NULL THEN p.days || ' j' END), ''),
                nullif(btrim(p.memo), ''))), ''),
       dose = CASE WHEN p.total_qty IS NOT NULL AND p.total_qty > 0 THEN trim(trailing '.' from trim(trailing '0' from p.total_qty::text)) ELSE NULL END,
       frequency = 1,
       days = 1
  FROM consultation c
 WHERE c.id = p.consultation_id AND c.status = 'in_progress'
   AND p.pack_unit AND COALESCE(p.status, 'ordered') = 'ordered'
   AND NOT (p.frequency = 1 AND p.days = 1 AND (CASE WHEN p.dose ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' THEN p.dose::numeric END) = p.total_qty);
