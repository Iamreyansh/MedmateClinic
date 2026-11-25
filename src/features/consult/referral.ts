/**
 * The pharmacies and the colleagues a doctor can send to.
 *
 * Both are lists the server owns: a pharmacy is registered for the clinic, and
 * a colleague is a doctor the clinic works with. The shapes are here so the
 * dialogs are written against them.
 */

export type Pharmacy = {
  id: string;
  name: string;
  /** The area or neighbourhood. */
  area: string;
  phone: string;
  /** Whether the pharmacy sends e-prescriptions. */
  delivers: boolean;
};

export const PHARMACIES: Pharmacy[] = [
  { id: "ph_1", name: "MedMate Pharmacy, Indiranagar", area: "Indiranagar", phone: "080 4123 4570", delivers: true },
  { id: "ph_2", name: "Apollo Pharmacy, 12th Main", area: "Indiranagar", phone: "080 4123 4588", delivers: true },
  { id: "ph_3", name: "Narayana Health Pharmacy", area: "Domlur", phone: "080 4123 4599", delivers: false },
  { id: "ph_4", name: "Wellness Pharmacy, Koramangala", area: "Koramangala", phone: "080 4123 4601", delivers: true },
];

/** The colleagues a doctor can refer a patient to. */
export type Colleague = {
  id: string;
  name: string;
  speciality: string;
  /** Where the colleague works. */
  hospital: string;
  phone: string;
};

export const COLLEAGUES: Colleague[] = [
  {
    id: "dr_1",
    name: "Dr. Vikram Shenoy",
    speciality: "Paediatrics",
    hospital: "MedMate Clinic, Indiranagar",
    phone: "080 4123 4602",
  },
  {
    id: "dr_2",
    name: "Dr. Meghana Iyer",
    speciality: "Obstetrics & Gynaecology",
    hospital: "MedMate Clinic, Indiranagar",
    phone: "080 4123 4603",
  },
  {
    id: "dr_3",
    name: "Dr. Arun Prasad",
    speciality: "Cardiology",
    hospital: "City Heart Centre, Domlur",
    phone: "080 4123 4604",
  },
  {
    id: "dr_4",
    name: "Dr. Sunita Bedi",
    speciality: "Dermatology",
    hospital: "MedMate Clinic, Indiranagar",
    phone: "080 4123 4605",
  },
];

/** How soon the referral should be seen. */
export const URGENCIES = [
  { value: "routine", label: "Routine", detail: "Within a week" },
  { value: "soon", label: "Soon", detail: "Within two days" },
  { value: "urgent", label: "Urgent", detail: "Today" },
] as const;

export type Urgency = (typeof URGENCIES)[number]["value"];

/** The reason for the referral, as the doctor picks it. */
export const REFERRAL_REASONS = [
  "Needs a specialist opinion",
  "Tests or imaging not done here",
  "Beyond what this clinic can manage",
  "The patient asked to be referred",
];
