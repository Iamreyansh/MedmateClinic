package com.medmate.clinic.admin.member;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.admin.staff.AdminEffectiveAccess;
import com.medmate.clinic.admin.staff.AdminRoleLookup;
import com.medmate.clinic.admin.staff.AdminStaffAccessStore;
import com.medmate.clinic.admin.staff.AdminStaffRepository;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.grant.Grant;
import com.medmate.clinic.grant.GrantRepository;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's team.
 *
 * <p>The team is everybody who is not a doctor — the doctors have their own
 * screen and their own registration. A person's access is their role's
 * capabilities, plus the exception the clinic made for them, and the two are
 * read from the one capability map the sessions are built from.
 */
@Service
public class AdminMemberService {

    private final AdminStaffRepository staff;
    private final AdminStaffAccessStore accessStore;
    private final AdminRoleLookup roleLookup;
    private final GrantService grants;
    private final GrantRepository grantRepository;

    public AdminMemberService(
            AdminStaffRepository staff,
            AdminStaffAccessStore accessStore,
            AdminRoleLookup roleLookup,
            GrantService grants,
            GrantRepository grantRepository) {
        this.staff = staff;
        this.accessStore = accessStore;
        this.roleLookup = roleLookup;
        this.grants = grants;
        this.grantRepository = grantRepository;
    }

    /** The clinic's team. */
    @Transactional(readOnly = true)
    public Map<String, Object> team(ClinicPrincipal principal, String search) {
        AdminAccess.require(principal, "You cannot open the team.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = search == null ? "" : search.trim().toLowerCase();
        String pattern = wanted.isEmpty() ? "" : "%" + wanted + "%";

        List<Map<String, Object>> items = new ArrayList<>();
        for (Staff person :
                staff.searchTeam(clinicId, pattern, PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            items.add(member(clinicId, person));
        }
        return AdminEnvelopes.list(items);
    }

    /**
     * Add somebody to the team.
     *
     * <p>The mobile number is how a person signs in, so it is unique inside
     * the clinic. A second submit of the same form finds the person that is
     * already there and changes nothing, rather than making two of them.
     */
    @Transactional
    public Map<String, Object> add(ClinicPrincipal principal, MemberRequest request) {
        AdminAccess.require(principal, "You cannot add someone to the team.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String mobile = digits(request.mobile());
        Optional<Staff> already = staff.findFirstByClinicIdAndMobile(clinicId, mobile);
        if (already.isPresent()) {
            return AdminEnvelopes.one(member(clinicId, already.get()));
        }

        Role role =
                roleLookup
                        .byName(clinicId, request.role())
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "That role is not one of this clinic's roles."));
        if ("owner".equalsIgnoreCase(role.getName())) {
            throw new IllegalArgumentException(
                    "A clinic has one owner. The owner is the person who signed the clinic up.");
        }

        Staff person = new Staff();
        person.setId(UUID.randomUUID());
        person.setClinicId(clinicId);
        person.setRoleId(role.getId());
        person.setFullName(request.name().trim());
        person.setMobile(mobile);
        person.setEmail(blankToNull(request.email()));
        person.setSpeciality(blankToNull(request.speciality()));
        person.setRegistration(blankToNull(request.registration()));
        person.setPinHash(null);
        person.setActive(true);
        person.setCreatedAt(Instant.now());
        staff.save(person);

        return AdminEnvelopes.one(member(clinicId, person));
    }

    /** Change what is known about a member of the team. */
    @Transactional
    public Map<String, Object> update(
            ClinicPrincipal principal, UUID memberId, MemberRequest request) {
        AdminAccess.require(principal, "You cannot change someone on the team.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(memberId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        Role role =
                roleLookup
                        .byName(clinicId, request.role())
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "That role is not one of this clinic's roles."));
        if ("owner".equalsIgnoreCase(role.getName())
                && !role.getId().equals(person.getRoleId())) {
            throw new IllegalArgumentException(
                    "A clinic has one owner. The owner is the person who signed the clinic up.");
        }

        person.setFullName(request.name().trim());
        person.setEmail(blankToNull(request.email()));
        person.setSpeciality(blankToNull(request.speciality()));
        person.setRegistration(blankToNull(request.registration()));
        person.setRoleId(role.getId());
        staff.save(person);

        return AdminEnvelopes.one(member(clinicId, person));
    }

