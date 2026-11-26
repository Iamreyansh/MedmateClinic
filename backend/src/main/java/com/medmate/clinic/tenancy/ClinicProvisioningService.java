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
     *
     * <p>Two scripts, each with its own guard: the people and the queue, and
     * then the three months of history the reports count.
     */
    public void seedDemo(RegistryClinic clinic) {
        String schema = clinic.getSchemaName();
        resolver.use(schema);
        try {
            JdbcTemplate jdbc = new JdbcTemplate(pool);
            Integer people =
                    jdbc.queryForObject(
                            "select count(*) from " + schema + ".patients", Integer.class);
            if (people != null && people == 0) {
                log.info("seeding the demo clinic's people");
                runScript(clinic, schema, "db/demo/V300__demo_data.sql");
            }
            Integer history =
                    jdbc.queryForObject(
                            "select count(*) from " + schema + ".visits where token like 'T-%'",
                            Integer.class);
            if (history != null && history == 0) {
                log.info("seeding the demo clinic's history");
                runScript(clinic, schema, "db/demo/V301__demo_history.sql");
            }
            Integer messages =
                    jdbc.queryForObject("select count(*) from " + schema + ".messages", Integer.class);
            if (messages != null && messages == 0) {
                log.info("seeding the demo clinic's day");
                runScript(clinic, schema, "db/demo/V302__demo_today.sql");
            }
            // The lab bench and the templates. The bench is guarded by the
            // state of the bench itself — the history seed left it with
            // reported results only, and it is the orders nobody has touched
            // that the screen is missing — and the templates by the table
            // being empty.
            Integer bench =
                    jdbc.queryForObject(
                            "select count(*) from " + schema + ".lab_orders where status in ('ordered', 'to_collect')",
                            Integer.class);
            Integer protocols =
                    jdbc.queryForObject("select count(*) from " + schema + ".templates", Integer.class);
            if ((bench != null && bench == 0) || (protocols != null && protocols == 0)) {
                log.info("seeding the demo clinic's bench and templates");
                runScript(clinic, schema, "db/demo/V303__demo_lab_and_templates.sql");
            }
            // The doctors' rooms are in that script too: the room a doctor
            // works in is the column on their own staff row, and a seed
            // inside a migration cannot see the people it would set.
        } catch (java.io.IOException | java.sql.SQLException e) {
            throw new IllegalStateException("could not load the demo data", e);
        } finally {
            resolver.clear();
        }
    }

    /** Run one development script inside the clinic's own schema. */
    private void runScript(RegistryClinic clinic, String schema, String location)
            throws java.io.IOException, java.sql.SQLException {
        String sql =
                new String(
                                new org.springframework.core.io.ClassPathResource(location)
                                        .getInputStream()
                                        .readAllBytes(),
                                java.nio.charset.StandardCharsets.UTF_8)
                        .replace("${clinic_id}", clinic.getId().toString());
        try (java.sql.Connection connection = pool.getConnection()) {
            connection.setAutoCommit(false);
            try (java.sql.Statement statement = connection.createStatement()) {
                statement.execute("set search_path to \"" + schema + "\"");
            }
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(
                    connection,
                    new org.springframework.core.io.ByteArrayResource(
                            sql.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            connection.commit();
        } catch (java.sql.SQLException failure) {
            throw failure;
        }
        log.info("demo script {} loaded into schema {}", location, schema);
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
