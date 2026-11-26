/**
 * The patient list, as the API sends it.
 *
 * The record is one patient; the list is everybody the clinic has, with the
 * handful of facts a person at the desk needs to pick the right one out of a
 * queue: who is here today, who is due back, and who still owes money.
 */

export type PatientListItem = {
  id: string;
  name: string;
  initials: string;
  age: number;
  sex: string;
  phone: string;
  abha: string;
  allergies: string[];
  conditions: string[];
  /** How many times the patient has been to the clinic. */
  visits: number;
  /** The year the patient first came. */
  since: string;
  /** The queue token, when the patient is in the clinic today. */
  token: string | null;
  /** Whether the patient is in the clinic today. */
  hereToday: boolean;
  /** When the patient was last seen. */
  lastSeen: string;
  /** The doctor who saw them last. */
  doctor: string;
  /** What the patient still owes. */
  dues: number;
  /** When the patient is due back, if they are. */
  followUpOn: string | null;
  /** Whether the patient is one of the signed-in doctor's own patients. */
  mine: boolean;
  /**
   * When the patient first came to the clinic.
   *
   * The service may not send it — the list screen reads the year from
   * `since` — so it is optional rather than a field every answer must carry.
   */
  joinedOn?: string;
  /** Whether the patient is new this month. */
  newThisMonth: boolean;
};

export type PatientListPayload = {
  items: PatientListItem[];
  /** The line under the title. */
  meta: string;
  /** How many patients the clinic has, when the server knows. */
  total?: number;
};

/** The filters the list offers, as the design names them. */
export type PatientFilter = "everyone" | "here" | "followup" | "owes" | "new" | "mine";

export type PatientFilterEntry = {
  value: PatientFilter;
  label: string;
  icon?: "users" | "queue" | "cal" | "rupee" | "spark" | "folder";
};

export const PATIENT_FILTERS: PatientFilterEntry[] = [
  { value: "everyone", label: "Everyone", icon: "users" },
  { value: "here", label: "Here today", icon: "queue" },
  { value: "followup", label: "Follow-up due", icon: "cal" },
  { value: "owes", label: "Owes money", icon: "rupee" },
  { value: "new", label: "New this month", icon: "spark" },
  { value: "mine", label: "My patients", icon: "folder" },
];

/** Does this patient match this filter? */
export function matchesFilter(item: PatientListItem, filter: PatientFilter): boolean {
  switch (filter) {
    case "here":
      return item.hereToday;
    case "followup":
      return Boolean(item.followUpOn);
    case "owes":
      return item.dues > 0;
    case "new":
      return item.newThisMonth;
    case "mine":
      return item.mine;
    default:
      return true;
  }
}

/** Does this patient match what was typed in the search box? */
export function matchesSearch(item: PatientListItem, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return true;
  return [
    item.name,
    item.phone,
    item.abha,
    item.token ?? "",
    item.id,
  ].some((field) => field.toLowerCase().includes(wanted));
}
