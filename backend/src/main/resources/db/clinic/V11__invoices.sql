create table invoices (
    id              uuid primary key,
    clinic_id       uuid        not null,
    patient_id      uuid        not null references patients (id),
    visit_id        uuid        references visits (id),
    prescription_id uuid        references prescriptions (id),
    prefix          text        not null default 'MCI',
    number          text        not null,
    fy              text        not null,
    lines           jsonb       not null default '[]'::jsonb,
    subtotal        numeric(12,2) not null default 0,
    discount        numeric(12,2) not null default 0,
    total           numeric(12,2) not null default 0,
    status          text        not null default 'unpaid',
    pay_mode        text,
    paid_at         timestamptz,
    created_at      timestamptz not null default now()
);

create unique index invoices_number on invoices (clinic_id, fy, number);
