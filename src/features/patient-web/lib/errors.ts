import { ApiError } from "@/services/api";

/**
 * How a patient screen failed, in the terms the screen acts on.
 *
 * The API's own client has already decided that a message is safe to show —
 * a server's internals never reach here. What this adds is the reading of
 * the status: a link the clinic has to replace is not the same as a service
 * that is not answering, and the screen treats them differently.
 */
export type PatientFailure = {
  /** The words the patient reads. */
  message: string;
  /** The service's own heading, when it wrote one for a person. */
  title?: string;
  /** The service could not be reached at all. */
  unreachable: boolean;
  /** The link is one the clinic has to replace. */
  invalidLink: boolean;
  /** The time the patient picked was taken in the meantime. */
  conflict: boolean;
};

/** The words for a link the clinic has to replace. */
const INVALID_LINK = "This link is no longer valid. Ask the clinic for a new link.";

/** The words for a booking link that is not this clinic's. */
const INVALID_BOOKING_LINK = "This booking link is not valid. Ask the clinic for a new link.";

/** The words for a service that is not answering. */
const UNREACHABLE = "We could not reach the clinic. Check your connection and try again.";

/**
 * What a failed request means to a patient.
 *
 * @param reason What the request threw.
 * @param fallback The words to use when the service said nothing a patient can read.
 * @param kind Whether the screen is behind a link the clinic gave, or the
 * clinic's own booking page.
 */
export function patientFailure(
  reason: unknown,
  fallback: string,
  kind: "link" | "booking" = "link",
): PatientFailure {
  if (reason instanceof ApiError) {
    if (reason.kind === "service" || reason.status === 0) {
      return { message: UNREACHABLE, unreachable: true, invalidLink: false, conflict: false };
    }
    if (reason.status === 404) {
      return {
        message: kind === "booking" ? INVALID_BOOKING_LINK : INVALID_LINK,
        unreachable: false,
        invalidLink: true,
        conflict: false,
      };
    }
    if (reason.status === 409) {
      // the service wrote this one for a person: the time was taken
      return {
        message: reason.message,
        title: reason.title,
        unreachable: false,
        invalidLink: false,
        conflict: true,
      };
    }
    if (reason.status >= 400 && reason.status < 500) {
      // the service wrote this one for a person too — a missing name, a
      // number that is not a number
      return { message: reason.message, unreachable: false, invalidLink: false, conflict: false };
    }
  }
  return { message: fallback, unreachable: false, invalidLink: false, conflict: false };
}
