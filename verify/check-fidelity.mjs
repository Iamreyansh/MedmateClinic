/**
 * Fidelity check.
 *
 * Two things are verified, in this order:
 *
 *  1. Provenance — `src/styles/medmate.css` must be byte-identical to the
 *     stylesheet the deployed MVP ships. If it is not, someone edited the
 *     product stylesheet; product CSS is not ours to edit (fidelity rule 2).
 *
 *  2. Computed styles — the rendered values of the product's components must
 *     equal the values measured on the live MVP at 1280×720. This is the check
 *     that catches a token, a radius or a card dimension drifting.
 *
 * Usage:  npm run fidelity        (builds and starts the app if needed)
 *         FIDELITY_URL=… node verify/check-fidelity.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.FIDELITY_PORT ?? 3100);
const BASE_URL = process.env.FIDELITY_URL ?? `http://localhost:${PORT}`;
const FIDELITY_PHONE = process.env.FIDELITY_PHONE ?? "9876543210";
const DEPLOYED_CSS = "https://medmate-doctor-clinic.netlify.app/_next/static/chunks/252i6fbna1-7c.css";

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/* ------------------------------------------------------------------ checks */

/** [selector, property, expected] — measured on the live MVP at 1280×720. */
const CHECKS = [
  // tokens on the document root
  ["html", "--forest", "#1b3d29"],
  ["html", "--green", "#2f7d52"],
  ["html", "--gold", "#d9a648"],
  ["html", "--ink", "#14201a"],
  ["html", "--line", "#e7ece9"],
  ["html", "--side", "248px"],

  // document
  ["body", "font-family", 'Outfit, system-ui, sans-serif'],
  ["body", "font-size", "14px"],
  ["body", "color", "rgb(20, 32, 26)"],
  ["body", "background-color", "rgb(245, 248, 246)"],

  // shell
  ["#app", "display", "grid"],
  ["#app", "grid-template-columns", "248px 1032px"],
  [".side", "background-color", "rgb(27, 61, 41)"],
  [".side", "padding-top", "22px"],
  [".side", "padding-left", "14px"],
  [".side .wordmark", "font-size", "28px"],
  [".side .slogan", "font-size", "7.28px"],
  [".side .slogan", "letter-spacing", "3.0576px"],
  [".nav a", "height", "40px"],
  [".nav a", "font-size", "14px"],
  [".nav a", "font-weight", "600"],
  [".nav a", "border-radius", "12px"],
  [".nav a .lbl", "color", "rgb(217, 240, 225)"],
  [".nav-h", "font-size", "10.5px"],
  [".nav-h", "font-weight", "800"],
  [".nav-h", "letter-spacing", "1.26px"],
  [".topbar", "padding-top", "18px"],
  [".topbar", "padding-left", "28px"],
  [".topbar", "background-color", "rgb(245, 248, 246)"],
  [".page", "padding-left", "28px"],

  // station card
  [".st-card", "border-radius", "18px"],
  [".st-card", "padding", "18px"],
  [".st-card", "min-height", "150px"],
  [".st-card", "gap", "6px"],
  [".st-card", "border-top-width", "1px"],
  [".st-card", "border-top-color", "rgb(231, 236, 233)"],
  [".st-card", "background-color", "rgb(255, 255, 255)"],
  [".st-card b", "font-size", "16px"],
  [".st-card b", "font-weight", "700"],
  [".st-card p", "font-size", "12.5px"],
  [".st-card p", "line-height", "18.125px"],
  [".st-card p", "color", "rgb(59, 72, 66)"],
  [".st-ico", "width", "48px"],
  [".st-ico", "height", "48px"],
  [".st-ico", "border-radius", "14px"],
  [".st-ico svg", "width", "24px"],
  [".st-tag", "font-size", "10px"],
  [".st-tag", "font-weight", "800"],
  [".st-tag", "letter-spacing", "1.2px"],

  // controls
  [".btn", "height", "44px"],
  [".btn", "border-radius", "12px"],
  [".btn", "font-size", "14px"],
  [".btn", "font-weight", "700"],
  [".btn", "background-color", "rgb(47, 125, 82)"],
  [".btn.sm", "height", "34px"],
  [".btn.sm", "border-radius", "9px"],
  [".btn.sm", "font-size", "13px"],
  [".iconbtn", "width", "44px"],
  [".iconbtn", "height", "44px"],
  [".iconbtn", "border-radius", "12px"],
  [".chip", "height", "32px"],
  [".chip", "border-radius", "999px"],
  [".chip", "font-size", "12.5px"],
  [".chip", "font-weight", "600"],
  [".chip.on", "background-color", "rgb(244, 251, 246)"],
  [".chip:not(.on)", "border-top-style", "solid"],
  [".chip:not(.on)", "border-top-color", "rgb(213, 221, 216)"],
  [".input", "height", "46px"],
  [".input", "border-radius", "12px"],
  [".input", "border-top-style", "solid"],
  [".input", "border-top-color", "rgb(213, 221, 216)"],
  [".page .avatar", "width", "38px"],
  [".page .avatar", "height", "38px"],
  [".page .avatar", "border-radius", "12px"],
  [".page .avatar", "background-color", "rgb(217, 166, 72)"],
  [".userchip .avatar", "width", "34px"],
  [".userchip .avatar", "border-radius", "10px"],

  // tiles
  [".kpi", "border-radius", "16px"],
  [".kpi", "padding", "16px"],
  [".kpi .v", "font-size", "30px"],
  [".kpi .v", "font-weight", "800"],
  [".kpi .l", "font-size", "12.5px"],
  [".qstat", "border-radius", "14px"],
  [".qstat b", "font-size", "22px"],
  [".qstat b", "font-weight", "800"],
  [".note", "border-radius", "12px"],
  [".note", "font-size", "12.5px"],
  [".pills", "border-radius", "12px"],
  [".pills button", "height", "36px"],
  [".pills button", "font-size", "13px"],
  [".pills button", "font-weight", "700"],

  // station card count line
  [".st-count", "color", "rgb(37, 107, 70)"],
  [".st-count.warn", "color", "rgb(133, 91, 12)"],

  // manage row
  [".mg-row", "border-radius", "16px"],
  [".mg-row", "padding-top", "14px"],
  [".mg-row .tile", "width", "40px"],
  [".mg-row .tile", "border-radius", "12px"],
  [".mg-row b", "font-size", "14.5px"],
  [".mg-row small", "font-size", "12px"],

  // feature card
  [".lp-feat", "border-radius", "18px"],
  [".lp-feat>span", "width", "40px"],
  [".lp-feat h3", "font-size", "16.5px"],
  [".lp-feat p", "font-size", "14px"],

  // plan card
  [".pz-card", "border-radius", "22px"],
  [".pz-card h3", "font-size", "20px"],
  [".pz-tag", "font-size", "14px"],
  [".pz-price b", "font-size", "38px"],
  [".pz-sub", "font-size", "13px"],
  [".pz-card li", "font-size", "14px"],
  [".pz-badge", "font-size", "11.5px"],
  [".pz-badge", "background-color", "rgb(27, 61, 41)"],

  // badges and avatar tones
  [".badge", "font-size", "10.5px"],
  [".badge.gold", "background-color", "rgb(253, 248, 234)"],
  [".badge.blue", "background-color", "rgb(234, 241, 251)"],
  [".badge.red", "background-color", "rgb(252, 236, 233)"],
  [".badge.plain", "background-color", "rgb(237, 242, 239)"],
  [".avatar.av-nurse", "background-color", "rgb(233, 246, 238)"],
  [".avatar.av-reception", "background-color", "rgb(234, 241, 251)"],
  [".avatar.av-admin", "background-color", "rgb(27, 61, 41)"],

  // the location chip in the top bar
  [".topbar .avail", "height", "44px"],
  [".topbar .avail", "border-radius", "12px"],
  [".topbar .avail", "font-size", "13px"],
];


