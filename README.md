# MedMate Doctor

A role-based clinic SaaS: check-in, vitals, consult, prescription, reception hand-over,
billing, lab, appointments and messaging — for an outpatient clinic in India.

Built to match the Figma file **MedMate Doctor — Clinic App** and the deployed MVP
(`medmate-doctor-clinic.netlify.app`) pixel for pixel.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:3000
npm run build        # production build
npm run fidelity     # the pixel check — 91 properties, 0 drift
npm run lint
```

`/fidelity` is the style guide: every component in the kit, rendered as the product
renders it. It is also the fixture the fidelity harness measures.

## Layout

```
src/
  app/                 routes only
    page.tsx           the landing page
    start/             the clinic sign-up
    dashboard/         the staff shell
    fidelity/          the style guide — dev only, 404s in a production build
  components/
    ui/                primitives: Icon, Button, Chip, Input, Avatar, Card…
    layout/            the app chrome: AppShell, Sidebar, Topbar, mobile
    marketing/         the landing page's pieces
    onboarding/        the sign-up flow and its steps
    dev/               developer tooling that never ships
  lib/
    design/tokens.ts   the palette and the type scale, from the Figma Foundations page
    nav.ts             the nav model — each entry carries the resource it needs
    fixtures/          data shaped like the API's responses
    cn.ts              the class joiner
  styles/
    medmate.css        the deployed MVP's stylesheet, byte-identical. Not edited.
    app.css            our own rules. Redefines no token.
  assets/icons.json    the 38-icon set, byte-exact
verify/check-fidelity.mjs
docs/                  the contracts
plan.md                the plan and the order of work
```

`docs/STRUCTURE.md` has the conventions in full — where a file goes, how it is
named, and what a screen has to satisfy before it is done.

## The documents

| | |
|---|---|
| `plan.md` | what is done, what is next, the rules, the open questions |
| `docs/STRUCTURE.md` | where a file goes, how it is named, what a screen must satisfy |
| `docs/PRODUCT-SPEC.md` | every screen, dialog and patient surface, read from the live app |
| `docs/ROLE-MODEL.md` | the role × resource × scope matrix and where it is enforced |
| `docs/DESIGN-SYSTEM.md` | tokens, type scale, geometry, the class vocabulary |
| `docs/FIDELITY.md` | how a screen is proved to match the design |

## The two rules that matter

1. **`src/styles/medmate.css` is the deployed MVP's stylesheet, byte-for-byte.** It is
   not ours to edit; `npm run fidelity` fails if it drifts. New CSS goes in
   `src/styles/app.css`.
2. **The product has one class vocabulary.** Reuse it. A new one-off class is how a
   product drifts.
