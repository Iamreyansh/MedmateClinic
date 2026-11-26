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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    /** The most patients one page of the list holds. */
    private static final int MAX_PATIENTS = 200;

    private final PatientRepository patients;
    private final VisitRepository visits;
    private final VitalsRepository vitals;
    private final LabOrderRepository labOrders;
    private final StaffRepository staff;
    private final ClinicZoneService zones;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public PatientDirectoryService(
            PatientRepository patients,
            VisitRepository visits,
            VitalsRepository vitals,
            LabOrderRepository labOrders,
            StaffRepository staff,
            ClinicZoneService zones,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.patients = patients;
        this.visits = visits;
        this.vitals = vitals;
        this.labOrders = labOrders;
        this.staff = staff;
        this.zones = zones;
        this.jdbc = jdbc;
    }

    /** Everyone the clinic has met. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal) {
        if (!principal.can("patient")) {
            throw new ForbiddenException("You cannot open the patients.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate today = LocalDate.now(zone);
        Instant dayFrom = today.atStartOfDay(zone).toInstant();
        Instant dayTo = today.plusDays(1).atStartOfDay(zone).toInstant();
        UUID signedIn = principal.staffIdAsUuid();

        // The facts about the patients, read once for the whole page: a list
        // that asks the database about each patient in turn gets slower the
        // longer it gets.
        List<Patient> everyone = patients.findByClinicIdOrderByCreatedAtAsc(clinicId);
        Map<UUID, Integer> visitCounts = visitCounts(clinicId);
        Map<UUID, String> lastSeen = lastSeen(clinicId, zone);
        Map<UUID, String> lastDoctor = lastDoctors(clinicId);
        Map<UUID, String> todayTokens = todayTokens(clinicId, dayFrom, dayTo);
        Map<UUID, String> followUps = followUps(clinicId, zone);
        Set<UUID> mine = myPatients(clinicId, signedIn);
        Instant monthStart = today.withDayOfMonth(1).atStartOfDay(zone).toInstant();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Patient patient : everyone) {
            if (items.size() >= MAX_PATIENTS) {
                break;
            }
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
            body.put("visits", visitCounts.getOrDefault(patient.getId(), 0));
            body.put("since", sinceOf(patient));
            body.put("lastSeen", lastSeen.getOrDefault(patient.getId(), "—"));
            body.put("doctor", lastDoctor.getOrDefault(patient.getId(), ""));
            body.put("dues", 0);
            // The queue token, when the patient is in the clinic today.
            body.put("token", todayTokens.get(patient.getId()));
            body.put("hereToday", todayTokens.containsKey(patient.getId()));
            // When the patient is due back, if they are.
            body.put("followUpOn", followUps.get(patient.getId()));
            // Whether the patient is one of the signed-in doctor's own.
            body.put("mine", mine.contains(patient.getId()));
            // Whether the patient is new this month.
            body.put(
                    "newThisMonth",
                    patient.getCreatedAt() != null && patient.getCreatedAt().isAfter(monthStart));
            items.add(body);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("total", everyone.size());
        body.put("meta", everyone.size() + " patients");
        return body;
    }

    /** How many times each patient has been to the clinic. */
    private Map<UUID, Integer> visitCounts(UUID clinicId) {
        Map<UUID, Integer> counts = new LinkedHashMap<>();
        jdbc.query(
                "select patient_id, count(*) as visits from visits where clinic_id = ? group by patient_id",
                (rs, row) -> {
                    counts.put(rs.getObject("patient_id", UUID.class), rs.getInt("visits"));
                    return null;
                },
                clinicId);
        return counts;
    }

    /** When each patient was last seen. */
    private Map<UUID, String> lastSeen(UUID clinicId, ZoneId zone) {
        Map<UUID, String> seen = new LinkedHashMap<>();
        jdbc.query(
                "select distinct on (patient_id) patient_id, created_at from visits where clinic_id = ? "
                        + "order by patient_id, created_at desc",
                (rs, row) -> {
                    java.sql.Timestamp at = rs.getTimestamp("created_at");
                    seen.put(
                            rs.getObject("patient_id", UUID.class),
                            at == null ? "—" : DAY.format(at.toInstant().atZone(zone)));
                    return null;
                },
                clinicId);
        return seen;
    }

    /** The doctor who saw each patient last. */
    private Map<UUID, String> lastDoctors(UUID clinicId) {
        Map<UUID, UUID> doctors = new LinkedHashMap<>();
        jdbc.query(
                "select distinct on (patient_id) patient_id, seen_by from visits where clinic_id = ? "
                        + "and seen_by is not null order by patient_id, created_at desc",
                (rs, row) -> {
                    doctors.put(rs.getObject("patient_id", UUID.class), rs.getObject("seen_by", UUID.class));
                    return null;
                },
                clinicId);

        Map<UUID, String> names = new LinkedHashMap<>();
        Map<UUID, String> staffNames = new LinkedHashMap<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            staffNames.put(person.getId(), person.getFullName());
        }
        for (Map.Entry<UUID, UUID> entry : doctors.entrySet()) {
            names.put(entry.getKey(), staffNames.getOrDefault(entry.getValue(), ""));
        }
        return names;
    }

    /** The queue token of the patients who are in the clinic today. */
    private Map<UUID, String> todayTokens(UUID clinicId, Instant from, Instant to) {
        Map<UUID, String> tokens = new LinkedHashMap<>();
        jdbc.query(
                "select distinct on (patient_id) patient_id, token from visits where clinic_id = ? "
                        + "and created_at >= ? and created_at < ? order by patient_id, created_at desc",
                (rs, row) -> {
                    tokens.put(rs.getObject("patient_id", UUID.class), rs.getString("token"));
                    return null;
                },
                clinicId,
                java.sql.Timestamp.from(from),
                java.sql.Timestamp.from(to));
        return tokens;
    }

    /** When each patient is due back, if they are. */
    private Map<UUID, String> followUps(UUID clinicId, ZoneId zone) {
        Map<UUID, String> followUps = new LinkedHashMap<>();
        jdbc.query(
                "select distinct on (patient_id) patient_id, starts_at from appointments where clinic_id = ? "
                        + "and status = 'booked' and starts_at > ? order by patient_id, starts_at asc",
                (rs, row) -> {
                    java.sql.Timestamp at = rs.getTimestamp("starts_at");
                    followUps.put(
                            rs.getObject("patient_id", UUID.class),
                            at == null ? null : MOMENT.format(at.toInstant().atZone(zone)));
                    return null;
                },
                clinicId,
                java.sql.Timestamp.from(java.time.Instant.now()));
        return followUps;
    }

    /** The patients of one doctor: the ones they have seen. */
    private Set<UUID> myPatients(UUID clinicId, UUID staffId) {
        Set<UUID> mine = new java.util.HashSet<>();
        if (staffId == null) {
            return mine;
        }
        jdbc.query(
                "select distinct patient_id from visits where clinic_id = ? and seen_by = ?",
                (rs, row) -> {
                    mine.add(rs.getObject("patient_id", UUID.class));
                    return null;
                },
                clinicId,
                staffId);
        return mine;
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
