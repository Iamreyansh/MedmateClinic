import { apiGet, apiPost } from "@/services/api";
import type { AppointmentsPayload } from "@/features/schedule/types";

/**
 * The appointments for a day or a week.
 *
 * `date` is the day the view starts on; `view` is `day` or `week`.
 */
export const fetchAppointments = (params: { date?: string; view?: string; doctor?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.view) query.set("view", params.view);
  if (params.doctor) query.set("doctor", params.doctor);

  const suffix = query.toString();
  return apiGet<AppointmentsPayload>(suffix ? `/clinic/appointments?${suffix}` : "/clinic/appointments");
};

/**
 * Book a visit.
 *
 * The patient may not be in the clinic's records yet — a booking often comes
 * before the first visit — so the name is sent as it was typed and the
 * service creates the patient if it has to.
 */
export const bookAppointment = (booking: {
  patient: string;
  doctor: string;
  date: string;
  time: string;
  reason: string;
}) =>
  apiPost<{ id: string; status: string; startsAt: string; patient: string; doctor: string }>(
    "/clinic/appointments",
    { ...booking, mode: "booking", source: "booking" },
  );
