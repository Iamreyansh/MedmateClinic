package com.medmate.clinic.staff;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the staff table. */
public interface StaffRepository extends JpaRepository<Staff, UUID> {

    Optional<Staff> findFirstByClinicIdAndMobile(UUID clinicId, String mobile);

    List<Staff> findByClinicId(UUID clinicId);

    long countByClinicId(UUID clinicId);
}
