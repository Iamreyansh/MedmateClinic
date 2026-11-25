package com.medmate.clinic.desk;

import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
import com.medmate.clinic.common.ClinicZoneService;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.handover.Handover;
import com.medmate.clinic.handover.HandoverRepository;
import com.medmate.clinic.invoice.Invoice;
import com.medmate.clinic.invoice.InvoiceRepository;
import com.medmate.clinic.lab.LabOrder;
import com.medmate.clinic.lab.LabOrderRepository;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.prescription.Prescription;
import com.medmate.clinic.prescription.PrescriptionRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The reception desk: what is waiting to be handed to the patient.
 *
 * <p>When a doctor signs a prescription the visit becomes something the front
 * desk has to act on — print it, take the money, book the follow-up, say
 * whether a sample has to be given. The desk lists today's visits in that
 * state, and checking one out closes the hand-over.
 *
 * <p>The three numbers at the top are counted from the clinic's own visits, so
 * they move the moment a doctor signs.
 */
@Service
public class DeskService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM");

    private final VisitRepository visits;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final PrescriptionRepository prescriptions;
    private final InvoiceRepository invoices;
    private final AppointmentRepository appointments;
    private final com.medmate.clinic.billing.BillingService billing;
    private final LabOrderRepository labOrders;
    private final HandoverRepository handovers;
    private final com.medmate.clinic.tenancy.RegistryClinicRepository clinics;
    private final ClinicZoneService zones;

    public DeskService(
            VisitRepository visits,
            PatientRepository patients,
            StaffRepository staff,
            PrescriptionRepository prescriptions,
            InvoiceRepository invoices,
            AppointmentRepository appointments,
            LabOrderRepository labOrders,
            HandoverRepository handovers,
            com.medmate.clinic.tenancy.RegistryClinicRepository clinics,
            com.medmate.clinic.billing.BillingService billing,
            ClinicZoneService zones) {
        this.visits = visits;
        this.patients = patients;
        this.staff = staff;
        this.prescriptions = prescriptions;
        this.invoices = invoices;
        this.appointments = appointments;
        this.labOrders = labOrders;
        this.handovers = handovers;
        this.clinics = clinics;
        this.billing = billing;
        this.zones = zones;
    }

    /** The desk, as it stands right now. */
    @Transactional(readOnly = true)
    public Map<String, Object> desk(ClinicPrincipal principal) {
        if (!principal.can("desk")) {
            throw new ForbiddenException("You cannot open the reception desk.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        ZoneId zone = zones.zoneOf(clinicId);
        LocalDate today = LocalDate.now(zone);
        Instant from = today.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<Visit> todays = visits.findByClinicIdAndCreatedAtBetweenOrderByCreatedAtAsc(clinicId, from, to);
        Map<UUID, Patient> people = patientsById(todays);
        Map<UUID, Staff> peopleOnStaff = staffById(clinicId);
        Map<UUID, List<Prescription>> byVisit = prescriptionsByVisit(clinicId, todays);
        Map<UUID, Invoice> invoiceByVisit = invoicesByVisit(clinicId, todays);
        Map<UUID, List<LabOrder>> labsByVisit = labsByVisit(clinicId, todays);
        Map<UUID, Appointment> followUpByVisit = followUpsByVisit(clinicId, todays);
        Map<UUID, Handover> closedHandovers = closedHandovers(clinicId, todays);

        List<Map<String, Object>> items = new ArrayList<>();
        int toHandOver = 0;
        int waiting = 0;
        int done = 0;

        Invoice firstInvoice = null;
        for (Visit visit : todays) {
            Prescription prescription = latest(byVisit.get(visit.getId()));
            boolean signed = prescription != null && "signed".equals(prescription.getStatus());
            boolean handedOver = closedHandovers.containsKey(visit.getId());
            Invoice invoice = invoiceByVisit.get(visit.getId());
            Appointment followUp = followUpByVisit.get(visit.getId());
            List<LabOrder> labs = labsByVisit.getOrDefault(visit.getId(), List.of());

            String state;
            if (handedOver) {
                state = "handed_over";
                done++;
            } else if (signed) {
                state = "to_hand_over";
                toHandOver++;
            } else {
                state = "waiting";
                waiting++;
            }

            if (firstInvoice == null) {
                firstInvoice = invoice;
            }
            Patient patient = people.get(visit.getPatientId());
            Staff doctor = visit.getSeenBy() == null ? null : peopleOnStaff.get(visit.getSeenBy());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", visit.getId().toString());
            item.put("visitId", visit.getId().toString());
            item.put("token", visit.getToken());
            item.put("kind", visit.getToken().split("-")[0]);
            item.put("state", state);
            item.put("status", visit.getStatus());
            item.put("reason", visit.getReason());
            item.put("waitedMinutes", visit.getWaitedMinutes());
            item.put("checkedOut", handedOver);
            item.put("patient", patientCard(patient));
            item.put(
                    "doctor",
                    doctor == null
                            ? null
                            : Map.of(
                                    "id", doctor.getId().toString(),
                                    "name", doctor.getFullName(),
                                    "speciality", doctor.getSpeciality() == null ? "" : doctor.getSpeciality()));
            item.put("prescription", prescriptionCard(prescription));
            item.put("payment", paymentCard(invoice));
            item.put("followUp", followUpCard(followUp, zone));
            item.put("lab", labCard(labs));
            items.add(item);
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("toHandOver", toHandOver);
        counts.put("waiting", waiting);
        counts.put("doneToday", done);

        // The bill of the day: the desk takes the money for it, so the card
        // travels with the list.
        Map<String, Object> bill = null;
        if (firstInvoice != null) {
            bill = billing.billCard(clinicId, firstInvoice, zone);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("counts", counts);
        // The canonical key is visits; items is kept as an alias so a screen
        // that was written against the older name keeps working.
        body.put("visits", items);
        body.put("items", items);
        body.put(
                "meta",
                "Patients also get the prescription by SMS. Print the paper copy at the hand-over.");
        body.put("invoice", bill);
        body.put("lines", bill == null ? List.of() : bill.get("lines"));
        body.put("gst", java.math.BigDecimal.ZERO);
        body.put("total", bill == null ? java.math.BigDecimal.ZERO : bill.get("total"));
        return body;
    }

    /** Close the hand-over: the patient has the prescription and the bill. */
    @Transactional
    public Map<String, Object> checkOut(ClinicPrincipal principal, String visitId) {
        if (!principal.can("desk")) {
            throw new ForbiddenException("You cannot open the reception desk.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        UUID id = parseUuid(visitId);
        Visit visit =
                visits.findByIdAndClinicId(id, clinicId)
                        .orElseThrow(() -> new NotFoundException("That visit is not in this clinic."));

        boolean already =
                handovers.findByClinicIdAndPatientIdOrderByCreatedAtDesc(clinicId, visit.getPatientId())
                        .stream()
                        .anyMatch(
                                handover ->
                                        id.equals(handover.getVisitId())
                                                && "closed".equals(handover.getStatus()));
        if (!already) {
            Handover handover = new Handover();
            handover.setId(UUID.randomUUID());
            handover.setClinicId(clinicId);
            handover.setVisitId(visit.getId());
            handover.setPatientId(visit.getPatientId());
            handover.setFromStaffId(visit.getSeenBy());
            handover.setToStaffId(principal.staffIdAsUuid());
            handover.setStatus("closed");
            handover.setNote("Handed over at the reception desk");
            handover.setCreatedAt(Instant.now());
            handovers.save(handover);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visitId", visit.getId().toString());
        body.put("checkedOut", true);
        return body;
    }

    /**
     * The clinic's public booking link.
     *
     * <p>The address a patient books on. It is the clinic's own link, so the
     * patient reaches the right clinic without the desk spelling it out.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> bookingLink(ClinicPrincipal principal) {
        if (!principal.can("desk")) {
            throw new ForbiddenException("You cannot open the reception desk.");
        }
        UUID clinicId = principal.clinicIdAsUuid();
        String name = clinicName(clinicId);
        String slug = slugOf(name);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("link", "https://medmate.in/book?clinic=" + slug);
        body.put("slug", slug);
        body.put("clinic", name);
        body.put("channels", List.of("sms", "whatsapp", "copy"));
        return body;
    }

    /** The clinic's name, for the link the patient is sent to. */
    private String clinicName(UUID clinicId) {
        return clinics.findById(clinicId)
                .map(com.medmate.clinic.tenancy.RegistryClinic::getName)
                .orElse("MedMate Clinic");
    }

    /** The clinic's slug, for the link the patient is sent to. */
    private String slugOf(String name) {
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "medmate-clinic" : slug;
    }

    // ---------------------------------------------------------------- pieces

    private Map<String, Object> patientCard(Patient patient) {
        Map<String, Object> card = new LinkedHashMap<>();
        if (patient == null) {
            return card;
        }
        card.put("id", patient.getId().toString());
        card.put("name", patient.getFullName());
        card.put("age", patient.getAge());
        card.put("sex", patient.getSex());
        card.put("initials", initials(patient.getFullName()));
        card.put("phone", patient.getPhone() == null ? "" : patient.getPhone());
        return card;
    }

    private Map<String, Object> prescriptionCard(Prescription prescription) {
        Map<String, Object> card = new LinkedHashMap<>();
        if (prescription == null) {
            card.put("status", "none");
            return card;
        }
        card.put("id", prescription.getId().toString());
        card.put("status", prescription.getStatus());
        card.put("signedAt", prescription.getSignedAt() == null ? null : prescription.getSignedAt().toString());
        return card;
    }

    private Map<String, Object> paymentCard(Invoice invoice) {
        Map<String, Object> card = new LinkedHashMap<>();
        if (invoice == null) {
            card.put("status", "none");
            card.put("amount", BigDecimal.ZERO);
            return card;
        }
        card.put("invoiceId", invoice.getId().toString());
        card.put("number", invoice.getNumber());
        card.put("status", invoice.getStatus());
        card.put("amount", invoice.getTotal());
        card.put("payMode", invoice.getPayMode());
        return card;
    }

    private Map<String, Object> followUpCard(Appointment appointment, ZoneId zone) {
        if (appointment == null) {
            return null;
        }
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", appointment.getId().toString());
        card.put("startsAt", appointment.getStartsAt().toString());
        card.put("mode", appointment.getMode());
        card.put("status", appointment.getStatus());
        card.put(
                "label",
                "Book "
                        + appointment.getStartsAt().atZone(zone).format(DAY)
                        + " · "
                        + appointment.getStartsAt().atZone(zone).format(TIME));
        return card;
    }

    private Map<String, Object> labCard(List<LabOrder> labs) {
        if (labs.isEmpty()) {
            return null;
        }
        LabOrder first = labs.get(0);
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", first.getId().toString());
        card.put("name", first.getTestName());
        card.put("status", first.getStatus());
        card.put("count", labs.size());
        card.put("label", first.getTestName() + (labs.size() > 1 ? " +" + (labs.size() - 1) : "") + " sample");
        return card;
    }

    // -------------------------------------------------------------- lookups

    private Map<UUID, Patient> patientsById(List<Visit> todays) {
        Map<UUID, Patient> map = new HashMap<>();
        for (Visit visit : todays) {
            if (visit.getPatientId() == null || map.containsKey(visit.getPatientId())) {
                continue;
            }
            patients.findById(visit.getPatientId()).ifPresent(patient -> map.put(patient.getId(), patient));
        }
        return map;
    }

    private Map<UUID, Staff> staffById(UUID clinicId) {
        Map<UUID, Staff> map = new HashMap<>();
        for (Staff person : staff.findByClinicId(clinicId)) {
            map.put(person.getId(), person);
        }
        return map;
    }

    private Map<UUID, List<Prescription>> prescriptionsByVisit(UUID clinicId, List<Visit> todays) {
        Map<UUID, List<Prescription>> map = new HashMap<>();
        for (Visit visit : todays) {
            map.put(
                    visit.getId(),
                    prescriptions.findByClinicIdAndVisitIdOrderByCreatedAtDesc(clinicId, visit.getId()));
        }
        return map;
    }

    private Map<UUID, Invoice> invoicesByVisit(UUID clinicId, List<Visit> todays) {
        Map<UUID, Invoice> map = new HashMap<>();
        for (Visit visit : todays) {
            Optional<Invoice> invoice =
                    invoices.findFirstByClinicIdAndVisitIdAndStatus(clinicId, visit.getId(), "unpaid");
            invoice.ifPresent(value -> map.put(visit.getId(), value));
            if (!invoice.isPresent()) {
                invoices.findFirstByClinicIdAndVisitIdAndStatus(clinicId, visit.getId(), "paid")
                        .ifPresent(value -> map.put(visit.getId(), value));
            }
        }
        return map;
    }

    private Map<UUID, List<LabOrder>> labsByVisit(UUID clinicId, List<Visit> todays) {
        Map<UUID, List<LabOrder>> map = new HashMap<>();
        for (Visit visit : todays) {
            map.put(visit.getId(), labOrders.findByClinicIdAndVisitIdOrderByOrderedAtAsc(clinicId, visit.getId()));
        }
        return map;
    }

    private Map<UUID, Appointment> followUpsByVisit(UUID clinicId, List<Visit> todays) {
        Map<UUID, Appointment> map = new HashMap<>();
        Instant now = Instant.now();
        for (Visit visit : todays) {
            List<Appointment> forVisit =
                    appointments.findByClinicIdAndStartsAtBetweenOrderByStartsAtAsc(
                            clinicId, now.minusSeconds(86_400 * 30), now.plusSeconds(86_400 * 365));
            for (Appointment appointment : forVisit) {
                if (visit.getId().equals(appointment.getVisitId())) {
                    map.put(visit.getId(), appointment);
                }
            }
        }
        return map;
    }

    private Map<UUID, Handover> closedHandovers(UUID clinicId, List<Visit> todays) {
        Map<UUID, Handover> map = new HashMap<>();
        for (Handover handover : handovers.findByClinicIdAndStatusOrderByCreatedAtDesc(clinicId, "closed")) {
            if (handover.getVisitId() != null) {
                map.put(handover.getVisitId(), handover);
            }
        }
        return map;
    }

    private static Prescription latest(List<Prescription> list) {
        return list == null || list.isEmpty() ? null : list.get(0);
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

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException notAUuid) {
            throw new NotFoundException("That visit is not in this clinic.");
        }
    }
}
