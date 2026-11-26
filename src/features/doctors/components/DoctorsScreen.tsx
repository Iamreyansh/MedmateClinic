"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { MyAccountDialog } from "@/components/dialogs/MyAccountDialog";
import {
  fetchDoctors,
  fetchSchedules,
  type ClinicDoctor,
  type DoctorSchedule,
} from "@/features/doctors/api/doctors";
import { AddDoctorDialog } from "@/features/doctors/components/AddDoctorDialog";
import { EditDoctorDialog } from "@/features/doctors/components/EditDoctorDialog";
import { HoursAndLeaveDialog } from "@/features/doctors/components/HoursAndLeaveDialog";
import { money } from "@/lib/format";

/**
 * The clinic's doctors.
 *
 * <p>Who is in the clinic, what they are here for, and where they work. The
 * list is the service's own — a bare array — so it is read as one, and the
 * day's numbers come from the same card the service writes.
 */
export function DoctorsScreen() {
  const [doctors, setDoctors] = useState<ClinicDoctor[] | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ClinicDoctor | null>(null);
  const [hoursFor, setHoursFor] = useState<ClinicDoctor | null>(null);
  const [account, setAccount] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchDoctors(), fetchSchedules()])
      .then(([list, week]) => {
        setDoctors(list);
        setSchedules(week.items);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load the doctors");
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

  const visible = useMemo(() => {
    const wanted = search.trim().toLowerCase();
    if (!wanted) return doctors ?? [];
    return (doctors ?? []).filter((doctor) =>
      [doctor.name, doctor.speciality, doctor.room ?? ""].some((field) =>
        field.toLowerCase().includes(wanted),
      ),
    );
  }, [doctors, search]);

  const scheduleOf = (doctorId: string) =>
    schedules.find((schedule) => schedule.staffId === doctorId)?.sessions ?? [];

  const inToday = visible.reduce((sum, doctor) => sum + (doctor.bookedToday ?? 0), 0);
  const waiting = visible.reduce((sum, doctor) => sum + (doctor.waiting ?? 0), 0);

  return (
    <AppShell activeHref="/doctors" onAccount={() => setAccount(true)}>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">Doctors</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {doctors
              ? `${doctors.length} ${doctors.length === 1 ? "doctor" : "doctors"} · ${inToday} in today`
              : "Who is in the clinic, and where they work."}
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus" onClick={() => setAdding(true)}>
            Add a doctor
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

      {loading && !doctors ? <LoadingState title="Loading the doctors…" /> : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title={doctors && doctors.length === 0 ? "No doctors yet" : "No doctor matches"}
          copy={
            doctors && doctors.length === 0
              ? "Add the first doctor, and the queue and the console have somebody to work with."
              : "Try another name, speciality or room."
          }
          icon="users"
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="rp-search" style={{ marginBottom: 14 }}>
          <SearchInput
            value={search}
            placeholder="Search the doctors"
            aria-label="Search the doctors"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        {visible.map((doctor) => {
          const week = scheduleOf(doctor.id);
          const today = week.length > 0 ? week : [];
          return (
            <section className="card" key={doctor.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Avatar initials={doctor.name.slice(0, 2).toUpperCase()} tone="doctor" large />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 17 }}>{doctor.name}</b>
                    {doctor.registration ? <span className="badge doc">Verified</span> : null}
                  </div>
                  <p className="t-cap" style={{ marginTop: 2 }}>
                    {doctor.speciality}
                    {doctor.room ? ` · ${doctor.room}` : ""}
                  </p>
                </div>
                {doctor.nextFree ? (
                  <span className="badge mint">
                    <Icon name="check" size={12} /> Free now
                  </span>
                ) : null}
              </div>

              <div className="plan-meta" style={{ marginTop: 12 }}>
                <div>
                  <b>Today</b>
                  {today.length > 0
                    ? today.map((session) => `${session.start}–${session.end}`).join(" · ")
                    : Array.isArray(doctor.hours)
                      ? doctor.hours.join(" · ")
                      : (doctor.hours ?? "—")}
                </div>
                <div>
                  <b>Seen</b>
                  {doctor.bookedToday ?? 0}
                </div>
                <div>
                  <b>Waiting</b>
                  {doctor.waiting ?? 0}
                </div>
                <div>
                  <b>Free</b>
                  {doctor.freeToday ?? 0}
                </div>
              </div>

              <div className="plan-meta" style={{ marginTop: 12 }}>
                <div>
                  <b>Works at</b>
                  {doctor.room || "—"}
                </div>
                <div>
                  <b>Fees</b>
                  {doctor.fee !== undefined
                    ? `${money(doctor.fee)} clinic · ${money(doctor.videoFee ?? 0)} online`
                    : "—"}
                </div>
                <div>
                  <b>Registration</b>
                  {doctor.registration || "—"}
                </div>
              </div>

              {doctor.nextFree ? (
                <div className="live-row" style={{ marginTop: 14 }}>
                  <span>Next free: {doctor.nextFree}</span>
                  <Button size="sm" variant="secondary" icon="cal">
                    Book
                  </Button>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Button variant="secondary" icon="pen" onClick={() => setEditing(doctor)}>
                  Edit
                </Button>
                <Button variant="secondary" icon="cal" onClick={() => setHoursFor(doctor)}>
                  <Icon name="cal" size={14} />
                  Hours &amp; leave
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {waiting > 0 ? (
        <p className="t-cap" style={{ marginTop: 14 }}>
          {waiting} {waiting === 1 ? "patient is" : "patients are"} in consult right now.
        </p>
      ) : null}

      <AddDoctorDialog open={adding} onClose={() => setAdding(false)} onSaved={refresh} />
      <EditDoctorDialog
        open={Boolean(editing)}
        doctor={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <HoursAndLeaveDialog
        open={Boolean(hoursFor)}
        doctorId={hoursFor?.id ?? null}
        doctorName={hoursFor?.name ?? ""}
        onClose={() => setHoursFor(null)}
        onSaved={refresh}
      />
      <MyAccountDialog open={account} onClose={() => setAccount(false)} />
    </AppShell>
  );
}
