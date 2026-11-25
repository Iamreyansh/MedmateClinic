import { apiGet, apiPost } from "@/services/api";
import type { DeskPayload } from "@/features/desk/types";

/** The desk for today: who is waiting to be handed over. */
export const fetchDesk = () => apiGet<DeskPayload>("/clinic/desk");

/** Hand a patient over — the prescription, the bill and the follow-up. */
export const checkOut = (visitId: string) =>
  apiPost<{ visitId: string; checkedOut: boolean; invoice?: { id: string; number: string; total: number } }>(
    `/clinic/desk/${visitId}/checkout`,
  );

/** The clinic's public booking link, to share with a patient. */
export const fetchBookingLink = () =>
  apiGet<{ link: string; slug: string; clinic: string; channels: string[] }>(
    "/clinic/desk/booking-link",
  );

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

/** The doctors a patient can be sent to. */
export const fetchDoctors = () =>
  apiGet<Array<{ id: string; name: string; speciality: string }>>("/clinic/doctors");
