package com.medmate.clinic.tenancy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A clinic, as the directory knows it: who it is and where its data lives. */
@Entity
@Table(name = "clinics", schema = "registry")
public class RegistryClinic {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String initials;

    @Column(name = "schema_name", nullable = false)
    private String schemaName;

    /**
     * The clinic's public booking slug — the tail of its booking link.
     *
     * <p>A patient reaches the booking page through this slug, not through the
     * clinic's id, so the link can be printed on a card and put on a WhatsApp
     * profile without carrying anything about the clinic's schema.
     */
    @Column(name = "booking_slug")
    private String bookingSlug;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getInitials() {
        return initials;
    }

    public void setInitials(String initials) {
        this.initials = initials;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public String getBookingSlug() {
        return bookingSlug;
    }

    public void setBookingSlug(String bookingSlug) {
        this.bookingSlug = bookingSlug;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
