import { apiGet, apiPost } from "@/services/api";
import type { PublicBookingPage } from "@/features/patient-web/types";
import type {
  ClinicSettingsPayload,
  InboxPayload,
  PreSignupCodeResult,
  PreSignupVerifyResult,
  RebookRequest,
  RebookResult,
  SignupRequest,
  SignupResult,
  TeleconsultPayload,
  TemplatesPayload,
} from "@/mobile/types";

/**
 * The endpoints the mobile screens talk to that no feature module owns.
 *
 * The rest of the app's API is called through the shell's bridge, so the
 * phone and the desktop share one binding for every payload shape. What is
 * here is what the mobile app needs on its own: the four screens the
 * desktop reads inline, the sign-up's three calls, and the rebook.
 */

/** The doctor's inbox. */
export const fetchInbox = () => apiGet<InboxPayload>("/clinic/inbox");

/**
 * The booking page: the clinic, its doctors and the free times.
 *
 * With no doctor named, the service answers with its default doctor's times.
 * With a doctor named, it answers with that doctor's times and their `free`
 * flags, so the times a patient is shown are always the times of the doctor
 * they are about to book.
 *
 * The patient-web module's `fetchPublicBooking` does not take a doctor yet,
 * so the call is written here with the same URL and query string. When the
 * two meet on the merged tree this can be collapsed into one function.
 */
export const fetchPublicBookingFor = (slug: string, doctorId?: string) =>
  apiGet<PublicBookingPage>(
    `/public/doctors?clinic=${encodeURIComponent(slug)}${
      doctorId ? `&doctorId=${encodeURIComponent(doctorId)}` : ""
    }`,
  );

/** The teleconsult waiting room. */
export const fetchTeleconsult = () => apiGet<TeleconsultPayload>("/clinic/teleconsult");

/** The doctor's saved templates. */
export const fetchTemplates = () => apiGet<TemplatesPayload>("/clinic/templates");

/** The clinic's own card, its branches and its services. */
export const fetchClinicSettings = () => apiGet<ClinicSettingsPayload>("/clinic/settings");

/**
 * Send the code to a mobile number that is not yet a clinic's.
 *
 * The service cannot verify a phone before the clinic exists, so the
 * sign-up has its own pre-verification. It mirrors `/auth/otp` exactly.
 */
export const requestPreSignupCode = (mobile: string) =>
  apiPost<PreSignupCodeResult>("/auth/otp/pre-signup", { mobile });

/**
 * Check the code and mark the mobile as verified.
 *
 * The sign-up will not go through until this has succeeded for the same
 * number, and the service spends the verification when it does.
 */
export const verifyPreSignupCode = (mobile: string, code: string) =>
  apiPost<PreSignupVerifyResult>("/auth/pre-signup/verify", { mobile, code });

/**
 * Sign the clinic up.
 *
 * The service answers with the owner's session, so the person who signs up
 * is signed in, and with the clinic's booking link — the slug is the
 * service's, never one worked out on the phone.
 */
export const signUpClinic = (payload: SignupRequest) =>
  apiPost<SignupResult>("/auth/signup", payload);

/**
 * Move a booking to another time.
 *
 * The old booking is called off and the new one takes its place; the link
 * key does not change, so the links the patient was given keep working.
 */
export const rebookVisit = (linkKey: string, payload: RebookRequest) =>
  apiPost<RebookResult>(`/public/booking/${encodeURIComponent(linkKey)}/rebook`, payload);
