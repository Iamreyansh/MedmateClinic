package com.medmate.clinic.admin;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The failures the admin screens raise for themselves.
 *
 * <p>They answer in the same envelope the rest of the API uses — a title and
 * a sentence for a person — so nothing from the framework reaches the
 * screen. This advice is asked before the service's own, because it is the
 * one that knows what these failures mean.
 */
@RestControllerAdvice(basePackages = "com.medmate.clinic.admin")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AdminExceptionHandler {

    /**
     * Something the clinic has to sort out before the change can happen.
     *
     * <p>It is not a failure of the request; the request was understood. It
     * is the service saying "not yet, and here is why".
     */
    @ExceptionHandler(AdminConflictException.class)
    public ResponseEntity<Map<String, Object>> conflict(AdminConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("title", "Not allowed", "detail", e.getMessage()));
    }
}
