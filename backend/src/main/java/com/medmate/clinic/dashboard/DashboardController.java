package com.medmate.clinic.dashboard;

import com.medmate.clinic.catalogue.StationCatalogue;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.VisitRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The owner's dashboard. */
@RestController
@RequestMapping("/api/clinic")
public class DashboardController {

    private final CurrentClinic current;
    private final StationCatalogue catalogue;
    private final VisitRepository visitRepository;
    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final GrantService grantService;

    public DashboardController(
            CurrentClinic current,
            StationCatalogue catalogue,
            VisitRepository visitRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository,
            GrantService grantService) {
        this.current = current;
        this.catalogue = catalogue;
        this.visitRepository = visitRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
        this.grantService = grantService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        ClinicPrincipal principal = current.get();
        if (!principal.can("report")) {
            throw new ForbiddenException("You cannot open the dashboard.");
        }
        UUID clinicId = UUID.fromString(principal.clinicId());

        long waiting = visitRepository.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "waiting").size();
        long patients = patientRepository.findByClinicIdOrderByCreatedAtAsc(clinicId).size();
        long staff = staffRepository.countByClinicId(clinicId);

        List<Map<String, Object>> stations = new ArrayList<>();
        for (StationCatalogue.Station station : catalogue.stations()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("icon", station.icon());
            item.put("tone", station.tone());
            item.put("title", station.title());
            item.put("description", station.description());
            item.put("tag", station.tag());
            if ("console".equals(station.countResource())) {
                item.put("count", waiting + " in queue");
            }
            stations.add(item);
        }

        List<Map<String, Object>> manage = new ArrayList<>();
        for (StationCatalogue.ManageLink link : catalogue.manage()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("icon", link.icon());
            item.put("title", link.title());
            item.put("description", link.description());
            item.put("href", link.href());
            if ("doctor".equals(link.countResource())) {
                item.put("count", staff);
            }
            if ("patient".equals(link.countResource())) {
                item.put("count", patients);
            }
            manage.add(item);
        }

        // The clinic's doctors: the dashboard shows the doctor consoles.
        List<Map<String, Object>> doctors = new ArrayList<>();
        for (Staff person : staffRepository.findByClinicId(clinicId)) {
            Map<String, Object> doctor = new LinkedHashMap<>();
            doctor.put("id", person.getId().toString());
            doctor.put("name", person.getFullName());
            doctor.put("initials", initials(person.getFullName()));
            doctor.put("speciality", person.getSpeciality() == null ? "" : person.getSpeciality());
            doctor.put("room", person.getSpeciality() == null ? "" : person.getSpeciality());
            doctor.put("waiting", 0);
            doctors.add(doctor);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("doctors", doctors);
        body.put("meta", waiting + " in your queue · 2 awaiting vitals · 1 prescription to hand over · 5 appointments still to come today");
        body.put(
                "trial",
                Map.of(
                        "message",
                        "Your free trial ends in 3 days. Patient care keeps working; choose a plan to keep adding doctors, staff or locations.",
                        "action",
                        "See plans",
                        "href",
                        "/subscription"));
        body.put("stations", stations);
        body.put("manage", manage);
        return body;
    }

    /** The person's initials. */
    private String initials(String name) {
        if (name == null) {
            return "";
        }
        StringBuilder initials = new StringBuilder();
        for (String part : name.split("\\s+")) {
            if (part.isEmpty()) {
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