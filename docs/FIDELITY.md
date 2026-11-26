# Fidelity

How a screen is proved to match the design — by measurement, not by eye.

```bash
npm run fidelity           # the whole check: provenance + the pixel diff
npm run fidelity:pixels    # the pixel diff on its own
npm run fidelity:baselines # capture the deployed MVP's screens as the baseline
```

```
✓ stylesheet is byte-identical to the deployed MVP (sha256 434d4e71c6e4…)
✓ dashboard      10.745% differ  [reference]
✓ patients        6.977% differ  [reference]
…
✗ 2 problem(s):
  kiosk: 26.595% of pixels differ (budget 12%) — verify/baselines/diffs/kiosk.png
  landing: 28.107% of pixels differ (budget 14%) — verify/baselines/diffs/landing.png
```

---

## What the check does

`verify/check-fidelity.mjs` runs two passes, and `verify/pixel-diff.mjs` does
the second one.

### 1 · Provenance

It fetches the stylesheet the deployed MVP ships
(`/_next/static/chunks/252i6fbna1-7c.css`) and compares its sha256 with
`src/styles/medmate.css`.

If they differ, the product stylesheet has been edited. It is not ours to edit: the
deployed file is the pixel reference, and the rule that keeps the two in step is that
the copy never changes. New rules go in `src/styles/app.css`, which redefines no token.

The same pass asserts that `.chip` and `.input` keep their authored `1.5px` border — a
fractional border is reported differently by different Chrome builds, so the authored
value is asserted on the stylesheet rather than on a computed pixel.

**It fails closed.** A deployed app that cannot be reached is a failure, not a skip.
The old check caught the network error, printed "stylesheet provenance skipped" and
exited 0 — so a dead deployed app looked exactly like a clean one.

### 2 · The pixel diff

The app is served at the reference viewport, every route in the diff set is
screenshot, and each screenshot is compared with a baseline.

```bash
npm run fidelity:pixels                        # the stored baselines
npm run fidelity:pixels -- --baseline=history # the shipped design, from history
npm run fidelity:pixels -- --scale 1 --strict  # full resolution, against the MVP now
npm run fidelity:pixels -- --routes=dashboard,desk --json=out/report.json
```

The comparison is per pixel, with a colour tolerance (`--threshold`, default 0.1 —
the YIQ distance pixelmatch uses). The output is:

- a **diff PNG** per route, `verify/baselines/diffs/<route>.png`, differing pixels in
  red and the rest faded;
- a **summary table**: route, % of pixels differing, worst region (the busiest of a
  16×16 grid, so it names a place on the screen and not one stray pixel), and the
  baseline each route was compared against;
- a **machine-readable report** (`--json`), for CI.

**It fails loudly.** A route with no baseline, an app that did not answer, a screen
that never rendered — all are errors, and the run exits non-zero. A harness that
skips what it cannot see is a harness that cannot fail.

#### The baselines

| Set | What it is | Where it comes from |
|---|---|---|
| `verify/baselines/figma/` | **the design** — a Figma export | put in by hand — **none yet** |
| `verify/baselines/reference/` | the deployed MVP as it answers today | captured live |
| `verify/baselines/history/` | the deployed MVP as it was when the product shipped | restored from this repository's own history |

**A Figma baseline wins** for the route it covers. If `verify/baselines/figma/dashboard.png`
exists, the dashboard is compared with the design; otherwise it is compared with the
MVP reference. The summary prints the source for every route. **Today no export
exists, so every route is compared with the MVP** — see "Where each route is
compared against" below.

The baselines are **reproduced, not carried**:

```bash
node verify/prepare-baselines.mjs
```

restores the history set from `git archive 647ea0e^ _research` — the pixels are
already in this repository, so a second copy of them would only add weight, and the
restore is byte-for-byte reproducible — and captures the reference set from the
deployed MVP. The **manifests are tracked**; the images are not. A baseline that
cannot be rebuilt is a missing baseline, and the diff fails on a missing baseline.

#### Putting a Figma export in

The Figma file is `FS5TDn4nUCjWizoIkKBcVg` ("MedMate — Doctor Dashboard"). Its
frame inventory — 138 rows for 137 distinct frames, each with its node id, its
page, the route it was meant for and whether the app has built it — is recovered
from this repository's own history into `verify/baselines/figma/manifest.json`.

To use the design itself as the baseline:

1. export the frame as a PNG, at **1280×720, device scale factor 1**, full page;
2. **name it with the rule below**;
3. put it in `verify/baselines/figma/`.

