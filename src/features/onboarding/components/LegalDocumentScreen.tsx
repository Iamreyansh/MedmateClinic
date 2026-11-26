import { Link, useParams } from "react-router-dom";
import { AGREEMENTS } from "@/features/onboarding/types";

/**
 * A legal document, for the person who follows the link.
 *
 * The documents are the ones the clinic agrees to — the terms of service,
 * the data processing agreement and the clinic's declaration — and they are
 * read out of the same list the sign-up's last step reads, so the two can
 * never say different things.
 *
 * The page stands outside the sign-in: a patient who follows a legal link
 * is not staff, and asking them to sign in to read the terms is the wrong
 * behaviour for a public document.
 *
 * A document nobody has written yet says so plainly. It does not pretend
 * to be a document, and it does not send the reader to sign in.
 */
export function LegalDocumentScreen() {
  const { document } = useParams();
  const agreement = AGREEMENTS.find((entry) => entry.id === document);

  return (
    <div className="intake-page">
      <div className="mob-head pub" style={{ paddingBottom: 56 }}>
        <div className="lockup">
          <div className="wordmark" style={{ fontSize: 26 }}>
            Med<span className="m">Mate</span>
          </div>
        </div>
        <h1>{agreement ? agreement.title : "Legal document"}</h1>
        <p>{agreement ? `Version ${agreement.version}` : "The documents behind the product"}</p>
      </div>

      <div className="intake-wrap">
        {agreement ? (
          <div className="card">
            <p className="t-cap">{agreement.points}</p>
            <div className="mob-foot">
              <Link className="btn ghost" to="/start">
                Back
              </Link>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="note gold">
              <b>This document is not available yet.</b>
              <p>
                The clinic&apos;s terms, its data processing agreement and its declaration are
                still being written. Ask the clinic for the copy it works from.
              </p>
            </div>
            <div className="mob-foot">
              <Link className="btn ghost" to="/start">
                Back
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
