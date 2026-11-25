-- What the doctor writes while the patient is in the room.
--
-- One consultation per visit. It is a draft until it is signed, and signing it
-- creates the prescription, the invoice, the follow-up, the lab orders and the
-- hand-over.
create table consultations (
    id                    uuid primary key,
    clinic_id             uuid        not null,
    visit_id              uuid        not null unique references visits (id),
    patient_id            uuid        not null references patients (id),
    doctor_id             uuid        references staff (id),
    complaints            text,
    history               text,
    examination           jsonb       not null default '[]'::jsonb,
    advice_diet           text,
    advice_return         text,
    follow_up_mode        text,
    follow_up_at          timestamptz,
    follow_up_note        text,
    status                text        not null default 'draft',
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index consultations_visit on consultations (clinic_id, visit_id);
