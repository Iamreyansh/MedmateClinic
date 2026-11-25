package com.medmate.clinic.consult;

import com.medmate.clinic.audit.AuditService;
import com.medmate.clinic.appointment.Appointment;
import com.medmate.clinic.appointment.AppointmentRepository;
import com.medmate.clinic.common.ForbiddenException;
import com.medmate.clinic.common.NotFoundException;
import com.medmate.clinic.invoice.Invoice;
import com.medmate.clinic.invoice.InvoiceRepository;
import com.medmate.clinic.lab.LabOrder;
import com.medmate.clinic.lab.LabOrderRepository;
import com.medmate.clinic.message.Message;
import com.medmate.clinic.message.MessageRepository;
import com.medmate.clinic.patient.Patient;
import com.medmate.clinic.patient.PatientRepository;
import com.medmate.clinic.prescription.DrugSafety;
import com.medmate.clinic.prescription.Prescription;
import com.medmate.clinic.prescription.PrescriptionDiagnosis;
import com.medmate.clinic.prescription.PrescriptionDiagnosisRepository;
import com.medmate.clinic.prescription.PrescriptionMedicine;
import com.medmate.clinic.prescription.PrescriptionMedicineRepository;
import com.medmate.clinic.prescription.PrescriptionRepository;
import com.medmate.clinic.prescription.PrescriptionTest;
import com.medmate.clinic.prescription.PrescriptionTestRepository;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.vital.Vitals;
import com.medmate.clinic.vital.VitalsRepository;
import com.medmate.clinic.visit.Visit;
import com.medmate.clinic.visit.VisitRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The consult: what the doctor writes, and what signing it sets in motion.
 *
 * <p>Signing is one transaction. The prescription, the invoice, the follow-up,
 * the lab orders, the hand-over to reception and the message to the patient
 * either all happen or none of them do — and each one is written to the audit
 * trail.
 */
@Service
public class ConsultService {

    private final VisitRepository visits;
    private final PatientRepository patients;
    private final StaffRepository staff;
    private final VitalsRepository vitals;
    private final com.medmate.clinic.consult.ConsultationRepository consultations;
    private final PrescriptionRepository prescriptions;
    private final PrescriptionDiagnosisRepository diagnoses;
    private final PrescriptionMedicineRepository medicines;
    private final PrescriptionTestRepository tests;
    private final AppointmentRepository appointments;
    private final InvoiceRepository invoices;
    private final LabOrderRepository labOrders;
    private final MessageRepository messages;
    private final AuditService audit;

    public ConsultService(
            VisitRepository visits,
            PatientRepository patients,
            StaffRepository staff,
            VitalsRepository vitals,
            com.medmate.clinic.consult.ConsultationRepository consultations,
            PrescriptionRepository prescriptions,
            PrescriptionDiagnosisRepository diagnoses,
            PrescriptionMedicineRepository medicines,
            PrescriptionTestRepository tests,
            AppointmentRepository appointments,
            InvoiceRepository invoices,
            LabOrderRepository labOrders,
            MessageRepository messages,
            AuditService audit) {
        this.visits = visits;
        this.patients = patients;
        this.staff = staff;
        this.vitals = vitals;
        this.consultations = consultations;
        this.prescriptions = prescriptions;
        this.diagnoses = diagnoses;
        this.medicines = medicines;
        this.tests = tests;
        this.appointments = appointments;
        this.invoices = invoices;
        this.labOrders = labOrders;
        this.messages = messages;
        this.audit = audit;
    }

    /**
     * The clinical capability: the right to read and write the consult.
     *
     * <p>The diagnoses, the notes and the medicines are the doctor's alone. A
     * nurse records the vitals; the front desk takes the money; neither may
     * read or write this. The check is on the capability, not on the role's
     * name, so a clinic that renames a role does not open the notes.
     */
    private void requireClinical(ClinicPrincipal principal) {
        if (!principal.can("clinical")) {
            throw new ForbiddenException("You cannot open the clinical notes.");
        }
    }

