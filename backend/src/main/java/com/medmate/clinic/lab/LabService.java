package com.medmate.clinic.lab;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The lab and diagnostics bench.
 *
 * <p>A doctor signs a prescription with tests, and the samples land here. The
 * technician collects them, works them up, and sends the results back — a
 * result out of range is flagged before it goes, so the doctor sees it flagged
 * when it arrives.
 *
 * <p>The five numbers at the top are counted from the clinic's own orders, so
 * they move the moment a doctor signs a prescription with a test.
 */
@Service
public class LabService {

    /** The partner labs the clinic sends samples to. */
    private static final List<String> PARTNERS = List.of("Tenet Diagnostics", "MediDocs");

    /** The bench's own vocabulary: an order that nobody has touched is waiting to be collected. */
    private static final String[] OPEN_STATUSES = {"to_collect", "in_lab", "sent_out"};

    /** How many rows one page of the bench holds. */
    public static final int PAGE_SIZE = 50;

    /** The most rows one page may hold. */
    public static final int MAX_PAGE_SIZE = 200;

    private final LabOrderRepository orders;
    private final PatientRepository patients;
    private final StaffRepository staff;

    public LabService(LabOrderRepository orders, PatientRepository patients, StaffRepository staff) {
        this.orders = orders;
        this.patients = patients;
        this.staff = staff;
    }

    /** The bench: the samples on it, and what has been reported. */
    @Transactional(readOnly = true)
    public Map<String, Object> bench(ClinicPrincipal principal) {
        return bench(principal, PAGE_SIZE, 0, null);
    }

