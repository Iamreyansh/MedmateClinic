/**
 * The pixel-diff harness.
 *
 * It screenshots the local app, route by route, and compares each shot with a
 * baseline. Where the baseline comes from matters, so the harness says:
 *
 *  - `figma`     — `verify/baselines/figma/<route>.png`, a Figma export put in
 *                  by hand. The design itself, and the authoritative baseline
 *                  when it exists. Filename `<route>.png`, 1280×720, DPR 1.
 *  - `reference` — `verify/baselines/reference/<route>.png`, the deployed MVP
 *                  captured live. The shipped design.
 *  - `history`   — `verify/baselines/history/<route>.png`, the deployed MVP as
 *                  it was captured when the product shipped, restored from this
 *                  repository's own history.
 *
 * A Figma baseline wins over the MVP reference for the route it covers.
 *
 * It fails loudly. A missing baseline, an unreachable app or a route whose
 * screen never rendered is an error, not a skip — a harness that skips what it
 * cannot see is a harness that cannot fail.
 *
 *   node verify/pixel-diff.mjs
 *   node verify/pixel-diff.mjs --baseline=history --threshold=0.05
 *   node verify/pixel-diff.mjs --routes=dashboard,desk --json=out/report.json
 *   node verify/pixel-diff.mjs --scale 1 --strict
 *
 * Options
 *   --baseline=<reference|history>  which MVP baseline set to compare against
 *   --url=<url>          the app under test (default http://127.0.0.1:3100)
 *   --threshold=<0..1>   per-pixel colour tolerance (default 0.1)
 *   --max-drift=<pct>    per-route budget in percent of differing pixels
 *   --routes=a,b         only these route ids
 *   --out=<dir>          where the diff PNGs go (default verify/baselines/diffs)
 *   --json=<file>        where the machine-readable report goes
 *   --scale=<n>          the scale to compare at (default: the baseline's own)
 *   --strict             also capture the deployed MVP live and compare the two
 *                        at full resolution — the apples-to-apples check
 *   --update             rewrite the baselines from the current app
 *   --no-fail            report only; always exit 0
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchOptions } from "./browser.mjs";
import { decodePng, encodePng, downscale } from "./png.mjs";
import { ROUTES, routeUrl, IDS, baselineName } from "./routes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ options */

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  if (found) return found.slice(name.length + 3);
  const flagForm = args.indexOf(`--${name}`);
  return flagForm === -1 ? fallback : args[flagForm + 1];
};
const flag = (name) => args.includes(`--${name}`);

const BASELINE = option("baseline", "reference");
const APP_URL = option("url", process.env.APP_URL ?? "http://127.0.0.1:3100");
const THRESHOLD = Number(option("threshold", "0.1"));
const MAX_DRIFT = Number(option("max-drift", "12"));
const OUT_DIR = path.resolve(root, option("out", "verify/baselines/diffs"));
const JSON_OUT = option("json", null);
const SCALE = Number(option("scale", "0"));
const STRICT = flag("strict");
const UPDATE = flag("update");
const NO_FAIL = flag("no-fail");
const ROUTE_IDS = option("routes", "").split(",").map((id) => id.trim()).filter(Boolean);

const MVP_URL = process.env.REFERENCE_URL ?? "https://medmate-doctor-clinic.netlify.app";
const MVP_PHONE = process.env.REFERENCE_PHONE ?? IDS.phone;

const baselineDir = path.join(root, "verify", "baselines", BASELINE);
const figmaDir = path.join(root, "verify", "baselines", "figma");
const baselineManifestPath = path.join(baselineDir, "manifest.json");

/* ------------------------------------------------------------- image diffing */

/**
 * The colour distance between two pixels, as pixelmatch computes it: the
 * YIQ distance, weighted so that a difference the eye notices counts for more
 * than one it does not.
 */
