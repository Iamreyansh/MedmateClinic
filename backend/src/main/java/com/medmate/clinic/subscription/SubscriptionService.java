package com.medmate.clinic.subscription;

import com.medmate.clinic.clinic.ClinicProfile;
import com.medmate.clinic.clinic.ClinicProfileRepository;
import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.prescription.PrescriptionRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.RegistryClinicRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The subscription: the plan the clinic is on, the trial it is in, and what it
 * has used.
 *
 * <p>The usage is the clinic's entitlement: the doctors it has, the locations
 * it runs and the people it employs. It is counted from the clinic's own
 * staff and its own profile, so it moves with the clinic instead of being a
 * number somebody typed.
 */
@Service
public class SubscriptionService {

    private final PrescriptionRepository prescriptions;
    private final RegistryClinicRepository clinics;
    private final StaffRepository staff;
    private final ClinicProfileRepository profiles;
    private final ClinicZoneService zones;

    public SubscriptionService(
            PrescriptionRepository prescriptions,
            RegistryClinicRepository clinics,
            StaffRepository staff,
            ClinicProfileRepository profiles,
            ClinicZoneService zones) {
        this.prescriptions = prescriptions;
        this.clinics = clinics;
        this.staff = staff;
        this.profiles = profiles;
        this.zones = zones;
    }

    /** The plan, the trial and the usage. */
    @Transactional(readOnly = true)
    public Map<String, Object> subscription(ClinicPrincipal principal) {
        if (!principal.can("subscription")) {
            throw new ForbiddenException("You cannot open the subscription.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate today = LocalDate.now(zone);

        // The trial runs for a fortnight from the clinic's first prescription.
        Instant first =
                prescriptions.findByClinicIdOrderByCreatedAtAsc(clinicId).stream()
                        .map(row -> row.getCreatedAt())
                        .filter(java.util.Objects::nonNull)
                        .findFirst()
                        .orElse(today.atStartOfDay(zone).toInstant());
        LocalDate trialEnds = first.atZone(zone).toLocalDate().plusDays(14);
        int daysLeft = (int) java.time.temporal.ChronoUnit.DAYS.between(today, trialEnds);
        String state = daysLeft > 0 ? "trial" : "active";

        // The entitlement model: what the clinic's plan gives it. A clinic
        // counts the doctors it has, the locations it runs and the people it
        // employs — not the prescriptions it wrote last month.
        long doctors = staff.findByClinicId(clinicId).stream()
                .filter(person -> person.getSpeciality() != null && !person.getSpeciality().isBlank())
                .count();
        ClinicProfile profile = profiles.findById(clinicId).orElse(null);
        long locations = Math.max(1, profile == null ? 1 : profile.getLocations());
        long people = staff.findByClinicId(clinicId).size();

        List<Map<String, Object>> usage = new ArrayList<>();
        usage.add(usageRow("Doctors", doctors, 10));
        usage.add(usageRow("Locations", locations, 5));
        usage.add(usageRow("Staff", people, 50));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("state", state);
        body.put("planName", "Clinic");
        body.put("planId", "clinic");
        body.put("trialDaysLeft", Math.max(0, daysLeft));
        body.put("trialEndsOn", trialEnds.toString());
        body.put("renewalOn", state.equals("trial") ? null : trialEnds.plusYears(1).toString());
        body.put("usage", usage);
        body.put("plans", plans());
        body.put("lastPayment", null);
        body.put(
                "clinic",
                Map.of(
                        "name",
                        clinics.findById(clinicId)
                                .map(clinic -> clinic.getName())
                                .orElse("MedMate Clinic"),
                        "email",
                        ""));
        return body;
    }

    /** One row of the usage panel. */
    private Map<String, Object> usageRow(String label, long used, long limit) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("label", label);
        row.put("used", used);
        row.put("limit", limit);
        return row;
    }

    /** The plans the clinic can move between. */
    private List<Map<String, Object>> plans() {
        List<Map<String, Object>> plans = new ArrayList<>();
        plans.add(
                plan(
                        "solo",
                        "Solo",
                        new BigDecimal("2499"),
                        "One doctor, one location, everything the doctor needs.",
                        List.of("Unlimited prescriptions", "SMS and ABHA delivery", "Daily backup"),
                        List.of("Multiple doctors", "The lab and the kiosk")));
        plans.add(
                plan(
                        "clinic",
                        "Clinic",
                        new BigDecimal("4999"),
                        "The whole clinic — desk, till, lab, kiosk and every doctor.",
                        List.of(
                                "Everything in Solo",
                                "Billing and the point of sale",
                                "The lab, the kiosk and the nurse station",
                                "Reports and the audit log"),
                        List.of()));
        plans.add(
                plan(
                        "enterprise",
                        "Enterprise",
                        BigDecimal.ZERO,
                        "Several locations, so the price is worked out for the shape of it.",
                        List.of("Everything in Clinic", "Multiple locations", "A named account manager"),
                        List.of()));
        return plans;
    }

    /** One plan, as the screen shows it. */
    private Map<String, Object> plan(
            String id,
            String name,
            BigDecimal price,
            String summary,
            List<String> includes,
            List<String> avoids) {
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("id", id);
        plan.put("name", name);
        plan.put("price", price);
        plan.put("summary", summary);
        plan.put("includes", includes);
        plan.put("avoids", avoids);
        return plan;
    }
}

