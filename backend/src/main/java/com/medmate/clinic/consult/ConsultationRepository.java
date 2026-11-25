package com.medmate.clinic.consult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the consultation table. */
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    Optional<Consultation> findByClinicIdAndVisitId(UUID clinicId, UUID visitId);
}
