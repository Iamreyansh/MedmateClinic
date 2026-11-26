# Screen audit — Figma frames vs. the built app

**Date:** 2026-11-25 · **Figma file:** `FS5TDn4nUCjWizoIkKBcVg` (MedMate — Doctor Dashboard)
**Method:** full traversal of all seven pages via the Figma Plugin API, frame-by-frame, compared against
`src/app/routes/index.tsx`, the feature modules, the mock API and the Spring Boot controllers.

## 1. The frame inventory (complete, from the live file)

The file holds **250 top-level frames** across seven pages. This is the whole file — no page was skipped.

| Page | Frames | What it holds |
|---|---:|---|
| Cover | 0 | the cover is a page-level frame, not a child |
| Foundations | 2 | palette + type scale + cover |
| Components | 15 | the component set the screens are built from |
| Screens | 26 | the desktop screens |
| Mobile | 41 | mobile staff screens, patient phone, mobile landing/sign-up |
| Sub-pages & dialogs | 70 | patient pages, kiosk tablet steps, 30 overlays, printouts |
| Prototype — desktop click-through | 96 | the desktop screens again, plus 30 overlays with click targets |

The `Prototype` page is an **exact duplicate** of `Screens` (26) + `Sub-pages & dialogs` (70) = 96, with
click targets wired. It is a click-through, not new screens — so it is **not** counted twice below.

**26 desktop + 41 phone + 70 sub-pages = 137 distinct frames.** 30 of them are overlays
(29 dialogs + 1 drawer).

## 2. The headline answer

| Status | Count | What |
|---|---:|---|
| **Built** | 44 | real routes, real API, real behaviour, region-for-region |
| **Partial** | 8 | route exists and works, but a named Figma region is missing |
| **Placeholder** | 5 | route exists, screen says plainly it is not built |
| **Missing** | 80 | no route at all (all 41 phone frames, 28 other sub-pages) |

Of the **26 desktop screens** on the Screens page: 13 built, 8 partial, 5 placeholder, 0 missing.
Of the **41 phone frames**: **0 built.** The patient-facing web (`/book`, `/appt`, `/t`, `/intake`,
`/legal`, `/verify/...`) is **entirely absent** — the sign-up flow even advertises a booking link
(`/book?clinic=<slug>`) that resolves to a 404.

**Where the 137 frames sit:**

| Group | Frames | Built | Partial | Placeholder | Missing |
|---|---:|---:|---:|---:|---:|
| Screens page (desktop) | 26 | 13 | 8 | 5 | 0 |
| Mobile page | 41 | 0 | 0 | 0 | 41 |
| Sub-pages & dialogs page | 70 | 31 | 0 | 0 | 39 |
| **Total** | **137** | **44** | **8** | **5** | **80** |

### The build log

Ten fractions of twelve frames each. The bar moves as each one lands.

| Fraction | Frames | Bar after | What it builds |
|---|---|---|---|
| — | — | 17/137 · 12.4% | what was already built |
| **F1** | 12 | **29/137 · 21.2%** | the dialog + drawer primitives, the safety checker, the medicine search, and 8 overlays |
| **F2** | 12 | **41/137 · 29.9%** | reception, billing, appointments + their overlays |
| **F3** | 12 | **53/137 · 38.7%** | **done** — nurse station, lab, kiosk |
| F4 | 12 | 65/137 · 47.4% | staff & roles, doctors, locations, messages |
| F5 | 12 | 77/137 · 56.2% | settings, subscription, their overlays |
| F6 | 12 | 89/137 · 65.0% | sign-up, patients list, dashboard fix, verify |
| F7 | 12 | 101/137 · 73.7% | patient web: book, manage, live token, symptoms, legal |
| F8 | 12 | 113/137 · 82.5% | patient phone check-in + booking on the phone |
| F9 | 12 | 125/137 · 91.2% | patient phone verify/legal + mobile staff screens |
| F10 | 12 | 137/137 · 100% | the last mobile staff screens + mobile landing |

**F1 · done.** It lands the two primitives the other 29 overlays need — `Dialog` and
`Drawer`, on the stylesheet's own `.scrim` and `.modal` — and with them:

- the **safety checker** (`features/consult/safety.ts`): allergy clashes, drug interactions,
  duplicates and the Centor score, with 17 tests over the rules;
- the **safety check before signing** overlay, which blocks a prescription that clashes with
  an allergy on record;
- the **medicine search** over brand and salt, which shows a clash as blocked rather than
  hiding it;
