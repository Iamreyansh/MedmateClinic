import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { verifyPrescription } from "@/features/patient-web/api/patientWeb";
import type { VerifiedPrescription } from "@/features/patient-web/types";

/**
 * Verify a prescription.
 *
 * A patient — or anyone — checks that a prescription is genuine and has not
 * been changed since the doctor signed it. The link carries the prescription's
 * id and a hash, so a document that has been altered does not verify.
 */
export function VerifyScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const hash = params.get("h") ?? "";

  const [document, setDocument] = useState<VerifiedPrescription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    verifyPrescription(id, hash)
      .then((data) => {
        if (alive) setDocument(data);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "Could not verify this document");
      });
    return () => {
      alive = false;
    };
  }, [id, hash]);

  return (
    <div className="intake-page">
      <div className="mob-head pub" style={{ paddingBottom: 56 }}>
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 26 }}>
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Verify a prescription</h1>
        <p>Check that it is genuine and unchanged.</p>
      </div>

      <div className="intake-wrap">
        {error ? (
          <div className="card">
            <p className="err">{error}</p>
          </div>
        ) : null}

        {!error && !document ? (
          <div className="card">
            <span className="spinner" />
          </div>
        ) : null}

        {!error && document ? (
          <>
            <div className="card">
              <div className="note mint">
                <Icon name="shield" size={18} />
                <div>
                  {document.genuine
                    ? "Genuine and unchanged."
                    : "This document has been changed since it was signed."}
                </div>
              </div>

              <div className="live-row" style={{ marginTop: 12 }}>
                <span>Doctor</span>
                <b>{document.doctor.name}</b>
              </div>
              <div className="live-row" style={{ marginTop: 8 }}>
                <span>Registration</span>
                <b>{document.doctor.registration}</b>
              </div>
              <div className="live-row" style={{ marginTop: 8 }}>
                <span>Signed</span>
                <b>{document.signedAt.slice(0, 16).replace("T", " ")}</b>
              </div>
              <div className="live-row" style={{ marginTop: 8 }}>
                <span>Patient</span>
                <b>
                  {document.patient.name} · {document.patient.age} {document.patient.sex}
                </b>
              </div>
            </div>

            {document.diagnoses.length > 0 ? (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-h">
                  <div className="t-h3">Diagnosis</div>
                </div>
                {document.diagnoses.map((entry) => (
                  <div key={entry.code} className="live-row">
                    <span>{entry.code}</span>
                    <b>{entry.label}</b>
                  </div>
                ))}
              </div>
            ) : null}

            {document.medicines.length > 0 ? (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-h">
                  <div className="t-h3">Medicines</div>
                </div>
                {document.medicines.map((entry) => (
                  <div key={entry.name} className="live-row">
                    <span>{entry.name}</span>
                    <b>
                      {entry.dose}
                      {entry.forDays ? ` · ${entry.forDays}` : ""}
                    </b>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="note gold" style={{ marginTop: 12 }}>
              <Icon name="alert" size={18} />
              <div>
                Signed in test mode: not a legal signature. Check with the doctor before you take
                anything.
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
