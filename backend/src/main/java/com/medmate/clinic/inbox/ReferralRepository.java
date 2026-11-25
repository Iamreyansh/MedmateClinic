package com.medmate.clinic.inbox;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the referral table. */
public interface ReferralRepository extends JpaRepository<Referral, UUID> {

    List<Referral> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);
    Optional<Referral> findByIdAndClinicId(UUID id, UUID clinicId);
}
