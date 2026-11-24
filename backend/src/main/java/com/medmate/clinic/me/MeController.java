package com.medmate.clinic.me;

import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.registry.Clinic;
import com.medmate.clinic.registry.ClinicRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Who is signed in, and what they may open. */
@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentClinic current;
    private final ClinicRepository clinicRepository;
    private final StaffRepository staffRepository;
    private final RoleRepository roleRepository;
    private final GrantService grantService;

    public MeController(
            CurrentClinic current,
            ClinicRepository clinicRepository,
            StaffRepository staffRepository,
            RoleRepository roleRepository,
            GrantService grantService) {
        this.current = current;
        this.clinicRepository = clinicRepository;
        this.staffRepository = staffRepository;
        this.roleRepository = roleRepository;
        this.grantService = grantService;
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        ClinicPrincipal principal = current.get();
        Clinic clinic = clinicRepository.findById(UUID.fromString(principal.clinicId()))
                .orElseThrow(() -> new IllegalStateException("the clinic is gone"));
        Staff staff = staffRepository.findById(UUID.fromString(principal.staffId()))
                .orElseThrow(() -> new IllegalStateException("the person is gone"));

        String roleName = principal.role();
        if (staff.getRoleId() != null) {
            Role role = roleRepository.findById(staff.getRoleId()).orElse(null);
            if (role != null) {
                roleName = role.getName();
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "clinic",
                Map.of(
                        "id", clinic.getId().toString(),
                        "name", clinic.getName(),
                        "initials", clinic.getInitials(),
                        "locations", clinic.getLocations(),
                        "doctors", staffRepository.findByClinicId(clinic.getId()).stream()
                                .filter(s -> s.getRoleId() != null)
                                .count()));
        body.put(
                "user",
                Map.of(
                        "id", staff.getId().toString(),
                        "name", staff.getFullName(),
                        "initials", initials(staff.getFullName()),
                        "detail", roleName + (staff.getSpeciality() == null ? "" : " · " + staff.getSpeciality()),
                        "tone", "doctor"));
        body.put("location", clinic.getCity() == null ? clinic.getName() : clinic.getCity());
        body.put("capabilities", grantService.capabilitiesFor(clinic.getId(), staff.getRoleId()));
        body.put("navCounts", Map.of());
        return body;
    }

    private String initials(String name) {
        StringBuilder initials = new StringBuilder();
        for (String part : name.split("\\s+")) {
            if (part.isEmpty() || part.equals("Dr.")) {
                continue;
            }
            initials.append(part.charAt(0));
            if (initials.length() == 2) {
                break;
            }
        }
        return initials.toString().toUpperCase();
    }
}
