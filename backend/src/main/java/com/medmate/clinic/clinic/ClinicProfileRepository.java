package com.medmate.clinic.clinic;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the clinic's own profile. */
public interface ClinicProfileRepository extends JpaRepository<ClinicProfile, UUID> {}
