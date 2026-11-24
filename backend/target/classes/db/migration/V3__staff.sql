create table staff (
    id           uuid primary key,
    clinic_id    uuid        not null references clinics (id),
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

insert into staff (id, clinic_id, role_id, full_name, mobile, email, registration, hpr_id,
                    speciality, pin_hash, active)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333', 'Dr. Ananya Rao', '9876543210',
        'ananya.rao@example.in', 'KMC 84213', '71-4421-8890-3326', 'General Medicine',
        'a1e0a3eb0a4a35f7466a48ab8f12eba5c2118712090a54c0e3bd6ad06e3ddef7', true),
       ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333334', 'Dr. Vikram Shenoy', '9876543211',
        'vikram.shenoy@example.in', 'KMC 71840', '71-2233-8890-1104', 'Pediatrics', null, true),
       ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333334', 'Dr. Meghana Iyer', '9876543212',
        'meghana.iyer@example.in', 'KMC 65512', '71-8890-1122-3344',
        'Obstetrics & Gynaecology', null, true),
       ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333336', 'Priya Shetty', '9876543213',
        'priya.shetty@example.in', null, null, null, null, true);
