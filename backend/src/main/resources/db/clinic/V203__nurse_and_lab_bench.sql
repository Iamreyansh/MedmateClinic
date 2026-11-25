-- The breathing rate, and the doctor the patient was sent to.
--
-- The nurse's dialog records both: the breathing rate is one of the readings
-- read against its range, and the doctor is who the patient was routed to when
-- the vitals were taken.
alter table vitals
    add column if not exists breath_rate integer,
    add column if not exists sent_to uuid references staff (id);

-- Where the sample is on the bench.
--
-- The technician prints a number on the tube, sends the sample to a partner
-- lab, and marks the moment it was collected. The bench shows all three.
alter table lab_orders
    add column if not exists sample_no text,
    add column if not exists partner text,
    add column if not exists collected_at timestamptz;
