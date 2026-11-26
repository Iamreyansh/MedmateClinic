"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { loadQueue, loadDoctors, checkIn } from "@/features/queue/state/queueSlice";
import { CheckInPatientDialog } from "@/components/ui/CheckInPatientDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clinicDate } from "@/lib/format";

/** The tabs the console has. */
const FILTERS = [
  { value: "mine", label: "My patients" },
  { value: "all", label: "All doctors" },
  { value: "unassigned", label: "Unassigned" },
  { value: "seen", label: "Seen today" },
  { value: "waiting", label: "Waiting for you" },
  { value: "urgent", label: "Urgent or emergency" },
];

/**
 * The readings, as a line.
 *
 * The contract says the service sends a line. When it sends the readings
 * instead, they are written out here — never printed as "[object Object]".
 */
function vitalsLine(vitals: string | { tempF?: number; spo2?: number; pulse?: number }): string {
  if (typeof vitals === "string") return vitals;
  const parts: string[] = [];
  if (vitals.tempF !== undefined) parts.push(`Temp ${vitals.tempF} °F`);
  if (vitals.spo2 !== undefined) parts.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.pulse !== undefined) parts.push(`Pulse ${vitals.pulse}`);
  return parts.join(" · ");
}

export function QueueScreen() {
  // who is signed in — the console's own patients are theirs
  const userId = useAppSelector((state) => state.session.session?.user.id ?? "");
  const dispatch = useAppDispatch();
  const { status, queue, doctors, doctorsStatus, lastCheckedIn, error } = useAppSelector(
    (state) => state.queue,
  );
  const [filter, setFilter] = useState("mine");
  const [checkingIn, setCheckingIn] = useState(false);
  const [searchParams] = useSearchParams();

  /**
   * The doctor the console is opened on.
   *
   * The dashboard sends the doctor it wants in the path, and the clinic’s own
   * list of doctors is what says whether that doctor is one the clinic has: a
   * filter that names a doctor the clinic does not have shows the whole queue
   * rather than an empty screen.
   */
  const doctorParam = searchParams.get("doctor");
  const doctor = useMemo(
    () => doctors.find((person) => person.id === doctorParam) ?? null,
    [doctors, doctorParam],
  );
  const settled = doctorsStatus === "ready" || doctorsStatus === "error";
  const scope = settled ? (doctor ? doctorParam : null) : null;

  useEffect(() => {
    void dispatch(loadDoctors());
  }, [dispatch]);

  useEffect(() => {
    // the scope has to be checked against the clinic’s doctors first, so the
    // queue waits for that list when a doctor was asked for
    if (doctorParam && !settled) return;
    void dispatch(loadQueue(scope ?? undefined));
  }, [dispatch, doctorParam, scope, settled]);

  const next = queue?.next ?? null;
  const items = useMemo(() => queue?.items ?? [], [queue]);

  /**
   * The console's six tabs.
   *
   * A patient who is waiting for a doctor is waiting for this doctor, unless
   * the row says otherwise; a patient nobody has claimed is unassigned.
   */
  /**
   * The queue of the doctor the console is opened on.
   *
   * A doctor who exists and has nobody waiting has an empty queue — which is
   * not the same as a doctor the clinic does not have, and the screen tells
   * the two apart rather than falling back to the whole clinic.
   */
  const scoped = useMemo(
    () => (scope ? items.filter((item) => item.doctorId === scope) : items),
    [items, scope],
  );

  const visible = useMemo(() => {
    switch (filter) {
      case "all":
        return scoped;
      case "unassigned":
        return scoped.filter((item) => !item.doctorId);
      case "seen":
        // a consult that is finished today, or one happening now, is a patient
        // the doctor has seen. A no-show is neither seen nor waiting.
        return scoped.filter((item) => item.status === "done" || item.status === "in_consult");
      case "waiting":
        return scoped.filter((item) => !item.status || item.status === "waiting");
      case "urgent":
        return scoped.filter((item) => item.wait === "Urgent");
      default:
        return scope
          ? scoped
          : scoped.filter((item) => !item.doctorId || item.doctorId === userId);
    }
  }, [scoped, filter, userId, scope]);

  return (
    <AppShell activeHref="/queue">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            {doctor ? (
              <>
                {doctor.name}’s <em>console</em>
              </>
            ) : (
              <>
                Doctor <em>console</em>
              </>
            )}
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {doctor
              ? "Showing this doctor’s patients · waiting is clinic-wide"
              : "Showing all doctors"}{" "}
            {queue?.meta ??
              `${clinicDate(new Date().toISOString())} · emergencies and urgent patients first · refreshes every 10 seconds`}
          </p>
        </div>
        <div className="nq-btns">
          <Button variant="secondary" icon="plus" onClick={() => setCheckingIn(true)}>
            Check in a patient
          </Button>
          <Button icon="check">Call in next</Button>
        </div>
      </div>

      {lastCheckedIn ? (
        <div className="note mint" style={{ marginBottom: 14 }}>
          <Icon name="check" size={18} />
          <span>
            Checked in. The token is <b>{lastCheckedIn}</b>.
          </span>
        </div>
      ) : null}

      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((entry) => (
          <Chip key={entry.value} active={filter === entry.value} onClick={() => setFilter(entry.value)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {status === "error" ? <div className="note red">{error}</div> : null}

      {queue?.averageConsultMinutes !== undefined ? (
        <div className="ap-counts" style={{ marginBottom: 12 }}>
          <span className="here">
            <b>{queue.averageConsultMinutes}</b> min
          </span>
          <span>Your average consult</span>
        </div>
      ) : null}

      <div className="rx-grid">
        <div className="nq-list">
          {(scope ? scoped.length === 0 : items.length === 0) && status !== "error" ? (
            <div className="card" style={{ padding: 18 }}>
              <b style={{ fontSize: 15 }}>
                {doctor ? `No one is waiting for ${doctor.name}` : "No one is waiting here"}
              </b>
              <p className="t-cap" style={{ marginTop: 4 }}>
                The queue is empty. Patients appear here as they check in at the kiosk or reception.
              </p>
            </div>
          ) : (
            visible.map((item) => (
              <div key={item.token} className="nq">
                <span
                  className="tk"
                  style={item.kind === "A" ? { background: "var(--forest)", color: "var(--gold)" } : undefined}
                >
                  {item.token}
                </span>
                <div className="nq-main">
                  <div className="nq-top">
                    <b>
                      {item.patient.name} · {item.patient.age} {item.patient.sex}
                    </b>
                    {item.wait === "Urgent" ? (
                      <span className="badge red">Urgent</span>
                    ) : item.wait === "Next for you" ? (
                      <span className="badge mint">Next for you</span>
                    ) : (
                      <span className="nq-wait">{item.wait}</span>
                    )}
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 12.5 }}>{item.reason}</p>
                  {item.detail ? <div className="nq-vitals">{item.detail}</div> : null}
                </div>
                <div className="nq-acts">
                  {item.wait === "Next for you" ? (
                    <Button>Call in</Button>
                  ) : (
                    <Link to={`/visit/${item.token}`} className="btn sec">
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {next ? (
          <aside>
            <div className="now-card">
              <div className="now-l">
                <span className="now-tag">Next for you</span>
                <div className="now-name">
                  <b>
                    {next.patient.name} · {next.patient.age} {next.patient.sex}
                  </b>
                </div>
                <div>
                  <span className="now-tag">What the patient told us</span>
                  <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                    {next.reason}
                  </p>
                </div>
                {next.vitals ? (
                  <div>
                    <span className="now-tag">Vitals</span>
                    <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                      {vitalsLine(next.vitals)}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="now-acts">
                <Link to={`/visit/${next.token}`} className="btn">
                  <Icon name="stetho" size={16} />
                  Call in and start the prescription
                </Link>
                <Link to={`/visit/${next.token}`} className="btn ghost">
                  Finish without prescription
                </Link>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <CheckInPatientDialog
        open={checkingIn}
        onClose={() => setCheckingIn(false)}
        doctors={doctors}
        onCheckIn={(details) => {
          void dispatch(checkIn(details)).then(() => {
            void dispatch(loadQueue(scope ?? undefined));
          });
        }}
      />
    </AppShell>
  );
}
