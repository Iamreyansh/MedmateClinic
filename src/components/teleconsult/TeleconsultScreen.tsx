import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { consent, waitingOnline } from "@/lib/fixtures/clinic";

export function TeleconsultScreen() {
  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            Tele<em>consultation</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Video or phone consults. Identity and consent are recorded as the Telemedicine Practice
            Guidelines 2020 require.
          </p>
        </div>
        <Button variant="secondary" icon="send">
          Copy booking link
        </Button>
      </div>

      <div className="rx-grid stretch">
        <div className="call-panel">
          <Avatar initials="DK" tone="doctor" large />
          <b style={{ fontSize: 18 }}>Diya Kamath · 5 F (with mother)</b>
          <span className="tc-sub">Connected · 06:42 · good connection</span>
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
              {consent.map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Icon name="check" size={17} style={{ color: "var(--green)" }} />
                  <div>
                    <b style={{ fontSize: 14 }}>{item.label}</b>
                    <p className="t-cap">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Waiting online</b>
            <div className="tc-list" style={{ marginTop: 6 }}>
              {waitingOnline.map((entry) => (
                <div className="tc-row" key={entry.patient.id}>
                  <div className="tc-who">
                    <Avatar initials={entry.patient.initials} tone="nurse" />
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
              ))}
            </div>
          </section>

          <Button style={{ width: "100%" }} icon="rx">
            Open prescription for Diya
          </Button>
        </aside>
      </div>
    </>
  );
}
