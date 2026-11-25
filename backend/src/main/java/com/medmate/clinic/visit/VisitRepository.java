package com.medmate.clinic.visit;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the visits table. */
public interface VisitRepository extends JpaRepository<Visit, UUID> {

    List<Visit> findByClinicIdOrderByCreatedAtAsc(UUID clinicId);

    List<Visit> findByClinicIdAndStatusOrderByCreatedAtAsc(UUID clinicId, String status);

    List<Visit> findByClinicIdAndCreatedAtBetweenOrderByCreatedAtAsc(UUID clinicId, Instant from, Instant to);

    Optional<Visit> findFirstByClinicIdAndTokenOrderByCreatedAtDesc(UUID clinicId, String token);

    Optional<Visit> findByIdAndClinicId(UUID id, UUID clinicId);
}
