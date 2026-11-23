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

export type ChecklistItem = {
  title: string;
  detail: string;
  done?: boolean;
  action?: string;
  href?: string;
};

export type Station = {
  icon: IconName;
  tone: IconTone;
  title: string;
  description: string;
  tag: string;
};

export const clinic: Clinic = {
  name: "Sunrise Family Clinic",
  initials: "SF",
  locations: 1,
  doctors: 1,
};

export const location = "Koramangala";

export const signedIn: SignedInUser = {
  name: "Dr. Ananya Rao",
  initials: "AR",
  detail: "Owner · General Medicine",
  tone: "doctor",
};

/** "Dr. Ananya Rao" → "Ananya", for the welcome line. */
export const firstName = signedIn.name.replace(/^Dr\.?\s*/, "").split(" ")[0];

export const welcome = {
  headline: `Welcome to MedMate, ${firstName}`,
  body: "Sunrise Family Clinic is set up. Your 14-day free trial of the full Clinic plan has started — nothing is charged.",
};

export const firstPatient: {
  title: string;
  done: number;
  total: number;
  items: ChecklistItem[];
} = {
  title: "Get ready for your first patient",
  done: 2,
  total: 6,
  items: [
    { title: "Clinic details and agreements", detail: "Done at sign-up", done: true },
    { title: "You, as the first doctor", detail: "HPR verified · fees set", done: true },
    {
      title: "Add your letterhead",
      detail: "Logo and address on every prescription",
      action: "Set up",
      href: "/settings",
    },
    { title: "Add the other doctors", detail: "By their HPR ID", action: "Add doctors", href: "/doctors" },
    {
      title: "Add your front desk and nurse",
      detail: "Each signs in with their own mobile",
      action: "Add staff",
      href: "/staff",
    },
    { title: "Set your PIN", detail: "Unlocks this screen after it locks", action: "Set PIN", href: "/settings" },
  ],
};

export const stations: Station[] = [
  {
    icon: "kiosk",
    tone: "blue",
    title: "Patient Kiosk",
    description: "Patients check in and get a token.",
    tag: "Step 1",
  },
  {
    icon: "stetho",
    tone: "green",
    title: "Doctor Console",
    description: "Consult, prescribe and e-sign.",
    tag: "Step 3",
  },
  {
    icon: "cal",
    tone: "blue",
    title: "Appointments",
    description: "Share your booking link to get bookings.",
    tag: "Bookings",
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
