-- Reports: what the clinic can count, and the money it collected.
--
-- The waits and the consult lengths, so a clinic can see how long people are
-- kept waiting. The consultation fee on staff, so an invoice carries a real
-- amount. The safety notes on a prescription, so the clinical report counts
-- what the doctor was shown. The flag on a patient, so the checker can warn
-- before prescribing.

alter table clinic_profile add column if not exists timezone text not null default 'Asia/Kolkata';

alter table visits add column if not exists waited_minutes integer;
alter table visits add column if not exists consult_minutes integer;
alter table visits add column if not exists consult_started_at timestamp with time zone;
alter table visits add column if not exists no_show boolean not null default false;

alter table staff add column if not exists consultation_fee numeric(10, 2) not null default 0;

alter table prescriptions add column if not exists antibiotic boolean not null default false;
alter table prescriptions add column if not exists safety_alert boolean not null default false;
alter table prescriptions add column if not exists safety_alert_kind text;
alter table prescriptions add column if not exists safety_overridden boolean not null default false;
alter table prescriptions add column if not exists safety_override_reason text;

alter table patients add column if not exists pregnant boolean not null default false;

-- The reports read these ranges over and over.
create index if not exists idx_visits_clinic_created on visits (clinic_id, created_at);
create index if not exists idx_visits_clinic_seen_by on visits (clinic_id, seen_by);
create index if not exists idx_invoices_clinic_paid on invoices (clinic_id, paid_at);
create index if not exists idx_invoices_clinic_visit on invoices (clinic_id, visit_id);
create index if not exists idx_appointments_clinic_starts on appointments (clinic_id, starts_at);
create index if not exists idx_prescriptions_clinic_signed on prescriptions (clinic_id, signed_at);
create index if not exists idx_patients_clinic_created on patients (clinic_id, created_at);

-- The clinical report holds diagnoses and medicines, so it is a separate
-- capability from the report itself: the money and the bookings are for the
-- administrator, the clinical notes are for the doctor.
insert into grants (id, clinic_id, resource, level)
select gen_random_uuid(), '${clinic_id}', 'clinical', 'view'
where not exists (
    select 1 from grants where clinic_id = '${clinic_id}' and resource = 'clinical'
);

insert into role_grants (role_id, grant_id)
select r.id, g.id
from roles r
join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '${clinic_id}'
  and r.name in ('owner', 'doctor')
  and g.resource = 'clinical'
on conflict do nothing;

-- The administrator opens the reports for the money and the bookings.
insert into role_grants (role_id, grant_id)
select r.id, g.id
from roles r
join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '${clinic_id}'
  and r.name = 'admin'
  and g.resource = 'report'
on conflict do nothing;
