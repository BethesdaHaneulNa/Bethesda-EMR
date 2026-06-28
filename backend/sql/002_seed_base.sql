-- Seed: Clinic
INSERT INTO clinic (name, name_en, name_fr, address, phone, email, working_hours) VALUES
('Bethesda Clinic', 'Bethesda Clinic', 'Clinique Bethesda', 'Lot 123, Rue Andriandahifotsy, Antananarivo 101, Madagascar', '+261 20 22 123 45', 'contact@medconnect.mg', 'Mon-Fri 08:00-17:00, Sat 08:00-12:00');

-- Seed: Departments
INSERT INTO department (code, name, name_en, name_fr) VALUES
('FM', 'Family Medicine', 'Family Medicine', 'Médecine Familiale'),
('INT', 'Internal Medicine', 'Internal Medicine', 'Médecine Interne'),
('PED', 'Pediatrics', 'Pediatrics', 'Pédiatrie'),
('GEN', 'General Practice', 'General Practice', 'Médecine Générale'),
('ORT', 'Orthopedics', 'Orthopedics', 'Orthopédie'),
('OBG', 'OB/GYN', 'OB/GYN', 'Gynéco-Obstétrique'),
('SUR', 'Surgery', 'Surgery', 'Chirurgie'),
('DRM', 'Dermatology', 'Dermatology', 'Dermatologie'),
('ER', 'Emergency', 'Emergency', 'Urgences');

-- pgcrypto provides crypt()/gen_salt() used for password hashing (login + first-run setup).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- No staff are seeded. On first run the app has no admin, so it shows the
-- setup wizard to create the first administrator (see /api/auth/setup).
-- Additional staff are then created in Settings → Staff. Department heads are
-- assigned there too.
