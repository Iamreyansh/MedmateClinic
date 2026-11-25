package com.medmate.clinic.invoice;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the invoice table. */
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findByClinicIdAndPatientIdOrderByCreatedAtDesc(UUID clinicId, UUID patientId);
    List<Invoice> findByClinicIdAndCreatedAtBetweenOrderByCreatedAtDesc(UUID clinicId, Instant from, Instant to);
    List<Invoice> findByClinicIdAndStatusOrderByCreatedAtDesc(UUID clinicId, String status);
    Optional<Invoice> findByIdAndClinicId(UUID id, UUID clinicId);
    long countByClinicIdAndStatus(UUID clinicId, String status);
    Optional<Invoice> findFirstByClinicIdAndVisitIdAndStatus(UUID clinicId, UUID visitId, String status);
}
