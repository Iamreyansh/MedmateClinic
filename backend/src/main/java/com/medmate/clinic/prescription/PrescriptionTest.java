package com.medmate.clinic.prescription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * One row of the prescription tests table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "prescription_tests")
public class PrescriptionTest {

    @Id
    private UUID id;

    @Column(name = "prescription_id")
    private UUID prescriptionId;
    @Column(name = "name")
    private String name;
    @Column(name = "status")
    private String status;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }
    public UUID getPrescriptionId() {
        return prescriptionId;
    }

    public void setPrescriptionId(UUID prescriptionId) {
        this.prescriptionId = prescriptionId;
    }
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
