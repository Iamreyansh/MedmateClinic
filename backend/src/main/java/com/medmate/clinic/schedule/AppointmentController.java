package com.medmate.clinic.schedule;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The appointment book. */
@RestController
@RequestMapping("/api/clinic/appointments")
public class AppointmentController {

    private final AppointmentService appointments;
    private final CurrentClinic current;

    public AppointmentController(AppointmentService appointments, CurrentClinic current) {
        this.appointments = appointments;
        this.current = current;
    }

    /** The book, as the screen asked for it: a day, or a week. */
    @GetMapping
    public Map<String, Object> book(
            @RequestParam(required = false) String view,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String doctor) {
        return appointments.book(current.get(), view, date, doctor);
    }
}
