"use client";

import { useCallback } from "react";
import { fetchStaff, fetchActivity } from "@/features/staff/api/staff";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The team and what it may open, on a phone.
 *
 * The same two payloads the desktop staff screen reads: the people, and the
 * activity log of what they have done.
 */
export function MobileStaffScreen() {
  const load = useCallback(() => Promise.all([fetchStaff(), fetchActivity()]), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const members = data?.[0].items ?? [];
  const activity = data?.[1].events ?? [];

  return (
    <StaffShell activeHref="/m/staff">
      <MobileTitle title="Staff & roles" line={data?.[0].meta ?? "Who may open what"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {status === "ready" && members.length === 0 ? (
        <MobileEmpty title="Nobody yet" copy="Add the people who work at the clinic." />
      ) : null}

      {members.length > 0 ? (
        <MobileCard title="The team">
          <div className="mob-section">
            {members.map((member) => (
              <div key={member.id} className="mob-row">
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{member.initials}</span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{member.name}</b>
                  <small style={{ whiteSpace: "normal" }}>
                    {member.role}
                    {member.detail ? ` · ${member.detail}` : ""}
                  </small>
                  {member.email ? (
                    <small style={{ whiteSpace: "normal" }}>{member.email}</small>
                  ) : null}
                </span>
                <span className="end">
                  <span className={member.level === "use" ? "badge mint" : "badge plain"}>
                    {member.level === "use" ? "Can act" : "Can view"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {activity.length > 0 ? (
        <MobileCard title="What has been done">
          <div className="mob-section">
            {activity.map((event) => (
              <div key={event.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{event.actor ?? "The clinic"}</b>
                  <small style={{ whiteSpace: "normal" }}>{event.detail}</small>
                  <small style={{ whiteSpace: "normal" }}>
                    {event.action} · {event.at}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
