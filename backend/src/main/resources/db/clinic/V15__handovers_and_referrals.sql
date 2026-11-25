-- A handover: the patient moves from one person to another.
create table handovers (
    id             uuid primary key,
    clinic_id      uuid        not null,
    visit_id       uuid        references visits (id),
    patient_id     uuid        not null references patients (id),
    from_staff_id  uuid        references staff (id),
    to_staff_id    uuid        references staff (id),
    note           text,
    status         text        not null default 'open',
    created_at     timestamptz not null default now()
);

-- A referral: one doctor asks another to see the patient.
create table referrals (
    id             uuid primary key,
    clinic_id      uuid        not null,
    visit_id       uuid        references visits (id),
    patient_id     uuid        not null references patients (id),
    from_staff_id  uuid        references staff (id),
    to_staff_id    uuid        references staff (id),
    reason         text,
    note           text,
    status         text        not null default 'open',
    created_at     timestamptz not null default now()
);

create index referrals_clinic on referrals (clinic_id, created_at desc);