- the **patient history drawer**;
- the **check in a patient** overlay, with a new `POST /api/clinic/check-ins` on both the
  mock and the Java service;
- and six more: send to a pharmacy, refer to a colleague, write a certificate, the template
  editor, add a lab result, send a message, call the patient, share the booking link.

**F2 · done.** Reception, billing, appointments and their overlays — `/desk`, `/billing`,
`/billing/receipt/:invoiceId`, `/schedule`.

**F3 · done.** The three stations that were placeholders, each with a real API on both the
mock and the Java service:

- the **nurse station** (`/nurse`) — the tally, the three tabs, the search, and the
  **take vitals** dialog: nine readings, each printing the range it is read against, with
  the number marked as it is typed (`features/nurse/types.ts` — `readVital`, with 11 tests
  over the rules). Saving marks the patient ready for the doctor, so they leave the nurse's
  list and appear in the doctor's. `GET /api/clinic/nurse`, `GET /api/clinic/nurse/doctors`,
  `POST /api/clinic/nurse/vitals`.
- the **lab bench** (`/lab`) — the five numbers, the three tabs, the search, and the work
  on the bench: collected, sent to a partner lab, or reported. A result out of range is
  flagged before it is saved, so the doctor sees it flagged when it arrives.
  `GET /api/clinic/lab`, `POST /api/clinic/lab/results`, `POST /api/clinic/lab/orders/{id}`.
- the **patient kiosk** (`/kiosk`) — the front desk's page, and the tablet flow the patient
  sees once it is open: Mobile → Code → Patient → Doctor → Pay → Token, with the language
  switcher, the 45-second idle reset, and the PIN that closes it.
  `GET /api/kiosk` and the ten endpoints that drive it.

## 3. Desktop screens (the Screens page) — the definitive matrix

### Built (10) — region-for-region match with Figma

| Figma frame | Node | Route |
|---|---|---|
| Screen / Landing page (visitor) | `12:1139` | `/` — all 9 sections (nav, hero, standards, steps, features, rules, pricing, CTA, footer) |
| Screen / Teleconsult (doctor) | `20:2600` | `/teleconsult` — head + call column + side column |
| Screen / Inbox (doctor) | `20:2854` | `/inbox` — head, 4 filters, items + detail columns |
| Screen / Patient record (doctor) | `21:2977` | `/patients` — patient head, timeline, readings, lab results, access log |
| Screen / My templates (doctor) | `22:3956` | `/templates` — head + template grid |
| Screen / Reports — summary (owner) | `17:1913` | `/reports` tab 1 — head, 4 tabs, 5 KPIs, money-by-day chart, breakdown, most common |
| Screen / Reception Desk (front desk) | `15:1513` | `/desk` — head, 3 counts, 3 filters, the desk rows, the hand-over sheet |
| Screen / Billing & POS (front desk) | `9:986` | `/billing` — head, the money by mode, the bills to collect, the bill of supply |
| Screen / Appointments — day view (front desk) | `17:1592` | `/schedule` — head, the day controls, the 4 counts, the day's list and the week grid |
| Screen / Subscription (owner) | `18:1895` | `/subscription` — the plan, the trial, the usage, the three plans |
| Screen / Nurse Station (nurse) | `9:701` | `/nurse` — the tally, the 3 tabs, the search, the cards and the vitals dialog |
| Screen / Lab & Diagnostics (lab technician) | `20:2294` | `/lab` — the 5 numbers, the 3 tabs, the search, the bench and the result dialog |
| Screen / Patient Kiosk — check-in (patient) | `15:1439` | `/kiosk` — the front desk's page, and the tablet's 6 steps |

### Partial (8) — the route works, a named Figma region does not

