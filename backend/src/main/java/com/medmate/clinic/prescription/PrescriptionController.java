package com.medmate.clinic.prescription;

import com.medmate.clinic.audit.AuditService;
import com.medmate.clinic.consult.ConsultService;
import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The prescription: signing it, and the document that comes out. */
@RestController
@RequestMapping("/api/clinic/prescriptions")
public class PrescriptionController {

    private final ConsultService consults;
    private final CurrentClinic current;
    private final AuditService audit;

    public PrescriptionController(
            ConsultService consults, CurrentClinic current, AuditService audit) {
        this.consults = consults;
        this.current = current;
        this.audit = audit;
    }

    /**
     * Sign the prescription.
     *
     * <p>The signature is the simulated one the MVP used: the provider plugs in
     * behind the same call, and the mode is recorded on the prescription and in
     * the audit trail.
     *
     * <p>When the checker warned the doctor, the reason they gave for going
     * ahead anyway is recorded too.
     */
    @PostMapping("/{id}/sign")
    public Map<String, Object> sign(
            @PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        String mode = body == null ? null : body.get("signatureMode");
        String overrideReason = body == null ? null : body.get("overrideReason");
        return consults.sign(current.get(), id, mode, overrideReason);
    }
}
