"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { StationCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ManageRow } from "@/components/ui/ManageRow";
import { loadDashboard } from "@/features/dashboard/state/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { status, dashboard, error } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

  const stations = dashboard?.stations ?? [];
  const manage = dashboard?.manage ?? [];

  return (
    <AppShell activeHref="/dashboard">
      <div className="hello">
        <div>
          <h1 className="t-h1">
            Good morning, Dr. <em>Ananya</em>
          </h1>
          <p>{dashboard?.meta ?? "Loading the dashboard…"}</p>
        </div>
      </div>

      {status === "error" ? <div className="note red">{error}</div> : null}

      {dashboard?.trial ? (
        <div className="db-trial">
          <Icon name="alert" size={18} />
          <span>{dashboard.trial.message}</span>
          <Button variant="forest">{dashboard.trial.action}</Button>
        </div>
      ) : null}

      <div className="db-sec-head">
        <h2 className="t-h3">Open a station</h2>
        <span>Patients move left to right, top to bottom</span>
      </div>
      <div className="st-grid">
        {stations.map((station) => (
          <StationCard
            key={station.title}
            icon={station.icon}
            tone={station.tone}
            title={station.title}
            description={station.description}
            count={station.count}
            countWarn={station.countWarn}
            tag={station.tag}
          />
        ))}
      </div>

      <section className="db-section">
        <h2 className="t-h3">Manage</h2>
        <div className="mg-grid">
          {manage.map((link) => (
            <ManageRow
              key={link.title}
              icon={link.icon}
              title={link.title}
              description={link.description}
              value={link.count}
              href={link.href}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
