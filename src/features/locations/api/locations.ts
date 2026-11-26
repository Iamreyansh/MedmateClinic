import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";

/**
 * The clinic's branches.
 *
 * The same shape the settings endpoint answers with, so the letterhead and
 * the branch list never disagree about a place.
 */
export type ClinicLocation = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  /** How many consulting rooms the branch has. */
  rooms: number;
  /** The health facility registration of the branch. */
  hfrId: string;
};

export type LocationsPayload = {
  items: ClinicLocation[];
  meta: string;
};

export const fetchLocations = () => apiGet<LocationsPayload>("/clinic/locations");

/* ------------------------------------------------------------------ branches */

/** A branch, as the locations screen reads it. */
export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  rooms: number;
  hfrId: string;
  /** Whether this is the clinic's main branch. */
  primary: boolean;
  active: boolean;
  /** How many people work at this branch. */
  doctors: number;
};

export type BranchPayload = {
  items: Branch[];
  meta: { total: number };
};

/** What the clinic is adding a branch with. */
export type BranchDraft = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  rooms: number;
  hfrId: string;
};

export const fetchBranches = (search?: string) =>
  apiGet<BranchPayload>(
    `/clinic/admin/locations${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const addBranch = (branch: BranchDraft) =>
  apiPost<BranchPayload>("/clinic/admin/locations", branch);

export const updateBranch = (branchId: string, branch: BranchDraft) =>
  apiPut<BranchPayload>(`/clinic/admin/locations/${branchId}`, branch);

export const removeBranch = (branchId: string) =>
  apiDelete<BranchPayload>(`/clinic/admin/locations/${branchId}`);
