-- The development clinic: its people, its patients and its queue.
--
-- This is development data, not part of a clinic's defaults. It is applied to
-- one clinic, the one the development environment points at.
update clinic_profile
set phone = '080 4123 4567',
    address = '12, 100 Feet Road, Indiranagar, Bengaluru 560038',
    city = 'Bengaluru',
    state = 'Karnataka (29)',
    pin = '560038',
    gstin = '29AAJCM4821K1Z7',
    pan = 'AAJCM4821K',
    registration = 'KPME/BLR/2024/01873',
    hfr_id = 'IN2910000123',
    locations = 2
where clinic_id = '${clinic_id}';

insert into staff (id, clinic_id, role_id, full_name, mobile, email, registration, hpr_id,
                    speciality, pin_hash, active)
select '22222222-2222-4222-8222-222222222222', '${clinic_id}',
       (select id from roles where clinic_id = '${clinic_id}' and name = 'owner'),
       'Dr. Ananya Rao', '9876543210', 'ananya.rao@example.in', 'KMC 84213',
       '71-4421-8890-3326', 'General Medicine',
       'c9a2e2f47c3d9a1f5b1e8c4d2a7f6e9b0d3c5a81e2f47c9d3a1f5b1e8c4d2a7f6e9b0', true
where '${clinic_id}' = '11111111-1111-4111-8111-111111111111';

insert into staff (id, clinic_id, role_id, full_name, mobile, email, registration, hpr_id,
                    speciality, active)
select '22222222-2222-4222-8222-222222222223', '${clinic_id}',
       (select id from roles where clinic_id = '${clinic_id}' and name = 'doctor'),
       'Dr. Vikram Shenoy', '9876543211', 'vikram.shenoy@example.in', 'KMC 71840',
       '71-2233-8890-1104', 'Pediatrics', true
where '${clinic_id}' = '11111111-1111-4111-8111-111111111111';

insert into staff (id, clinic_id, role_id, full_name, mobile, email, registration, hpr_id,
                    speciality, active)
select '22222222-2222-4222-8222-222222222224', '${clinic_id}',
       (select id from roles where clinic_id = '${clinic_id}' and name = 'doctor'),
       'Dr. Meghana Iyer', '9876543212', 'meghana.iyer@example.in', 'KMC 65512',
       '71-8890-1122-3344', 'Obstetrics & Gynaecology', true
where '${clinic_id}' = '11111111-1111-4111-8111-111111111111';

insert into staff (id, clinic_id, role_id, full_name, mobile, email, active)
select '22222222-2222-4222-8222-222222222225', '${clinic_id}',
       (select id from roles where clinic_id = '${clinic_id}' and name = 'front_desk'),
       'Priya Shetty', '9876543213', 'priya.shetty@example.in', true
where '${clinic_id}' = '11111111-1111-4111-8111-111111111111';

insert into patients (id, clinic_id, full_name, age, sex, phone, abha, allergies, conditions)
values
    ('55555555-5555-4555-8555-555555555501', '${clinic_id}', 'Rohit Menon', 8, 'M', '+91 98450 02233', 'rohit.menon@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555502', '${clinic_id}', 'Ishaan Pai', 3, 'M', '+91 98450 03344', 'ishaan.pai@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555503', '${clinic_id}', 'Aarav Nair', 6, 'M', '+91 98450 04455', 'aarav.nair@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555504', '${clinic_id}', 'Kavya Nair', 34, 'F', '+91 98450 01122', 'kavya.nair@abdm',
     array['Penicillin (rash)'], array['Type 2 diabetes']),
    ('55555555-5555-4555-8555-555555555505', '${clinic_id}', 'Diya Kamath', 5, 'F', '+91 98450 05566', 'diya.kamath@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555506', '${clinic_id}', 'Fathima Begum', 27, 'F', '+91 98450 06677', 'fathima.begum@abdm', '{}', '{}');

insert into visits (id, clinic_id, patient_id, token, status, mode, source, reason, detail, priority)
values
    ('66666666-6666-4666-8666-666666666601', '${clinic_id}', '55555555-5555-4555-8555-555555555501', 'A-015', 'waiting', 'in_clinic', 'walk_in', 'Cough 5 days · symptoms filled in', 'Temp 100.4 °F · SpO₂ 95%', null),
    ('66666666-6666-4666-8666-666666666602', '${clinic_id}', '55555555-5555-4555-8555-555555555502', 'B-005', 'waiting', 'in_clinic', 'booking', 'Rash · booked 11:00', 'Vitals pending', null),
    ('66666666-6666-4666-8666-666666666603', '${clinic_id}', '55555555-5555-4555-8555-555555555503', 'A-018', 'waiting', 'in_clinic', 'walk_in', 'Fever · walk-in', 'Temp 101.0 °F', 'urgent');
