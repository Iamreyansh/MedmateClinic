package com.medmate.clinic.schedule;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The appointment book.
 *
 * <p>Two views of the same bookings: a day, as a grid of doctors and half
 * hours, and a week, as a column a day. Both are read from the clinic's own
 * appointments, so a booking made at the desk shows up here at once.
 */
@Service
public class AppointmentService {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("h:mm a");
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("EEEE, d MMM yyyy");
    private static final DateTimeFormatter COLUMN_LABEL = DateTimeFormatter.ofPattern("EEE d");
    private static final LocalTime DAY_START = LocalTime.of(9, 0);
    private static final LocalTime DAY_END = LocalTime.of(20, 0);
    private static final int SLOT_MINUTES = 30;

    /** The slots a doctor has in a day. */
    private static final int SLOTS_PER_DAY = 20;

    /** The most days the strip holds. */
    private static final int MAX_SUMMARY_DAYS = 31;

    /** The appointments one page of the book holds when the caller does not say. */
    private static final int DEFAULT_PAGE = 50;

    /** The most appointments one page of the book may hold. */
    private static final int MAX_PAGE = 200;

    private final AppointmentRepository appointments;
    private final PatientRepository patients;
    private final ClinicZoneService zones;
    private final JdbcTemplate jdbc;

    public AppointmentService(
            AppointmentRepository appointments,
            PatientRepository patients,
            ClinicZoneService zones,
            JdbcTemplate jdbc) {
        this.appointments = appointments;
        this.patients = patients;
        this.zones = zones;
        this.jdbc = jdbc;
    }

