package com.medmate.clinic.tenancy;

import org.springframework.stereotype.Component;

/**
 * Which clinic's schema the request is working in.
 *
 * <p>One connection pool serves every clinic. The schema is chosen per request,
 * set by the filter once the token has said which clinic the caller belongs
 * to, and cleared when the request ends.
 */
@Component
public class ClinicSchemaResolver {

    private final ThreadLocal<String> schema = new ThreadLocal<>();

    /** The schema in play, or the registry when the caller has no clinic yet. */
    public String current(String registrySchema) {
        String current = schema.get();
        return current == null ? registrySchema : current;
    }

    public void use(String schemaName) {
        schema.set(schemaName);
    }

    public void clear() {
        schema.remove();
    }
}
