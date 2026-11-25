-- The bench, the symptoms form, the patient's number, and the prescription's
-- verification token.
--
-- Nothing here rewrites an applied migration. V1..V15 and V200..V203 stay as
-- they are; this migration moves the service forward from them.

-- The prescription's verification token.
--
-- A patient checks that a prescription has not changed since the doctor signed
-- it. The link carries the token and the prescription carries the token, and
-- the two are compared in constant time. A document that was changed after it
-- was signed no longer carries the token that was handed out, so the old link
-- stops verifying.
alter table prescriptions
    add column if not exists verify_token text;

create index if not exists prescriptions_verify
    on prescriptions (clinic_id, verify_token)
    where verify_token is not null;

-- The lab bench's own vocabulary starts at 'to_collect'.
--
-- V12 defaulted a new order to 'ordered', but the bench only ever showed
-- 'to_collect', 'in_lab', 'sent_out' and 'reported' — so an order nobody had
-- touched was on nobody's screen, and the count of orders waiting to be
-- collected was short by exactly those orders.
update lab_orders
set status = 'to_collect'
where status = 'ordered';

alter table lab_orders
    alter column status set default 'to_collect';

-- The symptoms form.
--
-- The form collects symptoms, red flags and how long it has been going. They
-- are kept, so the doctor reads what the patient wrote, and the form knows it
-- has been filled in.
create table if not exists visit_intakes (
    id           uuid primary key,
    clinic_id    uuid        not null,
    visit_id     uuid        not null references visits (id),
    patient_id   uuid        not null references patients (id),
    symptoms     text[]      not null default '{}',
    red_flags    text[]      not null default '{}',
    notes        text,
    duration     text,
    submitted_at timestamptz not null default now()
);

create index if not exists visit_intakes_visit
    on visit_intakes (clinic_id, visit_id, submitted_at desc);

-- The patient's number, as the digits it is made of.
--
-- A booking joins the visit to the patient who already has that number. The
-- number is kept as it was typed and as the digits it is made of, so the join
-- is exact and is read from an index instead of from every patient in the
-- clinic.
alter table patients
    add column if not exists phone_digits text;

update patients
set phone_digits =
    case
        when length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) = 12
             and regexp_replace(coalesce(phone, ''), '\D', '', 'g') like '91%'
            then substr(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    end;

create index if not exists patients_phone
    on patients (clinic_id, phone_digits);

-- The tube number.
--
-- A tube number is printed on the tube and read back off it, so it is unique
-- inside the clinic. Two orders that were given the same number by mistake
-- lose the number rather than stop the clinic from booting.
update lab_orders a
set sample_no = null
where a.sample_no is not null
  and exists (
      select 1
      from lab_orders b
      where b.clinic_id = a.clinic_id
        and b.sample_no = a.sample_no
        and b.id <> a.id
  );

create unique index if not exists lab_orders_sample_no
    on lab_orders (clinic_id, sample_no)
    where sample_no is not null;

create index if not exists lab_orders_collected
    on lab_orders (clinic_id, collected_at);

-- The nurse's reading says which doctor the patient was sent to.
create index if not exists vitals_sent_to
    on vitals (clinic_id, sent_to);

-- The queue and the reports read the visits by day.
create index if not exists visits_clinic_created
    on visits (clinic_id, created_at);
