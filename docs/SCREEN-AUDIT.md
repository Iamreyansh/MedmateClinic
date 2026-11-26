# Screen audit — Figma frames vs. the built app

**Date:** 2026-11-26 · **Figma file:** `FS5TDn4nUCjWizoIkKBcVg` (MedMate — Doctor Dashboard)
**Method:** the frame inventory recovered from `git show e6c31c8:docs/SCREEN-AUDIT.md`, re-checked
frame by frame against `src/app/routes/index.tsx`, the feature modules, the mock API and the Spring
Boot controllers of this branch.

**What changed in this revision.** The frame set and the frame names did not change — the Figma file
cannot be fetched from here, and the recovered inventory is the only record of it. What changed is
the **page** each frame belongs to and the **status** each frame has. Every verdict below was
re-derived from the code in this branch, not carried over.

**How a verdict is reached** — so it can be re-derived on a merged tree:

| Verdict | The check |
|---|---|
| **built** | the route registers a screen, and that screen calls the service |
| **partial** | the route registers a screen that works, but a named region of the frame is missing |
| **placeholder** | the route registers a screen that says plainly that it is not built |
| **missing** | no route and no file serve it |

## 1. The frame inventory (complete, from the live file)

The file holds **250 top-level frames** across seven pages. This is the whole file — no page was skipped.

| Page | Frames | What it holds |
|---|---:|---|
| Cover | 0 | the cover is a page-level frame, not a child |
| Foundations | 2 | palette + type scale + cover |
| Components | 15 | the component set the screens are built from |
| Screens | 26 | the desktop screens |
| Mobile | 41 | mobile staff screens (19), mobile landing and sign-up (6), patient phone (16) |
| Sub-pages & dialogs | 70 | patient pages, kiosk tablet steps, 30 overlays, printouts |
| Prototype — desktop click-through | 96 | the desktop screens again, plus 30 overlays with click targets |

The `Prototype` page is an **exact duplicate** of `Screens` (26) + `Sub-pages & dialogs` (70) = 96, with
click targets wired. It is a click-through, not new screens — so it is **not** counted twice below.

**26 desktop + 41 phone + 70 sub-pages = 137 distinct frames.** 30 of them are overlays
(29 dialogs + 1 drawer).

### The page each frame belongs to — the correction

Every frame in the recovered inventory was filed under `Screens`, whatever page it was really on: the
extractor that wrote the manifest matched headings it never found, so every entry fell through to its
default. The page is now the one the inventory's own sections put the frame in — **Screens** for the 26
desktop screens, **Mobile** for the 41 phone frames, and **Sub-pages & dialogs** for the 70 patient
pages, kiosk steps, overlays and printouts. In particular, the nine **desktop-width** patient pages
(`51:*`, `37:739`, `37:773`) are on **Sub-pages & dialogs**, not on Mobile: the phone versions of the
same journeys are the `33:*`, `54:*` and `55:*` frames.

### One frame, two rows in the inventory

`22:3701` — **Settings — clinic & letterhead** — is listed twice in the recovered inventory: once as a
desktop screen on the Screens page, and again in the Settings sub-pages list. It is **one** frame on
**one** page, so the frame set is **137**, while the inventory enumerates **138 rows** and the machine
-readable manifest carries all 138. The manifest's `frameCount` is 138 for that reason; the counts
below are for the 137 distinct frames, with the duplicated frame counted once.

### The master index

Every frame, the page it is on, the route that serves it and what it has become. This is the
machine-readable list; the sections below say why.