    /**
     * The bench, one page at a time.
     *
     * <p>The bench is a working screen, not an archive: it shows what is on it
     * now. A clinic with years of history behind it must not answer with every
     * order it ever had, so the rows are limited and the caller can ask for
     * the next page.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> bench(ClinicPrincipal principal, int limit, int offset, String status) {
        if (!principal.can("lab")) {
            throw new ForbiddenException("You cannot open the Lab.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        int page = Math.max(1, Math.min(limit <= 0 ? PAGE_SIZE : limit, MAX_PAGE_SIZE));
        int from = Math.max(0, offset);

        // The staff and the patients are read once and held for the whole
        // page, rather than being read again for every order on it.
        Map<UUID, Staff> people = new LinkedHashMap<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            people.put(person.getId(), person);
        }
        Map<UUID, Patient> everyone = new LinkedHashMap<>();
        for (Patient patient : patients.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            everyone.put(patient.getId(), patient);
        }

        String wanted = status == null || status.isBlank() ? null : status.trim().toLowerCase();
        int fetch = Math.min(from + page + 1, MAX_PAGE_SIZE);

        List<Map<String, Object>> open = new ArrayList<>();
        List<Map<String, Object>> reported = new ArrayList<>();

        if (wanted == null || "reported".equals(wanted)) {
            for (LabOrder order : rows(clinicId, "reported", fetch)) {
                reported.add(order(order, clinicId, people, everyone));
            }
        }
        if (wanted == null) {
            for (String openStatus : OPEN_STATUSES) {
                for (LabOrder order : rows(clinicId, openStatus, fetch)) {
                    open.add(order(order, clinicId, people, everyone));
                }
            }
        } else if (!"reported".equals(wanted)) {
            for (LabOrder order : rows(clinicId, wanted, fetch)) {
                open.add(order(order, clinicId, people, everyone));
            }
        }

        open = page(open, from, page);
        reported = page(reported, from, page);

        int abnormalToday = 0;
        for (Map<String, Object> row : reported) {
            if (Boolean.TRUE.equals(row.get("abnormal"))) {
                abnormalToday++;
            }
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("toCollect", orders.countByClinicIdAndStatus(clinicId, "to_collect"));
        counts.put("inLab", orders.countByClinicIdAndStatus(clinicId, "in_lab"));
        counts.put("sentOut", orders.countByClinicIdAndStatus(clinicId, "sent_out"));
        counts.put("reportedToday", orders.countByClinicIdAndStatus(clinicId, "reported"));
        counts.put("abnormalToday", abnormalToday);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        body.put("open", open);
        body.put("reported", reported);
        body.put("partners", PARTNERS);
        body.put("limit", page);
        body.put("offset", from);
        body.put("meta", open.size() + " on the bench · " + reported.size() + " reported today");
        return body;
    }

    /** One page of a status. */
    private List<LabOrder> rows(UUID clinicId, String status, int limit) {
        return orders.findByClinicIdAndStatusOrderByOrderedAtAsc(
                clinicId, status, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    /** The rows of one page, out of the rows that were read. */
    private static List<Map<String, Object>> page(List<Map<String, Object>> rows, int from, int size) {
        if (rows.size() <= from) {
            return new ArrayList<>();
        }
        int end = Math.min(rows.size(), from + size);
        return new ArrayList<>(rows.subList(from, end));
    }

    /** Report a result. It goes back to the doctor who ordered the test. */
    @Transactional
    public Map<String, Object> report(ClinicPrincipal principal, Map<String, Object> request) {
        if (!principal.can("lab")) {
            throw new ForbiddenException("You cannot open the Lab.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        String orderId = String.valueOf(request.getOrDefault("orderId", ""));
        LabOrder order = orders.findByIdAndClinicId(parseUuid(orderId), clinicId)
                .orElseThrow(() -> new NotFoundException("That order is no longer on the bench."));

        order.setResultValue(text(request.get("value")));
        // A reference is a range: the lower bound and the upper bound. Storing
        // only one of them made a range impossible to represent, and made every
        // result with a range read as abnormal.
        order.setReferenceLow(text(request.get("referenceLow")));
        order.setReferenceHigh(text(request.get("referenceHigh")));
        if (order.getReferenceHigh() == null && order.getReferenceLow() != null) {
            // The technician typed one bound. A single number is a range whose
            // other side is open.
            order.setReferenceHigh(null);
        }
        order.setResultNote(text(request.get("note")));
        order.setCritical(Boolean.TRUE.equals(request.get("critical")));
        order.setStatus("reported");
        order.setReportedAt(Instant.now());
        orders.save(order);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId().toString());
        body.put("test", order.getTestName());
        body.put("patient", patients.findByIdAndClinicId(order.getPatientId(), clinicId)
                .map(Patient::getFullName)
                .orElse(""));
        body.put("value", order.getResultValue());
        body.put("reference", order.getReferenceLow());
        body.put("referenceLow", order.getReferenceLow());
        body.put("referenceHigh", order.getReferenceHigh());
        // The flag is worked out from what was written down, on the write path
        // and on the read path alike. The caller's own flag is never echoed
        // back: the same row must not read one way now and another way after
        // a refresh.
        body.put("abnormal", order.isCritical() || !referenceNormal(order));
        body.put("critical", order.isCritical());
        body.put("reportedAt", order.getReportedAt());
        return body;
    }

    /** Move a sample on — collected, sent to a partner lab, or received back. */
    @Transactional
    public Map<String, Object> move(ClinicPrincipal principal, String orderId, Map<String, Object> request) {
        if (!principal.can("lab")) {
            throw new ForbiddenException("You cannot open the Lab.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        LabOrder order = orders.findByIdAndClinicId(parseUuid(orderId), clinicId)
                .orElseThrow(() -> new NotFoundException("That order is no longer on the bench."));

        String status = String.valueOf(request.getOrDefault("status", order.getStatus()));
        order.setStatus(status);
        if (request.get("partner") != null) {
            order.setPartner(text(request.get("partner")));
        }
        // The tube number and the moment it was collected. The bench shows
        // both, and the technician prints the number on the tube.
        String sampleNo = text(request.get("sampleNo"));
        if (sampleNo != null) {
            order.setSampleNo(sampleNo);
        } else if (order.getSampleNo() == null && "in_lab".equals(status)) {
            order.setSampleNo(nextSampleNo(clinicId));
        }
        if ("in_lab".equals(status) && order.getCollectedAt() == null) {
            order.setCollectedAt(Instant.now());
        }
        String collectedAt = text(request.get("collectedAt"));
        if (collectedAt != null) {
            try {
                order.setCollectedAt(Instant.parse(collectedAt));
            } catch (RuntimeException notAnInstant) {
                // the bench keeps the moment it already had
            }
        }
        orders.save(order);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId().toString());
        body.put("status", order.getStatus());
        body.put("partner", order.getPartner());
        body.put("sampleNo", order.getSampleNo());
        body.put("collectedAt", order.getCollectedAt());
        return body;
    }

    /** The order, as the bench sends it. */
    private Map<String, Object> order(
            LabOrder order,
            UUID clinicId,
            Map<UUID, Staff> people,
            Map<UUID, Patient> everyone) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", order.getId().toString());
        body.put("visitId", order.getVisitId() == null ? null : order.getVisitId().toString());
        body.put("patient", patient(order.getPatientId(), everyone));
        body.put("test", order.getTestName());
        body.put("status", order.getStatus());
        body.put("sampleNo", order.getSampleNo());
        body.put("partner", order.getPartner());
        body.put("orderedBy", doctor(order.getOrderedBy(), people));
        body.put("collectedAt", order.getCollectedAt());
        body.put("reportedAt", order.getReportedAt());
        body.put("value", order.getResultValue());
        body.put("reference", order.getReferenceLow());
        body.put("referenceLow", order.getReferenceLow());
        body.put("referenceHigh", order.getReferenceHigh());
        body.put("abnormal", order.isCritical() || !referenceNormal(order));
        body.put("critical", order.isCritical());
        body.put("note", order.getResultNote());
        return body;
    }

    /** The patient the sample belongs to. */
    private Map<String, Object> patient(UUID patientId, Map<UUID, Patient> everyone) {
        Map<String, Object> body = new LinkedHashMap<>();
        Patient patient = everyone.get(patientId);
        if (patient == null) {
            body.put("id", patientId.toString());
            body.put("name", "");
            body.put("age", null);
            body.put("sex", null);
            body.put("initials", "");
            body.put("phone", null);
            return body;
        }
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("initials", initials(patient.getFullName()));
        body.put("phone", patient.getPhone());
        return body;
    }

    /** The doctor who ordered the test. */
    private Map<String, Object> doctor(UUID staffId, Map<UUID, Staff> people) {
        if (staffId == null) {
            return null;
        }
        Staff person = people.get(staffId);
        if (person == null) {
            return null;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", person.getId().toString());
        body.put("name", person.getFullName());
        body.put("speciality", person.getSpeciality());
        return body;
    }

    /**
     * Whether the result sat inside the range it was read against.
     *
     * <p>A result with no value, or no range, is not known to be abnormal — it
     * is not known at all. A result with a value and a range is normal only if
     * it sits between the bounds.
     */
    static boolean referenceNormal(LabOrder order) {
        String value = order.getResultValue();
        String low = order.getReferenceLow();
        String high = order.getReferenceHigh();
        if (value == null || value.isBlank()) {
            return true;
        }
        if (low == null && high == null) {
            return true;
        }
        Double number = number(value);
        if (number == null) {
            return true;
        }
        if (low != null && !low.isBlank()) {
            Double lower = number(low);
            if (lower != null && number < lower) {
                return false;
            }
        }
        if (high != null && !high.isBlank()) {
            Double upper = number(high);
            if (upper != null && number > upper) {
                return false;
            }
        }
        return true;
    }

    /** The number in a result or a bound, if it is one. */
    private static Double number(String value) {
        try {
            return Double.valueOf(value.trim());
        } catch (RuntimeException notANumber) {
            return null;
        }
    }

    /** The next tube number in the clinic's series. */
    private String nextSampleNo(UUID clinicId) {
        int highest = 0;
        for (LabOrder order : orders.findByClinicIdOrderByOrderedAtAsc(clinicId)) {
            String sampleNo = order.getSampleNo();
            if (sampleNo == null || !sampleNo.startsWith("T-")) {
                continue;
            }
            try {
                highest = Math.max(highest, Integer.parseInt(sampleNo.substring(2)));
            } catch (NumberFormatException notANumber) {
                // a tube number that is not in the series is left alone
            }
        }
        return String.format("T-%04d", highest + 1);
    }

    /** The text the technician typed, if any. */
    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? null : text;
    }

    /** The person's initials. */
    private String initials(String name) {
        if (name == null) {
            return "";
        }
        StringBuilder initials = new StringBuilder();
        for (String part : name.split("\\s+")) {
            if (part.isEmpty()) {
                continue;
            }
            initials.append(part.charAt(0));
            if (initials.length() == 2) {
                break;
            }
        }
        return initials.toString().toUpperCase();
    }

    /** The id the caller sent, if it is one. */
    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            throw new NotFoundException("That order is no longer on the bench.");
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException notAUuid) {
            throw new NotFoundException("That order is no longer on the bench.");
        }
    }
}
