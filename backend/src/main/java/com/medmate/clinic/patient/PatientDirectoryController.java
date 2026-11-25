package com.medmate.clinic.patient;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The clinic's patients: the list, and the record behind one of them.
 *
 * <p>The list is a list of summaries; the record is one patient's whole story.
 * They are different payloads, because the list screen and the record screen
 * are different screens.
 */
@RestController
@RequestMapping("/api/clinic/patients")
public class PatientDirectoryController {

    private final PatientDirectoryService patients;
    private final CurrentClinic current;

    public PatientDirectoryController(PatientDirectoryService patients, CurrentClinic current) {
        this.patients = patients;
        this.current = current;
    }

    /** Everyone the clinic has met. */
    @GetMapping
    public Map<String, Object> list() {
        return patients.list(current.get());
    }

    /** One patient's record. */
    @GetMapping("/{id}")
    public Map<String, Object> record(@PathVariable String id) {
        return patients.record(current.get(), id);
    }
}
