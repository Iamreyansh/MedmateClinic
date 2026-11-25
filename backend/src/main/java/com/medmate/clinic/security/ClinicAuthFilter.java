package com.medmate.clinic.security;

import com.medmate.clinic.tenancy.ClinicRouting;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the bearer token, puts the person in the request, and points the
 * request at their clinic's schema.
 *
 * <p>Public paths are listed here; everything else needs a token. The schema is
 * set before the controller runs and cleared after, so every statement the
 * controller makes is inside the caller's own clinic.
 */
@Component
public class ClinicAuthFilter extends OncePerRequestFilter {

    private static final String[] PUBLIC_PATHS = {
        "/api/auth/otp", "/api/auth/verify", "/api/auth/unlock", "/api/auth/signup", "/actuator/health"
    };

    private final JwtService jwtService;
    private final ClinicRouting routing;

    public ClinicAuthFilter(JwtService jwtService, ClinicRouting routing) {
        this.jwtService = jwtService;
        this.routing = routing;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (isPublic(path)) {
            try {
                chain.doFilter(request, response);
            } finally {
                routing.clear();
            }
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            // No token at all. The request is not signed in, so it is refused
            // here — otherwise it reaches a controller that throws, and the
            // person sees a server error instead of being asked to sign in.
            unauthorized(response, "Please sign in again.");
            return;
        }

        try {
            ClinicPrincipal principal = jwtService.verify(header.substring(7).trim());
            request.setAttribute(ClinicPrincipal.class.getName(), principal);
            routing.route(java.util.UUID.fromString(principal.clinicId()));
        } catch (IllegalArgumentException e) {
            unauthorized(response, "Please sign in again.");
            return;
        }
        try {
            chain.doFilter(request, response);
        } finally {
            routing.clear();
        }
    }

    /** The 401 the API answers with when the session is missing or expired. */
    private void unauthorized(HttpServletResponse response, String detail) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"title\":\"Please sign in\",\"detail\":\"" + detail + "\"}");
    }

    private boolean isPublic(String path) {
        for (String publicPath : PUBLIC_PATHS) {
            if (path.startsWith(publicPath)) {
                return true;
            }
        }
        return false;
    }
}
