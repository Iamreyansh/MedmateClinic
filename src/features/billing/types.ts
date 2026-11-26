/**
 * The till, as the API sends it.
 *
 * The billing screen shows two things: what has been collected today, and the
 * bill itself — the bill of supply that prints for the patient.
 */

export type PayMode = {
  mode: string;
  label: string;
  amount: number;
  bills: number;
};

export type PendingBill = {
  invoiceId: string;
  number: string;
  amount: number;
  createdAt: string | null;
  patient: { id: string; name: string; age: number; sex: string; phone?: string };
  /** What the bill is for — the service may leave it out. */
  description?: string;
};

export type BillingSummary = {
  collected: number;
  bills: number;
  pendingCount: number;
  pendingAmount: number;
  refundCount: number;
  refundAmount: number;
  dayBills: number;
};

/** One bill of the day, as the till lists it. */
export type BillSummary = {
  invoiceId: string;
  number: string;
  amount: number;
  /** `unpaid`, `paid` or `refunded`. */
  status: string;
  payMode: string | null;
  paidAt: string | null;
  createdAt: string | null;
  description: string;
  patient: { id: string; name: string; age: number; sex: string; phone: string };
};

export type TillPayload = {
  day: string;
  dayLabel: string;
  summary: BillingSummary;
  byMode: PayMode[];
  /** Every bill of the day, so the tabs can filter them. */
  bills: BillSummary[];
  pending: PendingBill[];
  bill: BillingBill | null;
  clinic: { name: string; address: string; phone: string; gstin: string; registration: string; hfr: string };
};

export type BillingLine = {
  name: string;
  description: string;
  sac: string;
  gstRate: string;
  gstAmount: number;
  amount: number;
};

export type BillingBill = {
  id: string;
  number: string;
  prefix: string;
  fy: string;
  status: string;
  payMode: string | null;
  paidAt: string | null;
  createdAt: string | null;
  patient: { id: string; name: string; age: number; sex: string; phone?: string };
  doctor: { name: string; registration: string; speciality?: string };
  token: string | null;
  clinic: { name: string; address: string; phone: string; gstin: string; registration: string; hfr: string };
  placeOfSupply: string;
  lines: BillingLine[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  totalInWords: string;
  exemptNote: string;
  timeline: Array<{ text: string; at: string }>;
};
