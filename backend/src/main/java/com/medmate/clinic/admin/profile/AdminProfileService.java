package com.medmate.clinic.admin.profile;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminConflictException;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.admin.staff.AdminRoleLookup;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.security.ClinicPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
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
 * The profiles the clinic adds people from.
 *
 * <p>A profile is what a new person usually is: the role they hold, what
 * they do, what they charge and the hours they keep. It saves the clinic
 * typing the same seven fields for every doctor it hires.
 */
@Service
public class AdminProfileService {

    private final ClinicProfileTemplateRepository profiles;
    private final AdminRoleLookup roleLookup;

    public AdminProfileService(
            ClinicProfileTemplateRepository profiles, AdminRoleLookup roleLookup) {
        this.profiles = profiles;
        this.roleLookup = roleLookup;
    }

    /** The clinic's profiles. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal, String search) {
        AdminAccess.require(principal, "You cannot open the profiles.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = search == null ? "" : search.trim().toLowerCase();
        String pattern = wanted.isEmpty() ? "" : "%" + wanted + "%";

        List<Map<String, Object>> items = new ArrayList<>();
        for (ClinicProfileTemplate profile :
                profiles.search(clinicId, pattern, PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            items.add(profile(profile));
        }
        return AdminEnvelopes.list(items);
    }

    /**
     * Add a profile.
     *
     * <p>The name is how the clinic tells its profiles apart, so a second
     * submit of the same form finds the profile that is already there and
     * changes nothing.
     */
    @Transactional
    public Map<String, Object> add(ClinicPrincipal principal, ProfileRequest request) {
        AdminAccess.require(principal, "You cannot add a profile.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Optional<ClinicProfileTemplate> already = profiles.findByName(clinicId, request.name().trim());
        if (already.isPresent()) {
            return AdminEnvelopes.one(profile(already.get()));
        }

        requireRole(clinicId, request.role());

        ClinicProfileTemplate profile = new ClinicProfileTemplate();
        profile.setId(UUID.randomUUID());
        profile.setClinicId(clinicId);
        profile.setName(request.name().trim());
        profile.setRoleName(request.role().trim().toLowerCase());
        profile.setSpeciality(blankToNull(request.speciality()));
        profile.setRegistration(blankToNull(request.registration()));
        profile.setHprId(blankToNull(request.hprId()));
        profile.setConsultationFee(fee(request.consultationFee()));
        profile.setVideoFee(fee(request.videoFee()));
        profile.setSessionStart(blankToNull(request.sessionStart()));
        profile.setSessionEnd(blankToNull(request.sessionEnd()));
        profile.setCreatedAt(Instant.now());
        profile.setUpdatedAt(Instant.now());
        profiles.save(profile);

        return AdminEnvelopes.one(profile(profile));
    }

    /** Change a profile. */
    @Transactional
    public Map<String, Object> update(
            ClinicPrincipal principal, UUID profileId, ProfileRequest request) {
        AdminAccess.require(principal, "You cannot change a profile.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicProfileTemplate profile =
                profiles
                        .findByIdAndClinicId(profileId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That profile is not in this clinic."));

        requireRole(clinicId, request.role());

        profile.setName(request.name().trim());
        profile.setRoleName(request.role().trim().toLowerCase());
        profile.setSpeciality(blankToNull(request.speciality()));
        profile.setRegistration(blankToNull(request.registration()));
        profile.setHprId(blankToNull(request.hprId()));
        profile.setConsultationFee(fee(request.consultationFee()));
        profile.setVideoFee(fee(request.videoFee()));
        profile.setSessionStart(blankToNull(request.sessionStart()));
        profile.setSessionEnd(blankToNull(request.sessionEnd()));
        profile.setUpdatedAt(Instant.now());
        profiles.save(profile);

        return AdminEnvelopes.one(profile(profile));
    }

    /** Remove a profile. */
    @Transactional
    public Map<String, Object> remove(ClinicPrincipal principal, UUID profileId) {
        AdminAccess.require(principal, "You cannot remove a profile.", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicProfileTemplate profile =
                profiles
                        .findByIdAndClinicId(profileId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That profile is not in this clinic."));

        profiles.delete(profile);
        return AdminEnvelopes.one(profile(profile));
    }

    private void requireRole(UUID clinicId, String role) {
        if (roleLookup.byName(clinicId, role).isEmpty()) {
            throw new AdminConflictException("That role is not one of this clinic's roles.");
        }
    }

    /** One profile, as the screen reads it. */
    private Map<String, Object> profile(ClinicProfileTemplate profile) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", profile.getId().toString());
        item.put("name", profile.getName());
        item.put("role", profile.getRoleName());
        item.put("roleLabel", AdminRoleLookup.label(profile.getRoleName()));
        item.put("speciality", profile.getSpeciality() == null ? "" : profile.getSpeciality());
        item.put("registration", profile.getRegistration() == null ? "" : profile.getRegistration());
        item.put("hprId", profile.getHprId() == null ? "" : profile.getHprId());
        item.put("consultationFee", profile.getConsultationFee());
        item.put("videoFee", profile.getVideoFee());
        item.put("sessionStart", profile.getSessionStart() == null ? "" : profile.getSessionStart());
        item.put("sessionEnd", profile.getSessionEnd() == null ? "" : profile.getSessionEnd());
        return item;
    }

    private static BigDecimal fee(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /** The profile the clinic adds people from. */
    public record ProfileRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Size(max = 40) String role,
            @Size(max = 120) String speciality,
            @Size(max = 64) String registration,
            @Size(max = 64) String hprId,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal consultationFee,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal videoFee,
            @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String sessionStart,
            @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String sessionEnd) {}
}
