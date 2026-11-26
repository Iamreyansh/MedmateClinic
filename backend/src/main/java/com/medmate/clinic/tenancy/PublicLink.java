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
 *
 * <p>The link is a bearer credential, so it has a life: it is made of random
 * bytes rather than a number a person can count to, it expires, and the clinic
 * can take it back by revoking it.
 */
@Entity
@Table(name = "public_links", schema = "registry")
public class PublicLink {

    /** A link that opens the patient's place in the queue and their symptoms form. */
    public static final String KIND_BOOKING = "booking";

    /** A link that opens one prescription, for checking. */
    public static final String KIND_VERIFY = "verify";

    @Id
    @Column(name = "link_key")
    private String linkKey;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    /** What the link opens. */
    @Column(name = "kind", nullable = false)
    private String kind = KIND_BOOKING;

    /** The visit the link opens, for a booking link. */
    @Column(name = "visit_id")
    private UUID visitId;

    /** When the link stops working. */
    @Column(name = "expires_at")
    private Instant expiresAt;

    /** When the clinic took the link back. */
    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** When the link was last opened. */
    @Column(name = "used_at")
    private Instant usedAt;

    /** The key a repeated submission carries, so it opens one visit and not two. */
    @Column(name = "idempotency_key")
    private String idempotencyKey;

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
    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }
    public UUID getVisitId() {
        return visitId;
    }

    public void setVisitId(UUID visitId) {
        this.visitId = visitId;
    }
    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }
    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }
    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    /** Whether the link may still be opened. */
    public boolean isLive(Instant now) {
        return revokedAt == null && (expiresAt == null || expiresAt.isAfter(now));
    }
}
