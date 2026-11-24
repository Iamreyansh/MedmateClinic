create table clinics (
    id           uuid primary key,
    name         text        not null,
    initials     text        not null,
    phone        text,
    address      text,
    city         text,
    state        text,
    pin          text,
    gstin        text,
    pan          text,
    registration text,
    hfr_id       text,
    locations    integer     not null default 1,
    created_at   timestamptz not null default now()
);

insert into clinics (id, name, initials, phone, address, city, state, pin, gstin, pan,
                     registration, hfr_id, locations)
values ('11111111-1111-4111-8111-111111111111',
        'MedMate Clinic',
        'MC',
        '080 4123 4567',
        '12, 100 Feet Road, Indiranagar, Bengaluru 560038',
        'Bengaluru',
        'Karnataka (29)',
        '560038',
        '29AAJCM4821K1Z7',
        'AAJCM4821K',
        'KPME/BLR/2024/01873',
        'IN2910000123',
        2);
