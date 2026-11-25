package com.medmate.clinic.clinic;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's own settings. */
@RestController
@RequestMapping("/api/clinic/settings")
public class ClinicSettingsController {

    private final ClinicSettingsService settings;
    private final CurrentClinic current;

    public ClinicSettingsController(ClinicSettingsService settings, CurrentClinic current) {
        this.settings = settings;
        this.current = current;
    }

    /** The clinic's own record: who it is, where it is, what it does. */
    @GetMapping
    public Map<String, Object> settings() {
        return settings.settings(current.get());
    }
}
