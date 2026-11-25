-- The clinic's public booking slug.
--
-- A patient reaches the booking page through this slug, not through the
-- clinic's id, so the link can be printed on a card and put on a WhatsApp
-- profile without carrying anything about the clinic's schema.
alter table clinics
    add column if not exists booking_slug text unique;

update clinics
set booking_slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where booking_slug is null;

-- The slug is how a patient finds the clinic, so it cannot be empty.
alter table clinics
    alter column booking_slug set not null;
