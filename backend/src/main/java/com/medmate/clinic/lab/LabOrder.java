package com.medmate.clinic.lab;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One row of the lab orders table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "lab_orders")
public class LabOrder {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "patient_id")
    private UUID patientId;
    @Column(name = "visit_id")
    private UUID visitId;
    @Column(name = "prescription_id")
    private UUID prescriptionId;
    @Column(name = "test_name")
    private String testName;
    @Column(name = "status")
    private String status;
    @Column(name = "ordered_by")
    private UUID orderedBy;
    @Column(name = "ordered_at")
    private Instant orderedAt;
    @Column(name = "reported_at")
    private Instant reportedAt;
    @Column(name = "result_value")
    private String resultValue;
    @Column(name = "result_note")
    private String resultNote;
    @Column(name = "reference_low")
    private String referenceLow;
    @Column(name = "reference_high")
    private String referenceHigh;
    @Column(name = "critical")
    private boolean critical;

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
    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }
    public UUID getVisitId() {
        return visitId;
    }

    public void setVisitId(UUID visitId) {
        this.visitId = visitId;
    }
    public UUID getPrescriptionId() {
        return prescriptionId;
    }

    public void setPrescriptionId(UUID prescriptionId) {
        this.prescriptionId = prescriptionId;
    }
    public String getTestName() {
        return testName;
    }

    public void setTestName(String testName) {
        this.testName = testName;
    }
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public UUID getOrderedBy() {
        return orderedBy;
    }

    public void setOrderedBy(UUID orderedBy) {
        this.orderedBy = orderedBy;
    }
    public Instant getOrderedAt() {
        return orderedAt;
    }

    public void setOrderedAt(Instant orderedAt) {
        this.orderedAt = orderedAt;
    }
    public Instant getReportedAt() {
        return reportedAt;
    }

    public void setReportedAt(Instant reportedAt) {
        this.reportedAt = reportedAt;
    }
    public String getResultValue() {
        return resultValue;
    }

    public void setResultValue(String resultValue) {
        this.resultValue = resultValue;
    }
    public String getResultNote() {
        return resultNote;
    }

    public void setResultNote(String resultNote) {
        this.resultNote = resultNote;
    }
    public String getReferenceLow() {
        return referenceLow;
    }

    public void setReferenceLow(String referenceLow) {
        this.referenceLow = referenceLow;
    }
    public String getReferenceHigh() {
        return referenceHigh;
    }

    public void setReferenceHigh(String referenceHigh) {
        this.referenceHigh = referenceHigh;
    }
    public boolean isCritical() {
        return critical;
    }

    public void setCritical(boolean critical) {
        this.critical = critical;
    }
}
