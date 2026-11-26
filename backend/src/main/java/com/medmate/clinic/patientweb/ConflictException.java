package com.medmate.clinic.patientweb;

/**
 * The request cannot be met, but nothing is wrong with it.
 *
 * <p>The slot the patient asked for is taken, or the key they sent has already
 * been used for something else. Both are answered in the envelope the whole
 * API uses — {@code {"title": ..., "detail": ...}} — with the status that says
 * "try again", not "something went wrong".
 */
public class ConflictException extends RuntimeException {

    private final String title;

    public ConflictException(String title, String detail) {
        super(detail);
        this.title = title;
    }

    /** The short kind of failure. */
    public String getTitle() {
        return title;
    }
}
