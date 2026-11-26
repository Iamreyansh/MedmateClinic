/**
 * The mock endpoints.
 *
 * Same paths and same shapes as the Java API. When the service answers them,
 * this file stops being used and nothing above it changes.
 *
 * The mock holds state: signing a prescription closes the visit, raises the
 * bill, books the follow-up and puts the tests on the lab desk — so the screens
 * agree with each other instead of each showing their own fiction.
 */

import { mock } from "@/services/api/mock/router";
import { auth } from "@/services/api/client";
import { requireSession } from "@/services/api/mock/guard";
import { buildReport } from "@/services/api/mock/reports";
import { registerDeskRoutes } from "@/services/api/mock/deskRoutes";
import { registerBillingRoutes } from "@/services/api/mock/billingRoutes";
import { registerScheduleRoutes } from "@/services/api/mock/scheduleRoutes";
import { registerSubscriptionRoutes } from "@/services/api/mock/subscriptionRoutes";
import { registerNurseRoutes } from "@/services/api/mock/nurseRoutes";
import { registerLabRoutes } from "@/services/api/mock/labRoutes";
import { registerKioskRoutes } from "@/services/api/mock/kioskRoutes";
import { registerPatientWebRoutes } from "@/services/api/mock/patientWebRoutes";
import { registerMessageRoutes } from "@/services/api/mock/messageRoutes";
import { registerActivityRoutes } from "@/services/api/mock/activityRoutes";
import { registerSettingsRoutes } from "@/services/api/mock/settingsRoutes";
import { registerAdminRoutes } from "@/services/api/mock/adminRoutes";
import { registerPreSignupRoutes } from "@/services/api/mock/preSignupRoutes";
import {
  appointments,
  capabilities,
  clinic,
  consultations,
  consent,
  dashboardMeta,
  doctors,
  inbox,
  invoices,
  labOrders,
  labResults,
  location,
  manage,
  navCounts,
  patient,
  patients,
  prescriptions,
  readings,
  recordAccess,
  signedInUser,
  stations,
  templates,
  timeline,
  trial,
  visit as findVisit,
  visits,
  vitalsFor,
  waitingOnline,
  type MockConsultation,
  type MockPrescription,
} from "@/services/api/mock/state";

/** The codes the mock hands out, so a developer can sign in without a phone. */
const otpCodes = new Map<string, string>();
/** The PIN the mock accepts, in test mode. */
const MOCK_PIN = "1234";

/** The session the mock opens. The mock answers with fixture data. */
const MOCK_SESSION = "mock.access.token";

/**
 * The endpoints behind the session.
 *
 * The Java API answers these only to a caller with a token; the mock checks
 * the same token, in the same place — the browser's own storage — so a screen
 * that forgets to guard itself fails here first, and a refresh keeps the
 * session the way it does against the real service.
 */

// ------------------------------------------------------------------ the auth

mock.on("POST", "/auth/otp", (body) => {
  const phone = String((body as { phone?: string })?.phone ?? "");
  if (phone.length !== 10) {
    throw new Error("Enter a 10-digit mobile number.");
  }
  const code = "123456";
  otpCodes.set(phone, code);
  // the code comes back in the response, as the API does in test mode
  return { sent: true, code };
});

mock.on("POST", "/auth/verify", (body) => {
  const request = body as { phone?: string; code?: string };
  const phone = String(request?.phone ?? "");
  const expected = otpCodes.get(phone);
  if (!expected) {
    throw new Error("That code has expired. Ask for a new one.");
  }
  if (expected !== String(request?.code ?? "")) {
    throw new Error("That code is not right.");
  }
  otpCodes.delete(phone);
  auth.set(MOCK_SESSION);
  return { accessToken: "mock.access.token" };
});

mock.on("POST", "/auth/unlock", (body) => {
  const request = body as { clinicId?: string; pin?: string };
  if (String(request?.pin ?? "") !== MOCK_PIN) {
    throw new Error("That PIN is not right.");
  }
  auth.set(MOCK_SESSION);
  return { accessToken: MOCK_SESSION };
});

