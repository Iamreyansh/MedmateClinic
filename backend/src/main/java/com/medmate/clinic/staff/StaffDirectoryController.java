package com.medmate.clinic.staff;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's team. */
@RestController
@RequestMapping("/api/clinic/staff")
public class StaffDirectoryController {

    private final StaffDirectoryService staff;
    private final CurrentClinic current;

    public StaffDirectoryController(StaffDirectoryService staff, CurrentClinic current) {
        this.staff = staff;
        this.current = current;
    }

    /** The clinic's team. */
    @GetMapping
    public Map<String, Object> team() {
        return staff.team(current.get());
    }
}
