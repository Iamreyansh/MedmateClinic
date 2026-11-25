package com.medmate.clinic.consult;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

/**
 * One row of the consultations table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "consultations")
public class Consultation {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "visit_id")
    private UUID visitId;
    @Column(name = "patient_id")
    private UUID patientId;
    @Column(name = "doctor_id")
    private UUID doctorId;
    @Column(name = "complaints")
    private String complaints;
    @Column(name = "history")
    private String history;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "examination", columnDefinition = "jsonb")
    private List<Map<String, Object>> examination;
    @Column(name = "advice_diet")
    private String adviceDiet;
    @Column(name = "advice_return")
    private String adviceReturn;
    @Column(name = "follow_up_mode")
    private String followUpMode;
    @Column(name = "follow_up_at")
    private Instant followUpAt;
    @Column(name = "follow_up_note")
    private String followUpNote;
    @Column(name = "status")
    private String status;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;

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
    public UUID getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(UUID doctorId) {
        this.doctorId = doctorId;
    }
    public String getComplaints() {
        return complaints;
    }

    public void setComplaints(String complaints) {
        this.complaints = complaints;
    }
    public String getHistory() {
        return history;
    }

    public void setHistory(String history) {
        this.history = history;
    }
    public List<Map<String, Object>> getExamination() {
        return examination;
    }

    public void setExamination(List<Map<String, Object>> examination) {
        this.examination = examination;
    }
    public String getAdviceDiet() {
        return adviceDiet;
    }

    public void setAdviceDiet(String adviceDiet) {
        this.adviceDiet = adviceDiet;
    }
    public String getAdviceReturn() {
        return adviceReturn;
    }

    public void setAdviceReturn(String adviceReturn) {
        this.adviceReturn = adviceReturn;
    }
    public String getFollowUpMode() {
        return followUpMode;
    }

    public void setFollowUpMode(String followUpMode) {
        this.followUpMode = followUpMode;
    }
    public Instant getFollowUpAt() {
        return followUpAt;
    }

    public void setFollowUpAt(Instant followUpAt) {
        this.followUpAt = followUpAt;
    }
    public String getFollowUpNote() {
        return followUpNote;
    }

    public void setFollowUpNote(String followUpNote) {
        this.followUpNote = followUpNote;
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
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
