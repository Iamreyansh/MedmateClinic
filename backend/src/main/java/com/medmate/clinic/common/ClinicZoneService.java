package com.medmate.clinic.common;

import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The time a clinic works in.
 *
 * <p>A clinic's day starts at midnight where the clinic is, not where the
 * server is. Every "today" on a screen — the queue, the billing day, the
 * appointment grid — is counted in the clinic's own zone, so a clinic in
 * another timezone still closes its day at its own midnight.
 */
@Component
public class ClinicZoneService {

    private static final ZoneId FALLBACK = ZoneId.of("Asia/Kolkata");

    private final JdbcTemplate jdbc;

    public ClinicZoneService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** The zone the clinic is in. */
    public ZoneId zoneOf(UUID clinicId) {
        List<String> zones =
                jdbc.query(
                        "select timezone from clinic_profile where clinic_id = ?",
                        (rs, row) -> rs.getString(1),
                        clinicId);
        if (zones.isEmpty() || zones.get(0) == null || zones.get(0).isBlank()) {
            return FALLBACK;
        }
        try {
            return ZoneId.of(zones.get(0));
        } catch (RuntimeException notAKnownZone) {
            return FALLBACK;
        }
    }
}
