"use client";

import { useCallback } from "react";
import { fetchSubscription } from "@/features/subscription/api/subscription";
import { money } from "@/lib/format";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileKeyValue,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The clinic's plan on a phone.
 *
 * Which plan it is on, how long is left on the trial, what the plan is
 * used for, and what it would cost to change.
 */
export function MobileSubscriptionScreen() {
  const load = useCallback(() => fetchSubscription(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  return (
    <StaffShell activeHref="/m/subscription">
      <MobileTitle title="Subscription" line={data?.planName ?? "The clinic's plan"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <>
          <MobileCard title="Where the clinic stands">
            <MobileKeyValue
              label="State"
              value={
                data.state === "trial"
                  ? `Trial · ${data.trialDaysLeft} days left`
                  : data.state === "active"
                    ? "Active"
                    : "Ended"
              }
            />
            <MobileKeyValue label="Plan" value={data.planName} />
            {data.trialEndsOn ? (
              <MobileKeyValue label="Trial ends" value={data.trialEndsOn} />
            ) : null}
            {data.renewalOn ? (
              <MobileKeyValue label="Renews" value={data.renewalOn} />
            ) : null}
            {data.lastPayment ? (
              <MobileKeyValue
                label="Last payment"
                value={`${money(data.lastPayment.amount)} on ${data.lastPayment.on}`}
              />
            ) : null}
            <MobileKeyValue label="Billed to" value={data.clinic.email} />
          </MobileCard>

          <MobileCard title="Usage">
            <div className="mob-section">
              {data.usage.map((row) => (
                <div key={row.label} className="mob-row">
                  <span className="txt">
                    <b>{row.label}</b>
                  </span>
                  <span className="end">
                    {row.used} of {row.limit}
                  </span>
                </div>
              ))}
            </div>
          </MobileCard>

          {data.plans.length > 0 ? (
            <MobileCard title="The plans">
              <div className="mob-section">
                {data.plans.map((plan) => (
                  <div key={plan.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                    <span className="txt" style={{ whiteSpace: "normal" }}>
                      <b style={{ whiteSpace: "normal" }}>{plan.name}</b>
                      <small style={{ whiteSpace: "normal" }}>{plan.summary}</small>
                      <small style={{ whiteSpace: "normal" }}>{plan.includes.join(" · ")}</small>
                    </span>
                    <span className="end">{money(plan.price)}</span>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}
        </>
      ) : null}

      {status === "ready" && !data ? (
        <MobileEmpty title="Nothing to show" copy="The subscription could not be read." />
      ) : null}
    </StaffShell>
  );
}
