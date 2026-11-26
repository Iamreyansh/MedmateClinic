# Mobile wave — visual proof

Captured from the local dev server (Vite, port 3100) with the **mock** API on, at the
viewports named below. These prove **layout, wiring and copy** — they do **not** prove
real-service behaviour. The merged-tree capture against the real service follows in the
verification phase.

| File | Viewport | What it shows |
|---|---|---|
| `staff-dashboard-390x844.png` | 390x844 | The staff app chrome: forest-green header, wordmark, lock, gold avatar, and the bottom tab bar with the forest active tile, the gold icon and the gold Inbox count badge. Compare with the recovered `build-fidelity-mobile.png`. |
| `book-390x844.png` | 390x844 | The patient's booking page: the clinic's doctors with their fees, the free-time grid with taken times struck through, and the patient bottom tab bar. |
| `book-bottom-390x844.png` | 390x844 | The same page scrolled to the bottom, showing the primary action clear of the fixed tab bar. |
| `confirmed-390x844.png` | 390x844 | The booking is made: the patient's slip, the doctor, the time and the clinic. The link key is in the URL, never on the screen. |
| `live-queue-390x844.png` | 390x844 | The patient's place in the queue: the slip `A-019`, how many people are ahead, the room and the doctor. The link key is in the URL and is nowhere on the screen. |
| `expired-link-390x844.png` | 390x844 | A dead or revoked link: "This link is not valid any more — ask the clinic for a new link." |
| `checkin-430x932.png` | 430x932 | The patient's check-in, step 1 of 7, on a wider phone. |

**Not pixel-proven:** the loading, empty, error-with-retry and unreachable states, and
the desktop-width column. They are implemented; the verification phase proves them
against the real service.
