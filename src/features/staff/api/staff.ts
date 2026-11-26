import { apiGet } from "@/services/api";

/**
 * The clinic's staff, and what each person may open.
 *
 * The roles come from the grants the service holds, so the screen shows the
 * access the clinic actually has rather than a role name it assumes.
 */
export type StaffMember = {
  id: string;
  name: string;
  initials: string;
  /** The role's name — doctor, front desk, nurse, owner. */
  role: string;
  /** How far the person may go. */
  level: "view" | "use";
  /** What they do, in a line. */
  detail?: string | null;
  email?: string | null;
};

export type StaffPayload = {
  items: StaffMember[];
  meta: string;
};

export const fetchStaff = () => apiGet<StaffPayload>("/clinic/staff");

/** The activity log, for the second tab. */
export type ActivityEvent = {
  id: string;
  action: string;
  category: string;
  resourceType: string;
  resourceId: string;
  actor: string | null;
  role: string | null;
  detail: string;
  ip: string | null;
  at: string;
};

export const fetchActivity = () =>
  apiGet<{ events: ActivityEvent[]; count: number }>("/clinic/activity");
