package com.medmate.clinic.onboarding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
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
 */
@RestController
@RequestMapping("/api/auth")
public class SignupController {

    private final SignupService signup;

    public SignupController(SignupService signup) {
        this.signup = signup;
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
}
