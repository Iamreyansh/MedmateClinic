package com.medmate.clinic.prescription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the prescription table. */
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    List<Prescription> findByClinicIdAndVisitIdOrderByCreatedAtDesc(UUID clinicId, UUID visitId);
    List<Prescription> findByClinicIdAndStatusOrderBySignedAtDesc(UUID clinicId, String status);
    Optional<Prescription> findByIdAndClinicId(UUID id, UUID clinicId);
}
