package com.medmate.clinic.consult;

import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** One visit: the patient in the room, and what the doctor writes about them. */
@RestController
@RequestMapping("/api/clinic/visits")
public class VisitController {

    private final ConsultService consults;
    private final CurrentClinic current;

    public VisitController(ConsultService consults, CurrentClinic current) {
        this.consults = consults;
        this.current = current;
    }

    /** The visit, the patient, the vitals and the draft consultation. */
    @GetMapping("/{id}")
    public Map<String, Object> visit(@PathVariable String id) {
        return consults.load(current.get(), id);
    }

    /** Save the draft. */
    @PostMapping("/{id}/consult")
    public Map<String, Object> save(
            @PathVariable String id, @RequestBody ConsultService.ConsultationRequest request) {
        return consults.saveConsultation(current.get(), id, request);
    }

    /** Call the patient in: the clock on the wait starts here. */
    @PostMapping("/{id}/start")
    public Map<String, Object> start(@PathVariable String id) {
        return consults.start(current.get(), id);
    }
}
