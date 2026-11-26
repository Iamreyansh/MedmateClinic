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
import { registerMockReset } from "@/services/api/mock/reset";
import { clinicInstant, clinicLocal } from "@/services/api/mock/clinicClock";
import {
  appointments,
  doctors,
  patients,
  prescriptions,
  visits,
  type MockAppointment,
  type MockPrescription,
  type MockVisit,
} from "@/services/api/mock/state";

/** The clinic's public booking slug. */
const SLUG = "medmate-clinic";

/** The day the patient is offered, the day after the clinic's today. */
const BOOKING_DAY = "2026-11-26";

/** The hours the clinic sees patients. */
const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "16:00", "16:30"];

/** Where the patient's own session is kept between reloads. */
const SESSION_KEY = "medmate.mock.patient";

/** The clinic, as the patient sees it. */
const PUBLIC_CLINIC = {
  name: "MedMate Clinic Indiranagar",
  city: "Bengaluru",
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  phone: "080 4123 4567",
  slug: SLUG,
  // the clinic's own zone, as the service sends it
  timezone: "Asia/Kolkata",
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
  /** The bookings already called off, by link key — the queue slip of each. */
  cancelled: Record<string, string>;
  /** The rebooks already made, by idempotency key. */
  rebooks: Record<string, { signature: string; result: RebookAnswer }>;
};

/** What the service answers with when a booking has moved. */
type RebookAnswer = {
  cancelled: boolean;
  token: string;
  queueToken: string;
  startsAt: string;
  doctor: string;
  clinic: string;
};

/**
 * The patient's session goes with the rest of the state.
 *
 * The session is kept in the browser's storage, so a test that books a visit
 * leaves the booking in the storage for the test after it. Clearing it here
 * puts it back the way it was.
 */
registerMockReset(() => {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // The browser will not let us — the patient can still book.
  }
});

/** The session, as it was left. */
function readSession(): PatientSession {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { booked: {}, names: {}, intakes: {}, idempotent: {}, cancelled: {}, rebooks: {} };
    const parsed = JSON.parse(raw) as Partial<PatientSession>;
    return {
      booked: parsed.booked ?? {},
      names: parsed.names ?? {},
      intakes: parsed.intakes ?? {},
      idempotent: parsed.idempotent ?? {},
      cancelled: parsed.cancelled ?? {},
      rebooks: parsed.rebooks ?? {},
    };
  } catch {
    return { booked: {}, names: {}, intakes: {}, idempotent: {}, cancelled: {}, rebooks: {} };
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

/**
 * The public link to a prescription, as the patient opens it.
 *
 * The hash in the link is the secret the prescription itself carries, the
 * way the service does it: the link is the only place the secret appears,
 * and the document only verifies against the one it holds. It is not worked
 * out from the prescription's id — a derivation is a formula anybody could
 * work out, so it would not be a secret at all.
 */
function verifyUrlFor(prescription: MockPrescription): string {
  return `/verify/${prescription.id}?h=${encodeURIComponent(prescription.verifyToken)}`;
}

/**
 * The times the patient can take, for the day after today.
 */
function slotsFor(
  doctorId: string,
  day: string = BOOKING_DAY,
): Array<{ label: string; startsAt: string; free: boolean }> {
  // Only this doctor's appointments on this day are in the way: two doctors
  // can hold the same time, and the same doctor at another time is free.
  const taken = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.doctorId === doctorId && appointment.status !== "cancelled",
      )
      .map((appointment) => {
        const local = clinicLocal(appointment.startsAt);
        return local.day === day ? local.time : "";
      })
      .filter(Boolean),
  );

  return HOURS.map((time) => ({
    label: time,
    // an instant in the clinic's own zone, not a UTC wall-clock — so the
    // label, the comparison and the booking all agree
    startsAt: clinicInstant(day, time),
    // the hours the doctor is already held at are not on offer
    free: !taken.has(time),
  }));
}

/**
 * Whether the doctor is already held at that instant.
 *
 * The instant is the whole test: the same doctor at another time is free,
 * and another doctor at the same time is free too.
 */
function slotIsTaken(doctorId: string, startsAt: string): boolean {
  return appointments.some(
    (appointment) =>
      appointment.doctorId === doctorId &&
      appointment.startsAt === startsAt &&
      appointment.status !== "cancelled",
  );
}

