-- The signed prescription: the document the patient gets and the clinic prints.
create table prescriptions (
    id              uuid primary key,
    clinic_id       uuid        not null,
    visit_id        uuid        not null references visits (id),
    consultation_id uuid        references consultations (id),
    patient_id      uuid        not null references patients (id),
    signed_by       uuid        references staff (id),
    signed_at       timestamptz,
    signature_mode  text,
    version         integer     not null default 1,
    status          text        not null default 'draft',
    created_at      timestamptz not null default now()
);

create index prescriptions_visit on prescriptions (clinic_id, visit_id);
create index prescriptions_patient on prescriptions (clinic_id, patient_id, created_at desc);

create table prescription_diagnoses (
    id              uuid primary key,
    prescription_id uuid not null references prescriptions (id),
    icd_code        text,
    label           text not null,
    kind            text,
    sort_order      integer not null default 0
);

create table prescription_medicines (
    id              uuid primary key,
    prescription_id uuid not null references prescriptions (id),
    drug_name       text not null,
    generic_name    text,
    form            text,
    dose            text,
    when_text       text,
    for_days        text,
    notes           text,
    sort_order      integer not null default 0
);

create table prescription_tests (
    id              uuid primary key,
    prescription_id uuid not null references prescriptions (id),
    name            text not null,
    status          text not null default 'ordered'
);
