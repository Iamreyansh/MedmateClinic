package com.medmate.clinic.inbox;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.vital.Vitals;
import com.medmate.clinic.vital.VitalsRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The inbox.
 *
 * <p>One list of the things waiting for the doctor: the results to review, the
 * referrals from colleagues and the handovers between people. Each carries the
 * patient it is about, so the screen can show who it is for without opening
 * anything.
 */
@Service
public class InboxService {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM");

    private final PatientRepository patients;
    private final VisitRepository visits;
    private final VitalsRepository vitals;
    private final StaffRepository staff;
    private final com.medmate.clinic.lab.LabOrderRepository labOrders;
    private final com.medmate.clinic.handover.HandoverRepository handovers;

    public InboxService(
            PatientRepository patients,
            VisitRepository visits,
            VitalsRepository vitals,
            StaffRepository staff,
            com.medmate.clinic.lab.LabOrderRepository labOrders,
            com.medmate.clinic.handover.HandoverRepository handovers) {
        this.patients = patients;
        this.visits = visits;
        this.vitals = vitals;
        this.staff = staff;
        this.labOrders = labOrders;
        this.handovers = handovers;
    }

    /** The list, with the counts the filter chips show. */
    @Transactional(readOnly = true)
    public Map<String, Object> inbox(ClinicPrincipal principal) {
        if (!principal.can("inbox")) {
            throw new ForbiddenException("You cannot open the inbox.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = ZoneId.of("Asia/Kolkata");

        List<Map<String, Object>> items = new ArrayList<>();

        // The results that are back and are not normal.
        for (var order : labOrders.findByClinicIdAndStatusOrderByOrderedAtAsc(clinicId, "reported")) {
            if (order.getReportedAt() == null) {
                continue;
            }
            Patient patient = patients.findByIdAndClinicId(order.getPatientId(), clinicId).orElse(null);
            String title =
                    order.getTestName()
                            + " "
                            + (order.getResultValue() == null ? "" : order.getResultValue())
                            + (order.isCritical() ? " — critical" : " — high");
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", order.getId().toString());
            item.put("kind", "Result");
            item.put("patientId", order.getPatientId().toString());
            item.put("title", title);
            item.put(
                    "body",
                    order.getTestName()
                            + " · reference "
                            + (order.getReferenceLow() == null ? "—" : order.getReferenceLow()));
            item.put("time", CLOCK.format(order.getReportedAt().atZone(zone)));
            if (order.isCritical()) {
                item.put("critical", true);
            }
            item.put("patient", patient(patient, clinicId));
            items.add(item);
        }

        // The handovers between people.
        for (var handover : handovers.findByClinicIdOrderByCreatedAtDesc(clinicId)) {
            Patient patient = patients.findByIdAndClinicId(handover.getPatientId(), clinicId).orElse(null);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", handover.getId().toString());
            item.put("kind", "Handover");
            item.put("patientId", handover.getPatientId().toString());
            item.put(
                    "title",
                    "From "
                            + nameOf(clinicId, handover.getFromStaffId())
                            + ": "
                            + (handover.getNote() == null ? "handover" : handover.getNote()));
            item.put("body", "Handed over by " + nameOf(clinicId, handover.getFromStaffId()));
            item.put("time", DAY.format(handover.getCreatedAt().atZone(zone)));
            item.put("patient", patient(patient, clinicId));
            items.add(item);
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("all", items.size());
        counts.put("Result", 0);
        counts.put("Referral", 0);
        counts.put("Handover", 0);
        for (Map<String, Object> item : items) {
            String kind = String.valueOf(item.get("kind"));
            counts.merge(kind, 1, Integer::sum);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("counts", counts);
        body.put(
                "meta",
                "Referrals from colleagues, lab results to review and handovers.");
        return body;
    }

    /** The patient, as the inbox sends them. */
    private Map<String, Object> patient(Patient patient, UUID clinicId) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (patient == null) {
            body.put("id", null);
            body.put("name", "");
            body.put("age", null);
            body.put("sex", null);
            body.put("initials", "");
            body.put("phone", null);
            body.put("abha", "");
            body.put("allergies", new String[0]);
            body.put("conditions", new String[0]);
            body.put("visits", 0);
            body.put("since", "");
            return body;
        }
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("initials", initials(patient.getFullName()));
        body.put("phone", patient.getPhone());
        body.put("abha", patient.getAbha());
        body.put("allergies", patient.getAllergies());
        body.put("conditions", patient.getConditions());
        body.put("visits", visits.countByClinicIdAndPatientId(clinicId, patient.getId()));
        body.put("since", "");
        return body;
    }

    /** The name of one member of the clinic's staff. */
    private String nameOf(UUID clinicId, UUID staffId) {
        if (staffId == null) {
            return "";
        }
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (person.getId().equals(staffId)) {
                return person.getFullName();
            }
        }
        return "";
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
}
