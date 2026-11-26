# The proof

Every image here was captured against the **real service**: PostgreSQL 17, the
Spring Boot API with the demo clinic seeded (registry V1–V5, clinic V1–V206, demo
V300–V303), and the SPA served with `VITE_USE_MOCK=false` — the mock is off, so
every number on these screens came from the service.

Captured 2026-11-26T17:23:32.530Z against `http://127.0.0.1:3100` (the API at `http://127.0.0.1:8080`), signed in as the demo
clinic's owner.

| Image | Viewport | What it shows |
|---|---|---|
| [`dashboard-1440x900.png`](./dashboard-1440x900.png) | 1440x900 | The owner's dashboard — the clinic's stations, its waiting room and its money for the day. |
| [`queue-1440x900.png`](./queue-1440x900.png) | 1440x900 | The doctor's queue — the six tabs, the patients waiting and the ones seen today. |
| [`patients-1440x900.png`](./patients-1440x900.png) | 1440x900 | The patients list — the search, the filter chips and the masked mobiles. |
| [`desk-1440x900.png`](./desk-1440x900.png) | 1440x900 | The reception desk — the hand-over, the till's door and the queue to check a patient into. |
| [`billing-1440x900.png`](./billing-1440x900.png) | 1440x900 | Billing and the till — the four pay modes, the day's bills and the day's money. |
| [`schedule-1440x900.png`](./schedule-1440x900.png) | 1440x900 | The appointment book — the day, the slots and the doctors' free times. |
| [`nurse-1440x900.png`](./nurse-1440x900.png) | 1440x900 | The nurse station — the patients waiting for a reading and the doctors to route them to. |
| [`lab-1440x900.png`](./lab-1440x900.png) | 1440x900 | The lab bench — the unreported orders, the results and the partners the work goes to. |
| [`templates-1440x900.png`](./templates-1440x900.png) | 1440x900 | The doctor's own message templates. |
| [`inbox-1440x900.png`](./inbox-1440x900.png) | 1440x900 | The doctor's inbox — the results, the referrals and the hand-overs. |
| [`reports-1440x900.png`](./reports-1440x900.png) | 1440x900 | The reports — the clinic's day, its money and its busiest hours. |
| [`subscription-1440x900.png`](./subscription-1440x900.png) | 1440x900 | The subscription — the plan, the trial and what the clinic is using. |
| [`settings-1440x900.png`](./settings-1440x900.png) | 1440x900 | The clinic's own settings, its letterhead and its agreements. |
| [`staff-1440x900.png`](./staff-1440x900.png) | 1440x900 | The team and the roles — who may open what. |
| [`kiosk-1440x900.png`](./kiosk-1440x900.png) | 1440x900 | The patient kiosk — the front desk's card, with the kiosk closed. |
| [`landing-1440x900.png`](./landing-1440x900.png) | 1440x900 | The landing page a visitor arrives on. |
| [`login-1440x900.png`](./login-1440x900.png) | 1440x900 | The sign-in — a mobile number and a one-time code. |
| [`patient-book-1440x900.png`](./patient-book-1440x900.png) | 1440x900 | The patient-facing booking page — the clinic, its doctors and the times it is offering. |
| [`patient-live-1440x900.png`](./patient-live-1440x900.png) | 1440x900 | The patient's live token — the queue slip A-019 and the doctor they are seeing. |
| [`patient-intake-1440x900.png`](./patient-intake-1440x900.png) | 1440x900 | The patient's symptoms form, before the visit. |
| [`m-landing-390x844.png`](./m-landing-390x844.png) | 390x844 | The phone app's landing page. |
| [`m-signup-390x844.png`](./m-signup-390x844.png) | 390x844 | The phone app's clinic sign-up — the steps the doctor fills in. |
| [`m-dashboard-390x844.png`](./m-dashboard-390x844.png) | 390x844 | The phone app's dashboard — the doctor's own day. |
| [`m-console-390x844.png`](./m-console-390x844.png) | 390x844 | The phone app's doctor's console. |
| [`m-patients-390x844.png`](./m-patients-390x844.png) | 390x844 | The phone app's patient list. |
| [`m-schedule-390x844.png`](./m-schedule-390x844.png) | 390x844 | The phone app's appointments. |
| [`m-billing-390x844.png`](./m-billing-390x844.png) | 390x844 | The phone app's till. |
| [`m-lab-390x844.png`](./m-lab-390x844.png) | 390x844 | The phone app's lab bench. |
| [`m-reports-390x844.png`](./m-reports-390x844.png) | 390x844 | The phone app's reports. |
| [`m-settings-390x844.png`](./m-settings-390x844.png) | 390x844 | The phone app's settings. |
| [`m-landing-430x932.png`](./m-landing-430x932.png) | 430x932 | The phone app's landing page. |
| [`m-signup-430x932.png`](./m-signup-430x932.png) | 430x932 | The phone app's clinic sign-up — the steps the doctor fills in. |
| [`m-dashboard-430x932.png`](./m-dashboard-430x932.png) | 430x932 | The phone app's dashboard — the doctor's own day. |
| [`m-console-430x932.png`](./m-console-430x932.png) | 430x932 | The phone app's doctor's console. |
| [`m-patients-430x932.png`](./m-patients-430x932.png) | 430x932 | The phone app's patient list. |
| [`m-schedule-430x932.png`](./m-schedule-430x932.png) | 430x932 | The phone app's appointments. |
| [`m-billing-430x932.png`](./m-billing-430x932.png) | 430x932 | The phone app's till. |
| [`m-lab-430x932.png`](./m-lab-430x932.png) | 430x932 | The phone app's lab bench. |
| [`m-reports-430x932.png`](./m-reports-430x932.png) | 430x932 | The phone app's reports. |
| [`m-settings-430x932.png`](./m-settings-430x932.png) | 430x932 | The phone app's settings. |

## Why these and not the earlier images

The branches' own images were captured against the **mock**: they prove layout,
wiring, states and copy, and they prove nothing about the service. These were
taken against the running service with the demo clinic seeded, so the waiting
counts, the bills, the lab bench and the queue are the service's own rows.

## The widths

- **1440×900** — the desktop app.
- **390×844** — the phone app (iPhone 14).
- **430×932** — the phone app (iPhone 15 Pro Max).

## Reproducing them

```bash
bash verify/dev-stack.sh start      # Postgres, the API, the SPA with the mock off
node verify/capture-proof.mjs        # the images and this file
```
