/**
 * Prepare the baseline sets.
 *
 * There are two, and neither is carried in the repository as a pile of
 * binaries:
 *
 *  - `verify/baselines/history/` — the deployed MVP's screens, as they were
 *    captured when the product shipped. The pixels are still in this
 *    repository's own history (`647ea0e^`), so they are restored from there.
 *    The restore is byte-for-byte reproducible: the same commit gives the same
 *    images every time.
 *
 *  - `verify/baselines/reference/` — the deployed MVP as it answers today,
 *    captured live. This needs the network, and the deployed app rate-limits
 *    the sign-in, so the capture is skipped when the set is already there.
 *
 * The manifests are tracked; the images are not. A baseline that cannot be
 * rebuilt is a missing baseline, and the pixel diff fails on a missing
 * baseline — it never skips one.
 *
 *   node verify/prepare-baselines.mjs
 *   node verify/prepare-baselines.mjs --skip-reference
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);

function run(script, extra = []) {
  const result = spawnSync(process.execPath, [path.join(root, "verify", script), ...extra], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`✗ ${script} failed`);
    process.exit(result.status ?? 1);
  }
}

const historyDir = path.join(root, "verify", "baselines", "history");
const referenceDir = path.join(root, "verify", "baselines", "reference");

// The history set is cheap to restore and always in step with the repository,
// so it is always restored.
if (!flag("skip-history")) {
  run("extract-history-baselines.mjs");
}

// The reference set is captured from the deployed app, which rate-limits its
// sign-in. It is only captured when it is not already there.
const referenceReady =
  existsSync(path.join(referenceDir, "manifest.json")) &&
  existsSync(path.join(referenceDir, "dashboard.png"));

// The live capture needs a signed-in session against the deployed app, and
// the deployed app rate-limits its OTP, so it is a local option. CI compares
// against the Figma export where one is present and the history set
// otherwise, and both of those it can always get.
if (flag("skip-reference")) {
  console.log("· the live reference capture is skipped — the comparison uses the Figma export or the history set");
} else if (referenceReady && !flag("force-reference")) {
  console.log("· the reference baseline set is already in place");
} else {
  run("capture-baselines.mjs");
}

console.log(`✓ baselines ready — ${path.relative(root, historyDir)}, ${path.relative(root, referenceDir)}`);
