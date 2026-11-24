package com.medmate.clinic.config;

import com.medmate.clinic.tenancy.ClinicSchemaResolver;
import com.medmate.clinic.tenancy.TenantDataSource;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * The datasource, and the two schemas.
 *
 * <p>One pool. One connection per request, with the search path pointing at
 * the clinic the request belongs to. The registry schema — the tenant
 * directory — is what a connection sees when the request has no clinic yet.
 */
@ConfigurationProperties(prefix = "medmate.tenancy")
public record TenancyConfig(String registrySchema, String clinicSchemaPrefix) {

    public TenancyConfig {
        if (registrySchema == null || registrySchema.isBlank()) {
            registrySchema = "registry";
        }
        if (clinicSchemaPrefix == null || clinicSchemaPrefix.isBlank()) {
            clinicSchemaPrefix = "clinic_";
        }
    }

    @Bean
    public DataSource pool(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }

    /** The datasource the application uses: one pool, routed by request. */
    @Bean
    @Primary
    public DataSource tenantDataSource(
            @Qualifier("pool") DataSource pool, ClinicSchemaResolver resolver) {
        return new TenantDataSource(pool, resolver, registrySchema);
    }

    /** The directory is migrated once, at boot. */
    @Bean
    public Flyway registryFlyway(@Qualifier("tenantDataSource") DataSource tenantDataSource) {
        return Flyway.configure()
                .dataSource(tenantDataSource)
                .locations("classpath:db/registry")
                .schemas(registrySchema)
                .defaultSchema(registrySchema)
                .createSchemas(true)
                .load();
    }
}
