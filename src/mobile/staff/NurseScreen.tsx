"use client";

import { useCallback } from "react";
import { fetchNurseStation } from "@/features/nurse/api/nurse";
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

/**
 * The nurse station on a phone.
 *
 * Who is in the clinic, who still needs a reading, and who is ready to be
 * called in — the same three numbers the desktop nurse station counts.
 */
export function MobileNurseScreen() {
  const load = useCallback(() => fetchNurseStation(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const items = data?.items ?? [];
  const counts = data?.counts;

  return (
    <StaffShell activeHref="/m/nurse">
      <MobileTitle title="Nurse station" line={data?.meta ?? "Everyone in the clinic today"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {counts ? (
        <MobileStats
          items={[
            { value: counts.needVitals, label: "Need vitals" },
            { value: counts.urgent, label: "Urgent", hot: counts.urgent > 0 },
            { value: counts.ready, label: "Ready" },
          ]}
        />
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <MobileEmpty
          title="Nobody in the clinic"
          copy="Patients appear here as they check in at the kiosk or the desk."
        />
      ) : null}

      {items.length > 0 ? (
        <MobileCard title="In the clinic">
          <div className="mob-section">
            {items.map((item) => (
              <div key={item.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span
                  className="tk"
                  style={
                    item.priority === "emergency"
                      ? { background: "var(--red-bg)", color: "var(--red)" }
                      : item.priority === "urgent"
                        ? { background: "var(--gold-50)", color: "var(--gold-ink)" }
                        : undefined
                  }
                >
                  {item.token}
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {item.patient.name} · {item.patient.age} {item.patient.sex}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>{item.reason ?? "No complaint recorded"}</small>
                  <small style={{ whiteSpace: "normal" }}>
                    {item.doctor?.name ?? item.nextDoctor?.name ?? "No doctor yet"}
                    {item.waitedMinutes > 0 ? ` · waited ${item.waitedMinutes} min` : ""}
                  </small>
                  {item.vitals ? (
                    <small style={{ whiteSpace: "normal" }}>
                      {item.vitals.tempF !== null ? `Temp ${item.vitals.tempF} °F` : "Temp —"}
                      {item.vitals.bp ? ` · ${item.vitals.bp}` : ""}
                      {item.vitals.spo2 !== null ? ` · SpO₂ ${item.vitals.spo2}%` : ""}
                    </small>
                  ) : (
                    <small style={{ whiteSpace: "normal" }}>No reading taken yet</small>
                  )}
                </span>
                <span className="end">
                  {item.ready ? (
                    <span className="badge mint">Ready</span>
                  ) : item.vitals ? (
                    <span className="badge plain">With the doctor</span>
                  ) : (
                    <span className="badge gold">Needs vitals</span>
                  )}
                  {item.priority !== "normal" ? (
                    <span className="badge red">{item.priority}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
