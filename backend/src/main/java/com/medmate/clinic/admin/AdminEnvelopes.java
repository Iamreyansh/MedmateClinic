package com.medmate.clinic.admin;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The shape every list in this package answers with.
 *
 * <p>A list is {@code {items: [...], meta: {total}}}, and a write answers
 * with the same thing it wrote: the screen refreshes from one source of
 * truth and never has to merge two shapes.
 */
public final class AdminEnvelopes {

    /** The most rows one page of a list holds. */
    public static final int PAGE_SIZE = 200;

    private AdminEnvelopes() {}

    /** A page of rows. */
    public static Map<String, Object> list(List<?> items) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("total", items.size());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("meta", meta);
        return body;
    }

    /** One row, on its own. */
    public static Map<String, Object> one(Map<String, Object> item) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("total", 1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(item));
        body.put("meta", meta);
        return body;
    }
}
