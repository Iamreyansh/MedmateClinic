import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { inbox, type InboxItem } from "@/lib/fixtures/clinic";

const KIND_TONE: Record<InboxItem["kind"], string> = {
  Result: "badge red",
  Referral: "badge blue",
  Handover: "badge gold",
};

export function InboxScreen() {
  const selected = inbox[0];

  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            In<em>box</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Referrals from colleagues, lab results to review and handovers. {inbox.length} to act on.
          </p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <span className="chip on">
          All · {inbox.length}
        </span>
        <span className="chip">
          Results · {inbox.filter((item) => item.kind === "Result").length}
        </span>
        <span className="chip">
          Referrals · {inbox.filter((item) => item.kind === "Referral").length}
        </span>
        <span className="chip">
          Handovers · {inbox.filter((item) => item.kind === "Handover").length}
        </span>
      </div>

      <div className="rx-grid">
        <div className="ibx-list">
          {inbox.map((item) => (
            <div className={`card ibx${item.id === selected.id ? " current" : ""}`} key={item.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Avatar initials={item.patient.initials} tone="nurse" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ibx-kind">
                    <span className={KIND_TONE[item.kind]}>{item.kind}</span>
                  </div>
                  <b style={{ fontSize: 15 }}>
                    {item.patient.name} · {item.patient.age} {item.patient.sex}
                  </b>
                  <p className="ibx-text">{item.title}</p>
                </div>
                <div className="ibx-badges">
                  <span className="t-cap">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <b style={{ fontSize: 17 }}>
              {selected.patient.name} · CRP result
            </b>
            <span className="badge red solid">Critical</span>
          </div>
          <p className="t-cap" style={{ marginTop: 4 }}>
            {selected.patient.age} {selected.patient.sex} · ordered by you on 15 Nov · reported by Ravi
            Kumar at {selected.time}
          </p>

          <div className="note red" style={{ marginTop: 14, alignItems: "center", gap: 14 }}>
            <span className="measure">48 mg/L</span>
            <span>C-reactive protein · reference under 6 mg/L. Was 12 mg/L on 15 Nov.</span>
          </div>

          <p style={{ color: "var(--ink-2)", marginTop: 12, fontSize: 13.5 }}>
            Last visit: cough 5 days, fever 101°F, crackles at the right base. Prescribed amoxicillin
            40 mg/kg/day.
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Button variant="secondary" icon="send">
              Call the parent
            </Button>
            <Button variant="secondary" icon="cal">
              Book a visit today
            </Button>
            <div style={{ flex: 1 }} />
            <Button icon="check">Mark reviewed</Button>
          </div>
        </aside>
      </div>
    </>
  );
}