| Figma frame | Node | Route | What is missing |
|---|---|---|---|
| Screen / Doctor Console — consult & prescription | `7:480` | `/visit/:id` | **Safety checks panel.** Figma has a `Safety checks` block: *"2 things to check before signing"* — a Centor-score antibiotic warning and an allergy/interaction warning. The code renders only a static allergy line (`ConsultView.tsx:276-292`) reading *"the checker warns before a medicine that clashes is added."* No checker, no score, no live interaction warning. Also: the medicine search `<Input>` at `ConsultView.tsx:270` has **no state and no handler** — it cannot search. The `Dialog — Safety check before signing` overlay does not exist. |
| Screen / Dashboard (owner) | `6:2` | `/dashboard` | **"Open a doctor's console" section.** Figma shows a `Doctor consoles` block with three per-doctor rows (avatar, name, speciality · room, queue count). `DashboardDoctor` is typed in `dashboard/types.ts:43` and the mock returns it (`mock/routes.ts:146`), but `DashboardScreen.tsx` never renders it, and the **Spring controller never sends it** (`DashboardController.java:89-102` puts only `meta`, `trial`, `stations`, `manage`). The section is dead in production, not just in mock. |
| Screen / Clinic sign-up — step 1 of 5 | `13:1415` | `/start` | **No clinic is created.** The flow is client-state only; `onFinish={() => navigate("/dashboard")}` (`ClinicSignUp.tsx:178`). There is no `POST` to create a clinic — the API has no such endpoint. The `lookupHpr` registry call is a **local stub** that always returns "Dr. Ananya Rao" (`onboarding/lookupHpr.ts:18-28`). The advertised booking link `${origin}/book?clinic=${slug}` (`steps/ClinicStep.tsx:111`) points at a route that does not exist. |
| Screen / Clinic sign-up — step 2 of 5 | `19:2185` | `/start` | same flow defect — the clinic is never persisted |
| Screen / Clinic sign-up — step 3 of 5 | `19:2315` | `/start` | same flow defect; the location is never persisted |
| Screen / Clinic sign-up — step 4 of 5 | `19:2435` | `/start` | same flow defect; HPR lookup is the local stub |
| Screen / Clinic sign-up — step 5 of 5 | `19:2562` | `/start` | same flow defect; the OTP is not sent, only typed |
| Screen / Patients (front desk) | `21:2670` | `/patients` | **Conflated with `21:2977`.** Figma has *two* distinct screens: a **list** (search, 5 filter chips, 6-row table of masked mobiles, "Showing 1–6 of 1,284") and a **record** (timeline, readings, lab results, access log). The app has one route rendering the record. The list screen has no route — `/clinic/patients` returns the list payload (`mock/routes.ts:455`) but nothing consumes it. |

### Placeholder (5) — route exists, screen says so

| Figma frame | Node | Route | Placeholder says it needs |
|---|---|---|---|
| Screen / Staff & roles — Roles & access | `10:942` | `/staff` | the staff and roles endpoints |
| Screen / Patient messages (front desk) | `21:3256` | `/messages` | the messages endpoints |
| Screen / Doctors (clinic admin) | `22:3106` | `/doctors` | the doctors and HPR lookup |
| Screen / Locations (clinic admin) | `22:3422` | `/locations` | the branches endpoints |
| Screen / Settings — clinic & letterhead (owner) | `22:3701` | `/settings` | the settings endpoints |

**Note on the backend:** the placeholders are honest but *understate* what exists. The Spring Boot
controllers already implement `appointments`, `billing`, `desk`, `messages`, `activity` and `audit`
(`AppointmentController`, `BillingController`, `DeskController`, `MessageController`, `AuditController`).
The frontend does not call them — the placeholders describe a **frontend** gap, not a backend one.

### Auxiliary screens built, not in the Screens page

| What | Route | Status |
|---|---|---|
| Sign in — mobile + code | `/login` | built; OTP with attempt limits and cooldown |
| Lock screen (PIN) | `/lock` | built |
| Doctor Console — queue | `/queue` | built |
| Doctor Console — after signing | `/visit/:id` (signed state) | built |
| Medical certificate — A4 print | `/certificate` | built |
| Prescription — A4 print | `/rx/:id` | built |
| Reports — Bookings & waiting | `/reports` tab 2 | built, but the busiest-hours chart form is wrong (see §3) |
| Reports — Clinical (doctors only) | `/reports` tab 3 | built, gated to doctors |
| Reports — Consult list | `/reports` tab 4 | built — search, paging, CSV |
| Verify prescription (public) | — | **missing** |
| Verify certificate (public) | — | **missing** |
| Dashboard — new clinic welcome & setup guide | — | **missing** (the 8-step first-run checklist named at `PRODUCT-SPEC.md:99`) |
| Reports sub-tabs | `/reports` | 4 of 4 built |
| Settings sub-tabs | `/settings` | 0 of 5 built |
| Fidelity style guide | `/fidelity` | built (dev tool) |
| 404 | `*` | built |

## 4. Mobile — 41 frames, 0 built

