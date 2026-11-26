"use client";

import { useCallback, useState } from "react";
import { fetchTill } from "@/features/billing/api/billing";
import { money } from "@/lib/format";
import { Chip } from "@/components/ui/Chip";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileStats,
  MobileTitle,
} from "@/mobile/components";

/** The tabs the till's bills are filtered on. */
const TABS = ["All", "Unpaid", "Paid", "Refunded"] as const;

/**
 * The till on a phone.
 *
 * What came in today, how it came in, and every bill of the day — the same
 * numbers the desktop billing screen reads.
 */
export function MobileBillingScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const load = useCallback(() => fetchTill(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const bills = (data?.bills ?? []).filter((bill) => {
    if (tab === "All") return true;
    if (tab === "Unpaid") return bill.status === "unpaid";
    return bill.status === tab.toLowerCase();
  });

  return (
    <StaffShell activeHref="/m/billing">
      <MobileTitle title="Billing & POS" line={data?.dayLabel ?? "The till for today"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <MobileStats
          items={[
            { value: money(data.summary.collected), label: "Collected" },
            { value: data.summary.bills, label: "Bills" },
            {
              value: money(data.summary.pendingAmount),
              label: `${data.summary.pendingCount} still owed`,
              hot: data.summary.pendingAmount > 0,
            },
          ]}
        />
      ) : null}

      {data && data.byMode.length > 0 ? (
        <MobileCard title="How it came in">
          <div className="mob-section">
            {data.byMode.map((row) => (
              <div key={row.mode} className="mob-row">
                <span className="txt">
                  <b>{row.label}</b>
                  <small>
                    {row.bills} {row.bills === 1 ? "bill" : "bills"}
                  </small>
                </span>
                <span className="end">{money(row.amount)}</span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {data ? (
        <div className="chips">
          {TABS.map((entry) => (
            <Chip key={entry} active={tab === entry} onClick={() => setTab(entry)}>
              {entry}
            </Chip>
          ))}
        </div>
      ) : null}

      {status === "ready" && bills.length === 0 ? (
        <MobileEmpty
          title="No bills here"
          copy={tab === "All" ? "No bill has been raised today." : `No ${tab.toLowerCase()} bills today.`}
        />
      ) : null}

      {bills.length > 0 ? (
        <MobileCard title="Bills">
          <div className="mob-section">
            {bills.map((bill) => (
              <div key={bill.invoiceId} className="mob-row">
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{bill.patient.name}</b>
                  <small style={{ whiteSpace: "normal" }}>
                    {bill.number} · {bill.description}
                  </small>
                </span>
                <span className="end">
                  <span className="end">{money(bill.amount)}</span>
                  <span
                    className={
                      bill.status === "paid" ? "badge mint" : bill.status === "refunded" ? "badge plain" : "badge red"
                    }
                  >
                    {bill.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
