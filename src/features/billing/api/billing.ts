import { apiGet, apiPost } from "@/services/api";
import type { BillingBill, TillPayload } from "@/features/billing/types";

/** The till for today. */
export const fetchTill = (date?: string) =>
  apiGet<TillPayload>(date ? `/clinic/billing?date=${date}` : "/clinic/billing");

/** One bill, as it prints. */
export const fetchBill = (invoiceId: string) => apiGet<BillingBill>(`/clinic/billing/${invoiceId}`);

/** Take the payment. */
export const payBill = (invoiceId: string, payMode: string) =>
  apiPost<{ invoiceId: string; status: string; paidAt: string; payMode: string }>(
    `/clinic/billing/${invoiceId}/pay`,
    { payMode },
  );

/** Give the money back. */
export const refundBill = (invoiceId: string) =>
  apiPost<{ invoiceId: string; status: string; amount: number }>(`/clinic/billing/${invoiceId}/refund`);

/** Raise a new bill at the desk. */
export const createBill = (bill: {
  patient: string;
  lines: Array<{ name: string; amount: number }>;
  discount: number;
}) =>
  apiPost<{
    invoiceId: string;
    number: string;
    total: number;
    status: string;
    bill: BillingBill;
  }>("/clinic/billing", bill);

/** Close the day against the cash that was counted. */
export const closeTheDay = (count: { cash: number; expected: number }) =>
  apiPost<{
    day: string;
    expected: number;
    counted: number;
    difference: number;
    collected: number;
    bills: number;
    closedAt: string;
  }>("/clinic/billing/close-day", count);
