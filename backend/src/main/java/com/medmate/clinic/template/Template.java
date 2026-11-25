package com.medmate.clinic.template;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One row of the templates table.
 *
 * <p>Every table in a clinic's schema carries the clinic id, and every query is
 * scoped by the clinic in the session.
 */
@Entity
@Table(name = "templates")
public class Template {

    @Id
    private UUID id;

    @Column(name = "clinic_id")
    private UUID clinicId;
    @Column(name = "name")
    private String name;
    @Column(name = "diagnosis_code")
    private String diagnosisCode;
    @Column(name = "condition")
    private String condition;

    /** The protocol, line by line. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "lines", columnDefinition = "jsonb")
    private List<Map<String, Object>> lines;
    @Column(name = "used_count")
    private Integer usedCount;
    @Column(name = "owner_staff_id")
    private UUID ownerStaffId;
    @Column(name = "shared")
    private boolean shared;
    @Column(name = "created_at")
    private Instant createdAt;

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
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
    public String getDiagnosisCode() {
        return diagnosisCode;
    }

    public void setDiagnosisCode(String diagnosisCode) {
        this.diagnosisCode = diagnosisCode;
    }
    public String getCondition() {
        return condition;
    }

    public void setCondition(String condition) {
        this.condition = condition;
    }
    public List<Map<String, Object>> getLines() {
        return lines;
    }

    public void setLines(List<Map<String, Object>> lines) {
        this.lines = lines;
    }
    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }
    public UUID getOwnerStaffId() {
        return ownerStaffId;
    }

    public void setOwnerStaffId(UUID ownerStaffId) {
        this.ownerStaffId = ownerStaffId;
    }
    public boolean isShared() {
        return shared;
    }

    public void setShared(boolean shared) {
        this.shared = shared;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
