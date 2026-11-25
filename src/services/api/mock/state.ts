/**
 * The mock's state.
 *
 * One store, shared by every endpoint, so the screens agree with each other:
 * the patient in the queue is the patient in the consult, and signing the
 * prescription moves the visit, raises the bill and books the follow-up.
 *
 * The shapes here are the shapes the Java API returns — read from
 * `ConsultService`, `ReportsService` and `MeController` — so the switch to the
 * real service is one flag, not a rewrite.
 */

import type { IconName } from "@/components/ui/Icon";
import type { IconTone } from "@/lib/design/tokens";

// ------------------------------------------------------------------ the clinic

export type MockClinic = {
  id: string;
  name: string;
  initials: string;
  locations: number;
  doctors: number;
};

export type MockUser = {
  id: string;
  name: string;
  initials: string;
  detail: string;
  tone: "doctor";
};

export const clinic: MockClinic = {
  id: "clinic_medmate_indiranagar",
  name: "MedMate Clinic",
  initials: "MC",
  locations: 2,
  doctors: 3,
};

export const location = "Indiranagar";

export const signedInUser: MockUser = {
  id: "dr_ananya",
  name: "Dr. Ananya Rao",
  initials: "AR",
  detail: "Owner · General Medicine",
  tone: "doctor",
};

/** What the signed-in person may open, and how far. */
export const capabilities: Record<string, "view" | "use"> = {
  kiosk: "use",
  nurse: "use",
  console: "use",
  inbox: "use",
  desk: "use",
  billing: "use",
  lab: "use",
  tele: "use",
  appointment: "use",
  report: "view",
  patient: "use",
  template: "use",
  doctor: "use",
  staff: "use",
  message: "use",
  location: "use",
  subscription: "use",
  settings: "use",
  clinical: "view",
};

/** The badges in the sidebar. */
export const navCounts: Record<string, number> = {
  "/nurse": 2,
  "/queue": 4,
  "/inbox": 6,
  "/desk": 1,
  "/billing": 3,
  "/schedule": 5,
  "/doctors": 3,
  "/staff": 3,
  "/locations": 2,
};

// ------------------------------------------------------------------ the people

export type MockDoctor = {
  id: string;
  name: string;
  initials: string;
  speciality: string;
  room: string;
  registration: string;
  hpr: string;
};

export const doctors: MockDoctor[] = [
  {
    id: "dr_ananya",
    name: "Dr. Ananya Rao",
    initials: "AR",
    speciality: "General Medicine",
    room: "Room 2",
    registration: "Reg. KMC 84213",
    hpr: "HPR 71-4421-8890-3326",
  },
  {
    id: "dr_vikram",
    name: "Dr. Vikram Shenoy",
    initials: "VS",
    speciality: "Pediatrics",
    room: "Room 3",
    registration: "Reg. KMC 71840",
    hpr: "HPR 71-2233-8890-1104",
  },
  {
    id: "dr_meghana",
    name: "Dr. Meghana Iyer",
    initials: "MI",
    speciality: "Obstetrics & Gynaecology",
    room: "Room 1",
    registration: "Reg. KMC 65512",
    hpr: "HPR 71-8890-1122-3344",
  },
];

export type MockPatient = {
  id: string;
  name: string;
  age: number;
  sex: "F" | "M";
  initials: string;
  phone: string;
  abha: string;
  allergies: string[];
  conditions: string[];
  visits: number;
  since: string;
};

