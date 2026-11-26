package com.medmate.clinic.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Service;

/**
 * The PIN, hashed.
 *
 * <p>A PIN is short, so it is stretched the slow way: PBKDF2-HMAC-SHA256 over
 * a random salt, with at least 310,000 rounds. A stolen hash cannot be
 * attacked without paying for every round, and a four-digit PIN has only
 * ten thousand answers to try.
 *
 * <p>The salt and the round count are stored with the hash, so the parameters
 * can be raised later and the old hashes still verify — and are then rewritten
 * in the new format the next time their owner signs in.
 */
@Service
public class PinService {

    /** OWASP's floor for PBKDF2-HMAC-SHA256. */
    public static final int ITERATIONS = 310_000;

    private static final int KEY_LENGTH_BITS = 256;
    private static final int SALT_BYTES = 16;
    private static final String PREFIX = "pbkdf2";

    private final SecureRandom random = new SecureRandom();

    /**
     * Hash a PIN the way it is stored from now on.
     *
     * <p>The stored form is {@code pbkdf2$<rounds>$<salt>$<hash>}, so the
     * parameters travel with the hash.
     */
    public String hash(String staffId, String pin) {
        byte[] salt = new byte[SALT_BYTES];
        random.nextBytes(salt);
        return encode(ITERATIONS, salt, derive(staffId, salt, pin));
    }

    /**
     * Whether a PIN is the one the hash was made from.
     *
     * <p>The derived key is compared in constant time, so the answer does not
     * tell an attacker how much of the PIN they guessed right.
     *
     * <p>A hash made by the older scheme — the staff id salted with SHA-256 —
     * still verifies, so nobody is locked out by the change; it is rewritten in
     * the new format the next time it is used.
     */
    public boolean matches(String staffId, String pinHash, String pin) {
        if (pinHash == null || pinHash.isBlank() || pin == null) {
            return false;
        }
        if (pinHash.startsWith(PREFIX + "$")) {
            String[] parts = pinHash.split("\\$");
            if (parts.length != 4) {
                return false;
            }
            try {
                int rounds = Integer.parseInt(parts[1]);
                byte[] salt = HexFormat.of().parseHex(parts[2]);
                byte[] expected = HexFormat.of().parseHex(parts[3]);
                return MessageDigest.isEqual(expected, derive(staffId, salt, pin, rounds));
            } catch (RuntimeException notAHash) {
                return false;
            }
        }
        return legacyMatches(staffId, pinHash, pin);
    }

    /**
     * Whether the hash should be written again in the current format.
     *
     * <p>A hash made by the older scheme, or one made with fewer rounds than
     * the service uses now, is ready to be replaced.
     */
    public boolean needsRehash(String pinHash) {
        if (pinHash == null || pinHash.isBlank()) {
            return false;
        }
        if (!pinHash.startsWith(PREFIX + "$")) {
            return true;
        }
        String[] parts = pinHash.split("\\$");
        if (parts.length != 4) {
            return true;
        }
        try {
            return Integer.parseInt(parts[1]) < ITERATIONS;
        } catch (NumberFormatException notARoundCount) {
            return true;
        }
    }

    /** The old scheme: SHA-256 over the staff id and the PIN. */
    private boolean legacyMatches(String staffId, String pinHash, String pin) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((staffId + ":" + pin).getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(
                    pinHash.getBytes(StandardCharsets.UTF_8),
                    HexFormat.of().formatHex(bytes).getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    /**
     * The derived key.
     *
     * <p>The staff id is part of the salt, so the same PIN for two people
     * gives two keys: a hash cannot be carried from one person to another.
     */
    private static byte[] derive(String staffId, byte[] salt, String pin) {
        return derive(staffId, salt, pin, ITERATIONS);
    }

    /** The derived key, with the rounds the hash was made with. */
    private static byte[] derive(String staffId, byte[] salt, String pin, int rounds) {
        try {
            PBEKeySpec spec =
                    new PBEKeySpec(
                            pin.toCharArray(), saltedWith(staffId, salt), rounds, KEY_LENGTH_BITS);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return factory.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("PBKDF2 is not available", e);
        }
    }

    /** The salt the key is derived with: the person and the random salt. */
    private static byte[] saltedWith(String staffId, byte[] salt) {
        byte[] who = staffId == null ? new byte[0] : staffId.getBytes(StandardCharsets.UTF_8);
        byte[] salted = new byte[who.length + salt.length];
        System.arraycopy(who, 0, salted, 0, who.length);
        System.arraycopy(salt, 0, salted, who.length, salt.length);
        return salted;
    }

    /** The stored form of a hash. */
    private static String encode(int rounds, byte[] salt, byte[] key) {
        return PREFIX
                + "$"
                + rounds
                + "$"
                + HexFormat.of().formatHex(salt)
                + "$"
                + HexFormat.of().formatHex(key);
    }

    /** The salt, for a caller that wants to store it apart from the hash. */
    public String newSalt() {
        byte[] salt = new byte[SALT_BYTES];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }
}