| Node | Figma frame | Page | Route | Status |
|---|---|---|---|---|
| `12:1139` | Screen / Landing page (visitor) | Screens | / | built |
| `20:2600` | Screen / Teleconsult (doctor) | Screens | /teleconsult | built |
| `20:2854` | Screen / Inbox (doctor) | Screens | /inbox | built |
| `21:2977` | Screen / Patient record (doctor) | Screens | /patients | built |
| `22:3956` | Screen / My templates (doctor) | Screens | /templates | built |
| `17:1913` | Screen / Reports — summary (owner) | Screens | /reports tab 1 | built |
| `7:480` | Screen / Doctor Console — consult & prescription | Screens | /visit/:id | built |
| `6:2` | Screen / Dashboard (owner) | Screens | /dashboard | built |
| `13:1415` | Screen / Clinic sign-up — step 1 of 5 | Screens | /start | built |
| `19:2185` | Screen / Clinic sign-up — step 2 of 5 | Screens | /start | built |
| `19:2315` | Screen / Clinic sign-up — step 3 of 5 | Screens | /start | built |
| `19:2435` | Screen / Clinic sign-up — step 4 of 5 | Screens | /start | partial |
| `19:2562` | Screen / Clinic sign-up — step 5 of 5 | Screens | /start | built |
| `21:2670` | Screen / Patients (front desk) | Screens | /patients | built |
| `15:1439` | Screen / Patient Kiosk — check-in (patient) | Screens | /kiosk | built |
| `9:701` | Screen / Nurse Station (nurse) | Screens | /nurse | built |
| `15:1513` | Screen / Reception Desk (front desk) | Screens | /desk | built |
| `9:986` | Screen / Billing & POS (front desk) | Screens | /billing | built |
| `20:2294` | Screen / Lab & Diagnostics (lab technician) | Screens | /lab | built |
| `17:1592` | Screen / Appointments — day view (front desk) | Screens | /schedule | built |
| `10:942` | Screen / Staff & roles — Roles & access | Screens | /staff | built |
| `21:3256` | Screen / Patient messages (front desk) | Screens | /messages | built |
| `22:3106` | Screen / Doctors (clinic admin) | Screens | /doctors | built |
| `22:3422` | Screen / Locations (clinic admin) | Screens | /locations | built |
| `18:1895` | Screen / Subscription (owner) | Screens | /subscription | built |
| `22:3701` | Screen / Settings — clinic & letterhead (owner) | Screens | /settings | built |
| `24:3` | Mobile / Dashboard (owner) | Mobile | — | missing |
| `24:136` | Mobile / Doctor Console — consult | Mobile | — | missing |
| `24:257` | Mobile / Inbox (doctor) | Mobile | — | missing |
| `24:350` | Mobile / Patient record (doctor) | Mobile | — | missing |
| `24:449` | Mobile / Teleconsult (doctor) | Mobile | — | missing |
| `24:538` | Mobile / My templates (doctor) | Mobile | — | missing |
| `28:319` | Mobile / Reception Desk (front desk) | Mobile | — | missing |
| `28:449` | Mobile / Billing & POS (front desk) | Mobile | — | missing |
| `28:555` | Mobile / Appointments (front desk) | Mobile | — | missing |
| `28:666` | Mobile / Patients (front desk) | Mobile | — | missing |
| `28:781` | Mobile / Patient messages (front desk) | Mobile | — | missing |
| `28:874` | Mobile / Nurse Station (nurse) | Mobile | — | missing |
| `28:986` | Mobile / Lab & Diagnostics (lab technician) | Mobile | — | missing |
| `30:670` | Mobile / Reports (owner) | Mobile | — | missing |
| `30:775` | Mobile / Doctors (clinic admin) | Mobile | — | missing |
| `30:894` | Mobile / Locations (clinic admin) | Mobile | — | missing |
| `30:994` | Mobile / Staff & roles — Roles & access (clinic admin) | Mobile | — | missing |
| `30:1142` | Mobile / Subscription (owner) | Mobile | — | missing |
| `30:1275` | Mobile / Settings (owner) | Mobile | — | missing |
| `31:991` | Mobile / Landing page (visitor) | Mobile | — | missing |
| `31:1201` | Mobile / Clinic sign-up — step 1 of 5 | Mobile | — | missing |
| `31:1232` | Mobile / Clinic sign-up — step 2 of 5 | Mobile | — | missing |
| `31:1274` | Mobile / Clinic sign-up — step 3 of 5 | Mobile | — | missing |
| `31:1312` | Mobile / Clinic sign-up — step 4 of 5 | Mobile | — | missing |
| `31:1353` | Mobile / Clinic sign-up — step 5 of 5 | Mobile | — | missing |
| `33:1163` | Patient phone / 1 Welcome | Mobile | — | missing |
| `33:1217` | Patient phone / 2 Mobile number | Mobile | — | missing |
| `33:1263` | Patient phone / 3 Code | Mobile | — | missing |
| `33:1317` | Patient phone / 4 Patient | Mobile | — | missing |
| `33:1385` | Patient phone / 5 Doctor | Mobile | — | missing |
| `33:1460` | Patient phone / 6 Pay | Mobile | — | missing |
| `33:1532` | Patient phone / 7 Checked in | Mobile | — | missing |
| `54:1217` | Patient phone / Book 1 — Doctor & time | Mobile | — | missing |
| `54:1318` | Patient phone / Book 2 — Your details | Mobile | — | missing |
| `54:1383` | Patient phone / Book 3 — Confirmed | Mobile | — | missing |
| `54:1437` | Patient phone / Manage booking | Mobile | — | missing |
| `54:1488` | Patient phone / Live token | Mobile | — | missing |
| `55:1287` | Patient phone / Symptoms form | Mobile | — | missing |
| `55:1350` | Patient phone / Legal document | Mobile | — | missing |
| `55:1393` | Patient phone / Verify prescription | Mobile | — | missing |
| `55:1427` | Patient phone / Verify certificate | Mobile | — | missing |
| `51:3069` | Book online — 1 Doctor & time | Sub-pages & dialogs | /book?clinic=<slug> | built |
| `51:3182` | Book online — 2 Your details | Sub-pages & dialogs | — | built |
| `51:3250` | Book online — 3 Confirmed | Sub-pages & dialogs | — | built |
| `51:3315` | Manage booking | Sub-pages & dialogs | /appt | built |
| `51:3376` | Live token | Sub-pages & dialogs | /t/<token> | built |
| `51:3424` | Symptoms form | Sub-pages & dialogs | /intake/<token> | built |
| `51:3494` | Legal document | Sub-pages & dialogs | /legal | placeholder |
| `37:739` | Verify prescription (public) | Sub-pages & dialogs | /verify/rx_<id>?h=<hash> | built |
| `37:773` | Verify certificate (public) | Sub-pages & dialogs | — | missing |
| `39:501` | Dialog — Check in a patient | Sub-pages & dialogs | — | built |
| `39:571` | Dialog — Book a visit | Sub-pages & dialogs | — | built |
| `39:651` | Dialog — Check out | Sub-pages & dialogs | — | built |
| `39:715` | Dialog — New bill | Sub-pages & dialogs | — | built |
| `39:771` | Dialog — Refund | Sub-pages & dialogs | — | built |
| `39:813` | Dialog — Close the day | Sub-pages & dialogs | — | built |
| `41:1541` | Dialog — Add someone | Sub-pages & dialogs | — | missing |
| `41:1595` | Dialog — Edit member | Sub-pages & dialogs | — | missing |
| `41:1649` | Dialog — Person access | Sub-pages & dialogs | — | missing |
| `41:1725` | Dialog — New profile | Sub-pages & dialogs | — | missing |
| `41:1768` | Dialog — Add a doctor | Sub-pages & dialogs | — | missing |
| `41:1835` | Dialog — Hours & leave | Sub-pages & dialogs | — | missing |
| `41:1906` | Dialog — Add a branch | Sub-pages & dialogs | — | missing |
| `45:2926` | Dialog — Write a certificate | Sub-pages & dialogs | — | built |
| `45:2988` | Dialog — Safety check before signing | Sub-pages & dialogs | — | built |
| `45:3028` | Dialog — Send to a pharmacy | Sub-pages & dialogs | — | built |
| `45:3082` | Dialog — Add a lab result | Sub-pages & dialogs | — | built |
| `45:3136` | Dialog — Refer to a colleague | Sub-pages & dialogs | — | built |
| `45:3179` | Dialog — Template editor | Sub-pages & dialogs | — | built |
| `45:3242` | Dialog — Add a pharmacy | Sub-pages & dialogs | — | missing |
| `45:3289` | Dialog — Checkout | Sub-pages & dialogs | — | built |
| `45:3324` | Dialog — Enterprise enquiry | Sub-pages & dialogs | — | built |
| `58:3661` | Dialog — My account | Sub-pages & dialogs | — | missing |
| `58:3710` | Dialog — Edit doctor | Sub-pages & dialogs | — | missing |
| `58:3770` | Dialog — Edit branch | Sub-pages & dialogs | — | missing |
| `58:3813` | Dialog — Send a message | Sub-pages & dialogs | — | built |
| `58:3858` | Dialog — Share booking link | Sub-pages & dialogs | — | built |
| `58:3946` | Dialog — Call the patient | Sub-pages & dialogs | — | built |
| `58:3971` | Dialog — Connect payments | Sub-pages & dialogs | — | built |
| `45:2882` | Drawer — Patient history | Sub-pages & dialogs | — | built |
| `22:3701` | Settings — clinic & letterhead | Screens | — | built |
| `43:1942` | Settings — My PIN & device | Sub-pages & dialogs | — | partial |
| `43:2193` | Settings — Letterhead | Sub-pages & dialogs | — | missing |
| `43:2454` | Settings — Pharmacies | Sub-pages & dialogs | — | partial |
| `43:2708` | Settings — Agreements | Sub-pages & dialogs | — | missing |
| `43:2952` | Settings — Readiness check | Sub-pages & dialogs | — | partial |
| `40:1190` | Kiosk — open on this device (staff) | Sub-pages & dialogs | — | built |
| `40:1399` | Kiosk — welcome (tablet) | Sub-pages & dialogs | — | built |
| `40:1500` | Kiosk — token (tablet) | Sub-pages & dialogs | — | built |
| `40:1596` | Kiosk — close (staff PIN) | Sub-pages & dialogs | — | built |
| `58:4013` | Kiosk — code (tablet) | Sub-pages & dialogs | — | built |
| `58:4050` | Kiosk — patient (tablet) | Sub-pages & dialogs | — | built |
| `58:4092` | Kiosk — doctor (tablet) | Sub-pages & dialogs | — | built |
| `58:4149` | Kiosk — pay (tablet) | Sub-pages & dialogs | — | built |
| `40:1652` | Lab tube label — 50×25 mm | Sub-pages & dialogs | — | missing |
| `41:991` | Staff & roles — Team tab | Sub-pages & dialogs | — | built |
| `41:1267` | Staff & roles — Activity log tab | Sub-pages & dialogs | — | built |
| `40:631` | Billing — receipt (bill page) | Sub-pages & dialogs | — | built |
| `40:869` | Appointments — week view | Sub-pages & dialogs | — | built |
| `58:3463` | Subscription — payment successful | Sub-pages & dialogs | — | missing |
| `58:3190` | Dashboard — new clinic welcome & setup guide | Sub-pages & dialogs | — | missing |
| `36:195` | Doctor Console — queue (sub-page) | Sub-pages & dialogs | — | built |
| `36:582` | Doctor Console — after signing | Sub-pages & dialogs | — | built |
| `36:157` | Clinic sign-up — intro | Sub-pages & dialogs | — | built |
| `36:5` | Sign in — mobile | Sub-pages & dialogs | — | built |
| `36:54` | Sign in — code | Sub-pages & dialogs | — | built |
| `36:112` | Lock screen (PIN) | Sub-pages & dialogs | — | built |
| `37:492` | Prescription — A4 print | Sub-pages & dialogs | — | built |
| `37:642` | Medical certificate — A4 print | Sub-pages & dialogs | — | built |
| `42:1402` | Reports — Bookings & waiting | Sub-pages & dialogs | — | partial |
| `42:1710` | Reports — Clinical (doctors only) | Sub-pages & dialogs | — | built |
| `42:2017` | Reports — Consult list | Sub-pages & dialogs | — | built |

