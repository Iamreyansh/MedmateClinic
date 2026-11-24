create table roles (
    id        uuid primary key,
    clinic_id uuid        not null,
    name      text        not null,
    owner     boolean     not null default false,
    unique (clinic_id, name)
);

create table grants (
    id        uuid primary key,
    clinic_id uuid        not null,
    resource  text        not null,
    level     text        not null check (level in ('none', 'view', 'use')),
    unique (clinic_id, resource)
);

create table role_grants (
    role_id  uuid not null references roles (id),
    grant_id uuid not null references grants (id),
    primary key (role_id, grant_id)
);

-- the screens a clinic can open, and how far
-- a doctor: the console, the inbox and their own patients
-- a nurse: vitals, and the patients in front of them
-- the front desk: check-in, hand-over, money, bookings
-- an administrator: everything but the clinical notes
