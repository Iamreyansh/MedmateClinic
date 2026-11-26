import { apiPost } from "@/services/api";
import type { Form } from "@/features/onboarding/types";

/**
 * The code the owner checks before the clinic is created.
 *
 * The service holds the number until the clinic exists, so the number can be
 * checked before there is a clinic to check it against. The service's own
 * rules hold here as they do everywhere else: a code is spent after a few
 * tries, and a number waits before it may ask for another one.
 */
export type PreSignupCode = {
  sent: boolean;
  /** The code itself, in test mode — the only way a developer can finish. */
  code?: string;
};

/** Ask the service to send a code to the owner's number. */
export const requestPreSignupCode = (mobile: string) =>
  apiPost<PreSignupCode>("/auth/otp/pre-signup", { mobile });

/** Ask the service to check the code. */
export const verifyPreSignupCode = (mobile: string, code: string) =>
  apiPost<{ verified: boolean }>("/auth/pre-signup/verify", { mobile, code });

/**
 * The clinic the service created.
 *
 * The service answers with the session, the clinic, and the booking link the
 * clinic hands to its patients. The slug is the service's own — it carries a
 * random tail, so it cannot be guessed, and it is never the clinic's name.
 */
export type SignupResult = {
  accessToken: string;
  clinicId: string;
  clinicName: string;
  bookingSlug: string;
  bookingUrl: string;
  clinic: {
    id: string;
    name: string;
    initials: string;
    bookingSlug: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    registration: string;
    locations: number;
  };
};

/**
 * Sign the clinic up, and the owner in with it.
 *
 * The request is the sign-up form itself — the service collects the same flat
 * object the five steps edit, so there is nothing to map. The service refuses
 * the sign-up unless the number has been checked, so the code step has to
 * have been finished before this is called.
 */
export const signupClinic = (form: Form) => apiPost<SignupResult>("/auth/signup", form);
