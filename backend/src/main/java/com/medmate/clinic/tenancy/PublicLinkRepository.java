package com.medmate.clinic.tenancy;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the patient's own links. */
public interface PublicLinkRepository extends JpaRepository<PublicLink, String> {

    Optional<PublicLink> findByLinkKey(String linkKey);
}
