package com.medmate.clinic.message;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The messages the clinic sent to its patients. */
@RestController
@RequestMapping("/api/clinic/messages")
public class MessageController {

    private final MessageService messages;
    private final CurrentClinic current;

    public MessageController(MessageService messages, CurrentClinic current) {
        this.messages = messages;
        this.current = current;
    }

    /** The log, with the counts the filter chips show. */
    @GetMapping
    public Map<String, Object> log(@RequestParam(required = false) String filter) {
        return messages.log(current.get(), filter);
    }

    /** Send it again. */
    @PostMapping("/{id}/resend")
    public Map<String, Object> resend(@PathVariable String id) {
        return messages.resend(current.get(), id);
    }
}
