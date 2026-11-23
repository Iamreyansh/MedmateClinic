# MedMate Doctor — build plan

A role-based clinic SaaS for Indian outpatient practices: check-in, vitals, consult,
prescription, reception hand-over, billing, lab, appointments, messaging.

The design of record is the Figma file **MedMate Doctor — Clinic App**
(`FS5TDn4nUCjWizoIkKBcVg`). The pixel reference is the deployed MVP
(`medmate-doctor-clinic.netlify.app`). This repository rebuilds that product as one
Next.js application, on `main`, with no monorepo.

---

## Where the work stands

| | |
|---|---|
| Product understanding | `docs/PRODUCT-SPEC.md` — every screen, dialog and patient surface, read from the live app |
| Access model | `docs/ROLE-MODEL.md` — the role × resource × scope matrix, and where it is enforced |
| Design contract | `docs/DESIGN-SYSTEM.md` — tokens, type scale, geometry, the class vocabulary |
| Fidelity | `docs/FIDELITY.md` — how a screen is proved to match the design |
| This file | the plan and the order of work |

### Done

- Next.js 16.4.6 + React 19.3 on `main`, TypeScript strict, single app, no monorepo.
- `src/styles/medmate.css` — the deployed MVP's stylesheet, **byte-identical**
  (sha256 `434d4e71c6e4…`), 1,074 classes, 29 tokens.
- `src/assets/icons.json` — the 38-icon set, byte-exact.
- `src/lib/design/tokens.ts` — the Figma Foundations palette and type scale, plus what
  the stylesheet actually renders and the deltas between them.
- The kit — all fifteen of the Figma file's components: `Icon`, `Button`, `IconButton`,
  `Chip`, `Chips`, `Pills`, `Input`, `SearchInput`, `TextArea`, `Avatar`, `UserChip`,
  `ClinicChip`, `Badge`, `Token`, `Card`, `StationCard`, `StatTile`, `StatTiles`, `Kpi`,
  `Kpis`, `Note`, `Title`, `ManageRow`, `FeatureCard`, `PlanCard`.
- The shell: `AppShell`, `Sidebar`, `Topbar`, `MobileHeader`, `MobileTabBar`, and the
  nav model (`src/lib/nav.ts`).
- `/fidelity` — the style guide, and the fixture the fidelity harness measures.
- `npm run fidelity` — 138 computed properties checked, **0 drift** (122 desktop, 16 mobile).

### Not started

Every product screen. The screen list is deliberately empty until the order is chosen:

| Screen | Route | Figma frame | Status |
|---|---|---|---|
| _(to be confirmed)_ | | | |

---

## The order of work

1. **Foundation** — done, above.
2. **Screens**, one at a time, in the order chosen. Each screen brings: the route, the
   component work, the data it needs, and its entry in the fidelity harness.
3. **The access model** — the server returns a capability set; the shell filters the nav
   by it. See `docs/ROLE-MODEL.md`.
4. **Data** — screens are built against typed fixtures first, then wired to the API.

A screen is not done until:

- [ ] Every element matches the Figma frame (compare, do not eyeball)
- [ ] `npm run fidelity` reports 0 drift
- [ ] `npm run build` and `npm run lint` are clean
- [ ] No console errors, no unhandled rejections
- [ ] Keyboard reachable, focus visible, `prefers-reduced-motion` respected
- [ ] Empty, loading and error states exist and are written in the product's voice

---

## The rules

1. **Reuse the class vocabulary.** The stylesheet has ~1,074 classes in a consistent
   language (`.st-` station, `.q-` queue, `.kiosk-` kiosk, `.d-` doctor, `.kpi`, `.card`,
   `.btn`, `.chip`, `.pills`, `.note`, `.badge`, `.avatar`). A new one-off class is how
   a product drifts.
2. **Never hardcode a colour.** Use the token. The only literals are the `:root` block
   and the five icon tones.
3. **Never add a resting shadow.** Cards are flat with a 1px border. `--sh-2` is hover,
   `--sh-3` is an overlay.
4. **Card geometry is fixed.** 316×162, radius 18, padding 18, gap 6, min-height 150 for
   a station card. A different shape is a new component type — do not bend `.st-card`.
5. **Every micro-label is 10–11px, weight 800, uppercase, tracked out.** That is the
   product's signature texture.
6. **Test at 1280×720.** That is the reference viewport the geometry was measured at.
7. **Verify by measurement, not by eye.**

## Decisions taken

| Decision | Why |
|---|---|
| One Next.js app, no monorepo | One product, one deploy. The pieces that made a monorepo worth it — identity, API, infra — are services, not packages, and they live in their own repositories. |
| The MVP's stylesheet is copied, not rewritten | Pixel-perfection is a copy problem, not a design problem. Rewriting 1,074 classes from scratch would produce the same result with weeks of drift risk. |
| The stylesheet is not edited | `npm run fidelity` fails if it drifts from the deployed file. New rules go in `src/styles/app.css`. |
| One icon set | The 38 glyphs are part of the texture, not an implementation detail. |
| The nav is a data model, not a switch | The nav entries carry a `resource`; the server's capability set filters them. Two hardcoded matrices is how a menu starts lying about what the API allows. |

## Open questions

1. **Which screens, in which order** — the product owner's call, and the next thing needed.
2. **Chief complaint for the front desk** — the legacy policy keeps it (a receptionist
   must answer "what are you here for?"), the strict DPA reading strips it. The Figma
   matrix locks "diagnoses, notes and prescriptions" to doctors; a chief complaint is
   neither.
3. **Can a salaried doctor see clinic-wide revenue?** The matrix says a doctor has
   `Reports: view` and sees only their own patients.
4. **Lab technician and accounts** are roles in the Figma matrix; the identity service
   has five roles. Add both, or fold accounts into clinic admin?
5. **The kiosk device lock (HTTP 423)** — the one mechanism here competitors do not
   have. It must survive the rebuild.
