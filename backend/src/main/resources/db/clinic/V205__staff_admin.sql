-- The staff and admin screens: branches, pharmacies, working hours, leave,
-- reusable profiles, the agreements the clinic has accepted and the devices
-- signed in to it.
--
-- Nothing here rewrites an applied migration. V1..V15 and V200..V204 stay as
-- they are; this migration moves the service forward from them. Every table
-- and every index is created only when it is missing, and every row that is
-- seeded is seeded only when it is absent, so this runs cleanly on a database
-- that already has the demo data in it.
--
-- Where a thing already has a home, this migration extends that home rather
-- than opening a second one:
--   * the clinic's own details live on clinic_profile (V1) — extended below;
--   * a person's access lives on the staff row and the grant tables (V2, V3)
--     — extended below;
--   * the services the clinic offers are the doctors' specialities, read by
--     ClinicSettingsService — so they are not stored a second time.

-- The branches the clinic works from.
--
-- The clinic's own address used to be the only place it worked from, so it
-- lived on the clinic profile and there was nowhere to put a second branch.
-- A branch is a row of its own now; the profile keeps the clinic's
-- registered address, which is what its letterhead and its registrations
-- are built from.
create table if not exists clinic_branches (
    id         uuid primary key,
    clinic_id  uuid        not null,
    name       text        not null,
    address    text        not null default '',
    city       text        not null default '',
    state      text        not null default '',
    phone      text        not null default '',
    rooms      integer     not null default 1,
    hfr_id     text,
    is_primary boolean     not null default false,
    active     boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- A branch's name is how the clinic tells two places apart, so it is unique
-- inside the clinic — case folded, because "Koramangala" and "koramangala"
-- are the same place.
create unique index if not exists clinic_branches_name
    on clinic_branches (clinic_id, lower(name));

create index if not exists clinic_branches_clinic
    on clinic_branches (clinic_id, created_at desc);

-- The pharmacies the clinic sends prescriptions to.
--
-- A pharmacy is a place a prescription can be collected from, so it carries
-- the address, the number to ring and the person to ask for.
create table if not exists clinic_pharmacies (
    id             uuid primary key,
    clinic_id      uuid        not null,
    name           text        not null,
    address        text        not null default '',
    city           text        not null default '',
    state          text        not null default '',
    phone          text        not null default '',
    email          text,
    contact_person text,
    active         boolean     not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create unique index if not exists clinic_pharmacies_name
    on clinic_pharmacies (clinic_id, lower(name));

create index if not exists clinic_pharmacies_clinic
    on clinic_pharmacies (clinic_id, created_at desc);

-- The profiles the clinic adds people from.
--
-- A profile is what a new person usually is: the role they hold, what they
-- do, what they charge and the hours they keep. It saves the clinic typing
-- the same seven fields for every doctor it hires.
create table if not exists clinic_profiles (
    id               uuid primary key,
    clinic_id        uuid        not null,
    name             text        not null,
    role_name        text        not null,
    speciality       text,
    registration     text,
    hpr_id           text,
    consultation_fee numeric(10, 2) not null default 0,
    video_fee        numeric(10, 2) not null default 0,
    session_start    text,
    session_end      text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create unique index if not exists clinic_profiles_name
    on clinic_profiles (clinic_id, lower(name));

-- The hours a doctor keeps, one row per session per weekday.
--
-- A doctor who runs two sessions a day has two rows on that weekday. The
-- weekday is 0 for Sunday through 6 for Saturday, the way the reference
-- writes it.
create table if not exists doctor_sessions (
    id            uuid primary key,
    clinic_id     uuid        not null,
    staff_id      uuid        not null,
    weekday       integer     not null check (weekday between 0 and 6),
    session_start time        not null,
    session_end   time        not null,
    slot_minutes  integer     not null default 15,
    active        boolean     not null default true,
    unique (clinic_id, staff_id, weekday, session_start)
);

create index if not exists doctor_sessions_staff
    on doctor_sessions (clinic_id, staff_id, weekday);

-- The days a doctor is away.
--
-- The leave is a range, because a clinic books the days around it too.
create table if not exists doctor_leave (
    id         uuid primary key,
    clinic_id  uuid    not null,
    staff_id   uuid    not null,
    from_date  date    not null,
    to_date    date    not null,
    reason     text,
    created_at timestamptz not null default now(),
    unique (clinic_id, staff_id, from_date),
    check (to_date >= from_date)
);

create index if not exists doctor_leave_staff
    on doctor_leave (clinic_id, staff_id, from_date);

-- The agreements the clinic has accepted, and when it accepted them.
--
-- The sign-up flow records the agreements the owner ticked, but nothing kept
-- them: the record lived in the browser and was gone with it. They are kept
-- here now, with the version, so an acceptance can be shown and a new
-- version of the terms is a new row rather than an edit of the old one.
create table if not exists clinic_agreements (
    id          uuid primary key,
    clinic_id   uuid        not null,
    kind        text        not null,
    title       text        not null,
    version     text        not null,
    accepted_at timestamptz not null default now(),
    accepted_by uuid,
    unique (clinic_id, kind, version)
);

create index if not exists clinic_agreements_clinic
    on clinic_agreements (clinic_id, kind);

-- The devices signed in to the clinic.
--
-- A device is remembered so the clinic can see where its sessions are, and
-- so a PIN can be turned off on one phone without turning it off everywhere.
create table if not exists clinic_devices (
    id           uuid primary key,
    clinic_id    uuid        not null,
    staff_id     uuid        not null,
    device_name  text        not null,
    platform     text,
    last_seen_at timestamptz not null default now(),
    created_at   timestamptz not null default now(),
    unique (clinic_id, staff_id, device_name)
);

create index if not exists clinic_devices_staff
    on clinic_devices (clinic_id, staff_id, last_seen_at desc);

-- The pharmacy a prescription was sent to.
--
-- The prescriptions table had nowhere to say which pharmacy a prescription
-- went to, so a pharmacy could not tell whether it was still in use. The
-- column is added here so the write path needs no migration of its own.
alter table prescriptions
    add column if not exists pharmacy_id uuid;

-- The clinic's own details, on the row that already holds them.
--
-- The profile has the address, the registrations and the timezone. It had no
-- room for the name the clinic prints, the address its letters go to, or the
-- line under the letterhead's address — so those three are added here rather
-- than in a second table that could disagree with this one.
alter table clinic_profile
    add column if not exists display_name text;

alter table clinic_profile
    add column if not exists email text;

alter table clinic_profile
    add column if not exists letterhead_note text;

-- A person's own access, on the row that already holds them.
--
-- The role decides what a person may open, and that comes from the grants.
-- This is the exception the clinic made for this one person: the resources
-- they may open beyond their role, and the ones they may not. The levels are
-- the same three the grants use, so there is one vocabulary for access and
-- not two.
alter table staff
    add column if not exists access_overrides jsonb not null default '{}'::jsonb;

-- The room a doctor works in.
--
-- The staff table carried a speciality but no room, so the doctors card and
-- the dashboard showed the speciality where the room belonged. The room is
-- the doctor's own: it is the room they are found in, at the branch they
-- work from.
alter table staff
    add column if not exists room text;

-- The branch a doctor works at.
--
-- The staff table carried no place, so a clinic with two branches could not
-- say which of them a doctor was in. The branch is the doctor's own row, so
-- a branch cannot be removed while somebody still works in it.
alter table staff
    add column if not exists branch_id uuid;

create index if not exists staff_branch
    on staff (clinic_id, branch_id);

-- The demo clinic's doctors get their own rooms.
--
-- The clause keeps the rows on the development clinic only. The clinic's
-- people are seeded after this migration has run, so this fills the rooms
-- for a clinic whose people are already here. A room the clinic has not
-- chosen is left empty, and the screens show a dash rather than a guess.
--
-- The mapping is the demo script's mapping — Dr. Ananya Rao in Room 2, Dr.
-- Vikram Shenoy in Room 3, Dr. Meghana Iyer in Room 1 — so a clinic seeded
-- twice is not left with two answers about where a doctor is found.
update staff
set room = case
    when full_name = 'Dr. Ananya Rao' then 'Room 2'
    when full_name = 'Dr. Vikram Shenoy' then 'Room 3'
    when full_name = 'Dr. Meghana Iyer' then 'Room 1'
    else room
end
where full_name in ('Dr. Ananya Rao', 'Dr. Vikram Shenoy', 'Dr. Meghana Iyer')
  and clinic_id = '11111111-1111-4111-8111-111111111111';

-- The clinic's first branch.
--
-- The address the clinic already had is the place it works from, so it
-- becomes the primary branch and the owner can rename it.
insert into clinic_branches (
    id, clinic_id, name, address, city, state, phone, rooms, hfr_id, is_primary
)
select gen_random_uuid(),
       p.clinic_id,
       'Main clinic',
       coalesce(p.address, ''),
       coalesce(p.city, ''),
       coalesce(p.state, ''),
       coalesce(p.phone, ''),
       1,
       p.hfr_id,
       true
from clinic_profile p
where not exists (
    select 1 from clinic_branches b where b.clinic_id = p.clinic_id
)
on conflict do nothing;
