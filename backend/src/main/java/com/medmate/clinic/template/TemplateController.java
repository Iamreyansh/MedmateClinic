package com.medmate.clinic.template;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's reusable treatment protocols. */
@RestController
@RequestMapping("/api/clinic/templates")
public class TemplateController {

    private final TemplateService templates;
    private final CurrentClinic current;

    public TemplateController(TemplateService templates, CurrentClinic current) {
        this.templates = templates;
        this.current = current;
    }

    /** The clinic's templates. */
    @GetMapping
    public Map<String, Object> list() {
        return templates.list(current.get());
    }
}
