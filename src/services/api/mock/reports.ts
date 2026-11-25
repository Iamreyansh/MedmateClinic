/**
 * The reports, as the mock answers them.
 *
 * The shapes are the ones `ReportsService` returns: four views of one range,
 * each with its own KPIs, charts and lists. The numbers are computed from the
 * mock's own state so the screen's totals agree with the queue, the visits and
 * the invoices.
 */

import {
  clinic,
  doctors,
  invoices,
  labOrders,
  patients,
  prescriptions,
  timeline,
  visits,
  type MockPatient,
} from "@/services/api/mock/state";

/** "d MMM" — the short form the charts use. */
function shortDay(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** The days of the range, as the API returns them. */
export function daysInRange(from: string, to: string): Date[] {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const days: Date[] = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return days;
}

/** The same length, immediately before. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousTo = new Date(start);
  previousTo.setDate(previousTo.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousFrom.getDate() - (days - 1));
  return { from: iso(previousFrom), to: iso(previousTo) };
}

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The range, as the API describes it. */
export function describeRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previous = previousRange(from, to);
  const previousStart = new Date(`${previous.from}T00:00:00`);
  const previousEnd = new Date(`${previous.to}T00:00:00`);

  const label =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      ? `${start.getDate()} – ${shortDay(end)}`
      : `${shortDay(start)} – ${shortDay(end)}`;
  const previousLabel =
    previousStart.getMonth() === previousEnd.getMonth() &&
    previousStart.getFullYear() === previousEnd.getFullYear()
      ? `${previousStart.getDate()} – ${shortDay(previousEnd)}`
      : `${shortDay(previousStart)} – ${shortDay(previousEnd)}`;

  return {
    from,
    to,
    days,
    label,
    previousFrom: previous.from,
    previousTo: previous.to,
    previousLabel,
    zone: "Asia/Kolkata",
  };
}

/** One KPI, with its comparison against the period before. */
function kpi(
  key: string,
  label: string,
  value: number,
  before: number,
  hint: string,
  suffix = "",
) {
  const delta = Math.round((value - before) * 100) / 100;
  return {
    key,
    label,
    value: Math.round(value * 100) / 100,
    suffix,
    hint,
    previous: Math.round(before * 100) / 100,
    delta,
    deltaShare: before === 0 ? null : Math.round(((value - before) / before) * 1000) / 10,
  };
}

/** The patients the mock knows about, for the report's rows. */
const patientsById = new Map<string, MockPatient>(patients.map((item) => [item.id, item]));

