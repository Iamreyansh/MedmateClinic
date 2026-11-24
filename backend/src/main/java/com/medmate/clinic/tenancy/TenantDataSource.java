package com.medmate.clinic.tenancy;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.AbstractDataSource;

/**
 * The pool, asked for one clinic's schema at a time.
 *
 * <p>The schema comes from the request. Without one — the sign-in, the
 * registry — the connection looks into the registry schema.
 */
public class TenantDataSource extends AbstractDataSource {

    private final DataSource pool;
    private final ClinicSchemaResolver resolver;
    private final String registrySchema;

    public TenantDataSource(DataSource pool, ClinicSchemaResolver resolver, String registrySchema) {
        this.pool = pool;
        this.resolver = resolver;
        this.registrySchema = registrySchema;
    }

    @Override
    public Connection getConnection() throws SQLException {
        return routed().getConnection();
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return routed().getConnection(username, password);
    }

    private DataSource routed() {
        return new ClinicRoutingDataSource(pool, resolver.current(registrySchema));
    }

    @Override
    public <T> T unwrap(Class<T> iface) throws SQLException {
        return pool.unwrap(iface);
    }
}
