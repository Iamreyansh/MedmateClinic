"use client";

import { useCallback, useMemo, useState } from "react";
import { fetchReport } from "@/features/reports/api/reports";
import type { ReportTab } from "@/features/reports/types/reports";
import { money } from "@/lib/format";
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

/** The day, as the service wants it. */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The range the reports open on: the last thirty days. */
function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: isoDay(from), to: isoDay(to) };
}

/**
 * The owner's reports on a phone.
 *
 * The same four views the desktop reports have: the summary, the bookings,
 * the clinical picture and the consultation list.
 */
export function MobileReportsScreen() {
  const [tab, setTab] = useState<ReportTab>("summary");
  const range = useMemo(() => defaultRange(), []);
  const load = useCallback(
    () => fetchReport({ tab, from: range.from, to: range.to }),
    [tab, range.from, range.to],
  );
  const { status, data, error, reload, unreachable } = useRemote(load, tab);

  const summary = data?.summary;
  const bookings = data?.bookings;
  const clinical = data?.clinical;
  const consults = data?.consults;

  return (
    <StaffShell activeHref="/m/reports">
      <MobileTitle title="Reports" line={data?.range?.label ?? "The last thirty days"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <div className="chips">
          {data.tabs.map((entry) => (
            <Chip key={entry} active={tab === entry} onClick={() => setTab(entry)}>
              {entry}
            </Chip>
          ))}
        </div>
      ) : null}

      {summary ? (
        <MobileCard title="The summary">
          <div className="mob-section">
            {summary.kpis.map((kpi) => (
              <div key={kpi.key} className="mob-row">
                <span className="txt">
                  <b>{kpi.label}</b>
                  <small>{kpi.hint}</small>
                </span>
                <span className="end">
                  {kpi.suffix === "₹" ? money(kpi.value) : `${kpi.value}${kpi.suffix}`}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {summary && summary.byDoctor.length > 0 ? (
        <MobileCard title="By doctor">
          <div className="mob-section">
            {summary.byDoctor.map((row) => (
              <div key={row.doctorId ?? row.name} className="mob-row">
                <span className="txt">
                  <b>{row.name}</b>
                  <small>{row.consultations} consultations</small>
                </span>
                <span className="end">{money(row.amount)}</span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {bookings ? (
        <>
          <MobileCard title="Bookings & waiting">
            <div className="mob-section">
              {bookings.kpis.map((kpi) => (
                <div key={kpi.key} className="mob-row">
                  <span className="txt">
                    <b>{kpi.label}</b>
                    <small>{kpi.hint}</small>
                  </span>
                  <span className="end">{kpi.value}</span>
                </div>
              ))}
            </div>
          </MobileCard>
          {bookings.followUps.missedPatients.length > 0 ? (
            <MobileCard title="Follow-ups missed">
              <div className="mob-section">
                {bookings.followUps.missedPatients.map((entry) => (
                  <div key={entry.patientId} className="mob-row">
                    <span className="txt">
                      <b>{entry.name}</b>
                      <small>{entry.due ?? "No date"}</small>
                    </span>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}
        </>
      ) : null}

      {clinical ? (
        <>
          <MobileCard title="Clinical">
            <div className="mob-section">
              {clinical.kpis.map((kpi) => (
                <div key={kpi.key} className="mob-row">
                  <span className="txt">
                    <b>{kpi.label}</b>
                    <small>{kpi.hint}</small>
                  </span>
                  <span className="end">{kpi.value}</span>
                </div>
              ))}
            </div>
          </MobileCard>
          {clinical.topDiagnoses.length > 0 ? (
            <MobileCard title="Commonest diagnoses">
              <div className="mob-section">
                {clinical.topDiagnoses.map((row) => (
                  <div key={`${row.code ?? "none"}-${row.label}`} className="mob-row">
                    <span className="txt">
                      <b>{row.label}</b>
                      {row.code ? <small>{row.code}</small> : null}
                    </span>
                    <span className="end">{row.count}</span>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}
        </>
      ) : null}

      {consults ? (
        <MobileCard title={`Consultations · ${consults.from}–${consults.to}`}>
          {consults.rows.length === 0 ? (
            <MobileEmpty title="No consultations" copy="Nothing in this period." />
          ) : (
            <div className="mob-section">
              {consults.rows.map((row) => (
                <div key={`${row.date ?? "none"}-${row.token}`} className="mob-row">
                  <span className="txt" style={{ whiteSpace: "normal" }}>
                    <b style={{ whiteSpace: "normal" }}>{row.patient}</b>
                    <small style={{ whiteSpace: "normal" }}>
                      {row.date ?? "—"} · {row.doctor ?? "No doctor"}
                      {row.diagnosis ? ` · ${row.diagnosis}` : ""}
                    </small>
                  </span>
                  <span className="end">
                    <span className="badge plain">{row.billLabel}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
