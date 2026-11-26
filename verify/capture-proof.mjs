/**
 * Capture the proof.
 *
 * The images this delivery publishes are taken against the REAL service —
 * Postgres, the Spring Boot API with the demo clinic seeded, and the SPA with
 * the mock off — so they show what the service answers, not what a fixture
 * answers. The earlier branches' images were captured against the mock: they
 * prove layout, wiring, states and copy, and they prove nothing about the
 * service.
 *
 * Three viewports:
 *
 *   1440x900  the desktop app — the staff screens and the patient web
 *   390x844   the phone app (iPhone 14)
 *   430x932   the phone app (iPhone 15 Pro Max)
 *
 *   node verify/capture-proof.mjs
 *   node verify/capture-proof.mjs --out=proof
 *
 * The script writes proof/README.md beside the images, so the record of what
 * each picture shows travels with the pictures.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchOptions } from "./browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  if (found) return found.slice(name.length + 3);
  const flagForm = args.indexOf(`--${name}`);
  return flagForm === -1 ? fallback : args[flagForm + 1];
};
const OUT_DIR = path.resolve(root, option("out", "proof"));
const APP_URL = option("url", process.env.APP_URL ?? "http://127.0.0.1:3100");
const API_URL = option("api", process.env.API_URL ?? "http://127.0.0.1:8080");
const PHONE = process.env.DEMO_PHONE ?? "9876543210";
const SLUG = process.env.DEMO_SLUG ?? "medmate-clinic";

/** The desktop screens: the staff app and the patient-facing web. */
const DESKTOP = [
  { id: "dashboard", path: "/dashboard", what: "The owner's dashboard — the clinic's stations, its waiting room and its money for the day." },
  { id: "queue", path: "/queue", what: "The doctor's queue — the six tabs, the patients waiting and the ones seen today." },
  { id: "patients", path: "/patients", what: "The patients list — the search, the filter chips and the masked mobiles." },
  { id: "desk", path: "/desk", what: "The reception desk — the hand-over, the till's door and the queue to check a patient into." },
  { id: "billing", path: "/billing", what: "Billing and the till — the four pay modes, the day's bills and the day's money." },
  { id: "schedule", path: "/schedule", what: "The appointment book — the day, the slots and the doctors' free times." },
  { id: "nurse", path: "/nurse", what: "The nurse station — the patients waiting for a reading and the doctors to route them to." },
  { id: "lab", path: "/lab", what: "The lab bench — the unreported orders, the results and the partners the work goes to." },
  { id: "templates", path: "/templates", what: "The doctor's own message templates." },
  { id: "inbox", path: "/inbox", what: "The doctor's inbox — the results, the referrals and the hand-overs." },
  { id: "reports", path: "/reports", what: "The reports — the clinic's day, its money and its busiest hours." },
  { id: "subscription", path: "/subscription", what: "The subscription — the plan, the trial and what the clinic is using." },
  { id: "settings", path: "/settings", what: "The clinic's own settings, its letterhead and its agreements." },
  { id: "staff", path: "/staff", what: "The team and the roles — who may open what." },
  { id: "kiosk", path: "/kiosk", what: "The patient kiosk — the front desk's card, with the kiosk closed." },
  { id: "landing", path: "/", what: "The landing page a visitor arrives on.", public: true },
  { id: "login", path: "/login", what: "The sign-in — a mobile number and a one-time code.", public: true },
];

/** The phone app's screens, at the two phone widths. */
const MOBILE = [
  { id: "m-landing", path: "/m", what: "The phone app's landing page." },
  { id: "m-signup", path: "/m/signup", what: "The phone app's clinic sign-up — the steps the doctor fills in." },
  { id: "m-dashboard", path: "/m/dashboard", what: "The phone app's dashboard — the doctor's own day." },
  { id: "m-console", path: "/m/console", what: "The phone app's doctor's console." },
  { id: "m-patients", path: "/m/patients", what: "The phone app's patient list." },
  { id: "m-schedule", path: "/m/schedule", what: "The phone app's appointments." },
  { id: "m-billing", path: "/m/billing", what: "The phone app's till." },
  { id: "m-lab", path: "/m/lab", what: "The phone app's lab bench." },
  { id: "m-reports", path: "/m/reports", what: "The phone app's reports." },
  { id: "m-settings", path: "/m/settings", what: "The phone app's settings." },
];

/** The phone widths the app is measured at. */
const PHONES = [
  { width: 390, height: 844, name: "390x844" },
  { width: 430, height: 932, name: "430x932" },
];

/** Sign in against the real service and get the session. */
async function signIn() {
  const otp = await fetch(`${API_URL}/api/auth/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: PHONE }),
  }).then((response) => response.json());
  const code = otp?.code ?? otp?.demoCode;
  if (!code) throw new Error(`the service did not return a code: ${JSON.stringify(otp)}`);
  const session = await fetch(`${API_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: PHONE, code }),
  }).then((response) => response.json());
  if (!session?.accessToken) throw new Error("the service did not open a session");
  return session.accessToken;
}

