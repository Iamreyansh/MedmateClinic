import { auth } from "@/services/api/client";

/**
 * The session guard.
 *
 * Every endpoint behind the session refuses the call when there is no token,
 * so a screen that forgets the session shows a sign-in rather than an empty
 * page.
 */
export function requireSession(): void {
  if (!auth.get()) {
    throw new Error("Please sign in again.");
  }
}
