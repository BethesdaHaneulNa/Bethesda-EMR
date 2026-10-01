-- 503 (laboratory, session number):
-- the values a text result can take, per lab item (director, 2026-10-01: "the ones
-- where one writes Negative / Positive - does one have to type them?").
--
-- lab_test_item.choices is the list the lab screen offers for that item's result: a
-- JSON array of texts, in the order they are shown. It is only what the box offers.
-- A result keeps its value as text (lab_result.value), exactly as before, and the flag
-- rule is unchanged: a value equal to the item's reference text is normal, any other is
-- abnormal. Nothing here says which value "means positive".
--
-- No list is filled in. An item that has a reference text and no list is offered a
-- default pair worked out from that text when the screen asks (utils/labFlag.js
-- defaultChoices: "Negative" -> Negative / Positive, and so on) - so the clinic's items
-- get a list to pick from without any row being changed here, and an item added later
-- gets one too. A list saved in Settings takes its place.
--
-- Adds one column (NULL = no list of its own); changes no existing row. Safe to run
-- more than once.

ALTER TABLE lab_test_item ADD COLUMN IF NOT EXISTS choices JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_test_item_choices_is_list') THEN
    ALTER TABLE lab_test_item ADD CONSTRAINT lab_test_item_choices_is_list
      CHECK (choices IS NULL OR jsonb_typeof(choices) = 'array');
  END IF;
END $$;