    /** The book, as the screen asked for it. */
    @Transactional(readOnly = true)
    public Map<String, Object> book(
            ClinicPrincipal principal,
            String view,
            String date,
            String doctor,
            String from,
            String to,
            int limit,
            int offset) {
        if (!principal.can("appointment")) {
            throw new ForbiddenException("You cannot open the appointments.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate today = LocalDate.now(zone);
        LocalDate day = parseDate(date, today);
        UUID doctorId = parseUuid(doctor);

        List<Map<String, Object>> doctors = doctors(clinicId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("doctors", doctors);
        body.put("today", today.toString());

        if (from != null && !from.isBlank()) {
            body.putAll(
                    range(
                            clinicId,
                            zone,
                            parseDate(from, today),
                            parseDate(to, today),
                            doctorId,
                            limit,
                            offset));
        } else if ("week".equalsIgnoreCase(view)) {
            body.putAll(week(clinicId, zone, day, doctorId));
        } else {
            body.putAll(day(clinicId, zone, day, doctorId));
        }
        return body;
    }

    /**
     * Book a visit.
     *
     * <p>A booking often comes before the first visit, so the patient is created
     * if the clinic has not met them yet. The token is issued when they arrive,
     * not now — so the booking is a time, not a place in the queue.
     */
    @Transactional
    public Map<String, Object> create(
            ClinicPrincipal principal, AppointmentController.BookingRequest request) {
        if (!principal.can("appointment")) {
            throw new ForbiddenException("You cannot book an appointment.");
        }
        if (request == null) {
            throw new IllegalArgumentException("A booking needs a patient, a doctor and a time.");
        }
        String name = request.patient() == null ? "" : request.patient().trim();
        if (name.length() < 2) {
            throw new IllegalArgumentException("A patient is needed to book a visit.");
        }

        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate day = parseDate(request.date(), LocalDate.now(zone));
        LocalTime time = parseTime(request.time());
        Instant startsAt = day.atTime(time).atZone(zone).toInstant();

        Patient patient =
                patients.findByClinicIdOrderByCreatedAtAsc(clinicId).stream()
                        .filter(candidate -> candidate.getFullName().equalsIgnoreCase(name))
                        .findFirst()
                        .orElseGet(() -> {
                            Patient created = new Patient();
                            created.setId(UUID.randomUUID());
                            created.setClinicId(clinicId);
                            created.setFullName(name);
                            created.setAge(0);
                            created.setSex("F");
                            created.setPhone("");
                            created.setAbha("");
                            created.setAllergies(new String[0]);
                            created.setConditions(new String[0]);
                            created.setCreatedAt(Instant.now());
                            return patients.save(created);
                        });

        UUID doctorId = parseUuid(request.doctor());
        if (doctorId == null) {
            doctorId = doctors(clinicId).stream()
                    .map(entry -> parseUuid(String.valueOf(entry.get("id"))))
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        // The slot the desk booked, and whether it is still free. The check
        // and the booking are one transaction, and the doctor's own row is
        // locked first, so two bookings for the same doctor cannot take the
        // same slot.
        if (doctorId != null) {
            lockDoctor(clinicId, doctorId);
            if (slotTaken(clinicId, doctorId, day, zone, time.toString(), null)) {
                throw new ConflictException("Slot no longer available", "Pick another time.");
            }
        }

        Appointment appointment = new Appointment();
        appointment.setId(UUID.randomUUID());
        appointment.setClinicId(clinicId);
        appointment.setPatientId(patient.getId());
        appointment.setDoctorId(doctorId);
        appointment.setVisitId(null);
        appointment.setStartsAt(startsAt);
        appointment.setEndsAt(startsAt.plusSeconds(20 * 60));
        appointment.setMode(request.mode() == null ? "in_clinic" : request.mode());
        appointment.setStatus("booked");
        appointment.setReason(request.reason() == null ? "Booked visit" : request.reason());
        appointment.setSource("booking");
        appointment.setNotes(null);
        appointment.setCreatedAt(Instant.now());
        appointments.save(appointment);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", appointment.getId().toString());
        body.put("status", appointment.getStatus());
        body.put("startsAt", appointment.getStartsAt().toString());
        body.put("patient", patient.getFullName());
        body.put("doctor", doctorName(clinicId, doctorId));
        return body;
    }

    /**
     * The strip: a day at a time, and what is free for each doctor.
     *
     * <p>The schedule shows several days ahead, and each day says how much of
     * each doctor's day is still free. The range is capped, so the answer is a
     * strip and not a book.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> summary(
            ClinicPrincipal principal, String from, String to) {
        if (!principal.can("appointment")) {
            throw new ForbiddenException("You cannot open the appointments.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate start = parseDate(from, LocalDate.now(zone));
        LocalDate end = parseDate(to, start.plusDays(6));
        if (end.isBefore(start)) {
            end = start;
        }
        int days = (int) Math.min(java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1, MAX_SUMMARY_DAYS);

        List<Map<String, Object>> doctorCards = doctors(clinicId);

        // One query for the whole strip: the bookings of every doctor on every
        // day of it. A query for each doctor on each day made the strip
        // slower the longer the range was.
        Map<String, Integer> booked = bookedByDoctorAndDay(clinicId, start, days, zone);

        List<Map<String, Object>> out = new ArrayList<>();
        for (int offset = 0; offset < days; offset++) {
            LocalDate day = start.plusDays(offset);
            List<Map<String, Object>> freeByDoctor = new ArrayList<>();
            int total = 0;
            for (Map<String, Object> doctor : doctorCards) {
                UUID doctorId = parseUuid(String.valueOf(doctor.get("id")));
                int count = doctorId == null ? 0 : booked.getOrDefault(doctorId + "|" + day, 0);
                total += count;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("doctorId", doctor.get("id"));
                row.put("name", doctor.get("name"));
                row.put("booked", count);
                row.put("free", Math.max(0, SLOTS_PER_DAY - count));
                freeByDoctor.add(row);
            }
            Map<String, Object> column = new LinkedHashMap<>();
            column.put("date", day.toString());
            // What the day holds, and what the day could hold.
            column.put("total", total);
            column.put("capacity", SLOTS_PER_DAY * doctorCards.size());
            column.put("freeByDoctor", freeByDoctor);
            out.add(column);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("from", start.toString());
        body.put("to", start.plusDays(days - 1).toString());
        body.put("days", out);
        return body;
    }

    /**
     * The bookings of every doctor on every day of the strip, counted in one
     * query.
     *
     * <p>The day a booking falls on is the clinic's day, not the server's: a
     * booking at half past nine in the evening is on that day in the clinic,
     * whatever the server's clock says.
     */
    private Map<String, Integer> bookedByDoctorAndDay(
            UUID clinicId, LocalDate start, int days, ZoneId zone) {
        Instant from = start.atStartOfDay(zone).toInstant();
        Instant to = start.plusDays(days).atStartOfDay(zone).toInstant();
        Map<String, Integer> counts = new HashMap<>();
        jdbc.query(
                "select doctor_id, day, count(*) as booked from ("
                        + "select doctor_id, (starts_at at time zone ?::text)::date as day "
                        + "from appointments where clinic_id = ? and starts_at >= ? and starts_at < ?"
                        + ") booked group by doctor_id, day",
                (rs, row) -> {
                    UUID doctorId = rs.getObject("doctor_id", UUID.class);
                    LocalDate day = rs.getObject("day", LocalDate.class);
                    if (doctorId != null && day != null) {
                        counts.put(doctorId + "|" + day, rs.getInt("booked"));
                    }
                    return null;
                },
                zone.getId(),
                clinicId,
                java.sql.Timestamp.from(from),
                java.sql.Timestamp.from(to));
        return counts;
    }

    /**
     * The book over a range of days.
     *
     * <p>The caller names the days and asks for a page of the appointments in
     * them. The rows are a page, counted in the database, and the days are
     * the days the range covers.
     */
    private Map<String, Object> range(
            UUID clinicId,
            ZoneId zone,
            LocalDate start,
            LocalDate end,
            UUID doctorId,
            int limit,
            int offset) {
        if (end.isBefore(start)) {
            end = start;
        }
        int days =
                (int)
                        Math.min(
                                java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1,
                                MAX_SUMMARY_DAYS);
        Instant windowFrom = start.atStartOfDay(zone).toInstant();
        Instant windowTo = start.plusDays(days).atStartOfDay(zone).toInstant();
        int pageSize = Math.max(1, Math.min(limit <= 0 ? DEFAULT_PAGE : limit, MAX_PAGE));
        int skip = Math.max(0, offset);
        int pageIndex = skip / pageSize;
        int pageOffset = skip % pageSize;

        org.springframework.data.domain.PageRequest pageRequest =
                org.springframework.data.domain.PageRequest.of(pageIndex, pageSize, org.springframework.data.domain.Sort.by("startsAt"));
        List<Appointment> rows =
                doctorId == null
                        ? appointments.findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(
                                clinicId, windowFrom, windowTo, pageRequest)
                        : appointments.findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
                                clinicId, doctorId, windowFrom, windowTo, pageRequest);

        // The people of the page, read once for the whole page.
        Map<UUID, Map<String, Object>> people = patientsOf(clinicId, rows);
        Map<UUID, String> rooms = rooms(clinicId);

        List<Map<String, Object>> items = new ArrayList<>();
        int toCome = 0;
        int done = 0;
        int noShow = 0;
        Map<LocalDate, List<Map<String, Object>>> byDay = new HashMap<>();
        for (LocalDate date = start; !date.isAfter(start.plusDays(days - 1)); date = date.plusDays(1)) {
            byDay.put(date, new ArrayList<>());
        }
        for (Appointment appointment : rows) {
            Map<String, Object> item = card(clinicId, zone, appointment, people, rooms);
            items.add(item);
            LocalDate date = appointment.getStartsAt().atZone(zone).toLocalDate();
            List<Map<String, Object>> column = byDay.get(date);
            if (column != null) {
                column.add(item);
            }
            String status = statusOf(appointment);
            if ("booked".equals(status)) {
                toCome++;
            } else if ("no_show".equals(status)) {
                noShow++;
            } else if ("done".equals(status) || "checked_in".equals(status) || "in_consult".equals(status)) {
                done++;
            }
        }

        List<Map<String, Object>> dayColumns = new ArrayList<>();
        for (Map.Entry<LocalDate, List<Map<String, Object>>> entry : byDay.entrySet()) {
            LocalDate date = entry.getKey();
            Map<String, Object> column = new LinkedHashMap<>();
            column.put("date", date.toString());
            column.put("label", date.format(COLUMN_LABEL));
            column.put(
                    "dayName",
                    date.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH));
            column.put("booked", entry.getValue().size());
            column.put("isToday", date.equals(LocalDate.now(zone)));
            column.put("appointments", entry.getValue());
            column.put("items", entry.getValue());
            dayColumns.add(column);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("booked", items.size());
        summary.put("toCome", toCome);
        summary.put("done", done);
        summary.put("noShow", noShow);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("total", countRange(clinicId, windowFrom, windowTo, doctorId));
        meta.put("limit", pageSize);
        meta.put("offset", skip);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("view", "range");
        body.put("from", start.toString());
        body.put("to", start.plusDays(days - 1).toString());
        body.put("days", dayColumns);
        body.put("appointments", items);
        body.put("items", items);
        body.put("summary", summary);
        body.put("meta", meta);
        return body;
    }

    /** How many appointments the range holds, counted in the database. */
    private long countRange(UUID clinicId, Instant from, Instant to, UUID doctorId) {
        String sql =
                doctorId == null
                        ? "select count(*) from appointments where clinic_id = ? and starts_at >= ? and starts_at < ?"
                        : "select count(*) from appointments where clinic_id = ? and starts_at >= ? and starts_at < ? and doctor_id = ?";
        Long count =
                doctorId == null
                        ? jdbc.queryForObject(
                                sql, Long.class, clinicId, java.sql.Timestamp.from(from), java.sql.Timestamp.from(to))
                        : jdbc.queryForObject(
                                sql,
                                Long.class,
                                clinicId,
                                java.sql.Timestamp.from(from),
                                java.sql.Timestamp.from(to),
                                doctorId);
        return count == null ? 0 : count;
    }

    /**
     * The patients of a page of appointments, read once for the whole page.
     *
     * <p>One query for the page, not one for every row.
     */
    private Map<UUID, Map<String, Object>> patientsOf(UUID clinicId, List<Appointment> rows) {
        Map<UUID, Map<String, Object>> people = new LinkedHashMap<>();
        List<UUID> ids = new ArrayList<>();
        for (Appointment appointment : rows) {
            if (appointment.getPatientId() != null && !people.containsKey(appointment.getPatientId())) {
                ids.add(appointment.getPatientId());
            }
        }
        if (ids.isEmpty()) {
            return people;
        }
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(clinicId);
        args.addAll(ids);
        jdbc.query(
                "select id, full_name, age, sex, phone from patients where clinic_id = ? and id in ("
                        + placeholders
                        + ")",
                (rs, row) -> {
                    Map<String, Object> person = new LinkedHashMap<>();
                    person.put("id", rs.getString("id"));
                    person.put("name", rs.getString("full_name"));
                    person.put("age", rs.getObject("age"));
                    person.put("sex", rs.getString("sex"));
                    person.put("initials", initials(rs.getString("full_name")));
                    person.put("phone", rs.getString("phone") == null ? "" : rs.getString("phone"));
                    people.put(UUID.fromString(rs.getString("id")), person);
                    return null;
                },
                args.toArray());
        return people;
    }

    /**
     * One appointment, as the grid shows it.
     *
     * <p>The patient is read from the page, so the grid does not go back to
     * the database for every row it draws.
     */
    private Map<String, Object> card(
            UUID clinicId,
            ZoneId zone,
            Appointment appointment,
            Map<UUID, Map<String, Object>> people,
            Map<UUID, String> rooms) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", appointment.getId().toString());
        item.put("mode", appointment.getMode());
        item.put("status", statusOf(appointment));
        item.put("reason", appointment.getReason() == null ? "" : appointment.getReason());
        item.put("startsAt", appointment.getStartsAt().toString());
        item.put(
                "endsAt",
                appointment.getEndsAt() == null ? null : appointment.getEndsAt().toString());
        item.put("time", appointment.getStartsAt().atZone(zone).format(CLOCK));
        item.put(
                "durationMinutes",
                appointment.getEndsAt() == null
                        ? 20
                        : (appointment.getEndsAt().getEpochSecond()
                                        - appointment.getStartsAt().getEpochSecond())
                                / 60);
        item.put("doctorId", appointment.getDoctorId() == null ? null : appointment.getDoctorId().toString());
        item.put("doctor", doctorName(clinicId, appointment.getDoctorId()));
        item.put("visitId", appointment.getVisitId() == null ? null : appointment.getVisitId().toString());
        item.put("patientId", appointment.getPatientId() == null ? null : appointment.getPatientId().toString());
        item.put("source", appointment.getSource());
        // The room the doctor works in — the column on the staff row, and
        // never the doctor's name or speciality: a doctor sees patients in a
        // room, and a name is not a room.
        item.put(
                "room",
                appointment.getDoctorId() == null
                        ? null
                        : rooms.getOrDefault(appointment.getDoctorId(), ""));

        Map<String, Object> patient = new LinkedHashMap<>();
        Map<String, Object> person =
                appointment.getPatientId() == null ? null : people.get(appointment.getPatientId());
        if (person != null) {
            patient.putAll(person);
        }
        item.put("patient", patient);
        return item;
    }

    // ------------------------------------------------------------------ day

    private Map<String, Object> day(UUID clinicId, ZoneId zone, LocalDate day, UUID doctorId) {
        Instant from = day.atStartOfDay(zone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();
        List<Appointment> booked = appointments.findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(clinicId, from, to);
        if (doctorId != null) {
            booked = booked.stream().filter(a -> doctorId.equals(a.getDoctorId())).toList();
        }

        Map<UUID, String> rooms = rooms(clinicId);
        List<Map<String, Object>> items = new ArrayList<>();
        int toCome = 0;
        int done = 0;
        int noShow = 0;
        for (Appointment appointment : booked) {
            items.add(card(clinicId, zone, appointment, rooms));
            String status = statusOf(appointment);
            if ("booked".equals(status)) {
                toCome++;
            } else if ("no_show".equals(status)) {
                noShow++;
            } else if ("done".equals(status) || "checked_in".equals(status) || "in_consult".equals(status)) {
                done++;
            }
        }

        List<Map<String, Object>> slots = new ArrayList<>();
        for (LocalTime time = DAY_START; time.isBefore(DAY_END); time = time.plusMinutes(SLOT_MINUTES)) {
            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("time", time.toString());
            slot.put("label", time.format(CLOCK));
            slot.put("minutes", time.atDate(day).atZone(zone).toInstant().toEpochMilli());
            slots.add(slot);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("booked", booked.size());
        summary.put("toCome", toCome);
        summary.put("done", done);
        summary.put("noShow", noShow);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("view", "day");
        body.put("date", day.toString());
        body.put("dateLabel", day.format(DAY_LABEL));
        body.put("dayStart", DAY_START.format(CLOCK));
        body.put("dayEnd", DAY_END.format(CLOCK));
        body.put("slotMinutes", SLOT_MINUTES);
        body.put("slots", slots);
        // The canonical key is appointments; items is kept as an alias so a
        // screen that was written against the older name keeps working.
        body.put("appointments", items);
        body.put("items", items);
        body.put("summary", summary);
        return body;
    }

    // ----------------------------------------------------------------- week

    private Map<String, Object> week(UUID clinicId, ZoneId zone, LocalDate anyDay, UUID doctorId) {
        LocalDate monday = anyDay.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate saturday = monday.plusDays(5);
        Instant from = monday.atStartOfDay(zone).toInstant();
        Instant to = saturday.plusDays(1).atStartOfDay(zone).toInstant();
        List<Appointment> booked = appointments.findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(clinicId, from, to);
        if (doctorId != null) {
            booked = booked.stream().filter(a -> doctorId.equals(a.getDoctorId())).toList();
        }

        Map<UUID, String> rooms = rooms(clinicId);
        Map<LocalDate, List<Map<String, Object>>> byDay = new HashMap<>();
        for (LocalDate date = monday; !date.isAfter(saturday); date = date.plusDays(1)) {
            byDay.put(date, new ArrayList<>());
        }
        int toCome = 0;
        int noShow = 0;
        int done = 0;
        for (Appointment appointment : booked) {
            LocalDate date = appointment.getStartsAt().atZone(zone).toLocalDate();
            List<Map<String, Object>> column = byDay.get(date);
            if (column == null) {
                continue;
            }
            column.add(card(clinicId, zone, appointment, rooms));
            String status = statusOf(appointment);
            if ("booked".equals(status)) {
                toCome++;
            } else if ("no_show".equals(status)) {
                noShow++;
            } else if ("done".equals(status) || "checked_in".equals(status) || "in_consult".equals(status)) {
                done++;
            }
        }

        List<Map<String, Object>> days = new ArrayList<>();
        for (Map.Entry<LocalDate, List<Map<String, Object>>> entry : byDay.entrySet()) {
            LocalDate date = entry.getKey();
            Map<String, Object> column = new LinkedHashMap<>();
            column.put("date", date.toString());
            column.put("label", date.format(COLUMN_LABEL));
            column.put("dayName", date.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH));
            column.put("booked", entry.getValue().size());
            column.put("isToday", date.equals(LocalDate.now(zone)));
            // The canonical key is appointments; items is kept as an alias.
            column.put("appointments", entry.getValue());
            column.put("items", entry.getValue());
            days.add(column);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("booked", booked.size());
        summary.put("toCome", toCome);
        summary.put("done", done);
        summary.put("noShow", noShow);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("view", "week");
        body.put("from", monday.toString());
        body.put("to", saturday.toString());
        body.put("days", days);
        // The canonical key is appointments; items is kept as an alias.
        body.put("appointments", days);
        body.put("items", days);
        body.put("summary", summary);
        return body;
    }

    // ---------------------------------------------------------------- cards

    private Map<String, Object> card(
            UUID clinicId, ZoneId zone, Appointment appointment, Map<UUID, String> rooms) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", appointment.getId().toString());
        item.put("mode", appointment.getMode());
        item.put("status", statusOf(appointment));
        item.put("reason", appointment.getReason() == null ? "" : appointment.getReason());
        item.put("startsAt", appointment.getStartsAt().toString());
        item.put(
                "endsAt",
                appointment.getEndsAt() == null ? null : appointment.getEndsAt().toString());
        item.put("time", appointment.getStartsAt().atZone(zone).format(CLOCK));
        item.put(
                "durationMinutes",
                appointment.getEndsAt() == null
                        ? 20
                        : (appointment.getEndsAt().getEpochSecond()
                                        - appointment.getStartsAt().getEpochSecond())
                                / 60);
        item.put("doctorId", appointment.getDoctorId() == null ? null : appointment.getDoctorId().toString());
        item.put("doctor", doctorName(clinicId, appointment.getDoctorId()));
        item.put("visitId", appointment.getVisitId() == null ? null : appointment.getVisitId().toString());
        item.put("patientId", appointment.getPatientId() == null ? null : appointment.getPatientId().toString());
        item.put("source", appointment.getSource());
        // The room the doctor works in — the column on the staff row, and
        // never the doctor's name or speciality: a doctor sees patients in a
        // room, and a name is not a room.
        item.put(
                "room",
                appointment.getDoctorId() == null
                        ? null
                        : rooms.getOrDefault(appointment.getDoctorId(), ""));

        Map<String, Object> patient = new LinkedHashMap<>();
        patients.findById(appointment.getPatientId()).ifPresent(person -> {
            patient.put("id", person.getId().toString());
            patient.put("name", person.getFullName());
            patient.put("age", person.getAge());
            patient.put("sex", person.getSex());
            patient.put("initials", initials(person.getFullName()));
            patient.put("phone", person.getPhone() == null ? "" : person.getPhone());
        });
        item.put("patient", patient);
        return item;
    }

    private List<Map<String, Object>> doctors(UUID clinicId) {
        return jdbc.query(
                "select s.id, s.full_name, s.speciality, s.registration "
                        + "from staff s join roles r on r.id = s.role_id "
                        + "where s.clinic_id = ? and r.name in ('doctor', 'owner') and s.active "
                        + "order by s.full_name",
                (rs, row) -> {
                    Map<String, Object> doctor = new LinkedHashMap<>();
                    doctor.put("id", rs.getString("id"));
                    doctor.put("name", rs.getString("full_name"));
                    doctor.put("speciality", rs.getString("speciality") == null ? "" : rs.getString("speciality"));
                    doctor.put(
                            "registration",
                            rs.getString("registration") == null ? "" : rs.getString("registration"));
                    return doctor;
                },
                clinicId);
    }

    private static String statusOf(Appointment appointment) {
        return appointment.getStatus() == null ? "booked" : appointment.getStatus();
    }

    /** The time of day, as the desk typed it. */
    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return DAY_START;
        }
        String text = value.trim();
        // The desk sends "09:30"; some screens send "9:30 am".
        String cleaned = text.replace("am", "").replace("pm", "").replace("AM", "").replace("PM", "").trim();
        boolean afternoon = text.toLowerCase().contains("pm");
        try {
            String[] parts = cleaned.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int minute = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
            if (afternoon && hour < 12) {
                hour += 12;
            }
            if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
                return LocalTime.of(hour, minute);
            }
        } catch (RuntimeException notATime) {
            // fall through to the start of the day
        }
        return DAY_START;
    }

