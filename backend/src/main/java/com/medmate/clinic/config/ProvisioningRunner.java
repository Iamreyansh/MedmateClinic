package com.medmate.clinic.config;

import com.medmate.clinic.tenancy.ClinicProvisioningService;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Brings the schemas up to date at boot.
 *
 * <p>First the directory, then every clinic: a clinic added while the service
 * was down still gets its tables, and a new migration reaches every tenant
 * without anyone remembering.
 */
@Component
@Order(0)
public class ProvisioningRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProvisioningRunner.class);

    private final Flyway registryFlyway;
    private final RegistryClinicRepository clinics;
    private final ClinicProvisioningService provisioning;
    private final boolean demoEnabled;
    private final UUID demoClinicId;

    public ProvisioningRunner(
            Flyway registryFlyway,
            RegistryClinicRepository clinics,
            ClinicProvisioningService provisioning,
            @Value("${medmate.demo.enabled:false}") boolean demoEnabled,
            @Value("${medmate.demo.clinic-id:}") String demoClinicId) {
        this.registryFlyway = registryFlyway;
        this.clinics = clinics;
        this.provisioning = provisioning;
        this.demoEnabled = demoEnabled;
        this.demoClinicId = demoClinicId.isBlank() ? null : UUID.fromString(demoClinicId);
    }

    @Override
    public void run(ApplicationArguments args) {
        registryFlyway.migrate();

        for (var clinic : clinics.findAll()) {
            if (!provisioning.schemaExists(clinic.getSchemaName())) {
                log.info("clinic {} has no schema yet", clinic.getId());
            }
            provisioning.provision(clinic);
            if (demoEnabled && clinic.getId().equals(demoClinicId)) {
                provisioning.seedDemo(clinic);
            }
        }
    }
}
