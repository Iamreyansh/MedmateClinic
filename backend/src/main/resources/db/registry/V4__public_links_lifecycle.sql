-- The patient's own links, and their lifecycle.
--
-- A link is a bearer credential: it opens a patient's record without a session,
-- so it has to be hard to guess, it has to expire, and the clinic has to be
-- able to take it back.
--
-- The kind says what the link opens: a booking link opens the patient's place
-- in the queue and their symptoms form; a verify link opens one prescription
-- for checking.
--
-- Nothing here rewrites an applied migration. V1..V3 stay as they are.
alter table public_links
    add column if not exists kind text not null default 'booking',
    add column if not exists visit_id uuid,
    add column if not exists expires_at timestamptz,
    add column if not exists revoked_at timestamptz,
    add column if not exists used_at timestamptz,
    add column if not exists idempotency_key text;

-- A link that has expired or been revoked is not a link any more.
create index if not exists public_links_kind_expires on public_links (kind, expires_at);

-- A repeated submission of the same booking must not open a second visit.
create unique index if not exists public_links_idempotency
    on public_links (clinic_id, idempotency_key)
    where idempotency_key is not null;

-- The old index was on the clinic alone, and nothing filtered by it.
drop index if exists public_links_clinic;

-- A clinic's slug is how a patient finds it. The slug was derived from the
-- clinic's name and kept a trailing dash when the name ended in punctuation;
-- the dash is repaired here, and only where the repair cannot collide with
-- another clinic's slug.
with repaired as (
    select id,
           regexp_replace(booking_slug, '^-+|-+$', '', 'g') as trimmed
    from clinics
    where booking_slug ~ '^-+|-+$'
)
update clinics c
set booking_slug = repaired.trimmed
from repaired
where c.id = repaired.id
  and repaired.trimmed <> ''
  and (select count(*) from clinics other where other.booking_slug = repaired.trimmed) = 1;
