"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loadVisit, saveConsult, signConsult } from "@/features/consult/state/consultSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function Step({
  title,
  hint,
  step,
  children,
}: {
  title: string;
  hint?: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: 18, marginBottom: 14 }}>
      <div className="sec-t" style={{ margin: "0 0 14px" }}>
        {step ? (
          <span className="step-n">{step}</span>
        ) : (
          <span className="step-done">
            <Icon name="check" size={15} />
          </span>
        )}
        <div>
          <b style={{ fontSize: 16 }}>{title}</b>
          {hint ? (
            <div className="t-cap" style={{ marginTop: 2 }}>
              {hint}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** The follow-up the doctor can ask for, and how long each one is. */
const FOLLOW_UP_OPTIONS = ["3 days", "5 days", "1 week", "2 weeks", "1 month", "3 months"];

/** The chips a doctor can add for another diagnosis. */
const ALSO_CONSIDER = ["Acute tonsillitis", "Viral URTI", "Infectious mononucleosis"];

export function ConsultView() {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const {
    patient: person,
    visit,
    vitals: reading,
    diagnoses,
    medicines,
    tests,
    prescriptionId,
    signed,
    status,
    error,
  } = useAppSelector((state) => state.consult);

  // what the doctor is writing, before it is saved
  const [complaints, setComplaints] = useState("");
  const [history, setHistory] = useState("");
  const [diet, setDiet] = useState("");
  const [returnIf, setReturnIf] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  useEffect(() => {
    if (id) void dispatch(loadVisit(id));
  }, [dispatch, id]);

  // the draft the doctor left comes in with the visit; until then the fields
  // hold what the doctor has typed
  const draft = useMemo(
    () => ({
      complaints: complaints || "",
      history: history || "",
      diet: diet || "",
      returnIf: returnIf || "",
    }),
    [complaints, history, diet, returnIf],
  );

  const save = async (): Promise<string | null> => {
    if (!id) return null;
    const result = await dispatch(
      saveConsult({
        visitId: id,
        payload: {
          complaints: draft.complaints,
          history: draft.history,
          advice: { diet: draft.diet, returnIf: draft.returnIf },
          followUp: followUp
            ? { mode: followUp, at: followUpDate(followUp), note: followUpNote }
            : undefined,
          diagnoses,
          medicines,
          tests: tests.map((test) => ({ name: test.name })),
        },
      }),
    );
    // the id comes back from the save, so the first sign works too
    return saveConsult.fulfilled.match(result) ? result.payload.prescriptionId : null;
  };

  const sign = async () => {
    const saved = await save();
    const toSign = saved ?? prescriptionId;
    if (!toSign) return;
    await dispatch(signConsult({ prescriptionId: toSign }));
  };

  if (signed) {
    return <Signed person={person} />;
  }

  const errors = error ? <div className="note red">{error}</div> : null;
  const busy = status === "loading";
  const allergy = person?.allergies?.[0];
  const condition = person?.conditions?.[0];

  return (
    <>
      {errors}
      <div className="pr-top">
        <div className="pr-id">
          <span className="tk" style={{ background: "var(--forest)", color: "var(--gold)" }}>
            {visit?.token ?? "…"}
          </span>
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person?.name ?? "…"}</b>
            <div className="pr-facts">
              <span>{person?.age} yrs</span>
              <span>{person?.sex === "F" ? "Female" : "Male"}</span>
              <span>{visit?.mode === "online" ? "Online" : "In clinic"}</span>
              <span>Room 2</span>
              <span>ABHA {person?.abha}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allergy ? <span className="badge red">Allergy: {allergy}</span> : null}
            {condition ? <span className="badge gold">{condition}</span> : null}
            <Link to="/patients" className="btn sec">
              <Icon name="folder" size={16} />
              History
            </Link>
          </div>
        </div>
      </div>

      <div className="rx-grid">
        <div>
          <Step title="Complaints & history" hint="What the patient tells you, in their words.">
            <div className="grid2">
              <div className="field">
                <label htmlFor="consult-complaints">Chief complaints</label>
                <Input
                  id="consult-complaints"
                  value={draft.complaints}
                  placeholder="Sore throat 3 days, fever 101°F"
                  onChange={(event) => setComplaints(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="consult-history">History of present illness</label>
                <Input
                  id="consult-history"
                  value={draft.history}
                  placeholder="No cough. Sister had similar symptoms last week."
                  onChange={(event) => setHistory(event.target.value)}
                />
              </div>
            </div>
          </Step>

          <Step title="Examination" hint="Tap a system to record findings.">
            <div className="dchips">
              {diagnoses.length === 0 ? (
                <p className="rp-note-empty">No examination recorded yet.</p>
              ) : (
                diagnoses.map((item) => (
                  <span className="dchip on" key={`${item.code}-${item.label}`}>
                    <b>
                      {item.code} {item.label}
                    </b>
                    <small>· {item.kind}</small>
                  </span>
                ))
              )}
            </div>
          </Step>

          <Step title="Diagnosis" hint="Suggested from complaints and findings. Add more than one if needed.">
            <div className="dchips">
              {diagnoses.length === 0 ? (
                <p className="rp-note-empty">No diagnosis yet.</p>
              ) : (
                diagnoses.map((item) => (
                  <span className="dchip on" key={`${item.code}-${item.label}`}>
                    <b>
                      {item.code} {item.label}
                    </b>
                    <small>· {item.kind}</small>
                  </span>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <span className="t-cap">Also consider:</span>
              {ALSO_CONSIDER.map((item) => (
                <span className="chip" key={item}>
                  + {item}
                </span>
              ))}
            </div>
          </Step>

          <Step
            title="Medicines"
            hint="Suggestions follow the diagnosis, allergies and age. Doses are checked as you type."
            step={4}
          >
            <table className="paper-tbl">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dose</th>
                  <th>When</th>
                  <th>For</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No medicine added yet.</td>
                  </tr>
                ) : (
                  medicines.map((medicine) => (
                    <tr key={medicine.name}>
                      <td>
                        <b>{medicine.name}</b>
                        {medicine.generic ? (
                          <>
                            <br />
                            <span className="t-cap">{medicine.generic}</span>
                          </>
                        ) : null}
                      </td>
                      <td>{medicine.dose ?? "—"}</td>
                      <td>{medicine.when ?? "—"}</td>
                      <td>{medicine.forDays ?? "—"}</td>
                      <td>{medicine.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <Input placeholder="Search brand or generic, e.g. 'cetirizine'" aria-label="Search medicines" />
              <Button variant="secondary" icon="rx">
                Use a template
              </Button>
            </div>

            {person?.allergies?.length ? (
              <div className="sf">
                <div className="sf-h" style={{ color: "var(--gold-ink)", fontWeight: 800 }}>
                  <Icon name="alert" size={16} />
                  Check the allergy before signing
                </div>
                <ul className="sf-list">
                  <li>
                    <span className="sf-tag gold">Check</span>
                    <div>
                      <b>Allergy on record: {person.allergies.join(", ")}</b>
                      <p>the checker warns before a medicine that clashes is added.</p>
                    </div>
                  </li>
                </ul>
              </div>
            ) : null}
          </Step>

          <Step title="Tests" hint="Ordered tests go to the lab desk with a barcode.">
            <div className="dchips">
              {tests.length === 0 ? (
                <p className="rp-note-empty">No test ordered yet.</p>
              ) : (
                tests.map((test) => (
                  <span className="dchip on" key={test.name}>
                    {test.name}
                  </span>
                ))
              )}
            </div>
          </Step>

          <Step title="Advice" hint="Printed in the patient's language: English, Kannada or Hindi.">
            <div className="grid2">
              <div className="field">
                <label htmlFor="consult-diet">Diet &amp; activity</label>
                <Input
                  id="consult-diet"
                  value={draft.diet}
                  placeholder="Warm fluids, soft food. Rest for 2 days."
                  onChange={(event) => setDiet(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="consult-return">Come back at once if</label>
                <Input
                  id="consult-return"
                  value={draft.returnIf}
                  placeholder="Difficulty breathing, drooling, fever above 103°F"
                  onChange={(event) => setReturnIf(event.target.value)}
                />
              </div>
            </div>
          </Step>

          <Step title="Follow-up">
            <div className="dchips">
              {FOLLOW_UP_OPTIONS.map((option) => (
                <span
                  className={cn("dchip", followUp === option && "on")}
                  key={option}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFollowUp(followUp === option ? "" : option)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setFollowUp(followUp === option ? "" : option);
                    }
                  }}
                >
                  {option}
                </span>
              ))}
            </div>
            {followUp ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label htmlFor="consult-followup-note">Note for reception</label>
                <Input
                  id="consult-followup-note"
                  value={followUpNote}
                  placeholder="Book at reception"
                  onChange={(event) => setFollowUpNote(event.target.value)}
                />
              </div>
            ) : null}
          </Step>

          <div className="sign-bar" style={{ marginTop: 16 }}>
            <div>
              <b style={{ fontSize: 15 }}>Sign &amp; send to reception</b>
              <div className="sign-sum" style={{ marginTop: 4 }}>
                <span>
                  {diagnoses.length} diagnosis · {medicines.length} medicine · {tests.length} test
                </span>
                {followUp ? <span>✓ Follow-up {followUp}</span> : <span>No follow-up</span>}
                <span>Aadhaar eSign</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={() => void save()}>
                Save draft
              </Button>
              <Button
                variant="gold"
                icon="check"
                disabled={busy || !prescriptionId}
                onClick={() => void sign()}
              >
                Sign prescription
              </Button>
            </div>
          </div>
        </div>

        <aside>
          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Patient brief</b>
            <div className="kv">
              <span className="t-cap">Last visit</span>
              <span>12 Sep · Dr. Ananya Rao · Viral fever</span>
              <span className="t-cap">Long-term</span>
              <span>{person?.conditions?.join(", ") || "Nothing on record"}</span>
              <span className="t-cap">Allergies</span>
              <span>{person?.allergies?.join(", ") || "None on record"}</span>
              <span className="t-cap">Visits</span>
              <span>{person?.visits ?? 0} visits</span>
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Intake &amp; vitals</b>
            <div className="ex-vitals" style={{ marginTop: 10 }}>
              <span className={reading?.tempF ? "" : "off"}>
                <small>Temp</small>
                <b>{reading?.tempF ? `${reading.tempF} °F` : "—"}</b>
              </span>
              <span className={reading?.bp ? "" : "off"}>
                <small>BP</small>
                <b>{reading?.bp ?? "—"}</b>
              </span>
              <span className={reading?.pulse ? "" : "off"}>
                <small>Pulse</small>
                <b>{reading?.pulse ? `${reading.pulse} /min` : "—"}</b>
              </span>
              <span className={reading?.spo2 ? "" : "off"}>
                <small>SpO₂</small>
                <b>{reading?.spo2 ? `${reading.spo2} %` : "—"}</b>
              </span>
              <span className={reading?.weightKg ? "" : "off"}>
                <small>Weight</small>
                <b>{reading?.weightKg ? `${reading.weightKg} kg` : "—"}</b>
              </span>
              <span className={reading?.sugarMg ? "" : "off"}>
                <small>Sugar (R)</small>
                <b>{reading?.sugarMg ? `${reading.sugarMg} mg/dL` : "—"}</b>
              </span>
            </div>
            <p className="t-cap" style={{ marginTop: 10 }}>
              Priority: {reading?.priority ?? "—"}
            </p>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <b style={{ fontSize: 16 }}>After signing</b>
            <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 8 }}>
              The prescription goes to reception to print, by SMS to the patient, and to the pharmacy the
              patient chooses.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="consult-pharmacy">Pharmacy</label>
              <Input
                id="consult-pharmacy"
                defaultValue="MedMate Pharmacy, Indiranagar · patient's choice"
                readOnly
              />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

/** The date a follow-up falls on, from the option the doctor picked. */
function followUpDate(option: string): string {
  const days: Record<string, number> = {
    "3 days": 3,
    "5 days": 5,
    "1 week": 7,
    "2 weeks": 14,
    "1 month": 30,
    "3 months": 90,
  };
  const date = new Date();
  date.setDate(date.getDate() + (days[option] ?? 7));
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function Signed({
  person,
}: {
  person: { name?: string; age?: number; sex?: string; abha?: string } | null;
}) {
  return (
    <>
      <div className="pr-top">
        <div className="pr-id">
          <span className="tk" style={{ background: "var(--forest)", color: "var(--gold)" }}>
            Signed
          </span>
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person?.name ?? "…"}</b>
            <div className="pr-facts">
              <span>{person?.age} yrs</span>
              <span>{person?.sex === "F" ? "Female" : "Male"}</span>
            </div>
          </div>
          <span className="badge mint">Signed</span>
        </div>
      </div>

      <section className="card sent-card" style={{ padding: 18 }}>
        <div className="sent-top">
          <span className="sent-ic">
            <Icon name="check" size={20} />
          </span>
          <b style={{ fontSize: 17 }}>
            Sent to <span style={{ color: "var(--green-700)" }}>reception</span>
          </b>
        </div>

        <div className="sent-grid" style={{ marginTop: 14 }}>
          <div className="card" style={{ padding: 14, boxShadow: "none" }}>
            <b>Reception desk</b>
            <p className="t-cap">Ready to print and hand over</p>
            <span className="badge">Waiting</span>
          </div>
          <div className="card" style={{ padding: 14, boxShadow: "none" }}>
            <b>Patient&apos;s mobile</b>
            <p className="t-cap">SMS with a secure link</p>
            <span className="badge">Delivered</span>
          </div>
          <div className="card" style={{ padding: 14, boxShadow: "none" }}>
            <b>ABHA</b>
            <p className="t-cap">Shared to {person?.abha ?? "—"}</p>
            <span className="badge">Linked</span>
          </div>
          <div className="card" style={{ padding: 14, boxShadow: "none" }}>
            <b>MedMate Pharmacy, Indiranagar</b>
            <p className="t-cap">Patient&apos;s choice · status updates here</p>
            <span className="badge blue">Ready for pickup</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Button variant="secondary" icon="print">
            Print
          </Button>
          <Button variant="secondary" icon="pill">
            Send to a pharmacy
          </Button>
          <Button variant="secondary" icon="cert">
            Certificate
          </Button>
          <div style={{ flex: 1 }} />
          <Link to="/queue" className="btn ghost">
            Amend (new version)
          </Link>
          <Link to="/queue" className="btn">
            <Icon name="check" size={16} />
            Call in next patient
          </Link>
        </div>
      </section>
    </>
  );
}
