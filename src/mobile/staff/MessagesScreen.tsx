"use client";

import { useCallback, useState } from "react";
import { fetchMessages } from "@/features/messages/api/messages";
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

/** The kinds of message the clinic sends. */
const FILTERS = ["all", "token", "reminder", "prescription", "payment"] as const;

/**
 * The messages the clinic has sent, on a phone.
 *
 * The same log the desktop shows, filtered by the same kinds — and the
 * count of what failed, which is the one a person at the desk wants first.
 */
export function MobileMessagesScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const load = useCallback(() => fetchMessages(filter), [filter]);
  const { status, data, error, reload, unreachable } = useRemote(load, filter);

  const counts = data?.counts ?? {};
  const items = data?.items ?? [];

  return (
    <StaffShell activeHref="/m/messages">
      <MobileTitle title="Patient messages" line="Everything the clinic has sent" />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <div className="chips">
          {FILTERS.map((entry) => (
            <Chip key={entry} active={filter === entry} onClick={() => setFilter(entry)}>
              {entry === "all" ? "All" : entry}
              {counts[entry] !== undefined ? ` · ${counts[entry]}` : ""}
            </Chip>
          ))}
        </div>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <MobileEmpty
          title="Nothing sent yet"
          copy="Queue slips, reminders and prescriptions land here as they go out."
        />
      ) : null}

      {items.length > 0 ? (
        <MobileCard>
          <div className="mob-section">
            {items.map((item) => (
              <div key={item.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{item.patient.initials}</span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{item.patient.name}</b>
                  <small style={{ whiteSpace: "normal" }}>{item.body}</small>
                  <small style={{ whiteSpace: "normal" }}>
                    {item.channel} · {item.template} · {item.sentAt}
                  </small>
                </span>
                <span className="end">
                  <span className={item.failed ? "badge red" : "badge mint"}>{item.status}</span>
                  {item.canResend ? <span className="badge plain">Can resend</span> : null}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
