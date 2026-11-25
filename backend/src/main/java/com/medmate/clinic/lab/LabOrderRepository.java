package com.medmate.clinic.lab;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the laborder table. */
public interface LabOrderRepository extends JpaRepository<LabOrder, UUID> {

    List<LabOrder> findByClinicIdAndPatientIdOrderByOrderedAtDesc(UUID clinicId, UUID patientId);
    List<LabOrder> findByClinicIdAndStatusOrderByOrderedAtAsc(UUID clinicId, String status);
    List<LabOrder> findByClinicIdAndVisitIdOrderByOrderedAtAsc(UUID clinicId, UUID visitId);
    Optional<LabOrder> findByIdAndClinicId(UUID id, UUID clinicId);
}
