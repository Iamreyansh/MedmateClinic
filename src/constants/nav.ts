import type { IconName } from "@/components/ui/Icon";

/**
 * The nav model.
 *
 * Each entry carries the `resource` it needs. Access is decided by the
 * server's capability set — never by the role name — so the menu and the API
 * cannot disagree. See docs/ROLE-MODEL.md.
 */
export type Resource =
  | "kiosk"
  | "nurse"
  | "console"
  | "inbox"
  | "desk"
  | "billing"
  | "lab"
  | "tele"
  | "appointment"
  | "report"
  | "patient"
  | "template"
  | "doctor"
  | "staff"
  | "message"
  | "location"
  | "subscription"
  | "settings";

export type NavEntry = {
  label: string;
  href: string;
  icon: IconName;
  resource?: Resource;
  count?: number;
};

export type NavGroup = {
  heading?: string;
  items: NavEntry[];
};

export const nav: NavGroup[] = [
  {
    // the dashboard counts the clinic's work, so it needs the reporting
    // capability — a front desk or a nurse may not open it
    items: [{ label: "Dashboard", href: "/dashboard", icon: "home", resource: "report" }],
  },
  {
    heading: "Stations",
    items: [
      { label: "Patient Kiosk", href: "/kiosk", icon: "kiosk", resource: "kiosk" },
      { label: "Nurse Station", href: "/nurse", icon: "nurse", resource: "nurse" },
      { label: "Doctor Console", href: "/queue", icon: "stetho", resource: "console" },
      { label: "Inbox", href: "/inbox", icon: "inbox", resource: "inbox" },
      { label: "Reception Desk", href: "/desk", icon: "print", resource: "desk" },
      { label: "Billing & POS", href: "/billing", icon: "rupee", resource: "billing" },
      { label: "Lab & Diagnostics", href: "/lab", icon: "lab", resource: "lab" },
      { label: "Teleconsult", href: "/teleconsult", icon: "video", resource: "tele" },
      { label: "Appointments", href: "/schedule", icon: "cal", resource: "appointment" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Reports", href: "/reports", icon: "chart", resource: "report" },
      { label: "Patients & Rx", href: "/patients", icon: "folder", resource: "patient" },
      { label: "My templates", href: "/templates", icon: "rx", resource: "template" },
      { label: "Doctors", href: "/doctors", icon: "stetho", resource: "doctor" },
      { label: "Staff & roles", href: "/staff", icon: "users", resource: "staff" },
      { label: "Patient messages", href: "/messages", icon: "send", resource: "message" },
      { label: "Locations", href: "/locations", icon: "pin", resource: "location" },
      { label: "Subscription", href: "/subscription", icon: "spark", resource: "subscription" },
      { label: "Settings", href: "/settings", icon: "gear", resource: "settings" },
    ],
  },
];

/**
 * The routes that exist today.
 *
 * Every path in the nav has a route, so a link never leads to a blank page:
 * the screens that are not built yet have a placeholder that says so. This
 * set is what the shell uses to know a link is safe to follow.
 */
export const builtRoutes = new Set<string>([
  "/",
  "/login",
  "/start",
  "/lock",
  "/dashboard",
  "/queue",
  "/visit/:id",
  "/patients",
  "/patients/:id",
  "/inbox",
  "/teleconsult",
  "/templates",
  "/rx/:id",
  "/certificate",
  "/reports",
  "/kiosk",
  "/nurse",
  "/desk",
  "/billing",
  "/lab",
  "/schedule",
  "/doctors",
  "/staff",
  "/messages",
  "/locations",
  "/subscription",
  "/settings",
  "/legal/:document",
  "/fidelity",
]);

/** The sidebar footer, as the MVP has it. */
export const sideActions: NavEntry[] = [
  { label: "My account", href: "/account", icon: "users" },
  { label: "Lock · switch user", href: "/lock", icon: "lock" },
];
