create table lab_orders (
    id              uuid primary key,
    clinic_id       uuid        not null,
    patient_id      uuid        not null references patients (id),
    visit_id        uuid        references visits (id),
    prescription_id uuid        references prescriptions (id),
    test_name       text        not null,
    status          text        not null default 'ordered',
    ordered_by      uuid        references staff (id),
    ordered_at      timestamptz not null default now(),
    reported_at     timestamptz,
    result_value    text,
    result_note     text,
    reference_low   text,
    reference_high  text,
    critical        boolean     not null default false
);

create index lab_orders_patient on lab_orders (clinic_id, patient_id, ordered_at desc);
