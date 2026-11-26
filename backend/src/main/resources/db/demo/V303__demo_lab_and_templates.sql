-- The lab bench and the templates, for the development clinic.
--
-- The bench and the template list are two of the few screens that had nothing
-- on them: the lab had no samples waiting and the templates had no protocols,
-- so both screens rendered an empty state and could not be compared against
-- the design. This script puts real rows there — samples that are waiting to
-- be collected, samples that are on the bench, results that came back, some of
-- them abnormal, and a handful of protocols a doctor writes every week.
--
-- This is development data for one clinic, the one the development environment
-- points at. Every insert is guarded by the clinic id, by a deterministic id
-- and by the state of the table it writes to, so running the script again
-- leaves what is already there alone: it never duplicates a row.

-- ------------------------------------------------------------------- samples
--
-- The samples that are waiting to be collected and the ones that have not been
-- collected yet: an order the doctor signed and the tube that has not been
-- drawn. The history seed left the bench with reported results only, so these
-- are the rows that were missing.
insert into lab_orders (id, clinic_id, patient_id, visit_id, prescription_id, test_name, status,
                        ordered_by, ordered_at, reported_at, result_value, result_note,
                        reference_low, reference_high, critical, sample_no, partner, collected_at)
select *
from (values
    -- waiting to be collected: nothing has been drawn yet
    ('77777777-7777-4777-8777-777777777701'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555501'::uuid,
     '66666666-6666-4666-8666-666666666601'::uuid, null::uuid, 'Complete blood count', 'to_collect',
     '22222222-2222-4222-8222-222222222223'::uuid, now() - interval '2 hours', null::timestamptz, null::text, null::text,
     null::text, null::text, false, null::text, null::text, null::timestamptz),
    ('77777777-7777-4777-8777-777777777702'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555503'::uuid,
     '66666666-6666-4666-8666-666666666603'::uuid, null::uuid, 'Dengue NS1 antigen', 'to_collect',
     '22222222-2222-4222-8222-222222222222'::uuid, now() - interval '90 minutes', null::timestamptz, null::text, null::text,
     null::text, null::text, false, null::text, null::text, null::timestamptz),
    -- ordered by the doctor and not yet collected: the order is on the bench
    ('77777777-7777-4777-8777-777777777703'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555502'::uuid,
     '66666666-6666-4666-8666-666666666602'::uuid, null::uuid, 'Serum creatinine', 'ordered',
     '22222222-2222-4222-8222-222222222224'::uuid, now() - interval '45 minutes', null::timestamptz, null::text, null::text,
     null::text, null::text, false, null::text, null::text, null::timestamptz),
    ('77777777-7777-4777-8777-777777777704'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555504'::uuid,
     null::uuid, null::uuid, 'Thyroid profile (T3, T4, TSH)', 'ordered',
     '22222222-2222-4222-8222-222222222222'::uuid, now() - interval '30 minutes', null::timestamptz, null::text, null::text,
     null::text, null::text, false, null::text, null::text, null::timestamptz),
    -- on the bench: the tube is drawn and the sample is being worked up
    ('77777777-7777-4777-8777-777777777705'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555505'::uuid,
     null::uuid, null::uuid, 'Urine routine and microscopy', 'in_lab',
     '22222222-2222-4222-8222-222222222223'::uuid, now() - interval '3 hours', null::timestamptz, null::text, null::text,
     null::text, null::text, false, 'T-0001'::text, null::text, now() - interval '2 hours'),
    ('77777777-7777-4777-8777-777777777706'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555506'::uuid,
     null::uuid, null::uuid, 'Liver function test', 'in_lab',
     '22222222-2222-4222-8222-222222222224'::uuid, now() - interval '150 minutes', null::timestamptz, null::text, null::text,
     null::text, null::text, false, 'T-0002'::text, null::text, now() - interval '100 minutes'),
    -- sent out to the partner lab
    ('77777777-7777-4777-8777-777777777707'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555504'::uuid,
     null::uuid, null::uuid, 'Blood culture and sensitivity', 'sent_out',
     '22222222-2222-4222-8222-222222222222'::uuid, now() - interval '26 hours', null::timestamptz, null::text, null::text,
     null::text, null::text, false, 'T-0003'::text, 'Tenet Diagnostics'::text, now() - interval '25 hours'),
    -- reported, and the results that came back: two of them out of range
    ('77777777-7777-4777-8777-777777777708'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555501'::uuid,
     '66666666-6666-4666-8666-666666666601'::uuid, null::uuid, 'Hemoglobin', 'reported',
     '22222222-2222-4222-8222-222222222223'::uuid, now() - interval '5 hours', now() - interval '4 hours',
     '9.4'::text, 'Below the range: iron deficiency is likely. Start oral iron and repeat in a month.'::text,
     '12.0'::text, '15.0'::text, false, 'T-0004'::text, null::text, now() - interval '5 hours'),
    ('77777777-7777-4777-8777-777777777709'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555503'::uuid,
     '66666666-6666-4666-8666-666666666603'::uuid, null::uuid, 'Platelet count', 'reported',
     '22222222-2222-4222-8222-222222222222'::uuid, now() - interval '4 hours', now() - interval '3 hours',
     '96'::text, 'Below the range: recheck the count in a week.'::text,
     '150'::text, '410'::text, false, 'T-0005'::text, null::text, now() - interval '4 hours'),
    ('77777777-7777-4777-8777-777777777710'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555506'::uuid,
     null::uuid, null::uuid, 'Serum potassium', 'reported',
     '22222222-2222-4222-8222-222222222224'::uuid, now() - interval '3 hours', now() - interval '2 hours',
     '6.8'::text, 'Above the range. Recheck and review the prescription.'::text,
     '3.5'::text, '5.1'::text, true, 'T-0006'::text, null::text, now() - interval '3 hours')
) as rows (id, clinic_id, patient_id, visit_id, prescription_id, test_name, status, ordered_by, ordered_at,
           reported_at, result_value, result_note, reference_low, reference_high, critical, sample_no, partner, collected_at)
