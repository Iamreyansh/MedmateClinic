export { ConsultScreen } from "@/features/consult/components/ConsultScreen";
export { ConsultView } from "@/features/consult/components/ConsultView";
export { SafetyPanel } from "@/features/consult/components/SafetyPanel";
export { SafetyCheckDialog } from "@/features/consult/components/SafetyCheckDialog";
export { MedicineSearch } from "@/features/consult/components/MedicineSearch";
export { SendToPharmacyDialog } from "@/features/consult/components/SendToPharmacyDialog";
export { ReferToColleagueDialog } from "@/features/consult/components/ReferToColleagueDialog";
export { WriteCertificateDialog } from "@/features/consult/components/WriteCertificateDialog";
export { PatientHistoryDrawer } from "@/features/consult/components/PatientHistoryDrawer";
export {
  safetyFindings,
  safetySummary,
  blockingFindings,
  acknowledgementsNeeded,
  centorScore,
} from "@/features/consult/safety";
export type { SafetyFinding, SafetyLevel } from "@/features/consult/safety";
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
