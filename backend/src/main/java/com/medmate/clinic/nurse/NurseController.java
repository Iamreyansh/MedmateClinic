package com.medmate.clinic.nurse;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The nurse station.
 *
 * The station is behind the session: the nurse is the one who records the
 * vitals and routes the patient, and only the clinic's own staff may do that.
 */
@RestController
@RequestMapping("/api/clinic/nurse")
public class NurseController {

    private final NurseService nurse;
    private final CurrentClinic current;

    public NurseController(NurseService nurse, CurrentClinic current) {
        this.nurse = nurse;
        this.current = current;
    }

    /** Everyone in the clinic today, and where they are. */
    @GetMapping
    public Map<String, Object> station() {
        return nurse.station(current.get());
    }

    /** The doctors a patient can be sent to. */
    @GetMapping("/doctors")
    public Object doctors() {
        return nurse.doctors(current.get().clinicIdAsUuid());
    }

    /** Record the vitals and send the patient to the doctor. */
    @PostMapping("/vitals")
    public Map<String, Object> record(@RequestBody Map<String, Object> request) {
        return nurse.record(current.get(), request);
    }
}