**Every mobile frame is missing.** The Figma file has a complete mobile staff app, a mobile landing
and mobile sign-up, and the patient phone flow. The app ships **one responsive shell**.
`src/components/layout/Mobile.tsx` holds `MobileHeader` and `MobileTabBar` — but they are **only**
used by the fidelity guide (`dev-tools/components/FidelityGuide.tsx:181-182`). No product route renders
them. There is **no bottom tab bar** in the running app, and no route serves any of these 41 frames.

### 4a. Mobile staff app — 25 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Mobile / Dashboard (owner) | `24:3` | **missing** |
| Mobile / Doctor Console — consult | `24:136` | **missing** |
| Mobile / Inbox (doctor) | `24:257` | **missing** |
| Mobile / Patient record (doctor) | `24:350` | **missing** |
| Mobile / Teleconsult (doctor) | `24:449` | **missing** |
| Mobile / My templates (doctor) | `24:538` | **missing** |
| Mobile / Reception Desk (front desk) | `28:319` | **missing** |
| Mobile / Billing & POS (front desk) | `28:449` | **missing** |
| Mobile / Appointments (front desk) | `28:555` | **missing** |
| Mobile / Patients (front desk) | `28:666` | **missing** |
| Mobile / Patient messages (front desk) | `28:781` | **missing** |
| Mobile / Nurse Station (nurse) | `28:874` | **missing** |
| Mobile / Lab & Diagnostics (lab technician) | `28:986` | **missing** |
| Mobile / Reports (owner) | `30:670` | **missing** |
| Mobile / Doctors (clinic admin) | `30:775` | **missing** |
| Mobile / Locations (clinic admin) | `30:894` | **missing** |
| Mobile / Staff & roles — Roles & access (clinic admin) | `30:994` | **missing** |
| Mobile / Subscription (owner) | `30:1142` | **missing** |
| Mobile / Settings (owner) | `30:1275` | **missing** |

### 4b. Mobile landing and sign-up — 6 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Mobile / Landing page (visitor) | `31:991` | **missing** |
| Mobile / Clinic sign-up — step 1 of 5 | `31:1201` | **missing** |
| Mobile / Clinic sign-up — step 2 of 5 | `31:1232` | **missing** |
| Mobile / Clinic sign-up — step 3 of 5 | `31:1274` | **missing** |
| Mobile / Clinic sign-up — step 4 of 5 | `31:1312` | **missing** |
| Mobile / Clinic sign-up — step 5 of 5 | `31:1353` | **missing** |

### 4c. Patient phone flow — 16 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Patient phone / 1 Welcome | `33:1163` | **missing** |
| Patient phone / 2 Mobile number | `33:1217` | **missing** |
| Patient phone / 3 Code | `33:1263` | **missing** |
| Patient phone / 4 Patient | `33:1317` | **missing** |
| Patient phone / 5 Doctor | `33:1385` | **missing** |
| Patient phone / 6 Pay | `33:1460` | **missing** |
| Patient phone / 7 Checked in | `33:1532` | **missing** |
| Patient phone / Book 1 — Doctor & time | `54:1217` | **missing** |
| Patient phone / Book 2 — Your details | `54:1318` | **missing** |
| Patient phone / Book 3 — Confirmed | `54:1383` | **missing** |
| Patient phone / Manage booking | `54:1437` | **missing** |
| Patient phone / Live token | `54:1488` | **missing** |
| Patient phone / Symptoms form | `55:1287` | **missing** |
| Patient phone / Legal document | `55:1350` | **missing** |
| Patient phone / Verify prescription | `55:1393` | **missing** |
| Patient phone / Verify certificate | `55:1427` | **missing** |

### 4d. Patient-facing web surfaces — now built

These are the **desktop-width** patient pages (the Sub-pages page), not the phone versions above.
Figma defines these patient routes (`PRODUCT-SPEC.md:282-293`).

> **Correction (F4):** this section said the surfaces were "entirely absent". That was about
> *this app* — and it was true then. The **deployed MVP ships three of them** (`/book`,
> `/t/<token>`, `/intake/<token>`), which is where the markup and the API contract came from.
> The MVP ships no `/appt` and no public `/legal`.

| Figma frame | Node | Intended route | Status |
|---|---|---|---|
| Book online — 1 Doctor & time | `51:3069` | `/book?clinic=<slug>` | **built** — the doctor, the time, the details, the confirmation |
| Book online — 2 Your details | `51:3182` | same flow | **built** |
| Book online — 3 Confirmed | `51:3250` | same flow | **built** |
| Manage booking | `51:3315` | `/appt` | **missing** — the MVP ships no such page |
| Live token | `51:3376` | `/t/<token>` | **built** |
| Symptoms form | `51:3424` | `/intake/<token>` | **built** — the symptoms, the red flags, the patient's own words |
| Legal document | `51:3494` | `/legal` | **missing** (only a staff-gated placeholder at `/legal/:document`) |
| Verify prescription (public) | `37:739` | `/verify/rx_<id>?h=<hash>` | **built** — genuine and unchanged, the doctor, the patient, each medicine |
| Verify certificate (public) | `37:773` | — | **missing** |

