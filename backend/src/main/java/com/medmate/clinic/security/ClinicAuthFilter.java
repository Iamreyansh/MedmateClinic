package com.medmate.clinic.security;

import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.common.UnauthorizedException;
import com.medmate.clinic.tenancy.ClinicRouting;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the session, puts the person in the request, and points the request at
 * their clinic's schema.
 *
 * <p>Public paths are listed here; everything else needs a token. The schema is
 * set before the controller runs and cleared after, so every statement the
 * controller makes is inside the caller's own clinic.
 */
@Component
public class ClinicAuthFilter extends OncePerRequestFilter {

    private static final String[] PUBLIC_PATHS = {
        "/api/auth/otp", "/api/auth/verify", "/api/auth/unlock", "/api/auth/signup",
        "/api/auth/pre-signup", "/actuator/health"
    };

    /**
     * The patient's own surfaces. They have no session, so the path itself says
     * which clinic they are in: the booking page carries the clinic's slug, and
     * the token, the intake form and the verification carry the patient's own
     * link.
     */
    private static final String[] PATIENT_PATHS = {
        "/api/public/", "/api/token/", "/api/intake/", "/api/verify/"
    };

    /**
     * The kiosk. A patient at the tablet is not staff, so the kiosk's own
     * conversation needs no session. Closing it does: the front desk signs in
     * and gives their PIN, and {@code /api/kiosk/close} is deliberately not on
     * this list.
     */
    private static final String[] KIOSK_PATHS = {
        "/api/kiosk", "/api/kiosk/open", "/api/kiosk/code", "/api/kiosk/verify",
        "/api/kiosk/patient", "/api/kiosk/doctor", "/api/kiosk/pay", "/api/kiosk/token",
        "/api/kiosk/reset", "/api/kiosk/language"
    };

    private final JwtService jwtService;
    private final ClinicRouting routing;
    private final java.util.List<String> allowedOrigins;

