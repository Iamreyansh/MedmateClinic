"use client";

import { useCallback } from "react";
import { fetchTeleconsult } from "@/mobile/api";
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
 * The teleconsult waiting room on a phone.
 *
 * Who has joined the call, and the consent the doctor has to have before a
 * video consultation may begin.
 */
export function MobileTeleconsultScreen() {
  const load = useCallback(() => fetchTeleconsult(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  return (
    <StaffShell activeHref="/m/teleconsult">
      <MobileTitle title="Teleconsult" line={data?.meta ?? "The waiting room"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data && data.waiting.length === 0 ? (
        <MobileEmpty
          title="Nobody is waiting"
          copy="Patients who have been sent a link appear here when they join."
        />
      ) : null}

      {data && data.waiting.length > 0 ? (
        <MobileCard title="Waiting">
          <div className="mob-section">
            {data.waiting.map((entry) => (
              <div key={entry.patient.id} className="mob-row">
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 13 }}>
                    {entry.patient.initials ?? entry.patient.name.slice(0, 2).toUpperCase()}
                  </span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {entry.patient.name} · {entry.patient.age} {entry.patient.sex}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>{entry.reason}</small>
                  <small style={{ whiteSpace: "normal" }}>Booked {entry.booked}</small>
                </span>
                <span className="end">
                  <span className={entry.state === "Joined" ? "badge mint" : "badge plain"}>
                    {entry.state}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {data && data.consent.length > 0 ? (
        <MobileCard title="Consent">
          <div className="mob-section">
            {data.consent.map((entry) => (
              <div key={entry.label} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{entry.label}</b>
                  <small style={{ whiteSpace: "normal" }}>{entry.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