/**
 * Sign a new clinic up.
 *
 * The five-step flow sends the whole form in one flat object and gets back
 * the session, the clinic and the booking link — the link the clinic hands
 * to its patients, which is never built from the clinic's name.
 */
mock.on("POST", "/auth/signup", (body) => {
  const request = (body ?? {}) as Record<string, unknown>;
  const clinicName = String(request.clinicName ?? "").trim();
  const mobile = String(request.mobile ?? "").replace(/\D/g, "");
  if (!clinicName) throw new Error("Enter the clinic's name.");
  if (mobile.length !== 10) throw new Error("Enter a 10-digit mobile number.");

  const slug = `${clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random()
    .toString(16)
    .slice(2, 10)
    .padEnd(8, "0")}`;

  const clinicId = `clinic_${slug}`;
  auth.set(MOCK_SESSION);

  return {
    accessToken: MOCK_SESSION,
    clinicId,
    clinicName,
    bookingSlug: slug,
    bookingUrl: `https://medmate.in/book?clinic=${slug}`,
    clinic: {
      id: clinicId,
      name: clinicName,
      initials: clinicName.slice(0, 2).toUpperCase(),
      locations: 1,
      doctors: 1,
    },
  };
});

// ---------------------------------------------------------------- the session

mock.on("GET", "/me", () => {
  requireSession();
  return {
    clinic: {
    id: clinic.id,
    name: clinic.name,
    initials: clinic.initials,
    locations: clinic.locations,
    doctors: clinic.doctors,
  },
  user: {
    id: signedInUser.id,
    name: signedInUser.name,
    initials: signedInUser.initials,
    detail: signedInUser.detail,
    tone: signedInUser.tone,
  },
  location,
  doctors: doctors.map((person) => ({
    id: person.id,
    name: person.name,
    initials: person.initials,
    speciality: person.speciality,
    room: person.room,
    registration: person.registration,
    hpr: person.hpr,
  })),
  capabilities,
  navCounts,
  };
});

// -------------------------------------------------------------- the dashboard

mock.on("GET", "/clinic/dashboard", () => {
  requireSession();
  return {
  meta: dashboardMeta,
  trial,
  stations,
  doctors: doctors.map((person) => ({
    id: person.id,
    initials: person.initials,
    name: person.name,
    speciality: person.speciality,
    room: person.room,
    waiting: 0,
  })),
  manage,
  };
});

// ------------------------------------------------------------------- the queue

mock.on("GET", "/clinic/queue", () => {
  requireSession();
  const waiting = visits.filter((item) => item.status === "waiting");
  // Every row the console's tabs read: the ones waiting, the ones in
  // consult, the ones seen today and the ones who did not come.
  const items = visits.map((item) => {
    const person = patient(item.patientId);
    return {
      token: item.token,
      /** The doctor the patient is waiting for, when one is named. */
      doctorId: item.seenBy ?? null,
      doctorName: item.seenBy ? doctors.find((entry) => entry.id === item.seenBy)?.name ?? null : null,
      /** The service's own vocabulary: waiting, in_consult, done, no_show. */
      status: item.status,
      kind: item.token.startsWith("A") ? "A" : "B",
      patient: person,
      reason: item.reason,
      detail: item.detail,
      wait: item.priority === "urgent" ? "Urgent" : "Waiting",
      waiting:
        item.status === "waiting" ? waiting.findIndex((other) => other.id === item.id) + 1 : null,
      // The reading the nurse took. The service sends the key whether or
      // not there is a reading, and null when there is none — a row with no
      // reading has a blank line, not a missing field.
      vitals: vitalsFor(item.id)
        ? `Temp ${vitalsFor(item.id)?.tempF} °F · SpO₂ ${vitalsFor(item.id)?.spo2}%`
        : null,
    };
  });
  const room = signedInUser.name.includes("Ananya") ? "Room 2" : "Room 1";
  // how long a consult takes, on average — the console reads it
  const seen = visits.filter((item) => item.consultMinutes !== null);
  const averageConsultMinutes = seen.length
    ? Math.round(seen.reduce((sum, item) => sum + (item.consultMinutes ?? 0), 0) / seen.length)
    : 0;

  return {
    items,
    next: items.find((item) => item.status === "waiting") ?? null,
    room,
    averageConsultMinutes,
    meta: `${room} · ${waiting.length} waiting · ${items.length - waiting.length} seen today · average consult 8 min`,
  };
});

