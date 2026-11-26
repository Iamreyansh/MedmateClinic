/**
 * Recover the Figma frame inventory.
 *
 * The Figma REST API is not reachable from here, and the file itself cannot
 * be fetched either. What is left is the repository's own history: commit
 * `e6c31c8` ("Audit every Figma frame against the built app") holds a
 * frame-by-frame traversal of the live Figma file — 137 distinct frames, each
 * with its node id, the route it was meant for, and whether the app had built
 * it.
 *
 * That traversal is the only surviving inventory of the Figma file, so it is
 * recovered here into `verify/baselines/figma/manifest.json` — which is also
 * the schema a Figma export is dropped into later.
 *
 *   node verify/extract-figma-inventory.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "verify", "baselines", "figma");

const SOURCE_COMMIT = process.env.FIGMA_SOURCE ?? "e6c31c8";
const SOURCE_PATH = "docs/SCREEN-AUDIT.md";
const FILE_KEY = "FS5TDn4nUCjWizoIkKBcVg";
const FILE_NAME = "MedMate — Doctor Dashboard";

const markdown = execFileSync("git", ["show", `${SOURCE_COMMIT}:${SOURCE_PATH}`], {
  cwd: root,
  maxBuffer: 16 * 1024 * 1024,
}).toString();

/** Which section of the audit a table belongs to. */
const PAGE_BY_HEADING = [
  [/^### Desktop screens/, "Screens"],
  [/^## 4\. Mobile/, "Mobile"],
  [/^### Mobile staff screens/, "Mobile"],
  [/^### Patient phone/, "Mobile"],
  [/^### Sub-pages/, "Sub-pages & dialogs"],
  [/^### Overlays/, "Sub-pages & dialogs"],
];

function pageFor(heading) {
  for (const [pattern, page] of PAGE_BY_HEADING) if (pattern.test(heading)) return page;
  return "Screens";
}

const frames = [];
let heading = "";

for (const line of markdown.split("\n")) {
  if (line.startsWith("#")) heading = line;
  if (!line.startsWith("|")) continue;

  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  if (cells.length < 2) continue;

  const nodeCell = cells.find((cell) => /^\`\d+:\d+\`$/.test(cell));
  if (!nodeCell) continue;

  const node = nodeCell.replace(/`/g, "");
  const frame = cells.find((cell) => cell !== nodeCell && !/^-+$/.test(cell) && !/^\*\*Node/.test(cell));
  if (!frame) continue;

  const route = cells
    .filter((cell) => cell.startsWith("`/") || cell.startsWith("/"))
    .map((cell) => cell.split("—")[0].split(" (")[0].replace(/`/g, "").trim())
    .join(", ");
  // The status is the section the table is under — the audit's own headings.
  const status = /###\s*Built/.test(heading)
    ? "built"
    : /###\s*Partial/.test(heading)
      ? "partial"
      : /###\s*Placeholder/.test(heading)
        ? "placeholder"
        : /\*\*missing\*\*/i.test(line)
          ? "missing"
          : "missing";

  frames.push({
    frame,
    node,
    page: pageFor(heading),
    route: route || null,
    status,
  });
}

// The audit's own counts, so a mismatch is visible.
const counts = frames.reduce((acc, frame) => {
  acc[frame.status] = (acc[frame.status] ?? 0) + 1;
  return acc;
}, {});

const manifest = {
  schema: "medmate-figma-baselines/1",
  figmaFile: { key: FILE_KEY, name: FILE_NAME },
  dropIn: {
    directory: "verify/baselines/figma/",
    filenameRule: {
      summary: "route path with `/` → `_`, `:` → `__`, lowercased, `.png`",
      steps: [
        "take the route path",
        "every `/` becomes `_`",
        "every `:` becomes `__`",
        "lowercase it",
        "drop a leading `_` (the root route is `index`)",
        "add `.png`",
      ],
      examples: {
        "/": "index.png",
        "/patients": "patients.png",
        "/patients/:id": "patients___id.png",
        "/clinic/appointments/summary": "clinic_appointments_summary.png",
        "/t/:token": "t___token.png",
      },
      implementedBy: "verify/routes.mjs → baselineName(route.path)",
      lookedUpBy: "verify/pixel-diff.mjs, which prefers this set over the MVP reference",
    },
    requiredViewport: { width: 1280, height: 720 },
    requiredDeviceScaleFactor: 1,
    note:
      "Export each frame at 1280×720, device scale factor 1, full page, and name it with the " +
      "rule above. The harness prefers this set over the deployed-MVP reference for every " +
      "route it covers, and prints the source it compared each route against.",
    routeIds: "verify/routes.mjs",
    distinctScreens: {
      note:
        "Two of the Figma frames are two different screens and need two different files. The " +
        "deployed MVP's `/patients` is the LIST — search, filter chips, masked mobiles — and the " +
        "record is a separate screen.",
      frames: [
        { node: "21:2670", frame: "Screen / Patients (front desk)", route: "/patients", file: "patients.png", what: "the list" },
        { node: "21:2977", frame: "Screen / Patient record (doctor)", route: "/patients/:id", file: "patients___id.png", what: "the record" },
      ],
    },
  },
  recoveredInventory: {
    provenance: {
      source: `git show ${SOURCE_COMMIT}:${SOURCE_PATH}`,
      commit: SOURCE_COMMIT,
      path: SOURCE_PATH,
      method: "full traversal of the live Figma file through the Figma Plugin API",
      recoveredAt: new Date().toISOString(),
      note:
        "The Figma REST API is unreachable from this environment and the file cannot be " +
        "downloaded. This traversal is the only surviving record of the file's frames.",
    },
    frameCount: frames.length,
    byStatus: counts,
    frames,
  },
  fileRasters: [
    { file: "figma/_recovered/figma-01-initial.png", source: "_research/figma-01-initial.png", commit: "50ccfc6", what: "the Figma file as it was opened" },
    { file: "figma/_recovered/figma-02-expanded.png", source: "_research/figma-02-expanded.png", commit: "50ccfc6", what: "the Figma file, expanded" },
  ],
};

// The two rasters of the Figma file itself are restored from the repository's
// history, like the other baselines: the pixels are already here.
const recoveredDir = path.join(outDir, "_recovered");
mkdirSync(recoveredDir, { recursive: true });
for (const [file, source] of [
  ["figma-01-initial.png", "_research/figma-01-initial.png"],
  ["figma-02-expanded.png", "_research/figma-02-expanded.png"],
]) {
  try {
    const bytes = execFileSync("git", ["show", `50ccfc6:${source}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(path.join(recoveredDir, file), bytes);
  } catch {
    console.error(`✗ ${file} is not in 50ccfc6`);
    process.exitCode = 1;
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ ${frames.length} Figma frames recovered → verify/baselines/figma/manifest.json`);
console.log(`  ${JSON.stringify(counts)}`);