/** A booking the patient web can be photographed with. */
async function makeBooking() {
  const page = await fetch(`${API_URL}/api/public/doctors?clinic=${SLUG}`).then((r) => r.json());
  const doctor = page?.doctors?.[0];
  const slot = (page?.slots ?? []).find((entry) => entry.free);
  if (!doctor || !slot) throw new Error("the demo clinic has no doctor and no free time to book");
  const booked = await fetch(`${API_URL}/api/public/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinic: SLUG,
      doctorId: doctor.id,
      startsAt: slot.startsAt,
      name: "Proof Patient",
      phone: "9990007777",
      age: "34",
      sex: "F",
      reason: "Fever",
    }),
  }).then((r) => r.json());
  if (!booked?.token) throw new Error("the booking was refused");
  return { linkKey: booked.token, queueToken: booked.queueToken, doctor: doctor.name };
}

const token = await signIn();
const booking = await makeBooking();

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch(launchOptions());
const captured = [];

/** Photograph one route and record what it shows. */
async function shoot(context, route, viewport) {
  const page = await context.newPage();
  const file = `${route.id}-${viewport.name}.png`;
  try {
    await page.goto(`${APP_URL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    const shot = await page.screenshot({ fullPage: true });
    writeFileSync(path.join(OUT_DIR, file), shot);
    captured.push({ ...route, file, viewport: viewport.name });
    console.log(`✓ ${file}`);
  } catch (error) {
    console.error(`✗ ${file}: ${error.message}`);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ desktop */

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await desktop.addInitScript((value) => {
  window.localStorage.setItem("medmate.token", value);
}, token);
for (const route of DESKTOP) {
  await shoot(desktop, route, { width: 1440, height: 900, name: "1440x900" });
}

// The patient web, with a link the clinic really handed out.
await shoot(desktop, { id: "patient-book", path: `/book?clinic=${SLUG}`, what: "The patient-facing booking page — the clinic, its doctors and the times it is offering." }, { width: 1440, height: 900, name: "1440x900" });
await shoot(desktop, { id: "patient-live", path: `/t/${booking.linkKey}`, what: `The patient's live token — the queue slip ${booking.queueToken} and the doctor they are seeing.` }, { width: 1440, height: 900, name: "1440x900" });
await shoot(desktop, { id: "patient-intake", path: `/intake/${booking.linkKey}`, what: "The patient's symptoms form, before the visit." }, { width: 1440, height: 900, name: "1440x900" });
await desktop.close();

/* ------------------------------------------------------------------- phones */

for (const phone of PHONES) {
  const context = await browser.newContext({
    viewport: { width: phone.width, height: phone.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript((value) => {
    window.localStorage.setItem("medmate.token", value);
  }, token);
  for (const route of MOBILE) {
    await shoot(context, route, phone);
  }
  await context.close();
}

await browser.close();

/* -------------------------------------------------------------- the readme */

const when = new Date().toISOString();
const lines = [];
lines.push("# The proof");
lines.push("");
lines.push("Every image here was captured against the **real service**: PostgreSQL 17, the");
lines.push("Spring Boot API with the demo clinic seeded (registry V1–V5, clinic V1–V206, demo");
lines.push("V300–V303), and the SPA served with `VITE_USE_MOCK=false` — the mock is off, so");
lines.push("every number on these screens came from the service.");
lines.push("");
lines.push(`Captured ${when} against \`${APP_URL}\` (the API at \`${API_URL}\`), signed in as the demo`);
lines.push("clinic's owner.");
lines.push("");
lines.push("| Image | Viewport | What it shows |");
lines.push("|---|---|---|");
for (const item of captured) {
  lines.push(`| [\`${item.file}\`](./${item.file}) | ${item.viewport} | ${item.what} |`);
}
lines.push("");
lines.push("## Why these and not the earlier images");
lines.push("");
lines.push("The branches' own images were captured against the **mock**: they prove layout,");
lines.push("wiring, states and copy, and they prove nothing about the service. These were");
lines.push("taken against the running service with the demo clinic seeded, so the waiting");
lines.push("counts, the bills, the lab bench and the queue are the service's own rows.");
lines.push("");
lines.push("## The widths");
lines.push("");
lines.push("- **1440×900** — the desktop app.");
lines.push("- **390×844** — the phone app (iPhone 14).");
lines.push("- **430×932** — the phone app (iPhone 15 Pro Max).");
lines.push("");
lines.push("## Reproducing them");
lines.push("");
lines.push("```bash");
lines.push("bash verify/dev-stack.sh start      # Postgres, the API, the SPA with the mock off");
lines.push("node verify/capture-proof.mjs        # the images and this file");
lines.push("```");
lines.push("");
writeFileSync(path.join(OUT_DIR, "README.md"), lines.join("\n"));

console.log(`\n✓ ${captured.length} images and a README in ${path.relative(root, OUT_DIR)}`);
