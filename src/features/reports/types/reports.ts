/** The reports, as the API sends them. */

export type ReportTab = "summary" | "bookings" | "clinical" | "consults";

export type ReportKpi = {
  key: string;
  label: string;
  value: number;
  suffix: string;
  hint: string;
  previous: number;
  delta: number;
  deltaShare: number | null;
};

export type ReportRange = {
  from: string;
  to: string;
  days: number;
  label: string;
  previousFrom: string;
  previousTo: string;
  previousLabel: string;
  zone: string;
};

export type ReportDoctor = { id: string; name: string; speciality: string | null };

export type MoneyByDay = { date: string; label: string; amount: number };

export type ByDoctor = {
  doctorId: string | null;
  name: string;
  consultations: number;
  amount: number;
  waitMinutes: number | null;
};

export type ByPayMode = {
  mode: string;
  label: string;
  count: number;
  amount: number;
  share: number;
};

export type DiagnosisCount = { code: string | null; label: string; count: number };

export type MedicineCount = { name: string; generic: string | null; count: number };

export type SummaryReport = {
  kpis: ReportKpi[];
  moneyByDay: MoneyByDay[];
  byDoctor: ByDoctor[];
  byPayMode: ByPayMode[];
  topDiagnoses: DiagnosisCount[];
  topMedicines: MedicineCount[];
};

export type HourCount = { hour: number; label: string; count: number };

export type WaitByDoctor = { name: string; minutes: number | null };

export type MissedFollowUp = {
  patientId: string;
  name: string;
  phone: string | null;
  due: string | null;
};

export type FollowUps = {
  due: number;
  came: number;
  cameShare: string;
  upcoming: number;
  missed: number;
  missedPatients: MissedFollowUp[];
};

export type BookingsReport = {
  kpis: ReportKpi[];
  busiestHours: HourCount[];
  waitByDoctor: WaitByDoctor[];
  followUps: FollowUps;
};

export type SafetyAlertCount = { kind: string; label: string; count: number };

export type OverrideReason = { reason: string; count: number };

export type ClinicalReport = {
  kpis: ReportKpi[];
  topDiagnoses: DiagnosisCount[];
  topMedicines: MedicineCount[];
  alerts: SafetyAlertCount[];
  overrideReasons: OverrideReason[];
};

export type ConsultRow = {
  date: string | null;
  token: string;
  patient: string;
  doctor: string | null;
  diagnosis: string | null;
  waitedMinutes: number | null;
  consultMinutes: number | null;
  billStatus: string;
  billAmount: number;
  billLabel: string;
};

export type ConsultsReport = {
  total: number;
  from: number;
  to: number;
  hasMore: boolean;
  nextOffset: number;
  rows: ConsultRow[];
};

export type ReportPayload = {
  tab: ReportTab;
  tabs: ReportTab[];
  range: ReportRange;
  doctors: ReportDoctor[];
  generatedAt: string;
  summary?: SummaryReport;
  bookings?: BookingsReport;
  clinical?: ClinicalReport;
  consults?: ConsultsReport;
};

export type ReportQuery = {
  tab: ReportTab;
  from: string;
  to: string;
  doctor?: string;
  q?: string;
  limit?: number;
  offset?: number;
};
