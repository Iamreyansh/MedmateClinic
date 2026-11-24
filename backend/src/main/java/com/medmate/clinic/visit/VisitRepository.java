package com.medmate.clinic.visit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the visits table. */
public interface VisitRepository extends JpaRepository<Visit, UUID> {

    List<Visit> findByClinicIdOrderByCreatedAtAsc(UUID clinicId);

    List<Visit> findByClinicIdAndStatusOrderByCreatedAtAsc(UUID clinicId, String status);
}
