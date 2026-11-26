package com.medmate.clinic.tenancy;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the patient's own links. */
public interface PublicLinkRepository extends JpaRepository<PublicLink, String> {

    Optional<PublicLink> findByLinkKey(String linkKey);

    Optional<PublicLink> findByLinkKeyAndKind(String linkKey, String kind);

    /** The booking a repeated submission already made, if it made one. */
    Optional<PublicLink> findByClinicIdAndIdempotencyKey(UUID clinicId, String idempotencyKey);

    /** Every verification link the clinic has handed out for a prescription. */
    List<PublicLink> findByClinicIdAndKind(UUID clinicId, String kind);
}
