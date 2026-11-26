package com.medmate.clinic.admin.pharmacy;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminConflictException;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.security.ClinicPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
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
 * The pharmacies the clinic sends prescriptions to.
 *
 * <p>A pharmacy that has had a prescription sent to it is not removed: the
 * prescriptions that name it would point at nothing. The clinic is told so,
 * and offered the other way — keeping the pharmacy on the list but marking
 * it as one the clinic no longer sends to.
 */
@Service
public class AdminPharmacyService {

    private final ClinicPharmacyRepository pharmacies;
    private final JdbcTemplate jdbc;

    public AdminPharmacyService(ClinicPharmacyRepository pharmacies, JdbcTemplate jdbc) {
        this.pharmacies = pharmacies;
        this.jdbc = jdbc;
    }

    /** The clinic's pharmacies. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal, String search) {
        AdminAccess.require(principal, "You cannot open the pharmacies.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = search == null ? "" : search.trim().toLowerCase();
        String pattern = wanted.isEmpty() ? "" : "%" + wanted + "%";

        List<Map<String, Object>> items = new ArrayList<>();
        for (ClinicPharmacy pharmacy :
                pharmacies.search(clinicId, pattern, PageRequest.of(0, AdminEnvelopes.PAGE_SIZE))) {
            items.add(pharmacy(clinicId, pharmacy));
        }
        return AdminEnvelopes.list(items);
    }

    /**
     * Add a pharmacy.
     *
     * <p>The name is how the clinic tells its pharmacies apart, so a second
     * submit of the same form finds the pharmacy that is already there and
     * changes nothing.
     */
    @Transactional
    public Map<String, Object> add(ClinicPrincipal principal, PharmacyRequest request) {
        AdminAccess.require(principal, "You cannot add a pharmacy.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        Optional<ClinicPharmacy> already = pharmacies.findByName(clinicId, request.name().trim());
        if (already.isPresent()) {
            return AdminEnvelopes.one(pharmacy(clinicId, already.get()));
        }

        ClinicPharmacy pharmacy = new ClinicPharmacy();
        pharmacy.setId(UUID.randomUUID());
        pharmacy.setClinicId(clinicId);
        pharmacy.setName(request.name().trim());
        pharmacy.setAddress(trimmed(request.address()));
        pharmacy.setCity(trimmed(request.city()));
        pharmacy.setState(trimmed(request.state()));
        pharmacy.setPhone(trimmed(request.phone()));
        pharmacy.setEmail(blankToNull(request.email()));
        pharmacy.setContactPerson(blankToNull(request.contactPerson()));
        pharmacy.setActive(true);
        pharmacy.setCreatedAt(Instant.now());
        pharmacy.setUpdatedAt(Instant.now());
        pharmacies.save(pharmacy);

        return AdminEnvelopes.one(pharmacy(clinicId, pharmacy));
    }

    /** Change what is known about a pharmacy. */
    @Transactional
    public Map<String, Object> update(
            ClinicPrincipal principal, UUID pharmacyId, PharmacyRequest request) {
        AdminAccess.require(principal, "You cannot change a pharmacy.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicPharmacy pharmacy =
                pharmacies
                        .findByIdAndClinicId(pharmacyId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That pharmacy is not in this clinic."));

        pharmacy.setName(request.name().trim());
        pharmacy.setAddress(trimmed(request.address()));
        pharmacy.setCity(trimmed(request.city()));
        pharmacy.setState(trimmed(request.state()));
        pharmacy.setPhone(trimmed(request.phone()));
        pharmacy.setEmail(blankToNull(request.email()));
        pharmacy.setContactPerson(blankToNull(request.contactPerson()));
        pharmacy.setActive(!request.inactive());
        pharmacy.setUpdatedAt(Instant.now());
        pharmacies.save(pharmacy);

        return AdminEnvelopes.one(pharmacy(clinicId, pharmacy));
    }

    /**
     * Remove a pharmacy nothing has been sent to.
     *
     * <p>A pharmacy that has had a prescription sent to it is refused: the
     * prescriptions that name it would point at nothing. Keeping it on the
     * list and marking it as one the clinic no longer sends to does the same
     * job without losing the record.
     */
    @Transactional
    public Map<String, Object> remove(ClinicPrincipal principal, UUID pharmacyId) {
        AdminAccess.require(principal, "You cannot remove a pharmacy.", "settings", "location");
        UUID clinicId = principal.clinicIdAsUuid();

        ClinicPharmacy pharmacy =
                pharmacies
                        .findByIdAndClinicId(pharmacyId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That pharmacy is not in this clinic."));

        int prescriptions = prescriptionsSentTo(clinicId, pharmacyId);
        if (prescriptions > 0) {
            throw new AdminConflictException(
                    prescriptions
                            + (prescriptions == 1
                                    ? " prescription has been sent to this pharmacy."
                                    : " prescriptions have been sent to this pharmacy.")
                            + " Keep it on the list, or mark it as one you no longer send to.");
        }

        pharmacies.delete(pharmacy);
        return AdminEnvelopes.one(pharmacy(clinicId, pharmacy));
    }

    /** How many prescriptions name this pharmacy. */
    private int prescriptionsSentTo(UUID clinicId, UUID pharmacyId) {
        Integer count =
                jdbc.queryForObject(
                        "select count(*) from prescriptions where clinic_id = ? and pharmacy_id = ?",
                        Integer.class,
                        clinicId,
                        pharmacyId);
        return count == null ? 0 : count;
    }

    /** One pharmacy, as the settings screen reads it. */
    private Map<String, Object> pharmacy(UUID clinicId, ClinicPharmacy pharmacy) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", pharmacy.getId().toString());
        item.put("name", pharmacy.getName());
        item.put("address", pharmacy.getAddress());
        item.put("city", pharmacy.getCity());
        item.put("state", pharmacy.getState());
        item.put("phone", pharmacy.getPhone());
        item.put("email", pharmacy.getEmail() == null ? "" : pharmacy.getEmail());
        item.put("contactPerson", pharmacy.getContactPerson() == null ? "" : pharmacy.getContactPerson());
        item.put("active", pharmacy.isActive());
        item.put("prescriptions", prescriptionsSentTo(clinicId, pharmacy.getId()));
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

    /** The pharmacy the clinic sends to. */
    public record PharmacyRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @Size(max = 240) String address,
            @Size(max = 80) String city,
            @Size(max = 80) String state,
            @Size(max = 40) String phone,
            @Email @Size(max = 160) String email,
            @Size(max = 120) String contactPerson,
            Boolean inactive) {}
}
