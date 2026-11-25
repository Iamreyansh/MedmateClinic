# MedMate Doctor

A role-based clinic SaaS: check-in, vitals, consult, prescription, reception hand-over,
billing, lab, appointments and messaging — for an outpatient clinic in India.

Built to match the Figma file **MedMate Doctor — Clinic App** and the deployed MVP
(`medmate-doctor-clinic.netlify.app`) pixel for pixel.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:3100
npm run build        # production build
npm run fidelity     # the pixel check — 138 properties, 0 drift
npm run lint
npm test             # the contract tests
```

The app answers from a local mock by default, so it runs with no database and
no Java service. Copy `.env.example` to `.env` to change that.

| Variable | What it does |
|---|---|
| `VITE_USE_MOCK` | `true` (default) — the mock answers. `false` — the Java service answers. |
| `VITE_API_URL` | where the API is. Defaults to a relative `/api`. |
| `VITE_API_TARGET` | where the dev server proxies `/api` to. Defaults to `http://127.0.0.1:8080`. |

**A production build refuses to run with the mock on.** The mock answers with
fixture data and a sign-in that accepts any code, so it must never ship.

`/fidelity` is the style guide: every component in the kit, rendered as the product
renders it. It is also the fixture the fidelity harness measures.

## The backend

```bash
cd backend
mvn spring-boot:run          # needs Postgres; Flyway owns the schema
mvn test
```

One schema per clinic. Flyway owns every migration. The session token carries
the clinic id and the capabilities, so every query is inside the caller's own
clinic.

## Layout

```
src/
  app/                 routes only
    routes/            the route table, and the session guard
  components/
    ui/                primitives: Icon, Button, Chip, Input, Avatar, Card…
    layout/            the app chrome: AppShell, Sidebar, Topbar, mobile
  features/            one folder per product area
    auth/              sign-in, the lock screen
    dashboard/         the owner's dashboard
    queue/             the doctor's queue
    consult/           the consult and the prescription
    reports/           the four report views
    patients/          the patient record
    inbox/             referrals, results, handovers
    …                  one folder per screen
  services/            the API layer
    api/               the facade, and the mock behind it
  store/               the Redux store — the only place that knows every slice
  styles/
    medmate.css        the deployed MVP's stylesheet, byte-identical. Not edited.
    app.css            our own rules. Redefines no token.
  assets/icons.json    the 38-icon set, byte-exact
backend/               the Java service: Spring Boot, Hibernate, Flyway
verify/check-fidelity.mjs
docs/                  the contracts
plan.md                the plan and the order of work
```

### The atomic structure

The code is split into seven kinds of module — `app`, `shell`, `feature`,
`shared`, `infra`, `store` — and `eslint-plugin-boundaries` holds them apart:

- a feature is entered through its **index**, never through its internals
- a feature may not import **another** feature
- shared code may not import a feature

The rules are enforced, not aspirational: `npm run lint` fails if one is broken.

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
