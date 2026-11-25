"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { fetchDoctors, type ClinicDoctor } from "@/features/doctors/api/doctors";
import { money } from "@/lib/format";

/**
 * The clinic's doctors.
 *
 * Who is in the clinic, what they are here for, and where they work. The
 * list is the service's own — a bare array — so it is read as one.
 */
export function DoctorsScreen() {
  const [doctors, setDoctors] = useState<ClinicDoctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDoctors()
      .then((list) => {
        if (!alive) return;
        setDoctors(list);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the doctors");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const visible = useMemo(() => {
    const wanted = search.trim().toLowerCase();
    if (!wanted) return doctors ?? [];
    return (doctors ?? []).filter((doctor) =>
      [doctor.name, doctor.speciality, doctor.room ?? ""].some((field) =>
        field.toLowerCase().includes(wanted),
      ),
    );
  }, [doctors, search]);

  return (
    <AppShell activeHref="/doctors">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">Doctors</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {doctors
              ? `${doctors.length} ${doctors.length === 1 ? "doctor" : "doctors"}`
              : "Who is in the clinic, and where they work."}
          </p>
        </div>
        <div className="nq-btns">
          <Button icon="plus">Add a doctor</Button>
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
          title={doctors && doctors.length === 0 ? "No doctors yet" : "Nobody matches that"}
          copy={
            doctors && doctors.length === 0
              ? "Add the first doctor, and the queue and the console have somebody to work with."
              : "Try another name, speciality or room."
          }
          icon="stetho"
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="rp-search" style={{ marginBottom: 14 }}>
          <SearchInput
            value={search}
            placeholder="Search a doctor, speciality or room"
            aria-label="Search the doctors"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        {visible.map((doctor) => (
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
            </div>

            {/* the day's numbers, as the reference's card has them */}
            <div className="plan-meta" style={{ marginTop: 12 }}>
              <div>
                <b>Today</b>
                {doctor.hours?.join(" · ") || "—"}
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
                {doctor.room ?? "—"}
              </div>
              <div>
                <b>Fees</b>
                {doctor.fee !== undefined ? `${money(doctor.fee)} clinic · ${money(doctor.videoFee ?? 0)} online` : "—"}
              </div>
              <div>
                <b>Registration</b>
                {doctor.registration ?? "—"}
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
              <Button variant="secondary" icon="pen">
                Edit
              </Button>
              <Button variant="secondary" icon="cal">
                <Icon name="cal" size={14} />
                Hours &amp; leave
              </Button>
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
