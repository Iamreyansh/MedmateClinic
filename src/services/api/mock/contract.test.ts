/**
 * The contract between the app and the mock.
 *
 * Every path the app calls must be answered by the mock. This is the test
 * that catches the class of bug where a screen asks for an endpoint nobody
 * registered: the mock throws at runtime, the screen shows an error, and
 * nothing says why.
 *
 * The list below is the app's own API surface. When a new screen calls a new
 * endpoint, it goes here too.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mock } from "@/services/api/mock/router";
import { auth } from "@/services/api/client";
import "@/services/api/mock/routes";

/** The repository root — the Java service lives beside the app. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Every path the app calls, with a path that stands in for a real id. */
const APP_CALLS: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/otp" },
  { method: "POST", path: "/auth/verify" },
  { method: "POST", path: "/auth/unlock" },
  { method: "GET", path: "/me" },
  { method: "GET", path: "/clinic/dashboard" },
  { method: "GET", path: "/clinic/queue" },
  { method: "GET", path: "/clinic/inbox" },
  { method: "GET", path: "/clinic/patients" },
  { method: "GET", path: "/clinic/reports" },
  { method: "GET", path: "/clinic/visits/vs_kavya" },
  { method: "POST", path: "/clinic/visits/vs_kavya/consult" },
  { method: "POST", path: "/clinic/prescriptions/rx_vs_kavya/sign" },
  { method: "GET", path: "/clinic/doctors" },
  { method: "POST", path: "/clinic/check-ins" },
  { method: "GET", path: "/clinic/desk" },
  { method: "POST", path: "/clinic/desk/vs_kavya/checkout" },
  { method: "GET", path: "/clinic/desk/booking-link" },
  { method: "GET", path: "/clinic/billing" },
  { method: "GET", path: "/clinic/billing/inv_0148" },
  { method: "POST", path: "/clinic/billing/inv_0148/pay" },
  { method: "POST", path: "/clinic/billing/inv_0148/refund" },
  { method: "POST", path: "/clinic/billing" },
  { method: "POST", path: "/clinic/billing/close-day" },
  { method: "GET", path: "/clinic/appointments" },
  { method: "POST", path: "/clinic/appointments" },
  { method: "GET", path: "/clinic/subscription" },
  { method: "POST", path: "/clinic/subscription/checkout" },
  { method: "POST", path: "/clinic/subscription/enquiry" },
  { method: "POST", path: "/clinic/subscription/payments" },
  { method: "GET", path: "/clinic/nurse" },
  { method: "GET", path: "/clinic/nurse/doctors" },
  { method: "POST", path: "/clinic/nurse/vitals" },
  { method: "GET", path: "/clinic/lab" },
  { method: "POST", path: "/clinic/lab/results" },
  { method: "POST", path: "/clinic/lab/orders/lo_kavya_cbc" },
  { method: "GET", path: "/kiosk" },
  { method: "POST", path: "/kiosk/open" },
  { method: "POST", path: "/kiosk/close" },
  { method: "POST", path: "/kiosk/code" },
  { method: "POST", path: "/kiosk/verify" },
  { method: "POST", path: "/kiosk/patient" },
  { method: "POST", path: "/kiosk/doctor" },
  { method: "POST", path: "/kiosk/pay" },
  { method: "POST", path: "/kiosk/token" },
  { method: "POST", path: "/kiosk/reset" },
  { method: "POST", path: "/kiosk/language" },
  { method: "GET", path: "/public/doctors" },
  { method: "POST", path: "/public/booking" },
  { method: "GET", path: "/token/A-014" },
  { method: "GET", path: "/intake/A-014" },
  { method: "POST", path: "/intake/A-014" },
  { method: "GET", path: "/verify/rx_vs_kavya" },
];

/** Sign in, so the endpoints behind the session answer. */
async function signIn() {
  const otp = (await mock.handle("POST", "/auth/otp", { phone: "9845012345" })) as {
    code: string;
  };
  await mock.handle("POST", "/auth/verify", { phone: "9845012345", code: otp.code });
}

beforeEach(() => {
  // each test starts with no session, so the guard is really tested
  auth.set(null);
});

