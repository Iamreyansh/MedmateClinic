package com.medmate.clinic.common;

import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * One shape for every error the API returns.
 *
 * <p>The envelope is always {@code {"title": ..., "detail": ...}}. The frontend
 * reads {@code problem.detail ?? problem.message}, so {@code detail} is the
 * human sentence and {@code title} is the short kind of failure.
 *
 * <p>Nothing else may reach the caller. A failure that was not one of ours is
 * logged inside the service and answered with a flat sentence, because the
 * exception message and the stack trace are the internals of the service and
 * are not the caller's business.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("title", "Not found", "detail", e.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> forbidden(ForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("title", "Not allowed", "detail", e.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> unauthorized(UnauthorizedException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("title", "Please sign in", "detail", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(Map.of("title", "Check the form", "detail", detail));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> illegal(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("title", "That did not work", "detail", e.getMessage()));
    }

    /**
     * Everything else.
     *
     * <p>Spring's own web failures — a body that cannot be read, a path that
     * does not exist — already carry the right status, so they are passed
     * through in the same envelope. Anything left is a fault in the service: it
     * is logged here and the caller is told only that it failed.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception e) {
        if (e instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            ProblemDetail problem = errorResponse.getBody();
            String detail = problem == null ? null : problem.getDetail();
            if (detail == null && problem != null) {
                detail = problem.getTitle();
            }
            return ResponseEntity.status(status)
                    .body(
                            Map.of(
                                    "title",
                                    titleOf(status),
                                    "detail",
                                    detail == null ? "That did not work." : detail));
        }
        log.error("the request failed", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        Map.of(
                                "title",
                                "Something went wrong",
                                "detail",
                                "Please try again in a moment."));
    }

    /** The short kind of failure, for the status the request failed with. */
    private static String titleOf(HttpStatusCode status) {
        if (status instanceof HttpStatus httpStatus) {
            return switch (httpStatus) {
                case NOT_FOUND -> "Not found";
                case BAD_REQUEST -> "That did not work";
                case METHOD_NOT_ALLOWED -> "That did not work";
                case UNSUPPORTED_MEDIA_TYPE -> "That did not work";
                case UNAUTHORIZED -> "Please sign in";
                case FORBIDDEN -> "Not allowed";
                default -> "Something went wrong";
            };
        }
        return "Something went wrong";
    }
}
