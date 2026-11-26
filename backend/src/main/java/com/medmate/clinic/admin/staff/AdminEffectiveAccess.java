package com.medmate.clinic.admin.staff;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * What one person may open, once their role and their exception are read
 * together.
 *
 * <p>The role holds the capabilities; the person's own row holds the
 * exception the clinic made for them. The exception wins where the two
 * disagree, and nowhere else.
 */
public final class AdminEffectiveAccess {

    private AdminEffectiveAccess() {}

    /** The role's capabilities with the person's exception laid over them. */
    public static Map<String, String> effective(
            Map<String, String> capabilities, Map<String, String> overrides) {
        Map<String, String> out = new LinkedHashMap<>();
        if (capabilities != null) {
            out.putAll(capabilities);
        }
        if (overrides != null) {
            for (Map.Entry<String, String> override : overrides.entrySet()) {
                if (override.getValue() == null || override.getValue().isBlank()) {
                    out.remove(override.getKey());
                } else {
                    out.put(override.getKey(), override.getValue());
                }
            }
        }
        return out;
    }

    /** How far the person goes: use is more than view, view more than none. */
    public static String levelOf(Map<String, String> capabilities) {
        String level = "none";
        for (String candidate : capabilities.values()) {
            if ("use".equals(candidate)) {
                return "use";
            }
            if ("view".equals(candidate)) {
                level = "view";
            }
        }
        return level;
    }

    /** The levels a person may be given, strongest first. */
    public static java.util.List<String> levels() {
        return java.util.List.of("none", "view", "use");
    }
}
