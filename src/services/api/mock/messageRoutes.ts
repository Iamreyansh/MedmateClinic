/**
 * The messages the clinic sent to its patients.
 *
 * Every message the clinic sends is logged: the token SMS, the reminder the
 * morning before, the prescription link and the payment receipt. A message
 * that failed can be sent again from the same log.
 *
 * The shapes are the ones the Java service sends: the counts are keyed by the
 * kind of message, and each card carries the patient it went to.
 */

import { mock } from "@/services/api/mock/router";
import { restorableArray } from "@/services/api/mock/reset";
import { requireSession } from "@/services/api/mock/guard";
import { patients } from "@/services/api/mock/state";

/** The kinds of message the clinic sends. */
export type MockMessageKind = "token" | "reminder" | "prescription" | "payment";

export type MockMessage = {
  id: string;
  kind: MockMessageKind;
  channel: "sms" | "whatsapp" | "email";
  template: string;
  body: string;
  status: "sent" | "delivered" | "failed";
  sentAt: string;
  patientId: string;
};

/** The log the clinic keeps. */
const MESSAGES: MockMessage[] = restorableArray([
  {
    id: "msg_0001",
    kind: "token",
    channel: "sms",
    template: "queue-token",
    body: "Your token at MedMate Clinic is W-01. You are 1st in the queue.",
    status: "delivered",
    sentAt: "2026-11-25T09:12:00Z",
    patientId: "pt_kavya",
  },
  {
    id: "msg_0002",
    kind: "reminder",
    channel: "sms",
    template: "visit-reminder",
    body: "Reminder: your visit with Dr. Ananya Rao is tomorrow at 10:30 am.",
    status: "sent",
    sentAt: "2026-11-25T09:14:00Z",
    patientId: "pt_kavya",
  },
  {
    id: "msg_0003",
    kind: "prescription",
    channel: "sms",
    template: "prescription-link",
    body: "Your prescription is ready: https://medmate.in/rx/rx_vs_kavya",
    status: "delivered",
    sentAt: "2026-11-25T10:58:00Z",
    patientId: "pt_kavya",
  },
  {
    id: "msg_0004",
    kind: "payment",
    channel: "whatsapp",
    template: "payment-receipt",
    body: "Payment received: Rs.500 for the consultation. MCI/0001.",
    status: "failed",
    sentAt: "2026-11-25T11:05:00Z",
    patientId: "pt_diya",
  },
  {
    id: "msg_0005",
    kind: "token",
    channel: "sms",
    template: "queue-token",
    body: "Your token at MedMate Clinic is B-04. Please wait in the lounge.",
    status: "sent",
    sentAt: "2026-11-25T11:30:00Z",
    patientId: "pt_diya",
  },
]);

/** The card, as the log shows it. */
function card(message: MockMessage) {
  const person = patients.find((entry) => entry.id === message.patientId);
  return {
    id: message.id,
    kind: message.kind,
    channel: message.channel,
    template: message.template,
    body: message.body,
    status: message.status,
    failed: message.status === "failed",
    sentAt: message.sentAt,
    canResend: true,
    patient: {
      id: person?.id ?? message.patientId,
      name: person?.name ?? "",
      phone: person?.phone ?? "",
      initials: person?.initials ?? "",
    },
  };
}

export function registerMessageRoutes() {
  // The log, with the counts the filter chips show.
  mock.on("GET", "/clinic/messages", (_body, context) => {
    requireSession();
    const wanted = context.query.get("filter") ?? "all";

    const counts: Record<string, number> = { all: MESSAGES.length };
    for (const kind of ["token", "reminder", "prescription", "payment"] as const) {
      counts[kind] = MESSAGES.filter((message) => message.kind === kind).length;
    }
    counts.failed = MESSAGES.filter((message) => message.status === "failed").length;

    const items =
      wanted === "all" || wanted === "failed"
        ? MESSAGES.filter(
            (message) => wanted === "all" || (wanted === "failed" && message.status === "failed"),
          )
        : MESSAGES.filter((message) => message.kind === wanted);

    return { counts, filter: wanted, items: items.map(card) };
  });

  // Send it again.
  mock.on("POST", "/clinic/messages/:id/resend", (_body, context) => {
    requireSession();
    const message = MESSAGES.find((entry) => entry.id === context.params.id);
    if (!message) throw new Error("That message is no longer in the log.");
    message.status = "sent";
    message.sentAt = new Date().toISOString();
    return card(message);
  });
}
