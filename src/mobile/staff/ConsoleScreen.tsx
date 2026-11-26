"use client";

import { useCallback, useState } from "react";
import { fetchQueue } from "@/features/queue/api/queue";
import type { QueueItem } from "@/features/queue/types";
import { fetchVisit, saveConsultation, signPrescription } from "@/features/consult/api/consult";
import type { DiagnosisLine, MedicineLine } from "@/types/visit";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { StaffShell } from "@/mobile/appShell";
import { useAction, useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileRow,
  MobileTitle,
} from "@/mobile/components";

/**
 * The doctor's console on a phone.
 *
 * The queue the doctor works from, and — when they call a patient in — the
 * consultation for that patient: what the patient said, the nurse's
 * readings, and the prescription being written.
 */
export function MobileConsoleScreen() {
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => fetchQueue(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  return (
    <StaffShell activeHref="/m/console">
      <MobileTitle
        title="Doctor console"
        line={data?.meta ?? "Who is waiting for you"}
        emphasis={data?.room || undefined}
      />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {open ? (
        <ConsultPanel visitId={open} onBack={() => setOpen(null)} />
      ) : (
        <>
          {data && data.items.length === 0 ? (
            <MobileEmpty
              title="No one is waiting here"
              copy="Patients appear as they check in at the kiosk or the desk."
            />
          ) : null}

          {data && data.next ? (
            <div className="now-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="now-l">
                <span className="now-tag">Next for you</span>
                <div className="now-name">
                  <b>
                    {data.next.patient.name} · {data.next.patient.age} {data.next.patient.sex}
                  </b>
                </div>
                {data.next.reason ? (
                  <div>
                    <span className="now-tag">What the patient told us</span>
                    <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                      {data.next.reason}
                    </p>
                  </div>
                ) : null}
                {data.next.vitals ? (
                  <div>
                    <span className="now-tag">Vitals</span>
                    <p style={{ color: "var(--mint-200)", fontSize: 13.5, marginTop: 4 }}>
                      {vitalsLine(data.next.vitals)}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="now-acts">
                <Button icon="stetho" onClick={() => setOpen(data.next?.token ?? null)}>
                  Call in and start the prescription
                </Button>
              </div>
            </div>
          ) : null}

          {data && data.items.length > 0 ? (
            <MobileCard title="The queue">
              <div className="mob-section">
                {data.items.map((item) => (
                  <QueueRow key={item.token} item={item} onCall={() => setOpen(item.token)} />
                ))}
              </div>
            </MobileCard>
          ) : null}
        </>
      )}
    </StaffShell>
  );
}

/** The readings, as one line. */
function vitalsLine(vitals: string | { tempF?: number; spo2?: number; pulse?: number }): string {
  if (typeof vitals === "string") return vitals;
  const parts: string[] = [];
  if (vitals.tempF !== undefined) parts.push(`Temp ${vitals.tempF} °F`);
  if (vitals.spo2 !== undefined) parts.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.pulse !== undefined) parts.push(`Pulse ${vitals.pulse}`);
  return parts.join(" · ");
}

/** One patient in the queue. */
function QueueRow({ item, onCall }: { item: QueueItem; onCall: () => void }) {
  const urgent = item.wait === "Urgent";
  return (
    <div className="mob-row" style={{ alignItems: "flex-start" }}>
      <span
        className="tk"
        style={urgent ? { background: "var(--red-bg)", color: "var(--red)" } : undefined}
      >
        {item.token}
      </span>
      <span className="txt" style={{ whiteSpace: "normal" }}>
        <b style={{ whiteSpace: "normal" }}>
          {item.patient.name} · {item.patient.age} {item.patient.sex}
        </b>
        <small style={{ whiteSpace: "normal" }}>{item.reason ?? "No complaint recorded"}</small>
        {item.detail ? <small style={{ whiteSpace: "normal" }}>{item.detail}</small> : null}
        {item.booked ? <small style={{ whiteSpace: "normal" }}>Booked · {item.booked}</small> : null}
      </span>
      <span className="end">
        {urgent ? (
          <span className="badge red">Urgent</span>
        ) : item.wait === "Next for you" ? (
          <span className="badge mint">Next</span>
        ) : (
          <span className="badge plain">{item.wait}</span>
        )}
        <button type="button" className="btn sm sec" onClick={onCall}>
          Open
        </button>
      </span>
    </div>
  );
}

/**
 * The consultation for the patient in the room.
 *
 * The doctor writes what the patient said, the diagnoses and the medicines,
 * saves the draft, and signs the prescription — the same three calls the
 * desktop console makes.
 */
function ConsultPanel({ visitId, onBack }: { visitId: string; onBack: () => void }) {
  const load = useCallback(() => fetchVisit(visitId), [visitId]);
  const { status, data, error, reload, unreachable } = useRemote(load, visitId);
  const action = useAction();

  const [complaints, setComplaints] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [when, setWhen] = useState("");
  const [forDays, setForDays] = useState("");

  const diagnoses: DiagnosisLine[] = data?.diagnoses ?? [];
  const medicines: MedicineLine[] = data?.medicines ?? [];

  const save = async () => {
    const nextDiagnoses = diagnosis.trim()
      ? [
          ...diagnoses,
          { code: diagnosisCode.trim() || null, label: diagnosis.trim(), kind: "diagnosis" },
        ]
      : diagnoses;
    const nextMedicines = medicine.trim()
      ? [
          ...medicines,
          { name: medicine.trim(), dose: dose.trim() || null, when: when.trim() || null, forDays: forDays.trim() || null },
        ]
      : medicines;

    const saved = await action.run(() =>
      saveConsultation(visitId, {
        complaints: complaints ?? data?.consultation?.complaints ?? undefined,
        history: history ?? data?.consultation?.history ?? undefined,
        diagnoses: nextDiagnoses,
        medicines: nextMedicines,
      }),
    );
    if (saved) {
      setDiagnosis("");
      setDiagnosisCode("");
      setMedicine("");
      setDose("");
      setWhen("");
      setForDays("");
      reload();
    }
  };

  const prescription = data?.prescriptions?.[0];

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={onBack}>
        <Icon name="back" size={16} />
        Back to the queue
      </button>

      {status === "loading" && !data ? <MobileLoading title="Opening the visit…" /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {data ? (
        <>
          <MobileCard>
            <div className="mob-card-h">
              <b>
                {data.patient.name} · {data.patient.age} {data.patient.sex}
              </b>
              <span className="tk">{data.visit.token}</span>
            </div>
            {data.visit.reason ? (
              <p className="t-cap" style={{ marginTop: 6 }}>
                {data.visit.reason}
              </p>
            ) : null}
            {data.patient.allergies.length > 0 ? (
              <div className="note red" style={{ marginTop: 10 }}>
                <Icon name="alert" size={18} />
                <div>
                  <b>Allergies</b>
                  <p style={{ marginTop: 2 }}>{data.patient.allergies.join(", ")}</p>
                </div>
              </div>
            ) : null}
            {data.patient.conditions.length > 0 ? (
              <p className="t-cap" style={{ marginTop: 8 }}>
                Known: {data.patient.conditions.join(", ")}
              </p>
            ) : null}
          </MobileCard>

          <MobileCard title="Vitals">
            {data.vitals ? (
              <div className="mob-kv">
                <span>Reading</span>
                <b>
                  {data.vitals.tempF !== null ? `Temp ${data.vitals.tempF} °F` : "Temp —"}
                  {data.vitals.bp ? ` · ${data.vitals.bp}` : ""}
                  {data.vitals.spo2 !== null ? ` · SpO₂ ${data.vitals.spo2}%` : ""}
                </b>
              </div>
            ) : (
              <p className="t-cap">The nurse has not recorded a reading for this visit yet.</p>
            )}
          </MobileCard>

          <MobileCard title="What the patient said">
            <div className="field">
              <label htmlFor="mc-complaints">Complaints</label>
              <TextArea
                id="mc-complaints"
                rows={3}
                value={complaints ?? data.consultation?.complaints ?? ""}
                placeholder="In the patient's own words"
                onChange={(event) => setComplaints(event.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="mc-history">History</label>
              <TextArea
                id="mc-history"
                rows={3}
                value={history ?? data.consultation?.history ?? ""}
                placeholder="What has been going on"
                onChange={(event) => setHistory(event.target.value)}
              />
            </div>
          </MobileCard>

          <MobileCard title="Diagnoses">
            {diagnoses.length === 0 ? (
              <p className="t-cap">Nothing written yet.</p>
            ) : (
              <div className="mob-section">
                {diagnoses.map((line, index) => (
                  <MobileRow
                    key={`${line.label}-${index}`}
                    icon="cert"
                    title={line.label}
                    body={line.code ?? undefined}
                  />
                ))}
              </div>
            )}
            <div className="mob-2" style={{ marginTop: 12 }}>
              <Input
                value={diagnosis}
                placeholder="Diagnosis"
                aria-label="Diagnosis"
                onChange={(event) => setDiagnosis(event.target.value)}
              />
              <Input
                value={diagnosisCode}
                placeholder="ICD-10"
                aria-label="ICD-10 code"
                onChange={(event) => setDiagnosisCode(event.target.value)}
              />
            </div>
          </MobileCard>

          <MobileCard title="Medicines">
            {medicines.length === 0 ? (
              <p className="t-cap">Nothing prescribed yet.</p>
            ) : (
              <div className="mob-section">
                {medicines.map((line, index) => (
                  <MobileRow
                    key={`${line.name}-${index}`}
                    icon="pill"
                    title={line.name}
                    body={[line.dose, line.when, line.forDays && `for ${line.forDays}`]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))}
              </div>
            )}
            <div className="mob-2" style={{ marginTop: 12 }}>
              <Input
                value={medicine}
                placeholder="Medicine"
                aria-label="Medicine"
                onChange={(event) => setMedicine(event.target.value)}
              />
              <Input
                value={dose}
                placeholder="Dose"
                aria-label="Dose"
                onChange={(event) => setDose(event.target.value)}
              />
            </div>
            <div className="mob-2" style={{ marginTop: 10 }}>
              <Input
                value={when}
                placeholder="When"
                aria-label="When to take it"
                onChange={(event) => setWhen(event.target.value)}
              />
              <Input
                value={forDays}
                placeholder="For how many days"
                aria-label="For how many days"
                onChange={(event) => setForDays(event.target.value)}
              />
            </div>
          </MobileCard>

          {action.error ? (
            <div className="note red" role="alert">
              <Icon name="alert" size={18} />
              <div>{action.error}</div>
            </div>
          ) : null}

          <div className="mob-foot">
            <Button icon="check" disabled={action.busy} onClick={() => void save()}>
              {action.busy ? "Saving…" : "Save the draft"}
            </Button>
            {prescription ? (
              <Button
                variant="forest"
                icon="cert"
                disabled={action.busy || prescription.status === "signed"}
                onClick={() =>
                  void action.run(async () => {
                    await signPrescription(prescription.id);
                    reload();
                  })
                }
              >
                {prescription.status === "signed" ? "Signed" : "Sign and issue"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
