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

    private final SecureRandom random = new SecureRandom();
    private final Duration ttl;
    private final boolean exposeCode;
    private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();

    public OtpService(
            @Value("${medmate.auth.otp-ttl-minutes}") long ttlMinutes,
            @Value("${medmate.auth.expose-code}") boolean exposeCode) {
        this.ttl = Duration.ofMinutes(ttlMinutes);
        this.exposeCode = exposeCode;
    }

    /** Send a code to a mobile number. */
    public Issued issue(String phone) {
        String code = "%06d".formatted(random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(ttl);
        challenges.put(phone, new Challenge(code, expiresAt));
        return new Issued(exposeCode ? code : null, expiresAt);
    }

    /** Check the code. It is spent: one code, one session. */
    public boolean verify(String phone, String code) {
        Challenge challenge = challenges.get(phone);
        if (challenge == null || challenge.expiresAt().isBefore(Instant.now())) {
            challenges.remove(phone);
            throw new IllegalArgumentException("That code has expired. Ask for a new one.");
        }
        if (!challenge.code().equals(code)) {
            throw new IllegalArgumentException("That code is not right.");
        }
        challenges.remove(phone);
        return true;
    }

    /** The code and when it stops working. */
    public record Issued(String exposedCode, Instant expiresAt) {}

    private record Challenge(String code, Instant expiresAt) {}
}
