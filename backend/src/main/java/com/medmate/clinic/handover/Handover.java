package com.medmate.clinic.handover;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One row of the handovers table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "handovers")
public class Handover {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "visit_id")
    private UUID visitId;
    @Column(name = "patient_id")
    private UUID patientId;
    @Column(name = "from_staff_id")
    private UUID fromStaffId;
    @Column(name = "to_staff_id")
    private UUID toStaffId;
    @Column(name = "note")
    private String note;
    @Column(name = "status")
    private String status;
    @Column(name = "created_at")
    private Instant createdAt;

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
    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }
    public UUID getFromStaffId() {
        return fromStaffId;
    }

    public void setFromStaffId(UUID fromStaffId) {
        this.fromStaffId = fromStaffId;
    }
    public UUID getToStaffId() {
        return toStaffId;
    }

    public void setToStaffId(UUID toStaffId) {
        this.toStaffId = toStaffId;
    }
    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
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
}
