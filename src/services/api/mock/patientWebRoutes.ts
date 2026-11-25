/**
 * The patient-facing web surfaces.
 *
 * A patient opens these on their phone, from the clinic's booking link or from
 * an SMS. They are public — a patient at the clinic's front door is not staff
 * and has no session — so these endpoints are not behind the guard.
 *
 * The mock holds the same state the staff screens read, so a patient who books
 * a visit appears in the clinic's queue.
 *
 * The patient's own session is kept in the browser's session storage, because a
 * patient on a phone will reload the page — and a link that forgets what it
 * was for is a link that has to be asked for again.
 */

import { mock } from "@/services/api/mock/router";
import {
  appointments,
  doctors,
  patients,
  prescriptions,
  visits,
  type MockAppointment,
  type MockVisit,
} from "@/services/api/mock/state";

/** The clinic's public booking slug. */
const SLUG = "medmate-clinic";

/** Where the patient's own session is kept between reloads. */
const SESSION_KEY = "medmate.mock.patient";

/** The clinic, as the patient sees it. */
const PUBLIC_CLINIC = {
  name: "MedMate Clinic Indiranagar",
  city: "Bengaluru",
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  phone: "080 4123 4567",
  slug: SLUG,
};

/** What the patient has done, kept between reloads. */
type PatientSession = {
  /** The visit ids the patient booked, by token. */
  booked: Record<string, string>;
  /** The names of the patients, by visit id. */
  names: Record<string, string>;
  /** The symptoms forms the patient filled in, by token. */
  intakes: Record<string, { symptoms: string[]; redFlags: string[]; notes: string; duration: string }>;
};

/** The session, as it was left. */
function readSession(): PatientSession {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { booked: {}, names: {}, intakes: {} };
    const parsed = JSON.parse(raw) as PatientSession;
    return {
      booked: parsed.booked ?? {},
      names: parsed.names ?? {},
      intakes: parsed.intakes ?? {},
    };
  } catch {
    return { booked: {}, names: {}, intakes: {} };
  }
}

/** Keep the session for the next reload. */
function writeSession(session: PatientSession): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The browser will not let us keep it — the patient can still book.
  }
}

/** The consultation fee, by doctor. */
function feeFor(doctorId: string): number {
  const index = doctors.findIndex((person) => person.id === doctorId);
  return index === -1 ? 500 : 500 - index * 50;
}

/** The times the patient can take, for the day after today. */
function slotsFor(doctorId: string): Array<{ label: string; startsAt: string; free: boolean }> {
  const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "16:00", "16:30"];
  const taken = appointments.filter((appointment) => appointment.doctorId === doctorId).length;

  return hours.map((time, index) => ({
    label: time,
    startsAt: `2026-11-26T${time}:00Z`,
    // the first few are taken by the clinic's own bookings
    free: index >= taken,
  }));
}

