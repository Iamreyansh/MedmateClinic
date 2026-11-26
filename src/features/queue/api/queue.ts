import { apiGet, apiPost } from "@/services/api";
import type { Queue } from "@/features/queue/types";

/**
 * The doctor’s queue for today.
 *
 * The console can be opened on one doctor: the service then answers with that
 * doctor’s queue only.
 */
export const fetchQueue = (doctorId?: string) =>
  apiGet<Queue>(doctorId ? `/clinic/queue?doctor=${encodeURIComponent(doctorId)}` : "/clinic/queue");

/** The doctors a patient can be sent to. */
export const fetchDoctors = () =>
  apiGet<Array<{ id: string; name: string; speciality: string }>>("/clinic/doctors");

/** What the front desk types to check a patient in. */
export type CheckInPayload = {
  name: string;
  age: string;
  sex: string;
  phone: string;
  reason: string;
  mode: string;
  doctor: string;
};

/** What the API answers with when a patient is checked in. */
export type CheckInResult = {
  visit: { id: string; token: string; status: string; reason: string | null };
  token: string;
  patient: { id: string; name: string; age: number; sex: string; phone: string };
  doctor: string;
};

/** Check a patient in at the counter. */
export const checkInPatient = (payload: CheckInPayload) =>
  apiPost<CheckInResult>("/clinic/check-ins", payload);
