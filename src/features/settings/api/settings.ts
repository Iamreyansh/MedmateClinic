import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";

/**
 * Connect the clinic's own payment keys.
 *
 * The keys belong to the clinic, so the money goes straight to the clinic
 * rather than through us. The secret is written once and never read back.
 */
export const connectPayments = (keys: { provider: string; keyId: string; secret: string }) =>
  apiPost<{ connected: boolean; provider: string; keyId: string }>(
    "/clinic/subscription/payments",
    keys,
  );

/* ----------------------------------------------------------------- the clinic */

/** The clinic's own record: its letterhead and what it has agreed to. */
export type ClinicSettings = {
  id: string;
  name: string;
  displayName: string;
  initials: string;
  bookingSlug: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  registration: string;
  hfrId: string;
  letterheadNote: string;
  timezone: string;
  locations: number;
  branches: number;
};

export type SettingsPayload = {
  items: ClinicSettings[];
  meta: { total: number };
};

/** What the clinic is changing about itself. */
export type SettingsDraft = {
  displayName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  gstin: string;
  pan: string;
  registration: string;
  letterheadNote: string;
};

export const fetchSettings = () =>
  apiGet<SettingsPayload>("/clinic/admin/settings");

export const saveSettings = (settings: SettingsDraft) =>
  apiPut<SettingsPayload>("/clinic/admin/settings", settings);

/* ----------------------------------------------------------------- the device */

/** This device, and the PIN that unlocks the screen. */
export type DeviceState = {
  pinSet: boolean;
  devices: { id: string; name: string; platform: string; lastSeenAt: string }[];
  locksAfterMinutes: number;
};

export const fetchDevice = () =>
  apiGet<{ items: DeviceState[]; meta: { total: number } }>("/clinic/admin/settings/device");

export const savePin = (pin: { currentPin: string; newPin: string; newPinAgain: string }) =>
  apiPut<{ items: DeviceState[]; meta: { total: number } }>("/clinic/admin/settings/pin", pin);

/* -------------------------------------------------------------- the agreements */

/** An agreement the clinic has been asked to accept. */
export type Agreement = {
  kind: string;
  title: string;
  version: string;
  accepted: boolean;
  acceptedAt: string;
};

export const fetchAgreements = () =>
  apiGet<{ items: Agreement[]; meta: { total: number } }>("/clinic/admin/settings/agreements");

export const acceptAgreement = (kind: string, version: string) =>
  apiPut<{ items: Agreement[]; meta: { total: number } }>(
    `/clinic/admin/settings/agreements/${encodeURIComponent(kind)}`,
    { version },
  );

/* -------------------------------------------------------------- the readiness */

/** One line of the readiness check. */
export type ReadinessCheck = {
  label: string;
  done: boolean;
  detail: string;
  action: string;
};

export type Readiness = {
  done: number;
  total: number;
  groups: { title: string; checks: ReadinessCheck[] }[];
};

export const fetchReadiness = () =>
  apiGet<{ items: Readiness[]; meta: { total: number } }>("/clinic/admin/settings/readiness");

/* --------------------------------------------------------------- the pharmacies */

/** A pharmacy the clinic sends prescriptions to. */
export type Pharmacy = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  contactPerson: string;
  active: boolean;
  /** How many prescriptions have been sent there. */
  prescriptions: number;
};

export type PharmacyPayload = {
  items: Pharmacy[];
  meta: { total: number };
};

/** What the clinic is adding a pharmacy with. */
export type PharmacyDraft = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  contactPerson: string;
  inactive: boolean;
};

export const fetchPharmacies = () =>
  apiGet<PharmacyPayload>("/clinic/admin/pharmacies");

export const addPharmacy = (pharmacy: PharmacyDraft) =>
  apiPost<PharmacyPayload>("/clinic/admin/pharmacies", pharmacy);

export const updatePharmacy = (pharmacyId: string, pharmacy: PharmacyDraft) =>
  apiPut<PharmacyPayload>(`/clinic/admin/pharmacies/${pharmacyId}`, pharmacy);

export const removePharmacy = (pharmacyId: string) =>
  apiDelete<PharmacyPayload>(`/clinic/admin/pharmacies/${pharmacyId}`);
