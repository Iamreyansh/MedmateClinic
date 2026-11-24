package com.medmate.clinic.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Service;

/**
 * The PIN, hashed.
 *
 * <p>The staff id is the salt, so two people with the same PIN do not have the
 * same hash, and a stolen hash cannot be replayed anywhere else.
 */
@Service
public class PinService {

    public String hash(String staffId, String pin) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((staffId + ":" + pin).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public boolean matches(String staffId, String pinHash, String pin) {
        return pinHash != null && pinHash.equals(hash(staffId, pin));
    }
}
