import { env } from "@/config/env";

/**
 * The test-mode strip.
 *
 * The clinic's signatures, its ABDM links and its payments are not real while
 * the service is in test mode, and a person reading a prescription on a
 * tablet has no way to know that. So the app says so, at the top, for as
 * long as it is true.
 */
export function TestModeBanner() {
  if (!env.testMode) return null;

  return (
    <div className="test-banner" role="status">
      Test mode for eSign, ABDM, payments: signatures and payments here are not real. Add the live
      keys before treating patients.
    </div>
  );
}
