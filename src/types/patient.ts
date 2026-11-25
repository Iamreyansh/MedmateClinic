/**
 * The patient record, as the API sends it.
 *
 * The patient screen draws it and the doctor's history drawer draws it, and
 * both are in different features — so the shape lives here, in shared code,
 * rather than inside one feature the other would have to reach into. It is the
 * same pattern as `src/types/visit.ts`.
 */

export type HistoryVisit = {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  code?: string;
  medicines?: string;
  extra?: string;
  signed: string;
};

/** One reading over time. */
export type Reading = {
  label: string;
  value: string;
  state: "Improving" | "Steady" | "Better";
  tone: "gold" | "plain" | "mint";
};

/** One lab result. */
export type LabResult = { name: string; when: string; value: string; tone: "gold" | "plain" };

/** One entry in the record's access log. */
export type RecordAccess = { who: string; when: string; what: string };

export type PatientRecord = {
  patient: {
    id: string;
    name: string;
    initials?: string;
    age: number;
    sex: string;
    phone: string;
    abha: string;
    allergies: string[];
    conditions: string[];
    visits: number;
    since: string;
  };
  visits: HistoryVisit[];
  readings: Reading[];
  labResults: LabResult[];
  recordAccess: RecordAccess[];
};
