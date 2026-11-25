import { apiGet, apiPost } from "@/services/api";
import type {
  ConsultationPayload,
  DiagnosisLine,
  MedicineLine,
  SignedResult,
  TestLine,
  Visit,
  VisitPatient,
  VisitResponse,
  Vitals,
} from "@/types/visit";

export type {
  ConsultationPayload,
  DiagnosisLine,
  MedicineLine,
  SignedResult,
  TestLine,
  Visit,
  VisitPatient,
  VisitResponse,
  Vitals,
};

/** The visit, the patient, the vitals and the draft consultation. */
export const fetchVisit = (visitId: string) => apiGet<VisitResponse>(`/clinic/visits/${visitId}`);

/** Save what the doctor has written so far. */
export const saveConsultation = (visitId: string, payload: ConsultationPayload) =>
  apiPost<{ consultationId: string; prescriptionId: string; status: string }>(
    `/clinic/visits/${visitId}/consult`,
    payload,
  );

/** Sign the prescription. One transaction on the server. */
export const signPrescription = (prescriptionId: string, signatureMode = "test") =>
  apiPost<SignedResult>(`/clinic/prescriptions/${prescriptionId}/sign`, { signatureMode });