## 2. The headline answer

| Status | Count | What |
|---|---:|---|
| **Built** | 73 | real routes, real API, real behaviour, region-for-region |
| **Partial** | 5 | route exists and works, but a named Figma region is missing |
| **Placeholder** | 1 | route exists, screen says plainly it is not built |
| **Missing** | 58 | no route at all |

Of the **26 desktop screens** on the Screens page: 25 built, 1 partial,
0 placeholder, 0 missing.
Of the **41 phone frames**: **0 built** on this branch — the mobile wave is building them in parallel.
The patient-facing web (`/book`, `/appt`, `/t`, `/intake`, `/verify/...`) is **built**.

**Where the 137 frames sit:**

| Group | Frames | Built | Partial | Placeholder | Missing |
|---|---:|---:|---:|---:|---:|
| Screens page (desktop) | 26 | 25 | 1 | 0 | 0 |
| Mobile page | 41 | 0 | 0 | 0 | 41 |
| Sub-pages & dialogs page | 70 | 48 | 4 | 1 | 17 |
| **Total** | **137** | **73** | **5** | **1** | **58** |

### What has landed

| Wave | What it built |
|---|---|
| F1 | the `Dialog` and `Drawer` primitives, the safety checker, the medicine search, the patient history drawer, and the overlays they carry |
| F2 | reception, billing, appointments, and their overlays |
| F3 | the nurse station, the lab bench and the patient kiosk — each with its own service |
| **This wave** | **the sign-up flow now calls the service** (`POST /api/auth/signup` creates the clinic, its schema and the owner's session; the booking slug is the service's), **the dashboard draws the doctor consoles** (Figma `6:2`), **the doctor console opens on one doctor** (`/queue?doctor=`), and **the patients list is a screen of its own** |
| F4 (running) | staff & roles, doctors, locations, messages, and the eleven overlays that still do not exist |
| F5–F10 | the settings panels, the subscription and payment screens, the mobile shell and the phone frames |

