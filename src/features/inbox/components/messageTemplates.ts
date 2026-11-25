/**
 * The wordings the clinic registers.
 *
 * A registered template is the only wording a message can start from, so the
 * doctor edits one of these rather than typing a message from scratch. The
 * placeholders — {date}, {token}, {amount} — are filled in when it is sent.
 */
export const MESSAGE_TEMPLATES = [
  {
    id: "appointment",
    label: "Appointment reminder",
    body: "Your appointment at MedMate Clinic, Indiranagar is on {date} at {time}. Reply CANCEL to cancel.",
  },
  {
    id: "token",
    label: "Token and turn",
    body: "Your token is {token}. You are {position} in the queue. Please come when you are close.",
  },
  {
    id: "payment",
    label: "Payment reminder",
    body: "₹{amount} is still to be paid at the front desk for your visit on {date}.",
  },
  {
    id: "prescription",
    label: "Prescription ready",
    body: "Your prescription from {doctor} is ready. Collect the paper copy at the front desk.",
  },
  {
    id: "report",
    label: "Lab report ready",
    body: "Your {test} report is ready. View it on your link or collect it at the clinic.",
  },
];
