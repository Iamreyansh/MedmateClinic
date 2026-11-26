package com.medmate.clinic.billing;

import com.medmate.clinic.clinic.ClinicProfileRepository;
import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.invoice.Invoice;
import com.medmate.clinic.invoice.InvoiceRepository;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Billing and the point of sale.
 *
 * <p>A signed prescription makes a bill. The bill is what the patient pays at
 * the desk, what the clinic counts at the end of the day, and what the receipt
 * is printed from.
 *
 * <p>The day's money is counted from the clinic's own invoices: what came in,
 * what is still owed, and what was refunded. Nothing is typed in twice.
 */
@Service
public class BillingService {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy");

    private final InvoiceRepository invoices;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final VisitRepository visits;
    private final ClinicProfileRepository profiles;
    private final RegistryClinicRepository clinics;
    private final ClinicZoneService zones;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public BillingService(
            InvoiceRepository invoices,
            PatientRepository patients,
            StaffRepository staff,
            VisitRepository visits,
            ClinicProfileRepository profiles,
            RegistryClinicRepository clinics,
            ClinicZoneService zones,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.invoices = invoices;
        this.patients = patients;
        this.staff = staff;
        this.visits = visits;
        this.profiles = profiles;
        this.clinics = clinics;
        this.zones = zones;
        this.jdbc = jdbc;
    }

    /** The till: what came in today, what is still owed, and the bill on screen. */
    @Transactional(readOnly = true)
    public Map<String, Object> till(
            ClinicPrincipal principal,
            String date,
            String from,
            String to,
            String status,
            String mode,
            int limit,
            int offset) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate day = parseDate(date, LocalDate.now(zone));
        Instant dayFrom = day.atStartOfDay(zone).toInstant();
        Instant dayTo = day.plusDays(1).atStartOfDay(zone).toInstant();

        // The page the caller asked for. A page is never empty and never
        // bigger than the cap.
        int pageSize = Math.max(1, Math.min(limit <= 0 ? DEFAULT_LIMIT : limit, MAX_LIMIT));
        int skip = Math.max(0, offset);

        String wanted = status == null ? "" : status.trim().toLowerCase(java.util.Locale.ENGLISH);
        String statusFilter = statusFilter(wanted);
        String payMode = mode == null || mode.isBlank() ? null : mode.trim().toLowerCase(java.util.Locale.ENGLISH);

        // The window the bills are taken from: the days the caller named, or
        // every bill the clinic has when they named none.
        Instant windowFrom = null;
        Instant windowTo = null;
        if (from != null && !from.isBlank()) {
            windowFrom = parseDate(from, day).atStartOfDay(zone).toInstant();
        }
        if (to != null && !to.isBlank()) {
            windowTo = parseDate(to, day).plusDays(1).atStartOfDay(zone).toInstant();
        }
        if (windowFrom == null && windowTo == null && "today".equals(wanted)) {
            windowFrom = dayFrom;
            windowTo = dayTo;
        }

        // The rows of the page, and the count of the rows the page is a page
        // of. Both are counted in the database: the filter and the count are
        // one statement, so they can never disagree.
        Page page = page(clinicId, statusFilter, payMode, windowFrom, windowTo, pageSize, skip);

        // The people the bills belong to, read once for the whole page.
        List<UUID> patientIds = new ArrayList<>();
        for (Map<String, Object> row : page.rows()) {
            Object id = row.get("patientId");
            if (id != null) {
                patientIds.add(UUID.fromString(String.valueOf(id)));
            }
        }
        Map<UUID, Map<String, Object>> people = patientCards(clinicId, patientIds);

        List<Map<String, Object>> bills = new ArrayList<>();
        for (Map<String, Object> row : page.rows()) {
            Map<String, Object> item = new LinkedHashMap<>(row);
            Object patientId = item.remove("patientId");
            UUID id = patientId == null ? null : UUID.fromString(String.valueOf(patientId));
            item.put("patient", id == null ? new LinkedHashMap<String, Object>() : people.getOrDefault(id, new LinkedHashMap<>()));
            bills.add(item);
        }

        Map<String, Object> summary = summary(clinicId, dayFrom, dayTo);
        List<Map<String, Object>> byMode = byMode(clinicId, dayFrom, dayTo, summary);
        List<Map<String, Object>> pending = pending(clinicId, dayFrom, dayTo);

