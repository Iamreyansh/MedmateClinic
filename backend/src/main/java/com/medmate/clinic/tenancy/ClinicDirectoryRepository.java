package com.medmate.clinic.tenancy;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads the phone directory. */
public interface ClinicDirectoryRepository extends JpaRepository<ClinicDirectory, String> {

    List<ClinicDirectory> findByPhone(String phone);
}
