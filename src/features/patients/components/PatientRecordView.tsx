import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { apiGet } from "@/services/api";
import type { PatientRecord } from "@/types/patient";

export type { HistoryVisit, LabResult, PatientRecord, Reading, RecordAccess } from "@/types/patient";

export function PatientRecordView({ patientId }: { patientId?: string }) {
  const { id } = useParams();
  const target = patientId ?? id ?? "pt_kavya";
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet<PatientRecord>(`/clinic/patients/${target}`)
      .then((data) => {
        if (alive) setRecord(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the patient record");
      });
    return () => {
      alive = false;
    };
  }, [target]);

  if (error) {
    return <div className="note red">{error}</div>;
  }

  if (!record) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <b style={{ fontSize: 15 }}>Loading the record…</b>
      </div>
    );
  }

  const person = record.patient;

  return (
    <>
      <div className="pr-top">
        <div className="pr-id">
          <Avatar initials={person.initials ?? "—"} tone="nurse" large />
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person.name}</b>
            <div className="pr-facts">
              <span>{person.age} yrs</span>
              <span>{person.sex === "F" ? "Female" : "Male"}</span>
              <span>{person.phone}</span>
              <span>ABHA {person.abha}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {person.allergies[0] ? (
                <span className="badge red">Allergy: {person.allergies[0]}</span>
              ) : null}
              {person.conditions[0] ? (
                <span className="badge gold">{person.conditions[0]}</span>
              ) : null}
              <span className="badge plain">
                {person.visits} visits since {person.since}
              </span>
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
            {record.visits.length === 0 ? (
              <li>
                <div className="pr-meds t-cap">No visit yet.</div>
              </li>
            ) : (
              record.visits.map((visit) => (
                <li key={visit.id}>
                  <div className="pr-tl-d">
                    <b>{visit.date}</b>
                    <span>· {visit.doctor}</span>
                  </div>
                  <div>
                    <div className="pr-tl-h">
                      <b style={{ fontSize: 14 }}>{visit.diagnosis}</b>
                      <span className="badge">{visit.signed}</span>
                    </div>
                    {visit.medicines ? (
                      <div className="pr-meds t-cap">{visit.medicines}</div>
                    ) : null}
                    {visit.extra ? <div className="pr-meds t-cap">{visit.extra}</div> : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <aside>
          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Readings over time</b>
            <div className="kv" style={{ marginTop: 8 }}>
              {record.readings.map((reading) => (
                <div key={reading.label} style={{ display: "contents" }}>
                  <span className="t-cap">{reading.label}</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "space-between",
                    }}
                  >
                    {reading.value}
                    <span className={`badge ${reading.tone === "mint" ? "" : reading.tone}`}>
                      {reading.state}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Lab results</b>
            <div style={{ marginTop: 6 }}>
              {record.labResults.map((result) => (
                <div className="pr-lab" key={result.name}>
                  <div className="pr-lab-h">
                    <b>{result.name}</b>
                    <span className="t-cap">· {result.when}</span>
                    <span className={`badge ${result.tone === "gold" ? "gold" : "plain"}`}>
                      {result.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <b style={{ fontSize: 16 }}>Who opened this record</b>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {record.recordAccess.map((entry) => (
                <div
                  key={`${entry.who}-${entry.when}`}
                  style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                >
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
