package com.medmate.clinic.teleconsult;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
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
 * The video consultation.
 *
 * <p>Patients wait on their own page. The doctor sees who is waiting, what
 * they came for, and whether they are on the call or are still to be sent the
 * link. The consent lines are shown before the call, so the doctor knows what
 * was agreed.
 */
@Service
public class TeleconsultService {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

    private final VisitRepository visits;
    private final PatientRepository patients;

    public TeleconsultService(VisitRepository visits, PatientRepository patients) {
        this.visits = visits;
        this.patients = patients;
    }

    /** Who is waiting, and the consent that was given. */
    @Transactional(readOnly = true)
    public Map<String, Object> waiting(ClinicPrincipal principal) {
        if (!principal.can("tele")) {
            throw new ForbiddenException("You cannot open the teleconsult.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = ZoneId.of("Asia/Kolkata");

        List<Map<String, Object>> waiting = new ArrayList<>();
        for (Visit visit : visits.findByClinicIdAndModeOrderByCreatedAtAsc(clinicId, "online")) {
            if (!"waiting".equals(visit.getStatus()) && !"in_consult".equals(visit.getStatus())) {
                continue;
            }
            Patient patient = patients.findByIdAndClinicId(visit.getPatientId(), clinicId).orElse(null);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("patient", patient(patient));
            item.put(
                    "booked",
                    visit.getCreatedAt() == null ? "" : "Booked " + CLOCK.format(visit.getCreatedAt().atZone(zone)));
            item.put("reason", visit.getReason() == null ? "" : visit.getReason());
            item.put("state", "in_consult".equals(visit.getStatus()) ? "Joined" : "Link sent");
            waiting.add(item);
        }

        List<Map<String, Object>> consent = new ArrayList<>();
        consent.add(consent("Patient identified", "Name, age and mobile confirmed on call"));
        consent.add(consent("Consent", "The patient agreed to the video consultation"));
        consent.add(
                consent(
                        "Mode",
                        "Video · first consult · List A and O medicines allowed"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("waiting", waiting);
        body.put("consent", consent);
        body.put(
                "meta",
                "Patients wait on their own page. Start the call when they are online, and switch to a phone call if video fails.");
        return body;
    }

    /** One consent line. */
    private static Map<String, Object> consent(String label, String detail) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("label", label);
        body.put("detail", detail);
        return body;
    }

    /** The patient, as the teleconsult sends them. */
    private Map<String, Object> patient(Patient patient) {
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
        body.put("visits", 0);
        body.put("since", "");
        return body;
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
