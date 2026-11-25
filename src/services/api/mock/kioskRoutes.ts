/**
 * The patient kiosk.
 *
 * A front-desk tablet becomes a self check-in screen. The kiosk holds its own
 * state — the step it is on, the patient it is talking to — so a patient who
 * walks away leaves nothing behind but a closed session.
 *
 * The kiosk is a public surface: a patient at the tablet is not signed in, so
 * these endpoints do not require a session. The one thing that needs one is
 * closing the kiosk, which the front desk does with their PIN.
 */

import { mock } from "@/services/api/mock/router";
import { auth } from "@/services/api/client";
import { doctors, patients, visits } from "@/services/api/mock/state";

/**
 * The kiosk's own shapes.
 *
 * The mock states its own types, the way every other mock does — the feature
 * holds the contract, and the mock answers with the same shape without
 * importing it (the mock is `infra`, and `infra` may not reach into a
 * feature).
 */
type KioskLanguage = "en" | "kn" | "hi";
type KioskStep = "mobile" | "code" | "patient" | "doctor" | "pay" | "token";

type KioskDoctor = {
  id: string;
  name: string;
  speciality: string;
  room: string;
  fee: number;
  waiting: number;
};

type KioskSession = {
  open: boolean;
  step: KioskStep;
  language: KioskLanguage;
  phone: string | null;
  code: string | null;
  patient: { id: string; name: string; age: number; sex: string } | null;
  doctors: KioskDoctor[];
  booking: null;
  doctor: KioskDoctor | null;
  bill: { lines: Array<{ name: string; amount: number }>; total: number } | null;
  token: string | null;
  position: number | null;
  waiting: number;
  qr: string | null;
};

/** The PIN the mock accepts, in test mode. */
const MOCK_PIN = "1234";

/** The kiosk's own state. One device, one session. */
type KioskState = {
  open: boolean;
  step: KioskStep;
  language: KioskLanguage;
  phone: string | null;
  code: string | null;
  patientId: string | null;
  doctorId: string | null;
  bookingId: string | null;
  token: string | null;
  paid: boolean;
};

const state: KioskState = {
  open: false,
  step: "mobile",
  language: "en",
  phone: null,
  code: null,
  patientId: null,
  doctorId: null,
  bookingId: null,
  token: null,
  paid: false,
};

/** The doctors the patient can choose from, with their fee and their queue. */
function kioskDoctors(): KioskDoctor[] {
  return doctors.map((doctor, index) => ({
    id: doctor.id,
    name: doctor.name,
    speciality: doctor.speciality,
    room: doctor.room,
    fee: 500 - index * 50,
    waiting: index + 1,
  }));
}

/** The patient the kiosk is talking to. */
function kioskPatient() {
  if (!state.patientId) return null;
  const person = patients.find((entry) => entry.id === state.patientId);
  if (!person) return null;
  return { id: person.id, name: person.name, age: person.age, sex: person.sex };
}

/** The session, as the kiosk sends it. */
function session(): KioskSession {
  const doctor = kioskDoctors().find((entry) => entry.id === state.doctorId) ?? null;

  // A patient who has not paid owes the consultation and the registration.
  const bill =
    doctor && !state.paid
      ? {
          lines: [
            { name: `Consultation — ${doctor.name}`, amount: doctor.fee },
            { name: "Registration", amount: 50 },
          ],
          total: doctor.fee + 50,
        }
      : null;

  const position = state.token ? Number(state.token.split("-")[1] ?? 0) : null;

  return {
    open: state.open,
    step: state.step,
    language: state.language,
    phone: state.phone,
    code: state.code,
    patient: kioskPatient(),
    doctors: kioskDoctors(),
    booking: null,
    doctor,
    bill,
    token: state.token,
    position,
    waiting: position ? Math.max(0, position - 1) : 0,
    qr: state.token ? `medmate://checkin/${state.token}` : null,
  };
}

/** Back to the start, with the session cleared. */
function reset(): void {
  state.step = "mobile";
  state.phone = null;
  state.code = null;
  state.patientId = null;
  state.doctorId = null;
  state.bookingId = null;
  state.token = null;
  state.paid = false;
}

export function registerKioskRoutes() {
  mock.on("GET", "/kiosk", () => session());

  mock.on("POST", "/kiosk/open", () => {
    state.open = true;
    reset();
    return session();
  });

  mock.on("POST", "/kiosk/close", (body) => {
    // Only the front desk closes the kiosk, and they are signed in.
    if (!auth.get()) throw new Error("Please sign in again.");
    const request = (body ?? {}) as Record<string, unknown>;
    if (String(request.pin ?? "") !== MOCK_PIN) {
      throw new Error("That PIN is not right.");
    }
    state.open = false;
    reset();
    return { closed: true };
  });

  mock.on("POST", "/kiosk/code", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const phone = String(request.phone ?? "").replace(/\D/g, "");
    if (phone.length !== 10) {
      throw new Error("Enter a 10-digit mobile number.");
    }
    state.phone = phone;
    state.code = "123456";
    state.step = "code";
    // the code comes back in the response, as the API does in test mode
    return { ...session(), sent: true };
  });

  mock.on("POST", "/kiosk/verify", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const code = String(request.code ?? "");
    if (!state.code || code !== state.code) {
      throw new Error("That code is not right. Check the message and try again.");
    }
    state.code = null;

    // A patient the clinic has met before is known; a new one is not.
    const known = patients.find((person) =>
      person.phone.replace(/\D/g, "").endsWith(state.phone ?? ""),
    );
    state.patientId = known ? known.id : null;
    state.step = "patient";

    return session();
  });

  mock.on("POST", "/kiosk/patient", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const name = String(request.name ?? "").trim();
    if (!name) throw new Error("Enter the patient's name.");
    state.step = "doctor";
    return session();
  });

  mock.on("POST", "/kiosk/doctor", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const doctorId = String(request.doctorId ?? "");
    if (!kioskDoctors().some((entry) => entry.id === doctorId)) {
      throw new Error("Choose a doctor to continue.");
    }
    state.doctorId = doctorId;
    state.step = "pay";
    return session();
  });

  mock.on("POST", "/kiosk/pay", () => {
    state.paid = true;
    state.step = "token";
    // The token is issued as the patient is checked in, so it is on the screen
    // before the slip is printed.
    if (!state.token) {
      const next = visits.filter((item) => item.token.startsWith("A")).length + 1;
      state.token = `A-${String(next).padStart(3, "0")}`;
    }
    return session();
  });

  mock.on("POST", "/kiosk/token", () => {
    // Printing the slip does not change the check-in; the token is already out.
    if (!state.token) {
      const next = visits.filter((item) => item.token.startsWith("A")).length + 1;
      state.token = `A-${String(next).padStart(3, "0")}`;
    }
    state.step = "token";
    return session();
  });

  mock.on("POST", "/kiosk/reset", () => {
    reset();
    return session();
  });

  mock.on("POST", "/kiosk/language", (body) => {
    const request = (body ?? {}) as Record<string, unknown>;
    const language = String(request.language ?? "en");
    if (language === "en" || language === "kn" || language === "hi") {
      state.language = language;
    }
    return session();
  });
}