function colourDelta(a, b) {
  const r1 = a[0];
  const g1 = a[1];
  const b1 = a[2];
  const r2 = b[0];
  const g2 = b[1];
  const b2 = b[2];

  const y = r1 * 0.29889531 + g1 * 0.58662247 + b1 * 0.11448223;
  const y2 = r2 * 0.29889531 + g2 * 0.58662247 + b2 * 0.11448223;
  const i = r1 * 0.59597799 - g1 * 0.2741761 - b1 * 0.32180189;
  const i2 = r2 * 0.59597799 - g2 * 0.2741761 - b2 * 0.32180189;
  const q = r1 * 0.21147017 - g1 * 0.52261711 + b1 * 0.31114694;
  const q2 = r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694;

  const dy = y - y2;
  const di = i - i2;
  const dq = q - q2;
  return 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq;
}

/**
 * Compare two RGBA images.
 *
 * @returns {{ differing: number, compared: number, percent: number, diff: Buffer, width: number, height: number, worst: {x: number, y: number, w: number, h: number, count: number} }}
 */
export function diffImages(baseline, actual, threshold) {
  const width = Math.min(baseline.width, actual.width);
  const height = Math.min(baseline.height, actual.height);
  const diff = Buffer.alloc(width * height * 4);

  // The worst region is found on a grid, so the report names a place on the
  // screen rather than a single stray pixel.
  const cellsX = 16;
  const cellsY = 16;
  const cellW = Math.max(1, Math.ceil(width / cellsX));
  const cellH = Math.max(1, Math.ceil(height / cellsY));
  const cells = new Int32Array(cellsX * cellsY);

  let differing = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ai = (y * actual.width + x) * 4;
      const bi = (y * baseline.width + x) * 4;
      const delta = colourDelta(baseline.data.subarray(bi, bi + 3), actual.data.subarray(ai, ai + 3));
      // pixelmatch's threshold is a squared YIQ distance.
      const limit = 35215 * threshold * threshold;
      const isDifferent = delta > limit;

      const di = (y * width + x) * 4;
      if (isDifferent) {
        differing += 1;
        cells[Math.floor(y / cellH) * cellsX + Math.floor(x / cellW)] += 1;
        diff[di] = 255;
        diff[di + 1] = 32;
        diff[di + 2] = 64;
        diff[di + 3] = 255;
      } else {
        // The unchanged pixels are faded greyscale, so the diff reads clearly.
        const grey = Math.round(
          (baseline.data[bi] * 0.299 + baseline.data[bi + 1] * 0.587 + baseline.data[bi + 2] * 0.114) * 0.25 + 191,
        );
        diff[di] = grey;
        diff[di + 1] = grey;
        diff[di + 2] = grey;
        diff[di + 3] = 255;
      }
    }
  }

  let worst = { x: 0, y: 0, w: cellW, h: cellH, count: 0 };
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] > worst.count) {
      worst = {
        x: (index % cellsX) * cellW,
        y: Math.floor(index / cellsX) * cellH,
        w: cellW,
        h: cellH,
        count: cells[index],
      };
    }
  }

  const compared = width * height;
  return {
    differing,
    compared,
    percent: compared === 0 ? 100 : (differing / compared) * 100,
    diff,
    width,
    height,
    worst,
  };
}

/* --------------------------------------------------------------- the capture */

/** Sign in against the local API so the shell draws a real clinic. */
async function signIn(context) {
  const otp = await fetch(`${APP_URL}/api/auth/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: IDS.phone }),
  })
    .then((response) => response.json())
    .catch(() => null);

  const code = otp?.code ?? otp?.demoCode;
  if (!code) return null;

  const session = await fetch(`${APP_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: IDS.phone, code }),
  })
    .then((response) => response.json())
    .catch(() => null);

  return session?.accessToken ?? null;
}

/**
 * Sign in to the deployed MVP and screenshot the routes at full resolution.
 *
 * This is the strict mode's reference: the same app, the same moment, the
 * same viewport — so the comparison is pixel for pixel rather than a stored
 * picture of a picture.
 */
