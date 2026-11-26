package com.medmate.clinic.admin.location;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminConflictException;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.security.ClinicPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
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
 * The clinic's branches.
 *
 * <p>A branch is a place the clinic works from, with its own letterhead and
 * its own rooms. A branch that is still in use is not removed — the clinic is
 * told what is attached to it and what to do about it first.
 */
@Service
public class AdminLocationService {

    private final ClinicBranchRepository branches;
    private final JdbcTemplate jdbc;

    public AdminLocationService(ClinicBranchRepository branches, JdbcTemplate jdbc) {
        this.branches = branches;
        this.jdbc = jdbc;
    }

    /** The clinic's branches. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal, String search) {
        AdminAccess.require(principal, "You cannot open the locations.", "location", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = search == null ? "" : search.trim().toLowerCase();
        String pattern = wanted.isEmpty() ? "" : "%" + wanted + "%";

        List<Map<String, Object>> items = new ArrayList<>();
        for (ClinicBranch branch :
                branches.search(clinicId, pattern, PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            items.add(branch(clinicId, branch));
        }
        return AdminEnvelopes.list(items);
    }

    /**
     * Add a branch.
     *
     * <p>The name is how the clinic tells its branches apart, so a second
     * submit of the same form finds the branch that is already there and
     * changes nothing.
     */
    @Transactional
    public Map<String, Object> add(ClinicPrincipal principal, BranchRequest request) {
        AdminAccess.require(principal, "You cannot add a branch.", "location", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Optional<ClinicBranch> already = branches.findByName(clinicId, request.name().trim());
        if (already.isPresent()) {
            return AdminEnvelopes.one(branch(clinicId, already.get()));
        }

        ClinicBranch branch = new ClinicBranch();
        branch.setId(UUID.randomUUID());
        branch.setClinicId(clinicId);
        branch.setName(request.name().trim());
        branch.setAddress(trimmed(request.address()));
        branch.setCity(trimmed(request.city()));
        branch.setState(trimmed(request.state()));
        branch.setPhone(trimmed(request.phone()));
        branch.setRooms(request.rooms() == null ? 1 : request.rooms());
        branch.setHfrId(blankToNull(request.hfrId()));
        branch.setPrimary(false);
        branch.setActive(true);
        branch.setCreatedAt(Instant.now());
        branch.setUpdatedAt(Instant.now());
        branches.save(branch);

        return AdminEnvelopes.one(branch(clinicId, branch));
    }

    /** Change what is known about a branch. */
    @Transactional
    public Map<String, Object> update(
            ClinicPrincipal principal, UUID branchId, BranchRequest request) {
        AdminAccess.require(principal, "You cannot change a branch.", "location", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicBranch branch =
                branches
                        .findByIdAndClinicId(branchId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That branch is not in this clinic."));

        branch.setName(request.name().trim());
        branch.setAddress(trimmed(request.address()));
        branch.setCity(trimmed(request.city()));
        branch.setState(trimmed(request.state()));
        branch.setPhone(trimmed(request.phone()));
        branch.setRooms(request.rooms() == null ? branch.getRooms() : request.rooms());
        branch.setHfrId(blankToNull(request.hfrId()));
        branch.setUpdatedAt(Instant.now());
        branches.save(branch);

        return AdminEnvelopes.one(branch(clinicId, branch));
    }

    /**
     * Remove a branch.
     *
     * <p>A branch somebody still works in, or the clinic's main branch, is not
     * removed. The clinic is told what is attached and what to do about it,
     * because a branch that vanishes takes the bookings that named it with
     * it.
     */
    @Transactional
    public Map<String, Object> remove(ClinicPrincipal principal, UUID branchId) {
        AdminAccess.require(principal, "You cannot remove a branch.", "location", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicBranch branch =
                branches
                        .findByIdAndClinicId(branchId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That branch is not in this clinic."));

        if (branch.isPrimary()) {
            throw new AdminConflictException(
                    "This is the clinic's main branch. Make another branch the main one first.");
        }

        int doctors = doctorsAt(clinicId, branchId);
        if (doctors > 0) {
            throw new AdminConflictException(
                    doctors
                            + (doctors == 1 ? " doctor still works" : " doctors still work")
                            + " at this branch. Move them to another branch first.");
        }

        branches.delete(branch);
        return AdminEnvelopes.one(branch(clinicId, branch));
    }

    /** How many people work at this branch. */
    private int doctorsAt(UUID clinicId, UUID branchId) {
        Integer count =
                jdbc.queryForObject(
                        "select count(*) from staff where clinic_id = ? and branch_id = ?",
                        Integer.class,
                        clinicId,
                        branchId);
        return count == null ? 0 : count;
    }

    /** One branch, as the locations screen reads it. */
    private Map<String, Object> branch(UUID clinicId, ClinicBranch branch) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", branch.getId().toString());
        item.put("name", branch.getName());
        item.put("address", branch.getAddress());
        item.put("city", branch.getCity());
        item.put("state", branch.getState());
        item.put("phone", branch.getPhone());
        item.put("rooms", branch.getRooms());
        item.put("hfrId", branch.getHfrId() == null ? "" : branch.getHfrId());
        item.put("primary", branch.isPrimary());
        item.put("active", branch.isActive());
        item.put("doctors", doctorsAt(clinicId, branch.getId()));
        return item;
    }

    private static String trimmed(String value) {
        return value == null ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /** The branch the clinic works from. */
    public record BranchRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @Size(max = 240) String address,
            @Size(max = 80) String city,
            @Size(max = 80) String state,
            @Size(max = 40) String phone,
            @Min(0) @Max(200) Integer rooms,
            @Size(max = 64) String hfrId) {}
}