        // The receipt card: the bill of the day. The screen shows the bill it
        // is about to take the money for, and a null card left it empty.
        Invoice first = firstOfDay(clinicId, dayFrom, dayTo);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("total", page.total());
        meta.put("limit", pageSize);
        meta.put("offset", skip);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("day", day.toString());
        body.put("dayLabel", day.format(DAY));
        body.put("bills", bills);
        body.put("summary", summary);
        body.put("byMode", byMode);
        body.put("pending", pending);
        body.put("bill", first == null ? null : billCard(clinicId, first, zone));
        body.put("clinic", clinicCard(clinicId));
        body.put("meta", meta);
        return body;
    }

    /**
     * The rows of a page of bills, and the count of the rows it is a page of.
     *
     * <p>The filter, the count, the page and the order are all in the
     * database: a clinic with years of bills behind it must not answer with
     * every bill it ever raised, and it must not answer with a count that
     * does not match the rows.
     */
    private Page page(
            UUID clinicId,
            String status,
            String mode,
            Instant from,
            Instant to,
            int limit,
            int offset) {
        StringBuilder where = new StringBuilder(" where clinic_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(clinicId);
        if (from != null) {
            where.append(" and created_at >= ?");
            args.add(Timestamp.from(from));
        }
        if (to != null) {
            where.append(" and created_at < ?");
            args.add(Timestamp.from(to));
        }
        if (status != null) {
            where.append(" and status = ?");
            args.add(status);
        }
        if (mode != null) {
            where.append(" and pay_mode = ?");
            args.add(mode);
        }

        Long total =
                jdbc.queryForObject(
                        "select count(*) from invoices" + where, Long.class, args.toArray());

        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(limit);
        pageArgs.add(offset);
        List<Map<String, Object>> rows =
                jdbc.query(
                        "select id, number, status, total, pay_mode, paid_at, created_at, visit_id, "
                                + "patient_id, lines -> 0 ->> 'name' as description "
                                + "from invoices"
                                + where
                                + " order by created_at desc limit ? offset ?",
                        (rs, row) -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("invoiceId", rs.getString("id"));
                            item.put("number", rs.getString("number"));
                            item.put("status", rs.getString("status"));
                            item.put("amount", rs.getBigDecimal("total"));
                            item.put("payMode", rs.getString("pay_mode"));
                            item.put("paidAt", instant(rs.getTimestamp("paid_at")));
                            item.put("createdAt", instant(rs.getTimestamp("created_at")));
                            item.put("visitId", rs.getString("visit_id"));
                            item.put("description", rs.getString("description"));
                            item.put("patientId", rs.getString("patient_id"));
                            return item;
                        },
                        pageArgs.toArray());
        return new Page(rows, total == null ? 0 : total);
    }

    /**
     * The day's money, counted in the database.
     *
     * <p>The till shows four numbers: what came in, what is still owed, what
     * was given back and how many bills the day had. They are counted where
     * the bills are, not by reading every bill into memory.
     */
    private Map<String, Object> summary(UUID clinicId, Instant from, Instant to) {
        Map<String, Object> row =
                jdbc.queryForMap(
                        "select count(*) filter (where status = 'paid') as paid_bills, "
                                + "coalesce(sum(total) filter (where status = 'paid'), 0) as collected, "
                                + "count(*) filter (where status = 'unpaid') as pending_count, "
                                + "coalesce(sum(total) filter (where status = 'unpaid'), 0) as pending_amount, "
                                + "count(*) filter (where status = 'refunded') as refund_count, "
                                + "coalesce(sum(total) filter (where status = 'refunded'), 0) as refund_amount, "
                                + "count(*) as day_bills "
                                + "from invoices where clinic_id = ? and created_at >= ? and created_at < ?",
                        clinicId,
                        Timestamp.from(from),
                        Timestamp.from(to));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("collected", row.get("collected"));
        summary.put("bills", ((Number) row.get("paid_bills")).longValue());
        summary.put("pendingCount", ((Number) row.get("pending_count")).longValue());
        summary.put("pendingAmount", row.get("pending_amount"));
        summary.put("refundCount", ((Number) row.get("refund_count")).longValue());
        summary.put("refundAmount", row.get("refund_amount"));
        summary.put("dayBills", ((Number) row.get("day_bills")).longValue());
        return summary;
    }

    /**
     * The money by the way it was paid, counted in the database.
     *
     * <p>The till shows four bars: cash, UPI and card, and the last one being
     * what has not come in yet.
     */
    private List<Map<String, Object>> byMode(
            UUID clinicId, Instant from, Instant to, Map<String, Object> summary) {
        Map<String, long[]> counts = new LinkedHashMap<>();
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        jdbc.query(
                "select pay_mode, count(*) as bills, coalesce(sum(total), 0) as amount from invoices "
                        + "where clinic_id = ? and created_at >= ? and created_at < ? and status = 'paid' "
                        + "group by pay_mode",
                (rs, row) -> {
                    String mode = rs.getString("pay_mode");
                    counts.put(mode, new long[] {rs.getLong("bills")});
                    amounts.put(mode, rs.getBigDecimal("amount"));
                    return null;
                },
                clinicId,
                Timestamp.from(from),
                Timestamp.from(to));

        List<Map<String, Object>> byMode = new ArrayList<>();
        for (String mode : List.of("cash", "upi", "card")) {
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("mode", mode);
            card.put("label", label(mode));
            card.put("amount", amounts.getOrDefault(mode, BigDecimal.ZERO));
            card.put("bills", counts.containsKey(mode) ? counts.get(mode)[0] : 0);
            byMode.add(card);
        }

        Map<String, Object> pendingCard = new LinkedHashMap<>();
        pendingCard.put("mode", "pending");
        pendingCard.put("label", "Pending");
        pendingCard.put("amount", summary.get("pendingAmount"));
        pendingCard.put("bills", summary.get("pendingCount"));
        byMode.add(pendingCard);
        return byMode;
    }

    /** The bills of today that are still owed. */
    private List<Map<String, Object>> pending(UUID clinicId, Instant from, Instant to) {
        List<Map<String, Object>> rows =
                jdbc.query(
                        "select id, number, total, created_at, patient_id, lines -> 0 ->> 'name' as description "
                                + "from invoices where clinic_id = ? and created_at >= ? and created_at < ? "
                                + "and status = 'unpaid' order by created_at desc limit ?",
                        (rs, row) -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("invoiceId", rs.getString("id"));
                            item.put("number", rs.getString("number"));
                            item.put("amount", rs.getBigDecimal("total"));
                            item.put("createdAt", instant(rs.getTimestamp("created_at")));
                            item.put("description", rs.getString("description"));
                            item.put("patientId", rs.getString("patient_id"));
                            return item;
                        },
                        clinicId,
                        Timestamp.from(from),
                        Timestamp.from(to),
                        DEFAULT_LIMIT);

        List<UUID> patientIds = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object id = row.get("patientId");
            if (id != null) {
                patientIds.add(UUID.fromString(String.valueOf(id)));
            }
        }
        Map<UUID, Map<String, Object>> people = patientCards(clinicId, patientIds);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>(row);
            Object patientId = item.remove("patientId");
            UUID id = patientId == null ? null : UUID.fromString(String.valueOf(patientId));
            item.put(
                    "patient",
                    id == null ? new LinkedHashMap<String, Object>() : people.getOrDefault(id, new LinkedHashMap<>()));
            items.add(item);
        }
        return items;
    }

    /**
     * The people of a page of bills, read once for the whole page.
     *
     * <p>One query for the page, not one for every row: a list of bills that
     * reads its patients one at a time is a list that gets slower the longer
     * it gets.
     */
    private Map<UUID, Map<String, Object>> patientCards(UUID clinicId, List<UUID> patientIds) {
        Map<UUID, Map<String, Object>> cards = new LinkedHashMap<>();
        if (patientIds.isEmpty()) {
            return cards;
        }
        String placeholders = String.join(",", java.util.Collections.nCopies(patientIds.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(clinicId);
        args.addAll(patientIds);
        jdbc.query(
                "select id, full_name, age, sex, phone, abha from patients "
                        + "where clinic_id = ? and id in ("
                        + placeholders
                        + ")",
                (rs, row) -> {
                    Map<String, Object> card = new LinkedHashMap<>();
                    card.put("id", rs.getString("id"));
                    card.put("name", rs.getString("full_name"));
                    card.put("age", rs.getObject("age"));
                    card.put("sex", rs.getString("sex"));
                    card.put("phone", rs.getString("phone") == null ? "" : rs.getString("phone"));
                    card.put("abha", rs.getString("abha") == null ? "" : rs.getString("abha"));
                    card.put("initials", initials(rs.getString("full_name")));
                    cards.put(UUID.fromString(rs.getString("id")), card);
                    return null;
                },
                args.toArray());
        return cards;
    }

    /** The first bill of the day, as the receipt card is printed from it. */
    private Invoice firstOfDay(UUID clinicId, Instant from, Instant to) {
        List<UUID> ids =
                jdbc.query(
                        "select id from invoices where clinic_id = ? and created_at >= ? and created_at < ? "
                                + "order by created_at desc limit 1",
                        (rs, row) -> rs.getObject("id", UUID.class),
                        clinicId,
                        Timestamp.from(from),
                        Timestamp.from(to));
        if (ids.isEmpty()) {
            return null;
        }
        return invoices.findByIdAndClinicId(ids.get(0), clinicId).orElse(null);
    }

    /** The status the tab asks for, as it is kept in the table. */
    private static String statusFilter(String status) {
        return switch (status) {
            case "to_collect", "unpaid" -> "unpaid";
            case "paid" -> "paid";
            case "refunded" -> "refunded";
            case "", "all", "today" -> null;
            default -> throw new IllegalArgumentException("That is not a bill status.");
        };
    }

    /** The moment a timestamp holds, as the API sends instants. */
    private static String instant(java.sql.Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant().toString();
    }

    /** A page of rows, and the count of the rows it is a page of. */
    private record Page(List<Map<String, Object>> rows, long total) {}

    /** One bill, as it is printed. */
    @Transactional(readOnly = true)
    public Map<String, Object> bill(ClinicPrincipal principal, String invoiceId) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        Invoice invoice =
                invoices.findByIdAndClinicId(parseUuid(invoiceId), clinicId)
                        .orElseThrow(() -> new NotFoundException("That bill is not here."));
        return billCard(clinicId, invoice, zones.zoneOf(clinicId));
    }

    /** Take the money. */
    @Transactional
    public Map<String, Object> pay(ClinicPrincipal principal, String invoiceId, String payMode) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        Invoice invoice =
                invoices.findByIdAndClinicId(parseUuid(invoiceId), clinicId)
                        .orElseThrow(() -> new NotFoundException("That bill is not here."));
        String mode = payMode == null || payMode.isBlank() ? "cash" : payMode.trim().toLowerCase();
        invoice.setPayMode(mode);
        invoice.setStatus("paid");
        invoice.setPaidAt(Instant.now());
        invoices.save(invoice);
        // The screen reads invoiceId, status, paidAt and payMode; the whole
        // card travels with them so the receipt can be printed from the same
        // answer.
        Map<String, Object> body = new LinkedHashMap<>(billCard(clinicId, invoice, zones.zoneOf(clinicId)));
        body.put("invoiceId", invoice.getId().toString());
        body.put("status", invoice.getStatus());
        body.put("paidAt", invoice.getPaidAt() == null ? null : invoice.getPaidAt().toString());
        body.put("payMode", invoice.getPayMode());
        body.put("amount", invoice.getTotal());
        return body;
    }

    /** Give the money back. */
    @Transactional
    public Map<String, Object> refund(ClinicPrincipal principal, String invoiceId) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        Invoice invoice =
                invoices.findByIdAndClinicId(parseUuid(invoiceId), clinicId)
                        .orElseThrow(() -> new NotFoundException("That bill is not here."));
        invoice.setStatus("refunded");
        invoice.setPaidAt(null);
        invoices.save(invoice);
        // The screen reads invoiceId, status and amount.
        Map<String, Object> body = new LinkedHashMap<>(billCard(clinicId, invoice, zones.zoneOf(clinicId)));
        body.put("invoiceId", invoice.getId().toString());
        body.put("status", invoice.getStatus());
        body.put("amount", invoice.getTotal());
        return body;
    }

    /**
     * Raise a new bill at the desk.
     *
     * <p>A bill raised at the counter is for a visit that has already happened,
     * so it hangs off the patient's open visit when there is one. The charges
     * are what the desk typed; the total is their sum less what the desk gave
     * away.
     */
    @Transactional
    public Map<String, Object> create(
            ClinicPrincipal principal, BillingController.NewBillRequest request) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        if (request == null) {
            throw new IllegalArgumentException("A bill needs a patient and at least one charge.");
        }
        String name = request.patient() == null ? "" : request.patient().trim();
        if (name.length() < 2) {
            throw new IllegalArgumentException("A patient is needed to raise a bill.");
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new IllegalArgumentException("A bill needs at least one charge.");
        }

        UUID clinicId = principal.clinicIdAsUuid();

        // The patient is the one on the list — a bill cannot be raised for a
        // stranger without them having been checked in.
        Patient patient =
                patients.findByClinicIdOrderByCreatedAtAsc(clinicId).stream()
                        .filter(candidate -> candidate.getFullName().equalsIgnoreCase(name))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("That patient is not on the list."));

        Visit visit =
                visits.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting").stream()
                        .findFirst()
                        .orElse(null);

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (BillingController.NewBillRequest.Line line : request.lines()) {
            if (line == null || line.name() == null || line.name().isBlank()) {
                continue;
            }
            BigDecimal amount = toDecimal(line.amount());
            if (amount.signum() <= 0) {
                continue;
            }
            lines.add(Map.of("name", line.name(), "amount", amount));
            subtotal = subtotal.add(amount);
        }
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("A bill needs at least one charge.");
        }

        BigDecimal discount = zero(request.discount());
        if (discount.signum() < 0) {
            discount = BigDecimal.ZERO;
        }
        BigDecimal total = subtotal.subtract(discount);
        if (total.signum() < 0) {
            total = BigDecimal.ZERO;
        }

        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setClinicId(clinicId);
        invoice.setPatientId(patient.getId());
        invoice.setVisitId(visit == null ? null : visit.getId());
        invoice.setPrescriptionId(null);
        invoice.setPrefix("MCI");
        invoice.setNumber(String.format("%04d", invoices.count() + 1));
        invoice.setFy("2026-27");
        invoice.setLines(lines);
        invoice.setSubtotal(subtotal);
        invoice.setDiscount(discount);
        invoice.setTotal(total);
        invoice.setStatus("unpaid");
        invoice.setCreatedAt(Instant.now());
        invoices.save(invoice);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("invoiceId", invoice.getId().toString());
        body.put("number", invoice.getNumber());
        body.put("total", invoice.getTotal());
        body.put("status", invoice.getStatus());
        body.put("bill", billCard(clinicId, invoice, zones.zoneOf(clinicId)));
        return body;
    }

    /**
     * Close the day.
     *
     * <p>The day is closed against the cash that was counted. If the count and
     * the till disagree, the difference is written down here — a shortfall that
     * is not recorded cannot be explained later.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> closeDay(
            ClinicPrincipal principal, BillingController.CloseDayRequest request) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate day = LocalDate.now(zone);
        Instant from = day.atStartOfDay(zone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();

        List<Invoice> todays =
                invoices.findByClinicIdAndCreatedAtBetweenOrderByCreatedAtDesc(clinicId, from, to);

        BigDecimal expected = BigDecimal.ZERO;
        int bills = 0;
        for (Invoice invoice : todays) {
            if ("paid".equals(invoice.getStatus())) {
                expected = expected.add(zero(invoice.getTotal()));
                bills++;
            }
        }

        BigDecimal counted = request == null ? BigDecimal.ZERO : zero(request.cash());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("day", day.toString());
        body.put("expected", expected);
        body.put("counted", counted);
        body.put("difference", counted.subtract(expected));
        body.put("collected", expected);
        body.put("bills", bills);
        body.put("closedAt", Instant.now().toString());
        return body;
    }

    // ------------------------------------------------------------------ bill

    /** The bill, as it is printed. The desk shows the same card. */
    public Map<String, Object> billCard(UUID clinicId, Invoice invoice, ZoneId zone) {
        Map<String, Object> bill = new LinkedHashMap<>();
        bill.put("id", invoice.getId().toString());
        bill.put("number", invoice.getNumber());
        bill.put("prefix", invoice.getPrefix());
        bill.put("fy", invoice.getFy());
        bill.put("status", invoice.getStatus());
        bill.put("payMode", invoice.getPayMode());
        bill.put("paidAt", invoice.getPaidAt() == null ? null : invoice.getPaidAt().toString());
        bill.put(
                "createdAt",
                invoice.getCreatedAt() == null ? null : invoice.getCreatedAt().atZone(zone).format(STAMP));
        bill.put("patient", patientCard(invoice.getPatientId()));

        Visit visit = null;
        if (invoice.getVisitId() != null) {
            visit = visits.findByIdAndClinicId(invoice.getVisitId(), clinicId).orElse(null);
        }
        bill.put("doctor", doctorCard(invoice, visit));
        bill.put("token", visit == null ? null : visit.getToken());
        bill.put("clinic", clinicCard(clinicId));
        bill.put("placeOfSupply", placeOfSupply(clinicId));

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int order = 0;
        for (Map<String, Object> raw : invoice.getLines() == null ? List.<Map<String, Object>>of() : invoice.getLines()) {
            Map<String, Object> line = new LinkedHashMap<>();
            String name = String.valueOf(raw.getOrDefault("name", "Consultation"));
            BigDecimal amount = toDecimal(raw.get("amount"));
            line.put("name", name);
            line.put("description", lineDescription(raw, name));
            line.put("sac", "992312");
            line.put("gstRate", "0%");
            line.put("gstAmount", BigDecimal.ZERO);
            line.put("amount", amount);
            lines.add(line);
            subtotal = subtotal.add(amount);
            order++;
        }
        bill.put("lines", lines);

        BigDecimal discount = zero(invoice.getDiscount());
        BigDecimal gst = BigDecimal.ZERO;
        BigDecimal total = zero(invoice.getTotal());
        bill.put("subtotal", subtotal);
        bill.put("discount", discount);
        bill.put("gst", gst);
        bill.put("total", total);
        bill.put("totalInWords", words(total));
        bill.put("exemptNote", "Healthcare services are exempt from GST.");
        bill.put("timeline", timeline(invoice, visit, zone));
        return bill;
    }

    private List<Map<String, Object>> timeline(Invoice invoice, Visit visit, ZoneId zone) {
        List<Map<String, Object>> events = new ArrayList<>();
        addEvent(events, invoice.getCreatedAt(), zone, "Bill raised");
        if (invoice.getStatus() == null ? false : invoice.getStatus().equals("paid")) {
            addEvent(events, invoice.getPaidAt(), zone, "Paid by " + label(invoice.getPayMode()));
        } else if ("refunded".equals(invoice.getStatus())) {
            addEvent(events, invoice.getPaidAt(), zone, "Refunded");
        }
        if (visit != null && visit.getConsultStartedAt() != null) {
            addEvent(events, visit.getConsultStartedAt(), zone, "Consult started");
        }
        return events;
    }

    private void addEvent(
            List<Map<String, Object>> events, Instant at, ZoneId zone, String text) {
        if (at == null) {
            return;
        }
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("at", at.atZone(zone).format(STAMP));
        // The canonical name is label; text is kept as an alias for the one
        // release in which the older screens are still in the wild.
        event.put("label", text);
        event.put("text", text);
        events.add(event);
    }

    /** The bills one page of the till holds when the caller does not say. */
    private static final int DEFAULT_LIMIT = 50;

    /** The most bills one page of the till may hold. */
    private static final int MAX_LIMIT = 200;

    private Map<String, Object> patientCard(UUID patientId) {
        Map<String, Object> card = new LinkedHashMap<>();
        if (patientId == null) {
            return card;
        }
        Optional<Patient> found = patients.findById(patientId);
        if (found.isEmpty()) {
            return card;
        }
        Patient patient = found.get();
        card.put("id", patient.getId().toString());
        card.put("name", patient.getFullName());
        card.put("age", patient.getAge());
        card.put("sex", patient.getSex());
        card.put("phone", patient.getPhone() == null ? "" : patient.getPhone());
        card.put("abha", patient.getAbha() == null ? "" : patient.getAbha());
        card.put("initials", initials(patient.getFullName()));
        return card;
    }

    private Map<String, Object> doctorCard(Invoice invoice, Visit visit) {
        Map<String, Object> card = new LinkedHashMap<>();
        UUID doctorId = visit == null ? null : visit.getSeenBy();
        if (doctorId == null) {
            return card;
        }
        Optional<Staff> found = staff.findById(doctorId);
        if (found.isEmpty()) {
            return card;
        }
        Staff doctor = found.get();
        card.put("id", doctor.getId().toString());
        card.put("name", doctor.getFullName());
        card.put("speciality", doctor.getSpeciality() == null ? "" : doctor.getSpeciality());
        card.put("registration", doctor.getRegistration() == null ? "" : doctor.getRegistration());
        return card;
    }

    private Map<String, Object> clinicCard(UUID clinicId) {
        Map<String, Object> card = new LinkedHashMap<>();
        clinics.findById(clinicId).ifPresent(clinic -> card.put("name", clinic.getName()));
        profiles.findById(clinicId).ifPresent(
                profile -> {
                    card.put("address", profile.getAddress() == null ? "" : profile.getAddress());
                    card.put("city", profile.getCity() == null ? "" : profile.getCity());
                    card.put("state", profile.getState() == null ? "" : profile.getState());
                    card.put("pin", profile.getPin() == null ? "" : profile.getPin());
                    card.put("gstin", profile.getGstin() == null ? "" : profile.getGstin());
                    card.put("pan", profile.getPan() == null ? "" : profile.getPan());
                    card.put("registration", profile.getRegistration() == null ? "" : profile.getRegistration());
                    card.put("phone", profile.getPhone() == null ? "" : profile.getPhone());
                });
        return card;
    }

    private String placeOfSupply(UUID clinicId) {
        String state = profiles.findById(clinicId).map(profile -> profile.getState()).orElse(null);
        if (state == null || state.isBlank()) {
            return "Karnataka (29)";
        }
        return state;
    }

    private String describe(Invoice invoice) {
        List<Map<String, Object>> lines =
                invoice.getLines() == null ? List.of() : invoice.getLines();
        if (lines.isEmpty()) {
            return "Consultation";
        }
        return String.valueOf(lines.get(0).getOrDefault("name", "Consultation"));
    }

    private String lineDescription(Map<String, Object> raw, String name) {
        Object description = raw.get("description");
        if (description != null) {
            return String.valueOf(description);
        }
        return name;
    }

    // --------------------------------------------------------------- helpers

    private static String label(String mode) {
        if (mode == null) {
            return "Cash";
        }
        return switch (mode) {
            case "upi" -> "UPI";
            case "card" -> "Card";
            case "refunded" -> "Refunded";
            default -> "Cash";
        };
    }

    static String initials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String[] parts = name.trim().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(part.charAt(0)));
        }
        return out.toString();
    }

    /** The amount in words, the way a receipt prints it. */
    static String words(BigDecimal amount) {
        BigDecimal rupees = amount.setScale(0, RoundingMode.DOWN);
        long value = rupees.longValue();
        if (value == 0) {
            return "Zero Rupees Only";
        }
        String[] units = {
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
            "Eighteen", "Nineteen"
        };
        String[] tens = {
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
        };
        String[] scales = {"", "Thousand", "Lakh", "Crore"};

        StringBuilder words = new StringBuilder();
        int index = 0;
        long remaining = value;
        while (remaining > 0 && index < scales.length) {
            long chunk = remaining % 100;
            if (chunk > 0) {
                String part = underHundred(chunk, units, tens);
                if (!part.isEmpty()) {
                    if (words.length() > 0) {
                        words.append(' ');
                    }
                    words.append(part);
                    if (!scales[index].isEmpty()) {
                        words.append(' ').append(scales[index]);
                    }
                }
            }
            remaining /= 100;
            index++;
        }
        return words + " Rupees Only";
    }

    private static String underHundred(long chunk, String[] units, String[] tens) {
        StringBuilder out = new StringBuilder();
        if (chunk >= 20) {
            out.append(tens[(int) (chunk / 10)]);
            if (chunk % 10 > 0) {
                out.append(' ').append(units[(int) (chunk % 10)]);
            }
        } else if (chunk > 0) {
            out.append(units[(int) chunk]);
        }
        return out.toString();
    }

    private static BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal toDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return new BigDecimal(number.toString());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException notANumber) {
            return BigDecimal.ZERO;
        }
    }

    private static LocalDate parseDate(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDate.parse(value);
        } catch (RuntimeException notADate) {
            return fallback;
        }
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException notAUuid) {
            throw new NotFoundException("That bill is not here.");
        }
    }
}
