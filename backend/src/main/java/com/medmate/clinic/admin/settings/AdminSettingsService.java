package com.medmate.clinic.admin.settings;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.admin.location.ClinicBranch;
import com.medmate.clinic.admin.location.ClinicBranchRepository;
import com.medmate.clinic.admin.pharmacy.ClinicPharmacyRepository;
import com.medmate.clinic.admin.staff.AdminRoleLookup;
import com.medmate.clinic.admin.staff.AdminStaffRepository;
import com.medmate.clinic.audit.AuditEvent;
import com.medmate.clinic.audit.AuditService;
import com.medmate.clinic.auth.PinService;
import com.medmate.clinic.clinic.ClinicProfile;
import com.medmate.clinic.clinic.ClinicProfileRepository;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's own settings, and the person signed in.
 *
 * <p>The clinic's details live on the clinic profile, which is where they
 * have always lived, so there is one record of them and not two. The letterhead
 * adds only what the profile had no room for.
 */
@Service
public class AdminSettingsService {

    /** The agreements a clinic is asked to accept. */
    private static final String[][] AGREEMENTS = {
        {"terms", "Terms of use", "2026-01"},
        {"privacy", "Privacy policy", "2026-01"},
        {"consent", "Patient consent to treatment and data", "2026-01"},
    };

    private final ClinicProfileRepository profiles;
    private final RegistryClinicRepository clinics;
    private final ClinicBranchRepository branches;
    private final ClinicPharmacyRepository pharmacies;
    private final ClinicAgreementRepository agreements;
    private final ClinicDeviceRepository devices;
    private final AdminStaffRepository team;
    private final StaffRepository staff;
    private final AdminRoleLookup roleLookup;
    private final AuditService audit;
    private final PinService pins;
    private final JdbcTemplate jdbc;

    public AdminSettingsService(
            ClinicProfileRepository profiles,
            RegistryClinicRepository clinics,
            ClinicBranchRepository branches,
            ClinicPharmacyRepository pharmacies,
            ClinicAgreementRepository agreements,
            ClinicDeviceRepository devices,
            AdminStaffRepository team,
            StaffRepository staff,
            AdminRoleLookup roleLookup,
            AuditService audit,
            PinService pins,
            JdbcTemplate jdbc) {
        this.profiles = profiles;
        this.clinics = clinics;
        this.branches = branches;
        this.pharmacies = pharmacies;
        this.agreements = agreements;
        this.devices = devices;
        this.team = team;
        this.staff = staff;
        this.roleLookup = roleLookup;
        this.audit = audit;
        this.pins = pins;
        this.jdbc = jdbc;
    }

    /** The clinic's own record: its letterhead and what it has agreed to. */
    @Transactional(readOnly = true)
    public Map<String, Object> settings(ClinicPrincipal principal) {
        AdminAccess.require(principal, "You cannot open the settings.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        RegistryClinic clinic = clinics.findById(clinicId).orElse(null);
        Map<String, String> letterhead = letterhead(clinicId);

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", clinicId.toString());
        card.put("name", clinic == null ? "" : clinic.getName());
        card.put("displayName", letterhead.getOrDefault("display_name", ""));
        card.put("initials", clinic == null ? "" : clinic.getInitials());
        card.put("bookingSlug", clinic == null ? "" : clinic.getBookingSlug());
        card.put("address", profile == null ? "" : nullToEmpty(profile.getAddress()));
        card.put("city", profile == null ? "" : nullToEmpty(profile.getCity()));
        card.put("state", profile == null ? "" : nullToEmpty(profile.getState()));
        card.put("phone", profile == null ? "" : nullToEmpty(profile.getPhone()));
        card.put("email", letterhead.getOrDefault("email", ""));
        card.put("gstin", profile == null ? "" : nullToEmpty(profile.getGstin()));
        card.put("pan", profile == null ? "" : nullToEmpty(profile.getPan()));
        card.put("registration", profile == null ? "" : nullToEmpty(profile.getRegistration()));
        card.put("hfrId", profile == null ? "" : nullToEmpty(profile.getHfrId()));
        card.put("letterheadNote", letterhead.getOrDefault("letterhead_note", ""));
        card.put("timezone", timezone(clinicId));
        card.put("locations", profile == null ? 1 : profile.getLocations());
        card.put("branches", branches.countByClinicId(clinicId));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(card));
        body.put("meta", Map.of("total", 1));
        return body;
    }

