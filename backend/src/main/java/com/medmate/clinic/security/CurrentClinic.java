package com.medmate.clinic.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/** Reads the signed-in person out of the request. */
@Component
public class CurrentClinic {

    private final HttpServletRequest request;

    public CurrentClinic(HttpServletRequest request) {
        this.request = request;
    }

    public ClinicPrincipal get() {
        Object principal = request.getAttribute(ClinicPrincipal.class.getName());
        if (principal instanceof ClinicPrincipal clinicPrincipal) {
            return clinicPrincipal;
        }
        throw new IllegalStateException("the request carries no session");
    }
}