    /** What this person may open, and the exception the clinic made for them. */
    @Transactional(readOnly = true)
    public Map<String, Object> access(ClinicPrincipal principal, UUID memberId) {
        AdminAccess.require(principal, "You cannot open their access.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(memberId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        Map<String, String> roleCapabilities =
                person.getRoleId() == null
                        ? Map.of()
                        : grants.capabilitiesFor(clinicId, person.getRoleId());
        Map<String, String> overrides = accessStore.read(clinicId, memberId);

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("staffId", person.getId().toString());
        item.put("name", person.getFullName());
        item.put("role", roleName(clinicId, person.getRoleId()));
        item.put("roleId", person.getRoleId() == null ? "" : person.getRoleId().toString());
        item.put("capabilities", AdminEffectiveAccess.effective(roleCapabilities, overrides));
        item.put("roleCapabilities", roleCapabilities);
        item.put("overrides", overrides);
        item.put("levels", AdminEffectiveAccess.levels());
        item.put("resources", resources(clinicId));
        return AdminEnvelopes.one(item);
    }

    /**
     * Change what this person may open.
     *
     * <p>The role is the base and the exception is laid over it, so the two
     * are written together and the person's access is never half of each.
     */
    @Transactional
    public Map<String, Object> saveAccess(
            ClinicPrincipal principal, UUID memberId, AccessRequest request) {
        AdminAccess.require(principal, "You cannot change their access.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(memberId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        if (request.role() != null && !request.role().isBlank()) {
            Role role =
                    roleLookup
                            .byName(clinicId, request.role())
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "That role is not one of this clinic's roles."));
            person.setRoleId(role.getId());
            staff.save(person);
        }

        if (request.overrides() != null) {
            Map<String, String> known = resources(clinicId);
            Map<String, String> clean = new LinkedHashMap<>();
            for (Map.Entry<String, String> override : request.overrides().entrySet()) {
                String resource = override.getKey();
                String level = override.getValue();
                if (level == null || level.isBlank() || "none".equals(level)) {
                    continue;
                }
                if (!known.containsKey(resource)) {
                    throw new IllegalArgumentException(
                            "This clinic does not have a " + resource + " screen to give.");
                }
                if (!"view".equals(level) && !"use".equals(level)) {
                    throw new IllegalArgumentException(
                            "Access is either view or use. Anything else is not a level.");
                }
                clean.put(resource, level);
            }
            accessStore.write(clinicId, memberId, clean);
        }

        return access(principal, memberId);
    }

    /** One member of the team, as the team screen reads them. */
    private Map<String, Object> member(UUID clinicId, Staff person) {
        Map<String, String> roleCapabilities =
                person.getRoleId() == null
                        ? Map.of()
                        : grants.capabilitiesFor(clinicId, person.getRoleId());
        Map<String, String> overrides = accessStore.read(clinicId, person.getId());

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", person.getId().toString());
        item.put("name", person.getFullName());
        item.put("initials", initials(person.getFullName()));
        item.put("role", roleName(clinicId, person.getRoleId()));
        item.put("roleName", rawRoleName(clinicId, person.getRoleId()));
        item.put(
                "level",
                AdminEffectiveAccess.levelOf(
                        AdminEffectiveAccess.effective(roleCapabilities, overrides)));
        item.put("detail", blankToEmpty(person.getSpeciality()));
        item.put("email", blankToEmpty(person.getEmail()));
        item.put("mobile", blankToEmpty(person.getMobile()));
        item.put("active", person.isActive());
        return item;
    }

    /** The screens the clinic can give, with the levels they may be given. */
    private Map<String, String> resources(UUID clinicId) {
        Map<String, String> known = new LinkedHashMap<>();
        for (Grant grant : grantRepository.findAll()) {
            if (clinicId.equals(grant.getClinicId())) {
                known.put(grant.getResource(), grant.getLevel());
            }
        }
        return known;
    }

    /** The role's name, the way the screen shows it. */
    private String roleName(UUID clinicId, UUID roleId) {
        return AdminRoleLookup.label(rawRoleName(clinicId, roleId));
    }

    private String rawRoleName(UUID clinicId, UUID roleId) {
        if (roleId == null) {
            return "staff";
        }
        for (Role role : roleLookup.of(clinicId).values()) {
            if (role.getId().equals(roleId)) {
                return role.getName();
            }
        }
        return "staff";
    }

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

    private static String digits(String mobile) {
        String value = mobile == null ? "" : mobile.replaceAll("\\D", "");
        if (value.length() == 12 && value.startsWith("91")) {
            value = value.substring(2);
        }
        return value;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    /** Who is joining the team, and what they will do. */
    public record MemberRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Pattern(regexp = "\\d{10}") String mobile,
            @Email @Size(max = 160) String email,
            @NotBlank @Size(max = 40) String role,
            @Size(max = 120) String speciality,
            @Size(max = 64) String registration) {}

    /** The role a person holds, and the exception the clinic made for them. */
    public record AccessRequest(
            @Size(max = 40) String role,
            Map<String, String> overrides) {}
}
