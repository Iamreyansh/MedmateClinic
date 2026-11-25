package com.medmate.clinic.clinic;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Where the clinic runs. */
@RestController
@RequestMapping("/api/clinic/locations")
public class ClinicLocationsController {

    private final ClinicLocationsService locations;
    private final CurrentClinic current;

    public ClinicLocationsController(ClinicLocationsService locations, CurrentClinic current) {
        this.locations = locations;
        this.current = current;
    }

    /** The clinic's locations. */
    @GetMapping
    public Map<String, Object> list() {
        return locations.locations(current.get());
    }
}