The `/legal/:document` route is inside `guard(...)`, so an anonymous patient following a legal link
is redirected to sign-in rather than shown the document.

## 5. Dialogs — 30 designed, 12 built

The `Dialog` and `Drawer` primitives landed in F1, on the stylesheet's own `.scrim` and `.modal`.
Every overlay below is one of them.

| Figma dialog | Node (Sub-pages) | Node (Prototype) | Where it lives | Status |
|---|---|---|---|---|
| Dialog — Check in a patient | `39:501` | `58:9259` | queue, reception | built (shared, `components/ui`) |
| Dialog — Book a visit | `39:571` | `58:9294` | appointments, reception | **built (F2)** |
| Dialog — Check out | `39:651` | `58:9347` | reception | **built (F2)** |
| Dialog — New bill | `39:715` | `58:9382` | billing | **built (F2)** |
| Dialog — Refund | `39:771` | `58:9418` | billing | **built (F2)** |
| Dialog — Close the day | `39:813` | `58:9441` | billing | **built (F2)** |
| Dialog — Add someone | `41:1541` | `58:9482` | staff & roles | missing |
| Dialog — Edit member | `41:1595` | `58:9517` | staff & roles | missing |
| Dialog — Person access | `41:1649` | `58:9554` | staff & roles | missing |
| Dialog — New profile | `41:1725` | `58:9617` | staff & roles | missing |
| Dialog — Add a doctor | `41:1768` | `58:9649` | doctors | missing |
| Dialog — Hours & leave | `41:1835` | `58:9680` | doctors | missing |
| Dialog — Add a branch | `41:1906` | `58:9727` | locations | missing |
| Dialog — Write a certificate | `45:2926` | `58:9788` | certificate | built (F1) |
| Dialog — Safety check before signing | `45:2988` | `58:9816` | doctor console | built (F1) |
| Dialog — Send to a pharmacy | `45:3028` | `58:9841` | doctor console | built (F1) |
| Dialog — Add a lab result | `45:3082` | `58:9877` | lab | built (F1) |
| Dialog — Refer to a colleague | `45:3136` | `58:9901` | doctor console | built (F1) |
| Dialog — Template editor | `45:3179` | `58:9924` | templates | built (F1) |
| Dialog — Add a pharmacy | `45:3242` | `58:9959` | settings | missing |
| Dialog — Checkout | `45:3289` | `58:9980` | subscription | **built (F2)** |
| Dialog — Enterprise enquiry | `45:3324` | `58:10006` | subscription | **built (F2)** |
| Dialog — My account | `58:3661` | `58:10026` | sidebar footer | missing |
| Dialog — Edit doctor | `58:3710` | `58:10057` | doctors | missing |
| Dialog — Edit branch | `58:3770` | `58:10083` | locations | missing |
| Dialog — Send a message | `58:3813` | `58:10103` | patient messages | built (F1) |
| Dialog — Share booking link | `58:3858` | `58:10124` | reception | **built (F2)** |
| Dialog — Call the patient | `58:3946` | `58:10202` | patient messages | built (F1) |
| Dialog — Connect payments | `58:3971` | `58:10217` | settings | **built (F2)** |
| Drawer — Patient history | `45:2882` | `58:9749` | doctor console | built (F1) |

29 dialogs + 1 drawer. Each appears twice in the file — once on Sub-pages, once on Prototype — with
the same name and the same content.

### Settings — 1 of 6 tabs built

| Figma | Node | Status |
|---|---|---|
| Settings — clinic & letterhead | `22:3701` | **built (F2)** — the clinic's details and its payment keys |
| Settings — My PIN & device | `43:1942` | **missing** |
| Settings — Letterhead | `43:2193` | **missing** |
| Settings — Pharmacies | `43:2454` | **missing** |
| Settings — Agreements | `43:2708` | **missing** |
| Settings — Readiness check | `43:2952` | **missing** |

### Other missing sub-pages

