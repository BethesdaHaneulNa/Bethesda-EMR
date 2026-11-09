-- 058 (1.7.10): a note shown on the phone page (/m), set in Settings -> Clinic.
-- Typically which Wi-Fi reaches the server. Empty (NULL) = nothing is shown.
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS mobile_hint TEXT;
