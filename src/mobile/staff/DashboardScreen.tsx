"use client";

import { useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard } from "@/features/dashboard/api/dashboard";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileRow,
  MobileTitle,
} from "@/mobile/components";

/**
 * The owner's dashboard on a phone.
 *
 * The same payload the desktop dashboard reads: the clinic's work at the
 * top, the stations, the doctors and the management links.
 */
export function MobileDashboardScreen() {
  const load = useCallback(() => fetchDashboard(), []);
  const { status, data, error, reload } = useRemote(load);

  return (
    <StaffShell activeHref="/m/dashboard">
      <MobileTitle title="Dashboard" line={data?.meta ?? "The clinic at a glance"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? <MobileError message={error} onRetry={reload} /> : null}

      {data?.trial ? (
        <div className="note gold">
          <Icon name="spark" size={18} />
          <div style={{ flex: 1 }}>
            <b>{data.trial.action}</b>
            <p style={{ marginTop: 4 }}>{data.trial.message}</p>
          </div>
          <Link className="btn sm gold" to={data.trial.href}>
            Open
          </Link>
        </div>
      ) : null}

      {data && data.stations.length === 0 && data.doctors.length === 0 ? (
        <MobileEmpty
          title="Nothing to open yet"
          copy="The clinic's stations appear here once the team is set up."
        />
      ) : null}

      {data && data.stations.length > 0 ? (
        <MobileCard title="Stations">
          <div className="mob-section">
            {data.stations.map((station) => (
              <MobileRow
                key={station.title}
                icon={station.icon}
                title={station.title}
                body={station.description}
                end={
                  station.count ? (
                    <span className={station.countWarn ? "badge red" : "badge mint"}>{station.count}</span>
                  ) : null
                }
              />
            ))}
          </div>
        </MobileCard>
      ) : null}

      {data && data.doctors.length > 0 ? (
        <MobileCard title="Doctors">
          <div className="mob-section">
            {data.doctors.map((doctor) => (
              <div key={doctor.name} className="mob-row">
                <Avatar initials={doctor.initials} tone="doctor" />
                <span className="txt">
                  <b>{doctor.name}</b>
                  <small>
                    {doctor.speciality}
                    {doctor.room ? ` · ${doctor.room}` : ""}
                  </small>
                </span>
                <span className="end">
                  {doctor.current ? (
                    <span className="badge mint">In consult</span>
                  ) : doctor.waiting > 0 ? (
                    <span className="badge plain">{doctor.waiting} waiting</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {data && data.manage.length > 0 ? (
        <MobileCard title="Manage">
          <div className="mob-section">
            {data.manage.map((entry) => (
              <MobileRow
                key={entry.href}
                icon={entry.icon}
                title={entry.title}
                body={entry.description}
                href={entry.href}
                count={entry.count}
              />
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
