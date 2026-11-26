package com.medmate.clinic.admin;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The one failure the admin screens have of their own.
 *
 * <p>It is the same envelope every other failure uses — a title and a
 * sentence for a person — so the screens read one shape whatever went
 * wrong.
 */
public class AdminConflictException extends RuntimeException {

    public AdminConflictException(String message) {
        super(message);
    }
}
