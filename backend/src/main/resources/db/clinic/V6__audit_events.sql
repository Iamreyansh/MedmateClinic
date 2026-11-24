-- What happened, and who did it.
--
-- Every sign-in, record opened, prescription signed and payment taken lands
-- here. The rows are written by the service and never edited: there is no
-- update or delete path, and the person who writes them cannot change them
-- afterwards.
create table audit_events (
    id             uuid primary key,
    clinic_id      uuid        not null,
    actor_staff_id uuid,
    actor_role     text,
    action         text        not null,
    resource_type  text,
    resource_id    text,
    detail         jsonb       not null default '{}'::jsonb,
    ip_address     text,
    user_agent     text,
    created_at     timestamptz not null default now()
);

create index audit_events_created on audit_events (clinic_id, created_at desc);
create index audit_events_actor on audit_events (clinic_id, actor_staff_id);
create index audit_events_action on audit_events (clinic_id, action);
