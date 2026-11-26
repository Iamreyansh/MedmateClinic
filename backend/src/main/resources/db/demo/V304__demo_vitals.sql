-- The readings the nurse took.
--
-- The console shows the reading beside the patient's name, and the nurse
-- station counts the patients still waiting for one. A clinic with no
-- readings at all leaves that line blank on every row -- which is what the
-- demo clinic did while the mock showed a reading for the same people: the
-- same patient, two different answers.
--
-- The values are the mock's own readings for the same people, so the mock and
-- the service describe the same clinic day rather than two that only look
-- alike. Ishaan is measured at the desk and the reading is recorded against
-- both the visit she walked in with and the visit she is in, because it is
-- one reading of one patient.

-- Rohit Menon: a cough, and a temperature that says so.
insert into vitals (id, clinic_id, patient_id, visit_id, recorded_by, recorded_at,
                    temp_f, bp_systolic, bp_diastolic, pulse, spo2, weight_kg, height_cm,
                    sugar_mg, note, priority)
values ('77777777-7777-4777-8777-777777777701', '${clinic_id}'::uuid,
        '55555555-5555-4555-8555-555555555501', '66666666-6666-4666-8666-666666666601',
        '22222222-2222-4222-8222-222222222225', now() - interval '70 minutes',
        100.4, 110, 70, 88, 97, 24.0, 124.0, 92, 'Cough 5 days · measured at the desk', null)
on conflict (id) do nothing;

-- Ishaan Pai, at the desk: a rash, and the fever that came with it.
insert into vitals (id, clinic_id, patient_id, visit_id, recorded_by, recorded_at,
                    temp_f, bp_systolic, bp_diastolic, pulse, spo2, weight_kg, height_cm,
                    sugar_mg, note, priority)
values ('77777777-7777-4777-8777-777777777702', '${clinic_id}'::uuid,
        '55555555-5555-4555-8555-555555555502', '66666666-6666-4666-8666-666666666602',
        '22222222-2222-4222-8222-222222222225', now() - interval '55 minutes',
        100.9, 112, 72, 90, 96, 26.0, 96.0, 98, 'Rash for three days · measured at the desk', null)
on conflict (id) do nothing;

-- The same reading, carried onto the visit she is in.
insert into vitals (id, clinic_id, patient_id, visit_id, recorded_by, recorded_at,
                    temp_f, bp_systolic, bp_diastolic, pulse, spo2, weight_kg, height_cm,
                    sugar_mg, note, priority)
values ('77777777-7777-4777-8777-777777777703', '${clinic_id}'::uuid,
        '55555555-5555-4555-8555-555555555502', '66666666-6666-4666-8666-666666666604',
        '22222222-2222-4222-8222-222222222225', now() - interval '42 minutes',
        100.9, 112, 72, 90, 96, 26.0, 96.0, 98, 'Rash for three days · before the consult', null)
on conflict (id) do nothing;

-- Fathima Begum, before she was called in: her blood pressure is the reason.
insert into vitals (id, clinic_id, patient_id, visit_id, recorded_by, recorded_at,
                    temp_f, bp_systolic, bp_diastolic, pulse, spo2, weight_kg, height_cm,
                    sugar_mg, note, priority)
values ('77777777-7777-4777-8777-777777777704', '${clinic_id}'::uuid,
        '55555555-5555-4555-8555-555555555506', '66666666-6666-4666-8666-666666666605',
        '22222222-2222-4222-8222-222222222225', now() - interval '35 minutes',
        98.4, 148, 92, 92, 99, 62.0, 154.0, 104, 'BP 148/92 · measured before the consult', null)
on conflict (id) do nothing;

-- Kavya Nair, on her last visit: the sore throat she came in with.
insert into vitals (id, clinic_id, patient_id, visit_id, recorded_by, recorded_at,
                    temp_f, bp_systolic, bp_diastolic, pulse, spo2, weight_kg, height_cm,
                    sugar_mg, note, priority)
select '77777777-7777-4777-8777-777777777705', '${clinic_id}'::uuid,
       '55555555-5555-4555-8555-555555555504', visit.id,
       '22222222-2222-4222-8222-222222222225', now() - interval '2 days',
       101.2, 128, 82, 96, 98, 62.0, 158.0, 164, 'Sore throat 3 days, fever 101 F', 'urgent'
from (select id from visits
      where clinic_id = '${clinic_id}'::uuid
        and patient_id = '55555555-5555-4555-8555-555555555504'
      order by created_at desc
      limit 1) as visit
on conflict (id) do nothing;
