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
 * Two different numbers are in play, and the split matters:
 *
 * - the **link key** is the random, high-entropy secret that lives in the URL.
 *   It is the only thing that identifies the booking, so it cannot be
 *   enumerated and it is never shown as a queue number.
 * - the **queue number** is the short, human slip — "A-016" — that the front
 *   desk reads out and that the patient sees on screen.
 *
 * The patient's own session is kept in the browser's session storage, because a
 * patient on a phone will reload the page — and a link that forgets what it
 * was for is a link that has to be asked for again.
 */

import { ApiError } from "@/services/api/client";
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
  /** The visit ids the patient booked, by link key. */
  booked: Record<string, string>;
  /** The names of the patients, by visit id. */
  names: Record<string, string>;
  /** The symptoms forms the patient filled in, by link key. */
  intakes: Record<string, { symptoms: string[]; redFlags: string[]; notes: string; duration: string }>;
  /** The bookings already made, by idempotency key. */
  idempotent: Record<string, string>;
};

/** The session, as it was left. */
function readSession(): PatientSession {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { booked: {}, names: {}, intakes: {}, idempotent: {} };
    const parsed = JSON.parse(raw) as Partial<PatientSession>;
    return {
      booked: parsed.booked ?? {},
      names: parsed.names ?? {},
      intakes: parsed.intakes ?? {},
      idempotent: parsed.idempotent ?? {},
    };
  } catch {
    return { booked: {}, names: {}, intakes: {}, idempotent: {} };
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

/**
 * A random link key.
 *
 * The key is what a patient carries, so it has to be unguessable: a
 * sequential "A-001" would let anyone walk the clinic's bookings. A queue
 * number is a separate, short thing.
 */
function newLinkKey(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let key = "";
  for (const byte of bytes) key += alphabet[byte % alphabet.length];
  return key;
}

/** The next queue number, the short slip the desk reads out. */
function nextQueueNumber(): string {
  const highest = visits.reduce((max, visit) => {
    const number = Number(visit.token.replace(/\D/g, ""));
    return Number.isFinite(number) && visit.token.startsWith("A") && number > max ? number : max;
  }, 15);
  return `A-${String(highest + 1).padStart(3, "0")}`;
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

/**
 * The visit a link key points at.
 *
 * A key that is not ours is a key that is not valid — there is no second
 * clinic's booking hiding behind it.
 */
function visitForLink(linkKey: string): MockVisit {
  const session = readSession();
  const visitId = session.booked[linkKey];
  if (!visitId) {
    throw new ApiError(404, "This link is no longer valid. Ask the clinic for a new one.");
  }

  const found = visits.find((item) => item.id === visitId);
  if (found) return found;

  // The patient booked it before a reload — put the visit back.
  const visit: MockVisit = {
    id: visitId,
    token: nextQueueNumber(),
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
    // The slug may be overridden here, and only here — this is the one page
    // that is reached by a link the clinic hands out.
    // a link without a slug is the clinic's own page; a link with one must
    // be the clinic's own link
    const asked = context.query.get("clinic");
    const slug = !asked ? SLUG : asked;
    if (slug !== SLUG) {
      throw new ApiError(
        404,
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

  // Book the visit. The patient gets a link key and two links to keep.
  mock.on("POST", "/public/booking", (body, context) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const name = String(request.name ?? "").trim();
    const phone = String(request.phone ?? "").replace(/\D/g, "");
    if (!name) throw new Error("Enter the patient's name.");
    if (phone.length !== 10) throw new Error("Enter a 10-digit mobile number.");

    // A double tap must not make two visits. The key the caller sent is kept,
    // and a repeat with the same key gets the first booking back.
    const idempotencyKey = String(
      context.headers["idempotency-key"] ?? request.idempotencyKey ?? "",
    ).trim();

    const session = readSession();
    if (idempotencyKey && session.idempotent[idempotencyKey]) {
      const linkKey = session.idempotent[idempotencyKey];
      const visit = visitForLink(linkKey);
      const appointment = appointments.find((entry) => entry.visitId === visit.id);
      const doctor = doctors.find((entry) => entry.id === appointment?.doctorId) ?? doctors[0];
      return {
        token: linkKey,
        queueToken: visit.token,
        liveUrl: `/t/${linkKey}`,
        intakeUrl: `/intake/${linkKey}`,
        startsAt: appointment?.startsAt ?? "",
        doctor: doctor.name,
        clinic: PUBLIC_CLINIC.name,
      };
    }

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

    // the link key is random; the queue number is the short slip
    const linkKey = newLinkKey();
    const queueToken = nextQueueNumber();

    const visit: MockVisit = {
      id: `vs_booked_${phone.slice(-4)}_${linkKey.slice(0, 6)}`,
      token: queueToken,
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
      id: `ap_${linkKey}`,
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
    session.booked[linkKey] = visit.id;
    session.names[visit.id] = person.name;
    session.intakes[linkKey] = { symptoms: [], redFlags: [], notes: "", duration: "" };
    if (idempotencyKey) session.idempotent[idempotencyKey] = linkKey;
    writeSession(session);

    return {
      token: linkKey,
      queueToken,
      liveUrl: `/t/${linkKey}`,
      intakeUrl: `/intake/${linkKey}`,
      startsAt,
      doctor: doctor.name,
      clinic: PUBLIC_CLINIC.name,
    };
  });

  // The patient's place in the queue.
  mock.on("GET", "/token/:token", (_body, context) => {
    const linkKey = context.params.token;
    const visit = visitForLink(linkKey);
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
      // the queue slip, in the patient's words — not the link key
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
    const linkKey = context.params.token;
    visitForLink(linkKey);
    const session = readSession();
    const form = session.intakes[linkKey];
    const visit = visits.find((item) => item.id === session.booked[linkKey]);
    const person = patients.find((entry) => entry.id === visit?.patientId);

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
    const linkKey = context.params.token;
    const visit = visitForLink(linkKey);

    const request = (body ?? {}) as Record<string, unknown>;
    const symptoms = Array.isArray(request.symptoms) ? (request.symptoms as string[]) : [];
    const redFlags = Array.isArray(request.redFlags) ? (request.redFlags as string[]) : [];

    const session = readSession();
    session.intakes[linkKey] = {
      symptoms,
      redFlags,
      notes: request.notes ? String(request.notes) : "",
      duration: request.duration ? String(request.duration) : "",
    };
    writeSession(session);
    // the doctor reads what the patient wrote
    visit.reason = [...symptoms, ...redFlags].join(", ") || visit.reason;

    return {
      token: linkKey,
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
    if (!prescription) throw new ApiError(404, "We could not find that prescription.");

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
      visitToken: visit?.token ?? "",
    };
  });
}
