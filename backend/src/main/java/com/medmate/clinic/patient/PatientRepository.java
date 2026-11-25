package com.medmate.clinic.patient;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the patients table. */
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    List<Patient> findByClinicIdOrderByCreatedAtAsc(UUID clinicId);

    Optional<Patient> findByIdAndClinicId(UUID id, UUID clinicId);
}