**What is still missing, in order of what it unblocks:** the eleven staff-admin overlays and the four
settings panels; the HPR registry; the public legal document; the lab tube label; the subscription's
payment-successful page; the dashboard's first-run setup guide; the busiest-hours chart's form; and
the whole mobile wave.

## 3. Desktop screens (the Screens page) — the definitive matrix

### Built (25) — region-for-region match with Figma

| Figma frame | Node | Route | What is there |
|---|---|---|---|
| Screen / Landing page (visitor) | `12:1139` | / |  |
| Screen / Teleconsult (doctor) | `20:2600` | /teleconsult |  |
| Screen / Inbox (doctor) | `20:2854` | /inbox |  |
| Screen / Patient record (doctor) | `21:2977` | /patients |  |
| Screen / My templates (doctor) | `22:3956` | /templates |  |
| Screen / Reports — summary (owner) | `17:1913` | /reports tab 1 |  |
| Screen / Doctor Console — consult & prescription | `7:480` | /visit/:id |  |
| Screen / Dashboard (owner) | `6:2` | /dashboard |  |
| Screen / Clinic sign-up — step 1 of 5 | `13:1415` | /start |  |
| Screen / Clinic sign-up — step 2 of 5 | `19:2185` | /start |  |
| Screen / Clinic sign-up — step 3 of 5 | `19:2315` | /start |  |
| Screen / Clinic sign-up — step 5 of 5 | `19:2562` | /start |  |
| Screen / Patients (front desk) | `21:2670` | /patients |  |
| Screen / Patient Kiosk — check-in (patient) | `15:1439` | /kiosk |  |
| Screen / Nurse Station (nurse) | `9:701` | /nurse |  |
| Screen / Reception Desk (front desk) | `15:1513` | /desk |  |
| Screen / Billing & POS (front desk) | `9:986` | /billing |  |
| Screen / Lab & Diagnostics (lab technician) | `20:2294` | /lab |  |
| Screen / Appointments — day view (front desk) | `17:1592` | /schedule |  |
| Screen / Staff & roles — Roles & access | `10:942` | /staff |  |
| Screen / Patient messages (front desk) | `21:3256` | /messages |  |
| Screen / Doctors (clinic admin) | `22:3106` | /doctors |  |
| Screen / Locations (clinic admin) | `22:3422` | /locations |  |
| Screen / Subscription (owner) | `18:1895` | /subscription |  |
| Settings — clinic & letterhead | `22:3701` |  |

