package com.medmate.clinic.visitintake;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads what a patient wrote on the symptoms form. */
public interface VisitIntakeRepository extends JpaRepository<VisitIntake, UUID> {

    List<VisitIntake> findByClinicIdAndVisitIdOrderBySubmittedAtDesc(UUID clinicId, UUID visitId);

    Optional<VisitIntake> findFirstByClinicIdAndVisitIdOrderBySubmittedAtDesc(
            UUID clinicId, UUID visitId);
}
