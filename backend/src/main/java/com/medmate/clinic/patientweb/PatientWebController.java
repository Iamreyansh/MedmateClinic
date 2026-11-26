package com.medmate.clinic.patientweb;

import com.medmate.clinic.tenancy.ClinicRouting;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The patient-facing surfaces.
 *
 * <p>These have no session: a patient at the clinic's front door is not
 * staff. The filter routes them to their clinic — by the slug on the booking
 * page, by the link on the token, the intake form and the verification.
 *
 * <p>The booking is the one write here, so it is the one that is checked: a
 * name, a number and a doctor are needed, and a number that is not ten digits
 * is refused with the same envelope as every other error.
 */
@RestController
@RequestMapping("/api")
public class PatientWebController {

    private final PatientWebService patientWeb;
    private final ClinicRouting routing;

    public PatientWebController(PatientWebService patientWeb, ClinicRouting routing) {
        this.patientWeb = patientWeb;
        this.routing = routing;
    }

    /**
     * The booking page: the clinic, its doctors and the times.
     *
     * <p>The times are the first doctor's, unless a doctor is named — then
     * they are that doctor's.
     */
    @GetMapping("/public/doctors")
    public Map<String, Object> doctors(
            @RequestParam("clinic") String slug,
            @RequestParam(value = "doctorId", required = false) String doctorId) {
        return patientWeb.bookingPage(slug, doctorId);
    }

    /** Book the visit. The patient gets a token and two links to keep. */
    @PostMapping("/public/booking")
    public Map<String, Object> book(
            @Valid @RequestBody BookingRequest request,
            @RequestParam(value = "clinic", required = false) String clinicParam,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader) {
        // The clinic the booking is for travels in the body. It may also come
        // as a query parameter, for a link that carries it.
        String slug = request.clinic() == null || request.clinic().isBlank() ? clinicParam : request.clinic();
        if (slug == null || slug.isBlank()) {
            throw new com.medmate.clinic.common.NotFoundException(
                    "Please use your clinic's own booking link.");
        }
        // The request is pointed at that clinic's schema before anything is read.
        routing.routeBySlug(slug);
        String idempotencyKey =
                idempotencyHeader == null || idempotencyHeader.isBlank()
                        ? request.idempotencyKey()
                        : idempotencyHeader;
        return patientWeb.book(slug, request.asMap(), idempotencyKey);
    }

    /** The patient calls the booking off. */
    @PostMapping("/public/booking/{linkKey}/cancel")
    public Map<String, Object> cancel(
            @PathVariable String linkKey,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader) {
        return patientWeb.cancel(linkKey, idempotencyHeader);
    }

    /**
     * The patient moves the booking to another time.
     *
     * <p>The link says which clinic the patient is in, so the request carries
     * no clinic of its own.
     *
     * <p>The answer carries the queue slip as its token, and never the link
     * key: the key is the patient's credential, it does not change when the
     * booking moves, and it must not be drawn. The call-off answers the same
     * way.
     */
    @PostMapping("/public/booking/{linkKey}/rebook")
    public Map<String, Object> rebook(
            @PathVariable String linkKey,
            @Valid @RequestBody PatientWebService.RebookRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader) {
        return patientWeb.rebook(linkKey, request, idempotencyHeader);
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
            @PathVariable String token, @Valid @RequestBody IntakeRequest request) {
        return patientWeb.submitIntake(token, request.asMap());
    }

    /** The prescription, as the patient verifies it. */
    @GetMapping("/verify/{id}")
    public Map<String, Object> verify(
            @PathVariable String id, @RequestParam(value = "h", required = false) String hash) {
        return patientWeb.verify(id, hash == null ? "" : hash);
    }

    /**
     * What the patient books.
     *
     * <p>The field names are the ones the SPA sends: {@code clinic}, {@code
     * doctorId}, {@code startsAt}, {@code name}, {@code phone}, {@code age},
     * {@code sex}, {@code reason}.
     */
    public record BookingRequest(
            String clinic,
            @NotBlank String doctorId,
            String startsAt,
            @NotBlank String name,
            @NotBlank
                    @Pattern(regexp = "^[0-9 +()-]{10,20}$", message = "must be a mobile number")
                    String phone,
            String age,
            String sex,
            String reason,
            String idempotencyKey) {

        public Map<String, Object> asMap() {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("clinic", clinic);
            body.put("doctorId", doctorId);
            body.put("startsAt", startsAt);
            body.put("name", name);
            body.put("phone", phone);
            body.put("age", age);
            body.put("sex", sex);
            body.put("reason", reason);
            return body;
        }
    }

    /** What the patient writes on the symptoms form. */
    public record IntakeRequest(
            String[] symptoms,
            String[] redFlags,
            String notes,
            String duration) {

        public Map<String, Object> asMap() {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("symptoms", symptoms);
            body.put("redFlags", redFlags);
            body.put("notes", notes);
            body.put("duration", duration);
            return body;
        }
    }
}
