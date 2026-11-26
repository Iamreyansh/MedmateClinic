/**
 * Capture the deployed MVP's rendered markup.
 *
 * The MVP is the pixel reference for this rebuild, and it is the same
 * stylesheet. Its pages fetch their data in the browser, so the served HTML
 * is only a shell — this script signs in, waits for the data to land, and
 * writes the rendered DOM out for comparison.
 */
const { chromium } = require("playwright-core");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const BASE = "https://medmate-doctor-clinic.netlify.app";
const PHONE = "9876543210";
const OUT = process.argv[2] ?? "/tmp/mvp/rendered";

/**
 * The browser.
 *
 * The old search only knew the macOS Playwright cache, so on Linux this script
 * launched with no browser at all. `verify/browser.mjs` knows Linux, macOS,
 * Windows and the agent-browser's own Chrome.
 */
async function findChromium() {
  const { launchOptions } = await import(path.join(__dirname, "browser.mjs"));
  return launchOptions().executablePath;
}

const PAGES = process.argv.slice(3);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // sign in — the demo mode returns the OTP in the API's response
  let otpCode = null;
  page.on("response", async (res) => {
    if (res.url().includes("/api/auth/otp")) {
      try {
        const body = await res.json();
        if (body?.demoCode) otpCode = body.demoCode;
      } catch {
        // not the one
      }
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.fill("#phone", PHONE);
  await page.click('button:has-text("Send code")');
  await page.waitForTimeout(2500);
  console.log("otp:", otpCode);

  // the code box may be a set of separate digit boxes
  const boxes = await page.$$("input");
  console.log("inputs after send:", boxes.length);
  for (const box of boxes) {
    const id = await box.getAttribute("id");
    if (id && id !== "phone") await box.fill(String(otpCode ?? "123456"));
  }
  await page.click('button:has-text("Verify"), button:has-text("Sign in"), button:has-text("Continue"), button:has-text("Verify & continue")').catch(() => {});
  await page.waitForTimeout(3500);
  console.log("after sign-in:", page.url());

  // If the sign-in did not take, set the session cookie the API handed out.
  const cookies = await context.cookies();
  if (!cookies.some((c) => c.name === "mmd_session")) {
    const raw = fs.readFileSync("/tmp/mvp/cookies.txt", "utf8");
    const match = raw.match(/mmd_session\t(\S+)/);
    if (match) {
      await context.addCookies([
        {
          name: "mmd_session",
          value: match[1],
          domain: "medmate-doctor-clinic.netlify.app",
          path: "/",
          httpOnly: true,
          secure: true,
        },
      ]);
      console.log("session cookie injected");
    }
  }

  for (const p of PAGES) {
    await page.goto(`${BASE}/${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync(path.join(OUT, `${p}.html`), html);
    console.log(`${p} -> ${html.length} bytes`);
  }

  await browser.close();
})();

/** Open every dialog a page carries and capture it. */
async function captureDialogs(page, out, spec) {
  for (const [route, label, trigger] of spec) {
    await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2200);
    const button = await page.$(`button:has-text("${trigger}")`);
    if (!button) {
      console.log(`${route} / "${trigger}" -> no button`);
      continue;
    }
    await button.click();
    await page.waitForTimeout(1400);
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync(path.join(out, `dialog-${label}.html`), html);
    console.log(`dialog ${label} -> ${html.length} bytes`);
  }
}
