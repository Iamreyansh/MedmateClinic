# MedMate Doctor — build plan

A role-based clinic SaaS for Indian outpatient practices: check-in, vitals, consult,
prescription, reception hand-over, billing, lab, appointments, messaging.

The design of record is the Figma file **MedMate Doctor — Clinic App**
(`FS5TDn4nUCjWizoIkKBcVg`). The pixel reference is the deployed MVP
(`medmate-doctor-clinic.netlify.app`). This repository rebuilds that product as one
**Vite** application, on `main`, with no monorepo.

---

## Where the work stands

| | |
|---|---|
| Product understanding | `docs/PRODUCT-SPEC.md` — every screen, dialog and patient surface, read from the live app |
| Access model | `docs/ROLE-MODEL.md` — the role × resource × scope matrix, and where it is enforced |
| Design contract | `docs/DESIGN-SYSTEM.md` — tokens, type scale, geometry, the class vocabulary |
| Fidelity | `docs/FIDELITY.md` — how a screen is proved to match the design |
| This file | the plan and the order of work |

### The stack

| | |
|---|---|
| Frontend | Vite 8 · React 19 · react-router-dom 7 · **Redux Toolkit with thunks** · the product's own stylesheet (no Tailwind) |
| Backend | Spring Boot 3.5.6 · Java 21 · **Hibernate (JPA)** · **Flyway** · PostgreSQL · Nimbus JOSE sessions |
| Structure | Atomic modules: `app` / `shell` / `feature` / `shared` / `infra` / `store`, enforced by eslint-plugin-boundaries |

See `docs/ARCHITECTURE.md` for the whole shape and the production checklist.

### Done

- **Vite 8 · React 19** on `main`, TypeScript strict, single app, no monorepo.
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
  nav model (`src/constants/nav.ts`).
- `/fidelity` — the style guide, and the fixture the fidelity harness measures.
- `npm run fidelity` — 138 computed properties checked, **0 drift** (122 desktop, 16 mobile).

### Done since

- The frontend moved off Next.js to a Vite SPA with the atomic module structure.
  The routes, the screens and the stylesheet came across unchanged, so the fidelity
  harness still passes.
- The Java service exists and runs: Flyway owns the schema, Hibernate validates it,
  and the JWT carries the clinic id and the capabilities.
- The sign-in flow, `/api/me`, `/api/clinic/queue` and `/api/clinic/dashboard` are
  wired end to end against the real service.
- The lock screen unlocks a device with the PIN, through the API.
- **The mock answers every path the app calls.** The router matches path templates
  and hands the handler its parameters and query string, and the contract test
  asserts the coverage. The mock holds state, so the screens agree with each other.
- **The route guard.** Every staff screen sits behind `RequireSession`; a person
  without a token is sent to the sign-in rather than into a screen that cannot load.
- **The access model is enforced on the server.** The consult — the diagnoses, the
  notes, the medicines — needs the `clinical` capability. A nurse or the front desk
  cannot read it or sign a prescription, whatever the role's name says.
- **The atomic structure is enforced.** `eslint-plugin-boundaries` holds the seven
  module kinds apart: a feature is entered through its index, and no feature may
  import another.
- **The mock cannot ship.** A production build fails with the mock on.

### Not started

The stations and the Manage band that the nav links to but that have no screen yet.
Each has a placeholder that says so plainly, so a link never leads to a blank page.

| Screen | Route | Figma frame | Status |
|---|---|---|---|
| Staff & roles | `/staff` | `10:942` | placeholder — the staff and roles endpoints |
| Patient messages | `/messages` | `21:3256` | placeholder — the messages endpoints |
| Doctors | `/doctors` | `22:3106` | placeholder — the doctors and HPR lookup |
| Locations | `/locations` | `22:3422` | placeholder — the branches endpoints |

### Built since

- **The reception desk** (`/desk`) — who is waiting to be handed over, and what each
  one still needs: the prescription, the bill, the follow-up, the lab sample. The
  hand-over cannot happen while something is outstanding. `GET /api/clinic/desk`,
  `POST /api/clinic/desk/{visitId}/checkout` and `GET /api/clinic/desk/booking-link`.
- **Billing & POS** (`/billing`) — what came in today, what is still owed, and the
  bill of supply that prints. Taking the payment, giving it back, raising a new
  bill and closing the day against the counted cash.
- **The receipt** (`/billing/receipt/:invoiceId`) — proof the patient paid, on a page
  of its own, because a receipt is handed over.
- **Appointments** (`/schedule`) — a day at a time for the front desk, a week for the
  owner, and booking a visit that creates the patient if the clinic has not met them.
- **The subscription** (`/subscription`) — the plan, the trial, the usage counted from
  the clinic's own work, and the payment that moves it.
- **Settings** (`/settings`) — the clinic's own details, and the payment keys that
  send the money straight to the clinic.
- **The nurse station** (`/nurse`) — the tally, the three tabs and the **take vitals**
  dialog. Nine readings, each printing the range it is read against, with the number
  marked as it is typed. Saving marks the patient ready for the doctor.
  `GET /api/clinic/nurse`, `GET /api/clinic/nurse/doctors`, `POST /api/clinic/nurse/vitals`.
- **The lab bench** (`/lab`) — the five numbers, the three tabs and the work on the
  bench: collected, sent to a partner lab, or reported. A result out of range is
  flagged before it is saved. `GET /api/clinic/lab`, `POST /api/clinic/lab/results`,
  `POST /api/clinic/lab/orders/{id}`.
- **The patient kiosk** (`/kiosk`) — the front desk's page, and the tablet flow the
  patient sees: Mobile → Code → Patient → Doctor → Pay → Token, with the language
  switcher, the idle reset and the PIN that closes it. `GET /api/kiosk` and ten more.
- **The patient-facing web** — the four surfaces a patient opens on their phone, all
  outside the session guard, because a patient at the clinic's front door is not staff:
  **book** (`/book?clinic=<slug>` — the doctor, the time, the details, the
  confirmation), **live token** (`/t/<token>` — the place in the queue), **symptoms form**
  (`/intake/<token>`) and **verification** (`/verify/rx_<id>?h=<hash>`). The sign-up
  flow's booking link, which pointed at a 404, now resolves.
  `GET /api/public/doctors`, `POST /api/public/booking`, `GET /api/token/{token}`,
  `GET|POST /api/intake/{token}`, `GET /api/verify/{id}`.

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
| One Vite app, no monorepo | One product, one deploy. The pieces that made a monorepo worth it — identity, API, infra — are services, not packages, and they live in their own repositories. |
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
