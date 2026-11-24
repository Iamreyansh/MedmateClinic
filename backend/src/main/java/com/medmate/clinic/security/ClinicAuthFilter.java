package com.medmate.clinic.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the bearer token and puts the person in the request.
 *
 * <p>Public paths are listed here; everything else needs a token.
 */
@Component
public class ClinicAuthFilter extends OncePerRequestFilter {

    private static final String[] PUBLIC_PATHS = {
        "/api/auth/otp", "/api/auth/verify", "/api/auth/pin", "/api/auth/unlock", "/actuator/health"
    };

    private final JwtService jwtService;

    public ClinicAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (isPublic(path)) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                ClinicPrincipal principal = jwtService.verify(header.substring(7).trim());
                request.setAttribute(ClinicPrincipal.class.getName(), principal);
            } catch (IllegalArgumentException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"detail\":\"Please sign in again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
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
