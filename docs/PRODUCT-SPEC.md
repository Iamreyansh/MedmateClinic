# MedMate Doctor — Clinic App

Complete product spec, reconstructed from the Figma file **and** the live MVP.

- Figma file: `MedMate Doctor — Clinic App` — key `FS5TDn4nUCjWizoIkKBcVg` (public view, 7 pages, 163 frames)
- Live MVP: `https://medmate-doctor-clinic.netlify.app` — Next.js App Router, static export on Netlify, JSON API under `/api/*`
- Session: `mmd_session` cookie. Every API call is `fetch('/api' + path)`.
- The site runs in **test mode**: eSign, ABDM, SMS and UPI are simulated. A banner states this on every staff screen.

---

## 1. What the product is

A clinic operating system for Indian outpatient practices. It runs the whole patient journey from the
front door to the follow-up: walk-in check-in on a kiosk, nurse vitals, doctor consult and prescription,
reception hand-over, billing, lab, appointments, messaging, and the doctor's own inbox.

Two audiences, two front ends:

| Audience | Surface | Authentication |
|---|---|---|
| Clinic staff (doctor, nurse, front desk, lab, accounts, admin) | Web app, `/dashboard` onwards | Own mobile + one-time code, then a 4-digit PIN to unlock the screen |
| Patients | Mobile web — booking, live token, symptoms, prescription | Mobile + one-time code, or scan a QR |

The product is compliance-shaped rather than generic: every screen carries the regulation it satisfies
(DPDP Act 2023, IT Act 2000, Telemedicine Practice Guidelines 2020, IMC Regs 2002 6.4, DLT templates,
GST exemption on professional fees, Schedule X/NDPS handling, ABDM/ABHA, HPR registry).

### Product voice

Plain English, no jargon, one job per line. Every empty state explains what to do next
("No one is waiting here", "Build one for the conditions you treat most"). Never a generic
"Error occurred".

---

## 2. Information architecture

Sidebar (`Sidebar` component, `5:22`) is dark forest green, fixed left, groups the app into two bands.

**STATIONS** — the clinical flow, in the order a patient moves through it:

1. Patient Kiosk `/kiosk`
2. Nurse Station `/nurse`
3. Doctor Console `/queue`
4. Inbox `/inbox`
5. Reception Desk `/desk`
6. Billing & POS `/billing`
7. Lab & Diagnostics `/lab`
8. Teleconsult `/teleconsult`
9. Appointments `/schedule`

**MANAGE** — the clinic's own administration:

10. Reports `/reports`
11. Patients & Rx `/patients`
12. My templates `/templates`
13. Doctors `/doctors`
14. Staff & roles `/staff`
15. Patient messages `/messages`
16. Locations `/locations`
17. Subscription `/subscription`
18. Settings `/settings`

Footer: **My account** (PIN, kiosk, sign out) and **Lock · switch user**.
The top bar (`Topbar`, `5:221`) carries the clinic switcher (location chip + doctor count) and the
user chip (name, role, speciality). Mobile collapses to a bottom tab bar: Dashboard, Console, Inbox,
Patients & Rx (`Mobile tab bar`, `23:185`).

### Roles

Six roles, defined on the Roles & access screen (`10:942` / `30:994`):

| Role | Can open | Cannot read |
|---|---|---|
| Doctor | everything clinical: Doctor Console, prescriptions, inbox, templates, nurse view, lab view, teleconsult | — |
| Nurse | Nurse Station (vitals) — View only; Lab & Diagnostics — View | diagnoses, notes, prescriptions |
| Front desk | Patient Kiosk, Reception Desk, Appointments, Patient messages, Patients (contact & visits) — View, Billing & POS — View | clinical notes |
| Lab technician | Lab & Diagnostics — View; Appointments — View; Patient messages — View; Billing & POS — View | |
| Accounts | Billing & POS — View, Reports — View, Patients — View | clinical notes |
| Clinic admin | Patient Kiosk, Reception Desk, Billing & POS, Teleconsult, Appointments, Patients, Patient messages, Settings | diagnoses, notes, prescriptions |

