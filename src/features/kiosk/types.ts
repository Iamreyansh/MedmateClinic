/**
 * The patient kiosk, as the API sends it.
 *
 * A front-desk tablet becomes a self check-in screen. The patient confirms
 * their mobile with a code, says who they are and who they want to see, pays
 * if they need to, and gets a token.
 */

/** The step the patient is on. */
export type KioskStep = "mobile" | "code" | "patient" | "doctor" | "pay" | "token";

/** The languages the kiosk speaks. */
export type KioskLanguage = "en" | "kn" | "hi";

export type KioskDoctor = {
  id: string;
  name: string;
  speciality: string;
  room: string;
  /** The consultation fee, in rupees. */
  fee: number;
  /** How many people are waiting for this doctor. */
  waiting: number;
};

export type KioskBooking = {
  id: string;
  /** The doctor the booking is with. */
  doctorId: string;
  doctorName: string;
  /** When the appointment is. */
  startsAt: string;
  /** The patient's name on the booking. */
  patientName: string;
  status: string;
};

export type KioskSession = {
  /** Whether the kiosk is open on this device. */
  open: boolean;
  step: KioskStep;
  /** The language the kiosk is in. */
  language: KioskLanguage;
  /** The mobile the patient typed. */
  phone: string | null;
  /** The code the patient was sent. */
  code: string | null;
  /** The patient, once the code has been verified. */
  patient: { id: string; name: string; age: number; sex: string } | null;
  /** The doctors the patient can choose from. */
  doctors: KioskDoctor[];
  /** The booking the patient has today, if they have one. */
  booking: KioskBooking | null;
  /** The doctor the patient chose. */
  doctor: KioskDoctor | null;
  /** The bill, when the patient has to pay. */
  bill: { lines: Array<{ name: string; amount: number }>; total: number } | null;
  /** The token, once the patient has one. */
  token: string | null;
  /** The position in the queue. */
  position: number | null;
  /** How many people are ahead in the queue. */
  waiting: number;
  /** The QR code the patient shows at the desk. */
  qr: string | null;
};

/** What the patient types at each step. */
export type KioskMobilePayload = { phone: string };
export type KioskCodePayload = { phone: string; code: string };
export type KioskPatientPayload = { name: string; age: string; sex: string };
export type KioskDoctorPayload = { doctorId: string };
export type KioskPayPayload = { method: string };
