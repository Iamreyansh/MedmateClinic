package com.medmate.clinic.queue;

import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The doctor's queue.
 *
 * <p>The queue is the clinic's waiting room: who is waiting, for how long,
 * and what the nurse has measured. The console may be narrowed to one
 * doctor's own queue with {@code ?doctor=}, and the readings and the people
 * behind the rows are read once for the whole page — a queue that goes back
 * to the database for every row it draws gets slower the longer it gets.
 */
@RestController
@RequestMapping("/api/clinic")
public class QueueController {

    /** The most patients one page of the queue holds. */
    private static final int MAX_QUEUE = 100;

    private final CurrentClinic current;
    private final VisitRepository visitRepository;
    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final ClinicZoneService zoneService;
    private final com.medmate.clinic.vital.VitalsRepository vitalsRepository;
    private final JdbcTemplate jdbc;

    public QueueController(
            CurrentClinic current,
            VisitRepository visitRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository,
            ClinicZoneService zoneService,
            com.medmate.clinic.vital.VitalsRepository vitalsRepository,
            JdbcTemplate jdbc) {
        this.current = current;
        this.visitRepository = visitRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
        this.zoneService = zoneService;
        this.vitalsRepository = vitalsRepository;
        this.jdbc = jdbc;
    }

    /**
     * The queue, as the console shows it.
     *
     * @param doctor the staff id of one doctor, whose queue is shown; without
     *     it, the clinic's whole queue is shown.
     */
    @GetMapping("/queue")
    public Map<String, Object> queue(@RequestParam(required = false) String doctor) {
        ClinicPrincipal principal = current.get();
        if (!principal.can("console")) {
            throw new ForbiddenException("You cannot open the Doctor Console.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());
        UUID doctorId = parseUuid(doctor);

        // The rows: the waiting visits, the ones being seen, and the ones seen
        // today. The filter and the cap are in the database.
        UUID consoleDoctor = doctorId != null ? doctorId : principal.staffIdAsUuid();
        List<Visit> visits = waitingVisits(clinicId, doctorId, consoleDoctor);

        // The people of the queue, the staff of the clinic and the readings
        // the nurse took: read once for the whole page, not once per row.
        Map<UUID, Patient> patients = patientsOf(clinicId, visits);
        Map<UUID, Staff> staff = staffOf(clinicId);
        Map<UUID, String> readings = vitalsOf(clinicId, visits);
        long waiting = waitingFor(clinicId);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Visit visit : visits) {
            Patient patient = patients.get(visit.getPatientId());
            if (patient == null) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("token", visit.getToken());
            item.put("kind", visit.getToken().startsWith("A") ? "A" : "B");
            item.put("patient", patient(patient));
            item.put("reason", visit.getReason());
            item.put("detail", visit.getDetail());
            item.put("wait", wait(visit));
            item.put("waiting", waiting);
            // The doctor the patient is waiting for, when one is named.
            item.put("doctorId", visit.getSeenBy() == null ? null : visit.getSeenBy().toString());
            item.put("doctorName", doctorName(visit, staff));
            // Where the patient is: waiting, or seen.
            item.put("status", visit.getStatus());
            // The reading the nurse took: the doctor reads it beside the
            // patient's name, and without it the line is blank.
            item.put("vitals", readings.get(visit.getId()));
            items.add(item);
        }

        // the doctor's own room — the console they work in, not the first
        // doctor in the clinic. It is the column on the staff row, and never
        // the speciality: a doctor sees patients in a room, and a speciality is
        // not a room.
        String room = staffRepository.findByClinicId(clinicId).stream()
                .filter(person -> principal.staffIdAsUuid().equals(person.getId()))
                .map(Staff::getRoom)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElse("");

        long seenToday = visitRepository.findByClinicIdAndCreatedAtBetweenOrderByCreatedAtAsc(
                        clinicId, startOfDay(), endOfDay())
                .stream()
                .filter(visit -> !"waiting".equals(visit.getStatus()))
                .count();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("next", items.isEmpty() ? null : items.get(0));
        body.put("room", room);
        // How long a consult takes, on average: the doctor at the console reads
        // it, and it is their own consultations that are counted.
        body.put("averageConsultMinutes", averageConsultMinutes(clinicId, principal.staffIdAsUuid()));
        body.put(
                "meta",
                (room.isEmpty() ? "" : room + " · ")
                        + items.size()
                        + " waiting · "
                        + seenToday
                        + " seen today");
        return body;
    }

    /**
     * The rows of the queue: who is waiting, who is in consult, and who has
     * been seen today.
     *
     * <p>The tabs of the console read the rows client-side, so every row
     * carries the state it is in: the waiting ones, the ones being seen, and
     * the ones seen today — the last of them only for the doctor at the
     * console.
     *
     * <p>A doctor filter narrows the rows to that doctor's own work, but the
     * waiting list stays clinic-wide: a patient who has not been called yet
     * is waiting for the clinic, not for one doctor, and a console that hid
     * them would show an empty waiting list while the desk showed a full one.
     *
     * <p>The filter and the cap are in the database: a clinic with a long day
     * behind it must not answer with every visit it ever had.
     */
    private List<Visit> waitingVisits(UUID clinicId, UUID doctorId, UUID consoleDoctor) {
        ZoneId zone = zoneOf();
        LocalDate today = LocalDate.now(zone);
        java.sql.Timestamp dayFrom =
                java.sql.Timestamp.from(today.atStartOfDay(zone).toInstant());
        java.sql.Timestamp dayTo =
                java.sql.Timestamp.from(today.plusDays(1).atStartOfDay(zone).toInstant());
        String seenToday =
                "(status in ('done', 'no_show') and seen_by = ? and created_at >= ? and created_at < ?)";
        String sql =
                doctorId == null
                        ? "select id from visits where clinic_id = ? "
                                + "and (status in ('waiting', 'in_consult') or "
                                + seenToday
                                + ") order by created_at asc limit ?"
                        : "select id from visits where clinic_id = ? "
                                + "and ((status = 'waiting' and seen_by is null) "
                                + "or (status in ('waiting', 'in_consult') and seen_by = ?) "
                                + "or ("
                                + seenToday
                                + ")) order by created_at asc limit ?";
        List<UUID> ids =
                doctorId == null
                        ? jdbc.query(
                                sql,
                                (rs, row) -> rs.getObject("id", UUID.class),
                                clinicId,
                                consoleDoctor,
                                dayFrom,
                                dayTo,
                                MAX_QUEUE)
                        : jdbc.query(
                                sql,
                                (rs, row) -> rs.getObject("id", UUID.class),
                                clinicId,
                                doctorId,
                                doctorId,
                                dayFrom,
                                dayTo,
                                MAX_QUEUE);
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, Visit> byId = new LinkedHashMap<>();
        for (Visit visit : visitRepository.findAllById(ids)) {
            byId.put(visit.getId(), visit);
        }
        List<Visit> ordered = new ArrayList<>();
        for (UUID id : ids) {
            Visit visit = byId.get(id);
            if (visit != null) {
                ordered.add(visit);
            }
        }
        return ordered;
    }

    /** The people of the queue, read once for the whole page. */
    private Map<UUID, Patient> patientsOf(UUID clinicId, List<Visit> visits) {
        Map<UUID, Patient> people = new LinkedHashMap<>();
        List<UUID> ids = new ArrayList<>();
        for (Visit visit : visits) {
            if (visit.getPatientId() != null && !people.containsKey(visit.getPatientId())) {
                ids.add(visit.getPatientId());
            }
        }
        if (ids.isEmpty()) {
            return people;
        }
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(clinicId);
        args.addAll(ids);
        for (Patient patient : patientRepository.findByClinicIdAndIdIn(clinicId, ids)) {
            people.put(patient.getId(), patient);
        }
        return people;
    }

    /** The staff of the clinic, read once for the whole page. */
    private Map<UUID, Staff> staffOf(UUID clinicId) {
        Map<UUID, Staff> staff = new LinkedHashMap<>();
        for (Staff person : staffRepository.findByClinicId(clinicId)) {
            staff.put(person.getId(), person);
        }
        return staff;
    }

    /** The latest reading of every visit on the bench, read once for the page. */
    private Map<UUID, String> vitalsOf(UUID clinicId, List<Visit> visits) {
        Map<UUID, String> readings = new LinkedHashMap<>();
        if (visits.isEmpty()) {
            return readings;
        }
        List<UUID> ids = new ArrayList<>();
        for (Visit visit : visits) {
            ids.add(visit.getId());
        }
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(clinicId);
        args.addAll(ids);
        jdbc.query(
                "select distinct on (visit_id) visit_id, temp_f, spo2 from vitals "
                        + "where clinic_id = ? and visit_id in ("
                        + placeholders
                        + ") order by visit_id, recorded_at desc",
                (rs, row) -> {
                    StringBuilder line = new StringBuilder();
                    java.math.BigDecimal temp = rs.getBigDecimal("temp_f");
                    Integer spo2 = rs.getObject("spo2", Integer.class);
                    if (temp != null) {
                        line.append("Temp ").append(temp.stripTrailingZeros().toPlainString()).append(" °F");
                    }
                    if (spo2 != null) {
                        if (line.length() > 0) {
                            line.append(" · ");
                        }
                        line.append("SpO₂ ").append(spo2).append("%");
                    }
                    readings.put(
                            rs.getObject("visit_id", UUID.class), line.length() == 0 ? null : line.toString());
                    return null;
                },
                args.toArray());
        return readings;
    }

    /** How many patients are waiting for a doctor to see them. */
    private long waitingFor(UUID clinicId) {
        Long count =
                jdbc.queryForObject(
                        "select count(*) from visits where clinic_id = ? and status = 'waiting' and seen_by is null",
                        Long.class,
                        clinicId);
        return count == null ? 0 : count;
    }

    /** How long a consult takes, on average, for the doctor at the console. */
    private int averageConsultMinutes(UUID clinicId, UUID staffId) {
        Double average =
                jdbc.queryForObject(
                        "select avg(consult_minutes) from visits where clinic_id = ? and seen_by = ? "
                                + "and consult_minutes is not null",
                        Double.class,
                        clinicId,
                        staffId);
        return average == null ? 0 : (int) Math.round(average);
    }

    /** The name of the doctor the patient is waiting for. */
    private String doctorName(Visit visit, Map<UUID, Staff> staff) {
        if (visit.getSeenBy() == null) {
            return null;
        }
        Staff doctor = staff.get(visit.getSeenBy());
        return doctor == null ? null : doctor.getFullName();
    }

    /** The start of the clinic's day. */
    private Instant startOfDay() {
        return LocalDate.now(zoneOf()).atStartOfDay(zoneOf()).toInstant();
    }

    /** The end of the clinic's day. */
    private Instant endOfDay() {
        return LocalDate.now(zoneOf()).plusDays(1).atStartOfDay(zoneOf()).toInstant();
    }

    /** The zone the clinic works in. */
    private ZoneId zoneOf() {
        return zoneService.zoneOf(UUID.fromString(current.get().clinicId()));
    }

    private Map<String, Object> patient(Patient patient) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("initials", initials(patient.getFullName()));
        body.put("phone", patient.getPhone());
        body.put("abha", patient.getAbha());
        body.put("allergies", patient.getAllergies());
        body.put("conditions", patient.getConditions());
        body.put("visits", 1);
        body.put("since", "2024");
        return body;
    }

    private String wait(Visit visit) {
        if ("urgent".equals(visit.getPriority())) {
            return "Urgent";
        }
        return "Waiting";
    }

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

    /** The id the caller sent, if it is one. */
    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException notAUuid) {
            return null;
        }
    }
}
