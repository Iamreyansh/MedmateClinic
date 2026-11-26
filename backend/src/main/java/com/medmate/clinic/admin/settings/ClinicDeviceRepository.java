package com.medmate.clinic.admin.settings;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the devices signed in to the clinic. */
public interface ClinicDeviceRepository extends JpaRepository<ClinicDevice, UUID> {

    List<ClinicDevice> findByClinicIdAndStaffIdOrderByLastSeenAtDesc(UUID clinicId, UUID staffId);

    List<ClinicDevice> findByClinicIdOrderByLastSeenAtDesc(UUID clinicId);
}
