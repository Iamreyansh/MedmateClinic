# MedmateClinic — Gap Audit

**Scope:** full gap analysis of the codebase as it stands at `main` / `1d3d0292b3bd6bf83da769618f8e4672cc428172`
**Date:** 2026-11-25
**Mode:** read-only diagnosis. No tracked file was modified, no commit was created, nothing was pushed.
**Method:** every finding is traced to `file:line` in this repo, or to a command that was actually run in the sandbox. Findings are marked **CONFIRMED** (read or executed) or **SUSPECTED** (inferred from code).

---

## 0. DESIGN BASELINE STATUS

**There is no design baseline in this repository.** Confirmed by `git ls-files`: the only image tracked is `public/icon.svg`. `verify/` contains three scripts and no reference assets — no `verify/baseline/`, `verify/reference/`, `verify/expected/`, no screen manifest, no PNG/JPG of any screen.

What `npm run fidelity` actually does (`verify/check-fidelity.mjs`):

| Step | What it asserts | Baseline? |
|---|---|---|
| `checkProvenance()` (:232-266) | `sha256(src/styles/medmate.css)` == sha256 of the deployed MVP's CSS, fetched from `https://medmate-doctor-clinic.netlify.app/_next/static/chunks/252i6fbna1-7c.css` (:29) | A **live URL**, not a stored artifact |
| `checkStyles()` (:350-414) | 138 hardcoded `[selector, property, expected]` triples (:36-223 desktop, :206-223 mobile) evaluated with `getComputedStyle` on the **`/fidelity` style-guide route only** | A **hardcoded list of numbers**, measured once on the deployed MVP |

So the harness never diffs an app screen against a design. It is a CSS-token regression check, not a visual comparison. It cannot detect a missing element, a wrong label, a wrong layout region or a wrong state — the class of defect a design audit exists to find.

Two more facts, both confirmed:

- **The provenance half silently degrades to a pass.** `checkProvenance` catches any fetch error and returns without failing (:237-243), printing "stylesheet provenance skipped (offline: …)". If the Netlify MVP is deleted or the hashed chunk URL changes, the check becomes a no-op that still exits 0. I verified the URL is alive today and that the hashes match exactly — local `434d4e71c6e40ff0373b4364fd380cb20dd9d8b8b9460a121991799199616012` == remote — so this is a latent risk, not a present failure.
- **The harness is macOS-only and cannot run on Linux.** `findChromium()` (:268-283) scans `~/Library/Caches/ms-playwright` for `chrome-mac-arm64/Google Chrome for Testing.app` / `chrome-mac/Chromium.app`; on Linux it returns `undefined`, so `chromium.launch({executablePath: undefined})` (:352-355) has no browser. Separately `ensureServer()` (:294-311) probes `http://localhost:3100` with a `HEAD` request; Vite binds `[::1]:3100` while Node's `fetch` connects to `127.0.0.1:3100`, so the probe never succeeds and the script throws `the app did not start` after 30 s. I reproduced this exactly. `verify/_capture-mvp.cjs:18-32` has the identical macOS-only browser discovery.

**Minimal Linux fix (not applied):** make `findChromium()` fall back to `PLAYWRIGHT_BROWSERS_PATH` / `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome`, and probe the server on `127.0.0.1` as well as `localhost`. I installed Playwright's chromium in the sandbox and confirmed the fix works.

**Figma is unreachable from this sandbox.** Both the design URL (`https://www.figma.com/design/FS5TDn4nUCjWizoIkKBcVg/…?node-id=58-4256`) and the `/embed?embed_host=share` URL return **HTTP 403 from CloudFront** ("Request blocked"), with zero canvases and zero renders. Screenshots of the 403 page are in `/tmp/figma-shots/`. No Figma-derived comparison was possible, by anyone, from here.

**What was possible, and was done:** the design source of truth this project actually uses is the **deployed MVP** (`medmate-doctor-clinic.netlify.app`) — `README.md:6-7` and `plan.md:6-8` both name it as the pixel reference, and `verify/_capture-mvp.cjs` captures it. It is publicly reachable. I signed into it (test-mode OTP), screenshotted 14 of its screens, screenshotted the same 14 routes from the local app, and compared them. Results are in §11.

---

## 1. Architecture map

**Frontend** — Vite 8 · React 19 · react-router-dom 7 · Redux Toolkit with thunks · TypeScript strict · the product's own stylesheet (`src/styles/medmate.css`, byte-identical to the deployed MVP's) plus `src/styles/app.css` for new rules. No Tailwind. `eslint-plugin-boundaries` enforces six module kinds (`app` / `shell` / `feature` / `shared` / `infra` / `store`) — a feature is entered only through its `index.ts`.

**Backend** — Spring Boot 3.5.6 · Java 21 · Hibernate (JPA, `ddl-auto: none`) · Flyway · PostgreSQL 17 · Nimbus JOSE HS256 session tokens. Database-per-clinic: a `registry` schema holds the tenant directory; each clinic gets its own `clinic_<uuid8>` schema, created and migrated by `ClinicProvisioningService.provision()` (`tenancy/ClinicProvisioningService.java:43-52`) with the clinic id as a Flyway placeholder. One Hikari pool; the request's schema is set on the connection via `search_path` (`tenancy/TenantDataSource.java`, `tenancy/ClinicSchemaResolver.java`).

**Data flow** — `src/services/api/index.ts:13-21` is the facade. `env.useMock` (`src/config/env.ts:14`) picks one of two backends behind the same paths:
- **mock (default)** — `src/services/api/mock/router.ts` matches path templates (`/clinic/visits/:id`) and dispatches to handlers registered in `src/services/api/mock/*Routes.ts`; state lives in `mock/state.ts` (1,204 lines of fixture).
- **real** — `src/services/api/client.ts:41-61` `fetch`es `${env.apiBaseUrl}${path}` with `Authorization: Bearer <token>`; `apiBaseUrl` defaults to the relative `/api`, and `vite.config.ts:29-37` proxies `/api` to `http://127.0.0.1:8080` in dev.

**The mock↔real switch is one flag** — `VITE_USE_MOCK=false` — and `vite.config.ts:15-27` refuses to build a production bundle with the mock on. That guard is real and works. The problem is that **the two sides have never been reconciled**, and the app has never been run against the real API by anyone. That is the central finding of this audit.

---

## 2. The contract mismatch table

Scripted, not by eye: `/tmp/audit/contract-diff.mjs` parses every `mock.on("METHOD", "/path")` in `src/services/api/mock/**` and every `@(Get|Post|Put|Patch|Delete)Mapping` + class `@RequestMapping` in `backend/src/main/java/**/*Controller.java`, strips the `/api` prefix, normalises path variables to `:x`, and diffs.

**Totals: 56 mock routes · 43 backend endpoints · 47 frontend call sites · 39 matched on method+path.**

### 2a. Mock routes with NO backend endpoint — 17

Flipping `VITE_USE_MOCK=false` makes these calls 404. CONFIRMED (14 of them 404-verified against the running API).

