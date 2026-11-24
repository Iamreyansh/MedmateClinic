package com.medmate.clinic.registry;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the clinics table. */
public interface ClinicRepository extends JpaRepository<Clinic, UUID> {
}
