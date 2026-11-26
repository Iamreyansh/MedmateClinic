/**
 * Capture the reference baselines.
 *
 * The deployed MVP is the product's shipped design, so it is the baseline the
 * built app is measured against. This script walks every route in
 * `verify/routes.mjs`, signs in, screenshots each one at the recorded
 * viewport, and writes:
 *
 *   verify/baselines/reference/<route>.png   the screenshot
 *   verify/baselines/reference/manifest.json what was captured, and what the
 *                                           deployed app does not have
 *
 * A route the deployed MVP does not have is recorded as `missing` in the
 * manifest. It is never faked with a blank image.
 *
 *   node verify/capture-baselines.mjs
 *   REFERENCE_URL=https://… node verify/capture-baselines.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchOptions } from "./browser.mjs";
import { ROUTES, routeUrl, IDS } from "./routes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "verify", "baselines", "reference");

const REFERENCE_URL = process.env.REFERENCE_URL ?? "https://medmate-doctor-clinic.netlify.app";
const PHONE = process.env.REFERENCE_PHONE ?? "9876543210";
const VIEWPORT = { width: Number(process.env.REFERENCE_WIDTH ?? 1280), height: Number(process.env.REFERENCE_HEIGHT ?? 720) };
const DPR = Number(process.env.REFERENCE_DPR ?? 1);
const ONLY = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

/**
 * The public surfaces are captured without a session.
 *
 * The deployed app sends a signed-in visitor from `/` to the dashboard, so a
 * landing page captured with a cookie would be the dashboard's picture wearing
 * the landing page's name.
 */
const PUBLIC_IDS = new Set(["landing", "login", "start", "book", "book-live", "intake", "verify"]);

/** The deployed app's own 404 screen — a route it does not have lands here. */
const NOT_FOUND_MARKERS = ["page not found", "404", "not found"];

const sessionFile = "/tmp/medmate-mvp-session.json";

async function signIn(context) {
  // The deployed app rate-limits the OTP: five tries, then a cooldown. A
  // session kept in /tmp survives a re-run, so a second capture does not burn
  // another try.
  const saved = existsSync(sessionFile) ? JSON.parse(readFileSync(sessionFile, "utf8")) : null;
  if (saved?.cookie) {
    const [pair] = saved.cookie.split(";");
    const [name, value] = pair.split("=");
    await context.addCookies([
      { name, value, domain: new URL(REFERENCE_URL).hostname, path: "/" },
    ]);
    const check = await fetch(`${REFERENCE_URL}/api/me`, { headers: { cookie: saved.cookie } }).catch(() => null);
    if (check?.ok) return { name, length: value.length, reused: true };
  }

  let otp = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    otp = await fetch(`${REFERENCE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: PHONE }),
    }).then((response) => response.json());

    if (otp?.demoCode) break;
    console.log(`· the deployed app asked to wait (${otp?.error ?? "unknown"}); retrying in 35s`);
    await new Promise((resolve) => setTimeout(resolve, 35_000));
  }

  if (!otp?.demoCode) {
    throw new Error(
      `the deployed app did not return a demo code for ${PHONE}; it answered ${JSON.stringify(otp)}`,
    );
  }

  const verified = await fetch(`${REFERENCE_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: PHONE, code: otp.demoCode }),
  });
  if (!verified.ok) {
    throw new Error(`the deployed app refused the code: ${verified.status} ${await verified.text()}`);
  }

  const cookie = verified.headers.get("set-cookie");
  if (!cookie) throw new Error("the deployed app set no session cookie");
  writeFileSync(sessionFile, JSON.stringify({ cookie, savedAt: new Date().toISOString() }));
  const [pair] = cookie.split(";");
  const [name, value] = pair.split("=");
  await context.addCookies([
    { name, value, domain: new URL(REFERENCE_URL).hostname, path: "/" },
  ]);
  return { name, length: value.length };
}

/** Has the app drawn its own "not found" screen? */
async function looksLikeNotFound(page) {
  const text = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  return NOT_FOUND_MARKERS.some((marker) => text.includes(marker));
}

const browser = await chromium.launch(launchOptions());
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
const anonymous = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });

/**
 * `ANONYMOUS=1` skips the sign-in entirely.
 *
 * The deployed app rate-limits the OTP, so a re-capture of the public
 * surfaces must not need a session: the public pages are for visitors.
 */
const session = process.env.ANONYMOUS === "1" ? { name: "none", length: 0 } : await signIn(context);
if (session.reused) console.log("· reused the saved session cookie");

const manifestPath = path.join(outDir, "manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;

/**
 * The manifest is merged, not replaced: a re-capture of one route must not
 * erase what the others recorded.
 */
const manifest = {
  capturedAt: new Date().toISOString(),
  source: REFERENCE_URL,
  viewport: VIEWPORT,
  deviceScaleFactor: DPR,
  fullPage: true,
  mode: "deployed-mvp",
  apiMode: "the deployed MVP's own API — not the local mock",
  signedIn: session.name !== "none",
  note:
    "The deployed MVP is the shipped design. A route listed as `missing` is one the " +
    "deployed app does not have; no image was fabricated for it.",
  routes: { ...(previous?.routes ?? {}) },
};
manifest.capturedAt = previous?.capturedAt ?? manifest.capturedAt;

mkdirSync(outDir, { recursive: true });

const page = await context.newPage();
const anonymousPage = await anonymous.newPage();
const wanted = ONLY.length ? ROUTES.filter((route) => ONLY.includes(route.id)) : ROUTES;

for (const route of wanted) {
  const url = `${REFERENCE_URL}${routeUrl(route)}`;
  const isPublic = PUBLIC_IDS.has(route.id);
  const target = isPublic ? anonymousPage : page;
  let status = "missing";
  let note = "";

  try {
    const response = await target.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await target.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await target.waitForTimeout(900);

    const httpStatus = response?.status() ?? 0;
    const finalUrl = target.url();
    if (httpStatus >= 400) {
      note = `the deployed app answered HTTP ${httpStatus}`;
    } else if (await looksLikeNotFound(target)) {
      note = "the deployed app drew its not-found screen";
    } else {
      const file = path.join(outDir, `${route.id}.png`);
      await target.screenshot({ path: file, fullPage: true });
      status = "captured";
      manifest.routes[route.id] = {
        status,
        file: `reference/${route.id}.png`,
        url,
        finalUrl,
        httpStatus,
        signedIn: !isPublic,
        title: route.title,
      };
      console.log(`✓ ${route.id.padEnd(12)} ${url}`);
      continue;
    }
  } catch (error) {
    note = error.message;
  }

  manifest.routes[route.id] = { status, url, title: route.title, signedIn: !isPublic, note };
  console.log(`· ${route.id.padEnd(12)} ${status}${note ? ` — ${note}` : ""}`);
}

await anonymous.close();
await browser.close();

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const captured = Object.values(manifest.routes).filter((entry) => entry.status === "captured").length;
const missing = Object.values(manifest.routes).filter((entry) => entry.status !== "captured").length;
console.log(`\n${captured} captured, ${missing} missing — manifest written to verify/baselines/reference/manifest.json`);
