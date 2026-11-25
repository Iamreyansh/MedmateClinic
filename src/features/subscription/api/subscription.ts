import { apiGet, apiPost } from "@/services/api";
import type { SubscriptionPayload } from "@/features/subscription/types";

/** The clinic's plan, its trial and its usage. */
export const fetchSubscription = () => apiGet<SubscriptionPayload>("/clinic/subscription");

/** Pay for the plan. */
export const payForPlan = (payment: {
  plan: string;
  amount: number;
  method: string;
  name: string;
  email: string;
}) =>
  apiPost<{ status: string; plan: string; amount: number; paidAt: string }>(
    "/clinic/subscription/checkout",
    payment,
  );

/** Ask about the enterprise plan. */
export const sendEnquiry = (enquiry: {
  clinic: string;
  locations: string;
  doctors: string;
  staff: string;
  note: string;
}) => apiPost<{ received: boolean; on: string }>("/clinic/subscription/enquiry", enquiry);
