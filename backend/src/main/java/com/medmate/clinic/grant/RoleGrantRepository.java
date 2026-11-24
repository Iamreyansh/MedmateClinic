package com.medmate.clinic.grant;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads which grants belong to a role. */
public interface RoleGrantRepository extends JpaRepository<RoleGrant, RoleGrantId> {

    List<RoleGrant> findByIdRoleId(UUID roleId);
}
