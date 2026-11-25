package com.medmate.clinic.patientweb;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
import com.medmate.clinic.clinic.ClinicProfile;
import com.medmate.clinic.clinic.ClinicProfileRepository;
import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.LinkKeys;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.prescription.Prescription;
import com.medmate.clinic.prescription.PrescriptionDiagnosis;
import com.medmate.clinic.prescription.PrescriptionDiagnosisRepository;
import com.medmate.clinic.prescription.PrescriptionMedicine;
import com.medmate.clinic.prescription.PrescriptionMedicineRepository;
import com.medmate.clinic.prescription.PrescriptionRepository;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.PublicLink;
import com.medmate.clinic.tenancy.PublicLinkRepository;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import com.medmate.clinic.visitintake.VisitIntake;
import com.medmate.clinic.visitintake.VisitIntakeRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The patient-facing surfaces.
 *
 * <p>A patient opens these on their phone, from the clinic's booking link or
 * from an SMS. They have no session, so the clinic is found from the slug or
 * from the link the clinic recorded.
 *
 * <p>What the patient books is the clinic's own work: the booking becomes a
 * visit and an appointment, so the patient appears in the doctor's queue and
 * on the front desk's screen without anyone typing anything twice.
 */
@Service
public class PatientWebService {

    /** The hours the clinic sees patients. */
    private static final String[] HOURS = {"09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "16:00", "16:30"};

    /** How long a patient's own link lives. */
    private static final Duration LINK_LIFE = Duration.ofDays(30);

    /** How long a verification link lives. */
    private static final Duration VERIFY_LIFE = Duration.ofDays(365);

    private final RegistryClinicRepository clinics;
    private final PublicLinkRepository links;
    private final VisitRepository visits;
    private final VisitIntakeRepository intakes;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final AppointmentRepository appointments;
    private final PrescriptionRepository prescriptions;
    private final PrescriptionDiagnosisRepository prescriptionDiagnoses;
    private final PrescriptionMedicineRepository prescriptionMedicines;
    private final ClinicZoneService zones;
    private final ClinicProfileRepository profiles;

    public PatientWebService(
            RegistryClinicRepository clinics,
            PublicLinkRepository links,
            VisitRepository visits,
            VisitIntakeRepository intakes,
            PatientRepository patients,
            StaffRepository staff,
            AppointmentRepository appointments,
            PrescriptionRepository prescriptions,
            PrescriptionDiagnosisRepository prescriptionDiagnoses,
            PrescriptionMedicineRepository prescriptionMedicines,
            ClinicZoneService zones,
            ClinicProfileRepository profiles) {
        this.clinics = clinics;
        this.profiles = profiles;
        this.links = links;
        this.visits = visits;
        this.intakes = intakes;
        this.patients = patients;
        this.staff = staff;
        this.appointments = appointments;
        this.prescriptions = prescriptions;
        this.prescriptionDiagnoses = prescriptionDiagnoses;
        this.prescriptionMedicines = prescriptionMedicines;
        this.zones = zones;
    }

    /** The booking page: the clinic, its doctors and the times. */
    @Transactional(readOnly = true)
    public Map<String, Object> bookingPage(String slug) {
        RegistryClinic clinic = clinicBySlug(slug);
        UUID clinicId = clinic.getId();
        ZoneId zone = zones.zoneOf(clinicId);

        List<Map<String, Object>> list = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", person.getId().toString());
            body.put("name", person.getFullName());
            body.put("speciality", person.getSpeciality());
            body.put("feeInClinic", feeFor(clinicId, person));
            body.put("feeOnline", feeFor(clinicId, person).subtract(new BigDecimal("100")));
            body.put("room", person.getSpeciality());
            list.add(body);
        }

        String firstDoctor = list.isEmpty() ? "" : String.valueOf(list.get(0).get("id"));
        LocalDate day = LocalDate.now(zone).plusDays(1);
        List<Map<String, Object>> slots = slots(clinicId, firstDoctor, day, zone);

        Map<String, Object> clinicBody = new LinkedHashMap<>();
        clinicBody.put("name", clinic.getName());
        clinicBody.put("city", clinicCity(clinicId));
        clinicBody.put("address", clinicAddress(clinicId));
        clinicBody.put("phone", clinicPhone(clinicId));
        clinicBody.put("slug", slug);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("clinic", clinicBody);
        body.put("doctors", list);
        body.put("slots", slots);
        body.put("day", day.toString());
        body.put("nextFree", nextFree(slots));
        return body;
    }

