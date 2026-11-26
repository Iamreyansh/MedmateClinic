import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { apiGet } from "@/services/api";
import { CLINIC_ZONE } from "@/lib/format";
import type { VisitResponse } from "@/types/visit";

/** The clinic's letterhead, as it prints. */
export type Letterhead = {
  name: string;
  address: string;
  phone: string;
  registration: string;
  hfr: string;
  gstin: string;
};

/** The signed doctor, as it prints. */
export type PrintingDoctor = {
  name: string;
  speciality: string;
  registration: string;
  hpr: string;
};

function LetterheadBlock({
  letterhead,
  doctor,
}: {
  letterhead: Letterhead;
  doctor: PrintingDoctor;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
        borderBottom: "2px solid var(--gold)",
        paddingBottom: 12,
      }}
    >
      <div>
        <b style={{ fontSize: 22, color: "var(--forest)", letterSpacing: "-0.02em" }}>
          {letterhead.name}
        </b>
        <p className="t-cap" style={{ marginTop: 4, lineHeight: 1.6 }}>
          {letterhead.address} · {letterhead.phone}
          <br />
          {letterhead.registration} · HFR {letterhead.hfr} · GSTIN {letterhead.gstin}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <b style={{ fontSize: 16 }}>{doctor.name}</b>
        <p className="t-cap" style={{ marginTop: 2 }}>
          MBBS, MD ({doctor.speciality})
          <br />
          {doctor.registration} · {doctor.hpr}
        </p>
      </div>
    </div>
  );
}

export function PrescriptionPaper() {
  const { id = "" } = useParams();
  const [data, setData] = useState<VisitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    apiGet<VisitResponse>(`/clinic/visits/${id}`)
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the prescription");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <div className="note red">{error}</div>;
  if (!data) {
    return (
      <div className="paper-wrap">
        <div className="paper">
          <b style={{ fontSize: 15 }}>Loading the prescription…</b>
        </div>
      </div>
    );
  }

  const person = data.patient;
  const reading = data.vitals;
  const consultation = data.consultation;
  const signed = data.prescriptions.find((item) => item.status === "signed");

  return (
    <div className="paper-wrap">
      <div className="paper">
        <LetterheadBlock
          letterhead={{
            name: "MedMate Clinic",
            address: "12, 100 Feet Road, Indiranagar, Bengaluru 560038",
            phone: "080 4123 4567",
            registration: "KPME/BLR/2024/01873",
            hfr: "IN2910000123",
            gstin: "29AAJCM4821K1Z7",
          }}
          doctor={{
            name: "Dr. Ananya Rao",
            speciality: "General Medicine",
            registration: "Reg. KMC 84213",
            hpr: "HPR 71-4421-8890-3326",
          }}
        />

        <div className="paper-meta" style={{ marginTop: 18 }}>
          <span className="t-cap">Patient</span>
          <span className="t-cap">ABHA</span>
          <span className="t-cap">Date</span>
          <span className="t-cap">Token</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, fontSize: 13.5 }}>
          <b>
            {person.name} · {person.age} {person.sex}
          </b>
          <span>{person.abha}</span>
          <span>
          {signed?.signedAt
            ? new Date(signed.signedAt).toLocaleDateString("en-IN", { timeZone: CLINIC_ZONE })
            : "—"}
        </span>
          <b>{data.visit.token}</b>
        </div>

        {person.allergies.length || person.conditions.length ? (
          <div className="note red" style={{ marginTop: 14 }}>
            <Icon name="alert" size={16} />
            <span>
              {person.allergies.length ? `Allergy: ${person.allergies.join(", ")}` : ""}
              {person.allergies.length && person.conditions.length ? " · " : ""}
              {person.conditions.length ? `Known: ${person.conditions.join(", ")}` : ""}
            </span>
          </div>
        ) : null}

        <div className="paper-pt">
          <div>
            <span className="t-cap">Complaints</span>
            <b>{consultation?.complaints ?? "—"}</b>
          </div>
          <div>
            <span className="t-cap">Vitals</span>
            <b>
              {reading
                ? `Temp ${reading.tempF ?? "—"} °F · BP ${reading.bp ?? "—"} · Pulse ${
                    reading.pulse ?? "—"
                  } · SpO₂ ${reading.spo2 ?? "—"} · Wt ${reading.weightKg ?? "—"} kg`
                : "Not recorded"}
            </b>
          </div>
        </div>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Examination</span>
            <b>
              {consultation?.examination?.length
                ? consultation.examination
                    .map((item) => `${item.system}: ${item.findings}`)
                    .join(". ")
                : "—"}
            </b>
          </div>
          <div>
            <span className="t-cap">Diagnosis</span>
            <b>
              {data.diagnoses?.length
                ? data.diagnoses
                    .map((item) => `${item.code ?? ""} ${item.label} (${String(item.kind).toLowerCase()})`)
                    .join(" · ")
                : "—"}
            </b>
          </div>
        </div>

        <div className="paper-rx">℞</div>

        <table className="paper-tbl" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Medicine (generic)</th>
              <th>Dose</th>
              <th>When</th>
              <th>How long · Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.medicines?.length ? (
              data.medicines.map((medicine, index) => (
                <tr key={medicine.name}>
                  <td>{index + 1}</td>
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
                  <td>
                    {medicine.forDays ?? "—"} {medicine.notes ? `· ${medicine.notes}` : ""}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No medicine on this prescription.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Tests</span>
            <b>{data.tests?.length ? data.tests.map((test) => test.name).join(" · ") : "—"}</b>
          </div>
          <div>
            <span className="t-cap">Advice</span>
            <b>
              {consultation?.adviceDiet || consultation?.adviceReturn
                ? [consultation.adviceDiet, consultation.adviceReturn].filter(Boolean).join(". ")
                : "—"}
            </b>
          </div>
        </div>

        {consultation?.followUpAt ? (
          <div className="paper-pt">
            <div>
              <span className="t-cap">Follow-up</span>
              <b>
                {new Date(consultation.followUpAt).toLocaleDateString("en-IN", {
                  dateStyle: "long",
                  timeZone: CLINIC_ZONE,
                })}
              </b>
            </div>
          </div>
        ) : null}

        <div className="paper-sign">
          <div className="paper-check">
            <span>
              <span>Verify this prescription</span>
              <b>medmate.clinic/rx/{data.visit.token.toLowerCase()}</b>
            </span>
          </div>
          <div className="sig">
            <span className="sig-line" />
            <span>
              {signed?.signatureMode === "test" ? "Test mode signature" : "Aadhaar eSign"} · Dr. Ananya
              Rao · Reg. KMC 84213 · version {signed?.version ?? 1}
            </span>
          </div>
        </div>

        <div className="paper-foot">
          MedMate Clinic · 12, 100 Feet Road, Indiranagar, Bengaluru 560038 · GSTIN 29AAJCM4821K1Z7 ·
          This is a computer generated prescription.
        </div>
      </div>
    </div>
  );
}
