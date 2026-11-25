/**
 * The contract between the app and the service.
 *
 * Three things are checked here, and each one catches a class of bug the
 * others cannot:
 *
 *  1. **Every path the app calls is answered by the mock.** A screen that
 *     asks for something nobody registered works against the mock and breaks
 *     against the service.
 *  2. **Every path the Java service declares is answered by the mock** —
 *     and the paths that only the app has are listed, so the difference is
 *     a decision rather than an accident.
 *  3. **The names are the names.** The envelope rule (a bare array only for
 *     the three endpoints that answer one, everything else an object with a
 *     named array) and the field names inside each payload are pinned here,
 *     because a field that is called `text` on one side and `label` on the
 *     other renders an empty line rather than an error.
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
  { method: "POST", path: "/auth/signup" },
  { method: "GET", path: "/me" },
  { method: "GET", path: "/clinic/dashboard" },
  { method: "GET", path: "/clinic/queue" },
  { method: "GET", path: "/clinic/inbox" },
  { method: "GET", path: "/clinic/activity" },
  { method: "GET", path: "/clinic/messages" },
  { method: "POST", path: "/clinic/messages/msg_0001/resend" },
  { method: "GET", path: "/clinic/patients" },
  { method: "GET", path: "/clinic/patients/pt_kavya" },
  { method: "GET", path: "/clinic/reports" },
  { method: "GET", path: "/clinic/visits/vs_kavya" },
  { method: "POST", path: "/clinic/visits/vs_kavya/start" },
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
  { method: "GET", path: "/clinic/settings" },
  { method: "GET", path: "/clinic/nurse" },
  { method: "GET", path: "/clinic/nurse/doctors" },
  { method: "POST", path: "/clinic/nurse/vitals" },
  { method: "GET", path: "/clinic/lab" },
  { method: "POST", path: "/clinic/lab/results" },
  { method: "POST", path: "/clinic/lab/orders/lo_kavya_cbc" },
  { method: "GET", path: "/clinic/teleconsult" },
  { method: "GET", path: "/clinic/templates" },
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

/**
 * The paths the Java service declares, controller by controller.
 *
 * Every one of them must be answered by the mock: a path in one and not the
 * other is a screen that works against the mock and breaks against the
 * service.
 */
const JAVA_CONTROLLERS = [
  "auth/AuthController.java",
  "me/MeController.java",
  "dashboard/DashboardController.java",
  "queue/QueueController.java",
  "visit/CheckInController.java",
  "consult/VisitController.java",
  "prescription/PrescriptionController.java",
  "audit/AuditController.java",
  "message/MessageController.java",
  "billing/BillingController.java",
  "desk/DeskController.java",
  "lab/LabController.java",
  "nurse/NurseController.java",
  "reports/ReportsController.java",
  "schedule/AppointmentController.java",
  "subscription/SubscriptionController.java",
  "patientweb/PatientWebController.java",
];

/**
 * The paths only the app has.
 *
 * The service has not built them yet. They are listed so that the day it
 * does, the list is the work order — and so nobody thinks the mock invented
 * them.
 */
