import { apiGet, apiPost } from "@/services/api";
import type {
  BookPayload,
  BookResult,
  CancelResult,
  IntakeForm,
  IntakeResult,
  IntakeSubmission,
  LiveToken,
  PublicBookingPage,
  RebookRequest,
  RebookResult,
  VerifiedPrescription,
} from "@/features/patient-web/types";

/**
 * The patient-facing API.
 *
 * These endpoints are public: a patient at the clinic's front door is not
 * staff, and they have no session. The mock answers them without the guard,
 * and the Java service does the same.
 */

/**
 * The booking page: the clinic, its doctors and the times.
 *
 * The times are the service's own. Asking for a doctor brings back that
 * doctor's free slots — the page never works out a time of its own.
 */
export const fetchPublicBooking = (slug: string, doctorId?: string) =>
  apiGet<PublicBookingPage>(
    `/public/doctors?clinic=${encodeURIComponent(slug)}${
      doctorId ? `&doctorId=${encodeURIComponent(doctorId)}` : ""
    }`,
  );

/**
 * Book the visit. The patient gets a link key and two links to keep.
 *
 * The idempotency key makes a double tap safe: a repeat with the same key
 * gets the first booking back instead of a second visit.
 */
export const bookVisit = (payload: BookPayload, idempotencyKey?: string) =>
  apiPost<BookResult>(
    "/public/booking",
    idempotencyKey ? { ...payload, idempotencyKey } : payload,
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
  );

/** The patient's place in the queue. */
export const fetchLiveToken = (token: string) =>
  apiGet<LiveToken>(`/token/${encodeURIComponent(token)}?here=1`);

/** The symptoms form, before the visit. */
export const fetchIntake = (token: string) => apiGet<IntakeForm>(`/intake/${encodeURIComponent(token)}`);

/** Send the symptoms form in. */
export const submitIntake = (token: string, form: IntakeSubmission) =>
  apiPost<IntakeResult>(`/intake/${encodeURIComponent(token)}`, form);

/**
 * Call the booking off.
 *
 * The key is the booking's own key — the one the visit was made with — so a
 * repeat comes back with the first result instead of a second call-off. A
 * fresh key is never minted for this: the service looks the booking's key up
 * on the link itself.
 */
export const cancelBooking = (token: string, idempotencyKey?: string) =>
  apiPost<CancelResult>(
    `/public/booking/${encodeURIComponent(token)}/cancel`,
    undefined,
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
  );

/**
 * Move the booking to another time.
 *
 * The key is the rebook's own — a fresh one for each attempt — and never the
 * booking's: the booking's key belongs to the booking, and overwriting it
 * would let a double tap make a second visit. The same key with the same
 * time comes back with the same answer; the same key with a different time
 * is refused, because that time was taken in the meantime.
 */
export const rebookVisit = (linkKey: string, payload: RebookRequest, idempotencyKey?: string) =>
  apiPost<RebookResult>(
    `/public/booking/${encodeURIComponent(linkKey)}/rebook`,
    payload,
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
  );

/** The prescription, as the patient verifies it. */
export const verifyPrescription = (id: string, hash: string) =>
  apiGet<VerifiedPrescription>(`/verify/${encodeURIComponent(id)}?h=${encodeURIComponent(hash)}`);
