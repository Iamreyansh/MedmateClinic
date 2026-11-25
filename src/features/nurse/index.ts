export { NurseScreen } from "@/features/nurse/components/NurseScreen";
export { NurseCard } from "@/features/nurse/components/NurseCard";
export { TakeVitalsDialog } from "@/features/nurse/components/TakeVitalsDialog";
export { fetchNurseStation, fetchNurseDoctors, recordVitals } from "@/features/nurse/api/nurse";
export type {
  NurseCounts,
  NurseDoctor,
  NurseItem,
  NursePayload,
  NursePatient,
  NursePriority,
  NurseVitals,
  VitalsPayload,
  VitalsResult,
} from "@/features/nurse/types";