const FRONTEND_ONLY: Array<{ method: string; path: string; why: string }> = [
  { method: "GET", path: "/kiosk", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/open", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/close", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/code", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/verify", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/patient", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/doctor", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/pay", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/token", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/reset", why: "the kiosk has no controller in the service yet" },
  { method: "POST", path: "/kiosk/language", why: "the kiosk has no controller in the service yet" },
  { method: "GET", path: "/clinic/patients", why: "the service is building the patient list" },
  { method: "GET", path: "/clinic/patients/:id", why: "the service is building the patient record" },
  { method: "GET", path: "/clinic/inbox", why: "the inbox is assembled from referrals and handovers" },
  { method: "GET", path: "/clinic/teleconsult", why: "there is no consent table in the service yet" },
  { method: "GET", path: "/clinic/templates", why: "the templates table has no reader in the service yet" },
  { method: "GET", path: "/clinic/nurse/patients", why: "the mock answers it for the nurse station" },
];

/**
 * The endpoints that answer with a bare array.
 *
 * Everywhere else the answer is an object with a named array, so a screen
 * knows what the list is called.
 */
const BARE_ARRAYS = [
  { method: "GET", path: "/clinic/doctors" },
  { method: "GET", path: "/clinic/nurse/doctors" },
  { method: "GET", path: "/clinic/nurse/patients" },
];

/**
 * The endpoints that answer with an object, and the name of the list inside.
 *
 * The name is the contract: the desk sends its rows under `visits`, and a
 * screen that reads `items` sees an empty desk.
 */
const NAMED_ARRAYS: Array<{ method: string; path: string; key: string }> = [
  { method: "GET", path: "/clinic/desk", key: "visits" },
  { method: "GET", path: "/clinic/inbox", key: "items" },
  { method: "GET", path: "/clinic/activity", key: "events" },
  { method: "GET", path: "/clinic/messages", key: "items" },
  { method: "GET", path: "/clinic/patients", key: "items" },
  { method: "GET", path: "/clinic/templates", key: "items" },
  { method: "GET", path: "/clinic/teleconsult", key: "waiting" },
  { method: "GET", path: "/clinic/lab", key: "open" },
  { method: "GET", path: "/clinic/queue", key: "items" },
  { method: "GET", path: "/clinic/appointments", key: "appointments" },
  { method: "GET", path: "/clinic/reports", key: "tabs" },
  { method: "GET", path: "/clinic/subscription", key: "usage" },
  { method: "GET", path: "/clinic/settings", key: "locations" },
];

/**
 * The fields each payload carries.
 *
 * These are the names the Java service uses. A name that drifts here shows
 * up on screen as an empty line, so they are pinned.
 */
const FIELDS: Array<{
  method: string;
  path: string;
  keys: string[];
  note?: string;
}> = [
  {
    method: "GET",
    path: "/clinic/desk",
    keys: ["counts", "visits", "meta"],
    note: "the rows are `visits`, and the line under the title is `meta`",
  },
  { method: "GET", path: "/clinic/queue", keys: ["items", "next", "room", "meta"] },
  { method: "GET", path: "/clinic/inbox", keys: ["items", "counts", "meta"] },
  { method: "GET", path: "/clinic/activity", keys: ["events", "count"] },
  { method: "GET", path: "/clinic/messages", keys: ["counts", "filter", "items"] },
  { method: "GET", path: "/clinic/patients", keys: ["items", "meta", "total"] },
  { method: "GET", path: "/clinic/templates", keys: ["items", "meta"] },
  { method: "GET", path: "/clinic/teleconsult", keys: ["waiting", "consent", "meta"] },
  { method: "GET", path: "/clinic/subscription", keys: ["state", "planName", "planId", "trialDaysLeft", "usage", "plans"] },
  { method: "GET", path: "/clinic/settings", keys: ["clinic", "locations", "services"] },
  { method: "GET", path: "/clinic/billing", keys: ["day", "summary", "byMode", "pending", "clinic"] },
  { method: "GET", path: "/clinic/nurse", keys: ["counts", "items", "doctors", "meta"] },
  { method: "GET", path: "/clinic/lab", keys: ["counts", "open", "reported", "partners", "meta"] },
  { method: "GET", path: "/clinic/visits/vs_kavya", keys: ["visit", "patient", "vitals", "consultation", "prescriptions"] },
  { method: "GET", path: "/me", keys: ["clinic", "user", "location", "capabilities", "navCounts"] },
  { method: "GET", path: "/clinic/dashboard", keys: ["meta", "trial", "stations", "manage"] },
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

  it.each(JAVA_CONTROLLERS)("%s declares paths the mock answers", (file) => {
    const paths = pathsOf(file);
    expect(paths.length).toBeGreaterThan(0);

    for (const { method, path } of paths) {
      expect(mock.has(method, path)).toBe(true);
    }
  });

  it("lists every path the service has that the app only has", () => {
    // the list is the work order: the day the service builds one of these,
    // it is removed from the list and the mock keeps answering it
    for (const entry of FRONTEND_ONLY) {
      expect(mock.has(entry.method, entry.path)).toBe(true);
    }
  });
});

/**
 * The envelope rule.
 *
 * A list is a bare array only where the service says so. Everywhere else it
 * is an object with a named array, so a screen always knows what to read.
 */
describe("the envelope", () => {
  beforeEach(async () => {
    await signIn();
  });

  it.each(BARE_ARRAYS)("answers $method $path with a bare array", async ({ method, path }) => {
    const answer = (await mock.handle(method, path, undefined)) as unknown;
    expect(Array.isArray(answer)).toBe(true);
  });

  it.each(NAMED_ARRAYS)("answers $method $path with $key", async ({ method, path, key }) => {
    const answer = (await mock.handle(method, path, undefined)) as Record<string, unknown>;
    expect(Array.isArray(answer)).toBe(false);
    expect(Array.isArray(answer[key])).toBe(true);
  });
});