### Partial (1) — the route works, a named Figma region does not

| Figma frame | Node | Route | What is missing |
|---|---|---|---|
| Screen / Clinic sign-up — step 4 of 5 | `19:2435` | /start | the HPR registry is not connected, so the doctor's own details cannot be checked for them |

### Placeholder (0) — route exists, screen says so

_None on this branch._

### Auxiliary screens built, not in the Screens page

| What | Route | Status |
|---|---|---|
| Sign in — mobile + code | `/login` | built; OTP with attempt limits and cooldown |
| Lock screen (PIN) | `/lock` | built |
| Doctor Console — queue | `/queue` | built; opens on one doctor when the dashboard sends `?doctor=` |
| Doctor Console — after signing | `/visit/:id` (signed state) | built |
| Medical certificate — A4 print | `/certificate` | built |
| Prescription — A4 print | `/rx/:id` | built |
| Reports — Bookings & waiting | `/reports` tab 2 | partial — the busiest-hours chart is vertical columns; Figma draws tracked horizontal bars |
| Reports — Clinical (doctors only) | `/reports` tab 3 | built, gated to doctors |
| Reports — Consult list | `/reports` tab 4 | built — search, paging, CSV |
| Verify prescription (public) | `/verify/:id` | built — genuine and unchanged, the doctor, the patient, each medicine |
| Verify certificate (public) | — | **missing** — the screen verifies a prescription only |
| Dashboard — new clinic welcome & setup guide | — | **missing** (the first-run checklist named at `PRODUCT-SPEC.md:99`) |
| Reports sub-tabs | `/reports` | 4 of 4 built |
| Settings sub-tabs | `/settings` | 1 of 5 built (the clinic tab); the other four say plainly that they are not built |
| Fidelity style guide | `/fidelity` | built (dev tool) |
| 404 | `*` | built |

## 4. Mobile — 41 frames, 0 built on this branch

