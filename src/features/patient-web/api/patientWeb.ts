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

/** Book the visit. The patient gets a token and two links to keep. */
export const bookVisit = (payload: BookPayload) =>
  apiPost<BookResult>("/public/booking", payload);

/** The patient's place in the queue. */
export const fetchLiveToken = (token: string) =>
  apiGet<LiveToken>(`/token/${encodeURIComponent(token)}?here=1`);

/** The symptoms form, before the visit. */
export const fetchIntake = (token: string) => apiGet<IntakeForm>(`/intake/${encodeURIComponent(token)}`);

/** Send the symptoms form in. */
export const submitIntake = (token: string, form: { symptoms: string[]; redFlags: string[]; notes: string; duration: string }) =>
  apiPost<IntakeResult>(`/intake/${encodeURIComponent(token)}`, form);

/** The prescription, as the patient verifies it. */
export const verifyPrescription = (id: string, hash: string) =>
  apiGet<VerifiedPrescription>(`/verify/${encodeURIComponent(id)}?h=${encodeURIComponent(hash)}`);