/** The next free time, in the patient's words. */
function nextFree(doctorId: string): string | null {
  const free = slotsFor(doctorId).find((slot) => slot.free);
  if (!free) return null;
  // the label is the clinic's own clock
  return `Tomorrow, ${free.label}`;
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
    // the slug always travels with the booking link, so a page without one
    // has no clinic to book with — it is not a page at all
    const asked = context.query.get("clinic");
    if (!asked) {
      throw new ApiError(404, "Open your clinic's own booking link to book a visit.");
    }
    const slug = asked;
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

    // The times are the service's own, for the doctor asked for. Without one
    // the page opens with the first doctor's.
    const wanted = context.query.get("doctorId");
    const chosen = doctors.find((person) => person.id === wanted) ?? doctors[0];
    const slots = slotsFor(chosen?.id ?? "");

    return {
      clinic: PUBLIC_CLINIC,
      doctors: list,
      slots,
      day: BOOKING_DAY,
      nextFree: nextFree(chosen?.id ?? ""),
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
    const startsAt = String(request.startsAt ?? clinicInstant("2026-11-26", "09:00"));

    // The time has to be free: somebody else may have taken it while the
    // patient was typing their details in.
    if (slotIsTaken(doctor.id, startsAt)) {
      throw new ApiError(
        409,
        "Pick another time.",
        undefined,
        "api",
        "Slot no longer available",
      );
    }

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

  // Call the booking off.
  mock.on("POST", "/public/booking/:token/cancel", (_body, context) => {
    const linkKey = context.params.token;
    const session = readSession();

    // A repeat is the same answer as the first one: the booking is called
    // off, and calling it off again does not make it a second failure.
    const already = session.cancelled[linkKey];
    if (already) return { cancelled: true, token: already };

    const visitId = session.booked[linkKey];
    if (!visitId) {
      throw new ApiError(404, "This booking is no longer here. Ask the clinic for a new one.");
    }
    const visit = visits.find((entry) => entry.id === visitId);
    if (visit) {
      visit.status = "cancelled";
    }
    delete session.booked[linkKey];
    session.cancelled[linkKey] = visit?.token ?? "";
    writeSession(session);
    const slip = visit ? visit.token : "";
    return { cancelled: true, token: slip };
  });

  // Move the booking to another time.
  mock.on("POST", "/public/booking/:token/rebook", (body, context) => {
    const linkKey = context.params.token;
    const session = readSession();
    const visitId = session.booked[linkKey];
    if (!visitId) {
      throw new ApiError(404, "This link is not valid. Ask the clinic for a new one.");
    }
    const visit = visits.find((entry) => entry.id === visitId);
    if (!visit) {
      throw new ApiError(404, "This link is not valid. Ask the clinic for a new one.");
    }

    const request = (body ?? {}) as Record<string, unknown>;
    const date = String(request.date ?? "").trim();
    const slot = String(request.slot ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(slot)) {
      throw new ApiError(400, "Pick a time for the new visit.");
    }

    // The doctor the patient asked for; the one they are seeing now, when
    // they did not ask for one.
    const current = appointments.find((entry) => entry.visitId === visit.id);
    const asked = String(request.doctorId ?? "").trim();
    const doctor =
      doctors.find((person) => person.id === asked) ??
      doctors.find((person) => person.id === current?.doctorId) ??
      doctors[0];

    const startsAt = clinicInstant(date, slot);
    const signature = `${doctor.id}|${date}|${slot}`;

    // The same key with the same time gives the same answer; the same key
    // with another time is refused, because that attempt already happened.
    const key = String(context.headers["idempotency-key"] ?? "").trim();
    const previous = key ? session.rebooks[key] : undefined;
    if (previous) {
      if (previous.signature === signature) return previous.result;
      throw new ApiError(409, "Pick another time.", undefined, "api", "Slot no longer available");
    }

    // The time has to be free for that doctor.
    if (slotIsTaken(doctor.id, startsAt)) {
      throw new ApiError(409, "Pick another time.", undefined, "api", "Slot no longer available");
    }

    // The old booking is called off and the new one is made. The visit, the
    // queue slip and the link key are the patient's own — a rebook does not
    // make them new ones.
    for (const appointment of appointments.filter((entry) => entry.visitId === visit.id)) {
      appointment.status = "cancelled";
    }
    appointments.push({
      id: `ap_${linkKey}_${appointments.length}`,
      visitId: visit.id,
      patientId: visit.patientId,
      doctorId: doctor.id,
      startsAt,
      mode: "in_clinic",
      status: "booked",
      source: "booking",
    });

    const answer: RebookAnswer = {
      cancelled: true,
      // The slip, not the key: the key is the patient's credential, it does
      // not change when the booking moves, and it must not be drawn.
      token: visit.token,
      queueToken: visit.token,
      startsAt,
      doctor: doctor.name,
      clinic: PUBLIC_CLINIC.name,
    };
    if (key) {
      session.rebooks[key] = { signature, result: answer };
      writeSession(session);
    }

    return answer;
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
      prescriptionUrl: prescription ? verifyUrlFor(prescription) : null,
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
    const hash = context.query.get("h") ?? "";
    const prescription = prescriptions.find(
      (entry) => entry.id === id || entry.id === `rx_${id}` || entry.id === id.replace(/^rx_/, ""),
    );
    if (!prescription) throw new ApiError(404, "We could not find that prescription.");

    const visit = visits.find((item) => item.id === prescription.visitId);
    const person = patients.find((entry) => entry.id === prescription.patientId);
    const doctor = doctors[0];

    // The document is genuine only when the hash the link carries is the one
    // the prescription holds. A changed document no longer holds it.
    const genuine =
      prescription.verifyToken.length > 0 && hash === prescription.verifyToken;

    return {
      id: prescription.id,
      genuine,
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
