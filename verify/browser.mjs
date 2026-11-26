/**
 * Where the browser is.
 *
 * The original harness looked only in the macOS Playwright cache
 * (`~/Library/Caches/ms-playwright/chrome-mac-arm64/...`), so on Linux — where
 * CI and every developer box actually runs — `chromium.launch()` was called
 * with `executablePath: undefined` and no browser. This module finds a
 * browser on Linux, macOS and Windows, and fails with a message that says how
 * to fix it.
 */
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** The browsers the Roomote agent-browser ships, if it is installed. */
function agentBrowserChrome() {
  const roots = [
    path.join(os.homedir(), ".agent-browser", "browsers"),
    "/home/roomote/.agent-browser/browsers",
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const candidate = path.join(root, entry, "chrome");
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

/** The Playwright browser cache, on every platform Playwright supports. */
function playwrightBrowsers() {
  const bases = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), "AppData", "Local", "ms-playwright"),
  ].filter(Boolean);

  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      if (!entry.startsWith("chromium")) continue;
      const dir = path.join(base, entry);
      const candidates = [
        path.join(dir, "chrome-linux", "chrome"),
        path.join(dir, "chrome-linux64", "chrome"),
        path.join(dir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(dir, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
        path.join(dir, "chrome-win", "chrome.exe"),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

/** A system Chrome or Chromium, if one is installed. */
function systemChrome() {
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * The browser executable to launch.
 *
 * @returns {string | undefined} the path, or undefined when Playwright should
 *   use its own default resolution.
 */
export function findBrowser() {
  return process.env.CHROME_PATH || agentBrowserChrome() || playwrightBrowsers() || systemChrome();
}

/**
 * The launch options every script here uses.
 *
 * @param {import("playwright-core").LaunchOptions} [extra]
 */
export function launchOptions(extra = {}) {
  const executablePath = findBrowser();
  if (!executablePath) {
    throw new Error(
      "No Chromium found. Install one with `npx playwright install chromium`, " +
        "or set CHROME_PATH to a Chrome binary.",
    );
  }
  return { executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"], ...extra };
}
