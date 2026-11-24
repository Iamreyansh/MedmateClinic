package com.medmate.clinic.security;

import java.util.List;

/**
 * Who is asking.
 *
 * <p>The clinic id travels in the token, so every query is scoped without the
 * caller having to remember to scope it.
 */
public record ClinicPrincipal(
        String staffId,
        String clinicId,
        String role,
        List<String> capabilities) {

    public boolean can(String resource) {
        return capabilities.contains(resource);
    }
}
