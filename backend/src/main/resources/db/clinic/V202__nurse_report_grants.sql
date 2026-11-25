-- The nurse does not open the reports.
--
-- V200 gave the nurse the report grant, which shows the clinic's money and
-- its waiting times. The role model says the reports are for the owner, the
-- doctors and the administrator; a nurse records the vitals and routes the
-- patient. This takes the grant away.
delete from role_grants
where role_id in (
    select id from roles where name = 'nurse'
)
and grant_id in (
    select id from grants where resource = 'report'
);
