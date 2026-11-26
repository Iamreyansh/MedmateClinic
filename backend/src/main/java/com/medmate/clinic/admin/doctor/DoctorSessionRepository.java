package com.medmate.clinic.admin.doctor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the hours a doctor keeps. */
public interface DoctorSessionRepository extends JpaRepository<DoctorSession, UUID> {

    List<DoctorSession> findByClinicIdAndStaffIdOrderByWeekdayAscSessionStartAsc(
            UUID clinicId, UUID staffId);

    void deleteByClinicIdAndStaffId(UUID clinicId, UUID staffId);
}
