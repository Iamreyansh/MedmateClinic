# Architecture

How the product is put together, and why.

## Two applications, one repository

```
frontend/  →  the root of this repo (Vite + React + Redux)
backend/   →  the Java service (Spring Boot + Hibernate + Flyway)
```

The frontend is a single-page app. The backend is a service that owns the data, the
sessions and the access rules. They talk over `/api`.

## The frontend

Vite 8 · React 19 · react-router-dom 7 · Redux Toolkit (thunks) · the product's
own stylesheet.

No Tailwind. The product's stylesheet (`src/styles/medmate.css`) is the pixel
reference — it is the deployed product's file, byte for byte — and `npm run fidelity`
fails if it drifts. New rules go in `src/styles/app.css`, which redefines no token.

### The atomic structure

```
src/
  app/          the composition root: routes, providers, config
  features/     one folder per feature — the units of the product
  components/   shared: ui/ (primitives) and layout/ (the chrome)
  services/     infra: the API client and the local mock
  store/        the Redux store
  lib/ config/ constants/ types/ hooks/ utils/ styles/ assets/
```

Six element types, enforced by `eslint-plugin-boundaries`:

| Type | Holds | May import |
|---|---|---|
| `app` | routes, providers, config | everything |
| `shell` | the chrome — sidebar, top bar | everything |
| `feature` | one folder per feature | feature, shell, shared, infra, store |
| `shared` | primitives, tokens, helpers | shared, infra |
| `infra` | the API client, the mock | infra, shared |
| `store` | the store and its hooks | store, feature, shared, infra |

A feature is entered only through its `index.ts`, so the rest of the app cannot
reach into its internals. The lint rule fails the build when it does.

### State

One slice per feature. Server data arrives through `createAsyncThunk` — no RTK
Query, matching the way the rest of the platform is built. Every screen that reads
from the API has the three states it needs: loading, empty and error.

### The API

One facade, `src/services/api`, with two backends behind it:

- the **local mock** (`src/services/api/mock`) answers the same paths and the same
  shapes as the Java service, so a screen can be built and reviewed before the
  service exists;
- the **service** answers them for real.

Switching is a flag: `VITE_USE_MOCK=false` points the app at the Java API.

## The backend

Spring Boot 3.5.6 · Java 21 · Maven · Hibernate (JPA) · Flyway · PostgreSQL ·
Nimbus JOSE for the session tokens.

```
backend/src/main/java/com/medmate/clinic/
  auth/        the code, the PIN, the session
  security/    the token, the filter, the signed-in person
  grant/       roles and what each may open
  registry/    the clinic
  staff/       the people
  patient/     patients
  visit/       the queue
  catalogue/   the stations of the product
  me/ queue/ dashboard/   the screens' endpoints
  common/      the errors the API knows how to answer
backend/src/main/resources/db/migration/   the schema, and the seed
```

### The schema belongs to Flyway

Hibernate maps the entities and never creates or alters a table: the schema is
Flyway's, and the migrations are the schema. There is one schema per clinic, so
a single Hibernate validation pass cannot cover them all — `ddl-auto` is `none`
and the mapping is checked by the integration test instead.

Three sets of migrations, and they are deliberately separate:

| Location | What it holds | When it runs |
|---|---|---|
| `db/registry` | the tenant directory: clinics, the phone directory | once, at boot |
| `db/clinic` | the schema of a clinic, and the defaults every clinic gets (`V200`, with the clinic id as a placeholder) | when a clinic is provisioned |
| `db/demo` | the development clinic's people, patients and queue | development only, for one clinic |

A clinic added today gets exactly what a clinic added a year ago got: the five
roles, the eighteen screens, and the same grant map. The demo data is not a
migration — it is applied as a script to the clinic the development environment
points at, so it never reaches production.

### The session

1. `POST /api/auth/otp` — a code goes to a registered mobile. In test mode the
   code comes back in the response, so a developer can sign in without a phone.
2. `POST /api/auth/verify` — the code opens the session. The token is a JWT
   carrying the staff id, the clinic id, the role and the capabilities.
3. `POST /api/auth/unlock` — the PIN opens a locked device.

Every request is scoped by the clinic id in the token. The api never takes a
clinic id from the caller.

### One schema per clinic

The registry — the directory of clinics — is the only thing the tenants share.
Everything else lives in the clinic's own schema:

```
registry.clinics              the directory: who a clinic is, and where its data is
registry.clinic_staff_directory which clinic a mobile number belongs to

clinic_11111111.staff         the people
clinic_11111111.patients      the patients
clinic_11111111.visits        the queue
clinic_11111111.roles         the roles
clinic_11111111.grants        what each role may open
clinic_11111111.audit_events  what happened, and who did it
```

