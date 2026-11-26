package com.medmate.clinic.onboarding;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Reads the pending verifications — the numbers proved before a clinic exists. */
public interface PendingVerificationRepository extends JpaRepository<PendingVerification, UUID> {

    /** The pending verification for a number, if there is one. */
    Optional<PendingVerification> findByMobile(String mobile);

    /**
     * Spend the proof on a clinic.
     *
     * <p>The update is conditional, so it is the claim itself: the first
     * sign-up to reach it takes the row, and the second one changes no rows and
     * is told the number has already been used. One verified number can
     * therefore never create two clinics.
     */
    @Modifying
    @Query(
            "update PendingVerification p set p.consumedAt = :now "
                    + "where p.mobile = :mobile and p.verified = true "
                    + "and p.consumedAt is null and p.expiresAt > :now")
    int claim(
            @Param("mobile") String mobile,
            @Param("now") java.time.Instant now);
}
