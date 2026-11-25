package com.medmate.clinic.kiosk;

import com.medmate.clinic.auth.PinService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.common.UnauthorizedException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.ClinicRouting;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * The patient kiosk.
 *
 * <p>A front-desk tablet becomes a self check-in screen. The kiosk holds its
 * own state — the step it is on, the patient it is talking to — so a patient
 * who walks away leaves nothing behind but a closed session.
 *
 * <p>The kiosk is a public surface: a patient at the tablet is not signed in.
 * The one thing that needs a session is closing the kiosk, which the front
 * desk does with their PIN.
 *
 * <p>The kiosk belongs to the clinic it is installed in. That clinic is
 * configuration, not a query the caller can make: the caller cannot point the
 * kiosk at somebody else's clinic.
 */
@Service
public class KioskService {

    /** How long the code the kiosk sent stays good. */
    private static final long CODE_TTL_MINUTES = 5;

    private final ClinicRouting routing;
    private final VisitRepository visits;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final PinService pins;
    private final String clinicSlug;

    /** The kiosk's own state. One device, one session. */
    private final Object lock = new Object();
    private boolean open;
    private String step = "mobile";
    private String language = "en";
    private String phone;
    private String code;
    private Instant codeExpiresAt;
    private UUID patientId;
    private String patientName;
    private UUID doctorId;
    private String queueToken;
    private boolean paid;

    private final SecureRandom random = new SecureRandom();

    public KioskService(
            ClinicRouting routing,
            VisitRepository visits,
            PatientRepository patients,
            StaffRepository staff,
            PinService pins,
            @Value("${medmate.kiosk.clinic-slug:medmate-clinic}") String clinicSlug) {
        this.routing = routing;
        this.visits = visits;
        this.patients = patients;
        this.staff = staff;
        this.pins = pins;
        this.clinicSlug = clinicSlug;
    }

