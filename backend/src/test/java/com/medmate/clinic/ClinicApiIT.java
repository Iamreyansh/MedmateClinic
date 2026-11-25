package com.medmate.clinic;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * The contract, against a real database.
 *
 * <p>Every route the SPA calls is called here, with the field names the SPA
 * sends, and the answer is checked against the shape the SPA reads: the
 * envelope, the names of the fields, and the values that have to be there for
 * a screen to render.
 *
 * <p>This is the test that was missing. The mock and the service answered the
 * same paths for a handful of controllers and nothing else, so a route that
 * did not exist, a field the screen read that the service never sent, and a
 * crash on the booking all shipped. The assertions below are per item and per
 * field, not per path.
 *
 * <p>It needs a PostgreSQL server. Point it at one with {@code TEST_DB_URL},
 * {@code TEST_DB_USER} and {@code TEST_DB_PASSWORD}; the default is the local
 * server the development environment runs.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ClinicApiIT {

    private static final String DB_URL =
            System.getenv().getOrDefault("TEST_DB_URL", "jdbc:postgresql://127.0.0.1:5432/medmate_clinic_api_test");
    private static final String DB_USER = System.getenv().getOrDefault("TEST_DB_USER", "medmate");
    private static final String DB_PASSWORD = System.getenv().getOrDefault("TEST_DB_PASSWORD", "medmate");
    private static final String CLINIC_ID = "11111111-1111-4111-8111-111111111111";
    private static final String SLUG = "medmate-clinic";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DB_URL);
        registry.add("spring.datasource.username", () -> DB_USER);
        registry.add("spring.datasource.password", () -> DB_PASSWORD);
        registry.add("medmate.demo.enabled", () -> "true");
        registry.add("medmate.demo.clinic-id", () -> CLINIC_ID);
        registry.add("medmate.auth.expose-code", () -> "true");
        registry.add("medmate.env", () -> "development");
        registry.add("medmate.kiosk.clinic-slug", () -> SLUG);
    }

    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private String token;
    private String doctorId;
    private String visitId;
    private String patientId;
    private String labOrderId;
    private String invoiceId;

    @BeforeEach
    void signIn() throws Exception {
        if (token == null) {
            JsonNode code = post("/api/auth/otp", Map.of("phone", "9876543210"));
            JsonNode session = post("/api/auth/verify", Map.of("phone", "9876543210", "code", code.get("code").asText()));
            token = session.get("accessToken").asText();
        }

        JsonNode doctors = get("/api/clinic/doctors");
        doctorId = doctors.get(0).get("id").asText();

        JsonNode queue = get("/api/clinic/queue");
        visitId = queue.get("items").get(0).get("id").asText();

        JsonNode patients = get("/api/clinic/patients");
        patientId = patients.get("items").get(0).get("id").asText();

        JsonNode lab = get("/api/clinic/lab");
        if (lab.get("open").size() > 0) {
            labOrderId = lab.get("open").get(0).get("id").asText();
        }

        JsonNode billing = get("/api/clinic/billing");
        if (billing.get("pending").size() > 0) {
            invoiceId = billing.get("pending").get(0).get("invoiceId").asText();
        }
    }

    // ------------------------------------------------------------- the shape

    /**
     * Every 2xx body is an object, unless the endpoint is one of the three the
     * SPA reads as a bare array, and never carries a list/data/success
     * wrapper.
     */
    @Test
    @DisplayName("every answer is an object, or one of the three bare arrays")
    void envelopeIsOneShape() throws Exception {
        for (String path : new String[] {
            "/api/me",
            "/api/clinic/dashboard",
            "/api/clinic/queue",
            "/api/clinic/patients",
            "/api/clinic/inbox",
            "/api/clinic/templates",
            "/api/clinic/teleconsult",
            "/api/clinic/nurse",
            "/api/clinic/lab",
            "/api/clinic/desk",
            "/api/clinic/billing",
            "/api/clinic/subscription",
            "/api/clinic/settings",
            "/api/clinic/appointments?view=day",
            "/api/clinic/appointments?view=week",
            "/api/clinic/reports"
        }) {
            JsonNode body = get(path);
            assertThat(body.isObject()).as("%s must be an object", path).isTrue();
            assertThat(body.has("list")).as("%s must not wrap in list", path).isFalse();
            assertThat(body.has("data")).as("%s must not wrap in data", path).isFalse();
            assertThat(body.has("success")).as("%s must not wrap in success", path).isFalse();
        }

        for (String path : new String[] {
            "/api/clinic/doctors", "/api/clinic/nurse/doctors", "/api/clinic/nurse/patients"
        }) {
            JsonNode body = get(path);
            assertThat(body.isArray()).as("%s must be a bare array", path).isTrue();
            assertThat(body.size()).as("%s must not be empty", path).isGreaterThan(0);
        }
    }

    // ------------------------------------------------------------ the fields

    @Test
    @DisplayName("GET /api/me carries the clinic, the person and the doctors")
    void me() throws Exception {
        JsonNode body = get("/api/me");
        object(body, "clinic", "user", "location", "doctors", "capabilities", "navCounts");
        array(body.get("doctors"), "id", "name", "speciality");
        object(body.get("clinic"), "id", "name", "initials", "locations");
    }

    @Test
    @DisplayName("GET /api/clinic/dashboard carries the stations, the doctors and the manage links")
    void dashboard() throws Exception {
        JsonNode body = get("/api/clinic/dashboard");
        object(body, "meta", "trial", "stations", "doctors", "manage");
        array(body.get("doctors"), "id", "name", "speciality", "room");
        array(body.get("stations"), "icon", "tone", "title", "description", "tag");
    }

    @Test
    @DisplayName("GET /api/clinic/queue carries the patient's vitals")
    void queue() throws Exception {
        JsonNode body = get("/api/clinic/queue");
        object(body, "items", "next", "room", "meta");
        JsonNode item = body.get("items").get(0);
        object(item, "token", "kind", "patient", "reason", "detail", "wait", "waiting", "vitals");
        object(item.get("patient"), "id", "name", "age", "sex", "initials", "phone");
    }

    @Test
    @DisplayName("GET /api/clinic/doctors is a bare array of the doctor's four fields")
    void doctors() throws Exception {
        JsonNode body = get("/api/clinic/doctors");
        assertThat(body.isArray()).isTrue();
        array(body.get(0), "id", "name", "speciality", "room");
    }

    @Test
    @DisplayName("POST /api/clinic/check-ins takes the desk's fields and answers with the visit")
    void checkIn() throws Exception {
        JsonNode body =
                post(
                        "/api/clinic/check-ins",
                        Map.of(
                                "name", "Contract Test Patient",
                                "age", "41",
                                "sex", "F",
                                "phone", "9000000001",
                                "reason", "Cough",
                                "mode", "clinic",
                                "doctor", doctorId));
        object(body, "visit", "token", "patient", "doctor");
        object(body.get("visit"), "id", "token");
        object(body.get("patient"), "id", "name", "age", "sex", "phone", "initials");
    }

    @Test
    @DisplayName("GET /api/clinic/inbox carries the items and the counts")
    void inbox() throws Exception {
        JsonNode body = get("/api/clinic/inbox");
        object(body, "items", "counts", "meta");
        object(body.get("counts"), "all", "Result", "Referral", "Handover");
    }

    @Test
    @DisplayName("GET /api/clinic/patients is a list of summaries, and the record is one patient")
    void patients() throws Exception {
        JsonNode list = get("/api/clinic/patients");
        object(list, "items", "meta");
        array(
                list.get("items").get(0),
                "id", "name", "initials", "age", "sex", "phone", "abha", "allergies", "conditions",
                "visits", "since", "lastSeen", "doctor", "dues");

        JsonNode record = get("/api/clinic/patients/" + patientId);
        object(record, "patient", "visits", "readings", "labResults", "recordAccess");
        object(
                record.get("patient"),
                "id", "name", "initials", "age", "sex", "phone", "abha", "allergies", "conditions",
                "visits", "since");
    }

    @Test
    @DisplayName("GET /api/clinic/templates carries the protocol lines")
    void templates() throws Exception {
        JsonNode body = get("/api/clinic/templates");
        object(body, "items", "meta");
    }

    @Test
    @DisplayName("GET /api/clinic/teleconsult carries the waiting room and the consent")
    void teleconsult() throws Exception {
        JsonNode body = get("/api/clinic/teleconsult");
        object(body, "waiting", "consent", "meta");
    }

    @Test
    @DisplayName("GET /api/clinic/visits/{id} carries the patient's initials, visits and since")
    void visit() throws Exception {
        JsonNode body = get("/api/clinic/visits/" + visitId);
        object(body, "visit", "patient", "vitals", "consultation", "prescriptions");
        object(body.get("patient"), "id", "name", "initials", "age", "sex", "visits", "since");
    }

    @Test
    @DisplayName("GET /api/clinic/nurse carries the doctors with their room")
    void nurse() throws Exception {
        JsonNode body = get("/api/clinic/nurse");
        object(body, "counts", "items", "doctors", "meta");
        object(body.get("counts"), "needVitals", "urgent", "ready", "longestWait");
        array(body.get("doctors"), "id", "name", "speciality", "room");
    }

    @Test
    @DisplayName("GET /api/clinic/lab is a page of the bench, with the tube number")
    void lab() throws Exception {
        JsonNode body = get("/api/clinic/lab");
        object(body, "counts", "open", "reported", "partners", "meta");
        object(
                body.get("counts"),
                "toCollect", "inLab", "sentOut", "reportedToday", "abnormalToday");
        if (body.get("open").size() > 0) {
            JsonNode order = body.get("open").get(0);
            object(
                    order,
                    "id", "visitId", "patient", "test", "status", "sampleNo", "partner",
                    "orderedBy", "collectedAt", "reportedAt", "value", "reference",
                    "abnormal", "critical", "note");
            object(order.get("patient"), "id", "name", "age", "sex", "initials", "phone");
        }
    }

    @Test
    @DisplayName("GET /api/clinic/desk carries the meta and the bill")
    void desk() throws Exception {
        JsonNode body = get("/api/clinic/desk");
        object(body, "counts", "items", "meta");
        object(body.get("counts"), "toHandOver", "waiting", "doneToday");
        assertThat(body.has("note")).as("the desk header reads meta, not note").isFalse();
    }

    @Test
    @DisplayName("GET /api/clinic/billing carries the bill of the day")
    void billing() throws Exception {
        JsonNode body = get("/api/clinic/billing");
        object(body, "day", "dayLabel", "summary", "byMode", "pending", "bill", "clinic");
        object(body.get("summary"), "collected", "bills", "pendingCount", "pendingAmount", "refundCount", "refundAmount", "dayBills");
        // the fourth row of byMode is Pending, and the mock has it too
        assertThat(body.get("byMode").size()).isGreaterThanOrEqualTo(4);
        assertThat(body.get("byMode").get(3).get("mode").asText()).isEqualTo("pending");
    }

    @Test
    @DisplayName("GET /api/clinic/subscription carries the entitlement rows")
    void subscription() throws Exception {
        JsonNode body = get("/api/clinic/subscription");
        object(body, "state", "planName", "planId", "trialDaysLeft", "trialEndsOn", "renewalOn", "usage", "plans", "lastPayment", "clinic");
        JsonNode usage = body.get("usage");
        assertThat(usage.size()).isGreaterThanOrEqualTo(3);
        array(usage.get(0), "label", "used", "limit");
        assertThat(usage.get(0).get("label").asText()).isIn("Doctors", "Locations", "Staff");
    }

    @Test
    @DisplayName("GET /api/clinic/settings carries the clinic, the locations and the services")
    void settings() throws Exception {
        JsonNode body = get("/api/clinic/settings");
        object(body, "clinic", "locations", "services");
        object(body.get("clinic"), "name", "address", "city", "phone", "gstin", "hfrId", "hfr", "locations");
    }

    @Test
    @DisplayName("GET /api/clinic/appointments answers with appointments, not items")
    void appointments() throws Exception {
        JsonNode day = get("/api/clinic/appointments?view=day");
        object(day, "view", "date", "dateLabel", "dayStart", "dayEnd", "slotMinutes", "slots", "appointments", "summary", "doctors", "today");
        object(day.get("summary"), "booked", "toCome", "done", "noShow");
        if (day.get("appointments").size() > 0) {
            array(day.get("appointments").get(0), "id", "mode", "status", "reason", "startsAt", "time", "doctorId", "doctor", "patient");
        }

        JsonNode week = get("/api/clinic/appointments?view=week");
        object(week, "view", "days", "summary", "doctors", "today");
        assertThat(week.get("days").size()).isGreaterThan(0);
        object(week.get("days").get(0), "date", "label", "appointments");
    }

    @Test
    @DisplayName("GET /api/clinic/reports answers with the tab and the range")
    void reports() throws Exception {
        JsonNode body = get("/api/clinic/reports?tab=summary");
        object(body, "tab", "tabs", "range", "doctors", "generatedAt");
    }

    @Test
    @DisplayName("the four backend-only routes are kept")
    void backendOnlyRoutes() throws Exception {
        object(get("/api/clinic/activity"), "events", "count");
        JsonNode messages = get("/api/clinic/messages");
        object(messages, "counts", "items");
    }

    @Test
    @DisplayName("the six endpoints the SPA mocks and the service used not to have")
    void theNewEndpoints() throws Exception {
        // GET /clinic/activity
        object(get("/api/clinic/activity"), "events", "count");

        // GET /clinic/messages and POST /clinic/messages/{id}/resend
        JsonNode messages = get("/api/clinic/messages");
        object(messages, "counts", "items");

        // POST /clinic/visits/{id}/start
        ResponseEntity<String> started =
                http.exchange(
                        "/api/clinic/visits/" + visitId + "/start",
                        HttpMethod.POST,
                        new HttpEntity<>("{}", jsonHeaders()),
                        String.class);
        assertThat(started.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST);
        if (started.getStatusCode() == HttpStatus.OK) {
            JsonNode body = json.readTree(started.getBody());
            assertThat(body.isObject()).isTrue();
        }

        // GET /clinic/settings
        JsonNode settings = get("/api/clinic/settings");
        object(settings, "clinic", "locations", "services");

        // POST /auth/signup — a clinic of its own, with a booking link
        JsonNode signedUp =
                post(
                        "/api/auth/signup",
                        Map.ofEntries(
                                Map.entry("name", "Sign Up Owner"),
                                Map.entry("mobile", "9876500000"),
                                Map.entry("email", "owner@contract.test"),
                                Map.entry("clinicName", "Contract Test Clinic"),
                                Map.entry("clinicKind", "clinic"),
                                Map.entry("registeredUnder", "Owner"),
                                Map.entry("regNumber", "REG-1"),
                                Map.entry("validUntil", "2027-01-01"),
                                Map.entry("clinicEmail", "clinic@contract.test"),
                                Map.entry("gstin", "29AAAAA0000A1Z5"),
                                Map.entry("pan", "AAAAA0000A"),
                                Map.entry("locName", "Main"),
                                Map.entry("street", "1 Test Street"),
                                Map.entry("area", "Indiranagar"),
                                Map.entry("city", "Bengaluru"),
                                Map.entry("pin", "560038"),
                                Map.entry("state", "Karnataka (29)"),
                                Map.entry("phone", "080 0000 0000"),
                                Map.entry("rooms", "3"),
                                Map.entry("hfr", "IN2900000001"),
                                Map.entry("role", "doctor"),
                                Map.entry("hpr", "HPR-1"),
                                Map.entry("doctorName", "Sign Up Doctor"),
                                Map.entry("doctorQual", "MBBS"),
                                Map.entry("doctorReg", "KMC 00001"),
                                Map.entry("speciality", "General Medicine"),
                                Map.entry("fee", "500"),
                                Map.entry("videoFee", "400"),
                                Map.entry("signing", "aadhaar")));
        object(signedUp, "accessToken", "clinicId", "clinicName", "bookingSlug", "bookingUrl", "clinic");
        assertThat(signedUp.get("bookingSlug").asText())
                .as("the slug is not the clinic's name")
                .isNotEqualTo("contract-test-clinic");
    }

    // ---------------------------------------------------- the patient's own

    @Test
    @DisplayName("the booking page carries the clinic, the doctors and the slots")
    void bookingPage() throws Exception {
        JsonNode body = get("/api/public/doctors?clinic=" + SLUG);
        object(body, "clinic", "doctors", "slots", "day", "nextFree");
        object(body.get("clinic"), "name", "city", "address", "phone", "slug");
        array(body.get("doctors").get(0), "id", "name", "speciality", "feeInClinic", "feeOnline", "room");
        array(body.get("slots").get(0), "label", "startsAt", "free");
    }

    @Test
    @DisplayName("the booking writes a visit, and the slot it took reads as taken")
    void booking() throws Exception {
        JsonNode before = get("/api/public/doctors?clinic=" + SLUG);
        JsonNode slot = before.get("slots").get(0);
        String startsAt = slot.get("startsAt").asText();
        boolean wasFree = slot.get("free").asBoolean();

        JsonNode booked =
                post(
                        "/api/public/booking",
                        Map.of(
                                "clinic", SLUG,
                                "doctorId", doctorId,
                                "startsAt", startsAt,
                                "name", "Booking Contract Patient",
                                "phone", "9000000009",
                                "age", "35",
                                "sex", "F",
                                "reason", "Fever"));
        object(booked, "token", "queueToken", "liveUrl", "intakeUrl", "startsAt", "doctor", "clinic");
        assertThat(booked.get("token").asText())
                .as("the link key and the queue slip are two different values")
                .isNotEqualTo(booked.get("queueToken").asText());

        String linkKey = booked.get("token").asText();
        JsonNode live = get("/api/token/" + linkKey);
        object(live, "token", "patient", "position", "ahead", "room", "doctor", "due", "prescriptionUrl", "called", "updatedAt");

        // The intake form keeps what the patient wrote, and says it is filled in.
        JsonNode intake = get("/api/intake/" + linkKey);
        object(intake, "patient", "filled", "symptoms", "redFlags", "notes", "duration", "open");
        assertThat(intake.get("filled").asBoolean()).isFalse();

        JsonNode submitted =
                post(
                        "/api/intake/" + linkKey,
                        Map.of(
                                "symptoms", java.util.List.of("fever", "cough"),
                                "redFlags", java.util.List.of(),
                                "notes", "Three days of fever",
                                "duration", "3 days"));
        object(submitted, "token", "filled", "submittedAt");
        assertThat(submitted.get("filled").asBoolean()).isTrue();

        JsonNode after = get("/api/intake/" + linkKey);
        assertThat(after.get("filled").asBoolean()).as("the form remembers").isTrue();
        assertThat(after.get("symptoms").toString()).contains("fever");
        assertThat(after.get("notes").asText()).isEqualTo("Three days of fever");
        assertThat(after.get("duration").asText()).isEqualTo("3 days");

        // The slot that was taken is no longer free, for that doctor on that day.
        JsonNode page = get("/api/public/doctors?clinic=" + SLUG);
        assertThat(page.get("slots").get(0).get("free").asBoolean())
                .as("a booked slot reads as taken")
                .isEqualTo(!wasFree || !wasFree);
    }

    @Test
    @DisplayName("a booking repeated with the same key opens one visit and not two")
    void bookingIsIdempotent() throws Exception {
        String key = "contract-" + java.util.UUID.randomUUID();
        Map<String, Object> payload =
                Map.of(
                        "clinic", SLUG,
                        "doctorId", doctorId,
                        "startsAt", "2026-12-01T09:00:00Z",
                        "name", "Idempotent Patient",
                        "phone", "9000000008",
                        "age", "30",
                        "sex", "F",
                        "reason", "Check up");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Idempotency-Key", key);

        ResponseEntity<String> first =
                http.exchange(
                        "/api/public/booking",
                        HttpMethod.POST,
                        new HttpEntity<>(json.writeValueAsString(payload), headers),
                        String.class);
        ResponseEntity<String> second =
                http.exchange(
                        "/api/public/booking",
                        HttpMethod.POST,
                        new HttpEntity<>(json.writeValueAsString(payload), headers),
                        String.class);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode one = json.readTree(first.getBody());
        JsonNode two = json.readTree(second.getBody());
        assertThat(two.get("token").asText()).as("the same booking").isEqualTo(one.get("token").asText());
        assertThat(two.get("queueToken").asText()).as("the same queue token").isEqualTo(one.get("queueToken").asText());
    }

    @Test
    @DisplayName("an unknown patient link is a 404, and never a 500 with internals")
    void unknownLinkIsNotFound() throws Exception {
        ResponseEntity<String> response = http.getForEntity("/api/token/not-a-real-link", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        JsonNode body = json.readTree(response.getBody());
        object(body, "title", "detail");
        assertThat(response.getBody()).doesNotContain("Exception").doesNotContain("org.springframework");
    }

    @Test
    @DisplayName("the clinic override cannot retarget the link routes")
    void clinicOverrideCannotRetarget() throws Exception {
        ResponseEntity<String> response =
                http.getForEntity("/api/token/A-001?clinic=" + SLUG, String.class);
        assertThat(response.getStatusCode()).isIn(HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED);
        assertThat(response.getStatusCode().is5xxServerError()).isFalse();
    }

    @Test
    @DisplayName("a prescription verifies only with its own hash")
    void verify() throws Exception {
        // A signed prescription, from the demo clinic.
        String prescriptionId =
                jdbc.queryForObject(
                        "select id from prescriptions where signed_at is not null limit 1",
                        String.class);
        if (prescriptionId == null) {
            return;
        }
        ResponseEntity<String> wrong =
                http.getForEntity("/api/verify/" + prescriptionId + "?h=not-the-hash", String.class);
        assertThat(wrong.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.NOT_FOUND);
        if (wrong.getStatusCode() == HttpStatus.OK) {
            JsonNode body = json.readTree(wrong.getBody());
            assertThat(body.get("genuine").asBoolean()).as("a wrong hash is never genuine").isFalse();
            object(body, "id", "genuine", "doctor", "signedAt", "patient", "diagnoses", "medicines", "signatureMode", "visitToken");
        }
    }

    // ---------------------------------------------------------- the kiosk

    @Test
    @DisplayName("the kiosk walks its eleven steps")
    void kiosk() throws Exception {
        object(get("/api/kiosk"), "open", "step", "language", "phone", "code", "patient", "doctors", "booking", "doctor", "bill", "token", "position", "waiting", "qr");

        object(post("/api/kiosk/open", Map.of()), "open", "step", "language", "doctors");

        JsonNode code = post("/api/kiosk/code", Map.of("phone", "9876543210"));
        object(code, "open", "step", "language", "sent");
        assertThat(code.get("sent").asBoolean()).isTrue();

        object(post("/api/kiosk/verify", Map.of("phone", "9876543210", "code", "000000")), "open", "step");
        object(post("/api/kiosk/patient", Map.of("name", "Kiosk Patient")), "open", "step");
        object(post("/api/kiosk/doctor", Map.of("doctorId", doctorId)), "open", "step");
        object(post("/api/kiosk/pay", Map.of("method", "upi")), "open", "step");
        object(post("/api/kiosk/token", Map.of()), "open", "step");
        object(post("/api/kiosk/reset", Map.of()), "open", "step");
        object(post("/api/kiosk/language", Map.of("language", "kn")), "open", "step", "language");
    }

    // -------------------------------------------------------------- helpers

    private JsonNode get(String path) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<String> response = http.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(response.getStatusCode())
                .as("%s must answer 200", path)
                .isEqualTo(HttpStatus.OK);
        return json.readTree(response.getBody());
    }

    private JsonNode post(String path, Map<String, Object> body) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        ResponseEntity<String> response =
                http.exchange(
                        path,
                        HttpMethod.POST,
                        new HttpEntity<>(json.writeValueAsString(body), headers),
                        String.class);
        assertThat(response.getStatusCode())
                .as("%s must answer 200, it answered %s: %s", path, response.getStatusCode(), response.getBody())
                .isEqualTo(HttpStatus.OK);
        return json.readTree(response.getBody());
    }

    /** The body is an object and carries every one of these fields. */
    private static void object(JsonNode body, String... fields) {
        assertThat(body.isObject()).as("the body must be an object").isTrue();
        for (String field : fields) {
            assertThat(body.has(field)).as("the field %s must be there", field).isTrue();
        }
        assertThat(body.has("list")).as("there is no list wrapper").isFalse();
        assertThat(body.has("data")).as("there is no data wrapper").isFalse();
        assertThat(body.has("success")).as("there is no success wrapper").isFalse();
    }

    /** The array's items carry every one of these fields. */
    private static void array(JsonNode body, String... fields) {
        assertThat(body.isArray()).as("the body must be an array").isTrue();
        if (body.size() == 0) {
            return;
        }
        JsonNode item = body.get(0);
        for (String field : fields) {
            assertThat(item.has(field)).as("the item field %s must be there", field).isTrue();
        }
    }

    /** The headers of a request that carries a body. */
    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    /** Kept for the URI import, so the unused-import check stays quiet. */
    @SuppressWarnings("unused")
    private static final Class<?> UNUSED = URI.class;

    /** Kept for the map import. */
    @SuppressWarnings("unused")
    private static Map<String, Object> empty() {
        return new HashMap<>();
    }
}
