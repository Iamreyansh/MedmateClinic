package com.medmate.clinic.clinic;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's locations.
 *
 * <p>The shape is the one the settings screen uses: the place the clinic
 * runs in, with the rooms it has and the health facility registration it
 * answers under.
 *
 * <p>The list is capped and read from the clinic's own profile — one row for
 * one location, so a clinic with many branches does not answer with a
 * directory.
 */
@Service
public class ClinicLocationsService {

    /** The most locations one page holds. */
    public static final int PAGE_SIZE = 50;

    private final ClinicProfileRepository profiles;
    private final com.medmate.clinic.tenancy.RegistryClinicRepository clinics;

    public ClinicLocationsService(
            ClinicProfileRepository profiles,
            com.medmate.clinic.tenancy.RegistryClinicRepository clinics) {
        this.profiles = profiles;
        this.clinics = clinics;
    }

    /** Where the clinic runs. */
    @Transactional(readOnly = true)
    public Map<String, Object> locations(ClinicPrincipal principal) {
        if (!principal.can("location") && !principal.can("settings")) {
            throw new ForbiddenException("You cannot open the locations.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        if (profile != null && items.size() < PAGE_SIZE) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", clinicName(clinicId));
            item.put("address", nullToEmpty(profile.getAddress()));
            item.put("city", nullToEmpty(profile.getCity()));
            item.put("state", nullToEmpty(profile.getState()));
            item.put("phone", nullToEmpty(profile.getPhone()));
            item.put("rooms", 0);
            item.put("hfrId", nullToEmpty(profile.getHfrId()));
            items.add(item);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("meta", items.size() + (items.size() == 1 ? " location" : " locations"));
        return body;
    }

    /** The clinic's name, for the location's name. */
    private String clinicName(UUID clinicId) {
        return clinics.findById(clinicId).map(c -> c.getName()).orElse("");
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