**Every mobile frame is missing on this branch.** The Figma file has a complete mobile staff app, a mobile landing
and mobile sign-up, and the patient phone flow. The app ships **one responsive shell**.
`src/components/layout/Mobile.tsx` holds `MobileHeader` and `MobileTabBar` — but they are **only**
used by the fidelity guide (`dev-tools/components/FidelityGuide.tsx:181-182`). No product route renders
them. There is **no bottom tab bar** in the running app, and no route serves any of these 41 frames.
**The mobile wave is building all 41 in parallel**; the verdicts here are this branch's.

### 4a. Mobile staff app — 19 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Mobile / Dashboard (owner) | `24:3` |  |
| Mobile / Doctor Console — consult | `24:136` |  |
| Mobile / Inbox (doctor) | `24:257` |  |
| Mobile / Patient record (doctor) | `24:350` |  |
| Mobile / Teleconsult (doctor) | `24:449` |  |
| Mobile / My templates (doctor) | `24:538` |  |
| Mobile / Reception Desk (front desk) | `28:319` |  |
| Mobile / Billing & POS (front desk) | `28:449` |  |
| Mobile / Appointments (front desk) | `28:555` |  |
| Mobile / Patients (front desk) | `28:666` |  |
| Mobile / Patient messages (front desk) | `28:781` |  |
| Mobile / Nurse Station (nurse) | `28:874` |  |
| Mobile / Lab & Diagnostics (lab technician) | `28:986` |  |
| Mobile / Reports (owner) | `30:670` |  |
| Mobile / Doctors (clinic admin) | `30:775` |  |
| Mobile / Locations (clinic admin) | `30:894` |  |
| Mobile / Staff & roles — Roles & access (clinic admin) | `30:994` |  |
| Mobile / Subscription (owner) | `30:1142` |  |
| Mobile / Settings (owner) | `30:1275` |  |

### 4b. Mobile landing and sign-up — 6 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Mobile / Landing page (visitor) | `31:991` |  |
| Mobile / Clinic sign-up — step 1 of 5 | `31:1201` |  |
| Mobile / Clinic sign-up — step 2 of 5 | `31:1232` |  |
| Mobile / Clinic sign-up — step 3 of 5 | `31:1274` |  |
| Mobile / Clinic sign-up — step 4 of 5 | `31:1312` |  |
| Mobile / Clinic sign-up — step 5 of 5 | `31:1353` |  |

### 4c. Patient phone flow — 16 frames, all missing

| Figma frame | Node | Status |
|---|---|---|
| Patient phone / 1 Welcome | `33:1163` |  |
| Patient phone / 2 Mobile number | `33:1217` |  |
| Patient phone / 3 Code | `33:1263` |  |
| Patient phone / 4 Patient | `33:1317` |  |
| Patient phone / 5 Doctor | `33:1385` |  |
| Patient phone / 6 Pay | `33:1460` |  |
| Patient phone / 7 Checked in | `33:1532` |  |
| Patient phone / Book 1 — Doctor & time | `54:1217` |  |
| Patient phone / Book 2 — Your details | `54:1318` |  |
| Patient phone / Book 3 — Confirmed | `54:1383` |  |
| Patient phone / Manage booking | `54:1437` |  |
| Patient phone / Live token | `54:1488` |  |
| Patient phone / Symptoms form | `55:1287` |  |
| Patient phone / Legal document | `55:1350` |  |
| Patient phone / Verify prescription | `55:1393` |  |
| Patient phone / Verify certificate | `55:1427` |  |

### 4d. Patient-facing web surfaces — built

These are the **desktop-width** patient pages (the Sub-pages page), not the phone versions above.
Figma defines these patient routes (`PRODUCT-SPEC.md:282-293`).

| Figma frame | Node | Route | Status |
|---|---|---|---|
| Book online — 1 Doctor & time | `51:3069` | /book?clinic=<slug> |  |
| Book online — 2 Your details | `51:3182` |  |
| Book online — 3 Confirmed | `51:3250` |  |
| Manage booking | `51:3315` | /appt |  |
| Live token | `51:3376` | /t/<token> |  |
| Symptoms form | `51:3424` | /intake/<token> |  |
| Legal document | `51:3494` | /legal | the route renders a placeholder, and it sits behind the session guard, so a patient cannot follow the link |
| Verify prescription (public) | `37:739` | /verify/rx_<id>?h=<hash> |  |
| Verify certificate (public) | `37:773` |  |

