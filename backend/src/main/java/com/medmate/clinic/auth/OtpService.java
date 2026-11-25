package com.medmate.clinic.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * The one-time code, and the challenge it opens.
 *
 * <p>In production the code is sent by SMS. Until the SMS gateway is connected
 * the code is returned to the caller, and only when the service is in test mode.
 *
 * <p>The code opens a challenge rather than a session: the person still has to
 * prove they hold the device by giving the PIN.
 */
@Service
public class OtpService {

    /** How many times one code may be tried before it is spent. */
    private static final int MAX_ATTEMPTS = 5;

    /** How long a number must wait between codes. */
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(30);

    private final SecureRandom random = new SecureRandom();
    private final Duration ttl;
    private final boolean exposeCode;
    private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();
    /** The last time a code was sent to a number, so the send is rate limited. */
    private final Map<String, Instant> lastSent = new ConcurrentHashMap<>();

    public OtpService(
            @Value("${medmate.auth.otp-ttl-minutes}") long ttlMinutes,
            @Value("${medmate.auth.expose-code}") boolean exposeCode) {
        this.ttl = Duration.ofMinutes(ttlMinutes);
        this.exposeCode = exposeCode;
    }

    /**
     * Send a code to a mobile number.
     *
     * <p>The code is spent after a few tries, and a number may not ask for a new
     * one every second. Without both, anybody who knows a staff member's mobile
     * number could try the million possible codes until one worked.
     */
    public Issued issue(String phone) {
        Instant now = Instant.now();
        Instant previous = lastSent.get(phone);
        if (previous != null && now.isBefore(previous.plus(RESEND_COOLDOWN))) {
            long wait = java.time.Duration.between(now, previous.plus(RESEND_COOLDOWN)).toSeconds();
            throw new IllegalArgumentException(
                    "Wait " + wait + " seconds before asking for another code.");
        }

        String code = "%06d".formatted(random.nextInt(1_000_000));
        Instant expiresAt = now.plus(ttl);
        challenges.put(phone, new Challenge(code, expiresAt, 0));
        lastSent.put(phone, now);
        return new Issued(exposeCode ? code : null, expiresAt);
    }

    /**
     * Check the code. It is spent: one code, one session.
     *
     * <p>A few wrong tries and the code is spent too, so a million guesses
     * cannot be spread over one code.
     */
    public boolean verify(String phone, String code) {
        Challenge challenge = challenges.get(phone);
        if (challenge == null || challenge.expiresAt().isBefore(Instant.now())) {
            challenges.remove(phone);
            throw new IllegalArgumentException("That code has expired. Ask for a new one.");
        }
        if (!challenge.code().equals(code)) {
            int attempts = challenge.attempts() + 1;
            if (attempts >= MAX_ATTEMPTS) {
                challenges.remove(phone);
                throw new IllegalArgumentException("Too many tries. Ask for a new code.");
            }
            challenges.put(phone, new Challenge(challenge.code(), challenge.expiresAt(), attempts));
            throw new IllegalArgumentException("That code is not right.");
        }
        challenges.remove(phone);
        lastSent.remove(phone);
        return true;
    }

    /** The code and when it stops working. */
    public record Issued(String exposedCode, Instant expiresAt) {}

    private record Challenge(String code, Instant expiresAt, int attempts) {}
}
