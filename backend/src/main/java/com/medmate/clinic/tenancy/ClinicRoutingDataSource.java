package com.medmate.clinic.tenancy;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * A connection that looks into one clinic's schema.
 *
 * <p>The search path is set on the connection itself, so every statement —
 * every repository, every join — is inside the tenant's schema whether or not
 * the code remembered to scope it.
 */
public class ClinicRoutingDataSource extends DelegatingDataSource {

    private final String schema;

    public ClinicRoutingDataSource(DataSource target, String schema) {
        super(target);
        this.schema = schema;
    }

    @Override
    public Connection getConnection() throws SQLException {
        return withSchema(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return withSchema(super.getConnection(username, password));
    }

    private Connection withSchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("set search_path to " + quote(schema));
        }
        return connection;
    }

    private String quote(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}
