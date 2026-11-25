import { apiGet, apiPost } from "@/services/api";
import type {
  KioskCodePayload,
  KioskDoctorPayload,
  KioskMobilePayload,
  KioskPayPayload,
  KioskPatientPayload,
  KioskSession,
} from "@/features/kiosk/types";

/**
 * The kiosk.
 *
 * The kiosk is a device at the front desk. These endpoints are the tablet's
 * own conversation with the clinic, not a staff session — a patient at the
 * kiosk is not signed in, so these do not need a token.
 */

/** The state of the kiosk on this device. */
export const fetchKiosk = () => apiGet<KioskSession>("/kiosk");

/** Open the kiosk on this device. */
export const openKiosk = () => apiPost<KioskSession>("/kiosk/open");

/** Close the kiosk. The front desk does this with their PIN. */
export const closeKiosk = (pin: string) => apiPost<{ closed: boolean }>("/kiosk/close", { pin });

/**
 * Send the code to the patient's phone.
 *
 * The session comes back with it, so the kiosk moves to the code step without
 * a second call. The code itself is in the response in test mode, as the API
 * does.
 */
export const sendKioskCode = (payload: KioskMobilePayload) =>
  apiPost<KioskSession & { sent: boolean }>("/kiosk/code", payload);

/** Verify the code and move the patient on. */
export const verifyKioskCode = (payload: KioskCodePayload) =>
  apiPost<KioskSession>("/kiosk/verify", payload);

/** Say who the patient is. */
export const setKioskPatient = (payload: KioskPatientPayload) =>
  apiPost<KioskSession>("/kiosk/patient", payload);

/** Choose the doctor. */
export const chooseKioskDoctor = (payload: KioskDoctorPayload) =>
  apiPost<KioskSession>("/kiosk/doctor", payload);

/** Pay, if there is anything to pay. */
export const payKiosk = (payload: KioskPayPayload) =>
  apiPost<KioskSession>("/kiosk/pay", payload);

/** Take the token. */
export const takeKioskToken = () => apiPost<KioskSession>("/kiosk/token");

/** Go back to the start — the patient changed their mind. */
export const resetKiosk = () => apiPost<KioskSession>("/kiosk/reset");

/** Change the language the kiosk speaks. */
export const setKioskLanguage = (language: string) =>
  apiPost<KioskSession>("/kiosk/language", { language });
