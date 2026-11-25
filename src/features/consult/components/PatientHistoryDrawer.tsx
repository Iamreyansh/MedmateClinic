import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { apiGet } from "@/services/api";
import type { PatientRecord } from "@/types/patient";

export type PatientHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** The patient whose history is open. */
  patientId: string | null;
  /** The patient's name, shown while the record loads. */
  patientName?: string;
};

/**
 * The patient's whole history, in a drawer.
 *
 * The doctor opens it beside the consult to see what has happened before,
 * without leaving the prescription they are writing. It reads the same record
 * the patient screen does, so the two can never disagree.
 */
export function PatientHistoryDrawer({ open, onClose, patientId, patientName }: PatientHistoryDrawerProps) {
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patientId) return;

    let alive = true;
    apiGet<PatientRecord>(`/clinic/patients/${patientId}`)
      .then((value) => {
        if (alive) setRecord(value);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the history");
      });

    return () => {
      alive = false;
    };
  }, [open, patientId]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Patient history"
      description={patientName ?? record?.patient.name}
      closeLabel="Close the history"
    >
      {error ? <div className="note red">{error}</div> : null}

      {!record && !error ? <p className="t-cap">Loading the history…</p> : null}

      {record ? (
        <>
          <div className="kv" style={{ marginBottom: 16 }}>
            <span className="t-cap">Allergies</span>
            <span>
              {record.patient.allergies.length ? (
                <b style={{ color: "var(--red)" }}>{record.patient.allergies.join(", ")}</b>
              ) : (
                "None on record"
              )}
            </span>
            <span className="t-cap">Conditions</span>
            <span>{record.patient.conditions.length ? record.patient.conditions.join(", ") : "None on record"}</span>
            <span className="t-cap">Visits</span>
            <span>{record.patient.visits} in {record.patient.since}</span>
          </div>

          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Visits &amp; prescriptions
          </div>
          <ul className="pr-tl">
            {record.visits.map((visit) => (
              <li key={visit.id}>
                <div className="pr-tl-d">
                  <span>{visit.date}</span>
                  <b>{visit.doctor}</b>
                </div>
                <div>
                  <div className="pr-tl-h">
                    <b>{visit.diagnosis}</b>
                    {visit.code ? <span className="badge">{visit.code}</span> : null}
                  </div>
                  {visit.medicines ? <p className="pr-tl-p">{visit.medicines}</p> : null}
                  {visit.extra ? <p className="pr-tl-p">{visit.extra}</p> : null}
                  <div className="pr-tl-a">
                    <span className="t-cap">Signed</span>
                    <span className="badge">{visit.signed}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {record.labResults.length ? (
            <>
              <div className="t-eyebrow" style={{ margin: "18px 0 8px" }}>
                Lab results
              </div>
              <div className="med-list">
                {record.labResults.map((result) => (
                  <div className="med-row-c" key={result.name}>
                    <span className="med-sum">
                      <b>{result.name}</b>
                      <span className="gen">{result.when}</span>
                    </span>
                    <span className={cn("badge", result.tone === "gold" ? "gold" : "plain")}>{result.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {record.recordAccess.length ? (
            <>
              <div className="t-eyebrow" style={{ margin: "18px 0 8px" }}>
                Who opened this record
              </div>
              <ul className="rp-notes">
                {record.recordAccess.map((entry) => (
                  <li className="info" key={`${entry.who}-${entry.when}`}>
                    <Icon name="users" size={18} />
                    <span>
                      <b>{entry.who}</b> — {entry.what} · {entry.when}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Drawer>
  );
}
