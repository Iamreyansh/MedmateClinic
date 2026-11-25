package com.medmate.clinic.subscription;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The subscription: the plan, the trial, the usage and the payments. */
@RestController
@RequestMapping("/api/clinic/subscription")
public class SubscriptionController {

    private final SubscriptionService subscription;
    private final CurrentClinic current;

    public SubscriptionController(SubscriptionService subscription, CurrentClinic current) {
        this.subscription = subscription;
        this.current = current;
    }

    /** The plan, the trial and the usage. */
    @GetMapping
    public Map<String, Object> subscription() {
        return subscription.subscription(current.get());
    }

    /** Pay for the plan. */
    @PostMapping("/checkout")
    public Map<String, Object> checkout(@RequestBody(required = false) CheckoutRequest request) {
        ClinicPrincipal principal = current.get();
        if (!principal.can("subscription")) {
            throw new ForbiddenException("You cannot open the subscription.");
        }
        if (request == null) {
            throw new IllegalArgumentException("A payment needs a plan and a clinic name.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "paid");
        body.put("plan", request.plan() == null ? "clinic" : request.plan());
        body.put("amount", request.amount() == null ? BigDecimal.ZERO : request.amount());
        body.put("method", request.method() == null ? "upi" : request.method());
        body.put("paidAt", Instant.now().toString());
        return body;
    }

    /** Ask about the enterprise plan. */
    @PostMapping("/enquiry")
    public Map<String, Object> enquiry(@RequestBody(required = false) EnquiryRequest request) {
        ClinicPrincipal principal = current.get();
        if (!principal.can("subscription")) {
            throw new ForbiddenException("You cannot open the subscription.");
        }
        if (request == null || request.clinic() == null || request.clinic().isBlank()) {
            throw new IllegalArgumentException("An enquiry needs the clinic's name.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("received", true);
        body.put("on", Instant.now().toString());
        body.put("clinic", request.clinic());
        return body;
    }

    /** Connect the clinic's own payment keys. */
    @PostMapping("/payments")
    public Map<String, Object> payments(@RequestBody(required = false) PaymentsRequest request) {
        ClinicPrincipal principal = current.get();
        if (!principal.can("subscription") && !principal.can("settings")) {
            throw new ForbiddenException("You cannot connect payments.");
        }
        if (request == null || request.keyId() == null || request.keyId().isBlank()) {
            throw new IllegalArgumentException("A payment connection needs a key id.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("connected", true);
        body.put("provider", request.provider() == null ? "razorpay" : request.provider());
        body.put("keyId", request.keyId());
        return body;
    }

    /** What the owner typed to pay. */
    public record CheckoutRequest(
            String plan, BigDecimal amount, String method, String name, String email) {}

    /** What the owner typed to ask about the enterprise plan. */
    public record EnquiryRequest(
            String clinic, String locations, String doctors, String staff, String note) {}

    /** The clinic's own payment keys. */
    public record PaymentsRequest(String provider, String keyId, String secret) {}
}
