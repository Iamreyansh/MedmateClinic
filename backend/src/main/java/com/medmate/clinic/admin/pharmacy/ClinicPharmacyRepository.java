package com.medmate.clinic.admin.pharmacy;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Reads the pharmacies the clinic sends prescriptions to. */
public interface ClinicPharmacyRepository extends JpaRepository<ClinicPharmacy, UUID> {

    /** The clinic's pharmacies, one page at a time. */
    @Query(
            """
            select p from ClinicPharmacy p
            where p.clinicId = :clinicId
              and (:search = '' or lower(p.name) like :search or lower(p.city) like :search
                   or lower(coalesce(p.contactPerson, '')) like :search)
            order by p.createdAt asc
            """)
    List<ClinicPharmacy> search(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable);

    /** One pharmacy, inside one clinic. */
    Optional<ClinicPharmacy> findByIdAndClinicId(UUID id, UUID clinicId);

    /** A pharmacy with this name, inside this clinic. */
    @Query(
            """
            select p from ClinicPharmacy p
            where p.clinicId = :clinicId and lower(p.name) = lower(:name)
            """)
    Optional<ClinicPharmacy> findByName(@Param("clinicId") UUID clinicId, @Param("name") String name);
}
