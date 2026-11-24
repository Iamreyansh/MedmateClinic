import { Icon } from "@/components/ui/Icon";
import { clinic, diagnoses, medicines, patient, signedInDoctor, tests, vitals } from "@/services/api/mock/clinic";

function Letterhead() {
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
        <b style={{ fontSize: 22, color: "var(--forest)", letterSpacing: "-0.02em" }}>{clinic.letterhead}</b>
        <p className="t-cap" style={{ marginTop: 4, lineHeight: 1.6 }}>
          {clinic.address} · {clinic.phone}
          <br />
          {clinic.registration} · HFR {clinic.hfr} · GSTIN {clinic.gstin}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <b style={{ fontSize: 16 }}>{signedInDoctor.name}</b>
        <p className="t-cap" style={{ marginTop: 2 }}>
          MBBS, MD ({signedInDoctor.speciality})
          <br />
          {signedInDoctor.registration} · {signedInDoctor.hpr}
        </p>
      </div>
    </div>
  );
}

export function PrescriptionPaper() {
  const person = patient("pt_kavya");

  return (
    <div className="paper-wrap">
      <div className="paper">
        <Letterhead />

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
          <span>17 Nov 2026, 11:02</span>
          <b>A-014</b>
        </div>

        <div className="note red" style={{ marginTop: 14 }}>
          <Icon name="alert" size={16} />
          <span>
            Allergy: Penicillin (rash) · Known: Type 2 diabetes
          </span>
        </div>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Complaints</span>
            <b>Sore throat 3 days, fever 101°F, pain swallowing</b>
          </div>
          <div>
            <span className="t-cap">Vitals</span>
            <b>
              Temp {vitals.temp} · BP {vitals.bp} · Pulse {vitals.pulse} · SpO₂ {vitals.spo2} · Wt{" "}
              {vitals.weight}
            </b>
          </div>
        </div>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Examination</span>
            <b>Febrile, alert. Throat: tonsils enlarged with exudate. Neck: tender nodes. Chest clear.</b>
          </div>
          <div>
            <span className="t-cap">Diagnosis</span>
            <b>
              {diagnoses.map((item) => `${item.code} ${item.name} (${item.kind.toLowerCase()})`).join(" · ")}
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
            {medicines.map((medicine, index) => (
              <tr key={medicine.name}>
                <td>{index + 1}</td>
                <td>
                  <b>{medicine.name}</b>
                  <br />
                  <span className="t-cap">{medicine.generic}</span>
                </td>
                <td>{medicine.dose}</td>
                <td>{medicine.when}</td>
                <td>
                  {medicine.forDays} · {medicine.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Tests</span>
            <b>{tests.join(" · ")}</b>
          </div>
          <div>
            <span className="t-cap">Advice</span>
            <b>
              Warm fluids, soft food, rest 2 days. Come back at once if difficulty breathing or fever
              above 103°F.
            </b>
          </div>
        </div>

        <div className="paper-pt">
          <div>
            <span className="t-cap">Follow-up</span>
            <b>Monday, 23 November 2026</b>
          </div>
        </div>

        <div className="paper-sign">
          <div className="paper-check">
            <span>
              <span>Verify this prescription</span>
              <b>medmate.clinic/rx/a014-9f3c21</b>
            </span>
          </div>
          <div className="sig">
            <span className="sig-line" />
            <span>
              Aadhaar eSign · {signedInDoctor.name} · {signedInDoctor.registration} · version 1
            </span>
          </div>
        </div>

        <div className="paper-foot">
          {clinic.letterhead} · {clinic.address} · GSTIN {clinic.gstin} · This is a computer generated
          prescription.
        </div>
      </div>
    </div>
  );
}