describe("the mock answers every path the app calls", () => {
  it.each(APP_CALLS)("answers $method $path", ({ method, path }) => {
    expect(mock.has(method, path)).toBe(true);
  });

  it("registers no duplicate method and path", () => {
    const seen = new Set<string>();
    for (const route of mock.paths()) {
      const key = `${route.method} ${route.path}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe("the mock's paths", () => {
  it("matches a path with a parameter", () => {
    expect(mock.has("GET", "/clinic/visits/vs_kavya")).toBe(true);
    expect(mock.has("GET", "/clinic/visits/anything-else")).toBe(true);
    expect(mock.has("GET", "/clinic/visits")).toBe(false);
  });

  it("ignores the query string when matching", () => {
    expect(mock.has("GET", "/clinic/reports?tab=summary&from=2026-11-01")).toBe(true);
  });

  it("does not match a different method", () => {
    expect(mock.has("POST", "/clinic/reports")).toBe(false);
  });
});

/**
 * The Java service and the mock must answer the same paths.
 *
 * The mock is a stand-in for the service, so a path in one and not the other
 * is a screen that works against the mock and breaks against the real thing.
 * This reads the controllers and checks that every path they declare is
 * answered by the mock.
 */
describe("the mock and the Java service answer the same paths", () => {
  const controllers = [
    "nurse/NurseController.java",
    "lab/LabController.java",
    "patientweb/PatientWebController.java",
  ];

  /**
   * The paths a controller declares, with the method each one answers.
   *
   * The parameter is replaced with a stand-in — the mock matches the shape of
   * a path, not the value in it.
   */
  function pathsOf(file: string): Array<{ method: string; path: string }> {
    const source = readFileSync(
      path.join(root, "backend/src/main/java/com/medmate/clinic", file),
      "utf8",
    );
    const base = source.match(/@RequestMapping\("([^"]+)"\)/)?.[1] ?? "";
    const paths: Array<{ method: string; path: string }> = [];

    for (const match of source.matchAll(/@(Get|Post)Mapping(?:\("([^"]*)"\))?/g)) {
      const method = match[1] === "Get" ? "GET" : "POST";
      const suffix = match[2] ?? "";
      const path = `${base}${suffix}`
        .replace(/^\/api/, "")
        .replace(/\{[^}]+\}/g, ":id")
        .replace(/:id/g, "sample");
      paths.push({ method, path });
    }
    return paths;
  }
  it.each(controllers)("%s declares paths the mock answers", (file) => {
    const paths = pathsOf(file);
    expect(paths.length).toBeGreaterThan(0);

    for (const { method, path } of paths) {
      expect(mock.has(method, path)).toBe(true);
    }
  });
});

describe("the session", () => {
  it("is closed until the person signs in", async () => {
    await expect(mock.handle("GET", "/clinic/dashboard", undefined)).rejects.toThrow(
      /sign in/i,
    );
  });

  it("opens once the person signs in", async () => {
    await signIn();
    const dashboard = (await mock.handle("GET", "/clinic/dashboard", undefined)) as {
      stations: unknown[];
    };
    expect(dashboard.stations.length).toBeGreaterThan(0);
  });
});

describe("the sign-in flow", () => {
  it("hands back a code, takes it, and opens a session", async () => {
    const otp = (await mock.handle("POST", "/auth/otp", { phone: "9845012345" })) as {
      sent: boolean;
      code: string;
    };
    expect(otp.sent).toBe(true);
    expect(otp.code).toHaveLength(6);

    const session = (await mock.handle("POST", "/auth/verify", {
      phone: "9845012345",
      code: otp.code,
    })) as { accessToken: string };
    expect(session.accessToken).toBeTruthy();
  });

  it("refuses a wrong code", async () => {
    await mock.handle("POST", "/auth/otp", { phone: "9845099999" });
    await expect(
      mock.handle("POST", "/auth/verify", { phone: "9845099999", code: "000000" }),
    ).rejects.toThrow();
  });

  it("refuses a wrong PIN", async () => {
    await expect(
      mock.handle("POST", "/auth/unlock", { clinicId: "clinic_medmate_indiranagar", pin: "9999" }),
    ).rejects.toThrow();
  });
});

describe("the reports", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("answers each view with the range and the tabs a person may open", async () => {
    for (const tab of ["summary", "bookings", "clinical", "consults"]) {
      const report = (await mock.handle(
        "GET",
        `/clinic/reports?tab=${tab}&from=2026-11-01&to=2026-11-25`,
        undefined,
      )) as {
        tab: string;
        tabs: string[];
        range: { from: string; to: string; days: number; label: string; previousLabel: string };
        summary?: { kpis: unknown[] };
        bookings?: { kpis: unknown[] };
        clinical?: { kpis: unknown[] };
        consults?: { rows: unknown[]; total: number };
      };

      expect(report.tab).toBe(tab);
      expect(report.tabs).toContain("summary");
      expect(report.range.from).toBe("2026-11-01");
      expect(report.range.to).toBe("2026-11-25");
      expect(report.range.days).toBe(25);
      expect(report.range.previousLabel).toBeTruthy();

      // the view that was asked for is in the payload
      if (tab === "summary") expect(report.summary?.kpis.length).toBeGreaterThan(0);
      if (tab === "bookings") expect(report.bookings?.kpis.length).toBeGreaterThan(0);
      if (tab === "clinical") expect(report.clinical?.kpis.length).toBeGreaterThan(0);
      if (tab === "consults") expect(report.consults?.rows.length).toBeGreaterThan(0);
    }
  });

  it("pages the consultation list", async () => {
    const report = (await mock.handle(
      "GET",
      "/clinic/reports?tab=consults&from=2026-11-01&to=2026-11-25&limit=2&offset=0",
      undefined,
    )) as { consults: { rows: unknown[]; total: number; hasMore: boolean; nextOffset: number } };

    expect(report.consults.rows.length).toBe(2);
    expect(report.consults.hasMore).toBe(true);
    expect(report.consults.nextOffset).toBe(2);
  });

  it("searches the consultation list", async () => {
    const report = (await mock.handle(
      "GET",
      "/clinic/reports?tab=consults&from=2026-11-01&to=2026-11-25&q=Kavya",
      undefined,
    )) as { consults: { rows: Array<{ patient: string }>; total: number } };

    expect(report.consults.total).toBeGreaterThan(0);
    expect(report.consults.rows.every((row) => row.patient.includes("Kavya"))).toBe(true);
  });
});

describe("the consult", () => {
  beforeEach(async () => {
    await signIn();
  });
  it("saves the draft and signs it into a bill", async () => {
    const saved = (await mock.handle("POST", "/clinic/visits/vs_kavya/consult", {
      complaints: "Sore throat 3 days",
      diagnoses: [{ code: "J02.9", label: "Acute pharyngitis", kind: "Primary" }],
      medicines: [{ name: "Azithromycin 500 mg tablet" }],
      tests: [{ name: "CBC" }],
      followUp: { mode: "5 days", at: "2026-11-30T10:00:00Z" },
    })) as { prescriptionId: string; status: string };

    expect(saved.status).toBe("draft");

    const signed = (await mock.handle(
      "POST",
      `/clinic/prescriptions/${saved.prescriptionId}/sign`,
      { signatureMode: "test" },
    )) as {
      prescription: { status: string };
      invoice: { total: number; status: string };
      followUp: { id: string } | null;
      labOrders: Array<{ testName: string }>;
    };

    expect(signed.prescription.status).toBe("signed");
    expect(signed.invoice.total).toBeGreaterThan(0);
    expect(signed.followUp).toBeTruthy();
    expect(signed.labOrders.length).toBe(1);
  });

  it("refuses a visit that is not here", async () => {
    await expect(mock.handle("GET", "/clinic/visits/nope", undefined)).rejects.toThrow();
  });
});

describe("the till", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("counts what came in and what is still owed", async () => {
    const till = (await mock.handle("GET", "/clinic/billing", undefined)) as {
      summary: { collected: number; pendingCount: number };
      pending: Array<{ amount: number }>;
      byMode: Array<{ mode: string; amount: number; bills: number }>;
    };

    expect(till.summary.collected).toBeGreaterThan(0);
    expect(till.summary.pendingCount).toBe(till.pending.length);
    // the money by mode adds up to what was collected
    const byMode = till.byMode
      .filter((mode) => mode.mode !== "pending")
      .reduce((sum, mode) => sum + mode.amount, 0);
    expect(byMode).toBe(till.summary.collected);
  });

  it("takes the payment and gives it back", async () => {
    const bill = (await mock.handle("GET", "/clinic/billing/inv_0148", undefined)) as {
      id: string;
      status: string;
    };
    expect(bill.status).toBe("unpaid");

    const paid = (await mock.handle("POST", "/clinic/billing/inv_0148/pay", {
      payMode: "upi",
    })) as { status: string; payMode: string };
    expect(paid.status).toBe("paid");
    expect(paid.payMode).toBe("upi");

    const refunded = (await mock.handle(
      "POST",
      "/clinic/billing/inv_0148/refund",
      undefined,
    )) as { status: string };
    expect(refunded.status).toBe("refunded");
  });

  it("raises a new bill from the charges the desk typed", async () => {
    const created = (await mock.handle("POST", "/clinic/billing", {
      patient: "Kavya Nair",
      lines: [
        { name: "Consultation in-clinic", amount: 500 },
        { name: "Nebulisation", amount: 250 },
      ],
      discount: 50,
    })) as { invoiceId: string; total: number; status: string };

    expect(created.total).toBe(700);
    expect(created.status).toBe("unpaid");
  });

  it("refuses a bill with no charges", async () => {
    await expect(
      mock.handle("POST", "/clinic/billing", { patient: "Kavya Nair", lines: [] }),
    ).rejects.toThrow();
  });

  it("closes the day against the cash that was counted", async () => {
    const till = (await mock.handle("GET", "/clinic/billing", undefined)) as {
      summary: { collected: number };
    };

    const closed = (await mock.handle("POST", "/clinic/billing/close-day", {
      cash: till.summary.collected,
      expected: till.summary.collected,
    })) as { expected: number; counted: number; difference: number };

    expect(closed.difference).toBe(0);
    expect(closed.counted).toBe(closed.expected);
  });
});

describe("the appointment book", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("books a visit and shows it on the day", async () => {
    const booked = (await mock.handle("POST", "/clinic/appointments", {
      patient: "Naveen Iyer",
      doctor: "dr_vikram",
      date: "2026-11-27",
      time: "10:30",
      reason: "Fever 2 days",
    })) as { id: string; status: string; patient: string };

    expect(booked.status).toBe("booked");
    expect(booked.patient).toBe("Naveen Iyer");

    const day = (await mock.handle(
      "GET",
      "/clinic/appointments?view=day&date=2026-11-27",
      undefined,
    )) as { appointments: Array<{ patient: { name: string } }> };

    expect(day.appointments.some((entry) => entry.patient.name === "Naveen Iyer")).toBe(true);
  });

  it("refuses a booking with no patient", async () => {
    await expect(
      mock.handle("POST", "/clinic/appointments", { patient: "", date: "2026-11-27" }),
    ).rejects.toThrow();
  });
});

describe("the desk", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("lists what is waiting to be handed over", async () => {
    const desk = (await mock.handle("GET", "/clinic/desk", undefined)) as {
      counts: { toHandOver: number; waiting: number };
      items: Array<{ token: string; patient: { name: string } }>;
    };

    expect(desk.items.length).toBeGreaterThan(0);
    expect(desk.counts.toHandOver + desk.counts.waiting).toBeGreaterThan(0);
  });

  it("hands a patient over", async () => {
    const desk = (await mock.handle("GET", "/clinic/desk", undefined)) as {
      items: Array<{ visitId: string; checkedOut: boolean }>;
    };

    const waiting = desk.items.find((item) => !item.checkedOut);
    expect(waiting).toBeTruthy();

    const done = (await mock.handle(
      "POST",
      `/clinic/desk/${waiting!.visitId}/checkout`,
      undefined,
    )) as { checkedOut: boolean };
    expect(done.checkedOut).toBe(true);
  });

  it("hands out the clinic's booking link", async () => {
    const link = (await mock.handle("GET", "/clinic/desk/booking-link", undefined)) as {
      link: string;
      slug: string;
      channels: string[];
    };

    expect(link.link).toContain("/book?clinic=");
    expect(link.slug).toBeTruthy();
    expect(link.channels).toContain("sms");
  });
});

describe("the subscription", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("states the plan, the trial and the usage", async () => {
    const plan = (await mock.handle("GET", "/clinic/subscription", undefined)) as {
      state: string;
      planId: string;
      trialDaysLeft: number;
      usage: Array<{ label: string; used: number; limit: number }>;
      plans: Array<{ id: string; price: number; summary: string }>;
    };

    expect(plan.state).toBe("trial");
    expect(plan.trialDaysLeft).toBeGreaterThan(0);
    expect(plan.usage.length).toBeGreaterThan(0);
    expect(plan.plans.length).toBe(3);
    // every plan says what it is and what it costs
    expect(plan.plans.every((entry) => entry.summary.length > 0)).toBe(true);
  });

  it("takes the payment, records the enquiry and connects the keys", async () => {
    const paid = (await mock.handle("POST", "/clinic/subscription/checkout", {
      plan: "clinic",
      amount: 4999,
      method: "upi",
      name: "MedMate Clinic",
      email: "accounts@medmate.in",
    })) as { status: string; amount: number };
    expect(paid.status).toBe("paid");
    expect(paid.amount).toBe(4999);

    const enquiry = (await mock.handle("POST", "/clinic/subscription/enquiry", {
      clinic: "MedMate Health Group",
      locations: "12",
      doctors: "40",
      staff: "120",
      note: "",
    })) as { received: boolean };
    expect(enquiry.received).toBe(true);

    const connected = (await mock.handle("POST", "/clinic/subscription/payments", {
      provider: "razorpay",
      keyId: "rzp_live_test",
      secret: "a-secret-long-enough",
    })) as { connected: boolean; provider: string };
    expect(connected.connected).toBe(true);
    expect(connected.provider).toBe("razorpay");
  });
});
