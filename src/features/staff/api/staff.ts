import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";

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

/* ------------------------------------------------------------------ the team */

/** A person on the team, as the team screen reads them. */
export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  /** The role's name — nurse, front_desk, admin. */
  role: string;
  /** The role's name, the way the screen shows it. */
  roleName: string;
  /** How far the person may go. */
  level: "none" | "view" | "use";
  /** What they do, in a line. */
  detail: string;
  email: string;
  mobile: string;
  active: boolean;
};

export type TeamPayload = {
  items: TeamMember[];
  meta: { total: number };
};

export const fetchTeam = (search?: string) =>
  apiGet<TeamPayload>(`/clinic/admin/members${search ? `?search=${encodeURIComponent(search)}` : ""}`);

/** What the clinic is adding somebody for. */
export type MemberDraft = {
  name: string;
  mobile: string;
  email: string;
  role: string;
  speciality: string;
  registration: string;
};

export const addMember = (member: MemberDraft) =>
  apiPost<TeamPayload>("/clinic/admin/members", member);

export const updateMember = (memberId: string, member: MemberDraft) =>
  apiPut<TeamPayload>(`/clinic/admin/members/${memberId}`, member);

/* ------------------------------------------------------------- person access */

/** What one person may open, and the exception the clinic made for them. */
export type MemberAccess = {
  staffId: string;
  name: string;
  role: string;
  roleId: string;
  /** The effective access: the role's, with the exception laid over it. */
  capabilities: Record<string, string>;
  /** What the role alone holds. */
  roleCapabilities: Record<string, string>;
  /** The exception. */
  overrides: Record<string, string>;
  levels: string[];
  /** The screens the clinic has, and the level the role gives them. */
  resources: Record<string, string>;
};

export const fetchMemberAccess = (memberId: string) =>
  apiGet<{ items: MemberAccess[]; meta: { total: number } }>(
    `/clinic/admin/members/${memberId}/access`,
  );

export const saveMemberAccess = (
  memberId: string,
  access: { role?: string; overrides?: Record<string, string> },
) => apiPut<{ items: MemberAccess[]; meta: { total: number } }>(
  `/clinic/admin/members/${memberId}/access`,
  access,
);

/* ------------------------------------------------------- the roles & access */

/** One of the clinic's roles, and what it may open. */
export type ClinicRole = {
  id: string;
  name: string;
  label: string;
  owner: boolean;
  /** How many people hold it. */
  people: number;
  /** The screens it may open, and how far. */
  capabilities: Record<string, string>;
};

/** One column of the matrix. */
export type CapabilityScreen = {
  resource: string;
  label: string;
  group: string;
  /** Whether the law closes it to everybody but the treating doctor. */
  locked: boolean;
  note: string;
};

export const fetchRoles = () =>
  apiGet<{ items: ClinicRole[]; meta: { total: number } }>("/clinic/admin/roles");

export const fetchScreens = () =>
  apiGet<{ items: CapabilityScreen[]; meta: { total: number } }>("/clinic/admin/screens");

/* -------------------------------------------------------------- the profiles */

/** A profile the clinic adds people from. */
export type ClinicProfileTemplate = {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  speciality: string;
  registration: string;
  hprId: string;
  consultationFee: number;
  videoFee: number;
  sessionStart: string;
  sessionEnd: string;
};

export type ProfileDraft = {
  name: string;
  role: string;
  speciality: string;
  registration: string;
  hprId: string;
  consultationFee: number;
  videoFee: number;
  sessionStart: string;
  sessionEnd: string;
};

export const fetchProfiles = () =>
  apiGet<{ items: ClinicProfileTemplate[]; meta: { total: number } }>("/clinic/admin/profiles");

export const addProfile = (profile: ProfileDraft) =>
  apiPost<{ items: ClinicProfileTemplate[]; meta: { total: number } }>(
    "/clinic/admin/profiles",
    profile,
  );

export const updateProfile = (profileId: string, profile: ProfileDraft) =>
  apiPut<{ items: ClinicProfileTemplate[]; meta: { total: number } }>(
    `/clinic/admin/profiles/${profileId}`,
    profile,
  );

export const removeProfile = (profileId: string) =>
  apiDelete<{ items: ClinicProfileTemplate[]; meta: { total: number } }>(
    `/clinic/admin/profiles/${profileId}`,
  );
