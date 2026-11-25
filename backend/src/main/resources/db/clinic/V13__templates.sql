create table templates (
    id             uuid primary key,
    clinic_id      uuid        not null,
    name           text        not null,
    diagnosis_code text,
    condition      text,
    lines          jsonb       not null default '[]'::jsonb,
    used_count     integer     not null default 0,
    owner_staff_id uuid        references staff (id),
    shared         boolean     not null default false,
    created_at     timestamptz not null default now()
);

create index templates_clinic on templates (clinic_id, used_count desc);
