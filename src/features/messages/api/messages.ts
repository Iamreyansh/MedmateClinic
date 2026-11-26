import { apiGet, apiPost } from "@/services/api";

/**
 * The patient-facing web messages.
 *
 * Every message the clinic sends to a patient is logged — the token SMS, the
 * reminder the morning before, the prescription link and the receipt. A
 * message that failed can be sent again from the same log.
 */

/** The kinds of message the clinic sends. */
export type MessageKind = "token" | "reminder" | "prescription" | "payment";

export type MessageCard = {
  id: string;
  kind: MessageKind;
  /** How it went out — SMS, WhatsApp or email. */
  channel: string;
  /** The wording it used. */
  template: string;
  /** What it said. */
  body: string;
  /** `sent`, `delivered` or `failed`. */
  status: string;
  /** Whether it failed, which is the same thing said plainly. */
  failed: boolean;
  sentAt: string;
  /** Whether it may be sent again. */
  canResend: boolean;
  patient: { id: string; name: string; phone: string; initials: string };
};

export type MessagesPayload = {
  /** How many of each kind there are. */
  counts: Record<string, number>;
  /** The filter the log was read with. */
  filter: string;
  items: MessageCard[];
};

/** The log, with the counts the filter chips show. */
export const fetchMessages = (filter?: string) =>
  apiGet<MessagesPayload>(`/clinic/messages${filter && filter !== "all" ? `?filter=${filter}` : ""}`);

/** Send it again. */
export const resendMessage = (id: string) =>
  apiPost<MessageCard>(`/clinic/messages/${encodeURIComponent(id)}/resend`);
