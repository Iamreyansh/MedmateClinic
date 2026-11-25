package com.medmate.clinic.template;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the templates table. */
public interface TemplateRepository extends JpaRepository<Template, UUID> {

    /** The clinic's own templates, the ones in use first. */
    List<Template> findByClinicIdOrderByUsedCountDesc(UUID clinicId);
}
