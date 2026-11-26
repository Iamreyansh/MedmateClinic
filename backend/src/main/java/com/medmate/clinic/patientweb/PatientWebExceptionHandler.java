package com.medmate.clinic.patientweb;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The failures of the patient's own screens.
 *
 * <p>The envelope is the one the whole API uses — {@code {"title": ...,
 * "detail": ...}} — and the status says "try again", not "something went
 * wrong": a slot that is taken and a key that has been used are both the
 * caller's to answer, and neither is a fault in the service.
 */
@RestControllerAdvice(assignableTypes = PatientWebController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PatientWebExceptionHandler {

    /** The slot is taken, or the key has been used for something else. */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> conflict(ConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("title", e.getTitle(), "detail", e.getMessage()));
    }

    /**
     * The database refused the booking: the slot was taken between the check
     * and the write.
     *
     * <p>It is the same answer as the check's — the slot is no longer
     * available — and it is never a server error.
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> slotTakenByAnother(
            org.springframework.dao.DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("title", "Slot no longer available", "detail", "Pick another time."));
    }
}
