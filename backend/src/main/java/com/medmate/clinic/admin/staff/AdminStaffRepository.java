package com.medmate.clinic.admin.staff;

import com.medmate.clinic.staff.Staff;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * The clinic's people, read the way the screens read them.
 *
 * <p>Every query here is capped and filtered in the database: a clinic has a
 * team, not a directory, and the page never pulls the whole table and
 * throws most of it away.
 */
public interface AdminStaffRepository extends JpaRepository<Staff, UUID> {

    /** The clinic's people, by name, one page at a time. */
    @Query(
            """
            select s from Staff s
            where s.clinicId = :clinicId
              and (:search = '' or lower(s.fullName) like :search
                   or lower(coalesce(s.email, '')) like :search
                   or lower(coalesce(s.speciality, '')) like :search
                   or lower(coalesce(s.mobile, '')) like :search)
            order by s.fullName asc
            """)
    List<Staff> search(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable);

    /** One person, inside one clinic. */
    Optional<Staff> findByIdAndClinicId(UUID id, UUID clinicId);

    /**
     * The clinic's team: everybody who is not a doctor.
     *
     * <p>The doctors are on their own screen, so the team list leaves them
     * out — in the database, not in the screen.
     */
    @Query(
            """
            select s from Staff s, Role r
            where s.roleId = r.id
              and s.clinicId = :clinicId
              and r.name <> 'doctor'
              and (:search = ''
                   or lower(s.fullName) like :search
                   or lower(coalesce(s.email, '')) like :search
                   or lower(coalesce(s.speciality, '')) like :search
                   or lower(coalesce(s.mobile, '')) like :search)
            order by s.fullName asc
            """)
    List<Staff> searchTeam(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable);

    /** The clinic's doctors. */
    @Query(
            """
            select s from Staff s, Role r
            where s.roleId = r.id
              and s.clinicId = :clinicId
              and r.name = 'doctor'
            order by s.fullName asc
            """)
    List<Staff> searchDoctors(@Param("clinicId") UUID clinicId, Pageable pageable);

    /** The people who hold a role. */
    @Query("select s from Staff s where s.clinicId = :clinicId and s.roleId = :roleId")
    List<Staff> findByRole(@Param("clinicId") UUID clinicId, @Param("roleId") UUID roleId);

    /** How many people hold a role. */
    @Query("select count(s) from Staff s where s.clinicId = :clinicId and s.roleId = :roleId")
    long countByRole(@Param("clinicId") UUID clinicId, @Param("roleId") UUID roleId);

    /** Whether the clinic already has somebody on this number. */
    Optional<Staff> findFirstByClinicIdAndMobile(UUID clinicId, String mobile);
}
