package com.medmate.clinic.common;

/** Who are you? */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
