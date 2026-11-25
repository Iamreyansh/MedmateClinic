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
import { buildReport } from "@/services/api/mock/reports";
import {
  advice,
  appointments,
  brief,
  capabilities,
  clinic,
  consultations,
  dashboardMeta,
  doctors,
  examination,
  followUp,
  inbox,
  invoices,
  labOrders,
  location,
  medicines,
  navCounts,
  patient,
  patients,
  prescriptions,
  signedInUser,
  stations,
  tests,
  trial,
  manage,
  visit as findVisit,
  visits,
  vitalsFor,
  type MockConsultation,
  type MockPrescription,
} from "@/services/api/mock/state";

/** The codes the mock hands out, so a developer can sign in without a phone. */
const otpCodes = new Map<string, string>();
/** The PIN the mock accepts, in test mode. */
const MOCK_PIN = "1234";

/**
 * The endpoints behind the session.
 *
 * The Java API answers these only to a caller with a token; the mock checks
 * the same token, in the same place — the browser's own storage — so a screen
 * that forgets to guard itself fails here first, and a refresh keeps the
 * session the way it does against the real service.
 */
function requireSession(): void {
  if (!auth.get()) {
    throw new Error("Please sign in again.");
  }
}

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
  auth.set("mock.access.token");
  return { accessToken: "mock.access.token" };
});

mock.on("POST", "/auth/unlock", (body) => {
  const request = body as { clinicId?: string; pin?: string };
  if (String(request?.pin ?? "") !== MOCK_PIN) {
    throw new Error("That PIN is not right.");
  }
  auth.set("mock.access.token");
  return { accessToken: "mock.access.token" };
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
  const items = waiting.map((item) => {
    const person = patient(item.patientId);
    return {
      token: item.token,
      kind: item.token.startsWith("A") ? "A" : "B",
      patient: person,
      reason: item.reason,
      detail: item.detail,
      wait: item.priority === "urgent" ? "Urgent" : "Waiting",
      waiting: waiting.findIndex((other) => other.id === item.id) + 1,
      vitals: vitalsFor(item.id)
        ? `Temp ${vitalsFor(item.id)?.tempF} °F · SpO₂ ${vitalsFor(item.id)?.spo2}%`
        : undefined,
    };
  });
  const room = signedInUser.name.includes("Ananya") ? "Room 2" : "Room 1";
  return {
    items,
    next: items[0] ?? null,
    room,
    meta: `${room} · ${items.length} waiting · 9 seen today · average consult 8 min`,
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
    visit.status = "seen";
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
    status: "ordered",
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
  return {
  items: patients.map((person) => ({
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
    lastSeen: "Today",
    doctor: "Dr. Ananya Rao",
    dues: 0,
  })),
  meta: `${patients.length} patients`,
  };
});

/**
 * The default advice, complaints and history a fresh consult starts with, so
 * the screen has something to draw before the doctor types.
 */
export const defaultConsult = { brief, examination, advice, followUp, medicines, tests };