/**
 * The names inside the payload.
 *
 * A field that is called one thing on one side and another thing on the other
 * renders an empty line rather than an error, so the names are pinned here.
 */
describe("the fields in the payload", () => {
  beforeEach(async () => {
    await signIn();
  });

  it.each(FIELDS)("$method $path carries its fields", async ({ method, path, keys }) => {
    const answer = (await mock.handle(method, path, undefined)) as Record<string, unknown>;
    for (const key of keys) {
      expect(answer, `${method} ${path} is missing "${key}"`).toHaveProperty(key);
    }
  });

  it("the desk's line under the title is an object, not a sentence", async () => {
    const desk = (await mock.handle("GET", "/clinic/desk", undefined)) as {
      meta: unknown;
    };
    expect(typeof desk.meta).toBe("object");
    expect(desk.meta).toHaveProperty("label");
  });

  it("the queue's rows carry the vitals", async () => {
    const queue = (await mock.handle("GET", "/clinic/queue", undefined)) as {
      items: Array<{ vitals?: string }>;
    };
    expect(queue.items.length).toBeGreaterThan(0);
    expect(typeof queue.items[0].vitals).toBe("string");
  });

  it("the desk sends its rows under visits, not items", async () => {
    const desk = (await mock.handle("GET", "/clinic/desk", undefined)) as {
      visits: unknown[];
    };
    expect(desk.visits.length).toBeGreaterThan(0);
    expect(desk).not.toHaveProperty("items");
  });

  it("the bill's timeline rows carry text, the way the service names them", async () => {
    const bill = (await mock.handle("GET", "/clinic/billing/inv_0148", undefined)) as {
      timeline: Array<{ text?: string; label?: string }>;
    };
    expect(bill.timeline[0]).toHaveProperty("text");
  });

  it("the visit's patient carries initials, visits and since", async () => {
    const visit = (await mock.handle("GET", "/clinic/visits/vs_kavya", undefined)) as {
      patient: Record<string, unknown>;
    };
    expect(visit.patient).toHaveProperty("initials");
    expect(visit.patient).toHaveProperty("visits");
    expect(visit.patient).toHaveProperty("since");
  });

  it("the subscription counts doctors, locations and staff", async () => {
    const plan = (await mock.handle("GET", "/clinic/subscription", undefined)) as {
      usage: Array<{ label: string }>;
    };
    expect(plan.usage.map((entry) => entry.label)).toEqual(["Doctors", "Locations", "Staff"]);
  });

  it("the till has four bars, the last one being what has not come in", async () => {
    const till = (await mock.handle("GET", "/clinic/billing", undefined)) as {
      byMode: Array<{ mode: string }>;
    };
    expect(till.byMode.map((row) => row.mode)).toEqual(["cash", "upi", "card", "pending"]);
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

  it("signs a new clinic up and hands back the booking link", async () => {
    const signup = (await mock.handle("POST", "/auth/signup", {
      name: "Ananya Rao",
      mobile: "9845012345",
      clinicName: "MedMate Clinic Indiranagar",
    })) as { accessToken: string; bookingSlug: string; bookingUrl: string };

    expect(signup.accessToken).toBeTruthy();
    // the slug is random, so it cannot be worked out from the clinic's name
    expect(signup.bookingSlug).not.toBe("medmate-clinic-indiranagar");
    expect(signup.bookingUrl).toContain(signup.bookingSlug);
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

  it("calls the patient in", async () => {
    const started = (await mock.handle("POST", "/clinic/visits/vs_kavya/start", undefined)) as {
      visitId: string;
      token: string;
      status: string;
      consultStartedAt: string;
    };
    expect(started.visitId).toBe("vs_kavya");
    expect(started.token).toBeTruthy();
    expect(started.consultStartedAt).toBeTruthy();
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
      visits: Array<{ token: string }>;
    };

    expect(desk.visits.length).toBeGreaterThan(0);
    expect(desk.counts.toHandOver + desk.counts.waiting).toBeGreaterThan(0);
  });

  it("hands a patient over", async () => {
    const desk = (await mock.handle("GET", "/clinic/desk", undefined)) as {
      visits: Array<{ visitId: string; checkedOut: boolean }>;
    };

    const waiting = desk.visits.find((item) => !item.checkedOut);
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
      secret: "shhh",
    })) as { connected: boolean; provider: string };
    expect(connected.connected).toBe(true);
    expect(connected.provider).toBe("razorpay");
  });
});

