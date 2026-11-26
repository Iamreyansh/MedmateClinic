/**
 * The fidelity check.
 *
 * Two things are verified, in this order:
 *
 *  1. Provenance — `src/styles/medmate.css` must be byte-identical to the
 *     stylesheet the deployed MVP ships. If it is not, someone edited the
 *     product stylesheet; product CSS is not ours to edit (fidelity rule 2).
 *     A deployed app that cannot be reached is a failure, not a skip: a
 *     check that quietly passes when the thing it checks has gone away is
 *     not a check.
 *
 *  2. The pixel diff — the built app is compared, screen by screen, with the
 *     committed baselines in `verify/baselines/`. This is the check that
 *     catches a screen that drifted, a region that moved, a label that
 *     changed. It used to be 138 hard-coded computed-style values asserted
 *     against the `/fidelity` style-guide route, which could not see a
 *     missing element, a wrong label or a wrong layout region; those
 *     assertions are gone.
 *
 * Usage:  npm run fidelity                    # the whole check
 *         npm run fidelity:pixels             # the pixel diff on its own
 *         node verify/check-fidelity.mjs --provenance-only
 *         FIDELITY_URL=… node verify/check-fidelity.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchOptions } from "./browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.FIDELITY_PORT ?? 3100);
const BASE_URL = process.env.FIDELITY_URL ?? `http://127.0.0.1:${PORT}`;
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080";
const DEPLOYED_CSS = "https://medmate-doctor-clinic.netlify.app/_next/static/chunks/252i6fbna1-7c.css";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

let failures = 0;

function fail(message) {
  console.error(`\n✗ ${message}`);
  failures += 1;
}

/* ------------------------------------------------------------------ checks */

/**
 * The stylesheet must still be the deployed stylesheet, and the deployed app
 * must still answer.
 */
async function checkProvenance() {
  const local = readFileSync(path.join(root, "src/styles/medmate.css"));

  let deployed;
  try {
    const response = await fetch(DEPLOYED_CSS, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      fail(
        `the deployed stylesheet answered HTTP ${response.status} (${DEPLOYED_CSS}). ` +
          `The deployed app must be reachable for this check to mean anything.`,
      );
      return;
    }
    deployed = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    fail(
      `the deployed app could not be reached (${DEPLOYED_CSS}): ${error.message}. ` +
        `This check fails closed: it cannot compare the product stylesheet with a deployed app it cannot see.`,
    );
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

  const localHash = sha256(local);
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

/**
 * Is anything listening on the API and the app?
 *
 * Vite binds `[::1]` by default, and `localhost` resolves to `127.0.0.1` in
 * Node — so a probe of `localhost` alone never reaches it. Both addresses
 * are probed, and so is the API, because the pixel diff is only meaningful
 * against the real backend.
 */
async function reachable(url) {
  try {
    const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureStack() {
  const appUp = (await reachable(`${BASE_URL}/`)) || (await reachable(`http://localhost:${PORT}/`));
  const apiUp = await reachable(`${API_URL}/actuator/health`);

  if (appUp && apiUp) return null;

  console.log("· starting the real stack (Postgres, the Java service, the SPA with VITE_USE_MOCK=false)");
  const child = spawn(path.join(root, "verify", "dev-stack.sh"), ["start"], {
    cwd: root,
    stdio: "inherit",
  });
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const app = (await reachable(`${BASE_URL}/`)) || (await reachable(`http://localhost:${PORT}/`));
    const api = await reachable(`${API_URL}/actuator/health`);
    if (app && api) return child;
  }
  child.kill("SIGTERM");
  throw new Error("the stack did not start — the API or the app never came up");
}

/**
 * The pixel diff, run in-process so its report is part of this check's output.
 */
async function checkPixels() {
  const script = path.join(root, "verify", "pixel-diff.mjs");
  const child = spawn(process.execPath, [script, "--url", BASE_URL], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, APP_URL: BASE_URL },
  });
  const code = await new Promise((resolve) => child.on("close", resolve));
  if (code !== 0) {
    fail(`the pixel diff found drift above the route budgets — see verify/baselines/diffs/`);
  }
}

/* -------------------------------------------------------------------- main */

if (!flag("provenance-only")) {
  const stack = await ensureStack();
  try {
    await checkProvenance();
    if (!flag("no-diff")) await checkPixels();
  } finally {
    if (stack) stack.kill("SIGTERM");
  }
} else {
  await checkProvenance();
}

if (failures > 0) {
  console.error(`\n✗ ${failures} fidelity check(s) failed`);
  process.exit(1);
}
console.log("\n✓ fidelity holds");
