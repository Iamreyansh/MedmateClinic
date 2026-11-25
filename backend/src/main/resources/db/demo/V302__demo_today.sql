-- Today looks like a real day.
--
-- The history seed leaves the last day's bills unpaid, because a bill raised a
-- minute ago has not been paid yet. A clinic at four in the afternoon has
-- collected some money, still owes some, and has sent a handful of messages.
-- This script puts that in place.

-- The bills of today: most collected, one still owed by everybody, one refunded.
with todays as (
    select id,
           created_at,
           row_number() over (order by created_at) as rn
    from invoices
    where clinic_id = '${clinic_id}'
      and created_at::date = current_date
)
update invoices i
set status = case when t.rn = 1 then 'refunded' else 'paid' end,
    pay_mode = case
                   when t.rn = 1 then null
                   when t.rn % 3 = 0 then 'upi'
                   when t.rn % 3 = 1 then 'cash'
                   else 'card'
        end,
    paid_at = case when t.rn = 1 then null else t.created_at + interval '9 minutes' end
from todays t
where i.id = t.id;

-- The messages the clinic sent its patients today.
with people as (
    select id,
           row_number() over (order by full_name) as rn
    from patients
    where clinic_id = '${clinic_id}'
),
kinds (n, template, body, status, minutes) as (
    values
        (1, 'token.issued', 'Your token for today''s consultation is A-011. Please wait in the lounge; the nurse will call you.', 'sent', 46),
        (2, 'appointment.reminder', 'Reminder: your appointment with Dr. Ananya Rao is tomorrow at 10:30 AM. Reply CANCEL to cancel.', 'sent', 38),
        (3, 'prescription.signed', 'Your prescription is ready. MedMate Clinic will hand you a printed copy at reception.', 'sent', 31),
        (4, 'payment.received', 'We have received Rs.600 for your consultation at MedMate Clinic. Thank you.', 'sent', 27),
        (5, 'token.issued', 'Your token for today''s consultation is A-012. Please wait in the lounge; the nurse will call you.', 'sent', 24),
        (6, 'appointment.reminder', 'Reminder: your appointment with Dr. Vikram Shenoy is tomorrow at 11:15 AM. Reply CANCEL to cancel.', 'sent', 19),
        (7, 'prescription.signed', 'Your prescription is ready. MedMate Clinic will hand you a printed copy at reception.', 'sent', 15),
        (8, 'token.issued', 'Your token for today''s consultation is A-013. Please wait in the lounge; the nurse will call you.', 'sent', 12),
        (9, 'payment.received', 'We have received Rs.500 for your consultation at MedMate Clinic. Thank you.', 'sent', 9),
        (10, 'appointment.reminder', 'Reminder: your appointment with Dr. Meghana Iyer is on 28 Nov at 4:00 PM. Reply CANCEL to cancel.', 'failed', 6),
        (11, 'prescription.signed', 'Your prescription is ready. MedMate Clinic will hand you a printed copy at reception.', 'sent', 4),
        (12, 'token.issued', 'Your token for today''s consultation is A-014. Please wait in the lounge; the nurse will call you.', 'sent', 2)
)
insert into messages (id, clinic_id, patient_id, channel, template, body, status, sent_at, created_at)
select gen_random_uuid(),
       '${clinic_id}',
       p.id,
       'sms',
       k.template,
       k.body,
       k.status,
       case when k.status = 'failed' then null else now() - make_interval(mins => k.minutes) end,
       now() - make_interval(mins => k.minutes) end
from kinds k
         join people p on p.rn = (k.n % (select count(*) from people)) + 1;