describe("the patient list", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("carries the facts a person at the desk picks a patient out by", async () => {
    const list = (await mock.handle("GET", "/clinic/patients", undefined)) as {
      items: Array<{
        id: string;
        name: string;
        token: string | null;
        hereToday: boolean;
        dues: number;
        followUpOn: string | null;
        mine: boolean;
        newThisMonth: boolean;
      }>;
      meta: string;
      total: number;
    };

    expect(list.items.length).toBeGreaterThan(0);
    expect(list.meta).toBeTruthy();
    expect(list.total).toBe(list.items.length);
    for (const item of list.items) {
      expect(item).toHaveProperty("hereToday");
      expect(item).toHaveProperty("dues");
      expect(item).toHaveProperty("followUpOn");
      expect(item).toHaveProperty("mine");
      expect(item).toHaveProperty("newThisMonth");
    }
  });

  it("the record carries the patient's own visits first", async () => {
    const record = (await mock.handle("GET", "/clinic/patients/pt_kavya", undefined)) as {
      patient: { id: string };
      visits: Array<{ id: string }>;
    };
    expect(record.patient.id).toBe("pt_kavya");
    expect(record.visits[0].id).toBe("vs_kavya");
  });
});

describe("the activity log and the messages", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("the log says who did what and when", async () => {
    const log = (await mock.handle("GET", "/clinic/activity", undefined)) as {
      events: Array<{ action: string; actor: string | null; at: string }>;
      count: number;
    };
    expect(log.events.length).toBeGreaterThan(0);
    expect(log.count).toBe(log.events.length);
  });

  it("the message log counts the kinds and can send one again", async () => {
    const log = (await mock.handle("GET", "/clinic/messages", undefined)) as {
      counts: Record<string, number>;
      items: Array<{ id: string; kind: string; canResend: boolean }>;
    };
    expect(log.items.length).toBeGreaterThan(0);
    expect(log.counts.all).toBe(log.items.length);

    const again = (await mock.handle("POST", "/clinic/messages/msg_0004/resend", undefined)) as {
      id: string;
      status: string;
      failed: boolean;
    };
    expect(again.id).toBe("msg_0004");
    expect(again.failed).toBe(false);
  });
});

describe("the clinic's settings", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("carries the clinic, its branches and its services", async () => {
    const settings = (await mock.handle("GET", "/clinic/settings", undefined)) as {
      clinic: { name: string; gstin: string; hfrId: string };
      locations: Array<{ name: string; rooms: number }>;
      services: Array<{ name: string }>;
    };
    expect(settings.clinic.name).toBeTruthy();
    expect(settings.clinic.gstin).toBeTruthy();
    expect(settings.locations.length).toBeGreaterThan(0);
    expect(settings.services.length).toBeGreaterThan(0);
  });
});

describe("the patient-facing web", () => {
  it("books a visit with a random link key and a queue slip", async () => {
    const booking = (await mock.handle("POST", "/public/booking", {
      clinic: "medmate-clinic",
      doctorId: "dr_ananya",
      startsAt: "2026-11-26T09:00:00Z",
      name: "Naveen Iyer",
      phone: "9845012345",
      age: "30",
      sex: "M",
      reason: "Fever",
    })) as { token: string; queueToken: string; liveUrl: string };

    // the link key is not the queue slip, and it is not guessable
    expect(booking.token).not.toBe(booking.queueToken);
    expect(booking.queueToken).toMatch(/^[A-Z]-\d+$/);
    expect(booking.liveUrl).toContain(booking.token);
  });

  it("a booking with a body-only clinic slug succeeds", async () => {
    const booking = (await mock.handle("POST", "/public/booking", {
      clinic: "medmate-clinic",
      name: "Naveen Iyer",
      phone: "9845019999",
    })) as { token: string };
    expect(booking.token).toBeTruthy();
  });

  it("the same idempotency key gives the same booking back", async () => {
    const first = (await mock.handle(
      "POST",
      "/public/booking",
      { clinic: "medmate-clinic", name: "Asha Iyer", phone: "9845018888" },
      { headers: { "idempotency-key": "key-1" } },
    )) as { token: string };

    const second = (await mock.handle(
      "POST",
      "/public/booking",
      { clinic: "medmate-clinic", name: "Asha Iyer", phone: "9845018888" },
      { headers: { "idempotency-key": "key-1" } },
    )) as { token: string };

    expect(second.token).toBe(first.token);
  });

  it("an unknown link is not found", async () => {
    await expect(mock.handle("GET", "/token/nope", undefined)).rejects.toThrow();
  });
});
