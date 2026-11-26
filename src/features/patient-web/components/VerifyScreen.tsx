import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, LoadingState } from "@/components/ui/ScreenStates";
import { verifyPrescription } from "@/features/patient-web/api/patientWeb";
import { InvalidLinkCard } from "@/features/patient-web/components/InvalidLinkCard";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { VerifiedPrescription } from "@/features/patient-web/types";

/**
 * Verify a prescription.
 *
 * A patient — or anyone — checks that a prescription is genuine and has not
 * been changed since the doctor signed it. The link carries the prescription's
 * id and a hash, so a document that has been altered does not verify.
 *
 * A document that does not verify shows nothing of itself: not the doctor,
 * not the patient, not the medicines. A tampered link is not a way to read
 * somebody else's prescription.
 */
export function VerifyScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const hash = params.get("h") ?? "";

  const [document, setDocument] = useState<VerifiedPrescription | null>(null);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id || !hash) return;
    let alive = true;
    verifyPrescription(id, hash)
      .then((data) => {
        if (!alive) return;
        setDocument(data);
        setFailure(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        const failed = patientFailure(reason, "Could not verify this document");
        setFailure(failed);
        if (failed.invalidLink) {
          // A link the clinic has to replace leaves nothing behind: the
          // document is cleared, not only hidden.
          setDocument(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [id, hash, attempt]);

  // The link is only a link when it carries both parts of it.
  const noLink = !id || !hash;
  /** The check is on its way, and there is nothing to show yet. */
  const loading = !noLink && !document && !failure;

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
        {noLink ? <InvalidLinkCard /> : null}

        {!noLink && failure?.invalidLink ? (
          <InvalidLinkCard onRetry={() => setAttempt((count) => count + 1)} />
        ) : null}

        {!noLink && !failure?.invalidLink && failure ? (
          <ErrorState
            message={failure.message}
            title={failure.unreachable ? "The clinic is not answering" : "Something went wrong"}
            onRetry={() => setAttempt((count) => count + 1)}
          />
        ) : null}

        {!noLink && !failure?.invalidLink && loading && !document ? (
          <LoadingState title="Checking the document…" />
        ) : null}

        {!noLink && !failure?.invalidLink && document && !document.genuine ? (
          <InvalidLinkCard />
        ) : null}

        {!noLink && !failure?.invalidLink && document && document.genuine ? (
          <>
            <div className="card">
              <div className="note mint">
                <Icon name="shield" size={18} />
                <div>Genuine and unchanged.</div>
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

            {document.signatureMode === "test" || document.signatureMode === "demo" ? (
              <div className="note gold" style={{ marginTop: 12 }}>
                <Icon name="alert" size={18} />
                <div>
                  Signed in test mode: not a legal signature. Check with the doctor before you take
                  anything.
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
