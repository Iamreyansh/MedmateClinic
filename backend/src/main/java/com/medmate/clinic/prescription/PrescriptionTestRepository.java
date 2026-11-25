package com.medmate.clinic.prescription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the prescriptiontest table. */
public interface PrescriptionTestRepository extends JpaRepository<PrescriptionTest, UUID> {

    List<PrescriptionTest> findByPrescriptionId(UUID prescriptionId);
}
