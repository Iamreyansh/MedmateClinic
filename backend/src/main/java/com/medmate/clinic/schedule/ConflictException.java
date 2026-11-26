package com.medmate.clinic.schedule;

/**
 * The booking cannot be made, but nothing is wrong with it.
 *
 * <p>The slot is taken, or the booking would put two patients with the same
 * doctor in the same place at the same time. Both are answered in the
 * envelope the whole API uses — {@code {"title": ..., "detail": ...}} — with
 * the status that says "pick another time", not "something went wrong".
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