Every person signs in with their own mobile — sharing one login hides who did what (stated verbatim on
`/staff`). Every action is written to the Activity log (`/staff` → Activity log): sign-ins, records
opened, bookings, money, prescriptions, team changes, filterable by person and category, exportable.

---

## 3. Screens — desktop

Figma node ids in brackets. Live routes confirmed by walking the running app.

### Dashboard — owner `[6:2]` `/dashboard`
Station grid, not a data dashboard. "Open a station" shows 9 cards (Patient Kiosk, Nurse Station,
Doctor Console, Inbox, Reception Desk, Billing & POS, Lab & Diagnostics, Teleconsult, Appointments)
each with a role badge. Below: "Open a doctor's console" (per-doctor rows), then a "Manage" list
(Reports, Patients & Rx, My templates, Doctors, Staff & roles, Patient messages, Locations,
Subscription, Settings). Live adds a trial banner ("Your free trial ends in 3 days…") and a
first-run welcome checklist with 8 steps (`19:2562` chain / Dashboard — new clinic welcome).

### Patient Kiosk `[15:1439]` `/kiosk`
A front-desk tablet becomes a self check-in screen. One question per screen, huge touch targets,
English · ಕನ್ನಡ · हिन्दी switcher. Steps: Mobile → Code → Patient → Doctor → Pay → Token.
Patient details are private: after 45 s idle it shows "Are you still there?" and resets.
Staff close it with the 4-digit PIN ("Close the kiosk" dialog).

### Nurse Station `[9:701]` `/nurse`
"Emergencies and urgent patients come first. Updates every 10 seconds."
Tally tiles: Need vitals · Urgent or emergency · Ready for the doctor · Longest wait for vitals.
Tabs: Need vitals / Ready / All. Each card: token, name, age · sex, wait time, reason, next available
doctor, priority (Normal / Urgent / Emergency), actions **Call** and **Take vitals**.

**Take vitals dialog** — Temperature (°F/°C), Pulse, SpO₂, BP systolic, BP diastolic, Breathing rate,
Weight, Height, Random sugar. Each field prints its own normal range (97–99 °F, 60–100 /min, 95–100 %,
90–139 / 60–89 mmHg, 12–20 /min, 70–140 mg/dL). Plus: priority, "Send to" doctor, note for the doctor.
Saving marks the patient *Ready for the doctor*.

### Doctor Console — consult & prescription `[7:480]` `/queue` and `/visit/<id>`
The heart of the product. Left column: **Patient brief** (ABHA status, what the patient told us,
nurse vitals as tiles, history). Right column is a 7-step form:

