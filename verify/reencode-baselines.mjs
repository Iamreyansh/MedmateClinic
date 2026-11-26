/**
 * Re-encode the committed baselines.
 *
 * The baselines are full-page screenshots of a desktop app: 1280 wide and up
 * to 2000 tall. Stored as they are, they are 2.7 MB for twenty-one routes, and
 * a repository cannot carry that kind of binary weight for a design reference
 * that is compared, not looked at.
 *
 * So they are stored at half size, with an adaptive PNG filter — the same
 * pixels the eye would read, at a quarter of the bytes. The manifest records
 * the scale, and the harness shrinks the app's own capture the same way
 * before it compares, so the comparison stays like for like.
 *
 *   node verify/reencode-baselines.mjs            # the reference set
 *   node verify/reencode-baselines.mjs --set=history
 *   node verify/reencode-baselines.mjs --factor=1  # keep the full size
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, downscale } from "./png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const SET = option("set", "reference");
const FACTOR = Number(option("factor", "2"));
const dir = path.join(root, "verify", "baselines", SET);
const manifestPath = path.join(dir, "manifest.json");

if (!existsSync(dir)) {
  console.error(`✗ no baseline set at ${path.relative(root, dir)}`);
  process.exit(1);
}

let saved = 0;
let before = 0;
let after = 0;

for (const name of readdirSync(dir)) {
  if (!name.endsWith(".png")) continue;
  const file = path.join(dir, name);
  const original = readFileSync(file);
  before += original.length;

  const image = decodePng(original);
  const smaller = downscale(image, FACTOR);
  const encoded = encodePng(smaller);
  writeFileSync(file, encoded);
  after += encoded.length;
  saved += original.length - encoded.length;
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
manifest.storedScale = 1 / FACTOR;
manifest.storedNote =
  `The committed PNGs are stored at ${(100 / FACTOR).toFixed(0)}% of the capture size. The harness ` +
  `captures the app at the recorded viewport and shrinks it by the same factor before comparing.`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `✓ ${SET}: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB ` +
    `(saved ${(saved / 1024 / 1024).toFixed(2)} MB at ${1 / FACTOR} scale)`,
);
for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".png")).sort()) {
  console.log(`  ${String(readFileSync(path.join(dir, name)).length).padStart(7)} ${name}`);
}
