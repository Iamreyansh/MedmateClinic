package com.medmate.clinic.me;

import com.medmate.clinic.clinic.ClinicProfile;
import com.medmate.clinic.clinic.ClinicProfileRepository;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.RegistryClinic;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
    private final RegistryClinicRepository clinics;
    private final ClinicProfileRepository profiles;
    private final StaffRepository staffRepository;
    private final RoleRepository roleRepository;
    private final GrantService grantService;
    private final com.medmate.clinic.visit.VisitRepository visitRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public MeController(
            CurrentClinic current,
            RegistryClinicRepository clinics,
            ClinicProfileRepository profiles,
            StaffRepository staffRepository,
            RoleRepository roleRepository,
            GrantService grantService,
            com.medmate.clinic.visit.VisitRepository visitRepository,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.current = current;
        this.clinics = clinics;
        this.profiles = profiles;
        this.staffRepository = staffRepository;
        this.roleRepository = roleRepository;
        this.grantService = grantService;
        this.visitRepository = visitRepository;
        this.jdbc = jdbc;
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        ClinicPrincipal principal = current.get();
        UUID clinicId = UUID.fromString(principal.clinicId());
        RegistryClinic clinic =
                clinics.findById(clinicId).orElseThrow(() -> new IllegalStateException("the clinic is gone"));
        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        Staff staff = staffRepository.findById(UUID.fromString(principal.staffId()))
                .orElseThrow(() -> new IllegalStateException("the person is gone"));

        String roleName = principal.role();
        if (staff.getRoleId() != null) {
            Role role = roleRepository.findById(staff.getRoleId()).orElse(null);
            if (role != null) {
                roleName = role.getName();
            }
        }

        // The clinic's doctors, as the session screen shows them: the doctor
        // consoles the person can open.
        List<Map<String, Object>> doctors = new ArrayList<>();
        for (Staff person : staffRepository.findByClinicId(clinicId)) {
            Map<String, Object> doctor = new LinkedHashMap<>();
            doctor.put("id", person.getId().toString());
            doctor.put("name", person.getFullName());
            doctor.put("initials", initials(person.getFullName()));
            doctor.put("speciality", person.getSpeciality() == null ? "" : person.getSpeciality());
            // The room the doctor works in — the column on the staff row, and
            // never the speciality: a doctor sees patients in a room, and a
            // speciality is not a room.
            doctor.put("room", person.getRoom() == null ? "" : person.getRoom());
            doctor.put("registration", person.getRegistration() == null ? "" : person.getRegistration());
            doctor.put("hpr", person.getHprId() == null ? "" : person.getHprId());
            doctors.add(doctor);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("doctors", doctors);
        body.put(
                "clinic",
                Map.of(
                        "id", clinic.getId().toString(),
                        "name", clinic.getName(),
                        "initials", clinic.getInitials(),
                        "locations", profile == null ? 1 : profile.getLocations(),
                        "doctors", staffRepository.findByClinicId(clinicId).stream()
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
        // The role the clinic signed itself up with: a doctor or a manager.
        // The RBAC role is the same for both, so this is what tells them
        // apart.
        body.put("profileRole", profileRole(clinicId, staff.getId()));
        body.put("location", profile == null || profile.getCity() == null ? clinic.getName() : profile.getCity());
        body.put("capabilities", grantService.capabilitiesFor(clinicId, staff.getRoleId()));
        body.put("navCounts", navCounts(clinicId, profile, staff));
        return body;
    }

    /**
     * The role the clinic signed itself up with.
     *
     * <p>Read from the staff's own row: the column is beside the role the
     * clinic gave the owner, and it says what the owner is rather than what
     * the owner may do.
     */
    private String profileRole(UUID clinicId, UUID staffId) {
        List<String> roles =
                jdbc.query(
                        "select profile_role from staff where clinic_id = ? and id = ?",
                        (rs, row) -> rs.getString(1),
                        clinicId,
                        staffId);
        if (roles.isEmpty() || roles.get(0) == null || roles.get(0).isBlank()) {
            return "doctor";
        }
        return roles.get(0);
    }

    /**
     * How many people are waiting on each station.
     *
     * <p>The sidebar badges come from here, not from the client, so a number on
     * screen is the number in the database.
     */
    private Map<String, Integer> navCounts(
            UUID clinicId, ClinicProfile profile, Staff signedIn) {
        long waiting = visitRepository.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting").size();
        long doctors = staffRepository.findByClinicId(clinicId).stream()
                .filter(person -> person.getRoleId() != null)
                .count();

        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("/queue", (int) waiting);
        counts.put("/nurse", 0);
        counts.put("/inbox", 0);
        counts.put("/desk", 0);
        counts.put("/billing", 0);
        counts.put("/schedule", 0);
        counts.put("/doctors", (int) doctors);
        counts.put("/staff", (int) staffRepository.countByClinicId(clinicId));
        counts.put("/locations", profile == null ? 1 : profile.getLocations());
        return counts;
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
