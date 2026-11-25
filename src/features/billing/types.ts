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
  description: string;
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

export type TillPayload = {
  day: string;
  dayLabel: string;
  summary: BillingSummary;
  byMode: PayMode[];
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
  timeline: Array<{ label: string; at: string }>;
};
