package com.medmate.clinic.onboarding;

import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.JwtService;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.ClinicProvisioningService;
import com.medmate.clinic.tenancy.ClinicRouting;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * A clinic signs itself up.
 *
 * <p>The five steps the SPA collects — the clinic, the owner, the location,
 * the people, the services — become a clinic in the directory, a schema of its
 * own, and a session for the owner.
 *
 * <p>The booking slug is not the clinic's name. A slug that is the name is a
 * slug anybody can guess, and the slug is the way a patient finds the clinic.
 */
@Service
public class SignupService {

    private final RegistryClinicRepository clinics;
    private final ClinicRouting routing;
    private final ClinicProvisioningService provisioning;
    private final StaffRepository staff;
    private final GrantService grants;
    private final RoleRepository roles;
    private final JwtService jwt;
    private final PreSignupService preSignup;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    private final SecureRandom random = new SecureRandom();

    public SignupService(
            RegistryClinicRepository clinics,
            ClinicRouting routing,
            ClinicProvisioningService provisioning,
            StaffRepository staff,
            GrantService grants,
            RoleRepository roles,
            JwtService jwt,
            PreSignupService preSignup,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.clinics = clinics;
        this.routing = routing;
        this.provisioning = provisioning;
        this.staff = staff;
        this.grants = grants;
        this.roles = roles;
        this.jwt = jwt;
        this.preSignup = preSignup;
        this.jdbc = jdbc;
    }

    /**
     * The clinic signs up, and the owner is signed in.
     *
     * <p>This is deliberately not one transaction. The clinic's own tables live
     * in the clinic's schema, and the schema is only chosen once the clinic
     * has been created and provisioned — a transaction would take its
     * connection before that, and the query for the clinic's roles would land
     * in the registry schema and fail. Each write is its own transaction, and
     * the schema is chosen before anything is read from it.
     */
    public Map<String, Object> signUp(SignupRequest request) {
        String clinicName = request.clinicName() == null ? "" : request.clinicName().trim();
        if (clinicName.length() < 2) {
            throw new IllegalArgumentException("The clinic needs a name.");
        }
        String ownerName = request.name() == null ? "" : request.name().trim();
        if (ownerName.length() < 2) {
            throw new IllegalArgumentException("The owner needs a name.");
        }
        String mobile = digits(request.mobile());
        if (mobile.length() != 10) {
            throw new IllegalArgumentException("Enter a 10-digit mobile number.");
        }

        // The owner's number is proved before the clinic is created. The proof
        // is spent by the sign-up that uses it, so one verified number cannot
        // create two clinics.
        if (!preSignup.claim(mobile)) {
            throw new PreSignupVerificationException(
                    "Verify the mobile number before creating the clinic.");
        }

        UUID clinicId = UUID.randomUUID();
        String slug = uniqueSlug(clinicName);

        RegistryClinic clinic = new RegistryClinic();
        clinic.setId(clinicId);
        clinic.setName(clinicName);
        clinic.setInitials(initials(clinicName));
        clinic.setSchemaName(ClinicProvisioningService.schemaNameFor(clinicId));
        clinic.setBookingSlug(slug);
        clinic.setCreatedAt(Instant.now());
        clinics.save(clinic);

        // The clinic gets its own schema and its own migrations.
        provisioning.provision(clinic);

        // The owner is the first member of staff, with every grant the clinic
        // gives. The schema is chosen first: the roles, the grants and the
        // staff are all the clinic's own tables, and they live in the clinic's
        // schema, not in the registry's.
        routing.route(clinicId);
        Staff owner = new Staff();
        owner.setId(UUID.randomUUID());
        owner.setClinicId(clinicId);
        owner.setRoleId(ownerRole(clinicId));
        owner.setFullName(ownerName);
        owner.setMobile(mobile);
        owner.setEmail(request.email());
        owner.setRegistration(request.doctorReg());
        owner.setHprId(request.hpr());
        owner.setSpeciality(request.speciality());
        owner.setPinHash(null);
        owner.setActive(true);
        owner.setCreatedAt(Instant.now());
        staff.save(owner);

        // The role the sign-up collected. A manager and a doctor are both the
        // owner of the clinic, and the client has to be able to tell them
        // apart: the dashboard greets a doctor as "Dr.".
        jdbc.update(
                "update staff set profile_role = ? where id = ? and clinic_id = ?",
                profileRole(request.role()),
                owner.getId(),
                clinicId);

        ClinicPrincipal principal =
                new ClinicPrincipal(
                        owner.getId().toString(),
                        clinicId.toString(),
                        "owner",
                        grants.resourcesFor(clinicId, owner.getRoleId()));
        String token = jwt.issue(principal);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accessToken", token);
        body.put("clinicId", clinicId.toString());
        body.put("clinicName", clinicName);
        body.put("bookingSlug", slug);
        body.put("bookingUrl", "https://medmate.in/book?clinic=" + slug);
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", clinicId.toString());
        card.put("name", clinicName);
        card.put("initials", clinic.getInitials());
        card.put("bookingSlug", slug);
        card.put("address", request.street());
        card.put("city", request.city());
        card.put("state", request.state());
        card.put("phone", request.phone());
        card.put("email", request.clinicEmail());
        card.put("gstin", request.gstin());
        card.put("pan", request.pan());
        card.put("registration", request.regNumber());
        card.put("locations", 1);
        body.put("clinic", card);
        return body;
    }

