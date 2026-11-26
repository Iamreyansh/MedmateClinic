"use client";

import { useCallback } from "react";
import { fetchAppointments } from "@/features/schedule/api/schedule";
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
 * The appointment book on a phone.
 *
 * The day as the front desk sees it: how many are booked, who they are
 * with, and what each one is in for.
 */
export function MobileScheduleScreen() {
  const load = useCallback(() => fetchAppointments({ view: "day" }), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const appointments = data?.appointments ?? [];
  const summary = data?.summary;
  const doctors = data?.doctors ?? [];

  return (
    <StaffShell activeHref="/m/schedule">
      <MobileTitle title="Appointments" line={data?.dateLabel ?? "The day's book"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {summary ? (
        <MobileStats
          four
          items={[
            { value: summary.booked, label: "Booked" },
            { value: summary.toCome, label: "To come" },
            { value: summary.done, label: "Done" },
            { value: summary.noShow, label: "No show" },
          ]}
        />
      ) : null}

      {doctors.length > 0 ? (
        <MobileCard title="Doctors">
          <div className="mob-section">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="mob-row">
                <span className="txt">
                  <b>{doctor.name}</b>
                  <small>
                    {doctor.speciality}
                    {doctor.room ? ` · ${doctor.room}` : ""}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {status === "ready" && appointments.length === 0 ? (
        <MobileEmpty title="Nothing booked" copy="No appointment is booked for this day." />
      ) : null}

      {appointments.length > 0 ? (
        <MobileCard title="The day">
          <div className="mob-section">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico" style={{ fontWeight: 800, fontSize: 12 }}>
                  {appointment.time?.slice(0, 5) ?? "--"}
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>
                    {appointment.patient.name} · {appointment.patient.age} {appointment.patient.sex}
                  </b>
                  <small style={{ whiteSpace: "normal" }}>{appointment.reason}</small>
                </span>
                <span className="end">
                  <span className="badge plain">{appointment.status}</span>
                  {appointment.mode ? (
                    <span className="badge mint">{appointment.mode}</span>
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
