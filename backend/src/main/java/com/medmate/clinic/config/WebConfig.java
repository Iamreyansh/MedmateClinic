package com.medmate.clinic.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Lets the SPA talk to the API from its own host.
 *
 * <p>The allowlist is configuration, not code: {@code CORS_ALLOWED_ORIGINS} is a
 * comma separated list of the origins the clinic's SPA is served from, and it
 * defaults to the two development origins. A deployment that serves the SPA
 * from anywhere else sets the variable and the API follows it.
 *
 * <p>Credentials are on, because the session token and the kiosk's own
 * conversation travel with the request. A wildcard is therefore expressed as an
 * origin <em>pattern</em>: Spring refuses a literal {@code *} once credentials
 * are allowed, and a pattern is the way to say "any origin" without breaking
 * that rule.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final List<String> origins;

    public WebConfig(@Value("${medmate.cors.origins}") String origins) {
        this.origins =
                Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .toList();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        CorsRegistration registration =
                registry.addMapping("/api/**")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
        if (origins.contains("*")) {
            registration.allowedOriginPatterns(origins.toArray(String[]::new));
        } else {
            registration.allowedOrigins(origins.toArray(String[]::new));
        }
    }
}
