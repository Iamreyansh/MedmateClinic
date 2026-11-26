/**
 * The patient-facing web surfaces.
 *
 * These are the pages a patient opens on their phone, from the clinic's
 * booking link or from an SMS. None of them need a session — a patient at the
 * clinic's front door is not staff — so they sit outside the guard.
 */

/** A doctor a patient can book. */
export type PublicDoctor = {
  id: string;
  name: string;
  speciality: string;
  /** The fee for a visit in the clinic. */
  feeInClinic: number;
  /** The fee for a video consultation. */
  feeOnline: number;
  /** The room the doctor works in. */
  room: string;
};

/** A time the patient can take. */
export type PublicSlot = {
  /** The time, as the patient reads it. */
  label: string;
  /** When it is, as an ISO timestamp. */
  startsAt: string;
  /** Whether the slot is still free. */
  free: boolean;
};

/** The clinic, as the patient sees it. */
export type PublicClinic = {
  name: string;
  city: string;
  address: string;
  phone: string;
  /** The slug the booking link carries. */
  slug: string;
};

/** What the booking page shows. */
export type PublicBookingPage = {
  clinic: PublicClinic;
  doctors: PublicDoctor[];
  /** The times, for the doctor chosen. */
  slots: PublicSlot[];
  /** The day the slots are for. */
  day: string;
  /** The next free time, in the patient's words. */
  nextFree: string | null;
};

/** What the patient types to book. */
export type BookPayload = {
  clinic: string;
  doctorId: string;
  startsAt: string;
  name: string;
  phone: string;
  age: string;
  sex: string;
  reason: string;
};

/** What the API answers with when the booking is made. */
export type BookResult = {
  /**
   * The link key — the random secret that lives in the URL.
   *
   * It is not a queue number and must never be shown as one.
   */
  token: string;
  /** The queue slip — the short number the desk reads out. */
  queueToken: string;
  /** The link the patient keeps, to track their turn. */
  liveUrl: string;
  /** The link to fill the symptoms form in. */
  intakeUrl: string;
  startsAt: string;
  doctor: string;
  clinic: string;
};

/** The patient's place in the queue. */
export type LiveToken = {
  /** The queue slip, in the patient's words — "A-016", not the link key. */
  token: string;
  /** The patient's name. */
  patient: string;
  /** Where they are in the queue. */
  position: number;
  /** How many people are ahead. */
  ahead: number;
  /** The room the patient is called to. */
  room: string;
  /** The doctor the patient is seeing. */
  doctor: string;
  /** What the patient still has to pay at the desk. */
  due: number;
  /** The link to the prescription, once the doctor has signed it. */
  prescriptionUrl: string | null;
  /** Whether the doctor has called the patient. */
  called: boolean;
  /** When the page last checked. */
  updatedAt: string;
};

/** The symptoms form. */
export type IntakeForm = {
  /** The patient's name. */
  patient: string;
  /** Whether the patient has already filled it in. */
  filled: boolean;
  /** The symptoms the patient chose. */
  symptoms: string[];
  /** The red flags — the things that need a doctor now. */
  redFlags: string[];
  /** What the patient wrote in their own words. */
  notes: string;
  /** How long the patient has had it. */
  duration: string;
  /** Whether the form is still open. */
  open: boolean;
};

/** What the API answers with when the form is sent. */
export type IntakeResult = {
  token: string;
  filled: boolean;
  submittedAt: string;
};

/** A verified prescription, as the patient reads it. */
export type VerifiedPrescription = {
  /** The prescription's number. */
  id: string;
  /** Whether the document has been changed since it was signed. */
  genuine: boolean;
  /** The doctor who signed it. */
  doctor: { name: string; registration: string; speciality: string };
  /** When it was signed. */
  signedAt: string;
  /** The patient it is for. */
  patient: { name: string; age: number; sex: string };
  /** The diagnoses. */
  diagnoses: Array<{ code: string; label: string }>;
  /** The medicines, each with its dose. */
  medicines: Array<{ name: string; dose: string; when: string; forDays: string }>;
  /** Whether the signature is a real one. */
  signatureMode: string | null;
  /** The queue slip the prescription belongs to. */
  visitToken: string;
};
