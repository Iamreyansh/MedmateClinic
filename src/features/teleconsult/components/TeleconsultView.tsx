import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { apiGet } from "@/services/api";

/** One patient waiting on a video consult. */
export type WaitingPatient = {
  patient: { id: string; name: string; age: number; sex: string; initials?: string };
  booked: string;
  reason: string;
  state: "Joined" | "Link sent";
};

/** One thing recorded for consent. */
export type ConsentItem = { label: string; detail: string };

type TeleconsultPayload = {
  waiting: WaitingPatient[];
  consent: ConsentItem[];
  meta: string;
};

export function TeleconsultView() {
  const [payload, setPayload] = useState<TeleconsultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet<TeleconsultPayload>("/clinic/teleconsult")
      .then((data) => {
        if (alive) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the waiting room");
      });
    return () => {
      alive = false;
    };
  }, []);

  const waiting = payload?.waiting ?? [];
  const consent = payload?.consent ?? [];
  const onCall = waiting.find((entry) => entry.state === "Joined") ?? null;

  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Tele<em>consultation</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.meta ??
              "Video or phone consults. Identity and consent are recorded as the Telemedicine Practice Guidelines 2020 require."}
          </p>
        </div>
        <Button variant="secondary" icon="send">
          Copy booking link
        </Button>
      </div>

      {error ? <div className="note red">{error}</div> : null}

      <div className="rx-grid stretch">
        <div className="call-panel">
          {onCall ? (
            <>
              <Avatar initials={onCall.patient.initials ?? "—"} tone="doctor" large />
              <b style={{ fontSize: 18 }}>
                {onCall.patient.name} · {onCall.patient.age} {onCall.patient.sex}
              </b>
              <span className="tc-sub">Connected · 06:42 · good connection</span>
            </>
          ) : (
            <>
              <Avatar initials="—" tone="doctor" large />
              <b style={{ fontSize: 18 }}>Nobody is on a call</b>
              <span className="tc-sub">The waiting room is empty right now.</span>
            </>
          )}
          <div className="you">You</div>
          <div className="call-acts">
            <Button variant="secondary">Mute</Button>
            <Button variant="secondary" icon="video">
              Camera off
            </Button>
            <Button variant="secondary">Switch to phone</Button>
            <Button variant="danger">End call</Button>
          </div>
        </div>

        <aside>
          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Identity &amp; consent</b>
            <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
              {consent.length === 0 ? (
                <p className="t-cap">Nothing recorded for this consult yet.</p>
              ) : (
                consent.map((item) => (
                  <div
                    key={item.label}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                  >
                    <Icon name="check" size={17} style={{ color: "var(--green)" }} />
                    <div>
                      <b style={{ fontSize: 14 }}>{item.label}</b>
                      <p className="t-cap">{item.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Waiting online</b>
            <div className="tc-list" style={{ marginTop: 6 }}>
              {waiting.length === 0 ? (
                <p className="t-cap" style={{ padding: "8px 0" }}>
                  Nobody is waiting.
                </p>
              ) : (
                waiting.map((entry) => (
                  <div className="tc-row" key={entry.patient.id}>
                    <div className="tc-who">
                      <Avatar initials={entry.patient.initials ?? "—"} tone="nurse" />
                      <div>
                        <b style={{ fontSize: 14 }}>
                          {entry.patient.name} · {entry.patient.age} {entry.patient.sex}
                        </b>
                        <p className="t-cap">
                          {entry.booked} · {entry.reason}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${entry.state === "Joined" ? "" : "plain"}`}>{entry.state}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {onCall ? (
            <Button style={{ width: "100%" }} icon="rx">
              Open prescription for {onCall.patient.name.split(" ")[0]}
            </Button>
          ) : null}
        </aside>
      </div>
    </>
  );
}
