package com.medmate.clinic.admin.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An agreement the clinic has accepted, and when it accepted it. */
@Entity
@Table(name = "clinic_agreements")
public class ClinicAgreement {

    @Id
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(nullable = false)
    private String kind;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String version;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt = Instant.now();

    @Column(name = "accepted_by")
    private UUID acceptedBy;

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

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(Instant acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public UUID getAcceptedBy() {
        return acceptedBy;
    }

    public void setAcceptedBy(UUID acceptedBy) {
        this.acceptedBy = acceptedBy;
    }
}
