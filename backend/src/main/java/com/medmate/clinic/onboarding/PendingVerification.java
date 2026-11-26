package com.medmate.clinic.onboarding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A mobile number that has been proved, before the clinic exists.
 *
 * <p>The sign-up begins with a code sent to the owner's number, and the clinic
 * may only be created once that code has been given back. There is no clinic
 * yet, so this row lives in the registry — it is one of the few things that are
 * true about the world before a clinic exists.
 *
 * <p>The code is never kept: only its hash is, stretched the slow way, so a
 * stolen row cannot be read back into a code.
 */
@Entity
@Table(name = "pending_signup_verifications", schema = "registry")
public class PendingVerification {

    @Id
    private UUID id;

    /** The number the code was sent to, as its digits. */
    @Column(name = "mobile", nullable = false)
    private String mobile;

    /** The code, hashed. */
    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    /** How many times the code has been tried and found wrong. */
    @Column(name = "attempts", nullable = false)
    private int attempts;

    /** When this stops working. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Whether the number has been proved. */
    @Column(name = "verified", nullable = false)
    private boolean verified;

    /** When the proof was spent on a clinic. */
    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public void setCodeHash(String codeHash) {
        this.codeHash = codeHash;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public void setConsumedAt(Instant consumedAt) {
        this.consumedAt = consumedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    /** Whether the proof may still be used. */
    public boolean isUsable(Instant now) {
        return verified && consumedAt == null && expiresAt.isAfter(now);
    }
}
