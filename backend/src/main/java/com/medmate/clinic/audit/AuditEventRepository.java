package com.medmate.clinic.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the audit trail. */
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findTop100ByClinicIdOrderByCreatedAtDesc(UUID clinicId);

    List<AuditEvent> findTop100ByClinicIdAndActorStaffIdOrderByCreatedAtDesc(UUID clinicId, UUID actorStaffId);

    List<AuditEvent> findTop100ByClinicIdAndActionStartsWithOrderByCreatedAtDesc(UUID clinicId, String prefix);
}
