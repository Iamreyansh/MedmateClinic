export { KioskScreen } from "@/features/kiosk/components/KioskScreen";
export { KioskTablet } from "@/features/kiosk/components/KioskTablet";
export { CloseKioskDialog } from "@/features/kiosk/components/CloseKioskDialog";
export {
  fetchKiosk,
  openKiosk,
  closeKiosk,
  sendKioskCode,
  verifyKioskCode,
  setKioskPatient,
  chooseKioskDoctor,
  payKiosk,
  takeKioskToken,
  resetKiosk,
  setKioskLanguage,
} from "@/features/kiosk/api/kiosk";
export type {
  KioskBooking,
  KioskCodePayload,
  KioskDoctor,
  KioskDoctorPayload,
  KioskLanguage,
  KioskMobilePayload,
  KioskPatientPayload,
  KioskPayPayload,
  KioskSession,
  KioskStep,
} from "@/features/kiosk/types";