/** The mobile surfaces are measured at the phone viewport, 390×844. */
const MOBILE_CHECKS = [
  [".mob-head", "border-bottom-left-radius", "32px"],
  [".mob-head", "padding-top", "16px"],
  [".mob-head .wordmark", "font-size", "26px"],
  [".mob-head .slogan", "font-size", "6.8px"],
  [".mob-head h1", "font-size", "20px"],
  [".mob-head p", "font-size", "13px"],
  [".mob-head .iconbtn", "width", "40px"],
  [".bnav", "border-radius", "20px"],
  [".bnav", "padding", "6px"],
  [".bnav a", "font-size", "10.5px"],
  [".bnav a", "font-weight", "700"],
  [".bnav a.on", "background-color", "rgb(27, 61, 41)"],
  [".bnav .count", "font-size", "9px"],
  [".bnav .count", "background-color", "rgb(217, 166, 72)"],
  [".bnav button", "font-size", "10.5px"],
  [".bnav button", "border-radius", "14px"],
];

/* ------------------------------------------------------------------- steps */

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exitCode = 1;
}

async function checkProvenance() {
  const local = readFileSync(path.join(root, "src/styles/medmate.css"));
  const localHash = sha256(local);

  let deployed;
  try {
    const response = await fetch(DEPLOYED_CSS);
    deployed = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.log(`· stylesheet provenance skipped (offline: ${error.message})`);
    return;
  }

  // The border width is authored at 1.5px. Chrome rounds used border widths to
  // whole pixels, so the authored value is asserted on the stylesheet itself.
  const css = local.toString("utf8");
  for (const selector of [".chip", ".input"]) {
    const rule = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
    if (!rule || !/border:1\.5px solid var\(--line-2\)/.test(rule[1])) {
      fail(`${selector} must keep its authored 1.5px border.`);
    }
  }

  const deployedHash = sha256(deployed);
  if (localHash === deployedHash) {
    console.log(`✓ stylesheet is byte-identical to the deployed MVP (sha256 ${localHash.slice(0, 12)}…)`);
    return;
  }
  fail(
    `src/styles/medmate.css has drifted from the deployed stylesheet.\n` +
      `  local    ${localHash}\n` +
      `  deployed ${deployedHash}\n` +
      `  Product CSS is not edited. Put new rules in src/styles/app.css.`,
  );
}

