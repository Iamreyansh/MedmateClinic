/**
 * The activity log.
 *
 * Who did what, and when. The clinic's staff see it under Staff & roles, so
 * a record that was opened, a prescription that was signed and a bill that was
 * paid are all traceable.
 *
 * The shape is the one the Java service sends: a list of events and the count
 * of them, each event with the person, the role and the moment.
 */

import { mock } from "@/services/api/mock/router";
import { requireSession } from "@/services/api/mock/guard";

export type MockActivityEvent = {
  id: string;
  action: string;
  category: string;
  resourceType: string;
  resourceId: string;
  actor: string | null;
  role: string | null;
  detail: string;
  ip: string | null;
  at: string;
};

/** The log the clinic keeps. */
const EVENTS: MockActivityEvent[] = [
  {
    id: "evt_0001",
    action: "prescription.signed",
    category: "prescription",
    resourceType: "prescription",
    resourceId: "rx_vs_kavya",
    actor: "stf_ananya",
    role: "doctor",
    detail: "Signed the prescription for Kavya Nair",
    ip: "10.0.0.7",
    at: "2026-11-25T10:55:00Z",
  },
  {
    id: "evt_0002",
    action: "invoice.paid",
    category: "billing",
    resourceType: "invoice",
    resourceId: "inv_0148",
    actor: "stf_reception",
    role: "front_desk",
    detail: "Collected Rs.500 by UPI",
    ip: "10.0.0.9",
    at: "2026-11-25T11:06:00Z",
  },
  {
    id: "evt_0003",
    action: "record.opened",
    category: "patient",
    resourceType: "patient",
    resourceId: "pt_kavya",
    actor: "stf_ananya",
    role: "doctor",
    detail: "Opened the patient record",
    ip: "10.0.0.7",
    at: "2026-11-25T09:58:00Z",
  },
  {
    id: "evt_0004",
    action: "patient.checked_in",
    category: "visit",
    resourceType: "visit",
    resourceId: "vs_meera",
    actor: "stf_reception",
    role: "front_desk",
    detail: "Checked in at the counter with token W-01",
    ip: "10.0.0.9",
    at: "2026-11-25T09:12:00Z",
  },
  {
    id: "evt_0005",
    action: "vitals.recorded",
    category: "vitals",
    resourceType: "visit",
    resourceId: "vs_meera",
    actor: "stf_mary",
    role: "nurse",
    detail: "Recorded the vitals and sent the patient to Dr. Ananya Rao",
    ip: "10.0.0.11",
    at: "2026-11-25T09:20:00Z",
  },
];

export function registerActivityRoutes() {
  mock.on("GET", "/clinic/activity", (_body, context) => {
    requireSession();
    const person = context.query.get("person");
    const category = context.query.get("category");

    const events = EVENTS.filter((event) => {
      if (person && event.actor !== person) return false;
      if (category && event.category !== category) return false;
      return true;
    });

    return { events, count: events.length };
  });
}
