package com.medmate.clinic.message;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the message table. */
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByClinicIdAndPatientIdOrderByCreatedAtDesc(UUID clinicId, UUID patientId);
    List<Message> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);
    Optional<Message> findByIdAndClinicId(UUID id, UUID clinicId);
}
