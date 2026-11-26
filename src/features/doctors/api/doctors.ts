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
  /** The registration the doctor signs with. */
  registration?: string | null;
  /** The consultation fee. */
  fee?: number;
  /** The video consultation fee. */
  videoFee?: number;
  /**
   * The hours the doctor works in.
   *
   * The service sends a line — "10:00 – 19:00" — and a clinic with two
   * sessions sends the pair. Both are read.
   */
  hours?: string | string[];
  /** How many patients the doctor has seen today. */
  bookedToday?: number;
  /** How many slots are still free today. */
  freeToday?: number;
  /** The next free slot today. */
  nextFree?: string | null;
  /** How many patients are in consult with the doctor. */
  waiting?: number;
};

export const fetchDoctors = () => apiGet<ClinicDoctor[]>("/clinic/doctors");
