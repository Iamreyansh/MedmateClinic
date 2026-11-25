package com.medmate.clinic.patientweb;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The patient-facing surfaces.
 *
 * <p>These have no session: a patient at the clinic's front door is not
 * staff. The filter routes them to their clinic — by the slug on the booking
 * page, by the link on the token, the intake form and the verification.
 */
@RestController
@RequestMapping("/api")
public class PatientWebController {

    private final PatientWebService patientWeb;

    public PatientWebController(PatientWebService patientWeb) {
        this.patientWeb = patientWeb;
    }

    /** The booking page: the clinic, its doctors and the times. */
    @GetMapping("/public/doctors")
    public Map<String, Object> doctors(@RequestParam("clinic") String slug) {
        return patientWeb.bookingPage(slug);
    }

    /** Book the visit. The patient gets a token and two links to keep. */
    @PostMapping("/public/booking")
    public Map<String, Object> book(
            @RequestParam("clinic") String slug, @RequestBody Map<String, Object> request) {
        return patientWeb.book(slug, request);
    }

    /** The patient's place in the queue. */
    @GetMapping("/token/{token}")
    public Map<String, Object> liveToken(@PathVariable String token) {
        return patientWeb.liveToken(token);
    }

    /** The symptoms form, before the visit. */
    @GetMapping("/intake/{token}")
    public Map<String, Object> intake(@PathVariable String token) {
        return patientWeb.intake(token);
    }

    /** Send the symptoms form in. */
    @PostMapping("/intake/{token}")
    public Map<String, Object> submitIntake(
            @PathVariable String token, @RequestBody Map<String, Object> request) {
        return patientWeb.submitIntake(token, request);
    }

    /** The prescription, as the patient verifies it. */
    @GetMapping("/verify/{id}")
    public Map<String, Object> verify(
            @PathVariable String id, @RequestParam(value = "h", required = false) String hash) {
        return patientWeb.verify(id, hash == null ? "" : hash);
    }
}
