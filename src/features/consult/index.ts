export { ConsultScreen } from "@/features/consult/components/ConsultScreen";
export { ConsultView } from "@/features/consult/components/ConsultView";
export {
  loadVisit,
  saveConsult,
  signConsult,
  consultReducer,
} from "@/features/consult/state/consultSlice";
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
} from "@/features/consult/api/consult";
