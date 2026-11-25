"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { loadQueue, loadDoctors, checkIn } from "@/features/queue/state/queueSlice";
import { CheckInPatientDialog } from "@/components/ui/CheckInPatientDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const FILTERS = [
  { label: "Waiting for you" },
  { label: "In-clinic" },
  { label: "Online" },
  { label: "Finished" },
  { label: "No-shows" },
];

export function QueueScreen() {
  const dispatch = useAppDispatch();
  const { status, queue, doctors, lastCheckedIn, error } = useAppSelector((state) => state.queue);
  const [filter, setFilter] = useState(FILTERS[0].label);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    void dispatch(loadQueue());
    void dispatch(loadDoctors());
  }, [dispatch]);

  const next = queue?.next ?? null;
  const items = queue?.items ?? [];

  return (
    <AppShell activeHref="/queue">
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Your <em>queue</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{queue?.meta ?? "Loading the queue…"}</p>
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
          <Chip key={entry.label} active={filter === entry.label} onClick={() => setFilter(entry.label)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {status === "error" ? <div className="note red">{error}</div> : null}

      <div className="rx-grid">
        <div className="nq-list">
          {items.length === 0 && status !== "error" ? (
            <div className="card" style={{ padding: 18 }}>
              <b style={{ fontSize: 15 }}>No one is waiting here</b>
              <p className="t-cap" style={{ marginTop: 4 }}>
                The queue is empty. Patients appear here as they check in at the kiosk or reception.
              </p>
            </div>
          ) : (
            items.map((item) => (
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
                      {next.vitals}
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
            void dispatch(loadQueue());
          });
        }}
      />
    </AppShell>
  );
}
