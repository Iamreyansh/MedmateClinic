create table messages (
    id          uuid primary key,
    clinic_id   uuid        not null,
    patient_id  uuid        references patients (id),
    channel     text        not null default 'sms',
    template    text,
    body        text        not null,
    status      text        not null default 'queued',
    sent_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index messages_patient on messages (clinic_id, patient_id, created_at desc);
