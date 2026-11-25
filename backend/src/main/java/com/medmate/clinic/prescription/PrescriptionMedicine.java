package com.medmate.clinic.prescription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * One row of the prescription medicines table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "prescription_medicines")
public class PrescriptionMedicine {

    @Id
    private UUID id;

    @Column(name = "prescription_id")
    private UUID prescriptionId;
    @Column(name = "drug_name")
    private String drugName;
    @Column(name = "generic_name")
    private String genericName;
    @Column(name = "form")
    private String form;
    @Column(name = "dose")
    private String dose;
    @Column(name = "when_text")
    private String whenText;
    @Column(name = "for_days")
    private String forDays;
    @Column(name = "notes")
    private String notes;
    @Column(name = "sort_order")
    private Integer sortOrder;

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
    public String getDrugName() {
        return drugName;
    }

    public void setDrugName(String drugName) {
        this.drugName = drugName;
    }
    public String getGenericName() {
        return genericName;
    }

    public void setGenericName(String genericName) {
        this.genericName = genericName;
    }
    public String getForm() {
        return form;
    }

    public void setForm(String form) {
        this.form = form;
    }
    public String getDose() {
        return dose;
    }

    public void setDose(String dose) {
        this.dose = dose;
    }
    public String getWhenText() {
        return whenText;
    }

    public void setWhenText(String whenText) {
        this.whenText = whenText;
    }
    public String getForDays() {
        return forDays;
    }

    public void setForDays(String forDays) {
        this.forDays = forDays;
    }
    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