    /** Book the visit. The patient gets a token and two links to keep. */
    @Transactional
    public Map<String, Object> book(
            String slug, Map<String, Object> request, String idempotencyKey) {
        RegistryClinic clinic = clinicBySlug(slug);
        UUID clinicId = clinic.getId();

        String name = String.valueOf(request.getOrDefault("name", "")).trim();
        String phone = digitsOf(request.get("phone"));
        if (name.isEmpty()) {
            throw new NotFoundException("Enter the patient's name.");
        }
        if (phone.length() != 10) {
            throw new NotFoundException("Enter a 10-digit mobile number.");
        }

        // A repeated submission opens the visit it opened the first time.
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PublicLink> existing = links.findByClinicIdAndIdempotencyKey(clinicId, idempotencyKey);
            if (existing.isPresent()) {
                return bookingResult(clinic, existing.get());
            }
        }

        String doctorId = String.valueOf(request.getOrDefault("doctorId", ""));
        Staff doctor = staff.findByIdAndClinicId(parseUuid(doctorId), clinicId).orElse(null);
        if (doctor == null) {
            throw new NotFoundException("Choose a doctor to continue.");
        }

        ZoneId zone = zones.zoneOf(clinicId);
        Instant startsAt = requestedStart(request.get("startsAt"), zone);

        // the clinic has met this patient before — the record is theirs. The
        // match is on the number and on the number only: the patient's record
        // is not joined to a stranger who happens to know their mobile number.
        Patient person = patients.findFirstByClinicIdAndPhoneDigits(clinicId, phone).orElse(null);
        if (person == null) {
            person = new Patient();
            person.setId(UUID.randomUUID());
            person.setClinicId(clinicId);
            person.setFullName(name);
            person.setAge(parseAge(request.get("age")));
            person.setSex(String.valueOf(request.getOrDefault("sex", "F")));
            person.setPhone(phone);
            person.setPhoneDigits(phone);
            person.setAbha("");
            person.setAllergies(new String[0]);
            person.setConditions(new String[0]);
            person.setCreatedAt(Instant.now());
            patients.save(person);
        }

        // the token the next in the series
        String queueToken = nextToken(clinicId);

        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setClinicId(clinicId);
        visit.setPatientId(person.getId());
        visit.setToken(queueToken);
        visit.setStatus("waiting");
        visit.setMode("in_clinic");
        visit.setSource("booking");
        visit.setReason(String.valueOf(request.getOrDefault("reason", "")));
        visit.setCreatedAt(Instant.now());
        visits.save(visit);

        Appointment appointment = new Appointment();
        appointment.setId(UUID.randomUUID());
        appointment.setClinicId(clinicId);
        appointment.setPatientId(person.getId());
        appointment.setDoctorId(doctor.getId());
        appointment.setVisitId(visit.getId());
        appointment.setStartsAt(startsAt);
        appointment.setEndsAt(startsAt.plusSeconds(900));
        appointment.setMode("in_clinic");
        appointment.setStatus("booked");
        appointment.setSource("booking");
        appointment.setReason(String.valueOf(request.getOrDefault("reason", "")));
        // The appointment table's created_at has a default, but the column is
        // mapped, so Hibernate writes the value it holds — and a null there
        // defeats the default and the insert fails. It is set here, every time.
        appointment.setCreatedAt(Instant.now());
        appointments.save(appointment);

