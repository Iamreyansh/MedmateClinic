package com.medmate.clinic.template;

import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.security.ClinicPrincipal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's reusable treatment protocols.
 *
 * <p>A template is the lines a doctor writes for the same condition every
 * time. The screen shows them as a list, and the doctor applies one in the
 * console and adjusts the doses by weight.
 */
@Service
public class TemplateService {

    private final TemplateRepository templates;

    public TemplateService(TemplateRepository templates) {
        this.templates = templates;
    }

    /** The clinic's templates. */
    @Transactional(readOnly = true)
    public Map<String, Object> list(ClinicPrincipal principal) {
        if (!principal.can("template")) {
            throw new ForbiddenException("You cannot open the templates.");
        }
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Template template : templates.findByClinicIdOrderByUsedCountDesc(clinicId)) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", template.getId().toString());
            body.put("name", template.getName());
            body.put("code", template.getDiagnosisCode());
            body.put("condition", template.getCondition());
            body.put("lines", linesOf(template));
            body.put("used", template.getUsedCount() == null ? 0 : template.getUsedCount());
            items.add(body);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put(
                "meta",
                "Your reusable treatment protocols. Apply one in the console and adjust doses by weight.");
        return body;
    }

    /** The lines of the protocol, as one string per line. */
    private List<String> linesOf(Template template) {
        List<String> lines = new ArrayList<>();
        if (template.getLines() == null) {
            return lines;
        }
        for (Map<String, Object> line : template.getLines()) {
            Object text = line.get("text");
            if (text == null) {
                text = line.get("label");
            }
            if (text == null) {
                text = line.get("name");
            }
            lines.add(text == null ? "" : String.valueOf(text));
        }
        return lines;
    }
}