| # | Method + path | Mock source | Verified against real API |
|---|---|---|---|
| 1 | `GET /kiosk` | `mock/kioskRoutes.ts:153` | **404** — no controller |
| 2 | `POST /kiosk/open` | `mock/kioskRoutes.ts:155` | **404** |
| 3 | `POST /kiosk/close` | `mock/kioskRoutes.ts:161` | **404** |
| 4 | `POST /kiosk/code` | `mock/kioskRoutes.ts:173` | **404** |
| 5 | `POST /kiosk/verify` | `mock/kioskRoutes.ts:186` | **404** |
| 6 | `POST /kiosk/patient` | `mock/kioskRoutes.ts:204` | **404** |
| 7 | `POST /kiosk/doctor` | `mock/kioskRoutes.ts:212` | **404** |
| 8 | `POST /kiosk/pay` | `mock/kioskRoutes.ts:223` | **404** |
| 9 | `POST /kiosk/token` | `mock/kioskRoutes.ts:235` | **404** |
| 10 | `POST /kiosk/reset` | `mock/kioskRoutes.ts:245` | **404** |
| 11 | `POST /kiosk/language` | `mock/kioskRoutes.ts:250` | **404** |
| 12 | `GET /clinic/nurse/patients` | `mock/nurseRoutes.ts:197` | **404** |
| 13 | `GET /clinic/inbox` | `mock/routes.ts:280` | **404** — UI shows `No static resource api/clinic/inbox.` |
| 14 | `GET /clinic/patients` | `mock/routes.ts:557` | **404** — **no frontend call site exists at all** |
| 15 | `GET /clinic/patients/:id` | `mock/routes.ts:580` | **404** — UI shows `No static resource api/clinic/patients/pt_kavya.` |
| 16 | `GET /clinic/templates` | `mock/routes.ts:606` | **404** — UI shows `No static resource api/clinic/templates.` |
| 17 | `GET /clinic/teleconsult` | `mock/routes.ts:616` | **404** — UI shows `No static resource api/clinic/teleconsult.` |

**The whole kiosk API (11 endpoints) has no backend at all**, and `plan.md:110-112` claims it is "Built since". The patient kiosk — the flagship self-check-in flow — exists only as a mock.

### 2b. Backend endpoints with NO mock route — 4

| # | Method + path | Backend source | Frontend consumer |
|---|---|---|---|
| 1 | `GET /clinic/activity` | `audit/AuditController.java:28` | none |
| 2 | `POST /clinic/visits/{id}/start` | `consult/VisitController.java:41` | none |
| 3 | `GET /clinic/messages` | `message/MessageController.java:26` | none (mock has no equivalent) |
| 4 | `POST /clinic/messages/{id}/resend` | `message/MessageController.java:32` | none |

### 2c. Field / envelope / semantic mismatches inside the 39 matched pairs — 22

| # | Endpoint | Mock | Real backend | Impact |
|---|---|---|---|---|
| 1 | `GET /clinic/doctors` | bare array `[…]` (`mock/routes.ts:192-200`) | `{"list":[…]}` | **Breaks the screen** — frontend expects an array (`src/features/queue/api/queue.ts`) |
| 2 | `GET /clinic/nurse/doctors` | bare array (`mock/nurseRoutes.ts:135-143`) | `{"list":[…]}` | **Breaks the nurse screen's doctor picker** |
| 3 | `GET /clinic/queue` | item has `vitals` (`mock/routes.ts:176-178`) | item has **no `vitals`** | Per-patient vitals line disappears |
| 4 | `GET /clinic/visits/{id}` | `patient` has `initials`, `visits`, `since` (`mock/routes.ts:330-342`) | `patient` has only `id,name,age,sex,phone,abha,allergies,conditions` | Blank initials, undefined visit count |
| 5 | `GET /clinic/billing` | `byMode` = 3 rows (`mock/billingRoutes.ts:31-39`) | `byMode` = **4 rows**, extra `pending` (`billing/BillingService.java:130-136`) | Unexpected 4th tile |
| 6 | `GET /clinic/billing` | `bill: billCard(invoices[0])` (`mock/billingRoutes.ts:73`) | `body.put("bill", null)` (`billing/BillingService.java:166`) | Receipt/invoice card always empty |
| 7 | `GET /clinic/billing` | `summary.dayBills` = all invoices (`mock/billingRoutes.ts:69`) | `dayBills` = **today's only** (`billing/BillingService.java:139`) | Different headline number |
| 8 | `GET /clinic/subscription` | usage rows = prescriptions / **storage** / SMS (`mock/subscriptionRoutes.ts:58`) | usage rows = prescriptions / **bookings** / SMS | Different entitlement model |
| 9 | `GET /clinic/subscription` | `state: "trial"`, `trialDaysLeft` (`mock/subscriptionRoutes.ts:48-49`) | `state: "ACTIVE"`, `planName`, `planId`, `renewalOn` | Screen reads the wrong fields |
| 10 | `GET /clinic/desk` | rich payload incl. `meta`, `invoice`, `lines`, `gst*` (`mock/deskRoutes.ts`) | `{counts, items, note}` only | Desk screen loses the invoice detail |
| 11 | `GET /clinic/appointments` | item keys `booked, done, noShow, patientId, room, source, toCome, visitId` | item keys `date, days, durationMinutes, endsAt, from, reason, registration, slots, startsAt, time, to` | **Appointment grid renders blank** |
| 12 | `POST /clinic/lab/orders/{orderId}` | sets `sampleNo` + `collectedAt` when status → `in_lab` (`mock/labRoutes.ts:132-136`) | **never sets either** (`lab/LabService.java:132-154`) | The "tube number" promised in `plan.md:106-109` never appears |
| 13 | `POST /clinic/lab/results` | `abnormal` echoed from the client (`mock/labRoutes.ts:95,104`) | `abnormal` echoed from the client on write (`lab/LabService.java:125`) but **derived differently on read** (`lab/LabService.java:171`) | The flag flips after a refresh — see §3 |
| 14 | `GET /clinic/lab` | `abnormal` from the fixture | derived by `referenceNormal()` (`lab/LabService.java:215-217`) | **Logic inverted — see §3** |
| 15 | `GET /clinic/nurse` | `doctors[].room` present (`mock/nurseRoutes.ts:129`) | `room: null` (`nurse/NurseService.java:140`, with a comment admitting it) | "Next doctor" tile loses the room |
| 16 | `GET /clinic/nurse` | `vitals.recordedBy` = nurse's name (`mock/nurseRoutes.ts:171`) | `recordedBy: null` (`nurse/NurseService.java:229`) | Attribution lost |
| 17 | `POST /clinic/nurse/vitals` | **replaces** the visit's vitals (`mock/nurseRoutes.ts:174-180`) | **inserts a new row every time** (`nurse/NurseService.java:164-184`) | Different data model; `vitals` table is explicitly one-row-per-reading (`db/clinic/V7__vitals.sql:4-5`) |
| 18 | `GET /public/doctors` | clinic card has name/address/phone/gstin (`mock/patientWebRoutes.ts`) | `city:""`, `address:""`, `phone:""` (`patientweb/PatientWebService.java:112-116`) | Blank clinic details on the booking page |
| 19 | `GET /public/doctors` | slots respect the day (`mock/patientWebRoutes.ts`) | **all 8 slots `free:false`** (`patientweb/PatientWebService.java:355-375`) | **The patient cannot pick a time** — see §3 |
| 20 | `GET|POST /token/{token}`, `/intake/{token}` | 200 with a token | **HTTP 500** for an unknown link | §3 |
| 21 | `GET /verify/{id}` | 200 with `?h=` hash | **unreachable** — the filter routes it as a public link that does not exist | §3 |
| 22 | `POST /public/booking` | 200, creates a visit + 2 links | **HTTP 500** — `null value in column "created_at" of relation "appointments"` | §3 — the whole booking flow is dead |

### 2d. What the contract test actually covers

`src/services/api/mock/contract.test.ts` has a describe called *"the mock and the Java service answer the same paths"*, but it inspects **three controllers only** — `nurse/NurseController.java`, `lab/LabController.java`, `patientweb/PatientWebController.java` — and asserts **only method + path**, never a request field, a response field, a status code or an enum value. It normalises every path variable to the literal `"sample"`, so parameter names are never compared. Billing, desk, schedule, subscription, kiosk, patients, inbox, templates and teleconsult are **not compared at all**. That is why 17 mock routes have no backend counterpart and 22 matched pairs still disagree on fields.

---

## 3. Confirmed runtime breaks (real API + real Postgres)

