import { apiPost } from "@/services/api";

/**
 * Connect the clinic's own payment keys.
 *
 * The keys belong to the clinic, so the money goes straight to the clinic
 * rather than through us. The secret is written once and never read back.
 */
export const connectPayments = (keys: { provider: string; keyId: string; secret: string }) =>
  apiPost<{ connected: boolean; provider: string; keyId: string }>(
    "/clinic/subscription/payments",
    keys,
  );
