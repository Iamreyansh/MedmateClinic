package com.medmate.clinic.admin.staff;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.grant.Grant;
import com.medmate.clinic.grant.GrantRepository;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who can open what.
 *
 * <p>The matrix is read from the grants, so the screen cannot show a
 * privilege the API would refuse, and there is still exactly one capability
 * map in the system: the one the sessions are built from.
 */
@Service
public class AdminRolesService {

    /**
     * The screens a clinic can open, in the order the matrix shows them, with
     * the group they belong to.
     *
     * <p>The resource is the grant's own name, so a screen that is not listed
     * here simply is not one the clinic's roles can be given.
     */
    private static final List<String[]> SCREENS =
            List.of(
                    new String[] {"console", "Doctor Console & prescriptions", "Clinical"},
                    new String[] {"inbox", "Doctor's inbox & templates", "Clinical"},
                    new String[] {"nurse", "Nurse Station (vitals)", "Clinical"},
                    new String[] {"lab", "Lab & Diagnostics", "Clinical"},
                    new String[] {"tele", "Teleconsult", "Clinical"},
                    new String[] {"kiosk", "Patient Kiosk", "Front desk"},
                    new String[] {"desk", "Reception Desk", "Front desk"},
                    new String[] {"appointment", "Appointments", "Front desk"},
                    new String[] {"message", "Patient messages", "Front desk"},
                    new String[] {"patient", "Patients (contact & visits)", "Front desk"},
                    new String[] {"billing", "Billing & POS", "Money"},
                    new String[] {"report", "Reports", "Money"},
                    new String[] {"doctor", "Doctors", "Clinic"},
                    new String[] {"staff", "Staff & roles", "Clinic"},
                    new String[] {"location", "Locations", "Clinic"},
                    new String[] {"settings", "Clinic settings & letterhead", "Clinic"},
                    new String[] {"subscription", "Subscription", "Clinic"});

    /** The resources a role may never have, whatever the clinic asks for. */
    private static final String LOCKED_NOTE =
            "Diagnoses, notes and prescriptions are for the treating doctor. The law does not let "
                    + "another role read them.";

    private final RoleRepository roles;
    private final GrantRepository grants;
    private final GrantService grantService;
    private final AdminStaffRepository staff;

    public AdminRolesService(
            RoleRepository roles,
            GrantRepository grants,
            GrantService grantService,
            AdminStaffRepository staff) {
        this.roles = roles;
        this.grants = grants;
        this.grantService = grantService;
        this.staff = staff;
    }

    /** The clinic's roles, and what each of them may open. */
    @Transactional(readOnly = true)
    public Map<String, Object> roles(ClinicPrincipal principal) {
        AdminAccess.require(
                principal, "You cannot open the roles.", "staff", "settings", "doctor");
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Role role : roles.findAll()) {
            if (!clinicId.equals(role.getClinicId())) {
                continue;
            }
            if (items.size() >= AdminEnvelopes.PAGE_SIZE) {
                break;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", role.getId().toString());
            item.put("name", role.getName());
            item.put("label", label(role.getName()));
            item.put("owner", role.isOwner());
            item.put("people", staff.countByRole(clinicId, role.getId()));
            item.put("capabilities", grantService.capabilitiesFor(clinicId, role.getId()));
            items.add(item);
        }
        return AdminEnvelopes.list(items);
    }

    /** The screens the matrix has a column for. */
    @Transactional(readOnly = true)
    public Map<String, Object> screens(ClinicPrincipal principal) {
        AdminAccess.require(
                principal, "You cannot open the roles.", "staff", "settings", "doctor");
        UUID clinicId = principal.clinicIdAsUuid();

        List<String> known = new ArrayList<>();
        for (Grant grant : grants.findAll()) {
            if (clinicId.equals(grant.getClinicId())) {
                known.add(grant.getResource());
            }
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (String[] screen : SCREENS) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("resource", screen[0]);
            item.put("label", screen[1]);
            item.put("group", screen[2]);
            item.put("locked", "console".equals(screen[0]));
            item.put("note", "console".equals(screen[0]) ? LOCKED_NOTE : null);
            items.add(item);
        }
        return AdminEnvelopes.list(items);
    }

    /** The role's name, the way the screen shows it. */
    private static String label(String name) {
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
}
