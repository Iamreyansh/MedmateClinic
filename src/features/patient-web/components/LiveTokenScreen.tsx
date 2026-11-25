import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { fetchLiveToken } from "@/features/patient-web/api/patientWeb";
import type { LiveToken } from "@/features/patient-web/types";

/**
 * The patient's place in the queue.
 *
 * The patient keeps this page open on their phone. It shows where they are,
 * who they are seeing, and what they still have to pay at the desk — and it
 * refreshes itself, because the queue moves without the patient doing
 * anything.
 */
export function LiveTokenScreen() {
  const { token = "" } = useParams();
  const [live, setLive] = useState<LiveToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = () => {
      fetchLiveToken(token)
        .then((data) => {
          if (alive) setLive(data);
        })
        .catch((reason: unknown) => {
          if (!alive) return;
          setError(reason instanceof Error ? reason.message : "Could not load your token");
        });
    };

    load();
    // the queue moves on its own, so the page checks every ten seconds
    const timer = window.setInterval(load, 10000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

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

        {error ? (
          <div className="live-card">
            <div className="kiosk-ic warn">
              <Icon name="alert" size={28} />
            </div>
            <p>{error}</p>
          </div>
        ) : null}

        {!error && !live ? (
          <div className="live-card">
            <span className="spinner" />
          </div>
        ) : null}

        {!error && live ? (
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

            <p className="live-tip" style={{ marginTop: 18 }}>
              Keep this page open. It updates by itself.
            </p>
            <p className="live-upd">Last checked {live.updatedAt.slice(11, 16)}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
