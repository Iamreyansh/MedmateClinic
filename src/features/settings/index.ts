export { SettingsScreen } from "@/features/settings/components/SettingsScreen";
export {
  acceptAgreement,
  addPharmacy,
  connectPayments,
  fetchAgreements,
  fetchDevice,
  fetchPharmacies,
  fetchReadiness,
  fetchSettings,
  removePharmacy,
  savePin,
  saveSettings,
  updatePharmacy,
} from "@/features/settings/api/settings";
export type {
  Agreement,
  ClinicSettings,
  DeviceState,
  Pharmacy,
  PharmacyDraft,
  PharmacyPayload,
  Readiness,
  ReadinessCheck,
  SettingsDraft,
  SettingsPayload,
} from "@/features/settings/api/settings";