async function captureLiveReference(routes, viewport, dpr) {
  const browser = await chromium.launch(launchOptions());
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr });
  const anonymous = await browser.newContext({ viewport, deviceScaleFactor: dpr });

  const saved = "/tmp/medmate-mvp-session.json";
  let cookie = existsSync(saved) ? JSON.parse(readFileSync(saved, "utf8")).cookie : null;
  if (!cookie) {
    const otp = await fetch(`${MVP_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: MVP_PHONE }),
    }).then((response) => response.json());
    if (!otp?.demoCode) {
      await browser.close();
      throw new Error(`the deployed app would not give a sign-in code: ${JSON.stringify(otp)}`);
    }
    const verified = await fetch(`${MVP_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: MVP_PHONE, code: otp.demoCode }),
    });
    cookie = verified.headers.get("set-cookie");
    if (!cookie) {
      await browser.close();
      throw new Error("the deployed app set no session cookie");
    }
    writeFileSync(saved, JSON.stringify({ cookie, savedAt: new Date().toISOString() }));
  }

  const [pair] = cookie.split(";");
  const [name, value] = pair.split("=");
  await context.addCookies([{ name, value, domain: new URL(MVP_URL).hostname, path: "/" }]);

  const page = await context.newPage();
  const shots = new Map();
  for (const route of routes) {
    try {
      await page.goto(`${MVP_URL}${routeUrl(route)}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(900);
      shots.set(route.id, await page.screenshot({ fullPage: true }));
    } catch (error) {
      console.error(`· the deployed MVP did not answer for ${route.id}: ${error.message}`);
    }
  }
  await anonymous.close();
  await browser.close();
  return shots;
}

function readManifest() {
  if (!existsSync(baselineManifestPath)) {
    throw new Error(
      `no baseline manifest at ${path.relative(root, baselineManifestPath)}. ` +
        `The ${BASELINE} baseline set has not been captured yet — run \`node verify/prepare-baselines.mjs\`.`,
    );
  }
  return JSON.parse(readFileSync(baselineManifestPath, "utf8"));
}

const manifest = readManifest();
const viewport = manifest.viewport ?? { width: 1280, height: 720 };
const dpr = manifest.deviceScaleFactor ?? 1;
/** The scale the stored baselines are at. */
const storedScale = manifest.storedScale ?? 1;

const routes = ROUTES.filter((route) => route.diff && (!ROUTE_IDS.length || ROUTE_IDS.includes(route.id)));

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch(launchOptions());
const context = await browser.newContext({ viewport, deviceScaleFactor: dpr });
const token = await signIn(context);
if (token) {
  await context.addInitScript((value) => {
    window.localStorage.setItem("medmate.token", value);
  }, token);
}
const page = await context.newPage();

/** The strict mode's reference: the deployed MVP, captured now, at full size. */
const liveShots = STRICT ? await captureLiveReference(routes, viewport, dpr) : new Map();

const report = {
  ranAt: new Date().toISOString(),
  baseline: BASELINE,
  app: APP_URL,
  viewport,
  deviceScaleFactor: dpr,
  storedScale,
  strict: STRICT,
  threshold: THRESHOLD,
  maxDrift: MAX_DRIFT,
  budgetNote:
    "Each route carries its own budget in verify/routes.mjs, and a route may carry a " +
    "declaration per baseline set: the drift it is expected to show against that set, " +
    "with a tolerance that covers the machine the declaration was measured on. A route " +
    "with no declaration for the set being diffed is held to its budget.",
  routes: [],
  errors: [],
};