One connection pool serves every clinic. The request's schema is set on the
connection itself (`search_path`), so every statement is inside the tenant's
schema whether or not the code remembered to scope it. The clinic id travels in
the token, so the caller never chooses it.

The registry tables are addressed by name (`registry.clinics`), because they are
the one thing a request must be able to read from any schema.

### The audit trail

`audit_events` lives in the clinic's own schema, so a clinic's trail is as
isolated as its patients. Every row records who, what, which record, when, from
where, and any detail — and there is no update or delete path: the rows are
written once and cannot be changed afterwards.

It is written on its own transaction, so the record of a thing never depends on
the thing's transaction committing. It covers the sign-ins and the device
unlocks so far; the prescription, payment, appointment and record-opened events
are wired as those endpoints are built.

`GET /api/clinic/activity?person=&category=` reads the trail, for the Activity
log screen.

### Authentication — where it stands

Real today:

- the session is a signed JWT carrying the staff id, the clinic id, the role and
  the capabilities; it is verified on every request, and the clinic id in it is
  the only tenant a request can reach
- the capabilities come from the database, and the same map drives the menu and
  the API
- the PIN is never stored in the clear, and the one-time code is spent after use

Simulated for now, deliberately:

- **the one-time code comes back in the API response** instead of being sent by
  SMS. Anyone who knows a staff mobile number can sign in as them. The service
  refuses to start with this on outside development (`medmate.env`), so it cannot
  ship by accident
- the code lives in memory: it is lost on a restart, and there is no delivery trail
- the PIN is hashed with SHA-256 over the staff id. A four-digit PIN has ten
  thousand possibilities, so this is not a password-grade hash — argon2id or
  bcrypt is what a real deployment needs
- the session lasts twelve hours and cannot be ended early: there is no logout
  endpoint and no revocation
- the token is kept in local storage, so a script injected into the page could
  read it; an httpOnly, same-site cookie is the safer shape
- there is no rate limiting on the code, no attempt counting and no lockout
- nobody is verified against Aadhaar or a medical council — the HPR lookup is a stub

None of this blocks building the screens; it is the work to do before the service
carries anyone's real patient data.

### The envelope — the rule both sides pin

Every 2xx body is a JSON **object**. The only bare top-level arrays are
`GET /api/clinic/doctors`, `/api/clinic/nurse/doctors` and
`/api/clinic/nurse/patients`. There is never a `list`, `data` or `success`
wrapper. An error is always `{title, detail}` — never Spring's own message:
`server.error.include-message: never`, plus a catch-all handler, so a stack
trace cannot reach a screen.

The rule is pinned twice: the frontend's contract test
(`src/services/api/mock/contract.test.ts`) pins it from the app's side, and
`ClinicApiIT` pins it from the service's. A shape that only one side knows
about fails one of them.

### The migrations — V4 and V204

V4 (registry) and V204 (clinic) are **new** migrations introduced with this
work, and they have never applied anywhere outside a disposable test database
that was dropped and recreated. V1–V3 (registry) and V1–V15 / V200–V203
(clinic) are untouched, so no applied-migration checksum can break. During
development V204 was extended once, to add `staff.video_fee` — the doctor's
video fee the doctors card needs — and that is the migration that ships.

A fresh database applies **4 registry migrations to v4** and **20 clinic
migrations to v204**.

### The links — their lifecycle

A public link is a row in `public_links` with a `kind` (`booking` or
`verify`), an expiry, a revocation and the visit it belongs to. The **link key
is random and high-entropy**; the **queue number** (`A-016`) is the human
readable slip and is a different value. A link that is unknown, expired or
revoked is a **404**, never a 500, and never an answer with a patient's
details in it.

`?clinic=` is honoured on `GET /api/public/doctors` only. `/api/token/`,
`/api/intake/` and `/api/verify/` resolve the tenant from the link row alone,
so clinic A's link cannot be read through clinic B's slug.

### `/book` without a slug is a 404

The slug always travels with the link the sign-up hands out, and the SPA keeps
it from the URL the patient opened. A bare `/book` has no clinic to book with,
and guessing one would be wrong in a multi-clinic product. This is a decision,
not an oversight.

### The errors — what is true now

`common/ApiExceptionHandler` is the one place that shapes an error, and it is
**not** one shape for every error. It answers with `{title, detail}` for the five
exceptions it knows about — not found, not allowed, please sign in, check the form,
that did not work — and it has **no catch-all**. Everything else falls through to
Spring's default error body:

```json
{"timestamp":"2026-11-25T22:35:00.021+00:00","status":500,"error":"Internal Server Error","message":"…","path":"/api/…"}
```