export type ReportQueryInput = {
  tab: string;
  from: string;
  to: string;
  doctor?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

/** The whole report: the range, the doctors, and the one view that was asked for. */
export function buildReport(query: ReportQueryInput) {
  const tab = query.tab || "summary";
  const tabs = ["summary", "bookings", "clinical", "consults"];
  const range = describeRange(query.from, query.to);
  const doctorList = doctors.map((person) => ({
    id: person.id,
    name: person.name,
    speciality: person.speciality,
  }));

  const body: Record<string, unknown> = {
    tab,
    tabs,
    range,
    doctors: doctorList,
    generatedAt: new Date().toISOString(),
  };

  if (tab === "summary") body.summary = buildSummary(query);
  if (tab === "bookings") body.bookings = buildBookings(query);
  if (tab === "clinical") body.clinical = buildClinical(query);
  if (tab === "consults") body.consults = buildConsults(query);

  return body;
}

// ------------------------------------------------------------------- summary

function buildSummary(query: ReportQueryInput) {
  const signed = signedPrescriptions(query);
  const consultations = signed.length;
  const before = Math.max(0, Math.round(consultations * 0.82));

  const money = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + invoice.total, 0);
  const moneyBefore = Math.round(money * 0.9);

  const newPatients = patients.length;
  const newPatientsBefore = Math.max(0, newPatients - 2);

  const waits = visits
    .filter((visit) => visit.waitedMinutes != null)
    .map((visit) => visit.waitedMinutes as number);
  const averageWait = waits.length
    ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10
    : 0;
  const averageWaitBefore = Math.round(averageWait * 1.15 * 10) / 10;

  const noShows = 3;
  const noShowsBefore = 5;

  const days = daysInRange(query.from, query.to);

  return {
    kpis: [
      kpi("consultations", "Consultations", consultations, before, "signed in this period"),
      kpi("money", "Money collected", money, moneyBefore, "paid invoices"),
      kpi("newPatients", "New patients", newPatients, newPatientsBefore, "first time here"),
      kpi(
        "averageWait",
        "Average wait",
        averageWait,
        averageWaitBefore,
        "minutes, before the doctor called them in",
        " min",
      ),
      kpi("noShows", "No-shows", noShows, noShowsBefore, "booked and did not come"),
    ],
    moneyByDay: days.map((day, index) => ({
      date: iso(day),
      label: shortDay(day),
      // the money comes in through the month, not evenly
      amount: index % 3 === 0 ? 0 : 1500 + index * 250,
    })),
    byDoctor: doctors.map((person, index) => ({
      doctorId: person.id,
      name: person.name,
      consultations: Math.max(1, signed.length - index * 2),
      amount: 4200 - index * 900,
      waitMinutes: 14 + index * 6,
    })),
    byPayMode: [
      { mode: "upi", label: "UPI", count: 12, amount: 4200, share: 62.5 },
      { mode: "cash", label: "Cash", count: 5, amount: 1600, share: 23.8 },
      { mode: "card", label: "Card", count: 3, amount: 920, share: 13.7 },
    ],
    topDiagnoses: [
      { code: "J02.9", label: "Acute pharyngitis", count: 14 },
      { code: "B34.9", label: "Viral fever", count: 11 },
      { code: "J06.9", label: "Acute upper respiratory infection", count: 8 },
      { code: "E11", label: "Type 2 diabetes", count: 6 },
      { code: "N39.0", label: "Urinary infection", count: 4 },
    ],
    topMedicines: [
      { name: "Azithromycin 500 mg tablet", generic: "AZITHROMYCIN (500MG)", count: 14 },
      { name: "Paracetamol 650 mg tablet", generic: "PARACETAMOL (650MG)", count: 12 },
      { name: "Chlorhexidine 0.2% gargle", generic: "CHLORHEXIDINE (0.2%)", count: 9 },
      { name: "ORS sachet", generic: "ORAL REHYDRATION SALTS", count: 7 },
      { name: "Metformin 500 mg tablet", generic: "METFORMIN (500MG)", count: 6 },
    ],
  };
}

// ------------------------------------------------------------------ bookings

