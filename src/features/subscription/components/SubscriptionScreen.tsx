import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { fetchSubscription, payForPlan, sendEnquiry } from "@/features/subscription/api/subscription";
import { CheckoutDialog } from "@/features/subscription/components/CheckoutDialog";
import { EnterpriseEnquiryDialog } from "@/features/subscription/components/EnterpriseEnquiryDialog";
import type { SubscriptionPayload, SubscriptionPlan } from "@/features/subscription/types";

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function money(value: number) {
  return `₹${rupees.format(Math.round(value))}`;
}

/**
 * The subscription.
 *
 * What the clinic is paying for, what it has used, and what happens when the
 * trial runs out. The trial is stated plainly, because a trial that ends
 * quietly is a clinic that finds out too late.
 */
export function SubscriptionScreen() {
  const [payload, setPayload] = useState<SubscriptionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the two things the owner does here
  const [checkingOut, setCheckingOut] = useState<SubscriptionPlan | null>(null);
  const [enquiring, setEnquiring] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSubscription()
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the subscription");
      });
    return () => {
      alive = false;
    };
  }, []);

  const state = payload?.state ?? "trial";
  const current = payload?.plans.find((entry) => entry.id === payload?.planId);

  return (
    <AppShell activeHref="/subscription">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Subscription <em>&amp; plan</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload
              ? `${payload.planName} · ${
                  state === "trial"
                    ? `${payload.trialDaysLeft} days of trial left`
                    : state === "ended"
                      ? "the plan has ended"
                      : "active"
                }`
              : "Loading the plan…"}
          </p>
        </div>
        <div className="nq-btns">
          <Button variant="secondary" icon="send" onClick={() => setEnquiring(true)}>
            Enterprise enquiry
          </Button>
          <Button
            icon="rupee"
            onClick={() => {
              if (current) setCheckingOut(current);
            }}
          >
            Upgrade the plan
          </Button>
        </div>
      </div>

      {error ? (
        <div className="note red">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section
        className={cn(
          "card sb-now",
          state === "trial" && "trial",
          state === "ended" && "ended",
        )}
      >
        <div className="sb-plan">
          <div className="t-eyebrow">
            {state === "trial" ? "On trial" : state === "ended" ? "Ended" : "Active"}
          </div>
          <h2 className="t-h2" style={{ marginTop: 6 }}>
            {payload?.planName ?? "—"} plan
          </h2>
          <p>
            {state === "trial"
              ? `The trial ends on ${payload?.trialEndsOn ?? "—"}. After that the plan starts at ${
                  money(current?.price ?? 0)
                } a year.`
              : state === "ended"
                ? "The plan has ended. Nothing is lost — the records stay, and the plan can start again."
                : `Renews on ${payload?.renewalOn ?? "—"}.`}
          </p>
        </div>
        <div>
          <div className="sb-use">
            {(payload?.usage ?? []).map((entry) => {
              const pct = Math.min(100, Math.round((entry.used / Math.max(1, entry.limit)) * 100));
              return (
                <div key={entry.label}>
                  <div className="sb-use-h">
                    <span>{entry.label}</span>
                    <span>
                      {entry.used} of {entry.limit}
                    </span>
                  </div>
                  <div className={cn("sb-bar", pct >= 90 && "full")}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="t-eyebrow" style={{ marginBottom: 8 }}>
        The plans
      </div>
      <div className="plan-grid">
        {(payload?.plans ?? []).map((plan) => (
          <section className="card plan-col" key={plan.id}>
            <b style={{ fontSize: 16, color: "var(--forest)" }}>{plan.name}</b>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: "var(--forest)" }}>
              {plan.price > 0 ? money(plan.price) : "Talk to us"}
            </div>
            <p className="t-cap" style={{ marginTop: 4 }}>
              {plan.summary}
            </p>
            <ul className="plan-list" style={{ marginTop: 10 }}>
              {plan.includes.map((line) => (
                <li key={line}>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {plan.avoids.length > 0 ? (
              <ul className="plan-list avoid" style={{ marginTop: 8 }}>
                {plan.avoids.map((line) => (
                  <li key={line}>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div style={{ marginTop: 12 }}>
              {plan.price > 0 ? (
                <Button
                  size="sm"
                  variant={plan.id === payload?.planId ? "secondary" : "primary"}
                  onClick={() => setCheckingOut(plan)}
                >
                  {plan.id === payload?.planId ? "The current plan" : `Move to ${plan.name}`}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEnquiring(true)}>
                  Ask about this
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>

      {payload?.lastPayment ? (
        <div className="note mint" style={{ marginTop: 14 }}>
          <Icon name="check" size={18} />
          <span>
            Last paid {money(payload.lastPayment.amount)} by {payload.lastPayment.method} on{" "}
            {payload.lastPayment.on}.
          </span>
        </div>
      ) : null}

      <CheckoutDialog
        open={checkingOut !== null}
        onClose={() => setCheckingOut(null)}
        plan={
          checkingOut ?? payload?.plans[0] ?? { id: "clinic", name: "Clinic", price: 0, summary: "" }
        }
        plans={payload?.plans ?? []}
        onPay={(payment) => {
          void payForPlan(payment).then(() => void fetchSubscription().then(setPayload));
        }}
      />

      <EnterpriseEnquiryDialog
        open={enquiring}
        onClose={() => setEnquiring(false)}
        onEnquire={(enquiry) => {
          void sendEnquiry(enquiry);
        }}
      />
    </AppShell>
  );
}
