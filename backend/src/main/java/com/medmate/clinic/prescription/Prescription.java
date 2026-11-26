package com.medmate.clinic.prescription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One row of the prescriptions table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "prescriptions")
public class Prescription {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "visit_id")
    private UUID visitId;
    @Column(name = "consultation_id")
    private UUID consultationId;
    @Column(name = "patient_id")
    private UUID patientId;
    @Column(name = "signed_by")
    private UUID signedBy;
    @Column(name = "signed_at")
    private Instant signedAt;
    @Column(name = "signature_mode")
    private String signatureMode;
    @Column(name = "version")
    private Integer version;
    @Column(name = "status")
    private String status;
    @Column(name = "created_at")
    private Instant createdAt;

    /**
     * The token that proves this document has not changed since it was signed.
     *
     * <p>The link the patient keeps carries the token, and the prescription
     * carries it. The two are compared in constant time: a prescription that
     * was changed after it was signed no longer holds the token that was
     * handed out, so the old link stops verifying.
     */
    @Column(name = "verify_token")
    private String verifyToken;

    /** An antibiotic was prescribed. */
    @Column(name = "antibiotic")
    private boolean antibiotic;

    /** The doctor was shown at least one safety note. */
    @Column(name = "safety_alert")
    private boolean safetyAlert;

    /** Which safety notes, as a comma separated list of kinds. */
    @Column(name = "safety_alert_kind")
    private String safetyAlertKind;

    /** The doctor went ahead anyway, and said why. */
    @Column(name = "safety_overridden")
    private boolean safetyOverridden;

    @Column(name = "safety_override_reason")
    private String safetyOverrideReason;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }
    public UUID getClinicId() {
        return clinicId;
    }

    public void setClinicId(UUID clinicId) {
        this.clinicId = clinicId;
    }
    public UUID getVisitId() {
        return visitId;
    }

    public void setVisitId(UUID visitId) {
        this.visitId = visitId;
    }
    public UUID getConsultationId() {
        return consultationId;
    }

    public void setConsultationId(UUID consultationId) {
        this.consultationId = consultationId;
    }
    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }
    public UUID getSignedBy() {
        return signedBy;
    }

    public void setSignedBy(UUID signedBy) {
        this.signedBy = signedBy;
    }
    public Instant getSignedAt() {
        return signedAt;
    }

    public void setSignedAt(Instant signedAt) {
        this.signedAt = signedAt;
    }
    public String getSignatureMode() {
        return signatureMode;
    }

    public void setSignatureMode(String signatureMode) {
        this.signatureMode = signatureMode;
    }
    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    public String getVerifyToken() {
        return verifyToken;
    }

    public void setVerifyToken(String verifyToken) {
        this.verifyToken = verifyToken;
    }

    public boolean isAntibiotic() {
        return antibiotic;
    }

    public void setAntibiotic(boolean antibiotic) {
        this.antibiotic = antibiotic;
    }

    public boolean isSafetyAlert() {
        return safetyAlert;
    }

    public void setSafetyAlert(boolean safetyAlert) {
        this.safetyAlert = safetyAlert;
    }

    public String getSafetyAlertKind() {
        return safetyAlertKind;
    }

    public void setSafetyAlertKind(String safetyAlertKind) {
        this.safetyAlertKind = safetyAlertKind;
    }

    public boolean isSafetyOverridden() {
        return safetyOverridden;
    }

    public void setSafetyOverridden(boolean safetyOverridden) {
        this.safetyOverridden = safetyOverridden;
    }

    public String getSafetyOverrideReason() {
        return safetyOverrideReason;
    }

    public void setSafetyOverrideReason(String safetyOverrideReason) {
        this.safetyOverrideReason = safetyOverrideReason;
    }
}
