package com.medmate.clinic.admin.settings;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the agreements the clinic has accepted. */
public interface ClinicAgreementRepository extends JpaRepository<ClinicAgreement, UUID> {

    List<ClinicAgreement> findByClinicIdOrderByKindAsc(UUID clinicId);

    List<ClinicAgreement> findByClinicIdAndKindOrderByAcceptedAtDesc(UUID clinicId, String kind);
}
