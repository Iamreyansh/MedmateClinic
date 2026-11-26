import { apiGet } from "@/services/api";

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
