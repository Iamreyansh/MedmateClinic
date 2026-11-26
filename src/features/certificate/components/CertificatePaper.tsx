import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "@/services/api";
import { CLINIC_ZONE } from "@/lib/format";
import type { VisitResponse } from "@/types/visit";
import type { PatientRecord } from "@/types/patient";

/**
 * The medical certificate.
 *
 * It prints the patient the doctor is looking at — never a fixture — so a
 * certificate can never name somebody who was not examined.
 */
export function CertificatePaper() {
  const [params] = useSearchParams();
  // the visit may be named outright, or found from the patient's record
  const wanted = params.get("visit") ?? "";
  const patientId = params.get("patient") ?? "";
  const [data, setData] = useState<VisitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** What has been loaded, so a new visit shows its own loading again. */
  const [loaded, setLoaded] = useState<string | null>(null);

  const target = wanted || (patientId ? `patient:${patientId}` : "");
  const loading = target !== "" && loaded !== target && error === null;

  useEffect(() => {
    let alive = true;
    if (!target) {
      return () => {
        alive = false;
      };
    }

    /** The visit the certificate is about. */
    async function resolve(): Promise<string> {
      if (wanted) return wanted;
      const record = await apiGet<PatientRecord>(`/clinic/patients/${patientId}`);
      const latest = record.visits[0];
      if (!latest) throw new Error("This patient has no visits yet.");
      return latest.id;
    }

    resolve()
      .then((visitId) => apiGet<VisitResponse>(`/clinic/visits/${visitId}`))
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not load the certificate");
      })
      .finally(() => {
        if (alive) setLoaded(target);
      });
    return () => {
      alive = false;
    };
  }, [target, wanted, patientId]);

  if (error) {
    return (
      <div className="paper-wrap">
        <div className="paper">
          <div className="note red">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    // No visit was chosen. Say so plainly rather than waiting for ever.
    if (!loading) {
      return (
        <div className="paper-wrap">
          <div className="paper">
            <b style={{ fontSize: 15 }}>No visit chosen</b>
            <p className="t-cap" style={{ marginTop: 6 }}>
              A certificate is written for a visit. Open it from the doctor&rsquo;s console, or from
              the patient&rsquo;s record.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Link className="btn sec" to="/queue">
                Doctor console
              </Link>
              <Link className="btn sec" to="/patients">
                Patient records
              </Link>
            </div>
          </div>
        </div>
      );
    }
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
          years, was examined by me on {new Date().toLocaleDateString("en-IN", { dateStyle: "long", timeZone: CLINIC_ZONE })} and
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
