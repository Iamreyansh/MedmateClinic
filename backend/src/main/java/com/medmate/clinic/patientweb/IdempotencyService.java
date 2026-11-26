package com.medmate.clinic.patientweb;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * The requests that must not be done twice.
 *
 * <p>A patient may rebook, and a client may send the same request twice — a
 * retry on a slow network, a double tap. The first result must be the result:
 * the second request is answered with what the first one answered, and it does
 * not move a slot a second time.
 *
 * <p>The key the client sent is the key of the request, and it is scoped to
 * the clinic and the operation: the same key may be used once to cancel and
 * once to rebook, and never twice for the same one. The clinic is the one in
 * the request — the caller never picks the tenant.
 */
@Service
public class IdempotencyService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public IdempotencyService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** What a request under this key answered before, if it did. */
    public Optional<Stored> find(UUID clinicId, String operation, String key) {
        List<Stored> rows =
                jdbc.query(
                        "select visit_id, request_fingerprint, response from idempotent_requests "
                                + "where clinic_id = ? and operation = ? and idempotency_key = ?",
                        (rs, row) ->
                                new Stored(
                                        rs.getObject("visit_id", UUID.class),
                                        rs.getString("request_fingerprint"),
                                        read(rs.getString("response"))),
                        clinicId,
                        operation,
                        key);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    /**
     * Remember what this request answered.
     *
     * <p>The write is a conditional one: if the key is already there, nothing
     * is written and the answer that is already kept stands.
     */
    public void remember(
            UUID clinicId,
            String operation,
            String key,
            UUID visitId,
            String fingerprint,
            Map<String, Object> response) {
        jdbc.update(
                "insert into idempotent_requests "
                        + "(id, clinic_id, operation, idempotency_key, visit_id, request_fingerprint, response) "
                        + "values (?, ?, ?, ?, ?, ?, ?) "
                        + "on conflict (clinic_id, operation, idempotency_key) do nothing",
                UUID.randomUUID(),
                clinicId,
                operation,
                key,
                visitId,
                fingerprint,
                write(response));
    }

    /** The answer, as it was given. */
    private String write(Map<String, Object> response) {
        try {
            return mapper.writeValueAsString(response);
        } catch (com.fasterxml.jackson.core.JsonProcessingException notJson) {
            throw new IllegalStateException("the answer could not be written down", notJson);
        }
    }

    /** The answer, as it was read back. */
    private Map<String, Object> read(String response) {
        try {
            return mapper.readValue(response, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (com.fasterxml.jackson.core.JsonProcessingException notJson) {
            throw new IllegalStateException("the answer could not be read back", notJson);
        }
    }

    /** What a previous request under a key left behind. */
    public record Stored(UUID visitId, String fingerprint, Map<String, Object> response) {}
}
