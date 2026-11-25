package com.medmate.clinic.message;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The messages the clinic sent to its patients.
 *
 * <p>Every prescription that is signed, every booking and every payment sends
 * a message. This is the log of those messages: what was sent, to whom, and
 * what failed — so the front desk can send it again.
 */
@Service
public class MessageService {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("d MMM, h:mm a");
    private static final List<String> KINDS = List.of("token", "reminder", "prescription", "payment");

    private final MessageRepository messages;
    private final PatientRepository patients;
    private final com.medmate.clinic.common.ClinicZoneService zones;

    public MessageService(
            MessageRepository messages,
            PatientRepository patients,
            com.medmate.clinic.common.ClinicZoneService zones) {
        this.messages = messages;
        this.patients = patients;
        this.zones = zones;
    }

    /** The log, with the counts the filter chips show. */
    @Transactional(readOnly = true)
    public Map<String, Object> log(ClinicPrincipal principal, String filter) {
        if (!principal.can("message")) {
            throw new ForbiddenException("You cannot open patient messages.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        List<Message> all = messages.findByClinicIdOrderByCreatedAtDesc(clinicId);

        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("all", all.size());
        int failed = 0;
        for (String kind : KINDS) {
            counts.put(kind, 0);
        }
        for (Message message : all) {
            String kind = kindOf(message);
            if ("failed".equals(message.getStatus())) {
                failed++;
            } else {
                counts.merge(kind, 1, Integer::sum);
            }
        }
        counts.put("failed", failed);

        String wanted = filter == null || filter.isBlank() ? "all" : filter.trim().toLowerCase();
        List<Map<String, Object>> items = new ArrayList<>();
        for (Message message : all) {
            String kind = kindOf(message);
            boolean failedMessage = "failed".equals(message.getStatus());
            if (!"all".equals(wanted) && !wanted.equals(kind) && !("failed".equals(wanted) && failedMessage)) {
                continue;
            }
            items.add(card(message, zone));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        body.put("filter", wanted);
        body.put("items", items);
        return body;
    }

    /** Send it again. */
    @Transactional
    public Map<String, Object> resend(ClinicPrincipal principal, String messageId) {
        if (!principal.can("message")) {
            throw new ForbiddenException("You cannot open patient messages.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        Message message =
                messages.findByIdAndClinicId(parseUuid(messageId), clinicId)
                        .orElseThrow(() -> new NotFoundException("That message is not here."));
        message.setStatus("sent");
        message.setSentAt(Instant.now());
        messages.save(message);
        return card(message, zones.zoneOf(clinicId));
    }

    private Map<String, Object> card(Message message, ZoneId zone) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", message.getId().toString());
        item.put("kind", kindOf(message));
        item.put("channel", message.getChannel() == null ? "sms" : message.getChannel());
        item.put("template", message.getTemplate() == null ? "" : message.getTemplate());
        item.put("body", message.getBody() == null ? "" : message.getBody());
        item.put("status", message.getStatus() == null ? "sent" : message.getStatus());
        item.put("failed", "failed".equals(message.getStatus()));
        item.put(
                "sentAt",
                message.getSentAt() == null
                        ? null
                        : message.getSentAt().atZone(zone).format(STAMP));
        item.put("canResend", true);

        Map<String, Object> patient = new LinkedHashMap<>();
        if (message.getPatientId() != null) {
            patients.findById(message.getPatientId()).ifPresent(person -> {
                patient.put("id", person.getId().toString());
                patient.put("name", person.getFullName());
                patient.put("phone", person.getPhone() == null ? "" : person.getPhone());
                patient.put("initials", initials(person.getFullName()));
            });
        }
        item.put("patient", patient);
        return item;
    }

    /** What the message was about, read from the template it was sent from. */
    static String kindOf(Message message) {
        String template = message.getTemplate() == null ? "" : message.getTemplate().toLowerCase();
        if (template.contains("token")) {
            return "token";
        }
        if (template.contains("reminder") || template.contains("appointment")) {
            return "reminder";
        }
        if (template.contains("payment") || template.contains("invoice") || template.contains("bill")) {
            return "payment";
        }
        if (template.contains("prescription") || template.contains("rx")) {
            return "prescription";
        }
        return "prescription";
    }

    static String initials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String[] parts = name.trim().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(part.charAt(0)));
        }
        return out.toString();
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException notAUuid) {
            throw new NotFoundException("That message is not here.");
        }
    }
}
