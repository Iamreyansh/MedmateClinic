package com.medmate.clinic.admin.staff;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * The exception one person has to their role.
 *
 * <p>The role decides what a person may open, and that comes from the grants.
 * This is what the clinic changed for this one person: a resource they may
 * open beyond their role, or one they may not. It lives on the person's own
 * row, because it is about that person and nobody else.
 */
@Repository
public class AdminStaffAccessStore {

    private static final TypeReference<Map<String, String>> OVERRIDES =
            new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AdminStaffAccessStore(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** What the clinic changed for this person. */
    public Map<String, String> read(UUID clinicId, UUID staffId) {
        List<String> rows =
                jdbc.query(
                        "select access_overrides from staff where clinic_id = ? and id = ?",
                        (rs, rowNum) -> rs.getString(1),
                        clinicId,
                        staffId);
        if (rows.isEmpty() || rows.get(0) == null || rows.get(0).isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, String> parsed = mapper.readValue(rows.get(0), OVERRIDES);
            return parsed == null ? new LinkedHashMap<>() : new LinkedHashMap<>(parsed);
        } catch (Exception notJson) {
            return new LinkedHashMap<>();
        }
    }

    /** Write the exception down, replacing what was there. */
    public void write(UUID clinicId, UUID staffId, Map<String, String> overrides) {
        String json;
        try {
            json = mapper.writeValueAsString(overrides == null ? Map.of() : overrides);
        } catch (Exception cannotWrite) {
            throw new IllegalArgumentException("Those access changes could not be written.");
        }
        jdbc.update(
                "update staff set access_overrides = ?::jsonb where clinic_id = ? and id = ?",
                json,
                clinicId,
                staffId);
    }
}