| Figma | Node | Status |
|---|---|---|
| Kiosk — open on this device (staff) | `40:1190` | **missing** |
| Kiosk — welcome (tablet) | `40:1399` | **missing** |
| Kiosk — token (tablet) | `40:1500` | **missing** |
| Kiosk — close (staff PIN) | `40:1596` | **missing** |
| Kiosk — code (tablet) | `58:4013` | **missing** |
| Kiosk — patient (tablet) | `58:4050` | **missing** |
| Kiosk — doctor (tablet) | `58:4092` | **missing** |
| Kiosk — pay (tablet) | `58:4149` | **missing** |
| Lab tube label — 50×25 mm | `40:1652` | **missing** |
| Staff & roles — Team tab | `41:991` | **missing** |
| Staff & roles — Activity log tab | `41:1267` | **missing** |
| Billing — receipt (bill page) | `40:631` | **built (F2)** — `/billing/receipt/:invoiceId` |
| Appointments — week view | `40:869` | **built (F2)** — the week tab of `/schedule` |
| Subscription — payment successful | `58:3463` | **missing** |
| Dashboard — new clinic welcome & setup guide | `58:3190` | **missing** |
| Doctor Console — queue (sub-page) | `36:195` | built (`/queue`) |
| Doctor Console — after signing | `36:582` | built |
| Clinic sign-up — intro | `36:157` | built |
| Sign in — mobile | `36:5` | built (`/login`) |
| Sign in — code | `36:54` | built (`/login`) |
| Lock screen (PIN) | `36:112` | built (`/lock`) |
| Prescription — A4 print | `37:492` | built (`/rx/:id`) |
| Medical certificate — A4 print | `37:642` | built (`/certificate`) |
| Reports — Bookings & waiting | `42:1402` | built (`/reports` tab 2) |
| Reports — Clinical (doctors only) | `42:1710` | built (`/reports` tab 3) |
| Reports — Consult list | `42:2017` | built (`/reports` tab 4) |

## 6. What to build next, in order

Ordered by how much of the product each unblocks, not by effort.

