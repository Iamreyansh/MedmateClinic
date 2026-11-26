package com.medmate.clinic.admin.profile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Reads the profiles the clinic adds people from. */
public interface ClinicProfileTemplateRepository
        extends JpaRepository<ClinicProfileTemplate, UUID> {

    /** The clinic's profiles, one page at a time. */
    @Query(
            """
            select p from ClinicProfileTemplate p
            where p.clinicId = :clinicId
              and (:search = '' or lower(p.name) like :search
                   or lower(coalesce(p.speciality, '')) like :search)
            order by p.name asc
            """)
    List<ClinicProfileTemplate> search(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable);

    /** One profile, inside one clinic. */
    Optional<ClinicProfileTemplate> findByIdAndClinicId(UUID id, UUID clinicId);

    /** A profile with this name, inside this clinic. */
    @Query(
            """
            select p from ClinicProfileTemplate p
            where p.clinicId = :clinicId and lower(p.name) = lower(:name)
            """)
    Optional<ClinicProfileTemplate> findByName(
            @Param("clinicId") UUID clinicId, @Param("name") String name);
}
