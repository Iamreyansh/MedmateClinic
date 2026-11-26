import { defineConfig, devices } from "@playwright/test";

/**
 * The suite runs against the real stack: Postgres, the Spring Boot API and the
 * Vite SPA with `VITE_USE_MOCK=false`. There is no mock in this configuration
 * and no fallback — if the API is not up, every test fails, loudly.
 *
 *   API_URL   the API's base (default http://127.0.0.1:8080)
 *   WEB_URL   the SPA's base (default http://127.0.0.1:3100)
 */
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080";
const WEB_URL = process.env.WEB_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./.artifacts/test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "./.artifacts/report.json" }], ["html", { outputFolder: "./.artifacts/html", open: "never" }]],
  use: {
    baseURL: WEB_URL,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "api",
      testMatch: /api\.checks\.mjs/,
      use: { ...devices["Desktop Chrome"], baseURL: API_URL },
    },
    {
      name: "routes",
      testMatch: /routes\.checks\.mjs/,
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL, viewport: { width: 1280, height: 720 } },
    },
    {
      name: "flows",
      testMatch: /flows\.checks\.mjs/,
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL, viewport: { width: 1280, height: 720 } },
    },
  ],
});
