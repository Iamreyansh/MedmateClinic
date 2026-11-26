/**
 * What the app remembers between reloads.
 *
 * A patient on a phone will reload the page — and a link that forgets what
 * it was for is a link that has to be asked for again. The booking's own
 * idempotency key is kept with it, because the call-off sends that key: the
 * service looks it up on the link and answers with the first result, so a
 * second tap shows the same thing instead of a second call-off.
 */

/** Where the bookings are kept between reloads. */
const BOOKING_KEY = "medmate.patient.bookings";

/** Where the clinic the patient opened is kept between reloads. */
const CLINIC_KEY = "medmate.patient.clinic";

/** What the app remembers about one booking. */
export type RememberedBooking = {
  /** The link key — the secret in the URL. It is never shown. */
  linkKey: string;
  /** The booking's own idempotency key — the call-off sends this. */
  idempotencyKey: string;
  /** The queue slip — the short number the desk reads out. */
  queueToken: string;
  /** The doctor the patient is seeing. */
  doctor: string;
  /** The clinic the visit is at. */
  clinic: string;
  /** When the visit starts. */
  startsAt: string;
};

/** The bookings, as they were left. */
function readAll(): Record<string, RememberedBooking> {
  try {
    const raw = window.sessionStorage.getItem(BOOKING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RememberedBooking>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Keep a booking for the next reload. */
export function rememberBooking(booking: RememberedBooking): void {
  try {
    const all = readAll();
    all[booking.linkKey] = booking;
    window.sessionStorage.setItem(BOOKING_KEY, JSON.stringify(all));
  } catch {
    // the browser will not let us keep it — the patient can still book
  }
}

/** What is remembered about one booking, if anything is. */
export function readBooking(linkKey: string): RememberedBooking | null {
  if (!linkKey) return null;
  return readAll()[linkKey] ?? null;
}

/** Keep the clinic the patient opened, so the next link carries it. */
export function rememberClinic(slug: string): void {
  if (!slug) return;
  try {
    window.sessionStorage.setItem(CLINIC_KEY, slug);
  } catch {
    // the browser will not let us keep it
  }
}

/** The clinic the patient opened, if it is known. */
export function readClinic(): string {
  try {
    return window.sessionStorage.getItem(CLINIC_KEY) ?? "";
  } catch {
    return "";
  }
}