function findChromium() {
  const base = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(base)) return undefined;
  for (const entry of readdirSync(base)) {
    if (!entry.startsWith("chromium-")) continue;
    const candidate = path.join(
      base,
      entry,
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    );
    if (existsSync(candidate)) return candidate;
    const arm = path.join(base, entry, "chrome-mac/Chromium.app/Contents/MacOS/Chromium");
    if (existsSync(arm)) return arm;
  }
  return undefined;
}

async function reachable(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await reachable(BASE_URL)) return null;
  console.log(`· starting the app on ${BASE_URL}`);
  // The app is a Vite SPA now, so the dev server is what serves it. The mock
  // answers the API, so no database and no Java service are needed.
  const child = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    cwd: root,
    stdio: "ignore",
    detached: false,
    env: { ...process.env, VITE_USE_MOCK: process.env.VITE_USE_MOCK ?? "true" },
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await reachable(BASE_URL)) return child;
  }
  child.kill();
  throw new Error("the app did not start");
}

/**
 * Sign in, so the shell draws the clinic, the person and the location that the
 * signed-in person actually has.
 *
 * Against the Java service the code comes over HTTP. Against the mock — which
 * runs in the browser, not on the server — there is no HTTP endpoint to call,
 * so the mock's own token is used. The shell only needs a token in storage.
 */
async function signIn() {
  try {
    const otp = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: FIDELITY_PHONE }),
    })
      .then((response) => response.json())
      .catch(() => null);

    if (otp?.code) {
      const session = await fetch(`${BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: FIDELITY_PHONE, code: otp.code }),
      })
        .then((response) => response.json())
        .catch(() => null);

      if (session?.accessToken) return session.accessToken;
    }
  } catch {
    // no service on the other side — the mock answers in the browser
  }

  // the mock's token: the app only checks that a token is present
  return "mock.access.token";
}

async function checkStyles() {
  const executablePath = findChromium();
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox"],
  });
  const token = await signIn();
  // deviceScaleFactor 2 matches the reference capture; a 1.5px border reports as 1px at DPR 1.
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  if (token) {
    // the app keeps its token in local storage, so the measurement needs it too
    await context.addInitScript((value) => {
      window.localStorage.setItem("medmate.token", value);
    }, token);
  }
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/fidelity`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const results = await page.evaluate((checks) => {
    return checks.map(([selector, property, expected]) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, property, expected, actual: null, missing: true };
      const style = getComputedStyle(element);
      const actual = style.getPropertyValue(property).trim();
      return { selector, property, expected, actual, missing: false };
    });
  }, CHECKS);

  // The mobile surfaces get their own pass at the phone viewport.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  if (token) {
    await phone.addInitScript((value) => {
      window.localStorage.setItem("medmate.token", value);
    }, token);
  }
  const phonePage = await phone.newPage();
  await phonePage.goto(`${BASE_URL}/fidelity`, { waitUntil: "networkidle" });
  await phonePage.waitForTimeout(400);
  const phoneResults = await phonePage.evaluate((checks) => {
    return checks.map(([selector, property, expected]) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, property, expected, actual: null, missing: true };
      const style = getComputedStyle(element);
      const actual = style.getPropertyValue(property).trim();
      return { selector, property, expected, actual, missing: false };
    });
  }, MOBILE_CHECKS);
  await phone.close();

  await browser.close();

  const all = [...results, ...phoneResults];
  const drift = all.filter((r) => r.missing || r.actual !== r.expected);
  for (const row of drift) {
    console.error(
      `  drift  ${row.selector} { ${row.property} }  expected ${row.expected}  got ${row.missing ? "MISSING" : row.actual}`,
    );
  }
  console.log(
    `${drift.length === 0 ? "✓" : "✗"} ${all.length} properties checked · ${drift.length} drift` +
      ` (${results.length} desktop, ${phoneResults.length} mobile)`,
  );
  if (drift.length) process.exitCode = 1;
}

const server = await ensureServer();
try {
  await checkProvenance();
  await checkStyles();
} finally {
  if (server) server.kill();
}
