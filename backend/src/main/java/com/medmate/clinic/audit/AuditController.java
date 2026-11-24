package com.medmate.clinic.audit;

import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The activity log: who did what, and when. */
@RestController
@RequestMapping("/api/clinic")
public class AuditController {

    private final CurrentClinic current;
    private final AuditService audit;

    public AuditController(CurrentClinic current, AuditService audit) {
        this.current = current;
        this.audit = audit;
    }

    @GetMapping("/activity")
    public Map<String, Object> activity(
            @RequestParam(required = false) UUID person,
            @RequestParam(required = false) String category) {
        ClinicPrincipal principal = current.get();
        UUID clinicId = UUID.fromString(principal.clinicId());

        List<Map<String, Object>> events =
                audit.recent(clinicId, person, category).stream().map(this::describe).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("events", events);
        body.put("count", events.size());
        return body;
    }

    private Map<String, Object> describe(AuditEvent event) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", event.getId().toString());
        item.put("action", event.getAction());
        item.put("category", event.getAction().split("\\.")[0]);
        item.put("resourceType", event.getResourceType());
        item.put("resourceId", event.getResourceId());
        item.put("actor", event.getActorStaffId() == null ? null : event.getActorStaffId().toString());
        item.put("role", event.getActorRole());
        item.put("detail", event.getDetail());
        item.put("ip", event.getIpAddress());
        item.put("at", event.getCreatedAt() == null ? null : Instant.ofEpochMilli(event.getCreatedAt().toEpochMilli()).toString());
        return item;
    }
}
