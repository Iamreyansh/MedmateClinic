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
    private static final LocalTime DAY_END = LocalTime.of(19, 0);
    private static final int SLOT_MINUTES = 30;

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
            ClinicPrincipal principal, String view, String date, String doctor) {
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

        if ("week".equalsIgnoreCase(view)) {
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

    // ------------------------------------------------------------------ day

    private Map<String, Object> day(UUID clinicId, ZoneId zone, LocalDate day, UUID doctorId) {
        Instant from = day.atStartOfDay(zone).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zone).toInstant();
        List<Appointment> booked = appointments.findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(clinicId, from, to);
        if (doctorId != null) {
            booked = booked.stream().filter(a -> doctorId.equals(a.getDoctorId())).toList();
        }

        List<Map<String, Object>> items = new ArrayList<>();
        int toCome = 0;
        int done = 0;
        int noShow = 0;
        for (Appointment appointment : booked) {
            items.add(card(clinicId, zone, appointment));
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
        body.put("appointments", items);
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

        Map<LocalDate, List<Map<String, Object>>> byDay = new HashMap<>();
        for (LocalDate date = monday; !date.isAfter(saturday); date = date.plusDays(1)) {
            byDay.put(date, new ArrayList<>());
        }
        int toCome = 0;
        int noShow = 0;
        for (Appointment appointment : booked) {
            LocalDate date = appointment.getStartsAt().atZone(zone).toLocalDate();
            List<Map<String, Object>> column = byDay.get(date);
            if (column == null) {
                continue;
            }
            column.add(card(clinicId, zone, appointment));
            String status = statusOf(appointment);
            if ("booked".equals(status)) {
                toCome++;
            } else if ("no_show".equals(status)) {
                noShow++;
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
            column.put("items", entry.getValue());
            days.add(column);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("booked", booked.size());
        summary.put("toCome", toCome);
        summary.put("noShow", noShow);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("view", "week");
        body.put("from", monday.toString());
        body.put("to", saturday.toString());
        body.put("days", days);
        body.put("summary", summary);
        return body;
    }

    // ---------------------------------------------------------------- cards

    private Map<String, Object> card(UUID clinicId, ZoneId zone, Appointment appointment) {
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
