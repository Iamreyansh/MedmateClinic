import { apiGet, apiPost } from "@/services/api";
import type { BillingBill, TillPayload } from "@/features/billing/types";

/**
 * The till.
 *
 * The service filters and pages the bills, so the screen asks for what it
 * wants rather than fetching everything and filtering it itself. No range at
 * all means every invoice the clinic has.
 */
export type TillQuery = {
  /** The first day of the range, `YYYY-MM-DD`. */
  from?: string;
  /** The last day of the range, `YYYY-MM-DD`. */
  to?: string;
  /** `to_collect`, `paid` or `refunded`. */
  status?: "to_collect" | "paid" | "refunded";
  /** The payment mode. */
  mode?: string;
  /** How many bills a page holds. */
  limit?: number;
  /** Which page, counted from zero. */
  offset?: number;
};

export const fetchTill = (query: TillQuery = {}) => {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);
  if (query.mode) params.set("mode", query.mode);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const search = params.toString();
  return apiGet<TillPayload>(`/clinic/billing${search ? `?${search}` : ""}`);
};

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
