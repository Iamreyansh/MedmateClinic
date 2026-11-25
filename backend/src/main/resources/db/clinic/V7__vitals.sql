-- What the nurse recorded, and when.
--
-- Readings over time come from here: one row per reading, so a patient's
-- HbA1c or blood pressure can be plotted across the visits.
create table vitals (
    id             uuid primary key,
    clinic_id      uuid        not null,
    patient_id     uuid        not null references patients (id),
    visit_id       uuid        references visits (id),
    recorded_by    uuid        references staff (id),
    recorded_at    timestamptz not null default now(),
    temp_f         numeric(4,1),
    bp_systolic    integer,
    bp_diastolic   integer,
    pulse          integer,
    spo2           integer,
    weight_kg      numeric(5,2),
    height_cm      numeric(5,1),
    sugar_mg       integer,
    note           text,
    priority       text
);

create index vitals_patient on vitals (clinic_id, patient_id, recorded_at desc);
