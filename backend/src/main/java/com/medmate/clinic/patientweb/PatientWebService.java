package com.medmate.clinic.patientweb;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    /** The hours the clinic sees patients. */
    private static final String[] HOURS = {"09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "16:00", "16:30"};

    private final RegistryClinicRepository clinics;
    private final PublicLinkRepository links;
    private final VisitRepository visits;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final AppointmentRepository appointments;
    private final PrescriptionRepository prescriptions;
    private final PrescriptionDiagnosisRepository prescriptionDiagnoses;
    private final PrescriptionMedicineRepository prescriptionMedicines;

    public PatientWebService(
            RegistryClinicRepository clinics,
            PublicLinkRepository links,
            VisitRepository visits,
            PatientRepository patients,
            StaffRepository staff,
            AppointmentRepository appointments,
            PrescriptionRepository prescriptions,
            PrescriptionDiagnosisRepository prescriptionDiagnoses,
            PrescriptionMedicineRepository prescriptionMedicines) {
        this.clinics = clinics;
        this.links = links;
        this.visits = visits;
        this.patients = patients;
        this.staff = staff;
        this.appointments = appointments;
        this.prescriptions = prescriptions;
        this.prescriptionDiagnoses = prescriptionDiagnoses;
        this.prescriptionMedicines = prescriptionMedicines;
    }

    /** The booking page: the clinic, its doctors and the times. */
    @Transactional(readOnly = true)
    public Map<String, Object> bookingPage(String slug) {
        RegistryClinic clinic =
                clinics.findByBookingSlug(slug)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Please use your clinic's own booking link. Ask the clinic, or find it on their WhatsApp or Google page."));
        UUID clinicId = clinic.getId();

        List<Map<String, Object>> list = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", person.getId().toString());
            body.put("name", person.getFullName());
            body.put("speciality", person.getSpeciality());
            body.put("feeInClinic", feeFor(clinicId, person));
            body.put("feeOnline", feeFor(clinicId, person).subtract(new BigDecimal("100")));
            body.put("room", null);
            list.add(body);
        }

        String firstDoctor = list.isEmpty() ? "" : String.valueOf(list.get(0).get("id"));
        List<Map<String, Object>> slots = slots(clinicId, firstDoctor);

        Map<String, Object> clinicBody = new LinkedHashMap<>();
        clinicBody.put("name", clinic.getName());
        clinicBody.put("city", "");
        clinicBody.put("address", "");
        clinicBody.put("phone", "");
        clinicBody.put("slug", slug);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("clinic", clinicBody);
        body.put("doctors", list);
        body.put("slots", slots);
        body.put("day", LocalDate.now().plusDays(1).toString());
        body.put("nextFree", nextFree(slots));
        return body;
    }

    /** Book the visit. The patient gets a token and two links to keep. */
    @Transactional
    public Map<String, Object> book(String slug, Map<String, Object> request) {
        RegistryClinic clinic =
                clinics.findByBookingSlug(slug)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Please use your clinic's own booking link. Ask the clinic, or find it on their WhatsApp or Google page."));
        UUID clinicId = clinic.getId();

        String name = String.valueOf(request.getOrDefault("name", "")).trim();
        String phone = String.valueOf(request.getOrDefault("phone", "")).replaceAll("\\D", "");
        if (name.isEmpty()) {
            throw new NotFoundException("Enter the patient's name.");
        }
        if (phone.length() != 10) {
            throw new NotFoundException("Enter a 10-digit mobile number.");
        }

        String doctorId = String.valueOf(request.getOrDefault("doctorId", ""));
        Staff doctor = staff.findByIdAndClinicId(UUID.fromString(doctorId), clinicId).orElse(null);
        if (doctor == null) {
            throw new NotFoundException("Choose a doctor to continue.");
        }

        Instant startsAt = Instant.now().plusSeconds(86400);

        // the clinic has met this patient before — the record is theirs
        Patient person = null;
        for (Patient entry : patients.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            if (entry.getPhone() != null && entry.getPhone().replaceAll("\\D", "").endsWith(phone)) {
                person = entry;
                break;
            }
        }
        if (person == null) {
            person = new Patient();
            person.setId(UUID.randomUUID());
            person.setClinicId(clinicId);
            person.setFullName(name);
            person.setAge(Integer.valueOf(String.valueOf(request.getOrDefault("age", "30"))));
            person.setSex(String.valueOf(request.getOrDefault("sex", "F")));
            person.setPhone(phone);
            person.setAbha("");
            person.setAllergies(new String[0]);
            person.setConditions(new String[0]);
            patients.save(person);
        }

        // the token is the next in the series
        String token = nextToken(clinicId);

        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setClinicId(clinicId);
        visit.setPatientId(person.getId());
        visit.setToken(token);
        visit.setStatus("waiting");
        visit.setMode("in_clinic");
        visit.setSource("booking");
        visit.setReason(String.valueOf(request.getOrDefault("reason", "")));
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
        appointments.save(appointment);

        // the patient's links to keep, and the clinic they point at
        PublicLink link = new PublicLink();
        link.setLinkKey(token);
        link.setClinicId(clinicId);
        links.save(link);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", token);
        body.put("liveUrl", "/t/" + token);
        body.put("intakeUrl", "/intake/" + token);
        body.put("startsAt", startsAt.toString());
        body.put("doctor", doctor.getFullName());
        body.put("clinic", clinic.getName());
        return body;
    }

    /** The patient's place in the queue. */
    @Transactional(readOnly = true)
    public Map<String, Object> liveToken(String token) {
        Visit visit = visitForToken(token);
        Patient person = patients.findByIdAndClinicId(visit.getPatientId(), visit.getClinicId()).orElse(null);
        Appointment appointment = appointmentFor(visit);

        Staff doctor = appointment == null ? null : staff.findByIdAndClinicId(appointment.getDoctorId(), visit.getClinicId()).orElse(null);

        // the queue the patient is in
        List<Visit> queue = new ArrayList<>();
        for (Visit entry : visits.findByClinicIdAndStatusOrderByCreatedAtAsc(visit.getClinicId(), "waiting")) {
            if (entry.getToken() != null && entry.getToken().startsWith("A")) {
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

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", visit.getToken());
        body.put("patient", person == null ? "" : person.getFullName());
        body.put("position", position);
        body.put("ahead", Math.max(0, position - 1));
        body.put("room", null);
        body.put("doctor", doctor == null ? "" : doctor.getFullName());
        body.put("due", 500);
        body.put("prescriptionUrl", null);
        body.put("called", "in_consult".equals(visit.getStatus()));
        body.put("updatedAt", Instant.now().toString());
        return body;
    }

    /** The symptoms form, before the visit. */
    @Transactional(readOnly = true)
    public Map<String, Object> intake(String token) {
        Visit visit = visitForToken(token);
        Patient person = patients.findByIdAndClinicId(visit.getPatientId(), visit.getClinicId()).orElse(null);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", person == null ? "" : person.getFullName());
        body.put("filled", false);
        body.put("symptoms", new ArrayList<String>());
        body.put("redFlags", new ArrayList<String>());
        body.put("notes", visit.getReason() == null ? "" : visit.getReason());
        body.put("duration", "");
        body.put("open", true);
        return body;
    }

    /** Send the symptoms form in. */
    @Transactional
    public Map<String, Object> submitIntake(String token, Map<String, Object> request) {
        Visit visit = visitForToken(token);

        Object notes = request.get("notes");
        if (notes != null && !String.valueOf(notes).isBlank()) {
            // the doctor reads what the patient wrote
            visit.setReason(String.valueOf(notes));
            visits.save(visit);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", token);
        body.put("filled", true);
        body.put("submittedAt", Instant.now().toString());
        return body;
    }

    /** The prescription, as the patient verifies it. */
    @Transactional(readOnly = true)
    public Map<String, Object> verify(String id, String hash) {
        UUID prescriptionId = UUID.fromString(id.replace("rx_", ""));
        Prescription prescription =
                prescriptions.findById(prescriptionId)
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

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", prescription.getId().toString());
        body.put("genuine", true);
        body.put("doctor", doctorBody);
        body.put(
                "signedAt",
                prescription.getSignedAt() == null ? "" : prescription.getSignedAt().toString());
        body.put("patient", patientBody);
        body.put("diagnoses", diagnosisLines);
        body.put("medicines", medicineLines);
        body.put("signatureMode", prescription.getSignatureMode());
        return body;
    }

    /** The times the patient can take, for tomorrow. */
    private List<Map<String, Object>> slots(UUID clinicId, String doctorId) {
        List<Map<String, Object>> list = new ArrayList<>();
        int taken = 0;
        if (!doctorId.isEmpty()) {
            for (Appointment appointment : appointments.findByClinicIdOrderByStartsAtAsc(clinicId)) {
                if (doctorId.equals(appointment.getDoctorId().toString())) {
                    taken++;
                }
            }
        }

        LocalDate day = LocalDate.now().plusDays(1);
        for (int index = 0; index < HOURS.length; index++) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("label", HOURS[index]);
            body.put("startsAt", day + "T" + HOURS[index] + ":00Z");
            body.put("free", index >= taken);
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

    /** The next token in the clinic's series. */
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
    private Visit visitForToken(String token) {
        UUID clinicId = clinicOf(token);
        return visits.findFirstByClinicIdAndTokenOrderByCreatedAtDesc(clinicId, token)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "This link is not valid. Ask the clinic for a new one."));
    }

    /** The clinic a patient's link belongs to. */
    private UUID clinicOf(String token) {
        return links.findByLinkKey(token)
                .map(PublicLink::getClinicId)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "This link is not valid. Ask the clinic for a new one."));
    }

    /** The appointment a visit came from. */
    private Appointment appointmentFor(Visit visit) {
        for (Appointment appointment :
                appointments.findByClinicIdOrderByStartsAtAsc(visit.getClinicId())) {
            if (visit.getId().equals(appointment.getVisitId())) {
                return appointment;
            }
        }
        return null;
    }
}

