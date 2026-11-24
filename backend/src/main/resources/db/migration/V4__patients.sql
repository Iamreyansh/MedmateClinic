create table patients (
    id         uuid primary key,
    clinic_id  uuid        not null references clinics (id),
    full_name  text        not null,
    age        integer,
    sex        text,
    phone      text,
    abha       text,
    allergies  text[]      not null default '{}',
    conditions text[]      not null default '{}',
    created_at timestamptz not null default now()
);

create index patients_clinic on patients (clinic_id);

insert into patients (id, clinic_id, full_name, age, sex, phone, abha, allergies, conditions) values
    ('55555555-5555-4555-8555-555555555501', '11111111-1111-4111-8111-111111111111',
     'Rohit Menon', 8, 'M', '+91 98450 02233', 'rohit.menon@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555502', '11111111-1111-4111-8111-111111111111',
     'Ishaan Pai', 3, 'M', '+91 98450 03344', 'ishaan.pai@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555503', '11111111-1111-4111-8111-111111111111',
     'Aarav Nair', 6, 'M', '+91 98450 04455', 'aarav.nair@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555504', '11111111-1111-4111-8111-111111111111',
     'Kavya Nair', 34, 'F', '+91 98450 01122', 'kavya.nair@abdm',
     array['Penicillin (rash)'], array['Type 2 diabetes']),
    ('55555555-5555-4555-8555-555555555505', '11111111-1111-4111-8111-111111111111',
     'Diya Kamath', 5, 'F', '+91 98450 05566', 'diya.kamath@abdm', '{}', '{}'),
    ('55555555-5555-4555-8555-555555555506', '11111111-1111-4111-8111-111111111111',
     'Fathima Begum', 27, 'F', '+91 98450 06677', 'fathima.begum@abdm', '{}', '{}');
