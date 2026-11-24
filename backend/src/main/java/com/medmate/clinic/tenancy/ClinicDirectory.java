package com.medmate.clinic.tenancy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** Which clinic a mobile number belongs to. */
@Entity
@Table(name = "clinic_staff_directory", schema = "registry")
public class ClinicDirectory {

    @Id
    private String phone;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
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
}
