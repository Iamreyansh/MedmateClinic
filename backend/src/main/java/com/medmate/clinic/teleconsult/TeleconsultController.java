package com.medmate.clinic.teleconsult;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The video consultation: who is waiting, and the consent that was given. */
@RestController
@RequestMapping("/api/clinic/teleconsult")
public class TeleconsultController {

    private final TeleconsultService teleconsult;
    private final CurrentClinic current;

    public TeleconsultController(TeleconsultService teleconsult, CurrentClinic current) {
        this.teleconsult = teleconsult;
        this.current = current;
    }

    /** Who is waiting. */
    @GetMapping
    public Map<String, Object> waiting() {
        return teleconsult.waiting(current.get());
    }
}
