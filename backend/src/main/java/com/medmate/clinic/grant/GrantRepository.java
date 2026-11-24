package com.medmate.clinic.grant;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the grants table. */
public interface GrantRepository extends JpaRepository<Grant, UUID> {
}
