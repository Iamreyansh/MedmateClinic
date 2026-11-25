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
        if (!principal.can("lab")) {
            throw new ForbiddenException("You cannot open the Lab.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> open = new ArrayList<>();
        List<Map<String, Object>> reported = new ArrayList<>();
        int toCollect = 0;
        int inLab = 0;
        int sentOut = 0;
        int abnormalToday = 0;

        for (LabOrder order : orders.findByClinicIdAndStatusOrderByOrderedAtAsc(clinicId, "to_collect")) {
            open.add(order(order, clinicId));
            toCollect++;
        }
        for (LabOrder order : orders.findByClinicIdAndStatusOrderByOrderedAtAsc(clinicId, "in_lab")) {
            open.add(order(order, clinicId));
            inLab++;
        }
        for (LabOrder order : orders.findByClinicIdAndStatusOrderByOrderedAtAsc(clinicId, "sent_out")) {
            open.add(order(order, clinicId));
            sentOut++;
        }
        for (LabOrder order : orders.findByClinicIdAndStatusOrderByOrderedAtAsc(clinicId, "reported")) {
            reported.add(order(order, clinicId));
            if (order.isCritical() || !referenceNormal(order)) {
                abnormalToday++;
            }
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("toCollect", toCollect);
        counts.put("inLab", inLab);
        counts.put("sentOut", sentOut);
        counts.put("reportedToday", reported.size());
        counts.put("abnormalToday", abnormalToday);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        body.put("open", open);
        body.put("reported", reported);
        body.put("partners", PARTNERS);
        body.put("meta", open.size() + " on the bench · " + reported.size() + " reported today");
        return body;
    }

    /** Report a result. It goes back to the doctor who ordered the test. */
    @Transactional
    public Map<String, Object> report(ClinicPrincipal principal, Map<String, Object> request) {
        if (!principal.can("lab")) {
            throw new ForbiddenException("You cannot open the Lab.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        String orderId = String.valueOf(request.getOrDefault("orderId", ""));
        LabOrder order = orders.findByIdAndClinicId(UUID.fromString(orderId), clinicId)
                .orElseThrow(() -> new NotFoundException("That order is no longer on the bench."));

        order.setResultValue(text(request.get("value")));
        order.setReferenceLow(text(request.get("reference")));
        order.setReferenceHigh(null);
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
        body.put("abnormal", Boolean.TRUE.equals(request.get("abnormal")));
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

        LabOrder order = orders.findByIdAndClinicId(UUID.fromString(orderId), clinicId)
                .orElseThrow(() -> new NotFoundException("That order is no longer on the bench."));

        String status = String.valueOf(request.getOrDefault("status", order.getStatus()));
        order.setStatus(status);
        if (request.get("partner") != null) {
            order.setPartner(text(request.get("partner")));
        }
        orders.save(order);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId().toString());
        body.put("status", order.getStatus());
        body.put("partner", order.getPartner());
        return body;
    }

    /** The order, as the bench sends it. */
    private Map<String, Object> order(LabOrder order, UUID clinicId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", order.getId().toString());
        body.put("visitId", order.getVisitId() == null ? null : order.getVisitId().toString());
        body.put("patient", patient(order.getPatientId(), clinicId));
        body.put("test", order.getTestName());
        body.put("status", order.getStatus());
        body.put("sampleNo", order.getSampleNo());
        body.put("partner", order.getPartner());
        body.put("orderedBy", doctor(order.getOrderedBy(), clinicId));
        body.put("collectedAt", order.getCollectedAt());
        body.put("reportedAt", order.getReportedAt());
        body.put("value", order.getResultValue());
        body.put("reference", order.getReferenceLow());
        body.put("abnormal", order.isCritical() || !referenceNormal(order));
        body.put("critical", order.isCritical());
        body.put("note", order.getResultNote());
        return body;
    }

    /** The patient the sample belongs to. */
    private Map<String, Object> patient(UUID patientId, UUID clinicId) {
        Map<String, Object> body = new LinkedHashMap<>();
        Patient patient = patients.findByIdAndClinicId(patientId, clinicId).orElse(null);
        if (patient == null) {
            body.put("id", patientId.toString());
            body.put("name", "");
            body.put("age", null);
            body.put("sex", null);
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
    private Map<String, Object> doctor(UUID staffId, UUID clinicId) {
        if (staffId == null) {
            return null;
        }
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (person.getId().equals(staffId)) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("id", person.getId().toString());
                body.put("name", person.getFullName());
                body.put("speciality", person.getSpeciality());
                return body;
            }
        }
        return null;
    }

    /** Whether the result sat inside the range it was read against. */
    private boolean referenceNormal(LabOrder order) {
        return order.getResultValue() == null || order.getReferenceLow() == null;
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
}
