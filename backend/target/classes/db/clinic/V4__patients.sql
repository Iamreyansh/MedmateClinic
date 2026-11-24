create table patients (
    id         uuid primary key,
    clinic_id  uuid        not null,
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
