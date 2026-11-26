"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { StationCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ManageRow } from "@/components/ui/ManageRow";
import { EmptyState } from "@/components/ui/ScreenStates";
import { DoctorConsoleCard } from "@/features/dashboard/components/DoctorConsoleCard";
import { loadDashboard } from "@/features/dashboard/state/dashboardSlice";
import { nav, type Resource } from "@/constants/nav";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * The resource each path needs, from the nav the shell draws.
 *
 * The service sends the manage links as paths and the capability set is keyed
 * by resource, so the dashboard asks the nav which resource a path is rather
 * than keeping a second list of its own.
 */
const RESOURCE_BY_PATH: Record<string, Resource> = {};
for (const group of nav) {
  for (const entry of group.items) {
    if (entry.resource) RESOURCE_BY_PATH[entry.href] = entry.resource;
  }
}

/** What the sign-up hands over: the clinic's booking link, once. */
type ClinicCreated = {
  clinicName: string;
  bookingUrl: string;
};

/** The handover, when there is one. */
function readClinicCreated(state: unknown): ClinicCreated | null {
  if (!state || typeof state !== "object") return null;
  const handover = state as Partial<ClinicCreated>;
  if (typeof handover.bookingUrl !== "string" || !handover.bookingUrl) return null;
  return {
    clinicName: typeof handover.clinicName === "string" ? handover.clinicName : "",
    bookingUrl: handover.bookingUrl,
  };
}

export function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { status, dashboard, error } = useAppSelector((state) => state.dashboard);
  const session = useAppSelector((state) => state.session.session);
  const handover = useLocation().state;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

  const stations = dashboard?.stations ?? [];
  const doctors = dashboard?.doctors ?? [];

  /**
   * What the signed-in person may open.
   *
   * The dashboard itself needs the reporting capability. A console is a
   * different thing, and the two are not the same: a clinic administrator can
   * open the dashboard and cannot open a doctor's console, so the consoles
   * are drawn only for the people who may open one. The manage links are
   * filtered the same way — the service sends every link the clinic has, and
   * a front desk that followed a link to the staff screen would be refused.
   */
  const capabilities = session?.capabilities;
  const mayOpenConsole = Boolean(capabilities?.console);
  const manage = (dashboard?.manage ?? []).filter((link) => {
    const resource = RESOURCE_BY_PATH[link.href];
    if (!resource) return false;
    return Boolean(capabilities?.[resource]);
  });

  const created = readClinicCreated(handover);

  const copyBookingLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.bookingUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // the greeting is the person who is signed in, and the time of day
  const firstName = (session?.user.name ?? "there").replace(/^Dr\.?\s*/, "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // a manager is not a doctor, and a session that says nothing is not guessed at
  const title = session?.user.profileRole === "doctor" ? "Dr." : "";

  return (
    <AppShell activeHref="/dashboard">
      <div className="hello">
        <div>
          <h1 className="t-h1">
            {greeting}, {title} <em>{firstName}</em>
          </h1>
          <p>{dashboard?.meta ?? "Loading the dashboard…"}</p>
        </div>
      </div>

      {created ? (
        <section className="card" style={{ padding: 18, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icon name="cal" size={20} style={{ color: "var(--green-700)", flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 15 }}>
                {created.clinicName || "Your clinic"} is set up
              </b>
              <p style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                Patients book at{" "}
                <b style={{ wordBreak: "break-all" }}>{created.bookingUrl}</b>
              </p>
            </div>
            <Button variant="secondary" size="sm" icon="copy" onClick={copyBookingLink}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </section>
      ) : null}

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

      {mayOpenConsole ? (
        <>
          <div className="db-sec-head">
            <h2 className="t-h3">Open a doctor&apos;s console</h2>
            <span>One console for the whole clinic</span>
          </div>
          {doctors.length ? (
            <div className="db-docs">
              {doctors.map((doctor) => (
                <DoctorConsoleCard
                  key={doctor.id}
                  doctor={doctor}
                  current={doctor.id === session?.user.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No doctors yet"
              copy="Add a doctor and their console appears here."
              icon="stetho"
            />
          )}
        </>
      ) : null}

      {manage.length ? (
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
      ) : null}
    </AppShell>
  );
}
