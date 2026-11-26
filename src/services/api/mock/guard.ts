import { ApiError, auth } from "@/services/api/client";

/**
 * The session guard.
 *
 * Every endpoint behind the session refuses the call when there is no token,
 * so a screen that forgets the session shows a sign-in rather than an empty
 * page.
 */
export function requireSession(): void {
  if (!auth.get()) {
    // The service's own envelope for a missing session: a 401, with a title
    // the screen can show and a sentence a person can read.
    throw new ApiError(401, "Please sign in again.", undefined, "api", "Please sign in");
  }
}
