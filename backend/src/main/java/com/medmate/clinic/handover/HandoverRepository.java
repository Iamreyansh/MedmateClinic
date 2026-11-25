package com.medmate.clinic.handover;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the handover table. */
public interface HandoverRepository extends JpaRepository<Handover, UUID> {

    List<Handover> findByClinicIdAndStatusOrderByCreatedAtDesc(UUID clinicId, String status);
    List<Handover> findByClinicIdAndPatientIdOrderByCreatedAtDesc(UUID clinicId, UUID patientId);
}
