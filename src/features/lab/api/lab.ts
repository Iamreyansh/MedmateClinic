import { apiGet, apiPost } from "@/services/api";
import type { LabPayload, LabResultPayload, LabResultResponse } from "@/features/lab/types";

/** The lab: the samples on the bench, and what has been reported. */
export const fetchLab = () => apiGet<LabPayload>("/clinic/lab");

/**
 * Report a result.
 *
 * The result goes back to the doctor who ordered the test, marked against the
 * range it was read against.
 */
export const reportLabResult = (payload: LabResultPayload) =>
  apiPost<LabResultResponse>("/clinic/lab/results", payload);

/**
 * Move a sample on — collected, sent to a partner lab, or received back.
 *
 * The status of a sample is the technician's job, and the bench has to be
 * able to show where each one is.
 */
export const moveLabOrder = (orderId: string, status: string, partner?: string) =>
  apiPost<{ orderId: string; status: string; partner: string | null }>(
    `/clinic/lab/orders/${orderId}`,
    { status, partner },
  );
