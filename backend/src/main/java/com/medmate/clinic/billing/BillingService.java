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

    public BillingService(
            InvoiceRepository invoices,
            PatientRepository patients,
            StaffRepository staff,
            VisitRepository visits,
            ClinicProfileRepository profiles,
            RegistryClinicRepository clinics,
            ClinicZoneService zones) {
        this.invoices = invoices;
        this.patients = patients;
        this.staff = staff;
        this.visits = visits;
        this.profiles = profiles;
        this.clinics = clinics;
        this.zones = zones;
    }

    /** The till: what came in today, what is still owed, and the bill on screen. */
    @Transactional(readOnly = true)
    public Map<String, Object> till(ClinicPrincipal principal, String date) {
        if (!principal.can("billing")) {
            throw new ForbiddenException("You cannot open billing.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate day = parseDate(date, LocalDate.now(zone));
        Instant from = day.atStartOfDay(zone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();

        List<Invoice> todays = invoices.findByClinicIdAndCreatedAtBetweenOrderByCreatedAtDesc(clinicId, from, to);
        List<Invoice> pending = new ArrayList<>();
        for (Invoice invoice : todays) {
            if ("unpaid".equals(invoice.getStatus())) {
                pending.add(invoice);
            }
        }

        BigDecimal collected = BigDecimal.ZERO;
        BigDecimal pendingAmount = BigDecimal.ZERO;
        BigDecimal refundedAmount = BigDecimal.ZERO;
        int paidBills = 0;
        int refundedBills = 0;
        for (Invoice invoice : todays) {
            String status = invoice.getStatus() == null ? "unpaid" : invoice.getStatus();
            switch (status) {
                case "paid" -> {
                    collected = collected.add(zero(invoice.getTotal()));
                    paidBills++;
                }
                case "refunded" -> {
                    refundedAmount = refundedAmount.add(zero(invoice.getTotal()));
                    refundedBills++;
                }
                default -> pendingAmount = pendingAmount.add(zero(invoice.getTotal()));
            }
        }

        List<Map<String, Object>> byMode = new ArrayList<>();
        for (String mode : List.of("cash", "upi", "card")) {
            BigDecimal amount = BigDecimal.ZERO;
            int count = 0;
            for (Invoice invoice : todays) {
                if ("paid".equals(invoice.getStatus()) && mode.equals(invoice.getPayMode())) {
                    amount = amount.add(zero(invoice.getTotal()));
                    count++;
                }
            }
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("mode", mode);
            card.put("label", label(mode));
            card.put("amount", amount);
            card.put("bills", count);
            byMode.add(card);
        }
        Map<String, Object> pendingCard = new LinkedHashMap<>();
        pendingCard.put("mode", "pending");
        pendingCard.put("label", "Pending");
        pendingCard.put("amount", pendingAmount);
        pendingCard.put("bills", pending.size());
        byMode.add(pendingCard);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("collected", collected);
        summary.put("bills", paidBills);
        summary.put("pendingCount", pending.size());
        summary.put("pendingAmount", pendingAmount);
        summary.put("refundCount", refundedBills);
        summary.put("refundAmount", refundedAmount);
        summary.put("dayBills", todays.size());

        List<Map<String, Object>> pendingItems = new ArrayList<>();
        for (Invoice invoice : pending) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("invoiceId", invoice.getId().toString());
            item.put("number", invoice.getNumber());
            item.put("amount", invoice.getTotal());
            item.put("createdAt", invoice.getCreatedAt() == null ? null : invoice.getCreatedAt().toString());
            item.put("patient", patientCard(invoice.getPatientId()));
            item.put("description", describe(invoice));
            pendingItems.add(item);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("day", day.toString());
        body.put("dayLabel", day.format(DAY));
        body.put("summary", summary);
        body.put("byMode", byMode);
        body.put("pending", pendingItems);
        body.put("bill", null);
        body.put("clinic", clinicCard(clinicId));
        return body;
    }

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
        return billCard(clinicId, invoice, zones.zoneOf(clinicId));
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
        return billCard(clinicId, invoice, zones.zoneOf(clinicId));
    }

    // ------------------------------------------------------------------ bill

    private Map<String, Object> billCard(UUID clinicId, Invoice invoice, ZoneId zone) {
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
        event.put("text", text);
        events.add(event);
    }

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
