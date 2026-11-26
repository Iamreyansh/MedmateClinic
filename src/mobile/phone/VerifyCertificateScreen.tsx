"use client";

import { useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { verifyPrescription } from "@/features/patient-web/api/patientWeb";
import { Icon } from "@/components/ui/Icon";
import { useRemote } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading } from "@/mobile/components";
import { clinicDate, clinicTime } from "@/lib/format";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * The patient checks a medical certificate.
 *
 * The certificate is checked the way every public document is checked: the
 * number on the document and the check code that came with it. A document
 * that is not genuine says so plainly — it is not an error, and it does not
 * leak anything about the document.
 */
export function MobileVerifyCertificateScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const hash = params.get("h") ?? "";

  const load = useCallback(
    () =>
      id
        ? verifyPrescription(id, hash)
        : Promise.reject(new Error("Open the link the clinic sent you to check a certificate.")),
    [id, hash],
  );
  const { status, data, error, reload, unreachable, code } = useRemote(load, `${id}-${hash}`);

  if (id && data && data.genuine === false) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Certificate check</h1>
          <p>The link is not valid</p>
        </header>
        <div className="mob-body">
          <MobileCard>
            <span className="kiosk-ic warn">
              <Icon name="alert" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              This link isn&apos;t valid
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              The certificate has been changed since it was signed, or the link is not the
              clinic&apos;s. Ask the clinic for a new link.
            </p>
          </MobileCard>
        </div>
      </div>
    );
  }

  if (code === 404) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Certificate check</h1>
          <p>The link is no longer open</p>
        </header>
        <div className="mob-body">
          <MobileCard>
            <span className="kiosk-ic warn">
              <Icon name="alert" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              This link has expired
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              Ask the clinic for a new link, and you can check the certificate on it.
            </p>
          </MobileCard>
        </div>
      </div>
    );
  }

  return (
    <div className="mob-phone">
      <header className="mob-head pub">
        <div className="lockup">
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>Certificate check</h1>
        <p>Check that a certificate is genuine and unchanged</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Checking the certificate…" /> : null}
        {status === "error" && error && code !== 404 ? (
          <MobileError message={error} onRetry={reload} unreachable={unreachable} />
        ) : null}

        {data ? (
          <>
            <div className="note mint">
              <Icon name="check" size={18} />
              <div>
                <b>Genuine and unchanged.</b>
                {data.signatureMode === "test"
                  ? " Signed in test mode: not a legal signature."
                  : " Signed and sealed by the doctor."}
              </div>
            </div>

            <MobileCard title="The certificate">
              <div className="mob-kv">
                <span>Doctor</span>
                <b>{data.doctor.name}</b>
              </div>
              <div className="mob-kv">
                <span>Registration</span>
                <b>{data.doctor.registration}</b>
              </div>
              <div className="mob-kv">
                <span>Speciality</span>
                <b>{data.doctor.speciality}</b>
              </div>
              <div className="mob-kv">
                <span>Signed</span>
                <b>
                  {clinicDate(data.signedAt)} · {clinicTime(data.signedAt)}
                </b>
              </div>
              <div className="mob-kv">
                <span>Patient</span>
                <b>
                  {data.patient.name} · {data.patient.age} {data.patient.sex}
                </b>
              </div>
              <div className="mob-kv">
                <span>Visit</span>
                <b>{data.visitToken}</b>
              </div>
            </MobileCard>

            {data.medicines.length > 0 ? (
              <MobileCard title="What the certificate says">
                <div className="mob-section">
                  {data.medicines.map((line) => (
                    <div key={`${line.name}-${line.dose ?? ""}`} className="mob-row">
                      <span className="txt" style={{ whiteSpace: "normal" }}>
                        <b style={{ whiteSpace: "normal" }}>{line.name}</b>
                        <small style={{ whiteSpace: "normal" }}>
                          {[line.dose, line.when, line.forDays && `for ${line.forDays}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </MobileCard>
            ) : null}
          </>
        ) : null}

        {!id ? (
          <MobileCard title="Check a certificate">
            <p className="t-cap">
              The link the clinic sent you carries the certificate&apos;s number and its check code.
              Open that link to see the certificate.
            </p>
            <div className="mob-foot">
              <Link className="btn block sec" to="/m/verify">
                Check a prescription instead
              </Link>
            </div>
          </MobileCard>
        ) : null}
      </div>
      <PhoneTabBar activeHref="/m/verify" />
    </div>
  );
}
