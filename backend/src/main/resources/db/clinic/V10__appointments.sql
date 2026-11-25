create table appointments (
    id           uuid primary key,
    clinic_id    uuid        not null,
    patient_id   uuid        not null references patients (id),
    doctor_id    uuid        references staff (id),
    visit_id     uuid        references visits (id),
    starts_at    timestamptz not null,
    ends_at      timestamptz,
    mode         text        not null default 'in_clinic',
    status       text        not null default 'booked',
    reason       text,
    source       text        not null default 'reception',
    notes        text,
    created_at   timestamptz not null default now()
);

create index appointments_day on appointments (clinic_id, starts_at);