export const patients: MockPatient[] = [
  {
    id: "pt_kavya",
    name: "Kavya Nair",
    age: 34,
    sex: "F",
    initials: "KN",
    phone: "+91 98450 01122",
    abha: "kavya.nair@abdm",
    allergies: ["Penicillin (rash)"],
    conditions: ["Type 2 diabetes"],
    visits: 6,
    since: "2024",
  },
  {
    id: "pt_rohit",
    name: "Rohit Menon",
    age: 8,
    sex: "M",
    initials: "RM",
    phone: "+91 98450 02233",
    abha: "rohit.menon@abdm",
    allergies: [],
    conditions: [],
    visits: 2,
    since: "2025",
  },
  {
    id: "pt_ishaan",
    name: "Ishaan Pai",
    age: 3,
    sex: "M",
    initials: "IP",
    phone: "+91 98450 03344",
    abha: "ishaan.pai@abdm",
    allergies: [],
    conditions: [],
    visits: 1,
    since: "2026",
  },
  {
    id: "pt_aarav",
    name: "Aarav Nair",
    age: 6,
    sex: "M",
    initials: "AN",
    phone: "+91 98450 04455",
    abha: "aarav.nair@abdm",
    allergies: [],
    conditions: [],
    visits: 1,
    since: "2026",
  },
  {
    id: "pt_diya",
    name: "Diya Kamath",
    age: 5,
    sex: "F",
    initials: "DK",
    phone: "+91 98450 05566",
    abha: "diya.kamath@abdm",
    allergies: [],
    conditions: [],
    visits: 3,
    since: "2025",
  },
  {
    id: "pt_fathima",
    name: "Fathima Begum",
    age: 27,
    sex: "F",
    initials: "FB",
    phone: "+91 98450 06677",
    abha: "fathima.begum@abdm",
    allergies: [],
    conditions: [],
    visits: 1,
    since: "2026",
  },
];

export const patient = (id: string): MockPatient =>
  patients.find((item) => item.id === id) ?? patients[0];

// ------------------------------------------------------------------- the queue

export type MockVisit = {
  id: string;
  token: string;
  patientId: string;
  status: string;
  mode: string;
  source: string;
  reason: string | null;
  detail: string | null;
  priority: string | null;
  seenBy: string | null;
  waitedMinutes: number | null;
  consultMinutes: number | null;
  createdAt: string;
};

export const visits: MockVisit[] = [
  {
    id: "vs_kavya",
    token: "A-014",
    patientId: "pt_kavya",
    status: "waiting",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Sore throat 3 days, fever 101°F, pain swallowing",
    detail: "Temp 101.2 °F · SpO₂ 98 %",
    priority: "urgent",
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: "2026-11-25T10:18:00Z",
  },
  {
    id: "vs_rohit",
    token: "A-015",
    patientId: "pt_rohit",
    status: "waiting",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Cough 5 days · symptoms filled in",
    detail: "Temp 100.4 °F · SpO₂ 95%",
    priority: null,
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: "2026-11-25T10:32:00Z",
  },
  {
    id: "vs_ishaan",
    token: "B-005",
    patientId: "pt_ishaan",
    status: "waiting",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Rash · booked 11:00",
    detail: "Vitals pending",
    priority: null,
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: "2026-11-25T10:41:00Z",
  },
  {
    id: "vs_aarav",
    token: "A-018",
    patientId: "pt_aarav",
    status: "waiting",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Fever · walk-in",
    detail: "Temp 101.0 °F",
    priority: "urgent",
    seenBy: null,
    waitedMinutes: null,
    consultMinutes: null,
    createdAt: "2026-11-25T10:49:00Z",
  },
  {
    id: "vs_diya",
    token: "T-104",
    patientId: "pt_diya",
    status: "seen",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Viral fever",
    detail: "Temp 99.8 °F",
    priority: null,
    seenBy: "dr_ananya",
    waitedMinutes: 24,
    consultMinutes: 8,
    createdAt: "2026-11-25T09:10:00Z",
  },
  {
    id: "vs_fathima",
    token: "T-101",
    patientId: "pt_fathima",
    status: "seen",
    mode: "in_clinic",
    source: "walk_in",
    reason: "Child's cough",
    detail: "Temp 100.1 °F",
    priority: null,
    seenBy: "dr_ananya",
    waitedMinutes: 18,
    consultMinutes: 11,
    createdAt: "2026-11-25T09:32:00Z",
  },
];

