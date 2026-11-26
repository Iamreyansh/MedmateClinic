package com.medmate.clinic.admin.doctor;

import com.medmate.clinic.admin.AdminAccess;
import com.medmate.clinic.admin.AdminEnvelopes;
import com.medmate.clinic.admin.staff.AdminRoleLookup;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The clinic's doctors.
 *
 * <p>A doctor is a member of the clinic whose role is doctor, so adding one
 * writes the person and the role together: a doctor who cannot sign in is
 * not a doctor. The card each write answers with is the same card the
 * doctors screen reads, so the screen never has to guess what was saved.
 */
@Service
public class AdminDoctorService {

    /** The most doctors one page holds. */
    public static final int PAGE_SIZE = 100;

    /** The days of the week, the way the reference writes them. */
    private static final String[] WEEKDAYS = {
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    };

    private final StaffRepository staff;
    private final AdminRoleLookup roleLookup;
    private final AdminDoctorCards cards;
    private final DoctorSessionRepository sessions;
    private final DoctorLeaveRepository leave;

    public AdminDoctorService(
            StaffRepository staff,
            AdminRoleLookup roleLookup,
            AdminDoctorCards cards,
            DoctorSessionRepository sessions,
            DoctorLeaveRepository leave) {
        this.staff = staff;
        this.roleLookup = roleLookup;
        this.cards = cards;
        this.sessions = sessions;
        this.leave = leave;
    }

    /** Add a doctor to the clinic. */
    @Transactional
    public Map<String, Object> create(ClinicPrincipal principal, DoctorRequest request) {
        AdminAccess.require(principal, "You cannot add a doctor.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Role doctorRole =
                roleLookup
                        .byName(clinicId, "doctor")
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "This clinic has no doctor role. It cannot add a doctor."));

        String mobile = digits(request.mobile());
        Optional<Staff> already = staff.findFirstByClinicIdAndMobile(clinicId, mobile);
        if (already.isPresent()) {
            Staff person = already.get();
            if (doctorRole.getId().equals(person.getRoleId())) {
                return AdminEnvelopes.one(cards.card(clinicId, person));
            }
            throw new IllegalArgumentException(
                    "That mobile number already belongs to someone else in this clinic.");
        }

        Staff person = new Staff();
        person.setId(UUID.randomUUID());
        person.setClinicId(clinicId);
        person.setRoleId(doctorRole.getId());
        person.setFullName(request.name().trim());
        person.setMobile(mobile);
        person.setEmail(blankToNull(request.email()));
        person.setSpeciality(blankToNull(request.speciality()));
        person.setRegistration(blankToNull(request.registration()));
        person.setHprId(blankToNull(request.hprId()));
        person.setRoom(blankToNull(request.room()));
        person.setConsultationFee(fee(request.consultationFee(), "500"));
        person.setVideoFee(fee(request.videoFee(), "400"));
        person.setPinHash(null);
        person.setActive(true);
        person.setCreatedAt(Instant.now());
        staff.save(person);

