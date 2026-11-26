package com.medmate.clinic.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.auth.PinService;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The small rules the screens depend on.
 */
class ClinicRulesTest {

    @Test
    @DisplayName("an appointment carries the moment it was made")
    void appointmentCarriesItsMoment() {
        Appointment appointment = new Appointment();
        assertThat(appointment.getCreatedAt())
                .as("the column has a default, but the column is mapped — a null here defeats it")
                .isNotNull();
    }

    @Test
    @DisplayName("a PIN is stretched the slow way, and verifies")
    void pinIsHashedAndVerifies() {
        PinService pins = new PinService();
        String staffId = "22222222-2222-4222-8222-222222222222";
        String hash = pins.hash(staffId, "1234");

        assertThat(hash).startsWith("pbkdf2$");
        assertThat(hash.split("\\$")[1])
                .as("at least OWASP's floor for PBKDF2-HMAC-SHA256")
                .isEqualTo(String.valueOf(PinService.ITERATIONS));
        assertThat(Integer.parseInt(hash.split("\\$")[1])).isGreaterThanOrEqualTo(310_000);
        assertThat(pins.matches(staffId, hash, "1234")).isTrue();
        assertThat(pins.matches(staffId, hash, "1235")).isFalse();
        assertThat(pins.needsRehash(hash)).isFalse();
    }

    @Test
    @DisplayName("the older PIN hash still verifies, and is ready to be rewritten")
    void oldPinStillVerifies() {
        PinService pins = new PinService();
        String staffId = "22222222-2222-4222-8222-222222222222";
        // The hash the older scheme made: SHA-256 over the staff id and the PIN.
        String legacy = legacyHash(staffId, "1234");

        assertThat(pins.matches(staffId, legacy, "1234"))
                .as("nobody is locked out by the change")
                .isTrue();
        assertThat(pins.needsRehash(legacy)).as("it is rewritten on the next sign-in").isTrue();
    }

    /** The hash the older scheme made. */
    private static String legacyHash(String staffId, String pin) {
        try {
            byte[] bytes =
                    java.security.MessageDigest.getInstance("SHA-256")
                            .digest((staffId + ":" + pin).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    @DisplayName("a patient's link is not a number anybody can count to")
    void linkKeysAreNotCountable() {
        String one = LinkKeys.newKey();
        String two = LinkKeys.newKey();
        assertThat(one).isNotEqualTo(two);
        assertThat(one.length()).isGreaterThanOrEqualTo(22);
    }

    @Test
    @DisplayName("the limiter turns a caller away once the window is full")
    void limiterCounts() {
        RateLimiter limiter = new RateLimiter(3, 60);
        assertThat(limiter.allow("one")).isTrue();
        assertThat(limiter.allow("one")).isTrue();
        assertThat(limiter.allow("one")).isTrue();
        assertThat(limiter.allow("one")).as("the fourth call is over the line").isFalse();
        assertThat(limiter.allow("two")).as("another caller has their own window").isTrue();
    }
}