    public ClinicAuthFilter(
            JwtService jwtService,
            ClinicRouting routing,
            @org.springframework.beans.factory.annotation.Value("${medmate.cors.origins}")
                    String origins) {
        this.jwtService = jwtService;
        this.routing = routing;
        this.allowedOrigins =
                java.util.Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .toList();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // A preflight is the browser asking whether it may make the call. It
        // carries no session by design, so it is answered by the CORS handler
        // and never by the session check.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            try {
                chain.doFilter(request, response);
            } finally {
                routing.clear();
            }
            return;
        }

        if (isPublic(path) || isKiosk(path)) {
            try {
                chain.doFilter(request, response);
            } finally {
                routing.clear();
            }
            return;
        }

        // The patient's own surfaces have no session, so the path says which
        // clinic they are in. A link that cannot be placed is refused here,
        // rather than reaching a controller that cannot answer.
        if (isPatientPath(path)) {
            try {
                routePatient(request, path);
                chain.doFilter(request, response);
            } catch (NotFoundException e) {
                notFound(request, response, e.getMessage());
                return;
            } catch (UnauthorizedException e) {
                unauthorized(request, response, e.getMessage());
                return;
            } finally {
                routing.clear();
            }
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            // No session at all. The request is not signed in, so it is refused
            // here — otherwise it reaches a controller that throws, and the
            // person sees a server error instead of being asked to sign in.
            unauthorized(request, response, "Please sign in again.");
            return;
        }

        try {
            ClinicPrincipal principal = jwtService.verify(header.substring(7).trim());
            request.setAttribute(ClinicPrincipal.class.getName(), principal);
            routing.route(java.util.UUID.fromString(principal.clinicId()));
        } catch (IllegalArgumentException e) {
            unauthorized(request, response, "Please sign in again.");
            return;
        }
        try {
            chain.doFilter(request, response);
        } finally {
            routing.clear();
        }
    }

    /** The 401 the API answers with when the session is missing or expired. */
    private void unauthorized(HttpServletRequest request, HttpServletResponse response, String detail)
            throws IOException {
        allowOrigin(request, response);
        write(response, HttpServletResponse.SC_UNAUTHORIZED, "Please sign in", detail);
    }

    /** The 404 the API answers with when the thing asked for is not there. */
    private void notFound(HttpServletRequest request, HttpServletResponse response, String detail)
            throws IOException {
        allowOrigin(request, response);
        write(response, HttpServletResponse.SC_NOT_FOUND, "Not found", detail);
    }

    /**
     * The error envelope, in the one shape the whole API uses:
     * {@code {"title": ..., "detail": ...}}.
     */
    private void write(HttpServletResponse response, int status, String title, String detail)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter()
                .write(
                        "{\"title\":\""
                                + escape(title)
                                + "\",\"detail\":\""
                                + escape(detail)
                                + "\"}");
    }

    /**
     * The headers that let the browser read the answer.
     *
     * <p>The filter answers some requests itself, before the CORS processor
     * ever sees them, so it has to say which origins may read what it wrote.
     * The origin is echoed — never {@code *} — because the answer may carry
     * the session.
     */
    private void allowOrigin(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank() || !allowedOrigins.contains(origin)) {
            return;
        }
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Vary", "Origin");
    }

    /** The detail is a sentence the clinic wrote; quotes must not break it. */
    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }

    private boolean isPublic(String path) {
        for (String publicPath : PUBLIC_PATHS) {
            if (path.startsWith(publicPath)) {
                return true;
            }
        }
        return false;
    }

    private boolean isKiosk(String path) {
        for (String kioskPath : KIOSK_PATHS) {
            if (path.equals(kioskPath)) {
                return true;
            }
        }
        return false;
    }

    private boolean isPatientPath(String path) {
        for (String patientPath : PATIENT_PATHS) {
            if (path.startsWith(patientPath)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Point a patient's request at their clinic.
     *
     * <p>The booking page carries the clinic's slug. The token, the intake form
     * and the verification carry the patient's own link, which the clinic
     * recorded when it handed it out.
     *
     * <p>The slug is only ever read for the booking page. A caller cannot carry
     * a slug into the link routes and have the request pointed at another
     * clinic's schema — the link alone says which clinic the patient is in.
     */
    private void routePatient(HttpServletRequest request, String path) {
        // The booking page carries the clinic's slug.
        if (path.startsWith("/api/public/doctors")) {
            String slug = request.getParameter("clinic");
            if (slug != null && !slug.isBlank()) {
                routing.routeBySlug(slug);
                return;
            }
        }

        // The booking names its clinic in the body, so the controller reads it
        // from there and routes the request itself. The filter must not treat
        // the path as a patient's link.
        if (path.startsWith("/api/public/booking")) {
            if (path.startsWith("/api/public/booking/")) {
                // The cancellation carries the patient's own link key, so the
                // link says which clinic they are in.
                String key = segmentAfter(path, "/api/public/booking/");
                if (key == null) {
                    throw new UnauthorizedException("This link is not valid.");
                }
                routing.routeByLink(key);
            }
            return;
        }

        String linkKey = linkKeyOf(path);
        if (linkKey == null) {
            throw new UnauthorizedException("This link is not valid.");
        }
        routing.routeByLink(linkKey);
    }

    /** The first path segment after a prefix, if there is one. */
    private static String segmentAfter(String path, String prefix) {
        String rest = path.substring(prefix.length());
        int slash = rest.indexOf('/');
        String segment = slash == -1 ? rest : rest.substring(0, slash);
        return segment.isEmpty() ? null : segment;
    }

    /** The patient's own key, taken from the path. */
    private String linkKeyOf(String path) {
        for (String patientPath : PATIENT_PATHS) {
            if (!path.startsWith(patientPath)) {
                continue;
            }
            String rest = path.substring(patientPath.length());
            int slash = rest.indexOf('/');
            if (slash == -1) {
                return rest.isEmpty() ? null : rest;
            }
            return rest.substring(0, slash).isEmpty() ? null : rest.substring(0, slash);
        }
        return null;
    }
}
