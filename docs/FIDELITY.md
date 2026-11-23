# Fidelity

How a screen is proved to match the Figma file and the MVP — by measurement, not by eye.

```bash
npm run build
npm run fidelity
```

```
✓ stylesheet is byte-identical to the deployed MVP (sha256 434d4e71c6e4…)
✓ 138 properties checked · 0 drift (122 desktop, 16 mobile)
```

---

## What the check does

`verify/check-fidelity.mjs` runs two passes.

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

### 2 · Computed styles

The app is served at 1280×720 (the reference viewport the geometry was measured at),
`/fidelity` is opened, and 138 computed properties are compared against the values
measured on the live MVP:

| Group | Covered |
|---|---|
| Tokens | the six most-used custom properties on `:root` |
| Document | font family, size, colour, background |
| Shell | `#app` grid, sidebar, wordmark, slogan, nav rows, nav heads, topbar, page |
| Station card | radius, padding, min-height, gap, border, background, title, body, icon tile, tag |
| Controls | button, small button, icon button, chip, input, avatar |
| Tiles | KPI, stat tile, note, pills |
| Cards | station card count line, manage row, feature card, plan card |
| Badges | the five badge tones and the avatar tones |
| Mobile | a second pass at 390×844: header, tab bar, tab item, count badge |

A property that drifts prints the selector, the property, the expected value and the
actual one, and the run exits non-zero.

---

## Adding a screen to the check

1. Build the screen.
2. Add a fixture for it under `/fidelity` (or a dedicated route) that renders the
   elements in their real state — a `.st-card` inside a `.chip` measures differently from
   a `.st-card` on its own.
3. Add the selectors and the expected values to `CHECKS` in `verify/check-fidelity.mjs`.
   Take the expected values from the Figma frame, then confirm them against the live MVP
   in the browser:

   ```js
   await page.evaluate(() => getComputedStyle(document.querySelector('.st-card')).borderRadius);
   ```

4. Run `npm run fidelity`. It must report 0 drift.

---

## Reading the result honestly

A green run means three things: the stylesheet is unchanged, the markup uses the
product's own class vocabulary, and those elements compute to the values the MVP
computes. It does not mean the screen is complete — a screen can measure correctly and
still be missing a row, an empty state or a dialog. Judgement is still the reviewer's
job; measurement is what removes the guesswork from it.

---

## Checking against the live app directly

For a screen that exists in both, compare them side by side:

```bash
npm run dev            # http://127.0.0.1:3000
```

Open the same route in the live MVP and in the build at the same viewport, then diff
the screenshots. `_research/shots/` holds captures from the live app for the screens
already walked.

---

## Running the browser yourself

The harness uses `playwright-core` and the Chromium already on the machine
(`~/Library/Caches/ms-playwright/chromium-*`). It finds it automatically. On a machine
without that cache, install the browser:

```bash
npx playwright install chromium
```
