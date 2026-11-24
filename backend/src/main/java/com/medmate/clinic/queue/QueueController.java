package com.medmate.clinic.queue;

import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
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

    public QueueController(
            CurrentClinic current,
            VisitRepository visitRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository) {
        this.current = current;
        this.visitRepository = visitRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
    }

    @GetMapping("/queue")
    public Map<String, Object> queue() {
        ClinicPrincipal principal = current.get();
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
            items.add(item);
        }

        String room = staffRepository.findByClinicId(clinicId).stream()
                .filter(staff -> staff.getSpeciality() != null)
                .findFirst()
                .map(Staff::getSpeciality)
                .orElse("");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("next", items.isEmpty() ? null : items.get(0));
        body.put("room", room);
        body.put("meta", "Room " + (room.isEmpty() ? "1" : "1") + " · " + items.size() + " waiting · 9 seen today · average consult 8 min");
        return body;
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
