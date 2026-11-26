package com.medmate.clinic.appointment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the appointment table. */
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(UUID clinicId, Instant from, Instant to);
    long countByClinicIdAndStartsAtAfterAndStatus(UUID clinicId, Instant after, String status);
    long countByClinicIdAndStartsAtBetweenAndStatus(UUID clinicId, Instant from, Instant to, String status);
    Optional<Appointment> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Appointment> findByClinicIdOrderByStartsAtAsc(UUID clinicId);

    /** One doctor's book for one day — the slots that are already taken. */
    List<Appointment> findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
            UUID clinicId, UUID doctorId, Instant from, Instant to);

    /** The appointment a visit came from. */
    List<Appointment> findByClinicIdAndVisitIdOrderByStartsAtAsc(UUID clinicId, UUID visitId);
}
