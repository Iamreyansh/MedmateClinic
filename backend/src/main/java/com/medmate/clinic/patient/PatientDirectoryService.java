package com.medmate.clinic.patient;

import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.lab.LabOrder;
import com.medmate.clinic.lab.LabOrderRepository;
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
 * The clinic's patients: the list, and the record behind one of them.
 *
 * <p>The list is a working screen — one line per patient, with the number of
 * visits, when they were last seen and what they owe. The record is the
 * patient's own story: the visits, the readings, the results and who looked at
 * the record.
 *
 * <p>The two are different things and are answered by different endpoints: the
 * list is a list of summaries, the record is one patient's whole story.
 */
@Service
public class PatientDirectoryService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy");
    private static final DateTimeFormatter MOMENT = DateTimeFormatter.ofPattern("d MMM, h:mm a");

    private final PatientRepository patients;
    private final VisitRepository visits;
    private final VitalsRepository vitals;
    private final LabOrderRepository labOrders;
    private final StaffRepository staff;
    private final ClinicZoneService zones;

    public PatientDirectoryService(
            PatientRepository patients,
            VisitRepository visits,
            VitalsRepository vitals,
            LabOrderRepository labOrders,
            StaffRepository staff,
            ClinicZoneService zones) {
        this.patients = patients;
        this.visits = visits;
        this.vitals = vitals;
        this.labOrders = labOrders;
        this.staff = staff;
        this.zones = zones;
    }

    /** Everyone the clinic has met. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal) {
        if (!principal.can("patient")) {
            throw new ForbiddenException("You cannot open the patients.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Patient patient : patients.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", patient.getId().toString());
            body.put("name", patient.getFullName());
            body.put("initials", initials(patient.getFullName()));
            body.put("age", patient.getAge());
            body.put("sex", patient.getSex());
            body.put("phone", patient.getPhone());
            body.put("abha", patient.getAbha());
            body.put("allergies", patient.getAllergies());
            body.put("conditions", patient.getConditions());
            body.put("visits", visits.countByClinicIdAndPatientId(clinicId, patient.getId()));
            body.put("since", sinceOf(patient));
            body.put("lastSeen", lastSeenOf(clinicId, patient.getId()));
            body.put("doctor", doctorFor(clinicId, patient.getId()));
            body.put("dues", 0);
            items.add(body);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("meta", items.size() + " patients");
        return body;
    }

    /** One patient's record. */
    @Transactional(readOnly = true)
    public Map<String, Object> record(ClinicPrincipal principal, String patientId) {
        if (!principal.can("patient")) {
            throw new ForbiddenException("You cannot open the patients.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        Patient patient =
                patients.findByIdAndClinicId(parseUuid(patientId), clinicId)
                        .orElseThrow(() -> new NotFoundException("That patient is not here."));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", summary(patient, clinicId));
        body.put("visits", timeline(clinicId, patient.getId()));
        body.put("readings", readings(clinicId, patient.getId()));
        body.put("labResults", labResults(clinicId, patient.getId()));
        body.put("recordAccess", recordAccess(clinicId, patient.getId()));
        return body;
    }

    /** The patient, as a summary line. */
    private Map<String, Object> summary(Patient patient, UUID clinicId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("initials", initials(patient.getFullName()));
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("phone", patient.getPhone());
        body.put("abha", patient.getAbha());
        body.put("allergies", patient.getAllergies());
        body.put("conditions", patient.getConditions());
        body.put("visits", visits.countByClinicIdAndPatientId(clinicId, patient.getId()));
        body.put("since", sinceOf(patient));
        return body;
    }

    /** The patient's story, visit by visit. */
    private List<Map<String, Object>> timeline(UUID clinicId, UUID patientId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Visit visit : visits.findByClinicIdAndPatientIdOrderByCreatedAtAsc(clinicId, patientId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", visit.getId().toString());
            body.put(
                    "date",
                    visit.getCreatedAt() == null ? "" : DAY.format(visit.getCreatedAt().atZone(zone(clinicId))));
            body.put("doctor", doctorName(clinicId, visit.getSeenBy()));
            body.put("diagnosis", visit.getReason() == null ? "" : visit.getReason());
            body.put("medicines", visit.getDetail() == null ? "" : visit.getDetail());
            body.put("signed", visit.getStatus());
            list.add(body);
        }
        return list;
    }

    /** The patient's readings. */
    private List<Map<String, Object>> readings(UUID clinicId, UUID patientId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Vitals reading :
                vitals.findByClinicIdAndPatientIdOrderByRecordedAtDesc(clinicId, patientId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("label", "Vitals");
            body.put(
                    "value",
                    reading.getRecordedAt() == null
                            ? ""
                            : MOMENT.format(reading.getRecordedAt().atZone(zone(clinicId))));
            body.put("state", "Steady");
            body.put("tone", "plain");
            list.add(body);
        }
        return list;
    }

    /** The patient's results. */
    private List<Map<String, Object>> labResults(UUID clinicId, UUID patientId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (LabOrder order :
                labOrders.findByClinicIdAndPatientIdOrderByOrderedAtDesc(clinicId, patientId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("name", order.getTestName());
            body.put(
                    "when",
                    order.getOrderedAt() == null ? "" : DAY.format(order.getOrderedAt().atZone(zone(clinicId))));
            body.put("value", order.getResultValue() == null ? "Pending" : order.getResultValue());
            body.put("tone", "plain");
            list.add(body);
        }
        return list;
    }

    /** Who looked at the record, and when. */
    private List<Map<String, Object>> recordAccess(UUID clinicId, UUID patientId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Visit visit : visits.findByClinicIdAndPatientIdOrderByCreatedAtAsc(clinicId, patientId)) {
            if (visit.getSeenBy() == null) {
                continue;
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("who", doctorName(clinicId, visit.getSeenBy()));
            body.put(
                    "when",
                    visit.getCreatedAt() == null ? "" : MOMENT.format(visit.getCreatedAt().atZone(zone(clinicId))));
            body.put("what", "consultation");
            list.add(body);
        }
        return list;
    }

    /** When the clinic first met the patient. */
    private String sinceOf(Patient patient) {
        if (patient.getCreatedAt() == null) {
            return "";
        }
        return String.valueOf(patient.getCreatedAt().atZone(ZoneId.of("Asia/Kolkata")).getYear());
    }

    /** When the patient was last seen. */
    private String lastSeenOf(UUID clinicId, UUID patientId) {
        String last = "—";
        for (Visit visit : visits.findByClinicIdAndPatientIdOrderByCreatedAtAsc(clinicId, patientId)) {
            if (visit.getCreatedAt() != null) {
                last = DAY.format(visit.getCreatedAt().atZone(zone(clinicId)));
            }
        }
        return last;
    }

    /** The doctor who saw the patient last. */
    private String doctorFor(UUID clinicId, UUID patientId) {
        String name = "";
        for (Visit visit : visits.findByClinicIdAndPatientIdOrderByCreatedAtAsc(clinicId, patientId)) {
            if (visit.getSeenBy() != null) {
                name = doctorName(clinicId, visit.getSeenBy());
            }
        }
        return name;
    }

    /** The name of one member of the clinic's staff. */
    private String doctorName(UUID clinicId, UUID staffId) {
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

    /** The clinic's own time. */
    private ZoneId zone(UUID clinicId) {
        return zones.zoneOf(clinicId);
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
        try {
            return UUID.fromString(value);
        } catch (RuntimeException notAUuid) {
            throw new NotFoundException("That patient is not here.");
        }
    }
}
