import { apiGet, apiPost } from "@/services/api";
import type { NursePayload, VitalsPayload, VitalsResult } from "@/features/nurse/types";

/**
 * The nurse station: who is waiting for vitals, and who is ready.
 *
 * The station reads the whole clinic's queue, not one doctor's, so the nurse
 * sees every patient who needs them.
 */
export const fetchNurseStation = () => apiGet<NursePayload>("/clinic/nurse");

/** The doctors a patient can be sent to. */
export const fetchNurseDoctors = () =>
  apiGet<Array<{ id: string; name: string; speciality: string; room: string }>>("/clinic/nurse/doctors");

/**
 * Record the vitals and send the patient to the doctor.
 *
 * Saving marks the patient ready, so they leave the nurse's list and appear
 * in the doctor's.
 */
export const recordVitals = (payload: VitalsPayload) =>
  apiPost<VitalsResult>("/clinic/nurse/vitals", payload);
