/**
 * Recover the design baseline from the repository's own history.
 *
 * The deployed MVP's screens were captured by an earlier agent and committed
 * under `_research/shots/`. They were removed in `647ea0e` ("Restructure for
 * production, and drop the pushed images"), but the pixels are still in the
 * object store, and they are the only surviving capture of the shipped design.
 *
 * This script restores them:
 *
 *   verify/baselines/history/<route>.png   the primary shot for a route
 *   verify/baselines/history/shots/*.png   every recovered shot, unmodified
 *   verify/baselines/history/manifest.json what each one is and where it came from
 *
 *   node verify/extract-history-baselines.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "verify", "baselines", "history");
const shotsDir = path.join(outDir, "shots");

/** The commit whose parent still holds the captures. */
const SOURCE_COMMIT = process.env.HISTORY_COMMIT ?? "647ea0e^";
const SOURCE_REF = SOURCE_COMMIT;

const tarball = execFileSync("git", ["archive", SOURCE_REF, "_research"], {
  cwd: root,
  maxBuffer: 256 * 1024 * 1024,
});

/** The primary shot for each route, and the shots that are extra. */
const PRIMARY = {
  dashboard: "_research/shots/live_dashboard.png",
  queue: "_research/shots/live_queue.png",
  patients: "_research/shots/live/_patients.png",
  reports: "_research/shots/live/_reports.png",
  desk: "_research/shots/live_desk.png",
  billing: "_research/shots/live_billing.png",
  schedule: "_research/shots/live_schedule.png",
  settings: "_research/shots/live/_settings.png",
  subscription: "_research/shots/live/_subscription.png",
  templates: "_research/shots/live/_templates.png",
  nurse: "_research/shots/live_nurse.png",
  lab: "_research/shots/live_lab.png",
  kiosk: "_research/shots/live_kiosk.png",
  landing: "_research/shots/landing-lp-hero.png",
  inbox: "_research/shots/live_inbox.png",
  teleconsult: "_research/shots/live_teleconsult.png",
  consult: "_research/shots/live/_console.png",
  doctors: "_research/shots/live/_doctors.png",
  locations: "_research/shots/live/_locations.png",
  messages: "_research/shots/live/_messages.png",
  staff: "_research/shots/live/_staff.png",
  book: "_research/shots/live/patient-book.png",
  intake: "_research/shots/live/patient-intake.png",
  "book-live": "_research/shots/live/patient-track.png",
  verify: "_research/shots/live/patient-verify.png",
  login: "_research/shots/live/mobile-login.png",
};

/** What each recovered shot is, for the manifest. */
const NOTES = {
  "_research/shots/live/_kiosk-open.png": "the kiosk with its own flow open",
  "_research/shots/live/_kiosk-step1.png": "kiosk step 1",
  "_research/shots/live/_kiosk-step3-patient.png": "kiosk step 3 — the patient",
  "_research/shots/live/_kiosk-step4-doctor.png": "kiosk step 4 — the doctor",
  "_research/shots/live/_nurse-after.png": "the nurse station after a reading",
  "_research/shots/live/_nurse-vitals-dialog.png": "the nurse station's vitals dialog",
  "_research/shots/live/dlg-add-doctor.png": "the add-a-doctor dialog",
  "_research/shots/live/dlg-add-someone.png": "the add-someone dialog",
  "_research/shots/live/dlg-book-visit.png": "the book-a-visit dialog",
  "_research/shots/live/dlg-certificate.png": "the certificate dialog",
  "_research/shots/live/dlg-checkin-patient.png": "the check-in dialog",
  "_research/shots/live/dlg-lock.png": "the lock dialog",
  "_research/shots/live/dlg-message-template.png": "the message-template dialog",
  "_research/shots/live/dlg-my-account.png": "the my-account dialog",
  "_research/shots/live/dlg-refer.png": "the refer-a-colleague dialog",
  "_research/shots/live/settings-clinic---letterhead.png": "settings — clinic & letterhead",
  "_research/shots/live/settings-pharmacies.png": "settings — pharmacies",
  "_research/shots/live/settings-ready-to-go-live.png": "settings — ready to go live",
  "_research/shots/live/staff-roles.png": "staff — roles",
  "_research/shots/live/staff-roles-matrix.png": "staff — the roles matrix",
  "_research/shots/live/_consult.png": "the doctor console, full page",
  "_research/shots/live/_consult-dx.png": "the doctor console — diagnosis",
  "_research/shots/live/_consult-filled.png": "the doctor console — filled",
  "_research/shots/live/_consult-fu.png": "the doctor console — follow-up",
  "_research/shots/live/_consult-med.png": "the doctor console — medicine",
  "_research/shots/live/_consult-med2.png": "the doctor console — medicine, second",
  "_research/shots/live/_consult-sign.png": "the doctor console — signing",
  "_research/shots/live/_esign.png": "the doctor console — e-signature",
  "_research/shots/live/_console-alldoctors.png": "the doctor console — all doctors",
  "_research/shots/live/mobile-book.png": "the patient booking page on a phone",
  "_research/shots/live/mobile-login.png": "the sign-in on a phone",
};

/** PNG dimensions, read straight from the IHDR chunk. */
function sizeOf(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

rmSync(shotsDir, { recursive: true, force: true });
mkdirSync(shotsDir, { recursive: true });

const listing = execFileSync("tar", ["-t", "-f", "-"], { input: tarball, maxBuffer: 64 * 1024 * 1024 })
  .toString()
  .split("\n")
  .filter((line) => line.endsWith(".png"));

const restored = [];

for (const entry of listing) {
  const buffer = execFileSync("tar", ["-x", "-f", "-", "-O", entry], { input: tarball, maxBuffer: 64 * 1024 * 1024 });
  const name = path.basename(entry);
  writeFileSync(path.join(shotsDir, name), buffer);
  restored.push({ source: entry, file: `history/shots/${name}`, ...sizeOf(buffer), note: NOTES[entry] });
}

for (const [route, source] of Object.entries(PRIMARY)) {
  const found = restored.find((entry) => entry.source === source);
  if (!found) {
    console.error(`✗ ${route}: ${source} is not in ${SOURCE_REF}`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(path.join(outDir, `${route}.png`), readFileSync(path.join(shotsDir, path.basename(source))));
}

const widths = [...new Set(restored.map((entry) => entry.width))].sort((a, b) => a - b);

const manifest = {
  recoveredAt: new Date().toISOString(),
  source: {
    ref: SOURCE_REF,
    command: `git archive ${SOURCE_REF} _research`,
    note:
      "The deployed MVP's own screens, captured by an earlier agent and removed in 647ea0e. " +
      "These are the only surviving pixels of the shipped design.",
  },
  viewport: { width: widths[0] === 1440 ? 1440 : widths[0], height: 900 },
  deviceScaleFactor: 1,
  fullPage: true,
  mode: "deployed-mvp",
  apiMode: "the deployed MVP's own API — not the local mock",
  shots: restored,
  routes: Object.fromEntries(
    Object.entries(PRIMARY).map(([route, source]) => {
      const found = restored.find((entry) => entry.source === source);
      return [route, found ? { file: `history/${route}.png`, source, width: found.width, height: found.height } : null];
    }),
  ),
};

writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ ${restored.length} shots restored from ${SOURCE_REF}`);
console.log(`✓ ${Object.keys(manifest.routes).length} route baselines written to verify/baselines/history/`);
