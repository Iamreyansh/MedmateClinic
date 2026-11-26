"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { MyAccountDialog } from "@/components/dialogs/MyAccountDialog";
import {
  fetchActivity,
  fetchRoles,
  fetchScreens,
  fetchTeam,
  type ActivityEvent,
  type CapabilityScreen,
  type ClinicRole,
  type TeamMember,
} from "@/features/staff/api/staff";
import { AddMemberDialog } from "@/features/staff/components/AddMemberDialog";
import { EditMemberDialog } from "@/features/staff/components/EditMemberDialog";
import { PersonAccessDialog } from "@/features/staff/components/PersonAccessDialog";
import { NewProfileDialog } from "@/features/staff/components/NewProfileDialog";

/** The tabs the staff screen has. */
const TABS = [
  { value: "team", label: "Team" },
  { value: "roles", label: "Roles & access" },
  { value: "activity", label: "Activity log" },
];

/**
 * The clinic's staff.
 *
 * <p>Who is in the clinic and what each person may open, the matrix of what
 * each role may open, and the log of what they have done.
 */
export function StaffScreen() {
  const [tab, setTab] = useState("team");
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [roles, setRoles] = useState<ClinicRole[]>([]);
  const [screens, setScreens] = useState<CapabilityScreen[]>([]);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [accessFor, setAccessFor] = useState<TeamMember | null>(null);
  const [profiling, setProfiling] = useState(false);
  const [account, setAccount] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchTeam(), fetchRoles(), fetchScreens(), fetchActivity()])
      .then(([people, roleList, screenList, log]) => {
        setTeam(people.items);
        setRoles(roleList.items);
        setScreens(screenList.items);
        setEvents(log.events);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load the staff");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, attempt]);

  const refresh = () => {
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  const doctors = useMemo(() => roles.filter((role) => role.name === "doctor").length, [roles]);
  const totalPeople = roles.reduce((sum, role) => sum + role.people, 0);

  return (
    <AppShell activeHref="/staff" onAccount={() => setAccount(true)}>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Staff &amp; <em>roles</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {team
              ? `${team.length} ${team.length === 1 ? "person" : "people"} · ${doctors} ${
                  doctors === 1 ? "doctor" : "doctors"
                }`
              : "Who is in the clinic, and what each person may open."}
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus" onClick={() => setAdding(true)}>
            Add someone
          </Button>
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

      {loading && !team ? <LoadingState title="Loading the staff…" /> : null}

      <div className="chips" style={{ marginBottom: 14 }}>
        {TABS.map((entry) => (
          <Chip key={entry.value} active={tab === entry.value} onClick={() => setTab(entry.value)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {tab === "team" ? (
        team && team.length === 0 && !loading && !error ? (
          <EmptyState
            title="Nobody added yet"
            copy="Add the people who work here, and give each of them what they need."
            icon="users"
          />
        ) : null
      ) : null}

      {tab === "team"
        ? (team ?? []).map((person) => (
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
                  {person.level === "use" ? "Can use" : person.level === "view" ? "Can view" : "No access"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Button variant="secondary" size="sm" icon="pen" onClick={() => setEditing(person)}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" icon="shield" onClick={() => setAccessFor(person)}>
                  Person access
                </Button>
              </div>
            </section>
          ))
        : null}

      {tab === "roles" ? (
        <>
          <section className="card" style={{ padding: 18, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 16 }}>Who can open what</b>
                <p className="t-cap" style={{ marginTop: 4 }}>
                  Each person gets one profile. Change it here, and it applies on their next page;
                  nobody is signed out.
                </p>
              </div>
              <Button variant="secondary" size="sm" icon="plus" onClick={() => setProfiling(true)}>
                New profile
              </Button>
            </div>
          </section>

          <section className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="st-matrix" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px" }}>Screen</th>
                  {roles.map((role) => (
                    <th key={role.id} className="c" style={{ padding: "12px" }}>
                      {role.label}
                      <br />
                      <span className="t-cap">
                        {role.people} {role.people === 1 ? "person" : "people"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {screens.map((screen, index) => {
                  const previous = screens[index - 1];
                  const head = !previous || previous.group !== screen.group;
                  return (
                    <Fragment key={screen.resource}>
                      {head ? (
                        <tr>
                          <td
                            className="t-eyebrow"
                            colSpan={roles.length + 1}
                            style={{ padding: "12px 12px 4px" }}
                          >
                            {screen.group}
                          </td>
                        </tr>
                      ) : null}
                      <tr>
                        <td style={{ padding: "10px 12px" }}>
                          {screen.label}
                          {screen.locked ? (
                            <span className="t-cap" style={{ display: "block" }}>
                              Fixed by law
                            </span>
                          ) : null}
                        </td>
                        {roles.map((role) => {
                          const level = role.capabilities[screen.resource] ?? "none";
                          return (
                            <td
                              key={`${screen.resource}-${role.id}`}
                              className="c"
                              style={{ padding: "10px" }}
                            >
                              {level === "use" ? (
                                <span className="st-yes" title="Can use">
                                  ✓
                                </span>
                              ) : level === "view" ? (
                                <span className="badge blue">View</span>
                              ) : screen.locked ? (
                                <span className="st-no" title={screen.note}>
                                  🔒
                                </span>
                              ) : (
                                <span className="st-no">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="t-cap" style={{ marginTop: 10 }}>
            ✓ use · View look only · — no access · 🔒 fixed by law. The clinic owner always has
            full access. {totalPeople} {totalPeople === 1 ? "person" : "people"} on the team.
          </p>
        </>
      ) : null}

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

      <AddMemberDialog open={adding} onClose={() => setAdding(false)} onAdded={refresh} />
      <EditMemberDialog
        open={Boolean(editing)}
        member={editing}
        roles={roles}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <PersonAccessDialog
        open={Boolean(accessFor)}
        member={accessFor}
        onClose={() => setAccessFor(null)}
        onSaved={refresh}
      />
      <NewProfileDialog
        open={profiling}
        roles={roles}
        onClose={() => setProfiling(false)}
        onSaved={refresh}
      />
      <MyAccountDialog open={account} onClose={() => setAccount(false)} />
    </AppShell>
  );
}