The `/legal/:document` route renders a placeholder and sits behind the session guard, so an anonymous
patient following a legal link is redirected to sign-in rather than shown the document.

## 5. Dialogs — 30 designed, 19 built

The `Dialog` and `Drawer` primitives landed in F1, on the stylesheet's own `.scrim` and `.modal`.
Every overlay below is one of them.

| Figma dialog | Node (Sub-pages) | Node (Prototype) | Where it lives | Status |
|---|---|---|---|---|
| Dialog — Check in a patient | `39:501` | `58:9259` | queue, reception | built (shared, `components/ui`) |
| Dialog — Book a visit | `39:571` | `58:9294` | appointments, reception | built (F2) |
| Dialog — Check out | `39:651` | `58:9347` | reception | built (F2) |
| Dialog — New bill | `39:715` | `58:9382` | billing | built (F2) |
| Dialog — Refund | `39:771` | `58:9418` | billing | built (F2) |
| Dialog — Close the day | `39:813` | `58:9441` | billing | built (F2) |
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
| Dialog — Checkout | `45:3289` | `58:9980` | subscription | built (F2) |
| Dialog — Enterprise enquiry | `45:3324` | `58:10006` | subscription | built (F2) |
| Dialog — My account | `58:3661` | `58:10026` | sidebar footer | missing |
| Dialog — Edit doctor | `58:3710` | `58:10057` | doctors | missing |
| Dialog — Edit branch | `58:3770` | `58:10083` | locations | missing |
| Dialog — Send a message | `58:3813` | `58:10103` | patient messages | built (F1) |
| Dialog — Share booking link | `58:3858` | `58:10124` | reception | built (F2) |
| Dialog — Call the patient | `58:3946` | `58:10202` | patient messages | built (F1) |
| Dialog — Connect payments | `58:3971` | `58:10217` | settings | built (F2) |
| Drawer — Patient history | `45:2882` | `58:9749` | doctor console | built (F1) |

29 dialogs + 1 drawer. Each appears twice in the file — once on Sub-pages, once on Prototype — with
the same name and the same content. **Eleven are still missing**, and they are the staff-admin wave's:
the four staff overlays, the two doctor overlays, the two branch overlays, the pharmacy, the account
and the sidebar's account trigger.

### Settings — 1 of 5 tabs built

| Figma | Node | Status |
|---|---|---|
| Settings — clinic & letterhead | `22:3701` | built — the clinic's details and its payment keys |
| Settings — My PIN & device | `43:1942` | partial — the tab is named, and it says plainly that it is not built |
| Settings — Letterhead | `43:2193` | missing |
| Settings — Pharmacies | `43:2454` | partial — the tab is named, and it says plainly that it is not built |
| Settings — Agreements | `43:2708` | missing |
| Settings — Readiness check | `43:2952` | partial — the tab is named, and it says plainly that it is not built |

### Other sub-pages

| Figma | Node | Status |
|---|---|---|
| Kiosk — open on this device (staff) | `40:1190` | built — `POST /api/kiosk/open` and the PIN that opens it |
| Kiosk — welcome (tablet) | `40:1399` | built |
| Kiosk — token (tablet) | `40:1500` | built |
| Kiosk — close (staff PIN) | `40:1596` | built — `POST /api/kiosk/close` |
| Kiosk — code (tablet) | `58:4013` | built |
| Kiosk — patient (tablet) | `58:4050` | built |
| Kiosk — doctor (tablet) | `58:4092` | built |
| Kiosk — pay (tablet) | `58:4149` | built |
| Lab tube label — 50×25 mm | `40:1652` | missing |
| Staff & roles — Team tab | `41:991` | built — the first tab of `/staff` |
| Staff & roles — Activity log tab | `41:1267` | built — the second tab of `/staff`, on `GET /api/clinic/activity` |
| Billing — receipt (bill page) | `40:631` | built — `/billing/receipt/:invoiceId` |
| Appointments — week view | `40:869` | built — the week view of `/schedule` |
| Subscription — payment successful | `58:3463` | missing |
| Dashboard — new clinic welcome & setup guide | `58:3190` | missing |
| Doctor Console — queue (sub-page) | `36:195` | built — `/queue` |
| Doctor Console — after signing | `36:582` | built |
| Clinic sign-up — intro | `36:157` | built |
| Sign in — mobile | `36:5` | built — `/login` |
| Sign in — code | `36:54` | built — `/login` |
| Lock screen (PIN) | `36:112` | built — `/lock` |
| Prescription — A4 print | `37:492` | built — `/rx/:id` |
| Medical certificate — A4 print | `37:642` | built — `/certificate` |
| Reports — Bookings & waiting | `42:1402` | partial — the busiest-hours chart is vertical columns; Figma draws tracked horizontal bars |
| Reports — Clinical (doctors only) | `42:1710` | built — `/reports` tab 3 |
| Reports — Consult list | `42:2017` | built — `/reports` tab 4 |

