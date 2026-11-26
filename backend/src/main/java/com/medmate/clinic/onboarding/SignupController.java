package com.medmate.clinic.onboarding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A clinic signs itself up.
 *
 * <p>The five steps the SPA collects become a clinic in the directory, a
 * schema of its own, and a session for the owner. The answer carries the
 * clinic's booking link, so the last step can hand the patient a link that
 * works.
 *
 * <p>Before any of that, the owner's number is proved with a code: the
 * number is not attached to a clinic yet, so the code is kept in the registry
 * rather than in a clinic's schema.
 */
@RestController
@RequestMapping("/api/auth")
public class SignupController {

    private final SignupService signup;
    private final PreSignupService preSignup;

    public SignupController(SignupService signup, PreSignupService preSignup) {
        this.signup = signup;
        this.preSignup = preSignup;
    }

    /** Sign the clinic up, and sign the owner in. */
    @PostMapping("/signup")
    public Map<String, Object> signUp(@Valid @RequestBody SignupRequest request) {
        return signup.signUp(
                new SignupService.SignupRequest(
                        request.name(), request.mobile(), request.email(), request.clinicName(),
                        request.clinicKind(), request.registeredUnder(), request.regNumber(),
                        request.validUntil(), request.clinicEmail(), request.gstin(), request.pan(),
                        request.locName(), request.street(), request.area(), request.city(),
                        request.pin(), request.state(), request.phone(), request.rooms(),
                        request.hfr(), request.role(), request.hpr(), request.doctorName(),
                        request.doctorQual(), request.doctorReg(), request.speciality(),
                        request.fee(), request.videoFee(), request.signing()));
    }

    /** Send a code to a number that has no clinic yet. */
    @PostMapping("/otp/pre-signup")
    public ResponseEntity<Map<String, Object>> requestPreSignupCode(
            @Valid @RequestBody PreSignupPhoneRequest request) {
        return ResponseEntity.ok(preSignup.requestCode(request.mobile()));
    }

    /** Check the code and keep the proof. */
    @PostMapping("/pre-signup/verify")
    public ResponseEntity<Map<String, Object>> verifyPreSignupCode(
            @Valid @RequestBody PreSignupCodeRequest request) {
        preSignup.verify(request.mobile(), request.code());
        return ResponseEntity.ok(Map.of("verified", true));
    }

    /**
     * What the SPA collects.
     *
     * <p>The field names are the SPA's: the form is one flat object and every
     * step edits it.
     */
    public record SignupRequest(
            @NotBlank String name,
            @NotBlank String mobile,
            String email,
            @NotBlank String clinicName,
            String clinicKind,
            String registeredUnder,
            String regNumber,
            String validUntil,
            String clinicEmail,
            String gstin,
            String pan,
            String locName,
            String street,
            String area,
            String city,
            String pin,
            String state,
            String phone,
            String rooms,
            String hfr,
            String role,
            String hpr,
            String doctorName,
            String doctorQual,
            String doctorReg,
            String speciality,
            String fee,
            String videoFee,
            String signing) {}

    /** The number the sign-up's code is sent to. */
    public record PreSignupPhoneRequest(@NotBlank String mobile) {}

    /** The number, and the code that was sent to it. */
    public record PreSignupCodeRequest(@NotBlank String mobile, @NotBlank String code) {}
}
