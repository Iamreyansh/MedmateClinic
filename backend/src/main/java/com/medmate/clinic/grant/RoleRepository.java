package com.medmate.clinic.grant;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the roles table. */
public interface RoleRepository extends JpaRepository<Role, UUID> {
}
