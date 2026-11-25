package com.medmate.clinic.tenancy;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the tenant directory. */
public interface RegistryClinicRepository extends JpaRepository<RegistryClinic, UUID> {

    Optional<RegistryClinic> findBySchemaName(String schemaName);

    /** The clinic behind a public booking slug. */
    Optional<RegistryClinic> findByBookingSlug(String bookingSlug);
}
