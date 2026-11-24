create table visits (
    id         uuid primary key,
    clinic_id  uuid        not null,
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
