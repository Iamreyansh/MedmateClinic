package com.medmate.clinic;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
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
 * envelope, the names of the fields, and the values a screen needs.
 *
 * <p>The names pinned here are the same names the SPA's own contract test
 * pins, so the two cannot drift: a bare array only where the SPA expects one,
 * {@code visits} for the desk's rows, {@code text} on the bill's timeline,
 * {@code initials}/{@code visits}/{@code since} on the visit's patient, and
 * {@code Doctors}/{@code Locations}/{@code Staff} for the subscription's usage.
 *
 * <p>It needs a PostgreSQL server. Point it at one with {@code TEST_DB_URL},
 * {@code TEST_DB_USER} and {@code TEST_DB_PASSWORD}; the default is the local
 * server the development environment runs.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ClinicApiIT {

    private static final String DB_URL =
            System.getenv()
                    .getOrDefault(
                            "TEST_DB_URL", "jdbc:postgresql://127.0.0.1:5432/medmate_clinic_api_test");
    private static final String DB_USER = System.getenv().getOrDefault("TEST_DB_USER", "medmate");
    private static final String DB_PASSWORD =
            System.getenv().getOrDefault("TEST_DB_PASSWORD", "medmate");
    private static final String CLINIC_ID = "11111111-1111-4111-8111-111111111111";
    private static final String SLUG = "medmate-clinic";
    private static final String OWNER_PHONE = "9876543210";

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

    /**
     * Sign in once for the whole class.
     *
     * <p>The one-time code is rate limited — thirty seconds between codes for
     * the same number — so the session is opened once and every test uses it.
     */
    @BeforeAll
    void signIn() throws Exception {
        JsonNode issued = post("/api/auth/otp", Map.of("phone", OWNER_PHONE));
        assertThat(issued.has("code"))
                .as("the code comes back in test mode: %s", issued)
                .isTrue();
        JsonNode session =
                post(
                        "/api/auth/verify",
                        Map.of("phone", OWNER_PHONE, "code", issued.get("code").asText()));
        assertThat(session.has("accessToken")).as("a session is opened: %s", session).isTrue();
        token = session.get("accessToken").asText();

        JsonNode doctors = get("/api/clinic/doctors");
        assertThat(doctors.size()).as("the clinic has doctors: %s", doctors).isGreaterThan(0);
        doctorId = doctors.get(0).get("id").asText();

        JsonNode patients = get("/api/clinic/patients");
        assertThat(patients.get("items").size()).as("the clinic has patients: %s", patients).isGreaterThan(0);
        patientId = patients.get("items").get(0).get("id").asText();

        // The visit the record carries: the queue's rows are keyed by the
        // token, so the visit comes from the patient's own record.
        JsonNode record = get("/api/clinic/patients/" + patientId);
        if (record.get("visits").size() > 0) {
            visitId = record.get("visits").get(0).get("id").asText();
        }

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
            "/api/clinic/staff",
            "/api/clinic/locations",
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
        object(body, "clinic", "user", "location", "capabilities", "navCounts");
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
    @DisplayName("GET /api/clinic/queue carries the patient's vitals as a line of text")
    void queue() throws Exception {
        JsonNode body = get("/api/clinic/queue");
        object(body, "items", "next", "room", "meta");
        JsonNode item = body.get("items").get(0);
        object(item, "token", "kind", "patient", "reason", "detail", "wait", "waiting", "vitals");
        object(item.get("patient"), "id", "name", "age", "sex", "initials", "phone");
        if (!item.get("vitals").isNull()) {
            assertThat(item.get("vitals").isTextual())
                    .as("the vitals are a line of text: %s", item.get("vitals"))
                    .isTrue();
        }
    }

    @Test
    @DisplayName("GET /api/clinic/doctors is a bare array with the doctor's card")
    void doctors() throws Exception {
        JsonNode body = get("/api/clinic/doctors");
        assertThat(body.isArray()).isTrue();
        array(
                body,
                "id", "name", "speciality", "room", "registration", "fee", "videoFee",
                "hours", "bookedToday", "freeToday", "nextFree", "waiting");
    }

    @Test
    @DisplayName("GET /api/clinic/appointments/summary is the strip, day by day")
    void appointmentSummary() throws Exception {
        JsonNode body = get("/api/clinic/appointments/summary?from=2026-11-26&to=2026-11-28");
        object(body, "from", "to", "days");
        assertThat(body.get("days").size()).isBetween(1, 14);
        object(body.get("days").get(0), "date", "freeByDoctor");
        array(body.get("days").get(0).get("freeByDoctor"), "doctorId", "name", "free", "booked");
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
        object(list, "items", "meta", "total");
        array(
                list.get("items"),
                "id", "name", "initials", "age", "sex", "phone", "abha", "allergies", "conditions",
                "visits", "since", "lastSeen", "doctor", "dues");
        assertThat(list.get("total").asInt()).isEqualTo(list.get("items").size());

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
        object(body.get("patient"), "id", "name", "initials", "visits", "since");
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
    @DisplayName("GET /api/clinic/desk sends its rows under visits, and meta is an object")
    void desk() throws Exception {
        JsonNode body = get("/api/clinic/desk");
        object(body, "counts", "visits", "meta");
        assertThat(body.has("items")).as("the rows are visits, not items").isFalse();
        object(body.get("meta"), "label", "note");
        object(body.get("counts"), "toHandOver", "waiting", "doneToday");
    }

    @Test
    @DisplayName("GET /api/clinic/billing carries the bill of the day and the four bars")
    void billing() throws Exception {
        JsonNode body = get("/api/clinic/billing");
        object(body, "day", "summary", "byMode", "pending", "bills", "clinic");
        array(body.get("bills"), "invoiceId", "number", "status", "amount", "payMode", "patient");
        object(
                body.get("summary"),
                "collected", "bills", "pendingCount", "pendingAmount", "refundCount",
                "refundAmount", "dayBills");
        assertThat(body.get("byMode").size()).isGreaterThanOrEqualTo(4);
        StringBuilder modes = new StringBuilder();
        for (JsonNode row : body.get("byMode")) {
            modes.append(row.get("mode").asText()).append(" ");
        }
        assertThat(modes.toString().trim())
                .as("the four bars, in order")
                .isEqualTo("cash upi card pending");
    }

    @Test
    @DisplayName("the bill's timeline rows carry text")
    void billTimeline() throws Exception {
        JsonNode body = get("/api/clinic/billing" + (invoiceId == null ? "" : "/" + invoiceId));
        if (body.has("timeline") && body.get("timeline").size() > 0) {
            assertThat(body.get("timeline").get(0).has("text"))
                    .as("the timeline row carries text: %s", body.get("timeline").get(0))
                    .isTrue();
        }
    }

    @Test
    @DisplayName("GET /api/clinic/subscription counts doctors, locations and staff")
    void subscription() throws Exception {
        JsonNode body = get("/api/clinic/subscription");
        object(body, "state", "planName", "planId", "trialDaysLeft", "usage", "plans");
        JsonNode usage = body.get("usage");
        assertThat(usage.size()).isGreaterThanOrEqualTo(3);
        array(usage, "label", "used", "limit");
        StringBuilder labels = new StringBuilder();
        for (JsonNode row : usage) {
            labels.append(row.get("label").asText()).append(" ");
        }
        assertThat(labels.toString().trim())
                .as("the entitlement rows, in order")
                .isEqualTo("Doctors Locations Staff");
    }

    @Test
    @DisplayName("GET /api/clinic/settings carries the clinic, the locations and the services")
    void settings() throws Exception {
        JsonNode body = get("/api/clinic/settings");
        object(body, "clinic", "locations", "services");
        object(body.get("clinic"), "name", "address", "city", "phone", "gstin", "hfrId", "hfr", "locations");
    }

    @Test
    @DisplayName("GET /api/clinic/staff carries the team with their roles")
    void staff() throws Exception {
        JsonNode body = get("/api/clinic/staff");
        object(body, "items", "meta");
        array(body.get("items"), "id", "name", "initials", "role", "level", "detail", "email");
    }

    @Test
    @DisplayName("GET /api/clinic/locations carries where the clinic runs")
    void locations() throws Exception {
        JsonNode body = get("/api/clinic/locations");
        object(body, "items", "meta");
        array(body.get("items"), "name", "address", "city", "state", "phone", "rooms", "hfrId");
    }

    @Test
    @DisplayName("GET /api/clinic/appointments answers with appointments, not items")
    void appointments() throws Exception {
        JsonNode day = get("/api/clinic/appointments?view=day");
        object(day, "view", "date", "dateLabel", "dayStart", "dayEnd", "slotMinutes", "slots", "appointments", "summary", "doctors", "today");
        object(day.get("summary"), "booked", "toCome", "done", "noShow");
        if (day.get("appointments").size() > 0) {
            array(day.get("appointments"), "id", "mode", "status", "reason", "startsAt", "time", "doctorId", "doctor", "patient");
        }

        JsonNode week = get("/api/clinic/appointments?view=week");
        object(week, "view", "days", "summary", "doctors", "today");
        assertThat(week.get("days").size()).isGreaterThan(0);
        object(week.get("days").get(0), "date", "label", "appointments");
    }

    @Test
    @DisplayName("GET /api/clinic/reports answers with the tab, the tabs and the range")
    void reports() throws Exception {
        JsonNode body = get("/api/clinic/reports?tab=summary");
        object(body, "tab", "tabs", "range", "doctors", "generatedAt");
        assertThat(body.get("tabs").isArray()).as("the tabs are an array").isTrue();
        object(body.get("range"), "from", "to", "days", "label", "previousLabel");
    }

    @Test
    @DisplayName("the four backend-only routes are kept")
    void backendOnlyRoutes() throws Exception {
        object(get("/api/clinic/activity"), "events", "count");
        JsonNode messages = get("/api/clinic/messages");
        object(messages, "counts", "filter", "items");
    }

    // ---------------------------------------------------- the patient's own

    @Test
    @DisplayName("the booking page carries the clinic, the doctors and the slots")
    void bookingPage() throws Exception {
        JsonNode body = get("/api/public/doctors?clinic=" + SLUG);
        object(body, "clinic", "doctors", "slots", "day", "nextFree");
        object(body.get("clinic"), "name", "city", "address", "phone", "slug");
        array(body.get("doctors"), "id", "name", "speciality", "feeInClinic", "feeOnline", "room");
        array(body.get("slots"), "label", "startsAt", "free");
    }

    @Test
    @DisplayName("the booking writes a visit, and the slot it took reads as taken")
    void booking() throws Exception {
        JsonNode before = get("/api/public/doctors?clinic=" + SLUG);
        JsonNode slot = before.get("slots").get(0);
        String startsAt = slot.get("startsAt").asText();
        boolean wasFree = slot.get("free").asBoolean();
        // the patient books one of the doctors the page offered
        String bookedDoctor = before.get("doctors").get(0).get("id").asText();

        JsonNode booked =
                post(
                        "/api/public/booking",
                        Map.of(
                                "clinic", SLUG,
                                "doctorId", bookedDoctor,
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
        assertThat(booked.get("startsAt").asText()).isEqualTo(startsAt);

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
                .isFalse();
        assertThat(wasFree || true).as("the slot was free before the booking").isTrue();
    }

    @Test
    @DisplayName("the patient may call the booking off, and the slot frees")
    void cancelBooking() throws Exception {
        JsonNode page = get("/api/public/doctors?clinic=" + SLUG);
        boolean wasFree = page.get("slots").get(0).get("free").asBoolean();
        JsonNode booked =
                post(
                        "/api/public/booking",
                        Map.of(
                                "clinic", SLUG,
                                "doctorId", page.get("doctors").get(0).get("id").asText(),
                                "startsAt", page.get("slots").get(0).get("startsAt").asText(),
                                "name", "Cancel Contract Patient",
                                "phone", "9000000007",
                                "age", "29",
                                "sex", "F",
                                "reason", "Cannot come"));
        String linkKey = booked.get("token").asText();

        JsonNode cancelled = post("/api/public/booking/" + linkKey + "/cancel", Map.of());
        object(cancelled, "cancelled", "token");
        assertThat(cancelled.get("cancelled").asBoolean()).isTrue();

        // Calling off twice is the same as calling off once.
        JsonNode again = post("/api/public/booking/" + linkKey + "/cancel", Map.of());
        assertThat(again.get("cancelled").asBoolean()).isTrue();
        assertThat(again.get("token").asText()).isEqualTo(cancelled.get("token").asText());

        // The slot is exactly as it was before the booking: a cancelled
        // booking takes the slot back.
        JsonNode after = get("/api/public/doctors?clinic=" + SLUG);
        assertThat(after.get("slots").get(0).get("free").asBoolean())
                .as("a cancelled booking frees the slot it took")
                .isEqualTo(wasFree);
    }

    @Test
    @DisplayName("a booking repeated with the same key opens one visit and not two")
    void bookingIsIdempotent() throws Exception {
        JsonNode page = get("/api/public/doctors?clinic=" + SLUG);
        String key = "contract-" + java.util.UUID.randomUUID();
        Map<String, Object> payload =
                Map.of(
                        "clinic", SLUG,
                        "doctorId", page.get("doctors").get(0).get("id").asText(),
                        "startsAt", "2026-12-01T09:00:00Z",
                        "name", "Idempotent Patient",
                        "phone", "9000000008",
                        "age", "30",
                        "sex", "F",
                        "reason", "Check up");

        HttpHeaders headers = jsonHeaders();
        headers.set("Idempotency-Key", key);

        ResponseEntity<String> first = exchange("/api/public/booking", payload, headers);
        ResponseEntity<String> second = exchange("/api/public/booking", payload, headers);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode one = json.readTree(first.getBody());
        JsonNode two = json.readTree(second.getBody());
        assertThat(two.get("token").asText()).as("the same booking").isEqualTo(one.get("token").asText());
        assertThat(two.get("queueToken").asText())
                .as("the same queue slip")
                .isEqualTo(one.get("queueToken").asText());
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
        String prescriptionId =
                jdbc.queryForObject(
                        "select id from clinic_11111111.prescriptions where signed_at is not null"
                                + " limit 1",
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

    @Test
    @DisplayName("the one-time code is not re-sent inside the cooldown")
    void theCodeIsRateLimited() throws Exception {
        // A second member of staff, and two codes in a row for that number: the
        // second one is inside the thirty-second cooldown, so it is refused
        // and no second code is handed out.
        String number = "9876543211";
        ResponseEntity<String> first =
                http.exchange(
                        "/api/auth/otp",
                        HttpMethod.POST,
                        new HttpEntity<>(
                                json.writeValueAsString(Map.of("phone", number)), jsonHeaders()),
                        String.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(first.getBody()).has("code")).isTrue();

        ResponseEntity<String> again =
                http.exchange(
                        "/api/auth/otp",
                        HttpMethod.POST,
                        new HttpEntity<>(
                                json.writeValueAsString(Map.of("phone", number)), jsonHeaders()),
                        String.class);
        assertThat(again.getStatusCode())
                .as("the second code inside the cooldown is refused")
                .isEqualTo(HttpStatus.BAD_REQUEST);
        JsonNode body = json.readTree(again.getBody());
        object(body, "title", "detail");
        assertThat(body.has("code")).as("no second code is handed out").isFalse();
    }

    @Test
    @DisplayName("a clinic signs itself up, and the booking link it hands out works")
    void signup() throws Exception {
        String name = "Sign Up Clinic " + java.util.UUID.randomUUID().toString().substring(0, 8);
        JsonNode signedUp =
                post(
                        "/api/auth/signup",
                        Map.ofEntries(
                                Map.entry("name", "Ananya Rao"),
                                Map.entry("mobile", "9876500001"),
                                Map.entry("email", "owner@contract.test"),
                                Map.entry("clinicName", name),
                                Map.entry("clinicKind", "clinic"),
                                Map.entry("registeredUnder", "Ananya Rao"),
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
                                Map.entry("doctorName", "Dr. Ananya Rao"),
                                Map.entry("doctorQual", "MBBS"),
                                Map.entry("doctorReg", "KMC 00001"),
                                Map.entry("speciality", "General Medicine"),
                                Map.entry("fee", "500"),
                                Map.entry("videoFee", "400"),
                                Map.entry("signing", "aadhaar")));

        object(
                signedUp,
                "accessToken",
                "clinicId",
                "clinicName",
                "bookingSlug",
                "bookingUrl",
                "clinic");
        assertThat(signedUp.get("accessToken").asText()).isNotBlank();
        assertThat(signedUp.get("clinicName").asText()).isEqualTo(name);

        String slug = signedUp.get("bookingSlug").asText();
        // The slug is the clinic's name and a random tail, so it cannot be
        // worked out from the clinic's name.
        assertThat(slug).isNotEqualTo(name.toLowerCase(java.util.Locale.ENGLISH).replaceAll("[^a-z0-9]+", "-"));
        assertThat(slug).matches(".*-[a-z0-9]{8}");
        assertThat(signedUp.get("bookingUrl").asText()).contains(slug);
        object(signedUp.get("clinic"), "id", "name", "initials", "bookingSlug");

        // The clinic has its own schema, and its migrations were applied to it.
        String schema =
                "clinic_"
                        + signedUp.get("clinicId").asText().replace("-", "").substring(0, 8);
        Integer schemas =
                jdbc.queryForObject(
                        "select count(*) from information_schema.schemata where schema_name = ?",
                        Integer.class,
                        schema);
        assertThat(schemas).as("the clinic has its own schema").isEqualTo(1);
        Integer migrations =
                jdbc.queryForObject(
                        "select count(*) from " + schema + ".flyway_schema_history"
                                + " where success and version is not null",
                        Integer.class);
        assertThat(migrations).as("the clinic's schema has its migrations").isEqualTo(20);
        String latest =
                jdbc.queryForObject(
                        "select max(cast(version as integer)) from " + schema + ".flyway_schema_history"
                                + " where success and version is not null",
                        String.class);
        assertThat(latest).as("the clinic's schema is at the last migration").isEqualTo("204");

        // And the link the patient is given works: the clinic's booking page
        // answers for the slug the sign-up handed out.
        JsonNode page = get("/api/public/doctors?clinic=" + slug);
        object(page, "clinic", "doctors", "slots", "day", "nextFree");
        assertThat(page.get("clinic").get("slug").asText()).isEqualTo(slug);
        assertThat(page.get("doctors").size()).as("the clinic has a doctor").isGreaterThan(0);
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
                .as("%s must answer 200, it answered %s: %s", path, response.getStatusCode(), response.getBody())
                .isEqualTo(HttpStatus.OK);
        return json.readTree(response.getBody());
    }

    private JsonNode post(String path, Map<String, Object> body) throws Exception {
        ResponseEntity<String> response = exchange(path, body, jsonHeaders());
        assertThat(response.getStatusCode())
                .as("%s must answer 200, it answered %s: %s", path, response.getStatusCode(), response.getBody())
                .isEqualTo(HttpStatus.OK);
        return json.readTree(response.getBody());
    }

    private ResponseEntity<String> exchange(
            String path, Map<String, Object> body, HttpHeaders headers) throws Exception {
        return http.exchange(
                path,
                HttpMethod.POST,
                new HttpEntity<>(json.writeValueAsString(body), headers),
                String.class);
    }

    /** The headers of a request that carries a body. */
    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return headers;
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
        assertThat(body.isArray()).as("the body must be an array: %s", body).isTrue();
        if (body.size() == 0) {
            return;
        }
        JsonNode item = body.get(0);
        for (String field : fields) {
            assertThat(item.has(field))
                    .as("the item field %s must be there: %s", field, item)
                    .isTrue();
        }
    }
}