for (const route of routes) {
  const url = `${APP_URL}${routeUrl(route)}`;

  // A Figma export, when there is one, is the design and wins. The file is
  // looked for under the published naming rule, so a person exporting from
  // Figma and the harness agree without a lookup table.
  const figmaFile = path.join(figmaDir, baselineName(route.path));
  const hasFigma = existsSync(figmaFile);
  const baselineFile = hasFigma ? figmaFile : path.join(baselineDir, `${route.id}.png`);
  const source = hasFigma ? "figma" : BASELINE;

  if (!existsSync(baselineFile)) {
    const entry = {
      id: route.id,
      source,
      status: "error",
      error: `no baseline for ${route.id} in ${path.relative(root, path.dirname(baselineFile))}`,
    };
    report.routes.push(entry);
    report.errors.push(`${route.id}: ${entry.error}`);
    console.error(`✗ ${route.id.padEnd(12)} ${entry.error}`);
    continue;
  }

  let shot;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    shot = await page.screenshot({ fullPage: true });
  } catch (error) {
    const entry = { id: route.id, source, status: "error", error: `the app did not answer at ${url}: ${error.message}` };
    report.routes.push(entry);
    report.errors.push(`${route.id}: ${entry.error}`);
    console.error(`✗ ${route.id.padEnd(12)} ${entry.error}`);
    continue;
  }

  // A screen that reached an error or empty state is not the screen this
  // comparison is about, and it sits close enough to the baseline's empty
  // space to look like a tiny drift — which is how a broken screen used to
  // pass a visual check. The app's own states are marked in the DOM:
  // `.note.red` is the error state, `.empty-card` the empty one. So they are
  // asked for, not guessed at from the pixels.
  const state = await page
    .evaluate(() => {
      const body = document.body;
      const text = (body?.innerText ?? "").trim();
      const screen = document.querySelector("main .page") ?? document.querySelector("main") ?? body;
      const screenText = (screen?.innerText ?? "").trim();
      return {
        textLength: text.length,
        screenTextLength: screenText.length,
        error: Boolean(document.querySelector(".note.red")),
        empty: Boolean(document.querySelector(".empty-card")),
        loading: /loading/i.test(screenText) && screenText.length < 400,
      };
    })
    .catch(() => null);

  const stateProblem = !state
    ? "the screen could not be read"
    : state.textLength === 0
      ? "the screen rendered nothing"
      : state.error
        ? "the screen is showing its error state"
        : state.empty
          ? "the screen is showing its empty state"
          : state.loading
            ? "the screen is still loading"
            : null;

  if (stateProblem) {
    const entry = { id: route.id, source, status: "error", error: `${stateProblem} at ${url}` };
    report.routes.push(entry);
    report.errors.push(`${route.id}: ${entry.error}`);
    console.error(`✗ ${route.id.padEnd(12)} ${entry.error}`);
    continue;
  }

  // The gate is the drift the route is declared to show, plus a tolerance
  // that covers the machine the declaration was measured on: a pixel
  // percentage is not a portable measurement. A declaration belongs to one
  // baseline set, because the same screen legitimately drifts further from
  // the MVP as it shipped than from the MVP as it answers today. A route with
  // no declaration for this set is held to its budget, so an unexpected
  // change still breaks the build.
  const declared = route.expected?.[source] ?? null;
  const tolerance = declared?.tolerance ?? 0;
  const budget = declared ? declared.percent + tolerance : route.budget ?? MAX_DRIFT;
  const floor = declared ? Math.max(0, declared.percent - tolerance) : null;
  const entry = { id: route.id, source, url, budget };

  if (UPDATE) {
    writeFileSync(baselineFile, shot);
    entry.status = "updated";
    entry.percent = 0;
    report.routes.push(entry);
    console.log(`↻ ${route.id.padEnd(12)} baseline rewritten (${source})`);
    continue;
  }

  // The stored comparison, at the scale the baseline is stored at.
  const shrink = storedScale < 1 ? Math.round(1 / storedScale) : 1;
  const storedBaseline = decodePng(readFileSync(baselineFile));
  const storedActual = downscale(decodePng(shot), shrink);
  const stored = diffImages(storedBaseline, storedActual, THRESHOLD);
  writeFileSync(path.join(OUT_DIR, `${route.id}.png`), encodePng({ width: stored.width, height: stored.height, data: stored.diff }));

  entry.percent = Number(stored.percent.toFixed(3));
  entry.differing = stored.differing;
  entry.compared = stored.compared;
  entry.baselineSize = [storedBaseline.width, storedBaseline.height];
  entry.actualSize = [storedActual.width, storedActual.height];
  entry.sizeMismatch = storedBaseline.width !== storedActual.width || storedBaseline.height !== storedActual.height;
  entry.worstRegion = stored.worst;
  entry.diffFile = path.relative(root, path.join(OUT_DIR, `${route.id}.png`));

  // The strict comparison, at full resolution, against the deployed MVP as it
  // answers right now.
  if (STRICT && liveShots.has(route.id)) {
    const liveBaseline = decodePng(liveShots.get(route.id));
    const liveActual = decodePng(shot);
    const strict = diffImages(liveBaseline, liveActual, THRESHOLD);
    writeFileSync(path.join(OUT_DIR, `${route.id}.strict.png`), encodePng({ width: strict.width, height: strict.height, data: strict.diff }));
    entry.strictPercent = Number(strict.percent.toFixed(3));
    entry.strictWorstRegion = strict.worst;
    entry.strictDiffFile = path.relative(root, path.join(OUT_DIR, `${route.id}.strict.png`));
    entry.strictSizeMismatch =
      liveBaseline.width !== liveActual.width || liveBaseline.height !== liveActual.height;
  }

  entry.baselineFile = path.relative(root, baselineFile);
  entry.expected = declared ? { percent: declared.percent, tolerance: declared.tolerance, reason: declared.reason } : null;
  entry.gate = declared
    ? { band: [floor, budget], percent: declared.percent, tolerance: declared.tolerance }
    : budget;
  const above = entry.percent > budget;
  const below = floor !== null && entry.percent < floor;
  entry.status = above || below ? "fail" : "pass";
  if (entry.status === "fail") {
    report.errors.push(
      `${route.id}: ${entry.percent}% of pixels differ — ` +
        (declared ? `the declaration is ${declared.percent}% ± ${declared.tolerance}%` : `the budget is ${budget}%`) +
        `${above ? " (more than declared)" : " (less than declared — the screen changed shape)"} — ${entry.diffFile}`,
    );
  }

  const flag = entry.status === "fail" ? "✗" : "✓";
  const strictText =
    entry.strictPercent === undefined ? "" : `   strict ${String(entry.strictPercent).padStart(7)}%`;
  const expectedText = entry.expected ? `   declared ${entry.expected.percent}% ± ${entry.expected.tolerance}%` : "";
  console.log(
    `${flag} ${route.id.padEnd(12)} ${String(entry.percent).padStart(7)}% differ  [${source}]${strictText}${expectedText}` +
      `  worst ${stored.worst.count}px at ${stored.worst.x},${stored.worst.y}` +
      (entry.sizeMismatch ? `  (size ${entry.baselineSize.join("x")} vs ${entry.actualSize.join("x")})` : ""),
  );

  report.routes.push(entry);
}

