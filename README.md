# MedMate Doctor

A role-based clinic SaaS: check-in, vitals, consult, prescription, reception hand-over,
billing, lab, appointments and messaging — for an outpatient clinic in India.

Built to match the Figma file **MedMate Doctor — Clinic App** and the deployed MVP
(`medmate-doctor-clinic.netlify.app`) pixel for pixel.

## Where it actually stands

The honest summary, and the long version is `docs/SCREEN-AUDIT.md` — every Figma
frame, the page it is on, the route that serves it and what it has become.

**Built and talking to the service:** the landing page, the sign-in, the lock
screen, the dashboard, the doctor's queue, the consult and the prescription, the
inbox, the teleconsult, the templates, the patients list and record, the reports
(all four tabs), the reception desk, billing and its receipt, the appointments
day and week views, the nurse station, the lab bench, the patient kiosk, the
staff and roles screens, the messages, the doctors, the locations, the
subscription, the settings, and the whole patient-facing web — booking, manage
booking, the live token, the symptoms form and the prescription verification.

**Built, with a limit stated on the screen:** the four settings tabs that are not
built, the sign-up's HPR step, and the reports' busiest-hours chart.

**Not built:** the mobile app (41 frames — the mobile wave is building it), eleven
staff-admin overlays, the public legal document, the certificate verification, the
lab tube label, the subscription's payment-successful page, and the dashboard's
first-run setup guide.

**The sign-up flow creates a real clinic.** `POST /api/auth/signup` creates the
clinic, its own schema and the owner's session, and the booking link comes from
the service — the slug carries a private tail and is never the clinic's name.

## Run it

### The fast way — the mock, no database, no Java

```bash
npm install
npm run dev          # http://127.0.0.1:3100
```

The app answers from a local mock by default, so it runs with nothing else
installed. The mock answers the same paths and the same shapes as the service.

### The real way — Postgres, the service, the app

```bash
# 1. the database
createdb -O medmate medmate_clinic_api

# 2. the service — Flyway owns the schema, and it applies it on boot
cd backend
mvn spring-boot:run            # http://127.0.0.1:8080
cd ..

# 3. the app, against the service
VITE_USE_MOCK=false npm run dev
```

The service needs `APP_ENV` set — it refuses to start without it, so a deployment
cannot forget and run with the test-mode sign-in on. `verify/dev-stack.sh start`
does all three (it expects Postgres to be running already) and writes a PID file
for each process; `verify/dev-stack.sh stop` stops them by those PID files.

### The whole stack in one command

```bash
cp .env.example .env
docker compose up --build       # Postgres, the API and the app
```

**A production build refuses to run with the mock on.** The mock answers with
fixture data and a sign-in that accepts any code, so it must never ship:
`VITE_USE_MOCK=false npm run build`.

`/fidelity` is the style guide: every component in the kit, rendered as the product
renders it. It is also the fixture the fidelity harness measures.

## The demo clinic

With `DEMO_ENABLED=true` and `DEMO_CLINIC_ID=11111111-1111-4111-8111-111111111111`
the service seeds a clinic with people, patients, a day of appointments and a
bench of lab work, so the screens have something real to show.

| | |
|---|---|
| The owner's mobile | `9876543210` |
| The owner's PIN | `1234` |
| The booking slug | `medmate-clinic` |

The one-time code comes back in the answer while `AUTH_EXPOSE_CODE=true`, which
is how a developer signs in without a phone. The PIN is the front desk's: it is
what unlocks a locked device and what closes the kiosk.

## The environment variables

### The app (Vite)

| Variable | Default |
|---|---|
| `VITE_USE_MOCK` | `true` |
| `VITE_API_URL` | `/api` |
| `VITE_API_TARGET` | `http://127.0.0.1:8080` |

`VITE_API_TARGET` is only used by `npm run dev`; in production the app calls a
relative `/api` and the server puts the two on one origin.

### The service (Spring Boot)

| Variable | Default |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/medmate_clinic_api` |
| `DATABASE_USER` | `medmate` |
| `DATABASE_PASSWORD` | `medmate` |
| `DATABASE_POOL_SIZE` | `10` |
| `SERVER_PORT` | `8080` |
| `APP_ENV` | `development` |
| `AUTH_SECRET` | `a development secret — **change it in production**` |
| `AUTH_EXPOSE_CODE` | `true` |
| `AUTH_TTL_MINUTES` | `720` |
| `AUTH_OTP_TTL_MINUTES` | `5` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3100,http://127.0.0.1:3100` |
| `REGISTRY_SCHEMA` | `registry` |
| `CLINIC_SCHEMA_PREFIX` | `clinic_` |
| `DEMO_ENABLED` | `false` |
| `DEMO_CLINIC_ID` | — (unset; the clinic the demo data belongs to) |
| `KIOSK_CLINIC_SLUG` | `medmate-clinic` |

`AUTH_EXPOSE_CODE=true` returns the one-time code in the API response, which is
how a developer signs in without a phone. It must be off outside development, and
the service refuses to start in production with it on.

### The compose stack (root `.env.example`)

| Variable | Default |
|---|---|
| `POSTGRES_HOST` | `postgres` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_DB` | `medmate_clinic_api` |
| `POSTGRES_USER` | `medmate` |
| `POSTGRES_PASSWORD` | `medmate` |
| `POSTGRES_PUBLISHED_PORT` | `5432` |
| `API_PUBLISHED_PORT` | `8080` |
| `WEB_PUBLISHED_PORT` | `3100` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3100,http://127.0.0.1:3100` |
| `CORS_ORIGINS` | `http://localhost:3100,http://127.0.0.1:3100` |
| `KIOSK_CLINIC_SLUG` | `medmate-clinic` |
| `DEMO_ENABLED` | `true` |
| `DEMO_CLINIC_ID` | `11111111-1111-4111-8111-111111111111` |

## The checks

| What | Command | What it needs |
|---|---|---|
| Types | `npm run typecheck` | nothing |
| Lint | `npm run lint` | nothing |
| Production build | `VITE_USE_MOCK=false npm run build` | nothing |
| Unit and contract tests | `npm test` | nothing — the mock answers |
| Behaviour suite | `npm run e2e` | the whole stack, and `npm run e2e:install` once for the browser |
| Pixel harness | `npm run fidelity` | the deployed app for the stylesheet's provenance; `node verify/prepare-baselines.mjs` for the baselines |
| Pixel harness, one route | `npm run fidelity:pixels -- --routes=dashboard` | as above |
| The service's own tests | `cd backend && mvn verify` | Postgres |

The behaviour suite is written to **fail** on the defects that are still open: a
route with no endpoint, an envelope that does not match, a tenant that can be
crossed. Those failures are the specification for the work that is left.

The pixel harness compares each route with a baseline and prints the source it
compared against. **No Figma frame has been exported yet**, so today it compares
against the deployed MVP — not against the design. `docs/FIDELITY.md` says which
file each frame needs.

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
    onboarding/        the clinic sign-up, in five steps
    dashboard/         the owner's dashboard, and the doctor consoles
    queue/             the doctor's queue
    consult/           the consult and the prescription
    reports/           the four report views
    patients/          the patient list and the record
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
verify/                the pixel harness and its baselines
e2e/                   the behaviour suite
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
| `docs/SCREEN-AUDIT.md` | every Figma frame against the built app |
| `docs/STRUCTURE.md` | where a file goes, how it is named, what a screen must satisfy |
| `docs/ARCHITECTURE.md` | how it is put together, and why |
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
