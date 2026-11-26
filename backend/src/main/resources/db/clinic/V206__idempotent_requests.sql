-- The requests that must not be done twice.
--
-- A patient may rebook, and a client may send the same request twice — a
-- retry on a slow network, a double tap. The first result must be the result,
-- and the second request must not move a slot a second time. So the service
-- keeps what the first request answered, keyed by the key the client sent and
-- by the clinic it belongs to: the same key with the same request returns the
-- first answer, and the same key with a different request is refused.
--
-- The table lives in the clinic's own schema, like everything else: one
-- clinic's keys are never visible to another.

create table idempotent_requests (
    id                 uuid primary key,
    clinic_id          uuid        not null,
    operation          text        not null,
    idempotency_key    text        not null,
    visit_id           uuid,
    request_fingerprint text       not null,
    response           text        not null,
    created_at         timestamptz not null default now()
);

-- The key is the client's, and it is scoped to the clinic and the operation:
-- the same key may be used once to cancel and once to rebook, and never twice
-- for the same one.
create unique index idempotent_requests_key
    on idempotent_requests (clinic_id, operation, idempotency_key);

create index idempotent_requests_visit
    on idempotent_requests (clinic_id, visit_id);

-- The slot a doctor holds.
--
-- Two patients cannot hold the same slot with the same doctor: the booking
-- that would take a slot another live booking holds is refused by the
-- database itself, and not only by the service that checks.
--
-- The index holds the live bookings only. A booking that has been called off
-- frees its slot, and a consultation that is over is history rather than a
-- slot that is held — so neither of them is in the index, and the index
-- changes no row that is already there.
create unique index appointments_slot
    on appointments (doctor_id, starts_at)
    where status = 'booked';

-- The role the clinic signed itself up with.
--
-- A clinic's owner is either a doctor who sees patients or a manager who runs
-- the clinic, and the RBAC role is the same for both: it says what the owner
-- may do, not what the owner is. The client needs to tell a "Dr." from a
-- manager, so the role the sign-up collected is kept beside it.
alter table staff
    add column if not exists profile_role text;
