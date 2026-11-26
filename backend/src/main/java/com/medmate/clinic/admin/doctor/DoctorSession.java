package com.medmate.clinic.admin.doctor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.util.UUID;

/** One session of a doctor's week: the hours they keep on a day. */
@Entity
@Table(name = "doctor_sessions")
public class DoctorSession {

    @Id
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(nullable = false)
    private int weekday;

    @Column(name = "session_start", nullable = false)
    private LocalTime sessionStart;

    @Column(name = "session_end", nullable = false)
    private LocalTime sessionEnd;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes = 15;

    @Column(nullable = false)
    private boolean active = true;

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

    public UUID getStaffId() {
        return staffId;
    }

    public void setStaffId(UUID staffId) {
        this.staffId = staffId;
    }

    public int getWeekday() {
        return weekday;
    }

    public void setWeekday(int weekday) {
        this.weekday = weekday;
    }

    public LocalTime getSessionStart() {
        return sessionStart;
    }

    public void setSessionStart(LocalTime sessionStart) {
        this.sessionStart = sessionStart;
    }

    public LocalTime getSessionEnd() {
        return sessionEnd;
    }

    public void setSessionEnd(LocalTime sessionEnd) {
        this.sessionEnd = sessionEnd;
    }

    public int getSlotMinutes() {
        return slotMinutes;
    }

    public void setSlotMinutes(int slotMinutes) {
        this.slotMinutes = slotMinutes;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
