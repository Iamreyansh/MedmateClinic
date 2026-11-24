import { clinic, patient, signedInDoctor } from "@/lib/fixtures/clinic";

export function CertificatePaper() {
  const person = patient("pt_kavya");

  return (
    <div className="paper-wrap">
      <div className="paper">
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

        <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", margin: "28px 0 6px", color: "var(--forest)" }}>
          Medical certificate
        </h1>
        <p className="t-cap">Certificate no. MC/26-27/0042 · 17 Nov 2026</p>

        <p style={{ fontSize: 15.5, lineHeight: 1.75, marginTop: 18 }}>
          This is to certify that Ms. {person.name}, aged {person.age} years, was examined by me on 17
          November 2026 and is suffering from acute pharyngitis (J02.9). She is advised rest from 17
          November 2026 to 19 November 2026 (3 days) and is fit to resume duty on 20 November 2026.
        </p>

        <div className="kv" style={{ marginTop: 22, maxWidth: 420 }}>
          <span className="t-cap">Purpose</span>
          <span>
            <b>Leave from work</b>
          </span>
          <span className="t-cap">Identification</span>
          <span>
            <b>Mole on right cheek</b>
          </span>
          <span className="t-cap">Patient&apos;s signature</span>
          <span>
            <span className="sig-line" style={{ display: "block", maxWidth: 220, marginTop: 14 }} />
          </span>
        </div>

        <div className="paper-sign">
          <div className="paper-check">
            <span>
              <span>Verify this certificate</span>
              <b>medmate.clinic/cert/mc-26-27-0042</b>
            </span>
          </div>
          <div className="sig">
            <span className="sig-line" />
            <span>
              {signedInDoctor.name} · {signedInDoctor.registration} · 17 Nov 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
