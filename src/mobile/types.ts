import type { IconName } from "@/components/ui/Icon";

/**
 * The mobile screens' own types.
 *
 * The shapes that another feature already owns are imported from that
 * feature through the shell's bridge — the queue, the till, the patient
 * record, the public booking page. What is here is what the mobile app
 * talks to on its own: the endpoints no feature module owns, and the
 * sign-up's own three calls.
 */

/** The inbox, as the doctor's phone shows it. */
export type InboxItem = {
  id: string;
  kind: "Result" | "Referral" | "Handover";
  patient: { id: string; name: string; age: number; sex: string; initials?: string };
  title: string;
  body: string;
  time: string;
  critical?: boolean;
};

export type InboxPayload = {
  items: InboxItem[];
  counts: Record<string, number>;
  meta: string;
};

/** The teleconsult waiting room. */
export type WaitingPatient = {
  patient: { id: string; name: string; age: number; sex: string; initials?: string };
  booked: string;
  reason: string;
  state: "Joined" | "Link sent";
};

export type ConsentItem = { label: string; detail: string };

export type TeleconsultPayload = {
  waiting: WaitingPatient[];
  consent: ConsentItem[];
  meta: string;
};

/** One of the doctor's saved templates. */
export type Template = {
  id: string;
  name: string;
  code: string;
  condition: string;
  lines: string[];
  used: number;
};

export type TemplatesPayload = {
  items: Template[];
  meta: string;
};

/** The clinic's own settings card. */
export type ClinicSettingsPayload = {
  clinic: {
    id?: string;
    name: string;
    initials?: string;
    bookingSlug?: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    registration: string;
    hfrId: string;
    hfr?: string;
    locations: number;
    pin: string;
  };
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    rooms: number;
    hfrId: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    /** The service the service does. */
    speciality?: string;
    durationMinutes?: number;
    price?: number;
  }>;
};

/** The code the sign-up sends to a mobile that is not yet a clinic's. */
export type PreSignupCodeResult = {
  sent: boolean;
  /** Only in dev mode — the service exposes the code so a tester can sign up. */
  code?: string;
};

/** The answer to a pre-signup verification. */
export type PreSignupVerifyResult = {
  verified: boolean;
};

/**
 * What the sign-up collects.
 *
 * The field names are the service's: the form is one flat object and every
 * step edits it.
 */
export type SignupRequest = {
  name: string;
  mobile: string;
  email: string;
  clinicName: string;
  clinicKind: string;
  registeredUnder: string;
  regNumber: string;
  validUntil: string;
  clinicEmail: string;
  gstin: string;
  pan: string;
  locName: string;
  street: string;
  area: string;
  city: string;
  pin: string;
  state: string;
  phone: string;
  rooms: string;
  hfr: string;
  role: string;
  hpr: string;
  doctorName: string;
  doctorQual: string;
  doctorReg: string;
  speciality: string;
  fee: string;
  videoFee: string;
  signing: string;
};

/** What the sign-up answers with. */
export type SignupResult = {
  /** The new owner's session — the sign-up signs them in. */
  accessToken: string;
  clinicId: string;
  clinicName: string;
  /**
   * The slug the clinic's booking link carries.
   *
   * It comes from the service and is never worked out on the phone: the
   * service appends a random tail to the clinic's name, so the link cannot
   * be guessed from the name.
   */
  bookingSlug: string;
  bookingUrl: string;
  clinic: { id: string; name: string; initials: string; locations: number; doctors: number };
};

/**
 * The answer to a rebook.
 *
 * The link key does not change when a visit is moved, so the two links the
 * patient was given still work and are not repeated here.
 */
export type RebookResult = {
  cancelled: boolean;
  /** The queue slip — "A-016". The link key is never shown. */
  queueToken: string;
  startsAt: string;
  doctor: string;
  clinic: string;
};

/** What a rebook asks for. */
export type RebookRequest = {
  doctorId?: string;
  /** The day, as "YYYY-MM-DD". */
  date: string;
  /** The time, as "HH:mm". */
  slot: string;
};

/** The free times a doctor has, as the booking page shows them. */
export type SlotChoice = {
  label: string;
  startsAt: string;
  free: boolean;
};

/** A row the mobile screens draw: an icon, a title, a line under it. */
export type MobileLink = {
  icon: IconName;
  title: string;
  body: string;
  href: string;
};
