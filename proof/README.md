# Proof — patient-facing public web (feat/patient-web)

Captured with `agent-browser` against the app running on its local mock API
(`http://localhost:3100`, `VITE_USE_MOCK` on). Viewports 390x844 and 430x932.

**What these images prove:** the screens' appearance, layout, the states they
move through, and the copy they show — including the two screens where a dead
link must show nothing of the record.

**What they do not prove:** the real service's behaviour, the real
`clinic.timezone` value the service sends, or end-to-end correctness against
the Java service. The verification phase captures the merged tree against the
real service; that is the stronger evidence.

| image | viewport | what it shows |
| --- | --- | --- |
| `proof/01-book-390.png` | 390x844 | Booking page: the doctor list with the first doctor selected, "Next free: Tomorrow, 09:00", "Clinic time: Asia/Kolkata (UTC+05:30)", and the service's free-slot grid. |
| `proof/02-book-confirmed-390.png` | 390x844 | Booking confirmation: "You are booked", the clinic, the doctor, the chosen slot with the day and the clinic's time zone, the queue slip `A-019` labelled "YOUR QUEUE NUMBER", and the three links to keep. The link key is never shown. |
| `proof/03-live-430.png` | 430x932 | Live queue: the queue slip `A-019`, "3 people ahead of you.", "Your place in the queue 4", the room, the doctor, and what is still to pay. |
| `proof/04-intake-430.png` | 430x932 | The symptoms form: how long, what the patient is feeling, the red flags, and the free-text notes. |
| `proof/05-appt-430.png` | 430x932 | Manage a booking: the doctor, the room, "YOUR NUMBER A-019", "POSITION 4", "TO PAY", and the three actions. |
| `proof/06-invalid-link-430.png` | 430x932 | An unknown link on the live queue: "This link is no longer valid" and "Ask the clinic for a new link." — and no patient data anywhere on the page. |
| `proof/07-rebook-430.png` | 430x932 | The rebook panel: the doctors to pick, "Next free: Tomorrow, 09:00", the clinic's time zone, the day, the service's free slots, and "Confirm this time" disabled until a slot is picked. |
| `proof/08-verify-invalid-430.png` | 430x932 | A prescription link with no valid hash: the invalid-link card and **nothing of the document** — no doctor, no patient, no diagnosis, no medicine. |
| `proof/09-appt-invalid-430.png` | 430x932 | An unknown link on "Your booking": the invalid-link card, "Try again" and "Book a new visit" — and no doctor, room, queue slip or dues on the page. |
| `proof/10-appt-cancelled-430.png` | 430x932 | A booking called off: "The booking is called off" and "You can book another visit whenever you like." |
