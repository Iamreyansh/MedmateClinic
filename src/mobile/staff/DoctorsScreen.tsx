"use client";

import { useCallback } from "react";
import { fetchDoctors } from "@/features/doctors/api/doctors";
import { money } from "@/lib/format";
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
 * The clinic's doctors on a phone.
 *
 * Who they are, where they sit, what they charge and how free they are
 * today — the facts on the desktop doctor cards.
 */
export function MobileDoctorsScreen() {
  const load = useCallback(() => fetchDoctors(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const doctors = data ?? [];

  return (
    <StaffShell activeHref="/m/doctors">
      <MobileTitle title="Doctors" line={`${doctors.length} in the clinic`} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {status === "ready" && doctors.length === 0 ? (
        <MobileEmpty title="No doctors yet" copy="Add the clinic's doctors to start seeing patients." />
      ) : null}

      {doctors.length > 0 ? (
        <MobileCard>
          <div className="mob-section">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="mob-row" style={{ alignItems: "flex-start" }}>
                <span className="ico">
                  <IconInitials name={doctor.name} />
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{doctor.name}</b>
                  <small style={{ whiteSpace: "normal" }}>{doctor.speciality}</small>
                  <small style={{ whiteSpace: "normal" }}>
                    {doctor.room ? `${doctor.room} · ` : ""}
                    {doctor.registration ? `${doctor.registration} · ` : ""}
                    {doctor.hours
                      ? typeof doctor.hours === "string"
                        ? doctor.hours
                        : doctor.hours.join(" – ")
                      : "Hours not set"}
                  </small>
                  {doctor.fee !== undefined ? (
                    <small style={{ whiteSpace: "normal" }}>
                      {money(doctor.fee)} in the clinic
                      {doctor.videoFee !== undefined ? ` · ${money(doctor.videoFee)} video` : ""}
                    </small>
                  ) : null}
                </span>
                <span className="end">
                  {doctor.waiting ? <span className="badge gold">{doctor.waiting} waiting</span> : null}
                  {doctor.nextFree ? (
                    <span className="badge mint">Free {doctor.nextFree}</span>
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

/** The initials of a name. */
function IconInitials({ name }: { name: string }) {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return <span style={{ fontWeight: 800, fontSize: 12 }}>{initials}</span>;
}
