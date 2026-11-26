"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchLiveToken } from "@/features/patient-web/api/patientWeb";
import type { LiveToken } from "@/features/patient-web/types";
import { ApiError } from "@/services/api";
import { Icon } from "@/components/ui/Icon";
import { isUnreachable, messageOf } from "@/mobile/hooks";
import { MobileCard, MobileError, MobileLoading, MobileTitle } from "@/mobile/components";
import { PhoneTabBar } from "@/mobile/appShell";

/**
 * The patient's place in the queue, on their phone.
 *
 * The number the desk calls out, how many people are ahead, who the patient
 * is seeing and what is still to pay. The queue moves without the patient
 * doing anything, so the page checks itself every ten seconds.
 */
export function MobileLiveTokenScreen() {
  const { key = "" } = useParams();
  const [live, setLive] = useState<LiveToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => fetchLiveToken(key), [key]);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      load()
        .then((data) => {
          if (!alive) return;
          setLive(data);
          setError(null);
          setUnreachable(false);
          setNotFound(false);
          setLoading(false);
        })
        .catch((reason: unknown) => {
          if (!alive) return;
          setError(messageOf(reason));
          setUnreachable(isUnreachable(reason));
          setNotFound(reason instanceof ApiError && reason.status === 404);
          setLoading(false);
        });
    };
    poll();
    const timer = window.setInterval(poll, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [load, attempt]);

  if (notFound) {
    return (
      <div className="mob-phone">
        <header className="mob-head pub">
          <div className="lockup">
            <div className="wordmark">
              Med<span className="m">Mate</span>
            </div>
          </div>
          <h1>Your visit</h1>
          <p>This link is no longer open</p>
        </header>
        <div className="mob-body">
          <MobileCard>
            <span className="kiosk-ic warn">
              <Icon name="alert" size={26} />
            </span>
            <b style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              This link is not valid any more
            </b>
            <p className="t-cap" style={{ textAlign: "center", marginTop: 6 }}>
              Ask the clinic for a new link, and your turn will be waiting on it.
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
        <h1>Your visit today</h1>
        <p>{live?.patient ? `Hello, ${live.patient}.` : "Your turn in the queue"}</p>
      </header>

      <div className="mob-body">
        {loading && !live ? <MobileLoading title="Loading your turn…" /> : null}
        {error && !live ? (
          <MobileError
            message={error}
            unreachable={unreachable}
            onRetry={() => setAttempt((n) => n + 1)}
          />
        ) : null}

        {live ? (
          <>
            <MobileCard>
              <div className="kiosk-token mob-live" style={{ fontSize: 56 }}>
                {live.token}
              </div>
              <p className="t-cap" style={{ textAlign: "center" }}>
                {live.called
                  ? "Please go in. The doctor is ready to see you."
                  : live.ahead === 0
                    ? "You are next. Please wait to be called."
                    : `${live.ahead} ${live.ahead === 1 ? "person" : "people"} ahead of you.`}
              </p>
            </MobileCard>

            <MobileCard title="Your visit">
              <div className="mob-kv">
                <span>Room</span>
                <b>{live.room || "Not assigned yet"}</b>
              </div>
              <div className="mob-kv">
                <span>Doctor</span>
                <b>{live.doctor}</b>
              </div>
              <div className="mob-kv">
                <span>To pay at the front desk</span>
                <b>₹{live.due}</b>
              </div>
              {live.prescriptionUrl ? (
                <div className="mob-kv">
                  <span>Prescription</span>
                  <b>
                    <a className="btn sec sm" href={live.prescriptionUrl}>
                      Open
                    </a>
                  </b>
                </div>
              ) : null}
            </MobileCard>

            <MobileTitle title="Keep this page open" line="It updates by itself every ten seconds." />

            <div className="mob-foot">
              <Link className="btn block sec" to={`/m/symptoms/${encodeURIComponent(key)}`}>
                Fill in my symptoms
              </Link>
              <Link className="btn block ghost" to={`/m/manage/${encodeURIComponent(key)}`}>
                Manage this booking
              </Link>
            </div>
          </>
        ) : null}
      </div>
      <PhoneTabBar linkKey={key} activeHref="/m/visit" />
    </div>
  );
}
