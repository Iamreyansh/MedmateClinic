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
  app/                 routes — / (build status) and /fidelity (style guide)
  components/
    ui/                the kit: Icon, Button, Chip, Input, Avatar, Card, Kpi, Note…
    shell/             AppShell, Sidebar, Topbar
  lib/
    design/tokens.ts   the palette and the type scale, from the Figma Foundations page
    nav.ts             the nav model — each entry carries the resource it needs
  styles/
    medmate.css        the deployed MVP's stylesheet, byte-identical. Not edited.
    app.css            shell wiring only. Redefines no token.
  assets/icons.json    the 38-icon set, byte-exact
verify/check-fidelity.mjs
docs/                  the contracts
plan.md                the plan and the order of work
```

## The documents

| | |
|---|---|
| `plan.md` | what is done, what is next, the rules, the open questions |
| `docs/PRODUCT-SPEC.md` | every screen, dialog and patient surface, read from the live app |
| `docs/ROLE-MODEL.md` | the role × resource × scope matrix and where it is enforced |
| `docs/DESIGN-SYSTEM.md` | tokens, type scale, geometry, the class vocabulary |
| `docs/FIDELITY.md` | how a screen is proved to match the design |

`_research/` holds the captures and scripts used to read the Figma file and the live
MVP — the evidence behind the documents, not part of the app.

## The two rules that matter

1. **`src/styles/medmate.css` is the deployed MVP's stylesheet, byte-for-byte.** It is
   not ours to edit; `npm run fidelity` fails if it drifts. New CSS goes in
   `src/styles/app.css`.
2. **The product has one class vocabulary.** Reuse it. A new one-off class is how a
   product drifts.
