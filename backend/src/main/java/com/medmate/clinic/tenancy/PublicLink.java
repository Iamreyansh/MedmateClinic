package com.medmate.clinic.tenancy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A patient's own link, and the clinic it belongs to.
 *
 * <p>A patient on their phone has no session, so the link they were given is
 * the only thing that says which clinic they are in. The service records the
 * link when the clinic hands it out, so the request can be routed to the right
 * schema without the patient signing in.
 */
@Entity
@Table(name = "public_links", schema = "registry")
public class PublicLink {

    @Id
    @Column(name = "link_key")
    private String linkKey;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getLinkKey() {
        return linkKey;
    }

    public void setLinkKey(String linkKey) {
        this.linkKey = linkKey;
    }

    public UUID getClinicId() {
        return clinicId;
    }

    public void setClinicId(UUID clinicId) {
        this.clinicId = clinicId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