        writeSessions(clinicId, person.getId(), request.sessions());
        return AdminEnvelopes.one(cards.card(clinicId, person));
    }

    /** Change what is known about a doctor. */
    @Transactional
    public Map<String, Object> update(
            ClinicPrincipal principal, UUID doctorId, DoctorRequest request) {
        AdminAccess.require(principal, "You cannot change a doctor.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(doctorId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That doctor is not in this clinic."));

        person.setFullName(request.name().trim());
        person.setEmail(blankToNull(request.email()));
        person.setSpeciality(blankToNull(request.speciality()));
        person.setRegistration(blankToNull(request.registration()));
        person.setHprId(blankToNull(request.hprId()));
        person.setRoom(blankToNull(request.room()));
        person.setConsultationFee(fee(request.consultationFee(), "500"));
        person.setVideoFee(fee(request.videoFee(), "400"));
        staff.save(person);

        if (request.sessions() != null) {
            writeSessions(clinicId, doctorId, request.sessions());
        }
        return AdminEnvelopes.one(cards.card(clinicId, person));
    }

    /** The hours a doctor keeps, and the days they are away. */
    @Transactional(readOnly = true)
    public Map<String, Object> schedule(ClinicPrincipal principal, UUID doctorId) {
        AdminAccess.require(principal, "You cannot open the hours.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(doctorId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That doctor is not in this clinic."));
        return AdminEnvelopes.one(scheduleOf(clinicId, person));
    }

    /** The hours every doctor keeps, in one answer. */
    @Transactional(readOnly = true)
    public Map<String, Object> schedules(ClinicPrincipal principal) {
        AdminAccess.require(principal, "You cannot open the hours.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        List<Map<String, Object>> items = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (items.size() >= PAGE_SIZE) {
                break;
            }
            items.add(scheduleOf(clinicId, person));
        }
        return AdminEnvelopes.list(items);
    }

    /**
     * Replace the hours and the leave.
     *
     * <p>Both are replaced in the same transaction, so a doctor is never left
     * with half of a week written and half of it not.
     */
    @Transactional
    public Map<String, Object> saveSchedule(
            ClinicPrincipal principal, UUID doctorId, ScheduleRequest request) {
        AdminAccess.require(principal, "You cannot change the hours.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        Staff person =
                staff.findByIdAndClinicId(doctorId, clinicId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "That doctor is not in this clinic."));

        writeSessions(clinicId, doctorId, request.sessions());
        writeLeave(clinicId, doctorId, request.leave());
        return AdminEnvelopes.one(scheduleOf(clinicId, person));
    }

    /**
     * The doctor this clinic already has under an HPR id.
     *
     * <p>This is a within-clinic lookup, not the HPR registry. The registry is
     * a government service that needs its own account and its own client, so
     * it is not connected to this service, and this answer is the clinic's own
     * record: a doctor the clinic has already added under that HPR id. When
     * there is none, the caller is told so and types the details themselves.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> byHpr(ClinicPrincipal principal, String hprId) {
        AdminAccess.require(principal, "You cannot add a doctor.", "doctor", "staff", "settings");
        UUID clinicId = principal.clinicIdAsUuid();

        String wanted = hprId == null ? "" : hprId.replaceAll("\\D", "");
        if (wanted.length() < 10) {
            throw new IllegalArgumentException("An HPR id is fourteen digits.");
        }
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (person.getHprId() == null) {
                continue;
            }
            if (person.getHprId().replaceAll("\\D", "").equals(wanted)) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", person.getId().toString());
                item.put("name", person.getFullName());
                item.put("speciality", blankToEmpty(person.getSpeciality()));
                item.put("registration", blankToEmpty(person.getRegistration()));
                item.put("hprId", person.getHprId());
                item.put("room", blankToEmpty(person.getRoom()));
                item.put("known", true);
                return AdminEnvelopes.one(item);
            }
        }
        throw new NotFoundException(
                "This clinic has no doctor under that HPR id yet. Enter their details yourself.");
    }

    /** One doctor's week and leave. */
    private Map<String, Object> scheduleOf(UUID clinicId, Staff person) {
        List<Map<String, Object>> week = new ArrayList<>();
        for (DoctorSession session :
                sessions.findByClinicIdAndStaffIdOrderByWeekdayAscSessionStartAsc(
                        clinicId, person.getId())) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", session.getId().toString());
            item.put("weekday", session.getWeekday());
            item.put("weekdayLabel", weekdayLabel(session.getWeekday()));
            item.put("start", session.getSessionStart().toString());
            item.put("end", session.getSessionEnd().toString());
            item.put("slotMinutes", session.getSlotMinutes());
            week.add(item);
        }

        List<Map<String, Object>> away = new ArrayList<>();
        for (DoctorLeave row :
                leave.findByClinicIdAndStaffIdOrderByFromDateAsc(clinicId, person.getId())) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.getId().toString());
            item.put("from", row.getFromDate().toString());
            item.put("to", row.getToDate().toString());
            item.put("reason", blankToEmpty(row.getReason()));
            away.add(item);
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("staffId", person.getId().toString());
        item.put("name", person.getFullName());
        item.put("sessions", week);
        item.put("leave", away);
        return item;
    }

    /** Write the week down, replacing what was there. */
    private void writeSessions(UUID clinicId, UUID doctorId, List<SessionRequest> requested) {
        if (requested == null) {
            return;
        }
        sessions.deleteByClinicIdAndStaffId(clinicId, doctorId);
        for (SessionRequest request : requested) {
            DoctorSession session = new DoctorSession();
            session.setId(UUID.randomUUID());
            session.setClinicId(clinicId);
            session.setStaffId(doctorId);
            session.setWeekday(request.weekday());
            session.setSessionStart(LocalTime.parse(request.start()));
            session.setSessionEnd(LocalTime.parse(request.end()));
            session.setSlotMinutes(request.slotMinutes() == null ? 15 : request.slotMinutes());
            session.setActive(true);
            sessions.save(session);
        }
    }

    /** Write the leave down, replacing what was there. */
    private void writeLeave(UUID clinicId, UUID doctorId, List<LeaveRequest> requested) {
        if (requested == null) {
            return;
        }
        leave.deleteByClinicIdAndStaffId(clinicId, doctorId);
        for (LeaveRequest request : requested) {
            DoctorLeave row = new DoctorLeave();
            row.setId(UUID.randomUUID());
            row.setClinicId(clinicId);
            row.setStaffId(doctorId);
            row.setFromDate(LocalDate.parse(request.from()));
            row.setToDate(LocalDate.parse(request.to()));
            row.setReason(blankToNull(request.reason()));
            row.setCreatedAt(Instant.now());
            leave.save(row);
        }
    }

    private static String weekdayLabel(int weekday) {
        if (weekday < 0 || weekday >= WEEKDAYS.length) {
            return "";
        }
        return WEEKDAYS[weekday];
    }

    private static String digits(String mobile) {
        String value = mobile == null ? "" : mobile.replaceAll("\\D", "");
        if (value.length() == 12 && value.startsWith("91")) {
            value = value.substring(2);
        }
        return value;
    }

    private static BigDecimal fee(BigDecimal value, String fallback) {
        if (value == null) {
            return new BigDecimal(fallback);
        }
        return value;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    /** What the doctor is, and where they work. */
    public record DoctorRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Pattern(regexp = "\\d{10}") String mobile,
            @Email @Size(max = 160) String email,
            @Size(max = 120) String speciality,
            @Size(max = 64) String registration,
            @Size(max = 64) String hprId,
            @Size(max = 64) String room,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal consultationFee,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal videoFee,
            List<@Valid SessionRequest> sessions) {}

    /** One session of the week. */
    public record SessionRequest(
            @NotNull @Min(0) @Max(6) Integer weekday,
            @NotBlank @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String start,
            @NotBlank @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String end,
            @Min(5) @Max(120) Integer slotMinutes) {}

    /** A stretch of days the doctor is away. */
    public record LeaveRequest(
            @NotBlank String from,
            @NotBlank String to,
            @Size(max = 200) String reason) {}

    /** The whole week and the whole leave, written at once. */
    public record ScheduleRequest(
            @NotNull List<@Valid SessionRequest> sessions,
            @NotNull List<@Valid LeaveRequest> leave) {}
}
