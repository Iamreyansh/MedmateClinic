/**
 * The route matrix.
 *
 * One test per screen. Each one navigates, asserts the screen reached a state,
 * asserts no raw backend error reached the UI, and screenshots the final
 * state.
 *
 * The screen's own assertions — the list has a search field and masked
 * mobiles, the grid has slots — are per route, because a screen that renders
 * an error state is a pass for "no raw error" and a fail for "it works".
 */
import { test, expect } from "@playwright/test";
import { signIn, seedSession, assertNoRawBackendError, assertReachedAState, shot, DEMO_PHONE } from "../lib/helpers.mjs";

/** The staff routes the app has, and what each one must show. */
const STAFF_ROUTES = [
  { id: "dashboard", path: "/dashboard", expect: { selector: "main, .page", contains: /clinic|station|queue|kpi|visit/i } },
  { id: "queue", path: "/queue", expect: { selector: "main, .page" } },
  { id: "patients", path: "/patients", expect: { selector: "main, .page" } },
  { id: "desk", path: "/desk", expect: { selector: "main, .page" } },
  { id: "billing", path: "/billing", expect: { selector: "main, .page" } },
  { id: "schedule", path: "/schedule", expect: { selector: "main, .page" } },
  { id: "nurse", path: "/nurse", expect: { selector: "main, .page" } },
  { id: "lab", path: "/lab", expect: { selector: "main, .page" } },
  { id: "kiosk", path: "/kiosk", expect: { selector: "main, .page" } },
  { id: "subscription", path: "/subscription", expect: { selector: "main, .page" } },
  { id: "inbox", path: "/inbox", expect: { selector: "main, .page" } },
  { id: "teleconsult", path: "/teleconsult", expect: { selector: "main, .page" } },
  { id: "templates", path: "/templates", expect: { selector: "main, .page" } },
  { id: "reports", path: "/reports", expect: { selector: "main, .page" } },
  { id: "settings", path: "/settings", expect: { selector: "main, .page" } },
  { id: "certificate", path: "/certificate", expect: { selector: "main, .page" } },
];

test.describe("staff routes", () => {
  let token;

  test.beforeAll(async () => {
    token = await signIn();
  });

  for (const route of STAFF_ROUTES) {
    test(`${route.id} renders a state and leaks no backend error`, async ({ page, context }) => {
      await seedSession(context, token);
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response, `${route.id} did not answer at all`).not.toBeNull();
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);

      await assertNoRawBackendError(page);
      await assertReachedAState(page);
      await shot(page, `route-${route.id}`);
    });
  }

  test("the desk leaves its loading state — the header resolves", async ({ page, context }) => {
    await seedSession(context, token);
    await page.goto("/desk", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const screen = await page.locator("main .page").first().innerText();
    expect(screen, "the desk is still loading").not.toMatch(/Loading the desk…/);
    expect(screen).toMatch(/to hand over|waiting|done today/i);
    await shot(page, "route-desk-loaded");
  });

  test("the sign-in screen asks for a mobile number", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await assertNoRawBackendError(page);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(20);
    await shot(page, "route-login");
  });

  test("the landing page renders for a visitor", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await assertNoRawBackendError(page);
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/medmate|clinic|doctor|patients/i);
    await shot(page, "route-landing");
  });

  test("the patients screen shows the list — a search field, filter chips and masked mobiles", async ({ page, context }) => {
    await seedSession(context, token);
    await page.goto("/patients", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);

    await assertNoRawBackendError(page);
    const body = await page.locator("body").innerText();

    // A search field is an input, and an input's placeholder is not in the
    // text of the page: the element has to be looked for.
    const search = page.locator('input[type=search], input[placeholder*="search" i]');
    expect(await search.count(), "the patients screen has no search field").toBeGreaterThan(0);
    expect(body, "the patients screen has no filter chips").toMatch(/all|active|recent|new/i);
    // The list shows masked mobiles — "9876 •••• 210", not the raw number.
    expect(body, "the patients screen shows no masked mobile").toMatch(/[•*·x]{2,}|\d{4}\s*[•*·x]/i);
    expect(body, "the patients screen leaks a full mobile number").not.toContain(DEMO_PHONE);
    await shot(page, "route-patients-list");
  });
});
