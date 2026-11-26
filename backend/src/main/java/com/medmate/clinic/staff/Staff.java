package com.medmate.clinic.staff;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A person who works in a clinic. */
@Entity
@Table(name = "staff")
public class Staff {

    @Id
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "role_id")
    private UUID roleId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String mobile;

    private String email;
    private String registration;
    private String hprId;
    private String speciality;

    /** The room the doctor works in. */
    private String room;

    /** What this doctor charges for a consultation. */
    @Column(name = "consultation_fee")
    private java.math.BigDecimal consultationFee = java.math.BigDecimal.ZERO;

    /** What the doctor charges for a video consultation. */
    @Column(name = "video_fee")
    private java.math.BigDecimal videoFee = java.math.BigDecimal.ZERO;

    /** The PIN, hashed with the staff id as the salt. */
    @Column(name = "pin_hash")
    private String pinHash;

    @Column(name = "active", nullable = false)
    private boolean active = true;

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

    public UUID getRoleId() {
        return roleId;
    }

    public void setRoleId(UUID roleId) {
        this.roleId = roleId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRegistration() {
        return registration;
    }

    public void setRegistration(String registration) {
        this.registration = registration;
    }

    public String getHprId() {
        return hprId;
    }

    public void setHprId(String hprId) {
        this.hprId = hprId;
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public java.math.BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public void setConsultationFee(java.math.BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public String getPinHash() {
        return pinHash;
    }

    public java.math.BigDecimal getVideoFee() {
        return videoFee;
    }

    public void setVideoFee(java.math.BigDecimal videoFee) {
        this.videoFee = videoFee;
    }

    public void setPinHash(String pinHash) {
        this.pinHash = pinHash;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
