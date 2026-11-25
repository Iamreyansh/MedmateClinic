package com.medmate.clinic.billing;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Billing and the point of sale. */
@RestController
@RequestMapping("/api/clinic/billing")
public class BillingController {

    private final BillingService billing;
    private final CurrentClinic current;

    public BillingController(BillingService billing, CurrentClinic current) {
        this.billing = billing;
        this.current = current;
    }

    /** The till: what came in today and what is still owed. */
    @GetMapping
    public Map<String, Object> till(@RequestParam(required = false) String date) {
        return billing.till(current.get(), date);
    }

    /** One bill, as it is printed. */
    @GetMapping("/{invoiceId}")
    public Map<String, Object> bill(@PathVariable String invoiceId) {
        return billing.bill(current.get(), invoiceId);
    }

    /** Take the money. */
    @PostMapping("/{invoiceId}/pay")
    public Map<String, Object> pay(
            @PathVariable String invoiceId, @RequestBody(required = false) PaymentRequest request) {
        return billing.pay(current.get(), invoiceId, request == null ? "cash" : request.payMode());
    }

    /** Give the money back. */
    @PostMapping("/{invoiceId}/refund")
    public Map<String, Object> refund(@PathVariable String invoiceId) {
        return billing.refund(current.get(), invoiceId);
    }

    public record PaymentRequest(String payMode) {}
}
