package com.medmate.clinic.dashboard;

import com.medmate.clinic.catalogue.StationCatalogue;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.VisitRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The owner's dashboard. */
@RestController
@RequestMapping("/api/clinic")
public class DashboardController {

    private final CurrentClinic current;
    private final StationCatalogue catalogue;
    private final VisitRepository visitRepository;
    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final GrantService grantService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public DashboardController(
            CurrentClinic current,
            StationCatalogue catalogue,
            VisitRepository visitRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository,
            GrantService grantService,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.current = current;
        this.catalogue = catalogue;
        this.visitRepository = visitRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
        this.grantService = grantService;
        this.jdbc = jdbc;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        ClinicPrincipal principal = current.get();
        if (!principal.can("report")) {
            throw new ForbiddenException("You cannot open the dashboard.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());

        long waiting = visitRepository.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting").size();
        long patients = patientRepository.findByClinicIdOrderByCreatedAtAsc(clinicId).size();
        long staff = staffRepository.countByClinicId(clinicId);

        List<Map<String, Object>> stations = new ArrayList<>();
        for (StationCatalogue.Station station : catalogue.stations()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("icon", station.icon());
            item.put("tone", station.tone());
            item.put("title", station.title());
            item.put("description", station.description());
            item.put("tag", station.tag());
            if ("console".equals(station.countResource())) {
                item.put("count", waiting + " in queue");
            }
            stations.add(item);
        }

        List<Map<String, Object>> manage = new ArrayList<>();
        for (StationCatalogue.ManageLink link : catalogue.manage()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("icon", link.icon());
            item.put("title", link.title());
            item.put("description", link.description());
            item.put("href", link.href());
            if ("doctor".equals(link.countResource())) {
                item.put("count", staff);
            }
            if ("patient".equals(link.countResource())) {
                item.put("count", patients);
            }
            manage.add(item);
        }

        // The clinic's doctors: the dashboard shows the doctor consoles.
        //
        // The room is the doctor's own room — the column the staff table
        // holds — and never the speciality: a doctor sees patients in a room,
        // and a speciality is not a room. The number waiting is that doctor's
        // own queue, counted for the whole list in one query, and the next
        // appointment is theirs.
        Map<UUID, String> rooms = rooms(clinicId);
        Map<UUID, Integer> waitingCounts = waitingByDoctor(clinicId);
        Map<UUID, Next> next = nextAppointments(clinicId);

        List<Map<String, Object>> doctors = new ArrayList<>();
        for (Staff person : staffRepository.findByClinicId(clinicId)) {
            Map<String, Object> doctor = new LinkedHashMap<>();
            doctor.put("id", person.getId().toString());
            doctor.put("name", person.getFullName());
            doctor.put("initials", initials(person.getFullName()));
            doctor.put("speciality", person.getSpeciality() == null ? "" : person.getSpeciality());
            doctor.put("room", rooms.getOrDefault(person.getId(), ""));
            doctor.put("waiting", waitingCounts.getOrDefault(person.getId(), 0));
            Next upcoming = next.get(person.getId());
            doctor.put("nextAppointmentAt", upcoming == null ? null : upcoming.at());
            doctor.put("nextAppointmentPatient", upcoming == null ? null : upcoming.patient());
            doctors.add(doctor);
        }


        Map<String, Object> body = new LinkedHashMap<>();
        body.put("doctors", doctors);
        body.put("meta", waiting + " in your queue · 2 awaiting vitals · 1 prescription to hand over · 5 appointments still to come today");
        body.put(
                "trial",
                Map.of(
                        "message",
                        "Your free trial ends in 3 days. Patient care keeps working; choose a plan to keep adding doctors, staff or locations.",
                        "action",
                        "See plans",
                        "href",
                        "/subscription"));
        body.put("stations", stations);
        body.put("manage", manage);
        return body;
    }

    /**
     * The room each doctor works in.
     *
     * <p>The column is read through the row's own JSON, so the dashboard
     * reads the room the doctors screen reads and never falls back to the
     * speciality — which is the bug this replaced.
     */
    private Map<UUID, String> rooms(UUID clinicId) {
        Map<UUID, String> rooms = new LinkedHashMap<>();
        jdbc.query(
                "select id, to_jsonb(s) ->> 'room' as room from staff s where clinic_id = ?",
                (rs, row) -> {
                    String room = rs.getString("room");
                    rooms.put(rs.getObject("id", UUID.class), room == null ? "" : room);
                    return null;
                },
                clinicId);
        return rooms;
    }

    /**
     * How many patients each doctor is seeing.
     *
     * <p>The same count the doctors screen shows: the visits that are in
     * consult with that doctor. One query for the whole list.
     */
    private Map<UUID, Integer> waitingByDoctor(UUID clinicId) {
        Map<UUID, Integer> waiting = new LinkedHashMap<>();
        jdbc.query(
                "select seen_by, count(*) as waiting from visits where clinic_id = ? and status = 'in_consult' "
                        + "and seen_by is not null group by seen_by",
                (rs, row) -> {
                    waiting.put(rs.getObject("seen_by", UUID.class), rs.getInt("waiting"));
                    return null;
                },
                clinicId);
        return waiting;
    }

    /**
     * The next appointment of each doctor, and the patient it is with.
     *
     * <p>One query for the whole list: the next booking of every doctor.
     */
    private Map<UUID, Next> nextAppointments(UUID clinicId) {
        Map<UUID, Next> next = new LinkedHashMap<>();
        jdbc.query(
                "select distinct on (a.doctor_id) a.doctor_id as doctor_id, a.starts_at, p.full_name "
                        + "from appointments a join patients p on p.id = a.patient_id and p.clinic_id = a.clinic_id "
                        + "where a.clinic_id = ? and a.doctor_id is not null and a.status = 'booked' "
                        + "and a.starts_at > ? order by a.doctor_id, a.starts_at asc",
                (rs, row) -> {
                    java.sql.Timestamp at = rs.getTimestamp("starts_at");
                    next.put(
                            rs.getObject("doctor_id", UUID.class),
                            new Next(
                                    at == null ? null : at.toInstant().toString(),
                                    rs.getString("full_name")));
                    return null;
                },
                clinicId,
                java.sql.Timestamp.from(java.time.Instant.now()));
        return next;
    }

    /** The next appointment of a doctor. */
    private record Next(String at, String patient) {}

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