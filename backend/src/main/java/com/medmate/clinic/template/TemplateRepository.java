package com.medmate.clinic.template;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the template table. */
public interface TemplateRepository extends JpaRepository<Template, UUID> {

    List<Template> findByClinicIdOrderByUsedCountDesc(UUID clinicId);
}
