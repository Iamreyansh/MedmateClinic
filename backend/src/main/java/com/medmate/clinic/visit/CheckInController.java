package com.medmate.clinic.visit;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Checking a patient in at the counter.
 *
 * <p>A walk-in becomes a patient and a visit: the patient is added if they are
 * not on the list already, and the visit goes into the queue with a token. The
 * kiosk does the same thing, so the two cannot drift apart.
 */
@RestController
@RequestMapping("/api/clinic")
public class CheckInController {

    private final CurrentClinic current;
    private final PatientRepository patientRepository;
    private final VisitRepository visitRepository;
    private final StaffRepository staffRepository;
    private final RoleRepository roleRepository;

    public CheckInController(
            CurrentClinic current,
            PatientRepository patientRepository,
            VisitRepository visitRepository,
            StaffRepository staffRepository,
            RoleRepository roleRepository) {
        this.current = current;
        this.patientRepository = patientRepository;
        this.visitRepository = visitRepository;
        this.staffRepository = staffRepository;
        this.roleRepository = roleRepository;
    }

    /** The doctors a patient can be sent to. */
    @GetMapping("/doctors")
    public List<Map<String, Object>> doctors() {
        ClinicPrincipal principal = current.get();
        if (!principal.can("console") && !principal.can("desk")) {
            throw new ForbiddenException("You cannot see the clinic's doctors.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());

        // A doctor is a member of the clinic whose role is "doctor".
        java.util.Set<UUID> doctorRoles = roleRepository.findAll().stream()
                .filter(role -> role.getClinicId() == null || role.getClinicId().equals(clinicId))
                .filter(role -> "doctor".equalsIgnoreCase(role.getName()))
                .map(Role::getId)
                .collect(java.util.stream.Collectors.toSet());

        List<Map<String, Object>> doctors = new ArrayList<>();
        for (Staff person : staffRepository.findByClinicId(clinicId)) {
            if (!doctorRoles.contains(person.getRoleId())) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", person.getId().toString());
            item.put("name", person.getFullName());
            item.put("speciality", person.getSpeciality());
            item.put("room", person.getSpeciality());
            doctors.add(item);
        }
        return doctors;
    }

    /** Check a patient in. */
    @PostMapping("/check-ins")
    public Map<String, Object> checkIn(@Valid @RequestBody CheckInRequest request) {
        ClinicPrincipal principal = current.get();
        if (!principal.can("console") && !principal.can("desk")) {
            throw new ForbiddenException("You cannot check a patient in.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());

        String name = request.name().trim();
        if (name.length() < 2) {
            throw new IllegalArgumentException("A name is needed to check a patient in.");
        }

        // A patient who is already on the list is not added twice — the visit
        // is joined to the record that already exists.
        Patient patient = patientRepository.findByClinicIdOrderByCreatedAtAsc(clinicId).stream()
                .filter(candidate -> candidate.getFullName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Patient created = new Patient();
                    created.setId(UUID.randomUUID());
                    created.setClinicId(clinicId);
                    created.setFullName(name);
                    created.setAge(request.age() == null ? 0 : request.age());
                    created.setSex(request.sex() == null ? "F" : request.sex());
                    created.setPhone(request.phone() == null ? "" : request.phone());
                    created.setAbha("");
                    created.setAllergies(new String[0]);
                    created.setConditions(new String[0]);
                    created.setCreatedAt(Instant.now());
                    return patientRepository.save(created);
                });

        String token = nextToken(clinicId);

        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setClinicId(clinicId);
        visit.setPatientId(patient.getId());
        visit.setToken(token);
        visit.setStatus("waiting");
        visit.setMode("online".equals(request.mode()) ? "online" : "in_clinic");
        visit.setSource("walk_in");
        visit.setReason(request.reason() == null ? "Walk-in" : request.reason());
        visit.setCreatedAt(Instant.now());
        visitRepository.save(visit);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visit", visit(visit));
        body.put("token", token);
        body.put("patient", patient(patient));
        body.put("doctor", request.doctor() == null ? signedInName(clinicId) : request.doctor());
        return body;
    }

    /** The name of the person who is signed in. */
    private String signedInName(UUID clinicId) {
        return staffRepository.findByClinicId(clinicId).stream()
                .filter(person -> person.getId().toString().equals(current.get().staffId()))
                .map(Staff::getFullName)
                .findFirst()
                .orElse("");
    }

    /** The next token for the day: the highest so far, plus one. */
    private String nextToken(UUID clinicId) {
        int highest = visitRepository.findByClinicIdOrderByCreatedAtAsc(clinicId).stream()
                .map(visit -> visit.getToken())
                .filter(token -> token != null && token.matches("^[A-Z]-\\d+$"))
                .mapToInt(token -> Integer.parseInt(token.substring(2)))
                .max()
                .orElse(14);
        return String.format("A-%03d", highest + 1);
    }

    private Map<String, Object> visit(Visit visit) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", visit.getId().toString());
        body.put("token", visit.getToken());
        body.put("status", visit.getStatus());
        body.put("reason", visit.getReason());
        return body;
    }

    private Map<String, Object> patient(Patient patient) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("phone", patient.getPhone());
        return body;
    }

    /** What the front desk types. */
    public record CheckInRequest(
            @NotBlank String name,
            Integer age,
            String sex,
            String phone,
            String reason,
            String mode,
            String doctor) {}
}
