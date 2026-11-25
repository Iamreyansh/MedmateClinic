import { apiGet } from "@/services/api";

/**
 * The clinic's doctors.
 *
 * The service answers with a bare array — the list itself, with no wrapper —
 * so the screen reads the array and never looks for a key.
 */
export type ClinicDoctor = {
  id: string;
  name: string;
  speciality: string;
  /** The room the doctor works in. */
  room?: string | null;
  /** The registration the doctor signs with, when the service sends it. */
  registration?: string | null;
};

export const fetchDoctors = () => apiGet<ClinicDoctor[]>("/clinic/doctors");
