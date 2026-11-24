import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { StationCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ManageRow } from "@/components/marketing/ManageRow";
import {
  clinic,
  dashboardMeta,
  doctors,
  firstName,
  location,
  manage,
  navCounts,
  signedIn,
  stations,
  trial,
} from "@/lib/fixtures/dashboard";

/**
 * The dashboard shows the signed-in person's own data and greets them by the
 * clock, so it is rendered per request rather than prerendered.
 */
export const instant = false;

export default async function DashboardPage() {
  // The greeting follows the clock, and the dashboard shows the signed-in
  // person's own data — so the route is rendered per request, not prerendered.
  await connection();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell
      activeHref="/dashboard"
      clinic={{
        initials: clinic.initials,
        name: clinic.name,
        detail: `${clinic.locations} locations · ${clinic.doctors} doctors`,
      }}
      user={{ initials: signedIn.initials, name: signedIn.name, detail: signedIn.detail, tone: signedIn.tone }}
      location={location}
      counts={navCounts}
    >
      <div className="hello">
        <div>
          <h1 className="t-h1">
            {greeting}, Dr. <em>{firstName}</em>
          </h1>
          <p>{dashboardMeta}</p>
        </div>
      </div>

      <div className="db-trial">
        <Icon name="alert" size={18} />
        <span>{trial.message}</span>
        <Link href={trial.href}>
          <Button variant="forest">{trial.action}</Button>
        </Link>
      </div>

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
        <div className="t-eyebrow">Open a doctor&apos;s console</div>
        <div className="db-docs">
          {doctors.map((doctor) => (
            <div key={doctor.name} className={`db-doc${doctor.current ? " current" : ""}`}>
              <Avatar initials={doctor.initials} />
              <span className="db-doc-who">
                <b>{doctor.name}</b>
                <small>
                  {doctor.speciality} · {doctor.room}
                </small>
              </span>
              <span className="db-doc-count">{doctor.waiting}</span>
            </div>
          ))}
        </div>
      </section>

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
