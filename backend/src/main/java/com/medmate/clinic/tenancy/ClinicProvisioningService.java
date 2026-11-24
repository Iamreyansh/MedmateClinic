package com.medmate.clinic.tenancy;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Gives a clinic its own schema.
 *
 * <p>The schema is created and migrated with the same migrations every clinic
 * gets, so a clinic added today is identical to one added a year ago. The
 * clinic's data — its people, its patients, its audit trail — lives only there.
 */
@Service
public class ClinicProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(ClinicProvisioningService.class);

    private final javax.sql.DataSource pool;
    private final ClinicSchemaResolver resolver;
    private final RegistryClinicRepository clinics;

    public ClinicProvisioningService(
            javax.sql.DataSource pool,
            ClinicSchemaResolver resolver,
            RegistryClinicRepository clinics) {
        this.pool = pool;
        this.resolver = resolver;
        this.clinics = clinics;
    }

    /** The schema name a clinic gets. */
    public static String schemaNameFor(UUID clinicId) {
        return "clinic_" + clinicId.toString().replace("-", "").substring(0, 8);
    }

    /** Create the schema, bring it up to date, and give it what every clinic gets. */
    public void provision(RegistryClinic clinic) {
        String schema = clinic.getSchemaName();
        resolver.use(schema);
        try {
            migrate("classpath:db/clinic", schema, Map.of("clinic_id", clinic.getId().toString()));
            log.info("clinic {} is live in schema {}", clinic.getId(), schema);
        } finally {
            resolver.clear();
        }
    }

    /**
     * The development clinic's people, patients and queue.
     *
     * <p>Not a migration: this is development data for one clinic, so it is
     * applied as a script rather than written into that clinic's history.
     */
    public void seedDemo(RegistryClinic clinic) {
        String schema = clinic.getSchemaName();
        resolver.use(schema);
        try {
            String clear =
                    "delete from clinic_11111111.visits; delete from clinic_11111111.patients; "
                            + "delete from clinic_11111111.staff; ";
            String sql =
                    new String(
                                    new org.springframework.core.io.ClassPathResource(
                                                    "db/demo/V300__demo_data.sql")
                                            .getInputStream()
                                            .readAllBytes(),
                                    java.nio.charset.StandardCharsets.UTF_8)
                            .replace("${clinic_id}", clinic.getId().toString());
            try (java.sql.Connection connection = pool.getConnection()) {
                org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(
                        connection,
                        new org.springframework.core.io.ByteArrayResource(
                                        clear.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(
                        connection,
                        new org.springframework.core.io.ByteArrayResource(
                                        sql.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            }
            log.info("demo data loaded into schema {}", schema);
        } catch (java.io.IOException | java.sql.SQLException e) {
            throw new IllegalStateException("could not load the demo data", e);
        } finally {
            resolver.clear();
        }
    }

    private void migrate(String location, String schema, Map<String, String> placeholders) {
        Flyway.configure()
                .dataSource(pool)
                .locations(location)
                .schemas(schema)
                .defaultSchema(schema)
                .createSchemas(true)
                .placeholders(placeholders)
                .load()
                .migrate();
    }

    /** Make sure every clinic in the directory has its schema. */
    public void provisionAll() {
        for (RegistryClinic clinic : clinics.findAll()) {
            provision(clinic);
        }
    }

    /** Whether a schema is already there. */
    public boolean schemaExists(String schema) {
        JdbcTemplate jdbc = new JdbcTemplate(pool);
        Integer count =
                jdbc.queryForObject(
                        "select count(*) from information_schema.schemata where schema_name = ?",
                        Integer.class,
                        schema);
        return count != null && count > 0;
    }
}
