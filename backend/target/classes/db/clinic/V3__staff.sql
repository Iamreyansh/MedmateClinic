create table staff (
    id           uuid primary key,
    clinic_id    uuid        not null,
    role_id      uuid        references roles (id),
    full_name    text        not null,
    mobile       text        not null,
    email        text,
    registration text,
    hpr_id       text,
    speciality   text,
    pin_hash     text,
    active       boolean     not null default true,
    created_at   timestamptz not null default now()
);

create unique index staff_clinic_mobile on staff (clinic_id, mobile);