with `server.error.include-message: always`. So today:

- a **handled** error is `{title, detail}` with the right status;
- an **unhandled** error is a 500 whose body carries the exception's message and the
  request path — and the frontend's `ApiError` reads `problem.detail ?? problem.message`,
  so **"This link is not valid. Ask the clinic for a new one." reaches the screen
  verbatim**. The E2E suite asserts that no response body ever contains a Spring
  message, and it fails today.

What is needed: a catch-all handler that answers every unhandled error with
`{title, detail}` and no message, `include-message: never`, and the unknown public
link answered as a 404 rather than a 500. That is the backend task's work; the
assertions are in `e2e/tests/api.spec.mjs`.

### The access rules

One place decides what a role may open: `grant/GrantService`, reading the
`roles`, `grants` and `role_grants` tables. The same map drives the API's checks
and the menu the frontend renders — `/api/me` returns the capability set, and the
shell hides what the person may not open. The owner always has full access; two
rows are fixed by law rather than by configuration (diagnoses, notes and
prescriptions belong to doctors, and a doctor sees only their own patients).

**What is not true yet.** The access model is enforced on the *staff* paths: the
clinic id travels in the token and the request's schema is set on the connection
(`search_path`), so a caller never chooses its tenant. It is **not** enforced on the
patient paths. `/api/token/`, `/api/intake/` and `/api/verify/` take a `?clinic=`
override, and that override retargets the tenant — so a link handed out by clinic A
can be read through clinic B's slug. The rule that is supposed to hold ("the tenant
comes from the link row alone, never from the caller") does not hold today.
`e2e/tests/flows.spec.mjs` has the test that proves it: it crosses the two and
fails until the override is gone.

Two more gaps in the same area, both asserted in `e2e/`: the PIN is hashed with
SHA-256 over the staff id rather than with PBKDF2 or argon2, and the PIN path has
neither attempt counting nor a lockout, while the one-time code has both.

## The harness

Two suites, and they check different things.

**`verify/` — the pixel harness.** `npm run fidelity` is the whole check:
the product stylesheet must still be byte-identical to the deployed MVP's, and every
route in the diff set must still look like its baseline. The baselines are three
sets — a Figma export (the design), a live capture of the deployed MVP, and the
deployed MVP as it was when the product shipped, restored from this repository's
own history. They are reproduced, not carried: `node verify/prepare-baselines.mjs`
rebuilds them, and the manifests are what is tracked. A missing baseline fails the
check; it is never skipped. The details are in `docs/FIDELITY.md`.

**`e2e/` — the behaviour suite.** Playwright against the real stack: Postgres, the
Spring Boot service, and the Vite app with `VITE_USE_MOCK=false`. It asserts the
envelopes the frontend's own types expect, that no raw backend error reaches a
screen, that every route reaches a state, and the flows that move money or a
patient's data across a public link. It is written to **fail** on the defects that
are still open: a route with no endpoint, an envelope that does not match, a
tenant that can be crossed. Those failures are the specification for the work
that is left.

The stack is stood up by `verify/dev-stack.sh`, and by `docker-compose.yml` for the
whole thing — Postgres, the API, the app.

## Local

```bash
# the database
brew services start postgresql@16
createdb -O medmate medmate_clinic_api

# the API
cd backend && mvn spring-boot:run

# the app
npm run dev            # http://localhost:3100
```

The API runs on 8080; Vite proxies `/api` to it. Point the app at the service
with `VITE_USE_MOCK=false`; without it the app answers from the local mock.

Environment for the API:

| Variable | Default |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/medmate_clinic_api` |
| `DATABASE_USER` / `DATABASE_PASSWORD` | `medmate` |
| `DATABASE_SCHEMA` | `medmate` |
| `AUTH_SECRET` | a development secret — **change it in production** |
| `AUTH_EXPOSE_CODE` | `true` — the OTP comes back in the response; set `false` in production |
| `CORS_ORIGINS` | `http://localhost:3100,http://127.0.0.1:3100` |

The service's own fifteen variables are in `backend/.env.example`; the stack's are
in the root `.env.example`.

## Before production

- [ ] `AUTH_SECRET` set to a real secret, and `AUTH_EXPOSE_CODE=false`.
- [ ] The audit trail still needs the prescription, payment, appointment and
      record-opened events — they are written as those endpoints are built.
- [ ] The sign-up endpoint exists now — `POST /api/auth/signup` — and the
      five-step flow is wired to it.
- [ ] The SMS gateway for the OTP, and the DLT templates that go with it.
- [ ] HTTPS, and the SPA served from the same origin as the API.
