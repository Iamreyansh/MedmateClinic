import { apiGet } from "@/services/api";
import type { PatientListPayload } from "@/features/patients/types";

/**
 * The patient list.
 *
 * The whole list comes back in one payload and the screen narrows it: the
 * search box and the filter chips both work on what the server sent, so the
 * screen behaves the same whether the server narrowed it first or not.
 */
export const fetchPatientList = (
  options: { q?: string; filter?: string; signal?: AbortSignal } = {},
) => {
  const query = new URLSearchParams();
  if (options.q) query.set("q", options.q);
  if (options.filter && options.filter !== "everyone") query.set("filter", options.filter);
  const suffix = query.toString();
  return apiGet<PatientListPayload>(`/clinic/patients${suffix ? `?${suffix}` : ""}`, {
    signal: options.signal,
  });
};

/** The doctors a patient can be sent to. */
export const fetchDoctors = () =>
  apiGet<Array<{ id: string; name: string; speciality: string }>>("/clinic/doctors");
