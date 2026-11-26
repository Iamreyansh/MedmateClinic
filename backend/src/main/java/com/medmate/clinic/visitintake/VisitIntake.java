package com.medmate.clinic.visitintake;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * What a patient wrote on the symptoms form.
 *
 * <p>The form collects symptoms, red flags and how long it has been going. They
 * are kept, so the doctor reads what the patient wrote and the form knows it
 * has been filled in.
 */
@Entity
@Table(name = "visit_intakes")
public class VisitIntake {

    @Id
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "visit_id", nullable = false)
    private UUID visitId;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "symptoms", columnDefinition = "text[]")
    private String[] symptoms = new String[0];

    @Column(name = "red_flags", columnDefinition = "text[]")
    private String[] redFlags = new String[0];

    @Column(name = "notes")
    private String notes;

    @Column(name = "duration")
    private String duration;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

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
    public String[] getSymptoms() {
        return symptoms;
    }

    public void setSymptoms(String[] symptoms) {
        this.symptoms = symptoms;
    }
    public String[] getRedFlags() {
        return redFlags;
    }

    public void setRedFlags(String[] redFlags) {
        this.redFlags = redFlags;
    }
    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }
    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }
}
