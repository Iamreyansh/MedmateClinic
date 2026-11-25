-- The clinic's last three months.
--
-- Enough history for the reports to have something to count: the visits, the
-- consultations, the prescriptions, the bills that were paid, the bookings
-- that were kept and the ones that were not.
--
-- This is development data for one clinic. It is written the way the product
-- writes it — a visit, a consultation, a signed prescription, an invoice, a
-- booking — so the reports count the same way the product does.

select setseed(0.42);

-- what each doctor charges
update staff set consultation_fee = 500 where full_name = 'Dr. Ananya Rao';
update staff set consultation_fee = 600 where full_name = 'Dr. Vikram Shenoy';
update staff set consultation_fee = 700 where full_name = 'Dr. Meghana Iyer';

-- ------------------------------------------------------------------ people

with names as (
    select first_name,
           last_name,
           row_number() over (order by first_name, last_name) as n
    from (values
    ('Rohan', 'Kulkarni'), ('Sneha', 'Pai'), ('Imran', 'Sheikh'),
           ('Divya', 'Rao'), ('Karthik', 'Nair'), ('Anjali', 'Deshmukh'),
           ('Farhan', 'Khan'), ('Meera', 'Iyer'), ('Suresh', 'Rathore'),
           ('Nandini', 'Joshi'), ('Arjun', 'Menon'), ('Pooja', 'Bhat'),
           ('Vikash', 'Chauhan'), ('Ritu', 'Saxena'), ('Manoj', 'Pillai'),
           ('Shalini', 'Verma'), ('Deepak', 'Yadav'), ('Anusha', 'Reddy'),
           ('Gaurav', 'Trivedi'), ('Lavanya', 'Hegde'), ('Naveen', 'Bhatt'),
           ('Rashmi', 'Agarwal'), ('Sanjay', 'Kamble'), ('Kritika', 'Nanda'),
           ('Joseph', 'Thomas'), ('Anjali', 'Fernandes'), ('Tarun', 'Shah')
    ) as t(first_name, last_name)
)
insert into patients (id, clinic_id, full_name, age, sex, phone, abha, allergies, conditions,
                      pregnant, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       first_name || ' ' || last_name,
       3 + (i * 7) % 62,
       case when i % 2 = 0 then 'M' else 'F' end,
       '+91 984' || lpad((450 + i * 3 % 500)::text, 3, '0') || ' ' || lpad((10000 + i * 37 % 89999)::text, 5, '0'),
       lower(first_name || '.' || last_name || i || '@abdm'),
       case when i % 17 = 0 then array['Penicillin (rash)'] else '{}'::text[] end,
       case when i % 11 = 0 then array['Type 2 diabetes']
            when i % 13 = 0 then array['Hypertension'] else '{}'::text[] end,
       case when i % 29 = 0 then true else false end,
       (now() - ((i * 2) % 120 || ' days')::interval)
from generate_series(1, 130) as i
         join names on names.n = ((i - 1) % 26) + 1;

-- ------------------------------------------------------------------ visits

with days as (
    select generate_series(date_trunc('day', now() - interval '92 days'),
                           date_trunc('day', now()),
                           interval '1 day') as day
),
doctors as (
    select s.id,
           row_number() over (order by s.full_name) as rn
    from staff s
             join roles r on r.id = s.role_id
    where s.clinic_id = '${clinic_id}'
      and s.active
      and r.name in ('owner', 'doctor')
),
complaints as (
    select reason,
           detail,
           row_number() over (order by reason) as n
    from (values
              ('Burning while urinating', 'Urine routine advised'),
              ('Cough 5 days, dry cough', 'SpO2 95%, chest clear'),
              ('Fever with chills since 3 days', 'Temp 100.4 F, throat irritation'),
              ('Follow-up for diabetes', 'Random sugar 210'),
              ('Headache with nausea', 'BP 150/90'),
              ('Knee pain, worse on climbing', 'Swelling absent'),
              ('Loose motions since 2 days', 'Dehydrated'),
              ('Routine check-up', 'All vitals normal'),
              ('Skin rash on forearms', 'No itching'),
              ('Sore throat and body ache', 'Tonsils enlarged')
          ) as t(reason, detail)
)
insert into visits (id, clinic_id, patient_id, token, status, mode, source, reason, detail, priority,
                    seen_by, created_at, waited_minutes, consult_minutes, consult_started_at, no_show)
select gen_random_uuid(),
       '${clinic_id}',
       patient.id,
       'T-' || to_char(d.day, 'YYMMDD') || '-' || lpad(v.n::text, 3, '0'),
       case when (v.n + extract(doy from d.day)::int) % 19 = 0 then 'no_show' else 'done' end,
       'in_clinic',
       case when v.n % 3 = 0 then 'online' when v.n % 3 = 1 then 'walk_in' else 'booking' end,
       c.reason,
       c.detail,
       case when (v.n + extract(doy from d.day)::int) % 23 = 0 then 'urgent' else null end,
       (select id from doctors where rn = ((v.n + extract(doy from d.day)::int) % 3) + 1),
       ((d.day::date + (9 + (v.n % 9)) * interval '1 hour' + (v.n % 4) * interval '15 minutes')
           at time zone 'Asia/Kolkata'),
       case when (v.n + extract(doy from d.day)::int) % 19 = 0 then null else 4 + (v.n * 7) % 34 end,
       case when (v.n + extract(doy from d.day)::int) % 19 = 0 then null else 6 + (v.n * 5) % 22 end,
       case when (v.n + extract(doy from d.day)::int) % 19 = 0 then null
            else ((d.day::date + (9 + (v.n % 9)) * interval '1 hour' + (v.n % 4) * interval '15 minutes')
                at time zone 'Asia/Kolkata') end,
       case when (v.n + extract(doy from d.day)::int) % 19 = 0 then true else false end
from days d
         cross join generate_series(1, 12) v(n)
         join complaints c on c.n = ((v.n + extract(doy from d.day)::int) % 10) + 1
         join lateral (
             select p.id
             from patients p
             where p.clinic_id = '${clinic_id}'
             order by md5(p.id::text || v.n::text || d.day::text)
             limit 1
             ) patient on true;

-- ----------------------------------------------------------- consultations

insert into consultations (id, clinic_id, visit_id, patient_id, doctor_id, complaints, history,
                           examination, advice_diet, advice_return, follow_up_mode, follow_up_at,
                           follow_up_note, status, created_at, updated_at)
select gen_random_uuid(),
       '${clinic_id}',
       v.id,
       v.patient_id,
       v.seen_by,
       v.reason,
       null,
       '[]'::jsonb,
       null,
       'If the fever comes back, come earlier.',
       case when r.n % 4 = 0 then 'after 3 days' else null end,
       case when r.n % 4 = 0 then v.created_at + interval '3 days' else null end,
       case when r.n % 4 = 0 then 'Review with the reports' else null end,
       'signed',
       v.created_at,
       v.created_at + interval '15 minutes'
from visits v
         join (select id, row_number() over (order by created_at) as n from visits) r on r.id = v.id
where v.status = 'done';

-- ------------------------------------------------------------ prescriptions

insert into prescriptions (id, clinic_id, visit_id, consultation_id, patient_id, signed_by,
                          signed_at, signature_mode, version, status, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       v.id,
       c.id,
       v.patient_id,
       v.seen_by,
       v.created_at + (v.consult_minutes || ' minutes')::interval,
       'test',
       1,
       'signed',
       v.created_at
from visits v
         join consultations c on c.visit_id = v.id
where v.status = 'done';

-- the diagnoses
with catalogue(n, icd_code, label, kind) as (
    values (1, 'J02.9', 'Pharyngitis, unspecified', 'primary'),
           (2, 'J06.9', 'Acute upper respiratory infection, unspecified', 'primary'),
           (3, 'E11.9', 'Type 2 diabetes mellitus without complications', 'primary'),
           (4, 'I10', 'Essential (primary) hypertension', 'primary'),
           (5, 'A09', 'Infectious gastroenteritis, unspecified', 'primary'),
           (6, 'J00', 'Acute nasopharyngitis', 'primary'),
           (7, 'R50.9', 'Fever, unspecified', 'primary'),
           (8, 'M54.5', 'Low back pain', 'primary'),
           (9, 'K29.7', 'Gastritis', 'primary'),
           (10, 'L30.9', 'Dermatitis, unspecified', 'primary'),
           (11, 'N39.0', 'Urinary tract infection, site not specified', 'primary'),
           (12, 'E78.5', 'Hyperlipidaemia, unspecified', 'primary')
),
ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_diagnoses (id, prescription_id, icd_code, label, kind, sort_order)
select gen_random_uuid(), r.id, c.icd_code, c.label, c.kind, 0
from ranked r
         join catalogue c on c.n = (r.n % 12) + 1;

-- a second diagnosis for every third consultation
with catalogue(n, icd_code, label, kind) as (
    values (1, 'J02.9', 'Pharyngitis, unspecified', 'primary'),
           (2, 'J06.9', 'Acute upper respiratory infection, unspecified', 'primary'),
           (3, 'E11.9', 'Type 2 diabetes mellitus without complications', 'primary'),
           (4, 'I10', 'Essential (primary) hypertension', 'primary'),
           (5, 'A09', 'Infectious gastroenteritis, unspecified', 'primary'),
           (6, 'J00', 'Acute nasopharyngitis', 'primary'),
           (7, 'R50.9', 'Fever, unspecified', 'primary'),
           (8, 'M54.5', 'Low back pain', 'primary'),
           (9, 'K29.7', 'Gastritis', 'primary'),
           (10, 'L30.9', 'Dermatitis, unspecified', 'primary'),
           (11, 'N39.0', 'Urinary tract infection, site not specified', 'primary'),
           (12, 'E78.5', 'Hyperlipidaemia, unspecified', 'primary')
),
ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_diagnoses (id, prescription_id, icd_code, label, kind, sort_order)
select gen_random_uuid(), r.id, c.icd_code, c.label, 'secondary', 1
from ranked r
         join catalogue c on c.n = ((r.n + 5) % 12) + 1
where r.n % 3 = 0;

-- the medicines
with catalogue(n, drug_name, generic_name, form, dose, when_text, for_days) as (
    values (1, 'Paracetamol 650', 'Paracetamol', 'Tablet', '650 mg', '1-1-1', '3 days'),
           (2, 'Cetirizine 10', 'Cetirizine', 'Tablet', '10 mg', 'Once daily', '5 days'),
           (3, 'Pantoprazole 40', 'Pantoprazole', 'Tablet', '40 mg', 'Before breakfast', '10 days'),
           (4, 'Metformin 500', 'Metformin', 'Tablet', '500 mg', '1-0-1', '30 days'),
           (5, 'Ondansetron 4', 'Ondansetron', 'Tablet', '4 mg', 'SOS', '3 days'),
           (6, 'Amoxicillin 500', 'Amoxicillin', 'Capsule', '500 mg', '1-1-1', '5 days'),
           (7, 'Azithromycin 500', 'Azithromycin', 'Tablet', '500 mg', 'Once daily', '3 days'),
           (8, 'Ciprofloxacin 250', 'Ciprofloxacin', 'Tablet', '250 mg', '1-0-1', '5 days'),
           (9, 'Doxycycline 100', 'Doxycycline', 'Capsule', '100 mg', 'Once daily', '5 days'),
           (10, 'Metformin 1000', 'Metformin', 'Tablet', '1000 mg', '1-1-1', '30 days'),
           (11, 'Warfarin 5', 'Warfarin', 'Tablet', '5 mg', 'Once daily', 'ongoing'),
           (12, 'Ibuprofen 400', 'Ibuprofen', 'Tablet', '400 mg', '1-1-1', '3 days')
),
ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(), r.id, c.drug_name, c.generic_name, c.form, c.dose, c.when_text, c.for_days,
       null, 0
from ranked r
         join catalogue c on c.n = (r.n % 5) + 1;

-- a second medicine
with catalogue(n, drug_name, generic_name, form, dose, when_text, for_days) as (
    values (1, 'Paracetamol 650', 'Paracetamol', 'Tablet', '650 mg', '1-1-1', '3 days'),
           (2, 'Cetirizine 10', 'Cetirizine', 'Tablet', '10 mg', 'Once daily', '5 days'),
           (3, 'Pantoprazole 40', 'Pantoprazole', 'Tablet', '40 mg', 'Before breakfast', '10 days'),
           (4, 'Metformin 500', 'Metformin', 'Tablet', '500 mg', '1-0-1', '30 days'),
           (5, 'Ondansetron 4', 'Ondansetron', 'Tablet', '4 mg', 'SOS', '3 days')
),
ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(), r.id, c.drug_name, c.generic_name, c.form, c.dose, c.when_text, c.for_days,
       null, 1
from ranked r
         join catalogue c on c.n = ((r.n + 2) % 5) + 1
where r.n % 5 <> 0;

-- an antibiotic for what reads like a cold
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(),
       rx.id,
       'Amoxicillin 500',
       'Amoxicillin',
       'Capsule',
       '500 mg',
       '1-1-1',
       '5 days',
       null,
       2
from prescriptions rx
         join visits v on v.id = rx.visit_id
where (v.reason ilike '%fever%' or v.reason ilike '%ough%' or v.reason ilike '%throat%')
  and not exists (
    select 1 from prescription_medicines m
    where m.prescription_id = rx.id and lower(m.generic_name) = 'amoxicillin'
);

-- the same medicine written twice
with ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(), rx.id, 'Amoxicillin 500', 'Amoxicillin', 'Capsule', '500 mg', '1-1-1',
       '5 days', null, 3
from ranked rx
where rx.n % 11 = 0;

-- a dose above the daily maximum
with ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(), rx.id, 'Metformin 1000', 'Metformin', 'Tablet', '1000 mg', '1-1-1',
       '30 days', null, 3
from ranked rx
where rx.n % 13 = 0;

-- two medicines that should not be given together
with ranked as (
    select rx.id, row_number() over (order by rx.signed_at) as n
    from prescriptions rx
)
insert into prescription_medicines (id, prescription_id, drug_name, generic_name, form, dose,
                                    when_text, for_days, notes, sort_order)
select gen_random_uuid(),
       rx.id,
       case when m.generic_name = 'Warfarin' then 'Warfarin 5' else 'Ibuprofen 400' end,
       m.generic_name,
       'Tablet',
       case when m.generic_name = 'Warfarin' then '5 mg' else '400 mg' end,
       case when m.generic_name = 'Warfarin' then 'Once daily' else '1-1-1' end,
       case when m.generic_name = 'Warfarin' then 'ongoing' else '3 days' end,
       null,
       4
from ranked rx
         join (values ('Warfarin'), ('Ibuprofen')) m(generic_name) on true
where rx.n % 17 = 0
  and not exists (
    select 1 from prescription_medicines pm
    where pm.prescription_id = rx.id and lower(pm.generic_name) = lower(m.generic_name)
);

-- ------------------------------------------------------------ safety notes

-- what the checker would have shown the doctor, counted the way it counts it
update prescriptions rx
set antibiotic = exists (
        select 1 from prescription_medicines m
        where m.prescription_id = rx.id
          and lower(m.generic_name) in
              ('amoxicillin', 'azithromycin', 'ciprofloxacin', 'doxycycline', 'metronidazole', 'cotrimoxazole')
    ),
    safety_alert = notes.kinds <> '',
    safety_alert_kind = nullif(notes.kinds, ''),
    safety_overridden = notes.kinds <> '' and mod(abs(ascii(substr(rx.id::text, 1, 1)) + ascii(substr(rx.id::text, 2, 1))), 10) = 3,
    safety_override_reason = case
        when notes.kinds <> '' and mod(abs(ascii(substr(rx.id::text, 1, 1)) + ascii(substr(rx.id::text, 2, 1))), 10) = 3
            then 'Patient has taken it before without trouble'
        else null
        end
from (
    select rx2.id,
           concat_ws(',',
                     case when exists (
                         select 1 from prescription_medicines m
                         where m.prescription_id = rx2.id
                         group by lower(m.generic_name)
                         having count(*) > 1
                     ) then 'duplicate_ingredient' end,
                     case when exists (
                         select 1
                         from prescription_medicines m
                                  join visits v on v.id = rx2.visit_id
                                  join patients pt on pt.id = v.patient_id
                         where m.prescription_id = rx2.id
                           and lower(m.generic_name) in ('amoxicillin', 'ampicillin')
                           and exists (
                               select 1
                               from unnest(pt.allergies) allergy
                               where lower(allergy) like '%penicillin%'
                           )
                     ) then 'allergy_conflict' end,
                     case when exists (
                         select 1 from prescription_medicines m
                         where m.prescription_id = rx2.id
                           and lower(m.generic_name) = 'metformin'
                           and m.dose like '1000%'
                     ) then 'dose_above_daily_max' end,
                     case when exists (
                         select 1 from prescription_medicines m
                         where m.prescription_id = rx2.id and lower(m.generic_name) = 'warfarin'
                     ) and exists (
                         select 1 from prescription_medicines m
                         where m.prescription_id = rx2.id and lower(m.generic_name) = 'ibuprofen'
                     ) then 'drug_interaction' end,
                     case when exists (
                         select 1
                         from prescription_medicines m
                                  join visits v on v.id = rx2.visit_id
                         where m.prescription_id = rx2.id
                           and lower(m.generic_name) in
                               ('amoxicillin', 'azithromycin', 'ciprofloxacin', 'doxycycline', 'metronidazole')
                           and (v.reason ilike '%fever%' or v.reason ilike '%ough%'
                               or v.reason ilike '%throat%')
                     ) then 'antibiotic_for_viral_illness' end,
                     case when exists (
                         select 1
                         from prescription_medicines m
                                  join visits v on v.id = rx2.visit_id
                                  join patients pt on pt.id = v.patient_id
                         where m.prescription_id = rx2.id
                           and ((pt.pregnant and lower(m.generic_name) in
                                       ('doxycycline', 'ciprofloxacin', 'warfarin', 'methotrexate', 'aspirin'))
                               or (pt.age < 12 and lower(m.generic_name) in
                                       ('doxycycline', 'ciprofloxacin', 'aspirin')))
                     ) then 'not_for_pregnancy_or_children' end
                     ) as kinds
    from prescriptions rx2
) notes
where notes.id = rx.id;

-- ---------------------------------------------------------------- invoices

with base as (
    select count(*) as n from invoices
)
insert into invoices (id, clinic_id, patient_id, visit_id, prescription_id, prefix, number, fy,
                      lines, subtotal, discount, total, status, pay_mode, paid_at, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       rx.patient_id,
       rx.visit_id,
       rx.id,
       'MCI',
       '26-27/' || lpad((row_number() over (order by rx.signed_at) + base.n)::text, 4, '0'),
       '2026-27',
       jsonb_build_array(jsonb_build_object('name', 'Consultation fee', 'amount', s.consultation_fee)),
       s.consultation_fee,
       0,
       s.consultation_fee,
       case
           when rx.signed_at > now() - interval '1 day' then 'unpaid'
           when (row_number() over (order by rx.signed_at)) % 17 = 0 then 'refunded'
           when (row_number() over (order by rx.signed_at)) % 9 = 0 then 'unpaid'
           else 'paid'
           end,
       case
           when rx.signed_at > now() - interval '1 day' then null
           when (row_number() over (order by rx.signed_at)) % 9 = 0 then null
           when (row_number() over (order by rx.signed_at)) % 10 < 6 then 'upi'
           when (row_number() over (order by rx.signed_at)) % 10 < 9 then 'cash'
           else 'card'
           end,
       case
           when rx.signed_at > now() - interval '1 day' then null
           when (row_number() over (order by rx.signed_at)) % 9 = 0 then null
           else rx.signed_at + interval '7 minutes'
           end,
       rx.signed_at
from prescriptions rx
         join staff s on s.id = rx.signed_by
         cross join base;

-- ------------------------------------------------------------- appointments

with days as (
    select generate_series(date_trunc('day', now() - interval '92 days'),
                           date_trunc('day', now()),
                           interval '1 day') as day
),
doctors as (
    select s.id,
           row_number() over (order by s.full_name) as rn
    from staff s
             join roles r on r.id = s.role_id
    where s.clinic_id = '${clinic_id}'
      and s.active
      and r.name in ('owner', 'doctor')
)
insert into appointments (id, clinic_id, patient_id, doctor_id, visit_id, starts_at, ends_at, mode,
                          status, reason, source, notes, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       patient.id,
       (select id from doctors where rn = (n % 3) + 1),
       null,
       ((d.day::date + (8 + n) * interval '1 hour') at time zone 'Asia/Kolkata'),
       ((d.day::date + (8 + n) * interval '1 hour' + interval '20 minutes') at time zone 'Asia/Kolkata'),
       'in_clinic',
       case
           when d.day >= date_trunc('day', now()) then 'booked'
           when n % 17 = 0 then 'no_show'
           else 'completed'
           end,
       'General consultation',
       case when n % 3 = 0 then 'online' when n % 3 = 1 then 'phone' else 'walk_in' end,
       null,
       d.day - interval '1 day'
from days d
         cross join generate_series(1, 7) n
         join lateral (
             select p.id
             from patients p
             where p.clinic_id = '${clinic_id}'
             order by md5(p.id::text || n::text || d.day::text)
             limit 1
             ) patient on true;

-- the follow-ups the doctors asked for
with ranked as (
    select c.id,
           c.patient_id,
           c.visit_id,
           c.follow_up_at,
           c.created_at,
           v.seen_by,
           row_number() over (order by c.follow_up_at) as n
    from consultations c
             join visits v on v.id = c.visit_id
    where c.follow_up_at is not null
)
insert into appointments (id, clinic_id, patient_id, doctor_id, visit_id, starts_at, ends_at, mode,
                          status, reason, source, notes, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       r.patient_id,
       r.seen_by,
       r.visit_id,
       r.follow_up_at,
       r.follow_up_at + interval '20 minutes',
       'in_clinic',
       case
           when r.follow_up_at > now() then 'booked'
           when r.n % 9 = 0 then 'no_show'
           else 'completed'
           end,
       'Follow-up',
       'consult',
       null,
       r.created_at
from ranked r
-- some patients never booked the follow-up at all
where r.n % 8 <> 0;

-- -------------------------------------------------------------- lab orders

with ranked as (
    select rx.id,
           rx.patient_id,
           rx.visit_id,
           rx.signed_by,
           rx.signed_at,
           row_number() over (order by rx.signed_at) as n
    from prescriptions rx
),
chosen as (
    select r.*,
           case r.n % 4
               when 0 then 'Complete Blood Count'
               when 1 then 'Dengue NS1 Antigen'
               when 2 then 'Urine Routine'
               else 'HbA1c'
               end as test_name
    from ranked r
    where r.n % 4 = 0
)
insert into prescription_tests (id, prescription_id, name, status)
select gen_random_uuid(), c.id, c.test_name, 'ordered'
from chosen c;

insert into lab_orders (id, clinic_id, patient_id, visit_id, prescription_id, test_name, status,
                        ordered_by, ordered_at, reported_at, result_value, result_note, reference_low,
                        reference_high, critical)
select gen_random_uuid(),
       '${clinic_id}',
       rx.patient_id,
       rx.visit_id,
       rx.id,
       t.name,
       'reported',
       rx.signed_by,
       rx.signed_at,
       rx.signed_at + interval '1 day',
       null,
       null,
       null,
       null,
       false
from prescription_tests t
         join prescriptions rx on rx.id = t.prescription_id;