Everything in this section was **executed**: PostgreSQL 17 installed, database and role created, the Spring Boot app booted with `mvn spring-boot:run`, Flyway applied **3 registry migrations (V1 clinics → V2 booking slug → V3 public links)** and **19 clinic migrations (V1…V15, V200…V203)** cleanly, demo data seeded, `/actuator/health` → `{"status":"UP"}`, OTP → verify → JWT obtained.

### 3.1 `POST /api/public/booking` → HTTP 500 — the patient booking flow cannot write a row

```
500  {"status":500,"error":"Internal Server Error",
     "message":"could not execute statement [ERROR: null value in column \"created_at\"
     of relation \"appointments\" violates not-null constraint ..."}
```

Root cause, exactly: `Appointment.createdAt` is mapped to the column (`backend/.../appointment/Appointment.java:45-46`) but `PatientWebService.book()` builds the `Appointment` by hand and never calls `setCreatedAt` (`patientweb/PatientWebService.java:191-202`). Only `consult/ConsultService.java:613` sets it. Hibernate therefore inserts an explicit `NULL`, which defeats the column default `created_at timestamptz not null default now()` (`db/clinic/V10__appointments.sql:14`).

**Severity: Critical.** The booking flow is the headline patient-facing feature added in `1d3d029`, and it cannot create a single row against a real database.

### 3.2 Unknown patient links return HTTP 500, not 401/404

| Request | Result |
|---|---|
| `GET /api/token/A-001` | **500** |
| `GET /api/intake/A-001` | **500** |
| `GET /api/verify/rx_0000…` | **500** |
| `GET /api/public/doctors` (no `clinic` param) | **500** |

Cause: `ClinicRouting.routeByLink` throws `UnauthorizedException` (`tenancy/ClinicRouting.java:50-56`), and `UnauthorizedException extends RuntimeException` (`common/UnauthorizedException.java:3`) — but `ClinicAuthFilter` catches only `IllegalArgumentException` around `routePatient` (`security/ClinicAuthFilter.java:67`). The exception escapes the filter and Spring returns 500. With `server.error.include-message: always` (`application.yml:29-30`), the internal message reaches the client.

**Severity: High.** An unknown or revoked link should be a 404/401; today it is a server error, and it is trivially triggerable by anyone on the internet.

### 3.3 `GET /api/verify/{id}` can never work — even with a valid prescription

`ClinicAuthFilter.linkKeyOf` (`security/ClinicAuthFilter.java:147-160`) takes the first path segment after `/api/verify/` — `"rx_<uuid>"` — and routes it as a **public-link key**. But `public_links` only ever holds **booking tokens**: the only writer is `PatientWebService.book()` (`patientweb/PatientWebService.java:205-208`), which sets `link.setLinkKey(token)`. A prescription id is never registered, so `routeByLink` throws and the request 500s before the controller runs.

Worse, the controller ignores the secret entirely: `PatientWebController.verify` takes `@RequestParam("h")` and passes it to `PatientWebService.verify(String id, String hash)` (`patientweb/PatientWebService.java:296`), **which never reads `hash`**. The response then sets `"genuine": true` unconditionally (`patientweb/PatientWebService.java:342`).

**Severity: Critical (as designed) / High (as shipped).** The "verification" surface claims to verify a prescription and verifies nothing; if the routing is ever fixed without also enforcing the hash, any guessable prescription UUID discloses diagnoses, medicines and the patient's name, age and sex.

### 3.4 The patient booking page shows every time as "Taken"

`GET /api/public/doctors?clinic=medmate-clinic` returned:

```
slots: [('09:00', False), ('09:30', False), ('10:00', False), ('10:30', False),
        ('11:00', False), ('11:30', False), ('16:00', False), ('16:30', False)]
```

Cause: `PatientWebService.slots()` counts **every appointment the doctor has ever had, across all dates** (`patientweb/PatientWebService.java:355-364`) and then marks a slot free only when `index >= taken` (:371). The demo clinic has **882 appointments** (264 for Dr. Ananya alone), so `taken` exceeds the 8 slot count and no slot is ever free. `book()` also ignores the chosen slot entirely and hardcodes `Instant.now().plusSeconds(86400)` (`patientweb/PatientWebService.java:153`).

**Severity: High.** A patient opening the booking link cannot select a time, and the time they end up with is not the one they chose.

### 3.5 Four screens show a raw Spring error string in the UI

Running the app itself against the real API (`VITE_USE_MOCK=false`, same-origin `/api` through the Vite proxy) and screenshotting every route:

| Route | What the user sees |
|---|---|
| `/patients` | `No static resource api/clinic/patients/pt_kavya.` |
| `/inbox` | `No static resource api/clinic/inbox.` |
| `/teleconsult` | `No static resource api/clinic/teleconsult.` |
| `/templates` | `No static resource api/clinic/templates.` |
| `/certificate` | `Loading the certificate…` — **forever** |

Cause: the client raises `ApiError(status, problem?.detail ?? problem?.message ?? response.statusText)` (`src/services/api/client.ts:56`). Spring's default error body has no `detail`, so `problem.message` — "No static resource …" — is shown to the user. The app's own error envelope is `{"title","detail"}` (`common/ApiExceptionHandler.java:15-39`), but the 404 path never reaches that advice because there is no handler for `NoResourceFoundException`.

`/certificate` is a separate bug: the route is `/certificate` with **no id** (`src/app/routes/index.tsx:59`), but `CertificatePaper.tsx:21` fetches `apiGet('/clinic/visits/${visitId}')` with `visitId` undefined, so the screen waits forever.

**Severity: High.** Three of the four are 404s that a single missing controller would fix; the fourth is a permanently-loading screen.

### 3.6 `GET /api/clinic/lab` returns 148,899 bytes

Measured: 148,899 bytes for one bench response, containing **264 lab orders, all with status `reported`**. The demo seed puts every order in `reported`, and the bench queries four statuses separately (`lab/LabService.java:61-78`). Note that `lab_orders.status` defaults to `'ordered'` (`db/clinic/V12__lab_orders.sql:7`) while the bench only queries `to_collect`, `in_lab`, `sent_out`, `reported` — **an order in the default `ordered` state is invisible on the bench**, in both the mock and the real service (the mock uses `to_collect`).

**Severity: Medium (perf) / High (correctness — orders can vanish).**

### 3.7 `GET /api/clinic/doctors` and `/clinic/nurse/doctors` return `{list:[…]}`, not an array

Confirmed by curl. The mock returns a bare array. The frontend's `queue.ts` / `nurse.ts` consume an array, so both screens break. See §2c rows 1–2.

---

## 4. Plan vs reality

`plan.md:85-120` ("Built since") lists nine areas as delivered. Verification:

| Area | plan.md claim | Reality | Verdict |
|---|---|---|---|
| Reception desk `/desk` | :87-90 | Endpoint exists, `GET /api/clinic/desk` → 200. But the payload is `{counts, items, note}` vs the mock's richer shape, and the screen showed "Loading the desk…" alongside loaded data | **partial** |
| Billing & POS `/billing` | :91-94 | Endpoint exists → 200. `bill` is always `null`; `byMode` has an extra row; `dayBills` counts a different set | **partial** |
| Receipt `/billing/receipt/:invoiceId` | :95-96 | Route exists (`src/app/routes/index.tsx:63`) | **stub** — the invoice it prints is always `null` from the API |
| Appointments `/schedule` | :97-98 | Endpoint exists → 200, but item keys diverge entirely (§2c row 11) | **partial** |
| Subscription `/subscription` | :99-100 | Endpoint exists → 200; usage model and state differ | **partial** |
| Settings `/settings` | :101-102 | Route exists; **no API endpoint and no mock route** — the screen renders hardcoded clinic details (`src/features/settings/components/SettingsScreen.tsx`) | **mock-only / hardcoded** |
| Nurse station `/nurse` | :103-106 | Endpoint exists → 200; `room` and `recordedBy` null; `GET /clinic/nurse/patients` has no backend | **partial** |
| Lab bench `/lab` | :107-109 | Endpoint exists → 200; `sampleNo`/`collectedAt` never written; `abnormal` logic inverted | **partial, with a bug** |
| Patient kiosk `/kiosk` | :110-112 | **11 mock endpoints, zero backend endpoints.** The screen renders inside the staff shell, whereas the reference shows it standalone | **mock-only** |
| Patient-facing web | :113-120 | The booking page renders, but every slot is "Taken"; booking is a 500; token/intake/verify are 500s | **broken** |