export const visit = (id: string): MockVisit | undefined =>
  visits.find((item) => item.id === id || item.token === id);

// -------------------------------------------------------------------- vitals

export type MockVitals = {
  id: string;
  visitId: string;
  recordedAt: string;
  tempF: number | null;
  bp: string | null;
  pulse: number | null;
  spo2: number | null;
  weightKg: number | null;
  sugarMg: number | null;
  note: string | null;
  priority: string | null;
};

export const vitals: MockVitals[] = [
  {
    id: "vt_kavya",
    visitId: "vs_kavya",
    recordedAt: "2026-11-25T10:42:00Z",
    tempF: 101.2,
    bp: "128/82",
    pulse: 96,
    spo2: 98,
    weightKg: 62,
    sugarMg: 164,
    note: "Fever with high pulse",
    priority: "urgent",
  },
];

export const vitalsFor = (visitId: string): MockVitals | undefined =>
  vitals.find((item) => item.visitId === visitId);

// -------------------------------------------------------------- the consult

export type MockDiagnosis = { code: string; name: string; kind: "Primary" | "Known" };

export const diagnoses: MockDiagnosis[] = [
  { code: "J02.9", name: "Acute pharyngitis", kind: "Primary" },
  { code: "E11", name: "Type 2 diabetes", kind: "Known" },
];

export type MockMedicine = {
  name: string;
  generic: string;
  form: string;
  dose: string;
  when: string;
  forDays: string;
  note: string;
};

export const medicines: MockMedicine[] = [
  {
    name: "Azithromycin 500 mg tablet",
    generic: "AZITHROMYCIN (500MG)",
    form: "Tablet",
    dose: "1 tablet",
    when: "Once a day (1-0-0-0)",
    forDays: "3 days",
    note: "After food",
  },
  {
    name: "Paracetamol 650 mg tablet",
    generic: "PARACETAMOL (650MG)",
    form: "Tablet",
    dose: "1 tablet",
    when: "If fever (SOS)",
    forDays: "3 days",
    note: "Max 4 a day",
  },
  {
    name: "Chlorhexidine 0.2% gargle",
    generic: "CHLORHEXIDINE (0.2%)",
    form: "Gargle",
    dose: "15 ml",
    when: "Twice a day",
    forDays: "5 days",
    note: "Do not swallow",
  },
];

export const tests = ["CBC", "Throat swab culture", "HbA1c"];

export const advice = {
  diet: "Warm fluids, soft food. Rest for 2 days.",
  return: "Difficulty breathing, drooling, fever above 103°F",
};

export const followUp = {
  options: ["3 days", "5 days", "1 week", "2 weeks"],
  selected: "5 days",
  when: "Mon, 23 Nov · book at reception",
};

export const examination = [
  { system: "General", findings: "febrile, alert" },
  { system: "Throat", findings: "tonsils enlarged, exudate" },
  { system: "Neck", findings: "tender nodes" },
  { system: "Chest", findings: "clear" },
  { system: "CVS", findings: "normal" },
  { system: "Abdomen", findings: "soft" },
];

export const brief = {
  chiefComplaints: "Sore throat 3 days, fever 101°F, pain swallowing",
  history: "No cough. Sister had similar symptoms last week.",
};

export type MockConsultation = {
  id: string;
  visitId: string;
  patientId: string;
  complaints: string | null;
  history: string | null;
  examination: Array<Record<string, string>>;
  adviceDiet: string | null;
  adviceReturn: string | null;
  followUpMode: string | null;
  followUpAt: string | null;
  followUpNote: string | null;
  status: string;
};

export const consultations: MockConsultation[] = [];

export type MockPrescription = {
  id: string;
  visitId: string;
  patientId: string;
  signedAt: string | null;
  signatureMode: string | null;
  version: number;
  status: "draft" | "signed";
  safetyAlert: boolean;
  safetyAlertKind: string | null;
  safetyOverridden: boolean;
  safetyOverrideReason: string | null;
  /** The lines the doctor wrote. Kept on the prescription, as the API does. */
  diagnoses: Array<{ code: string; label: string; kind: string }>;
  medicines: Array<Record<string, string | undefined>>;
  tests: Array<{ name: string }>;
};

