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
  common/      one shape for every error
backend/src/main/resources/db/migration/   the schema, and the seed
```

### The schema belongs to Flyway

Hibernate maps the entities and **validates** them (`ddl-auto: validate`). It
never creates or alters a table. The migrations are the schema.

### The session

1. `POST /api/auth/otp` — a code goes to a registered mobile. In test mode the
   code comes back in the response, so a developer can sign in without a phone.
2. `POST /api/auth/verify` — the code opens the session. The token is a JWT
   carrying the staff id, the clinic id, the role and the capabilities.
3. `POST /api/auth/unlock` — the PIN opens a locked device.

Every request is scoped by the clinic id in the token. The api never takes a
clinic id from the caller.

### The access rules

One place decides what a role may open: `grant/GrantService`, reading the
`roles`, `grants` and `role_grants` tables. The same map drives the API's checks
and the menu the frontend renders — `/api/me` returns the capability set, and the
shell hides what the person may not open. The owner always has full access; two
rows are fixed by law rather than by configuration (diagnoses, notes and
prescriptions belong to doctors, and a doctor sees only their own patients).

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
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/medmate` |
| `DATABASE_USER` / `DATABASE_PASSWORD` | `medmate` |
| `DATABASE_SCHEMA` | `medmate` |
| `AUTH_SECRET` | a development secret — **change it in production** |
| `AUTH_EXPOSE_CODE` | `true` — the OTP comes back in the response; set `false` in production |
| `CORS_ORIGINS` | `http://localhost:3100` |

## Before production

- [ ] `AUTH_SECRET` set to a real secret, and `AUTH_EXPOSE_CODE=false`.
- [ ] The tenancy decision: one schema per clinic, or one database per clinic. Right
      now every table carries `clinic_id` and every query is scoped by it. That is
      the simplest thing that works and the weakest isolation. The product's
      promise is that a clinic's data is its own, so this should be settled
      deliberately — see `docs/ROLE-MODEL.md`.
- [ ] The audit log. Every sign-in, record opened, prescription signed and payment
      taken has to be written down, and it must not be editable.
- [ ] The SMS gateway for the OTP, and the DLT templates that go with it.
- [ ] HTTPS, and the SPA served from the same origin as the API.
