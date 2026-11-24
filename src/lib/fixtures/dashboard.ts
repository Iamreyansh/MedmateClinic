import type { IconName } from "@/components/ui/Icon";
import type { IconTone } from "@/lib/design/tokens";

/**
 * The data the dashboard draws.
 *
 * This is the seam where the API plugs in: each shape here is what the
 * endpoints already return, so swapping the fixture for a fetch is a one-line
 * change per field.
 */

export type Clinic = {
  name: string;
  initials: string;
  locations: number;
  doctors: number;
};

export type SignedInUser = {
  name: string;
  initials: string;
  detail: string;
  tone: "doctor";
};

export type Station = {
  icon: IconName;
  tone: IconTone;
  title: string;
  description: string;
  tag: string;
  /** The green line under the description — how much is waiting here. */
  count?: string;
  countWarn?: boolean;
};

export type Doctor = {
  initials: string;
  name: string;
  speciality: string;
  room: string;
  /** How many are waiting in this doctor's console. */
  waiting: number;
  /** The doctor whose console is open. */
  current?: boolean;
};

export type ManageLink = {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  count?: number;
};

export const clinic: Clinic = {
  name: "MedMate Clinic",
  initials: "MC",
  locations: 2,
  doctors: 3,
};

export const location = "Indiranagar";

export const signedIn: SignedInUser = {
  name: "Dr. Ananya Rao",
  initials: "AR",
  detail: "Owner · General Medicine",
  tone: "doctor",
};

/** "Dr. Ananya Rao" → "Ananya". */
export const firstName = signedIn.name.replace(/^Dr\.?\s*/, "").split(" ")[0];

export const dashboardMeta = "4 in your queue · 2 awaiting vitals · 1 prescription to hand over · 5 appointments still to come today";

export const trial = {
  message:
    "Your free trial ends in 3 days. Patient care keeps working; choose a plan to keep adding doctors, staff or locations.",
  action: "See plans",
  href: "/subscription",
};

export const stations: Station[] = [
  {
    icon: "kiosk",
    tone: "blue",
    title: "Patient Kiosk",
    description: "Patients confirm their mobile, check in for a booking or join the queue, and get a token.",
    tag: "Step 1",
  },
  {
    icon: "nurse",
    tone: "purple",
    title: "Nurse Station",
    description: "Record vitals and route each patient to the right doctor.",
    tag: "Step 2",
    count: "2 waiting",
  },
  {
    icon: "stetho",
    tone: "green",
    title: "Doctor Console",
    description: "Consult, prescribe with smart suggestions, order tests and e-sign.",
    tag: "Step 3",
    count: "4 in queue",
  },
  {
    icon: "inbox",
    tone: "gold",
    title: "Inbox",
    description: "Referrals from colleagues, lab results to review and handovers.",
    tag: "Doctor",
    count: "6 to act on",
  },
  {
    icon: "print",
    tone: "blue",
    title: "Reception Desk",
    description: "Print each signed prescription and hand it to the patient.",
    tag: "Step 4",
    count: "1 to hand over",
  },
  {
    icon: "rupee",
    tone: "blue",
    title: "Billing & POS",
    description: "Collect consultation fees, print receipts and close the day.",
    tag: "Billing",
    count: "3 pending",
  },
  {
    icon: "lab",
    tone: "purple",
    title: "Lab & Diagnostics",
    description: "Collect samples, enter results and report the tests doctors order.",
    tag: "Diagnostics",
    count: "2 open",
  },
  {
    icon: "video",
    tone: "blue",
    title: "Teleconsult",
    description: "Video consults: the patient joins from home and the prescription goes out digitally.",
    tag: "Online",
    count: "1 waiting",
  },
  {
    icon: "cal",
    tone: "blue",
    title: "Appointments",
    description: "Book follow-ups and new patients, see the day and check arrivals in.",
    tag: "Bookings",
    count: "5 still to come today",
  },
];

export const doctors: Doctor[] = [
  {
    initials: "AR",
    name: "Dr. Ananya Rao",
    speciality: "General Medicine",
    room: "Room 2",
    waiting: 4,
    current: true,
  },
  { initials: "VS", name: "Dr. Vikram Shenoy", speciality: "Pediatrics", room: "Room 3", waiting: 2 },
  {
    initials: "MI",
    name: "Dr. Meghana Iyer",
    speciality: "Obstetrics & Gynaecology",
    room: "Room 1",
    waiting: 1,
  },
];

export const manage: ManageLink[] = [
  {
    icon: "chart",
    title: "Reports & analytics",
    description: "Consultation history, medicine analytics and Excel export.",
    href: "/reports",
  },
  {
    icon: "folder",
    title: "Patients & Rx",
    description: "Find a patient, their record, prescriptions and certificates.",
    href: "/patients",
  },
  {
    icon: "rx",
    title: "My templates",
    description: "Your reusable treatment protocols.",
    href: "/templates",
  },
  {
    icon: "stetho",
    title: "Doctors",
    description: "Add doctors by HPR ID; set fees, rooms and branch.",
    href: "/doctors",
    count: 3,
  },
  {
    icon: "users",
    title: "Staff & roles",
    description: "Front desk, nurses and admins, what each can open, and the activity log.",
    href: "/staff",
    count: 3,
  },
  {
    icon: "send",
    title: "Patient messages",
    description: "Every SMS sent to patients: tokens, payments, bookings and reminders.",
    href: "/messages",
  },
  {
    icon: "pin",
    title: "Locations",
    description: "Branches, rooms and which doctors work where.",
    href: "/locations",
    count: 2,
  },
  {
    icon: "spark",
    title: "Subscription",
    description: "Your plan, trial, upgrades and payments to MedMate.",
    href: "/subscription",
  },
  {
    icon: "gear",
    title: "Settings",
    description: "Your PIN, the clinic profile and the prescription letterhead.",
    href: "/settings",
  },
];

/** The badges in the sidebar: how many people are waiting on each station. */
export const navCounts: Record<string, number> = {
  "/nurse": 2,
  "/queue": 4,
  "/inbox": 6,
  "/desk": 1,
  "/billing": 3,
  "/schedule": 5,
  "/doctors": 3,
  "/staff": 3,
  "/locations": 2,
};