function buildBookings(_query: ReportQueryInput) {
  const hours = [9, 10, 11, 12, 16, 17, 18, 19];
  const busiest = hours.map((hour, index) => ({
    hour,
    label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "pm" : "am"}`,
    count: Math.max(0, [6, 11, 9, 4, 8, 7, 5, 2][index] ?? 0),
  }));

  const followUps = {
    due: 9,
    came: 4,
    cameShare: "44%",
    upcoming: 3,
    missed: 2,
    missedPatients: [
      { patientId: "pt_ishaan", name: "Ishaan Pai", phone: "+91 98450 03344", due: "2026-11-28T00:00:00Z" },
      { patientId: "pt_fathima", name: "Fathima Begum", phone: "+91 98450 06677", due: "2026-11-30T00:00:00Z" },
    ],
  };

  return {
    kpis: [
      kpi("booked", "Booked", 23, 19, "appointments in this period"),
      kpi("came", "Came", 17, 14, "77% of those booked"),
      kpi("noShows", "No-shows", 3, 5, "13% of those booked"),
      kpi(
        "averageWait",
        "Average wait",
        19,
        24,
        "minutes, before the doctor called them in",
        " min",
      ),
      kpi("online", "Booked online", 6, 4, "26% of those booked"),
    ],
    busiestHours: busiest,
    waitByDoctor: [
      { name: "Dr. Ananya Rao", minutes: 14 },
      { name: "Dr. Vikram Shenoy", minutes: 19 },
      { name: "Dr. Meghana Iyer", minutes: 26 },
    ],
    followUps,
  };
}

// ------------------------------------------------------------------ clinical

function buildClinical(query: ReportQueryInput) {
  const signed = signedPrescriptions(query);

  return {
    kpis: [
      kpi("signed", "Prescriptions signed", signed.length, Math.max(0, signed.length - 3), "in this period"),
      kpi(
        "antibioticRate",
        "Antibiotic rate",
        signed.length ? 46 : 0,
        0,
        "% of prescriptions carry one",
        "%",
      ),
      kpi("alerts", "Safety alerts shown", 5, 0, "the doctor was warned"),
      kpi("overridden", "Overridden with a reason", 2, 0, "the doctor went ahead anyway"),
      kpi("tests", "Tests ordered", labOrders.length + 9, 0, "to the lab desk"),
    ],
    topDiagnoses: [
      { code: "J02.9", label: "Acute pharyngitis", count: 14 },
      { code: "B34.9", label: "Viral fever", count: 11 },
      { code: "J06.9", label: "Acute upper respiratory infection", count: 8 },
      { code: "E11", label: "Type 2 diabetes", count: 6 },
      { code: "N39.0", label: "Urinary infection", count: 4 },
    ],
    topMedicines: [
      { name: "Azithromycin 500 mg tablet", generic: "AZITHROMYCIN (500MG)", count: 14 },
      { name: "Paracetamol 650 mg tablet", generic: "PARACETAMOL (650MG)", count: 12 },
      { name: "Chlorhexidine 0.2% gargle", generic: "CHLORHEXIDINE (0.2%)", count: 9 },
      { name: "ORS sachet", generic: "ORAL REHYDRATION SALTS", count: 7 },
      { name: "Metformin 500 mg tablet", generic: "METFORMIN (500MG)", count: 6 },
    ],
    alerts: [
      { kind: "duplicate_ingredient", label: "Duplicate ingredient", count: 2 },
      { kind: "allergy_conflict", label: "Allergy conflict", count: 1 },
      { kind: "antibiotic_for_viral_illness", label: "Antibiotic for likely viral illness", count: 2 },
    ],
    overrideReasons: [
      { reason: "Suspected bacterial superinfection", count: 1 },
      { reason: "Previous response to this antibiotic", count: 1 },
    ],
  };
}

// ------------------------------------------------------------------ consults

/** The prescriptions that were signed, as the consult list reads them. */
function signedPrescriptions(query: ReportQueryInput) {
  return prescriptions.filter((prescription) => {
    if (prescription.status !== "signed") return false;
    if (query.doctor && query.doctor !== "dr_ananya") return false;
    return true;
  });
}

function buildConsults(query: ReportQueryInput) {
  const search = (query.q ?? "").trim().toLowerCase();

  const rows = timeline.map((entry, index) => {
    const person = patientsById.get(index === 0 ? "pt_kavya" : "pt_diya");
    const billStatus: string = index === 0 ? "paid" : index === 1 ? "unpaid" : "paid";
    const billAmount = index === 0 ? 500 : 300;
    return {
      date: entry.date.includes(",") ? "25 Nov 2026" : entry.date,
      token: index === 0 ? "A-014" : `T-${104 - index}`,
      patient: person?.name ?? "—",
      doctor: entry.doctor,
      diagnosis: entry.diagnosis,
      waitedMinutes: 14 + index * 5,
      consultMinutes: 8 + index,
      billStatus,
      billAmount,
      billLabel:
        billStatus === "paid"
          ? `Paid ₹${billAmount.toLocaleString("en-IN")}`
          : billStatus === "refunded"
            ? "Refunded"
            : `₹${billAmount.toLocaleString("en-IN")} due`,
    };
  });

  const filtered = search
    ? rows.filter((row) =>
        [row.token, row.patient, row.doctor, row.diagnosis]
          .filter(Boolean)
          .some((cell) => String(cell).toLowerCase().includes(search)),
      )
    : rows;

  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 200) : 20;
  const offset = query.offset && query.offset > 0 ? query.offset : 0;
  const page = filtered.slice(offset, offset + limit);

  return {
    total: filtered.length,
    from: offset + 1,
    to: offset + page.length,
    hasMore: offset + page.length < filtered.length,
    nextOffset: offset + page.length,
    rows: page,
  };
}

/** The clinic, for the report's own footer. */
export const reportClinic = clinic;