// --------------------------------------------------------------- the doctors

mock.on("GET", "/clinic/doctors", () => {
  requireSession();
  return doctors.map((person, index) => ({
    id: person.id,
    name: person.name,
    speciality: person.speciality,
    room: person.room,
    /** The registration the doctor signs with. */
    registration: person.registration,
    /** The consultation fee. */
    fee: 500 - index * 50,
    /** The video consultation fee. */
    videoFee: 400 - index * 50,
    /** The hours the doctor works in. */
    hours: ["10:00–13:00", "16:00–19:00"],
    /** How many patients the doctor has seen today. */
    bookedToday: index + 1,
    /** How many slots are still free today. */
    freeToday: 6 - index,
    /** The next free slot today. */
    nextFree: index === 0 ? "Tomorrow 10:00 am" : "Today 4:30 pm",
    /** How many patients are in consult with the doctor. */
    waiting: index,
  }));
});

// --------------------------------------------------------------- check in

mock.on("POST", "/clinic/check-ins", (body) => {
  requireSession();
  const request = body as {
    name?: string;
    age?: string;
    sex?: string;
    phone?: string;
    reason?: string;
    mode?: string;
    doctor?: string;
  };

  const name = (request.name ?? "").trim();
  if (name.length < 2) throw new Error("A name is needed to check a patient in.");

  // A patient who is already on the list is not added twice — the visit is
  // joined to the record that already exists.
  const existing = patients.find(
    (person) => person.name.toLowerCase() === name.toLowerCase(),
  );

  const patientId = existing?.id ?? `pt_new_${patients.length + 1}`;
  if (!existing) {
    patients.push({
      id: patientId,
      name,
      age: Number(request.age ?? 0),
      sex: request.sex === "M" ? "M" : "F",
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
      phone: request.phone ?? "",
      abha: "",
      allergies: [],
      conditions: [],
      visits: 1,
      since: "2026-11-25",
    });
  }

  // The next token: the highest A-token so far, plus one.
  const highest = visits
    .map((item) => Number(item.token.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 14;
  const token = `A-${String(highest + 1).padStart(3, "0")}`;

  const visit = {
    id: `vs_${token.toLowerCase().replace("-", "_")}_${visits.length}`,
    token,
    patientId,
    status: "waiting",
    mode: request.mode === "online" ? "online" : "in_clinic",
    source: "walk_in",
    reason: request.reason ?? "Walk-in",
    detail: null,
    priority: null,
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: new Date().toISOString(),
  };
  visits.push(visit);

  return {
    visit,
    token,
    patient: patient(patientId),
    doctor: request.doctor ?? signedInUser.name,
  };
});

// ------------------------------------------------------------------ the inbox

mock.on("GET", "/clinic/inbox", () => {
  requireSession();
  return {
  items: inbox.map((item) => ({ ...item, patient: patient(item.patientId) })),
  counts: {
    all: inbox.length,
    Result: inbox.filter((item) => item.kind === "Result").length,
    Referral: inbox.filter((item) => item.kind === "Referral").length,
    Handover: inbox.filter((item) => item.kind === "Handover").length,
  },
  meta: "Referrals from colleagues, lab results to review and handovers.",
  };
});

// ---------------------------------------------------------------- the reports

mock.on("GET", "/clinic/reports", (_body, context) => {
  requireSession();
  return buildReport({
    tab: context.query.get("tab") ?? "summary",
    from: context.query.get("from") ?? "",
    to: context.query.get("to") ?? "",
    doctor: context.query.get("doctor") ?? undefined,
    q: context.query.get("q") ?? undefined,
    limit: context.query.has("limit") ? Number(context.query.get("limit")) : undefined,
    offset: context.query.has("offset") ? Number(context.query.get("offset")) : undefined,
  });
});

// --------------------------------------------------------------- the consult

mock.on("GET", "/clinic/visits/:id", (_body, context) => {
  requireSession();
  const found = findVisit(context.params.id);
  if (!found) throw new Error("That visit is not here.");
  const person = patient(found.patientId);
  const consultation = consultations.find((item) => item.visitId === found.id) ?? null;
  const visitPrescriptions = prescriptions.filter((item) => item.visitId === found.id);

  return {
    visit: {
      id: found.id,
      token: found.token,
      status: found.status,
      mode: found.mode,
      source: found.source,
      reason: found.reason,
      detail: found.detail,
      priority: found.priority,
    },
    patient: {
      id: person.id,
      name: person.name,
      initials: person.initials,
      age: person.age,
      sex: person.sex,
      phone: person.phone,
      abha: person.abha,
      allergies: person.allergies,
      conditions: person.conditions,
      visits: person.visits,
      since: person.since,
    },
    vitals: vitalsFor(found.id) ?? null,
    consultation: consultation
      ? {
          id: consultation.id,
          complaints: consultation.complaints,
          history: consultation.history,
          examination: consultation.examination,
          adviceDiet: consultation.adviceDiet,
          adviceReturn: consultation.adviceReturn,
          followUpMode: consultation.followUpMode,
          followUpAt: consultation.followUpAt,
          followUpNote: consultation.followUpNote,
          status: consultation.status,
        }
      : null,
    prescriptions: visitPrescriptions.map((item) => ({
      id: item.id,
      status: item.status,
      signedAt: item.signedAt,
      signatureMode: item.signatureMode,
      version: item.version,
    })),
  };
});

/**
 * Call the patient in.
 *
 * The clock on the wait starts here: the visit leaves the queue and the
 * consultation clock starts. The service answers the same three keys.
 */
mock.on("POST", "/clinic/visits/:id/start", (_body, context) => {
  requireSession();
  const found = findVisit(context.params.id);
  if (!found) throw new Error("That visit is not here.");
  if (found.status === "waiting") {
    found.status = "in_consult";
    found.waitedMinutes = 12;
  }
  return {
    visitId: found.id,
    token: found.token,
    status: found.status,
    consultStartedAt: new Date().toISOString(),
  };
});

mock.on("POST", "/clinic/visits/:id/consult", (body, context) => {
  requireSession();
  const found = findVisit(context.params.id);
  if (!found) throw new Error("That visit is not here.");

  const request = body as {
    complaints?: string;
    history?: string;
    examination?: Array<Record<string, string>>;
    advice?: { diet?: string; returnIf?: string };
    followUp?: { mode?: string; at?: string; note?: string };
    diagnoses?: Array<{ code: string; label: string; kind: string }>;
    medicines?: Array<Record<string, string | undefined>>;
    tests?: Array<{ name: string }>;
  };

  const existing = consultations.find((item) => item.visitId === found.id);
  const consultation: MockConsultation = existing ?? {
    id: `cs_${found.id}`,
    visitId: found.id,
    patientId: found.patientId,
    complaints: null,
    history: null,
    examination: [],
    adviceDiet: null,
    adviceReturn: null,
    followUpMode: null,
    followUpAt: null,
    followUpNote: null,
    status: "draft",
  };
  consultation.complaints = request.complaints ?? consultation.complaints;
  consultation.history = request.history ?? consultation.history;
  consultation.examination = request.examination ?? consultation.examination;
  consultation.adviceDiet = request.advice?.diet ?? consultation.adviceDiet;
  consultation.adviceReturn = request.advice?.returnIf ?? consultation.adviceReturn;
  consultation.followUpMode = request.followUp?.mode ?? consultation.followUpMode;
  consultation.followUpAt = request.followUp?.at ?? consultation.followUpAt;
  consultation.followUpNote = request.followUp?.note ?? consultation.followUpNote;
  consultation.status = "draft";
  if (!existing) consultations.push(consultation);

  const existingPrescription = prescriptions.find((item) => item.visitId === found.id);
  const prescription: MockPrescription = existingPrescription ?? {
    id: `rx_${found.id}`,
    visitId: found.id,
    patientId: found.patientId,
    signedAt: null,
    signatureMode: null,
    version: 1,
    status: "draft",
    safetyAlert: false,
    safetyAlertKind: null,
    safetyOverridden: false,
    safetyOverrideReason: null,
    verifyToken: `vt_${found.id}_${Math.random().toString(36).slice(2, 10)}`,
    diagnoses: [],
    medicines: [],
    tests: [],
  };

  // the lines live on the prescription, as the API keeps them — so signing it
  // later can raise the bill and the lab orders without the doctor resending
  prescription.diagnoses = request.diagnoses ?? prescription.diagnoses;
  prescription.medicines = request.medicines ?? prescription.medicines;
  prescription.tests = request.tests ?? prescription.tests;
  prescription.safetyAlert = false;
  prescription.safetyAlertKind = null;
  prescription.safetyOverridden = false;
  prescription.safetyOverrideReason = null;

  if (!existingPrescription) prescriptions.push(prescription);

  return {
    consultationId: consultation.id,
    prescriptionId: prescription.id,
    status: "draft",
  };
});

mock.on("POST", "/clinic/prescriptions/:id/sign", (body, context) => {
  requireSession();
  const prescription = prescriptions.find((item) => item.id === context.params.id);
  if (!prescription) throw new Error("That prescription is not here.");
  if (prescription.status === "signed") {
    throw new Error("This prescription is already signed.");
  }

  const request = body as { signatureMode?: string; overrideReason?: string };
  const now = new Date();
  prescription.status = "signed";
  prescription.signedAt = now.toISOString();
  prescription.signatureMode = request?.signatureMode ?? "test";
  prescription.safetyAlert = true;
  prescription.safetyAlertKind = "antibiotic_for_viral_illness";
  prescription.safetyOverridden = Boolean(request?.overrideReason);
  prescription.safetyOverrideReason = request?.overrideReason ?? null;

  // the bill
  const invoice = {
    id: `inv_${prescription.id}`,
    visitId: prescription.visitId,
    prescriptionId: prescription.id,
    prefix: "MCI",
    number: String(invoices.length + 1).padStart(4, "0"),
    total: 500,
    status: "unpaid",
    payMode: null,
    paidAt: null,
  };
  invoices.push(invoice);

  // the consult is over
  const visit = findVisit(prescription.visitId);
  if (visit) {
    visit.status = "done";
    visit.seenBy = signedInUser.id;
    visit.waitedMinutes = 24;
    visit.consultMinutes = 8;
  }

  // the follow-up, if the doctor asked for one
  const consultation = consultations.find((item) => item.visitId === prescription.visitId);
  const appointment = consultation?.followUpAt
    ? {
        id: `ap_${prescription.id}`,
        visitId: prescription.visitId,
        patientId: prescription.patientId,
        doctorId: signedInUser.id,
        startsAt: consultation.followUpAt,
        mode: "in_clinic",
        status: "booked",
        source: "consult",
      }
    : null;
  if (appointment) appointments.push(appointment);

  // the tests go to the lab desk — they were written when the doctor saved
  const orders = prescription.tests ?? [];
  const labOrderList = orders.map((test) => ({
    id: `lo_${prescription.id}_${test.name.replace(/\W+/g, "_")}`,
    visitId: prescription.visitId,
    prescriptionId: prescription.id,
    patientId: prescription.patientId,
    testName: test.name,
    status: "to_collect",
    sampleNo: null,
    partner: null,
    orderedBy: "dr_ananya",
    collectedAt: null,
    reportedAt: null,
    value: null,
    reference: null,
    abnormal: false,
    critical: false,
    note: null,
  }));
  labOrders.push(...labOrderList);

  return {
    prescription: {
      id: prescription.id,
      status: prescription.status,
      signedAt: prescription.signedAt,
      signatureMode: prescription.signatureMode,
    },
    invoice: {
      id: invoice.id,
      number: `${invoice.prefix}/${invoice.number}`,
      total: invoice.total,
      status: invoice.status,
    },
    followUp: appointment
      ? {
          id: appointment.id,
          startsAt: appointment.startsAt,
          mode: appointment.mode,
          status: appointment.status,
        }
      : null,
    labOrders: labOrderList.map((order) => ({
      id: order.id,
      testName: order.testName,
      status: order.status,
    })),
  };
});

// --------------------------------------------------------------- the patients

mock.on("GET", "/clinic/patients", () => {
  requireSession();
  const today = visits.filter((item) => item.status === "waiting" || item.status === "in_consult");
  const items = patients.map((person) => {
    const inClinic = today.find((item) => item.patientId === person.id);
    const dues = person.id === "pt_kavya" ? 500 : person.id === "pt_diya" ? 250 : 0;
    return {
      id: person.id,
      name: person.name,
      initials: person.initials,
      age: person.age,
      sex: person.sex,
      phone: person.phone,
      abha: person.abha,
      allergies: person.allergies,
      conditions: person.conditions,
      visits: person.visits,
      since: person.since,
      token: inClinic?.token ?? null,
      hereToday: Boolean(inClinic),
      lastSeen: inClinic ? "Today" : person.visits > 1 ? "Last week" : "—",
      doctor: person.id === "pt_kavya" ? "Dr. Naveen Kulkarni" : "Dr. Ananya Rao",
      dues,
      followUpOn:
        person.id === "pt_kavya" ? "2026-11-30" : person.id === "pt_diya" ? "2026-12-04" : null,
      mine: person.id === "pt_kavya" || person.id === "pt_diya",
      joinedOn: person.visits > 1 ? "2024-06-12" : "2026-11-04",
      newThisMonth: person.visits === 1 && person.since === "2026",
    };
  });
  const here = items.filter((item) => item.hereToday).length;
  return {
    items,
    meta: `${items.length} patients · ${here} here today`,
    total: items.length,
  };
});

mock.on("GET", "/clinic/patients/:id", (_body, context) => {
  requireSession();
  const person = patient(context.params.id);
  // the patient's own visits come first — they are the ones that can be
  // written up, and the history follows them
  const own = visits
    .filter((item) => item.patientId === person.id)
    .map((item) => ({
      id: item.id,
      date: "Today, 25 Nov",
      doctor: "Dr. Ananya Rao",
      diagnosis: item.reason ?? "General consultation",
      medicines: "",
      signed: "Signed",
    }));
  return {
    patient: {
      id: person.id,
      name: person.name,
      initials: person.initials,
      age: person.age,
      sex: person.sex,
      phone: person.phone,
      abha: person.abha,
      allergies: person.allergies,
      conditions: person.conditions,
      visits: person.visits,
      since: person.since,
    },
    visits: [...own, ...timeline],
    readings,
    labResults,
    recordAccess,
  };
});

// --------------------------------------------------------------- the templates

mock.on("GET", "/clinic/templates", () => {
  requireSession();
  return {
    items: templates,
    meta: "Your reusable treatment protocols. Apply one in the console and adjust doses by weight.",
  };
});

// -------------------------------------------------------------- the teleconsult

mock.on("GET", "/clinic/teleconsult", () => {
  requireSession();
  return {
    waiting: waitingOnline.map((entry) => ({
      patient: patient(entry.patientId),
      booked: entry.booked,
      reason: entry.reason,
      state: entry.state,
    })),
    consent,
    meta:
      "Patients wait on their own page. Start the call when they are online, and switch to a phone call if video fails.",
  };
});

// The desk, the till and the appointment book are registered from their own
// files — each is a screen's worth of endpoints.
registerDeskRoutes();
registerBillingRoutes();
registerScheduleRoutes();
registerSubscriptionRoutes();
registerNurseRoutes();
registerLabRoutes();
registerKioskRoutes();
registerPatientWebRoutes();
registerMessageRoutes();
registerActivityRoutes();
registerSettingsRoutes();
registerAdminRoutes();
registerPreSignupRoutes();
