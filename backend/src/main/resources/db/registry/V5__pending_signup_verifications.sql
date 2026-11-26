-- The number a prospective owner proved they hold, before the clinic exists.
--
-- A clinic signs itself up, and the first thing the sign-up does is check the
-- owner's number with a code. The clinic does not exist yet — there is no
-- clinic to route the request to — so the check cannot live in a clinic's
-- schema. It lives in the registry, with the other things that are true
-- before a clinic exists.
--
-- The code itself is never kept: only its hash is, and the hash is stretched
-- the slow way, so a stolen row cannot be attacked without paying for every
-- round. The row also carries the number of tries, when it stops working and
-- whether it has already been used to create a clinic.

create table pending_signup_verifications (
    id          uuid primary key,
    mobile      text        not null unique,
    code_hash   text        not null,
    attempts    integer     not null default 0,
    expires_at  timestamptz not null,
    verified    boolean     not null default false,
    consumed_at timestamptz,
    created_at  timestamptz not null default now()
);

-- The lookup the sign-up makes: this number, proved, and not yet used.
create index pending_signup_verifications_mobile
    on pending_signup_verifications (mobile, verified, consumed_at);
