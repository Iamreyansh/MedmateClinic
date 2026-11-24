package com.medmate.clinic.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Signing in. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Send a code to a mobile number. */
    @PostMapping("/otp")
    public ResponseEntity<Map<String, Object>> requestCode(@Valid @RequestBody PhoneRequest request) {
        OtpService.Issued challenge = authService.requestCode(request.phone());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("sent", true);
        if (challenge.exposedCode() != null) {
            body.put("code", challenge.exposedCode());
        }
        return ResponseEntity.ok(body);
    }

    /** Check the code and open a session. */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody CodeRequest request) {
        String token = authService.openSession(request.phone(), request.code());
        return ResponseEntity.ok(Map.of("accessToken", token));
    }

    /** Unlock a device with the PIN. */
    @PostMapping("/unlock")
    public ResponseEntity<Map<String, Object>> unlock(@Valid @RequestBody UnlockRequest request) {
        String token = authService.unlock(UUID.fromString(request.clinicId()), request.pin());
        return ResponseEntity.ok(Map.of("accessToken", token));
    }

    public record PhoneRequest(@NotBlank String phone) {}

    public record CodeRequest(@NotBlank String phone, @NotBlank String code) {}

    public record UnlockRequest(@NotBlank String clinicId, @NotBlank String pin) {}
}