    /** The kiosk as it is now. */
    public Map<String, Object> session() {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            return session(clinicId);
        }
    }

    /** Open the kiosk on this device. */
    public Map<String, Object> openKiosk() {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            open = true;
            reset();
            return session(clinicId);
        }
    }

    /** Close the kiosk. The front desk does this with their PIN. */
    public Map<String, Object> closeKiosk(ClinicPrincipal principal, String pin) {
        if (pin == null || pin.isBlank()) {
            throw new UnauthorizedException("That PIN is not right.");
        }
        if (!principal.can("kiosk") && !principal.can("desk")) {
            throw new ForbiddenException("You cannot close the kiosk.");
        }
        routing.routeBySlug(clinicSlug);
        UUID clinicId = principal.clinicIdAsUuid();
        boolean matched = false;
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (person.getPinHash() != null && pinMatches(clinicId, person, pin)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new UnauthorizedException("That PIN is not right.");
        }
        synchronized (lock) {
            open = false;
            reset();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("closed", true);
        return body;
    }

    /** Send the code to the patient's phone. */
    public Map<String, Object> sendCode(String phoneNumber) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        String digits = digitsOf(phoneNumber);
        if (digits.length() != 10) {
            throw new NotFoundException("Enter a 10-digit mobile number.");
        }
        synchronized (lock) {
            phone = digits;
            code = "%06d".formatted(random.nextInt(1_000_000));
            codeExpiresAt = Instant.now().plusSeconds(CODE_TTL_MINUTES * 60);
            step = "code";
            Map<String, Object> body = session(clinicId);
            body.put("sent", true);
            return body;
        }
    }

    /** Check the code and move the patient on. */
    public Map<String, Object> verifyCode(String phoneNumber, String given) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            if (code == null
                    || codeExpiresAt == null
                    || codeExpiresAt.isBefore(Instant.now())
                    || !code.equals(given == null ? "" : given.trim())) {
                throw new NotFoundException("That code is not right. Check the message and try again.");
            }
            code = null;
            phone = digitsOf(phoneNumber);

            // A patient the clinic has met before is known; a new one is not.
            Patient known = patients.findFirstByClinicIdAndPhoneDigits(clinicId, phone).orElse(null);
            if (known != null) {
                patientId = known.getId();
                patientName = known.getFullName();
            }
            step = "patient";
            return session(clinicId);
        }
    }

    /** Say who the patient is. */
    public Map<String, Object> setPatient(String name) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            if (name == null || name.trim().isEmpty()) {
                throw new NotFoundException("Enter the patient's name.");
            }
            patientName = name.trim();
            step = "doctor";
            return session(clinicId);
        }
    }

    /** Choose the doctor. */
    public Map<String, Object> setDoctor(String doctorId) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            boolean known = false;
            for (Staff person : staff.findByClinicId(clinicId)) {
                if (person.getId().toString().equals(doctorId)) {
                    known = true;
                    break;
                }
            }
            if (!known) {
                throw new NotFoundException("Choose a doctor to continue.");
            }
            this.doctorId = UUID.fromString(doctorId);
            step = "pay";
            return session(clinicId);
        }
    }

    /** Pay, if there is anything to pay. */
    public Map<String, Object> pay(String method) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            paid = true;
            step = "token";
            issueToken(clinicId);
            return session(clinicId);
        }
    }

    /** Take the token. */
    public Map<String, Object> takeToken() {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            step = "token";
            issueToken(clinicId);
            return session(clinicId);
        }
    }

    /** Go back to the start. */
    public Map<String, Object> resetKiosk() {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            reset();
            return session(clinicId);
        }
    }

    /** Change the language the kiosk speaks. */
    public Map<String, Object> setLanguage(String wanted) {
        RegistryClinic clinic = routing.routeBySlug(clinicSlug);
        UUID clinicId = clinic.getId();
        synchronized (lock) {
            if ("en".equals(wanted) || "kn".equals(wanted) || "hi".equals(wanted)) {
                language = wanted;
            }
            return session(clinicId);
        }
    }

    /** The session, as the kiosk sends it. */
    private Map<String, Object> session(UUID clinicId) {
        List<Map<String, Object>> doctors = new ArrayList<>();
        int index = 0;
        for (Staff person : staff.findByClinicId(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", person.getId().toString());
            body.put("name", person.getFullName());
            body.put("speciality", person.getSpeciality());
            body.put("room", person.getSpeciality());
            body.put("fee", feeOf(person, index));
            body.put("waiting", index + 1);
            doctors.add(body);
            index++;
        }

        Map<String, Object> doctor = null;
        for (Map<String, Object> entry : doctors) {
            if (entry.get("id").equals(doctorId == null ? "" : doctorId.toString())) {
                doctor = entry;
            }
        }

        Map<String, Object> patient = null;
        if (patientId != null) {
            Patient person = patients.findByIdAndClinicId(patientId, clinicId).orElse(null);
            if (person != null) {
                patient = new LinkedHashMap<>();
                patient.put("id", person.getId().toString());
                patient.put("name", person.getFullName());
                patient.put("age", person.getAge());
                patient.put("sex", person.getSex());
            }
        } else if (patientName != null && !patientName.isBlank()) {
            patient = new LinkedHashMap<>();
            patient.put("id", null);
            patient.put("name", patientName);
            patient.put("age", null);
            patient.put("sex", null);
        }

        // A patient who has not paid owes the consultation and the registration.
        Map<String, Object> bill = null;
        if (doctor != null && !paid) {
            int fee = (int) doctor.get("fee");
            List<Map<String, Object>> lines = new ArrayList<>();
            lines.add(line("Consultation — " + doctor.get("name"), fee));
            lines.add(line("Registration", 50));
            bill = new LinkedHashMap<>();
            bill.put("lines", lines);
            bill.put("total", fee + 50);
        }

        Integer position = null;
        if (queueToken != null && queueToken.startsWith("A-")) {
            try {
                position = Integer.parseInt(queueToken.substring(2));
            } catch (NumberFormatException notANumber) {
                position = null;
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("open", open);
        body.put("step", step);
        body.put("language", language);
        body.put("phone", phone);
        body.put("code", null);
        body.put("patient", patient);
        body.put("doctors", doctors);
        body.put("booking", null);
        body.put("doctor", doctor);
        body.put("bill", bill);
        body.put("token", queueToken);
        body.put("position", position);
        body.put("waiting", position == null ? 0 : Math.max(0, position - 1));
        body.put("qr", queueToken == null ? null : "medmate://checkin/" + queueToken);
        return body;
    }

    /** The token the patient is called by, and the visit that carries it. */
    private void issueToken(UUID clinicId) {
        if (queueToken != null) {
            return;
        }
        int highest = 0;
        for (Visit visit : visits.findByClinicIdOrderByCreatedAtAsc(clinicId)) {
            String token = visit.getToken();
            if (token == null || !token.startsWith("A-")) {
                continue;
            }
            try {
                highest = Math.max(highest, Integer.parseInt(token.substring(2)));
            } catch (NumberFormatException notANumber) {
                // a token that is not in the series is left alone
            }
        }
        queueToken = String.format("A-%03d", highest + 1);

        // The patient is checked in, so the token is on the screen before the
        // slip is printed and the visit is in the doctor's queue.
        Patient person = patientId == null ? null : patients.findByIdAndClinicId(patientId, clinicId).orElse(null);
        if (person == null && patientName != null && !patientName.isBlank()) {
            person = new Patient();
            person.setId(UUID.randomUUID());
            person.setClinicId(clinicId);
            person.setFullName(patientName);
            person.setAge(30);
            person.setSex("F");
            person.setPhone(phone == null ? "" : phone);
            person.setPhoneDigits(phone == null ? "" : phone);
            person.setAbha("");
            person.setAllergies(new String[0]);
            person.setConditions(new String[0]);
            person.setCreatedAt(Instant.now());
            person = patients.save(person);
            patientId = person.getId();
        }
        if (person == null) {
            return;
        }
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setClinicId(clinicId);
        visit.setPatientId(person.getId());
        visit.setToken(queueToken);
        visit.setStatus("waiting");
        visit.setMode("in_clinic");
        visit.setSource("walk_in");
        visit.setReason("Kiosk check-in");
        visit.setCreatedAt(Instant.now());
        visits.save(visit);
    }

    /** One line of the bill. */
    private static Map<String, Object> line(String name, int amount) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("amount", amount);
        return body;
    }

    /** The consultation fee, by doctor. */
    private static int feeOf(Staff person, int index) {
        if (person.getConsultationFee() != null && person.getConsultationFee().signum() > 0) {
            return person.getConsultationFee().intValue();
        }
        return Math.max(100, 500 - index * 50);
    }

    /** Whether the PIN is this person's. */
    private boolean pinMatches(UUID clinicId, Staff person, String pin) {
        return pins.matches(person.getId().toString(), person.getPinHash(), pin);
    }

    /** The digits of a number. */
    private static String digitsOf(String value) {
        if (value == null) {
            return "";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        return digits;
    }

    /** Back to the start, with the session cleared. */
    private void reset() {
        step = "mobile";
        phone = null;
        code = null;
        codeExpiresAt = null;
        patientId = null;
        patientName = null;
        doctorId = null;
        queueToken = null;
        paid = false;
    }
}