        // The patient's own link, and the clinic it points at. The key is
        // random: it opens the patient's record, so it cannot be counted to.
        PublicLink link = new PublicLink();
        link.setLinkKey(LinkKeys.newKey());
        link.setClinicId(clinicId);
        link.setKind(PublicLink.KIND_BOOKING);
        link.setVisitId(visit.getId());
        link.setExpiresAt(Instant.now().plus(LINK_LIFE));
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            link.setIdempotencyKey(idempotencyKey);
        }
        links.save(link);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", link.getLinkKey());
        body.put("queueToken", queueToken);
        body.put("liveUrl", "/t/" + link.getLinkKey());
        body.put("intakeUrl", "/intake/" + link.getLinkKey());
        body.put("startsAt", startsAt.toString());
        body.put("doctor", doctor.getFullName());
        body.put("clinic", clinic.getName());
        return body;
    }

    /** The patient's place in the queue. */
    @Transactional
    public Map<String, Object> liveToken(String linkKey) {
        PublicLink link = liveLink(linkKey);
        Visit visit = visitForLink(link);
        Patient person = patients.findByIdAndClinicId(visit.getPatientId(), visit.getClinicId()).orElse(null);
        Appointment appointment = appointmentFor(visit);

        Staff doctor =
                appointment == null
                        ? null
                        : staff.findByIdAndClinicId(appointment.getDoctorId(), visit.getClinicId())
                                .orElse(null);

        // The queue the patient is in. Every waiting visit counts, not only the
        // ones whose token starts with a letter: a patient in another series
        // is not always first.
        List<Visit> queue = new ArrayList<>();
        for (Visit entry :
                visits.findByClinicIdAndStatusOrderByCreatedAtAsc(visit.getClinicId(), "waiting")) {
            if (entry.getToken() != null && !entry.getToken().isBlank()) {
                queue.add(entry);
            }
        }
        int position = 1;
        for (int index = 0; index < queue.size(); index++) {
            if (queue.get(index).getId().equals(visit.getId())) {
                position = index + 1;
                break;
            }
        }

        link.setUsedAt(Instant.now());
        links.save(link);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", visit.getToken());
        body.put("patient", person == null ? "" : person.getFullName());
        body.put("position", position);
        body.put("ahead", Math.max(0, position - 1));
        body.put("room", doctor == null ? null : doctor.getSpeciality());
        body.put("doctor", doctor == null ? "" : doctor.getFullName());
        body.put("due", 500);
        body.put("prescriptionUrl", prescriptionUrlFor(visit));
        body.put("called", "in_consult".equals(visit.getStatus()));
        body.put("updatedAt", Instant.now().toString());
        return body;
    }

    /** The symptoms form, before the visit. */
    @Transactional(readOnly = true)
    public Map<String, Object> intake(String linkKey) {
        PublicLink link = liveLink(linkKey);
        Visit visit = visitForLink(link);
        Patient person = patients.findByIdAndClinicId(visit.getPatientId(), visit.getClinicId()).orElse(null);

        VisitIntake form =
                intakes.findFirstByClinicIdAndVisitIdOrderBySubmittedAtDesc(
                                visit.getClinicId(), visit.getId())
                        .orElse(null);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", person == null ? "" : person.getFullName());
        body.put("filled", form != null);
        body.put("symptoms", form == null ? new ArrayList<String>() : Arrays.asList(form.getSymptoms()));
        body.put("redFlags", form == null ? new ArrayList<String>() : Arrays.asList(form.getRedFlags()));
        body.put("notes", form == null ? "" : nullToEmpty(form.getNotes()));
        body.put("duration", form == null ? "" : nullToEmpty(form.getDuration()));
        body.put("open", true);
        return body;
    }

    /** Send the symptoms form in. */
    @Transactional
    public Map<String, Object> submitIntake(String linkKey, Map<String, Object> request) {
        PublicLink link = liveLink(linkKey);
        Visit visit = visitForLink(link);

        List<String> symptoms = stringsOf(request.get("symptoms"));
        List<String> redFlags = stringsOf(request.get("redFlags"));
        String notes = textOf(request.get("notes"));
        String duration = textOf(request.get("duration"));

        VisitIntake form = new VisitIntake();
        form.setId(UUID.randomUUID());
        form.setClinicId(visit.getClinicId());
        form.setVisitId(visit.getId());
        form.setPatientId(visit.getPatientId());
        form.setSymptoms(symptoms.toArray(new String[0]));
        form.setRedFlags(redFlags.toArray(new String[0]));
        form.setNotes(notes);
        form.setDuration(duration);
        form.setSubmittedAt(Instant.now());
        intakes.save(form);

        // The doctor reads what the patient wrote. The reason the patient gave
        // at the desk is kept alongside it.
        if (notes != null && !notes.isBlank()) {
            visit.setReason(notes);
            visits.save(visit);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", visit.getToken());
        body.put("filled", true);
        body.put("submittedAt", Instant.now().toString());
        return body;
    }

    /** The prescription, as the patient verifies it. */
    @Transactional(readOnly = true)
    public Map<String, Object> verify(String id, String hash) {
        String key = id == null ? "" : id.trim();
        if (key.startsWith("rx_")) {
            key = key.substring(3);
        }
        UUID prescriptionId = parseUuid(key);
        if (prescriptionId == null) {
            throw new NotFoundException("No matching prescription");
        }

        // The link says which clinic the prescription belongs to. The
        // prescription alone does not, because a patient has no session.
        PublicLink link =
                links.findByLinkKeyAndKind(key, PublicLink.KIND_VERIFY)
                        .orElseThrow(() -> new NotFoundException("No matching prescription"));
        if (!link.isLive(Instant.now())) {
            throw new NotFoundException("This link is not valid. Ask the clinic for a new one.");
        }

        Prescription prescription =
                prescriptions.findByIdAndClinicId(prescriptionId, link.getClinicId())
                        .orElseThrow(() -> new NotFoundException("No matching prescription"));

        Patient person =
                patients.findByIdAndClinicId(prescription.getPatientId(), prescription.getClinicId())
                        .orElse(null);
        Staff doctor =
                staff.findByIdAndClinicId(prescription.getSignedBy(), prescription.getClinicId())
                        .orElse(null);

        Map<String, Object> doctorBody = new LinkedHashMap<>();
        doctorBody.put("name", doctor == null ? "" : doctor.getFullName());
        doctorBody.put("registration", doctor == null ? "" : doctor.getRegistration());
        doctorBody.put("speciality", doctor == null ? "" : doctor.getSpeciality());

        Map<String, Object> patientBody = new LinkedHashMap<>();
        patientBody.put("name", person == null ? "" : person.getFullName());
        patientBody.put("age", person == null ? 0 : person.getAge());
        patientBody.put("sex", person == null ? "" : person.getSex());

        // the lines of the prescription, as the doctor wrote them
        List<Map<String, Object>> diagnosisLines = new ArrayList<>();
        for (PrescriptionDiagnosis diagnosis :
                prescriptionDiagnoses.findByPrescriptionIdOrderBySortOrder(prescription.getId())) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("code", diagnosis.getIcdCode());
            line.put("label", diagnosis.getLabel());
            diagnosisLines.add(line);
        }

        List<Map<String, Object>> medicineLines = new ArrayList<>();
        for (PrescriptionMedicine medicine :
                prescriptionMedicines.findByPrescriptionIdOrderBySortOrder(prescription.getId())) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("name", medicine.getDrugName());
            line.put("dose", medicine.getDose());
            line.put("when", medicine.getWhenText());
            line.put("forDays", medicine.getForDays());
            medicineLines.add(line);
        }

        Visit visit =
                prescription.getVisitId() == null
                        ? null
                        : visits.findByIdAndClinicId(prescription.getVisitId(), prescription.getClinicId())
                                .orElse(null);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", prescription.getId().toString());
        // The document is genuine only when the hash the link carries is the
        // token the prescription holds. A changed document no longer holds it.
        body.put("genuine", genuine(prescription.getVerifyToken(), hash));
        body.put("doctor", doctorBody);
        body.put(
                "signedAt",
                prescription.getSignedAt() == null ? "" : prescription.getSignedAt().toString());
        body.put("patient", patientBody);
        body.put("diagnoses", diagnosisLines);
        body.put("medicines", medicineLines);
        body.put("signatureMode", prescription.getSignatureMode());
        body.put("visitToken", visit == null ? null : visit.getToken());
        return body;
    }

    /**
     * Whether the hash the caller carried is the token the prescription holds.
     *
     * <p>The two are compared in constant time, so the answer does not tell an
     * attacker how much of the token they guessed right.
     */
    static boolean genuine(String storedToken, String presented) {
        if (storedToken == null || storedToken.isBlank() || presented == null || presented.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                storedToken.getBytes(StandardCharsets.UTF_8), presented.getBytes(StandardCharsets.UTF_8));
    }

    /** The times the patient can take, for the day asked for. */
    private List<Map<String, Object>> slots(UUID clinicId, String doctorId, LocalDate day, ZoneId zone) {
        List<Map<String, Object>> list = new ArrayList<>();

        // Only the appointments on this day, for this doctor, are in the way.
        // Counting the doctor's whole book made every slot read as taken.
        Set<String> taken = new java.util.HashSet<>();
        UUID doctor = parseUuid(doctorId);
        if (doctor != null) {
            Instant from = day.atStartOfDay(zone).toInstant();
            Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();
            for (Appointment appointment :
                    appointments.findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
                            clinicId, doctor, from, to)) {
                taken.add(appointment.getStartsAt().atZone(zone).toLocalTime().toString());
            }
        }

        for (String hour : HOURS) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("label", hour);
            body.put("startsAt", day + "T" + hour + ":00Z");
            body.put("free", !taken.contains(hour));
            list.add(body);
        }
        return list;
    }

    /** The next free time, in the patient's words. */
    private String nextFree(List<Map<String, Object>> slots) {
        for (Map<String, Object> slot : slots) {
            if (Boolean.TRUE.equals(slot.get("free"))) {
                return "Tomorrow, " + slot.get("label");
            }
        }
        return null;
    }

    /** The consultation fee, by doctor. */
    private BigDecimal feeFor(UUID clinicId, Staff doctor) {
        BigDecimal fee = doctor.getConsultationFee();
        if (fee == null || fee.signum() == 0) {
            return new BigDecimal("500");
        }
        return fee;
    }

    /** The next token the clinic's series. */
    private String nextToken(UUID clinicId) {
        int highest = 0;
        for (Visit visit : visits.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            String token = visit.getToken();
            if (token == null || !token.startsWith("A-")) {
                continue;
            }
            try {
                highest = Math.max(highest, Integer.parseInt(token.substring(2)));
            } catch (NumberFormatException e) {
                // a token that is not a number is not part of the series
            }
        }
        return String.format("A-%03d", highest + 1);
    }

    /** The visit a patient's link points at. */
    private Visit visitForLink(PublicLink link) {
        if (link.getVisitId() != null) {
            Visit visit = visits.findByIdAndClinicId(link.getVisitId(), link.getClinicId()).orElse(null);
            if (visit != null) {
                return visit;
            }
        }
        throw new NotFoundException("This link is not valid. Ask the clinic for a new one.");
    }

    /** The link the caller carried, if it is still a link. */
    private PublicLink liveLink(String linkKey) {
        PublicLink link =
                links.findByLinkKey(linkKey)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "This link is not valid. Ask the clinic for a new one."));
        if (!link.isLive(Instant.now())) {
            throw new NotFoundException("This link is not valid. Ask the clinic for a new one.");
        }
        return link;
    }

    /** The clinic the patient's slug points at. */
    private RegistryClinic clinicBySlug(String slug) {
        return clinics.findByBookingSlug(slug)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Please use your clinic's own booking link. Ask the clinic, or find it on their WhatsApp or Google page."));
    }

    /** The booking a repeated submission already made. */
    private Map<String, Object> bookingResult(RegistryClinic clinic, PublicLink link) {
        Visit visit = visitForLink(link);
        Appointment appointment = appointmentFor(visit);
        Staff doctor =
                appointment == null
                        ? null
                        : staff.findByIdAndClinicId(appointment.getDoctorId(), visit.getClinicId())
                                .orElse(null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", link.getLinkKey());
        body.put("queueToken", visit.getToken());
        body.put("liveUrl", "/t/" + link.getLinkKey());
        body.put("intakeUrl", "/intake/" + link.getLinkKey());
        body.put(
                "startsAt",
                appointment == null ? "" : appointment.getStartsAt().toString());
        body.put("doctor", doctor == null ? "" : doctor.getFullName());
        body.put("clinic", clinic.getName());
        return body;
    }

    /** The appointment a visit came from. */
    private Appointment appointmentFor(Visit visit) {
        List<Appointment> booked =
                appointments.findByClinicIdAndVisitIdOrderByStartsAtAsc(visit.getClinicId(), visit.getId());
        return booked.isEmpty() ? null : booked.get(0);
    }

    /** The link the patient keeps to check the prescription, once it is signed. */
    private String prescriptionUrlFor(Visit visit) {
        List<Prescription> forVisit =
                prescriptions.findByClinicIdAndVisitIdOrderByCreatedAtDesc(visit.getClinicId(), visit.getId());
        for (Prescription prescription : forVisit) {
            if (prescription.getVerifyToken() == null || prescription.getVerifyToken().isBlank()) {
                continue;
            }
            return "/verify/"
                    + prescription.getId()
                    + "?h="
                    + java.net.URLEncoder.encode(
                            prescription.getVerifyToken(), StandardCharsets.UTF_8);
        }
        return null;
    }

    /** The time the patient asked for, in the clinic's own time. */
    private Instant requestedStart(Object value, ZoneId zone) {
        if (value != null && !String.valueOf(value).isBlank()) {
            String text = String.valueOf(value).trim();
            try {
                return Instant.parse(text);
            } catch (RuntimeException notAnInstant) {
                try {
                    return LocalDateTime.parse(text.replace(" ", "T")).atZone(zone).toInstant();
                } catch (RuntimeException stillNotATime) {
                    // fall through to the first slot of the day
                }
            }
        }
        return LocalDate.now(zone).plusDays(1).atTime(LocalTime.of(9, 0)).atZone(zone).toInstant();
    }

    /** The digits of a number, with the country code taken off. */
    private static String digitsOf(Object value) {
        String digits = textOf(value) == null ? "" : textOf(value).replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        return digits;
    }

    /** The age the patient gave, if it is one. */
    private static int parseAge(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return 30;
        }
        try {
            int age = Integer.parseInt(String.valueOf(value).trim());
            return age < 0 || age > 120 ? 30 : age;
        } catch (NumberFormatException notANumber) {
            return 30;
        }
    }

    /** The words of a list the form sent. */
    private static List<String> stringsOf(Object value) {
        List<String> out = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object entry : list) {
                String text = textOf(entry);
                if (text != null && !text.isBlank()) {
                    out.add(text);
                }
            }
        } else if (value instanceof String[] array) {
            for (String entry : array) {
                String text = textOf(entry);
                if (text != null && !text.isBlank()) {
                    out.add(text);
                }
            }
        }
        return out;
    }

    /** The text of a value, if there is any. */
    private static String textOf(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

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

    /** The clinic's own card, as the patient reads it. */
    private String clinicPhone(UUID clinicId) {
        return profileValue(clinicId, ClinicProfile::getPhone);
    }

    private String clinicAddress(UUID clinicId) {
        return profileValue(clinicId, ClinicProfile::getAddress);
    }

    private String clinicCity(UUID clinicId) {
        return profileValue(clinicId, ClinicProfile::getCity);
    }

    /** One field of the clinic's own profile. */
    private String profileValue(UUID clinicId, java.util.function.Function<ClinicProfile, String> field) {
        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        if (profile == null) {
            return "";
        }
        String value = field.apply(profile);
        return value == null ? "" : value;
    }
}
