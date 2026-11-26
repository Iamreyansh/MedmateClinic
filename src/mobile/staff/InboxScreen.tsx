"use client";

import { useCallback, useState } from "react";
import { fetchInbox } from "@/mobile/api";
import { Chip } from "@/components/ui/Chip";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/** The buckets the inbox is filtered by. */
const FILTERS = ["All", "Result", "Referral", "Handover"] as const;

/**
 * The doctor's inbox on a phone.
 *
 * The same four buckets the desktop inbox has, and the same counts.
 */
export function MobileInboxScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const load = useCallback(() => fetchInbox(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const items = (data?.items ?? []).filter((item) => filter === "All" || item.kind === filter);
  const counts = data?.counts ?? {};

  return (
    <StaffShell activeHref="/m/inbox">
      <MobileTitle title="Inbox" line={data?.meta ?? "Results, referrals and handovers"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <div className="chips">
          {FILTERS.map((entry) => (
            <Chip key={entry} active={filter === entry} onClick={() => setFilter(entry)}>
              {entry}
              {counts[entry] !== undefined ? ` · ${counts[entry]}` : ""}
            </Chip>
          ))}
        </div>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <MobileEmpty
          title="Nothing here"
          copy={
            filter === "All"
              ? "Results, referrals and handovers land here as the clinic works."
              : "Nothing of that kind right now."
          }
        />
      ) : null}

      {items.length > 0 ? (
        <MobileCard>
          <div className="mob-section">
            {items.map((item) => (
              <div key={item.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 13 }}>
                    {item.patient.initials ?? item.patient.name.slice(0, 2).toUpperCase()}
                  </span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{item.title}</b>
                  <small style={{ whiteSpace: "normal" }}>
                    {item.patient.name} · {item.patient.age} {item.patient.sex}
                  </small>
                  <small style={{ whiteSpace: "normal" }}>{item.body}</small>
                </span>
                <span className="end">
                  {item.critical ? <span className="badge red">Critical</span> : null}
                  <span className="badge plain">{item.time}</span>
                  <span className="badge mint">{item.kind}</span>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
