package com.medmate.clinic.onboarding;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The failures of the sign-up itself.
 *
 * <p>The envelope is the one the whole API uses — {@code {"title": ...,
 * "detail": ...}} — and the title is the short kind of failure. A sign-up
 * whose number was never proved is a form that is not finished, so it is
 * answered like every other unfinished form.
 */
@RestControllerAdvice(assignableTypes = SignupController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SignupExceptionHandler {

    /** The number was never proved, so the clinic may not be created. */
    @ExceptionHandler(PreSignupVerificationException.class)
    public ResponseEntity<Map<String, Object>> verificationRequired(
            PreSignupVerificationException e) {
        return ResponseEntity.badRequest()
                .body(Map.of("title", "Check the form", "detail", e.getMessage()));
    }
}