    /** Change the clinic's own details. */
    @Transactional
    public Map<String, Object> saveSettings(ClinicPrincipal principal, SettingsRequest request) {
        AdminAccess.require(principal, "You cannot change the settings.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicProfile profile =
                profiles
                        .findById(clinicId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "This clinic has no profile to write to."));

        profile.setAddress(nullToEmpty(request.address()));
        profile.setCity(nullToEmpty(request.city()));
        profile.setState(nullToEmpty(request.state()));
        profile.setPhone(nullToEmpty(request.phone()));
        profile.setGstin(blankToNull(request.gstin()));
        profile.setPan(blankToNull(request.pan()));
        profile.setRegistration(blankToNull(request.registration()));
        profiles.save(profile);

        jdbc.update(
                """
                update clinic_profile
                set display_name = ?, email = ?, letterhead_note = ?
                where clinic_id = ?
                """,
                blankToNull(request.displayName()),
                blankToNull(request.email()),
                blankToNull(request.letterheadNote()),
                clinicId);

        return settings(principal);
    }

    /** This device, and the PIN that unlocks the screen. */
    @Transactional(readOnly = true)
    public Map<String, Object> device(ClinicPrincipal principal) {
        UUID clinicId = principal.clinicIdAsUuid();
        UUID staffId = principal.staffIdAsUuid();

        Staff person = staff.findByIdAndClinicId(staffId, clinicId).orElse(null);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (ClinicDevice device : devices.findByClinicIdAndStaffIdOrderByLastSeenAtDesc(clinicId, staffId)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", device.getId().toString());
            item.put("name", device.getDeviceName());
            item.put("platform", device.getPlatform() == null ? "" : device.getPlatform());
            item.put("lastSeenAt", device.getLastSeenAt().toString());
            rows.add(item);
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("pinSet", person != null && person.getPinHash() != null && !person.getPinHash().isBlank());
        item.put("devices", rows);
        item.put("locksAfterMinutes", 15);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(item));
        body.put("meta", Map.of("total", 1));
        return body;
    }

