import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/ScreenStates";
import { cn } from "@/lib/cn";
import { fetchLiveToken } from "@/features/patient-web/api/patientWeb";
import { InvalidLinkCard } from "@/features/patient-web/components/InvalidLinkCard";
import { patientFailure, type PatientFailure } from "@/features/patient-web/lib/errors";
import type { LiveToken } from "@/features/patient-web/types";

/**
 * The patient's place in the queue.
 *
 * The patient keeps this page open on their phone. It shows where they are,
 * who they are seeing, and what they still have to pay at the desk — and it
 * refreshes itself, because the queue moves without the patient doing
 * anything.
 *
 * The number on the page is the queue slip — "A-016" — and never the link
 * key. The link key is the secret in the URL, and it is not a number a
 * patient reads out.
 */
export function LiveTokenScreen() {
  const { token = "" } = useParams();
  const [live, setLive] = useState<LiveToken | null>(null);
  const [failure, setFailure] = useState<PatientFailure | null>(null);
  /** The last refresh did not get through; the page below is the last one. */
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;

    const load = () => {
      fetchLiveToken(token)
        .then((data) => {
          if (!alive) return;
          setLive(data);
          setFailure(null);
          setStale(false);
        })
        .catch((reason: unknown) => {
          if (!alive) return;
          const failed = patientFailure(reason, "Could not load your place in the queue");
          setFailure(failed);
          if (failed.invalidLink) {
            // A link the clinic has to replace leaves nothing behind: the
            // record is cleared, not only hidden.
            setLive(null);
            return;
          }
          // The service did not answer this time. The page still shows what
          // it showed a moment ago — the queue moves on its own.
          setStale(true);
        });
    };

    load();
    // the queue moves on its own, so the page checks every ten seconds
    const timer = window.setInterval(load, 10000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token, attempt]);

  /** The page is on its way, and there is nothing to show yet. */
  const loading = Boolean(token) && !live && !failure;

  if (!token) {
    return (
      <div className="live" lang="en">
        <div className="live-in">
          <header className="live-head">
            <div className="lockup">
              <div className="wordmark" style={{ fontSize: 26 }}>
                Med<span className="m">Mate</span>
              </div>
            </div>
          </header>
          <InvalidLinkCard />
        </div>
      </div>
    );
  }

  return (
    <div className="live" lang="en">
      <div className="live-in">
        <header className="live-head">
          <div className="lockup">
            <div className="wordmark" style={{ fontSize: 26 }}>
              Med<span className="m">Mate</span>
            </div>
          </div>
        </header>

        {failure?.invalidLink ? <InvalidLinkCard onRetry={() => setAttempt((count) => count + 1)} /> : null}

        {!failure?.invalidLink && failure && !live ? (
          <ErrorState
            message={failure.message}
            title={failure.unreachable ? "The clinic is not answering" : "Something went wrong"}
            onRetry={() => setAttempt((count) => count + 1)}
          />
        ) : null}

        {!failure?.invalidLink && loading && !live ? (
          <div className="live-card">
            <span className="spinner" />
            <p style={{ marginTop: 12 }}>Finding your place in the queue…</p>
          </div>
        ) : null}

        {!failure?.invalidLink && live ? (
          <>
            <div className={cn("live-card", live.called && "turn")}>
              {live.called ? (
                <>
                  <div className="kiosk-token" style={{ fontSize: 56 }}>
                    {live.token}
                  </div>
                  <p>Please go in. The doctor is ready to see you.</p>
                </>
              ) : (
                <>
                  <div className="kiosk-token" style={{ fontSize: 56 }}>
                    {live.token}
                  </div>
                  <p>
                    {live.ahead === 0
                      ? "You are next. Please wait to be called."
                      : `${live.ahead} ${live.ahead === 1 ? "person" : "people"} ahead of you.`}
                  </p>
                </>
              )}
            </div>

            <div className="live-row" style={{ marginTop: 12 }}>
              <span>Your place in the queue</span>
              <b>{live.position}</b>
            </div>
            <div className="live-row" style={{ marginTop: 8 }}>
              <span>Room</span>
              <b>{live.room}</b>
            </div>
            <div className="live-row" style={{ marginTop: 8 }}>
              <span>Doctor</span>
              <b>{live.doctor}</b>
            </div>
            <div className="live-row" style={{ marginTop: 8 }}>
              <span>To pay at the front desk</span>
              <b>₹{live.due}</b>
            </div>
            {live.prescriptionUrl ? (
              <div className="live-row" style={{ marginTop: 8 }}>
                <span>Prescription</span>
                <a className="btn sec sm" href={live.prescriptionUrl}>
                  Open
                </a>
              </div>
            ) : null}

            {stale ? (
              <div className="note gold" style={{ marginTop: 12 }}>
                <Icon name="alert" size={18} />
                <div style={{ flex: 1 }}>
                  We could not refresh just now. This is where you were a moment ago.
                </div>
                <Button variant="secondary" size="sm" onClick={() => setAttempt((count) => count + 1)}>
                  Try again
                </Button>
              </div>
            ) : null}

            <p className="live-tip" style={{ marginTop: 18 }}>
              Keep this page open. It updates by itself.
            </p>
            <p className="live-upd">
              Last checked {new Date(live.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
