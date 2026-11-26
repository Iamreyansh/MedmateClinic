"use client";

import { useCallback, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { verifyPrescription } from "@/features/patient-web/api/patientWeb";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useRemote } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading } from "@/mobile/components";
import { clinicDate, clinicTime } from "@/lib/format";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * The patient checks a document.
 *
 * The link carries the document's number and the hash that proves it has
 * not been changed. A document that is not genuine says so plainly — it is
 * not an error, and it is not a crash: the link is simply not valid.
 */
export function MobileVerifyScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const hash = params.get("h") ?? "";

  const load = useCallback(
    () =>
      id
        ? verifyPrescription(id, hash)
        : Promise.reject(new Error("Open the link the clinic sent you to check a document.")),
    [id, hash],
  );
  const { status, data, error, reload, unreachable, code } = useRemote(load, `${id}-${hash}`);

  const [typed, setTyped] = useState("");
  const [typedHash, setTypedHash] = useState("");

  if (id && data && data.genuine === false) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Document check</h1>
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
              The document has been changed since it was signed, or the link is not the clinic&apos;s.
              Ask the clinic for a new link.
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
          <h1>Document check</h1>
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
              Ask the clinic for a new link, and you can check the document on it.
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
        <h1>Document check</h1>
        <p>Check that a document is genuine and unchanged</p>
      </header>

      <div className="mob-body">
        {status === "loading" && !data ? <MobileLoading title="Checking the document…" /> : null}
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

            <MobileCard title="The document">
              <div className="mob-kv">
                <span>Doctor</span>
                <b>{data.doctor.name}</b>
              </div>
              <div className="mob-kv">
                <span>Registration</span>
                <b>{data.doctor.registration}</b>
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

            {data.diagnoses.length > 0 ? (
              <MobileCard title="Diagnoses">
                <div className="mob-section">
                  {data.diagnoses.map((line) => (
                    <div key={`${line.code ?? "none"}-${line.label}`} className="mob-row">
                      <span className="txt">
                        <b>{line.label}</b>
                        {line.code ? <small>{line.code}</small> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </MobileCard>
            ) : null}

            {data.medicines.length > 0 ? (
              <MobileCard title="Medicines">
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
          <MobileCard title="Check a document">
            <p className="t-cap">
              The link the clinic sent you carries the document&apos;s number and its check code.
              Type them in here if you have them.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="vf-id">Document number</label>
              <Input
                id="vf-id"
                value={typed}
                placeholder="rx_…"
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="vf-hash">Check code</label>
              <Input
                id="vf-hash"
                value={typedHash}
                onChange={(event) => setTypedHash(event.target.value)}
              />
            </div>
          </MobileCard>
        ) : null}
      </div>
      <PhoneTabBar activeHref="/m/verify" />
    </div>
  );
}