1. **Patient brief** — reason at check-in, symptom-form status ("The patient has not filled the symptom
   form; write the diagnosis yourself")
2. **Nurse's vitals** — timestamped tiles
3. **History** — first visit / conditions / allergies, plus complaint & history fields
   - *Chief complaints* (prints on the prescription) and *History* (record only)
   - *Examination* — vitals row, then symptom chips: General examination (Normal, Febrile, Pallor,
     Icterus, Dehydrated, Lymphadenopathy, Pedal oedema, Cyanosis, Clubbing, Looks unwell) and system
     chips (Throat/ears/nose, Chest, Heart, Abdomen, Nervous system, Joints and muscles, Skin).
     "Rest normal" resets. Free-text "Other General findings".
   - Templates: **Apply** / **Save as template** — a template only adds, never removes.
4. **Diagnosis** — type-ahead against ICD-10 (e.g. *Insomnia* → `G47.0`), Provisional/Confirmed toggle,
   add another diagnosis, primary marker.
5. **Medicines** — suggested list plus free search over brand and salt ("Dolo, azithro 500…"), each line
   shows generic, form, pack, manufacturer, category and "used for"; **drug-interaction warnings** are
   generated (e.g. Sertraline ⇄ Moclobemide needs a 1-week gap); dose line, note to patient,
   prescription-only flag, NEURO CNS category.
6. **Tests** — search the full lab catalogue (Tenet Diagnostics and MediDocs price lists) or type your own
7. **Follow-up** — 3 days / 5 days / 1 week / 2 weeks / 1 month / 3 months / only if needed, then date
   and time slot
+ **Payment & bill** — what is unpaid, "Add clinic medicines, other charges or a discount"
+ **Sign & send to reception** — the last step, with instruction checkboxes:
   print and hand over the prescription · collect the consultation fee · book the follow-up visit ·
   collect the lab sample · note for reception · **Send to a pharmacy** (patient chooses; controlled
   medicines are never sent electronically — the patient takes the paper copy)

A sticky bottom bar carries live status chips — *No diagnosis / ✓ Insomnia*, *0 medicines / ✓ 1 medicine*,
*0 tests*, *No follow-up / ✓ Follow-up Mon, 30 Nov*, *Safety checked* — and the gold **Review & sign**
button. Signing locks the prescription, sends the patient their copy by SMS and ABHA, and puts it on the
Reception Desk with the instructions. In test mode the signature is explicitly "not legally valid".

Other console actions: **Record**, **Refer** (to a colleague, with attachments and urgency), **Certificate**,
**Queue**.

### Inbox `[20:2854]` `/inbox`
"Doctor inbox — All caught up." Three buckets: **To do**, **Lab results**, **Referrals**, **Handover**.
A referral arrives with your reason and attachments; the colleague answers in their inbox.

### Reception Desk `[15:1513]` `/desk`
"Check each patient out in one place: prescription, payment, follow-up and lab sample. Oldest first."
Tally: Waiting at the desk · To collect ₹ · Follow-ups to book · Done today.
Each patient card shows remaining steps: **Prescription** (Not printed yet → Print / Send link),
**Payment** (amount, invoice number, Cash / UPI / Card), **Follow-up** (doctor asked: 1 week · Mon 30 Nov,
with a slot grid), then **Hand over & finish**.

### Billing & POS `[9:986]` `/billing`
"Bills, UPI, cash and card, refunds and the day close."
Collected today (UPI / Cash / Card split) · To collect · Refunded · Day (Open → Close it at the end of
the day). Bill list filterable Today / All / To collect / Paid / Refunded, each row with number, time,
patient, line and amount, and a **Collect** action.
**New bill** builder: doctor picker (fee comes from the doctor's own fee), item catalogue
(Consultation in-clinic ₹500, Follow-up consultation ₹300, Video/audio consultation ₹400, ECG ₹350,
Wound dressing ₹200, Nebulisation ₹250, Chemical peel ₹1,500), GST rate (No GST / 5% / 12% / 18%),
line editor, discount ₹/%, subtotal, total, **Make bill** / **Make bill & collect**.
**Day close** drawer: UPI, Card, Cash expected, Refunded, Not yet paid, cash counted in the drawer.
Consultation lines are GST exempt ("doctor's own fee", SAC 9993).

### Lab & Diagnostics `[20:2294]` `/lab`
"Collect, process, report. Every report goes straight to the doctor who ordered it."
Tally: To collect · In lab · Sent out · Reported today · Abnormal today. Workflow columns:
To collect → Processing → Reported today → Outside report. Orders appear the moment a doctor signs a
prescription containing tests. Lab partners: Tenet Diagnostics, MediDocs. `Add a lab result` dialog
`45:3082`.

### Teleconsult `[20:2600]` `/teleconsult`
"Patients wait on their own page. Start the call when they are online, and switch to a phone call if
video fails." Virtual waiting room, booked later today, finished today. Footer guidance:
"Telemedicine Practice Guidelines 2020: confirm the patient's name and age (and who is speaking, if a
relative), and record consent before prescribing. Each consult has its own private room."

### Appointments — day view `[17:1592]` `/schedule`
Week strip (booked / free per day, Sunday off), day list or calendar view, online booking page link,
"First available", "All doctors", filters per doctor.
**Booking details** drawer: check in, send a reminder, move, cancel. In calendar, tap a free slot to book.
**Leave** (reason shown to staff, mark leave this day). **Working hours**: two sessions per day,
slot length 10/15/20/30 minutes, "Existing bookings stay as they are".
**Book appointment** dialog: doctor, day, time, existing patient or new, name/mobile/age/sex,
In-clinic / Video / Audio, fee, reason.

### Reports — summary `[17:1913]` `/reports`
Date range presets (Today, Yesterday, 7 days, 30 days, This month, Last month, 90 days, 12 months,
Pick dates) with a comparison window. Scope: Whole clinic / a doctor. Four tabs:
**Money** (collected, after refunds, outstanding), **Patients** (new, follow-ups), **Bookings & waiting**
(bookings, no-shows, wait, longest wait), **Clinical** (consults, prescriptions, top diagnoses, top
medicines). "Worth a look" callouts, e.g. "₹500 still to collect from 1 bill; the oldest is 0 days old."
Charts: consultations per day, money per day, busiest hours heat map.

### Patients & Rx `[21:2670]` `/patients`
Patient records list with segments: Everyone · Here today · Follow-up due · Owes money · New this month ·
My patients. Row: initials avatar, name, age/sex, status (Here · W-01 · Seen), dues, follow-up due date,
masked mobile, last seen + doctor, visit count. Row opens the **Patient history drawer** `[58:9749]`.

### My templates `[22:3956]` `/templates`
Prescription templates. Mine / From colleagues / Most used / Recently used / A to Z. Empty state:
"Build one for the conditions you treat most, such as viral fever or acidity, or copy one from a
colleague." Template editor `[45:3179]`. Applying adds medicines, tests and advice — never removes.

### Doctors `[22:3106]` `/doctors`
Per-doctor card: status (Free now), today's sessions, seen / waiting / booked ahead / this month,
avg consult, collected, next free slot, works at (branch · room), fees (clinic / online), hours
(Mon–Sat, 15 min slots), registration (Reg. no. + HPR verified), signs with (Aadhaar eSign / DSC token).
**Add a doctor** `[58:9649]` → HPR lookup by ID (`71-0000-0000-0000`), then speciality, consultation
fee, video/audio fee and signing method. **Edit doctor** `[58:10057]`, **Hours & leave** `[58:9680]`.

### Staff & roles — Roles & access `[10:942]` `/staff`
Tabs: Team · Roles & access · Activity log. **Add someone** `[58:9482]` picks a role first — Front desk,
Nurse, Lab technician, Accounts, Clinic admin — each with a one-line description of what they do and
what they can open, then full name and mobile (their login).
**New profile** `[58:9617]` / **Person access** `[58:9554]` / **Edit member** `[58:9517]` for custom roles.

### Patient messages `[21:3256]` `/messages`
"Every message to patients, word for word." Three tabs: **Doctor running late** (broadcast to everyone
waiting on that doctor, with the delay), **Messages** (the log), **Message wording** (the 20 DLT
templates to register, each with example details, character count and SMS count, copyable).
Categories: Queue & tokens · Bookings & reminders · Payments · Prescriptions & results · Online consults.
Each logged message shows the exact text sent, delivery status, and one-tap **WhatsApp** / **Copy**
when SMS is not connected.

### Locations `[22:3422]` `/locations`
One card per branch: address, phone, state + GST state code, HFR id, doctors in, waiting, seen today,
collected today, and its rooms (room → doctor or "Free to use"). "This device shows all locations —
pick the branch it sits in, so check-ins and bills go to the right place."
**Add a branch** `[58:9727]`, **Edit branch** `[58:3770]`.

### Subscription `[18:1895]` `/subscription`
"Your MedMate plan, what it includes, and payments." Trial countdown, usage (doctors 1 of 5, locations
1 of 3, staff 0 of 20), plan cards **Solo** ₹833/mo and **Clinic** ₹2,083/mo (₹9,990 / ₹24,990 yearly,
2 months free, +18% GST) with feature lists and "Most popular" badge. Monthly/Yearly toggle.
**Checkout** `[45:3289]`, **Payment successful** `[45:3463]`, **Enterprise enquiry** `[45:3324]`,
**Connect payments** `[58:3971]`.

### Settings — clinic & letterhead `[22:3701]` `/settings`
Tabs: My account · This device · Clinic & letterhead · Pharmacies · Ready to go live.
- **Clinic & letterhead**: live preview of the prescription letterhead, clinic name, GSTIN, PAN,
  registered under (state acts, or "Other state law" / "Applied, number awaited"), registration number,
  valid until, header colour, line under the clinic name, clinic phone, footer. Below, **Agreements on
  record** — each agreement keeps a SHA-256 fingerprint of the exact text accepted at sign-up.
- **Pharmacies**: add pharmacy; explains pharmacy-software delivery vs SMS-with-verify-link, and that
  controlled medicines are never sent electronically.
- **Ready to go live**: 7/13 checklist, 6 things to finish — SMS (DLT templates), legal eSign (ESP
  account), ABDM/ABHA registration, online & UPI payments (Razorpay), and data residency (hosting
  provider's database may be outside India).

### Clinic sign-up — 5 steps `[13:1415] → [19:2562]` `/start`
1. **You** — full name, mobile, email; send code
2. **Your clinic** — name, kind (single doctor / polyclinic / multi-speciality), registered under,
   registration number, valid until, PAN, GSTIN — with GSTIN checksum validation
3. **Location** — name, address, city, PIN, state, phone, HFR id, number of rooms
4. **Your role** — I'm a doctor / nurse / front desk / admin, plus doctor details (HPR lookup returns
   name, qualification and registration), speciality, consultation fee, video fee, signing method
5. **Agreements** — Terms of Service, DPA, Clinic declaration, each with key points and a full text,
   plus an attestation ("I, <name>, am authorised to sign up <clinic>…") and the IT Act 2000 note
   about recording the evidence. Signing up creates the clinic, its branch, its first doctor and a
   booking slug: `/book?clinic=<slug>`.

---

## 4. Patient-facing surfaces

Mobile web, no app needed, opened from the clinic's booking link or an SMS.

> **None of these routes exist in the app yet.** They are the design of record. The live MVP ships no
> patient-facing surface — see `docs/SCREEN-AUDIT.md` §4.

| Screen | Route | Figma |
|---|---|---|
| Book online 1 — Doctor & time | `/book?clinic=<slug>` | `[45:3069]` |
| Book online 2 — Your details | same flow | `[45:3182]` |
| Book online 3 — Confirmed | same flow | `[45:3250]` |
| Manage booking | `/appt` | `[45:3315]` |
| Live token (track your turn) | `/t/<token>` | `[51:3376]` |
| Symptoms form | `/intake/<token>` | `[51:3424]` |
| Legal document | `/legal` | `[51:3494]` |
| Verify prescription (public) | `/verify/rx_<id>?h=<hash>` | `[58:9158]` |
| Verify certificate (public) | — | `[58:9188]` |
| Patient check-in on own phone | phone QR → same steps as kiosk | `[33:1161]` |

The live token page shows: your place in the queue, token, room, who to see, what to pay at the desk
("₹500 to pay at the front desk"), the prescription link, and it updates itself.
The verify page states "Genuine and unchanged. Signed in test mode: not a legal signature." and lists
doctor, registration, signature timestamp, patient and each medicine as `1-0-0-1 · 5 days`.

Booking page copy (live): "Book a doctor — MedMate Clinic Indiranagar — Any available doctor — the
earliest free time with any doctor — Dr. Naveen Kulkarni, Psychiatry · ₹500 in clinic · ₹400 video —
Next free: Tomorrow, 10:00".

---

## 5. Dialogs & drawers (overlays)

| Dialog | Figma | What it does |
|---|---|---|
| My account | `[58:10026]` | change PIN, open kiosk on this device, sign out |
| Lock · switch user | — | 4-digit PIN unlock or switch user; screen locks after 15 min idle |
| Send a message | `[58:10103]` | send a message to a patient |
| Call the patient | `[58:10202]` | call a patient |
| Share booking link | `[58:10124]` | copy the public booking link |
| Edit branch | `[58:10083]` | branch details, rooms, device assignment |
| Edit doctor | `[58:10057]` | fees, hours, signing method |
| Safety check before signing | `[58:9816]` | final pre-sign review of every line |
| Send to a pharmacy | `[45:3028]` | record the patient's chosen pharmacy |
| Add a lab result | `[45:3082]` | enter a result against an order |
| Refer to a colleague | `[45:3136]` | refer with reason, urgency, attachments |
| Template editor | `[45:3179]` | build/edit a prescription template |
| Add a pharmacy | `[45:3242]` | register a pharmacy for e-prescriptions |
| Checkout | `[45:3289]` | subscription checkout |
| Enterprise enquiry | `[45:3324]` | enterprise plan enquiry |
| Connect payments | `[58:10217]` | connect Razorpay / UPI |
| Write a certificate | `[45:2926]` | issue a medical certificate |
| Check in a patient | `[58:9259]` | name, age, sex, mobile, reason, consult mode, doctor |
| Book a visit | `[58:9294]` | book an appointment |
| Check out | `[58:9347]` | reception check-out |
| New bill | `[58:9382]` | build a bill |
| Refund | `[58:9418]` | refund a payment |
| Close the day | `[58:9441]` | day close with cash count |
| Add someone | `[58:9482]` | add staff with a role |
| Edit member | `[58:9517]` | edit a staff member |
| Person access | `[58:9554]` | per-screen access for a person |
| New profile | `[58:9617]` | create a custom role |
| Hours & leave | `[58:9680]` | sessions, slot length, leave |
| Add a doctor | `[58:9649]` | HPR lookup → fees, speciality, signing |
| Add a branch | `[58:9727]` | new location |
| Patient history drawer | `[58:9749]` | full history of one patient |

---

## 6. Design system

Extracted from the shipped stylesheet (`/_next/static/chunks/252i6fbna1-7c.css`).

### Colour

```
--forest  #1b3d29   sidebar, header, primary surfaces
--green   #2f7d52   primary action
--green-700 #256b46 hover
--gold    #d9a648   the one accent — primary CTA, warnings
--gold-ink #855b0c  text on gold
--gold-50 #fdf8ea  --gold-100 #faedc9
--mint    #8fd4a8  --mint-300 #bde5cb  --mint-200 #d9f0e1
--mint-100 #e9f6ee --mint-50 #f4fbf6
--ink     #14201a  body text      --ink-2 #3b4842
--muted   #65726b  secondary text --faint #9aa59f
--line    #e7ece9  hairline       --line-2 #d5ddd8
--surface #fff     --surface-2 #f5f8f6  --surface-3 #edf2ef
--red     #c2392d  --red-bg #fcece9
--blue    #2a5db0  --blue-bg #eaf1fb
--sh-2    0 4px 14px #14201a14   --sh-3 0 12px 32px #14201a29
```

One dark green family, one gold accent, one red for danger, one blue for informational. Mint tints mark
success/complete states. Nothing else.

### Type

`Outfit, system-ui, sans-serif` everywhere. Weights 500 / 600 / 700 / 800. Scale runs
10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 15 / 16 / 17 / 18 / 20 / 22 px —
dense, clinical, no large display type inside the app (the landing page is the exception).

### Shape & depth

Radii 10 / 12 / 14 / 16 / 18px, pills for chips. Two shadows only: `--sh-2` for cards, `--sh-3` for
overlays. Cards are white on `--surface-2`.

### Components

`Sidebar` `5:22`, `Nav item` `5:5`, `Topbar` `5:221`, `Station card` `5:242`, `Manage row` `5:300`,
`Button` `4:110`, `Badge` `4:133`, `Avatar` `4:146`, `Input` `4:161`, `Feature card` `11:135`,
`Plan card` `11:145`, `Mobile header` `23:156`, `Mobile tab item` `23:172`, `Mobile tab bar` `23:185`,
`Icons` `4:2`.

### Responsive & print

Breakpoints at 420 / 560 / 640 / 720 / 760 / 820 / 900 / 1000 / 1100 / 1180 px, plus a
`prefers-reduced-motion` block. `prefers-color-scheme` is not used — the app is light with a dark
sidebar. `@media print` prints only `.inv-paper` (the bill), everything else hidden.

---

## 7. Data & API

Endpoints, by screen (confirmed by reading the shipped chunks):

| Screen | GETs |
|---|---|
| Dashboard | `/api/setup`, `/api/site` |
| Nurse Station | `/api/me`, `/api/queue?doctor=all` |
| Doctor Console | `/api/me`, `/api/visits` |
| Inbox | `/api/inbox`, `/api/handovers`, `/api/referrals/colleagues` |
| Reception Desk | `/api/appointments`, `/api/rx-desk` |
| Billing | `/api/invoices`, `/api/invoices/unbilled`, `/api/dayclose`, `/api/queue?doctor=all` |
| Lab | `/api/lab`, `/api/lab-results` |
| Teleconsult | `/api/me`, `/api/tele` |
| Appointments | `/api/appointments`, `/api/schedule/hours`, `/api/schedule/leave`, `/api/schedule/move-all` |
| Reports | `/api/me`, `/api/queue?doctor=all` |
| Patients | `/api/patients`, `/api/me` |
| Templates | `/api/templates`, `/api/clinic-items`, `/api/medicines?warm=1`, `/api/formulary`, `/api/tests` |
| Doctors | `/api/doctors`, `/api/doctors/hpr`, `/api/branches`, `/api/staff` |
| Staff | `/api/staff`, `/api/staff?view=team`, `/api/profiles`, `/api/branches` |
| Messages | `/api/messages`, `/api/messages?view=wording` |
| Locations | `/api/branches`, `/api/me` |
| Subscription | `/api/subscription` |
| Settings | `/api/clinic`, `/api/clinic/agreements`, `/api/settings/readiness`, `/api/pharmacies?all=1`, `/api/branches` |
| Auth | `/api/auth/otp`, `/api/auth/verify`, `/api/auth/pin`, `/api/auth/unlock`, `/api/auth/lock`, `/api/auth/logout` |
| Kiosk / patient | `/api/kiosk` (open, code, verify, walkin, pay, paid, checkin, qr), `/api/checkin` |
| Shared | `/api/me`, `/api/site`, `/api/dev/view-as` |

Response conventions: money in paise-free rupees via a `rupees()` formatter (`₹1,234.56`, en-IN);
entities carry `id`, `created_at`, `status`; the API redirects to `/login` on 401 and reloads on 423
(a locked screen). `demoCode` is returned for kiosk/sign-up OTPs in test mode.

Entities: `clinic`, `branch` (rooms + roomUse + doctors + day counters), `staff` (role, is_owner,
share model/value, branch_id), `patient` (name, sex, age, phone, abha), `visit` (token W-01, mode,
source, status, priority, symptoms, redFlags, allergies, nurseNote, vitals, intakeToken),
`invoice` (fy, prefix MCI, no, lines with sac/gst, totals, status, pay_mode, refund_reason),
`appointment`, `lab_order` / `lab_result`, `template`, `pharmacy`, `message`, `handover`, `referral`,
`test catalogue` (Tenet + MediDocs price lists), `schedule` (days, slot, sessions), `readiness checklist`.

---

## 8. Figma ↔ live app

The Figma file is the design of record for the whole product. The live MVP implements the core of it,
but not all of it.

**Read [`docs/SCREEN-AUDIT.md`](SCREEN-AUDIT.md) for the frame-by-frame matrix.** It was written
from a full traversal of the live Figma file and is the authority on what is built. Summary:

- **26 desktop screens** → 13 built, 5 partial, 12 placeholder, 0 missing.
- **41 phone frames** → **0 built.** The live app ships one responsive shell (sidebar collapses to an
  84px icon rail at ≤1180px, top bar hides at ≤720px) with no bottom tab bar. `MobileHeader` and
  `MobileTabBar` exist in `src/components/layout/Mobile.tsx` but only the fidelity guide renders them.
- **Patient-facing web** (`/book`, `/appt`, `/t`, `/intake`, `/verify/*`) is **entirely absent** —
  there is no route for any of it. The clinic sign-up flow prints a booking link (`/book?clinic=<slug>`)
  that resolves to a 404.
- **31 desktop dialogs and drawers** → **0 built.** There is no dialog primitive in the codebase.
- **Kiosk tablet steps** are in Figma (`58:4013`–`58:4149`) and in the app, but the live kiosk is
  desktop/tablet-width only.
- **Prototype click-through page** (`58:*`) duplicates the Screens and Sub-pages pages with click
  targets wired — it is not new screens.
- Live app extras not in Figma: the trial banner, the 8-step first-run checklist, the Activity log,
  the Roles & access matrix table, the Readiness checklist (7/13), the DLT message-wording tab.
- The live app is seeded per clinic; the Figma shows a fictional three-doctor clinic
  (Dr. Ananya Rao, Dr. Vikram Shenoy, Dr. Meghana Iyer) with richer patient data.

### Figma file contents

The file's own cover states it: *Foundations · Components · 26 desktop screens · 41 phone
screens · 70 sub-pages, dialogs and printouts · clickable desktop prototype with 8 flows.*
Seven pages in all.

| Page | Top-level frames in the layer tree | What it holds |
|---|---|---|
| Cover | — | the file's cover and the scope statement |
| Foundations | 2 | the palette, the type scale, the component and icon styles |
| Components | 15 | the component set the screens are built from |
| Screens | 26 | the desktop screens (above) |
| Mobile | 41 | patient phone (booking, token, symptoms, verify, legal), kiosk-on-phone, mobile staff screens, mobile landing, mobile sign-up |
| Sub-pages & dialogs | 70 | patient pages, kiosk tablet steps, 31 dialogs, printouts |
| Prototype — desktop click-through | 96 | the Screens and Sub-pages frames again, with click targets wired |

Counts are from a full traversal of the live file. The Prototype page duplicates the other two
content pages, so the file's **98 distinct screens** are 26 desktop + 41 phone + 31 dialogs.

---

## 9. Notes for whoever builds on this

- `kilo mcp auth figma` is not yet authorised in this workspace, so exact Figma values (colour ramps,
  spacing scale, auto-layout) were read from the shipped CSS instead. Authorising the MCP would give
  the design of record rather than the built one.
- The MVP is in test mode by design: no real SMS, eSign, ABDM or payments. The UI says so on every
  screen that depends on them, and the Readiness checklist enumerates what is still needed to go live.
- The API is unauthenticated-by-default for kiosk and patient endpoints (token-based), staff endpoints
  require the session cookie. The device can be switched into kiosk mode, which blocks staff APIs on
  that device until it is unlocked with the PIN.
