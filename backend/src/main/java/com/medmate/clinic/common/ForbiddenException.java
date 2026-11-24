package com.medmate.clinic.common;

/** Not for this role. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
