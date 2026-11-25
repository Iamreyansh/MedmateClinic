/**
 * The visit, as the API sends it.
 *
 * The consult, the prescription and the certificate all print what the doctor
 * wrote about one visit, so the shape lives here — in shared code — rather than
 * inside one feature that the others would have to reach into.
 */

export type VisitPatient = {
  id: string;
  name: string;
  initials?: string;
  age: number;
  sex: string;
  phone: string;
  abha: string;
  allergies: string[];
  conditions: string[];
  visits?: number;
  since?: string;
};

export type Visit = {
  id: string;
  token: string;
  status: string;
  mode: string;
  source: string;
  reason: string | null;
  detail: string | null;
  priority: string | null;
};

export type Vitals = {
  id: string;
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

export type DiagnosisLine = { code: string | null; label: string; kind: string };

export type MedicineLine = {
  name: string;
  generic?: string | null;
  form?: string | null;
  dose?: string | null;
  when?: string | null;
  forDays?: string | null;
  notes?: string | null;
};

export type TestLine = { name: string; status?: string };

export type Consultation = {
  id: string;
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

/** What the consult screen sends when the doctor saves. */
export type ConsultationPayload = {
  complaints?: string;
  history?: string;
  examination?: Array<Record<string, string>>;
  advice?: { diet?: string; returnIf?: string };
  followUp?: { mode?: string; at?: string; note?: string };
  diagnoses?: DiagnosisLine[];
  medicines?: MedicineLine[];
  tests?: Array<{ name: string }>;
};

/** What signing a prescription sets in motion, as the API reports it. */
export type SignedResult = {
  prescription: { id: string; status: string; signedAt: string; signatureMode: string };
  invoice: { id: string; number: string; total: number; status: string };
  followUp: { id: string; startsAt: string; mode: string; status: string } | null;
  labOrders: Array<{ id: string; testName: string; status: string }>;
};

/** The consult as the API sends it: the visit, the patient and the draft. */
export type VisitResponse = {
  visit: Visit;
  patient: VisitPatient;
  vitals: Vitals | null;
  consultation: Consultation | null;
  prescriptions: Array<{
    id: string;
    status: string;
    signedAt?: string | null;
    signatureMode?: string | null;
    version?: number;
  }>;
  /** The lines of the draft, so the screen draws what the doctor wrote. */
  diagnoses?: DiagnosisLine[];
  medicines?: MedicineLine[];
  tests?: TestLine[];
};