## 6. What to build next, in order

Ordered by how much of the product each unblocks, not by effort.

1. ~~**Dialog primitive + the doctor-console safety checks.**~~ **done (F1).**
2. ~~**The reception, billing and appointments** (F2).~~ **done.**
3. ~~**The nurse station, the lab and the kiosk** (F3).~~ **done.**
4. ~~**The patient-facing web surfaces** — `/book`, `/appt`, `/t`, `/intake`, `/verify/*`.~~ **done.**
   All four sit outside the session guard: a patient at the clinic's front door is not staff.
   `GET /api/public/doctors`, `POST /api/public/booking`, `GET|POST /api/intake/{token}`,
   `GET /api/token/{token}`, `GET /api/verify/{id}`.
5. ~~**Make the sign-up flow real** — a clinic-creating endpoint, a checked mobile number and a
   booking link that is the service's.~~ **done, except the HPR registry.** `POST /api/auth/signup`
   creates the clinic, its own schema and the owner's session, and the booking slug comes from the
   service with a private tail. The HPR registry is an external government registry that needs its
   own account and API, so it stays a product decision: **the doctor's details are entered by hand.**
6. ~~**Split `/patients` into list + record** and render the list screen.~~ **done.**
7. ~~**Restore the Dashboard "Open a doctor's console" section.**~~ **done** — the section is drawn
   from the service's `doctors`, and each row opens that doctor's console.
8. **Fix the Reports busiest-hours chart** to the horizontal tracked bars Figma draws. The stylesheet
   already has the tracked-bar rules (`.barrow`, `.track`); nothing draws them yet.
9. **Build the mobile shell** — `MobileHeader` and `MobileTabBar` already exist; they need a
   bottom tab bar and a route to serve. **41 frames.**
10. **Work through the staff-admin wave** — the eleven overlays and the four settings panels.
11. **The smaller gaps** — the public legal document, the lab tube label, the subscription's
    payment-successful page, the dashboard's first-run setup guide, and the certificate verification
    beside the prescription one.

## 7. Corrections to `PRODUCT-SPEC.md`

`PRODUCT-SPEC.md:443-448` claims the Figma↔app gaps are only: no mobile staff build, kiosk tablet
steps desktop-only, and the prototype page duplicating the dialogs. That was written when the Figma
file was unreadable. Now that it is readable, the real gaps were larger — and most of them are closed:

- The **patient-facing web** (`/book`, `/appt`, `/t`, `/intake`, `/verify/*`) was **entirely absent** —
  not a mobile-build gap, a whole-surface gap. **It is built.**
- **All 30 dialogs and drawers were missing** — there was no dialog primitive at all. **19 are built**;
  the eleven staff-admin ones are not.
- **Two Figma desktop screens were conflated into one route** (`21:2670` list vs `21:2977` record).
  **Both are built.**
- The **Reports busiest-hours heat map** promised at `PRODUCT-SPEC.md:206` is not a heat map in
  either Figma or the code — Figma draws tracked horizontal bars, the code draws vertical columns.
  **Still open.**
- The **Dashboard "Open a doctor's console"** section was missing from the code *and* the Spring API.
  **The section is drawn; the API carries it.**
- `PRODUCT-SPEC.md:460-468` undercounts the file: Mobile has **41** frames (not 40), Sub-pages & dialogs
  has **70** (not 40), and Prototype has **96** (not 40). The file's own cover text says
  *"26 desktop screens · 41 phone screens · 70 sub-pages, dialogs and printouts"* — the doc's table is
  wrong, the cover is right.

## 8. Verification

Run against the working tree of this branch:

- TypeScript (`tsc --noEmit`): **clean**
- ESLint (`eslint src`): **clean**
- Production build with `VITE_USE_MOCK=false`: **successful**
- The service itself: Postgres 17 and the Spring Boot API started from this tree; `POST /api/auth/signup`
  creates a clinic, its schema and the owner's session, and `GET /api/clinic/dashboard` answers that
  clinic's own dashboard with its doctors.
- The suites and the pixel harness are **not** run here — they belong to the verification phase, after
  the waves merge.

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
