package com.medmate.clinic.vital;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the vitals table. */
public interface VitalsRepository extends JpaRepository<Vitals, UUID> {

    List<Vitals> findByClinicIdAndPatientIdOrderByRecordedAtDesc(UUID clinicId, UUID patientId);
    Optional<Vitals> findFirstByClinicIdAndVisitIdOrderByRecordedAtDesc(UUID clinicId, UUID visitId);
}
