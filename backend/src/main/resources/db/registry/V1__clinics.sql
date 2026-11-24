-- The tenant directory.
--
-- One row per clinic. The schema_name is where that clinic's data lives: every
-- clinic gets its own schema, its own tables, its own migrations and its own
-- audit trail. Nothing of one clinic is ever in another's schema.
create table clinics (
    id           uuid primary key,
    name         text        not null,
    initials     text        not null,
    schema_name  text        not null unique,
    created_at   timestamptz not null default now()
);

-- Which clinic a mobile number belongs to. A number is unique inside a clinic,
-- not across clinics, so the sign-in needs a directory to find the tenant
-- before it can ask that tenant's schema who the person is.
create table clinic_staff_directory (
    phone    text        not null,
    clinic_id uuid       not null references clinics (id),
    staff_id uuid        not null,
    primary key (phone, clinic_id)
);

insert into clinics (id, name, initials, schema_name)
values ('11111111-1111-4111-8111-111111111111', 'MedMate Clinic', 'MC', 'clinic_11111111');

insert into clinic_staff_directory (phone, clinic_id, staff_id) values
    ('9876543210', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'),
    ('9876543211', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222223'),
    ('9876543212', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222224'),
    ('9876543213', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222225');
