/**
 * Prepare the large files for publication.
 *
 * A file that travels through the API is transcribed by hand, and a long
 * high-entropy string picks up a slip about once every three thousand
 * characters. The cost of a slip is the file being emitted again, so the
 * cheap answer is to make the string shorter: gzip.
 *
 * This writes `<file>.gz` next to each file above the threshold and records
 * the entry in `scripts/assemble-manifest.txt` — the sha of the ORIGINAL bytes,
 * the target path, the part, and the `gzip` flag. The assembler gunzips the
 * joined parts and checks the sha of what comes out, so a file that did not
 * survive the journey is never committed.
 *
 *   node verify/prepare-large-files.mjs            # everything above 8 KB
 *   node verify/prepare-large-files.mjs --min=0    # everything
 */
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const MIN = Number(option("min", "8192"));

const changed = spawnSync("git", ["diff", "--name-only", "origin/main..HEAD"], { cwd: root })
  .stdout.toString()
  .split("\n")
  .filter((line) => line.trim().length > 0);

const entries = [];
for (const file of changed) {
  const full = path.join(root, file);
  if (!existsSync(full)) continue;
  if (file.endsWith(".gz")) continue;
  const bytes = readFileSync(full);
  if (bytes.length < MIN) continue;

  const compressed = gzipSync(bytes, { level: 9 });
  const target = `${file}.gz`;
  writeFileSync(path.join(root, target), compressed);

  const sha = spawnSync("sha256sum", [full], { cwd: root }).stdout.toString().split(" ")[0];
  entries.push(`${sha}  ${file}  ${target}  gzip`);

  console.log(
    `${String(bytes.length).padStart(7)} → ${String(compressed.length).padStart(6)}  ${file}` +
      `  (${(bytes.length / compressed.length).toFixed(1)}×)`,
  );
}

if (entries.length) {
  const manifest = path.join(root, "scripts", "assemble-manifest.txt");
  const header = `# The large files, and the parts they arrive in.
#
# Written by scripts/assemble-large-files.sh after a verified join: the sha
# below is the one the join produced, and the join is checked against it.
#
# Format, one file per line:
#
#   <sha256>  <target path>  <part> [<part> …]  [gzip]
#
# With \`gzip\`, the joined parts are a gzip stream and are gunzipped before the
# sha is checked: the sha is of the ORIGINAL bytes.
`;
  writeFileSync(manifest, `${header}\n${entries.join("\n")}\n`);
  console.log(`\n✓ ${entries.length} entries in scripts/assemble-manifest.txt`);
}
