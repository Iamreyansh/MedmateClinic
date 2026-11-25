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
    private final PublicLinkRepository links;
    private final ClinicSchemaResolver resolver;

    public ClinicRouting(
            ClinicDirectoryRepository directory,
            RegistryClinicRepository clinics,
            PublicLinkRepository links,
            ClinicSchemaResolver resolver) {
        this.directory = directory;
        this.clinics = clinics;
        this.links = links;
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

    /**
     * Point the request at the clinic behind a patient's own link.
     *
     * <p>The link is the only thing that says which clinic the patient is in —
     * they have no session — so the service looks it up in the registry.
     */
    public RegistryClinic routeByLink(String linkKey) {
        PublicLink link =
                links.findByLinkKey(linkKey)
                        .orElseThrow(
                                () ->
                                        new UnauthorizedException(
                                                "This link is not valid. Ask the clinic for a new one."));
        return route(link.getClinicId());
    }

    /** Point the request at a clinic's schema. */
    public RegistryClinic route(UUID clinicId) {
        RegistryClinic clinic =
                clinics.findById(clinicId)
                        .orElseThrow(() -> new UnauthorizedException("That clinic is not set up."));
        resolver.use(clinic.getSchemaName());
        return clinic;
    }

    /**
     * Point the request at the clinic behind a public booking slug.
     *
     * <p>The patient's booking page is public, so the slug is the only thing
     * that says which clinic they are in. Nothing else about the clinic is
     * exposed by the slug.
     */
    public RegistryClinic routeBySlug(String slug) {
        RegistryClinic clinic =
                clinics.findByBookingSlug(slug)
                        .orElseThrow(
                                () ->
                                        new UnauthorizedException(
                                                "Please use your clinic's own booking link. Ask the clinic, or find it on their WhatsApp or Google page."));
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
