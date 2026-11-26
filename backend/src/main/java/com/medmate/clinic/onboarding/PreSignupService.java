package com.medmate.clinic.onboarding;

import com.medmate.clinic.auth.PinService;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The number, proved, before the clinic exists.
 *
 * <p>The sign-up begins with a code sent to the owner's number. The number is
 * not yet attached to any clinic — there is no clinic — so the code cannot be
 * checked the way a staff member's code is: it is kept in the registry, with
 * the other things that are true before a clinic exists.
 *
 * <p>The rules are the ones the staff sign-in already uses: a code may not be
 * asked for again straight away, and a code may only be tried a few times
 * before it is spent. Only the hash of the code is kept, stretched the slow
 * way, so a stolen row cannot be read back into a code.
 */
@Service
public class PreSignupService {

    /** How many times one code may be tried before it is spent. */
    private static final int MAX_ATTEMPTS = 5;

    /** How long a number must wait between codes. */
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(30);

    /** How long a code may be given back. */
    private static final Duration CODE_LIFE = Duration.ofMinutes(10);

    /**
     * How long a proved number may still create its clinic.
     *
     * <p>The code is short-lived, but the sign-up that follows it is five
     * steps long, so the proof is given a longer life than the code: half an
     * hour to finish the form, and no longer.
     */
    private static final Duration SIGNUP_WINDOW = Duration.ofMinutes(30);

    private final PendingVerificationRepository verifications;
    private final PinService pins;
    private final SecureRandom random = new SecureRandom();
    private final boolean exposeCode;

    public PreSignupService(
            PendingVerificationRepository verifications,
            PinService pins,
            @Value("${medmate.auth.expose-code}") boolean exposeCode) {
        this.verifications = verifications;
        this.pins = pins;
        this.exposeCode = exposeCode;
    }

    /**
     * Send a code to a number that has no clinic yet.
     *
     * <p>The answer is the one the staff sign-in gives: sent, and the code
     * itself only while the service is in test mode.
     */
    @Transactional
    public Map<String, Object> requestCode(String mobile) {
        String number = digits(mobile);
        if (number.length() != 10) {
            throw new IllegalArgumentException("Enter a 10-digit mobile number.");
        }

        Instant now = Instant.now();
        Optional<PendingVerification> existing = verifications.findByMobile(number);
        if (existing.isPresent() && existing.get().getCreatedAt().isAfter(now.minus(RESEND_COOLDOWN))) {
            long wait = secondsUntil(existing.get().getCreatedAt().plus(RESEND_COOLDOWN), now);
            throw new IllegalArgumentException(
                    "Wait " + wait + " seconds before asking for another code.");
        }

        String code = "%06d".formatted(random.nextInt(1_000_000));
        PendingVerification pending = existing.orElseGet(PendingVerification::new);
        pending.setId(existing.map(PendingVerification::getId).orElseGet(UUID::randomUUID));
        pending.setMobile(number);
        pending.setCodeHash(pins.hash(number, code));
        pending.setAttempts(0);
        pending.setExpiresAt(now.plus(CODE_LIFE));
        pending.setVerified(false);
        pending.setConsumedAt(null);
        pending.setCreatedAt(now);
        verifications.save(pending);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sent", true);
        if (exposeCode) {
            body.put("code", code);
        }
        return body;
    }

    /**
     * Check the code and keep the proof.
     *
     * <p>The failures are the ones the staff sign-in gives: a code that has
     * expired, a code that is not right, and a code that has been tried too
     * many times.
     */
    @Transactional
    public void verify(String mobile, String code) {
        String number = digits(mobile);
        Instant now = Instant.now();
        PendingVerification pending = verifications.findByMobile(number).orElse(null);
        if (pending == null || pending.getExpiresAt().isBefore(now)) {
            if (pending != null) {
                verifications.delete(pending);
            }
            throw new IllegalArgumentException("That code has expired. Ask for a new one.");
        }
        if (!pins.matches(number, pending.getCodeHash(), code)) {
            int attempts = pending.getAttempts() + 1;
            if (attempts > MAX_ATTEMPTS) {
                verifications.delete(pending);
                throw new IllegalArgumentException("Too many tries. Ask for a new code.");
            }
            pending.setAttempts(attempts);
            verifications.save(pending);
            throw new IllegalArgumentException("That code is not right.");
        }
        pending.setVerified(true);
        pending.setAttempts(0);
        pending.setExpiresAt(now.plus(SIGNUP_WINDOW));
        verifications.save(pending);
    }

    /**
     * Spend the proof on a clinic.
     *
     * <p>The claim is one conditional update, so the first sign-up to reach it
     * takes the proof and the second one is refused: one verified number can
     * never create two clinics.
     */
    @Transactional
    public boolean claim(String mobile) {
        String number = digits(mobile);
        if (number.length() != 10) {
            return false;
        }
        return verifications.claim(number, Instant.now()) > 0;
    }

    /** The seconds left, rounded up: never "wait 0 seconds". */
    private static long secondsUntil(Instant moment, Instant now) {
        long seconds = (long) Math.ceil(Duration.between(now, moment).toMillis() / 1000.0);
        return Math.max(1, seconds);
    }

    /** The digits of a number. */
    private static String digits(String value) {
        if (value == null) {
            return "";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        return digits;
    }
}