1. ~~**Dialog primitive + the doctor-console safety checks.**~~ **done (F1).**
2. ~~**The reception, billing and appointments** (F2).~~ **done.**
3. ~~**The nurse station, the lab and the kiosk** (F3).~~ **done.**
4. ~~**The patient-facing web surfaces** — `/book`, `/appt`, `/t`, `/intake`, `/verify/*`.~~ **done.**
   The four surfaces the MVP actually ships are built: the **booking page** (`/book?clinic=<slug>` —
   the doctor, the time, the patient's details and the confirmation), the **live token**
   (`/t/<token>` — the place in the queue, the room, who to see and what to pay), the **symptoms
   form** (`/intake/<token>` — the symptoms, the red flags and the patient's own words) and the
   **verification** (`/verify/rx_<id>?h=<hash>` — that the prescription is genuine and unchanged).
   All four sit outside the session guard: a patient at the clinic's front door is not staff.
   The sign-up flow's booking link, which pointed at a 404, now resolves.
   `GET /api/public/doctors`, `POST /api/public/booking`, `GET|POST /api/intake/{token}`,
   `GET /api/token/{token}`, `GET /api/verify/{id}`.
5. **Make the sign-up flow real** — a `POST /api/clinic` that creates the clinic, a real HPR lookup,
   and an OTP that reaches the phone. Today it navigates to a dashboard for a clinic that was never
   created.
6. **Split `/patients` into list + record** and render the list screen.
7. **Restore the Dashboard "Open a doctor's console" section**, and add `doctors` to the Spring
   `DashboardController` response.
8. **Fix the Reports busiest-hours chart** to the horizontal tracked bars Figma draws, and split
   the wait-by-doctor panel out of the shared `Bars` component.
9. **Build the mobile shell** — `MobileHeader` and `MobileTabBar` already exist; they need a
   bottom tab bar and a route to serve.
10. **Work through the 5 placeholders** (F4): staff & roles, messages, doctors, locations, and the
    settings tabs that are still placeholders.

## 7. Correction to `PRODUCT-SPEC.md`

`PRODUCT-SPEC.md:443-448` claims the Figma↔app gaps are only: no mobile staff build, kiosk tablet
steps desktop-only, and the prototype page duplicating the dialogs. That was written when the Figma
file was unreadable. Now that it is readable, the real gaps are larger:

- The **patient-facing web** (`/book`, `/appt`, `/t`, `/intake`, `/verify/*`) is **entirely absent** —
  not a mobile-build gap, a whole-surface gap. The spec's own §4 table lists these as if they exist.
- **All 30 dialogs and drawers are missing** — there is no dialog primitive at all.
- **Two Figma desktop screens are conflated into one route** (`21:2670` list vs `21:2977` record).
- The **Reports busiest-hours heat map** promised at `PRODUCT-SPEC.md:206` is not a heat map in
  either Figma or the code — Figma draws tracked horizontal bars, the code draws vertical columns.
- The **Dashboard "Open a doctor's console"** section is missing from the code *and* the Spring API.
- `PRODUCT-SPEC.md:460-468` undercounts the file: Mobile has **41** frames (not 40), Sub-pages & dialogs
  has **70** (not 40), and Prototype has **96** (not 40). The file's own cover text says
  *"26 desktop screens · 41 phone screens · 70 sub-pages, dialogs and printouts"* — the doc's table is
  wrong, the cover is right.

## 8. Verification

Run against the working tree at the time of the audit:

- TypeScript (`tsc --noEmit`): **clean**
- Vitest: **26/26 passing**
- ESLint: **clean** (from the previous run)
- Production build with `VITE_USE_MOCK=false`: **successful** (from the previous run)
- Fidelity: **138 properties, 0 drift** (from the previous run)
- Maven: **4/4 passing** (from the previous run)

## 9. The routes against the real backend

**This section measures the running product, not the Figma file.** It is the
number the work is measured by: how many of the app's routes render real content
when the app talks to the Java service and Postgres, instead of the local mock.

> **Pre-merge baseline — measured on `main` @ `1d3d0292`**, the tree before the
> backend and frontend fixes land. `main` carries neither the frontend's
> error-sanitising client nor the backend's new endpoints, so the 404s and the
> raw "No static resource …" text below are the *old* behaviour. The same matrix
> is re-run on the merged branch; the after-numbers are in the pull request.

Method: `e2e/` (Playwright) against Postgres + the Spring Boot service + the Vite
app with `VITE_USE_MOCK=false`, signed in with the demo clinic's owner.

| Route | HTTP | What the screen shows |
|---|---|---|
| `/dashboard` | 200 | **real content** — "3 in your queue · 2 awaiting vitals · 1 prescription to hand over" |
| `/queue` | 200 | **real content** — "General Medicine · 3 waiting · 0 seen today" |
| `/billing` | 200 | **real content** — "Collected today ₹0 · 0 pending · 0 refund" |
| `/schedule` | 200 | **real content** — the day grid, "Wednesday, 25 Nov 2026" |
| `/nurse` | 200 | **real content** — "3 Need vitals · 1 Urgent" |
| `/lab` | 200 | **real content** — "0 To collect" |
| `/subscription` | 200 | **real content** — "Clinic · active", the usage counters |
| `/reports` | 200 | **real content** — four tabs, the KPIs, the doctor list |
| `/settings` | 200 | **real content** — the settings tabs |
| `/desk` | 200 | **stuck on "Loading the desk…"** — the service answers `items`, the screen reads `visits` |
| `/patients` | **404** | raw **"No static resource api/clinic/patients/pt_kavya."** in the screen |
| `/kiosk` | **404** | raw backend error in the screen — there is no kiosk endpoint at all |
| `/inbox` | **404** | raw **"No static resource api/clinic/inbox"** in the screen |
| `/teleconsult` | **404** | raw backend error in the screen |
| `/templates` | **404** | raw backend error in the screen |

**The baseline to move: of the 13 core staff routes, 7 render real content, 1 is
stuck in a loading state, and 5 answer 404 with a raw backend error in the
screen.** (`/reports` and `/settings` are outside that set and already render
content.) `visits` is the canonical name for the desk rows — the mock called it
that and the screen reads it; `items` may stay as an alias.

## 10. The baselines

| Set | Routes | Where it comes from |
|---|---|---|
| `verify/baselines/figma/` | — (138 frames inventoried, exports still to come) | the Figma file, by hand |
| `verify/baselines/reference/` | **21 captured, 6 missing** | the deployed MVP, captured live |
| `verify/baselines/history/` | 26 route primaries + 84 shots | `git archive 647ea0e^ _research` |

The deployed MVP does **not** have six of the app's routes, and no image was
fabricated for them: `certificate`, `visit/:id`, `rx/:id`, `billing/receipt/:id`,
`lock` and `verify/:id`. The reference manifest records each one as `missing`.

The Figma file's frame inventory is recovered from this repository's own history
into `verify/baselines/figma/manifest.json` — 138 frames, each with its node id,
page, route and status. **The frames still have to be exported**: drop a PNG named
`<route>.png` at 1280×720, DPR 1 into `verify/baselines/figma/` and the same diff
runs against the design.

### The pixel diff, measured

`node verify/pixel-diff.mjs --baseline=reference`, the local app with the mock
off, against the deployed MVP's screens:

| Route | % differing | Route | % differing |
|---|---:|---|---:|
| patients | 6.98 | templates | 8.46 |
| nurse | 7.77 | queue | 8.63 |
| desk | 9.84 | settings | 9.24 |
| lab | 9.46 | dashboard | 10.75 |
| reports | 11.18 | subscription | 11.06 |
| schedule | 11.91 | billing | 12.93 |
| **kiosk** | **26.60** | **landing** | **28.11** |

The last two are over budget **on purpose**: there is no kiosk endpoint on the
backend at all, and the local landing page is a different implementation of the
deployed one.

## 11. The manifest — a frame-by-frame status the harness can read

Machine-readable: one line per frame, `node | route | status | where`. The
status is **built** (the route exists and draws the frame's regions),
**partial** (the route exists but a named region is missing), **placeholder**
(the route says plainly it is not built) or **missing** (no route).

```
node          | route               | status    | where
12:1139       | /                   | built     | src/features/landing
13:1415..2562 | /start              | partial   | src/features/onboarding — no POST /api/auth/signup from the steps yet
20:2600       | /teleconsult        | built     | src/features/teleconsult
20:2854       | /inbox              | built     | src/features/inbox
21:2670       | /patients           | built     | src/features/patients (the list; built in F5)
21:2977       | /patients/:id       | built     | src/features/patients (the record)
17:1913       | /reports            | built     | src/features/reports (nine ranges)
15:1513       | /desk               | built     | src/features/desk (four tiles + the billing button)
15:1439       | /kiosk              | partial   | src/features/kiosk — the service's kiosk answers 500 (no clinic schema)
9:986         | /billing            | built     | src/features/billing
17:1592       | /schedule           | built     | src/features/schedule
9:701         | /nurse              | built     | src/features/nurse
20:2294       | /lab                | built     | src/features/lab
18:1895       | /subscription       | built     | src/features/subscription (doctors, locations, staff)
22:3956       | /templates          | built     | src/features/templates (Mine | From colleagues)
22:3701       | /settings           | built     | src/features/settings
22:3106       | /doctors            | built     | src/features/doctors
10:942        | /staff              | built     | src/features/staff
22:3422       | /locations          | built     | src/features/locations
21:3256       | /messages           | built     | src/features/messages
7:480         | /visit/:id          | built     | src/features/consult (the safety checks)
6:2           | /dashboard          | partial   | src/features/dashboard — the doctor's console section is not built
36:195        | /queue              | built     | src/features/queue
36:582        | /visit/:id          | built     | src/features/consult (after signing)
37:492        | /rx/:id             | built     | src/features/prescription
37:642        | /certificate       | built     | src/features/certificate
42:1402       | /reports            | built     | src/features/reports (tab 2)
42:1710       | /reports            | built     | src/features/reports (tab 3)
42:2017       | /reports            | built     | src/features/reports (tab 4)
54:1217..1488 | /book /t /intake    | partial   | src/features/patient-web — /appt is not built
45:3069..3494 | /book /appt /t      | partial   | src/features/patient-web
51:3069..3494 | /book /appt /t      | partial   | src/features/patient-web
40:1190..1596 | /kiosk              | partial   | src/features/kiosk — the staff PIN screens are not built
58:4013..4149 | /kiosk              | built     | src/features/kiosk (the five steps)
39:501..9813  | overlays            | built     | src/components/ui/Dialog.tsx + the eight F1 overlays
41:991..1267  | /staff              | built     | src/features/staff (Team | Activity log)
30:670..1275  | mobile frames       | missing   | held for the second wave
33:1163..1553 | patient phone       | missing   | held for the second wave
24:3..1275    | mobile staff        | missing   | held for the second wave
```

The screens the design has and the app still does not: the **41 mobile
frames** (held for the second wave), **`/appt`** (manage booking), the
**kiosk's staff PIN screens**, and the **billing, schedule and queue tab sets**
the reference shows — the billing tabs (Today / All / To collect / Paid /
Refunded), the schedule's multi-day strip and the queue's six tabs are the
reference's, and the app's own tabs still differ.
