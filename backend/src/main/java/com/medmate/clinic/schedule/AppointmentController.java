package com.medmate.clinic.schedule;

import com.medmate.clinic.security.CurrentClinic;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    /**
     * The book, as the screen asked for it: a day, or a week.
     *
     * <p>With a range of days, the book is a page of the appointments in
     * those days.
     */
    @GetMapping
    public Map<String, Object> book(
            @RequestParam(required = false) String view,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String doctor,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false, defaultValue = "50") int limit,
            @RequestParam(required = false, defaultValue = "0") int offset) {
        return appointments.book(current.get(), view, date, doctor, from, to, limit, offset);
    }

    /** The strip: a day at a time, and what is free for each doctor. */
    @GetMapping("/summary")
    public Map<String, Object> summary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return appointments.summary(current.get(), from, to);
    }

    /** Book a visit. */
    @PostMapping
    public Map<String, Object> create(@RequestBody(required = false) BookingRequest request) {
        return appointments.create(current.get(), request);
    }

    /** What the desk types to book a visit. */
    public record BookingRequest(
            String patient,
            String doctor,
            String date,
            String time,
            String reason,
            String mode) {}
}
