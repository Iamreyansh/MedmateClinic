import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { StationCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  clinic,
  firstName,
  firstPatient,
  location,
  navCounts,
  signedIn,
  stations,
  welcome,
} from "@/lib/data/dashboard";

export default function DashboardPage() {
  return (
    <AppShell
      activeHref="/dashboard"
      clinic={{
        initials: clinic.initials,
        name: clinic.name,
        detail: `${clinic.locations} location · ${clinic.doctors} doctor`,
      }}
      user={{ initials: signedIn.initials, name: signedIn.name, detail: signedIn.detail, tone: signedIn.tone }}
      location={location}
      counts={navCounts}
    >
      <section className="db-welcome">
        <h1>
          Welcome to <em>MedMate</em>, {firstName}
        </h1>
        <p>{welcome.body}</p>
      </section>

      <section className="db-check">
        <div className="db-check-head">
          <b>{firstPatient.title}</b>
          <span className="badge">
            {firstPatient.done} of {firstPatient.total} done
          </span>
        </div>
        <div className="db-check-list">
          {firstPatient.items.map((item) => (
            <div key={item.title} className={`db-check-item${item.done ? " done" : ""}`}>
              {item.done ? (
                <span className="tick">
                  <Icon name="check" size={14} />
                </span>
              ) : (
                <Icon name="spark" size={18} className="star" />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </span>
              {item.action ? (
                <Link href={item.href ?? "#"}>
                  <Button variant="secondary">{item.action}</Button>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <h2 className="t-h3" style={{ margin: "24px 0 12px" }}>
        Open a station
      </h2>
      <div className="st-grid">
        {stations.map((station) => (
          <StationCard
            key={station.title}
            icon={station.icon}
            tone={station.tone}
            title={station.title}
            description={station.description}
            tag={station.tag}
          />
        ))}
      </div>
    </AppShell>
  );
}
