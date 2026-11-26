package com.medmate.clinic.admin.location;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Reads the branches the clinic works from. */
public interface ClinicBranchRepository extends JpaRepository<ClinicBranch, UUID> {

    /** The clinic's branches, one page at a time. */
    @Query(
            """
            select b from ClinicBranch b
            where b.clinicId = :clinicId
              and (:search = '' or lower(b.name) like :search or lower(b.city) like :search)
            order by b.primary desc, b.createdAt asc
            """)
    List<ClinicBranch> search(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable);

    /** One branch, inside one clinic. */
    Optional<ClinicBranch> findByIdAndClinicId(UUID id, UUID clinicId);

    /** A branch with this name, inside this clinic. */
    @Query(
            """
            select b from ClinicBranch b
            where b.clinicId = :clinicId and lower(b.name) = lower(:name)
            """)
    Optional<ClinicBranch> findByName(@Param("clinicId") UUID clinicId, @Param("name") String name);

    /** How many branches the clinic has. */
    long countByClinicId(UUID clinicId);
}
