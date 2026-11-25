package com.medmate.clinic.reports;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The reports: what the clinic can count, and the money it collected.
 *
 * <p>Four views of the same clinic and the same range: what happened (the
 * summary), how the bookings went (bookings and waiting), what was prescribed
 * (clinical, for the doctor) and the list behind the numbers (the consult
 * list). Everything is read from the clinic's own tables, so a number on the
 * screen is a number the clinic earned.
 *
 * <p>The clinical view holds diagnoses and medicines, so it needs the
 * clinical capability: the administrator sees the money and the bookings and
 * never the notes.
 */
@Service
public class ReportsService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy");
    private static final DateTimeFormatter DAY_SHORT = DateTimeFormatter.ofPattern("d MMM");
    private static final DateTimeFormatter MONTH_DAY = DateTimeFormatter.ofPattern("d MMM");
    private static final int MAX_ROWS = 200;

    private final JdbcTemplate jdbc;

    public ReportsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** The tabs a person may open, in the order they read. */
    public List<String> tabsFor(ClinicPrincipal principal) {
        List<String> tabs = new ArrayList<>(List.of("summary", "bookings"));
        if (principal.can("clinical")) {
            tabs.add("clinical");
            tabs.add("consults");
        }
        return tabs;
    }

    /** The report the screen asked for. */
    @Transactional(readOnly = true)
    public Map<String, Object> report(
            ClinicPrincipal principal,
            String tab,
            String from,
            String to,
            String doctor,
            String search,
            Integer limit,
            Integer offset) {

        if (!principal.can("report")) {
            throw new ForbiddenException("You cannot open the reports.");
        }
        List<String> tabs = tabsFor(principal);
        String wanted = tab == null || tab.isBlank() ? "summary" : tab;
        if (!tabs.contains(wanted)) {
            throw new ForbiddenException("That view is not open to you.");
        }

        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zoneOf(clinicId);
        LocalDate today = LocalDate.now(zone);
        LocalDate start = parseDate(from, today.with(TemporalAdjusters.firstDayOfMonth()));
        LocalDate end = parseDate(to, today);
        if (end.isBefore(start)) {
            LocalDate swap = start;
            start = end;
            end = swap;
        }
        UUID doctorId = parseUuid(doctor);

        Range range = new Range(start, end, zone);
        Range previous = range.previous();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tab", wanted);
        body.put("tabs", tabs);
        body.put("range", range.describe(previous));
        body.put("doctors", doctors(clinicId));
        body.put("generatedAt", Instant.now().toString());

        switch (wanted) {
            case "summary" -> body.put("summary", summary(clinicId, range, previous, doctorId));
            case "bookings" -> body.put("bookings", bookings(clinicId, range, doctorId));
            case "clinical" -> body.put("clinical", clinical(clinicId, range, doctorId));
            case "consults" ->
                    body.put(
                            "consults",
                            consults(clinicId, range, doctorId, search, limit, offset));
            default -> throw new ForbiddenException("That view is not open to you.");
        }
        return body;
    }

    // ---------------------------------------------------------------- summary

    /** What happened, and what it earned. */
    private Map<String, Object> summary(
            UUID clinicId, Range range, Range previous, UUID doctorId) {

        Map<String, Object> body = new LinkedHashMap<>();

        long consultations = consultations(clinicId, range, doctorId);
        long consultationsBefore = consultations(clinicId, previous, doctorId);
        BigDecimal money = money(clinicId, range);
        BigDecimal moneyBefore = money(clinicId, previous);
        long newPatients = count(
                "select count(*) from patients where clinic_id = ? and created_at >= ? and created_at < ?",
                clinicId,
                range.fromInstant(),
                range.toInstant());
        long newPatientsBefore = count(
                "select count(*) from patients where clinic_id = ? and created_at >= ? and created_at < ?",
                clinicId,
                previous.fromInstant(),
                previous.toInstant());
        Double wait = averageWait(clinicId, range);
        Double waitBefore = averageWait(clinicId, previous);
        long noShows = count(
                "select count(*) from visits where clinic_id = ? and no_show and created_at >= ? and created_at < ?",
                clinicId,
                range.fromInstant(),
                range.toInstant());
        long noShowsBefore = count(
                "select count(*) from visits where clinic_id = ? and no_show and created_at >= ? and created_at < ?",
                clinicId,
                previous.fromInstant(),
                previous.toInstant());

        body.put("kpis", List.of(
                kpi("consultations", "Consultations", consultations, consultationsBefore, "signed in this period"),
                kpi("money", "Money collected", money.doubleValue(), moneyBefore.doubleValue(), "paid invoices"),
                kpi("newPatients", "New patients", newPatients, newPatientsBefore, "first time here"),
                kpi("averageWait", "Average wait", wait == null ? 0 : round(wait), waitBefore == null ? 0 : round(waitBefore), "minutes, before the doctor called them in", " min"),
                kpi("noShows", "No-shows", noShows, noShowsBefore, "booked and did not come")));

        body.put("moneyByDay", moneyByDay(clinicId, range));
        body.put("byDoctor", byDoctor(clinicId, range, doctorId));
        body.put("byPayMode", byPayMode(clinicId, range));
        body.put("topDiagnoses", topDiagnoses(clinicId, range, doctorId));
        body.put("topMedicines", topMedicines(clinicId, range, doctorId));
        return body;
    }

    /**
     * The money, day by day.
     *
     * <p>Every day in the range, not only the days that earned: a day the
     * clinic took nothing is a bar of zero, and the shape of the month is the
     * point of the chart.
     */
    private List<Map<String, Object>> moneyByDay(UUID clinicId, Range range) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select (paid_at at time zone cast(? as text))::date as day,"
                                + " coalesce(sum(total), 0) as amount"
                                + " from invoices"
                                + " where clinic_id = ? and status = 'paid' and paid_at >= ? and paid_at < ?"
                                + " group by 1 order by 1",
                        range.zone().getId(),
                        clinicId,
                        range.fromInstant(),
                        range.toInstant());
        Map<LocalDate, BigDecimal> earned = new java.util.HashMap<>();
        for (Map<String, Object> row : rows) {
            earned.put(
                    ((java.sql.Date) row.get("day")).toLocalDate(),
                    decimal(row.get("amount")));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (LocalDate day = range.from; !day.isAfter(range.to); day = day.plusDays(1)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", day.toString());
            item.put("label", day.format(MONTH_DAY));
            item.put("amount", earned.getOrDefault(day, BigDecimal.ZERO));
            out.add(item);
        }
        return out;
    }

    /** Every doctor: how many consultations, how much money, how long the wait. */
    private List<Map<String, Object>> byDoctor(UUID clinicId, Range range, UUID doctorId) {
        Map<UUID, Map<String, Object>> rows = new LinkedHashMap<>();
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select signed_by as doctor, count(*) as n"
                                + " from prescriptions"
                                + " where clinic_id = ? and status = 'signed' and signed_at >= ? and signed_at < ?"
                                + (doctorId == null ? "" : " and signed_by = ?")
                                + " group by 1",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = rowFor(rows, row.get("doctor"));
            item.put("consultations", number(row.get("n")).longValue());
        }
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select v.seen_by as doctor, coalesce(sum(i.total), 0) as amount"
                                + " from invoices i join visits v on v.id = i.visit_id"
                                + " where i.clinic_id = ? and i.status = 'paid'"
                                + " and i.paid_at >= ? and i.paid_at < ?"
                                + (doctorId == null ? "" : " and v.seen_by = ?")
                                + " group by 1",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = rowFor(rows, row.get("doctor"));
            item.put("amount", decimal(row.get("amount")));
        }
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select seen_by as doctor, avg(waited_minutes) as wait"
                                + " from visits"
                                + " where clinic_id = ? and waited_minutes is not null and not no_show"
                                + " and created_at >= ? and created_at < ?"
                                + (doctorId == null ? "" : " and seen_by = ?")
                                + " group by 1",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = rowFor(rows, row.get("doctor"));
            item.put("waitMinutes", row.get("wait") == null ? null : round(number(row.get("wait")).doubleValue()));
        }
        Map<String, String> names = staffNames(clinicId);
        List<Map<String, Object>> out = new ArrayList<>();
        rows.forEach(
                (id, item) -> {
                    item.put("doctorId", id == null ? null : id.toString());
                    item.put("name", id == null ? "Unassigned" : names.getOrDefault(id.toString(), "A doctor"));
                    out.add(item);
                });
        out.sort(
                (left, right) ->
                        Long.compare(
                                number(right.get("consultations")).longValue(),
                                number(left.get("consultations")).longValue()));
        return out;
    }

    /** How the money came in. */
    private List<Map<String, Object>> byPayMode(UUID clinicId, Range range) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select coalesce(pay_mode, 'other') as mode, count(*) as n,"
                                + " coalesce(sum(total), 0) as amount"
                                + " from invoices"
                                + " where clinic_id = ? and status = 'paid' and paid_at >= ? and paid_at < ?"
                                + " group by 1 order by 3 desc",
                        clinicId,
                        range.fromInstant(),
                        range.toInstant());
        BigDecimal total = BigDecimal.ZERO;
        for (Map<String, Object> row : rows) {
            total = total.add(decimal(row.get("amount")));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String mode = String.valueOf(row.get("mode"));
            BigDecimal amount = decimal(row.get("amount"));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("mode", mode);
            item.put("label", payModeLabel(mode));
            item.put("count", number(row.get("n")).longValue());
            item.put("amount", amount);
            item.put(
                    "share",
                    total.signum() == 0
                            ? 0
                            : amount.multiply(BigDecimal.valueOf(100))
                                    .divide(total, 1, RoundingMode.HALF_UP)
                                    .doubleValue());
            out.add(item);
        }
        return out;
    }

    // -------------------------------------------------------------- bookings

    /** The bookings, the waiting, and the follow-ups that did not happen. */
    private Map<String, Object> bookings(UUID clinicId, Range range, UUID doctorId) {
        Map<String, Object> body = new LinkedHashMap<>();

        long booked = appointments(clinicId, range, doctorId, "count(*)");
        long came = appointments(clinicId, range, doctorId, "count(*) filter (where status = 'completed')");
        long noShow = appointments(clinicId, range, doctorId, "count(*) filter (where status = 'no_show')");
        long online = appointments(clinicId, range, doctorId, "count(*) filter (where source = 'online')");
        Double wait = averageWait(clinicId, range);

        body.put(
                "kpis",
                List.of(
                        kpi("booked", "Booked", booked, 0, "appointments in this period"),
                        kpi("came", "Came", came, 0, shareOf(came, booked) + " of those booked"),
                        kpi("noShows", "No-shows", noShow, 0, shareOf(noShow, booked) + " of those booked"),
                        kpi(
                                "averageWait",
                                "Average wait",
                                wait == null ? 0 : round(wait),
                                0,
                                "minutes, before the doctor called them in",
                                " min"),
                        kpi("online", "Booked online", online, 0, shareOf(online, booked) + " of those booked")));

        List<Map<String, Object>> hours = new ArrayList<>();
        List<Object> hourParams = new ArrayList<>();
        hourParams.add(range.zone().getId());
        hourParams.addAll(java.util.Arrays.asList(args(clinicId, range, doctorId)));
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select extract(hour from starts_at at time zone cast(? as text))::int as hour,"
                                + " count(*) as n from appointments"
                                + " where clinic_id = ? and starts_at >= ? and starts_at < ?"
                                + (doctorId == null ? "" : " and doctor_id = ?")
                                + " group by 1 order by 1",
                        hourParams.toArray())) {
            Map<String, Object> item = new LinkedHashMap<>();
            int hour = number(row.get("hour")).intValue();
            item.put("hour", hour);
            item.put("label", hourLabel(hour));
            item.put("count", number(row.get("n")).longValue());
            hours.add(item);
        }
        body.put("busiestHours", hours);

        List<Map<String, Object>> waitByDoctor = new ArrayList<>();
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select s.id as id, s.full_name as name, avg(v.waited_minutes) as wait"
                                + " from visits v join staff s on s.id = v.seen_by"
                                + " where v.clinic_id = ? and v.waited_minutes is not null and not v.no_show"
                                + " and v.created_at >= ? and v.created_at < ?"
                                + (doctorId == null ? "" : " and v.seen_by = ?")
                                + " group by s.id, s.full_name order by wait asc",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row.get("name"));
            item.put("minutes", row.get("wait") == null ? null : round(number(row.get("wait")).doubleValue()));
            waitByDoctor.add(item);
        }
        body.put("waitByDoctor", waitByDoctor);
        body.put("followUps", followUps(clinicId, range));
        return body;
    }

    /** The follow-ups the doctors asked for, and who came back. */
    private Map<String, Object> followUps(UUID clinicId, Range range) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select c.patient_id as patient_id, pt.full_name as name, pt.phone as phone,"
                                + " c.follow_up_at as due,"
                                + " (select a.status from appointments a"
                                + "   where a.visit_id = c.visit_id and a.source = 'consult'"
                                + "   order by a.created_at desc limit 1) as appt_status,"
                                + " (select a.starts_at from appointments a"
                                + "   where a.visit_id = c.visit_id and a.source = 'consult'"
                                + "   order by a.created_at desc limit 1) as appt_at"
                                + " from consultations c join patients pt on pt.id = c.patient_id"
                                + " where c.clinic_id = ? and c.follow_up_at is not null"
                                + " and c.follow_up_at >= ? and c.follow_up_at < ?",
                        clinicId,
                        range.fromInstant(),
                        range.toInstant());

        long due = rows.size();
        long came = 0;
        long upcoming = 0;
        List<Map<String, Object>> missed = new ArrayList<>();
        Map<String, Boolean> missedByPatient = new LinkedHashMap<>();
        Instant now = Instant.now();
        for (Map<String, Object> row : rows) {
            String status = row.get("appt_status") == null ? "" : String.valueOf(row.get("appt_status"));
            if ("completed".equals(status)) {
                came++;
                continue;
            }
            if ("booked".equals(status) && row.get("appt_at") != null) {
                Instant starts = ((Timestamp) row.get("appt_at")).toInstant();
                if (starts.isAfter(now)) {
                    upcoming++;
                    continue;
                }
            }
            String patientId = String.valueOf(row.get("patient_id"));
            if (missedByPatient.containsKey(patientId)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("patientId", patientId);
            item.put("name", row.get("name"));
            item.put("phone", row.get("phone"));
            item.put("due", row.get("due") == null ? null : ((Timestamp) row.get("due")).toInstant().toString());
            missedByPatient.put(patientId, true);
            missed.add(item);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("due", due);
        body.put("came", came);
        body.put("cameShare", shareOf(came, due));
        body.put("upcoming", upcoming);
        body.put("missed", missed.size());
        body.put("missedPatients", missed);
        return body;
    }

    // --------------------------------------------------------------- clinical

    /** What was prescribed, and what the doctor was warned about. */
    private Map<String, Object> clinical(UUID clinicId, Range range, UUID doctorId) {
        Map<String, Object> body = new LinkedHashMap<>();

        long signed = prescriptions(clinicId, range, doctorId, "count(*)");
        long antibiotics = prescriptions(clinicId, range, doctorId, "count(*) filter (where antibiotic)");
        long alerts = prescriptions(clinicId, range, doctorId, "count(*) filter (where safety_alert)");
        long overridden = prescriptions(clinicId, range, doctorId, "count(*) filter (where safety_overridden)");
        long tests =
                count(
                        "select count(*) from lab_orders where clinic_id = ? and ordered_at >= ? and ordered_at < ?",
                        clinicId,
                        range.fromInstant(),
                        range.toInstant());

        body.put(
                "kpis",
                List.of(
                        kpi("signed", "Prescriptions signed", signed, 0, "in this period"),
                        kpi(
                                "antibioticRate",
                                "Antibiotic rate",
                                signed == 0 ? 0 : percentage(antibiotics, signed),
                                0,
                                "% of prescriptions carry one",
                                "%"),
                        kpi("alerts", "Safety alerts shown", alerts, 0, "the doctor was warned"),
                        kpi("overridden", "Overridden with a reason", overridden, 0, "the doctor went ahead anyway"),
                        kpi("tests", "Tests ordered", tests, 0, "to the lab desk")));

        body.put("topDiagnoses", topDiagnoses(clinicId, range, doctorId));
        body.put("topMedicines", topMedicines(clinicId, range, doctorId));

        List<Map<String, Object>> alertKinds = new ArrayList<>();
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select kind, count(*) as n from ("
                                + " select unnest(string_to_array(safety_alert_kind, ',')) as kind"
                                + " from prescriptions"
                                + " where clinic_id = ? and status = 'signed' and safety_alert"
                                + " and signed_at >= ? and signed_at < ?"
                                + (doctorId == null ? "" : " and signed_by = ?")
                                + ") kinds group by 1 order by 2 desc",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = new LinkedHashMap<>();
            String kind = String.valueOf(row.get("kind"));
            item.put("kind", kind);
            item.put("label", alertLabel(kind));
            item.put("count", number(row.get("n")).longValue());
            alertKinds.add(item);
        }
        body.put("alerts", alertKinds);

        List<Map<String, Object>> reasons = new ArrayList<>();
        for (Map<String, Object> row :
                jdbc.queryForList(
                        "select safety_override_reason as reason, count(*) as n"
                                + " from prescriptions"
                                + " where clinic_id = ? and status = 'signed' and safety_overridden"
                                + " and safety_override_reason is not null"
                                + " and signed_at >= ? and signed_at < ?"
                                + (doctorId == null ? "" : " and signed_by = ?")
                                + " group by 1 order by 2 desc limit 5",
                        args(clinicId, range, doctorId))) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("reason", row.get("reason"));
            item.put("count", number(row.get("n")).longValue());
            reasons.add(item);
        }
        body.put("overrideReasons", reasons);
        return body;
    }

    // --------------------------------------------------------------- consults

    /** The list behind the numbers. */
    private Map<String, Object> consults(
            UUID clinicId, Range range, UUID doctorId, String search, Integer limit, Integer offset) {

        int size = limit == null || limit <= 0 ? 20 : Math.min(limit, MAX_ROWS);
        int from = offset == null || offset < 0 ? 0 : offset;
        String like = search == null || search.isBlank() ? null : "%" + search.trim() + "%";

        StringBuilder where =
                new StringBuilder(
                        " where rx.clinic_id = ? and rx.status = 'signed'"
                                + " and rx.signed_at >= ? and rx.signed_at < ?");
        if (doctorId != null) {
            where.append(" and rx.signed_by = ?");
        }
        if (like != null) {
            where.append(
                    " and (v.token ilike ? or pt.full_name ilike ?"
                            + " or exists (select 1 from prescription_diagnoses d"
                            + "      where d.prescription_id = rx.id and d.label ilike ?)"
                            + " or exists (select 1 from prescription_medicines m"
                            + "      where m.prescription_id = rx.id and m.drug_name ilike ?))");
        }

        List<Object> params = new ArrayList<>();
        params.add(clinicId);
        params.add(range.fromInstant());
        params.add(range.toInstant());
        if (doctorId != null) {
            params.add(doctorId);
        }
        if (like != null) {
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }

        long total =
                number(
                                jdbc.queryForObject(
                                        "select count(*) from prescriptions rx"
                                                + " join visits v on v.id = rx.visit_id"
                                                + " join patients pt on pt.id = v.patient_id"
                                                + where,
                                        Long.class,
                                        params.toArray()))
                        .longValue();

        List<Object> rowParams = new ArrayList<>(params);
        rowParams.add(size);
        rowParams.add(from);
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select rx.signed_at as consulted_at, v.token as token, pt.full_name as patient,"
                                + " s.full_name as doctor, v.waited_minutes as waited,"
                                + " v.consult_minutes as consult,"
                                + " (select d.label from prescription_diagnoses d"
                                + "   where d.prescription_id = rx.id order by d.sort_order limit 1) as diagnosis,"
                                + " (select i.total from invoices i where i.prescription_id = rx.id"
                                + "   order by i.created_at desc limit 1) as bill_total,"
                                + " (select i.status from invoices i where i.prescription_id = rx.id"
                                + "   order by i.created_at desc limit 1) as bill_status"
                                + " from prescriptions rx"
                                + " join visits v on v.id = rx.visit_id"
                                + " join patients pt on pt.id = v.patient_id"
                                + " left join staff s on s.id = rx.signed_by"
                                + where
                                + " order by rx.signed_at desc limit ? offset ?",
                        rowParams.toArray());

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            Instant consulted = row.get("consulted_at") == null ? null : ((Timestamp) row.get("consulted_at")).toInstant();
            item.put("date", consulted == null ? null : consulted.atZone(range.zone()).toLocalDate().toString());
            item.put("token", row.get("token"));
            item.put("patient", row.get("patient"));
            item.put("doctor", row.get("doctor"));
            item.put("diagnosis", row.get("diagnosis"));
            item.put("waitedMinutes", row.get("waited") == null ? null : number(row.get("waited")).intValue());
            item.put("consultMinutes", row.get("consult") == null ? null : number(row.get("consult")).intValue());
            String billStatus = row.get("bill_status") == null ? "unpaid" : String.valueOf(row.get("bill_status"));
            BigDecimal total_ = decimal(row.get("bill_total"));
            item.put("billStatus", billStatus);
            item.put("billAmount", total_);
            item.put("billLabel", billLabel(billStatus, total_));
            items.add(item);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("total", total);
        body.put("from", from + 1);
        body.put("to", from + items.size());
        body.put("hasMore", from + items.size() < total);
        body.put("nextOffset", from + items.size());
        body.put("rows", items);
        return body;
    }

    // -------------------------------------------------------------- measures

    private long consultations(UUID clinicId, Range range, UUID doctorId) {
        return count(
                "select count(*) from prescriptions"
                        + " where clinic_id = ? and status = 'signed' and signed_at >= ? and signed_at < ?"
                        + (doctorId == null ? "" : " and signed_by = ?"),
                args(clinicId, range, doctorId));
    }

    private long prescriptions(UUID clinicId, Range range, UUID doctorId, String what) {
        return count(
                "select " + what + " from prescriptions"
                        + " where clinic_id = ? and status = 'signed' and signed_at >= ? and signed_at < ?"
                        + (doctorId == null ? "" : " and signed_by = ?"),
                args(clinicId, range, doctorId));
    }

    private BigDecimal money(UUID clinicId, Range range) {
        return decimal(
                jdbc.queryForObject(
                        "select coalesce(sum(total), 0) from invoices"
                                + " where clinic_id = ? and status = 'paid' and paid_at >= ? and paid_at < ?",
                        BigDecimal.class,
                        clinicId,
                        range.fromInstant(),
                        range.toInstant()));
    }

    private Double averageWait(UUID clinicId, Range range) {
        Double wait =
                jdbc.queryForObject(
                        "select avg(waited_minutes) from visits"
                                + " where clinic_id = ? and waited_minutes is not null and not no_show"
                                + " and created_at >= ? and created_at < ?",
                        Double.class,
                        clinicId,
                        range.fromInstant(),
                        range.toInstant());
        return wait;
    }

    private long appointments(UUID clinicId, Range range, UUID doctorId, String what) {
        return count(
                "select " + what + " from appointments"
                        + " where clinic_id = ? and starts_at >= ? and starts_at < ?"
                        + (doctorId == null ? "" : " and doctor_id = ?"),
                args(clinicId, range, doctorId));
    }

    private List<Map<String, Object>> topDiagnoses(UUID clinicId, Range range, UUID doctorId) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select d.icd_code as code, d.label as label, count(*) as n"
                                + " from prescription_diagnoses d join prescriptions rx on rx.id = d.prescription_id"
                                + " where rx.clinic_id = ? and rx.status = 'signed'"
                                + " and rx.signed_at >= ? and rx.signed_at < ?"
                                + (doctorId == null ? "" : " and rx.signed_by = ?")
                                + " group by d.icd_code, d.label order by n desc limit 5",
                        args(clinicId, range, doctorId));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("code", row.get("code"));
            item.put("label", row.get("label"));
            item.put("count", number(row.get("n")).longValue());
            out.add(item);
        }
        return out;
    }

    private List<Map<String, Object>> topMedicines(UUID clinicId, Range range, UUID doctorId) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select m.drug_name as name, m.generic_name as generic, count(*) as n"
                                + " from prescription_medicines m join prescriptions rx on rx.id = m.prescription_id"
                                + " where rx.clinic_id = ? and rx.status = 'signed'"
                                + " and rx.signed_at >= ? and rx.signed_at < ?"
                                + (doctorId == null ? "" : " and rx.signed_by = ?")
                                + " group by m.drug_name, m.generic_name order by n desc limit 5",
                        args(clinicId, range, doctorId));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row.get("name"));
            item.put("generic", row.get("generic"));
            item.put("count", number(row.get("n")).longValue());
            out.add(item);
        }
        return out;
    }

    // ---------------------------------------------------------------- people

    private List<Map<String, Object>> doctors(UUID clinicId) {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "select s.id as id, s.full_name as name, s.speciality as speciality"
                                + " from staff s join roles r on r.id = s.role_id"
                                + " where s.clinic_id = ? and s.active and r.name in ('owner', 'doctor')"
                                + " order by s.full_name",
                        clinicId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", String.valueOf(row.get("id")));
            item.put("name", row.get("name"));
            item.put("speciality", row.get("speciality"));
            out.add(item);
        }
        return out;
    }

    private Map<String, String> staffNames(UUID clinicId) {
        Map<String, String> names = new LinkedHashMap<>();
        for (Map<String, Object> row :
                jdbc.queryForList("select id, full_name from staff where clinic_id = ?", clinicId)) {
            names.put(String.valueOf(row.get("id")), String.valueOf(row.get("full_name")));
        }
        return names;
    }

    private ZoneId zoneOf(UUID clinicId) {
        List<String> zones =
                jdbc.query(
                        "select timezone from clinic_profile where clinic_id = ?",
                        (rs, row) -> rs.getString(1),
                        clinicId);
        if (zones.isEmpty() || zones.get(0) == null || zones.get(0).isBlank()) {
            return ZoneId.of("Asia/Kolkata");
        }
        try {
            return ZoneId.of(zones.get(0));
        } catch (RuntimeException notAKnownZone) {
            return ZoneId.of("Asia/Kolkata");
        }
    }

    // --------------------------------------------------------------- helpers

    /** A period of days, in the clinic's own time. */
    private record Range(LocalDate from, LocalDate to, ZoneId zone) {

        Timestamp fromInstant() {
            return Timestamp.from(from.atStartOfDay(zone).toInstant());
        }

        /** The day after the last day, so the range is a half open window. */
        Timestamp toInstant() {
            return Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant());
        }

        int days() {
            return (int) (to.toEpochDay() - from.toEpochDay() + 1);
        }

        /** The same length, immediately before. */
        Range previous() {
            LocalDate previousTo = from.minusDays(1);
            LocalDate previousFrom = previousTo.minusDays(days() - 1L);
            return new Range(previousFrom, previousTo, zone);
        }

        Map<String, Object> describe(Range previous) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("from", from.toString());
            body.put("to", to.toString());
            body.put("days", days());
            body.put("label", label());
            body.put("previousFrom", previous.from.toString());
            body.put("previousTo", previous.to.toString());
            body.put("previousLabel", previous.label());
            body.put("zone", zone.getId());
            return body;
        }

        String label() {
            if (from.getMonth() == to.getMonth() && from.getYear() == to.getYear()) {
                return from.getDayOfMonth() + " – " + to.format(DAY_SHORT);
            }
            return from.format(DAY_SHORT) + " – " + to.format(DAY_SHORT);
        }
    }

    private Map<String, Object> kpi(
            String key, String label, double value, double before, String hint) {
        return kpi(key, label, value, before, hint, "");
    }

    private Map<String, Object> kpi(
            String key, String label, double value, double before, String hint, String suffix) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("key", key);
        body.put("label", label);
        body.put("value", value);
        body.put("suffix", suffix);
        body.put("hint", hint);
        body.put("previous", before);
        body.put("delta", round(value - before));
        body.put("deltaShare", before == 0 ? null : percentage(value - before, before));
        return body;
    }

    private Map<String, Object> rowFor(Map<UUID, Map<String, Object>> rows, Object doctor) {
        UUID id = doctor == null ? null : (UUID) doctor;
        return rows.computeIfAbsent(
                id,
                key -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("consultations", 0L);
                    item.put("amount", BigDecimal.ZERO);
                    return item;
                });
    }

    private Object[] args(UUID clinicId, Range range, UUID doctorId) {
        List<Object> params =
                new ArrayList<>(
                        List.of(clinicId, range.fromInstant(), range.toInstant()));
        if (doctorId != null) {
            params.add(doctorId);
        }
        return params.toArray();
    }

    private long count(String sql, Object... params) {
        Long count = jdbc.queryForObject(sql, Long.class, params);
        return count == null ? 0 : count;
    }

    private static Number number(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number;
        }
        return new BigDecimal(String.valueOf(value));
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal money) {
            return money;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }

    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private static double percentage(double part, double whole) {
        if (whole == 0) {
            return 0;
        }
        return BigDecimal.valueOf(part)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(whole), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /** A share of a whole, as it reads in a sentence: "88%". */
    private static String shareOf(long part, long whole) {
        if (whole == 0) {
            return "0%";
        }
        return percentage(part, whole) + "%";
    }

    private static String payModeLabel(String mode) {
        return switch (mode.toLowerCase(java.util.Locale.ROOT)) {
            case "upi" -> "UPI";
            case "cash" -> "Cash";
            case "card" -> "Card";
            case "insurance" -> "Insurance";
            case "other" -> "Other";
            default -> mode;
        };
    }

    private static String billLabel(String status, BigDecimal amount) {
        String money = amount == null ? "0" : amount.stripTrailingZeros().toPlainString();
        return switch (status) {
            case "paid" -> "Paid " + money;
            case "refunded" -> "Refunded";
            default -> money + " due";
        };
    }

    private static String alertLabel(String kind) {
        return switch (kind) {
            case "duplicate_ingredient" -> "Duplicate ingredient";
            case "allergy_conflict" -> "Allergy conflict";
            case "dose_above_daily_max" -> "Dose above daily max";
            case "drug_interaction" -> "Drug interaction";
            case "antibiotic_for_viral_illness" -> "Antibiotic for likely viral illness";
            case "not_for_pregnancy_or_children" -> "Not for pregnancy or children";
            default -> kind;
        };
    }

    private static String hourLabel(int hour) {
        int start = hour % 12 == 0 ? 12 : hour % 12;
        int end = (hour + 1) % 12;
        if (end == 0) {
            end = 12;
        }
        return start + "–" + end + " " + (hour < 12 ? "am" : "pm");
    }

    private static LocalDate parseDate(String text, LocalDate fallback) {
        if (text == null || text.isBlank()) {
            return fallback;
        }
        try {
            return LocalDate.parse(text.trim());
        } catch (RuntimeException notADate) {
            return fallback;
        }
    }

    private static UUID parseUuid(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(text.trim());
        } catch (RuntimeException notAnId) {
            return null;
        }
    }
}