export const prescriptions: MockPrescription[] = [];

export type MockInvoice = {
  id: string;
  visitId: string;
  prescriptionId: string;
  prefix: string;
  number: string;
  total: number;
  status: string;
  payMode: string | null;
  paidAt: string | null;
};

export const invoices: MockInvoice[] = [];

export type MockLabOrder = {
  id: string;
  visitId: string;
  prescriptionId: string;
  patientId: string;
  testName: string;
  status: string;
};

export const labOrders: MockLabOrder[] = [];

export type MockAppointment = {
  id: string;
  visitId: string | null;
  patientId: string;
  doctorId: string;
  startsAt: string;
  mode: string;
  status: string;
  source: string;
};

export const appointments: MockAppointment[] = [];

// ------------------------------------------------------------------- billing

export type MockInvoiceLine = {
  label: string;
  amount: number;
  sac: string;
  gstRate: number;
};

export const invoiceLines: MockInvoiceLine[] = [
  { label: "Consultation in-clinic", amount: 500, sac: "999313", gstRate: 0 },
  { label: "Follow-up consultation", amount: 300, sac: "999313", gstRate: 0 },
  { label: "Video/audio consultation", amount: 400, sac: "999313", gstRate: 0 },
  { label: "ECG", amount: 350, sac: "999311", gstRate: 0 },
  { label: "Wound dressing", amount: 200, sac: "999311", gstRate: 0 },
  { label: "Nebulisation", amount: 250, sac: "999311", gstRate: 0 },
  { label: "Chemical peel", amount: 1500, sac: "999311", gstRate: 0 },
];

// ------------------------------------------------------------------ the inbox

export type MockInboxKind = "Result" | "Referral" | "Handover";

export type MockInboxItem = {
  id: string;
  kind: MockInboxKind;
  patientId: string;
  title: string;
  body: string;
  time: string;
  critical?: boolean;
};

export const inbox: MockInboxItem[] = [
  {
    id: "ib_rohit",
    kind: "Result",
    patientId: "pt_rohit",
    title: "CRP 48 mg/L — high",
    body: "C-reactive protein · reference under 6 mg/L. Was 12 mg/L on 15 Nov.",
    time: "09:58",
    critical: true,
  },
  {
    id: "ib_fathima",
    kind: "Referral",
    patientId: "pt_fathima",
    title: "From Dr. Meghana Iyer: child's cough, please see today",
    body: "Reported by Dr. Meghana Iyer",
    time: "10:20",
  },
  {
    id: "ib_diya",
    kind: "Handover",
    patientId: "pt_diya",
    title: "From Dr. Ananya Rao: review fever on Thursday",
    body: "Handed over by Dr. Ananya Rao",
    time: "Yesterday",
  },
];

// ----------------------------------------------------------------- templates

export type MockTemplate = {
  id: string;
  name: string;
  code: string;
  condition: string;
  lines: string[];
  used: number;
};

export const templates: MockTemplate[] = [
  {
    id: "tpl_viral",
    name: "Viral fever — child",
    code: "B34.9",
    condition: "Viral infection",
    lines: ["Paracetamol syrup 15 mg/kg SOS", "ORS after each loose stool", "Advice: fluids, rest, sponge if > 101°F"],
    used: 42,
  },
  {
    id: "tpl_otitis",
    name: "Acute otitis media",
    code: "H66.9",
    condition: "Otitis media",
    lines: ["Amoxicillin 40 mg/kg/day in 2 doses × 7 days", "Paracetamol 15 mg/kg SOS"],
    used: 18,
  },
  {
    id: "tpl_bronch",
    name: "Bronchiolitis — mild",
    code: "J21.9",
    condition: "Bronchiolitis",
    lines: ["Saline nasal drops", "Nebulised 3% saline if needed", "Come back if fast breathing"],
    used: 11,
  },
  {
    id: "tpl_worm",
    name: "Worm treatment",
    code: "B82.9",
    condition: "Intestinal worms",
    lines: ["Albendazole 400 mg single dose", "Repeat after 2 weeks"],
    used: 9,
  },
];

