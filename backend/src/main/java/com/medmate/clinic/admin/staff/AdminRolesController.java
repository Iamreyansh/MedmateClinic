package com.medmate.clinic.admin.staff;

import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Who can open what: the roles the clinic has, and the screens it grants. */
@RestController
@RequestMapping("/api/clinic/admin")
public class AdminRolesController {

    private final AdminRolesService roles;
    private final CurrentClinic current;

    public AdminRolesController(AdminRolesService roles, CurrentClinic current) {
        this.roles = roles;
        this.current = current;
    }

    /** The clinic's roles, and what each of them may open. */
    @GetMapping("/roles")
    public Map<String, Object> roles() {
        return roles.roles(current.get());
    }

    /** The screens the matrix has a column for. */
    @GetMapping("/screens")
    public Map<String, Object> screens() {
        return roles.screens(current.get());
    }
}
