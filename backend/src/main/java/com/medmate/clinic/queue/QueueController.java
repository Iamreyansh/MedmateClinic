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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The doctor's queue. */
@RestController
@RequestMapping("/api/clinic")
public class QueueController {

    private final CurrentClinic current;
    private final VisitRepository visitRepository;
    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final ClinicZoneService zoneService;
    private final com.medmate.clinic.vital.VitalsRepository vitalsRepository;

    public QueueController(
            CurrentClinic current,
            VisitRepository visitRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository,
            ClinicZoneService zoneService,
            com.medmate.clinic.vital.VitalsRepository vitalsRepository) {
        this.current = current;
        this.visitRepository = visitRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
        this.zoneService = zoneService;
        this.vitalsRepository = vitalsRepository;
    }

    @GetMapping("/queue")
    public Map<String, Object> queue() {
        ClinicPrincipal principal = current.get();
        if (!principal.can("console")) {
            throw new ForbiddenException("You cannot open the Doctor Console.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());

        List<Visit> visits = visitRepository.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting");
        Map<UUID, Patient> patients = new LinkedHashMap<>();
        for (Patient patient : patientRepository.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            patients.put(patient.getId(), patient);
        }

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
            item.put("waiting", waitingFor(visit, clinicId));
            // The reading the nurse took: the doctor reads it beside the
            // patient's name, and without it the line is blank.
            item.put("vitals", vitalsFor(visit, clinicId));
            items.add(item);
        }

        // the doctor's own speciality — the console they work in, not the first
        // doctor in the clinic
        String room = staffRepository.findByClinicId(clinicId).stream()
                .filter(person -> principal.staffIdAsUuid().equals(person.getId()))
                .map(Staff::getSpeciality)
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
     * The patient's last reading, as the queue shows it.
     *
     * <p>A line of text, the way the doctor reads it at the desk: the
     * temperature and the saturation, and nothing else.
     */
    private String vitalsFor(Visit visit, UUID clinicId) {
        com.medmate.clinic.vital.Vitals reading =
                vitalsRepository
                        .findFirstByClinicIdAndVisitIdOrderByRecordedAtDesc(clinicId, visit.getId())
                        .orElse(null);
        if (reading == null) {
            return null;
        }
        StringBuilder line = new StringBuilder();
        if (reading.getTempF() != null) {
            line.append(
                    "Temp "
                            + reading.getTempF().stripTrailingZeros().toPlainString()
                            + " °F");
        }
        if (reading.getSpo2() != null) {
            if (line.length() > 0) {
                line.append(" · ");
            }
            line.append("SpO₂ ").append(reading.getSpo2()).append("%");
        }
        return line.length() == 0 ? null : line.toString();
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

    private long waitingFor(Visit visit, UUID clinicId) {
        return visitRepository.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting").stream()
                .filter(v -> v.getSeenBy() == null)
                .count();
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
}
