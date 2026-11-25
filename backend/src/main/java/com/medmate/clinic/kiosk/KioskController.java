package com.medmate.clinic.kiosk;

import com.medmate.clinic.security.CurrentClinic;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The patient kiosk.
 *
 * <p>The kiosk is public: a patient at the tablet is not signed in. The one
 * thing that needs a session is closing it, which the front desk does with
 * their PIN.
 */
@RestController
@RequestMapping("/api/kiosk")
public class KioskController {

    private final KioskService kiosk;
    private final CurrentClinic current;

    public KioskController(KioskService kiosk, CurrentClinic current) {
        this.kiosk = kiosk;
        this.current = current;
    }

    /** The state of the kiosk on this device. */
    @GetMapping
    public Map<String, Object> state() {
        return kiosk.session();
    }

    /** Open the kiosk on this device. */
    @PostMapping("/open")
    public Map<String, Object> open() {
        return kiosk.openKiosk();
    }

    /** Close the kiosk. The front desk does this with their PIN. */
    @PostMapping("/close")
    public Map<String, Object> close(@Valid @RequestBody CloseRequest request) {
        return kiosk.closeKiosk(current.get(), request.pin());
    }

    /** Send the code to the patient's phone. */
    @PostMapping("/code")
    public Map<String, Object> code(@Valid @RequestBody PhoneRequest request) {
        return kiosk.sendCode(request.phone());
    }

    /** Verify the code and move the patient on. */
    @PostMapping("/verify")
    public Map<String, Object> verify(@Valid @RequestBody VerifyRequest request) {
        return kiosk.verifyCode(request.phone(), request.code());
    }

    /** Say who the patient is. */
    @PostMapping("/patient")
    public Map<String, Object> patient(@Valid @RequestBody PatientRequest request) {
        return kiosk.setPatient(request.name());
    }

    /** Choose the doctor. */
    @PostMapping("/doctor")
    public Map<String, Object> doctor(@Valid @RequestBody DoctorRequest request) {
        return kiosk.setDoctor(request.doctorId());
    }

    /** Pay, if there is anything to pay. */
    @PostMapping("/pay")
    public Map<String, Object> pay(@RequestBody(required = false) PayRequest request) {
        return kiosk.pay(request == null ? null : request.method());
    }

    /** Take the token. */
    @PostMapping("/token")
    public Map<String, Object> token() {
        return kiosk.takeToken();
    }

    /** Go back to the start — the patient changed their mind. */
    @PostMapping("/reset")
    public Map<String, Object> reset() {
        return kiosk.resetKiosk();
    }

    /** Change the language the kiosk speaks. */
    @PostMapping("/language")
    public Map<String, Object> language(@Valid @RequestBody LanguageRequest request) {
        return kiosk.setLanguage(request.language());
    }

    /** The PIN the front desk gives to close the kiosk. */
    public record CloseRequest(@NotBlank String pin) {}

    /** The number the code is sent to. */
    public record PhoneRequest(@NotBlank String phone) {}

    /** The code that was sent. */
    public record VerifyRequest(@NotBlank String phone, @NotBlank String code) {}

    /** Who the patient is. */
    public record PatientRequest(@NotBlank String name) {}

    /** Which doctor the patient is seeing. */
    public record DoctorRequest(@NotBlank String doctorId) {}

    /** How the patient paid. */
    public record PayRequest(String method) {}

    /** The language the kiosk speaks. */
    public record LanguageRequest(@NotBlank String language) {}
}
