package com.medmate.clinic.admin.doctor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the days a doctor is away. */
public interface DoctorLeaveRepository extends JpaRepository<DoctorLeave, UUID> {

    List<DoctorLeave> findByClinicIdAndStaffIdOrderByFromDateAsc(UUID clinicId, UUID staffId);

    void deleteByClinicIdAndStaffId(UUID clinicId, UUID staffId);
}
