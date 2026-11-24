package com.medmate.clinic.security;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Signs and verifies the session tokens. */
@Service
public class JwtService {

    private final byte[] secret;
    private final String issuer;
    private final Duration ttl;

    public JwtService(
            @Value("${medmate.auth.secret}") String secret,
            @Value("${medmate.auth.issuer}") String issuer,
            @Value("${medmate.auth.ttl-minutes}") long ttlMinutes) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public String issue(ClinicPrincipal principal) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject(principal.staffId())
                .claim("clinic_id", principal.clinicId())
                .claim("role", principal.role())
                .claim("capabilities", principal.capabilities())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(ttl)))
                .build();

        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), claims);
        try {
            jwt.sign(new MACSigner(secret));
        } catch (Exception e) {
            throw new IllegalStateException("could not sign the session token", e);
        }
        return jwt.serialize();
    }

    public ClinicPrincipal verify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(new MACVerifier(secret))) {
                throw new IllegalArgumentException("bad signature");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            List<String> capabilities = claims.getStringListClaim("capabilities");
            return new ClinicPrincipal(
                    claims.getSubject(),
                    claims.getStringClaim("clinic_id"),
                    claims.getStringClaim("role"),
                    capabilities == null ? List.of() : capabilities);
        } catch (Exception e) {
            throw new IllegalArgumentException("the session token is not valid", e);
        }
    }
}
