package com.medmate.clinic.visit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One patient waiting to be seen. */
@Entity
@Table(name = "visits")
public class Visit {

    @Id
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(nullable = false)
    private String token;

    @Column(nullable = false)
    private String status = "waiting";

    @Column(nullable = false)
    private String mode = "in_clinic";

    @Column(nullable = false)
    private String source = "walk_in";

    private String reason;
    private String detail;
    private String priority;

    @Column(name = "seen_by")
    private UUID seenBy;

    /** How long the patient waited before the doctor called them in. */
    @Column(name = "waited_minutes")
    private Integer waitedMinutes;

    /** How long the consult itself took. */
    @Column(name = "consult_minutes")
    private Integer consultMinutes;

    @Column(name = "consult_started_at")
    private Instant consultStartedAt;

    /** The patient did not turn up. */
    @Column(name = "no_show")
    private boolean noShow;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

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

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public UUID getSeenBy() {
        return seenBy;
    }

    public void setSeenBy(UUID seenBy) {
        this.seenBy = seenBy;
    }

    public Integer getWaitedMinutes() {
        return waitedMinutes;
    }

    public void setWaitedMinutes(Integer waitedMinutes) {
        this.waitedMinutes = waitedMinutes;
    }

    public Integer getConsultMinutes() {
        return consultMinutes;
    }

    public void setConsultMinutes(Integer consultMinutes) {
        this.consultMinutes = consultMinutes;
    }

    public Instant getConsultStartedAt() {
        return consultStartedAt;
    }

    public void setConsultStartedAt(Instant consultStartedAt) {
        this.consultStartedAt = consultStartedAt;
    }

    public boolean isNoShow() {
        return noShow;
    }

    public void setNoShow(boolean noShow) {
        this.noShow = noShow;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
