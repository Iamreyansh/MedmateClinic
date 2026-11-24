package com.medmate.clinic.audit;

import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.tenancy.ClinicRouting;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes down what happened.
 *
 * <p>Every sign-in, record opened, prescription signed and payment taken goes
 * here. The trail is the reason the role model exists, so it is written on the
 * same transaction as the thing it describes — if the thing did not happen,
 * neither did the record of it.
 */
@Service
public class AuditService {

    private final AuditEventRepository events;
    private final ClinicRouting routing;
    private final HttpServletRequest request;

    public AuditService(
            AuditEventRepository events, ClinicRouting routing, HttpServletRequest request) {
        this.events = events;
        this.routing = routing;
        this.request = request;
    }

    /** Record something that happened, on its own so a failure never loses it. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            UUID clinicId,
            UUID actorStaffId,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            Map<String, Object> detail) {
        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setClinicId(clinicId);
        event.setActorStaffId(actorStaffId);
        event.setActorRole(actorRole);
        event.setAction(action);
        event.setResourceType(resourceType);
        event.setResourceId(resourceId);
        event.setDetail(detail == null ? new LinkedHashMap<>() : detail);
        event.setIpAddress(clientIp());
        event.setUserAgent(request.getHeader("User-Agent"));
        events.save(event);
    }

    /** Record something the signed-in person did. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            ClinicPrincipal principal,
            String action,
            String resourceType,
            String resourceId,
            Map<String, Object> detail) {
        record(
                UUID.fromString(principal.clinicId()),
                UUID.fromString(principal.staffId()),
                principal.role(),
                action,
                resourceType,
                resourceId,
                detail);
    }

    /** The trail for a clinic, newest first. */
    @Transactional(readOnly = true)
    public List<AuditEvent> recent(UUID clinicId, UUID actorStaffId, String actionPrefix) {
        if (actorStaffId != null) {
            return events.findTop100ByClinicIdAndActorStaffIdOrderByCreatedAtDesc(clinicId, actorStaffId);
        }
        if (actionPrefix != null && !actionPrefix.isBlank()) {
            return events.findTop100ByClinicIdAndActionStartsWithOrderByCreatedAtDesc(clinicId, actionPrefix);
        }
        return events.findTop100ByClinicIdOrderByCreatedAtDesc(clinicId);
    }

    private String clientIp() {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
