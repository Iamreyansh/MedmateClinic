package com.medmate.clinic.common;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * The keys a patient carries.
 *
 * <p>A patient's link opens their record without a session, so the key is the
 * only thing between the record and whoever has the link. It is therefore made
 * of random bytes, not of a number a person could count to: the clinic issues
 * thousands of links a day and the next one must not be guessable from the
 * last one.
 */
public final class LinkKeys {

    private static final SecureRandom RANDOM = new SecureRandom();

    private LinkKeys() {}

    /**
     * A key with 128 bits of entropy, in the characters that are safe in a URL
     * and in a path segment.
     */
    public static String newKey() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** A key with 256 bits of entropy, for the prescription's own token. */
    public static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
