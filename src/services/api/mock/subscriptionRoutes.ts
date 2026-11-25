/**
 * The subscription.
 *
 * The plan the clinic is on, the trial it is in, and what it has used. The
 * usage is counted from the clinic's own work, so it moves with the clinic.
 */

import { mock } from "@/services/api/mock/router";
import { requireSession } from "@/services/api/mock/guard";

/** The plans the clinic can move between. */
const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: 2499,
    summary: "One doctor, one location, everything the doctor needs.",
    includes: ["Unlimited prescriptions", "SMS and ABHA delivery", "Daily backup"],
    avoids: ["Multiple doctors", "The lab and the kiosk"],
  },
  {
    id: "clinic",
    name: "Clinic",
    price: 4999,
    summary: "The whole clinic — desk, till, lab, kiosk and every doctor.",
    includes: [
      "Everything in Solo",
      "Billing and the point of sale",
      "The lab, the kiosk and the nurse station",
      "Reports and the audit log",
    ],
    avoids: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    summary: "Several locations, so the price is worked out for the shape of it.",
    includes: ["Everything in Clinic", "Multiple locations", "A named account manager"],
    avoids: [],
  },
];

export function registerSubscriptionRoutes() {
  mock.on("GET", "/clinic/subscription", () => {
    requireSession();
    return {
      state: "trial",
      planName: "Clinic",
      planId: "clinic",
      trialDaysLeft: 12,
      trialEndsOn: "2026-12-07",
      renewalOn: null,
      usage: [
        { label: "Prescriptions this month", used: 214, limit: 500 },
        { label: "Storage", used: 3, limit: 10 },
        { label: "SMS credits", used: 68, limit: 200 },
      ],
      plans: PLANS,
      lastPayment: null,
      clinic: { name: "MedMate Clinic", email: "accounts@medmate.in" },
    };
  });

  mock.on("POST", "/clinic/subscription/checkout", (body) => {
    requireSession();
    const request = body as { plan?: string; amount?: number; method?: string };
    return {
      status: "paid",
      plan: request.plan ?? "clinic",
      amount: request.amount ?? 0,
      method: request.method ?? "upi",
      paidAt: new Date().toISOString(),
    };
  });

  mock.on("POST", "/clinic/subscription/enquiry", (body) => {
    requireSession();
    const request = body as { clinic?: string };
    return { received: true, on: new Date().toISOString(), clinic: request.clinic ?? "" };
  });

  mock.on("POST", "/clinic/subscription/payments", (body) => {
    requireSession();
    const request = body as { provider?: string; keyId?: string };
    return {
      connected: true,
      provider: request.provider ?? "razorpay",
      keyId: request.keyId ?? "",
    };
  });
}
