-- The patient's own links, and the clinic they belong to.
--
-- A patient on their own phone has no session, so their link is the only thing
-- that says which clinic they are in. The link key — the token, the intake
-- key — is recorded here when the clinic hands it out, so the service can
-- route the request to the right schema without asking the patient who they
-- are.
create table public_links (
    link_key  text primary key,
    clinic_id uuid not null references clinics (id),
    created_at timestamptz not null default now()
);

create index public_links_clinic on public_links (clinic_id);
