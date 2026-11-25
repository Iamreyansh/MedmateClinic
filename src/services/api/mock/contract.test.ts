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
import { mock } from "@/services/api/mock/router";
import { auth } from "@/services/api/client";
import "@/services/api/mock/routes";

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
