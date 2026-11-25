package com.medmate.clinic.clinic;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's own settings: who it is, where it is, and what it does.
 *
 * <p>The settings screen used to draw hard-coded details; this is the clinic's
 * own record, so what it shows is what the clinic has.
 */
@Service
public class ClinicSettingsService {

    private final RegistryClinicRepository clinics;
    private final ClinicProfileRepository profiles;
    private final StaffRepository staff;

    public ClinicSettingsService(
            RegistryClinicRepository clinics,
            ClinicProfileRepository profiles,
            StaffRepository staff) {
        this.clinics = clinics;
        this.profiles = profiles;
        this.staff = staff;
    }

    /** The clinic's own record. */
    @Transactional(readOnly = true)
    public Map<String, Object> settings(ClinicPrincipal principal) {
        if (!principal.can("settings")) {
            throw new ForbiddenException("You cannot open the settings.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        RegistryClinic clinic = clinics.findById(clinicId).orElse(null);
        ClinicProfile profile = profiles.findById(clinicId).orElse(null);

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", clinic == null ? clinicId.toString() : clinic.getId().toString());
        card.put("name", clinic == null ? "" : clinic.getName());
        card.put("initials", clinic == null ? "" : clinic.getInitials());
        card.put("bookingSlug", clinic == null ? "" : clinic.getBookingSlug());
        card.put("address", profile == null ? "" : nullToEmpty(profile.getAddress()));
        card.put("city", profile == null ? "" : nullToEmpty(profile.getCity()));
        card.put("state", profile == null ? "" : nullToEmpty(profile.getState()));
        card.put("phone", profile == null ? "" : nullToEmpty(profile.getPhone()));
        card.put("email", "");
        card.put("gstin", profile == null ? "" : nullToEmpty(profile.getGstin()));
        card.put("pan", profile == null ? "" : nullToEmpty(profile.getPan()));
        card.put("registration", profile == null ? "" : nullToEmpty(profile.getRegistration()));
        // The canonical name is hfrId; hfr travels with it so the screens that
        // were written against the older name keep working.
        String hfr = profile == null ? "" : nullToEmpty(profile.getHfrId());
        card.put("hfrId", hfr);
        card.put("hfr", hfr);
        card.put("locations", profile == null ? 1 : profile.getLocations());
        card.put("pin", profile == null ? "" : nullToEmpty(profile.getPin()));

        List<Map<String, Object>> locations = new ArrayList<>();
        locations.add(location(card));

        List<Map<String, Object>> services = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (person.getSpeciality() == null || person.getSpeciality().isBlank()) {
                continue;
            }
            Map<String, Object> service = new LinkedHashMap<>();
            service.put("id", person.getId().toString());
            service.put("name", person.getFullName());
            service.put("speciality", person.getSpeciality());
            service.put("registration", nullToEmpty(person.getRegistration()));
            services.add(service);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("clinic", card);
        body.put("locations", locations);
        body.put("services", services);
        return body;
    }

    /** The one location the clinic runs in. */
    private Map<String, Object> location(Map<String, Object> clinic) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", clinic.get("id"));
        body.put("name", clinic.get("name"));
        body.put("address", clinic.get("address"));
        body.put("city", clinic.get("city"));
        body.put("state", clinic.get("state"));
        body.put("phone", clinic.get("phone"));
        body.put("rooms", 0);
        body.put("hfrId", clinic.get("hfrId"));
        body.put("hfr", clinic.get("hfr"));
        return body;
    }

    /** The text, if there is any. */
    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
