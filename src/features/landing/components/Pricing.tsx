"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

type Plan = {
  name: string;
  tagline: string;
  monthly: string;
  yearly: string;
  /** The line under the price, per billing period. */
  note: Record<"monthly" | "yearly", string>;
  features: string[];
  action: string;
  href: string;
  featured?: boolean;
  popular?: boolean;
  custom?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Solo",
    tagline: "For a doctor running their own clinic",
    monthly: "₹999",
    yearly: "₹833",
    note: {
      monthly: "Billed monthly · + 18% GST",
      yearly: "₹9,990 billed yearly · save ₹1,998 · + 18% GST",
    },
    action: "Start 14-day free trial",
    href: "/start",
    features: [
      "1 doctor, 1 location, up to 3 staff",
      "Queue, kiosk check-in and token SMS",
      "Doctor Console with suggestions and safety checks",
      "Signed e-prescriptions (FHIR, ABDM-ready)",
      "Billing with GST-compliant bills and UPI",
      "Appointments, booking page and reminders",
      "Patient records, templates and certificates",
    ],
  },
  {
    name: "Clinic",
    tagline: "For polyclinics and growing practices",
    monthly: "₹2,499",
    yearly: "₹2,083",
    note: {
      monthly: "Billed monthly · + 18% GST",
      yearly: "₹24,990 billed yearly · save ₹4,998 · + 18% GST",
    },
    action: "Start 14-day free trial",
    href: "/start",
    featured: true,
    popular: true,
    features: [
      "Up to 5 doctors, 3 locations and 20 staff",
      "Everything in Solo",
      "Nurse station, lab desk and reception desk",
      "Teleconsultation with video and phone",
      "Send prescriptions to the patient's chosen pharmacy",
      "Reports: money, patients, waiting times, follow-ups",
      "Doctor revenue share and activity log",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For hospitals, chains and special needs",
    monthly: "Custom",
    yearly: "Custom",
    note: {
      monthly: "Priced for your size and needs",
      yearly: "Priced for your size and needs",
    },
    action: "Talk to us",
    href: "#talk",
    custom: true,
    features: [
      "Any number of doctors and locations",
      "Everything in Clinic",
      "Your own database in an Indian region",
      "Connections to your lab, pharmacy or HIS",
      "Single sign-on and custom roles",
      "Guided onboarding and staff training",
      "Agreed uptime and a named support manager",
    ],
  },
];

export function Pricing() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <>
      <div className="pz-toggle" role="radiogroup" aria-label="Billing">
        <button
          type="button"
          role="radio"
          aria-checked={period === "monthly"}
          className={cn(period === "monthly" && "on")}
          onClick={() => setPeriod("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={period === "yearly"}
          className={cn(period === "yearly" && "on")}
          onClick={() => setPeriod("yearly")}
        >
          Yearly<span>2 months free</span>
        </button>
      </div>

      <div className="pz-cards">
        {PLANS.map((plan) => (
          <article key={plan.name} className={cn("pz-card", plan.featured && "dark")}>
            {plan.popular ? <span className="pz-badge">Most popular</span> : null}
            <h3>{plan.name}</h3>
            <p className="pz-tag">{plan.tagline}</p>
            <div className="pz-price">
              <b>{period === "yearly" ? plan.yearly : plan.monthly}</b>
              {plan.custom ? null : <span>/ month</span>}
            </div>
            <p className="pz-sub">{plan.note[period]}</p>
            <a className={cn("btn block", plan.featured ? "" : "sec")} href={plan.href}>
              {plan.action}
            </a>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Icon name="check" size={14} />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
