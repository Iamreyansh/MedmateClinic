"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import {
  fetchActivity,
  fetchStaff,
  type ActivityEvent,
  type StaffMember,
} from "@/features/staff/api/staff";

/** The tabs the staff screen has. */
const TABS = [
  { value: "team", label: "Team" },
  { value: "activity", label: "Activity log" },
];

/**
 * The clinic's staff.
 *
 * Who is in the clinic and what each person may open, and the log of what
 * they have done.
 */
export function StaffScreen() {
  const [tab, setTab] = useState("team");
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchStaff(), fetchActivity()])
      .then(([people, log]) => {
        if (!alive) return;
        setStaff(people.items);
        setEvents(log.events);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the staff");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <AppShell activeHref="/staff">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Staff &amp; <em>roles</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Who is in the clinic, and what each person may open.
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus">Add someone</Button>
        </div>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}

      {loading && !staff ? <LoadingState title="Loading the staff…" /> : null}

      <div className="chips" style={{ marginBottom: 14 }}>
        {TABS.map((entry) => (
          <Chip key={entry.value} active={tab === entry.value} onClick={() => setTab(entry.value)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {tab === "team"
        ? staff && staff.length === 0 && !loading && !error
          ? (
            <EmptyState
              title="Nobody added yet"
              copy="Add the people who work here, and give each of them what they need."
              icon="users"
            />
          )
          : null
        : null}

      {tab === "team"
        ? (staff ?? []).map((person) => (
            <section className="card" key={person.id} style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar initials={person.initials || person.name.slice(0, 2)} tone="admin" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 15 }}>{person.name}</b>
                  <p className="t-cap" style={{ marginTop: 2 }}>
                    {person.role}
                    {person.detail ? ` · ${person.detail}` : ""}
                  </p>
                </div>
                <span className={person.level === "use" ? "badge mint" : "badge plain"}>
                  {person.level === "use" ? "Can use" : "Can view"}
                </span>
              </div>
            </section>
          ))
        : null}

      {tab === "activity"
        ? events && events.length === 0 && !loading && !error
          ? <EmptyState title="Nothing logged yet" copy="What the clinic does is written here." icon="queue" />
          : null
        : null}

      {tab === "activity"
        ? (events ?? []).map((event) => (
            <section className="card" key={event.id} style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="check" size={16} style={{ color: "var(--green)" }} />
                <div>
                  <b style={{ fontSize: 14 }}>{event.detail}</b>
                  <p className="t-cap" style={{ marginTop: 2 }}>
                    {event.action} · {event.role ?? "—"} · {event.at}
                  </p>
                </div>
              </div>
            </section>
          ))
        : null}
    </AppShell>
  );
}