No code change, no new tooling: the same diff runs against the design instead of
the deployed MVP, and the summary prints which source each route was compared
against.

**The naming rule.** The route path, with `/` becoming `_`, `:` becoming `__`,
lowercased, and `.png` on the end — a leading `_` is dropped, so the root route
is `index.png`.

| route | file |
|---|---|
| `/` | `index.png` |
| `/patients` | `patients.png` |
| `/patients/:id` | `patients___id.png` |
| `/clinic/appointments/summary` | `clinic_appointments_summary.png` |
| `/t/:token` | `t___token.png` |

The rule is implemented once, in `verify/routes.mjs` → `baselineName(route.path)`,
and the harness looks for the file under exactly that name. The rule and the
examples are published in `verify/baselines/figma/manifest.json` as well, so
there is one statement of it in two places rather than two statements.

**Two of the frames are two different screens, and need two different files.**
The deployed MVP's `/patients` is the **list** — search, filter chips, masked
mobiles — and the patient record is a **separate screen**. Export both:

| Figma node | frame | file |
|---|---|---|
| `21:2670` | Screen / Patients (front desk) — the list | `patients.png` |
| `21:2977` | Screen / Patient record (doctor) | `patients___id.png` |

The node ids for every frame are in `verify/baselines/figma/manifest.json`.

#### What still needs exporting

**No Figma frame has been exported yet.** `verify/baselines/figma/` holds the
manifest and nothing else. Every number the pixel harness prints today is therefore a
number about the **deployed MVP** — the history set in CI, the live capture locally —
and **not** about the design. A route only becomes a comparison against the design
when its export is dropped in under the name below.

Every frame in the recovered inventory is listed. A frame with a route has a file to
export; a frame without one does not, because the harness compares routes and there
is no route to compare — the overlays, the printouts and the phone frames all wait
for a route of their own.

