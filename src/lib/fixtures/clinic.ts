import type { IconName } from "@/components/ui/Icon";

/**
 * The clinic's data.
 *
 * These are the shapes the API returns — a patient, a queue item, a medicine
 * line — so when the API lands the fixture is swapped for a fetch and nothing
 * in the screens changes.
 */

export type Doctor = {
  id: string;
  name: string;
  initials: string;
  speciality: string;
  room: string;
  registration: string;
  hpr: string;
};

export type Patient = {
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

export type QueueItem = {
  token: string;
  kind: "A" | "B";
  patient: Patient;
  reason: string;
  detail: string;
  vitals?: string;
  wait: "Next for you" | "Waiting" | "Urgent" | "Online";
  waiting: number;
  booked?: string;
};

export type Medicine = {
  name: string;
  generic: string;
  form: string;
  dose: string;
  when: string;
  forDays: string;
  note: string;
};

export type Diagnosis = {
  code: string;
  name: string;
  kind: "Primary" | "Known";
};

export const clinic = {
  name: "MedMate Clinic",
  initials: "MC",
  locations: 2,
  doctors: 3,
  address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
  phone: "080 4123 4567",
  registration: "KPME/BLR/2024/01873",
  hfr: "IN2910000123",
  gstin: "29AAJCM4821K1Z7",
  letterhead: "MedMate Clinic",
};

export const location = "Indiranagar";

export const signedInDoctor: Doctor = {
  id: "dr_ananya",
  name: "Dr. Ananya Rao",
  initials: "AR",
  speciality: "General Medicine",
  room: "Room 2",
  registration: "Reg. KMC 84213",
  hpr: "HPR 71-4421-8890-3326",
};

export const doctors: Doctor[] = [
  signedInDoctor,
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

export const patients: Patient[] = [
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

export const patient = (id: string) => patients.find((item) => item.id === id) ?? patients[0];

export const queue: QueueItem[] = [
  {
    token: "A-015",
    kind: "A",
    patient: patients[1],
    reason: "Cough 5 days · symptoms filled in",
    detail: "Temp 100.4 °F · SpO₂ 95%",
    wait: "Next for you",
    waiting: 4,
  },
  {
    token: "B-005",
    kind: "B",
    patient: patients[2],
    reason: "Rash · booked 11:00",
    detail: "Vitals pending",
    wait: "Waiting",
    waiting: 2,
  },
  {
    token: "A-018",
    kind: "A",
    patient: patients[3],
    reason: "Fever · walk-in",
    detail: "Temp 101.0 °F",
    wait: "Urgent",
    waiting: 1,
  },
];

export const diagnoses: Diagnosis[] = [
  { code: "J02.9", name: "Acute pharyngitis", kind: "Primary" },
  { code: "E11", name: "Type 2 diabetes", kind: "Known" },
];

export const medicines: Medicine[] = [
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

export const vitals = {
  temp: "101.2 °F",
  bp: "128/82",
  pulse: "96 /min",
  spo2: "98 %",
  weight: "62 kg",
  sugar: "164 mg/dL",
  recordedBy: "Mary Joseph (nurse) at 10:42",
  priority: "Urgent (fever with high pulse)",
};

export const brief = {
  chiefComplaints: "Sore throat 3 days, fever 101°F, pain swallowing",
  history: "No cough. Sister had similar symptoms last week.",
};

export type InboxKind = "Result" | "Referral" | "Handover";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  patient: Patient;
  title: string;
  body: string;
  time: string;
  critical?: boolean;
};

export const inbox: InboxItem[] = [
  {
    id: "ib_rohit",
    kind: "Result",
    patient: patients[1],
    title: "CRP 48 mg/L — high",
    body: "C-reactive protein · reference under 6 mg/L. Was 12 mg/L on 15 Nov.",
    time: "09:58",
    critical: true,
  },
  {
    id: "ib_fathima",
    kind: "Referral",
    patient: patients[5],
    title: "From Dr. Meghana Iyer: child's cough, please see today",
    body: "Reported by Dr. Meghana Iyer",
    time: "10:20",
  },
  {
    id: "ib_arjun",
    kind: "Result",
    patient: { ...patients[3], name: "Arjun Rao", initials: "AR" },
    title: "CBC normal",
    body: "Reported by MediDocs",
    time: "Yesterday",
  },
  {
    id: "ib_diya",
    kind: "Handover",
    patient: patients[4],
    title: "From Dr. Ananya Rao: review fever on Thursday",
    body: "Handed over by Dr. Ananya Rao",
    time: "Yesterday",
  },
];

export type Template = {
  id: string;
  name: string;
  code: string;
  condition: string;
  lines: string[];
  used: number;
};

export const templates: Template[] = [
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

export type TeleconsultWaiting = {
  patient: Patient;
  booked: string;
  reason: string;
  state: "Joined" | "Link sent";
};

export const waitingOnline: TeleconsultWaiting[] = [
  { patient: { ...patients[3], name: "Rahul Verma", initials: "RV", age: 41, sex: "M" }, booked: "Booked 11:30", reason: "fever follow-up", state: "Joined" },
  { patient: patients[2], booked: "Booked 12:00", reason: "rash", state: "Link sent" },
];

export const consent = [
  { label: "Patient identified", detail: "Name, age and mobile confirmed on call" },
  { label: "Consent", detail: "Mother gave consent for a video consult (minor)" },
  { label: "Mode", detail: "Video · first consult · List A and O medicines allowed" },
];

export type TimelineVisit = {
  date: string;
  doctor: string;
  diagnosis: string;
  code?: string;
  medicines?: string;
  extra?: string;
  signed: string;
};

export const visits: TimelineVisit[] = [
  {
    date: "Today, 17 Nov",
    doctor: "Dr. Ananya Rao",
    diagnosis: "J02.9 Acute pharyngitis",
    medicines: "Azithromycin 500 mg · Paracetamol 650 mg SOS · Chlorhexidine gargle",
    signed: "Signed 11:02",
  },
  {
    date: "12 Sep 2026",
    doctor: "Dr. Ananya Rao",
    diagnosis: "B34.9 Viral fever",
    medicines: "Paracetamol 650 mg · ORS",
    signed: "Signed",
  },
  {
    date: "2 Jun 2026",
    doctor: "Dr. Ananya Rao",
    diagnosis: "E11 Type 2 diabetes — review",
    medicines: "Metformin 500 mg twice a day",
    extra: "HbA1c ordered",
    signed: "Signed",
  },
  {
    date: "14 Jan 2026",
    doctor: "Dr. Meghana Iyer",
    diagnosis: "N39.0 Urinary infection",
    medicines: "Nitrofurantoin 100 mg · 5 days",
    signed: "Signed",
  },
];

export type Reading = { label: string; value: string; state: "Improving" | "Steady" | "Better"; tone: "gold" | "plain" | "mint" };

export const readings: Reading[] = [
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

export const icon = (name: string): IconName => name as IconName;