    /**
     * Set the PIN that unlocks this screen.
     *
     * <p>The PIN is hashed the way every other PIN in the service is hashed,
     * and the old one has to be given before it can be changed.
     */
    @Transactional
    public Map<String, Object> savePin(ClinicPrincipal principal, PinRequest request) {
        UUID clinicId = principal.clinicIdAsUuid();
        UUID staffId = principal.staffIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(staffId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        if (person.getPinHash() != null
                && !person.getPinHash().isBlank()
                && !pins.matches(staffId.toString(), person.getPinHash(), request.currentPin())) {
            throw new IllegalArgumentException("That is not the PIN this screen has now.");
        }
        if (!request.newPin().equals(request.newPinAgain())) {
            throw new IllegalArgumentException("The two new PINs are not the same.");
        }

        person.setPinHash(pins.hash(staffId.toString(), request.newPin()));
        staff.save(person);

        audit.record(
                principal,
                "settings.pin_set",
                "staff",
                staffId.toString(),
                Map.of("pinSet", true));

        return device(principal);
    }

    /** The agreements the clinic has been asked to accept, and what it accepted. */
    @Transactional(readOnly = true)
    public Map<String, Object> agreements(ClinicPrincipal principal) {
        AdminAccess.require(principal, "You cannot open the agreements.", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (String[] agreement : AGREEMENTS) {
            Optional<ClinicAgreement> accepted =
                    agreements
                            .findByClinicIdAndKindOrderByAcceptedAtDesc(clinicId, agreement[0])
                            .stream()
                            .findFirst();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("kind", agreement[0]);
            item.put("title", agreement[1]);
            item.put("version", agreement[2]);
            item.put("accepted", accepted.isPresent());
            item.put("acceptedAt", accepted.map(value -> value.getAcceptedAt().toString()).orElse(""));
            items.add(item);
        }
        return AdminEnvelopes.list(items);
    }

    /** Accept an agreement. */
    @Transactional
    public Map<String, Object> accept(
            ClinicPrincipal principal, String kind, AcceptRequest request) {
        AdminAccess.require(principal, "You cannot accept an agreement.", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = null;
        String title = "";
        for (String[] agreement : AGREEMENTS) {
            if (agreement[0].equals(kind)) {
                wanted = agreement[0];
                title = agreement[1];
            }
        }
        if (wanted == null) {
            throw new IllegalArgumentException("There is no agreement by that name.");
        }
        if (request.version() == null || request.version().isBlank()) {
            throw new IllegalArgumentException("An agreement is accepted at a version.");
        }

        boolean already =
                agreements.findByClinicIdAndKindOrderByAcceptedAtDesc(clinicId, wanted).stream()
                        .anyMatch(row -> row.getVersion().equals(request.version()));
        if (!already) {
            ClinicAgreement row = new ClinicAgreement();
            row.setId(UUID.randomUUID());
            row.setClinicId(clinicId);
            row.setKind(wanted);
            row.setTitle(title);
            row.setVersion(request.version());
            row.setAcceptedAt(Instant.now());
            row.setAcceptedBy(principal.staffIdAsUuid());
            agreements.save(row);

            audit.record(
                    principal,
                    "settings.agreement_accepted",
                    "agreement",
                    wanted,
                    Map.of("version", request.version()));
        }
        return agreements(principal);
    }

    /**
     * What is still to do before the clinic sees a patient.
     *
     * <p>Everything here is read from the clinic's own record: the outside
     * services are the ones a deployment has to connect, and the rest the
     * clinic fills in itself.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> readiness(ClinicPrincipal principal) {
        AdminAccess.require(principal, "You cannot open the readiness check.", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        Map<String, String> letterhead = letterhead(clinicId);

        List<Map<String, Object>> outside = new ArrayList<>();
        outside.add(check("Text messages to patients", false, "Not connected. Messages to patients need an SMS provider account with DLT-approved templates.", "See messages"));
        outside.add(check("Legal signing of prescriptions", false, "Test signatures only. Prescriptions need an account with a licensed eSign provider before they are legally signed.", null));
        outside.add(check("ABDM (ABHA and health records)", false, "Needs registration as a health facility and ABDM approval.", null));
        outside.add(check("Online and UPI payments", false, "Test payments only. Cash and card at the desk still work. Online payment needs a Razorpay account.", null));
        outside.add(check("Patient data stored in India", true, "This clinic's data is held on the hosting provider's database. Connect a database in an Indian region before real patients.", null));

        List<Map<String, Object>> clinicDetails = new ArrayList<>();
        clinicDetails.add(check("Clinic registration", has(profile == null ? "" : profile.getRegistration()), "Registered. The registration is on every prescription the clinic prints.", null));
        clinicDetails.add(check("GSTIN on bills", has(profile == null ? "" : profile.getGstin()), "Bills show the clinic's GSTIN.", null));
        clinicDetails.add(check("Prescription letterhead", has(letterhead.getOrDefault("letterhead_note", "")), "Using the plain default. Add a subtitle and a footer with the timings and an emergency number.", "Edit letterhead"));
        clinicDetails.add(check("HFR facility ID for each branch", branchesWithHfr(clinicId), "Every branch has one.", null));
        clinicDetails.add(check("Phone number patients can call", branchesWithPhone(clinicId), "Every branch has its own number.", null));

        List<Map<String, Object>> team = new ArrayList<>();
        team.add(check("Doctors verified on HPR", doctorsWithHpr(clinicId), "Every doctor has an HPR id on their record.", null));
        team.add(check("Doctors' signing certificates", true, "Doctors sign with Aadhaar eSign; nothing to renew.", null));
        team.add(check("Everyone has their own PIN", everyoneHasPin(clinicId), "Everyone can lock and unlock their screen.", null));

        List<Map<String, Object>> groups = new ArrayList<>();
        groups.add(group("Outside services", outside));
        groups.add(group("Clinic details", clinicDetails));
        groups.add(group("Team", team));

        int done = 0;
        int total = 0;
        for (Map<String, Object> group : groups) {
            for (Map<String, Object> check : (List<Map<String, Object>>) group.get("checks")) {
                total++;
                if (Boolean.TRUE.equals(check.get("done"))) {
                    done++;
                }
            }
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("done", done);
        item.put("total", total);
        item.put("groups", groups);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(item));
        body.put("meta", Map.of("total", 1));
        return body;
    }

    /** Who is signed in, and what they may change about themselves. */
    @Transactional(readOnly = true)
    public Map<String, Object> account(ClinicPrincipal principal) {
        UUID clinicId = principal.clinicIdAsUuid();
        UUID staffId = principal.staffIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(staffId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", person.getId().toString());
        item.put("name", person.getFullName());
        item.put("initials", initials(person.getFullName()));
        item.put("mobile", nullToEmpty(person.getMobile()));
        item.put("email", nullToEmpty(person.getEmail()));
        item.put("speciality", nullToEmpty(person.getSpeciality()));
        item.put("registration", nullToEmpty(person.getRegistration()));
        item.put("room", person.getRoom() == null ? "" : person.getRoom());
        item.put("role", roleName(clinicId, person.getRoleId()));
        item.put("pinSet", person.getPinHash() != null && !person.getPinHash().isBlank());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(item));
        body.put("meta", Map.of("total", 1));
        return body;
    }

    /** Change what the signed-in person is called, and how they are reached. */
    @Transactional
    public Map<String, Object> saveAccount(ClinicPrincipal principal, AccountRequest request) {
        UUID clinicId = principal.clinicIdAsUuid();
        UUID staffId = principal.staffIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(staffId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That person is not in this clinic."));

        person.setFullName(request.name().trim());
        person.setEmail(blankToNull(request.email()));
        person.setSpeciality(blankToNull(request.speciality()));
        person.setRegistration(blankToNull(request.registration()));
        staff.save(person);

        audit.record(
                principal,
                "account.updated",
                "staff",
                staffId.toString(),
                Map.of("name", person.getFullName()));

        return account(principal);
    }

    /** What the clinic has done, newest first. */
    @Transactional(readOnly = true)
    public Map<String, Object> activity(ClinicPrincipal principal) {
        AdminAccess.require(principal, "You cannot open the activity log.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (AuditEvent event : audit.recent(clinicId, null, null)) {
            if (items.size() >= AdminEnvelopes.PAGE_SIZE) {
                break;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", event.getId().toString());
            item.put("action", event.getAction());
            item.put("category", event.getAction().split("\\.")[0]);
            item.put("resourceType", nullToEmpty(event.getResourceType()));
            item.put("resourceId", nullToEmpty(event.getResourceId()));
            item.put("actor", event.getActorStaffId() == null ? "" : event.getActorStaffId().toString());
            item.put("role", nullToEmpty(event.getActorRole()));
            item.put("detail", detailOf(event));
            item.put("ip", nullToEmpty(event.getIpAddress()));
            item.put("at", event.getCreatedAt() == null ? "" : event.getCreatedAt().toString());
            items.add(item);
        }
        return AdminEnvelopes.list(items);
    }

    /** The clinic's timezone, the one its days are kept in. */
    private String timezone(UUID clinicId) {
        List<String> rows =
                jdbc.query(
                        "select timezone from clinic_profile where clinic_id = ?",
                        (rs, rowNum) -> rs.getString(1),
                        clinicId);
        if (rows.isEmpty() || rows.get(0) == null || rows.get(0).isBlank()) {
            return "Asia/Kolkata";
        }
        return rows.get(0);
    }

    /** The letterhead's own fields, the ones the profile had no room for. */
    private Map<String, String> letterhead(UUID clinicId) {
        Map<String, String> out = new LinkedHashMap<>();
        List<Map<String, String>> rows =
                jdbc.query(
                        "select display_name, email, letterhead_note from clinic_profile where clinic_id = ?",
                        (rs, rowNum) -> {
                            Map<String, String> row = new LinkedHashMap<>();
                            row.put("display_name", nullToEmpty(rs.getString(1)));
                            row.put("email", nullToEmpty(rs.getString(2)));
                            row.put("letterhead_note", nullToEmpty(rs.getString(3)));
                            return row;
                        },
                        clinicId);
        if (!rows.isEmpty()) {
            out.putAll(rows.get(0));
        }
        return out;
    }

    private String roleName(UUID clinicId, UUID roleId) {
        if (roleId == null) {
            return "Staff";
        }
        for (Role role : roleLookup.of(clinicId).values()) {
            if (role.getId().equals(roleId)) {
                return AdminRoleLookup.label(role.getName());
            }
        }
        return "Staff";
    }

    private String detailOf(AuditEvent event) {
        Map<String, Object> detail = event.getDetail();
        if (detail == null || detail.isEmpty()) {
            return event.getAction();
        }
        StringBuilder out = new StringBuilder();
        for (Map.Entry<String, Object> entry : detail.entrySet()) {
            if (out.length() > 0) {
                out.append(" · ");
            }
            out.append(entry.getKey()).append(" ").append(entry.getValue());
        }
        return out.toString();
    }

    private boolean branchesWithHfr(UUID clinicId) {
        for (ClinicBranch branch :
                branches.search(clinicId, "", PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            if (branch.getHfrId() == null || branch.getHfrId().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private boolean branchesWithPhone(UUID clinicId) {
        for (ClinicBranch branch :
                branches.search(clinicId, "", PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            if (branch.getPhone() == null || branch.getPhone().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private boolean doctorsWithHpr(UUID clinicId) {
        List<Staff> doctors = team.searchDoctors(clinicId, PageRequest.of(0, AdminEnvelopes.PAGE_SIZE));
        if (doctors.isEmpty()) {
            return false;
        }
        for (Staff doctor : doctors) {
            if (doctor.getHprId() == null || doctor.getHprId().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private boolean everyoneHasPin(UUID clinicId) {
        for (Staff person : team.searchTeam(clinicId, "", PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            if (person.getPinHash() == null || person.getPinHash().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static boolean has(String value) {
        return value != null && !value.isBlank();
    }

    private static Map<String, Object> check(
            String label, boolean done, String detail, String action) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("label", label);
        item.put("done", done);
        item.put("detail", detail);
        item.put("action", action == null ? "" : action);
        return item;
    }

    private static Map<String, Object> group(String title, List<Map<String, Object>> checks) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("title", title);
        item.put("checks", checks);
        return item;
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

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /** The clinic's own details. */
    public record SettingsRequest(
            @Size(max = 120) String displayName,
            @Email @Size(max = 160) String email,
            @Size(max = 240) String address,
            @Size(max = 80) String city,
            @Size(max = 80) String state,
            @Size(max = 40) String phone,
            @Size(max = 32) String gstin,
            @Size(max = 32) String pan,
            @Size(max = 64) String registration,
            @Size(max = 240) String letterheadNote) {}

    /** The PIN that unlocks the screen. */
    public record PinRequest(
            String currentPin,
            @NotBlank @Pattern(regexp = "\\d{4}") String newPin,
            @NotBlank @Pattern(regexp = "\\d{4}") String newPinAgain) {}

    /** The agreement being accepted, and the version accepted at. */
    public record AcceptRequest(@NotBlank String version) {}

    /** What the signed-in person is called, and how they are reached. */
    public record AccountRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @Email @Size(max = 160) String email,
            @Size(max = 120) String speciality,
            @Size(max = 64) String registration) {}
}
