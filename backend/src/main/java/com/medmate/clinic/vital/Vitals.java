package com.medmate.clinic.vital;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One row of the vitals table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "vitals")
public class Vitals {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "patient_id")
    private UUID patientId;
    @Column(name = "visit_id")
    private UUID visitId;
    @Column(name = "recorded_by")
    private UUID recordedBy;
    @Column(name = "recorded_at")
    private Instant recordedAt;
    @Column(name = "temp_f")
    private BigDecimal tempF;
    @Column(name = "bp_systolic")
    private Integer bpSystolic;
    @Column(name = "bp_diastolic")
    private Integer bpDiastolic;
    @Column(name = "pulse")
    private Integer pulse;
    @Column(name = "spo2")
    private Integer spo2;
    @Column(name = "weight_kg")
    private BigDecimal weightKg;
    @Column(name = "height_cm")
    private BigDecimal heightCm;
    @Column(name = "sugar_mg")
    private Integer sugarMg;

    @Column(name = "breath_rate")
    private Integer breathRate;

    @Column(name = "sent_to")
    private UUID sentTo;

    @Column(name = "note")
    private String note;
    @Column(name = "priority")
    private String priority;

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
    public UUID getRecordedBy() {
        return recordedBy;
    }

    public void setRecordedBy(UUID recordedBy) {
        this.recordedBy = recordedBy;
    }
    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
    public BigDecimal getTempF() {
        return tempF;
    }

    public void setTempF(BigDecimal tempF) {
        this.tempF = tempF;
    }
    public Integer getBpSystolic() {
        return bpSystolic;
    }

    public void setBpSystolic(Integer bpSystolic) {
        this.bpSystolic = bpSystolic;
    }
    public Integer getBpDiastolic() {
        return bpDiastolic;
    }

    public void setBpDiastolic(Integer bpDiastolic) {
        this.bpDiastolic = bpDiastolic;
    }
    public Integer getPulse() {
        return pulse;
    }

    public void setPulse(Integer pulse) {
        this.pulse = pulse;
    }
    public Integer getSpo2() {
        return spo2;
    }

    public void setSpo2(Integer spo2) {
        this.spo2 = spo2;
    }
    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }
    public BigDecimal getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(BigDecimal heightCm) {
        this.heightCm = heightCm;
    }
    public Integer getSugarMg() {
        return sugarMg;
    }

    public void setSugarMg(Integer sugarMg) {
        this.sugarMg = sugarMg;
    }

    public Integer getBreathRate() {
        return breathRate;
    }

    public void setBreathRate(Integer breathRate) {
        this.breathRate = breathRate;
    }

    public UUID getSentTo() {
        return sentTo;
    }

    public void setSentTo(UUID sentTo) {
        this.sentTo = sentTo;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
}