where not exists (
    select 1 from lab_orders existing
    where existing.clinic_id = '${clinic_id}'::uuid
      and existing.status in ('ordered', 'to_collect')
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------- templates
--
-- The protocols a doctor writes again and again. Each one is a condition, the
-- diagnosis it is written under and the lines that make it up.
insert into templates (id, clinic_id, name, diagnosis_code, condition, lines, used_count,
                       owner_staff_id, shared, created_at)
select *
from (values
    ('99999999-9999-4999-8999-999999999901'::uuid, '${clinic_id}'::uuid, 'Acute fever in a child', 'A09',
     'Fever with rash or cough',
     '[{"name": "Paracetamol", "dose": "15 mg/kg", "when": "Every 6 hours if the fever is above 102 F", "forDays": 3},
       {"name": "ORS", "dose": "As required", "when": "After every loose stool", "forDays": 3},
       {"name": "Complete blood count", "dose": "", "when": "At the next visit", "forDays": 0}]'::jsonb,
     24, '22222222-2222-4222-8222-222222222223'::uuid, true, now() - interval '40 days'),
    ('99999999-9999-4999-8999-999999999902'::uuid, '${clinic_id}'::uuid, 'Type 2 diabetes review', 'E11',
     'Diabetes mellitus type 2',
     '[{"name": "Metformin", "dose": "500 mg", "when": "Twice a day with food", "forDays": 30},
       {"name": "HbA1c", "dose": "", "when": "Every three months", "forDays": 0},
       {"name": "Fasting blood sugar", "dose": "", "when": "At every review", "forDays": 0}]'::jsonb,
     18, '22222222-2222-4222-8222-222222222222'::uuid, true, now() - interval '32 days'),
    ('99999999-9999-4999-8999-999999999903'::uuid, '${clinic_id}'::uuid, 'Antenatal visit — normal pregnancy', 'Z34',
     'Routine antenatal care',
     '[{"name": "Folic acid", "dose": "5 mg", "when": "Once a day", "forDays": 90},
       {"name": "Iron", "dose": "As advised", "when": "Once a day", "forDays": 90},
       {"name": "Urine for sugar and protein", "dose": "", "when": "At every visit", "forDays": 0}]'::jsonb,
     12, '22222222-2222-4222-8222-222222222224'::uuid, true, now() - interval '21 days'),
    ('99999999-9999-4999-8999-999999999904'::uuid, '${clinic_id}'::uuid, 'Certificate of fitness', 'Z00',
     'Fitness certificate',
     '[{"name": "General examination", "dose": "", "when": "At the visit", "forDays": 0},
       {"name": "Blood pressure", "dose": "", "when": "At the visit", "forDays": 0},
       {"name": "Certificate issued", "dose": "", "when": "Same day", "forDays": 0}]'::jsonb,
     7, '22222222-2222-4222-8222-222222222222'::uuid, true, now() - interval '9 days')
) as rows (id, clinic_id, name, diagnosis_code, condition, lines, used_count, owner_staff_id, shared, created_at)
where not exists (
    select 1 from templates existing where existing.clinic_id = '${clinic_id}'::uuid
)
on conflict (id) do nothing;

-- ------------------------------------------------------- doctors in consult
--
-- Two patients who are with a doctor right now, so the dashboard and the
-- console show a live queue rather than a number that is always zero.
insert into visits (id, clinic_id, patient_id, token, status, mode, source, reason, detail,
                    priority, seen_by, created_at, waited_minutes, consult_started_at)
select *
from (values
    ('66666666-6666-4666-8666-666666666604'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555502'::uuid,
     'A-016', 'in_consult', 'in_clinic', 'walk_in', 'Rash for three days', 'Temp 100.4 F', null::text,
     '22222222-2222-4222-8222-222222222223'::uuid, now() - interval '40 minutes', 18,
     now() - interval '12 minutes'),
    ('66666666-6666-4666-8666-666666666605'::uuid, '${clinic_id}'::uuid, '55555555-5555-4555-8555-555555555506'::uuid,
     'A-017', 'in_consult', 'in_clinic', 'booking', 'Follow-up: blood pressure', 'BP 148/92', null::text,
     '22222222-2222-4222-8222-222222222224'::uuid, now() - interval '25 minutes', 9,
     now() - interval '9 minutes')
) as rows (id, clinic_id, patient_id, token, status, mode, source, reason, detail, priority, seen_by,
           created_at, waited_minutes, consult_started_at)
on conflict (id) do nothing;