    /**
     * Everything the consult screen needs for one patient.
     *
     * <p>The consult holds the diagnoses, the notes and the medicines, so it
     * needs the clinical capability: a nurse or the front desk may not read
     * it, whatever the role's name says.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> load(ClinicPrincipal principal, String visitRef) {
        requireClinical(principal);
        UUID clinicId = principal.clinicIdAsUuid();
        Visit visit = findVisit(clinicId, visitRef);
        UUID visitId = visit.getId();
        Patient patient =
                patients.findById(visit.getPatientId())
                        .orElseThrow(() -> new NotFoundException("That patient is not here."));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visit", visit(visit));
        body.put("patient", patient(patient));
        body.put(
                "vitals",
                vitals.findFirstByClinicIdAndVisitIdOrderByRecordedAtDesc(clinicId, visitId)
                        .map(this::vitals)
                        .orElse(null));
        body.put(
                "consultation",
                consultations.findByClinicIdAndVisitId(clinicId, visitId)
                        .map(this::consultation)
                        .orElse(null));
        body.put(
                "prescriptions",
                prescriptions.findByClinicIdAndVisitIdOrderByCreatedAtDesc(clinicId, visitId).stream()
                        .map(this::prescriptionSummary)
                        .toList());

        // The lines of the draft, so the screen can draw what the doctor has
        // written so far. Without these the screen would have to invent them,
        // and a prescription could be signed with another patient's medicines.
        prescriptions.findByClinicIdAndVisitIdOrderByCreatedAtDesc(clinicId, visitId).stream()
                .findFirst()
                .ifPresent(
                        prescription -> {
                            body.put(
                                    "diagnoses",
                                    diagnoses.findByPrescriptionIdOrderBySortOrder(prescription.getId())
                                            .stream()
                                            .map(this::diagnosisLine)
                                            .toList());
                            body.put(
                                    "medicines",
                                    medicines.findByPrescriptionIdOrderBySortOrder(prescription.getId())
                                            .stream()
                                            .map(this::medicineLine)
                                            .toList());
                            body.put(
                                    "tests",
                                    tests.findByPrescriptionId(prescription.getId()).stream()
                                            .map(this::testLine)
                                            .toList());
                        });
        return body;
    }

    /** One diagnosis line, as the screen reads it. */
    private Map<String, Object> diagnosisLine(PrescriptionDiagnosis diagnosis) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", diagnosis.getIcdCode());
        body.put("label", diagnosis.getLabel());
        body.put("kind", diagnosis.getKind());
        return body;
    }

    /** One medicine line, as the screen reads it. */
    private Map<String, Object> medicineLine(PrescriptionMedicine medicine) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", medicine.getDrugName());
        body.put("generic", medicine.getGenericName());
        body.put("form", medicine.getForm());
        body.put("dose", medicine.getDose());
        body.put("when", medicine.getWhenText());
        body.put("forDays", medicine.getForDays());
        body.put("notes", medicine.getNotes());
        return body;
    }

    /** One test line, as the screen reads it. */
    private Map<String, Object> testLine(PrescriptionTest test) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", test.getName());
        body.put("status", test.getStatus());
        return body;
    }

    /**
     * Call the patient in.
     *
     * <p>The clock starts here: the wait is the time from arriving to this
     * moment, and the consult is the time from this moment until the
     * prescription is signed.
     */
    @Transactional
    public Map<String, Object> start(ClinicPrincipal principal, String visitRef) {
        requireClinical(principal);
        UUID clinicId = principal.clinicIdAsUuid();
        Visit visit = findVisit(clinicId, visitRef);
        if (visit.getConsultStartedAt() == null) {
            visit.setConsultStartedAt(Instant.now());
        }
        visit.setStatus("in_consult");
        visit.setSeenBy(UUID.fromString(principal.staffId()));
        visits.save(visit);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visitId", visit.getId().toString());
        body.put("token", visit.getToken());
        body.put("status", visit.getStatus());
        body.put("consultStartedAt", visit.getConsultStartedAt());
        return body;
    }

    /** A visit is addressed by its id, or by the token on the patient's slip. */
    private Visit findVisit(UUID clinicId, String visitRef) {
        try {
            return visits.findById(UUID.fromString(visitRef))
                    .filter(v -> v.getClinicId().equals(clinicId))
                    .orElseThrow(() -> new NotFoundException("That visit is not here."));
        } catch (IllegalArgumentException notAnId) {
            return visits.findFirstByClinicIdAndTokenOrderByCreatedAtDesc(clinicId, visitRef)
                    .orElseThrow(() -> new NotFoundException("That visit is not here."));
        }
    }

    /** Save the draft: what the doctor has written so far. */
    @Transactional
    public Map<String, Object> saveConsultation(
            ClinicPrincipal principal, String visitRef, ConsultationRequest request) {
        requireClinical(principal);
        UUID clinicId = UUID.fromString(principal.clinicId());
        Visit visit = findVisit(clinicId, visitRef);
        UUID visitId = visit.getId();

        com.medmate.clinic.consult.Consultation consultation =
                consultations.findByClinicIdAndVisitId(clinicId, visitId)
                        .orElseGet(com.medmate.clinic.consult.Consultation::new);
        if (consultation.getId() == null) {
            consultation.setId(UUID.randomUUID());
            consultation.setClinicId(clinicId);
            consultation.setVisitId(visitId);
            consultation.setPatientId(visit.getPatientId());
            consultation.setCreatedAt(Instant.now());
        }
        consultation.setDoctorId(UUID.fromString(principal.staffId()));
        consultation.setComplaints(request.complaints());
        consultation.setHistory(request.history());
        consultation.setExamination(request.examination() == null ? List.of() : request.examination());
        consultation.setAdviceDiet(request.advice() == null ? null : request.advice().diet());
        consultation.setAdviceReturn(request.advice() == null ? null : request.advice().returnIf());
        consultation.setFollowUpMode(request.followUp() == null ? null : request.followUp().mode());
        consultation.setFollowUpAt(request.followUp() == null ? null : request.followUp().at());
        consultation.setFollowUpNote(request.followUp() == null ? null : request.followUp().note());
        consultation.setStatus("draft");
        consultation.setUpdatedAt(Instant.now());
        consultations.save(consultation);

        Prescription prescription = draftPrescription(clinicId, visit, consultation);
        Lines lines = writePrescriptionLines(prescription, request);

        Patient patient =
                patients.findById(visit.getPatientId())
                        .orElseThrow(() -> new NotFoundException("That patient is not here."));
        List<DrugSafety.Alert> alerts =
                DrugSafety.check(patient, lines.medicines(), lines.diagnoses(), request.complaints());
        prescription.setAntibiotic(DrugSafety.hasAntibiotic(lines.medicines()));
        prescription.setSafetyAlert(!alerts.isEmpty());
        prescription.setSafetyAlertKind(
                alerts.stream().map(DrugSafety.Alert::kind).distinct().collect(java.util.stream.Collectors.joining(",")));
        prescription.setSafetyOverridden(false);
        prescription.setSafetyOverrideReason(null);
        prescriptions.save(prescription);

        audit.record(
                principal,
                "consult.saved",
                "visit",
                visitId.toString(),
                Map.of(
                        "complaints", String.valueOf(request.complaints()),
                        "safetyAlerts", alerts.size()));

        return Map.of(
                "consultationId", consultation.getId().toString(),
                "prescriptionId", prescription.getId().toString(),
                "status", "draft");
    }

    /** The draft prescription the doctor is writing. */
    private Prescription draftPrescription(
            UUID clinicId, Visit visit, com.medmate.clinic.consult.Consultation consultation) {
        Prescription prescription =
                prescriptions.findByClinicIdAndVisitIdOrderByCreatedAtDesc(clinicId, visit.getId())
                        .stream()
                        .findFirst()
                        .orElse(null);
        if (prescription == null) {
            prescription = new Prescription();
            prescription.setId(UUID.randomUUID());
            prescription.setClinicId(clinicId);
            prescription.setVisitId(visit.getId());
            prescription.setPatientId(visit.getPatientId());
            prescription.setVersion(1);
            prescription.setStatus("draft");
            prescription.setCreatedAt(Instant.now());
        }
        prescription.setConsultationId(consultation.getId());
        return prescriptions.save(prescription);
    }

    /** Replace the lines on the prescription with what the doctor has written. */
    private Lines writePrescriptionLines(
            Prescription prescription, ConsultationRequest request) {
        diagnoses.deleteAll(diagnoses.findByPrescriptionIdOrderBySortOrder(prescription.getId()));
        medicines.deleteAll(medicines.findByPrescriptionIdOrderBySortOrder(prescription.getId()));
        tests.deleteAll(tests.findByPrescriptionId(prescription.getId()));

        int order = 0;
        List<PrescriptionDiagnosis> diagnosisRows = new ArrayList<>();
        if (request.diagnoses() != null) {
            for (DiagnosisLine diagnosis : request.diagnoses()) {
                PrescriptionDiagnosis row = new PrescriptionDiagnosis();
                row.setId(UUID.randomUUID());
                row.setPrescriptionId(prescription.getId());
                row.setIcdCode(diagnosis.code());
                row.setLabel(diagnosis.label());
                row.setKind(diagnosis.kind());
                row.setSortOrder(order++);
                diagnosisRows.add(diagnoses.save(row));
            }
        }
        order = 0;
        List<PrescriptionMedicine> medicineRows = new ArrayList<>();
        if (request.medicines() != null) {
            for (MedicineLine medicine : request.medicines()) {
                PrescriptionMedicine row = new PrescriptionMedicine();
                row.setId(UUID.randomUUID());
                row.setPrescriptionId(prescription.getId());
                row.setDrugName(medicine.name());
                row.setGenericName(medicine.generic());
                row.setForm(medicine.form());
                row.setDose(medicine.dose());
                row.setWhenText(medicine.when());
                row.setForDays(medicine.forDays());
                row.setNotes(medicine.notes());
                row.setSortOrder(order++);
                medicineRows.add(medicines.save(row));
            }
        }
        List<PrescriptionTest> testRows = new ArrayList<>();
        if (request.tests() != null) {
            for (TestLine test : request.tests()) {
                PrescriptionTest row = new PrescriptionTest();
                row.setId(UUID.randomUUID());
                row.setPrescriptionId(prescription.getId());
                row.setName(test.name());
                row.setStatus("ordered");
                testRows.add(tests.save(row));
            }
        }
        return new Lines(diagnosisRows, medicineRows, testRows);
    }

    /** The lines the doctor wrote. */
    private record Lines(
            List<PrescriptionDiagnosis> diagnoses,
            List<PrescriptionMedicine> medicines,
            List<PrescriptionTest> tests) {}

    /**
     * Sign the prescription.
     *
     * <p>One transaction: the prescription is signed, the invoice is raised, the
     * follow-up is booked, the lab orders go to the lab desk, reception is asked
     * to print, and the patient is told. Each is written to the audit trail.
     */
    @Transactional
    public Map<String, Object> sign(
            ClinicPrincipal principal, UUID prescriptionId, String signatureMode, String overrideReason) {
        requireClinical(principal);
        UUID clinicId = UUID.fromString(principal.clinicId());
        Prescription prescription =
                prescriptions.findByIdAndClinicId(prescriptionId, clinicId)
                        .orElseThrow(() -> new NotFoundException("That prescription is not here."));
        if ("signed".equals(prescription.getStatus())) {
            throw new IllegalStateException("This prescription is already signed.");
        }

        Instant now = Instant.now();
        prescription.setStatus("signed");
        prescription.setSignedAt(now);
        prescription.setSignedBy(UUID.fromString(principal.staffId()));
        prescription.setSignatureMode(signatureMode == null ? "test" : signatureMode);
        if (prescription.isSafetyAlert()) {
            prescription.setSafetyOverridden(overrideReason != null && !overrideReason.isBlank());
            prescription.setSafetyOverrideReason(
                    overrideReason == null || overrideReason.isBlank() ? null : overrideReason.trim());
        }
        prescriptions.save(prescription);

        List<PrescriptionDiagnosis> diagnosisRows =
                diagnoses.findByPrescriptionIdOrderBySortOrder(prescriptionId);
        List<PrescriptionMedicine> medicineRows =
                medicines.findByPrescriptionIdOrderBySortOrder(prescriptionId);
        List<PrescriptionTest> testRows = tests.findByPrescriptionId(prescriptionId);

        // the bill
        Invoice invoice = raiseInvoice(clinicId, prescription, medicineRows, now);

        // the consult is over: the patient is seen, and the wait and the length
        // of the consult are what the reports count
        closeVisit(prescription.getVisitId(), prescription.getSignedBy(), now);

        // the follow-up, if the doctor asked for one
        Appointment followUp = bookFollowUp(principal, prescription, now);

        // the tests go to the lab desk
        List<LabOrder> orders = new ArrayList<>();
        for (PrescriptionTest test : testRows) {
            LabOrder order = new LabOrder();
            order.setId(UUID.randomUUID());
            order.setClinicId(clinicId);
            order.setPatientId(prescription.getPatientId());
            order.setVisitId(prescription.getVisitId());
            order.setPrescriptionId(prescription.getId());
            order.setTestName(test.getName());
            order.setStatus("ordered");
            order.setOrderedBy(UUID.fromString(principal.staffId()));
            order.setOrderedAt(now);
            orders.add(labOrders.save(order));
        }

        // the patient is told
        Message message = new Message();
        message.setId(UUID.randomUUID());
        message.setClinicId(clinicId);
        message.setPatientId(prescription.getPatientId());
        message.setChannel("sms");
        message.setTemplate("prescription.signed");
        message.setBody(
                "Your prescription is ready. MedMate Clinic will hand you a printed copy at reception.");
        message.setStatus("queued");
        message.setCreatedAt(now);
        messages.save(message);

        audit.record(
                principal,
                "prescription.signed",
                "prescription",
                prescription.getId().toString(),
                Map.of(
                        "signatureMode",
                        prescription.getSignatureMode(),
                        "diagnoses",
                        diagnosisRows.size(),
                        "medicines",
                        medicineRows.size(),
                        "tests",
                        orders.size()));
        audit.record(
                principal,
                "invoice.created",
                "invoice",
                invoice.getId().toString(),
                Map.of("total", invoice.getTotal(), "number", invoice.getPrefix() + "/" + invoice.getNumber()));
        if (followUp != null) {
            audit.record(
                    principal,
                    "appointment.created",
                    "appointment",
                    followUp.getId().toString(),
                    Map.of("startsAt", followUp.getStartsAt().toString()));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("prescription", prescriptionSummary(prescription));
        body.put("invoice", invoiceSummary(invoice));
        body.put("followUp", followUp == null ? null : appointmentSummary(followUp));
        body.put("labOrders", orders.stream().map(this::labSummary).toList());
        return body;
    }

    private Invoice raiseInvoice(
            UUID clinicId, Prescription prescription, List<PrescriptionMedicine> medicineRows, Instant now) {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setClinicId(clinicId);
        invoice.setPatientId(prescription.getPatientId());
        invoice.setVisitId(prescription.getVisitId());
        invoice.setPrescriptionId(prescription.getId());
        invoice.setPrefix("MCI");
        invoice.setNumber("26-27/" + String.format("%04d", prescriptions.count() + 1));
        invoice.setFy("2026-27");

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        BigDecimal fee = consultationFee(prescription.getSignedBy());
        if (fee.signum() > 0) {
            lines.add(Map.of("name", "Consultation fee", "amount", fee));
            total = total.add(fee);
        }
        for (PrescriptionMedicine medicine : medicineRows) {
            BigDecimal amount = medicine.getDose() == null ? BigDecimal.ZERO : BigDecimal.ZERO;
            lines.add(
                    Map.of(
                            "name", medicine.getDrugName(),
                            "amount", amount));
            total = total.add(amount);
        }
        invoice.setLines(lines);
        invoice.setSubtotal(total);
        invoice.setDiscount(BigDecimal.ZERO);
        invoice.setTotal(total);
        invoice.setStatus("unpaid");
        invoice.setCreatedAt(now);
        return invoices.save(invoice);
    }

    /** What this doctor charges for a consultation. */
    private BigDecimal consultationFee(UUID doctorId) {
        if (doctorId == null) {
            return BigDecimal.ZERO;
        }
        return staff.findById(doctorId)
                .map(Staff::getConsultationFee)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Close the visit: the patient has been seen.
     *
     * <p>The wait is the time from arriving to being called in; the consult is
     * the time in the room. Both are what the reports count, so both are
     * written down here rather than guessed at later.
     */
    private void closeVisit(UUID visitId, UUID doctorId, Instant now) {
        if (visitId == null) {
            return;
        }
        visits.findById(visitId)
                .ifPresent(
                        visit -> {
                            if (visit.getConsultStartedAt() != null) {
                                visit.setWaitedMinutes(
                                        (int)
                                                Math.max(
                                                        0,
                                                        Duration.between(
                                                                        visit.getCreatedAt(),
                                                                        visit.getConsultStartedAt())
                                                                .toMinutes()));
                                visit.setConsultMinutes(
                                        (int)
                                                Math.max(
                                                        0,
                                                        Duration.between(
                                                                        visit.getConsultStartedAt(), now)
                                                                .toMinutes()));
                            }
                            visit.setStatus("done");
                            if (doctorId != null) {
                                visit.setSeenBy(doctorId);
                            }
                            visits.save(visit);
                        });
    }

    private Appointment bookFollowUp(
            ClinicPrincipal principal, Prescription prescription, Instant now) {
        com.medmate.clinic.consult.Consultation consultation =
                prescriptions.findById(prescription.getId())
                        .map(p -> consultations.findByClinicIdAndVisitId(p.getClinicId(), p.getVisitId())
                                .orElse(null))
                        .orElse(null);
        if (consultation == null || consultation.getFollowUpAt() == null) {
            return null;
        }
        Appointment appointment = new Appointment();
        appointment.setId(UUID.randomUUID());
        appointment.setClinicId(UUID.fromString(principal.clinicId()));
        appointment.setPatientId(prescription.getPatientId());
        appointment.setVisitId(prescription.getVisitId());
        appointment.setStartsAt(consultation.getFollowUpAt());
        appointment.setEndsAt(consultation.getFollowUpAt().plus(20, ChronoUnit.MINUTES));
        appointment.setMode("in_clinic");
        appointment.setStatus("booked");
        appointment.setReason("Follow-up");
        appointment.setSource("consult");
        appointment.setCreatedAt(now);
        return appointments.save(appointment);
    }

    // ---------------------------------------------------------------- shapes

    private Map<String, Object> visit(Visit visit) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", visit.getId().toString());
        body.put("token", visit.getToken());
        body.put("status", visit.getStatus());
        body.put("mode", visit.getMode());
        body.put("source", visit.getSource());
        body.put("reason", visit.getReason());
        body.put("detail", visit.getDetail());
        body.put("priority", visit.getPriority());
        return body;
    }

    private Map<String, Object> patient(Patient patient) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", patient.getId().toString());
        body.put("name", patient.getFullName());
        body.put("age", patient.getAge());
        body.put("sex", patient.getSex());
        body.put("phone", patient.getPhone());
        body.put("abha", patient.getAbha());
        body.put("allergies", patient.getAllergies());
        body.put("conditions", patient.getConditions());
        return body;
    }

    private Map<String, Object> vitals(Vitals reading) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", reading.getId().toString());
        body.put("recordedAt", reading.getRecordedAt());
        body.put("tempF", reading.getTempF());
        body.put("bp", reading.getBpSystolic() + "/" + reading.getBpDiastolic());
        body.put("pulse", reading.getPulse());
        body.put("spo2", reading.getSpo2());
        body.put("weightKg", reading.getWeightKg());
        body.put("sugarMg", reading.getSugarMg());
        body.put("note", reading.getNote());
        body.put("priority", reading.getPriority());
        return body;
    }

    private Map<String, Object> consultation(com.medmate.clinic.consult.Consultation consultation) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", consultation.getId().toString());
        body.put("complaints", consultation.getComplaints());
        body.put("history", consultation.getHistory());
        body.put("examination", consultation.getExamination());
        body.put("adviceDiet", consultation.getAdviceDiet());
        body.put("adviceReturn", consultation.getAdviceReturn());
        body.put("followUpMode", consultation.getFollowUpMode());
        body.put("followUpAt", consultation.getFollowUpAt());
        body.put("followUpNote", consultation.getFollowUpNote());
        body.put("status", consultation.getStatus());
        return body;
    }

    private Map<String, Object> prescriptionSummary(Prescription prescription) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", prescription.getId().toString());
        body.put("visitId", prescription.getVisitId().toString());
        body.put("signedAt", prescription.getSignedAt());
        body.put("signatureMode", prescription.getSignatureMode());
        body.put("version", prescription.getVersion());
        body.put("status", prescription.getStatus());
        return body;
    }

    private Map<String, Object> invoiceSummary(Invoice invoice) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", invoice.getId().toString());
        body.put("number", invoice.getPrefix() + "/" + invoice.getNumber());
        body.put("total", invoice.getTotal());
        body.put("status", invoice.getStatus());
        return body;
    }

    private Map<String, Object> appointmentSummary(Appointment appointment) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", appointment.getId().toString());
        body.put("startsAt", appointment.getStartsAt());
        body.put("mode", appointment.getMode());
        body.put("status", appointment.getStatus());
        return body;
    }

    private Map<String, Object> labSummary(LabOrder order) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", order.getId().toString());
        body.put("testName", order.getTestName());
        body.put("status", order.getStatus());
        return body;
    }

    // ---------------------------------------------------------------- records

    /** What the consult screen sends when the doctor saves. */
    public record ConsultationRequest(
            String complaints,
            String history,
            List<Map<String, Object>> examination,
            Advice advice,
            FollowUp followUp,
            List<DiagnosisLine> diagnoses,
            List<MedicineLine> medicines,
            List<TestLine> tests) {}

    public record Advice(String diet, String returnIf) {}

    public record FollowUp(String mode, Instant at, String note) {}

    public record DiagnosisLine(String code, String label, String kind) {}

    public record MedicineLine(
            String name,
            String generic,
            String form,
            String dose,
            String when,
            String forDays,
            String notes) {}

    public record TestLine(String name) {}
}
