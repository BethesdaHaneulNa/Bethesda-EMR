-- 045 (reception; was session number 101): the visit's reception memo joins its complaint.
--
-- Decided by the director on 2026-10-01: "do the complaint and the reception memo need to
-- be two fields? Keep only the name reception memo and let it do the complaint's job."
-- Reception's form now has one field, stored in visit.chief_complaint - the text the
-- queue, the patient's visit list and the consultation screen show. visit.reception_memo
-- is no longer written (visit.routes.js). The column stays.
--
-- What existing visits hold in reception_memo is moved, not lost: it is put after the
-- complaint on a new line (alone when there is no complaint; not added again when the
-- complaint already has that very line), and reception_memo is then emptied - which is
-- also what makes a second run change nothing. Both columns are TEXT: no length limit.
-- updated_at is left alone: the visit itself did not change.
-- Changes data in visit only; creates and drops nothing. Safe to run more than once.
UPDATE visit
   SET chief_complaint = CASE
         WHEN btrim(COALESCE(chief_complaint, '')) = '' THEN btrim(reception_memo)
         WHEN btrim(reception_memo) = ANY (string_to_array(chief_complaint, E'\n')) THEN chief_complaint
         ELSE regexp_replace(chief_complaint, '\s+$', '') || E'\n' || btrim(reception_memo)
       END,
       reception_memo = NULL
 WHERE btrim(COALESCE(reception_memo, '')) <> '';
