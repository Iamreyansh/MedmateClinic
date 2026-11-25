/**
 * The reception desk, as the API sends it.
 *
 * The desk is where each patient is handed over: the prescription, the bill
 * and the follow-up. The shapes live here, in the feature that draws them.
 */

export type DeskPatient = {
  id: string;
  name: string;
  age: number;
  sex: string;
  initials?: string;
  phone?: string;
};

export type DeskPrescription = {
  id?: string;
  /** `none` when the doctor has not written one yet. */
  status: string;
  signedAt?: string | null;
};

export type DeskPayment = {
  invoiceId?: string;
  number?: string;
  /** `none` when there is no bill. */
  status: string;
  amount: number;
  payMode?: string | null;
};

export type DeskFollowUp = {
  id: string;
  startsAt: string;
  mode: string;
  status: string;
  label: string;
} | null;

export type DeskLab = {
  id: string;
  name: string;
  status: string;
  count: number;
  label: string;
} | null;

export type DeskItem = {
  id: string;
  visitId: string;
  token: string;
  /** `A` for the doctor queue, `B` for the nurse queue. */
  kind: string;
  /** What is waiting to be handed over. */
  state: string;
  status: string;
  reason: string | null;
  waitedMinutes: number | null;
  checkedOut: boolean;
  patient: DeskPatient;
  prescription: DeskPrescription;
  payment: DeskPayment;
  followUp: DeskFollowUp;
  lab: DeskLab;
};

export type DeskPayload = {
  counts: {
    toHandOver: number;
    waiting: number;
    doneToday: number;
  };
  items: DeskItem[];
  meta: string;
};
