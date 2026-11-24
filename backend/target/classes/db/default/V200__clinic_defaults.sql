-- What every clinic starts with.
--
-- The five roles and the eighteen screens a clinic can open. A clinic added
-- today gets exactly what a clinic added a year ago got.
insert into clinic_profile (clinic_id, locations) values ('{clinic_id}', 1);

insert into roles (id, clinic_id, name, owner) values
    (gen_random_uuid(), '{clinic_id}', 'owner', true),
    (gen_random_uuid(), '{clinic_id}', 'doctor', false),
    (gen_random_uuid(), '{clinic_id}', 'nurse', false),
    (gen_random_uuid(), '{clinic_id}', 'front_desk', false),
    (gen_random_uuid(), '{clinic_id}', 'admin', false);

insert into grants (id, clinic_id, resource, level) values
    (gen_random_uuid(), '{clinic_id}', 'console', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'inbox', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'template', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'nurse', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'lab', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'tele', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'kiosk', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'desk', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'appointment', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'report', 'view'),
    (gen_random_uuid(), '{clinic_id}', 'patient', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'billing', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'doctor', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'staff', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'message', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'location', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'subscription', 'use'),
    (gen_random_uuid(), '{clinic_id}', 'settings', 'use');

-- the owner: everything. a doctor: the console, the inbox, their own patients
insert into role_grants (role_id, grant_id)
select r.id, g.id from roles r join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '{clinic_id}' and r.owner;

insert into role_grants (role_id, grant_id)
select r.id, g.id from roles r join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '{clinic_id}' and r.name = 'doctor'
  and g.resource in ('console', 'inbox', 'template', 'patient', 'doctor', 'report');

-- a nurse: vitals, and the patients in front of them
insert into role_grants (role_id, grant_id)
select r.id, g.id from roles r join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '{clinic_id}' and r.name = 'nurse'
  and g.resource in ('nurse', 'patient', 'report');

-- the front desk: check-in, hand-over, money, bookings
insert into role_grants (role_id, grant_id)
select r.id, g.id from roles r join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '{clinic_id}' and r.name = 'front_desk'
  and g.resource in ('kiosk', 'desk', 'appointment', 'patient', 'billing', 'message');

-- an administrator: everything but the clinical notes
insert into role_grants (role_id, grant_id)
select r.id, g.id from roles r join grants g on g.clinic_id = r.clinic_id
where r.clinic_id = '{clinic_id}' and r.name = 'admin'
  and g.resource in ('kiosk', 'desk', 'appointment', 'patient', 'billing', 'doctor',
                     'staff', 'message', 'location', 'subscription', 'settings');