    /** The name of the doctor, for the booking that was made. */
    /**
     * The room each doctor works in.
     *
     * <p>The column is read through the row's own JSON, so the appointment
     * book reads the room the doctors screen reads and never falls back to the
     * doctor's name — which is the bug this replaced.
     */
    private Map<UUID, String> rooms(UUID clinicId) {
        Map<UUID, String> rooms = new LinkedHashMap<>();
        jdbc.query(
                "select id, to_jsonb(s) ->> 'room' as room from staff s where clinic_id = ?",
                (rs, row) -> {
                    String room = rs.getString("room");
                    rooms.put(rs.getObject("id", UUID.class), room == null ? "" : room);
                    return null;
                },
                clinicId);
        return rooms;
    }

    private String doctorName(UUID clinicId, UUID doctorId) {
        if (doctorId == null) {
            return "Any doctor";
        }
        return jdbc.query(
                "select full_name from staff where id = ? and clinic_id = ?",
                (rs, row) -> rs.getString("full_name"),
                doctorId,
                clinicId)
                .stream()
                .findFirst()
                .orElse("Any doctor");
    }

    static String initials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String[] parts = name.trim().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(part.charAt(0)));
        }
        return out.toString();
    }

    private static LocalDate parseDate(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDate.parse(value);
        } catch (RuntimeException notADate) {
            return fallback;
        }
    }

    /**
     * The appointments that hold the slots of one doctor on one day.
     *
     * <p>One query serves the free times of the day and the check that a
     * time is still free, so the two can never disagree about which slot is
     * taken.
     */
    private List<Appointment> takenAppointments(
            UUID clinicId, UUID doctorId, LocalDate day, ZoneId zone) {
        if (doctorId == null) {
            return List.of();
        }
        Instant from = day.atStartOfDay(zone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();
        List<Appointment> rows = new ArrayList<>();
        for (Appointment appointment :
                appointments.findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
                        clinicId, doctorId, from, to)) {
            // A cancelled booking does not take the slot.
            if ("cancelled".equals(appointment.getStatus())) {
                continue;
            }
            rows.add(appointment);
        }
        return rows;
    }

    /** Whether the slot is already taken. */
    private boolean slotTaken(
            UUID clinicId,
            UUID doctorId,
            LocalDate day,
            ZoneId zone,
            String slot,
            UUID otherVisitId) {
        for (Appointment appointment : takenAppointments(clinicId, doctorId, day, zone)) {
            if (otherVisitId != null && otherVisitId.equals(appointment.getVisitId())) {
                continue;
            }
            if (appointment.getStartsAt().atZone(zone).toLocalTime().toString().equals(slot)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lock the doctor's own row, so two bookings for the same doctor cannot
     * both take the same slot.
     *
     * <p>The lock is on the doctor and not on the day's appointments: the row
     * is always there, and it is the same row whether or not the doctor has
     * any appointment yet.
     */
    private void lockDoctor(UUID clinicId, UUID doctorId) {
        jdbc.query(
                "select id from staff where id = ? and clinic_id = ? for update",
                (rs, row) -> rs.getObject(1),
                doctorId,
                clinicId);
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (RuntimeException notAUuid) {
            return null;
        }
    }
}
