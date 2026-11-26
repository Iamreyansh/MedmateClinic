package com.medmate.clinic.admin;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;

/**
 * What a person may open, decided by the grants and nothing else.
 *
 * <p>The capability set the session carries came from the grants, so the
 * screens and the API read the same map: there is one permission model, and
 * it is the one the clinic already has.
 */
public final class AdminAccess {

    private AdminAccess() {}

    /**
     * Whether the person may open any of the resources.
     *
     * @param message what to tell them when they may not
     */
    public static void require(ClinicPrincipal principal, String message, String... resources) {
        for (String resource : resources) {
            if (principal.can(resource)) {
                return;
            }
        }
        throw new ForbiddenException(message);
    }
}