// -------------------------------------------------------------- teleconsult

export type MockTeleconsult = {
  patientId: string;
  booked: string;
  reason: string;
  state: "Joined" | "Link sent";
};

export const waitingOnline: MockTeleconsult[] = [
  { patientId: "pt_aarav", booked: "Booked 11:30", reason: "fever follow-up", state: "Joined" },
  { patientId: "pt_ishaan", booked: "Booked 12:00", reason: "rash", state: "Link sent" },
];

export const consent = [
  { label: "Patient identified", detail: "Name, age and mobile confirmed on call" },
  { label: "Consent", detail: "Mother gave consent for a video consult (minor)" },
  { label: "Mode", detail: "Video · first consult · List A and O medicines allowed" },
];

// -------------------------------------------------------- the patient's story

export type MockTimelineVisit = {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  code?: string;
  medicines?: string;
  extra?: string;
  signed: string;
};

export const timeline: MockTimelineVisit[] = [
  {
    id: "tv_1",
    date: "Today, 25 Nov",
    doctor: "Dr. Ananya Rao",
    diagnosis: "J02.9 Acute pharyngitis",
    medicines: "Azithromycin 500 mg · Paracetamol 650 mg SOS · Chlorhexidine gargle",
    signed: "Signed 11:02",
  },
  {
    id: "tv_2",
    date: "12 Sep 2026",
    doctor: "Dr. Ananya Rao",
    diagnosis: "B34.9 Viral fever",
    medicines: "Paracetamol 650 mg · ORS",
    signed: "Signed",
  },
  {
    id: "tv_3",
    date: "2 Jun 2026",
    doctor: "Dr. Ananya Rao",
    diagnosis: "E11 Type 2 diabetes — review",
    medicines: "Metformin 500 mg twice a day",
    extra: "HbA1c ordered",
    signed: "Signed",
  },
  {
    id: "tv_4",
    date: "14 Jan 2026",
    doctor: "Dr. Meghana Iyer",
    diagnosis: "N39.0 Urinary infection",
    medicines: "Nitrofurantoin 100 mg · 5 days",
    signed: "Signed",
  },
];

export type MockReading = {
  label: string;
  value: string;
  state: "Improving" | "Steady" | "Better";
  tone: "gold" | "plain" | "mint";
};

export const readings: MockReading[] = [
  { label: "HbA1c", value: "8.1 → 7.4 → 7.0 %", state: "Improving", tone: "gold" },
  { label: "BP", value: "136/88 → 130/84 → 128/82 mmHg", state: "Steady", tone: "plain" },
  { label: "Weight", value: "65 → 63 → 62 kg", state: "Better", tone: "mint" },
];

export const labResults = [
  { name: "HbA1c", when: "2 Jun", value: "7.0 %", tone: "gold" as const },
  { name: "CBC", when: "today", value: "Pending", tone: "plain" as const },
  { name: "Throat swab", when: "today", value: "Pending", tone: "plain" as const },
];

export const recordAccess = [
  { who: "Dr. Ananya Rao", when: "today 10:51", what: "" },
  { who: "Mary Joseph (nurse)", when: "today 10:40", what: "vitals" },
  { who: "Priya Shetty", when: "today 10:31", what: "contact details" },
];

// ------------------------------------------------------------ the dashboard

export type MockStation = {
  icon: IconName;
  tone: IconTone;
  title: string;
  description: string;
  tag: string;
  count?: string;
  countWarn?: boolean;
};

export type MockManageLink = {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  count?: number;
};

export const dashboardMeta =
  "4 in your queue · 2 awaiting vitals · 1 prescription to hand over · 5 appointments still to come today";

