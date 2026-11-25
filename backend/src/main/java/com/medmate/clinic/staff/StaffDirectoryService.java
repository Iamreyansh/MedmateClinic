package com.medmate.clinic.staff;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's team.
 *
 * <p>The role a person has and the level they hold it at come from the grants,
 * so the screen cannot show a privilege the API would refuse.
 *
 * <p>The list is capped: a clinic has a team, not a directory.
 */
@Service
public class StaffDirectoryService {

    /** The most people one page of the team holds. */
    public static final int PAGE_SIZE = 100;

    private final StaffRepository staff;
    private final RoleRepository roles;
    private final GrantService grants;

    public StaffDirectoryService(
            StaffRepository staff, RoleRepository roles, GrantService grants) {
        this.staff = staff;
        this.roles = roles;
        this.grants = grants;
    }

    /** The clinic's team. */
    @Transactional(readOnly = true)
    public Map<String, Object> team(ClinicPrincipal principal) {
        if (!principal.can("staff") && !principal.can("doctor") && !principal.can("console")) {
            throw new ForbiddenException("You cannot open the team.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        Map<UUID, String> roleNames = new LinkedHashMap<>();
        for (Role role : roles.findAll()) {
            if (clinicId.equals(role.getClinicId())) {
                roleNames.put(role.getId(), role.getName());
            }
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (items.size() >= PAGE_SIZE) {
                break;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", person.getId().toString());
            item.put("name", person.getFullName());
            item.put("initials", initials(person.getFullName()));
            item.put(
                    "role",
                    titleCase(
                            person.getRoleId() == null
                                    ? "staff"
                                    : roleNames.getOrDefault(person.getRoleId(), "staff")));
            item.put("level", levelOf(clinicId, person.getRoleId()));
            item.put(
                    "detail",
                    person.getSpeciality() == null || person.getSpeciality().isBlank()
                            ? (person.getRegistration() == null ? "" : person.getRegistration())
                            : person.getSpeciality());
            item.put("email", person.getEmail() == null ? "" : person.getEmail());
            items.add(item);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("meta", items.size() + " in the team");
        return body;
    }

    /** The strongest level the person's role holds anything at. */
    private String levelOf(UUID clinicId, UUID roleId) {
        Map<String, String> capabilities = grants.capabilitiesFor(clinicId, roleId);
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

    /** The role, the way the screen shows it: "Doctor", "Front Desk". */
    private static String titleCase(String role) {
        StringBuilder out = new StringBuilder();
        for (String part : role.replace('_', ' ').split("\\s+")) {
            if (part.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return out.toString();
    }

    /** The person's initials. */
    private static String initials(String name) {
        if (name == null) {
            return "";
        }
        StringBuilder initials = new StringBuilder();
        for (String part : name.split("\\s+")) {
            if (part.isEmpty()) {
                continue;
            }
            initials.append(part.charAt(0));
            if (initials.length() == 2) {
                break;
            }
        }
        return initials.toString().toUpperCase();
    }
}
