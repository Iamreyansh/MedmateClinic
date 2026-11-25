package com.medmate.clinic.desk;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The reception desk: what is waiting to be handed to the patient. */
@RestController
@RequestMapping("/api/clinic/desk")
public class DeskController {

    private final DeskService desk;
    private final CurrentClinic current;

    public DeskController(DeskService desk, CurrentClinic current) {
        this.desk = desk;
        this.current = current;
    }

    /** Today's visits, and what each one still needs. */
    @GetMapping
    public Map<String, Object> desk() {
        return desk.desk(current.get());
    }

    /** The patient has the prescription and the bill: close the hand-over. */
    @PostMapping("/{visitId}/checkout")
    public Map<String, Object> checkOut(@PathVariable String visitId) {
        return desk.checkOut(current.get(), visitId);
    }

    /** The clinic's public booking link, to share with a patient. */
    @GetMapping("/booking-link")
    public Map<String, Object> bookingLink() {
        return desk.bookingLink(current.get());
    }
}
