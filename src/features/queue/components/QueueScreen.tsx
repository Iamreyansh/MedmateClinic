"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { loadQueue } from "@/features/queue/state/queueSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const FILTERS = [
  { label: "Waiting for you", count: 3, active: true },
  { label: "In-clinic", count: undefined },
  { label: "Online", count: 1 },
  { label: "Finished", count: 9 },
  { label: "No-shows", count: 1 },
];

export function QueueScreen() {
  const dispatch = useAppDispatch();
  const { status, queue, error } = useAppSelector((state) => state.queue);

  useEffect(() => {
    void dispatch(loadQueue());
  }, [dispatch]);

  const next = queue?.next ?? null;

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
          <Button variant="secondary" icon="plus">
            Check in a patient
          </Button>
          <Button icon="check">Call in next</Button>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((filter) => (
          <span key={filter.label} className={`chip${filter.active ? " on" : ""}`}>
            {filter.label}
            {filter.count ? <span className="seg-n">{filter.count}</span> : null}
          </span>
        ))}
      </div>

      {status === "error" ? <div className="note red">{error}</div> : null}

      <div className="rx-grid">
      <div className="nq-list">
        {(queue?.items ?? []).map((item) => (
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
                <Button variant="secondary">Open</Button>
              )}
            </div>
          </div>
        ))}
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
                <span className="now-tag">Symptoms (from the patient)</span>
                <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                  Cough for 5 days, worse at night, fever since yesterday, eating less
                </p>
              </div>
              <div>
                <span className="now-tag">Vitals</span>
                <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                  Temp 100.4 °F · Pulse 112 · SpO₂ 95% · Weight 24 kg
                </p>
              </div>
              <div>
                <span className="now-tag">Last visit</span>
                <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                  15 Nov · CRP 48 mg/L — in your inbox
                </p>
              </div>
            </div>
            <div className="now-acts">
              <Button icon="stetho">Call in and start the prescription</Button>
              <a href="/visit/vs_kavya" className="btn ghost">
                Finish without prescription
              </a>
            </div>
          </div>
        </aside>
      ) : null}
      </div>
    </AppShell>
  );
}
