package com.medmate.clinic.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Makes sure the test-mode sign-in cannot reach production.
 *
 * <p>While the SMS gateway is not connected, the one-time code comes back in
 * the API response — so anybody who knows a staff member's mobile number can
 * sign in as them. That is fine while developing and unacceptable anywhere
 * else, so the service refuses to start with it turned on outside
 * development.
 */
@Component
public class AuthGuard {

    private static final String DEVELOPMENT_SECRET = "dev-only-secret-change-me-please-32-bytes-min";

    private final String environment;
    private final boolean exposeCode;
    private final String secret;

    public AuthGuard(
            @Value("${medmate.env:development}") String environment,
            @Value("${medmate.auth.expose-code:true}") boolean exposeCode,
            @Value("${medmate.auth.secret}") String secret) {
        this.environment = environment;
        this.exposeCode = exposeCode;
        this.secret = secret;
    }

    @PostConstruct
    public void check() {
        if (isDevelopment()) {
            return;
        }
        if (exposeCode) {
            throw new IllegalStateException(
                    "medmate.auth.expose-code is on: the one-time code is returned to the caller, so"
                            + " anybody who knows a staff mobile number can sign in as them. Set"
                            + " AUTH_EXPOSE_CODE=false outside development.");
        }
        if (DEVELOPMENT_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "medmate.auth.secret is still the development secret. Set AUTH_SECRET before"
                            + " starting the service.");
        }
    }

    private boolean isDevelopment() {
        return "development".equalsIgnoreCase(environment) || "local".equalsIgnoreCase(environment);
    }
}
