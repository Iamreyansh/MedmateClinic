import { apiGet, apiPost } from "@/services/api";
import type {
  BookPayload,
  BookResult,
  IntakeForm,
  IntakeResult,
  LiveToken,
  PublicBookingPage,
  VerifiedPrescription,
} from "@/features/patient-web/types";

/**
 * The patient-facing API.
 *
 * These endpoints are public: a patient at the clinic's front door is not
 * staff, and they have no session. The mock answers them without the guard,
 * and the Java service does the same.
 */

/** The booking page: the clinic, its doctors and the times. */
export const fetchPublicBooking = (slug: string) =>
  apiGet<PublicBookingPage>(`/public/doctors?clinic=${encodeURIComponent(slug)}`);

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
export const submitIntake = (token: string, form: { symptoms: string[]; redFlags: string[]; notes: string; duration: string }) =>
  apiPost<IntakeResult>(`/intake/${encodeURIComponent(token)}`, form);

/**
 * Call the booking off.
 *
 * The service has no endpoint for it yet; the mock answers, and the name is
 * `POST /api/public/booking/{linkKey}/cancel`.
 */
export const cancelBooking = (token: string) =>
  apiPost<{ cancelled: boolean; token: string }>(
    `/public/booking/${encodeURIComponent(token)}/cancel`,
  );

/** The prescription, as the patient verifies it. */
export const verifyPrescription = (id: string, hash: string) =>
  apiGet<VerifiedPrescription>(`/verify/${encodeURIComponent(id)}?h=${encodeURIComponent(hash)}`);
