create table visits (
    id         uuid primary key,
    clinic_id  uuid        not null references clinics (id),
    patient_id uuid        not null references patients (id),
    token      text        not null,
    status     text        not null default 'waiting',
    mode       text        not null default 'in_clinic',
    source     text        not null default 'walk_in',
    reason     text,
    detail     text,
    priority   text,
    seen_by    uuid        references staff (id),
    created_at timestamptz not null default now(),
    unique (clinic_id, token)
);

create index visits_clinic_status on visits (clinic_id, status);

insert into visits (id, clinic_id, patient_id, token, status, mode, source, reason, detail, priority) values
    ('66666666-6666-4666-8666-666666666601', '11111111-1111-4111-8111-111111111111',
     '55555555-5555-4555-8555-555555555501', 'A-015', 'waiting', 'in_clinic', 'walk_in',
     'Cough 5 days · symptoms filled in', 'Temp 100.4 °F · SpO₂ 95%', null),
    ('66666666-6666-4666-8666-666666666602', '11111111-1111-4111-8111-111111111111',
     '55555555-5555-4555-8555-555555555502', 'B-005', 'waiting', 'in_clinic', 'booking',
     'Rash · booked 11:00', 'Vitals pending', null),
    ('66666666-6666-4666-8666-666666666603', '11111111-1111-4111-8111-111111111111',
     '55555555-5555-4555-8555-555555555503', 'A-018', 'waiting', 'in_clinic', 'walk_in',
     'Fever · walk-in', 'Temp 101.0 °F', 'urgent');
