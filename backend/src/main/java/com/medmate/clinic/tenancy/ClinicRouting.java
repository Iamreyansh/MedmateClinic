package com.medmate.clinic.tenancy;

import com.medmate.clinic.common.UnauthorizedException;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Points the request at a clinic's schema.
 *
 * <p>The sign-in arrives with only a mobile number, so the directory says
 * which clinic it belongs to; after that the token carries the clinic and the
 * filter routes every request.
 */
@Service
public class ClinicRouting {

    private final ClinicDirectoryRepository directory;
    private final RegistryClinicRepository clinics;
    private final ClinicSchemaResolver resolver;

    public ClinicRouting(
            ClinicDirectoryRepository directory,
            RegistryClinicRepository clinics,
            ClinicSchemaResolver resolver) {
        this.directory = directory;
        this.clinics = clinics;
        this.resolver = resolver;
    }

    /** The clinic a mobile number belongs to, and the schema it lives in. */
    public RegistryClinic routeByPhone(String phone) {
        ClinicDirectory entry =
                directory.findByPhone(phone).stream()
                        .findFirst()
                        .orElseThrow(
                                () -> new UnauthorizedException("That number is not registered with a clinic."));
        return route(entry.getClinicId());
    }

    /** Point the request at a clinic's schema. */
    public RegistryClinic route(UUID clinicId) {
        RegistryClinic clinic =
                clinics.findById(clinicId)
                        .orElseThrow(() -> new UnauthorizedException("That clinic is not set up."));
        resolver.use(clinic.getSchemaName());
        return clinic;
    }

    /** The clinic behind a staff id, for the sessions that start without one. */
    public RegistryClinic routeByStaff(UUID staffId) {
        ClinicDirectory entry =
                directory.findAll().stream()
                        .filter(row -> row.getStaffId().equals(staffId))
                        .findFirst()
                        .orElseThrow(() -> new UnauthorizedException("That person is not set up."));
        return route(entry.getClinicId());
    }

    /** Forget the clinic, back to the registry. */
    public void clear() {
        resolver.clear();
    }
}
