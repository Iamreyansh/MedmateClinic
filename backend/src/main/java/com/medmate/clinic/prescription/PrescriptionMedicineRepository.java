package com.medmate.clinic.prescription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the prescriptionmedicine table. */
public interface PrescriptionMedicineRepository extends JpaRepository<PrescriptionMedicine, UUID> {

    List<PrescriptionMedicine> findByPrescriptionIdOrderBySortOrder(UUID prescriptionId);
}
