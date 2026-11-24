"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  advice,
  brief,
  diagnoses,
  examination,
  followUp,
  medicines,
  patient,
  signedInDoctor,
  tests,
  vitals,
} from "@/lib/fixtures/clinic";

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

export function Consult() {
  const [signed, setSigned] = useState(false);
  const person = patient("pt_kavya");

  if (signed) {
    return <Signed person={person} />;
  }

  return (
    <>
      <div className="pr-top">
        <div className="pr-id">
          <span className="tk" style={{ background: "var(--forest)", color: "var(--gold)" }}>
            A-014
          </span>
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person.name}</b>
            <div className="pr-facts">
              <span>{person.age} yrs</span>
              <span>{person.sex === "F" ? "Female" : "Male"}</span>
              <span>In clinic</span>
              <span>Room 2</span>
              <span>ABHA {person.abha}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="badge red">Allergy: Penicillin</span>
            <span className="badge gold">Type 2 diabetes</span>
            <span className="badge mint">Paid ₹500</span>
            <Link href="/patients" className="btn sec">
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
                <label>Chief complaints</label>
                <Input defaultValue={brief.chiefComplaints} readOnly />
              </div>
              <div className="field">
                <label>History of present illness</label>
                <Input defaultValue={brief.history} readOnly />
              </div>
            </div>
          </Step>

          <Step title="Examination" hint="Tap a system to record findings.">
            <div className="dchips">
              {examination.map((item) => (
                <span className="dchip on" key={item.system}>
                  <b>{item.system}:</b>
                  {item.findings}
                </span>
              ))}
            </div>
          </Step>

          <Step title="Diagnosis" hint="Suggested from complaints and findings. Add more than one if needed.">
            <div className="dchips">
              {diagnoses.map((item) => (
                <span className="dchip on" key={item.code}>
                  <b>
                    {item.code} {item.name}
                  </b>
                  <small>· {item.kind}</small>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <span className="t-cap">Also consider:</span>
              {["Acute tonsillitis", "Viral URTI", "Infectious mononucleosis"].map((item) => (
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
                {medicines.map((medicine) => (
                  <tr key={medicine.name}>
                    <td>
                      <b>{medicine.name}</b>
                      <br />
                      <span className="t-cap">{medicine.generic}</span>
                    </td>
                    <td>{medicine.dose}</td>
                    <td>{medicine.when}</td>
                    <td>{medicine.forDays}</td>
                    <td>{medicine.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <Input placeholder="Search brand or generic, e.g. 'cetirizine'" />
              <Button variant="secondary" icon="rx">
                Use a template
              </Button>
            </div>

            <div className="sf">
              <div className="sf-h" style={{ color: "var(--gold-ink)", fontWeight: 800 }}>
                <Icon name="alert" size={16} />
                2 things to check before signing
              </div>
              <ul className="sf-list">
                <li>
                  <span className="sf-tag gold">Check</span>
                  <div>
                    <b>Antibiotic for a sore throat: is a bacterial cause likely?</b>
                    <p>(Centor score 3)</p>
                  </div>
                </li>
                <li>
                  <span className="sf-tag blue">OK</span>
                  <div>
                    <b>Penicillin allergy noted</b>
                    <p>azithromycin is a safe choice. No interaction with metformin.</p>
                  </div>
                </li>
              </ul>
            </div>
          </Step>

          <Step title="Tests" hint="Ordered tests go to the lab desk with a barcode.">
            <div className="dchips">
              {tests.map((test) => (
                <span className="dchip on" key={test}>
                  {test}
                </span>
              ))}
            </div>
          </Step>

          <Step title="Advice" hint="Printed in the patient's language: English, Kannada or Hindi.">
            <div className="grid2">
              <div className="field">
                <label>Diet &amp; activity</label>
                <Input defaultValue={advice.diet} readOnly />
              </div>
              <div className="field">
                <label>Come back at once if</label>
                <Input defaultValue={advice.return} readOnly />
              </div>
            </div>
          </Step>

          <Step title="Follow-up">
            <div className="dchips">
              {followUp.options.map((option) => (
                <span className={cn("dchip", option === followUp.selected && "on")} key={option}>
                  {option}
                </span>
              ))}
              <span className="t-cap">{followUp.when}</span>
            </div>
          </Step>
          <div className="sign-bar" style={{ marginTop: 16 }}>
            <div>
              <b style={{ fontSize: 15 }}>Sign &amp; send to reception</b>
              <div className="sign-sum" style={{ marginTop: 4 }}>
                <span>6 of 7 done</span>
                <span className="ok">1 safety check to acknowledge</span>
                <span>Aadhaar eSign</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary">Preview</Button>
              <Button variant="gold" icon="check" onClick={() => setSigned(true)}>
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
              <span>
                12 Sep · Dr. Ananya Rao · Viral fever
              </span>
              <span className="t-cap">Long-term</span>
              <span>Type 2 diabetes (metformin 500 mg twice a day)</span>
              <span className="t-cap">Allergies</span>
              <span>Penicillin — rash</span>
              <span className="t-cap">Visits</span>
              <span>{person.visits} in {person.since}</span>
            </div>
          </section>

          <section className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Intake &amp; vitals</b>
            <div className="ex-vitals" style={{ marginTop: 10 }}>
              <span className="off">
                <small>Temp</small>
                <b>{vitals.temp}</b>
              </span>
              <span>
                <small>BP</small>
                <b>{vitals.bp}</b>
              </span>
              <span className="off">
                <small>Pulse</small>
                <b>{vitals.pulse}</b>
              </span>
              <span>
                <small>SpO₂</small>
                <b>{vitals.spo2}</b>
              </span>
              <span>
                <small>Weight</small>
                <b>{vitals.weight}</b>
              </span>
              <span className="off">
                <small>Sugar (R)</small>
                <b>{vitals.sugar}</b>
              </span>
            </div>
            <p className="t-cap" style={{ marginTop: 10 }}>
              Recorded by {vitals.recordedBy} · Priority: {vitals.priority}
            </p>
          </section>

          <section className="card" style={{ padding: 16 }}>
            <b style={{ fontSize: 16 }}>After signing</b>
            <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 8 }}>
              The prescription goes to reception to print, by SMS to the patient, and to the pharmacy the
              patient chooses.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Pharmacy</label>
              <Input defaultValue="MedMate Pharmacy, Indiranagar · patient's choice" readOnly />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Signed({ person }: { person: ReturnType<typeof patient> }) {
  return (
    <>
      <div className="pr-top">
        <div className="pr-id">
          <span className="tk" style={{ background: "var(--forest)", color: "var(--gold)" }}>
            A-014
          </span>
          <div className="pr-who">
            <b style={{ fontSize: 19 }}>{person.name}</b>
            <div className="pr-facts">
              <span>{person.age} yrs</span>
              <span>{person.sex === "F" ? "Female" : "Male"}</span>
              <span>In clinic</span>
              <span>Room 2</span>
            </div>
          </div>
          <span className="badge mint">Signed 11:02</span>
        </div>
      </div>

      <section className="card sent-card" style={{ padding: 18 }}>
        <div className="sent-top">
          <span className="sent-ic">
            <Icon name="check" size={20} />
          </span>
          <b style={{ fontSize: 17 }}>
            Sent to <span style={{ color: "var(--green-700)" }}>reception</span> at 11:02
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
            <p className="t-cap">Shared to {person.abha}</p>
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
          <Link href="/queue" className="btn ghost">
            Amend (new version)
          </Link>
          <Link href="/queue" className="btn">
            <Icon name="check" size={16} />
            Call in next patient
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 18, marginTop: 14 }}>
        <b style={{ fontSize: 16 }}>Prescription summary</b>
        <div className="kv" style={{ marginTop: 10 }}>
          <span className="t-cap">Diagnosis</span>
          <span>J02.9 Acute pharyngitis · E11 Type 2 diabetes (known)</span>
          <span className="t-cap">Medicines</span>
          <span>
            Azithromycin 500 mg 1-0-0 × 3 days · Paracetamol 650 mg SOS × 3 days · Chlorhexidine 0.2%
            gargle twice a day × 5 days
          </span>
          <span className="t-cap">Tests</span>
          <span>CBC · Throat swab culture · HbA1c</span>
          <span className="t-cap">Follow-up</span>
          <span>Mon, 23 Nov · booked at reception</span>
          <span className="t-cap">Signed</span>
          <span>
            Aadhaar eSign · {signedInDoctor.name} · {signedInDoctor.registration} · version 1
          </span>
        </div>
      </section>
    </>
  );
}
