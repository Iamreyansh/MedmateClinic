package com.medmate.clinic.prescription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the prescriptiondiagnosis table. */
public interface PrescriptionDiagnosisRepository extends JpaRepository<PrescriptionDiagnosis, UUID> {

    List<PrescriptionDiagnosis> findByPrescriptionIdOrderBySortOrder(UUID prescriptionId);
}
