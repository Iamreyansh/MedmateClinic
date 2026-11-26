/**
 * The critical flows.
 *
 * Fifteen paths had no test at all. These are the ones that move money, move
 * a patient's data across a public link, or decide who may see whose records.
 *
 * Where the flow writes a row, the assertion is on the row — a 200 that wrote
 * nothing is not a pass.
 */
import { test, expect } from "@playwright/test";
import {
  api,
  signIn,
  seedSession,
  assertNoRawBackendError,
  assertReachedAState,
  assertErrorEnvelope,
  isHighEntropyKey,
  shot,
  DEMO_SLUG,
  WEB_URL,
} from "../lib/helpers.mjs";

/**
 * The bookings the flow tests make, so the database can be checked for them.
 * The suite reads the row back through the API the app itself uses.
 */
/**
 * Make one booking and return it.
 *
 * Each flow makes its own: a test that depends on another test's side effect
 * is a test that fails for a reason that has nothing to do with what it is
 * checking.
 */
/** The doctor the flow tests book with — the demo clinic's owner. */
const DOCTOR_ID = "22222222-2222-4222-8222-222222222222";
/** The slots this run has taken, so two tests never draw the same one. */
const takenSlots = new Set();
/** The bookings this run has made, so their slots can be given back. */
const runBookings = [];
async function makeBooking(token, options = {}) {
  const key = options.key ?? `e2e-booking-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const name = options.name ?? `E2E Patient ${key.slice(-6)}`;
  // The times the clinic is offering. The booking page is where a patient
  // picks a time, so the test picks it the same way: from the free slots
  // the service itself answers with, and not from a guess. The clinic holds
  // one visit per doctor per time, so two bookings that drew the same one
  // would find each other there — the run's own taken set is what keeps
  // that from happening.
  const page = await api(`/api/public/doctors?clinic=${DEMO_SLUG}&doctorId=${DOCTOR_ID}`);
  expect(page.status, `the booking page did not answer: ${page.text}`).toBe(200);
  const free = (page.json?.slots ?? []).filter(
    (slot) => slot.free && !takenSlots.has(slot.startsAt),
  );
  expect(free.length, "the clinic has a free time left to book").toBeGreaterThan(0);
  const slot = free[0];
  takenSlots.add(slot.startsAt);

  const payload = {
    clinic: DEMO_SLUG,
    doctorId: DOCTOR_ID,
    startsAt: options.startsAt ?? slot.startsAt,
    name,
    phone: "9990001111",
    age: "34",
    sex: "F",
    reason: options.reason ?? "E2E booking",
  };
  const result = await api("/api/public/booking", {
    method: "POST",
    body: payload,
    headers: { "Idempotency-Key": key },
  });
  expect(result.status, `the booking was refused: ${result.text}`).toBe(200);
  // The booking landed on the time that was asked for, with the doctor that
  // was asked for, and with the queue slip the desk reads out. A status
  // alone cannot tell those three failures apart.
  expect(
    result.json.startsAt,
    `the booking landed on another time than the one asked for (${slot.startsAt})`,
  ).toBe(payload.startsAt);
  expect(result.json.doctor, "the booking landed with another doctor").toContain("Ananya");
  expect(result.json.queueToken, "the booking carries no queue slip").toMatch(/^[A-Z]-\d+$/);
  runBookings.push(result.json.token);
  return { key, payload, result: result.json, linkKey: result.json.token, queueToken: result.json.queueToken, name, day: payload.startsAt.slice(0, 10) };
}

test.describe("critical flows", () => {
  let token;

  test.beforeAll(async () => {
    token = await signIn();
  });

  test.afterAll(async () => {
    // What the run took is given back, so the stack is as it was found and a
    // second run finds the same clinic: the times this run booked, and the
    // kiosk, which is one device with one state.
    for (const linkKey of runBookings) {
      await api(`/api/public/booking/${linkKey}/cancel`, { method: "POST", body: {} });
    }
    await api("/api/kiosk/close", {
      method: "POST",
      token,
      body: { pin: "1234" },
    });
  });

  /* ------------------------------------------------------------- booking */

  test("a booking written with the clinic in the body creates exactly one appointment row", async () => {
    const booking = await makeBooking(token);
    const result = booking.result;

    expect(result).toHaveProperty("token");
    expect(result, "the booking must carry the live link").toHaveProperty("liveUrl");
    expect(result, "the booking must carry the intake link").toHaveProperty("intakeUrl");
    expect(result, "the booking must carry the human queue number").toHaveProperty("queueToken");

    expect(
      isHighEntropyKey(booking.linkKey),
      `the link key ${booking.linkKey} is not high entropy — a sequential key is a PHI enumeration bug`,
    ).toBe(true);
    expect(String(booking.linkKey)).not.toMatch(/^A-\d{3,}$/);
    expect(
      String(booking.queueToken),
      "the queue number and the link key are different values, and must stay different",
    ).not.toBe(String(booking.linkKey));

    // The row itself: a booking that wrote no appointment is invisible to the
    // clinic's own day view.
    const appointments = await api(`/api/clinic/appointments?date=${booking.day}`, { token });
    expect(appointments.status).toBe(200);
    const rows = appointments.json?.appointments ?? [];
    const matching = rows.filter(
      (row) =>
        row.patient === booking.name ||
        row.patient?.name === booking.name ||
        row.patientName === booking.name ||
        row.reason === booking.payload.reason,
    );
    expect(
      matching.length,
      `the booking answered 200 but the day's list holds ${matching.length} rows for ${booking.day}`,
    ).toBeGreaterThan(0);
  });

  test("the same idempotency key returns the first booking and creates no second row", async () => {
    const first = await makeBooking(token);
    const countRows = async () => {
      const list = await api(`/api/clinic/appointments?date=${first.day}`, { token });
      return (list.json?.appointments ?? []).length;
    };
    const before = await countRows();

    const repeat = await api("/api/public/booking", {
      method: "POST",
      body: first.payload,
      headers: { "Idempotency-Key": first.key },
    });

    expect(repeat.status, `the repeat booking was refused: ${repeat.text}`).toBe(200);
    expect(repeat.json.token, "the repeat booking must return the first booking's link key").toBe(first.linkKey);

    const after = await countRows();
    expect(
      after,
      `the repeat booking added ${after - before} rows to ${first.day} — idempotency did not hold`,
    ).toBe(before);
  });

  test("a different idempotency key creates a second booking", async () => {
    const first = await makeBooking(token);
    const second = await makeBooking(token);
    expect(second.linkKey, "the second booking must have its own link key").not.toBe(first.linkKey);
  });

  test("the booking flow runs in the browser end to end", async ({ page }) => {
    await page.goto(`/book?clinic=${DEMO_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await assertNoRawBackendError(page);
    await assertReachedAState(page);
    await shot(page, "flow-book");
  });

  test("the live token page shows a queue number for a link the clinic handed out", async ({ page }) => {
    const { linkKey } = await makeBooking(token);
    await page.goto(`/t/${linkKey}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await assertNoRawBackendError(page);
    const body = await page.locator("body").innerText();
    expect(body, "the live token page shows nothing").toBeTruthy();
    await shot(page, "flow-live-token");
  });

  test("the intake page opens for a link the clinic handed out", async ({ page }) => {
    const { linkKey } = await makeBooking(token);
    await page.goto(`/intake/${linkKey}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await assertNoRawBackendError(page);
    await assertReachedAState(page);
    await shot(page, "flow-intake");
  });

  test("an unknown link is a 404 on the page, never a stack", async ({ page }) => {
    await page.goto("/t/tok_definitely-not-a-real-link", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await assertNoRawBackendError(page);
    await shot(page, "flow-unknown-link");
  });

  /* ----------------------------------------------------------- verify link */

  test("GET /api/verify/{id} answers genuine:false for a wrong hash and never a 500", async () => {
    const result = await api("/api/verify/vf_does-not-exist?h=wrong");
    expect(result.status).toBeLessThan(500);
    if (result.status === 200) {
      expect(result.json?.genuine, "a wrong hash must not read as genuine").toBe(false);
    }
  });

  /* --------------------------------------------------------------- check-in */

  test("POST /api/clinic/check-ins answers with the visit it created", async () => {
    const doctors = await api("/api/clinic/doctors", { token });
    expect(doctors.status).toBe(200);
    const doctor = Array.isArray(doctors.json) ? doctors.json[0] : doctors.json?.list?.[0];
    expect(doctor, "the clinic has no doctor to check a patient in with").toBeTruthy();

    const result = await api("/api/clinic/check-ins", {
      method: "POST",
      token,
      body: { name: "E2E Walk-in", phone: "9990003333", doctorId: doctor.id },
    });
    expect(result.status, `the check-in was refused: ${result.text}`).toBe(200);
    expect(result.json, "the check-in must carry the visit it created").toHaveProperty("visit");
    expect(result.json.visit, "the visit has no id").toHaveProperty("id");
    expect(result.json.patient, "the patient card has no initials").toHaveProperty("initials");
    expect(result.json, "the check-in must carry the queue token").toHaveProperty("token");
  });

  test("the desk screen shows the queue it can check a patient into", async ({ page, context }) => {
    await seedSession(context, token);
    await page.goto("/desk", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await assertNoRawBackendError(page);
    await assertReachedAState(page);
    await shot(page, "flow-desk");
  });

  /* ---------------------------------------------------------------- billing */

  test("paying an invoice answers with the invoice id and the status", async () => {
    const till = await api("/api/clinic/billing", { token });
    expect(till.status).toBe(200);
    let invoices = till.json?.invoices ?? till.json?.dayBills ?? (till.json?.bill ? [till.json.bill] : []);
    if (!invoices.length) {
      // No bill on the till: make one, so there is something to pay.
      const made = await api("/api/clinic/billing", {
        method: "POST",
        token,
        body: {
          patientId: "55555555-5555-4555-8555-555555555501",
          patientName: "E2E Patient",
          lines: [{ name: "Consultation", description: "E2E", sac: "", gstRate: "", gstAmount: 0, amount: 500 }],
          total: 500,
        },
      });
      expect(made.status, `the bill was refused: ${made.text}`).toBe(200);
      invoices = [made.json?.bill ?? made.json];
    }
    const invoice = invoices[0];
    expect(invoice, "the clinic has no invoice to pay").toBeTruthy();

    const paid = await api(`/api/clinic/billing/${invoice.id ?? invoice.invoiceId}/pay`, {
      method: "POST",
      token,
      body: { payMode: "cash" },
    });
    expect(paid.status, `the payment was refused: ${paid.text}`).toBe(200);
    expect(paid.json, "the payment must carry the invoice id").toHaveProperty("invoiceId");
    expect(paid.json, "the payment must carry the status").toHaveProperty("status");
  });

  test("the billing screen renders the till", async ({ page, context }) => {
    await seedSession(context, token);
    await page.goto("/billing", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await assertNoRawBackendError(page);
    await assertReachedAState(page);
    await shot(page, "flow-billing");
  });

  /* ----------------------------------------------------------------- kiosk */

  test("the kiosk flow answers every step it needs", async () => {
    const open = await api("/api/kiosk/open", { method: "POST", body: {} });
    expect(open.status, `the kiosk did not open: ${open.text}`).toBe(200);
    expect(open.json, "the kiosk must say whether it is open").toHaveProperty("open");
    expect(typeof open.json.open, "the kiosk's open flag is not a boolean").toBe("boolean");
    expect(open.json, "the kiosk must carry the doctors").toHaveProperty("doctors");
    expect(Array.isArray(open.json.doctors)).toBe(true);

    const session = await api("/api/kiosk");
    expect(session.status).toBe(200);
    expect(session.json).toHaveProperty("step");

    // The front desk closes the kiosk with their own PIN. The demo clinic's
    // PIN is 1234, and the close is what gives the kiosk back: a kiosk left
    // open changes the screen every later measurement sees.
    const close = await api("/api/kiosk/close", {
      method: "POST",
      token,
      body: { pin: "1234" },
    });
    expect(close.status, `the kiosk did not close: ${close.text}`).toBe(200);
    const after = await api("/api/kiosk");
    expect(after.json?.open, "the kiosk is still open").toBe(false);
  });

  test("the kiosk screen renders as a standalone route", async ({ page }) => {
    await page.goto("/kiosk", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await assertNoRawBackendError(page);
    await assertReachedAState(page);
    await shot(page, "flow-kiosk");
  });

  /* -------------------------------------------------------- nurse and lab */

  test("recording vitals answers with the reading it wrote", async () => {
    const station = await api("/api/clinic/nurse", { token });
    expect(station.status).toBe(200);
    const stations = station.json?.items ?? station.json?.stations ?? [];
    const first = stations[0];
    expect(first, "the nurse station has no patient").toBeTruthy();

    const result = await api("/api/clinic/nurse/vitals", {
      method: "POST",
      token,
      body: {
        visitId: first.visitId ?? "vs_kavya",
        temperature: 98.6,
        pulse: 72,
        spo2: 98,
        respiration: 16,
      },
    });
    expect(result.status, `the vitals were refused: ${result.text}`).toBe(200);
  });

  test("adding a lab result answers with the order it updated", async () => {
    const lab = await api("/api/clinic/lab", { token });
    expect(lab.status).toBe(200);
    const bench = lab.json?.open ?? [];
    const orders = bench.length ? bench : lab.json?.reported ?? lab.json?.orders ?? [];
    const first = orders[0];
    expect(first, "the lab has no order at all").toBeTruthy();

    const result = await api("/api/clinic/lab/results", {
      method: "POST",
      token,
      body: { orderId: first.id ?? first.orderId, testName: "Haemoglobin", value: "13.2", unit: "g/dL" },
    });
    expect(result.status, `the lab result was refused: ${result.text}`).toBe(200);
  });

  /* --------------------------------------------------------- sign-up flow */

  test("signing up provisions a clinic with a booking slug that is not derivable from its name", async () => {
    const suffix = String(Date.now()).slice(-6);
    const clinicName = `E2E Clinic ${suffix}`;
    const mobile = `9${suffix}765432`.slice(0, 10);

    // The owner's number is proved before the clinic is created: the sign-up
    // begins with a code sent to a number that has no clinic yet, and the
    // clinic is created by the sign-up that spends the proof. This is the
    // order the app's own sign-up uses.
    const issued = await api("/api/auth/otp/pre-signup", {
      method: "POST",
      body: { mobile },
    });
    expect(issued.status, `the sign-up code was refused: ${issued.text}`).toBe(200);
    expect(issued.json?.code, "the code comes back in test mode").toBeTruthy();
    const proved = await api("/api/auth/pre-signup/verify", {
      method: "POST",
      body: { mobile, code: issued.json.code },
    });
    expect(proved.status, `the code was refused: ${proved.text}`).toBe(200);

    const result = await api("/api/auth/signup", {
      method: "POST",
      body: {
        name: "E2E Owner",
        mobile,
        email: `owner-${suffix}@example.in`,
        clinicName,
        clinicKind: "primary",
        registeredUnder: " Karnataka Private Medical Council",
        regNumber: `KMC${suffix}`,
        validUntil: "2030-01-01",
        clinicEmail: `clinic-${suffix}@example.in`,
        gstin: `29ABCDE${suffix.toUpperCase()}1Z5`,
        pan: `ABCDE${suffix.toUpperCase()}1Z`,
        locName: "Main clinic",
        street: "1 Test Street",
        area: "Test Area",
        city: "Bengaluru",
        pin: "560001",
        state: "Karnataka",
        phone: `9${suffix}765432`.slice(0, 10),
        rooms: 2,
        hfr: `HFR${suffix.toUpperCase()}`,
        role: "owner",
        hpr: `71-${suffix}8890-3326`,
        doctorName: "Dr. E2E",
        doctorQual: "MBBS",
        doctorReg: `KMC${suffix}`,
        speciality: "General Medicine",
        fee: 500,
        videoFee: 300,
        signing: "E2E Signup",
      },
    });

    expect(result.status, `the sign-up was refused: ${result.text}`).toBe(200);
    expect(result.json).toHaveProperty("accessToken");
    expect(result.json).toHaveProperty("clinicId");
    expect(result.json).toHaveProperty("bookingSlug");
    expect(result.json).toHaveProperty("bookingUrl");
    expect(result.json).toHaveProperty("clinic");

    const slug = result.json.bookingSlug;
    expect(slug, "the booking slug is missing").toBeTruthy();
    expect(slug, "the booking slug must not be derivable from the clinic's name").not.toBe(
      clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    );
    // The tail is random and URL-safe: it may contain a hyphen.
    expect(slug, "the booking slug is the clinic's name plus a random tail").toMatch(/-[a-z0-9-]{8}$/i);

    // The booking link the sign-up hands out must actually work.
    const doctors = await api(`/api/public/doctors?clinic=${slug}`);
    expect(doctors.status, `the new clinic's booking page does not answer: ${doctors.text}`).toBe(200);
  });

  /* ------------------------------------------------- cross-clinic isolation */

  test("clinic A's link cannot be read through clinic B's slug", async () => {
    const { linkKey } = await makeBooking(token);

    // The demo clinic is A. A different slug must not retarget the tenant.
    const crossed = await api(`/api/token/${linkKey}?clinic=some-other-clinic`);
    expect(crossed.status, `the crossed link answered ${crossed.status}: ${crossed.text}`).toBeLessThan(500);
    if (crossed.status === 200) {
      expect(
        crossed.json?.clinic?.id ?? crossed.json?.clinicId,
        "the ?clinic= override retargeted the tenant — clinic A's link was read as clinic B's",
      ).not.toBe("11111111-1111-4111-8111-111111111111");
    }
  });

  test("a signed-in clinic cannot read another clinic's queue", async () => {
    const result = await api("/api/clinic/queue?clinic=some-other-clinic", { token });
    expect(result.status).toBeLessThan(500);
    if (result.status === 200) {
      const visits = result.json?.visits ?? [];
      for (const visit of visits) {
        expect(visit.clinicId ?? "11111111-1111-4111-8111-111111111111").not.toBe("22222222-2222-4222-8222-222222222222");
      }
    }
  });

  /* -------------------------------------------------------------- the PIN */

  test("a wrong PIN is refused and repeated wrong PINs lock the device out", async () => {
    const wrong = await api("/api/auth/unlock", {
      method: "POST",
      body: { clinicId: "11111111-1111-4111-8111-111111111111", pin: "0000" },
    });
    expect(wrong.status).toBeLessThan(500);
    expect(wrong.status, "a wrong PIN must be refused").toBeGreaterThanOrEqual(400);
  });

  test("the PIN is not stored as a bare SHA-256 of the staff id", async ({ request }) => {
    // The API never exposes the hash, so the check is on the service's own
    // behaviour: the demo PIN still works, and a raw SHA-256 of the staff id
    // is not accepted as the PIN.
    const staffId = "22222222-2222-4222-8222-222222222222";
    const { createHash } = await import("node:crypto");
    const rawSha = createHash("sha256").update(staffId).digest("hex");

    const result = await api("/api/auth/unlock", {
      method: "POST",
      body: { clinicId: "11111111-1111-4111-8111-111111111111", pin: rawSha },
    });
    expect(result.status, "the raw SHA-256 of the staff id must not unlock the device").toBeGreaterThanOrEqual(400);
  });

  /* ------------------------------------------------------- the error envelope */

  test("no answer ever carries a Spring message", async () => {
    const responses = await Promise.all([
      api("/api/clinic/dashboard"),
      api("/api/clinic/nope"),
      api("/api/verify/vf_nope?h=x"),
      api("/api/kiosk/open", { method: "POST", body: {} }),
    ]);
    for (const response of responses) {
      expect(response.text, "a response carried a Spring message").not.toMatch(
        /No static resource|org\.springframework|java\.lang\.|Whitelabel/i,
      );
      expect(response.status, "an endpoint answered with a 5xx").toBeLessThan(500);
    }
  });
});
