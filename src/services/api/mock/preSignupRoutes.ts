/**
 * The phone check before a clinic signs up.
 *
 * The same shapes as the ordinary one-time code: a code comes back in
 * development, the code is checked against what was sent, a number cannot be
 * asked for again for thirty seconds, and five wrong tries end the wait.
 */

import { mock } from "@/services/api/mock/router";

/** The wait between two codes for the same number. */
const RESEND_COOLDOWN_MS = 30_000;

/** How many wrong tries a number gets. */
const MAX_ATTEMPTS = 5;

/** How long a code is good for. */
const EXPIRY_MS = 5 * 60_000;

type Pending = {
  code: string;
  sentAt: number;
  attempts: number;
};

const pending = new Map<string, Pending>();

/** The digits of a number, the way the service stores it. */
function digits(mobile: string): string {
  const value = (mobile ?? "").replace(/\D/g, "");
  if (value.length === 12 && value.startsWith("91")) return value.slice(2);
  return value;
}

function sixDigits(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function registerPreSignupRoutes() {
  mock.on("POST", "/auth/otp/pre-signup", (body) => {
    const mobile = digits(String((body as Record<string, unknown> | null)?.mobile ?? ""));
    if (mobile.length !== 10) {
      throw new Error("A mobile number is ten digits.");
    }
    const now = Date.now();
    const existing = pending.get(mobile);
    if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
      throw new Error(`Please wait ${seconds} seconds before asking for another code.`);
    }
    const code = sixDigits();
    pending.set(mobile, { code, sentAt: now, attempts: 0 });
    return { sent: true, code };
  });

  mock.on("POST", "/auth/pre-signup/verify", (body) => {
    const mobile = digits(String((body as Record<string, unknown> | null)?.mobile ?? ""));
    const code = String((body as Record<string, unknown> | null)?.code ?? "").trim();
    if (mobile.length !== 10) {
      throw new Error("A mobile number is ten digits.");
    }
    const existing = pending.get(mobile);
    if (!existing) {
      throw new Error("Please ask for a code first.");
    }
    if (Date.now() - existing.sentAt > EXPIRY_MS) {
      pending.delete(mobile);
      throw new Error("That code has expired. Please ask for another one.");
    }
    if (existing.attempts >= MAX_ATTEMPTS) {
      pending.delete(mobile);
      throw new Error("Too many wrong tries. Please ask for a new code.");
    }
    if (existing.code !== code) {
      existing.attempts += 1;
      throw new Error("That code is not right.");
    }
    pending.delete(mobile);
    return { verified: true };
  });
}
