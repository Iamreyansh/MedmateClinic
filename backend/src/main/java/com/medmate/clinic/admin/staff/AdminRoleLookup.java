package com.medmate.clinic.admin.staff;

import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.staff.Staff;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's roles, looked up by the name the screens use.
 *
 * <p>The roles are the ones the clinic already has — V200 gives every clinic
 * the same five — so a role is always resolved inside the clinic that is
 * asking, and a name that is not one of the clinic's roles is refused rather
 * than invented.
 */
@Service
public class AdminRoleLookup {

    private final RoleRepository roles;

    public AdminRoleLookup(RoleRepository roles) {
        this.roles = roles;
    }

    /** The clinic's roles, by name. */
    @Transactional(readOnly = true)
    public Map<String, Role> of(UUID clinicId) {
        Map<String, Role> out = new LinkedHashMap<>();
        for (Role role : roles.findAll()) {
            if (clinicId.equals(role.getClinicId())) {
                out.put(role.getName().toLowerCase(), role);
            }
        }
        return out;
    }

    /** The role with this name, inside this clinic. */
    @Transactional(readOnly = true)
    public Optional<Role> byName(UUID clinicId, String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        for (Role role : roles.findAll()) {
            if (clinicId.equals(role.getClinicId())
                    && role.getName().equalsIgnoreCase(name.trim())) {
                return Optional.of(role);
            }
        }
        return Optional.empty();
    }

    /** The name of the role, the way the screen shows it. */
    public static String label(String name) {
        if (name == null || name.isBlank()) {
            return "Staff";
        }
        StringBuilder out = new StringBuilder();
        for (String part : name.replace("_", " ").split("\\s+")) {
            if (part.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(" ");
            }
            out.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return out.toString();
    }

    /** The levels a person may hold, and what each of them means. */
    public static List<Map<String, String>> levelChoices() {
        List<Map<String, String>> choices = new ArrayList<>();
        choices.add(choice("use", "Can use", "Open the screen and work in it."));
        choices.add(choice("view", "Can view", "Read the screen, but not change it."));
        choices.add(choice("none", "No access", "The screen is closed to them."));
        return choices;
    }

    private static Map<String, String> choice(String value, String label, String detail) {
        Map<String, String> choice = new LinkedHashMap<>();
        choice.put("value", value);
        choice.put("label", label);
        choice.put("detail", detail);
        return choice;
    }
}
