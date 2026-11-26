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
| `verify/baselines/figma/` | **the design** — a Figma export | put in by hand |
| `verify/baselines/reference/` | the deployed MVP as it answers today | captured live |
| `verify/baselines/history/` | the deployed MVP as it was when the product shipped | restored from this repository's own history |

**A Figma baseline wins** for the route it covers. If `verify/baselines/figma/dashboard.png`
exists, the dashboard is compared with the design; otherwise it is compared with the
MVP reference. The summary prints the source for every route.

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
frame inventory — 138 frames, each with its node id, its page, the route it was
meant for and whether the app has built it — is recovered from this repository's
own history into `verify/baselines/figma/manifest.json`.

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
