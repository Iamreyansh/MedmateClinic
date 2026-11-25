/**
 * The subscription, as the API sends it.
 *
 * The plan the clinic is on, what it has used, and what it will cost. The
 * numbers come from the clinic's own usage — a trial that says "14 days left"
 * but counts the wrong appointments is worse than no trial at all.
 */

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  /** What the plan is for, in a sentence. */
  summary: string;
  /** What it allows. */
  includes: string[];
  /** What it does not allow — shown plainly. */
  avoids: string[];
};

export type SubscriptionUsage = {
  label: string;
  used: number;
  limit: number;
};

export type SubscriptionPayload = {
  /** `trial`, `active` or `ended`. */
  state: string;
  planName: string;
  planId: string;
  /** The trial, when there is one. */
  trialDaysLeft: number;
  trialEndsOn: string | null;
  renewalOn: string | null;
  usage: SubscriptionUsage[];
  plans: SubscriptionPlan[];
  /** What was paid last time. */
  lastPayment: { amount: number; on: string; method: string } | null;
  clinic: { name: string; email: string };
};
