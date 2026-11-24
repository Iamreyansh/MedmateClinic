import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { labResults, patient, readings, recordAccess, visits } from "@/services/api/mock/clinic";

export function PatientRecordView() {
  const person = patient("pt_kavya");

  return (
    <>
      <div className="pr-top">
        <div className="pr-id">
          <Avatar initials={person.initials} tone="nurse" large />
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person.name}</b>
            <div className="pr-facts">
              <span>{person.age} yrs</span>
              <span>{person.sex === "F" ? "Female" : "Male"}</span>
              <span>{person.phone}</span>
              <span>ABHA {person.abha}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span className="badge red">Allergy: {person.allergies[0]}</span>
              <span className="badge gold">{person.conditions[0]}</span>
              <span className="badge plain">{person.visits} visits since {person.since}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" icon="cert">
              Certificate
            </Button>
            <Button icon="cal">Book follow-up</Button>
          </div>
        </div>
      </div>

      <div className="rx-grid">
        <section className="card" style={{ padding: 18 }}>
          <b style={{ fontSize: 16 }}>Visits &amp; prescriptions</b>
          <ul className="pr-tl" style={{ marginTop: 10 }}>
            {visits.map((visit) => (
              <li key={visit.date}>
                <div className="pr-tl-d">
                  <b>{visit.date}</b>
                  <span>· {visit.doctor}</span>
                </div>
                <div>
                  <div className="pr-tl-h">
                    <b style={{ fontSize: 14 }}>{visit.diagnosis}</b>
                    <span className="badge">{visit.signed}</span>
                  </div>
                  {visit.medicines ? <div className="pr-meds t-cap">{visit.medicines}</div> : null}
                  {visit.extra ? <div className="pr-meds t-cap">{visit.extra}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside>
          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Readings over time</b>
            <div className="kv" style={{ marginTop: 8 }}>
              {readings.map((reading) => (
                <div key={reading.label} style={{ display: "contents" }}>
                  <span className="t-cap">{reading.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                    {reading.value}
                    <span className={`badge ${reading.tone === "mint" ? "" : reading.tone}`}>{reading.state}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Lab results</b>
            <div style={{ marginTop: 6 }}>
              {labResults.map((result) => (
                <div className="pr-lab" key={result.name}>
                  <div className="pr-lab-h">
                    <b>{result.name}</b>
                    <span className="t-cap">· {result.when}</span>
                    <span className={`badge ${result.tone === "gold" ? "gold" : "plain"}`}>{result.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <b style={{ fontSize: 16 }}>Who opened this record</b>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {recordAccess.map((entry) => (
                <div key={entry.who} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <Icon name="users" size={15} />
                  <span style={{ flex: 1 }}>
                    {entry.who}
                    {entry.what ? <span className="t-cap"> · {entry.what}</span> : null}
                  </span>
                  <span className="t-cap">{entry.when}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