/** The next free time, in the patient's words. */
function nextFree(doctorId: string): string | null {
  const free = slotsFor(doctorId).find((slot) => slot.free);
  if (!free) return null;
  const date = new Date(free.startsAt);
  return `Tomorrow, ${date.getUTCHours().toString().padStart(2, "0")}:${date
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
}

/** The visit a live token points at. */
function visitForToken(token: string): MockVisit | undefined {
  const found = visits.find((item) => item.token === token);
  if (found) return found;

  // The patient booked it before a reload — put the visit back.
  const session = readSession();
  const visitId = session.booked[token];
  if (!visitId) return undefined;

  const visit: MockVisit = {
    id: visitId,
    token,
    patientId: visitId.replace("vs_booked_", "pt_"),
    status: "waiting",
    mode: "in_clinic",
    source: "booking",
    reason: null,
    detail: null,
    priority: null,
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: new Date("2026-11-25T18:00:00Z").toISOString(),
  };
  visits.push(visit);

  // the patient's record may have gone with the reload — put the name back
  const patientId = visit.patientId;
  if (!patients.some((entry) => entry.id === patientId)) {
    patients.push({
      id: patientId,
      name: session.names[visitId] ?? "Patient",
      age: 30,
      sex: "F",
      initials: "P",
      phone: "",
      abha: "",
      allergies: [],
      conditions: [],
      visits: 1,
      since: "2026",
    });
  }
  return visit;
}

export function registerPatientWebRoutes() {
  // The booking page: the clinic, its doctors and the times.
  mock.on("GET", "/public/doctors", (_body, context) => {
    const slug = context.query.get("clinic") ?? SLUG;
    if (slug !== SLUG) {
      throw new Error(
        "Please use your clinic's own booking link. Ask the clinic, or find it on their WhatsApp or Google page.",
      );
    }

    const list = doctors.map((person) => ({
      id: person.id,
      name: person.name,
      speciality: person.speciality,
      feeInClinic: feeFor(person.id),
      feeOnline: feeFor(person.id) - 100,
      room: person.room,
    }));

    const slots = slotsFor(doctors[0]?.id ?? "");

    return {
      clinic: PUBLIC_CLINIC,
      doctors: list,
      slots,
      day: "2026-11-26",
      nextFree: nextFree(doctors[0]?.id ?? ""),
    };
  });

  // Book the visit. The patient gets a token and two links to keep.
  mock.on("POST", "/public/booking", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const name = String(request.name ?? "").trim();
    const phone = String(request.phone ?? "").replace(/\D/g, "");
    if (!name) throw new Error("Enter the patient's name.");
    if (phone.length !== 10) throw new Error("Enter a 10-digit mobile number.");

    const doctorId = String(request.doctorId ?? "");
    const doctor = doctors.find((person) => person.id === doctorId) ?? doctors[0];
    const startsAt = String(request.startsAt ?? "2026-11-26T09:00:00Z");

    // the clinic has met this patient before — the record is theirs
    let person = patients.find((entry) => entry.phone.replace(/\D/g, "").endsWith(phone));
    if (!person) {
      person = {
        id: `pt_${phone.slice(-4)}`,
        name,
        age: Number(request.age) || 30,
        sex: request.sex === "M" ? "M" : "F",
        initials: name.slice(0, 2).toUpperCase(),
        phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`,
        abha: "",
        allergies: [],
        conditions: [],
        visits: 1,
        since: "2026",
      };
      patients.push(person);
    }

    // the token is the next in the series
    const next = visits.filter((item) => item.token.startsWith("A")).length + 1;
    const token = `A-${String(next).padStart(3, "0")}`;

    const visit: MockVisit = {
      id: `vs_booked_${phone.slice(-4)}`,
      token,
      patientId: person.id,
      status: "waiting",
      mode: "in_clinic",
      source: "booking",
      reason: String(request.reason ?? "") || null,
      detail: null,
      priority: null,
      seenBy: null,
      waitedMinutes: null,
      consultMinutes: null,
      createdAt: new Date("2026-11-25T18:00:00Z").toISOString(),
    };
    visits.push(visit);

    const appointment: MockAppointment = {
      id: `ap_${token}`,
      visitId: visit.id,
      patientId: person.id,
      doctorId: doctor.id,
      startsAt,
      mode: "in_clinic",
      status: "booked",
      source: "booking",
    };
    appointments.push(appointment);

    // the patient's links to keep
    const session = readSession();
    session.booked[token] = visit.id;
    session.names[visit.id] = person.name;
    session.intakes[token] = { symptoms: [], redFlags: [], notes: "", duration: "" };
    writeSession(session);

    return {
      token,
      liveUrl: `/t/${token}`,
      intakeUrl: `/intake/${token}`,
      startsAt,
      doctor: doctor.name,
      clinic: PUBLIC_CLINIC.name,
    };
  });

  // The patient's place in the queue.
  mock.on("GET", "/token/:token", (_body, context) => {
    const token = context.params.token;
    const visit = visitForToken(token);
    if (!visit) throw new Error("This link is not valid");

    const person = patients.find((entry) => entry.id === visit.patientId);
    const appointment = appointments.find((entry) => entry.visitId === visit.id);
    const doctor = doctors.find((entry) => entry.id === appointment?.doctorId) ?? doctors[0];

    // the queue the patient is in
    const queue = visits.filter(
      (item) => item.status === "waiting" && item.token.startsWith("A"),
    );
    const position = Math.max(1, queue.findIndex((item) => item.id === visit.id) + 1);

    // the prescription, once the doctor has signed it
    const prescription = prescriptions.find((entry) => entry.visitId === visit.id);

    return {
      token: visit.token,
      patient: person?.name ?? "",
      position,
      ahead: Math.max(0, position - 1),
      room: doctor.room,
      doctor: doctor.name,
      due: 500,
      prescriptionUrl: prescription ? `/rx/${prescription.id}` : null,
      called: visit.status === "in_consult",
      updatedAt: new Date("2026-11-25T11:20:00Z").toISOString(),
    };
  });

  // The symptoms form, before the visit.
  mock.on("GET", "/intake/:token", (_body, context) => {
    const token = context.params.token;
    const visit = visitForToken(token);
    if (!visit) throw new Error("This link has expired. Ask the clinic for a new one.");

    const person = patients.find((entry) => entry.id === visit.patientId);
    const form = readSession().intakes[token];

    return {
      patient: person?.name ?? "",
      filled: Boolean(form && form.symptoms.length > 0),
      symptoms: form?.symptoms ?? [],
      redFlags: form?.redFlags ?? [],
      notes: form?.notes ?? "",
      duration: form?.duration ?? "",
      open: true,
    };
  });

  // Send the symptoms form in.
  mock.on("POST", "/intake/:token", (body, context) => {
    const token = context.params.token;
    const visit = visitForToken(token);
    if (!visit) throw new Error("This link has expired. Ask the clinic for a new one.");

    const request = (body ?? {}) as Record<string, unknown>;
    const symptoms = Array.isArray(request.symptoms) ? (request.symptoms as string[]) : [];
    const redFlags = Array.isArray(request.redFlags) ? (request.redFlags as string[]) : [];

    const session = readSession();
    session.intakes[token] = {
      symptoms,
      redFlags,
      notes: request.notes ? String(request.notes) : "",
      duration: request.duration ? String(request.duration) : "",
    };
    writeSession(session);
    // the doctor reads what the patient wrote
    visit.reason = request.notes ? String(request.notes) : symptoms.join(", ") || visit.reason;

    return {
      token,
      filled: true,
      submittedAt: new Date("2026-11-25T18:05:00Z").toISOString(),
    };
  });

  // The prescription, as the patient verifies it.
  mock.on("GET", "/verify/:id", (_body, context) => {
    const id = context.params.id;
    const prescription = prescriptions.find(
      (entry) => entry.id === id || entry.id === `rx_${id}` || entry.id === id.replace(/^rx_/, ""),
    );
    if (!prescription) throw new Error("No matching prescription");

    const visit = visits.find((item) => item.id === prescription.visitId);
    const person = patients.find((entry) => entry.id === prescription.patientId);
    const doctor = doctors[0];

    return {
      id: prescription.id,
      genuine: true,
      doctor: {
        name: doctor.name,
        registration: doctor.registration,
        speciality: doctor.speciality,
      },
      signedAt: prescription.signedAt ?? new Date("2026-11-25T10:55:00Z").toISOString(),
      patient: {
        name: person?.name ?? "",
        age: person?.age ?? 0,
        sex: person?.sex ?? "",
      },
      diagnoses: prescription.diagnoses.map((entry) => ({
        code: entry.code,
        label: entry.label,
      })),
      medicines: prescription.medicines.map((entry) => ({
        name: String(entry.name ?? ""),
        dose: String(entry.dose ?? ""),
        when: String(entry.when ?? ""),
        forDays: String(entry.forDays ?? ""),
      })),
      signatureMode: prescription.signatureMode,
      visitToken: visit?.token ?? null,
    };
  });
}
