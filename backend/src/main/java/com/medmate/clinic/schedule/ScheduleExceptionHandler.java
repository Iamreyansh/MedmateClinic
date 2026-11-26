package com.medmate.clinic.schedule;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The failures of the appointment book.
 *
 * <p>A slot that is taken is the desk's to answer, not the service's: the
 * envelope is the one the whole API uses, and the status says "try another
 * time". The database's own answer — a booking that would take a slot
 * another live booking holds — is answered the same way, and never as a
 * server error.
 */
@RestControllerAdvice(assignableTypes = AppointmentController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ScheduleExceptionHandler {

    /** The slot is taken. */
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
