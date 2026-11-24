create table clinic_profile (
    clinic_id    uuid primary key,
    phone        text,
    address      text,
    city         text,
    state        text,
    pin          text,
    gstin        text,
    pan          text,
    registration text,
    hfr_id       text,
    locations    integer     not null default 1
);