| Node | Frame | Page | Route | File to export |
|---|---|---|---|---|
| `12:1139` | Screen / Landing page (visitor) | Screens | / | index.png |
| `20:2600` | Screen / Teleconsult (doctor) | Screens | /teleconsult | teleconsult.png |
| `20:2854` | Screen / Inbox (doctor) | Screens | /inbox | inbox.png |
| `21:2977` | Screen / Patient record (doctor) | Screens | /patients/:id | patients___id.png |
| `22:3956` | Screen / My templates (doctor) | Screens | /templates | templates.png |
| `17:1913` | Screen / Reports — summary (owner) | Screens | /reports | reports.png |
| `7:480` | Screen / Doctor Console — consult & prescription | Screens | /visit/:id | visit___id.png |
| `6:2` | Screen / Dashboard (owner) | Screens | /dashboard | dashboard.png |
| `13:1415` | Screen / Clinic sign-up — step 1 of 5 | Screens | /start | start.png |
| `19:2185` | Screen / Clinic sign-up — step 2 of 5 | Screens | /start | start.png |
| `19:2315` | Screen / Clinic sign-up — step 3 of 5 | Screens | /start | start.png |
| `19:2435` | Screen / Clinic sign-up — step 4 of 5 | Screens | /start | start.png |
| `19:2562` | Screen / Clinic sign-up — step 5 of 5 | Screens | /start | start.png |
| `21:2670` | Screen / Patients (front desk) | Screens | /patients | patients.png |
| `15:1439` | Screen / Patient Kiosk — check-in (patient) | Screens | /kiosk | kiosk.png |
| `9:701` | Screen / Nurse Station (nurse) | Screens | /nurse | nurse.png |
| `15:1513` | Screen / Reception Desk (front desk) | Screens | /desk | desk.png |
| `9:986` | Screen / Billing & POS (front desk) | Screens | /billing | billing.png |
| `20:2294` | Screen / Lab & Diagnostics (lab technician) | Screens | /lab | lab.png |
| `17:1592` | Screen / Appointments — day view (front desk) | Screens | /schedule | schedule.png |
| `10:942` | Screen / Staff & roles — Roles & access | Screens | /staff | staff.png |
| `21:3256` | Screen / Patient messages (front desk) | Screens | /messages | messages.png |
| `22:3106` | Screen / Doctors (clinic admin) | Screens | /doctors | doctors.png |
| `22:3422` | Screen / Locations (clinic admin) | Screens | /locations | locations.png |
| `18:1895` | Screen / Subscription (owner) | Screens | /subscription | subscription.png |
| `22:3701` | Screen / Settings — clinic & letterhead (owner) | Screens | /settings | settings.png |
| `24:3` | Mobile / Dashboard (owner) | Mobile | — | — |
| `24:136` | Mobile / Doctor Console — consult | Mobile | — | — |
| `24:257` | Mobile / Inbox (doctor) | Mobile | — | — |
| `24:350` | Mobile / Patient record (doctor) | Mobile | — | — |
| `24:449` | Mobile / Teleconsult (doctor) | Mobile | — | — |
| `24:538` | Mobile / My templates (doctor) | Mobile | — | — |
| `28:319` | Mobile / Reception Desk (front desk) | Mobile | — | — |
| `28:449` | Mobile / Billing & POS (front desk) | Mobile | — | — |
| `28:555` | Mobile / Appointments (front desk) | Mobile | — | — |
| `28:666` | Mobile / Patients (front desk) | Mobile | — | — |
| `28:781` | Mobile / Patient messages (front desk) | Mobile | — | — |
| `28:874` | Mobile / Nurse Station (nurse) | Mobile | — | — |
| `28:986` | Mobile / Lab & Diagnostics (lab technician) | Mobile | — | — |
| `30:670` | Mobile / Reports (owner) | Mobile | — | — |
| `30:775` | Mobile / Doctors (clinic admin) | Mobile | — | — |
| `30:894` | Mobile / Locations (clinic admin) | Mobile | — | — |
| `30:994` | Mobile / Staff & roles — Roles & access (clinic admin) | Mobile | — | — |
| `30:1142` | Mobile / Subscription (owner) | Mobile | — | — |
| `30:1275` | Mobile / Settings (owner) | Mobile | — | — |
| `31:991` | Mobile / Landing page (visitor) | Mobile | — | — |
| `31:1201` | Mobile / Clinic sign-up — step 1 of 5 | Mobile | — | — |
| `31:1232` | Mobile / Clinic sign-up — step 2 of 5 | Mobile | — | — |
| `31:1274` | Mobile / Clinic sign-up — step 3 of 5 | Mobile | — | — |
| `31:1312` | Mobile / Clinic sign-up — step 4 of 5 | Mobile | — | — |
| `31:1353` | Mobile / Clinic sign-up — step 5 of 5 | Mobile | — | — |
| `33:1163` | Patient phone / 1 Welcome | Mobile | — | — |
| `33:1217` | Patient phone / 2 Mobile number | Mobile | — | — |
| `33:1263` | Patient phone / 3 Code | Mobile | — | — |
| `33:1317` | Patient phone / 4 Patient | Mobile | — | — |
| `33:1385` | Patient phone / 5 Doctor | Mobile | — | — |
| `33:1460` | Patient phone / 6 Pay | Mobile | — | — |
| `33:1532` | Patient phone / 7 Checked in | Mobile | — | — |
| `54:1217` | Patient phone / Book 1 — Doctor & time | Mobile | — | — |
| `54:1318` | Patient phone / Book 2 — Your details | Mobile | — | — |
| `54:1383` | Patient phone / Book 3 — Confirmed | Mobile | — | — |
| `54:1437` | Patient phone / Manage booking | Mobile | — | — |
| `54:1488` | Patient phone / Live token | Mobile | — | — |
| `55:1287` | Patient phone / Symptoms form | Mobile | — | — |
| `55:1350` | Patient phone / Legal document | Mobile | — | — |
| `55:1393` | Patient phone / Verify prescription | Mobile | — | — |
| `55:1427` | Patient phone / Verify certificate | Mobile | — | — |
| `51:3069` | Book online — 1 Doctor & time | Sub-pages & dialogs | /book | book.png |
| `51:3182` | Book online — 2 Your details | Sub-pages & dialogs | /book | book.png |
| `51:3250` | Book online — 3 Confirmed | Sub-pages & dialogs | /book | book.png |
| `51:3315` | Manage booking | Sub-pages & dialogs | /appt | appt.png |
| `51:3376` | Live token | Sub-pages & dialogs | /t/:token | t___token.png |
| `51:3424` | Symptoms form | Sub-pages & dialogs | /intake/:token | intake___token.png |
| `51:3494` | Legal document | Sub-pages & dialogs | /legal/:document | legal___document.png |
| `37:739` | Verify prescription (public) | Sub-pages & dialogs | /verify/:id | verify___id.png |
| `37:773` | Verify certificate (public) | Sub-pages & dialogs | — | — |
| `39:501` | Dialog — Check in a patient | Sub-pages & dialogs | — | — |
| `39:571` | Dialog — Book a visit | Sub-pages & dialogs | — | — |
| `39:651` | Dialog — Check out | Sub-pages & dialogs | — | — |
| `39:715` | Dialog — New bill | Sub-pages & dialogs | — | — |
| `39:771` | Dialog — Refund | Sub-pages & dialogs | — | — |
| `39:813` | Dialog — Close the day | Sub-pages & dialogs | — | — |
| `41:1541` | Dialog — Add someone | Sub-pages & dialogs | — | — |
| `41:1595` | Dialog — Edit member | Sub-pages & dialogs | — | — |
| `41:1649` | Dialog — Person access | Sub-pages & dialogs | — | — |
| `41:1725` | Dialog — New profile | Sub-pages & dialogs | — | — |
| `41:1768` | Dialog — Add a doctor | Sub-pages & dialogs | — | — |
| `41:1835` | Dialog — Hours & leave | Sub-pages & dialogs | — | — |
| `41:1906` | Dialog — Add a branch | Sub-pages & dialogs | — | — |
| `45:2926` | Dialog — Write a certificate | Sub-pages & dialogs | — | — |
| `45:2988` | Dialog — Safety check before signing | Sub-pages & dialogs | — | — |
| `45:3028` | Dialog — Send to a pharmacy | Sub-pages & dialogs | — | — |
| `45:3082` | Dialog — Add a lab result | Sub-pages & dialogs | — | — |
| `45:3136` | Dialog — Refer to a colleague | Sub-pages & dialogs | — | — |
| `45:3179` | Dialog — Template editor | Sub-pages & dialogs | — | — |
| `45:3242` | Dialog — Add a pharmacy | Sub-pages & dialogs | — | — |
| `45:3289` | Dialog — Checkout | Sub-pages & dialogs | — | — |
| `45:3324` | Dialog — Enterprise enquiry | Sub-pages & dialogs | — | — |
| `58:3661` | Dialog — My account | Sub-pages & dialogs | — | — |
| `58:3710` | Dialog — Edit doctor | Sub-pages & dialogs | — | — |
| `58:3770` | Dialog — Edit branch | Sub-pages & dialogs | — | — |
| `58:3813` | Dialog — Send a message | Sub-pages & dialogs | — | — |
| `58:3858` | Dialog — Share booking link | Sub-pages & dialogs | — | — |
| `58:3946` | Dialog — Call the patient | Sub-pages & dialogs | — | — |
| `58:3971` | Dialog — Connect payments | Sub-pages & dialogs | — | — |
| `45:2882` | Drawer — Patient history | Sub-pages & dialogs | — | — |
| `22:3701` | Settings — clinic & letterhead | Screens | /settings | settings.png |
| `43:1942` | Settings — My PIN & device | Sub-pages & dialogs | /settings | settings.png |
| `43:2193` | Settings — Letterhead | Sub-pages & dialogs | — | — |
| `43:2454` | Settings — Pharmacies | Sub-pages & dialogs | /settings | settings.png |
| `43:2708` | Settings — Agreements | Sub-pages & dialogs | — | — |
| `43:2952` | Settings — Readiness check | Sub-pages & dialogs | /settings | settings.png |
| `40:1190` | Kiosk — open on this device (staff) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `40:1399` | Kiosk — welcome (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `40:1500` | Kiosk — token (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `40:1596` | Kiosk — close (staff PIN) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `58:4013` | Kiosk — code (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `58:4050` | Kiosk — patient (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `58:4092` | Kiosk — doctor (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `58:4149` | Kiosk — pay (tablet) | Sub-pages & dialogs | /kiosk | kiosk.png |
| `40:1652` | Lab tube label — 50×25 mm | Sub-pages & dialogs | — | — |
| `41:991` | Staff & roles — Team tab | Sub-pages & dialogs | /staff | staff.png |
| `41:1267` | Staff & roles — Activity log tab | Sub-pages & dialogs | /staff | staff.png |
| `40:631` | Billing — receipt (bill page) | Sub-pages & dialogs | /billing/receipt/:invoiceId | billing_receipt___invoiceid.png |
| `40:869` | Appointments — week view | Sub-pages & dialogs | /schedule | schedule.png |
| `58:3463` | Subscription — payment successful | Sub-pages & dialogs | — | — |
| `58:3190` | Dashboard — new clinic welcome & setup guide | Sub-pages & dialogs | — | — |
| `36:195` | Doctor Console — queue (sub-page) | Sub-pages & dialogs | /queue | queue.png |
| `36:582` | Doctor Console — after signing | Sub-pages & dialogs | /visit/:id | visit___id.png |
| `36:157` | Clinic sign-up — intro | Sub-pages & dialogs | /start | start.png |
| `36:5` | Sign in — mobile | Sub-pages & dialogs | /login | login.png |
| `36:54` | Sign in — code | Sub-pages & dialogs | /login | login.png |
| `36:112` | Lock screen (PIN) | Sub-pages & dialogs | /lock | lock.png |
| `37:492` | Prescription — A4 print | Sub-pages & dialogs | /rx/:id | rx___id.png |
| `37:642` | Medical certificate — A4 print | Sub-pages & dialogs | /certificate | certificate.png |
| `42:1402` | Reports — Bookings & waiting | Sub-pages & dialogs | /reports | reports.png |
| `42:1710` | Reports — Clinical (doctors only) | Sub-pages & dialogs | /reports | reports.png |
| `42:2017` | Reports — Consult list | Sub-pages & dialogs | /reports | reports.png |

#### Where each route is compared against

The harness prefers a Figma export for the route it covers and falls back to the MVP
set otherwise, and it prints the source it used for every route. With no export in
place, **every route is compared against the MVP set** — `history` in CI, which is
reproducible from this repository's own history, and `reference` locally, which is a
live capture of the deployed app.

| Route | File the harness looks for | Diff set | Source today | Source once the export lands |
|---|---|---|---|---|
| `/dashboard` | `verify/baselines/figma/dashboard.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/patients` | `verify/baselines/figma/patients.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/desk` | `verify/baselines/figma/desk.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/billing` | `verify/baselines/figma/billing.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/schedule` | `verify/baselines/figma/schedule.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/nurse` | `verify/baselines/figma/nurse.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/lab` | `verify/baselines/figma/lab.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/kiosk` | `verify/baselines/figma/kiosk.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/subscription` | `verify/baselines/figma/subscription.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/inbox` | `verify/baselines/figma/inbox.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/teleconsult` | `verify/baselines/figma/teleconsult.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/templates` | `verify/baselines/figma/templates.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/queue` | `verify/baselines/figma/queue.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/settings` | `verify/baselines/figma/settings.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/reports` | `verify/baselines/figma/reports.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/certificate` | `verify/baselines/figma/certificate.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/visit/:id` | `verify/baselines/figma/visit___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/rx/:id` | `verify/baselines/figma/rx___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/billing/receipt/:id` | `verify/baselines/figma/billing_receipt___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — once the frame has a route |
| `/login` | `verify/baselines/figma/login.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/` | `verify/baselines/figma/index.png` | yes | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/start` | `verify/baselines/figma/start.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/lock` | `verify/baselines/figma/lock.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/book` | `verify/baselines/figma/book.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |
| `/t/:id` | `verify/baselines/figma/t___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — once the frame has a route |
| `/intake/:id` | `verify/baselines/figma/intake___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — once the frame has a route |
| `/verify/:id` | `verify/baselines/figma/verify___id.png` | no | the MVP set (`history` in CI, `reference` locally) | the design — the Figma export |

#### Strict mode

The stored baselines are kept at half size (1280 → 640 wide), which is what CI can
carry and what font rasterisation makes stable. At half scale a one-pixel
misalignment is invisible — which is exactly the class of defect "pixel perfect" is
about.

So `--strict` captures the deployed MVP **live, in the same run, at the same
viewport and scale** and compares the two at full resolution:

```bash
node verify/pixel-diff.mjs --scale 1 --strict
```

Both numbers are in the summary — the scaled drift and the strict drift — so a
reviewer can see which routes are exactly right and which are only close.

#### The budgets

Each route carries its own budget, in `verify/routes.mjs`:

```js
{ id: "dashboard", budget: 12, … }
```

The budgets are the measured drift against the baseline plus headroom. Two are held
tight **on purpose**, because both are known to be wrong today: `kiosk` (there is no
kiosk endpoint on the backend at all) and `landing` (the local landing page is a
different implementation of the deployed one). Those two are over budget, and that
is the point.

---

## What the check does not do

It does not check the copy, the labels, the wording or the semantics. It compares
pixels: a screen that is spelled differently but drawn the same passes, and a screen
that is drawn differently but spelled correctly fails. `e2e/` is the other half — it
checks that the screen says the right thing.
