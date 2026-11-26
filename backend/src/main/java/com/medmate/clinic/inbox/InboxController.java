package com.medmate.clinic.inbox;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The inbox: the things waiting for the doctor. */
@RestController
@RequestMapping("/api/clinic/inbox")
public class InboxController {

    private final InboxService inbox;
    private final CurrentClinic current;

    public InboxController(InboxService inbox, CurrentClinic current) {
        this.inbox = inbox;
        this.current = current;
    }

    /** The list, with the counts the filter chips show. */
    @GetMapping
    public Map<String, Object> list() {
        return inbox.inbox(current.get());
    }
}
