/**
 * The nurse station, as the API sends it.
 *
 * The nurse takes the vitals and routes the patient to a doctor. The shapes
 * live here, in the feature that draws them.
 */

/** How urgent the patient is. Emergencies are seen first. */
export type NursePriority = "normal" | "urgent" | "emergency";

export type NursePatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  initials?: string;
  phone?: string;
};

export type NurseDoctor = {
  id: string;
  name: string;
  speciality: string;
  room: string;
};

export type NurseItem = {
  id: string;
  visitId: string;
  token: string;
  /** The reason the patient gave at check-in. */
  reason: string | null;
  /** What the patient told us — the symptom summary. */
  detail: string | null;
  priority: NursePriority;
  /** How long the patient has been waiting, in minutes. */
  waitedMinutes: number;
  /** The doctor the patient will be sent to. */
  doctor: NurseDoctor | null;
  /** The next doctor with free time, when this patient has none yet. */
  nextDoctor: NurseDoctor | null;
  patient: NursePatient;
  /** The vitals taken so far. Null until the nurse has been. */
  vitals: NurseVitals | null;
  /** Whether the nurse has been and the patient is ready for the doctor. */
  ready: boolean;
};

export type NurseVitals = {
  id: string;
  visitId: string;
  recordedAt: string;
  tempF: number | null;
  /** The blood pressure, "128/82". */
  bp: string | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  spo2: number | null;
  /** The breathing rate, in breaths a minute. */
  breathRate: number | null;
  weightKg: number | null;
  heightCm: number | null;
  sugarMg: number | null;
  note: string | null;
  priority: NursePriority;
  /** The doctor the patient was sent to. */
  sentTo: string | null;
  /** The nurse who took the vitals. */
  recordedBy: string | null;
};

export type NurseCounts = {
  /** How many are waiting for the nurse. */
  needVitals: number;
  /** How many are urgent or an emergency. */
  urgent: number;
  /** How many have their vitals and are ready for the doctor. */
  ready: number;
  /** The longest wait for vitals, in minutes. Null when nobody is waiting. */
  longestWait: number | null;
};

export type NursePayload = {
  counts: NurseCounts;
  items: NurseItem[];
  doctors: NurseDoctor[];
  meta: string;
};

/** What the nurse types into the vitals dialog. */
export type VitalsPayload = {
  visitId: string;
  tempF: string;
  pulse: string;
  spo2: string;
  bpSystolic: string;
  bpDiastolic: string;
  breathRate: string;
  weightKg: string;
  heightCm: string;
  sugarMg: string;
  priority: NursePriority;
  sentTo: string;
  note: string;
};

/** What the API answers with when the vitals are saved. */
export type VitalsResult = {
  visitId: string;
  token: string;
  patient: string;
  /** The vitals as they were recorded. */
  vitals: NurseVitals;
  /** The patient is now ready for the doctor. */
  ready: boolean;
};

/**
 * The normal range of each reading, as the nurse is taught it.
 *
 * The dialog prints these under each field, so a number is read against the
 * range at the moment it is typed rather than remembered.
 */
export const VITAL_RANGES: Record<string, string> = {
  tempF: "97 – 99 °F",
  pulse: "60 – 100 /min",
  spo2: "95 – 100 %",
  bp: "90 – 139 / 60 – 89 mmHg",
  bpSystolic: "90 – 139 mmHg",
  bpDiastolic: "60 – 89 mmHg",
  breathRate: "12 – 20 /min",
  weightKg: "By age",
  heightCm: "By age",
  sugarMg: "70 – 140 mg/dL",
};

/**
 * Read one reading against its range.
 *
 * `high` is out of range above, `low` below, `danger` is far enough out that
 * the nurse should look again. Null when the number is missing or in range.
 */
export function readVital(field: string, value: number | null): "high" | "low" | "danger" | null {
  if (value === null || Number.isNaN(value)) return null;

  switch (field) {
    case "tempF":
      if (value >= 103) return "danger";
      if (value > 99) return "high";
      if (value < 97) return "low";
      return null;
    case "pulse":
      if (value >= 120 || value <= 45) return "danger";
      if (value > 100) return "high";
      if (value < 60) return "low";
      return null;
    case "spo2":
      if (value <= 90) return "danger";
      if (value < 95) return "low";
      return null;
    case "bpSystolic":
      if (value >= 180) return "danger";
      if (value > 139) return "high";
      if (value < 90) return "low";
      return null;
    case "bpDiastolic":
      if (value >= 120) return "danger";
      if (value > 89) return "high";
      if (value < 60) return "low";
      return null;
    case "breathRate":
      if (value >= 25 || value <= 8) return "danger";
      if (value > 20) return "high";
      if (value < 12) return "low";
      return null;
    case "sugarMg":
      if (value >= 200 || value <= 50) return "danger";
      if (value > 140) return "high";
      if (value < 70) return "low";
      return null;
    default:
      return null;
  }
}
