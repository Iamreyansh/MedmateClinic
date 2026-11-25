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
    price: 9990,
    summary: "For a doctor running their own clinic",
    includes: [
      "1 doctor, 1 location, up to 3 staff",
      "Queue, kiosk check-in and patient token SMS",
      "Doctor Console with suggestions and safety checks",
      "Signed e-prescriptions (FHIR, ABDM-ready)",
      "Billing with GST-compliant bills and UPI",
      "Appointments, online booking page and reminders",
      "Patient records, templates and certificates",
    ],
    avoids: [],
  },
  {
    id: "clinic",
    name: "Clinic",
    price: 24990,
    summary: "For polyclinics and growing practices",
    includes: [
      "Up to 5 doctors, 3 locations and 20 staff",
      "Everything in Solo",
      "Nurse station, lab desk and reception desk",
      "Teleconsultation with video and phone",
      "Send prescriptions to the patient's chosen pharmacy",
      "Reports: money, patients, waiting times, follow-ups",
      "Doctor revenue share and activity log",
    ],
    avoids: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    summary: "For hospitals, chains and special needs",
    includes: [
      "Any number of doctors and locations",
      "Everything in Clinic",
      "Your own database in an Indian region",
      "Connections to your lab, pharmacy or hospital systems",
      "Single sign-on and custom roles",
      "Guided onboarding and staff training",
      "Agreed uptime and a named support manager",
    ],
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
      trialDaysLeft: 14,
      trialEndsOn: "2026-12-07",
      renewalOn: null,
      usage: [
        { label: "Doctors", used: 1, limit: 5 },
        { label: "Locations", used: 1, limit: 3 },
        { label: "Staff", used: 0, limit: 20 },
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
