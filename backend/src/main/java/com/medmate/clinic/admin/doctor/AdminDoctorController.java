package com.medmate.clinic.admin.doctor;

import com.medmate.clinic.security.CurrentClinic;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's doctors: adding one, changing one, and the hours they keep. */
@RestController
@RequestMapping("/api/clinic/admin/doctors")
public class AdminDoctorController {

    private final AdminDoctorService doctors;
    private final CurrentClinic current;

    public AdminDoctorController(AdminDoctorService doctors, CurrentClinic current) {
        this.doctors = doctors;
        this.current = current;
    }

    /** Add a doctor to the clinic. */
    @PostMapping
    public Map<String, Object> create(
            @Valid @RequestBody AdminDoctorService.DoctorRequest request) {
        return doctors.create(current.get(), request);
    }

    /** Change what is known about a doctor. */
    @PutMapping("/{doctorId}")
    public Map<String, Object> update(
            @PathVariable UUID doctorId,
            @Valid @RequestBody AdminDoctorService.DoctorRequest request) {
        return doctors.update(current.get(), doctorId, request);
    }

    /** The hours a doctor keeps, and the days they are away. */
    @GetMapping("/{doctorId}/schedule")
    public Map<String, Object> schedule(@PathVariable UUID doctorId) {
        return doctors.schedule(current.get(), doctorId);
    }

    /** Replace the hours and the leave. */
    @PutMapping("/{doctorId}/schedule")
    public Map<String, Object> saveSchedule(
            @PathVariable UUID doctorId,
            @Valid @RequestBody AdminDoctorService.ScheduleRequest request) {
        return doctors.saveSchedule(current.get(), doctorId, request);
    }

    /** The hours every doctor keeps, in one answer. */
    @GetMapping("/schedules")
    public Map<String, Object> schedules() {
        return doctors.schedules(current.get());
    }

    /**
     * The doctor this clinic already has under an HPR id.
     *
     * <p>This is a within-clinic lookup, not the HPR registry: the registry
     * is not connected to this service.
     */
    @GetMapping("/by-hpr/{hprId}")
    public Map<String, Object> byHpr(@PathVariable String hprId) {
        return doctors.byHpr(current.get(), hprId);
    }
}
