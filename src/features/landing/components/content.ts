import type { IconName } from "@/components/ui/Icon";

/**
 * The landing page's copy.
 *
 * Kept out of the components so the words live in one place and the components
 * stay about layout. The Figma file is the source of these strings.
 */

export type Step = {
  n: string;
  icon: IconName;
  title: string;
  body: string;
};

export const steps: Step[] = [
  {
    n: "01",
    icon: "kiosk",
    title: "Check-in",
    body: "Patients confirm their mobile at the kiosk or desk and get a token by SMS.",
  },
  {
    n: "02",
    icon: "nurse",
    title: "Vitals",
    body: "BP, temperature, SpO₂ and weight; anything worrying is flagged and moved up.",
  },
  {
    n: "03",
    icon: "stetho",
    title: "Consult",
    body: "The patient's words, vitals and history, with suggestions and safety checks.",
  },
  {
    n: "04",
    icon: "print",
    title: "Prescription & bill",
    body: "A signed e-prescription to the patient, their ABHA and their pharmacy.",
  },
  {
    n: "05",
    icon: "cal",
    title: "Follow-up",
    body: "Booked before they leave, with reminders a day and an hour before.",
  },
];

export type Feature = {
  icon: IconName;
  title: string;
  body: string;
};

export const features: Feature[] = [
  {
    icon: "rx",
    title: "Prescriptions doctors trust",
    body: "Examination, several diagnoses with ICD-10 codes, suggestions from the symptoms, and checks for interactions, duplicates, pregnancy, age and doses.",
  },
  {
    icon: "users",
    title: "Queue and kiosk",
    body: "Self check-in, live token page, call next patient, and priorities for the very unwell.",
  },
  {
    icon: "cal",
    title: "Appointments",
    body: "Doctor calendars, first available slot, an online booking page and reminders.",
  },
  {
    icon: "video",
    title: "Teleconsultation",
    body: "Video or phone consults with identity and consent recorded as the 2020 guidelines require.",
  },
  {
    icon: "rupee",
    title: "Billing and UPI",
    body: "GST-compliant bills with your prefix, UPI, card and cash, refunds and a day-close cash book.",
  },
  {
    icon: "lab",
    title: "Lab and diagnostics",
    body: "Tube labels, results with reference ranges, and critical alerts straight to the doctor.",
  },
  {
    icon: "pill",
    title: "Send to the pharmacy",
    body: "The patient chooses a pharmacy and the prescription goes to its dashboard, with status back.",
  },
  {
    icon: "folder",
    title: "Patient records",
    body: "One timeline of visits, readings, results and bills, with allergies on top.",
  },
  {
    icon: "chart",
    title: "Reports",
    body: "Money, patients, waiting times, no-shows and missed follow-ups, compared with before.",
  },
  {
    icon: "pin",
    title: "Many locations",
    body: "Each branch with its rooms and HFR ID; doctors placed where they work.",
  },
  {
    icon: "users",
    title: "Roles and activity log",
    body: "Each person sees only what they need; who did what is recorded and can't be edited.",
  },
  {
    icon: "send",
    title: "Messages patients understand",
    body: "Tokens, reminders and results in plain English, Kannada and Hindi.",
  },
];

export type Rule = {
  title: string;
  body: string;
};

export const rules: Rule[] = [
  {
    title: "Telemedicine Practice Guidelines 2020",
    body: "Identity and consent on every online consult; restricted medicines blocked.",
  },
  {
    title: "DPDP Act 2023",
    body: "Data processing agreement at sign-up, role-based access, and a log of who opened which record.",
  },
  {
    title: "IMC Regulations 2002",
    body: "Registration number, generic names, and records kept as long as required.",
  },
  {
    title: "Drugs and Cosmetics Rules",
    body: "Controlled medicines stay on paper; the patient chooses their pharmacy.",
  },
  {
    title: "GST Rule 46",
    body: "Exempt healthcare and taxable services billed correctly, with your own invoice series.",
  },
];

export const standards = [
  "ABDM ready",
  "FHIR R4",
  "Telemedicine Guidelines 2020",
  "DPDP Act 2023",
  "GST billing",
  "English · ಕನ್ನಡ · हिन्दी",
];