    /** The slug: the clinic's name and a random tail, so it cannot be guessed. */
    private String uniqueSlug(String clinicName) {
        String base =
                clinicName.toLowerCase(Locale.ENGLISH).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "clinic";
        }
        String slug = base + "-" + randomTail();
        while (clinics.findByBookingSlug(slug).isPresent()) {
            slug = base + "-" + randomTail();
        }
        return slug;
    }

    /** Eight random characters, in the characters a URL carries well. */
    private String randomTail() {
        byte[] bytes = new byte[4];
        random.nextBytes(bytes);
        // Eight lowercase hexadecimal characters. The tail is part of a public
        // link that a patient types and a clinic shares, so it is strictly
        // alphanumeric: no percent-encoding anywhere, and the shape the
        // contract pins. The URL-safe Base64 alphabet this used to draw from
        // contains `-` and `_`, which a slug in a patient's hand does not need.
        return java.util.HexFormat.of().formatHex(bytes);
    }

    /** The owner role of this clinic: the role every grant hangs from. */
    private UUID ownerRole(UUID clinicId) {
        for (Role role : roles.findAll()) {
            if (clinicId.equals(role.getClinicId()) && "owner".equalsIgnoreCase(role.getName())) {
                return role.getId();
            }
        }
        return null;
    }

    /** The digits of a number. */
    private static String digits(String value) {
        if (value == null) {
            return "";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        return digits;
    }

    /** The role the sign-up collected, as it is kept: a doctor or a manager. */
    private static String profileRole(String role) {
        String value = role == null ? "" : role.trim().toLowerCase(java.util.Locale.ENGLISH);
        return "manager".equals(value) ? "manager" : "doctor";
    }

    /** The clinic's initials. */
    private static String initials(String name) {
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
        return initials.toString().toUpperCase(Locale.ENGLISH);
    }

    /** The five steps the SPA collects. */
    public record SignupRequest(
            String name,
            String mobile,
            String email,
            String clinicName,
            String clinicKind,
            String registeredUnder,
            String regNumber,
            String validUntil,
            String clinicEmail,
            String gstin,
            String pan,
            String locName,
            String street,
            String area,
            String city,
            String pin,
            String state,
            String phone,
            String rooms,
            String hfr,
            String role,
            String hpr,
            String doctorName,
            String doctorQual,
            String doctorReg,
            String speciality,
            String fee,
            String videoFee,
            String signing) {}
}
