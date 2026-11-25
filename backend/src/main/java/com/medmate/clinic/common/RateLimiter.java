package com.medmate.clinic.common;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * How often a caller may ask for something.
 *
 * <p>The public surfaces — the booking page, the booking itself, the kiosk's
 * code — are open to anybody, so they are limited. The limiter is in the
 * service: it keeps a small window of recent calls per caller and refuses the
 * ones over the line. Nothing outside the service is needed, and a restart
 * only forgets the window.
 */
public class RateLimiter {

    /** How many calls one caller may make in the window. */
    private final int limit;

    /** The window, in seconds. */
    private final int windowSeconds;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(int limit, int windowSeconds) {
        this.limit = limit;
        this.windowSeconds = windowSeconds;
    }

    /**
     * Whether the caller may make one more call.
     *
     * <p>The call is counted when it is allowed, so a caller that keeps asking
     * is turned away once the window is full.
     */
    public boolean allow(String key) {
        Instant now = Instant.now();
        Window window = windows.compute(key, (name, current) -> {
            if (current == null || current.resetAt().isBefore(now)) {
                return new Window(1, now.plusSeconds(windowSeconds));
            }
            return new Window(current.count() + 1, current.resetAt());
        });
        return window.count() <= limit;
    }

    /** How many calls are left in this window. */
    public long remaining(String key) {
        Window window = windows.get(key);
        if (window == null) {
            return limit;
        }
        return Math.max(0, limit - window.count());
    }

    /** Forget a caller — used when they are let in. */
    public void reset(String key) {
        windows.remove(key);
    }

    private record Window(int count, Instant resetAt) {}
}
