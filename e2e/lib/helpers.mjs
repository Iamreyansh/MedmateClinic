/**
 * Shared helpers for the suite.
 *
 * Two rules the whole suite follows:
 *
 *  1. A screen that shows a raw backend error is a failure. The app must show
 *     a state a person can act on, never a Spring stack trace or a browser's
 *     "Failed to fetch".
 *  2. A screen that shows nothing at all is a failure. Every route has to
 *     reach a state — content, or a deliberate loading/empty/error state.
 */
import { expect } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080";
export const WEB_URL = process.env.WEB_URL ?? "http://127.0.0.1:3100";

/** The demo clinic's owner. */
export const DEMO_PHONE = process.env.DEMO_PHONE ?? "9876543210";
/** The demo clinic's booking slug (registry V2__booking_slug.sql). */
export const DEMO_SLUG = process.env.DEMO_SLUG ?? "medmate-clinic";

/**
 * The strings that mean the app leaked the backend's internals to the screen.
 *
 * The error envelope is `{title, detail}`; anything that looks like a Java
 * exception, a framework message or a raw SQL error is a defect.
 */
export const RAW_ERROR_PATTERNS = [
  /org\.springframework/i,
  /java\.lang\./i,
  /at com\.medmate\./i,
  /Exception in thread/i,
  /No static resource/i,
  /Whitelabel Error/i,
  /SQLSTATE/i,
  /PSQLException/i,
  /Caused by:/i,
  /Failed to fetch/i,
  /NetworkError when attempting to fetch resource/i,
  /Load failed/i,
];

/** The states a screen is allowed to be in when it has nothing to show. */
const STATE_MARKERS = [
  /loading/i,
  /no results/i,
  /nothing here/i,
  /empty/i,
  /no patients/i,
  /no invoices/i,
  /no appointments/i,
  /try again/i,
  /could not/i,
  /couldn't/i,
  /went wrong/i,
  /unavailable/i,
  /not built/i,
  /coming soon/i,
  /not signed in/i,
  /sign in/i,
  /choose a language/i,
  /welcome/i,
  /no visit chosen/i,
  /clinic settings/i,
  /letterhead/i,
  /not signed in/i,
];

/**
 * The text of the screen, without the chrome.
 *
 * The sidebar is always on the page and always has the same words in it, so a
 * check that reads the whole body would pass on the navigation alone. The
 * screen's own region is what has to say something.
 */
export async function pageText(page) {
  // The screen's own region, not the whole main: the top bar (the clinic, the
  // person, the location) is inside main, and it always has text in it, so
  // reading main would pass every screen whatever it drew.
  const region = page.locator("main .page");
  if (await region.count()) {
    const text = (await region.first().innerText().catch(() => "")).trim();
    if (text.length) return text;
  }
  return (await page.locator("body").innerText().catch(() => "")).trim();
}

/**
 * Assert the screen shows no raw backend error.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function assertNoRawBackendError(page) {
  const text = await pageText(page);
  for (const pattern of RAW_ERROR_PATTERNS) {
    const hit = text.match(pattern);
    expect(
      hit,
      `the screen leaked a raw backend error (${hit?.[0]}) — the app must render a state a person can act on`,
    ).toBeNull();
  }
  return text;
}

/**
 * Assert the screen reached a state at all: content, or one of the states the
 * app is allowed to be in when it has nothing to show.
 */
export async function assertReachedAState(page, { allow = [] } = {}) {
  const text = await pageText(page);
  expect(text.length, "the screen rendered nothing at all").toBeGreaterThan(20);
  const patterns = [...STATE_MARKERS, ...allow];
  const matched = patterns.some((pattern) => pattern.test(text));
  // A screen that drew several things of its own has content; one that drew a
  // single line has to say it is a state.
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  expect(
    matched || lines.length >= 3,
    `the screen is neither content nor a state — first 300 characters: ${text.slice(0, 300)}`,
  ).toBe(true);
  return text;
}

/**
 * Sign in and return the access token.
 *
 * @param {string} [phone]
 */
export async function signIn(phone = DEMO_PHONE) {
  const otp = await fetch(`${API_URL}/api/auth/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  }).then((response) => response.json());

  const code = otp?.code ?? otp?.demoCode;
  if (!code) throw new Error(`the API did not return a code for ${phone}: ${JSON.stringify(otp)}`);

  const session = await fetch(`${API_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  }).then((response) => response.json());

  if (!session?.accessToken) {
    throw new Error(`the API did not open a session: ${JSON.stringify(session)}`);
  }
  return session.accessToken;
}

/**
 * Open a page with the session already in local storage, so the shell draws a
 * real clinic rather than the sign-in screen.
 *
 * @param {import("@playwright/test").BrowserContext} context
 * @param {string} token
 */
export async function seedSession(context, token) {
  await context.addInitScript((value) => {
    window.localStorage.setItem("medmate.token", value);
  }, token);
}

/** Call the API with the session token. */
export async function api(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text, headers: response.headers };
}

/** The error envelope the API must use. */
export function assertErrorEnvelope(result, { status } = {}) {
  if (status) expect(result.status, `expected HTTP ${status}, got ${result.status}: ${result.text}`).toBe(status);
  expect(result.json, `the error answer is not JSON: ${result.text}`).not.toBeNull();
  expect(result.json).toHaveProperty("title");
  expect(result.json).toHaveProperty("detail");
  expect(result.text, "the error answer leaked a Spring message").not.toMatch(
    /org\.springframework|No static resource|java\.lang\./i,
  );
}

/** A fresh, high-entropy public link key — never a sequential "A-001". */
export function isHighEntropyKey(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,}$/.test(value) && !/^A-\d{3,}$/.test(value);
}

/** Take a screenshot into the run's artifact folder. */
export async function shot(page, name) {
  const path = `./.artifacts/screens/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}
