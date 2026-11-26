import { apiGet, apiPost, apiPut } from "@/services/api";

/**
 * The clinic's doctors.
 *
 * The service answers with a bare array — the list itself, with no wrapper —
 * so the screen reads the array and never looks for a key.
 */
export type ClinicDoctor = {
  id: string;
  name: string;
  speciality: string;
  /** The room the doctor works in. */
  room?: string | null;
  /** The registration the doctor signs with. */
  registration?: string | null;
  /** The consultation fee. */
  fee?: number;
  /** The video consultation fee. */
  videoFee?: number;
  /**
   * The hours the doctor works in.
   *
   * The service sends a line — "10:00 – 19:00" — and a clinic with two
   * sessions sends the pair. Both are read.
   */
  hours?: string | string[];
  /** How many patients the doctor has seen today. */
  bookedToday?: number;
  /** How many slots are still free today. */
  freeToday?: number;
  /** The next free slot today. */
  nextFree?: string | null;
  /** How many patients are in consult with the doctor. */
  waiting?: number;
};

export const fetchDoctors = () => apiGet<ClinicDoctor[]>("/clinic/doctors");

/* ------------------------------------------------------------ the doctor's week */

/** One session of a doctor's week. */
export type DoctorSession = {
  id: string;
  weekday: number;
  weekdayLabel: string;
  start: string;
  end: string;
  slotMinutes: number;
};

/** A stretch of days the doctor is away. */
export type DoctorLeave = {
  id: string;
  from: string;
  to: string;
  reason: string;
};

/** One doctor's week and leave. */
export type DoctorSchedule = {
  staffId: string;
  name: string;
  sessions: DoctorSession[];
  leave: DoctorLeave[];
};

export type SchedulePayload = {
  items: DoctorSchedule[];
  meta: { total: number };
};

export const fetchSchedules = () =>
  apiGet<SchedulePayload>("/clinic/admin/doctors/schedules");

export const fetchSchedule = (doctorId: string) =>
  apiGet<SchedulePayload>(`/clinic/admin/doctors/${doctorId}/schedule`);

export const saveSchedule = (
  doctorId: string,
  schedule: { sessions: unknown[]; leave: unknown[] },
) => apiPut<SchedulePayload>(`/clinic/admin/doctors/${doctorId}/schedule`, schedule);

/* ------------------------------------------------------------ the doctor write */

/** What the clinic is adding a doctor for. */
export type DoctorDraft = {
  name: string;
  mobile: string;
  email: string;
  speciality: string;
  registration: string;
  hprId: string;
  room: string;
  consultationFee: number;
  videoFee: number;
  sessions?: unknown[];
};

/** One doctor, as the doctors screen reads them. */
export type DoctorPayload = {
  items: ClinicDoctor[];
  meta: { total: number };
};

export const addDoctor = (doctor: DoctorDraft) =>
  apiPost<DoctorPayload>("/clinic/admin/doctors", doctor);

export const updateDoctor = (doctorId: string, doctor: DoctorDraft) =>
  apiPut<DoctorPayload>(`/clinic/admin/doctors/${doctorId}`, doctor);

/** What the clinic knows about an HPR id. */
export type HprRecord = {
  id: string;
  name: string;
  speciality: string;
  registration: string;
  hprId: string;
  room: string;
  known: boolean;
};

export const lookupHpr = (hprId: string) =>
  apiGet<{ items: HprRecord[]; meta: { total: number } }>(
    `/clinic/admin/doctors/by-hpr/${encodeURIComponent(hprId)}`,
  );