await browser.close();

/* ---------------------------------------------------------------- the report */

const width = Math.max(...report.routes.map((entry) => entry.id.length), 12);
console.log(`\n${"route".padEnd(width)}  ${"scaled".padStart(8)}  ${"strict".padStart(8)}  ${"declared".padStart(11)}  source   worst region`);
console.log(`${"-".repeat(width)}  ${"-".repeat(8)}  ${"-".repeat(8)}  ${"-".repeat(11)}  ${"-".repeat(7)}   ${"-".repeat(20)}`);
for (const entry of report.routes) {
  console.log(
    `${entry.id.padEnd(width)}  ${String(entry.percent ?? "-").padStart(7)}%  ` +
      `${String(entry.strictPercent ?? "-").padStart(7)}%  ` +
      `${String(entry.expected ? `${entry.expected.percent}±${entry.expected.tolerance}%` : "-").padStart(11)}  ` +
      `${(entry.source ?? "-").padEnd(7)}  ` +
      `x${entry.worstRegion?.x ?? "-"} y${entry.worstRegion?.y ?? "-"} ${entry.worstRegion?.count ?? "-"}px`,
  );
  if (entry.expected) console.log(`${" ".repeat(width)}  declared: ${entry.expected.reason}`);
}

if (JSON_OUT) {
  mkdirSync(path.dirname(path.resolve(root, JSON_OUT)), { recursive: true });
  writeFileSync(path.resolve(root, JSON_OUT), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nreport written to ${JSON_OUT}`);
}

if (report.errors.length) {
  console.error(`\n✗ ${report.errors.length} problem(s):`);
  for (const error of report.errors) console.error(`  ${error}`);
  if (!NO_FAIL) process.exitCode = 1;
} else {
  console.log(`\n✓ every route is within its gate of the ${BASELINE} baseline`);
}
