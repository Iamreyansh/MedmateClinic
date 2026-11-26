"use client";

import { useCallback } from "react";
import { fetchClinicSettings } from "@/mobile/api";
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
 * The clinic's own card on a phone.
 *
 * The settings the service holds — the clinic's name, its registration, its
 * branches and the services it offers. This is the first screen in the app
 * to read them, so nothing here is written down twice.
 */
export function MobileSettingsScreen() {
  const load = useCallback(() => fetchClinicSettings(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const clinic = data?.clinic;

  return (
    <StaffShell activeHref="/m/settings">
      <MobileTitle title="Settings" line="The clinic's card, branches and services" />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {status === "ready" && !clinic ? (
        <MobileEmpty title="Nothing to show" copy="The clinic's settings could not be read." />
      ) : null}

      {clinic ? (
        <>
          <MobileCard title={clinic.name}>
            <MobileKeyValue label="Address" value={clinic.address} />
            <MobileKeyValue label="City" value={`${clinic.city}, ${clinic.state}`} />
            <MobileKeyValue label="Phone" value={clinic.phone} />
            <MobileKeyValue label="Email" value={clinic.email} />
            <MobileKeyValue label="GSTIN" value={clinic.gstin || "Not set"} />
            <MobileKeyValue label="PAN" value={clinic.pan || "Not set"} />
            <MobileKeyValue label="Registration" value={clinic.registration || "Not set"} />
            <MobileKeyValue label="HFR ID" value={clinic.hfrId || "Not set"} />
            <MobileKeyValue label="PIN" value={clinic.pin} />
            <MobileKeyValue label="Branches" value={clinic.locations} />
            <MobileKeyValue
              label="Booking slug"
              value={clinic.bookingSlug || "Not set"}
            />
          </MobileCard>

          {data && data.locations.length > 0 ? (
            <MobileCard title="Branches">
              <div className="mob-section">
                {data.locations.map((branch) => (
                  <div key={`${branch.name}-${branch.hfrId}`} className="mob-row">
                    <span className="txt" style={{ whiteSpace: "normal" }}>
                      <b style={{ whiteSpace: "normal" }}>{branch.name}</b>
                      <small style={{ whiteSpace: "normal" }}>
                        {branch.address}, {branch.city}
                      </small>
                    </span>
                    <span className="end">{branch.rooms} rooms</span>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}

          {data && data.services.length > 0 ? (
            <MobileCard title="Services">
              <div className="mob-section">
                {data.services.map((service) => (
                  <div key={service.id} className="mob-row">
                    <span className="txt" style={{ whiteSpace: "normal" }}>
                      <b style={{ whiteSpace: "normal" }}>{service.name}</b>
                      {service.speciality ? (
                        <small style={{ whiteSpace: "normal" }}>{service.speciality}</small>
                      ) : null}
                    </span>
                    <span className="end">
                      {service.durationMinutes !== undefined ? (
                        <span className="badge plain">{service.durationMinutes} min</span>
                      ) : null}
                      {service.price !== undefined ? (
                        <span className="badge mint">{service.price}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}
        </>
      ) : null}
    </StaffShell>
  );
}
