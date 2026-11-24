import type { IconName } from "@/components/ui/Icon";

/**
 * The clinic sign-up flow's types and its fixed choices.
 *
 * The form is one flat object: a clinic signs up once, and every step edits
 * it. Nothing is prefilled — the file fills its fields with an example, a real
 * clinic starts from nothing.
 */

export type ClinicKind = "clinic" | "polyclinic" | "nursing";
export type Role = "doctor" | "manager";
export type Signing = "aadhaar" | "dsc";

export type Form = {
  // You
  name: string;
  mobile: string;
  email: string;
  // Clinic
  clinicName: string;
  clinicKind: ClinicKind | "";
  registeredUnder: string;
  regNumber: string;
  validUntil: string;
  clinicEmail: string;
  gstin: string;
  pan: string;
  // Location
  locName: string;
  street: string;
  area: string;
  city: string;
  pin: string;
  state: string;
  phone: string;
  rooms: string;
  hfr: string;
  // Role
  role: Role | "";
  hpr: string;
  doctorName: string;
  doctorQual: string;
  doctorReg: string;
  speciality: string;
  fee: string;
  videoFee: string;
  signing: Signing | "";
};

export type SetField = <K extends keyof Form>(key: K, value: Form[K]) => void;

export type Stage = "intro" | "you" | "code" | "clinic" | "location" | "role" | "agreements";

export type StepProps = {
  form: Form;
  set: SetField;
  onBack: () => void;
  onNext: () => void;
  valid: boolean;
};

export const EMPTY_FORM: Form = {
  name: "",
  mobile: "",
  email: "",
  clinicName: "",
  clinicKind: "",
  registeredUnder: "",
  regNumber: "",
  validUntil: "",
  clinicEmail: "",
  gstin: "",
  pan: "",
  locName: "",
  street: "",
  area: "",
  city: "",
  pin: "",
  state: "Karnataka (29)",
  phone: "",
  rooms: "",
  hfr: "",
  role: "",
  hpr: "",
  doctorName: "",
  doctorQual: "",
  doctorReg: "",
  speciality: "",
  fee: "",
  videoFee: "",
  signing: "",
};

export const STEPS: Array<{ key: Stage; label: string }> = [
  { key: "you", label: "You" },
  { key: "clinic", label: "Clinic" },
  { key: "location", label: "Location" },
  { key: "role", label: "Your role" },
  { key: "agreements", label: "Agreements" },
];

export const HANDY = [
  "Your mobile number, to receive a code",
  "The clinic's registration number (state Clinical Establishments Act)",
  "GSTIN and PAN, only if the clinic is GST-registered",
  "Your HPR ID, if you are a doctor",
  "Facility HFR ID, if you have one",
];

export const CLINIC_KINDS: Array<{ value: ClinicKind; title: string; body: string }> = [
  { value: "clinic", title: "Clinic", body: "One or more doctors" },
  { value: "polyclinic", title: "Polyclinic", body: "Several specialities" },
  { value: "nursing", title: "Nursing home", body: "With beds" },
];

export const ROLES: Array<{ value: Role; title: string; body: string }> = [
  {
    value: "doctor",
    title: "I'm a doctor here",
    body: "I see patients and write prescriptions, and I own or run the clinic.",
  },
  {
    value: "manager",
    title: "I run the clinic",
    body: "I manage the clinic but don't see patients.",
  },
];

export const SIGNING: Array<{ value: Signing; title: string; body: string }> = [
  { value: "aadhaar", title: "Aadhaar eSign", body: "OTP on your Aadhaar-linked mobile" },
  { value: "dsc", title: "DSC token", body: "Class 3 digital signature" },
];

/** States with their GST state codes — the same pair the tax invoice needs. */
export const STATES = [
  "Andhra Pradesh (37)",
  "Assam (18)",
  "Bihar (10)",
  "Chhattisgarh (22)",
  "Delhi (07)",
  "Goa (30)",
  "Gujarat (24)",
  "Haryana (06)",
  "Himachal Pradesh (02)",
  "Jharkhand (20)",
  "Karnataka (29)",
  "Kerala (32)",
  "Madhya Pradesh (23)",
  "Maharashtra (27)",
  "Odisha (21)",
  "Punjab (03)",
  "Rajasthan (08)",
  "Tamil Nadu (33)",
  "Telangana (36)",
  "Uttar Pradesh (09)",
  "Uttarakhand (05)",
  "West Bengal (19)",
];

export const ACTS = [
  "Karnataka Private Medical Establishments Act",
  "Karnataka Clinical Establishments Act",
  "Kerala Clinical Establishments Act",
  "Tamil Nadu Clinical Establishments Act",
  "Maharashtra Clinical Establishments Act",
  "Other state law",
  "Applied, number awaited",
];

export type Agreement = {
  id: string;
  title: string;
  version: string;
  points: string;
  href: string;
};

export const AGREEMENTS: Agreement[] = [
  {
    id: "terms",
    title: "Terms of service",
    version: "v1.0",
    points: "What MedMate does, what you do, fees and how either side can end it.",
    href: "/legal/terms",
  },
  {
    id: "dpa",
    title: "Data processing agreement",
    version: "v1.0",
    points:
      "DPDP Act 2023: you are the data fiduciary, MedMate processes patient data only on your instructions, breaches reported within 72 hours.",
    href: "/legal/dpa",
  },
  {
    id: "declaration",
    title: "Clinic declaration",
    version: "v1.0",
    points:
      "The clinic is registered, its doctors are registered with a medical council, and it follows the Telemedicine Practice Guidelines 2020.",
    href: "/legal/declaration",
  },
];

/** The address a patient books on: the clinic name, slugged. */
export const bookingSlug = (clinicName: string) =>
  clinicName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const STAGE_ICONS: Record<string, IconName> = {
  you: "users",
  clinic: "stetho",
  location: "pin",
  role: "shield",
  agreements: "cert",
};