### 4.1 Promised but absent

- **`plan.md:78-83`** lists four placeholder screens — `/staff`, `/messages`, `/doctors`, `/locations` — and they are present as `PlaceholderScreen` (`src/app/routes/index.tsx:81-120`). **But** the backend has shipped `GET /clinic/messages` and `POST /clinic/messages/{id}/resend` (`message/MessageController.java:26,32`) while the frontend still says "the messages endpoints" are missing — the placeholder text is now stale.
- **`plan.md:145`** lists `/nurse`, `/lab`, `/kiosk` under "the screens the nav links to that are not built yet" (`src/app/routes/index.tsx:66-79` comment) while `plan.md:103-112` lists them as built. The route file's comment contradicts the plan.
- **`docs/ARCHITECTURE.md:231-232`** states "The sign-up endpoint: the five-step flow on the frontend is not wired to the service yet" — confirmed: `src/features/onboarding/` has five steps and no API call; `ClinicAuthFilter` allows `/api/auth/signup` (`security/ClinicAuthFilter.java:24`) but **no such endpoint exists** in any controller.

### 4.2 Screens in code that are not in plan.md

`/certificate` (`src/app/routes/index.tsx:59`, `src/features/certificate/`) — a full certificate-paper screen that appears in neither `plan.md`'s done/not-started tables nor the nav (`src/constants/nav.ts`). `/fidelity` and `/dev-tools` are also routable but are dev surfaces.

---

## 5. Security, tenancy and access control

### 5.1 What is protected

`ClinicAuthFilter` (`security/ClinicAuthFilter.java`) requires a `Bearer` token for everything not in `PUBLIC_PATHS` (:23-25) or `PATIENT_PATHS` (:33-35), and routes each request to the caller's clinic schema (:88). `AuthGuard` (`security/AuthGuard.java:34-50`) refuses to start outside development with `expose-code` on or the default `AUTH_SECRET`. Unauthenticated staff calls return a clean 401 — verified. Capability checks exist on 25 service methods (`principal.can("…")`). Good.

