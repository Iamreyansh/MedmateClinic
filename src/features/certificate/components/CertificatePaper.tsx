import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet } from "@/services/api";
import type { VisitResponse } from "@/types/visit";

/**
 * The medical certificate.
 *
 * It prints the patient the doctor is looking at — never a fixture — so a
 * certificate can never name somebody who was not examined.
 */
export function CertificatePaper() {
  const [params] = useSearchParams();
  const visitId = params.get("visit") ?? "";
  const [data, setData] = useState<VisitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visitId) return;
    let alive = true;
    apiGet<VisitResponse>(`/clinic/visits/${visitId}`)
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the certificate");
      });
    return () => {
      alive = false;
    };
  }, [visitId]);

  if (error) return <div className="note red">{error}</div>;
  if (!data) {
    return (
      <div className="paper-wrap">
        <div className="paper">
          <b style={{ fontSize: 15 }}>Loading the certificate…</b>
        </div>
      </div>
    );
  }

  const person = data.patient;
  const diagnosis = data.diagnoses?.[0];

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
            <b style={{ fontSize: 22, color: "var(--forest)", letterSpacing: "-0.02em" }}>
              MedMate Clinic
            </b>
            <p className="t-cap" style={{ marginTop: 4, lineHeight: 1.6 }}>
              12, 100 Feet Road, Indiranagar, Bengaluru 560038 · 080 4123 4567
              <br />
              KPME/BLR/2024/01873 · HFR IN2910000123 · GSTIN 29AAJCM4821K1Z7
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: 16 }}>Dr. Ananya Rao</b>
            <p className="t-cap" style={{ marginTop: 2 }}>
              MBBS, MD (General Medicine)
              <br />
              Reg. KMC 84213 · HPR 71-4421-8890-3326
            </p>
          </div>
        </div>

        <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", margin: "28px 0 6px", color: "var(--forest)" }}>
          Medical certificate
        </h1>
        <p className="t-cap">Certificate no. MC/26-27/0042 · {data.visit.token}</p>

        <p style={{ fontSize: 15.5, lineHeight: 1.75, marginTop: 18 }}>
          This is to certify that {person.sex === "F" ? "Ms." : "Mr."} {person.name}, aged {person.age}{" "}
          years, was examined by me on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} and
          is suffering from {diagnosis ? `${diagnosis.label} (${diagnosis.code ?? ""})` : "the condition noted below"}. She
          is advised rest and is fit to resume duty as advised.
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
            <span>Dr. Ananya Rao · Reg. KMC 84213</span>
          </div>
        </div>
      </div>
    </div>
  );
}
