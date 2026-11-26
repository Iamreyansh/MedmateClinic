# The pixel drift, route by route

Measured on 2026-11-26 against the app at `http://127.0.0.1:3100` — the real stack: Postgres 17, the Spring Boot API with the demo clinic seeded, and the SPA with the mock **off**.

Three baseline sets, and every route is measured against each one that has a baseline for it:

| Set | What it is | Viewport |
|---|---|---|
| `history` | the deployed MVP as it shipped — recovered from this repository's own history (git archive 647ea0e^ _research) | 1440x900 |
| `reference` | the deployed MVP captured live (medmate-doctor-clinic.netlify.app), its own API, 1280x720 | 1280x720 |
| `service` | the app against the REAL service with the demo clinic seeded — the baseline re-measured on 2026-11-26, 1440x900 | 1440x900 |

| Route | vs `history` | vs `reference` | vs `service` (re-measured) |
|---|---|---|---|
| `billing` | **8.633%** | **9.424%** | **0.000%** |
| `dashboard` | **10.742%** | **11.805%** | **0.000%** |
| `desk` | **9.751%** | **11.940%** | — |
| `kiosk` | **1.680%** (declared 1.7±2%) | **5.043%** (declared 5±1%) | — |
| `lab` | **7.999%** | **10.802%** | **0.000%** |
| `landing` | **13.647%** (declared 13.6±4%) | **26.510%** (declared 26.5±1%) | — |
| `nurse` | **9.970%** | **12.371%** | — |
| `patients` | **9.339%** | **10.131%** | — |
| `queue` | **16.052%** (declared 14.8±4%) | **21.286%** (declared 21±1%) | **0.000%** |
| `reports` | **19.432%** (declared 19.2±4%) | **21.213%** (declared 21±1%) | — |
| `schedule` | **10.035%** | **10.910%** | **0.000%** |
| `settings` | **5.913%** | **8.185%** | — |
| `subscription` | **11.531%** | **12.879%** | — |
| `templates` | **9.719%** | **11.343%** | **0.000%** |

The routes in the third column were re-measured against the real service after the demo data moved: the dashboard's live waiting, the schedule strip, the billing tabs, the queue tabs, the lab bench's unreported orders and the templates.

`lab` and `templates` were out of the comparison while the demo clinic had no lab results and no templates. The demo seeds (V303) brought both, so they are measured now.

The mobile routes (`/m/*`) are **declared, not compared**: their baseline is the Figma frame, under the published naming rule (`verify/baselines/figma/<baselineName(path)>.png`, 1280x720, DPR 1), and no Figma frame has been exported yet. The recovered phone shots (`history/shots/mobile-book.png`, `history/shots/mobile-login.png`) are the patient-web app at a phone width — a different surface — and are not these routes' baseline.

The harness fails closed: a route that has a baseline and cannot be measured — a missing baseline, an unreachable app, a screen that never rendered — is an error, never a skip.
