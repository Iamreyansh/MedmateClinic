package com.medmate.clinic.nurse;

import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import com.medmate.clinic.vital.Vitals;
import com.medmate.clinic.vital.VitalsRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The nurse station.
 *
 * <p>The nurse is the one station that reads the whole clinic's queue rather
 * than one doctor's, so the nurse sees every patient who needs them. The vitals
 * the nurse records move the patient on — they appear in the doctor's queue
 * as ready.
 *
 * <p>The four numbers at the top are counted from the clinic's own visits, so
 * they move the moment a patient is checked in or a nurse finishes.
 */
@Service
public class NurseService {

    private final VisitRepository visits;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final VitalsRepository vitals;
    private final ClinicZoneService zones;

    public NurseService(
            VisitRepository visits,
            PatientRepository patients,
            StaffRepository staff,
            VitalsRepository vitals,
            ClinicZoneService zones) {
        this.visits = visits;
        this.patients = patients;
        this.staff = staff;
        this.vitals = vitals;
        this.zones = zones;
    }

    /** The station: everyone in the clinic today, and where they are. */
    @Transactional(readOnly = true)
    public Map<String, Object> station(ClinicPrincipal principal) {
        if (!principal.can("nurse")) {
            throw new ForbiddenException("You cannot open the Nurse Station.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        Map<UUID, Patient> people = new LinkedHashMap<>();
        for (Patient patient : patients.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            people.put(patient.getId(), patient);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Visit visit : visits.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            if (!"waiting".equals(visit.getStatus()) && !"in_consult".equals(visit.getStatus())) {
                continue;
            }
            Patient patient = people.get(visit.getPatientId());
            if (patient == null) {
                continue;
            }
            Vitals reading = vitals
                    .findFirstByClinicIdAndVisitIdOrderByRecordedAtDesc(clinicId, visit.getId())
                    .orElse(null);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", visit.getId().toString());
            item.put("visitId", visit.getId().toString());
            item.put("token", visit.getToken());
            item.put("reason", visit.getReason());
            item.put("detail", visit.getDetail());
            item.put("priority", priorityOf(visit.getPriority()));
            item.put("waitedMinutes", waitedMinutes(visit));
            item.put("doctor", null);
            item.put("nextDoctor", nextDoctor(clinicId));
            item.put("patient", patient(patient));
            item.put("vitals", vitals(reading));
            item.put("ready", reading != null);
            items.add(item);
        }

        int needVitals = 0;
        int urgent = 0;
        int ready = 0;
        int longestWait = 0;
        for (Map<String, Object> item : items) {
            if (Boolean.TRUE.equals(item.get("ready"))) {
                ready++;
            } else {
                needVitals++;
                longestWait = Math.max(longestWait, (Integer) item.get("waitedMinutes"));
            }
            if (!"normal".equals(item.get("priority"))) {
                urgent++;
            }
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("needVitals", needVitals);
        counts.put("urgent", urgent);
        counts.put("ready", ready);
        counts.put("longestWait", needVitals == 0 ? null : longestWait);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        body.put("items", items);
        body.put("doctors", doctors(clinicId));
        body.put("meta", needVitals + " waiting for vitals · " + ready + " ready for the doctor");
        return body;
    }

    /** The doctors a patient can be sent to. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> doctors(UUID clinicId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", person.getId().toString());
            body.put("name", person.getFullName());
            body.put("speciality", person.getSpeciality());
            // The rooms belong to the branches, which the service does not have
            // yet — the nurse names the doctor, and the room is on the consult.
            body.put("room", null);
            list.add(body);
        }
        return list;
    }

    /** The next doctor with free time, so the nurse has a default. */
    private Map<String, Object> nextDoctor(UUID clinicId) {
        List<Map<String, Object>> list = doctors(clinicId);
        return list.isEmpty() ? null : list.get(0);
    }

    /** Record the vitals and send the patient to the doctor. */
    @Transactional
    public Map<String, Object> record(ClinicPrincipal principal, Map<String, Object> request) {
        if (!principal.can("nurse")) {
            throw new ForbiddenException("You cannot open the Nurse Station.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        String visitId = String.valueOf(request.getOrDefault("visitId", ""));
        Visit visit = visits.findByIdAndClinicId(UUID.fromString(visitId), clinicId)
                .orElseThrow(() -> new NotFoundException("That patient is no longer waiting."));

        Vitals reading = new Vitals();
        reading.setId(UUID.randomUUID());
        reading.setClinicId(clinicId);
        reading.setPatientId(visit.getPatientId());
        reading.setVisitId(visit.getId());
        reading.setRecordedBy(principal.staffIdAsUuid());
        reading.setRecordedAt(Instant.now());
        reading.setTempF(decimal(request.get("tempF")));
        reading.setPulse(integer(request.get("pulse")));
        reading.setSpo2(integer(request.get("spo2")));
        reading.setBpSystolic(integer(request.get("bpSystolic")));
        reading.setBpDiastolic(integer(request.get("bpDiastolic")));
        reading.setBreathRate(integer(request.get("breathRate")));
        reading.setWeightKg(decimal(request.get("weightKg")));
        reading.setHeightCm(decimal(request.get("heightCm")));
        reading.setSugarMg(integer(request.get("sugarMg")));
        reading.setNote(text(request.get("note")));
        reading.setPriority(String.valueOf(request.getOrDefault("priority", "normal")));
        reading.setSentTo(uuid(request.get("sentTo")));

        vitals.save(reading);

        // The patient is ready for the doctor now.
        visit.setPriority(reading.getPriority());
        if (reading.getTempF() != null) {
            visit.setDetail("Temp " + reading.getTempF().stripTrailingZeros().toPlainString()
                    + " °F · SpO₂ " + (reading.getSpo2() == null ? "—" : reading.getSpo2()) + "%");
        }
        visits.save(visit);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visitId", visit.getId().toString());
        body.put("token", visit.getToken());
        body.put("patient", patients.findByIdAndClinicId(visit.getPatientId(), clinicId)
                .map(Patient::getFullName)
                .orElse(""));
        body.put("vitals", vitals(reading));
        body.put("ready", true);
        return body;
    }

    /** The vitals as the station sends them. */
    private Map<String, Object> vitals(Vitals reading) {
        if (reading == null) {
            return null;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", reading.getId().toString());
        body.put("visitId", reading.getVisitId().toString());
        body.put("recordedAt", reading.getRecordedAt());
        body.put("tempF", reading.getTempF());
        body.put("bp", reading.getBpSystolic() == null || reading.getBpDiastolic() == null
                ? null
                : reading.getBpSystolic() + "/" + reading.getBpDiastolic());
        body.put("bpSystolic", reading.getBpSystolic());
        body.put("bpDiastolic", reading.getBpDiastolic());
        body.put("pulse", reading.getPulse());
        body.put("spo2", reading.getSpo2());
        body.put("breathRate", reading.getBreathRate());
        body.put("weightKg", reading.getWeightKg());
        body.put("heightCm", reading.getHeightCm());
        body.put("sugarMg", reading.getSugarMg());
        body.put("note", reading.getNote());
        body.put("priority", priorityOf(reading.getPriority()));
        body.put("sentTo", reading.getSentTo());
        body.put("recordedBy", null);
        return body;
    }

    /** The patient, as the station sends them. */
    private Map<String, Object> patient(Patient patient) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("initials", initials(patient.getFullName()));
        body.put("phone", patient.getPhone());
        return body;
    }

    /** The visit's priority, as the station shows it. */
    private String priorityOf(String priority) {
        if ("emergency".equals(priority)) {
            return "emergency";
        }
        if ("urgent".equals(priority)) {
            return "urgent";
        }
        return "normal";
    }

    /** How long the patient has been waiting, in minutes. */
    private int waitedMinutes(Visit visit) {
        if (visit.getWaitedMinutes() != null) {
            return visit.getWaitedMinutes();
        }
        long minutes = java.time.Duration.between(visit.getCreatedAt(), Instant.now()).toMinutes();
        return (int) Math.max(0, minutes);
    }

    /** The number the nurse typed, as an integer. */
    private Integer integer(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** The number the nurse typed, as a decimal. */
    private java.math.BigDecimal decimal(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        try {
            return new java.math.BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** The text the nurse typed, if any. */
    private String text(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? null : text;
    }

    /** The id the nurse chose, if any. */
    private UUID uuid(Object value) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        try {
            return UUID.fromString(text);
        } catch (IllegalArgumentException e) {
            return null;
        }
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
