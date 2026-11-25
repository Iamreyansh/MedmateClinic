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

    public java.util.UUID clinicIdAsUuid() {
        return java.util.UUID.fromString(clinicId);
    }

    /** The person asking, as a uuid. */
    public java.util.UUID staffIdAsUuid() {
        return java.util.UUID.fromString(staffId);
    }
}
