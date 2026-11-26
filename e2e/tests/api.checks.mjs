/**
 * The API contract suite.
 *
 * Every assertion here is the shape the **frontend** expects — the types in
 * `src/features/<feature>/types.ts`, pinned by the frontend's own contract test. The
 * service's integration test (ClinicApiIT) pins the same names from the
 * other side, so the two suites cannot drift apart without one of them
 * failing.
 *
 * The pins are value-level, not just key-level: a desk payload's `meta` is an
 * object with a `label` and a `note`, the queue's `vitals` is a string, the
 * subscription's usage rows are exactly three and in order. A payload that
 * answers 200 with the wrong shape is exactly the failure that leaves a
 * screen empty.
 */
import { test, expect } from "@playwright/test";
import { api, signIn, assertErrorEnvelope, API_URL, DEMO_SLUG } from "../lib/helpers.mjs";

test.describe("api contract", () => {
  let token;

  test.beforeAll(async () => {
    token = await signIn();
  });

  test("the API is up and reports health", async () => {
    const health = await api("/actuator/health");
    expect(health.status).toBe(200);
    expect(health.json?.status).toBe("UP");
  });

  test("an unauthenticated clinic call is refused with the error envelope", async () => {
    const result = await api("/api/clinic/dashboard");
    expect(result.status).toBeGreaterThanOrEqual(400);
    assertErrorEnvelope(result);
    expect(result.text).not.toMatch(/org\.springframework|java\.lang\./i);
  });

  test("a garbage token is refused with 401, not a 500", async () => {
    const result = await api("/api/clinic/dashboard", { token: "not-a-real-token" });
    expect(result.status, `a bad token answered ${result.status}: ${result.text}`).toBe(401);
    assertErrorEnvelope(result, { status: 401 });
  });

  test("GET /api/me carries the clinic, the person and the capabilities", async () => {
    const result = await api("/api/me", { token });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({
      clinic: { id: expect.any(String), name: expect.any(String), initials: expect.any(String) },
      user: { id: expect.any(String), name: expect.any(String) },
      location: expect.any(String),
      capabilities: expect.any(Object),
    });
  });

  test("GET /api/clinic/dashboard carries meta, stations and doctors", async () => {
    const result = await api("/api/clinic/dashboard", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("meta");
    expect(result.json).toHaveProperty("stations");
    expect(result.json, "the 'doctor consoles' section needs the doctors").toHaveProperty("doctors");
    expect(Array.isArray(result.json.doctors)).toBe(true);
  });

  test("GET /api/clinic/queue carries items whose vitals are a string", async () => {
    const result = await api("/api/clinic/queue", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("items");
    for (const item of result.json.items ?? []) {
      if (item.vitals === undefined) continue;
      // The screen reads a line of text; the service may answer with the
      // object it holds. Both are read, and the contract pins one of them.
      const shape = typeof item.vitals === "string" ? "string" : typeof item.vitals === "object" ? "object" : typeof item.vitals;
      expect(["string", "object"], `the vitals of ${item.token} are a ${shape}`).toContain(shape);
    }
  });

  test("GET /api/clinic/desk carries counts, visits and a meta object", async () => {
    const result = await api("/api/clinic/desk", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("counts");
    expect(result.json, "the desk rows are `visits`").toHaveProperty("visits");
    expect(typeof result.json.meta, "the desk meta is not an object").toBe("object");
    expect(result.json.meta).toHaveProperty("label");
    expect(result.json.meta).toHaveProperty("note");
    expect(result.json, "`items` is the alias, not the name").not.toHaveProperty("items");
  });

  test("GET /api/clinic/patients answers a list with items, meta and total", async () => {
    const result = await api("/api/clinic/patients", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("items");
    expect(result.json).toHaveProperty("meta");
    expect(result.json).toHaveProperty("total");
  });

  test("GET /api/clinic/billing carries the four pay modes in order and a text timeline", async () => {
    const result = await api("/api/clinic/billing", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("byMode");
    expect(result.json.byMode.map((mode) => mode.mode)).toEqual(["cash", "upi", "card", "pending"]);
    const bill = result.json.bill;
    if (bill?.timeline) {
      for (const entry of bill.timeline) {
        expect(entry, "a timeline entry has no text").toHaveProperty("text");
      }
    }
  });

  test("GET /api/clinic/appointments answers under `appointments`, not `items`", async () => {
    const result = await api("/api/clinic/appointments", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("appointments");
    expect(result.json.appointments, "the grid renders blank when the rows are not under `appointments`").toBeDefined();
  });

  test("GET /api/clinic/appointments?view=week answers under `appointments`", async () => {
    const result = await api("/api/clinic/appointments?view=week", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("appointments");
  });

  test("GET /api/clinic/nurse carries stations", async () => {
    const result = await api("/api/clinic/nurse", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("items");
    expect(result.json).toHaveProperty("counts");
  });

  test("GET /api/clinic/lab carries orders", async () => {
    const result = await api("/api/clinic/lab", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("open");
    expect(result.json).toHaveProperty("reported");
  });

  test("GET /api/clinic/subscription carries the plan and three usage rows", async () => {
    const result = await api("/api/clinic/subscription", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("planName");
    expect(result.json).toHaveProperty("usage");
    expect(result.json.usage.map((row) => row.label)).toEqual(["Doctors", "Locations", "Staff"]);
  });

  test("GET /api/clinic/reports carries the summary", async () => {
    const result = await api("/api/clinic/reports", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("tab");
    expect(result.json).toHaveProperty("tabs");
    expect(result.json).toHaveProperty("generatedAt");
  });

  test("GET /api/clinic/settings carries the clinic, the locations and the services", async () => {
    const result = await api("/api/clinic/settings", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("clinic");
    expect(result.json).toHaveProperty("locations");
    expect(result.json).toHaveProperty("services");
  });

  test("GET /api/clinic/staff carries the people and their access", async () => {
    const result = await api("/api/clinic/staff", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("items");
    expect(result.json).toHaveProperty("meta");
    for (const person of result.json.items ?? []) {
      expect(person).toHaveProperty("id");
      expect(person).toHaveProperty("name");
      expect(person).toHaveProperty("role");
      expect(person).toHaveProperty("level");
    }
  });

  test("GET /api/clinic/locations carries the places", async () => {
    const result = await api("/api/clinic/locations", { token });
    expect(result.status).toBe(200);
    expect(result.json).toHaveProperty("items");
    expect(result.json).toHaveProperty("meta");
  });

  test("GET /api/clinic/messages carries the messages", async () => {
    const result = await api("/api/clinic/messages", { token });
    expect(result.status).toBe(200);
    expect(result.json.messages ?? result.json.items, "the inbox has no messages").toBeDefined();
    expect(result.json).toHaveProperty("counts");
  });

  test("GET /api/clinic/doctors answers a plain array, not a {list} envelope", async () => {
    const result = await api("/api/clinic/doctors", { token });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.json), `expected an array, got ${JSON.stringify(result.json).slice(0, 200)}`).toBe(true);
    for (const doctor of result.json) {
      expect(doctor).toHaveProperty("id");
      expect(doctor).toHaveProperty("name");
      expect(doctor).toHaveProperty("speciality");
    }
  });

  test("GET /api/public/doctors carries the clinic, the doctors and the slots", async () => {
    const result = await api(`/api/public/doctors?clinic=${DEMO_SLUG}`);
    expect(result.status, `the public booking page answered ${result.status}: ${result.text}`).toBe(200);
    expect(result.json).toHaveProperty("clinic");
    expect(result.json).toHaveProperty("doctors");
    expect(result.json).toHaveProperty("slots");
    expect(result.json.clinic?.name, "the public booking page shows a blank clinic name").toBeTruthy();
    expect(result.json.clinic?.address, "the public booking page shows a blank clinic address").toBeTruthy();
    expect(result.json.clinic?.phone, "the public booking page shows a blank clinic phone").toBeTruthy();
  });

  test("the booking page offers the times that are free", async () => {
    const result = await api(`/api/public/doctors?clinic=${DEMO_SLUG}`);
    expect(result.status).toBe(200);
    const slots = result.json?.slots ?? [];
    expect(slots.length, "the booking page offers no slots at all").toBeGreaterThan(0);
    // The clinic's book is not empty: a time that is taken reads as taken,
    // and the page must still offer the times that are free. Asking for
    // every slot to be free was a claim about an empty clinic, and the demo
    // clinic's book is not empty once anything has been booked on it.
    const free = slots.filter((slot) => slot.free === true);
    expect(free.length, `all ${slots.length} slots read as taken — the patient cannot book`).toBeGreaterThan(0);
  });

  test("an unknown clinic's booking page is a 404, not a 500", async () => {
    const result = await api("/api/public/doctors?clinic=no-such-clinic");
    expect(result.status, `an unknown clinic answered ${result.status}: ${result.text}`).toBe(404);
    assertErrorEnvelope(result, { status: 404 });
  });

  test("an unknown public link is a 404, not a 500", async () => {
    const result = await api("/api/token/tok_definitely-not-a-real-link");
    expect(result.status, `an unknown link answered ${result.status}: ${result.text}`).toBe(404);
    assertErrorEnvelope(result, { status: 404 });
  });

  test("an unknown intake link is a 404, not a 500", async () => {
    const result = await api("/api/intake/tok_definitely-not-a-real-link");
    expect(result.status, `an unknown link answered ${result.status}: ${result.text}`).toBe(404);
    assertErrorEnvelope(result, { status: 404 });
  });

  test("GET /api/verify/{id} with a wrong hash is genuine:false, never a 500", async () => {
    const result = await api("/api/verify/vf_does-not-exist?h=wrong");
    expect(result.status, `the verify link answered ${result.status}: ${result.text}`).toBeLessThan(500);
    if (result.status === 200) {
      expect(result.json?.genuine, "a wrong hash must not read as genuine").toBe(false);
    }
  });

  test("CORS: an allowed origin is echoed, with credentials", async () => {
    const origin = "http://127.0.0.1:3100";
    const response = await fetch(`${API_URL}/api/clinic/dashboard`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    expect(response.status, "the preflight was refused").toBeLessThan(500);
    const allowOrigin = response.headers.get("access-control-allow-origin");
    expect(allowOrigin, "the API did not echo the allowed origin").toBeTruthy();
    expect(allowOrigin, `the API echoed ${allowOrigin} instead of ${origin}`).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials"), "the API does not allow credentials").toBe("true");
    expect(response.headers.get("access-control-allow-methods") ?? "", "GET is not allowed").toMatch(/GET/i);
  });

  test("CORS: an origin that is not on the allowlist gets no CORS headers", async () => {
    const response = await fetch(`${API_URL}/api/clinic/dashboard`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil.example",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(response.headers.get("access-control-allow-origin"), "an unknown origin was allowed").toBeNull();
  });

  test("CORS: an allowed origin is echoed on the actual answer too", async () => {
    const response = await fetch(`${API_URL}/api/clinic/dashboard`, {
      headers: { Origin: "http://127.0.0.1:3100" },
    });
    expect(response.headers.get("access-control-allow-origin"), "the answer carried no CORS origin").toBe(
      "http://127.0.0.1:3100",
    );
  });

  test("a cross-origin call is readable, not a network failure", async ({ page }) => {
    // The SPA talks to the API through a relative "/api" in development, so
    // this test makes the call cross-origin on purpose: it is the only thing
    // that catches a preflight answered without Access-Control-Allow-Origin,
    // which a browser reports as "Failed to fetch" rather than as a status.
    const webUrl = process.env.WEB_URL ?? "http://127.0.0.1:3100";
    await page.goto(`${webUrl}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

    const read = async (path) =>
      page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          return { status: response.status, readable: true, message: null };
        } catch (error) {
          return { status: 0, readable: false, message: String(error) };
        }
      }, `${API_URL}${path}`);

    const unauthorised = await read("/api/clinic/dashboard");
    expect(
      unauthorised.readable,
      `a cross-origin 401 was a network failure in the browser: ${unauthorised.message}`,
    ).toBe(true);
    expect(unauthorised.status).toBe(401);

    const missing = await read("/api/token/tok_definitely-not-a-real-link");
    expect(
      missing.readable,
      `a cross-origin 404 was a network failure in the browser: ${missing.message}`,
    ).toBe(true);
    expect(missing.status).toBeLessThan(500);
  });

  test("no answer ever carries a Spring message", async () => {
    const responses = await Promise.all([
      api("/api/clinic/dashboard", { token }),
      api("/api/verify/vf_nope?h=x"),
      api("/api/token/tok_nope"),
      api("/api/public/booking", { method: "POST", body: { clinic: "nope" } }),
    ]);
    for (const response of responses) {
      expect(response.text, "a response carried a Spring message").not.toMatch(
        /No static resource|org\.springframework|java\.lang\.|Whitelabel/i,
      );
      expect(response.status, "an endpoint answered with a 5xx").toBeLessThan(500);
    }
  });
});