export const trial = {
  message:
    "Your free trial ends in 3 days. Patient care keeps working; choose a plan to keep adding doctors, staff or locations.",
  action: "See plans",
  href: "/subscription",
};

export const stations: MockStation[] = [
  {
    icon: "kiosk",
    tone: "blue",
    title: "Patient Kiosk",
    description: "Patients confirm their mobile, check in for a booking or join the queue, and get a token.",
    tag: "Step 1",
  },
  {
    icon: "nurse",
    tone: "purple",
    title: "Nurse Station",
    description: "Record vitals and route each patient to the right doctor.",
    tag: "Step 2",
    count: "2 waiting",
  },
  {
    icon: "stetho",
    tone: "green",
    title: "Doctor Console",
    description: "Consult, prescribe with smart suggestions, order tests and e-sign.",
    tag: "Step 3",
    count: "4 in queue",
  },
  {
    icon: "inbox",
    tone: "gold",
    title: "Inbox",
    description: "Referrals from colleagues, lab results to review and handovers.",
    tag: "Doctor",
    count: "6 to act on",
  },
  {
    icon: "print",
    tone: "blue",
    title: "Reception Desk",
    description: "Print each signed prescription and hand it to the patient.",
    tag: "Step 4",
    count: "1 to hand over",
  },
  {
    icon: "rupee",
    tone: "blue",
    title: "Billing & POS",
    description: "Collect consultation fees, print receipts and close the day.",
    tag: "Billing",
    count: "3 pending",
  },
  {
    icon: "lab",
    tone: "purple",
    title: "Lab & Diagnostics",
    description: "Collect samples, enter results and report the tests doctors order.",
    tag: "Diagnostics",
    count: "2 open",
  },
  {
    icon: "video",
    tone: "blue",
    title: "Teleconsult",
    description: "Video consults: the patient joins from home and the prescription goes out digitally.",
    tag: "Online",
    count: "1 waiting",
  },
  {
    icon: "cal",
    tone: "blue",
    title: "Appointments",
    description: "Book follow-ups and new patients, see the day and check arrivals in.",
    tag: "Bookings",
    count: "5 still to come today",
  },
];

export const manage: MockManageLink[] = [
  {
    icon: "chart",
    title: "Reports & analytics",
    description: "Consultation history, medicine analytics and Excel export.",
    href: "/reports",
  },
  {
    icon: "folder",
    title: "Patients & Rx",
    description: "Find a patient, their record, prescriptions and certificates.",
    href: "/patients",
    count: patients.length,
  },
  {
    icon: "rx",
    title: "My templates",
    description: "Your reusable treatment protocols.",
    href: "/templates",
  },
  {
    icon: "stetho",
    title: "Doctors",
    description: "Add doctors by HPR ID; set fees, rooms and branch.",
    href: "/doctors",
    count: doctors.length,
  },
  {
    icon: "users",
    title: "Staff & roles",
    description: "Front desk, nurses and admins, what each can open, and the activity log.",
    href: "/staff",
    count: 3,
  },
  {
    icon: "send",
    title: "Patient messages",
    description: "Every SMS sent to patients: tokens, payments, bookings and reminders.",
    href: "/messages",
  },
  {
    icon: "pin",
    title: "Locations",
    description: "Branches, rooms and which doctors work where.",
    href: "/locations",
    count: clinic.locations,
  },
  {
    icon: "spark",
    title: "Subscription",
    description: "Your plan, trial, upgrades and payments to MedMate.",
    href: "/subscription",
  },
  {
    icon: "gear",
    title: "Settings",
    description: "Your PIN, the clinic profile and the prescription letterhead.",
    href: "/settings",
  },
];

/** The clinic's letterhead, as it prints. */
export const letterhead = {
  name: "MedMate Clinic",
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  phone: "080 4123 4567",
  registration: "KPME/BLR/2024/01873",
  hfr: "IN2910000123",
  gstin: "29AAJCM4821K1Z7",
};
