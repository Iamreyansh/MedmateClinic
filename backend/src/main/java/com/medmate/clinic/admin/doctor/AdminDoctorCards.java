package com.medmate.clinic.admin.doctor;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
import com.medmate.clinic.grant.Role;
import com.medmate.clinic.grant.RoleRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The doctor's card.
 *
 * <p>One place builds it, so the doctors screen and every write that answers
 * with a doctor say the same thing about that doctor: what they are here
 * for, where they work, and how the day is going.
 */
@Service
public class AdminDoctorCards {

    /** The hours the clinic books into. */
    private static final String[] BOOKING_HOURS = {
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
        "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        "18:00", "18:30"
    };

    /** The most doctors one page holds. */
    private static final int MAX_DOCTORS = 100;

    private final RoleRepository roles;
    private final StaffRepository staff;
    private final AppointmentRepository appointments;
    private final VisitRepository visits;

    public AdminDoctorCards(
            RoleRepository roles,
            StaffRepository staff,
            AppointmentRepository appointments,
            VisitRepository visits) {
        this.roles = roles;
        this.staff = staff;
        this.appointments = appointments;
        this.visits = visits;
    }

    /** The clinic's doctors, as the doctors screen reads them. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> cards(ClinicPrincipal principal) {
        UUID clinicId = principal.clinicIdAsUuid();
        Set<UUID> doctorRoles =
                roles.findAll().stream()
                        .filter(role -> role.getClinicId() == null || role.getClinicId().equals(clinicId))
                        .filter(role -> "doctor".equalsIgnoreCase(role.getName()))
                        .map(Role::getId)
                        .collect(Collectors.toSet());

        List<Map<String, Object>> doctors = new ArrayList<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            if (!doctorRoles.contains(person.getRoleId())) {
                continue;
            }
            if (doctors.size() >= MAX_DOCTORS) {
                break;
            }
            doctors.add(card(clinicId, person));
        }
        return doctors;
    }

    /** One doctor, as the doctors screen reads them. */
    @Transactional(readOnly = true)
    public Map<String, Object> card(UUID clinicId, Staff person) {
        ZoneId zone = ZoneId.of("Asia/Kolkata");
        LocalDate today = LocalDate.now(zone);
        Instant from = today.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        int booked = 0;
        for (Appointment appointment :
                appointments.findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
                        clinicId, person.getId(), from, to)) {
            booked++;
        }
        String nextFree = null;
        for (String hour : BOOKING_HOURS) {
            if (nextFree == null && !isBooked(clinicId, person.getId(), hour, zone, today)) {
                nextFree = hour;
            }
        }
        long waiting =
                visits.findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, "in_consult").stream()
                        .filter(visit -> visit.getSeenBy() != null && visit.getSeenBy().equals(person.getId()))
                        .count();

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", person.getId().toString());
        item.put("name", person.getFullName());
        item.put("speciality", person.getSpeciality());
        item.put("room", person.getRoom());
        item.put("registration", person.getRegistration() == null ? "" : person.getRegistration());
        item.put("fee", feeOf(person));
        item.put("videoFee", videoFeeOf(person));
        item.put("hours", BOOKING_HOURS[0] + " – " + BOOKING_HOURS[BOOKING_HOURS.length - 1]);
        item.put("bookedToday", booked);
        item.put("freeToday", BOOKING_HOURS.length - booked);
        item.put("nextFree", nextFree);
        item.put("waiting", waiting);
        return item;
    }

    /** Whether the doctor has an appointment in that hour today. */
    private boolean isBooked(UUID clinicId, UUID doctorId, String hour, ZoneId zone, LocalDate day) {
        LocalTime time = LocalTime.parse(hour);
        Instant start = day.atTime(time).atZone(zone).toInstant();
        Instant end = start.plusSeconds(1800);
        for (Appointment appointment :
                appointments.findByClinicIdAndDoctorIdAndStartsAtBetweenOrderByStartsAtAsc(
                        clinicId, doctorId, start, end)) {
            return true;
        }
        return false;
    }

    /** What the doctor charges in the clinic. */
    private static Object feeOf(Staff person) {
        if (person.getConsultationFee() == null || person.getConsultationFee().signum() <= 0) {
            return 500;
        }
        return person.getConsultationFee().stripTrailingZeros().toPlainString();
    }

    /** What the doctor charges for a video consultation. */
    private static Object videoFeeOf(Staff person) {
        if (person.getVideoFee() == null || person.getVideoFee().signum() <= 0) {
            return 400;
        }
        return person.getVideoFee().stripTrailingZeros().toPlainString();
    }

    /** The visit's doctor, so the callers do not each find it. */
    public static boolean isDoctorOf(Visit visit, UUID doctorId) {
        return visit.getSeenBy() != null && visit.getSeenBy().equals(doctorId);
    }
}
