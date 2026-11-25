package com.medmate.clinic.lab;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The lab and diagnostics bench.
 *
 * The bench is behind the session: only the clinic's own staff may open the
 * samples, and only the technician who owns them may report a result.
 */
@RestController
@RequestMapping("/api/clinic/lab")
public class LabController {

    private final LabService lab;
    private final CurrentClinic current;

    public LabController(LabService lab, CurrentClinic current) {
        this.lab = lab;
        this.current = current;
    }

    /** The samples on the bench, and what has been reported. */
    @GetMapping
    public Map<String, Object> bench() {
        return lab.bench(current.get());
    }

    /** Report a result. It goes back to the doctor who ordered the test. */
    @PostMapping("/results")
    public Map<String, Object> report(@RequestBody Map<String, Object> request) {
        return lab.report(current.get(), request);
    }

    /** Move a sample on — collected, sent out, or received back. */
    @PostMapping("/orders/{orderId}")
    public Map<String, Object> move(
            @PathVariable String orderId, @RequestBody Map<String, Object> request) {
        return lab.move(current.get(), orderId, request);
    }
}