### 5.2 Gaps

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **Critical** | `PublicLink` has **no expiry and no revocation**. The table is `link_key, clinic_id, created_at` and nothing more (verified with `\d registry.public_links`). The link key **is the visit token**, and tokens are sequential: `nextToken()` returns `String.format("A-%03d", highest + 1)` (`patientweb/PatientWebService.java:396-411`). There is no code path that deletes or deactivates a link | `backend/src/main/resources/db/registry/V3__public_links.sql:8-14`, `backend/.../tenancy/PublicLink.java:18-55`, `patientweb/PatientWebService.java:396-411` |
| 2 | **Critical** | `GET /api/token/{token}` and `GET /api/intake/{token}` are **unauthenticated** and return the patient's name, queue position, doctor and reason (`patientweb/PatientWebService.java:244-255, 264-271`). Combined with sequential tokens and no expiry, any patient whose visit was created through public booking has a permanently public, enumerable record | `security/ClinicAuthFilter.java:33-35`, `patientweb/PatientWebService.java:222-273` |
| 3 | **Critical** | `POST /api/public/booking` is an **unauthenticated write** with **no rate limiting, no CAPTCHA and no idempotency key**. It creates a patient row and a visit row in any clinic whose booking slug is known — and the slug is derived from the clinic's **name** (`db/registry/V2__booking_slug.sql:9-11`: `lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))`), so it is guessable ("MedMate Clinic" → `medmate-clinic`, verified live) | `patientweb/PatientWebController.java:36-40`, `patientweb/PatientWebService.java:129-218`, `db/registry/V2__booking_slug.sql:9-11` |
| 4 | **Critical** | `GET /api/verify/{id}` ignores the `h` hash parameter and returns `"genuine": true` unconditionally | `patientweb/PatientWebService.java:296-352` |
| 5 | **High** | `POST /api/intake/{token}` **overwrites `visit.reason`** with the patient's free text and persists nothing else — the symptoms, red flags and duration the form collects are discarded, and a later `GET` returns `filled: false` regardless | `patientweb/PatientWebService.java:275-292, 258-273` |
| 6 | **High** | `book()` matches an existing patient by `phone.endsWith(...)` (:158), so anyone who knows a patient's mobile number can append a visit to that patient's record | `patientweb/PatientWebService.java:155-175` |
| 7 | **High** | `medmate.env` **defaults to `development`** (`application.yml:41`) and `AUTH_SECRET` has a hard-coded development default (`application.yml:51`). A deployment that forgets `APP_ENV` starts with the OTP exposed and the dev secret, and `AuthGuard` will not object | `application.yml:38-56`, `security/AuthGuard.java:36-38` |
| 8 | **High** | No rate limiting, no attempt counting and no lockout on OTP or PIN (the plan's own "Before production" list acknowledges this) | `docs/ARCHITECTURE.md:183` |
| 9 | **Medium** | CORS is a hard-coded allowlist, `allowedOrigins` with `allowedHeaders("*")` and **no `allowCredentials`**. Serving the SPA from any origin other than `:3100` is blocked outright — I hit this for real when running the app on another port | `config/WebConfig.java:15-25`, `application.yml:57-58` |
| 10 | **Medium** | The session token lives in `localStorage` (`src/services/api/client.ts:19-39`), so any XSS yields the token | `src/services/api/client.ts:26-39` |
| 11 | **Medium** | `server.error.include-message: always` leaks internal exception messages to clients | `application.yml:29-30` |
| 12 | **Medium** | PIN hashing is SHA-256 over the staff id, not a password-grade KDF (the repo's own doc says so) | `docs/ARCHITECTURE.md:175-178` |
| 13 | **Low** | No CSRF configuration — acceptable, since auth is a bearer header rather than a cookie | — |

### 5.3 Multi-clinic isolation

Isolation is **structural, not query-level**: each clinic is a separate PostgreSQL schema and `search_path` is set per connection. Every repository method I enumerated is clinic-scoped except the three prescription sub-table repositories (`PrescriptionMedicineRepository.findByPrescriptionIdOrderBySortOrder`, `PrescriptionDiagnosisRepository…`, `PrescriptionTestRepository.findByPrescriptionId`) and `RoleRepository.findById` — all of which are safe *because* the schema is the boundary. The registry repositories (`findByBookingSlug`, `findByLinkKey`, `findByPhone`) are deliberately cross-tenant.

Two real leaks inside the boundary:

- **`ClinicAuthFilter.routePatient` lets the caller choose the tenant by query parameter.** `GET /api/public/doctors?clinic=<any-slug>` routes to that clinic's schema. For the booking page this is intended; but the same `?clinic=` override applies to `/api/token/`, `/api/intake/` and `/api/verify/` because `routePatient` checks the parameter **first** (:133-137) and only falls back to the link key. A request to `/api/token/A-015?clinic=another-clinic` routes to *another clinic's* schema with a token from the first — the link key is then ignored. CONFIRMED by reading `:132-144`.
- **`PatientWebService.book()` scans patients with `patients.findByClinicIdOrderByCreatedAtAsc(clinicId)` and `endsWith(phone)`** — a linear scan of every patient in the clinic per booking request.

### 5.4 Capability enforcement and one role-level gap

`principal.can(resource)` is `capabilities.contains(resource)` (`security/ClinicPrincipal.java:16-18`), and the capabilities come from the seeded grants. The seed (`db/clinic/V200__clinic_defaults.sql:17-36`) grants 18 resources and `V201__reports.sql:37-52` adds `clinical` (owner + doctor only) and `report` (admin only).

**Gap CONFIRMED:** `GET /api/clinic/dashboard` is gated on `principal.can("report")` (`dashboard/DashboardController.java:50-52`), but the **front desk** role never receives `report` (`V200__clinic_defaults.sql:44-47`) and the **nurse** has it explicitly removed again by `V202__nurse_report_grants.sql`. The nav entry for Dashboard carries **no `resource`** (`src/constants/nav.ts:33-35`), so both roles are shown a Dashboard they cannot open — they get a 403 home screen.

---

## 6. Data layer and migrations

### 6.1 The three new migrations

| Migration | Verdict |
|---|---|
| `db/registry/V2__booking_slug.sql` | **Applies cleanly** (verified: "Migrating schema registry to version 2 - booking slug"). **Two defects:** (a) the backfill `update clinics set booking_slug = lower(regexp_replace(name, …)) where booking_slug is null` (:9-11) runs under a `unique` constraint added in the same statement (:6-7) — **two clinics with the same name make the migration fail and the whole service refuse to boot**; (b) `regexp_replace` does not trim, so "Dr. Rao's Clinic " → `dr-rao-s-clinic-` with a trailing dash. `alter column booking_slug set not null` (:14-15) then makes the failure permanent |
| `db/registry/V3__public_links.sql` | **Applies cleanly** (verified). **Defect:** `link_key, clinic_id, created_at` only — **no `expires_at`, no `revoked_at`, no `used_at`** (:8-12). The index `public_links_clinic` (:14) is on a column nothing filters by. The entity (`tenancy/PublicLink.java`) matches the table exactly, so the missing expiry is a design gap, not a mapping gap |
| `db/clinic/V203__nurse_and_lab_bench.sql` | **Applies cleanly** (verified). Entities match: `Vitals.breathRate`/`sentTo` (`vital/Vitals.java:51-55`) → `breath_rate`/`sent_to`; `LabOrder.sampleNo`/`partner`/`collectedAt` (`lab/LabOrder.java:52-59`) → `sample_no`/`partner`/`collected_at`. **Defects:** (a) **no index** on either new column — confirmed via `pg_indexes`: only `vitals_pkey`, `vitals_patient`, `lab_orders_pkey`, `lab_orders_patient` exist; (b) `sent_to uuid references staff (id)` (:8) resolves `staff` unqualified, which depends on Flyway's `defaultSchema` — it works today because `ClinicProvisioningService.migrate()` sets `.defaultSchema(schema)` (:122-131), but it is implicit; (c) `sample_no` is not unique, though it is a printed tube number |

### 6.2 Migration versioning and schema separation — verified sound

- `db/registry` (V1–V3) and `db/clinic` (V1–V15, V200–V203) both start at V1, but they are **separate Flyway instances with separate history tables**: `registryFlyway` uses `.schemas(registrySchema).defaultSchema(registrySchema)` (`config/TenancyConfig.java:47-56`) → `registry.flyway_schema_history`; `ClinicProvisioningService.migrate` uses `.schemas(schema).defaultSchema(schema)` (:122-131) → `clinic_xxxx.flyway_schema_history`. **No collision.** Verified at runtime: both histories were created and both reached their expected versions.
- `db/demo` (V300–V302) is **not** a Flyway location — it is applied as a script with its own idempotency guards (`tenancy/ClinicProvisioningService.java:63-94`), so it cannot collide with the numbered versions.
- `spring.flyway.enabled: false` (`application.yml:22-25`) with the registry migrated explicitly by `ProvisioningRunner.run()` (`config/ProvisioningRunner.java:48-49`). Correct.

### 6.3 Tables referenced in code but never created

None found. Every entity maps to a table created by a migration, and Hibernate validation passes (`ddl-auto: none`, `ClinicApiIT` referenced in the docs is **not present** in this repo — `backend/src/test/` holds only `PinServiceTest` and `GrantServiceTest`, so the mapping-vs-schema check the architecture doc relies on does not exist here).

### 6.4 Migration risk not covered by any test

**No migration is tested.** There is no Flyway test, no schema assertion, no `ClinicApiIT`. The three new migrations are only validated by the fact that they happened to apply on an empty database — which does not test the second clinic, the `unique`-slug collision, or the "clinic added a year ago" claim in `plan.md`/`docs/ARCHITECTURE.md:101-104`.

---

## 7. Test coverage gaps

**Coverage cannot be measured.** `@vitest/coverage-v8` is **not installed** (`node_modules/@vitest/` contains only `mocker` and `spy`), and adding a dependency is out of scope for a read-only audit. The picture below is enumerated by reading every test file and the source tree.

**What exists:** 3 frontend test files, **109 tests**; 2 backend test files, **4 tests**.

| File | Tests | What it actually tests |
|---|---|---|
| `src/features/consult/safety.test.ts` | 17 | Pure functions in `features/consult/safety.ts` + the Centor score |
| `src/features/nurse/vitals.test.ts` | 11 | Pure range checks on vitals |
| `src/services/api/mock/contract.test.ts` | 26 | The mock's own routes, plus a path-level check against 3 controllers (§2d) |
| `backend/src/test/java/…/auth/PinServiceTest.java` | 2 | PIN hashing |
| `backend/src/test/java/…/grant/GrantServiceTest.java` | 2 | The grant map |

**`@testing-library/react` and `@testing-library/jest-dom` are devDependencies, but no test renders a single component.** The entire React layer — 45 screen components — has zero coverage.

### Critical paths with ZERO tests

1. **Billing & POS** — till, pay, refund, new bill, close-the-day, receipt. Money movement with no test.
2. **Subscription** — plan, trial, usage counters, checkout, enquiry, payments.
3. **Patient-web booking** — book, live token, intake, verify. The four patient surfaces, all unauthenticated.
4. **Public links and tenant routing** — `ClinicAuthFilter.routePatient`, `ClinicRouting.routeByLink`, `routeBySlug`. The whole unauthenticated routing surface.
5. **The three new migrations** — no migration test of any kind.
6. **Check-in** — `POST /api/clinic/check-ins`.
7. **The nurse and lab bench screens** — the flows are untested even though two pure functions are.
8. **`ClinicAuthFilter` behaviour** — which paths are public, what happens with a bad token, what happens with an unknown link. Zero tests; the 500-instead-of-401 bug in §3.2 is exactly what one test would have caught.
9. **Desk checkout and booking link**; 10. **Schedule and appointment booking**; 11. **The whole kiosk flow** (11 endpoints); 12. **Reports**; 13. **`ApiExceptionHandler`** — the error envelope every screen depends on; 14. **Cross-clinic isolation** — no test that a clinic cannot read another's data; 15. **Every screen component.**

**Count: 15 critical paths with zero tests.**

---

## 8. Error handling and resilience

**Frontend — what is there:** every new screen has an error state via `useState` + `.catch()` (`billing/BillingScreen.tsx:42,58-60`; `desk/DeskScreen.tsx:30,48-50`; `nurse/NurseScreen.tsx:29,41-43`; `lab/LabScreen.tsx:30,39-40`; `subscription/SubscriptionScreen.tsx:26,37-39`; `kiosk/KioskScreen.tsx:20,30-32`; `patient-web/BookScreen.tsx:24,46-48`; `schedule/ScheduleScreen.tsx:31,44-46`; `settings/SettingsScreen.tsx`). The architecture doc's claim that every screen has loading/empty/error states holds up for the new work.

**Frontend — what is missing:**

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **High** | **No React error boundary anywhere.** `grep` for `ErrorBoundary` / `componentDidCatch` / `getDerivedStateFromError` / `Suspense` across `src/` returns **zero hits**. One thrown error during render blanks the whole app | `src/app/providers/AppProviders.tsx` |
| 2 | **High** | **No retry.** Every catch sets an error string and stops; there is no retry affordance on any screen | e.g. `src/features/lab/components/LabScreen.tsx:39-40` |
| 3 | **High** | **Raw server messages reach the UI.** `problem?.detail ?? problem?.message ?? response.statusText` shows Spring's "No static resource api/clinic/inbox." to a clinician | `src/services/api/client.ts:54-57` |
| 4 | Medium | **No request cancellation.** `RequestOptions` declares `signal` but no caller passes one; the nurse and lab screens poll "every 10 seconds" with no in-flight guard | `src/services/api/client.ts:13-17` |
| 5 | Medium | **No offline/poor-connectivity handling.** An Indian clinic on a flaky link gets a permanent error string and no queueing or retry-when-back | — |
| 6 | Medium | **`/certificate` never resolves** — no id in the route, so the fetch is for `undefined` | `src/app/routes/index.tsx:59`, `src/features/certificate/components/CertificatePaper.tsx:21` |

**Backend:**

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 7 | **High** | **No Bean Validation on any new endpoint.** All eight new controllers take `@RequestBody Map<String, Object>` and hand-cast with `String.valueOf(request.getOrDefault(...))`. `MethodArgumentNotValidException` is handled (`common/ApiExceptionHandler.java:33-39`) but **no controller ever triggers it**. `UUID.fromString(doctorId)` on a non-UUID throws `IllegalArgumentException` → 400, but `Integer.valueOf(...)` on a non-numeric age throws `NumberFormatException` → **500** | `patientweb/PatientWebController.java:31-65`, `lab/LabController.java:37-47`, `billing/BillingController.java`, `nurse/NurseController.java`, `subscription/SubscriptionController.java`, `schedule/AppointmentController.java`, `desk/DeskController.java` |
| 8 | **High** | **No global handler for unexpected exceptions** → Spring's default 500 with `include-message: always` | `common/ApiExceptionHandler.java` (no `@ExceptionHandler(Exception.class)`) |
| 9 | **High** | **No idempotency on any write endpoint.** Double-submitting "New bill", "Book a visit" or "Book" creates two rows; `POST /clinic/billing/close-day` can be run twice and closes the day twice | `billing/BillingService.java:227-316`, `schedule/AppointmentService.java`, `patientweb/PatientWebService.java:129-218` |
| 10 | Medium | **Pagination is inconsistent.** `ReportsService` has `MAX_ROWS = 200` and honours `limit`/`offset` (`reports/ReportsService.java:41,60-67`), but every other list endpoint is unbounded | `billing/BillingService.java:100`, `nurse/NurseService.java:66,71`, `lab/LabService.java:61-78`, `patientweb/PatientWebService.java:157,359,436` |
| 11 | Medium | **Transaction boundaries exist where they should** (`@Transactional` on the write services) but `PatientWebService.book()` writes a patient, a visit, an appointment and a public link in one transaction that then fails on the appointment (:191-208) — the whole booking rolls back, so the "links to keep" are never issued | `patientweb/PatientWebService.java:128-218` |

---

## 9. Product and UX gaps

**Against `docs/SCREEN-AUDIT.md`** (23 KB, the screen-by-screen audit of the deployed app) and against the deployed MVP itself (§11), the app diverges. Concrete, confirmed items:

| # | Severity | Gap | Evidence |
|---|---|---|---|
| 1 | **High** | **The patients list screen does not exist.** `/patients` renders a single patient *record*; the reference renders a list ("Patient records · 1 patients", tabs New patient / Everyone / Here today / Follow-up due / Owes money / My patients). The list endpoint `/clinic/patients` exists in the mock but has **no call site** | `src/app/routes/index.tsx:54`, `src/features/patients/components/PatientRecordView.tsx:19`, `src/services/api/mock/routes.ts:557` |
| 2 | **High** | **The reception desk is missing the reference's four stat tiles** ("Waiting at the desk", "To collect", "Follow-ups to book", "Done today") and the "Billing" button | reference capture vs `src/features/desk/components/DeskScreen.tsx` |
| 3 | Medium | **Reports date presets differ**: app `Today / This week / This month / Custom` vs reference `Today / Yesterday / 7 days / 30 days / This month / Last month / 90 days / 12 months / Pick dates`; the reference filters "Whole clinic", the app filters "All doctors" | `src/features/reports/components/ReportsScreen.tsx` |
| 4 | Medium | **The subscription counts a different entitlement**: app "Prescriptions / Storage / SMS credits", reference "Doctors / Locations / Staff" | `src/features/subscription/components/SubscriptionScreen.tsx` vs the reference |
| 5 | Medium | **Settings tab set differs**: app "Clinic & letterhead / My PIN & device / Pharmacies / Agreements / Readiness check", reference "My account / This device / Clinic & letterhead / Pharmacies / Ready to go live" | `src/features/settings/components/SettingsScreen.tsx` |
| 6 | Medium | **Queue tabs differ**: app "Waiting for you / In-clinic / Online / Finished / No-shows", reference "My patients / All doctors / Unassigned / Seen today / Waiting for you / Urgent or emergency" | `src/features/queue/components/QueueScreen.tsx` |
| 7 | Medium | **The kiosk is rendered inside the staff shell**, whereas the reference shows it standalone (no sidebar, no top bar). A kiosk tablet should not show the clinic's doctor console | `src/app/routes/index.tsx:77-80` |
| 8 | Medium | **The app has no "test mode" banner.** The reference shows a prominent "Test mode for eSign, ABDM, payments: signatures and payments here are not real." strip. The app ships `VITE_USE_MOCK=false` builds with no equivalent warning, and `plan.md` does not promise one | reference capture |
| 9 | Medium | **The templates screen drops the reference's 3-step explainer** ("1 Build one here… 2 Apply it in a consult… 3 Check every line before signing") | `src/features/templates/components/TemplatesView.tsx` |
| 10 | Low | **Empty-state copy is inconsistent**: several screens fall back to generic text ("Nothing here", "Nothing booked", "No bill selected") instead of the product's voice | e.g. `src/features/inbox/components/InboxView.tsx`, `src/features/schedule/components/ScheduleScreen.tsx` |
| 11 | Low | **Timezone**: the booking slots are hardcoded as `day + "T" + HOURS[index] + ":00Z"` — UTC — for a clinic whose profile says `Asia/Kolkata` (`db/clinic/V201__reports.sql:9`). `ClinicZoneService` exists and is used by the reports and the nurse station, but **not** by `PatientWebService` | `patientweb/PatientWebService.java:370`, `common/ClinicZoneService.java` |
| 12 | Low | **Currency is hardcoded to ₹** with no formatting helper and no locale abstraction | `src/features/billing/components/*.tsx` |
| 13 | Low | **Onboarding is a dead end**: the five sign-up steps have no API call and no `/api/auth/signup` endpoint exists, although the filter explicitly allows that path | `src/features/onboarding/`, `security/ClinicAuthFilter.java:24` |
| 14 | Low | **Accessibility**: the plan's own "a screen is not done until" checklist requires "Keyboard reachable, focus visible, `prefers-reduced-motion` respected" (`plan.md:139`). I found **no `prefers-reduced-motion` media query** in either stylesheet and no focus-visible rule beyond the borrowed stylesheet's | `src/styles/app.css`, `src/styles/medmate.css` |

---

## 10. Ops / DevOps

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **High** | **No Dockerfile, no docker-compose, no CI workflow, no `.github/` directory, no deploy script** — `git ls-files` finds none. The project cannot be built or deployed by anyone but the author | `git ls-files` |
| 2 | **High** | **`.env.example` documents one variable** (`VITE_USE_MOCK`) while the code reads two (`VITE_USE_MOCK`, `VITE_API_URL`; `VITE_API_TARGET` is read by `vite.config.ts:34`) and the README documents three | `.env.example`, `src/config/env.ts:12-14`, `vite.config.ts:34`, `README.md:23-27` |
| 3 | **High** | **There is no backend env template at all.** The API reads 14 variables (`DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_POOL_SIZE`, `AUTH_SECRET`, `AUTH_EXPOSE_CODE`, `AUTH_TTL_MINUTES`, `AUTH_OTP_TTL_MINUTES`, `CORS_ORIGINS`, `APP_ENV`, `SERVER_PORT`, `REGISTRY_SCHEMA`, `CLINIC_SCHEMA_PREFIX`, `DEMO_ENABLED`, `DEMO_CLINIC_ID`) and none of them are in any example file | `backend/src/main/resources/application.yml:1-58` |
| 4 | Medium | **Health**: `/actuator/health` exists and is public (`security/ClinicAuthFilter.java:24`) and returns `{"status":"UP"}` — verified. There is **no readiness probe** distinct from liveness and no `show-details` configuration | `application.yml:32-36` |
| 5 | Medium | **No metrics, no tracing, no structured logging.** Plain `log.info("clinic {} is live in schema {}", …)` string concatenation; no correlation id, no MDC, no JSON log format | `tenancy/ClinicProvisioningService.java:48,119` |
| 6 | Medium | **No secret management.** `AUTH_SECRET` has a literal development default in `application.yml`; `AuthGuard` catches it, but only when `APP_ENV` is set to something other than development — and `APP_ENV` itself defaults to development | `application.yml:41,51`, `security/AuthGuard.java:36-38` |
| 7 | Medium | **No backup, restore or data-export story** for a database-per-clinic tenant model | — |
| 8 | Low | `server.error.include-message: always` in production | `application.yml:29-30` |
| 9 | Low | The Flyway demo seeding is gated by `DEMO_ENABLED` + `DEMO_CLINIC_ID`, which is the right shape | `config/ProvisioningRunner.java:56-58` |

---

## 11. DESIGN vs IMPLEMENTATION

**Method.** The Figma REST API and the public Figma URL are both unreachable from this sandbox (HTTP 403 from CloudFront, §0). The repo's own stated pixel reference — the deployed MVP — *is* reachable. I signed into it (test-mode OTP `936419`), captured 14 screens at 1280×720, captured the same 14 routes from the local app in mock mode, and compared.

| Route | App (mock) | Deployed MVP (reference) | Verdict |
|---|---|---|---|
| `/dashboard` | "4 in your queue · 2 awaiting vitals" | "0 awaiting vitals · 0 in your queue · 0 bills pending · 0 lab orders open", plus a **setup checklist** "2/8 Set up MedMate Clinic" | Different content model; the reference has a first-run checklist the app lacks |
| `/queue` | "Your queue — Room 2 · 4 waiting · 9 seen today · average consult 8 min" | "**Doctor console** — Thursday, 26 November · emergencies and urgent patients first · refreshes every 10 seconds" + tabs My patients / All doctors / Unassigned / Seen today / Urgent or emergency + "Your average consult" | **Different screen title and tab set** |
| `/patients` | single patient **record** | **patient list** with segment tabs | **Missing screen** |
| `/reports` | "Today / This week / This month / Custom", "All doctors", "Excel" | "Today / Yesterday / 7 days / 30 days / This month / Last month / 90 days / 12 months / Pick dates", "Whole clinic" | **Preset set differs** |
| `/desk` | "Reception desk — 4 in the clinic · 0 to hand over", tiles "To hand over / Waiting / Done today" | "Reception desk — Check each patient out in one place: prescription, payment, follow-up and lab sample. Oldest first.", tiles "Waiting at the desk / To collect / Follow-ups to book / Done today", plus a **Billing** button | **Missing tiles and button** |
| `/billing` | "Billing & POS", tiles "Collected today / 3 pending / 0 refund", tabs absent | "**Billing & payments** — Bills, UPI, cash and card, refunds and the day close.", tiles "Collected today / UPI / Cash / Card / To collect / 0 bills / Refunded / Day Open", tabs Today / All / To collect / Paid / Refunded | **Title, tiles and tabs differ** |
| `/schedule` | "Appointments — Wednesday, 25 November 2026", "Day / Week", rows "10:00 Kavya Nair · 34 F Booked visit / In clinic" | "Appointments — Thursday, 26 Nov", "Online booking page / First available / Book", a **multi-day strip** (THU 26 / FRI 27 / SAT 28 …) with per-day free counts | **Different layout** — the app has no week strip |
| `/settings` | tabs "Clinic & letterhead / My PIN & device / Pharmacies / Agreements / Readiness check" | tabs "My account / This device / Clinic & letterhead / Pharmacies / Ready to go live" | **Tab set differs** |
| `/subscription` | "Subscription & plan — ON TRIAL … Prescriptions 214 of 500 / Storage 3 of 10 / SMS credits 68 of 200" | "Subscription — YOUR PLAN Free trial 12 days left … Doctors 1 of 5 / Locations 1 of 3 / Staff 0 of 20", "Test payments" | **Different entitlement model** |
| `/templates` | list only | list **plus** the 3-step explainer | **Missing explainer** |
| `/nurse`, `/lab` | same structure, different numbers | same structure | match |
| `/kiosk` | kiosk landing **inside the staff shell** | kiosk landing **standalone** | **Wrong shell** |
| `/` (landing) | marketing landing page | the dashboard | n/a (the reference redirects) |

**What the design comparison cannot tell you:** whether the Figma file (`FS5TDn4nUCjWizoIkKBcVg`, node `58:4256`) matches the deployed MVP, or whether the app matches Figma where the two differ. The repo treats the MVP as the reference; Figma is the design of record per `plan.md:6-8`. Any Figma-vs-MVP drift is invisible to the repo's own harness.

---

## 12. Performance

**Frontend bundle:** 596,435 B JS (168 kB gzip) + 191,078 B CSS (33.8 kB gzip), **one chunk**.

- **No code splitting at all.** `grep` for `React.lazy`, `lazy(`, `Suspense` and dynamic `import()` across `src/` returns **zero hits**. Every route — landing, kiosk, consult, billing, patient-web — is in the initial payload. The 24 route components are eagerly imported in `src/app/routes/index.tsx:2-25`.
- The JS is dominated by React 19 + React DOM (~140 kB gzipped combined), Redux Toolkit + react-redux, and react-router-dom 7. The product's own code is a small share of it. **Severity: Medium.** The cheapest win is `React.lazy` on the four patient/kiosk surfaces (`/book`, `/t/:token`, `/intake/:token`, `/kiosk`), which a clinic tablet never opens.
- **The CSS is 191 kB for a 1,074-class stylesheet**, of which `src/styles/app.css` (1,799 lines) is the new part. Fine, but the bundle is served uncritically — no `manualChunks`, no compression config, no `build.chunkSizeWarningLimit` tuning. The build emits the standard ">500 kB chunk" warning.

**Backend:**

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **High** | **Unbounded list queries.** `visits.findByClinicIdOrderByCreatedAtAsc` (all visits), `patients.findByClinicIdOrderByCreatedAtAsc` (all patients), `appointments.findByClinicIdOrderByStartsAtAsc` (**882 rows** in the demo clinic), `staff.findByClinicId` (all staff) are loaded into memory and then filtered in Java | `nurse/NurseService.java:66,71`, `patientweb/PatientWebService.java:157,359,436`, `dashboard/DashboardController.java:56-58` |
| 2 | **High** | **N+1 in the lab bench.** `LabService.doctor()` does a full `staff.findByClinicId(clinicId)` scan **per lab order**; with 264 orders that is 264 staff queries per bench request | `lab/LabService.java:198-212` |
| 3 | **High** | **N+1 in the nurse station.** One `vitals.findFirstByClinicIdAndVisitId…` query **per visit** | `nurse/NurseService.java:79-81` |
| 4 | **High** | **N+1 in the consult.** `patients.findByIdAndClinicId` per prescription, per diagnosis, per medicine | `consult/ConsultService.java` |
| 5 | Medium | **The bench payload is 148,899 bytes** (§3.6) | measured |
| 6 | Medium | **Missing indexes on the new columns** — no index on `vitals.sent_to` or `lab_orders.sample_no` (§6.1) | `pg_indexes` |
| 7 | Medium | `PatientWebService.slots()` scans all appointments for the doctor on every booking-page load | `patientweb/PatientWebService.java:355-364` |

---

## 13. Code health

**Clean.** `grep` across `src/` and `backend/src/`:

| Pattern | Count |
|---|---|
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `eslint-disable` | **0** |
| `: any` / `as any` (in code, not prose) | **0** |
| `console.log` / `console.error` / `console.warn` | **0** |
| Placeholder `throw new Error("not implemented")` | **0** |

TypeScript is `strict: true` with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` (`tsconfig.json:14-19`), and `eslint-plugin-boundaries` enforces the module graph — `npm run lint` passes with zero warnings.

**Duplicated logic between the mock and the real service — the divergence risk.** Every endpoint exists twice: 640 lines of `mock/routes.ts` + 8 `*Routes.ts` modules (~1,700 lines) versus the Java services. `mock/state.ts` (1,204 lines) duplicates the demo data the SQL seeds also carry. There is **no shared contract** — only the narrow path-level assertion in §2d. The duplication is where every mismatch in §2c came from, and it will keep producing them.

**Largest files** (lines): `src/styles/app.css` 1,799 · `src/services/api/mock/state.ts` 1,204 · `backend/…/reports/ReportsService.java` 935 · `src/features/reports/components/ReportsScreen.tsx` 798 · `backend/…/consult/ConsultService.java` 741 · `src/features/consult/components/ConsultView.tsx` 662 · `src/services/api/mock/routes.ts` 640 · `backend/…/billing/BillingService.java` 640.

`ReportsService` (935 lines) and `ConsultService` (741 lines) are doing several jobs each — report generation, date parsing, doctor scoping, CSV/Excel export and payload shaping in one class. `ConsultService` alone builds visits, consultations, prescriptions, diagnoses, medicines, messages, invoices and appointments.

**Real bugs demonstrable from the code:**

1. `LabService.referenceNormal()` is inverted — see §14.
2. `PatientWebService.slots()` counts appointments across all dates — §3.4.
3. `PatientWebService.book()` discards the chosen slot — §3.4.
4. `PatientWebService.liveToken()` computes the queue position only over tokens starting with `"A"` (:231-235), so a `"B"`-series patient's position is always 1.
5. `ClinicAuthFilter.routePatient` lets `?clinic=` override the link key — §5.3.
6. `ClinicAuthFilter` catches the wrong exception type — §3.2.
7. `Appointment.createdAt` is never set — §3.1.
8. `ApiExceptionHandler` has no catch-all — §8 row 8.

---

## 14. The lab "abnormal" logic is inverted — CONFIRMED

`backend/src/main/java/com/medmate/clinic/lab/LabService.java`:

```java
// :215-217
private boolean referenceNormal(LabOrder order) {
    return order.getResultValue() == null || order.getReferenceLow() == null;
}
```

used as (:171) `body.put("abnormal", order.isCritical() || !referenceNormal(order));`

`referenceNormal` returns **true** when the reference range is **absent**. So `!referenceNormal` is true exactly when a value *and* a reference are both present — meaning **any result reported with a reference range is flagged abnormal**, and a result reported *without* a range is never flagged. The predicate is the logical opposite of its name and of its intent.

Compounding it, `report()` sets `setReferenceLow(text(request.get("reference")))` and `setReferenceHigh(null)` (:109-110), discarding the upper bound entirely, so a range cannot be represented in the database. And the write path reports `abnormal` from the **client-supplied flag** (:125) while the read path computes it — so the same row can read `abnormal: false` in the POST response and `abnormal: true` after a refresh.

**Severity: High.** This is clinical data: a normal result flagged abnormal erodes trust in the flag, and an abnormal result that arrives without a reference is never flagged at all.

---

## 15. What is solid

- **The tenant boundary is structural and correct.** One schema per clinic, `search_path` set per connection, the caller never chooses the clinic id — the token carries it (`docs/ARCHITECTURE.md:118-141`). Every clinic-scoped repository method I enumerated is clinic-scoped.
- **The capability model has one owner.** `GrantService` is the single place that decides what a role may open, and the same map drives the API's checks and the frontend's nav — which is exactly what `docs/ROLE-MODEL.md` §2.4 asks for. The one gap (§5.4) is a missing grant, not a second matrix.
- **The auth guard fails closed.** `AuthGuard` refuses to start outside development with the OTP exposed or the default secret; the mock cannot ship (`vite.config.ts:15-27`); unauthenticated staff calls return a clean 401. All verified.
- **The three new migrations apply cleanly** and their entities match the columns exactly. Registry and clinic Flyway histories are correctly separated, and the demo scripts are correctly excluded from the version sequence.
- **The code is clean.** Zero TODOs, zero `@ts-ignore`, zero `any`, zero `console.log`, zero eslint-disable, strict TypeScript, and a boundaries rule that actually fails the build.
- **The new screens have real error states**, and the stylesheet-provenance rule genuinely protects the product CSS.
- **The plan and the docs are unusually honest** — `docs/ARCHITECTURE.md:158-187` lists the auth weaknesses as *known*, and `plan.md` marks the four unbuilt screens as placeholders rather than pretending.

---

## 16. Counts

| Metric | Value |
|---|---|
| Mock routes with no backend endpoint | **17** (11 of them the entire kiosk API) |
| Backend endpoints with no mock route | **4** |
| Field / envelope / semantic mismatches inside matched pairs | **22** |
| **Total contract defects** | **43** |
| Critical paths with zero test coverage | **15** |
| **Critical findings** | **6** |
| **High findings** | **23** |
| Medium findings | 21 |
| Low findings | 7 |
| Frontend test files / tests | 3 / 109 (0 of 45 screen components rendered) |
| Backend test files / tests | 2 / 4 |
| Guarded staff routes in `src/app/routes/index.tsx` | 24 |
| …of those, 404 against the real API | 4 (`/patients`, `/inbox`, `/teleconsult`, `/templates`) |
| …hardcoded placeholder screens | 5 (`/doctors`, `/staff`, `/messages`, `/locations`, `/legal/:document`) |
| …no backend endpoint at all | 1 (`/kiosk`, 11 mock endpoints) |
| …never resolves | 1 (`/certificate`) |
| …renders hardcoded data, no API | 1 (`/settings`) |
| Distinct runtime failures reproduced against real Postgres | **6** |

---

## 17. The highest-value next action

**Stand the app up against the real API and make it a gate.** Specifically: add a single backend integration test (`ClinicApiIT`) that boots the app on Testcontainers Postgres, runs the migrations, and asserts — for every route the frontend calls — that the method, path, request fields and response envelope match `src/services/api/mock/`. That single test would have caught all 43 contract defects in §2, the `created_at` crash in §3.1, and the `abnormal` inversion in §14 before any of them shipped.

The Postgres-backed run in this audit **succeeded** — migrations applied, the app booted, health was UP, and six real failures were reproduced with exact error text. That proves the environment and the approach work; the missing piece is that nobody has ever wired the two halves together, and nothing in CI would notice if they drifted again.
